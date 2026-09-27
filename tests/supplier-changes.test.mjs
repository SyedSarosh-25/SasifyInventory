import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import {supplierChangeSchema,recordSupplierChanges} from '../commerce/supplier-changes.mjs';

test('supplier changes preserve selling price, report diffs once and retire removed stock', async () => {
 const db = new PGlite();
 await db.exec(`CREATE TABLE commerce_supplier_products(provider_id text,external_product_id text,supplier_stock integer,selling_price integer);${supplierChangeSchema}`);
 await db.query('INSERT INTO commerce_supplier_products VALUES($1,$2,5,999)',['test','one']);
 const provider={id:'test'}, first=[{id:'one',name:'Plan',wholesale_price:2,currency:'USD',stock:5}];
 await recordSupplierChanges(db,provider,first);
 assert.equal((await db.query('SELECT * FROM commerce_supplier_changes')).rows.length,0);
 const next=[{...first[0],wholesale_price:3,stock:4}];
 await recordSupplierChanges(db,provider,next);
 await recordSupplierChanges(db,provider,next);
 const events=(await db.query('SELECT * FROM commerce_supplier_changes')).rows;
 assert.equal(events.length,1);
 assert.deepEqual(events[0].changes.map(c=>c.field),['wholesale_price','stock']);
 await recordSupplierChanges(db,provider,[]);
 assert.deepEqual((await db.query('SELECT supplier_stock,selling_price FROM commerce_supplier_products')).rows[0],{supplier_stock:0,selling_price:999});
 await recordSupplierChanges(db,provider,next);
 assert.ok((await db.query('SELECT * FROM commerce_supplier_changes ORDER BY id DESC LIMIT 1')).rows[0].changes.some(c=>c.after==='restored'));
 await db.close();
});
