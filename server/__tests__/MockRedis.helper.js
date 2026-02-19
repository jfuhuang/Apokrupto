/**
 * Mock Redis client for testing
 */
class MockRedis {
  constructor() {
    this.data = new Map();
    this.sets = new Map();
    this.expires = new Map();
    this.sequences = new Map();
  }

  // Hash operations
  async hset(key, ...args) {
    if (!this.data.has(key)) {
      this.data.set(key, {});
    }
    
    const hash = this.data.get(key);
    
    if (args.length === 1 && typeof args[0] === 'object') {
      // hset(key, object)
      Object.assign(hash, args[0]);
    } else {
      // hset(key, field, value) or hset(key, field1, value1, field2, value2, ...)
      for (let i = 0; i < args.length; i += 2) {
        hash[args[i]] = args[i + 1];
      }
    }
    
    return 1;
  }

  async hget(key, field) {
    const hash = this.data.get(key);
    return hash ? hash[field] : null;
  }

  async hgetall(key) {
    return this.data.get(key) || {};
  }

  async hdel(key, field) {
    const hash = this.data.get(key);
    if (hash && hash[field]) {
      delete hash[field];
      return 1;
    }
    return 0;
  }

  // String operations
  async set(key, value) {
    this.data.set(key, value);
    return 'OK';
  }

  async get(key) {
    // Check if it's a sequence counter
    if (this.sequences.has(key)) {
      return this.sequences.get(key).toString();
    }
    return this.data.get(key) || null;
  }

  async del(...keys) {
    let count = 0;
    for (const key of keys) {
      if (this.data.delete(key)) count++;
      if (this.sets.delete(key)) count++;
      this.expires.delete(key);
    }
    return count;
  }

  // Set operations
  async sadd(key, ...members) {
    if (!this.sets.has(key)) {
      this.sets.set(key, new Set());
    }
    const set = this.sets.get(key);
    let added = 0;
    for (const member of members) {
      if (!set.has(member)) {
        set.add(member);
        added++;
      }
    }
    return added;
  }

  async srem(key, ...members) {
    const set = this.sets.get(key);
    if (!set) return 0;
    let removed = 0;
    for (const member of members) {
      if (set.delete(member)) removed++;
    }
    return removed;
  }

  async sismember(key, member) {
    const set = this.sets.get(key);
    return set ? (set.has(member) ? 1 : 0) : 0;
  }

  async smembers(key) {
    const set = this.sets.get(key);
    return set ? Array.from(set) : [];
  }

  async scard(key) {
    const set = this.sets.get(key);
    return set ? set.size : 0;
  }

  // List operations
  async lpush(key, ...values) {
    if (!this.data.has(key)) {
      this.data.set(key, []);
    }
    const list = this.data.get(key);
    list.unshift(...values);
    return list.length;
  }

  async ltrim(key, start, stop) {
    const list = this.data.get(key);
    if (!list || !Array.isArray(list)) return 'OK';
    
    const len = list.length;
    const actualStart = start < 0 ? Math.max(0, len + start) : Math.min(start, len);
    const actualStop = stop < 0 ? Math.max(0, len + stop + 1) : Math.min(stop + 1, len);
    
    this.data.set(key, list.slice(actualStart, actualStop));
    return 'OK';
  }

  async lrange(key, start, stop) {
    const list = this.data.get(key);
    if (!list || !Array.isArray(list)) return [];
    
    const len = list.length;
    const actualStart = start < 0 ? Math.max(0, len + start) : Math.min(start, len);
    const actualStop = stop < 0 ? len : Math.min(stop + 1, len);
    
    return list.slice(actualStart, actualStop);
  }

  // Utility operations
  async exists(key) {
    return this.data.has(key) || this.sets.has(key) ? 1 : 0;
  }

  async keys(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const allKeys = [...this.data.keys(), ...this.sets.keys()];
    return allKeys.filter(key => regex.test(key));
  }

  async expire(key, seconds) {
    this.expires.set(key, Date.now() + seconds * 1000);
    return 1;
  }

  async ttl(key) {
    const expireTime = this.expires.get(key);
    if (!expireTime) return -1;
    const remaining = Math.ceil((expireTime - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async incr(key) {
    const current = this.sequences.get(key) || 0;
    const next = current + 1;
    this.sequences.set(key, next);
    return next;
  }

  // Lua script evaluation
  async eval(script, numKeys, ...args) {
    // Simple Lua script emulation for our specific use cases
    const keys = args.slice(0, numKeys);
    const argv = args.slice(numKeys);

    // Check which script is being run based on content
    if (script.includes('NOT_IN_LOBBY')) {
      // This is the leaveLobby script (check this first as it's more specific)
      return this._evalLeaveLobby(keys, argv);
    } else if (script.includes('LOBBY_NOT_FOUND')) {
      // This is the joinLobby script
      return this._evalJoinLobby(keys, argv);
    }

    return { ok: 'UNKNOWN_SCRIPT' };
  }

  async _evalJoinLobby(keys, argv) {
    const [lobbyKey, playersKey, playerLobbyKey] = keys;
    const [playerId, maxPlayers, now] = argv;

    // Check if lobby exists
    if (!(await this.exists(lobbyKey))) {
      return { err: 'LOBBY_NOT_FOUND' };
    }

    // Check lobby status
    const status = await this.hget(lobbyKey, 'status');
    if (status === 'in-game' || status === 'closed') {
      return { err: 'LOBBY_NOT_JOINABLE' };
    }

    // Check if player already in lobby
    if (await this.sismember(playersKey, playerId)) {
      return { ok: 'ALREADY_IN_LOBBY' };
    }

    // Check if player is in another lobby
    const currentLobby = await this.get(playerLobbyKey);
    if (currentLobby) {
      return { err: 'ALREADY_IN_OTHER_LOBBY' };
    }

    // Check capacity
    const currentCount = await this.scard(playersKey);
    if (currentCount >= parseInt(maxPlayers)) {
      await this.hset(lobbyKey, 'status', 'full', 'updatedAt', now);
      return { err: 'LOBBY_FULL' };
    }

    // Add player
    await this.sadd(playersKey, playerId);
    await this.set(playerLobbyKey, lobbyKey.replace('lobby:', ''));
    await this.hset(lobbyKey, 'updatedAt', now);

    // Update status if now full
    if (currentCount + 1 >= parseInt(maxPlayers)) {
      await this.hset(lobbyKey, 'status', 'full');
    }

    return { ok: 'JOINED' };
  }

  async _evalLeaveLobby(keys, argv) {
    const [lobbyKey, playersKey, playerLobbyKey] = keys;
    const [playerId, now] = argv;

    // Check if lobby exists
    if (!(await this.exists(lobbyKey))) {
      return { err: 'LOBBY_NOT_FOUND' };
    }

    // Check if player is in lobby
    if (!(await this.sismember(playersKey, playerId))) {
      return { err: 'NOT_IN_LOBBY' };
    }

    // Remove player
    await this.srem(playersKey, playerId);
    await this.del(playerLobbyKey);
    await this.hset(lobbyKey, 'updatedAt', now);

    // Get remaining players
    const remainingPlayers = await this.smembers(playersKey);

    // If empty, delete lobby
    if (remainingPlayers.length === 0) {
      await this.del(lobbyKey, playersKey);
      return { ok: 'LOBBY_DELETED' };
    }

    // Check if leaving player was host
    const hostId = await this.hget(lobbyKey, 'hostId');
    let newHost = null;

    if (hostId === playerId) {
      newHost = remainingPlayers[0];
      await this.hset(lobbyKey, 'hostId', newHost);
    }

    // Update status if no longer full
    const status = await this.hget(lobbyKey, 'status');
    if (status === 'full') {
      await this.hset(lobbyKey, 'status', 'open');
    }

    return { ok: 'LEFT', newHost };
  }

  // Pub/Sub (basic mock)
  async publish(channel, message) {
    return 1; // Number of subscribers
  }

  // Clear all data (for tests)
  flushall() {
    this.data.clear();
    this.sets.clear();
    this.expires.clear();
    this.sequences.clear();
  }
}

module.exports = MockRedis;
