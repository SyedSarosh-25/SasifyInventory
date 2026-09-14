# Automatic Google review sync

The homepage keeps the saved review excerpts as a safe static fallback and requests the latest normalized reviews from `/api/commerce?action=google-reviews` in the browser. A protected Vercel cron calls `/api/google-reviews-sync` daily at 00:00 UTC and stores the result in PostgreSQL. The endpoint can also be run manually by an authenticated admin.

## One-time Google setup

1. In Google Cloud, enable the Business Profile API for a project.
2. Create an OAuth client and authorize a Business Profile manager account with the `https://www.googleapis.com/auth/business.manage` scope.
3. Keep the resulting refresh token server-side. Never place it in the repository or frontend.
4. Set these production environment variables in Vercel:

   - `GOOGLE_REVIEWS_CLIENT_ID`
   - `GOOGLE_REVIEWS_CLIENT_SECRET`
   - `GOOGLE_REVIEWS_REFRESH_TOKEN`
   - `GOOGLE_REVIEWS_ACCOUNT_ID`
   - `GOOGLE_REVIEWS_LOCATION_ID`
   - `CRON_SECRET`

   `GOOGLE_REVIEWS_URL` is optional and overrides the public Google Maps link used by each excerpt.

The account and location must be accessible to the authorized Business Profile manager and the location must be verified. After the next deployment, the cron will sync all available pages of reviews (up to 50 per API page), while the homepage displays the six most recently updated excerpts.

## Verification

- `GET /api/commerce?action=google-reviews` returns only normalized public review fields.
- `GET /api/google-reviews-sync` requires `Authorization: Bearer <CRON_SECRET>` or an authenticated admin session.
- The sync writes no OAuth credentials or raw API responses to the database.

Reference: [Google Business Profile review data](https://developers.google.com/my-business/content/review-data), [reviews.list](https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/list), and [OAuth for Business Profile](https://developers.google.com/my-business/content/implement-oauth).
