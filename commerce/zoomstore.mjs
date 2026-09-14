import { providerDescription } from './description.mjs';
import { providerLogo } from './provider-media.mjs';
import { supplierRequiresCustomerEmail } from './supplier-capabilities.mjs';
import { notifySupplierApiExchange, supplierErrorMessage, supplierLogHeaders, supplierLogPayload } from './supplier-api-log.mjs';

const endpoint = 'https://api.zoomstore255.com/api/v1';

function configured(apiKey) {
  if (!apiKey && !process.env.ZOOMSTORE_API_KEY) throw Object.assign(new Error('Zoom Store API is not configured.'), { status: 503 });
}

async function request(path, init = {}, onExchange, apiKey) {
  configured(apiKey);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  const url = `${endpoint}${path}`;
  const method = String(init.method || 'GET').toUpperCase();
  const headers = { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers };
  let exchangeLogged = false;
  try {
    const response = await fetch(url, { ...init, headers: { 'X-API-Key': apiKey || process.env.ZOOMSTORE_API_KEY, ...headers }, signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    await notifySupplierApiExchange(onExchange, { providerId: 'zoomstore', operation: 'purchase', endpoint: url, requestMethod: method, requestHeaders: supplierLogHeaders(headers), requestBody: supplierLogPayload(init.body), responseStatus: response.status, responseBody: supplierLogPayload(data), errorMessage: null });
    exchangeLogged = true;
    if (!response.ok || data.success === false || data.ok === false) {
      const message = supplierErrorMessage(data, `Zoom Store request failed (${response.status}).`);
      throw Object.assign(new Error(message), { status: response.status >= 400 && response.status < 500 && response.status !== 429 ? 409 : 503, code: data.code || null, retryAfter: Number(response.headers.get('retry-after') || 0) });
    }
    return data;
  } catch (error) {
    if (!exchangeLogged) await notifySupplierApiExchange(onExchange, { providerId: 'zoomstore', operation: 'purchase', endpoint: url, requestMethod: method, requestHeaders: supplierLogHeaders(headers), requestBody: supplierLogPayload(init.body), responseStatus: null, responseBody: null, errorMessage: error.message });
    if (error.name === 'AbortError') throw Object.assign(new Error('Zoom Store request timed out. It can be retried safely.'), { status: 503 });
    throw error;
  } finally { clearTimeout(timeout); }
}

function list(data, key) { return Array.isArray(data) ? data : Array.isArray(data?.[key]) ? data[key] : Array.isArray(data?.data) ? data.data : Array.isArray(data?.data?.[key]) ? data.data[key] : []; }

export async function fetchZoomStoreProducts(apiKey) { return list(await request('/products', {}, undefined, apiKey), 'products'); }

export function normalizeZoomStoreProduct(product, defaultCurrency = 'USD') {
  const id = String(product?.id ?? product?.product_id ?? product?.sku ?? '').trim();
  const name = String(product?.name ?? product?.title ?? product?.product_name ?? '').trim();
  const wholesalePrice = Number(product?.price_usd ?? product?.unit_price ?? product?.wholesale_price ?? product?.price ?? product?.cost);
  const stock = Number(product?.stock ?? product?.quantity ?? product?.available_stock ?? product?.available ?? 0);
  const currency = String(product?.currency || defaultCurrency || 'USD').trim().toUpperCase();
  if (!id || !name || !Number.isFinite(wholesalePrice) || wholesalePrice < 0 || !Number.isSafeInteger(stock) || stock < 0) return null;
  const logo = providerLogo(product);
  return { id, name, description: providerDescription(product), delivery_instruction: product?.activation_url ? String(product.activation_url) : null, wholesale_price: wholesalePrice, currency: currency.slice(0, 12), stock, canonical_key: String(product?.slug || `zoomstore:${id}`).slice(0, 200), ...(supplierRequiresCustomerEmail(product, 'zoomstore') ? { requires_customer_email: true } : {}), ...(logo ? { logo_url: logo } : {}) };
}

export async function fetchZoomStoreBalance(apiKey) { const data = await request('/balance', {}, undefined, apiKey); const source = data.data || data; return { balance: Number(source.balance ?? source.wallet_balance ?? 0), currency: String(source.currency || 'USD') }; }
export async function createZoomStoreOrder({ productId, quantity = 1, idempotencyKey, customerEmail, onExchange, apiKey }) { return request('/purchase', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify({ product_id: productId, quantity, ...(customerEmail ? { email: customerEmail } : {}) }) }, onExchange, apiKey); }
export function zoomStoreDelivery(data) { const order = data.order || data.data || data; const raw = order.items ?? order.delivery ?? order.credentials ?? order.code ?? order.content ?? order.result; if (raw === undefined || raw === null || raw === '') throw Object.assign(new Error('Zoom Store order completed without delivery data.'), { status: 503 }); return { content: typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2), instructions: order.instructions || '' }; }
export function zoomStoreOrderId(data, fallback) { const order = data.order || data.data || data; return String(order.id || order.order_id || order.purchase_id || fallback); }
