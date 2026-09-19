export type SupplierCatalogStatusProduct = {
  id: string;
  name: string;
  provider_name?: string | null;
  provider_id?: string | null;
  external_product_id?: string | null;
  supplier_stock?: number | string | null;
  selling_price?: number | string | null;
  cost_pkr?: number | string | null;
  canonical_key?: string | null;
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

const duplicateNoise = new Set([
  'a', 'an', 'the', 'for', 'full', 'has', 'included', 'no', 'not', 'with',
  'without', 'warranty', 'nw', 'fw', 'preorder', 'pre',
]);

const durationUnit = /^(d|day|days|m|mo|month|months|y|year|years|w|week|weeks)$/;

function normalizedDuration(amount: number, unit: string) {
  if (['d', 'day', 'days'].includes(unit)) {
    return amount >= 28 && amount <= 31 ? 'duration:1m' : `duration:${amount}d`;
  }
  if (['m', 'mo', 'month', 'months'].includes(unit)) return `duration:${amount}m`;
  if (['y', 'year', 'years'].includes(unit)) return `duration:${amount}y`;
  return `duration:${amount}w`;
}

/**
 * Produces a conservative name key for finding repeated supplier offers.
 * Duration and warranty wording is intentionally ignored because suppliers
 * commonly describe the same offer differently (for example, 30D and 1M).
 */
export function supplierDuplicateKey(product: Pick<SupplierCatalogStatusProduct, 'name'>) {
  const tokens = String(product.name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const kept: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (duplicateNoise.has(token)) continue;
    const compactDuration = token.match(/^(\d+)(d|day|days|m|mo|month|months|y|year|years|w|week|weeks)$/);
    if (compactDuration) {
      kept.push(normalizedDuration(Number(compactDuration[1]), compactDuration[2]));
      continue;
    }
    if (/^\d+$/.test(token) && durationUnit.test(tokens[index + 1] || '')) {
      kept.push(normalizedDuration(Number(token), tokens[index + 1]));
      index += 1;
      continue;
    }
    if (durationUnit.test(token) && /^\d+$/.test(tokens[index - 1] || '')) continue;
    kept.push(token);
  }
  return kept.join(' ');
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
    const keys = [`name:${supplierDuplicateKey(product)}`];
    const canonicalKey = String((product as SupplierCatalogStatusProduct & { canonical_key?: string | null }).canonical_key || '').trim().toLowerCase();
    if (canonicalKey) keys.push(`canonical:${canonicalKey}`);
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
    const inStock = group.filter((product) => Number(product.supplier_stock || 0) > 0);
    const candidates = inStock.length ? inStock : group;
    const winner = [...candidates].sort((left, right) => {
      const leftCost = Number(left.cost_pkr ?? Number.POSITIVE_INFINITY);
      const rightCost = Number(right.cost_pkr ?? Number.POSITIVE_INFINITY);
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

export function duplicateSupplierIds(products: SupplierCatalogStatusProduct[]) {
  return new Set(
    supplierOfferGroups(products)
      .filter((group) => group.length > 1)
      .flatMap((group) => group.map((product) => product.id)),
  );
}
