# Sasify Solutions Project Context

Authoritative status date: 11 September 2026.

## Locations and source control

- Local repository: `C:\Users\Smart TechOne\Documents\Codex\2026-09-02\spreadsheets-plugin-spreadsheets-openai-primary-runtime-2\client-catalog-site`
- Production website: `https://www.sasifysolutions.com`
- Public repository: `https://github.com/SyedSarosh-25/SasifyInventory`
- Production branch: `main`
- Git remote `github` is the public GitHub repository; `origin` is the Codex workspace mirror.

## Storefront

Warranty policy updated 14 September 2026: every non-ChatGPT plan is covered by
Sasify Solutions for its entire purchased duration. ChatGPT retains its existing
account-specific terms (Ultra Stable Apple Pay: 25 days). Customer-facing product
copy removes supplier NW / non-warranty labels and replaces shorter warranty
claims through `commerce/product-display.mjs`. Raw supplier records, canonical
IDs, costs and fulfilment mappings are preserved; the projection also applies
to existing catalog rows on reads, so syncs cannot reintroduce obsolete copy.

The public catalog currently contains five canonical products:

- `p093`: ChatGPT Plus, with `p093-ultra` Apple Pay inventory at PKR 3,499.
- `p012`: Claude Team Plan Premium.
- `p013`: Claude Team Plan Standard.
- `p100`: Hostinger Unlimited Web Hosting.
- `p101`: Hostinger VPS Hosting, with contact-based package selection.

The ChatGPT product page keeps one Ultra/Apple Pay offer and one main purchase panel. Existing legacy `p093` inventory is treated as the Ultra/Apple Pay tier.

Public routes include the homepage, inventory, product details, About, buying guide, warranty, refunds, privacy, terms and scam reports. Shared navigation exposes the scam-report page. The scam-report API and admin tab use the database table created by the schema bootstrap.

## Commerce and admin

- Customers create orders, receive NayaPay instructions, submit a transaction reference and receive inventory only after payment verification/approval.
- Local credentials are reserved transactionally and encrypted at rest with AES-256-GCM.
- The admin panel supports secure login, session restoration, Apple Pay inventory imports, stock withdrawal, orders, payments, supplier products, financial summaries, supplier alerts and scam reports. Its live dashboard polls for new orders and supplier issues.
- Admin authentication uses a normalized email, password hash, signed eight-hour token and host-only Secure/HttpOnly/SameSite=Strict cookie.
- The commerce handler bootstraps required schema changes before serving actions, including the scam-report table.
- DODI and Qamify supplier adapters are implemented. Qamify remains inactive unless a valid rotated `QAMIFY_API_KEY` is configured in production.
- Automatic NayaPay verification remains configuration-controlled. Manual review is the safe fallback when receipt evidence is incomplete or ambiguous.

## Data and security

`commerce/schema.sql` defines inventory, orders, supplier products/provider state, payments, rate limits, audit events, freebie claims and scam reports. PostgreSQL credentials and provider/payment secrets belong only in local ignored files or Vercel environment configuration.

Do not commit secret values. The expected variable names are documented in `README.md`. A Qamify key previously pasted into conversation history must be rotated before production use.

## Search, SEO and GEO

- The current sitemap contains 14 canonical public URLs and includes `/scammers`.
- `robots.txt` allows crawling and advertises the sitemap.
- Checkout and admin pages are excluded from indexing at the hosting layer.
- Public pages render canonical/social metadata and Organization, WebSite, Product/Offer, BreadcrumbList and FAQPage structured data where relevant.
- ChatGPT Plus structured data contains both current account variants and prices.
- Google and Bing verification tags are part of the shared layout.
- `public/llms.txt` provides optional AI-system discovery guidance; it is not a search-ranking guarantee or Google requirement.

Historical Search Console data from 3 September applied to an older 96-product sitemap. Current indexing must be rechecked after deployment. See `SEARCH-SETUP.md`.

## Build, test and deployment

- Install: `npm ci`
- Development: `npm run dev`
- Lint: `npm run lint`
- Full clean-build test: `npm test`
- Static build: `npm run build:static`
- Production: `npm run deploy:prod`

The production command always regenerates the public export and commerce function before deploying. CI repeats lint, the full Node test suite and the static build on pushes and pull requests.

## Known boundaries

- Supplier-funded freebies are not enabled; fulfilment and abuse controls need an explicit product decision first.
- Qamify requires a rotated production key and reviewed provider mappings before activation.
- Public search indexing and rankings are controlled by search engines and cannot be guaranteed by deployment alone.
- Product data exists in both the storefront catalog and commerce catalog; changes must keep them synchronized.
- Live payment and supplier purchases should be verified with a low-risk controlled transaction whenever production credentials or provider behavior changes.
