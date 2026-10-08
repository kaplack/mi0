require('dotenv').config({ quiet: true });

const express = require('express');
const prisma = require('./prisma');
const { bucket, checkS3Connection } = require('./s3');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const workspaceRoutes = require('./routes/workspaces');
const raffleRoutes = require('./routes/raffles');
const turnRoutes = require('./routes/turnos');

const app = express();


const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  if (req.method === 'OPTIONS') {
    if (!origin || !allowedOrigins.includes(origin)) {
      return res.sendStatus(403);
    }
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/raffles', raffleRoutes);
app.use('/api/turnos', require('./routes/turno-operators'));
app.use('/api/turnos', require('./routes/turno-dashboard'));
app.use('/api/turnos', turnRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    ok: true,
    service: 'mi0-api',
  });
});

app.get('/api/db-health', async (req, res) => {
  try {
    const result = await prisma.$queryRaw`SELECT NOW() AS now`;

    res.status(200).json({
      ok: true,
      database: 'connected',
      orm: 'prisma',
      time: result[0].now,
    });
  } catch (error) {
    console.error('Database connection error:', error.message);

    res.status(500).json({
      ok: false,
      database: 'error',
    });
  }
});

app.get('/api/s3-health', async (req, res) => {
  try {
    await checkS3Connection();

    res.status(200).json({
      ok: true,
      storage: 'connected',
      bucket,
    });
  } catch (error) {
    console.error('S3 connection error:', error.message);

    res.status(500).json({
      ok: false,
      storage: 'error',
    });
  }
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.status || (error.code === 'P2002' ? 409 : 500);
  const message = error.code === 'P2002' ? 'Ya existe un registro con estos datos o referencia de pago' : status < 500 ? error.message : 'No pudimos completar la operación. Intenta nuevamente';
  if (status >= 500) console.error('API error:', error.code || error.name);
  res.status(status).json({ ok: false, message });
});


module.exports = app;
