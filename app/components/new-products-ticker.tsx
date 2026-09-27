'use client';

import { Megaphone } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { products as localProducts, type Product } from '../products';
import { productHref } from '../product-utils';
import { supplierLogo, supplierMonogram } from '../supplier-product-utils';
import { supplierCatalogHref } from '../supplier-seo';
import { Money } from './currency';
import { ProductLogo } from './product-logo';

type NewProduct = {
  id: string;
  name: string;
  price: number;
  available: number;
  source: 'local' | 'supplier';
  logoUrl?: string;
  canonical_key?: string;
  firstSeenAt?: string;
  publishedAt?: string;
  localProduct?: Product;
};

type StockProduct = {
  id: string;
  name: string;
  price: number;
  available: number;
  source?: 'local' | 'supplier';
  logo_url?: string;
  canonical_key?: string;
  firstSeenAt?: string;
  publishedAt?: string;
};

function productDate(product: NewProduct) {
  const value = product.source === 'supplier' ? product.firstSeenAt : product.publishedAt;
  const timestamp = value ? Date.parse(value) : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function TickerItem({ product, duplicate = false }: { product: NewProduct; duplicate?: boolean }) {
  const supplier = product.source === 'supplier';
  const logo = supplier ? supplierLogo(product.name, product.logoUrl) : '';
  const href = supplier
    ? supplierCatalogHref({
      id: product.id,
      name: product.name,
      canonical_key: product.canonical_key,
    })
    : productHref(product.localProduct!);

  return (
    <a className="new-products-ticker-item" href={href} tabIndex={duplicate ? -1 : undefined}>
      <span className="new-products-ticker-logo" aria-hidden="true">
        {supplier ? (
          logo ? <img src={logo} alt="" width={24} height={24} /> : <span>{supplierMonogram(product.name)}</span>
        ) : (
          <ProductLogo product={product.localProduct!} />
        )}
      </span>
      <span className="new-products-ticker-copy">
        <small>New From Sasify</small>
        <strong>{product.name}</strong>
      </span>
      <span className="new-products-ticker-price"><Money amount={product.price} /></span>
      <span className="new-products-ticker-stock"><i /> {product.available} left</span>
    </a>
  );
}

export function NewProductsTicker() {
  const [stock, setStock] = useState<StockProduct[]>([]);

  useEffect(() => {
    let active = true;
    const load = () => {
      fetch('/api/commerce?action=stock', { cache: 'no-store' })
        .then(async (response) => {
          if (!response.ok) throw new Error('Could not load stock.');
          return await response.json() as { products?: StockProduct[] };
        })
        .then((data) => {
          if (active) setStock(Array.isArray(data.products) ? data.products : []);
        })
        .catch(() => {});
    };
    load();
    const refresh = window.setInterval(load, 5 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(refresh);
    };
  }, []);

  const newProducts = useMemo(() => {
    const localById = new Map(localProducts.map((product) => [product.id, product]));
    return stock
      .filter((product) => product.available > 0 && product.price > 0)
      .map((product): NewProduct | null => {
        if (product.source === 'local') {
          const localProduct = localById.get(product.id);
          if (!localProduct?.publishedAt) return null;
          return {
            id: product.id,
            name: localProduct.name,
            price: product.price,
            available: product.available,
            source: 'local',
            publishedAt: localProduct.publishedAt,
            localProduct,
          };
        }
        return {
          id: product.id,
          name: product.name,
          price: product.price,
          available: product.available,
          source: 'supplier',
          logoUrl: product.logo_url,
          canonical_key: product.canonical_key,
          firstSeenAt: product.firstSeenAt,
        };
      })
      .filter((product): product is NewProduct => product !== null)
      .filter((product) => productDate(product) > 0)
      .sort((left, right) => productDate(right) - productDate(left))
      .slice(0, 8);
  }, [stock]);

  if (!newProducts.length) return null;

  return (
    <div className="new-products-ticker" aria-label="New products">
      <div className="new-products-ticker-inner">
        <div className="new-products-ticker-label">
          <Megaphone className="h-4 w-4" aria-hidden="true" />
          <strong>New Releases</strong>
        </div>
        <div className="new-products-ticker-viewport">
          <div className="new-products-ticker-track">
            {[newProducts, newProducts].map((group, groupIndex) => (
              <div className="new-products-ticker-group" key={groupIndex} aria-hidden={groupIndex === 1}>
                {group.map((product) => <TickerItem key={`${groupIndex}-${product.source}-${product.id}`} product={product} duplicate={groupIndex === 1} />)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
