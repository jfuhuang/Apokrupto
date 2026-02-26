const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { getSabotage } = require('../data/sabotages');
const gameService = require('../services/gameService');

// In-memory map of lobbyId -> Set of connected userIds (as strings)
const lobbyConnections = new Map();

// In-memory map of lobbyId -> { type, isCritical, timerId, expiresAt, label }
const activeSabotages = new Map();

// Tracks which entries in lobbyConnections are fake (bot) connections
const fakeConnections = new Map();

// Module-level io reference so helpers outside this file can broadcast
let _io = null;

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

  return {
    lobbyId: lobby.id,
    name: lobby.name,
    maxPlayers: lobby.max_players,
    status: lobby.status,
    hostId: lobby.created_by,
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
  if (!_io) return;
  try {
    const state = await getLobbyState(lobbyId);
    if (state) _io.to(`lobby:${String(lobbyId)}`).emit('lobbyUpdate', state);
  } catch (err) {
    console.error('[WS] broadcastLobbyUpdate error:', err);
  }
}

function broadcastPointsUpdate(lobbyId, payload) {
  if (!_io) return;
  _io.to(`lobby:${String(lobbyId)}`).emit('pointsUpdate', payload);
}

/**
 * Clear an active sabotage (called from lobbyRoutes after a successful fix).
 * Returns the cleared sabotage object, or null if none was active.
 */
function clearSabotage(lobbyId) {
  const roomKey = String(lobbyId);
  const entry = activeSabotages.get(roomKey);
  if (!entry) return null;
  if (entry.timerId) clearTimeout(entry.timerId);
  activeSabotages.delete(roomKey);
  return entry;
}

function broadcastSabotageFixed(lobbyId, type) {
  if (!_io) return;
  _io.to(`lobby:${String(lobbyId)}`).emit('sabotageFixed', { type });
}

function broadcastPlayerKicked(lobbyId, userId) {
  if (!_io) return;
  _io.to(`lobby:${String(lobbyId)}`).emit('playerKicked', { userId: String(userId) });
}

function setupLobbySocket(httpServer) {
  _io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });
  const io = _io; // local alias so handlers below continue to work

  const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

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
          });
        }

        const state = await getLobbyState(lobbyId);

        if (!state) {
          if (callback) callback({ error: 'Lobby not found' });
          return;
        }

        console.log(`[WS] Sending lobbyUpdate to lobby:${roomKey}`, {
          playerCount: state?.players?.length,
          roomKey,
        });
        io.to(`lobby:${roomKey}`).emit('lobbyUpdate', state);

        if (callback) callback({ ok: true, totalInnocentPoints: state.totalInnocentPoints ?? 0 });
      } catch (err) {
        console.error('[WS] joinRoom error:', err);
        if (callback) callback({ error: err.message });
      }
    });

    // Host starts the game (Phos/Skotia social deduction)
    socket.on('startGame', async ({ lobbyId }, callback) => {
      try {
        const lobbyRes = await pool.query(
          'SELECT created_by, status FROM lobbies WHERE id = $1',
          [lobbyId]
        );
        if (lobbyRes.rows.length === 0) throw new Error('Lobby not found');

        const lobby = lobbyRes.rows[0];
        if (String(lobby.created_by) !== socket.userId) {
          throw new Error('Only the host can start the game');
        }
        if (lobby.status !== 'waiting') throw new Error('Game already started');

        // Create game record + start it (assigns teams, groups, round 1 Movement A)
        const gameId = await gameService.createGame(lobbyId, 4);
        const { playerTeams, playerGroups, skotiaPlayers, groups } =
          await gameService.startGame(gameId);

        console.log(
          `[WS] startGame lobby ${lobbyId}: gameId=${gameId}, ` +
          `${skotiaPlayers.length} skotia / ${playerTeams.size - skotiaPlayers.length} phos`
        );

        // Emit per-player roleAssigned
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
            isGm: uid === String(lobby.created_by),
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
        io.to(roomKey).emit('movementStart', { movement: 'A', roundNumber: 1 });

        // Stamp turnStartedAt and schedule server-side auto-advance timers.
        // Clients receive the initial turnStart via joinRoom when MovementAScreen mounts.
        gameService.startTurns(groups);

        if (callback) callback({ ok: true, gameId });
      } catch (err) {
        console.error('[WS] startGame error:', err.message);
        if (callback) callback({ error: err.message });
      }
    });

    // Deceiver activates a sabotage
    socket.on('activateSabotage', async ({ lobbyId, sabotageType } = {}, callback) => {
      try {
        const roomKey = String(lobbyId);

        // 1. Validate lobby is in_progress
        const lobbyResult = await pool.query(
          'SELECT status FROM lobbies WHERE id = $1',
          [lobbyId]
        );
        if (lobbyResult.rows.length === 0) {
          return callback && callback({ error: 'Lobby not found' });
        }
        if (lobbyResult.rows[0].status !== 'in_progress') {
          return callback && callback({ error: 'Game is not in progress' });
        }

        // 2. Validate socket user is a deceiver in this lobby
        const playerResult = await pool.query(
          'SELECT role FROM lobby_players WHERE lobby_id = $1 AND user_id = $2',
          [lobbyId, socket.userId]
        );
        if (playerResult.rows.length === 0) {
          return callback && callback({ error: 'Not in this lobby' });
        }
        if (playerResult.rows[0].role !== 'deceiver') {
          return callback && callback({ error: 'Only deceivers can activate sabotages' });
        }

        // 3. Reject if a sabotage is already active
        if (activeSabotages.has(roomKey)) {
          return callback && callback({ error: 'A sabotage is already active' });
        }

        // 4. Load sabotage definition
        const sabotage = getSabotage(sabotageType);
        if (!sabotage) {
          return callback && callback({ error: 'Unknown sabotage type' });
        }

        // 5. Store in activeSabotages
        const startedAt = Date.now();
        const expiresAt = sabotage.isCritical ? startedAt + sabotage.duration * 1000 : null;
        const entry = { type: sabotageType, isCritical: sabotage.isCritical, startedAt, expiresAt, label: sabotage.label, timerId: null };

        if (sabotage.isCritical) {
          entry.timerId = setTimeout(async () => {
            activeSabotages.delete(roomKey);
            try {
              await pool.query("UPDATE lobbies SET status='completed' WHERE id=$1", [lobbyId]);
              await pool.query(
                `DELETE FROM users WHERE id IN (
                  SELECT lp.user_id FROM lobby_players lp
                  JOIN users u ON u.id = lp.user_id
                  WHERE lp.lobby_id = $1 AND u.password_hash IS NULL
                )`,
                [lobbyId]
              );
            } catch (err) {
              console.error('[WS] gameOver DB update error:', err);
            }
            io.to(`lobby:${roomKey}`).emit('gameOver', { winner: 'deceivers', reason: sabotage.label });
            console.log(`[WS] Sabotage ${sabotageType} expired — deceivers win in lobby ${lobbyId}`);
          }, sabotage.duration * 1000);
        }

        activeSabotages.set(roomKey, entry);

        // 6. Broadcast sabotageActive to lobby room
        io.to(`lobby:${roomKey}`).emit('sabotageActive', {
          type: sabotageType,
          isCritical: sabotage.isCritical,
          startedAt,
          expiresAt,
          label: sabotage.label,
        });

        console.log(`[WS] Sabotage ${sabotageType} activated in lobby ${lobbyId} by user ${socket.userId}`);
        if (callback) callback({ ok: true });
      } catch (err) {
        console.error('[WS] activateSabotage error:', err);
        if (callback) callback({ error: 'Server error' });
      }
    });

    // GM advances the game to the next movement/phase
    socket.on('gmAdvance', async ({ gameId } = {}, callback) => {
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
        if (String(gameRes.rows[0].created_by) !== socket.userId) {
          throw new Error('Only the GM can advance the game');
        }

        gameService.clearDeliberationTimer(gameId); // cancel auto-advance if pending
        const result = await gameService.advanceMovement(gameId);
        console.log(`[WS] gmAdvance game ${gameId}: → ${result.gameOver ? 'GAME OVER' : result.nextMovement}`);

        // Emit the appropriate socket events (shared logic with REST route)
        _emitAdvanceEvents(io, result);

        if (callback) callback({ ok: true, ...result });
      } catch (err) {
        console.error('[WS] gmAdvance error:', err.message);
        if (callback) callback({ error: err.message });
      }
    });

    // Clean up on disconnect
    socket.on('disconnect', async () => {
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

function getActiveSabotage(lobbyId) {
  const entry = activeSabotages.get(String(lobbyId));
  if (!entry) return null;
  const { timerId, ...rest } = entry; // strip non-serialisable timer handle
  return rest;
}

function getIO() { return _io; }

/**
 * Emit the correct socket events after gameService.advanceMovement() resolves.
 * Shared between the WS gmAdvance handler and the REST POST /advance route.
 */
function _emitAdvanceEvents(io, result) {
  if (!io) return;
  const lobbyRoom = `lobby:${String(result.lobbyId)}`;

  if (result.gameOver) {
    if (result.groupResults) {
      for (const [gId, actions] of result.groupResults) {
        io.to(`lobby:${gId}`).emit('votingComplete', { markResults: actions });
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
    // Voting just resolved — emit per-group results + round summary
    if (result.groupResults) {
      for (const [gId, actions] of result.groupResults) {
        io.to(`lobby:${gId}`).emit('votingComplete', { markResults: actions });
      }
    }
    io.to(lobbyRoom).emit('roundSummary', result.summary);

    // Per-player movementStart with new group assignment
    if (result.newGroups) {
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

      // Stamp turnStartedAt and schedule auto-advance timers for new groups.
      // Clients get initial turnStart via joinRoom when MovementAScreen mounts.
      gameService.startTurns(result.newGroups);
    }
  }
}

module.exports = { setupLobbySocket, getIO, broadcastLobbyUpdate, addFakeConnection, broadcastPointsUpdate, clearSabotage, broadcastSabotageFixed, getActiveSabotage, broadcastPlayerKicked, emitAdvanceEvents: _emitAdvanceEvents };
