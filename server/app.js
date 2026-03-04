const express = require('express'); // Import Express
const http = require('http');
const path = require('path');
const app = express(); // Create an Express application instance
const port = process.env.PORT || 3000; // Define the port number
const userRoutes = require('./routes/userRoutes');
const lobbyRoutes = require('./routes/lobbyRoutes');
const gameRoutes = require('./routes/gameRoutes');
const logRoutes = require('./routes/logRoutes');
const { setupLobbySocket } = require('./websocket/lobbySocket');
const { registerCoopHandlers } = require('./websocket/coopSocket');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Request logger for API routes ──────────────────────────────────────────
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/logs')) return next(); // don't log the logger
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const userId = req.user?.sub || '-';
    const tag = res.statusCode >= 400 ? '!' : '→';
    // console.log(`[API] ${tag} ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms user:${userId}`);
  });
  next();
});

app.use('/api/users', userRoutes);
app.use('/api/lobbies', lobbyRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/logs', logRoutes);

app.get('/', (req, res) => {
  res.send('Apokrupto Server - Lobby & Realtime System Active');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

async function start() {
  try {
    // Initialize PostgreSQL
    await require('./dbInit')();
    console.log('[Startup] PostgreSQL initialized');

    // Create HTTP server and wire up Socket.IO lobby handlers
    const httpServer = http.createServer(app);
    const io = setupLobbySocket(httpServer);
    io.on('connection', (socket) => { registerCoopHandlers(socket); });
    console.log('[Startup] WebSocket server initialized (lobby + coop)');

    // Start listening
    httpServer.listen(port, '0.0.0.0', () => {
      console.log(`[Startup] Server listening on port ${port}`);
      console.log(`[Startup] Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('[Shutdown] SIGTERM received, closing server...');
      httpServer.close(() => {
        console.log('[Shutdown] Server closed');
        process.exit(0);
      });
    });

  } catch (err) {
    console.error('[Startup] Failed to start server:', err);
    process.exit(1);
  }
}

start();
