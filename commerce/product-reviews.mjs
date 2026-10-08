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

export const seedProductReviews = [
  {
    id: 'seed-chatgpt-01',
    product_id: 'p093',
    product_name: 'ChatGPT Plus',
    customer_name: 'Abdulrehman Jamil',
    rating: 5,
    review_text: 'Honest aur Trusted banda hai sarosh. Maine unse Chatgpt plus liya plus Gemini pro 18 month liya, instant delivery aur full month smooth chala without any issue.',
    screenshots: [
      {
        url: '/deal-proofs/proof-01.webp',
        filename: 'whatsapp-chatgpt-delivery-01.webp',
        type: 'image/webp',
      },
    ],
    is_verified_buyer: true,
    status: 'approved',
    created_at: '2026-09-24T12:00:00.000Z',
  },
  {
    id: 'seed-chatgpt-02',
    product_id: 'p093-shared',
    product_name: 'ChatGPT Plus · Shared Account',
    customer_name: 'ZaYn Ali',
    rating: 5,
    review_text: 'Meri in k sath deal rahi hai aur honestly experience bohat acha raha. Banda bohat professional, cooperative aur committed hai. Shared slot 2FA instantly mila.',
    screenshots: [
      {
        url: '/deal-proofs/proof-02.webp',
        filename: 'whatsapp-chatgpt-delivery-02.webp',
        type: 'image/webp',
      },
    ],
    is_verified_buyer: true,
    status: 'approved',
    created_at: '2026-09-28T14:30:00.000Z',
  },
  {
    id: 'seed-chatgpt-03',
    product_id: 'p093-ultra',
    product_name: 'ChatGPT Plus · Ultra Stable Account · Apple Pay',
    customer_name: 'Muhammad Bilal',
    rating: 5,
    review_text: 'Best price in Pakistan for ChatGPT Plus Ultra Stable. Instant payment verification on NayaPay and account details delivered in seconds.',
    screenshots: [
      {
        url: '/deal-proofs/proof-05.webp',
        filename: 'whatsapp-chatgpt-ultra.webp',
        type: 'image/webp',
      },
    ],
    is_verified_buyer: true,
    status: 'approved',
    created_at: '2026-10-02T10:15:00.000Z',
  },
  {
    id: 'seed-claude-01',
    product_id: 'p012',
    product_name: 'Claude Team Plan Premium',
    customer_name: 'Hammad Tariq',
    rating: 5,
    review_text: 'Claude Team invitation email receive hua within 15 minutes. Opus 3.5 aur Sonnet flawlessly chal rahe hain coding ke liye. Highly recommended!',
    screenshots: [
      {
        url: '/deal-proofs/proof-03.webp',
        filename: 'whatsapp-claude-delivery-01.webp',
        type: 'image/webp',
      },
    ],
    is_verified_buyer: true,
    status: 'approved',
    created_at: '2026-10-04T16:20:00.000Z',
  },
  {
    id: 'seed-claude-02',
    product_id: 'p013',
    product_name: 'Claude Team Plan Standard',
    customer_name: 'Saad Rafique',
    rating: 5,
    review_text: 'Affordable Claude Team seat in Pakistan. Activation was completed quickly and workspace is super stable. Excellent after-sale support on WhatsApp.',
    screenshots: [
      {
        url: '/deal-proofs/proof-04.webp',
        filename: 'whatsapp-claude-delivery-02.webp',
        type: 'image/webp',
      },
    ],
    is_verified_buyer: true,
    status: 'approved',
    created_at: '2026-10-05T11:45:00.000Z',
  },
  {
    id: 'seed-canva-01',
    product_id: 'canva-pro-1-year',
    product_name: 'Canva Pro 1 Year',
    customer_name: 'Ayesha Khan',
    rating: 5,
    review_text: 'Canva Pro brand kit and premium templates unlocked on my existing email. Very happy with Sasify Solutions service!',
    screenshots: [
      {
        url: '/deal-proofs/proof-06.webp',
        filename: 'whatsapp-canva-proof.webp',
        type: 'image/webp',
      },
    ],
    is_verified_buyer: true,
    status: 'approved',
    created_at: '2026-09-30T09:00:00.000Z',
  },
  {
    id: 'seed-capcut-01',
    product_id: 'capcut-pro-1-year',
    product_name: 'CapCut Pro 1 Year',
    customer_name: 'Farhan Siddiqui',
    rating: 5,
    review_text: 'CapCut Pro video editor without watermarks and premium transitions. Working smoothly on Windows & mobile. Trusted vendor.',
    screenshots: [
      {
        url: '/deal-proofs/proof-07.webp',
        filename: 'whatsapp-capcut-proof.webp',
        type: 'image/webp',
      },
    ],
    is_verified_buyer: true,
    status: 'approved',
    created_at: '2026-10-03T18:10:00.000Z',
  },
];
