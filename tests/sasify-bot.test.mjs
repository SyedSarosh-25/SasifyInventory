import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutUrl, sasifyBotConfigured, sasifyBotMenu } from '../commerce/sasify-bot.mjs';

test('public SasifyBot uses separate credentials and secure website checkout links', () => {
  assert.equal(
    sasifyBotConfigured({ SASIFY_BOT_TOKEN: 'public-token', SASIFY_BOT_WEBHOOK_SECRET: 'secret' }),
    true,
  );
  assert.equal(
    sasifyBotConfigured({ SASIFY_BOT_TOKEN: 'public-token', TELEGRAM_BOT_TOKEN: 'notification-token' }),
    false,
  );
  assert.equal(checkoutUrl('p013'), 'https://www.sasifysolutions.com/checkout?product=p013');
});

test('public SasifyBot menu links tools and products without exposing credentials', () => {
  const menu = sasifyBotMenu([
    { id: 'p013', name: 'Claude Team Plan Standard', price: 5199 },
    { id: 'p101', name: 'Hostinger VPS', price: 0 },
  ]);
  const serialized = JSON.stringify(menu);
  assert.match(serialized, /Claude Team Plan Standard/);
  assert.match(serialized, /\/inventory/);
  assert.match(serialized, /\/otp/);
  assert.match(serialized, /\/request-tool/);
  assert.match(serialized, /\/buying-guide/);
  assert.doesNotMatch(serialized, /password|email|2FA key/i);
});
