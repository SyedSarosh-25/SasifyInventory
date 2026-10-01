import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTelegramDelivery,
  mainMenuMessage,
  productCategoriesMessage,
  productIcon,
  productMessage,
  productRef,
  productsMessage,
  orderPaymentMessage,
  paymentMethodMessage,
  languageMessage,
  sasifyBotConfigured,
  sasifyBotMenu,
} from '../commerce/sasify-bot.mjs';

test('public SasifyBot uses separate credentials', () => {
  assert.equal(
    sasifyBotConfigured({
      SASIFY_BOT_TOKEN: 'public-token',
      SASIFY_BOT_WEBHOOK_SECRET: 'secret',
    }),
    true,
  );
  assert.equal(
    sasifyBotConfigured({
      SASIFY_BOT_TOKEN: 'public-token',
      TELEGRAM_WEBHOOK_SECRET: 'secret',
    }),
    false,
  );
});

test('public SasifyBot presents Telegram-native menus without website checkout links', () => {
  const menu = sasifyBotMenu([
    { id: 'p013', name: 'Claude Team Plan Standard', price: 4299 },
  ]);
  const serialized = JSON.stringify(menu);
  assert.match(serialized, /Buy products/);
  assert.match(serialized, /Purchase history/);
  assert.doesNotMatch(serialized, /Wallet/);
  assert.match(serialized, /Warranty/);
  assert.doesNotMatch(serialized, /checkout\?product=/);
});

test('product buttons use a short stable callback reference', () => {
  const product = {
    id: 'auto:a-very-long-supplier-product-name',
    name: 'Example product',
    price: 999,
    available: 4,
  };
  const message = productMessage(product);
  assert.equal(productRef(product.id).length, 10);
  assert.match(
    JSON.stringify(message),
    new RegExp(`buy:${productRef(product.id)}`),
  );
  assert.match(JSON.stringify(productsMessage([product])), /Example product/);
  assert.doesNotMatch(JSON.stringify(productMessage({ ...product, provider_name: 'Hidden supplier' })), /Hidden supplier/);
});

test('product catalogue starts with category buttons and uses a compact grid', () => {
  const message = productCategoriesMessage([
    { id: 'p013', name: 'ChatGPT Plus', price: 4999, available: 3 },
    { id: 'p014', name: 'Claude Team', price: 5199, available: 2 },
  ]);
  const serialized = JSON.stringify(message);
  assert.match(serialized, /ChatGPT/);
  assert.match(serialized, /Claude/);
  assert.match(serialized, /category:chatgpt:0/);
  assert.match(serialized, /category:claude:0/);
  const grid = productsMessage([
    { id: 'p013', name: 'ChatGPT Plus', price: 4999, available: 3 },
    { id: 'p014', name: 'Claude Team', price: 5199, available: 2 },
    { id: 'p015', name: 'Gemini Pro', price: 2999, available: 1 },
  ], 0, 'all');
  assert.equal(grid.reply_markup.inline_keyboard[0].length, 3);
});

test('product buttons use relevant brand icons with a shopping fallback', () => {
  assert.equal(productIcon({ name: 'LinkedIn Sales Navigator' }), '🔵');
  assert.equal(productIcon({ name: 'Suno Pro' }), '🎵');
  assert.equal(productIcon({ name: 'Unknown digital tool' }), '🛍️');
  const grid = productsMessage([
    { id: 'linkedin', name: 'LinkedIn Sales Navigator', price: 999, available: 1 },
    { id: 'suno', name: 'Suno Pro', price: 999, available: 1 },
  ]);
  assert.match(JSON.stringify(grid), /🔵 LinkedIn/);
  assert.match(JSON.stringify(grid), /🎵 Suno/);
});

test('delivery formatter includes credentials and keeps delivery in Telegram', () => {
  const text = formatTelegramDelivery({
    productName: 'Example product',
    credentials: {
      email: 'buyer@example.com',
      password: 'secret',
      twoFactor: 'ABC123',
    },
    instructions: 'Transfer the account after login.',
  });
  assert.match(text, /buyer@example.com/);
  assert.match(text, /Password: secret/);
  assert.match(text, /2FA Key: ABC123/);
  assert.match(text, /Transfer the account/);
});

test('main menu has the persistent Telegram storefront actions', () => {
  const menu = JSON.stringify(mainMenuMessage());
  assert.match(menu, /menu:products/);
  assert.match(menu, /menu:history/);
  assert.match(menu, /menu:profile/);
  assert.match(menu, /menu:support/);
});

test('language selector supports English, Urdu, Roman Urdu and Vietnamese', () => {
  const selector = JSON.stringify(languageMessage('en'));
  assert.match(selector, /language:en/);
  assert.match(selector, /language:ur/);
  assert.match(selector, /language:roman/);
  assert.match(selector, /language:vi/);
  assert.match(JSON.stringify(sasifyBotMenu([], 'vi')), /Tiếng Việt|Chào mừng/);
});

test('API products have a separate customer-facing section', () => {
  const menu = JSON.stringify(mainMenuMessage());
  assert.doesNotMatch(menu, /API products/);
  assert.doesNotMatch(menu, /API Link/);
  const categories = JSON.stringify(productCategoriesMessage([
    { id: 'api-1', name: 'ChatGPT API Access', price: 1999, available: 2 },
  ]));
  assert.match(categories, /category:api:0/);
  const apiProducts = productsMessage([
    { id: 'api-1', name: 'ChatGPT API Access', price: 1999, available: 2 },
    { id: 'normal-1', name: 'ChatGPT Plus', price: 4999, available: 2 },
  ], 0, 'api');
  assert.match(JSON.stringify(apiProducts), /ChatGPT API Access/);
  assert.doesNotMatch(JSON.stringify(apiProducts), /ChatGPT Plus/);
});

test('Telegram clearly separates Binance Pay from crypto deposits', () => {
  const crypto = paymentMethodMessage(
    {
      id: '12345678-1234-1234-1234-123456789012',
      amount: 5000,
      paymentAmount: 17.55,
      paymentCurrency: 'USDT',
      paymentReceiver: { title: 'USDT wallet · TRC20', number: 'TX-ADDRESS' },
    },
    null,
    'crypto',
  );
  assert.match(crypto.text, /Crypto USDT deposit/);
  assert.match(crypto.text, /USDT 17\.56 via BEP20/);
  assert.match(crypto.text, /net USDT 17\.55/);
  const paymentButtons = JSON.stringify(crypto.reply_markup);
  assert.match(paymentButtons, /Back to payment options/);
  assert.match(paymentButtons, /order:12345678-1234-1234-1234-123456789012/);
});

test('Telegram order screens provide safe navigation without changing payment actions', () => {
  const order = {
    id: '12345678-1234-1234-1234-123456789012',
    productName: 'Example product',
    amount: 5000,
  };
  const message = JSON.stringify(orderPaymentMessage(order));
  assert.match(message, /pay:12345678-1234-1234-1234-123456789012:binance/);
  assert.match(message, /Back to products/);
  assert.match(message, /menu:home/);
});

test('Telegram blocks only crypto below the USDT minimum while keeping Binance Pay available', () => {
  const low = JSON.stringify(orderPaymentMessage({
    id: 'low-order',
    productName: 'Small order',
    amount: 5.99,
    paymentCurrency: 'USDT',
    paymentAmount: 5.99,
  }));
  assert.match(low, /pay:low-order:binance/);
  assert.doesNotMatch(low, /pay:low-order:crypto/);
  assert.match(low, /Crypto USDT is unavailable/);
  assert.match(low, /Binance Pay remains available/);

  const eligible = JSON.stringify(orderPaymentMessage({
    id: 'eligible-order',
    productName: 'Eligible order',
    amount: 6,
    paymentCurrency: 'USDT',
    paymentAmount: 6,
  }));
  assert.match(eligible, /pay:eligible-order:binance/);
  assert.match(eligible, /pay:eligible-order:crypto/);
});
