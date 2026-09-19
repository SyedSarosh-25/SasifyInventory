import assert from 'node:assert/strict';
import test from 'node:test';
import { duplicateSupplierIds, supplierCatalogStatus, supplierOfferDecision } from '../app/components/admin-catalog-status-model.ts';

const product = (overrides = {}) => ({
  id: 'supplier:1',
  name: 'Example product',
  supplier_stock: 4,
  selling_price: 2499,
  enabled: true,
  ...overrides,
});

test('catalog status marks stocked, priced and enabled products as live', () => {
  assert.equal(supplierCatalogStatus(product()), 'live');
});

test('catalog status finds supplier products waiting for pricing or publishing', () => {
  assert.equal(supplierCatalogStatus(product({ selling_price: null })), 'available-not-live');
  assert.equal(supplierCatalogStatus(product({ enabled: false })), 'available-not-live');
});

test('catalog status finds priced products whose supplier stock is gone', () => {
  assert.equal(supplierCatalogStatus(product({ supplier_stock: 0, enabled: false })), 'published-unavailable');
});

test('catalog status keeps unpriced and unstocked records out of action groups', () => {
  assert.equal(supplierCatalogStatus(product({ supplier_stock: 0, selling_price: null, enabled: false })), 'unconfigured');
});

test('duplicate supplier view groups duration and warranty variants', () => {
  const ids = duplicateSupplierIds([
    product({ id: 'dodi:canva', name: 'Canva Pro 1 Month - full warranty' }),
    product({ id: 'fatbunny:canva', name: 'Canva Pro 30D FW' }),
    product({ id: 'mke:cursor', name: 'Cursor Pro 1 Month' }),
  ]);
  assert.deepEqual([...ids].sort(), ['dodi:canva', 'fatbunny:canva']);
});

test('duplicate supplier view also respects a shared canonical mapping key', () => {
  const ids = duplicateSupplierIds([
    product({ id: 'dodi:one', name: 'Offer one', canonical_key: 'shared:offer' }),
    product({ id: 'mke:two', name: 'Offer two', canonical_key: 'shared:offer' }),
  ]);
  assert.deepEqual([...ids].sort(), ['dodi:one', 'mke:two']);
});

test('best-price supplier view keeps the cheapest in-stock offer and rejects the rest', () => {
  const decision = supplierOfferDecision([
    product({ id: 'dodi:hicksfield', name: 'Hicksfield 1 Month', cost_pkr: 650, supplier_stock: 0 }),
    product({ id: 'mke:hicksfield', name: 'Hicksfield 30D full warranty', cost_pkr: 700, supplier_stock: 4 }),
    product({ id: 'fatbunny:hicksfield', name: 'Hicksfield 1M FW', cost_pkr: 900, supplier_stock: 7 }),
  ]);
  assert.deepEqual([...decision.winners], ['mke:hicksfield']);
  assert.deepEqual([...decision.rejected].sort(), ['dodi:hicksfield', 'fatbunny:hicksfield']);
});

test('different durations remain separate supplier products', () => {
  const ids = duplicateSupplierIds([
    product({ id: 'one-month', name: 'Hicksfield 1 Month' }),
    product({ id: 'twelve-month', name: 'Hicksfield 12 Months' }),
  ]);
  assert.deepEqual([...ids], []);
});
