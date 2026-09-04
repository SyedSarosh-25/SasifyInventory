'use client';

import {
  ArrowRight,
  BadgeCheck,
  BadgeDollarSign,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Headphones,
  HeartHandshake,
  Landmark,
  Maximize2,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Star,
  UserRoundCheck,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { products } from './products';
import { productHref, savingsPkr, whatsappLink } from './product-utils';
import { featuredProducts, orbitTools } from './catalog-selection';
import { ProductLogo } from './components/product-logo';
import { SiteFooter, SiteHeader } from './components/site-chrome';
import { Money, ProductOriginalPrice } from './components/currency';
import { reviews } from './reviews';
import { ReviewAvatar } from './components/review-avatar';
import { HeroProductSearch } from './components/hero-product-search';
import { StructuredData } from './components/structured-data';
import { websiteData } from './seo';

const lowestPrice = Math.min(...products.map((p) => p.sellingPricePkr));
const googleReviewsUrl =
  'https://www.google.com/maps/place/Sasify+Digital+Solutions/@33.5298115,73.1663875,16z/data=!4m18!1m9!3m8!1s0x38dfed9bda8bf345:0xb57a60ba54b9be1e!2sSasify+Digital+Solutions!8m2!3d33.5298115!4d73.1663875!9m1!1b1!16s%2Fg%2F11yzclp9ps!3m7!1s0x38dfed9bda8bf345:0xb57a60ba54b9be1e!8m2!3d33.5298115!4d73.1663875!9m1!1b1!16s%2Fg%2F11yzclp9ps!18m1!1e1?entry=ttu';
const heroTitleLead = 'Your one-stop destination';
const heroTitleAccent = 'for all digital needs';
const dealProofs = Array.from({ length: 21 }, (_, index) => {
  const proofNumber = String(index + 1).padStart(2, '0');
  return {
    src: `/deal-proofs/proof-${proofNumber}.webp`,
  };
});
const whyChooseItems = [
  {
    icon: UserRoundCheck,
    title: 'Founder-led service',
    description: 'A personal-brand agency led and overseen by Syed Sarosh.',
  },
  {
    icon: HeartHandshake,
    title: 'Customer satisfaction first',
    description: 'Clear communication, correct delivery and dependable after-sales support come first.',
  },
  {
    icon: BadgeDollarSign,
    title: 'Competitive rates with warranty',
    description: 'Market-competitive pricing with a confirmed warranty period for every product.',
  },
  {
    icon: ShieldCheck,
    title: 'Genuine subscriptions only',
    description: 'Every plan is supplied as the access type described, with no fake subscriptions or misleading labels.',
  },
  {
    icon: Headphones,
    title: '24/7 chat support',
    description: 'Our support team is available around the clock, including late-night assistance.',
  },
  {
    icon: RotateCcw,
    title: 'Fair issue resolution',
    description: 'If an eligible issue cannot be resolved, the remaining unused amount is refunded under the confirmed order terms.',
  },
];
const paymentMethods = [
  { name: 'Easypaisa', region: 'Pakistan', logo: '/payment-methods/easypaisa.png' },
  { name: 'All Pakistani Banks', region: 'Pakistan', logo: null },
  { name: 'NayaPay', region: 'Pakistan', logo: '/payment-methods/nayapay.svg', dark: true },
  { name: 'SadaPay', region: 'Pakistan', logo: '/payment-methods/sadapay.webp' },
  { name: 'Binance', region: 'International', logo: '/payment-methods/binance.svg' },
  { name: 'Payoneer', region: 'International', logo: '/payment-methods/payoneer.svg' },
];

function HeroTypingTitle() {
  const [typedLength, setTypedLength] = useState(0);
  const totalLength = heroTitleLead.length + heroTitleAccent.length;

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTypedLength(totalLength);
      return;
    }

    let currentLength = 0;
    let timer: ReturnType<typeof setTimeout>;
    const typeNextCharacter = () => {
      currentLength += 1;
      setTypedLength(currentLength);
      if (currentLength >= totalLength) return;
      const delay = currentLength === heroTitleLead.length ? 320 : 46;
      timer = setTimeout(typeNextCharacter, delay);
    };

    timer = setTimeout(typeNextCharacter, 220);
    return () => clearTimeout(timer);
  }, [totalLength]);

  const leadLength = Math.min(typedLength, heroTitleLead.length);
  const accentLength = Math.max(0, typedLength - heroTitleLead.length);
  const cursorOnLead = typedLength <= heroTitleLead.length;

  return (
    <h1>
      <span className="hero-title-accessible">
        {heroTitleLead} {heroTitleAccent}
      </span>
      <span className="hero-typing-shell" aria-hidden="true">
        <span className="hero-title-measure">
          <span className="hero-title-line">{heroTitleLead}</span>
          <span className="hero-title-line hero-title-line-accent">{heroTitleAccent}</span>
        </span>
        <span className="hero-title-live">
          <span className="hero-title-line">
            {heroTitleLead.slice(0, leadLength)}
            {cursorOnLead && <span className="hero-title-caret" />}
          </span>
          <span className="hero-title-line hero-title-line-accent">
            <span className="hero-title-text-accent">
              {heroTitleAccent.slice(0, accentLength)}
            </span>
            {!cursorOnLead && <span className="hero-title-caret" />}
          </span>
        </span>
      </span>
      <noscript>
        <span className="hero-title-line">{heroTitleLead}</span>
        <span className="hero-title-line hero-title-text-accent">{heroTitleAccent}</span>
      </noscript>
    </h1>
  );
}

function Stars({ rating = 5 }: { rating?: number }) {
  return (
    <span className="stars" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} className="h-4 w-4" fill={index < rating ? 'currentColor' : 'none'} />
      ))}
    </span>
  );
}

function WhySasifyMobile() {
  const [activeBenefit, setActiveBenefit] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const pauseUntilRef = useRef(0);

  const showBenefit = (index: number) => {
    const normalized = (index + whyChooseItems.length) % whyChooseItems.length;
    const track = trackRef.current;
    const card = track?.children.item(normalized) as HTMLElement | null;
    if (track && card) track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: 'smooth' });
    setActiveBenefit(normalized);
  };

  useEffect(() => {
    if (!window.matchMedia('(max-width: 640px)').matches
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      if (performance.now() < pauseUntilRef.current) return;
      setActiveBenefit((current) => {
        const next = (current + 1) % whyChooseItems.length;
        const track = trackRef.current;
        const card = track?.children.item(next) as HTMLElement | null;
        if (track && card) track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: 'smooth' });
        return next;
      });
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  const move = (direction: -1 | 1) => {
    pauseUntilRef.current = performance.now() + 1800;
    showBenefit(activeBenefit + direction);
  };

  return (
    <div className="why-sasify-mobile-story">
      <span className="why-sasify-mobile-beam" aria-hidden="true" />
      <div
        ref={trackRef}
        className="why-sasify-mobile-track"
        role="region"
        aria-label="Why choose Sasify carousel"
        onPointerDown={() => { pauseUntilRef.current = Number.POSITIVE_INFINITY; }}
        onPointerUp={() => { pauseUntilRef.current = performance.now() + 1800; }}
        onPointerCancel={() => { pauseUntilRef.current = performance.now() + 1800; }}
        onScroll={(event) => {
          const track = event.currentTarget;
          const cards = Array.from(track.children) as HTMLElement[];
          if (!cards.length) return;
          const closest = cards.reduce((best, card, index) => {
            const distance = Math.abs(card.offsetLeft - track.offsetLeft - track.scrollLeft);
            return distance < best.distance ? { index, distance } : best;
          }, { index: 0, distance: Number.POSITIVE_INFINITY });
          setActiveBenefit(closest.index);
        }}
      >
        {whyChooseItems.map((benefit, index) => {
          const Icon = benefit.icon;
          return (
            <article key={benefit.title} className="why-sasify-mobile-feature" aria-hidden={index !== activeBenefit}>
              <div className="why-sasify-mobile-meta">
                <span className="why-sasify-icon" aria-hidden="true"><Icon /></span>
                <span>{String(index + 1).padStart(2, '0')} / {String(whyChooseItems.length).padStart(2, '0')}</span>
              </div>
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
            </article>
          );
        })}
      </div>
      <div className="why-sasify-mobile-controls">
        <button type="button" onClick={() => move(-1)} aria-label="Previous reason" title="Previous reason"><ChevronLeft /></button>
        <div className="why-sasify-mobile-progress" aria-label={`Reason ${activeBenefit + 1} of ${whyChooseItems.length}`}>
          {whyChooseItems.map((item, index) => (
            <button
              key={item.title}
              type="button"
              className={index === activeBenefit ? 'active' : ''}
              onClick={() => { pauseUntilRef.current = performance.now() + 1800; showBenefit(index); }}
              aria-label={`Show ${item.title}`}
              aria-current={index === activeBenefit ? 'true' : undefined}
            />
          ))}
        </div>
        <button type="button" onClick={() => move(1)} aria-label="Next reason" title="Next reason"><ChevronRight /></button>
      </div>
    </div>
  );
}

function DealProofGallery() {
  const trackRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const manualPauseUntilRef = useRef(0);
  const isInteractingRef = useRef(false);
  const [activeProof, setActiveProof] = useState<number | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || activeProof === null || dialog.open) return;
    dialog.showModal();
  }, [activeProof]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const track = trackRef.current;
    if (!track) return;

    const startInteraction = () => {
      isInteractingRef.current = true;
      manualPauseUntilRef.current = performance.now() + 2400;
    };
    const endInteraction = () => {
      isInteractingRef.current = false;
      manualPauseUntilRef.current = performance.now() + 1600;
    };
    track.addEventListener('pointerdown', startInteraction, { passive: true });
    window.addEventListener('pointerup', endInteraction, { passive: true });
    window.addEventListener('pointercancel', endInteraction, { passive: true });

    const removeInteractionListeners = () => {
      track.removeEventListener('pointerdown', startInteraction);
      window.removeEventListener('pointerup', endInteraction);
      window.removeEventListener('pointercancel', endInteraction);
    };
    const isPaused = () => {
      const focused = document.activeElement as HTMLElement | null;
      const keyboardFocusInside = Boolean(focused && track.contains(focused) && focused.matches(':focus-visible'));
      return document.hidden
        || isInteractingRef.current
        || keyboardFocusInside
        || dialogRef.current?.open
        || performance.now() < manualPauseUntilRef.current;
    };

    if (window.matchMedia('(max-width: 640px)').matches) {
      let direction = 1;
      const autoAdvance = () => {
        if (isPaused()) return;
        const card = track.querySelector<HTMLElement>('.deal-proof-card');
        if (!card) return;
        const styles = window.getComputedStyle(track);
        const gap = Number.parseFloat(styles.columnGap || styles.gap || '0');
        const step = card.getBoundingClientRect().width + gap;
        const maxScroll = track.scrollWidth - track.clientWidth;
        if (track.scrollLeft >= maxScroll - step * 0.5) direction = -1;
        if (track.scrollLeft <= step * 0.5) direction = 1;
        track.scrollBy({ left: step * direction, behavior: 'smooth' });
      };
      const timer = window.setInterval(autoAdvance, 2600);
      return () => {
        window.clearInterval(timer);
        removeInteractionListeners();
      };
    }

    let frame = 0;
    let direction = 1;
    let previousTime = performance.now();
    let position = track.scrollLeft;
    const move = (time: number) => {
      const elapsed = Math.min(time - previousTime, 40);
      previousTime = time;

      if (!isPaused()) {
        position += elapsed * 0.035 * direction;
        const maxPosition = track.scrollWidth - track.clientWidth;
        if (position >= maxPosition) {
          position = maxPosition;
          direction = -1;
        } else if (position <= 0) {
          position = 0;
          direction = 1;
        }
        track.scrollLeft = position;
      } else {
        position = track.scrollLeft;
      }
      frame = window.requestAnimationFrame(move);
    };

    frame = window.requestAnimationFrame(move);
    return () => {
      window.cancelAnimationFrame(frame);
      removeInteractionListeners();
    };
  }, []);

  const movePreview = (direction: -1 | 1) => {
    setActiveProof((current) => current === null ? 0 : (current + direction + dealProofs.length) % dealProofs.length);
  };

  const closePreview = () => {
    dialogRef.current?.close();
    setActiveProof(null);
  };

  const selectedProof = activeProof === null ? null : dealProofs[activeProof];

  return (
    <section id="deal-proofs" className="deal-proofs-section" aria-labelledby="deal-proofs-title">
      <div className="section-inner">
        <div className="section-heading deal-proofs-heading">
          <div>
            <span className="section-kicker">Real order confirmations</span>
            <h2 id="deal-proofs-title">Recent successful deliveries</h2>
            <p>Selected customer conversations and completed digital-tool deliveries from Sasify Solutions.</p>
          </div>
        </div>

        <div className="deal-proofs-toolbar">
          <span>Successful delivery screenshots</span>
        </div>

        <div className="deal-proofs-track" ref={trackRef} role="region" aria-label="Successful deliveries carousel" tabIndex={0}>
          {dealProofs.map((proof, index) => (
            <figure key={proof.src} className="deal-proof-card">
              <button type="button" onClick={() => setActiveProof(index)} aria-label="Open delivery screenshot" title="Open full screenshot">
                <img src={proof.src} alt="Customer delivery confirmation" width={592} height={1052} loading="lazy" decoding="async" />
                <span className="deal-proof-expand" aria-hidden="true"><Maximize2 className="h-4 w-4" /></span>
              </button>
            </figure>
          ))}
        </div>
      </div>

      <dialog
        ref={dialogRef}
        className="deal-proof-dialog"
        aria-labelledby="deal-proof-preview-title"
        onClose={() => setActiveProof(null)}
        onClick={(event) => { if (event.target === event.currentTarget) closePreview(); }}
      >
        {selectedProof && (
          <div className="deal-proof-preview">
            <div className="deal-proof-preview-header">
              <strong id="deal-proof-preview-title">Delivery preview</strong>
              <button type="button" onClick={closePreview} aria-label="Close screenshot" title="Close"><X className="h-5 w-5" /></button>
            </div>
            <div className="deal-proof-preview-media">
              <button type="button" onClick={() => movePreview(-1)} aria-label="Previous screenshot" title="Previous screenshot"><ChevronLeft className="h-6 w-6" /></button>
              <img src={selectedProof.src} alt="Customer delivery confirmation" width={592} height={1052} />
              <button type="button" onClick={() => movePreview(1)} aria-label="Next screenshot" title="Next screenshot"><ChevronRight className="h-6 w-6" /></button>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}

export default function Home() {
  const reviewsTrackRef = useRef<HTMLDivElement>(null);
  const reviewManualPauseUntilRef = useRef(0);
  const reviewInteractingRef = useRef(false);

  useEffect(() => {
    const track = reviewsTrackRef.current;
    if (!track) return;

    const clones = Array.from(track.children).map((card) => {
      const clone = card.cloneNode(true) as HTMLElement;
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll<HTMLElement>('a, button').forEach((control) => control.setAttribute('tabindex', '-1'));
      track.appendChild(clone);
      return clone;
    });

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return () => clones.forEach((clone) => clone.remove());
    }

    const startInteraction = () => {
      reviewInteractingRef.current = true;
      reviewManualPauseUntilRef.current = performance.now() + 2400;
    };
    const endInteraction = () => {
      reviewInteractingRef.current = false;
      reviewManualPauseUntilRef.current = performance.now() + 1600;
    };
    track.addEventListener('pointerdown', startInteraction, { passive: true });
    window.addEventListener('pointerup', endInteraction, { passive: true });
    window.addEventListener('pointercancel', endInteraction, { passive: true });

    const removeInteractionListeners = () => {
      track.removeEventListener('pointerdown', startInteraction);
      window.removeEventListener('pointerup', endInteraction);
      window.removeEventListener('pointercancel', endInteraction);
    };
    const isPaused = () => {
      const focused = document.activeElement as HTMLElement | null;
      const keyboardFocusInside = Boolean(focused && track.contains(focused) && focused.matches(':focus-visible'));
      return document.hidden
        || reviewInteractingRef.current
        || keyboardFocusInside
        || performance.now() < reviewManualPauseUntilRef.current;
    };

    if (window.matchMedia('(max-width: 640px)').matches) {
      const autoAdvance = () => {
        if (isPaused()) return;
        const firstCard = track.children.item(0) as HTMLElement | null;
        const duplicateStart = track.children.item(reviews.length) as HTMLElement | null;
        if (!firstCard || !duplicateStart) return;
        const styles = window.getComputedStyle(track);
        const gap = Number.parseFloat(styles.columnGap || styles.gap || '0');
        const step = firstCard.getBoundingClientRect().width + gap;
        const loopWidth = duplicateStart.offsetLeft - track.offsetLeft;
        if (loopWidth > 0 && track.scrollLeft >= loopWidth - step * 0.25) track.scrollLeft -= loopWidth;
        track.scrollBy({ left: step, behavior: 'smooth' });
      };
      const timer = window.setInterval(autoAdvance, 2600);
      return () => {
        window.clearInterval(timer);
        removeInteractionListeners();
        clones.forEach((clone) => clone.remove());
      };
    }

    let frame = 0;
    let previousTime = performance.now();
    const move = (time: number) => {
      const elapsed = Math.min(time - previousTime, 40);
      previousTime = time;
      if (!isPaused()) {
        track.scrollLeft += elapsed * 0.04;
        const duplicateStart = track.children.item(reviews.length) as HTMLElement | null;
        const loopWidth = duplicateStart ? duplicateStart.offsetLeft - track.offsetLeft : 0;
        if (loopWidth > 0 && track.scrollLeft >= loopWidth) track.scrollLeft -= loopWidth;
      }
      frame = window.requestAnimationFrame(move);
    };

    frame = window.requestAnimationFrame(move);

    return () => {
      window.cancelAnimationFrame(frame);
      removeInteractionListeners();
      clones.forEach((clone) => clone.remove());
    };
  }, []);

  const moveReviews = (direction: -1 | 1) => {
    const track = reviewsTrackRef.current;
    if (!track) return;
    const firstCard = track.children.item(0) as HTMLElement | null;
    if (!firstCard) return;
    const styles = window.getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || '0');
    const step = firstCard.getBoundingClientRect().width + gap;
    const duplicateStart = track.children.item(reviews.length) as HTMLElement | null;
    const loopWidth = duplicateStart ? duplicateStart.offsetLeft - track.offsetLeft : 0;

    if (direction < 0 && loopWidth > 0 && track.scrollLeft < step) track.scrollLeft += loopWidth;
    if (direction > 0 && loopWidth > 0 && track.scrollLeft >= loopWidth - step) track.scrollLeft -= loopWidth;
    reviewManualPauseUntilRef.current = performance.now() + 1800;
    track.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  return (
    <main>
      <StructuredData data={websiteData} />
      <SiteHeader />
      <div className="warranty-banner">
        <div className="warranty-content">
          <ShieldCheck aria-hidden="true" />
          <p><strong>All products come with a warranty period.</strong></p>
        </div>
      </div>

      <section id="top" className="hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="hero-kicker">
              <ShieldCheck className="h-4 w-4" />
              Trusted digital marketplace
            </span>
            <HeroTypingTitle />
            <p>
              Explore AI, coding, design, productivity and SaaS tools in Pakistan.
              Compare PKR prices and plan durations, then confirm your order on WhatsApp.
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
              <img src="/sasify-logo.png" alt="Sasify Solutions" width={200} height={200} decoding="async" />
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

      <section id="why-sasify" className="why-sasify-section" aria-labelledby="why-sasify-title">
        <div className="section-inner">
          <div className="section-heading why-sasify-heading">
            <div>
              <span className="section-kicker">Built around trust</span>
              <h2 id="why-sasify-title">Why choose Sasify?</h2>
              <p>Personal service, transparent subscriptions and dependable support before and after delivery.</p>
            </div>
          </div>
          <div className="why-sasify-showcase">
            <svg
              className="why-sasify-connections"
              viewBox="0 0 1000 300"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <g className="why-sasify-connection-base">
                <path d="M500 150 C455 150 430 28 340 28" />
                <path d="M500 150 C455 150 430 150 340 150" />
                <path d="M500 150 C455 150 430 272 340 272" />
                <path d="M500 150 C545 150 570 28 660 28" />
                <path d="M500 150 C545 150 570 150 660 150" />
                <path d="M500 150 C545 150 570 272 660 272" />
              </g>
              <g className="why-sasify-connection-flow">
                <path d="M500 150 C455 150 430 28 340 28" />
                <path d="M500 150 C455 150 430 150 340 150" />
                <path d="M500 150 C455 150 430 272 340 272" />
                <path d="M500 150 C545 150 570 28 660 28" />
                <path d="M500 150 C545 150 570 150 660 150" />
                <path d="M500 150 C545 150 570 272 660 272" />
              </g>
            </svg>
            <div className="why-sasify-center" aria-hidden="true">
              <div className="why-sasify-emblem">
                <span className="why-sasify-rim" />
                <div className="why-sasify-emblem-face">
                  <img src="/sasify-logo.png" alt="" width={200} height={200} />
                  <strong>Sasify Solutions</strong>
                  <span>Trust at every step</span>
                </div>
              </div>
            </div>
            <div className="why-sasify-column why-sasify-left">
              {whyChooseItems.slice(0, 3).map(({ icon: Icon, title, description }) => (
                <article key={title} className="why-sasify-item">
                  <span className="why-sasify-icon" aria-hidden="true"><Icon /></span>
                  <div><h3>{title}</h3><p>{description}</p></div>
                </article>
              ))}
            </div>
            <div className="why-sasify-column why-sasify-right">
              {whyChooseItems.slice(3).map(({ icon: Icon, title, description }) => (
                <article key={title} className="why-sasify-item">
                  <span className="why-sasify-icon" aria-hidden="true"><Icon /></span>
                  <div><h3>{title}</h3><p>{description}</p></div>
                </article>
              ))}
            </div>
            <WhySasifyMobile />
          </div>
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

          <div className="reviews-carousel-toolbar">
            <span>All {reviews.length} verified reviews</span>
            <div className="reviews-carousel-actions" aria-label="Review carousel controls">
              <button type="button" onClick={() => moveReviews(-1)} aria-label="Previous review" title="Previous review">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => moveReviews(1)} aria-label="Next review" title="Next review">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div
            className="reviews-grid"
            ref={reviewsTrackRef}
            role="region"
            aria-label="Google customer reviews carousel"
            tabIndex={0}
          >
            {reviews.map((review) => (
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

      <DealProofGallery />

      <section id="payment-methods" className="payment-methods-section" aria-labelledby="payment-methods-title">
        <div className="section-inner">
          <div className="section-heading payment-methods-heading">
            <div>
              <span className="section-kicker">Flexible ways to pay</span>
              <h2 id="payment-methods-title">Supported payment methods worldwide</h2>
              <p>Choose from Pakistani wallets and bank transfers or our supported international payment options. Final receiving details are confirmed on WhatsApp before payment.</p>
            </div>
          </div>
          <div className="payment-methods-grid">
            {paymentMethods.map((method) => (
              <article key={method.name} className="payment-method">
                <div className={`payment-logo${method.dark ? ' payment-logo-dark' : ''}`}>
                  {method.logo ? (
                    <img src={method.logo} alt={`${method.name} logo`} width={160} height={52} loading="lazy" decoding="async" />
                  ) : (
                    <Landmark aria-label="Bank transfer" />
                  )}
                </div>
                <h3>{method.name}</h3>
                <span>{method.region}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="faq-section">
        <div className="section-inner faq-layout">
          <div>
            <span className="section-kicker">Common questions</span>
            <h2>Simple, direct purchasing</h2>
            <p>Choose a product and confirm the final availability with our team.</p>
            <a href="/buying-guide" className="back-link">Compare plans, access and warranty <ArrowRight className="h-4 w-4" /></a>
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
              <summary>Is shared access the same as a personal plan?</summary>
              <p>No. A shared listing is not exclusive personal access. Team, invite, credit and individual packages can also have different limits. Check the exact access type, privacy and provider restrictions with our team before choosing a plan.</p>
            </details>
            <details>
              <summary>Who operates Sasify Solutions?</summary>
              <p>Sasify Solutions is founded by Syed Sarosh. We list digital tools and subscription packages with WhatsApp ordering. <a href="/about">Meet Sasify Solutions and find our official contact links.</a></p>
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
