import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultSiteOrigin } from '../app/site-config.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const key = process.env.INDEXNOW_KEY || 'd5f0f4a9d4b64b11a7d21f0f2c8e9a63';
const origin = new URL(process.env.NEXT_PUBLIC_SITE_ORIGIN || defaultSiteOrigin);
const sitemap = await readFile(path.join(root, 'out', 'sitemap.xml'), 'utf8');
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => url);

if (!urlList.length) throw new Error('No URLs found in out/sitemap.xml');

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: origin.host,
    key,
    keyLocation: `${origin.origin}/${key}.txt`,
    urlList,
  }),
});

if (!response.ok) {
  throw new Error(`IndexNow rejected the submission: HTTP ${response.status}`);
}

console.log(`Submitted ${urlList.length} URL(s) to IndexNow for ${origin.host}.`);
