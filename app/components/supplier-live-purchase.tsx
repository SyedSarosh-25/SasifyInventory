'use client';
import { LocalizedContent } from './language';
import { ShoppingCart } from 'lucide-react';
export function SupplierLivePurchase({ productId, canonicalKey }: { productId: string; canonicalKey: string; name: string }) {
  return <LocalizedContent><a href={`/checkout?product=${encodeURIComponent(canonicalKey || productId)}`} className="primary-button detail-buy"><ShoppingCart className="h-5 w-5" /> Buy online</a></LocalizedContent>;
}
