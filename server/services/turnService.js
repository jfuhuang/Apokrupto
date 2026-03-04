const pool    = require('../db');
const prompts = require('../data/prompts');

// ---------------------------------------------------------------------------
// In-memory turn state for Movement A
// groupTurnState[groupId] = { turnOrder, currentIndex, completedCount, promptId, promptMode, gameId, lobbyId, turnStartedAt }
// ---------------------------------------------------------------------------
const groupTurnState = new Map();

// Cache round mode so all groups in the same round use the same mode
// Key: `${gameId}:${roundNumber}` → 'word' | 'sketch'
const _roundModeCache = new Map();

// Per-group server-side auto-advance timers
const _turnTimers = new Map(); // groupId → timeoutId

// Per-group reveal timers: fire after the full 30s window to advance to the next turn
const _turnRevealTimers = new Map(); // groupId → timeoutId

function clearTurnTimeout(groupId) {
  const tid = _turnTimers.get(String(groupId));
  if (tid) {
    clearTimeout(tid);
    _turnTimers.delete(String(groupId));
  }
}

function clearRevealTimeout(groupId) {
  const tid = _turnRevealTimers.get(String(groupId));
  if (tid) {
    clearTimeout(tid);
    _turnRevealTimers.delete(String(groupId));
  }
}

function scheduleRevealTimeout(groupId, delayMs, fn) {
  clearRevealTimeout(groupId);
  const tid = setTimeout(() => {
    _turnRevealTimers.delete(String(groupId));
    fn();
  }, delayMs);
  _turnRevealTimers.set(String(groupId), tid);
}

/**
 * Emit movementATurnUpdate to the GM (lobby room) so the dashboard can show
 * a live turn-slot countdown.  Called every time a new turn slot begins or
 * deliberation starts.
 */
function _emitGmTurnUpdate(gameId, lobbyId, turnIndex, totalTurns, phase, slotStartedAt, io) {
  if (!io || !lobbyId) return;
  io.to(`lobby:${lobbyId}`).emit('movementATurnUpdate', {
    turnIndex,
    totalTurns,
    timeLimit: 30,
    phase,           // 'active' | 'deliberation'
    slotStartedAt: slotStartedAt ?? Date.now(),
  });
}

/** Cancel all per-group turn and reveal timers for every group in a game. */
function clearAllGroupTimersForGame(gameId) {
  const key = String(gameId);
  for (const [groupId, state] of groupTurnState.entries()) {
    if (state && String(state.gameId) === key) {
      clearTurnTimeout(groupId);
      clearRevealTimeout(groupId);
    }
  }
}

function scheduleTurnTimeout(groupId, currentIndex) {
  clearTurnTimeout(groupId);
  const tid = setTimeout(() => {
    _autoAdvanceTurn(String(groupId), currentIndex).catch((err) => {
      console.error('[TurnTimer] auto-advance error:', err.message);
    });
  }, 33000); // 33s = 30s player window + 3s network buffer
  _turnTimers.set(String(groupId), tid);
}

// Auto-advance when a player's 33s runs out without a submission
async function _autoAdvanceTurn(groupId, expectedIndex) {
  const state = getGroupTurnState(groupId);
  if (!state || state.currentIndex !== expectedIndex) return; // already advanced

  const { gameId } = state;
  const skippedUserId = String(state.turnOrder[expectedIndex]);

  // Check Movement A is still active
  const movRes = await pool.query(
    `SELECT m.id
     FROM movements m
     JOIN rounds r ON r.id = m.round_id
     WHERE r.game_id = $1 AND r.status = 'active'
       AND m.movement_type = 'A' AND m.status = 'active'`,
    [gameId]
  );
  if (movRes.rows.length === 0) return;
  const movementId = movRes.rows[0].id;

  // Record a skip marker (DO NOTHING if player already submitted)
  const isSketchMode = (state.promptMode || 'word') === 'sketch';
  if (isSketchMode) {
    await pool.query(
      `INSERT INTO movement_a_submissions (movement_id, group_id, user_id, word, sketch_data)
       VALUES ($1, $2, $3, NULL, NULL)
       ON CONFLICT (movement_id, user_id) DO NOTHING`,
      [movementId, groupId, skippedUserId]
    );
  } else {
    await pool.query(
      `INSERT INTO movement_a_submissions (movement_id, group_id, user_id, word)
       VALUES ($1, $2, $3, '—')
       ON CONFLICT (movement_id, user_id) DO NOTHING`,
      [movementId, groupId, skippedUserId]
    );
  }

  // Re-check in case HTTP submit arrived during our DB round-trip
  const fresh = getGroupTurnState(groupId);
  if (!fresh || fresh.currentIndex !== expectedIndex) return;

  const newIndex     = expectedIndex + 1;
  const newCompleted = state.completedCount + 1;

  // Lazy-load io to avoid circular dependency at module load time
  const { getIO } = require('../websocket/io');
  const io = getIO();

  if (newCompleted >= state.turnOrder.length) {
    // Last player — fetch all submissions and emit deliberationStart
    setGroupTurnState(groupId, { ...state, currentIndex: newIndex, completedCount: newCompleted });

    if (isSketchMode) {
      const sketchRes = await pool.query(
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
      if (io) io.to(`lobby:${groupId}`).emit('deliberationStart', { promptMode: 'sketch', sketches });
    } else {
      const wordsRes = await pool.query(
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
      if (io) io.to(`lobby:${groupId}`).emit('deliberationStart', { promptMode: 'word', words });
    }

    _emitGmTurnUpdate(state.gameId, state.lobbyId, newIndex, state.turnOrder.length, 'deliberation', Date.now(), io);
    notifyGroupDeliberationReady(state.gameId);
  } else {
    // More turns — advance to next player
    const now = Date.now();
    setGroupTurnState(groupId, {
      ...state,
      currentIndex:   newIndex,
      completedCount: newCompleted,
      turnStartedAt:  now,
    });
    const nextPlayerId = String(state.turnOrder[newIndex]);
    if (io) {
      io.to(`lobby:${groupId}`).emit('turnStart', {
        currentPlayerId: nextPlayerId,
        turnIndex:       newIndex,
        completedCount:  newCompleted,
        timeLimit:       30,
        turnOrder:       state.turnOrder.map(String),
      });
    }
    _emitGmTurnUpdate(state.gameId, state.lobbyId, newIndex, state.turnOrder.length, 'active', now, io);
    scheduleTurnTimeout(groupId, newIndex);
    scheduleBotSubmitIfNeeded(groupId); // auto-submit if next player is a bot
  }
}

// ---------------------------------------------------------------------------
// Bot auto-submit helpers (testing / dummy players only)
// ---------------------------------------------------------------------------
const BOT_WORDS = [
  'faith', 'hope', 'grace', 'truth', 'light', 'water', 'peace', 'bread',
  'love', 'fire', 'stone', 'road', 'mountain', 'river', 'shield', 'crown',
  'vessel', 'spirit', 'lamb', 'vine', 'seed', 'harvest', 'scroll', 'temple',
  'altar', 'covenant', 'mercy', 'glory', 'power', 'wisdom',
];

async function _isBotUser(userId) {
  const res = await pool.query(
    'SELECT 1 FROM users WHERE id = $1 AND password_hash IS NULL',
    [userId]
  );
  return res.rows.length > 0;
}

async function _doBotSubmit(groupId, expectedIndex) {
  const state = getGroupTurnState(groupId);
  if (!state || state.currentIndex !== expectedIndex) return; // already advanced

  const { gameId } = state;
  const botUserId = String(state.turnOrder[expectedIndex]);

  const movRes = await pool.query(
    `SELECT m.id
     FROM movements m
     JOIN rounds r ON r.id = m.round_id
     WHERE r.game_id = $1 AND r.status = 'active'
       AND m.movement_type = 'A' AND m.status = 'active'`,
    [gameId]
  );
  if (movRes.rows.length === 0) return;
  const movementId = movRes.rows[0].id;

  const isBotSketch = (state.promptMode || 'word') === 'sketch';
  const word = isBotSketch ? null : BOT_WORDS[Math.floor(Math.random() * BOT_WORDS.length)];

  if (isBotSketch) {
    await pool.query(
      `INSERT INTO movement_a_submissions (movement_id, group_id, user_id, word, sketch_data)
       VALUES ($1, $2, $3, NULL, NULL)
       ON CONFLICT (movement_id, user_id) DO UPDATE SET word = NULL, sketch_data = NULL`,
      [movementId, groupId, botUserId]
    );
  } else {
    await pool.query(
      `INSERT INTO movement_a_submissions (movement_id, group_id, user_id, word)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (movement_id, user_id) DO UPDATE SET word = EXCLUDED.word`,
      [movementId, groupId, botUserId, word]
    );
  }

  clearTurnTimeout(groupId);

  // Re-check in case HTTP submit arrived during our DB round-trip
  const fresh = getGroupTurnState(groupId);
  if (!fresh || fresh.currentIndex !== expectedIndex) return;

  const newIndex     = expectedIndex + 1;
  const newCompleted = state.completedCount + 1;

  const { getIO } = require('../websocket/io');
  const io = getIO();

  const userRes = await pool.query('SELECT username FROM users WHERE id = $1', [botUserId]);
  const botUsername = userRes.rows[0]?.username ?? 'Bot';
  const lastWord = isBotSketch ? null : { userId: botUserId, username: botUsername, word };

  // Calculate remaining time in the 30-second turn window, then schedule the advance
  const elapsed     = fresh.turnStartedAt ? Date.now() - fresh.turnStartedAt : 0;
  const revealDelay = Math.max(1000, 30000 - elapsed);

  // Notify the group immediately that this player submitted
  if (io) {
    const wordSubmittedPayload = { userId: botUserId, username: botUsername, nextTurnInSeconds: Math.ceil(revealDelay / 1000) };
    if (!isBotSketch) wordSubmittedPayload.word = word;
    io.to(`lobby:${groupId}`).emit('wordSubmitted', wordSubmittedPayload);
  }

  // Advance to next turn / deliberation after the reveal window expires
  const capturedGameId = state.gameId;
  const capturedIsBotSketch = isBotSketch;
  scheduleRevealTimeout(groupId, revealDelay, async () => {
    const freshState = getGroupTurnState(groupId);
    if (!freshState || freshState.currentIndex !== expectedIndex) return;

    const { getIO: getIO2 } = require('../websocket/io');
    const io2 = getIO2();

    if (newCompleted >= state.turnOrder.length) {
      setGroupTurnState(groupId, { ...freshState, currentIndex: newIndex, completedCount: newCompleted });

      if (capturedIsBotSketch) {
        const sketchRes = await pool.query(
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
        const wordsRes = await pool.query(
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
      _emitGmTurnUpdate(capturedGameId, freshState.lobbyId, newIndex, state.turnOrder.length, 'deliberation', Date.now(), io2);
      notifyGroupDeliberationReady(capturedGameId);
    } else {
      const now = Date.now();
      setGroupTurnState(groupId, {
        ...freshState,
        currentIndex:   newIndex,
        completedCount: newCompleted,
        turnStartedAt:  now,
      });
      const nextPlayerId = String(state.turnOrder[newIndex]);
      if (io2) {
        io2.to(`lobby:${groupId}`).emit('turnStart', {
          currentPlayerId: nextPlayerId,
          turnIndex:       newIndex,
          completedCount:  newCompleted,
          timeLimit:       30,
          lastWord,
          turnOrder:       state.turnOrder.map(String),
        });
      }
      _emitGmTurnUpdate(capturedGameId, freshState.lobbyId, newIndex, state.turnOrder.length, 'active', now, io2);
      scheduleTurnTimeout(groupId, newIndex);
      scheduleBotSubmitIfNeeded(groupId); // chain: next player might also be a bot
    }
  });
}

/**
 * If the current player in a group is a bot, schedule an automatic word
 * submission after a short random delay (1–3 s). Call this after any
 * event that advances the turn pointer: startTurns, _autoAdvanceTurn,
 * and the HTTP submit route.
 */
async function scheduleBotSubmitIfNeeded(groupId) {
  const state = getGroupTurnState(groupId);
  if (!state || state.currentIndex >= state.turnOrder.length) return;

  const currentPlayerId = String(state.turnOrder[state.currentIndex]);
  const isBot = await _isBotUser(currentPlayerId);
  if (!isBot) return;

  const currentIndex = state.currentIndex;
  const delay = 1000 + Math.floor(Math.random() * 2000); // 1–3 s
  setTimeout(() => {
    _doBotSubmit(String(groupId), currentIndex).catch((err) => {
      console.error('[BotSubmit] error:', err.message);
    });
  }, delay);
}

// Called after _initTurnState to stamp turnStartedAt and schedule the first
// per-group auto-advance timer. Does NOT emit turnStart — clients get that
// via joinRoom (so they receive it after navigating to MovementAScreen).
function startTurns(groups) {
  const now = Date.now();
  const { getIO } = require('../websocket/io');
  const io = getIO();
  let gmEmitted = false;
  for (const group of groups) {
    const gid   = String(group.groupId);
    const state = getGroupTurnState(gid);
    if (!state) continue;
    setGroupTurnState(gid, { ...state, turnStartedAt: now });
    scheduleTurnTimeout(gid, 0);
    scheduleBotSubmitIfNeeded(gid); // auto-submit if first player is a bot
    // Emit GM turn update once per game (all groups are in sync)
    if (!gmEmitted && state.lobbyId) {
      _emitGmTurnUpdate(state.gameId, state.lobbyId, 0, state.turnOrder.length, 'active', now, io);
      gmEmitted = true;
    }
  }
}

// ---------------------------------------------------------------------------
// Deliberation auto-advance
// After ALL groups in a round have finished word submissions (deliberationStart),
// a 120 s server-side timer automatically advances the game past Movement A.
// Cancelled immediately if the GM manually advances first.
// ---------------------------------------------------------------------------
const _deliberationGroupsReady = new Map(); // gameId → { ready: N, total: M }
const _deliberationTimers       = new Map(); // gameId → timeoutId
const _deliberationEndTimes     = new Map(); // gameId → deliberationEndsAt (epoch ms)

const DELIBERATION_DURATION_MS = 60_000; // 1 minute

function clearDeliberationTimer(gameId) {
  const key = String(gameId);
  const tid = _deliberationTimers.get(key);
  if (tid) {
    clearTimeout(tid);
    _deliberationTimers.delete(key);
  }
  _deliberationGroupsReady.delete(key);
  _deliberationEndTimes.delete(key);
}

/** Returns the epoch-ms timestamp at which deliberation ends, or null. */
function getDeliberationEndsAt(gameId) {
  return _deliberationEndTimes.get(String(gameId)) ?? null;
}

function _scheduleDeliberationAutoAdvance(gameId) {
  const key = String(gameId);
  if (_deliberationTimers.has(key)) return; // already scheduled

  const deliberationEndsAt = Date.now() + DELIBERATION_DURATION_MS;
  _deliberationEndTimes.set(key, deliberationEndsAt);

  // Fetch lobbyId and immediately notify all clients of the authoritative end time.
  // Lazy-require to avoid circular dependency at module load time.
  pool.query('SELECT lobby_id FROM games WHERE id = $1', [gameId])
    .then((res) => {
      const lobbyId = res.rows[0]?.lobby_id;
      if (!lobbyId) return;
      const { getIO } = require('../websocket/io');
      const io = getIO();
      if (io) {
        io.to(`lobby:${String(lobbyId)}`).emit('deliberationReady', { deliberationEndsAt });
        console.log(`[DeliberationTimer] Game ${key}: deliberationReady emitted, ends at ${new Date(deliberationEndsAt).toISOString()}`);
      }
    })
    .catch((err) => console.error('[DeliberationTimer] lobbyId fetch error:', err.message));

  const tid = setTimeout(async () => {
    _deliberationTimers.delete(key);
    _deliberationGroupsReady.delete(key);
    _deliberationEndTimes.delete(key);
    try {
      const { getIO } = require('../websocket/io');
      const { emitAdvanceEvents } = require('../websocket/lobbySocket');
      const { advanceMovement } = require('./gameService');
      const result = await advanceMovement(key);
      console.log(`[DeliberationTimer] Auto-advanced game ${key} → step=${result.step}`);
      emitAdvanceEvents(getIO(), result);
    } catch (err) {
      console.error('[DeliberationTimer] auto-advance error:', err.message);
    }
  }, DELIBERATION_DURATION_MS);
  _deliberationTimers.set(key, tid);
}

/**
 * Called once per group when that group emits deliberationStart.
 * Schedules the auto-advance once every group in the round has signalled ready.
 */
function notifyGroupDeliberationReady(gameId) {
  const key   = String(gameId);
  const entry = _deliberationGroupsReady.get(key);
  if (!entry) return;
  entry.ready += 1;
  console.log(`[DeliberationTimer] Game ${key}: ${entry.ready}/${entry.total} groups in deliberation`);
  if (entry.ready >= entry.total) {
    _scheduleDeliberationAutoAdvance(key);
  }
}

// ---------------------------------------------------------------------------
// Turn state accessors (used by game routes for Movement A)
// ---------------------------------------------------------------------------
function getGroupTurnState(groupId) {
  return groupTurnState.get(String(groupId)) ?? null;
}

function setGroupTurnState(groupId, state) {
  groupTurnState.set(String(groupId), state);
}

/**
 * Returns a snapshot of Movement A turn state for all groups in a game.
 * Used by the gm-state endpoint so the GM dashboard can seed its timer on load.
 * Returns null if no groups are active for this game.
 */
function getMovementATurnInfo(gameId) {
  for (const [, state] of groupTurnState.entries()) {
    if (state && String(state.gameId) === String(gameId)) {
      const isDeliberation = state.completedCount >= state.turnOrder.length;
      return {
        turnIndex:     state.currentIndex,
        totalTurns:    state.turnOrder.length,
        timeLimit:     30,
        phase:         isDeliberation ? 'deliberation' : 'active',
        slotStartedAt: state.turnStartedAt,
      };
    }
  }
  return null;
}

// Initialise in-memory turn state for a set of groups at Movement A start.
// Each group gets a random turn order and a randomly-selected prompt.
async function _initTurnState(groups, gameId, lobbyId) {
  // Reset deliberation counter so we wait for all groups this round
  _deliberationGroupsReady.set(String(gameId), { ready: 0, total: groups.length });

  // Determine round mode: all groups in a round share the same word/sketch mode.
  // Look up current round number from DB to key the cache.
  const roundRes = await pool.query(
    'SELECT current_round FROM games WHERE id = $1',
    [gameId]
  );
  const roundNumber = roundRes.rows[0]?.current_round ?? 1;
  const cacheKey = `${gameId}:${roundNumber}`;

  let promptMode = _roundModeCache.get(cacheKey);
  if (!promptMode) {
    promptMode = Math.random() < 0.5 ? 'word' : 'sketch';
    _roundModeCache.set(cacheKey, promptMode);
  }

  const modePrompts = prompts.filter(p => p.prompt_mode === promptMode);
  const shuffled    = shuffle([...modePrompts]);

  groups.forEach((group, i) => {
    const promptId = (shuffled[i] || shuffled[0])?.id ?? null;

    groupTurnState.set(String(group.groupId), {
      turnOrder:      shuffle([...group.memberIds]),
      currentIndex:   0,
      completedCount: 0,
      promptId,
      promptMode,
      gameId:         String(gameId),
      lobbyId:        String(lobbyId),
      turnStartedAt:  null,
    });
  });
}

// Local shuffle used only by _initTurnState (same logic as gameService)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Clear all in-memory turn state for a given game.
 * Called by cleanupGameData in gameService.
 */
function clearGameState(gameId) {
  const key = String(gameId);
  _roundModeCache.forEach((_, k) => { if (k.startsWith(`${key}:`)) _roundModeCache.delete(k); });
  for (const [groupId, state] of groupTurnState.entries()) {
    if (state && String(state.gameId) === key) groupTurnState.delete(groupId);
  }
}

module.exports = {
  getGroupTurnState,
  setGroupTurnState,
  getMovementATurnInfo,
  clearTurnTimeout,
  clearRevealTimeout,
  scheduleRevealTimeout,
  scheduleTurnTimeout,
  clearAllGroupTimersForGame,
  startTurns,
  scheduleBotSubmitIfNeeded,
  notifyGroupDeliberationReady,
  clearDeliberationTimer,
  getDeliberationEndsAt,
  initTurnState: _initTurnState,
  emitGmTurnUpdate: _emitGmTurnUpdate,
  clearGameState,
};
