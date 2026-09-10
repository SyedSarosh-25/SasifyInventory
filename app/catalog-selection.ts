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

export const orbitTools = [
  { name: 'Claude', id: 'p013', className: 'orbit-claude' },
  { name: 'Premium', id: 'p012', className: 'orbit-chatgpt' },
  { name: 'Hostinger', id: 'p100', className: 'orbit-figma' },
  { name: 'Hostinger VPS', id: 'p101', className: 'orbit-cursor' },
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
