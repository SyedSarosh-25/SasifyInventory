'use client';

import { ArrowRight, CheckCircle2, MessageSquare, ShieldCheck } from 'lucide-react';
import type { FeaturedProduct } from './top-supplier-products';
import { Money } from './currency';
import { supplierOriginalPriceComparison } from '../supplier-price-utils';
import { originalPricePkr, productHref, whatsappLink } from '../product-utils';
import { supplierLogo } from '../supplier-product-utils';
import { ProductLogo } from './product-logo';

export function ToolPlanCard({ product }: { product: FeaturedProduct }) {
  const isSupplier = product.source === 'supplier';
  const availabilityMode = product.availability_mode || 'live';
  const stockVerified = !isSupplier || product.stockVerified === true;
  const inStock = availabilityMode === 'preorder' || availabilityMode === 'manual'
    ? true
    : !isSupplier
      ? Number(product.available) > 0
      : stockVerified && Number(product.available) > 0;

  const salePrice = product.display_price ?? product.price;
  const comparison = isSupplier ? supplierOriginalPriceComparison(product) : null;
  const originalPrice = product.original_price_pkr ?? product.display_original_price
    ?? (isSupplier
      ? comparison?.totalPkr ?? null
      : product.localProduct
        ? originalPricePkr(product.localProduct)
        : null);
  const savings = originalPrice !== null ? Math.max(0, Math.round((originalPrice - salePrice) * 100) / 100) : null;

  const checkoutProductId = isSupplier
    ? product.canonical_key || product.id
    : product.id === 'p093'
      ? 'p093-ultra'
      : product.id;

  const detailHref = product.href || (
    isSupplier
      ? `/products/${product.canonical_key || product.id}`
      : product.localProduct
        ? productHref(product.localProduct)
        : `/products/${product.id}`
  );

  const isShared = /\bshared\b/i.test(product.name);
  const isUltraOrPrivate = /\b(?:ultra|stable|private|own\s*email)\b/i.test(product.name);
  const isApi = /\b(?:api|token|tokens|credits?|cdk)\b/i.test(product.name);
  const isEdu = /\b(?:edu|student)\b/i.test(product.name);

  const durMatch = product.name.match(/(\d+\s*(?:months?|days?|years?|d|m|y))\b/i);
  const creditMatch = product.name.match(/(\d+[MBK]|[$]\d+)\s*(?:credits?|tokens?|api)?/i);
  const durationLabel = durMatch ? durMatch[0] : creditMatch ? creditMatch[0] : '';

  const planTypeBadge = isUltraOrPrivate ? (
    <span className="plan-badge is-private">🛡️ Private · Own Email</span>
  ) : isShared ? (
    <span className="plan-badge is-shared">👥 Shared Account</span>
  ) : isApi ? (
    <span className="plan-badge is-api">⚡ API / Tokens</span>
  ) : isEdu ? (
    <span className="plan-badge is-edu">🎓 Student / Edu</span>
  ) : (
    <span className="plan-badge is-standard">📦 Standard</span>
  );

  const stockBadge = availabilityMode === 'preorder' ? (
    <span className="plan-stock-badge is-preorder">⏳ Pre-order</span>
  ) : inStock ? (
    <span className="plan-stock-badge is-available">
      <span className="pulse-indicator" aria-hidden="true" />
      In stock{Number(product.available) > 0 ? ` · ${Number(product.available).toLocaleString('en-PK')}` : ''}
    </span>
  ) : (
    <span className="plan-stock-badge is-unavailable">Out of stock</span>
  );

  const displayName = (product.display_name || product.name)
    .replace(/\(*can be monetized\)*\s*/gi, '').trim()
    .replace(/^\$500 API CLAUDE 30D \(FW\)$/i, 'Claude API · $500 credits · 30 days (FW)');

  const logo = isSupplier ? supplierLogo(product.name, product.logo_url) : '';
  const waHref = whatsappLink(displayName, durationLabel);

  return (
    <article className={`tool-plan-card${!inStock ? ' is-out-of-stock' : ''}`}>
      <div className="tool-plan-card-header">
        <div className="tool-plan-meta-left">
          {planTypeBadge}
          {durationLabel && <span className="plan-duration-badge">📅 {durationLabel}</span>}
        </div>
        <div className="tool-plan-meta-right">
          {stockBadge}
        </div>
      </div>

      <div className="tool-plan-body">
        <div className="tool-plan-title-row">
          <div className="tool-plan-logo">
            {product.source === 'local' && product.localProduct ? (
              <ProductLogo product={product.localProduct} />
            ) : logo ? (
              <img src={logo} alt="" width={44} height={44} loading="lazy" decoding="async" />
            ) : (
              <ShieldCheck className="h-6 w-6 text-indigo-600" />
            )}
          </div>
          <div>
            <h3 className="tool-plan-title" translate="no">{displayName}</h3>
            {product.description && (
              <p className="tool-plan-desc" translate="no">
                {product.description.split(/\n+/)[0].slice(0, 140)}
              </p>
            )}
          </div>
        </div>

        <ul className="tool-plan-features">
          <li>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>100% Full Replacement Warranty for entire duration</span>
          </li>
          <li>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{isUltraOrPrivate ? 'Private account on your own personal email' : isShared ? 'Verified login credentials with zero issues' : 'Instant activation code / API quota'}</span>
          </li>
          <li>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Instant delivery to your WhatsApp & Email</span>
          </li>
          <li>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Pay in PKR via JazzCash, Easypaisa, SadaPay, NayaPay or Bank</span>
          </li>
        </ul>
      </div>

      <div className="tool-plan-footer">
        <div className="tool-plan-pricing">
          {originalPrice !== null && (
            <div className="tool-plan-original-price">
              <span>Original price:</span>
              <del><Money amount={originalPrice} /></del>
            </div>
          )}
          <div className="tool-plan-sale-price">
            <span className="tool-plan-price-val"><Money amount={salePrice} /></span>
            {durationLabel && <span className="tool-plan-price-period">/{durationLabel}</span>}
          </div>
          {savings !== null && savings > 0 && (
            <div className="tool-plan-savings">
              Save <Money amount={savings} />
            </div>
          )}
        </div>

        <div className="tool-plan-actions">
          {inStock ? (
            <a className="tool-plan-btn-buy" href={`/checkout?product=${encodeURIComponent(checkoutProductId)}`}>
              Buy now <ArrowRight className="h-4 w-4" />
            </a>
          ) : (
            <a className="tool-plan-btn-whatsapp" href={waHref} target="_blank" rel="noopener noreferrer">
              <MessageSquare className="h-4 w-4" /> Inquire WhatsApp
            </a>
          )}
          <a className="tool-plan-btn-details" href={detailHref}>
            View details →
          </a>
        </div>
      </div>
    </article>
  );
}
