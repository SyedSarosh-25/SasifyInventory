import test from 'node:test';
import assert from 'node:assert/strict';
import { createCatalogCache, parallelCatalogReads } from '../commerce/catalog-cache.mjs';

test('catalog combines concurrent reads, expires and invalidates after changes', async () => {
  let time = 0, calls = 0;
  const cache = createCatalogCache(5000, () => time);
  const load = async () => ({ version: ++calls });
  const values = await Promise.all(Array.from({ length: 8 }, () => cache.read(load)));
  assert.equal(calls, 1);
  assert.ok(values.every(value => value === values[0]));
  time = 4999;
  assert.equal((await cache.read(load)).version, 1);
  time = 5000;
  assert.equal((await cache.read(load)).version, 2);
  cache.invalidate();
  assert.equal((await cache.read(load)).version, 3);
});

test('failed catalog loads are retried and invalidated pending loads cannot repopulate the cache', async () => {
  const cache = createCatalogCache();
  await assert.rejects(cache.read(async () => { throw Error('database unavailable'); }));
  assert.equal(await cache.read(async () => 'recovered'), 'recovered');
  cache.invalidate();
  let resolve;
  const pending = cache.read(() => new Promise(done => { resolve = done; }));
  await Promise.resolve();
  cache.invalidate();
  resolve('old stock');
  await pending;
  assert.equal(await cache.read(async () => 'new stock'), 'new stock');
});

test('catalog queries actually run concurrently and release every connection on failure', async () => {
  let active = 0, peak = 0, released = 0;
  const pool = { connect: async () => ({
    query: async (sql) => {
      active++; peak = Math.max(peak, active);
      await new Promise(done => setTimeout(done, 10));
      active--;
      if (sql === 'broken') throw Error('query failed');
      return { rows: [sql] };
    },
    release: () => { released++; },
  }) };
  assert.deepEqual((await parallelCatalogReads(pool, ['a', 'b', 'c'])).map(result => result.rows), [['a'], ['b'], ['c']]);
  assert.equal(peak, 3);
  assert.equal(released, 3);
  await assert.rejects(parallelCatalogReads(pool, ['broken']));
  assert.equal(released, 4);
});
