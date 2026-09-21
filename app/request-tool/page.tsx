import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '../components/site-chrome';
import { ToolRequest } from '../components/tool-request';
import { siteOrigin } from '../site-config';
import { shareImage, shareImageUrl } from '../share-metadata';

const title = 'Request a Tool | Sasify Solutions';
const description = 'Request a digital tool, plan or access type from Sasify Solutions and share your contact number for availability updates.';

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: false },
  alternates: { canonical: `${siteOrigin}/request-tool` },
  openGraph: { title, description, url: `${siteOrigin}/request-tool`, images: shareImage(title) },
  twitter: { card: 'summary_large_image', title, description, images: [shareImageUrl] },
};

export default function Page() {
  return <><SiteHeader /><ToolRequest /><SiteFooter /></>;
}
