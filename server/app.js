const express = require('express'); // Import Express
const http = require('http');
const app = express(); // Create an Express application instance
const port = process.env.PORT || 3000; // Define the port number
const userRoutes = require('./routes/userRoutes');
const lobbyRoutes = require('./routes/lobbyRoutes');
const { connectRedis } = require('./redis');
const WebSocketServer = require('./websocket/WebSocketServer');

app.use(express.json());
app.use('/api/users', userRoutes);
app.use('/api/lobbies', lobbyRoutes);

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

    // Initialize Redis
    await connectRedis();
    console.log('[Startup] Redis connected');

    // Create HTTP server
    const httpServer = http.createServer(app);

    // Initialize WebSocket server
    const wsServer = new WebSocketServer(httpServer);
    console.log('[Startup] WebSocket server initialized');

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
