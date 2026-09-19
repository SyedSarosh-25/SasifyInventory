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

test('private-account delivery guide is hidden for shared accounts', () => {
  assert.match(checkoutSource, /!order\.sharedSlot\s*&&\s*<section className="account-delivery-guide"/);
});
