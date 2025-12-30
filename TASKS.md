# AI Agent Task List - Among Us IRL

This document provides a structured breakdown of development tasks for AI agents to accomplish. Each feature is broken down into actionable sub-tasks with clear acceptance criteria.

## Task Categories

### 1. Core Server Architecture with Socket.IO

**Priority:** High  
**Dependencies:** None  
**Component:** Server

#### Sub-tasks:

1.1. **Set up Express server structure**
   - Create main server entry point (`server/index.js`)
   - Configure Express middleware (body-parser, cors)
   - Set up basic error handling
   - **Acceptance Criteria:** Server starts on port 3000 and responds to health check endpoint

1.2. **Integrate Socket.IO with Express**
   - Install and configure Socket.IO
   - Set up connection/disconnection event handlers
   - Implement basic room management
   - **Acceptance Criteria:** Clients can connect via Socket.IO and join/leave rooms

1.3. **Implement reconnection logic**
   - Handle client disconnections gracefully
   - Implement session persistence
   - Add reconnection timeout handling
   - **Acceptance Criteria:** Clients can reconnect and resume their session after network interruption

1.4. **Create game state management service**
   - Design game state structure
   - Implement state update methods
   - Add state validation
   - **Acceptance Criteria:** Game state can be created, updated, and retrieved consistently

1.5. **Set up logging and monitoring**
   - Integrate logging library (winston or similar)
   - Add request/response logging
   - Create error logging middleware
   - **Acceptance Criteria:** All server events are logged with appropriate levels

---

### 2. Database Schema Design

**Priority:** High  
**Dependencies:** None  
**Component:** Server

#### Sub-tasks:

2.1. **Set up MongoDB connection**
   - Configure Mongoose connection
   - Set up connection pooling
   - Add connection error handling
   - **Acceptance Criteria:** Server connects to MongoDB successfully on startup

2.2. **Design Player schema**
   - Define player model (username, role, location, status)
   - Add validation rules
   - Create indexes for queries
   - **Acceptance Criteria:** Player documents can be created, updated, and queried

2.3. **Design Game schema**
   - Define game model (gameId, players, status, settings)
   - Add game state fields
   - Create relationships with Player model
   - **Acceptance Criteria:** Game documents can be created with associated players

2.4. **Design Task schema**
   - Define task model (taskId, type, location, requirements)
   - Add task completion tracking
   - Create task assignment logic
   - **Acceptance Criteria:** Tasks can be created and assigned to players

2.5. **Design Location schema**
   - Define location model (coordinates, radius, type)
   - Add geospatial indexes
   - Implement location validation
   - **Acceptance Criteria:** Location-based queries work efficiently

2.6. **Create database migration utilities**
   - Set up seed data scripts
   - Create database initialization script
   - Add data validation utilities
   - **Acceptance Criteria:** Database can be initialized with test data

---

### 3. GPS Location Tracking Implementation

**Priority:** High  
**Dependencies:** None  
**Component:** Client

#### Sub-tasks:

3.1. **Request location permissions**
   - Implement permission request flow
   - Handle permission denial gracefully
   - Add permission status checking
   - **Acceptance Criteria:** App requests and handles location permissions properly

3.2. **Implement continuous location tracking**
   - Set up expo-location with appropriate accuracy
   - Configure background location updates
   - Optimize battery usage
   - **Acceptance Criteria:** App tracks user location continuously while game is active

3.3. **Send location updates to server**
   - Implement Socket.IO location emission
   - Add location update throttling (avoid spam)
   - Handle offline location caching
   - **Acceptance Criteria:** Location updates are sent to server in real-time

3.4. **Implement geofencing for tasks**
   - Detect when player enters task location
   - Trigger task availability notifications
   - Handle geofence exit events
   - **Acceptance Criteria:** Players are notified when entering task zones

3.5. **Add location privacy controls**
   - Implement location visibility rules (by role)
   - Add location fuzzing for impostors
   - Create location history cleanup
   - **Acceptance Criteria:** Player locations respect game rules for visibility

---

### 4. Map Integration with Mapbox

**Priority:** High  
**Dependencies:** GPS Location Tracking Implementation
**Component:** Client

#### Sub-tasks:

4.1. **Set up Mapbox account and API keys**
   - Create Mapbox account
   - Generate access token
   - Configure environment variables
   - **Acceptance Criteria:** Mapbox SDK can authenticate successfully

4.2. **Integrate @rnmapbox/maps**
   - Install and configure @rnmapbox/maps
   - Set up basic map view component
   - Configure map style
   - **Acceptance Criteria:** Map displays in the app with proper styling

4.3. **Display player location on map**
   - Add user location marker
   - Center map on user location
   - Implement location follow mode
   - **Acceptance Criteria:** User's current location is visible on the map

4.4. **Display other players' locations**
   - Add player markers for visible players
   - Update markers in real-time
   - Customize markers by role (if visible)
   - **Acceptance Criteria:** Other players' locations appear on the map according to game rules

4.5. **Display task locations**
   - Add task location markers
   - Show task zones/geofences
   - Indicate task completion status
   - **Acceptance Criteria:** Task locations are visible on the map

4.6. **Implement map interactions**
   - Add zoom and pan controls
   - Implement marker tap interactions
   - Add info windows for locations
   - **Acceptance Criteria:** Users can interact with the map and markers

---

### 5. Task System Implementation

**Priority:** High  
**Dependencies:** Database Schema Design, GPS Location Tracking
**Component:** Server + Client

#### Sub-tasks:

5.1. **Server: Create task generation logic**
   - Implement task distribution algorithm
   - Generate random task assignments
   - Balance task difficulty and locations
   - **Acceptance Criteria:** Tasks are distributed fairly among crewmates

5.2. **Server: Implement task validation**
   - Validate task completion requirements
   - Verify player location for task completion
   - Check time-based constraints
   - **Acceptance Criteria:** Tasks can only be completed when requirements are met

5.3. **Server: Track task progress**
   - Update game state on task completion
   - Broadcast task completion to all players
   - Calculate overall task progress
   - **Acceptance Criteria:** All players see updated task progress in real-time

5.4. **Client: Display task list**
   - Create task list UI component
   - Show assigned tasks with details
   - Indicate task status (pending/available/completed)
   - **Acceptance Criteria:** Players can view their assigned tasks

5.5. **Client: Implement task completion UI**
   - Create task mini-game interfaces
   - Add task progress indicators
   - Implement task success/failure feedback
   - **Acceptance Criteria:** Players can interact with and complete tasks

5.6. **Implement task types**
   - Distance running task
   - Point-to-point navigation task
   - Location-based mini-games
   - **Acceptance Criteria:** Multiple task types are playable

---

### 6. Game Lobby and Matchmaking

**Priority:** Medium  
**Dependencies:** Core Server Architecture
**Component:** Server + Client

#### Sub-tasks:

6.1. **Server: Create lobby management**
   - Implement lobby creation/deletion
   - Handle player joining/leaving
   - Add lobby settings (player count, map area)
   - **Acceptance Criteria:** Players can create and join lobbies

6.2. **Server: Implement role assignment**
   - Create fair randomization algorithm
   - Assign impostor(s) and crewmates
   - Notify players of their roles
   - **Acceptance Criteria:** Roles are assigned randomly and fairly

6.3. **Server: Add game start logic**
   - Validate lobby ready state (minimum players)
   - Initialize game state
   - Distribute initial tasks
   - **Acceptance Criteria:** Games can start when lobby is ready

6.4. **Client: Create lobby UI**
   - Design lobby screen
   - Show player list
   - Add lobby settings controls
   - **Acceptance Criteria:** Host can configure lobby settings

6.5. **Client: Implement ready/start system**
   - Add ready button for players
   - Show ready status for all players
   - Add start game button (host only)
   - **Acceptance Criteria:** All players must ready up before host can start

6.6. **Add lobby chat system**
   - Implement real-time chat via Socket.IO
   - Add chat message validation
   - Display chat messages in UI
   - **Acceptance Criteria:** Players can communicate in lobby

---

### 7. Real-time Game State Synchronization

**Priority:** High  
**Dependencies:** Core Server Architecture, Database Schema Design
**Component:** Server + Client

#### Sub-tasks:

7.1. **Server: Implement state broadcasting**
   - Create efficient state update system
   - Use Socket.IO rooms for targeted broadcasts
   - Implement state diff calculation (only send changes)
   - **Acceptance Criteria:** Game state updates are broadcast efficiently

7.2. **Server: Handle concurrent state updates**
   - Implement optimistic locking
   - Add state conflict resolution
   - Create transaction-like state updates
   - **Acceptance Criteria:** Concurrent updates don't corrupt game state

7.3. **Client: Implement state synchronization**
   - Receive and apply state updates
   - Handle out-of-order updates
   - Implement local state caching
   - **Acceptance Criteria:** Client state stays in sync with server

7.4. **Client: Add optimistic updates**
   - Update UI immediately for local actions
   - Rollback on server rejection
   - Show loading states appropriately
   - **Acceptance Criteria:** UI feels responsive with no lag

7.5. **Implement heartbeat system**
   - Send periodic ping/pong messages
   - Detect disconnected clients
   - Trigger reconnection flow
   - **Acceptance Criteria:** Disconnected clients are detected within 5 seconds

---

### 8. Kill and Sabotage Mechanics

**Priority:** Medium  
**Dependencies:** Real-time Game State Synchronization, GPS Location Tracking
**Component:** Server + Client

#### Sub-tasks:

8.1. **Server: Implement proximity detection**
   - Calculate distance between players using @turf/turf
   - Define kill range threshold
   - Validate line-of-sight (optional advanced feature)
   - **Acceptance Criteria:** Server can detect when players are in kill range

8.2. **Server: Implement kill mechanic**
   - Validate impostor can kill target
   - Apply kill cooldown timer
   - Update victim status to eliminated
   - Broadcast kill event to all players
   - **Acceptance Criteria:** Impostors can kill crewmates when in range

8.3. **Server: Implement sabotage system**
   - Create sabotage types (oxygen, reactor, etc.)
   - Define sabotage target locations
   - Implement sabotage timer and failure conditions
   - **Acceptance Criteria:** Impostors can trigger sabotages

8.4. **Server: Handle sabotage resolution**
   - Detect when players reach sabotage location
   - Validate sabotage fix requirements
   - Cancel sabotage on successful fix
   - Trigger game over on sabotage timeout
   - **Acceptance Criteria:** Crewmates can fix sabotages by reaching location

8.5. **Client: Add kill button for impostors**
   - Show kill button only for impostors
   - Enable button only when target in range
   - Display kill cooldown timer
   - Add kill animation/feedback
   - **Acceptance Criteria:** Impostors have functional kill UI

8.6. **Client: Add sabotage UI for impostors**
   - Create sabotage menu
   - Show available sabotage types
   - Display sabotage cooldown
   - Add sabotage trigger button
   - **Acceptance Criteria:** Impostors can trigger sabotages via UI

8.7. **Client: Display sabotage alerts**
   - Show sabotage notification to all players
   - Display countdown timer
   - Show sabotage location on map
   - Add urgent visual/audio alerts
   - **Acceptance Criteria:** All players are alerted when sabotage occurs

8.8. **Client: Handle player elimination**
   - Update UI for eliminated players (spectator mode)
   - Hide eliminated players from crewmates
   - Show dead bodies to discovering players
   - **Acceptance Criteria:** Eliminated players can spectate but not interact

---

### 9. Emergency Meeting System

**Priority:** Medium  
**Dependencies:** Real-time Game State Synchronization
**Component:** Server + Client

#### Sub-tasks:

9.1. **Server: Implement meeting trigger**
   - Handle emergency button press
   - Handle body report events
   - Validate meeting cooldowns
   - Pause game state during meeting
   - **Acceptance Criteria:** Meetings can be triggered by button or body report

9.2. **Server: Implement voting system**
   - Track votes from all players
   - Calculate vote results (plurality/majority)
   - Handle skip votes
   - Apply ejection on vote completion
   - **Acceptance Criteria:** Voting works correctly and determines outcome

9.3. **Client: Add emergency button**
   - Show emergency button on map/UI
   - Enforce button cooldown
   - Add button press confirmation
   - **Acceptance Criteria:** Players can call emergency meetings

9.4. **Client: Create meeting UI**
   - Design discussion screen
   - Show all alive players
   - Display discussion timer
   - Add voting phase UI
   - **Acceptance Criteria:** Meeting interface is functional and clear

9.5. **Client: Implement in-meeting chat**
   - Enable text chat during discussion
   - Disable chat for dead players
   - Add chat timeout at voting phase
   - **Acceptance Criteria:** Players can discuss during meetings

9.6. **Client: Implement voting UI**
   - Show player list for voting
   - Add skip option
   - Display vote confirmation
   - Show voting results
   - **Acceptance Criteria:** Players can vote to eject or skip

---

### 10. UI/UX Design and Implementation

**Priority:** Medium  
**Dependencies:** All other features (implemented iteratively)
**Component:** Client

#### Sub-tasks:

10.1. **Design app navigation structure**
   - Create navigation flow diagram
   - Implement navigation library (React Navigation)
   - Set up screen structure
   - **Acceptance Criteria:** App has clear navigation between screens

10.2. **Create home/menu screen**
   - Design home screen layout
   - Add "Create Game" and "Join Game" buttons
   - Add settings access
   - Add app branding
   - **Acceptance Criteria:** Home screen is polished and functional

10.3. **Design game HUD**
   - Create in-game overlay
   - Add task progress bar
   - Show player status (role, alive/dead)
   - Add action buttons (kill, sabotage, report, emergency)
   - **Acceptance Criteria:** HUD shows all necessary game information

10.4. **Implement role reveal animation**
   - Create engaging role reveal screen
   - Add suspenseful timing
   - Show role-specific instructions
   - **Acceptance Criteria:** Players see their role dramatically at game start

10.5. **Add visual feedback and animations**
   - Implement task completion animations
   - Add kill animations
   - Create meeting transition effects
   - Add loading states
   - **Acceptance Criteria:** UI feels polished and responsive

10.6. **Create settings screen**
   - Add sound/music controls
   - Add notification preferences
   - Add account management
   - **Acceptance Criteria:** Players can customize their experience

10.7. **Implement accessibility features**
   - Add colorblind mode
   - Implement text scaling
   - Add screen reader support
   - **Acceptance Criteria:** App is accessible to users with disabilities

10.8. **Design and implement onboarding**
   - Create tutorial flow
   - Add tips for first-time players
   - Implement skip option
   - **Acceptance Criteria:** New players understand how to play

---

### 11. Testing and Quality Assurance

**Priority:** Medium  
**Dependencies:** All features
**Component:** Both

#### Sub-tasks:

11.1. **Set up unit testing framework**
   - Configure Jest for both client and server
   - Create test file structure
   - Set up test coverage reporting
   - **Acceptance Criteria:** `npm test` runs unit tests

11.2. **Write server unit tests**
   - Test game state management
   - Test Socket.IO event handlers
   - Test database operations
   - Test geospatial calculations
   - **Acceptance Criteria:** Core server logic has >80% test coverage

11.3. **Write client unit tests**
   - Test React components
   - Test state management
   - Test utility functions
   - **Acceptance Criteria:** Core client logic has >70% test coverage

11.4. **Set up integration testing**
   - Configure integration test environment
   - Test client-server communication
   - Test complete game flows
   - **Acceptance Criteria:** Critical user flows are tested end-to-end

11.5. **Implement E2E testing**
   - Set up Detox or similar framework
   - Create E2E test scenarios
   - Test on multiple devices
   - **Acceptance Criteria:** Major features work in E2E tests

11.6. **Conduct field testing**
   - Test with real GPS movement
   - Test in various network conditions
   - Test with multiple players
   - **Acceptance Criteria:** Game is playable in real-world conditions

---

### 12. Performance Optimization

**Priority:** Low  
**Dependencies:** All features
**Component:** Both

#### Sub-tasks:

12.1. **Optimize Socket.IO communication**
   - Reduce message payload sizes
   - Implement message batching
   - Add compression
   - **Acceptance Criteria:** Network usage is minimized

12.2. **Optimize database queries**
   - Add appropriate indexes
   - Implement query result caching
   - Optimize frequently-used queries
   - **Acceptance Criteria:** Database response times are <100ms

12.3. **Optimize mobile app performance**
   - Reduce bundle size
   - Implement code splitting
   - Optimize re-renders
   - **Acceptance Criteria:** App launches in <3 seconds

12.4. **Optimize battery usage**
   - Reduce location update frequency when possible
   - Implement intelligent background task scheduling
   - Optimize Socket.IO reconnection logic
   - **Acceptance Criteria:** Battery drain is acceptable for 2+ hour gameplay

---

### 13. Security and Privacy

**Priority:** High  
**Dependencies:** All features
**Component:** Both

#### Sub-tasks:

13.1. **Implement authentication system**
   - Add user registration/login
   - Implement JWT or similar
   - Add session management
   - **Acceptance Criteria:** Users must authenticate to play

13.2. **Secure Socket.IO connections**
   - Implement connection authentication
   - Validate all incoming messages
   - Add rate limiting
   - **Acceptance Criteria:** Socket.IO is protected from abuse

13.3. **Implement data validation**
   - Validate all user inputs
   - Sanitize data before database operations
   - Add schema validation
   - **Acceptance Criteria:** Server rejects invalid data

13.4. **Protect sensitive data**
   - Encrypt location data in transit
   - Hash passwords properly
   - Implement data retention policies
   - **Acceptance Criteria:** User data is protected

13.5. **Add anti-cheat measures**
   - Validate player movements server-side
   - Detect impossible actions
   - Implement reporting system
   - **Acceptance Criteria:** Basic cheat prevention is in place

---

### 14. Deployment and DevOps

**Priority:** Low  
**Dependencies:** All features
**Component:** Both

#### Sub-tasks:

14.1. **Set up CI/CD pipeline**
   - Configure GitHub Actions
   - Add automated testing
   - Set up build automation
   - **Acceptance Criteria:** Code is automatically tested on push

14.2. **Configure production server**
   - Set up cloud hosting (AWS/GCP/Azure)
   - Configure MongoDB Atlas or similar
   - Set up SSL certificates
   - **Acceptance Criteria:** Server runs in production environment

14.3. **Set up mobile app deployment**
   - Configure Expo build service
   - Set up app store accounts
   - Prepare release builds
   - **Acceptance Criteria:** App can be deployed to app stores

14.4. **Implement monitoring and alerts**
   - Set up application monitoring (New Relic, DataDog, etc.)
   - Configure error tracking (Sentry)
   - Add uptime monitoring
   - **Acceptance Criteria:** Production issues are detected automatically

14.5. **Create deployment documentation**
   - Document deployment process
   - Create runbooks for common issues
   - Document environment variables
   - **Acceptance Criteria:** Team can deploy without tribal knowledge

---

## Task Prioritization Summary

### Phase 1 (MVP) - Highest Priority
1. Core Server Architecture with Socket.IO
2. Database Schema Design
3. GPS Location Tracking Implementation
4. Map Integration with Mapbox
5. Task System Implementation
6. Real-time Game State Synchronization

### Phase 2 (Core Gameplay) - High Priority
7. Game Lobby and Matchmaking
8. Kill and Sabotage Mechanics
9. Emergency Meeting System
13. Security and Privacy (basic implementation)

### Phase 3 (Polish) - Medium Priority
10. UI/UX Design and Implementation
11. Testing and Quality Assurance

### Phase 4 (Production Ready) - Lower Priority
12. Performance Optimization
14. Deployment and DevOps

---

## Notes for AI Agents

- Each task should be completed with proper error handling
- All features should be tested (at minimum, manually) before marking complete
- Code should follow project conventions and style guides
- Documentation should be updated as features are implemented
- Consider mobile device constraints (battery, network, CPU)
- Always validate location data server-side for security
- Keep real-time performance in mind for all Socket.IO implementations
