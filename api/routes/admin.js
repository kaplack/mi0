const express = require('express');
const prisma = require('../prisma');
const { requireAuth } = require('../middleware/auth');
const { requireSuperadmin } = require('../middleware/superadmin');

const router = express.Router();

router.use(requireAuth, requireSuperadmin);

router.get('/summary', async (req, res, next) => {
  try {
    const [users, businesses, modules] = await Promise.all([
      prisma.user.count(),
      prisma.workspace.count({ where: { type: 'ORGANIZATION' } }),
      prisma.module.count(),
    ]);

    res.json({ ok: true, summary: { users, businesses, modules } });
  } catch (error) {
    next(error);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ ok: true, users });
  } catch (error) {
    next(error);
  }
});

router.get('/businesses', async (req, res, next) => {
  try {
    const workspaces = await prisma.workspace.findMany({
      where: { type: 'ORGANIZATION' },
      include: {
        modules: {
          include: { module: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const businesses = workspaces.map((workspace) => ({
      ...workspace,
      slug: workspace.id,
    }));

    res.json({ ok: true, businesses });
  } catch (error) {
    next(error);
  }
});

router.get('/modules', async (req, res, next) => {
  try {
    const modules = await prisma.module.findMany({
      orderBy: { name: 'asc' },
    });

    res.json({ ok: true, modules });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
