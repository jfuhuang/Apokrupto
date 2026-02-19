# Apokrupto - Server

Node.js backend server for the Apokrupto mobile game.

## Features

- **User Authentication**
  - User registration with password hashing (bcrypt)
  - Login with JWT token generation
  - Secure password storage
  - Username/email uniqueness validation

- **Lobby Management**
  - Create lobbies with custom names and player limits
  - List all active lobbies with player counts
  - Join and leave lobbies
  - Automatic lobby cleanup when empty
  - JWT-based authentication for all lobby operations

- **Database**
  - PostgreSQL for data persistence
  - User and lobby management
  - Relational data integrity with foreign keys

## Prerequisites

- Node.js v16 or higher
- PostgreSQL 12 or higher
- npm or yarn

## Installation

### 1. Install dependencies

```bash
cd server
npm install
```

### 2. Set up PostgreSQL

#### Option A: Using Docker (recommended)

```bash
# Make sure Docker and Docker Compose are installed
docker-compose up -d postgres

# The database will be available at localhost:5432
```

#### Option B: Local PostgreSQL

Install PostgreSQL on your system and create a database:

```bash
psql -U postgres
CREATE DATABASE apokrupto;
CREATE USER apokrupto WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE apokrupto TO apokrupto;
\q
```

### 3. Configure environment variables

Create a `.env` file in the server directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
POSTGRES_USER=apokrupto
POSTGRES_PASSWORD=your_password_here
POSTGRES_DB=apokrupto
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
JWT_SECRET=your_jwt_secret_here_change_in_production
```

**Important:** Change `JWT_SECRET` to a secure random string in production!

### 4. Initialize the database

The database tables will be created automatically when you start the server for the first time.

## Running the Server

### Development mode

```bash
npm start
```

The server will start on `http://localhost:3000`.

### Using Docker

To run the entire stack (database + server):

```bash
docker-compose up
```

To run in background:

```bash
docker-compose up -d
```

To stop:

```bash
docker-compose down
```

## API Documentation

### Authentication

All lobby endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Endpoints

#### User Endpoints

**POST /api/users/register**
- Description: Create a new user account
- Body:
  ```json
  {
    "username": "player1",
    "email": "player1@example.com",
    "password": "SecurePass123"
  }
  ```
- Success Response (201):
  ```json
  {
    "username": "player1",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- Error Response (409):
  ```json
  {
    "error": "Username or email already exists"
  }
  ```

**POST /api/users/login**
- Description: Authenticate user and get JWT token
- Body:
  ```json
  {
    "usernameOrEmail": "player1",
    "password": "SecurePass123"
  }
  ```
- Success Response (200):
  ```json
  {
    "username": "player1",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- Error Response (401):
  ```json
  {
    "error": "Invalid credentials"
  }
  ```

#### Lobby Endpoints (Authenticated)

**GET /api/lobbies**
- Description: Get all active lobbies
- Headers: `Authorization: Bearer <token>`
- Success Response (200):
  ```json
  {
    "lobbies": [
      {
        "id": 1,
        "name": "My Lobby",
        "max_players": 10,
        "created_by": 1,
        "created_at": "2026-02-12T20:00:00.000Z",
        "host_username": "player1",
        "current_players": "3"
      }
    ]
  }
  ```

**GET /api/lobbies/:id**
- Description: Get details of a specific lobby
- Headers: `Authorization: Bearer <token>`
- Success Response (200):
  ```json
  {
    "lobby": {
      "id": 1,
      "name": "My Lobby",
      "max_players": 10,
      "created_by": 1,
      "status": "waiting",
      "created_at": "2026-02-12T20:00:00.000Z",
      "host_username": "player1",
      "current_players": "3"
    }
  }
  ```
- Error Response (404):
  ```json
  {
    "error": "Lobby not found"
  }
  ```

**POST /api/lobbies**
- Description: Create a new lobby
- Headers: `Authorization: Bearer <token>`
- Body:
  ```json
  {
    "name": "My Awesome Lobby",
    "max_players": 10
  }
  ```
- Success Response (201):
  ```json
  {
    "lobby": {
      "id": 1,
      "name": "My Awesome Lobby",
      "max_players": 10,
      "created_by": 1,
      "status": "waiting",
      "created_at": "2026-02-12T20:00:00.000Z"
    }
  }
  ```
- Error Response (400):
  ```json
  {
    "error": "Max players must be between 4 and 15"
  }
  ```

**POST /api/lobbies/:id/join**
- Description: Join a lobby
- Headers: `Authorization: Bearer <token>`
- Success Response (200):
  ```json
  {
    "message": "Successfully joined lobby",
    "lobbyId": 1
  }
  ```
- Error Responses:
  - 404: `{ "error": "Lobby not found" }`
  - 400: `{ "error": "Lobby is full" }`
  - 400: `{ "error": "Already in this lobby" }`

**POST /api/lobbies/:id/leave**
- Description: Leave a lobby
- Headers: `Authorization: Bearer <token>`
- Success Response (200):
  ```json
  {
    "message": "Successfully left lobby"
  }
  ```
- Error Response (404):
  ```json
  {
    "error": "Not in this lobby"
  }
  ```

## Database Schema

### users
- `id` - Serial primary key
- `username` - Unique varchar(50)
- `email` - Unique varchar(255)
- `password_hash` - varchar(255)
- `created_at` - Timestamp with timezone

### user_providers
- `id` - Serial primary key
- `user_id` - Foreign key to users
- `provider` - varchar(50)
- `provider_id` - varchar(255)
- `provider_profile` - JSONB
- `created_at` - Timestamp with timezone
- `last_seen_at` - Timestamp with timezone

### lobbies
- `id` - Serial primary key
- `name` - varchar(100)
- `max_players` - Integer (4-15)
- `created_by` - Foreign key to users
- `status` - varchar(20) (waiting, in_progress, completed)
- `created_at` - Timestamp with timezone

### lobby_players
- `id` - Serial primary key
- `lobby_id` - Foreign key to lobbies
- `user_id` - Foreign key to users
- `joined_at` - Timestamp with timezone
- Unique constraint on (lobby_id, user_id)

## Project Structure

```
server/
├── app.js                  # Main application entry point
├── db.js                   # Database connection pool
├── dbInit.js               # Database initialization/migrations
├── middleware/
│   └── auth.js             # JWT authentication middleware
├── routes/
│   ├── userRoutes.js       # User authentication endpoints
│   └── lobbyRoutes.js      # Lobby management endpoints
├── package.json            # Dependencies
├── docker-compose.yml      # Docker configuration
├── Dockerfile              # Docker image definition
└── .env.example            # Environment variables template
```

## Security

- Passwords are hashed using bcrypt with 10 salt rounds
- JWT tokens expire after 7 days
- All lobby endpoints require valid JWT authentication
- Database queries use parameterized statements to prevent SQL injection
- User input is validated before database operations
- No hardcoded secrets (server fails if JWT_SECRET not set)

**Note:** Rate limiting is not implemented in this version. For production deployment, add rate limiting middleware (e.g., `express-rate-limit`) to prevent abuse. See `SECURITY_SUMMARY.md` for detailed security information.

## Development

### Testing the API

You can test the API using curl:

```bash
# Register a user
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"Test1234"}'

# Login
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"usernameOrEmail":"testuser","password":"Test1234"}'

# Create a lobby (replace TOKEN with your JWT)
curl -X POST http://localhost:3000/api/lobbies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"name":"Test Lobby","max_players":10}'

# List lobbies
curl http://localhost:3000/api/lobbies \
  -H "Authorization: Bearer TOKEN"
```

## Troubleshooting

### Cannot connect to database

- Ensure PostgreSQL is running
- Check that the credentials in `.env` are correct
- Verify the database exists
- Check firewall settings if using remote database

### JWT token errors

- Make sure JWT_SECRET is set in `.env`
- Tokens expire after 7 days - users need to re-login
- Ensure Authorization header is formatted as `Bearer <token>`

### Port already in use

If port 3000 is already in use, you can change it in `app.js`:

```javascript
const port = 3001; // Change to any available port
```

## Next Steps

- [ ] Implement Socket.IO for real-time lobby updates
- [ ] Add lobby chat functionality
- [ ] Implement game state management
- [ ] Add role assignment (Crewmate/Impostor)
- [ ] Implement task system
- [ ] Add GPS-based game mechanics
- [ ] Add game session tracking
- [ ] Implement leaderboards
- [ ] Add admin endpoints for moderation
