# Sasify Search and GEO Setup

Status date: 16 September 2026.

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
