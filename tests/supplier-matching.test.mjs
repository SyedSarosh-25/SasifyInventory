import assert from 'node:assert/strict';
import test from 'node:test';
import { supplierProductKey } from '../commerce/supplier-matching.mjs';

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

test('supplier matching groups every CapCut access label by duration', () => {
  assert.equal(
    supplierProductKey('CapCut Pro 1 Month'),
    supplierProductKey('CapCut Pro Team 1 Month 1200 Credits'),
  );
  assert.equal(
    supplierProductKey('CapCut Pro 30D full warranty'),
    supplierProductKey('CapCut Pro Team 30D full warranty'),
  );
  assert.equal(
    supplierProductKey('CapCut Pro one month'),
    supplierProductKey('Pro Capcut 1M with warranty'),
  );
  assert.equal(
    supplierProductKey('CAPCUT 6 MONTHS full warranty'),
    supplierProductKey('Capcut Pro 6M (FW)'),
  );
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
