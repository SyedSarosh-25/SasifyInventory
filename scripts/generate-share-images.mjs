import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { products } from '../app/products.ts';
import { supplierSeoProducts } from '../app/supplier-seo.ts';
import { supplierLogo, supplierMonogram } from '../app/supplier-product-utils.ts';
import { originalPricePkr, productLogo, savingsPkr } from '../app/product-utils.ts';
import { productAbout, supplierProductAbout } from '../app/product-about.ts';
import { supplierOriginalPriceComparison, supplierSavingsPkr } from '../app/supplier-price-utils.ts';

const root = process.cwd();
const outputRoot = path.join(root, 'dist', 'client');
const logoDataUri = `data:image/png;base64,${(await readFile(path.join(root, 'public', 'sasify-logo.png'))).toString('base64')}`;
const productLogoCache = new Map();

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

function formatAmount(value, fallback = 'Price may vary') {
  if (!Number.isFinite(Number(value))) return fallback;
  return `PKR ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(Math.round(Number(value)))}`;
}

function formatPrice(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0
    ? formatAmount(value)
    : 'Shop online in Pakistan';
}

function shortProductDescription(product, supplier = false) {
  const about = supplier ? supplierProductAbout(product) : productAbout(product);
  const firstParagraph = about.paragraphs[0] || '';
  const purpose = firstParagraph.match(/It is mainly used for (.+?)(?:\. The listed access period|\.$|$)/i)?.[1];
  return String(purpose || firstParagraph)
    .replace(/\s+/g, ' ')
    .trim();
}

async function remoteLogoDataUri(url) {
  if (!url) return null;
  if (productLogoCache.has(url)) return productLogoCache.get(url);
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') || 'image/png';
    const dataUri = `data:${contentType};base64,${Buffer.from(await response.arrayBuffer()).toString('base64')}`;
    productLogoCache.set(url, dataUri);
    return dataUri;
  } catch {
    productLogoCache.set(url, null);
    return null;
  }
}

function shareSvg({ name, category, price, originalPrice, savings, description, monogram, productLogoDataUri }) {
  const titleLines = wrapText(name, name.length > 55 ? 32 : 38, 3);
  const titleSize = name.length > 55 ? 42 : name.length > 38 ? 50 : 58;
  const titleLineHeight = Math.round(titleSize * 1.08);
  const titleY = 236;
  const titleBottom = titleY + (titleLines.length - 1) * titleLineHeight + titleSize;
  const descriptionY = titleBottom + 48;
  const descriptionLines = wrapText(
    description || 'Buy online in Pakistan with automated delivery after payment verification.',
    47,
    titleLines.length > 2 ? 1 : 2,
  );
  // Keep the three price rows above the footer even when a long product name
  // takes three title lines.
  const priceY = Math.min(descriptionY + (descriptionLines.length - 1) * 36 + 92, 470);
  const hasPriceBreakdown = originalPrice !== undefined || savings !== undefined;
  const priceBlock = hasPriceBreakdown
    ? `<line x1="72" y1="${priceY - 34}" x2="704" y2="${priceY - 34}" stroke="#c9d8ff" stroke-width="2"/>
  <text x="72" y="${priceY}" fill="#50617f" font-family="Arial, sans-serif" font-size="22">Original price</text>
  <text x="270" y="${priceY}" fill="#50617f" font-family="Arial, sans-serif" font-size="28" font-weight="700">${escapeXml(originalPrice || 'Price may vary')}</text>
  <text x="72" y="${priceY + 38}" fill="#50617f" font-family="Arial, sans-serif" font-size="22">Our price</text>
  <text x="270" y="${priceY + 38}" fill="#285cff" font-family="Arial, sans-serif" font-size="34" font-weight="800">${escapeXml(price)}</text>
  <text x="72" y="${priceY + 76}" fill="#08795f" font-family="Arial, sans-serif" font-size="22" font-weight="700">Your savings</text>
  <text x="270" y="${priceY + 76}" fill="#08795f" font-family="Arial, sans-serif" font-size="28" font-weight="800">${escapeXml(savings || 'Price may vary')}</text>`
    : `<text x="72" y="${priceY}" fill="#50617f" font-family="Arial, sans-serif" font-size="22">Our price</text>
  <text x="184" y="${priceY}" fill="#285cff" font-family="Arial, sans-serif" font-size="40" font-weight="800">${escapeXml(price)}</text>`;

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
  ${priceBlock}
  <rect x="870" y="187" width="300" height="300" rx="38" fill="#ffffff" stroke="#c9d8ff" stroke-width="2" filter="url(#shadow)"/>
  <rect x="930" y="247" width="180" height="180" rx="28" fill="${productLogoDataUri ? '#ffffff' : 'url(#tile)'}" stroke="${productLogoDataUri ? '#d4def7' : 'none'}" stroke-width="2"/>
  ${productLogoDataUri ? `<image href="${productLogoDataUri}" x="970" y="287" width="100" height="100" preserveAspectRatio="xMidYMid meet"/>` : `<text x="1020" y="361" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="72" font-weight="800">${escapeXml(monogram)}</text>`}
  <text x="72" y="586" fill="#50617f" font-family="Arial, sans-serif" font-size="22" font-weight="700">Search · Select · Pay · Get credentials</text>
  <text x="1128" y="586" text-anchor="end" fill="#50617f" font-family="Arial, sans-serif" font-size="22" font-weight="700">AI tools · Subscriptions · Services</text>
</svg>`;
}

async function writeImage(relativePath, data) {
  const destination = path.join(outputRoot, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await sharp(Buffer.from(data)).png().toFile(destination);
}

function virtualNumbersShareSvg(logoUri) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="vnBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="55%" stop-color="#f0fdf4"/>
      <stop offset="100%" stop-color="#ecfdf5"/>
    </linearGradient>
    <linearGradient id="vnCardBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a7f3d0"/>
      <stop offset="100%" stop-color="#6ee7b7"/>
    </linearGradient>
    <filter id="vnCardShadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="16" stdDeviation="22" flood-color="#065f46" flood-opacity="0.12"/>
    </filter>
  </defs>

  <rect width="1200" height="630" fill="url(#vnBg)"/>

  <!-- Aesthetic background glow -->
  <circle cx="1120" cy="90" r="280" fill="#d1fae5" opacity="0.45"/>
  <circle cx="90" cy="560" r="220" fill="#d1fae5" opacity="0.35"/>

  <!-- Header Brand -->
  <image href="${logoUri}" x="64" y="46" width="54" height="54" preserveAspectRatio="xMidYMid meet"/>
  <text x="132" y="82" fill="#064e3b" font-family="Arial, sans-serif" font-size="25" font-weight="800" letter-spacing="1.5">SASIFY SOLUTIONS</text>

  <!-- Top Right Pill -->
  <rect x="836" y="46" width="300" height="46" rx="23" fill="#d1fae5" stroke="#a7f3d0" stroke-width="1.5"/>
  <text x="986" y="75" text-anchor="middle" fill="#065f46" font-family="Arial, sans-serif" font-size="14.5" font-weight="700">⚡ 1-CLICK INSTANT SMS OTP</text>

  <!-- Left Content Column -->
  <text x="64" y="156" fill="#059669" font-family="Arial, sans-serif" font-size="17" font-weight="800" letter-spacing="2">PAKISTAN&apos;S DIGITAL STORE</text>
  
  <text x="64" y="214" fill="#0f172a" font-family="Arial, sans-serif" font-size="46" font-weight="800">Virtual Phone Numbers</text>
  <text x="64" y="268" fill="#0f172a" font-family="Arial, sans-serif" font-size="42" font-weight="800">(Instant SMS OTP Codes)</text>

  <text x="64" y="322" fill="#475569" font-family="Arial, sans-serif" font-size="21" font-weight="500">Private disposable numbers for WhatsApp, Telegram, ChatGPT,</text>
  <text x="64" y="354" fill="#475569" font-family="Arial, sans-serif" font-size="21" font-weight="500">Claude, Google, Discord &amp; 1,200+ global platforms.</text>

  <!-- 4 Feature Badges in 2x2 grid -->
  <g transform="translate(64, 396)">
    <rect x="0" y="0" width="310" height="52" rx="12" fill="#ffffff" stroke="#d1fae5" stroke-width="1.5"/>
    <text x="18" y="33" fill="#065f46" font-family="Arial, sans-serif" font-size="16" font-weight="700">💰 Flat Rates from Rs 100 PKR</text>

    <rect x="326" y="0" width="320" height="52" rx="12" fill="#ffffff" stroke="#d1fae5" stroke-width="1.5"/>
    <text x="344" y="33" fill="#065f46" font-family="Arial, sans-serif" font-size="16" font-weight="700">🛡️ 100% Auto-Refund Guarantee</text>

    <rect x="0" y="64" width="310" height="52" rx="12" fill="#ffffff" stroke="#d1fae5" stroke-width="1.5"/>
    <text x="18" y="97" fill="#065f46" font-family="Arial, sans-serif" font-size="16" font-weight="700">⚡ Live Code Capture on Screen</text>

    <rect x="326" y="64" width="320" height="52" rx="12" fill="#ffffff" stroke="#d1fae5" stroke-width="1.5"/>
    <text x="344" y="97" fill="#065f46" font-family="Arial, sans-serif" font-size="16" font-weight="700">🇵🇰 NayaPay, SadaPay, Bank Pay</text>
  </g>

  <!-- Right Side Interactive Mockup Card -->
  <g transform="translate(740, 138)" filter="url(#vnCardShadow)">
    <rect width="396" height="394" rx="24" fill="#ffffff" stroke="url(#vnCardBorder)" stroke-width="2"/>

    <!-- Header bar in mockup -->
    <rect x="16" y="16" width="364" height="42" rx="12" fill="#f0fdf4"/>
    <circle cx="36" cy="37" r="6" fill="#10b981"/>
    <text x="54" y="42" fill="#065f46" font-family="Arial, sans-serif" font-size="13.5" font-weight="700">LIVE VERIFICATION LINE</text>
    <text x="360" y="42" text-anchor="end" fill="#059669" font-family="Arial, sans-serif" font-size="13" font-weight="700">ACTIVE</text>

    <!-- Number Box -->
    <rect x="16" y="74" width="364" height="82" rx="16" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/>
    <text x="36" y="102" fill="#64748b" font-family="Arial, sans-serif" font-size="13" font-weight="600">Allocated Virtual Number</text>
    <text x="36" y="136" fill="#0f172a" font-family="Courier New, monospace" font-size="24" font-weight="800">+62 831 8689 6861</text>
    <text x="360" y="134" text-anchor="end" fill="#059669" font-family="Arial, sans-serif" font-size="14" font-weight="700">🇮🇩 ID</text>

    <!-- SMS Code Bubble -->
    <rect x="16" y="170" width="364" height="124" rx="16" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="2"/>
    <text x="36" y="202" fill="#065f46" font-family="Arial, sans-serif" font-size="14" font-weight="700">💬 Incoming Verification SMS:</text>
    <rect x="36" y="216" width="324" height="60" rx="12" fill="#ffffff" stroke="#6ee7b7" stroke-width="1"/>
    <text x="54" y="254" fill="#047857" font-family="Courier New, monospace" font-size="32" font-weight="900" letter-spacing="4">849 - 216</text>
    <text x="340" y="252" text-anchor="end" fill="#059669" font-family="Arial, sans-serif" font-size="13" font-weight="700">COPIED ✓</text>

    <!-- Supported Apps Footer (no overlap) -->
    <rect x="16" y="308" width="364" height="64" rx="14" fill="#f8fafc"/>
    <text x="30" y="346" fill="#334155" font-family="Arial, sans-serif" font-size="12" font-weight="700">WhatsApp · Telegram · ChatGPT</text>
    <text x="364" y="346" text-anchor="end" fill="#059669" font-family="Arial, sans-serif" font-size="12" font-weight="800">+1,200 Apps</text>
  </g>

  <!-- Bottom Footer Bar -->
  <line x1="64" y1="574" x2="1136" y2="574" stroke="#e2e8f0" stroke-width="1.5"/>
  <text x="64" y="604" fill="#059669" font-family="Arial, sans-serif" font-size="17" font-weight="700">www.sasifysolutions.com/virtual-numbers</text>
  <text x="1136" y="604" text-anchor="end" fill="#64748b" font-family="Arial, sans-serif" font-size="16" font-weight="600">Pakistan&apos;s Fully Automated Digital Store · 240+ Countries</text>
</svg>`;
}

await writeImage('opengraph-image.png', shareSvg({
  name: 'Digital tools & subscriptions',
  category: "Pakistan's fully automated digital store",
  price: 'Shop online in Pakistan',
  monogram: 'SS',
}));

const vnSvg = virtualNumbersShareSvg(logoDataUri);
await writeImage('virtual-numbers-og.png', vnSvg);
try {
  await sharp(Buffer.from(vnSvg)).png().toFile(path.join(root, 'public', 'virtual-numbers-og.png'));
} catch {}

const allProducts = new Map();
for (const product of products) {
  const originalPrice = originalPricePkr(product);
  allProducts.set(product.slug || product.id, {
    slug: product.slug || product.id,
    name: product.name,
    category: product.category || 'Digital tools and subscriptions',
    price: formatPrice(product.sellingPricePkr),
    description: shortProductDescription(product),
    originalPrice: originalPrice === null ? 'Price may vary' : formatAmount(originalPrice),
    savings: savingsPkr(product) === null ? 'Price may vary' : formatAmount(savingsPkr(product)),
  });
}
for (const product of supplierSeoProducts) {
  const comparison = supplierOriginalPriceComparison(product);
  const savings = supplierSavingsPkr(product);
  allProducts.set(product.slug, {
    slug: product.slug,
    name: product.name,
    category: product.category || 'Digital tools and subscriptions',
    price: formatPrice(product.price),
    description: shortProductDescription(product, true),
    originalPrice: comparison === null ? 'Price may vary' : formatAmount(comparison.totalPkr),
    savings: savings === null ? 'Price may vary' : formatAmount(savings),
  });
}

await Promise.all([...allProducts.values()].map(async (product) => {
  const localProduct = products.find((item) => (item.slug || item.id) === product.slug);
  const supplierProduct = supplierSeoProducts.find((item) => item.slug === product.slug);
  const logoUrl = localProduct
    ? productLogo(localProduct)
    : supplierProduct
      ? supplierLogo(supplierProduct.name, supplierProduct.logoUrl)
      : '';
  const productLogoDataUri = await remoteLogoDataUri(logoUrl);
  return writeImage(
    path.join('product-og', `${product.slug}.png`),
    shareSvg({ ...product, monogram: supplierMonogram(product.name), productLogoDataUri }),
  );
}));

console.log(`Generated ${allProducts.size + 1} static share images with the real Sasify logo.`);
