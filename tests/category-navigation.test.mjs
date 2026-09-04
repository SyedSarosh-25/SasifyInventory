import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

const css = postcss.parse(readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8'));
const declarations = (selector) => {
  const values = {};
  css.walkRules((rule) => {
    if (rule.selector === selector) rule.walkDecls((decl) => { values[decl.prop] = decl.value; });
  });
  return values;
};

test('category arrows have reserved touch-sized columns without covering labels', () => {
  assert.equal(declarations('.category-navigation')['grid-template-columns'], '44px minmax(0, 1fr) 44px');
  assert.equal(declarations('.category-scroll-button').width, '44px');
  assert.equal(declarations('.category-scroll-button').height, '44px');
  assert.equal(declarations('.category-strip button')['max-width'], '100%');
});

test('native category scrollbar is hidden while touch and horizontal scrolling remain available', () => {
  const strip = declarations('.category-strip');
  assert.equal(strip['overflow-x'], 'auto');
  assert.equal(strip['scrollbar-width'], 'none');
  assert.equal(declarations('.category-strip::-webkit-scrollbar').display, 'none');
  assert.equal(strip['overscroll-behavior-x'], 'contain');
});

test('category controls retain visible keyboard focus', () => {
  for (const selector of ['.category-scroll-button:focus-visible', '.category-strip button:focus-visible']) {
    assert.equal(declarations(selector).outline, '2px solid var(--blue)');
  }
});
