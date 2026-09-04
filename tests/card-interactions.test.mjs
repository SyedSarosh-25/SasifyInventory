import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

const css = postcss.parse(readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8'));
const cards = ['.featured-card', '.product-card', '.related-product'];

test('hero headline uses the dedicated display font without changing body typography', () => {
  const declaration = (selector, property) => {
    let value;
    css.walkRules(selector, (rule) => rule.walkDecls(property, (decl) => { value = decl.value; }));
    return value;
  };
  assert.match(declaration('.hero h1', 'font-family'), /^var\(--font-display\)/);
  assert.match(declaration('body', 'font-family'), /^var\(--font-geist-sans\)/);
});

test('hero headline types one character at a time with an accessible static label', () => {
  const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /function HeroTypingTitle/);
  assert.match(page, /setTimeout\(typeNextCharacter/);
  assert.match(page, /hero-title-accessible/);
  assert.match(page, /prefers-reduced-motion: reduce/);

  let caret;
  css.walkRules('.hero-title-caret', (rule) => {
    if (rule.parent.type === 'root') caret = rule;
  });
  assert.ok(caret?.nodes.some((decl) => decl.prop === 'animation' && decl.value.includes('hero-caret-blink')));
});

test('all sourced reviews render in a continuously moving carousel with icon controls', () => {
  const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /reviews\.map\(\(review\)/);
  assert.doesNotMatch(page, /visibleReviews\.map/);
  assert.match(page, /requestAnimationFrame\(move\)/);
  assert.match(page, /cloneNode\(true\)/);
  assert.doesNotMatch(page, /track\.matches\(':hover'\)/);
  assert.match(page, /aria-label="Previous review"/);
  assert.match(page, /aria-label="Next review"/);

  let track;
  css.walkRules('.reviews-grid', (rule) => { track = rule; });
  assert.ok(track?.nodes.some((decl) => decl.prop === 'overflow-x' && decl.value === 'auto'));
});

test('delivery proofs render in a swipeable carousel with a full-size dialog', () => {
  const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /Recent successful deliveries/);
  assert.match(page, /Array\.from\(\{ length: 21 \}/);
  assert.match(page, /`\/deal-proofs\/proof-\$\{proofNumber\}\.webp`/);
  for (let index = 1; index <= 21; index += 1) {
    const file = `../public/deal-proofs/proof-${String(index).padStart(2, '0')}.webp`;
    assert.equal(existsSync(new URL(file, import.meta.url)), true);
  }
  assert.equal(existsSync(new URL('../public/deal-proofs/deal-01.webp', import.meta.url)), false);
  assert.doesNotMatch(page, /\[false, true\]\.flatMap/);
  assert.equal((page.match(/cloneNode\(true\)/g) || []).length, 1);
  assert.doesNotMatch(page, /track\.children\.item\(dealProofs\.length\)/);
  assert.doesNotMatch(page, /aria-label="Previous delivery proof"/);
  assert.doesNotMatch(page, /aria-label="Next delivery proof"/);
  assert.match(page, /aria-label="Successful deliveries carousel"/);
  assert.match(page, /<dialog/);
  assert.match(page, /dialog\.showModal\(\)/);
  assert.match(page, /isInteractingRef/);
  assert.match(page, /pointerdown/);
  assert.doesNotMatch(page, /delivery proofs<\/span>/);
  assert.doesNotMatch(page, /Successful delivery proof/);
  assert.doesNotMatch(page, /Successfully delivered/);
  assert.doesNotMatch(page, /deal-proof-preview-count/);

  let desktopCard;
  css.walkRules('.deal-proof-card', (rule) => {
    if (rule.parent.type === 'root') desktopCard = rule;
  });
  assert.ok(desktopCard?.nodes.some((decl) => decl.prop === 'flex' && decl.value.includes('/ 5')));
});

test('trust and payment sections use confirmed copy and local payment logos', () => {
  const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /Why choose Sasify\?/);
  assert.match(page, /Founder-led service/);
  assert.match(page, /24\/7 chat support/);
  assert.match(page, /remaining unused amount is refunded under the confirmed order terms/);
  assert.match(page, /Supported payment methods worldwide/);
  for (const method of ['easypaisa.png', 'nayapay.svg', 'sadapay.webp', 'binance.svg', 'payoneer.svg']) {
    assert.equal(existsSync(new URL(`../public/payment-methods/${method}`, import.meta.url)), true);
  }
  assert.match(page, /All Pakistani Banks/);
});

test('mobile carousels support native touch scrolling and resume after interaction', () => {
  const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /reviewInteractingRef/);
  assert.match(page, /pointercancel/);
  assert.match(page, /matches\(':focus-visible'\)/);
  assert.equal((page.match(/setInterval\(autoAdvance, 2600\)/g) || []).length, 2);
  assert.equal((page.match(/track\.scrollLeft -= loopWidth/g) || []).length, 3);
  assert.match(page, /const maxPosition = track\.scrollWidth - track\.clientWidth/);

  for (const selector of ['.reviews-grid', '.deal-proofs-track']) {
    let rule, mobileRule;
    css.walkRules((candidate) => {
      if (!candidate.selector.split(',').map((part) => part.trim()).includes(selector)) return;
      if (candidate.parent.type === 'root') rule = candidate;
      if (candidate.parent.type === 'atrule' && candidate.parent.params === '(max-width: 640px)') mobileRule = candidate;
    });
    assert.ok(rule?.nodes.some((decl) => decl.prop === 'scroll-snap-type' && decl.value === 'none'));
    assert.ok(rule?.nodes.some((decl) => decl.prop === 'touch-action' && decl.value === 'pan-x pan-y'));
    assert.ok(mobileRule?.nodes.some((decl) => decl.prop === 'scroll-snap-type' && decl.value === 'inline mandatory'));
  }
});

test('search field types a Canva prompt without changing the user query', () => {
  const search = readFileSync(new URL('../app/components/hero-product-search.tsx', import.meta.url), 'utf8');
  assert.match(search, /const prompt = 'Search Canva'/);
  assert.match(search, /setAnimatedPlaceholder/);
  assert.match(search, /placeholder=\{animatedPlaceholder\}/);
  assert.match(search, /prefers-reduced-motion: reduce/);
});

test('payment methods use a motion-safe 3D hover treatment', () => {
  let hover;
  css.walkRules('.payment-method:hover', (rule) => {
    if (rule.parent.type === 'atrule') hover = rule;
  });
  assert.ok(hover);
  assert.ok(hover.parent.params.includes('(hover: hover)'));
  assert.ok(hover.parent.params.includes('(pointer: fine)'));
  assert.ok(hover.parent.params.includes('(prefers-reduced-motion: no-preference)'));
  assert.match(hover.nodes.find((node) => node.prop === 'transform').value, /perspective\(700px\).*rotateX\(3deg\)/);
});

test('trust showcase uses layered depth and an interactive emblem face', () => {
  const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /why-sasify-rim/);
  assert.match(page, /why-sasify-emblem-face/);
  assert.match(page, /why-sasify-connections/);
  assert.equal((page.match(/<path d="M500 150/g) || []).length, 12);

  let emblem;
  css.walkRules('.why-sasify-emblem', (rule) => {
    if (rule.parent.type === 'root') emblem = rule;
  });
  assert.ok(emblem?.nodes.some((decl) => decl.prop === 'transform-style' && decl.value === 'preserve-3d'));
  assert.ok(emblem?.nodes.some((decl) => decl.prop === 'box-shadow' && decl.value.split(',').length >= 4));
});

test('mobile hero removes decorative overlap and the old crossing line', () => {
  const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /hero-accent/);

  let mobileHeroDecoration;
  css.walkRules('.hero::after', (rule) => {
    if (rule.parent.type === 'atrule' && rule.parent.params === '(max-width: 640px)') mobileHeroDecoration = rule;
  });
  assert.ok(mobileHeroDecoration?.nodes.some((decl) => decl.prop === 'display' && decl.value === 'none'));
});

test('mobile trust story stays centered and presents one swipeable benefit', () => {
  const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  let mobileEmblem, mobileStory;
  css.walkRules('.why-sasify-emblem', (rule) => {
    if (rule.parent.type === 'atrule' && rule.parent.params === '(max-width: 640px)') mobileEmblem = rule;
  });
  css.walkRules('.why-sasify-mobile-story', (rule) => {
    if (rule.parent.type === 'atrule' && rule.parent.params === '(max-width: 640px)') mobileStory = rule;
  });
  assert.match(page, /function WhySasifyMobile/);
  assert.match(page, /Why choose Sasify carousel/);
  assert.match(page, /setInterval\(\(\) => \{/);
  assert.match(page, /track\.scrollTo\(\{ left: card\.offsetLeft - track\.offsetLeft, behavior: 'smooth' \}\)/);
  assert.match(page, /onScroll=\{\(event\) => \{/);
  assert.ok(mobileEmblem?.nodes.some((decl) => decl.prop === 'margin-inline' && decl.value === 'auto'));
  assert.ok(mobileEmblem?.nodes.some((decl) => decl.prop === 'transform' && decl.value.includes('rotateY(0deg)')));
  assert.ok(mobileStory?.nodes.some((decl) => decl.prop === 'margin' && decl.value === '0 auto'));
});

test('subtle card lift is gated to precise pointers without reduced motion', () => {
  let hover;
  css.walkRules((rule) => {
    if (!cards.every((card) => rule.selector.includes(`${card}:hover`))) return;
    rule.walkDecls('transform', () => { hover = rule; });
  });
  assert.ok(hover);
  assert.equal(hover.parent.type, 'atrule');
  assert.equal(hover.parent.name, 'media');
  for (const condition of ['(hover: hover)', '(pointer: fine)', '(prefers-reduced-motion: no-preference)']) {
    assert.ok(hover.parent.params.includes(condition));
  }
  const transform = hover.nodes.find((node) => node.prop === 'transform').value;
  assert.equal(transform, 'translateY(-2px)');
  assert.ok(hover.nodes.some((node) => node.prop === 'box-shadow'));
  assert.ok(!hover.nodes.some((node) => ['width', 'height', 'padding', 'margin'].includes(node.prop)));
});

test('product cards and their content never use tilt or 3D transforms', () => {
  css.walkRules((rule) => {
    if (![...cards, '.featured-logo', '.featured-action'].some((selector) => rule.selector.includes(selector))) return;
    rule.walkDecls((decl) => {
      assert.doesNotMatch(decl.value, /perspective\(|rotate[XYZ]?\(|translateZ\(|matrix3d\(|preserve-3d/);
    });
  });
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
