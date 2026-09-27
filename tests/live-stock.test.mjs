import test from 'node:test';
import assert from 'node:assert/strict';
import { liveSupplierStock, cheapestLiveOffers } from '../commerce/live-stock.mjs';

test('live quantity replaces saved stock and selects the available fallback', async () => {
  const offers = [{provider_id:'one',external_product_id:'a',canonical_key:'plan',supplier_stock:99}, {provider_id:'two',external_product_id:'b',canonical_key:'plan',supplier_stock:0}];
  const result = await liveSupplierStock(offers, [{id:'one',configured:true,catalog:async()=>({products:[{id:'a',stock:0}]})},{id:'two',configured:true,catalog:async()=>({products:[{id:'b',stock:7}]})}]);
  assert.deepEqual(result.offers.map(item=>item.available),[0,7]);
  assert.equal(cheapestLiveOffers(result.offers)[0].provider_id,'two');
});

test('failed provider stays unknown, never falls back to saved stock', async () => {
  const result = await liveSupplierStock([{provider_id:'one',external_product_id:'a',canonical_key:'plan',supplier_stock:99}], [{id:'one',configured:true,catalog:async()=>{throw new Error('unreachable');}}]);
  assert.equal(result.offers[0].available,null);
  assert.deepEqual(cheapestLiveOffers(result.offers),[]);
  assert.equal(result.providers[0].ok,false);
});

test('manual inventory remains local and missing supplier products are unavailable', async () => {
  const result = await liveSupplierStock([{provider_id:'manual',supplier_stock:3},{provider_id:'one',external_product_id:'gone',supplier_stock:9}], [{id:'one',configured:true,catalog:async()=>({products:[]})}]);
  assert.deepEqual(result.offers.map(item=>item.available),[3,0]);
});
