'use client';
import { useEffect, useState } from 'react';
import { Tag } from 'lucide-react';
import { loadPublicCatalog } from '../public-catalog';
import { supplierOriginalPriceComparison, supplierSavingsPkr } from '../supplier-price-utils';
import { Money } from './currency';

type PriceProduct = { id: string; canonicalKey?: string; name: string; description?: string; price: number; original_price_pkr?: number | null; archived?: boolean };
type LivePriceProduct = PriceProduct & { canonical_key?: string };

export function SupplierPriceSummary({ product }: { product: PriceProduct }) {
  const [current, setCurrent] = useState(product);
  useEffect(() => {
    if (product.archived) return;
    let active = true;
    loadPublicCatalog<LivePriceProduct>().then((data) => {
      const live = data.products.find((offer) => offer.id === product.id || (Boolean(product.canonicalKey) && (offer.id === product.canonicalKey || offer.canonical_key === product.canonicalKey)));
      if (active && live && Number.isFinite(live.price)) setCurrent({ ...product, price: live.price, original_price_pkr: live.original_price_pkr ?? null });
    }).catch(() => { /* Keep the exported package prices when live data is unavailable. */ });
    return () => { active = false; };
  }, [product]);
  const comparison = supplierOriginalPriceComparison(current);
  const savings = supplierSavingsPkr(current);
  return <>
    <div className={comparison ? undefined : 'price-unknown'}><dt>Original price</dt><dd>{comparison ? <Money amount={comparison.totalPkr} /> : 'Price may vary'}</dd></div>
    <div className="selling-price"><dt><Tag className="h-4 w-4" /> {product.archived ? 'Last listed price' : 'Our price'}</dt><dd><Money amount={current.price} /></dd></div>
    <div className={savings !== null ? undefined : 'price-unknown'}><dt>Your savings</dt><dd>{savings !== null ? <Money amount={savings} /> : 'Price may vary'}</dd></div>
  </>;
}
