const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../db');
const { getIO } = require('../websocket/lobbySocket');

// GET /api/games/:gameId/gm-state
// Returns team points, player list, and current game state.
// Queries new game tables when they exist; returns zeroed placeholder in the meantime.
router.get('/:gameId/gm-state', auth, async (req, res) => {
  const { gameId } = req.params;
  const empty = {
    players: [],
    gameState: { round: null, totalRounds: null, movement: null, status: 'waiting' },
    teamPoints: { phos: 0, skotia: 0 },
  };

  try {
    // Query game tables (will throw if tables don't exist yet)
    const gameRes = await db.query(
      `SELECT g.id, g.status, g.total_rounds,
              r.round_number AS current_round,
              m.movement_type AS movement
       FROM games g
       LEFT JOIN rounds r ON r.game_id = g.id AND r.status = 'active'
       LEFT JOIN movements m ON m.round_id = r.id AND m.status = 'active'
       WHERE g.id = $1`,
      [gameId]
    );
    if (gameRes.rows.length === 0) return res.json(empty);

    const game = gameRes.rows[0];

    const playersRes = await db.query(
      `SELECT u.id, u.username, gt.team, gp.is_marked
       FROM game_players gp
       JOIN users u ON u.id = gp.user_id
       JOIN game_teams gt ON gt.id = gp.game_team_id
       WHERE gp.game_id = $1
       ORDER BY gt.team, u.username`,
      [gameId]
    );

    const pointsRes = await db.query(
      `SELECT gt.team, SUM(gp.points) AS total
       FROM game_players gp
       JOIN game_teams gt ON gt.id = gp.game_team_id
       WHERE gp.game_id = $1
       GROUP BY gt.team`,
      [gameId]
    );

    const teamPoints = { phos: 0, skotia: 0 };
    for (const row of pointsRes.rows) {
      if (row.team === 'phos' || row.team === 'skotia') {
        teamPoints[row.team] = parseInt(row.total, 10);
      }
    }

    res.json({
      players: playersRes.rows.map((p) => ({
        id: p.id,
        username: p.username,
        team: p.team,
        isMarked: p.is_marked,
      })),
      gameState: {
        round: game.current_round,
        totalRounds: game.total_rounds,
        movement: game.movement,
        status: game.status,
      },
      teamPoints,
    });
  } catch (err) {
    // Tables likely don't exist yet — return empty state gracefully
    if (err.code === '42P01') return res.json(empty); // undefined_table
    console.error('[GM] gm-state error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/games/:gameId/broadcast
// Emits an announcement to all players in the lobby room.
// Body: { message: string, lobbyId: string }
router.post('/:gameId/broadcast', auth, async (req, res) => {
  const { message, lobbyId } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }
  if (!lobbyId) {
    return res.status(400).json({ error: 'lobbyId is required' });
  }

  try {
    const io = getIO();
    if (io) {
      io.to(`lobby:${lobbyId}`).emit('announcement', {
        message: message.trim(),
        from: 'GM',
        at: Date.now(),
      });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[GM] broadcast error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
