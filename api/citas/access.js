const prisma = require('../prisma');
const v = require('./validation');
async function access(userId, workspaceId, management = false, db = prisma) {
  v.id(workspaceId);
  const membership = await db.membership.findUnique({ where: { userId_workspaceId: { userId, workspaceId } }, include: { workspace: { select: { status: true } } } });
  if (!membership || membership.workspace.status !== 'ACTIVE') throw v.fail(403, 'No tienes acceso a este espacio activo');
  const assignment = await db.citaProfessionalAccess.findFirst({ where: { userId, clinic: { workspaceId } } });
  const isManager = ['OWNER', 'ADMIN'].includes(membership.role);
  if (!isManager && assignment && !assignment.active) throw v.fail(403, 'Tu acceso a Mi Cita fue retirado. Contacta al administrador');
  const professionalId = !isManager && assignment ? assignment.professionalId : null;
  if (management && professionalId) throw v.fail(403, 'Solo el personal de gestión puede realizar esta acción');
  return { ...membership, professionalId, accessRole: professionalId ? 'PROFESSIONAL' : 'MANAGEMENT' };
}
function scopeProfessional(membership, requested) {
  const id = requested ? v.id(requested) : null;
  if (membership.professionalId && id && membership.professionalId !== id) throw v.fail(403, 'Solo puedes consultar tu propia agenda');
  return membership.professionalId || id;
}
module.exports = { access, scopeProfessional };
