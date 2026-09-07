'use client';
import { usePathname } from 'next/navigation';
import { Analytics } from '@vercel/analytics/react';
import { PerformanceInsights } from './performance-insights';
export function SiteTelemetry() {
  const path = usePathname();
  if (path === '/checkout' || path === '/orders-admin') return null;
  return <><Analytics /><PerformanceInsights /></>;
}
