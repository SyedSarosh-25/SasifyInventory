import type { Metadata, Viewport } from 'next';
import { Geist, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { siteDescription, siteOrigin, siteTitle } from './site-config';
import { CurrencyProvider } from './components/currency';
import { StructuredData } from './components/structured-data';
import { SiteTelemetry } from './components/site-telemetry';
import { MotionSystem } from './components/motion-system';
import { AdminShortcut } from './components/admin-shortcut';
import { organizationData } from './seo';
import { shareImage, shareImageUrl } from './share-metadata';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const displaySans = Plus_Jakarta_Sans({
  variable: '--font-display',
  subsets: ['latin'],
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: siteTitle,
  alternates: { canonical: `${siteOrigin}/` },
  robots: { 'max-image-preview': 'large' },
  verification: {
    google: 'l7lAGn1-T4ymCBShiZZMTVFF1vT3MK2IL92FHcXWKY4',
    other: { 'msvalidate.01': '3EBFF9C64E14DCD2D3149DAF9D02F7F5' },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon', sizes: 'any' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-48x48.png', type: 'image/png', sizes: '48x48' },
      { url: '/favicon-96x96.png', type: 'image/png', sizes: '96x96' },
      { url: '/icon-192x192.png', type: 'image/png', sizes: '192x192' },
    ],
    shortcut: [{ url: '/favicon.ico', type: 'image/x-icon' }],
    apple: [{ url: '/apple-touch-icon.png', type: 'image/png', sizes: '180x180' }],
  },
  description: siteDescription,
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: `${siteOrigin}/`,
    siteName: 'Sasify Solutions',
    locale: 'en_PK',
    images: shareImage(siteTitle),
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: [shareImageUrl],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" style={{ colorScheme: 'light' }}>
      <body className={`${geistSans.variable} ${displaySans.variable} antialiased`}>
        <StructuredData data={organizationData} />
        <CurrencyProvider>{children}</CurrencyProvider>
        <MotionSystem />
        <AdminShortcut />
        <SiteTelemetry />
      </body>
    </html>
  );
}
