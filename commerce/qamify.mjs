const endpoint = 'https://api.qamify.site';

function configured() {
  if (!process.env.QAMIFY_API_KEY) throw Object.assign(new Error('Qamify API is not configured.'), { status: 503 });
}

async function request(path, init = {}) {
  configured();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${endpoint}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${process.env.QAMIFY_API_KEY}`,
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      const message = data.error?.message || data.error || data.message || `Qamify request failed (${response.status}).`;
      throw Object.assign(new Error(message), { status: response.status >= 400 && response.status < 500 && response.status !== 429 ? 409 : 503, code: data.error?.code || null });
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw Object.assign(new Error('Qamify request timed out. It can be retried safely.'), { status: 503 });
    throw error;
  } finally { clearTimeout(timeout); }
}

export async function fetchQamifyProducts() {
  const data = await request('/v1/products');
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
  return {
    id,
    name,
    description: String(product?.description || ''),
    delivery_instruction: product?.delivery_instruction ? String(product.delivery_instruction) : null,
    wholesale_price: wholesalePrice,
    currency: currency.slice(0, 12),
    stock,
    canonical_key: String(product?.sku || product?.slug || `qamify:${id}`).slice(0, 200),
  };
}

export async function fetchQamifyBalance() {
  const data = await request('/v1/balance');
  return { balance: Number(data.balance), currency: String(data.currency || 'USD') };
}

export async function createQamifyOrder({ productId, quantity = 1, idempotencyKey }) {
  return request('/v1/orders', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ product_id: Number(productId), qty: quantity }),
  });
}

export function qamifyDelivery(data) {
  const order = data.order || data.data || data;
  const raw = order.items ?? order.keys ?? order.delivery ?? order.credentials ?? order.result;
  if (raw === undefined || raw === null || raw === '') throw Object.assign(new Error('Qamify order completed without delivery data.'), { status: 503 });
  return { content: typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2), instructions: order.instructions || '' };
}

export function qamifyOrderId(data, fallback) {
  const order = data.order || data.data || data;
  return String(order.code || order.order_code || order.id || fallback);
}
