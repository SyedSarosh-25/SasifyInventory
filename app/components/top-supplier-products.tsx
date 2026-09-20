'use client';

import { ArrowRight, CalendarDays, Check, Tag, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  inferSupplierCategory,
  selectRandomTopProducts,
} from '../catalog-selection';
import { products as localProducts, type Product } from '../products';
import { productHref } from '../product-utils';
import { ProductLogo } from './product-logo';
import { Money } from './currency';
import { supplierLogo, supplierMonogram } from '../supplier-product-utils';
import { cacheSupplierCatalog } from '../supplier-catalog-cache';
import { liveSupplierProductHref } from '../supplier-seo-utils';

type SupplierProduct = {
  id: string;
  name: string;
  description?: string;
  price: number;
  available: number;
  logo_url?: string;
  source?: 'local' | 'supplier';
  canonical_key?: string;
  provider_name?: string;
};

export type FeaturedProduct = SupplierProduct & {
  source: 'local' | 'supplier';
  localProduct?: Product;
  displayAvailable?: number;
  category?: string;
  href?: string;
};

export function SupplierFeaturedCard({ product }: { product: FeaturedProduct }) {
  const logo =
    product.source === 'supplier'
      ? supplierLogo(product.name, product.logo_url)
      : '';
  const href = product.href || (
    product.source === 'supplier'
      ? liveSupplierProductHref(product)
      : productHref(product.localProduct!)
  );
  const displayAvailable = product.displayAvailable ?? product.available;
  const category = product.category || inferSupplierCategory(product.name, product.description);
  const originalPrice = product.localProduct?.originalPricePkr;
  const savings = originalPrice && originalPrice > product.price
    ? originalPrice - product.price
    : null;
  const description = String(product.description || '')
    .split(/\n+/)
    .map((line) => line.replace(/^[^\p{L}\p{N}]+/u, '').trim())
    .find(Boolean) || 'Review access, duration and requirements before ordering.';
  return (
    <a className="featured-card supplier-featured-card" href={href}>
      <div className="featured-card-topline">
        <div className="featured-logo">
          {product.source === 'local' ? (
            <ProductLogo product={product.localProduct!} />
          ) : logo ? (
            <img
              src={logo}
              alt={`${product.name} logo`}
              width={128}
              height={128}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="product-monogram" aria-label={product.name}>
              {supplierMonogram(product.name)}
            </span>
          )}
        </div>
        <span className="featured-stock-badge"><Check className="h-3 w-3" /> In stock</span>
      </div>
      <div className="featured-copy">
        <h3>{product.name}</h3>
        <p>{description}</p>
      </div>
      <div className="featured-badges">
        <span><Users className="h-3 w-3" /> {category}</span>
        {product.localProduct?.duration && <span><CalendarDays className="h-3 w-3" /> {product.localProduct.duration}</span>}
        <span>{displayAvailable.toLocaleString('en-PK')} available</span>
      </div>
      <div className="featured-price-block">
        {originalPrice ? (
          <div className="featured-original-price">
            <span>Original price</span>
            <del><Money amount={originalPrice} /></del>
          </div>
        ) : (
          <div className="featured-original-price featured-price-placeholder">Price for this listing</div>
        )}
        <div className="featured-our-price">
          <span><Tag className="h-3 w-3" /> Our price</span>
          <strong><Money amount={product.price} /></strong>
        </div>
        {savings ? <div className="featured-savings">Your savings <strong><Money amount={savings} /></strong></div> : null}
      </div>
      <div className="featured-card-actions">
        <span className="featured-details-button">View details</span>
        <span className="featured-buy-button">Buy now <ArrowRight className="h-4 w-4" /></span>
      </div>
    </a>
  );
}

export function TopSupplierProducts() {
  const [products, setProducts] = useState<FeaturedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const previewOnly = new URLSearchParams(window.location.search).has('top10Preview');
    fetch('/api/commerce?action=stock', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load supplier products.');
        return (await response.json()) as { products?: SupplierProduct[] };
      })
      .then((data) => {
        cacheSupplierCatalog(data.products || []);
        if (active) {
          const selected = selectRandomTopProducts(data.products || []);
          setProducts(
            selected.map((product) => ({
              ...product,
              source: product.source === 'local' ? 'local' : 'supplier',
              localProduct:
                product.source === 'local'
                  ? localProducts.find((item) => item.id === product.id)
                  : undefined,
            })),
          );
        }
      })
      .catch(async () => {
        if (!active || !previewOnly) return;
        const { supplierSeoProducts } = await import('../supplier-seo-products.generated');
        const previewProducts = localProducts
          .filter((product) => product.sellingPricePkr > 0)
          .map((product) => ({
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.sellingPricePkr,
            available: 1,
            source: 'local' as const,
            provider_name: product.vendor,
            localProduct: product,
          }));
        const supplierPreviewProducts = supplierSeoProducts.slice(0, 10).map((product) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          available: product.available,
          source: 'supplier' as const,
          canonical_key: product.canonicalKey,
          provider_name: product.providerName,
        }));
        setProducts(selectRandomTopProducts([...previewProducts, ...supplierPreviewProducts], () => 0).map((product) => ({
          ...product,
          source: product.source === 'local' ? 'local' as const : 'supplier' as const,
          localProduct: product.source === 'local'
            ? localProducts.find((item) => item.id === product.id)
            : undefined,
        })));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const cards = useMemo(() => products.slice(0, 8), [products]);
  if (loading)
    return (
      <p className="featured-loading" role="status">
        Loading supplier products...
      </p>
    );
  if (!cards.length)
    return (
      <p className="featured-loading" role="status">
        Supplier products are temporarily unavailable.
      </p>
    );
  return (
    <div className="featured-grid">
      {cards.map((product) => (
        <SupplierFeaturedCard key={product.id} product={product} />
      ))}
    </div>
  );
}
