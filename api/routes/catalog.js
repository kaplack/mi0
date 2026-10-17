const router = require('express').Router();
const catalog = require('../catalog/service');
router.get('/', async (req, res, next) => { try { res.json({ ok: true, ...await catalog.publicCatalog() }); } catch (error) { next(error); } });
const profiles = require('../catalog/profiles');
router.get('/:code', async (req, res, next) => { try { res.json({ profile: await profiles.publicDetail(req.params.code) }); } catch (error) { next(error); } });
router.get('/:code/images/:imageId', async (req, res, next) => { try {
  const image = await profiles.readImage(req.params.code, req.params.imageId);
  res.set({ 'Content-Type': image.contentType, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=300' }).send(await req.app.locals.storage.read(image.storageKey));
} catch (error) { next(error); } });
router.get('/:code/icon', async (req, res, next) => { try {
  const prisma = require('../prisma');
  const module = await prisma.module.findFirst({ where: { code: req.params.code, active: true }, select: { iconKey: true } });
  if (!module?.iconKey) return res.status(404).json({ message: 'Icono no disponible' });
  res.set({ 'Content-Type': 'image/png', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' }).send(await req.app.locals.storage.read(module.iconKey));
} catch (error) { next(error); } });
module.exports = router;
