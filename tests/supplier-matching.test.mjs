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

test('supplier matching keeps distinct CapCut access and credit offers separate', () => {
  assert.notEqual(
    supplierProductKey('CapCut Pro 1 Month'),
    supplierProductKey('CapCut Pro Team 1 Month 1200 Credits'),
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
