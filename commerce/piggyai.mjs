import { providerDescription } from './description.mjs';
import { providerLogo } from './provider-media.mjs';
import {
  notifySupplierApiExchange,
  supplierErrorMessage,
  supplierLogHeaders,
  supplierLogPayload,
} from './supplier-api-log.mjs';

const endpoint = 'https://canboso.com';

async function request(
  path,
  init = {},
  envName = 'PIGGYAI_API_KEY',
  onExchange,
) {
  if (!process.env[envName])
    throw Object.assign(new Error(`${envName} is not configured.`), {
      status: 503,
    });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  const url = `${endpoint}${path}`;
  const method = String(init.method || 'GET').toUpperCase();
  const headers = {
    Accept: 'application/json',
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...init.headers,
  };
  let exchangeLogged = false;
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        'X-API-Key': process.env[envName],
        ...headers,
      },
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    await notifySupplierApiExchange(onExchange, {
      providerId: envName === 'FATBUNNY_API_KEY' ? 'fatbunny' : 'piggyai',
      operation: 'purchase',
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
      const message = supplierErrorMessage(
        data,
        `PiggyAi request failed (${response.status}).`,
      );
      throw Object.assign(new Error(message), {
        status:
          response.status >= 400 &&
          response.status < 500 &&
          response.status !== 429
            ? 409
            : 503,
        code: data.code || null,
        retryAfter: Number(response.headers.get('retry-after') || 0),
      });
    }
    return data;
  } catch (error) {
    if (!exchangeLogged)
      await notifySupplierApiExchange(onExchange, {
        providerId: envName === 'FATBUNNY_API_KEY' ? 'fatbunny' : 'piggyai',
        operation: 'purchase',
        endpoint: url,
        requestMethod: method,
        requestHeaders: supplierLogHeaders(headers),
        requestBody: supplierLogPayload(init.body),
        responseStatus: null,
        responseBody: null,
        errorMessage: error.message,
      });
    if (error.name === 'AbortError')
      throw Object.assign(
        new Error('PiggyAi request timed out. It can be retried safely.'),
        { status: 503 },
      );
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function unwrap(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data?.[key])) return data.data[key];
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export async function fetchPiggyAiProducts(envName = 'PIGGYAI_API_KEY') {
  const data = await request('/api/v2/telegram-buyer/products', {}, envName);
  return unwrap(data, 'products');
}

export function normalizePiggyAiProduct(product, defaultCurrency = 'USD') {
  const id = String(
    product?.id ?? product?.product_id ?? product?.productId ?? '',
  ).trim();
  const name = String(
    product?.name_en ?? product?.name ?? product?.title ?? '',
  ).trim();
  const wholesalePrice = Number(
    product?.price_usd ??
      product?.unit_price ??
      product?.wholesale_price ??
      product?.price?.amount ??
      product?.price ??
      product?.cost ??
      product?.amount,
  );
  const rawStock =
    product?.stock ??
    product?.quantity ??
    product?.available_stock ??
    product?.available ??
    product?.availability?.available ??
    product?.in_stock;
  const stock =
    rawStock === null || rawStock === undefined ? 0 : Number(rawStock);
  const currency = String(product?.currency || defaultCurrency || 'USD')
    .trim()
    .toUpperCase();
  if (
    !id ||
    !name ||
    !Number.isFinite(wholesalePrice) ||
    wholesalePrice < 0 ||
    !Number.isSafeInteger(stock) ||
    stock < 0
  )
    return null;
  const logo = providerLogo(product);
  return {
    id,
    name,
    description: providerDescription(product),
    delivery_instruction: product?.activation_url
      ? String(product.activation_url)
      : null,
    wholesale_price: wholesalePrice,
    currency: currency.slice(0, 12),
    stock,
    canonical_key: String(
      product?.sku || product?.slug || `piggyai:${id}`,
    ).slice(0, 200),
    ...(logo ? { logo_url: logo } : {}),
  };
}

export async function fetchPiggyAiBalance(envName = 'PIGGYAI_API_KEY') {
  const data = await request('/api/v2/telegram-buyer/balance', {}, envName);
  const value = data.balance ?? data.data?.balance ?? data.wallet_balance ?? 0;
  return {
    balance: Number(value),
    currency: String(
      data.currency || data.walletCurrency || data.data?.currency || 'USD',
    ),
  };
}

export async function createPiggyAiOrder({
  productId,
  quantity = 1,
  idempotencyKey,
  envName = 'PIGGYAI_API_KEY',
  onExchange,
}) {
  return request(
    '/api/v2/telegram-buyer/purchase',
    {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ product_id: productId, quantity }),
    },
    envName,
    onExchange,
  );
}

export function piggyAiDelivery(data) {
  const order = data.order || data.data || data;
  const raw =
    order.items ??
    order.delivery ??
    order.credentials ??
    order.code ??
    order.content ??
    order.result;
  if (raw === undefined || raw === null || raw === '')
    throw Object.assign(
      new Error('PiggyAi order completed without delivery data.'),
      { status: 503 },
    );
  return {
    content: typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2),
    instructions: order.instructions || '',
  };
}

export function piggyAiOrderId(data, fallback) {
  const order = data.order || data.data || data;
  return String(order.id || order.order_id || order.purchase_id || fallback);
}
