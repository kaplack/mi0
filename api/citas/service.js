const crypto = require('node:crypto');
const prisma = require('../prisma');
const v = require('./validation');
const { access, scopeProfessional } = require('./access');
const { parts, dayBounds, bookableDate, availableSlots, nextDay } = require('./availability');
const professionalInclude = { schedules: { orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }] } };
const receiptView = a => ({ status: a.status, startsAt: a.startsAt, endsAt: a.endsAt, expiresAt: a.expiresAt });
async function publicClinic(code, db = prisma) {
  if (typeof code !== 'string' || !/^[a-f0-9]{24}$/.test(code)) throw v.fail(404, 'Consultorio no disponible');
  const clinic = await db.citaClinic.findUnique({ where: { code }, include: { workspace: { select: { status: true } } } });
  if (!clinic || clinic.workspace.status !== 'ACTIVE') throw v.fail(404, 'Consultorio no disponible');
  return clinic;
}
async function expirePending(db = prisma, clinicId, now = new Date()) {
  // expiresAt is always at/before startsAt, including in manual mode.
  return db.citaAppointment.updateMany({ where: { ...(clinicId ? { clinicId } : {}), status: 'PENDING', expiresAt: { lte: now } }, data: { status: 'EXPIRED', expiredAt: now } });
}
async function locked(workspaceId, callback) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${ 'cita:' + workspaceId }::text))`;
    const clinic = await tx.citaClinic.findUnique({ where: { workspaceId }, include: { workspace: { select: { status: true } } } });
    if (!clinic || clinic.workspace.status !== 'ACTIVE') throw v.fail(404, 'Configura primero el consultorio');
    const now = new Date();
    await expirePending(tx, clinic.id, now);
    return callback(tx, clinic, now);
  }, { timeout: 10000 });
}
async function slots(db, clinic, professionalId, day, now) {
  v.id(professionalId);
  bookableDate(day, clinic.timezone, now);
  const professional = await db.citaProfessional.findFirst({ where: { id: professionalId, clinicId: clinic.id, active: true }, include: professionalInclude });
  if (!professional) throw v.fail(404, 'Profesional no disponible');
  const { first, last } = dayBounds(day, clinic.timezone);
  const occupied = await db.citaAppointment.findMany({ where: { clinicId: clinic.id, professionalId, startsAt: { lt: last }, endsAt: { gt: first }, status: { in: ['PENDING', 'CONFIRMED'] } }, select: { startsAt: true, endsAt: true, expiresAt: true, status: true } });
  return availableSlots(professional, day, clinic.timezone, occupied, now);
}
async function publicInfo(code) {
  const clinic = await publicClinic(code);
  const professionals = await prisma.citaProfessional.findMany({ where: { clinicId: clinic.id, active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, specialty: true, durationMinutes: true } });
  return { name: clinic.name, timezone: clinic.timezone, requireDni: clinic.requireDni, today: parts(new Date(), clinic.timezone).date, professionals };
}
async function publicSlots(code, professionalId, day) {
  const clinic = await publicClinic(code);
  await expirePending(prisma, clinic.id);
  return { slots: await slots(prisma, clinic, professionalId, day, new Date()) };
}
async function reserve(code, body) {
  const clinic = await publicClinic(code);
  const professionalId = v.id(body?.professionalId);
  const requestKey = v.id(body?.requestKey);
  if (requestKey[14] !== '4') throw v.fail(400, 'Identificador de solicitud inválido');
  if (body?.website) throw v.fail(400, 'No pudimos enviar la solicitud');
  const startsAt = v.start(body?.startsAt);
  try {
    return await locked(clinic.workspaceId, async (tx, current, now) => {
      const previous = await tx.citaAppointment.findUnique({ where: { requestKey } });
      const identity = v.patient(body, previous ? previous.dni !== null : current.requireDni);
      if (previous) {
        if (previous.clinicId !== current.id || previous.professionalId !== professionalId || previous.startsAt.getTime() !== startsAt.getTime() || previous.patientName !== identity.patientName || previous.phone !== identity.phone) throw v.fail(409, 'La solicitud ya fue utilizada. Actualiza el formulario');
        return { receipt: receiptView(previous) };
      }
      const day = parts(startsAt, current.timezone).date;
      const available = await slots(tx, current, professionalId, day, now);
      const chosen = available.find(slot => slot.startsAt.getTime() === startsAt.getTime());
      if (!chosen) throw v.fail(409, 'Este horario acaba de ocuparse o ya no está disponible. Elige otro');
      const pending = await tx.citaAppointment.count({ where: { clinicId: current.id, phone: identity.phone, status: 'PENDING' } });
      const recent = await tx.citaAppointment.count({ where: { clinicId: current.id, phone: identity.phone, createdAt: { gte: new Date(now.getTime() - 86400000) } } });
      if (pending >= 3 || recent >= 20) throw v.fail(429, 'Ya tienes varias solicitudes. Contacta al consultorio para continuar');
      const expiresAt = new Date(Math.min(startsAt.getTime(), current.expirationHours ? now.getTime() + current.expirationHours * 3600000 : startsAt.getTime()));
      const appointment = await tx.citaAppointment.create({ data: { clinicId: current.id, professionalId, requestKey, ...identity, startsAt, endsAt: chosen.endsAt, expiresAt } });
      return { receipt: receiptView(appointment) };
    });
  } catch (error) {
    if (error.code === 'P2002' || error.meta?.code === '23P01') throw v.fail(409, 'Este horario acaba de ocuparse. Elige otro');
    throw error;
  }
}
async function receipt(code, requestKey) {
  v.id(requestKey);
  const clinic = await publicClinic(code);
  await expirePending(prisma, clinic.id);
  const found = await prisma.citaAppointment.findFirst({ where: { clinicId: clinic.id, requestKey } });
  if (!found) throw v.fail(404, 'Solicitud no disponible');
  return { receipt: receiptView(found) };
}
async function workspaces(userId) {
  const memberships = await prisma.membership.findMany({ where: { userId, workspace: { status: 'ACTIVE' } }, orderBy: { createdAt: 'asc' }, include: { workspace: { include: { citaClinic: { include: { accesses: { where: { userId }, select: { active: true } } } } } } } });
  const visible = memberships.filter(m => ['OWNER', 'ADMIN'].includes(m.role) || !m.workspace.citaClinic?.accesses.some(a => !a.active));
  return { workspaces: visible.map(m => ({ id: m.workspaceId, name: m.workspace.citaClinic?.name || m.workspace.name, role: m.role, configured: Boolean(m.workspace.citaClinic) })) };
}
async function workspace(userId, workspaceId) {
  const membership = await access(userId, workspaceId);
  const clinic = await prisma.citaClinic.findUnique({ where: { workspaceId } });
  const professionals = clinic ? await prisma.citaProfessional.findMany({ where: { clinicId: clinic.id, ...(membership.professionalId ? { id: membership.professionalId } : {}) }, include: professionalInclude, orderBy: [{ active: 'desc' }, { name: 'asc' }] }) : [];
  return { role: membership.role, accessRole: membership.accessRole, professionalId: membership.professionalId, clinic, professionals, today: parts(new Date(), clinic?.timezone || 'America/Lima').date };
}
async function saveSettings(userId, workspaceId, body) {
  const data = v.settings(body);
  await access(userId, workspaceId, true);
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${ 'cita:' + workspaceId }::text))`;
    await access(userId, workspaceId, true, tx);
    const clinic = await tx.citaClinic.upsert({ where: { workspaceId }, update: data, create: { workspaceId, ...data, code: crypto.randomBytes(12).toString('hex') } });
    const module = await tx.module.findUnique({ where: { code: 'mi-cita' } });
    if (module?.active) await tx.workspaceModule.upsert({ where: { workspaceId_moduleId: { workspaceId, moduleId: module.id } }, update: { active: true }, create: { workspaceId, moduleId: module.id } });
    return { clinic };
  });
}
async function saveProfessional(userId, workspaceId, professionalId, body) {
  await access(userId, workspaceId, true);
  if (professionalId) v.id(professionalId);
  const { schedules, ...data } = v.professional(body);
  return locked(workspaceId, async (tx, clinic, now) => {
    await access(userId, workspaceId, true, tx);
    if (professionalId && !await tx.citaProfessional.findFirst({ where: { id: professionalId, clinicId: clinic.id } })) throw v.fail(404, 'Profesional no disponible');
    const futureAppointments = professionalId ? await tx.citaAppointment.count({ where: { clinicId: clinic.id, professionalId, status: { in: ['PENDING', 'CONFIRMED'] }, endsAt: { gt: now } } }) : 0;
    const saved = professionalId
      ? await tx.citaProfessional.update({ where: { id: professionalId }, data: { ...data, schedules: { deleteMany: {}, create: schedules } }, include: professionalInclude })
      : await tx.citaProfessional.create({ data: { clinicId: clinic.id, ...data, schedules: { create: schedules } }, include: professionalInclude });
    return { professional: saved, futureAppointments };
  });
}
async function agenda(userId, workspaceId, query) {
  const membership = await access(userId, workspaceId);
  const clinic = await prisma.citaClinic.findUnique({ where: { workspaceId } });
  if (!clinic) throw v.fail(404, 'Configura primero el consultorio');
  await expirePending(prisma, clinic.id);
  const now = new Date();
  const pending = query?.pending === 'true';
  let bounds;
  if (!pending) bounds = dayBounds(v.date(query?.date ?? parts(now, clinic.timezone).date), clinic.timezone);
  const professionalId = scopeProfessional(membership, query?.professionalId);
  const cursor = query?.cursor ? v.id(query.cursor) : undefined;
  const appointments = await prisma.citaAppointment.findMany({
    where: { clinicId: clinic.id, ...(professionalId ? { professionalId } : {}), ...(pending ? { status: 'PENDING', expiresAt: { gt: now } } : { startsAt: { gte: bounds.first, lt: bounds.last } }) },
    include: { professional: { select: { name: true, specialty: true, active: true } } },
    orderBy: [{ startsAt: 'asc' }, { id: 'asc' }], take: 101, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const visible = appointments.slice(0, 100).map(({ requestKey, ...a }) => a);
  return { appointments: visible, nextCursor: appointments.length > 100 ? visible[99].id : null };
}
async function daySummary(userId, workspaceId, query = {}) {
  const membership = await access(userId, workspaceId);
  const range = query.days ?? '7';
  if (!['7', '30'].includes(range)) throw v.fail(400, 'Elige próximos 7 días o próximos 30 días');
  const clinic = await prisma.citaClinic.findUnique({ where: { workspaceId } });
  if (!clinic) throw v.fail(404, 'Configura primero el consultorio');
  const professionalId = scopeProfessional(membership, query.professionalId);
  if (professionalId && !await prisma.citaProfessional.findFirst({ where: { id: professionalId, clinicId: clinic.id }, select: { id: true } })) throw v.fail(404, 'Profesional no disponible');
  const now = new Date();
  await expirePending(prisma, clinic.id, now);
  const today = parts(now, clinic.timezone).date;
  const days = [];
  for (let day = today; days.length < Number(range); day = nextDay(day)) days.push({ date: day, confirmed: 0, pending: 0, total: 0 });
  const first = dayBounds(today, clinic.timezone).first;
  const last = dayBounds(days.at(-1).date, clinic.timezone).last;
  // Aggregate in PostgreSQL: no patient fields, and no daily pagination limit.
  const counts = await prisma.$queryRaw`
    SELECT to_char("starts_at" AT TIME ZONE ${clinic.timezone}, 'YYYY-MM-DD') AS "date",
      (count(*) FILTER (WHERE "status" = 'CONFIRMED'))::int AS "confirmed",
      (count(*) FILTER (WHERE "status" = 'PENDING'))::int AS "pending"
    FROM "cita_appointments"
    WHERE "clinic_id" = ${clinic.id}::uuid
      AND "starts_at" >= ${first} AND "starts_at" < ${last}
      AND (${professionalId}::uuid IS NULL OR "professional_id" = ${professionalId}::uuid)
      AND ("status" = 'CONFIRMED' OR ("status" = 'PENDING' AND "expires_at" > ${now}))
    GROUP BY 1
  `;
  const byDate = new Map(counts.map(row => [row.date, row]));
  return { today, timezone: clinic.timezone, days: days.map(day => {
    const row = byDate.get(day.date);
    return row ? { date: day.date, confirmed: row.confirmed, pending: row.pending, total: row.confirmed + row.pending } : day;
  }) };
}
async function transition(userId, workspaceId, appointmentId, action) {
  await access(userId, workspaceId);
  v.id(appointmentId);
  if (!['CONFIRMED', 'CANCELLED'].includes(action)) throw v.fail(400, 'Selecciona confirmar o cancelar');
  return locked(workspaceId, async (tx, clinic, now) => {
    const membership = await access(userId, workspaceId, false, tx);
    const appointment = await tx.citaAppointment.findFirst({ where: { id: appointmentId, clinicId: clinic.id, ...(membership.professionalId ? { professionalId: membership.professionalId } : {}) } });
    if (!appointment) throw v.fail(404, 'Cita no disponible');
    if (appointment.status === action) return { appointment };
    if (appointment.status === 'EXPIRED') return { conflict: 'Esta solicitud venció y liberó el horario. El paciente debe solicitar una nueva cita' };
    if (appointment.startsAt <= now) return { conflict: 'La cita ya comenzó; no se puede cambiar su estado' };
    const allowed = action === 'CONFIRMED' ? ['PENDING'] : ['PENDING', 'CONFIRMED'];
    if (!allowed.includes(appointment.status)) return { conflict: 'La cita ya cambió de estado. Actualiza la agenda' };
    const result = await tx.citaAppointment.updateMany({ where: { id: appointmentId, status: { in: allowed }, ...(action === 'CONFIRMED' ? { expiresAt: { gt: now } } : {}) }, data: { status: action, ...(action === 'CONFIRMED' ? { confirmedAt: now } : { cancelledAt: now }) } });
    if (!result.count) return { conflict: 'La solicitud venció o cambió de estado. Actualiza la agenda' };
    return { appointment: await tx.citaAppointment.findUnique({ where: { id: appointmentId } }) };
  }).then(result => { if (result.conflict) throw v.fail(409, result.conflict); const { requestKey, ...appointment } = result.appointment; return { appointment }; });
}
module.exports = { publicInfo, publicSlots, reserve, receipt, workspaces, workspace, saveSettings, saveProfessional, agenda, daySummary, transition, expirePending };
