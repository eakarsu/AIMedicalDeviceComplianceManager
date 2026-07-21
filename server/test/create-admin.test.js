'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { main } = require('../scripts/create-admin');

test('admin provisioning requires explicit acknowledgement', async () => {
  await assert.rejects(() => main({}, { query: assert.fail }), /acknowledgement/i);
});

test('admin provisioning upserts the reviewed runtime identity', async () => {
  const calls = [];
  await main({
    BOOTSTRAP_ACKNOWLEDGEMENT: 'create-initial-admin',
    PROVISION_ADMIN_EMAIL: ' Admin@Example.test ',
    PROVISION_ADMIN_PASSWORD: 'A-valid-password-123!',
    PROVISION_ADMIN_NAME: 'Compliance Admin',
  }, { query: async (...args) => { calls.push(args); } });
  assert.equal(calls.length, 1);
  assert.match(calls[0][0], /ON CONFLICT\(email\) DO UPDATE/);
  assert.equal(calls[0][1][0], 'admin@example.test');
  assert.equal(calls[0][1][2], 'Compliance Admin');
  assert.match(calls[0][1][1], /^\$2[aby]\$/);
});
