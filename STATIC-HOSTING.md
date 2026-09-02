# Static Website Build

Run `npm run build:static` to generate the upload-ready `out` folder. This exports the home page, full inventory, all 96 product pages, styles, JavaScript, brand images and six verified review profile images. No Node.js server or database is needed on the hosting account.

The normal `npm run dev` and `npm run build` commands remain unchanged for development and Sites hosting. A static build uses `dist` temporarily; run the normal build again before a server deployment.

## Hostinger Upload

1. Back up the existing contents of your website's `public_html` folder.
2. Upload and extract the supplied static ZIP directly inside `public_html`, or upload everything inside `out`, including `.htaccess`.
3. Confirm `public_html/index.html` exists. Do not place it inside an extra `out` or project folder. Keep `.htaccess`, `_next`, `inventory.html`, `products`, `reviews`, and the other generated files alongside it. The included Apache rules let links such as `/products/p013` open the matching HTML file.
4. Open the home page and a product link. If a stale page appears, clear the hosting cache and refresh.

Do not upload the source repository, `node_modules`, `dist/server`, or the ordinary server build in place of this export. Existing PHP entry points or conflicting hosting rules may need attention if the hosting account still serves its old site.

## Updating The Website

After changing products, prices, reviews or code, build again and replace the uploaded static files. Search, PKR/USD switching, random review selection and WhatsApp buttons run in the browser. Reviews are the existing verified saved reviews, not a live Google Maps feed. Product favicons still use an internet connection.

Static builds default their canonical/social URLs to `https://royalblue-meerkat-205788.hostingersite.com`. Set `NEXT_PUBLIC_SITE_ORIGIN` to your final domain before building to change this. Deploy at the domain root, not a subfolder.

PowerShell example for the custom domain:

```powershell
$env:NEXT_PUBLIC_SITE_ORIGIN = 'https://sasify.site'
npm run build:static
```
