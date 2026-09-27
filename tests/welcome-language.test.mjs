import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createWelcomeHandler } from '../commerce/welcome-language.mjs';

test('welcome design includes the Sasify logo, supplied Pakistan icon and two language choices', async () => {
  const component = await readFile(fileURLToPath(new URL('../app/components/language.tsx', import.meta.url)), 'utf8');
  assert.match(component, /src="\/favicon-48x48\.png"/);
  assert.match(component, /src="\/pakistan-welcome\.png"/);
  assert.match(component, /English<\/button>/);
  assert.match(component, /Roman Urdu<\/button>/);
  assert.ok((await stat(fileURLToPath(new URL('../public/pakistan-welcome.png', import.meta.url)))).size > 0);
  assert.ok((await stat(fileURLToPath(new URL('../out/pakistan-welcome.png', import.meta.url)))).size > 0);
});

function response() {
  return {
    headers: {}, statusCode: 200, body: '',
    setHeader(name, value) { this.headers[name] = value; },
    end(value) { this.body = JSON.parse(value); },
  };
}

test('Pakistan welcome is shown once per hashed public IP, without storing raw addresses', async () => {
  const previous = { database: process.env.DATABASE_URL, key: process.env.COMMERCE_ENCRYPTION_KEY };
  process.env.DATABASE_URL = 'postgres://test.invalid/local';
  process.env.COMMERCE_ENCRYPTION_KEY = 'a'.repeat(64);
  const seen = new Set();
  const queries = [];
  const handler = createWelcomeHandler(() => ({
    async query(sql, params = []) {
      queries.push([sql, params]);
      if (sql.startsWith('SELECT')) return { rowCount: seen.has(params[0]) ? 1 : 0 };
      if (sql.startsWith('INSERT')) seen.add(params[0]);
      return { rowCount: 0 };
    },
  }));
  async function call(method, ip, country = 'PK', origin = 'https://www.sasifysolutions.com') {
    const res = response();
    await handler({ method, headers: { 'x-vercel-ip-country': country, 'x-vercel-forwarded-for': ip, origin } }, res);
    return res;
  }
  try {
    assert.deepEqual((await call('GET', '203.0.113.8')).body, { eligible: true });
    assert.deepEqual((await call('POST', '203.0.113.8')).body, { eligible: false });
    assert.deepEqual((await call('GET', '203.0.113.8')).body, { eligible: false });
    assert.deepEqual((await call('GET', '203.0.113.9')).body, { eligible: true });
    assert.deepEqual((await call('GET', '203.0.113.10', 'VN')).body, { eligible: false });
    assert.equal((await call('POST', '203.0.113.11', 'PK', 'https://evil.invalid')).statusCode, 403);
    assert.deepEqual((await call('GET', 'not-an-ip')).body, { eligible: false });
    assert.equal(seen.size, 1);
    assert.match([...seen][0], /^[a-f0-9]{64}$/);
    assert.ok(!JSON.stringify(queries).includes('203.0.113.8'));
  } finally {
    if (previous.database === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous.database;
    if (previous.key === undefined) delete process.env.COMMERCE_ENCRYPTION_KEY;
    else process.env.COMMERCE_ENCRYPTION_KEY = previous.key;
  }
});
