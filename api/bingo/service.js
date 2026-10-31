const crypto = require('node:crypto');
const prisma = require('../prisma');
const r = require('./rules');
const retention = require('./retention');
const include = { rounds: { orderBy: { number: 'asc' } }, _count: { select: { participants: true } } };
const view = room => ({
  id: room.id,
  code: room.code,
  name: room.name,
  status: room.status,
  mode: room.guestId ? 'ANONYMOUS' : 'REGISTERED',
  participantLimit: room.participantLimit,
  participantCount: room.participantCount !== undefined ? room.participantCount : (room._count?.participants ?? 0),
  rounds: room.rounds
});
const adminView = room => ({ ...view(room), expiresAt: room.expiresAt, deleteAfter: room.deleteAfter, workspaceId: room.workspaceId });
async function access(db, userId, workspaceId) {
  r.id(workspaceId);
  const member = await db.membership.findUnique({ where: { userId_workspaceId: { userId, workspaceId } }, include: { workspace: true } });
  if (!member || member.role !== 'OWNER' || member.workspace.status !== 'ACTIVE') throw r.fail(403, 'Solo el propietario puede organizar su bingo');
}
async function room(db, code) {
  if (typeof code !== 'string' || !/^[a-f0-9]{32}$/.test(code)) throw r.fail(404, 'Sala no disponible');
  const found = await db.bingoRoom.findUnique({
    where: { code },
    include: {
      ...include,
      participants: { select: { cards: true } },
      workspace: { select: { status: true } }
    }
  });
  if (!found || (found.ownerId && found.workspace?.status !== 'ACTIVE')) throw r.fail(404, 'Sala no disponible');
  if (retention.unavailable(found)) throw r.fail(410, 'La sala gratuita caducó y ya no admite acceso');
  const totalCards = found.participants
    ? found.participants.reduce((sum, p) => sum + (Array.isArray(p.cards) && p.cards.length > 0 ? p.cards.length : 1), 0)
    : (found._count?.participants ?? 0);
  found.participantCount = totalCards;
  return found;
}
async function locked(code, fn) {
  return prisma.$transaction(async db => {
    await db.$queryRaw`SELECT id FROM bingo_rooms WHERE code=${code} FOR UPDATE`;
    return fn(db, await room(db, code));
  }, { maxWait: 10000, timeout: 10000 });
}
async function participant(db, roomId, token) {
  const p = await db.bingoParticipant.findUnique({ where: { roomId_tokenHash: { roomId, tokenHash: r.hash(r.token(token)) } } });
  if (!p) throw r.fail(401, 'No encontramos tu cartón en esta sala');
  const cards = (Array.isArray(p.cards) && p.cards.length > 0) ? p.cards : [p.card];
  return { id: p.id, name: p.name, card: cards[0], cards };
}
async function state(code, token) {
  const found = await room(prisma, code);
  return { room: view(found), ...(token ? { participant: await participant(prisma, found.id, token) } : {}) };
}
async function list(userId, workspaceId) {
  await access(prisma, userId, workspaceId);
  return { rooms: (await prisma.bingoRoom.findMany({ where: { ownerId: userId, workspaceId }, include, orderBy: { createdAt: 'desc' } })).map(view) };
}
async function create(userId, body) {
  const name = r.text(body?.name, 120), workspaceId = r.id(body?.workspaceId);
  return prisma.$transaction(async db => {
    await db.$queryRaw`SELECT id FROM users WHERE id=${userId}::uuid FOR UPDATE`;
    await access(db, userId, workspaceId);
    if (await db.bingoRoom.count({ where: { ownerId: userId, status: { not: 'FINISHED' } } })) throw r.fail(409, 'Finaliza tu sala activa antes de crear otra');
    const module = await require('../catalog/service').requireAvailable(db, 'mi-bingo', workspaceId);
    await db.workspaceModule.upsert({ where: { workspaceId_moduleId: { workspaceId, moduleId: module.id } }, create: { workspaceId, moduleId: module.id }, update: { active: true } });
    return { room: view(await db.bingoRoom.create({ data: { workspaceId, ownerId: userId, name, code: crypto.randomBytes(16).toString('hex') }, include })) };
  });
}
async function join(code, body) {
  const tokenHash = r.hash(r.token(body?.token));
  return locked(code, async (db, current) => {
    const previous = await db.bingoParticipant.findUnique({ where: { roomId_tokenHash: { roomId: current.id, tokenHash } } });
    if (previous) {
      const cards = (Array.isArray(previous.cards) && previous.cards.length > 0) ? previous.cards : [previous.card];
      return { participant: { id: previous.id, name: previous.name, card: cards[0], cards } };
    }
    if (!['WAITING', 'BETWEEN'].includes(current.status)) throw r.fail(409, 'Espera a la próxima ronda para incorporarte');
    const count = Math.min(3, Math.max(1, parseInt(body?.cardCount, 10) || 1));
    if (current.participantCount + count > current.participantLimit) throw r.fail(409, 'La sala alcanzó sus ' + current.participantLimit + ' cartones');
    const name = r.text(body?.name, 80);
    const existingCards = await db.bingoParticipant.findMany({ where: { roomId: current.id }, select: { cardKey: true } });
    const existingKeys = new Set(existingCards.map(p => p.cardKey));
    const cards = [];
    for (let i = 0; i < count; i++) {
      let card, cardKey;
      do {
        card = r.card();
        cardKey = card.join(',');
      } while (existingKeys.has(cardKey));
      existingKeys.add(cardKey);
      cards.push(card);
    }
    const cardKey = cards[0].join(',');
    const p = await db.bingoParticipant.create({
      data: { roomId: current.id, name, tokenHash, card: cards[0], cards, cardKey }
    });
    return { participant: { id: p.id, name: p.name, card: p.card, cards } };
  });
}
async function manage(userId, code, action, body = {}) {
  return locked(code, async (db, current) => {
    await authorize(db, current, userId);
    if (action === 'info') {
      const participants = await db.bingoParticipant.findMany({
        where: { roomId: current.id },
        select: { id: true, name: true, cards: true },
        orderBy: { createdAt: 'asc' }
      });
      return {
        room: adminView(current),
        participants: participants.map(p => ({
          id: p.id,
          name: p.name,
          cardCount: (Array.isArray(p.cards) && p.cards.length > 0) ? p.cards.length : 1
        }))
      };
    }
    if (current.status === 'FINISHED') throw r.fail(409, 'La sala ya finalizó');
    const round = current.rounds.at(-1);
    if (action === 'start') {
      if (!['WAITING', 'BETWEEN'].includes(current.status)) throw r.fail(409, 'Cierra la ronda actual primero');
      if (!['ONE', 'TWO', 'FULL', 'LETTER_X', 'LETTER_L', 'LETTER_T', 'LETTER_H', 'LETTER_O'].includes(body.pattern)) throw r.fail(400, 'Selecciona un patrón válido');
      if (!current.participantCount) throw r.fail(409, 'Espera al menos un participante');
      const prize = body.prize ? r.text(body.prize, 120) : '';
      await db.bingoRound.create({ data: { roomId: current.id, number: current.rounds.length + 1, pattern: body.pattern, prize } });
      await db.bingoRoom.update({ where: { id: current.id }, data: { status: 'PLAYING' } });
    } else if (action === 'draw') {
      if (current.status !== 'PLAYING' || round?.status !== 'ACTIVE') throw r.fail(409, 'El sorteo está detenido');
      // Compare-and-set by round and draw count rejects duplicate and stale clicks.
      if (body.roundId !== round.id || body.expectedCount !== round.balls.length) throw r.fail(409, 'La partida cambió. Actualizando bolillas');
      await db.bingoRound.update({ where: { id: round.id }, data: { balls: [...round.balls, r.draw(round.balls)] } });
    } else if (action === 'close') {
      if (!round || !['ACTIVE', 'RESOLVING'].includes(round.status)) throw r.fail(409, 'No hay ronda por cerrar');
      await db.bingoRound.update({ where: { id: round.id }, data: { status: round.winners.length ? 'CLOSED' : 'CANCELLED', closedAt: new Date() } });
      await db.bingoRoom.update({ where: { id: current.id }, data: { status: 'BETWEEN' } });
    } else if (action === 'finish') {
      if (round && ['ACTIVE', 'RESOLVING'].includes(round.status)) await db.bingoRound.update({ where: { id: round.id }, data: { status: round.winners.length ? 'CLOSED' : 'CANCELLED', closedAt: new Date() } });
      await db.bingoRoom.update({ where: { id: current.id }, data: { status: 'FINISHED' } });
    } else throw r.fail(400, 'Acción inválida');
    let updated = await room(db, code);
    if (updated.guestId) {
      await db.bingoRoom.update({ where: { id: current.id }, data: retention.activity(updated.status) });
      updated = await room(db, code);
    }
    return { room: adminView(updated) };
  });
}
async function claim(code, body) {
  return locked(code, async (db, current) => {
    const p = await participant(db, current.id, body?.token), round = current.rounds.at(-1);
    if (current.status !== 'PLAYING' || !round || !['ACTIVE', 'RESOLVING'].includes(round.status) || body?.roundId !== round.id) throw r.fail(409, 'Esta ronda no admite reclamaciones');
    const winningCard = p.cards.find(c => r.wins(c, round.balls, round.pattern));
    if (!winningCard) return { valid: false, message: 'Todavía no completas el patrón con las bolillas sorteadas en ninguno de tus cartones. ¡Sigue jugando!' };
    const winners = round.winners.some(w => w.id === p.id) ? round.winners : [...round.winners, { id: p.id, name: p.name, ball: round.balls.at(-1) }];
    await db.bingoRound.update({ where: { id: round.id }, data: { winners, status: 'RESOLVING' } });
    return { valid: true, message: '¡Bingo válido! El sorteo está detenido. Esperamos las demás reclamaciones.' };
  });
}
async function authorize(db, current, identity) {
  if (current.guestId) {
    const token = r.token(identity?.adminToken);
    const guest = await db.bingoGuest.findUnique({ where: { id: current.guestId } });
    if (!guest || guest.adminHash !== r.hash(token)) throw r.fail(403, 'Acceso de organizador inválido o revocado');
  } else {
    if (typeof identity !== 'string') throw r.fail(403, 'Esta sala ahora se administra desde su cuenta');
    await access(db, identity, current.workspaceId);
    if (current.ownerId !== identity) throw r.fail(403, 'Esta sala pertenece a otro organizador');
  }
}
module.exports = { list, create, state, join, manage, claim, access, locked, view, adminView, authorize, include };
