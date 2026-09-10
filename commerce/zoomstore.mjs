import { providerDescription } from './description.mjs';
import { providerLogo } from './provider-media.mjs';

const endpoint = 'https://api.zoomstore255.com/api/v1';

function configured() {
  if (!process.env.ZOOMSTORE_API_KEY) throw Object.assign(new Error('Zoom Store API is not configured.'), { status: 503 });
}

async function request(path, init = {}) {
  configured();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${endpoint}${path}`, { ...init, headers: { 'X-API-Key': process.env.ZOOMSTORE_API_KEY, Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers }, signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false || data.ok === false) {
      const message = data.message || data.error || `Zoom Store request failed (${response.status}).`;
      throw Object.assign(new Error(message), { status: response.status >= 400 && response.status < 500 && response.status !== 429 ? 409 : 503, code: data.code || null, retryAfter: Number(response.headers.get('retry-after') || 0) });
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw Object.assign(new Error('Zoom Store request timed out. It can be retried safely.'), { status: 503 });
    throw error;
  } finally { clearTimeout(timeout); }
}

function list(data, key) { return Array.isArray(data) ? data : Array.isArray(data?.[key]) ? data[key] : Array.isArray(data?.data) ? data.data : Array.isArray(data?.data?.[key]) ? data.data[key] : []; }

export async function fetchZoomStoreProducts() { return list(await request('/products'), 'products'); }

export function normalizeZoomStoreProduct(product, defaultCurrency = 'USD') {
  const id = String(product?.id ?? product?.product_id ?? product?.sku ?? '').trim();
  const name = String(product?.name ?? product?.title ?? product?.product_name ?? '').trim();
  const wholesalePrice = Number(product?.price_usd ?? product?.unit_price ?? product?.wholesale_price ?? product?.price ?? product?.cost);
  const stock = Number(product?.stock ?? product?.quantity ?? product?.available_stock ?? product?.available ?? 0);
  const currency = String(product?.currency || defaultCurrency || 'USD').trim().toUpperCase();
  if (!id || !name || !Number.isFinite(wholesalePrice) || wholesalePrice < 0 || !Number.isSafeInteger(stock) || stock < 0) return null;
  const logo = providerLogo(product);
  return { id, name, description: providerDescription(product), delivery_instruction: product?.activation_url ? String(product.activation_url) : null, wholesale_price: wholesalePrice, currency: currency.slice(0, 12), stock, canonical_key: String(product?.slug || `zoomstore:${id}`).slice(0, 200), ...(logo ? { logo_url: logo } : {}) };
}

export async function fetchZoomStoreBalance() { const data = await request('/balance'); const source = data.data || data; return { balance: Number(source.balance ?? source.wallet_balance ?? 0), currency: String(source.currency || 'USD') }; }
export async function createZoomStoreOrder({ productId, quantity = 1, idempotencyKey }) { return request('/purchase', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify({ product_id: productId, quantity }) }); }
export function zoomStoreDelivery(data) { const order = data.order || data.data || data; const raw = order.items ?? order.delivery ?? order.credentials ?? order.code ?? order.content ?? order.result; if (raw === undefined || raw === null || raw === '') throw Object.assign(new Error('Zoom Store order completed without delivery data.'), { status: 503 }); return { content: typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2), instructions: order.instructions || '' }; }
export function zoomStoreOrderId(data, fallback) { const order = data.order || data.data || data; return String(order.id || order.order_id || order.purchase_id || fallback); }
