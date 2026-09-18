import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeProfit } from '../commerce/handler.mjs';

test('HOR value is separated from customer coupon discounts', () => {
  const result = summarizeProfit([
    {
      amount: 4500,
      coupon_discount: 500,
      code_display: 'HOR',
      purchase_cost: 1000,
      delivered_at: new Date().toISOString(),
    },
    {
      amount: 900,
      coupon_discount: 100,
      code_display: 'CUST',
      purchase_cost: 400,
      delivered_at: new Date().toISOString(),
    },
  ], []);

  assert.equal(result.metrics.income, 5400);
  assert.equal(result.metrics.gross_income, 6000);
  assert.equal(result.metrics.coupon_discounts, 100);
  assert.equal(result.metrics.hor_profit_credit, 500);
  assert.equal(result.metrics.cost, 1400);
  assert.equal(result.metrics.profit, 4500);
});
