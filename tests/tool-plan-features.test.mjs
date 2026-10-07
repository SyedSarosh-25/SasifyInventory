import assert from 'node:assert/strict';
import test from 'node:test';
import { getToolPlanFeatures, extractWarrantyText } from '../app/tool-plan-features.ts';
import { products } from '../app/products.ts';
import { supplierSeoProducts } from '../app/supplier-seo-products.generated.ts';

test('getToolPlanFeatures returns 4 distinct tailored features for ChatGPT Shared', () => {
  const shared = products.find((p) => p.id === 'p093-shared');
  assert.ok(shared);
  const features = getToolPlanFeatures(shared, '1 Month');
  assert.equal(features.length, 4);
  assert.match(features[0], /4-member shared pool/i);
  assert.match(features[1], /GPT-4o/i);
  assert.match(features[2], /25-day replacement warranty/i);
  assert.match(features[3], /2FA login code/i);
});

test('getToolPlanFeatures returns 4 tailored features for ChatGPT Plus Private/Ultra', () => {
  const ultra = products.find((p) => p.id === 'p093');
  assert.ok(ultra);
  const features = getToolPlanFeatures(ultra, '1 Month');
  assert.equal(features.length, 4);
  assert.match(features[0], /Private dedicated account/i);
  assert.match(features[1], /GPT-4o/i);
  assert.match(features[2], /OpenAI 3-hour limit/i);
  assert.match(features[3], /30-Day full replacement warranty/i);
});

test('getToolPlanFeatures returns 4 tailored features for Claude Team Plan Premium and Standard', () => {
  const premium = products.find((p) => p.id === 'p012');
  const standard = products.find((p) => p.id === 'p013');
  assert.ok(premium && standard);

  const premFeatures = getToolPlanFeatures(premium, '1 Month');
  assert.equal(premFeatures.length, 4);
  assert.match(premFeatures[0], /Private seat on personal email inside Team workspace/i);
  assert.match(premFeatures[1], /Higher Claude 3\.5 Sonnet & Opus usage limits/i);
  assert.match(premFeatures[2], /Claude Code/i);

  const stdFeatures = getToolPlanFeatures(standard, '1 Month');
  assert.equal(stdFeatures.length, 4);
  assert.match(stdFeatures[0], /Private seat on personal email inside Team workspace/i);
  assert.match(stdFeatures[1], /Claude 3\.5 Sonnet & Claude 3 Opus/i);
  assert.match(stdFeatures[2], /Projects & Artifacts/i);
});

test('getToolPlanFeatures returns tailored features for CapCut Pro', () => {
  const features = getToolPlanFeatures({ name: 'CapCut Pro 1 Year', description: 'CapCut Pro' }, '1 Year');
  assert.equal(features.length, 4);
  assert.match(features[0], /Pro effects/i);
  assert.match(features[1], /4K 60FPS/i);
  assert.match(features[2], /background removal/i);
  assert.match(features[3], /PC, Mac, iOS & Android/i);
});

test('getToolPlanFeatures returns tailored features for Canva Pro', () => {
  const features = getToolPlanFeatures({ name: 'Canva Pro 1 Year', description: 'Canva' }, '1 Year');
  assert.equal(features.length, 4);
  assert.match(features[0], /100M\+ premium/i);
  assert.match(features[1], /Magic Resize/i);
  assert.match(features[2], /personal email/i);
});

test('getToolPlanFeatures returns tailored features for Hostinger VPS and Hosting', () => {
  const vps = products.find((p) => p.id === 'p101');
  const hosting = products.find((p) => p.id === 'p100');
  assert.ok(vps && hosting);

  const vpsFeatures = getToolPlanFeatures(vps, '12 Months');
  assert.equal(vpsFeatures.length, 4);
  assert.match(vpsFeatures[0], /KVM VPS/i);
  assert.match(vpsFeatures[1], /NVMe storage/i);
  assert.match(vpsFeatures[2], /root access/i);

  const hostFeatures = getToolPlanFeatures(hosting, '12 Months');
  assert.equal(hostFeatures.length, 4);
  assert.match(hostFeatures[0], /unlimited websites/i);
  assert.match(hostFeatures[1], /SSL certificates/i);
  assert.match(hostFeatures[2], /hPanel control/i);
  assert.match(hostFeatures[3], /Within 6 hours/i);
});

test('extractWarrantyText extracts explicit warranty from product name and duration', () => {
  assert.equal(extractWarrantyText('CapCut Pro 6M (FW)', '', '6 Months'), 'Full replacement warranty for 6 Months');
  assert.equal(extractWarrantyText('CHAT GPT PRO X5 1 MONTH (5-DAY WARRANTY)', ''), '5-Day replacement warranty');
  assert.equal(extractWarrantyText('Figma Pro Education 2 Years warranty 1 Year', ''), '1-Year replacement warranty');
  assert.equal(extractWarrantyText('ChatGPT Plus · Shared Account', ''), '25-Day replacement warranty included');
});

test('all products across catalog and supplier seo produce 4 non-empty features', () => {
  const all = [...products, ...supplierSeoProducts];
  for (const product of all) {
    const durMatch = product.name.match(/(\d+\s*(?:months?|days?|years?|d|m|y))\b/i);
    const dur = durMatch ? durMatch[0] : '';
    const features = getToolPlanFeatures(product, dur);
    assert.equal(features.length, 4, `Expected 4 features for ${product.name}`);
    for (const f of features) {
      assert.ok(typeof f === 'string' && f.trim().length >= 5, `Empty or short feature for ${product.name}: ${f}`);
    }
  }
});
