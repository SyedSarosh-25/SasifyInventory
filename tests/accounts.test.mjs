import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createHandler } from '../commerce/handler.mjs';
import { passwordHash, passwordMatches } from '../commerce/accounts.mjs';

test('password hashes use random salts and reject invalid credentials', async () => {
  const a = await passwordHash('strong-test-password'),
    b = await passwordHash('strong-test-password');
  assert.notEqual(a, b);
  assert.equal(await passwordMatches('strong-test-password', a), true);
  assert.equal(await passwordMatches('incorrect', a), false);
  await assert.rejects(passwordHash('short'));
});
test('accounts isolate purchases, verified deposits credit once, wallet pays once and logout revokes access', async () => {
  const database = new PGlite();
  await database.exec(
    await readFile(new URL('../commerce/schema.sql', import.meta.url), 'utf8'),
  );
  const previous = { ...process.env };
  Object.assign(process.env, {
    DATABASE_URL: 'test',
    COMMERCE_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
    COMMERCE_ADMIN_KEY: randomBytes(32).toString('hex'),
    PAYMENT_ACCOUNT_TITLE: 'Test Receiver',
    GMAIL_SENDER_EMAIL: 'sender@gmail.test',
    GMAIL_OAUTH_CLIENT_ID: 'test-client-id',
    GMAIL_OAUTH_CLIENT_SECRET: 'test-client-secret',
    GMAIL_OAUTH_REFRESH_TOKEN: 'test-refresh-token',
  });
  const originalFetch = globalThis.fetch;
  const sentMail = [];
  let nextApiFailure = null;
  globalThis.fetch = async (url, options = {}) => {
    if (url === 'https://oauth2.googleapis.com/token')
      return new Response(JSON.stringify({ access_token: 'test-access-token' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    if (url === 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send') {
      assert.equal(options.headers.authorization, 'Bearer test-access-token');
      if (nextApiFailure) {
        const failure = nextApiFailure;
        nextApiFailure = null;
        return new Response(JSON.stringify({ error: { status: failure.providerCode } }), {
          status: failure.httpStatus,
          headers: { 'content-type': 'application/json' },
        });
      }
      const mime = Buffer.from(JSON.parse(options.body).raw, 'base64url').toString();
      const encodedText = mime.match(
        /Content-Type: text\/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n([\s\S]*?)\r\n--sasify_/,
      )?.[1];
      const encodedSubject = mime.match(/^Subject: =\?UTF-8\?B\?(.+)\?=$/m)?.[1];
      sentMail.push({
        to: mime.match(/^To: (.+)$/m)?.[1],
        subject: Buffer.from(encodedSubject || '', 'base64').toString(),
        text: Buffer.from((encodedText || '').replace(/\s/g, ''), 'base64').toString(),
      });
      return new Response(JSON.stringify({ id: 'test-message-id' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    throw new Error('Unexpected network request in account test.');
  };
  const handler = createHandler(() => ({
    connect: async () => ({
      query: async (sql, args) => {
        const r = await database.query(sql, args);
        return { ...r, rowCount: r.affectedRows ?? r.rows.length };
      },
      release() {},
    }),
  }));
  async function request(action, body, cookie = '', id = '', admin = false) {
    let result;
    const headers = {};
    await handler(
      {
        method: body ? 'POST' : 'GET',
        query: { action, id },
        url: '/api/commerce',
        body,
        headers: {
          cookie,
          authorization: admin
            ? `Bearer ${process.env.COMMERCE_ADMIN_KEY}`
            : '',
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
    assert.equal((await request('account-dashboard')).code, 401);
    assert.equal(
      (
        await request('account-signup', {
          email: 'customer@test.invalid',
          password: 'strong-test-password',
        })
      ).code,
      400,
    );
    assert.equal(
      (
        await request('account-send-otp', {
          name: 'Customer',
          email: 'not-an-email',
        })
      ).code,
      400,
    );
    assert.equal(
      (
        await request('account-send-otp', {
          name: 'Customer',
          email: 'cbv@gmail.c',
        })
      ).code,
      400,
    );
    nextApiFailure = { httpStatus: 401, providerCode: 'UNAUTHENTICATED' };
    const diagnosticLogs = [];
    const originalConsoleError = console.error;
    console.error = (...args) => diagnosticLogs.push(args.join(' '));
    let failedOtp;
    try {
      failedOtp = await request('account-send-otp', {
        name: 'Diagnostic Test',
        username: 'diagnostic_test',
        email: 'diagnostic@example.test',
      });
    } finally {
      console.error = originalConsoleError;
    }
    assert.equal(failedOtp.code, 503);
    assert.match(diagnosticLogs.join('\n'), /Gmail API delivery failed/);
    assert.match(diagnosticLogs.join('\n'), /"httpStatus":401/);
    assert.match(diagnosticLogs.join('\n'), /"providerCode":"UNAUTHENTICATED"/);
    assert.doesNotMatch(
      diagnosticLogs.join('\n'),
      /diagnostic@example\.test|123456|test-refresh-token|Do not log this diagnostic/i,
    );
    async function register(details) {
      const signupDetails = {
        ...details,
        username: details.username || details.email.split('@')[0],
      };
      const challenge = await request('account-send-otp', signupDetails);
      assert.equal(challenge.code, 200, JSON.stringify(challenge));
      assert.equal(challenge.data.code, undefined);
      assert.equal(sentMail.at(-1).to, signupDetails.email);
      assert.equal(
        (await request('account-send-otp', signupDetails)).code,
        429,
      );
      const code = sentMail.at(-1).text.match(/\b\d{6}\b/)[0];
      const wrong = await request('account-verify-otp', {
        challengeId: challenge.data.challengeId,
        code: '000000',
      });
      assert.equal(wrong.data.ok, false);
      assert.equal(wrong.data.attemptsRemaining, 4);
      const verification = await request('account-verify-otp', {
        challengeId: challenge.data.challengeId,
        code,
      });
      assert.equal(verification.data.ok, true);
      const payload = {
        ...signupDetails,
        challengeId: challenge.data.challengeId,
        verificationToken: verification.data.verificationToken,
        confirmPassword: details.password,
      };
      assert.equal(
        (
          await request('account-signup', {
            ...payload,
            confirmPassword: 'wrong',
          })
        ).code,
        400,
      );
      const result = await request('account-signup', payload);
      assert.equal((await request('account-signup', payload)).code, 400);
      return result;
    }
    const signup = await register({
      name: 'Customer',
      email: 'customer@test.invalid',
      password: 'strong-test-password',
      role: 'customer',
    });
    assert.equal(signup.code, 200, JSON.stringify(signup));
    const cookie = signup.headers['set-cookie'].split(';')[0];
    assert.ok(
      signup.headers['set-cookie'].includes(
        'HttpOnly; Secure; SameSite=Strict',
      ),
    );
    assert.equal(signup.data.account.password_hash, undefined);
    const resetRequest = await request('account-request-password-reset', {
      username: 'customer',
    });
    assert.equal(resetRequest.code, 200);
    assert.equal(sentMail.at(-1).to, 'customer@test.invalid');
    assert.equal(sentMail.at(-1).subject, 'Reset your Sasify password');
    assert.match(sentMail.at(-1).text, /one-time link/);
    const other = await register({
      name: 'Reseller',
      email: 'reseller@test.invalid',
      password: 'strong-test-password',
      role: 'reseller',
    });
    const otherCookie = other.headers['set-cookie'].split(';')[0];
    assert.equal(other.data.account.role, 'customer');
    const application = await request(
      'account-apply-reseller',
      {},
      otherCookie,
    );
    assert.equal(application.code, 200, JSON.stringify(application));
    assert.equal(application.data.status, 'pending');
    const resellerLogin = {
      email: 'reseller@test.invalid',
      password: 'strong-test-password',
    };
    assert.equal((await request('account-login', resellerLogin)).code, 200);
    const resellerId = (
      await database.query(
        "SELECT id FROM commerce_accounts WHERE email='reseller@test.invalid'",
      )
    ).rows[0].id;
    assert.equal(
      (
        await request(
          'admin-reseller-review',
          { accountId: resellerId, status: 'approved' },
          otherCookie,
        )
      ).code,
      401,
    );
    assert.equal(
      (
        await request(
          'admin-reseller-review',
          { accountId: resellerId, status: 'approved' },
          '',
          '',
          true,
        )
      ).code,
      200,
    );
    assert.equal(
      (await request('account-dashboard', undefined, otherCookie)).code,
      401,
    );
    const resellerSession = await request('account-login', resellerLogin);
    assert.equal(resellerSession.code, 200);
    const resellerCookie = resellerSession.headers['set-cookie'].split(';')[0];
    assert.equal(
      (
        await request('account-login', {
          email: 'customer@test.invalid',
          password: 'wrong',
        })
      ).code,
      401,
    );
    assert.equal(
      (
        await request('account-login', {
          email: 'customer@test.invalid',
          password: 'strong-test-password',
        })
      ).code,
      200,
    );
    const deposit = await request(
      'account-deposit',
      { amount: 5000, method: 'bank' },
      cookie,
    );
    assert.equal(deposit.code, 200, JSON.stringify(deposit));
    const depositId = deposit.data.deposit.id;
    assert.equal(
      (
        await request(
          'account-deposit-check',
          { id: depositId, reference: 'TESTREF123' },
          resellerCookie,
        )
      ).code,
      404,
    );
    assert.equal(
      (
        await request(
          'account-deposit-check',
          { id: depositId, reference: 'TESTREF123' },
          cookie,
        )
      ).data.status,
      'review',
    );
    assert.equal(
      (await request('account-dashboard', undefined, cookie)).data.account
        .balance,
      0,
    );
    await database.query(
      `INSERT INTO commerce_payments(id,event_hash,transaction_id,amount,payment_amount,currency,received_at,verified,subject,encrypted_body,receiver_id)
      VALUES($1,$2,'TESTREF123',5000,5000,'PKR',now(),true,'Test receipt','test',$3)`,
      [randomUUID(), randomUUID(), deposit.data.deposit.receiver_id],
    );
    assert.equal(
      (
        await request(
          'account-deposit-check',
          { id: depositId, reference: 'TESTREF123' },
          cookie,
        )
      ).data.status,
      'credited',
    );
    await request(
      'account-deposit-check',
      { id: depositId, reference: 'TESTREF123' },
      cookie,
    );
    assert.equal(
      (await request('account-dashboard', undefined, cookie)).data.account
        .balance,
      5000,
    );
    await request(
      'admin-import',
      {
        productId: 'p093',
        accounts: 'owned@test.invalid|test-pass|test-2fa',
        purchaseCost: 1000,
      },
      '',
      '',
      true,
    );
    const order = await request(
      'create',
      { productId: 'p093', paymentMethod: 'bank' },
      cookie,
    );
    assert.equal(order.code, 200, JSON.stringify(order));
    assert.equal(
      (await request('status', undefined, resellerCookie, order.data.id)).code,
      404,
    );
    assert.equal(
      (
        await request(
          'account-wallet-pay',
          { id: order.data.id },
          resellerCookie,
        )
      ).code,
      404,
    );
    const paid = await request(
      'account-wallet-pay',
      { id: order.data.id },
      cookie,
    );
    assert.equal(paid.code, 200, JSON.stringify(paid));
    assert.equal(paid.data.status, 'delivered');
    const balance = (await request('account-dashboard', undefined, cookie)).data
      .account.balance;
    assert.equal(
      balance,
      5000 - (order.data.amount - Math.floor(order.data.amount * 0.05)),
    );
    await request('account-wallet-pay', { id: order.data.id }, cookie);
    assert.equal(
      (await request('account-dashboard', undefined, cookie)).data.account
        .balance,
      balance,
    );
    assert.equal(
      (await request('status', undefined, cookie, order.data.id)).data
        .credentials.email,
      'owned@test.invalid',
    );
    assert.equal(
      (await request('account-dashboard', undefined, resellerCookie)).data
        .orders.length,
      0,
    );
    assert.equal((await request('admin-list', undefined, cookie)).code, 401);
    const adminList = await request('admin-list', undefined, '', '', true);
    assert.equal(adminList.code, 200, JSON.stringify(adminList));
    const stats = adminList.data.accounts.find(
      (a) => a.email === 'customer@test.invalid',
    );
    assert.equal(stats.balance, balance);
    assert.equal(stats.total_orders, 1);
    assert.equal(stats.delivered_orders, 1);
    assert.equal(
      Number(stats.total_spent),
      order.data.amount - Math.floor(order.data.amount * 0.05),
    );
    assert.equal(Number(stats.total_deposited), 5000);
    assert.ok(stats.email_verified_at);
    assert.equal(stats.password_hash, undefined);
    const locked = await request('account-send-otp', {
      name: 'Locked',
      username: 'locked_user',
      email: 'locked@test.invalid',
      role: 'customer',
    });
    const lockedCode = sentMail.at(-1).text.match(/\b\d{6}\b/)[0];
    for (let i = 0; i < 5; i++)
      assert.equal(
        (
          await request('account-verify-otp', {
            challengeId: locked.data.challengeId,
            code: '000000',
          })
        ).data.ok,
        false,
      );
    assert.equal(
      (
        await request('account-verify-otp', {
          challengeId: locked.data.challengeId,
          code: lockedCode,
        })
      ).code,
      400,
    );
    const expired = await request('account-send-otp', {
      name: 'Expired',
      username: 'expired_user',
      email: 'expired@test.invalid',
      role: 'customer',
    });
    const expiredCode = sentMail.at(-1).text.match(/\b\d{6}\b/)[0];
    await database.query(
      "UPDATE commerce_signup_verifications SET expires_at=now()-interval '1 second' WHERE id=$1",
      [expired.data.challengeId],
    );
    assert.equal(
      (
        await request('account-verify-otp', {
          challengeId: expired.data.challengeId,
          code: expiredCode,
        })
      ).code,
      400,
    );
    assert.equal(
      (
        await request(
          'admin-reseller-review',
          { accountId: resellerId, status: 'rejected' },
          '',
          '',
          true,
        )
      ).code,
      200,
    );
    assert.equal(
      (
        await request(
          'account-dashboard',
          undefined,
          resellerSession.headers['set-cookie'].split(';')[0],
        )
      ).code,
      401,
    );
    assert.equal((await request('account-login', resellerLogin)).code, 200);
    await request('account-logout', {}, cookie);
    assert.equal(
      (await request('account-dashboard', undefined, cookie)).code,
      401,
    );
  } finally {
    globalThis.fetch = originalFetch;
    await database.close();
    for (const k of Object.keys(process.env))
      if (!(k in previous)) delete process.env[k];
    Object.assign(process.env, previous);
  }
});
