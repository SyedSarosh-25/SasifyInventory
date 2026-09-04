import type { Metadata } from 'next';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { guidePlans, guideQuestions } from '../buying-guide-content';
import { Money } from '../components/currency';
import { ProductLogo } from '../components/product-logo';
import { SiteFooter, SiteHeader } from '../components/site-chrome';
import { StructuredData } from '../components/structured-data';
import { accessTypeLabel, isAnnualPlan, productHref, whatsappLink } from '../product-utils';
import { breadcrumbData, faqData } from '../seo';
import { siteOrigin } from '../site-config';

const title = 'Digital Tool Buying Guide | Prices, Access & Warranty | Sasify Solutions';
const description = 'Compare Sasify ChatGPT, Claude, Canva, CapCut and Cursor packages in Pakistan. Check listed prices, shared or team access, one-time yearly payments and warranty terms.';
export const metadata: Metadata = {
  title, description,
  alternates: { canonical: `${siteOrigin}/buying-guide` },
  openGraph: { title, description, url: `${siteOrigin}/buying-guide`, images: [`${siteOrigin}/sasify-logo.png`] },
  twitter: { card: 'summary', title, description, images: [`${siteOrigin}/sasify-logo.png`] },
};

export default function BuyingGuidePage() {
  return <main>
    <SiteHeader />
    <StructuredData data={breadcrumbData([{ name: 'Home', path: '/' }, { name: 'Buying guide', path: '/buying-guide' }])} />
    <StructuredData data={faqData('/buying-guide', guideQuestions)} />
    <article className="detail-shell about-page buying-guide">
      <nav className="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">Buying guide</span></nav>
      <div className="about-identity">
        <img src="/sasify-logo.png" alt="Sasify Solutions logo" width={80} height={80} decoding="async" />
        <div><span className="section-kicker">Sasify Solutions</span><h1>Digital tool buying guide</h1></div>
      </div>
      <p>Sasify Solutions lists digital tool packages for buyers in Pakistan. Compare the price for the exact access period, then confirm the account arrangement and warranty on WhatsApp before payment. Shared, team, invite and credit packages have different requirements.</p>
      <section className="description-section" id="compare-plans">
        <h2>Popular plans and package prices</h2>
        <p>These are our listed package totals, not monthly equivalents. Provider reference prices and the full description are on each product page. Availability is confirmed before payment.</p>
        <ul className="guide-plans">
          {guidePlans.map((product) => <li key={product.id}>
            <a href={productHref(product)}>
              <span className="product-logo-frame"><ProductLogo product={product} /></span>
              <span className="guide-plan-name"><strong>{product.name}</strong><span>{product.duration}</span><span>{accessTypeLabel(product)}{isAnnualPlan(product) ? ' | One-time payment' : ''}</span></span>
              <strong className="guide-plan-price"><Money amount={product.sellingPricePkr} /></strong>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </li>)}
        </ul>
        <a href="/inventory" className="back-link">View full inventory <ArrowRight className="h-4 w-4" /></a>
      </section>
      <section className="description-section" id="access-types">
        <h2>How to choose an access type</h2>
        <p>The access label is as important as the tool name. Use this comparison before choosing a lower-priced or longer-duration listing.</p>
        <dl className="access-comparison">
          <div><dt>Single-person access</dt><dd>Intended for one buyer. Confirm login ownership, supported devices and provider usage limits.</dd></div>
          <div><dt>Shared access</dt><dd>Not exclusive to one buyer. Confirm privacy, simultaneous-use and device rules before payment.</dd></div>
          <div><dt>Team seat or team access</dt><dd>Access is provided inside a managed workspace. Confirm the invite method, workspace requirements and what happens if a seat is removed.</dd></div>
          <div><dt>Invite-based access</dt><dd>Your eligible account is invited to a provider workspace or plan. Confirm account, region and invitation requirements.</dd></div>
          <div><dt>Credit allocation</dt><dd>The listing provides a stated usage allocation rather than unlimited access. Confirm the credit amount, supported models and expiry terms.</dd></div>
        </dl>
        <h3>Five checks before payment</h3>
        <ol className="guide-checklist">
          <li>Match the exact product name and access duration.</li>
          <li>Confirm whether access is shared, single-person, team, invite-based or credit-based.</li>
          <li>Confirm provider limits, account requirements and device rules.</li>
          <li>Confirm the warranty duration and covered remedy in writing.</li>
          <li>Confirm the final PKR payment and activation instructions on WhatsApp.</li>
        </ol>
      </section>
      <section className="description-section" id="plan-questions">
        <h2>Access, payment and warranty</h2>
        <div className="guide-answers">
          {guideQuestions.map(({ question, answer }, index) => <section key={question} id={`answer-${index + 1}`}>
            <h3>{question}</h3><p>{answer}</p>
          </section>)}
        </div>
      </section>
      <section className="description-section">
        <h2>Check the source and the exact listing</h2>
        <p>Provider names and logos identify the tools. A provider&apos;s public pricing page describes its own plans, while a Sasify product page describes the package you are ordering from us. Do not assume identical billing, account ownership or included features.</p>
        <ul className="guide-sources">{guidePlans.filter((p, i, all) => all.findIndex((other) => other.sourceUrl === p.sourceUrl) === i).map((product) => <li key={product.id}>
          <a href={product.sourceUrl} target="_blank" rel="noreferrer">{product.name}: provider reference</a>
        </li>)}</ul>
        <p><a href="/about">About Sasify Solutions, founder Syed Sarosh and our contact channels.</a> Review our <a href="/warranty">Warranty</a>, <a href="/refunds">Refunds</a>, <a href="/privacy">Privacy</a> and <a href="/terms">Terms</a> pages before ordering.</p>
        <a href={whatsappLink()} target="_blank" rel="noreferrer" className="primary-button"><MessageCircle className="h-4 w-4" /> Confirm a plan on WhatsApp</a>
      </section>
    </article>
    <SiteFooter />
  </main>;
}
