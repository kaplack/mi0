const crypto = require('node:crypto');
const prisma = require('../prisma');
const r = require('./rules');
const core = require('./service');
const retention = require('./retention');
const digest = value => r.hash(r.token(value));
async function create(body) {
  const adminHash = digest(body?.adminToken), name = r.text(body?.name, 120);
  return prisma.$transaction(async db => {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${ 'bingo-guest:' + adminHash }::text))`;
    const guest = await db.bingoGuest.upsert({ where: { adminHash }, create: { adminHash }, update: {} });
    await db.$queryRaw`SELECT id FROM bingo_guests WHERE id=${guest.id}::uuid FOR UPDATE`;
    const active = await db.bingoRoom.findFirst({ where: { guestId: guest.id, status: { not: 'FINISHED' } }, include: core.include });
    if (active && !retention.unavailable(active)) return { room: core.adminView(active) };
    if (active) await retention.expire(db, active, new Date());
    const module = await db.module.findUnique({ where: { code: 'mi-bingo' } });
    if (!module?.active) throw r.fail(409, 'Mi Bingo no admite salas nuevas en este momento');
    await db.bingoGuest.update({ where: { id: guest.id }, data: { recoveryHash: null, recoveryCode: null } });
    return { room: core.adminView(await db.bingoRoom.create({ data: { guestId: guest.id, name, code: crypto.randomBytes(16).toString('hex'), participantLimit: 30, ...retention.activity('WAITING') }, include: core.include })) };
  }, { timeout: 10000 });
}
async function current(body) {
  const guest = await prisma.bingoGuest.findUnique({ where: { adminHash: digest(body?.adminToken) } });
  if (!guest) return { room: null };
  const rooms = await prisma.bingoRoom.findMany({ where: { guestId: guest.id }, include: core.include, orderBy: { createdAt: 'desc' }, take: 1 });
  return { room: rooms[0] && !retention.unavailable(rooms[0]) ? core.adminView(rooms[0]) : null };
}
async function recovery(code, body) {
  return core.locked(code, async (db, room) => {
    await core.authorize(db, room, { adminToken: body?.adminToken });
    if (!room.guestId) throw r.fail(409, 'Recupera esta sala mediante tu cuenta');
    const recoveryHash = body?.recoveryToken === null ? null : digest(body?.recoveryToken);
    if (recoveryHash === digest(body?.adminToken)) throw r.fail(400, 'El acceso de recuperación debe ser independiente');
    await db.bingoGuest.update({ where: { id: room.guestId }, data: { recoveryHash, recoveryCode: recoveryHash ? code : null } });
    await db.bingoRoom.update({ where: { id: room.id }, data: retention.touch(room) });
    return { ok: true };
  });
}
async function recover(body) {
  const newAdminHash = digest(body?.newAdminToken), recoveryHash = digest(body?.recoveryToken);
  if (newAdminHash === recoveryHash) throw r.fail(400, 'Usa una credencial nueva para administrar');
  return core.locked(body?.code, async (db, room) => {
    if (!room.guestId) throw r.fail(403, 'La sala ya está vinculada a una cuenta');
    await db.$queryRaw`SELECT id FROM bingo_guests WHERE id=${room.guestId}::uuid FOR UPDATE`;
    const guest = await db.bingoGuest.findUnique({ where: { id: room.guestId } });
    // The replacement credential makes retries safe after a lost response.
    if (guest.adminHash !== newAdminHash) {
      if (guest.recoveryHash !== recoveryHash || guest.recoveryCode !== room.code) throw r.fail(403, 'El enlace privado es inválido, ya se utilizó o fue revocado');
      await db.bingoGuest.update({ where: { id: guest.id }, data: { adminHash: newAdminHash, recoveryHash: null, recoveryCode: null } });
    }
    await db.bingoRoom.update({ where: { id: room.id }, data: retention.touch(room) });
    return { room: core.adminView(await db.bingoRoom.findUnique({ where: { id: room.id }, include: core.include })) };
  });
}
async function attach(userId, code, body) {
  const adminHash = digest(body?.adminToken), workspaceId = r.id(body?.workspaceId);
  return prisma.$transaction(async db => {
    await db.$queryRaw`SELECT id FROM users WHERE id=${userId}::uuid FOR UPDATE`;
    // Same lock as the game's commands: no lost draws or participants during transfer.
    await db.$queryRaw`SELECT id FROM bingo_rooms WHERE code=${code} FOR UPDATE`;
    const room = await db.bingoRoom.findUnique({ where: { code }, include: core.include });
    if (!room) throw r.fail(404, 'Sala no disponible');
    await core.access(db, userId, workspaceId);
    if (room.ownerId === userId && room.workspaceId === workspaceId) return { room: core.adminView(room) };
    if (!room.guestId || retention.unavailable(room)) throw r.fail(403, 'Esta sala no se puede vincular');
    await db.$queryRaw`SELECT id FROM bingo_guests WHERE id=${room.guestId}::uuid FOR UPDATE`;
    const guest = await db.bingoGuest.findUnique({ where: { id: room.guestId } });
    if (guest.adminHash !== adminHash) throw r.fail(403, 'Necesitas el acceso vigente del organizador');
    if (room.status !== 'FINISHED' && await db.bingoRoom.count({ where: { ownerId: userId, status: { not: 'FINISHED' } } })) throw r.fail(409, 'Tu cuenta ya tiene una sala activa. No se modificó ninguna de las dos salas');
    const module = await require('../catalog/service').requireAvailable(db, 'mi-bingo', workspaceId);
    await db.workspaceModule.upsert({ where: { workspaceId_moduleId: { workspaceId, moduleId: module.id } }, create: { workspaceId, moduleId: module.id }, update: { active: true } });
    const updated = await db.bingoRoom.update({ where: { id: room.id }, data: { guestId: null, ownerId: userId, workspaceId, participantLimit: 50, expiresAt: null, deleteAfter: null, lastAdminAt: new Date() }, include: core.include });
    await db.bingoGuest.update({ where: { id: guest.id }, data: { recoveryHash: null, recoveryCode: null, adminHash: r.hash(crypto.randomBytes(32).toString('hex')) } });
    return { room: core.adminView(updated) };
  }, { maxWait: 10000, timeout: 10000 });
}
module.exports = { create, current, recovery, recover, attach };
