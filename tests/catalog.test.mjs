import assert from 'node:assert/strict';
import test from 'node:test';
import { products } from '../app/products.ts';
import { accessTypeLabel, has25DayWarranty, isAnnualPlan, originalPriceComparison, originalPricePkr, planMonths, productHref, productLogo, savingsPkr, warrantyDays, whatsappLink } from '../app/product-utils.ts';
import { featuredProducts, filterProducts, fixedTopProductSpecs, heroProducts, heroSupplierShortcuts, orbitTools, selectFixedTopProducts, selectHeroSupplierShortcut, selectRandomTopProducts, selectTopProductsWithRandom, supplierEquivalentProductName } from '../app/catalog-selection.ts';
import { supplierOriginalPriceComparison, supplierSavingsPkr } from '../app/supplier-price-utils.ts';

test('every inventory variant has a unique detail URL', () => {
  assert.equal(new Set(products.map(productHref)).size, products.length);
  for (const product of products) {
    assert.equal(productHref(product), `/products/${product.slug}`);
    assert.ok(product.description.length > 30);
    assert.ok(product.contactOnly || product.sellingPricePkr > 0);
  }
});

test('Claude Team prices and seat types match the requested offers', () => {
  assert.equal(products.find((p) => p.name === 'Claude Team Plan Standard')?.sellingPricePkr, 4299);
  assert.equal(products.find((p) => p.name === 'Claude Team Plan Premium')?.sellingPricePkr, 21999);
  for (const id of ['p012', 'p013']) {
    const product = products.find((p) => p.id === id);
    assert.equal(product.duration, '1 Month');
    assert.equal(has25DayWarranty(product), false);
    assert.doesNotMatch(product.description, /entire .*plan duration/i);
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

test('25-day warranty is scoped to one-month ChatGPT, other plans cover their full duration', () => {
  const base = products.find((product) => product.id === 'p093');
  for (const duration of ['30 Days', '1 Month']) assert.equal(has25DayWarranty({ ...base, duration }), true);
  for (const duration of ['3 Months', '1 Year', 'Lifetime Credits']) assert.equal(has25DayWarranty({ ...base, duration }), false);
  assert.equal(has25DayWarranty(products.find((product) => product.id === 'p093-shared')), false);
  for (const product of products.filter(product => !['p093', 'p093-shared'].includes(product.id))) {
    assert.equal(has25DayWarranty(product), false);
    assert.doesNotMatch(product.description, /entire .*plan duration/i);
  }
});

test('savings subtract our price from the listed original with the fixed USD rate', () => {
  assert.equal(savingsPkr(products.find((p) => p.id === 'p013')), 3201);
  assert.equal(savingsPkr(products.find((p) => p.id === 'p012')), 13626);
  assert.equal(savingsPkr(products.find((p) => p.id === 'p100')), 25488);
});

test('supplier comparisons use official plan references and the complete duration', () => {
  const gemini = {
    name: 'Gemini AI Pro 18 Month',
    description: 'Google AI Pro plan',
    price: 2499,
  };
  assert.equal(supplierOriginalPriceComparison(gemini).totalPkr, 102548.7);
  assert.equal(supplierSavingsPkr(gemini), 100049.7);

  const spotify = supplierOriginalPriceComparison({
    name: 'Spotify Premium 1 Year full warranty',
  });
  assert.equal(spotify.totalPkr, 4548);
  assert.equal(spotify.period, 'month');

  assert.equal(supplierOriginalPriceComparison({
    name: 'Coursera Premium 12 Month Plan',
    description: 'Includes a Gemini 3 Month promotional mention.',
  })?.totalPkr, 114000);
});

test('supplier comparisons use Pakistan references for known Office, Perplexity and credit offers', () => {
  const office = {
    name: 'Microsoft Office 2024 Pro key, 10 years warranty, 1 year guarantee',
    description: 'Official 2024 Pro Plus key for 1 Windows computer permanently',
    price: 1499,
  };
  assert.equal(supplierOriginalPriceComparison(office).totalPkr, 39599);
  assert.equal(supplierSavingsPkr(office), 38100);

  const perplexity = {
    name: 'CDK Perplexity Pro (iOS) 1 month - full warranty',
    price: 3999,
  };
  assert.equal(supplierOriginalPriceComparison(perplexity).totalPkr, 5700);
  assert.equal(supplierSavingsPkr(perplexity), 1701);

  const annualPerplexity = {
    name: 'CDK Perplexity Pro 1-Year',
    price: 14999,
  };
  assert.equal(supplierOriginalPriceComparison(annualPerplexity).totalPkr, 57000);
  assert.equal(supplierSavingsPkr(annualPerplexity), 42001);

  const elevenLabs = {
    name: 'ElevenLabs Redeem 300K Cre full warranty',
    price: 2499,
  };
  assert.equal(supplierOriginalPriceComparison(elevenLabs).totalPkr, 20520);
  assert.equal(supplierSavingsPkr(elevenLabs), 18021);

  const minimax = supplierOriginalPriceComparison({
    name: 'Minimax Redeem 1M Credit',
    price: 4999,
  });
  assert.equal(minimax.totalPkr, 8550);
  assert.equal(supplierSavingsPkr({ name: 'Minimax Redeem 1M Credit', price: 4999 }), 3551);
});

test('supplier comparisons cover the remaining standard subscription offers', () => {
  assert.equal(supplierOriginalPriceComparison({ name: 'Figma Pro 1 year full warranty' }).totalPkr, 54720);
  assert.equal(supplierOriginalPriceComparison({ name: 'Linkedin CAREER 3 MONTH' }).totalPkr, 34191.45);
  assert.equal(supplierOriginalPriceComparison({ name: 'LinkedIn Sales Navigator Core – 2 Months' }).totalPkr, 68394.3);
  assert.equal(supplierOriginalPriceComparison({ name: 'Zoom Pro 1Y full warranty' }).totalPkr, 48427.2);
  assert.equal(supplierOriginalPriceComparison({ name: 'Zoom Pro 28 Days full warranty' }).totalPkr, 4842.15);
  assert.equal(supplierOriginalPriceComparison({ name: 'Replit Core 1 Year' }).totalPkr, 61560);
  assert.equal(supplierOriginalPriceComparison({ name: 'Quillbot Premium 1m' }).totalPkr, 5685.75);
  assert.equal(supplierOriginalPriceComparison({ name: 'Framer Basic Plan 12 Month' }).totalPkr, 34200);
  assert.equal(supplierOriginalPriceComparison({ name: '🟠Headspace Premium – 4 Months' }).totalPkr, 14808.6);
  assert.equal(supplierOriginalPriceComparison({ name: 'Adobe Express Premium 12 months' }).totalPkr, 34165.8);
  assert.equal(supplierOriginalPriceComparison({ name: 'Apple Music 5M' }).totalPkr, 17085.75);
  assert.equal(supplierOriginalPriceComparison({ name: 'iLovePdf Premium 1Y' }).totalPkr, 17100);
  assert.equal(supplierOriginalPriceComparison({ name: 'CDK SUPER GROK 1 month' }).totalPkr, 8550);
  assert.equal(supplierOriginalPriceComparison({ name: 'Notion Business 3 Month' }).totalPkr, 17100);
  assert.equal(supplierOriginalPriceComparison({ name: 'SUNO PRO 1 MONTH' }).totalPkr, 2850);
});

test('ChatGPT Plus warranty uses the current listing terms', () => {
  const product = products.find((p) => p.id === 'p093');
  assert.equal(warrantyDays(product, 'p093-ultra'), 30);
  assert.equal(warrantyDays(product, 'p093-momo'), 25);
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

test('homepage Top 8 keeps distinct plan names and supplier prices from live stock', () => {
  assert.equal(fixedTopProductSpecs.length, 8);
  const catalog = [
    ...products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.sellingPricePkr,
      available: 1,
      source: 'local',
    })),
    {
      id: 'auto:1200-capcut-credits-pro-team-duration-1m',
      canonical_key: 'auto:1200-capcut-credits-pro-team-duration-1m',
      name: 'Capcut Pro Team 1 Month 1200 Credits',
      price: 999,
      available: 6,
      source: 'supplier',
    },
    {
      id: 'manual:muse-ai',
      canonical_key: 'manual:muse-ai',
      name: 'Muse AI 1 Billion AI Tokens',
      price: 2499,
      available: 6,
      source: 'supplier',
    },
    {
      id: 'auto:education-figma-plan-pro-duration-2y',
      canonical_key: 'auto:education-figma-plan-pro-duration-2y',
      name: 'Figma Pro Education Plan 2 Year',
      price: 4999,
      available: 2,
      source: 'supplier',
    },
  ];
  const selected = selectFixedTopProducts(catalog);
  assert.deepEqual(selected.map((product) => product.id), [
    'p093',
    'p093-shared',
    'p013',
    'p012',
    'auto:1200-capcut-credits-pro-team-duration-1m',
    'manual:muse-ai',
    'auto:education-figma-plan-pro-duration-2y',
    'p100',
  ]);
  assert.deepEqual(selected.map((product) => product.display_name), [
    'ChatGPT Plus · Private Account',
    'ChatGPT Plus · Shared Account',
    'Claude Team Plan Standard',
    'Claude Team Plan Premium',
    'CapCut Pro Team · 1 Month · 1200 Credits',
    'Muse AI · 1 Billion AI Tokens',
    'Figma Pro · 2 Years',
    'Hostinger Unlimited · 12 Months',
  ]);
  assert.deepEqual(selected.map((product) => product.display_price), [3699, 1199, 4299, 21999, undefined, undefined, undefined, 4500]);
  assert.deepEqual(selected.map((product) => product.display_original_price), [undefined, undefined, undefined, undefined, undefined, undefined, 109440, undefined]);
});

test('homepage CapCut card accepts the restored API identifier without changing price or stock', () => {
  const selected = selectFixedTopProducts([{ id: 'auto:capcut-duration-1m', canonical_key: 'auto:capcut-duration-1m', name: 'Capcut Pro Team 1 Month 1200 Credits', source: 'supplier', price: 999, available: 6 }]);
  assert.equal(selected.length, 1);
  assert.equal(selected[0].display_name, 'CapCut Pro Team · 1 Month · 1200 Credits');
  assert.equal(selected[0].price, 999);
  assert.equal(selected[0].available, 6);
});

test('homepage keeps the curated eight and adds one random in-stock product', () => {
  const catalog = [
    { id: 'p093', name: 'ChatGPT Plus', price: 3499, available: 1, source: 'local' },
    { id: 'p093-shared', name: 'ChatGPT Plus shared', price: 999, available: 1, source: 'local' },
    { id: 'p013', name: 'Claude Standard', price: 4299, available: 1, source: 'local' },
    { id: 'p012', name: 'Claude Premium', price: 21999, available: 1, source: 'local' },
    { id: 'p100', name: 'Hostinger', price: 4500, available: 1, source: 'local' },
    { id: 'auto:1200-capcut-credits-pro-team-duration-1m', canonical_key: 'auto:1200-capcut-credits-pro-team-duration-1m', name: 'Capcut Pro Team 1 Month 1200 Credits', price: 999, available: 1, source: 'supplier' },
    { id: 'manual:muse-ai', canonical_key: 'manual:muse-ai', name: 'Muse AI 1 Billion AI Tokens', price: 2499, available: 1, source: 'supplier' },
    { id: 'auto:education-figma-plan-pro-duration-2y', canonical_key: 'auto:education-figma-plan-pro-duration-2y', name: 'Figma Pro Education Plan 2 Year', price: 4999, available: 1, source: 'supplier' },
    { id: 'supplier-random', canonical_key: 'manual:supplier-random', name: 'Random in-stock product', price: 1299, available: 4, source: 'supplier' },
  ];
  const selected = selectTopProductsWithRandom(catalog, () => 0);
  assert.equal(selected.length, 9);
  assert.equal(selected.at(-1).id, 'supplier-random');
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
  assert.deepEqual(products.map((product) => product.id), ['p093-shared', 'p093', 'p012', 'p013', 'p100', 'p101']);
  assert.ok(products.every((product) => /ChatGPT|Claude|Hostinger/.test(product.name)));
});

test('all orbit logos link to the corresponding tool detail page', () => {
  assert.deepEqual(orbitTools.map(({ name }) => name), ['GPT', 'CapCut', 'Figma', 'Claude', 'Hostinger', 'Grok']);
  assert.equal(orbitTools.find((tool) => tool.name === 'GPT')?.product.id, 'p093');
  assert.equal(orbitTools.find((tool) => tool.name === 'Claude')?.product.id, 'p013');
  assert.equal(orbitTools.find((tool) => tool.name === 'Hostinger')?.product.id, 'p100');
  for (const tool of orbitTools.filter(({ product }) => product)) assert.equal(productHref(tool.product), `/products/${tool.product.slug}`);
  for (const tool of orbitTools.filter(({ product }) => !product)) assert.equal(tool.searchQuery, tool.name);
});

test('full inventory keeps all products, search, categories and empty results', () => {
  assert.equal(filterProducts('', 'All').length, products.length);
  assert.equal(filterProducts(' Premium ', 'All')[0].id, 'p012');
  assert.ok(filterProducts('', 'AI Assistants & Research').every((product) => product.category === 'AI Assistants & Research'));
  assert.equal(filterProducts('zzzz-not-a-product', 'All').length, 0);
});

test('product search matches titles only, never slugs, categories or durations', () => {
  assert.equal(filterProducts('ai-assistants-research', 'All').length, 0);
  assert.equal(filterProducts('1 month', 'All').length, 0);
  assert.ok(filterProducts('Claude Team Plan Premium', 'All').some((product) => product.id === 'p012'));
});

test('hero shows the requested top selling product shortcuts without reducing the top ten', () => {
  assert.deepEqual(heroProducts.map((product) => product.id), ['p013', 'p012', 'p100', 'p101']);
  assert.equal(featuredProducts.length, 4);
  for (const product of heroProducts) assert.equal(productHref(product), `/products/${product.slug}`);
});

test('hero supplier shortcuts open the requested stocked variants', () => {
  const catalog = [
    { id: 'auto:capcut-pro-7days-fw', canonical_key: 'auto:capcut-pro-7days-fw', name: 'Capcut Pro 7Days', price: 249, available: 154, source: 'supplier' },
    { id: 'auto:capcut-pro-30d-has-a-30-day-warranty', canonical_key: 'auto:capcut-pro-30d-has-a-30-day-warranty', name: 'Capcut Pro 30D has a 30-day warranty', price: 1499, available: 4, source: 'supplier' },
    { id: 'auto:cdk-heavy-grok-1m', canonical_key: 'auto:cdk-heavy-grok-1m', name: 'CDK Heavy Grok 1M', price: 24999, available: 30, source: 'supplier' },
    { id: 'auto:cdk-supergrok-1m', canonical_key: 'auto:cdk-supergrok-1m', name: 'CDK Supergrok 1M', price: 9999, available: 49, source: 'supplier' },
  ];
  assert.equal(selectHeroSupplierShortcut(catalog, heroSupplierShortcuts.find((item) => item.label === 'CapCut')).id, 'auto:capcut-pro-30d-has-a-30-day-warranty');
  assert.equal(selectHeroSupplierShortcut(catalog, heroSupplierShortcuts.find((item) => item.label === 'Grok')).id, 'auto:cdk-supergrok-1m');
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
