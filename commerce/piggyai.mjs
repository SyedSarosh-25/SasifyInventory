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
      throw Object.assign(new Error(message), { status: response.status >= 400 && response.status < 500 && response.status !== 429 ? 409 : 503, code: data.code || null, retryAfter: Number(response.headers.get('retry-after') || 0) });
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
  if (Array.isArray(data?.data?.[key])) return data.data[key];
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export async function fetchPiggyAiProducts() {
  const products = [], seen = new Set();
  for (let page = 1; page <= 20; page++) {
    let data;
    try {
      data = await request(`/api/v2/telegram-buyer/products?limit=5&page=${page}`);
    } catch (error) {
      if (error.status === 503 && error.code === 'RATE_LIMITED' && error.retryAfter > 0 && error.retryAfter <= 60) {
        await new Promise((resolve) => setTimeout(resolve, error.retryAfter * 1000));
        data = await request(`/api/v2/telegram-buyer/products?limit=5&page=${page}`);
      } else throw error;
    }
    const batch = unwrap(data, 'products');
    let added = 0;
    for (const product of batch) {
      const id = String(product?.id ?? product?.product_id ?? '').trim();
      if (id && !seen.has(id)) { seen.add(id); products.push(product); added++; }
    }
    if (batch.length < 5 || added === 0) break;
  }
  return products;
}

export function normalizePiggyAiProduct(product, defaultCurrency = 'USD') {
  const id = String(product?.id ?? product?.product_id ?? product?.productId ?? '').trim();
  const name = String(product?.name_en ?? product?.name ?? product?.title ?? '').trim();
  const wholesalePrice = Number(product?.price_usd ?? product?.unit_price ?? product?.wholesale_price ?? product?.price?.amount ?? product?.price ?? product?.cost ?? product?.amount);
  const rawStock = product?.stock ?? product?.quantity ?? product?.available_stock ?? product?.available ?? product?.availability?.available ?? product?.in_stock;
  const stock = rawStock === null || rawStock === undefined ? 0 : Number(rawStock);
  const currency = String(product?.currency || defaultCurrency || 'USD').trim().toUpperCase();
  if (!id || !name || !Number.isFinite(wholesalePrice) || wholesalePrice < 0 || !Number.isSafeInteger(stock) || stock < 0) return null;
  return { id, name, description: String(product?.description_en ?? product?.description ?? ''), delivery_instruction: product?.activation_url ? String(product.activation_url) : null, wholesale_price: wholesalePrice, currency: currency.slice(0, 12), stock, canonical_key: String(product?.sku || product?.slug || `piggyai:${id}`).slice(0, 200) };
}

export async function fetchPiggyAiBalance() {
  const data = await request('/api/v2/telegram-buyer/balance');
  const value = data.balance ?? data.data?.balance ?? data.wallet_balance ?? 0;
  return { balance: Number(value), currency: String(data.currency || data.walletCurrency || data.data?.currency || 'USD') };
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
