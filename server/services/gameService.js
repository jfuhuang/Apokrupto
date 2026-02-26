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
// groupTurnState[groupId] = { turnOrder, currentIndex, completedCount, promptId, gameId, turnStartedAt }
// ---------------------------------------------------------------------------
const groupTurnState = new Map();

// Per-group server-side auto-advance timers
const _turnTimers = new Map(); // groupId → timeoutId

function clearTurnTimeout(groupId) {
  const tid = _turnTimers.get(String(groupId));
  if (tid) {
    clearTimeout(tid);
    _turnTimers.delete(String(groupId));
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
  await pool.query(
    `INSERT INTO movement_a_submissions (movement_id, group_id, user_id, word)
     VALUES ($1, $2, $3, '—')
     ON CONFLICT (movement_id, user_id) DO NOTHING`,
    [movementId, groupId, skippedUserId]
  );

  // Re-check in case HTTP submit arrived during our DB round-trip
  const fresh = getGroupTurnState(groupId);
  if (!fresh || fresh.currentIndex !== expectedIndex) return;

  const newIndex     = expectedIndex + 1;
  const newCompleted = state.completedCount + 1;

  // Lazy-load io to avoid circular dependency at module load time
  const { getIO } = require('../websocket/lobbySocket');
  const io = getIO();

  if (newCompleted >= state.turnOrder.length) {
    // Last player — fetch all words and emit deliberationStart
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
    setGroupTurnState(groupId, { ...state, currentIndex: newIndex, completedCount: newCompleted });
    if (io) io.to(`lobby:${groupId}`).emit('deliberationStart', { words });
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
      });
    }
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

  const word = BOT_WORDS[Math.floor(Math.random() * BOT_WORDS.length)];

  await pool.query(
    `INSERT INTO movement_a_submissions (movement_id, group_id, user_id, word)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (movement_id, user_id) DO UPDATE SET word = EXCLUDED.word`,
    [movementId, groupId, botUserId, word]
  );

  clearTurnTimeout(groupId);

  // Re-check in case HTTP submit arrived during our DB round-trip
  const fresh = getGroupTurnState(groupId);
  if (!fresh || fresh.currentIndex !== expectedIndex) return;

  const newIndex     = expectedIndex + 1;
  const newCompleted = state.completedCount + 1;

  const { getIO } = require('../websocket/lobbySocket');
  const io = getIO();

  const userRes = await pool.query('SELECT username FROM users WHERE id = $1', [botUserId]);
  const lastWord = { userId: botUserId, username: userRes.rows[0]?.username ?? 'Bot', word };

  if (newCompleted >= state.turnOrder.length) {
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
    setGroupTurnState(groupId, { ...state, currentIndex: newIndex, completedCount: newCompleted });
    if (io) io.to(`lobby:${groupId}`).emit('deliberationStart', { words, lastWord });
  } else {
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
        lastWord,
      });
    }
    scheduleTurnTimeout(groupId, newIndex);
    scheduleBotSubmitIfNeeded(groupId); // chain: next player might also be a bot
  }
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
  for (const group of groups) {
    const gid   = String(group.groupId);
    const state = getGroupTurnState(gid);
    if (!state) continue;
    setGroupTurnState(gid, { ...state, turnStartedAt: now });
    scheduleTurnTimeout(gid, 0);
    scheduleBotSubmitIfNeeded(gid); // auto-submit if first player is a bot
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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
async function _initTurnState(groups, gameId) {
  const promptRes = await pool.query(
    'SELECT id FROM prompts ORDER BY random() LIMIT $1',
    [groups.length]
  );

  groups.forEach((group, i) => {
    const promptId =
      (promptRes.rows[i] || promptRes.rows[0])?.id ?? null;

    groupTurnState.set(String(group.groupId), {
      turnOrder:      shuffle([...group.memberIds]),
      currentIndex:   0,
      completedCount: 0,
      promptId,
      gameId:         String(gameId),
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
async function startGame(gameId) {
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
    const players = playersRes.rows;

    if (players.length < 5) {
      throw new Error('Need at least 5 players to start');
    }
    if (players.length % 5 !== 0) {
      throw new Error(`Player count must be divisible by 5 (got ${players.length})`);
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

    // Round 1, Movement A (active immediately)
    const roundRes = await client.query(
      "INSERT INTO rounds (game_id, round_number, status) VALUES ($1, 1, 'active') RETURNING id",
      [gameId]
    );
    const roundId = roundRes.rows[0].id;

    await client.query(
      "INSERT INTO movements (round_id, movement_type, status, started_at) VALUES ($1, 'A', 'active', now())",
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

    // Initialise in-memory turn state (after commit — reads from DB are fine now)
    await _initTurnState(groups, gameId);

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
// advanceMovement — state machine: A→B, B→C, C→(next round or game over)
// ---------------------------------------------------------------------------
async function advanceMovement(gameId) {
  const client = await pool.connect();
  try {
    // Read current state BEFORE transaction
    const stateRes = await client.query(
      `SELECT g.current_round, g.total_rounds, g.lobby_id,
              r.id AS round_id, r.round_number,
              m.id AS movement_id, m.movement_type
       FROM games g
       JOIN rounds r    ON r.game_id = g.id AND r.status = 'active'
       JOIN movements m ON m.round_id = r.id AND m.status = 'active'
       WHERE g.id = $1`,
      [gameId]
    );
    if (stateRes.rows.length === 0) throw new Error('No active movement found for this game');

    const {
      current_round: currentRound,
      total_rounds:  totalRounds,
      lobby_id:      lobbyId,
      round_id:      roundId,
      round_number:  roundNumber,
      movement_id:   movementId,
      movement_type: movementType,
    } = stateRes.rows[0];

    await client.query('BEGIN');

    // Complete the current movement
    await client.query(
      "UPDATE movements SET status = 'completed', completed_at = now() WHERE id = $1",
      [movementId]
    );

    // ---- A → B ----
    if (movementType === 'A') {
      await client.query(
        "INSERT INTO movements (round_id, movement_type, status, started_at) VALUES ($1, 'B', 'active', now())",
        [roundId]
      );
      // Skotia passive bonus for entering task phase
      await client.query(
        "UPDATE game_teams SET points = points + $1 WHERE game_id = $2 AND team = 'skotia'",
        [POINTS.SKOTIA_PASSIVE, gameId]
      );
      await client.query('COMMIT');
      return { nextMovement: 'B', roundNumber, lobbyId };
    }

    // ---- B → C ----
    if (movementType === 'B') {
      await client.query(
        "INSERT INTO movements (round_id, movement_type, status, started_at) VALUES ($1, 'C', 'active', now())",
        [roundId]
      );
      await client.query('COMMIT');
      return { nextMovement: 'C', roundNumber, lobbyId };
    }

    // ---- C → resolve voting, then decide ----
    const votingResult = await _resolveVoting(client, gameId, roundNumber);

    const supermajority = await _checkSupermajority(client, gameId);

    if (supermajority) {
      await client.query("UPDATE rounds SET status = 'completed' WHERE id = $1", [roundId]);
      const gameOverData = await _endGame(client, gameId, 'phos', 'supermajority');
      await client.query('COMMIT');
      return {
        gameOver:     true,
        winner:       'phos',
        condition:    'supermajority',
        summary:      _buildSummary(votingResult, roundNumber),
        groupResults: votingResult.groupResults,
        gameOverData,
        lobbyId,
      };
    }

    if (roundNumber >= totalRounds) {
      // Final round — compare team points
      const ptsRes = await client.query(
        'SELECT team, points FROM game_teams WHERE game_id = $1',
        [gameId]
      );
      const pts = { phos: 0, skotia: 0 };
      ptsRes.rows.forEach((r) => { pts[r.team] = r.points; });
      const winner = pts.phos >= pts.skotia ? 'phos' : 'skotia';

      await client.query("UPDATE rounds SET status = 'completed' WHERE id = $1", [roundId]);
      const gameOverData = await _endGame(client, gameId, winner, 'points');
      await client.query('COMMIT');
      return {
        gameOver:     true,
        winner,
        condition:    'points',
        summary:      _buildSummary(votingResult, roundNumber),
        groupResults: votingResult.groupResults,
        gameOverData,
        lobbyId,
      };
    }

    // More rounds — complete this round, start next
    await client.query("UPDATE rounds SET status = 'completed' WHERE id = $1", [roundId]);
    const nextRound = roundNumber + 1;
    await client.query(
      'UPDATE games SET current_round = $1 WHERE id = $2',
      [nextRound, gameId]
    );

    // Rebuild groups for the new round
    const phosRes = await client.query(
      "SELECT user_id FROM game_players WHERE game_id = $1 AND team = 'phos'",
      [gameId]
    );
    const skotiaRes = await client.query(
      "SELECT user_id FROM game_players WHERE game_id = $1 AND team = 'skotia'",
      [gameId]
    );
    const phosIds   = phosRes.rows.map((r) => String(r.user_id));
    const skotiaIds = skotiaRes.rows.map((r) => String(r.user_id));

    const newGroups = await _assignGroups(client, gameId, nextRound, phosIds, skotiaIds);

    const newRoundRes = await client.query(
      "INSERT INTO rounds (game_id, round_number, status) VALUES ($1, $2, 'active') RETURNING id",
      [gameId, nextRound]
    );
    await client.query(
      "INSERT INTO movements (round_id, movement_type, status, started_at) VALUES ($1, 'A', 'active', now())",
      [newRoundRes.rows[0].id]
    );

    // Load usernames for group member info
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

    // Enrich newGroups with member details
    const enrichedGroups = newGroups.map((g) => ({
      ...g,
      members: g.memberIds.map((id) => ({
        id,
        username: userMap[id]?.username ?? id,
        isMarked: userMap[id]?.isMarked ?? false,
      })),
    }));

    // Team points snapshot
    const teamPtsRes = await client.query(
      'SELECT team, points FROM game_teams WHERE game_id = $1',
      [gameId]
    );
    const teamPoints = { phos: 0, skotia: 0 };
    teamPtsRes.rows.forEach((r) => { teamPoints[r.team] = r.points; });

    await client.query('COMMIT');

    // Initialise turn state for new groups
    await _initTurnState(newGroups, gameId);

    return {
      nextMovement: 'A',
      roundNumber:  nextRound,
      totalRounds,
      summary:      _buildSummary(votingResult, roundNumber),
      groupResults: votingResult.groupResults,
      newGroups:    enrichedGroups,
      teamPoints,
      lobbyId,
    };
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
// _endGame — inner helper (runs inside an existing transaction)
// ---------------------------------------------------------------------------
async function _endGame(client, gameId, winner, condition) {
  await client.query(
    "UPDATE games SET status = 'completed', winner = $1, win_condition = $2 WHERE id = $3",
    [winner, condition, gameId]
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
    marksApplied:      votingResult.marksApplied,
    unmarksApplied:    votingResult.unmarksApplied,
    phosPointsEarned:  votingResult.phosPointsEarned,
    skotiaPointsEarned: votingResult.skotiaPointsEarned,
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

  // Game/round/movement
  const gameRes = await pool.query(
    `SELECT g.current_round, g.total_rounds, m.movement_type AS movement
     FROM games g
     LEFT JOIN rounds r    ON r.game_id = g.id AND r.status = 'active'
     LEFT JOIN movements m ON m.round_id = r.id AND m.status = 'active'
     WHERE g.id = $1`,
    [gameId]
  );
  const game = gameRes.rows[0];

  // Team points
  const ptsRes = await pool.query(
    'SELECT team, points FROM game_teams WHERE game_id = $1',
    [gameId]
  );
  const teamPoints = { phos: 0, skotia: 0 };
  ptsRes.rows.forEach((r) => { teamPoints[r.team] = r.points; });

  return {
    team,
    isMarked:        is_marked,
    groupId:         groupId ? String(groupId) : null,
    groupIndex,
    groupMembers,
    teamPoints,
    currentRound:    game?.current_round ?? null,
    totalRounds:     game?.total_rounds ?? null,
    currentMovement: game?.movement ?? null,
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
  startTurns,
  scheduleBotSubmitIfNeeded,
};
