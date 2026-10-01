# Sasify Search and GEO Setup

Status date: 16 September 2026.

## Production consolidation audit — 2 October 2026

The source of truth is GitHub `SyedSarosh-25/SasifyInventory`, branch `main`.
The only Git-connected production project is `sasify-solutions-updated-build`.
Its canonical storefront is `https://www.sasifysolutions.com`.
The unused `sasify-inventory` project was disconnected from Git, without deleting
any project, deployment, repository, or database.

Four stable Vercel storefront aliases now have permanent, path-preserving 308
redirects to the canonical domain through project-level routing:

- `sasify-solutions-updated-build.vercel.app`
- `sasify-solutions-latest-build.vercel.app`
- `sasify-solutions-static-hostinger.vercel.app`
- `deploy-51f438e.vercel.app`

These rules match explicit hosts and exclude `/api` and `/api/*`. Do not replace
them with whole-domain redirects that could move inbound payment webhooks.
The primary alias rule is also emitted by `scripts/package-commerce.mjs` for
future builds. Immutable preview/deployment URLs remain available for testing;
the sampled deployment URLs require Vercel login and return `X-Robots-Tag: noindex`.

Google Search Console, read from the owner's verified URL-prefix property:

- Selected performance period: 3 months; displayed chart September 2–28, 2026.
- Overall: 81 clicks, 513 impressions, CTR 15.8%, average position 6.2.
- Exact query `sasify solutions`: 7 clicks and 20 impressions.
- Sitemap: Success; last read October 1, 2026; 371 discovered pages.
- The live sitemap at audit time contains 381 unique, canonical public URLs.
- Page indexing report is dated September 21, 2026: 23 indexed, 130 discovered
  but not indexed, and 2 crawled but not indexed. This older report is not an
  up-to-date count of the current 381-page catalog.
- Homepage inspection: indexed; last crawl September 30; smartphone Googlebot;
  crawl and indexing allowed; fetch successful. Google selected the inspected
  canonical homepage. Its URL-level sitemap section shows a temporary processing
  error, while the separate sitemap report shows Success.

These observations do not establish duplicate deployments as the cause of low
rankings. The homepage is already indexed and receives branded searches.
Do not resubmit a successful sitemap repeatedly or promise indexing/ranking.
Next inspect representative product exclusions and strengthen distinct product
content and links based on Search Console evidence.

To prevent another source/deployment mismatch: pull the latest `main` on either
PC, commit and push reviewed changes, and let this one Vercel project deploy that
commit. Do not publish uncommitted CLI snapshots as the production source of
truth. Do not deploy from an older checkout or stale `out` folder.

## Current technical setup

- Canonical origin: `https://www.sasifysolutions.com`.
- The XML sitemap contains the current canonical public pages, including the full indexable product catalog.
- `robots.txt` allows public crawling and points to the sitemap.
- Checkout and admin application surfaces are excluded from indexing through hosting headers.
- Public pages render titles, descriptions, canonical links and Open Graph URLs in their HTML.
- The site renders Organization and WebSite structured data. Product pages render Product, Offer and BreadcrumbList data. ChatGPT Plus publishes one truthful Offer record: Apple Pay at PKR 3,499.
- The buying guide renders visible questions with matching FAQPage structured data.
- Google and Bing ownership-verification meta tags remain in the shared layout.
- Vercel Analytics and Speed Insights are enabled on public pages. GA4 support is wired through `NEXT_PUBLIC_GA_MEASUREMENT_ID` and activates when a valid `G-...` measurement ID is present at build time.
- `llms.txt` gives nonstandard, optional discovery guidance to compatible AI systems. Google does not require this file for search or AI features.

Prices, stock and warranty language must stay synchronized with the visible page. Do not invent ratings, availability, return promises, business addresses or provider affiliations in structured data.

## Ownership and known indexing history

The `https://www.sasifysolutions.com/` URL-prefix property was verified in Google Search Console, and the site was also verified in Bing Webmaster Tools, under the owner's `sasifysolutions2@gmail.com` account. Verification uses public HTML meta tags and does not require DNS changes.

Historical dashboard checks on 3 September 2026 showed:

- Google had processed the then-current sitemap and reported 99 discovered pages.
- Google URL Inspection reported the homepage as indexed.
- A homepage refresh request was accepted into Google's crawl queue.
- Bing accepted the sitemap and initially showed it as processing.
- Google's Search generative AI control was set to Include through the parent property.

Those values describe older catalog snapshots and are not proof that every current URL is indexed. Current coverage should be read directly from Search Console and Bing Webmaster Tools.

Dashboard checks on 16 September 2026 showed:

- Google Search Console URL-prefix property `https://www.sasifysolutions.com/` was accessible.
- Google Search Console showed 20 web search clicks, 179 impressions, average CTR 11.2% and average position 5.9 for the last 3 months.
- Google Search Console sitemap submission for `/sitemap.xml` was accepted successfully.
- Google Search Console had previously discovered only the old 14-page sitemap, so the expanded sitemap must be allowed time to reprocess.
- Bing Webmaster Tools was accessible and showed 3 clicks and 34 impressions.
- Bing Webmaster Tools sitemap submission for `https://www.sasifysolutions.com/sitemap.xml` was accepted and marked as processing.
- IndexNow accepted 202 submitted sitemap URLs through Bing and the IndexNow endpoint.

## Deployment and verification

Deploy the exact current source with:

```powershell
npm run deploy:prod
```

After deployment, confirm successful responses for:

- `/`
- `/inventory`
- `/buying-guide`
- `/scammers`
- `/products/p093`
- `/robots.txt`
- `/sitemap.xml`
- `/llms.txt`

Then inspect Google Search Console and Bing Webmaster Tools. Resubmit `https://www.sasifysolutions.com/sitemap.xml` when the dashboard still reflects the old catalog, and use URL Inspection for the homepage and representative public pages. Submission and indexing requests do not guarantee indexing or ranking.

## GA4 setup

To enable Google Analytics 4 page-view tracking, set this environment variable before building:

```powershell
$env:NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-XXXXXXXXXX"
```

For Vercel production deployments, store the same value in the production environment and rebuild the static output. The current static build does not send GA4 hits unless the measurement ID is present during the build.

## Ongoing search quality

### Focused SEO improvements — 2 October 2026

- Homepage title: `AI Tools & Digital Subscriptions in Pakistan | Sasify Solutions`.
- `/tools/chatgpt`, `/tools/cursor` and `/tools/gemini` include server-rendered
  comparisons, activation guidance and buyer questions. Prices come from the
  existing catalogue; warranty/access wording remains listing-specific.
- `/products/p016` permanently redirects to the equivalent Gemini AI Pro
  18-month listing. The shared historical redirect mapping is checked against
  the current catalogue in both static and commerce packaging; missing or
  mismatched destinations fail the build rather than silently changing plans.
- Exact internal test fixtures are excluded from public catalogue discovery and
  the sitemap. Previously published fixture detail pages remain crawlable with
  `noindex, nofollow`; real archived products are not blanket-deindexed.
- The public catalogue cache version changed so old browser caches cannot
  restore a fixture listing. No provider records or payment settings changed.
- Search Console will reflect these changes only after Google recrawls/processes
  them; deployment does not guarantee indexing, ranking or a specific deadline.

- Keep each public product page accurate, useful and distinct.
- Add original buyer guidance and support content based on real customer questions.
- Monitor indexed/not-indexed reasons, search queries, impressions, clicks and Core Web Vitals in the official dashboards.
- Test representative pages with Google Rich Results Test and PageSpeed Insights.
- Keep the sitemap limited to canonical public pages; do not add checkout, admin, search-query or duplicate `.html` URLs.
- Maintain consistent verified business details across the site and business profiles.

Search visibility and AI-answer inclusion cannot be guaranteed. GEO depends on the same fundamentals as search: crawlable pages, clear entities, useful original content, reliable citations and consistent factual information.

## Official references

- https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- https://developers.google.com/search/docs/appearance/structured-data/product-snippet
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://support.google.com/webmasters/answer/9008080
