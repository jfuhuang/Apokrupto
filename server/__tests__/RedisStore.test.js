const RedisStore = require('../store/RedisStore');
const MockRedis = require('./MockRedis.helper');

describe('RedisStore', () => {
  let store;
  let mockRedis;

  beforeEach(() => {
    mockRedis = new MockRedis();
    store = new RedisStore(mockRedis);
  });

  afterEach(() => {
    mockRedis.flushall();
  });

  describe('Lobby Operations', () => {
    describe('createLobby', () => {
      test('should create a new lobby with default settings', async () => {
        const lobby = await store.createLobby({
          hostId: 'user1',
          name: 'Test Lobby',
          maxPlayers: 10,
          isPublic: true
        });

        expect(lobby).toMatchObject({
          hostId: 'user1',
          name: 'Test Lobby',
          maxPlayers: 10,
          isPublic: true,
          status: 'open',
          playerCount: 0
        });
        expect(lobby.lobbyId).toBeDefined();
        expect(lobby.createdAt).toBeDefined();
      });

      test('should add host to lobby players', async () => {
        const lobby = await store.createLobby({
          hostId: 'user1',
          name: 'Test Lobby'
        });

        const players = await store.getLobbyPlayers(lobby.lobbyId);
        expect(players).toContain('user1');
      });

      test('should set player lobby mapping', async () => {
        const lobby = await store.createLobby({
          hostId: 'user1',
          name: 'Test Lobby'
        });

        const playerLobby = await mockRedis.get('player:user1:lobby');
        expect(playerLobby).toBe(lobby.lobbyId);
      });
    });

    describe('getLobby', () => {
      test('should return null for non-existent lobby', async () => {
        const lobby = await store.getLobby('nonexistent');
        expect(lobby).toBeNull();
      });

      test('should return lobby details with player count', async () => {
        const created = await store.createLobby({
          hostId: 'user1',
          name: 'Test Lobby',
          maxPlayers: 5
        });

        const lobby = await store.getLobby(created.lobbyId);
        expect(lobby).toMatchObject({
          lobbyId: created.lobbyId,
          hostId: 'user1',
          name: 'Test Lobby',
          maxPlayers: 5,
          playerCount: 1, // Host is already in
          status: 'open'
        });
      });
    });

    describe('joinLobby', () => {
      test('should allow player to join open lobby', async () => {
        const lobby = await store.createLobby({
          hostId: 'user1',
          name: 'Test Lobby',
          maxPlayers: 10
        });

        const result = await store.joinLobby(lobby.lobbyId, 'user2');
        expect(result.success).toBe(true);
        expect(result.message).toBe('JOINED');

        const players = await store.getLobbyPlayers(lobby.lobbyId);
        expect(players).toContain('user2');
      });

      test('should be idempotent - joining again returns ALREADY_IN_LOBBY', async () => {
        const lobby = await store.createLobby({
          hostId: 'user1',
          name: 'Test Lobby'
        });

        await store.joinLobby(lobby.lobbyId, 'user2');
        const result = await store.joinLobby(lobby.lobbyId, 'user2');

        expect(result.success).toBe(true);
        expect(result.message).toBe('ALREADY_IN_LOBBY');

        const players = await store.getLobbyPlayers(lobby.lobbyId);
        expect(players.filter(p => p === 'user2').length).toBe(1);
      });

      test('should throw error when joining non-existent lobby', async () => {
        await expect(
          store.joinLobby('nonexistent', 'user1')
        ).rejects.toThrow('LOBBY_NOT_FOUND');
      });

      test('should throw error when lobby is full', async () => {
        const lobby = await store.createLobby({
          hostId: 'user1',
          name: 'Test Lobby',
          maxPlayers: 2
        });

        await store.joinLobby(lobby.lobbyId, 'user2');
        
        await expect(
          store.joinLobby(lobby.lobbyId, 'user3')
        ).rejects.toThrow('LOBBY_FULL');

        const updatedLobby = await store.getLobby(lobby.lobbyId);
        expect(updatedLobby.status).toBe('full');
      });

      test('should throw error when player is in another lobby', async () => {
        const lobby1 = await store.createLobby({
          hostId: 'user1',
          name: 'Lobby 1'
        });

        const lobby2 = await store.createLobby({
          hostId: 'user2',
          name: 'Lobby 2'
        });

        await store.joinLobby(lobby1.lobbyId, 'user3');

        await expect(
          store.joinLobby(lobby2.lobbyId, 'user3')
        ).rejects.toThrow('ALREADY_IN_OTHER_LOBBY');
      });

      test('should mark lobby as full when reaching max capacity', async () => {
        const lobby = await store.createLobby({
          hostId: 'user1',
          maxPlayers: 3
        });

        await store.joinLobby(lobby.lobbyId, 'user2');
        await store.joinLobby(lobby.lobbyId, 'user3');

        const updatedLobby = await store.getLobby(lobby.lobbyId);
        expect(updatedLobby.status).toBe('full');
        expect(updatedLobby.playerCount).toBe(3);
      });
    });

    describe('leaveLobby', () => {
      test('should allow player to leave lobby', async () => {
        const lobby = await store.createLobby({
          hostId: 'user1',
          name: 'Test Lobby'
        });

        await store.joinLobby(lobby.lobbyId, 'user2');
        const result = await store.leaveLobby(lobby.lobbyId, 'user2');

        expect(result.success).toBe(true);
        expect(result.message).toBe('LEFT');

        const players = await store.getLobbyPlayers(lobby.lobbyId);
        expect(players).not.toContain('user2');
      });

      test('should delete lobby when last player leaves', async () => {
        const lobby = await store.createLobby({
          hostId: 'user1',
          name: 'Test Lobby'
        });

        const result = await store.leaveLobby(lobby.lobbyId, 'user1');

        expect(result.success).toBe(true);
        expect(result.message).toBe('LOBBY_DELETED');

        const deletedLobby = await store.getLobby(lobby.lobbyId);
        expect(deletedLobby).toBeNull();
      });

      test('should promote new host when host leaves', async () => {
        const lobby = await store.createLobby({
          hostId: 'user1',
          name: 'Test Lobby'
        });

        await store.joinLobby(lobby.lobbyId, 'user2');
        await store.joinLobby(lobby.lobbyId, 'user3');

        const result = await store.leaveLobby(lobby.lobbyId, 'user1');

        expect(result.success).toBe(true);
        expect(result.newHost).toBeDefined();

        const updatedLobby = await store.getLobby(lobby.lobbyId);
        expect(updatedLobby.hostId).toBe(result.newHost);
        expect(['user2', 'user3']).toContain(updatedLobby.hostId);
      });

      test('should change status from full to open when player leaves', async () => {
        const lobby = await store.createLobby({
          hostId: 'user1',
          maxPlayers: 2
        });

        await store.joinLobby(lobby.lobbyId, 'user2');
        
        let updatedLobby = await store.getLobby(lobby.lobbyId);
        expect(updatedLobby.status).toBe('full');

        await store.leaveLobby(lobby.lobbyId, 'user2');

        updatedLobby = await store.getLobby(lobby.lobbyId);
        expect(updatedLobby.status).toBe('open');
      });

      test('should throw error when leaving non-existent lobby', async () => {
        await expect(
          store.leaveLobby('nonexistent', 'user1')
        ).rejects.toThrow('LOBBY_NOT_FOUND');
      });

      test('should throw error when player not in lobby', async () => {
        const lobby = await store.createLobby({
          hostId: 'user1',
          name: 'Test Lobby'
        });

        await expect(
          store.leaveLobby(lobby.lobbyId, 'user2')
        ).rejects.toThrow('NOT_IN_LOBBY');
      });
    });

    describe('startGame', () => {
      test('should allow host to start game', async () => {
        const lobby = await store.createLobby({
          hostId: 'user1',
          name: 'Test Lobby'
        });

        const result = await store.startGame(lobby.lobbyId, 'user1');
        expect(result.success).toBe(true);

        const updatedLobby = await store.getLobby(lobby.lobbyId);
        expect(updatedLobby.status).toBe('in-game');
      });

      test('should throw error when non-host tries to start game', async () => {
        const lobby = await store.createLobby({
          hostId: 'user1',
          name: 'Test Lobby'
        });

        await store.joinLobby(lobby.lobbyId, 'user2');

        await expect(
          store.startGame(lobby.lobbyId, 'user2')
        ).rejects.toThrow('NOT_HOST');
      });

      test('should throw error when game already started', async () => {
        const lobby = await store.createLobby({
          hostId: 'user1',
          name: 'Test Lobby'
        });

        await store.startGame(lobby.lobbyId, 'user1');

        await expect(
          store.startGame(lobby.lobbyId, 'user1')
        ).rejects.toThrow('ALREADY_IN_GAME');
      });
    });

    describe('listJoinableLobbies', () => {
      test('should list public open lobbies', async () => {
        await store.createLobby({
          hostId: 'user1',
          name: 'Public Lobby 1',
          isPublic: true
        });

        await store.createLobby({
          hostId: 'user2',
          name: 'Public Lobby 2',
          isPublic: true
        });

        await store.createLobby({
          hostId: 'user3',
          name: 'Private Lobby',
          isPublic: false
        });

        const lobbies = await store.listJoinableLobbies(10);
        expect(lobbies.length).toBe(2);
        expect(lobbies.every(l => l.isPublic)).toBe(true);
      });

      test('should sort lobbies by creation time (newest first)', async () => {
        const lobby1 = await store.createLobby({
          hostId: 'user1',
          name: 'First Lobby'
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        const lobby2 = await store.createLobby({
          hostId: 'user2',
          name: 'Second Lobby'
        });

        const lobbies = await store.listJoinableLobbies(10);
        expect(lobbies[0].lobbyId).toBe(lobby2.lobbyId);
        expect(lobbies[1].lobbyId).toBe(lobby1.lobbyId);
      });

      test('should respect limit parameter', async () => {
        for (let i = 0; i < 5; i++) {
          await store.createLobby({
            hostId: `user${i}`,
            name: `Lobby ${i}`
          });
        }

        const lobbies = await store.listJoinableLobbies(3);
        expect(lobbies.length).toBe(3);
      });
    });
  });

  describe('Session Operations', () => {
    describe('createSession', () => {
      test('should create a new session with resume token', async () => {
        const { resumeToken, sessionData } = await store.createSession(
          'user1',
          'connection1',
          'server1'
        );

        expect(resumeToken).toBeDefined();
        expect(resumeToken.length).toBeGreaterThan(0);
        expect(sessionData).toMatchObject({
          playerId: 'user1',
          connectionId: 'connection1',
          serverId: 'server1',
          resumeToken
        });
      });

      test('should set TTL on session', async () => {
        await store.createSession('user1', 'connection1');
        
        const ttl = await mockRedis.ttl('session:user1');
        expect(ttl).toBeGreaterThan(0);
        expect(ttl).toBeLessThanOrEqual(store.TTL.SESSION_GRACE);
      });
    });

    describe('getSession', () => {
      test('should return session data', async () => {
        const { resumeToken } = await store.createSession('user1', 'connection1');
        
        const session = await store.getSession('user1');
        expect(session).toMatchObject({
          playerId: 'user1',
          connectionId: 'connection1',
          resumeToken
        });
      });

      test('should return null for non-existent session', async () => {
        const session = await store.getSession('nonexistent');
        expect(session).toBeNull();
      });
    });

    describe('updateSessionConnection', () => {
      test('should update connection ID with valid resume token', async () => {
        const { resumeToken } = await store.createSession('user1', 'connection1');
        
        const result = await store.updateSessionConnection(
          'user1',
          'connection2',
          resumeToken
        );

        expect(result.success).toBe(true);
        expect(result.oldConnectionId).toBe('connection1');

        const session = await store.getSession('user1');
        expect(session.connectionId).toBe('connection2');
      });

      test('should throw error with invalid resume token', async () => {
        await store.createSession('user1', 'connection1');
        
        await expect(
          store.updateSessionConnection('user1', 'connection2', 'invalid-token')
        ).rejects.toThrow('INVALID_RESUME_TOKEN');
      });

      test('should throw error for non-existent session', async () => {
        await expect(
          store.updateSessionConnection('nonexistent', 'connection1', 'token')
        ).rejects.toThrow('SESSION_NOT_FOUND');
      });

      test('should refresh TTL when updating connection', async () => {
        const { resumeToken } = await store.createSession('user1', 'connection1');
        
        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await store.updateSessionConnection('user1', 'connection2', resumeToken);
        
        const ttl = await mockRedis.ttl('session:user1');
        expect(ttl).toBeGreaterThan(0);
        expect(ttl).toBeLessThanOrEqual(store.TTL.SESSION_GRACE);
      });
    });

    describe('deleteSession', () => {
      test('should delete session', async () => {
        await store.createSession('user1', 'connection1');
        
        await store.deleteSession('user1');
        
        const session = await store.getSession('user1');
        expect(session).toBeNull();
      });
    });
  });

  describe('Event Buffer Operations', () => {
    describe('addLobbyEvent', () => {
      test('should add event with sequence number', async () => {
        const lobby = await store.createLobby({
          hostId: 'user1',
          name: 'Test Lobby'
        });

        const event = await store.addLobbyEvent(lobby.lobbyId, {
          type: 'player_joined',
          playerId: 'user2'
        });

        expect(event.seq).toBe(1);
        expect(event.type).toBe('player_joined');
        expect(event.timestamp).toBeDefined();
      });

      test('should increment sequence number', async () => {
        const lobby = await store.createLobby({
          hostId: 'user1',
          name: 'Test Lobby'
        });

        const event1 = await store.addLobbyEvent(lobby.lobbyId, {
          type: 'event1'
        });
        const event2 = await store.addLobbyEvent(lobby.lobbyId, {
          type: 'event2'
        });

        expect(event1.seq).toBe(1);
        expect(event2.seq).toBe(2);
      });
    });

    describe('getEventsSince', () => {
      test('should return events after sequence number', async () => {
        const lobby = await store.createLobby({
          hostId: 'user1',
          name: 'Test Lobby'
        });

        await store.addLobbyEvent(lobby.lobbyId, { type: 'event1' });
        await store.addLobbyEvent(lobby.lobbyId, { type: 'event2' });
        await store.addLobbyEvent(lobby.lobbyId, { type: 'event3' });

        const events = await store.getEventsSince(lobby.lobbyId, 1);
        expect(events.length).toBe(2);
        expect(events[0].type).toBe('event2');
        expect(events[1].type).toBe('event3');
      });

      test('should return empty array if no new events', async () => {
        const lobby = await store.createLobby({
          hostId: 'user1',
          name: 'Test Lobby'
        });

        await store.addLobbyEvent(lobby.lobbyId, { type: 'event1' });

        const events = await store.getEventsSince(lobby.lobbyId, 100);
        expect(events).toEqual([]);
      });
    });

    describe('getCurrentSeq', () => {
      test('should return current sequence number', async () => {
        const lobby = await store.createLobby({
          hostId: 'user1',
          name: 'Test Lobby'
        });

        await store.addLobbyEvent(lobby.lobbyId, { type: 'event1' });
        await store.addLobbyEvent(lobby.lobbyId, { type: 'event2' });

        const seq = await store.getCurrentSeq(lobby.lobbyId);
        expect(seq).toBe(2);
      });

      test('should return 0 for lobby with no events', async () => {
        const lobby = await store.createLobby({
          hostId: 'user1',
          name: 'Test Lobby'
        });

        const seq = await store.getCurrentSeq(lobby.lobbyId);
        expect(seq).toBe(0);
      });
    });
  });
});
