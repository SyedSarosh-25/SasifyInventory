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
import { toolFamilyHref, toolFamilyName } from '../tool-families';

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

export function SupplierFeaturedCard({
  product,
  variants = [],
}: {
  product: FeaturedProduct;
  variants?: FeaturedProduct[];
}) {
  const isFamily = variants.length > 1;
  const familyName = isFamily ? toolFamilyName(product.name) : '';
  const activeProduct = product;

  const logo =
    activeProduct.source === 'supplier'
      ? supplierLogo(activeProduct.name, activeProduct.logo_url)
      : '';
  const href = isFamily && familyName
    ? toolFamilyHref(product.name)
    : (activeProduct.href || (
        activeProduct.source === 'supplier'
          ? supplierCatalogHref(activeProduct)
          : productHref(activeProduct.localProduct!)
      ));

  const displayName = isFamily && familyName
    ? `${familyName} Plans & Subscriptions`
    : (activeProduct.display_name || activeProduct.name)
        .replace(/\(*can be monetized\)*\s*/gi, '').trim()
        .replace(/^\$500 API CLAUDE 30D \(FW\)$/i, 'Claude API · $500 credits · 30 days (FW)');

  const comparison = activeProduct.source === 'supplier'
    ? supplierOriginalPriceComparison(activeProduct)
    : null;
  const salePrice = activeProduct.display_price ?? activeProduct.price;
  const contactOnly = Boolean(activeProduct.localProduct?.contactOnly);
  const packagePrices = activeProduct.localProduct?.variants?.map(variant => variant.sellingPricePkr).filter(price => price > 0) || [];
  const contactPrice = packagePrices.length ? Math.min(...packagePrices) : null;
  const originalPrice = activeProduct.original_price_pkr ?? activeProduct.display_original_price
    ?? (activeProduct.source === 'supplier'
      ? comparison?.totalPkr ?? null
      : activeProduct.localProduct
        ? originalPricePkr(activeProduct.localProduct)
        : null);
  const savings = originalPrice === null
    ? null
    : Math.max(0, Math.round((originalPrice - salePrice) * 100) / 100);

  const validVariantPrices = variants
    .map(v => v.display_price ?? v.price)
    .filter(p => Number.isFinite(p) && p > 0);
  const minVariantPrice = validVariantPrices.length ? Math.min(...validVariantPrices) : salePrice;

  const variantSavingsList = variants.map(v => {
    const orig = v.original_price_pkr ?? v.display_original_price ?? (v.source === 'supplier' ? supplierOriginalPriceComparison(v)?.totalPkr : null);
    const p = v.display_price ?? v.price;
    return (orig && p && orig > p) ? orig - p : 0;
  });
  const maxVariantSavings = variantSavingsList.length ? Math.max(...variantSavingsList) : 0;

  const sourceDescription = activeProduct.canonical_key === 'manual:muse-ai'
    ? 'Muse AI — 1 billion AI tokens'
    : String(activeProduct.description || '').replace(/PERPLEXITY PRO\s*[–—-]\s*1 MONTH\s*\|\s*ACTIVATION CDK/i, 'Perplexity Pro — 1-month activation code');
  const description = isFamily && familyName
    ? `Choose from ${variants.length} verified ${familyName} plans with instant delivery, full warranty, and local PKR payments.`
    : (String(sourceDescription || '')
        .split(/\n+/)
        .map((line) => line.replace(/^[^\p{L}\p{N}]+/u, '').trim())
        .find(Boolean) || 'Review access, duration and requirements before ordering.');

  const checkoutProductId = activeProduct.source === 'supplier'
    ? activeProduct.canonical_key || activeProduct.id
    : activeProduct.id === 'p093'
      ? 'p093-ultra'
      : activeProduct.id;
  const isSupplier = product.source === 'supplier';
  const availabilityMode = activeProduct.availability_mode || (isSupplier ? 'live' : 'live');
  const stockVerified = !isSupplier || activeProduct.stockVerified === true;
  const inStock = availabilityMode === 'preorder' || availabilityMode === 'manual'
    ? true
    : !isSupplier
      ? Number(activeProduct.available) > 0
      : stockVerified && Number(activeProduct.available) > 0;

  const inStockVariantsCount = variants.filter(v => v.availability_mode === 'preorder' || v.availability_mode === 'manual' || Number(v.available) > 0).length;
  const familyHasStock = inStockVariantsCount > 0;

  const stockLabel = isFamily
    ? (familyHasStock ? `In stock · ${inStockVariantsCount} plans` : 'Out of stock')
    : (availabilityMode === 'preorder'
        ? 'Taking pre-orders'
        : !isSupplier && availabilityMode === 'manual'
          ? 'In stock · 999'
          : !stockVerified
              ? 'Checking stock…'
              : inStock
                ? `In stock${Number.isFinite(Number(activeProduct.available)) ? ` · ${Number(activeProduct.available).toLocaleString('en-PK')}` : ''}`
                : 'Out of stock');

  const availabilityClass = isFamily
    ? (familyHasStock ? 'is-available' : 'is-unavailable')
    : (availabilityMode === 'preorder'
        ? 'is-preorder'
        : availabilityMode === 'manual'
          ? 'is-manual'
          : !stockVerified
            ? 'is-checking'
            : inStock
              ? 'is-available'
              : 'is-unavailable');

  const showStockBadge = Boolean(stockLabel);
  const canPurchase = isFamily ? familyHasStock : (inStock || contactOnly);

  const isShared = !isFamily && /\bshared\b/i.test(activeProduct.name);
  const isUltraOrPrivate = !isFamily && /\b(?:ultra|stable|private)\b/i.test(activeProduct.name);

  return (
    <LocalizedContent><article className={`featured-card supplier-featured-card${!canPurchase ? ' is-stock-blocked' : ''}`}>
      <div className="featured-card-main">
        <a className="featured-card-header-link" href={href}>
          <div className="featured-card-topline">
            <div className="featured-logo">
              {activeProduct.source === 'local' ? (
                <ProductLogo product={activeProduct.localProduct!} />
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
            <div className="featured-badge-group">
              {isShared && <span className="featured-type-badge is-shared">Shared</span>}
              {isUltraOrPrivate && <span className="featured-type-badge is-private">Own Email</span>}
              {variants.length > 1 && <span className="featured-plans-count-badge">{variants.length} plans</span>}
              {showStockBadge && <span className={`featured-stock-badge ${availabilityClass}`} role="status">
                <i aria-hidden="true" /> {stockLabel}
              </span>}
            </div>
          </div>
          <div className="featured-copy">
            <h3 translate="no">{displayName}</h3>
            <p translate="no">{description}</p>
          </div>
        </a>

        {variants.length > 1 && (
          <div className="sr-only" aria-hidden="true">
            {variants.map((v) => {
              const vHref = v.href || (
                v.source === 'supplier'
                  ? `/products/${v.canonical_key || v.id}`
                  : v.localProduct
                    ? productHref(v.localProduct)
                    : `/products/${v.id}`
              );
              return (
                <a key={v.id} href={vHref}>
                  {v.name}
                </a>
              );
            })}
          </div>
        )}

        <a className="featured-price-link" href={href}>
          <div className="featured-price-block">
            {isFamily ? (
              <div className="featured-original-price">
                <span>Pricing</span>
                <strong>{variants.length} tiers available</strong>
              </div>
            ) : !contactOnly && originalPrice !== null ? (
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
              <span><Tag className="h-3 w-3" /> {isFamily || contactOnly ? 'Starting from' : 'Our price'}</span>
              <strong>
                {isFamily ? (
                  <Money amount={minVariantPrice} />
                ) : contactOnly ? (
                  contactPrice === null ? 'Choose package' : <Money amount={contactPrice} />
                ) : (
                  <Money amount={salePrice} />
                )}
              </strong>
            </div>
            {isFamily && maxVariantSavings > 0 ? (
              <div className="featured-savings">Save up to <strong><Money amount={maxVariantSavings} /></strong></div>
            ) : !contactOnly && savings !== null && (
              <div className="featured-savings">Your savings <strong><Money amount={savings} /></strong></div>
            )}
          </div>
        </a>
      </div>

      <div className="featured-card-actions">
        <a className="featured-details-button" href={href}>View details</a>
        {isFamily ? (
          <a className="featured-buy-button" href={href}>
            Choose plan <ArrowRight className="h-4 w-4" />
          </a>
        ) : canPurchase ? (
          <a className="featured-buy-button" href={contactOnly ? href : `/checkout?product=${encodeURIComponent(checkoutProductId)}`}>
            {contactOnly ? 'Choose package' : 'Buy now'} <ArrowRight className="h-4 w-4" />
          </a>
        ) : (
          <button type="button" className="featured-buy-button is-disabled" disabled>{stockVerified ? 'Unavailable' : 'Checking stock…'}</button>
        )}
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

