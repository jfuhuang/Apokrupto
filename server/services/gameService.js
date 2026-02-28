const pool = require('../db');

// ---------------------------------------------------------------------------
// Point constants
// ---------------------------------------------------------------------------
const POINTS = {
  CORRECT_MARK:   200, // Phos marks Skotia → Phos earns
  FALSE_MARK:     150, // Phos marks Phos   → Skotia earns
  CORRECT_UNMARK: 150, // Unmark Phos (vindication) → Phos earns
  FALSE_UNMARK:   200, // Unmark Skotia (re-hides)  → Skotia earns
  SKOTIA_PASSIVE:  50, // Skotia flat bonus per Movement B
};

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
  const { getIO } = require('../websocket/lobbySocket');
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

  const { getIO } = require('../websocket/lobbySocket');
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

    const { getIO: getIO2 } = require('../websocket/lobbySocket');
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
  const { getIO } = require('../websocket/lobbySocket');
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

const DELIBERATION_DURATION_MS = 120_000;

// ---------------------------------------------------------------------------
// In-memory state for Movement B
// ---------------------------------------------------------------------------
const _movementBAssignments = new Map(); // gameId → Map<userId, taskId>
const _movementBTimers       = new Map(); // gameId → timeoutId
const _movementBEndTimes     = new Map(); // gameId → endsAt (epoch ms)
const MOVEMENT_B_DURATION_MS = 300_000;  // 5 minutes

// ---------------------------------------------------------------------------
// In-memory state for voting timer (Movement C)
// ---------------------------------------------------------------------------
const _votingTimers   = new Map(); // gameId → timeoutId
const _votingEndTimes = new Map(); // gameId → votingEndsAt (epoch ms)
const VOTING_DURATION_MS = 60 * 1000; // 60 seconds

function clearVotingTimer(gameId) {
  const key = String(gameId);
  const tid = _votingTimers.get(key);
  if (tid) { clearTimeout(tid); _votingTimers.delete(key); }
  _votingEndTimes.delete(key);
}

function getVotingEndsAt(gameId) {
  return _votingEndTimes.get(String(gameId)) ?? null;
}

function scheduleVotingTimer(gameId, votingEndsAt) {
  const key = String(gameId);
  if (_votingTimers.has(key)) return; // already scheduled
  _votingEndTimes.set(key, votingEndsAt);
  const delay = Math.max(0, votingEndsAt - Date.now());
  const tid = setTimeout(async () => {
    _votingTimers.delete(key);
    _votingEndTimes.delete(key);
    try {
      const { getIO, emitAdvanceEvents } = require('../websocket/lobbySocket');
      const result = await advanceMovement(key);
      console.log(`[VotingTimer] Auto-advanced game ${key} → ${result.step}`);
      emitAdvanceEvents(getIO(), result);
    } catch (err) {
      console.error('[VotingTimer] auto-advance error:', err.message);
    }
  }, delay);
  _votingTimers.set(key, tid);
}

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
      const { getIO } = require('../websocket/lobbySocket');
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
      const { getIO, emitAdvanceEvents } = require('../websocket/lobbySocket');
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

/**
 * Store which task was assigned to a player for Movement B.
 */
function storeMovementBAssignment(gameId, userId, taskId) {
  const key = String(gameId);
  if (!_movementBAssignments.has(key)) _movementBAssignments.set(key, new Map());
  _movementBAssignments.get(key).set(String(userId), taskId);
}

/**
 * Retrieve a player's assigned task for Movement B (returns null if not found).
 */
function getMovementBAssignment(gameId, userId) {
  return _movementBAssignments.get(String(gameId))?.get(String(userId)) ?? null;
}

/**
 * Cancel the Movement B auto-advance timer and clear stored assignments.
 * Called when the GM manually advances or the timer fires.
 */
function clearMovementBTimer(gameId) {
  const key = String(gameId);
  const tid = _movementBTimers.get(key);
  if (tid) { clearTimeout(tid); _movementBTimers.delete(key); }
  _movementBAssignments.delete(key);
  _movementBEndTimes.delete(key);
}

/** Returns the epoch-ms timestamp at which Movement B ends, or null. */
function getMovementBEndsAt(gameId) {
  return _movementBEndTimes.get(String(gameId)) ?? null;
}

/**
 * Schedule the 5-minute auto-advance from Movement B → C.
 * Idempotent — a second call is a no-op if the timer is already running.
 */
function scheduleMovementBAutoAdvance(gameId) {
  const key = String(gameId);
  if (_movementBTimers.has(key)) return;
  const endsAt = Date.now() + MOVEMENT_B_DURATION_MS;
  _movementBEndTimes.set(key, endsAt);
  const tid = setTimeout(async () => {
    _movementBTimers.delete(key);
    _movementBAssignments.delete(key);
    _movementBEndTimes.delete(key);
    try {
      const { getIO, emitAdvanceEvents } = require('../websocket/lobbySocket');
      const result = await advanceMovement(key);
      console.log(`[MovementBTimer] Auto-advanced game ${key} → step=${result.step}`);
      emitAdvanceEvents(getIO(), result);
    } catch (err) {
      console.error('[MovementBTimer] auto-advance error:', err.message);
    }
  }, MOVEMENT_B_DURATION_MS);
  _movementBTimers.set(key, tid);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Read all groups for a given round and enrich each with member details.
 * Returns { groups: [...], playerGroupMap: Map<userId, group> }.
 * Uses the supplied DB client (may be inside a transaction).
 */
async function _getGroupsWithMembers(client, gameId, roundNumber) {
  const groupsRes = await client.query(
    `SELECT id AS group_id, group_index FROM game_groups
     WHERE game_id = $1 AND round_number = $2 ORDER BY group_index`,
    [gameId, roundNumber]
  );
  const userRes = await client.query(
    `SELECT u.id, u.username, gp.is_marked
     FROM users u
     JOIN game_players gp ON gp.user_id = u.id AND gp.game_id = $1`,
    [gameId]
  );
  const userMap = {};
  userRes.rows.forEach((r) => {
    userMap[String(r.id)] = { username: r.username, isMarked: r.is_marked };
  });

  const groups = [];
  const playerGroupMap = new Map();
  for (const groupRow of groupsRes.rows) {
    const membersRes = await client.query(
      'SELECT user_id FROM game_group_members WHERE group_id = $1',
      [groupRow.group_id]
    );
    const memberIds = membersRes.rows.map((r) => String(r.user_id));
    const members = memberIds.map((id) => ({
      id,
      username: userMap[id]?.username ?? id,
      isMarked: userMap[id]?.isMarked ?? false,
    }));
    const group = { groupId: groupRow.group_id, groupIndex: groupRow.group_index, memberIds, members };
    groups.push(group);
    for (const memberId of memberIds) playerGroupMap.set(memberId, group);
  }
  return { groups, playerGroupMap };
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function assignTeams(userIds) {
  const shuffled = shuffle(userIds);
  const skotiaCount = Math.floor(shuffled.length / 5);
  return {
    skotia: shuffled.slice(0, skotiaCount),
    phos:   shuffled.slice(skotiaCount),
  };
}

// Builds groups: 1 Skotia + 4 Phos each, returns array of group records.
// Inserts game_groups + game_group_members rows using the provided client.
async function _assignGroups(client, gameId, roundNumber, phosIds, skotiaIds) {
  const phos   = shuffle([...phosIds]);
  const skotia = shuffle([...skotiaIds]);
  const groups = [];

  for (let i = 0; i < skotia.length; i++) {
    const phosSlice = phos.slice(i * 4, (i + 1) * 4);
    const members   = [skotia[i], ...phosSlice];

    const groupRes = await client.query(
      'INSERT INTO game_groups (game_id, round_number, group_index) VALUES ($1, $2, $3) RETURNING id',
      [gameId, roundNumber, i + 1]
    );
    const groupId = groupRes.rows[0].id;

    for (const userId of members) {
      await client.query(
        'INSERT INTO game_group_members (group_id, user_id) VALUES ($1, $2)',
        [groupId, userId]
      );
    }

    groups.push({ groupId, groupIndex: i + 1, memberIds: members });
  }

  return groups;
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

  const promptRes = await pool.query(
    'SELECT id FROM prompts WHERE prompt_mode = $1 ORDER BY random() LIMIT $2',
    [promptMode, groups.length]
  );

  groups.forEach((group, i) => {
    const promptId =
      (promptRes.rows[i] || promptRes.rows[0])?.id ?? null;

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

// ---------------------------------------------------------------------------
// createGame — creates game + team rows (called before startGame)
// ---------------------------------------------------------------------------
async function createGame(lobbyId, totalRounds = 4) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const gameRes = await client.query(
      'INSERT INTO games (lobby_id, total_rounds) VALUES ($1, $2) RETURNING id',
      [lobbyId, totalRounds]
    );
    const gameId = gameRes.rows[0].id;

    await client.query(
      "INSERT INTO game_teams (game_id, team) VALUES ($1, 'phos'), ($1, 'skotia')",
      [gameId]
    );

    await client.query('COMMIT');
    return gameId;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// startGame — assigns teams, groups, creates round 1 + Movement A
// ---------------------------------------------------------------------------
async function startGame(gameId, options = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Load game info
    const gameRes = await client.query(
      'SELECT lobby_id, total_rounds FROM games WHERE id = $1',
      [gameId]
    );
    if (gameRes.rows.length === 0) throw new Error('Game not found');
    const { lobby_id: lobbyId, total_rounds: totalRounds } = gameRes.rows[0];

    // Load all players in the lobby
    const playersRes = await client.query(
      `SELECT lp.user_id, u.username
       FROM lobby_players lp
       JOIN users u ON u.id = lp.user_id
       WHERE lp.lobby_id = $1
       ORDER BY lp.joined_at ASC`,
      [lobbyId]
    );

    // Exclude GM users — they are spectators and must not be assigned a team/group
    const excludeSet = new Set((options.excludeUserIds || []).map(String));
    const players = playersRes.rows.filter(p => !excludeSet.has(String(p.user_id)));

    if (players.length < 5) {
      throw new Error('Need at least 5 players to start');
    }

    const userIds = players.map((p) => String(p.user_id));
    const userIdToUsername = {};
    players.forEach((p) => { userIdToUsername[String(p.user_id)] = p.username; });

    // Assign phos / skotia
    const { phos: phosIds, skotia: skotiaIds } = assignTeams(userIds);

    for (const uid of phosIds) {
      await client.query(
        "INSERT INTO game_players (game_id, user_id, team) VALUES ($1, $2, 'phos')",
        [gameId, uid]
      );
    }
    for (const uid of skotiaIds) {
      await client.query(
        "INSERT INTO game_players (game_id, user_id, team) VALUES ($1, $2, 'skotia')",
        [gameId, uid]
      );
    }

    // Build groups for round 1
    const groups = await _assignGroups(client, gameId, 1, phosIds, skotiaIds);

    // Round 1, Movement A (pending — GM must activate it)
    const roundRes = await client.query(
      "INSERT INTO rounds (game_id, round_number, status) VALUES ($1, 1, 'active') RETURNING id",
      [gameId]
    );
    const roundId = roundRes.rows[0].id;

    await client.query(
      "INSERT INTO movements (round_id, movement_type, status) VALUES ($1, 'A', 'pending')",
      [roundId]
    );

    await client.query(
      "UPDATE games SET status = 'active', current_round = 1 WHERE id = $1",
      [gameId]
    );
    await client.query(
      "UPDATE lobbies SET status = 'in_progress' WHERE id = $1",
      [lobbyId]
    );

    await client.query('COMMIT');

    // NOTE: _initTurnState is NOT called here — it is called when GM activates Movement A.

    // Build convenience maps for the caller
    const playerTeams = new Map();
    phosIds.forEach((uid) => playerTeams.set(uid, 'phos'));
    skotiaIds.forEach((uid) => playerTeams.set(uid, 'skotia'));

    const playerGroups = new Map();
    for (const group of groups) {
      const memberInfos = group.memberIds.map((id) => ({
        id,
        username: userIdToUsername[id],
        isMarked: false,
      }));
      for (const memberId of group.memberIds) {
        playerGroups.set(memberId, {
          groupId:     group.groupId,
          groupIndex:  group.groupIndex,
          members:     memberInfos,
        });
      }
    }

    const skotiaPlayers = skotiaIds.map((uid) => ({
      id:       uid,
      username: userIdToUsername[uid],
    }));

    return { playerTeams, playerGroups, skotiaPlayers, groups, lobbyId };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// advanceMovement — 9-step GM-gated state machine
//
// Steps (in order within a round):
//   activateA     → A pending → active (GM starts Movement A)
//   completeA     → A active → completed (deliberation timer or GM force)
//   activateB     → A done, create B active (GM starts Movement B)
//   completeB     → B active → completed (B timer or GM force)
//   activateC     → B done, create C active + voting timer (GM starts voting)
//   completeC     → C active → completed (voting timer or GM force)
//   summarizeRound→ All done, resolve votes (GM triggers summary)
//   nextRound     → round summarizing, more rounds (GM starts next round)
//   gameOver      → round summarizing, last round OR supermajority
// ---------------------------------------------------------------------------
async function advanceMovement(gameId) {
  const client = await pool.connect();
  try {
    // ── Phase 1: read current state (no transaction) ──────────────────────
    const gameRes = await client.query(
      `SELECT g.current_round, g.total_rounds, g.lobby_id,
              r.id AS round_id, r.round_number, r.status AS round_status
       FROM games g
       LEFT JOIN rounds r ON r.game_id = g.id AND r.status IN ('active', 'summarizing')
       WHERE g.id = $1`,
      [gameId]
    );
    if (gameRes.rows.length === 0) throw new Error('Game not found');

    const {
      current_round: currentRound,
      total_rounds:  totalRounds,
      lobby_id:      lobbyId,
      round_id:      roundId,
      round_number:  roundNumber,
      round_status:  roundStatus,
    } = gameRes.rows[0];

    if (!roundId) throw new Error('No active or summarizing round found for this game');

    const movementsRes = await client.query(
      'SELECT id, movement_type, status FROM movements WHERE round_id = $1 ORDER BY id',
      [roundId]
    );
    const movByType = {};
    for (const m of movementsRes.rows) movByType[m.movement_type] = m;
    const movA = movByType['A'];
    const movB = movByType['B'];
    const movC = movByType['C'];

    const movSummary = Object.entries(movByType).map(([t, m]) => `${t}:${m.status}`).join(' ');
    console.log(`[Game] advanceMovement game=${gameId} round=${roundNumber}/${totalRounds} roundStatus=${roundStatus} movements=[${movSummary}]`);

    // ── Phase 2: execute the applicable step in a transaction ─────────────
    await client.query('BEGIN');

    // Lock the round row so concurrent advanceMovement calls serialize.
    // Re-read roundStatus from the locked row — if a concurrent call already
    // mutated the round between our Phase-1 read and this BEGIN, we will
    // see the updated status here and throw, preventing double execution.
    const lockedRoundRes = await client.query(
      'SELECT status FROM rounds WHERE id = $1 FOR UPDATE',
      [roundId]
    );
    const lockedRoundStatus = lockedRoundRes.rows[0]?.status;
    if (!lockedRoundStatus) throw new Error('Round disappeared mid-transaction');
    if (lockedRoundStatus !== roundStatus) {
      await client.query('ROLLBACK');
      throw new Error(
        `advanceMovement race: round ${roundId} status changed from ` +
        `'${roundStatus}' to '${lockedRoundStatus}' before lock acquired — ignoring duplicate advance`
      );
    }

    // ── activateA: Movement A pending → GM activates it ───────────────────
    if (movA && movA.status === 'pending') {
      await client.query(
        "UPDATE movements SET status = 'active', started_at = now() WHERE id = $1",
        [movA.id]
      );
      const groupsData = await _getGroupsWithMembers(client, gameId, roundNumber);
      await client.query('COMMIT');
      // Init in-memory turn state now that A is active (re-initialises each round)
      await _initTurnState(groupsData.groups, gameId, lobbyId);
      return {
        step: 'activateA',
        roundNumber,
        lobbyId: String(lobbyId),
        gameId:  String(gameId),
        groups:        groupsData.groups,
        playerGroupMap: groupsData.playerGroupMap,
      };
    }

    // ── completeA: A active (turns or deliberation) → GM or timer completes ──
    if (movA && movA.status === 'active' && !movB) {
      await client.query(
        "UPDATE movements SET status = 'completed', completed_at = now() WHERE id = $1",
        [movA.id]
      );
      await client.query('COMMIT');
      return { step: 'completeA', lobbyId: String(lobbyId), gameId: String(gameId) };
    }

    // ── activateB: A completed, no B yet → GM creates B ──────────────────
    if (movA && movA.status === 'completed' && !movB) {
      await client.query(
        "INSERT INTO movements (round_id, movement_type, status, started_at) VALUES ($1, 'B', 'active', now())",
        [roundId]
      );
      await client.query('COMMIT');
      return { step: 'activateB', roundNumber, lobbyId: String(lobbyId), gameId: String(gameId) };
    }

    // ── completeB: B active → GM or timer completes ───────────────────────
    if (movB && movB.status === 'active' && !movC) {
      await client.query(
        "UPDATE movements SET status = 'completed', completed_at = now() WHERE id = $1",
        [movB.id]
      );
      // Award Skotia passive bonus at the end of Movement B
      await client.query(
        "UPDATE game_teams SET points = points + $1 WHERE game_id = $2 AND team = 'skotia'",
        [POINTS.SKOTIA_PASSIVE, gameId]
      );
      console.log(`[Game] completeB game=${gameId}: Skotia passive bonus +${POINTS.SKOTIA_PASSIVE}`);
      await client.query('COMMIT');
      return { step: 'completeB', lobbyId: String(lobbyId), gameId: String(gameId) };
    }

    // ── activateC: B completed, no C yet → GM creates C + voting timer ───
    if (movB && movB.status === 'completed' && !movC) {
      const votingEndsAt = Date.now() + VOTING_DURATION_MS;
      await client.query(
        "INSERT INTO movements (round_id, movement_type, status, started_at) VALUES ($1, 'C', 'active', now())",
        [roundId]
      );
      await client.query('COMMIT');
      return {
        step: 'activateC',
        roundNumber,
        lobbyId: String(lobbyId),
        gameId:  String(gameId),
        votingEndsAt,
      };
    }

    // ── completeC: C active → voting timer or GM force ────────────────────
    if (movC && movC.status === 'active') {
      await client.query(
        "UPDATE movements SET status = 'completed', completed_at = now() WHERE id = $1",
        [movC.id]
      );
      await client.query('COMMIT');
      return { step: 'completeC', lobbyId: String(lobbyId), gameId: String(gameId) };
    }

    // ── summarizeRound: all 3 done, round still 'active' → GM resolves ───
    if (movC && movC.status === 'completed' && roundStatus === 'active') {
      const votingResult = await _resolveVoting(client, gameId, roundNumber);
      console.log(`[Game] Voting resolved game=${gameId} round=${roundNumber}: marks=${votingResult.marksApplied} unmarks=${votingResult.unmarksApplied} phos=+${votingResult.phosPointsEarned} skotia=+${votingResult.skotiaPointsEarned}`);
      // Supermajority is only an instant-win condition on the final round.
      // Mid-game it would prematurely end rounds that the players haven't finished.
      const isFinalRound = roundNumber >= totalRounds;
      const supermajority = isFinalRound && await _checkSupermajority(client, gameId);
      if (supermajority) console.log(`[Game] SUPERMAJORITY detected game=${gameId} — Phos wins!`);

      // Build per-player mark status map after voting resolves
      const marksRes = await client.query(
        'SELECT user_id::text, is_marked FROM game_players WHERE game_id = $1',
        [gameId]
      );
      const isMarkedMap = new Map(marksRes.rows.map((r) => [r.user_id, r.is_marked]));

      if (supermajority) {
        await client.query("UPDATE rounds SET status = 'completed' WHERE id = $1", [roundId]);
        const gameOverData = await _endGame(client, gameId, 'phos', 'supermajority');
        await client.query('COMMIT');
        return {
          step:         'gameOver',
          summary:      _buildSummary(votingResult, roundNumber),
          groupResults: votingResult.groupResults,
          gameOverData,
          isMarkedMap,
          lobbyId: String(lobbyId),
          gameId:  String(gameId),
        };
      }

      await client.query("UPDATE rounds SET status = 'summarizing' WHERE id = $1", [roundId]);
      await client.query('COMMIT');
      return {
        step:         'summarizeRound',
        roundNumber,
        lobbyId: String(lobbyId),
        gameId:  String(gameId),
        summary:      _buildSummary(votingResult, roundNumber),
        groupResults: votingResult.groupResults,
        isMarkedMap,
      };
    }

    // ── nextRound / gameOver: round is 'summarizing' → GM starts next ────
    if (roundStatus === 'summarizing') {
      if (roundNumber >= totalRounds) {
        // Final round — compare points
        const ptsRes = await client.query(
          'SELECT team, points FROM game_teams WHERE game_id = $1', [gameId]
        );
        const pts = { phos: 0, skotia: 0 };
        ptsRes.rows.forEach((r) => { pts[r.team] = r.points; });
        const winner = pts.phos >= pts.skotia ? 'phos' : 'skotia';
        console.log(`[Game] GAME OVER game=${gameId} winner=${winner} by=points phos=${pts.phos} skotia=${pts.skotia}`);

        await client.query("UPDATE rounds SET status = 'completed' WHERE id = $1", [roundId]);
        const gameOverData = await _endGame(client, gameId, winner, 'points');
        await client.query('COMMIT');
        return {
          step: 'gameOver',
          gameOverData,
          lobbyId: String(lobbyId),
          gameId:  String(gameId),
        };
      }

      // More rounds — create next round with A pending
      await client.query("UPDATE rounds SET status = 'completed' WHERE id = $1", [roundId]);
      const nextRound = roundNumber + 1;
      await client.query(
        'UPDATE games SET current_round = $1 WHERE id = $2', [nextRound, gameId]
      );

      const phosRes   = await client.query("SELECT user_id FROM game_players WHERE game_id = $1 AND team = 'phos'",   [gameId]);
      const skotiaRes = await client.query("SELECT user_id FROM game_players WHERE game_id = $1 AND team = 'skotia'", [gameId]);
      const phosIds   = phosRes.rows.map((r) => String(r.user_id));
      const skotiaIds = skotiaRes.rows.map((r) => String(r.user_id));

      const newGroups = await _assignGroups(client, gameId, nextRound, phosIds, skotiaIds);

      const newRoundRes = await client.query(
        "INSERT INTO rounds (game_id, round_number, status) VALUES ($1, $2, 'active') RETURNING id",
        [gameId, nextRound]
      );
      await client.query(
        "INSERT INTO movements (round_id, movement_type, status) VALUES ($1, 'A', 'pending')",
        [newRoundRes.rows[0].id]
      );

      const userRes = await client.query(
        `SELECT u.id, u.username, gp.is_marked
         FROM users u
         JOIN game_players gp ON gp.user_id = u.id AND gp.game_id = $1`,
        [gameId]
      );
      const userMap = {};
      userRes.rows.forEach((r) => { userMap[String(r.id)] = { username: r.username, isMarked: r.is_marked }; });

      const enrichedGroups = newGroups.map((g) => ({
        ...g,
        members: g.memberIds.map((id) => ({
          id,
          username: userMap[id]?.username ?? id,
          isMarked: userMap[id]?.isMarked ?? false,
        })),
      }));

      const teamPtsRes = await client.query(
        'SELECT team, points FROM game_teams WHERE game_id = $1', [gameId]
      );
      const teamPoints = { phos: 0, skotia: 0 };
      teamPtsRes.rows.forEach((r) => { teamPoints[r.team] = r.points; });

      await client.query('COMMIT');
      // Init in-memory turn state for new groups (A is pending; startTurns called on activateA)
      await _initTurnState(newGroups, gameId, lobbyId);

      return {
        step:        'nextRound',
        roundNumber: nextRound,
        totalRounds,
        newGroups:   enrichedGroups,
        teamPoints,
        lobbyId: String(lobbyId),
        gameId:  String(gameId),
      };
    }

    await client.query('ROLLBACK');
    throw new Error(
      `advanceMovement: unexpected state — movA=${movA?.status ?? 'none'}, ` +
      `movB=${movB?.status ?? 'none'}, movC=${movC?.status ?? 'none'}, roundStatus=${roundStatus}`
    );
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// _resolveVoting — inner helper (runs inside an existing transaction)
// ---------------------------------------------------------------------------
async function _resolveVoting(client, gameId, roundNumber) {
  // Get the active Movement C id
  const movRes = await client.query(
    `SELECT m.id
     FROM movements m
     JOIN rounds r ON r.id = m.round_id
     WHERE r.game_id = $1 AND r.round_number = $2 AND m.movement_type = 'C'`,
    [gameId, roundNumber]
  );
  const movementId = movRes.rows[0]?.id;

  // Get all groups in this round
  const groupsRes = await client.query(
    'SELECT id FROM game_groups WHERE game_id = $1 AND round_number = $2',
    [gameId, roundNumber]
  );

  let marksApplied     = 0;
  let unmarksApplied   = 0;
  let phosPointsEarned   = 0;
  let skotiaPointsEarned = 0;
  const groupResults = new Map();

  for (const { id: groupId } of groupsRes.rows) {
    const votesRes = await client.query(
      'SELECT voter_id, target_id, vote FROM movement_c_votes WHERE group_id = $1 AND movement_id = $2',
      [groupId, movementId]
    );

    const membersRes = await client.query(
      `SELECT ggm.user_id, u.username, gp.is_marked, gp.team
       FROM game_group_members ggm
       JOIN users u ON u.id = ggm.user_id
       JOIN game_players gp ON gp.game_id = $1 AND gp.user_id = ggm.user_id
       WHERE ggm.group_id = $2`,
      [gameId, groupId]
    );

    const groupActions = [];

    for (const member of membersRes.rows) {
      const targetId   = String(member.user_id);
      const isMarked   = member.is_marked;
      const isSkotia   = member.team === 'skotia';

      const votesForTarget = votesRes.rows.filter(
        (v) => String(v.target_id) === targetId
      );
      if (votesForTarget.length === 0) continue;

      const skotiaVotes = votesForTarget.filter((v) => v.vote === 'skotia').length;
      const phosVotes   = votesForTarget.filter((v) => v.vote === 'phos').length;
      const majority    = skotiaVotes > phosVotes ? 'skotia' : 'phos';

      let action     = null;
      let wasCorrect = false;

      if (!isMarked && majority === 'skotia') {
        action     = 'mark';
        wasCorrect = isSkotia;
        await client.query(
          'UPDATE game_players SET is_marked = true WHERE game_id = $1 AND user_id = $2',
          [gameId, targetId]
        );
        marksApplied++;
        if (wasCorrect) phosPointsEarned   += POINTS.CORRECT_MARK;
        else            skotiaPointsEarned += POINTS.FALSE_MARK;

      } else if (isMarked && majority === 'phos') {
        action     = 'unmark';
        wasCorrect = !isSkotia;
        await client.query(
          'UPDATE game_players SET is_marked = false WHERE game_id = $1 AND user_id = $2',
          [gameId, targetId]
        );
        unmarksApplied++;
        if (wasCorrect) phosPointsEarned   += POINTS.CORRECT_UNMARK;
        else            skotiaPointsEarned += POINTS.FALSE_UNMARK;
      }

      if (action) {
        // Insert mark_event (need the game_player row id)
        await client.query(
          `INSERT INTO mark_events (game_id, game_player_id, round_number, action, was_correct)
           SELECT $1, gp.id, $2, $3, $4
           FROM game_players gp
           WHERE gp.game_id = $1 AND gp.user_id = $5`,
          [gameId, roundNumber, action, wasCorrect, targetId]
        );
        groupActions.push({ userId: targetId, username: member.username, action });
      }
    }

    groupResults.set(String(groupId), groupActions);
  }

  // Award team points
  if (phosPointsEarned > 0) {
    await client.query(
      "UPDATE game_teams SET points = points + $1 WHERE game_id = $2 AND team = 'phos'",
      [phosPointsEarned, gameId]
    );
  }
  if (skotiaPointsEarned > 0) {
    await client.query(
      "UPDATE game_teams SET points = points + $1 WHERE game_id = $2 AND team = 'skotia'",
      [skotiaPointsEarned, gameId]
    );
  }

  return { marksApplied, unmarksApplied, phosPointsEarned, skotiaPointsEarned, groupResults };
}

// ---------------------------------------------------------------------------
// _checkSupermajority — inner helper (runs inside an existing transaction)
// ---------------------------------------------------------------------------
async function _checkSupermajority(client, gameId) {
  const res = await client.query(
    `SELECT
       COUNT(*) FILTER (WHERE team = 'skotia')                   AS total_skotia,
       COUNT(*) FILTER (WHERE team = 'skotia' AND is_marked)     AS marked_skotia
     FROM game_players
     WHERE game_id = $1`,
    [gameId]
  );
  const { total_skotia, marked_skotia } = res.rows[0];
  if (parseInt(total_skotia, 10) === 0) return false;
  return parseInt(marked_skotia, 10) / parseInt(total_skotia, 10) >= 0.80;
}

// ---------------------------------------------------------------------------
// cleanupGameData — delete heavy round/group/submission data after a game ends.
// Keeps games, game_teams, game_players for score display.
// ---------------------------------------------------------------------------
async function cleanupGameData(gameId) {
  const key = String(gameId);
  // Cancel all per-group timers before clearing groupTurnState
  clearAllGroupTimersForGame(key);
  clearDeliberationTimer(key);
  clearMovementBTimer(key);
  clearVotingTimer(key);
  // Clear in-memory state for this game
  _roundModeCache.forEach((_, k) => { if (k.startsWith(`${key}:`)) _roundModeCache.delete(k); });
  for (const [groupId, state] of groupTurnState.entries()) {
    if (state && String(state.gameId) === key) groupTurnState.delete(groupId);
  }
  // Delete DB rows (rounds cascades → movements → movement_a_submissions + movement_c_votes)
  await pool.query('DELETE FROM rounds WHERE game_id = $1', [key]);
  await pool.query('DELETE FROM game_groups WHERE game_id = $1', [key]);
  await pool.query('DELETE FROM mark_events WHERE game_id = $1', [key]);
}

// ---------------------------------------------------------------------------
// _endGame — inner helper (runs inside an existing transaction)
// ---------------------------------------------------------------------------
async function _endGame(client, gameId, winner, condition) {
  await client.query(
    "UPDATE games SET status = 'completed', winner = $1, win_condition = $2 WHERE id = $3",
    [winner, condition, gameId]
  );

  // Clean up heavy round/group/submission data. Non-fatal.
  await cleanupGameData(String(gameId)).catch((err) =>
    console.error('[_endGame] cleanup error (non-fatal):', err.message)
  );

  const skotiaRes = await client.query(
    `SELECT u.id, u.username
     FROM game_players gp
     JOIN users u ON u.id = gp.user_id
     WHERE gp.game_id = $1 AND gp.team = 'skotia'`,
    [gameId]
  );

  const ptsRes = await client.query(
    'SELECT team, points FROM game_teams WHERE game_id = $1',
    [gameId]
  );
  const teamPoints = { phos: 0, skotia: 0 };
  ptsRes.rows.forEach((r) => { teamPoints[r.team] = r.points; });

  return {
    winner,
    condition,
    phosPoints:    teamPoints.phos,
    skotiaPoints:  teamPoints.skotia,
    skotiaPlayers: skotiaRes.rows.map((r) => ({ id: String(r.id), username: r.username })),
  };
}

function _buildSummary(votingResult, roundNumber) {
  return {
    roundNumber,
    marksApplied:   votingResult.marksApplied,
    unmarksApplied: votingResult.unmarksApplied,
    phosPoints:     votingResult.phosPointsEarned,
    skotiaPoints:   votingResult.skotiaPointsEarned,
  };
}

// ---------------------------------------------------------------------------
// getPlayerState — full state snapshot for a single player
// ---------------------------------------------------------------------------
async function getPlayerState(gameId, userId) {
  const playerRes = await pool.query(
    'SELECT team, is_marked FROM game_players WHERE game_id = $1 AND user_id = $2',
    [gameId, userId]
  );
  if (playerRes.rows.length === 0) return null;
  const { team, is_marked } = playerRes.rows[0];

  // Current group (matches current_round)
  const groupRes = await pool.query(
    `SELECT gg.id AS group_id, gg.group_index
     FROM game_group_members ggm
     JOIN game_groups gg ON gg.id = ggm.group_id
     JOIN games g ON g.id = gg.game_id
     WHERE gg.game_id = $1 AND ggm.user_id = $2 AND gg.round_number = g.current_round`,
    [gameId, userId]
  );
  const group = groupRes.rows[0];
  let groupId = null, groupIndex = null, groupMembers = [];

  if (group) {
    groupId    = group.group_id;
    groupIndex = group.group_index;

    const membersRes = await pool.query(
      `SELECT ggm.user_id, u.username, gp.is_marked
       FROM game_group_members ggm
       JOIN users u ON u.id = ggm.user_id
       JOIN game_players gp ON gp.game_id = $1 AND gp.user_id = ggm.user_id
       WHERE ggm.group_id = $2`,
      [gameId, group.group_id]
    );
    groupMembers = membersRes.rows.map((m) => ({
      id:       String(m.user_id),
      username: m.username,
      isMarked: m.is_marked,
      isYou:    String(m.user_id) === String(userId),
    }));
  }

  // Game/round/movement — include 'summarizing' rounds so state is always available
  const gameRes = await pool.query(
    `SELECT g.current_round, g.total_rounds, m.movement_type AS movement
     FROM games g
     LEFT JOIN rounds r    ON r.game_id = g.id AND r.status IN ('active', 'summarizing')
     LEFT JOIN movements m ON m.round_id = r.id AND m.status = 'active'
     WHERE g.id = $1`,
    [gameId]
  );
  const game = gameRes.rows[0];

  // Which movements are completed for the current round (used by RoundHub indicator)
  let completedMovements = [];
  if (game?.current_round) {
    const completedMovsRes = await pool.query(
      `SELECT m.movement_type
       FROM movements m
       JOIN rounds r ON r.id = m.round_id
       WHERE r.game_id = $1 AND r.round_number = $2 AND m.status = 'completed'`,
      [gameId, game.current_round]
    );
    completedMovements = completedMovsRes.rows.map((r) => r.movement_type);
  }

  // Team points
  const ptsRes = await pool.query(
    'SELECT team, points FROM game_teams WHERE game_id = $1',
    [gameId]
  );
  const teamPoints = { phos: 0, skotia: 0 };
  ptsRes.rows.forEach((r) => { teamPoints[r.team] = r.points; });

  // Include Movement B end time if B is the active movement
  const movementBEndsAt = game?.movement === 'B' ? getMovementBEndsAt(gameId) : null;

  return {
    team,
    isMarked:           is_marked,
    groupId:            groupId ? String(groupId) : null,
    groupIndex,
    groupMembers,
    teamPoints,
    currentRound:       game?.current_round ?? null,
    totalRounds:        game?.total_rounds ?? null,
    currentMovement:    game?.movement ?? null,
    completedMovements,
    movementBEndsAt,
  };
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

module.exports = {
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
  startTurns,
  scheduleBotSubmitIfNeeded,
  notifyGroupDeliberationReady,
  clearDeliberationTimer,
  getDeliberationEndsAt,
  storeMovementBAssignment,
  getMovementBAssignment,
  clearMovementBTimer,
  getMovementBEndsAt,
  scheduleMovementBAutoAdvance,
  clearVotingTimer,
  getVotingEndsAt,
  scheduleVotingTimer,
  emitGmTurnUpdate: _emitGmTurnUpdate,
  getMovementATurnInfo,
  cleanupGameData,
};
