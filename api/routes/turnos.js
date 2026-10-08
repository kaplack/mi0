const express = require('express');
const crypto = require('crypto');
const prisma = require('../prisma');
const { requireAuth } = require('../middleware/auth');
const { allowCounter } = require('../turnos/operators');
const router = express.Router();
const fail = (status, message) => Object.assign(new Error(message), { status });
const active = { in: ['WAITING', 'CALLED'] };
const validKey = value => typeof value === 'string' && /^[a-zA-Z0-9-]{16,80}$/.test(value);
const ticketView = ticket => ticket ? { number: ticket.number, status: ticket.status, counter: ticket.counter, createdAt: ticket.createdAt } : null;
const lock = (tx, id) => tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}::text))`;

async function access(userId, workspaceId, admin = false) {
  if (typeof workspaceId !== 'string' || !workspaceId) throw fail(400, 'Selecciona un espacio');
  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    include: { workspace: { select: { status: true } } },
  });
  if (!membership || membership.workspace.status !== 'ACTIVE') throw fail(403, 'No tienes acceso a este espacio activo');
  if (admin && !['OWNER', 'ADMIN'].includes(membership.role)) throw fail(403, 'Solo el propietario o administrador puede realizar esta acción');
  return membership;
}
async function publicQueue(code, db = prisma) {
  const queue = await db.turnQueue.findUnique({ where: { code }, include: { workspace: { select: { status: true } } } });
  if (!queue || queue.workspace.status !== 'ACTIVE') throw fail(404, 'Negocio no disponible');
  return queue;
}
function settings(body) {
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const documentMode = body?.documentMode ?? 'NONE';
  const counterNames = body?.counterNames ?? ['Ventanilla 1'];
  if (!name || name.length > 120) throw fail(400, 'Ingresa el nombre del negocio');
  if (!['NONE', 'REQUIRED'].includes(documentMode)) throw fail(400, 'Selecciona cómo solicitar el documento');
  if (!Array.isArray(counterNames) || counterNames.length < 1 || counterNames.length > 99 ||
      counterNames.some(value => typeof value !== 'string' || !value.trim() || value.trim().length > 60)) {
    throw fail(400, 'Configura entre 1 y 99 ventanillas con nombres de hasta 60 caracteres');
  }
  const names = counterNames.map(value => value.trim());
  if (new Set(names.map(value => value.toLowerCase())).size !== names.length) throw fail(400, 'Los nombres de las ventanillas deben ser distintos');
  return { name, documentMode, counterNames: names };
}
function identity(body, mode) {
  if (mode === 'NONE') return { documentType: null, documentNumber: null };
  const documentNumber = typeof body?.documentNumber === 'string' ? body.documentNumber.trim().toUpperCase() : '';
  if (!documentNumber) throw fail(400, 'El negocio requiere un documento de identidad');
  const documentType = body?.documentType;
  if (documentType === 'DNI' && /^\d{8}$/.test(documentNumber)) return { documentType, documentNumber };
  if (documentType === 'CE' && /^[A-Z0-9]{3,20}$/.test(documentNumber)) return { documentType, documentNumber };
  throw fail(400, documentType === 'DNI' ? 'El DNI debe tener 8 dígitos' : 'Selecciona un documento válido e ingresa su número');
}
function counterNumber(value, queue) {
  const counter = Number(value);
  if (!Number.isInteger(counter) || counter < 1 || counter > queue.counterNames.length) throw fail(400, 'Selecciona una ventanilla configurada');
  return counter;
}

router.get('/public/:code', async (req, res, next) => {
  try {
    const queue = await publicQueue(req.params.code);
    const tickets = await prisma.turnTicket.findMany({
      where: { queueId: queue.id, status: active }, orderBy: { number: 'asc' },
      select: { number: true, status: true, counter: true },
    });
    res.set('Cache-Control', 'no-store').json({
      name: queue.name, code: queue.code, counterNames: queue.counterNames, documentMode: queue.documentMode === 'NONE' ? 'NONE' : 'REQUIRED',
      waiting: tickets.filter(ticket => ticket.status === 'WAITING').length,
      called: tickets.filter(ticket => ticket.status === 'CALLED'),
    });
  } catch (error) { next(error); }
});
router.get('/public/:code/mine', async (req, res, next) => {
  try {
    const queue = await publicQueue(req.params.code);
    if (!validKey(req.query.key)) throw fail(400, 'Identificador inválido');
    const ticket = await prisma.turnTicket.findFirst({
      where: { queueId: queue.id, clientKey: req.query.key }, orderBy: { number: 'desc' },
      select: { number: true, status: true, counter: true, createdAt: true },
    });
    const current = ticket && ['WAITING', 'CALLED'].includes(ticket.status) ? ticket : null;
    const ahead = current?.status === 'WAITING' ? await prisma.turnTicket.count({
      where: { queueId: queue.id, status: 'WAITING', number: { lt: current.number } },
    }) : 0;
    res.set('Cache-Control', 'no-store').json({ ticket: current, ahead, lastStatus: ticket?.status || null, expired: ticket?.status === 'EXPIRED' });
  } catch (error) { next(error); }
});
router.post('/public/:code/join', async (req, res, next) => {
  try {
    const queue = await publicQueue(req.params.code);
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const key = req.body?.key;
    if (!name || name.length > 80 || !validKey(key)) throw fail(400, 'Ingresa tu nombre y un identificador válido');
    const ticket = await prisma.$transaction(async tx => {
      await lock(tx, queue.id);
      const currentQueue = await publicQueue(req.params.code, tx);
      const existing = await tx.turnTicket.findFirst({ where: { queueId: queue.id, clientKey: key, status: active } });
      if (existing) return existing;
      const document = identity(req.body, currentQueue.documentMode);
      const updated = await tx.turnQueue.update({ where: { id: queue.id }, data: { lastNumber: { increment: 1 } } });
      return tx.turnTicket.create({ data: { queueId: queue.id, number: updated.lastNumber, name, clientKey: key, ...document } });
    });
    res.status(201).json({ ticket: ticketView(ticket) });
  } catch (error) { next(error); }
});
router.use(requireAuth);
router.post('/setup', async (req, res, next) => {
  try {
    const { workspaceId } = req.body || {};
    await access(req.auth.user.id, workspaceId, true);
    const data = settings(req.body);
    const existing = await prisma.turnQueue.findUnique({ where: { workspaceId } });
    if (existing) return res.json({ queue: existing });
    const queue = await prisma.turnQueue.create({ data: { workspaceId, ...data, code: crypto.randomBytes(6).toString('hex') } });
    res.status(201).json({ queue });
  } catch (error) { next(error); }
});
router.get('/workspace/:workspaceId', async (req, res, next) => {
  try {
    const membership = await access(req.auth.user.id, req.params.workspaceId);
    const queue = await prisma.turnQueue.findUnique({ where: { workspaceId: req.params.workspaceId } });
    const canChooseCounter = ['OWNER', 'ADMIN'].includes(membership.role);
    const assignment = queue && !canChooseCounter ? await prisma.turnOperator.findUnique({ where: { queueId_userId: { queueId: queue.id, userId: req.auth.user.id } } }) : null;
    const assignedCounter = assignment?.counter || null;
    const tickets = queue && (canChooseCounter || assignedCounter) ? await prisma.turnTicket.findMany({
      where: { queueId: queue.id, status: active }, orderBy: { number: 'asc' },
      select: { id: true, number: true, name: true, status: true, counter: true, documentType: true, documentNumber: true },
    }) : [];
    const visibleTickets = tickets.map(ticket => {
      if (canChooseCounter || ticket.counter === assignedCounter) return ticket;
      const { documentType, documentNumber, ...visible } = ticket;
      return visible;
    });
    res.set('Cache-Control', 'no-store').json({ queue: queue ? { ...queue, documentMode: queue.documentMode === 'NONE' ? 'NONE' : 'REQUIRED' } : null, tickets: visibleTickets, role: membership.role, assignedCounter, canChooseCounter });
  } catch (error) { next(error); }
});
router.patch('/workspace/:workspaceId/settings', async (req, res, next) => {
  try {
    await access(req.auth.user.id, req.params.workspaceId, true);
    const data = settings(req.body);
    const queue = await prisma.turnQueue.findUnique({ where: { workspaceId: req.params.workspaceId } });
    if (!queue) throw fail(404, 'Configura el negocio primero');
    const updated = await prisma.$transaction(async tx => {
      await lock(tx, queue.id);
      const inUse = await tx.turnTicket.findFirst({ where: { queueId: queue.id, status: 'CALLED', counter: { gt: data.counterNames.length } } });
      if (inUse) throw fail(409, 'Finaliza la atención de las ventanillas que quieres quitar');
      const assigned = await tx.turnOperator.findFirst({ where: { queueId: queue.id, counter: { gt: data.counterNames.length } } });
      const invited = await tx.turnInvitation.findFirst({ where: { queueId: queue.id, counter: { gt: data.counterNames.length }, status: 'PENDING', expiresAt: { gt: new Date() } } });
      if (assigned || invited) throw fail(409, 'Reasigna los operadores o cancela las invitaciones de las ventanillas que quieres quitar');
      return tx.turnQueue.update({ where: { id: queue.id }, data });
    });
    res.json({ queue: updated });
  } catch (error) { next(error); }
});
router.post('/workspace/:workspaceId/next', async (req, res, next) => {
  try {
    await access(req.auth.user.id, req.params.workspaceId);
    const queue = await prisma.turnQueue.findUnique({ where: { workspaceId: req.params.workspaceId } });
    if (!queue) throw fail(404, 'Configura el negocio primero');
    const ticket = await prisma.$transaction(async tx => {
      await lock(tx, queue.id);
      const currentQueue = await tx.turnQueue.findUnique({ where: { id: queue.id } });
      const counter = counterNumber(req.body?.counter, currentQueue);
      await allowCounter(tx, req.auth.user.id, currentQueue, counter);
      const current = await tx.turnTicket.findFirst({ where: { queueId: queue.id, counter, status: 'CALLED' } });
      if (current) throw fail(409, 'Finaliza la atención actual o marca al cliente como ausente');
      const waiting = await tx.turnTicket.findFirst({ where: { queueId: queue.id, status: 'WAITING' }, orderBy: { number: 'asc' } });
      return waiting ? tx.turnTicket.update({ where: { id: waiting.id }, data: { status: 'CALLED', counter, calledAt: new Date(), calledById: req.auth.user.id } }) : null;
    });
    res.json({ ticket });
  } catch (error) { next(error); }
});
router.post('/workspace/:workspaceId/finish', async (req, res, next) => {
  try {
    await access(req.auth.user.id, req.params.workspaceId);
    const queue = await prisma.turnQueue.findUnique({ where: { workspaceId: req.params.workspaceId } });
    if (!queue) throw fail(404, 'Configura el negocio primero');
    const { ticketId, action } = req.body || {};
    if (typeof ticketId !== 'string' || !['SERVED', 'ABSENT'].includes(action)) throw fail(400, 'Selecciona el turno y una acción válida');
    const ticket = await prisma.$transaction(async tx => {
      await lock(tx, queue.id);
      const current = await tx.turnTicket.findFirst({ where: { id: ticketId, queueId: queue.id, status: 'CALLED' } });
      if (!current) throw fail(409, 'Este turno ya no está en atención. Actualiza la pantalla');
      await allowCounter(tx, req.auth.user.id, queue, current.counter);
      return tx.turnTicket.update({ where: { id: current.id }, data: { status: action, servedAt: action === 'SERVED' ? new Date() : null } });
    });
    res.json({ ticket });
  } catch (error) { next(error); }
});
router.post('/workspace/:workspaceId/close', async (req, res, next) => {
  try {
    await access(req.auth.user.id, req.params.workspaceId, true);
    const queue = await prisma.turnQueue.findUnique({ where: { workspaceId: req.params.workspaceId } });
    if (!queue) throw fail(404, 'Configura el negocio primero');
    const result = await prisma.$transaction(async tx => {
      await lock(tx, queue.id);
      return tx.turnTicket.updateMany({ where: { queueId: queue.id, status: active }, data: { status: 'EXPIRED' } });
    });
    res.json({ expired: result.count });
  } catch (error) { next(error); }
});
module.exports = router;
