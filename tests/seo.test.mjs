import assert from 'node:assert/strict';
import test from 'node:test';
import { products } from '../app/products.ts';
import { siteOrigin, defaultSiteOrigin, founderProfile, socials } from '../app/site-config.ts';
import { breadcrumbData, organizationData, productData, productDescription, productQuestions, productTitle, robotsRules, robotsText, serializeJsonLd, sitemapEntries, sitemapXml, websiteData } from '../app/seo.ts';

test('sitemap contains only unique canonical pages at the configured domain', () => {
  assert.equal(defaultSiteOrigin, 'https://www.sasifysolutions.com');
  const entries = sitemapEntries();
  assert.equal(entries.length, products.length + 8);
  assert.equal(new Set(entries.map(({ url }) => url)).size, entries.length);
  assert.deepEqual(entries.slice(0, 8).map(({ url }) => url), ['/', '/inventory', '/about', '/buying-guide', '/warranty', '/refunds', '/privacy', '/terms'].map((p) => siteOrigin + p));
  for (const entry of entries) {
    const url = new URL(entry.url);
    assert.equal(url.origin, siteOrigin);
    assert.equal(url.search, '');
    assert.equal(url.hash, '');
    assert.ok(!('lastModified' in entry), 'Do not invent content modification dates');
  }
  assert.equal((sitemapXml().match(/<loc>/g) || []).length, entries.length);
});

test('robots rules allow discovery and advertise the same sitemap', () => {
  assert.deepEqual(robotsRules(), { rules: { userAgent: '*', allow: '/' }, sitemap: `${siteOrigin}/sitemap.xml` });
  assert.equal(robotsText(), `User-agent: *\nAllow: /\n\nSitemap: ${siteOrigin}/sitemap.xml\n`);
});

test('every variant has unique search metadata and a truthful PKR offer', () => {
  assert.equal(new Set(products.map(productTitle)).size, products.length);
  assert.equal(new Set(products.map(productDescription)).size, products.length);
  for (const product of products) {
    assert.ok(productTitle(product).includes(product.name));
    assert.match(productTitle(product), /Price in Pakistan/);
    assert.ok(productDescription(product).includes(product.sellingPricePkr.toLocaleString('en-PK')));
    const data = productData(product);
    assert.equal(data['@type'], 'Product');
    assert.equal(data.sku, product.id);
    assert.equal(data.description, product.description);
    assert.equal(data.offers.price, product.sellingPricePkr);
    assert.equal(data.offers.priceCurrency, 'PKR');
    assert.equal(data.offers.url, `${siteOrigin}/products/${product.id}`);
    assert.equal(data.offers.seller['@id'], organizationData['@id']);
    for (const key of ['aggregateRating', 'review', 'brand', 'gtin']) assert.ok(!(key in data));
    for (const key of ['availability', 'priceValidUntil', 'hasMerchantReturnPolicy']) assert.ok(!(key in data.offers));
  }
});

test('plan answers preserve annual payments, limited warranty and unknown duration', () => {
  const canva = products.find(({ id }) => id === 'p096');
  assert.match(productQuestions(canva)[1].answer, /PKR 999 once.*full year/);
  assert.match(productQuestions(products.find(({ id }) => id === 'p093'))[2].answer, /25-day warranty/);
  assert.doesNotMatch(productQuestions(canva)[2].answer, /25-day/);
  const unknown = { ...canva, duration: '-' };
  assert.match(productQuestions(unknown)[0].answer, /Confirm the access period/);
  assert.ok(!('additionalProperty' in productData(unknown)));
});

test('business identity uses the real founder and supplied contact links, not product ratings', () => {
  assert.equal(organizationData.name, 'Sasify Solutions');
  assert.equal(organizationData.telephone, '+923116185711');
  assert.equal(organizationData.founder.name, 'Syed Sarosh');
  assert.equal(organizationData.founder.url, founderProfile);
  assert.deepEqual(organizationData.sameAs, socials.map(({ href }) => href));
  assert.ok(!('address' in organizationData));
  assert.ok(!('aggregateRating' in organizationData));
  assert.equal(websiteData.publisher['@id'], organizationData['@id']);
  assert.ok(!('potentialAction' in websiteData), 'Do not claim unsupported search features');
});

test('JSON-LD escapes script boundaries while preserving original data', () => {
  const data = { name: '</script><script>alert("x")</script>', description: 'A & B < C' };
  const serialized = serializeJsonLd(data);
  assert.ok(!serialized.includes('<'));
  assert.deepEqual(JSON.parse(serialized), data);
});

test('breadcrumbs retain order and absolute canonical destinations', () => {
  const data = breadcrumbData([{ name: 'Home', path: '/' }, { name: 'Full inventory', path: '/inventory' }]);
  assert.deepEqual(data.itemListElement.map(({ position }) => position), [1, 2]);
  assert.deepEqual(data.itemListElement.map(({ item }) => item), [`${siteOrigin}/`, `${siteOrigin}/inventory`]);
});
