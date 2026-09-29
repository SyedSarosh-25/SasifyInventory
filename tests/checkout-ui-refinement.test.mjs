import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const page = read('app/components/checkout.tsx');
test('checkout terms and optional coupons use native collapsed disclosures', () => {
  assert.match(page, /<details className="checkout-terms">/);
  assert.match(page, /<details className="checkout-coupon">/);
  assert.doesNotMatch(page, /<details className="checkout-(?:terms|coupon)" open/);
  assert.match(read('app/premium-ui.css'), /summary.*:focus-visible/);
});
test('payment protections and important activation disclosures remain intact', () => {
  assert.match(page, /couponCode: useSasifyWallet \? '' : couponCode/);
  assert.match(page, /disabled=\{useSasifyWallet\}/);
  assert.match(page, /account-wallet-pay/);
  assert.match(page, /Activation email \(required\)/);
  assert.match(page, /Shared account · 4 members/);
  assert.match(page, /Sorry,5% discount does not apply on this product/);
});
test('checkout uses the supplied wallet picture as a lightweight icon', () => {
  assert.match(page, /src="\/sasify-wallet-user-96.webp"/);
  assert.ok(statSync(new URL('../public/sasify-wallet-user-96.webp', import.meta.url)).size < 6000);
});
