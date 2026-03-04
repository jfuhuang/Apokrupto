const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { GM_USERNAMES, JWT_SECRET } = require('../utils/config');
const ioModule = require('./io');
const gameService = require('../services/gameService');
const coopService = require('../services/coopService');
const logger = require('../utils/logger');

// In-memory map of lobbyId -> Set of connected userIds (as strings)
const lobbyConnections = new Map();

// Tracks which entries in lobbyConnections are fake (bot) connections
const fakeConnections = new Map();

/**
 * Query Postgres for the current lobby state and annotate each player
 * with whether they have an active socket connection.
 */
async function getLobbyState(lobbyId) {
  const lobbyResult = await pool.query(
    `SELECT l.id, l.name, l.max_players, l.status, l.created_by
     FROM lobbies l
     WHERE l.id = $1`,
    [lobbyId]
  );

  if (lobbyResult.rows.length === 0) return null;
  const lobby = lobbyResult.rows[0];

  const playersResult = await pool.query(
    `SELECT u.id, u.username, lp.points, lp.role
     FROM lobby_players lp
     JOIN users u ON lp.user_id = u.id
     WHERE lp.lobby_id = $1
     ORDER BY lp.joined_at ASC`,
    [lobbyId]
  );

  const connected = lobbyConnections.get(String(lobbyId)) || new Set();

  // Bot users (password_hash IS NULL) have no real socket — always show as connected
  const botRes = await pool.query(
    `SELECT u.id::text AS id
     FROM lobby_players lp
     JOIN users u ON lp.user_id = u.id
     WHERE lp.lobby_id = $1 AND u.password_hash IS NULL`,
    [lobbyId]
  );
  const botIds = new Set(botRes.rows.map((r) => r.id));

  const players = playersResult.rows.map((p) => ({
    id: p.id,
    username: p.username,
    isHost: p.id === lobby.created_by,
    isConnected: connected.has(String(p.id)) || botIds.has(String(p.id)),
  }));

  const totalInnocentPoints = playersResult.rows
    .filter((p) => p.role === 'innocent')
    .reduce((sum, p) => sum + parseInt(p.points || 0), 0);

  // If GM_USERNAMES is configured, surface the first GM user's id so the client
  // can show the correct START button state and "You are the GM" label.
  const gmPlayer = GM_USERNAMES.size > 0
    ? playersResult.rows.find(p => GM_USERNAMES.has(p.username))
    : null;
  const gmUserId = gmPlayer ? gmPlayer.id : null;

  return {
    lobbyId: lobby.id,
    name: lobby.name,
    maxPlayers: lobby.max_players,
    status: lobby.status,
    hostId: lobby.created_by,
    gmUserId,
    players,
    totalInnocentPoints,
  };
}

/**
 * Periodically close lobbies where all members have disconnected.
 * Runs every 60 seconds. A 2-minute grace period on lobby age prevents
 * immediately closing a lobby whose host hasn't connected via WebSocket yet.
 */
function startIdleLobbyCleaner(io) {
  const INTERVAL_MS = 60_000;

  setInterval(async () => {
    try {
      // Only clean up waiting lobbies — never kill an in_progress game
      const result = await pool.query(`
        SELECT l.id
        FROM lobbies l
        JOIN lobby_players lp ON lp.lobby_id = l.id
        WHERE l.status = 'waiting'
          AND l.created_at < NOW() - INTERVAL '2 minutes'
        GROUP BY l.id
      `);

      const toClose = result.rows
        .filter(({ id }) => {
          const roomKey = String(id);
          const connected = lobbyConnections.get(roomKey);
          if (!connected || connected.size === 0) return true;
          // Close if every connected entry is a fake (bot) connection
          const fake = fakeConnections.get(roomKey) || new Set();
          return [...connected].every((uid) => fake.has(uid));
        })
        .map(({ id }) => id);

      if (toClose.length === 0) return;

      await pool.query(
        `DELETE FROM users WHERE id IN (
          SELECT lp.user_id FROM lobby_players lp
          JOIN users u ON u.id = lp.user_id
          WHERE lp.lobby_id = ANY($1::int[]) AND u.password_hash IS NULL
        )`,
        [toClose]
      );
      await pool.query('DELETE FROM lobbies WHERE id = ANY($1::int[])', [toClose]);

      for (const lobbyId of toClose) {
        const roomKey = String(lobbyId);
        lobbyConnections.delete(roomKey);
        fakeConnections.delete(roomKey);
        io.to(`lobby:${roomKey}`).emit('lobbyClosed', {
          lobbyId,
          reason: 'All players disconnected',
        });
        console.log(`[WS] Closed idle lobby ${lobbyId} — no connected players`);
      }
    } catch (err) {
      console.error('[WS] Idle lobby cleaner error:', err);
    }
  }, INTERVAL_MS);
}

function addFakeConnection(lobbyId, userId) {
  const roomKey = String(lobbyId);
  const uid = String(userId);

  if (!lobbyConnections.has(roomKey)) lobbyConnections.set(roomKey, new Set());
  lobbyConnections.get(roomKey).add(uid);

  if (!fakeConnections.has(roomKey)) fakeConnections.set(roomKey, new Set());
  fakeConnections.get(roomKey).add(uid);
}

async function broadcastLobbyUpdate(lobbyId) {
  const io = ioModule.getIO();
  if (!io) return;
  try {
    const state = await getLobbyState(lobbyId);
    if (state) io.to(`lobby:${String(lobbyId)}`).emit('lobbyUpdate', state);
  } catch (err) {
    console.error('[WS] broadcastLobbyUpdate error:', err);
  }
}

function broadcastPointsUpdate(lobbyId, payload) {
  const io = ioModule.getIO();
  if (!io) return;
  io.to(`lobby:${String(lobbyId)}`).emit('pointsUpdate', payload);
}

function broadcastPlayerKicked(lobbyId, userId) {
  const io = ioModule.getIO();
  if (!io) return;
  io.to(`lobby:${String(lobbyId)}`).emit('playerKicked', { userId: String(userId) });
}

function setupLobbySocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });
  ioModule.setIO(io);

  // JWT authentication middleware
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = String(decoded.sub);
      socket.username = decoded.username;
      console.log(`[WS] Auth successful for user: ${socket.userId}`);
      next();
    } catch (err) {
      console.error(`[WS] Auth failed:`, err.message);
      next(new Error('Invalid token'));
    }
  });

  startIdleLobbyCleaner(io);

  io.on('connection', (socket) => {
    let currentLobbyId = null;

    console.log(`[WS] Socket Connected: ${socket.id} (user: ${socket.userId}, username: ${socket.username})`);

    // Dev debug: echo ping → pong
    socket.on('debug:ping', () => {
      socket.emit('debug:pong', { ts: Date.now(), socketId: socket.id, userId: socket.userId });
    });

    // Client joins a lobby room
    socket.on('joinRoom', async ({ lobbyId }, callback) => {
      try {
        const roomKey = String(lobbyId);
        currentLobbyId = roomKey;

        socket.join(`lobby:${roomKey}`);

        if (!lobbyConnections.has(roomKey)) {
          lobbyConnections.set(roomKey, new Set());
        }
        lobbyConnections.get(roomKey).add(socket.userId);
        console.log(`[WS] User ${socket.userId} joined room lobby:${roomKey}`);

        // If this is a group room with an active Movement A turn, send the
        // current turn state directly to the joining socket so MovementAScreen
        // knows immediately whose turn it is (without waiting for a submission).
        const turnState = gameService.getGroupTurnState(roomKey);
        if (turnState && turnState.currentIndex < turnState.turnOrder.length) {
          const elapsed = turnState.turnStartedAt
            ? Math.floor((Date.now() - turnState.turnStartedAt) / 1000)
            : 0;
          const remaining = Math.max(3, 30 - elapsed);
          socket.emit('turnStart', {
            currentPlayerId: String(turnState.turnOrder[turnState.currentIndex]),
            turnIndex:       turnState.currentIndex,
            completedCount:  turnState.completedCount,
            timeLimit:       remaining,
            turnOrder:       turnState.turnOrder.map(String),
          });
        }

        // If Movement B is active, send the timer end time so the client
        // can display the countdown and let the player pick tasks.
        try {
          const mbRes = await pool.query(
            `SELECT g.id FROM games g
             JOIN rounds r ON r.game_id = g.id AND r.status = 'active'
             JOIN movements m ON m.round_id = r.id AND m.status = 'active'
               AND m.movement_type = 'B'
             WHERE g.lobby_id = $1 AND g.status = 'active'`,
            [lobbyId]
          );
          if (mbRes.rows.length > 0) {
            const mbGameId = String(mbRes.rows[0].id);
            const movementBEndsAt = gameService.getMovementBEndsAt(mbGameId);
            if (movementBEndsAt) {
              socket.emit('movementBInfo', { movementBEndsAt });
              console.log(`[MovementB] Sent movementBEndsAt to reconnecting user ${socket.userId}`);
            }
          }
        } catch (err) {
          console.error('[MovementB] reconnect lookup error:', err.message);
        }

        const state = await getLobbyState(lobbyId);

        if (!state) {
          if (callback) callback({ error: 'Lobby not found' });
          return;
        }

        logger.info('socket', `joinRoom lobby:${roomKey} — playerCount=${state?.players?.length}`);
        console.log(`[WS] Sending lobbyUpdate to lobby:${roomKey}`, {
          playerCount: state?.players?.length,
          roomKey,
        });
        io.to(`lobby:${roomKey}`).emit('lobbyUpdate', state);

        if (callback) callback({ ok: true, totalInnocentPoints: state.totalInnocentPoints ?? 0 });
      } catch (err) {
        logger.error('socket', `joinRoom error: ${err.message}`);
        console.error('[WS] joinRoom error:', err);
        if (callback) callback({ error: err.message });
      }
    });

    // Host starts the game (Phos/Skotia social deduction)
    socket.on('startGame', async ({ lobbyId }, callback) => {
      logger.info('socket', `startGame — user=${socket.username} lobbyId=${lobbyId}`);
      try {
        const lobbyRes = await pool.query(
          'SELECT created_by, status FROM lobbies WHERE id = $1',
          [lobbyId]
        );
        if (lobbyRes.rows.length === 0) throw new Error('Lobby not found');

        const lobby = lobbyRes.rows[0];
        if (lobby.status !== 'waiting') throw new Error('Game already started');

        // Determine which connected sockets belong to GM_USERNAMES users
        const roomKey = `lobby:${String(lobbyId)}`;
        const gmUserIds = new Set();
        for (const [, sock] of io.sockets.sockets) {
          if (sock.rooms.has(roomKey) && GM_USERNAMES.has(sock.username)) {
            gmUserIds.add(sock.userId);
          }
        }
        const gmInRoom    = gmUserIds.size > 0;
        const callerIsGm  = GM_USERNAMES.has(socket.username);
        const callerIsHost = String(lobby.created_by) === socket.userId;
        if (gmInRoom ? !callerIsGm : !callerIsHost) {
          throw new Error(gmInRoom ? 'Only the GM can start the game' : 'Only the host can start the game');
        }

        // Create game record + start it (assigns teams, groups, round 1 Movement A)
        // GM users are excluded from team/group assignment — they are pure spectators.
        const gameId = await gameService.createGame(lobbyId, 4);
        const { playerTeams, playerGroups, skotiaPlayers, groups } =
          await gameService.startGame(gameId, { excludeUserIds: [...gmUserIds] });

        logger.info('socket', `startGame OK — lobby=${lobbyId} gameId=${gameId} skotia=${skotiaPlayers.length} phos=${playerTeams.size - skotiaPlayers.length}`);
        console.log(
          `[WS] startGame lobby ${lobbyId}: gameId=${gameId}, ` +
          `${skotiaPlayers.length} skotia / ${playerTeams.size - skotiaPlayers.length} phos` +
          (gmInRoom ? ` (GM excluded: ${[...gmUserIds].join(',')})` : '')
        );

        // Emit per-player roleAssigned
        const skotiaUsernames = skotiaPlayers.map((p) => p.username);

        for (const [, sock] of io.sockets.sockets) {
          if (!sock.rooms.has(roomKey)) continue;
          const uid = sock.userId;

          // GM sockets get a special spectator payload
          if (gmUserIds.has(uid)) {
            sock.emit('roleAssigned', {
              team: null,
              isGm: true,
              skotiaTeammates: [],
              groupId: null,
              groupNumber: null,
              groupMembers: [],
            });
            console.log(`[WS] roleAssigned GM (spectator) → user ${uid}`);
            continue;
          }

          const team = playerTeams.get(uid);
          if (!team) continue;

          const groupInfo = playerGroups.get(uid);
          const rolePayload = {
            team,
            isGm: gmInRoom ? false : uid === String(lobby.created_by),
            skotiaTeammates: team === 'skotia'
              ? skotiaUsernames.filter((name) => name !== sock.username)
              : [],
            groupId:      String(groupInfo?.groupId ?? ''),
            groupNumber:  groupInfo?.groupIndex ?? null,
            groupMembers: groupInfo?.members ?? [],
          };
          sock.emit('roleAssigned', rolePayload);
          console.log(`[WS] roleAssigned ${team} → user ${uid}`);
        }

        io.to(roomKey).emit('gameStarted', { gameId, countdown: 5 });
        // movementStart for A is NOT emitted here — GM must advance to activate it.

        if (callback) callback({ ok: true, gameId });
      } catch (err) {
        logger.error('socket', `startGame error: ${err.message}`);
        console.error('[WS] startGame error:', err.message);
        if (callback) callback({ error: err.message });
      }
    });

    // GM advances the game to the next movement/phase
    socket.on('gmAdvance', async ({ gameId } = {}, callback) => {
      logger.info('socket', `gmAdvance — user=${socket.username} gameId=${gameId}`);
      try {
        if (!gameId) throw new Error('gameId is required');

        // Verify the caller is the lobby host for this game
        const gameRes = await pool.query(
          `SELECT g.lobby_id, l.created_by
           FROM games g JOIN lobbies l ON l.id = g.lobby_id
           WHERE g.id = $1`,
          [gameId]
        );
        if (gameRes.rows.length === 0) throw new Error('Game not found');
        const callerIsGmUser = GM_USERNAMES.has(socket.username);
        const callerIsHost   = String(gameRes.rows[0].created_by) === socket.userId;
        if (!callerIsGmUser && !callerIsHost) {
          throw new Error('Only the GM can advance the game');
        }

        gameService.clearDeliberationTimer(gameId);     // cancel deliberation auto-advance if pending
        gameService.clearMovementBTimer(gameId);        // cancel Movement B auto-advance if pending
        gameService.clearVotingTimer(gameId);           // cancel voting timer if pending
        gameService.clearAllGroupTimersForGame(gameId); // cancel per-group turn/reveal timers
        const result = await gameService.advanceMovement(gameId);
        logger.info('socket', `gmAdvance OK — game=${gameId} step=${result.step}`);
        console.log(`[WS] gmAdvance game ${gameId}: step=${result.step}`);

        // Emit the appropriate socket events (shared logic with REST route)
        _emitAdvanceEvents(io, result);

        if (callback) callback({ ok: true, ...result });
      } catch (err) {
        // Race-detection throws a descriptive message when two concurrent calls
        // both reach the same step — this is a no-op, not a real error.
        if (err.message.includes('advanceMovement race:')) {
          console.warn('[WS] gmAdvance duplicate ignored:', err.message);
          if (callback) callback({ ok: true, step: 'noop' });
        // Guard fires when GM clicks advance after the game is already completed.
        } else if (err.message.includes('is already completed')) {
          console.warn('[WS] gmAdvance on completed game ignored:', err.message);
          if (callback) callback({ ok: true, step: 'noop' });
        } else {
          console.error('[WS] gmAdvance error:', err.message);
          if (callback) callback({ error: err.message });
        }
      }
    });

    // Clean up on disconnect
    socket.on('disconnect', async () => {
      logger.info('socket', `disconnect — user=${socket.username || socket.userId} socketId=${socket.id}`);
      console.log(`[WS] Disconnected: ${socket.id} (user: ${socket.userId})`);

      if (currentLobbyId) {
        const roomKey = `lobby:${currentLobbyId}`;

        // Only remove from connection tracking if this user has no other
        // active socket still in the room (handles reconnects / duplicate tabs)
        const stillConnected = [...io.sockets.sockets.values()].some(
          (s) => s !== socket && s.userId === socket.userId && s.rooms.has(roomKey)
        );

        if (!stillConnected) {
          const connected = lobbyConnections.get(currentLobbyId);
          if (connected) {
            connected.delete(socket.userId);
            if (connected.size === 0) {
              lobbyConnections.delete(currentLobbyId);
            }
          }
        }

        // Broadcast updated state so other clients see the player dim
        const state = await getLobbyState(currentLobbyId);
        if (state) {
          io.to(roomKey).emit('lobbyUpdate', state);
        }
      }
    });
  });

  return io;
}

/**
 * Emit a gameStateUpdate snapshot to the lobby room so all clients
 * (RoundHubScreen, GmDashboardScreen, gm.html) can refresh live state.
 * Fire-and-forget — errors are logged but never propagated.
 */
async function _emitGameStateUpdate(io, gameId, lobbyRoom) {
  try {
    const [gameRes, playersRes, ptsRes] = await Promise.all([
      pool.query(
        `SELECT g.current_round, g.total_rounds, g.status,
                m.movement_type AS movement
         FROM games g
         LEFT JOIN rounds r    ON r.game_id = g.id AND r.status IN ('active', 'summarizing')
         LEFT JOIN movements m ON m.round_id = r.id AND m.status = 'active'
         WHERE g.id = $1`,
        [gameId]
      ),
      pool.query(
        `SELECT u.id, u.username, gp.team, gp.is_marked
         FROM game_players gp
         JOIN users u ON u.id = gp.user_id
         WHERE gp.game_id = $1
         ORDER BY gp.team, u.username`,
        [gameId]
      ),
      pool.query(
        'SELECT team, points FROM game_teams WHERE game_id = $1',
        [gameId]
      ),
    ]);

    const game = gameRes.rows[0];
    if (!game) return;

    const teamPoints = { phos: 0, skotia: 0 };
    ptsRes.rows.forEach((r) => { teamPoints[r.team] = r.points; });

    io.to(lobbyRoom).emit('gameStateUpdate', {
      players: playersRes.rows.map((p) => ({
        id:       String(p.id),
        username: p.username,
        team:     p.team,
        isSus: p.is_marked,
      })),
      gameState: {
        round:       game.current_round,
        totalRounds: game.total_rounds,
        movement:    game.movement || null,
        status:      game.status,
      },
      teamPoints,
    });
  } catch (err) {
    console.error('[gameStateUpdate] emit error:', err.message);
  }
}

/**
 * Emit the correct socket events after gameService.advanceMovement() resolves.
 * Shared between the WS gmAdvance handler and the REST POST /advance route.
 * Uses result.step (new 9-step state machine) to decide what to emit.
 */
function _emitAdvanceEvents(io, result) {
  if (!io || !result) return;
  const lobbyRoom = `lobby:${String(result.lobbyId)}`;

  // ── activateA: GM started Movement A ──────────────────────────────────────
  if (result.step === 'activateA') {
    if (result.playerGroupMap && result.groups) {
      let emitCount = 0;
      for (const [, sock] of io.sockets.sockets) {
        if (!sock.rooms.has(lobbyRoom)) continue;
        const group = result.playerGroupMap.get(sock.userId);
        if (!group) continue;
        sock.emit('movementStart', {
          movement:     'A',
          roundNumber:  result.roundNumber,
          groupId:      String(group.groupId),
          groupNumber:  group.groupIndex,
          groupMembers: group.members,
        });
        emitCount++;
      }
      console.log(`[Socket] activateA → movementStart per-socket to ${emitCount} players, ${result.groups.length} groups`);
      // Also notify the lobby room (GM dashboard) that Movement A has started
      io.to(lobbyRoom).emit('movementStart', { movement: 'A', roundNumber: result.roundNumber, totalRounds: result.totalRounds });
      // Start per-group turn timers; clients get initial turnStart via joinRoom
      gameService.startTurns(result.groups);
    }
  }

  // ── completeA: deliberation timer (or GM force) finished Impostor Stage ──
  else if (result.step === 'completeA') {
    io.to(lobbyRoom).emit('movementComplete', { movement: 'A' });
    console.log(`[Socket] completeA → movementComplete {A} to ${lobbyRoom}`);
  }

  // ── activateC: GM started Voting Stage — now the SECOND step (A → C → B) ─
  else if (result.step === 'activateC') {
    io.to(lobbyRoom).emit('movementStart', { movement: 'C', roundNumber: result.roundNumber });
    io.to(lobbyRoom).emit('votingReady', { votingEndsAt: result.votingEndsAt });
    gameService.scheduleVotingTimer(result.gameId, result.votingEndsAt);
    console.log(`[Socket] activateC → movementStart {C} + votingReady to ${lobbyRoom} (votingEndsAt=${result.votingEndsAt})`);
  }

  // ── completeC: votes resolved + marks applied — broadcast results before Challenges ──
  // In the A→C→B order, vote resolution happens here so Sus status is known before Challenges.
  else if (result.step === 'completeC') {
    if (result.groupResults) {
      for (const [gId, actions] of result.groupResults) {
        io.to(`lobby:${gId}`).emit('votingComplete', { susResults: actions });
      }
      console.log(`[Socket] completeC → votingComplete to ${result.groupResults.size || 0} groups`);
    }
    // Push per-player sus status so clients show Sus indicator before Challenges start
    if (result.isSusMap) {
      let susCount = 0;
      for (const [, sock] of io.sockets.sockets) {
        if (!sock.rooms.has(lobbyRoom)) continue;
        const isSus = result.isSusMap.get(sock.userId);
        if (isSus !== undefined) { sock.emit('susStatusUpdate', { isSus }); susCount++; }
      }
      console.log(`[Socket] completeC → susStatusUpdate per-socket to ${susCount} players`);
    }
    io.to(lobbyRoom).emit('movementComplete', { movement: 'C' });
    console.log(`[Socket] completeC → movementComplete {C} to ${lobbyRoom}`);
  }

  // ── activateB: GM started Challenges Stage — now the THIRD step (A → C → B) ─
  else if (result.step === 'activateB') {
    // Schedule timer first so getMovementBEndsAt is available for the emit
    gameService.scheduleMovementBAutoAdvance(result.gameId);
    const movementBEndsAt = gameService.getMovementBEndsAt(result.gameId);
    io.to(lobbyRoom).emit('movementStart', {
      movement: 'B',
      roundNumber: result.roundNumber,
      movementBEndsAt,
    });
    console.log(`[Socket] activateB → movementStart {B} to ${lobbyRoom} (endsAt=${movementBEndsAt})`);
  }

  // ── completeB: B timer (or GM force) finished Challenges Stage ───────────
  else if (result.step === 'completeB') {
    // End all active co-op sessions for this game
    const ended = coopService.endAllSessionsForGame(result.gameId);
    for (const s of ended) {
      io.to(`coop:${s.id}`).emit('coopSessionEnd', {
        sessionId: s.id,
        reason: 'movementOver',
        sessionPoints: (s.sessionPoints?.A || 0) + (s.sessionPoints?.B || 0),
      });
    }
    io.to(lobbyRoom).emit('movementComplete', { movement: 'B' });
    console.log(`[Socket] completeB → movementComplete {B} to ${lobbyRoom} (ended ${ended.length} coop sessions)`);
  }

  // ── summarizeRound: GM triggers summary screen — voting events already sent at completeC ──
  else if (result.step === 'summarizeRound') {
    io.to(lobbyRoom).emit('roundSummary', result.summary);
    console.log(`[Socket] summarizeRound → roundSummary to ${lobbyRoom}`);
  }

  // ── nextRound: GM starts new round — per-player group assignments ─────────
  else if (result.step === 'nextRound') {
    const userGroupMap = new Map();
    for (const group of (result.newGroups || [])) {
      for (const memberId of group.memberIds) {
        userGroupMap.set(String(memberId), group);
      }
    }
    let emitCount = 0;
    for (const [, sock] of io.sockets.sockets) {
      if (!sock.rooms.has(lobbyRoom)) continue;
      const group = userGroupMap.get(sock.userId);
      if (!group) continue;
      sock.emit('roundSetup', {
        roundNumber:  result.roundNumber,
        totalRounds:  result.totalRounds,
        groupId:      String(group.groupId),
        groupNumber:  group.groupIndex,
        groupMembers: group.members,
        teamPoints:   result.teamPoints,
      });
      emitCount++;
    }
    console.log(`[Socket] nextRound → roundSetup per-socket to ${emitCount} players (round ${result.roundNumber}/${result.totalRounds})`);
    // NOTE: startTurns is NOT called here — GM must activate A first
  }

  // ── gameOver: supermajority hit during summarize, or final round ──────────
  else if (result.step === 'gameOver') {
    if (result.groupResults) {
      for (const [gId, actions] of result.groupResults) {
        io.to(`lobby:${gId}`).emit('votingComplete', { susResults: actions });
      }
      console.log(`[Socket] gameOver → votingComplete to ${result.groupResults.size || 0} groups`);
    }
    // Emit personal sus status to each connected lobby member before roundSummary/gameOver
    if (result.isSusMap) {
      let susCount = 0;
      for (const [, sock] of io.sockets.sockets) {
        if (!sock.rooms.has(lobbyRoom)) continue;
        const isSus = result.isSusMap.get(sock.userId);
        if (isSus !== undefined) { sock.emit('susStatusUpdate', { isSus }); susCount++; }
      }
      console.log(`[Socket] gameOver → susStatusUpdate per-socket to ${susCount} players`);
    }
    if (result.summary) {
      io.to(lobbyRoom).emit('roundSummary', result.summary);
    }
    io.to(lobbyRoom).emit('gameOver', result.gameOverData);
    console.log(`[Socket] gameOver → roundSummary + gameOver to ${lobbyRoom} (winner=${result.gameOverData?.winner})`);
    // No gameStateUpdate needed — game is over
    return;
  }

  else {
    console.warn('[emitAdvanceEvents] Unknown step:', result.step);
    return;
  }

  // ── Broadcast gameStateUpdate after every step (except gameOver) ───────────
  if (result.gameId) {
    console.log(`[Socket] ${result.step} → gameStateUpdate to ${lobbyRoom}`);
    _emitGameStateUpdate(io, result.gameId, lobbyRoom).catch((err) =>
      console.error('[gameStateUpdate] error:', err.message)
    );
  }
}

module.exports = { setupLobbySocket, broadcastLobbyUpdate, addFakeConnection, broadcastPointsUpdate, broadcastPlayerKicked, emitAdvanceEvents: _emitAdvanceEvents };
