'use client';

import { useEffect, useState } from 'react';
import { ShoppingCart } from 'lucide-react';

type Props = {
  productId: string;
  canonicalKey: string;
};

export function SupplierLivePurchase({ productId, canonicalKey }: Props) {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    const identifiers = new Set([productId, canonicalKey].filter(Boolean));

    fetch('/api/commerce?action=stock', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { products?: Array<{ id?: string; canonical_key?: string; source?: string; available?: number }> }) => {
        const found = (data.products || []).some(
          (product) =>
            product.source === 'supplier' &&
            Number(product.available) > 0 &&
            identifiers.has(String(product.id || '')),
        );
        if (active) setAvailable(found);
      })
      .catch(() => {
        // Fail closed: a stale page must never advertise a checkout link when
        // current supplier stock cannot be confirmed.
        if (active) setAvailable(false);
      });

    return () => {
      active = false;
    };
  }, [canonicalKey, productId]);

  if (available === true) {
    return (
      <a
        href={`/checkout?product=${encodeURIComponent(canonicalKey || productId)}`}
        className="primary-button detail-buy"
      >
        <ShoppingCart className="h-5 w-5" /> Buy online
      </a>
    );
  }

  return (
    <span
      className="detail-buy detail-unavailable"
      role="status"
      aria-live="polite"
    >
      {available === null ? 'Checking availability…' : 'Currently Unavailable'}
    </span>
  );
}
