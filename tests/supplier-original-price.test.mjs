import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { parseSupplierOriginalPrice, updateSupplierOfferPricing } from '../commerce/supplier-original-price.mjs';
import { supplierOriginalPriceComparison, supplierSavingsPkr } from '../app/supplier-price-utils.ts';
import { catalogResponse } from '../commerce/catalog-presentation.mjs';

test('manual reference is the full package total and takes priority over automatic prices', () => {
  const product = { name:'Adobe Express Premium 12 months', price:3500, original_price_pkr:5000 };
  assert.equal(supplierOriginalPriceComparison(product).totalPkr, 5000);
  assert.equal(supplierOriginalPriceComparison(product).quantity, 1);
  assert.equal(supplierSavingsPkr(product), 1500);
  assert.equal(supplierSavingsPkr({...product, price:6000}), 0);
  assert.equal(supplierSavingsPkr({name:'Custom product',price:3500,original_price_pkr:5000}),1500);
  assert.equal(supplierOriginalPriceComparison({...product,original_price_pkr:null}).totalPkr,34165.8);
});

test('original-price validation distinguishes clearing from omission and rejects invalid discounts', () => {
  assert.deepEqual(parseSupplierOriginalPrice(undefined,3500),{provided:false,amount:null});
  for (const value of [null,'']) assert.deepEqual(parseSupplierOriginalPrice(value,3500),{provided:true,amount:null});
  for (const value of [0,-1,2000,5000.5,NaN,Infinity,true,{},2147483648]) assert.throws(()=>parseSupplierOriginalPrice(value,3500),(error)=>error.status===400);
});

test('offer price saving persists, clears and preserves manual references without affecting another supplier', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE TABLE commerce_supplier_products(id text PRIMARY KEY,name text,provider_name text,selling_price integer,enabled boolean,original_price_pkr integer CHECK(original_price_pkr>0),cost_pkr integer,supplier_stock integer);
      INSERT INTO commerce_supplier_products VALUES ('one','Custom tool','Supplier A',3500,true,null,2000,4),('two','Custom tool','Supplier B',4000,true,7000,2500,8);`);
    const body={productId:'one',sellingPrice:3500,enabled:true,originalPrice:5000};
    await updateSupplierOfferPricing(db,body);
    const row=(await db.query("SELECT * FROM commerce_supplier_products WHERE id='one'")).rows[0];
    assert.equal(row.original_price_pkr,5000);
    assert.equal(row.cost_pkr,2000); assert.equal(row.supplier_stock,4);
    const publicProduct={id:row.id,name:row.name,price:row.selling_price,original_price_pkr:row.original_price_pkr};
    const publicSummary=catalogResponse({products:[publicProduct]},{view:'summary'}).products[0];
    assert.equal(supplierSavingsPkr(publicSummary),1500);
    await assert.rejects(updateSupplierOfferPricing(db,{...body,originalPrice:1000}),/at least equal/);
    await updateSupplierOfferPricing(db,{productId:'one',sellingPrice:3600,enabled:true});
    assert.equal((await db.query("SELECT original_price_pkr FROM commerce_supplier_products WHERE id='one'")).rows[0].original_price_pkr,5000);
    await updateSupplierOfferPricing(db,{...body,originalPrice:null});
    assert.equal((await db.query("SELECT original_price_pkr FROM commerce_supplier_products WHERE id='one'")).rows[0].original_price_pkr,null);
    assert.equal((await db.query("SELECT original_price_pkr FROM commerce_supplier_products WHERE id='two'")).rows[0].original_price_pkr,7000);
    await assert.rejects(updateSupplierOfferPricing(db,{...body,productId:'missing'}),(error)=>error.status===404);
  } finally { await db.close(); }
});
