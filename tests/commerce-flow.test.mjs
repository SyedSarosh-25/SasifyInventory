import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { createHandler } from '../commerce/handler.mjs';
import { hash } from '../commerce/core.mjs';

test('ChatGPT Plus local inventory supports checkout, verification, delivery and cancellation', async () => {
  const database = new PGlite();
  await database.exec(`CREATE TABLE commerce_accounts (
    id uuid PRIMARY KEY, email text NOT NULL UNIQUE, name text NOT NULL,
    password_hash text NOT NULL, role text NOT NULL CHECK(role IN ('customer','reseller')),
    balance integer NOT NULL DEFAULT 0 CHECK(balance>=0), created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await database.exec(await readFile(new URL('../commerce/schema.sql', import.meta.url), 'utf8'));
  const env = {
    DATABASE_URL: 'test',
    COMMERCE_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
    COMMERCE_ADMIN_KEY: randomBytes(32).toString('hex'),
    COMMERCE_ADMIN_EMAIL: 'admin@test.invalid',
    COMMERCE_ADMIN_PASSWORD_HASH: hash('test-password'),
    PAYMENT_ACCOUNT_TITLE: 'Syed Adeen Sarosh',
    NAYAPAY_AUTO_VERIFY: 'true',
    NAYAPAY_SENDER: 'service@nayapay.com',
    PAYMENT_RECEIVER_EMAIL: 'inbound@example.invalid',
    NAYAPAY_INBOUND_TOKEN: 'inbound-test-token',
    NAYAPAY_INBOUND_BASIC_USER: 'postmark-user',
    NAYAPAY_INBOUND_BASIC_PASSWORD: 'postmark-password',
    TELEGRAM_CHAT_ID: 'telegram-test-chat',
    TELEGRAM_WEBHOOK_SECRET: 'telegram-test-secret',
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
    const req = {
      method: body ? 'POST' : 'GET',
      query: { action, id },
      url: '/api/commerce',
      headers: {
        authorization: token ? `Bearer ${token}` : '',
        ...extraHeaders,
        cookie,
      },
      body,
      socket: { remoteAddress: randomBytes(4).toString('hex') },
    };
    const res = { statusCode: 200, setHeader(name, value) { headers[String(name).toLowerCase()] = value; }, end(text) { result = { code: this.statusCode, data: JSON.parse(text), headers }; } };
    await handler(req, res);
    return result;
  }
  const postmarkAuth = `Basic ${Buffer.from(`${env.NAYAPAY_INBOUND_BASIC_USER}:${env.NAYAPAY_INBOUND_BASIC_PASSWORD}`).toString('base64')}`;
  const postmarkPayload = ({ subject, text = '', html = '', date = new Date().toISOString(), messageId }) => ({
    FromFull: { Name: 'NayaPay', Email: 'service@nayapay.com' },
    ToFull: [{ Email: env.PAYMENT_RECEIVER_EMAIL }],
    Subject: subject,
    TextBody: text,
    HtmlBody: html,
    Date: date,
    MessageID: messageId,
    Headers: [
      {
        Name: 'Authentication-Results',
        Value: 'mx.google.com; dkim=pass header.i=@nayapay.com header.s=default; dmarc=pass (p=REJECT)',
      },
      {
        Name: 'DKIM-Signature',
        Value: 'v=1; a=rsa-sha256; d=nayapay.com; s=default; h=Date:From:Reply-To:To:Subject; bh=test; b=test',
      },
    ],
  });
  async function inbound(receipt) {
    return request('inbound-email', postmarkPayload(receipt), '', '', '', { authorization: postmarkAuth });
  }
  async function approveWithTelegram(orderId, transactionId) {
    const payment = (await request('admin-list', undefined, env.COMMERCE_ADMIN_KEY)).data.payments.find(
      (row) => row.transaction_id === transactionId,
    );
    assert.ok(payment, `payment ${transactionId} should be available for approval`);
    return request(
      'telegram-webhook',
      {
        callback_query: {
          id: `callback-${orderId}`,
          data: `approve:${orderId}`,
          message: { chat: { id: env.TELEGRAM_CHAT_ID }, message_id: 1 },
        },
      },
      '',
      '',
      '',
      { 'x-telegram-bot-api-secret-token': env.TELEGRAM_WEBHOOK_SECRET },
    );
  }
  async function rejectWithTelegram(orderId) {
    return request(
      'telegram-webhook',
      {
        callback_query: {
          id: `callback-reject-${orderId}`,
          data: `reject:${orderId}`,
          message: { chat: { id: env.TELEGRAM_CHAT_ID }, message_id: 1 },
        },
      },
      '',
      '',
      '',
      { 'x-telegram-bot-api-secret-token': env.TELEGRAM_WEBHOOK_SECRET },
    );
  }
  try {
    assert.equal((await request('admin-import', { productId: 'p013', accounts: 'claude@test.invalid|test-pass|test-2fa', purchaseCost: 1000 }, 'wrong')).code, 401);
    assert.equal((await request('admin-import', { productId: 'p013', accounts: 'claude@test.invalid|test-pass|test-2fa', purchaseCost: 1000 }, env.COMMERCE_ADMIN_KEY)).code, 400);
    assert.equal((await request('admin-import', { productId: 'p093', accounts: 'chatgpt@test.invalid|test-pass|test-2fa\nchatgpt-two@test.invalid|test-pass|test-2fa', purchaseCost: 1000 }, env.COMMERCE_ADMIN_KEY)).code, 200);
    const stock = await request('stock');
    assert.equal(stock.code, 200);
    assert.equal(stock.data.products.find((product) => product.id === 'p093').available, 2);
    const toolRequest = await request('tool-request', {
      toolName: 'Runway',
      requirement: 'I need a one-month Pro plan for video generation.',
      priority: 'urgent',
      contactNumber: '+92 311 6185711',
    });
    assert.equal(toolRequest.code, 200, JSON.stringify(toolRequest));
    const requestSnapshot = await request('admin-list', undefined, env.COMMERCE_ADMIN_KEY);
    const paymentSnapshot = await request('admin-payments', undefined, env.COMMERCE_ADMIN_KEY);
    assert.equal(paymentSnapshot.code, 200);
    assert.ok(Array.isArray(paymentSnapshot.data.payments));
    assert.ok(Array.isArray(paymentSnapshot.data.paymentReceivers));
    assert.equal((await request('admin-payments')).code, 401);
    const savedToolRequest = requestSnapshot.data.toolRequests.find((row) => row.id === toolRequest.data.id);
    assert.equal(savedToolRequest.tool_name, 'Runway');
    assert.equal(savedToolRequest.priority, 'urgent');
    assert.equal(savedToolRequest.contact_number, '+92 311 6185711');
    assert.equal((await request('admin-tool-request-update', {
      requestId: toolRequest.data.id,
      status: 'contacted',
    }, env.COMMERCE_ADMIN_KEY)).code, 200);
    const updatedRequest = (await request('admin-list', undefined, env.COMMERCE_ADMIN_KEY)).data.toolRequests.find((row) => row.id === toolRequest.data.id);
    assert.equal(updatedRequest.status, 'contacted');
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
    const payload = { subject: 'You got Rs. 3,499 from Bank Alfalah-0388 🎉', text: 'Amount Received\nRs. 3,499\nTransaction ID\nTMICFBPK100926055571425207\nSource Acc. Number\n****0388\nDestination Acc. Title\nSyed Adeen Sarosh', date: new Date().toISOString(), messageId: 'integration-test' };
    assert.equal((await inbound(payload)).code, 200);
    const autoStatus = await request('status', undefined, order.recovery, order.id);
    assert.equal(autoStatus.data.status, 'delivered', JSON.stringify(autoStatus));
    const autoPayment = (await request('admin-list', undefined, env.COMMERCE_ADMIN_KEY)).data.payments.find(
      (payment) => payment.transaction_id === 'TMICFBPK100926055571425207',
    );
    assert.equal(autoPayment.verification_reason, 'verified_and_delivered');
    const status = await request('status', undefined, order.recovery, order.id);
    assert.equal(status.data.status, 'delivered', JSON.stringify(status));
    assert.equal(status.data.credentials.password, 'test-pass');
    assert.ok(status.data.paymentSubmittedAt);
    const postmarkTestReceipt = {
      subject: 'You got Rs. 1 from Postmark Test',
      text: 'Amount Received\nRs. 1\nTransaction ID\nPOSTMARK-NO-RAW\nSource Acc. Number\n****0388',
      messageId: '<postmark-no-raw@example.invalid>',
    };
    assert.equal((await inbound(postmarkTestReceipt)).code, 200);
    const postmarkPayment = (await request('admin-list', undefined, env.COMMERCE_ADMIN_KEY)).data.payments.find(
      (payment) => payment.subject === postmarkTestReceipt.subject,
    );
    assert.equal(postmarkPayment.verification_reason, 'verified_no_eligible_order');

    const profitUnlock = await request('admin-profit-unlock', { password: 'HOR' }, env.COMMERCE_ADMIN_KEY);
    assert.equal(profitUnlock.code, 200);
    const adminSnapshot = (await request('admin-list', undefined, env.COMMERCE_ADMIN_KEY, '', '', { 'x-profit-token': profitUnlock.data.token })).data;
    assert.ok(adminSnapshot.payments.some((row) => row.transaction_id === 'TMICFBPK100926055571425207'));
    const metrics = adminSnapshot.metrics;
    assert.equal(metrics.income, 3499);
    assert.equal(metrics.cost, 1000);
    assert.equal(metrics.profit, 2499);
    assert.equal(adminSnapshot.teamCommissions.ratePkr, 50);
    assert.equal(adminSnapshot.teamCommissions.orders.length, 0);
    assert.equal(adminSnapshot.teamCommissions.totalPkr, 0);
    await request('admin-import', { productId: 'p093', accounts: 'receipt-first@test.invalid|receipt-pass|receipt-2fa', purchaseCost: 1000 }, env.COMMERCE_ADMIN_KEY);
    const receiptFirstOrder = await request('create', { productId: 'p093' });
    assert.equal(receiptFirstOrder.code, 200, JSON.stringify(receiptFirstOrder));
    const receiptFirstTransaction = 'RECEIPT-FIRST-100926055571425208';
    assert.equal(
      (await inbound({
        subject: `You got Rs. ${receiptFirstOrder.data.amount.toLocaleString()} from Bank Alfalah-0388 🎉`,
        text: `Amount Received\nRs. ${receiptFirstOrder.data.amount.toLocaleString()}\nTransaction ID\n${receiptFirstTransaction}\nSource Acc. Number\n****0388`,
        messageId: 'receipt-before-claim',
      })).code,
      200,
    );
    const receiptFirstStatus = await request('status', undefined, receiptFirstOrder.data.recovery, receiptFirstOrder.data.id);
    assert.equal(receiptFirstStatus.data.status, 'delivered', JSON.stringify(receiptFirstStatus));
    const htmlOrder = await request('create', { productId: 'p093', paymentMethod: 'bank' });
    assert.equal(htmlOrder.code, 200, JSON.stringify(htmlOrder));
    const htmlTransaction = 'ABPAPKKA140926150945051530';
    assert.equal((await request('claim', { id: htmlOrder.data.id, transactionId: htmlTransaction }, htmlOrder.data.recovery)).code, 200);
    const htmlPayload = {
      subject: 'You got Rs. 3,499 from Zain Ali 🎉',
      text: '',
      html: '<table><tr><td>Amount Received</td><td>Rs. 3,499</td></tr><tr><td>Service Fee (Incl. Tax)</td><td>Rs. 0</td></tr><tr><td>Total Amount</td><td>Rs. 3,499</td></tr><tr><td>Transaction ID</td><td>ABPAPKKA140926150945051530</td></tr><tr><td>Source Acc. Title</td><td>Zain Ali</td></tr><tr><td>Source Bank</td><td>Allied Bank</td></tr><tr><td>Raast ID / IBAN</td><td>••••0015</td></tr><tr><td>Channel</td><td>Raast</td></tr></table>',
      date: new Date().toISOString(),
      messageId: 'html-integration-test',
    };
    assert.equal((await inbound(htmlPayload)).code, 200);
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
    assert.equal((await rejectWithTelegram(adminPending.data.id)).code, 200);
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
    assert.equal(withdrawalMetrics.income, 17495);
    assert.equal(withdrawalMetrics.cost, 5000);
    assert.equal(withdrawalMetrics.profit, 12495);

    await request('admin-import', { productId: 'p093', accounts: 'unique-one@test.invalid|unique-pass|unique-2fa\nunique-two@test.invalid|unique-pass|unique-2fa', purchaseCost: 1000 }, env.COMMERCE_ADMIN_KEY);
    const firstUnique = await request('create', { productId: 'p093' });
    const secondUnique = await request('create', { productId: 'p093' });
    assert.equal(firstUnique.data.amount, 3499);
    assert.ok(secondUnique.data.amount < 3499);
    assert.notEqual(secondUnique.data.amount, firstUnique.data.amount);
    const paidWithoutTransaction = await request('claim', { id: secondUnique.data.id }, secondUnique.data.recovery);
    assert.equal(paidWithoutTransaction.code, 200, JSON.stringify(paidWithoutTransaction));
    const pendingVerification = (await request('status', undefined, secondUnique.data.recovery, secondUnique.data.id)).data;
    assert.equal(pendingVerification.status, 'pending');
    assert.ok(pendingVerification.paymentSubmittedAt);
    await request('admin-import', { productId: 'p093', accounts: 'fake-unpaid@test.invalid|fake-pass|fake-2fa', purchaseCost: 1000 }, env.COMMERCE_ADMIN_KEY);
    const fakeUnpaid = await request('create', { productId: 'p093' });
    assert.equal((await request('claim', { id: fakeUnpaid.data.id }, fakeUnpaid.data.recovery)).data.status, 'verification_pending');
    await database.query("UPDATE commerce_orders SET payment_submitted_at=now()-interval '91 seconds' WHERE id=$1", [fakeUnpaid.data.id]);
    const fakeCancelled = await request('status', undefined, fakeUnpaid.data.recovery, fakeUnpaid.data.id);
    assert.equal(fakeCancelled.data.status, 'cancelled');
    assert.equal(fakeCancelled.data.supplierStatus, 'cancelled_without_payment');
    const lateTransaction = 'FAKELATE100926055571400003';
    const latePayload = {
      subject: `You got PKR ${fakeUnpaid.data.amount.toLocaleString()} from Bank Alfalah-0388 🎉`,
      text: `Amount Received\nPKR ${fakeUnpaid.data.amount.toLocaleString()}\nTransaction ID\n${lateTransaction}\nSource Acc. Number\n****0388\nDestination Acc. Title\nSyed Adeen Sarosh`,
      date: new Date().toISOString(),
      messageId: 'late-after-verification-window',
    };
    assert.equal((await inbound(latePayload)).code, 200);
    const lateDashboard = await request('admin-list', undefined, env.COMMERCE_ADMIN_KEY);
    const latePayment = lateDashboard.data.payments.find((payment) => payment.transaction_id === lateTransaction);
    assert.ok(latePayment);
    assert.equal(latePayment.order_id, null);
    assert.equal(latePayment.verification_reason, 'verified_no_eligible_order');
    const uniqueTransaction = 'UNIQUEPAY100926055571425999';
    const uniquePayload = {
      subject: `You got Rs. ${secondUnique.data.amount.toLocaleString()} from Bank Alfalah-0388 🎉`,
      text: `Amount Received\nRs. ${secondUnique.data.amount.toLocaleString()}\nTransaction ID\n${uniqueTransaction}\nSource Acc. Number\n****0388\nDestination Acc. Title\nSyed Adeen Sarosh`,
      date: new Date().toISOString(),
      messageId: 'unique-payment-test',
    };
    assert.equal((await inbound(uniquePayload)).code, 200);
    assert.equal((await approveWithTelegram(secondUnique.data.id, uniqueTransaction)).code, 200);
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
        date: new Date().toISOString(),
        messageId: 'manual-payment-test',
      };
      assert.equal((await inbound(manualPayload)).code, 200);
      const manualDashboard = await request('admin-list', undefined, env.COMMERCE_ADMIN_KEY);
      const manualPayment = manualDashboard.data.payments.find((payment) => payment.transaction_id === manualTransaction);
      assert.ok(manualPayment);
      const approved = await request('admin-approve', {
        orderId: manualPaymentOrder.data.id,
        paymentId: manualPayment.id,
        confirmed: true,
      }, env.COMMERCE_ADMIN_KEY);
      assert.equal(approved.code, 200, JSON.stringify(approved));
      const approvedPayment = (await request('admin-list', undefined, env.COMMERCE_ADMIN_KEY)).data.payments.find((payment) => payment.transaction_id === manualTransaction);
      assert.equal(approvedPayment.verification_reason, 'manually_approved');
      assert.equal(approvedPayment.verification_reason_before_manual, 'automatic_verification_disabled');
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
      date: new Date().toISOString(),
      messageId: 'cust-payment-test',
    };
    assert.equal((await inbound(custPayload)).code, 200);
    assert.equal((await approveWithTelegram(custOrder.data.id, custTransaction)).code, 200);
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
      date: new Date().toISOString(),
      messageId: 'delayed-bank-payment-test',
    };
    assert.equal((await inbound(delayedBankPayload)).code, 200);
    assert.equal((await approveWithTelegram(delayedBankOrder.data.id, delayedBankTransaction)).code, 200);
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
      messageId: 'late-bank-payment-test',
    };
    assert.equal((await inbound(lateBankPayload)).code, 200);
    const lateBankStatus = await request('status', undefined, lateBankOrder.data.recovery, lateBankOrder.data.id);
    assert.equal(lateBankStatus.data.status, 'expired');
    const lateBankPayment = (await request('admin-list', undefined, env.COMMERCE_ADMIN_KEY)).data.payments.find((row) => row.transaction_id === lateBankTransaction);
    assert.equal(lateBankPayment.verified, true);
    assert.equal(lateBankPayment.verification_reason, 'verified_after_order_window');
  } finally {
    await database.close();
  }
});
