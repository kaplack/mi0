const crypto = require('node:crypto');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('../auth/password');
const { hashSessionToken } = require('../auth/session');
async function isolatedDatabase(prefix = 'mi0_citas_test_') {
  const original = new URL(process.env.DATABASE_URL);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(original.hostname), 'Las pruebas de Mi Cita solo admiten PostgreSQL local');
  assert.equal(original.pathname, '/mi0');
  const schema = prefix + crypto.randomBytes(8).toString('hex');
  assert.match(schema, /^mi0_citas_(test|ui)_[a-f0-9]{16}$/);
  const admin = new PrismaClient({ datasources: { db: { url: original.toString() } } });
  const isolated = new URL(original); isolated.searchParams.set('schema', schema);
  process.env.DATABASE_URL = isolated.toString();
  await admin.$executeRawUnsafe('CREATE SCHEMA "' + schema + '"');
  const migration = spawnSync(process.execPath, [path.join(__dirname, '../node_modules/prisma/build/index.js'), 'migrate', 'deploy'], { cwd: path.join(__dirname, '..'), env: { ...process.env }, encoding: 'utf8' });
  if (migration.status !== 0) {
    await admin.$executeRawUnsafe('DROP SCHEMA IF EXISTS "' + schema + '" CASCADE'); await admin.$disconnect();
    throw new Error(migration.stdout + migration.stderr);
  }
  const db = require('../prisma');
  return { db, schema, async cleanup() { await db.$disconnect(); await admin.$executeRawUnsafe('DROP SCHEMA IF EXISTS "' + schema + '" CASCADE'); await admin.$disconnect(); } };
}
async function actor(db, label) {
  const user = await db.user.create({ data: { name: label, lastName: 'Prueba', email: label + '-' + crypto.randomBytes(5).toString('hex') + '@test.invalid', passwordHash: hashPassword('test-password-1234') } });
  const token = crypto.randomBytes(32).toString('hex');
  await db.session.create({ data: { userId: user.id, tokenHash: hashSessionToken(token), expiresAt: new Date(Date.now() + 3600000) } });
  return { ...user, token };
}
module.exports = { isolatedDatabase, actor };
