import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const checkoutSource = await readFile(
  new URL('../app/components/checkout.tsx', import.meta.url),
  'utf8',
);
const handlerSource = await readFile(
  new URL('../commerce/handler.mjs', import.meta.url),
  'utf8',
);

test('supplier cards expose editable customer-facing title and description', () => {
  assert.match(checkoutSource, /Customer-facing title/);
  assert.match(checkoutSource, /Customer-facing description/);
  assert.match(checkoutSource, /productName/);
  assert.match(checkoutSource, /productDescription/);
  assert.match(checkoutSource, /admin-supplier-update/);
});

test('supplier copy edits are protected from later catalog syncs', () => {
  assert.match(handlerSource, /name_manual boolean NOT NULL DEFAULT false/);
  assert.match(handlerSource, /description_manual boolean NOT NULL DEFAULT false/);
  assert.match(handlerSource, /name=CASE WHEN commerce_supplier_products\.name_manual/);
  assert.match(handlerSource, /description=CASE WHEN commerce_supplier_products\.description_manual/);
  assert.match(handlerSource, /name_manual=CASE WHEN \$6 IS NULL THEN name_manual ELSE true END/);
  assert.match(handlerSource, /description_manual=CASE WHEN \$7 IS NULL THEN description_manual ELSE true END/);
});
