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
  assert.match(about.paragraphs.join(' '), /ChatGPT Plus price in Pakistan/);
  assert.match(about.paragraphs.join(' '), /buy ChatGPT Plus Pakistan/);
  assert.match(about.paragraphs.join(' '), /ChatGPT Plus account Pakistan/);
});
