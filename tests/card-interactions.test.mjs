import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

const css = postcss.parse(readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8'));
const cards = ['.featured-card', '.product-card', '.related-product'];

test('3D card hover is gated to precise pointers without reduced motion', () => {
  let hover;
  css.walkRules((rule) => {
    if (!cards.every((card) => rule.selector.includes(`${card}:hover`))) return;
    rule.walkDecls('transform', (decl) => { if (decl.value.includes('perspective')) hover = rule; });
  });
  assert.ok(hover);
  assert.equal(hover.parent.type, 'atrule');
  assert.equal(hover.parent.name, 'media');
  for (const condition of ['(hover: hover)', '(pointer: fine)', '(prefers-reduced-motion: no-preference)']) {
    assert.ok(hover.parent.params.includes(condition));
  }
  const transform = hover.nodes.find((node) => node.prop === 'transform').value;
  for (const effect of ['perspective(', 'translateY(', 'rotateX(', 'rotateY(']) assert.ok(transform.includes(effect));
  assert.ok(hover.nodes.some((node) => node.prop === 'box-shadow'));
  assert.ok(!hover.nodes.some((node) => ['width', 'height', 'padding', 'margin'].includes(node.prop)));
});

test('touch feedback stays flat and reduced motion disables card transitions', () => {
  let touch, reduced;
  css.walkAtRules('media', (rule) => {
    if (rule.params === '(hover: none)') touch = rule;
    if (rule.params === '(prefers-reduced-motion: reduce)') reduced = rule;
  });
  assert.ok(touch);
  assert.ok(reduced);
  touch.walkDecls('transform', () => assert.fail('Touch cards must not tilt'));
  for (const card of cards) {
    assert.ok(reduced.nodes.some((rule) => rule.type === 'rule' && rule.selector.includes(card)
      && rule.nodes.some((decl) => decl.prop === 'transition' && decl.value === 'none')));
  }
});

test('light mode is permanent with no dark styling or theme controls', () => {
  let scheme;
  css.walkRules((rule) => {
    assert.ok(!rule.selector.includes('html.dark'));
    if (rule.selector === ':root') rule.walkDecls('color-scheme', (decl) => { scheme = decl.value; });
  });
  assert.equal(scheme, 'light');
  for (const path of ['../app/theme-utils.ts', '../app/components/theme-toggle.tsx']) {
    assert.equal(existsSync(new URL(path, import.meta.url)), false);
  }
  const header = readFileSync(new URL('../app/components/site-chrome.tsx', import.meta.url), 'utf8');
  assert.ok(!header.includes('ThemeToggle'));
  const layout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8');
  assert.ok(!layout.includes('themeInitScript'));
  assert.ok(layout.includes("colorScheme: 'light'"));
});
