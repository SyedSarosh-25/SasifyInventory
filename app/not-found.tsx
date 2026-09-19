import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page not found | Sasify Solutions',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main>
      <h1>Page not found</h1>
      <p>The page you requested does not exist.</p>
      <a href="/">Return to Sasify Solutions</a>
    </main>
  );
}
