const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// In-memory map of lobbyId -> Set of connected userIds (as strings)
const lobbyConnections = new Map();

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

function setupLobbySocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

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
      try {
        const result = await pool.query(
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

        await pool.query(
          "UPDATE lobbies SET status = 'in_progress' WHERE id = $1",
          [lobbyId]
        );

        const state = await getLobbyState(lobbyId);
        io.to(`lobby:${String(lobbyId)}`).emit('gameStarted', state);

        if (callback) callback({ ok: true });
      } catch (err) {
        console.error('[WS] startGame error:', err);
        if (callback) callback({ error: err.message });
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

module.exports = { setupLobbySocket };
