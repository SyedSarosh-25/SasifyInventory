const knownFamilies: Array<[string, RegExp]> = [
  ['ChatGPT', /\bchat\s*gpt\b/i],
  ['OpenAI API', /\bopenai\b/i],
  ['CapCut', /\bcap\s*cut\b/i],
  ['Claude', /\bclaude\b/i],
  ['Figma', /\bfigma\b/i],
  ['Canva', /\bcanva\b/i],
  ['Grok', /\b(?:grok|supergrok)\b/i],
  ['Perplexity', /\bperplexity\b/i],
  ['Cursor', /\bcursor\b/i],
  ['Adobe Express', /\badobe\s+express\b/i],
  ['Adobe Photoshop', /\badobe\s+photoshop\b/i],
  ['Adobe', /\badobe\b/i],
  ['Midjourney', /\bmidjourney\b/i],
  ['Gemini', /\bgemini\b/i],
  ['Netflix', /\bnetflix\b/i],
  ['Spotify', /\bspotify\b/i],
  ['Notion', /\bnotion\b/i],
  ['Outlook', /\boutlook\b/i],
  ['Grammarly', /\bgrammarly\b/i],
  ['Hostinger', /\bhostinger\b/i],
];

export function getVariantShortLabel(name: string): string {
  const n = String(name || '');
  const creditMatch = n.match(/(\d+[MBK]|[$]\d+)\s*(?:credit|token|api)?/i);
  const durMatch = n.match(/(\d+)\s*(?:days?|months?|years?|d|m|y)\b/i);
  const isShared = /\bshared\b/i.test(n);
  const isUltra = /\bultra\s*stable\b/i.test(n);
  const isPrivate = /\bprivate\b/i.test(n);
  const isStandard = /\bstandard\b/i.test(n);
  const isPremium = /\bpremium\b/i.test(n);
  const isEdu = /\bedu\b/i.test(n);

  const parts: string[] = [];
  if (isShared) parts.push('Shared');
  else if (isUltra) parts.push('Ultra Stable');
  else if (isPrivate) parts.push('Private');
  else if (isStandard) parts.push('Standard');
  else if (isPremium) parts.push('Premium');
  else if (isEdu) parts.push('Edu');

  if (creditMatch) parts.push(creditMatch[1].toUpperCase());
  if (durMatch && (!creditMatch || parts.length === 0)) parts.push(durMatch[0]);

  if (parts.length > 0) return parts.join(' · ');
  return n.replace(/full warranty|warranty|fw|cdk|activation code|token package|tokens|package/gi, '').trim().slice(0, 20);
}

export function toolFamilyName(name: string) {
  const value = String(name || '').trim();
  const known = knownFamilies.find(([, matcher]) => matcher.test(value));
  if (known) return known[0];
  const first = value.match(/[A-Za-z][A-Za-z0-9-]*/)?.[0] || '';
  return first.length > 2 ? first : '';
}

export function toolFamilySlug(name: string) {
  return toolFamilyName(name).toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function toolFamilyHref(name: string) {
  const slug = toolFamilySlug(name);
  return knownFamilies.some(([family]) => toolFamilySlug(family) === slug)
    ? `/tools/${slug}`
    : `/tools?tool=${encodeURIComponent(slug)}`;
}

export const knownToolFamilySlugs = knownFamilies.map(([name]) => toolFamilySlug(name)).filter(Boolean);

export function toolFamilyLabel(slug: string) {
  return knownFamilies.find(([name]) => toolFamilySlug(name) === slug)?.[0]
    || slug.replace(/(^|-)([a-z])/g, (_, separator: string, letter: string) => `${separator ? ' ' : ''}${letter.toUpperCase()}`);
}
