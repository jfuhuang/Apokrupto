const pool = require('../db');
const turnService  = require('./turnService');
const votingService = require('./votingService');

// ---------------------------------------------------------------------------
// Point constants
// ---------------------------------------------------------------------------
const POINTS = {
  CORRECT_SUS:   8,   // Phos correctly sus Skotia → Phos earns
  FALSE_SUS:     4,   // Phos sus innocent Phos    → Skotia earns
  CORRECT_CLEAR: 6,   // Clear innocent Phos        → Phos earns
  FALSE_CLEAR:   8,   // Clear Skotia (re-hides)    → Skotia earns
  SKOTIA_PASSIVE: 2,  // Skotia flat bonus per Movement B
  SUS_CHALLENGE_MULTIPLIER: 0.5, // Sus players earn 50% of task points
  SKOTIA_SURVIVAL_PER_PLAYER: 4, // Per undetected Skotia per voting round
};

// Local copy of voting duration used in activateC step (avoids re-require)
const VOTING_DURATION_MS = votingService.VOTING_DURATION_MS;

// ---------------------------------------------------------------------------
// In-memory state for Movement B
// ---------------------------------------------------------------------------
const _movementBAssignments = new Map(); // gameId → Map<userId, taskId>
const _movementBTimers       = new Map(); // gameId → timeoutId
const _movementBEndTimes     = new Map(); // gameId → endsAt (epoch ms)
const MOVEMENT_B_DURATION_MS = 180_000;  // 3 minutes

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
    userMap[String(r.id)] = { username: r.username, isSus: r.is_marked };
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
      isSus: userMap[id]?.isSus ?? false,
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

/**
 * Compute how many groups (and thus how many Skotia) to create for n players.
 * Targets group size ~5 but guarantees a minimum of 4 per group.
 * Returns the number of groups, which equals the number of Skotia players needed.
 */
function computeGroupCount(n) {
  let k = Math.ceil(n / 5); // start with smallest number of groups targeting size 5
  // Reduce group count until every group has at least 4 members
  while (k > 1 && Math.floor(n / k) < 4) k--;
  return Math.max(1, k);
}

function assignTeams(userIds) {
  const shuffled = shuffle(userIds);
  // One Skotia per group so every group has 1 hidden player
  const skotiaCount = computeGroupCount(shuffled.length);
  return {
    skotia: shuffled.slice(0, skotiaCount),
    phos:   shuffled.slice(skotiaCount),
  };
}

// Builds groups: 1 Skotia + N Phos each (N may vary to ensure every player is placed).
// Groups will always have at least 4 members. Inserts game_groups + game_group_members.
async function _assignGroups(client, gameId, roundNumber, phosIds, skotiaIds) {
  const phos   = shuffle([...phosIds]);
  const skotia = shuffle([...skotiaIds]);
  const numGroups = skotia.length; // always 1 Skotia per group

  // Distribute all Phos evenly: first (phos.length % numGroups) groups get one extra
  const base  = Math.floor(phos.length / numGroups);
  const extra = phos.length % numGroups;

  const groups = [];
  let phosIdx = 0;

  for (let i = 0; i < numGroups; i++) {
    const phosCount = base + (i < extra ? 1 : 0);
    const phosSlice = phos.slice(phosIdx, phosIdx + phosCount);
    phosIdx += phosCount;
    const members = [skotia[i], ...phosSlice];

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

// ---------------------------------------------------------------------------
// Movement B helpers
// ---------------------------------------------------------------------------

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
      const { getIO } = require('../websocket/io');
      const { emitAdvanceEvents } = require('../websocket/lobbySocket');
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
        isSus: false,
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
// Round order: A (Impostor Stage) → C (Voting Stage) → B (Challenges Stage)
// Voting is now second so Sus marks are applied before Challenges begin.
//
// Steps (in order within a round):
//   activateA     → A pending → active (GM starts Impostor Stage)
//   completeA     → A active → completed (deliberation timer or GM force)
//   activateC     → A done, create C active + voting timer (GM starts Voting Stage)
//   completeC     → C active → completed + _resolveVoting (voting timer or GM force)
//   activateB     → C done, create B active (GM starts Challenges Stage)
//   completeB     → B active → completed (B timer or GM force)
//   summarizeRound→ All done, read stored voting summary (GM triggers summary)
//   nextRound     → round summarizing, more rounds (GM starts next round)
//   gameOver      → round summarizing, last round OR supermajority (detected at completeC)
// ---------------------------------------------------------------------------
async function advanceMovement(gameId) {
  const client = await pool.connect();
  try {
    // ── Phase 1: read current state (no transaction) ──────────────────────
    const gameRes = await client.query(
      `SELECT g.current_round, g.total_rounds, g.lobby_id, g.status AS game_status,
              r.id AS round_id, r.round_number, r.status AS round_status
       FROM games g
       LEFT JOIN rounds r ON r.game_id = g.id AND r.status IN ('active', 'summarizing')
       WHERE g.id = $1`,
      [gameId]
    );
    if (gameRes.rows.length === 0) throw new Error('Game not found');

    // Guard: refuse to advance a game that is already over
    if (gameRes.rows[0].game_status === 'completed') {
      throw new Error(`advanceMovement: game ${gameId} is already completed`);
    }

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
      await turnService.initTurnState(groupsData.groups, gameId, lobbyId);
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
    // Round order is now A → C (Voting) → B (Challenges), so we check !movC instead of !movB.
    if (movA && movA.status === 'active' && !movC) {
      await client.query(
        "UPDATE movements SET status = 'completed', completed_at = now() WHERE id = $1",
        [movA.id]
      );
      await client.query('COMMIT');
      return { step: 'completeA', lobbyId: String(lobbyId), gameId: String(gameId) };
    }

    // ── activateC: A completed, no C yet → GM creates Voting Stage (C) ──────
    // Voting Stage is now second (was third) so Marking status is known before Challenges.
    if (movA && movA.status === 'completed' && !movC) {
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

    // ── completeC + resolveVoting: C active → voting timer or GM force ────────
    // Votes are now resolved HERE (was at summarizeRound) so marks are set before Challenges start.
    if (movC && movC.status === 'active') {
      await client.query(
        "UPDATE movements SET status = 'completed', completed_at = now() WHERE id = $1",
        [movC.id]
      );

      const votingResult = await _resolveVoting(client, gameId, roundNumber);
      console.log(`[Game] Voting resolved at completeC game=${gameId} round=${roundNumber}: sus'd=${votingResult.susApplied} cleared=${votingResult.clearedApplied} phos=+${votingResult.phosPointsEarned} skotia=+${votingResult.skotiaPointsEarned}`);

      // Build per-player mark status map for per-socket emissions
      const marksRes = await client.query(
        'SELECT user_id::text, is_marked FROM game_players WHERE game_id = $1',
        [gameId]
      );
      const isSusMap = new Map(marksRes.rows.map((r) => [r.user_id, r.is_marked]));

      // Persist voting summary so summarizeRound can emit it after Challenges finish
      const votingSummary = _buildSummary(votingResult, roundNumber);
      await client.query(
        'UPDATE rounds SET voting_summary = $1 WHERE id = $2',
        [JSON.stringify(votingSummary), roundId]
      );

      await client.query('COMMIT');
      return {
        step:         'completeC',
        groupResults: votingResult.groupResults,
        isSusMap,
        lobbyId: String(lobbyId),
        gameId:  String(gameId),
      };
    }

    // ── activateB: C completed, no B yet → GM creates Challenges Stage (B) ──
    // Challenges Stage is now third (was second). Sus marks are already applied.
    if (movC && movC.status === 'completed' && !movB) {
      await client.query(
        "INSERT INTO movements (round_id, movement_type, status, started_at) VALUES ($1, 'B', 'active', now())",
        [roundId]
      );
      await client.query('COMMIT');
      return { step: 'activateB', roundNumber, lobbyId: String(lobbyId), gameId: String(gameId) };
    }

    // ── completeB: B active → GM or timer completes ───────────────────────────
    if (movB && movB.status === 'active') {
      await client.query(
        "UPDATE movements SET status = 'completed', completed_at = now() WHERE id = $1",
        [movB.id]
      );
      // Award Skotia passive bonus at the end of Challenges Stage
      await client.query(
        "UPDATE game_teams SET points = points + $1 WHERE game_id = $2 AND team = 'skotia'",
        [POINTS.SKOTIA_PASSIVE, gameId]
      );
      console.log(`[Game] completeB game=${gameId}: Skotia passive bonus +${POINTS.SKOTIA_PASSIVE}`);
      await client.query('COMMIT');
      return { step: 'completeB', lobbyId: String(lobbyId), gameId: String(gameId) };
    }

    // ── summarizeRound: all 3 done, round still 'active' → GM triggers summary ──
    // Votes were already resolved at completeC; just read the stored summary.
    if (movB && movB.status === 'completed' && roundStatus === 'active') {
      const summaryRes = await client.query(
        'SELECT voting_summary FROM rounds WHERE id = $1',
        [roundId]
      );
      const summary = summaryRes.rows[0]?.voting_summary || null;

      await client.query("UPDATE rounds SET status = 'summarizing' WHERE id = $1", [roundId]);
      await client.query('COMMIT');
      return {
        step:        'summarizeRound',
        roundNumber,
        lobbyId: String(lobbyId),
        gameId:  String(gameId),
        summary,
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
        // Clean up after commit so it doesn't deadlock the transaction above
        cleanupGameData(String(gameId)).catch((err) =>
          console.error('[endGame points] cleanup error (non-fatal):', err.message)
        );
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
      userRes.rows.forEach((r) => { userMap[String(r.id)] = { username: r.username, isSus: r.is_marked }; });

      const enrichedGroups = newGroups.map((g) => ({
        ...g,
        members: g.memberIds.map((id) => ({
          id,
          username: userMap[id]?.username ?? id,
          isSus: userMap[id]?.isSus ?? false,
        })),
      }));

      const teamPtsRes = await client.query(
        'SELECT team, points FROM game_teams WHERE game_id = $1', [gameId]
      );
      const teamPoints = { phos: 0, skotia: 0 };
      teamPtsRes.rows.forEach((r) => { teamPoints[r.team] = r.points; });

      await client.query('COMMIT');
      // Init in-memory turn state for new groups (A is pending; startTurns called on activateA)
      await turnService.initTurnState(newGroups, gameId, lobbyId);

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

  let susApplied       = 0;
  let clearedApplied   = 0;
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

    const groupSize   = membersRes.rows.length;
    const susThreshold = Math.ceil(groupSize / 2); // e.g. 2 in a group of 4, 3 in a group of 5
    const groupActions = [];

    for (const member of membersRes.rows) {
      const targetId   = String(member.user_id);
      const isSus      = member.is_marked;
      const isSkotia   = member.team === 'skotia';

      const votesForTarget = votesRes.rows.filter(
        (v) => String(v.target_id) === targetId
      );
      if (votesForTarget.length === 0) continue;

      const skotiaVotes = votesForTarget.filter((v) => v.vote === 'skotia').length;

      let action     = null;
      let wasCorrect = false;

      if (!isSus && skotiaVotes >= susThreshold) {
        action     = 'sus';
        wasCorrect = isSkotia;
        await client.query(
          'UPDATE game_players SET is_marked = true WHERE game_id = $1 AND user_id = $2',
          [gameId, targetId]
        );
        susApplied++;
        if (wasCorrect) phosPointsEarned   += POINTS.CORRECT_SUS;
        else            skotiaPointsEarned += POINTS.FALSE_SUS;

      } else if (isSus && skotiaVotes < susThreshold) {
        action     = 'clear';
        wasCorrect = !isSkotia;
        await client.query(
          'UPDATE game_players SET is_marked = false WHERE game_id = $1 AND user_id = $2',
          [gameId, targetId]
        );
        clearedApplied++;
        if (wasCorrect) phosPointsEarned   += POINTS.CORRECT_CLEAR;
        else            skotiaPointsEarned += POINTS.FALSE_CLEAR;
      }

      if (action) {
        // Insert sus_event (need the game_player row id)
        await client.query(
          `INSERT INTO sus_events (game_id, game_player_id, round_number, action, was_correct)
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

  // Skotia survival bonus: per undetected Skotia (POINTS.SKOTIA_SURVIVAL_PER_PLAYER)
  const survivalRes = await client.query(
    `SELECT COUNT(*) AS count FROM game_players
     WHERE game_id = $1 AND team = 'skotia' AND is_marked = false`,
    [gameId]
  );
  const survivingSkotia = parseInt(survivalRes.rows[0].count, 10);
  const survivalBonus = survivingSkotia * POINTS.SKOTIA_SURVIVAL_PER_PLAYER;
  if (survivalBonus > 0) {
    await client.query(
      "UPDATE game_teams SET points = points + $1 WHERE game_id = $2 AND team = 'skotia'",
      [survivalBonus, gameId]
    );
    skotiaPointsEarned += survivalBonus;
  }

  return { susApplied, clearedApplied, phosPointsEarned, skotiaPointsEarned, groupResults, survivalBonus, survivingSkotia };
}

// ---------------------------------------------------------------------------
// cleanupGameData — delete heavy round/group/submission data after a game ends.
// Keeps games, game_teams, game_players for score display.
// ---------------------------------------------------------------------------
async function cleanupGameData(gameId) {
  const key = String(gameId);
  // Cancel all per-group timers before clearing groupTurnState
  turnService.clearAllGroupTimersForGame(key);
  turnService.clearDeliberationTimer(key);
  clearMovementBTimer(key);
  votingService.clearVotingTimer(key);
  // Clear in-memory turn state for this game (roundModeCache + groupTurnState)
  turnService.clearGameState(key);
  // Delete DB rows using a dedicated client with a longer timeout so that
  // cascading deletes on large games don't hit the global 30s statement_timeout.
  const client = await pool.connect();
  try {
    await client.query('SET statement_timeout = 120000'); // 2 min for cleanup
    // rounds cascades → movements → movement_a_submissions + movement_c_votes + movement_c_votes
    await client.query('DELETE FROM rounds WHERE game_id = $1', [key]);
    await client.query('DELETE FROM game_groups WHERE game_id = $1', [key]);
    await client.query('DELETE FROM sus_events WHERE game_id = $1', [key]);
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// _endGame — inner helper (runs inside an existing transaction)
// ---------------------------------------------------------------------------
async function _endGame(client, gameId, winner, condition) {
  await client.query(
    "UPDATE games SET status = 'completed', winner = $1, win_condition = $2 WHERE id = $3",
    [winner, condition, gameId]
  );

  // NOTE: cleanupGameData is intentionally NOT called here.
  // It must run AFTER the transaction commits to avoid deadlocking on locked rows.

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
    susApplied:      votingResult.susApplied,
    clearedApplied:  votingResult.clearedApplied,
    phosPoints:      votingResult.phosPointsEarned,
    skotiaPoints:    votingResult.skotiaPointsEarned,
    survivalBonus:   votingResult.survivalBonus || 0,
    survivingSkotia: votingResult.survivingSkotia || 0,
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
      isSus: m.is_marked,
      isYou:    String(m.user_id) === String(userId),
    }));
  }

  // Game/round/movement — include 'summarizing' rounds so state is always available
  const gameRes = await pool.query(
    `SELECT g.current_round, g.total_rounds, g.status AS game_status,
            g.winner, g.win_condition, m.movement_type AS movement
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
    isSus:              is_marked,
    groupId:            groupId ? String(groupId) : null,
    groupIndex,
    groupMembers,
    teamPoints,
    currentRound:       game?.current_round ?? null,
    totalRounds:        game?.total_rounds ?? null,
    currentMovement:    game?.movement ?? null,
    gameStatus:         game?.game_status ?? null,
    winner:             game?.winner ?? null,
    winCondition:       game?.win_condition ?? null,
    completedMovements,
    movementBEndsAt,
  };
}

module.exports = {
  POINTS,
  createGame,
  startGame,
  advanceMovement,
  getPlayerState,
  cleanupGameData,
  // Movement B
  storeMovementBAssignment,
  getMovementBAssignment,
  clearMovementBTimer,
  scheduleMovementBAutoAdvance,
  getMovementBEndsAt,
  // Re-exported from turnService
  getGroupTurnState:         turnService.getGroupTurnState,
  setGroupTurnState:         turnService.setGroupTurnState,
  getMovementATurnInfo:      turnService.getMovementATurnInfo,
  clearTurnTimeout:          turnService.clearTurnTimeout,
  scheduleTurnTimeout:       turnService.scheduleTurnTimeout,
  clearRevealTimeout:        turnService.clearRevealTimeout,
  scheduleRevealTimeout:     turnService.scheduleRevealTimeout,
  clearAllGroupTimersForGame: turnService.clearAllGroupTimersForGame,
  startTurns:                turnService.startTurns,
  initTurnState:             turnService.initTurnState,
  scheduleBotSubmitIfNeeded: turnService.scheduleBotSubmitIfNeeded,
  notifyGroupDeliberationReady: turnService.notifyGroupDeliberationReady,
  clearDeliberationTimer:    turnService.clearDeliberationTimer,
  getDeliberationEndsAt:     turnService.getDeliberationEndsAt,
  emitGmTurnUpdate:          turnService.emitGmTurnUpdate,
  // Re-exported from votingService
  clearVotingTimer:          votingService.clearVotingTimer,
  getVotingEndsAt:           votingService.getVotingEndsAt,
  scheduleVotingTimer:       votingService.scheduleVotingTimer,
};
