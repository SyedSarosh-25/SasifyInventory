import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Sasify Solutions Inventory',
  description:
    'Browse Sasify Solutions digital products, listed PKR prices, public original price references, and one-tap WhatsApp ordering.',
  openGraph: {
    title: 'Sasify Solutions Inventory',
    description:
      'Premium digital subscriptions, software and credits with listed prices and direct WhatsApp ordering.',
    images: [{ url: '/sasify-3d-hero.png', width: 1536, height: 1024 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sasify Solutions Inventory',
    description: 'Explore premium digital products and order directly on WhatsApp.',
    images: ['/sasify-3d-hero.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
