import assert from 'node:assert/strict';
import test from 'node:test';
import { products } from '../app/products.ts';
import { supplierSeoProducts } from '../app/supplier-seo.ts';
import { productSearchTags } from '../app/product-search-tags.ts';

test('every customer product page has concise, unique related-search tags', () => {
  const catalog = [...products, ...supplierSeoProducts];
  assert.ok(catalog.length > 0);
  for (const product of catalog) {
    const tags = productSearchTags(product.name, product.slug || product.id);
    assert.ok(tags.length >= 4 && tags.length <= 8, product.name);
    assert.equal(new Set(tags).size, tags.length, product.name);
    assert.ok(tags.every((tag) => tag.length <= 80), product.name);
    assert.ok(tags.some((tag) => tag.includes('Pakistan')), product.name);
  }
});

test('related searches keep the actual product and access type distinct', () => {
  const examples = [
    ['apple-id-2fa-gmail', 'Apple ID 2FA Gmail', 'Apple ID 2FA', 'Gmail account'],
    ['kaspersky-premium-vpn', 'Kaspersky Premium VPN', 'Kaspersky Premium', 'VPN subscription'],
    ['key-windows-10-11-pro', 'Windows key', 'Windows 10/11 Pro key', 'subscription'],
    ['account-x-stock', 'Account X stock', 'X account', 'X Premium'],
    ['gpt-6-astra-api', 'GPT-6 Astra API', 'GPT-6 Astra API', 'Codex API'],
    ['300-buy-sell-groups-telegram-links', 'Telegram links', 'Telegram buy-sell group links', 'Telegram group members'],
  ];
  for (const [slug, name, expected, excluded] of examples) {
    const tags = productSearchTags(name, slug).join(' ');
    assert.ok(tags.includes(expected), slug);
    assert.ok(!tags.includes(excluded), slug);
  }
  assert.ok(!productSearchTags('Hostinger VPS', 'hostinger-vps').some((tag) => /^buy /i.test(tag)));
  assert.ok(productSearchTags('ChatGPT Plus shared account', 'chatgpt-plus-shared-account')
    .includes('ChatGPT Plus shared account Pakistan'));
});
