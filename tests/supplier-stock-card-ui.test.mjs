import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const cardSource = await readFile(
  new URL('../app/components/top-supplier-products.tsx', import.meta.url),
  'utf8',
);

test('supplier cards show live stock state and block unavailable offers', () => {
  assert.match(cardSource, /featured-stock-badge/);
  assert.match(cardSource, /In stock/);
  assert.match(cardSource, /Out of stock/);
  assert.match(cardSource, /is-stock-blocked/);
  assert.match(cardSource, /className="featured-buy-button is-disabled" disabled/);
});

test('purchase availability uses stock for local and supplier cards while details stay accessible', () => {
  assert.match(cardSource, /stockVerified: true/);
  assert.match(cardSource, /const isSupplier = product\.source === 'supplier'/);
  assert.match(cardSource, /const canPurchase = inStock \|\| contactOnly/);
  assert.match(cardSource, /<a className="featured-details-button" href=\{href\}>View details<\/a>/);
  assert.match(cardSource, /className="featured-buy-button is-disabled" disabled/);
  assert.doesNotMatch(cardSource, /aria-disabled=\{!canOpen/);
});
