# Apokrupto - Client

React Native (Expo 54) mobile client for the Apokrupto social-deduction party game. Supports iOS, Android, and Web.

## Features

- **Dark cyberpunk UI** with custom fonts (Orbitron, Exo 2, Rajdhani) and animated particle backgrounds
- **Authentication** — Login, registration, JWT stored via `expo-secure-store`
- **Lobby System** — Browse, search, create, join lobbies with real-time Socket.IO updates + 10s REST polling
- **Full Game Flow** — Countdown → Role Reveal → Round Hub → Movement A/B/C → Round Summary → Game Over
- **Movement A** — Turn-based word submission with real-time turn indicators, word reveals, deliberation phase
- **Movement B** — 10 task mechanics (trivia, scripture memory, cipher, skill games) with team point scoring
- **Movement C** — Vote on group members as Phos/Skotia, see mark results
- **GM Dashboard** — Web-based GM controls (redirects to server `/gm.html`)
- **Dev Menu** — Debug tool for navigating to any screen with mock data (DEV builds only)
- **Auto-reconnect** — 10s sync polling recovers state if socket disconnects mid-game

## Screens

| Screen | File | Description |
|--------|------|-------------|
| Welcome | `screens/welcome/WelcomeScreen.js` | Landing with login/register buttons |
| Login | `screens/auth/LoginScreen.js` | Username + password login |
| Register | `screens/auth/RegistrationScreen.js` | New account registration |
| Lobby List | `screens/lobby/LobbyListScreen.js` | Browse/search/create/join lobbies |
| Lobby | `screens/lobby/LobbyScreen.js` | Lobby waiting room with player list |
| Countdown | `screens/game/CountdownScreen.js` | 5s countdown before role reveal |
| Role Reveal | `screens/game/RoleRevealScreen.js` | Phos/Skotia assignment reveal |
| Round Hub | `screens/game/RoundHubScreen.js` | Between-movement hub, movement navigation |
| Movement A | `screens/game/MovementAScreen.js` | Social deduction: prompts + word submission |
| Movement B | `screens/game/MovementBScreen.js` | Task selector + task execution |
| Voting (C) | `screens/game/VotingScreen.js` | Vote on group members |
| Round Summary | `screens/game/RoundSummaryScreen.js` | End-of-round scoring summary |
| GM Dashboard | `screens/game/GmDashboardScreen.js` | Full GM dashboard (in-app) |
| GM Waiting | `screens/game/GmWaitingScreen.js` | Shows URL for web-based GM dashboard |
| Game Over | `screens/game/GameOverScreen.js` | Final results + Skotia reveal |
| Task | `screens/tasks/TaskScreen.js` | Task runner wrapper |
| Dev Menu | `screens/dev/DevMenuScreen.js` | Debug navigation to any screen |

### Task Mechanics (14 types)
`screens/tasks/mechanics/`: BailWaterTask, BuildTask, CollectTask, DragPlaceTask, FocusTask, GuardTask, HoldTask, MarchJerichoTask, PatienceTask, RapidTapTask, ScriptureBlankTask, SlingTask, TraceTask, TriviaTask

## Prerequisites

- **Node.js v20+** (recommended)
- npm
- Expo Go app on mobile device, or emulator (Android Studio / Xcode)

## Installation

```bash
cd client
npm install
```

## Running

```bash
npm start               # Metro bundler (Expo) — scan QR with Expo Go
npm run android         # Build and run on Android emulator
npm run ios             # Build and run on iOS simulator (macOS only)
npm run web             # Web version
npm run tunnel          # Expo with tunnel (for remote devices)
```

**Production builds** (point at deployed server):
```bash
npm run start:prod      # Metro with production API URL
npm run android:prod    # Android with production API URL
npm run ios:prod        # iOS with production API URL
```

## Project Structure

```
client/
├── App.js                        # Root component — navigation state machine
├── config.js                     # Dynamic API URL detection
├── app.json                      # Expo configuration
├── components/
│   ├── AnimatedBackground.js     # Reusable particle animation
│   └── LobbyCard.js             # Lobby list item card
├── data/
│   └── tasks.js                  # Task definitions (CHALLENGES category only)
├── screens/
│   ├── auth/                     # LoginScreen, RegistrationScreen
│   ├── dev/                      # DevMenuScreen
│   ├── game/                     # All game screens (Countdown through GameOver)
│   ├── lobby/                    # LobbyListScreen, LobbyScreen
│   ├── tasks/
│   │   ├── TaskScreen.js         # Task runner
│   │   └── mechanics/            # 10 task type implementations
│   └── welcome/                  # WelcomeScreen
├── theme/
│   ├── colors.js                 # Color palette (cyberpunk dark theme)
│   ├── typography.js             # Font styles and text presets
│   ├── fontSetup.js              # Font loading utilities
│   ├── COLOR_GUIDE.md            # Color usage guide
│   └── FONT_GUIDE.md            # Typography guide
└── utils/
    ├── api.js                    # REST API client (all endpoints)
    ├── networkUtils.js           # Dynamic server IP detection
    └── scriptureUtils.js         # Scripture verse utilities
```

## Navigation

There is **no React Navigation library**. `App.js` manages a `currentScreen` string state and renders the matching screen component via a `switch` block. To add a screen, add a case in `renderScreen()` in `App.js`.

**Screen flow:**
```
welcome → login / register → lobbyList → lobby
  → countdown → roleReveal → roundHub
    → movementA → movementB → movementC
  → roundSummary → (next round) → gameOver

GM: lobby → gmDashboard / gmWaiting
```

## Configuration

### API URL
The client auto-detects the server IP at runtime via `utils/networkUtils.js`. No hardcoded addresses needed. For production, set `EXPO_PUBLIC_API_URL` environment variable (the `:prod` npm scripts do this automatically).

### Theme
- **Phos color:** `colors.primary.electricBlue` (#00D4FF)
- **Skotia color:** `colors.primary.neonRed` (#FF3366)
- **Background:** `colors.background.space` (dark)
- Role reveal uses `colors.accent.ultraviolet` for both teams (prevents onlookers from reading roles)
- See [theme/COLOR_GUIDE.md](theme/COLOR_GUIDE.md) and [theme/FONT_GUIDE.md](theme/FONT_GUIDE.md)

## Key Implementation Notes

- **JWT decoded client-side** — `token.split('.')[1]` → base64 decode → `payload.sub` for user ID
- **Socket.IO** — Client connects to server Socket.IO for real-time updates. Lobby screens use socket + 10s REST polling fallback. Game screens are socket-driven.
- **State sync** — A 10s polling loop in `App.js` fetches `/api/lobbies/current` and `/api/games/:id/state` to recover from disconnects and keep the client on the correct screen.
- **Socket rooms** — `lobby:{lobbyId}` for lobby-wide events; `lobby:{groupId}` for group-specific events. `MovementAScreen` joins both rooms.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Node.js version errors | Use Node 20+ (`nvm install 20 && nvm use 20`) |
| Expo Go SDK mismatch | Run `npx expo upgrade` or install matching Expo Go |
| Peer dependency conflicts | `npm install --legacy-peer-deps` |
| Can't connect to backend | Check server is running; API URL auto-detected. For Android emulator use `http://10.0.2.2:3000` |
| Metro cache errors | `npx expo start -c` (clears cache) |
