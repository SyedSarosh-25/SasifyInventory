import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeProfit } from '../commerce/handler.mjs';
import { readFileSync } from 'node:fs';

test('daily figures use delivery time in Pakistan, fill empty days, and retain losses', () => {
  const result = summarizeProfit([
    { amount: 100, purchase_cost: 150, delivered_at: '2026-09-18T20:00:00Z' },
    { amount: 200, purchase_cost: 50, delivered_at: '2026-09-18T18:00:00Z' },
  ], [], new Date('2026-09-19T10:00:00Z'));
  assert.equal(result.daily.length, 30);
  assert.deepEqual(result.daily.at(-1), { date: '2026-09-19', revenue: 100, profit: -50, missingCosts: 0 });
  assert.equal(result.daily.at(-2).revenue, 200);
  assert.equal(result.daily[0].revenue, 0);
});
test('daily totals preserve HOR, shared-slot costs and missing-cost warning', () => {
  const rows = [
    { amount: 100, coupon_discount: 20, code_display: 'HOR', purchase_cost: 50, delivered_at: '2026-09-19T10:00:00Z' },
    { amount: 50, purchase_cost: 40, shared_account_id: 'a', shared_slot: 1, delivered_at: '2026-09-19T10:00:00Z' },
    { amount: 10, delivered_at: '2026-09-19T10:00:00Z' },
  ];
  const result = summarizeProfit(rows, [], new Date('2026-09-19T10:00:00Z'));
  assert.equal(result.daily.at(-1).revenue, result.metrics.income);
  assert.equal(result.daily.at(-1).profit, result.metrics.profit);
  assert.equal(result.daily.at(-1).missingCosts, 1);
});
test('API masks daily profit and cost information while financial view is locked', () => {
  const source = readFileSync(new URL('../commerce/handler.mjs', import.meta.url), 'utf8');
  assert.match(source, /dailyFinancials: profitSummary.daily.map\(\(day\) => profitUnlocked \? day : \{ date: day.date, revenue: day.revenue, profit: null, missingCosts: null \}\)/);
});
