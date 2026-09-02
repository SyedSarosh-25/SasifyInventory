'use client';

import { ArrowRight, Filter, Search, Tag, X } from 'lucide-react';
import { useMemo, useState, type CSSProperties } from 'react';
import { products, type Product } from '../products';
import { filterProducts } from '../catalog-selection';
import { isAnnualPlan, productHref, savingsPkr } from '../product-utils';
import { ProductLogo } from './product-logo';
import { Money, ProductOriginalPrice } from './currency';

const categories = ['All', ...new Set(products.map((product) => product.category))];
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
        <div className="our-price"><span><Tag className="h-3.5 w-3.5" /> Our price</span><strong><Money amount={product.sellingPricePkr} /></strong></div>
        <div className="original-price"><span>Original price for plan</span><p><ProductOriginalPrice product={product} /></p></div>
      </div>
      {savings !== null && <p className="card-savings">Your Savings: <strong><Money amount={savings} /></strong></p>}
      <span className="buy-button">View details <ArrowRight className="h-4 w-4" /></span>
    </div>
  </a>;
}

export function Catalog({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState('All');
  const filtered = useMemo(() => filterProducts(query, activeCategory), [query, activeCategory]);

  return <section id="catalog" className="catalog-section">
    <div className="section-inner">
      <div className="section-heading">
        <div><span className="section-kicker">Sasify Solutions Inventory</span><h1>Full inventory</h1><p>Digital tools, plans and subscriptions.</p></div>
        <div className="results-badge" role="status"><Filter className="h-4 w-4" /> {filtered.length} products</div>
      </div>
      <p className="comparison-note">Savings compare the original price for the full plan duration with our price. Monthly references are multiplied by the number of months. Access and provider billing options may differ.</p>
      <div className="catalog-controls">
        <label className="catalog-search">
          <Search className="h-4 w-4" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products, categories or features" aria-label="Search catalog" />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X className="h-4 w-4" /></button>}
        </label>
        <div className="category-strip" aria-label="Product categories">
          {categories.map((category) => <button type="button" key={category} onClick={() => setActiveCategory(category)}
            aria-pressed={activeCategory === category} className={activeCategory === category ? 'active' : ''}>{category}</button>)}
        </div>
      </div>
      <div className="product-grid">{filtered.map((product) => <ProductCard key={product.id} product={product} />)}</div>
      {filtered.length === 0 && <div className="empty-state">
        <Search className="h-6 w-6" /><h2>No products found</h2><p>Try another search or category.</p>
        <button type="button" onClick={() => { setQuery(''); setActiveCategory('All'); }}>Show all products</button>
      </div>}
    </div>
  </section>;
}
