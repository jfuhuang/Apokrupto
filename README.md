# Apokrupto

A full-stack, JavaScript-based mobile application that brings the popular game "Among Us" into the real world using GPS technology.

## Project Overview

Apokrupto is a location-based mobile game where players' physical movements dictate their in-game actions. Similar to Geoguessr IRL, this game leverages GPS to create an immersive real-world gaming experience inspired by the popular Among Us game.

## Gameplay Mechanics

### Roles

Players are assigned one of two roles at the start of each game:

#### Crewmate
- **Objective:** Complete all tasks before being eliminated by Impostors
- **Tasks:** Physical activities requiring movement to specific real-world locations (buildings, landmarks)
- **Task Activation:** Tasks become available when within GPS-defined range of a location
- **Task Types:** Classic Among Us-style challenges adapted for real-world play:
  - Running a certain distance
  - Moving between two points within a time limit
  - Location-based mini-games

#### Impostor
- **Objective:** Eliminate all Crewmates before they complete their tasks
- **Kill Mechanic:** Can "kill" Crewmates when in close physical proximity
- **Sabotage:** Can trigger sabotages that force all Crewmates to race to a specific location to prevent a game-ending crisis
- **Deception:** Must blend in with Crewmates and avoid detection

### Real-Time Features

The game provides real-time updates for all players, including:
- Player locations (with appropriate visibility rules)
- Task progress
- Kill notifications
- Sabotage events
- Emergency meetings

## Technology Stack

### Client (Mobile Application)
- **Framework:** React Native with Expo
- **Key Dependencies:**
  - `react` & `react-native` - Core mobile framework
  - `expo` - Development and deployment platform
  - `expo-location` - GPS location tracking
  - `@rnmapbox/maps` - Interactive map display
  - `socket.io-client` - Real-time communication with robust reconnection support

### Server (Backend)
- **Runtime:** Node.js
- **Key Dependencies:**
  - `express` - REST API framework
  - `socket.io` - Real-time bidirectional communication
  - `ioredis` - Redis client for state management
  - `pg` - PostgreSQL database client
  - `@turf/turf` - Geospatial calculations and analysis

### Communication Architecture

The application uses **Socket.IO** with **Redis** for real-time communication to address:
- Network instability on mobile devices (Wi-Fi to cellular transitions)
- Automatic reconnection handling with session resume
- Fallback mechanisms for degraded connections
- Low-latency updates for game state synchronization
- Horizontal scaling via Redis Pub/Sub

**See [REALTIME_LOBBY_DESIGN.md](./REALTIME_LOBBY_DESIGN.md) for detailed documentation on the lobby and reconnection system.**

## Project Structure

```
apokrupto/
├── client/                    # React Native mobile application
│   └── package.json
├── server/                    # Node.js backend
│   ├── middleware/           # Express & Socket.IO middleware
│   ├── routes/               # REST API routes
│   ├── services/             # Business logic services
│   ├── store/                # Redis data access layer
│   ├── websocket/            # WebSocket server
│   ├── __tests__/            # Test files
│   ├── app.js               # Application entry point
│   └── package.json
├── REALTIME_LOBBY_DESIGN.md  # Lobby system documentation
└── README.md
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (for mobile client)
- PostgreSQL
- Redis

### Installation

#### Server Setup
```bash
cd server
npm install

# Copy environment template and configure
cp .env.example .env
# Edit .env with your database credentials

# Start with Docker (includes PostgreSQL and Redis)
npm run docker:start

# OR start manually (requires PostgreSQL and Redis running)
npm start
```

#### Client Setup
```bash
cd client
npm install
npm start
```

#### Running Tests
```bash
cd server
npm test
```

## Development Roadmap

- [x] Initial project scaffolding
- [x] Core server architecture with Socket.IO
- [x] Redis-backed lobby system
- [x] Mobile reconnection handling
- [x] Real-time game state synchronization
- [ ] Database schema design
- [ ] GPS location tracking implementation
- [ ] Map integration with Mapbox
- [ ] Task system implementation
- [ ] Game lobby and matchmaking
- [ ] Real-time game state synchronization
- [ ] Kill and sabotage mechanics
- [ ] UI/UX design and implementation

## License

This project is private and all rights are reserved.
