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
  async function request(action, body, token = '', id = '', cookie = '', extraHeaders = {}) {
    let result;
    const headers = {};
    const req = { method: body ? 'POST' : 'GET', query: { action, id }, url: '/api/commerce', headers: { ...extraHeaders, authorization: token ? `Bearer ${token}` : '', cookie }, body, socket: { remoteAddress: randomBytes(4).toString('hex') } };
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
    assert.equal((await request('create', { productId: 'p093', paymentMethod: 'cash' })).code, 400);
    const bankWindow = await request('create', { productId: 'p093', paymentMethod: 'bank' });
    assert.equal(bankWindow.code, 200, JSON.stringify(bankWindow));
    assert.equal(bankWindow.data.paymentMethod, 'bank');
    assert.equal(bankWindow.data.paymentWindowMinutes, 30);
    const bankWindowStatus = await request('status', undefined, bankWindow.data.recovery, bankWindow.data.id);
    assert.equal(bankWindowStatus.data.paymentMethod, 'bank');
    const bankWindowMs = new Date(bankWindowStatus.data.expiresAt) - new Date(bankWindowStatus.data.createdAt);
    assert.ok(bankWindowMs >= 29 * 60 * 1000 && bankWindowMs <= 31 * 60 * 1000, String(bankWindowMs));
    assert.equal((await request('cancel', { id: bankWindow.data.id }, bankWindow.data.recovery)).code, 200);
    assert.equal((await request('create', { productId: 'p013', couponCode: 'RESELL' })).code, 409);
    const disabledHor = await request('create', { productId: 'p093', couponCode: 'hor' });
    assert.equal(disabledHor.code, 409, JSON.stringify(disabledHor));
    assert.equal((await request('admin-import', { productId: 'p093-momo', accounts: 'retired@test.invalid|retired-pass|retired-2fa', purchaseCost: 0 }, env.COMMERCE_ADMIN_KEY)).code, 400);
    assert.equal((await request('create', { productId: 'p093-momo', couponCode: 'HOR' })).code, 409);
    const paymentTitle = process.env.PAYMENT_ACCOUNT_TITLE;
    delete process.env.PAYMENT_ACCOUNT_TITLE;
    try {
      assert.equal((await request('create', { productId: 'p093-momo', couponCode: 'HOR' })).code, 409);
    } finally {
      process.env.PAYMENT_ACCOUNT_TITLE = paymentTitle;
    }
    const coupons = (await request('admin-list', undefined, env.COMMERCE_ADMIN_KEY)).data.coupons;
    const hor = coupons.find((coupon) => coupon.code_display === 'HOR');
    assert.ok(hor);
    assert.equal(Number(hor.discount_percent), 100);
    assert.equal(hor.enabled, false);
    assert.equal(hor.unlimited, true);
    assert.equal((await request('admin-coupon-update', {
      couponId: hor.id,
      discountPercent: 100,
      maxUses: 10,
      enabled: true,
    }, env.COMMERCE_ADMIN_KEY)).code, 400);
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
    assert.ok(status.data.paymentSubmittedAt);
    const profitUnlock = await request('admin-profit-unlock', { password: 'HOR' }, env.COMMERCE_ADMIN_KEY);
    assert.equal(profitUnlock.code, 200);
    const adminSnapshot = (await request('admin-list', undefined, env.COMMERCE_ADMIN_KEY, '', '', { 'x-profit-token': profitUnlock.data.token })).data;
    const metrics = adminSnapshot.metrics;
    assert.equal(metrics.income, 3499);
    assert.equal(metrics.cost, 1000);
    assert.equal(metrics.profit, 2499);
    assert.equal(adminSnapshot.teamCommissions.ratePkr, 50);
    assert.equal(adminSnapshot.teamCommissions.orders.length, 0);
    assert.equal(adminSnapshot.teamCommissions.totalPkr, 0);
    const htmlOrder = await request('create', { productId: 'p093', paymentMethod: 'bank' });
    assert.equal(htmlOrder.code, 200, JSON.stringify(htmlOrder));
    const htmlTransaction = 'ABPAPKKA140926150945051530';
    assert.equal((await request('claim', { id: htmlOrder.data.id, transactionId: htmlTransaction }, htmlOrder.data.recovery)).code, 200);
    const htmlPayload = {
      subject: 'You got Rs. 3,499 from Zain Ali 🎉',
      text: '',
      html: '<table><tr><td>Amount Received</td><td>Rs. 3,499</td></tr><tr><td>Service Fee (Incl. Tax)</td><td>Rs. 0</td></tr><tr><td>Total Amount</td><td>Rs. 3,499</td></tr><tr><td>Transaction ID</td><td>ABPAPKKA140926150945051530</td></tr><tr><td>Source Acc. Title</td><td>Zain Ali</td></tr><tr><td>Source Bank</td><td>Allied Bank</td></tr><tr><td>Raast ID / IBAN</td><td>••••0015</td></tr><tr><td>Destination Acc. Title</td><td>Syed Adeen Sarosh</td></tr><tr><td>Channel</td><td>Raast</td></tr></table>',
      from: 'NayaPay <service@nayapay.com>',
      date: new Date().toISOString(),
      sentAt: String(Date.now()),
      messageId: 'html-integration-test',
      secret: env.NAYAPAY_WEBHOOK_SECRET,
    };
    htmlPayload.signature = signature(htmlPayload, env.NAYAPAY_SIGNING_KEY);
    assert.equal((await request('email-webhook', htmlPayload)).code, 200);
    const htmlStatus = await request('status', undefined, htmlOrder.data.recovery, htmlOrder.data.id);
    assert.equal(htmlStatus.data.status, 'delivered', JSON.stringify(htmlStatus));
    assert.equal(htmlStatus.data.paymentMethod, 'bank');
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
    assert.ok(manualStatus.data.credentials.email);
    await request('admin-import', { productId: 'p093', accounts: 'withdraw@test.invalid|withdraw-pass|withdraw-2fa', purchaseCost: 1000 }, env.COMMERCE_ADMIN_KEY);
    const withdrawalInventory = (await request('admin-list', undefined, env.COMMERCE_ADMIN_KEY)).data.inventory.find((item) => item.email === 'withdraw@test.invalid');
    const withdrawal = await request('admin-inventory-pick', { inventoryId: withdrawalInventory.id, confirmed: true }, env.COMMERCE_ADMIN_KEY);
    assert.equal(withdrawal.code, 200, JSON.stringify(withdrawal));
    const withdrawalMetrics = (await request('admin-list', undefined, env.COMMERCE_ADMIN_KEY, '', '', { 'x-profit-token': profitUnlock.data.token })).data.metrics;
    assert.equal(withdrawalMetrics.admin_withdrawals, 1);
    assert.equal(withdrawalMetrics.income, 13996);
    assert.equal(withdrawalMetrics.cost, 4000);
    assert.equal(withdrawalMetrics.profit, 9996);

    await request('admin-import', { productId: 'p093', accounts: 'unique-one@test.invalid|unique-pass|unique-2fa\nunique-two@test.invalid|unique-pass|unique-2fa', purchaseCost: 1000 }, env.COMMERCE_ADMIN_KEY);
    const firstUnique = await request('create', { productId: 'p093' });
    const secondUnique = await request('create', { productId: 'p093' });
    assert.equal(firstUnique.data.amount, 3499);
    assert.ok(secondUnique.data.amount < 3499);
    assert.notEqual(secondUnique.data.amount, firstUnique.data.amount);
    const paidWithoutTransaction = await request('claim', { id: secondUnique.data.id }, secondUnique.data.recovery);
    assert.equal(paidWithoutTransaction.code, 200, JSON.stringify(paidWithoutTransaction));
    assert.equal((await request('status', undefined, secondUnique.data.recovery, secondUnique.data.id)).data.status, 'review');
    const uniqueTransaction = 'UNIQUEPAY100926055571425999';
    const uniquePayload = {
      subject: `You got Rs. ${secondUnique.data.amount.toLocaleString()} from Bank Alfalah-0388 🎉`,
      text: `Amount Received\nRs. ${secondUnique.data.amount.toLocaleString()}\nTransaction ID\n${uniqueTransaction}\nSource Acc. Number\n****0388\nDestination Acc. Title\nSyed Adeen Sarosh`,
      from: 'NayaPay <service@nayapay.com>',
      date: new Date().toISOString(),
      sentAt: String(Date.now()),
      messageId: 'unique-payment-test',
      secret: env.NAYAPAY_WEBHOOK_SECRET,
    };
    uniquePayload.signature = signature(uniquePayload, env.NAYAPAY_SIGNING_KEY);
    assert.equal((await request('email-webhook', uniquePayload)).code, 200);
    const uniqueStatus = await request('status', undefined, secondUnique.data.recovery, secondUnique.data.id);
    assert.equal(uniqueStatus.data.status, 'delivered', JSON.stringify(uniqueStatus));
    assert.ok(uniqueStatus.data.credentials.email);
    assert.equal((await request('cancel', { id: firstUnique.data.id }, firstUnique.data.recovery)).code, 200);
    await database.query("UPDATE commerce_coupons SET enabled=true,used_count=max_uses WHERE code_display='HOR'");
    await request('admin-import', { productId: 'p093', accounts: 'unlimited-team@test.invalid|team-pass|team-2fa', purchaseCost: 1000 }, env.COMMERCE_ADMIN_KEY);
    const disabledAfterStaleDb = await request('create', { productId: 'p093', couponCode: 'HOR' });
    assert.equal(disabledAfterStaleDb.code, 409, JSON.stringify(disabledAfterStaleDb));
    await request('admin-import', { productId: 'p093', accounts: 'admin-payment@test.invalid|payment-pass|payment-2fa', purchaseCost: 1000 }, env.COMMERCE_ADMIN_KEY);
    const manualPaymentOrder = await request('create', { productId: 'p093' });
    assert.equal((await request('claim', { id: manualPaymentOrder.data.id }, manualPaymentOrder.data.recovery)).code, 200);
    const autoVerify = process.env.NAYAPAY_AUTO_VERIFY;
    process.env.NAYAPAY_AUTO_VERIFY = 'false';
    try {
      const manualTransaction = 'MANUALPAY100926055571425888';
      const manualPayload = {
        subject: `You got Rs. ${manualPaymentOrder.data.amount.toLocaleString()} from Bank Alfalah-0388 🎉`,
        text: `Amount Received\nRs. ${manualPaymentOrder.data.amount.toLocaleString()}\nTransaction ID\n${manualTransaction}\nSource Acc. Number\n****0388\nDestination Acc. Title\nSyed Adeen Sarosh`,
        from: 'NayaPay <service@nayapay.com>',
        date: new Date().toISOString(),
        sentAt: String(Date.now()),
        messageId: 'manual-payment-test',
        secret: env.NAYAPAY_WEBHOOK_SECRET,
      };
      manualPayload.signature = signature(manualPayload, env.NAYAPAY_SIGNING_KEY);
      assert.equal((await request('email-webhook', manualPayload)).code, 200);
      const manualDashboard = await request('admin-list', undefined, env.COMMERCE_ADMIN_KEY);
      const manualPayment = manualDashboard.data.payments.find((payment) => payment.transaction_id === manualTransaction);
      assert.ok(manualPayment);
      const approved = await request('admin-approve', {
        orderId: manualPaymentOrder.data.id,
        paymentId: manualPayment.id,
        confirmed: true,
      }, env.COMMERCE_ADMIN_KEY);
      assert.equal(approved.code, 200, JSON.stringify(approved));
      assert.equal((await request('status', undefined, manualPaymentOrder.data.recovery, manualPaymentOrder.data.id)).data.status, 'delivered');
    } finally {
      process.env.NAYAPAY_AUTO_VERIFY = autoVerify;
    }
    const custCoupon = (await request('admin-list', undefined, env.COMMERCE_ADMIN_KEY)).data.coupons.find((coupon) => coupon.code_display === 'CUST');
    assert.ok(custCoupon);
    assert.equal(Number(custCoupon.discount_percent), 0);
    assert.equal(Number(custCoupon.commission_percent), 10);
    assert.equal(custCoupon.unlimited, true);
    await request('admin-import', { productId: 'p093', accounts: 'cust-sale@test.invalid|cust-pass|cust-2fa', purchaseCost: 1000 }, env.COMMERCE_ADMIN_KEY);
    const custOrder = await request('create', { productId: 'p093', couponCode: 'CUST' });
    assert.equal(custOrder.code, 200, JSON.stringify(custOrder));
    assert.equal(custOrder.data.amount, 3499);
    assert.equal(custOrder.data.listedAmount, 3499);
    assert.equal(custOrder.data.couponDiscount, 0);
    assert.equal(custOrder.data.teamCoupon, false);
    assert.equal(custOrder.data.commissionCode, 'CUST');
    assert.equal(custOrder.data.commissionAmount, 350);
    assert.equal((await request('claim', { id: custOrder.data.id }, custOrder.data.recovery)).code, 200);
    const custTransaction = 'CUSTPAY100926055571425777';
    const custPayload = {
      subject: `You got Rs. ${custOrder.data.amount.toLocaleString()} from Bank Alfalah-0388 🎉`,
      text: `Amount Received\nRs. ${custOrder.data.amount.toLocaleString()}\nTransaction ID\n${custTransaction}\nSource Acc. Number\n****0388\nDestination Acc. Title\nSyed Adeen Sarosh`,
      from: 'NayaPay <service@nayapay.com>',
      date: new Date().toISOString(),
      sentAt: String(Date.now()),
      messageId: 'cust-payment-test',
      secret: env.NAYAPAY_WEBHOOK_SECRET,
    };
    custPayload.signature = signature(custPayload, env.NAYAPAY_SIGNING_KEY);
    assert.equal((await request('email-webhook', custPayload)).code, 200);
    assert.equal((await request('status', undefined, custOrder.data.recovery, custOrder.data.id)).data.status, 'delivered');
    const commissionDashboard = await request('admin-list', undefined, env.COMMERCE_ADMIN_KEY);
    const custSummary = commissionDashboard.data.commissionSummary.find((item) => item.code === 'CUST');
    assert.ok(custSummary);
    assert.ok(custSummary.sales >= 1);
    assert.ok(custSummary.total >= 350);
    assert.ok(commissionDashboard.data.commissions.some((row) => row.order_id === custOrder.data.id && row.commission_amount === 350));

    await request('admin-import', { productId: 'p093', accounts: 'bank-delay@test.invalid|bank-pass|bank-2fa\nbank-late@test.invalid|late-pass|late-2fa', purchaseCost: 1000 }, env.COMMERCE_ADMIN_KEY);
    const delayedBankOrder = await request('create', { productId: 'p093', paymentMethod: 'bank' });
    await database.query("UPDATE commerce_orders SET created_at=now()-interval '10 minutes',expires_at=now()+interval '20 minutes' WHERE id=$1", [delayedBankOrder.data.id]);
    assert.equal((await request('claim', { id: delayedBankOrder.data.id }, delayedBankOrder.data.recovery)).code, 200);
    const delayedBankTransaction = 'BANKDELAY100926055571400001';
    const delayedBankPayload = {
      subject: `You got PKR ${delayedBankOrder.data.amount.toLocaleString()} from Meezan Bank`,
      text: `Amount Received\nPKR ${delayedBankOrder.data.amount.toLocaleString()}\nTransaction ID\n${delayedBankTransaction}\nRaast ID / IBAN\nPK36MEZN0000123456789012\nDestination Acc. Title\nSYED ADEEN SAROSH`,
      from: 'NayaPay <service@nayapay.com>',
      date: new Date().toISOString(),
      sentAt: String(Date.now()),
      messageId: 'delayed-bank-payment-test',
      secret: env.NAYAPAY_WEBHOOK_SECRET,
    };
    delayedBankPayload.signature = signature(delayedBankPayload, env.NAYAPAY_SIGNING_KEY);
    assert.equal((await request('email-webhook', delayedBankPayload)).code, 200);
    assert.equal((await request('status', undefined, delayedBankOrder.data.recovery, delayedBankOrder.data.id)).data.status, 'delivered');
    const delayedBankPayment = (await request('admin-list', undefined, env.COMMERCE_ADMIN_KEY)).data.payments.find((row) => row.transaction_id === delayedBankTransaction);
    assert.equal(delayedBankPayment.verification_reason, 'verified_and_delivered');

    const lateBankOrder = await request('create', { productId: 'p093', paymentMethod: 'bank' });
    await database.query("UPDATE commerce_orders SET created_at=now()-interval '31 minutes',expires_at=now()-interval '1 minute' WHERE id=$1", [lateBankOrder.data.id]);
    assert.equal((await request('claim', { id: lateBankOrder.data.id }, lateBankOrder.data.recovery)).code, 200);
    const lateBankTransaction = 'BANKLATE100926055571400002';
    const lateBankPayload = {
      ...delayedBankPayload,
      subject: `You got PKR ${lateBankOrder.data.amount.toLocaleString()} from Meezan Bank`,
      text: `Amount Received\nPKR ${lateBankOrder.data.amount.toLocaleString()}\nTransaction ID\n${lateBankTransaction}\nRaast ID / IBAN\nPK36MEZN0000123456789012\nDestination Acc. Title\nSYED ADEEN SAROSH`,
      date: new Date().toISOString(),
      sentAt: String(Date.now()),
      messageId: 'late-bank-payment-test',
    };
    lateBankPayload.signature = signature(lateBankPayload, env.NAYAPAY_SIGNING_KEY);
    assert.equal((await request('email-webhook', lateBankPayload)).code, 200);
    const lateBankStatus = await request('status', undefined, lateBankOrder.data.recovery, lateBankOrder.data.id);
    assert.equal(lateBankStatus.data.status, 'expired');
    const lateBankPayment = (await request('admin-list', undefined, env.COMMERCE_ADMIN_KEY)).data.payments.find((row) => row.transaction_id === lateBankTransaction);
    assert.equal(lateBankPayment.verified, true);
    assert.equal(lateBankPayment.verification_reason, 'verified_after_order_window');
  } finally {
    await database.close();
  }
});
