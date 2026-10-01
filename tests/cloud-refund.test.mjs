import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCloudRefund } from '../commerce/accounts.mjs';

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
