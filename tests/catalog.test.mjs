import assert from 'node:assert/strict';
import test from 'node:test';
import { products } from '../app/products.ts';
import { has25DayWarranty, isAnnualPlan, originalPriceComparison, originalPricePkr, planMonths, productHref, productLogo, savingsPkr, whatsappLink } from '../app/product-utils.ts';
import { featuredProducts, filterProducts, heroProducts, orbitTools } from '../app/catalog-selection.ts';

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
  assert.equal(originalPricePkr(products.find((p) => p.id === 'p014')), 75240);
});

test('monthly references are multiplied by the complete plan duration', () => {
  const linear = products.find((p) => p.id === 'p040');
  assert.equal(originalPricePkr(linear), 15 * 285 * 12);
  assert.equal(savingsPkr(linear), 36301);
  const base = { ...linear, originalPrice: '$10/month', sellingPricePkr: 999 };
  for (const [duration, months] of [['1 Month', 1], ['3 Months', 3], ['6 Months', 6], ['12 Months', 12], ['18 Months', 18], ['1 Year', 12], ['2 Years', 24], ['3 Years', 36], ['30 Days', 1], ['365 Days', 12]]) {
    const product = { ...base, duration };
    assert.equal(planMonths(product), months);
    assert.equal(originalPricePkr(product), 2850 * months);
    assert.equal(savingsPkr(product), 2850 * months - 999);
  }
});

test('monthly quotes take priority over annual alternatives and annual-only prices are not multiplied by twelve', () => {
  const base = products.find((p) => p.id === 'p040');
  assert.equal(originalPricePkr({ ...base, originalPrice: '$20/month or $192/year' }), 68400);
  assert.equal(originalPricePkr({ ...base, originalPrice: '$192/year or $20/month' }), 68400);
  assert.equal(originalPricePkr(products.find((p) => p.id === 'p056')), 28497.15);
  assert.equal(originalPricePkr({ ...base, duration: '2 Years', originalPrice: '$100/year' }), 57000);
});

test('credit face values remain package totals and ambiguous durations do not invent terms', () => {
  const credit = { ...products.find((p) => p.id === 'p004'), duration: '12 Months' };
  assert.equal(originalPriceComparison(credit).period, 'package');
  assert.equal(originalPricePkr(credit), 28500);
  const monthly = products.find((p) => p.id === 'p040');
  for (const duration of ['-', '1-3 Years', '499 Invites', 'Lifetime Credits', '7 Days', '0 Months']) {
    assert.equal(planMonths({ ...monthly, duration }), null);
    assert.equal(savingsPkr({ ...monthly, duration }), null);
  }
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
  assert.deepEqual(featuredProducts.slice(0, 5).map((product) => product.id), ['p093', 'p013', 'p096', 'p028', 'p088']);
});

test('featured Canva offer is a one-year invite for 999 while existing variants stay in inventory', () => {
  const canva = featuredProducts.find((product) => product.id === 'p096');
  assert.equal(canva.name, 'Canva Pro Invite');
  assert.equal(canva.sellingPricePkr, 999);
  assert.equal(canva.duration, '1 Year');
  assert.equal(isAnnualPlan(canva), true);
  assert.equal(originalPricePkr(canva), 51300);
  assert.equal(savingsPkr(canva), 50301);
  assert.equal(featuredProducts.some((product) => product.id === 'p063'), false);
  assert.equal(products.find((product) => product.id === 'p063').name, 'Canva Pro Panel');
  assert.equal(products.find((product) => product.id === 'p064').duration, '3 Years');
  assert.match(new URL(whatsappLink(canva.name, canva.duration)).searchParams.get('text'), /Canva Pro Invite \(1 Year\)/);
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

test('hero restores the five requested product shortcuts without reducing the top ten', () => {
  assert.deepEqual(heroProducts.map((product) => product.id), ['p093', 'p013', 'p096', 'p028', 'p088']);
  assert.equal(featuredProducts.length, 10);
  for (const product of heroProducts) assert.equal(productHref(product), `/products/${product.id}`);
});

test('live hero search matches VPN category and partial names across the full inventory', () => {
  const vpnProducts = products.filter((product) => product.category === 'VPN & Privacy');
  assert.ok(vpnProducts.length > 0);
  const matches = filterProducts(' VPN ', 'All');
  for (const product of vpnProducts) assert.ok(matches.some((match) => match.id === product.id));
  assert.deepEqual(matches, filterProducts('vpn', 'All'));
  assert.ok(filterProducts('Nord', 'All').some((product) => product.name.includes('Nord')));
  assert.ok(filterProducts('chatg', 'All').some((product) => product.id === 'p093'));
  assert.equal(filterProducts('not-a-real-tool-xyz', 'All').length, 0);
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
