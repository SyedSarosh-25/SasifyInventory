import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createHandler } from '../commerce/handler.mjs';
import { accountSchema, passwordHash } from '../commerce/accounts.mjs';

test('wallet withdrawals: customer can request, admin can complete or reject with refund', async () => {
  const database = new PGlite();
  // Initialize base account tables & schema
  await database.exec(accountSchema.split('ALTER TABLE commerce_orders')[0]);
  await database.exec(
    await readFile(new URL('../commerce/schema.sql', import.meta.url), 'utf8'),
  );
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
    // 1. Create a customer account with Rs. 200 balance
    const customerId = randomUUID();
    const sessionToken = randomBytes(32).toString('hex');
    const sessionTokenHash = (await import('node:crypto')).createHash('sha256').update(sessionToken).digest('hex');
    const pHash = await passwordHash('valid-password-1234');

    await database.exec(`
      INSERT INTO commerce_accounts (id, email, name, password_hash, role, balance, email_verified_at)
      VALUES ('${customerId}', 'sarosh@test.invalid', 'Syed Sarosh', '${pHash}', 'customer', 200, now());
      INSERT INTO commerce_account_sessions (token_hash, account_id)
      VALUES ('${sessionTokenHash}', '${customerId}');
    `);

    const authCookie = `sasify_account=${sessionToken}`;

    // 2. Fetch dashboard - should show balance 200 and empty withdrawals
    const dashboard1 = await request('account-dashboard', null, authCookie);
    assert.equal(dashboard1.code, 200);
    assert.equal(dashboard1.data.account.balance, 200);
    assert.ok(Array.isArray(dashboard1.data.withdrawals));
    assert.equal(dashboard1.data.withdrawals.length, 0);

    // 3. Request withdrawal with invalid amounts
    // Less than min PKR 50
    const tooLow = await request('account-wallet-withdraw', {
      amount: 40,
      payoutMethod: 'Easypaisa',
      accountNumber: '03451234567',
      accountTitle: 'Syed Sarosh',
    }, authCookie);
    assert.equal(tooLow.code, 400);
    assert.match(tooLow.data.error, /at least PKR 50/i);

    // Greater than available balance (200)
    const tooHigh = await request('account-wallet-withdraw', {
      amount: 250,
      payoutMethod: 'Easypaisa',
      accountNumber: '03451234567',
      accountTitle: 'Syed Sarosh',
    }, authCookie);
    assert.equal(tooHigh.code, 400);
    assert.match(tooHigh.data.error, /insufficient wallet balance/i);

    // Missing bank details
    const missingDetails = await request('account-wallet-withdraw', {
      amount: 50,
      payoutMethod: '',
      accountNumber: '',
      accountTitle: '',
    }, authCookie);
    assert.equal(missingDetails.code, 400);

    // 4. Request valid withdrawal of Rs. 50 via Easypaisa
    const req1 = await request('account-wallet-withdraw', {
      amount: 50,
      payoutMethod: 'Easypaisa',
      accountNumber: '03451234567',
      accountTitle: 'Syed Sarosh',
      notes: 'Review reward withdrawal',
    }, authCookie);
    assert.equal(req1.code, 200);
    assert.equal(req1.data.ok, true);
    assert.equal(req1.data.balance, 150); // 200 - 50 = 150
    const withdrawalId1 = req1.data.withdrawal.id;
    assert.equal(req1.data.withdrawal.status, 'pending');
    assert.equal(req1.data.withdrawal.amount, 50);

    // Verify ledger entry
    const ledgerRows = (await database.query(
      'SELECT * FROM commerce_wallet_ledger WHERE account_id = $1 ORDER BY created_at DESC',
      [customerId],
    )).rows;
    assert.equal(ledgerRows.length, 1);
    assert.equal(ledgerRows[0].amount, -50);
    assert.match(ledgerRows[0].description, /Withdrawal request: PKR 50/);

    // 5. Customer dashboard now shows the pending withdrawal and updated balance
    const dashboard2 = await request('account-dashboard', null, authCookie);
    assert.equal(dashboard2.code, 200);
    assert.equal(dashboard2.data.account.balance, 150);
    assert.equal(dashboard2.data.withdrawals.length, 1);
    assert.equal(dashboard2.data.withdrawals[0].id, withdrawalId1);
    assert.equal(dashboard2.data.withdrawals[0].status, 'pending');

    // 6. Admin can see the withdrawal in admin-list
    const adminList = await request('admin-list', null, '', true);
    assert.equal(adminList.code, 200);
    assert.ok(Array.isArray(adminList.data.walletWithdrawals));
    const adminWithdrawal1 = adminList.data.walletWithdrawals.find((w) => w.id === withdrawalId1);
    assert.ok(adminWithdrawal1);
    assert.equal(adminWithdrawal1.customer_name, 'Syed Sarosh');
    assert.equal(adminWithdrawal1.customer_email, 'sarosh@test.invalid');
    assert.equal(adminWithdrawal1.amount, 50);
    assert.equal(adminWithdrawal1.payout_method, 'Easypaisa');
    assert.equal(adminWithdrawal1.account_number, '03451234567');
    assert.equal(adminWithdrawal1.account_title, 'Syed Sarosh');
    assert.equal(adminWithdrawal1.status, 'pending');

    // 7. Admin marks withdrawal completed ("Successfully Withdrawn")
    const completeRes = await request('admin-wallet-withdrawal-complete', {
      id: withdrawalId1,
      adminNote: 'TRX-987654321 sent via Easypaisa',
    }, '', true);
    assert.equal(completeRes.code, 200);
    assert.equal(completeRes.data.ok, true);
    assert.equal(completeRes.data.withdrawal.status, 'completed');
    assert.ok(completeRes.data.withdrawal.completed_at);
    assert.equal(completeRes.data.withdrawal.admin_note, 'TRX-987654321 sent via Easypaisa');

    // 8. Trying to complete again fails
    const reComplete = await request('admin-wallet-withdrawal-complete', {
      id: withdrawalId1,
    }, '', true);
    assert.equal(reComplete.code, 400);

    // 9. Customer requests a second withdrawal of Rs. 100 via JazzCash
    const req2 = await request('account-wallet-withdraw', {
      amount: 100,
      payoutMethod: 'JazzCash',
      accountNumber: '03009876543',
      accountTitle: 'Syed Sarosh',
    }, authCookie);
    assert.equal(req2.code, 200);
    assert.equal(req2.data.balance, 50); // 150 - 100 = 50
    const withdrawalId2 = req2.data.withdrawal.id;

    // 10. Admin rejects this withdrawal (e.g. invalid title or test) -> Balance refunded
    const rejectRes = await request('admin-wallet-withdrawal-reject', {
      id: withdrawalId2,
      reason: 'Account title mismatch. Please re-check.',
    }, '', true);
    assert.equal(rejectRes.code, 200);
    assert.equal(rejectRes.data.ok, true);
    assert.equal(rejectRes.data.withdrawal.status, 'rejected');
    assert.ok(rejectRes.data.withdrawal.rejected_at);
    assert.equal(rejectRes.data.withdrawal.admin_note, 'Account title mismatch. Please re-check.');

    // Verify customer balance was refunded back to 150 (50 + 100)
    const dashboard3 = await request('account-dashboard', null, authCookie);
    assert.equal(dashboard3.code, 200);
    assert.equal(dashboard3.data.account.balance, 150);

    // Verify refund ledger row exists
    const ledgerRowsAfterRefund = (await database.query(
      'SELECT * FROM commerce_wallet_ledger WHERE account_id = $1 ORDER BY created_at DESC',
      [customerId],
    )).rows;
    assert.equal(ledgerRowsAfterRefund.length, 3);
    assert.equal(ledgerRowsAfterRefund[0].amount, 100);
    assert.match(ledgerRowsAfterRefund[0].description, /Refund for rejected withdrawal/);

    // 11. Trying to reject an already rejected withdrawal fails
    const reReject = await request('admin-wallet-withdrawal-reject', {
      id: withdrawalId2,
    }, '', true);
    assert.equal(reReject.code, 400);

  } finally {
    Object.assign(process.env, previous);
  }
});
