import {
  supplierSeoGeneratedAt,
  supplierSeoProducts as generatedSupplierSeoProducts,
} from './supplier-seo-products.generated.ts';
import {
  supplierProductHref,
  supplierProductSlug,
} from './supplier-seo-utils.ts';

export type SupplierSeoProduct = {
  id: string;
  slug: string;
  canonicalKey: string;
  name: string;
  description: string;
  deliveryInstruction?: string;
  price: number;
  available: number;
  providerId?: string;
  providerName?: string;
  logoUrl?: string;
  category: string;
  requiresCustomerEmail?: boolean;
};

export const supplierSeoCatalogGeneratedAt = supplierSeoGeneratedAt;

export const supplierSeoProducts =
  generatedSupplierSeoProducts as SupplierSeoProduct[];

const bySlug = new Map(supplierSeoProducts.map((product) => [product.slug, product]));
const byCheckoutId = new Map(
  supplierSeoProducts.flatMap((product) => [
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
