'use client';

import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  ExternalLink,
  MessageCircle,
  Search,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { products } from './products';
import { initials, productHref, savingsPkr, whatsappLink } from './product-utils';
import { featuredProducts, orbitTools } from './catalog-selection';
import { ProductLogo } from './components/product-logo';
import { SiteFooter, SiteHeader } from './components/site-chrome';
import { Money, ProductOriginalPrice } from './components/currency';

const lowestPrice = Math.min(...products.map((p) => p.sellingPricePkr));
const googleReviewsUrl =
  'https://www.google.com/maps/place/Sasify+Digital+Solutions/@33.5298115,73.1663875,16z/data=!4m18!1m9!3m8!1s0x38dfed9bda8bf345:0xb57a60ba54b9be1e!2sSasify+Digital+Solutions!8m2!3d33.5298115!4d73.1663875!9m1!1b1!16s%2Fg%2F11yzclp9ps!3m7!1s0x38dfed9bda8bf345:0xb57a60ba54b9be1e!8m2!3d33.5298115!4d73.1663875!9m1!1b1!16s%2Fg%2F11yzclp9ps!18m1!1e1?entry=ttu';

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
    name: 'Muhammad Abdullah',
    time: '2 months ago',
    quote:
      'It was great talking to Adeen. He is lovely and explains everything well.',
  },
  {
    name: 'Asim Ali',
    time: 'A month ago',
    quote:
      'Genuine person and excellent service with affordable price, highly recommended.',
  },
];

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
  return (
    <main>
      <SiteHeader />
      <div className="warranty-banner">
        <ShieldCheck className="h-5 w-5" />
        <p><strong>All products come with a warranty period.</strong></p>
      </div>

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
              with clear pricing and quick activation.
            </p>

            <form className="hero-search" action="/inventory" role="search">
              <Search className="h-5 w-5" />
              <input
                name="q"
                type="search"
                placeholder="Search ChatGPT, Claude, Canva, Cursor..."
                aria-label="Search products"
              />
              <button type="submit" aria-label="Search inventory"><ArrowRight className="h-5 w-5" /></button>
            </form>

            <div className="hero-actions">
              <a href="#catalog" className="primary-button">
                Explore top products <ArrowRight className="h-4 w-4" />
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
                  <a className="orbit-content" href={productHref(tool.product)} aria-label={`View ${tool.product.name}`}>
                    <span>
                      <ProductLogo product={tool.product} eager />
                    </span>
                    <small>{tool.name}</small>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-proof">
          <span><BadgeCheck className="h-4 w-4" /> {products.length} products</span>
          <span><BadgeCheck className="h-4 w-4" /> Starting at <Money amount={lowestPrice} /></span>
          <a href={googleReviewsUrl} target="_blank" rel="noreferrer">
            <Stars /> 5.0 from 148 Google reviews
          </a>
        </div>
      </section>

      <section id="catalog" className="featured-section" aria-labelledby="featured-title">
        <div className="featured-inner">
          <div className="featured-heading">
            <div>
              <span className="section-kicker">Sasify Solutions Inventory</span>
              <h2 id="featured-title">Top 10 products</h2>
            </div>
          </div>
          <div className="featured-grid">
            {featuredProducts.map((product) => (
              <a key={product.id} className="featured-card" href={productHref(product)}>
                <div className="featured-logo">
                  <ProductLogo product={product} />
                </div>
                <div className="featured-copy">
                  <h3>{product.name}</h3>
                  <p>{product.duration}</p>
                </div>
                <div className="featured-reference"><span>Original price for plan</span><ProductOriginalPrice product={product} /></div>
                <div className="featured-action">
                  <div><span className="featured-price-label">Our price</span><strong><Money amount={product.sellingPricePkr} /></strong></div>
                  <span className="featured-arrow" aria-hidden="true"><ArrowRight className="h-4 w-4" /></span>
                </div>
                {savingsPkr(product) !== null && <p className="card-savings">Your Savings: <strong><Money amount={savingsPkr(product)!} /></strong></p>}
              </a>
            ))}
          </div>
          <div className="inventory-action"><a href="/inventory" className="primary-button">View full inventory <ArrowRight className="h-4 w-4" /></a></div>
          <p className="comparison-note">Savings compare the original price for the full plan duration with our price. Monthly references are multiplied by the number of months. Access and provider billing options may differ.</p>
        </div>
      </section>

      <section id="reviews" className="reviews-section">
        <div className="section-inner">
          <div className="reviews-heading">
            <div>
              <span className="section-kicker">Customer feedback on Google</span>
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
              <p>Open a product to see its full details, then choose Buy now. WhatsApp opens with the product and plan duration already included.</p>
            </details>
            <details>
              <summary>Are the original prices current?</summary>
              <p>They are public provider references and may vary by region, billing term, tax, credits or promotions.</p>
            </details>
            <details>
              <summary>Do one-year plans need monthly payments?</summary>
              <p>No. For every one-year or 12-month plan, the listed amount is a one-time payment to Sasify Solutions for the full year. No monthly payments to us are needed during that year.</p>
            </details>
            <details>
              <summary>Do all products come with a warranty?</summary>
              <p>Yes, all products come with a warranty period. Our 30-day products and one-month plans include a full 25-day warranty. Warranty periods for other plans vary by product; confirm the duration with our team before payment.</p>
            </details>
            <details>
              <summary>When is availability confirmed?</summary>
              <p>Our team confirms current availability and payment details with you on WhatsApp before purchase.</p>
            </details>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
