import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { MessageCircle } from 'lucide-react';
import { breadcrumbData } from '../seo';
import { siteOrigin } from '../site-config';
import { whatsappLink } from '../product-utils';
import { SiteFooter, SiteHeader } from './site-chrome';
import { StructuredData } from './structured-data';

export const policyLinks = [
  { href: '/warranty', label: 'Warranty' },
  { href: '/refunds', label: 'Refunds' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
];

export function policyMetadata(title: string, description: string, path: string): Metadata {
  const fullTitle = `${title} | Sasify Solutions`;
  const url = `${siteOrigin}${path}`;
  return {
    title: fullTitle, description,
    alternates: { canonical: url },
    openGraph: { title: fullTitle, description, url, images: [`${siteOrigin}/sasify-logo.png`] },
    twitter: { card: 'summary', title: fullTitle, description, images: [`${siteOrigin}/sasify-logo.png`] },
  };
}

export function PolicyPage({ title, summary, path, children }: { title: string; summary: string; path: string; children: ReactNode }) {
  return <main>
    <SiteHeader />
    <StructuredData data={breadcrumbData([{ name: 'Home', path: '/' }, { name: title, path }])} />
    <article className="detail-shell about-page policy-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">{title}</span></nav>
      <span className="section-kicker">Sasify Solutions policies</span>
      <h1>{title}</h1>
      <p className="policy-summary">{summary}</p>
      <p className="policy-updated">Last updated: 3 September 2026</p>
      {children}
      <nav className="policy-navigation" aria-label="Related policies">
        {policyLinks.map((link) => <a key={link.href} href={link.href} aria-current={link.href === path ? 'page' : undefined}>{link.label}</a>)}
      </nav>
      <a href={whatsappLink()} target="_blank" rel="noreferrer" className="primary-button"><MessageCircle className="h-4 w-4" /> Ask a policy question</a>
    </article>
    <SiteFooter />
  </main>;
}
