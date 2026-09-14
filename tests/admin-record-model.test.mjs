import test from 'node:test';
import assert from 'node:assert/strict';
import { filterRecordPage } from '../app/components/admin-record-model.ts';

const rows = Array.from({ length: 32 }, (_, id) => ({
  id,
  name: `Order ${id}`,
}));
test('admin record pages search case-insensitively and clamp a stale page', () => {
  const result = filterRecordPage(
    rows,
    (row) => row.name,
    ' ORDER 31 ',
    8,
    25,
    false,
  );
  assert.equal(result.count, 1);
  assert.equal(result.page, 1);
  assert.deepEqual(result.rows, [rows[31]]);
});
test('admin pagination displays a bounded final page without mutating API records', () => {
  const before = structuredClone(rows);
  assert.equal(
    filterRecordPage(rows, (row) => row.name, '', 2, 25, false).rows.length,
    7,
  );
  assert.equal(
    filterRecordPage(rows, (row) => row.name, '', 1, 10, true).rows[0].id,
    31,
  );
  assert.deepEqual(rows, before);
});
test('admin empty searches return a valid empty first page', () => {
  assert.deepEqual(
    filterRecordPage(rows, (row) => row.name, 'missing', 4, 10, false),
    { rows: [], page: 1, pages: 1, count: 0 },
  );
});
