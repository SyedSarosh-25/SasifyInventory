import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { couponPaymentError } from '../commerce/coupon-payment-policy.mjs';

test('only PURBA is allowed with Sasify Wallet', () => {
  assert.equal(couponPaymentError('PURBA', true), null);
  assert.equal(couponPaymentError(' purba ', true), null);
  assert.equal(couponPaymentError('', true), null);
  for (const code of ['HOR', 'CUST', 'RESELL', 'UNKNOWN'])
    assert.match(couponPaymentError(code, true), /Only PURBA/);
});

test('PURBA is blocked on external methods without changing other coupons', () => {
  assert.match(couponPaymentError('PURBA', false), /only with Sasify Wallet/);
  assert.equal(couponPaymentError('RESELL', false), null);
  assert.equal(couponPaymentError('', false), null);
});

test('creation and wallet debit both enforce the restriction; checkout sends the code', async () => {
  const handler = await readFile(new URL('../commerce/handler.mjs', import.meta.url), 'utf8');
  const checkout = await readFile(new URL('../app/components/checkout.tsx', import.meta.url), 'utf8');
  assert.match(handler, /couponPaymentError\(requestedCouponCode, usingSasifyWallet\)/);
  assert.match(handler, /couponPaymentError\(appliedCoupon\?\.code_display \|\| 'UNKNOWN', true\)/);
  assert.match(checkout, /couponCode,\s+useSasifyWallet,/);
  assert.doesNotMatch(checkout, /disabled=\{useSasifyWallet\}/);
});
