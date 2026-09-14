import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { createHandler } from '../commerce/handler.mjs';
import { encrypt, hash } from '../commerce/core.mjs';

test('shared ChatGPT inventory rotates four slots and allocates profit per slot', async () => {
  const database = new PGlite();
  await database.exec(await readFile(new URL('../commerce/schema.sql', import.meta.url), 'utf8'));
  const env = {
    DATABASE_URL: 'test',
    COMMERCE_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
    COMMERCE_ADMIN_KEY: randomBytes(32).toString('hex'),
    COMMERCE_ADMIN_EMAIL: 'admin@shared.test',
    COMMERCE_ADMIN_PASSWORD_HASH: hash('test-password'),
    PAYMENT_ACCOUNT_TITLE: 'Test Receiver',
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
  async function request(action, body, token = '', id = '', extraHeaders = {}) {
    let result;
    const req = {
      method: body ? 'POST' : 'GET',
      query: { action, id },
      url: '/api/commerce',
      headers: { ...extraHeaders, authorization: token ? `Bearer ${token}` : '' },
      body,
      socket: { remoteAddress: randomBytes(4).toString('hex') },
    };
    const res = {
      statusCode: 200,
      setHeader() {},
      end(text) { result = { code: this.statusCode, data: JSON.parse(text) }; },
    };
    await handler(req, res);
    return result;
  }

  const imported = await request('admin-import', {
    productId: 'p093-ultra',
    accounts: 'shared-one@test.invalid|test-pass|test-2fa\nshared-two@test.invalid|test-pass|test-2fa-2',
    purchaseCost: 1000,
  }, env.COMMERCE_ADMIN_KEY);
  assert.equal(imported.code, 200, JSON.stringify(imported));
  const initialAdmin = await request('admin-list', undefined, env.COMMERCE_ADMIN_KEY);
  const inventory = initialAdmin.data.inventory.filter((item) => item.state === 'available');
  assert.equal(inventory.length, 2);
  for (const item of inventory) {
    const added = await request('admin-shared-add', {
      inventoryId: item.id,
      confirmed: true,
    }, env.COMMERCE_ADMIN_KEY);
    assert.equal(added.code, 200, JSON.stringify(added));
  }

  const stock = await request('stock');
  const sharedStock = stock.data.products.find((item) => item.id === 'p093-shared');
  assert.equal(sharedStock.available, 8, JSON.stringify(sharedStock));
  assert.equal(sharedStock.shared_slots_filled, 0);
  assert.equal(sharedStock.shared_slots_total, 8);

  const deliveredOrders = [];
  for (let index = 0; index < 5; index += 1) {
    const created = await request('create', { productId: 'p093-shared' });
    assert.equal(created.code, 200, JSON.stringify(created));
    const transaction = `SHARED-${index + 1}-PAYMENT`;
    await database.query(
      `INSERT INTO commerce_payments(id,event_hash,transaction_id,amount,payer_name,source_last4,received_at,verified,subject,encrypted_body)
       VALUES($1,$2,$3,$4,$5,$6,now(),true,$7,$8)`,
      [randomUUID(), hash(transaction), transaction, created.data.amount, 'Shared Buyer', '1234', 'Shared payment', encrypt({ text: 'test' }, env.COMMERCE_ENCRYPTION_KEY)],
    );
    const claim = await request('claim', { id: created.data.id, transactionId: transaction }, created.data.recovery);
    assert.equal(claim.code, 200, JSON.stringify(claim));
    const status = await request('status', undefined, created.data.recovery, created.data.id);
    assert.equal(status.data.status, 'delivered', JSON.stringify(status));
    assert.equal(status.data.credentials.password, 'test-pass');
    deliveredOrders.push(status.data);
  }
  assert.deepEqual(deliveredOrders.slice(0, 4).map((order) => order.sharedSlot), [1, 2, 3, 4]);
  assert.equal(deliveredOrders[4].sharedSlot, 1);
  assert.notEqual(deliveredOrders[4].sharedAccountStatus, 'sold');

  const accountState = (await database.query(
    'SELECT slots_filled,status FROM commerce_shared_accounts ORDER BY created_at,id',
  )).rows;
  assert.deepEqual(accountState.map((row) => [Number(row.slots_filled), row.status]), [[4, 'sold'], [1, 'active']]);

  const pending = await request('create', { productId: 'p093-shared' });
  assert.equal(pending.code, 200, JSON.stringify(pending));
  assert.equal((await request('cancel', { id: pending.data.id }, pending.data.recovery)).code, 200);
  const afterCancel = (await database.query(
    'SELECT slots_filled,status FROM commerce_shared_accounts ORDER BY created_at,id',
  )).rows;
  assert.deepEqual(afterCancel.map((row) => [Number(row.slots_filled), row.status]), [[4, 'sold'], [1, 'active']]);

  const unlocked = await request('admin-profit-unlock', { password: 'HOR' }, env.COMMERCE_ADMIN_KEY);
  assert.equal(unlocked.code, 200, JSON.stringify(unlocked));
  const snapshot = await request('admin-list', undefined, env.COMMERCE_ADMIN_KEY, '', {
    'x-profit-token': unlocked.data.token,
  });
  assert.equal(snapshot.data.metrics.cost, 1250);
  assert.equal(snapshot.data.metrics.profit, 3745);
});
