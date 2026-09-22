import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBinanceCryptoEmail, parseBinanceEmail } from '../commerce/binance-email.mjs';

function subject() {
  const value = new Date();
  const date = value.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' (UTC)');
  return '[Binance] Payment Receive Successful - ' + date;
}

const config = {
  enabled: true,
  sender: 'do_not_reply_at_mgdirectmail_binance_com_g4q95rc4n9_67b3b6df@privaterelay.appleid.com',
  receiverMailbox: 'g4q95rc4n9@privaterelay.appleid.com',
};

test('Binance payment receipt parses USDT only with a unique reference', () => {
  const parsed = parseBinanceEmail(
    {
      subject: subject(),
      from: `Binance <${config.sender}>`,
      to: config.receiverMailbox,
      text: 'Payer: MuazShah\nAmount: 280.50 USDT\nTransaction ID: BN123456789',
    },
    config,
  );
  assert.equal(parsed.amount, 280.5);
  assert.equal(parsed.currency, 'USDT');
  assert.equal(parsed.payer, 'MuazShah');
  assert.equal(parsed.transaction, 'BN123456789');
  assert.equal(parsed.verified, true);
});

test('Binance receipt without a unique reference stays in review', () => {
  const parsed = parseBinanceEmail(
    {
      subject: subject(),
      from: `Binance <${config.sender}>`,
      to: config.receiverMailbox,
      text: 'Payer: MuazShah\nAmount: 280 USDT',
    },
    config,
  );
  assert.equal(parsed.verified, false);
  assert.equal(parsed.reason, 'transaction_missing_or_ambiguous');
});

test('Binance receipt extracts the unique id from the signed history link', () => {
  const payload = Buffer.from(JSON.stringify({ id: '736029aeaf57482ea03b8ace458a3716' })).toString('base64url');
  const html = `<a href="https://binance.com/bapi/composite/v1/public/message/click-url?_bEt=eyJhbGciOiJIUzI1NiJ9.${payload}.signature">View Transaction History</a>`;
  const parsed = parseBinanceEmail(
    {
      subject: subject(),
      from: `Binance <${config.sender}>`,
      to: config.receiverMailbox,
      text: 'From: MuazShah\nAmount: 280 USDT',
      html,
    },
    config,
  );
  assert.deepEqual(parsed.references, ['736029AEAF57482EA03B8ACE458A3716']);
  assert.equal(parsed.transaction, '736029AEAF57482EA03B8ACE458A3716');
  assert.equal(parsed.verified, true);
});

test('Binance crypto deposit parses the confirmed net USDT amount', () => {
  const payload = Buffer.from(JSON.stringify({ id: '186765a11b38426abb6fc6c2ace1eb8c' })).toString('base64url');
  const parsed = parseBinanceCryptoEmail(
    {
      subject: '[Binance] USDT Deposit Confirmed - 2026-09-20 15:05:13 (UTC) - 2026-09-20 15:05:14 (UTC)',
      from: `Binance <${config.sender}>`,
      to: config.receiverMailbox,
      text: 'USDT Deposit Successful. Your deposit of 738 USDT is now available in your Binance account. Log in to check your balance.',
      html: `<a href="https://binance.com/bapi/composite/v1/public/message/click-url?_bEt=eyJhbGciOiJIUzI1NiJ9.${payload}.signature">View deposit</a>`,
    },
    config,
  );
  assert.equal(parsed.paymentMethod, 'crypto');
  assert.equal(parsed.amount, 738);
  assert.equal(parsed.currency, 'USDT');
  assert.equal(parsed.network, null);
  assert.equal(parsed.transaction, '186765A11B38426ABB6FC6C2ACE1EB8C');
  assert.equal(parsed.verified, true);
});

test('Binance crypto deposits with a short amount remain unverified by matching', () => {
  const parsed = parseBinanceCryptoEmail(
    {
      subject: '[Binance] USDT Deposit Confirmed - ' + new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' (UTC)'),
      from: `Binance <${config.sender}>`,
      to: config.receiverMailbox,
      text: 'You received 279.99 USDT\nTxID: CRYPTO-DEPOSIT-SHORT',
    },
    config,
  );
  assert.equal(parsed.amount, 279.99);
  assert.equal(parsed.verified, true);
  // The order matcher, not the email parser, enforces exact net amount.
});
