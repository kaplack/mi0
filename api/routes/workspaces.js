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

module.exports = router;
