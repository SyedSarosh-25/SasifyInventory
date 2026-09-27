import assert from 'node:assert/strict';
import test from 'node:test';
import { toolFamilyHref, toolFamilySlug } from '../app/tool-families.ts';
import { isChatGptPlusProduct } from '../app/catalog-selection.ts';

test('distinct plans share a tool page without sharing a supplier plan key', () => {
  assert.equal(toolFamilySlug('CapCut Pro Team 1 Month 1200 Credits'), 'capcut');
  assert.equal(toolFamilySlug('CapCut Pro 6 Months'), 'capcut');
  assert.equal(toolFamilyHref('ChatGPT Plus K12 EDU 2Years'), '/tools/chatgpt');
});

test('ChatGPT K12 and longer plans remain customer-visible', () => {
  assert.equal(isChatGptPlusProduct('ChatGPT Plus 1 Month'), true);
  assert.equal(isChatGptPlusProduct('ChatGPT Plus K12 EDU 2 Years'), false);
  assert.equal(isChatGptPlusProduct('ChatGPT Plus 4 Month'), false);
  assert.equal(isChatGptPlusProduct('ChatGPT Plus 2Years'), false);
});
