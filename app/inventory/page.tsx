import type { Metadata } from 'next';
import { Catalog } from '../components/catalog';
import { SiteFooter, SiteHeader } from '../components/site-chrome';
import { siteOrigin } from '../product-utils';

export const metadata: Metadata = {
  title: 'Full Inventory | Sasify Solutions',
  description: 'Browse every Sasify Solutions product, compare prices and order on WhatsApp.',
  alternates: { canonical: `${siteOrigin}/inventory` },
};

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q } = await searchParams;
  return <main><SiteHeader /><Catalog initialQuery={typeof q === 'string' ? q : ''} /><SiteFooter /></main>;
}
