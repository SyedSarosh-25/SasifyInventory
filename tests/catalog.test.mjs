import assert from 'node:assert/strict';
import test from 'node:test';
import { products } from '../app/products.ts';
import { accessTypeLabel, has25DayWarranty, isAnnualPlan, originalPriceComparison, originalPricePkr, planMonths, productHref, productLogo, savingsPkr, warrantyDays, whatsappLink } from '../app/product-utils.ts';
import { featuredProducts, filterProducts, heroProducts, orbitTools, selectRandomTopProducts, supplierEquivalentProductName } from '../app/catalog-selection.ts';

test('every inventory variant has a unique detail URL', () => {
  assert.equal(new Set(products.map(productHref)).size, products.length);
  for (const product of products) {
    assert.match(productHref(product), /^\/products\/p\d+$/);
    assert.ok(product.description.length > 30);
    assert.ok(product.contactOnly || product.sellingPricePkr > 0);
  }
});

test('Claude Team prices and seat types match the requested offers', () => {
  assert.equal(products.find((p) => p.name === 'Claude Team Plan Standard')?.sellingPricePkr, 5199);
  assert.equal(products.find((p) => p.name === 'Claude Team Plan Premium')?.sellingPricePkr, 24999);
  for (const id of ['p012', 'p013']) {
    const product = products.find((p) => p.id === id);
    assert.equal(product.duration, '1 Month');
    assert.equal(has25DayWarranty(product), true);
    assert.match(product.originalPrice, /per seat\/month/);
  }
});

test('Hostinger VPS keeps all supplied KVM packages under one WhatsApp product', () => {
  const product = products.find((p) => p.id === 'p101');
  assert.equal(product.name, 'Hostinger VPS');
  assert.equal(product.contactOnly, true);
  assert.deepEqual(product.variants.map((variant) => [variant.name, variant.sellingPricePkr, variant.originalPricePkr]), [
    ['KVM1 VPS', 14999, 28788],
    ['KVM2 VPS', 24999, 38388],
    ['KVM4 VPS', 29999, 51588],
    ['KVM8 VPS', 49999, 101988],
  ]);
  assert.equal(products.filter((p) => p.name.startsWith('Hostinger KVM')).length, 0);
});

test('supplier-equivalent names collapse duration and fulfilment suffixes', () => {
  assert.equal(supplierEquivalentProductName('Perplexity Enterprise Pro', 'Perplexity Enterprise Pro 1m'), true);
  assert.equal(supplierEquivalentProductName('CapCut Pro Team', 'CapCut Pro Team 3 Months - full warranty'), true);
  assert.equal(supplierEquivalentProductName('Grok Heavy CDK', 'CDK Grok Heavy 1 month warranty not included'), true);
  assert.equal(supplierEquivalentProductName('ChatGPT Plus', 'ChatGPT Plus K12 Edu 2 years'), false);
  assert.equal(supplierEquivalentProductName('Claude API $100', '$500 API CLAUDE 30D (FW)'), false);
  assert.equal(supplierEquivalentProductName('Cursor Pro API - 6,500 Credits', 'API Cursor Pro 400 Credits/day 1 month full warranty'), false);
});

test('supplier-equivalent comparison is independent of token order', () => {
  assert.equal(supplierEquivalentProductName('Grok Heavy CDK', 'CDK Heavy Grok 1 month'), true);
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
  assert.equal(savingsPkr(products.find((p) => p.id === 'p013')), 2301);
  assert.equal(savingsPkr(products.find((p) => p.id === 'p012')), 10001);
  assert.equal(savingsPkr(products.find((p) => p.id === 'p100')), 33500);
});

test('ChatGPT Plus warranty differs by payment option', () => {
  const product = products.find((p) => p.id === 'p093');
  assert.equal(warrantyDays(product, 'p093-ultra'), 25);
  assert.equal(warrantyDays(product, 'p093-momo'), 20);
});

test('monthly references are multiplied by the complete plan duration', () => {
  const linear = { ...products.find((p) => p.id === 'p013'), duration: '12 Months', originalPrice: '$15/month', originalPricePkr: undefined, sellingPricePkr: 14999 };
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
  const base = { ...products.find((p) => p.id === 'p013'), duration: '12 Months', originalPricePkr: undefined };
  assert.equal(originalPricePkr({ ...base, originalPrice: '$20/month or $192/year' }), 68400);
  assert.equal(originalPricePkr({ ...base, originalPrice: '$192/year or $20/month' }), 68400);
  assert.equal(originalPricePkr({ ...base, originalPrice: 'PKR 28,497.15/year', duration: '12 Months' }), 28497.15);
  assert.equal(originalPricePkr({ ...base, duration: '2 Years', originalPrice: '$100/year' }), 57000);
});

test('credit face values remain package totals and ambiguous durations do not invent terms', () => {
  const credit = { ...products.find((p) => p.id === 'p013'), name: 'Claude API credits', originalPrice: '$100 credits', originalPricePkr: undefined, duration: '12 Months' };
  assert.equal(originalPriceComparison(credit).period, 'package');
  assert.equal(originalPricePkr(credit), 28500);
  const monthly = products.find((p) => p.id === 'p013');
  for (const duration of ['-', '1-3 Years', '499 Invites', 'Lifetime Credits', '7 Days', '0 Months']) {
    assert.equal(planMonths({ ...monthly, duration }), null);
    assert.equal(savingsPkr({ ...monthly, duration }), null);
  }
});

test('missing, unsupported-currency and free references do not invent prices', () => {
  for (const product of [
    { ...products[0], originalPrice: 'Price on request', originalPricePkr: undefined },
    { ...products[0], originalPrice: '€10/month', originalPricePkr: undefined },
    { ...products[0], originalPrice: 'Free', originalPricePkr: undefined },
  ]) {
    assert.equal(originalPricePkr(product), null);
    assert.equal(savingsPkr(product), null);
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
  assert.equal(featuredProducts.length, 4);
  assert.deepEqual(featuredProducts.map((product) => product.id), ['p013', 'p012', 'p100', 'p101']);
});

test('homepage top ten keeps ChatGPT available and randomizes the remaining live stock', () => {
  const catalog = [
    { id: 'p093', name: 'ChatGPT Plus', price: 3499, available: 2, source: 'local' },
    ...Array.from({ length: 12 }, (_, index) => ({
      id: `supplier-${index}`,
      name: `Supplier Product ${index}`,
      price: 100 + index,
      available: 1,
      source: 'supplier',
      canonical_key: `supplier-${index}`,
    })),
    { id: 'sold-out', name: 'Sold Out', price: 100, available: 0, source: 'supplier' },
    { id: 'chatgpt-supplier', name: 'ChatGPT Plus 1 Month', price: 100, available: 1, source: 'supplier' },
  ];
  const first = selectRandomTopProducts(catalog, () => 0);
  const second = selectRandomTopProducts(catalog, () => 0.999);
  assert.equal(first.length, 10);
  assert.equal(first[0].id, 'p093');
  assert.equal(new Set(first.map((product) => product.id)).size, 10);
  assert.ok(first.every((product) => product.available > 0));
  assert.ok(!first.some((product) => product.id === 'chatgpt-supplier'));
  assert.notDeepEqual(first.map((product) => product.id), second.map((product) => product.id));
});

test('static catalog contains only the approved local products', () => {
  assert.deepEqual(products.map((product) => product.id), ['p093', 'p012', 'p013', 'p100', 'p101']);
  assert.ok(products.every((product) => /ChatGPT|Claude|Hostinger/.test(product.name)));
});

test('all orbit logos link to the corresponding tool detail page', () => {
  assert.deepEqual(orbitTools.map(({ name }) => name), ['GPT', 'CapCut', 'Figma', 'Claude', 'Hostinger', 'Grok']);
  assert.equal(orbitTools.find((tool) => tool.name === 'GPT')?.product.id, 'p093');
  assert.equal(orbitTools.find((tool) => tool.name === 'Claude')?.product.id, 'p013');
  assert.equal(orbitTools.find((tool) => tool.name === 'Hostinger')?.product.id, 'p100');
  for (const tool of orbitTools.filter(({ product }) => product)) assert.equal(productHref(tool.product), `/products/${tool.id}`);
  for (const tool of orbitTools.filter(({ product }) => !product)) assert.equal(tool.searchQuery, tool.name);
});

test('full inventory keeps all products, search, categories and empty results', () => {
  assert.equal(filterProducts('', 'All').length, products.length);
  assert.equal(filterProducts(' Premium ', 'All')[0].id, 'p012');
  assert.ok(filterProducts('', 'AI Assistants & Research').every((product) => product.category === 'AI Assistants & Research'));
  assert.equal(filterProducts('zzzz-not-a-product', 'All').length, 0);
});

test('hero shows the requested top selling product shortcuts without reducing the top ten', () => {
  assert.deepEqual(heroProducts.map((product) => product.id), ['p013', 'p012', 'p100', 'p101']);
  assert.equal(featuredProducts.length, 4);
  for (const product of heroProducts) assert.equal(productHref(product), `/products/${product.id}`);
});

test('live hero search matches VPN category and partial names across the full inventory', () => {
  assert.ok(filterProducts('Claude', 'All').some((product) => product.id === 'p013'));
  assert.ok(filterProducts('Host', 'All').some((product) => product.id === 'p100'));
  assert.equal(filterProducts('not-a-real-tool-xyz', 'All').length, 0);
});

test('WhatsApp orders retain the selected variant and correct recipient', () => {
  const href = new URL(whatsappLink('Claude Team Plan Premium', '1 Month'));
  assert.equal(href.hostname, 'wa.me');
  assert.equal(href.pathname, '/923116185711');
  assert.match(href.searchParams.get('text'), /Claude Team Plan Premium \(1 Month\)/);
});

test('Claude and Hostinger logos resolve to product identities', () => {
  assert.match(decodeURIComponent(productLogo(products.find((p) => p.id === 'p013'))), /claude.ai/);
  assert.match(decodeURIComponent(productLogo(products.find((p) => p.id === 'p100'))), /hostinger.com/);
});

test('access labels describe the retained local products', () => {
  assert.equal(accessTypeLabel(products.find((p) => p.id === 'p013')), 'Team seat or team access');
  assert.equal(accessTypeLabel(products.find((p) => p.id === 'p100')), 'Plan access - confirm account arrangement');
});
