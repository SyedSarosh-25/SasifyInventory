'use client';

import { useEffect, useState } from 'react';
import { ShoppingCart, WalletCards } from 'lucide-react';

type Props = {
  productId: string;
  canonicalKey: string;
  price: number;
};

type StockResponse = {
  products?: Array<{
    id?: string;
    canonical_key?: string;
    source?: string;
    available?: number;
  }>;
};

export function SupplierLivePurchase({ productId, canonicalKey, price }: Props) {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    const identifiers = new Set([productId, canonicalKey].filter(Boolean));

    fetch('/api/commerce?action=stock', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        const stock = data as StockResponse;
        const found = (stock.products || []).some(
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
    const walletDiscount = Math.floor(Math.max(0, Number(price)) * 0.05);
    const walletPrice = Math.max(0, Number(price) - walletDiscount);
    const checkoutProduct = canonicalKey || productId;
    return (
      <>
        <a
          href={`/checkout?product=${encodeURIComponent(checkoutProduct)}`}
          className="primary-button detail-buy"
        >
          <ShoppingCart className="h-5 w-5" /> Buy online
        </a>
        <a
          href={`/checkout?product=${encodeURIComponent(checkoutProduct)}`}
          className="primary-button wallet-purchase-button detail-buy"
        >
          <span className="wallet-cta-title">
            <WalletCards className="h-5 w-5" />
            <span>Buy with Sasify Wallet</span>
            <strong>5% OFF</strong>
          </span>
          <small>Pay only PKR {walletPrice.toLocaleString('en-PK')} with wallet</small>
        </a>
      </>
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
