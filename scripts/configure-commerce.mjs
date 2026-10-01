import { randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

const privateDir = path.join(os.homedir(), '.codex', 'sasify-commerce');
await mkdir(privateDir,{recursive:true});
const secretsPath = path.join(privateDir,'secrets.json');
let secrets;
try { secrets=JSON.parse(await readFile(secretsPath,'utf8')); } catch(e) { if(e.code!=='ENOENT') throw e; secrets={COMMERCE_ADMIN_KEY:randomBytes(32).toString('hex'),COMMERCE_ENCRYPTION_KEY:randomBytes(32).toString('hex')};await writeFile(secretsPath,JSON.stringify(secrets,null,2),{mode:0o600}); }
const localEnv = {};
try {
  const text = await readFile(path.join(process.cwd(), '.env.postmark-temp'), 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    localEnv[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const configured = (name) => String(secrets[name] || process.env[name] || localEnv[name] || '').trim();
const required = (name) => {
  const value = configured(name);
  if (!value) throw new Error(`Missing ${name}. Set it in the private secrets file, the environment, or .env.postmark-temp.`);
  return value;
};
const values={
  COMMERCE_ADMIN_KEY:secrets.COMMERCE_ADMIN_KEY,
  COMMERCE_ENCRYPTION_KEY:secrets.COMMERCE_ENCRYPTION_KEY,
  PAYMENT_ACCOUNT_TITLE:configured('PAYMENT_ACCOUNT_TITLE') || 'Syed Adeen Sarosh',
  PAYMENT_ACCOUNT_NUMBER:required('PAYMENT_ACCOUNT_NUMBER'),
  PAYMENT_RECEIVER_EMAIL:required('PAYMENT_RECEIVER_EMAIL'),
  NAYAPAY_INBOUND_BASIC_USER:required('NAYAPAY_INBOUND_BASIC_USER'),
  NAYAPAY_INBOUND_BASIC_PASSWORD:required('NAYAPAY_INBOUND_BASIC_PASSWORD'),
  NAYAPAY_SENDER:configured('NAYAPAY_SENDER') || 'service@nayapay.com',
  NAYAPAY_AUTO_VERIFY:'true',
};
if (configured('NAYAPAY_INBOUND_TOKEN')) values.NAYAPAY_INBOUND_TOKEN = configured('NAYAPAY_INBOUND_TOKEN');
for (const name of [
  'MEEZAN_ACCOUNT_TITLE', 'MEEZAN_ACCOUNT_NUMBER', 'MEEZAN_IBAN', 'MEEZAN_BENEFICIARY',
  'MEEZAN_RECEIVER_EMAIL', 'MEEZAN_SENDER', 'MEEZAN_DKIM_DOMAIN',
  'MEEZAN_INBOUND_BASIC_USER', 'MEEZAN_INBOUND_BASIC_PASSWORD',
  'MEEZAN_INBOUND_TOKEN', 'MEEZAN_AUTO_VERIFY',
]) {
  const value = configured(name);
  if (value) values[name] = value;
}
const cache=path.join(os.homedir(),'AppData/Local/npm-cache/_npx');
let cli;
for(const entry of await readdir(cache)) {
  const pkg=path.join(cache,entry,'node_modules/vercel/package.json');
  try { const meta=JSON.parse(await readFile(pkg,'utf8'));cli=path.resolve(path.dirname(pkg),typeof meta.bin==='string'?meta.bin:meta.bin.vercel); } catch{}
}
if(!cli) throw new Error('Vercel CLI is not cached.');
for(const [name,value] of Object.entries(values)) {
  const result=spawnSync(process.execPath,[cli,'env','add',name,'production','--yes','--force','--sensitive'],{cwd:process.cwd(),input:value,encoding:'utf8'});
  if(result.status!==0) throw new Error(`Could not configure ${name}; inspect Vercel settings.`);
  console.log(`${name}: configured`);
}
const instructions=`Sasify order admin: https://www.sasifysolutions.com/orders-admin\nAdmin access key: ${secrets.COMMERCE_ADMIN_KEY}\n\nPostmark inbound endpoints:\n- NayaPay: https://www.sasifysolutions.com/api/nayapay/inbound-email\n- Binance Pay: https://www.sasifysolutions.com/api/binance-pay/inbound-email\n- Crypto USDT: https://www.sasifysolutions.com/api/crypto/inbound-email\nConfigure each Postmark inbound stream with the production HTTP Basic Auth credentials. Forward receipts from syedadeen18@gmail.com to the corresponding Postmark inbound address, preserve the original MIME message, and use the endpoint matching the payment rail. Meezan Bank is currently disabled. Never share the admin key with customers.\n`;
await writeFile(path.join(privateDir,'setup.txt'),instructions,{mode:0o600});
console.log(`Private setup details: ${path.join(privateDir,'setup.txt')}`);
