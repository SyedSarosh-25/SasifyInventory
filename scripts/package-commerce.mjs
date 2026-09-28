import {
  cp,
  mkdir,
  readFile,
  writeFile,
  rm,
  realpath,
  readdir,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { products } from '../app/products.ts';
import { productHref } from '../app/product-utils.ts';
import { supplierProductRedirects } from '../app/supplier-product-redirects.mjs';

const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const target = path.join(root, '.vercel/output');
if (path.dirname(target) !== path.join(root, '.vercel'))
  throw new Error('Invalid output target.');
await rm(target, { recursive: true, force: true });
const staticDir = path.join(target, 'static');
const func = path.join(target, 'functions/api/commerce.func');
await mkdir(staticDir, { recursive: true });
await mkdir(func, { recursive: true });
// Only copy public assets; never copy deployment credentials or environment files.
for (const entry of await readdir(path.join(root, 'out'), {
  withFileTypes: true,
})) {
  if (entry.name.startsWith('.') || entry.name === 'vercel.json') continue;
  await cp(
    path.join(root, 'out', entry.name),
    path.join(staticDir, entry.name),
    { recursive: true },
  );
}
for (const name of [
  'handler.mjs',
  'checkout-availability.mjs',
  'accounts.mjs',
  'core.mjs',
  'binance-email.mjs',
  'inbound-email.mjs',
  'supplier.mjs',
  'supplier-capabilities.mjs',
  'supplier-api-log.mjs',
  'description.mjs',
  'product-display.mjs',
  'supplier-matching.mjs',
  'provider-media.mjs',
  'qamify.mjs',
  'mke.mjs',
  'piggyai.mjs',
  'zoomstore.mjs',
  'elite-tools.mjs',
  'scam-reports.mjs',
  'tool-requests.mjs',
  'google-reviews.mjs',
  'sasify-bot.mjs',
])
  await cp(path.join(root, 'commerce', name), path.join(func, name));
const catalog = products.flatMap((p) => [
  {
    id: p.id,
    name: p.name,
    description: p.description,
    duration: p.duration,
    price: p.sellingPricePkr,
    original_price_pkr: p.originalPricePkr ?? null,
  },
  ...(p.variants || [])
    .filter((v) => v.id)
    .map((v) => ({
      id: v.id,
      name: `${p.name} · ${v.name}`,
      duration: v.duration,
      price: v.sellingPricePkr,
      original_price_pkr: v.originalPricePkr ?? null,
    })),
]);
await writeFile(
  path.join(root, 'commerce/catalog.json'),
  JSON.stringify(catalog),
);
await writeFile(path.join(func, 'catalog.json'), JSON.stringify(catalog));
await writeFile(
  path.join(func, '.vc-config.json'),
  JSON.stringify({
    runtime: 'nodejs22.x',
    handler: 'handler.mjs',
    launcherType: 'Nodejs',
    shouldAddHelpers: true,
    maxDuration: 30,
  }),
);
const copied = new Set();
async function dependency(name) {
  if (copied.has(name)) return;
  copied.add(name);
  const pkg = path.join(root, 'node_modules', name, 'package.json');
  await cp(path.dirname(pkg), path.join(func, 'node_modules', name), {
    recursive: true,
  });
  const meta = JSON.parse(await readFile(pkg, 'utf8'));
  for (const dep of Object.keys(meta.dependencies || {})) await dependency(dep);
}
await dependency('pg');
await dependency('html-to-text');
await dependency('nodemailer');
await dependency('mailauth');
await dependency('mailparser');
const overrides = {};
async function htmlOverrides(dir, prefix = '') {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory())
      await htmlOverrides(path.join(dir, entry.name), `${relative}/`);
    else if (entry.name.endsWith('.html') && entry.name !== '404.html')
      overrides[relative] = {
        path: relative === 'index.html' ? '' : relative.slice(0, -5),
      };
  }
}
await htmlOverrides(staticDir);
const productRedirectRoutes = products
  .map((product) => ({
    src: `/products/${product.id}`,
    status: 308,
    headers: { Location: productHref(product) },
  }))
  .filter((route) => route.src !== route.headers.Location);
const supplierProductRedirectRoutes = supplierProductRedirects.map(([from, to]) => ({
  src: `/products/${from}`,
  status: 308,
  headers: { Location: `/products/${to}` },
}));
await writeFile(
  path.join(target, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      overrides,
      routes: [
        {
          src: '/account/?$',
          status: 308,
          headers: { Location: '/dashboard' },
        },
        ...productRedirectRoutes,
        ...supplierProductRedirectRoutes,
        {
          src: '/api/google-reviews-sync',
          dest: '/api/commerce?action=google-reviews-sync',
        },
        {
          src: '/api/nayapay/inbound-email',
          dest: '/api/commerce?action=inbound-email&provider=auto',
        },
        {
          src: '/api/binance/inbound-email',
          dest: '/api/commerce?action=inbound-email&provider=binance',
        },
        { src: '/api/commerce', dest: '/api/commerce' },
        {
          src: '/(checkout|orders-admin|team|account|dashboard|login|signup|forgot-password|reset-password)',
          headers: {
            'Cache-Control': 'no-store',
            'X-Robots-Tag': 'noindex, nofollow',
            'Referrer-Policy': 'no-referrer',
          },
          continue: true,
        },
        {
          src: '/(.*)\\.rsc',
          headers: {
            'Content-Type': 'text/x-component',
            'Cache-Control': 'no-cache',
          },
          continue: true,
        },
        { handle: 'filesystem' },
        { src: '/(.*)', status: 404, dest: '/404.html' },
      ],
      crons: [
        {
          path: '/api/google-reviews-sync',
          schedule: '0 0 * * *',
        },
      ],
    },
    null,
    2,
  ),
);
await mkdir(path.join(root, '.vercel'), { recursive: true });
try {
  await cp(
    path.join(root, 'out/.vercel/project.json'),
    path.join(root, '.vercel/project.json'),
  );
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  await readFile(path.join(root, '.vercel/project.json'));
}
console.log(
  'Static site and private Node function packaged. No environment files included.',
);
