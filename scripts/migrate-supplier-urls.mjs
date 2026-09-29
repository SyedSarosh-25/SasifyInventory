// One-time/re-runnable migration of published snapshots, with no database writes.
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { supplierUrlRegistry } from '../app/supplier-url-registry.generated.mjs';
import { claimSupplierUrl } from '../app/supplier-url-registry-core.mjs';
import { slugifySupplierName } from '../app/supplier-seo-utils.ts';
import { products as localProducts } from '../app/products.ts';
import { supplierProductRedirects } from '../app/supplier-product-redirects.mjs';

const target = new URL('../app/supplier-seo-products.generated.ts', import.meta.url);
const parse = (text) => JSON.parse(text.match(/export const supplierSeoProducts = (\[[\s\S]*\]);/)?.[1] || '[]');
const registry = structuredClone(supplierUrlRegistry);
let currentText = await readFile(target, 'utf8');
let current;
try { current = parse(currentText); }
catch { currentText = execFileSync('git', ['show', 'HEAD:app/supplier-seo-products.generated.ts'], { encoding: 'utf8' }); current = parse(currentText); }
const reserved = localProducts.map((product) => product.slug);
const claim = (product) => claimSupplierUrl(product, registry, slugifySupplierName(product.name.replace(/\s+full\s+warranty\s*$/i, '')), reserved);
const active = new Set();
for (const product of current) {
  product.slug = claim(product).slug;
  active.add(product.slug);
}
const commits = execFileSync('git', ['log', '--format=%H', '--', 'app/supplier-seo-products.generated.ts'], { encoding: 'utf8' }).trim().split('\n');
for (const commit of commits) {
  const text = execFileSync('git', ['show', `${commit}:app/supplier-seo-products.generated.ts`], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  for (const product of parse(text)) {
    const entry = claim(product);
    if (!active.has(entry.slug)) {
      current.push({ ...product, slug: entry.slug, available: 0, archived: true });
      active.add(entry.slug);
    }
  }
}
for (const [from, to] of supplierProductRedirects) {
  const entry = registry.find((item) => item.slug === to || item.aliases.includes(to));
  if (entry && from !== entry.slug && !entry.aliases.includes(from)) entry.aliases.push(from);
}
await writeFile(new URL('../app/supplier-url-registry.generated.mjs', import.meta.url), `// Persisted URL identities. Never discard entries or recompute existing slugs.\nexport const supplierUrlRegistry = ${JSON.stringify(registry, null, 2)};\n`);
await writeFile(target, currentText.slice(0, currentText.indexOf('export const supplierSeoProducts =')) + `export const supplierSeoProducts = ${JSON.stringify(current, null, 2)};\n`);
console.log(JSON.stringify({ savedProducts: registry.length, historicalAliases: registry.reduce((sum, entry) => sum + entry.aliases.length, 0), archivedPages: current.filter((product) => product.archived).length }));
