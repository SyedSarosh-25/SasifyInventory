import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeInboundEmail, authenticateInboundEmail } from '../commerce/inbound-email.mjs';
import { generateKeyPairSync } from 'node:crypto';
import { dkimSign } from 'mailauth/lib/dkim/sign.js';

test('normalizes a provider-style forwarded NayaPay email', () => {
  const result = normalizeInboundEmail({
    FromFull: { Name: 'NayaPay', Email: 'service@nayapay.com' },
    ToFull: [{ Email: 'inbound@example.invalid' }],
    Subject: 'You got Rs. 3,250 from Bank Alfalah-0388 🎉',
    TextBody: 'Amount Received\nRs. 3,250\nTransaction ID\n247854',
    HtmlBody: '<p>Amount Received</p><p>Rs. 3,250</p>',
    Date: '2026-09-09T12:00:00.000Z',
    MessageID: '<payment-247854@example.invalid>',
  });

  assert.deepEqual(result, {
    from: 'NayaPay <service@nayapay.com>',
    to: 'inbound@example.invalid',
    subject: 'You got Rs. 3,250 from Bank Alfalah-0388 🎉',
    text: 'Amount Received\nRs. 3,250\nTransaction ID\n247854',
    html: '<p>Amount Received</p><p>Rs. 3,250</p>',
    date: '2026-09-09T12:00:00.000Z',
    messageId: '<payment-247854@example.invalid>',
  });
});

test('uses Message-ID header when provider omits its message id field', () => {
  const result = normalizeInboundEmail({
    From: 'service@nayapay.com',
    To: 'inbound@example.invalid',
    Subject: 'Payment receipt',
    TextBody: 'Receipt body',
    Headers: [{ Name: 'Message-ID', Value: '<header-id@example.invalid>' }],
  });

  assert.equal(result.messageId, '<header-id@example.invalid>');
});

test('rejects inbound payloads without a subject or body', () => {
  assert.throws(() => normalizeInboundEmail({ TextBody: 'Receipt body' }), /subject and body are required/i);
  assert.throws(() => normalizeInboundEmail({ Subject: 'Receipt' }), /subject and body are required/i);
});

test('missing original date stays missing and original message id wins over provider id', () => {
  const email = normalizeInboundEmail({ Subject: 'Receipt', TextBody: 'Body', MessageID: 'provider-id', Headers: [{ Name: 'Message-ID', Value: '<original@test.invalid>' }] });
  assert.equal(email.date, '');
  assert.equal(email.messageId, '<original@test.invalid>');
});

test('original signed MIME is authoritative; forged fields and changed bodies cannot approve payment', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const key = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
  const resolver = async () => [[`v=DKIM1; k=rsa; p=${key}`]];
  const raw = [
    'From: NayaPay <service@nayapay.com>', 'To: merchant@example.invalid',
    'Subject: You got Rs. 3,499 from Test', `Date: ${new Date().toUTCString()}`,
    'Message-ID: <receipt-1@nayapay.com>', 'Content-Type: text/plain; charset=utf-8', '',
    'Amount Received', 'Rs. 3,499', 'Transaction ID', 'TEST12345678', '',
  ].join('\r\n');
  const signed = await dkimSign(raw, { signatureData: [{ signingDomain: 'nayapay.com', selector: 'test', privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }) }] });
  assert.equal(signed.errors.length, 0);
  const payload = { Subject: 'Forged subject', TextBody: 'Forged body', RawEmail: signed.signatures + raw };
  const valid = await authenticateInboundEmail(payload, 'service@nayapay.com', { resolver });
  assert.equal(valid.authenticated, true, JSON.stringify(valid));
  assert.equal(valid.email.subject, 'You got Rs. 3,499 from Test');
  assert.match(valid.email.text, /TEST12345678/);
  assert.equal((await authenticateInboundEmail({ ...payload, RawEmail: payload.RawEmail.replace('TEST12345678', 'STOLEN999999') }, 'service@nayapay.com', { resolver })).authenticated, false);
  assert.equal((await authenticateInboundEmail({ ...payload, RawEmail: undefined }, 'service@nayapay.com')).authenticated, false);
  assert.equal((await authenticateInboundEmail({ ...payload, RawEmail: 'From: Attacker <service@nayapay.com>\r\n' + payload.RawEmail }, 'service@nayapay.com', { resolver })).authenticated, false);
  await assert.rejects(authenticateInboundEmail(payload, 'service@nayapay.com', {
    resolver: async () => { throw Object.assign(new Error('DNS timed out'), { code: 'ETIMEOUT' }); },
  }), { status: 503 });
  assert.equal((await authenticateInboundEmail(payload, 'service@attacker.invalid', { resolver })).authenticated, false);
  const partial = await dkimSign(raw, { signatureData: [{ signingDomain: 'nayapay.com', selector: 'test', maxBodyLength: 10, privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }) }] });
  assert.equal((await authenticateInboundEmail({ ...payload, RawEmail: partial.signatures + raw }, 'service@nayapay.com', { resolver })).authenticated, false);
});
