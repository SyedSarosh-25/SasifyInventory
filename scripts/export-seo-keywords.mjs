import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { productAbout, supplierProductAbout } from '../app/product-about.ts';
import { productHref } from '../app/product-utils.ts';
import { products } from '../app/products.ts';
import {
  supplierProductHref,
  supplierSeoProducts,
} from '../app/supplier-seo.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const docsDir = path.join(root, 'docs');
const generatedAt = new Date().toISOString();

const rows = [
  ...products.map((product) => ({
    type: 'Local catalog',
    name: product.name,
    path: productHref(product),
    about: productAbout(product),
  })),
  ...supplierSeoProducts.map((product) => ({
    type: 'Supplier catalog',
    name: product.name,
    path: supplierProductHref(product),
    about: supplierProductAbout(product),
  })),
];

const escapeCell = (value) => String(value).replaceAll('|', '\\|');
const lines = [
  '# Sasify SEO keyword targets',
  '',
  `Generated: ${generatedAt}`,
  '',
  'These are product-specific global search-intent phrases based on Bing Keyword Research with Country = All and Language = All, combined with relevant Pakistan purchase-intent terms rendered on product pages. Exact Google search volume is not claimed here; use Google Search Console or Keyword Planner for volume and ranking data.',
  '',
  '| Type | Product | Page | Target keyword phrases |',
  '| --- | --- | --- | --- |',
  ...rows.map(
    ({ type, name, path: pagePath, about }) =>
      `| ${escapeCell(type)} | ${escapeCell(name)} | ${escapeCell(pagePath)} | ${escapeCell(about.searchTerms.join('; '))} |`,
  ),
  '',
];

await mkdir(docsDir, { recursive: true });
await writeFile(path.join(docsDir, 'seo-keywords.md'), `${lines.join('\n')}\n`);
console.log(`Exported ${rows.length} product keyword row(s) to docs/seo-keywords.md`);
