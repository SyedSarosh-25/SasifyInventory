const knownFamilies: Array<[string, RegExp]> = [
  ['ChatGPT Plus', /\bchat\s*gpt\b/i],
  ['Claude API', /\bclaude\b.*\bapi\b|\bapi\b.*\bclaude\b/i],
  ['Claude', /\bclaude\b/i],
  ['Codex API', /\bcodex\b/i],
  ['CapCut Pro', /\bcap\s*cut\b/i],
  ['Canva Pro', /\bcanva\b/i],
  ['Figma Pro', /\bfigma\b/i],
  ['Grok AI', /\b(?:grok|supergrok)\b/i],
  ['Perplexity Pro', /\bperplexity\b/i],
  ['Cursor AI', /\bcursor\b/i],
  ['Gemini AI Pro', /\bgemini\b/i],
  ['Hostinger', /\bhostinger\b/i],
  ['Minimax AI', /\bminimax\b/i],
  ['Midjourney', /\bmidjourney\b/i],
  ['Netflix', /\bnetflix\b/i],
  ['Spotify', /\bspotify\b/i],
  ['Notion', /\bnotion\b/i],
  ['Outlook / Hotmail', /\b(?:outlook|hotmail)\b/i],
  ['Grammarly', /\bgrammarly\b/i],
  ['Adobe Suite', /\badobe\b/i],
  ['X Accounts', /\b(?:account x|x stock|twitter)\b/i],
  ['Telegram Groups', /\btelegram\b/i],
  ['OpenAI API', /\bopenai\b/i],
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

export const knownToolFamilySlugs = knownFamilies.map(([name]) => toolFamilySlug(name));

export function toolFamilyLabel(slug: string) {
  return knownFamilies.find(([name]) => toolFamilySlug(name) === slug)?.[0]
    || slug.replace(/(^|-)([a-z])/g, (_, separator: string, letter: string) => `${separator ? ' ' : ''}${letter.toUpperCase()}`);
}
