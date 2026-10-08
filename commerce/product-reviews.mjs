const imageTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

function text(value, max = 2000) {
  return String(value ?? '')
    .replace(/\p{Cc}/gu, '')
    .trim()
    .slice(0, max);
}

export function normalizeProductReviewSubmission(body) {
  const productId = text(body?.productId || body?.product_id, 100);
  const productName = text(body?.productName || body?.product_name, 200);
  const customerName = text(body?.customerName || body?.name || body?.customer_name, 100);
  const reviewText = text(body?.reviewText || body?.review_text || body?.comment, 2000);
  const rating = Number(body?.rating);
  const customerEmail = text(body?.customerEmail || body?.email || body?.customer_email, 200);
  const orderId = text(body?.orderId || body?.order_id, 100);

  if (!productId) {
    throw new Error('Product identifier is required.');
  }
  if (!customerName || customerName.length < 2) {
    throw new Error('Please enter your name (at least 2 characters).');
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5 stars.');
  }
  if (!reviewText || reviewText.length < 5) {
    throw new Error('Please share at least 5 characters about your experience.');
  }

  const screenshots = Array.isArray(body?.screenshots)
    ? body.screenshots
        .map((item) => {
          if (typeof item === 'string' && (item.startsWith('/deal-proofs/') || item.startsWith('/reviews/'))) {
            return {
              url: item,
              filename: 'proof-screenshot.webp',
              type: 'image/webp',
            };
          }
          const filename = text(item?.filename, 120) || 'review-proof';
          const type = text(item?.type, 40);
          const data = String(item?.data || item?.url || '');
          return { filename, type, data };
        })
        .filter((item) => {
          if (item.url) return true;
          return (
            imageTypes.has(item.type) &&
            /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(item.data) &&
            item.data.length <= 850000
          );
        })
        .slice(0, 3)
    : [];

  return {
    productId,
    productName: productName || productId,
    customerName,
    rating,
    reviewText,
    customerEmail: customerEmail && customerEmail.includes('@') ? customerEmail : null,
    orderId: orderId || null,
    screenshots,
  };
}

export function publicProductReview(row) {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    customerName: row.customer_name,
    rating: Number(row.rating),
    reviewText: row.review_text,
    screenshots: Array.isArray(row.screenshots) ? row.screenshots : [],
    isVerifiedBuyer: Boolean(row.is_verified_buyer),
    status: row.status,
    createdAt: row.created_at,
  };
}

export const seedProductReviews = [];

