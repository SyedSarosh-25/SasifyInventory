import { providerDescription } from './description.mjs';
import { providerLogo } from './provider-media.mjs';

const endpoint = 'https://api.technysoft.com';

function configured() {
  if (!process.env.MKE_API_KEY) throw Object.assign(new Error('MKE Shop API is not configured.'), { status: 503 });
}

async function request(path, init = {}) {
  configured();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${endpoint}${path}`, {
      ...init,
      headers: { 'X-API-Key': process.env.MKE_API_KEY, Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data.error?.message_en || data.error?.message || data.message || `MKE Shop request failed (${response.status}).`;
      throw Object.assign(new Error(message), { status: response.status === 409 ? 409 : response.status === 402 ? 402 : response.status >= 400 && response.status < 500 ? 409 : 503, code: data.error?.code || null });
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw Object.assign(new Error('MKE Shop request timed out. It can be retried safely.'), { status: 503 });
    throw error;
  } finally { clearTimeout(timeout); }
}

export async function fetchMkeProducts() {
  const data = await request('/v1/products');
  if (!Array.isArray(data)) throw Object.assign(new Error('MKE Shop returned an invalid product catalog.'), { status: 503 });
  return data;
}

export async function fetchMkeBalance() {
  const data = await request('/v1/me');
  return { balance: Number(data.balance), currency: String(data.currency || 'USD') };
}

export function normalizeMkeProduct(product, defaultCurrency = 'USD') {
  const id = String(product?.id ?? '').trim();
  const name = String(product?.name_en ?? product?.name ?? product?.title ?? '').trim();
  const wholesalePrice = Number(product?.price_usd ?? product?.unit_price ?? product?.price);
  const rawStock = product?.stock;
  const stock = rawStock === null ? 999999 : Number(rawStock);
  const currency = String(product?.currency || defaultCurrency || 'USD').trim().toUpperCase();
  if (!id || !name || !Number.isFinite(wholesalePrice) || wholesalePrice < 0 || !Number.isSafeInteger(stock) || stock < 0) return null;
  const logo = providerLogo(product);
  return { id, name, description: providerDescription(product), delivery_instruction: product?.activation_url ? `Activate or redeem using this link: ${String(product.activation_url)}` : null, wholesale_price: wholesalePrice, currency: currency.slice(0, 12), stock, canonical_key: String(product?.sku || product?.slug || `mke:${id}`).slice(0, 200), ...(logo ? { logo_url: logo } : {}) };
}

export async function createMkeOrder({ productId, quantity = 1, idempotencyKey }) {
  return request('/v1/buy', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify({ product_id: Number(productId), quantity }) });
}

export function mkeDelivery(data) {
  const order = data.order || data.data || data;
  const items = order.items || order.delivery || order.codes || order.result;
  if (items === undefined || items === null || items === '') throw Object.assign(new Error('MKE Shop order completed without delivery data.'), { status: 503 });
  const content = Array.isArray(items) ? items.map((item) => typeof item === 'string' ? item : item.content || item.note_en || JSON.stringify(item)).join('\n') : typeof items === 'string' ? items : JSON.stringify(items, null, 2);
  return { content, instructions: order.activation_url ? `Activation link: ${order.activation_url}` : '' };
}

export function mkeOrderId(data, fallback) {
  const order = data.order || data.data || data;
  return String(order.id || order.order_id || fallback);
}
