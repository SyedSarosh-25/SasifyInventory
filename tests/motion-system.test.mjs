import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const component = readFileSync(new URL('../app/components/motion-system.tsx', import.meta.url), 'utf8');
const layout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8');
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('GSAP motion system is mounted globally with ScrollTrigger cleanup', () => {
  assert.equal(packageJson.dependencies.gsap, '^3.15.0');
  assert.match(layout, /<MotionSystem \/>/);
  assert.match(component, /gsap\.registerPlugin\(ScrollTrigger\)/);
  assert.match(component, /context\.revert\(\)/);
});

test('motion system respects reduced-motion preferences', () => {
  assert.match(component, /prefers-reduced-motion: reduce/);
  assert.match(component, /clearProps: 'opacity,visibility,transform'/);
});

test('homepage trust and payment items use staggered GSAP reveals', () => {
  assert.match(component, /\.why-sasify-column/);
  assert.match(component, /\.why-sasify-center/);
  assert.match(component, /\.payment-methods-grid/);
  assert.match(component, /stagger: \{ amount:/);
});

test('trust emblem responds to precise-pointer movement and cleans up its animation', () => {
  assert.match(component, /querySelector<HTMLElement>\('\.why-sasify-emblem'\)/);
  assert.match(component, /gsap\.quickTo\(emblem, 'rotationX'/);
  assert.match(component, /pointermove/);
  assert.match(component, /float\.kill\(\)/);
});
