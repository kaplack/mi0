const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const service = require('../qr-catalog/service');

const run = fn => async (req, res, next) => {
  try {
    res.json({ ok: true, ...await fn(req) });
  } catch (error) {
    next(error);
  }
};

function getAuth(req) {
  const adminToken = req.headers['x-admin-token'] || req.query.token || req.query.key;
  if (req.auth?.user?.id) return { userId: req.auth.user.id, adminToken };
  if (adminToken) return { adminToken };
  return null;
}

function resolveOptionalAuth(req, res, next) {
  if (req.headers.authorization) {
    return requireAuth(req, res, next);
  }
  next();
}

function requireAuthOrGuest(req, res, next) {
  const adminToken = req.headers['x-admin-token'] || req.query.token || req.query.key;
  if (adminToken) {
    req.adminToken = adminToken;
  }
  if (req.headers.authorization) {
    return requireAuth(req, res, (err) => {
      if (err) {
        if (adminToken) return next();
        return next(err);
      }
      return next();
    });
  }
  if (adminToken) {
    return next();
  }
  return res.status(401).json({ error: 'Se requiere autenticación o llave de administración' });
}

function image(manager, kind) {
  return async (req, res, next) => {
    try {
      const auth = getAuth(req);
      const file = await service.readImage(req.params.code, kind || req.params.imageId, manager ? auth : null);
      res.set({
        'Content-Type': file.type,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store'
      }).send(await req.app.locals.storage.read(file.key));
    } catch (error) {
      next(error);
    }
  };
}

router.get('/check-slug/:slug', run(req => service.checkSlug(req.params.slug, req.query.workspaceId)));
router.get('/by-space/:slug', run(req => service.publicBySlug(req.params.slug)));
router.get('/public/:code', run(req => service.publicCatalog(req.params.code)));

router.get('/public/:code/images/:imageId', image(false));
router.get('/public/:code/banner', image(false, 'banner'));
router.get('/preview/:code/banner', resolveOptionalAuth, image(true, 'banner'));
router.get('/public/:code/logo', image(false, 'logo'));
router.get('/preview/:code/images/:imageId', resolveOptionalAuth, image(true));
router.get('/preview/:code/logo', resolveOptionalAuth, image(true, 'logo'));

router.post('/guest/create', run(req => service.guestCreate(req.body)));
router.post('/:workspaceId/attach', requireAuth, run(req => service.attach(req.auth.user.id, req.params.workspaceId, req.body)));

router.use(requireAuthOrGuest);

router.post('/:workspaceId/link-request', run(req => {
  if (!req.auth?.user?.id) throw new Error('Debes vincular tu cuenta para solicitar un cambio de enlace');
  return require('../qr-catalog/linkRequests').request(req.auth.user.id, req.params.workspaceId, req.body);
}));

router.get('/:workspaceId', run(req => service.get(getAuth(req), req.params.workspaceId)));
router.put('/:workspaceId', run(req => service.saveSettings(getAuth(req), req.params.workspaceId, req.body)));
router.post('/:workspaceId/categories', run(req => service.saveCategory(getAuth(req), req.params.workspaceId, req.body)));
router.put('/:workspaceId/categories/:id', run(req => service.saveCategory(getAuth(req), req.params.workspaceId, req.body, req.params.id)));
router.delete('/:workspaceId/categories/:id', run(req => service.deleteCategory(getAuth(req), req.params.workspaceId, req.params.id)));
router.post('/:workspaceId/products', run(req => service.saveProduct(getAuth(req), req.params.workspaceId, req.body)));
router.put('/:workspaceId/products/:id', run(req => service.saveProduct(getAuth(req), req.params.workspaceId, req.body, req.params.id)));
router.delete('/:workspaceId/products/:id', run(req => service.deleteProduct(getAuth(req), req.params.workspaceId, req.params.id, req.app.locals.storage)));

const raw = express.raw({ type: ['image/png', 'image/jpeg', 'image/webp'], limit: '5mb' });
router.post('/:workspaceId/banner', raw, run(req => service.upload(getAuth(req), req.params.workspaceId, null, req.body, req.app.locals.storage, 'banner')));
router.delete('/:workspaceId/banner', run(req => service.removeLogo(getAuth(req), req.params.workspaceId, req.app.locals.storage, 'banner')));
router.post('/:workspaceId/logo', raw, run(req => service.upload(getAuth(req), req.params.workspaceId, null, req.body, req.app.locals.storage)));
router.delete('/:workspaceId/logo', run(req => service.removeLogo(getAuth(req), req.params.workspaceId, req.app.locals.storage)));
router.post('/:workspaceId/products/:id/images', raw, run(req => service.upload(getAuth(req), req.params.workspaceId, req.params.id, req.body, req.app.locals.storage)));
router.delete('/:workspaceId/images/:id', run(req => service.removeImage(getAuth(req), req.params.workspaceId, req.params.id, req.app.locals.storage)));

module.exports = router;
