const express = require('express');
const prisma = require('../prisma');
const { verifyPassword } = require('../auth/password');
const { createSessionToken, hashSessionToken, sessionExpiry } = require('../auth/session');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
  };
}

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ ok: false, message: 'Email y contraseña son obligatorios' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.status !== 'ACTIVE' || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ ok: false, message: 'Credenciales inválidas' });
    }

    const token = createSessionToken();

    await prisma.session.create({
      data: {
        tokenHash: hashSessionToken(token),
        userId: user.id,
        expiresAt: sessionExpiry(),
      },
    });

    res.json({ ok: true, token, user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ ok: true, user: publicUser(req.auth.user) });
});

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    await prisma.session.update({
      where: { id: req.auth.session.id },
      data: { revokedAt: new Date() },
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
