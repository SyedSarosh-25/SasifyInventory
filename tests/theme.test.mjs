import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import postcss from 'postcss';
import { isTheme, resolveTheme, themeInitScript, themeStorageKey } from '../app/theme-utils.ts';

function bootstrap(preference, prefersDark, storageBlocked = false) {
  const classes = new Set(['existing-class']);
  const root = {
    classList: { toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name) },
    style: {},
  };
  vm.runInNewContext(themeInitScript, {
    localStorage: { getItem(key) {
      assert.equal(key, themeStorageKey);
      if (storageBlocked) throw new Error('Storage blocked');
      return preference;
    } },
    window: { matchMedia: () => ({ matches: prefersDark }) },
    document: { documentElement: root },
  });
  return { classes, colorScheme: root.style.colorScheme };
}

test('only light and dark are accepted as saved preferences', () => {
  for (const value of ['light', 'dark']) assert.equal(isTheme(value), true);
  for (const value of [null, undefined, 'system', 'DARK', '', '<script>', {}]) assert.equal(isTheme(value), false);
});

test('light is the default and an explicit dark preference is retained', () => {
  assert.equal(resolveTheme('light'), 'light');
  assert.equal(resolveTheme('dark'), 'dark');
  for (const preference of [null, undefined, 'invalid']) {
    assert.equal(resolveTheme(preference), 'light');
  }
});

test('before-paint initialization matches the hydrated theme and preserves other root classes', () => {
  for (const preference of ['light', 'dark', null, 'invalid']) {
    for (const prefersDark of [false, true]) {
      const result = bootstrap(preference, prefersDark);
      const theme = resolveTheme(preference);
      assert.equal(result.classes.has('dark'), theme === 'dark');
      assert.equal(result.colorScheme, theme);
      assert.ok(result.classes.has('existing-class'));
    }
  }
});

test('blocked storage defaults to light even on a dark-mode device', () => {
  assert.equal(bootstrap(null, true, true).colorScheme, 'light');
  assert.equal(bootstrap(null, false, true).colorScheme, 'light');
});

function contrast(first, second) {
  function luminance(hex) {
    const channels = hex.replace('#', '').match(/../g).map((channel) => {
      const value = parseInt(channel, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }
  const a = luminance(first), b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test('dark body, secondary text, prices and key actions meet normal-text contrast', () => {
  const css = postcss.parse(readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8'));
  const tokens = new Map();
  css.walkRules('html.dark', (rule) => rule.walkDecls((decl) => tokens.set(decl.prop, decl.value)));
  for (const background of ['--page', '--surface']) {
    for (const text of ['--ink', '--copy', '--muted', '--blue']) {
      assert.ok(contrast(tokens.get(text), tokens.get(background)) >= 4.5, `${text} against ${background}`);
    }
  }
  assert.ok(contrast('#ffffff', tokens.get('--primary')) >= 4.5);
  assert.ok(contrast('#ffffff', '#6940d6') >= 4.5);
  assert.ok(contrast('#87d9af', tokens.get('--surface')) >= 4.5);
  assert.ok(contrast('#a0e5c2', '#122d23') >= 4.5);
});

test('dark-only border reset covers shared surfaces and preserves search focus outlines', () => {
  const css = postcss.parse(readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8'));
  let borderReset;
  let focusOutline;
  css.walkRules((rule) => {
    if (rule.selector.startsWith('html.dark :is(') && rule.selector.includes('.purchase-summary')) borderReset = rule;
    if (rule.selector.includes('html.dark .catalog-search:focus-within')) {
      rule.walkDecls('outline', (decl) => { focusOutline = decl.value; });
    }
  });
  assert.ok(borderReset);
  const border = borderReset.nodes.find((node) => node.type === 'decl' && node.prop === 'border-color');
  assert.equal(border.value, 'transparent');
  for (const selector of ['.site-header', '.featured-card', '.product-card', '.review-card', '.faq-list details', '.detail-prices > div', '.footer-socials', '.orbit-content > span', '.product-logo-frame', '.detail-logo-frame']) {
    assert.ok(borderReset.selector.includes(selector), selector);
  }
  assert.equal(focusOutline, '2px solid var(--blue)');
});
