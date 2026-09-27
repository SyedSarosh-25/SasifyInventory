import assert from 'node:assert/strict';
import test from 'node:test';
import {
  selectLowestSupplierOffers,
  supplierProductKey,
} from '../commerce/supplier-matching.mjs';

test('supplier matching merges equivalent CapCut duration labels', () => {
  assert.equal(
    supplierProductKey('CapCut Pro 1 Month - full warranty'),
    supplierProductKey('CAPCUT PRO 30D FW'),
  );
  assert.notEqual(
    supplierProductKey('CapCut Pro 1 Month - full warranty'),
    supplierProductKey('CapCut Pro 2 Months - full warranty'),
  );
});

test('supplier plan duration wins over a shorter warranty duration', () => {
  assert.equal(
    supplierProductKey('ChatGPT Plus Account Level 4 4 Months, 2 Months Warranty'),
    'auto:4-account-chatgpt-level-plus-duration-4m',
  );
  assert.equal(
    supplierProductKey('Capcut Pro 30D with a 30-day warranty'),
    supplierProductKey('Capcut Pro 1 Month full warranty'),
  );
});

test('supplier matching keeps CapCut plan types and credit packages separate', () => {
  assert.notEqual(
    supplierProductKey('CapCut Pro 1 Month'),
    supplierProductKey('CapCut Pro Team 1 Month 1200 Credits'),
  );
  assert.notEqual(
    supplierProductKey('CapCut Pro 30D full warranty'),
    supplierProductKey('CapCut Pro Team 30D full warranty'),
  );
  assert.equal(
    supplierProductKey('CapCut Pro one month'),
    supplierProductKey('Pro Capcut 1M with warranty'),
  );
  assert.notEqual(
    supplierProductKey('CAPCUT 6 MONTHS full warranty'),
    supplierProductKey('Capcut Pro 6M (FW)'),
  );
  assert.notEqual(supplierProductKey('ChatGPT Plus 1 Month'), supplierProductKey('ChatGPT Plus K12 1 Month'));
  assert.notEqual(supplierProductKey('CapCut Team 1200 Credits 1 Month'), supplierProductKey('CapCut Team 500 Credits 1 Month'));
});

test('supplier matching merges equivalent Grok Heavy names before choosing a cost winner', () => {
  const heavyNames = [
    'CDK Heavy Grok 1M',
    'Grok Heavy for 1 month',
    'CDK Supper Grok Heavy 1 month',
    'SuperGrok Heavy 30 days',
  ];
  assert.equal(new Set(heavyNames.map(supplierProductKey)).size, 1);
  assert.notEqual(
    supplierProductKey('CDK SUPER GROK 1 month'),
    supplierProductKey('CDK Heavy Grok 1 month'),
  );
});

test('supplier catalogue keeps the lowest-cost in-stock equivalent offer', () => {
  const selected = selectLowestSupplierOffers([
    {
      id: 'supplier-a',
      name: 'Adobe Express 1 Month Full Warranty',
      supplier_stock: 4,
      cost_pkr: 900,
    },
    {
      id: 'supplier-b',
      name: 'Adobe Express 1M FW',
      supplier_stock: 5,
      cost_pkr: 700,
    },
    {
      id: 'supplier-c',
      name: 'Adobe Express 1 Month FW',
      supplier_stock: 0,
      cost_pkr: 400,
    },
  ]);
  assert.deepEqual(selected.map((product) => product.id), ['supplier-b']);
});

test('supplier catalogue merges records when either stored key or normalized name matches', () => {
  const selected = selectLowestSupplierOffers([
    {
      id: 'supplier-a',
      name: 'Adobe Express 1 Month',
      canonical_key: 'manual-adobe-express-1m',
      supplier_stock: 3,
      cost_pkr: 900,
    },
    {
      id: 'supplier-b',
      name: 'Adobe Express 1 Month Customer Edition',
      canonical_key: 'manual-adobe-express-1m',
      supplier_stock: 2,
      cost_pkr: 700,
    },
  ]);
  assert.deepEqual(selected.map((product) => product.id), ['supplier-b']);
});

test('stale automatic keys do not merge distinct CapCut plans', () => {
  const selected = selectLowestSupplierOffers([
    { id: 'pro', name: 'CapCut Pro 1 Month', canonical_key: 'auto:capcut-duration-1m', supplier_stock: 2, cost_pkr: 600 },
    { id: 'team', name: 'CapCut Pro Team 1 Month 1200 Credits', canonical_key: 'auto:capcut-duration-1m', supplier_stock: 2, cost_pkr: 400 },
  ]);
  assert.deepEqual(selected.map((product) => product.id), ['pro', 'team']);
});
