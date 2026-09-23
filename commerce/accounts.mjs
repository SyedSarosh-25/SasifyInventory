import {
  randomBytes,
  randomUUID,
  scrypt as derive,
  timingSafeEqual,
  createHash,
  createHmac,
  randomInt,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(derive);
const error = (status, message) =>
  Object.assign(new Error(message), { status });
const digest = (value) => createHash('sha256').update(value).digest('hex');
const usernamePattern = /^[a-z0-9](?:[a-z0-9._-]{1,22}[a-z0-9])$/;
const emailPattern =
  /^[^\s@]+@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
function gmailOAuthCredentials() {
  const user = String(process.env.GMAIL_SENDER_EMAIL || '').trim();
  const clientId = String(process.env.GMAIL_OAUTH_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.GMAIL_OAUTH_CLIENT_SECRET || '').trim();
  const refreshToken = String(process.env.GMAIL_OAUTH_REFRESH_TOKEN || '').trim();
  return user && clientId && clientSecret && refreshToken
    ? { user, clientId, clientSecret, refreshToken }
    : null;
}
async function sendAccountEmail({ to, subject, text, html }) {
  const credentials = gmailOAuthCredentials();
  if (!credentials)
    throw new Error('Gmail OAuth credentials are not configured.');
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        refresh_token: credentials.refreshToken,
        grant_type: 'refresh_token',
      }),
      signal: AbortSignal.timeout(10000),
    });
    const token = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || !token.access_token) {
      const failure = new Error('Google OAuth token refresh failed.');
      failure.httpStatus = tokenResponse.status;
      failure.providerCode = token.error;
      throw failure;
    }
    const cleanHeader = (value) => String(value).replace(/[\r\n]+/g, ' ').trim();
    const encodedSubject = Buffer.from(cleanHeader(subject)).toString('base64');
    const boundary = `sasify_${randomBytes(18).toString('hex')}`;
    const encodeBody = (value) =>
      Buffer.from(String(value), 'utf8')
        .toString('base64')
        .match(/.{1,76}/g)
        .join('\r\n');
    const parts = [
      `--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${encodeBody(text)}`,
    ];
    if (html)
      parts.push(
        `--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${encodeBody(html)}`,
      );
    const mime = [
      `From: Sasify Solutions <${cleanHeader(credentials.user)}>`,
      `To: ${cleanHeader(to)}`,
      `Subject: =?UTF-8?B?${encodedSubject}?=`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      ...parts,
      `--${boundary}--`,
      '',
    ].join('\r\n');
    const sendResponse = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token.access_token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ raw: Buffer.from(mime).toString('base64url') }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!sendResponse.ok) {
      const result = await sendResponse.json().catch(() => ({}));
      const failure = new Error('Gmail API rejected the message.');
      failure.httpStatus = sendResponse.status;
      failure.providerCode = result?.error?.status || result?.error?.errors?.[0]?.reason;
      throw failure;
    }
  } catch (cause) {
    const diagnostic = {
      httpStatus: Number.isInteger(cause?.httpStatus)
        ? cause.httpStatus
        : null,
      providerCode: /^[A-Za-z0-9_.-]{1,64}$/.test(cause?.providerCode || '')
        ? cause.providerCode
        : null,
    };
    console.error(
      '[account-email] Gmail API delivery failed',
      JSON.stringify(diagnostic),
    );
    throw new Error('Gmail API send failed.');
  }
}
export async function passwordHash(password) {
  if (
    typeof password !== 'string' ||
    password.length < 12 ||
    password.length > 256
  )
    throw error(400, 'Use a password between 12 and 256 characters.');
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${(await scrypt(password, salt, 64)).toString('hex')}`;
}
export async function passwordMatches(password, stored) {
  const [salt, encoded] = String(stored || '').split(':');
  if (
    !salt ||
    !encoded ||
    typeof password !== 'string' ||
    password.length > 256
  )
    return false;
  const expected = Buffer.from(encoded, 'hex');
  const actual = await scrypt(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export const accountSchema = `
CREATE TABLE IF NOT EXISTS commerce_accounts (
 id uuid PRIMARY KEY, email text NOT NULL UNIQUE, name text NOT NULL,
 password_hash text NOT NULL, role text NOT NULL CHECK(role IN ('customer','reseller')),
 balance integer NOT NULL DEFAULT 0 CHECK(balance>=0), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS commerce_account_sessions (
 token_hash text PRIMARY KEY, account_id uuid NOT NULL REFERENCES commerce_accounts(id),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days'
);
ALTER TABLE commerce_accounts ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
ALTER TABLE commerce_accounts ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS commerce_accounts_username_unique ON commerce_accounts(LOWER(username)) WHERE username IS NOT NULL;
ALTER TABLE commerce_accounts ADD COLUMN IF NOT EXISTS reseller_status text NOT NULL DEFAULT 'pending' CHECK(reseller_status IN ('pending','approved','rejected'));
ALTER TABLE commerce_accounts ADD COLUMN IF NOT EXISTS reseller_reviewed_at timestamptz;
ALTER TABLE commerce_accounts DROP CONSTRAINT IF EXISTS commerce_accounts_reseller_status_check;
ALTER TABLE commerce_accounts ADD CONSTRAINT commerce_accounts_reseller_status_check CHECK(reseller_status IN ('none','pending','approved','rejected'));
ALTER TABLE commerce_accounts ALTER COLUMN reseller_status SET DEFAULT 'none';
CREATE TABLE IF NOT EXISTS commerce_signup_verifications (
 id uuid PRIMARY KEY, email text NOT NULL UNIQUE, name text NOT NULL, role text NOT NULL,
 code_hash text NOT NULL, attempts integer NOT NULL DEFAULT 0,
 sent_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
 verified_at timestamptz, token_hash text, consumed_at timestamptz
);
ALTER TABLE commerce_signup_verifications ADD COLUMN IF NOT EXISTS username text;
CREATE TABLE IF NOT EXISTS commerce_password_reset_tokens (
 id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES commerce_accounts(id),
 token_hash text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL, used_at timestamptz
);
CREATE INDEX IF NOT EXISTS commerce_password_reset_account ON commerce_password_reset_tokens(account_id,created_at DESC);
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES commerce_accounts(id);
ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS wallet_discount integer NOT NULL DEFAULT 0 CHECK(wallet_discount>=0);
CREATE INDEX IF NOT EXISTS commerce_orders_account ON commerce_orders(account_id,created_at DESC);
CREATE TABLE IF NOT EXISTS commerce_wallet_deposits (
 id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES commerce_accounts(id),
 amount integer NOT NULL CHECK(amount>0), currency text NOT NULL CHECK(currency IN ('PKR','USDT')),
 payment_amount numeric(20,8) NOT NULL CHECK(payment_amount>0), method text NOT NULL,
 receiver_id text NOT NULL, reference text, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','review','credited')),
 created_at timestamptz NOT NULL DEFAULT now(), credited_at timestamptz
);
ALTER TABLE commerce_payments ADD COLUMN IF NOT EXISTS wallet_deposit_id uuid UNIQUE REFERENCES commerce_wallet_deposits(id);
CREATE TABLE IF NOT EXISTS commerce_wallet_ledger (
 id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES commerce_accounts(id), amount integer NOT NULL,
 order_id uuid UNIQUE REFERENCES commerce_orders(id), deposit_id uuid UNIQUE REFERENCES commerce_wallet_deposits(id),
 description text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);`;
export async function accountForRequest(db, req) {
  const token = String(req.headers.cookie || '').match(
    /(?:^|;\s*)sasify_account=([a-f0-9]{64})(?:;|$)/,
  )?.[1];
  if (!token) return null;
  return (
    (
      await db.query(
        `SELECT a.id,a.email,a.name,a.username,a.role,a.balance,a.reseller_status FROM commerce_accounts a
    JOIN commerce_account_sessions s ON s.account_id=a.id WHERE s.token_hash=$1 AND s.expires_at>now()
      AND (a.role='customer' OR a.reseller_status='approved')`,
        [digest(token)],
      )
    ).rows[0] || null
  );
}
export function requireAccount(account) {
  if (!account) throw error(401, 'Please log in to your account.');
  return account;
}
export async function applyForReseller(db, account) {
  requireAccount(account);
  if (account.role === 'reseller' && account.reseller_status === 'approved')
    return {
      ok: true,
      status: 'approved',
      message: 'Your account is already approved as a reseller.',
    };
  if (account.reseller_status === 'pending')
    return {
      ok: true,
      status: 'pending',
      message: 'Your reseller application is already under admin review.',
    };
  await db.query(
    "UPDATE commerce_accounts SET reseller_status='pending',reseller_reviewed_at=NULL WHERE id=$1 AND role='customer'",
    [account.id],
  );
  await db.query(
    "INSERT INTO commerce_audit(action,object_id) VALUES('reseller_application',$1)",
    [account.id],
  );
  return {
    ok: true,
    status: 'pending',
    message:
      'Your reseller application has been sent. You can continue using your customer account while it is reviewed.',
  };
}
const otpHash = (id, code) =>
  createHmac('sha256', process.env.COMMERCE_ENCRYPTION_KEY)
    .update(`${id}:${code}`)
    .digest('hex');
export async function signupVerification(db, action, body) {
  if (action === 'account-send-otp') {
    const email = String(body.email || '')
        .trim()
        .toLowerCase(),
      name = String(body.name || '').trim(),
      username = String(body.username || '')
        .trim()
        .toLowerCase();
    if (
      !emailPattern.test(email) ||
      email.length > 254 ||
      !name ||
      name.length > 100 ||
      !usernamePattern.test(username)
    )
      throw error(
        400,
        'Enter your name, a valid username, and a valid email address.',
      );
    if (!gmailOAuthCredentials())
      throw error(
        503,
        'Email verification is not configured yet. Please contact support.',
      );
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      `signup:${email}`,
    ]);
    if (
      (
        await db.query('SELECT id FROM commerce_accounts WHERE email=$1', [
          email,
        ])
      ).rows.length
    )
      throw error(409, 'An account already exists. Please log in.');
    if (
      (
        await db.query(
          'SELECT id FROM commerce_accounts WHERE LOWER(username)=LOWER($1)',
          [username],
        )
      ).rows.length
    )
      throw error(409, 'That username is already taken. Choose another one.');
    const recent = (
      await db.query(
        "SELECT id FROM commerce_signup_verifications WHERE email=$1 AND sent_at>now()-interval '60 seconds'",
        [email],
      )
    ).rows.length;
    if (recent)
      throw error(429, 'Wait 60 seconds before requesting another code.');
    const id = randomUUID(),
      code = String(randomInt(100000, 1000000));
    await db.query(
      `INSERT INTO commerce_signup_verifications(id,email,name,username,role,code_hash,expires_at)
      VALUES($1,$2,$3,$4,$5,$6,now()+interval '10 minutes') ON CONFLICT(email) DO UPDATE SET
      id=excluded.id,name=excluded.name,username=excluded.username,role=excluded.role,code_hash=excluded.code_hash,attempts=0,
      sent_at=now(),expires_at=excluded.expires_at,verified_at=NULL,token_hash=NULL,consumed_at=NULL`,
      [id, email, name, username, 'customer', otpHash(id, code)],
    );
    try {
      await sendAccountEmail({
        to: email,
        subject: 'Your Sasify verification code',
        text: `Your Sasify email verification code is ${code}.\n\nThis code expires in 10 minutes. Do not share it. If you did not request this code, you can ignore this email.`,
      });
    } catch {
      throw error(
        503,
        'We could not send your code. Please try again shortly.',
      );
    }
    return { ok: true, challengeId: id, expiresIn: 600, resendAfter: 60 };
  }
  if (!/^[a-f0-9-]{36}$/i.test(String(body.challengeId)))
    throw error(400, 'Request a new verification code.');
  const challenge = (
    await db.query(
      'SELECT * FROM commerce_signup_verifications WHERE id=$1 FOR UPDATE',
      [body.challengeId],
    )
  ).rows[0];
  if (
    !challenge ||
    challenge.consumed_at ||
    challenge.verified_at ||
    new Date(challenge.expires_at) <= new Date() ||
    challenge.attempts >= 5
  )
    throw error(
      400,
      'This code has expired or is no longer valid. Request a new code.',
    );
  await db.query(
    'UPDATE commerce_signup_verifications SET attempts=attempts+1 WHERE id=$1',
    [challenge.id],
  );
  if (
    !/^\d{6}$/.test(String(body.code)) ||
    otpHash(challenge.id, String(body.code)) !== challenge.code_hash
  )
    // Return rather than throw so the attempt increment commits.
    return {
      ok: false,
      error: 'Incorrect code. Please try again.',
      attemptsRemaining: 4 - challenge.attempts,
    };
  const verificationToken = randomBytes(32).toString('hex');
  await db.query(
    'UPDATE commerce_signup_verifications SET verified_at=now(),token_hash=$1 WHERE id=$2',
    [digest(verificationToken), challenge.id],
  );
  return { ok: true, verificationToken };
}

export async function accountPasswordReset(
  db,
  action,
  body,
  requestOrigin = '',
) {
  const genericMessage =
    'If that username matches an account, we have emailed a password reset link to its registered email address.';
  if (action === 'account-request-password-reset') {
    const username = String(body.username || '')
      .trim()
      .toLowerCase();
    if (!usernamePattern.test(username))
      return { ok: true, message: genericMessage };
    if (!gmailOAuthCredentials())
      throw error(
        503,
        'Password reset email is temporarily unavailable. Please try again later.',
      );
    const account = (
      await db.query(
        'SELECT id,email FROM commerce_accounts WHERE LOWER(username)=LOWER($1) FOR UPDATE',
        [username],
      )
    ).rows[0];
    if (account) {
      const recent = (
        await db.query(
          "SELECT id FROM commerce_password_reset_tokens WHERE account_id=$1 AND created_at>now()-interval '60 seconds' LIMIT 1",
          [account.id],
        )
      ).rows[0];
      if (!recent) {
        await db.query(
          'UPDATE commerce_password_reset_tokens SET used_at=now() WHERE account_id=$1 AND used_at IS NULL',
          [account.id],
        );
        const resetToken = randomBytes(32).toString('hex');
        await db.query(
          `INSERT INTO commerce_password_reset_tokens(id,account_id,token_hash,expires_at)
           VALUES($1,$2,$3,now()+interval '30 minutes')`,
          [randomUUID(), account.id, digest(resetToken)],
        );
        const safeOrigin = [
          'https://sasifysolutions.com',
          'https://www.sasifysolutions.com',
          'http://localhost:4173',
        ].includes(requestOrigin)
          ? requestOrigin
          : 'https://www.sasifysolutions.com';
        const resetUrl = `${safeOrigin}/reset-password?token=${resetToken}`;
        try {
          await sendAccountEmail({
            to: account.email,
            subject: 'Reset your Sasify password',
            text: `We received a request to reset the password for your Sasify account.\n\nUse this one-time link to choose a new password (valid for 30 minutes):\n${resetUrl}\n\nIf you did not request this, you can ignore this email. Your password will not change.`,
            html: `<p>We received a request to reset the password for your Sasify account.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This one-time link expires in 30 minutes. If you did not request this, you can ignore this email. Your password will not change.</p>`,
          });
        } catch {
          // Keep the response generic so username existence is not disclosed.
        }
      }
    }
    return { ok: true, message: genericMessage };
  }
  if (action !== 'account-reset-password')
    throw error(400, 'Invalid password reset request.');
  const token = String(body.token || '');
  if (!/^[a-f0-9]{64}$/.test(token))
    throw error(
      400,
      'This password reset link is invalid or expired. Request a new link.',
    );
  if (body.password !== body.confirmPassword)
    throw error(400, 'Passwords do not match.');
  const reset = (
    await db.query(
      `SELECT id,account_id FROM commerce_password_reset_tokens
       WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE`,
      [digest(token)],
    )
  ).rows[0];
  if (!reset)
    throw error(
      400,
      'This password reset link is invalid or expired. Request a new link.',
    );
  const encoded = await passwordHash(body.password);
  await db.query('UPDATE commerce_accounts SET password_hash=$1 WHERE id=$2', [
    encoded,
    reset.account_id,
  ]);
  await db.query(
    'UPDATE commerce_password_reset_tokens SET used_at=now() WHERE account_id=$1 AND used_at IS NULL',
    [reset.account_id],
  );
  await db.query('DELETE FROM commerce_account_sessions WHERE account_id=$1', [
    reset.account_id,
  ]);
  await db.query(
    "INSERT INTO commerce_audit(action,object_id) VALUES('password_reset',$1)",
    [reset.account_id],
  );
  return { ok: true, message: 'Password reset. You can now log in.' };
}

export async function adminAccountStats(db) {
  return (
    await db.query(`SELECT a.id,a.name,a.email,a.username,a.role,a.balance,a.created_at,a.email_verified_at,a.reseller_status,a.reseller_reviewed_at,
    COALESCE(o.total_orders,0)::integer AS total_orders,COALESCE(o.delivered_orders,0)::integer AS delivered_orders,
    COALESCE(o.pending_orders,0)::integer AS pending_orders,COALESCE(o.total_spent,0)::bigint AS total_spent,o.last_order_at,
    COALESCE(d.total_deposited,0)::bigint AS total_deposited,COALESCE(d.review_deposits,0)::integer AS review_deposits
    FROM commerce_accounts a
    LEFT JOIN (SELECT account_id,count(*) AS total_orders,count(*) FILTER(WHERE status='delivered') AS delivered_orders,
      count(*) FILTER(WHERE status IN ('pending','review')) AS pending_orders,sum(amount) FILTER(WHERE status='delivered') AS total_spent,
      max(created_at) AS last_order_at FROM commerce_orders GROUP BY account_id) o ON o.account_id=a.id
    LEFT JOIN (SELECT account_id,sum(amount) FILTER(WHERE status='credited') AS total_deposited,
      count(*) FILTER(WHERE status='review') AS review_deposits FROM commerce_wallet_deposits GROUP BY account_id) d ON d.account_id=a.id
    ORDER BY a.created_at DESC`)
  ).rows;
}
export async function accountAuth(db, req, res, action, body) {
  if (action === 'account-logout') {
    const token = String(req.headers.cookie || '').match(
      /(?:^|;\s*)sasify_account=([a-f0-9]{64})(?:;|$)/,
    )?.[1];
    if (token)
      await db.query(
        'DELETE FROM commerce_account_sessions WHERE token_hash=$1',
        [digest(token)],
      );
    res.setHeader(
      'Set-Cookie',
      'sasify_account=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
    );
    return { ok: true };
  }
  const email = String(body.email || '')
    .trim()
    .toLowerCase();
  if (!emailPattern.test(email) || email.length > 254)
    throw error(400, 'Enter a valid email address.');
  let account;
  if (action === 'account-signup') {
    const username = String(body.username || '')
      .trim()
      .toLowerCase();
    if (!usernamePattern.test(username))
      throw error(
        400,
        'Choose a username with 3–24 letters, numbers, dots, underscores, or hyphens. It must start and end with a letter or number.',
      );
    if (
      !/^[a-f0-9-]{36}$/i.test(String(body.challengeId)) ||
      !/^[a-f0-9]{64}$/.test(String(body.verificationToken))
    )
      throw error(400, 'Verify your email before signing up.');
    const challenge = (
      await db.query(
        'SELECT * FROM commerce_signup_verifications WHERE id=$1 FOR UPDATE',
        [body.challengeId],
      )
    ).rows[0];
    if (
      !challenge ||
      challenge.email !== email ||
      challenge.username !== username ||
      !challenge.verified_at ||
      challenge.consumed_at ||
      new Date(challenge.expires_at) <= new Date() ||
      digest(body.verificationToken) !== challenge.token_hash
    )
      throw error(400, 'Email verification has expired. Please verify again.');
    if (body.password !== body.confirmPassword)
      throw error(400, 'Passwords do not match.');
    const encoded = await passwordHash(body.password);
    account = (
      await db.query(
        `INSERT INTO commerce_accounts(id,email,name,username,password_hash,role,email_verified_at,reseller_status) VALUES($1,$2,$3,$4,$5,$6,$7,'none')
      RETURNING id,email,name,username,role,balance`,
        [
          randomUUID(),
          email,
          challenge.name,
          username,
          encoded,
          'customer',
          challenge.verified_at,
        ],
      )
    ).rows[0];
    await db.query(
      'UPDATE commerce_signup_verifications SET consumed_at=now(),token_hash=NULL WHERE id=$1',
      [challenge.id],
    );
  } else {
    account = (
      await db.query('SELECT * FROM commerce_accounts WHERE email=$1', [email])
    ).rows[0];
    // Do comparable password work for unknown accounts as well.
    const fallback = '00000000000000000000000000000000:' + '00'.repeat(64);
    if (
      !(await passwordMatches(
        body.password,
        account?.password_hash || fallback,
      )) ||
      !account
    )
      throw error(401, 'Email or password is incorrect.');
    if (account.role === 'reseller' && account.reseller_status !== 'approved')
      throw error(
        403,
        account.reseller_status === 'rejected'
          ? 'Your reseller application was not approved. Please contact support.'
          : 'Your reseller account is awaiting admin approval. You can log in after approval.',
      );
  }
  const token = randomBytes(32).toString('hex');
  await db.query(
    'INSERT INTO commerce_account_sessions(token_hash,account_id) VALUES($1,$2)',
    [digest(token), account.id],
  );
  res.setHeader(
    'Set-Cookie',
    `sasify_account=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`,
  );
  return {
    ok: true,
    account: {
      id: account.id,
      name: account.name,
      email: account.email,
      username: account.username,
      role: account.role,
      balance: account.balance,
    },
  };
}

export async function creditDeposit(db, account, depositId, reference) {
  requireAccount(account);
  if (!/^[a-f0-9-]{36}$/i.test(String(depositId)))
    throw error(400, 'Invalid deposit.');
  const deposit = (
    await db.query(
      'SELECT * FROM commerce_wallet_deposits WHERE id=$1 AND account_id=$2 FOR UPDATE',
      [depositId, account.id],
    )
  ).rows[0];
  if (!deposit) throw error(404, 'Deposit not found.');
  if (deposit.status === 'credited') return { ok: true, status: 'credited' };
  if (!/^[A-Z0-9-]{6,128}$/i.test(reference))
    throw error(400, 'Enter the transaction reference from your payment.');
  const payment = (
    await db.query(
      'SELECT * FROM commerce_payments WHERE transaction_id=$1 FOR UPDATE',
      [reference],
    )
  ).rows[0];
  // Never credit from a customer claim alone, or reuse a receipt allocated to an order.
  const competing = (
    await db.query(
      `SELECT id FROM commerce_wallet_deposits WHERE reference=$1 AND id<>$2
    UNION ALL SELECT id FROM commerce_orders WHERE transaction_id=$1 AND status IN ('pending','review','delivered')`,
      [reference, deposit.id],
    )
  ).rows;
  const valid =
    competing.length === 0 &&
    payment?.verified &&
    !payment.order_id &&
    !payment.wallet_deposit_id &&
    payment.currency === deposit.currency &&
    Number(payment.payment_amount ?? payment.amount) ===
      Number(deposit.payment_amount) &&
    payment.receiver_id === deposit.receiver_id &&
    new Date(payment.received_at) >= new Date(deposit.created_at);
  if (!valid) {
    await db.query(
      "UPDATE commerce_wallet_deposits SET reference=$1,status='review' WHERE id=$2",
      [reference, deposit.id],
    );
    return { ok: true, status: 'review' };
  }
  await db.query(
    'UPDATE commerce_accounts SET balance=balance+$1 WHERE id=$2',
    [deposit.amount, account.id],
  );
  await db.query(
    'UPDATE commerce_payments SET wallet_deposit_id=$1 WHERE id=$2',
    [deposit.id, payment.id],
  );
  await db.query(
    "UPDATE commerce_wallet_deposits SET reference=$1,status='credited',credited_at=now() WHERE id=$2",
    [reference, deposit.id],
  );
  await db.query(
    'INSERT INTO commerce_wallet_ledger(id,account_id,amount,deposit_id,description) VALUES($1,$2,$3,$4,$5)',
    [randomUUID(), account.id, deposit.amount, deposit.id, 'Wallet deposit'],
  );
  return { ok: true, status: 'credited' };
}
