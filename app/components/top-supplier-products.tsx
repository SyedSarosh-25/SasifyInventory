'use client';

import { ArrowRight, Tag } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  inferSupplierCategory,
  selectRandomTopProducts,
} from '../catalog-selection';
import { products as localProducts, type Product } from '../products';
import { productHref } from '../product-utils';
import { ProductLogo } from './product-logo';
import { supplierLogo, supplierMonogram } from '../supplier-product-utils';
import { cacheSupplierCatalog } from '../supplier-catalog-cache';

type SupplierProduct = {
  id: string;
  name: string;
  description?: string;
  price: number;
  available: number;
  logo_url?: string;
  source?: 'local' | 'supplier';
  canonical_key?: string;
};

type FeaturedProduct = SupplierProduct & {
  source: 'local' | 'supplier';
  localProduct?: Product;
  displayAvailable?: number;
};

function SupplierFeaturedCard({ product }: { product: FeaturedProduct }) {
  const logo =
    product.source === 'supplier'
      ? supplierLogo(product.name, product.logo_url)
      : '';
  const href =
    product.source === 'supplier'
      ? `/supplier-product?product=${encodeURIComponent(product.id)}`
      : productHref(product.localProduct!);
  const displayAvailable = product.displayAvailable ?? product.available;
  return (
    <a className="featured-card supplier-featured-card" href={href}>
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
      <div className="featured-copy">
        <h3>{product.name}</h3>
        <p>Instant delivery</p>
      </div>
      <div className="featured-reference">
        <span>{inferSupplierCategory(product.name, product.description)}</span>
        <strong>{displayAvailable} in stock</strong>
      </div>
      <div className="featured-action">
        <div>
          <span className="featured-price-label">
            <Tag className="h-3 w-3" /> Our price
          </span>
          <strong>PKR {Number(product.price).toLocaleString('en-PK')}</strong>
        </div>
        <span className="featured-arrow" aria-hidden="true">
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </a>
  );
}

export function TopSupplierProducts() {
  const [products, setProducts] = useState<FeaturedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
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
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const cards = useMemo(() => products.slice(0, 10), [products]);
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
