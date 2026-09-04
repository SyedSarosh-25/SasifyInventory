import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { products } from '../app/products.ts';
import { siteOrigin } from '../app/site-config.ts';
import { productQuestions, productTitle, robotsText, sitemapXml } from '../app/seo.ts';
import { guidePlans, guideQuestions } from '../app/buying-guide-content.ts';

const out = fileURLToPath(new URL('../out/', import.meta.url));
const read = (file) => readFile(path.join(out, file), 'utf8');
const origin = siteOrigin;
const policyPages = ['warranty', 'refunds', 'privacy', 'terms'];
const canonicalPages = ['index', 'inventory', 'about', 'buying-guide', ...policyPages, ...products.map(({ id }) => `products/${id}`)];

test('brand title and standards-compatible favicons are included in exported pages', async () => {
  const home = await read('index.html');
  assert.match(home, /<title>Sasify Solutions \| Digital Tools and Services Marketplace<\/title>/);
  for (const file of ['index.html', 'inventory.html', 'about.html', 'buying-guide.html', 'privacy.html', 'products/p013.html', 'products/p096.html']) {
    const html = await read(file);
    const icons = [...html.matchAll(/<link\b[^>]*>/g)].map(([tag]) => tag).filter((tag) => /rel="(?:shortcut )?icon"/.test(tag));
    assert.ok(icons.some((tag) => tag.includes('href="/favicon.ico"') && tag.includes('type="image/x-icon"')), `ICO favicon missing: ${file}`);
    assert.ok(icons.some((tag) => tag.includes('href="/favicon-48x48.png"') && tag.includes('sizes="48x48"')), `48px favicon missing: ${file}`);
    assert.ok(html.includes('href="/apple-touch-icon.png"'), `Apple touch icon missing: ${file}`);
    assert.ok(!html.includes('href="/favicon.svg"'));
  }
  for (const file of ['favicon.ico', 'favicon-16x16.png', 'favicon-32x32.png', 'favicon-48x48.png', 'favicon-96x96.png', 'icon-192x192.png', 'apple-touch-icon.png']) {
    assert.ok((await stat(path.join(out, file))).size > 0, `Exported favicon asset missing: ${file}`);
  }
});

test('homepage, inventory and every product have populated static HTML', async () => {
  assert.match(await read('index.html'), /Sasify Solutions/);
  const inventory = await read('inventory.html');
  assert.match(inventory, /Full inventory/);
  for (const product of products) {
    const html = await read(`products/${product.id}.html`);
    assert.match(html, /Buy now on WhatsApp/);
    assert.match(html, /wa\.me\/923116185711/);
    assert.ok(html.includes(`${origin}/products/${product.id}`), `Canonical URL missing: ${product.id}`);
    assert.ok(inventory.includes(`/products/${product.id}`), `Inventory product missing: ${product.id}`);
    assert.match(html, /Your Savings/);
    assert.match(html, /Access type/);
  }
});

test('inventory includes category navigation arrows and selected category state', async () => {
  const html = await read('inventory.html');
  assert.match(html, /aria-label="Previous categories"/);
  assert.match(html, /aria-label="Next categories"/);
  assert.match(html, /class="category-navigation"/);
  assert.match(html, /aria-pressed="true"/);
});

test('Vercel Analytics is bundled and included once on every exported page', async () => {
  const manifest = JSON.parse(await read('.vite/manifest.json'));
  const analytics = manifest['node_modules/@vercel/analytics/dist/react/index.mjs'];
  assert.ok(analytics?.file, 'Analytics client bundle missing');
  assert.match(await read(analytics.file), /\/_vercel\/insights\/script\.js/);
  for (const file of canonicalPages) {
    const payload = await read(`${file}.rsc`);
    const references = [...payload.matchAll(/^([^:]+):I\[[^\n]*"Analytics"[^\n]*\]$/gm)];
    assert.equal(references.length, 1, `Analytics reference missing or duplicated: ${file}`);
    const reference = references[0][1];
    assert.equal(payload.split(`"$L${reference}"`).length - 1, 1, `Analytics mount missing or duplicated: ${file}`);
  }
});

test('Speed Insights is bundled and mounted once on every canonical page', async () => {
  const manifest = JSON.parse(await read('.vite/manifest.json'));
  const insights = manifest['app/components/performance-insights.tsx'];
  assert.ok(insights?.file, 'Speed Insights client bundle missing');
  assert.match(await read(insights.file), /\/_vercel\/speed-insights\/script\.js/);
  for (const file of canonicalPages) {
    const payload = await read(`${file}.rsc`);
    const references = [...payload.matchAll(/^([^:]+):I\[[^\n]*"PerformanceInsights"[^\n]*\]$/gm)];
    assert.equal(references.length, 1, `Speed Insights reference missing or duplicated: ${file}`);
    assert.equal(payload.split(`"$L${references[0][1]}"`).length - 1, 1, `Speed Insights mount missing or duplicated: ${file}`);
  }
});

const jsonLd = (html) => [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(([, value]) => JSON.parse(value));

test('export includes crawlable sitemap and robots files using the final domain', async () => {
  assert.equal(await read('robots.txt'), robotsText());
  assert.equal(await read('sitemap.xml'), sitemapXml());
});

test('Vercel export preserves canonical routes without hiding missing pages', async () => {
  const config = JSON.parse(await read('vercel.json'));
  assert.equal(config.cleanUrls, true);
  assert.equal(config.trailingSlash, false);
  assert.equal(config.rewrites, undefined, 'A homepage fallback would hide missing product URLs');
  const payloadHeaders = config.headers.find(({ source }) => source === '/:path*.rsc').headers;
  assert.ok(payloadHeaders.some(({ key, value }) => key === 'Content-Type' && value === 'text/x-component'));
});

test('the homepage head contains the actual Google and Bing verification tags', async () => {
  const html = await read('index.html');
  const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1];
  assert.ok(head, 'Missing document head');
  for (const [name, token] of [
    ['google-site-verification', 'l7lAGn1-T4ymCBShiZZMTVFF1vT3MK2IL92FHcXWKY4'],
    ['msvalidate.01', '3EBFF9C64E14DCD2D3149DAF9D02F7F5'],
  ]) {
    const tags = [...head.matchAll(/<meta\b[^>]*>/g)].map(([tag]) => tag).filter((tag) => tag.includes(`name="${name}"`));
    assert.equal(tags.length, 1, `Missing or duplicated verification tag: ${name}`);
    assert.ok(tags[0].includes(`content="${token}"`));
  }
});

test('every exported canonical page has matching search identity and server-rendered business data', async () => {
  for (const file of canonicalPages) {
    const html = await read(`${file}.html`);
    const url = `${origin}${file === 'index' ? '/' : `/${file}`}`;
    const canonical = [...html.matchAll(/<link\b[^>]*rel="canonical"[^>]*>/g)];
    assert.equal(canonical.length, 1, `Missing or duplicated canonical: ${file}`);
    const canonicalHref = canonical[0][0].match(/href="([^"]+)"/)?.[1];
    assert.equal(new URL(canonicalHref).href, new URL(url).href, `Incorrect canonical: ${file}`);
    const openGraphTag = html.match(/<meta\b[^>]*property="og:url"[^>]*>/)?.[0];
    const openGraphUrl = openGraphTag?.match(/content="([^"]+)"/)?.[1];
    assert.equal(new URL(openGraphUrl).href, new URL(url).href, `Incorrect sharing URL: ${file}`);
    assert.equal(jsonLd(html).filter((data) => data['@type'] === 'Organization').length, 1);
    assert.doesNotMatch(html, /<meta[^>]*content="[^"]*noindex/);
    assert.doesNotMatch(html, /royalblue-meerkat|morrisboyle861417684/);
  }
  assert.equal(jsonLd(await read('index.html')).filter((data) => data['@type'] === 'WebSite').length, 1);
});

test('buying guide answers and plan links are visible and match its structured data', async () => {
  const html = await read('buying-guide.html');
  const faqs = jsonLd(html).filter((data) => data['@type'] === 'FAQPage');
  assert.equal(faqs.length, 1);
  assert.equal(faqs[0].url, `${origin}/buying-guide`);
  assert.deepEqual(faqs[0].mainEntity.map((item) => ({ question: item.name, answer: item.acceptedAnswer.text })), guideQuestions);
  const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  for (const { question, answer } of guideQuestions) {
    assert.ok(visible.includes(question));
    assert.ok(visible.includes(answer));
  }
  for (const product of guidePlans) {
    assert.ok(visible.includes(`href="/products/${product.id}"`));
    assert.ok(visible.includes(product.sellingPricePkr.toLocaleString('en-PK')));
  }
  for (const file of ['index', 'about', 'products/p093']) {
    assert.ok((await read(`${file}.html`)).includes('href="/buying-guide"'));
  }
});

test('policy pages are indexable, linked and state only the confirmed commercial terms', async () => {
  const footerSource = await read('index.html');
  for (const file of policyPages) {
    const html = await read(`${file}.html`);
    assert.ok(footerSource.includes(`href="/${file}"`), `Footer policy link missing: ${file}`);
    assert.ok(html.includes(`https://www.sasifysolutions.com/${file}`));
    assert.match(html, /Last updated: 3 September 2026/);
    assert.match(html, /\+923116185711|Ask a policy question/);
  }
  assert.match(await read('warranty.html'), /One-month and 30-day packages:[\s\S]*full 25-day warranty/);
  assert.match(await read('warranty.html'), /one-year plan does not by itself include a one-year warranty/);
  assert.match(await read('refunds.html'), /Refund eligibility is not automatic/);
  const privacy = await read('privacy.html');
  assert.doesNotMatch(privacy, /Website analytics and performance/);
  assert.doesNotMatch(privacy, /Vercel Web Analytics privacy information|Vercel Speed Insights privacy information/);
  assert.match(privacy, /Vercel processes anonymized technical page-view and performance data/);
  assert.match(await read('terms.html'), /1 USD = PKR 285/);
});

test('all product offers match visible content and answers exist without running JavaScript', async () => {
  for (const product of products) {
    const html = await read(`products/${product.id}.html`);
    const data = jsonLd(html);
    const offers = data.filter((item) => item['@type'] === 'Product');
    assert.equal(offers.length, 1);
    assert.equal(offers[0].offers.price, product.sellingPricePkr);
    assert.equal(offers[0].offers.priceCurrency, 'PKR');
    assert.equal(offers[0].sku, product.id);
    assert.equal(data.filter((item) => item['@type'] === 'BreadcrumbList').length, 1);
    const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;');
    assert.ok(html.includes(`<title>${escape(productTitle(product))}</title>`));
    for (const { question, answer } of productQuestions(product)) {
      assert.ok(html.includes(escape(question)), `Missing visible question: ${product.id}`);
      assert.ok(html.includes(escape(answer)), `Missing visible answer: ${product.id}`);
    }
  }
});

test('HTML assets and internal navigation targets exist in the upload folder', async () => {
  const files = await readdir(out, { recursive: true });
  const targets = new Set();
  for (const file of files.filter((name) => name.endsWith('.html'))) {
    const html = await read(file);
    for (const match of html.matchAll(/(?:href|src)="(\/[^"\s]*)"/g)) {
      const url = new URL(match[1].replaceAll('&amp;', '&'), origin);
      if (url.origin === new URL(origin).origin) targets.add(decodeURIComponent(url.pathname));
    }
  }
  for (const target of targets) {
    const file = path.join(out, target);
    const info = await stat(file).catch(() => stat(`${file}.html`).catch(() => null));
    assert.ok(info, `Missing local URL: ${target}`);
    if (info.isDirectory()) assert.ok((await stat(path.join(file, 'index.html'))).isFile(), `Missing page: ${target}`);
  }
  assert.ok(targets.size > products.length);
});

test('upload includes error page, reviewer photos and Apache entry configuration', async () => {
  assert.match(await read('404.html'), /404|not found/i);
  assert.equal((await readdir(path.join(out, 'reviews'))).filter((file) => file.endsWith('.png')).length, 6);
  assert.match(await read('.htaccess'), /DirectoryIndex index\.html/);
  const files = await readdir(out, { recursive: true });
  assert.ok(!files.some((file) => /(^|[\\/])(server|node_modules|\.env[^\\/]*|\.openai|wrangler\.json)([\\/]|$)/.test(file)));
});
