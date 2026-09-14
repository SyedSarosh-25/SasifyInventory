import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchGoogleReviews, normalizeGoogleReview } from '../commerce/google-reviews.mjs';

test('Google review normalization keeps only safe public display fields', () => {
  const review = normalizeGoogleReview({
    name: 'accounts/123/locations/456/reviews/abc',
    reviewer: { displayName: 'Google Buyer', profilePhotoUrl: 'https://example.test/photo' },
    starRating: 'FIVE',
    comment: 'One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twenty-one twenty-two twenty-three twenty-four twenty-five twenty-six',
    createTime: '2026-09-12T10:00:00Z',
    updateTime: '2026-09-13T10:00:00Z',
  }, 'https://example.test/google');
  assert.deepEqual(review, {
    id: 'accounts/123/locations/456/reviews/abc',
    name: 'Google Buyer',
    quote: 'One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twenty-one twenty-two twenty-three twenty-four twenty-five',
    language: 'en',
    rating: 5,
    excerpt: true,
    sourceUrl: 'https://example.test/google',
    profileUrl: 'https://example.test/google',
    photoUrl: 'https://example.test/photo',
    photoPath: '',
    reviewCreatedAt: '2026-09-12T10:00:00Z',
    reviewUpdatedAt: '2026-09-13T10:00:00Z',
  });
  assert.equal(normalizeGoogleReview({ name: 'missing-comment', starRating: 'FIVE' }), null);
});

test('Google review fetch refreshes OAuth and follows pagination', async () => {
  const names = [
    'GOOGLE_REVIEWS_CLIENT_ID',
    'GOOGLE_REVIEWS_CLIENT_SECRET',
    'GOOGLE_REVIEWS_REFRESH_TOKEN',
    'GOOGLE_REVIEWS_ACCOUNT_ID',
    'GOOGLE_REVIEWS_LOCATION_ID',
  ];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  Object.assign(process.env, {
    GOOGLE_REVIEWS_CLIENT_ID: 'client-id',
    GOOGLE_REVIEWS_CLIENT_SECRET: 'client-secret',
    GOOGLE_REVIEWS_REFRESH_TOKEN: 'refresh-token',
    GOOGLE_REVIEWS_ACCOUNT_ID: 'account',
    GOOGLE_REVIEWS_LOCATION_ID: 'location',
  });
  const calls = [];
  try {
    const result = await fetchGoogleReviews({
      fetchImpl: async (input, init) => {
        const requestUrl = typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
        calls.push({ input: requestUrl, init });
        if (requestUrl === 'https://oauth2.googleapis.com/token')
          return new Response(JSON.stringify({ access_token: 'access-token' }), { status: 200 });
        const url = new URL(requestUrl);
        return new Response(JSON.stringify(url.searchParams.has('pageToken')
          ? { reviews: [{ name: 'review-2', reviewer: { displayName: 'Second' }, starRating: 'FOUR', comment: 'Good service.' }] }
          : { reviews: [{ name: 'review-1', reviewer: { displayName: 'First' }, starRating: 'FIVE', comment: 'Excellent service.' }], nextPageToken: 'next-page' }), { status: 200 });
      },
    });
    assert.equal(result.totalReviewCount, 2);
    assert.equal(result.averageRating, 4.5);
    assert.equal(result.reviews.length, 2);
    assert.equal(calls.length, 3);
    assert.match(calls[1].init.headers.authorization, /^Bearer access-token$/);
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
});
