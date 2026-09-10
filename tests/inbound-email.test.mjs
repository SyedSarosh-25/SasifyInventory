import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeInboundEmail } from '../commerce/inbound-email.mjs';

test('normalizes a Postmark-style forwarded NayaPay email', () => {
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
