import type { Metadata } from 'next';
import { siteOrigin } from '../site-config.ts';

export const metadata: Metadata = {
  title: 'Supplier Product | Sasify Solutions',
  robots: { index: false, follow: true },
  alternates: { canonical: `${siteOrigin}/inventory` },
};

export default function SupplierProductLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
