import type { Metadata } from 'next';
import { MessageCircle } from 'lucide-react';
import { SiteFooter, SiteHeader } from '../components/site-chrome';
import { StructuredData } from '../components/structured-data';
import { breadcrumbData } from '../seo';
import { founderProfile, siteOrigin, socials } from '../site-config';
import { whatsappLink } from '../product-utils';

const title = 'About Sasify Solutions | Founder, Contact & Ordering';
const description = 'Meet Sasify Solutions, founded by Syed Sarosh. Explore digital tools in Pakistan and find our WhatsApp contact, social profiles and plan-ordering information.';
export const metadata: Metadata = {
  title, description,
  alternates: { canonical: `${siteOrigin}/about` },
  openGraph: { title, description, url: `${siteOrigin}/about`, images: [`${siteOrigin}/sasify-logo.png`] },
  twitter: { card: 'summary', title, description, images: [`${siteOrigin}/sasify-logo.png`] },
};

export default function AboutPage() {
  return <main>
    <SiteHeader />
    <StructuredData data={breadcrumbData([{ name: 'Home', path: '/' }, { name: 'About Sasify Solutions', path: '/about' }])} />
    <article className="detail-shell about-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">About</span></nav>
      <div className="about-identity">
        <img src="/sasify-logo.png" alt="Sasify Solutions logo" width={80} height={80} decoding="async" />
        <div><span className="section-kicker">Your Satisfaction is Our Priority</span><h1>About Sasify Solutions</h1></div>
      </div>
      <p>Sasify Solutions is a digital tools and services marketplace founded by <a href={founderProfile} target="_blank" rel="noreferrer">Syed Sarosh</a>. Our inventory brings together AI, coding, design, productivity and other digital packages for buyers in Pakistan, with listed PKR prices and direct WhatsApp ordering.</p>
      <section className="description-section">
        <h2>Know the package before you pay</h2>
        <p>Each listing describes a specific package, not every feature or billing option offered by its provider. Shared access, personal access, team seats, invitations and credit packages are not interchangeable. Confirm the exact access arrangement, usage limits and activation requirements for the listing you select.</p>
        <p>Provider names and logos identify the relevant tools. Original prices are comparison references; provider billing, access and regional pricing may differ from the Sasify package.</p>
      </section>
      <section className="description-section">
        <h2>Orders, payment and warranty</h2>
        <p>Open a product page and choose Buy now on WhatsApp. The message includes the selected product and plan duration. Our team confirms availability, payment instructions and activation requirements before purchase.</p>
        <p>All products come with a warranty period. One-month and 30-day packages include a full 25-day warranty. For other packages, confirm the warranty duration and coverage with our team before payment.</p>
        <p>For one-year / 12-month plans, the listed Sasify amount is a one-time payment for the full year. No monthly payments to us are needed during that year.</p>
        <a href="/inventory" className="back-link">Browse the full inventory</a>
      </section>
      <section className="description-section">
        <h2>Contact Sasify Solutions</h2>
        <p>For orders, availability and warranty support, contact <a href={whatsappLink()} target="_blank" rel="noreferrer">+923116185711 on WhatsApp</a>.</p>
        <a href={whatsappLink()} target="_blank" rel="noreferrer" className="primary-button"><MessageCircle className="h-4 w-4" /> Contact on WhatsApp</a>
        <ul className="about-socials">{socials.map((social) => <li key={social.name}><a href={social.href} target="_blank" rel="noreferrer">{social.name}: @Sasify_Solutions</a></li>)}</ul>
        <p><a href="/#reviews">Read customer review excerpts</a> and follow their source links to the original Google Maps reviews.</p>
      </section>
    </article>
    <SiteFooter />
  </main>;
}
