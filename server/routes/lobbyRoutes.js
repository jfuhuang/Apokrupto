const express = require('express');
const pool = require('../db');
const authenticateToken = require('../middleware/auth');
const { broadcastLobbyUpdate } = require('../websocket/lobbySocket');

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
    
    // Check if user is already in the lobby — if so, let them back in (reconnect case)
    const playerCheck = await pool.query(`
      SELECT id FROM lobby_players
      WHERE lobby_id = $1 AND user_id = $2
    `, [id, userId]);

    if (playerCheck.rows.length > 0) {
      return res.json({ message: 'Already in lobby', lobbyId: id });
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

// Get players in a lobby
router.get('/:id/players', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT u.id, u.username, (l.created_by = u.id) AS is_host
       FROM lobby_players lp
       JOIN users u ON lp.user_id = u.id
       JOIN lobbies l ON l.id = lp.lobby_id
       WHERE lp.lobby_id = $1
       ORDER BY lp.joined_at ASC`,
      [id]
    );

    const lobbyResult = await pool.query(
      'SELECT id, name, max_players, status, created_by FROM lobbies WHERE id = $1',
      [id]
    );

    if (lobbyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lobby not found' });
    }

    const lobby = lobbyResult.rows[0];

    res.json({
      players: result.rows.map((p) => ({
        id: p.id,
        username: p.username,
        isHost: p.is_host,
      })),
      hostId: lobby.created_by,
      lobbyInfo: {
        id: lobby.id,
        name: lobby.name,
        maxPlayers: lobby.max_players,
        status: lobby.status,
      },
    });
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
    
    // Use a transaction to handle leaving and cleanup atomically
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Remove player from lobby
      const result = await client.query(`
        DELETE FROM lobby_players
        WHERE lobby_id = $1 AND user_id = $2
        RETURNING id
      `, [id, userId]);
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Not in this lobby' });
      }
      
      // Check if lobby is now empty and delete if so
      const remainingPlayers = await client.query(`
        SELECT COUNT(*) as count FROM lobby_players WHERE lobby_id = $1
      `, [id]);
      
      if (parseInt(remainingPlayers.rows[0].count) === 0) {
        await client.query(`DELETE FROM lobbies WHERE id = $1`, [id]);
      }
      
      await client.query('COMMIT');
      res.json({ message: 'Successfully left lobby' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DEV ONLY — add a throwaway dummy player to a lobby for testing
if (process.env.NODE_ENV !== 'production') {
  const BOT_NAMES = [
    'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo',
    'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet',
  ];

  router.post('/:id/add-dummy', async (req, res) => {
    try {
      const { id } = req.params;

      const lobbyResult = await pool.query(
        `SELECT id, max_players, status,
                COUNT(lp.user_id) AS current_players
         FROM lobbies l
         LEFT JOIN lobby_players lp ON lp.lobby_id = l.id
         WHERE l.id = $1
         GROUP BY l.id`,
        [id]
      );

      if (lobbyResult.rows.length === 0) {
        return res.status(404).json({ error: 'Lobby not found' });
      }

      const lobby = lobbyResult.rows[0];

      if (parseInt(lobby.current_players) >= parseInt(lobby.max_players)) {
        return res.status(400).json({ error: 'Lobby is full' });
      }

      // Pick a name not already taken in this lobby
      const takenResult = await pool.query(
        `SELECT u.username
         FROM lobby_players lp
         JOIN users u ON u.id = lp.user_id
         WHERE lp.lobby_id = $1`,
        [id]
      );
      const taken = new Set(takenResult.rows.map((r) => r.username));
      const suffix = Date.now().toString(36).slice(-4).toUpperCase();
      const base = BOT_NAMES.find((n) => !taken.has(`Bot_${n}`)) ?? suffix;
      const username = `Bot_${base}`;

      // Create the throwaway user (null password — can never log in)
      const userResult = await pool.query(
        `INSERT INTO users (username, password_hash)
         VALUES ($1, NULL)
         RETURNING id, username`,
        [username]
      );
      const dummy = userResult.rows[0];

      await pool.query(
        'INSERT INTO lobby_players (lobby_id, user_id) VALUES ($1, $2)',
        [id, dummy.id]
      );

      // Push live update to anyone already in the room
      await broadcastLobbyUpdate(id);

      res.json({ player: dummy });
    } catch (err) {
      console.error('[DEV] add-dummy error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });
}

module.exports = router;
