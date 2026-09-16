'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Analytics } from '@vercel/analytics/react';
import { PerformanceInsights } from './performance-insights';

const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
let gaInitialized = false;

function GoogleAnalytics({ path }: { path: string }) {
  useEffect(() => {
    if (!gaMeasurementId || typeof window === 'undefined') return;

    const browserWindow = window as typeof window & {
      dataLayer?: unknown[];
      gtag?: (...args: unknown[]) => void;
    };

    browserWindow.dataLayer = browserWindow.dataLayer || [];
    browserWindow.gtag =
      browserWindow.gtag ||
      function gtag(...args: unknown[]) {
        browserWindow.dataLayer?.push(args);
      };

    const scriptExists = Array.from(document.scripts).some(
      (script) => script.dataset.ga4MeasurementId === gaMeasurementId,
    );
    if (!scriptExists) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
        gaMeasurementId,
      )}`;
      script.dataset.ga4MeasurementId = gaMeasurementId;
      document.head.appendChild(script);
    }

    if (!gaInitialized) {
      browserWindow.gtag('js', new Date());
      gaInitialized = true;
    }

    browserWindow.gtag('config', gaMeasurementId, {
      page_path: path || window.location.pathname,
    });
  }, [path]);

  return null;
}

export function SiteTelemetry() {
  const path = usePathname();
  if (path === '/checkout' || path === '/orders-admin') return null;
  return (
    <>
      <Analytics />
      <PerformanceInsights />
      <GoogleAnalytics path={path || '/'} />
    </>
  );
}
