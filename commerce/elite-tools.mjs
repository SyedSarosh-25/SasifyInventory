import { providerDescription } from './description.mjs';
import { providerLogo } from './provider-media.mjs';
import {
  notifySupplierApiExchange,
  supplierErrorMessage,
  supplierLogHeaders,
  supplierLogPayload,
} from './supplier-api-log.mjs';

const endpoint = 'https://elitetoolz.up.railway.app/api/reseller';
const envName = 'ELITE_TOOLS_API_KEY';

function configured(apiKey) {
  if (!apiKey && !process.env[envName])
    throw Object.assign(new Error('Elite Tools Store API is not configured.'), {
      status: 503,
    });
}

async function request(path, init = {}, onExchange, apiKey) {
  configured(apiKey);
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
      headers: { 'X-API-Key': apiKey || process.env[envName], ...headers },
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    await notifySupplierApiExchange(onExchange, {
      providerId: 'elitetools',
      operation: method === 'POST' ? 'purchase' : path === '/products' ? 'catalog' : 'balance',
      endpoint: url,
      requestMethod: method,
      requestHeaders: supplierLogHeaders(headers),
      requestBody: supplierLogPayload(init.body),
      responseStatus: response.status,
      responseBody: supplierLogPayload(data),
      errorMessage: null,
    });
    exchangeLogged = true;
    if (!response.ok || data.ok === false || data.success === false) {
      const message = supplierErrorMessage(
        data,
        `Elite Tools Store request failed (${response.status}).`,
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
        providerId: 'elitetools',
        operation: method === 'POST' ? 'purchase' : path === '/products' ? 'catalog' : 'balance',
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
        new Error('Elite Tools Store request timed out. It can be retried safely.'),
        { status: 503 },
      );
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function productList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.data?.products)) return data.data.products;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export async function fetchEliteToolsProducts(apiKey) {
  return productList(await request('/products', {}, undefined, apiKey));
}

export function normalizeEliteToolsProduct(product, defaultCurrency = 'USD') {
  const id = String(
    product?.id ?? product?.productId ?? product?.product_id ?? '',
  ).trim();
  const name = String(
    product?.name ?? product?.title ?? product?.product_name ?? '',
  ).trim();
  const wholesalePrice = Number(
    product?.price ??
      product?.price_usd ??
      product?.unit_price ??
      product?.wholesale_price ??
      product?.cost,
  );
  const rawStock = product?.stock ?? product?.quantity ?? product?.available;
  const stock = rawStock === null || rawStock === undefined ? 0 : Number(rawStock);
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
    delivery_instruction: product?.warranty
      ? `Provider warranty: ${String(product.warranty).slice(0, 500)}`
      : null,
    wholesale_price: wholesalePrice,
    currency: currency.slice(0, 12),
    stock,
    canonical_key: String(
      product?.sku || product?.slug || `elitetools:${id}`,
    ).slice(0, 200),
    ...(logo ? { logo_url: logo } : {}),
  };
}

export async function fetchEliteToolsBalance(apiKey) {
  const data = await request('/balance', {}, undefined, apiKey);
  return {
    balance: Number(data.balance ?? data.wallet_balance ?? data.data?.balance ?? 0),
    currency: String(data.currency || data.data?.currency || 'USD'),
  };
}

export async function createEliteToolsOrder({
  productId,
  quantity = 1,
  idempotencyKey,
  onExchange,
  apiKey,
}) {
  return request(
    '/buy',
    {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ productId: String(productId), quantity }),
    },
    onExchange,
    apiKey,
  );
}

export function eliteToolsDelivery(data) {
  const order = data.order || data.data || data;
  const raw =
    order.delivery ??
    order.accounts ??
    order.codes ??
    order.credentials ??
    order.items ??
    order.code ??
    order.result;
  if (raw === undefined || raw === null || raw === '')
    throw Object.assign(
      new Error('Elite Tools Store order completed without delivery data.'),
      { status: 503 },
    );
  return {
    content: typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2),
    instructions: order.instructions || '',
  };
}

export function eliteToolsOrderId(data, fallback) {
  const order = data.order || data.data || data;
  return String(order.id || order.orderId || order.order_id || fallback);
}
