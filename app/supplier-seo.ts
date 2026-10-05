import {
  supplierSeoGeneratedAt,
  supplierSeoProducts as generatedSupplierSeoProducts,
} from './supplier-seo-products.generated.ts';
import {
  supplierProductHref,
  supplierProductSlug,
} from './supplier-seo-utils.ts';
import { isInternalTestListing } from './product-visibility.ts';

export type SupplierSeoProduct = {
  id: string;
  slug: string;
  canonicalKey: string;
  name: string;
  description: string;
  deliveryInstruction?: string;
  price: number;
  original_price_pkr?: number | null;
  available: number;
  providerId?: string;
  providerName?: string;
  logoUrl?: string;
  category: string;
  requiresCustomerEmail?: boolean;
  archived?: boolean;
};

export const supplierSeoCatalogGeneratedAt = supplierSeoGeneratedAt;

// Retain fixture detail pages for noindex responses, not public discovery.
export const supplierSeoPageProducts =
  generatedSupplierSeoProducts as SupplierSeoProduct[];
const seenSeoSlugs = new Set<string>();
export const supplierSeoProducts = supplierSeoPageProducts.filter((product) => {
  if (isInternalTestListing(product)) return false;
  if (seenSeoSlugs.has(product.slug)) return false;
  seenSeoSlugs.add(product.slug);
  return true;
});

const bySlug = new Map(supplierSeoPageProducts.map((product) => [product.slug, product]));
const byCheckoutId = new Map(
  supplierSeoPageProducts.flatMap((product) => [
    [product.id, product] as const,
    [product.canonicalKey, product] as const,
  ]),
);

export function findSupplierSeoProduct(idOrSlug: string) {
  return bySlug.get(idOrSlug) || byCheckoutId.get(idOrSlug) || null;
}

/** Newly synced offers do not yet have generated static SEO pages. */
export function supplierCatalogHref(product: { id?: string | null; canonical_key?: string | null; name?: string | null }) {
  const key = String(product.canonical_key || product.id || '');
  const generated = byCheckoutId.get(key);
  return generated ? supplierProductHref(generated) : `/supplier-product?product=${encodeURIComponent(key)}`;
}

export { supplierProductHref, supplierProductSlug };
