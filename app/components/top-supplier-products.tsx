'use client';

import { ArrowRight, Tag } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { inferSupplierCategory, isChatGptPlusProduct } from '../catalog-selection';
import { supplierLogo, supplierMonogram } from '../supplier-product-utils';
import { cacheSupplierCatalog } from '../supplier-catalog-cache';

type SupplierProduct = {
  id: string;
  name: string;
  description?: string;
  price: number;
  available: number;
  logo_url?: string;
};

function shuffle(products: SupplierProduct[]) {
  const result = [...products];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function SupplierFeaturedCard({ product }: { product: SupplierProduct }) {
  const logo = supplierLogo(product.name, product.logo_url);
  return <a className="featured-card supplier-featured-card" href={`/supplier-product?product=${encodeURIComponent(product.id)}`}>
    <div className="featured-logo">{logo ? <img src={logo} alt={`${product.name} logo`} width={128} height={128} loading="lazy" decoding="async" /> : <span className="product-monogram" aria-label={product.name}>{supplierMonogram(product.name)}</span>}</div>
    <div className="featured-copy"><h3>{product.name}</h3><p>Instant delivery</p></div>
    <div className="featured-reference"><span>{inferSupplierCategory(product.name, product.description)}</span><strong>{product.available} in stock</strong></div>
    <div className="featured-action"><div><span className="featured-price-label"><Tag className="h-3 w-3" /> Our price</span><strong>PKR {Number(product.price).toLocaleString('en-PK')}</strong></div><span className="featured-arrow" aria-hidden="true"><ArrowRight className="h-4 w-4" /></span></div>
  </a>;
}

export function TopSupplierProducts() {
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    fetch('/api/commerce?action=stock', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { products?: Array<SupplierProduct & { source?: string }> }) => {
        cacheSupplierCatalog(data.products || []);
        if (active) setProducts(shuffle((data.products || []).filter((product) => product.source === 'supplier' && product.available > 0 && !isChatGptPlusProduct(product.name))).slice(0, 10));
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const cards = useMemo(() => products.slice(0, 10), [products]);
  if (loading) return <p className="featured-loading" role="status">Loading supplier products...</p>;
  if (!cards.length) return <p className="featured-loading" role="status">Supplier products are temporarily unavailable.</p>;
  return <div className="featured-grid">{cards.map((product) => <SupplierFeaturedCard key={product.id} product={product} />)}</div>;
}
