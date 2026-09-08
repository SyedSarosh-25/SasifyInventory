import { cp, mkdir, readFile, writeFile, rm, realpath, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { products } from '../app/products.ts';

const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const target = path.join(root, '.vercel/output');
if (path.dirname(target) !== path.join(root, '.vercel')) throw new Error('Invalid output target.');
await rm(target, { recursive: true, force: true });
const staticDir = path.join(target, 'static');
const func = path.join(target, 'functions/api/commerce.func');
await mkdir(staticDir, { recursive: true });
await mkdir(func, { recursive: true });
// Only copy public assets; never copy deployment credentials or environment files.
for (const entry of await readdir(path.join(root, 'out'), { withFileTypes: true })) {
  if (entry.name.startsWith('.') || entry.name === 'vercel.json') continue;
  await cp(path.join(root, 'out', entry.name), path.join(staticDir, entry.name), { recursive: true });
}
for (const name of ['handler.mjs','core.mjs','supplier.mjs','qamify.mjs','mke.mjs']) await cp(path.join(root,'commerce',name),path.join(func,name));
const catalog = products.filter((p) => p.id === 'p093').map((p) => ({ id:p.id,name:p.name,price:p.sellingPricePkr }));
await writeFile(path.join(root,'commerce/catalog.json'),JSON.stringify(catalog));
await writeFile(path.join(func,'catalog.json'),JSON.stringify(catalog));
await writeFile(path.join(func,'.vc-config.json'),JSON.stringify({ runtime:'nodejs22.x',handler:'handler.mjs',launcherType:'Nodejs',shouldAddHelpers:true,maxDuration:30 }));
const require = createRequire(import.meta.url), copied = new Set();
async function dependency(name) {
  if (copied.has(name)) return;
  copied.add(name);
  const pkg = path.join(root,'node_modules',name,'package.json');
  await cp(path.dirname(pkg),path.join(func,'node_modules',name),{recursive:true});
  const meta = JSON.parse(await readFile(pkg,'utf8'));
  for (const dep of Object.keys(meta.dependencies || {})) await dependency(dep);
}
await dependency('pg');
await dependency('html-to-text');
const overrides = {};
async function htmlOverrides(dir, prefix='') {
  for (const entry of await readdir(dir,{withFileTypes:true})) {
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) await htmlOverrides(path.join(dir,entry.name),`${relative}/`);
    else if (entry.name.endsWith('.html') && entry.name !== '404.html') overrides[relative] = { path: relative === 'index.html' ? '' : relative.slice(0,-5) };
  }
}
await htmlOverrides(staticDir);
await writeFile(path.join(target,'config.json'),JSON.stringify({ version:3,overrides,routes:[
  {src:'/api/nayapay/email-webhook',dest:'/api/commerce?action=email-webhook'},
  {src:'/api/commerce',dest:'/api/commerce'},
  {src:'/(checkout|orders-admin)',headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'},continue:true},
  {src:'/(.*)\\.rsc',headers:{'Content-Type':'text/x-component','Cache-Control':'no-cache'},continue:true},
  {handle:'filesystem'},
  {src:'/(.*)',status:404,dest:'/404.html'}
] },null,2));
await mkdir(path.join(root,'.vercel'),{recursive:true});
try { await cp(path.join(root,'out/.vercel/project.json'),path.join(root,'.vercel/project.json')); }
catch (error) { if (error.code !== 'ENOENT') throw error; await readFile(path.join(root,'.vercel/project.json')); }
console.log('Static site and private Node function packaged. No environment files included.');
