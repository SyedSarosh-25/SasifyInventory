'use client';

import { SpeedInsights } from '@vercel/speed-insights/react';
import { usePathname } from 'next/navigation';

export function PerformanceInsights() {
  const pathname = usePathname();
  return <SpeedInsights route={pathname?.startsWith('/products/') ? '/products/[id]' : pathname ?? undefined} />;
}
