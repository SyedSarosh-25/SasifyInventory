'use client';

import {
  ExternalLink,
  Filter,
  MessageCircle,
  Search,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { products } from './products';

const phoneNumber = '923116185711';
const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];
const lowestPrice = Math.min(...products.map((p) => p.sellingPricePkr));

function formatPkr(value: number) {
  return `PKR ${value.toLocaleString('en-PK')}`;
}

function whatsappLink(productName: string) {
  const text = `Hi, I want to buy ${productName}. Please share availability and payment details.`;
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(text)}`;
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
      <section className="border-b border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_340px] lg:py-10">
          <div className="flex min-w-0 flex-col justify-between gap-8">
            <nav className="flex items-center justify-between gap-4">
              <a href="#catalog" className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-md bg-[var(--ink)] text-sm font-bold text-white">
                  ST
                </span>
                <span>
                  <span className="block text-sm font-semibold">
                    Smart TechOne
                  </span>
                  <span className="block text-xs text-[var(--muted-text)]">
                    Premium digital inventory
                  </span>
                </span>
              </a>
              <a
                href={`https://wa.me/${phoneNumber}`}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--green)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--green-dark)]"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </nav>

            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase text-[var(--accent)]">
                Client price list
              </p>
              <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                Digital subscriptions, tools, and credits with listed PKR
                prices.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted-text)] sm:text-lg">
                Browse the full inventory, compare each listed price with a
                public official price reference, then tap Buy now to start a
                WhatsApp order.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-[var(--line)] bg-white p-4">
                <span className="text-2xl font-semibold">{products.length}</span>
                <p className="mt-1 text-sm text-[var(--muted-text)]">Products</p>
              </div>
              <div className="rounded-lg border border-[var(--line)] bg-white p-4">
                <span className="text-2xl font-semibold">
                  {categories.length - 1}
                </span>
                <p className="mt-1 text-sm text-[var(--muted-text)]">Categories</p>
              </div>
              <div className="rounded-lg border border-[var(--line)] bg-white p-4">
                <span className="text-2xl font-semibold">
                  {formatPkr(lowestPrice)}
                </span>
                <p className="mt-1 text-sm text-[var(--muted-text)]">Starting at</p>
              </div>
            </div>
          </div>

          <aside className="self-end rounded-lg border border-[var(--line)] bg-[var(--cream)] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-[var(--green)]" />
              Fast purchase flow
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--muted-text)]">
              Every product button opens WhatsApp with the exact product name
              already added to the message, so buyers can ask for availability
              without searching again.
            </p>
            <a
              href="#catalog"
              className="mt-5 inline-flex h-10 items-center justify-center rounded-md border border-[var(--ink)] px-4 text-sm font-semibold transition hover:bg-[var(--ink)] hover:text-white"
            >
              View catalog
            </a>
          </aside>
        </div>
      </section>

      <section id="catalog" className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="sticky top-0 z-20 -mx-5 border-b border-[var(--line)] bg-[var(--site-bg)]/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-text)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products, categories, or descriptions"
                className="h-12 w-full rounded-md border border-[var(--line)] bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-[var(--muted-text)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]"
              />
            </label>
            <div className="flex items-center gap-2 text-sm text-[var(--muted-text)]">
              <Filter className="h-4 w-4" />
              {filteredProducts.length} matching products
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {categories.map((category) => (
              <button
                type="button"
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`h-9 shrink-0 rounded-md border px-3 text-sm font-medium transition ${
                  activeCategory === category
                    ? 'border-[var(--ink)] bg-[var(--ink)] text-white'
                    : 'border-[var(--line)] bg-white text-[var(--muted-text)] hover:border-[var(--accent)] hover:text-[var(--ink)]'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => (
            <article
              key={product.id}
              className="flex min-h-[330px] flex-col rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-md bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--accent)]">
                  {product.category}
                </span>
                <span className="shrink-0 rounded-md bg-[var(--cream)] px-2.5 py-1 text-xs font-semibold text-[var(--muted-text)]">
                  {product.duration}
                </span>
              </div>

              <h2 className="mt-4 text-xl font-semibold leading-snug">
                {product.name}
              </h2>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--muted-text)]">
                {product.description}
              </p>

              <div className="mt-5 grid gap-3">
                <div className="rounded-md border border-[var(--line)] bg-[var(--site-bg)] p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--muted-text)]">
                    <Tag className="h-3.5 w-3.5" />
                    Listed price
                  </div>
                  <p className="mt-1 text-2xl font-semibold">
                    {formatPkr(product.sellingPricePkr)}
                  </p>
                </div>
                <div className="rounded-md border border-[var(--line)] p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--muted-text)]">
                    Original price reference
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-5">
                    {product.originalPrice}
                  </p>
                  {product.sourceUrl && (
                    <a
                      href={product.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline"
                    >
                      Source
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>

              <div className="mt-auto pt-5">
                <a
                  href={whatsappLink(product.name)}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--green)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--green-dark)]"
                >
                  <MessageCircle className="h-4 w-4" />
                  Buy now
                </a>
              </div>
            </article>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="mt-12 rounded-lg border border-dashed border-[var(--line)] bg-white p-10 text-center">
            <h2 className="text-xl font-semibold">No products found</h2>
            <p className="mt-2 text-sm text-[var(--muted-text)]">
              Try another search term or choose a different category.
            </p>
          </div>
        )}

        <p className="mt-8 text-xs leading-6 text-[var(--muted-text)]">
          Original prices are public reference prices from official or provider
          pricing pages and can change by country, taxes, plan term, seats,
          credits, or promotional availability. Final availability is confirmed
          on WhatsApp before purchase.
        </p>
      </section>
    </main>
  );
}
