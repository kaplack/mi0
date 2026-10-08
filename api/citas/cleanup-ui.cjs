const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const { PrismaClient } = require('@prisma/client');
const url = new URL(process.env.DATABASE_URL);
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)); assert.equal(url.pathname, '/mi0');
const fixturePath = path.join(__dirname, '../../web/.cita-fixture.json');
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
async function main() {
  if (!fs.existsSync(fixturePath)) return;
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  assert.match(fixture.schema, /^mi0_citas_ui_[a-f0-9]{16}$/);
  await db.$executeRawUnsafe('DROP SCHEMA IF EXISTS "' + fixture.schema + '" CASCADE');
  fs.unlinkSync(fixturePath);
}
main().catch(error => { console.error(error.code || error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
