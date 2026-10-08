const express = require('express');
const crypto = require('crypto');
const prisma = require('../prisma');
const { requireAuth } = require('../middleware/auth');
const { fail, hash, lock, validCounter, access, assign, ensureFree, ensureAvailable, invitation } = require('../turnos/operators');
const router = express.Router();
router.get('/invitations/:token', async (req, res, next) => {
  try {
    const record = await invitation(prisma, req.params.token);
    res.set('Cache-Control', 'no-store').json({
      name: record.queue.name, email: record.email, counterName: record.queue.counterNames[record.counter - 1], expiresAt: record.expiresAt,
    });
  } catch (error) { next(error); }
});
router.use('/workspace', requireAuth);
router.use('/invitations/:token/accept', requireAuth);
router.post('/invitations/:token/accept', async (req, res, next) => {
  try {
    const pending = await invitation(prisma, req.params.token);
    const result = await prisma.$transaction(async tx => {
      await lock(tx, pending.queueId);
      const record = await invitation(tx, req.params.token);
      const user = await tx.user.findUnique({ where: { id: req.auth.user.id } });
      if (!user || user.status !== 'ACTIVE' || user.email.toLowerCase() !== record.email) throw fail(403, 'Inicia sesión con el correo de la invitación');
      await ensureAvailable(tx, record.queueId, record.counter, record.email, user.id);
      await tx.membership.upsert({
        where: { userId_workspaceId: { userId: user.id, workspaceId: record.queue.workspaceId } },
        create: { userId: user.id, workspaceId: record.queue.workspaceId, role: 'MEMBER' }, update: {},
      });
      await assign(tx, record.queue, user.id, record.counter);
      await tx.turnInvitation.update({ where: { id: record.id }, data: { status: 'ACCEPTED', acceptedAt: new Date() } });
      return { workspaceId: record.queue.workspaceId, counter: record.counter };
    });
    res.json(result);
  } catch (error) { next(error); }
});
async function adminQueue(userId, workspaceId) {
  await access(prisma, userId, workspaceId, true);
  const queue = await prisma.turnQueue.findUnique({ where: { workspaceId } });
  if (!queue) throw fail(404, 'Configura el negocio primero');
  return queue;
}
router.get('/workspace/:workspaceId/operators', async (req, res, next) => {
  try {
    const queue = await adminQueue(req.auth.user.id, req.params.workspaceId);
    const operators = await prisma.turnOperator.findMany({
      where: { queueId: queue.id }, orderBy: { counter: 'asc' },
      select: { userId: true, counter: true, user: { select: { name: true, lastName: true, email: true } } },
    });
    const invitations = await prisma.turnInvitation.findMany({
      where: { queueId: queue.id, status: 'PENDING' }, orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, counter: true, expiresAt: true },
    });
    res.set('Cache-Control', 'no-store').json({ operators, invitations });
  } catch (error) { next(error); }
});
router.post('/workspace/:workspaceId/operators', async (req, res, next) => {
  try {
    const queue = await adminQueue(req.auth.user.id, req.params.workspaceId);
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail(400, 'Ingresa un correo válido');
    const result = await prisma.$transaction(async tx => {
      await lock(tx, queue.id);
      await access(tx, req.auth.user.id, queue.workspaceId, true);
      const current = await tx.turnQueue.findUnique({ where: { id: queue.id } });
      const counter = validCounter(req.body?.counter, current);
      const user = await tx.user.findUnique({ where: { email } });
      await ensureAvailable(tx, queue.id, counter, email, user?.id);
      const membership = user ? await tx.membership.findUnique({ where: { userId_workspaceId: { userId: user.id, workspaceId: queue.workspaceId } } }) : null;
      if (membership) {
        if (user.status !== 'ACTIVE') throw fail(400, 'La cuenta del operador no está activa');
        await assign(tx, current, user.id, counter);
        await tx.turnInvitation.updateMany({ where: { queueId: queue.id, email, status: 'PENDING' }, data: { status: 'REVOKED' } });
        return { kind: 'ASSIGNED' };
      }
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 86400000);
      await tx.turnInvitation.upsert({
        where: { queueId_email: { queueId: queue.id, email } },
        create: { queueId: queue.id, email, counter, tokenHash: hash(token), expiresAt },
        update: { counter, tokenHash: hash(token), expiresAt, status: 'PENDING', acceptedAt: null, createdAt: new Date() },
      });
      return { kind: 'INVITED', token, expiresAt };
    });
    res.status(201).json(result);
  } catch (error) { next(error); }
});
router.delete('/workspace/:workspaceId/operators/:userId', async (req, res, next) => {
  try {
    const queue = await adminQueue(req.auth.user.id, req.params.workspaceId);
    await prisma.$transaction(async tx => {
      await lock(tx, queue.id);
      await access(tx, req.auth.user.id, queue.workspaceId, true);
      const operator = await tx.turnOperator.findUnique({ where: { queueId_userId: { queueId: queue.id, userId: req.params.userId } } });
      if (!operator) throw fail(404, 'Operador no encontrado');
      await ensureFree(tx, queue.id, operator.counter);
      await tx.turnOperator.delete({ where: { id: operator.id } });
    });
    res.json({ ok: true });
  } catch (error) { next(error); }
});
router.delete('/workspace/:workspaceId/invitations/:id', async (req, res, next) => {
  try {
    const queue = await adminQueue(req.auth.user.id, req.params.workspaceId);
    await prisma.$transaction(async tx => {
      await lock(tx, queue.id);
      await access(tx, req.auth.user.id, queue.workspaceId, true);
      await tx.turnInvitation.updateMany({ where: { id: req.params.id, queueId: queue.id, status: 'PENDING' }, data: { status: 'REVOKED' } });
    });
    res.json({ ok: true });
  } catch (error) { next(error); }
});
module.exports = router;
