# Customer accounts

Routes: `/signup`, `/login`, `/account`, `/forgot-password`, and
`/reset-password`. Every new account starts as a customer. Signup collects a
name, unique username, and email, sends a six-digit OTP to that email, and only
unlocks password setup after the email is verified. The account dashboard
contains the reseller application action; submitting it changes the account to
pending review. Only admin approval under Registered users changes the role to
reseller. Rejection/revocation invalidates existing reseller sessions while
leaving the person able to use the customer account.

Account passwords use salted scrypt. Seven-day opaque sessions are hashed in the
database and carried in Secure, HttpOnly, SameSite=Strict cookies. Logout revokes
the session. Orders created while signed in record the authenticated account ID;
accounts cannot claim previous orders by supplying an email address.

The handler applies the additive account schema from `commerce/accounts.mjs`.
The packaging script includes this module.

Signup usernames are case-insensitively unique and may contain 3–24 letters,
numbers, dots, underscores, and hyphens; they must start and end with a letter
or number. The server binds the single-use OTP proof to the verified email and
username. Codes expire after ten
minutes, allow five verification attempts, and have a sixty-second resend limit.
Resending invalidates the previous code/proof. Codes use a keyed hash at rest.

Signup verification and password-reset messages use the Gmail API with OAuth
2.0. Production requires server-only
`GMAIL_SENDER_EMAIL`, `GMAIL_OAUTH_CLIENT_ID`, `GMAIL_OAUTH_CLIENT_SECRET`, and
`GMAIL_OAUTH_REFRESH_TOKEN` environment variables. The Google OAuth client must
be authorized by the same Gmail account configured as `GMAIL_SENDER_EMAIL`; grant
the `https://www.googleapis.com/auth/gmail.send` scope and request offline
access to obtain a refresh token. Treat the client secret and refresh token as credentials: store
them only in Vercel Production secrets or ignored `.env.local`, never in browser
code, source control, logs, or chat. Missing mail configuration blocks signup;
there is no verification bypass. Google may require OAuth consent-screen setup
or verification depending on the app's audience and publishing status. Google
classifies `gmail.send` as sensitive and says public apps may need OAuth
verification. An external OAuth app left in Testing issues refresh tokens that
expire after seven days for these scopes; production use requires the app to be
published and any required review completed.

OAuth setup: create a Google Cloud project, configure the OAuth consent screen
and add `gmail.send`, then create a Web application OAuth client. For a token
bootstrap through Google's OAuth Playground, add
`https://developers.google.com/oauthplayground` as an authorized redirect URI,
select “Use your own OAuth credentials,” authorize `gmail.send` while signed in
as the sender, and exchange the code for a refresh token with offline access.
Put the resulting client ID, client secret, and refresh token into Vercel
Production environment variables above, then redeploy. Never paste the refresh
token or client secret into chat.

Password recovery accepts a username only and always returns a generic
confirmation to avoid revealing whether an account exists. When matched, a
single-use reset link is sent to the account's registered email. Reset links
expire after 30 minutes; completing a reset invalidates other links and all
existing login sessions. Password reset email uses the same Gmail SMTP sender.

Admin > Registered users lists customer/reseller accounts with verification,
balance, order counts, delivered spending, deposits, join and last-order dates.
Only authenticated admins can read this list; password/session/code hashes are
not included. Older accounts have no username until separately updated, and are
not marked verified retroactively.

Wallet balances and ledger amounts are integer PKR. Deposit instructions snapshot
the exchange rate into an expected payment amount. Deposits require a verified,
unused receipt with matching amount, currency, receiver and transaction reference,
dated after deposit creation. Customers press Verify deposit after payment; if
the receipt has not arrived they can retry. Missing or ambiguous evidence stays
in review. Credited receipts cannot also pay for an order.

Wallet checkout locks the order, conditionally debits balance, and uses existing
fulfilment. Duplicate payment requests cannot debit a delivered order twice.
Supplier cancellation restores the debit; thrown failures roll back the database
transaction. Existing supplier idempotency and failure handling still apply.

Limitations: guest/Telegram account linking, username changes, reseller pricing,
and an admin wallet-review screen are not part of this customer dashboard.
Account help links to support. Pending deposits
do not credit merely because a customer presses a button. No real payment or
production migration has been performed during local verification.

Verification: `node --test tests/accounts.test.mjs`, existing commerce/checkout/
supplier tests, and `npm run build:static`.
