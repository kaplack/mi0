const express = require('express');
const prisma = require('../prisma');
const { hashPassword, verifyPassword } = require('../auth/password');
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

async function startSession(userId) {
  const token = createSessionToken();

  await prisma.session.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt: sessionExpiry(),
    },
  });

  return token;
}

router.post('/register', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const lastName = String(req.body.lastName || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!name || !lastName || !email || !password) {
      return res.status(400).json({ ok: false, message: 'Completa todos los campos' });
    }

    if (password.length < 10) {
      return res.status(400).json({ ok: false, message: 'La contraseña debe tener al menos 10 caracteres' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return res.status(409).json({ ok: false, message: 'Ya existe una cuenta con este correo' });
    }

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name,
          lastName,
          email,
          passwordHash: hashPassword(password),
          role: 'USER',
          status: 'ACTIVE',
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          name: 'Mi espacio',
          type: 'PERSONAL',
          status: 'ACTIVE',
        },
      });

      await tx.membership.create({
        data: {
          userId: createdUser.id,
          workspaceId: workspace.id,
          role: 'OWNER',
        },
      });

      return createdUser;
    });

    const token = await startSession(user.id);

    res.status(201).json({ ok: true, token, user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

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

    const token = await startSession(user.id);

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
