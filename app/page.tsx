'use client';

import {
  ArrowDown,
  BadgeCheck,
  ExternalLink,
  Filter,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import { useMemo, useState, type CSSProperties } from 'react';
import { products, type Product } from './products';

const phoneNumber = '923116185711';
const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];
const lowestPrice = Math.min(...products.map((p) => p.sellingPricePkr));

const categoryColors: Record<string, string> = {
  'API & Credit Packages': '#00d5ff',
  'AI Assistants & Research': '#9b7bff',
  'AI Video, Image & Creative': '#ff4f9a',
  'AI Coding & Development': '#3ee6a8',
  'Productivity & Business': '#ffb020',
  'Design & UI/UX': '#ff725e',
  'Education & Learning': '#93e43f',
  'Entertainment & Streaming': '#ff3f5f',
  'VPN & Privacy': '#37a7ff',
  'Professional & Career': '#20d7c5',
  'Other Tools': '#f7cf4f',
};

function formatPkr(value: number) {
  return `PKR ${value.toLocaleString('en-PK')}`;
}

function whatsappLink(productName: string) {
  const text = `Hi, I want to buy ${productName} from Sasify Solutions Inventory. Please share availability and payment details.`;
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(text)}`;
}

function initials(name: string) {
  return name
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function productLogoUrl(product: Product) {
  if (!product.sourceUrl) return '';
  return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(product.sourceUrl)}&sz=128`;
}

function ProductArtwork({ product }: { product: Product }) {
  const color = categoryColors[product.category] ?? '#00d5ff';
  const logoUrl = productLogoUrl(product);

  return (
    <div
      className="product-art"
      style={{ '--product-color': color } as CSSProperties}
    >
      <div className="product-art-grid" aria-hidden="true" />
      <div className="product-logo-stage">
        <span className="product-monogram" aria-hidden="true">
          {initials(product.name)}
        </span>
        {logoUrl && (
          <img
            src={logoUrl}
            alt={`${product.name} product logo`}
            className="product-logo"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        )}
      </div>
      <span className="product-art-category">{product.category}</span>
    </div>
  );
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory =
        activeCategory === 'All' || product.category === activeCategory;
      const haystack = [
        product.name,
        product.category,
        product.duration,
        product.description,
      ]
        .join(' ')
        .toLowerCase();
      return matchesCategory && (!needle || haystack.includes(needle));
    });
  }, [activeCategory, query]);

  return (
    <main className="min-h-screen bg-[var(--site-bg)] text-[var(--ink)]">
      <header className="hero-shell">
        <div className="hero-image" aria-hidden="true" />
        <div className="hero-shade" aria-hidden="true" />

        <div className="relative z-10 mx-auto flex min-h-[88svh] max-w-7xl flex-col px-5 pb-10 pt-5 sm:px-8 sm:pt-7 lg:min-h-[760px]">
          <nav className="flex items-center justify-between gap-4">
            <a href="#catalog" className="flex min-w-0 items-center gap-3 text-white">
              <span className="brand-cube" aria-hidden="true">S</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold sm:text-base">Sasify Solutions</span>
                <span className="block text-xs text-white/60">Digital inventory</span>
              </span>
            </a>
            <a
              href={`https://wa.me/${phoneNumber}`}
              className="top-whatsapp"
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Chat on WhatsApp</span>
              <span className="sm:hidden">WhatsApp</span>
            </a>
          </nav>

          <div className="my-auto max-w-[660px] py-14 text-white sm:py-20">
            <div className="eyebrow">
              <Sparkles className="h-4 w-4" />
              Premium digital deals
            </div>
            <h1 className="mt-5 text-[clamp(2.7rem,7vw,5.8rem)] font-black leading-[0.94]">
              Sasify Solutions Inventory
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/72 sm:text-lg">
              Explore trusted software, AI tools, subscriptions and credits at
              clearly listed PKR prices. Find your product and order directly on WhatsApp.
            </p>

            <div className="hero-search mt-8">
              <Search className="h-5 w-5 shrink-0 text-[var(--electric)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search 92 digital products"
                aria-label="Search products"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} className="icon-action" aria-label="Clear search" title="Clear search">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/72">
              <span className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-[var(--lime)]" />
                {products.length} products
              </span>
              <span className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-[var(--coral)]" />
                {categories.length - 1} categories
              </span>
              <span className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-[var(--gold)]" />
                From {formatPkr(lowestPrice)}
              </span>
            </div>
          </div>

          <a href="#catalog" className="scroll-cue">
            Browse the inventory
            <ArrowDown className="h-4 w-4" />
          </a>
        </div>
      </header>

      <section id="catalog" className="catalog-section">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
          <div className="catalog-heading">
            <div>
              <p className="section-kicker">Full collection</p>
              <h2 className="mt-2 text-3xl font-black sm:text-4xl">Choose your next tool</h2>
            </div>
            <div className="trust-note">
              <ShieldCheck className="h-5 w-5 text-[var(--mint)]" />
              <span>Quick ordering through WhatsApp</span>
            </div>
          </div>

          <div className="catalog-controls">
            <label className="catalog-search">
              <Search className="h-4 w-4 text-[var(--muted-text)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products, categories or features"
                aria-label="Search catalog"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} className="icon-action" aria-label="Clear search" title="Clear search">
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>
            <div className="result-count">
              <Filter className="h-4 w-4" />
              {filteredProducts.length} products
            </div>
          </div>

          <div className="category-strip" aria-label="Product categories">
            {categories.map((category) => (
              <button
                type="button"
                key={category}
                onClick={() => setActiveCategory(category)}
                className={activeCategory === category ? 'category-active' : ''}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="product-grid">
            {filteredProducts.map((product) => {
              const color = categoryColors[product.category] ?? '#00d5ff';
              return (
                <article
                  key={product.id}
                  className="product-card"
                  style={{ '--product-color': color } as CSSProperties}
                >
                  <ProductArtwork product={product} />

                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="duration-pill">{product.duration}</span>
                      <span className="stock-state"><span aria-hidden="true" /> Available</span>
                    </div>

                    <h3 className="mt-4 text-xl font-extrabold leading-snug">{product.name}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted-text)]">
                      {product.description}
                    </p>

                    <div className="price-panel mt-5">
                      <div>
                        <span className="price-label"><Tag className="h-3.5 w-3.5" /> Our price</span>
                        <strong>{formatPkr(product.sellingPricePkr)}</strong>
                      </div>
                      <div className="original-price">
                        <span>Original price</span>
                        <p>{product.originalPrice}</p>
                        {product.sourceUrl && (
                          <a href={product.sourceUrl} target="_blank" rel="noreferrer" title="View official price source">
                            Official source <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    <a href={whatsappLink(product.name)} target="_blank" rel="noreferrer" className="buy-button mt-5">
                      <MessageCircle className="h-4 w-4" />
                      Buy now
                    </a>
                  </div>
                </article>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="empty-state">
              <Search className="mx-auto h-7 w-7 text-[var(--electric)]" />
              <h3 className="mt-3 text-xl font-bold">No products found</h3>
              <p className="mt-2 text-sm text-[var(--muted-text)]">
                Try another search term or select a different category.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setActiveCategory('All');
                }}
                className="reset-button"
              >
                Show all products
              </button>
            </div>
          )}

          <div className="catalog-footnote">
            <ShieldCheck className="h-5 w-5 shrink-0 text-[var(--electric)]" />
            <p>
              Original prices are public reference prices from official or provider
              pages and may change by country, taxes, plan term, seats, credits or
              promotions. Final availability is confirmed on WhatsApp before purchase.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
