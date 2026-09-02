'use client';

import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { products } from './products';
import { productHref, savingsPkr, whatsappLink } from './product-utils';
import { featuredProducts, orbitTools } from './catalog-selection';
import { ProductLogo } from './components/product-logo';
import { SiteFooter, SiteHeader } from './components/site-chrome';
import { Money, ProductOriginalPrice } from './components/currency';
import { pickReviews } from './review-utils';
import { reviews } from './reviews';
import { ReviewAvatar } from './components/review-avatar';
import { HeroProductSearch } from './components/hero-product-search';

const lowestPrice = Math.min(...products.map((p) => p.sellingPricePkr));
const googleReviewsUrl =
  'https://www.google.com/maps/place/Sasify+Digital+Solutions/@33.5298115,73.1663875,16z/data=!4m18!1m9!3m8!1s0x38dfed9bda8bf345:0xb57a60ba54b9be1e!2sSasify+Digital+Solutions!8m2!3d33.5298115!4d73.1663875!9m1!1b1!16s%2Fg%2F11yzclp9ps!3m7!1s0x38dfed9bda8bf345:0xb57a60ba54b9be1e!8m2!3d33.5298115!4d73.1663875!9m1!1b1!16s%2Fg%2F11yzclp9ps!18m1!1e1?entry=ttu';

function Stars({ rating = 5 }: { rating?: number }) {
  return (
    <span className="stars" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} className="h-4 w-4" fill={index < rating ? 'currentColor' : 'none'} />
      ))}
    </span>
  );
}

export default function Home() {
  const [visibleReviews, setVisibleReviews] = useState(() => reviews.slice(0, 6));

  useEffect(() => {
    // Randomize after hydration, then keep the same cards for this visit.
    setVisibleReviews(pickReviews(reviews));
  }, []);

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

            <HeroProductSearch />

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
              <p>Customers&apos; own words from Google Maps. Short excerpts are shown in their original language.</p>
            </div>
            <a href={googleReviewsUrl} target="_blank" rel="noreferrer" className="google-score">
              <span className="google-g">G</span>
              <strong>5.0</strong>
              <span><Stars /> 148 Google reviews</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <div className="reviews-grid">
            {visibleReviews.map((review) => (
              <article key={review.name} className="review-card">
                <div className="review-top">
                  <ReviewAvatar review={review} />
                  <div>
                    <h3><a href={review.profileUrl} target="_blank" rel="noreferrer">{review.name}</a></h3>
                    <span>{review.language === 'ur-Latn' ? 'Roman Urdu' : 'English'}{review.excerpt ? ' excerpt' : ' review'}</span>
                  </div>
                </div>
                <Stars rating={review.rating} />
                <p lang={review.language} dir="auto">&ldquo;{review.quote}&rdquo;</p>
                <a href={review.sourceUrl} target="_blank" rel="noreferrer" className="google-source">
                  <span className="google-g small">G</span> Read original on Google <ExternalLink className="h-3.5 w-3.5" />
                </a>
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
