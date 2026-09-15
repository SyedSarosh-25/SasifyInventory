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
      { id: 42, name: 'Qamify Test Backup 1 Month NW', unit_price: '2.50', currency: 'USD', stock: 3, description: 'Instant test item. Non warranty' },
      { id: 43, name: 'Qamify Test Cheapest 1 Month NW', unit_price: '1.50', currency: 'USD', stock: 2, description: 'Instant test item. Non warranty' },
      { id: 44, name: 'Qamify Email Item', unit_price: '2.00', currency: 'USD', stock: 2, email_required: true, description: 'Email delivery item' },
      { id: 45, name: 'Qamify Failing Item', unit_price: '2.25', currency: 'USD', stock: 2, description: 'Failure test item' },
    ] }), { status: 200 });
    if (requestUrl.endsWith('/v1/balance')) return new Response(JSON.stringify({ balance: 25, currency: 'USD' }), { status: 200 });
    if (requestUrl.endsWith('/v1/orders')) {
      const body = JSON.parse(init.body);
      if (body.product_id === 43) return new Response(JSON.stringify({ ok:false,error:{ code:'out_of_stock',message:'No stock' } }), { status: 409 });
      if (body.product_id === 45) return new Response(JSON.stringify({ ok:false,error:{ code:'supplier_unavailable',message:'Supplier temporarily unavailable' } }), { status: 503 });
      const code = body.product_id === 44 ? 'RA-EMAIL-ORDER' : 'RA-TEST-ORDER';
      return new Response(JSON.stringify({ order: { code, items: ['test-license'], instructions: 'Redeem once.\nNo warranty after activation.' } }), { status: 200 });
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
    assert.equal(synced.data.synced, 4);
    assert.equal((await request('admin-supplier-update', { productId: 'qamify:42', sellingPrice: 999, costPkr: 700, enabled: true, canonicalKey:'test-product' }, process.env.COMMERCE_ADMIN_KEY)).code, 200);
    assert.equal((await request('admin-supplier-update', { productId: 'qamify:43', sellingPrice: 999, costPkr: 500, enabled: true, canonicalKey:'test-product' }, process.env.COMMERCE_ADMIN_KEY)).code, 200);
    assert.equal((await request('admin-supplier-update', { productId: 'qamify:44', sellingPrice: 999, costPkr: 700, enabled: true, canonicalKey:'email-product' }, process.env.COMMERCE_ADMIN_KEY)).code, 200);
    assert.equal((await request('admin-supplier-update', { productId: 'qamify:45', sellingPrice: 1125, costPkr: 800, enabled: true, canonicalKey:'failing-product' }, process.env.COMMERCE_ADMIN_KEY)).code, 200);
    assert.equal((await request('admin-supplier-sync', {}, process.env.COMMERCE_ADMIN_KEY)).code, 200);

    const stock = await request('stock');
    const supplierProducts = stock.data.products.filter((item) => item.source === 'supplier');
    assert.equal(supplierProducts.length, 3);
    const product = supplierProducts.find((item) => item.id === 'test-product');
    assert.equal(product.id, 'test-product');
    assert.equal(product.provider_name, 'Qamify');
    assert.equal(product.available, 2);
    assert.equal(product.price, 999);
    assert.equal(product.name, 'Qamify Test Cheapest 1 Month');
    assert.equal(product.warranty, undefined);
    assert.doesNotMatch(product.description, /non warranty/i);
    const sourceProduct = (await database.query("SELECT name,description FROM commerce_supplier_products WHERE id='qamify:43'")).rows[0];
    assert.match(sourceProduct.name, /NW$/);
    assert.match(sourceProduct.description, /Non warranty/);

    const created = await request('create', { productId: product.id });
    assert.equal(created.code, 200, JSON.stringify(created));
    const transaction = 'QAMIFY-123';
    await database.query(`INSERT INTO commerce_payments(id,event_hash,transaction_id,amount,payer_name,source_last4,received_at,verified,subject,encrypted_body)
      VALUES($1,$2,$3,$4,$5,$6,now(),true,$7,$8)`, [randomUUID(), hash('qamify-payment'), transaction, 999, 'Test Buyer', '1234', 'Test payment', encrypt({ text: 'test' }, encryptionKey)]);
    const claim = await request('claim', { id: created.data.id, transactionId: transaction }, created.data.recovery);
    assert.equal(claim.code, 200, JSON.stringify(claim));
    const status = await request('status', undefined, created.data.recovery, created.data.id);
    assert.equal(status.data.status, 'delivered', JSON.stringify(status));
    assert.equal(status.data.product, 'Qamify Test Backup 1 Month');
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
    const logs = (await request('admin-supplier-logs', undefined, process.env.COMMERCE_ADMIN_KEY)).data.logs;
    assert.equal(logs.length, 2, JSON.stringify(logs));
    assert.equal(logs.every((log) => log.provider_id === 'qamify'), true);
    assert.equal(logs.some((log) => log.response_status === 409), true);
    assert.equal(logs.some((log) => log.response_status === 200), true);
    assert.equal(logs.every((log) => !('Authorization' in log.request_headers)), true);
    const successfulLog = logs.find((log) => log.response_status === 200);
    assert.equal(successfulLog.response_body.order.items, '[REDACTED]');
    const missingEmail = await request('create', { productId: 'email-product' });
    assert.equal(missingEmail.code, 400, JSON.stringify(missingEmail));
    const emailOrder = await request('create', {
      productId: 'email-product',
      customerEmail: 'Buyer@Example.com',
    });
    assert.equal(emailOrder.code, 200, JSON.stringify(emailOrder));
    const emailTransaction = 'QAMIFY-EMAIL-123';
    await database.query(`INSERT INTO commerce_payments(id,event_hash,transaction_id,amount,payer_name,source_last4,received_at,verified,subject,encrypted_body)
      VALUES($1,$2,$3,$4,$5,$6,now(),true,$7,$8)`, [randomUUID(), hash('qamify-email-payment'), emailTransaction, 999, 'Email Buyer', '1234', 'Email payment', encrypt({ text: 'test' }, encryptionKey)]);
    assert.equal((await request('claim', { id: emailOrder.data.id, transactionId: emailTransaction }, emailOrder.data.recovery)).code, 200);
    const emailCall = calls.findLast((call) => call.url.endsWith('/v1/orders') && JSON.parse(call.init.body).product_id === 44);
    assert.equal(JSON.parse(emailCall.init.body).email, 'buyer@example.com');
    const emailStatus = await request('status', undefined, emailOrder.data.recovery, emailOrder.data.id);
    assert.equal(emailStatus.data.status, 'delivered', JSON.stringify(emailStatus));
    const failingOrder = await request('create', { productId: 'failing-product' });
    assert.equal(failingOrder.code, 200, JSON.stringify(failingOrder));
    const failingTransaction = 'QAMIFY-FAIL-123';
    await database.query(`INSERT INTO commerce_payments(id,event_hash,transaction_id,amount,payer_name,source_last4,received_at,verified,subject,encrypted_body)
      VALUES($1,$2,$3,$4,$5,$6,now(),true,$7,$8)`, [randomUUID(), hash('qamify-failing-payment'), failingTransaction, 1125, 'Failing Buyer', '1234', 'Failing payment', encrypt({ text: 'test' }, encryptionKey)]);
    const failedClaim = await request('claim', { id: failingOrder.data.id, transactionId: failingTransaction }, failingOrder.data.recovery);
    assert.equal(failedClaim.code, 200, JSON.stringify(failedClaim));
    assert.equal(failedClaim.data.status, 'cancelled');
    const failedStatus = await request('status', undefined, failingOrder.data.recovery, failingOrder.data.id);
    assert.equal(failedStatus.data.status, 'cancelled', JSON.stringify(failedStatus));
    assert.equal(failedStatus.data.supplierStatus, 'cancelled_after_3_supplier_failures');
    const failedLogs = (await request('admin-supplier-logs', undefined, process.env.COMMERCE_ADMIN_KEY)).data.logs
      .filter((log) => log.order_id === failingOrder.data.id);
    assert.equal(failedLogs.length, 3, JSON.stringify(failedLogs));
    assert.equal(failedLogs.every((log) => log.response_status === 503), true);
    delete process.env.QAMIFY_API_KEY;
    const configured = await request('admin-supplier-key', { providerId: 'qamify', apiKey: 'admin-qamify-key' }, process.env.COMMERCE_ADMIN_KEY);
    assert.equal(configured.code, 200, JSON.stringify(configured));
    assert.equal(configured.data.configured, true);
    assert.equal(JSON.stringify((await request('admin-list', undefined, process.env.COMMERCE_ADMIN_KEY)).data).includes('admin-qamify-key'), false);
    const encryptedKey = (await database.query('SELECT encrypted_api_key FROM commerce_supplier_secrets WHERE provider_id=$1', ['qamify'])).rows[0].encrypted_api_key;
    assert.equal(encryptedKey.includes('admin-qamify-key'), false);
    const keySync = await request('admin-supplier-sync', {}, process.env.COMMERCE_ADMIN_KEY);
    assert.equal(keySync.code, 200, JSON.stringify(keySync));
    const keyRequest = calls.findLast((call) => call.url.endsWith('/v1/products'));
    assert.equal(keyRequest.init.headers.Authorization, 'Bearer admin-qamify-key');
    const removed = await request('admin-supplier-key', { providerId: 'qamify', remove: true }, process.env.COMMERCE_ADMIN_KEY);
    assert.equal(removed.code, 200, JSON.stringify(removed));
  } finally {
    globalThis.fetch = previousFetch;
    for (const [name,value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    await database.close();
  }
});
