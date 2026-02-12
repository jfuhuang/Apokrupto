# Realtime Lobby + Reconnect Design

## Overview

The Apokrupto server implements a production-ready lobby and realtime game system with robust mobile reconnection handling. The system is designed to handle network instability on mobile devices, allowing players to seamlessly resume their sessions after brief disconnections.

## Architecture

### Components

1. **Redis Store** - Authoritative runtime state storage
2. **WebSocket Server** - Socket.IO-based realtime messaging
3. **Lobby Service** - Business logic for lobby operations
4. **Pub/Sub** - Redis-based multi-instance communication

### Key Features

- **Lobby Management**: Create, join, leave, and start games
- **Mobile Reconnection**: Automatic session resume with minimal data loss
- **Event Replay**: Missed events delivered on reconnection
- **Rate Limiting**: Movement updates throttled at source
- **Multi-Instance**: Horizontal scaling via Redis Pub/Sub
- **Atomic Operations**: Race-condition-free using Lua scripts

## Redis Key Schema

All runtime state is stored in Redis with appropriate TTLs:

```
lobby:{lobbyId}                  -> Hash: Lobby metadata
  Fields: lobbyId, hostId, name, maxPlayers, isPublic, status, createdAt, updatedAt

lobby:{lobbyId}:players          -> Set: Player IDs in lobby

lobby:{lobbyId}:seq              -> Integer: Event sequence counter

player:{playerId}:lobby          -> String: Current lobby ID for player

session:{playerId}               -> Hash: Session data (with TTL)
  Fields: playerId, resumeToken, connectionId, serverId, lastSeenAt, createdAt
  TTL: 60 seconds (grace period for reconnection)

events:lobby:{lobbyId}           -> List: Recent events for replay (with TTL)
  TTL: 120 seconds
  Max size: 100 events (trimmed)

pubsub:lobby:{lobbyId}           -> Pub/Sub channel for lobby events
```

### TTL Configuration

- **Empty Lobby**: 900 seconds (15 minutes)
- **Disconnected Session**: 60 seconds (grace period)
- **Event Buffer**: 120 seconds (replay window)

Configured via environment variables:
- `LOBBY_EMPTY_TTL`
- `LOBBY_SESSION_GRACE_TTL`
- `LOBBY_EVENT_BUFFER_TTL`

## Message Formats

All messages use JSON with `{type, payload}` structure.

### Client → Server

#### Resume Session
```json
{
  "playerId": "user123",
  "resumeToken": "abc123...",
  "lastSeqSeen": 42
}
```

#### Create Lobby
```json
{
  "name": "My Game",
  "isPublic": true,
  "maxPlayers": 10
}
```

#### List Lobbies
```json
{
  "limit": 20
}
```

#### Join Lobby
```json
{
  "lobbyId": "lobby_abc123"
}
```

#### Leave Lobby
```json
{
  "lobbyId": "lobby_abc123"
}
```

#### Start Game
```json
{
  "lobbyId": "lobby_abc123"
}
```

#### Movement Update
```json
{
  "lobbyId": "lobby_abc123",
  "seq": 100,
  "clientTs": 1234567890,
  "lat": 37.7749,
  "lng": -122.4194,
  "accuracy": 10,
  "speed": 1.5
}
```

### Server → Client

#### Resume Success
```json
{
  "type": "resume_ok",
  "payload": {
    "lobbyId": "lobby_abc123",
    "snapshot": {
      "lobby": { ... },
      "players": ["user1", "user2"],
      "serverSeq": 45
    },
    "missedEvents": [ ... ],
    "serverSeq": 45
  }
}
```

#### Resume Failed
```json
{
  "type": "resume_failed",
  "payload": {
    "reason": "INVALID_RESUME_TOKEN"
  }
}
```

#### Lobby List
```json
{
  "type": "lobbies",
  "payload": {
    "items": [
      {
        "lobbyId": "lobby_abc",
        "name": "Game 1",
        "playerCount": 3,
        "maxPlayers": 10,
        "status": "open",
        "isPublic": true
      }
    ]
  }
}
```

#### Lobby Update
```json
{
  "type": "lobby_update",
  "payload": {
    "lobbyId": "lobby_abc123",
    "snapshot": {
      "lobby": { ... },
      "players": ["user1", "user2", "user3"],
      "serverSeq": 50
    },
    "serverSeq": 50,
    "newHost": "user2"
  }
}
```

#### Player Movement
```json
{
  "type": "player_moved",
  "payload": {
    "lobbyId": "lobby_abc123",
    "playerId": "user123",
    "lat": 37.7749,
    "lng": -122.4194,
    "accuracy": 10,
    "speed": 1.5,
    "serverSeq": 51
  }
}
```

#### Session Replaced
```json
{
  "type": "session_replaced",
  "payload": {
    "message": "Session resumed on another device"
  }
}
```

#### Error
```json
{
  "type": "error",
  "payload": {
    "code": "LOBBY_FULL",
    "message": "Lobby has reached maximum capacity"
  }
}
```

## Reconnection Flow

### Normal Connection Flow

1. Client authenticates with JWT token
2. Server creates WebSocket connection
3. Client receives `connect` event
4. Client can now perform lobby operations

### Disconnection & Reconnection

1. **Disconnection**:
   - Network drops (Wi-Fi → cellular transition)
   - Socket disconnects
   - Session remains in Redis with TTL

2. **Reconnection** (within grace period):
   - Client reconnects with new socket
   - Client sends `resume` message with:
     - `playerId`
     - `resumeToken` (from initial connection)
     - `lastSeqSeen` (last event sequence processed)
   
3. **Server Resume Handler**:
   - Validates `resumeToken` against stored session
   - Atomically replaces old connection with new one
   - Closes old socket if still active
   - Retrieves missed events since `lastSeqSeen`
   - Sends `resume_ok` with:
     - Current lobby snapshot
     - Missed events array
     - Current sequence number

4. **Client Resume**:
   - Processes missed events in order
   - Updates local state
   - Continues normal operation

### Idempotent Join

The `joinLobby` operation is **idempotent by playerId**:
- First join: Adds player to lobby
- Subsequent joins with same `playerId`: Returns `ALREADY_IN_LOBBY`, no duplicate entry
- Prevents duplicate players from connection churn

### Race Conditions

Atomic operations prevent common race conditions:

#### Join Race
Multiple simultaneous join requests for a nearly-full lobby are handled atomically via Lua script:
- Capacity check and player addition in single transaction
- Only one request succeeds if lobby becomes full
- Others receive `LOBBY_FULL` error

#### Host Promotion
When host leaves, a new host is atomically promoted:
- Player removal and host reassignment in single transaction
- No window where lobby has no host

## Security & Validation

### Authentication

- **JWT Token Required**: All WebSocket connections must authenticate
- Token provided via `auth.token` or `query.token` in handshake
- Token payload attached to socket: `socket.userId`, `socket.username`

### Authorization

- **Host-Only Actions**: `startGame` validates caller is lobby host
- **Lobby Membership**: Movement updates require player to be in lobby

### Rate Limiting

- **Movement Updates**: 20 updates/second per client
- Exceeded requests silently dropped
- Prevents client spam/abuse

### Input Validation

- **Coordinates**: Lat ∈ [-90, 90], Lng ∈ [-180, 180]
- **Required Fields**: All message types validate required fields
- **Type Checking**: Numeric fields validated as numbers

## Multi-Instance Support

### Redis Pub/Sub

Each lobby has a Pub/Sub channel: `lobby:{lobbyId}`

#### Publishing Events

When a lobby event occurs (join, leave, movement):
1. Event stored in Redis
2. Event published to `lobby:{lobbyId}` channel
3. All server instances subscribed to pattern receive event
4. Each instance forwards to its local Socket.IO clients

#### Preventing Echo

Events include `serverId` to prevent re-broadcasting:
```javascript
if (data.serverId === this.serverId) {
  // Just emit to local clients, don't re-broadcast
  this.io.to(channel).emit(data.type, data.payload);
  return;
}
```

## Environment Variables

Create a `.env` file in `server/` directory:

```bash
# PostgreSQL Configuration
POSTGRES_USER=apokrupto_user
POSTGRES_HOST=127.0.0.1
POSTGRES_DB=apokrupto
POSTGRES_PASSWORD=your_password
POSTGRES_PORT=5432

# Redis Configuration
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production

# Server Configuration
NODE_ENV=development
PORT=3000
SERVER_ID=server_1

# CORS (optional)
CORS_ORIGIN=*

# Lobby TTL Configuration (optional, defaults shown)
LOBBY_EMPTY_TTL=900
LOBBY_SESSION_GRACE_TTL=60
LOBBY_EVENT_BUFFER_TTL=120
```

## Running Locally

### Prerequisites

- Node.js v16+
- PostgreSQL
- Redis

### Setup

1. **Install Dependencies**:
   ```bash
   cd server
   npm install
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Redis** (if not running):
   ```bash
   redis-server
   ```

4. **Start PostgreSQL** (if not running):
   ```bash
   # macOS with Homebrew
   brew services start postgresql

   # Linux with systemd
   sudo systemctl start postgresql
   ```

5. **Start Server**:
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

### Using Docker Compose

```bash
cd server
docker-compose up --build
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- Server on port 3000

## Testing

### Run Tests

```bash
cd server
npm test
```

### Test Coverage

```bash
npm run test:coverage
```

### Test Categories

- **Unit Tests**: Store operations (atomic joins, host promotion, session management)
- **Integration Tests**: WebSocket reconnection flows
- **Edge Cases**: Race conditions, idempotent operations, TTL expiry

## API Endpoints

### REST API

- `GET /` - Health check (returns server status)
- `GET /health` - Health check (JSON response)
- `POST /api/users/register` - User registration
- `POST /api/users/login` - User login

### WebSocket Events

Connect to WebSocket server:
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Resume session
socket.emit('resume', {
  playerId: 'user123',
  resumeToken: 'abc...',
  lastSeqSeen: 42
}, (response) => {
  console.log(response);
});

// Create lobby
socket.emit('createLobby', {
  name: 'My Game',
  isPublic: true,
  maxPlayers: 10
}, (response) => {
  console.log(response);
});
```

## Performance Considerations

### Scaling

- **Horizontal Scaling**: Multiple server instances supported via Redis Pub/Sub
- **Redis**: Single Redis instance can handle 10k+ lobbies
- **WebSocket**: Each Node.js instance handles ~10k concurrent connections

### Optimizations

- **Event Buffering**: Only 100 most recent events kept per lobby
- **TTL Cleanup**: Automatic expiry of inactive lobbies and sessions
- **Rate Limiting**: Client-side throttling prevents server overload
- **Atomic Operations**: Lua scripts minimize round-trips to Redis

## Monitoring

### Logs

Structured logging for key events:
- `[WS] Client connected: {socketId} (user: {userId})`
- `[WS] Resume attempt: playerId={playerId}, lastSeq={lastSeqSeen}`
- `[LobbyService] Lobby created: {lobbyId} by host {hostId}`
- `[LobbyService] Player {playerId} joined lobby {lobbyId}`

### Health Checks

- `GET /health` - Returns server status and timestamp
- Monitor Redis connection: `redis.on('error', ...)`
- Monitor WebSocket connections: Track `connections` Map size

## Troubleshooting

### Client Can't Connect

1. Check JWT token is valid and not expired
2. Verify CORS settings allow client origin
3. Check server logs for authentication errors

### Resume Fails

1. Session may have expired (>60s disconnect)
2. Resume token may be invalid
3. Player ID doesn't match authenticated user

### Lobby Operations Fail

1. **LOBBY_FULL**: Lobby at max capacity
2. **NOT_HOST**: Only host can start game
3. **ALREADY_IN_OTHER_LOBBY**: Leave current lobby first

### Events Not Received

1. Check client is subscribed to correct lobby
2. Verify Redis Pub/Sub is working
3. Check rate limiting isn't dropping events

## Future Enhancements

- [ ] Persistent lobby history in PostgreSQL
- [ ] Advanced matchmaking algorithms
- [ ] Spectator mode
- [ ] Lobby chat
- [ ] Custom lobby rules/settings
- [ ] Server-side movement validation
- [ ] Replay system for completed games
