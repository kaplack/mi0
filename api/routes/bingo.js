const router = require('express').Router();
const service = require('../bingo/service');
const guest = require('../bingo/guest');
const { requireAuth } = require('../middleware/auth');
const { rateLimit } = require('../citas/maintenance');
const handle = (fn, status = 200) => async (req, res, next) => {
  try { res.set('Cache-Control', 'no-store').status(status).json(await fn(req)); } catch (error) { next(error); }
};
router.use('/guest', rateLimit({ limit: 1000, windowMs: 60000 }));
router.post('/guest/create', rateLimit({ limit: 10, windowMs: 600000 }), handle(req => guest.create(req.body), 201));
router.post('/guest/current', handle(req => guest.current(req.body)));
router.post('/guest/recover', rateLimit({ limit: 30, windowMs: 600000 }), handle(req => guest.recover(req.body)));
router.post('/guest/:code/recovery', handle(req => guest.recovery(req.params.code, req.body)));
router.post('/guest/:code/:action', handle(req => service.manage({ adminToken: req.body?.adminToken }, req.params.code, req.params.action, req.body)));
// Shared event Wi-Fi may put every participant behind the same IP.
router.use('/public', rateLimit({ limit: 12000, windowMs: 60000 }));
router.get('/public/:code', handle(req => service.state(req.params.code)));
router.post('/public/:code/me', handle(req => service.state(req.params.code, req.body?.token)));
router.post('/public/:code/join', rateLimit({ limit: 120, windowMs: 60000 }), handle(req => service.join(req.params.code, req.body), 201));
router.post('/public/:code/claim', rateLimit({ limit: 300, windowMs: 60000 }), handle(req => service.claim(req.params.code, req.body)));
router.use(requireAuth);
router.get('/', handle(req => service.list(req.auth.user.id, req.query.workspaceId)));
router.post('/', handle(req => service.create(req.auth.user.id, req.body), 201));
router.post('/:code/attach', handle(req => guest.attach(req.auth.user.id, req.params.code, req.body)));
router.get('/:code', handle(req => service.manage(req.auth.user.id, req.params.code, 'info')));
router.post('/:code/:action', handle(req => service.manage(req.auth.user.id, req.params.code, req.params.action, req.body)));
module.exports = router;
