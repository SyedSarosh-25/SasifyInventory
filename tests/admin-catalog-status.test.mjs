import assert from 'node:assert/strict';
import test from 'node:test';
import { supplierCatalogStatus } from '../app/components/admin-catalog-status-model.ts';

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
