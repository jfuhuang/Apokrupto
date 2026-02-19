# Testing Guide - Lobby List Implementation

This guide helps verify that the lobby list implementation is working correctly.

## Prerequisites

1. Server is running with PostgreSQL database
2. Client app is running on emulator/device
3. You have at least one registered user account

## Backend Testing (API)

### Setup Test User

```bash
# Register a test user
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test1234"
  }'

# Save the token from the response
TOKEN="<paste-token-here>"
```

### Test Lobby Creation

```bash
# Create a lobby
curl -X POST http://localhost:3000/api/lobbies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Lobby",
    "max_players": 10
  }'

# Should return lobby object with id, name, etc.
```

### Test Lobby List

```bash
# Get all lobbies
curl http://localhost:3000/api/lobbies \
  -H "Authorization: Bearer $TOKEN"

# Should return array of lobbies with player counts
```

### Test Join Lobby

```bash
# Join lobby (replace 1 with actual lobby ID)
curl -X POST http://localhost:3000/api/lobbies/1/join \
  -H "Authorization: Bearer $TOKEN"

# Should return success message
```

### Test Get Lobby Details

```bash
# Get specific lobby
curl http://localhost:3000/api/lobbies/1 \
  -H "Authorization: Bearer $TOKEN"

# Should return lobby details with updated player count
```

### Test Leave Lobby

```bash
# Leave lobby
curl -X POST http://localhost:3000/api/lobbies/1/leave \
  -H "Authorization: Bearer $TOKEN"

# Should return success message
```

### Test Authentication Errors

```bash
# Try without token (should fail with 401)
curl http://localhost:3000/api/lobbies

# Try with invalid token (should fail with 403)
curl http://localhost:3000/api/lobbies \
  -H "Authorization: Bearer invalid-token"
```

### Test Validation Errors

```bash
# Try to create lobby with too many players (should fail)
curl -X POST http://localhost:3000/api/lobbies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Bad Lobby",
    "max_players": 20
  }'

# Try to create lobby without name (should fail)
curl -X POST http://localhost:3000/api/lobbies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "max_players": 10
  }'
```

## Frontend Testing (Mobile App)

### Test User Flow

1. **Login/Register**
   - [ ] Open app
   - [ ] Click "CREATE ACCOUNT" or "LOGIN"
   - [ ] Enter credentials
   - [ ] Verify redirect to lobby list

2. **Lobby List Screen**
   - [ ] Verify lobbies are displayed (or empty state)
   - [ ] Check auto-refresh indicator at bottom
   - [ ] Wait 10 seconds, verify list updates automatically

3. **Search Functionality**
   - [ ] Type in search box
   - [ ] Verify lobbies filter as you type
   - [ ] Test search by lobby name
   - [ ] Test search by host username
   - [ ] Test search by lobby ID
   - [ ] Clear search, verify all lobbies return

4. **Create Lobby**
   - [ ] Click "+ Create Lobby"
   - [ ] Enter lobby name
   - [ ] Set max players (try different values)
   - [ ] Click "Create"
   - [ ] Verify redirect to lobby screen
   - [ ] Verify you're in the lobby

5. **Join Lobby by Card**
   - [ ] Return to lobby list
   - [ ] Click on an open lobby card
   - [ ] Verify redirect to lobby screen
   - [ ] Verify lobby details are correct

6. **Join Lobby by ID**
   - [ ] Return to lobby list
   - [ ] Click "Join by ID"
   - [ ] Enter a valid lobby ID
   - [ ] Click "Join"
   - [ ] Verify redirect to lobby screen

7. **Lobby Screen**
   - [ ] Verify lobby name is displayed
   - [ ] Verify host username is shown
   - [ ] Verify player count is correct
   - [ ] Verify lobby ID is shown
   - [ ] Click "Leave Lobby"
   - [ ] Verify return to lobby list

8. **Pull to Refresh**
   - [ ] On lobby list, pull down
   - [ ] Verify loading indicator appears
   - [ ] Verify list updates

9. **Logout**
   - [ ] Click "Logout" button
   - [ ] Verify redirect to welcome screen
   - [ ] Verify token is cleared

10. **Token Persistence**
    - [ ] Close app completely
    - [ ] Reopen app
    - [ ] Verify automatic login to lobby list

### Test Edge Cases

1. **Full Lobby**
   - [ ] Create lobby with max_players: 4
   - [ ] Join with 4 different accounts
   - [ ] Verify lobby shows "FULL" badge
   - [ ] Verify card is disabled/grayed out
   - [ ] Try to click full lobby
   - [ ] Verify can't join

2. **Empty State**
   - [ ] Leave all lobbies
   - [ ] Verify "No active lobbies" message
   - [ ] Verify suggestion to create lobby

3. **Network Errors**
   - [ ] Stop server
   - [ ] Try to refresh lobbies
   - [ ] Verify error message
   - [ ] Restart server
   - [ ] Verify reconnection works

4. **Invalid Input**
   - [ ] Try to create lobby with empty name
   - [ ] Try to create lobby with 0 max players
   - [ ] Try to create lobby with 100 max players
   - [ ] Verify validation errors

5. **Session Expiration**
   - [ ] Wait 7 days (or modify JWT expiry to 1 minute for testing)
   - [ ] Try to refresh lobbies
   - [ ] Verify automatic logout
   - [ ] Verify redirect to welcome screen

### Test App State Management

1. **Background/Foreground**
   - [ ] Open app on lobby list
   - [ ] Note the current lobbies
   - [ ] Send app to background (home button)
   - [ ] Wait 15 seconds
   - [ ] Bring app back to foreground
   - [ ] Verify lobbies refresh immediately

2. **Rapid Navigation**
   - [ ] Navigate between screens quickly
   - [ ] Verify no crashes
   - [ ] Verify state is maintained

## Performance Testing

1. **Many Lobbies**
   - [ ] Create 20+ lobbies (use API)
   - [ ] Open lobby list
   - [ ] Verify smooth scrolling
   - [ ] Verify search is responsive

2. **Auto-Refresh Load**
   - [ ] Leave app open for 5 minutes
   - [ ] Verify auto-refresh continues
   - [ ] Verify no memory leaks
   - [ ] Verify UI remains responsive

## Expected Behaviors

### Lobby List Screen
- Shows loading indicator on first load
- Displays lobbies in cards with blue borders
- Full lobbies have gray borders and are disabled
- Search filters immediately
- Auto-refreshes every 10 seconds (shows indicator)
- Pull-to-refresh works anytime
- Empty state shows helpful message

### Lobby Screen
- Shows lobby details (name, host, player count, ID)
- Leave button returns to list
- Displays current player count
- Shows green status for "waiting" lobbies

### Navigation
- Login → Lobby List
- Lobby List → Lobby Screen (on join)
- Lobby Screen → Lobby List (on leave)
- Any screen → Welcome (on logout)

### Error Handling
- Invalid token → Auto logout → Welcome screen
- Network error → Error alert, stay on screen
- Full lobby → Error alert, stay on list
- Invalid input → Field-specific error messages

## Success Criteria

All tests should pass with:
- ✅ No crashes or freezes
- ✅ All features work as described
- ✅ Error messages are clear and helpful
- ✅ UI is responsive and smooth
- ✅ Data stays consistent across screens
- ✅ Auto-refresh doesn't interrupt user
- ✅ Token persistence works correctly

## Troubleshooting

### Backend not starting
- Check PostgreSQL is running
- Verify .env file exists with correct values
- Check JWT_SECRET is set (required)
- Check for port conflicts on 3000

### Frontend not connecting
- Verify API_URL in client/config.js
- For Android emulator: Use 10.0.2.2
- For iOS simulator: Use localhost
- For physical device: Use computer's local IP

### Database errors
- Run `npm start` to auto-create tables
- Check PostgreSQL connection settings
- Verify database exists

### Token errors
- JWT_SECRET must match between requests
- Tokens expire after 7 days
- Re-login if token expired

## Automated Testing (Future)

For automated testing, consider:
- Jest for unit tests
- Supertest for API integration tests
- Detox for E2E mobile app tests
- Postman collection for API testing

## Reporting Issues

When reporting issues, include:
1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Screenshots/error messages
5. Platform (iOS/Android/Web)
6. Node version, Expo version
