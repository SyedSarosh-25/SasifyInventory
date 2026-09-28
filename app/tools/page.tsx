import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '../components/site-chrome';
import { ToolPlans } from './tool-plans';
import { siteOrigin } from '../site-config';
import { shareImage, shareImageUrl } from '../share-metadata';

const title = 'Browse tool plans and prices | Sasify Solutions';
const description = 'Compare available AI, design, coding and productivity plans, access types and PKR prices from Sasify Solutions.';
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${siteOrigin}/tools` },
  openGraph: { title, description, url: `${siteOrigin}/tools`, images: shareImage(title) },
  twitter: { card: 'summary_large_image', title, description, images: [shareImageUrl] },
};

export default function ToolsPage() {
  return <main><SiteHeader /><ToolPlans /><SiteFooter /></main>;
}
