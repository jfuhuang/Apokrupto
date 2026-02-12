const RedisStore = require('../store/RedisStore');

class LobbyService {
  constructor(store) {
    this.store = store || new RedisStore();
  }

  /**
   * Create a new lobby
   */
  async createLobby(hostId, { name, maxPlayers, isPublic }) {
    try {
      const lobby = await this.store.createLobby({
        hostId,
        name,
        maxPlayers: maxPlayers || 10,
        isPublic: isPublic !== false // Default to true
      });

      console.log(`[LobbyService] Lobby created: ${lobby.lobbyId} by host ${hostId}`);
      return lobby;
    } catch (err) {
      console.error('[LobbyService] Error creating lobby:', err);
      throw err;
    }
  }

  /**
   * List joinable lobbies
   */
  async listJoinableLobbies(limit = 20) {
    try {
      const lobbies = await this.store.listJoinableLobbies(limit);
      console.log(`[LobbyService] Listed ${lobbies.length} joinable lobbies`);
      return lobbies;
    } catch (err) {
      console.error('[LobbyService] Error listing lobbies:', err);
      throw err;
    }
  }

  /**
   * Get lobby details
   */
  async getLobby(lobbyId) {
    try {
      const lobby = await this.store.getLobby(lobbyId);
      if (!lobby) {
        throw new Error('LOBBY_NOT_FOUND');
      }
      return lobby;
    } catch (err) {
      console.error(`[LobbyService] Error getting lobby ${lobbyId}:`, err);
      throw err;
    }
  }

  /**
   * Join a lobby (idempotent by playerId)
   */
  async joinLobby(lobbyId, playerId) {
    try {
      const result = await this.store.joinLobby(lobbyId, playerId);
      console.log(`[LobbyService] Player ${playerId} joined lobby ${lobbyId}: ${result.message}`);
      
      // Get updated lobby state
      const lobby = await this.store.getLobby(lobbyId);
      const players = await this.store.getLobbyPlayers(lobbyId);
      
      return {
        ...result,
        lobby,
        players
      };
    } catch (err) {
      console.error(`[LobbyService] Error joining lobby ${lobbyId}:`, err);
      throw err;
    }
  }

  /**
   * Leave a lobby
   */
  async leaveLobby(lobbyId, playerId) {
    try {
      const result = await this.store.leaveLobby(lobbyId, playerId);
      console.log(`[LobbyService] Player ${playerId} left lobby ${lobbyId}: ${result.message}`);
      
      // If lobby was deleted, return early
      if (result.message === 'LOBBY_DELETED') {
        return {
          ...result,
          lobby: null,
          players: []
        };
      }

      // Get updated lobby state
      const lobby = await this.store.getLobby(lobbyId);
      const players = await this.store.getLobbyPlayers(lobbyId);
      
      return {
        ...result,
        lobby,
        players
      };
    } catch (err) {
      console.error(`[LobbyService] Error leaving lobby ${lobbyId}:`, err);
      throw err;
    }
  }

  /**
   * Start game (host only)
   */
  async startGame(lobbyId, playerId) {
    try {
      const result = await this.store.startGame(lobbyId, playerId);
      console.log(`[LobbyService] Game started in lobby ${lobbyId} by ${playerId}`);
      
      const lobby = await this.store.getLobby(lobbyId);
      const players = await this.store.getLobbyPlayers(lobbyId);
      
      return {
        ...result,
        lobby,
        players
      };
    } catch (err) {
      console.error(`[LobbyService] Error starting game in lobby ${lobbyId}:`, err);
      throw err;
    }
  }

  /**
   * Get lobby players
   */
  async getLobbyPlayers(lobbyId) {
    try {
      return await this.store.getLobbyPlayers(lobbyId);
    } catch (err) {
      console.error(`[LobbyService] Error getting players for lobby ${lobbyId}:`, err);
      throw err;
    }
  }

  /**
   * Get lobby snapshot (for resume)
   */
  async getLobbySnapshot(lobbyId) {
    try {
      const lobby = await this.store.getLobby(lobbyId);
      if (!lobby) return null;

      const players = await this.store.getLobbyPlayers(lobbyId);
      const serverSeq = await this.store.getCurrentSeq(lobbyId);

      return {
        lobby,
        players,
        serverSeq
      };
    } catch (err) {
      console.error(`[LobbyService] Error getting snapshot for lobby ${lobbyId}:`, err);
      throw err;
    }
  }
}

module.exports = LobbyService;
