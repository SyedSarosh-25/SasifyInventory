'use client';

import { useState } from 'react';
import { initials } from '../product-utils';
import type { CustomerReview } from '../reviews';

export function ReviewAvatar({ review }: { review: CustomerReview }) {
  const [failed, setFailed] = useState(false);
  return <a className="review-avatar" href={review.profileUrl} target="_blank" rel="noreferrer" aria-label={`${review.name} on Google Maps`}>
    {failed ? initials(review.name) : <img src={review.photoUrl} alt="" width={42} height={42} loading="lazy" onError={() => setFailed(true)} />}
  </a>;
}
