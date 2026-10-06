import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { products } from '../app/products.ts';
import { supplierSeoPageProducts, supplierSeoProducts, findSupplierSeoProduct } from '../app/supplier-seo.ts';
import { isInternalTestListing } from '../app/product-visibility.ts';
import { toolBuyingGuide } from '../app/tool-buying-guides.ts';
import { sitemapEntries } from '../app/seo.ts';
import { siteTitle } from '../app/site-config.ts';
import { verifiedHistoricalProductRedirects } from '../app/historical-product-redirects.mjs';

test('homepage title identifies the product type, market and real brand', () => {
  assert.equal(siteTitle, 'Sasify Solutions | Buy AI Tools & Subscriptions in Pakistan');
});

test('internal fixture detection is narrow and keeps legitimate or archived products', () => {
  for (const product of [{name:'API Test Product'}, {name:'test product'}, {slug:'api-test-product'}, {slug:'test-product-abc'}]) assert.equal(isInternalTestListing(product), true);
  for (const product of [{name:'API testing software'}, {name:'Penetration testing tools'}, {name:'ChatGPT Plus', archived:true}, {name:'Latest product'}]) assert.equal(isInternalTestListing(product), false);
  const fixture = supplierSeoPageProducts.find(isInternalTestListing);
  assert.ok(fixture, 'The known fixture must remain available for a noindex detail response');
  assert.equal(findSupplierSeoProduct(fixture.slug)?.slug, fixture.slug);
  assert.ok(!supplierSeoProducts.some(isInternalTestListing));
  assert.ok(!sitemapEntries().some(({url}) => url.endsWith(`/products/${fixture.slug}`)));
  assert.ok(supplierSeoProducts.some(product => product.archived), 'Do not blanket-deindex archived products');
});

test('comparisons link only to published current offers and derive prices from the catalog', () => {
  const current = new Map([...products.map(p=>[`/products/${p.slug}`, {price:p.sellingPricePkr, archived:false}]), ...supplierSeoProducts.map(p=>[`/products/${p.slug}`, p])]);
  for (const slug of ['chatgpt','cursor','gemini']) {
    const guide = toolBuyingGuide(slug);
    assert.ok(guide);
    assert.match(guide.title, /Pakistan.*Sasify Solutions/);
    assert.ok(guide.description.length <= 160);
    assert.ok(guide.comparisons.length >= 2);
    for (const row of guide.comparisons) {
      const product = current.get(row.href);
      assert.ok(product, row.href);
      assert.ok(!product.archived, row.href);
      assert.equal(row.price, product.price);
      for (const field of ['access','activation','warranty']) assert.ok(row[field].length > 30);
    }
  }
  assert.equal(toolBuyingGuide('figma'), null);
});

test('buyer explanations preserve privacy, API and warranty differences', () => {
  const chatgpt = toolBuyingGuide('chatgpt');
  assert.match(chatgpt.comparisons[0].access, /not private/);
  assert.match(chatgpt.comparisons[0].warranty, /no replacement, warranty or refund/);
  assert.match(chatgpt.comparisons[1].warranty, /30-day warranty/);
  const cursor = toolBuyingGuide('cursor');
  assert.match(cursor.intro, /API-credit package rather than a Cursor account/);
  assert.match(cursor.comparisons.find(p=>p.href.includes('cdk')).activation, /free plan/);
  const gemini = toolBuyingGuide('gemini');
  assert.match(gemini.intro, /not automatically the warranty period/);
  assert.match(gemini.comparisons.find(p=>p.href.includes('18-month')).activation, /1–2 hours/);
  assert.match(gemini.comparisons.find(p=>p.href.includes('coursera')).warranty, /24-hour/);
});

test('historical Gemini URL resolves only to its equivalent 18-month package', () => {
  assert.deepEqual(verifiedHistoricalProductRedirects(supplierSeoProducts), [['p016','gemini-ai-pro-18-month']]);
  assert.throws(()=>verifiedHistoricalProductRedirects([]), /needs review/);
  assert.throws(()=>verifiedHistoricalProductRedirects([{slug:'gemini-ai-pro-18-month', name:'Gemini AI Pro 3 Months'}]), /needs review/);
});

test('static tool pages expose comparisons, activation guidance, FAQs and policy links with one H1', () => {
  for (const slug of ['chatgpt','cursor','gemini']) {
    const guide = toolBuyingGuide(slug);
    const html = readFileSync(new URL(`../out/tools/${slug}.html`, import.meta.url), 'utf8');
    assert.equal((html.match(/<h1\b/g)||[]).length, 1);
    assert.ok(html.includes(guide.heading));
    assert.ok(html.includes(guide.title.replaceAll('&', '&amp;')));
    assert.match(html, /Compare access, activation and warranty/);
    assert.match(html, /Before you activate your plan/);
    assert.match(html, /Questions before buying/);
    for (const row of guide.comparisons) assert.ok(html.includes(`href="${row.href}"`));
    for (const href of ['/buying-guide','/warranty','/refunds']) assert.ok(html.includes(`href="${href}"`));
  }
});

test('fixture HTML opts out of indexing without removing public crawl access', () => {
  const fixture = supplierSeoPageProducts.find(isInternalTestListing);
  const html = readFileSync(new URL(`../out/products/${fixture.slug}.html`, import.meta.url), 'utf8');
  assert.match(html, /<meta name="robots" content="noindex, nofollow"/);
  assert.ok(!readFileSync(new URL('../out/sitemap.xml',import.meta.url),'utf8').includes(`/products/${fixture.slug}`));
  assert.ok(!readFileSync(new URL('../out/inventory.html',import.meta.url),'utf8').includes(`href="/products/${fixture.slug}"`));
});

test('both static and commerce deployment outputs preserve the historical redirect', () => {
  const config = JSON.parse(readFileSync(new URL('../out/vercel.json',import.meta.url),'utf8'));
  assert.ok(config.redirects.some(r=>r.source==='/products/p016' && r.destination==='/products/gemini-ai-pro-18-month' && r.permanent));
  try {
    const packaged = JSON.parse(readFileSync(new URL('../.vercel/output/config.json',import.meta.url),'utf8'));
    const redirect = packaged.routes.find(r=>new RegExp(`^${r.src}$`).test('/products/p016') && r.headers?.Location==='/products/gemini-ai-pro-18-month');
    assert.equal(redirect?.status, 308);
    assert.ok(new RegExp(`^${redirect.src}$`).test('/products/p016/'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
});
