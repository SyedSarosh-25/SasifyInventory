'use client';

import { ArrowRight, Tag } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  inferSupplierCategory,
  isChatGptPlusProduct,
  topProductSlots,
} from '../catalog-selection';
import { products, type Product } from '../products';
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
};

type FeaturedProduct = SupplierProduct & {
  source: 'local' | 'supplier';
  localProduct?: Product;
  displayAvailable?: number;
};

function stableProductOrder(left: SupplierProduct, right: SupplierProduct) {
  const inStock = Number(right.available > 0) - Number(left.available > 0);
  if (inStock) return inStock;
  const name = left.name.localeCompare(right.name, undefined, {
    sensitivity: 'base',
  });
  if (name) return name;
  const price = Number(left.price) - Number(right.price);
  if (price) return price;
  return left.id.localeCompare(right.id);
}

function firstMatchingSupplier(
  products: SupplierProduct[],
  match: RegExp,
  preferredPrice?: number,
) {
  const matches = products
    .filter(
      (product) =>
        product.source === 'supplier' &&
        product.available > 0 &&
        !isChatGptPlusProduct(product.name) &&
        match.test(product.name),
    )
    .sort(stableProductOrder);
  return (
    (preferredPrice == null
      ? matches
      : matches.filter(
          (product) => Number(product.price) === preferredPrice,
        ))[0] || matches[0]
  );
}

function localProduct(
  product: Product,
  available: number,
  displayAvailable = available,
): FeaturedProduct {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.sellingPricePkr,
    available,
    displayAvailable,
    source: 'local',
    localProduct: product,
  };
}

function selectCuratedProducts(catalog: SupplierProduct[]) {
  const localStock = new Map(
    catalog
      .filter((product) => product.source === 'local')
      .map((product) => [product.id, Number(product.available) || 0]),
  );
  const localChatGpt = products.find((product) => product.id === 'p093');
  const localHostinger = products.find((product) => product.id === 'p100');
  const selected: FeaturedProduct[] = [];

  for (const slot of topProductSlots) {
    if (slot.label === 'ChatGPT') {
      if (localChatGpt)
        selected.push(
          localProduct(localChatGpt, localStock.get(localChatGpt.id) || 0),
        );
      continue;
    }
    const preferredPrice =
      'preferredPrice' in slot ? slot.preferredPrice : undefined;
    const supplier = firstMatchingSupplier(catalog, slot.match, preferredPrice);
    if (supplier) {
      selected.push({
        ...supplier,
        source: 'supplier',
        displayAvailable: slot.label === 'Hostinger' ? 5 : supplier.available,
      });
      continue;
    }
    if (slot.label === 'Hostinger' && localHostinger)
      selected.push(
        localProduct(localHostinger, localStock.get(localHostinger.id) || 0, 5),
      );
  }
  return selected;
}

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
        if (active) setProducts(selectCuratedProducts(data.products || []));
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
