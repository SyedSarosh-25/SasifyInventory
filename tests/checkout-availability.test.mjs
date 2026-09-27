import test from 'node:test';
import assert from 'node:assert/strict';
import { checkSupplierPlan } from '../commerce/checkout-availability.mjs';
const offer = (id, provider='a') => ({ id, provider_id: provider, external_product_id: id, supplier_stock: 999 });
const provider = (products, id='a') => ({ id, configured:true, catalog:async()=>({products}) });
test('uses live supplier quantity, never saved stock', async()=> {
  const result=await checkSupplierPlan([offer('x')],[provider([{id:'x',stock:0}])]);
  assert.equal(result.status,'unavailable');
});
test('failure and invalid stock stay unknown', async()=> {
  assert.equal((await checkSupplierPlan([offer('x')],[{id:'a',configured:true,catalog:async()=>{throw Error('offline')}}])).status,'unknown');
  assert.equal((await checkSupplierPlan([offer('x')],[provider([{id:'x',stock:'bad'}])])).status,'unknown');
});
test('only exact supplier IDs match; missing item is unavailable',async()=> {
  assert.equal((await checkSupplierPlan([offer('x')],[provider([{id:'y',stock:9}])])).status,'unavailable');
});
test('one supplier catalog call per selected plan; cheapest available backup selected',async()=> {
  let calls=0;
  const result=await checkSupplierPlan([offer('x'),offer('y')],[{id:'a',configured:true,catalog:async()=>{calls++;return {products:[{id:'x',stock:0},{id:'y',stock:4}]}}}]);
  assert.equal(calls,1); assert.equal(result.offer.id,'y'); assert.equal(result.available,4);
});
test('one failed supplier does not block an available equivalent',async()=> {
  const result=await checkSupplierPlan([offer('x'),offer('y','b')],[{id:'a',configured:true,catalog:async()=>{throw Error('offline')}},provider([{id:'y',stock:3}],'b')]);
  assert.equal(result.status,'available');
});
test('supplier timeout returns unknown within budget',async()=> {
  assert.equal((await checkSupplierPlan([offer('x')],[{id:'a',configured:true,catalog:()=>new Promise(()=>{})}],10)).status,'unknown');
});
