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
      prisma.business.count(),
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
    const businesses = await prisma.business.findMany({
      include: {
        modules: {
          include: { module: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

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
