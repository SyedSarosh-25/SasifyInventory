'use client';

import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  ExternalLink,
  Filter,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Star,
  Tag,
  X,
} from 'lucide-react';
import { useMemo, useState, type CSSProperties } from 'react';
import { products, type Product } from './products';

const phoneNumber = '923116185711';
const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];
const lowestPrice = Math.min(...products.map((p) => p.sellingPricePkr));
const googleReviewsUrl =
  'https://www.google.com/maps/place/Sasify+Digital+Solutions/@33.5298115,73.1663875,16z/data=!4m18!1m9!3m8!1s0x38dfed9bda8bf345:0xb57a60ba54b9be1e!2sSasify+Digital+Solutions!8m2!3d33.5298115!4d73.1663875!9m1!1b1!16s%2Fg%2F11yzclp9ps!3m7!1s0x38dfed9bda8bf345:0xb57a60ba54b9be1e!8m2!3d33.5298115!4d73.1663875!9m1!1b1!16s%2Fg%2F11yzclp9ps!18m1!1e1?entry=ttu';

const categoryColors: Record<string, string> = {
  'API & Credit Packages': '#2563ff',
  'AI Assistants & Research': '#7047eb',
  'AI Video, Image & Creative': '#ea4aa4',
  'AI Coding & Development': '#00a6bb',
  'Productivity & Business': '#f08b32',
  'Design & UI/UX': '#8754f3',
  'Education & Learning': '#20a66a',
  'Entertainment & Streaming': '#ef426f',
  'VPN & Privacy': '#2574df',
  'Professional & Career': '#145ec7',
  'Other Tools': '#9b5bd2',
};

const orbitTools = [
  { name: 'Figma', domain: 'figma.com', className: 'orbit-figma' },
  { name: 'CapCut', domain: 'capcut.com', className: 'orbit-capcut' },
  { name: 'ChatGPT', domain: 'openai.com', className: 'orbit-chatgpt' },
  { name: 'Claude', domain: 'anthropic.com', className: 'orbit-claude' },
  { name: 'Cursor', domain: 'cursor.com', className: 'orbit-cursor' },
  { name: 'Gemini', domain: 'gemini.google.com', className: 'orbit-gemini' },
];

const reviews = [
  {
    name: 'Haider Ali',
    time: 'A month ago',
    quote:
      'They were very helpful, kind, and professional. Everything was handled smoothly.',
  },
  {
    name: 'Laiba Aamir',
    time: '2 months ago',
    quote:
      'They understood exactly what I needed and delivered a solution that exceeded my expectations.',
  },
  {
    name: 'AQIB IJAZ',
    time: '2 months ago',
    quote:
      'A very trustable man. I have been using their services from previous few months. Highly satisfying.',
  },
  {
    name: 'Mouhib Amin',
    time: '2 months ago',
    quote:
      'Quickly responded to my situation and gave me my account promptly. Smoothest onboarding I have had with buying a service.',
  },
  {
    name: 'alex',
    time: '3 weeks ago',
    quote:
      'Very trusted and reliable, delivered exactly what was finalized. Great service, recommended.',
  },
  {
    name: 'Asim Ali',
    time: 'A month ago',
    quote:
      'Genuine person and excellent service with affordable price, highly recommended.',
  },
];

function formatPkr(value: number) {
  return `PKR ${value.toLocaleString('en-PK')}`;
}

function whatsappLink(productName?: string) {
  const text = productName
    ? `Hi, I want to buy ${productName} from Sasify Solutions Inventory. Please share availability and payment details.`
    : 'Hi, I would like help choosing a digital product from Sasify Solutions.';
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

function favicon(domainOrUrl: string) {
  return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(domainOrUrl)}&sz=128`;
}

function ProductArtwork({ product }: { product: Product }) {
  const color = categoryColors[product.category] ?? '#2563ff';
  const logoUrl = product.sourceUrl ? favicon(product.sourceUrl) : '';

  return (
    <div
      className="product-art"
      style={{ '--product-color': color } as CSSProperties}
    >
      <div className="product-logo-frame">
        <span className="product-monogram" aria-hidden="true">
          {initials(product.name)}
        </span>
        {logoUrl && (
          <img
            src={logoUrl}
            alt={`${product.name} logo`}
            className="product-logo"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        )}
      </div>
      <span className="product-category">{product.category}</span>
    </div>
  );
}

function Stars() {
  return (
    <span className="stars" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} className="h-4 w-4" fill="currentColor" />
      ))}
    </span>
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
      const searchable = [
        product.name,
        product.category,
        product.duration,
        product.description,
      ]
        .join(' ')
        .toLowerCase();
      return matchesCategory && (!needle || searchable.includes(needle));
    });
  }, [activeCategory, query]);

  return (
    <main>
      <header className="site-header">
        <nav className="nav-inner" aria-label="Main navigation">
          <a href="#top" className="brand">
            <img src="/sasify-logo.png" alt="Sasify Solutions logo" />
            <span className="brand-name">
              <strong>SASIFY</strong>
              <small>SOLUTIONS</small>
            </span>
            <span className="brand-line" />
            <span className="brand-tagline">Digital tools.<br />Human support.</span>
          </a>

          <div className="nav-links">
            <a href="#catalog">Tools</a>
            <a href="#reviews">Reviews</a>
            <a href="#faq">FAQ</a>
            <a href="#contact">Contact</a>
          </div>

          <div className="nav-actions">
            <span className="currency">PKR</span>
            <a href="#catalog" className="primary-button compact">
              Browse tools <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </nav>
      </header>

      <section id="top" className="hero">
        <div className="hero-accent" aria-hidden="true" />
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="hero-kicker">
              <ShieldCheck className="h-4 w-4" />
              Trusted digital marketplace
            </span>
            <h1>
              Your one-stop destination
              <span>for all digital needs</span>
            </h1>
            <p>
              Access leading AI, coding, design, productivity and SaaS tools
              with clear pricing, quick activation and human support.
            </p>

            <label className="hero-search">
              <Search className="h-5 w-5" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search ChatGPT, Claude, Canva, Cursor..."
                aria-label="Search products"
              />
              {query ? (
                <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <a href="#catalog" aria-label="Go to catalog">
                  <ArrowRight className="h-5 w-5" />
                </a>
              )}
            </label>

            <div className="hero-categories">
              {['All Tools', 'AI Tools', 'Productivity', 'Design', 'Video'].map(
                (label, index) => (
                  <a key={label} href="#catalog" className={index === 0 ? 'active' : ''}>
                    {label}
                  </a>
                ),
              )}
            </div>

            <div className="hero-actions">
              <a href="#catalog" className="primary-button">
                View all products <ArrowRight className="h-4 w-4" />
              </a>
              <a href={whatsappLink()} target="_blank" rel="noreferrer" className="secondary-button">
                <MessageCircle className="h-4 w-4" /> Request a tool
              </a>
            </div>
          </div>

          <div className="brand-constellation" aria-label="Popular digital tools">
            <div className="constellation-ring ring-one" aria-hidden="true" />
            <div className="constellation-ring ring-two" aria-hidden="true" />
            <div className="center-logo">
              <img src="/sasify-logo.png" alt="Sasify Solutions" />
            </div>
            {orbitTools.map((tool) => (
              <div key={tool.name} className={`orbit-tool ${tool.className}`}>
                <div className="orbit-position">
                  <div className="orbit-content">
                    <span>
                      <img src={favicon(tool.domain)} alt="" />
                    </span>
                    <small>{tool.name}</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-proof">
          <span><BadgeCheck className="h-4 w-4" /> {products.length} products</span>
          <span><BadgeCheck className="h-4 w-4" /> Starting at {formatPkr(lowestPrice)}</span>
          <a href={googleReviewsUrl} target="_blank" rel="noreferrer">
            <Stars /> 5.0 from 148 Google reviews
          </a>
        </div>
      </section>

      <section id="catalog" className="catalog-section">
        <div className="section-inner">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Explore the inventory</span>
              <h2>Digital tools for every workflow</h2>
              <p>Compare our PKR prices with public original price references.</p>
            </div>
            <div className="results-badge">
              <Filter className="h-4 w-4" /> {filteredProducts.length} products
            </div>
          </div>

          <div className="catalog-controls">
            <label className="catalog-search">
              <Search className="h-4 w-4" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products, categories or features"
                aria-label="Search catalog"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>
            <div className="category-strip">
              {categories.map((category) => (
                <button
                  type="button"
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={activeCategory === category ? 'active' : ''}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="product-grid">
            {filteredProducts.map((product) => {
              const color = categoryColors[product.category] ?? '#2563ff';
              return (
                <article
                  key={product.id}
                  className="product-card"
                  style={{ '--product-color': color } as CSSProperties}
                >
                  <ProductArtwork product={product} />
                  <div className="product-content">
                    <div className="product-meta">
                      <span>{product.duration}</span>
                      <span className="available"><i /> Available</span>
                    </div>
                    <h3>{product.name}</h3>
                    <p className="product-description">{product.description}</p>
                    <div className="price-panel">
                      <div className="our-price">
                        <span><Tag className="h-3.5 w-3.5" /> Our price</span>
                        <strong>{formatPkr(product.sellingPricePkr)}</strong>
                      </div>
                      <div className="original-price">
                        <span>Original price</span>
                        <p>{product.originalPrice}</p>
                        {product.sourceUrl && (
                          <a href={product.sourceUrl} target="_blank" rel="noreferrer">
                            Verify price <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    <a href={whatsappLink(product.name)} target="_blank" rel="noreferrer" className="buy-button">
                      <MessageCircle className="h-4 w-4" /> Buy now
                    </a>
                  </div>
                </article>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="empty-state">
              <Search className="h-6 w-6" />
              <h3>No products found</h3>
              <p>Try another search or category.</p>
              <button type="button" onClick={() => { setQuery(''); setActiveCategory('All'); }}>
                Show all products
              </button>
            </div>
          )}
        </div>
      </section>

      <section id="reviews" className="reviews-section">
        <div className="section-inner">
          <div className="reviews-heading">
            <div>
              <span className="section-kicker">Verified customer feedback</span>
              <h2>Trusted by digital buyers</h2>
              <p>Recent public reviews from the Sasify Digital Solutions Google Maps listing.</p>
            </div>
            <a href={googleReviewsUrl} target="_blank" rel="noreferrer" className="google-score">
              <span className="google-g">G</span>
              <strong>5.0</strong>
              <span><Stars /> 148 Google reviews</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <div className="reviews-grid">
            {reviews.map((review) => (
              <article key={review.name} className="review-card">
                <div className="review-top">
                  <div className="review-avatar">{initials(review.name)}</div>
                  <div>
                    <h3>{review.name}</h3>
                    <span>{review.time}</span>
                  </div>
                </div>
                <Stars />
                <p>&ldquo;{review.quote}&rdquo;</p>
                <span className="google-source">
                  <span className="google-g small">G</span> Google review
                </span>
              </article>
            ))}
          </div>

          <a href={googleReviewsUrl} target="_blank" rel="noreferrer" className="all-reviews-link">
            Read all 148 reviews on Google Maps <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      <section id="faq" className="faq-section">
        <div className="section-inner faq-layout">
          <div>
            <span className="section-kicker">Common questions</span>
            <h2>Simple, direct purchasing</h2>
            <p>Choose a product and confirm the final availability with our team.</p>
          </div>
          <div className="faq-list">
            <details open>
              <summary>How do I place an order?</summary>
              <p>Tap Buy now on any product. WhatsApp opens with the product name already included.</p>
            </details>
            <details>
              <summary>Are the original prices current?</summary>
              <p>They are public provider references and may vary by region, billing term, tax, credits or promotions.</p>
            </details>
            <details>
              <summary>When is availability confirmed?</summary>
              <p>Our team confirms current availability and payment details with you on WhatsApp before purchase.</p>
            </details>
          </div>
        </div>
      </section>

      <footer id="contact" className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <img src="/sasify-logo.png" alt="Sasify Solutions logo" />
            <div>
              <strong>Sasify Solutions</strong>
              <span>Digital tools. Human support.</span>
            </div>
          </div>
          <div className="footer-contact">
            <MapPin className="h-4 w-4" />
            Sasify Digital Solutions
          </div>
          <a href={whatsappLink()} target="_blank" rel="noreferrer" className="primary-button">
            <MessageCircle className="h-4 w-4" /> WhatsApp us
          </a>
        </div>
      </footer>
    </main>
  );
}
