# Apokrupto - Server

Node.js + Express backend for the Apokrupto social-deduction party game. Handles authentication, lobby management, the full game state machine (team assignment, 3-movement rounds, scoring), and real-time Socket.IO communication for up to 80 players.

## Features

- **User Authentication** — Registration, login, JWT tokens (7-day expiry), bcrypt password hashing
- **Lobby Management** — Create/join/leave lobbies (5–100 players), host kick, admin controls, real-time Socket.IO updates + 10s REST polling fallback
- **Game State Machine** — Full round lifecycle: Movement A (social deduction) → B (tasks) → C (voting), with GM-controlled state transitions
- **Team & Group Engine** — 4:1 Phos:Skotia assignment, groups of 5 (guaranteed 1 Skotia each), reshuffled every round
- **Movement A** — Turn-based word submission with biblical prompts, 30s per turn with auto-advance, deliberation phase
- **Movement B** — Task phase with team point scoring and Skotia passive bonus (+50 points)
- **Movement C** — Group voting, mark/unmark resolution, scoring (correct/false marks)
- **Win Conditions** — Point majority after final round, or Phos supermajority (≥80% Skotia correctly marked)
- **GM Dashboard** — Web-based (`/gm.html`) for advancing movements, broadcasting announcements, viewing full game state
- **Admin Features** — Add bot players, kick players, force-end lobbies

## Prerequisites

- Node.js v20+ (recommended)
- PostgreSQL 12+
- npm

## Installation

```bash
cd server
npm install
cp .env.example .env   # Edit with your DB credentials and JWT_SECRET
```

### Environment Variables (`server/.env`)

```env
POSTGRES_USER=apokrupto
POSTGRES_PASSWORD=your_password
POSTGRES_DB=apokrupto
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
JWT_SECRET=your_secret_here
GM_USERNAMES=admin_user        # Comma-separated usernames with GM privileges
ADMIN_USERNAMES=admin_user     # Comma-separated usernames with admin privileges
```

### Database Setup

**Option A: Docker (recommended)**
```bash
docker-compose up -d postgres   # PostgreSQL on localhost:5432
```

**Option B: Local PostgreSQL**
```bash
psql -U postgres
CREATE DATABASE apokrupto;
\q
```

The database schema is auto-created on server startup via `dbInit.js` — no manual migration needed.

## Running

```bash
npm run dev             # Development with nodemon (auto-restart)
npm start               # Production mode
npm run docker:dev      # Docker: PostgreSQL + server (development)
npm run docker:prod     # Docker: PostgreSQL + server (production)
```

Server binds to `0.0.0.0:3000`.

## Project Structure

```
server/
├── app.js                    # Express + HTTP server + Socket.IO bootstrapping
├── db.js                     # PostgreSQL connection pool
├── dbInit.js                 # Auto-schema creation + biblical prompt seeding
├── data/
│   ├── tasks.js              # Task definitions (trivia, scripture, skill, cooperative)
│   └── sabotages.js          # Legacy sabotage data
├── middleware/
│   ├── auth.js               # JWT authentication middleware (REST)
│   └── socketAuth.js         # JWT authentication middleware (Socket.IO)
├── routes/
│   ├── userRoutes.js         # POST /api/users/register, /login
│   ├── lobbyRoutes.js        # Lobby CRUD, kick, add-dummy, force-end, task completion
│   └── gameRoutes.js         # Game lifecycle, movements A/B/C, GM controls
├── services/
│   └── gameService.js        # Core game logic: state machine, scoring, turn management
├── websocket/
│   └── lobbySocket.js        # Socket.IO event handlers (joinRoom, startGame, gmAdvance)
├── public/
│   ├── admin.html            # Admin dashboard
│   └── gm.html               # GM dashboard (web interface)
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

## Database Schema

All tables are auto-created on startup. Key tables:

### Core Tables
| Table | Purpose |
|-------|---------|
| `users` | id, username, password_hash, created_at |
| `lobbies` | id, name, max_players (5–100), created_by, status (waiting/in_progress/completed) |
| `lobby_players` | Lobby membership with role, points, is_alive |
| `user_providers` | OAuth provider links (GitHub, etc.) |
| `player_task_completions` | Track completed tasks per player per lobby |

### Game Session Tables
| Table | Purpose |
|-------|---------|
| `games` | id, lobby_id, status, total_rounds, current_round, winner, win_condition |
| `game_teams` | Team points — UNIQUE(game_id, team) |
| `game_players` | Per-player team assignment + is_marked — UNIQUE(game_id, user_id) |
| `game_groups` | Groups per round (game_id, round_number, group_index) |
| `game_group_members` | Group membership — UNIQUE(group_id, user_id) |
| `rounds` | Round status (pending/active/summarizing/completed) — UNIQUE(game_id, round_number) |
| `movements` | Movement status per round (A/B/C) — UNIQUE(round_id, movement_type) |
| `prompts` | Biblical prompt pairs (phos_prompt, skotia_prompt, theme_label) — 10 seeded on first startup |
| `movement_a_submissions` | Word submissions — UNIQUE(movement_id, user_id) |
| `movement_c_votes` | Voting records — UNIQUE(movement_id, voter_id, target_id) |
| `mark_events` | Mark/unmark history with was_correct flag |

## API Endpoints

All endpoints require `Authorization: Bearer <token>` unless noted.

### Auth (no auth required)
| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/users/register` | `{ username, password }` | `{ username, token }` |
| POST | `/api/users/login` | `{ username, password }` | `{ username, token }` |

### Lobbies
| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/lobbies` | — | `{ lobbies: [...] }` |
| GET | `/api/lobbies/current` | — | `{ lobby: { id, name, status, role, team, isGm, gameId } }` |
| GET | `/api/lobbies/:id` | — | `{ lobby: { id, name, ... } }` |
| GET | `/api/lobbies/:id/players` | — | `{ players, hostId, lobbyInfo }` |
| POST | `/api/lobbies` | `{ name, max_players }` | `{ lobby }` — 5–100 players, multiple of 5 |
| POST | `/api/lobbies/:id/join` | — | `{ message, lobbyId }` |
| POST | `/api/lobbies/:id/leave` | — | `{ message }` |
| POST | `/api/lobbies/:id/kick/:userId` | — | Host/Admin only |
| POST | `/api/lobbies/:id/add-dummy` | — | Admin only — adds bot player |
| POST | `/api/lobbies/:id/force-end` | — | Admin only |

### Game
| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/games` | `{ lobbyId, totalRounds? }` | `{ gameId }` — host only |
| POST | `/api/games/:id/start` | — | `{ ok, gameId, groupCount }` — host only |
| POST | `/api/games/:id/advance` | — | `{ ok, nextMovement, ... }` — GM only |
| GET | `/api/games/:id/state` | — | Per-player snapshot (team, group, marks, scores) |
| GET | `/api/games/:id/gm-state` | — | Full state for GM dashboard |
| GET | `/api/games/:id/movement-a/prompt` | — | Team-specific prompt + turn info |
| POST | `/api/games/:id/movement-a/submit` | `{ word }` | `{ ok, phase, completedCount }` |
| POST | `/api/games/:id/movement-c/vote` | `{ votes: { targetId: 'phos'\|'skotia' } }` | `{ ok }` |
| POST | `/api/games/:id/movement-b/complete` | `{ taskId }` | `{ ok, pointsEarned, teamPoints }` |
| POST | `/api/games/:id/broadcast` | `{ message, lobbyId }` | `{ ok }` — GM only |

### Socket.IO Events

**Client → Server:**
| Event | Payload | Notes |
|-------|---------|-------|
| `joinRoom` | `{ lobbyId }` | Join lobby or group socket room |
| `startGame` | `{ lobbyId }` | Host starts game |
| `gmAdvance` | `{ gameId }` | GM advances movement/round |

**Server → Client:**
| Event | Scope | Payload |
|-------|-------|---------|
| `lobbyUpdate` | Lobby room | Full lobby state (players, status, host) |
| `roleAssigned` | Per socket | `{ team, skotiaTeammates, groupId, groupNumber, groupMembers }` |
| `gameStarted` | Lobby room | `{ gameId, countdown: 5 }` |
| `movementStart` | Lobby/per-socket | `{ movement, roundNumber, groupId?, groupMembers?, teamPoints? }` |
| `turnStart` | Group room | `{ currentPlayerId, turnIndex, completedCount, timeLimit: 30 }` |
| `wordSubmitted` | Group room | `{ userId, username, word, nextTurnInSeconds }` |
| `deliberationStart` | Group room | `{ words: [{ userId, username, word }] }` |
| `votingComplete` | Group room | `{ markResults, roundSummary }` |
| `roundSummary` | Lobby room | `{ marksApplied, unmarksApplied, phosPointsEarned, skotiaPointsEarned }` |
| `announcement` | Lobby room | `{ message, from: 'GM', at: timestamp }` |
| `gameOver` | Lobby room | `{ winner, condition, phosPoints, skotiaPoints, skotiaPlayers }` |
| `playerKicked` | Lobby room | `{ userId }` |
| `lobbyClosed` | Lobby room | `{ lobbyId, reason }` |

## Scoring Constants

| Event | Points | Team |
|-------|--------|------|
| Correct mark (Phos marks Skotia) | +200 | Phos |
| False mark (Phos marks Phos) | +150 | Skotia |
| Correct unmark (vindicate Phos) | +150 | Phos |
| False unmark (free Skotia) | +200 | Skotia |
| Movement B passive bonus | +50 | Skotia |

## Security

- Passwords hashed with bcrypt (10 salt rounds)
- JWT tokens expire after 7 days
- All routes require valid JWT (REST and Socket.IO)
- Parameterized SQL queries throughout (no string concatenation)
- Database transactions for all state mutations (lobby join/leave, game state changes)
- Admin/GM actions gated by `ADMIN_USERNAMES` / `GM_USERNAMES` env vars

**Note:** Rate limiting is not yet implemented. Add `express-rate-limit` for production.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Cannot connect to database | Check PostgreSQL is running and `.env` credentials are correct |
| JWT token errors | Ensure `JWT_SECRET` is set in `.env`; tokens expire after 7 days |
| Port 3000 in use | Set `PORT` env var or change in `app.js` |
| Movement A stuck | Turn state is in-memory — server restart during Movement A requires game restart |

## Key Implementation Notes

- **Turn state is in-memory** — `groupTurnState` Map in `gameService.js` stores Movement A turn order. Lost on server restart.
- **Bot players** — Admin can add dummy players via `/api/lobbies/:id/add-dummy`. Bots auto-submit during Movement A turns.
- **Biblical prompts** — 10 prompt pairs seeded on first startup (if `prompts` table is empty).
- **Socket rooms** — `lobby:{lobbyId}` for lobby-wide events; `lobby:{groupId}` for group-specific events (Movement A turns).
- **Legacy sabotage system** — Still in codebase (`lobbySocket.js`, `lobbyRoutes.js`). Not part of the Phos/Skotia game. Safe to ignore.
