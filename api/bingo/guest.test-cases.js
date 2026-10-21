const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const s = require('./service');
const g = require('./guest');
const retention = require('./retention');
const secret = () => crypto.randomBytes(32).toString('hex');
module.exports = async function guestCases(t, db, owner, other, workspace, base) {
  let code, adminToken = secret(), first, recoveryToken, newAdminToken;
  await t.test('crear sin cuenta y una sala por identidad, incluso solicitudes concurrentes', async () => {
    const response = await fetch(base + '/api/bingo/guest/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminToken, name: 'Bingo libre' }) });
    assert.equal(response.status, 201);
    code = (await response.json()).room.code;
    const result = await Promise.all([g.create({ adminToken, name: 'Otra' }), g.create({ adminToken, name: 'Otra' })]);
    assert.ok(result.every(r => r.room.code === code));
    assert.equal(await db.bingoGuest.count(), 1);
    assert.equal((await g.current({ adminToken })).room.code, code);
    const data = await db.bingoRoom.findUnique({ where: { code } });
    assert.equal(data.ownerId, null); assert.equal(data.workspaceId, null);
    assert.equal(JSON.stringify(data).includes(adminToken), false);
  });
  await t.test('administración protegida, polling no renueva actividad y respuestas públicas sin secretos', async () => {
    const before = await db.bingoRoom.findUnique({ where: { code } });
    await assert.rejects(() => s.manage({}, code, 'info'), { status: 401 });
    await assert.rejects(() => s.manage({ adminToken: secret() }, code, 'info'), { status: 403 });
    const info = await s.manage({ adminToken }, code, 'info');
    const after = await db.bingoRoom.findUnique({ where: { code } });
    assert.equal(+before.lastAdminAt, +after.lastAdminAt);
    assert.equal(info.room.participantLimit, 30);
    assert.equal(Object.hasOwn((await s.state(code)).room, 'expiresAt'), false);
  });
  const tokens = [];
  await t.test('25 jugadores y 38 bolillas se recuperan desde un proceso nuevo del backend', async () => {
    for (let i = 0; i < 25; i++) { const token = secret(); tokens.push(token); const joined = await s.join(code, { token, name: 'Jugador ' + i }); if (i === 0) first = joined.participant; }
    const started = await s.manage({ adminToken }, code, 'start', { pattern: 'FULL', prize: 'Pizza' });
    const roundId = started.room.rounds[0].id;
    for (let i = 0; i < 38; i++) await s.manage({ adminToken }, code, 'draw', { roundId, expectedCount: i });
    const before = await s.state(code, tokens[0]);
    await db.$disconnect();
    const restarted = spawnSync(process.execPath, ['-e', "const input=JSON.parse(require('fs').readFileSync(0,'utf8'));require('./bingo/service').state(input.code,input.token).then(value=>process.stdout.write(JSON.stringify(value))).catch(()=>{process.exitCode=1}).finally(()=>require('./prisma').$disconnect())"], { cwd: path.join(__dirname, '..'), env: { ...process.env }, input: JSON.stringify({ code, token: tokens[0] }), encoding: 'utf8', timeout: 15000 });
    assert.equal(restarted.status, 0, restarted.stderr);
    const recovered = JSON.parse(restarted.stdout);
    assert.equal(recovered.room.participantCount, 25); assert.equal(recovered.room.rounds[0].balls.length, 38);
    assert.deepEqual(recovered.room.rounds[0].balls, before.room.rounds[0].balls);
    assert.equal(recovered.room.rounds[0].pattern, 'FULL'); assert.equal(recovered.room.status, 'PLAYING');
    assert.deepEqual(recovered.participant, first);
    assert.deepEqual((await s.state(code, tokens[0])).participant, first);
  });
  await t.test('enlace independiente, regeneración, revocación y recuperación de un solo uso', async () => {
    const revoked = secret(); await g.recovery(code, { adminToken, recoveryToken: revoked });
    recoveryToken = secret(); await g.recovery(code, { adminToken, recoveryToken });
    await assert.rejects(() => g.recover({ code, recoveryToken: revoked, newAdminToken: secret() }), { status: 403 });
    await g.recovery(code, { adminToken, recoveryToken: null });
    await assert.rejects(() => g.recover({ code, recoveryToken, newAdminToken: secret() }), { status: 403 });
    // Revocation does not revoke the current administrator.
    await s.manage({ adminToken }, code, 'info');
    await g.recovery(code, { adminToken, recoveryToken });
    newAdminToken = secret();
    assert.equal((await g.recover({ code, recoveryToken, newAdminToken })).room.code, code);
    await assert.rejects(() => s.manage({ adminToken }, code, 'info'), { status: 403 });
    assert.equal((await g.recover({ code, recoveryToken, newAdminToken })).room.code, code); // Lost response retry.
    await assert.rejects(() => g.recover({ code, recoveryToken, newAdminToken: secret() }), { status: 403 });
    adminToken = newAdminToken;
  });
  await t.test('capacidad anónima exacta y altas concurrentes; recuperar lleno no duplica', async () => {
    await s.manage({ adminToken }, code, 'close');
    for (let i = 25; i < 29; i++) await s.join(code, { token: secret(), name: 'Extra ' + i });
    const attempts = await Promise.allSettled([s.join(code, { token: secret(), name: 'Último' }), s.join(code, { token: secret(), name: 'Exceso' })]);
    assert.equal(attempts.filter(a => a.status === 'fulfilled').length, 1);
    await assert.rejects(() => s.join(code, { token: secret(), name: '31' }), { status: 409 });
    assert.deepEqual((await s.join(code, { token: tokens[0], name: 'Actualizado' })).participant, first);
    assert.equal((await s.state(code)).room.participantCount, 30);
  });
  let registered;
  await t.test('registrado admite 50 y rechaza 51, una sala por cuenta', async () => {
    registered = (await s.create(owner.id, { workspaceId: workspace.id, name: 'Cuenta' })).room;
    for (let i = 0; i < 49; i++) await s.join(registered.code, { token: secret(), name: 'Cuenta ' + i });
    const attempts = await Promise.allSettled([s.join(registered.code, { token: secret(), name: '50' }), s.join(registered.code, { token: secret(), name: '51' })]);
    assert.equal(attempts.filter(a => a.status === 'fulfilled').length, 1);
    assert.equal((await s.state(registered.code)).room.participantCount, 50);
    await assert.rejects(() => s.create(owner.id, { workspaceId: workspace.id, name: 'Exceso' }), { status: 409 });
  });
  await t.test('transferencia atómica/idempotente con conflicto, aislamiento y conservación de datos', async () => {
    const snapshot = await s.state(code, tokens[0]);
    await assert.rejects(() => g.attach(owner.id, code, { adminToken, workspaceId: workspace.id }), { status: 409 });
    assert.equal((await s.state(code)).room.mode, 'ANONYMOUS');
    await assert.rejects(() => g.attach(other.id, code, { adminToken, workspaceId: workspace.id }), { status: 403 });
    await s.manage(owner.id, registered.code, 'finish');
    await g.recovery(code, { adminToken, recoveryToken });
    const results = await Promise.all([g.attach(owner.id, code, { adminToken, workspaceId: workspace.id }), g.attach(owner.id, code, { adminToken, workspaceId: workspace.id })]);
    assert.ok(results.every(result => result.room.code === code && result.room.participantLimit === 50));
    const after = await s.state(code, tokens[0]);
    assert.deepEqual(after.participant, snapshot.participant); assert.deepEqual(after.room.rounds, snapshot.room.rounds);
    assert.equal(after.room.participantCount, 30);
    await assert.rejects(() => s.manage({ adminToken }, code, 'info'), { status: 403 });
    await assert.rejects(() => g.recover({ code, recoveryToken, newAdminToken: secret() }), { status: 403 });
    await s.join(code, { token: secret(), name: 'Cartón adicional' });
    assert.equal((await s.manage(owner.id, code, 'info')).room.participantCount, 31);
    assert.equal((await db.bingoRoom.findUnique({ where: { code } })).expiresAt, null);
  });
  await t.test('caducidad: no afecta ronda vigente ni registrados; limpieza idempotente solo de vencidos', async () => {
    const now = new Date(), token = secret();
    const waiting = (await g.create({ adminToken: token, name: 'Caduca' })).room;
    await db.bingoRoom.update({ where: { code: waiting.code }, data: { expiresAt: new Date(+now - 8 * retention.DAY) } });
    const live = (await g.create({ adminToken: secret(), name: 'Sigue jugando' })).room;
    await s.join(live.code, { token: secret(), name: 'Ana' });
    const liveGuest = await db.bingoRoom.findUnique({ where: { code: live.code }, include: { guest: true } });
    await db.bingoRoom.update({ where: { code: live.code }, data: { status: 'PLAYING', lastAdminAt: new Date(+now - 2 * retention.DAY), expiresAt: new Date(+now + 5 * retention.DAY) } });
    const abandoned = (await g.create({ adminToken: secret(), name: 'Abandonada' })).room;
    await db.bingoRound.create({ data: { roomId: abandoned.id, number: 1, pattern: 'ONE' } });
    await db.bingoRoom.update({ where: { code: abandoned.code }, data: { status: 'PLAYING', expiresAt: new Date(+now - 1) } });
    await retention.sweep(now); await retention.sweep(now);
    assert.equal(await db.bingoRoom.findUnique({ where: { code: waiting.code } }), null);
    assert.equal((await db.bingoRoom.findUnique({ where: { code: live.code } })).status, 'PLAYING');
    const ended = await db.bingoRoom.findUnique({ where: { code: abandoned.code }, include: { rounds: true } });
    assert.equal(ended.status, 'FINISHED'); assert.equal(ended.rounds[0].status, 'CANCELLED');
    await assert.rejects(() => s.state(abandoned.code), { status: 410 });
    assert.equal((await s.state(code)).room.mode, 'REGISTERED');
    assert.ok(liveGuest.guest.adminHash);
  });
};
