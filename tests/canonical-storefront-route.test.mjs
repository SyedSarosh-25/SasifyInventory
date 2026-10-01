import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalStorefrontRoute } from '../scripts/canonical-storefront-route.mjs';

const origin = 'https://www.sasifysolutions.com';
test('explicit alias redirects preserve public paths and exclude the entire API namespace', () => {
  const route = canonicalStorefrontRoute('sasify-solutions-updated-build.vercel.app', origin);
  assert.deepEqual(route.has, [{ type: 'host', value: 'sasify-solutions-updated-build.vercel.app' }]);
  assert.equal(route.status, 308);
  assert.equal(route.headers.Location, `${origin}/$1`);
  const matcher = new RegExp(`^${route.src}$`);
  for (const path of ['/', '/inventory', '/products/claude-team-plan-standard', '/robots.txt', '/sitemap.xml']) {
    assert.ok(matcher.test(path), path);
  }
  for (const path of ['/api', '/api/', '/api/commerce', '/api/nayapay/inbound-email', '/api/binance/inbound-email', '/api/crypto/inbound-email']) {
    assert.ok(!matcher.test(path), path);
  }
});
test('invalid destinations, wildcards, and redirect loops fail closed', () => {
  for (const host of ['*.vercel.app', 'www.sasifysolutions.com', 'https://example.com', '']) {
    assert.throws(() => canonicalStorefrontRoute(host, origin));
  }
  for (const destination of ['http://www.sasifysolutions.com', `${origin}/inventory`, `${origin}/?x=1`, 'https://user:pass@example.com']) {
    assert.throws(() => canonicalStorefrontRoute('old.vercel.app', destination));
  }
});
