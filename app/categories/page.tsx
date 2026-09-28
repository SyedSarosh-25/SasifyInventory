import type { Metadata } from 'next';
import { CategoryDiscovery } from '../components/category-discovery';
import { SiteHeader, SiteFooter } from '../components/site-chrome';
import { LocalizedContent } from '../components/language';
import { siteOrigin } from '../site-config';
import { shareImage, shareImageUrl } from '../share-metadata';
const title = 'Digital Tool Categories | Sasify Solutions';
const description = 'Explore AI, creative, coding, productivity and digital subscription categories at Sasify Solutions.';
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${siteOrigin}/categories` },
  openGraph: { title, description, url: `${siteOrigin}/categories`, images: shareImage(title) },
  twitter: { card: 'summary_large_image', title, description, images: [shareImageUrl] },
};
export default function CategoriesPage() {
  return <main><SiteHeader /><LocalizedContent><div className="collection-intro section-inner"><span className="section-kicker">Categories</span><h1>Find the right tool for your next big idea.</h1><p>Compare access, duration and pricing in one place.</p></div></LocalizedContent><CategoryDiscovery /><SiteFooter /></main>;
}
