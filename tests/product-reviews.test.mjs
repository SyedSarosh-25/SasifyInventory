import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  normalizeProductReviewSubmission,
  publicProductReview,
  seedProductReviews,
} from '../commerce/product-reviews.mjs';

const handlerSource = await readFile(
  new URL('../commerce/handler.mjs', import.meta.url),
  'utf8',
);
const schemaSource = await readFile(
  new URL('../commerce/schema.sql', import.meta.url),
  'utf8',
);
const productPageSource = await readFile(
  new URL('../app/products/[id]/page.tsx', import.meta.url),
  'utf8',
);
const checkoutSource = await readFile(
  new URL('../app/components/checkout.tsx', import.meta.url),
  'utf8',
);
const adminShellSource = await readFile(
  new URL('../app/components/admin-shell.tsx', import.meta.url),
  'utf8',
);

test('normalizeProductReviewSubmission validates required fields and bounds', () => {
  // Valid review with proof screenshot
  const valid = normalizeProductReviewSubmission({
    productId: 'p093',
    productName: 'ChatGPT Plus',
    customerName: 'Muhammad Hamza',
    rating: 5,
    reviewText: 'Excellent service, delivery arrived in 5 minutes.',
    screenshots: [
      {
        filename: 'proof.png',
        type: 'image/png',
        data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      },
    ],
  });
  assert.equal(valid.productId, 'p093');
  assert.equal(valid.customerName, 'Muhammad Hamza');
  assert.equal(valid.rating, 5);
  assert.equal(valid.screenshots.length, 1);

  // Missing productId
  assert.throws(
    () =>
      normalizeProductReviewSubmission({
        customerName: 'Hamza',
        rating: 5,
        reviewText: 'Good',
      }),
    /Product identifier is required/,
  );

  // Invalid rating
  assert.throws(
    () =>
      normalizeProductReviewSubmission({
        productId: 'p093',
        customerName: 'Hamza',
        rating: 6,
        reviewText: 'Good product',
      }),
    /Rating must be between 1 and 5 stars/,
  );

  // Too short review text
  assert.throws(
    () =>
      normalizeProductReviewSubmission({
        productId: 'p093',
        customerName: 'Hamza',
        rating: 5,
        reviewText: 'Hi',
      }),
    /share at least 5 characters/,
  );
});

test('normalizeProductReviewSubmission accepts gallery proof URLs and strips unsupported formats', () => {
  const result = normalizeProductReviewSubmission({
    productId: 'p012',
    customerName: 'Ali Raza',
    rating: 5,
    reviewText: 'Claude Team account activated smoothly.',
    screenshots: [
      '/deal-proofs/proof-01.webp',
      {
        filename: 'malicious.exe',
        type: 'application/x-msdownload',
        data: 'data:application/x-msdownload;base64,xyz',
      },
    ],
  });
  assert.equal(result.screenshots.length, 1);
  assert.equal(result.screenshots[0].url, '/deal-proofs/proof-01.webp');
});

test('publicProductReview shapes row and preserves verified status', () => {
  const row = {
    id: 'rev-1',
    product_id: 'p093-ultra',
    product_name: 'ChatGPT Plus Ultra',
    customer_name: 'Sarah K.',
    rating: 5,
    review_text: 'Top tier quality account!',
    screenshots: [{ url: '/deal-proofs/proof-05.webp' }],
    customer_email: 'secret@gmail.com',
    order_id: 'ord-secret-123',
    is_verified_buyer: true,
    status: 'approved',
    created_at: '2026-10-01T00:00:00.000Z',
  };
  const pub = publicProductReview(row);
  assert.equal(pub.id, 'rev-1');
  assert.equal(pub.customerName, 'Sarah K.');
  assert.equal(pub.isVerifiedBuyer, true);
  assert.equal(pub.screenshots.length, 1);
  // Email and order_id must not be exposed
  assert.equal(pub.customer_email, undefined);
  assert.equal(pub.order_id, undefined);
});

test('seedProductReviews contains curated proofs for core products', () => {
  assert(seedProductReviews.length >= 4);
  const chatgptSeed = seedProductReviews.find((r) => r.product_id === 'p093');
  assert(chatgptSeed);
  assert.equal(chatgptSeed.status, 'approved');
  assert(chatgptSeed.screenshots.length > 0);
});

test('schema includes commerce_product_reviews table and indices', () => {
  assert.match(schemaSource, /CREATE TABLE IF NOT EXISTS commerce_product_reviews/);
  assert.match(schemaSource, /product_id text NOT NULL/);
  assert.match(schemaSource, /screenshots jsonb NOT NULL DEFAULT '\[\]'::jsonb/);
  assert.match(schemaSource, /commerce_product_reviews_product/);
  assert.match(schemaSource, /commerce_product_reviews_status/);
});

test('handler includes product review public and admin endpoints', () => {
  // Public actions
  assert.match(handlerSource, /action === 'product-reviews'/);
  assert.match(handlerSource, /action === 'product-review-submit'/);

  // Admin actions
  assert.match(handlerSource, /action === 'admin-product-review-create'/);
  assert.match(handlerSource, /action === 'admin-product-review-update'/);
  assert.match(handlerSource, /action === 'admin-product-review-delete'/);

  // Admin list includes productReviews
  assert.match(handlerSource, /productReviews:\s*\(/);
  assert.match(handlerSource, /FROM commerce_product_reviews/);

  // Schema ensure
  assert.match(handlerSource, /ensureProductReviewSchema/);
});

test('product detail pages include ProductReviewsSection and jump links', () => {
  assert.match(productPageSource, /import \{ ProductReviewsSection \} from/);
  assert.match(productPageSource, /<ProductReviewsSection/);
  assert.match(productPageSource, /href="#customer-reviews">Reviews & proofs<\/a>/);
});

test('admin dashboard includes Product reviews tab and management component', () => {
  assert.match(adminShellSource, /\['productReviews',\s*'Product reviews',/);
  assert.match(checkoutSource, /import \{ AdminProductReviews \} from/);
  assert.match(checkoutSource, /tab === 'productReviews'/);
});
