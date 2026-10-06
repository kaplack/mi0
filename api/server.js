require('dotenv').config();

const express = require('express');
const db = require('./db');
const { bucket, checkS3Connection } = require('./s3');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({
    ok: true,
    service: 'mi0-api',
  });
});

app.get('/api/db-health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW() AS now');

    res.status(200).json({
      ok: true,
      database: 'connected',
      time: result.rows[0].now,
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

app.listen(PORT, () => {
  console.log(`mi0 API running on http://localhost:${PORT}`);
});
