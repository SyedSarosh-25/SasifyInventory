'use client';

import { useState } from 'react';
import { initials } from '../product-utils';
import type { CustomerReview } from '../reviews';

export function ReviewAvatar({ review }: { review: CustomerReview }) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const source = [review.photoPath, review.photoUrl][sourceIndex];
  return <a className="review-avatar" href={review.profileUrl} target="_blank" rel="noreferrer" aria-label={`${review.name} on Google Maps`}>
    {source ? <img src={source} alt={`${review.name}'s Google Maps profile picture`} width={42} height={42}
      loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setSourceIndex((index) => index + 1)} /> : initials(review.name)}
  </a>;
}
