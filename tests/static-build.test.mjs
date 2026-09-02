import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { products } from '../app/products.ts';

const out = fileURLToPath(new URL('../out/', import.meta.url));
const read = (file) => readFile(path.join(out, file), 'utf8');
const origin = process.env.NEXT_PUBLIC_SITE_ORIGIN || 'https://royalblue-meerkat-205788.hostingersite.com';

test('brand title and original logo favicon are included in exported pages', async () => {
  const home = await read('index.html');
  assert.match(home, /<title>Sasify Solutions \| Digital Tools and Services Marketplace<\/title>/);
  for (const file of ['index.html', 'inventory.html', 'products/p013.html', 'products/p096.html']) {
    const html = await read(file);
    const icon = [...html.matchAll(/<link\b[^>]*>/g)].map(([tag]) => tag).find((tag) => /rel="icon"/.test(tag));
    assert.ok(icon?.includes('href="/sasify-logo.png"'), `Original favicon missing: ${file}`);
    assert.ok(icon?.includes('type="image/png"'));
    assert.ok(!html.includes('href="/favicon.svg"'));
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
  assert.ok(!files.some((file) => /(^|[\\/])(server|node_modules|\.env|\.openai|wrangler\.json)([\\/]|$)/.test(file)));
});
