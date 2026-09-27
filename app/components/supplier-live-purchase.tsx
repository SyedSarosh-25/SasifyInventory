'use client';
import { LocalizedContent } from './language';


import { useEffect, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { supplierProductKey } from '../../commerce/supplier-matching.mjs';

type Props = {
  productId: string;
  canonicalKey: string;
  name: string;
};

type StockResponse = {
  products?: Array<{
    id?: string;
    canonical_key?: string;
    source?: string;
    name?: string;
    available?: number;
  }>;
};

export function SupplierLivePurchase({ productId, canonicalKey, name }: Props) {
  const [checkoutProduct, setCheckoutProduct] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;
    const identifiers = new Set([productId, canonicalKey].filter(Boolean));
    const planKey = supplierProductKey(name);

    fetch('/api/commerce?action=stock', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        const stock = data as StockResponse;
        const found = (stock.products || []).find(
          (product) =>
            product.source === 'supplier' &&
            Number(product.available) > 0 &&
            (planKey
              ? supplierProductKey(product.name) === planKey
              : identifiers.has(String(product.id || ''))),
        );
        if (active) { setCheckoutProduct(found ? String(found.id || found.canonical_key) : null); setChecked(true); }
      })
      .catch(() => {
        // Fail closed: a stale page must never advertise a checkout link when
        // current supplier stock cannot be confirmed.
        if (active) { setCheckoutProduct(null); setChecked(true); }
      });

    return () => {
      active = false;
    };
  }, [canonicalKey, name, productId]);

  if (checkoutProduct) {
    return <LocalizedContent><a href={`/checkout?product=${encodeURIComponent(checkoutProduct)}`} className="primary-button detail-buy"><ShoppingCart className="h-5 w-5" /> Buy online</a></LocalizedContent>;
  }

  return (
    <LocalizedContent><span
      className="detail-buy detail-unavailable"
      role="status"
      aria-live="polite"
    >
      {checked ? 'Currently Unavailable' : 'Checking availability…'}
    </span></LocalizedContent>
  );
}
