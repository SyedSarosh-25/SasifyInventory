import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { pickReviews } from '../app/review-utils.ts';
import { reviews as customerReviews, reviewsVerifiedAt } from '../app/reviews.ts';

test('six sourced reviews include three original Roman Urdu excerpts', () => {
  assert.equal(customerReviews.length, 6);
  assert.equal(customerReviews.filter((review) => review.language === 'ur-Latn').length, 3);
  assert.equal(new Set(customerReviews.map((review) => review.sourceUrl)).size, 6);
  assert.equal(reviewsVerifiedAt, '2026-09-02');
  for (const review of customerReviews) {
    assert.equal(new URL(review.sourceUrl).hostname, 'maps.app.goo.gl');
    assert.match(review.profileUrl, /^https:\/\/www.google.com\/maps\/contrib\/\d+\/reviews/);
    assert.equal(new URL(review.photoUrl).hostname, 'lh3.googleusercontent.com');
    assert.ok(review.quote.trim().split(/\s+/).length <= 25);
    assert.ok(review.rating >= 1 && review.rating <= 5);
  }
});

const reviews = Object.freeze(Array.from({ length: 6 }, (_, id) => Object.freeze({ id, name: `Reviewer ${id}`, quote: `Review ${id}` })));

test('each Google profile has its own bundled high-resolution profile picture', () => {
  assert.equal(new Set(customerReviews.map((review) => review.photoPath)).size, 6);
  for (const review of customerReviews) {
    const profileId = new URL(review.profileUrl).pathname.split('/')[3];
    assert.equal(review.photoPath, `/reviews/google-${profileId}.png`);
    const image = readFileSync(new URL(`../public${review.photoPath}`, import.meta.url));
    assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(image.readUInt32BE(16), 128);
    assert.equal(image.readUInt32BE(20), 128);
  }
});

test('each selection contains six unique reviews from the saved pool', () => {
  const selected = pickReviews(reviews);
  assert.equal(selected.length, 6);
  assert.equal(new Set(selected).size, 6);
  selected.forEach((review) => assert.ok(reviews.includes(review)));
});

test('random input changes the selection without modifying names, text or source order', () => {
  const before = JSON.stringify(reviews);
  assert.notDeepEqual(pickReviews(reviews, 6, () => 0), pickReviews(reviews, 6, () => 0.99));
  assert.equal(JSON.stringify(reviews), before);
});

test('every saved review can be selected', () => {
  const selectedIds = new Set();
  for (let index = 0; index < 100; index++) {
    for (const review of pickReviews(reviews, 3, () => index / 100)) selectedIds.add(review.id);
  }
  assert.equal(selectedIds.size, reviews.length);
});

test('empty or small review pools work without repeating cards', () => {
  assert.deepEqual(pickReviews([]), []);
  assert.deepEqual(pickReviews(reviews.slice(0, 1)), [reviews[0]]);
  assert.equal(pickReviews(reviews, 99).length, 6);
  assert.deepEqual(pickReviews(reviews, 0), []);
});
