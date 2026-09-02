import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, CalendarDays, Check, ExternalLink, MessageCircle, ShieldCheck } from 'lucide-react';
import { products } from '../../products';
import { ProductLogo } from '../../components/product-logo';
import { SiteFooter, SiteHeader } from '../../components/site-chrome';
import { formatPkr, has25DayWarranty, isAnnualPlan, productHref, productLogo, savingsPkr, siteOrigin, whatsappLink } from '../../product-utils';

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return products.map((product) => ({ id: product.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = products.find((item) => item.id === id);
  if (!product) return { title: 'Product not found | Sasify Solutions', robots: { index: false } };
  const title = `${product.name} - ${product.duration} | Sasify Solutions`;
  const description = `${product.description} Our price: ${formatPkr(product.sellingPricePkr)}. Order on WhatsApp.`;
  const logo = productLogo(product);
  const images = logo ? [{ url: logo, alt: product.name }] : [];
  return {
    title, description,
    alternates: { canonical: `${siteOrigin}${productHref(product)}` },
    openGraph: { title, description, url: `${siteOrigin}${productHref(product)}`, images },
    twitter: { card: 'summary', title, description, images },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = products.find((item) => item.id === id);
  if (!product) notFound();
  const annual = isAnnualPlan(product);
  const warranty = has25DayWarranty(product);
  const savings = savingsPkr(product);
  const related = products.filter((item) => item.id !== id && item.category === product.category)
    .sort((a, b) => Number(b.name.split(' ')[0] === product.name.split(' ')[0]) - Number(a.name.split(' ')[0] === product.name.split(' ')[0]))
    .slice(0, 3);

  return (
    <main>
      <SiteHeader />
      <div className="detail-shell">
        <a href="/#catalog" className="back-link"><ArrowLeft className="h-4 w-4" /> All products</a>
        <div className="detail-layout">
          <article className="detail-content">
            <div className="detail-identity">
              <div className="detail-logo-frame"><ProductLogo product={product} eager /></div>
              <div>
                <span className="section-kicker">{product.category}</span>
                <h1>{product.name}</h1>
                <span className="detail-duration"><CalendarDays className="h-4 w-4" /> {product.duration === '-' ? 'Duration confirmed on WhatsApp' : product.duration}</span>
              </div>
            </div>

            <section className="description-section">
              <h2>Full description</h2>
              <p>{product.description}</p>
              {product.details?.map((detail) => <p key={detail}>{detail}</p>)}
              <dl className="package-facts">
                <div><dt>Package</dt><dd>{product.name}</dd></div>
                <div><dt>Access period / allocation</dt><dd>{product.duration === '-' ? 'Confirm before purchase' : product.duration}</dd></div>
                <div><dt>Order support</dt><dd>Sasify Solutions on WhatsApp</dd></div>
              </dl>
            </section>

            <section className="description-section">
              <h2>Payment &amp; warranty</h2>
              {annual ? (
                <p><strong>Pay {formatPkr(product.sellingPricePkr)} once for the full year.</strong> This is a one-time payment to Sasify Solutions. No monthly payments to us are needed during your one-year plan.</p>
              ) : (
                <p>The listed Sasify price is <strong>{formatPkr(product.sellingPricePkr)}</strong> for this package. Confirm the access period, activation requirements and payment details with our team before ordering.</p>
              )}
              {warranty ? (
                <p><strong>Full 25-day warranty included.</strong> This 30-day / one-month product comes with a full 25-day warranty from Sasify Solutions. Contact us on WhatsApp for warranty support.</p>
              ) : (
                <p>Our full 25-day warranty applies to 30-day products and one-month plans. For this package, confirm the applicable warranty with our team before payment.</p>
              )}
            </section>

            <section className="description-section">
              <h2>Before you order</h2>
              <ul className="order-checks">
                <li><Check className="h-4 w-4" /> Confirm the exact edition, access type and availability with our team.</li>
                <li><Check className="h-4 w-4" /> Review any account, device or invitation requirements before payment.</li>
                <li><Check className="h-4 w-4" /> Provider feature and usage limits still apply to the selected plan.</li>
              </ul>
            </section>
          </article>

          <aside className="purchase-summary" aria-label="Product pricing and purchase">
            <span className="section-kicker">Your selected plan</span>
            <div className="purchase-heading"><div className="product-logo-frame"><ProductLogo product={product} eager /></div><h2>{product.name}</h2></div>
            <dl className="detail-prices">
              <div><dt>Original Pricing</dt><dd>{product.originalPrice}</dd></div>
              <div className="selling-price"><dt>Our Pricing</dt><dd>{formatPkr(product.sellingPricePkr)}</dd></div>
              <div className="savings-price"><dt>Your Savings</dt><dd>{savings === null ? 'Not directly comparable' : savings > 0 ? formatPkr(savings) : 'No saving at this reference'}</dd></div>
            </dl>
            {savings === null ? (
              <p className="price-explanation">The provider reference may use a different currency, billing term or access package. Ask us for a comparable PKR quote; we do not estimate a saving from unmatched prices.</p>
            ) : (
              <p className="price-explanation">Savings against the listed PKR original-price reference for this plan.</p>
            )}
            {product.sourceUrl && (
              <a href={product.sourceUrl} target="_blank" rel="noreferrer" className="price-source">Provider pricing reference <ExternalLink className="h-3.5 w-3.5" /></a>
            )}
            {annual && <div className="plan-notice"><CalendarDays className="h-5 w-5" /><span><strong>One-time payment for the full year</strong>No monthly payments to Sasify Solutions.</span></div>}
            {warranty && <div className="plan-notice"><ShieldCheck className="h-5 w-5" /><span><strong>Full 25-day warranty</strong>Included with this one-month plan.</span></div>}
            <a href={whatsappLink(product.name, product.duration)} target="_blank" rel="noreferrer" className="primary-button detail-buy"><MessageCircle className="h-5 w-5" /> Buy now on WhatsApp</a>
            <p className="order-footnote">Availability and activation details are confirmed before payment.</p>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="related-section">
            <h2>More plans to explore</h2>
            <div className="related-grid">
              {related.map((item) => (
                <a key={item.id} href={productHref(item)} className="related-product">
                  <div className="product-logo-frame"><ProductLogo product={item} /></div>
                  <div><h3>{item.name}</h3><p>{item.duration}</p><strong>{formatPkr(item.sellingPricePkr)}</strong></div>
                  <ArrowRight className="h-4 w-4" />
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}
