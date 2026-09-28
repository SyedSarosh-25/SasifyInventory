import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inferSupplierCategory, isChatGptPlusProduct } from '../app/catalog-selection.ts';
import { defaultSiteOrigin } from '../app/site-config.ts';
import { slugifySupplierName, stableSupplierHash, supplierProductSlug } from '../app/supplier-seo-utils.ts';
import { customerProduct } from '../commerce/product-display.mjs';
import { supplierProductKey } from '../commerce/supplier-matching.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = path.join(root, 'app', 'supplier-seo-products.generated.ts');
const redirectsTarget = path.join(root, 'app', 'supplier-product-redirects.generated.mjs');
const source =
  process.env.SASIFY_SUPPLIER_SEO_SOURCE ||
  `${process.env.NEXT_PUBLIC_SITE_ORIGIN || defaultSiteOrigin}/api/commerce?action=catalog`;

const compactText = (value, fallback = '') =>
  String(value || fallback)
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 4000);

const nameKey = (value) => slugifySupplierName(String(value || '')).replace(/-/g, ' ');

function parseExportedArray(source, exportName) {
  const match = source.match(new RegExp(`export const ${exportName} = ([\\s\\S]*?);\\s*$`));
  if (!match) return [];
  try {
    const value = JSON.parse(match[1]);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

async function readPreviousProducts() {
  const source = await readFile(target, 'utf8').catch(() => '');
  return parseExportedArray(source, 'supplierSeoProducts');
}

async function readPreviousRedirects() {
  const source = await readFile(redirectsTarget, 'utf8').catch(() => '');
  return parseExportedArray(source, 'supplierProductRedirectsGenerated');
}

function toSeoProduct(product) {
  const publicProduct = customerProduct(product);
  const id = String(publicProduct.id || publicProduct.canonical_key || '').trim();
  const name = compactText(publicProduct.name);
  const price = Math.round(Number(publicProduct.price));
  const available = Math.max(0, Math.floor(Number(publicProduct.available || 0)));
  if (!id || !name || name.length < 3 || !Number.isFinite(price) || price <= 0)
    return null;
  if (isChatGptPlusProduct(name)) return null;
  const description = compactText(
    publicProduct.description,
    `${name} is available through Sasify Solutions with instant delivery after payment verification. Review the listing details, requirements and availability before ordering.`,
  );
  const output = {
    id,
    slug: supplierProductSlug({ id, name }),
    canonicalKey: String(publicProduct.canonical_key || id),
    name,
    description,
    price,
    available,
    category: inferSupplierCategory(name, description),
  };
  const deliveryInstruction = compactText(publicProduct.delivery_instruction);
  if (deliveryInstruction) output.deliveryInstruction = deliveryInstruction;
  if (publicProduct.provider_id) output.providerId = String(publicProduct.provider_id);
  if (publicProduct.provider_name) output.providerName = String(publicProduct.provider_name);
  if (/^(?:https?:\/\/|\/(?!\/))/i.test(String(publicProduct.logo_url || '')))
    output.logoUrl = String(publicProduct.logo_url);
  if (publicProduct.requires_customer_email) output.requiresCustomerEmail = true;
  return output;
}

try {
  const response = await fetch(source, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const previousProducts = await readPreviousProducts();
  const previousRedirects = await readPreviousRedirects();
  const seen = new Set();
  const products = (Array.isArray(data.products) ? data.products : [])
    .filter((product) => product?.source === 'supplier')
    .map(toSeoProduct)
    .filter(Boolean)
    .filter((product) => {
      if (seen.has(product.slug)) return false;
      seen.add(product.slug);
      return true;
    })
    .sort((left, right) => left.name.localeCompare(right.name, 'en', { numeric: true }));

  // Names are the durable public identity. If two offers ever share one
  // display name, disambiguate only that collision with a deterministic key
  // hash so normal catalog refreshes never change a URL.
  const slugCounts = new Map();
  for (const product of products) slugCounts.set(product.slug, (slugCounts.get(product.slug) || 0) + 1);
  const usedSlugs = new Set();
  for (const product of products) {
    if ((slugCounts.get(product.slug) || 0) > 1 || usedSlugs.has(product.slug)) {
      product.slug = `${product.slug}-${stableSupplierHash(product.canonicalKey || product.id)}`;
    }
    usedSlugs.add(product.slug);
  }

  // Preserve old hashed URLs from the previous generated snapshot. Matching
  // by canonical key handles renamed display text; matching by normalized name
  // handles the common case where the provider only rebuilt its key.
  const currentByCanonicalKey = new Map(products.map((product) => [product.canonicalKey, product]));
  const currentByProductKey = new Map(products.map((product) => [supplierProductKey(product.name), product]));
  const currentByName = new Map(products.map((product) => [nameKey(product.name), product]));
  const redirects = [...previousRedirects];
  const redirectSources = new Set(redirects.map(([from]) => from));
  for (const previous of previousProducts) {
    const current = currentByCanonicalKey.get(previous.canonicalKey)
      || currentByProductKey.get(supplierProductKey(previous.name))
      || currentByName.get(nameKey(previous.name));
    if (!current || !previous.slug || previous.slug === current.slug || redirectSources.has(previous.slug)) continue;
    redirects.push([previous.slug, current.slug]);
    redirectSources.add(previous.slug);
  }

  const generated = `// Generated by scripts/sync-supplier-seo-catalog.mjs. Keep committed so static\n// builds remain crawlable if the live stock API is temporarily unavailable.\nexport const supplierSeoGeneratedAt = ${JSON.stringify(new Date().toISOString())};\nexport const supplierSeoProducts = ${JSON.stringify(products, null, 2)};\n`;
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, generated);
  const redirectsGenerated = `// Generated by scripts/sync-supplier-seo-catalog.mjs.\n// Historical supplier URL aliases redirect to the current stable product URL.\nexport const supplierProductRedirectsGenerated = ${JSON.stringify(redirects, null, 2)};\n`;
  await writeFile(redirectsTarget, redirectsGenerated);
  console.log(`Preserved ${redirects.length} supplier URL redirect alias(es)`);
  console.log(`Synced ${products.length} supplier SEO product(s) from ${source}`);
} catch (error) {
  const existing = await readFile(target, 'utf8').catch(() => '');
  if (existing.includes('supplierSeoProducts')) {
    console.warn(`Supplier SEO catalog refresh skipped: ${error.message}`);
  } else {
    throw error;
  }
}
