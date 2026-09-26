'use client';

import { ArrowRight, Check, Tag, WalletCards } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { selectFixedTopProducts } from '../catalog-selection';
import { products as localProducts, type Product } from '../products';
import { originalPricePkr, productHref } from '../product-utils';
import { ProductLogo } from './product-logo';
import { Money } from './currency';
import { supplierLogo, supplierMonogram } from '../supplier-product-utils';
import { cacheSupplierCatalog } from '../supplier-catalog-cache';
import { supplierProductHref } from '../supplier-seo-utils';
import { supplierOriginalPriceComparison } from '../supplier-price-utils';

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
  display_name?: string;
  display_price?: number;
  display_original_price?: number;
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
      ? supplierProductHref(product)
      : productHref(product.localProduct!)
  );
  const displayName = product.display_name || product.name;
  const comparison = product.source === 'supplier'
    ? supplierOriginalPriceComparison(product)
    : null;
  const salePrice = product.display_price ?? product.price;
  const originalPrice = product.display_original_price
    ?? (product.source === 'supplier'
      ? comparison?.totalPkr ?? null
      : product.localProduct
        ? originalPricePkr(product.localProduct)
        : null);
  const savings = originalPrice === null
    ? null
    : Math.round((originalPrice - salePrice) * 100) / 100;
  const description = String(product.description || '')
    .split(/\n+/)
    .map((line) => line.replace(/^[^\p{L}\p{N}]+/u, '').trim())
    .find(Boolean) || 'Review access, duration and requirements before ordering.';
  const checkoutProductId = product.source === 'supplier'
    ? product.canonical_key || product.id
    : product.id === 'p093'
      ? 'p093-ultra'
      : product.id;
  const walletDiscount = Math.floor(Math.max(0, Number(salePrice)) * 0.05);
  const walletPrice = Math.max(0, Number(salePrice) - walletDiscount);
  const walletEligible = Number.isFinite(Number(salePrice))
    && Number(salePrice) > 0
    && product.available > 0
    && !(product.source === 'local' && product.localProduct?.contactOnly);
  return (
    <article className="featured-card supplier-featured-card">
      <a className="featured-card-main" href={href}>
      <div className="featured-card-topline">
        <div className="featured-logo">
          {product.source === 'local' ? (
            <ProductLogo product={product.localProduct!} />
          ) : logo ? (
            <img
              src={logo}
              alt={`${displayName} logo`}
              width={128}
              height={128}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="product-monogram" aria-label={product.name}>
              {supplierMonogram(displayName)}
            </span>
          )}
        </div>
        <span className="featured-stock-badge"><Check className="h-3 w-3" /> In stock</span>
      </div>
      <div className="featured-copy">
        <h3>{displayName}</h3>
        <p>{description}</p>
      </div>
      <div className="featured-price-block">
        {originalPrice !== null ? (
          <div className="featured-original-price">
            <span>Original price</span>
            <del><Money amount={originalPrice} /></del>
          </div>
        ) : (
          <div className="featured-original-price featured-price-placeholder">
            <span>Original price</span>
            <strong>Price may vary</strong>
          </div>
        )}
        <div className="featured-our-price">
          <span><Tag className="h-3 w-3" /> Our price</span>
          <strong><Money amount={salePrice} /></strong>
        </div>
        {savings !== null ? <div className="featured-savings">Your savings <strong><Money amount={savings} /></strong></div> : (
          <div className="featured-savings featured-savings-muted">Your savings <strong>Price may vary</strong></div>
        )}
      </div>
      </a>
      {walletEligible && (
        <a className="featured-wallet-button" href={`/checkout?product=${encodeURIComponent(checkoutProductId)}`}>
          <span className="featured-wallet-label">
            <WalletCards className="h-4 w-4" />
            <span>Sasify Wallet</span>
            <strong>5% OFF</strong>
          </span>
          <small>Pay only PKR {walletPrice.toLocaleString('en-PK')} with wallet</small>
        </a>
      )}
      <div className="featured-card-actions">
        <a className="featured-details-button" href={href}>View details</a>
        <a className="featured-buy-button" href={`/checkout?product=${encodeURIComponent(checkoutProductId)}`}>
          Buy now <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </article>
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
          const selected = selectFixedTopProducts(data.products || []);
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
        setProducts(selectFixedTopProducts([...previewProducts, ...supplierPreviewProducts]).map((product) => ({
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
