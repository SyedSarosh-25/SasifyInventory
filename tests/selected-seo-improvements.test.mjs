import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import test from 'node:test';
import { knownToolFamilySlugs } from '../app/tool-families.ts';
import { translateText } from '../app/localization.ts';

const read = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

test('tools directory renders all known families and a static catalog heading', () => {
  const html = read('out/tools.html');
  assert.match(html, /<h1>Browse all tool plans<\/h1>/);
  assert.equal(knownToolFamilySlugs.length, 20);
  for (const slug of knownToolFamilySlugs) assert.ok(html.includes(`href="/tools/${slug}"`), slug);
  assert.match(html, /<h2 class="sr-only">Available plans<\/h2>/);
});

test('local and supplier product pages link to the corresponding tool hub', () => {
  assert.match(read('out/products/chatgpt-plus-1-month.html'), /href="\/tools\/chatgpt"/);
  const capcut = readdirSync(new URL('../out/products/', import.meta.url)).find(name => name.startsWith('capcut-') && name.endsWith('.html'));
  assert.ok(capcut);
  assert.match(read(`out/products/${capcut}`), /href="\/tools\/capcut"/);
});

test('small images are used without restoring removed login artwork', () => {
  assert.match(read('app/components/checkout.tsx'), /src="\/sasify-wallet-user-96.webp"/);
  assert.ok(statSync(new URL('../public/sasify-wallet-user-96.webp', import.meta.url)).size < 6000);
  assert.match(read('out/index.html'), /sasify-logo-200.webp/);
  assert.match(read('out/index.html'), /sasify-logo-96.webp/);
  assert.doesNotMatch(read('out/login.html'), /sasify-account-hero\.(png|webp)/);
});

test('production routes canonicalize only the bare public host and preserve API routing', () => {
  const config = JSON.parse(read('.vercel/output/config.json'));
  const redirect = config.routes.find(route => route.has?.some(rule => rule.type === 'host'));
  assert.deepEqual(redirect.has, [{type: 'host', value: 'sasifysolutions.com'}]);
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.Location, 'https://www.sasifysolutions.com/$1');
  const matcher = new RegExp(`^${redirect.src}$`);
  assert.ok(matcher.test('/inventory'));
  assert.ok(matcher.test('/checkout'));
  assert.ok(!matcher.test('/api/commerce'));
  assert.ok(!matcher.test('/api/nayapay/inbound-email'));
  assert.ok(config.routes.some(route => route.src === '/api/commerce' && route.dest === '/api/commerce'));
});

test('new concise labels have Roman Urdu and Vietnamese translations', () => {
  for (const text of ['Get your 2FA code', 'See top plans and prices', 'See price and buy', 'Plans by tool', 'Compare all ChatGPT plans and prices']) {
    for (const language of ['ur-Latn', 'vi']) assert.notEqual(translateText(text, language), text);
  }
});
