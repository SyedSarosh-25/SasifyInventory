import { spawnSync } from 'node:child_process';
import { cp, lstat, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultSiteOrigin } from '../app/site-config.ts';
import { robotsText, sitemapXml } from '../app/seo.ts';

const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const out = path.join(root, 'out');
const env = {
  ...process.env,
  SASIFY_STATIC_EXPORT: '1',
  NEXT_PUBLIC_SITE_ORIGIN: process.env.NEXT_PUBLIC_SITE_ORIGIN || defaultSiteOrigin,
};
const origin = new URL(env.NEXT_PUBLIC_SITE_ORIGIN);
if (!['http:', 'https:'].includes(origin.protocol) || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) {
  throw new Error('NEXT_PUBLIC_SITE_ORIGIN must be a plain HTTP(S) origin, with no path or credentials.');
}
env.NEXT_PUBLIC_SITE_ORIGIN = origin.origin;

const packagePath = fileURLToPath(new URL('../package.json', import.meta.resolve('vinext')));
const { bin } = JSON.parse(await readFile(packagePath, 'utf8'));
const result = spawnSync(process.execPath, [path.resolve(path.dirname(packagePath), bin.vinext), 'build'], {
  cwd: root, env, stdio: 'inherit',
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

// Only replace this project's generated upload folder, never a linked directory.
if (path.dirname(out) !== root || path.basename(out) !== 'out') throw new Error('Invalid output directory.');
const previous = await lstat(out).catch((error) => {
  if (error.code !== 'ENOENT') throw error;
  return null;
});
if (previous?.isSymbolicLink()) throw new Error('Refusing to replace a linked output directory.');
await rm(out, { recursive: true, force: true });
await mkdir(out);
await cp(path.join(root, 'dist/client'), out, { recursive: true });
await cp(path.join(root, 'scripts/static.htaccess'), path.join(out, '.htaccess'));
await cp(path.join(root, 'scripts/static.vercel.json'), path.join(out, 'vercel.json'));
await writeFile(path.join(out, 'sitemap.xml'), sitemapXml());
await writeFile(path.join(out, 'robots.txt'), robotsText());

const check = spawnSync(process.execPath, ['--experimental-strip-types', '--test', 'tests/static-build.test.mjs'], {
  cwd: root, env, stdio: 'inherit',
});
if (check.error) throw check.error;
if (check.status !== 0) process.exit(check.status ?? 1);
console.log(`\nStatic upload folder: ${out}\nSite origin: ${env.NEXT_PUBLIC_SITE_ORIGIN}`);
