import test from 'node:test';
import assert from 'node:assert/strict';
import { refreshSupplierStock } from '../commerce/supplier-stock-sync.mjs';

function database() {
  const queries = [];
  return { queries, query: async (sql, args) => {
    queries.push({ sql, args });
    if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked: true }] };
    return { rows: [], rowCount: 2 };
  } };
}

test('scheduled sync calls the catalog once and bulk-updates only saved stock', async () => {
  const db = database();
  let calls = 0;
  const result = await refreshSupplierStock(db, { id: 'dodi', configured: true, catalog: async () => { calls++; return { products: [{ id: 'a', stock: 7 }, { id: 'b', stock: 0 }] }; } });
  assert.equal(calls, 1);
  assert.equal(result.updated, 2);
  const update = db.queries.find(query => query.sql.includes('WITH snapshot'));
  assert.deepEqual(JSON.parse(update.args[1]), [{ id: 'a', stock: 7 }, { id: 'b', stock: 0 }]);
  assert.match(update.sql, /COALESCE\(s.stock,0\)/);
  assert.doesNotMatch(update.sql, /selling_price|cost_pkr|description|canonical_key/);
  assert.ok(db.queries.some(query => query.sql === 'COMMIT'));
  assert.match(db.queries.at(-1).sql, /pg_advisory_unlock/);
});

test('invalid and failed snapshots leave saved stock untouched and release the lock', async () => {
  for (const snapshot of [[], [{ id: 'a', stock: -1 }], [{ id: 'a', stock: 1 }, { id: 'a', stock: 2 }]]) {
    const db = database();
    await assert.rejects(refreshSupplierStock(db, { id: 'dodi', configured: true, catalog: async () => ({ products: snapshot }) }));
    assert.equal(db.queries.some(query => query.sql === 'BEGIN'), false);
    assert.match(db.queries.at(-1).sql, /pg_advisory_unlock/);
  }
  const db = database();
  await assert.rejects(refreshSupplierStock(db, { id: 'dodi', configured: true, catalog: async () => { throw Error('offline'); } }));
  assert.equal(db.queries.some(query => query.sql === 'BEGIN'), false);
  assert.match(db.queries.at(-1).sql, /pg_advisory_unlock/);
});

test('unconfigured providers make no database or supplier calls', async () => {
  const db = database();
  assert.equal((await refreshSupplierStock(db, { configured: false })).skipped, true);
  assert.equal(db.queries.length, 0);
});
