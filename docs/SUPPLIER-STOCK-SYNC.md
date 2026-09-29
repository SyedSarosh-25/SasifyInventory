# Stock fetching and refresh

Public listing components share `app/public-catalog.ts`. Concurrent consumers use one request to `catalog&view=summary`; its response is reused for 30 seconds in memory and session storage. Quick refreshes and navigation in the same tab reuse it. Full descriptions and activation instructions are excluded from summaries. Product details can request `catalog&productId=...`; the existing full catalog remains available for the static build.

The backend retains its five-second cache, combines concurrent catalog reads, and runs its independent stock queries on separate database connections. Order submission verifies current supplier availability; prices and payments are validated on the server.

`.github/workflows/supplier-stock-sync.yml` runs hourly at minute 17, with manual dispatch available. GitHub schedules can be delayed. One sequential job per supplier calls the protected `supplier-stock-sync` action. This works without upgrading Vercel Hobby's daily-only cron scheduling.

Set the same independently generated `SUPPLIER_STOCK_SYNC_SECRET` in Vercel Production and GitHub Actions repository secrets. Do not put its value in source, URLs or logs. Requests use the Authorization Bearer header. Supplier keys remain exclusively in the backend.

The job fetches each configured supplier's catalog once, updates existing product stock in one SQL statement, and records an audit entry and sync timestamps. It does not fetch supplier balances, change prices/descriptions/mappings, purchase products, or trigger static rebuilds. Missing products in a valid nonempty snapshot become unavailable. Failed, empty or invalid snapshots preserve existing stock and fail the job. Unconfigured suppliers are skipped. Jobs and per-supplier database locks prevent concurrent syncs.

Payment/order polling runs every eight seconds, pauses in hidden tabs, and prevents overlapping requests. Terminal orders stop polling. Wallet deposit polling stops when there are no pending/review deposits.

Verification: `node --test tests/public-catalog.test.mjs tests/supplier-stock-sync.test.mjs tests/catalog-cache.test.mjs tests/checkout-boundaries.test.mjs tests/checkout-availability.test.mjs` and `npm run build:static`.
