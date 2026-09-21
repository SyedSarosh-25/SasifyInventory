import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { products } from '../app/products.ts';
import { supplierSeoProducts } from '../app/supplier-seo.ts';
import { supplierMonogram } from '../app/supplier-product-utils.ts';

const root = process.cwd();
const outputRoot = path.join(root, 'dist', 'client');
const logoDataUri = `data:image/png;base64,${(await readFile(path.join(root, 'public', 'sasify-logo.png'))).toString('base64')}`;

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function wrapText(value, maxChars, maxLines = 3) {
  const words = String(value).trim().split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && next.length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1].slice(0, Math.max(1, maxChars - 3)).trimEnd()}…`;
  return kept;
}

function textLines(lines, x, y, lineHeight, attributes) {
  return `<text x="${x}" y="${y}" ${attributes}>${lines
    .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`)
    .join('')}</text>`;
}

function formatPrice(value) {
  if (!Number.isFinite(Number(value)) || Number(value) <= 0) return 'Shop online in Pakistan';
  return `PKR ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(Number(value))}`;
}

function shareSvg({ name, category, price, monogram }) {
  const titleLines = wrapText(name, name.length > 55 ? 32 : 38, 3);
  const titleSize = name.length > 55 ? 42 : name.length > 38 ? 50 : 58;
  const titleLineHeight = Math.round(titleSize * 1.08);
  const titleY = 236;
  const titleBottom = titleY + (titleLines.length - 1) * titleLineHeight + titleSize;
  const descriptionY = titleBottom + 48;
  const descriptionLines = wrapText('Buy online in Pakistan with automated delivery after payment verification.', 43, 2);
  const priceY = descriptionY + (descriptionLines.length - 1) * 36 + 92;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="page" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8fbff"/><stop offset="0.58" stop-color="#eef3ff"/><stop offset="1" stop-color="#e7ddff"/></linearGradient>
    <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#285cff"/><stop offset="1" stop-color="#7541f5"/></linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="20" stdDeviation="20" flood-color="#2f4994" flood-opacity="0.15"/></filter>
  </defs>
  <rect width="1200" height="630" fill="url(#page)"/>
  <image href="${logoDataUri}" x="72" y="52" width="58" height="58" preserveAspectRatio="xMidYMid meet"/>
  <text x="148" y="91" fill="#285cff" font-family="Arial, sans-serif" font-size="28" font-weight="800" letter-spacing="2">SASIFY SOLUTIONS</text>
  <rect x="979" y="52" width="189" height="50" rx="25" fill="#d9f8ee"/>
  <text x="1073.5" y="84" text-anchor="middle" fill="#08795f" font-family="Arial, sans-serif" font-size="21" font-weight="700">Instant delivery</text>
  <text x="72" y="176" fill="#285cff" font-family="Arial, sans-serif" font-size="22" font-weight="800" letter-spacing="2">${escapeXml(String(category).toUpperCase())}</text>
  ${textLines(titleLines, 72, titleY, titleLineHeight, `fill="#09102a" font-family="Arial, sans-serif" font-size="${titleSize}" font-weight="800"`)}
  ${textLines(descriptionLines, 72, descriptionY, 36, 'fill="#50617f" font-family="Arial, sans-serif" font-size="29"')}
  <text x="72" y="${priceY}" fill="#50617f" font-family="Arial, sans-serif" font-size="22">Our price</text>
  <text x="184" y="${priceY}" fill="#285cff" font-family="Arial, sans-serif" font-size="40" font-weight="800">${escapeXml(price)}</text>
  <rect x="870" y="187" width="300" height="300" rx="38" fill="#ffffff" stroke="#c9d8ff" stroke-width="2" filter="url(#shadow)"/>
  <rect x="930" y="247" width="180" height="180" rx="28" fill="url(#tile)"/>
  <text x="1020" y="361" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="72" font-weight="800">${escapeXml(monogram)}</text>
  <text x="72" y="586" fill="#50617f" font-family="Arial, sans-serif" font-size="22" font-weight="700">Search · Select · Pay · Get credentials</text>
  <text x="1128" y="586" text-anchor="end" fill="#50617f" font-family="Arial, sans-serif" font-size="22" font-weight="700">AI tools · Subscriptions · Services</text>
</svg>`;
}

async function writeImage(relativePath, data) {
  const destination = path.join(outputRoot, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await sharp(Buffer.from(data)).png().toFile(destination);
}

await writeImage('opengraph-image.png', shareSvg({
  name: 'Digital tools & subscriptions',
  category: "Pakistan's fully automated digital store",
  price: 'Shop online in Pakistan',
  monogram: 'SS',
}));

const allProducts = new Map();
for (const product of products) {
  allProducts.set(product.slug || product.id, {
    slug: product.slug || product.id,
    name: product.name,
    category: product.category || 'Digital tools and subscriptions',
    price: formatPrice(product.sellingPricePkr),
  });
}
for (const product of supplierSeoProducts) {
  allProducts.set(product.slug, {
    slug: product.slug,
    name: product.name,
    category: product.category || 'Digital tools and subscriptions',
    price: formatPrice(product.price),
  });
}

await Promise.all([...allProducts.values()].map((product) => writeImage(
  path.join('product-og', `${product.slug}.png`),
  shareSvg({ ...product, monogram: supplierMonogram(product.name) }),
)));

console.log(`Generated ${allProducts.size + 1} static share images with the real Sasify logo.`);
