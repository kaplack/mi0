const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { isolatedDatabase, actor } = require('../citas/test-helpers');
test('Bingo: regresión de v1 y permisos, recuperación y conversión de v1.1', async t => {
  const isolated = await isolatedDatabase();
  const db = isolated.db;
  let server;
  try {
    const owner = await actor(db, 'bingo-owner'), other = await actor(db, 'bingo-other');
    const w = await db.workspace.create({ data: { name: 'Bingo prueba', memberships: { create: { userId: owner.id, role: 'OWNER' } } } });
    const s = require('./service');
    const created = await s.create(owner.id, { workspaceId: w.id, name: 'Prueba local' });
    const code = created.room.code;
    await assert.rejects(() => s.create(owner.id, { workspaceId: w.id, name: 'Duplicada' }), { status: 409 });
    const token = crypto.randomBytes(32).toString('hex'), token2 = crypto.randomBytes(32).toString('hex');
    const first = await s.join(code, { name: 'Ana', token });
    const again = await s.join(code, { name: 'Ana', token });
    assert.deepEqual(again, first);
    const second = await s.join(code, { name: 'Luis', token: token2 });
    assert.notDeepEqual(first.participant.card, second.participant.card);
    await assert.rejects(() => s.manage(other.id, code, 'info'), { status: 403 });
    let result = await s.manage(owner.id, code, 'start', { pattern: 'FULL' });
    let round = result.room.rounds[0];
    await assert.rejects(() => s.join(code, { name: 'Tarde', token: crypto.randomBytes(32).toString('hex') }), { status: 409 });
    assert.equal((await s.claim(code, { token, roundId: round.id })).valid, false);
    const concurrent = await Promise.allSettled([s.manage(owner.id, code, 'draw', { roundId: round.id, expectedCount: 0 }), s.manage(owner.id, code, 'draw', { roundId: round.id, expectedCount: 0 })]);
    assert.equal(concurrent.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal((await s.state(code)).room.rounds[0].balls.length, 1);
    // Fixture brings the round to its last ball; rules.test covers a complete random draw.
    await db.bingoRound.update({ where: { id: round.id }, data: { balls: Array.from({ length: 75 }, (_, i) => i + 1) } });
    const claims = await Promise.all([s.claim(code, { token, roundId: round.id }), s.claim(code, { token: token2, roundId: round.id })]);
    assert.ok(claims.every(r => r.valid));
    const resolved = await s.state(code); assert.equal(resolved.room.rounds[0].winners.length, 2);
    assert.equal(resolved.room.rounds[0].status, 'RESOLVING');
    await assert.rejects(() => s.manage(owner.id, code, 'draw', { roundId: round.id, expectedCount: 75 }), { status: 409 });
    await s.manage(owner.id, code, 'close');
    result = await s.manage(owner.id, code, 'start', { pattern: 'ONE' });
    assert.equal(result.room.rounds[1].balls.length, 0);
    assert.deepEqual((await s.state(code, token)).participant, first.participant);
    await assert.rejects(() => s.claim(code, { token, roundId: round.id }), { status: 409 });
    await s.manage(owner.id, code, 'finish');
    await assert.rejects(() => s.manage(owner.id, code, 'start', { pattern: 'ONE' }), { status: 409 });
    assert.equal((await s.state(code)).room.status, 'FINISHED');
    assert.ok(!JSON.stringify(await s.state(code)).includes(token));
    // HTTP smoke through the actual router, without touching the user's records.
    server = await new Promise(resolve => { const server = require('../app').listen(0, '127.0.0.1', () => resolve(server)); });
    const base = 'http://127.0.0.1:' + server.address().port;
    assert.equal((await fetch(base + '/api/bingo/public/' + code)).status, 200);
    assert.equal((await fetch(base + '/api/bingo/' + code)).status, 401);
    await require('./guest.test-cases')(t, db, owner, other, w, base);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await isolated.cleanup();
  }
});
