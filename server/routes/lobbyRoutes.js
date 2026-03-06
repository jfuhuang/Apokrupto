const express = require('express');
const pool = require('../db');
const authenticateToken = require('../middleware/auth');
const { GM_USERNAMES, ADMIN_USERNAMES } = require('../utils/config');
const logger = require('../utils/logger');
const { broadcastLobbyUpdate, addFakeConnection, broadcastPointsUpdate, broadcastPlayerKicked } = require('../websocket/lobbySocket');
const { getTask } = require('../data/tasks');

const router = express.Router();

// All lobby routes require authentication
router.use(authenticateToken);

// Admin-only middleware
function requireAdmin(req, res, next) {
  if (!ADMIN_USERNAMES.has(req.user.username)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Get all active lobbies
router.get('/', async (req, res) => {
  try {
    const showAll = req.query.all === 'true' && ADMIN_USERNAMES.has(req.user.username);
    const result = await pool.query(`
      SELECT
        l.id,
        l.name,
        l.max_players,
        l.created_by,
        l.created_at,
        l.status,
        u.username as host_username,
        COUNT(lp.user_id) as current_players,
        g.id as game_id
      FROM lobbies l
      LEFT JOIN users u ON l.created_by = u.id
      LEFT JOIN lobby_players lp ON l.id = lp.lobby_id
      LEFT JOIN games g ON g.lobby_id = l.id AND g.status = 'active'
      ${showAll ? '' : "WHERE l.status = 'waiting'"}
      GROUP BY l.id, u.username, g.id
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
    logger.info('lobby', `GET /lobbies/current — user=${req.user.username}`);

    const result = await pool.query(`
      SELECT lp.lobby_id as id, l.name, l.status, lp.role,
             gp.team,
             (l.created_by = $1::int) as is_gm,
             g.id as game_id
      FROM lobby_players lp
      JOIN lobbies l ON l.id = lp.lobby_id
      LEFT JOIN games g ON g.lobby_id = l.id AND g.status = 'active'
      LEFT JOIN game_players gp ON gp.game_id = g.id AND gp.user_id = $1
      WHERE lp.user_id = $1 AND l.status IN ('waiting', 'in_progress')
      LIMIT 1
    `, [userId]);

    if (!result.rows[0]) return res.json({ lobby: null });
    const row = result.rows[0];
    // When GM_USERNAMES is configured, only listed users are GM; otherwise fall back to host=GM
    const isGm = GM_USERNAMES.size > 0
      ? GM_USERNAMES.has(req.user.username)
      : (row.is_gm === true || row.is_gm === 't');
    res.json({
      lobby: {
        id:     row.id,
        name:   row.name,
        status: row.status,
        role:   row.role,
        team:   row.team || null,
        isGm,
        gameId: row.game_id ? String(row.game_id) : null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get lobby by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logger.info('lobby', `GET /lobbies/${id} — user=${req.user.username}`);
    
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
    logger.info('lobby', `POST /lobbies — user=${req.user.username} name="${name}" max=${max_players}`);
    
    // Validate input
    if (!name || !max_players) {
      return res.status(400).json({ error: 'Name and max_players are required' });
    }
    
    if (max_players < 5 || max_players > 200) {
      return res.status(400).json({ error: 'Max players must be between 5 and 200' });
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
    if (err.code === '23503') {
      return res.status(401).json({ error: 'Account not found — please log in again' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Join a lobby
router.post('/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.sub;
    logger.info('lobby', `POST /lobbies/${id}/join — user=${req.user.username}`);
    
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
    
    // Broadcast the update to all players in the room
    await broadcastLobbyUpdate(id);
    
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
        hostId: lobby.created_by,
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
    logger.info('lobby', `POST /lobbies/${id}/leave — user=${req.user.username}`);
    
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
        await client.query('COMMIT');
        res.json({ message: 'Successfully left lobby', lobbyClosed: true });
      } else {
        await client.query('COMMIT');
        // Broadcast the update to remaining players
        await broadcastLobbyUpdate(id);
        res.json({ message: 'Successfully left lobby' });
      }
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
  logger.info('lobby', `POST /lobbies/${id}/tasks/complete — user=${req.user.username} taskId=${taskId}`);

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

    // 6. Build leaderboard and total innocent points for the socket event
    const leaderboardResult = await client.query(
      `SELECT u.id AS user_id, u.username, lp.points, lp.role
       FROM lobby_players lp
       JOIN users u ON u.id = lp.user_id
       WHERE lp.lobby_id = $1
       ORDER BY lp.points DESC`,
      [id]
    );
    const leaderboard = leaderboardResult.rows;
    const totalInnocentPoints = leaderboard
      .filter((r) => r.role === 'innocent')
      .reduce((sum, r) => sum + parseInt(r.points), 0);

    await client.query('COMMIT');

    // 7. Broadcast via socket
    broadcastPointsUpdate(id, {
      userId,
      username: req.user.username,
      taskId,
      pointsEarned,
      totalPoints,
      totalInnocentPoints,
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

// ADMIN — add a throwaway dummy player to a lobby for testing
{
  const BOT_NAMES = [
    'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo',
    'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet',
  ];

  router.post('/:id/add-dummy', requireAdmin, async (req, res) => {
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
      console.log(`[ADMIN] Added dummy player ${username} to lobby ${id} (by ${req.user.username})`);

      res.json({ player: dummy });
    } catch (err) {
      console.error('[DEV] add-dummy error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Kick a player — host can kick from their own waiting lobby; admins can kick anywhere
  router.post('/:id/kick/:userId', async (req, res) => {
    const { id, userId } = req.params;
    const requesterId = String(req.user.sub);
    const isAdmin = ADMIN_USERNAMES.has(req.user.username);

    if (String(userId) === requesterId && !isAdmin) {
      return res.status(400).json({ error: 'Cannot kick yourself' });
    }

    const client = await pool.connect();
    try {
      // Verify lobby and check host permission
      const lobbyResult = await client.query(
        'SELECT created_by, status FROM lobbies WHERE id = $1',
        [id]
      );
      if (lobbyResult.rows.length === 0) {
        return res.status(404).json({ error: 'Lobby not found' });
      }
      const lobby = lobbyResult.rows[0];
      const isHost = String(lobby.created_by) === requesterId;

      if (!isAdmin && !isHost) {
        return res.status(403).json({ error: 'Only the host or an admin can kick players' });
      }
      if (!isAdmin && lobby.status !== 'waiting') {
        return res.status(400).json({ error: 'Cannot kick during an active game' });
      }

      await client.query('BEGIN');

      const deleteResult = await client.query(
        'DELETE FROM lobby_players WHERE lobby_id = $1 AND user_id = $2 RETURNING id',
        [id, userId]
      );
      if (deleteResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Player not in this lobby' });
      }

      // Remove guest accounts (no password_hash) — they can never log in again
      await client.query(
        'DELETE FROM users WHERE id = $1 AND password_hash IS NULL',
        [userId]
      );

      // Delete lobby if now empty
      const remaining = await client.query(
        'SELECT COUNT(*) as count FROM lobby_players WHERE lobby_id = $1',
        [id]
      );
      const empty = parseInt(remaining.rows[0].count) === 0;
      if (empty) {
        await client.query('DELETE FROM lobbies WHERE id = $1', [id]);
      }

      await client.query('COMMIT');

      broadcastPlayerKicked(id, userId);
      if (!empty) await broadcastLobbyUpdate(id);
      console.log(`[kick] User ${userId} kicked from lobby ${id} by ${req.user.username}`);

      res.json({ ok: true, lobbyClosed: empty });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('[kick] error:', err);
      res.status(500).json({ error: 'Server error' });
    } finally {
      client.release();
    }
  });
}

// Force-end an in-progress game — admin only
router.post('/:id/force-end', requireAdmin, async (req, res) => {
  const { id } = req.params;
  logger.info('lobby', `POST /lobbies/${id}/force-end — user=${req.user.username}`);
  try {
    const { getIO } = require('../websocket/io');
    const { cleanupGameData } = require('../services/gameService');

    // Find active game(s) for this lobby before updating
    const gRes = await pool.query(
      "SELECT id FROM games WHERE lobby_id = $1 AND status = 'active'",
      [id]
    );

    // Mark any active game for this lobby as completed
    await pool.query(
      `UPDATE games SET status = 'completed', winner = NULL, win_condition = NULL
       WHERE lobby_id = $1 AND status = 'active'`,
      [id]
    );

    // Cleanup heavy data for each active game
    for (const { id: gId } of gRes.rows) {
      await cleanupGameData(String(gId)).catch((err) =>
        console.error(`[force-end] cleanup error for game ${gId} (non-fatal):`, err.message)
      );
    }

    // Reset lobby status to waiting so it can be reused
    await pool.query(
      `UPDATE lobbies SET status = 'waiting' WHERE id = $1`,
      [id]
    );

    const io = getIO();
    if (io) {
      io.to(`lobby:${id}`).emit('gameOver', { winner: null, reason: 'Force ended by admin' });
    }

    console.log(`[admin] force-end lobby ${id} by ${req.user.username}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[force-end] error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
