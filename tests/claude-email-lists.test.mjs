import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { confirmedClaudeEmailLists } from '../app/components/claude-email-lists-model.ts';

test('activation exports separate plans, deduplicate and exclude unconfirmed or cancelled orders', () => {
  const order = { product_id:'p012',status:'delivered',supplier_status:'preorder_confirmed',customer_email:' Activate@Example.com ',email:'login@example.com' };
  const lists = confirmedClaudeEmailLists([order,order,
    {...order,product_id:'p013',customer_email:'standard@example.com'},
    {...order,supplier_status:'preorder_pending',customer_email:'pending@example.com'},
    {...order,status:'cancelled',customer_email:'cancelled@example.com'},
    {...order,product_id:'hosting'}, {...order,customer_email:null}, {...order,customer_email:'invalid'}]);
  assert.deepEqual(lists[0],{name:'Premium',emails:['activate@example.com'],orderCount:4,missingCount:2});
  assert.deepEqual(lists[1],{name:'Standard',emails:['standard@example.com'],orderCount:1,missingCount:0});
});

test('admin export includes confirmed orders beyond the recent 100-order page', async () => {
  const source = readFileSync(new URL('../commerce/handler.mjs', import.meta.url), 'utf8');
  const query = source.match(/confirmedClaudeOrders: \(\s*await db.query\(`([^`]+)`\)/)[1];
  const db = new PGlite();
  try {
    await db.exec(`CREATE TABLE commerce_orders(id text,product_id text,customer_email text,status text,supplier_status text,created_at timestamp);
      INSERT INTO commerce_orders SELECT n::text,'p012','premium'||n||'@example.com','delivered','preorder_confirmed',now() FROM generate_series(1,125) n;
      INSERT INTO commerce_orders VALUES ('standard','p013','standard@example.com','delivered','preorder_confirmed',now()),
      ('pending','p013','pending@example.com','pending','preorder_pending',now()),
      ('cancelled','p012','cancelled@example.com','cancelled','preorder_confirmed',now());`);
    const result = await db.query(query);
    assert.equal(result.rows.length,126);
    assert.equal(confirmedClaudeEmailLists(result.rows)[0].emails.length,125);
    assert.equal(confirmedClaudeEmailLists(result.rows)[1].emails.length,1);
  } finally { await db.close(); }
});

test('confirmedClaudeEmailLists sorts emails by date ascending or descending and records dates', () => {
  const o1 = { product_id: 'p012', status: 'delivered', supplier_status: 'preorder_confirmed', customer_email: 'first@test.com', created_at: '2026-09-10T10:00:00Z' };
  const o2 = { product_id: 'p012', status: 'delivered', supplier_status: 'preorder_confirmed', customer_email: 'second@test.com', created_at: '2026-09-15T10:00:00Z' };
  const o3 = { product_id: 'p012', status: 'delivered', supplier_status: 'preorder_confirmed', customer_email: 'third@test.com', created_at: '2026-09-20T10:00:00Z' };

  // Default / Newest first (desc)
  const descLists = confirmedClaudeEmailLists([o1, o2, o3]);
  assert.deepEqual(descLists[0].emails, ['third@test.com', 'second@test.com', 'first@test.com']);
  assert.equal(descLists[0].orderDates['third@test.com'], '2026-09-20T10:00:00.000Z');

  // Explicit newest first (desc)
  const explicitDesc = confirmedClaudeEmailLists([o2, o1, o3], 'desc');
  assert.deepEqual(explicitDesc[0].emails, ['third@test.com', 'second@test.com', 'first@test.com']);

  // Oldest first (asc)
  const ascLists = confirmedClaudeEmailLists([o3, o1, o2], 'asc');
  assert.deepEqual(ascLists[0].emails, ['first@test.com', 'second@test.com', 'third@test.com']);
  assert.equal(ascLists[0].orderDates['first@test.com'], '2026-09-10T10:00:00.000Z');
});

