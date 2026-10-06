require('dotenv').config();

const express = require('express');
const db = require('./db');

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

app.listen(PORT, () => {
  console.log(`mi0 API running on http://localhost:${PORT}`);
});
