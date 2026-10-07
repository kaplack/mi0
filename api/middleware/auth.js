const prisma = require('../prisma');
const { hashSessionToken } = require('../auth/session');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [type, token] = header.split(' ');

    if (type !== 'Bearer' || !token) {
      return res.status(401).json({ ok: false, message: 'No autenticado' });
    }

    const session = await prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      return res.status(401).json({ ok: false, message: 'Sesión inválida o vencida' });
    }

    if (session.user.status !== 'ACTIVE') {
      return res.status(403).json({ ok: false, message: 'Usuario inactivo' });
    }

    req.auth = { token, session, user: session.user };
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { requireAuth };
