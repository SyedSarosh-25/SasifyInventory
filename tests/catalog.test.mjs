import assert from 'node:assert/strict';
import test from 'node:test';
import { products } from '../app/products.ts';
import { has25DayWarranty, isAnnualPlan, originalPricePkr, productHref, productLogo, savingsPkr, whatsappLink } from '../app/product-utils.ts';
import { featuredProducts, filterProducts, orbitTools } from '../app/catalog-selection.ts';

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

test('savings subtract our price from the listed original with the fixed USD rate', () => {
  assert.equal(savingsPkr(products.find((p) => p.id === 'p093')), 2201);
  assert.equal(savingsPkr(products.find((p) => p.id === 'p013')), 2126);
  assert.equal(savingsPkr(products.find((p) => p.id === 'p094')), 4701);
  assert.equal(savingsPkr(products.find((p) => p.id === 'p012')), 10626);
  assert.equal(originalPricePkr(products.find((p) => p.id === 'p014')), 62700);
});

test('missing, unsupported-currency and free references do not invent prices', () => {
  for (const id of ['p001', 'p028', 'p044', 'p059', 'p073', 'p095']) {
    assert.equal(originalPricePkr(products.find((p) => p.id === id)), null);
    assert.equal(savingsPkr(products.find((p) => p.id === id)), null);
  }
});

test('savings preserve zero and negative differences and match all available references', () => {
  const base = products[0];
  assert.equal(savingsPkr({ ...base, originalPricePkr: 999, sellingPricePkr: 999 }), 0);
  assert.equal(savingsPkr({ ...base, originalPricePkr: 500, sellingPricePkr: 999 }), -499);
  for (const product of products) {
    const original = originalPricePkr(product);
    if (original !== null) assert.equal(savingsPkr(product), Math.round((original - product.sellingPricePkr) * 100) / 100);
  }
});

test('landing selection has exactly ten distinct products with the requested first five', () => {
  assert.equal(featuredProducts.length, 10);
  assert.equal(new Set(featuredProducts.map((product) => product.id)).size, 10);
  assert.deepEqual(featuredProducts.slice(0, 5).map((product) => product.id), ['p093', 'p013', 'p063', 'p028', 'p088']);
});

test('all orbit logos link to the corresponding tool detail page', () => {
  assert.equal(orbitTools.length, 6);
  for (const tool of orbitTools) {
    assert.equal(productHref(tool.product), `/products/${tool.id}`);
    assert.ok(tool.product.name.toLowerCase().includes(tool.name.toLowerCase()));
  }
});

test('full inventory keeps all products, search, categories and empty results', () => {
  assert.equal(filterProducts('', 'All').length, products.length);
  assert.equal(filterProducts(' ChatGPT Plus Shared ', 'All')[0].id, 'p094');
  assert.ok(filterProducts('', 'Design & UI/UX').every((product) => product.category === 'Design & UI/UX'));
  assert.equal(filterProducts('zzzz-not-a-product', 'All').length, 0);
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
