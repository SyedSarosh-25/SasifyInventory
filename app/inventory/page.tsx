import type { Metadata } from 'next';
import { Catalog } from '../components/catalog';
import { SiteFooter, SiteHeader } from '../components/site-chrome';
import { siteOrigin } from '../product-utils';
import { breadcrumbData } from '../seo';
import { StructuredData } from '../components/structured-data';

const title = 'Digital Tools & Subscription Prices in Pakistan | Sasify Solutions';
const description = 'Browse the full Sasify Solutions inventory: AI, coding, design and productivity tools. Compare PKR prices and plan durations, then order on WhatsApp.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${siteOrigin}/inventory` },
  openGraph: { title, description, url: `${siteOrigin}/inventory`, images: [`${siteOrigin}/sasify-logo.png`] },
  twitter: { card: 'summary', title, description, images: [`${siteOrigin}/sasify-logo.png`] },
};

export default function InventoryPage() {
  return <main><SiteHeader /><StructuredData data={breadcrumbData([{ name: 'Home', path: '/' }, { name: 'Full inventory', path: '/inventory' }])} /><Catalog /><SiteFooter /></main>;
}
