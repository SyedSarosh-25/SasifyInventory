'use client';

import { ArrowRight, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { filterProducts, heroProducts, isChatGptPlusProduct, normalizeSearchText, supplierEquivalentProductName } from '../catalog-selection';
import { products } from '../products';
import { productHref } from '../product-utils';
import { supplierLogo, supplierMonogram } from '../supplier-product-utils';
import { Money } from './currency';
import { ProductLogo } from './product-logo';
import { cacheSupplierCatalog } from '../supplier-catalog-cache';

type LiveSupplierResult = { id:string; name:string; description?:string; price:number; available:number; provider_name?:string; logo_url?:string };

export function HeroProductSearch() {
  const [query, setQuery] = useState('');
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState('Search ');
  const [supplierProducts, setSupplierProducts] = useState<LiveSupplierResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const searching = query.trim().length > 0;
  const topSelling = useMemo(() => {
    const localChatGpt = products.find((product) => product.id === 'p093');
    const requested = [
      { label: 'CapCut', pattern: /capcut/i },
      { label: 'Grok', pattern: /grok/i },
    ];
    const selected = requested.map(({ label, pattern }) => {
      const product = supplierProducts.filter((item) => pattern.test(item.name) && item.available > 0).sort((left, right) => left.price - right.price)[0];
      return product ? { kind: 'supplier' as const, label, product } : null;
    }).filter(Boolean) as Array<{ kind: 'supplier'; label: string; product: LiveSupplierResult }>;
    const claude = heroProducts.find((product) => /claude/i.test(product.name));
    return [...(localChatGpt ? [{ kind: 'local' as const, label: 'ChatGPT Plus', product: localChatGpt }] : []), ...selected, ...(claude ? [{ kind: 'local' as const, label: 'Claude', product: claude }] : [])];
  }, [supplierProducts]);
  const matches = searching ? filterProducts(query, 'All').filter((product) => !supplierProducts.some((supplier) => supplierEquivalentProductName(product.name, supplier.name))) : [];
  const supplierMatches = searching ? supplierProducts.filter((product) => !isChatGptPlusProduct(product.name) && normalizeSearchText(`${product.name} ${product.id} ${product.provider_name || ''}`).includes(normalizeSearchText(query))) : [];

  useEffect(() => {
    const prompt = 'Search Claude';
    const prefixLength = 'Search '.length;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAnimatedPlaceholder(prompt);
      return;
    }

    let length = prefixLength;
    let direction: 1 | -1 = 1;
    let timer: ReturnType<typeof setTimeout>;
    const typePrompt = () => {
      length += direction;
      setAnimatedPlaceholder(prompt.slice(0, length));

      if (length === prompt.length) {
        direction = -1;
        timer = setTimeout(typePrompt, 1500);
        return;
      }
      if (length === prefixLength) {
        direction = 1;
        timer = setTimeout(typePrompt, 650);
        return;
      }
      timer = setTimeout(typePrompt, direction > 0 ? 105 : 60);
    };

    timer = setTimeout(typePrompt, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => { let active = true; fetch('/api/commerce?action=stock',{cache:'no-store'}).then((response) => response.ok ? response.json() : Promise.reject()).then((data:any) => { cacheSupplierCatalog(data.products || []); if (active) setSupplierProducts((data.products || []).filter((product:LiveSupplierResult & {source?:string}) => product.source === 'supplier')); }).catch(() => {}); return () => { active = false; }; }, []);

  function clearSearch() {
    setQuery('');
    inputRef.current?.focus();
  }

  return <div className="hero-discovery">
    <form className="hero-search" role="search" onSubmit={(event) => {
      event.preventDefault();
      if (searching) resultsRef.current?.focus();
      else inputRef.current?.focus();
    }}>
      <Search className="h-5 w-5" aria-hidden="true" />
      <input
        ref={inputRef}
        name="q"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Escape') clearSearch(); }}
        placeholder={animatedPlaceholder}
        aria-label="Search products"
        aria-controls="hero-product-results"
        autoComplete="off"
      />
      {query && <button className="hero-search-clear" type="button" onClick={clearSearch} aria-label="Clear search" title="Clear search"><X className="h-4 w-4" /></button>}
      <button type="submit" aria-label="Show matching products" title="Show matching products"><ArrowRight className="h-5 w-5" /></button>
    </form>

    <p className="hero-discovery-label" role="status" aria-live="polite" aria-atomic="true">
      {searching ? `${matches.length + supplierMatches.length} ${matches.length + supplierMatches.length === 1 ? 'product' : 'products'} found` : 'Top selling products'}
    </p>
    <div id="hero-product-results" ref={resultsRef} tabIndex={-1} aria-label={searching ? 'Matching products' : 'Top selling products'}>
      {searching ? <div className="hero-search-results">
        {matches.length + supplierMatches.length > 0 ? <ul>
          {matches.map((product) => <li key={product.id}>
            <a href={productHref(product)} className="hero-search-result">
              <span className="hero-mini-logo"><ProductLogo product={product} /></span>
              <span className="hero-result-copy"><strong>{product.name}</strong><small>{product.duration}</small></span>
              <strong className="hero-result-price"><Money amount={product.sellingPricePkr} /></strong>
              <ArrowRight className="h-4 w-4 hero-result-arrow" aria-hidden="true" />
              </a>
            </li>)}
          {supplierMatches.map((product) => <li key={product.id}>
            <a href={`/supplier-product?product=${encodeURIComponent(product.id)}`} className="hero-search-result">
              <span className="hero-mini-logo">{supplierLogo(product.name, product.logo_url) ? <img src={supplierLogo(product.name, product.logo_url)} alt={`${product.name} logo`} /> : supplierMonogram(product.name)}</span>
              <span className="hero-result-copy"><strong>{product.name}</strong><small>Instant delivery · {product.available} in stock</small></span>
              <strong className="hero-result-price">PKR {Number(product.price).toLocaleString('en-PK')}</strong>
              <ArrowRight className="h-4 w-4 hero-result-arrow" aria-hidden="true" />
            </a>
          </li>)}
        </ul> : <div className="hero-search-empty">
          <p>No matching products.</p>
          <button type="button" onClick={clearSearch}>Show top products</button>
        </div>}
      </div> : <nav className="hero-top-products" aria-label="Top selling products">
        {(topSelling.length ? topSelling : heroProducts.map((product) => ({ kind: 'local' as const, label: product.name, product }))).map((item) => <a key={item.kind === 'supplier' ? item.product.id : item.product.id} href={item.kind === 'supplier' ? `/supplier-product?product=${encodeURIComponent(item.product.id)}` : productHref(item.product)}>
          <span className="hero-mini-logo">{item.kind === 'supplier' ? (supplierLogo(item.product.name, item.product.logo_url) ? <img src={supplierLogo(item.product.name, item.product.logo_url)} alt={`${item.product.name} logo`} /> : supplierMonogram(item.product.name)) : <ProductLogo product={item.product} />}</span>
          <span>{item.label}</span>
        </a>)}
      </nav>}
    </div>
  </div>;
}
