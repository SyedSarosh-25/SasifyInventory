import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { encrypt,decrypt,parseEmail,parseInventory,normalizeTransaction,paymentAmountMatchesOrder,same,totpCode } from '../commerce/core.mjs';
import { parseMeezanEmail } from '../commerce/meezan-email.mjs';
import { normalizeQamifyProduct, qamifyDelivery, qamifyOrderId } from '../commerce/qamify.mjs';
import { providerDescription } from '../commerce/description.mjs';
test('credentials are authenticated ciphertext and wrong keys cannot decrypt',()=>{
  const key=randomBytes(32).toString('hex'), credentials={email:'example@test.invalid',password:'example-password',twoFactor:'test-secret'};
  const ciphertext=encrypt(credentials,key);
  assert(!ciphertext.includes(credentials.password));assert.deepEqual(decrypt(ciphertext,key),credentials);
  assert.throws(()=>decrypt(ciphertext,randomBytes(32).toString('hex')));
});
test('payment matching allows only one extra rupee for non-round prices',()=>{
  assert.equal(paymentAmountMatchesOrder(499,499),true);
  assert.equal(paymentAmountMatchesOrder(500,499),true);
  assert.equal(paymentAmountMatchesOrder(501,499),false);
  assert.equal(paymentAmountMatchesOrder(1500,1499),true);
  assert.equal(paymentAmountMatchesOrder(600,599),true);
  assert.equal(paymentAmountMatchesOrder(500,500),true);
  assert.equal(paymentAmountMatchesOrder(501,500),false);
});
test('TOTP codes support raw Base32 and otpauth URI secrets without exposing the seed',()=>{
  const secret='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  assert.equal(totpCode(secret,59000),'287082');
  assert.equal(totpCode(`otpauth://totp/Example?secret=${secret}&digits=8`,59000),'94287082');
  assert.throws(()=>totpCode('BAD0SECRET',59000));
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
test('NayaPay subjects with the Pakistan flag still parse the amount and payer',()=>{
  const receipt={subject:'You got Rs. 100 from Syed Adeen Sarosh 🇵🇰',text:'Amount Received\nRs. 100\nTransaction ID\nABC123456\nSource Acc. Number\n****0388\nDestination Acc. Title\nSyed Adeen Sarosh',from:'service@nayapay.com',date:new Date().toISOString()};
  const result=parseEmail(receipt,{enabled:true,sender:'service@nayapay.com',receiver:'Syed Adeen Sarosh'});
  assert.equal(result.amount,100);
  assert.equal(result.payer,'Syed Adeen Sarosh');
  assert.equal(result.transaction,'ABC123456');
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
test('bank receipts accept full IBANs and normalized destination-title casing',()=>{
  const receipt={subject:'You got PKR 3,499 from Meezan Bank',from:'NayaPay <service@nayapay.com>',date:new Date().toISOString(),text:'Amount Received\nPKR 3,499\nTransaction ID\nBANK123456\nRaast ID / IBAN\nPK36MEZN0000123456789012\nDestination Acc. Title\nSYED   ADEEN SAROSH'};
  const result=parseEmail(receipt,{enabled:true,sender:'service@nayapay.com',receiver:'Syed Adeen Sarosh'});
  assert.equal(result.sourceLast4,'9012');
  assert.equal(result.transaction,'BANK123456');
  assert.equal(result.verified,true);
  assert.equal(result.reason,'verified');
});
test('NayaPay bank receipt sample parses the HTML table layout and masked Raast source',()=>{
  const receipt={
    subject:'You got Rs. 3,499 from Zain Ali 🎉',
    from:'NayaPay <service@nayapay.com>',
    to:'syedadeen18@gmail.com',
    date:new Date().toISOString(),
    html:'<table><tr><td>Amount Received</td><td>Rs. 3,499</td></tr><tr><td>Service Fee (Incl. Tax)</td><td>Rs. 0</td></tr><tr><td>Total Amount</td><td>Rs. 3,499</td></tr><tr><td>Transaction ID</td><td>ABPAPKKA140926150945051530</td></tr><tr><td>Source Acc. Title</td><td>Zain Ali</td></tr><tr><td>Source Bank</td><td>Allied Bank</td></tr><tr><td>Raast ID / IBAN</td><td>••••0015</td></tr><tr><td>Destination Acc. Title</td><td>Syed Adeen Sarosh</td></tr><tr><td>Channel</td><td>Raast</td></tr></table>',
  };
  const result=parseEmail(receipt,{enabled:true,sender:'service@nayapay.com',receiver:'Syed Adeen Sarosh'});
  assert.equal(result.amount,3499);
  assert.equal(result.payer,'Zain Ali');
  assert.equal(result.transaction,'ABPAPKKA140926150945051530');
  assert.equal(result.sourceLast4,'0015');
  assert.equal(result.verified,true);
  assert.equal(result.reason,'verified');
});
test('Meezan credit alerts parse the masked account and transaction date/time',()=>{
  const date = new Date(Date.now() - 60_000);
  const pakistan = new Date(date.getTime() + 5 * 60 * 60 * 1000);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dateText = `${String(pakistan.getUTCDate()).padStart(2, '0')}-${months[pakistan.getUTCMonth()]}-${pakistan.getUTCFullYear()}`;
  const timeText = `${String(pakistan.getUTCHours()).padStart(2, '0')}:${String(pakistan.getUTCMinutes()).padStart(2, '0')}`;
  const receipt = {
    subject: 'Credit Transaction Alert',
    from: 'Meezan Bank Alert <no-reply@meezanbank.com>',
    to: 'payments@example.invalid',
    messageId: '<meezan-receipt-1@meezanbank.com>',
    date: date.toISOString(),
    text: `Dear Customer,\n\nPKR 25.00 received to your account xxx1103 with the following details:\n\nBeneficiary Account : S. ADEEN AC# RAAST PYMT PK76TMFB00000\nBranch : SIR SYED ROAD BR KHI\nTransaction Date : ${dateText}\nTransaction Time : ${timeText}`,
  };
  const result = parseMeezanEmail(receipt, {
    enabled: true,
    sender: 'no-reply@meezanbank.com',
    receiverMailbox: 'payments@example.invalid',
    receiver: 'A deliberately different display-only value',
    receiverAccount: '1234561103',
  });
  assert.equal(result.amount, 25);
  assert.equal(result.sourceLast4, '1103');
  assert.match(result.transaction, /^MEEZAN-[A-F0-9]{32}$/);
  assert.equal(result.verified, true);
  assert.equal(parseMeezanEmail({ ...receipt, text: receipt.text.replace('xxx1103', 'xxx9999') }, {
    enabled: true,
    sender: 'no-reply@meezanbank.com',
    receiverMailbox: 'payments@example.invalid',
    receiver: 'A deliberately different display-only value',
    receiverAccount: '1234561103',
  }).verified, false);
  assert.equal(parseMeezanEmail({ ...receipt, subject: '' }, {
    enabled: true,
    sender: 'no-reply@meezanbank.com',
    receiverMailbox: 'payments@example.invalid',
    receiverAccount: '1234561103',
  }).verified, true);
  assert.equal(parseMeezanEmail({ ...receipt, subject: '(no subject)' }, {
    enabled: true,
    sender: 'no-reply@meezanbank.com',
    receiverMailbox: 'payments@example.invalid',
    receiverAccount: '1234561103',
  }).verified, true);
  const newTemplate = {
    subject: '',
    from: receipt.from,
    to: receipt.to,
    messageId: '<meezan-receipt-new-template@meezanbank.com>',
    date: date.toISOString(),
    text: `Dear Customer,\n\nAssalam o Alaikum,\n\nPKR 10,000.00 has been received in your MBL account xxx1103. Please find the details of this transaction below:\n\nBranch : SIR SYED ROAD BR KHI\n\nReceived from TANVEER HUSSAIN (MBL AC xxx4124)\n\nTransaction Date : ${dateText}\n\nTransaction Time : ${timeText}\n\nTID:181813`,
  };
  const newResult = parseMeezanEmail(newTemplate, {
    enabled: true,
    sender: 'no-reply@meezanbank.com',
    receiverMailbox: 'payments@example.invalid',
    receiverAccount: '1234561103',
  });
  assert.equal(newResult.amount, 10000);
  assert.equal(newResult.sourceLast4, '1103');
  assert.equal(newResult.transaction, '181813');
  assert.equal(newResult.payer, 'TANVEER HUSSAIN');
  assert.equal(newResult.verified, true);
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
  assert.equal(providerDescription({description:'  First line\nSecond line  '}),'  First line\nSecond line  ');
});
