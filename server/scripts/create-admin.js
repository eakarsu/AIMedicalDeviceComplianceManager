'use strict';

const bcrypt = require('bcryptjs');
const pool = require('../db');

async function main(env = process.env, database = pool) {
  if (env.BOOTSTRAP_ACKNOWLEDGEMENT !== 'create-initial-admin') {
    throw new Error('BOOTSTRAP_ACKNOWLEDGEMENT=create-initial-admin is required');
  }
  const email = String(env.PROVISION_ADMIN_EMAIL || env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(env.PROVISION_ADMIN_PASSWORD || env.ADMIN_PASSWORD || '');
  const name = String(env.PROVISION_ADMIN_NAME || env.BOOTSTRAP_ADMIN_NAME || 'Compliance Administrator').trim();
  if (!email.includes('@') || password.length < 12 || !name) {
    throw new Error('A valid email, 12-character password, and name are required');
  }
  await database.query(
    `INSERT INTO users(email,password,name,role)
     VALUES($1,$2,$3,'admin')
     ON CONFLICT(email) DO UPDATE SET
       password=EXCLUDED.password,
       name=EXCLUDED.name,
       role='admin',
       updated_at=NOW()`,
    [email, await bcrypt.hash(password, 12), name],
  );
  console.log(`Provisioned compliance administrator ${email}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  }).finally(() => pool.end());
}

module.exports = { main };
