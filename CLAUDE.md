# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Apokrupto is a social-deduction party game for Campus Ministry events, supporting up to 80 players. It is **not** a GPS/location-based game. Two teams — **Phos** (φῶς, light, majority ~4:1) and **Skotia** (σκοτία, darkness, minority) — compete over 3–4 rounds. Full game design is in `GAME_DESIGN.md`. The implementation roadmap is in `IMPLEMENTATION_PLAN.md`.

> The original "Among Us IRL" GPS-based version is archived at `github.com/jfuhuang/among-us-irl`.

## Development Commands

### Server (run from `server/`)
```bash
npm run dev          # Development with nodemon (auto-restart)
npm start            # Production
npm run docker:start # Spin up PostgreSQL via Docker Compose + start server
```

### Client (run from `client/`)
```bash
npm start            # Metro bundler (Expo)
npm run android      # Build and run on Android
npm run ios          # Build and run on iOS
npm run web          # Web version
```

### Environment Setup
1. Copy `server/.env.example` to `server/.env` and fill in DB credentials and `JWT_SECRET`
2. Start PostgreSQL (either locally or via `npm run docker:start` in `server/`)
3. The server auto-initializes the DB schema on startup via `dbInit.js`

The client dynamically detects the server's IP address via `client/utils/networkUtils.js` — no hardcoded addresses needed.

## Architecture

### Stack
- **Client:** React Native 0.81.5 + Expo 54, targeting iOS and Android
- **Server:** Node.js + Express 4, listening on port 3000
- **Database:** PostgreSQL (pg driver); schema auto-created on server start
- **Auth:** JWT tokens (7-day expiry), stored client-side in `expo-secure-store`
- **Real-time:** Socket.IO on both client and server. Lobby screens use socket + 10s REST polling fallback. Game screens are fully socket-driven.

### Navigation (client)
There is **no React Navigation library**. `client/App.js` manages a `currentScreen` string state and renders the appropriate screen component directly. To add a screen, add it to the `switch` block in `App.js`.

**Full screen flow:**
```
welcome → login / register → lobbyList → lobby
  → countdown → roleReveal → roundHub
    → movementA (Movement A: social deduction)
    → movementB / task (Movement B: tasks)
    → movementC (Movement C: voting)
  → roundSummary → (repeat roundHub for next round)
  → gameOver

GM flow: lobby → gmDashboard (bypasses player round flow)
```

### App.js state (key fields)
| Field | Type | Purpose |
|-------|------|---------|
| `token` | string | JWT |
| `currentLobbyId` | string | Active lobby |
| `currentTeam` | `'phos'`/`'skotia'` | Player's team |
| `skotiaTeammates` | array | Skotia players (Skotia only) |
| `gameId` | string | Active game session |
| `currentRound` | number | 1–4 |
| `totalRounds` | number | Configured at game start |
| `currentMovement` | `'A'`/`'B'`/`'C'` | Active movement |
| `currentGroupId` | string | Player's group this round |
| `currentGroupMembers` | array | `{ id, username, isMarked, isYou }` |
| `teamPoints` | `{ phos, skotia }` | Aggregate team scores |
| `isMarked` | bool | Whether this player is currently marked |
| `isGm` | bool | Whether this player is the Game Master |
| `roundSummary` | object | Passed to RoundSummaryScreen |

### Authentication flow
All API calls require `Authorization: Bearer <token>`. The token is stored with key `jwtToken` in `expo-secure-store`. `server/middleware/auth.js` validates tokens on every protected route.

### Database schema (auto-created by `server/dbInit.js`)
**Existing tables:**
```
users           (id, username, password_hash, created_at)
lobbies         (id, name, max_players, created_by, status, created_at)
lobby_players   (id, lobby_id, user_id, joined_at)
```

**New tables needed (not yet built — see IMPLEMENTATION_PLAN.md Phase 1):**
```
games              (id, lobby_id, status, current_round, total_rounds, created_at)
game_teams         (id, game_id, team_name, points)
game_players       (id, game_id, user_id, team [phos|skotia], is_marked)
game_groups        (id, game_id, round_number, group_index)
game_group_members (id, group_id, game_player_id)
rounds             (id, game_id, round_number, current_movement [A|B|C], status)
movements          (id, round_id, movement_type, started_at, ended_at)
mark_events        (id, game_player_id, round_number, action [mark|unmark], was_correct)
```

### API endpoints (existing)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/users/register` | No | Create account |
| POST | `/api/users/login` | No | Returns JWT |
| GET | `/api/lobbies` | Yes | List active lobbies |
| GET | `/api/lobbies/:id` | Yes | Lobby details |
| POST | `/api/lobbies` | Yes | Create lobby (5–80 players) |
| POST | `/api/lobbies/:id/join` | Yes | Join lobby |
| POST | `/api/lobbies/:id/leave` | Yes | Leave lobby |

**New API endpoints needed (not yet built):**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/games/:id/movement-a/prompt` | Returns team-specific word prompt |
| POST | `/api/games/:id/movement-a/submit` | Submit word for Movement A |
| POST | `/api/games/:id/movement-c/vote` | Submit votes for Movement C |
| GET | `/api/games/:id/gm-state` | Full game state for GM dashboard |
| POST | `/api/games/:id/broadcast` | GM sends announcement to all players |

### Socket events (game)
| Event | Direction | Payload |
|-------|-----------|---------|
| `gameStateUpdate` | server→client | `{ teamPoints, groupMembers, gameState }` |
| `movementStart` | server→client | `{ movement, groupId, groupMembers }` |
| `turnStart` | server→client | `{ currentPlayerId, completedCount, timeLimit }` |
| `deliberationStart` | server→client | `{ words: string[] }` |
| `movementAComplete` | server→client | (no payload) |
| `taskAssigned` | server→client | task object |
| `votingComplete` | server→client | `{ markResults, roundSummary }` |
| `announcement` | server→client | `{ message }` |
| `gameOver` | server→client | `{ winner, phosPoints, skotiaPoints, skotiaPlayers, condition }` |
| `gmAdvance` | client→server | `{ gameId }` |

### Client screen inventory
| Screen | File | Status |
|--------|------|--------|
| Welcome | `screens/welcome/WelcomeScreen.js` | Existing |
| Login | `screens/auth/LoginScreen.js` | Existing |
| Register | `screens/auth/RegistrationScreen.js` | Existing |
| Lobby List | `screens/lobby/LobbyListScreen.js` | Existing |
| Lobby | `screens/lobby/LobbyScreen.js` | Updated |
| Countdown | `screens/game/CountdownScreen.js` | Existing |
| Role Reveal | `screens/game/RoleRevealScreen.js` | Updated (Phos/Skotia) |
| Round Hub | `screens/game/RoundHubScreen.js` | New |
| Movement A | `screens/game/MovementAScreen.js` | New |
| Voting (C) | `screens/game/VotingScreen.js` | New |
| Round Summary | `screens/game/RoundSummaryScreen.js` | New |
| GM Dashboard | `screens/game/GmDashboardScreen.js` | New |
| Game Over | `screens/game/GameOverScreen.js` | Updated |
| Task | `screens/tasks/TaskScreen.js` | Existing |
| Cipher Task | `screens/tasks/mechanics/CipherTask.js` | New |
| Dev Menu | `screens/dev/DevMenuScreen.js` | Existing |

### UI conventions
- Dark cyberpunk theme; color palette in `client/theme/colors.js`, typography in `client/theme/typography.js`
- Custom fonts: Orbitron (headings), Exo 2 (body), Rajdhani (accents) — loaded in `App.js` before any screen renders
- **Phos color:** `colors.primary.electricBlue` (#00D4FF)
- **Skotia color:** `colors.primary.neonRed` (#FF3366)
- Role reveal uses `colors.accent.ultraviolet` for both teams (intentional — prevents onlookers from reading roles)
- `client/components/AnimatedBackground.js` is a reusable particle animation
- `client/components/LobbyCard.js` is the reusable lobby list item

## Key Implementation Notes

- **No testing framework is configured.** Testing is manual.
- **Server-side game logic is not yet built.** The client screens exist and are wired for socket events, but the server routes, socket handlers, and DB tables for the game session are Phase 1 of `IMPLEMENTATION_PLAN.md`.
- Minimum lobby size is 5 (one complete group). Maximum is 80.
- DB transactions are used in lobby join/leave to prevent race conditions.
- The server hardcodes `0.0.0.0:3000` as the bind address. The real IP is detected by the client dynamically.
- JWT is decoded manually (no external library) in screens that need the user ID: `token.split('.')[1]` → base64 decode → `payload.sub`.
