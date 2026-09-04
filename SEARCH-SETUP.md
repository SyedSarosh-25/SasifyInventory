# Sasify Search Setup

## Included In The Website

- Canonical and social URLs use https://www.sasifysolutions.com by default.
- sitemap.xml lists the home page, inventory, About page, buying guide, four policy pages and all 96 product pages. It contains 104 canonical URLs and omits search queries, duplicate .html addresses and invented modification dates.
- robots.txt allows crawling and points to the sitemap. Hosting-level access controls must also allow crawlers.
- Product titles and descriptions identify the plan, duration and Pakistan pricing. Existing product URLs are preserved.
- Server-rendered Organization, WebSite, Product/Offer and BreadcrumbList data describes the visible content. Product offers use the actual package total in PKR. No ratings, stock claims, shipping terms, provider affiliations or return promises have been invented.
- Visible product questions explain pricing, payment and warranty. The About page identifies the founder and contact channels. These support reader understanding; they do not guarantee inclusion in AI answers.
- The buying guide compares eight popular listings using the same inventory records as the product pages. Its seven visible answers explain prices, access types, one-time yearly payments, savings and warranty limits. Matching FAQ structured data and internal links make the material easier to discover without hiding AI-only text.
- Dedicated Warranty, Refunds, Privacy and Terms pages state the confirmed ordering terms without inventing guarantees. Product pages identify shared, single-person, team, invite-based and credit access, and link to the policy pages.
- Unused monospace font loading was removed. Logo dimensions and lazy loading reserve space and avoid unnecessary early image requests.

## Deploy To The Existing Vercel Project

Redeploy this updated source or the freshly generated static output to the same Vercel project. Older ZIP files do not include these changes. For source deployments, use the static build command `npm run build:static` and output directory `out`, not the Cloudflare Worker output from the normal build. Keep the production domain pointing to that project.

Check that `/`, `/inventory`, `/about`, `/buying-guide`, `/products/p093`, `/robots.txt` and `/sitemap.xml` return successfully. Preserve the existing redirect from the apex domain to www. Where .html URLs are exposed, enable Vercel `cleanUrls` and confirm they redirect to the matching extensionless address. Do not add a catch-all rewrite that serves the homepage for missing pages; unknown product URLs must return 404.

## Search Ownership Setup

The `https://www.sasifysolutions.com/` URL-prefix property is registered in Google Search Console, and the same site is registered in Bing Webmaster Tools. Both are under the owner's `sasifysolutions2@gmail.com` account. The real Google and Bing verification meta tags from those dashboards are included in `app/layout.tsx` and the exported homepage head. These public tags must remain after verification.

This setup uses HTML meta tags, not DNS changes. Existing Hostinger email records and the separate `sasify.site` property are unchanged. The production domain belongs to Vercel project `sasify-solutions-updated-build` in `syed-adeen-saroshs-projects`; it is not the Git-linked `sasify-inventory` project.

The policy, access-clarity and GEO update was published on September 3, 2026 to the existing Vercel project. Production deployment: `dpl_4bc7peaWwxdV4cCigz2Ao2qBuBE1`, aliased to `https://www.sasifysolutions.com`. Both verification tags are present in the live homepage head. The live XML sitemap contains 104 URLs, product routes return 200, `.html` addresses redirect with 308, and an unknown product returns 404. The Vercel Analytics and Speed Insights script endpoints both return 200.

An HTTP check of every URL in the live sitemap passed: all 104 pages return 200 with canonical metadata, crawl permission and structured data, and all 96 product pages include PKR offers, access labels and WhatsApp ordering. The buying guide has visible answers, matching FAQ structured data and inventory-linked prices.

Ownership verification and sitemap submission completed on September 3, 2026 after the owner confirmed the account:

- Google Search Console: ownership verified with the HTML tag. `https://www.sasifysolutions.com/sitemap.xml` was submitted and processed successfully, with 99 discovered pages and zero discovered videos. The initial transient "Couldn't fetch" state resolved to successful processing without resubmission.
- Bing Webmaster Tools: the site is verified under the same account. The sitemap was submitted successfully and is currently marked "Processing", with zero reported errors or warnings. Discovery and indexing are not yet confirmed by Bing.
- Google URL Inspection reports the homepage as "URL is on Google" and "Page is indexed". A refresh request for the updated homepage completed with "Indexing requested" and was added to Google's priority crawl queue. This is not a guarantee that every product is indexed or that rankings will improve.
- Google Search Console's Search generative AI control reports `Current control: Include`, inherited from the `sasifysolutions.com` parent property. This permits links and content to be considered for AI Overviews and AI Mode; it does not guarantee selection or ranking.

Keep both verification meta tags in future deployments. Existing DNS and email configuration were not changed.

After submission, use URL Inspection on the homepage, inventory and representative products. Request indexing when appropriate; repeated requests do not guarantee faster indexing. Check indexing exclusions and actual queries, impressions and clicks in the search dashboards. Vercel Analytics measures visits, not Search Console indexing status.

## Post-Deployment Checks

- Run Google's Rich Results Test on representative product URLs and check parsing errors. Optional-field warnings should not be resolved by inventing information.
- Run PageSpeed Insights for the homepage, inventory and a product page on mobile and desktop. Inspect measured LCP, INP and CLS; asset checks alone are not a Core Web Vitals score.
- Keep public product descriptions, prices and warranty terms accurate. Rebuild the sitemap when inventory changes.
- Maintain consistent real business details in Google Business Profile. Physical address and opening hours are intentionally absent until verified.
- Keep reviews in the reviewers' original wording and link to their source. Business reviews must not become product aggregate ratings.
- Search and AI answer visibility are not guaranteed. Google AI features use the same crawlability, indexing and helpful-content foundations; no special AI markup or llms.txt is required.

## Local Verification

The static build, TypeScript check and 65 automated tests passed. All 104 canonical pages have server-rendered business data; all 96 products have matching PKR offers, access labels and visible plan answers. The static sitemap parses as XML and matches the configured URLs. Local robots.txt and sitemap.xml responses have the expected content types. The existing live apex and .html redirects return 308, and a nonexistent product returns 404.

The SEO modules pass lint. A broader UI lint run still reports the project's native anchors/images against Next-specific rules and the existing review-randomization effect; these are not a passing full-repository lint result. Native navigation was preserved for the static deployment workflow. No browser viewport audit, real-user Core Web Vitals score, live Rich Results Test or Search Console submission is claimed by the local checks. The production deployment and HTTP checks are recorded separately above.

## References

- https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- https://support.google.com/webmasters/answer/16908024
- https://developers.google.com/search/docs/appearance/structured-data/product-snippet
- https://developers.google.com/search/docs/appearance/structured-data/organization
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://support.google.com/webmasters/answer/9008080
