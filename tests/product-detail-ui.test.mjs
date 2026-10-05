import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const productHtml = async (slug) => readFile(
  fileURLToPath(new URL(`../out/products/${slug}.html`, import.meta.url)),
  'utf8',
);

test('local and supplier product pages expose the same navigable buying hierarchy', async () => {
  for (const slug of [
    'chatgpt-plus-1-month',
    'hostinger-vps',
    'capcut-pro-team-1-month-1200-credits',
  ]) {
    const html = await productHtml(slug);
    assert.match(html, /class="detail-identity product-detail-hero"/);
    assert.match(html, /class="detail-jump-links"/);
    assert.match(html, /href="#overview"/);
    assert.match(html, /id="overview"/);
    assert.match(html, /href="#questions"/);
    assert.match(html, /id="questions"/);
    assert.match(html, /href="#popular-uses"/);
    assert.match(html, /id="popular-uses"/);
    assert.match(html, /<h2>Popular uses<\/h2>/);
    assert.doesNotMatch(html, /<h3>[^<]*price in Pakistan<\/h3>|Most used cases \/ searches/);
    assert.doesNotMatch(html, /href="#payment-details"|id="payment-details"|Listing reference/);
    assert.match(html, /href="#purchase-options"/);
    assert.match(html, /id="purchase-options"/);
    assert.ok(html.indexOf('id="overview"') < html.indexOf('id="questions"'));
    assert.ok(html.indexOf('id="questions"') < html.indexOf('id="purchase-options"'));
    assert.match(html, /Please read before purchasing/);
  }
});

test('local purchase and contact-only routes keep their existing destinations', async () => {
  const chatgpt = await productHtml('chatgpt-plus-1-month');
  const vps = await productHtml('hostinger-vps');
  assert.match(chatgpt, /href="\/checkout\?product=p093-ultra"/);
  assert.match(chatgpt, /Full 30-day warranty/);
  assert.doesNotMatch(chatgpt, /Full 30-day warranty included/);
  assert.match(vps, /href="https:\/\/wa\.me\/923116185711\?text=/);
  assert.match(vps, /Online checkout is not available for Hostinger VPS/);
});

test('every exported product page keeps useful search language without keyword blocks', async () => {
  const directory = fileURLToPath(new URL('../out/products/', import.meta.url));
  const pages = (await readdir(directory)).filter((file) => file.endsWith('.html'));
  assert.ok(pages.length > 100);
  for (const page of pages) {
    const html = await readFile(fileURLToPath(new URL(`../out/products/${page}`, import.meta.url)), 'utf8');
    assert.match(html, /class="description-section product-use-cases"/, page);
    assert.doesNotMatch(html, /<h2>Before you order<\/h2>|class="order-checks"/, page);
    assert.doesNotMatch(html, /For global search intent|Related searches and use cases|This section explains the real-world use case|class="search-intent-terms"|class="about-use-case-list"/, page);
  }
  const chatgpt = await productHtml('chatgpt-plus-1-month');
  assert.match(chatgpt, /ChatGPT Plus subscription/);
  assert.match(chatgpt, /ChatGPT Plus price in Pakistan/);
});

test('supplier descriptions do not repeat generic price, order or warranty lectures', async () => {
  const directory = fileURLToPath(new URL('../out/products/', import.meta.url));
  const pages = (await readdir(directory)).filter(file => file.endsWith('.html'));
  for (const page of pages) {
    const html = await readFile(fileURLToPath(new URL(`../out/products/${page}`, import.meta.url)), 'utf8');
    assert.doesNotMatch(html, /<h3>Price comparison<\/h3>|<h3>How this order works<\/h3>|Check this listing’s warranty terms before paying\./, page);
  }
});

test('verified competitor search phrases appear as chips, not sales copy', async () => {
  const chatgpt = await productHtml('chatgpt-plus-1-month');
  const phrases = [...chatgpt.matchAll(/<li data-no-translate="true">([^<]+)<\/li>/g)].map((match) => match[1]);
  assert.deepEqual(phrases, [
    'ChatGPT Plus',
    'chat gpt plus',
    'gpt plus',
    'ChatGPT subscription',
    'ChatGPT Plus price',
    'ChatGPT Plus price in Pakistan',
    'buy ChatGPT Plus Pakistan',
    'ChatGPT Plus subscription Pakistan',
  ]);
  assert.match(chatgpt, /class="product-related-searches"/);
  assert.doesNotMatch(chatgpt, /This ChatGPT Plus subscription is listed at/);

  const shared = await productHtml('chatgpt-plus-shared-account');
  assert.match(shared, /<li data-no-translate="true">ChatGPT Plus shared account Pakistan<\/li>/);
  assert.doesNotMatch(shared, /<li data-no-translate="true">buy ChatGPT Plus Pakistan<\/li>/);

  const directory = fileURLToPath(new URL('../out/products/', import.meta.url));
  const figmaFile = (await readdir(directory)).find((file) => file.startsWith('figma-') && file.endsWith('.html'));
  assert.ok(figmaFile);
  const figma = await readFile(fileURLToPath(new URL(`../out/products/${figmaFile}`, import.meta.url)), 'utf8');
  assert.match(figma, /<li data-no-translate="true">Figma subscription Pakistan<\/li>/);
});
