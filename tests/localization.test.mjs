import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {languages, isLanguage, isPublicPath, translations, translateText} from '../app/localization.ts';
import {localizeContent} from '../app/localized-content.ts';

test('three supported languages have complete nonempty translation pairs',()=>{
  assert.deepEqual(languages.map(x=>x.code),['en','ur-Latn','vi']);
  assert.equal(isLanguage('vi'),true);assert.equal(isLanguage('vn'),false);
  for(const [source,pair] of Object.entries(translations)){
    assert.ok(source.trim());assert.ok(pair.vi.trim());assert.ok(pair['ur-Latn'].trim());
  }
});
test('English and unknown supplier messages preserve source copy',()=>{
  assert.equal(translateText(' Log in ','en'),' Log in ');
  assert.equal(translateText('Unknown supplier requirement','vi'),'Unknown supplier requirement');
  assert.equal(translateText('Log in','vi'),'Đăng nhập');
  assert.equal(translateText('Sign up','ur-Latn'),'Account banayen');
});
test('numbers and listed warranty durations remain unchanged',()=>{
  assert.equal(translateText('Full 30-day warranty','vi'),'Bảo hành đầy đủ 30 ngày');
  assert.equal(translateText('Full 25-day warranty','vi'),'Bảo hành đầy đủ 25 ngày');
  assert.equal(translateText('PKR 3,499','vi'),'PKR 3,499');
  assert.equal(translateText('12 Months','vi'),'12 tháng');
});
test('localization preserves form names, values, action handlers and references',()=>{
  const onChange=()=>{};
  const input=createElement('input',{name:'paymentMethod',value:'bank',placeholder:'Email address',onChange});
  const translated=localizeContent(input,'vi');
  assert.equal(translated.props.name,'paymentMethod');assert.equal(translated.props.value,'bank');
  assert.equal(translated.props.onChange,onChange);assert.equal(translated.props.placeholder,'Địa chỉ email');
  const link=localizeContent(createElement('a',{href:'/checkout?product=p093-ultra'},'Buy online'),'vi');
  assert.equal(link.props.href,'/checkout?product=p093-ultra');assert.equal(link.props.children,'Mua trực tuyến');
});
test('credentials, personal data and source product names are not translated',()=>{
  for(const tag of ['pre','code','textarea']){
    const element=createElement(tag,null,'Password');
    assert.equal(localizeContent(element,'vi'),element);
  }
  const product=createElement('h3',{translate:'no'},'Home');
  assert.equal(localizeContent(product,'vi'),product);
  assert.equal(renderToStaticMarkup(localizeContent(createElement('div',null,createElement('button',{type:'submit'},'Log in')),'vi')),'<div><button type="submit">Đăng nhập</button></div>');
});
test('checkout language covers the first purchase step and payment choices',()=>{
  for(const source of ['Select package','How will you send the payment?','Please read before purchasing','Wallet transfer','Bank transfer','Crypto deposit','All banks','Easypaisa, JazzCash, NayaPay, SadaPay and more','Your delivery appears here automatically after the signed NayaPay receipt is matched.']){
    assert.notEqual(translateText(source,'ur-Latn'),source,source);
  }
  assert.match(translateText('Balance: PKR 2,450 · 5% discount on eligible products','ur-Latn'),/2,450/);
});
test('admin and team routes are excluded from public theme',()=>{
  for(const route of ['/orders-admin','/orders-admin/a','/team'])assert.equal(isPublicPath(route),false);
  for(const route of ['/','/dashboard','/checkout','/categories'])assert.equal(isPublicPath(route),true);
});
