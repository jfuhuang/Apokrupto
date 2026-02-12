const { Server } = require('socket.io');
const socketAuth = require('../middleware/socketAuth');
const LobbyService = require('../services/LobbyService');
const RedisStore = require('../store/RedisStore');
const { redisSub } = require('../redis');

class WebSocketServer {
  constructor(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling']
    });

    this.store = new RedisStore();
    this.lobbyService = new LobbyService(this.store);
    
    // Track active connections by playerId
    this.connections = new Map(); // playerId -> socket.id
    
    // Rate limiting state
    this.rateLimits = new Map(); // socket.id -> { move: { count, resetAt } }

    this.serverId = process.env.SERVER_ID || `server_${Date.now()}`;

    this._setupMiddleware();
    this._setupHandlers();
    this._setupPubSub();
  }

  _setupMiddleware() {
    // Authentication middleware
    this.io.use(socketAuth);
  }

  _setupHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`[WS] Client connected: ${socket.id} (user: ${socket.userId})`);

      // Handle disconnect
      socket.on('disconnect', async () => {
        await this._handleDisconnect(socket);
      });

      // Resume/reconnection
      socket.on('resume', async (data, callback) => {
        await this._handleResume(socket, data, callback);
      });

      // Lobby operations
      socket.on('createLobby', async (data, callback) => {
        await this._handleCreateLobby(socket, data, callback);
      });

      socket.on('listLobbies', async (data, callback) => {
        await this._handleListLobbies(socket, data, callback);
      });

      socket.on('joinLobby', async (data, callback) => {
        await this._handleJoinLobby(socket, data, callback);
      });

      socket.on('leaveLobby', async (data, callback) => {
        await this._handleLeaveLobby(socket, data, callback);
      });

      socket.on('startGame', async (data, callback) => {
        await this._handleStartGame(socket, data, callback);
      });

      // Movement updates
      socket.on('move', async (data, callback) => {
        await this._handleMove(socket, data, callback);
      });
    });
  }

  _setupPubSub() {
    // Subscribe to Redis pub/sub for cross-instance communication
    redisSub.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message);
        this._handlePubSubMessage(channel, data);
      } catch (err) {
        console.error('[WS] Error handling pub/sub message:', err);
      }
    });

    // Subscribe to lobby channels pattern
    redisSub.psubscribe('lobby:*', (err) => {
      if (err) {
        console.error('[WS] Error subscribing to lobby channels:', err);
      } else {
        console.log('[WS] Subscribed to lobby:* channels');
      }
    });
  }

  async _handleDisconnect(socket) {
    console.log(`[WS] Client disconnected: ${socket.id} (user: ${socket.userId})`);
    
    // Remove from connections map
    if (this.connections.get(socket.userId) === socket.id) {
      this.connections.delete(socket.userId);
    }

    // Clean up rate limit state
    this.rateLimits.delete(socket.id);

    // Session will expire via TTL if not resumed
    console.log(`[WS] Session for user ${socket.userId} will expire in ${this.store.TTL.SESSION_GRACE}s if not resumed`);
  }

  async _handleResume(socket, data, callback) {
    try {
      const { playerId, resumeToken, lastSeqSeen } = data;

      console.log(`[WS] Resume attempt: playerId=${playerId}, lastSeq=${lastSeqSeen}`);

      // Validate player ID matches authenticated user
      if (playerId !== socket.userId) {
        throw new Error('PLAYER_ID_MISMATCH');
      }

      // Try to update session with new connection
      const result = await this.store.updateSessionConnection(
        playerId,
        socket.id,
        resumeToken
      );

      // Close old connection if it exists and is different
      if (result.oldConnectionId && result.oldConnectionId !== socket.id) {
        const oldSocket = this.io.sockets.sockets.get(result.oldConnectionId);
        if (oldSocket) {
          oldSocket.emit('session_replaced', {
            message: 'Session resumed on another device'
          });
          oldSocket.disconnect(true);
        }
      }

      // Update connection tracking
      this.connections.set(playerId, socket.id);

      // Get player's current lobby
      const lobbyId = await this.store.redis.get(`player:${playerId}:lobby`);
      
      if (lobbyId) {
        // Join socket room for lobby
        socket.join(`lobby:${lobbyId}`);

        // Get lobby snapshot
        const snapshot = await this.lobbyService.getLobbySnapshot(lobbyId);

        // Get missed events if any
        const missedEvents = lastSeqSeen 
          ? await this.store.getEventsSince(lobbyId, lastSeqSeen)
          : [];

        callback({
          type: 'resume_ok',
          payload: {
            lobbyId,
            snapshot,
            missedEvents,
            serverSeq: snapshot.serverSeq
          }
        });

        console.log(`[WS] Resume successful: ${playerId} in lobby ${lobbyId}, ${missedEvents.length} missed events`);
      } else {
        // No lobby, just confirm resume
        callback({
          type: 'resume_ok',
          payload: {
            lobbyId: null,
            snapshot: null,
            serverSeq: 0
          }
        });

        console.log(`[WS] Resume successful: ${playerId} not in any lobby`);
      }

    } catch (err) {
      console.error('[WS] Resume failed:', err);
      callback({
        type: 'resume_failed',
        payload: {
          reason: err.message
        }
      });
    }
  }

  async _handleCreateLobby(socket, data, callback) {
    try {
      const { name, isPublic, maxPlayers } = data;

      const lobby = await this.lobbyService.createLobby(socket.userId, {
        name,
        isPublic,
        maxPlayers
      });

      // Create session for this player
      const { resumeToken } = await this.store.createSession(
        socket.userId,
        socket.id,
        this.serverId
      );

      // Join socket room
      socket.join(`lobby:${lobby.lobbyId}`);
      this.connections.set(socket.userId, socket.id);

      // Broadcast lobby created event
      await this._broadcastToLobby(lobby.lobbyId, 'lobby_update', {
        lobbyId: lobby.lobbyId,
        snapshot: await this.lobbyService.getLobbySnapshot(lobby.lobbyId),
        serverSeq: await this.store.getCurrentSeq(lobby.lobbyId)
      });

      callback({
        type: 'lobby_created',
        payload: {
          lobby,
          resumeToken,
          serverSeq: await this.store.getCurrentSeq(lobby.lobbyId)
        }
      });

    } catch (err) {
      console.error('[WS] Create lobby error:', err);
      callback({
        type: 'error',
        payload: {
          code: 'CREATE_LOBBY_FAILED',
          message: err.message
        }
      });
    }
  }

  async _handleListLobbies(socket, data, callback) {
    try {
      const { limit } = data;
      const lobbies = await this.lobbyService.listJoinableLobbies(limit || 20);

      callback({
        type: 'lobbies',
        payload: {
          items: lobbies
        }
      });

    } catch (err) {
      console.error('[WS] List lobbies error:', err);
      callback({
        type: 'error',
        payload: {
          code: 'LIST_LOBBIES_FAILED',
          message: err.message
        }
      });
    }
  }

  async _handleJoinLobby(socket, data, callback) {
    try {
      const { lobbyId } = data;

      const result = await this.lobbyService.joinLobby(lobbyId, socket.userId);

      // Create/update session
      const { resumeToken } = await this.store.createSession(
        socket.userId,
        socket.id,
        this.serverId
      );

      // Join socket room
      socket.join(`lobby:${lobbyId}`);
      this.connections.set(socket.userId, socket.id);

      // Add event to buffer
      await this.store.addLobbyEvent(lobbyId, {
        type: 'player_joined',
        playerId: socket.userId,
        username: socket.username
      });

      // Broadcast to all in lobby
      await this._broadcastToLobby(lobbyId, 'lobby_update', {
        lobbyId,
        snapshot: await this.lobbyService.getLobbySnapshot(lobbyId),
        serverSeq: await this.store.getCurrentSeq(lobbyId)
      });

      callback({
        type: 'lobby_joined',
        payload: {
          lobby: result.lobby,
          players: result.players,
          resumeToken,
          serverSeq: await this.store.getCurrentSeq(lobbyId)
        }
      });

    } catch (err) {
      console.error('[WS] Join lobby error:', err);
      callback({
        type: 'error',
        payload: {
          code: err.message,
          message: err.message
        }
      });
    }
  }

  async _handleLeaveLobby(socket, data, callback) {
    try {
      const { lobbyId } = data;

      const result = await this.lobbyService.leaveLobby(lobbyId, socket.userId);

      // Leave socket room
      socket.leave(`lobby:${lobbyId}`);

      // Delete session
      await this.store.deleteSession(socket.userId);

      // Add event to buffer if lobby still exists
      if (result.lobby) {
        await this.store.addLobbyEvent(lobbyId, {
          type: 'player_left',
          playerId: socket.userId,
          username: socket.username,
          newHost: result.newHost
        });

        // Broadcast to remaining players
        await this._broadcastToLobby(lobbyId, 'lobby_update', {
          lobbyId,
          snapshot: await this.lobbyService.getLobbySnapshot(lobbyId),
          serverSeq: await this.store.getCurrentSeq(lobbyId),
          newHost: result.newHost
        });
      }

      callback({
        type: 'lobby_left',
        payload: {
          lobbyId,
          success: true
        }
      });

    } catch (err) {
      console.error('[WS] Leave lobby error:', err);
      callback({
        type: 'error',
        payload: {
          code: 'LEAVE_LOBBY_FAILED',
          message: err.message
        }
      });
    }
  }

  async _handleStartGame(socket, data, callback) {
    try {
      const { lobbyId } = data;

      const result = await this.lobbyService.startGame(lobbyId, socket.userId);

      // Add event to buffer
      await this.store.addLobbyEvent(lobbyId, {
        type: 'game_started',
        startedBy: socket.userId
      });

      // Broadcast to all in lobby
      await this._broadcastToLobby(lobbyId, 'game_started', {
        lobbyId,
        snapshot: await this.lobbyService.getLobbySnapshot(lobbyId),
        serverSeq: await this.store.getCurrentSeq(lobbyId)
      });

      callback({
        type: 'game_started',
        payload: {
          lobby: result.lobby,
          players: result.players,
          serverSeq: await this.store.getCurrentSeq(lobbyId)
        }
      });

    } catch (err) {
      console.error('[WS] Start game error:', err);
      callback({
        type: 'error',
        payload: {
          code: err.message,
          message: err.message
        }
      });
    }
  }

  async _handleMove(socket, data, callback) {
    try {
      const { lobbyId, seq, clientTs, lat, lng, accuracy, speed } = data;

      // Rate limiting - max 20 updates per second per client
      if (!this._checkRateLimit(socket.id, 'move', 20, 1000)) {
        return; // Silently drop
      }

      // Validate input
      if (!lobbyId || lat == null || lng == null) {
        throw new Error('INVALID_MOVE_DATA');
      }

      // Basic sanity check - lat/lng ranges
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error('INVALID_COORDINATES');
      }

      // Refresh session
      await this.store.refreshSession(socket.userId);

      // Add event to buffer
      const event = await this.store.addLobbyEvent(lobbyId, {
        type: 'player_moved',
        playerId: socket.userId,
        lat,
        lng,
        accuracy,
        speed,
        clientSeq: seq,
        clientTs
      });

      // Broadcast to lobby via pub/sub
      await this._publishToLobby(lobbyId, {
        type: 'player_moved',
        payload: {
          lobbyId,
          playerId: socket.userId,
          lat,
          lng,
          accuracy,
          speed,
          serverSeq: event.seq
        }
      });

      // Ack to sender
      if (callback) {
        callback({
          type: 'move_ack',
          payload: {
            serverSeq: event.seq
          }
        });
      }

    } catch (err) {
      console.error('[WS] Move error:', err);
      if (callback) {
        callback({
          type: 'error',
          payload: {
            code: 'MOVE_FAILED',
            message: err.message
          }
        });
      }
    }
  }

  _checkRateLimit(socketId, action, maxCount, windowMs) {
    const now = Date.now();
    
    if (!this.rateLimits.has(socketId)) {
      this.rateLimits.set(socketId, {});
    }

    const limits = this.rateLimits.get(socketId);
    
    if (!limits[action] || now > limits[action].resetAt) {
      limits[action] = {
        count: 1,
        resetAt: now + windowMs
      };
      return true;
    }

    if (limits[action].count < maxCount) {
      limits[action].count++;
      return true;
    }

    return false;
  }

  async _broadcastToLobby(lobbyId, eventType, data) {
    // Publish to Redis for cross-instance delivery
    await this._publishToLobby(lobbyId, {
      type: eventType,
      payload: data
    });
  }

  async _publishToLobby(lobbyId, message) {
    await this.store.redis.publish(
      `lobby:${lobbyId}`,
      JSON.stringify({
        ...message,
        serverId: this.serverId
      })
    );
  }

  _handlePubSubMessage(channel, data) {
    // Don't re-broadcast messages from this server
    if (data.serverId === this.serverId) {
      // But still emit to local clients
      this.io.to(channel).emit(data.type, data.payload);
      return;
    }

    // Forward to clients in this server instance
    this.io.to(channel).emit(data.type, data.payload);
  }

  getIO() {
    return this.io;
  }
}

module.exports = WebSocketServer;
