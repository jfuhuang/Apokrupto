# Apokrupto — Web Client

A standalone React + Vite web client for the Apokrupto social deduction game. Connects to the same backend server as the React Native mobile app.

## Quick Start

```bash
# From the web-client/ directory
npm install
npm run dev        # Dev server at http://localhost:5173 (proxies API/socket to port 3000)
npm run build      # Production build → dist/
npm run preview    # Preview the production build locally
```

## Setup

1. Make sure the backend server is running on port 3000 (see `server/README.md`)
2. Install deps: `npm install`
3. Start the dev server: `npm run dev`
4. Open http://localhost:5173 in any browser

No environment variables needed in development — the Vite dev proxy forwards
`/api` and `/socket.io` requests to `http://localhost:3000` automatically.

## Production Deployment

Build the static files and serve the `dist/` folder from the same origin as the
backend server (so `/api` calls and Socket.IO work without CORS issues):

```bash
npm run build
# Then serve dist/ via Express (add app.use(express.static('web-client/dist')) in server/app.js)
# Or deploy to any static host and point API_BASE at the server URL
```

## Screens

| Screen | Path | Notes |
|--------|------|-------|
| Welcome | `/` | Landing page with Login / Create Account |
| Login | Login screen | Username + password |
| Register | Register screen | New account creation |
| Lobby List | Lobby list | Browse, create, join lobbies |
| Lobby | Lobby room | Player list, Start Game (host) |
| Countdown | Countdown | 5-second pre-game countdown |
| Role Reveal | Role reveal | ΦΩΣ or ΣΚΟΤΊΑ assignment |
| Round Hub | Round hub | Between-movement hub, group info, scores |
| Movement A | Movement A | Social deduction word game |
| Movement B | Movement B | Challenges / task stage |
| Voting | Movement C | Vote on who is ΣΚΟΤΊΑ |
| Round Summary | Round summary | Per-round results |
| Game Over | Game over | Final scores + Skotia reveal |
| GM Dashboard | GM dashboard | Advance game, broadcast messages |

## Task Types (Movement B)

| Type | Description |
|------|-------------|
| `rapid_tap` | Tap the button N times as fast as possible |
| `hold` | Hold the button down for a set duration |
| `trivia` | Multiple-choice question |
| `scripture_blank` | Fill-in-the-blank Bible verse |

## Tech Stack

- **React 18** — UI framework
- **Vite 5** — Build tool + dev server with proxy
- **Socket.IO client** — Real-time game events
- **localStorage** — JWT token storage (replaces expo-secure-store)
- **Orbitron / Exo 2 / Rajdhani** — Google Fonts (same as mobile app)
- No CSS framework — inline styles matching the cyberpunk dark theme

## Architecture Notes

- `src/App.jsx` — Top-level state machine (mirrors the React Native `App.js`)
- `src/utils/api.js` — All REST API helpers
- `src/utils/storage.js` — localStorage JWT wrapper
- `src/theme.js` — Color palette (matches `client/theme/colors.js`)
- Socket is created once on login and passed down to screens as a prop
- Safety-net polling (`/api/games/:id/state` every 3 s) on all active game screens
- JWT decoded client-side: `JSON.parse(atob(token.split('.')[1]))` → `.sub` = userId
