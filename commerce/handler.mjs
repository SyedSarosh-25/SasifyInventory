import pg from 'pg';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { hash, same, signature, encrypt, decrypt, parseEmail, parseInventory, normalizeTransaction, receiptText } from './core.mjs';
import { createSupplierOrder, fetchSupplierProducts, supplierDelivery, supplierOrderId } from './supplier.mjs';
import { createQamifyOrder, fetchQamifyBalance, fetchQamifyProducts, normalizeQamifyProduct, qamifyDelivery, qamifyOrderId } from './qamify.mjs';
import { createMkeOrder, fetchMkeBalance, fetchMkeProducts, mkeDelivery, mkeOrderId, normalizeMkeProduct } from './mke.mjs';
import { createPiggyAiOrder, fetchPiggyAiBalance, fetchPiggyAiProducts, normalizePiggyAiProduct, piggyAiDelivery, piggyAiOrderId } from './piggyai.mjs';
import { createZoomStoreOrder, fetchZoomStoreBalance, fetchZoomStoreProducts, normalizeZoomStoreProduct, zoomStoreDelivery, zoomStoreOrderId } from './zoomstore.mjs';
import { normalizeInboundEmail } from './inbound-email.mjs';
import catalog from './catalog.json' with { type: 'json' };

const fail = (status, message) => Object.assign(new Error(message), { status });
const bearer = (req) => String(req.headers.authorization || '').replace(/^Bearer /, '');
const adminCookie = (req) => String(req.headers.cookie || '').match(/(?:^|;\s*)sasify_admin=([^;]+)/)?.[1] || '';
const idOk = (value) => /^[a-f0-9-]{36}$/i.test(String(value || ''));
const json = (res, status, body) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
function inboundEmailAuthConfigured() {
  return !!String(process.env.NAYAPAY_INBOUND_TOKEN || '').trim()
    || (!!String(process.env.NAYAPAY_INBOUND_BASIC_USER || '').trim() && !!String(process.env.NAYAPAY_INBOUND_BASIC_PASSWORD || ''));
}
function inboundEmailAuthorized(req) {
  const token = String(process.env.NAYAPAY_INBOUND_TOKEN || '').trim();
  const providedToken = String(req.headers['x-nayapay-inbound-token'] || req.headers['x-inbound-webhook-token'] || '').trim();
  if (token && same(providedToken, token)) return true;
  const username = String(process.env.NAYAPAY_INBOUND_BASIC_USER || '').trim();
  const password = String(process.env.NAYAPAY_INBOUND_BASIC_PASSWORD || '');
  const authorization = String(req.headers.authorization || '');
  const expected = username && password ? `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` : '';
  return !!expected && same(authorization, expected);
}
const supplierUsdtRate = () => {
  const rate = Number(process.env.SUPPLIER_USDT_PKR_RATE || 285);
  return Number.isFinite(rate) && rate > 0 ? rate : 285;
};
const supplierUsdRate = () => {
  const rate = Number(process.env.QAMIFY_USD_PKR_RATE || process.env.SUPPLIER_USD_PKR_RATE || process.env.SUPPLIER_USDT_PKR_RATE || 0);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
};
function automaticCostPkr(price, currency) {
  if (currency === 'PKR') return Math.ceil(price);
  if (currency === 'USDT') return Math.ceil(price * supplierUsdtRate());
  if (currency === 'USD' && supplierUsdRate()) return Math.ceil(price * supplierUsdRate());
  return null;
}
function automaticProductKey(name) {
  const normalized = String(name || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 180);
  return normalized ? `auto:${normalized}` : null;
}
function supplierProviders() {
  return [
    {
      id: 'dodi', name: 'DODI Store', configured: !!process.env.DODI_RESELLER_API_KEY,
      async catalog() {
        const result = await fetchSupplierProducts();
        return { ...result, currency: 'USDT', products: result.products.map((product) => ({
          id: String(product.id || '').trim(), name: String(product.name || '').trim(), description: String(product.description || ''),
          delivery_instruction: product.delivery_instruction ? String(product.delivery_instruction) : null,
          wholesale_price: Number(product.wholesale_price), currency: String(product.currency || 'USDT').slice(0,12).toUpperCase(),
          stock: Number(product.stock), canonical_key: String(product.sku || product.slug || `dodi:${product.id}`).slice(0,200),
        })) };
      },
    },
    {
      id: 'qamify', name: 'Qamify', configured: !!process.env.QAMIFY_API_KEY,
      async catalog() {
        const [products, state] = await Promise.all([fetchQamifyProducts(), fetchQamifyBalance()]);
        return { ...state, products: products.map((product) => normalizeQamifyProduct(product, state.currency)).filter(Boolean) };
      },
    },
    {
      id: 'mke', name: 'MKE Shop', configured: !!process.env.MKE_API_KEY,
      async catalog() {
        const [products, state] = await Promise.all([fetchMkeProducts(), fetchMkeBalance()]);
        return { ...state, products: products.map((product) => normalizeMkeProduct(product, state.currency)).filter(Boolean) };
      },
    },
    {
      id: 'fatbunny', name: 'Fat Bunny Hub', configured: !!process.env.FATBUNNY_API_KEY,
      async catalog() {
        const products = await fetchPiggyAiProducts('FATBUNNY_API_KEY');
        let state = { balance: null, currency: 'USD' };
        try { state = await fetchPiggyAiBalance('FATBUNNY_API_KEY'); } catch (error) { console.error('fat-bunny-balance-error', error.status || error.name, error.code || ''); }
        const normalized = products.map((product) => normalizePiggyAiProduct(product, state.currency)).filter(Boolean);
        console.error('fat-bunny-catalog-count', products.length, normalized.length);
        return { ...state, products: normalized };
      },
    },
    {
      id: 'piggyai', name: 'PiggyAi', configured: !!process.env.PIGGYAI_API_KEY,
      async catalog() {
        const products = await fetchPiggyAiProducts();
        let state = { balance: null, currency: 'USD' };
        try { state = await fetchPiggyAiBalance(); } catch (error) { console.error('piggyai-balance-error', error.status || error.name, error.code || ''); }
        return { ...state, products: products.map((product) => normalizePiggyAiProduct(product, state.currency)).filter(Boolean) };
      },
    },
    {
      id: 'zoomstore', name: 'Zoom Store', configured: !!process.env.ZOOMSTORE_API_KEY,
      async catalog() {
        const [products, state] = await Promise.all([fetchZoomStoreProducts(), fetchZoomStoreBalance()]);
        return { ...state, products: products.map((product) => normalizeZoomStoreProduct(product, state.currency)).filter(Boolean) };
      },
    },
  ];
}
function adminToken(secret) {
  const expiresAt = Date.now() + 8 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ expiresAt })).toString('base64url');
  const mac = createHmac('sha256', secret).update(`admin:${payload}`).digest('base64url');
  return { token: `${payload}.${mac}`, expiresAt };
}
function validAdminToken(token, secret) {
  try {
    const [payload, mac] = String(token || '').split('.');
    const expected = createHmac('sha256', secret).update(`admin:${payload}`).digest('base64url');
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return same(mac, expected) && Number(data.expiresAt) > Date.now();
  } catch { return false; }
}
async function rate(db, key, max) {
  const result = await db.query(`INSERT INTO commerce_limits(key) VALUES($1) ON CONFLICT(key) DO UPDATE SET
    hits=CASE WHEN commerce_limits.window_start < now()-interval '1 minute' THEN 1 ELSE commerce_limits.hits+1 END,
    window_start=CASE WHEN commerce_limits.window_start < now()-interval '1 minute' THEN now() ELSE commerce_limits.window_start END RETURNING hits`, [key]);
  if (result.rows[0].hits > max) throw fail(429, 'Too many requests. Please wait a minute.');
}
async function syncSupplierCatalog(db, force = false) {
  await db.query("UPDATE commerce_supplier_products SET id='fatbunny:'||external_product_id, provider_id='fatbunny' WHERE provider_id='piggyai' AND provider_name='Fat Bunny Hub'");
  await db.query("UPDATE commerce_provider_state SET provider_id='fatbunny' WHERE provider_id='piggyai' AND provider_name='Fat Bunny Hub'");
  const results = [];
  for (const provider of supplierProviders().filter((item) => item.configured)) {
    const lockKey = `supplier-catalog-sync:${provider.id}`;
    const lock = force
      ? (await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [lockKey])).rows[0]
      : (await db.query('SELECT pg_try_advisory_xact_lock(hashtext($1)) AS locked', [lockKey])).rows[0];
    if (!force && !lock.locked) continue;
    if (!force) {
      const fresh = (await db.query("SELECT max(synced_at)>now()-interval '5 minutes' AS fresh FROM commerce_supplier_products WHERE provider_id=$1", [provider.id])).rows[0]?.fresh;
      if (fresh) continue;
    }
    const synced = await provider.catalog();
    let accepted = 0;
    for (const product of synced.products) {
      const wholesale = Number(product.wholesale_price), stock = Number(product.stock);
      if (!product.id || !product.name || !Number.isFinite(wholesale) || wholesale < 0 || !Number.isSafeInteger(stock) || stock < 0) continue;
      const externalId = String(product.id), id = provider.id === 'dodi' ? externalId : `${provider.id}:${externalId}`;
      const currency = String(product.currency || synced.currency || '').slice(0,12).toUpperCase();
      await db.query(`INSERT INTO commerce_supplier_products(id,name,description,delivery_instruction,wholesale_price,currency,supplier_stock,cost_pkr,provider_id,provider_name,external_product_id,canonical_key,synced_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now()) ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,
        delivery_instruction=excluded.delivery_instruction,wholesale_price=excluded.wholesale_price,currency=excluded.currency,supplier_stock=excluded.supplier_stock,
        provider_id=excluded.provider_id,provider_name=excluded.provider_name,external_product_id=excluded.external_product_id,
        canonical_key=CASE WHEN commerce_supplier_products.canonical_manual THEN commerce_supplier_products.canonical_key ELSE excluded.canonical_key END,
        canonical_manual=commerce_supplier_products.canonical_manual,
        cost_pkr=CASE WHEN commerce_supplier_products.cost_manual THEN commerce_supplier_products.cost_pkr ELSE excluded.cost_pkr END,synced_at=now()`,
        [id,String(product.name).slice(0,200),String(product.description || '').slice(0,10000),product.delivery_instruction ? String(product.delivery_instruction).slice(0,10000) : null,wholesale,currency,stock,automaticCostPkr(wholesale,currency),provider.id,provider.name,externalId,String(automaticProductKey(product.name) || product.canonical_key || `${provider.id}:${externalId}`).slice(0,200)]);
      accepted++;
    }
    await db.query(`INSERT INTO commerce_provider_state(provider_id,provider_name,balance,currency,synced_at) VALUES($1,$2,$3,$4,now())
      ON CONFLICT(provider_id) DO UPDATE SET provider_name=excluded.provider_name,balance=excluded.balance,currency=excluded.currency,synced_at=now()`,
      [provider.id,provider.name,Number.isFinite(Number(synced.balance)) ? Number(synced.balance) : null,String(synced.currency || '').slice(0,12).toUpperCase() || null]);
    results.push({ providerId: provider.id, providerName: provider.name, synced: accepted, balance: synced.balance ?? null, currency: synced.currency || null });
  }
  return results;
}
async function expire(db, includeReview = true) {
  const statuses = includeReview ? "('pending','review')" : "('pending')";
  await db.query(`WITH expired AS (UPDATE commerce_orders SET status='expired' WHERE status IN ${statuses} AND expires_at<now() RETURNING inventory_id)
    UPDATE commerce_inventory SET state='available' WHERE state='reserved' AND id IN (SELECT inventory_id FROM expired)`);
}
async function placeSupplierOrder(product, order) {
  if (product.provider_id === 'qamify') {
    if (!/^\d+$/.test(String(product.external_product_id || ''))) throw fail(503, 'Qamify product ID is invalid.');
    const result = await createQamifyOrder({ productId: Number(product.external_product_id), idempotencyKey: `sasify-${order.id}-${product.external_product_id}` });
    return { delivery: qamifyDelivery(result), supplierId: qamifyOrderId(result, order.id) };
  }
  if (product.provider_id === 'mke') {
    if (!/^\d+$/.test(String(product.external_product_id || ''))) throw fail(503, 'MKE Shop product ID is invalid.');
    const result = await createMkeOrder({ productId: Number(product.external_product_id), idempotencyKey: `sasify-${order.id}-${product.external_product_id}` });
    return { delivery: mkeDelivery(result), supplierId: mkeOrderId(result, order.id) };
  }
  if (['piggyai','fatbunny'].includes(product.provider_id)) {
    if (!String(product.external_product_id || '').trim()) throw fail(503, `${product.provider_name || 'PiggyAi'} product ID is invalid.`);
    const envName = product.provider_id === 'fatbunny' || product.provider_name === 'Fat Bunny Hub' ? 'FATBUNNY_API_KEY' : 'PIGGYAI_API_KEY';
    const result = await createPiggyAiOrder({ productId: product.external_product_id, idempotencyKey: `sasify-${order.id}-${product.external_product_id}`, envName });
    return { delivery: piggyAiDelivery(result), supplierId: piggyAiOrderId(result, order.id) };
  }
  if (product.provider_id === 'zoomstore') {
    if (!String(product.external_product_id || '').trim()) throw fail(503, 'Zoom Store product ID is invalid.');
    const result = await createZoomStoreOrder({ productId: product.external_product_id, idempotencyKey: `sasify-${order.id}-${product.external_product_id}` });
    return { delivery: zoomStoreDelivery(result), supplierId: zoomStoreOrderId(result, order.id) };
  }
  if (['dodi','dody'].includes(product.provider_id)) {
    const result = await createSupplierOrder({ productId: product.external_product_id || product.id, externalOrderId: order.id });
    return { delivery: supplierDelivery(result), supplierId: supplierOrderId(result, order.id) };
  }
  throw fail(503, 'Supplier provider is not supported.');
}
async function fulfill(db, orderId, paymentId, manual = false) {
  const order = (await db.query('SELECT * FROM commerce_orders WHERE id=$1 FOR UPDATE', [orderId])).rows[0];
  const payment = (await db.query('SELECT * FROM commerce_payments WHERE id=$1 FOR UPDATE', [paymentId])).rows[0];
  if (!order || !payment) throw fail(404, 'Order or payment not found.');
  if (order.status === 'delivered' && payment.order_id === order.id) return;
  if (!(manual ? ['pending','review','expired'] : ['pending','review']).includes(order.status)) throw fail(409, 'Order needs manual review; reservation has expired.');
  if (payment.order_id || payment.amount !== order.amount || !payment.transaction_id || payment.transaction_id !== order.transaction_id) throw fail(409, 'Payment ID, amount or allocation does not match.');
  if (!manual && (!payment.verified || !payment.received_at || new Date(payment.received_at) < new Date(order.created_at) || new Date(payment.received_at) > new Date(order.expires_at))) throw fail(409, 'Payment needs manual verification.');
  // Serialize competing claims before consuming the payment or inventory.
  await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [order.transaction_id]);
  const claims = (await db.query("SELECT id FROM commerce_orders WHERE transaction_id=$1 AND status IN ('pending','review','delivered')", [order.transaction_id])).rows;
  if (!manual && claims.length !== 1) throw fail(409, 'Multiple orders claim this transaction. Manual review required.');
  if (order.supplier_product_id) {
    const selected = (await db.query('SELECT * FROM commerce_supplier_products WHERE id=$1 FOR UPDATE', [order.supplier_product_id])).rows[0];
    if (!selected) throw fail(409, 'Supplier product is unavailable. Contact support.');
    const candidates = (await db.query(`SELECT * FROM commerce_supplier_products WHERE canonical_key=$1 AND enabled=true AND selling_price IS NOT NULL
      AND selling_price<=$2 AND supplier_stock>0 ORDER BY cost_pkr ASC NULLS LAST,wholesale_price ASC,id FOR UPDATE`, [selected.canonical_key,order.amount])).rows;
    if (!candidates.some((product)=>product.id===selected.id) && selected.supplier_stock>0) candidates.unshift(selected);
    let placed, product, lastError;
    for (const candidate of candidates) {
      try { placed = await placeSupplierOrder(candidate, order); product = candidate; break; }
      catch (error) {
        lastError = error;
        if (error.code !== 'out_of_stock') throw error;
        await db.query('UPDATE commerce_supplier_products SET supplier_stock=0 WHERE id=$1',[candidate.id]);
      }
    }
    if (!placed || !product) throw lastError || fail(409,'No supplier has stock for this order. Contact support.');
    const { delivery, supplierId } = placed;
    await db.query('UPDATE commerce_payments SET order_id=$1 WHERE id=$2', [order.id, payment.id]);
    await db.query("UPDATE commerce_orders SET status='delivered',delivered_at=now(),supplier_product_id=$1,supplier_cost_pkr=$2,supplier_order_id=$3,supplier_status='delivered',supplier_delivery=$4 WHERE id=$5", [product.id,product.cost_pkr || 0,supplierId,encrypt(delivery, process.env.COMMERCE_ENCRYPTION_KEY),order.id]);
    await db.query("INSERT INTO commerce_audit(action,object_id) VALUES('supplier_auto_delivery',$1)", [order.id]);
    return;
  }
  if (manual && order.status === 'expired') {
    const replacement = (await db.query("SELECT id FROM commerce_inventory WHERE product_id=$1 AND state='available' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1",[order.product_id])).rows[0];
    if (!replacement) throw fail(409,'No stock available for this late payment. Restock or arrange a refund.');
    await db.query("UPDATE commerce_inventory SET state='reserved' WHERE id=$1",[replacement.id]);
    await db.query("UPDATE commerce_orders SET inventory_id=$1,status='review' WHERE id=$2",[replacement.id,order.id]);
    order.inventory_id=replacement.id;
  }
  const changed = await db.query("UPDATE commerce_inventory SET state='delivered' WHERE id=$1 AND state='reserved' RETURNING id", [order.inventory_id]);
  if (!changed.rowCount) throw fail(409, 'Reserved stock is unavailable.');
  await db.query('UPDATE commerce_payments SET order_id=$1 WHERE id=$2', [order.id, payment.id]);
  await db.query("UPDATE commerce_orders SET status='delivered',delivered_at=now() WHERE id=$1", [order.id]);
  await db.query('INSERT INTO commerce_audit(action,object_id) VALUES($1,$2)', [manual ? 'manual_delivery' : 'auto_delivery', order.id]);
}
export function createHandler(poolFactory = () => new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 10000 })) {
let pool;
return async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  const action = req.query?.action || new URL(req.url, 'https://www.sasifysolutions.com').searchParams.get('action');
  const key = process.env.COMMERCE_ENCRYPTION_KEY;
  if (!process.env.DATABASE_URL || !/^[a-f0-9]{64}$/i.test(key || '')) return json(res, 503, { error: 'Online checkout is being prepared. Please contact us on WhatsApp.' });
  if (!['GET','POST'].includes(req.method)) return json(res, 405, { error: 'Method not allowed.' });
  const origin = req.headers.origin;
  if (origin && !['https://sasifysolutions.com','https://www.sasifysolutions.com', ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:4173'] : [])].includes(origin)) return json(res, 403, { error: 'Invalid origin.' });
  let db;
  try {
    pool ||= poolFactory();
    db = await pool.connect();
    let body = req.body || {};
    if (typeof body === 'string') body = JSON.parse(body);
    if (JSON.stringify(body).length > 200000) throw fail(413, 'Request too large.');
    const adminBearer = bearer(req), adminSession = adminCookie(req);
    const admin = same(adminBearer, process.env.COMMERCE_ADMIN_KEY) || validAdminToken(adminBearer, process.env.COMMERCE_ADMIN_KEY) || validAdminToken(adminSession, process.env.COMMERCE_ADMIN_KEY);
    await rate(db, hash(`${action}:${req.headers['x-vercel-forwarded-for'] || req.socket?.remoteAddress || 'unknown'}`), action === 'status' ? 60 : action === 'admin-login' ? 5 : 20);
    if (action?.startsWith('admin-') && !['admin-login','admin-logout'].includes(action) && !admin) throw fail(401, 'Your admin session is invalid or has expired.');
    if (action === 'email-webhook' && !same(body.secret, process.env.NAYAPAY_WEBHOOK_SECRET)) throw fail(401, 'Invalid webhook secret.');
    if (action === 'inbound-email') {
      if (!inboundEmailAuthConfigured()) throw fail(503, 'Inbound email receiver is not configured.');
      if (!inboundEmailAuthorized(req)) throw fail(401, 'Invalid inbound email authentication.');
    }
    if (['stock','status','admin-list'].includes(action) ? req.method !== 'GET' : req.method !== 'POST') throw fail(405, 'Method not allowed.');
    await db.query('BEGIN');
    await expire(db, !['email-webhook','inbound-email'].includes(action));
    let output;
    if (action === 'admin-login') {
      const email = String(body.email || '').trim().toLowerCase();
      const passwordHash = hash(String(body.password || ''));
      if (!same(email, String(process.env.COMMERCE_ADMIN_EMAIL || '').trim().toLowerCase()) || !same(passwordHash, process.env.COMMERCE_ADMIN_PASSWORD_HASH)) throw fail(401, 'Invalid email or password.');
      output = adminToken(process.env.COMMERCE_ADMIN_KEY);
      res.setHeader('Set-Cookie', `sasify_admin=${output.token}; HttpOnly; Secure; SameSite=Strict; Path=/api/commerce; Max-Age=28800`);
      await db.query("INSERT INTO commerce_audit(action,object_id) VALUES('admin_login',$1)", [hash(email).slice(0,16)]);
    } else if (action === 'admin-logout') {
      res.setHeader('Set-Cookie', 'sasify_admin=; HttpOnly; Secure; SameSite=Strict; Path=/api/commerce; Max-Age=0');
      output = { ok:true };
    } else if (action === 'stock') {
      await db.query('SAVEPOINT supplier_sync');
      try { await syncSupplierCatalog(db); } catch (error) { await db.query('ROLLBACK TO SAVEPOINT supplier_sync'); console.error('supplier-sync-error', error.status || error.name, error.code || '', error.message || ''); }
      const counts = (await db.query("SELECT product_id,count(*)::int AS available FROM commerce_inventory WHERE state='available' GROUP BY product_id")).rows;
      const supplierProducts = (await db.query(`WITH ranked AS (
        SELECT id,name,description,delivery_instruction,selling_price AS price,supplier_stock AS available,provider_id,provider_name,canonical_key,
          row_number() OVER(PARTITION BY canonical_key ORDER BY cost_pkr ASC NULLS LAST,wholesale_price ASC,id) AS choice
        FROM commerce_supplier_products WHERE enabled=true AND selling_price IS NOT NULL AND supplier_stock>0)
        SELECT id,name,description,delivery_instruction,price,available,provider_id,provider_name,canonical_key FROM ranked WHERE choice=1 ORDER BY name`)).rows;
      const supplierTotal = Number((await db.query('SELECT count(*)::int AS count FROM commerce_supplier_products')).rows[0]?.count || 0);
      output = { products: [...catalog.map((p) => ({ ...p, source:'local', available: counts.find((r) => r.product_id === p.id)?.available || 0 })),
        ...supplierProducts.map((p) => ({ ...p, id: p.canonical_key, source:'supplier' }))], productCount: catalog.length + supplierTotal, ready: !!process.env.PAYMENT_ACCOUNT_TITLE };
    } else if (action === 'create') {
      let product = catalog.find((p) => p.id === body.productId);
      let supplierProduct;
      if (!product) {
        const requested = (await db.query('SELECT canonical_key FROM commerce_supplier_products WHERE (id=$1 OR canonical_key=$1) AND enabled=true AND selling_price IS NOT NULL', [body.productId])).rows[0];
        if (requested) supplierProduct = (await db.query(`SELECT * FROM commerce_supplier_products WHERE canonical_key=$1 AND enabled=true AND selling_price IS NOT NULL
          AND supplier_stock>0 ORDER BY cost_pkr ASC NULLS LAST,wholesale_price ASC,id FOR UPDATE SKIP LOCKED LIMIT 1`, [requested.canonical_key])).rows[0];
        if (supplierProduct) product = { id:supplierProduct.id, name:supplierProduct.name, price:supplierProduct.selling_price };
      }
      if (!product || !process.env.PAYMENT_ACCOUNT_TITLE) throw fail(409, 'Online purchasing is not available for this product yet.');
      const session = String(req.headers.cookie || '').match(/(?:^|;\s*)sasify_checkout=([a-f0-9]{64})(?:;|$)/)?.[1] || randomBytes(32).toString('hex');
      const existing = await db.query("SELECT id FROM commerce_orders WHERE session_hash=$1 AND status IN ('pending','review')", [hash(session)]);
      if (existing.rowCount >= 2) throw fail(409, 'Complete or cancel your existing orders first.');
      let item;
      if (supplierProduct) {
        if (supplierProduct.supplier_stock < 1) throw fail(409, 'Sold out. Please contact us on WhatsApp.');
      } else {
        item = (await db.query("SELECT id FROM commerce_inventory WHERE product_id=$1 AND state='available' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1", [product.id])).rows[0];
        if (!item) throw fail(409, 'Sold out. Please contact us on WhatsApp.');
      }
      const id = randomUUID(), recovery = randomBytes(32).toString('hex');
      if (item) await db.query("UPDATE commerce_inventory SET state='reserved' WHERE id=$1", [item.id]);
      await db.query(`INSERT INTO commerce_orders(id,product_id,amount,recovery_hash,session_hash,inventory_id,supplier_product_id,supplier_cost_pkr,expires_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,now()+interval '5 minutes')`, [id, product.id, product.price, hash(recovery), hash(session), item?.id || null, supplierProduct?.id || null, supplierProduct?.cost_pkr || 0]);
      res.setHeader('Set-Cookie', `sasify_checkout=${session}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`);
      output = { id, recovery };
    } else if (['status','claim','cancel'].includes(action)) {
      const id = req.query?.id || body.id;
      if (!idOk(id)) throw fail(404, 'Order not found.');
      let order = (await db.query('SELECT * FROM commerce_orders WHERE id=$1 FOR UPDATE', [id])).rows[0];
      if (!order || !same(hash(bearer(req)), order.recovery_hash)) throw fail(404, 'Order not found or recovery key is incorrect.');
      if (action === 'cancel') {
        if (order.status !== 'pending' || order.transaction_id) throw fail(409, 'Contact support to cancel this order.');
        await db.query("UPDATE commerce_orders SET status='cancelled' WHERE id=$1", [id]);
        await db.query("UPDATE commerce_inventory SET state='available' WHERE id=$1 AND state='reserved'", [order.inventory_id]);
        output = { ok: true };
      } else if (action === 'claim') {
        if (!['pending','review','expired'].includes(order.status)) throw fail(409, 'Order is already closed.');
        const transaction = normalizeTransaction(body.transactionId);
        if (order.transaction_id && order.transaction_id !== transaction) throw fail(409, 'A transaction is already submitted. Contact support for a correction.');
        await db.query("UPDATE commerce_orders SET transaction_id=$1,status=CASE WHEN status='expired' THEN 'expired' ELSE 'review' END WHERE id=$2", [transaction, id]);
        // Late claims stay in review and cannot automatically consume released inventory.
        const matchingPayments = (await db.query(`SELECT id,transaction_id FROM commerce_payments
          WHERE verified=true AND order_id IS NULL AND amount=$2
          AND (transaction_id=$1 OR (length($1)>=8 AND right(transaction_id,length($1))=$1))
          ORDER BY (transaction_id=$1) DESC,created_at DESC LIMIT 2`, [transaction,order.amount])).rows;
        const payment = matchingPayments.length === 1 ? matchingPayments[0] : null;
        if (payment && order.status !== 'expired') {
          // NayaPay's app can expose only the trailing reference digits while its
          // receipt email contains the complete prefixed transaction ID.
          await db.query('UPDATE commerce_orders SET transaction_id=$1 WHERE id=$2',[payment.transaction_id,id]);
          await db.query('SAVEPOINT delivery');
          try { await fulfill(db, id, payment.id); } catch (e) { if (!e.status) throw e; await db.query('ROLLBACK TO SAVEPOINT delivery'); }
        }
        output = { ok: true };
      } else {
        const orderProduct = catalog.find((p) => p.id === order.product_id)?.name || (await db.query('SELECT name FROM commerce_supplier_products WHERE id=$1',[order.product_id])).rows[0]?.name;
        output = { id, product: orderProduct, amount: order.amount, status: order.status, expiresAt: order.expires_at, transactionId: order.transaction_id,
          payment: { number: '03450485711', provider: 'NayaPay', title: process.env.PAYMENT_ACCOUNT_TITLE } };
        if (order.status === 'delivered') {
          if (order.supplier_delivery) output.delivery = decrypt(order.supplier_delivery, key);
          else {
            const item = (await db.query('SELECT credentials FROM commerce_inventory WHERE id=$1', [order.inventory_id])).rows[0];
            output.credentials = decrypt(item.credentials, key);
          }
        }
      }
    } else if (action === 'email-webhook' || action === 'inbound-email') {
      const email = action === 'inbound-email' ? normalizeInboundEmail(body) : body;
      if (!email.subject || typeof email.text !== 'string') throw fail(400, 'Subject and plain email body required.');
      const signatureValid = action === 'inbound-email'
        ? inboundEmailAuthorized(req)
        : !!process.env.NAYAPAY_SIGNING_KEY && same(signature(email, process.env.NAYAPAY_SIGNING_KEY), email.signature)
          && Math.abs(Date.now()-Number(email.sentAt)) < 300000;
      const parsed = parseEmail(email, { enabled: signatureValid && process.env.NAYAPAY_AUTO_VERIFY === 'true', sender: process.env.NAYAPAY_SENDER, receiver: process.env.NAYAPAY_RECEIVER_MARKER, receiverMailbox:process.env.NAYAPAY_RECEIVER_EMAIL });
      const eventHash = hash(`${signatureValid ? (action === 'inbound-email' ? 'forwarded' : 'signed') : 'untrusted'}|${email.messageId || ''}|${email.subject}|${email.text}|${email.html || ''}`);
      const sourceMessageId = String(email.messageId || '').trim().slice(0, 500) || null;
      const encryptedBody = encrypt({ text: email.text, html:email.html || '', from: email.from, to:email.to || '', date: email.date }, key);
      let inserted = await db.query(`INSERT INTO commerce_payments(id,event_hash,source_message_id,transaction_id,amount,payer_name,source_last4,received_at,verified,subject,encrypted_body)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT DO NOTHING RETURNING id`, [randomUUID(), eventHash, sourceMessageId, signatureValid ? parsed.transaction : null, parsed.amount, parsed.payer, parsed.sourceLast4, parsed.received || null, parsed.verified, email.subject.slice(0,500), encryptedBody]);
      // A trusted retry can validate a previously recorded, unused receipt. Message IDs also deduplicate forwarded and Apps Script deliveries.
      if (!inserted.rowCount && parsed.verified) inserted = await db.query(`UPDATE commerce_payments SET transaction_id=$1,source_last4=$2,verified=true,encrypted_body=$3
        WHERE (event_hash=$4 OR ($5::text IS NOT NULL AND source_message_id=$5::text)) AND order_id IS NULL AND verified=false AND amount=$6 AND (transaction_id IS NULL OR transaction_id=$1) RETURNING id`,
        [parsed.transaction,parsed.sourceLast4,encryptedBody,eventHash,sourceMessageId,parsed.amount]);
      if (inserted.rowCount && parsed.verified) {
        const orders = (await db.query(`SELECT id FROM commerce_orders
          WHERE status IN ('pending','review') AND amount=$2
          AND (transaction_id=$1 OR (length(transaction_id)>=8 AND right($1,length(transaction_id))=transaction_id))`, [parsed.transaction,parsed.amount])).rows;
        if (orders.length === 1) {
          await db.query('UPDATE commerce_orders SET transaction_id=$1 WHERE id=$2',[parsed.transaction,orders[0].id]);
          await db.query('SAVEPOINT delivery');
          try { await fulfill(db, orders[0].id, inserted.rows[0].id); } catch (e) { if (!e.status) throw e; await db.query('ROLLBACK TO SAVEPOINT delivery'); }
        }
      }
      await expire(db);
      output = { ok: true, status: inserted.rowCount ? 'recorded' : 'duplicate' };
    } else if (action === 'admin-import') {
      if (!catalog.some((p) => p.id === body.productId)) throw fail(400, 'Select a product.');
      const purchaseCost = Number(body.purchaseCost || 0);
      if (!Number.isSafeInteger(purchaseCost) || purchaseCost < 0) throw fail(400, 'Enter a valid purchase cost.');
      let rows;
      try { rows = parseInventory(body.accounts); } catch(e) { throw fail(400,e.message); }
      for (const row of rows) await db.query('INSERT INTO commerce_inventory(id,product_id,email_hash,credentials,purchase_cost) VALUES($1,$2,$3,$4,$5)', [randomUUID(),body.productId,hash(row.email),encrypt(row,key),purchaseCost]);
      await db.query("INSERT INTO commerce_audit(action,object_id) VALUES('stock_import',$1)", [String(rows.length)]);
      output = { ok: true, imported: rows.length };
    } else if (action === 'admin-inventory-pick') {
      if (!idOk(body.inventoryId) || body.confirmed !== true) throw fail(400, 'Confirm the inventory withdrawal.');
      const item = (await db.query('SELECT * FROM commerce_inventory WHERE id=$1 FOR UPDATE',[body.inventoryId])).rows[0];
      if (!item) throw fail(404, 'Inventory account not found.');
      if (item.state !== 'available') throw fail(409, 'Only available inventory can be picked.');
      const credentials = decrypt(item.credentials,key);
      const changed = await db.query("UPDATE commerce_inventory SET state='withdrawn' WHERE id=$1 AND state='available' RETURNING id",[item.id]);
      if (!changed.rowCount) throw fail(409, 'This account is no longer available.');
      await db.query("INSERT INTO commerce_audit(action,object_id) VALUES('inventory_admin_pick',$1)",[item.id]);
      output={ok:true,inventoryId:item.id,credentials};
    } else if (action === 'admin-inventory-update') {
      if (!idOk(body.inventoryId)) throw fail(400, 'Invalid inventory ID.');
      const item = (await db.query('SELECT * FROM commerce_inventory WHERE id=$1 FOR UPDATE',[body.inventoryId])).rows[0];
      if (!item) throw fail(404, 'Inventory account not found.');
      const purchaseCost = Number(body.purchaseCost);
      if (!Number.isSafeInteger(purchaseCost) || purchaseCost < 0) throw fail(400, 'Enter a valid purchase cost.');
      const nextState = String(body.state || item.state);
      if (item.state === 'reserved') throw fail(409, 'Reserved stock cannot be edited. Cancel its order first.');
      if (item.state === 'withdrawn') throw fail(409, 'Withdrawn stock cannot be reopened or edited.');
      if (item.state === 'delivered' && nextState !== 'delivered') throw fail(409, 'Delivered stock history cannot be reopened.');
      if (!['available','quarantined','delivered'].includes(nextState)) throw fail(400, 'Invalid inventory state.');
      const replacingCredentials = [body.email,body.password,body.twoFactor].some((value) => String(value || '').trim());
      if (replacingCredentials) {
        if (!['available','quarantined'].includes(item.state)) throw fail(409, 'Delivered credentials cannot be replaced.');
        let row;
        try { [row] = parseInventory(`${body.email || ''}|${body.password || ''}|${body.twoFactor || ''}`); } catch(e) { throw fail(400,e.message); }
        await db.query('UPDATE commerce_inventory SET email_hash=$1,credentials=$2,purchase_cost=$3,state=$4 WHERE id=$5',[hash(row.email),encrypt(row,key),purchaseCost,nextState,item.id]);
      } else {
        await db.query('UPDATE commerce_inventory SET purchase_cost=$1,state=$2 WHERE id=$3',[purchaseCost,nextState,item.id]);
      }
      await db.query("INSERT INTO commerce_audit(action,object_id) VALUES('inventory_update',$1)",[item.id]);
      output={ok:true};
    } else if (action === 'admin-inventory-delete') {
      if (!idOk(body.inventoryId) || body.confirmed !== true) throw fail(400, 'Confirm the inventory deletion.');
      const item=(await db.query('SELECT * FROM commerce_inventory WHERE id=$1 FOR UPDATE',[body.inventoryId])).rows[0];
      if(!item) throw fail(404,'Inventory account not found.');
      if(!['available','quarantined'].includes(item.state)) throw fail(409,'Only available or quarantined stock can be deleted.');
      await db.query("UPDATE commerce_orders SET inventory_id=NULL WHERE inventory_id=$1 AND status IN ('cancelled','expired')",[item.id]);
      await db.query('DELETE FROM commerce_inventory WHERE id=$1',[item.id]);
      await db.query("INSERT INTO commerce_audit(action,object_id) VALUES('inventory_delete',$1)",[item.id]);
      output={ok:true};
    } else if (action === 'admin-supplier-sync') {
      const providers = await syncSupplierCatalog(db, true);
      if (!providers.length) throw fail(503,'No supplier API is configured.');
      const synced = providers.reduce((sum,provider)=>sum+provider.synced,0);
      await db.query("INSERT INTO commerce_audit(action,object_id) VALUES('supplier_sync',$1)",[String(synced)]);
      output={ok:true,synced,providers};
    } else if (action === 'admin-supplier-update') {
      const supplierId=String(body.productId || '');
      const sellingPrice=Number(body.sellingPrice), costPkr=Number(body.costPkr);
      const canonicalKey=String(body.canonicalKey || '').trim().toLowerCase();
      if (!supplierId || !Number.isSafeInteger(sellingPrice) || sellingPrice<1 || !Number.isSafeInteger(costPkr) || costPkr<0 || !/^[a-z0-9][a-z0-9:_-]{1,199}$/.test(canonicalKey)) throw fail(400,'Enter valid supplier product prices and mapping key.');
      const changed=await db.query('UPDATE commerce_supplier_products SET selling_price=$1,cost_pkr=$2,cost_manual=true,enabled=$3,canonical_key=$4,canonical_manual=true WHERE id=$5 RETURNING id',[sellingPrice,costPkr,body.enabled===true,canonicalKey,supplierId]);
      if(!changed.rowCount) throw fail(404,'Supplier product not found. Sync products first.');
      await db.query("INSERT INTO commerce_audit(action,object_id) VALUES('supplier_product_update',$1)",[supplierId]);
      output={ok:true};
    } else if (action === 'admin-list') {
      const inventoryRows=(await db.query('SELECT id,product_id,state,purchase_cost,credentials,created_at FROM commerce_inventory ORDER BY created_at DESC LIMIT 500')).rows;
      const inventory=inventoryRows.map((row)=>{let email='Unavailable';try{email=decrypt(row.credentials,key).email;}catch{}return {id:row.id,productId:row.product_id,state:row.state,purchaseCost:row.purchase_cost,email,createdAt:row.created_at};});
      const metrics=(await db.query(`SELECT
        COALESCE(SUM(o.amount) FILTER (WHERE o.status='delivered'),0)::int AS income,
        COALESCE(SUM(COALESCE(i.purchase_cost,o.supplier_cost_pkr,0)) FILTER (WHERE o.status='delivered'),0)::int AS cost,
        COALESCE(SUM(o.amount-COALESCE(i.purchase_cost,o.supplier_cost_pkr,0)) FILTER (WHERE o.status='delivered'),0)::int AS profit,
        COALESCE(SUM(o.amount) FILTER (WHERE o.status='delivered' AND o.delivered_at>=date_trunc('month',now())),0)::int AS monthly_income,
        COALESCE(SUM(o.amount-COALESCE(i.purchase_cost,o.supplier_cost_pkr,0)) FILTER (WHERE o.status='delivered' AND o.delivered_at>=date_trunc('month',now())),0)::int AS monthly_profit,
        COUNT(*) FILTER (WHERE o.status='delivered')::int AS delivered_orders,
        COUNT(*) FILTER (WHERE o.status IN ('pending','review'))::int AS active_orders,
        COUNT(*) FILTER (WHERE o.status='delivered' AND COALESCE(i.purchase_cost,o.supplier_cost_pkr,0)=0)::int AS missing_costs
        FROM commerce_orders o LEFT JOIN commerce_inventory i ON i.id=o.inventory_id`)).rows[0];
      const profitBreakdown=(await db.query(`SELECT CASE WHEN o.supplier_product_id IS NULL THEN 'local' ELSE 'supplier' END AS source,
        COALESCE(SUM(o.amount),0)::int AS income,
        COALESCE(SUM(COALESCE(i.purchase_cost,o.supplier_cost_pkr,0)),0)::int AS cost,
        COALESCE(SUM(o.amount-COALESCE(i.purchase_cost,o.supplier_cost_pkr,0)),0)::int AS profit,
        COUNT(*)::int AS orders
        FROM commerce_orders o LEFT JOIN commerce_inventory i ON i.id=o.inventory_id
        WHERE o.status='delivered' GROUP BY 1 ORDER BY 1`)).rows;
      output = { metrics, inventory, supplierProducts:(await db.query('SELECT * FROM commerce_supplier_products ORDER BY provider_name,name')).rows,
        providerStates:(await db.query('SELECT * FROM commerce_provider_state ORDER BY provider_name')).rows,
        orders: (await db.query('SELECT o.id,o.product_id,o.amount,o.status,o.transaction_id,o.payer_name,o.supplier_order_id,o.supplier_status,sp.provider_name AS supplier_name,sp.name AS supplier_product_name,o.created_at,o.delivered_at FROM commerce_orders o LEFT JOIN commerce_supplier_products sp ON sp.id=o.supplier_product_id ORDER BY o.created_at DESC LIMIT 100')).rows,
        payments: (await db.query('SELECT id,amount,subject,transaction_id,verified,order_id,created_at FROM commerce_payments ORDER BY created_at DESC LIMIT 100')).rows,
        stock: (await db.query('SELECT product_id,state,count(*)::int AS count FROM commerce_inventory GROUP BY product_id,state')).rows,
        autoVerify: process.env.NAYAPAY_AUTO_VERIFY === 'true', supplierUsdtPkrRate:supplierUsdtRate(), supplierUsdPkrRate:supplierUsdRate(), profitBreakdown };
    } else if (action === 'admin-payment') {
      if (!idOk(body.paymentId)) throw fail(400, 'Invalid payment ID.');
      const payment = (await db.query('SELECT * FROM commerce_payments WHERE id=$1', [body.paymentId])).rows[0];
      if (!payment) throw fail(404, 'Payment not found.');
      output = { text:receiptText(decrypt(payment.encrypted_body, key)), subject: payment.subject };
    } else if (action === 'admin-order-delivery') {
      if (!idOk(body.orderId)) throw fail(400, 'Invalid order ID.');
      const row = (await db.query(`SELECT o.id,o.status,o.product_id,o.delivered_at,o.supplier_delivery,i.credentials
        FROM commerce_orders o LEFT JOIN commerce_inventory i ON i.id=o.inventory_id WHERE o.id=$1`, [body.orderId])).rows[0];
      if (!row) throw fail(404, 'Order not found.');
      if (row.status !== 'delivered') throw fail(409, 'This order has no recorded delivery yet.');
      output = { orderId: row.id, deliveredAt: row.delivered_at, productId: row.product_id, delivery: row.supplier_delivery ? decrypt(row.supplier_delivery, key) : null, credentials: row.credentials ? decrypt(row.credentials, key) : null };
    } else if (action === 'admin-approve') {
      if (!idOk(body.orderId) || !idOk(body.paymentId) || body.confirmed !== true) throw fail(400, 'Confirm payment in NayaPay before approval.');
      await fulfill(db,body.orderId,body.paymentId,true); output = { ok: true };
    } else if (action === 'admin-cancel') {
      if (!idOk(body.orderId) || body.confirmed !== true) throw fail(400,'Confirm cancellation first.');
      const order=(await db.query('SELECT * FROM commerce_orders WHERE id=$1 FOR UPDATE',[body.orderId])).rows[0];
      if(!order || !['pending','review'].includes(order.status)) throw fail(409,'Only undelivered reservations can be cancelled.');
      await db.query("UPDATE commerce_orders SET status='cancelled' WHERE id=$1",[order.id]);
      await db.query("UPDATE commerce_inventory SET state='available' WHERE id=$1 AND state='reserved'",[order.inventory_id]);
      await db.query("INSERT INTO commerce_audit(action,object_id) VALUES('admin_cancel',$1)",[order.id]);
      output={ok:true};
    } else throw fail(404, 'Unknown request.');
    await db.query('COMMIT'); json(res,200,output);
  } catch (e) {
    if (db) await db.query('ROLLBACK').catch(() => {});
    const code = e.status || (e.code === '23505' ? 409 : 503);
    json(res,code,{ error: e.status ? e.message : e.code === '23505' ? 'Duplicate account or payment. Nothing was imported.' : 'Service temporarily unavailable. Please retry or contact support.' });
    if (!e.status) console.error('commerce-error', e.code || e.name);
  } finally { db?.release(); }
};
}
export default createHandler();
