import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveStockRequest} from '../app/live-stock-request.mjs';
test('all components share one live request and can read their own body',async()=>{
 let calls=0,time=10;
 const request=createLiveStockRequest(async()=>{calls++;return new Response(JSON.stringify({products:[{id:'one',available:3}]}));},()=>time);
 const responses=await Promise.all([request(),request(),request(),request()]);
 assert.equal(calls,1);
 for(const response of responses) assert.equal((await response.json()).products[0].available,3);
 time=6000;await request();assert.equal(calls,2);
});
test('one shared retry recovers a failed request without a saved fallback',async()=>{
 let calls=0;
 const request=createLiveStockRequest(async()=>{calls++;if(calls===1)throw new Error('network');return new Response('{"products":[]}');});
 await Promise.all([request(),request()]);assert.equal(calls,2);
});
test('exhausted failures reset the shared request for a later attempt',async()=>{
 let calls=0;
 const request=createLiveStockRequest(async()=>{calls++;return new Response('unavailable',{status:503});});
 await assert.rejects(request());assert.equal(calls,2);
 await assert.rejects(request());assert.equal(calls,4);
});
