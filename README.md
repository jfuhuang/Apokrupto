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
  - `mongoose` - MongoDB object modeling
  - `@turf/turf` - Geospatial calculations and analysis

### Communication Architecture

The application uses **Socket.IO** for real-time communication to address:
- Network instability on mobile devices (Wi-Fi to cellular transitions)
- Automatic reconnection handling
- Fallback mechanisms for degraded connections
- Low-latency updates for game state synchronization

## Project Structure

```
apokrupto/
├── client/          # React Native mobile application
│   └── package.json
├── server/          # Node.js backend
│   └── package.json
└── README.md
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- MongoDB

### Installation

#### Client Setup
```bash
cd client
npm install
npm start
```

#### Server Setup
```bash
cd server
npm install
npm start
```

## Development Roadmap

- [x] Initial project scaffolding
- [x] User authentication (registration and login)
- [x] JWT token management
- [x] Game lobby system (create, join, list lobbies)
- [x] Lobby list UI with search and auto-refresh
- [ ] Core server architecture with Socket.IO
- [ ] Real-time game state synchronization
- [ ] GPS location tracking implementation
- [ ] Map integration with Mapbox
- [ ] Task system implementation
- [ ] Kill and sabotage mechanics
- [ ] UI/UX polish and animations

## Features Implemented

### Authentication
- User registration with validation
- Secure login with JWT tokens
- Token persistence using secure storage
- Password hashing with bcrypt

### Lobby System
- Create lobbies with custom names and player limits (4-15 players)
- Browse all active lobbies
- Search lobbies by name, host, or ID
- Join lobbies directly from the list
- Join lobbies by entering a specific ID
- Auto-refresh lobby list every 10 seconds
- Real-time player count tracking
- Leave lobby functionality

## API Endpoints

### User Endpoints
- `POST /api/users/register` - Create a new user account
- `POST /api/users/login` - Authenticate and receive JWT token

### Lobby Endpoints (require JWT authentication)
- `GET /api/lobbies` - List all active lobbies
- `GET /api/lobbies/:id` - Get details of a specific lobby
- `POST /api/lobbies` - Create a new lobby
- `POST /api/lobbies/:id/join` - Join a lobby
- `POST /api/lobbies/:id/leave` - Leave a lobby

## License

This project is private and all rights are reserved.
