function requireSuperadmin(req, res, next) {
  if (!req.auth || req.auth.user.role !== 'SUPERADMIN') {
    return res.status(403).json({ ok: false, message: 'Acceso exclusivo para Superadmin' });
  }

  next();
}

module.exports = { requireSuperadmin };
