import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createHandler } from '../commerce/handler.mjs';
import { accountSchema } from '../commerce/accounts.mjs';
import {
  calculateRetailPricePkr,
  fetchSmscodeServices,
  fetchSmscodeCountries,
  fetchSmscodeProducts,
  isSmscodeConfigured,
} from '../commerce/smscode.mjs';

test('calculateRetailPricePkr calculates margin and minimum price correctly', () => {
  // Below $0.10: Fixed 100 PKR
  assert.equal(calculateRetailPricePkr(0.05, 285), 100);
  assert.equal(calculateRetailPricePkr(0.09, 285), 100);
  // From $0.10 up to $0.50: Fixed 250 PKR
  assert.equal(calculateRetailPricePkr(0.10, 285), 250);
  assert.equal(calculateRetailPricePkr(0.35, 285), 250);
  assert.equal(calculateRetailPricePkr(0.50, 285), 250);
  // Above $0.50: 100% margin (2x cost * rate)
  // $0.60 * 2 * 285 = 342 -> rounds to 350 PKR
  assert.equal(calculateRetailPricePkr(0.60, 285), 350);
  // $1.00 * 2 * 285 = 570 PKR
  assert.equal(calculateRetailPricePkr(1.00, 285), 570);
});

test('smscode catalog returns rich fallback when unconfigured', async () => {
  assert.equal(isSmscodeConfigured(''), false);
  const services = await fetchSmscodeServices('');
  assert.ok(services.length >= 8);
  assert.ok(services.some((s) => s.code === 'whatsapp'));
  assert.ok(services.some((s) => s.code === 'telegram'));

  const countries = await fetchSmscodeCountries('');
  assert.ok(countries.length >= 6);
  assert.ok(countries.some((c) => c.code === 'id'));
  assert.ok(countries.some((c) => c.code === 'us'));

  const products = await fetchSmscodeProducts('', { countryId: 7, platformId: 1 });
  assert.ok(products.length >= 1);
  assert.ok(products[0].cost_usd > 0);
});

test('virtual numbers API: catalog, wallet rent, live status, and cancel refund', async () => {
  const database = new PGlite();
  await database.exec(
    await readFile(new URL('../commerce/schema.sql', import.meta.url), 'utf8'),
  );
  await database.exec(accountSchema);
  await database.exec(`
    INSERT INTO commerce_payment_receivers(id,label,title,account_number,receiver_marker)
    VALUES ('primary','Main account','Main Receiver','03450485711','Main Receiver');
    INSERT INTO commerce_payment_receiver_state(id,active_receiver_id) VALUES(true,'primary');
  `);

  const previous = { ...process.env };
  const adminKey = randomBytes(32).toString('hex');
  const encKey = randomBytes(32).toString('hex');
  Object.assign(process.env, {
    DATABASE_URL: 'test',
    COMMERCE_ENCRYPTION_KEY: encKey,
    COMMERCE_ADMIN_KEY: adminKey,
    PAYMENT_ACCOUNT_TITLE: 'Test Receiver',
    PAYMENT_ACCOUNT_NUMBER: '03450485711',
  });

  const handler = createHandler(() => ({
    connect: async () => ({
      query: async (sql, args) => {
        const r = await database.query(sql, args);
        return { ...r, rowCount: r.affectedRows ?? r.rows.length };
      },
      release() {},
    }),
  }));

  async function request(action, body, cookie = '', token = '') {
    let result;
    const headers = {};
    if (cookie) headers.cookie = cookie;
    if (token) headers.authorization = `Bearer ${token}`;
    await handler(
      {
        method: body ? 'POST' : 'GET',
        query: { action },
        url: `https://www.sasifysolutions.com/api/commerce?action=${action}`,
        headers,
        body,
      },
      {
        setHeader() {},
        statusCode: 200,
        end(data) {
          result = JSON.parse(data);
        },
      },
    );
    return result;
  }

  try {
    // 1. Check public catalog without auth
    const catalogRes = await request('virtual-numbers-catalog');
    assert.equal(catalogRes.ok, true);
    assert.ok(catalogRes.services.length > 0);
    assert.ok(catalogRes.countries.length > 0);
    assert.ok(catalogRes.products.length > 0);
    assert.equal(catalogRes.walletBalance, null);

    // 2. Create customer account with 500 PKR wallet balance
    const accountId = randomUUID();
    await database.query(
      `INSERT INTO commerce_accounts(id,email,password_hash,name,role,balance,created_at)
       VALUES($1,'buyer@sasify.test','hash','Test Buyer','customer',500,now())`,
      [accountId],
    );
    const sessionToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(sessionToken).digest('hex');
    await database.query(
      `INSERT INTO commerce_account_sessions(token_hash,account_id,expires_at)
       VALUES($1,$2,now()+interval '1 day')`,
      [tokenHash, accountId],
    );
    const cookie = `sasify_account=${sessionToken}`;

    // Catalog with customer session returns wallet balance
    const customerCatalog = await request('virtual-numbers-catalog', null, cookie);
    assert.equal(customerCatalog.ok, true);
    assert.equal(customerCatalog.walletBalance, 500);

    // 3. Rent a virtual number
    const rentRes = await request(
      'virtual-number-rent',
      {
        serviceId: 1,
        serviceName: 'WhatsApp',
        countryId: 7,
        countryName: 'Indonesia',
        countryCode: 'id',
        maxPriceUsd: 0.50,
      },
      cookie,
    );

    assert.equal(rentRes.ok, true);
    assert.ok(rentRes.orderId);
    assert.ok(rentRes.phoneNumber);
    assert.equal(rentRes.status, 'ACTIVE');
    assert.equal(rentRes.pricePkr, 250);
    assert.equal(rentRes.balance, 250); // 500 - 250 = 250

    // Verify wallet debit in database
    const walletCheck = (await database.query('SELECT balance FROM commerce_accounts WHERE id=$1', [accountId])).rows[0];
    assert.equal(Number(walletCheck.balance), 250);

    // 4. Poll status
    const statusRes = await request('virtual-number-status', { id: rentRes.orderId }, cookie);
    assert.equal(statusRes.ok, true);
    assert.equal(statusRes.order.status, 'ACTIVE');
    assert.equal(statusRes.order.phone_number, rentRes.phoneNumber);

    // 5. Test history endpoint
    const historyRes = await request('virtual-numbers-my-orders', null, cookie);
    assert.equal(historyRes.ok, true);
    assert.equal(historyRes.orders.length, 1);
    assert.equal(historyRes.orders[0].service_name, 'WhatsApp');

    // 6. Cancel and refund
    const cancelRes = await request('virtual-number-cancel', { id: rentRes.orderId }, cookie);
    assert.equal(cancelRes.ok, true);
    assert.equal(cancelRes.status, 'CANCELLED');
    assert.equal(cancelRes.refundedAmount, 250);
    assert.equal(cancelRes.newBalance, 500); // 250 + 250 = 500 restored!

    // Verify wallet refunded in database
    const restoredWallet = (await database.query('SELECT balance FROM commerce_accounts WHERE id=$1', [accountId])).rows[0];
    assert.equal(Number(restoredWallet.balance), 500);

    // Double cancel should fail
    const doubleCancel = await request('virtual-number-cancel', { id: rentRes.orderId }, cookie);
    assert.ok(doubleCancel.error);

    // 7. Verify admin-list includes virtual numbers
    const adminRes = await request('admin-list', null, '', adminKey);
    assert.ok(adminRes.virtualNumbers || adminRes.data?.virtualNumbers);
    const vnList = adminRes.virtualNumbers || adminRes.data?.virtualNumbers;
    assert.equal(vnList.length, 1);
    assert.equal(vnList[0].service_name, 'WhatsApp');
    assert.equal(vnList[0].customer_email, 'buyer@sasify.test');
    assert.equal(vnList[0].status, 'CANCELLED');

    // 8. Test Guest Checkout (no cookie, guestEmail + direct payment)
    const guestRent = await request('virtual-number-rent', {
      serviceId: 2,
      serviceName: 'Telegram',
      countryId: 7,
      countryName: 'Indonesia',
      countryCode: 'id',
      maxPriceUsd: 0.05, // < 0.10 -> 100 PKR
      guestEmail: 'guest_otp@sasify.test',
      paymentMethod: 'nayapay',
      transactionId: 'NP-GUEST-12345',
    }, '');
    assert.equal(guestRent.ok, true);
    assert.ok(guestRent.orderId);
    assert.ok(guestRent.phoneNumber);
    assert.equal(guestRent.pricePkr, 100);
    assert.equal(guestRent.status, 'ACTIVE');

    // Poll guest order without auth
    const guestPoll = await request('virtual-number-status', { id: guestRent.orderId }, '');
    assert.equal(guestPoll.ok, true);
    assert.equal(guestPoll.order.phone_number, guestRent.phoneNumber);
    assert.equal(guestPoll.order.guest_email, 'guest_otp@sasify.test');
  } finally {
    process.env = previous;
  }
});
