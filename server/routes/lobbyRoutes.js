const express = require('express');
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// All lobby routes require authentication
router.use(authenticateToken);

// Get all active lobbies
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        l.id,
        l.name,
        l.max_players,
        l.created_by,
        l.created_at,
        u.username as host_username,
        COUNT(lp.user_id) as current_players
      FROM lobbies l
      LEFT JOIN users u ON l.created_by = u.id
      LEFT JOIN lobby_players lp ON l.id = lp.lobby_id
      WHERE l.status = 'waiting'
      GROUP BY l.id, u.username
      ORDER BY l.created_at DESC
    `);
    
    res.json({ lobbies: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get lobby by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        l.id,
        l.name,
        l.max_players,
        l.created_by,
        l.status,
        l.created_at,
        u.username as host_username,
        COUNT(lp.user_id) as current_players
      FROM lobbies l
      LEFT JOIN users u ON l.created_by = u.id
      LEFT JOIN lobby_players lp ON l.id = lp.lobby_id
      WHERE l.id = $1
      GROUP BY l.id, u.username
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lobby not found' });
    }
    
    res.json({ lobby: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new lobby
router.post('/', async (req, res) => {
  try {
    const { name, max_players } = req.body;
    const userId = req.user.sub;
    
    // Validate input
    if (!name || !max_players) {
      return res.status(400).json({ error: 'Name and max_players are required' });
    }
    
    if (max_players < 4 || max_players > 15) {
      return res.status(400).json({ error: 'Max players must be between 4 and 15' });
    }
    
    // Create lobby
    const result = await pool.query(`
      INSERT INTO lobbies (name, max_players, created_by, status)
      VALUES ($1, $2, $3, 'waiting')
      RETURNING id, name, max_players, created_by, status, created_at
    `, [name, max_players, userId]);
    
    const lobby = result.rows[0];
    
    // Add creator as first player
    await pool.query(`
      INSERT INTO lobby_players (lobby_id, user_id)
      VALUES ($1, $2)
    `, [lobby.id, userId]);
    
    res.status(201).json({ lobby });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Join a lobby
router.post('/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.sub;
    
    // Check if lobby exists and is joinable
    const lobbyResult = await pool.query(`
      SELECT 
        l.id,
        l.name,
        l.max_players,
        l.status,
        COUNT(lp.user_id) as current_players
      FROM lobbies l
      LEFT JOIN lobby_players lp ON l.id = lp.lobby_id
      WHERE l.id = $1
      GROUP BY l.id
    `, [id]);
    
    if (lobbyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lobby not found' });
    }
    
    const lobby = lobbyResult.rows[0];
    
    if (lobby.status !== 'waiting') {
      return res.status(400).json({ error: 'Lobby is not accepting players' });
    }
    
    if (parseInt(lobby.current_players) >= parseInt(lobby.max_players)) {
      return res.status(400).json({ error: 'Lobby is full' });
    }
    
    // Check if user is already in the lobby
    const playerCheck = await pool.query(`
      SELECT id FROM lobby_players
      WHERE lobby_id = $1 AND user_id = $2
    `, [id, userId]);
    
    if (playerCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Already in this lobby' });
    }
    
    // Add player to lobby
    await pool.query(`
      INSERT INTO lobby_players (lobby_id, user_id)
      VALUES ($1, $2)
    `, [id, userId]);
    
    res.json({ message: 'Successfully joined lobby', lobbyId: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Leave a lobby
router.post('/:id/leave', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.sub;
    
    // Remove player from lobby
    const result = await pool.query(`
      DELETE FROM lobby_players
      WHERE lobby_id = $1 AND user_id = $2
      RETURNING id
    `, [id, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not in this lobby' });
    }
    
    // Check if lobby is now empty, if so delete it
    const remainingPlayers = await pool.query(`
      SELECT COUNT(*) as count FROM lobby_players WHERE lobby_id = $1
    `, [id]);
    
    if (parseInt(remainingPlayers.rows[0].count) === 0) {
      await pool.query(`DELETE FROM lobbies WHERE id = $1`, [id]);
    }
    
    res.json({ message: 'Successfully left lobby' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
