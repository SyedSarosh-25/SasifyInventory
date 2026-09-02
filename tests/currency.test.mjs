import assert from 'node:assert/strict';
import test from 'node:test';
import { fallbackRates, formatMoney, formatPriceReference, isCurrency, parseRateResponse, ratesAreFresh, validRates } from '../app/currency-utils.ts';
import { products } from '../app/products.ts';

const rates = { usdToPkr: 280, usdToEur: 0.8, updatedAt: '2026-09-02T00:00:00.000Z' };

test('selling prices and savings convert between USD and PKR', () => {
  assert.equal(formatMoney(999, 'PKR', 'USD', rates), 'USD 3.57');
  assert.equal(formatMoney(999, 'PKR', 'PKR', rates), 'PKR 999');
  assert.equal(formatMoney(2201, 'PKR', 'USD', rates), 'USD 7.86');
  assert.equal(formatMoney(20, 'USD', 'PKR', rates), 'PKR 5,600');
  assert.equal(formatMoney(20, 'EUR', 'USD', rates), 'USD 25.00');
});

test('original reference conversions preserve all billing and package text', () => {
  assert.equal(formatPriceReference('Creator $22/month or $220/year', 'PKR', rates), 'Creator PKR 6,160/month or PKR 61,600/year');
  assert.equal(formatPriceReference('US$25 per seat/month', 'USD', rates), 'USD 25.00 per seat/month');
  assert.equal(formatPriceReference('ChatGPT Plus PKR 5,700/month', 'USD', rates), 'ChatGPT Plus USD 20.36/month');
  assert.equal(formatPriceReference('Starter from EUR 20/month', 'PKR', rates), 'Starter from PKR 7,000/month');
  assert.equal(formatPriceReference('499 Invites; pricing varies', 'USD', rates), '499 Invites; pricing varies');
});

test('all inventory prices render without invalid numeric values in both currencies', () => {
  for (const product of products) for (const currency of ['PKR', 'USD']) {
    const price = formatMoney(product.sellingPricePkr, 'PKR', currency, fallbackRates);
    const original = formatPriceReference(product.originalPrice, currency, fallbackRates);
    assert.ok(price.startsWith(currency));
    assert.doesNotMatch(price + original, /NaN|Infinity|undefined/);
  }
});

test('only supported saved currency choices are accepted', () => {
  assert.equal(isCurrency('USD'), true);
  assert.equal(isCurrency('PKR'), true);
  for (const value of [null, 'EUR', 'usd', {}, 0]) assert.equal(isCurrency(value), false);
});

test('rate responses and persisted rates are validated before use', () => {
  const response = { result: 'success', base_code: 'USD', rates: { PKR: 280, EUR: 0.8 }, time_last_update_unix: 1788307200 };
  assert.deepEqual(parseRateResponse(response), rates);
  assert.equal(parseRateResponse({ ...response, result: 'error' }), null);
  assert.equal(parseRateResponse({ ...response, base_code: 'EUR' }), null);
  assert.equal(parseRateResponse({ ...response, rates: { PKR: 0, EUR: 0.8 } }), null);
  assert.equal(parseRateResponse({ ...response, time_last_update_unix: Infinity }), null);
  for (const bad of [null, {}, { ...rates, usdToPkr: NaN }, { ...rates, usdToEur: -1 }, { ...rates, updatedAt: 'invalid' }]) assert.equal(validRates(bad), false);
});

test('daily rate cache expires and future timestamps are not fresh', () => {
  const time = Date.parse(rates.updatedAt);
  assert.equal(ratesAreFresh(rates, time + 1000), true);
  assert.equal(ratesAreFresh(rates, time + 24 * 60 * 60 * 1000), false);
  assert.equal(ratesAreFresh(rates, time - 60 * 60 * 1000), false);
});
