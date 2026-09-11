import { realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const staticRoot = path.join(root, '.vercel', 'output', 'static');
const target = path.join(staticRoot, 'scammers');
if (path.dirname(target) !== staticRoot) throw new Error('Invalid generated route target.');
await rm(target, { recursive: true, force: true });
for (const file of ['scammers.html', 'scammers.rsc']) await rm(path.join(staticRoot, file), { force: true });
console.log('Removed local-only scammers route from the public deployment artifact.');
