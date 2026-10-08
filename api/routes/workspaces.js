const express = require('express');
const prisma = require('../prisma');
const { requireAuth } = require('../middleware/auth');
const { access } = require('../raffles/service');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const memberships = await prisma.membership.findMany({
      where: { userId: req.auth.user.id },
      orderBy: { createdAt: 'asc' },
      include: {
        workspace: {
          include: {
            citaClinic: { select: { name: true, accesses: { where: { userId: req.auth.user.id, active: true }, select: { id: true } } } },
            turnQueue: { select: { name: true, operators: { where: { userId: req.auth.user.id }, select: { counter: true } } } },
            modules: {
              where: { active: true },
              include: { module: true },
            },
          },
        },
      },
    });

    const workspaces = memberships
      .filter(({ workspace }) => workspace.status === 'ACTIVE')
      .map(({ role, workspace }) => ({
        id: workspace.id,
        name: workspace.name === 'Mi espacio' ? workspace.citaClinic?.name || workspace.turnQueue?.name || workspace.name : workspace.name,
        type: workspace.type,
        role,
        accessLabel: role === 'OWNER' ? 'Propietario' : role === 'ADMIN' ? 'Administrador invitado' : workspace.citaClinic?.accesses.length ? 'Profesional' : workspace.turnQueue?.operators.length ? 'Operador' : 'Acceso invitado',
        modules: workspace.modules
          .filter(({ module }) => module.active)
          .map(({ module }) => ({
            id: module.id,
            code: module.code,
            name: module.name,
            description: module.description,
          })),
      }));

    res.json({ ok: true, workspaces });
  } catch (error) {
    next(error);
  }
});


router.post('/:workspaceId/modules/:moduleCode', async (req, res, next) => {
  try {
    await access(prisma, req.auth.user.id, req.params.workspaceId, true);

    const module = await prisma.module.findUnique({
      where: { code: req.params.moduleCode },
    });

    if (!module || !module.active) {
      return res.status(404).json({ ok: false, message: 'Microapp no disponible' });
    }

    const workspaceModule = await prisma.workspaceModule.upsert({
      where: {
        workspaceId_moduleId: {
          workspaceId: req.params.workspaceId,
          moduleId: module.id,
        },
      },
      update: { active: true },
      create: {
        workspaceId: req.params.workspaceId,
        moduleId: module.id,
        active: true,
      },
    });

    res.status(201).json({
      ok: true,
      workspaceModule,
      module: {
        id: module.id,
        code: module.code,
        name: module.name,
        description: module.description,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
