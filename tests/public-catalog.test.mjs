import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPublicCatalog, invalidatePublicCatalog } from '../app/public-catalog.ts';
import { catalogResponse } from '../commerce/catalog-presentation.mjs';

test('all catalog consumers share one request, reuse storage after reload and expire after 30 seconds', async () => {
  const originalFetch = globalThis.fetch, originalWindow = globalThis.window, originalNow = Date.now;
  const storage = new Map();
  let time = 1000, calls = 0;
  const payload = { ready: true, productCount: 1, products: [{ id: 'one', available: 3 }] };
  globalThis.window = { sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } };
  Date.now = () => time;
  globalThis.fetch = async url => { calls++; assert.match(url, /view=summary/); return { ok: true, json: async () => payload }; };
  try {
    invalidatePublicCatalog();
    await Promise.all(Array.from({ length: 5 }, () => loadPublicCatalog()));
    assert.equal(calls, 1);
    await loadPublicCatalog();
    assert.equal(calls, 1);
    const reloaded = await import('../app/public-catalog.ts?reload');
    await reloaded.loadPublicCatalog();
    assert.equal(calls, 1);
    time += 30_000;
    await loadPublicCatalog();
    assert.equal(calls, 2);
    invalidatePublicCatalog();
    globalThis.fetch = async () => { calls++; return { ok: false }; };
    await assert.rejects(loadPublicCatalog());
    globalThis.fetch = async () => ({ ok: true, json: async () => payload });
    assert.deepEqual(await loadPublicCatalog(), payload);
  } finally {
    invalidatePublicCatalog();
    globalThis.fetch = originalFetch; globalThis.window = originalWindow; Date.now = originalNow;
  }
});

test('listing summaries retain purchase fields while detail responses retain full instructions', () => {
  const full = { ready: true, products: [{ id: 'one', canonical_key: 'plan', name: 'Plan', price: 999, available: 4, requires_customer_email: true, description: 'short preview\n' + 'long terms '.repeat(300), delivery_instruction: 'Private activation instructions' }] };
  const summary = catalogResponse(full, { view: 'summary' });
  assert.equal(summary.products[0].description, 'short preview');
  assert.equal(summary.products[0].delivery_instruction, undefined);
  assert.equal(summary.products[0].requires_customer_email, true);
  assert.ok(JSON.stringify(summary).length < JSON.stringify(full).length / 5);
  assert.deepEqual(catalogResponse(full, { productId: 'plan' }).products, full.products);
  assert.deepEqual(catalogResponse(full, { productId: 'unknown' }).products, []);
  assert.equal(full.products[0].delivery_instruction, 'Private activation instructions');
});
