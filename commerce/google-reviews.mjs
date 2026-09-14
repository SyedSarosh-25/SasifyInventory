const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVIEWS_API = 'https://mybusiness.googleapis.com/v4';
const GOOGLE_BUSINESS_SCOPE = 'https://www.googleapis.com/auth/business.manage';
const DEFAULT_REVIEWS_URL =
  'https://www.google.com/maps/place/Sasify+Digital+Solutions/@33.5298115,73.1663875,16z/data=!4m18!1m9!3m8!1s0x38dfed9bda8bf345:0xb57a60ba54b9be1e!2sSasify+Digital+Solutions!8m2!3d33.5298115!4d73.1663875!9m1!1b1!16s%2Fg%2F11yzclp9ps!3m7!1s0x38dfed9bda8bf345:0xb57a60ba54b9be1e!8m2!3d33.5298115!4d73.1663875!9m1!1b1!16s%2Fg%2F11yzclp9ps!18m1!1e1?entry=ttu';
const STAR_RATING = Object.freeze({
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
});

const text = (value, max = 2000) => String(value || '').trim().slice(0, max);

function requiredEnv(name) {
  const value = text(process.env[name]);
  if (!value) throw new Error(`Google reviews configuration is missing ${name}.`);
  return value;
}

function safeApiError(response, body) {
  const detail = text(body?.error?.message || body?.error_description, 240);
  return new Error(
    `Google Business Profile API request failed (${response.status})${detail ? `: ${detail}` : '.'}`,
  );
}

async function readJson(response) {
  const body = await response.text();
  try {
    return body ? JSON.parse(body) : {};
  } catch {
    return {};
  }
}

async function accessToken(fetchImpl) {
  const clientId = requiredEnv('GOOGLE_REVIEWS_CLIENT_ID');
  const clientSecret = requiredEnv('GOOGLE_REVIEWS_CLIENT_SECRET');
  const refreshToken = requiredEnv('GOOGLE_REVIEWS_REFRESH_TOKEN');
  const response = await fetchImpl(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const body = await readJson(response);
  if (!response.ok || !body.access_token) throw safeApiError(response, body);
  return body.access_token;
}

function reviewId(review) {
  const resource = text(review?.name, 500);
  return resource || text(review?.reviewId, 500);
}

function ratingValue(value) {
  if (Number.isSafeInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 5)
    return Number(value);
  return STAR_RATING[text(value).toUpperCase()] || 0;
}

function excerpt(value) {
  const words = text(value, 5000).replace(/\s+/g, ' ').split(' ').filter(Boolean);
  return words.slice(0, 25).join(' ');
}

export function googleReviewsConfig() {
  return {
    accountId: text(process.env.GOOGLE_REVIEWS_ACCOUNT_ID, 200),
    locationId: text(process.env.GOOGLE_REVIEWS_LOCATION_ID, 200),
    configured: Boolean(
      text(process.env.GOOGLE_REVIEWS_ACCOUNT_ID) &&
        text(process.env.GOOGLE_REVIEWS_LOCATION_ID) &&
        text(process.env.GOOGLE_REVIEWS_CLIENT_ID) &&
        text(process.env.GOOGLE_REVIEWS_CLIENT_SECRET) &&
        text(process.env.GOOGLE_REVIEWS_REFRESH_TOKEN),
    ),
  };
}

export function normalizeGoogleReview(review, reviewsUrl = DEFAULT_REVIEWS_URL) {
  const id = reviewId(review);
  const quote = excerpt(review?.comment);
  const rating = ratingValue(review?.starRating);
  if (!id || !quote || !rating) return null;
  const language = text(review?.languageCode, 20) === 'ur-Latn' ? 'ur-Latn' : 'en';
  return {
    id,
    name: text(review?.reviewer?.displayName, 160) || 'Google customer',
    quote,
    language,
    rating,
    excerpt: text(review?.comment, 5000).replace(/\s+/g, ' ').split(' ').filter(Boolean).length > 25,
    sourceUrl: reviewsUrl,
    profileUrl: reviewsUrl,
    photoUrl: text(review?.reviewer?.profilePhotoUrl, 1000),
    photoPath: '',
    reviewCreatedAt: text(review?.createTime, 80) || null,
    reviewUpdatedAt: text(review?.updateTime, 80) || null,
  };
}

export async function fetchGoogleReviews({ fetchImpl = fetch, reviewsUrl = DEFAULT_REVIEWS_URL } = {}) {
  const accountId = requiredEnv('GOOGLE_REVIEWS_ACCOUNT_ID');
  const locationId = requiredEnv('GOOGLE_REVIEWS_LOCATION_ID');
  const token = await accessToken(fetchImpl);
  const reviews = [];
  let pageToken = '';
  do {
    const url = new URL(
      `${GOOGLE_REVIEWS_API}/accounts/${encodeURIComponent(accountId)}/locations/${encodeURIComponent(locationId)}/reviews`,
    );
    url.searchParams.set('pageSize', '50');
    url.searchParams.set('orderBy', 'updateTime desc');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const response = await fetchImpl(url, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/json',
      },
    });
    const body = await readJson(response);
    if (!response.ok) throw safeApiError(response, body);
    reviews.push(...(Array.isArray(body.reviews) ? body.reviews : []));
    pageToken = text(body.nextPageToken, 2000);
  } while (pageToken);

  const normalized = reviews.map((review) => normalizeGoogleReview(review, reviewsUrl)).filter(Boolean);
  const averageRating = reviews.reduce((total, review) => total + ratingValue(review.starRating), 0) /
    Math.max(reviews.length, 1);
  return {
    reviews: normalized,
    totalReviewCount: reviews.length,
    averageRating: Number(averageRating.toFixed(2)),
    accountId,
    locationId,
  };
}

export { DEFAULT_REVIEWS_URL, GOOGLE_BUSINESS_SCOPE };
