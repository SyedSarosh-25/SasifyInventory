import { isInternalTestListing } from './product-visibility.ts';

type CatalogResponse<T> = { ready: boolean; products: T[]; productCount: number };
const storageKey = 'sasify-public-catalog-v3';
const ttlMs = 30_000;
let cached: { expiresAt: number; data: CatalogResponse<unknown> } | null = null;
let pending: Promise<CatalogResponse<unknown>> | null = null;
let generation = 0;

export function invalidatePublicCatalog() {
  generation++;
  cached = null;
  pending = null;
  if (typeof window !== 'undefined') {
    try { window.sessionStorage.removeItem(storageKey); } catch { /* Optional storage. */ }
  }
}

export async function loadPublicCatalog<T>(): Promise<CatalogResponse<T>> {
  const now = Date.now();
  if (!cached && typeof window !== 'undefined') {
    try {
      const stored = JSON.parse(window.sessionStorage.getItem(storageKey) || 'null');
      if (stored && Number.isFinite(stored.expiresAt) && stored.expiresAt <= now + ttlMs && Array.isArray(stored.data?.products)) cached = stored;
    } catch { /* Storage is optional. */ }
  }
  if (cached && now < cached.expiresAt) return cached.data as CatalogResponse<T>;
  if (pending) return pending as Promise<CatalogResponse<T>>;
  const version = generation;
  const request = fetch('/api/commerce?action=catalog&view=summary')
    .then(async response => {
      if (!response.ok) throw new Error('Could not load product catalog.');
      const data = await response.json() as CatalogResponse<unknown>;
      if (!Array.isArray(data.products)) throw new Error('Invalid catalog response.');
      data.products = data.products.filter((product) => !isInternalTestListing(product as { name?: string; slug?: string }));
      data.productCount = data.products.length;
      if (version === generation) {
        cached = { expiresAt: Date.now() + ttlMs, data };
        if (typeof window !== 'undefined') {
          try { window.sessionStorage.setItem(storageKey, JSON.stringify(cached)); } catch { /* Optional storage. */ }
        }
      }
      return data;
    }).finally(() => { if (pending === request) pending = null; });
  pending = request;
  return request as Promise<CatalogResponse<T>>;
}
