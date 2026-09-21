import { products } from './products.ts';

export const featuredProducts = ['p013', 'p012', 'p100', 'p101']
  .map((id) => {
    const product = products.find((item) => item.id === id);
    if (!product) throw new Error(`Missing featured product: ${id}`);
    return product;
  });

export const heroProducts = ['p013', 'p012', 'p100', 'p101']
  .map((id) => {
    const product = products.find((item) => item.id === id);
    if (!product) throw new Error(`Missing hero product: ${id}`);
    return product;
  });

const supplierNameNoise = new Set(['a', 'an', 'the', 'api', 'cdk', 'comes', 'd', 'day', 'days', 'for', 'full', 'has', 'included', 'm', 'mo', 'month', 'months', 'no', 'not', 'nw', 'fw', 'pre', 'order', 'preorder', 'warranty', 'week', 'weeks', 'with', 'without', 'y', 'year', 'years']);
const supplierDurationUnit = /^(?:d|day|days|m|mo|month|months|y|year|years)$/;
const supplierCompactDuration = /^\d+(?:d|day|days|m|mo|month|months|y|year|years)$/;

function comparableProductName(value: string) {
  const tokens = String(value || '').toLowerCase().replace(/(\d),(?=\d)/g, '$1').replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  return tokens
    .filter((token, index) => !supplierNameNoise.has(token) && !supplierCompactDuration.test(token)
      && !(/^\d+$/.test(token) && (supplierDurationUnit.test(tokens[index - 1] || '') || supplierDurationUnit.test(tokens[index + 1] || ''))))
    .sort()
    .join(' ');
}

export function supplierEquivalentProductName(staticName: string, supplierName: string) {
  const left = comparableProductName(staticName);
  const right = comparableProductName(supplierName);
  return !!left && left === right;
}

export function isChatGptPlusProduct(name: string) {
  return /\bchatgpt\s+plus\b/i.test(String(name || ''));
}

export type LiveCatalogProduct = {
  id: string;
  name: string;
  description?: string;
  price: number;
  available: number;
  logo_url?: string;
  source?: 'local' | 'supplier';
  canonical_key?: string;
  provider_name?: string;
  display_name?: string;
  display_price?: number;
  display_original_price?: number;
};

export type FixedTopProductSpec = {
  source: 'local' | 'supplier';
  id?: string;
  canonicalKey?: string;
  canonicalAliases?: string[];
  displayName: string;
  displayPricePkr?: number;
  displayOriginalPricePkr?: number;
};

/**
 * The homepage Top 8 is a curated merchandising block. Keep this order
 * stable so supplier catalogue refreshes cannot reshuffle the storefront.
 */
export const fixedTopProductSpecs: FixedTopProductSpec[] = [
  { source: 'local', id: 'p093', displayName: 'ChatGPT Plus · Private Account' },
  { source: 'local', id: 'p093-shared', displayName: 'ChatGPT Plus · Shared Account' },
  { source: 'local', id: 'p013', displayName: 'Claude Team Plan Standard' },
  { source: 'local', id: 'p012', displayName: 'Claude Team Plan Premium' },
  {
    source: 'supplier',
    canonicalKey: 'auto:capcut-duration-1m',
    displayName: 'CapCut Pro · 1 Month',
    displayPricePkr: 999,
    displayOriginalPricePkr: 5600,
  },
  {
    source: 'supplier',
    canonicalKey: 'auto:grok-heavy-duration-1m',
    canonicalAliases: ['auto:cdk-grok-heavy-supper-duration-1m'],
    displayName: 'SuperGrok Heavy · 30 Days',
    displayPricePkr: 19999,
    displayOriginalPricePkr: 60000,
  },
  {
    source: 'supplier',
    canonicalKey: 'auto:education-figma-plan-pro-duration-2y',
    displayName: 'Figma Pro · 2 Years',
    displayPricePkr: 6999,
    displayOriginalPricePkr: 109440,
  },
  {
    source: 'local',
    id: 'p100',
    displayName: 'Hostinger Unlimited · 12 Months',
  },
];

export function selectFixedTopProducts(catalog: LiveCatalogProduct[]) {
  return fixedTopProductSpecs.flatMap((spec) => {
    const product = catalog.find((candidate) => {
      if (candidate.source !== spec.source) return false;
      if (spec.id && candidate.id === spec.id) return true;
      const keys = [spec.canonicalKey, ...(spec.canonicalAliases || [])].filter(Boolean);
      return keys.some((key) => candidate.canonical_key === key || candidate.id === key);
    });
    if (!product) return [];
    const localProduct = spec.source === 'local' && spec.id
      ? products.find((candidate) => candidate.id === spec.id)
      : undefined;
    return [{
      ...product,
      ...(localProduct ? {
        name: localProduct.name,
        description: localProduct.description,
        price: localProduct.sellingPricePkr,
      } : {}),
      display_name: spec.displayName,
      display_price: spec.displayPricePkr ?? localProduct?.sellingPricePkr,
      display_original_price: spec.displayOriginalPricePkr,
    }];
  });
}

export const heroSupplierShortcuts = [
  {
    label: 'CapCut',
    canonicalKey: 'auto:capcut-pro-30d-has-a-30-day-warranty',
    fallbackPattern: /\bcapcut\b.*(?:30\s*d|30\s*day|1\s*month|1m)|(?:30\s*d|30\s*day|1\s*month|1m).*\bcapcut\b/i,
  },
  {
    label: 'Grok',
    canonicalKey: 'auto:cdk-supergrok-1m',
    fallbackPattern: /\bcdk\b.*(?:super\s*grok|supergrok).*(?:1\s*month|1m)|(?:super\s*grok|supergrok).*\bcdk\b.*(?:1\s*month|1m)/i,
  },
] as const;

export function selectHeroSupplierShortcut(
  catalog: LiveCatalogProduct[],
  target: (typeof heroSupplierShortcuts)[number],
) {
  const available = catalog.filter((product) => product.source !== 'local' && product.available > 0);
  return available.find((product) => product.canonical_key === target.canonicalKey || product.id === target.canonicalKey)
    || available
      .filter((product) => target.fallbackPattern.test(product.name))
      .sort((left, right) => left.price - right.price)[0]
    || null;
}

function shuffleProducts<T>(items: T[], random: () => number) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const value = Number(random());
    const normalized = Number.isFinite(value) ? Math.min(Math.max(value, 0), 0.999999999) : 0;
    const swapIndex = Math.floor(normalized * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

/**
 * Selects a fresh homepage set from the live stock response. The shared
 * ChatGPT offer is the first local anchor when present; the other nine slots
 * are randomized from available, de-duplicated local and supplier products.
 */
export function selectRandomTopProducts(
  catalog: LiveCatalogProduct[],
  random: () => number = Math.random,
) {
  const localChatGpt = catalog.find(
    (product) => product.source === 'local' && product.id === 'p093-shared',
  ) || catalog.find(
    (product) => product.source === 'local' && product.id === 'p093' && product.available > 0,
  );
  const seen = new Set<string>();
  if (localChatGpt) seen.add(localChatGpt.id);

  const candidates = catalog.filter((product) => {
    if (product.available <= 0 || product === localChatGpt || product.id === 'p093-ultra') return false;
    if (product.source === 'supplier' && isChatGptPlusProduct(product.name)) return false;
    const key = product.source === 'supplier' ? product.canonical_key || product.id : product.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const slots = localChatGpt ? 9 : 10;
  return [
    ...(localChatGpt ? [localChatGpt] : []),
    ...shuffleProducts(candidates, random).slice(0, slots),
  ];
}

export const orbitTools = [
  { name: 'GPT', id: 'p093', className: 'orbit-gpt', searchQuery: 'ChatGPT' },
  { name: 'CapCut', id: 'capcut', className: 'orbit-capcut', searchQuery: 'CapCut' },
  { name: 'Figma', id: 'figma', className: 'orbit-figma', searchQuery: 'Figma' },
  { name: 'Claude', id: 'p013', className: 'orbit-claude', searchQuery: 'Claude' },
  { name: 'Hostinger', id: 'p100', className: 'orbit-hostinger', searchQuery: 'Hostinger' },
  { name: 'Grok', id: 'grok', className: 'orbit-grok', searchQuery: 'Grok' },
].map((tool) => {
  const product = products.find((item) => item.id === tool.id);
  return { ...tool, product };
});

export function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function filterProducts(query: string, category: string) {
  const needle = normalizeSearchText(query.trim());
  return products.filter((product) => (category === 'All' || product.category === category)
    && (!needle || normalizeSearchText(product.name).includes(needle)));
}

const supplierCategoryRules: Array<[string, RegExp]> = [
  ['API & Credit Packages', /\bapi\b|credits?|tokens?|redeem code|api gateway/i],
  ['VPN & Privacy', /\bvpn\b|privacy|nordvpn|expressvpn|surfshark|proton vpn/i],
  ['Entertainment & Streaming', /netflix|spotify|prime video|disney|hulu|streaming|youtube premium|music subscription/i],
  ['AI Video, Image & Creative', /canva|capcut|midjourney|runway|kling|higgsfield|video|image generation|photo editor|creative/i],
  ['AI Coding & Development', /cursor|codex|github copilot|replit|lovable|bolt\.new|coding|developer|development|programming/i],
  ['Education & Learning', /udemy|coursera|skillshare|education|learning|course|language learning/i],
  ['Professional & Career', /linkedin|resume|cv builder|career|professional/i],
  ['Productivity & Business', /notion|office 365|microsoft 365|google workspace|business|productivity|crm|accounting/i],
  ['AI Assistants & Research', /chatgpt|claude|gemini|perplexity|grok|deepseek|manus|ai assistant|research|writing/i],
];

export function inferSupplierCategory(name: string, description = '') {
  const text = `${name} ${description}`;
  return supplierCategoryRules.find(([, pattern]) => pattern.test(text))?.[0] || 'Other Tools';
}
