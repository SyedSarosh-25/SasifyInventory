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

export const knownToolFamilySlugs = knownFamilies.map(([name]) => toolFamilySlug(name));

export function toolFamilyLabel(slug: string) {
  return knownFamilies.find(([name]) => toolFamilySlug(name) === slug)?.[0]
    || slug.replace(/(^|-)([a-z])/g, (_, separator: string, letter: string) => `${separator ? ' ' : ''}${letter.toUpperCase()}`);
}
