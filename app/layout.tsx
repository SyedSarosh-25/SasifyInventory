import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { siteOrigin } from './product-utils';
import { CurrencyProvider } from './components/currency';
import { themeInitScript } from './theme-utils';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: 'Sasify Solutions Inventory',
  description:
    'Browse Sasify Solutions digital tools, compare PKR prices, read verified Google reviews, and order through WhatsApp.',
  openGraph: {
    title: 'Sasify Solutions Inventory',
    description:
      'Your one-stop destination for trusted digital tools, subscriptions and direct WhatsApp ordering.',
    images: [{ url: '/sasify-logo.png', width: 200, height: 200 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sasify Solutions Inventory',
    description: 'Explore trusted digital products and order directly on WhatsApp.',
    images: ['/sasify-logo.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <CurrencyProvider>{children}</CurrencyProvider>
      </body>
    </html>
  );
}
