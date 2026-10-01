import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { calculateCloudRefund, cloudRefundConfiguration } from '../commerce/accounts.mjs';
import { normalizeRefundDate, refundActivationDatePattern } from '../commerce/refund-date.mjs';

const calculate = (activationDate, purchasePrice = 5000) =>
  calculateCloudRefund({
    activationDate,
    purchasePrice,
    deactivationDate: '2026-09-30',
    warrantyDays: 25,
    billingDays: 30,
  });

test('cloud refund subtracts inclusive used days from the 25-day warranty', () => {
  assert.deepEqual(calculate('2026-09-11'), {
    elapsedDays: 20,
    remainingDays: 5,
    perDayCost: 5000 / 30,
    refundAmount: Math.round((5000 / 30) * 5),
  });
  assert.deepEqual(calculate('2026-09-18'), {
    elapsedDays: 13,
    remainingDays: 12,
    perDayCost: 5000 / 30,
    refundAmount: Math.round((5000 / 30) * 12),
  });
  assert.deepEqual(calculate('2026-09-13', 25000), {
    elapsedDays: 18,
    remainingDays: 7,
    perDayCost: 25000 / 30,
    refundAmount: Math.round((25000 / 30) * 7),
  });
});

test('cloud refund rejects when the warranty has fully elapsed', () => {
  assert.throws(() => calculate('2026-09-02'), /calculated refund amount is invalid/);
});

test('cloud refund rejects an activation date after deactivation', () => {
  assert.throws(
    () => calculate('2026-10-01'),
    /Activation date cannot be after the deactivation date/,
  );
});

test('refund cutoff stays on the reference deployment date instead of moving with the month', () => {
  const previous = process.env.CLOUD_ACCOUNT_DEACTIVATION_DATE;
  try {
    delete process.env.CLOUD_ACCOUNT_DEACTIVATION_DATE;
    assert.deepEqual(cloudRefundConfiguration(), {
      warrantyDays: 25, billingDays: 30, deactivationDate: '2026-09-30',
    });
    process.env.CLOUD_ACCOUNT_DEACTIVATION_DATE = '2026-10-30';
    assert.equal(cloudRefundConfiguration().deactivationDate, '2026-09-30');
  } finally {
    if (previous === undefined) delete process.env.CLOUD_ACCOUNT_DEACTIVATION_DATE;
    else process.env.CLOUD_ACCOUNT_DEACTIVATION_DATE = previous;
  }
});

test('refund activation dates are day-first, calendar-valid, and normalized for the API', () => {
  for (const [input, expected] of [
    ['12/09/2026', '2026-09-12'], ['09/12/2026', '2026-12-09'],
    ['1/9/2026', '2026-09-01'], ['12-09-2026', '2026-09-12'],
    [' 12/09/2026 ', '2026-09-12'], ['2026-09-12', '2026-09-12'],
    ['29/02/2024', '2024-02-29'],
  ]) assert.equal(normalizeRefundDate(input), expected, input);
  for (const input of ['', '31/09/2026', '29/02/2026', '2026-02-30', '12/31/2026', '1/9/26', '2026-09-12T00:00:00Z'])
    assert.equal(normalizeRefundDate(input), null, input);
  assert.equal(calculate(normalizeRefundDate('12/09/2026')).refundAmount, 1000);
});

test('refund server rejects impossible calendar dates instead of rolling them into another month', () => {
  for (const dates of [
    { activationDate: '2026-09-31', deactivationDate: '2026-09-30' },
    { activationDate: '2026-02-01', deactivationDate: '2026-02-30' },
    { activationDate: '', deactivationDate: '' },
  ]) assert.throws(() => calculateCloudRefund({ ...dates, purchasePrice: 5000 }), /Enter valid activation and deactivation dates/);
});

test('refund form uses a browser-valid day-first input pattern and submits normalized dates', async () => {
  const pattern = new RegExp(`^(?:${refundActivationDatePattern})$`, 'v');
  assert.equal(pattern.test('12/09/2026'), true);
  assert.equal(pattern.test('12-09-2026'), true);
  assert.equal(pattern.test('2026-09-12'), false);
  const source = await readFile(new URL('../app/components/customer-account.tsx', import.meta.url), 'utf8');
  assert.match(source, /pattern=\{refundActivationDatePattern\}/);
  assert.match(source, /normalizeRefundDate\(refundForm\.activationDate\)/);
  assert.match(source, /\.\.\.refundForm,\s*activationDate,/);
  assert.match(source, /Number\.isFinite\(end\)/);
});
