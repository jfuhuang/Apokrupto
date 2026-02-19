# AI Agent Handoff - Lobby System

## What Was Done

This implementation added a complete lobby management system to Apokrupto, allowing users to create, browse, and join game lobbies.

## Key Files and Their Purpose

### Backend
- `server/middleware/auth.js` - JWT authentication middleware (required for all lobby routes)
- `server/routes/lobbyRoutes.js` - All lobby API endpoints (create, list, join, leave)
- `server/dbInit.js` - Database schema including lobbies and lobby_players tables
- `server/app.js` - Registers lobby routes at `/api/lobbies`

### Frontend
- `client/screens/LobbyListScreen.js` - Main lobby browsing screen with search, create, join
- `client/screens/LobbyScreen.js` - Individual lobby view when user joins
- `client/components/LobbyCard.js` - Reusable lobby card component
- `client/App.js` - Navigation logic updated for lobby flow

### Documentation
- `server/README.md` - Server setup, API docs, database schema
- `client/README.md` - Client features and backend integration
- `LOBBY_IMPLEMENTATION.md` - Detailed implementation summary
- `SECURITY_SUMMARY.md` - Security measures and limitations
- `TESTING_GUIDE.md` - How to test the implementation
- `README.md` - Updated with features and API endpoints

## How It Works

### User Flow
1. User logs in → redirected to LobbyListScreen
2. LobbyListScreen fetches lobbies every 10 seconds (auto-refresh)
3. User can:
   - Browse lobbies (with search)
   - Create new lobby (modal dialog)
   - Join by clicking card
   - Join by ID (modal dialog)
4. On join → navigate to LobbyScreen
5. LobbyScreen shows lobby details
6. User can leave → back to LobbyListScreen

### Authentication
- All lobby endpoints require JWT token in Authorization header
- Format: `Authorization: Bearer <token>`
- Token stored securely on client using expo-secure-store
- Automatic logout if token invalid/expired

### Auto-Refresh
- Lobbies refresh every 10 seconds in background
- Pauses when app goes to background (saves battery)
- Resumes when app returns to foreground
- Manual refresh via pull-to-refresh gesture

## API Endpoints

All require `Authorization: Bearer <token>` header:

- `GET /api/lobbies` - List all active lobbies
- `GET /api/lobbies/:id` - Get lobby details
- `POST /api/lobbies` - Create lobby (body: name, max_players)
- `POST /api/lobbies/:id/join` - Join lobby
- `POST /api/lobbies/:id/leave` - Leave lobby

## Database Schema

### lobbies
- id, name, max_players (4-15), created_by, status, created_at

### lobby_players
- id, lobby_id, user_id, joined_at
- Unique constraint on (lobby_id, user_id)

## Important Notes for Next Developer

### Security
- JWT_SECRET **must** be set in .env (server won't start without it)
- No rate limiting implemented (should be added for production)
- All queries use parameterized statements (SQL injection safe)
- Database transactions prevent race conditions on leave

### Performance
- Auto-refresh pauses in background (AppState listener)
- FlatList used for efficient rendering
- Background refreshes don't block UI

### State Management
- Navigation via component state (not React Navigation)
- Token stored in App.js and passed as prop
- Current lobby ID tracked in App.js state

### Known Limitations
1. No real-time updates (uses polling, not WebSocket)
2. No lobby chat
3. No host controls (kick, change settings)
4. No private lobbies
5. No player roster view in lobby
6. No rate limiting

## How to Continue Development

### Add Real-Time Updates (Socket.IO)
1. Install socket.io in server, socket.io-client in client
2. Emit events on lobby changes (player join/leave, lobby create/delete)
3. Listen to events in LobbyListScreen and LobbyScreen
4. Remove auto-refresh polling

### Add Lobby Chat
1. Create messages table (lobby_id, user_id, message, timestamp)
2. Add POST /api/lobbies/:id/messages endpoint
3. Add GET /api/lobbies/:id/messages endpoint
4. Create ChatComponent in LobbyScreen
5. Use Socket.IO for real-time message delivery

### Add Host Controls
1. Add host_controls field to lobbies table
2. Add endpoint to kick player: POST /api/lobbies/:id/kick
3. Add endpoint to update settings: PATCH /api/lobbies/:id
4. Add UI in LobbyScreen for host actions
5. Check if current user is host before showing controls

### Add Rate Limiting
1. Install express-rate-limit: `npm install express-rate-limit`
2. Create middleware in server/middleware/rateLimiter.js
3. Apply to all routes in app.js
4. Adjust limits per endpoint (stricter for login/register)

### Add Game Start Flow
1. Add game_state to lobbies table
2. Add start_game endpoint (host only)
3. Assign roles (crewmate/impostor) randomly
4. Transition to GameScreen
5. Create GameScreen component

## Testing

See `TESTING_GUIDE.md` for comprehensive testing instructions.

Quick smoke test:
1. Start server with PostgreSQL
2. Register/login on client
3. Create lobby
4. Join lobby
5. Leave lobby
6. Verify auto-refresh works

## Environment Setup

### Server
```bash
cd server
cp .env.example .env
# Edit .env with your settings
npm install
npm start
```

### Client
```bash
cd client
npm install
# Edit config.js with correct API_URL
npx expo start
```

## Code Style

- Dark theme (#1a1a1a background, #00aaff primary, #ff0000 danger)
- Consistent spacing (16px, 20px, 30px)
- Modal dialogs for simple forms
- Loading states for async operations
- Pull-to-refresh for lists
- SafeAreaView for all screens

## Dependencies

No new dependencies required beyond what's already in package.json.

Optional enhancements would need:
- express-rate-limit (rate limiting)
- socket.io (real-time updates)
- react-navigation (better routing)

## Common Issues

1. **"JWT_SECRET not set"** - Create .env file with JWT_SECRET
2. **Can't connect to DB** - Check PostgreSQL running and .env settings
3. **Auto-refresh not working** - Check API_URL in client/config.js
4. **Empty lobby list** - Create some lobbies first
5. **Token expired** - Re-login (tokens last 7 days)

## Next Steps Recommendations

Priority order:
1. Add rate limiting (security)
2. Implement Socket.IO (UX improvement)
3. Add lobby chat (engagement)
4. Add game start flow (core feature)
5. Add host controls (UX improvement)
6. Add player roster (information)
7. Add React Navigation (code quality)

## Resources

- Express docs: https://expressjs.com/
- React Native docs: https://reactnative.dev/
- Expo docs: https://docs.expo.dev/
- PostgreSQL docs: https://www.postgresql.org/docs/
- JWT docs: https://jwt.io/

## Questions?

Check these files:
- Implementation details → LOBBY_IMPLEMENTATION.md
- Security info → SECURITY_SUMMARY.md
- Testing → TESTING_GUIDE.md
- Server setup → server/README.md
- Client setup → client/README.md
