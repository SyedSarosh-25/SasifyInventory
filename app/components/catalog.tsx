'use client';

import { ArrowRight, Filter, Search, Tag, X } from 'lucide-react';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { products, type Product } from '../products';
import { filterProducts, inferSupplierCategory, isChatGptPlusProduct, supplierEquivalentProductName } from '../catalog-selection';
import { isAnnualPlan, productHref, savingsPkr } from '../product-utils';
import { ProductLogo } from './product-logo';
import { Money, ProductOriginalPrice } from './currency';
import { CategoryNavigation } from './category-navigation';
import { supplierLogo, supplierMonogram } from '../supplier-product-utils';
import { cacheSupplierCatalog } from '../supplier-catalog-cache';

const categoryColors: Record<string, string> = {
  'API & Credit Packages': '#2563ff', 'AI Assistants & Research': '#7047eb',
  'AI Video, Image & Creative': '#ea4aa4', 'AI Coding & Development': '#00a6bb',
  'Productivity & Business': '#f08b32', 'Design & UI/UX': '#8754f3',
  'Education & Learning': '#20a66a', 'Entertainment & Streaming': '#ef426f',
  'VPN & Privacy': '#2574df', 'Professional & Career': '#145ec7', 'Other Tools': '#9b5bd2',
};

function ProductCard({ product }: { product: Product }) {
  const savings = savingsPkr(product);
  return <a className="product-card" href={productHref(product)}
    style={{ '--product-color': categoryColors[product.category] ?? '#2563ff' } as CSSProperties}>
    <div className="product-art">
      <div className="product-logo-frame"><ProductLogo product={product} /></div>
      <span className="product-category">{product.category}</span>
    </div>
    <div className="product-content">
      <div className="product-meta"><span>{product.duration}</span><span className="available"><i /> Available</span></div>
      {isAnnualPlan(product) && <span className="annual-card-note">One-time payment. No monthly payments.</span>}
      <h3>{product.name}</h3>
      <p className="product-description">{product.description}</p>
      <div className="price-panel">
        <div className="our-price"><span><Tag className="h-3.5 w-3.5" /> {product.contactOnly ? 'Pricing' : 'Our price'}</span><strong>{product.contactOnly ? 'Contact on WhatsApp' : <Money amount={product.sellingPricePkr} />}</strong></div>
        {!product.contactOnly && <div className="original-price"><span>Original price for plan</span><p><ProductOriginalPrice product={product} /></p></div>}
      </div>
      {!product.contactOnly && savings !== null && <p className="card-savings">Your Savings: <strong><Money amount={savings} /></strong></p>}
      <span className="buy-button">View details <ArrowRight className="h-4 w-4" /></span>
    </div>
  </a>;
}

type LiveSupplierProduct = { id:string; name:string; description?:string; price:number; available:number; provider_name?:string; category?:string; logo_url?:string };

function SupplierSearchCard({ product }: { product: LiveSupplierProduct }) {
  const logo = supplierLogo(product.name, product.logo_url);
  const category = product.category || inferSupplierCategory(product.name, product.description);
  return <a className="product-card supplier-search-card" href={`/supplier-product?product=${encodeURIComponent(product.id)}`}>
    <div className="product-art supplier-search-art"><div className="supplier-search-icon">{logo ? <img src={logo} alt={`${product.name} logo`} /> : <span className="product-monogram" aria-label={`${product.name} logo`}>{supplierMonogram(product.name)}</span>}</div><span className="product-category">{category}</span></div>
    <div className="product-content"><div className="product-meta"><span>Instant delivery</span><span className="available"><i /> {product.available} in stock</span></div><h3>{product.name}</h3><p className="product-description">{product.description || 'Product description is currently unavailable.'}</p><div className="price-panel"><div className="our-price"><span><Tag className="h-3.5 w-3.5" /> Our price</span><strong>PKR {Number(product.price).toLocaleString('en-PK')}</strong></div></div><span className="buy-button">Buy online <ArrowRight className="h-4 w-4" /></span></div>
  </a>;
}

export function Catalog({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState('All');
  const [supplierProducts, setSupplierProducts] = useState<LiveSupplierProduct[]>([]);
  const categories = useMemo(() => ['All', ...new Set([...products.map((product) => product.category), ...supplierProducts.map((product) => product.category || inferSupplierCategory(product.name, product.description))])], [supplierProducts]);
  useEffect(() => {
    const syncQuery = () => setQuery(new URLSearchParams(window.location.search).get('q') ?? initialQuery);
    syncQuery();
    window.addEventListener('popstate', syncQuery);
    return () => window.removeEventListener('popstate', syncQuery);
  }, [initialQuery]);
  useEffect(() => { let active = true; fetch('/api/commerce?action=stock',{cache:'no-store'}).then((response) => response.ok ? response.json() : Promise.reject()).then((data:any) => { cacheSupplierCatalog(data.products || []); if (active) setSupplierProducts((data.products || []).filter((product:LiveSupplierProduct & {source?:string}) => product.source === 'supplier')); }).catch(() => {}); return () => { active = false; }; }, []);
  const filtered = useMemo(() => filterProducts(query, activeCategory).filter((product) => !supplierProducts.some((supplier) => supplierEquivalentProductName(product.name, supplier.name))), [query, activeCategory, supplierProducts]);
  const supplierMatches = useMemo(() => { const normalized = query.trim().toLowerCase(); return supplierProducts.filter((product) => !isChatGptPlusProduct(product.name) && (activeCategory === 'All' || (product.category || inferSupplierCategory(product.name, product.description)) === activeCategory) && (!normalized || `${product.name} ${product.description || ''} ${product.provider_name || ''}`.toLowerCase().includes(normalized))); }, [query, activeCategory, supplierProducts]);

  return <section id="catalog" className="catalog-section">
    <div className="section-inner">
      <div className="section-heading">
        <div><span className="section-kicker">Sasify Solutions Inventory</span><h1>Full inventory</h1><p>Digital tools, plans and subscriptions.</p></div>
        <div className="results-badge" role="status"><Filter className="h-4 w-4" /> {filtered.length + supplierMatches.length} products</div>
      </div>
      <p className="comparison-note">Savings compare the original price for the full plan duration with our price. Monthly references are multiplied by the number of months. Access and provider billing options may differ.</p>
      <div className="catalog-controls">
        <label className="catalog-search">
          <Search className="h-4 w-4" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products, categories or features" aria-label="Search catalog" />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X className="h-4 w-4" /></button>}
        </label>
        <CategoryNavigation categories={categories} activeCategory={activeCategory} onChange={setActiveCategory} />
      </div>
      <div className="product-grid">{filtered.map((product) => <ProductCard key={product.id} product={product} />)}{supplierMatches.map((product) => <SupplierSearchCard key={product.id} product={product} />)}</div>
      {filtered.length === 0 && supplierMatches.length === 0 && <div className="empty-state">
        <Search className="h-6 w-6" /><h2>No products found</h2><p>Try another search or category.</p>
        <button type="button" onClick={() => { setQuery(''); setActiveCategory('All'); }}>Show all products</button>
      </div>}
    </div>
  </section>;
}
