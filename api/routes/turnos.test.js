const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('../auth/password');
const { hashSessionToken } = require('../auth/session');

const originalUrl = new URL(process.env.DATABASE_URL);
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(originalUrl.hostname), 'Estas pruebas solo admiten PostgreSQL local');
assert.equal(originalUrl.pathname, '/mi0');
const schema = 'mi0_turnos_test_' + crypto.randomBytes(8).toString('hex');
assert.match(schema, /^mi0_turnos_test_[a-f0-9]{16}$/);
const admin = new PrismaClient({ datasources: { db: { url: originalUrl.toString() } } });
const isolatedUrl = new URL(originalUrl);
isolatedUrl.searchParams.set('schema', schema);
process.env.DATABASE_URL = isolatedUrl.toString();
let db, server, base, owner, member, outsider;
async function actor(label) {
  const user = await db.user.create({ data: { name: label, lastName: 'Prueba', email: label + '@test.invalid', passwordHash: hashPassword('test-password-1234') } });
  const token = crypto.randomBytes(32).toString('hex');
  await db.session.create({ data: { userId: user.id, tokenHash: hashSessionToken(token), expiresAt: new Date(Date.now() + 3600000) } });
  return { ...user, token };
}
async function request(method, route, actor, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(actor ? { Authorization: 'Bearer ' + actor.token } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, data: await response.json() };
}
async function fixture(documentMode = 'NONE') {
  const workspace = await db.workspace.create({ data: { name: 'Negocio de prueba', type: 'ORGANIZATION',
    memberships: { create: [{ userId: owner.id, role: 'OWNER' }, { userId: member.id, role: 'MEMBER' }] } } });
  const setup = await request('POST', '/setup', owner, { workspaceId: workspace.id, name: 'Atención', documentMode, counterNames: ['Ventanilla 1', 'Entrega'] });
  assert.equal(setup.status, 201, JSON.stringify(setup.data));
  await db.turnOperator.create({ data: { queueId: setup.data.queue.id, userId: member.id, counter: 1 } });
  return { workspace, queue: setup.data.queue, route: '/workspace/' + workspace.id };
}
async function join(queue, body = {}) {
  return request('POST', '/public/' + queue.code + '/join', null, { name: 'Cliente', key: crypto.randomUUID(), ...body });
}
before(async () => {
  await admin.$executeRawUnsafe('CREATE SCHEMA "' + schema + '"');
  const migrated = spawnSync(process.execPath, [path.join(__dirname, '../node_modules/prisma/build/index.js'), 'migrate', 'deploy'],
    { cwd: path.join(__dirname, '..'), env: { ...process.env }, encoding: 'utf8' });
  assert.equal(migrated.status, 0, migrated.stderr || migrated.stdout);
  db = require('../prisma');
  owner = await actor('owner'); member = await actor('member'); outsider = await actor('outsider');
  const app = require('../app');
  server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  base = 'http://127.0.0.1:' + server.address().port + '/api/turnos';
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (db) await db.$disconnect();
  await admin.$executeRawUnsafe('DROP SCHEMA IF EXISTS "' + schema + '" CASCADE');
  await admin.$disconnect();
});

test('configuration permissions, workspace isolation and inactive businesses', async () => {
  const { workspace, queue, route } = await fixture();
  const config = { name: 'Oficina', documentMode: 'NONE', counterNames: ['Recepción'] };
  assert.equal((await request('GET', route)).status, 401);
  assert.equal((await request('GET', route, outsider)).status, 403);
  assert.equal((await request('PATCH', route + '/settings', member, config)).status, 403);
  assert.equal((await request('POST', '/setup', member, { workspaceId: workspace.id, ...config })).status, 403);
  assert.equal((await request('PATCH', route + '/settings', owner, { ...config, counterNames: ['Repetida', 'repetida'] })).status, 400);
  assert.equal((await request('PATCH', route + '/settings', owner, config)).status, 200);
  await db.workspace.update({ where: { id: workspace.id }, data: { status: 'INACTIVE' } });
  assert.equal((await join(queue)).status, 404);
  assert.equal((await request('GET', route, owner)).status, 403);
});
test('name always required, document policy enforced server-side and identity never public', async () => {
  const { queue, route } = await fixture('REQUIRED');
  assert.equal((await join(queue, { name: ' ' })).status, 400);
  assert.equal((await join(queue)).status, 400);
  assert.equal((await join(queue, { documentType: 'DNI', documentNumber: '123' })).status, 400);
  const key = crypto.randomUUID();
  const first = await join(queue, { key, name: 'Ana', documentType: 'DNI', documentNumber: '12345678' });
  assert.equal(first.status, 201);
  const ce = await join(queue, { documentType: 'CE', documentNumber: 'CE1234567' });
  assert.equal(ce.status, 201);
  const privateData = await request('GET', route, owner);
  assert.equal(privateData.data.tickets[0].documentNumber, '12345678');
  await request('POST', route + '/next', member, { counter: 1 });
  const publicData = await request('GET', '/public/' + queue.code);
  assert.equal(publicData.status, 200);
  assert.equal(publicData.data.called.length, 1);
  for (const data of [first.data, publicData.data, (await request('GET', '/public/' + queue.code + '/mine?key=' + key)).data]) {
    assert.ok(!JSON.stringify(data).includes('12345678'));
    assert.ok(!JSON.stringify(data).includes('"clientKey"'));
    assert.ok(!JSON.stringify(data).includes('"name":"Ana"'));
  }
  assert.equal((await request('PATCH', route + '/settings', owner, { name: 'Atención', counterNames: queue.counterNames, documentMode: 'OPTIONAL' })).status, 400);
  assert.equal((await join(queue)).status, 400);
  assert.equal((await join(queue, { documentType: 'DNI', documentNumber: 'bad' })).status, 400);
  await request('PATCH', route + '/settings', owner, { name: 'Atención', counterNames: queue.counterNames, documentMode: 'NONE' });
  const ignored = await join(queue, { documentType: 'DNI', documentNumber: '87654321' });
  const stored = await db.turnTicket.findFirst({ where: { queueId: queue.id, number: ignored.data.ticket.number } });
  assert.equal(stored.documentNumber, null);
});
test('concurrent joins and calls, configured windows and explicit completion of the last ticket', async () => {
  const { queue, route } = await fixture();
  const key = crypto.randomUUID();
  const duplicates = await Promise.all([join(queue, { key }), join(queue, { key })]);
  assert.equal(duplicates[0].data.ticket.number, duplicates[1].data.ticket.number);
  await join(queue);
  assert.equal((await request('POST', route + '/next', member, { counter: 3 })).status, 400);
  const called = await Promise.all([request('POST', route + '/next', member, { counter: 1 }), request('POST', route + '/next', owner, { counter: 2 })]);
  called.forEach(result => assert.equal(result.status, 200));
  assert.notEqual(called[0].data.ticket.number, called[1].data.ticket.number);
  assert.equal((await request('POST', route + '/next', member, { counter: 1 })).status, 409);
  assert.equal((await request('PATCH', route + '/settings', owner, { name: 'Atención', documentMode: 'NONE', counterNames: ['Una'] })).status, 409);
  const current = called[0].data.ticket;
  assert.equal((await request('POST', route + '/finish', member, { ticketId: current.id, action: 'SERVED' })).status, 200);
  assert.equal((await request('POST', route + '/finish', member, { ticketId: current.id, action: 'SERVED' })).status, 409);
  assert.equal((await request('POST', route + '/finish', owner, { ticketId: called[1].data.ticket.id, action: 'ABSENT' })).status, 200);
  const after = await request('GET', route, owner);
  assert.equal(after.data.tickets.length, 0);
  assert.equal((await request('POST', route + '/next', member, { counter: 1 })).data.ticket, null);
});
test('manual closure expires previous tickets and permits a new ticket from the same browser', async () => {
  const { queue, route } = await fixture();
  const key = crypto.randomUUID();
  const first = await join(queue, { key });
  await join(queue);
  await request('POST', route + '/next', member, { counter: 1 });
  assert.equal((await request('POST', route + '/close', member)).status, 403);
  assert.equal((await request('POST', route + '/close', outsider)).status, 403);
  const closed = await request('POST', route + '/close', owner);
  assert.equal(closed.data.expired, 2);
  const mine = await request('GET', '/public/' + queue.code + '/mine?key=' + key);
  assert.equal(mine.data.ticket, null);
  assert.equal(mine.data.expired, true);
  assert.equal((await request('POST', route + '/close', owner)).data.expired, 0);
  const second = await join(queue, { key });
  assert.equal(second.status, 201);
  assert.ok(second.data.ticket.number > first.data.ticket.number);
  assert.equal((await request('GET', '/public/' + queue.code + '/mine?key=' + key)).data.ticket.number, second.data.ticket.number);
});

test('operator invitations handle registered and new accounts and reject other windows', async () => {
  const { workspace, queue, route } = await fixture();
  // Existing member: direct assignment; new/non-member accounts must accept the link.
  const direct = await request('POST', route + '/operators', owner, { email: member.email, counter: 1 });
  assert.equal(direct.status, 201, JSON.stringify(direct.data));
  assert.equal(direct.data.kind, 'ASSIGNED');
  assert.equal((await request('GET', route + '/operators', member)).status, 403);
  assert.equal((await request('POST', route + '/operators', member, { email: outsider.email, counter: 1 })).status, 403);
  const invited = await request('POST', route + '/operators', owner, { email: outsider.email.toUpperCase(), counter: 2 });
  assert.equal(invited.status, 201, JSON.stringify(invited.data));
  assert.equal(invited.data.kind, 'INVITED');
  assert.equal((await request('POST', route + '/operators', owner, { email: 'duplicate@test.invalid', counter: 1 })).status, 409);
  assert.equal((await request('POST', route + '/operators', owner, { email: 'reserved@test.invalid', counter: 2 })).status, 409);
  const inviteRoute = '/invitations/' + invited.data.token;
  assert.equal((await request('GET', inviteRoute)).status, 200);
  assert.equal((await request('POST', inviteRoute + '/accept', member)).status, 403);
  assert.equal((await request('POST', inviteRoute + '/accept', outsider)).status, 200);
  assert.equal((await request('POST', inviteRoute + '/accept', outsider)).status, 410);
  const membership = await db.membership.findUnique({ where: { userId_workspaceId: { userId: outsider.id, workspaceId: workspace.id } } });
  assert.equal(membership.role, 'MEMBER');
  await join(queue); await join(queue);
  assert.equal((await request('POST', route + '/next', member, { counter: 2 })).status, 403);
  const first = await request('POST', route + '/next', member, { counter: 1 });
  assert.equal(first.status, 200);
  assert.equal(first.data.ticket.calledById, member.id);
  const second = await request('POST', route + '/next', outsider, { counter: 2 });
  assert.equal(second.status, 200);
  assert.equal((await request('POST', route + '/finish', member, { ticketId: second.data.ticket.id, action: 'SERVED' })).status, 403);
  assert.equal((await request('POST', route + '/finish', member, { ticketId: second.data.ticket.id, action: 'ABSENT' })).status, 403);
  assert.equal((await request('POST', route + '/operators', owner, { email: member.email, counter: 2 })).status, 409);
  assert.equal((await request('DELETE', route + '/operators/' + member.id, owner)).status, 409);
  await request('POST', route + '/finish', member, { ticketId: first.data.ticket.id, action: 'SERVED' });
  assert.equal((await request('DELETE', route + '/operators/' + member.id, owner)).status, 200);
  assert.equal((await request('POST', route + '/next', member, { counter: 1 })).status, 403);
  const unassigned = await request('GET', route, member);
  assert.equal(unassigned.data.assignedCounter, null);
  assert.equal(unassigned.data.tickets.length, 0);

  const email = 'new-operator@test.invalid';
  const pending = await request('POST', route + '/operators', owner, { email, counter: 1 });
  assert.equal(pending.data.kind, 'INVITED');
  assert.equal(await db.user.findUnique({ where: { email } }), null);
  const registered = await fetch(base.replace('/api/turnos', '/api/auth/register'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Nuevo', lastName: 'Operador', email, password: 'test-password-1234' }),
  });
  assert.equal(registered.status, 201);
  const newActor = await registered.json();
  const newInvite = '/invitations/' + pending.data.token;
  assert.equal((await request('POST', newInvite + '/accept', newActor)).status, 200);
  const assignment = await request('GET', route, newActor);
  assert.equal(assignment.data.assignedCounter, 1);
  assert.equal(assignment.data.canChooseCounter, false);
  assert.ok(assignment.data.tickets.every(ticket => !ticket.documentNumber));
  const listing = await request('GET', route + '/operators', owner);
  assert.ok(!JSON.stringify(listing.data).includes('tokenHash'));
  assert.ok(!JSON.stringify(listing.data).includes(pending.data.token));
  await request('DELETE', route + '/operators/' + newActor.user.id, owner);
  const revoked = await request('POST', route + '/operators', owner, { email: 'cancelled@test.invalid', counter: 1 });
  const cancelled = await db.turnInvitation.findUnique({ where: { queueId_email: { queueId: queue.id, email: 'cancelled@test.invalid' } } });
  await request('DELETE', route + '/invitations/' + cancelled.id, owner);
  assert.equal((await request('GET', '/invitations/' + revoked.data.token)).status, 410);
});
