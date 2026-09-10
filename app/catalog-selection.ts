import { products } from './products.ts';

export const featuredProducts = ['p013', 'p012', 'p100', 'p101', 'p093', 'p096', 'p095', 'p016', 'p028', 'p088']
  .map((id) => {
    const product = products.find((item) => item.id === id);
    if (!product) throw new Error(`Missing featured product: ${id}`);
    return product;
  });

export const heroProducts = ['p013', 'p093', 'p028', 'p019', 'p088']
  .map((id) => {
    const product = products.find((item) => item.id === id);
    if (!product) throw new Error(`Missing hero product: ${id}`);
    return product;
  });

const supplierNameNoise = new Set(['a', 'an', 'the', 'api', 'cdk', 'comes', 'day', 'days', 'for', 'full', 'has', 'included', 'month', 'months', 'no', 'not', 'nw', 'fw', 'pre', 'order', 'preorder', 'warranty', 'week', 'weeks', 'with', 'without', 'year', 'years']);

function comparableProductName(value: string) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/)
    .filter((token) => !supplierNameNoise.has(token) && !/^\d+(?:m|mo|month|months|d|day|days|y|year|years)?$/.test(token))
    .sort()
    .join(' ');
}

export function supplierEquivalentProductName(staticName: string, supplierName: string) {
  const left = comparableProductName(staticName);
  const right = comparableProductName(supplierName);
  return !!left && left === right;
}

export const orbitTools = [
  { name: 'Figma', id: 'p066', className: 'orbit-figma' },
  { name: 'CapCut', id: 'p028', className: 'orbit-capcut' },
  { name: 'ChatGPT', id: 'p093', className: 'orbit-chatgpt' },
  { name: 'Claude', id: 'p013', className: 'orbit-claude' },
  { name: 'Cursor', id: 'p088', className: 'orbit-cursor' },
  { name: 'Gemini', id: 'p017', className: 'orbit-gemini' },
].map((tool) => {
  const product = products.find((item) => item.id === tool.id);
  if (!product) throw new Error(`Missing orbit product: ${tool.id}`);
  return { ...tool, product };
});

export function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function filterProducts(query: string, category: string) {
  const needle = normalizeSearchText(query.trim());
  return products.filter((product) => (category === 'All' || product.category === category)
    && (!needle || normalizeSearchText([product.name, product.slug, product.category, product.duration].join(' ')).includes(needle)));
}
