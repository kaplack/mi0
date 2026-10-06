const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL is not defined');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : undefined,
});

module.exports = pool;
