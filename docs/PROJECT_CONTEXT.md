# Project Context

Last reconstructed: 2026-09-07

This document is persistent context for future Codex sessions. It describes the repository as observed, including uncommitted work. Secrets and secret values are intentionally omitted.

## Repository state

- Repository: `SasifyInventory`
- Git remote: `github.com/SyedSarosh-25/SasifyInventory.git`
- Branch: `main`
- HEAD: `6c613ba` (`Redeploy with static build settings`)
- HEAD tracks `github/main`.
- The latest committed work is dated 2026-09-04 and focuses on static deployment, catalog/mobile UX, SEO, and visual polish.
- The current working tree contains modified tracked files and a large uncommitted commerce addition. The commerce files, scripts, and commerce tests are currently untracked.
- There is no `README.md` in the repository. Existing operational documentation is in `SEARCH-SETUP.md` and `STATIC-HOSTING.md`.

## What the application does

Sasify Solutions is a Pakistan-focused digital-products storefront. It presents AI, coding, design, and productivity subscriptions/accounts with PKR and USD pricing, product comparisons, buying guidance, reviews, policy pages, and SEO metadata.

The established purchase path is WhatsApp-based. The newer uncommitted work adds an online NayaPay checkout for selected products, local account inventory, supplier products, automated delivery, and an operations/admin dashboard.

## Stack and build architecture

- React 19 and TypeScript.
- Next-style App Router file conventions, built with Vinext/Vite rather than a standard Next build.
- Vite, `@vitejs/plugin-react`, React Server Components support, and Cloudflare Vite integration.
- Tailwind CSS 4 plus a large custom stylesheet in `app/globals.css`.
- Lucide React, GSAP, Embla, Recharts, Base UI/shadcn-related packages, Vercel Analytics, and Vercel Speed Insights.
- Node.js ESM; package engines require Node `>=22.13.0`.
- PostgreSQL through `pg` for commerce. PGlite is present as a development dependency but is not the active production database path visible in the handler.
- Static export is supported through `scripts/build-static.mjs` and `SASIFY_STATIC_EXPORT=1` handling in `vite.config.ts`.
- `.openai/hosting.json` has a project ID and no configured D1 or R2 bindings.

## Repository structure

- `app/`: public pages, product data, pricing utilities, SEO, components, checkout UI, and admin UI.
- `components/ui/`: generated/reusable UI primitives.
- `commerce/`: server-side commerce core, HTTP handler, database schema, supplier clients, catalog, and NayaPay Apps Script.
- `scripts/`: static build, commerce configuration, database migration, and deployment packaging scripts.
- `tests/`: Node-based source/static/commerce tests.
- `public/`: logos, product/review assets, delivery-proof images, and payment-method assets.
- `dist/`, `out/`, `.next/`, `.wrangler/`, `.vinext/`, `.vercel/`, `.npm-cache/`, and browser artifacts are generated or local tooling state, not application source.

## Frontend architecture

The public site uses the App Router-style `app/` tree:

- `/` is the marketing landing page with featured products, search, reviews, trust/payment sections, and interactive carousels.
- `/inventory` renders the complete local catalog and, when available, the supplier-store section.
- `/products/[id]` renders product-specific details, pricing, warranty/access information, and WhatsApp purchase links. The current uncommitted code mounts `StockBuy` only for product `p093`.
- `/buying-guide`, `/about`, `/privacy`, `/refunds`, `/terms`, and `/warranty` provide supporting content.
- `/checkout` renders the online checkout client.
- `/orders-admin` renders the custom commerce operations dashboard.

The root layout mounts currency context, structured data, motion behavior, admin keyboard shortcut handling, and route-aware telemetry. Analytics and Speed Insights are intentionally omitted on checkout and admin routes.

Product data is primarily hardcoded in `app/products.ts`; supplier products are fetched at runtime by the commerce endpoint. `commerce/catalog.json` is a separate local commerce catalog used by the backend, so these are currently two catalog sources.

## Backend/API architecture

There is no conventional `app/api` route implementation in the source tree. The commerce backend is implemented in `commerce/handler.mjs` and packaged by `scripts/package-commerce.mjs` as a serverless function at `/api/commerce`.

The package script also maps `/api/nayapay/email-webhook` to the commerce handler with `action=email-webhook`.

The handler:

- Creates a PostgreSQL pool from `DATABASE_URL`.
- Uses explicit transactions, row locks, PostgreSQL advisory locks, uniqueness constraints, savepoints, and expiry cleanup.
- Applies origin checks, no-store/noindex headers, request limits, and per-action rate limiting.
- Uses encrypted server-side credentials and signed/recovery authorization.
- Returns JSON responses and hides operational errors behind safe messages.

### Commerce actions/endpoints

The `action` query parameter drives the handler:

- `stock`: local and enabled supplier inventory.
- `create`: reserve local stock or supplier stock and create a five-minute order.
- `status`: retrieve order/payment status using the recovery token.
- `claim`: submit a payment transaction ID and attempt matching/delivery.
- `cancel`: cancel an eligible customer order and release local inventory.
- `email-webhook`: receive and parse NayaPay receipt events.
- `admin-login`: authenticate the admin and issue an expiring signed token.
- `admin-import`, `admin-inventory-update`, `admin-inventory-delete`: manage local account inventory.
- `admin-inventory-pick`: securely withdraw one available account for admin use, reveal its credentials once in the active UI, and audit the withdrawal without creating income or a paid order.
- `admin-supplier-sync`, `admin-supplier-update`: synchronize and configure supplier products.
- `admin-list`, `admin-payment`, `admin-approve`, `admin-cancel`: dashboard, receipt review, manual delivery, and order cancellation.

## DODI Store integration

The active supplier client is `commerce/supplier.mjs`.

- Base API endpoint: `https://api.mailreader.tech/api/reseller`.
- Authentication uses the server-only variable `DODI_RESELLER_API_KEY`.
- Client operations are products, balance, and order creation.
- Requests use bearer authentication, JSON responses, a 20-second timeout, and normalized error statuses.
- `syncSupplierCatalog()` in `commerce/handler.mjs` periodically fetches products, stores them in `commerce_supplier_products`, converts USDT wholesale prices to PKR using `SUPPLIER_USDT_PKR_RATE` or a fallback rate, and preserves manually configured costs.
- Admins set selling prices and enable products. The storefront exposes enabled supplier products through `action=stock`.
- Supplier orders are created during fulfilment with the local order ID as the external order ID. Supplier delivery data is encrypted before being stored.

The UI contains inconsistent naming: it uses “Dody Store” in an admin label, while code and the user-facing project context call the integration DODI. This should be normalized in a future change.

## Other provider integration

`commerce/qamify.mjs` targets the official Qamify reseller API at `https://api.qamify.site` and uses `QAMIFY_API_KEY`. It implements product listing, balance lookup, order creation with an idempotency key, defensive product normalization, delivery extraction, and provider-order ID extraction.

As of the 2026-09-07 working tree, Qamify is wired into the commerce handler as a second supplier provider. Its products use provider-scoped internal IDs (`qamify:<external-id>`), synchronize into the shared supplier table, can be priced/enabled in the admin dashboard, and fulfil paid orders using the local order ID as a stable Qamify idempotency key. DODI retains its existing IDs for backward compatibility.

The recovered original requirement is multi-provider selection: keep every provider offer, map equivalent offers explicitly with an admin-managed canonical key, expose only the cheapest enabled in-stock offer for each canonical product, reselect at checkout, and fall back to the next-cheapest mapped offer only after an explicit supplier `out_of_stock` response. Mapping is intentionally not inferred from similar names because duration and delivery type can differ. Manual canonical mappings survive subsequent provider syncs.

Qamify's observed catalog uses `unit_price`, `currency`, and `stock`; prices are USD. The adapter accepts those fields and validates numeric price and integer stock. Qamify order idempotency keys are derived from the local order ID and provider product ID so retries are stable without conflating fallback products.

Production activation is still pending: `QAMIFY_API_KEY` was not present in the Vercel production environment during verification. Without that variable, Qamify is skipped and the existing DODI flow remains active.

The previously supplied Qamify key appeared in chat history and must be rotated before funding or production use. Never copy that historical value into source, docs, logs, or Vercel.

### Freebies requirement

The recovered requirement asks for a highlighted public Freebies section using Qamify Surfshark inventory. Two distinct offers were observed and must not be merged: a two-month coupon that requires a valid payment card during redemption, and a two-month private account. Automatic claim versus WhatsApp/admin approval and the USD-to-PKR rate were not decided before context was lost. Do not implement automatic supplier-funded claims until abuse controls and the fulfilment mode are explicitly approved.

## Payment and authentication

### Customer payment flow

1. Customer creates an order.
2. Local inventory is reserved, or supplier stock is checked.
3. Customer receives a recovery token and NayaPay payment instructions.
4. Customer submits a transaction ID or the NayaPay email webhook records a receipt.
5. Receipt parsing can verify amount, sender, destination, source evidence, transaction ID, and date.
6. A uniquely matched verified payment can trigger delivery; otherwise the order remains for review.
7. Manual admin approval can deliver eligible orders.

Automatic NayaPay verification is controlled by configuration and is visibly designed to default to manual review until the receipt format and sender/receiver checks are trusted.

### Admin authentication

- Admin login compares a normalized email and hashed password against server environment values.
- Successful login returns an eight-hour HMAC-signed token.
- Admin actions require the bearer token or the signed admin token.
- Customer order actions use a recovery token hash; the raw token is not stored.
- There is no external authentication framework visible in the repository.

## Database/schema

`commerce/schema.sql` defines or migrates:

- `commerce_inventory`: encrypted local credentials and inventory state, including an audited `withdrawn` state for accounts picked directly by an admin.
- `commerce_orders`: reservations, payments, delivery status, supplier references, and financial values.
- `commerce_supplier_products`: synchronized supplier catalog, costs, selling prices, and enablement.
- `commerce_provider_state` and `commerce_freebie_claims`: provider-generalization/future-flow tables.
- `commerce_payments`: receipt metadata, verification state, and encrypted receipt body.
- `commerce_limits`: rate-limit windows.
- `commerce_audit`: operational audit events.

Credentials and supplier delivery are encrypted with AES-256-GCM using `COMMERCE_ENCRYPTION_KEY`. The schema uses PostgreSQL UUIDs, timestamps, checks, unique constraints, and a partial inventory-assignment index.

## Environment variables

Only names are recorded here; values must never be placed in this document:

- Database: `DATABASE_URL` and deployment-provided PostgreSQL aliases.
- DODI: `DODI_RESELLER_API_KEY`.
- Qamify: `QAMIFY_API_KEY`, optionally `QAMIFY_USD_PKR_RATE` or `SUPPLIER_USD_PKR_RATE` for automatic USD-to-PKR cost conversion.
- Commerce security: `COMMERCE_ENCRYPTION_KEY`, `COMMERCE_ADMIN_KEY`, `COMMERCE_ADMIN_EMAIL`, `COMMERCE_ADMIN_PASSWORD_HASH`.
- Payment/webhook: `PAYMENT_ACCOUNT_TITLE`, `NAYAPAY_WEBHOOK_SECRET`, `NAYAPAY_SIGNING_KEY`, `NAYAPAY_SENDER`, `NAYAPAY_RECEIVER_MARKER`, `NAYAPAY_RECEIVER_EMAIL`, `NAYAPAY_AUTO_VERIFY`.
- Supplier pricing: `SUPPLIER_USDT_PKR_RATE`.
- Build/runtime/tooling variables include `SASIFY_STATIC_EXPORT`, `NODE_ENV`, `CODEX_SANDBOX`, Wrangler/Miniflare settings, and deployment-provided Vercel/Postgres variables.

The repository also contains an ignored `.env.commerce.local`; only its variable names were inspected. Secret values were not copied here.

## Tests and current verification

The test suite consists of Node test files covering catalog rules, currency, SEO, reviews, UI source behavior, static export, motion, and commerce security/flow behavior.

The full Node suite covers catalog rules, currency, SEO, reviews, UI behavior, static export, commerce security, paid delivery, and direct admin inventory withdrawal. The 2026-09-08 verification produced 89 passing tests and 0 failures after the withdrawal flow was added.

Qamify has a mocked end-to-end test covering catalog sync, provider-scoped IDs, pricing/enablement, checkout creation, paid fulfilment, delivery storage, and the idempotency header. No real supplier order is placed by tests.

## Git history and recent work

Recent commits:

- `6c613ba` — Redeploy with static build settings.
- `4a356a5` — Trigger production deployment.
- `32fcec0` — Update Sasify catalog and mobile experience.
- `b1f7595` — Add static export and Sasify favicon branding.
- `9acf4c7` — Replace 3D card tilt with subtle stable hover feedback.

The current uncommitted changes modify visual behavior, product prices, telemetry mounting, package dependencies, tests, and add the commerce subsystem. The commerce addition is not represented in the committed Git history at the time of reconstruction.

## Current risks and incomplete work

- Qamify is implemented locally but not active in production until a rotated server-side key and optional conversion rate are configured and the working tree is deployed.
- Canonical provider mapping and cheapest-offer selection are implemented, but mappings still need to be assigned and reviewed by an admin.
- The highlighted Surfshark Freebies section and claim workflow remain pending the explicit fulfilment/safety decision.
- `app/products.ts` and `commerce/catalog.json` duplicate product catalog responsibility.
- The payment account number is hardcoded in the handler while the account title is configurable.
- Online purchase exposure is limited and not yet generalized across the catalog.
- Commerce files are untracked and should be reviewed before committing.
- Environment configuration and deployment packaging need production verification.
- Naming around DODI/Dody should be normalized.
- No repository README exists.

## Likely next steps

1. Decide whether Surfshark freebies require WhatsApp/admin approval or use a fully automatic, abuse-protected claim flow; confirm the USD-to-PKR rate.
2. Rotate the previously exposed Qamify key, then add only the replacement key securely to Vercel production.
3. Run the database migration, deploy to a staging/production-safe target, sync Qamify products, assign canonical mappings, and enable only reviewed offers.
4. Choose one catalog/provider abstraction and eliminate duplicate authority where practical.
5. Move all payment account identifiers into validated server configuration.
6. Review the uncommitted commerce diff and commit it separately from presentation changes.
7. Verify webhook delivery and one low-risk live Qamify fulfilment before broad product enablement.

## Evidence boundaries

Statements above marked as “prepared,” “intended,” “suggests,” or “likely” are inferences from unused modules/schema fields or incomplete wiring. No assumptions should be treated as confirmed behavior until backed by an active import, route, test, deployment configuration, or Git history.
