import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { findStorefrontCategory, storefrontCategories } from '../../categories';
import { Catalog } from '../../components/catalog';
import { SiteHeader, SiteFooter } from '../../components/site-chrome';
import { siteOrigin } from '../../site-config';
import { shareImage, shareImageUrl } from '../../share-metadata';
export function generateStaticParams() { return storefrontCategories.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{slug: string}> }): Promise<Metadata> {
  const category = findStorefrontCategory((await params).slug);
  if (!category) return {};
  const title = `${category.title} plans and prices in Pakistan | Sasify`;
  const description = `${category.description} Compare available digital plans, PKR prices, access types and warranty details before ordering online.`;
  const url = `${siteOrigin}/categories/${category.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, images: shareImage(title) },
    twitter: { card: 'summary_large_image', title, description, images: [shareImageUrl] },
  };
}
export default async function CategoryPage({ params }: { params: Promise<{slug: string}> }) {
  const category = findStorefrontCategory((await params).slug);
  if (!category) notFound();
  return <main><SiteHeader /><Catalog initialCategory={category.name} heading={category.title} /><SiteFooter /></main>;
}
