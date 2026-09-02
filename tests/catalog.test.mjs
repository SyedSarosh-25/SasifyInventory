import assert from 'node:assert/strict';
import test from 'node:test';
import { products } from '../app/products.ts';
import { has25DayWarranty, isAnnualPlan, productHref, productLogo, savingsPkr, whatsappLink } from '../app/product-utils.ts';

test('every inventory variant has a unique detail URL', () => {
  assert.equal(new Set(products.map(productHref)).size, products.length);
  for (const product of products) {
    assert.match(productHref(product), /^\/products\/p\d+$/);
    assert.ok(product.description.length > 30);
    assert.ok(product.sellingPricePkr > 0);
  }
});

test('Claude Team prices and seat types match the requested offers', () => {
  assert.equal(products.find((p) => p.name === 'Claude Team Plan Standard')?.sellingPricePkr, 4999);
  assert.equal(products.find((p) => p.name === 'Claude Team Plan Premium')?.sellingPricePkr, 24999);
  for (const id of ['p012', 'p013']) {
    const product = products.find((p) => p.id === id);
    assert.equal(product.duration, '1 Month');
    assert.equal(has25DayWarranty(product), true);
    assert.match(product.originalPrice, /per seat\/month/);
  }
});

test('one-year variants receive one-time payment wording only at the annual duration', () => {
  const base = products[0];
  for (const duration of ['1 Year', '12 Months', '365 Days']) assert.equal(isAnnualPlan({ ...base, duration }), true);
  for (const duration of ['1 Month', '18 Months', '3 Years', '499 Invites', '-']) assert.equal(isAnnualPlan({ ...base, duration }), false);
});

test('25-day warranty is scoped to 30-day and one-month products', () => {
  const base = products[0];
  for (const duration of ['30 Days', '1 Month']) assert.equal(has25DayWarranty({ ...base, duration }), true);
  for (const duration of ['3 Months', '1 Year', 'Lifetime Credits']) assert.equal(has25DayWarranty({ ...base, duration }), false);
});

test('savings use a same-currency structured reference, not ambiguous dollar text', () => {
  assert.equal(savingsPkr(products.find((p) => p.id === 'p093')), 2201);
  assert.equal(savingsPkr(products.find((p) => p.id === 'p013')), null);
  assert.equal(savingsPkr(products.find((p) => p.id === 'p094')), null);
});

test('WhatsApp orders retain the selected variant and correct recipient', () => {
  const href = new URL(whatsappLink('Claude Team Plan Premium', '1 Month'));
  assert.equal(href.hostname, 'wa.me');
  assert.equal(href.pathname, '/923116185711');
  assert.match(href.searchParams.get('text'), /Claude Team Plan Premium \(1 Month\)/);
});

test('Gemini and Claude logos resolve to product identities', () => {
  assert.match(decodeURIComponent(productLogo(products.find((p) => p.id === 'p016'))), /gemini.google.com/);
  assert.match(decodeURIComponent(productLogo(products.find((p) => p.id === 'p013'))), /claude.ai/);
});
