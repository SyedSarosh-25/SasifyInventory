# Static Website and Production Deployment

Status date: 11 September 2026.

## Build

Run:

```powershell
npm run build:static
```

This generates the upload-ready `out` directory. It includes the homepage, inventory, About, buying guide, scam-report page, four policy pages, five product pages, sitemap, robots file, llms file, styles, scripts and local brand/review assets.

The static pages are the public storefront. Commerce API functions are packaged separately for Vercel and require the configured database and server-only environment variables.

## Vercel production

The repository's local Vercel link targets the production project used by `www.sasifysolutions.com`. Build and deploy the storefront and current commerce backend together:

```powershell
npm run deploy:prod
```

This command runs the static build, refreshes the packaged commerce function and executes a production Vercel deployment. Always use it instead of deploying a stale generated folder.

The generated `vercel.json` preserves extensionless canonical routes, redirects `.html` variants and assigns the RSC content type. It intentionally has no catch-all homepage rewrite, so unknown pages remain 404. Admin and checkout paths receive search-exclusion headers.

## Post-deployment checks

- Verify `/`, `/inventory`, `/scammers`, `/products/p093`, `/checkout`, `/robots.txt`, `/sitemap.xml` and `/llms.txt`.
- Confirm the apex domain redirects to `https://www.sasifysolutions.com`.
- Confirm the stock API responds and unauthenticated admin access returns 401.
- Confirm the admin login and inventory import flow using the production environment.
- Check Vercel deployment status, function logs, Analytics and Speed Insights.
- Never place `.env` files, database credentials, API keys or generated deployment metadata in Git or an upload archive.

## Optional Apache/Hostinger storefront upload

The `out` directory also includes `.htaccess` for an Apache static upload. Upload the contents of `out` directly into `public_html`, not the directory itself. This publishes only the static storefront; it does not move the Vercel commerce API or database. A complete working checkout/admin system therefore requires Vercel or an equivalent serverless backend deployment.

All builds default to `https://www.sasifysolutions.com`. Set `NEXT_PUBLIC_SITE_ORIGIN` only when intentionally producing a different canonical deployment.
