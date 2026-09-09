import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { encrypt,decrypt,parseEmail,parseInventory,normalizeTransaction,same } from '../commerce/core.mjs';
import { normalizeQamifyProduct, qamifyDelivery, qamifyOrderId } from '../commerce/qamify.mjs';
import { providerDescription } from '../commerce/description.mjs';
test('credentials are authenticated ciphertext and wrong keys cannot decrypt',()=>{
  const key=randomBytes(32).toString('hex'), credentials={email:'example@test.invalid',password:'example-password',twoFactor:'test-secret'};
  const ciphertext=encrypt(credentials,key);
  assert(!ciphertext.includes(credentials.password));assert.deepEqual(decrypt(ciphertext,key),credentials);
  assert.throws(()=>decrypt(ciphertext,randomBytes(32).toString('hex')));
});
test('inventory import rejects duplicates and malformed rows atomically',()=>{
  assert.equal(parseInventory('one@test.invalid | pass | seed').length,1);
  assert.throws(()=>parseInventory('one@test.invalid|pass|seed\nONE@test.invalid|pass|seed'));
  assert.throws(()=>parseInventory('one@test.invalid|pass'));
});
test('NayaPay format needs exact source, receiver, date and transaction before approval',()=>{
  const receipt={subject:'You got Rs. 3,500 from Bank Alfalah-0388 🎉',text:'Amount Received\nRs. 3,500\nTransaction ID\n247854\nSource Acc. Number\n****0388\nDestination Acc. Title\nSyed Adeen Sarosh',from:'NayaPay <test@nayapay.example>',date:new Date().toISOString()};
  const config={enabled:true,sender:'test@nayapay.example',receiver:'Syed Adeen Sarosh'};
  assert.equal(parseEmail(receipt,config).transaction,'247854');assert.equal(parseEmail(receipt,config).amount,3500);assert.equal(parseEmail(receipt,config).verified,true);
  assert.equal(parseEmail(receipt).verified,false);
  for(const changed of [{from:'fake@example.com'},{date:'2020-01-01'},{text:'Transaction ID 247854'},{subject:'Fwd: '+receipt.subject},{text:receipt.text+'\nTransaction ID 999999'}]) assert.equal(parseEmail({...receipt,...changed},config).verified,false);
});
test('transaction identifiers and authentication fail closed',()=>{
  assert.equal(normalizeTransaction(' abc123 '),'ABC123');assert.throws(()=>normalizeTransaction('<script>'));assert.equal(same('',undefined),false);assert.equal(same('a','b'),false);
});
test('HTML-only NayaPay receipts support masked black-circle account numbers',()=>{
  const receipt={subject:'You got Rs. 3,500 from Bank Alfalah-0388',text:' ',html:'<table><tr><td>Amount Received</td><td>Rs. 3,500</td></tr><tr><td>Transaction ID</td><td>247854</td></tr><tr><td>Source Acc. Number</td><td>&#9679;&#9679;&#9679;&#9679;0388</td></tr><tr><td>Destination Acc. Title</td><td>Syed Adeen Sarosh</td></tr></table>',from:'service@nayapay.com',date:new Date().toISOString()};
  const result=parseEmail(receipt,{enabled:true,sender:'service@nayapay.com',receiver:'Syed Adeen Sarosh'});
  assert.equal(result.sourceLast4,'0388');assert.equal(result.verified,true);
});
test('Raast and internal transfers require matching source and recipient evidence',()=>{
  const receipt={subject:'You got Rs. 1,000 from Test User',from:'service@nayapay.com',date:new Date().toISOString(),text:'Amount Received\nRs. 1,000\nTransaction ID\nABC123456\nRaast ID / IBAN\n\u25cf\u25cf\u25cf\u25cf6698\nDestination Acc. Title\nSyed Adeen Sarosh'};
  const config={enabled:true,sender:'service@nayapay.com',receiver:'Syed Adeen Sarosh',receiverMailbox:'owner@example.com'};
  assert.equal(parseEmail(receipt,config).sourceLast4,'6698');assert.equal(parseEmail(receipt,config).verified,true);
  const wallet={...receipt,to:'owner@example.com',text:'testuser@nayapay\nAmount Received\nRs. 1,000\nTransaction ID\nABC123456'};
  assert.equal(parseEmail(wallet,config).verified,true);
  assert.equal(parseEmail({...wallet,to:'someone@example.com'},config).verified,false);
  assert.equal(parseEmail({...wallet,to:''},config).verified,false);
});
test('Qamify products and order delivery are normalized defensively',()=>{
  assert.deepEqual(normalizeQamifyProduct({id:42,name:'Test license',unit_price:'3.50',stock:2,slug:'test-license'},'USD'),{
    id:'42',name:'Test license',description:'',delivery_instruction:null,wholesale_price:3.5,currency:'USD',stock:2,canonical_key:'test-license'
  });
  assert.equal(normalizeQamifyProduct({id:42,name:'Broken',price:'nope',stock:2}),null);
  assert.equal(normalizeQamifyProduct({id:42,name:'Broken',price:1,stock:1.5}),null);
  assert.deepEqual(qamifyDelivery({order:{items:['license-key'],instructions:'Redeem once.'}}),{content:'[\n  "license-key"\n]',instructions:'Redeem once.'});
  assert.equal(qamifyOrderId({order:{code:'RA-TEST'}},'fallback'),'RA-TEST');
});
test('provider descriptions accept common API fields without inventing copy',()=>{
  assert.equal(providerDescription({details:'Package details'}),'Package details');
  assert.equal(providerDescription({description:'Primary description',details:'Fallback'}),'Primary description');
  assert.equal(providerDescription({name:'No description'}),'');
});
