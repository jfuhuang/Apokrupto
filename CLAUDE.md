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
- **Database:** PostgreSQL (pg driver); schema auto-created on server start via `dbInit.js`
- **Auth:** JWT tokens (7-day expiry), stored client-side in `expo-secure-store`
- **Real-time:** Socket.IO on both client and server. Lobby screens use socket + 10s REST polling fallback. Game screens are socket-driven + occasional REST state fetches.

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

**Core / legacy tables:**
```
users                  (id, username, password_hash, created_at)
lobbies                (id, name, max_players, created_by, status [waiting|in_progress|completed], created_at)
lobby_players          (id, lobby_id, user_id, role, points, is_alive, joined_at)
user_providers         (id, user_id, provider, provider_id, provider_profile jsonb, created_at, last_seen_at)
player_task_completions(id, lobby_id, user_id, task_id, points_earned, completed_at)
```

**Game session tables (all built and active):**
```
games              (id, lobby_id, status [active|completed], total_rounds, current_round, winner [phos|skotia], win_condition [points|supermajority], created_at)
game_teams         (id, game_id, team [phos|skotia], points)  — UNIQUE(game_id, team)
game_players       (id, game_id, user_id, team [phos|skotia], is_marked)  — UNIQUE(game_id, user_id)
game_groups        (id, game_id, round_number, group_index)
game_group_members (id, group_id, user_id)  — UNIQUE(group_id, user_id)
rounds             (id, game_id, round_number, status [pending|active|completed])  — UNIQUE(game_id, round_number)
movements          (id, round_id, movement_type [A|B|C], status [pending|active|completed], started_at, completed_at)  — UNIQUE(round_id, movement_type)
prompts            (id, phos_prompt, skotia_prompt, theme_label)  — seeded with 10 biblical themes on first startup
movement_a_submissions (id, movement_id, group_id, user_id, word, submitted_at)  — UNIQUE(movement_id, user_id)
movement_c_votes   (id, movement_id, group_id, voter_id, target_id, vote [phos|skotia], submitted_at)  — UNIQUE(movement_id, voter_id, target_id)
mark_events        (id, game_id, game_player_id, round_number, action [mark|unmark], was_correct, created_at)
```

### API endpoints

All endpoints require `Authorization: Bearer <token>` unless noted. Admin endpoints check `ADMIN_USERNAMES` env var.

**Auth:**
| Method | Path | Auth | Request Body | Response |
|--------|------|------|--------------|----------|
| POST | `/api/users/register` | No | `{ username, password }` | `{ username, token }` |
| POST | `/api/users/login` | No | `{ username, password }` | `{ username, token }` |

**Lobby:**
| Method | Path | Auth | Request Body | Response |
|--------|------|------|--------------|----------|
| GET | `/api/lobbies` | Yes | — | `{ lobbies: [{ id, name, max_players, created_by, status, host_username, current_players, game_id }] }` |
| GET | `/api/lobbies/current` | Yes | — | `{ lobby: { id, name, status, role, team, isGm, gameId } \| null }` |
| GET | `/api/lobbies/:id` | Yes | — | `{ lobby: { id, name, max_players, created_by, status, host_username, current_players } }` |
| GET | `/api/lobbies/:id/players` | Yes | — | `{ players: [{ id, username, isHost }], hostId, lobbyInfo }` |
| POST | `/api/lobbies` | Yes | `{ name, max_players }` | `{ lobby: { id, name, ... } }` — 5–100 players, multiple of 5 |
| POST | `/api/lobbies/:id/join` | Yes | — | `{ message, lobbyId }` |
| POST | `/api/lobbies/:id/leave` | Yes | — | `{ message }` |
| POST | `/api/lobbies/:id/kick/:userId` | Host/Admin | — | `{ ok, lobbyClosed }` |
| POST | `/api/lobbies/:id/add-dummy` | Admin | — | `{ player: { id, username } }` |
| POST | `/api/lobbies/:id/force-end` | Admin | — | `{ ok: true }` |
| POST | `/api/lobbies/:id/tasks/complete` | Yes | `{ taskId }` | `{ pointsEarned, totalPoints, taskId }` |

**Game (all require auth):**
| Method | Path | Request Body | Response | Notes |
|--------|------|--------------|----------|-------|
| POST | `/api/games` | `{ lobbyId, totalRounds? }` | `{ gameId }` | Creates game record; host only; **not used by client** (client uses `startGame` socket event) |
| POST | `/api/games/:gameId/start` | — | `{ ok, gameId, groupCount }` | Starts game via REST; host only; **not used by client** — socket `startGame` is the actual path |
| POST | `/api/games/:gameId/advance` | — | `{ ok, nextMovement, ... }` | REST equivalent of socket `gmAdvance`; GM only |
| GET | `/api/games/:gameId/state` | — | `{ team, isMarked, groupId, groupIndex, groupMembers, teamPoints, currentRound, totalRounds, currentMovement }` | Per-player snapshot; used by RoundHubScreen on mount |
| GET | `/api/games/:gameId/gm-state` | — | `{ players, gameState: { round, totalRounds, movement, status }, teamPoints }` | GM dashboard polling |
| GET | `/api/games/:gameId/movement-a/prompt` | — | `{ prompt, themeLabel, currentPlayerId, completedCount, totalCount, timeLimit: 30 }` | Team-specific prompt |
| POST | `/api/games/:gameId/movement-a/submit` | `{ word }` | `{ ok, phase: 'waiting'\|'deliberation', nextPlayerId?, words? }` | Validates turn order |
| POST | `/api/games/:gameId/movement-c/vote` | `{ votes: { [targetUserId]: 'phos'\|'skotia' } }` | `{ ok: true }` | Upserts votes |
| POST | `/api/games/:gameId/broadcast` | `{ message, lobbyId }` | `{ ok: true }` | **Both `message` and `lobbyId` required** |

### Socket events

**Client → Server:**
| Event | Payload | Notes |
|-------|---------|-------|
| `joinRoom` | `{ lobbyId }` | Joins a room. `lobbyId` can be a lobby ID or a group ID. Responds with lobby state. |
| `startGame` | `{ lobbyId }` | Host starts game. Emits `roleAssigned` per socket + `gameStarted` + `movementStart` to lobby room. |
| `gmAdvance` | `{ gameId }` | GM advances movement/round state machine. |

**Server → Client:**
| Event | Room | Payload | Notes |
|-------|------|---------|-------|
| `lobbyUpdate` | lobby | `{ lobbyId, name, maxPlayers, status, hostId, players: [{ id, username, isHost, isConnected }] }` | Sent on join/leave/disconnect |
| `roleAssigned` | per-socket | `{ team, isGm, skotiaTeammates, groupId, groupNumber, groupMembers: [{ id, username, isMarked }] }` | Sent to each player on game start |
| `gameStarted` | lobby | `{ gameId, countdown: 5 }` | Triggers countdown → roleReveal → roundHub |
| `movementStart` | lobby (B/C) or per-socket (A new round) | `{ movement, roundNumber, totalRounds?, groupId?, groupNumber?, groupMembers?, teamPoints? }` | Movement A on new rounds includes full group info per socket. **This event also signals MovementAScreen to exit** when `movement !== 'A'`. |
| `turnStart` | group room | `{ currentPlayerId, turnIndex, completedCount, timeLimit: 30 }` | Advances Movement A turns |
| `deliberationStart` | group room | `{ words: string[] }` | All Movement A submissions received |
| `votingComplete` | group room | `{ markResults: [{ userId, username, action: 'mark'\|'unmark' }], roundSummary }` | `roundSummary` is embedded for client convenience; also sent separately as `roundSummary` event |
| `roundSummary` | lobby | `{ marksApplied, unmarksApplied, phosPointsEarned, skotiaPointsEarned }` | Sent after Movement C resolves |
| `announcement` | lobby | `{ message, from: 'GM', at: timestamp }` | GM broadcast |
| `gameOver` | lobby | `{ winner: 'phos'\|'skotia', condition: 'points'\|'supermajority', phosPoints, skotiaPoints, skotiaPlayers: [{ id, username }] }` | |
| `playerKicked` | lobby | `{ userId }` | |
| `lobbyClosed` | lobby | `{ lobbyId, reason }` | |

**Not yet implemented (server gaps):**
- `gameStateUpdate` — both `RoundHubScreen` and `GmDashboardScreen` listen for this, but the server never emits it. Live score/mark-status pushes do not work without it. Workaround: GmDashboard polls `/api/games/:id/gm-state` every 10s; RoundHub relies on `movementStart` payload for round/score updates.
- `taskAssigned` — `RoundHubScreen` listens for this (Movement B task assignment), but the server has no task assignment logic. Movement B is a stub.
- `movementAComplete` — `MovementAScreen` has a legacy listener for this, but the server uses `movementStart` (to the lobby room) instead. **Client now also listens for `movementStart { movement !== 'A' }` to exit.** The server does NOT need to emit `movementAComplete`.

### Game flow: how a round works (server-side)

1. **Host emits `startGame`** → server creates game + assigns teams (1 Skotia per 4 Phos, guaranteed 1 Skotia per group of 5) → emits `roleAssigned` per socket + `gameStarted` + `movementStart { movement: 'A' }` to lobby room.
2. **Client: countdown (5s) → roleReveal (6s) → roundHub** → roundHub fetches `GET /api/games/:id/state` on mount; if `currentMovement` is set, navigates immediately.
3. **Movement A:** players fetch prompt via `GET /api/games/:id/movement-a/prompt`, submit words via `POST`, receive `turnStart`/`deliberationStart` on the group socket room.
4. **GM emits `gmAdvance`** → server advances A→B → emits `movementStart { movement: 'B' }` to lobby room. MovementAScreen sees this and exits.
5. **Movement B:** stub — RoundHubScreen is shown in `movementBMode`. No server task assignment yet.
6. **GM emits `gmAdvance`** → A→C → emits `movementStart { movement: 'C' }` to lobby room. VotingScreen opens.
7. **Movement C:** players submit votes via `POST /api/games/:id/movement-c/vote` → GM emits `gmAdvance` → server resolves votes, updates marks, awards points → emits `votingComplete` (per group) + `roundSummary` (lobby) + either `movementStart { movement: 'A' }` per-socket (next round) or `gameOver` (lobby).

### Scoring constants (server/services/gameService.js)
| Event | Points | Team |
|-------|--------|------|
| Correct mark (Phos marks Skotia) | +200 | Phos |
| False mark (Phos marks Phos) | +150 | Skotia |
| Correct unmark (vindicate Phos) | +150 | Phos |
| False unmark (free Skotia) | +200 | Skotia |
| Movement B passive bonus | +50 | Skotia |

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
| Round Hub | `screens/game/RoundHubScreen.js` | Built |
| Movement A | `screens/game/MovementAScreen.js` | Built |
| Voting (C) | `screens/game/VotingScreen.js` | Built |
| Round Summary | `screens/game/RoundSummaryScreen.js` | Built |
| GM Dashboard | `screens/game/GmDashboardScreen.js` | Built |
| Game Over | `screens/game/GameOverScreen.js` | Updated |
| Task | `screens/tasks/TaskScreen.js` | Existing |
| Cipher Task | `screens/tasks/mechanics/CipherTask.js` | Existing |
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
- **Server-side game logic IS built** (Phase 1 complete). All DB tables, REST routes (`gameRoutes.js`), socket handlers (`lobbySocket.js`), and the game state machine (`services/gameService.js`) exist and are wired up.
- **Movement B is a stub.** Server advances A→B→C correctly and awards Skotia the passive bonus (+50), but there is no task assignment server logic. `RoundHubScreen` shows in `movementBMode` waiting for a `taskAssigned` socket event that never comes. GM must manually advance past B.
- **`gameStateUpdate` socket event is not emitted.** Clients listen for it but never receive it. Live score updates mid-round are not pushed; players see scores update when the next `movementStart` arrives with `teamPoints`.
- Minimum lobby size is 5 (one complete group). Maximum is 100.
- DB transactions are used in lobby join/leave and all game state mutations to prevent race conditions.
- The server hardcodes `0.0.0.0:3000` as the bind address. The real IP is detected by the client dynamically.
- JWT is decoded manually (no external library) in screens that need the user ID: `token.split('.')[1]` → base64 decode → `payload.sub`.
- **Socket rooms:** `lobby:{lobbyId}` for lobby-wide events; `lobby:{groupId}` for group-specific events (Movement A turns). `MovementAScreen` joins BOTH rooms — the group room for `turnStart`/`deliberationStart`, and the lobby room to detect GM `gmAdvance` via `movementStart`.
- **Turn state is in-memory** — `groupTurnState` Map in `gameService.js` stores Movement A turn order. Lost on server restart, which would break an in-progress Movement A.
- **Group assignment** — always exactly 1 Skotia + 4 Phos per group of 5; reshuffled each round.
- **Prompt seeding** — 10 biblical prompt pairs inserted on first startup (if `prompts` table is empty).
- **Legacy sabotage system** — still in the codebase (`lobbySocket.js`, `lobbyRoutes.js`). Not part of the Phos/Skotia game. Safe to ignore.

## What Still Needs to Be Built

| Feature | Where | Notes |
|---------|-------|-------|
| Movement B task assignment | `server/websocket/lobbySocket.js` or `gameRoutes.js` | Server should emit `taskAssigned` per socket when B starts; tasks exist in `server/data/tasks.js` |
| `gameStateUpdate` emissions | `server/routes/gameRoutes.js` → `_emitAdvanceEvents` | Emit to lobby room after each `advanceMovement` with `{ teamPoints, currentRound, totalRounds }` so RoundHub and GmDashboard update live |
| Win condition: supermajority | `server/services/gameService.js` | 80%+ of Skotia correctly marked → Phos instant win; the check exists in `advanceMovement` but verify it works end-to-end |
| Round summary display | `client/screens/game/RoundSummaryScreen.js` | Receives `summary` prop from `roundSummary` socket payload; verify display logic matches `{ marksApplied, unmarksApplied, phosPointsEarned, skotiaPointsEarned }` |
| isMarked live push | Server | Players don't know their mark status changed until next round; emit `gameStateUpdate` or a dedicated `markStatusChanged` event |
