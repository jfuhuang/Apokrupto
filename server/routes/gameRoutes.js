const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { GM_USERNAMES } = require('../utils/config');
const db      = require('../db');
const {
  POINTS,
  createGame,
  startGame,
  advanceMovement,
  getPlayerState,
  getGroupTurnState,
  setGroupTurnState,
  clearTurnTimeout,
  scheduleTurnTimeout,
  clearRevealTimeout,
  scheduleRevealTimeout,
  clearAllGroupTimersForGame,
  scheduleBotSubmitIfNeeded,
  notifyGroupDeliberationReady,
  clearDeliberationTimer,
  getDeliberationEndsAt,
  clearMovementBTimer,
  clearVotingTimer,
  emitGmTurnUpdate,
  getMovementATurnInfo,
  getMovementBEndsAt,
  getVotingEndsAt,
  initTurnState,
  startTurns,
} = require('../services/gameService');
const { emitAdvanceEvents } = require('../websocket/lobbySocket');
const { getIO } = require('../websocket/io');
const { getTask } = require('../data/tasks');

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

      // Broadcast gameStarted; movementStart A is NOT emitted — GM must activate it
      io.to(roomKey).emit('gameStarted', { gameId, countdown: 5 });
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
    const callerIsGmUser = GM_USERNAMES.has(req.user.username);
    const callerIsHost   = String(gameRes.rows[0].created_by) === String(req.user.sub);
    if (!callerIsGmUser && !callerIsHost) {
      return res.status(403).json({ error: 'Only the GM can advance the game' });
    }

    clearDeliberationTimer(gameId);       // cancel deliberation auto-advance if pending
    clearMovementBTimer(gameId);          // cancel Movement B auto-advance if pending
    clearVotingTimer(gameId);             // cancel voting timer if pending
    clearAllGroupTimersForGame(gameId);   // cancel any pending turn/reveal timers
    const result = await advanceMovement(gameId);
    emitAdvanceEvents(getIO(), result);

    res.json({ ok: true, ...result });
  } catch (err) {
    if (err.message.includes('advanceMovement race:')) {
      console.warn('[POST /games/:id/advance] duplicate ignored:', err.message);
      return res.json({ ok: true, step: 'noop' });
    }
    if (err.message.includes('is already completed')) {
      console.warn('[POST /games/:id/advance] game already completed, ignored:', err.message);
      return res.json({ ok: true, step: 'noop' });
    }
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
    res.json({ ...state, deliberationEndsAt: getDeliberationEndsAt(gameId) });
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
       LEFT JOIN rounds r    ON r.game_id = g.id AND r.status IN ('active', 'summarizing')
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
        isSus: row.is_marked,
      });
    });
    const groups = Array.from(groupMap.values()).sort((a, b) => a.groupIndex - b.groupIndex);

    res.json({
      players: playersRes.rows.map((p) => ({
        id:       String(p.id),
        username: p.username,
        team:     p.team,
        isSus:    p.is_marked,
      })),
      groups,
      gameState: {
        round:       game.current_round,
        totalRounds: game.total_rounds,
        movement:    game.movement,
        status:      game.status,
      },
      teamPoints,
      movATurnInfo: game.movement === 'A' ? getMovementATurnInfo(gameId) : null,
      movementBEndsAt: game.movement === 'B' ? getMovementBEndsAt(gameId) : null,
      votingEndsAt: game.movement === 'C' ? getVotingEndsAt(gameId) : null,
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
      console.warn(`[GET movement-a/prompt] 404 — user ${userId} not in game ${gameId} (no row in game_players)`);
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
      // Dig out what current_round actually is so we can tell if group assignment is missing
      const roundRes = await db.query('SELECT current_round FROM games WHERE id = $1', [gameId]);
      const currentRound = roundRes.rows[0]?.current_round ?? 'unknown';
      console.warn(`[GET movement-a/prompt] 404 — no group for user ${userId} in game ${gameId} round ${currentRound} (game_group_members missing or round mismatch)`);
      return res.status(404).json({ error: 'Group not found for current round' });
    }
    const groupId = String(groupRes.rows[0].group_id);

    // Get turn state — attempt recovery if missing (e.g. server restart while Movement A active,
    // or initTurnState failed on a previous advanceMovement call but the DB COMMIT already ran).
    let turnState = getGroupTurnState(groupId);
    if (!turnState) {
      console.warn(`[GET movement-a/prompt] turn state missing for group ${groupId} (game ${gameId}, user ${userId}) — attempting recovery`);
      try {
        const gameInfoRes = await db.query(
          'SELECT lobby_id, current_round FROM games WHERE id = $1',
          [gameId]
        );
        if (gameInfoRes.rows.length > 0) {
          const { lobby_id: recoveryLobbyId, current_round: roundNumber } = gameInfoRes.rows[0];
          // Build groups array the same shape initTurnState expects
          const allGroupsRes = await db.query(
            `SELECT gg.id AS group_id, gg.group_index,
                    array_agg(ggm.user_id::text ORDER BY ggm.user_id) AS member_ids
             FROM game_groups gg
             JOIN game_group_members ggm ON ggm.group_id = gg.id
             WHERE gg.game_id = $1 AND gg.round_number = $2
             GROUP BY gg.id, gg.group_index
             ORDER BY gg.group_index`,
            [gameId, roundNumber]
          );
          const allGroups = allGroupsRes.rows.map((r) => ({
            groupId:    r.group_id,
            groupIndex: r.group_index,
            memberIds:  r.member_ids,
            members:    r.member_ids.map((id) => ({ id, username: id, isSus: false })),
          }));
          const missingGroups = allGroups.filter((g) => !getGroupTurnState(String(g.groupId)));
          if (missingGroups.length > 0) {
            await initTurnState(missingGroups, gameId, recoveryLobbyId);
            startTurns(missingGroups);
            console.log(`[GET movement-a/prompt] recovery: re-initialised ${missingGroups.length} / ${allGroups.length} group(s) for game ${gameId}`);
          }
        }
      } catch (recoveryErr) {
        console.error(`[GET movement-a/prompt] recovery failed for game ${gameId}:`, recoveryErr.message);
      }
      turnState = getGroupTurnState(groupId);
      if (!turnState) {
        console.warn(`[GET movement-a/prompt] 404 — turn state still null after recovery for group ${groupId} (game ${gameId}, user ${userId})`);
        return res.status(404).json({ error: 'Turn state not initialised for this group' });
      }
    }

    const promptRes = await db.query(
      'SELECT phos_prompt, skotia_prompt, theme_label FROM prompts WHERE id = $1',
      [turnState.promptId]
    );
    if (promptRes.rows.length === 0) {
      console.warn(`[GET movement-a/prompt] 404 — promptId ${turnState.promptId} not found in prompts table (group ${groupId}, game ${gameId})`);
      return res.status(404).json({ error: 'Prompt not found' });
    }

    const prompt = promptRes.rows[0];
    const promptText = team === 'skotia' ? prompt.skotia_prompt : prompt.phos_prompt;

    res.json({
      prompt:          promptText,
      themeLabel:      prompt.theme_label,
      promptMode:      turnState.promptMode || 'word',
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
// Shared helpers for Movement A submission routes
// ---------------------------------------------------------------------------

/** Look up the player's current group for a given game. Returns groupId string or null. */
async function _getPlayerGroupId(gameId, userId) {
  const groupRes = await db.query(
    `SELECT gg.id AS group_id
     FROM game_group_members ggm
     JOIN game_groups gg ON gg.id = ggm.group_id
     JOIN games g ON g.id = gg.game_id
     WHERE gg.game_id = $1 AND ggm.user_id = $2 AND gg.round_number = g.current_round`,
    [gameId, userId]
  );
  return groupRes.rows.length > 0 ? String(groupRes.rows[0].group_id) : null;
}

/** Look up the active Movement A id for a game. Returns id or null. */
async function _getActiveMovementAId(gameId) {
  const movRes = await db.query(
    `SELECT m.id
     FROM movements m
     JOIN rounds r ON r.id = m.round_id
     JOIN games g  ON g.id = r.game_id
     WHERE g.id = $1 AND r.status = 'active' AND m.movement_type = 'A' AND m.status = 'active'`,
    [gameId]
  );
  return movRes.rows.length > 0 ? movRes.rows[0].id : null;
}

/**
 * Shared post-submission logic: emit wordSubmitted, schedule reveal timer,
 * and on reveal: emit turnStart or deliberationStart.
 */
async function _advanceTurnAfterSubmit({ groupId, turnState, movementId, isSketch, submittedUserId, submittedUsername, submittedWord, gameId }) {
  const newIndex     = turnState.currentIndex + 1;
  const newCompleted = turnState.completedCount + 1;
  const io           = getIO();

  const elapsed     = turnState.turnStartedAt ? Date.now() - turnState.turnStartedAt : 0;
  const revealDelay = Math.max(1000, 30000 - elapsed);

  const wordSubmittedPayload = { userId: String(submittedUserId), username: submittedUsername, nextTurnInSeconds: Math.ceil(revealDelay / 1000) };
  if (!isSketch) wordSubmittedPayload.word = submittedWord;
  if (io) io.to(`lobby:${groupId}`).emit('wordSubmitted', wordSubmittedPayload);

  const lastWord = isSketch ? null : { userId: String(submittedUserId), username: submittedUsername, word: submittedWord };

  scheduleRevealTimeout(groupId, revealDelay, async () => {
    const freshState = getGroupTurnState(groupId);
    if (!freshState || freshState.currentIndex !== turnState.currentIndex) return;

    const io2 = getIO();

    if (newCompleted >= turnState.turnOrder.length) {
      setGroupTurnState(groupId, { ...freshState, currentIndex: newIndex, completedCount: newCompleted });

      if (isSketch) {
        const sketchRes = await db.query(
          `SELECT mas.sketch_data, mas.user_id, u.username
           FROM movement_a_submissions mas
           JOIN users u ON u.id = mas.user_id
           WHERE mas.movement_id = $1 AND mas.group_id = $2
           ORDER BY mas.submitted_at ASC`,
          [movementId, groupId]
        );
        const sketches = sketchRes.rows.map((r) => ({
          userId:     String(r.user_id),
          username:   r.username,
          sketchData: r.sketch_data,
        }));
        if (io2) io2.to(`lobby:${groupId}`).emit('deliberationStart', { promptMode: 'sketch', sketches });
      } else {
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
        if (io2) io2.to(`lobby:${groupId}`).emit('deliberationStart', { promptMode: 'word', words, lastWord });
      }

      emitGmTurnUpdate(gameId, turnState.lobbyId, newIndex, turnState.turnOrder.length, 'deliberation', Date.now(), io2);
      notifyGroupDeliberationReady(gameId);
    } else {
      const now = Date.now();
      setGroupTurnState(groupId, { ...freshState, currentIndex: newIndex, completedCount: newCompleted, turnStartedAt: now });
      const nextPlayerId = String(turnState.turnOrder[newIndex]);
      if (io2) {
        io2.to(`lobby:${groupId}`).emit('turnStart', {
          currentPlayerId: nextPlayerId,
          turnIndex:       newIndex,
          completedCount:  newCompleted,
          timeLimit:       30,
          lastWord,
          turnOrder:       turnState.turnOrder.map(String),
        });
      }
      emitGmTurnUpdate(gameId, turnState.lobbyId, newIndex, turnState.turnOrder.length, 'active', now, io2);
      scheduleTurnTimeout(groupId, newIndex);
      scheduleBotSubmitIfNeeded(groupId);
    }
  });
}

// ---------------------------------------------------------------------------
// POST /api/games/:gameId/movement-a/submit/word
// Submit a word for Movement A (word mode only).
// ---------------------------------------------------------------------------
router.post('/:gameId/movement-a/submit/word', auth, async (req, res) => {
  const { gameId } = req.params;
  const userId     = req.user.sub;
  const { word }   = req.body;

  if (!word || !word.trim()) {
    return res.status(400).json({ error: 'word is required' });
  }
  if (word.trim().length > 30) {
    return res.status(400).json({ error: 'word must be 30 characters or fewer' });
  }

  try {
    const groupId = await _getPlayerGroupId(gameId, userId);
    if (!groupId) return res.status(404).json({ error: 'Group not found' });

    const turnState = getGroupTurnState(groupId);
    if (!turnState) return res.status(400).json({ error: 'Movement A is not active for your group' });
    if (String(userId) !== String(turnState.turnOrder[turnState.currentIndex])) {
      return res.status(400).json({ error: 'Not your turn' });
    }
    if ((turnState.promptMode || 'word') !== 'word') {
      return res.status(400).json({ error: 'This round uses sketch mode — use /submit/sketch' });
    }

    const movementId = await _getActiveMovementAId(gameId);
    if (!movementId) return res.status(400).json({ error: 'No active Movement A for this game' });

    const trimmed = word.trim();
    await db.query(
      `INSERT INTO movement_a_submissions (movement_id, group_id, user_id, word)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (movement_id, user_id) DO UPDATE SET word = EXCLUDED.word`,
      [movementId, groupId, userId, trimmed]
    );

    clearTurnTimeout(groupId);

    await _advanceTurnAfterSubmit({
      groupId, turnState, movementId, isSketch: false,
      submittedUserId: userId, submittedUsername: req.user.username, submittedWord: trimmed,
      gameId,
    });

    res.json({ ok: true, phase: 'waiting', completedCount: turnState.completedCount + 1 });
  } catch (err) {
    console.error('[POST movement-a/submit/word]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/games/:gameId/movement-a/submit/sketch
// Submit a sketch for Movement A (sketch mode only).
// ---------------------------------------------------------------------------
router.post('/:gameId/movement-a/submit/sketch', auth, async (req, res) => {
  const { gameId }    = req.params;
  const userId        = req.user.sub;
  const { sketchData } = req.body;

  if (!sketchData || typeof sketchData !== 'object') {
    return res.status(400).json({ error: 'sketchData is required' });
  }

  try {
    const groupId = await _getPlayerGroupId(gameId, userId);
    if (!groupId) return res.status(404).json({ error: 'Group not found' });

    const turnState = getGroupTurnState(groupId);
    if (!turnState) return res.status(400).json({ error: 'Movement A is not active for your group' });
    if (String(userId) !== String(turnState.turnOrder[turnState.currentIndex])) {
      return res.status(400).json({ error: 'Not your turn' });
    }
    if ((turnState.promptMode || 'word') !== 'sketch') {
      return res.status(400).json({ error: 'This round uses word mode — use /submit/word' });
    }

    const movementId = await _getActiveMovementAId(gameId);
    if (!movementId) return res.status(400).json({ error: 'No active Movement A for this game' });

    await db.query(
      `INSERT INTO movement_a_submissions (movement_id, group_id, user_id, word, sketch_data)
       VALUES ($1, $2, $3, NULL, $4)
       ON CONFLICT (movement_id, user_id) DO UPDATE SET word = NULL, sketch_data = EXCLUDED.sketch_data`,
      [movementId, groupId, userId, JSON.stringify(sketchData)]
    );

    clearTurnTimeout(groupId);

    await _advanceTurnAfterSubmit({
      groupId, turnState, movementId, isSketch: true,
      submittedUserId: userId, submittedUsername: req.user.username, submittedWord: null,
      gameId,
    });

    res.json({ ok: true, phase: 'waiting', completedCount: turnState.completedCount + 1 });
  } catch (err) {
    console.error('[POST movement-a/submit/sketch]', err.message);
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
      if (!/^\d+$/.test(targetId)) {
        return res.status(400).json({ error: `Invalid target ID: ${targetId}` });
      }
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
// POST /api/games/:gameId/movement-b/complete
// Player completed a task during Movement B. Awards points to their team
// and records the completion. Points are applied immediately to game_teams.
// ---------------------------------------------------------------------------
router.post('/:gameId/movement-b/complete', auth, async (req, res) => {
  const { gameId } = req.params;
  const userId     = req.user.sub;
  const { taskId, bonusPoints: rawBonus } = req.body;

  if (!taskId) return res.status(400).json({ error: 'taskId is required' });

  const taskDef = getTask(taskId);
  if (!taskDef) return res.status(400).json({ error: 'Unknown task' });

  // Streak bonus — client-sent, capped at 1x base (max 2x total)
  const basePoints = taskDef.points.alive;
  const cappedBonus = Number.isFinite(rawBonus) && rawBonus > 0
    ? Math.min(Math.floor(rawBonus), basePoints)
    : 0;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify Movement B is active for this game
    const movRes = await client.query(
      `SELECT m.id FROM movements m
       JOIN rounds r ON r.id = m.round_id
       WHERE r.game_id = $1 AND r.status = 'active'
         AND m.movement_type = 'B' AND m.status = 'active'`,
      [gameId]
    );
    if (movRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Movement B is not active' });
    }

    // 2. Get player's team and mark status
    const playerRes = await client.query(
      'SELECT team, is_marked FROM game_players WHERE game_id = $1 AND user_id = $2',
      [gameId, userId]
    );
    if (playerRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Player not in this game' });
    }
    const { team, is_marked } = playerRes.rows[0];

    // 3. Determine points (base + streak bonus), apply Sus penalty if marked
    const rawPoints = basePoints + cappedBonus;
    const isSusPenaltyApplied = !!is_marked;
    const pointsEarned = isSusPenaltyApplied
      ? Math.floor(rawPoints * POINTS.SUS_CHALLENGE_MULTIPLIER)
      : rawPoints;

    // 4. Award to team
    await client.query(
      'UPDATE game_teams SET points = points + $1 WHERE game_id = $2 AND team = $3',
      [pointsEarned, gameId, team]
    );

    // 5. Read updated team points
    const tpRes = await client.query(
      'SELECT team, points FROM game_teams WHERE game_id = $1',
      [gameId]
    );
    const teamPoints = { phos: 0, skotia: 0 };
    for (const r of tpRes.rows) teamPoints[r.team] = r.points;

    await client.query('COMMIT');

    res.json({ ok: true, pointsEarned, isSusPenaltyApplied, teamPoints, taskId });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[movement-b/complete] error:', err.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------------------
// POST /api/games/:gameId/broadcast
// GM sends an announcement to all players in the lobby room.
// Body: { message, lobbyId }
// ---------------------------------------------------------------------------
router.post('/:gameId/broadcast', auth, async (req, res) => {
  const { message, lobbyId } = req.body;
  if (!message || typeof message !== 'string' || !message.trim()) {
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

module.exports = router;
