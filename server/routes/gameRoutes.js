const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const db      = require('../db');
const {
  createGame,
  startGame,
  advanceMovement,
  getPlayerState,
  getGroupTurnState,
  setGroupTurnState,
  clearTurnTimeout,
  scheduleTurnTimeout,
  scheduleBotSubmitIfNeeded,
} = require('../services/gameService');
const { getIO } = require('../websocket/lobbySocket');

// ---------------------------------------------------------------------------
// POST /api/games
// Create a game record linked to a lobby. Body: { lobbyId, totalRounds? }
// ---------------------------------------------------------------------------
router.post('/', auth, async (req, res) => {
  const { lobbyId, totalRounds } = req.body;
  if (!lobbyId) return res.status(400).json({ error: 'lobbyId is required' });

  try {
    // Verify user is the host of this lobby
    const lobbyRes = await db.query(
      'SELECT created_by, status FROM lobbies WHERE id = $1',
      [lobbyId]
    );
    if (lobbyRes.rows.length === 0) return res.status(404).json({ error: 'Lobby not found' });
    if (String(lobbyRes.rows[0].created_by) !== String(req.user.sub)) {
      return res.status(403).json({ error: 'Only the host can create a game' });
    }
    if (lobbyRes.rows[0].status !== 'waiting') {
      return res.status(400).json({ error: 'Lobby is not in waiting state' });
    }

    const gameId = await createGame(lobbyId, totalRounds || 4);
    res.status(201).json({ gameId });
  } catch (err) {
    console.error('[POST /games]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/games/:gameId/start
// Start the game: assign teams + groups, start round 1 Movement A.
// Emits roleAssigned (per socket) + movementStart (lobby broadcast).
// ---------------------------------------------------------------------------
router.post('/:gameId/start', auth, async (req, res) => {
  const { gameId } = req.params;

  try {
    // Verify caller is the lobby host
    const gameRes = await db.query(
      `SELECT g.lobby_id, l.created_by
       FROM games g JOIN lobbies l ON l.id = g.lobby_id
       WHERE g.id = $1`,
      [gameId]
    );
    if (gameRes.rows.length === 0) return res.status(404).json({ error: 'Game not found' });
    if (String(gameRes.rows[0].created_by) !== String(req.user.sub)) {
      return res.status(403).json({ error: 'Only the host can start the game' });
    }

    const result = await startGame(gameId);
    const { playerTeams, playerGroups, skotiaPlayers, groups, lobbyId } = result;

    // Emit per-player roleAssigned + movementStart
    const io = getIO();
    if (io) {
      const roomKey = `lobby:${String(lobbyId)}`;
      const skotiaUsernames = skotiaPlayers.map((p) => p.username);

      for (const [, sock] of io.sockets.sockets) {
        if (!sock.rooms.has(roomKey)) continue;
        const uid  = sock.userId;
        const team = playerTeams.get(uid);
        if (!team) continue;

        const groupInfo = playerGroups.get(uid);
        const rolePayload = {
          team,
          skotiaTeammates: team === 'skotia'
            ? skotiaUsernames.filter((name) => name !== sock.username)
            : [],
          groupId:      String(groupInfo?.groupId ?? ''),
          groupNumber:  groupInfo?.groupIndex ?? null,
          groupMembers: groupInfo?.members ?? [],
        };
        sock.emit('roleAssigned', rolePayload);
      }

      // Broadcast gameStarted + movementStart to the lobby room
      io.to(roomKey).emit('gameStarted', { gameId, countdown: 5 });
      io.to(roomKey).emit('movementStart', { movement: 'A', roundNumber: 1 });
    }

    res.json({ ok: true, gameId, groupCount: groups.length });
  } catch (err) {
    console.error('[POST /games/:id/start]', err.message);
    res.status(400).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/games/:gameId/advance
// GM advances the movement/round state machine.
// Emits appropriate socket events to the lobby and group rooms.
// ---------------------------------------------------------------------------
router.post('/:gameId/advance', auth, async (req, res) => {
  const { gameId } = req.params;

  try {
    // Verify caller is the lobby host
    const gameRes = await db.query(
      `SELECT g.lobby_id, l.created_by
       FROM games g JOIN lobbies l ON l.id = g.lobby_id
       WHERE g.id = $1`,
      [gameId]
    );
    if (gameRes.rows.length === 0) return res.status(404).json({ error: 'Game not found' });
    if (String(gameRes.rows[0].created_by) !== String(req.user.sub)) {
      return res.status(403).json({ error: 'Only the GM can advance the game' });
    }

    const result = await advanceMovement(gameId);
    _emitAdvanceEvents(result);

    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[POST /games/:id/advance]', err.message);
    res.status(400).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/games/:gameId/state
// Returns the calling player's current game state.
// ---------------------------------------------------------------------------
router.get('/:gameId/state', auth, async (req, res) => {
  const { gameId } = req.params;
  const userId = req.user.sub;

  try {
    const state = await getPlayerState(gameId, userId);
    if (!state) return res.status(404).json({ error: 'Player not found in this game' });
    res.json(state);
  } catch (err) {
    console.error('[GET /games/:id/state]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/games/:gameId/gm-state
// Full game state for GM dashboard (team points, all players, current movement).
// ---------------------------------------------------------------------------
router.get('/:gameId/gm-state', auth, async (req, res) => {
  const { gameId } = req.params;
  const empty = {
    players:   [],
    gameState: { round: null, totalRounds: null, movement: null, status: 'waiting' },
    teamPoints: { phos: 0, skotia: 0 },
  };

  try {
    const gameRes = await db.query(
      `SELECT g.id, g.status, g.total_rounds, g.current_round,
              m.movement_type AS movement
       FROM games g
       LEFT JOIN rounds r    ON r.game_id = g.id AND r.status = 'active'
       LEFT JOIN movements m ON m.round_id = r.id AND m.status = 'active'
       WHERE g.id = $1`,
      [gameId]
    );
    if (gameRes.rows.length === 0) return res.json(empty);
    const game = gameRes.rows[0];

    const [playersRes, ptsRes, groupsRes] = await Promise.all([
      db.query(
        `SELECT u.id, u.username, gp.team, gp.is_marked
         FROM game_players gp
         JOIN users u ON u.id = gp.user_id
         WHERE gp.game_id = $1
         ORDER BY gp.team, u.username`,
        [gameId]
      ),
      db.query(
        'SELECT team, points FROM game_teams WHERE game_id = $1',
        [gameId]
      ),
      game.current_round
        ? db.query(
            `SELECT gg.id AS group_id, gg.group_index,
                    ggm.user_id, u.username, gp.team, gp.is_marked
             FROM game_groups gg
             JOIN game_group_members ggm ON ggm.group_id = gg.id
             JOIN users u ON u.id = ggm.user_id
             JOIN game_players gp ON gp.game_id = gg.game_id AND gp.user_id = ggm.user_id
             WHERE gg.game_id = $1 AND gg.round_number = $2
             ORDER BY gg.group_index, u.username`,
            [gameId, game.current_round]
          )
        : Promise.resolve({ rows: [] }),
    ]);

    const teamPoints = { phos: 0, skotia: 0 };
    ptsRes.rows.forEach((r) => { teamPoints[r.team] = r.points; });

    // Build groups array from flat rows
    const groupMap = new Map();
    groupsRes.rows.forEach((row) => {
      if (!groupMap.has(row.group_id)) {
        groupMap.set(row.group_id, { groupId: String(row.group_id), groupIndex: row.group_index, members: [] });
      }
      groupMap.get(row.group_id).members.push({
        id:       String(row.user_id),
        username: row.username,
        team:     row.team,
        isMarked: row.is_marked,
      });
    });
    const groups = Array.from(groupMap.values()).sort((a, b) => a.groupIndex - b.groupIndex);

    res.json({
      players: playersRes.rows.map((p) => ({
        id:       String(p.id),
        username: p.username,
        team:     p.team,
        isMarked: p.is_marked,
      })),
      groups,
      gameState: {
        round:       game.current_round,
        totalRounds: game.total_rounds,
        movement:    game.movement,
        status:      game.status,
      },
      teamPoints,
    });
  } catch (err) {
    if (err.code === '42P01') return res.json(empty); // table not found
    console.error('[GM] gm-state error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/games/:gameId/movement-a/prompt
// Returns the team-specific prompt for this player's current group + turn state.
// ---------------------------------------------------------------------------
router.get('/:gameId/movement-a/prompt', auth, async (req, res) => {
  const { gameId } = req.params;
  const userId = req.user.sub;

  try {
    // Get player's team
    const playerRes = await db.query(
      'SELECT team FROM game_players WHERE game_id = $1 AND user_id = $2',
      [gameId, userId]
    );
    if (playerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found in this game' });
    }
    const { team } = playerRes.rows[0];

    // Get player's current group
    const groupRes = await db.query(
      `SELECT gg.id AS group_id
       FROM game_group_members ggm
       JOIN game_groups gg ON gg.id = ggm.group_id
       JOIN games g ON g.id = gg.game_id
       WHERE gg.game_id = $1 AND ggm.user_id = $2 AND gg.round_number = g.current_round`,
      [gameId, userId]
    );
    if (groupRes.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found for current round' });
    }
    const groupId = String(groupRes.rows[0].group_id);

    // Get turn state and prompt
    const turnState = getGroupTurnState(groupId);
    if (!turnState) {
      return res.status(404).json({ error: 'Turn state not initialised for this group' });
    }

    const promptRes = await db.query(
      'SELECT phos_prompt, skotia_prompt, theme_label FROM prompts WHERE id = $1',
      [turnState.promptId]
    );
    if (promptRes.rows.length === 0) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    const prompt = promptRes.rows[0];
    const promptText = team === 'skotia' ? prompt.skotia_prompt : prompt.phos_prompt;

    res.json({
      prompt:       promptText,
      themeLabel:   prompt.theme_label,
      currentPlayerId: String(turnState.turnOrder[turnState.currentIndex]),
      completedCount:  turnState.completedCount,
      totalCount:      turnState.turnOrder.length,
      timeLimit:       30,
    });
  } catch (err) {
    console.error('[GET movement-a/prompt]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/games/:gameId/movement-a/submit
// Submit a word for Movement A. Advances turn order, emits turnStart or
// deliberationStart to the group's socket room.
// ---------------------------------------------------------------------------
router.post('/:gameId/movement-a/submit', auth, async (req, res) => {
  const { gameId }    = req.params;
  const userId        = req.user.sub;
  const { word }      = req.body;

  if (!word || !word.trim()) {
    return res.status(400).json({ error: 'word is required' });
  }

  try {
    // Get player's current group
    const groupRes = await db.query(
      `SELECT gg.id AS group_id
       FROM game_group_members ggm
       JOIN game_groups gg ON gg.id = ggm.group_id
       JOIN games g ON g.id = gg.game_id
       WHERE gg.game_id = $1 AND ggm.user_id = $2 AND gg.round_number = g.current_round`,
      [gameId, userId]
    );
    if (groupRes.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    const groupId = String(groupRes.rows[0].group_id);

    // Validate turn
    const turnState = getGroupTurnState(groupId);
    if (!turnState) {
      return res.status(400).json({ error: 'Movement A is not active for your group' });
    }
    const expectedId = String(turnState.turnOrder[turnState.currentIndex]);
    if (String(userId) !== expectedId) {
      return res.status(400).json({ error: 'Not your turn' });
    }

    // Get active Movement A id
    const movRes = await db.query(
      `SELECT m.id
       FROM movements m
       JOIN rounds r ON r.id = m.round_id
       JOIN games g  ON g.id = r.game_id
       WHERE g.id = $1 AND r.status = 'active' AND m.movement_type = 'A' AND m.status = 'active'`,
      [gameId]
    );
    if (movRes.rows.length === 0) {
      return res.status(400).json({ error: 'No active Movement A for this game' });
    }
    const movementId = movRes.rows[0].id;

    // Store submission
    await db.query(
      `INSERT INTO movement_a_submissions (movement_id, group_id, user_id, word)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (movement_id, user_id) DO UPDATE SET word = EXCLUDED.word`,
      [movementId, groupId, userId, word.trim()]
    );

    // Cancel the existing auto-advance timer for this turn
    clearTurnTimeout(groupId);

    // Advance turn state
    const newIndex     = turnState.currentIndex + 1;
    const newCompleted = turnState.completedCount + 1;
    const io           = getIO();

    // Info about the word just submitted (sent to group with turnStart/deliberationStart)
    const lastWord = {
      userId:   String(userId),
      username: req.user.username,
      word:     word.trim(),
    };

    if (newCompleted >= turnState.turnOrder.length) {
      // All submitted — fetch attributed word list and emit deliberationStart
      const wordsRes = await db.query(
        `SELECT mas.word, mas.user_id, u.username
         FROM movement_a_submissions mas
         JOIN users u ON u.id = mas.user_id
         WHERE mas.movement_id = $1 AND mas.group_id = $2
         ORDER BY mas.submitted_at ASC`,
        [movementId, groupId]
      );
      const words = wordsRes.rows.map((r) => ({
        userId:   String(r.user_id),
        username: r.username,
        word:     r.word,
      }));

      setGroupTurnState(groupId, {
        ...turnState,
        currentIndex:   newIndex,
        completedCount: newCompleted,
      });

      if (io) {
        io.to(`lobby:${groupId}`).emit('deliberationStart', { words, lastWord });
      }
      return res.json({ ok: true, phase: 'deliberation', words });
    }

    // More turns to go — stamp start time and schedule next auto-advance
    const now = Date.now();
    setGroupTurnState(groupId, {
      ...turnState,
      currentIndex:   newIndex,
      completedCount: newCompleted,
      turnStartedAt:  now,
    });

    const nextPlayerId = String(turnState.turnOrder[newIndex]);
    if (io) {
      io.to(`lobby:${groupId}`).emit('turnStart', {
        currentPlayerId: nextPlayerId,
        turnIndex:       newIndex,
        completedCount:  newCompleted,
        timeLimit:       30,
        lastWord,
      });
    }
    scheduleTurnTimeout(groupId, newIndex);
    scheduleBotSubmitIfNeeded(groupId); // auto-submit if next player is a bot

    res.json({ ok: true, phase: 'waiting', nextPlayerId, completedCount: newCompleted });
  } catch (err) {
    console.error('[POST movement-a/submit]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/games/:gameId/movement-c/vote
// Submit (or update) votes for Movement C.
// Body: { votes: { [targetUserId]: 'phos' | 'skotia' } }
// ---------------------------------------------------------------------------
router.post('/:gameId/movement-c/vote', auth, async (req, res) => {
  const { gameId } = req.params;
  const userId     = req.user.sub;
  const { votes }  = req.body;

  if (!votes || typeof votes !== 'object') {
    return res.status(400).json({ error: 'votes object is required' });
  }

  try {
    // Get player's current group
    const groupRes = await db.query(
      `SELECT gg.id AS group_id
       FROM game_group_members ggm
       JOIN game_groups gg ON gg.id = ggm.group_id
       JOIN games g ON g.id = gg.game_id
       WHERE gg.game_id = $1 AND ggm.user_id = $2 AND gg.round_number = g.current_round`,
      [gameId, userId]
    );
    if (groupRes.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    const groupId = groupRes.rows[0].group_id;

    // Get active Movement C id
    const movRes = await db.query(
      `SELECT m.id
       FROM movements m
       JOIN rounds r ON r.id = m.round_id
       JOIN games g  ON g.id = r.game_id
       WHERE g.id = $1 AND r.status = 'active' AND m.movement_type = 'C' AND m.status = 'active'`,
      [gameId]
    );
    if (movRes.rows.length === 0) {
      return res.status(400).json({ error: 'No active Movement C for this game' });
    }
    const movementId = movRes.rows[0].id;

    // Validate targets are all in the same group
    const membersRes = await db.query(
      'SELECT user_id FROM game_group_members WHERE group_id = $1',
      [groupId]
    );
    const memberIds = membersRes.rows.map((r) => String(r.user_id));
    const otherIds  = memberIds.filter((id) => id !== String(userId));

    for (const targetId of Object.keys(votes)) {
      if (!otherIds.includes(String(targetId))) {
        return res.status(400).json({ error: `Target ${targetId} is not in your group` });
      }
      const vote = votes[targetId];
      if (vote !== 'phos' && vote !== 'skotia') {
        return res.status(400).json({ error: `Invalid vote value: ${vote}` });
      }
    }

    // Upsert votes
    for (const [targetId, vote] of Object.entries(votes)) {
      await db.query(
        `INSERT INTO movement_c_votes (movement_id, group_id, voter_id, target_id, vote)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (movement_id, voter_id, target_id) DO UPDATE SET vote = EXCLUDED.vote`,
        [movementId, groupId, userId, targetId, vote]
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[POST movement-c/vote]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/games/:gameId/broadcast
// GM sends an announcement to all players in the lobby room.
// Body: { message, lobbyId }
// ---------------------------------------------------------------------------
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
        at:   Date.now(),
      });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[GM] broadcast error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// Internal helper: emit socket events after advanceMovement
// ---------------------------------------------------------------------------
function _emitAdvanceEvents(result) {
  const io = getIO();
  if (!io) return;

  const lobbyRoom = `lobby:${String(result.lobbyId)}`;

  if (result.gameOver) {
    // Emit per-group votingComplete results (roundSummary embedded for client convenience)
    if (result.groupResults) {
      for (const [gId, actions] of result.groupResults) {
        io.to(`lobby:${gId}`).emit('votingComplete', { markResults: actions, roundSummary: result.summary });
      }
    }
    io.to(lobbyRoom).emit('roundSummary', result.summary);
    io.to(lobbyRoom).emit('gameOver', result.gameOverData);
    return;
  }

  if (result.nextMovement === 'B') {
    io.to(lobbyRoom).emit('movementStart', {
      movement:    'B',
      roundNumber: result.roundNumber,
    });
    return;
  }

  if (result.nextMovement === 'C') {
    io.to(lobbyRoom).emit('movementStart', {
      movement:    'C',
      roundNumber: result.roundNumber,
    });
    return;
  }

  if (result.nextMovement === 'A') {
    // Voting just ended — emit per-group results + round summary
    if (result.groupResults) {
      for (const [gId, actions] of result.groupResults) {
        io.to(`lobby:${gId}`).emit('votingComplete', { markResults: actions, roundSummary: result.summary });
      }
    }
    io.to(lobbyRoom).emit('roundSummary', result.summary);

    // Emit per-player movementStart with new group info
    if (result.newGroups) {
      // Build userId → group map
      const userGroupMap = new Map();
      for (const group of result.newGroups) {
        for (const memberId of group.memberIds) {
          userGroupMap.set(String(memberId), group);
        }
      }

      for (const [, sock] of io.sockets.sockets) {
        if (!sock.rooms.has(lobbyRoom)) continue;
        const group = userGroupMap.get(sock.userId);
        if (!group) continue;

        sock.emit('movementStart', {
          movement:     'A',
          roundNumber:  result.roundNumber,
          totalRounds:  result.totalRounds,
          groupId:      String(group.groupId),
          groupNumber:  group.groupIndex,
          groupMembers: group.members,
          teamPoints:   result.teamPoints,
        });
      }
    }
  }
}

module.exports = router;
