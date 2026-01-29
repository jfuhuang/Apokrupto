# Socket.IO Server Documentation

## Overview

The Socket.IO server provides real-time, bidirectional communication for the Among Us IRL game. It handles player connections, room management, location updates, and game state synchronization.

## Authentication

All Socket.IO connections require JWT authentication. Include the token in the connection handshake:

```javascript
const socket = io('http://localhost:3000', {
  auth: { token: yourJWTToken }
});
```

## Events

### Client → Server

#### `joinRoom`
Join a game room.

**Payload:**
```javascript
{
  roomId: string,
  playerData: {
    role?: string,  // 'crewmate' or 'impostor'
    // additional player data
  }
}
```

#### `leaveRoom`
Leave a game room.

**Payload:**
```javascript
{
  roomId: string
}
```

#### `updateLocation`
Broadcast your current GPS location to the room.

**Payload:**
```javascript
{
  roomId: string,
  location: {
    latitude: number,
    longitude: number,
    accuracy?: number,
    timestamp?: number
  }
}
```

#### `updateGameState`
Update the game state (typically sent by game host).

**Payload:**
```javascript
{
  roomId: string,
  gameState: {
    state: 'waiting' | 'playing' | 'finished',
    // additional game state data
  }
}
```

### Server → Client

#### `roomState`
Sent to a player when they join a room. Contains current room information.

**Payload:**
```javascript
{
  roomId: string,
  players: Array<{
    userId: number,
    username: string,
    socketId: string,
    // additional player data
  }>,
  state: 'waiting' | 'playing' | 'finished'
}
```

#### `playerJoined`
Broadcast to all room members when a new player joins.

**Payload:**
```javascript
{
  userId: number,
  username: string,
  playerData: object
}
```

#### `playerLeft`
Broadcast to all room members when a player leaves.

**Payload:**
```javascript
{
  userId: number,
  username: string
}
```

#### `playerLocationUpdate`
Broadcast to room members when a player updates their location.

**Payload:**
```javascript
{
  userId: number,
  username: string,
  location: {
    latitude: number,
    longitude: number
  }
}
```

#### `gameStateUpdate`
Broadcast to all room members when game state changes.

**Payload:**
```javascript
{
  state: string,
  // additional game state data
}
```

#### `error`
Sent when an error occurs.

**Payload:**
```javascript
{
  message: string
}
```

## Connection Lifecycle

1. **Connect**: Client connects with JWT token in auth handshake
2. **Authenticate**: Server validates token and attaches userId/username to socket
3. **Join Room**: Client joins a game room
4. **Play**: Client sends/receives real-time events
5. **Leave Room**: Client leaves room (or disconnects)
6. **Disconnect**: Server cleans up player state and notifies room members

## Room Management

- Rooms are created automatically when the first player joins
- Rooms are deleted automatically when the last player leaves
- Players can only be in one room at a time
- Joining a new room automatically leaves the current room

## Example Client Implementation

```javascript
const io = require('socket.io-client');

// Connect with authentication
const socket = io('http://localhost:3000', {
  auth: { token: myJWTToken }
});

// Handle connection
socket.on('connect', () => {
  console.log('Connected!');
  
  // Join a room
  socket.emit('joinRoom', {
    roomId: 'game-123',
    playerData: { role: 'crewmate' }
  });
});

// Receive room state
socket.on('roomState', (data) => {
  console.log('Room players:', data.players);
});

// Listen for other players joining
socket.on('playerJoined', (data) => {
  console.log(`${data.username} joined the room`);
});

// Send location updates
setInterval(() => {
  socket.emit('updateLocation', {
    roomId: 'game-123',
    location: { latitude: 37.7749, longitude: -122.4194 }
  });
}, 5000);

// Listen for location updates from others
socket.on('playerLocationUpdate', (data) => {
  console.log(`${data.username} is at:`, data.location);
});
```

## Error Handling

The server will emit an `error` event if:
- Invalid location data is provided
- Room is not found
- Authentication fails

Always listen for the `error` event:

```javascript
socket.on('error', (error) => {
  console.error('Socket error:', error.message);
});
```

## Security Notes

- All connections must provide a valid JWT token
- Tokens are verified using the JWT_SECRET environment variable
- Unauthenticated connections are rejected
- Location data is validated before broadcasting
