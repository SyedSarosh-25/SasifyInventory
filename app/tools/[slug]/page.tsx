import type { Metadata } from 'next';
import { Catalog } from '../../components/catalog';
import { SiteFooter, SiteHeader } from '../../components/site-chrome';
import { knownToolFamilySlugs, toolFamilyLabel } from '../../tool-families';
import { siteOrigin } from '../../product-utils';
import { shareImage, shareImageUrl } from '../../share-metadata';
import { ToolBuyingGuide } from '../../components/tool-buying-guide';
import { toolBuyingGuide } from '../../tool-buying-guides';

export function generateStaticParams() {
  return knownToolFamilySlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const label = toolFamilyLabel(slug);
  const guide = toolBuyingGuide(slug);
  const title = guide?.title || `${label} plans and prices in Pakistan | Sasify Solutions`;
  const description = guide?.description || `Compare available ${label} plans, durations, access types and prices in PKR. Choose the plan that fits your needs and order online.`;
  const url = `${siteOrigin}/tools/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, images: shareImage(title) },
    twitter: { card: 'summary_large_image', title, description, images: [shareImageUrl] },
  };
}

export default async function ToolFamilyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = toolBuyingGuide(slug);
  return <main><SiteHeader /><Catalog family={slug} heading={guide?.heading || `${toolFamilyLabel(slug)} plans`} introduction={<ToolBuyingGuide slug={slug} />} /><SiteFooter /></main>;
}
