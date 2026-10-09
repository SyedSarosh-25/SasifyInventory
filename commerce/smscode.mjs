import {
  notifySupplierApiExchange,
  supplierErrorMessage,
  supplierLogHeaders,
  supplierLogPayload,
} from './supplier-api-log.mjs';

const SMSCODE_BASE_URL = 'https://api.smscode.gg';

export function isSmscodeConfigured(apiKey) {
  const token = apiKey || process.env.SMSCODE_TOKEN || process.env.SMSCODE_API_KEY;
  return typeof token === 'string' && token.trim().length > 0;
}

export function getSmscodeToken(apiKey) {
  return String(apiKey || process.env.SMSCODE_TOKEN || process.env.SMSCODE_API_KEY || '').trim();
}

/**
 * Converts wholesale USD cost from SMSCode to retail PKR price with a healthy margin.
 * Applies 30% margin, rounds up to nearest 10 PKR, minimum 120 PKR.
 */
export function calculateRetailPricePkr(wholesaleUsd, usdRate = 285) {
  const cost = Number(wholesaleUsd || 0);
  const rate = Number(usdRate) > 0 ? Number(usdRate) : 285;
  const wholesalePkr = cost * rate;
  return Math.max(120, Math.ceil((wholesalePkr * 1.30) / 10) * 10);
}

// Built-in curated popular platforms and fallback data
const POPULAR_SERVICES = [
  { id: 1, code: 'whatsapp', name: 'WhatsApp', icon: 'whatsapp', popular: true },
  { id: 2, code: 'telegram', name: 'Telegram', icon: 'telegram', popular: true },
  { id: 3, code: 'openai', name: 'OpenAI / ChatGPT', icon: 'openai', popular: true },
  { id: 4, code: 'claude', name: 'Claude (Anthropic)', icon: 'claude', popular: true },
  { id: 5, code: 'google', name: 'Google / Gmail / YouTube', icon: 'google', popular: true },
  { id: 6, code: 'discord', name: 'Discord', icon: 'discord', popular: true },
  { id: 7, code: 'microsoft', name: 'Microsoft / Outlook', icon: 'microsoft', popular: true },
  { id: 8, code: 'tiktok', name: 'TikTok', icon: 'tiktok', popular: true },
  { id: 9, code: 'twitter', name: 'Twitter / X', icon: 'twitter', popular: false },
  { id: 10, code: 'netflix', name: 'Netflix', icon: 'netflix', popular: false },
  { id: 11, code: 'facebook', name: 'Facebook', icon: 'facebook', popular: false },
  { id: 12, code: 'apple', name: 'Apple ID', icon: 'apple', popular: false },
];

const POPULAR_COUNTRIES = [
  { id: 7, code: 'id', name: 'Indonesia', dial_code: '62', emoji: '🇮🇩', active: true },
  { id: 1, code: 'us', name: 'United States', dial_code: '1', emoji: '🇺🇸', active: true },
  { id: 2, code: 'gb', name: 'United Kingdom', dial_code: '44', emoji: '🇬🇧', active: true },
  { id: 3, code: 'nl', name: 'Netherlands', dial_code: '31', emoji: '🇳🇱', active: true },
  { id: 4, code: 'my', name: 'Malaysia', dial_code: '60', emoji: '🇲🇾', active: true },
  { id: 5, code: 'in', name: 'India', dial_code: '91', emoji: '🇮🇳', active: true },
  { id: 6, code: 'de', name: 'Germany', dial_code: '49', emoji: '🇩🇪', active: true },
  { id: 8, code: 'ph', name: 'Philippines', dial_code: '63', emoji: '🇵🇭', active: true },
  { id: 9, code: 'vn', name: 'Vietnam', dial_code: '84', emoji: '🇻🇳', active: true },
  { id: 10, code: 'br', name: 'Brazil', dial_code: '55', emoji: '🇧🇷', active: true },
];

async function smscodeRequest(path, init = {}, onExchange, apiKey) {
  const token = getSmscodeToken(apiKey);
  if (!token) {
    const error = new Error('SMSCode API token is not configured.');
    error.status = 503;
    error.code = 'UNCONFIGURED';
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  const url = `${SMSCODE_BASE_URL}${path}`;
  const method = String(init.method || 'GET').toUpperCase();
  const headers = {
    Accept: 'application/json',
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...init.headers,
    Authorization: `Bearer ${token}`,
  };

  let exchangeLogged = false;
  try {
    const response = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    await notifySupplierApiExchange(onExchange, {
      providerId: 'smscode',
      operation: path.startsWith('/v2/orders/create') ? 'purchase' : 'lookup',
      endpoint: url,
      requestMethod: method,
      requestHeaders: supplierLogHeaders(headers),
      requestBody: supplierLogPayload(init.body),
      responseStatus: response.status,
      responseBody: supplierLogPayload(data),
      errorMessage: null,
    });
    exchangeLogged = true;

    if (!response.ok || data.success === false) {
      const code = data.error?.code || 'API_ERROR';
      const msg = supplierErrorMessage(data, `SMSCode request failed (${response.status}).`);
      const error = new Error(msg);
      error.status = response.status;
      error.code = code;
      error.details = data.error?.details;
      throw error;
    }

    return data;
  } catch (error) {
    if (!exchangeLogged) {
      await notifySupplierApiExchange(onExchange, {
        providerId: 'smscode',
        operation: path.startsWith('/v2/orders/create') ? 'purchase' : 'lookup',
        endpoint: url,
        requestMethod: method,
        requestHeaders: supplierLogHeaders(headers),
        requestBody: supplierLogPayload(init.body),
        responseStatus: null,
        responseBody: null,
        errorMessage: error.message,
      });
    }
    if (error.name === 'AbortError') {
      const err = new Error('SMSCode request timed out. Please retry.');
      err.status = 504;
      err.code = 'TIMEOUT';
      throw err;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * List services from SMSCode API or return rich fallback
 */
export async function fetchSmscodeServices(apiKey, countryId) {
  if (isSmscodeConfigured(apiKey)) {
    try {
      const query = countryId ? `?country_id=${encodeURIComponent(countryId)}` : '';
      const data = await smscodeRequest(`/v2/catalog/services${query}`, {}, undefined, apiKey);
      if (Array.isArray(data.data) && data.data.length > 0) {
        return data.data.map((s) => ({
          id: s.id,
          code: s.code || String(s.name).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          name: s.name,
          active: s.active !== false,
          popular: ['whatsapp', 'telegram', 'openai', 'claude', 'google', 'discord'].includes(
            String(s.code || s.name).toLowerCase(),
          ),
        }));
      }
    } catch (err) {
      // Fall through to fallback catalog if API is temporarily unavailable
      console.warn('[smscode] Could not fetch live services, using fallback:', err.message);
    }
  }
  return POPULAR_SERVICES;
}

/**
 * List countries from SMSCode API or return rich fallback
 */
export async function fetchSmscodeCountries(apiKey, serviceId) {
  if (isSmscodeConfigured(apiKey)) {
    try {
      const data = await smscodeRequest('/v2/catalog/countries', {}, undefined, apiKey);
      if (Array.isArray(data.data) && data.data.length > 0) {
        return data.data.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          dial_code: c.dial_code,
          emoji: c.emoji || '🌐',
          active: c.active !== false,
        }));
      }
    } catch (err) {
      console.warn('[smscode] Could not fetch live countries, using fallback:', err.message);
    }
  }
  return POPULAR_COUNTRIES;
}

/**
 * List products (available phone numbers & prices) for a given country and service
 */
export async function fetchSmscodeProducts(apiKey, { countryId, platformId, operatorId, limit = 50 }) {
  if (isSmscodeConfigured(apiKey)) {
    try {
      const params = new URLSearchParams();
      if (countryId) params.set('country_id', String(countryId));
      if (platformId) params.set('platform_id', String(platformId));
      if (operatorId) params.set('operator_id', String(operatorId));
      params.set('limit', String(limit));

      const data = await smscodeRequest(`/v2/catalog/products?${params.toString()}`, {}, undefined, apiKey);
      if (Array.isArray(data.data)) {
        return data.data.map((p) => {
          const costUsd = Number(p.price?.amount || p.amount?.amount || 0.50);
          return {
            id: p.id,
            catalog_product_id: p.catalog_product_id || p.id,
            name: p.name,
            country_id: p.country_id,
            platform_id: p.platform_id,
            operator_id: p.operator_id || null,
            operator_name: p.operator_name || 'Any',
            available: Number(p.available || 0),
            cost_usd: costUsd,
            active: p.active !== false,
          };
        });
      }
    } catch (err) {
      console.warn('[smscode] Could not fetch live products, using fallback:', err.message);
    }
  }

  // Fallback default offers for preview / local testing
  const fallbackPrices = {
    whatsapp: 0.50,
    telegram: 0.40,
    openai: 0.45,
    claude: 0.60,
    google: 0.35,
    discord: 0.30,
    tiktok: 0.30,
    microsoft: 0.35,
  };
  const baseCost = 0.45;
  return [
    {
      id: 101,
      catalog_product_id: 101,
      name: 'Standard Line (High Success Rate)',
      country_id: countryId || 7,
      platform_id: platformId || 1,
      operator_id: null,
      operator_name: 'Direct Route',
      available: 95,
      cost_usd: baseCost,
      active: true,
    },
    {
      id: 102,
      catalog_product_id: 102,
      name: 'Premium Instant Route',
      country_id: countryId || 7,
      platform_id: platformId || 1,
      operator_id: null,
      operator_name: 'Premium Carrier',
      available: 48,
      cost_usd: baseCost + 0.25,
      active: true,
    },
  ];
}

/**
 * Rent a virtual number from SMSCode
 */
export async function createSmscodeOrder(apiKey, {
  catalogProductId,
  productId,
  maxPrice,
  idempotencyKey,
  operatorId,
  onExchange,
}) {
  if (isSmscodeConfigured(apiKey)) {
    const body = {
      quantity: 1,
      policy: 'cheapest',
      ...(catalogProductId ? { catalog_product_id: Number(catalogProductId) } : { product_id: Number(productId) }),
      ...(maxPrice ? { max_price: String(maxPrice) } : {}),
      ...(operatorId ? { operator_id: Number(operatorId) } : {}),
    };

    const headers = {};
    if (idempotencyKey) headers['idempotency-key'] = String(idempotencyKey);

    const data = await smscodeRequest('/v2/orders/create', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }, onExchange, apiKey);

    const order = data.data?.orders?.[0];
    if (!order) {
      throw new Error('No number could be allocated by the provider.');
    }
    return {
      id: String(order.id),
      status: order.status || 'ACTIVE',
      phone_number: order.phone_number,
      expires_at: order.expires_at,
      cost_usd: Number(order.amount?.amount || maxPrice || 0.50),
      can_cancel: order.can_cancel ?? true,
      can_finish: order.can_finish ?? false,
    };
  }

  // Simulated fallback order for preview / tests when unconfigured
  const randomSuffix = Math.floor(1000000 + Math.random() * 9000000);
  return {
    id: `sim_${Date.now()}`,
    status: 'ACTIVE',
    phone_number: `+62812${randomSuffix}`,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    cost_usd: Number(maxPrice || 0.50),
    can_cancel: true,
    can_finish: false,
    simulated: true,
  };
}

/**
 * Fetch latest order status and OTP code
 */
export async function getSmscodeOrder(apiKey, orderId) {
  if (isSmscodeConfigured(apiKey) && !String(orderId).startsWith('sim_')) {
    const data = await smscodeRequest(`/v2/orders/${orderId}`, {}, undefined, apiKey);
    const order = data.data;
    return {
      id: String(order.id),
      status: order.status,
      phone_number: order.phone_number,
      otp_code: order.otp_code || null,
      otp_message: order.otp_message || null,
      expires_at: order.expires_at,
      can_cancel: order.can_cancel ?? false,
      can_finish: order.can_finish ?? false,
      failed_reason: order.failed_reason || null,
    };
  }

  // Simulated fallback check
  return {
    id: String(orderId),
    status: 'ACTIVE',
    phone_number: '+6281234567890',
    otp_code: null,
    otp_message: null,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    can_cancel: true,
    can_finish: false,
    simulated: true,
  };
}

/**
 * Cancel an active number and refund
 */
export async function cancelSmscodeOrder(apiKey, orderId) {
  if (isSmscodeConfigured(apiKey) && !String(orderId).startsWith('sim_')) {
    const data = await smscodeRequest('/v2/orders/cancel', {
      method: 'POST',
      body: JSON.stringify({ id: Number(orderId) || orderId }),
    }, undefined, apiKey);
    return data.data;
  }
  return { status: 'CANCELED', simulated: true };
}

/**
 * Finish a completed order once OTP is verified
 */
export async function finishSmscodeOrder(apiKey, orderId) {
  if (isSmscodeConfigured(apiKey) && !String(orderId).startsWith('sim_')) {
    const data = await smscodeRequest('/v2/orders/finish', {
      method: 'POST',
      body: JSON.stringify({ id: Number(orderId) || orderId }),
    }, undefined, apiKey);
    return data;
  }
  return { success: true, simulated: true };
}
