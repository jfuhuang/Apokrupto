const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');
const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        user: process.env.POSTGRES_USER,
        host: process.env.POSTGRES_HOST || '127.0.0.1',
        database: process.env.POSTGRES_DB,
        password: process.env.POSTGRES_PASSWORD != null ? String(process.env.POSTGRES_PASSWORD) : undefined,
        port: process.env.POSTGRES_PORT ? Number(process.env.POSTGRES_PORT) : 5432,
      }
);

// Test the connection but keep the pool open for the app to use.
pool.query('SELECT NOW()')
  .then(res => console.log('Connected! Server time:', res.rows[0].now))
  .catch(err => console.error('Connection failed:', err));

module.exports = pool;