const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('../auth/password');
const { hashSessionToken } = require('../auth/session');
const originalUrl = new URL(process.env.DATABASE_URL);
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(originalUrl.hostname), 'Las pruebas requieren PostgreSQL local');
assert.equal(originalUrl.pathname, '/mi0', 'Las pruebas requieren la base mi0 local');
const testSchema = 'mi0_raffles_test_' + crypto.randomBytes(8).toString('hex');
assert.match(testSchema, /^mi0_raffles_test_[a-f0-9]{16}$/);
const admin = new PrismaClient({ datasources: { db: { url: originalUrl.toString() } } });
const isolatedUrl = new URL(originalUrl);
isolatedUrl.searchParams.set('schema', testSchema);
process.env.DATABASE_URL = isolatedUrl.toString();
process.env.YAPE_PHONE = '900000000';
process.env.YAPE_NAME = 'Beneficiario de prueba';
let db, server, base, workspace, owner, member, outsider, superadmin;
async function actor(label, role = 'USER') {
  const user = await db.user.create({ data: { name: label, lastName: 'Prueba', email: label + '@test.invalid', passwordHash: hashPassword('test-password-1234'), role } });
  const token = crypto.randomBytes(32).toString('hex');
  await db.session.create({ data: { userId: user.id, tokenHash: hashSessionToken(token), expiresAt: new Date(Date.now() + 3600000) } });
  return { ...user, token };
}
async function request(method, route, user, body) {
  const response = await fetch(base + route, { method,
    headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: 'Bearer ' + user.token } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, data: await response.json() };
}
const payload = () => ({ workspaceId: workspace.id, name: 'Aniversario', participants: ['Ana Pérez', 'Carlos Ruiz', 'Lucía Díaz', 'Diego Soto'], prizes: ['Pizza familiar', 'Bebida'] });
async function create() {
  const result = await request('POST', '/api/raffles', owner, payload());
  assert.equal(result.status, 201, JSON.stringify(result.data));
  return result.data.raffle;
}
before(async () => {
  await admin.$executeRawUnsafe('CREATE SCHEMA "' + testSchema + '"');
  const migrate = spawnSync(process.execPath, [path.join(__dirname, '../node_modules/prisma/build/index.js'), 'migrate', 'deploy', '--schema', path.join(__dirname, '../prisma/schema.prisma')],
    { cwd: path.join(__dirname, '..'), env: { ...process.env }, encoding: 'utf8' });
  assert.equal(migrate.status, 0, migrate.stderr || migrate.stdout);
  db = require('../prisma');
  owner = await actor('owner'); member = await actor('member'); outsider = await actor('outsider'); superadmin = await actor('superadmin', 'SUPERADMIN');
  workspace = await db.workspace.create({ data: { name: 'Espacio de prueba', type: 'PERSONAL', memberships: { create: [
    { userId: owner.id, role: 'OWNER' }, { userId: member.id, role: 'MEMBER' },
  ] } } });
  const app = require('../app');
  server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (db) await db.$disconnect();
  await admin.$executeRawUnsafe('DROP SCHEMA IF EXISTS "' + testSchema + '" CASCADE');
  await admin.$disconnect();
});
test('acceso autenticado y aislamiento de espacios y roles', async () => {
  assert.equal((await request('GET', '/api/raffles?workspaceId=' + workspace.id)).status, 401);
  assert.equal((await request('POST', '/api/raffles', outsider, payload())).status, 404);
  assert.equal((await request('POST', '/api/raffles', member, payload())).status, 403);
  const raffle = await create();
  assert.equal((await request('GET', '/api/raffles/' + raffle.id, outsider)).status, 404);
  assert.equal((await request('GET', '/api/raffles/' + raffle.id, member)).status, 200);
  assert.equal((await request('POST', '/api/raffles/' + raffle.id + '/draw', member)).status, 403);
  assert.equal((await request('POST', '/api/workspaces/' + workspace.id + '/modules/sorteos-avanzado', member)).status, 403);
  assert.equal((await request('POST', '/api/workspaces/' + workspace.id + '/modules/sorteos-avanzado', owner)).status, 201);
  await db.workspace.update({ where: { id: workspace.id }, data: { status: 'INACTIVE' } });
  try {
    assert.equal((await request('POST', '/api/raffles/' + raffle.id + '/draw', owner)).status, 404);
    assert.equal((await request('POST', '/api/workspaces/' + workspace.id + '/modules/sorteos-avanzado', owner)).status, 404);
  } finally { await db.workspace.update({ where: { id: workspace.id }, data: { status: 'ACTIVE' } }); }
});
test('valida duplicados, cantidad de premios e identificadores', async () => {
  assert.equal((await request('POST', '/api/raffles', owner, null)).status, 400);
  assert.equal((await request('POST', '/api/raffles', owner, { ...payload(), participants: ['Ana', ' ana '] })).status, 400);
  assert.equal((await request('POST', '/api/raffles', owner, { ...payload(), participants: ['Ana', 'Luis'], prizes: ['Uno', 'Dos', 'Tres'] })).status, 400);
  assert.equal((await request('GET', '/api/raffles/no-uuid', owner)).status, 400);
});
test('editar borrador y sortear concurrentemente conserva ganadores únicos e inmutables', async () => {
  const raffle = await create();
  const edited = await request('PUT', '/api/raffles/' + raffle.id, owner, { ...payload(), name: 'Editado' });
  assert.equal(edited.status, 200);
  const draws = await Promise.all([request('POST', '/api/raffles/' + raffle.id + '/draw', owner), request('POST', '/api/raffles/' + raffle.id + '/draw', owner)]);
  draws.forEach(result => assert.equal(result.status, 200, JSON.stringify(result.data)));
  assert.deepEqual(draws[0].data.raffle.results, draws[1].data.raffle.results);
  assert.equal(new Set(draws[0].data.raffle.results.map(result => result.participant.id)).size, 2);
  assert.equal(await db.raffleResult.count({ where: { raffleId: raffle.id } }), 2);
  assert.equal((await request('PUT', '/api/raffles/' + raffle.id, owner, payload())).status, 409);
  const saved = await request('GET', '/api/raffles/' + raffle.id, owner);
  assert.deepEqual(saved.data.raffle.results, draws[0].data.raffle.results);
});
test('pago manual: rechazo, nueva solicitud, aprobación concurrente y contrato público seguro', async () => {
  const raffle = await create();
  assert.equal((await request('POST', '/api/raffles/' + raffle.id + '/publication', owner, { reference: 'REF100' })).status, 409);
  const drawn = await request('POST', '/api/raffles/' + raffle.id + '/draw', owner);
  process.env.YAPE_PHONE = '';
  assert.equal((await request('POST', '/api/raffles/' + raffle.id + '/publication', owner, { reference: 'REF100' })).status, 503);
  process.env.YAPE_PHONE = '900000000';
  const requested = await request('POST', '/api/raffles/' + raffle.id + '/publication', owner, { reference: 'REF100', amountCents: 1 });
  assert.equal(requested.status, 201);
  assert.equal(requested.data.raffle.publication.amountCents, 490);
  assert.equal(requested.data.raffle.publicCode, null);
  const repeated = await request('POST', '/api/raffles/' + raffle.id + '/publication', owner, { reference: 'REF100' });
  assert.equal(repeated.data.raffle.publication.id, requested.data.raffle.publication.id);
  assert.equal((await request('GET', '/api/raffles/publications/pending', owner)).status, 403);
  const publicationId = requested.data.raffle.publication.id;
  assert.equal((await request('POST', '/api/raffles/publications/' + publicationId + '/review', owner, { action: 'approve' })).status, 403);
  assert.equal((await request('POST', '/api/raffles/publications/' + publicationId + '/review', superadmin, { action: 'reject', reason: 'No se encontró el depósito' })).status, 200);
  assert.equal((await request('POST', '/api/raffles/' + raffle.id + '/publication', owner, { reference: 'REF100' })).status, 409);
  const resubmitted = await request('POST', '/api/raffles/' + raffle.id + '/publication', owner, { reference: 'REF101' });
  assert.equal(resubmitted.status, 201);
  const reviewUrl = '/api/raffles/publications/' + resubmitted.data.raffle.publication.id + '/review';
  const approvals = await Promise.all([request('POST', reviewUrl, superadmin, { action: 'approve' }), request('POST', reviewUrl, superadmin, { action: 'approve' })]);
  assert.deepEqual(approvals.map(item => item.status).sort(), [200, 409]);
  const published = (await request('GET', '/api/raffles/' + raffle.id, owner)).data.raffle;
  assert.deepEqual(published.results, drawn.data.raffle.results);
  const publicResponse = await request('GET', '/api/raffles/public/' + published.publicCode);
  assert.equal(publicResponse.status, 200);
  assert.deepEqual(Object.keys(publicResponse.data.raffle).sort(), ['drawnAt', 'name', 'participantCount', 'results']);
  assert.equal(publicResponse.data.raffle.participantCount, 4);
  assert.deepEqual(Object.keys(publicResponse.data.raffle.results[0]).sort(), ['prize', 'winner']);
  assert.equal((await request('POST', '/api/raffles/' + raffle.id + '/publication', owner, { reference: 'REF102' })).status, 409);
  assert.equal((await request('GET', '/api/raffles/public/' + '0'.repeat(32))).status, 404);
});
test('referencia de pago no se puede reutilizar en otro sorteo', async () => {
  const raffle = await create();
  await request('POST', '/api/raffles/' + raffle.id + '/draw', owner);
  assert.equal((await request('POST', '/api/raffles/' + raffle.id + '/publication', owner, { reference: 'REF101' })).status, 409);
});
test('base de datos rechaza un ganador de otro sorteo', async () => {
  const first = await create(); const second = await create();
  await assert.rejects(db.raffleResult.create({ data: { raffleId: first.id, prizeId: first.prizes[0].id, participantId: second.participants[0].id, drawnAt: new Date() } }), error => error.code === 'P2003');
});
