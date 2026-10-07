const express = require('express');
const prisma = require('../prisma');
const { requireAuth } = require('../middleware/auth');

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
        name: workspace.name,
        type: workspace.type,
        role,
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
    const membership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: req.auth.user.id,
          workspaceId: req.params.workspaceId,
        },
      },
    });

    if (!membership) {
      return res.status(404).json({ ok: false, message: 'Espacio no encontrado' });
    }

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
