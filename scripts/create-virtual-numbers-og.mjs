import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const logoBuffer = await readFile(path.join(root, 'public', 'sasify-logo.png'));
const logoDataUri = `data:image/png;base64,${logoBuffer.toString('base64')}`;

export function virtualNumbersShareSvg(logoUri = logoDataUri) {
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

  <!-- Subtle aesthetic background glow -->
  <circle cx="1120" cy="90" r="280" fill="#d1fae5" opacity="0.45"/>
  <circle cx="90" cy="560" r="220" fill="#d1fae5" opacity="0.35"/>

  <!-- Header Brand -->
  <image href="${logoUri}" x="64" y="46" width="54" height="54" preserveAspectRatio="xMidYMid meet"/>
  <text x="132" y="82" fill="#064e3b" font-family="Arial, sans-serif" font-size="25" font-weight="800" letter-spacing="1.5">SASIFY SOLUTIONS</text>

  <!-- Top Right Pill -->
  <rect x="836" y="46" width="300" height="46" rx="23" fill="#d1fae5" stroke="#a7f3d0" stroke-width="1.5"/>
  <text x="986" y="75" text-anchor="middle" fill="#065f46" font-family="Arial, sans-serif" font-size="15" font-weight="700">⚡ 1-CLICK INSTANT SMS OTP</text>

  <!-- Left Content Column -->
  <text x="64" y="156" fill="#059669" font-family="Arial, sans-serif" font-size="17" font-weight="800" letter-spacing="2">PAKISTAN'S DIGITAL STORE</text>
  
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

    <!-- Supported Apps Footer -->
    <rect x="16" y="308" width="364" height="64" rx="14" fill="#f8fafc"/>
    <text x="32" y="346" fill="#334155" font-family="Arial, sans-serif" font-size="13.5" font-weight="700">WhatsApp · Telegram · ChatGPT · Claude</text>
    <text x="360" y="346" text-anchor="end" fill="#059669" font-family="Arial, sans-serif" font-size="13" font-weight="800">+1200 Apps</text>
  </g>

  <!-- Bottom Footer Bar -->
  <line x1="64" y1="574" x2="1136" y2="574" stroke="#e2e8f0" stroke-width="1.5"/>
  <text x="64" y="604" fill="#059669" font-family="Arial, sans-serif" font-size="17" font-weight="700">www.sasifysolutions.com/virtual-numbers</text>
  <text x="1136" y="604" text-anchor="end" fill="#64748b" font-family="Arial, sans-serif" font-size="16" font-weight="600">Pakistan's Fully Automated Digital Store · 240+ Countries</text>
</svg>`;
}

async function run() {
  const svg = virtualNumbersShareSvg();
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  
  await writeFile(path.join(root, 'public', 'virtual-numbers-og.png'), pngBuffer);
  
  const distClient = path.join(root, 'dist', 'client');
  try {
    await mkdir(distClient, { recursive: true });
    await writeFile(path.join(distClient, 'virtual-numbers-og.png'), pngBuffer);
  } catch {}

  const outDir = path.join(root, 'out');
  try {
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, 'virtual-numbers-og.png'), pngBuffer);
  } catch {}

  console.log('Successfully generated virtual-numbers-og.png in public/, dist/client/, and out/!');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
