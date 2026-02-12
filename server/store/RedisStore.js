const { redis } = require('../redis');
const crypto = require('crypto');

/**
 * Redis Key Schema:
 * - lobby:{lobbyId}                    -> Lobby metadata (hash)
 * - lobby:{lobbyId}:players            -> Set of player IDs in lobby
 * - player:{playerId}:lobby            -> Current lobby ID (string)
 * - session:{playerId}                 -> Session data (hash) with TTL
 * - events:lobby:{lobbyId}             -> Recent events list with TTL
 * - pubsub:lobby:{lobbyId}             -> Pub/Sub channel for lobby events
 */

class RedisStore {
  constructor(redisClient) {
    this.redis = redisClient || redis;
    
    // TTL configurations (in seconds)
    this.TTL = {
      EMPTY_LOBBY: parseInt(process.env.LOBBY_EMPTY_TTL) || 900, // 15 minutes
      SESSION_GRACE: parseInt(process.env.LOBBY_SESSION_GRACE_TTL) || 60, // 1 minute
      EVENT_BUFFER: parseInt(process.env.LOBBY_EVENT_BUFFER_TTL) || 120, // 2 minutes
    };
  }

  // ========== Lobby Operations ==========

  /**
   * Create a new lobby
   */
  async createLobby({ hostId, name, maxPlayers = 10, isPublic = true }) {
    const lobbyId = this._generateId('lobby');
    const now = Date.now();
    
    const lobbyData = {
      lobbyId,
      hostId,
      name: name || `Lobby ${lobbyId.slice(0, 8)}`,
      maxPlayers: maxPlayers.toString(),
      isPublic: isPublic ? '1' : '0',
      status: 'open', // open, full, in-game, closed
      createdAt: now.toString(),
      updatedAt: now.toString(),
    };

    await this.redis.hset(`lobby:${lobbyId}`, lobbyData);
    await this.redis.sadd(`lobby:${lobbyId}:players`, hostId);
    await this.redis.set(`player:${hostId}:lobby`, lobbyId);

    return this._parseLobby(lobbyData);
  }

  /**
   * Get lobby details
   */
  async getLobby(lobbyId) {
    const data = await this.redis.hgetall(`lobby:${lobbyId}`);
    if (!data || !data.lobbyId) return null;

    const playerCount = await this.redis.scard(`lobby:${lobbyId}:players`);
    return this._parseLobby({ ...data, playerCount: playerCount.toString() });
  }

  /**
   * List joinable public lobbies
   */
  async listJoinableLobbies(limit = 20) {
    const keys = await this.redis.keys('lobby:*');
    const lobbies = [];

    for (const key of keys) {
      if (!key.includes(':players') && !key.includes(':events')) {
        const lobby = await this.getLobby(key.replace('lobby:', ''));
        if (lobby && lobby.isPublic && (lobby.status === 'open' || lobby.status === 'full')) {
          lobbies.push(lobby);
        }
      }
    }

    // Sort by creation time (newest first) and limit
    return lobbies
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  /**
   * Join lobby - idempotent by playerId
   * Uses Lua script for atomicity
   */
  async joinLobby(lobbyId, playerId) {
    const luaScript = `
      local lobbyKey = KEYS[1]
      local playersKey = KEYS[2]
      local playerLobbyKey = KEYS[3]
      local playerId = ARGV[1]
      local maxPlayers = tonumber(ARGV[2])
      local now = ARGV[3]

      -- Check if lobby exists
      if redis.call('exists', lobbyKey) == 0 then
        return {err = 'LOBBY_NOT_FOUND'}
      end

      -- Check lobby status
      local status = redis.call('hget', lobbyKey, 'status')
      if status == 'in-game' or status == 'closed' then
        return {err = 'LOBBY_NOT_JOINABLE'}
      end

      -- Check if player already in lobby (idempotent)
      if redis.call('sismember', playersKey, playerId) == 1 then
        return {ok = 'ALREADY_IN_LOBBY'}
      end

      -- Check if player is in another lobby
      local currentLobby = redis.call('get', playerLobbyKey)
      if currentLobby and currentLobby ~= '' then
        return {err = 'ALREADY_IN_OTHER_LOBBY'}
      end

      -- Check capacity
      local currentCount = redis.call('scard', playersKey)
      if currentCount >= maxPlayers then
        -- Mark lobby as full
        redis.call('hset', lobbyKey, 'status', 'full')
        redis.call('hset', lobbyKey, 'updatedAt', now)
        return {err = 'LOBBY_FULL'}
      end

      -- Add player to lobby
      redis.call('sadd', playersKey, playerId)
      redis.call('set', playerLobbyKey, lobbyKey:match('lobby:(.+)'))
      redis.call('hset', lobbyKey, 'updatedAt', now)

      -- Update status if now full
      if currentCount + 1 >= maxPlayers then
        redis.call('hset', lobbyKey, 'status', 'full')
      end

      return {ok = 'JOINED'}
    `;

    const lobby = await this.getLobby(lobbyId);
    if (!lobby) throw new Error('LOBBY_NOT_FOUND');

    try {
      const result = await this.redis.eval(
        luaScript,
        3,
        `lobby:${lobbyId}`,
        `lobby:${lobbyId}:players`,
        `player:${playerId}:lobby`,
        playerId,
        lobby.maxPlayers,
        Date.now().toString()
      );

      if (result.err) {
        throw new Error(result.err);
      }

      return { success: true, message: result.ok };
    } catch (err) {
      throw err;
    }
  }

  /**
   * Leave lobby with host promotion
   * Uses Lua script for atomicity
   */
  async leaveLobby(lobbyId, playerId) {
    const luaScript = `
      local lobbyKey = KEYS[1]
      local playersKey = KEYS[2]
      local playerLobbyKey = KEYS[3]
      local playerId = ARGV[1]
      local now = ARGV[2]

      -- Check if lobby exists
      if redis.call('exists', lobbyKey) == 0 then
        return {err = 'LOBBY_NOT_FOUND'}
      end

      -- Check if player is in lobby
      if redis.call('sismember', playersKey, playerId) == 0 then
        return {err = 'NOT_IN_LOBBY'}
      end

      -- Remove player
      redis.call('srem', playersKey, playerId)
      redis.call('del', playerLobbyKey)
      redis.call('hset', lobbyKey, 'updatedAt', now)

      -- Get remaining players
      local remainingPlayers = redis.call('smembers', playersKey)
      
      -- If lobby is now empty, delete it
      if #remainingPlayers == 0 then
        redis.call('del', lobbyKey)
        redis.call('del', playersKey)
        return {ok = 'LOBBY_DELETED'}
      end

      -- Check if leaving player was host
      local hostId = redis.call('hget', lobbyKey, 'hostId')
      local newHost = nil
      
      if hostId == playerId then
        -- Promote first remaining player to host
        newHost = remainingPlayers[1]
        redis.call('hset', lobbyKey, 'hostId', newHost)
      end

      -- Update status if no longer full
      local status = redis.call('hget', lobbyKey, 'status')
      if status == 'full' then
        redis.call('hset', lobbyKey, 'status', 'open')
      end

      return {ok = 'LEFT', newHost = newHost}
    `;

    try {
      const result = await this.redis.eval(
        luaScript,
        3,
        `lobby:${lobbyId}`,
        `lobby:${lobbyId}:players`,
        `player:${playerId}:lobby`,
        playerId,
        Date.now().toString()
      );

      if (result.err) {
        throw new Error(result.err);
      }

      return {
        success: true,
        message: result.ok,
        newHost: result.newHost || null
      };
    } catch (err) {
      throw err;
    }
  }

  /**
   * Start game (host only)
   */
  async startGame(lobbyId, hostId) {
    const lobby = await this.getLobby(lobbyId);
    if (!lobby) throw new Error('LOBBY_NOT_FOUND');
    if (lobby.hostId !== hostId) throw new Error('NOT_HOST');
    if (lobby.status === 'in-game') throw new Error('ALREADY_IN_GAME');

    await this.redis.hset(`lobby:${lobbyId}`, {
      status: 'in-game',
      updatedAt: Date.now().toString()
    });

    return { success: true };
  }

  /**
   * Get players in lobby
   */
  async getLobbyPlayers(lobbyId) {
    return await this.redis.smembers(`lobby:${lobbyId}:players`);
  }

  // ========== Session Operations ==========

  /**
   * Create or update player session
   */
  async createSession(playerId, connectionId, serverId = 'default') {
    const resumeToken = this._generateResumeToken();
    const now = Date.now();

    const sessionData = {
      playerId,
      resumeToken,
      connectionId,
      serverId,
      lastSeenAt: now.toString(),
      createdAt: now.toString(),
    };

    await this.redis.hset(`session:${playerId}`, sessionData);
    await this.redis.expire(`session:${playerId}`, this.TTL.SESSION_GRACE);

    return { resumeToken, sessionData: this._parseSession(sessionData) };
  }

  /**
   * Get session data
   */
  async getSession(playerId) {
    const data = await this.redis.hgetall(`session:${playerId}`);
    if (!data || !data.playerId) return null;
    return this._parseSession(data);
  }

  /**
   * Update session connection (for reconnection)
   */
  async updateSessionConnection(playerId, newConnectionId, resumeToken) {
    const session = await this.getSession(playerId);
    if (!session) throw new Error('SESSION_NOT_FOUND');
    if (session.resumeToken !== resumeToken) throw new Error('INVALID_RESUME_TOKEN');

    const oldConnectionId = session.connectionId;

    await this.redis.hset(`session:${playerId}`, {
      connectionId: newConnectionId,
      lastSeenAt: Date.now().toString()
    });

    // Refresh TTL
    await this.redis.expire(`session:${playerId}`, this.TTL.SESSION_GRACE);

    return { success: true, oldConnectionId };
  }

  /**
   * Refresh session TTL (called on activity)
   */
  async refreshSession(playerId) {
    const exists = await this.redis.exists(`session:${playerId}`);
    if (exists) {
      await this.redis.hset(`session:${playerId}`, 'lastSeenAt', Date.now().toString());
      await this.redis.expire(`session:${playerId}`, this.TTL.SESSION_GRACE);
      return true;
    }
    return false;
  }

  /**
   * Delete session
   */
  async deleteSession(playerId) {
    await this.redis.del(`session:${playerId}`);
  }

  // ========== Event Buffer Operations ==========

  /**
   * Add event to lobby buffer for replay
   */
  async addLobbyEvent(lobbyId, event) {
    const eventData = {
      ...event,
      timestamp: Date.now(),
      seq: await this.redis.incr(`lobby:${lobbyId}:seq`)
    };

    await this.redis.lpush(
      `events:lobby:${lobbyId}`,
      JSON.stringify(eventData)
    );

    // Keep only last 100 events
    await this.redis.ltrim(`events:lobby:${lobbyId}`, 0, 99);
    
    // Set TTL
    await this.redis.expire(`events:lobby:${lobbyId}`, this.TTL.EVENT_BUFFER);

    return eventData;
  }

  /**
   * Get recent events since sequence number
   */
  async getEventsSince(lobbyId, sinceSeq = 0) {
    const events = await this.redis.lrange(`events:lobby:${lobbyId}`, 0, -1);
    
    return events
      .map(e => JSON.parse(e))
      .filter(e => e.seq > sinceSeq)
      .reverse(); // Oldest first
  }

  /**
   * Get current sequence number
   */
  async getCurrentSeq(lobbyId) {
    const seq = await this.redis.get(`lobby:${lobbyId}:seq`);
    return seq ? parseInt(seq) : 0;
  }

  // ========== Helper Methods ==========

  _generateId(prefix = 'id') {
    return `${prefix}_${crypto.randomBytes(16).toString('hex')}`;
  }

  _generateResumeToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  _parseLobby(data) {
    return {
      lobbyId: data.lobbyId,
      hostId: data.hostId,
      name: data.name,
      maxPlayers: parseInt(data.maxPlayers),
      playerCount: parseInt(data.playerCount || 0),
      isPublic: data.isPublic === '1',
      status: data.status,
      createdAt: parseInt(data.createdAt),
      updatedAt: parseInt(data.updatedAt),
    };
  }

  _parseSession(data) {
    return {
      playerId: data.playerId,
      resumeToken: data.resumeToken,
      connectionId: data.connectionId,
      serverId: data.serverId,
      lastSeenAt: parseInt(data.lastSeenAt),
      createdAt: parseInt(data.createdAt),
    };
  }
}

module.exports = RedisStore;
