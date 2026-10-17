const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const { PrismaClient } = require(process.env.CATALOG_TEST_CLIENT || '@prisma/client');
const { hashPassword } = require('../auth/password');
const { hashSessionToken } = require('../auth/session');
const url = new URL(process.env.DATABASE_URL);
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Solo PostgreSQL local');
const schema = 'mi0_catalog_test_' + crypto.randomBytes(8).toString('hex');
const admin = new PrismaClient({ datasources: { db: { url: url.toString() } } });
url.searchParams.set('schema', schema);
process.env.DATABASE_URL = url.toString();
let db, server, base, token, userToken;
async function actor(role) {
  const user = await db.user.create({ data: { name: role, lastName: 'Test', email: role + '@test.invalid', role, passwordHash: hashPassword('test-password-1234') } });
  const token = crypto.randomBytes(32).toString('hex');
  await db.session.create({ data: { userId: user.id, tokenHash: hashSessionToken(token), expiresAt: new Date(Date.now() + 3600000) } });
  return token;
}
async function request(method, route, auth, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, data: await response.json() };
}
before(async () => {
  await admin.$executeRawUnsafe('CREATE SCHEMA "' + schema + '"');
  const result = spawnSync(process.execPath, [path.join(__dirname, '../node_modules/prisma/build/index.js'), 'migrate', 'deploy'], { cwd: path.join(__dirname, '..'), env: process.env, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  db = new PrismaClient(); globalThis.__mi0Prisma = db;
  token = await actor('SUPERADMIN'); userToken = await actor('USER');
  const app = require('../app');
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  base = 'http://127.0.0.1:' + server.address().port + '/api';
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (db) await db.$disconnect();
  await admin.$executeRawUnsafe('DROP SCHEMA IF EXISTS "' + schema + '" CASCADE');
  await admin.$disconnect();
});
test('estado de microapps: permisos, catálogo, nuevas activaciones y acceso existente', async () => {
  const modules = (await request('GET', '/admin/modules', token)).data.modules;
  const module = modules.find(item => item.code === 'mi-turno');
  const route = '/admin/modules/' + module.id + '/status';
  assert.equal((await request('PATCH', route, null, {active:false})).status, 401);
  assert.equal((await request('PATCH', route, userToken, {active:false})).status, 403);
  assert.equal((await request('PATCH', route, token, {active:'false'})).status, 400);
  assert.equal((await request('PATCH', '/admin/modules/invalid/status', token, {active:false})).status, 400);
  assert.equal((await request('PATCH', '/admin/modules/'+crypto.randomUUID()+'/status', token, {active:false})).status, 404);
  const session = await db.session.findUnique({where:{tokenHash:hashSessionToken(userToken)}});
  const createWorkspace = () => db.workspace.create({data:{name:'Test', memberships:{create:{userId:session.userId,role:'OWNER'}}}});
  const existing = await createWorkspace();
  const fresh = await createWorkspace();
  const install = id => '/workspaces/'+id+'/modules/mi-turno';
  assert.equal((await request('POST',install(existing.id),userToken)).status,201);
  assert.equal((await request('PATCH',route,token,{active:false})).status,200);
  assert(!(await request('GET','/catalog')).data.modules.some(item=>item.code==='mi-turno'));
  const workspaces = (await request('GET','/workspaces',userToken)).data.workspaces;
  assert(workspaces.find(item=>item.id===existing.id).modules.some(item=>item.code==='mi-turno'));
  assert.equal((await request('POST',install(fresh.id),userToken)).status,409);
  assert.equal((await request('POST',install(existing.id),userToken)).status,201);
  const setup = id => request('POST','/turnos/setup',userToken,{workspaceId:id,name:'Test'});
  assert.equal((await setup(fresh.id)).status,409);
  assert.equal((await setup(existing.id)).status,201);
  assert.equal((await setup(existing.id)).status,200);
  assert.equal((await request('PATCH',route,token,{active:true})).status,200);
  assert((await request('GET','/catalog')).data.modules.some(item=>item.code==='mi-turno'));
  assert.equal((await request('POST',install(fresh.id),userToken)).status,201);
  // Cita settings and raffle creation must also reject fresh direct-URL activation.
  const catalog = require('./service');
  const cita = modules.find(item=>item.code==='mi-cita');
  const raffle = modules.find(item=>item.code==='sorteos-avanzado');
  for (const item of [cita,raffle]) {
    await catalog.setModuleActive(item.id,{active:false});
    await assert.rejects(()=>catalog.requireAvailable(db,item.code,fresh.id),error=>error.status===409);
    await db.workspaceModule.create({data:{workspaceId:fresh.id,moduleId:item.id}});
    await catalog.requireAvailable(db,item.code,fresh.id);
  }
});
