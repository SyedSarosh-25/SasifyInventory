# Static Website Build

Run `npm run build:static` to generate the upload-ready `out` folder. This exports the home page, full inventory, About page, buying guide, Warranty, Refunds, Privacy and Terms pages, all 96 product pages, sitemap.xml, robots.txt, styles, JavaScript, brand images and six verified review profile images. No Node.js server or database is needed on the hosting account.

The normal `npm run dev` and `npm run build` commands remain unchanged for development and Sites hosting. A static build uses `dist` temporarily; run the normal build again before a server deployment.

## Vercel Analytics

The shared layout includes Vercel Web Analytics for the home page, inventory and product pages, including static exports. Enable Web Analytics in the existing Vercel project's Analytics tab, then redeploy the updated build to that same project. Visit the deployed website and check the Analytics dashboard for incoming page views. Local development uses the SDK's development mode rather than recording production visits. No API key is required in the website.

Analytics collection requires Vercel hosting with Web Analytics enabled; uploading these files to Hostinger does not provide Vercel's analytics endpoints. Existing ZIP files are snapshots and must be rebuilt to include this integration.

## Vercel Speed Insights

The shared layout also includes `@vercel/speed-insights` through a small React client component compatible with Vinext. It mounts once on every canonical page and groups product URLs under `/products/[id]`. Speed Insights records real-user performance; it does not automatically make the website faster and needs genuine visits before charts appear.

The production project's free Speed Insights tier is active. The live `/_vercel/speed-insights/script.js` endpoint returned 200 after the September 3 deployment. No paid Speed Insights upgrade was purchased. Like Web Analytics, this Vercel endpoint is not available from a plain Hostinger upload.

## Vercel Upload

For Vercel, the export includes `vercel.json` to preserve extensionless product URLs, redirect `.html` addresses, and serve RSC payloads with the correct content type. Upload the contents of `out` to the existing `sasify-solutions-updated-build` project. There is no catch-all homepage rewrite, so nonexistent URLs remain 404.

Vercel CLI linking can add `.vercel`, `.gitignore` and `.env.local` to the selected folder. These are not website assets: exclude them from any ZIP, and never upload environment files. Inspect deployment inputs with `vercel deploy --dry` before publishing.

## Hostinger Upload

1. Back up the existing contents of your website's `public_html` folder.
2. Upload and extract the supplied static ZIP directly inside `public_html`, or upload everything inside `out`, including `.htaccess`.
3. Confirm `public_html/index.html` exists. Do not place it inside an extra `out` or project folder. Keep `.htaccess`, `_next`, `inventory.html`, `products`, `reviews`, and the other generated files alongside it. The included Apache rules let links such as `/products/p013` open the matching HTML file.
4. Open the home page and a product link. If a stale page appears, clear the hosting cache and refresh.

Do not upload the source repository, `node_modules`, `dist/server`, or the ordinary server build in place of this export. Existing PHP entry points or conflicting hosting rules may need attention if the hosting account still serves its old site.

## Updating The Website

After changing products, prices, reviews or code, build again and replace the uploaded static files. Search, PKR/USD switching, random review selection and WhatsApp buttons run in the browser. Reviews are the existing verified saved reviews, not a live Google Maps feed. Product favicons still use an internet connection.

All builds default their canonical/social URLs and sitemap entries to `https://www.sasifysolutions.com`. Set `NEXT_PUBLIC_SITE_ORIGIN` before building only when deploying to a different intended primary domain. Deploy at the domain root, not a subfolder.

PowerShell example for the custom domain:

```powershell
$env:NEXT_PUBLIC_SITE_ORIGIN = 'https://www.sasifysolutions.com'
npm run build:static
```
