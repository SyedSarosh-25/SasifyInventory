import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '../components/site-chrome';
import { ScamReports } from '../components/scam-reports';
import { StructuredData } from '../components/structured-data';
import { breadcrumbData } from '../seo';
import { siteOrigin } from '../site-config';
import { shareImage, shareImageUrl } from '../share-metadata';

const title = 'Scam Reports | Sasify Solutions';
const description =
  'Review community-submitted scam reports and send factual information for manual review by Sasify Solutions.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${siteOrigin}/scammers` },
  openGraph: {
    title,
    description,
    url: `${siteOrigin}/scammers`,
    images: shareImage(title),
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [shareImageUrl],
  },
};

export default function Page() {
  return (
    <>
      <SiteHeader />
      <StructuredData
        data={breadcrumbData([
          { name: 'Home', path: '/' },
          { name: 'Scam reports', path: '/scammers' },
        ])}
      />
      <main className="page-shell scam-page-shell">
        <ScamReports />
      </main>
      <SiteFooter />
    </>
  );
}
