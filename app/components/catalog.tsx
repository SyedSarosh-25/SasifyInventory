'use client';

import { Filter, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { supplierProductHref, supplierSeoProducts } from '../supplier-seo';
import { cacheSupplierCatalog } from '../supplier-catalog-cache';
import { CategoryNavigation } from './category-navigation';
import { SupplierFeaturedCard, type FeaturedProduct } from './top-supplier-products';

type LiveSupplierProduct = {
  id: string;
  name: string;
  description?: string;
  price: number;
  available: number;
  provider_name?: string;
  category?: string;
  logo_url?: string;
  canonical_key?: string;
  source?: string;
};

const seoInventory: FeaturedProduct[] = supplierSeoProducts.map((product) => ({
  id: product.id,
  name: product.name,
  description: product.description,
  price: product.price,
  available: product.available,
  source: 'supplier',
  canonical_key: product.canonicalKey,
  provider_name: product.providerName,
  logo_url: product.logoUrl,
  category: product.category,
  href: supplierProductHref(product),
}));

function matchesQuery(product: FeaturedProduct, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return [product.name, product.category, product.provider_name, product.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery);
}

export function Catalog({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState('All');
  const [liveSupplierProducts, setLiveSupplierProducts] = useState<LiveSupplierProduct[]>([]);

  useEffect(() => {
    const syncQuery = () => setQuery(new URLSearchParams(window.location.search).get('q') ?? initialQuery);
    syncQuery();
    window.addEventListener('popstate', syncQuery);
    return () => window.removeEventListener('popstate', syncQuery);
  }, [initialQuery]);

  useEffect(() => {
    let active = true;
    fetch('/api/commerce?action=stock', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => {
        const products = (data as { products?: LiveSupplierProduct[] }).products || [];
        cacheSupplierCatalog(products);
        if (active) setLiveSupplierProducts(products.filter((product) => product.source !== 'local'));
      })
      .catch(() => {})
      .finally(() => {
        active = false;
      });
    return () => {
      active = false;
    };
  }, []);

  const inventory = useMemo(() => {
    const liveByKey = new Map(
      liveSupplierProducts.map((product) => [product.canonical_key || product.id, product]),
    );
    // The generated catalogue is a crawlable fallback. Once the live stock
    // response arrives, use its grouped canonical keys as the source of truth
    // so stale SEO entries cannot reintroduce rejected supplier duplicates.
    const sourceInventory = liveSupplierProducts.length
      ? seoInventory.filter((product) => liveByKey.has(product.canonical_key || product.id))
      : seoInventory;
    return sourceInventory.map((product) => {
      const live = liveByKey.get(product.canonical_key || product.id);
      if (!live) return product;
      return {
        ...product,
        price: Number.isFinite(live.price) ? live.price : product.price,
        available: Number.isFinite(live.available) ? live.available : product.available,
        description: live.description || product.description,
        provider_name: live.provider_name || product.provider_name,
        logo_url: live.logo_url || product.logo_url,
      };
    });
  }, [liveSupplierProducts]);

  const categories = useMemo(
    () => ['All', ...new Set(inventory.map((product) => product.category).filter(Boolean) as string[])],
    [inventory],
  );

  const filtered = useMemo(
    () => inventory.filter((product) =>
      (activeCategory === 'All' || product.category === activeCategory) && matchesQuery(product, query),
    ),
    [activeCategory, inventory, query],
  );

  return (
    <section id="catalog" className="catalog-section">
      <div className="section-inner">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Sasify Solutions Inventory</span>
            <h1>Full inventory</h1>
            <p>Browse our complete SEO product catalog by category, then compare prices and access details.</p>
          </div>
          <div className="results-badge" role="status"><Filter className="h-4 w-4" /> {filtered.length} products</div>
        </div>

        <div className="catalog-controls">
          <CategoryNavigation categories={categories} activeCategory={activeCategory} onChange={setActiveCategory} />
          <label className="catalog-search">
            <Search className="h-4 w-4" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products, categories or features" aria-label="Search catalog" />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X className="h-4 w-4" /></button>}
          </label>
        </div>

        <p className="comparison-note">Savings compare the original price for the full plan duration with our price. Monthly references are multiplied by the number of months. Access and provider billing options may differ.</p>

        <div className="featured-grid catalog-featured-grid">
          {filtered.map((product) => <SupplierFeaturedCard key={product.id} product={product} />)}
        </div>

        {filtered.length === 0 && <div className="empty-state">
          <Search className="h-6 w-6" />
          <h2>No products found</h2>
          <p>Try another search or category.</p>
          <button type="button" onClick={() => { setQuery(''); setActiveCategory('All'); }}>Show all products</button>
        </div>}
      </div>
    </section>
  );
}
