const cacheKey = 'sasify-supplier-catalog-v3';

export function readSupplierCatalogProduct<T extends { id: string }>(id: string) {
  if (typeof window === 'undefined') return null;
  try {
    const stored = JSON.parse(window.localStorage.getItem(cacheKey) || 'null');
    return Array.isArray(stored) ? (stored.find((product) => product && product.id === id) as T | undefined) || null : null;
  } catch {
    return null;
  }
}

export function cacheSupplierCatalog(products: unknown[]) {
  if (typeof window === 'undefined' || !Array.isArray(products)) return;
  try {
    window.localStorage.setItem(cacheKey, JSON.stringify(products));
  } catch {
    // Storage is optional; the live backend request remains the source of truth.
  }
}
