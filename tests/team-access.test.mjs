import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { createHandler } from '../commerce/handler.mjs';
import { hash } from '../commerce/core.mjs';

test('profit stays locked and teammate stock pickups update HOR commissions', async () => {
  const database = new PGlite();
  await database.exec(await readFile(new URL('../commerce/schema.sql', import.meta.url), 'utf8'));
  const env = {
    DATABASE_URL: 'test',
    COMMERCE_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
    COMMERCE_ADMIN_KEY: randomBytes(32).toString('hex'),
    COMMERCE_ADMIN_EMAIL: 'admin@test.invalid',
    COMMERCE_ADMIN_PASSWORD_HASH: hash('admin-password'),
  };
  Object.assign(process.env, env);
  let tail = Promise.resolve();
  const handler = createHandler(() => ({
    async connect() {
      const previous = tail;
      let release;
      tail = new Promise((resolve) => { release = resolve; });
      await previous;
      return {
        async query(sql, args) {
          const result = await database.query(sql, args);
          return { ...result, rowCount: result.affectedRows ?? result.rows.length };
        },
        release,
      };
    },
  }));
  async function request(action, body, token = '', extraHeaders = {}) {
    let result;
    const responseHeaders = {};
    const req = {
      method: body ? 'POST' : 'GET',
      query: { action },
      url: '/api/commerce',
      headers: { ...extraHeaders, authorization: token ? `Bearer ${token}` : '' },
      body,
      socket: { remoteAddress: randomBytes(4).toString('hex') },
    };
    const res = {
      statusCode: 200,
      setHeader(name, value) { responseHeaders[String(name).toLowerCase()] = value; },
      end(text) { result = { code: this.statusCode, data: JSON.parse(text), headers: responseHeaders }; },
    };
    await handler(req, res);
    return result;
  }
  const adminKey = env.COMMERCE_ADMIN_KEY;
  try {
    assert.equal((await request('admin-import', {
      productId: 'p093',
      accounts: 'team-stock@test.invalid|team-pass|team-2fa',
      purchaseCost: 1000,
    }, adminKey)).code, 200);
    assert.equal((await request('admin-import', {
      productId: 'p093-ultra',
      accounts: 'team-shared@test.invalid|shared-pass|JBSWY3DPEHPK3PXP',
      purchaseCost: 1000,
    }, adminKey)).code, 200);
    const importedInventory = (await request('admin-list', undefined, adminKey)).data.inventory;
    const sharedInventory = importedInventory.find((item) => item.productId === 'p093-ultra');
    assert.ok(sharedInventory);
    assert.equal((await request('admin-shared-add', {
      inventoryId: sharedInventory.id,
      confirmed: true,
    }, adminKey)).code, 200);
    const locked = await request('admin-list', undefined, adminKey);
    assert.equal(locked.code, 200);
    assert.equal(locked.data.profitUnlocked, false);
    assert.equal(locked.data.metrics.profit, null);

    const unlocked = await request('admin-profit-unlock', { password: 'HOR' }, adminKey);
    assert.equal(unlocked.code, 200);
    const financials = await request('admin-list', undefined, adminKey, {
      'x-profit-token': unlocked.data.token,
    });
    assert.equal(financials.data.profitUnlocked, true);

    assert.equal((await request('admin-team-credentials', {
      email: 'teammate@test.invalid',
      password: 'team-password',
    }, adminKey)).code, 200);
    const login = await request('team-login', {
      email: 'teammate@test.invalid',
      password: 'team-password',
    });
    assert.equal(login.code, 200);
    const stock = await request('team-stock', undefined, login.data.token);
    assert.deepEqual(stock.data.products, [
      {
        productId: 'p093',
        productName: 'ChatGPT Plus',
        available: 1,
      },
      {
        productId: 'p093-shared',
        productName: 'ChatGPT Plus · Shared Account',
        available: 4,
      },
    ]);
    const pickup = await request('team-inventory-pick', {
      productId: 'p093',
    }, login.data.token);
    assert.equal(pickup.code, 200, JSON.stringify(pickup));
    assert.equal(pickup.data.credentials.email, 'team-stock@test.invalid');
    assert.deepEqual(pickup.data.commission, { code: 'HOR', amountPkr: 50 });
    const sharedPickup = await request('team-inventory-pick', {
      productId: 'p093-shared',
    }, login.data.token);
    assert.equal(sharedPickup.code, 200, JSON.stringify(sharedPickup));
    assert.equal(sharedPickup.data.productId, 'p093-shared');
    assert.equal(sharedPickup.data.credentials.email, 'team-shared@test.invalid');
    assert.deepEqual(sharedPickup.data.commission, { code: 'HOR', amountPkr: 50 });
    assert.deepEqual((await request('team-stock', undefined, login.data.token)).data.products, [{
      productId: 'p093-shared',
      productName: 'ChatGPT Plus · Shared Account',
      available: 3,
    }]);

    const afterPickup = await request('admin-list', undefined, adminKey, {
      'x-profit-token': unlocked.data.token,
    });
    assert.equal(afterPickup.data.inventory.find((item) => item.productId === 'p093')?.state, 'withdrawn');
    assert.equal(afterPickup.data.inventory.find((item) => item.productId === 'p093-ultra')?.state, 'available');
    const hor = afterPickup.data.commissionSummary.find((item) => item.code === 'HOR');
    assert.equal(hor.sales, 2);
    assert.equal(hor.total, 100);
    assert.equal(afterPickup.data.teamCommissions.totalPkr, 100);
  } finally {
    await database.close();
  }
});
