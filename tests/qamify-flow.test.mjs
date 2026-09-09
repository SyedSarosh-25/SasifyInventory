import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createHandler } from '../commerce/handler.mjs';
import { encrypt, hash } from '../commerce/core.mjs';

test('Qamify catalog sync and paid order fulfilment use provider IDs and idempotency', async () => {
  const database = new PGlite();
  await database.exec(await readFile(new URL('../commerce/schema.sql', import.meta.url), 'utf8'));
  const previousFetch = globalThis.fetch;
  const previousEnv = {
    QAMIFY_API_KEY: process.env.QAMIFY_API_KEY,
    DODI_RESELLER_API_KEY: process.env.DODI_RESELLER_API_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    COMMERCE_ENCRYPTION_KEY: process.env.COMMERCE_ENCRYPTION_KEY,
    COMMERCE_ADMIN_KEY: process.env.COMMERCE_ADMIN_KEY,
    COMMERCE_ADMIN_EMAIL: process.env.COMMERCE_ADMIN_EMAIL,
    COMMERCE_ADMIN_PASSWORD_HASH: process.env.COMMERCE_ADMIN_PASSWORD_HASH,
    PAYMENT_ACCOUNT_TITLE: process.env.PAYMENT_ACCOUNT_TITLE,
  };
  const encryptionKey = randomBytes(32).toString('hex');
  Object.assign(process.env, {
    QAMIFY_API_KEY: 'test-qamify-key',
    DATABASE_URL: 'test',
    COMMERCE_ENCRYPTION_KEY: encryptionKey,
    COMMERCE_ADMIN_KEY: randomBytes(32).toString('hex'),
    COMMERCE_ADMIN_EMAIL: 'admin@test.invalid',
    COMMERCE_ADMIN_PASSWORD_HASH: hash('test-password'),
    PAYMENT_ACCOUNT_TITLE: 'Test Receiver',
  });
  delete process.env.DODI_RESELLER_API_KEY;

  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const requestUrl = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
    calls.push({ url: requestUrl, init });
    if (requestUrl.endsWith('/v1/products')) return new Response(JSON.stringify({ products: [
      { id: 42, name: 'Qamify Test Backup', unit_price: '2.50', currency: 'USD', stock: 3, description: 'Instant test item' },
      { id: 43, name: 'Qamify Test Cheapest', unit_price: '1.50', currency: 'USD', stock: 2, description: 'Instant test item' },
    ] }), { status: 200 });
    if (requestUrl.endsWith('/v1/balance')) return new Response(JSON.stringify({ balance: 25, currency: 'USD' }), { status: 200 });
    if (requestUrl.endsWith('/v1/orders')) {
      const body = JSON.parse(init.body);
      if (body.product_id === 43) return new Response(JSON.stringify({ ok:false,error:{ code:'out_of_stock',message:'No stock' } }), { status: 409 });
      return new Response(JSON.stringify({ order: { code: 'RA-TEST-ORDER', items: ['test-license'], instructions: 'Redeem once.' } }), { status: 200 });
    }
    return new Response(JSON.stringify({ error: 'Unexpected test URL' }), { status: 404 });
  };

  let tail = Promise.resolve();
  const handler = createHandler(() => ({ async connect() {
    const previous = tail; let release; tail = new Promise((resolve) => { release = resolve; }); await previous;
    return { async query(sql,args) { const result = await database.query(sql,args); return { ...result, rowCount: result.affectedRows ?? result.rows.length }; }, release };
  } }));
  async function request(action, body, token = '', id = '') {
    let result;
    const req = { method: body ? 'POST' : 'GET', query: { action, id }, url: '/api/commerce', headers: { authorization: token ? `Bearer ${token}` : '' }, body, socket: { remoteAddress: randomBytes(4).toString('hex') } };
    const res = { statusCode: 200, setHeader() {}, end(text) { result = { code: this.statusCode, data: JSON.parse(text) }; } };
    await handler(req,res); return result;
  }

  try {
    const synced = await request('admin-supplier-sync', {}, process.env.COMMERCE_ADMIN_KEY);
    assert.equal(synced.code, 200, JSON.stringify(synced));
    assert.deepEqual(synced.data.providers.map((provider) => provider.providerId), ['qamify']);
    assert.equal(synced.data.synced, 2);
    assert.equal((await request('admin-supplier-update', { productId: 'qamify:42', sellingPrice: 999, costPkr: 700, enabled: true, canonicalKey:'test-product' }, process.env.COMMERCE_ADMIN_KEY)).code, 200);
    assert.equal((await request('admin-supplier-update', { productId: 'qamify:43', sellingPrice: 999, costPkr: 500, enabled: true, canonicalKey:'test-product' }, process.env.COMMERCE_ADMIN_KEY)).code, 200);
    assert.equal((await request('admin-supplier-sync', {}, process.env.COMMERCE_ADMIN_KEY)).code, 200);

    const stock = await request('stock');
    const supplierProducts = stock.data.products.filter((item) => item.source === 'supplier');
    assert.equal(supplierProducts.length, 1);
    const product = supplierProducts[0];
    assert.equal(product.id, 'test-product');
    assert.equal(product.provider_name, 'Qamify');
    assert.equal(product.available, 2);
    assert.equal(product.price, 999);

    const created = await request('create', { productId: product.id });
    assert.equal(created.code, 200, JSON.stringify(created));
    const transaction = 'QAMIFY-123';
    await database.query(`INSERT INTO commerce_payments(id,event_hash,transaction_id,amount,payer_name,source_last4,received_at,verified,subject,encrypted_body)
      VALUES($1,$2,$3,$4,$5,$6,now(),true,$7,$8)`, [randomUUID(), hash('qamify-payment'), transaction, 999, 'Test Buyer', '1234', 'Test payment', encrypt({ text: 'test' }, encryptionKey)]);
    const claim = await request('claim', { id: created.data.id, transactionId: transaction }, created.data.recovery);
    assert.equal(claim.code, 200, JSON.stringify(claim));
    const status = await request('status', undefined, created.data.recovery, created.data.id);
    assert.equal(status.data.status, 'delivered', JSON.stringify(status));
    assert.deepEqual(status.data.delivery, { content: '[\n  "test-license"\n]', instructions: 'Redeem once.' });

    const orderCalls = calls.filter((call) => call.url.endsWith('/v1/orders'));
    assert.equal(orderCalls.length, 2);
    assert.equal(orderCalls[0].init.headers['Idempotency-Key'], `sasify-${created.data.id}-43`);
    assert.equal(orderCalls[1].init.headers['Idempotency-Key'], `sasify-${created.data.id}-42`);
    assert.deepEqual(orderCalls.map((call)=>JSON.parse(call.init.body).product_id), [43,42]);
    const saved = (await database.query('SELECT supplier_product_id,supplier_order_id,supplier_status FROM commerce_orders WHERE id=$1',[created.data.id])).rows[0];
    assert.equal(saved.supplier_product_id, 'qamify:42');
    assert.equal(saved.supplier_order_id, 'RA-TEST-ORDER');
    assert.equal(saved.supplier_status, 'delivered');
  } finally {
    globalThis.fetch = previousFetch;
    for (const [name,value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    await database.close();
  }
});
