import { products } from './products.ts';

export const featuredProducts = ['p093', 'p013', 'p063', 'p028', 'p088', 'p094', 'p095', 'p012', 'p017', 'p023']
  .map((id) => {
    const product = products.find((item) => item.id === id);
    if (!product) throw new Error(`Missing featured product: ${id}`);
    return product;
  });

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

export function filterProducts(query: string, category: string) {
  const needle = query.trim().toLowerCase();
  return products.filter((product) => (category === 'All' || product.category === category)
    && (!needle || [product.name, product.category, product.duration, product.description].join(' ').toLowerCase().includes(needle)));
}
