import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const handlerSource = await readFile(
  new URL('../commerce/handler.mjs', import.meta.url),
  'utf8',
);
const checkoutSource = await readFile(
  new URL('../app/components/checkout.tsx', import.meta.url),
  'utf8',
);

test('pre-order admin decisions update status and send the requested customer emails', () => {
  assert.match(handlerSource, /action === 'admin-preorder-complete' \|\| action === 'admin-preorder-reject'/);
  assert.match(handlerSource, /supplierStatus = completed \? 'preorder_completed' : 'preorder_rejected'/);
  assert.match(handlerSource, /Your order has been rejected/);
  assert.match(handlerSource, /accept the NDA/);
  assert.match(handlerSource, /preorder_decision_email/);
});

test('manual preorder cards expose completion and rejection controls', () => {
  assert.match(checkoutSource, /admin-preorder-complete/);
  assert.match(checkoutSource, /Order completed/);
  assert.match(checkoutSource, /admin-preorder-reject/);
  assert.match(checkoutSource, /Reject order/);
});
