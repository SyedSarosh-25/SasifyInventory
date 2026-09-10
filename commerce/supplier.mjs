const endpoint = 'https://api.mailreader.tech/api/reseller';
import { providerLogo } from './provider-media.mjs';

function configured() {
  if (!process.env.DODI_RESELLER_API_KEY) throw Object.assign(new Error('Supplier API is not configured.'), { status: 503 });
}

async function request(action, init = {}) {
  configured();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${endpoint}?action=${action}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${process.env.DODI_RESELLER_API_KEY}`,
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      const message = data.error || data.message || `Supplier request failed (${response.status}).`;
      throw Object.assign(new Error(message), { status: response.status >= 400 && response.status < 500 && response.status !== 429 ? 409 : 503, code: data.error?.code || data.code || null });
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw Object.assign(new Error('Supplier request timed out. It will be retried safely.'), { status: 503 });
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchSupplierProducts() {
  const data = await request('products');
  if (!Array.isArray(data.products)) throw Object.assign(new Error('Supplier returned an invalid product catalog.'), { status: 503 });
  return { products: data.products, balance: data.reseller?.balance ?? null };
}

export function normalizeSupplierProduct(product) {
  const logo = providerLogo(product);
  return {
    id: String(product.id || '').trim(), name: String(product.name || '').trim(), description: String(product.description || ''),
    delivery_instruction: product.delivery_instruction ? String(product.delivery_instruction) : null,
    wholesale_price: Number(product.wholesale_price), currency: String(product.currency || 'USDT').slice(0, 12).toUpperCase(),
    stock: Number(product.stock), canonical_key: String(product.sku || product.slug || `dodi:${product.id}`).slice(0, 200),
    ...(logo ? { logo_url: logo } : {}),
  };
}

export async function fetchSupplierBalance() {
  const data = await request('balance');
  return data.reseller?.balance ?? null;
}

export async function createSupplierOrder({ productId, quantity = 1, externalOrderId }) {
  return request('order', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, quantity, external_order_id: externalOrderId }),
  });
}

export function supplierDelivery(data) {
  const order = data.order || data.data || data;
  const raw = order.delivery ?? order.credentials ?? order.items ?? order.stock ?? order.result ?? order.content;
  if (raw === undefined || raw === null || raw === '') throw Object.assign(new Error('Supplier order completed without delivery data.'), { status: 503 });
  return {
    content: typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2),
    instructions: order.delivery_instruction || data.delivery_instruction || '',
  };
}

export function supplierOrderId(data, fallback) {
  const order = data.order || data.data || data;
  return String(order.id || order.order_id || order.external_order_id || fallback);
}
