const endpoint = 'https://canboso.com';

function configured() {
  if (!process.env.PIGGYAI_API_KEY) throw Object.assign(new Error('PiggyAi API is not configured.'), { status: 503 });
}

async function request(path, init = {}) {
  configured();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${endpoint}${path}`, {
      ...init,
      headers: {
        'X-API-Key': process.env.PIGGYAI_API_KEY,
        Authorization: `Bearer ${process.env.PIGGYAI_API_KEY}`,
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      const message = data.message || data.error || `PiggyAi request failed (${response.status}).`;
      throw Object.assign(new Error(message), { status: response.status >= 400 && response.status < 500 && response.status !== 429 ? 409 : 503 });
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw Object.assign(new Error('PiggyAi request timed out. It can be retried safely.'), { status: 503 });
    throw error;
  } finally { clearTimeout(timeout); }
}

function unwrap(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export async function fetchPiggyAiProducts() {
  const data = await request('/api/v2/telegram-buyer/products');
  return unwrap(data, 'products');
}

export function normalizePiggyAiProduct(product, defaultCurrency = 'USD') {
  const id = String(product?.id ?? product?.product_id ?? '').trim();
  const name = String(product?.name_en ?? product?.name ?? product?.title ?? '').trim();
  const wholesalePrice = Number(product?.price_usd ?? product?.price ?? product?.cost ?? product?.amount);
  const rawStock = product?.stock ?? product?.quantity ?? product?.available_stock ?? product?.available;
  const stock = rawStock === null || rawStock === undefined ? 0 : Number(rawStock);
  const currency = String(product?.currency || defaultCurrency || 'USD').trim().toUpperCase();
  if (!id || !name || !Number.isFinite(wholesalePrice) || wholesalePrice < 0 || !Number.isSafeInteger(stock) || stock < 0) return null;
  return { id, name, description: String(product?.description_en ?? product?.description ?? ''), delivery_instruction: product?.activation_url ? String(product.activation_url) : null, wholesale_price: wholesalePrice, currency: currency.slice(0, 12), stock, canonical_key: String(product?.sku || product?.slug || `piggyai:${id}`).slice(0, 200) };
}

export async function fetchPiggyAiBalance() {
  const data = await request('/api/v2/telegram-buyer/balance');
  const value = data.balance ?? data.data?.balance ?? data.wallet_balance ?? 0;
  return { balance: Number(value), currency: String(data.currency || data.data?.currency || 'USD') };
}

export async function createPiggyAiOrder({ productId, quantity = 1, idempotencyKey }) {
  return request('/api/v2/telegram-buyer/purchase', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify({ product_id: productId, quantity }) });
}

export function piggyAiDelivery(data) {
  const order = data.order || data.data || data;
  const raw = order.items ?? order.delivery ?? order.credentials ?? order.code ?? order.content ?? order.result;
  if (raw === undefined || raw === null || raw === '') throw Object.assign(new Error('PiggyAi order completed without delivery data.'), { status: 503 });
  return { content: typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2), instructions: order.instructions || '' };
}

export function piggyAiOrderId(data, fallback) {
  const order = data.order || data.data || data;
  return String(order.id || order.order_id || order.purchase_id || fallback);
}
