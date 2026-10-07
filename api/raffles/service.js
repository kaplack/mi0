const crypto = require('crypto');
const prisma = require('../prisma');
const { fail, uuid, draft, paymentReference } = require('./validation');
const { publicationConfig, PUBLICATION_AMOUNT_CENTS } = require('./config');
const include = {
  participants: { orderBy: { order: 'asc' } },
  prizes: { orderBy: { order: 'asc' } },
  results: { include: { prize: true, participant: true }, orderBy: { prize: { order: 'asc' } } },
  publications: { orderBy: { requestedAt: 'desc' }, take: 1 },
};
function serialize(raffle) {
  const publication = raffle.publications?.[0];
  return { id: raffle.id, workspaceId: raffle.workspaceId, name: raffle.name, status: raffle.status,
    createdAt: raffle.createdAt, drawnAt: raffle.drawnAt, publicCode: raffle.publicCode, publishedAt: raffle.publishedAt,
    participants: raffle.participants.map(p => ({ id: p.id, name: p.name })),
    prizes: raffle.prizes.map(p => ({ id: p.id, name: p.name, order: p.order })),
    results: raffle.results.map(r => ({ prize: { id: r.prize.id, name: r.prize.name, order: r.prize.order },
      participant: { id: r.participant.id, name: r.participant.name }, drawnAt: r.drawnAt })),
    publication: publication ? { id: publication.id, status: publication.status, reference: publication.reference,
      amountCents: publication.amountCents, requestedAt: publication.requestedAt, reviewedAt: publication.reviewedAt,
      rejectionReason: publication.rejectionReason } : null };
}
async function access(db, userId, workspaceId, write = false) {
  uuid(workspaceId);
  const membership = await db.membership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } }, include: { workspace: true },
  });
  if (!membership || membership.workspace.status !== 'ACTIVE') fail(404, 'Espacio no disponible');
  if (write && !['OWNER', 'ADMIN'].includes(membership.role)) fail(403, 'Solo propietarios y administradores pueden modificar sorteos');
  return membership;
}
async function locked(db, id, userId, write = true) {
  uuid(id);
  await db.$queryRaw`SELECT id FROM raffles WHERE id = ${id}::uuid FOR UPDATE`;
  const raffle = await db.raffle.findUnique({ where: { id }, include });
  if (!raffle) fail(404, 'Sorteo no encontrado');
  await access(db, userId, raffle.workspaceId, write);
  return raffle;
}
async function list(userId, workspaceId) {
  await access(prisma, userId, workspaceId);
  const raffles = await prisma.raffle.findMany({ where: { workspaceId }, include, orderBy: { createdAt: 'desc' } });
  return raffles.map(serialize);
}
async function get(userId, id) {
  uuid(id);
  const raffle = await prisma.raffle.findUnique({ where: { id }, include });
  if (!raffle) fail(404, 'Sorteo no encontrado');
  await access(prisma, userId, raffle.workspaceId);
  return serialize(raffle);
}
async function save(userId, body, id) {
  const data = draft(body);
  return prisma.$transaction(async db => {
    let existing;
    if (id) {
      existing = await locked(db, id, userId);
      if (existing.status !== 'DRAFT') fail(409, 'Un sorteo realizado no se puede modificar');
      await db.raffleParticipant.deleteMany({ where: { raffleId: id } });
      await db.rafflePrize.deleteMany({ where: { raffleId: id } });
    } else await access(db, userId, body.workspaceId, true);
    const children = {
      name: data.name,
      participants: { create: data.participants.map((name, order) => ({ name, order })) },
      prizes: { create: data.prizes.map((name, order) => ({ name, order })) },
    };
    const raffle = id
      ? await db.raffle.update({ where: { id }, data: children, include })
      : await db.raffle.create({ data: { ...children, workspaceId: body.workspaceId, createdById: userId }, include });
    return serialize(raffle);
  });
}
async function draw(userId, id) {
  return prisma.$transaction(async db => {
    const raffle = await locked(db, id, userId);
    if (raffle.status === 'COMPLETED') return serialize(raffle);
    if (raffle.participants.length < raffle.prizes.length) fail(409, 'Faltan participantes');
    const available = [...raffle.participants];
    const drawnAt = new Date();
    const results = raffle.prizes.map(prize => {
      const index = crypto.randomInt(available.length);
      const [participant] = available.splice(index, 1);
      return { raffleId: id, prizeId: prize.id, participantId: participant.id, drawnAt };
    });
    await db.raffleResult.createMany({ data: results });
    return serialize(await db.raffle.update({ where: { id }, data: { status: 'COMPLETED', drawnAt }, include }));
  });
}
async function requestPublication(userId, id, value) {
  if (!publicationConfig().enabled) fail(503, 'La publicación por Yape aún no está habilitada');
  const reference = paymentReference(value);
  return prisma.$transaction(async db => {
    const raffle = await locked(db, id, userId);
    if (raffle.status !== 'COMPLETED') fail(409, 'Primero realiza el sorteo');
    if (raffle.publicCode) fail(409, 'El sorteo ya está publicado');
    if (raffle.publications[0]?.status === 'PENDING') {
      if (raffle.publications[0].reference === reference) return serialize(raffle);
      fail(409, 'Ya tienes una solicitud pendiente');
    }
    await db.rafflePublication.create({ data: { raffleId: id, requestedById: userId, reference, amountCents: PUBLICATION_AMOUNT_CENTS } });
    return serialize(await db.raffle.findUnique({ where: { id }, include }));
  });
}
async function pendingPublications() {
  return prisma.rafflePublication.findMany({ where: { status: 'PENDING' }, orderBy: { requestedAt: 'asc' },
    select: { id: true, reference: true, amountCents: true, requestedAt: true,
      raffle: { select: { id: true, name: true } },
      requestedBy: { select: { name: true, lastName: true, email: true } } } });
}
async function review(user, id, action, rejectionReason) {
  if (user.role !== 'SUPERADMIN') fail(403, 'Acceso exclusivo para Superadmin');
  uuid(id);
  if (!['approve', 'reject'].includes(action)) fail(400, 'Acción inválida');
  if (action === 'reject' && (typeof rejectionReason !== 'string' || !rejectionReason.trim() || rejectionReason.trim().length > 300)) fail(400, 'Indica un motivo de rechazo de hasta 300 caracteres');
  return prisma.$transaction(async db => {
    const request = await db.rafflePublication.findUnique({ where: { id } });
    if (!request) fail(404, 'Solicitud no encontrada');
    await db.$queryRaw`SELECT id FROM raffles WHERE id = ${request.raffleId}::uuid FOR UPDATE`;
    const current = await db.rafflePublication.findUnique({ where: { id }, include: { raffle: { include: { workspace: true } } } });
    if (current.status !== 'PENDING') fail(409, 'La solicitud ya fue revisada');
    if (current.raffle.status !== 'COMPLETED') fail(409, 'El sorteo no está realizado');
    if (current.raffle.workspace.status !== 'ACTIVE') fail(409, 'El espacio del sorteo está inactivo');
    const reviewedAt = new Date();
    if (action === 'approve') {
      await db.raffle.update({ where: { id: current.raffleId }, data: { publicCode: crypto.randomBytes(16).toString('hex'), publishedAt: reviewedAt } });
    }
    return db.rafflePublication.update({ where: { id }, data: {
      status: action === 'approve' ? 'APPROVED' : 'REJECTED', reviewedAt, reviewedById: user.id,
      rejectionReason: action === 'reject' ? rejectionReason.trim() : null,
    }, select: { id: true, status: true } });
  });
}
async function publicResults(code) {
  if (typeof code !== 'string' || !/^[a-f0-9]{32}$/.test(code)) fail(404, 'Resultados no disponibles');
  const raffle = await prisma.raffle.findUnique({ where: { publicCode: code },
    include: { workspace: true, _count: { select: { participants: true } },
      results: { include: { prize: true, participant: true }, orderBy: { prize: { order: 'asc' } } } } });
  if (!raffle || !raffle.publishedAt || raffle.status !== 'COMPLETED' || raffle.workspace.status !== 'ACTIVE') fail(404, 'Resultados no disponibles');
  return { name: raffle.name, drawnAt: raffle.drawnAt, participantCount: raffle._count.participants,
    results: raffle.results.map(r => ({ prize: r.prize.name, winner: r.participant.name })) };
}
module.exports = { list, get, save, draw, requestPublication, pendingPublications, review, publicResults, access };
