import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEliteToolsOrder,
  eliteToolsDelivery,
  eliteToolsOrderId,
  fetchEliteToolsBalance,
  fetchEliteToolsProducts,
  normalizeEliteToolsProduct,
} from '../commerce/elite-tools.mjs';

test('Elite Tools Store products use the documented response fields', () => {
  const product = normalizeEliteToolsProduct({
    id: '87549554',
    name: 'Spotify Premium 2 months NW',
    price: 1.5,
    stock: 2,
    warranty: 'Replacement coverage',
    description: 'A delivered account.',
  });
  assert.deepEqual(product, {
    id: '87549554',
    name: 'Spotify Premium 2 months NW',
    description: 'A delivered account.',
    delivery_instruction: 'Provider warranty: Replacement coverage',
    wholesale_price: 1.5,
    currency: 'USD',
    stock: 2,
    canonical_key: 'elitetools:87549554',
  });
});

test('Elite Tools Store adapter sends the API key and camel-case order body', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url, init });
    const body = url.endsWith('/reseller/products')
      ? { ok: true, products: [] }
      : url.endsWith('/reseller/balance')
        ? { ok: true, balance: 0.1 }
        : { ok: true, order: { orderId: 'elite-order-1', delivery: ['test-code'] } };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  try {
    await fetchEliteToolsProducts('test-key');
    await fetchEliteToolsBalance('test-key');
    const order = await createEliteToolsOrder({
      productId: '87549554',
      quantity: 1,
      idempotencyKey: 'test-order',
      apiKey: 'test-key',
    });
    assert.equal(calls[0].init.headers['X-API-Key'], 'test-key');
    assert.equal(calls[1].init.headers['X-API-Key'], 'test-key');
    assert.equal(calls[2].init.headers['X-API-Key'], 'test-key');
    assert.equal(calls[0].url, 'https://elitetoolz.up.railway.app/api/reseller/products');
    assert.equal(calls[1].url, 'https://elitetoolz.up.railway.app/api/reseller/balance');
    assert.equal(calls[2].url, 'https://elitetoolz.up.railway.app/api/reseller/buy');
    assert.deepEqual(JSON.parse(calls[2].init.body), {
      productId: '87549554',
      quantity: 1,
    });
    assert.deepEqual(eliteToolsDelivery(order), {
      content: '[\n  "test-code"\n]',
      instructions: '',
    });
    assert.equal(eliteToolsOrderId(order, 'fallback'), 'elite-order-1');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
