import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../commerce/handler.mjs';
import { supplierProductKey } from '../commerce/supplier-matching.mjs';

async function request(action, rows, productId = '') {
  process.env.DATABASE_URL = 'test';
  process.env.COMMERCE_ENCRYPTION_KEY = 'a'.repeat(64);
  let released = false;
  const queries = [];
  const handler = createHandler(() => ({ connect: async () => ({
    query: async (sql) => {
      queries.push(sql);
      if (sql.includes('commerce_limits')) return { rows: [{ hits: 1 }] };
      if (sql.includes('GROUP BY i.product_id')) return { rows: [] };
      if (sql.includes('SUM(sa.max_slots')) return { rows: [{ available: 0, slots_filled: 0, slots_total: 0 }] };
      if (sql.includes('commerce_inventory') && sql.includes('count(*)')) return { rows: [{ available: 0 }] };
      if (sql.includes('commerce_supplier_products')) return { rows };
      if (sql.includes('commerce_supplier_secrets')) return { rows: [] };
      throw new Error('Unexpected transactional query');
    },
    release: () => { released = true; },
  }) }));
  let result;
  await handler({ method: 'POST', query: { action }, url: '/api/commerce', headers: {}, body: { productId }, socket: { remoteAddress: 'test' } }, {
    statusCode: 200, setHeader() {}, end(body) { result = { status: this.statusCode, body: JSON.parse(body) }; },
  });
  return { ...result, released, queries };
}

test('catalog reads expose supplier stock without supplier cost or checkout maintenance', async () => {
  const result = await request('catalog', [{ id: 'manual:one', canonical_key: 'auto:test', name: 'Figma Pro 1 year', price: 999, original_price_pkr: 5000, available: 44, cost_pkr: 333, wholesale_price: 1, canonical_manual: false }]);
  assert.equal(result.status, 200);
  assert.equal(result.released, true);
  const item = result.body.products.find(p => p.source === 'supplier');
  assert.ok(item);
  assert.equal(item.cost_pkr, undefined);
  assert.equal(item.wholesale_price, undefined);
  assert.equal(item.available, 44);
  assert.equal(item.original_price_pkr, 5000);
  assert.equal(result.queries.length, 4);
});

test('preview uses saved stock without secrets, but submission rejects an unconfigured supplier', async () => {
  const rows = [{ id: 'missing:one', provider_id: 'missing', external_product_id: 'one', canonical_key: 'auto:test', name: 'Figma Pro 1 year', selling_price: 999, supplier_stock: 44 }];
  const check = await request('checkout-availability', rows, 'missing:one');
  assert.equal(check.status, 200);
  assert.equal(check.body.status, 'available');
  assert.equal(check.body.available, 44);
  assert.equal(check.queries.some(query => query.includes('commerce_supplier_secrets')), false);
  assert.equal(check.released, true);
  const order = await request('create', rows, 'missing:one');
  assert.equal(order.status, 503);
  assert.match(order.body.error, /verify availability/);
});

test('pre-order checkout bypasses live supplier availability checks', async () => {
  const result = await request('checkout-availability', [], 'p013');
  assert.equal(result.status, 200);
  assert.equal(result.body.status, 'available');
  assert.equal(result.body.available, 0);
  assert.equal(result.released, true);
  assert.equal(result.queries.some((query) => query.includes('commerce_supplier_secrets')), false);
});

test('durations, access modes and credit allocations remain distinct', () => {
  assert.notEqual(supplierProductKey('Figma Pro 1 year'), supplierProductKey('Figma Pro 2 years'));
  assert.equal(supplierProductKey('Figma Pro 2 years warranty 1 year'), supplierProductKey('Figma Pro 2 years'));
  assert.notEqual(supplierProductKey('CapCut Team 1 month 1200 credits'), supplierProductKey('CapCut Team 1 month'));
  assert.notEqual(supplierProductKey('ChatGPT private 1 month'), supplierProductKey('ChatGPT shared 1 month'));
});
