import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const checkoutSource = await readFile(
  new URL('../app/components/checkout.tsx', import.meta.url),
  'utf8',
);
const handlerSource = await readFile(
  new URL('../commerce/handler.mjs', import.meta.url),
  'utf8',
);
const schemaSource = await readFile(
  new URL('../commerce/schema.sql', import.meta.url),
  'utf8',
);

test('checkout UI includes reseller option and dynamic activation date', () => {
  // Checkbox option for resellers
  assert.match(
    checkoutSource,
    /I am reselling, do not send confirmation mail to my client/,
  );
  assert.match(checkoutSource, /isReselling/);

  // Dynamic activation date & Workspace Activated on 5Oct
  assert.match(checkoutSource, /Workspace Activated on : 5Oct/);
  assert.match(checkoutSource, /Your Activation Date:/);
  assert.match(checkoutSource, /getTodayFormatted\(\)/);
  assert.match(checkoutSource, /getOrderActivationDate\(order\.createdAt\)/);

  // Client confirmation email suppressed notice for reseller orders
  assert.match(
    checkoutSource,
    /Confirmation email to client will not be sent/,
  );
});

test('handler suppresses confirmation email when is_reselling is true', () => {
  // Check !isResellerOrder before sending email to client
  assert.match(handlerSource, /const isResellerOrder = Boolean\(order\.is_reselling\)/);
  assert.match(handlerSource, /if \(order\.customer_email && !isResellerOrder\)/);

  // Dynamic activation date and workspace date in handler email and telegram
  assert.match(handlerSource, /Workspace Activated on : 5Oct/);
  assert.match(handlerSource, /Your Activation Date: \$\{activationDate\}/);

  // Handler persists is_reselling flag on order create
  assert.match(handlerSource, /const isReselling = Boolean\(body\.isReselling || body\.suppressClientEmail\)/);
  assert.match(handlerSource, /UPDATE commerce_orders SET is_reselling=true WHERE id=\$1/);
});

test('schema includes is_reselling column in commerce_orders', () => {
  assert.match(
    schemaSource,
    /ALTER TABLE commerce_orders ADD COLUMN IF NOT EXISTS is_reselling boolean NOT NULL DEFAULT false/,
  );
});
