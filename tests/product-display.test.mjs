import test from 'node:test';
import assert from 'node:assert/strict';
import { customerProduct, customerProductName, customerProductText } from '../commerce/product-display.mjs';

test('public names omit non-warranty labels while preserving plan duration and identity', () => {
  for (const suffix of ['NW', '(nw)', '[Nw]', 'Non warranty', 'non-warranty', 'No Warranty', 'warranty not included', 'without warranty']) {
    const source = { id: 'auto:gemini-nw', canonical_key: 'gemini-nw', name: `Gemini 18 Months ${suffix}`, price: 2500, available: 7 };
    const result = customerProduct(source);
    assert.equal(result.name, 'Gemini 18 Months');
    assert.equal(result.id, source.id);
    assert.equal(result.canonical_key, source.canonical_key);
    assert.equal(result.price, source.price);
    assert.equal(result.available, source.available);
    assert.equal(result.warranty, undefined);
    assert.equal(source.name, `Gemini 18 Months ${suffix}`);
  }
  assert.equal(customerProductName({ name: 'Figma Pro Education 2 Years warranty 1 Year' }), 'Figma Pro Education 2 Years warranty 1 Year');
});

test('product descriptions keep activation instructions, links, device rules and unrelated words', () => {
  const source = {
    name: 'Adobe Pro 4 Months NW',
    description: 'NW Private account.\nMaximum login on 2 devices.\nNon warranty\nRedeem within 24 hours at https://example.com/nw?plan=non-warranty\nDo not change the email.\nNo warranty after activation.\nDownload your files.',
    delivery_instruction: 'Use this URL: https://example.com/warranty/nw\nNo Warranty After Active\nUse Indian VPN if region issue.',
  };
  const result = customerProduct(source);
  for (const text of ['Private account.', 'Maximum login on 2 devices.', 'Redeem within 24 hours', 'Do not change the email.', 'Download your files.', 'https://example.com/nw?plan=non-warranty']) assert.ok(result.description.includes(text), text);
  assert.doesNotMatch(result.description.replace(/https?:\/\/\S+/g, ''), /\bnw\b|non[- ]warranty|no warranty/i);
  assert.equal(result.delivery_instruction, 'Use this URL: https://example.com/warranty/nw\n\nUse Indian VPN if region issue.');
});

test('removing warranty labels does not remove the original product description', () => {
  const source = {
    id: 'auto:cdk-supergrok-1m-nw',
    name: 'CDK Supergrok 1M (NW)',
    description: '📝 Product Description\n⭐️ After completing payment, you will receive the CDK and top-up website.\n⭐️ This is a CDK for the 1-month Super Grok package.\n⭐️ Your account must be on the free plan.\n⭐️ No warranty after successful redemption.\nTop-up website: https://recharge.example/grok',
  };
  const result = customerProduct(source);
  assert.equal(result.name, 'CDK Supergrok 1M');
  for (const text of ['Product Description', 'After completing payment', 'CDK and top-up website', '1-month Super Grok package', 'free plan', 'https://recharge.example/grok']) assert.ok(result.description.includes(text), text);
  assert.doesNotMatch(result.description.replace(/https?:\/\/\S+/g, ''), /\bnw\b|non[- ]warranty|no warranty/i);
});

test('supplier-specific positive warranty terms are preserved', () => {
  const result = customerProduct({ name: 'MS Office 365 Plus 12M', description: 'Access for 12 months.\n1-Month Full Warranty From My Side\nWarranty: 24 hours', delivery_instruction: 'Redeem within 2 days. Warranty till login.' });
  assert.match(result.description, /Access for 12 months/);
  assert.match(result.description, /1-Month Full Warranty From My Side/);
  assert.match(result.description, /Warranty: 24 hours/);
  assert.match(result.delivery_instruction, /Redeem within 2 days/);
  assert.match(result.delivery_instruction, /Warranty till login/);
  assert.equal(result.warranty, undefined);
});

test('ChatGPT retains its existing positive warranty terms', () => {
  const chatgpt = { id: 'p093-ultra', name: 'ChatGPT Plus Ultra Stable', description: 'Full 25-day warranty included.', delivery_instruction: 'Keep your account secure.' };
  assert.deepEqual(customerProduct(chatgpt), chatgpt);
  const other = customerProduct({ name: 'Chat GPT Pro 1 Month NW', description: '10-day warranty.' });
  assert.equal(other.name, 'Chat GPT Pro 1 Month');
  assert.equal(other.description, '10-day warranty.');
  assert.equal(other.warranty, undefined);
});

test('public presentation is idempotent and ordinary delivery instructions remain intact', () => {
  const source = { name: 'Figma 2 years warranty 1 year', description: 'Personal account. No warranty after login.', delivery_instruction: 'Redeem once.' };
  const result = customerProduct(source);
  assert.deepEqual(customerProduct(result), result);
  assert.equal(customerProductText('Redeem once.', source), 'Redeem once.');
});
