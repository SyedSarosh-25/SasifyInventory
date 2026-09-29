'use client';

import { useEffect, useState } from 'react';
import { Catalog } from '../components/catalog';
import { toolFamilyLabel } from '../tool-families';

export function ToolPlans() {
  // Start with all plans so the static page has a heading and product links
  // for crawlers; ?tool= (unknown tool families) narrows it after load.
  const [family, setFamily] = useState('');
  useEffect(() => {
    setFamily(new URLSearchParams(window.location.search).get('tool')?.toLowerCase().replace(/[^a-z0-9-]/g, '') || '');
  }, []);
  return <Catalog family={family} heading={family ? `${toolFamilyLabel(family)} plans` : 'Browse all tool plans'} />;
}
