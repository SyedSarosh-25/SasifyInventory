import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeScamReport } from '../commerce/scam-reports.mjs';

test('scam reports require factual details, identifiers and payment methods', () => {
  const report = normalizeScamReport({
    name: 'Example seller',
    amountPkr: 25000,
    description: 'The seller accepted payment and did not deliver the promised service.',
    identifiers: [{ platform: 'Telegram', value: '@example' }, { platform: 'Private', value: 'discarded' }],
    paymentMethods: ['NayaPay', 'Easypaisa'],
    evidence: [{ filename: 'proof.png', type: 'image/png', data: 'data:image/png;base64,AAAA' }],
  });
  assert.deepEqual(report.identifiers, [{ platform: 'Telegram', value: '@example' }]);
  assert.deepEqual(report.paymentMethods, ['NayaPay', 'Easypaisa']);
});

test('scam report evidence accepts only bounded image data', () => {
  const valid = 'data:image/png;base64,AAAA';
  const base = { name: 'Example', amountPkr: 1000, description: 'A sufficiently detailed report about the transaction and the outcome.', identifiers: [{ platform: 'Other', value: 'public-id' }], paymentMethods: ['Bank transfer'] };
  assert.equal(normalizeScamReport({ ...base, evidence: [{ filename: 'proof.png', type: 'image/png', data: valid }] }).evidence.length, 1);
  assert.throws(() => normalizeScamReport({ ...base, evidence: [{ filename: 'proof.svg', type: 'image/svg+xml', data: '<svg />' }] }), /proof screenshot/);
});
