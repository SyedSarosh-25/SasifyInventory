import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const page = read('app/components/checkout.tsx');

test('warranty is step two before delivery or activation details in step three', () => {
  const terms = page.indexOf('aria-labelledby="checkout-terms-heading"');
  const delivery = page.indexOf('aria-labelledby="checkout-activation-heading"');
  const payment = page.indexOf('aria-labelledby="checkout-payment-heading"');
  assert.ok(terms >= 0 && terms < delivery && delivery < payment);
  assert.match(page.slice(terms, delivery), /checkout-step-number">2<\/span>/);
  assert.match(page.slice(delivery, payment), /checkout-step-number">3<\/span>/);
});
test('checkout keeps warranty visible and optional coupons collapsed', () => {
  assert.match(page, /<div className="checkout-terms">/);
  assert.match(page, /<section className="checkout-step" aria-labelledby="checkout-terms-heading">/);
  assert.match(page, /<details className="checkout-coupon">/);
  assert.doesNotMatch(page, /<details className="checkout-coupon" open/);
  assert.match(read('app/premium-ui.css'), /summary.*:focus-visible/);
});
test('payment protections and important activation disclosures remain intact', () => {
  assert.match(page, /couponCode,\s+useSasifyWallet,/);
  assert.match(page, /Reseller coupon \(optional\)/);
  assert.doesNotMatch(page, /Have a PURBA coupon|PURBA only|Only PURBA is accepted/);
  assert.match(page, /account-wallet-pay/);
  assert.match(page, /Activation email \(required\)/);
  assert.match(page, /Shared account · 4 members/);
  assert.match(page, /Claude pre-orders are excluded from the wallet discount/);
});
test('checkout uses the supplied wallet picture as a lightweight icon', () => {
  assert.match(page, /src="\/sasify-wallet-user-96.webp"/);
  assert.ok(statSync(new URL('../public/sasify-wallet-user-96.webp', import.meta.url)).size < 6000);
});
