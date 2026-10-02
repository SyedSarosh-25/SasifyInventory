import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const handler = await readFile(new URL('../commerce/handler.mjs', import.meta.url), 'utf8');
const checkout = await readFile(new URL('../app/components/checkout.tsx', import.meta.url), 'utf8');

test('wallet payment charges both Claude preorders in full while retaining other discounts', () => {
  const ids = handler.match(/const CLAUDE_PREORDER_PRODUCT_IDS = new Set\((\[[^;]+\])\);/)[1];
  const expression = handler.match(/const walletDiscount = (isClaudePreorderProduct\(order.product_id\)[\s\S]*?);/)[1];
  const calculate = (order) => vm.runInNewContext(`const ids = new Set(${ids}); const isClaudePreorderProduct = id => ids.has(id); ${expression};`, { order });
  assert.equal(calculate({product_id: 'p012', amount: 19999}), 0);
  assert.equal(calculate({product_id: 'p013', amount: 4299}), 0);
  assert.equal(calculate({product_id: 'p100', amount: 25000}), 1250);
});

test('checkout excludes both Claude plans and explains the full wallet price', () => {
  assert.match(checkout, /walletDiscountExcluded = product\?\.id === 'p012' \|\| product\?\.id === 'p013'/);
  assert.match(checkout, /useSasifyWallet && !walletDiscountExcluded/);
  assert.match(checkout, /Claude pre-orders are excluded from the wallet discount/);
});
