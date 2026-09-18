import assert from 'node:assert/strict';
import test from 'node:test';
import { supplierProductAbout } from '../app/product-about.ts';

test('about sections explain searchable use cases for coding tools', () => {
  const about = supplierProductAbout({
    id: 'supplier:cursor',
    slug: 'cursor-ai-pro',
    canonicalKey: 'cursor-ai-pro',
    name: 'Cursor AI Pro 1 Month',
    description: 'AI coding editor subscription.',
    price: 1999,
    available: 3,
    category: 'AI coding tools',
  });
  assert.equal(about.heading, 'About this subscription');
  assert.ok([
    'Cursor AI price in Pakistan',
    'buy Cursor Pro Pakistan',
    'Cursor AI subscription Pakistan',
    'Cursor AI credits Pakistan',
    'Cursor coding tool Pakistan',
    'AI coding tool Pakistan',
  ].every((term) => about.searchTerms.includes(term)));
  assert.match(about.paragraphs.join(' '), /developers, students and teams/);
  assert.match(about.paragraphs.join(' '), /Cursor AI price in Pakistan/);
  assert.match(about.paragraphs.join(' '), /Cursor AI subscription Pakistan/);
  assert.match(about.useCases.join(' '), /writing code, fixing bugs/);
});

test('about sections explain searchable use cases for streaming plans', () => {
  const about = supplierProductAbout({
    id: 'supplier:netflix',
    slug: 'netflix-4k',
    canonicalKey: 'netflix-4k',
    name: 'Netflix 4K Account 1 Month',
    description: 'Streaming subscription for supported devices.',
    price: 999,
    available: 5,
    category: 'Streaming',
  });
  assert.equal(about.heading, 'About this subscription');
  assert.ok([
    'Netflix screen price in Pakistan',
    'Netflix account Pakistan',
    'Netflix 4K screen Pakistan',
    'Netflix subscription Pakistan',
    'buy Netflix Pakistan',
    'Netflix streaming Pakistan',
  ].every((term) => about.searchTerms.includes(term)));
  assert.match(about.paragraphs.join(' '), /Netflix screen price in Pakistan/);
  assert.match(about.paragraphs.join(' '), /Netflix 4K screen Pakistan/);
  assert.match(about.useCases.join(' '), /watching movies, shows, videos/);
  assert.match(about.useCases.join(' '), /4K or Ultra HD/);
});

test('about sections explain searchable use cases for creative subscriptions', () => {
  const about = supplierProductAbout({
    id: 'supplier:canva',
    slug: 'canva-pro',
    canonicalKey: 'canva-pro',
    name: 'Canva Pro 1 Year Invite',
    description: 'Design subscription for templates and brand assets.',
    price: 1499,
    available: 20,
    category: 'Design',
  });
  assert.equal(about.heading, 'About this subscription');
  assert.ok([
    'Canva Pro price in Pakistan',
    'buy Canva Pro Pakistan',
    'Canva Pro subscription Pakistan',
    'Canva Pro account Pakistan',
    'Canva Edu Pakistan',
    'Canva design tool Pakistan',
  ].every((term) => about.searchTerms.includes(term)));
  assert.match(about.paragraphs.join(' '), /Canva Pro price in Pakistan/);
  assert.match(about.paragraphs.join(' '), /buy Canva Pro Pakistan/);
  assert.match(about.useCases.join(' '), /social media posts, reels, ads/);
});

test('about sections use high-intent ChatGPT searches for Pakistan', () => {
  const about = supplierProductAbout({
    id: 'supplier:chatgpt',
    slug: 'chatgpt-plus',
    canonicalKey: 'chatgpt-plus',
    name: 'ChatGPT Plus 1 Month',
    description: 'AI chat subscription for writing, research and coding.',
    price: 3499,
    available: 4,
    category: 'AI Assistants',
  });
  assert.equal(about.heading, 'About this subscription');
  assert.ok([
    'ChatGPT Plus price in Pakistan',
    'buy ChatGPT Plus Pakistan',
    'ChatGPT Plus subscription Pakistan',
    'ChatGPT Plus account Pakistan',
    'ChatGPT Plus shared account Pakistan',
    'ChatGPT Plus 1 month Pakistan',
  ].every((term) => about.searchTerms.includes(term)));
  assert.match(about.paragraphs.join(' '), /ChatGPT Plus price in Pakistan/);
  assert.match(about.paragraphs.join(' '), /buy ChatGPT Plus Pakistan/);
  assert.match(about.paragraphs.join(' '), /ChatGPT Plus account Pakistan/);
});

test('about sections use exact Adobe product keywords', () => {
  const express = supplierProductAbout({
    id: 'supplier:adobe-express',
    slug: 'adobe-express',
    canonicalKey: 'adobe-express',
    name: 'Adobe Express 12M',
    description: 'Creative design app subscription.',
    price: 2499,
    available: 10,
    category: 'Design',
  });
  assert.ok([
    'Adobe Express price in Pakistan',
    'buy Adobe Express Pakistan',
    'Adobe Express subscription Pakistan',
    'Adobe Express account Pakistan',
    'Adobe graphic design app Pakistan',
    'graphic design app Pakistan',
  ].every((term) => express.searchTerms.includes(term)));

  const premiere = supplierProductAbout({
    id: 'supplier:adobe-premiere',
    slug: 'adobe-premiere',
    canonicalKey: 'adobe-premiere',
    name: 'Adobe Premiere Pro 1 Month',
    description: 'Video editing software subscription.',
    price: 3999,
    available: 3,
    category: 'Video editing',
  });
  assert.ok([
    'Adobe Premiere Pro price in Pakistan',
    'buy Adobe Premiere Pro Pakistan',
    'Adobe Premiere Pro subscription Pakistan',
    'Adobe Premiere Pro account Pakistan',
    'Adobe video editing software Pakistan',
    'video editing software Pakistan',
  ].every((term) => premiere.searchTerms.includes(term)));
});

test('supplier description words do not override the actual product brand', () => {
  const about = supplierProductAbout({
    id: 'supplier:elevenlabs',
    slug: 'elevenlabs',
    canonicalKey: 'elevenlabs',
    name: 'ElevenLabs Redeem 1M Credit',
    description:
      'Use these credits for voice generation. This description mentions CapCut only as an unrelated example.',
    price: 1999,
    available: 3,
    category: 'AI voice tools',
  });
  assert.ok([
    'ElevenLabs price in Pakistan',
    'buy ElevenLabs Pakistan',
    'ElevenLabs subscription Pakistan',
    'ElevenLabs credits Pakistan',
    'ElevenLabs 1M credits Pakistan',
    'AI voice tool Pakistan',
  ].every((term) => about.searchTerms.includes(term)));
  assert.doesNotMatch(about.paragraphs.join(' '), /CapCut Pro price in Pakistan/);
});
