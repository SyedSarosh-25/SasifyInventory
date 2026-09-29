import { supplierUrlRegistry } from './supplier-url-registry.generated.mjs';
import { findSupplierUrl } from './supplier-url-registry-core.mjs';

type SupplierSlugInput = {
  id?: string | null;
  canonical_key?: string | null;
  canonicalKey?: string | null;
  name?: string | null;
  slug?: string | null;
};

export function stableSupplierHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).padStart(6, '0').slice(0, 6);
}

export function slugifySupplierName(value: string) {
  const slug = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .toLowerCase()
    .slice(0, 72)
    .replace(/-+$/g, '');
  return slug || 'digital-product';
}

export function legacySupplierProductSlug(product: SupplierSlugInput) {
  const key = String(product.canonical_key || product.canonicalKey || product.id || product.name || 'supplier-product');
  return `${slugifySupplierName(String(product.name || 'digital-product'))}-${stableSupplierHash(key)}`;
}

export function supplierProductSlug(product: SupplierSlugInput) {
  return findSupplierUrl(product, supplierUrlRegistry)?.slug || legacySupplierProductSlug(product);
}

export function supplierProductHref(product: SupplierSlugInput) {
  return `/products/${supplierProductSlug(product)}`;
}

/**
 * Compatibility helper for older callers. Supplier product links now use
 * the canonical SEO route everywhere so navigation stays consistent with
 * Full Inventory.
 */
export function liveSupplierProductHref(product: SupplierSlugInput) {
  return supplierProductHref(product);
}
