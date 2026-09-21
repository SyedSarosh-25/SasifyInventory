import { providerDescription } from './description.mjs';
import { providerLogo } from './provider-media.mjs';
import { supplierRequiresCustomerEmail } from './supplier-capabilities.mjs';
import {
  notifySupplierApiExchange,
  supplierErrorMessage,
  supplierLogHeaders,
  supplierLogPayload,
} from './supplier-api-log.mjs';

const endpoint = 'https://api.qamify.site';

function configured(apiKey) {
  if (!apiKey && !process.env.QAMIFY_API_KEY) throw Object.assign(new Error('Qamify API is not configured.'), { status: 503 });
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
      headers: {
        Authorization: `Bearer ${apiKey || process.env.QAMIFY_API_KEY}`,
        ...headers,
      },
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    await notifySupplierApiExchange(onExchange, {
      providerId: 'qamify',
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
    if (!response.ok || data.ok === false) {
      const message = supplierErrorMessage(data, `Qamify request failed (${response.status}).`);
      throw Object.assign(new Error(message), { status: response.status >= 400 && response.status < 500 && response.status !== 429 ? 409 : 503, code: data.error?.code || null });
    }
    return data;
  } catch (error) {
    if (!exchangeLogged)
      await notifySupplierApiExchange(onExchange, {
        providerId: 'qamify',
        operation: 'purchase',
        endpoint: url,
        requestMethod: method,
        requestHeaders: supplierLogHeaders(headers),
        requestBody: supplierLogPayload(init.body),
        responseStatus: null,
        responseBody: null,
        errorMessage: error.message,
      });
    if (error.name === 'AbortError') throw Object.assign(new Error('Qamify request timed out. It can be retried safely.'), { status: 503 });
    throw error;
  } finally { clearTimeout(timeout); }
}

export async function fetchQamifyProducts(apiKey) {
  const data = await request('/v1/products', {}, undefined, apiKey);
  if (!Array.isArray(data.products)) throw Object.assign(new Error('Qamify returned an invalid catalog.'), { status: 503 });
  return data.products;
}

export function normalizeQamifyProduct(product, defaultCurrency = 'USD') {
  const id = String(product?.id ?? '').trim();
  const name = String(product?.name ?? product?.title ?? '').trim();
  const wholesalePrice = Number(product?.unit_price ?? product?.reseller_price ?? product?.price ?? product?.cost);
  const stock = Number(product?.stock ?? product?.available_stock ?? product?.available);
  const currency = String(product?.currency || defaultCurrency || 'USD').trim().toUpperCase();
  if (!id || !name || !Number.isFinite(wholesalePrice) || wholesalePrice < 0 || !Number.isSafeInteger(stock) || stock < 0) return null;
  const logo = providerLogo(product);
  return {
    id,
    name,
    description: providerDescription(product),
    delivery_instruction: product?.delivery_instruction ? String(product.delivery_instruction) : null,
    wholesale_price: wholesalePrice,
    currency: currency.slice(0, 12),
    stock,
    canonical_key: String(product?.sku || product?.slug || `qamify:${id}`).slice(0, 200),
    ...(supplierRequiresCustomerEmail(product, 'qamify')
      ? { requires_customer_email: true }
      : {}),
    ...(logo ? { logo_url: logo } : {}),
  };
}

export async function fetchQamifyBalance(apiKey) {
  const data = await request('/v1/balance', {}, undefined, apiKey);
  return { balance: Number(data.balance), currency: String(data.currency || 'USD') };
}

export async function createQamifyOrder({ productId, quantity = 1, idempotencyKey, customerEmail, onExchange, apiKey }) {
  return request('/v1/orders', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({
      product_id: Number(productId),
      qty: quantity,
      ...(customerEmail ? { email: customerEmail } : {}),
    }),
  }, onExchange, apiKey);
}

export function qamifyDelivery(data) {
  const containers = [
    data,
    data?.data,
    data?.order,
    data?.data?.order,
  ].filter((container, index, all) => container && all.indexOf(container) === index);
  const deliveryFields = ['delivery', 'items', 'keys', 'credentials', 'result', 'content'];
  let raw;
  for (const container of containers) {
    for (const field of deliveryFields) {
      const value = container[field];
      if (value !== undefined && value !== null && value !== '') {
        raw = value;
        break;
      }
    }
    if (raw !== undefined) break;
  }
  if (raw === undefined || raw === null || raw === '') throw Object.assign(new Error('Qamify order completed without delivery data.'), { status: 503 });
  const instructions = containers.map((container) => container.instructions).find((value) => value !== undefined && value !== null && value !== '') || '';
  return { content: typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2), instructions: String(instructions) };
}

export function qamifyOrderId(data, fallback) {
  const containers = [data?.order, data?.data?.order, data?.data, data].filter((container, index, all) => container && all.indexOf(container) === index);
  for (const container of containers) {
    const orderId = container.orderCode || container.code || container.order_code || container.id;
    if (orderId !== undefined && orderId !== null && orderId !== '') return String(orderId);
  }
  return String(fallback);
}
