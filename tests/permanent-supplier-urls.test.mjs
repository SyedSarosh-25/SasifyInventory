import test from 'node:test';
import assert from 'node:assert/strict';
import { claimSupplierUrl, findSupplierUrl, supplierUrlRedirects } from '../app/supplier-url-registry-core.mjs';
import { supplierUrlRegistry } from '../app/supplier-url-registry.generated.mjs';
import { supplierSeoProducts, supplierProductHref } from '../app/supplier-seo.ts';

test('saved URLs survive rename, stock update and known identity changes', () => {
  const entries = [];
  const first = claimSupplierUrl({ id: 'one', name: 'Copilot 1 month', slug: 'copilot-old-hash' }, entries, 'copilot-1-month');
  const renamed = claimSupplierUrl({ id: 'one', name: 'Microsoft Copilot renamed', available: 0 }, entries, 'new-title');
  assert.equal(renamed.slug, first.slug);
  const refreshed = claimSupplierUrl({ id: 'two', name: 'Microsoft Copilot renamed' }, entries, 'different');
  assert.equal(refreshed.slug, first.slug);
  assert.equal(findSupplierUrl({ id: 'two', name: 'Another title' }, entries).slug, first.slug);
});

test('collisions get permanent distinct slugs, never overwrite another plan', () => {
  const entries = [];
  assert.equal(claimSupplierUrl({ id: 'a', name: 'Monthly' }, entries, 'plan', ['plan']).slug, 'plan-2');
  assert.equal(claimSupplierUrl({ id: 'b', name: 'Annual' }, entries, 'plan', ['plan']).slug, 'plan-3');
  assert.equal(claimSupplierUrl({ id: 'b', name: 'Annual renamed' }, entries, 'other').slug, 'plan-3');
});

test('ambiguous names are not used to redirect unrelated identities', () => {
  const entries = [{ slug: 'a', keys: ['a'], names: ['same'], aliases: [] }, { slug: 'b', keys: ['b'], names: ['same'], aliases: [] }];
  assert.equal(findSupplierUrl({ id: 'new', name: 'Same' }, entries), null);
});

test('every saved alias redirects straight to an existing canonical page', () => {
  const slugs = supplierSeoProducts.map((product) => product.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  const routes = supplierUrlRedirects(supplierUrlRegistry, slugs);
  assert.ok(routes.length > 400);
  assert.equal(new Set(routes.map(([from]) => from)).size, routes.length);
  for (const [from, to] of routes) {
    assert.notEqual(from, to);
    assert.ok(slugs.includes(to));
    assert.ok(!routes.some(([source]) => source === to));
  }
  assert.ok(routes.some(([from, to]) => from === 'microsoft-copilot-1-month-full-warranty-zkbogp' && to === 'microsoft-copilot-1-month'));
  for (const product of supplierSeoProducts) assert.equal(supplierProductHref(product), `/products/${product.slug}`);
});
