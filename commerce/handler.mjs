import pg from 'pg';
import { liveSupplierStock, cheapestLiveOffers } from './live-stock.mjs';
import {
  accountSchema,
  accountForRequest,
  requireAccount,
  accountAuth,
  creditDeposit,
  cancelDeposit,
  syncWalletDeposits,
  autoCreditWalletDepositForPayment,
  signupVerification,
  accountPasswordReset,
  adminAccountStats,
  applyForReseller,
  sendAccountEmail,
} from './accounts.mjs';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import {
  hash,
  same,
  encrypt,
  decrypt,
  totpCode,
  parseEmail,
  parseInventory,
  normalizeTransaction,
  paymentAmountMatchesOrder,
  receiptText,
} from './core.mjs';
import {
  parseBinanceCryptoEmail,
  parseBinanceEmail,
} from './binance-email.mjs';
import {
  createSupplierOrder,
  fetchSupplierBalance,
  fetchSupplierProducts,
  normalizeSupplierProduct,
  supplierDelivery,
  supplierOrderId,
} from './supplier.mjs';
import {
  createQamifyOrder,
  fetchQamifyBalance,
  fetchQamifyProducts,
  normalizeQamifyProduct,
  qamifyDelivery,
  qamifyOrderId,
} from './qamify.mjs';
import {
  createMkeOrder,
  fetchMkeBalance,
  fetchMkeProducts,
  mkeDelivery,
  mkeOrderId,
  normalizeMkeProduct,
} from './mke.mjs';
import {
  createPiggyAiOrder,
  fetchPiggyAiBalance,
  fetchPiggyAiProducts,
  normalizePiggyAiProduct,
  piggyAiDelivery,
  piggyAiOrderId,
} from './piggyai.mjs';
import {
  createZoomStoreOrder,
  fetchZoomStoreBalance,
  fetchZoomStoreProducts,
  normalizeZoomStoreProduct,
  zoomStoreDelivery,
  zoomStoreOrderId,
} from './zoomstore.mjs';
import {
  normalizeCustomerEmail,
  supplierRequiresCustomerEmail,
} from './supplier-capabilities.mjs';
import {
  createEliteToolsOrder,
  eliteToolsDelivery,
  eliteToolsOrderId,
  fetchEliteToolsBalance,
  fetchEliteToolsProducts,
  normalizeEliteToolsProduct,
} from './elite-tools.mjs';
import { authenticateInboundEmail } from './inbound-email.mjs';
import {
  normalizeScamReport,
  publicScamReport,
  publicScamReportSummary,
} from './scam-reports.mjs';
import { normalizeToolRequest } from './tool-requests.mjs';
import {
  customerProduct,
  customerProductName,
  customerProductText,
} from './product-display.mjs';
import {
  formatTelegramDelivery,
  handleSasifyBotUpdate,
  telegramCall,
} from './sasify-bot.mjs';
import {
  selectLowestSupplierOffers,
  supplierProductKey,
} from './supplier-matching.mjs';
import { DEFAULT_REVIEWS_URL, fetchGoogleReviews } from './google-reviews.mjs';
import catalog from './catalog.json' with { type: 'json' };

const fail = (status, message) => Object.assign(new Error(message), { status });
function escapeEmailHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
function campaignEmailHtml(text) {
  const paragraphs = escapeEmailHtml(text)
    .split(/\n\s*\n/)
    .map((paragraph) => `<p style="margin:0 0 16px;line-height:1.65;color:#334d74">${paragraph.replaceAll('\n', '<br>')}</p>`)
    .join('');
  return `<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px;color:#173b73"><div style="border:1px solid #d9e4f3;border-radius:16px;padding:24px;background:#f8fbff"><div style="font-size:12px;font-weight:800;letter-spacing:.12em;color:#285cff;text-transform:uppercase;margin-bottom:18px">Sasify Solutions</div>${paragraphs}</div><p style="font-size:12px;color:#718096;margin:18px 4px">You are receiving this update because you have a registered Sasify account. For help, contact support@sasifysolutions.com.</p></div>`;
}
const TELEGRAM_APPROVAL_REASONS = new Set(['verified_auto_delivery_failed']);
function errorDetail(error) {
  const code = String(
    error?.code ||
      (error?.status ? `http_${error.status}` : '') ||
      error?.name ||
      'delivery_failed',
  ).slice(0, 120);
  const message = String(
    error?.message || 'Automatic credential delivery failed',
  )
    .replace(/(?:bearer|basic)\s+\S+/gi, '[redacted]')
    .replace(
      /(?:token|password|secret|api[_-]?key)\s*[:=]\s*\S+/gi,
      '$1=[redacted]',
    )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
  return { code, message };
}
async function recordAutoDeliveryFailure(db, paymentId, error, stage) {
  const detail = errorDetail(error);
  await db.query(
    `UPDATE commerce_payments
     SET verification_reason='verified_auto_delivery_failed',
         fulfillment_error_code=$2,fulfillment_error_message=$3,
         fulfillment_error_stage=$4,fulfillment_error_at=now()
     WHERE id=$1`,
    [
      paymentId,
      detail.code,
      detail.message,
      String(stage || 'fulfillment').slice(0, 80),
    ],
  );
  await db.query(
    `INSERT INTO commerce_audit(action,object_id,details)
     VALUES('auto_delivery_failed',$1,$2::jsonb)`,
    [
      paymentId,
      JSON.stringify({ code: detail.code, message: detail.message, stage }),
    ],
  );
  return detail;
}
async function recordManualApprovalContext(db, paymentId, source) {
  await db.query(
    `UPDATE commerce_payments
     SET verification_reason_before_manual=COALESCE(verification_reason_before_manual,verification_reason),
         manual_approval_source=$2
     WHERE id=$1`,
    [paymentId, String(source || 'admin').slice(0, 40)],
  );
  await db.query(
    `INSERT INTO commerce_audit(action,object_id,details)
     VALUES('manual_payment_approval',$1,$2::jsonb)`,
    [paymentId, JSON.stringify({ source })],
  );
}
const TEAM_COUPON_CODE = 'HOR';
const TEAM_COUPON_ENABLED = false;
const CUSTOMER_COUPON_CODE = 'CUST';
const TEAM_COMMISSION_PKR = 50;
const SUPPLIER_MAX_FAILURES = 3;
const PROFIT_PASSWORD_HASH =
  process.env.COMMERCE_PROFIT_PASSWORD_HASH || hash(TEAM_COUPON_CODE);
const PAYMENT_WINDOWS_MINUTES = Object.freeze({
  wallet: 5,
  bank: 30,
  binance: 15,
  crypto: 30,
});
const POSTMARK_INBOUND_WINDOW_DAYS = 30;
const POSTMARK_INBOUND_LIMIT = Math.max(
  1,
  Number(process.env.POSTMARK_INBOUND_LIMIT || 100),
);
let postmarkInboundUsageCache = { expiresAt: 0, value: null };

async function postmarkInboundUsage() {
  const now = Date.now();
  if (postmarkInboundUsageCache.expiresAt > now && postmarkInboundUsageCache.value)
    return postmarkInboundUsageCache.value;

  const token = String(process.env.POSTMARK_SERVER_TOKEN || '').trim();
  if (!token)
    return {
      available: false,
      reason: 'not_configured',
      limit: POSTMARK_INBOUND_LIMIT,
      windowDays: POSTMARK_INBOUND_WINDOW_DAYS,
    };

  const to = new Date();
  const from = new Date(
    now - POSTMARK_INBOUND_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );
  const url = new URL('https://api.postmarkapp.com/messages/inbound');
  url.searchParams.set('count', '1');
  url.searchParams.set('offset', '0');
  url.searchParams.set('status', 'processed');
  url.searchParams.set('fromdate', from.toISOString());
  url.searchParams.set('todate', to.toISOString());

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'X-Postmark-Server-Token': token,
      },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Postmark responded with ${response.status}`);
    const payload = await response.json();
    const used = Math.max(0, Number(payload?.TotalCount || 0));
    const value = {
      available: true,
      used,
      limit: POSTMARK_INBOUND_LIMIT,
      remaining: Math.max(0, POSTMARK_INBOUND_LIMIT - used),
      percentage: Math.min(100, (used / POSTMARK_INBOUND_LIMIT) * 100),
      windowDays: POSTMARK_INBOUND_WINDOW_DAYS,
      updatedAt: new Date().toISOString(),
    };
    postmarkInboundUsageCache = { expiresAt: now + 15_000, value };
    return value;
  } catch (error) {
    console.error('postmark-inbound-usage-error', error?.message || error);
    return {
      available: false,
      reason: 'temporarily_unavailable',
      limit: POSTMARK_INBOUND_LIMIT,
      windowDays: POSTMARK_INBOUND_WINDOW_DAYS,
    };
  }
}

const PAYMENT_VERIFICATION_GRACE_SECONDS = 90;
const PAYMENT_CLAIM_IP_ALLOWLIST = new Set(
  String(process.env.PAYMENT_CLAIM_IP_ALLOWLIST || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);
const clientIp = (req) =>
  String(
    req.headers['x-vercel-forwarded-for'] ||
      req.headers['x-forwarded-for'] ||
      req.socket?.remoteAddress ||
      'unknown',
  )
    .split(',')[0]
    .trim()
    .slice(0, 128) || 'unknown';
function paymentMethod(value) {
  const method = String(value || 'wallet')
    .trim()
    .toLowerCase();
  if (!Object.hasOwn(PAYMENT_WINDOWS_MINUTES, method))
    throw fail(
      400,
      'Select wallet payment, bank transfer, Binance Pay, or crypto USDT.',
    );
  return method;
}
function paymentMatchesOrder(payment, order) {
  const orderCurrency = String(order?.payment_currency || 'PKR').toUpperCase();
  const paymentCurrency = String(payment?.currency || 'PKR').toUpperCase();
  if (orderCurrency === 'USDT' || paymentCurrency === 'USDT') {
    const paid = Number(payment?.payment_amount);
    const required = Number(order?.payment_amount);
    const routeMatches =
      !payment?.receiver_id || payment.receiver_id === order?.payment_method;
    return (
      orderCurrency === 'USDT' &&
      paymentCurrency === 'USDT' &&
      routeMatches &&
      Number.isFinite(paid) &&
      Number.isFinite(required) &&
      paid === required
    );
  }
  return paymentAmountMatchesOrder(payment?.amount, order?.amount);
}
function binanceUsdtPkrRate() {
  const rate = Number(process.env.BINANCE_USDT_PKR_RATE || '');
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}
const MIN_BINANCE_USDT = 6;
function binanceReceiver() {
  const id = String(process.env.BINANCE_RECEIVER_ID || '').trim();
  if (!id) return null;
  return {
    title: String(process.env.BINANCE_RECEIVER_TITLE || 'Binance Pay').trim(),
    number: id,
    provider: 'Binance',
  };
}
function cryptoReceiver() {
  const id = String(process.env.CRYPTO_RECEIVER_ID || '').trim();
  if (!id) return null;
  const network = String(process.env.CRYPTO_USDT_NETWORK || '').trim();
  return {
    title: [
      String(process.env.CRYPTO_RECEIVER_TITLE || 'USDT wallet').trim(),
      network,
    ]
      .filter(Boolean)
      .join(' · '),
    number: id,
    provider: network ? `Crypto · ${network}` : 'Crypto',
  };
}
function paymentQuote(method, amountPkr) {
  if (!['binance', 'crypto'].includes(method))
    return { currency: 'PKR', amount: Number(amountPkr) };
  const rate = binanceUsdtPkrRate();
  if (!rate || (method === 'binance' ? !binanceReceiver() : !cryptoReceiver()))
    throw fail(
      503,
      `${method === 'crypto' ? 'Crypto' : 'Binance Pay'} payments are not configured yet.`,
    );
  return {
    currency: 'USDT',
    amount: Math.ceil((Number(amountPkr) / rate) * 100) / 100,
    rate,
  };
}
function paymentReceiverForMethod(method, fallback) {
  if (method === 'binance') return binanceReceiver();
  if (method === 'crypto') return cryptoReceiver();
  return fallback;
}
const SUPPLIER_API_ENV = Object.freeze({
  dodi: 'DODI_RESELLER_API_KEY',
  qamify: 'QAMIFY_API_KEY',
  mke: 'MKE_API_KEY',
  fatbunny: 'FATBUNNY_API_KEY',
  piggyai: 'PIGGYAI_API_KEY',
  zoomstore: 'ZOOMSTORE_API_KEY',
  elitetools: 'ELITE_TOOLS_API_KEY',
});
const SUPPLIER_PROVIDER_NAMES = Object.freeze({
  dodi: 'DODI Store',
  qamify: 'Qamify',
  mke: 'MKE Shop',
  fatbunny: 'Fat Bunny Hub',
  piggyai: 'PiggyAi',
  zoomstore: 'Zoom Store',
  elitetools: 'Elite Tools Store',
});
const bearer = (req) =>
  String(req.headers.authorization || '').replace(/^Bearer /, '');
const adminCookie = (req) =>
  String(req.headers.cookie || '').match(
    /(?:^|;\s*)sasify_admin=([^;]+)/,
  )?.[1] || '';
const teamCookie = (req) =>
  String(req.headers.cookie || '').match(
    /(?:^|;\s*)sasify_team=([^;]+)/,
  )?.[1] || '';
const checkoutCookie = (req) =>
  String(req.headers.cookie || '').match(
    /(?:^|;\s*)sasify_checkout=([a-f0-9]{64})(?:;|$)/i,
  )?.[1] || '';
const idOk = (value) => /^[a-f0-9-]{36}$/i.test(String(value || ''));
const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};
function inboundAuthPrefixes(provider = 'nayapay') {
  if (provider === 'auto') return ['BINANCE', 'NAYAPAY'];
  // The shared Postmark inbound stream can deliver both rails. Keep the
  // existing NayaPay webhook credential as a compatibility fallback until a
  // separate Binance credential is deliberately configured.
  return provider === 'binance' ? ['BINANCE', 'NAYAPAY'] : ['NAYAPAY'];
}
function inboundEmailAuthConfigured(provider = 'nayapay') {
  return inboundAuthPrefixes(provider).some(
    (prefix) =>
      !!String(process.env[prefix + '_INBOUND_TOKEN'] || '').trim() ||
      (!!String(process.env[prefix + '_INBOUND_BASIC_USER'] || '').trim() &&
        !!String(process.env[prefix + '_INBOUND_BASIC_PASSWORD'] || '')),
  );
}
function inboundEmailAuthorized(req, provider = 'nayapay') {
  const providedToken = String(
    req.headers['x-nayapay-inbound-token'] ||
      req.headers['x-inbound-webhook-token'] ||
      req.headers['x-postmark-server-token'] ||
      '',
  ).trim();
  const authorization = String(req.headers.authorization || '');
  return inboundAuthPrefixes(provider).some((prefix) => {
    const token = String(process.env[prefix + '_INBOUND_TOKEN'] || '').trim();
    if (token && same(providedToken, token)) return true;
    const username = String(
      process.env[prefix + '_INBOUND_BASIC_USER'] || '',
    ).trim();
    const password = String(
      process.env[prefix + '_INBOUND_BASIC_PASSWORD'] || '',
    );
    const expected =
      username && password
        ? `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
        : '';
    return !!expected && same(authorization, expected);
  });
}
const supplierUsdtRate = () => {
  const rate = Number(process.env.SUPPLIER_USDT_PKR_RATE || 285);
  return Number.isFinite(rate) && rate > 0 ? rate : 285;
};
const supplierUsdRate = () => {
  const rate = Number(
    process.env.QAMIFY_USD_PKR_RATE ||
      process.env.SUPPLIER_USD_PKR_RATE ||
      process.env.SUPPLIER_USDT_PKR_RATE ||
      0,
  );
  return Number.isFinite(rate) && rate > 0 ? rate : null;
};
function supplierBalanceThreshold(currency) {
  const normalized = String(currency || '').toUpperCase();
  const envName =
    normalized === 'PKR'
      ? 'SUPPLIER_LOW_BALANCE_PKR'
      : normalized === 'USD'
        ? 'SUPPLIER_LOW_BALANCE_USD'
        : 'SUPPLIER_LOW_BALANCE_USDT';
  const fallback = normalized === 'PKR' ? 5000 : 5;
  const configured = Number(process.env[envName]);
  return Number.isFinite(configured) && configured >= 0 ? configured : fallback;
}
function supplierBalanceIsLow(balance, currency) {
  const amount = Number(balance);
  return (
    Number.isFinite(amount) && amount <= supplierBalanceThreshold(currency)
  );
}
function localProductSellingPrice(productId) {
  const price = Number(
    catalog.find((product) => product.id === productId)?.price,
  );
  return Number.isSafeInteger(price) && price > 0 ? price : 0;
}
const SHARED_CHATGPT_PRODUCT_ID = 'p093-shared';
const SHARED_CHATGPT_MAX_SLOTS = 4;
function isSharedChatGptProduct(productId) {
  return String(productId || '') === SHARED_CHATGPT_PRODUCT_ID;
}
function sharedSlotCost(purchaseCost, slot) {
  const cost = Math.max(0, Number(purchaseCost) || 0);
  const base = Math.floor(cost / SHARED_CHATGPT_MAX_SLOTS);
  return Number(slot) >= SHARED_CHATGPT_MAX_SLOTS
    ? cost - base * (SHARED_CHATGPT_MAX_SLOTS - 1)
    : base;
}
function summarizeProfit(deliveredRows, withdrawnRows, now = new Date()) {
  const dayKey = (date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(date));
  const today = dayKey(now);
  const daily = Array.from({ length: 30 }, (_, index) => ({
    date: new Date(
      new Date(`${today}T12:00:00Z`).getTime() - (29 - index) * 86400000,
    )
      .toISOString()
      .slice(0, 10),
    revenue: 0,
    profit: 0,
    missingCosts: 0,
  }));
  const dailyByDate = new Map(daily.map((row) => [row.date, row]));
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const summary = {
    income: 0,
    gross_income: 0,
    coupon_discounts: 0,
    hor_profit_credit: 0,
    cost: 0,
    profit: 0,
    monthly_income: 0,
    monthly_profit: 0,
    delivered_orders: deliveredRows.length,
    admin_withdrawals: withdrawnRows.length,
    active_orders: 0,
    missing_costs: 0,
  };
  const breakdown = {
    local: {
      income: 0,
      gross_income: 0,
      coupon_discounts: 0,
      hor_profit_credit: 0,
      cost: 0,
      profit: 0,
      orders: 0,
    },
    supplier: {
      income: 0,
      gross_income: 0,
      coupon_discounts: 0,
      hor_profit_credit: 0,
      cost: 0,
      profit: 0,
      orders: 0,
    },
  };
  const add = (row, income, cost, source, date, financials = {}) => {
    const safeIncome = Number.isFinite(Number(income)) ? Number(income) : 0;
    const netIncome = Number.isFinite(Number(financials.netIncome))
      ? Number(financials.netIncome)
      : safeIncome;
    const grossIncome = Number.isFinite(Number(financials.grossIncome))
      ? Number(financials.grossIncome)
      : netIncome;
    const couponDiscount = Number.isFinite(Number(financials.couponDiscount))
      ? Number(financials.couponDiscount)
      : 0;
    const horProfitCredit = Number.isFinite(Number(financials.horProfitCredit))
      ? Number(financials.horProfitCredit)
      : 0;
    const safeCost = Number.isFinite(Number(cost)) ? Number(cost) : 0;
    const profit = safeIncome - safeCost;
    if (date && Number.isFinite(new Date(date).getTime())) {
      const day = dailyByDate.get(dayKey(date));
      if (day) {
        day.revenue += netIncome;
        day.profit += profit;
        if (safeCost === 0) day.missingCosts++;
      }
    }
    summary.income += netIncome;
    summary.gross_income += grossIncome;
    summary.coupon_discounts += couponDiscount;
    summary.hor_profit_credit += horProfitCredit;
    summary.cost += safeCost;
    summary.profit += profit;
    if (safeCost === 0) summary.missing_costs++;
    const bucket = breakdown[source] || breakdown.local;
    bucket.income += netIncome;
    bucket.gross_income += grossIncome;
    bucket.coupon_discounts += couponDiscount;
    bucket.hor_profit_credit += horProfitCredit;
    bucket.cost += safeCost;
    bucket.profit += profit;
    bucket.orders++;
    if (date && new Date(date) >= monthStart) {
      summary.monthly_income += netIncome;
      summary.monthly_profit += profit;
    }
  };
  for (const row of deliveredRows) {
    const isTeamCoupon =
      String(row.code_display || '').toUpperCase() === TEAM_COUPON_CODE;
    const netIncome = Number(row.amount || 0);
    const recordedCouponDiscount = Number(row.coupon_discount || 0);
    // HOR is an internal team-sales/commission rule, not a customer discount.
    // Older HOR orders may still contain a historical coupon_discount value;
    // keep that value as HOR credit for the profit view, but never include it
    // in the customer discount totals.
    const couponDiscount = isTeamCoupon ? 0 : recordedCouponDiscount;
    const income = netIncome + (isTeamCoupon ? recordedCouponDiscount : 0);
    const cost = row.shared_account_id
      ? (row.fulfillment_cost_pkr ??
        sharedSlotCost(row.purchase_cost, row.shared_slot))
      : (row.purchase_cost ?? row.supplier_cost_pkr ?? 0);
    add(
      row,
      income,
      cost,
      row.supplier_product_id ? 'supplier' : 'local',
      row.delivered_at,
      {
        netIncome,
        grossIncome: netIncome + recordedCouponDiscount,
        couponDiscount,
        horProfitCredit: isTeamCoupon ? recordedCouponDiscount : 0,
      },
    );
  }
  for (const row of withdrawnRows)
    add(
      row,
      localProductSellingPrice(row.product_id),
      row.purchase_cost,
      'local',
      row.created_at,
    );
  for (const key of Object.keys(summary)) {
    if (
      key === 'active_orders' ||
      key === 'delivered_orders' ||
      key === 'admin_withdrawals' ||
      key === 'missing_costs'
    )
      continue;
    summary[key] = Math.round(summary[key]);
  }
  for (const bucket of Object.values(breakdown)) {
    for (const key of [
      'income',
      'gross_income',
      'coupon_discounts',
      'hor_profit_credit',
      'cost',
      'profit',
    ])
      bucket[key] = Math.round(bucket[key]);
  }
  return {
    metrics: summary,
    breakdown,
    daily: daily.map((day) => ({
      ...day,
      revenue: Math.round(day.revenue),
      profit: Math.round(day.profit),
    })),
  };
}
function summarizeCommissions(rows) {
  const summary = {
    [TEAM_COUPON_CODE]: {
      code: TEAM_COUPON_CODE,
      sales: 0,
      total: 0,
      rate: 0,
      perSale: TEAM_COMMISSION_PKR,
    },
    [CUSTOMER_COUPON_CODE]: {
      code: CUSTOMER_COUPON_CODE,
      sales: 0,
      total: 0,
      rate: 10,
      perSale: 0,
    },
  };
  for (const row of rows) {
    const code = String(row.commission_code || '').toUpperCase();
    if (!summary[code]) continue;
    summary[code].sales += 1;
    summary[code].total += Number(row.commission_amount || 0);
    if (code === CUSTOMER_COUPON_CODE)
      summary[code].rate = Number(row.commission_rate || 10);
  }
  for (const item of Object.values(summary)) {
    item.sales = Math.round(item.sales);
    item.total = Math.round(item.total);
    item.rate = Number(item.rate || 0);
    item.perSale = Math.round(item.perSale || 0);
  }
  return Object.values(summary);
}
async function telegramRequest(method, payload) {
  const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!token) return false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/${method}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      },
    );
    if (!response.ok)
      console.error('telegram-notification-error', response.status);
    return response.ok;
  } catch (error) {
    console.error(
      'telegram-notification-error',
      error.name || 'request_failed',
    );
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
async function notifyTelegram(message) {
  const chatId = String(process.env.TELEGRAM_CHAT_ID || '').trim();
  if (!chatId || !message) return false;
  const payload = typeof message === 'string' ? { text: message } : message;
  return telegramRequest('sendMessage', {
    chat_id: chatId,
    disable_web_page_preview: true,
    ...payload,
  });
}
async function notifyPublicTelegram(chatId, message) {
  const token = String(process.env.SASIFY_BOT_TOKEN || '').trim();
  const id = String(chatId || '').trim();
  if (!token || !id || !message) return false;
  try {
    await telegramCall(token, 'sendMessage', {
      chat_id: id,
      text: message,
      disable_web_page_preview: true,
    });
    return true;
  } catch (error) {
    console.error(
      'public-telegram-delivery-error',
      error.name || 'request_failed',
    );
    return false;
  }
}
function telegramWebhookAuthorized(req) {
  const secret = String(process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();
  return (
    !!secret &&
    same(
      String(req.headers['x-telegram-bot-api-secret-token'] || '').trim(),
      secret,
    )
  );
}
function publicTelegramWebhookAuthorized(req) {
  const secret = String(process.env.SASIFY_BOT_WEBHOOK_SECRET || '').trim();
  return (
    !!secret &&
    same(
      String(req.headers['x-telegram-bot-api-secret-token'] || '').trim(),
      secret,
    )
  );
}
function telegramChatAllowed(chatId) {
  const configured = String(process.env.TELEGRAM_CHAT_ID || '').trim();
  return !!configured && same(String(chatId || '').trim(), configured);
}
function telegramOrderMessage({
  orderId,
  productName,
  amount,
  paymentMethod,
  status = 'pending payment',
  transactionId = '',
  paymentState = '',
  autoDelivered = false,
  approvalAvailable = false,
}) {
  const lines = [
    'New Sasify order',
    `Order: ${String(orderId || '').slice(0, 8)}`,
    `Product: ${String(productName || 'Unknown product').slice(0, 120)}`,
    `Amount: PKR ${Number(amount || 0).toLocaleString()}`,
    `Payment method: ${String(paymentMethod || 'wallet')}`,
    `Status: ${status}`,
  ];
  if (transactionId)
    lines.push(`Transaction: ${String(transactionId).slice(0, 80)}`);
  if (paymentState)
    lines.push(`Payment evidence: ${String(paymentState).slice(0, 120)}`);
  lines.push(
    '',
    approvalAvailable
      ? 'The authenticated receipt could not be fulfilled automatically. Approve only after confirming the receipt and order.'
      : autoDelivered
        ? 'Payment was verified automatically and credentials were delivered. Telegram was not required.'
        : 'No action is needed yet. Waiting for the authenticated payment receipt.',
  );
  return lines.join('\n');
}
function telegramApprovalKeyboard(orderId) {
  return {
    inline_keyboard: [
      [
        { text: 'Approve and deliver', callback_data: `approve:${orderId}` },
        { text: 'Reject', callback_data: `reject:${orderId}` },
      ],
    ],
  };
}
function telegramPaymentReviewMessage({
  amount,
  transactionId,
  reason,
  orderId = '',
}) {
  return [
    'Payment needs manual review',
    orderId ? `Order: ${String(orderId).slice(0, 8)}` : null,
    `Amount: PKR ${Number(amount || 0).toLocaleString()}`,
    `Transaction: ${String(transactionId || 'not captured').slice(0, 80)}`,
    `Reason: ${String(reason || 'no eligible order').replaceAll('_', ' ')}`,
    '',
    'The receipt was authenticated, but it was not assigned to exactly one active order. Review it in the admin payments panel.',
  ]
    .filter(Boolean)
    .join('\n');
}
function telegramCallbackResponse(update) {
  const callback = update?.callback_query;
  const chatId = callback?.message?.chat?.id;
  if (!callback?.id || !telegramChatAllowed(chatId)) return null;
  const data = String(callback.data || '').match(
    /^(approve|reject):([a-f0-9-]{36})$/i,
  );
  return data
    ? { callback, action: data[1].toLowerCase(), orderId: data[2] }
    : null;
}
function supplierIssueMessage(log) {
  if (!log) return '';
  const status = log.responseStatus
    ? `HTTP ${log.responseStatus}`
    : 'No HTTP response';
  const detail = String(log.errorMessage || '')
    .trim()
    .slice(0, 500);
  return `Supplier issue\nProvider: ${String(log.providerId || 'unknown').toUpperCase()}\nOperation: ${log.operation || 'purchase'}\nOrder: ${String(log.orderId || '').slice(0, 8) || 'unknown'}\nStatus: ${status}${detail ? `\nDetails: ${detail}` : ''}`;
}
function normalizeCouponCode(value) {
  const code = String(value || '')
    .trim()
    .toUpperCase();
  if (code && !/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code))
    throw fail(
      400,
      'Coupon code must be 3-32 letters, numbers, hyphens or underscores.',
    );
  return code;
}
function couponDiscount(price, percent) {
  const original = Number(price);
  return Math.min(
    Math.max(0, original - Math.round(original * (1 - Number(percent) / 100))),
    original,
  );
}
const UNIQUE_PAYMENT_OFFSET_LIMIT = 9;
async function allocatePaymentAmount(db, listedAmount) {
  if (!Number.isSafeInteger(listedAmount) || listedAmount <= 0)
    return listedAmount;
  // Serialize allocation so two concurrent checkouts cannot receive the same
  // whole-rupee amount, even when they are for different products.
  await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
    'commerce-payment-amount-allocation',
  ]);
  const used = new Set(
    (
      await db.query(`
        SELECT amount FROM commerce_orders
        WHERE status IN ('pending','review') AND amount>0 AND expires_at>now()
        UNION ALL
        SELECT amount FROM commerce_payments
        WHERE order_id IS NULL AND amount>0
          AND COALESCE(received_at,created_at)>now()-interval '10 minutes'`)
    ).rows.map((row) => Number(row.amount)),
  );
  if (!used.has(listedAmount)) return listedAmount;
  const available = [];
  for (
    let offset = 1;
    offset <= UNIQUE_PAYMENT_OFFSET_LIMIT && listedAmount - offset > 0;
    offset++
  ) {
    const candidate = listedAmount - offset;
    if (!used.has(candidate)) available.push(candidate);
  }
  if (!available.length)
    throw fail(
      409,
      'This payment amount is temporarily busy. Please retry checkout in a few seconds.',
    );
  return available[randomBytes(4).readUInt32BE(0) % available.length];
}
async function releaseCoupon(db, order) {
  if (!order?.coupon_id || order.coupon_usage_released) return;
  await db.query(
    'UPDATE commerce_coupons SET used_count=GREATEST(0,used_count-1),updated_at=now() WHERE id=$1',
    [order.coupon_id],
  );
  await db.query(
    'UPDATE commerce_orders SET coupon_usage_released=true WHERE id=$1',
    [order.id],
  );
}
async function reserveReleasedCoupon(db, order) {
  if (!order?.coupon_id || !order.coupon_usage_released) return;
  const reserved = await db.query(
    'UPDATE commerce_coupons SET used_count=used_count+1,updated_at=now() WHERE id=$1 AND (unlimited=true OR used_count<max_uses) RETURNING id',
    [order.coupon_id],
  );
  if (!reserved.rowCount)
    throw fail(
      409,
      'This coupon has reached its usage limit. Review the payment manually without the coupon or contact support.',
    );
  await db.query(
    'UPDATE commerce_orders SET coupon_usage_released=false WHERE id=$1',
    [order.id],
  );
}
let couponSchemaReady;
async function ensureCouponSchema(db) {
  if (!couponSchemaReady) {
    couponSchemaReady = (async () => {
      await db.query(`CREATE TABLE IF NOT EXISTS commerce_coupons (
        id uuid PRIMARY KEY, code_hash text NOT NULL UNIQUE, code_display text NOT NULL,
        discount_percent numeric(5,2) NOT NULL DEFAULT 5 CHECK(discount_percent>=0 AND discount_percent<=100),
        commission_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK(commission_percent>=0 AND commission_percent<=100),
        max_uses integer NOT NULL DEFAULT 10 CHECK(max_uses>0), used_count integer NOT NULL DEFAULT 0 CHECK(used_count>=0),
        enabled boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      )`);
      await db.query(
        'ALTER TABLE commerce_coupons ADD COLUMN IF NOT EXISTS id uuid',
      );
      await db.query(
        'ALTER TABLE commerce_coupons ADD COLUMN IF NOT EXISTS code_hash text',
      );
      await db.query(
        'ALTER TABLE commerce_coupons ADD COLUMN IF NOT EXISTS code_display text',
      );
      await db.query(
        "ALTER TABLE commerce_coupons ADD COLUMN IF NOT EXISTS product_id text DEFAULT 'p093'",
      );
      await db.query(
        'ALTER TABLE commerce_coupons ADD COLUMN IF NOT EXISTS discount numeric(5,2) DEFAULT 5',
      );
      await db.query(
        'ALTER TABLE commerce_coupons ADD COLUMN IF NOT EXISTS discount_percent numeric(5,2)',
      );
      await db.query(
        'ALTER TABLE commerce_coupons ADD COLUMN IF NOT EXISTS commission_percent numeric(5,2) NOT NULL DEFAULT 0',
      );
      await db.query(
        'ALTER TABLE commerce_coupons ADD COLUMN IF NOT EXISTS max_uses integer',
      );
      await db.query(
        'ALTER TABLE commerce_coupons ADD COLUMN IF NOT EXISTS used_count integer',
      );
      await db.query(
        'ALTER TABLE commerce_coupons ADD COLUMN IF NOT EXISTS enabled boolean',
      );
      await db.query(
        'ALTER TABLE commerce_coupons ADD COLUMN IF NOT EXISTS unlimited boolean NOT NULL DEFAULT false',
      );
      await db.query(
        'ALTER TABLE commerce_coupons ADD COLUMN IF NOT EXISTS created_at timestamptz',
      );
      await db.query(
        'ALTER TABLE commerce_coupons ADD COLUMN IF NOT EXISTS updated_at timestamptz',
      );
      await db.query(
        'UPDATE commerce_coupons SET id=md5(coalesce(code_hash,code_display,clock_timestamp()::text))::uuid WHERE id IS NULL',
      );
      await db.query(
        'UPDATE commerce_coupons SET discount_percent=5 WHERE discount_percent IS NULL',
      );
      await db.query(
        'UPDATE commerce_coupons SET max_uses=10 WHERE max_uses IS NULL OR max_uses<1',
      );
      await db.query(
        'UPDATE commerce_coupons SET used_count=0 WHERE used_count IS NULL OR used_count<0',
      );
      await db.query(
        'UPDATE commerce_coupons SET enabled=true WHERE enabled IS NULL',
      );
      await db.query(
        "UPDATE commerce_coupons SET product_id='p093' WHERE product_id IS NULL OR product_id=''",
      );
      await db.query(
        'UPDATE commerce_coupons SET discount=5 WHERE discount IS NULL',
      );
      await db.query(
        'UPDATE commerce_coupons SET created_at=now() WHERE created_at IS NULL',
      );
      await db.query(
        'UPDATE commerce_coupons SET updated_at=now() WHERE updated_at IS NULL',
      );
      await db.query(
        'ALTER TABLE commerce_coupons DROP CONSTRAINT IF EXISTS commerce_coupons_discount_percent_check',
      );
      await db.query(
        'ALTER TABLE commerce_coupons ADD CONSTRAINT commerce_coupons_discount_percent_check CHECK(discount_percent>=0 AND discount_percent<=100)',
      );
      await db.query(
        'ALTER TABLE commerce_coupons DROP CONSTRAINT IF EXISTS commerce_coupons_discount_check',
      );
      await db.query(
        'ALTER TABLE commerce_coupons ADD CONSTRAINT commerce_coupons_discount_check CHECK(discount>=0 AND discount<=100)',
      );
      await db.query(
        'ALTER TABLE commerce_coupons DROP CONSTRAINT IF EXISTS commerce_coupons_commission_percent_check',
      );
      await db.query(
        'ALTER TABLE commerce_coupons ADD CONSTRAINT commerce_coupons_commission_percent_check CHECK(commission_percent>=0 AND commission_percent<=100)',
      );
      await db.query(
        'ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS coupon_id uuid',
      );
      await db.query(
        'ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS coupon_discount integer NOT NULL DEFAULT 0 CHECK(coupon_discount>=0)',
      );
      await db.query(
        'ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS coupon_usage_released boolean NOT NULL DEFAULT false',
      );
      await db.query(
        'ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS payment_submitted_at timestamptz',
      );
      await db.query(
        'ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS ip_address text',
      );
      await db.query(`CREATE TABLE IF NOT EXISTS commerce_payment_claim_attempts (
        ip_hash text PRIMARY KEY, ip_address text NOT NULL, attempts integer NOT NULL DEFAULT 0,
        last_attempt_at timestamptz NOT NULL DEFAULT now()
      )`);
      await db.query(
        'ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS listed_amount integer',
      );
      await db.query(
        'ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS commission_code text',
      );
      await db.query(
        'ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2) NOT NULL DEFAULT 0',
      );
      await db.query(
        'ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS commission_amount integer NOT NULL DEFAULT 0',
      );
      await db.query(
        'UPDATE commerce_orders SET listed_amount=amount WHERE listed_amount IS NULL OR (listed_amount=0 AND amount>0)',
      );
      await db.query(
        'ALTER TABLE commerce_orders ALTER COLUMN listed_amount SET DEFAULT 0',
      );
      await db.query(
        'ALTER TABLE commerce_orders ALTER COLUMN listed_amount SET NOT NULL',
      );
      await db.query(
        'ALTER TABLE commerce_orders DROP CONSTRAINT IF EXISTS commerce_orders_listed_amount_check',
      );
      await db.query(
        'ALTER TABLE commerce_orders ADD CONSTRAINT commerce_orders_listed_amount_check CHECK(listed_amount>=0)',
      );
      await db.query(
        'ALTER TABLE commerce_orders DROP CONSTRAINT IF EXISTS commerce_orders_amount_check',
      );
      await db.query(
        'ALTER TABLE commerce_orders ADD CONSTRAINT commerce_orders_amount_check CHECK(amount>=0)',
      );
      await db.query(
        'ALTER TABLE commerce_orders DROP CONSTRAINT IF EXISTS commerce_orders_commission_rate_check',
      );
      await db.query(
        'ALTER TABLE commerce_orders ADD CONSTRAINT commerce_orders_commission_rate_check CHECK(commission_rate>=0 AND commission_rate<=100)',
      );
      await db.query(
        'ALTER TABLE commerce_orders DROP CONSTRAINT IF EXISTS commerce_orders_commission_amount_check',
      );
      await db.query(
        'ALTER TABLE commerce_orders ADD CONSTRAINT commerce_orders_commission_amount_check CHECK(commission_amount>=0)',
      );
      await db.query(
        `UPDATE commerce_orders SET commission_code='HOR',commission_rate=0,commission_amount=${TEAM_COMMISSION_PKR}
         WHERE status='delivered' AND COALESCE(commission_amount,0)=0
           AND coupon_id IN (SELECT id FROM commerce_coupons WHERE code_display=$1)`,
        [TEAM_COUPON_CODE],
      );
    })().catch((error) => {
      couponSchemaReady = null;
      throw error;
    });
  }
  await couponSchemaReady;
}
async function ensureDefaultCoupon(db) {
  const teamCodeHash = hash(TEAM_COUPON_CODE);
  await db.query(
    `UPDATE commerce_coupons SET discount=100,discount_percent=100,commission_percent=0,enabled=${TEAM_COUPON_ENABLED},unlimited=true,updated_at=now()
        WHERE code_hash=$1 AND product_id='p093'`,
    [teamCodeHash],
  );
  await db.query(
    `INSERT INTO commerce_coupons(id,code_hash,code_display,product_id,discount,discount_percent,commission_percent,max_uses,used_count,enabled,unlimited,created_at,updated_at)
      VALUES($1,$2,'HOR','p093',100,100,0,10,0,${TEAM_COUPON_ENABLED},true,now(),now()) ON CONFLICT DO NOTHING`,
    [randomUUID(), teamCodeHash],
  );
  const customerCodeHash = hash(CUSTOMER_COUPON_CODE);
  await db.query(
    `UPDATE commerce_coupons SET discount=0,discount_percent=0,commission_percent=10,enabled=true,unlimited=true,updated_at=now()
        WHERE code_hash=$1 AND product_id='p093'`,
    [customerCodeHash],
  );
  await db.query(
    `INSERT INTO commerce_coupons(id,code_hash,code_display,product_id,discount,discount_percent,commission_percent,max_uses,used_count,enabled,unlimited,created_at,updated_at)
      VALUES($1,$2,'CUST','p093',0,0,10,10,0,true,true,now(),now()) ON CONFLICT DO NOTHING`,
    [randomUUID(), customerCodeHash],
  );
}
let orderFinanceSchemaReady;
async function ensureOrderFinanceSchema(db) {
  if (!orderFinanceSchemaReady) {
    orderFinanceSchemaReady = (async () => {
      await db.query(
        'ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS customer_email text',
      );
      await db.query(
        'ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS fulfillment_cost_pkr integer CHECK(fulfillment_cost_pkr>=0)',
      );
      await db.query(
        `UPDATE commerce_orders o
         SET fulfillment_cost_pkr = CASE
           WHEN o.supplier_product_id IS NOT NULL THEN o.supplier_cost_pkr
           ELSE i.purchase_cost
         END
         FROM commerce_inventory i
         WHERE o.inventory_id=i.id
           AND o.status='delivered'
           AND o.fulfillment_cost_pkr IS NULL`,
      );
      await db.query(
        `UPDATE commerce_orders
         SET fulfillment_cost_pkr = COALESCE(supplier_cost_pkr, 0)
         WHERE status='delivered'
           AND fulfillment_cost_pkr IS NULL
           AND supplier_product_id IS NOT NULL`,
      );
    })().catch((error) => {
      orderFinanceSchemaReady = null;
      throw error;
    });
  }
  await orderFinanceSchemaReady;
}
let paymentWorkflowSchemaReady;
async function ensurePaymentWorkflowSchema(db) {
  if (!paymentWorkflowSchemaReady) {
    paymentWorkflowSchemaReady = (async () => {
      await db.query(
        "ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'wallet'",
      );
      await db.query(
        'ALTER TABLE commerce_orders DROP CONSTRAINT IF EXISTS commerce_orders_payment_method_check',
      );
      await db.query(
        "ALTER TABLE commerce_orders ADD CONSTRAINT commerce_orders_payment_method_check CHECK(payment_method IN ('wallet','bank','binance','crypto'))",
      );
      await db.query(
        "ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS payment_currency text NOT NULL DEFAULT 'PKR'",
      );
      await db.query(
        'ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS payment_amount numeric(20,8) NOT NULL DEFAULT 0',
      );
      await db.query(
        'UPDATE commerce_orders SET payment_amount=amount WHERE payment_amount=0 AND amount>0',
      );
      await db.query(
        'ALTER TABLE commerce_orders DROP CONSTRAINT IF EXISTS commerce_orders_payment_currency_check',
      );
      await db.query(
        "ALTER TABLE commerce_orders ADD CONSTRAINT commerce_orders_payment_currency_check CHECK(payment_currency IN ('PKR','USDT'))",
      );
      await db.query(
        'ALTER TABLE commerce_orders DROP CONSTRAINT IF EXISTS commerce_orders_payment_amount_check',
      );
      await db.query(
        'ALTER TABLE commerce_orders ADD CONSTRAINT commerce_orders_payment_amount_check CHECK(payment_amount>=0)',
      );
      await db.query(
        "ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS verification_reason text NOT NULL DEFAULT 'not_evaluated'",
      );
      await db.query(
        'ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS payment_amount numeric(20,8)',
      );
      await db.query(
        "ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'PKR'",
      );
      await db.query(
        'ALTER TABLE commerce_payments DROP CONSTRAINT IF EXISTS commerce_payments_currency_check',
      );
      await db.query(
        "ALTER TABLE commerce_payments ADD CONSTRAINT commerce_payments_currency_check CHECK(currency IN ('PKR','USDT'))",
      );
      await db.query(
        'ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS verification_reason_before_manual text',
      );
      await db.query(
        'ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS fulfillment_error_code text',
      );
      await db.query(
        'ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS fulfillment_error_message text',
      );
      await db.query(
        'ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS fulfillment_error_stage text',
      );
      await db.query(
        'ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS fulfillment_error_at timestamptz',
      );
      await db.query(
        'ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS manual_approval_source text',
      );
      await db.query(
        'CREATE TABLE IF NOT EXISTS commerce_audit (id bigserial PRIMARY KEY, action text NOT NULL, object_id text, details jsonb, created_at timestamptz NOT NULL DEFAULT now())',
      );
      await db.query(
        'ALTER TABLE commerce_audit ADD COLUMN IF NOT EXISTS details jsonb',
      );
      await db.query(`CREATE TABLE IF NOT EXISTS commerce_admin_support_tickets (
        id uuid PRIMARY KEY, name text NOT NULL, email text NOT NULL,
        subject text NOT NULL, message text NOT NULL,
        status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved','closed')),
        admin_reply text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      )`);
      await db.query(`CREATE TABLE IF NOT EXISTS commerce_admin_settings (
        key text PRIMARY KEY, value text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
      )`);
      await db.query(`INSERT INTO commerce_admin_settings(key,value) VALUES
        ('business_name','Sasify Solutions'),('default_currency','PKR'),('support_email','Support@SasifySolutions.com')
        ON CONFLICT(key) DO NOTHING`);
      await db.query(`CREATE TABLE IF NOT EXISTS commerce_payment_receivers (
        id text PRIMARY KEY,
        label text NOT NULL,
        title text NOT NULL,
        account_number text NOT NULL,
        receiver_marker text NOT NULL,
        enabled boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
      await db.query(`CREATE TABLE IF NOT EXISTS commerce_payment_receiver_state (
        id boolean PRIMARY KEY DEFAULT true CHECK(id),
        active_receiver_id text NOT NULL REFERENCES commerce_payment_receivers(id),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
      await db.query(
        'ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS receiver_id text',
      );
      await db.query(
        'ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS telegram_chat_id text',
      );
      await db.query(
        'ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS telegram_user_id text',
      );
      await db.query(
        'CREATE INDEX IF NOT EXISTS commerce_orders_telegram_chat ON commerce_orders(telegram_chat_id,created_at DESC)',
      );
      await db.query(`CREATE TABLE IF NOT EXISTS commerce_telegram_sessions (
        chat_id text PRIMARY KEY,
        state jsonb NOT NULL DEFAULT '{}'::jsonb,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
      await db.query(
        'ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS receiver_id text',
      );
      await db.query(
        `INSERT INTO commerce_payment_receivers(id,label,title,account_number,receiver_marker)
         VALUES
           ('primary','Syed Adeen Sarosh',$1,$2,$1),
           ('secondary','Sohail Ahmed Khatri',$3,$4,$3)
         ON CONFLICT(id) DO UPDATE SET
           label=EXCLUDED.label,
           title=EXCLUDED.title,
           account_number=EXCLUDED.account_number,
           receiver_marker=EXCLUDED.receiver_marker,
           enabled=true,
           updated_at=now()`,
        [
          process.env.PAYMENT_ACCOUNT_TITLE || 'Syed Adeen Sarosh',
          process.env.PAYMENT_ACCOUNT_NUMBER || '03450485711',
          process.env.PAYMENT_SECONDARY_TITLE || 'Sohail Ahmed Khatri',
          process.env.PAYMENT_SECONDARY_NUMBER || '03333163059',
        ],
      );
      await db.query(
        `INSERT INTO commerce_payment_receiver_state(id,active_receiver_id)
         VALUES(true,'primary') ON CONFLICT(id) DO NOTHING`,
      );
      await db.query(
        "UPDATE commerce_orders SET receiver_id='primary' WHERE receiver_id IS NULL",
      );
      await db.query(
        "UPDATE commerce_payments SET receiver_id='primary' WHERE receiver_id IS NULL",
      );
    })().catch((error) => {
      paymentWorkflowSchemaReady = null;
      throw error;
    });
  }
  await paymentWorkflowSchemaReady;
}
async function listPaymentReceivers(db) {
  return (
    await db.query(
      `SELECT r.id,r.label,r.title,r.account_number,r.receiver_marker,r.enabled,
              s.active_receiver_id=r.id AS active
       FROM commerce_payment_receivers r
       CROSS JOIN commerce_payment_receiver_state s
       WHERE r.enabled=true ORDER BY r.id`,
    )
  ).rows;
}
async function activePaymentReceiver(db) {
  return (
    await db.query(
      `SELECT r.id,r.label,r.title,r.account_number,r.receiver_marker
       FROM commerce_payment_receivers r
       INNER JOIN commerce_payment_receiver_state s ON s.active_receiver_id=r.id
       WHERE r.enabled=true LIMIT 1`,
    )
  ).rows[0];
}
let supplierApiLogSchemaReady;
async function ensureSupplierApiLogSchema(db) {
  if (!supplierApiLogSchemaReady) {
    supplierApiLogSchemaReady = (async () => {
      await db.query(`CREATE TABLE IF NOT EXISTS commerce_supplier_api_logs (
        id bigserial PRIMARY KEY, order_id uuid REFERENCES commerce_orders(id),
        provider_id text NOT NULL, operation text NOT NULL, endpoint text NOT NULL,
        request_method text NOT NULL DEFAULT 'GET', request_headers jsonb NOT NULL DEFAULT '{}'::jsonb,
        request_body jsonb, response_status integer, response_body jsonb,
        error_message text, created_at timestamptz NOT NULL DEFAULT now()
      )`);
      await db.query(
        'CREATE INDEX IF NOT EXISTS commerce_supplier_api_logs_order ON commerce_supplier_api_logs(order_id,created_at DESC)',
      );
      await db.query(
        'CREATE INDEX IF NOT EXISTS commerce_supplier_api_logs_created ON commerce_supplier_api_logs(created_at DESC)',
      );
    })().catch((error) => {
      supplierApiLogSchemaReady = null;
      throw error;
    });
  }
  await supplierApiLogSchemaReady;
}
let supplierSecretSchemaReady;
async function ensureSupplierSecretSchema(db) {
  if (!supplierSecretSchemaReady) {
    supplierSecretSchemaReady = db
      .query(`CREATE TABLE IF NOT EXISTS commerce_supplier_secrets (
        provider_id text PRIMARY KEY, encrypted_api_key text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      )`)
      .catch((error) => {
        supplierSecretSchemaReady = null;
        throw error;
      });
  }
  await supplierSecretSchemaReady;
}
let googleReviewSchemaReady;
async function ensureGoogleReviewSchema(db) {
  if (!googleReviewSchemaReady) {
    googleReviewSchemaReady = (async () => {
      await db.query(`CREATE TABLE IF NOT EXISTS commerce_google_reviews (
        id text PRIMARY KEY, name text NOT NULL, quote text NOT NULL,
        language text NOT NULL DEFAULT 'en', rating integer NOT NULL CHECK(rating BETWEEN 1 AND 5),
        excerpt boolean NOT NULL DEFAULT true, source_url text NOT NULL, profile_url text NOT NULL,
        photo_url text NOT NULL DEFAULT '', photo_path text NOT NULL DEFAULT '',
        review_created_at timestamptz, review_updated_at timestamptz,
        synced_at timestamptz NOT NULL DEFAULT now()
      )`);
      await db.query(
        'CREATE INDEX IF NOT EXISTS commerce_google_reviews_updated ON commerce_google_reviews(review_updated_at DESC NULLS LAST, synced_at DESC)',
      );
      await db.query(`CREATE TABLE IF NOT EXISTS commerce_google_review_sync (
        id boolean PRIMARY KEY DEFAULT true CHECK(id), total_review_count integer NOT NULL DEFAULT 0 CHECK(total_review_count>=0),
        average_rating numeric(3,2) NOT NULL DEFAULT 0 CHECK(average_rating>=0 AND average_rating<=5),
        synced_at timestamptz, last_error text
      )`);
    })().catch((error) => {
      googleReviewSchemaReady = null;
      throw error;
    });
  }
  await googleReviewSchemaReady;
}
function publicGoogleReview(row) {
  return {
    name: row.name,
    quote: row.quote,
    language: row.language === 'ur-Latn' ? 'ur-Latn' : 'en',
    rating: Number(row.rating),
    excerpt: Boolean(row.excerpt),
    sourceUrl: row.source_url || DEFAULT_REVIEWS_URL,
    profileUrl: row.profile_url || DEFAULT_REVIEWS_URL,
    photoUrl: row.photo_url || '',
    photoPath: row.photo_path || '',
  };
}
async function syncGoogleReviews(db) {
  const reviews = await fetchGoogleReviews({
    reviewsUrl:
      String(process.env.GOOGLE_REVIEWS_URL || DEFAULT_REVIEWS_URL).trim() ||
      DEFAULT_REVIEWS_URL,
  });
  await db.query('DELETE FROM commerce_google_reviews');
  for (const review of reviews.reviews)
    await db.query(
      `INSERT INTO commerce_google_reviews(
        id,name,quote,language,rating,excerpt,source_url,profile_url,photo_url,photo_path,review_created_at,review_updated_at,synced_at
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())
      ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,quote=EXCLUDED.quote,language=EXCLUDED.language,
        rating=EXCLUDED.rating,excerpt=EXCLUDED.excerpt,source_url=EXCLUDED.source_url,profile_url=EXCLUDED.profile_url,
        photo_url=EXCLUDED.photo_url,photo_path=EXCLUDED.photo_path,review_created_at=EXCLUDED.review_created_at,
        review_updated_at=EXCLUDED.review_updated_at,synced_at=now()`,
      [
        review.id,
        review.name,
        review.quote,
        review.language,
        review.rating,
        review.excerpt,
        review.sourceUrl,
        review.profileUrl,
        review.photoUrl,
        review.photoPath,
        review.reviewCreatedAt,
        review.reviewUpdatedAt,
      ],
    );
  await db.query(
    `INSERT INTO commerce_google_review_sync(id,total_review_count,average_rating,synced_at,last_error)
     VALUES(true,$1,$2,now(),NULL)
     ON CONFLICT(id) DO UPDATE SET total_review_count=EXCLUDED.total_review_count,
       average_rating=EXCLUDED.average_rating,synced_at=now(),last_error=NULL`,
    [reviews.totalReviewCount, reviews.averageRating],
  );
  return {
    ok: true,
    totalReviewCount: reviews.totalReviewCount,
    averageRating: reviews.averageRating,
    syncedAt: new Date().toISOString(),
  };
}
function cronAuthorized(req, admin) {
  if (admin) return true;
  const secret = String(process.env.CRON_SECRET || '').trim();
  return !!secret && same(bearer(req), secret);
}
async function readSupplierApiKeys(db, key) {
  const keys = {};
  const rows = (
    await db.query(
      'SELECT provider_id,encrypted_api_key FROM commerce_supplier_secrets',
    )
  ).rows;
  for (const row of rows) {
    if (!SUPPLIER_API_ENV[row.provider_id]) continue;
    try {
      keys[row.provider_id] = decrypt(row.encrypted_api_key, key);
    } catch {
      throw fail(503, 'A stored supplier API key could not be decrypted.');
    }
  }
  return keys;
}
function supplierKeyStatus(keys) {
  return Object.entries(SUPPLIER_PROVIDER_NAMES).map(
    ([providerId, providerName]) => ({
      providerId,
      providerName,
      configured: !!(
        keys[providerId] || process.env[SUPPLIER_API_ENV[providerId]]
      ),
      source: keys[providerId]
        ? 'admin'
        : process.env[SUPPLIER_API_ENV[providerId]]
          ? 'environment'
          : null,
    }),
  );
}
async function insertSupplierApiLogs(db, logs) {
  for (const log of logs)
    await db.query(
      `INSERT INTO commerce_supplier_api_logs(order_id,provider_id,operation,endpoint,request_method,request_headers,request_body,response_status,response_body,error_message)
       VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9::jsonb,$10)`,
      [
        log.orderId,
        log.providerId,
        log.operation,
        log.endpoint,
        log.requestMethod,
        JSON.stringify(log.requestHeaders || {}),
        log.requestBody === null || log.requestBody === undefined
          ? null
          : JSON.stringify(log.requestBody),
        log.responseStatus,
        log.responseBody === null || log.responseBody === undefined
          ? null
          : JSON.stringify(log.responseBody),
        log.errorMessage ? String(log.errorMessage).slice(0, 2000) : null,
      ],
    );
}
async function persistSupplierApiLogs(pool, logs) {
  if (!pool || !logs.length) return;
  const connection = await pool.connect();
  try {
    await connection.query('BEGIN');
    await insertSupplierApiLogs(connection, logs);
    await connection.query('COMMIT');
  } catch (error) {
    await connection.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}
function automaticCostPkr(price, currency) {
  if (currency === 'PKR') return Math.ceil(price);
  if (currency === 'USDT') return Math.ceil(price * supplierUsdtRate());
  if (currency === 'USD' && supplierUsdRate())
    return Math.ceil(price * supplierUsdRate());
  return null;
}
function automaticProductKey(name) {
  return supplierProductKey(name);
}
async function refreshAutomaticSupplierKeys(db) {
  const rows = (
    await db.query(
      "SELECT id,name,canonical_key FROM commerce_supplier_products WHERE canonical_manual=false OR canonical_key LIKE 'auto:capcut-duration-%' OR canonical_key='auto:4-account-chatgpt-level-plus-duration-2m'",
    )
  ).rows;
  for (const row of rows) {
    const key = automaticProductKey(row.name);
    if (!key || key === row.canonical_key) continue;
    await db.query(
      "UPDATE commerce_supplier_products SET canonical_key=$1,canonical_manual=false WHERE id=$2 AND (canonical_manual=false OR canonical_key LIKE 'auto:capcut-duration-%' OR canonical_key='auto:4-account-chatgpt-level-plus-duration-2m')",
      [key, row.id],
    );
  }
}
const localInventoryProductIds = (productId) =>
  productId === 'p093' ? ['p093', 'p093-ultra'] : [productId];
const RETIRED_LOCAL_PRODUCT_IDS = ['p093-momo'];
const isRetiredLocalProduct = (productId) =>
  RETIRED_LOCAL_PRODUCT_IDS.includes(String(productId || ''));
const supplierNameNoise = new Set([
  'a',
  'an',
  'the',
  'api',
  'cdk',
  'comes',
  'd',
  'day',
  'days',
  'for',
  'full',
  'has',
  'included',
  'm',
  'mo',
  'month',
  'months',
  'no',
  'not',
  'nw',
  'fw',
  'pre',
  'order',
  'preorder',
  'warranty',
  'week',
  'weeks',
  'with',
  'without',
  'y',
  'year',
  'years',
]);
const supplierDurationUnit = /^(?:d|day|days|m|mo|month|months|y|year|years)$/;
const supplierCompactDuration =
  /^\d+(?:d|day|days|m|mo|month|months|y|year|years)$/;
function comparableProductName(value) {
  const tokens = String(value || '')
    .toLowerCase()
    .replace(/(\d),(?=\d)/g, '$1')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return tokens
    .filter(
      (token, index) =>
        !supplierNameNoise.has(token) &&
        !supplierCompactDuration.test(token) &&
        !(
          /^\d+$/.test(token) &&
          (supplierDurationUnit.test(tokens[index - 1] || '') ||
            supplierDurationUnit.test(tokens[index + 1] || ''))
        ),
    )
    .sort()
    .join(' ');
}
function supplierEquivalentProductName(staticName, supplierName) {
  const left = comparableProductName(staticName);
  const right = comparableProductName(supplierName);
  return !!left && left === right;
}
function isChatGptPlusProduct(name) {
  const value = String(name || '');
  return /\bchatgpt\s+plus\b/i.test(value)
    && !/\b(?:k12|edu|education|business|team|enterprise)\b|\b(?:[2-9]\d*|1\d+)\s*(?:m|months?)\b|\b\d+\s*(?:y|years?)\b/i.test(value);
}
function supplierProviders(keys = {}) {
  return [
    {
      id: 'dodi',
      name: 'DODI Store',
      configured: !!(keys.dodi || process.env.DODI_RESELLER_API_KEY),
      async catalog() {
        const result = await fetchSupplierProducts(keys.dodi);
        return {
          currency: 'USDT',
          products: result.products.map(normalizeSupplierProduct),
        };
      },
      async balance() {
        return {
          balance: await fetchSupplierBalance(keys.dodi),
          currency: 'USDT',
        };
      },
    },
    {
      id: 'qamify',
      name: 'Qamify',
      configured: !!(keys.qamify || process.env.QAMIFY_API_KEY),
      async catalog() {
        const products = await fetchQamifyProducts(keys.qamify);
        return {
          currency: 'USD',
          products: products
            .map((product) => normalizeQamifyProduct(product, 'USD'))
            .filter(Boolean),
        };
      },
      async balance() {
        return fetchQamifyBalance(keys.qamify);
      },
    },
    {
      id: 'mke',
      name: 'MKE Shop',
      configured: !!(keys.mke || process.env.MKE_API_KEY),
      async catalog() {
        const products = await fetchMkeProducts(keys.mke);
        return {
          currency: 'USD',
          products: products
            .map((product) => normalizeMkeProduct(product, 'USD'))
            .filter(Boolean),
        };
      },
      async balance() {
        return fetchMkeBalance(keys.mke);
      },
    },
    {
      id: 'fatbunny',
      name: 'Fat Bunny Hub',
      configured: !!(keys.fatbunny || process.env.FATBUNNY_API_KEY),
      async catalog() {
        const products = await fetchPiggyAiProducts(
          'FATBUNNY_API_KEY',
          keys.fatbunny,
        );
        const normalized = products
          .map((product) => normalizePiggyAiProduct(product, 'USD', 'fatbunny'))
          .filter(Boolean);
        console.error(
          'fat-bunny-catalog-count',
          products.length,
          normalized.length,
        );
        return { currency: 'USD', products: normalized };
      },
      async balance() {
        return fetchPiggyAiBalance('FATBUNNY_API_KEY', keys.fatbunny);
      },
    },
    {
      id: 'piggyai',
      name: 'PiggyAi',
      configured: !!(keys.piggyai || process.env.PIGGYAI_API_KEY),
      async catalog() {
        const products = await fetchPiggyAiProducts(
          'PIGGYAI_API_KEY',
          keys.piggyai,
        );
        return {
          currency: 'USD',
          products: products
            .map((product) =>
              normalizePiggyAiProduct(product, 'USD', 'piggyai'),
            )
            .filter(Boolean),
        };
      },
      async balance() {
        return fetchPiggyAiBalance('PIGGYAI_API_KEY', keys.piggyai);
      },
    },
    {
      id: 'zoomstore',
      name: 'Zoom Store',
      configured: !!(keys.zoomstore || process.env.ZOOMSTORE_API_KEY),
      async catalog() {
        const products = await fetchZoomStoreProducts(keys.zoomstore);
        return {
          currency: 'USD',
          products: products
            .map((product) => normalizeZoomStoreProduct(product, 'USD'))
            .filter(Boolean),
        };
      },
      async balance() {
        return fetchZoomStoreBalance(keys.zoomstore);
      },
    },
    {
      id: 'elitetools',
      name: 'Elite Tools Store',
      configured: !!(keys.elitetools || process.env.ELITE_TOOLS_API_KEY),
      async catalog() {
        const products = await fetchEliteToolsProducts(keys.elitetools);
        return {
          currency: 'USD',
          products: products
            .map((product) => normalizeEliteToolsProduct(product, 'USD'))
            .filter(Boolean),
        };
      },
      async balance() {
        return fetchEliteToolsBalance(keys.elitetools);
      },
    },
  ];
}
let supplierMediaSchemaReady;
const MUSE_AI_PRODUCT_ID = 'manual:muse-ai';
const MUSE_AI_DESCRIPTION = `💎 MUSE AI — 1 BILLION AI TOKENS

Your personal AI agent for Rs. 2,499 only 🔥

What you get:
• Available on your personal email
• 1 billion AI tokens
• Powerful personal AI agent
• Coding, debugging and development
• Full-scale apps and APK files
• Websites and web apps
• 30+ minute AI videos from a single prompt
• Video editing and content creation
• AI images, graphics and creative assets
• Documents, scripts, research and writing
• Data analysis and productivity tasks
• WhatsApp messages and communication
• Multi-step tasks and automations
• Large and complex project handling
• Premium AI creation tools
• Personal account access

Why Muse:
Muse is basically your Personal AI Employee. You tell it what you need → it plans, creates, codes, edits and gets the work done from one chat window.

From a simple WhatsApp message → to content creation → to coding → to websites → to FULL-SCALE APPS.

Price & limited-time offer:
• Price: Rs. 2,499 only
• 1 Billion Token offer available for a limited time
• Includes 1 billion tokens, a personal account and a powerful AI agent 💎`;
async function ensureMuseManualProduct(db) {
  await db.query(
    `INSERT INTO commerce_supplier_products(
      id,name,description,delivery_instruction,wholesale_price,currency,
      supplier_stock,cost_pkr,provider_id,provider_name,external_product_id,
      canonical_key,logo_url,enabled,selling_price,cost_manual,canonical_manual,
      name_manual,description_manual,requires_customer_email,first_seen_at,synced_at
    ) VALUES($1,$2,$3,$4,0,'PKR',999,0,'manual','Sasify manual catalog',$1,$5,'/muse-ai-logo.png',true,2499,true,true,true,true,true,now(),now())
    ON CONFLICT(id) DO UPDATE SET
      name=EXCLUDED.name,description=EXCLUDED.description,
      delivery_instruction=EXCLUDED.delivery_instruction,
      logo_url='/muse-ai-logo.png',
      supplier_stock=GREATEST(commerce_supplier_products.supplier_stock,999),
      enabled=true,selling_price=2499,requires_customer_email=true,
      synced_at=now()`,
    [
      MUSE_AI_PRODUCT_ID,
      'Muse AI · 1 Billion AI Tokens',
      MUSE_AI_DESCRIPTION,
      'After payment, Sasify will manually process your personal email and deliver access from the admin panel.',
      'manual:muse-ai',
    ],
  );
}
async function ensureSupplierMediaSchema(db) {
  if (!supplierMediaSchemaReady) {
    supplierMediaSchemaReady = (async () => {
      await db.query(
        'ALTER TABLE commerce_supplier_products ADD COLUMN IF NOT EXISTS logo_url text',
      );
      await db.query(
        'ALTER TABLE commerce_supplier_products ADD COLUMN IF NOT EXISTS requires_customer_email boolean NOT NULL DEFAULT false',
      );
      await db.query(
        'ALTER TABLE commerce_supplier_products ADD COLUMN IF NOT EXISTS first_seen_at timestamptz NOT NULL DEFAULT now()',
      );
      await db.query(
        'ALTER TABLE commerce_supplier_products ADD COLUMN IF NOT EXISTS name_manual boolean NOT NULL DEFAULT false',
      );
      await db.query(
        'ALTER TABLE commerce_supplier_products ADD COLUMN IF NOT EXISTS description_manual boolean NOT NULL DEFAULT false',
      );
      await db.query(`CREATE TABLE IF NOT EXISTS commerce_supplier_catalog_meta (
        id boolean PRIMARY KEY DEFAULT true,
        first_seen_migrated_at timestamptz NOT NULL DEFAULT now()
      )`);
      const firstSeenMigration = await db.query(
        'INSERT INTO commerce_supplier_catalog_meta(id) VALUES(true) ON CONFLICT(id) DO NOTHING RETURNING id',
      );
      if (firstSeenMigration.rowCount) {
        await db.query(
          "UPDATE commerce_supplier_products SET first_seen_at=now()-interval '1 year'",
        );
      }
      await ensureMuseManualProduct(db);
    })().catch((error) => {
      supplierMediaSchemaReady = null;
      throw error;
    });
  }
  await supplierMediaSchemaReady;
}
let scamSchemaReady;
async function ensureScamSchema(db) {
  if (!scamSchemaReady) {
    scamSchemaReady = (async () => {
      await db.query(`CREATE TABLE IF NOT EXISTS commerce_scam_reports (
        id uuid PRIMARY KEY, name text NOT NULL, description text NOT NULL, amount_pkr integer CHECK(amount_pkr>=0),
        identifiers jsonb NOT NULL DEFAULT '[]'::jsonb, payment_methods jsonb NOT NULL DEFAULT '[]'::jsonb,
        evidence jsonb NOT NULL DEFAULT '[]'::jsonb, submitter_contact text,
        status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','removed')),
        created_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz
      )`);
      await db.query(
        'CREATE INDEX IF NOT EXISTS commerce_scam_reports_status_created ON commerce_scam_reports(status, created_at DESC)',
      );
    })().catch((error) => {
      scamSchemaReady = null;
      throw error;
    });
  }
  await scamSchemaReady;
}
let toolRequestSchemaReady;
async function ensureToolRequestSchema(db) {
  if (!toolRequestSchemaReady) {
    toolRequestSchemaReady = (async () => {
      await db.query(`CREATE TABLE IF NOT EXISTS commerce_tool_requests (
        id uuid PRIMARY KEY, tool_name text NOT NULL, requirement text NOT NULL,
        priority text NOT NULL DEFAULT 'moderate' CHECK(priority IN ('urgent','moderate','low')),
        contact_number text NOT NULL, status text NOT NULL DEFAULT 'new'
          CHECK(status IN ('new','contacted','fulfilled','closed')),
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      )`);
      await db.query(
        'CREATE INDEX IF NOT EXISTS commerce_tool_requests_created ON commerce_tool_requests(created_at DESC)',
      );
      await db.query(
        'CREATE INDEX IF NOT EXISTS commerce_tool_requests_queue ON commerce_tool_requests(status,priority,created_at DESC)',
      );
    })().catch((error) => {
      toolRequestSchemaReady = null;
      throw error;
    });
  }
  await toolRequestSchemaReady;
}
let resellerRequirementSchemaReady;
async function ensureResellerRequirementSchema(db) {
  if (!resellerRequirementSchemaReady) {
    resellerRequirementSchemaReady = (async () => {
      await db.query(`CREATE TABLE IF NOT EXISTS commerce_reseller_requirements (
        id uuid PRIMARY KEY, tool_name text NOT NULL, description text NOT NULL,
        status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','fulfilled','closed')),
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      )`);
      await db.query(`CREATE TABLE IF NOT EXISTS commerce_reseller_requirement_responses (
        id uuid PRIMARY KEY, requirement_id uuid NOT NULL REFERENCES commerce_reseller_requirements(id) ON DELETE CASCADE,
        account_id uuid NOT NULL REFERENCES commerce_accounts(id) ON DELETE CASCADE,
        contact_number text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(requirement_id, account_id)
      )`);
      await db.query('CREATE INDEX IF NOT EXISTS commerce_reseller_requirements_status ON commerce_reseller_requirements(status,created_at DESC)');
      await db.query('CREATE INDEX IF NOT EXISTS commerce_reseller_requirement_responses_requirement ON commerce_reseller_requirement_responses(requirement_id,created_at DESC)');
    })().catch((error) => {
      resellerRequirementSchemaReady = null;
      throw error;
    });
  }
  await resellerRequirementSchemaReady;
}
let inventoryVariantMigrationReady;
async function ensureInventoryVariants(db) {
  if (!inventoryVariantMigrationReady) {
    inventoryVariantMigrationReady = db
      .query(
        "UPDATE commerce_inventory SET product_id='p093-ultra' WHERE product_id='p093' AND state='available'",
      )
      .then(() =>
        db.query(`UPDATE commerce_inventory i SET state=CASE WHEN o.status='delivered' THEN 'delivered' ELSE 'reserved' END
          FROM commerce_orders o
          WHERE o.inventory_id=i.id AND o.status IN ('pending','review','delivered') AND i.state='available'`),
      )
      .catch((error) => {
        inventoryVariantMigrationReady = null;
        throw error;
      });
  }
  await inventoryVariantMigrationReady;
}
function adminToken(secret) {
  const expiresAt = Date.now() + 8 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ expiresAt })).toString(
    'base64url',
  );
  const mac = createHmac('sha256', secret)
    .update(`admin:${payload}`)
    .digest('base64url');
  return { token: `${payload}.${mac}`, expiresAt };
}
function validAdminToken(token, secret) {
  try {
    const [payload, mac] = String(token || '').split('.');
    const expected = createHmac('sha256', secret)
      .update(`admin:${payload}`)
      .digest('base64url');
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return same(mac, expected) && Number(data.expiresAt) > Date.now();
  } catch {
    return false;
  }
}
function scopedToken(secret, scope, claims, ttlMs) {
  const payload = Buffer.from(
    JSON.stringify({ ...claims, expiresAt: Date.now() + ttlMs }),
  ).toString('base64url');
  const mac = createHmac('sha256', secret)
    .update(`${scope}:${payload}`)
    .digest('base64url');
  return `${payload}.${mac}`;
}
function scopedClaims(token, secret, scope) {
  try {
    const [payload, mac] = String(token || '').split('.');
    const expected = createHmac('sha256', secret)
      .update(`${scope}:${payload}`)
      .digest('base64url');
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!same(mac, expected) || Number(data.expiresAt) <= Date.now())
      return null;
    return data;
  } catch {
    return null;
  }
}
function teamToken(secret, email) {
  return scopedToken(
    secret,
    'team',
    { role: 'team', email },
    8 * 60 * 60 * 1000,
  );
}
function profitViewToken(secret) {
  return scopedToken(secret, 'profit', { role: 'profit' }, 30 * 60 * 1000);
}
let teamSchemaReady;
async function ensureTeamSchema(db) {
  if (!teamSchemaReady) {
    teamSchemaReady = db
      .query(`CREATE TABLE IF NOT EXISTS commerce_team_users (
        id boolean PRIMARY KEY DEFAULT true CHECK(id),
        email text NOT NULL,
        password_hash text NOT NULL,
        enabled boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`)
      .then(() =>
        db.query(`CREATE TABLE IF NOT EXISTS commerce_team_withdrawals (
          id uuid PRIMARY KEY,
          inventory_id uuid NOT NULL REFERENCES commerce_inventory(id),
          team_email text NOT NULL,
          commission_code text NOT NULL DEFAULT 'HOR',
          commission_amount integer NOT NULL DEFAULT ${TEAM_COMMISSION_PKR} CHECK(commission_amount>=0),
          commission_paid boolean NOT NULL DEFAULT false,
          shared_slot integer,
          created_at timestamptz NOT NULL DEFAULT now()
        )`),
      )
      .then(() =>
        db.query(
          'ALTER TABLE commerce_team_withdrawals DROP CONSTRAINT IF EXISTS commerce_team_withdrawals_inventory_id_key',
        ),
      )
      .then(() =>
        db.query(
          'ALTER TABLE commerce_team_withdrawals ADD COLUMN IF NOT EXISTS shared_slot integer',
        ),
      )
      .then(() =>
        db.query(
          'CREATE UNIQUE INDEX IF NOT EXISTS commerce_team_withdrawals_inventory_unique ON commerce_team_withdrawals(inventory_id) WHERE shared_slot IS NULL',
        ),
      )
      .then(() =>
        db.query(
          'CREATE UNIQUE INDEX IF NOT EXISTS commerce_team_withdrawals_shared_slot_unique ON commerce_team_withdrawals(inventory_id,shared_slot) WHERE shared_slot IS NOT NULL',
        ),
      )
      .then(() =>
        db.query(
          'CREATE INDEX IF NOT EXISTS commerce_team_withdrawals_created ON commerce_team_withdrawals(created_at DESC)',
        ),
      )
      .catch((error) => {
        teamSchemaReady = null;
        throw error;
      });
  }
  await teamSchemaReady;
}
let sharedAccountSchemaReady;
async function ensureSharedAccountSchema(db) {
  if (!sharedAccountSchemaReady) {
    sharedAccountSchemaReady = (async () => {
      await db.query(`CREATE TABLE IF NOT EXISTS commerce_shared_accounts (
        id uuid PRIMARY KEY,
        inventory_id uuid NOT NULL UNIQUE REFERENCES commerce_inventory(id),
        slots_filled integer NOT NULL DEFAULT 0 CHECK(slots_filled>=0),
        max_slots integer NOT NULL DEFAULT ${SHARED_CHATGPT_MAX_SLOTS} CHECK(max_slots=${SHARED_CHATGPT_MAX_SLOTS}),
        status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','sold','withdrawn')),
        created_at timestamptz NOT NULL DEFAULT now(),
        sold_at timestamptz
      )`);
      await db.query(
        'ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS shared_account_id uuid',
      );
      await db.query(
        'ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS shared_slot integer',
      );
      await db.query(
        'ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS shared_slot_released boolean NOT NULL DEFAULT false',
      );
      await db.query(
        'CREATE INDEX IF NOT EXISTS commerce_shared_accounts_queue ON commerce_shared_accounts(status,created_at,id)',
      );
      // A shared credential may be attached to four active orders. Regular
      // local credentials retain their original one-order uniqueness rule.
      await db.query('DROP INDEX IF EXISTS commerce_inventory_assignment');
      await db.query(
        "CREATE UNIQUE INDEX IF NOT EXISTS commerce_inventory_assignment ON commerce_orders(inventory_id) WHERE shared_account_id IS NULL AND status IN ('pending','review','delivered')",
      );
      await db.query(
        `UPDATE commerce_inventory i SET state='available'
         FROM commerce_shared_accounts sa
         WHERE sa.inventory_id=i.id
           AND sa.status='active'
           AND sa.slots_filled<sa.max_slots
           AND i.state='delivered'`,
      );
    })().catch((error) => {
      sharedAccountSchemaReady = null;
      throw error;
    });
  }
  await sharedAccountSchemaReady;
}
let twoFactorChallengeSchemaReady;
async function ensureTwoFactorChallengeSchema(db) {
  if (!twoFactorChallengeSchemaReady) {
    twoFactorChallengeSchemaReady = (async () => {
      await db.query(`CREATE TABLE IF NOT EXISTS commerce_two_factor_challenges (
        id uuid PRIMARY KEY,
        order_id uuid NOT NULL UNIQUE REFERENCES commerce_orders(id) ON DELETE CASCADE,
        device_hash text NOT NULL,
        code_hash text NOT NULL,
        issued_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL,
        consumed_at timestamptz
      )`);
      await db.query(
        'CREATE INDEX IF NOT EXISTS commerce_two_factor_challenges_expiry ON commerce_two_factor_challenges(expires_at)',
      );
    })().catch((error) => {
      twoFactorChallengeSchemaReady = null;
      throw error;
    });
  }
  await twoFactorChallengeSchemaReady;
}
async function releaseSharedSlot(db, order) {
  if (!order?.shared_account_id || order.shared_slot_released) return;
  const changed = await db.query(
    `UPDATE commerce_shared_accounts
     SET slots_filled=GREATEST(0,slots_filled-1),
         status=CASE WHEN status='sold' THEN 'active' ELSE status END,
         sold_at=CASE WHEN status='sold' THEN NULL ELSE sold_at END
     WHERE id=$1 AND slots_filled>0
     RETURNING id`,
    [order.shared_account_id],
  );
  if (changed.rowCount)
    await db.query(
      'UPDATE commerce_orders SET shared_slot_released=true WHERE id=$1',
      [order.id],
    );
}
async function reserveSharedAccount(db) {
  const shared = (
    await db.query(
      `SELECT sa.id,sa.slots_filled,sa.max_slots,i.id AS inventory_id
       FROM commerce_shared_accounts sa
       INNER JOIN commerce_inventory i ON i.id=sa.inventory_id
       WHERE sa.status='active' AND sa.slots_filled<sa.max_slots
         AND i.state IN ('available','reserved','delivered')
       ORDER BY sa.created_at,sa.id
       FOR UPDATE OF sa,i SKIP LOCKED LIMIT 1`,
    )
  ).rows[0];
  if (!shared)
    throw fail(
      409,
      'Shared ChatGPT accounts are currently sold out. Please contact us on WhatsApp.',
    );
  const slot = Number(shared.slots_filled) + 1;
  await db.query(
    `UPDATE commerce_shared_accounts SET slots_filled=$1,
       status=CASE WHEN $1>=max_slots THEN 'sold' ELSE 'active' END,
       sold_at=CASE WHEN $1>=max_slots THEN now() ELSE sold_at END
     WHERE id=$2`,
    [slot, shared.id],
  );
  return { id: shared.id, inventoryId: shared.inventory_id, slot };
}
async function issueSharedTwoFactorCode(db, req, orderId, key) {
  const session = checkoutCookie(req);
  const order = (
    await db.query(
      `SELECT o.*,i.credentials
       FROM commerce_orders o
       INNER JOIN commerce_inventory i ON i.id=o.inventory_id
       WHERE o.id=$1 AND o.shared_account_id IS NOT NULL
       FOR UPDATE OF o,i`,
      [orderId],
    )
  ).rows[0];
  if (!order || !same(hash(bearer(req)), order.recovery_hash))
    throw fail(404, 'Order not found or recovery key is incorrect.');
  if (order.status !== 'delivered')
    throw fail(409, 'The shared account is not ready for login yet.');
  // Bind issuance to the original checkout browser cookie. The customer never
  // receives the cookie value, and a copied order recovery key alone is not enough.
  if (!session || !same(hash(session), order.session_hash))
    throw fail(
      403,
      'Open this order on the original checkout device to request the code.',
    );
  const existing = (
    await db.query(
      'SELECT id,expires_at FROM commerce_two_factor_challenges WHERE order_id=$1',
      [order.id],
    )
  ).rows[0];
  if (existing)
    throw fail(
      409,
      'The one-time 2FA code has already been issued for this order.',
    );
  const credentials = decrypt(order.credentials, key);
  let code;
  try {
    code = totpCode(credentials.twoFactor);
  } catch {
    throw fail(
      409,
      'This account does not have a valid TOTP authenticator secret. Contact support.',
    );
  }
  const expiresAt = new Date(Date.now() + 30 * 1000);
  await db.query(
    `INSERT INTO commerce_two_factor_challenges(id,order_id,device_hash,code_hash,expires_at)
     VALUES($1,$2,$3,$4,$5)`,
    [
      randomUUID(),
      order.id,
      hash(`${session}:${String(req.headers['user-agent'] || '')}`),
      hash(code),
      expiresAt,
    ],
  );
  await db.query(
    "INSERT INTO commerce_audit(action,object_id) VALUES('shared_2fa_code_issued',$1)",
    [order.id],
  );
  return { code, expiresAt: expiresAt.toISOString(), oneTime: true };
}
async function rate(db, key, max) {
  const result = await db.query(
    `INSERT INTO commerce_limits(key) VALUES($1) ON CONFLICT(key) DO UPDATE SET
    hits=CASE WHEN commerce_limits.window_start < now()-interval '1 minute' THEN 1 ELSE commerce_limits.hits+1 END,
    window_start=CASE WHEN commerce_limits.window_start < now()-interval '1 minute' THEN now() ELSE commerce_limits.window_start END RETURNING hits`,
    [key],
  );
  if (result.rows[0].hits > max)
    throw fail(429, 'Too many requests. Please wait a minute.');
}
async function syncSupplierCatalog(
  db,
  force = false,
  keys = {},
  onlyProviderId = '',
) {
  await db.query(
    "UPDATE commerce_supplier_products SET id='fatbunny:'||external_product_id, provider_id='fatbunny' WHERE provider_id='piggyai' AND provider_name='Fat Bunny Hub'",
  );
  await db.query(
    "UPDATE commerce_provider_state SET provider_id='fatbunny' WHERE provider_id='piggyai' AND provider_name='Fat Bunny Hub'",
  );
  const results = [];
  for (const provider of supplierProviders(keys).filter(
    (item) =>
      item.configured && (!onlyProviderId || item.id === onlyProviderId),
  )) {
    const lockKey = `supplier-catalog-sync:${provider.id}`;
    const lock = force
      ? (
          await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
            lockKey,
          ])
        ).rows[0]
      : (
          await db.query(
            'SELECT pg_try_advisory_xact_lock(hashtext($1)) AS locked',
            [lockKey],
          )
        ).rows[0];
    if (!force && !lock.locked) continue;
    if (!force) {
      const fresh = (
        await db.query(
          "SELECT max(synced_at)>now()-interval '5 minutes' AS fresh FROM commerce_supplier_products WHERE provider_id=$1",
          [provider.id],
        )
      ).rows[0]?.fresh;
      if (fresh) continue;
    }
    const previousState = (
      await db.query(
        'SELECT balance,currency FROM commerce_provider_state WHERE provider_id=$1',
        [provider.id],
      )
    ).rows[0];
    const synced = await provider.catalog();
    let balanceState;
    let balanceError = null;
    try {
      balanceState = await provider.balance();
    } catch (error) {
      balanceError = error;
      console.error(
        'supplier-balance-sync-error',
        provider.id,
        error.status || error.name || 'error',
        error.code || '',
      );
    }
    const balance = balanceState
      ? (balanceState.balance ?? null)
      : (previousState?.balance ?? null);
    const currency =
      String(
        balanceState?.currency ||
          synced.currency ||
          previousState?.currency ||
          '',
      )
        .slice(0, 12)
        .toUpperCase() || null;
    let accepted = 0;
    for (const product of synced.products) {
      const wholesale = Number(product.wholesale_price),
        stock = Number(product.stock);
      if (
        !product.id ||
        !product.name ||
        !Number.isFinite(wholesale) ||
        wholesale < 0 ||
        !Number.isSafeInteger(stock) ||
        stock < 0
      )
        continue;
      const externalId = String(product.id),
        id =
          provider.id === 'dodi' ? externalId : `${provider.id}:${externalId}`;
      const currency = String(product.currency || synced.currency || '')
        .slice(0, 12)
        .toUpperCase();
      await db.query(
        `INSERT INTO commerce_supplier_products(id,name,description,delivery_instruction,wholesale_price,currency,supplier_stock,cost_pkr,provider_id,provider_name,external_product_id,canonical_key,logo_url,requires_customer_email,first_seen_at,synced_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now(),now()) ON CONFLICT(id) DO UPDATE SET
        name=CASE WHEN commerce_supplier_products.name_manual THEN commerce_supplier_products.name ELSE excluded.name END,
        description=CASE WHEN commerce_supplier_products.description_manual THEN commerce_supplier_products.description ELSE excluded.description END,
        delivery_instruction=excluded.delivery_instruction,wholesale_price=excluded.wholesale_price,currency=excluded.currency,supplier_stock=excluded.supplier_stock,
        provider_id=excluded.provider_id,provider_name=excluded.provider_name,external_product_id=excluded.external_product_id,
        canonical_key=CASE WHEN commerce_supplier_products.canonical_manual THEN commerce_supplier_products.canonical_key ELSE excluded.canonical_key END,
        canonical_manual=commerce_supplier_products.canonical_manual,
        logo_url=COALESCE(NULLIF(excluded.logo_url,''),commerce_supplier_products.logo_url),
        requires_customer_email=excluded.requires_customer_email,
        cost_pkr=CASE WHEN commerce_supplier_products.cost_manual THEN commerce_supplier_products.cost_pkr ELSE excluded.cost_pkr END,synced_at=now()`,
        [
          id,
          String(product.name).slice(0, 200),
          String(product.description || '').slice(0, 10000),
          product.delivery_instruction
            ? String(product.delivery_instruction).slice(0, 10000)
            : null,
          wholesale,
          currency,
          stock,
          automaticCostPkr(wholesale, currency),
          provider.id,
          provider.name,
          externalId,
          String(
            automaticProductKey(product.name) ||
              product.canonical_key ||
              `${provider.id}:${externalId}`,
          ).slice(0, 200),
          product.logo_url ? String(product.logo_url).slice(0, 2000) : null,
          Boolean(product.requires_customer_email),
        ],
      );
      accepted++;
    }
    await db.query(
      `INSERT INTO commerce_provider_state(provider_id,provider_name,balance,currency,synced_at) VALUES($1,$2,$3,$4,now())
      ON CONFLICT(provider_id) DO UPDATE SET provider_name=excluded.provider_name,balance=excluded.balance,currency=excluded.currency,synced_at=now()`,
      [
        provider.id,
        provider.name,
        Number.isFinite(Number(balance)) ? Number(balance) : null,
        currency,
      ],
    );
    results.push({
      providerId: provider.id,
      providerName: provider.name,
      synced: accepted,
      balance,
      currency,
      balanceUpdated: !balanceError,
      ...(balanceError
        ? {
            balanceError: String(
              balanceError.message || 'Balance refresh failed',
            ).slice(0, 200),
          }
        : {}),
    });
  }
  return results;
}
async function triggerSupplierSeoRebuild(db) {
  const hook = String(process.env.SUPPLIER_SEO_DEPLOY_HOOK_URL || '').trim();
  if (!hook) return { configured: false, triggered: false };
  try {
    const response = await fetch(hook, { method: 'POST' });
    const triggered = response.ok;
    await db.query(
      'INSERT INTO commerce_audit(action,object_id) VALUES($1,$2)',
      [
        triggered
          ? 'supplier_seo_rebuild_triggered'
          : 'supplier_seo_rebuild_failed',
        String(response.status),
      ],
    );
    return { configured: true, triggered, status: response.status };
  } catch {
    await db.query(
      "INSERT INTO commerce_audit(action,object_id) VALUES('supplier_seo_rebuild_failed',$1)",
      ['network_error'],
    );
    return { configured: true, triggered: false, status: null };
  }
}
async function expire(db, includeReview = true) {
  const pendingVerification = (
    await db.query(
      `SELECT * FROM commerce_orders
       WHERE status='pending' AND payment_submitted_at IS NOT NULL
         AND payment_submitted_at < now() - ($1 * interval '1 second')`,
      [PAYMENT_VERIFICATION_GRACE_SECONDS],
    )
  ).rows;
  for (const order of pendingVerification) {
    // Keep ambiguous or already-received receipts available for admin review;
    // only cancel when no verified receipt exists at all.
    const hasPayment = await hasVerifiedPaymentForOrder(db, order);
    if (hasPayment) continue;
    const cancelled = await db.query(
      `UPDATE commerce_orders
       SET status='cancelled',supplier_status='cancelled_without_payment'
       WHERE id=$1 AND status='pending' AND payment_submitted_at IS NOT NULL
       RETURNING id`,
      [order.id],
    );
    if (!cancelled.rowCount) continue;
    await db.query(
      "UPDATE commerce_inventory SET state='available' WHERE id=$1 AND state='reserved'",
      [order.inventory_id],
    );
    await releaseSharedSlot(db, order);
    await releaseCoupon(db, order);
    await db.query(
      "INSERT INTO commerce_audit(action,object_id) VALUES('payment_verification_timeout',$1)",
      [order.id],
    );
  }
  const statuses = includeReview ? "('pending','review')" : "('pending')";
  await db.query(`WITH expired AS (
      UPDATE commerce_orders SET status='expired',coupon_usage_released=CASE WHEN coupon_id IS NOT NULL THEN true ELSE coupon_usage_released END
      WHERE status IN ${statuses} AND expires_at<now() RETURNING inventory_id,coupon_id
    ), released AS (
      SELECT coupon_id,count(*)::int AS uses FROM expired WHERE coupon_id IS NOT NULL GROUP BY coupon_id
    )
    UPDATE commerce_coupons c SET used_count=GREATEST(0,c.used_count-released.uses),updated_at=now()
     FROM released WHERE c.id=released.coupon_id`);
  await db.query(`WITH released AS (
      UPDATE commerce_shared_accounts sa SET
        slots_filled=GREATEST(0,sa.slots_filled-r.uses),
        status=CASE WHEN sa.status='sold' THEN 'active' ELSE sa.status END,
        sold_at=CASE WHEN sa.status='sold' THEN NULL ELSE sa.sold_at END
      FROM (
        SELECT shared_account_id,count(*)::int AS uses
        FROM commerce_orders
        WHERE status='expired' AND shared_account_id IS NOT NULL
          AND shared_slot_released=false
        GROUP BY shared_account_id
      ) r
      WHERE sa.id=r.shared_account_id
      RETURNING sa.id
    )
    UPDATE commerce_orders o SET shared_slot_released=true
    FROM released WHERE o.shared_account_id=released.id
      AND o.status='expired' AND o.shared_slot_released=false`);
  await db.query(`UPDATE commerce_inventory SET state='available' WHERE state='reserved' AND id IN (
    SELECT inventory_id FROM commerce_orders WHERE status='expired' AND expires_at<now() AND inventory_id IS NOT NULL
  )`);
}
async function placeSupplierOrder(product, order, onExchange, keys = {}) {
  const requiresCustomerEmail = Boolean(
    product.requires_customer_email ||
    supplierRequiresCustomerEmail(product, product.provider_id),
  );
  if (requiresCustomerEmail && !order.customer_email)
    throw fail(
      409,
      'Customer email is required before this supplier order can be processed.',
    );
  if (product.provider_id === 'qamify') {
    if (!/^\d+$/.test(String(product.external_product_id || '')))
      throw fail(503, 'Qamify product ID is invalid.');
    const result = await createQamifyOrder({
      productId: Number(product.external_product_id),
      idempotencyKey: `sasify-${order.id}-${product.external_product_id}`,
      customerEmail: requiresCustomerEmail ? order.customer_email : undefined,
      onExchange,
      apiKey: keys.qamify,
    });
    return {
      delivery: qamifyDelivery(result),
      supplierId: qamifyOrderId(result, order.id),
    };
  }
  if (product.provider_id === 'mke') {
    if (!/^\d+$/.test(String(product.external_product_id || '')))
      throw fail(503, 'MKE Shop product ID is invalid.');
    const result = await createMkeOrder({
      productId: Number(product.external_product_id),
      idempotencyKey: `sasify-${order.id}-${product.external_product_id}`,
      customerEmail: requiresCustomerEmail ? order.customer_email : undefined,
      onExchange,
      apiKey: keys.mke,
    });
    return {
      delivery: mkeDelivery(result),
      supplierId: mkeOrderId(result, order.id),
    };
  }
  if (['piggyai', 'fatbunny'].includes(product.provider_id)) {
    if (!String(product.external_product_id || '').trim())
      throw fail(
        503,
        `${product.provider_name || 'PiggyAi'} product ID is invalid.`,
      );
    const envName =
      product.provider_id === 'fatbunny' ||
      product.provider_name === 'Fat Bunny Hub'
        ? 'FATBUNNY_API_KEY'
        : 'PIGGYAI_API_KEY';
    const result = await createPiggyAiOrder({
      productId: product.external_product_id,
      idempotencyKey: `sasify-${order.id}-${product.external_product_id}`,
      customerEmail: requiresCustomerEmail ? order.customer_email : undefined,
      envName,
      onExchange,
      apiKey: keys[product.provider_id],
    });
    return {
      delivery: piggyAiDelivery(result),
      supplierId: piggyAiOrderId(result, order.id),
    };
  }
  if (product.provider_id === 'zoomstore') {
    if (!String(product.external_product_id || '').trim())
      throw fail(503, 'Zoom Store product ID is invalid.');
    const result = await createZoomStoreOrder({
      productId: product.external_product_id,
      idempotencyKey: `sasify-${order.id}-${product.external_product_id}`,
      customerEmail: requiresCustomerEmail ? order.customer_email : undefined,
      onExchange,
      apiKey: keys.zoomstore,
    });
    return {
      delivery: zoomStoreDelivery(result),
      supplierId: zoomStoreOrderId(result, order.id),
    };
  }
  if (product.provider_id === 'elitetools') {
    const externalProductId = String(
      product.external_product_id || product.id || '',
    ).trim();
    if (!externalProductId)
      throw fail(503, 'Elite Tools Store product ID is invalid.');
    const result = await createEliteToolsOrder({
      productId: externalProductId,
      quantity: 1,
      idempotencyKey: `sasify-${order.id}-${externalProductId}`,
      onExchange,
      apiKey: keys.elitetools,
    });
    return {
      delivery: eliteToolsDelivery(result),
      supplierId: eliteToolsOrderId(result, order.id),
    };
  }
  if (['dodi', 'dody'].includes(product.provider_id)) {
    const result = await createSupplierOrder({
      productId: product.external_product_id || product.id,
      externalOrderId: order.id,
      customerEmail: requiresCustomerEmail ? order.customer_email : undefined,
      onExchange,
      apiKey: keys.dodi,
    });
    return {
      delivery: supplierDelivery(result),
      supplierId: supplierOrderId(result, order.id),
    };
  }
  throw fail(503, 'Supplier provider is not supported.');
}
async function fulfill(
  db,
  orderId,
  paymentId,
  manual = false,
  onSupplierExchange,
  supplierApiKeys = {},
) {
  const supplierLogs = [];
  const order = (
    await db.query('SELECT * FROM commerce_orders WHERE id=$1 FOR UPDATE', [
      orderId,
    ])
  ).rows[0];
  const payment = (
    await db.query('SELECT * FROM commerce_payments WHERE id=$1 FOR UPDATE', [
      paymentId,
    ])
  ).rows[0];
  if (!order || !payment) throw fail(404, 'Order or payment not found.');
  if (order.status === 'delivered' && payment.order_id === order.id) return;
  if (
    !(
      manual ? ['pending', 'review', 'expired'] : ['pending', 'review']
    ).includes(order.status)
  )
    throw fail(409, 'Order needs manual review; reservation has expired.');
  if (
    payment.order_id ||
    payment.wallet_deposit_id ||
    !paymentMatchesOrder(payment, order) ||
    !payment.transaction_id ||
    payment.transaction_id !== order.transaction_id
  )
    throw fail(409, 'Payment ID, amount or allocation does not match.');
  if (
    !manual &&
    (!payment.verified ||
      !payment.received_at ||
      new Date(payment.received_at) < new Date(order.created_at) ||
      new Date(payment.received_at) > new Date(order.expires_at))
  )
    throw fail(409, 'Payment needs manual verification.');
  // Serialize competing claims before consuming the payment or inventory.
  await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
    order.transaction_id,
  ]);
  const claims = (
    await db.query(
      "SELECT id FROM commerce_orders WHERE transaction_id=$1 AND status IN ('pending','review','delivered')",
      [order.transaction_id],
    )
  ).rows;
  if (!manual && claims.length !== 1)
    throw fail(
      409,
      'Multiple orders claim this transaction. Manual review required.',
    );
  if (order.supplier_product_id) {
    const selected = (
      await db.query(
        'SELECT * FROM commerce_supplier_products WHERE id=$1 FOR UPDATE',
        [order.supplier_product_id],
      )
    ).rows[0];
    if (!selected)
      throw fail(409, 'Supplier product is unavailable. Contact support.');
    if (selected.provider_id === 'manual') {
      await db.query(
        'UPDATE commerce_payments SET order_id=$1,verification_reason=$3 WHERE id=$2',
        [order.id, payment.id, manual ? 'manually_approved' : 'verified_manual_fulfillment'],
      );
      await db.query(
        `UPDATE commerce_orders SET status='review',supplier_product_id=$1,
           supplier_status='awaiting_manual_fulfillment',supplier_cost_pkr=0,
           fulfillment_cost_pkr=0 WHERE id=$2`,
        [selected.id, order.id],
      );
      await db.query(
        "INSERT INTO commerce_audit(action,object_id) VALUES('manual_supplier_order_ready',$1)",
        [order.id],
      );
      return { cancelled: true, reason: 'manual_fulfillment' };
    }
    const candidates = (
      await db.query(
        `SELECT * FROM commerce_supplier_products WHERE canonical_key=$1 AND enabled=true AND selling_price IS NOT NULL
      AND selling_price<=$2 AND supplier_stock>0 ORDER BY cost_pkr ASC NULLS LAST,wholesale_price ASC,id FOR UPDATE`,
        [selected.canonical_key, Number(order.listed_amount ?? order.amount)],
      )
    ).rows;
    if (
      !candidates.some((product) => product.id === selected.id) &&
      selected.supplier_stock > 0
    )
      candidates.unshift(selected);
    let placed, product, lastError;
    for (const candidate of candidates) {
      let candidateOutOfStock = false;
      const candidateLogStart = supplierLogs.length;
      for (let attempt = 1; attempt <= SUPPLIER_MAX_FAILURES; attempt++) {
        try {
          placed = await placeSupplierOrder(
            candidate,
            order,
            (exchange) => {
              exchange.orderId = order.id;
              supplierLogs.push(exchange);
              onSupplierExchange?.(exchange);
            },
            supplierApiKeys,
          );
          product = candidate;
          break;
        } catch (error) {
          lastError = error;
          if (error.code === 'out_of_stock') {
            candidateOutOfStock = true;
            await db.query(
              'UPDATE commerce_supplier_products SET supplier_stock=0 WHERE id=$1',
              [candidate.id],
            );
            break;
          }
          // Configuration and validation errors happen before an HTTP exchange;
          // do not turn those into three fake supplier retries.
          if (supplierLogs.length === candidateLogStart) throw error;
          if (attempt < SUPPLIER_MAX_FAILURES) continue;

          await insertSupplierApiLogs(db, supplierLogs);
          await db.query(
            "UPDATE commerce_orders SET status='cancelled',supplier_status='cancelled_after_3_supplier_failures' WHERE id=$1 AND status IN ('pending','review','expired')",
            [order.id],
          );
          await db.query(
            "UPDATE commerce_inventory SET state='available' WHERE id=$1 AND state='reserved'",
            [order.inventory_id],
          );
          await releaseSharedSlot(db, order);
          await releaseCoupon(db, order);
          await db.query(
            "INSERT INTO commerce_audit(action,object_id) VALUES('supplier_auto_cancel_after_3_failures',$1)",
            [order.id],
          );
          return {
            cancelled: true,
            reason: 'supplier_failed_three_times',
          };
        }
      }
      if (placed && product) break;
      if (!candidateOutOfStock) break;
    }
    if (!placed || !product)
      throw (
        lastError ||
        fail(409, 'No supplier has stock for this order. Contact support.')
      );
    const { delivery, supplierId } = placed;
    await insertSupplierApiLogs(db, supplierLogs);
    await db.query(
      'UPDATE commerce_payments SET order_id=$1,verification_reason=$3 WHERE id=$2',
      [
        order.id,
        payment.id,
        manual ? 'manually_approved' : 'verified_and_delivered',
      ],
    );
    await db.query(
      "UPDATE commerce_orders SET status='delivered',delivered_at=now(),supplier_product_id=$1,supplier_cost_pkr=$2,fulfillment_cost_pkr=$2,supplier_order_id=$3,supplier_status='delivered',supplier_delivery=$4 WHERE id=$5",
      [
        product.id,
        product.cost_pkr || 0,
        supplierId,
        encrypt(delivery, process.env.COMMERCE_ENCRYPTION_KEY),
        order.id,
      ],
    );
    await db.query(
      "INSERT INTO commerce_audit(action,object_id) VALUES('supplier_auto_delivery',$1)",
      [order.id],
    );
    return;
  }
  if (order.shared_account_id) {
    if (order.status === 'expired') {
      const replacement = await reserveSharedAccount(db);
      await db.query(
        `UPDATE commerce_orders SET inventory_id=$1,shared_account_id=$2,
           shared_slot=$3,shared_slot_released=false,status='review'
         WHERE id=$4`,
        [replacement.inventoryId, replacement.id, replacement.slot, order.id],
      );
      order.inventory_id = replacement.inventoryId;
      order.shared_account_id = replacement.id;
      order.shared_slot = replacement.slot;
      order.shared_slot_released = false;
      order.status = 'review';
    }
    const assigned = (
      await db.query(
        `SELECT i.credentials,i.purchase_cost,sa.status AS shared_status
         FROM commerce_inventory i
         INNER JOIN commerce_shared_accounts sa ON sa.inventory_id=i.id
         WHERE i.id=$1 AND sa.id=$2 FOR UPDATE OF i,sa`,
        [order.inventory_id, order.shared_account_id],
      )
    ).rows[0];
    if (!assigned || assigned.shared_status === 'withdrawn')
      throw fail(
        409,
        'The shared account is unavailable. Contact support for a replacement or refund.',
      );
    await db.query(
      'UPDATE commerce_payments SET order_id=$1,verification_reason=$3 WHERE id=$2',
      [
        order.id,
        payment.id,
        manual ? 'manually_approved' : 'verified_and_delivered',
      ],
    );
    await db.query(
      `UPDATE commerce_orders SET status='delivered',delivered_at=now(),
        fulfillment_cost_pkr=$1,supplier_status='shared_account_delivered'
       WHERE id=$2`,
      [sharedSlotCost(assigned.purchase_cost, order.shared_slot), order.id],
    );
    await db.query(
      "INSERT INTO commerce_audit(action,object_id) VALUES('shared_account_delivery',$1)",
      [order.id],
    );
    return;
  }
  if (manual && order.status === 'expired') {
    await reserveReleasedCoupon(db, order);
    const replacement = (
      await db.query(
        `SELECT i.id FROM commerce_inventory i
         WHERE i.product_id=ANY($1::text[]) AND i.state='available'
           AND NOT EXISTS (
             SELECT 1 FROM commerce_shared_accounts shared
             WHERE shared.inventory_id=i.id
           )
           AND NOT EXISTS (
             SELECT 1 FROM commerce_orders active
             WHERE active.inventory_id=i.id AND active.status IN ('pending','review','delivered')
           )
         ORDER BY i.created_at FOR UPDATE OF i SKIP LOCKED LIMIT 1`,
        [localInventoryProductIds(order.product_id)],
      )
    ).rows[0];
    if (!replacement)
      throw fail(
        409,
        'No stock available for this late payment. Restock or arrange a refund.',
      );
    await db.query(
      "UPDATE commerce_inventory SET state='reserved' WHERE id=$1",
      [replacement.id],
    );
    await db.query(
      "UPDATE commerce_orders SET inventory_id=$1,status='review' WHERE id=$2",
      [replacement.id, order.id],
    );
    order.inventory_id = replacement.id;
  }
  let inventoryId = order.inventory_id;
  if (inventoryId) {
    const assigned = (
      await db.query(
        'SELECT id,state FROM commerce_inventory WHERE id=$1 FOR UPDATE',
        [inventoryId],
      )
    ).rows[0];
    if (assigned?.state === 'available') {
      await db.query(
        "UPDATE commerce_inventory SET state='reserved' WHERE id=$1 AND state='available'",
        [inventoryId],
      );
    } else if (assigned?.state !== 'reserved') {
      inventoryId = null;
    }
  }
  if (!inventoryId) {
    const replacement = (
      await db.query(
        `SELECT i.id FROM commerce_inventory i
         WHERE i.product_id=ANY($1::text[]) AND i.state='available'
           AND NOT EXISTS (
             SELECT 1 FROM commerce_shared_accounts shared
             WHERE shared.inventory_id=i.id
           )
           AND NOT EXISTS (
             SELECT 1 FROM commerce_orders active
             WHERE active.inventory_id=i.id AND active.status IN ('pending','review','delivered')
           )
         ORDER BY i.created_at FOR UPDATE OF i SKIP LOCKED LIMIT 1`,
        [localInventoryProductIds(order.product_id)],
      )
    ).rows[0];
    if (replacement) {
      inventoryId = replacement.id;
      await db.query(
        "UPDATE commerce_inventory SET state='reserved' WHERE id=$1 AND state='available'",
        [inventoryId],
      );
      await db.query('UPDATE commerce_orders SET inventory_id=$1 WHERE id=$2', [
        inventoryId,
        order.id,
      ]);
    }
  }
  const changed = await db.query(
    "UPDATE commerce_inventory SET state='delivered' WHERE id=$1 AND state='reserved' RETURNING id",
    [inventoryId],
  );
  if (!changed.rowCount) throw fail(409, 'Reserved stock is unavailable.');
  await db.query(
    'UPDATE commerce_payments SET order_id=$1,verification_reason=$3 WHERE id=$2',
    [
      order.id,
      payment.id,
      manual ? 'manually_approved' : 'verified_and_delivered',
    ],
  );
  await db.query(
    "UPDATE commerce_orders SET status='delivered',delivered_at=now(),fulfillment_cost_pkr=(SELECT purchase_cost FROM commerce_inventory WHERE id=$1) WHERE id=$2",
    [inventoryId, order.id],
  );
  await db.query('INSERT INTO commerce_audit(action,object_id) VALUES($1,$2)', [
    manual ? 'manual_delivery' : 'auto_delivery',
    order.id,
  ]);
}
async function hasVerifiedPaymentForOrder(db, order) {
  const rows = order.transaction_id
    ? (
        await db.query(
          `SELECT 1 FROM commerce_payments
           WHERE verified=true AND order_id IS NULL
             AND (amount=$2 OR (MOD($2,100)<>0 AND amount=$2+1))
             AND (receiver_id=$3 OR receiver_id IS NULL)
             AND (transaction_id=$1 OR (length($1)>=8 AND right(transaction_id,length($1))=$1))
           LIMIT 1`,
          [order.transaction_id, order.amount, order.receiver_id || 'primary'],
        )
      ).rows
    : (
        await db.query(
          `SELECT 1 FROM commerce_payments
           WHERE verified=true AND order_id IS NULL
             AND (amount=$1 OR (MOD($1,100)<>0 AND amount=$1+1))
             AND (receiver_id=$4 OR receiver_id IS NULL)
             AND received_at>=($2::timestamptz) AND received_at<=($3::timestamptz)
           LIMIT 1`,
          [
            order.amount,
            order.created_at,
            order.expires_at,
            order.receiver_id || 'primary',
          ],
        )
      ).rows;
  return rows.length > 0;
}
async function fulfillFreeOrder(db, orderId) {
  const order = (
    await db.query('SELECT * FROM commerce_orders WHERE id=$1 FOR UPDATE', [
      orderId,
    ])
  ).rows[0];
  if (!order || order.amount !== 0 || !order.coupon_id)
    throw fail(409, 'This order is not eligible for a free coupon delivery.');
  if (order.status !== 'pending')
    throw fail(409, 'This free coupon order is already closed.');
  const changed = await db.query(
    "UPDATE commerce_inventory SET state='delivered' WHERE id=$1 AND state='reserved' RETURNING id",
    [order.inventory_id],
  );
  if (!changed.rowCount) throw fail(409, 'Reserved stock is unavailable.');
  await db.query(
    "UPDATE commerce_orders SET status='delivered',delivered_at=now(),fulfillment_cost_pkr=(SELECT purchase_cost FROM commerce_inventory WHERE id=$1) WHERE id=$2",
    [order.inventory_id, order.id],
  );
  await db.query(
    "INSERT INTO commerce_audit(action,object_id) VALUES('coupon_free_delivery',$1)",
    [order.id],
  );
}
async function manualDeliverLocalOrder(db, orderId, inventoryId, key, deliveryContent = '') {
  const order = (
    await db.query('SELECT * FROM commerce_orders WHERE id=$1 FOR UPDATE', [
      orderId,
    ])
  ).rows[0];
  if (!order) throw fail(404, 'Order not found.');
  if (!['pending', 'review'].includes(order.status))
    throw fail(
      409,
      'Only pending or review orders can receive manual delivery.',
    );
  if (order.supplier_product_id) {
    const supplier = (
      await db.query(
        'SELECT provider_id FROM commerce_supplier_products WHERE id=$1',
        [order.supplier_product_id],
      )
    ).rows[0];
    if (supplier?.provider_id !== 'manual')
      throw fail(
        409,
        'Supplier orders must use supplier fulfilment; manual delivery is only available for Sasify manual products.',
      );
    const content = String(deliveryContent || '').trim();
    if (!content || content.length > 20000)
      throw fail(400, 'Enter the delivery details before marking this order done.');
    await db.query(
      `UPDATE commerce_orders SET status='delivered',delivered_at=now(),
         supplier_status='manually_delivered',supplier_cost_pkr=0,
         fulfillment_cost_pkr=0,supplier_delivery=$1 WHERE id=$2`,
      [encrypt({ content }, process.env.COMMERCE_ENCRYPTION_KEY), order.id],
    );
    await db.query(
      "INSERT INTO commerce_audit(action,object_id) VALUES('manual_supplier_delivery',$1)",
      [order.id],
    );
    return { orderId: order.id, delivery: { content } };
  }
  if (order.shared_account_id) {
    const assigned = (
      await db.query(
        `SELECT i.credentials,i.purchase_cost,sa.status AS shared_status
         FROM commerce_inventory i
         INNER JOIN commerce_shared_accounts sa ON sa.inventory_id=i.id
         WHERE i.id=$1 AND sa.id=$2 FOR UPDATE OF i,sa`,
        [order.inventory_id, order.shared_account_id],
      )
    ).rows[0];
    if (!assigned || assigned.shared_status === 'withdrawn')
      throw fail(
        409,
        'The shared account is unavailable. Contact support for a replacement.',
      );
    await db.query(
      `UPDATE commerce_orders SET status='delivered',delivered_at=now(),
        fulfillment_cost_pkr=$1,supplier_status='shared_account_delivered'
       WHERE id=$2`,
      [sharedSlotCost(assigned.purchase_cost, order.shared_slot), order.id],
    );
    await db.query(
      "INSERT INTO commerce_audit(action,object_id) VALUES('manual_admin_shared_delivery',$1)",
      [order.id],
    );
    return {
      orderId: order.id,
      inventoryId: order.inventory_id,
      credentials: decrypt(assigned.credentials, key),
    };
  }
  const allowedProducts = localInventoryProductIds(order.product_id);
  let item = order.inventory_id
    ? (
        await db.query(
          "SELECT * FROM commerce_inventory WHERE id=$1 AND state='reserved' FOR UPDATE",
          [order.inventory_id],
        )
      ).rows[0]
    : null;
  if (!item && inventoryId) {
    if (!idOk(inventoryId)) throw fail(400, 'Invalid inventory ID.');
    item = (
      await db.query(
        'SELECT * FROM commerce_inventory WHERE id=$1 AND product_id=ANY($2::text[]) FOR UPDATE',
        [inventoryId, allowedProducts],
      )
    ).rows[0];
    if (!item) throw fail(404, 'Selected local credential was not found.');
    if (!['available', 'reserved'].includes(item.state))
      throw fail(409, 'Selected credential is not available.');
    if (item.state === 'reserved' && item.id !== order.inventory_id)
      throw fail(409, 'Selected credential is reserved by another order.');
  }
  if (!item)
    item = (
      await db.query(
        `SELECT i.* FROM commerce_inventory i
         WHERE i.product_id=ANY($1::text[]) AND i.state='available'
           AND NOT EXISTS (
             SELECT 1 FROM commerce_shared_accounts shared
             WHERE shared.inventory_id=i.id
           )
           AND NOT EXISTS (
             SELECT 1 FROM commerce_orders active
             WHERE active.inventory_id=i.id AND active.status IN ('pending','review','delivered')
           )
         ORDER BY i.created_at FOR UPDATE OF i SKIP LOCKED LIMIT 1`,
        [allowedProducts],
      )
    ).rows[0];
  if (!item) throw fail(409, 'No local credentials are available.');
  if (item.state === 'available')
    await db.query(
      "UPDATE commerce_inventory SET state='reserved' WHERE id=$1 AND state='available'",
      [item.id],
    );
  const changed = await db.query(
    "UPDATE commerce_inventory SET state='delivered' WHERE id=$1 AND state='reserved' RETURNING id",
    [item.id],
  );
  if (!changed.rowCount)
    throw fail(409, 'Selected credential is no longer available.');
  await db.query(
    "UPDATE commerce_orders SET inventory_id=$1,status='delivered',delivered_at=now(),fulfillment_cost_pkr=$2 WHERE id=$3",
    [item.id, item.purchase_cost, order.id],
  );
  await db.query(
    "INSERT INTO commerce_audit(action,object_id) VALUES('manual_admin_delivery',$1)",
    [order.id],
  );
  return {
    orderId: order.id,
    inventoryId: item.id,
    credentials: decrypt(item.credentials, key),
  };
}
async function attachPaymentForManualApproval(db, orderId, paymentId) {
  const order = (
    await db.query('SELECT * FROM commerce_orders WHERE id=$1 FOR UPDATE', [
      orderId,
    ])
  ).rows[0];
  const payment = (
    await db.query('SELECT * FROM commerce_payments WHERE id=$1 FOR UPDATE', [
      paymentId,
    ])
  ).rows[0];
  if (!order || !payment) throw fail(404, 'Order or payment not found.');
  if (payment.order_id && payment.order_id !== order.id)
    throw fail(409, 'This payment is already attached to another order.');
  if (!paymentMatchesOrder(payment, order))
    throw fail(409, 'The selected payment amount does not match this order.');
  if (!payment.transaction_id)
    throw fail(
      409,
      'This receipt has no parsed payment reference. Review the receipt or use manual credential delivery after independent verification.',
    );
  if (order.transaction_id && order.transaction_id !== payment.transaction_id)
    throw fail(
      409,
      'The selected receipt does not match the order payment evidence.',
    );
  await db.query(
    `UPDATE commerce_orders SET transaction_id=$1,payment_submitted_at=COALESCE(payment_submitted_at,now()),
      status=CASE WHEN status='expired' THEN 'expired' ELSE 'review' END WHERE id=$2`,
    [payment.transaction_id, order.id],
  );
}
async function listPublicTelegramProducts(db) {
  const localRows = (
    await db.query(
      `SELECT product_id,COUNT(*)::int AS available
       FROM commerce_inventory
       WHERE state='available'
       GROUP BY product_id`,
    )
  ).rows;
  const localAvailability = new Map(
    localRows.map((row) => [row.product_id, Number(row.available || 0)]),
  );
  const local = catalog.map((product) => ({
    ...customerProduct(product),
    available: localAvailability.get(product.id) || 0,
    source: 'local',
  }));
  const supplierRows = (
    await db.query(
      `SELECT id,canonical_key,canonical_manual,name,description,delivery_instruction,selling_price AS price,
              supplier_stock AS available,cost_pkr,wholesale_price,provider_name,
              requires_customer_email
       FROM commerce_supplier_products
       WHERE enabled=true AND selling_price IS NOT NULL
       ORDER BY name LIMIT 5000`,
    )
  ).rows;
  // Keep Telegram's public catalogue aligned with the website stock view:
  // supplier-side ChatGPT Plus records are alternate fulfilment offers for
  // the local ChatGPT listings, not additional customer-facing products.
  // Other ChatGPT products (for example Business or K12) remain visible.
  const supplier = selectLowestSupplierOffers(supplierRows).filter(
    (product) => !isChatGptPlusProduct(product.name),
  );
  const visibleLocal = local.filter(
    (product) =>
      !supplier.some((supplierProduct) =>
        supplierEquivalentProductName(product.name, supplierProduct.name),
      ),
  );
  return [
    ...visibleLocal,
    ...supplier.map((product) => ({
      ...customerProduct(product),
      source: 'supplier',
    })),
  ];
}
async function createTelegramCommerceOrder(db, options, paymentReceiver) {
  await refreshAutomaticSupplierKeys(db);
  const productId = String(options.productId || '').trim();
  let product = catalog.find((item) => item.id === productId);
  let supplierProduct;
  if (!product) {
    const requested = (
      await db.query(
        'SELECT canonical_key FROM commerce_supplier_products WHERE (id=$1 OR canonical_key=$1) AND enabled=true AND selling_price IS NOT NULL',
        [productId],
      )
    ).rows[0];
    if (requested)
      supplierProduct = (
        await db.query(
          `SELECT * FROM commerce_supplier_products
           WHERE canonical_key=$1 AND enabled=true AND selling_price IS NOT NULL
             AND supplier_stock>0
           ORDER BY cost_pkr ASC NULLS LAST,wholesale_price ASC,id
           FOR UPDATE SKIP LOCKED LIMIT 1`,
          [requested.canonical_key],
        )
      ).rows[0];
    if (supplierProduct)
      product = {
        id: supplierProduct.id,
        name: supplierProduct.name,
        description: supplierProduct.description,
        price: supplierProduct.selling_price,
      };
  }
  const selectedPaymentMethod = paymentMethod(
    options.paymentMethod || 'wallet',
  );
  const paymentReceiverForOrder = paymentReceiverForMethod(
    selectedPaymentMethod,
    paymentReceiver,
  );
  const sharedProduct = isSharedChatGptProduct(product?.id);
  if (
    !product ||
    Number(product.price || 0) <= 0 ||
    !paymentReceiverForOrder?.title
  )
    throw fail(409, 'This product is not available for Telegram purchase yet.');
  if (
    ['binance', 'crypto'].includes(selectedPaymentMethod) &&
    (!binanceUsdtPkrRate() || !paymentReceiverForOrder)
  )
    throw fail(503, 'Binance payments are not configured yet.');
  if (supplierProduct && isChatGptPlusProduct(supplierProduct.name))
    throw fail(409, 'ChatGPT Plus is sold from local inventory only.');
  const requiresCustomerEmail = Boolean(
    supplierProduct &&
    (supplierProduct.requires_customer_email ||
      supplierRequiresCustomerEmail(
        supplierProduct,
        supplierProduct.provider_id,
      )),
  );
  const customerEmail = requiresCustomerEmail
    ? (() => {
        try {
          return normalizeCustomerEmail(options.customerEmail);
        } catch (error) {
          throw fail(400, error.message);
        }
      })()
    : null;
  if (requiresCustomerEmail && !customerEmail)
    throw fail(400, 'Email is required for this supplier product.');
  const sessionHash = hash(`telegram:${options.chatId}`);
  const existing = await db.query(
    "SELECT id FROM commerce_orders WHERE session_hash=$1 AND status IN ('pending','review')",
    [sessionHash],
  );
  if (existing.rowCount >= 2)
    throw fail(409, 'Complete or cancel your existing Telegram orders first.');
  let item;
  let sharedAccount;
  if (supplierProduct) {
    if (supplierProduct.supplier_stock < 1)
      throw fail(409, 'Sold out. Please choose another product.');
  } else if (sharedProduct) {
    const shared = await reserveSharedAccount(db);
    item = { id: shared.inventoryId };
    sharedAccount = { id: shared.id, slot: shared.slot };
  } else {
    item = (
      await db.query(
        `SELECT i.id FROM commerce_inventory i
         WHERE i.product_id=ANY($1::text[]) AND i.state='available'
           AND NOT EXISTS (SELECT 1 FROM commerce_shared_accounts shared WHERE shared.inventory_id=i.id)
           AND NOT EXISTS (SELECT 1 FROM commerce_orders active WHERE active.inventory_id=i.id AND active.status IN ('pending','review','delivered'))
         ORDER BY i.created_at FOR UPDATE OF i SKIP LOCKED LIMIT 1`,
        [localInventoryProductIds(product.id)],
      )
    ).rows[0];
    if (!item) throw fail(409, 'Sold out. Please choose another product.');
  }
  const listedAmount = Number(product.price);
  const paymentAmount = await allocatePaymentAmount(db, listedAmount);
  const quote = paymentQuote(selectedPaymentMethod, paymentAmount);
  const id = randomUUID();
  const recovery = randomBytes(32).toString('hex');
  if (item && !sharedAccount)
    await db.query(
      "UPDATE commerce_inventory SET state='reserved' WHERE id=$1",
      [item.id],
    );
  await db.query(
    `INSERT INTO commerce_orders(
       id,product_id,amount,listed_amount,customer_email,recovery_hash,session_hash,
       inventory_id,supplier_product_id,supplier_cost_pkr,payment_method,payment_currency,payment_amount,receiver_id,
       shared_account_id,shared_slot,expires_at,ip_address,telegram_chat_id,telegram_user_id
     ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,now()+($17 * interval '1 minute'),$18,$19,$20)`,
    [
      id,
      product.id,
      paymentAmount,
      listedAmount,
      customerEmail,
      hash(recovery),
      sessionHash,
      item?.id || null,
      supplierProduct?.id || null,
      supplierProduct?.cost_pkr || 0,
      selectedPaymentMethod,
      quote.currency,
      quote.amount,
      paymentReceiverForOrder?.id || null,
      sharedAccount?.id || null,
      sharedAccount?.slot || null,
      PAYMENT_WINDOWS_MINUTES[selectedPaymentMethod],
      `telegram:${String(options.chatId).slice(0, 128)}`,
      String(options.chatId).slice(0, 128),
      String(options.userId || '').slice(0, 128) || null,
    ],
  );
  return {
    id,
    productName: customerProductName(product),
    amount: paymentAmount,
    listedAmount,
    paymentMethod: selectedPaymentMethod,
    paymentCurrency: quote.currency,
    paymentAmount: quote.amount,
    paymentReceiver: ['binance', 'crypto'].includes(selectedPaymentMethod)
      ? paymentReceiverForOrder
      : undefined,
    expiresAt: new Date(
      Date.now() + PAYMENT_WINDOWS_MINUTES[selectedPaymentMethod] * 60000,
    ).toISOString(),
  };
}
function telegramStatusLabel(status) {
  return (
    {
      pending: 'Waiting for payment',
      review: 'Payment received — reviewing',
      delivered: 'Delivered',
      expired: 'Expired',
      cancelled: 'Cancelled',
    }[status] || String(status || 'Unknown')
  );
}
async function getTelegramOrder(db, orderId, chatId) {
  const row = (
    await db.query(
      `SELECT o.id,o.product_id,o.amount,o.status,o.transaction_id,o.payment_submitted_at,o.created_at,o.expires_at,
              COALESCE(sp.name,'') AS supplier_product_name
       FROM commerce_orders o
       LEFT JOIN commerce_supplier_products sp ON sp.id=o.supplier_product_id
       WHERE o.id=$1 AND o.telegram_chat_id=$2`,
      [orderId, String(chatId)],
    )
  ).rows[0];
  if (!row) return null;
  const productName =
    row.supplier_product_name ||
    catalog.find((product) => product.id === row.product_id)?.name ||
    row.product_id;
  const statusDetail =
    row.status === 'delivered'
      ? 'Credentials have been sent in this Telegram chat.'
      : row.status === 'review'
        ? 'Your authenticated receipt is being checked. Delivery will be sent here after approval.'
        : row.status === 'pending'
          ? row.payment_submitted_at
            ? 'Payment was submitted. Waiting for the authenticated receipt to be matched.'
            : 'No payment has been submitted yet. Choose a payment method, send the exact amount, then tap “I have paid”.'
          : row.status === 'expired'
            ? 'This order window has expired. Please create a new order.'
            : 'Contact support if you need help.';
  return {
    ...row,
    productName,
    statusLabel: telegramStatusLabel(row.status),
    statusDetail,
  };
}
async function claimTelegramOrder(db, orderId, chatId) {
  const order = await getTelegramOrder(db, orderId, chatId);
  if (!order)
    throw fail(
      404,
      'Order not found or it is not linked to this Telegram account.',
    );
  if (!['pending', 'review', 'expired'].includes(order.status))
    throw fail(409, 'This order is already closed.');
  await db.query(
    "UPDATE commerce_orders SET payment_submitted_at=COALESCE(payment_submitted_at,now()),status=CASE WHEN status='expired' THEN 'expired' ELSE 'pending' END WHERE id=$1",
    [orderId],
  );
  return order;
}
async function setTelegramPaymentMethod(db, orderId, chatId, method) {
  const normalized = paymentMethod(method);
  const order = await getTelegramOrder(db, orderId, chatId);
  if (!order)
    throw fail(
      404,
      'Order not found or it is not linked to this Telegram account.',
    );
  if (!['pending', 'review'].includes(order.status) || order.transaction_id)
    throw fail(409, 'This order payment method can no longer be changed.');
  const quote = paymentQuote(normalized, order.amount);
  if (normalized === 'crypto' && quote.amount < MIN_BINANCE_USDT)
    throw fail(
      409,
      `Crypto USDT payments require at least USDT ${MIN_BINANCE_USDT.toFixed(2)} for this order. Choose Binance Pay, wallet, or bank transfer.`,
    );
  await db.query(
    "UPDATE commerce_orders SET payment_method=$1,payment_currency=$2,payment_amount=$3,receiver_id=$4,expires_at=GREATEST(expires_at,now()+($5 * interval '1 minute')) WHERE id=$6",
    [
      normalized,
      quote.currency,
      quote.amount,
      ['binance', 'crypto'].includes(normalized) ? null : order.receiver_id,
      PAYMENT_WINDOWS_MINUTES[normalized],
      orderId,
    ],
  );
  return {
    ...order,
    paymentMethod: normalized,
    payment_currency: quote.currency,
    payment_amount: quote.amount,
    paymentCurrency: quote.currency,
    paymentAmount: quote.amount,
    paymentReceiver: ['binance', 'crypto'].includes(normalized)
      ? paymentReceiverForMethod(normalized)
      : undefined,
  };
}
async function listTelegramOrders(db, chatId) {
  const rows = (
    await db.query(
      `SELECT o.id,o.product_id,o.amount,o.status,COALESCE(sp.name,'') AS supplier_product_name
       FROM commerce_orders o LEFT JOIN commerce_supplier_products sp ON sp.id=o.supplier_product_id
       WHERE o.telegram_chat_id=$1 ORDER BY o.created_at DESC LIMIT 10`,
      [String(chatId)],
    )
  ).rows;
  return rows.map((row) => ({
    ...row,
    productName:
      row.supplier_product_name ||
      catalog.find((product) => product.id === row.product_id)?.name ||
      row.product_id,
    statusLabel: telegramStatusLabel(row.status),
  }));
}
async function queueTelegramDelivery(db, orderId, key, queue) {
  const row = (
    await db.query(
      `SELECT o.*,COALESCE(sp.name,o.product_id) AS product_name,sp.delivery_instruction,i.credentials
       FROM commerce_orders o
       LEFT JOIN commerce_supplier_products sp ON sp.id=o.supplier_product_id
       LEFT JOIN commerce_inventory i ON i.id=o.inventory_id
       WHERE o.id=$1 AND o.status='delivered'`,
      [orderId],
    )
  ).rows[0];
  if (!row?.telegram_chat_id) return;
  let credentials = row.credentials ? decrypt(row.credentials, key) : null;
  if (row.shared_account_id && credentials) {
    credentials = Object.fromEntries(
      Object.entries(credentials).filter(([field]) => field !== 'twoFactor'),
    );
  }
  const delivery = row.supplier_delivery
    ? decrypt(row.supplier_delivery, key)
    : null;
  const localInstructions = row.supplier_product_id
    ? ''
    : row.shared_account_id
      ? 'Login with the Email and Password above. Shared-account 2FA is handled through the account support flow. Do not change the password or 2FA settings.'
      : 'Login with the Email and Password above. If an authenticator code is requested, use the 2FA Key above in your authenticator app. Transfer the account to your personal email after login and do not change the supplied password or 2FA settings.';
  queue.push({
    chatId: row.telegram_chat_id,
    text: formatTelegramDelivery({
      productName: row.product_name,
      credentials,
      delivery,
      instructions: row.delivery_instruction || localInstructions,
    }),
  });
}
async function getTelegramSession(db, chatId) {
  return (
    (
      await db.query(
        'SELECT state FROM commerce_telegram_sessions WHERE chat_id=$1',
        [String(chatId)],
      )
    ).rows[0]?.state || null
  );
}
async function setTelegramSession(db, chatId, state) {
  await db.query(
    `INSERT INTO commerce_telegram_sessions(chat_id,state,updated_at)
     VALUES($1,$2::jsonb,now())
     ON CONFLICT(chat_id) DO UPDATE SET state=EXCLUDED.state,updated_at=now()`,
    [String(chatId), JSON.stringify(state || {})],
  );
}
async function clearTelegramSession(db, chatId) {
  const existing = await getTelegramSession(db, chatId);
  if (existing?.language) {
    await db.query(
      `UPDATE commerce_telegram_sessions SET state=$2::jsonb,updated_at=now() WHERE chat_id=$1`,
      [String(chatId), JSON.stringify({ language: existing.language })],
    );
    return;
  }
  await db.query('DELETE FROM commerce_telegram_sessions WHERE chat_id=$1', [
    String(chatId),
  ]);
}
async function setTelegramLanguage(db, chatId, language) {
  const existing = (await getTelegramSession(db, chatId)) || {};
  await setTelegramSession(db, chatId, {
    ...existing,
    language: String(language || 'en')
      .trim()
      .toLowerCase(),
  });
}
export function createHandler(
  poolFactory = () =>
    new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      connectionTimeoutMillis: 10000,
    }),
) {
  let pool;
  let accountSchemaReady;
  const ensureAccountSchema = async (db) => {
    if (!accountSchemaReady) {
      accountSchemaReady = (async () => {
        const lockKey = 'sasify:account-schema';
        await db.query('SELECT pg_advisory_lock(hashtext($1))', [lockKey]);
        try {
          for (const statement of accountSchema
            .split(';')
            .filter((s) => s.trim()))
            await db.query(statement);
        } finally {
          await db.query('SELECT pg_advisory_unlock(hashtext($1))', [lockKey]);
        }
      })().catch((error) => {
        accountSchemaReady = null;
        throw error;
      });
    }
    await accountSchemaReady;
  };
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    const action =
      req.query?.action ||
      new URL(req.url, 'https://www.sasifysolutions.com').searchParams.get(
        'action',
      );
    const key = process.env.COMMERCE_ENCRYPTION_KEY;
    if (!process.env.DATABASE_URL || !/^[a-f0-9]{64}$/i.test(key || ''))
      return json(res, 503, {
        error: String(action || '').startsWith('account-')
          ? 'Account services are not configured in this local preview yet.'
          : ['admin-login', 'admin-list', 'admin-logout'].includes(String(action || ''))
            ? 'Admin services are not configured in this local preview. Add the database and commerce secrets to .env.local to sign in.'
            : 'Online checkout is being prepared. Please contact us on WhatsApp.',
      });
    if (!['GET', 'POST'].includes(req.method))
      return json(res, 405, { error: 'Method not allowed.' });
    const origin = req.headers.origin;
    const vercelOrigin = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : null;
    if (
      origin &&
      ![
        'https://sasifysolutions.com',
        'https://www.sasifysolutions.com',
        vercelOrigin,
        ...(process.env.NODE_ENV !== 'production'
          ? ['http://localhost:4173']
          : []),
      ].filter(Boolean).includes(origin)
    )
      return json(res, 403, { error: 'Invalid origin.' });
    let db;
    const supplierLogs = [];
    const captureSupplierExchange = (exchange) => supplierLogs.push(exchange);
    try {
      pool ||= poolFactory();
      db = await pool.connect();
      let body = req.body || {};
      if (typeof body === 'string') body = JSON.parse(body);
      if (
        JSON.stringify(body).length >
        (action === 'scam-submit'
          ? 4000000
          : action === 'inbound-email'
            ? 2000000
            : 200000)
      )
        throw fail(413, 'Request too large.');
      const adminBearer = bearer(req),
        adminSession = adminCookie(req),
        teamBearer = bearer(req),
        teamSession = teamCookie(req);
      const admin =
        same(adminBearer, process.env.COMMERCE_ADMIN_KEY) ||
        validAdminToken(adminBearer, process.env.COMMERCE_ADMIN_KEY) ||
        validAdminToken(adminSession, process.env.COMMERCE_ADMIN_KEY);
      const teamClaims =
        scopedClaims(teamBearer, process.env.COMMERCE_ADMIN_KEY, 'team') ||
        scopedClaims(teamSession, process.env.COMMERCE_ADMIN_KEY, 'team');
      const team = teamClaims?.role === 'team';
      const profitUnlocked =
        scopedClaims(
          String(req.headers['x-profit-token'] || ''),
          process.env.COMMERCE_ADMIN_KEY,
          'profit',
        )?.role === 'profit';
      await rate(
        db,
        hash(
          `${action}:${req.headers['x-vercel-forwarded-for'] || req.socket?.remoteAddress || 'unknown'}`,
        ),
        action === 'status'
          ? 60
          : action === 'admin-email-campaign'
            ? 2
          : [
                'admin-login',
                'account-login',
                'account-signup',
                'account-send-otp',
                'account-verify-otp',
                'account-request-password-reset',
                'account-reset-password',
              ].includes(action)
            ? 5
            : action === 'scam-submit'
              ? 4
              : action === 'tool-request'
                ? 4
                : 20,
      );
      if (
        action?.startsWith('admin-') &&
        !['admin-login', 'admin-logout'].includes(action) &&
        !admin
      )
        throw fail(401, 'Your admin session is invalid or has expired.');
      if (
        action?.startsWith('team-') &&
        !['team-login', 'team-logout'].includes(action) &&
        !team
      )
        throw fail(401, 'Your team session is invalid or has expired.');
      if (action === 'inbound-email') {
        const requestedInboundProvider = [
          'binance',
          'nayapay',
          'auto',
        ].includes(
          String(req.query?.provider || body.provider || '').toLowerCase(),
        )
          ? String(req.query?.provider || body.provider || '').toLowerCase()
          : 'nayapay';
        if (!inboundEmailAuthConfigured(requestedInboundProvider))
          throw fail(503, 'Inbound email receiver is not configured.');
        if (!inboundEmailAuthorized(req, requestedInboundProvider))
          throw fail(401, 'Invalid inbound email authentication.');
      }
      if (action === 'telegram-webhook' && !telegramWebhookAuthorized(req))
        throw fail(401, 'Invalid Telegram webhook secret.');
      if (
        action === 'public-telegram-webhook' &&
        !publicTelegramWebhookAuthorized(req)
      )
        throw fail(401, 'Invalid public Telegram webhook secret.');
      if (
        [
          'stock',
          'status',
          'google-reviews',
          'google-reviews-sync',
          'scam-reports',
          'scam-report',
          'admin-list',
          'admin-supplier-logs',
          'admin-scam-report',
          'team-stock',
          'account-dashboard',
        ].includes(action)
          ? req.method !== 'GET'
          : req.method !== 'POST'
      )
        throw fail(405, 'Method not allowed.');
      await ensureCouponSchema(db);
      await ensureOrderFinanceSchema(db);
      await ensurePaymentWorkflowSchema(db);
      const paymentReceiver = await activePaymentReceiver(db);
      await ensureSupplierApiLogSchema(db);
      await ensureSupplierSecretSchema(db);
      await ensureSupplierMediaSchema(db);
      // Keep the manual catalogue item present even on warm server instances
      // that initialized the cached schema promise before it was introduced.
      await ensureMuseManualProduct(db);
      await ensureScamSchema(db);
      await ensureToolRequestSchema(db);
      await ensureGoogleReviewSchema(db);
      await ensureInventoryVariants(db);
      await ensureTeamSchema(db);
      await ensureSharedAccountSchema(db);
      await ensureTwoFactorChallengeSchema(db);
      await ensureAccountSchema(db);
      await ensureResellerRequirementSchema(db);
      await db.query('BEGIN');
      const customerAccount = await accountForRequest(db, req);
      await ensureDefaultCoupon(db);
      const supplierApiKeys = await readSupplierApiKeys(db, key);
      await expire(db, action !== 'inbound-email');
      let output;
      const telegramMessages = [];
      const telegramCallbacks = [];
      const telegramEdits = [];
      const publicTelegramMessages = [];
      if (
        ['account-request-password-reset', 'account-reset-password'].includes(
          action,
        )
      ) {
        output = await accountPasswordReset(
          db,
          action,
          body,
          String(req.headers.origin || ''),
        );
      } else if (['account-send-otp', 'account-verify-otp'].includes(action)) {
        output = await signupVerification(db, action, body);
      } else if (
        ['account-signup', 'account-login', 'account-logout'].includes(action)
      ) {
        output = await accountAuth(db, req, res, action, body);
      } else if (action === 'admin-reseller-review') {
        if (
          !idOk(body.accountId) ||
          !['approved', 'rejected'].includes(body.status)
        )
          throw fail(400, 'Select a reseller and a valid review decision.');
        const account = (
          await db.query(
            "SELECT id,email_verified_at,role,reseller_status FROM commerce_accounts WHERE id=$1 AND (reseller_status IN ('pending','approved','rejected')) FOR UPDATE",
            [body.accountId],
          )
        ).rows[0];
        if (!account) throw fail(404, 'Reseller account not found.');
        if (body.status === 'approved' && !account.email_verified_at)
          throw fail(
            409,
            'The reseller must verify their email before approval.',
          );
        await db.query(
          'UPDATE commerce_accounts SET role=$1,reseller_status=$2,reseller_reviewed_at=now() WHERE id=$3',
          [
            body.status === 'approved' ? 'reseller' : 'customer',
            body.status,
            account.id,
          ],
        );
        await db.query(
          'DELETE FROM commerce_account_sessions WHERE account_id=$1',
          [account.id],
        );
        await db.query(
          'INSERT INTO commerce_audit(action,object_id) VALUES($1,$2)',
          [`reseller_${body.status}`, account.id],
        );
        output = { ok: true };
      } else if (action === 'account-apply-reseller') {
        output = await applyForReseller(db, customerAccount);
      } else if (action === 'account-dashboard') {
        const account = requireAccount(customerAccount);
        await syncWalletDeposits(db, account);
        const wallet = (
          await db.query('SELECT balance FROM commerce_accounts WHERE id=$1', [
            account.id,
          ])
        ).rows[0];
        account.balance = wallet?.balance ?? account.balance;
        const orders = (
          await db.query(
            `SELECT o.id,o.product_id,o.amount,o.listed_amount,o.coupon_discount,o.wallet_discount,o.status,o.created_at,o.payment_method,
          p.name AS supplier_name FROM commerce_orders o LEFT JOIN commerce_supplier_products p ON p.id=o.supplier_product_id
          WHERE o.account_id=$1 ORDER BY o.created_at DESC LIMIT 100`,
            [account.id],
          )
        ).rows;
        output = {
          account,
          orders: orders.map((o) => ({
            ...o,
            savings: (() => {
              const referencePrice = Number(
                catalog.find((product) => product.id === o.product_id)
                  ?.original_price_pkr || 0,
              );
              return referencePrice > 0
                ? Math.max(
                    0,
                    referencePrice - Number(o.listed_amount ?? o.amount),
                  )
                : 0;
            })(),
            product:
              catalog.find((p) => p.id === o.product_id)?.name ||
              o.supplier_name ||
              o.product_id,
          })),
          ledger: (
            await db.query(
              'SELECT amount,description,created_at FROM commerce_wallet_ledger WHERE account_id=$1 ORDER BY created_at DESC LIMIT 100',
              [account.id],
            )
          ).rows,
          deposits: (
            await db.query(
              `SELECT d.*,CASE WHEN d.status='pending' AND d.expires_at<=now()
                THEN 'expired' ELSE d.status END AS display_status
               FROM commerce_wallet_deposits d WHERE d.account_id=$1
               ORDER BY d.created_at DESC LIMIT 50`,
              [account.id],
            )
          ).rows.map(({ display_status, ...item }) => ({
            ...item,
            status: display_status,
          })),
        };
        if (account.role === 'reseller' && account.reseller_status === 'approved') {
          const requirements = (await db.query(
            `SELECT r.id,r.tool_name,r.description,r.status,r.created_at,r.updated_at,
                    rr.contact_number AS response_contact,rr.created_at AS responded_at
             FROM commerce_reseller_requirements r
             LEFT JOIN commerce_reseller_requirement_responses rr
               ON rr.requirement_id=r.id AND rr.account_id=$1
             WHERE r.status='open' OR rr.id IS NOT NULL
             ORDER BY CASE WHEN rr.id IS NULL THEN 0 ELSE 1 END,r.created_at DESC`,
            [account.id],
          )).rows;
          output.requirements = requirements;
        } else {
          output.requirements = [];
        }
      } else if (action === 'reseller-requirement-respond') {
        const account = requireAccount(customerAccount);
        if (account.role !== 'reseller' || account.reseller_status !== 'approved')
          throw fail(403, 'Only approved resellers can respond to Sasify requirements.');
        if (!idOk(body.requirementId)) throw fail(400, 'Invalid requirement.');
        const contactNumber = String(body.contactNumber || '').trim();
        if (!/^[+\d][\d\s().-]{6,38}$/.test(contactNumber))
          throw fail(400, 'Enter a valid contact number.');
        const requirement = (await db.query(
          "SELECT id,tool_name,description FROM commerce_reseller_requirements WHERE id=$1 AND status='open'",
          [body.requirementId],
        )).rows[0];
        if (!requirement) throw fail(404, 'This requirement is no longer open.');
        await db.query(
          `INSERT INTO commerce_reseller_requirement_responses(id,requirement_id,account_id,contact_number)
           VALUES($1,$2,$3,$4)
           ON CONFLICT(requirement_id,account_id) DO UPDATE SET contact_number=excluded.contact_number,created_at=now()`,
          [randomUUID(), requirement.id, account.id, contactNumber],
        );
        await db.query("INSERT INTO commerce_audit(action,object_id,details) VALUES('reseller_requirement_response',$1,$2::jsonb)", [requirement.id, JSON.stringify({ accountId: account.id })]);
        const adminEmail = String(process.env.COMMERCE_ADMIN_EMAIL || '').trim();
        if (adminEmail) {
          try {
            await sendAccountEmail({
              to: adminEmail,
              subject: `${requirement.tool_name} — Reseller can provide this`,
              text: `A reseller can provide a requirement you posted.\n\nTool: ${requirement.tool_name}\nRequirement: ${requirement.description}\nReseller: ${account.name} (@${account.username || 'no username'})\nEmail: ${account.email}\nContact number: ${contactNumber}\n\nReview the requirement in the Sasify admin panel.`,
            });
          } catch (error) {
            console.error('[reseller-requirement] admin notification failed', error?.message || error);
          }
        }
        output = { ok: true, message: 'Thanks. Your contact details were sent to Sasify.' };
      } else if (action === 'account-deposit') {
        const account = requireAccount(customerAccount);
        const amount = Number(body.amount);
        const method = paymentMethod(body.method);
        if (!Number.isSafeInteger(amount) || amount < 100 || amount > 1000000)
          throw fail(400, 'Deposit must be between PKR 100 and PKR 1,000,000.');
        const crypto = ['binance', 'crypto'].includes(method);
        const paymentAmount = crypto
          ? Math.ceil((amount / binanceUsdtPkrRate()) * 100) / 100
          : amount;
        if (method === 'crypto' && paymentAmount < MIN_BINANCE_USDT)
          throw fail(
            400,
            'Crypto deposits require at least USDT 6. Choose Binance Pay for a smaller deposit.',
          );
        const receiver = crypto
          ? paymentReceiverForMethod(method)
          : {
              number: paymentReceiver?.account_number,
              title: paymentReceiver?.title,
            };
        if (!receiver?.number)
          throw fail(503, 'This payment method is unavailable.');
        await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
          `wallet-deposit-create:${account.id}`,
        ]);
        let deposit = (
          await db.query(
            `SELECT * FROM commerce_wallet_deposits
             WHERE account_id=$1 AND amount=$2 AND currency=$3 AND payment_amount=$4
               AND method=$5 AND receiver_id=$6 AND status IN ('pending','review')
               AND expires_at>now()
             ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
            [
              account.id,
              amount,
              crypto ? 'USDT' : 'PKR',
              paymentAmount,
              method,
              crypto ? method : paymentReceiver.id,
            ],
          )
        ).rows[0];
        const reused = Boolean(deposit);
        if (!deposit)
          deposit = (
            await db.query(
              `INSERT INTO commerce_wallet_deposits(id,account_id,amount,currency,payment_amount,method,receiver_id,expires_at)
          VALUES($1,$2,$3,$4,$5,$6,$7,now()+interval '5 minutes') RETURNING *`,
              [
                randomUUID(),
                account.id,
                amount,
                crypto ? 'USDT' : 'PKR',
                paymentAmount,
                method,
                crypto ? method : paymentReceiver.id,
              ],
            )
          ).rows[0];
        output = { deposit, receiver, reused };
      } else if (action === 'account-deposit-check') {
        output = await creditDeposit(db, customerAccount, body.id);
      } else if (action === 'account-deposit-cancel') {
        output = await cancelDeposit(db, customerAccount, body.id);
      } else if (action === 'account-wallet-pay') {
        const account = requireAccount(customerAccount);
        if (!idOk(body.id)) throw fail(400, 'Invalid order.');
        const order = (
          await db.query(
            'SELECT * FROM commerce_orders WHERE id=$1 AND account_id=$2 FOR UPDATE',
            [body.id, account.id],
          )
        ).rows[0];
        if (!order) throw fail(404, 'Order not found.');
        if (order.status === 'delivered') {
          const wallet = (
            await db.query('SELECT balance FROM commerce_accounts WHERE id=$1', [
              account.id,
            ])
          ).rows[0];
          output = {
            ok: true,
            status: 'delivered',
            balance: Number(wallet?.balance ?? account.balance ?? 0),
          };
        }
        else {
          if (
            order.status !== 'pending' ||
            order.transaction_id ||
            order.payment_submitted_at ||
            new Date(order.expires_at) <= new Date()
          )
            throw fail(409, 'This order cannot be paid from your wallet.');
          if (order.coupon_id || Number(order.coupon_discount || 0) > 0)
            throw fail(
              409,
              'Coupons cannot be combined with Sasify Wallet payments. Start a new order without a coupon.',
            );
          const walletDiscount = Math.floor(Number(order.amount) * 0.05);
          const payableAmount = Math.max(
            0,
            Number(order.amount) - walletDiscount,
          );
          const debited = await db.query(
            'UPDATE commerce_accounts SET balance=balance-$1 WHERE id=$2 AND balance>=$1 RETURNING id,balance',
            [payableAmount, account.id],
          );
          if (!debited.rows.length)
            throw fail(409, 'Insufficient wallet balance. Add funds first.');
          const paymentId = randomUUID(),
            transaction = `WALLET${randomBytes(16).toString('hex').toUpperCase()}`;
          await db.query(
            "UPDATE commerce_orders SET amount=$1::integer,wallet_discount=$2::integer,transaction_id=$3,payment_currency='PKR',payment_amount=$1::numeric,payment_method='wallet',payment_submitted_at=now() WHERE id=$4",
            [payableAmount, walletDiscount, transaction, order.id],
          );
          await db.query(
            `INSERT INTO commerce_payments(id,event_hash,transaction_id,amount,payment_amount,currency,received_at,verified,subject,encrypted_body)
            VALUES($1,$2,$3,$4::integer,$4::integer,'PKR',now(),true,'Sasify wallet payment',$5)`,
            [
              paymentId,
              hash(transaction),
              transaction,
              payableAmount,
              encrypt({ accountId: account.id, orderId: order.id }, key),
            ],
          );
          const result = await fulfill(
            db,
            order.id,
            paymentId,
            false,
            captureSupplierExchange,
            supplierApiKeys,
          );
          if (result?.cancelled) {
            const restored = await db.query(
              'UPDATE commerce_accounts SET balance=balance+$1 WHERE id=$2 RETURNING balance',
              [payableAmount, account.id],
            );
            output = {
              ok: false,
              status: 'cancelled',
              error: 'Supplier could not deliver. Your wallet was not charged.',
              balance: Number(restored.rows[0]?.balance ?? account.balance ?? 0),
            };
          } else {
            await db.query(
              'INSERT INTO commerce_wallet_ledger(id,account_id,amount,order_id,description) VALUES($1,$2,$3,$4,$5)',
              [
                randomUUID(),
                account.id,
                -payableAmount,
                order.id,
                'Order purchase · 5% wallet discount',
              ],
            );
            output = {
              ok: true,
              status: 'delivered',
              discount: walletDiscount,
              paid: payableAmount,
              balance: Number(debited.rows[0].balance),
            };
          }
        }
      } else if (action === 'admin-login') {
        const email = String(body.email || '')
          .trim()
          .toLowerCase();
        const passwordHash = hash(String(body.password || ''));
        if (
          !same(
            email,
            String(process.env.COMMERCE_ADMIN_EMAIL || '')
              .trim()
              .toLowerCase(),
          ) ||
          !same(passwordHash, process.env.COMMERCE_ADMIN_PASSWORD_HASH)
        )
          throw fail(401, 'Invalid email or password.');
        output = adminToken(process.env.COMMERCE_ADMIN_KEY);
        res.setHeader(
          'Set-Cookie',
          `sasify_admin=${output.token}; HttpOnly; Secure; SameSite=Strict; Path=/api/commerce; Max-Age=28800`,
        );
        await db.query(
          "INSERT INTO commerce_audit(action,object_id) VALUES('admin_login',$1)",
          [hash(email).slice(0, 16)],
        );
      } else if (action === 'admin-logout') {
        res.setHeader(
          'Set-Cookie',
          'sasify_admin=; HttpOnly; Secure; SameSite=Strict; Path=/api/commerce; Max-Age=0',
        );
        output = { ok: true };
      } else if (action === 'telegram-webhook') {
        const callback = telegramCallbackResponse(body);
        if (!callback) {
          output = { ok: true };
        } else {
          const order = (
            await db.query(
              `SELECT o.*,COALESCE(sp.name, o.product_id) AS product_name
               FROM commerce_orders o
               LEFT JOIN commerce_supplier_products sp ON sp.id=o.supplier_product_id
               WHERE o.id=$1 FOR UPDATE OF o`,
              [callback.orderId],
            )
          ).rows[0];
          if (!order) throw fail(404, 'Order not found.');
          if (callback.action === 'approve') {
            if (order.status === 'delivered') {
              output = { ok: true, status: 'delivered', alreadyHandled: true };
            } else {
              if (order.status === 'cancelled')
                throw fail(409, 'This order was rejected or cancelled.');
              const payment = order.transaction_id
                ? (
                    await db.query(
                      `SELECT * FROM commerce_payments
                       WHERE transaction_id=$1 AND order_id IS NULL
                       ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
                      [order.transaction_id],
                    )
                  ).rows[0]
                : null;
              if (!payment)
                throw fail(
                  409,
                  'The customer has not submitted payment evidence yet.',
                );
              if (
                !payment.verified ||
                !TELEGRAM_APPROVAL_REASONS.has(payment.verification_reason)
              )
                throw fail(
                  409,
                  'Telegram approval is available only for an authenticated automatic-delivery fallback.',
                );
              await recordManualApprovalContext(db, payment.id, 'telegram');
              await attachPaymentForManualApproval(db, order.id, payment.id);
              const fulfillment = await fulfill(
                db,
                order.id,
                payment.id,
                true,
                captureSupplierExchange,
                supplierApiKeys,
              );
              if (!fulfillment?.cancelled)
                await queueTelegramDelivery(
                  db,
                  order.id,
                  key,
                  publicTelegramMessages,
                );
              output = fulfillment?.cancelled
                ? { ok: true, status: 'cancelled', reason: fulfillment.reason }
                : { ok: true, status: 'delivered' };
            }
            telegramCallbacks.push({
              id: callback.callback.id,
              text: output.alreadyHandled
                ? 'This order was already delivered.'
                : 'Approved. Credentials have been delivered.',
            });
            telegramEdits.push({
              chatId: callback.callback.message.chat.id,
              messageId: callback.callback.message.message_id,
              text: `✅ Order ${String(order.id).slice(0, 8)} approved. Credentials delivered to the customer.`,
            });
          } else {
            if (order.status === 'delivered')
              throw fail(409, 'This order has already been delivered.');
            if (order.status !== 'cancelled') {
              await db.query(
                "UPDATE commerce_orders SET status='cancelled' WHERE id=$1",
                [order.id],
              );
              await db.query(
                "UPDATE commerce_inventory SET state='available' WHERE id=$1 AND state='reserved'",
                [order.inventory_id],
              );
              await releaseSharedSlot(db, order);
              await releaseCoupon(db, order);
              await db.query(
                "INSERT INTO commerce_audit(action,object_id) VALUES('telegram_reject',$1)",
                [order.id],
              );
            }
            if (order.transaction_id)
              await db.query(
                "UPDATE commerce_payments SET verification_reason='rejected_by_admin' WHERE transaction_id=$1 AND order_id IS NULL",
                [order.transaction_id],
              );
            output = { ok: true, status: 'cancelled' };
            telegramCallbacks.push({
              id: callback.callback.id,
              text: 'Rejected. No credentials were delivered.',
            });
            telegramEdits.push({
              chatId: callback.callback.message.chat.id,
              messageId: callback.callback.message.message_id,
              text: `❌ Order ${String(order.id).slice(0, 8)} rejected. No credentials were delivered.`,
            });
          }
        }
      } else if (action === 'public-telegram-webhook') {
        output = await handleSasifyBotUpdate(body, {
          token: process.env.SASIFY_BOT_TOKEN,
          receiver: paymentReceiver
            ? { ...paymentReceiver, number: paymentReceiver.account_number }
            : null,
          listProducts: () => listPublicTelegramProducts(db),
          getSession: (chatId) => getTelegramSession(db, chatId),
          setSession: (chatId, state) => setTelegramSession(db, chatId, state),
          setLanguage: (chatId, language) =>
            setTelegramLanguage(db, chatId, language),
          clearSession: (chatId) => clearTelegramSession(db, chatId),
          createOrder: async (options) => {
            const order = await createTelegramCommerceOrder(
              db,
              options,
              paymentReceiver,
            );
            telegramMessages.push({
              text: telegramOrderMessage({
                orderId: order.id,
                productName: order.productName,
                amount: order.amount,
                paymentMethod: order.paymentMethod,
              }),
            });
            return order;
          },
          getOrder: ({ orderId, chatId }) =>
            getTelegramOrder(db, orderId, chatId),
          setPaymentMethod: ({ orderId, chatId, method }) =>
            setTelegramPaymentMethod(db, orderId, chatId, method),
          claimOrder: ({ orderId, chatId }) =>
            claimTelegramOrder(db, orderId, chatId),
          listOrders: (chatId) => listTelegramOrders(db, chatId),
        });
      } else if (action === 'admin-team-credentials') {
        const teamEmail = String(body.email || '')
          .trim()
          .toLowerCase();
        const teamPassword = String(body.password || '');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(teamEmail))
          throw fail(400, 'Enter a valid teammate email address.');
        if (teamPassword.length < 8)
          throw fail(400, 'Teammate password must be at least 8 characters.');
        await db.query(
          `INSERT INTO commerce_team_users(id,email,password_hash,enabled)
           VALUES(true,$1,$2,true)
           ON CONFLICT(id) DO UPDATE SET email=excluded.email,password_hash=excluded.password_hash,enabled=true,updated_at=now()`,
          [teamEmail, hash(teamPassword)],
        );
        await db.query(
          "INSERT INTO commerce_audit(action,object_id) VALUES('team_credentials_update',$1)",
          [hash(teamEmail).slice(0, 16)],
        );
        output = { ok: true, configured: true };
      } else if (action === 'admin-profit-unlock') {
        if (!same(hash(String(body.password || '')), PROFIT_PASSWORD_HASH))
          throw fail(401, 'Incorrect profit password.');
        output = {
          ok: true,
          token: profitViewToken(process.env.COMMERCE_ADMIN_KEY),
        };
        await db.query(
          "INSERT INTO commerce_audit(action,object_id) VALUES('profit_unlock',$1)",
          ['admin'],
        );
      } else if (action === 'admin-payment-receiver-switch') {
        const receiverId = String(body.receiverId || '').trim();
        const receiver = (
          await db.query(
            'SELECT id FROM commerce_payment_receivers WHERE id=$1 AND enabled=true',
            [receiverId],
          )
        ).rows[0];
        if (!receiver) throw fail(404, 'Payment receiver not found.');
        await db.query(
          `UPDATE commerce_payment_receiver_state
           SET active_receiver_id=$1,updated_at=now() WHERE id=true`,
          [receiverId],
        );
        await db.query(
          "INSERT INTO commerce_audit(action,object_id) VALUES('payment_receiver_switch',$1)",
          [receiverId],
        );
        output = {
          ok: true,
          activeReceiverId: receiverId,
          paymentReceivers: await listPaymentReceivers(db),
        };
      } else if (action === 'team-login') {
        const teamEmail = String(body.email || '')
          .trim()
          .toLowerCase();
        const teamPasswordHash = hash(String(body.password || ''));
        const teamUser = (
          await db.query(
            'SELECT email,password_hash,enabled FROM commerce_team_users WHERE id=true',
          )
        ).rows[0];
        if (!teamUser)
          throw fail(503, 'Team access has not been configured by the admin.');
        if (
          !teamUser.enabled ||
          !same(teamEmail, teamUser.email) ||
          !same(teamPasswordHash, teamUser.password_hash)
        )
          throw fail(401, 'Invalid team email or password.');
        const token = teamToken(process.env.COMMERCE_ADMIN_KEY, teamUser.email);
        res.setHeader(
          'Set-Cookie',
          `sasify_team=${token}; HttpOnly; Secure; SameSite=Strict; Path=/api/commerce; Max-Age=28800`,
        );
        await db.query(
          "INSERT INTO commerce_audit(action,object_id) VALUES('team_login',$1)",
          [hash(teamUser.email).slice(0, 16)],
        );
        output = { ok: true, token, email: teamUser.email };
      } else if (action === 'team-logout') {
        res.setHeader(
          'Set-Cookie',
          'sasify_team=; HttpOnly; Secure; SameSite=Strict; Path=/api/commerce; Max-Age=0',
        );
        output = { ok: true };
      } else if (action === 'team-stock') {
        const rows = (
          await db.query(
            `SELECT product_id,count(*)::int AS available
             FROM commerce_inventory
              WHERE state='available' AND product_id <> ALL($1::text[])
                AND NOT EXISTS (SELECT 1 FROM commerce_shared_accounts sa WHERE sa.inventory_id=commerce_inventory.id)
             GROUP BY product_id ORDER BY product_id`,
            [RETIRED_LOCAL_PRODUCT_IDS],
          )
        ).rows;
        const sharedRows = (
          await db.query(
            `SELECT COALESCE(SUM(sa.max_slots-sa.slots_filled),0)::int AS available
             FROM commerce_shared_accounts sa
             INNER JOIN commerce_inventory i ON i.id=sa.inventory_id
             WHERE sa.status='active' AND sa.slots_filled<sa.max_slots
               AND i.state IN ('available','reserved','delivered')`,
          )
        ).rows[0];
        output = {
          products: [
            ...rows.map((row) => ({
              productId: row.product_id,
              productName:
                catalog.find((product) => product.id === row.product_id)
                  ?.name || row.product_id,
              available: Number(row.available),
            })),
            ...(Number(sharedRows?.available || 0) > 0
              ? [
                  {
                    productId: SHARED_CHATGPT_PRODUCT_ID,
                    productName:
                      catalog.find(
                        (product) => product.id === SHARED_CHATGPT_PRODUCT_ID,
                      )?.name || SHARED_CHATGPT_PRODUCT_ID,
                    available: Number(sharedRows.available),
                  },
                ]
              : []),
          ],
        };
      } else if (action === 'team-inventory-pick') {
        const productId = String(body.productId || '').trim();
        if (!productId || RETIRED_LOCAL_PRODUCT_IDS.includes(productId))
          throw fail(400, 'Select a valid available stock product.');
        if (productId === SHARED_CHATGPT_PRODUCT_ID) {
          const sharedItem = (
            await db.query(
              `SELECT i.*,sa.id AS shared_account_id,sa.slots_filled,sa.max_slots
               FROM commerce_shared_accounts sa
               INNER JOIN commerce_inventory i ON i.id=sa.inventory_id
               WHERE sa.status='active' AND sa.slots_filled<sa.max_slots
                 AND i.state IN ('available','reserved','delivered')
               ORDER BY sa.created_at,sa.id
               FOR UPDATE OF sa,i SKIP LOCKED LIMIT 1`,
            )
          ).rows[0];
          if (!sharedItem)
            throw fail(409, 'No shared ChatGPT slot is available.');
          const credentials = decrypt(sharedItem.credentials, key);
          const sharedSlot = Number(sharedItem.slots_filled) + 1;
          const reservedShared = await db.query(
            `UPDATE commerce_shared_accounts
             SET slots_filled=$1,
                 status=CASE WHEN $1>=max_slots THEN 'sold' ELSE 'active' END,
                 sold_at=CASE WHEN $1>=max_slots THEN now() ELSE sold_at END
             WHERE id=$2 AND status='active' AND slots_filled<max_slots
             RETURNING id`,
            [sharedSlot, sharedItem.shared_account_id],
          );
          if (!reservedShared.rowCount)
            throw fail(409, 'That shared slot is no longer available.');
          await db.query(
            `INSERT INTO commerce_team_withdrawals(id,inventory_id,team_email,commission_code,commission_amount,shared_slot)
             VALUES($1,$2,$3,$4,$5,$6)`,
            [
              randomUUID(),
              sharedItem.id,
              teamClaims.email,
              TEAM_COUPON_CODE,
              TEAM_COMMISSION_PKR,
              sharedSlot,
            ],
          );
          await db.query(
            "INSERT INTO commerce_audit(action,object_id) VALUES('team_shared_slot_pick',$1)",
            [sharedItem.id],
          );
          output = {
            ok: true,
            productId: SHARED_CHATGPT_PRODUCT_ID,
            productName:
              catalog.find(
                (product) => product.id === SHARED_CHATGPT_PRODUCT_ID,
              )?.name || SHARED_CHATGPT_PRODUCT_ID,
            credentials,
            commission: {
              code: TEAM_COUPON_CODE,
              amountPkr: TEAM_COMMISSION_PKR,
            },
          };
        } else {
          const item = (
            await db.query(
              `SELECT * FROM commerce_inventory
               WHERE product_id=$1 AND state='available'
                 AND NOT EXISTS (SELECT 1 FROM commerce_shared_accounts sa WHERE sa.inventory_id=commerce_inventory.id)
               ORDER BY created_at ASC FOR UPDATE SKIP LOCKED LIMIT 1`,
              [productId],
            )
          ).rows[0];
          if (!item) throw fail(409, 'That stock is no longer available.');
          const credentials = decrypt(item.credentials, key);
          const changed = await db.query(
            "UPDATE commerce_inventory SET state='withdrawn' WHERE id=$1 AND state='available' RETURNING id",
            [item.id],
          );
          if (!changed.rowCount)
            throw fail(409, 'That stock is no longer available.');
          await db.query(
            `INSERT INTO commerce_team_withdrawals(id,inventory_id,team_email,commission_code,commission_amount)
             VALUES($1,$2,$3,$4,$5)`,
            [
              randomUUID(),
              item.id,
              teamClaims.email,
              TEAM_COUPON_CODE,
              TEAM_COMMISSION_PKR,
            ],
          );
          await db.query(
            "INSERT INTO commerce_audit(action,object_id) VALUES('team_inventory_pick',$1)",
            [item.id],
          );
          output = {
            ok: true,
            productId: item.product_id,
            productName:
              catalog.find((product) => product.id === item.product_id)?.name ||
              item.product_id,
            credentials,
            commission: {
              code: TEAM_COUPON_CODE,
              amountPkr: TEAM_COMMISSION_PKR,
            },
          };
        }
      } else if (action === 'stock') {
        await refreshAutomaticSupplierKeys(db);
        const counts = (
          await db.query(
            "SELECT i.product_id,count(*)::int AS available FROM commerce_inventory i WHERE i.state='available' AND NOT EXISTS (SELECT 1 FROM commerce_shared_accounts sa WHERE sa.inventory_id=i.id) GROUP BY i.product_id",
          )
        ).rows;
        const sharedAvailability = (
          await db.query(
            `SELECT COALESCE(SUM(sa.max_slots-sa.slots_filled),0)::int AS available,
                    COALESCE(SUM(sa.slots_filled),0)::int AS slots_filled,
                    COALESCE(SUM(sa.max_slots),0)::int AS slots_total
             FROM commerce_shared_accounts sa
             INNER JOIN commerce_inventory i ON i.id=sa.inventory_id
             WHERE sa.status='active' AND sa.slots_filled<sa.max_slots
               AND i.state IN ('available','reserved','delivered')`,
          )
        ).rows[0] || { available: 0, slots_filled: 0, slots_total: 0 };
        const supplierOffers = (await db.query(`SELECT id,name,description,delivery_instruction,logo_url,requires_customer_email,selling_price AS price,supplier_stock,external_product_id,provider_id,provider_name,canonical_key,first_seen_at
          FROM commerce_supplier_products WHERE enabled=true AND selling_price IS NOT NULL
          ORDER BY cost_pkr ASC NULLS LAST,wholesale_price ASC,id`)).rows;
        const liveStock = await liveSupplierStock(supplierOffers, supplierProviders(supplierApiKeys));
        const supplierProducts = cheapestLiveOffers(liveStock.offers).filter((product) => !isChatGptPlusProduct(product.name));
        const supplierTotal = Number(
          (
            await db.query(
              "SELECT count(*)::int AS count FROM commerce_supplier_products WHERE lower(name) NOT LIKE '%chatgpt plus%'",
            )
          ).rows[0]?.count || 0,
        );
        const catalogSyncedAt =
          (
            await db.query(
              'SELECT max(synced_at) AS synced_at FROM commerce_supplier_products',
            )
          ).rows[0]?.synced_at || null;
        const visibleCatalog = catalog.filter(
          (product) =>
            product.id !== 'p093-ultra' &&
            !supplierProducts.some((supplier) =>
              supplierEquivalentProductName(product.name, supplier.name),
            ),
        );
        const localCatalog = catalog.filter(
          (product) =>
            !supplierProducts.some((supplier) =>
              supplierEquivalentProductName(product.name, supplier.name),
            ),
        );
        output = {
          products: [
            ...localCatalog.map((p) => ({
              ...customerProduct(p),
              source: 'local',
              ...(p.publishedAt ? { publishedAt: p.publishedAt } : {}),
              available:
                p.id === SHARED_CHATGPT_PRODUCT_ID
                  ? Number(sharedAvailability.available || 0)
                  : p.id === 'p093'
                    ? counts
                        .filter((r) =>
                          ['p093', 'p093-ultra'].includes(r.product_id),
                        )
                        .reduce((total, row) => total + row.available, 0)
                    : counts.find((r) => r.product_id === p.id)?.available || 0,
              ...(p.id === SHARED_CHATGPT_PRODUCT_ID
                ? {
                    shared_slots_filled: Number(
                      sharedAvailability.slots_filled || 0,
                    ),
                    shared_slots_total: Number(
                      sharedAvailability.slots_total || 0,
                    ),
                  }
                : {}),
            })),
            ...supplierProducts.map(({ supplier_stock, external_product_id, ...p }) => ({
              ...customerProduct(p),
              id: p.canonical_key,
              source: 'supplier',
              firstSeenAt: p.first_seen_at,
            })),
          ],
          productCount: visibleCatalog.length + supplierTotal,
          catalogSyncedAt,
          availabilityCheckedAt: liveStock.checkedAt,
          availabilityProviders: liveStock.providers,
          ready: Boolean(paymentReceiver?.title),
          paymentReceiver: paymentReceiver
            ? {
                id: paymentReceiver.id,
                title: paymentReceiver.title,
                number: paymentReceiver.account_number,
              }
            : null,
        };
      } else if (action === 'google-reviews') {
        const sync = (
          await db.query(
            'SELECT total_review_count,average_rating,synced_at FROM commerce_google_review_sync WHERE id=true',
          )
        ).rows[0];
        output = {
          reviews: (
            await db.query(
              'SELECT name,quote,language,rating,excerpt,source_url,profile_url,photo_url,photo_path FROM commerce_google_reviews ORDER BY review_updated_at DESC NULLS LAST,synced_at DESC LIMIT 6',
            )
          ).rows.map(publicGoogleReview),
          totalReviewCount: Number(sync?.total_review_count || 0),
          averageRating: Number(sync?.average_rating || 0),
          syncedAt: sync?.synced_at || null,
        };
      } else if (action === 'google-reviews-sync') {
        if (!cronAuthorized(req, admin))
          throw fail(401, 'Google review sync authorization is invalid.');
        try {
          output = await syncGoogleReviews(db);
        } catch (error) {
          if (
            String(error?.message || '').startsWith(
              'Google reviews configuration is missing',
            )
          )
            throw fail(503, error.message);
          throw error;
        }
      } else if (action === 'scam-reports') {
        output = {
          reports: (
            await db.query(
              "SELECT id,name,description,amount_pkr,identifiers,payment_methods,created_at FROM commerce_scam_reports WHERE status='approved' ORDER BY created_at DESC LIMIT 200",
            )
          ).rows.map(publicScamReportSummary),
        };
      } else if (action === 'scam-report') {
        if (!idOk(req.query?.id)) throw fail(400, 'Invalid report ID.');
        const report = (
          await db.query(
            "SELECT * FROM commerce_scam_reports WHERE id=$1 AND status='approved'",
            [req.query.id],
          )
        ).rows[0];
        if (!report) throw fail(404, 'Scam report not found.');
        output = publicScamReport(report);
      } else if (action === 'scam-submit') {
        let report;
        try {
          report = normalizeScamReport(body);
        } catch (error) {
          throw fail(400, error.message);
        }
        const inserted = await db.query(
          `INSERT INTO commerce_scam_reports(id,name,description,amount_pkr,identifiers,payment_methods,evidence,submitter_contact)
        VALUES($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8) RETURNING id,created_at`,
          [
            randomUUID(),
            report.name,
            report.description,
            report.amountPkr,
            JSON.stringify(report.identifiers),
            JSON.stringify(report.paymentMethods),
            JSON.stringify(report.evidence),
            report.submitterContact || null,
          ],
        );
        await db.query(
          "INSERT INTO commerce_audit(action,object_id) VALUES('scam_report_submit',$1)",
          [inserted.rows[0].id],
        );
        output = {
          ok: true,
          id: inserted.rows[0].id,
          createdAt: inserted.rows[0].created_at,
        };
      } else if (action === 'tool-request') {
        let request;
        try {
          request = normalizeToolRequest(body);
        } catch (error) {
          throw fail(400, error.message);
        }
        const inserted = await db.query(
          `INSERT INTO commerce_tool_requests(id,tool_name,requirement,priority,contact_number)
           VALUES($1,$2,$3,$4,$5) RETURNING id,created_at`,
          [
            randomUUID(),
            request.toolName,
            request.requirement,
            request.priority,
            request.contactNumber,
          ],
        );
        await db.query(
          "INSERT INTO commerce_audit(action,object_id) VALUES('tool_request_submit',$1)",
          [inserted.rows[0].id],
        );
        output = {
          ok: true,
          id: inserted.rows[0].id,
          createdAt: inserted.rows[0].created_at,
        };
      } else if (action === 'create') {
        await refreshAutomaticSupplierKeys(db);
        const selectedPaymentMethod = paymentMethod(body.paymentMethod);
        const paymentWindowMinutes =
          PAYMENT_WINDOWS_MINUTES[selectedPaymentMethod];
        let product = catalog.find((p) => p.id === body.productId);
        let supplierProduct;
        if (!product) {
          const requested = (
            await db.query(
              'SELECT canonical_key FROM commerce_supplier_products WHERE (id=$1 OR canonical_key=$1) AND enabled=true AND selling_price IS NOT NULL',
              [body.productId],
            )
          ).rows[0];
          if (requested)
            supplierProduct = (
              await db.query(
                `SELECT * FROM commerce_supplier_products WHERE canonical_key=$1 AND enabled=true AND selling_price IS NOT NULL
          AND supplier_stock>0 ORDER BY cost_pkr ASC NULLS LAST,wholesale_price ASC,id FOR UPDATE SKIP LOCKED LIMIT 1`,
                [requested.canonical_key],
              )
            ).rows[0];
          if (supplierProduct)
            product = {
              id: supplierProduct.id,
              name: supplierProduct.name,
              price: supplierProduct.selling_price,
            };
        }
        const sharedProduct = isSharedChatGptProduct(product?.id);
        const requestedCouponCode = normalizeCouponCode(body.couponCode);
        const usingSasifyWallet = body.useSasifyWallet === true;
        if (usingSasifyWallet && requestedCouponCode)
          throw fail(
            409,
            'Coupons cannot be combined with Sasify Wallet payments. Remove the coupon or choose another payment method.',
          );
        const isRequestedTeamCoupon = requestedCouponCode === TEAM_COUPON_CODE;
        if (
          isRequestedTeamCoupon &&
          !TEAM_COUPON_ENABLED &&
          !isSharedChatGptProduct(product?.id)
        )
          throw fail(409, 'The HOR coupon is currently disabled.');
        if (
          !product ||
          (!paymentReceiver?.title &&
            !['binance', 'crypto'].includes(selectedPaymentMethod) &&
            !isRequestedTeamCoupon)
        )
          throw fail(
            409,
            'Online purchasing is not available for this product yet.',
          );
        if (
          ['binance', 'crypto'].includes(selectedPaymentMethod) &&
          (!paymentReceiverForMethod(selectedPaymentMethod) ||
            !binanceUsdtPkrRate())
        )
          throw fail(503, 'Binance payments are not configured yet.');
        if (supplierProduct && isChatGptPlusProduct(supplierProduct.name))
          throw fail(409, 'ChatGPT Plus is sold from local inventory only.');
        const requiresCustomerEmail = Boolean(
          supplierProduct &&
          (supplierProduct.requires_customer_email ||
            supplierRequiresCustomerEmail(
              supplierProduct,
              supplierProduct.provider_id,
            )),
        );
        const customerEmail = requiresCustomerEmail
          ? (() => {
              try {
                return normalizeCustomerEmail(body.customerEmail);
              } catch (error) {
                throw fail(400, error.message);
              }
            })()
          : null;
        if (requiresCustomerEmail && !customerEmail)
          throw fail(400, 'Email is required for this supplier product.');
        const session =
          String(req.headers.cookie || '').match(
            /(?:^|;\s*)sasify_checkout=([a-f0-9]{64})(?:;|$)/,
          )?.[1] || randomBytes(32).toString('hex');
        const existing = await db.query(
          "SELECT id FROM commerce_orders WHERE session_hash=$1 AND status IN ('pending','review')",
          [hash(session)],
        );
        if (existing.rowCount >= 2)
          throw fail(409, 'Complete or cancel your existing orders first.');
        let item;
        let sharedAccount = null;
        let coupon = null;
        let discount = 0;
        const couponCode = requestedCouponCode;
        const isTeamCoupon = couponCode === TEAM_COUPON_CODE;
        if (couponCode) {
          const sharedHorCoupon = sharedProduct && isTeamCoupon;
          if (
            supplierProduct ||
            (!sharedHorCoupon &&
              (!['p093', 'p093-ultra'].includes(product.id) || sharedProduct))
          )
            throw fail(
              409,
              'Reseller coupons are available for ChatGPT Plus only.',
            );
          coupon = (
            await db.query(
              "SELECT * FROM commerce_coupons WHERE code_hash=$1 AND product_id='p093' AND (enabled=true OR ($2=true AND code_display='HOR')) AND (unlimited=true OR used_count<max_uses) FOR UPDATE",
              [hash(couponCode), sharedHorCoupon],
            )
          ).rows[0];
          if (!coupon)
            throw fail(409, 'Invalid, disabled or fully used coupon code.');
          discount = sharedHorCoupon
            ? 0
            : couponDiscount(product.price, coupon.discount_percent);
          if (discount === product.price && !isTeamCoupon)
            throw fail(409, 'Only the HOR team code can provide free access.');
        }
        if (supplierProduct) {
          if (supplierProduct.supplier_stock < 1)
            throw fail(409, 'Sold out. Please contact us on WhatsApp.');
        } else if (sharedProduct) {
          const shared = await reserveSharedAccount(db);
          item = { id: shared.inventoryId };
          sharedAccount = { id: shared.id, slot: shared.slot };
        } else {
          item = (
            await db.query(
              `SELECT i.id FROM commerce_inventory i
               WHERE i.product_id=ANY($1::text[]) AND i.state='available'
                 AND NOT EXISTS (
                   SELECT 1 FROM commerce_shared_accounts shared
                   WHERE shared.inventory_id=i.id
                 )
                 AND NOT EXISTS (
                   SELECT 1 FROM commerce_orders active
                   WHERE active.inventory_id=i.id AND active.status IN ('pending','review','delivered')
                 )
               ORDER BY i.created_at FOR UPDATE OF i SKIP LOCKED LIMIT 1`,
              [localInventoryProductIds(product.id)],
            )
          ).rows[0];
          if (!item)
            throw fail(409, 'Sold out. Please contact us on WhatsApp.');
        }
        const listedAmount = product.price - discount;
        const paymentAmount = isTeamCoupon
          ? listedAmount
          : await allocatePaymentAmount(db, listedAmount);
        const quote = paymentQuote(selectedPaymentMethod, paymentAmount);
        const commissionCode = coupon?.code_display || null;
        const commissionRate = isTeamCoupon
          ? 0
          : Number(coupon?.commission_percent || 0);
        const commissionAmount = isTeamCoupon
          ? TEAM_COMMISSION_PKR
          : Math.round((paymentAmount * commissionRate) / 100);
        const id = randomUUID(),
          recovery = randomBytes(32).toString('hex');
        if (item && !sharedAccount)
          await db.query(
            "UPDATE commerce_inventory SET state='reserved' WHERE id=$1",
            [item.id],
          );
        if (coupon)
          await db.query(
            'UPDATE commerce_coupons SET used_count=used_count+1,updated_at=now() WHERE id=$1 AND (unlimited=true OR used_count<max_uses)',
            [coupon.id],
          );
        await db.query(
          `INSERT INTO commerce_orders(id,product_id,amount,listed_amount,customer_email,recovery_hash,session_hash,inventory_id,supplier_product_id,supplier_cost_pkr,coupon_id,coupon_discount,commission_code,commission_rate,commission_amount,payment_method,payment_currency,payment_amount,receiver_id,shared_account_id,shared_slot,expires_at,ip_address)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,now()+($22 * interval '1 minute'),$23)`,
          [
            id,
            product.id,
            paymentAmount,
            listedAmount,
            customerEmail,
            hash(recovery),
            hash(session),
            item?.id || null,
            supplierProduct?.id || null,
            supplierProduct?.cost_pkr || 0,
            coupon?.id || null,
            discount,
            commissionCode,
            commissionRate,
            commissionAmount,
            selectedPaymentMethod,
            quote.currency,
            quote.amount,
            ['binance', 'crypto'].includes(selectedPaymentMethod)
              ? null
              : paymentReceiver.id,
            sharedAccount?.id || null,
            sharedAccount?.slot || null,
            paymentWindowMinutes,
            clientIp(req),
          ],
        );
        if (customerAccount)
          await db.query(
            'UPDATE commerce_orders SET account_id=$1 WHERE id=$2',
            [customerAccount.id, id],
          );
        if (isTeamCoupon && paymentAmount === 0) await fulfillFreeOrder(db, id);
        if (paymentAmount > 0)
          telegramMessages.push({
            text: telegramOrderMessage({
              orderId: id,
              productName: product.name,
              amount: paymentAmount,
              paymentMethod: selectedPaymentMethod,
            }),
          });
        res.setHeader(
          'Set-Cookie',
          `sasify_checkout=${session}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`,
        );
        output = {
          id,
          recovery,
          amount: paymentAmount,
          listedAmount,
          originalAmount: product.price,
          couponDiscount: discount,
          paymentAdjustment: listedAmount - paymentAmount,
          teamCoupon: isTeamCoupon,
          commissionCode,
          commissionAmount,
          paymentMethod: selectedPaymentMethod,
          paymentCurrency: quote.currency,
          paymentAmount: quote.amount,
          paymentWindowMinutes,
        };
      } else if (action === 'shared-2fa-code') {
        if (!idOk(body.id)) throw fail(400, 'Invalid order ID.');
        output = await issueSharedTwoFactorCode(db, req, body.id, key);
      } else if (['status', 'claim', 'cancel'].includes(action)) {
        const id = req.query?.id || body.id;
        if (!idOk(id)) throw fail(404, 'Order not found.');
        const order = (
          await db.query(
            `SELECT o.*,c.code_display AS coupon_code,r.title AS receiver_title,r.account_number AS receiver_number
             FROM commerce_orders o
             LEFT JOIN commerce_coupons c ON c.id=o.coupon_id
             LEFT JOIN commerce_payment_receivers r ON r.id=o.receiver_id
             WHERE o.id=$1 FOR UPDATE OF o`,
            [id],
          )
        ).rows[0];
        if (
          !order ||
          !(
            same(hash(bearer(req)), order.recovery_hash) ||
            (customerAccount && order.account_id === customerAccount.id)
          )
        )
          throw fail(404, 'Order not found or recovery key is incorrect.');
        if (action === 'cancel') {
          if (order.status !== 'pending' || order.transaction_id)
            throw fail(409, 'Contact support to cancel this order.');
          await db.query(
            "UPDATE commerce_orders SET status='cancelled' WHERE id=$1",
            [id],
          );
          await db.query(
            "UPDATE commerce_inventory SET state='available' WHERE id=$1 AND state='reserved'",
            [order.inventory_id],
          );
          await releaseSharedSlot(db, order);
          await releaseCoupon(db, order);
          output = { ok: true };
        } else if (action === 'claim') {
          const ip = clientIp(req);
          if (!PAYMENT_CLAIM_IP_ALLOWLIST.has(ip)) {
            const claimAttempt = (
              await db.query(
                `INSERT INTO commerce_payment_claim_attempts(ip_hash,ip_address,attempts,last_attempt_at)
                 VALUES($1,$2,1,now())
                 ON CONFLICT(ip_hash) DO UPDATE SET ip_address=EXCLUDED.ip_address,attempts=commerce_payment_claim_attempts.attempts+1,last_attempt_at=now()
                 RETURNING attempts`,
                [hash(ip), ip],
              )
            ).rows[0];
            if (Number(claimAttempt.attempts) >= 5)
              throw fail(429, 'Nice Try Hacking Bro Better Luck Next Time :)');
          }
          if (!['pending', 'review', 'expired'].includes(order.status))
            throw fail(409, 'Order is already closed.');
          const submittedTransaction = String(body.transactionId || '').trim();
          const transaction = submittedTransaction
            ? normalizeTransaction(submittedTransaction)
            : null;
          if (
            order.transaction_id &&
            transaction &&
            order.transaction_id !== transaction
          )
            throw fail(
              409,
              'A transaction is already submitted. Contact support for a correction.',
            );
          await db.query(
            "UPDATE commerce_orders SET transaction_id=COALESCE(transaction_id,$1),payment_submitted_at=COALESCE(payment_submitted_at,now()),status=CASE WHEN status='expired' THEN 'expired' ELSE 'pending' END WHERE id=$2",
            [transaction, id],
          );
          // A claim only records a verification request; it does not mark payment
          // as received or deliver anything until a verified receipt is found.
          const matchingPayments = transaction
            ? (
                await db.query(
                  `SELECT id,transaction_id,verified FROM commerce_payments
            WHERE verified=true AND order_id IS NULL
            AND (amount=$2 OR (MOD($2,100)<>0 AND amount=$2+1))
            AND (receiver_id=$3 OR receiver_id IS NULL)
            AND (transaction_id=$1 OR (length($1)>=8 AND right(transaction_id,length($1))=$1))
            ORDER BY (transaction_id=$1) DESC,created_at DESC LIMIT 2`,
                  [transaction, order.amount, order.receiver_id || 'primary'],
                )
              ).rows
            : (
                await db.query(
                  `SELECT id,transaction_id FROM commerce_payments
            WHERE verified=true AND order_id IS NULL
              AND (amount=$1 OR (MOD($1,100)<>0 AND amount=$1+1))
              AND (receiver_id=$4 OR receiver_id IS NULL)
              AND received_at>=($2::timestamptz) AND received_at<=($3::timestamptz)
            ORDER BY received_at ASC LIMIT 2`,
                  [
                    order.amount,
                    order.created_at,
                    order.expires_at,
                    order.receiver_id || 'primary',
                  ],
                )
              ).rows;
          let payment =
            matchingPayments.length === 1 ? matchingPayments[0] : null;
          if (!payment && transaction) {
            payment = (
              await db.query(
                'SELECT id,transaction_id,amount,payment_amount,currency,receiver_id,verified FROM commerce_payments WHERE transaction_id=$1 AND order_id IS NULL FOR UPDATE',
                [transaction],
              )
            ).rows[0];
            if (payment && !paymentMatchesOrder(payment, order))
              throw fail(
                409,
                'This transaction reference belongs to a different amount.',
              );
            if (!payment) {
              payment = (
                await db.query(
                  `INSERT INTO commerce_payments(
                     id,event_hash,transaction_id,amount,received_at,verified,
                     verification_reason,subject,encrypted_body,receiver_id
                   ) VALUES($1,$2,$3,$4,now(),false,'customer_claim_pending_approval',
                     'Customer payment claim',$5,$6)
                   RETURNING id,transaction_id,amount,verified`,
                  [
                    randomUUID(),
                    hash(`customer-claim|${id}|${transaction}`),
                    transaction,
                    order.amount,
                    encrypt(
                      {
                        source: 'customer_claim',
                        orderId: id,
                        transactionId: transaction,
                      },
                      key,
                    ),
                    order.receiver_id || 'primary',
                  ],
                )
              ).rows[0];
            }
          }
          if (!payment) {
            output = {
              ok: true,
              status: 'verification_pending',
              verificationWindowSeconds: PAYMENT_VERIFICATION_GRACE_SECONDS,
            };
          } else {
            await db.query(
              "UPDATE commerce_orders SET transaction_id=COALESCE(transaction_id,$1),payment_submitted_at=COALESCE(payment_submitted_at,now()),status=CASE WHEN status='expired' THEN 'expired' ELSE 'review' END WHERE id=$2",
              [payment.transaction_id, id],
            );
            await db.query(
              'UPDATE commerce_orders SET transaction_id=$1 WHERE id=$2',
              [payment.transaction_id, id],
            );
            const productName =
              catalog.find((p) => p.id === order.product_id)?.name ||
              (
                await db.query(
                  'SELECT name FROM commerce_supplier_products WHERE id=$1 OR canonical_key=$1 ORDER BY id LIMIT 1',
                  [order.supplier_product_id || order.product_id],
                )
              ).rows[0]?.name ||
              order.product_id;
            let automaticallyDelivered = false;
            if (payment.verified) {
              try {
                const fulfillment = await fulfill(
                  db,
                  id,
                  payment.id,
                  false,
                  captureSupplierExchange,
                  supplierApiKeys,
                );
                if (fulfillment?.cancelled)
                  await recordAutoDeliveryFailure(
                    db,
                    payment.id,
                    {
                      code: fulfillment.reason || 'fulfillment_cancelled',
                      message:
                        'Supplier fulfilment was cancelled after repeated failures.',
                    },
                    'claim',
                  );
                automaticallyDelivered = !fulfillment?.cancelled;
                if (!fulfillment?.cancelled)
                  await queueTelegramDelivery(
                    db,
                    id,
                    key,
                    publicTelegramMessages,
                  );
                telegramMessages.push({
                  text: telegramOrderMessage({
                    orderId: id,
                    productName,
                    amount: order.amount,
                    paymentMethod: order.payment_method,
                    status: fulfillment?.cancelled
                      ? 'auto-delivery failed'
                      : 'auto-delivered',
                    transactionId: payment.transaction_id,
                    paymentState: fulfillment?.cancelled
                      ? 'verified receipt; supplier fulfillment failed'
                      : 'verified receipt',
                    autoDelivered: !fulfillment?.cancelled,
                  }),
                });
              } catch (error) {
                console.error(
                  'auto-delivery-error',
                  error.code || error.name || 'delivery_failed',
                  error.message || '',
                );
                await recordAutoDeliveryFailure(db, payment.id, error, 'claim');
                telegramMessages.push({
                  text: telegramOrderMessage({
                    orderId: id,
                    productName,
                    amount: order.amount,
                    paymentMethod: order.payment_method,
                    status: 'auto-delivery failed — manual review',
                    transactionId: payment.transaction_id,
                    paymentState:
                      'verified receipt; delivery fallback required',
                    approvalAvailable: true,
                  }),
                  reply_markup: telegramApprovalKeyboard(id),
                });
              }
            } else {
              telegramMessages.push({
                text: telegramPaymentReviewMessage({
                  orderId: id,
                  amount: order.amount,
                  transactionId: payment.transaction_id,
                  reason: 'customer_claim_unverified',
                }),
              });
            }
            output = {
              ok: true,
              status: automaticallyDelivered ? 'delivered' : 'review',
            };
          }
        } else {
          // Trusted receipts are fulfilled in the inbound/claim paths. A status
          // poll only exposes the result; Telegram remains the fallback for
          // unmatched receipts or delivery failures.
          const orderProduct =
            catalog.find((p) => p.id === order.product_id)?.name ||
            (
              await db.query(
                'SELECT name FROM commerce_supplier_products WHERE id=$1 OR canonical_key=$1 ORDER BY id LIMIT 1',
                [order.supplier_product_id || order.product_id],
              )
            ).rows[0]?.name;
          const sharedState = order.shared_account_id
            ? (
                await db.query(
                  'SELECT slots_filled,max_slots,status FROM commerce_shared_accounts WHERE id=$1',
                  [order.shared_account_id],
                )
              ).rows[0]
            : null;
          const sharedTwoFactorChallenge =
            order.shared_account_id && order.status === 'delivered'
              ? (
                  await db.query(
                    'SELECT id FROM commerce_two_factor_challenges WHERE order_id=$1',
                    [order.id],
                  )
                ).rows[0]
              : null;
          output = {
            id,
            product: orderProduct
              ? customerProductName({
                  id: order.product_id,
                  name: orderProduct,
                })
              : orderProduct,
            amount: order.amount,
            listedAmount: Number(order.listed_amount ?? order.amount),
            originalAmount:
              Number(order.listed_amount ?? order.amount) +
              Number(order.coupon_discount || 0),
            couponDiscount: Number(order.coupon_discount || 0),
            paymentAdjustment:
              Number(order.listed_amount ?? order.amount) - order.amount,
            teamCoupon: order.coupon_code === TEAM_COUPON_CODE,
            status: order.status,
            supplierStatus: order.supplier_status,
            expiresAt: order.expires_at,
            paymentSubmittedAt:
              order.payment_submitted_at ||
              (order.transaction_id ? order.created_at : null),
            createdAt: order.created_at,
            transactionId: order.transaction_id,
            paymentMethod: order.payment_method || 'wallet',
            paymentCurrency: order.payment_currency || 'PKR',
            paymentAmount: Number(order.payment_amount || order.amount || 0),
            paymentWindowMinutes:
              PAYMENT_WINDOWS_MINUTES[order.payment_method] ||
              PAYMENT_WINDOWS_MINUTES.wallet,
            ...(order.shared_account_id
              ? {
                  sharedSlot: Number(order.shared_slot || 0),
                  sharedSlotsFilled: Number(sharedState?.slots_filled || 0),
                  sharedSlotsTotal: Number(
                    sharedState?.max_slots || SHARED_CHATGPT_MAX_SLOTS,
                  ),
                  sharedAccountStatus: sharedState?.status || null,
                }
              : {}),
            ...(order.shared_account_id && order.status === 'delivered'
              ? { twoFactorCodeAvailable: !sharedTwoFactorChallenge }
              : {}),
            payment: {
              number: ['binance', 'crypto'].includes(order.payment_method)
                ? paymentReceiverForMethod(order.payment_method)?.number ||
                  'Configured payment destination'
                : order.receiver_number ||
                  paymentReceiver?.account_number ||
                  '03450485711',
              provider:
                order.payment_method === 'crypto'
                  ? cryptoReceiver()?.provider || 'Crypto'
                  : order.payment_method === 'binance'
                    ? 'Binance Pay'
                    : 'NayaPay',
              title: ['binance', 'crypto'].includes(order.payment_method)
                ? paymentReceiverForMethod(order.payment_method)?.title ||
                  (order.payment_method === 'crypto'
                    ? 'USDT wallet'
                    : 'Binance Pay')
                : order.receiver_title || paymentReceiver?.title,
            },
          };
          if (order.status === 'delivered') {
            if (order.supplier_delivery) {
              output.delivery = decrypt(order.supplier_delivery, key);
              if (output.delivery.instructions)
                output.delivery.instructions = customerProductText(
                  output.delivery.instructions,
                  { id: order.product_id, name: orderProduct },
                );
            } else {
              const item = (
                await db.query(
                  'SELECT credentials FROM commerce_inventory WHERE id=$1',
                  [order.inventory_id],
                )
              ).rows[0];
              const credentials = decrypt(item.credentials, key);
              output.credentials = order.shared_account_id
                ? Object.fromEntries(
                    Object.entries(credentials).filter(
                      ([field]) => field !== 'twoFactor',
                    ),
                  )
                : credentials;
            }
          }
        }
      } else if (action === 'inbound-email') {
        const requestedInboundProvider = String(
          req.query?.provider || body.provider || '',
        ).toLowerCase();
        const subject = String(body.Subject || body.subject || '');
        const isBinanceSubject =
          /\[?Binance\]?\s+(?:Payment\s+Receive\s+Successful|USDT\s+Deposit\s+Confirmed)/i.test(
            subject,
          );
        const inboundProvider =
          requestedInboundProvider === 'binance'
            ? 'binance'
            : requestedInboundProvider === 'auto'
              ? isBinanceSubject
                ? 'binance'
                : 'nayapay'
              : 'nayapay';
        const isBinance = inboundProvider === 'binance';
        const isCrypto =
          isBinance &&
          /\[?Binance\]?\s+USDT\s+Deposit\s+Confirmed/i.test(subject);
        const inboundSender = isBinance
          ? process.env.BINANCE_SENDER
          : process.env.NAYAPAY_SENDER;
        const inbound = await authenticateInboundEmail(
          body,
          inboundSender,
          isBinance
            ? {
                signingDomain: process.env.BINANCE_DKIM_DOMAIN,
                requireDmarc: true,
              }
            : {},
        );
        const email = inbound.email;
        if (
          !email.subject ||
          (typeof email.text !== 'string' && typeof email.html !== 'string')
        )
          throw fail(400, 'Subject and email body required.');
        const signatureValid =
          inboundEmailAuthorized(req, inboundProvider) && inbound.authenticated;
        const autoVerifyEnabled = isBinance
          ? process.env.BINANCE_AUTO_VERIFY === 'true'
          : process.env.NAYAPAY_AUTO_VERIFY === 'true';
        const parsed = isBinance
          ? (isCrypto ? parseBinanceCryptoEmail : parseBinanceEmail)(email, {
              enabled: signatureValid && autoVerifyEnabled,
              sender: inboundSender,
              receiverMailbox: process.env.BINANCE_RECEIVER_EMAIL,
              network: process.env.CRYPTO_USDT_NETWORK,
            })
          : parseEmail(email, {
              enabled: signatureValid && autoVerifyEnabled,
              sender: inboundSender,
              receiver: paymentReceiver?.receiver_marker,
              receiverMailbox: process.env.PAYMENT_RECEIVER_EMAIL,
            });
        const paymentCurrency = isBinance ? 'USDT' : 'PKR';
        const paymentAmount = parsed.amount;
        const storedAmount = isBinance
          ? Number.isFinite(parsed.amount)
            ? Math.round(parsed.amount)
            : null
          : parsed.amount;
        const paymentReceiverId = isBinance
          ? isCrypto
            ? 'crypto'
            : 'binance'
          : paymentReceiver?.id || 'primary';
        const inboundPaymentMethod = isBinance
          ? isCrypto
            ? 'crypto'
            : 'binance'
          : null;
        const verificationReason = parsed.verified
          ? 'verified'
          : !signatureValid
            ? inbound?.reason || 'webhook_signature_invalid'
            : !autoVerifyEnabled
              ? 'automatic_verification_disabled'
              : parsed.reason || 'receipt_format_not_recognized';
        const eventHash = hash(
          `${inboundProvider}|${signatureValid ? 'postmark' : 'untrusted'}|${email.messageId || ''}|${email.subject}|${email.text}|${email.html || ''}`,
        );
        const sourceMessageId =
          String(email.messageId || '')
            .trim()
            .slice(0, 500) || null;
        const encryptedBody = encrypt(
          {
            text: email.text,
            html: email.html || '',
            from: email.from,
            to: email.to || '',
            date: email.date,
          },
          key,
        );
        let inserted = await db.query(
          `INSERT INTO commerce_payments(id,event_hash,source_message_id,transaction_id,amount,payment_amount,currency,payer_name,source_last4,received_at,verified,verification_reason,subject,encrypted_body,receiver_id)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT DO NOTHING RETURNING id`,
          [
            randomUUID(),
            eventHash,
            sourceMessageId,
            signatureValid ? parsed.transaction : null,
            storedAmount,
            paymentAmount,
            paymentCurrency,
            parsed.payer,
            parsed.sourceLast4,
            parsed.received || null,
            parsed.verified,
            verificationReason,
            email.subject.slice(0, 500),
            encryptedBody,
            paymentReceiverId,
          ],
        );
        // A trusted retry can validate a previously recorded, unused receipt.
        // Message IDs deduplicate forwarded deliveries, while transaction IDs
        // merge an earlier receipt record with the newer Postmark record.
        // Prefer the transaction match first so an older row cannot collide
        // with the unique transaction_id constraint during the upgrade.
        if (!inserted.rowCount && parsed.verified)
          inserted = await db.query(
            `UPDATE commerce_payments SET source_last4=$2,payment_amount=$4,currency=$6,verified=true,verification_reason='verified',encrypted_body=$3,receiver_id=$5
        WHERE transaction_id=$1 AND order_id IS NULL AND verified=false AND COALESCE(payment_amount,amount)=$4 AND currency=$6 RETURNING id`,
            [
              parsed.transaction,
              parsed.sourceLast4,
              encryptedBody,
              paymentAmount,
              paymentReceiverId,
              paymentCurrency,
            ],
          );
        if (!inserted.rowCount && parsed.verified)
          inserted = await db.query(
            `UPDATE commerce_payments SET transaction_id=$1,source_last4=$2,payment_amount=$6,currency=$8,verified=true,verification_reason='verified',encrypted_body=$3,receiver_id=$7
        WHERE (event_hash=$4 OR ($5::text IS NOT NULL AND source_message_id=$5::text)) AND order_id IS NULL AND verified=false AND COALESCE(payment_amount,amount)=$6 AND currency=$8 AND transaction_id IS NULL
          AND NOT EXISTS (SELECT 1 FROM commerce_payments existing WHERE existing.transaction_id=$1) RETURNING id`,
            [
              parsed.transaction,
              parsed.sourceLast4,
              encryptedBody,
              eventHash,
              sourceMessageId,
              paymentAmount,
              paymentReceiverId,
              paymentCurrency,
            ],
          );
        if (inserted.rowCount && parsed.verified) {
          const orders = (
            await db.query(
              `SELECT id,product_id,payment_method,payment_currency,payment_amount,supplier_product_id,amount,telegram_chat_id FROM commerce_orders
          WHERE status IN ('pending','review')
            AND (
              ($5='USDT' AND payment_currency='USDT' AND payment_amount=$2 AND payment_method=$6)
              OR
              ($5='PKR' AND COALESCE(payment_currency,'PKR')='PKR' AND (amount=$2 OR (MOD($2-1,100)<>0 AND amount=$2-1)))
            )
            AND $3::timestamptz>=created_at AND $3::timestamptz<=expires_at
          AND (receiver_id=$4 OR receiver_id IS NULL)
          AND (transaction_id IS NULL OR transaction_id=$1 OR (length(transaction_id)>=8 AND right($1,length(transaction_id))=transaction_id))
          AND (payment_submitted_at IS NOT NULL OR transaction_id IS NULL OR transaction_id=$1)`,
              [
                parsed.transaction,
                parsed.amount,
                parsed.received,
                paymentReceiverId,
                paymentCurrency,
                inboundPaymentMethod,
              ],
            )
          ).rows;
          let matchReason =
            orders.length === 1
              ? 'verified_order_match'
              : orders.length > 1
                ? 'verified_multiple_eligible_orders'
                : 'verified_no_eligible_order';
          if (!orders.length) {
            const lateOrder = (
              await db.query(
                `SELECT id FROM commerce_orders
                 WHERE status IN ('pending','review','expired')
                   AND (
                     ($5='USDT' AND payment_currency='USDT' AND payment_amount=$1 AND payment_method=$6)
                     OR
                     ($5='PKR' AND COALESCE(payment_currency,'PKR')='PKR' AND (amount=$1 OR (MOD($1-1,100)<>0 AND amount=$1-1)))
                   )
                   AND $2::timestamptz>=created_at AND $2::timestamptz>expires_at
                   AND (receiver_id=$3 OR receiver_id IS NULL)
                   AND (payment_submitted_at IS NOT NULL OR transaction_id IS NULL OR transaction_id=$4)
                 ORDER BY created_at DESC LIMIT 1`,
                [
                  parsed.amount,
                  parsed.received,
                  paymentReceiverId,
                  parsed.transaction,
                  paymentCurrency,
                  inboundPaymentMethod,
                ],
              )
            ).rows[0];
            if (lateOrder) matchReason = 'verified_after_order_window';
          }
          await db.query(
            'UPDATE commerce_payments SET verification_reason=$1 WHERE id=$2',
            [matchReason, inserted.rows[0].id],
          );
          const walletDepositCredited =
            orders.length === 0
              ? await autoCreditWalletDepositForPayment(
                  db,
                  inserted.rows[0].id,
                )
              : false;
          if (orders.length === 1) {
            await db.query(
              'UPDATE commerce_orders SET transaction_id=$1,payment_submitted_at=COALESCE(payment_submitted_at,$2) WHERE id=$3',
              [parsed.transaction, parsed.received, orders[0].id],
            );
            await db.query(
              "UPDATE commerce_orders SET status=CASE WHEN status='expired' THEN 'expired' ELSE 'review' END WHERE id=$1",
              [orders[0].id],
            );
            const orderProduct =
              catalog.find((p) => p.id === orders[0].product_id)?.name ||
              (
                await db.query(
                  'SELECT name FROM commerce_supplier_products WHERE id=$1 OR canonical_key=$1 ORDER BY id LIMIT 1',
                  [orders[0].supplier_product_id || orders[0].product_id],
                )
              ).rows[0]?.name ||
              orders[0].product_id;
            try {
              const fulfillment = await fulfill(
                db,
                orders[0].id,
                inserted.rows[0].id,
                false,
                captureSupplierExchange,
                supplierApiKeys,
              );
              if (fulfillment?.cancelled)
                await recordAutoDeliveryFailure(
                  db,
                  inserted.rows[0].id,
                  {
                    code: fulfillment.reason || 'fulfillment_cancelled',
                    message:
                      'Supplier fulfilment was cancelled after repeated failures.',
                  },
                  'inbound-email',
                );
              if (!fulfillment?.cancelled)
                await queueTelegramDelivery(
                  db,
                  orders[0].id,
                  key,
                  publicTelegramMessages,
                );
              telegramMessages.push({
                text: telegramOrderMessage({
                  orderId: orders[0].id,
                  productName: orderProduct,
                  amount: parsed.amount,
                  paymentMethod: orders[0].payment_method,
                  status: fulfillment?.cancelled
                    ? 'auto-delivery failed'
                    : 'auto-delivered',
                  transactionId: parsed.transaction,
                  paymentState: fulfillment?.cancelled
                    ? 'verified receipt; supplier fulfillment failed'
                    : 'verified receipt',
                  autoDelivered: !fulfillment?.cancelled,
                }),
              });
            } catch (error) {
              console.error(
                'auto-delivery-error',
                error.code || error.name || 'delivery_failed',
                error.message || '',
              );
              await recordAutoDeliveryFailure(
                db,
                inserted.rows[0].id,
                error,
                'inbound-email',
              );
              telegramMessages.push({
                text: telegramOrderMessage({
                  orderId: orders[0].id,
                  productName: orderProduct,
                  amount: parsed.amount,
                  paymentMethod: orders[0].payment_method,
                  status: 'auto-delivery failed — manual review',
                  transactionId: parsed.transaction,
                  paymentState: 'verified receipt; delivery fallback required',
                  approvalAvailable: true,
                }),
                reply_markup: telegramApprovalKeyboard(orders[0].id),
              });
            }
          } else if (!walletDepositCredited) {
            telegramMessages.push({
              text: telegramPaymentReviewMessage({
                amount: parsed.amount,
                transactionId: parsed.transaction,
                reason: matchReason,
              }),
            });
          }
        }
        await expire(db);
        output = {
          ok: true,
          status: inserted.rowCount ? 'recorded' : 'duplicate',
          ...(inbound
            ? { verified: parsed.verified, authentication: inbound.reason }
            : {}),
        };
      } else if (action === 'admin-import') {
        if (!['p093', 'p093-ultra'].includes(body.productId))
          throw fail(
            400,
            'Local inventory is available for ChatGPT Plus only.',
          );
        const purchaseCost = Number(body.purchaseCost || 0);
        if (!Number.isSafeInteger(purchaseCost) || purchaseCost < 0)
          throw fail(400, 'Enter a valid purchase cost.');
        let rows;
        try {
          rows = parseInventory(body.accounts);
        } catch (e) {
          throw fail(400, e.message);
        }
        for (const row of rows)
          await db.query(
            'INSERT INTO commerce_inventory(id,product_id,email_hash,credentials,purchase_cost) VALUES($1,$2,$3,$4,$5)',
            [
              randomUUID(),
              body.productId,
              hash(row.email),
              encrypt(row, key),
              purchaseCost,
            ],
          );
        await db.query(
          "INSERT INTO commerce_audit(action,object_id) VALUES('stock_import',$1)",
          [String(rows.length)],
        );
        output = { ok: true, imported: rows.length };
      } else if (action === 'admin-shared-add') {
        if (!idOk(body.inventoryId) || body.confirmed !== true)
          throw fail(400, 'Confirm adding this account to the shared pool.');
        const item = (
          await db.query(
            'SELECT * FROM commerce_inventory WHERE id=$1 FOR UPDATE',
            [body.inventoryId],
          )
        ).rows[0];
        if (!item) throw fail(404, 'Inventory account not found.');
        if (!['p093', 'p093-ultra'].includes(item.product_id))
          throw fail(400, 'Only ChatGPT Plus inventory can be shared.');
        if (item.state !== 'available')
          throw fail(
            409,
            'Only available ChatGPT Plus inventory can be shared.',
          );
        const existing = (
          await db.query(
            'SELECT id FROM commerce_shared_accounts WHERE inventory_id=$1',
            [item.id],
          )
        ).rows[0];
        if (existing)
          throw fail(
            409,
            'This account is already assigned to the shared pool.',
          );
        await db.query(
          'INSERT INTO commerce_shared_accounts(id,inventory_id) VALUES($1,$2)',
          [randomUUID(), item.id],
        );
        await db.query(
          "INSERT INTO commerce_audit(action,object_id) VALUES('shared_account_add',$1)",
          [item.id],
        );
        output = {
          ok: true,
          inventoryId: item.id,
          slotsFilled: 0,
          slotsTotal: SHARED_CHATGPT_MAX_SLOTS,
        };
      } else if (action === 'admin-inventory-pick') {
        if (!idOk(body.inventoryId) || body.confirmed !== true)
          throw fail(400, 'Confirm the inventory withdrawal.');
        const item = (
          await db.query(
            'SELECT * FROM commerce_inventory WHERE id=$1 FOR UPDATE',
            [body.inventoryId],
          )
        ).rows[0];
        if (!item) throw fail(404, 'Inventory account not found.');
        if (isRetiredLocalProduct(item.product_id))
          throw fail(410, 'This inventory product has been retired.');
        if (
          (
            await db.query(
              'SELECT 1 FROM commerce_shared_accounts WHERE inventory_id=$1',
              [item.id],
            )
          ).rowCount
        )
          throw fail(
            409,
            'Shared-pool accounts must be managed from the shared-account controls.',
          );
        if (item.state !== 'available')
          throw fail(409, 'Only available inventory can be picked.');
        const credentials = decrypt(item.credentials, key);
        const changed = await db.query(
          "UPDATE commerce_inventory SET state='withdrawn' WHERE id=$1 AND state='available' RETURNING id",
          [item.id],
        );
        if (!changed.rowCount)
          throw fail(409, 'This account is no longer available.');
        await db.query(
          "INSERT INTO commerce_audit(action,object_id) VALUES('inventory_admin_pick',$1)",
          [item.id],
        );
        output = { ok: true, inventoryId: item.id, credentials };
      } else if (action === 'admin-inventory-update') {
        if (!idOk(body.inventoryId)) throw fail(400, 'Invalid inventory ID.');
        const item = (
          await db.query(
            'SELECT * FROM commerce_inventory WHERE id=$1 FOR UPDATE',
            [body.inventoryId],
          )
        ).rows[0];
        if (!item) throw fail(404, 'Inventory account not found.');
        if (isRetiredLocalProduct(item.product_id))
          throw fail(410, 'This inventory product has been retired.');
        if (
          (
            await db.query(
              'SELECT 1 FROM commerce_shared_accounts WHERE inventory_id=$1',
              [item.id],
            )
          ).rowCount
        )
          throw fail(409, 'Shared-pool accounts cannot be edited here.');
        const purchaseCost = Number(body.purchaseCost);
        if (!Number.isSafeInteger(purchaseCost) || purchaseCost < 0)
          throw fail(400, 'Enter a valid purchase cost.');
        const nextState = String(body.state || item.state);
        if (item.state === 'reserved')
          throw fail(
            409,
            'Reserved stock cannot be edited. Cancel its order first.',
          );
        if (item.state === 'withdrawn')
          throw fail(409, 'Withdrawn stock cannot be reopened or edited.');
        if (item.state === 'delivered' && nextState !== 'delivered')
          throw fail(409, 'Delivered stock history cannot be reopened.');
        if (!['available', 'quarantined', 'delivered'].includes(nextState))
          throw fail(400, 'Invalid inventory state.');
        const replacingCredentials = [
          body.email,
          body.password,
          body.twoFactor,
        ].some((value) => String(value || '').trim());
        if (replacingCredentials) {
          if (!['available', 'quarantined'].includes(item.state))
            throw fail(409, 'Delivered credentials cannot be replaced.');
          let row;
          try {
            [row] = parseInventory(
              `${body.email || ''}|${body.password || ''}|${body.twoFactor || ''}`,
            );
          } catch (e) {
            throw fail(400, e.message);
          }
          await db.query(
            'UPDATE commerce_inventory SET email_hash=$1,credentials=$2,purchase_cost=$3,state=$4 WHERE id=$5',
            [
              hash(row.email),
              encrypt(row, key),
              purchaseCost,
              nextState,
              item.id,
            ],
          );
        } else {
          await db.query(
            'UPDATE commerce_inventory SET purchase_cost=$1,state=$2 WHERE id=$3',
            [purchaseCost, nextState, item.id],
          );
        }
        await db.query(
          "INSERT INTO commerce_audit(action,object_id) VALUES('inventory_update',$1)",
          [item.id],
        );
        output = { ok: true };
      } else if (action === 'admin-inventory-delete') {
        if (!idOk(body.inventoryId) || body.confirmed !== true)
          throw fail(400, 'Confirm the inventory deletion.');
        const item = (
          await db.query(
            'SELECT * FROM commerce_inventory WHERE id=$1 FOR UPDATE',
            [body.inventoryId],
          )
        ).rows[0];
        if (!item) throw fail(404, 'Inventory account not found.');
        if (isRetiredLocalProduct(item.product_id))
          throw fail(410, 'This inventory product has been retired.');
        if (
          (
            await db.query(
              'SELECT 1 FROM commerce_shared_accounts WHERE inventory_id=$1',
              [item.id],
            )
          ).rowCount
        )
          throw fail(
            409,
            'Remove this account from the shared pool before deleting it.',
          );
        if (!['available', 'quarantined'].includes(item.state))
          throw fail(
            409,
            'Only available or quarantined stock can be deleted.',
          );
        await db.query(
          "UPDATE commerce_orders SET inventory_id=NULL WHERE inventory_id=$1 AND status IN ('cancelled','expired')",
          [item.id],
        );
        await db.query('DELETE FROM commerce_inventory WHERE id=$1', [item.id]);
        await db.query(
          "INSERT INTO commerce_audit(action,object_id) VALUES('inventory_delete',$1)",
          [item.id],
        );
        output = { ok: true };
      } else if (action === 'admin-supplier-key') {
        const providerId = String(body.providerId || '')
          .trim()
          .toLowerCase();
        if (!SUPPLIER_API_ENV[providerId])
          throw fail(400, 'Unsupported supplier provider.');
        const apiKey = String(body.apiKey || '').trim();
        if (body.remove === true || !apiKey) {
          await db.query(
            'DELETE FROM commerce_supplier_secrets WHERE provider_id=$1',
            [providerId],
          );
          delete supplierApiKeys[providerId];
          await db.query(
            "INSERT INTO commerce_audit(action,object_id) VALUES('supplier_key_remove',$1)",
            [providerId],
          );
          output = {
            ok: true,
            providerId,
            providerName: SUPPLIER_PROVIDER_NAMES[providerId],
            configured: !!process.env[SUPPLIER_API_ENV[providerId]],
            source: process.env[SUPPLIER_API_ENV[providerId]]
              ? 'environment'
              : null,
          };
        } else {
          if (apiKey.length > 500 || /[\r\n]/.test(apiKey))
            throw fail(400, 'Supplier API key is invalid.');
          await db.query(
            `INSERT INTO commerce_supplier_secrets(provider_id,encrypted_api_key)
             VALUES($1,$2) ON CONFLICT(provider_id) DO UPDATE SET encrypted_api_key=excluded.encrypted_api_key,updated_at=now()`,
            [providerId, encrypt(apiKey, key)],
          );
          supplierApiKeys[providerId] = apiKey;
          await db.query(
            "INSERT INTO commerce_audit(action,object_id) VALUES('supplier_key_save',$1)",
            [providerId],
          );
          let synced = 0;
          let seoRebuild;
          if (body.sync === true) {
            const providers = await syncSupplierCatalog(
              db,
              true,
              supplierApiKeys,
              providerId,
            );
            synced = providers.reduce(
              (sum, provider) => sum + provider.synced,
              0,
            );
            seoRebuild = await triggerSupplierSeoRebuild(db);
          }
          output = {
            ok: true,
            providerId,
            providerName: SUPPLIER_PROVIDER_NAMES[providerId],
            configured: true,
            source: 'admin',
            synced,
            ...(body.sync === true ? { seoRebuild } : {}),
          };
        }
      } else if (action === 'admin-supplier-sync') {
        const providers = await syncSupplierCatalog(db, true, supplierApiKeys);
        if (!providers.length)
          throw fail(503, 'No supplier API is configured.');
        const synced = providers.reduce(
          (sum, provider) => sum + provider.synced,
          0,
        );
        const seoRebuild = await triggerSupplierSeoRebuild(db);
        await db.query(
          "INSERT INTO commerce_audit(action,object_id) VALUES('supplier_sync',$1)",
          [String(synced)],
        );
        output = { ok: true, synced, providers, seoRebuild };
      } else if (action === 'admin-supplier-update') {
        const supplierId = String(body.productId || '');
        const sellingPrice = Number(body.sellingPrice),
          costPkr = Number(body.costPkr);
        const canonicalKey = String(body.canonicalKey || '')
          .trim()
          .toLowerCase();
        const productName =
          body.productName === undefined
            ? null
            : String(body.productName).trim();
        const productDescription =
          body.productDescription === undefined
            ? null
            : String(body.productDescription).trim();
        if (
          !supplierId ||
          !Number.isSafeInteger(sellingPrice) ||
          sellingPrice < 1 ||
          !Number.isSafeInteger(costPkr) ||
          costPkr < 0 ||
          !/^[a-z0-9][a-z0-9:_-]{1,199}$/.test(canonicalKey) ||
          (productName !== null &&
            (!productName || productName.length > 300)) ||
          (productDescription !== null && productDescription.length > 20000)
        )
          throw fail(
            400,
            'Enter valid supplier product prices, mapping key, title and description.',
          );
        const changed = await db.query(
          `UPDATE commerce_supplier_products
           SET selling_price=$1,cost_pkr=$2,cost_manual=true,enabled=$3,
               canonical_manual=CASE WHEN canonical_key<>$4 THEN true ELSE canonical_manual END,
               canonical_key=$4,
               name=COALESCE($6,name),
               description=COALESCE($7,description),
               name_manual=CASE WHEN $6 IS NULL THEN name_manual ELSE true END,
               description_manual=CASE WHEN $7 IS NULL THEN description_manual ELSE true END
           WHERE id=$5 RETURNING id`,
          [
            sellingPrice,
            costPkr,
            body.enabled === true,
            canonicalKey,
            supplierId,
            productName,
            productDescription,
          ],
        );
        if (!changed.rowCount)
          throw fail(404, 'Supplier product not found. Sync products first.');
        await db.query(
          "INSERT INTO commerce_audit(action,object_id) VALUES('supplier_product_update',$1)",
          [supplierId],
        );
        output = { ok: true };
      } else if (action === 'admin-supplier-group-update') {
        const productIds = [
          ...new Set(
            (Array.isArray(body.productIds) ? body.productIds : [])
              .map((value) => String(value || '').trim())
              .filter((value) => value && value.length <= 300),
          ),
        ];
        const sellingPrice = Number(body.sellingPrice);
        const productDescription = body.productDescription === undefined
          ? null
          : String(body.productDescription).trim();
        if (
          !productIds.length ||
          productIds.length > 500 ||
          !Number.isSafeInteger(sellingPrice) ||
          sellingPrice < 1 ||
          (productDescription !== null && productDescription.length > 20000)
        )
          throw fail(
            400,
            'Select a valid supplier group and enter a whole PKR selling price.',
          );
        const changed = await db.query(
          `UPDATE commerce_supplier_products
           SET selling_price=$1,
               description=COALESCE($3,description),
               description_manual=CASE WHEN $3 IS NULL THEN description_manual ELSE true END
           WHERE id=ANY($2::text[])
           RETURNING id`,
          [sellingPrice, productIds, productDescription],
        );
        if (!changed.rowCount)
          throw fail(404, 'Supplier group not found. Sync products first.');
        await db.query(
          "INSERT INTO commerce_audit(action,object_id) VALUES('supplier_group_price_update',$1)",
          [hash(productIds.join('|')).slice(0, 32)],
        );
        output = {
          ok: true,
          updated: changed.rowCount,
          missing: productIds.length - changed.rowCount,
        };
      } else if (action === 'admin-scam-report') {
        if (!idOk(req.query?.id || body.id))
          throw fail(400, 'Invalid report ID.');
        const report = (
          await db.query('SELECT * FROM commerce_scam_reports WHERE id=$1', [
            req.query?.id || body.id,
          ])
        ).rows[0];
        if (!report) throw fail(404, 'Scam report not found.');
        output = {
          ...publicScamReport(report),
          submitterContact: report.submitter_contact,
          status: report.status,
          reviewedAt: report.reviewed_at,
        };
      } else if (action === 'admin-user-detail') {
        const accountId = String(body.accountId || req.query?.id || '');
        if (!idOk(accountId)) throw fail(400, 'Invalid account ID.');
        const account = (await db.query(
          `SELECT id,name,email,username,role,balance,created_at,email_verified_at,reseller_status,reseller_reviewed_at
           FROM commerce_accounts WHERE id=$1`, [accountId])).rows[0];
        if (!account) throw fail(404, 'Account not found.');
        const orders = (await db.query(
          `SELECT o.id,o.product_id,o.amount,o.status,o.payment_method,o.payment_currency,o.payment_amount,
             o.transaction_id,o.created_at,o.delivered_at,sp.name AS product_name,sp.provider_name
           FROM commerce_orders o LEFT JOIN commerce_supplier_products sp ON sp.id=o.supplier_product_id
           WHERE o.account_id=$1 ORDER BY o.created_at DESC LIMIT 100`, [accountId])).rows;
        const deposits = (await db.query(
          `SELECT id,amount,currency,payment_amount,method,status,reference,created_at,credited_at,expires_at
           FROM commerce_wallet_deposits WHERE account_id=$1 ORDER BY created_at DESC LIMIT 100`, [accountId])).rows;
        const ledger = (await db.query(
          `SELECT id,amount,description,order_id,deposit_id,created_at FROM commerce_wallet_ledger
           WHERE account_id=$1 ORDER BY created_at DESC LIMIT 100`, [accountId])).rows;
        output = { account, orders, deposits, ledger };
      } else if (action === 'admin-wallet-adjust') {
        const accountId = String(body.accountId || '');
        const amount = Number(body.amount);
        const note = String(body.note || '').trim();
        if (!idOk(accountId) || !Number.isSafeInteger(amount) || amount === 0 || Math.abs(amount) > 1000000 || note.length < 3 || note.length > 300)
          throw fail(400, 'Enter a valid wallet adjustment and reason.');
        const changed = (await db.query(
          'UPDATE commerce_accounts SET balance=balance+$1 WHERE id=$2 AND balance+$1>=0 RETURNING id,balance',
          [amount, accountId])).rows[0];
        if (!changed) throw fail(409, 'Adjustment would make the wallet balance negative.');
        await db.query(
          'INSERT INTO commerce_wallet_ledger(id,account_id,amount,description) VALUES($1,$2,$3,$4)',
          [randomUUID(), accountId, amount, `Admin adjustment: ${note}`],
        );
        await db.query(
          'INSERT INTO commerce_audit(action,object_id,details) VALUES($1,$2,$3::jsonb)',
          ['wallet_adjustment', accountId, JSON.stringify({ amount, note })],
        );
        output = { ok: true, balance: changed.balance };
      } else if (action === 'admin-support-update') {
        const ticketId = String(body.ticketId || '');
        const status = String(body.status || '').trim();
        const reply = body.reply === undefined ? undefined : String(body.reply).trim();
        if (!idOk(ticketId) || !['open','in_progress','resolved','closed'].includes(status) || (reply !== undefined && reply.length > 5000))
          throw fail(400, 'Invalid support update.');
        const updated = (await db.query(
          `UPDATE commerce_admin_support_tickets SET status=$1,admin_reply=COALESCE($2,admin_reply),updated_at=now()
           WHERE id=$3 RETURNING id,status,admin_reply,updated_at`, [status, reply ?? null, ticketId])).rows[0];
        if (!updated) throw fail(404, 'Support ticket not found.');
        await db.query("INSERT INTO commerce_audit(action,object_id) VALUES('support_ticket_update',$1)", [ticketId]);
        output = updated;
      } else if (action === 'admin-settings-update') {
        const settings = body.settings && typeof body.settings === 'object' ? body.settings : {};
        const allowed = ['business_name','default_currency','support_email','auto_verify_receipts'];
        for (const key of allowed) {
          if (settings[key] === undefined) continue;
          const value = String(settings[key]).trim();
          if (value.length > 300) throw fail(400, 'Setting value is too long.');
          await db.query(`INSERT INTO commerce_admin_settings(key,value,updated_at) VALUES($1,$2,now())
            ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=now()`, [key, value]);
        }
        await db.query("INSERT INTO commerce_audit(action,object_id,details) VALUES('admin_settings_update','settings',$1::jsonb)", [JSON.stringify(settings)]);
        output = { ok: true };
      } else if (action === 'admin-email-campaign') {
        const subject = String(body.subject || '').replace(/[\r\n]+/g, ' ').trim();
        const text = String(body.text || '').trim();
        const audience = body.audience === 'verified' ? 'verified' : 'all';
        if (!subject || subject.length > 180 || !text || text.length > 20000)
          throw fail(400, 'Enter a subject and email message within the allowed length.');
        const emailFilter = audience === 'verified' ? 'AND email_verified_at IS NOT NULL' : '';
        const rows = (await db.query(
          `SELECT email FROM commerce_accounts
           WHERE email IS NOT NULL AND trim(email) <> '' ${emailFilter}
           ORDER BY created_at ASC`,
        )).rows;
        const recipients = [...new Set(rows.map((row) => String(row.email || '').trim().toLowerCase()).filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))];
        if (!recipients.length)
          throw fail(409, 'No registered email addresses match this audience.');
        if (recipients.length > 2000)
          throw fail(413, 'This campaign is limited to 2,000 recipients. Narrow the audience first.');
        const sender = String(process.env.GMAIL_SENDER_EMAIL || '').trim();
        if (!sender)
          throw fail(503, 'Gmail sender is not configured for campaigns.');
        const failed = [];
        const batchSize = 50;
        for (let index = 0; index < recipients.length; index += batchSize) {
          const batch = recipients.slice(index, index + batchSize);
          try {
            await sendAccountEmail({
              to: sender,
              bcc: batch,
              subject,
              text,
              html: campaignEmailHtml(text),
            });
          } catch (deliveryError) {
            failed.push(...batch);
            console.error('[email-campaign] batch failed', deliveryError?.message || deliveryError);
          }
        }
        const sent = recipients.length - failed.length;
        await db.query(
          `INSERT INTO commerce_audit(action,object_id,details)
           VALUES('email_campaign_send','marketing',$1::jsonb)`,
          [JSON.stringify({ subject, audience, requested: recipients.length, sent, failed: failed.length })],
        );
        if (!sent)
          throw fail(502, 'The campaign could not be delivered. Check the Gmail sender configuration.');
        output = {
          ok: failed.length === 0,
          requested: recipients.length,
          sent,
          failed: failed.length,
          message: failed.length
            ? `Campaign sent to ${sent} of ${recipients.length} registered email addresses.`
            : `Campaign sent to all ${sent} registered email addresses.`,
        };
      } else if (action === 'admin-product-create') {
        const name = String(body.name || '').trim();
        const description = String(body.description || '').trim();
        const sellingPrice = Number(body.sellingPrice);
        const costPkr = Number(body.costPkr || 0);
        const canonicalKey = String(body.canonicalKey || name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 180);
        if (!name || name.length > 300 || description.length > 20000 || !Number.isSafeInteger(sellingPrice) || sellingPrice < 1 || !Number.isSafeInteger(costPkr) || costPkr < 0 || canonicalKey.length < 2)
          throw fail(400, 'Enter a valid product name, price and catalog key.');
        const id = `manual:${randomUUID()}`;
        const inserted = (await db.query(
          `INSERT INTO commerce_supplier_products(id,name,description,delivery_instruction,wholesale_price,currency,supplier_stock,cost_pkr,provider_id,provider_name,external_product_id,canonical_key,enabled,selling_price,cost_manual,canonical_manual,name_manual,description_manual)
           VALUES($1,$2,$3,'',0,'PKR',0,$4,'manual','Sasify manual catalog',$5,$6,true,$7,true,true,true,true) RETURNING *`,
          [id, name, description, costPkr, id, `manual:${canonicalKey}`, sellingPrice])).rows[0];
        await db.query("INSERT INTO commerce_audit(action,object_id) VALUES('product_create',$1)", [id]);
        output = { ok: true, product: inserted };
      } else if (action === 'admin-product-delete') {
        const productId = String(body.productId || '');
        if (!productId) throw fail(400, 'Invalid product.');
        const changed = await db.query("DELETE FROM commerce_supplier_products WHERE id=$1 AND provider_id='manual' RETURNING id", [productId]);
        if (!changed.rowCount) throw fail(409, 'Only manually created products can be deleted.');
        await db.query("INSERT INTO commerce_audit(action,object_id) VALUES('product_delete',$1)", [productId]);
        output = { ok: true };
      } else if (action === 'admin-list') {
        await refreshAutomaticSupplierKeys(db);
        const adminSettings = Object.fromEntries(
          (await db.query('SELECT key,value FROM commerce_admin_settings ORDER BY key')).rows.map((row) => [row.key, row.value]),
        );
        const inboundUsage = await postmarkInboundUsage();
        const resellerRequirements = (await db.query(
          `SELECT r.id,r.tool_name,r.description,r.status,r.created_at,r.updated_at,
                  COALESCE(jsonb_agg(jsonb_build_object('id',rr.id,'name',a.name,'email',a.email,'username',a.username,'contact_number',rr.contact_number,'created_at',rr.created_at) ORDER BY rr.created_at DESC) FILTER (WHERE rr.id IS NOT NULL),'[]'::jsonb) AS responses
           FROM commerce_reseller_requirements r
           LEFT JOIN commerce_reseller_requirement_responses rr ON rr.requirement_id=r.id
           LEFT JOIN commerce_accounts a ON a.id=rr.account_id
           GROUP BY r.id ORDER BY r.created_at DESC LIMIT 200`,
        )).rows;
        const sharedAccountRows = (
          await db.query(
            `SELECT sa.id,sa.inventory_id,sa.slots_filled,sa.max_slots,sa.status,sa.created_at,sa.sold_at,
                    i.product_id,i.email_hash
             FROM commerce_shared_accounts sa
             INNER JOIN commerce_inventory i ON i.id=sa.inventory_id
             ORDER BY sa.status='active' DESC,sa.created_at DESC`,
          )
        ).rows;
        const sharedByInventory = new Map(
          sharedAccountRows.map((row) => [String(row.inventory_id), row]),
        );
        const inventoryRows = (
          await db.query(
            'SELECT id,product_id,state,purchase_cost,credentials,created_at FROM commerce_inventory WHERE product_id <> ALL($1::text[]) ORDER BY created_at DESC LIMIT 500',
            [RETIRED_LOCAL_PRODUCT_IDS],
          )
        ).rows;
        const inventory = inventoryRows.map((row) => {
          let email = 'Unavailable';
          try {
            email = decrypt(row.credentials, key).email;
          } catch {}
          return {
            id: row.id,
            productId: row.product_id,
            state: row.state,
            purchaseCost: row.purchase_cost,
            email,
            createdAt: row.created_at,
            sharedAccount: sharedByInventory.has(String(row.id))
              ? (() => {
                  const shared = sharedByInventory.get(String(row.id));
                  return {
                    id: shared.id,
                    slotsFilled: Number(shared.slots_filled),
                    slotsTotal: Number(shared.max_slots),
                    status: shared.status,
                  };
                })()
              : null,
          };
        });
        const deliveredProfitRows = (
          await db.query(`SELECT o.amount,o.coupon_discount,o.supplier_product_id,o.supplier_cost_pkr,
            o.shared_account_id,o.shared_slot,o.fulfillment_cost_pkr,
            i.purchase_cost,o.delivered_at,c.code_display
            FROM commerce_orders o
            LEFT JOIN commerce_inventory i ON i.id=o.inventory_id
            LEFT JOIN commerce_coupons c ON c.id=o.coupon_id
            WHERE o.status='delivered'`)
        ).rows;
        const withdrawnProfitRows = (
          await db.query(
            `SELECT product_id,purchase_cost,created_at
            FROM commerce_inventory
            WHERE state='withdrawn' AND product_id <> ALL($1::text[])`,
            [RETIRED_LOCAL_PRODUCT_IDS],
          )
        ).rows;
        const profitSummary = summarizeProfit(
          deliveredProfitRows,
          withdrawnProfitRows,
        );
        const orderCommissions = (
          await db.query(`SELECT o.id AS order_id,o.product_id,o.amount,o.listed_amount,
            o.commission_code,o.commission_rate,o.commission_amount,o.payer_name,
            o.created_at,o.delivered_at
            FROM commerce_orders o
            WHERE o.status='delivered' AND o.commission_amount>0
            ORDER BY o.delivered_at DESC LIMIT 500`)
        ).rows;
        const teamWithdrawals = (
          await db.query(`SELECT tw.id,tw.inventory_id,tw.team_email,tw.commission_code,
            tw.commission_amount,tw.commission_paid,tw.created_at,i.product_id,i.purchase_cost
            FROM commerce_team_withdrawals tw
            INNER JOIN commerce_inventory i ON i.id=tw.inventory_id
            ORDER BY tw.created_at DESC LIMIT 500`)
        ).rows;
        const commissions = [
          ...orderCommissions,
          ...teamWithdrawals.map((row) => ({
            order_id: row.id,
            product_id: row.product_id,
            amount: localProductSellingPrice(row.product_id),
            listed_amount: localProductSellingPrice(row.product_id),
            commission_code: row.commission_code,
            commission_rate: 0,
            commission_amount: row.commission_amount,
            payer_name: row.team_email,
            created_at: row.created_at,
            delivered_at: row.created_at,
            source: 'team stock withdrawal',
          })),
        ];
        const commissionSummary = summarizeCommissions(commissions);
        const activeOrders =
          (
            await db.query(
              "SELECT count(*)::int AS count FROM commerce_orders WHERE status IN ('pending','review')",
            )
          ).rows[0]?.count || 0;
        profitSummary.metrics.active_orders = Number(activeOrders);
        const dashboardMetrics = { ...profitSummary.metrics };
        if (!profitUnlocked)
          for (const field of [
            'profit',
            'monthly_profit',
            'cost',
            'hor_profit_credit',
            'missing_costs',
          ])
            dashboardMetrics[field] = null;
        const profitBreakdown = profitUnlocked
          ? Object.entries(profitSummary.breakdown).map(([source, values]) => ({
              source,
              ...values,
            }))
          : [];
        const coupons = (
          await db.query(
            'SELECT id,code_display,discount_percent,commission_percent,max_uses,used_count,enabled,unlimited,created_at,updated_at FROM commerce_coupons ORDER BY created_at DESC',
          )
        ).rows;
        const commissionOrders = (
          await db.query(
            `SELECT o.id,o.product_id,o.amount,o.coupon_discount,o.delivered_at,
                sp.provider_name AS supplier_name,sp.name AS supplier_product_name
             FROM commerce_orders o
             LEFT JOIN commerce_supplier_products sp ON sp.id=o.supplier_product_id
             INNER JOIN commerce_coupons c ON c.id=o.coupon_id
             WHERE o.status='delivered' AND c.code_display=$1
             ORDER BY o.delivered_at DESC`,
            [TEAM_COUPON_CODE],
          )
        ).rows;
        const teamAccessRow = (
          await db.query(
            'SELECT email,enabled FROM commerce_team_users WHERE id=true',
          )
        ).rows[0];
        output = {
          paymentReceivers: await listPaymentReceivers(db),
          accounts: await adminAccountStats(db),
          metrics: dashboardMetrics,
          dailyFinancials: profitSummary.daily.map((day) =>
            profitUnlocked
              ? day
              : {
                  date: day.date,
                  revenue: day.revenue,
                  profit: null,
                  missingCosts: null,
                },
          ),
          coupons,
          inventory,
          sharedAccounts: sharedAccountRows.map((row) => ({
            id: row.id,
            inventoryId: row.inventory_id,
            productId: row.product_id,
            slotsFilled: Number(row.slots_filled),
            slotsTotal: Number(row.max_slots),
            status: row.status,
            createdAt: row.created_at,
            soldAt: row.sold_at,
          })),
          scamReports: (
            await db.query(
              "SELECT id,name,description,amount_pkr,identifiers,payment_methods,status,created_at,reviewed_at,jsonb_array_length(evidence) AS evidence_count FROM commerce_scam_reports WHERE status <> 'rejected' ORDER BY created_at DESC LIMIT 200",
            )
          ).rows,
          toolRequests: (
            await db.query(
              `SELECT id,tool_name,requirement,priority,contact_number,status,created_at,updated_at
               FROM commerce_tool_requests
               ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'moderate' THEN 1 ELSE 2 END, created_at DESC
               LIMIT 200`,
            )
          ).rows,
          resellerRequirements,
          supportTickets: (
            await db.query(
              `SELECT id,name,email,subject,message,status,admin_reply,created_at,updated_at
               FROM commerce_admin_support_tickets ORDER BY CASE status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,created_at DESC LIMIT 200`,
            )
          ).rows,
          auditLogs: (
            await db.query(
              'SELECT id,action,object_id,details,created_at FROM commerce_audit ORDER BY created_at DESC LIMIT 300',
            )
          ).rows,
          adminSettings,
          postmarkInboundUsage: inboundUsage,
          supplierProducts: (
            await db.query(
              'SELECT * FROM commerce_supplier_products ORDER BY provider_name,name',
            )
          ).rows.map(customerProduct),
          providerStates: (
            await db.query(
              'SELECT * FROM commerce_provider_state ORDER BY provider_name',
            )
          ).rows.map((provider) => ({
            ...provider,
            lowBalance: supplierBalanceIsLow(
              provider.balance,
              provider.currency,
            ),
            lowBalanceThreshold: supplierBalanceThreshold(provider.currency),
          })),
          supplierAlerts: (
            await db.query(`SELECT l.id,l.order_id,l.provider_id,l.operation,l.response_status,
              l.error_message,l.response_body,l.created_at,sp.name AS supplier_product_name
              FROM commerce_supplier_api_logs l
              LEFT JOIN commerce_orders o ON o.id=l.order_id
              LEFT JOIN commerce_supplier_products sp ON sp.id=o.supplier_product_id
              WHERE l.response_status IS NULL OR l.response_status>=400 OR l.error_message IS NOT NULL
              ORDER BY l.created_at DESC LIMIT 25`)
          ).rows,
          orders: (
            await db.query(
              `SELECT o.id,o.product_id,o.amount,o.listed_amount,o.coupon_discount,o.status,o.transaction_id,o.payer_name,o.customer_email,o.ip_address,o.payment_method,o.payment_currency,o.payment_amount,o.telegram_chat_id,
                 o.payment_submitted_at,o.supplier_order_id,o.supplier_status,c.code_display AS coupon_code,
                 o.shared_account_id,o.shared_slot,
                sp.provider_id,sp.provider_name AS supplier_name,sp.name AS supplier_product_name,o.created_at,o.delivered_at,
                o.fulfillment_cost_pkr AS cost_pkr,
                CASE WHEN o.status='delivered' THEN
                  (CASE WHEN c.code_display='HOR' THEN o.amount+COALESCE(o.coupon_discount,0) ELSE o.amount END)-COALESCE(o.fulfillment_cost_pkr,0)
                  ELSE NULL END AS profit_pkr
               FROM commerce_orders o
               LEFT JOIN commerce_coupons c ON c.id=o.coupon_id
               LEFT JOIN commerce_supplier_products sp ON sp.id=o.supplier_product_id
               ORDER BY o.created_at DESC LIMIT 100`,
            )
          ).rows.map((row) =>
            profitUnlocked ? row : { ...row, cost_pkr: null, profit_pkr: null },
          ),
          blockedUsers: (
            await db.query(
              `SELECT a.ip_address,a.attempts,a.last_attempt_at,count(o.id)::int AS order_count
               FROM commerce_payment_claim_attempts a
               LEFT JOIN commerce_orders o ON o.ip_address=a.ip_address
               WHERE a.attempts>=5
               GROUP BY a.ip_address,a.attempts,a.last_attempt_at
               ORDER BY a.last_attempt_at DESC LIMIT 500`,
            )
          ).rows,
          payments: (
            await db.query(
              'SELECT id,amount,payment_amount,currency,subject,transaction_id,payer_name,source_last4,verified,verification_reason,verification_reason_before_manual,fulfillment_error_code,fulfillment_error_message,fulfillment_error_stage,fulfillment_error_at,manual_approval_source,order_id,receiver_id,received_at,created_at FROM commerce_payments ORDER BY created_at DESC LIMIT 500',
            )
          ).rows,
          stock: (
            await db.query(
              'SELECT product_id,state,count(*)::int AS count FROM commerce_inventory GROUP BY product_id,state',
            )
          ).rows,
          autoVerify: adminSettings.auto_verify_receipts === 'true' || process.env.NAYAPAY_AUTO_VERIFY === 'true',
          supplierUsdtPkrRate: supplierUsdtRate(),
          supplierUsdPkrRate: supplierUsdRate(),
          profitBreakdown,
          profitUnlocked,
          commissionSummary,
          commissions,
          supplierKeys: supplierKeyStatus(supplierApiKeys),
          teamAccess: teamAccessRow
            ? { configured: true, email: teamAccessRow.email }
            : { configured: false, email: null },
          teamCommissions: {
            ratePkr: TEAM_COMMISSION_PKR,
            totalPkr:
              (commissionOrders.length + teamWithdrawals.length) *
              TEAM_COMMISSION_PKR,
            orders: [
              ...commissionOrders.map((row) => ({
                ...row,
                original_sale_pkr:
                  Number(row.amount || 0) + Number(row.coupon_discount || 0),
                commission_pkr: TEAM_COMMISSION_PKR,
                source: 'HOR coupon',
              })),
              ...teamWithdrawals.map((row) => ({
                id: row.id,
                product_id: row.product_id,
                team_email: row.team_email,
                created_at: row.created_at,
                commission_pkr: row.commission_amount,
                source: 'Team stock withdrawal',
              })),
            ],
          },
        };
      } else if (action === 'admin-supplier-logs') {
        const logOrderId = req.query?.id || null;
        if (logOrderId && !idOk(logOrderId))
          throw fail(400, 'Invalid order ID.');
        output = {
          logs: (
            await db.query(
              `SELECT id,order_id,provider_id,operation,endpoint,request_method,request_headers,request_body,response_status,response_body,error_message,created_at
               FROM commerce_supplier_api_logs
               WHERE ($1::uuid IS NULL OR order_id=$1::uuid)
               ORDER BY created_at DESC LIMIT 200`,
              [logOrderId],
            )
          ).rows,
        };
      } else if (action === 'admin-coupon-create') {
        const code = normalizeCouponCode(body.code);
        if (!code) throw fail(400, 'Coupon code is required.');
        if (code === TEAM_COUPON_CODE)
          throw fail(400, 'HOR is disabled and cannot be created.');
        const discountPercent = Number(body.discountPercent ?? 5),
          maxUses = Number(body.maxUses ?? 10);
        if (
          !Number.isFinite(discountPercent) ||
          discountPercent < 0 ||
          discountPercent > 100
        )
          throw fail(400, 'Discount must be between 0% and 100%.');
        if (discountPercent === 0 && code !== CUSTOMER_COUPON_CODE)
          throw fail(
            400,
            'Only CUST can keep the normal price with 0% discount.',
          );
        if (discountPercent === 100 && code !== TEAM_COUPON_CODE)
          throw fail(400, 'Only HOR is reserved for free team access.');
        if (!Number.isSafeInteger(maxUses) || maxUses < 1)
          throw fail(400, 'Maximum usage must be a positive whole number.');
        const inserted = await db.query(
          `INSERT INTO commerce_coupons(id,code_hash,code_display,product_id,discount,discount_percent,max_uses,enabled) VALUES($1,$2,$3,'p093',$4::numeric,$4::numeric,$5::integer,$6::boolean)
        RETURNING id,code_display,discount_percent,commission_percent,max_uses,used_count,enabled`,
          [
            randomUUID(),
            hash(code),
            code,
            discountPercent,
            maxUses,
            body.enabled !== false,
          ],
        );
        await db.query(
          "INSERT INTO commerce_audit(action,object_id) VALUES('coupon_create',$1)",
          [inserted.rows[0].id],
        );
        output = inserted.rows[0];
      } else if (action === 'admin-coupon-update') {
        if (!idOk(body.couponId)) throw fail(400, 'Invalid coupon ID.');
        const current = (
          await db.query(
            'SELECT * FROM commerce_coupons WHERE id=$1 FOR UPDATE',
            [body.couponId],
          )
        ).rows[0];
        if (!current) throw fail(404, 'Coupon not found.');
        const code = normalizeCouponCode(body.code ?? current.code_display);
        const discountPercent = Number(
            body.discountPercent ?? current.discount_percent,
          ),
          maxUses = Number(body.maxUses ?? current.max_uses);
        if (!code) throw fail(400, 'Coupon code is required.');
        if (
          !Number.isFinite(discountPercent) ||
          discountPercent < 0 ||
          discountPercent > 100
        )
          throw fail(400, 'Discount must be between 0% and 100%.');
        if (
          current.code_display === TEAM_COUPON_CODE ||
          code === TEAM_COUPON_CODE
        )
          throw fail(400, 'HOR is disabled and cannot be changed.');
        if (
          (current.code_display === CUSTOMER_COUPON_CODE ||
            code === CUSTOMER_COUPON_CODE) &&
          (current.code_display !== CUSTOMER_COUPON_CODE ||
            code !== CUSTOMER_COUPON_CODE ||
            discountPercent !== 0 ||
            body.enabled === false)
        )
          throw fail(
            400,
            'CUST is a reserved commission coupon and cannot be changed.',
          );
        if (discountPercent === 0 && code !== CUSTOMER_COUPON_CODE)
          throw fail(
            400,
            'Only CUST can keep the normal price with 0% discount.',
          );
        if (discountPercent === 100 && code !== TEAM_COUPON_CODE)
          throw fail(400, 'Only HOR is reserved for free team access.');
        if (
          !Number.isSafeInteger(maxUses) ||
          maxUses < current.used_count ||
          maxUses < 1
        )
          throw fail(
            400,
            `Maximum usage cannot be lower than current usage (${current.used_count}).`,
          );
        const updated = await db.query(
          `UPDATE commerce_coupons SET code_hash=$1,code_display=$2,discount=$3::numeric,discount_percent=$3::numeric,max_uses=$4::integer,enabled=$5::boolean,updated_at=now() WHERE id=$6
        RETURNING id,code_display,discount_percent,commission_percent,max_uses,used_count,enabled`,
          [
            hash(code),
            code,
            discountPercent,
            maxUses,
            body.enabled !== false,
            body.couponId,
          ],
        );
        await db.query(
          "INSERT INTO commerce_audit(action,object_id) VALUES('coupon_update',$1)",
          [body.couponId],
        );
        output = updated.rows[0];
      } else if (action === 'admin-payment') {
        if (!idOk(body.paymentId)) throw fail(400, 'Invalid payment ID.');
        const payment = (
          await db.query('SELECT * FROM commerce_payments WHERE id=$1', [
            body.paymentId,
          ])
        ).rows[0];
        if (!payment) throw fail(404, 'Payment not found.');
        output = {
          text: receiptText(decrypt(payment.encrypted_body, key)),
          subject: payment.subject,
        };
      } else if (action === 'admin-order-delivery') {
        if (!idOk(body.orderId)) throw fail(400, 'Invalid order ID.');
        const row = (
          await db.query(
            `SELECT o.id,o.status,o.product_id,o.delivered_at,o.supplier_delivery,i.credentials
        FROM commerce_orders o LEFT JOIN commerce_inventory i ON i.id=o.inventory_id WHERE o.id=$1`,
            [body.orderId],
          )
        ).rows[0];
        if (!row) throw fail(404, 'Order not found.');
        if (row.status !== 'delivered')
          throw fail(409, 'This order has no recorded delivery yet.');
        output = {
          orderId: row.id,
          deliveredAt: row.delivered_at,
          productId: row.product_id,
          delivery: row.supplier_delivery
            ? decrypt(row.supplier_delivery, key)
            : null,
          credentials: row.credentials ? decrypt(row.credentials, key) : null,
        };
      } else if (action === 'admin-scam-report-update') {
        if (!idOk(body.reportId)) throw fail(400, 'Invalid report ID.');
        const status = String(body.status || '');
        if (!['approved', 'rejected', 'removed'].includes(status))
          throw fail(400, 'Invalid report status.');
        const changed = await db.query(
          'UPDATE commerce_scam_reports SET status=$1,reviewed_at=now() WHERE id=$2 RETURNING id,status',
          [status, body.reportId],
        );
        if (!changed.rowCount) throw fail(404, 'Scam report not found.');
        await db.query(
          'INSERT INTO commerce_audit(action,object_id) VALUES($1,$2)',
          [`${status}_scam_report`, body.reportId],
        );
        output = { ok: true, reportId: body.reportId, status };
      } else if (action === 'admin-requirement-create') {
        const toolName = String(body.toolName || '').trim();
        const description = String(body.description || '').trim();
        if (!toolName || toolName.length > 160 || description.length < 10 || description.length > 4000)
          throw fail(400, 'Enter a tool name and a description between 10 and 4,000 characters.');
        const requirement = (await db.query(
          `INSERT INTO commerce_reseller_requirements(id,tool_name,description)
           VALUES($1,$2,$3) RETURNING id,tool_name,description,status,created_at,updated_at`,
          [randomUUID(), toolName, description],
        )).rows[0];
        await db.query("INSERT INTO commerce_audit(action,object_id) VALUES('reseller_requirement_create',$1)", [requirement.id]);
        const resellers = (await db.query(
          "SELECT email,name,username FROM commerce_accounts WHERE role='reseller' AND reseller_status='approved' AND email_verified_at IS NOT NULL",
        )).rows;
        const origin = String(process.env.NEXT_PUBLIC_SITE_ORIGIN || 'https://www.sasifysolutions.com').replace(/\/$/, '');
        const htmlText = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
        const emailResults = await Promise.allSettled(resellers.map((reseller) => sendAccountEmail({
          to: reseller.email,
          subject: `${toolName} — Required by Sasify`,
          text: `Sasify is currently looking for ${toolName} for our customers and reseller network.\n\n${description}\n\nIf you can provide this tool, subscription, or service, open your reseller dashboard and click “I Can Provide This”. Share your contact number and our team will contact you to discuss pricing, availability, and delivery.\n\nOpen your dashboard: ${origin}/dashboard`,
          html: `<p>Sasify is currently looking for <strong>${htmlText(toolName)}</strong> for our customers and reseller network.</p><p>${htmlText(description).replace(/\n/g, '<br />')}</p><p>If you can provide this tool, subscription, or service, open your reseller dashboard and click <strong>“I Can Provide This”</strong>. Share your contact number and our team will contact you to discuss pricing, availability, and delivery.</p><p><a href="${origin}/dashboard">Open your dashboard</a></p>`,
        })));
        output = { ok: true, requirement, notified: emailResults.filter((result) => result.status === 'fulfilled').length, recipients: resellers.length };
      } else if (action === 'admin-requirement-update') {
        if (!idOk(body.requirementId)) throw fail(400, 'Invalid requirement.');
        const status = String(body.status || '').trim();
        if (!['open', 'fulfilled', 'closed'].includes(status)) throw fail(400, 'Invalid requirement status.');
        const changed = await db.query(
          'UPDATE commerce_reseller_requirements SET status=$1,updated_at=now() WHERE id=$2 RETURNING id,status',
          [status, body.requirementId],
        );
        if (!changed.rowCount) throw fail(404, 'Requirement not found.');
        await db.query("INSERT INTO commerce_audit(action,object_id,details) VALUES('reseller_requirement_update',$1,$2::jsonb)", [body.requirementId, JSON.stringify({ status })]);
        output = { ok: true, requirement: changed.rows[0] };
      } else if (action === 'admin-requirement-delete') {
        if (!idOk(body.requirementId)) throw fail(400, 'Invalid requirement.');
        await db.query("INSERT INTO commerce_audit(action,object_id) VALUES('reseller_requirement_delete',$1)", [body.requirementId]);
        const changed = await db.query(
          'DELETE FROM commerce_reseller_requirements WHERE id=$1 RETURNING id',
          [body.requirementId],
        );
        if (!changed.rowCount) throw fail(404, 'Requirement not found.');
        output = { ok: true, requirementId: body.requirementId };
      } else if (action === 'admin-tool-request-update') {
        if (!idOk(body.requestId)) throw fail(400, 'Invalid tool request ID.');
        const status = String(body.status || '').trim();
        if (!['new', 'contacted', 'fulfilled', 'closed'].includes(status))
          throw fail(400, 'Invalid tool request status.');
        const changed = await db.query(
          'UPDATE commerce_tool_requests SET status=$1,updated_at=now() WHERE id=$2 RETURNING id,status',
          [status, body.requestId],
        );
        if (!changed.rowCount) throw fail(404, 'Tool request not found.');
        await db.query(
          "INSERT INTO commerce_audit(action,object_id) VALUES('tool_request_update',$1)",
          [body.requestId],
        );
        output = { ok: true, requestId: body.requestId, status };
      } else if (action === 'admin-approve') {
        if (
          !idOk(body.orderId) ||
          !idOk(body.paymentId) ||
          body.confirmed !== true
        )
          throw fail(
            400,
            'Select an order and payment, then confirm the receipt and exact amount.',
          );
        await recordManualApprovalContext(db, body.paymentId, 'admin');
        await attachPaymentForManualApproval(db, body.orderId, body.paymentId);
        const fulfillment = await fulfill(
          db,
          body.orderId,
          body.paymentId,
          true,
          captureSupplierExchange,
          supplierApiKeys,
        );
        if (!fulfillment?.cancelled)
          await queueTelegramDelivery(
            db,
            body.orderId,
            key,
            publicTelegramMessages,
          );
        output = fulfillment?.cancelled
          ? { ok: true, status: 'cancelled', reason: fulfillment.reason }
          : { ok: true };
      } else if (action === 'admin-manual-delivery') {
        if (!idOk(body.orderId) || body.confirmed !== true)
          throw fail(400, 'Confirm manual credential delivery first.');
        output = await manualDeliverLocalOrder(
          db,
          body.orderId,
          body.inventoryId,
          key,
          body.deliveryContent,
        );
        await queueTelegramDelivery(
          db,
          body.orderId,
          key,
          publicTelegramMessages,
        );
      } else if (action === 'admin-cancel') {
        if (!idOk(body.orderId) || body.confirmed !== true)
          throw fail(400, 'Confirm cancellation first.');
        const order = (
          await db.query(
            'SELECT * FROM commerce_orders WHERE id=$1 FOR UPDATE',
            [body.orderId],
          )
        ).rows[0];
        if (!order || !['pending', 'review'].includes(order.status))
          throw fail(409, 'Only undelivered reservations can be cancelled.');
        await db.query(
          "UPDATE commerce_orders SET status='cancelled' WHERE id=$1",
          [order.id],
        );
        await db.query(
          "UPDATE commerce_inventory SET state='available' WHERE id=$1 AND state='reserved'",
          [order.inventory_id],
        );
        await releaseSharedSlot(db, order);
        await releaseCoupon(db, order);
        await db.query(
          "INSERT INTO commerce_audit(action,object_id) VALUES('admin_cancel',$1)",
          [order.id],
        );
        output = { ok: true };
      } else throw fail(404, 'Unknown request.');
      const supplierIssue = supplierLogs.find(
        (log) =>
          log.errorMessage ||
          !log.responseStatus ||
          Number(log.responseStatus) >= 400,
      );
      if (supplierIssue)
        telegramMessages.push(supplierIssueMessage(supplierIssue));
      await db.query('COMMIT');
      for (const message of telegramMessages) await notifyTelegram(message);
      for (const message of publicTelegramMessages)
        await notifyPublicTelegram(message.chatId, message.text);
      for (const callback of telegramCallbacks)
        await telegramRequest('answerCallbackQuery', {
          callback_query_id: callback.id,
          text: callback.text,
          show_alert: false,
        });
      for (const edit of telegramEdits)
        await telegramRequest('editMessageText', {
          chat_id: edit.chatId,
          message_id: edit.messageId,
          text: edit.text,
          disable_web_page_preview: true,
        });
      json(res, 200, output);
    } catch (e) {
      if (db) {
        await db.query('ROLLBACK').catch(() => {});
        db.release();
        db = null;
      }
      if (supplierLogs.length)
        await persistSupplierApiLogs(pool, supplierLogs).catch((logError) =>
          console.error(
            'supplier-api-log-error',
            logError.code || logError.name,
            logError.message || '',
          ),
        );
      const supplierIssue = supplierLogs.find(
        (log) =>
          log.errorMessage ||
          !log.responseStatus ||
          Number(log.responseStatus) >= 400,
      );
      if (supplierIssue)
        await notifyTelegram(supplierIssueMessage(supplierIssue));
      const code = e.status || (e.code === '23505' ? 409 : 503);
      const errorMessage = e.status
        ? e.message
        : e.code === '23505' && e.constraint === 'commerce_inventory_assignment'
          ? 'That account was just reserved by another checkout. Please retry.'
          : e.code === '23505'
            ? 'Duplicate account or payment. Nothing was imported.'
            : 'Service temporarily unavailable. Please retry or contact support.';
      json(res, code, {
        error: errorMessage,
      });
      if (!e.status)
        console.error('commerce-error', e.code || e.name, e.message || '');
    } finally {
      db?.release();
    }
  };
}
export { summarizeProfit };
export default createHandler();
