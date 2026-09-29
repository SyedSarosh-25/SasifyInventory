const cacheKey = 'sasify-supplier-catalog-v4';

export function readSupplierCatalogProduct<T extends { id: string }>(id: string) {
  if (typeof window === 'undefined') return null;
  try {
    const stored = JSON.parse(window.localStorage.getItem(cacheKey) || 'null');
    return stored && Date.now() < stored.expiresAt && Array.isArray(stored.products)
      ? (stored.products.find((product: T) => product && product.id === id) as T | undefined) || null : null;
  } catch {
    return null;
  }
}

export function cacheSupplierCatalog(products: unknown[]) {
  if (typeof window === 'undefined' || !Array.isArray(products)) return;
  try {
    window.localStorage.setItem(cacheKey, JSON.stringify({ expiresAt: Date.now() + 30_000, products }));
  } catch {
    // Storage is optional; the live backend request remains the source of truth.
  }
}
