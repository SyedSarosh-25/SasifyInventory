import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

const css = postcss.parse(readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8'));
const declarations = (selector, media) => {
  const values = {};
  css.walkRules((rule) => {
    if (rule.selector !== selector) return;
    if (media ? rule.parent.type !== 'atrule' || rule.parent.params !== media : rule.parent.type !== 'root') return;
    rule.walkDecls((decl) => { values[decl.prop] = decl.value; });
  });
  return values;
};

test('mobile orbit expands without pushing enlarged icons off small screens', () => {
  const media = '(max-width: 640px)';
  assert.equal(declarations('.brand-constellation', media).width, 'min(100%, 340px)');
  const radiusPercent = Number.parseFloat(declarations('.orbit-tool', media)['--orbit-radius']);
  assert.equal(radiusPercent, 38);
  assert.equal(Number.parseFloat(declarations('.ring-one', media).width), radiusPercent * 2);
  const iconSize = Number.parseFloat(declarations('.orbit-content, .orbit-content > span', media).width);
  const corePercent = Number.parseFloat(declarations('.center-logo').width);
  for (const viewport of [320, 360, 375, 390, 414, 430, 640]) {
    const width = Math.min(viewport - (viewport <= 360 ? 32 : 36), 340);
    const radius = width * radiusPercent / 100;
    assert.ok(radius + iconSize * 1.12 / 2 < width / 2, `Icon clipped at ${viewport}px`);
    assert.ok(radius - iconSize * 1.12 / 2 - width * corePercent / 200 > 20, `Crowded center at ${viewport}px`);
    assert.ok(radius - iconSize * 1.12 > 40, `Crowded neighboring icons at ${viewport}px`);
  }
});

test('beam shares the orbit pivot and radius and cannot block product links', () => {
  const orbit = declarations('.orbit-tool');
  assert.equal(orbit.top, '50%');
  assert.equal(orbit.left, '50%');
  assert.equal(orbit['transform-origin'], '0 0');
  const beam = declarations('.orbit-tool::before');
  assert.equal(beam.left, '0');
  assert.equal(beam.width, 'var(--orbit-radius)');
  assert.equal(beam['pointer-events'], 'none');
  assert.equal(beam.opacity, '0');
  assert.ok(Number(declarations('.center-logo')['z-index']) > Number(orbit['z-index']));
});

test('only the hovered or keyboard-focused tool lights up and scales its inner badge', () => {
  const hover = '(hover: hover) and (pointer: fine)';
  assert.equal(declarations('.orbit-tool:has(.orbit-content:hover)::before', hover).opacity, '1');
  assert.equal(declarations('.orbit-content:hover > span', hover).transform, 'scale(1.12)');
  assert.equal(declarations('.orbit-tool:has(.orbit-content:focus-visible)::before').opacity, '1');
  assert.equal(declarations('.orbit-content:focus-visible > span').transform, 'scale(1.12)');
  assert.equal(declarations('.orbit-content:hover', hover).transform, undefined);
  assert.equal(declarations('.orbit-tool::before, .orbit-content > span', '(prefers-reduced-motion: reduce)').transition, 'none');
});
