# Permanent product URLs

Local product URLs remain explicitly saved in `app/products.ts`. Supplier URLs
are saved in `app/supplier-url-registry.generated.mjs`, committed with the catalog.
Never delete this registry or recompute its existing `slug` values.

`scripts/sync-supplier-seo-catalog.mjs` reuses the saved URL for a known canonical
key, checkout ID or unambiguous exact product name. Name changes with a known key,
price changes and stock changes do not alter the URL. A key change with an exact
known name records the new key against the same URL. New products receive a unique
readable URL once; collisions use a saved numeric suffix, never overwrite a plan.

If both identity and name change without any known mapping, review the identity
and add its new key to the correct registry entry before publishing. Do not fuzzy
match plans or different durations. Checkout continues to use the actual current
catalog key, not the URL slug.

The one-time/re-runnable `node scripts/migrate-supplier-urls.mjs` recovers historical
published URLs from Git snapshots. Both static hosting configuration and the
production Vercel packager use the same direct 308 redirect list. No supplier,
payment or database behavior is changed by this migration.

Missing offers keep their existing static detail pages with `archived: true`,
zero availability, OutOfStock structured data and no purchase action. They are
excluded from the shopping grid. If the same identity returns, its URL is reused.
Sitemaps, internal links and canonical tags all use the saved URL.

Verify with `node --test tests/permanent-supplier-urls.test.mjs tests/seo.test.mjs`,
`npx tsc --noEmit`, `npm run build:static`, then `node scripts/package-commerce.mjs`.
Before deployment check `.vercel/output/config.json` contains the supplier 308
routes and each target has an exported HTML file. After deployment verify old
URLs redirect in one hop and canonical pages return 200 with matching canonical
tags; sitemap URLs must not be redirect sources.
