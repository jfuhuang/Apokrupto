const express = require('express');
const pool = require('../db');
const authenticateToken = require('../middleware/auth');
const { broadcastLobbyUpdate, addFakeConnection, broadcastPointsUpdate } = require('../websocket/lobbySocket');
const { getTask } = require('../data/tasks');

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

// Get current user's active lobby membership
router.get('/current', async (req, res) => {
  try {
    const userId = req.user.sub;

    const result = await pool.query(`
      SELECT lp.lobby_id as id, l.name, l.status, lp.role
      FROM lobby_players lp
      JOIN lobbies l ON l.id = lp.lobby_id
      WHERE lp.user_id = $1 AND l.status IN ('waiting', 'in_progress')
      LIMIT 1
    `, [userId]);

    res.json({ lobby: result.rows[0] || null });
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

// Complete a task
router.post('/:id/tasks/complete', async (req, res) => {
  const { id } = req.params;
  const userId = req.user.sub;
  const { taskId } = req.body;

  if (!taskId) return res.status(400).json({ error: 'taskId is required' });

  const taskDef = getTask(taskId);
  if (!taskDef) return res.status(400).json({ error: 'Unknown task' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify game is in progress
    const lobbyResult = await client.query(
      'SELECT status FROM lobbies WHERE id = $1',
      [id]
    );
    if (lobbyResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Lobby not found' });
    }
    if (lobbyResult.rows[0].status !== 'in_progress') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Game is not in progress' });
    }

    // 2. Verify player is in lobby and get is_alive
    const playerResult = await client.query(
      'SELECT is_alive FROM lobby_players WHERE lobby_id = $1 AND user_id = $2',
      [id, userId]
    );
    if (playerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not in this lobby' });
    }
    const isAlive = playerResult.rows[0].is_alive;

    // 3. Calculate points
    const pointsEarned = isAlive ? taskDef.points.alive : taskDef.points.dead;

    // 4. Insert completion record (unique constraint catches duplicates)
    try {
      await client.query(
        `INSERT INTO player_task_completions (lobby_id, user_id, task_id, points_earned)
         VALUES ($1, $2, $3, $4)`,
        [id, userId, taskId, pointsEarned]
      );
    } catch (err) {
      if (err.code === '23505') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Task already completed' });
      }
      throw err;
    }

    // 5. Update player points
    const updateResult = await client.query(
      `UPDATE lobby_players SET points = points + $1
       WHERE lobby_id = $2 AND user_id = $3
       RETURNING points`,
      [pointsEarned, id, userId]
    );
    const totalPoints = updateResult.rows[0].points;

    // 6. Build leaderboard for the socket event
    const leaderboardResult = await client.query(
      `SELECT u.id AS user_id, u.username, lp.points
       FROM lobby_players lp
       JOIN users u ON u.id = lp.user_id
       WHERE lp.lobby_id = $1
       ORDER BY lp.points DESC`,
      [id]
    );
    const leaderboard = leaderboardResult.rows;

    await client.query('COMMIT');

    // 7. Broadcast via socket
    broadcastPointsUpdate(id, {
      userId,
      username: req.user.username,
      taskId,
      pointsEarned,
      totalPoints,
      leaderboard,
    });

    res.json({ pointsEarned, totalPoints, taskId });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[tasks/complete] error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
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
        `SELECT l.id, l.max_players, l.status,
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
      // Append a unique suffix so the global users.username unique constraint
      // is never violated by leftover rows from previous lobbies
      const username = `Bot_${base}_${suffix}`;

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

      // Mark dummy as "connected" so they appear online in the lobby UI
      addFakeConnection(id, dummy.id);

      // Push live update to anyone already in the room
      await broadcastLobbyUpdate(id);
      console.log(`[DEV] Added dummy player ${username} to lobby ${id}`);

      res.json({ player: dummy });
    } catch (err) {
      console.error('[DEV] add-dummy error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });
}

module.exports = router;
