import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { groupOrdersByDate } from '../app/components/customer-orders-model.ts';
import { supplierMonogram } from '../app/supplier-product-utils.ts';
const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../app/components/customer-orders-list.tsx', import.meta.url), 'utf8');
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
  exports: module.exports,
  require: name => name === './customer-orders-model' ? { groupOrdersByDate } : name === '../supplier-product-utils' ? { supplierMonogram } : require(name),
});
const { CustomerOrdersList } = module.exports;
const orders = [
  { id: 'order1234', product: 'ChatGPT Plus · Shared Account', amount: 950, status: 'delivered', created_at: '2026-09-29T04:00:00Z' },
  { id: 'order5678', product: 'A very long product name <script>unsafe</script>', amount: 3325, status: 'expired', created_at: '2026-09-29T06:00:00Z' },
  { id: 'order9012', product: 'Claude Team Plan Standard', amount: 5199, status: 'pending', created_at: '2026-09-28T06:00:00Z' },
];
test('date groups preserve orders and account for timezone day boundaries', () => {
  const grouped = groupOrdersByDate(orders, 'Asia/Karachi');
  assert.equal(grouped.length, 2);
  assert.deepEqual(grouped.flatMap(x => x.orders), orders);
  assert.equal(groupOrdersByDate([{ created_at: '2026-09-28T21:00:00Z' }, { created_at: '2026-09-29T04:00:00Z' }], 'Asia/Karachi').length, 1);
  assert.equal(groupOrdersByDate([{ created_at: 'invalid' }])[0].label, 'Date unavailable');
});
test('real component renders semantic rows, escaped names, amounts and accessible actions', () => {
  const html = renderToStaticMarkup(React.createElement(CustomerOrdersList, { orders, busy: false, onView() {} }));
  assert.equal((html.match(/<li /g) || []).length, 3);
  assert.match(html, /PKR 3,325/);
  assert.match(html, /Awaiting payment/);
  assert.match(html, /View credentials:/);
  assert.match(html, /View order:/);
  assert.doesNotMatch(html, /<script>/);
  assert.equal((html.match(/disabled=""/g) || []).length, 0);
  const busy = renderToStaticMarkup(React.createElement(CustomerOrdersList, { orders, busy: true, onView() {} }));
  assert.equal((busy.match(/disabled=""/g) || []).length, 3);
});
test('layout is scoped to orders and keeps server-authorized detail lookup', () => {
  const account = readFileSync(new URL('../app/components/customer-account.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../app/components/customer-account.css', import.meta.url), 'utf8');
  assert.match(account, /CustomerOrdersList orders=\{data.orders\}/);
  assert.match(account, /request\('status', undefined, order.id\)/);
  assert.match(css, /grid-template-columns: 40px minmax\(0,1fr\) 140px 150px/);
  assert.match(css, /\.minimal-order-copy \{ grid-column: 2 \/ -1; grid-row: 1;/);
});
