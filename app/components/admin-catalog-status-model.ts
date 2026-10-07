import { supplierProductKey } from '../../commerce/supplier-matching.mjs';

export type SupplierCatalogStatusProduct = {
  id: string;
  name: string;
  description?: string | null;
  provider_name?: string | null;
  provider_id?: string | null;
  external_product_id?: string | null;
  supplier_stock?: number | string | null;
  selling_price?: number | string | null;
  original_price_pkr?: number | null;
  cost_pkr?: number | string | null;
  canonical_key?: string | null;
  canonical_manual?: boolean | null;
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

/**
 * Produces a conservative name key for finding repeated supplier offers.
 * Warranty wording is ignored; duration, plan type and credits are retained.
 */
export function supplierDuplicateKey(product: Pick<SupplierCatalogStatusProduct, 'name'>) {
  return supplierProductKey(product.name) || '';
}

export function supplierOfferGroups(products: SupplierCatalogStatusProduct[]) {
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    const current = parent.get(id);
    if (!current || current === id) return id;
    const root = find(current);
    parent.set(id, root);
    return root;
  };
  const union = (left: string, right: string) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parent.set(rightRoot, leftRoot);
  };
  const keyOwners = new Map<string, string>();
  for (const product of products) {
    parent.set(product.id, product.id);
    const nameKey = supplierDuplicateKey(product);
    const canonicalKey = String((product as SupplierCatalogStatusProduct & { canonical_key?: string | null }).canonical_key || '').trim().toLowerCase();
    // Manual mappings are explicit admin decisions. Automatic keys can be
    // stale after the matching algorithm changes, so derive them from names.
    const keys = canonicalKey && (product.canonical_manual === true || !canonicalKey.startsWith('auto:'))
      ? [`canonical:${canonicalKey}`]
      : [nameKey ? `name:${nameKey}` : `id:${product.id}`];
    for (const key of keys) {
      const owner = keyOwners.get(key);
      if (owner) union(product.id, owner);
      else keyOwners.set(key, product.id);
    }
  }
  const groups = new Map<string, SupplierCatalogStatusProduct[]>();
  for (const product of products) {
    const root = find(product.id);
    groups.set(root, [...(groups.get(root) || []), product]);
  }
  return [...groups.values()];
}

export function supplierOfferDecision(products: SupplierCatalogStatusProduct[]) {
  const winners = new Set<string>();
  const rejected = new Set<string>();
  const winnerByRejectedId = new Map<string, string>();
  for (const group of supplierOfferGroups(products)) {
    if (group.length === 1) {
      winners.add(group[0].id);
      continue;
    }
    const sellable = group.filter((product) => hasSupplierStock(product) && hasSellingPrice(product) && product.enabled === true);
    const inStock = group.filter(hasSupplierStock);
    const candidates = sellable.length ? sellable : inStock.length ? inStock : group;
    const winner = [...candidates].sort((left, right) => {
      const leftCost = Number(left.cost_pkr ?? left.wholesale_price ?? Number.POSITIVE_INFINITY);
      const rightCost = Number(right.cost_pkr ?? right.wholesale_price ?? Number.POSITIVE_INFINITY);
      return leftCost - rightCost || left.id.localeCompare(right.id);
    })[0];
    winners.add(winner.id);
    for (const product of group) {
      if (product.id === winner.id) continue;
      rejected.add(product.id);
      winnerByRejectedId.set(product.id, winner.id);
    }
  }
  return { winners, rejected, winnerByRejectedId };
}

export type SupplierCatalogGroup = {
  key: string;
  name: string;
  products: SupplierCatalogStatusProduct[];
  winner: SupplierCatalogStatusProduct | null;
  listed: boolean;
  inStock: boolean;
  unique: boolean;
  totalStock: number;
  providerNames: string[];
  cheapestCost: number | null;
  groupSellingPrice: number | null;
  groupOriginalPrice: number | null;
  groupDescription: string | null;
};

function lowestCostProduct(products: SupplierCatalogStatusProduct[]) {
  return [...products].sort((left, right) => {
    const leftCost = Number(left.cost_pkr ?? left.wholesale_price ?? Number.POSITIVE_INFINITY);
    const rightCost = Number(right.cost_pkr ?? right.wholesale_price ?? Number.POSITIVE_INFINITY);
    return leftCost - rightCost || left.id.localeCompare(right.id);
  })[0] || null;
}

/**
 * Creates the admin-facing product groups. A group is considered listed only
 * when an enabled, priced and in-stock supplier offer can actually appear in
 * the storefront. The winner follows the same lowest-cost/in-stock rule used
 * by the customer catalogue.
 */
export function supplierCatalogGroups(products: SupplierCatalogStatusProduct[]): SupplierCatalogGroup[] {
  return supplierOfferGroups(products).map((group) => {
    const inStock = group.filter(hasSupplierStock);
    const storefrontCandidates = group.filter(
      (product) => hasSupplierStock(product) && hasSellingPrice(product) && product.enabled === true,
    );
    const winner = lowestCostProduct(storefrontCandidates);
    const referenceProducts = inStock.length ? inStock : group;
    const costs = referenceProducts
      .map((product) => Number(product.cost_pkr))
      .filter((value) => Number.isFinite(value) && value >= 0);
    const prices = group
      .map((product) => Number(product.selling_price))
      .filter((value) => Number.isFinite(value) && value > 0);
    const distinctPrices = [...new Set(prices)];
    const origPrices = group
      .map((product) => product.original_price_pkr)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0);
    const distinctOrigPrices = [...new Set(origPrices)];
    const descriptions = [...new Set(group.map((product) => String(product.description || '').trim()))];
    const canonicalKey = String(group[0]?.canonical_key || '').trim().toLowerCase();
    const nameKey = supplierDuplicateKey(group[0] || { name: '' });
    return {
      key: canonicalKey && (group[0]?.canonical_manual === true || !canonicalKey.startsWith('auto:')) ? `canonical:${canonicalKey}` : `name:${nameKey || group[0]?.id}`,
      name: winner?.name || group[0]?.name || 'Unnamed product',
      products: group,
      winner,
      listed: Boolean(winner),
      inStock: inStock.length > 0,
      unique: group.length === 1,
      totalStock: group.reduce((total, product) => total + Math.max(0, Number(product.supplier_stock || 0)), 0),
      providerNames: [...new Set(group.map((product) => product.provider_name || product.provider_id || 'Supplier'))],
      cheapestCost: costs.length ? Math.min(...costs) : null,
      groupSellingPrice: distinctPrices.length === 1 ? distinctPrices[0] : null,
      groupOriginalPrice: distinctOrigPrices.length === 1 ? distinctOrigPrices[0] : (distinctOrigPrices.length > 0 ? distinctOrigPrices[0] : null),
      groupDescription: descriptions.length === 1 ? descriptions[0] : null,
    };
  });
}

export function duplicateSupplierIds(products: SupplierCatalogStatusProduct[]) {
  return new Set(
    supplierOfferGroups(products)
      .filter((group) => group.length > 1)
      .flatMap((group) => group.map((product) => product.id)),
  );
}
