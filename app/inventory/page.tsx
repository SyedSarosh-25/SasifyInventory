import type { Metadata } from 'next';
import { Catalog } from '../components/catalog';
import { SiteFooter, SiteHeader } from '../components/site-chrome';
import { siteOrigin } from '../product-utils';
import { breadcrumbData } from '../seo';
import { StructuredData } from '../components/structured-data';
import { shareImage, shareImageUrl } from '../share-metadata';

const title = 'Digital Tools & Subscription Prices in Pakistan | Sasify';
const description = 'Browse every AI, coding, design and productivity plan at Sasify Solutions. Compare PKR prices, durations and access types, then buy online.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${siteOrigin}/inventory` },
  openGraph: { title, description, url: `${siteOrigin}/inventory`, images: shareImage(title) },
  twitter: { card: 'summary_large_image', title, description, images: [shareImageUrl] },
};

export default function InventoryPage() {
  return <main><SiteHeader /><StructuredData data={breadcrumbData([{ name: 'Home', path: '/' }, { name: 'Full inventory', path: '/inventory' }])} /><Catalog /><SiteFooter /></main>;
}
