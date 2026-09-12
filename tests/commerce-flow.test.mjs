import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { createHandler } from '../commerce/handler.mjs';
import { hash, signature } from '../commerce/core.mjs';

test('ChatGPT Plus local inventory supports checkout, verification, delivery and cancellation', async () => {
  const database = new PGlite();
  await database.exec(await readFile(new URL('../commerce/schema.sql', import.meta.url), 'utf8'));
  const env = {
    DATABASE_URL: 'test',
    COMMERCE_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
    COMMERCE_ADMIN_KEY: randomBytes(32).toString('hex'),
    COMMERCE_ADMIN_EMAIL: 'admin@test.invalid',
    COMMERCE_ADMIN_PASSWORD_HASH: hash('test-password'),
    PAYMENT_ACCOUNT_TITLE: 'Syed Adeen Sarosh',
    NAYAPAY_WEBHOOK_SECRET: 'test-secret',
    NAYAPAY_SIGNING_KEY: randomBytes(32).toString('hex'),
    NAYAPAY_AUTO_VERIFY: 'true',
    NAYAPAY_SENDER: 'service@nayapay.com',
    NAYAPAY_RECEIVER_MARKER: 'Syed Adeen Sarosh',
    NAYAPAY_INBOUND_TOKEN: 'inbound-test-token',
  };
  Object.assign(process.env, env);
  let tail = Promise.resolve();
  const handler = createHandler(() => ({
    async connect() {
      const previous = tail;
      let release;
      tail = new Promise((resolve) => { release = resolve; });
      await previous;
      return { async query(sql, args) { const result = await database.query(sql, args); return { ...result, rowCount: result.affectedRows ?? result.rows.length }; }, release };
    },
  }));
  async function request(action, body, token = '', id = '', cookie = '') {
    let result;
    const headers = {};
    const req = { method: body ? 'POST' : 'GET', query: { action, id }, url: '/api/commerce', headers: { authorization: token ? `Bearer ${token}` : '', cookie }, body, socket: { remoteAddress: randomBytes(4).toString('hex') } };
    const res = { statusCode: 200, setHeader(name, value) { headers[String(name).toLowerCase()] = value; }, end(text) { result = { code: this.statusCode, data: JSON.parse(text), headers }; } };
    await handler(req, res);
    return result;
  }
  try {
    assert.equal((await request('admin-import', { productId: 'p013', accounts: 'claude@test.invalid|test-pass|test-2fa', purchaseCost: 1000 }, 'wrong')).code, 401);
    assert.equal((await request('admin-import', { productId: 'p013', accounts: 'claude@test.invalid|test-pass|test-2fa', purchaseCost: 1000 }, env.COMMERCE_ADMIN_KEY)).code, 400);
    assert.equal((await request('admin-import', { productId: 'p093', accounts: 'chatgpt@test.invalid|test-pass|test-2fa\nchatgpt-two@test.invalid|test-pass|test-2fa', purchaseCost: 1000 }, env.COMMERCE_ADMIN_KEY)).code, 200);
    const stock = await request('stock');
    assert.equal(stock.code, 200);
    assert.equal(stock.data.products.find((product) => product.id === 'p093').available, 2);
    assert.equal((await request('create', { productId: 'p013', couponCode: 'RESELL' })).code, 409);
    const free = await request('create', { productId: 'p093', couponCode: 'hor' });
    assert.equal(free.code, 200, JSON.stringify(free));
    assert.equal(free.data.amount, 0);
    assert.equal(free.data.originalAmount, 3499);
    assert.equal(free.data.couponDiscount, 3499);
    assert.equal(free.data.teamCoupon, true);
    const freeStatus = await request('status', undefined, free.data.recovery, free.data.id);
    assert.equal(freeStatus.data.status, 'delivered', JSON.stringify(freeStatus));
    assert.equal(freeStatus.data.credentials.email, 'chatgpt@test.invalid');
    assert.equal(freeStatus.data.teamCoupon, true);
    assert.equal((await request('admin-import', { productId: 'p093-momo', accounts: 'momo@test.invalid|momo-pass|momo-2fa', purchaseCost: 0 }, env.COMMERCE_ADMIN_KEY)).code, 200);
    const paymentTitle = process.env.PAYMENT_ACCOUNT_TITLE;
    delete process.env.PAYMENT_ACCOUNT_TITLE;
    try {
      const momoFree = await request('create', { productId: 'p093-momo', couponCode: 'HOR' });
      assert.equal(momoFree.code, 200, JSON.stringify(momoFree));
      assert.equal(momoFree.data.amount, 0);
      assert.equal(momoFree.data.originalAmount, 2999);
      assert.equal(momoFree.data.couponDiscount, 2999);
      assert.equal(momoFree.data.teamCoupon, true);
      const momoStatus = await request('status', undefined, momoFree.data.recovery, momoFree.data.id);
      assert.equal(momoStatus.data.status, 'delivered', JSON.stringify(momoStatus));
      assert.equal(momoStatus.data.credentials.email, 'momo@test.invalid');
      assert.equal(momoStatus.data.teamCoupon, true);
    } finally {
      process.env.PAYMENT_ACCOUNT_TITLE = paymentTitle;
    }
    const coupons = (await request('admin-list', undefined, env.COMMERCE_ADMIN_KEY)).data.coupons;
    const hor = coupons.find((coupon) => coupon.code_display === 'HOR');
    assert.ok(hor);
    assert.equal(Number(hor.discount_percent), 100);
    const created = await request('create', { productId: 'p093' });
    assert.equal(created.code, 200, JSON.stringify(created));
    const order = created.data;
    const claim = await request('claim', { id: order.id, transactionId: 'TMICFBPK100926055571425207' }, order.recovery);
    assert.equal(claim.code, 200, JSON.stringify(claim));
    const payload = { subject: 'You got Rs. 3,499 from Bank Alfalah-0388 🎉', text: 'Amount Received\nRs. 3,499\nTransaction ID\nTMICFBPK100926055571425207\nSource Acc. Number\n****0388\nDestination Acc. Title\nSyed Adeen Sarosh', from: 'NayaPay <service@nayapay.com>', date: new Date().toISOString(), sentAt: String(Date.now()), messageId: 'integration-test', secret: env.NAYAPAY_WEBHOOK_SECRET };
    payload.signature = signature(payload, env.NAYAPAY_SIGNING_KEY);
    assert.equal((await request('email-webhook', payload)).code, 200);
    const status = await request('status', undefined, order.recovery, order.id);
    assert.equal(status.data.status, 'delivered', JSON.stringify(status));
    assert.equal(status.data.credentials.password, 'test-pass');
    const adminSnapshot = (await request('admin-list', undefined, env.COMMERCE_ADMIN_KEY)).data;
    const metrics = adminSnapshot.metrics;
    assert.equal(metrics.income, 3499);
    assert.equal(metrics.cost, 2000);
    assert.equal(metrics.profit, 7997);
    assert.equal(adminSnapshot.commissions.ratePkr, 50);
    assert.equal(adminSnapshot.commissions.orders.length, 2);
    assert.equal(adminSnapshot.commissions.totalPkr, 100);
    await request('admin-import', { productId: 'p093', accounts: 'cancel@test.invalid|cancel-pass|cancel-2fa', purchaseCost: 1000 }, env.COMMERCE_ADMIN_KEY);
    const pending = await request('create', { productId: 'p093' });
    assert.equal(pending.code, 200);
    assert.equal((await request('cancel', { id: pending.data.id }, pending.data.recovery)).code, 200);
    assert.equal((await request('status', undefined, pending.data.recovery, pending.data.id)).data.status, 'cancelled');
    assert.equal((await request('admin-coupon-create', { code: 'FREE100', discountPercent: 100, maxUses: 1 }, env.COMMERCE_ADMIN_KEY)).code, 400);
    assert.equal((await request('admin-coupon-create', { code: 'CANCEL10', discountPercent: 10, maxUses: 1 }, env.COMMERCE_ADMIN_KEY)).code, 200);
    await request('admin-import', { productId: 'p093', accounts: 'admin-cancel@test.invalid|cancel-pass|cancel-2fa', purchaseCost: 1000 }, env.COMMERCE_ADMIN_KEY);
    const adminPending = await request('create', { productId: 'p093', couponCode: 'CANCEL10' });
    assert.equal(adminPending.code, 200, JSON.stringify(adminPending));
    assert.equal((await request('admin-cancel', { orderId: adminPending.data.id, confirmed: true }, env.COMMERCE_ADMIN_KEY)).code, 200);
    const afterAdminCancel = (await request('admin-list', undefined, env.COMMERCE_ADMIN_KEY)).data.coupons.find((coupon) => coupon.code_display === 'CANCEL10');
    assert.equal(afterAdminCancel.used_count, 0);
    await request('admin-import', { productId: 'p093', accounts: 'manual@test.invalid|manual-pass|manual-2fa', purchaseCost: 1000 }, env.COMMERCE_ADMIN_KEY);
    const manualOrder = await request('create', { productId: 'p093' });
    assert.equal((await request('admin-manual-delivery', { orderId: manualOrder.data.id, confirmed: false }, env.COMMERCE_ADMIN_KEY)).code, 400);
    const manualDelivery = await request('admin-manual-delivery', { orderId: manualOrder.data.id, confirmed: true }, env.COMMERCE_ADMIN_KEY);
    assert.equal(manualDelivery.code, 200, JSON.stringify(manualDelivery));
    const manualStatus = await request('status', undefined, manualOrder.data.recovery, manualOrder.data.id);
    assert.equal(manualStatus.data.status, 'delivered', JSON.stringify(manualStatus));
    assert.equal(['cancel@test.invalid', 'manual@test.invalid'].includes(manualStatus.data.credentials.email), true);
  } finally {
    await database.close();
  }
});
