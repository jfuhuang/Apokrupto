# AI Agent Handoff

> For the canonical AI agent reference, see `CLAUDE.md`. This document provides a condensed handoff summary.

## Project Summary

Apokrupto is a social-deduction party game for Campus Ministry events (up to 80 players). Two teams — **Phos** (light, majority 4:1) and **Skotia** (darkness, minority) — compete over 3–4 rounds. Each round has three movements: social deduction (A), tasks (B), and voting (C).

## Current State (February 2026)

**Core game is fully playable.** Auth, lobbies, Socket.IO real-time, the complete game state machine, all three movements, GM dashboard, and round/game-over flow are implemented and wired end-to-end.

## Key Files

### Server
| File | Purpose |
|------|---------|
| `server/app.js` | Express + HTTP + Socket.IO bootstrapping |
| `server/dbInit.js` | Auto-schema creation (all tables) + biblical prompt seeding |
| `server/services/gameService.js` | Core game state machine (~1400 lines): team assignment, group shuffling, turn management, scoring, mark resolution, win conditions |
| `server/routes/gameRoutes.js` | Game REST endpoints: create, start, advance, state, prompts, submissions, votes, broadcast |
| `server/routes/lobbyRoutes.js` | Lobby CRUD, kick, add-dummy, force-end |
| `server/websocket/lobbySocket.js` | Socket.IO handlers: joinRoom, startGame, gmAdvance, lobby state broadcasting |
| `server/middleware/auth.js` | JWT auth (REST) |
| `server/middleware/socketAuth.js` | JWT auth (Socket.IO handshake) |
| `server/data/tasks.js` | Task definitions for Movement B |
| `server/public/gm.html` | Web-based GM dashboard |

### Client
| File | Purpose |
|------|---------|
| `client/App.js` | Root component — navigation state machine (666 lines), 10s sync polling, all screen routing |
| `client/utils/api.js` | REST API client for all endpoints |
| `client/utils/networkUtils.js` | Dynamic server IP detection |
| `client/config.js` | API URL management |
| `client/screens/game/MovementAScreen.js` | Social deduction: prompts, turn-based word submission, deliberation |
| `client/screens/game/MovementBScreen.js` | Task selector + task runner with team point scoring |
| `client/screens/game/VotingScreen.js` | Movement C voting UI |
| `client/screens/game/RoundHubScreen.js` | Between-movement hub, socket event routing |
| `client/screens/game/RoundSummaryScreen.js` | End-of-round scoring display |
| `client/screens/game/GmDashboardScreen.js` | In-app GM dashboard |
| `client/screens/game/GameOverScreen.js` | Final results, Skotia reveal |
| `client/screens/lobby/LobbyScreen.js` | Lobby waiting room with player list |
| `client/screens/lobby/LobbyListScreen.js` | Browse/search/create/join lobbies |
| `client/theme/colors.js` | Color palette |
| `client/theme/typography.js` | Font styles |

## Architecture Essentials

- **No React Navigation** — `App.js` uses `currentScreen` state with a switch block
- **Socket rooms** — `lobby:{lobbyId}` for lobby-wide; `lobby:{groupId}` for group-specific (Movement A)
- **Turn state is in-memory** — `groupTurnState` Map in `gameService.js`. Lost on server restart.
- **10s sync polling** — `App.js` polls `/api/lobbies/current` and `/api/games/:id/state` as safety net
- **JWT decoded client-side** — `token.split('.')[1]` → base64 → `payload.sub`
- **DB auto-init** — All tables created on startup. 10 biblical prompts seeded if empty.

## What Still Needs Work

| Feature | Where | Notes |
|---------|-------|-------|
| `gameStateUpdate` socket emission | Server | Emit `{ teamPoints, currentRound, totalRounds }` after each state change so clients update live |
| `taskAssigned` socket event | Server | Emit per-socket when Movement B starts with assigned tasks |
| Supermajority win condition | Server | Code exists but needs end-to-end verification |
| Mark badge visibility | Client | Marks should be visible across all screens (currently only in group context) |
| Live mark status push | Server | Players don't learn they were marked until next round |
| Rate limiting | Server | Add `express-rate-limit` for production |

## Quick Start

```bash
# Server
cd server && npm install && cp .env.example .env && npm run dev

# Client
cd client && npm install && npm start
```

## Testing

No automated test framework. Testing is manual:
1. Start server with PostgreSQL
2. Register 5+ accounts (or use admin add-dummy)
3. Create lobby, all join
4. Host starts game
5. Play through Movement A → B → C → Round Summary
6. GM advances via dashboard (`/gm.html`) or in-app

## Documentation Map

| File | Content |
|------|---------|
| `CLAUDE.md` | Comprehensive AI agent context (architecture, DB schema, API, sockets, game flow) |
| `GAME_DESIGN.md` | Full game design document |
| `IMPLEMENTATION_PLAN.md` | Build phases with completion status |
| `SECURITY_SUMMARY.md` | Security measures and limitations |
| `LOBBY_IMPLEMENTATION.md` | Historical: original lobby system implementation details |
| `server/README.md` | Server setup, full API docs, schema reference |
| `client/README.md` | Client setup, screen inventory, theme guide |
