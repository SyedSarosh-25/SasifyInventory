import assert from 'node:assert/strict';
import test from 'node:test';
import { generateTotp, totpRemainingSeconds } from '../app/totp-utils.ts';

test('TOTP generator matches the RFC 6238 SHA-1 vector', async () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  assert.equal(await generateTotp(secret, 0), '755224');
  assert.equal(await generateTotp(secret, 59_000), '287082');
});

test('TOTP countdown reports the next 30-second boundary', () => {
  assert.equal(totpRemainingSeconds(0), 30);
  assert.equal(totpRemainingSeconds(29_000), 1);
  assert.equal(totpRemainingSeconds(30_000), 30);
});

test('TOTP generator rejects invalid setup keys', async () => {
  await assert.rejects(() => generateTotp('JBSWY3DP0', 0), /valid Base32/);
});
