const crypto = require('crypto');
const fail = (status, message) => Object.assign(new Error(message), { status });
const hash = token => crypto.createHash('sha256').update(token).digest('hex');
const lock = (tx, id) => tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}::text))`;
function validCounter(value, queue) {
  const counter = Number(value);
  if (!Number.isInteger(counter) || counter < 1 || counter > queue.counterNames.length) throw fail(400, 'Selecciona una ventanilla configurada');
  return counter;
}
async function access(db, userId, workspaceId, admin = false) {
  if (typeof workspaceId !== 'string' || !workspaceId) throw fail(400, 'Selecciona un espacio');
  const membership = await db.membership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } }, include: { workspace: { select: { status: true } } },
  });
  if (!membership || membership.workspace.status !== 'ACTIVE') throw fail(403, 'No tienes acceso a este espacio activo');
  if (admin && !['OWNER', 'ADMIN'].includes(membership.role)) throw fail(403, 'Solo el propietario o administrador puede realizar esta acción');
  return membership;
}
async function allowCounter(db, userId, queue, counter) {
  const membership = await access(db, userId, queue.workspaceId);
  if (['OWNER', 'ADMIN'].includes(membership.role)) return;
  const assignment = await db.turnOperator.findUnique({ where: { queueId_userId: { queueId: queue.id, userId } } });
  if (!assignment || assignment.counter !== counter) throw fail(403, 'Solo puedes atender tu ventanilla asignada');
}
async function ensureAvailable(db, queueId, counter, email, userId) {
  const occupied = await db.turnOperator.findFirst({
    where: { queueId, counter, ...(userId ? { userId: { not: userId } } : {}) },
  });
  const reserved = await db.turnInvitation.findFirst({
    where: { queueId, counter, email: { not: email }, status: 'PENDING', expiresAt: { gt: new Date() } },
  });
  if (occupied || reserved) throw fail(409, 'Esta ventanilla ya está asignada o reservada por una invitación. Selecciona otra');
}
async function assign(db, queue, userId, counter) {
  const previous = await db.turnOperator.findUnique({ where: { queueId_userId: { queueId: queue.id, userId } } });
  if (previous && previous.counter !== counter) await ensureFree(db, queue.id, previous.counter);
  return db.turnOperator.upsert({
    where: { queueId_userId: { queueId: queue.id, userId } },
    create: { queueId: queue.id, userId, counter }, update: { counter },
  });
}
async function ensureFree(db, queueId, counter) {
  const current = await db.turnTicket.findFirst({ where: { queueId, counter, status: 'CALLED' } });
  if (current) throw fail(409, 'Finaliza la atención de esa ventanilla antes de cambiar o quitar su operador');
}
async function invitation(db, token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw fail(404, 'Invitación no encontrada');
  const record = await db.turnInvitation.findUnique({
    where: { tokenHash: hash(token) }, include: { queue: { include: { workspace: { select: { status: true } } } } },
  });
  if (!record || record.queue.workspace.status !== 'ACTIVE') throw fail(404, 'Invitación no disponible');
  if (record.status !== 'PENDING' || record.expiresAt <= new Date()) throw fail(410, 'La invitación venció, fue cancelada o ya se aceptó. Pide un nuevo enlace al administrador');
  validCounter(record.counter, record.queue);
  return record;
}
module.exports = { fail, hash, lock, validCounter, access, allowCounter, assign, ensureFree, ensureAvailable, invitation };
