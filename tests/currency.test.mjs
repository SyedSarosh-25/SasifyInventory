import assert from 'node:assert/strict';
import test from 'node:test';
import { USD_TO_PKR, PKR_TO_INR, formatMoney, formatPriceReference, isCurrency } from '../app/currency-utils.ts';
import { products } from '../app/products.ts';

test('selling prices and savings convert between USD, PKR, and INR (3 PKR = 1 INR)', () => {
  assert.equal(USD_TO_PKR, 285);
  assert.equal(PKR_TO_INR, 3);
  assert.equal(formatMoney(285, 'PKR', 'USD'), 'USD 1.00');
  assert.equal(formatMoney(1, 'USD', 'PKR'), 'PKR 285');
  assert.equal(formatMoney(999, 'PKR', 'USD'), 'USD 3.51');
  assert.equal(formatMoney(999, 'PKR', 'PKR'), 'PKR 999');
  assert.equal(formatMoney(999, 'PKR', 'INR'), 'INR 333');
  assert.equal(formatMoney(3000, 'PKR', 'INR'), 'INR 1,000');
  assert.equal(formatMoney(100, 'INR', 'PKR'), 'PKR 300');
  assert.equal(formatMoney(2201, 'PKR', 'USD'), 'USD 7.72');
  assert.equal(formatMoney(20, 'USD', 'PKR'), 'PKR 5,700');
});

test('original reference conversions preserve all billing and package text', () => {
  assert.equal(formatPriceReference('Creator $22/month or $220/year', 'PKR'), 'Creator PKR 6,270/month or PKR 62,700/year');
  assert.equal(formatPriceReference('US$25 per seat/month', 'USD'), 'USD 25.00 per seat/month');
  assert.equal(formatPriceReference('ChatGPT Plus PKR 5,700/month', 'USD'), 'ChatGPT Plus USD 20.00/month');
  assert.equal(formatPriceReference('Starter from EUR 20/month', 'PKR'), 'Starter from EUR 20/month');
  assert.equal(formatPriceReference('499 Invites; pricing varies', 'USD'), '499 Invites; pricing varies');
});

test('all inventory prices render without invalid numeric values in all supported currencies', () => {
  for (const product of products) for (const currency of ['PKR', 'USD', 'INR']) {
    const price = formatMoney(product.sellingPricePkr, 'PKR', currency);
    const original = formatPriceReference(product.originalPrice, currency);
    assert.ok(price.startsWith(currency));
    assert.doesNotMatch(price + original, /NaN|Infinity|undefined/);
  }
});

test('only supported saved currency choices are accepted', () => {
  assert.equal(isCurrency('USD'), true);
  assert.equal(isCurrency('PKR'), true);
  assert.equal(isCurrency('INR'), true);
  for (const value of [null, 'EUR', 'usd', {}, 0]) assert.equal(isCurrency(value), false);
});
