const jwt = require('jsonwebtoken');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  let user;
  try {
    user = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  // Verify the user still exists in the DB (guards against stale tokens
  // after a DB wipe or account deletion)
  const { rows } = await pool.query('SELECT id FROM users WHERE id = $1', [user.sub]);
  if (rows.length === 0) {
    return res.status(401).json({ error: 'Account not found — please log in again' });
  }

  req.user = user; // { sub: userId, username: 'username' }
  next();
}

module.exports = authenticateToken;
