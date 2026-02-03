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
- [ ] Core server architecture with Socket.IO
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
