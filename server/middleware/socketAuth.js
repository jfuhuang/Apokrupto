const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

/**
 * WebSocket authentication middleware
 * Validates JWT token from handshake auth or query
 */
function socketAuth(socket, next) {
  try {
    // Try to get token from auth object or query
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach user info to socket
    socket.userId = decoded.sub;
    socket.username = decoded.username;

    next();
  } catch (err) {
    console.error('[SocketAuth] Authentication failed:', err.message);
    next(new Error('Invalid token'));
  }
}

module.exports = socketAuth;
