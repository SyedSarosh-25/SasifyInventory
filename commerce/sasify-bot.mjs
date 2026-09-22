const siteOrigin = () =>
  String(process.env.NEXT_PUBLIC_SITE_ORIGIN || 'https://www.sasifysolutions.com').replace(/\/$/, '');

function telegramUrl(token, method) {
  return `https://api.telegram.org/bot${token}/${method}`;
}

async function telegramCall(token, method, payload) {
  const response = await fetch(telegramUrl(token, method), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Telegram API returned HTTP ${response.status}.`);
  const result = await response.json();
  if (!result.ok) throw new Error('Telegram API rejected the request.');
  return result;
}

function checkoutUrl(productId) {
  const normalized = productId === 'p093' ? 'p093-ultra' : productId;
  return `${siteOrigin()}/checkout?product=${encodeURIComponent(normalized)}`;
}

function productButton(product) {
  return [{
    text: `Buy · ${String(product.name || 'Product').slice(0, 34)}`,
    url: checkoutUrl(product.id),
  }];
}

export function sasifyBotConfigured(env = process.env) {
  return Boolean(
    String(env.SASIFY_BOT_TOKEN || '').trim() &&
      String(env.SASIFY_BOT_WEBHOOK_SECRET || '').trim(),
  );
}

export function sasifyBotMenu(products) {
  const popular = products
    .filter((product) => product.id !== 'p101' && Number(product.price || 0) > 0)
    .slice(0, 6);
  return {
    text:
      'Welcome to Sasify Solutions.\n\nBrowse digital tools and subscriptions, then complete your purchase through our secure website checkout.\n\nCredentials are never sent inside Telegram.',
    reply_markup: {
      inline_keyboard: [
        ...popular.map(productButton),
        [{ text: 'Browse full inventory', url: `${siteOrigin()}/inventory` }],
        [
          { text: 'Generate 2FA OTP', url: `${siteOrigin()}/otp` },
          { text: 'Request a tool', url: `${siteOrigin()}/request-tool` },
        ],
        [{ text: 'FAQ', url: `${siteOrigin()}/buying-guide` }],
        [{ text: 'Support', url: 'https://wa.me/923116185711' }],
      ],
    },
  };
}

export async function handleSasifyBotUpdate(update, products, env = process.env) {
  const token = String(env.SASIFY_BOT_TOKEN || '').trim();
  if (!token) throw new Error('SasifyBot is not configured.');
  const message = update?.message;
  const chatId = message?.chat?.id;
  if (chatId == null) return { ok: true, ignored: true };
  const command = String(message?.text || '').trim().toLowerCase().split(/\s+/)[0];
  const menu = sasifyBotMenu(products);
  if (['/start', '/catalog', '/products', '/help', ''].includes(command)) {
    await telegramCall(token, 'sendMessage', {
      chat_id: chatId,
      ...menu,
      disable_web_page_preview: true,
    });
    return { ok: true, handled: command || 'menu' };
  }
  await telegramCall(token, 'sendMessage', {
    chat_id: chatId,
    text: 'Use /start to browse Sasify Solutions, or choose a service from the menu below.',
    ...menu,
    disable_web_page_preview: true,
  });
  return { ok: true, handled: 'fallback' };
}

export { checkoutUrl };
