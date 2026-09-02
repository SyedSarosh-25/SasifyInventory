import assert from 'node:assert/strict';
import test from 'node:test';
import { pickReviews } from '../app/review-utils.ts';

const reviews = Object.freeze(Array.from({ length: 6 }, (_, id) => Object.freeze({ id, name: `Reviewer ${id}`, quote: `Review ${id}` })));

test('each selection contains three unique reviews from the saved pool', () => {
  const selected = pickReviews(reviews);
  assert.equal(selected.length, 3);
  assert.equal(new Set(selected).size, 3);
  selected.forEach((review) => assert.ok(reviews.includes(review)));
});

test('random input changes the selection without modifying names, text or source order', () => {
  const before = JSON.stringify(reviews);
  assert.notDeepEqual(pickReviews(reviews, 3, () => 0), pickReviews(reviews, 3, () => 0.99));
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
