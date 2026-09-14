# Sasify Solutions

Production storefront and commerce administration system for [sasifysolutions.com](https://www.sasifysolutions.com).

## What is implemented

- Static, crawlable storefront with home, inventory, buying guide, policy, scam-report and product pages.
- ChatGPT Plus Ultra Stable Account inventory with Apple Pay checkout at PKR 3,499.
- NayaPay checkout, payment-reference submission, payment review and controlled account delivery.
- Admin authentication, stock import/withdrawal, order management, supplier catalog controls and financial summaries.
- DODI and Qamify supplier adapters, explicit offer mapping and guarded supplier fulfilment.
- PostgreSQL schema bootstrap/migrations, encrypted credentials and audit records.
- Canonical metadata, XML sitemap, robots.txt, structured data, verification tags and llms.txt.
- Automated tests for storefront, SEO, static export, commerce, inbound email and scam reports.

## Local development

Requires Node.js 22.13 or newer.

```powershell
npm ci
npm run dev
```

Run verification:

```powershell
npm run lint
npm test
```

## Production deployment

The Vercel CLI project is linked locally. The production command rebuilds the static site, packages the current commerce backend and deploys both together:

```powershell
npm run deploy:prod
```

Do not deploy an old `out` or `.vercel/output` directory without rebuilding. The generated folders and local environment files are intentionally ignored by Git.

## Configuration

Keep values in local or Vercel environment configuration, never in source control. Relevant variable names include:

- `DATABASE_URL`
- `COMMERCE_ENCRYPTION_KEY`
- `COMMERCE_ADMIN_KEY`
- `COMMERCE_ADMIN_EMAIL`
- `COMMERCE_ADMIN_PASSWORD_HASH`
- `PAYMENT_ACCOUNT_TITLE`
- `NAYAPAY_WEBHOOK_SECRET`
- `NAYAPAY_SIGNING_KEY`
- `NAYAPAY_SENDER`
- `NAYAPAY_RECEIVER_MARKER`
- `NAYAPAY_RECEIVER_EMAIL`
- `NAYAPAY_AUTO_VERIFY`
- `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` (optional order/supplier alerts)
- `GOOGLE_REVIEWS_CLIENT_ID`, `GOOGLE_REVIEWS_CLIENT_SECRET`, `GOOGLE_REVIEWS_REFRESH_TOKEN`, `GOOGLE_REVIEWS_ACCOUNT_ID`, `GOOGLE_REVIEWS_LOCATION_ID` and `CRON_SECRET` (automatic Google Business Profile review sync; see `docs/GOOGLE-REVIEWS-SYNC.md`)
- `SUPPLIER_LOW_BALANCE_PKR`, `SUPPLIER_LOW_BALANCE_USD` and `SUPPLIER_LOW_BALANCE_USDT` (optional alert thresholds)
- `DODI_RESELLER_API_KEY`
- `QAMIFY_API_KEY`
- `QAMIFY_USD_PKR_RATE`
- `SUPPLIER_USD_PKR_RATE`
- `SUPPLIER_USDT_PKR_RATE`
- `SUPPLIER_EMAIL_REQUIRED_PROVIDERS` (optional comma-separated provider IDs such as `qamify,fatbunny`; product-level API flags are detected automatically)
- `NEXT_PUBLIC_SITE_ORIGIN`

## Repository and operational notes

The public GitHub remote is `github` and `main` is the production source branch. The `origin` remote is the Codex workspace mirror. See `docs/PROJECT_CONTEXT.md`, `docs/NAYAPAY-INBOUND.md`, `SEARCH-SETUP.md` and `STATIC-HOSTING.md` for implementation and operating details.
