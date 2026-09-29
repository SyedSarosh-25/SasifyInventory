import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const catalogSource = await readFile(
  new URL('../app/components/catalog.tsx', import.meta.url),
  'utf8',
);

test('full inventory carries local preorder presentation into product cards', () => {
  assert.match(catalogSource, /availability_mode: product\.availabilityMode/);
  assert.match(catalogSource, /preorder_date: product\.preorderDate/);
  assert.match(catalogSource, /stock_label: product\.stockLabel/);
});
