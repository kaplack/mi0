const express = require('express');
const prisma = require('../prisma');
const { requireAuth } = require('../middleware/auth');
const { requireSuperadmin } = require('../middleware/superadmin');

const router = express.Router();
const catalog = require('../catalog/service');

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
      include: { categories: true },
      orderBy: { name: 'asc' },
    });

    res.json({ ok: true, modules: modules.map(require('../catalog/icons').moduleView) });
  } catch (error) {
    next(error);
  }
});

router.get('/categories', async (req, res, next) => { try { res.json({ categories: await catalog.listCategories() }); } catch (error) { next(error); } });
router.post('/categories', async (req, res, next) => { try { res.status(201).json({ category: await catalog.writeCategory(null, req.body) }); } catch (error) { next(error); } });
router.put('/categories/:id', async (req, res, next) => { try { res.json({ category: await catalog.writeCategory(req.params.id, req.body) }); } catch (error) { next(error); } });
router.delete('/categories/:id', async (req, res, next) => { try { await catalog.deleteCategory(req.params.id); res.json({ ok: true }); } catch (error) { next(error); } });
router.patch('/modules/:id/catalog', async (req, res, next) => { try { res.json({ module: await catalog.updateModule(req.params.id, req.body) }); } catch (error) { next(error); } });
router.patch('/modules/:id/status', async (req, res, next) => { try { res.json({ module: await catalog.setModuleActive(req.params.id, req.body) }); } catch (error) { next(error); } });
const profiles = require('../catalog/profiles');
router.get('/modules/:id/profile', async (req, res, next) => { try { res.json({ profile: await profiles.getById(req.params.id) }); } catch (error) { next(error); } });
router.put('/modules/:id/profile', async (req, res, next) => { try { res.json({ profile: await profiles.save(req.params.id, req.body, req.app.locals.storage) }); } catch (error) { next(error); } });
router.post('/modules/:id/screenshots', express.raw({ type: ['image/png', 'image/jpeg', 'image/webp'], limit: '5mb' }), async (req, res, next) => { try { res.status(201).json({ profile: await profiles.upload(req.params.id, req.body, req.app.locals.storage, req.get('X-Upload-Id')) }); } catch (error) { next(error); } });
router.delete('/modules/:id/screenshots/:imageId', async (req, res, next) => { try { res.json({ profile: await profiles.remove(req.params.id, req.params.imageId, req.app.locals.storage) }); } catch (error) { next(error); } });
router.get('/modules/:id/screenshots/:imageId', async (req, res, next) => { try {
  const profile = await profiles.getById(req.params.id);
  const image = await profiles.readImage(profile.code, req.params.imageId, true);
  res.set({ 'Content-Type': image.contentType, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store' }).send(await req.app.locals.storage.read(image.storageKey));
} catch (error) { next(error); } });
const icons = require('../catalog/icons');
router.put('/modules/:id/icon', express.raw({ type: 'image/png', limit: '2mb' }), async (req, res, next) => { try { res.json({ module: await icons.set(req.params.id, req.body, req.app.locals.storage) }); } catch (error) { next(error); } });
router.delete('/modules/:id/icon', async (req, res, next) => { try { await icons.remove(req.params.id, req.app.locals.storage); res.json({ ok: true }); } catch (error) { next(error); } });
router.get('/modules/:id/icon', async (req, res, next) => { try {
  const module = await icons.get(req.params.id);
  if (!module.iconKey) return res.status(404).json({ message: 'Sin icono personalizado' });
  res.set({ 'Content-Type': 'image/png', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store' }).send(await req.app.locals.storage.read(module.iconKey));
} catch (error) { next(error); } });
module.exports = router;
