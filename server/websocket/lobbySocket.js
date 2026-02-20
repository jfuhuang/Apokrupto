const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// In-memory map of lobbyId -> Set of connected userIds (as strings)
const lobbyConnections = new Map();

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
    `SELECT u.id, u.username
     FROM lobby_players lp
     JOIN users u ON lp.user_id = u.id
     WHERE lp.lobby_id = $1
     ORDER BY lp.joined_at ASC`,
    [lobbyId]
  );

  const connected = lobbyConnections.get(String(lobbyId)) || new Set();

  const players = playersResult.rows.map((p) => ({
    id: p.id,
    username: p.username,
    isHost: p.id === lobby.created_by,
    isConnected: connected.has(String(p.id)),
  }));

  return {
    lobbyId: lobby.id,
    name: lobby.name,
    maxPlayers: lobby.max_players,
    status: lobby.status,
    hostId: lobby.created_by,
    players,
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
      // Active lobbies with at least one DB player, past the grace period
      const result = await pool.query(`
        SELECT l.id
        FROM lobbies l
        JOIN lobby_players lp ON lp.lobby_id = l.id
        WHERE l.status IN ('waiting', 'in_progress')
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

function getDeceiverCount(n) {
  if (n <= 4) return 1;
  if (n <= 7) return 2;
  return 3;
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

        const state = await getLobbyState(lobbyId);
        console.log(`[WS] Sending lobbyUpdate to lobby:${roomKey}`, {
          playerCount: state?.players?.length,
          roomKey,
        });
        io.to(`lobby:${roomKey}`).emit('lobbyUpdate', state);

        if (callback) callback({ ok: true });
      } catch (err) {
        console.error('[WS] joinRoom error:', err);
        if (callback) callback({ error: err.message });
      }
    });

    // Host starts the game
    socket.on('startGame', async ({ lobbyId }, callback) => {
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT created_by, status FROM lobbies WHERE id = $1',
          [lobbyId]
        );

        if (result.rows.length === 0) {
          throw new Error('Lobby not found');
        }

        const lobby = result.rows[0];

        if (String(lobby.created_by) !== socket.userId) {
          throw new Error('Only the host can start the game');
        }

        if (lobby.status !== 'waiting') {
          throw new Error('Game already started');
        }

        // Fetch all players ordered by join time
        const playersResult = await client.query(
          `SELECT lp.user_id, u.username
           FROM lobby_players lp
           JOIN users u ON u.id = lp.user_id
           WHERE lp.lobby_id = $1
           ORDER BY lp.joined_at ASC`,
          [lobbyId]
        );
        const playerIds = playersResult.rows.map((r) => String(r.user_id));
        const userIdToUsername = {};
        playersResult.rows.forEach((r) => { userIdToUsername[String(r.user_id)] = r.username; });

        // Fisher-Yates shuffle
        for (let i = playerIds.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [playerIds[i], playerIds[j]] = [playerIds[j], playerIds[i]];
        }

        const deceiverCount = getDeceiverCount(playerIds.length);
        const roleMap = {};
        playerIds.forEach((uid, idx) => {
          roleMap[uid] = idx < deceiverCount ? 'deceiver' : 'innocent';
        });

        console.log(`[WS] startGame lobby ${lobbyId}: ${deceiverCount} deceiver(s) among ${playerIds.length} players`);

        // Assign roles + mark in_progress in a transaction
        await client.query('BEGIN');
        await client.query(
          "UPDATE lobbies SET status = 'in_progress' WHERE id = $1",
          [lobbyId]
        );
        for (const [uid, role] of Object.entries(roleMap)) {
          await client.query(
            'UPDATE lobby_players SET role = $1 WHERE lobby_id = $2 AND user_id = $3',
            [role, lobbyId, uid]
          );
        }
        await client.query('COMMIT');

        // Emit roleAssigned privately to each socket in this lobby
        const roomKey = `lobby:${String(lobbyId)}`;
        const deceiverUsernames = playerIds
          .filter((uid) => roleMap[uid] === 'deceiver')
          .map((uid) => userIdToUsername[uid]);
        for (const [, sock] of io.sockets.sockets) {
          if (sock.rooms.has(roomKey) && roleMap[sock.userId] !== undefined) {
            const payload = { role: roleMap[sock.userId] };
            if (roleMap[sock.userId] === 'deceiver') {
              payload.fellowDeceivers = deceiverUsernames.filter(
                (name) => name !== userIdToUsername[sock.userId]
              );
            }
            sock.emit('roleAssigned', payload);
            console.log(`[WS] roleAssigned ${roleMap[sock.userId]} → user ${sock.userId}`);
          }
        }

        const state = await getLobbyState(lobbyId);
        io.to(roomKey).emit('gameStarted', { ...state, countdown: 5 });

        if (callback) callback({ ok: true });
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('[WS] startGame error:', err);
        if (callback) callback({ error: err.message });
      } finally {
        client.release();
      }
    });

    // Clean up on disconnect
    socket.on('disconnect', async () => {
      console.log(`[WS] Disconnected: ${socket.id} (user: ${socket.userId})`);

      if (currentLobbyId) {
        const connected = lobbyConnections.get(currentLobbyId);
        if (connected) {
          connected.delete(socket.userId);
          if (connected.size === 0) {
            lobbyConnections.delete(currentLobbyId);
          }
        }

        // Broadcast updated state so other clients see the player dim
        const state = await getLobbyState(currentLobbyId);
        if (state) {
          io.to(`lobby:${currentLobbyId}`).emit('lobbyUpdate', state);
        }
      }
    });
  });

  return io;
}

module.exports = { setupLobbySocket, broadcastLobbyUpdate, addFakeConnection };
