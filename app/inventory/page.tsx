import type { Metadata } from 'next';
import { Catalog } from '../components/catalog';
import { SiteFooter, SiteHeader } from '../components/site-chrome';
import { siteOrigin } from '../product-utils';

export const metadata: Metadata = {
  title: 'Full Inventory | Sasify Solutions',
  description: 'Browse every Sasify Solutions product, compare prices and order on WhatsApp.',
  alternates: { canonical: `${siteOrigin}/inventory` },
};

export default function InventoryPage() {
  return <main><SiteHeader /><Catalog /><SiteFooter /></main>;
}
