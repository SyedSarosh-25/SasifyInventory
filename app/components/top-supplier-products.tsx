'use client';
import { LocalizedContent } from './language';


import { ArrowRight, Tag } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { selectTopProductsWithRandom } from '../catalog-selection';
import { products as localProducts, type Product } from '../products';
import { originalPricePkr, productHref } from '../product-utils';
import { ProductLogo } from './product-logo';
import { Money } from './currency';
import { supplierLogo } from '../supplier-product-utils';
import { cacheSupplierCatalog } from '../supplier-catalog-cache';
import { loadPublicCatalog } from '../public-catalog';
import { supplierCatalogHref } from '../supplier-seo';
import { supplierOriginalPriceComparison } from '../supplier-price-utils';

type SupplierProduct = {
  id: string;
  name: string;
  description?: string;
  price: number;
  original_price_pkr?: number | null;
  available: number;
  logo_url?: string;
  source?: 'local' | 'supplier';
  canonical_key?: string;
  provider_name?: string;
  display_name?: string;
  display_price?: number;
  display_original_price?: number;
  availability_mode?: 'live' | 'preorder' | 'manual';
  requires_customer_email?: boolean;
  activation_sla?: string;
  preorder_date?: string;
  stock_label?: string;
};

export type FeaturedProduct = SupplierProduct & {
  source: 'local' | 'supplier';
  localProduct?: Product;
  displayAvailable?: number;
  category?: string;
  href?: string;
  stockVerified?: boolean;
};

export function SupplierFeaturedCard({ product }: { product: FeaturedProduct }) {
  const logo =
    product.source === 'supplier'
      ? supplierLogo(product.name, product.logo_url)
      : '';
  const href = product.href || (
    product.source === 'supplier'
      ? supplierCatalogHref(product)
      : productHref(product.localProduct!)
  );
  const displayName = (product.display_name || product.name)
    .replace(/\(*can be monetized\)*\s*/gi, '').trim()
    .replace(/^\$500 API CLAUDE 30D \(FW\)$/i, 'Claude API · $500 credits · 30 days (FW)');
  const comparison = product.source === 'supplier'
    ? supplierOriginalPriceComparison(product)
    : null;
  const salePrice = product.display_price ?? product.price;
  const contactOnly = Boolean(product.localProduct?.contactOnly);
  const packagePrices = product.localProduct?.variants?.map(variant => variant.sellingPricePkr).filter(price => price > 0) || [];
  const contactPrice = packagePrices.length ? Math.min(...packagePrices) : null;
  const originalPrice = product.original_price_pkr ?? product.display_original_price
    ?? (product.source === 'supplier'
      ? comparison?.totalPkr ?? null
      : product.localProduct
        ? originalPricePkr(product.localProduct)
        : null);
  const savings = originalPrice === null
    ? null
    : Math.max(0, Math.round((originalPrice - salePrice) * 100) / 100);
  const sourceDescription = product.canonical_key === 'manual:muse-ai'
    ? 'Muse AI — 1 billion AI tokens'
    : String(product.description || '').replace(/PERPLEXITY PRO\s*[–—-]\s*1 MONTH\s*\|\s*ACTIVATION CDK/i, 'Perplexity Pro — 1-month activation code');
  const description = String(sourceDescription || '')
    .split(/\n+/)
    .map((line) => line.replace(/^[^\p{L}\p{N}]+/u, '').trim())
    .find(Boolean) || 'Review access, duration and requirements before ordering.';
  const checkoutProductId = product.source === 'supplier'
    ? product.canonical_key || product.id
    : product.id === 'p093'
      ? 'p093-ultra'
      : product.id;
  const isSupplier = product.source === 'supplier';
  const availabilityMode = product.availability_mode || (isSupplier ? 'live' : 'live');
  const stockVerified = !isSupplier || product.stockVerified === true;
  const inStock = availabilityMode === 'preorder' || availabilityMode === 'manual'
    ? true
    : !isSupplier
      ? Number(product.available) > 0
      : stockVerified && Number(product.available) > 0;
  const stockLabel = (
    availabilityMode === 'preorder'
      ? 'Taking pre-orders'
      : !isSupplier && availabilityMode === 'manual'
        ? 'In stock · 999'
        : !stockVerified
            ? 'Checking stock…'
            : inStock
              ? `In stock${Number.isFinite(Number(product.available)) ? ` · ${Number(product.available).toLocaleString('en-PK')}` : ''}`
              : 'Out of stock'
  );
  const availabilityClass = availabilityMode === 'preorder'
    ? 'is-preorder'
    : availabilityMode === 'manual'
      ? 'is-manual'
      : !stockVerified
        ? 'is-checking'
        : inStock
          ? 'is-available'
          : 'is-unavailable';
  const showStockBadge = Boolean(stockLabel);
  const canPurchase = inStock || contactOnly;
  const cardContent = <>
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
          <Tag aria-hidden="true" />
        )}
      </div>
      {showStockBadge && <span className={`featured-stock-badge ${availabilityClass}`} role="status">
        <i aria-hidden="true" /> {stockLabel}
      </span>}
    </div>
    <div className="featured-copy">
      <h3 translate="no">{displayName}</h3>
      <p translate="no">{description}</p>
    </div>
    <div className="featured-price-block">
      {!contactOnly && originalPrice !== null ? (
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
        <span><Tag className="h-3 w-3" /> {contactOnly ? 'From' : 'Our price'}</span>
        <strong>{contactOnly ? contactPrice === null ? 'Choose package' : <Money amount={contactPrice} /> : <Money amount={salePrice} />}</strong>
      </div>
      {!contactOnly && savings !== null && <div className="featured-savings">Your savings <strong><Money amount={savings} /></strong></div>}
    </div>
  </>;
  return (
    <LocalizedContent><article className={`featured-card supplier-featured-card${!canPurchase ? ' is-stock-blocked' : ''}`}>
      {/*
       * Keep supplier detail pages crawlable even while the live stock check is
       * still pending (or reports no stock). The purchase action remains
       * disabled, while the card and details action take a visitor to the detail
       * page and satisfy the static inventory link contract.
       */}
      <a
        className="featured-card-main"
        href={href}
      >
        {cardContent}
      </a>
      <div className="featured-card-actions">
        <a className="featured-details-button" href={href}>View details</a>
        {canPurchase ? <>
          <a className="featured-buy-button" href={contactOnly ? href : `/checkout?product=${encodeURIComponent(checkoutProductId)}`}>
            {contactOnly ? 'Choose package' : 'Buy now'} <ArrowRight className="h-4 w-4" />
          </a>
        </> : <>
          <button type="button" className="featured-buy-button is-disabled" disabled>{stockVerified ? 'Unavailable' : 'Checking stock…'}</button>
        </>}
      </div>
    </article></LocalizedContent>
  );
}

export function TopSupplierProducts() {
  const [products, setProducts] = useState<FeaturedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const previewOnly = new URLSearchParams(window.location.search).has('top10Preview');
    const loadCatalog = () => loadPublicCatalog<SupplierProduct>()
      .then((data) => {
        cacheSupplierCatalog(data.products || []);
        if (active) {
          const selected = selectTopProductsWithRandom(data.products || []);
          setProducts(
            selected.map((product) => ({
              ...product,
              stockVerified: true,
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
        const { supplierSeoProducts } = await import('../supplier-seo');
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
          original_price_pkr: product.original_price_pkr,
          available: product.available,
          source: 'supplier' as const,
          canonical_key: product.canonicalKey,
          provider_name: product.providerName,
        }));
        setProducts(selectTopProductsWithRandom([...previewProducts, ...supplierPreviewProducts]).map((product) => ({
          ...product,
          stockVerified: false,
          source: product.source === 'local' ? 'local' as const : 'supplier' as const,
          localProduct: product.source === 'local'
            ? localProducts.find((item) => item.id === product.id)
            : undefined,
        })));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    void loadCatalog();
    const refreshTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadCatalog();
    }, 30000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  const cards = useMemo(() => products.slice(0, 9), [products]);
  if (loading)
    return (
      <LocalizedContent><p className="featured-loading" role="status">
        Loading supplier products...
      </p></LocalizedContent>
    );
  if (!cards.length)
    return (
      <LocalizedContent><p className="featured-loading" role="status">
        Supplier products are temporarily unavailable.
      </p></LocalizedContent>
    );
  return (
    <LocalizedContent><div className="featured-grid">
      {cards.map((product) => (
        <SupplierFeaturedCard key={product.id} product={product} />
      ))}
    </div></LocalizedContent>
  );
}

