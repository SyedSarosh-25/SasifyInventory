'use client';
import { LocalizedContent } from './language';


import { Filter, Search, WalletCards, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  isChatGptPlusProduct,
  supplierEquivalentProductName,
} from '../catalog-selection';
import { products as localProducts } from '../products';
import { supplierCatalogHref, supplierProductHref, supplierSeoProducts } from '../supplier-seo';
import { toolFamilyHref, toolFamilyLabel, toolFamilySlug } from '../tool-families';
import { cacheSupplierCatalog } from '../supplier-catalog-cache';
import { loadPublicCatalog } from '../public-catalog';
import { CategoryNavigation } from './category-navigation';
import { SupplierFeaturedCard, type FeaturedProduct } from './top-supplier-products';

type LiveSupplierProduct = {
  id: string;
  name: string;
  description?: string;
  price: number;
  original_price_pkr?: number | null;
  available: number;
  provider_name?: string;
  category?: string;
  logo_url?: string;
  canonical_key?: string;
  source?: string;
};

const seoInventory: FeaturedProduct[] = supplierSeoProducts.filter((product) => !product.archived).map((product) => ({
  id: product.id,
  name: product.name,
  description: product.description,
  price: product.price,
  original_price_pkr: product.original_price_pkr,
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

export function Catalog({ initialQuery = '', initialCategory = 'All', heading = 'Full inventory', family = '', introduction }: { initialQuery?: string; initialCategory?: string; heading?: string; family?: string; introduction?: ReactNode }) {
  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [sort, setSort] = useState('featured');
  const [stockFilter, setStockFilter] = useState('all');
  const [groupByTool, setGroupByTool] = useState(true);
  const [stockState, setStockState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [liveCatalogProducts, setLiveCatalogProducts] = useState<LiveSupplierProduct[]>([]);

  useEffect(() => {
    const syncQuery = () => {
      const params = new URLSearchParams(window.location.search);
      setQuery(params.get('q') ?? initialQuery);
      setActiveCategory(params.get('category') || initialCategory);
    };
    syncQuery();
    window.addEventListener('popstate', syncQuery);
    return () => window.removeEventListener('popstate', syncQuery);
  }, [initialQuery, initialCategory]);

  useEffect(() => {
    let active = true;
    loadPublicCatalog<LiveSupplierProduct>()
      .then((data: unknown) => {
        if (!data || typeof data !== 'object' || !('products' in data) || !Array.isArray(data.products)) throw new Error('Invalid stock response');
        const products = data.products as LiveSupplierProduct[];
        cacheSupplierCatalog(products);
        if (active) { setLiveCatalogProducts(products); setStockState('ready'); }
      })
      .catch(() => { if (active) setStockState('error'); })
      .finally(() => {
        active = false;
      });
    return () => {
      active = false;
    };
  }, []);

  const inventory = useMemo(() => {
    const liveSupplierProducts = liveCatalogProducts.filter((product) => product.source !== 'local');
    const liveLocalProducts = new Map(
      liveCatalogProducts
        .filter((product) => product.source === 'local')
        .map((product) => [product.id, product]),
    );
    const liveByKey = new Map(
      liveSupplierProducts.map((product) => [product.canonical_key || product.id, product]),
    );
    // The generated catalogue is a crawlable fallback. Once the live stock
    // response arrives, use its grouped canonical keys as the source of truth
    // so stale SEO entries cannot reintroduce rejected supplier duplicates.
    const sourceInventory = stockState === 'ready'
      ? seoInventory.filter((product) => liveByKey.has(product.canonical_key || product.id))
      : seoInventory;
    const generatedKeys = new Set(sourceInventory.map((product) => product.canonical_key || product.id));
    const supplierInventory = sourceInventory.map((product) => {
      const live = liveByKey.get(product.canonical_key || product.id);
      if (!live) return { ...product, stockVerified: false };
      return {
        ...product,
        stockVerified: true,
        price: Number.isFinite(live.price) ? live.price : product.price,
        original_price_pkr: live.original_price_pkr ?? null,
        available: Number.isFinite(live.available) ? live.available : product.available,
        description: live.description || product.description,
        provider_name: live.provider_name || product.provider_name,
        logo_url: live.logo_url || product.logo_url,
      };
    });
    if (stockState === 'ready') {
      for (const live of liveSupplierProducts) {
        const key = live.canonical_key || live.id;
        if (generatedKeys.has(key)) continue;
        supplierInventory.push({
          id: key,
          name: live.name,
          description: live.description || '',
          price: Number(live.price),
          original_price_pkr: live.original_price_pkr,
          available: Number(live.available),
          source: 'supplier',
          canonical_key: key,
          provider_name: live.provider_name,
          logo_url: live.logo_url,
          category: live.category || 'Other',
          href: supplierCatalogHref(live),
          stockVerified: true,
        });
      }
    }
    const localInventory: FeaturedProduct[] = localProducts.map((product) => {
      const live = liveLocalProducts.get(product.id);
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.sellingPricePkr,
        available: Number.isFinite(Number(live?.available))
          ? Number(live?.available)
          : 0,
        stockVerified: stockState === 'ready',
        source: 'local',
        category: product.category,
        localProduct: product,
        availability_mode: product.availabilityMode,
        requires_customer_email: product.requiresCustomerEmail,
        activation_sla: product.activationSla,
        preorder_date: product.preorderDate,
        stock_label: product.stockLabel,
      };
    });
    const visibleSupplierInventory = supplierInventory.filter(
      (product) =>
        !isChatGptPlusProduct(product.name) &&
        !localInventory.some((localProduct) =>
          supplierEquivalentProductName(localProduct.name, product.name),
        ),
    );
    return [...localInventory, ...visibleSupplierInventory];
  }, [liveCatalogProducts, stockState]);

  const categories = useMemo(
    () => ['All', ...new Set(inventory.map((product) => product.category).filter(Boolean) as string[])],
    [inventory],
  );

  const filtered = useMemo(
    () => inventory.filter((product) =>
      (!family || toolFamilySlug(product.name) === family) &&
      (activeCategory === 'All' || product.category === activeCategory) && matchesQuery(product, query)
      && (stockFilter === 'all' || (stockFilter === 'in' ? Number(product.available) > 0 : Number(product.available) <= 0)),
    ).sort((left, right) => sort === 'low' ? left.price - right.price : sort === 'high' ? right.price - left.price : sort === 'name' ? left.name.localeCompare(right.name) : 0),
    [activeCategory, family, inventory, query, sort, stockFilter],
  );
  const matchingFamily = !family && query.trim()
    ? inventory.find((product) => toolFamilySlug(product.name) === query.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'))
    : null;

  const displayGroups = useMemo(() => {
    if (!groupByTool) {
      return filtered.map((p) => ({ primary: p, variants: [p] }));
    }
    const groupsMap = new Map<string, FeaturedProduct[]>();
    for (const product of filtered) {
      const familySlug = toolFamilySlug(product.name);
      const groupKey = familySlug || product.id;
      if (!groupsMap.has(groupKey)) groupsMap.set(groupKey, []);
      groupsMap.get(groupKey)!.push(product);
    }
    const result: Array<{ primary: FeaturedProduct; variants: FeaturedProduct[] }> = [];
    for (const [, items] of groupsMap.entries()) {
      items.sort((a, b) => (a.price || 0) - (b.price || 0));
      const primary = items.find((i) => Number(i.available) > 0) || items[0];
      result.push({ primary, variants: items });
    }
    if (sort === 'low') {
      result.sort((a, b) => a.primary.price - b.primary.price);
    } else if (sort === 'high') {
      result.sort((a, b) => {
        const aMax = Math.max(...a.variants.map((v) => v.price || 0));
        const bMax = Math.max(...b.variants.map((v) => v.price || 0));
        return bMax - aMax;
      });
    } else if (sort === 'name') {
      result.sort((a, b) => a.primary.name.localeCompare(b.primary.name));
    }
    return result;
  }, [filtered, groupByTool, sort]);

  return (
    <LocalizedContent><section id="catalog" className="catalog-section">
      <div className="section-inner">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Sasify Solutions Inventory</span>
            <h1>{heading}</h1>
            <p>Every plan shows its access type, length and PKR price.</p>
          </div>
          <div className="results-badge" role="status">
            <Filter className="h-4 w-4" /> {groupByTool ? `${displayGroups.length} tools (${filtered.length} plans)` : `${filtered.length} products`}
          </div>
        </div>

        {introduction}
        <div className="catalog-controls">
          <CategoryNavigation categories={categories} activeCategory={activeCategory} onChange={setActiveCategory} />
          <label className="catalog-search">
            <Search className="h-4 w-4" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products, categories or features" aria-label="Search catalog" />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X className="h-4 w-4" /></button>}
          </label>
        </div>
        {matchingFamily && <a className="catalog-family-link" href={toolFamilyHref(matchingFamily.name)}>View all {toolFamilyLabel(toolFamilySlug(matchingFamily.name))} plans and prices →</a>}

        <div className="catalog-filter-row">
          <label>Sort by <select value={sort} onChange={event => setSort(event.target.value)}>
            <option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="name">Name: A–Z</option>
          </select></label>
          <label className={`catalog-stock-filter ${groupByTool ? 'is-active' : ''}`}>
            <input
              type="checkbox"
              checked={groupByTool}
              onChange={event => setGroupByTool(event.target.checked)}
            />
            <span>Group by Tool</span>
          </label>
          <label className={`catalog-stock-filter ${stockFilter === 'in' ? 'is-active' : ''}`}>
            <input
              type="checkbox"
              checked={stockFilter === 'in'}
              onChange={event => setStockFilter(event.target.checked ? 'in' : 'all')}
            />
            <span>In Stock Products Only</span>
          </label>
          <button type="button" className="catalog-reset" onClick={() => { setQuery(''); setActiveCategory(initialCategory); setSort('featured'); setStockFilter('all'); setGroupByTool(true); }}>Reset filters</button>
        </div>
        {stockState === 'error' && <p className="catalog-stock-status" role="status">Live stock updates could not be loaded. Supplier cards are disabled until stock can be confirmed.</p>}
        <p className="comparison-note">Savings compare the original price for the full plan duration with our price. Monthly references are multiplied by the number of months. Access and provider billing options may differ.</p>
        <p className="wallet-discount-notice">
          <WalletCards className="h-4 w-4" />
          <span>Save 5% with Sasify Wallet on eligible products. Claude Team preorders are excluded.</span>
        </p>

        <h2 className="catalog-plans-title">Available plans</h2>
        <div className="featured-grid catalog-featured-grid">
          {displayGroups.map((group) => (
            <SupplierFeaturedCard
              key={group.primary.id}
              product={group.primary}
              variants={group.variants}
            />
          ))}
        </div>

        {displayGroups.length === 0 && <div className="empty-state">
          <Search className="h-6 w-6" />
          <h2>No products found</h2>
          <p>Try another search or category.</p>
          <button type="button" onClick={() => { setQuery(''); setActiveCategory('All'); }}>Show all products</button>
        </div>}
      </div>
    </section></LocalizedContent>
  );
}
