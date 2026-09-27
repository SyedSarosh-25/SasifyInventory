import type { Metadata } from 'next';
import { Catalog } from '../../components/catalog';
import { SiteFooter, SiteHeader } from '../../components/site-chrome';
import { knownToolFamilySlugs, toolFamilyLabel } from '../../tool-families';
import { siteOrigin } from '../../product-utils';

export function generateStaticParams() {
  return knownToolFamilySlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const label = toolFamilyLabel(slug);
  return {
    title: `${label} plans and prices in Pakistan | Sasify Solutions`,
    description: `Compare available ${label} plans, durations, access types and prices in PKR. Choose the plan that fits your needs and order online.`,
    alternates: { canonical: `${siteOrigin}/tools/${slug}` },
  };
}

export default async function ToolFamilyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <main><SiteHeader /><Catalog family={slug} heading={`${toolFamilyLabel(slug)} plans`} /><SiteFooter /></main>;
}
