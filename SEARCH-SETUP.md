# Sasify Search and GEO Setup

Status date: 11 September 2026.

## Current technical setup

- Canonical origin: `https://www.sasifysolutions.com`.
- The XML sitemap contains 14 canonical URLs: the homepage, inventory, About, buying guide, scam reports, four policy pages and five product pages.
- `robots.txt` allows public crawling and points to the sitemap.
- Checkout and admin application surfaces are excluded from indexing through hosting headers.
- Public pages render titles, descriptions, canonical links and Open Graph URLs in their HTML.
- The site renders Organization and WebSite structured data. Product pages render Product, Offer and BreadcrumbList data. ChatGPT Plus publishes two truthful Offer records: Apple Pay at PKR 3,499 and Momo Pay at PKR 2,999.
- The buying guide renders visible questions with matching FAQPage structured data.
- Google and Bing ownership-verification meta tags remain in the shared layout.
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

Those values describe the old 96-product catalog and are not proof that every current URL is indexed. The catalog now contains five product pages and the sitemap must be reprocessed. A public search check on 11 September 2026 did not return a reliable `site:sasifysolutions.com` result, so current coverage should be read directly from Search Console and Bing Webmaster Tools.

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
