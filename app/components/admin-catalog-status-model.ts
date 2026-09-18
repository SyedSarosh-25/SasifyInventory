export type SupplierCatalogStatusProduct = {
  id: string;
  name: string;
  provider_name?: string | null;
  provider_id?: string | null;
  external_product_id?: string | null;
  supplier_stock?: number | string | null;
  selling_price?: number | string | null;
  enabled?: boolean | null;
  wholesale_price?: number | string | null;
  currency?: string | null;
};

export type SupplierCatalogStatus =
  | 'live'
  | 'available-not-live'
  | 'published-unavailable'
  | 'unconfigured';

function hasSellingPrice(product: SupplierCatalogStatusProduct) {
  const price = Number(product.selling_price);
  return Number.isFinite(price) && price > 0;
}

function hasSupplierStock(product: SupplierCatalogStatusProduct) {
  const stock = Number(product.supplier_stock);
  return Number.isFinite(stock) && stock > 0;
}

export function supplierCatalogStatus(
  product: SupplierCatalogStatusProduct,
): SupplierCatalogStatus {
  const priced = hasSellingPrice(product);
  const inStock = hasSupplierStock(product);

  if (inStock && priced && product.enabled === true) return 'live';
  if (inStock && (!priced || product.enabled !== true)) return 'available-not-live';
  if (!inStock && priced) return 'published-unavailable';
  return 'unconfigured';
}

export function supplierStatusLabel(status: SupplierCatalogStatus) {
  if (status === 'live') return 'Live on website';
  if (status === 'available-not-live') return 'Available, not live';
  if (status === 'published-unavailable') return 'Published, supplier unavailable';
  return 'Needs setup';
}
