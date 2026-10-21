const prisma = require('../prisma');
const DAY = 86400000;
function activity(status, now = new Date()) {
  return { lastAdminAt: now, expiresAt: status === 'FINISHED' ? null : new Date(+now + (status === 'PLAYING' ? 7 : 1) * DAY), deleteAfter: status === 'FINISHED' ? new Date(+now + 7 * DAY) : null };
}
const touch = room => room.status === 'FINISHED' ? { lastAdminAt: new Date() } : activity(room.status);
function unavailable(room, now = new Date()) {
  return room.guestId && ((room.expiresAt && room.expiresAt <= now) || (room.deleteAfter && room.deleteAfter <= now));
}
async function expire(db, room, now) {
  if (!room.guestId || !room.expiresAt || room.expiresAt > now) return;
  // Expired rounds are explicitly cancelled before retention/deletion begins.
  await db.bingoRound.updateMany({ where: { roomId: room.id, status: { in: ['ACTIVE', 'RESOLVING'] } }, data: { status: 'CANCELLED', closedAt: now } });
  await db.bingoRoom.update({ where: { id: room.id }, data: { status: 'FINISHED', deleteAfter: new Date(+room.expiresAt + 7 * DAY) } });
}
async function sweep(now = new Date()) {
  const candidates = await prisma.bingoRoom.findMany({ where: { guestId: { not: null }, OR: [{ expiresAt: { lte: now }, deleteAfter: null }, { deleteAfter: { lte: now } }] }, select: { id: true }, take: 100 });
  for (const candidate of candidates) await prisma.$transaction(async db => {
    await db.$queryRaw`SELECT id FROM bingo_rooms WHERE id=${candidate.id}::uuid FOR UPDATE`;
    const room = await db.bingoRoom.findUnique({ where: { id: candidate.id } });
    if (!room?.guestId) return;
    await expire(db, room, now);
    const current = await db.bingoRoom.findUnique({ where: { id: room.id } });
    if (current.status === 'FINISHED' && current.deleteAfter && current.deleteAfter <= now) await db.bingoRoom.delete({ where: { id: room.id } });
  });
  // Credentials have no purpose once all their retained rooms are gone.
  await prisma.bingoGuest.deleteMany({ where: { rooms: { none: {} } } });
}
function startSweep() {
  let running = false;
  const tick = async () => { if (running) return; running = true; try { await sweep(); } catch (e) { console.error('Mi Bingo cleanup:', e.code || e.name); } finally { running = false; } };
  const timer = setInterval(tick, 3600000); timer.unref(); tick();
  return () => clearInterval(timer);
}
module.exports = { DAY, activity, touch, unavailable, expire, sweep, startSweep };
