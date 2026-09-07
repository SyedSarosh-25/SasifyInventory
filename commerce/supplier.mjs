const endpoint = 'https://api.mailreader.tech/api/reseller';

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
