# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Apokrupto is a location-based mobile game ("Among Us IRL") where GPS dictates gameplay. Players are assigned Crewmate or Impostor roles and must complete physical real-world tasks or eliminate opponents using proximity mechanics.

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
- **Real-time:** Socket.IO is installed on both client and server but **not yet active** — the lobby list currently polls every 10 seconds

### Navigation (client)
There is **no React Navigation library**. `client/App.js` manages a `currentScreen` string state and renders the appropriate screen component directly. To add a screen, add it to the `switch` block in `App.js`.

Screen flow: `welcome` → `login` / `register` → `lobbyList` → `lobby`

### Authentication flow
All lobby API calls require `Authorization: Bearer <token>`. The token is stored with key `jwtToken` in `expo-secure-store`. `server/middleware/auth.js` validates tokens on every protected route.

### Database schema (auto-created by `server/dbInit.js`)
```
users           (id, username, password_hash, created_at)
user_providers  (id, user_id, provider, provider_id, provider_profile, ...)
lobbies         (id, name, max_players, created_by, status, created_at)
lobby_players   (id, lobby_id, user_id, joined_at)
```
`lobbies.status` is one of `'waiting'`, `'in_progress'`, `'completed'`.

### API endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/users/register` | No | Create account |
| POST | `/api/users/login` | No | Returns JWT |
| GET | `/api/lobbies` | Yes | List active lobbies |
| GET | `/api/lobbies/:id` | Yes | Lobby details |
| POST | `/api/lobbies` | Yes | Create lobby (4–15 players) |
| POST | `/api/lobbies/:id/join` | Yes | Join lobby |
| POST | `/api/lobbies/:id/leave` | Yes | Leave lobby |

### UI conventions
- Dark cyberpunk theme; color palette in `client/theme/colors.js`, typography in `client/theme/typography.js`
- Custom fonts: Orbitron (headings), Exo 2 (body), Rajdhani (accents) — loaded in `App.js` before any screen renders
- `client/components/AnimatedBackground.js` is a reusable particle animation used across screens
- `client/components/LobbyCard.js` is the reusable lobby list item

## Key Implementation Notes

- **No testing framework is configured.** Testing is manual (see `TESTING_GUIDE.md` for curl examples).
- **Socket.IO is not wired up yet.** The next major feature is replacing the 10-second polling in `LobbyListScreen.js` with real-time WebSocket events.
- DB transactions are used in lobby join/leave to prevent race conditions.
- The server hardcodes `0.0.0.0:3000` as the bind address. The IP logged in the console is a static example — the real IP is detected by the client dynamically.
