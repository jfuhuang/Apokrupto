const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if input fields are valid
    if (!username || !password) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    // Check if user exists
    const checkQuery = `SELECT id FROM users WHERE username = $1`;
    const checkResult = await pool.query(checkQuery, [username]);

    if (checkResult.rows.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Hash password and store username and hashed password into database
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at`,
      [username, hashed]
    );
    const user = result.rows[0];

    // Return the username and JWT
    const token = jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      username: user.username,
      token
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if input fields are valid
    if (!username || !password) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    // Check if user exists
    const q = `SELECT id, username, password_hash FROM users WHERE username = $1`;
    const result = await pool.query(q, [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Compare password with hashed password
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Return JWT and username
    const token = jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      username: user.username,
      token
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
