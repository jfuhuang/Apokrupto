# Apokrupto

A social-deduction party game for Campus Ministry events, supporting up to 80 players. Two teams — **Phos** (φῶς, light, majority ~4:1) and **Skotia** (σκοτία, darkness, minority) — compete across 3–4 rounds of social deduction, tasks, and voting.

> The game name *Apokrupto* (ἀποκρύπτω) means "to hide/conceal." The original GPS-based "Among Us IRL" version is archived at `github.com/jfuhuang/among-us-irl`.

## Gameplay Overview

Players are split into two teams: a majority **Phos** (light) team and a hidden minority **Skotia** (darkness) team at a 4:1 ratio. Each round has three movements:

1. **Movement A — Social Deduction:** Players receive team-specific prompts and submit one word each. Phos and Skotia get related but different prompts. Groups discuss to identify Skotia members.
2. **Movement B — Tasks:** All players complete phone-based tasks (Bible trivia, scripture memory, skill games, cooperative cipher decoding) to earn team points. Skotia earns a passive bonus.
3. **Movement C — Voting:** Group members vote on each other as Phos or Skotia. Majority votes mark or unmark players. Correct marks earn Phos points; false marks earn Skotia points.

**Win conditions:** Most points after all rounds, or Phos correctly marks ≥80% of Skotia (supermajority).

Groups of 5 are reshuffled each round (always 1 Skotia per group). Marks persist across rounds. No player elimination — everyone plays the full game.

See [GAME_DESIGN.md](./GAME_DESIGN.md) for the full game design document.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Client** | React Native 0.81.5 + Expo 54 (iOS, Android, Web) |
| **Server** | Node.js + Express 4, port 3000 |
| **Database** | PostgreSQL (pg driver), schema auto-created on startup |
| **Auth** | JWT (7-day expiry), stored via `expo-secure-store` |
| **Real-time** | Socket.IO (lobby + game state sync, 10s REST polling fallback) |
| **Fonts** | Orbitron (headings), Exo 2 (body), Rajdhani (accents) |
| **Theme** | Dark cyberpunk — Phos: electric blue (#00D4FF), Skotia: neon red (#FF3366) |

## Project Structure

```
apokrupto/
├── client/                          # React Native (Expo) mobile app
│   ├── App.js                       # Root component, navigation state machine
│   ├── config.js                    # Dynamic API URL detection
│   ├── components/                  # Reusable UI (AnimatedBackground, LobbyCard)
│   ├── data/                        # Client-side task definitions
│   ├── screens/
│   │   ├── auth/                    # Login, Registration
│   │   ├── dev/                     # DevMenuScreen (debug only)
│   │   ├── game/                    # Countdown, RoleReveal, RoundHub, MovementA/B,
│   │   │                            #   Voting, RoundSummary, GmDashboard, GameOver
│   │   ├── lobby/                   # LobbyList, LobbyScreen
│   │   ├── tasks/                   # TaskScreen + 10 task mechanics
│   │   └── welcome/                 # WelcomeScreen
│   ├── theme/                       # Colors, typography, font setup
│   └── utils/                       # API client, network utils, scripture utils
├── server/
│   ├── app.js                       # Express + Socket.IO entry point
│   ├── db.js                        # PostgreSQL connection pool
│   ├── dbInit.js                    # Auto-schema creation + prompt seeding
│   ├── data/                        # Task and sabotage definitions
│   ├── middleware/                   # JWT auth, socket auth
│   ├── routes/                      # REST: userRoutes, lobbyRoutes, gameRoutes
│   ├── services/gameService.js      # Core game state machine + scoring
│   ├── websocket/lobbySocket.js     # Socket.IO event handlers
│   └── public/                      # GM dashboard (gm.html)
├── GAME_DESIGN.md                   # Full game design document
├── IMPLEMENTATION_PLAN.md           # Build phases and progress
└── CLAUDE.md                        # AI agent context
```

## Getting Started

### Prerequisites
- Node.js v20+ (recommended)
- PostgreSQL 12+
- Expo Go app on mobile device (or emulator)

### Server Setup
```bash
cd server
npm install
cp .env.example .env    # Edit with DB credentials and JWT_SECRET
npm run dev             # Development with nodemon

# Or use Docker for PostgreSQL:
npm run docker:dev
```

### Client Setup
```bash
cd client
npm install
npm start               # Metro bundler (Expo)
```

The client auto-detects the server IP via `client/utils/networkUtils.js` — no hardcoded addresses needed. For production, use `npm run start:prod` (or `android:prod`, `ios:prod`, `web:prod`) to point at the deployed server.

### Environment Variables (`server/.env`)
```env
POSTGRES_USER=apokrupto
POSTGRES_PASSWORD=your_password
POSTGRES_DB=apokrupto
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
JWT_SECRET=your_secret_here
GM_USERNAMES=admin_user        # Comma-separated usernames with GM/admin privileges
ADMIN_USERNAMES=admin_user     # Comma-separated usernames with admin privileges
```

## Screen Flow

```
welcome → login / register → lobbyList → lobby
  → countdown → roleReveal → roundHub
    → movementA (Social Deduction)
    → movementB (Tasks)
    → movementC (Voting)
  → roundSummary → (repeat for next round)
  → gameOver

GM flow: lobby → gmDashboard (web-based GM controls)
```

## API Endpoints

All endpoints require `Authorization: Bearer <token>` unless noted.

### Auth (no auth required)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/users/register` | Register (`{ username, password }` → `{ username, token }`) |
| POST | `/api/users/login` | Login (`{ username, password }` → `{ username, token }`) |

### Lobbies
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/lobbies` | List all active lobbies |
| GET | `/api/lobbies/current` | Get current user's active lobby |
| GET | `/api/lobbies/:id` | Get lobby details |
| GET | `/api/lobbies/:id/players` | Get lobby player list |
| POST | `/api/lobbies` | Create lobby (5–100 players, multiple of 5) |
| POST | `/api/lobbies/:id/join` | Join a lobby |
| POST | `/api/lobbies/:id/leave` | Leave a lobby |
| POST | `/api/lobbies/:id/kick/:userId` | Kick player (host/admin) |
| POST | `/api/lobbies/:id/add-dummy` | Add bot player (admin) |
| POST | `/api/lobbies/:id/force-end` | Force-end lobby (admin) |

### Game
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/games` | Create game record (host only) |
| POST | `/api/games/:id/start` | Start game via REST (host only) |
| POST | `/api/games/:id/advance` | Advance movement/round (GM only) |
| GET | `/api/games/:id/state` | Per-player game state snapshot |
| GET | `/api/games/:id/gm-state` | GM dashboard state |
| GET | `/api/games/:id/movement-a/prompt` | Get team-specific prompt |
| POST | `/api/games/:id/movement-a/submit` | Submit Movement A word |
| POST | `/api/games/:id/movement-c/vote` | Submit Movement C votes |
| POST | `/api/games/:id/broadcast` | GM broadcast announcement |

### Socket.IO Events
| Direction | Event | Description |
|-----------|-------|-------------|
| Client → Server | `joinRoom` | Join lobby/group socket room |
| Client → Server | `startGame` | Host starts game |
| Client → Server | `gmAdvance` | GM advances movement/round |
| Server → Client | `lobbyUpdate` | Lobby state change |
| Server → Client | `roleAssigned` | Team + group assignment (per socket) |
| Server → Client | `gameStarted` | Game created, triggers countdown |
| Server → Client | `movementStart` | Movement transition |
| Server → Client | `turnStart` | Movement A turn advance |
| Server → Client | `deliberationStart` | All Movement A words submitted |
| Server → Client | `votingComplete` | Movement C results |
| Server → Client | `roundSummary` | End-of-round scoring |
| Server → Client | `gameOver` | Final results |
| Server → Client | `announcement` | GM broadcast |

## Development Status

### Implemented
- [x] User authentication (JWT, bcrypt)
- [x] Lobby system (create, join, leave, kick, real-time updates via Socket.IO)
- [x] Complete game state machine (server-side)
- [x] Team assignment (4:1 Phos:Skotia ratio, 1 Skotia per group of 5)
- [x] Group shuffling each round
- [x] Movement A: Social deduction (prompts, turn-based word submission, deliberation)
- [x] Movement B: Task phase (10 task mechanics, team point scoring)
- [x] Movement C: Voting (mark/unmark, scoring, supermajority check)
- [x] GM Dashboard (web-based, advance movements, broadcast, view state)
- [x] Round summary + game over screens
- [x] Dark cyberpunk UI with custom fonts
- [x] 10s REST polling fallback + Socket.IO real-time sync
- [x] Admin features (add bots, kick, force-end)

### Remaining
- [ ] `gameStateUpdate` socket emission (live score/mark-status push)
- [ ] `taskAssigned` socket event (server-side task assignment for Movement B)
- [ ] Supermajority win condition end-to-end verification
- [ ] Mark badge visibility across all screens
- [ ] Stress test with 80 simultaneous clients

## License

This project is private and all rights are reserved.
