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
