const crypto = require('node:crypto');
const prisma = require('../prisma');
const v = require('./validation');
const { access } = require('./access');
const hash = token => crypto.createHash('sha256').update(token).digest('hex');
const lock = (tx, workspaceId) => tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'cita:' + workspaceId}::text))`;
async function invitation(db, token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw v.fail(404, 'Invitación no encontrada');
  const record = await db.citaInvitation.findUnique({ where: { tokenHash: hash(token) }, include: { clinic: { include: { workspace: { select: { status: true } } } }, professional: true } });
  if (!record || record.clinic.workspace.status !== 'ACTIVE' || !record.professional.active) throw v.fail(404, 'Invitación no disponible');
  if (record.status !== 'PENDING' || record.expiresAt <= new Date()) throw v.fail(410, 'La invitación venció, fue cancelada o ya se aceptó. Pide un nuevo enlace');
  return record;
}
async function info(token) {
  const r = await invitation(prisma, token);
  return { name: r.clinic.name, professionalName: r.professional.name, email: r.email, expiresAt: r.expiresAt };
}
async function managerTransaction(userId, workspaceId, callback) {
  await access(userId, workspaceId, true);
  return prisma.$transaction(async tx => {
    await lock(tx, workspaceId); await access(userId, workspaceId, true, tx);
    const clinic = await tx.citaClinic.findUnique({ where: { workspaceId } });
    if (!clinic) throw v.fail(404, 'Configura primero el consultorio');
    return callback(tx, clinic);
  });
}
async function create(userId, workspaceId, professionalId, body) {
  v.id(professionalId);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw v.fail(400, 'Ingresa un correo válido');
  return managerTransaction(userId, workspaceId, async (tx, clinic) => {
    const professional = await tx.citaProfessional.findFirst({ where: { id: professionalId, clinicId: clinic.id, active: true } });
    if (!professional) throw v.fail(404, 'Profesional activo no disponible');
    if (await tx.citaProfessionalAccess.findFirst({ where: { professionalId, active: true } })) throw v.fail(409, 'Este profesional ya tiene acceso. Retíralo antes de invitar otra cuenta');
    const account = await tx.user.findUnique({ where: { email } });
    if (account) {
      const membership = await tx.membership.findUnique({ where: { userId_workspaceId: { userId: account.id, workspaceId } } });
      if (membership && ['OWNER', 'ADMIN'].includes(membership.role)) throw v.fail(409, 'Esta cuenta ya administra el workspace. Invita una cuenta de profesional');
      const assignment = await tx.citaProfessionalAccess.findUnique({ where: { clinicId_userId: { clinicId: clinic.id, userId: account.id } } });
      if (assignment?.active && assignment.professionalId !== professionalId) throw v.fail(409, 'Esta cuenta ya está vinculada a otro profesional');
    }
    const reserved = await tx.citaInvitation.findFirst({ where: { clinicId: clinic.id, email, professionalId: { not: professionalId }, status: 'PENDING', expiresAt: { gt: new Date() } } });
    if (reserved) throw v.fail(409, 'Este correo ya tiene una invitación para otro profesional');
    await tx.citaInvitation.updateMany({ where: { professionalId, status: 'PENDING' }, data: { status: 'REVOKED' } });
    const token = crypto.randomBytes(32).toString('hex'); const expiresAt = new Date(Date.now() + 7 * 86400000);
    await tx.citaInvitation.upsert({ where: { clinicId_email: { clinicId: clinic.id, email } }, create: { clinicId: clinic.id, professionalId, email, tokenHash: hash(token), expiresAt }, update: { professionalId, tokenHash: hash(token), expiresAt, status: 'PENDING', acceptedAt: null, createdAt: new Date() } });
    return { token, expiresAt };
  });
}
async function list(userId, workspaceId) {
  await access(userId, workspaceId, true);
  const clinic = await prisma.citaClinic.findUnique({ where: { workspaceId } });
  if (!clinic) throw v.fail(404, 'Configura primero el consultorio');
  const [assignments, invitations] = await Promise.all([
    prisma.citaProfessionalAccess.findMany({ where: { clinicId: clinic.id, active: true }, select: { id: true, professionalId: true, user: { select: { email: true, name: true } } } }),
    prisma.citaInvitation.findMany({ where: { clinicId: clinic.id, status: 'PENDING' }, select: { id: true, professionalId: true, email: true, expiresAt: true } })
  ]);
  return { assignments, invitations };
}
async function revoke(userId, workspaceId, professionalId) {
  v.id(professionalId);
  return managerTransaction(userId, workspaceId, async (tx, clinic) => {
    if (!await tx.citaProfessional.findFirst({where:{id:professionalId,clinicId:clinic.id}})) throw v.fail(404, 'Profesional no disponible');
    await tx.citaProfessionalAccess.updateMany({ where: { clinicId: clinic.id, professionalId }, data: { active: false } });
    await tx.citaInvitation.updateMany({ where: { clinicId: clinic.id, professionalId, status: 'PENDING' }, data: { status: 'REVOKED' } });
    return { ok: true };
  });
}
async function accept(userId, token) {
  const pending = await invitation(prisma, token);
  return prisma.$transaction(async tx => {
    await lock(tx, pending.clinic.workspaceId);
    const record = await invitation(tx, token);
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== 'ACTIVE' || user.email.toLowerCase() !== record.email) throw v.fail(403, 'Inicia sesión con el correo de la invitación');
    const workspaceId = record.clinic.workspaceId;
    const membership = await tx.membership.findUnique({ where: { userId_workspaceId: { userId, workspaceId } } });
    if (membership && ['OWNER', 'ADMIN'].includes(membership.role)) throw v.fail(409, 'Esta cuenta ya administra el workspace');
    const previous = await tx.citaProfessionalAccess.findUnique({ where: { clinicId_userId: { clinicId: record.clinicId, userId } } });
    const occupied = await tx.citaProfessionalAccess.findFirst({ where: { professionalId: record.professionalId, active: true, userId: { not: userId } } });
    if (occupied || (previous?.active && previous.professionalId !== record.professionalId)) throw v.fail(409, 'El acceso ya está asignado. Contacta al administrador');
    await tx.membership.upsert({ where: { userId_workspaceId: { userId, workspaceId } }, create: { userId, workspaceId, role: 'MEMBER' }, update: {} });
    await tx.citaProfessionalAccess.upsert({ where: { clinicId_userId: { clinicId: record.clinicId, userId } }, create: { clinicId: record.clinicId, userId, professionalId: record.professionalId }, update: { professionalId: record.professionalId, active: true } });
    await tx.citaInvitation.update({ where: { id: record.id }, data: { status: 'ACCEPTED', acceptedAt: new Date() } });
    return { workspaceId, professionalId: record.professionalId };
  });
}
module.exports = { info, create, list, revoke, accept };
