import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const checkoutSource = await readFile(
  new URL('../app/components/checkout.tsx', import.meta.url),
  'utf8',
);

test('shared account checkout can submit HOR for tracking', () => {
  assert.doesNotMatch(
    checkoutSource,
    /couponCode:\s*product\?\.id === 'p093-shared' \? '' : couponCode/,
  );
  assert.doesNotMatch(
    checkoutSource,
    /disabled=\{product\?\.id === 'p093-shared'\}/,
  );
  assert.doesNotMatch(
    checkoutSource,
    /Coupons are not available for shared-account access/,
  );
  assert.doesNotMatch(
    checkoutSource,
    /HOR can be used for team tracking\. The shared-account price stays unchanged\./,
  );
  assert.doesNotMatch(
    checkoutSource,
    /HOR code applied · Shared-account price unchanged/,
  );
});

test('checkout shows the purchase disclaimer before payment', () => {
  assert.match(checkoutSource, /Please read the complete product description/);
  assert.match(checkoutSource, /cannot be held responsible/);
});

test('checkout uses provider-neutral payment verification language', () => {
  assert.match(checkoutSource, /We are checking for your payment receipt/);
  assert.doesNotMatch(checkoutSource, /We are checking for a verified payment receipt/);
  assert.doesNotMatch(checkoutSource, /Postmark receipt/);
});

test('admin payment inbox shows receipts from all receiver accounts by default', () => {
  assert.match(
    checkoutSource,
    /const \[paymentReceiverFilter, setPaymentReceiverFilter\] = useState\('all'\)/,
  );
  assert.match(checkoutSource, /paymentReceiverFilter === 'all'/);
});

test('private-account delivery guide is hidden for shared accounts', () => {
  assert.match(checkoutSource, /!order\.sharedSlot\s*&&\s*<section className="account-delivery-guide"/);
});

test('checkout no longer performs or displays a supplier availability check', () => {
  assert.doesNotMatch(checkoutSource, /checkout-availability/);
  assert.doesNotMatch(checkoutSource, /Checking availability/);
  assert.doesNotMatch(checkoutSource, /Supplier availability/);
});

test('pre-order confirmation explains the completion date, email and popup', () => {
  assert.match(checkoutSource, /Your order has been received/);
  assert.match(checkoutSource, /Your order will be completed on 5 October 2026/);
  assert.match(checkoutSource, /You will receive an email at the address you provided us/);
  assert.match(checkoutSource, /sasify-preorder-confirmed-\$\{order\.id\}/);
});
