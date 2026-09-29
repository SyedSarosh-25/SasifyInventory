import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/products/[id]/page.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/premium-ui.css', import.meta.url), 'utf8');
const terms = readFileSync(new URL('../app/components/purchase-terms.tsx', import.meta.url), 'utf8');

test('product heroes omit the redundant purchase jump link while keeping purchase actions', () => {
  assert.doesNotMatch(page, /See price and buy/);
  assert.match(page, /id="purchase-options"/);
  assert.match(page, /Browse current plans/);
});

test('local and supplier purchase cards share the mobile terms accordion', () => {
  assert.equal((page.match(/<PurchaseTerms>/g) || []).length, 2);
  assert.match(terms, /<details className="purchase-terms-mobile">/);
  assert.match(terms, /<summary>/);
  assert.doesNotMatch(terms, /<details[^>]+open/);
  assert.match(css, /summary:focus-visible/);
});
test('unknown comparisons are hidden only on mobile while prices remain available', () => {
  assert.match(page, /className=\{comparison \? undefined : 'price-unknown'\}/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /\.detail-prices \.price-unknown \{ display: none; \}/);
  assert.match(css, /\.selling-price dd \{ font-size: 1\.75rem/);
});
test('preorder and manual activation information stays outside collapsible terms', () => {
  assert.match(page, /product\.availabilityMode === 'preorder'/);
  assert.match(page, /product\.preorderDate/);
  assert.match(page, /product\.activationSla/);
  assert.match(page, /purchase-mobile-delivery[\s\S]*?<\/p>\s*<PurchaseTerms>/);
});
test('newly synced supplier fallback pages use the same accordion', () => {
  const fallback = readFileSync(new URL('../app/supplier-product/page.tsx', import.meta.url), 'utf8');
  assert.match(fallback, /<PurchaseTerms mobileOnly>/);
  assert.match(fallback, /encodeURIComponent\(product\.id\)/);
});
