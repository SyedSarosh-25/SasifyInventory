import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const baseline='11fb11b';
const original=file=>execFileSync('git',['show',`${baseline}:${file}`],{encoding:'utf8'});
const current=file=>readFile(new URL('../'+file,import.meta.url),'utf8');
const normalize=value=>value.replace(/\r\n/g,'\n');
test('commerce, prices, warranty and admin stay unchanged apart from the approved IP-welcome packaging',async()=>{
  const paths=execFileSync('git',['ls-tree','-r','--name-only',baseline],{encoding:'utf8'}).trim().split('\n').filter(file=>(file.startsWith('commerce/')||file.startsWith('scripts/')||file.startsWith('app/orders-admin/')||file.startsWith('app/team/')||file.startsWith('app/components/admin-')||['package.json','package-lock.json','vite.config.ts','app/products.ts','app/product-utils.ts','app/supplier-price-utils.ts','app/catalog-selection.ts'].includes(file))&&file!=='scripts/package-commerce.mjs');
  for(const file of paths)assert.equal(normalize(await current(file)),normalize(original(file)),`Protected file changed: ${file}`);
});
test('admin implementation in shared checkout module remains unchanged',async()=>{
  const file='app/components/checkout.tsx';
  const tail=value=>normalize(value.slice(value.indexOf('function SupplierProductRow(')));
  assert.equal(tail(await current(file)),tail(original(file)));
});
test('account request transport and money formatting remain unchanged',async()=>{
  const file='app/components/customer-account.tsx';
  const block=value=>normalize(value.slice(value.indexOf('async function request('),value.indexOf('function PasswordField(')));
  assert.equal(block(await current(file)),block(original(file)));
});
