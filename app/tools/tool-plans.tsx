'use client';

import { useEffect, useState } from 'react';
import { Catalog } from '../components/catalog';
import { toolFamilyLabel } from '../tool-families';

export function ToolPlans() {
  const [family, setFamily] = useState<string | null>(null);
  useEffect(() => {
    setFamily(new URLSearchParams(window.location.search).get('tool')?.toLowerCase().replace(/[^a-z0-9-]/g, '') || '');
  }, []);
  if (family === null) return <p className="catalog-stock-status" role="status">Loading plans…</p>;
  return <Catalog family={family} heading={family ? `${toolFamilyLabel(family)} plans` : 'Browse all tool plans'} />;
}
