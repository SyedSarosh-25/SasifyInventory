import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { products } from '../app/products.ts';
import { guidePlans, guideQuestions } from '../app/buying-guide-content.ts';
import { faqData } from '../app/seo.ts';

test('guide comparisons use actual inventory records and include the requested invite variant', () => {
  assert.equal(guidePlans.length, 8);
  assert.equal(new Set(guidePlans.map(({ id }) => id)).size, 8);
  for (const product of guidePlans) assert.equal(product, products.find(({ id }) => id === product.id));
  assert.equal(guidePlans[5].id, 'p096');
  assert.match(guideQuestions[2].answer, /PKR 999.*1 Year/);
});

test('guide keeps access distinctions and warranty qualifications explicit', () => {
  assert.match(guideQuestions[0].answer, /Shared access is not exclusive personal access/);
  assert.match(guideQuestions[1].answer, /team seat, not ownership/);
  assert.match(guideQuestions[2].answer, /no monthly payments to us/);
  assert.match(guideQuestions[4].answer, /One-month and 30-day packages.*25-day warranty/);
  assert.match(guideQuestions[4].answer, /does not by itself mean a one-year warranty/);
  assert.match(guideQuestions[6].answer, /no checkout payment/);
});

test('FAQ markup uses the same complete answers as the visible guide', () => {
  const data = faqData('/buying-guide', guideQuestions);
  assert.equal(data['@type'], 'FAQPage');
  assert.equal(data.mainEntity.length, 7);
  assert.deepEqual(data.mainEntity.map(({ name, acceptedAnswer }) => ({ question: name, answer: acceptedAnswer.text })), guideQuestions);
});

test('buying guide reserves the full logo width before plan names', () => {
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.match(css, /\.guide-plans a\s*\{[^}]*grid-template-columns:\s*72px minmax\(0, 1fr\) auto 16px/);
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*?\.guide-plans a\s*\{[^}]*grid-template-columns:\s*72px minmax\(0, 1fr\) 16px/);
});
