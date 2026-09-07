import { randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

const privateDir = path.join(os.homedir(), '.codex', 'sasify-commerce');
await mkdir(privateDir,{recursive:true});
const secretsPath = path.join(privateDir,'secrets.json');
let secrets;
try { secrets=JSON.parse(await readFile(secretsPath,'utf8')); } catch(e) { if(e.code!=='ENOENT') throw e; secrets={COMMERCE_ADMIN_KEY:randomBytes(32).toString('hex'),COMMERCE_ENCRYPTION_KEY:randomBytes(32).toString('hex'),NAYAPAY_SIGNING_KEY:randomBytes(32).toString('hex')};await writeFile(secretsPath,JSON.stringify(secrets,null,2),{mode:0o600}); }
const values={...secrets,NAYAPAY_WEBHOOK_SECRET:'Sarosh',PAYMENT_ACCOUNT_TITLE:'Syed Adeen Sarosh',NAYAPAY_SENDER:'service@nayapay.com',NAYAPAY_RECEIVER_MARKER:'Syed Adeen Sarosh',NAYAPAY_AUTO_VERIFY:'false'};
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
const instructions=`Sasify order admin: https://www.sasifysolutions.com/orders-admin\nAdmin access key: ${secrets.COMMERCE_ADMIN_KEY}\n\nGoogle Apps Script > Project Settings > Script Properties:\nWEBHOOK_SECRET = Sarosh\nNAYAPAY_SENDER = service@nayapay.com\nNAYAPAY_SIGNING_KEY = ${secrets.NAYAPAY_SIGNING_KEY}\n\nUse commerce/nayapay-apps-script.gs. Run installPaymentTrigger once and authorize Gmail access. Never share the admin key with customers.\n`;
await writeFile(path.join(privateDir,'setup.txt'),instructions,{mode:0o600});
console.log(`Private setup details: ${path.join(privateDir,'setup.txt')}`);
