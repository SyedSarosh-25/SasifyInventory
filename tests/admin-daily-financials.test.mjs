import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeProfit } from '../commerce/handler.mjs';
import { readFileSync } from 'node:fs';

test('daily figures use delivery time in Pakistan, fill empty days, and retain losses', () => {
  const result = summarizeProfit([
    { amount: 100, purchase_cost: 150, delivered_at: '2026-09-18T20:00:00Z' },
    { amount: 200, purchase_cost: 50, delivered_at: '2026-09-18T18:00:00Z' },
  ], [], new Date('2026-09-19T10:00:00Z'));
  assert.ok(result.daily.length >= 30);
  assert.deepEqual(result.daily.at(-1), { date: '2026-09-19', revenue: 100, profit: -50, missingCosts: 0, sold: 1, gptShared: 0, gptPrivate: 0, withdrawals: 0, products: { unknown: 1 } });
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
  assert.match(source, /dailyFinancials: profitSummary.daily.map\(\(day\) =>\s+profitUnlocked\s+\? day\s+: \{\s+\.\.\.day,\s+profit: null,\s+missingCosts: null/);
  assert.match(source, /monthlyFinancials: profitSummary.monthly.map\(\(month\) => \(\{\s+\.\.\.month,\s+profit: profitUnlocked \? month.profit : null,\s+missingCosts: profitUnlocked \? month.missingCosts : null/);
});

test('month closing and current figures respect Pakistan midnight and separate GPT seats', () => {
  const result = summarizeProfit([
    { product_id: 'p093-ultra', amount: 1000, purchase_cost: 600, delivered_at: '2026-09-30T18:59:59Z' },
    { product_id: 'p093-shared', shared_account_id: 'a', shared_slot: 1, amount: 500, purchase_cost: 800, delivered_at: '2026-09-30T19:00:00Z' },
    { product_id: 'p093', amount: 1500, purchase_cost: 900, delivered_at: '2026-10-01T12:00:00Z' },
    { product_id: 'p013', amount: 2000, purchase_cost: 1000, delivered_at: '2026-10-02T01:00:00Z' },
  ], [{ product_id: 'p093-ultra', purchase_cost: 700, created_at: '2026-10-01T15:00:00Z' }], new Date('2026-10-02T10:00:00Z'));
  const lastMonth = result.monthly.find((row) => row.date === '2026-09');
  assert.equal(lastMonth.closed, true);
  assert.equal(lastMonth.revenue, 1000);
  assert.equal(lastMonth.profit, 400);
  assert.equal(lastMonth.gptPrivate, 1);
  assert.equal(lastMonth.gptShared, 0);
  const current = result.monthly.find((row) => row.date === '2026-10');
  assert.equal(current.closed, false);
  assert.equal(current.sold, 3);
  assert.equal(current.gptPrivate, 1);
  assert.equal(current.gptShared, 1);
  assert.equal(current.withdrawals, 1);
  assert.equal(current.revenue, result.metrics.monthly_income);
  assert.equal(current.profit, result.metrics.monthly_profit);
  assert.equal(result.daily.find((row) => row.date === '2026-10-01').sold, 2);
  assert.deepEqual(result.daily.find((row) => row.date === '2026-10-01').products, { 'p093-shared': 1, p093: 1 });
});

test('January rolls back to December and historical quiet days are filled', () => {
  const result = summarizeProfit([{ product_id: 'p093', amount: 100, purchase_cost: 50, delivered_at: '2025-11-01T00:00:00Z' }], [], new Date('2026-01-01T00:00:00Z'));
  assert.equal(result.previousMonth, '2025-12');
  assert.equal(result.monthly.find((row) => row.date === '2025-12').revenue, 0);
  assert.equal(result.daily.find((row) => row.date === '2025-11-02').sold, 0);
  assert.equal(result.metrics.monthly_income, 0);
});

test('overview cards use current-month sales, profit and order counts rather than lifetime totals', () => {
  const source = readFileSync(new URL('../app/components/checkout.tsx', import.meta.url), 'utf8');
  const cards = source.slice(source.indexOf('<section className="metric-grid">'), source.indexOf('<AdminDailyChart days='));
  assert.match(source, /month.date === data\?\.reportingPeriods\?\.currentMonth/);
  assert.match(cards, /currentMonthReport\?\.revenue/);
  assert.match(cards, /currentMonthReport\?\.profit/);
  assert.match(cards, /currentMonthReport\?\.sold/);
  assert.match(cards, /currentMonthReport\?\.withdrawals/);
  assert.doesNotMatch(cards, /data.metrics\.(income|profit|delivered_orders|admin_withdrawals|gross_income|hor_profit_credit)\b/);
});
