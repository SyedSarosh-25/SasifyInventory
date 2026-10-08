import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createHandler } from '../commerce/handler.mjs';
import { accountSchema, passwordHash } from '../commerce/accounts.mjs';

test('wallet withdrawals: min 1000, non-withdrawable review rewards, binance pay & admin approval/refund', async () => {
  const database = new PGlite();
  // Initialize base commerce tables & account schema including wallet ledger
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
  Object.assign(process.env, {
    DATABASE_URL: 'test',
    COMMERCE_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
    COMMERCE_ADMIN_KEY: adminKey,
    COMMERCE_ADMIN_EMAIL: 'admin@sasify.test',
    COMMERCE_ADMIN_PASSWORD_HASH: 'dummy',
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

  async function request(action, body, cookie = '', admin = false) {
    let result;
    const headers = {};
    await handler(
      {
        method: body ? 'POST' : 'GET',
        query: { action },
        url: '/api/commerce',
        body,
        headers: {
          cookie,
          authorization: admin ? `Bearer ${adminKey}` : '',
        },
        socket: { remoteAddress: randomUUID() },
      },
      {
        statusCode: 200,
        setHeader(k, v) {
          headers[k.toLowerCase()] = v;
        },
        end(text) {
          result = { code: this.statusCode, data: JSON.parse(text), headers };
        },
      },
    );
    return result;
  }

  try {
    // 1. Create a customer account with Rs. 1050 balance
    const customerId = randomUUID();
    const sessionToken = randomBytes(32).toString('hex');
    const sessionTokenHash = (await import('node:crypto')).createHash('sha256').update(sessionToken).digest('hex');
    const pHash = await passwordHash('valid-password-1234');

    await database.exec(`
      INSERT INTO commerce_accounts (id, email, name, password_hash, role, balance, email_verified_at)
      VALUES ('${customerId}', 'sarosh@test.invalid', 'Syed Sarosh', '${pHash}', 'customer', 1050, now());
      INSERT INTO commerce_account_sessions (token_hash, account_id)
      VALUES ('${sessionTokenHash}', '${customerId}');
    `);

    // Simulate 2 review rewards of Rs. 50 each (total Rs. 100 review reward balance)
    await database.exec(`
      INSERT INTO commerce_wallet_ledger (id, account_id, amount, description, review_id)
      VALUES 
        ('${randomUUID()}', '${customerId}', 50, 'Review reward: Rs 50 wallet credit for order #1', '${randomUUID()}'),
        ('${randomUUID()}', '${customerId}', 50, 'Review reward: Rs 50 wallet credit for order #2', '${randomUUID()}');
    `);

    const authCookie = `sasify_account=${sessionToken}`;

    // 2. Fetch dashboard - should show balance 1050, withdrawable 950, review_rewards 100, min 1000
    const dashboard1 = await request('account-dashboard', null, authCookie);
    assert.equal(dashboard1.code, 200);
    assert.equal(dashboard1.data.account.balance, 1050);
    assert.equal(dashboard1.data.withdrawableBalance, 950);
    assert.equal(dashboard1.data.reviewRewardsBalance, 100);
    assert.equal(dashboard1.data.minWithdrawalAmount, 1000);
    assert.ok(Array.isArray(dashboard1.data.withdrawals));
    assert.equal(dashboard1.data.withdrawals.length, 0);

    // 3. Test minimum withdrawal enforcement (less than PKR 1000)
    const tooLow = await request('account-wallet-withdraw', {
      amount: 50,
      payoutMethod: 'binance',
      accountNumber: '891234567',
      accountTitle: 'Syed Sarosh',
    }, authCookie);
    assert.equal(tooLow.code, 400);
    assert.match(tooLow.data.error, /minimum withdrawal amount is pkr 1,000/i);

    // 4. Test non-withdrawable review rewards enforcement
    // Attempting to withdraw 1000 when withdrawable balance is 950 (1050 total - 100 review reward)
    const reviewRestricted = await request('account-wallet-withdraw', {
      amount: 1000,
      payoutMethod: 'binance',
      accountNumber: '891234567',
      accountTitle: 'Syed Sarosh',
    }, authCookie);
    assert.equal(reviewRestricted.code, 400);
    assert.match(reviewRestricted.data.error, /insufficient withdrawable balance/i);
    assert.match(reviewRestricted.data.error, /review reward credit eligible only for website purchases/i);

    // 5. Customer top-up / receives extra funds (add 1500 to balance -> balance 2550, withdrawable 2450)
    await database.exec(`
      UPDATE commerce_accounts SET balance = 2550 WHERE id = '${customerId}';
    `);

    // 6. Request valid withdrawal of Rs. 1000 via Binance Pay
    const req1 = await request('account-wallet-withdraw', {
      amount: 1000,
      payoutMethod: 'binance',
      accountNumber: '891234567',
      accountTitle: 'SaroshBinance',
      notes: 'Send USDT via Binance Pay',
    }, authCookie);
    assert.equal(req1.code, 200);
    assert.equal(req1.data.ok, true);
    assert.equal(req1.data.balance, 1550); // 2550 - 1000 = 1550
    assert.equal(req1.data.withdrawableBalance, 1450); // 1550 - 100 review rewards = 1450
    const withdrawalId1 = req1.data.withdrawal.id;
    assert.equal(req1.data.withdrawal.status, 'pending');
    assert.equal(req1.data.withdrawal.amount, 1000);
    assert.equal(req1.data.withdrawal.payout_method, 'binance');
    assert.equal(req1.data.withdrawal.account_number, '891234567');
    assert.equal(req1.data.withdrawal.account_title, 'SaroshBinance');

    // 7. Verify ledger row for withdrawal
    const withdrawalLedger = (await database.query(
      'SELECT * FROM commerce_wallet_ledger WHERE account_id = $1 AND amount = -1000',
      [customerId],
    )).rows;
    assert.equal(withdrawalLedger.length, 1);
    assert.match(withdrawalLedger[0].description, /Withdrawal request: PKR 1,000/);

    // 8. Admin can see the withdrawal in admin-list
    const adminList = await request('admin-list', null, '', true);
    assert.equal(adminList.code, 200);
    assert.ok(Array.isArray(adminList.data.walletWithdrawals));
    const adminWithdrawal1 = adminList.data.walletWithdrawals.find((w) => w.id === withdrawalId1);
    assert.ok(adminWithdrawal1);
    assert.equal(adminWithdrawal1.customer_name, 'Syed Sarosh');
    assert.equal(adminWithdrawal1.amount, 1000);
    assert.equal(adminWithdrawal1.payout_method, 'binance');
    assert.equal(adminWithdrawal1.account_number, '891234567');
    assert.equal(adminWithdrawal1.status, 'pending');

    // 9. Admin marks withdrawal completed ("Successfully Withdrawn")
    const completeRes = await request('admin-wallet-withdrawal-complete', {
      id: withdrawalId1,
      adminNote: 'USDT transferred via Binance Pay Order #BN-892834',
    }, '', true);
    assert.equal(completeRes.code, 200);
    assert.equal(completeRes.data.ok, true);
    assert.equal(completeRes.data.withdrawal.status, 'completed');
    assert.ok(completeRes.data.withdrawal.completed_at);
    assert.equal(completeRes.data.withdrawal.admin_note, 'USDT transferred via Binance Pay Order #BN-892834');

    // 10. Customer requests a second withdrawal of Rs. 1000 via JazzCash
    const req2 = await request('account-wallet-withdraw', {
      amount: 1000,
      payoutMethod: 'JazzCash',
      accountNumber: '03009876543',
      accountTitle: 'Syed Sarosh',
    }, authCookie);
    assert.equal(req2.code, 200);
    assert.equal(req2.data.balance, 550); // 1550 - 1000 = 550
    const withdrawalId2 = req2.data.withdrawal.id;

    // 11. Admin rejects this withdrawal -> Balance refunded back to 1550
    const rejectRes = await request('admin-wallet-withdrawal-reject', {
      id: withdrawalId2,
      reason: 'JazzCash account title mismatch. Please check and re-apply.',
    }, '', true);
    assert.equal(rejectRes.code, 200);
    assert.equal(rejectRes.data.ok, true);
    assert.equal(rejectRes.data.withdrawal.status, 'rejected');
    assert.ok(rejectRes.data.withdrawal.rejected_at);
    assert.equal(rejectRes.data.withdrawal.admin_note, 'JazzCash account title mismatch. Please check and re-apply.');

    // Verify customer balance was refunded back to 1550 (550 + 1000)
    const dashboardAfterRefund = await request('account-dashboard', null, authCookie);
    assert.equal(dashboardAfterRefund.code, 200);
    assert.equal(dashboardAfterRefund.data.account.balance, 1550);
    assert.equal(dashboardAfterRefund.data.withdrawableBalance, 1450);

    // Verify refund ledger row exists
    const refundLedger = (await database.query(
      'SELECT * FROM commerce_wallet_ledger WHERE account_id = $1 AND amount = 1000',
      [customerId],
    )).rows;
    assert.equal(refundLedger.length, 1);
    assert.match(refundLedger[0].description, /Refund for rejected withdrawal/);

  } finally {
    Object.assign(process.env, previous);
  }
});
