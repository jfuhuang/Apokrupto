/**
 * Server-side logger that pushes entries to the same ring buffer / SSE stream
 * as the client logger (POST /api/logs). Entries appear in /logs.html alongside
 * client-side logs but with tag prefix "[SERVER]".
 *
 * Usage:
 *   const logger = require('../utils/logger');
 *   logger.info('game', 'route hit', { gameId: 123 });
 *   logger.warn('socket', 'timeout', { userId: 5 });
 *   logger.error('game', 'DB failed', { err: err.message });
 */

let pushEntry = null;

// Lazy-load pushEntry to avoid circular require issues at startup
function getPush() {
  if (!pushEntry) {
    try {
      pushEntry = require('../routes/logRoutes').pushEntry;
    } catch {
      // logRoutes not loaded yet — fall back to console
    }
  }
  return pushEntry;
}

let nextId = 1;

function emit(level, category, message, data) {
  const entry = {
    id:       `srv_${nextId++}`,
    ts:       Date.now(),
    category: category || 'server',
    tag:      `[SERVER] ${level.toUpperCase()}`,
    message,
    data:     data || null,
  };

  const push = getPush();
  if (push) {
    push(entry);
  }

  // Also console-log so Docker / terminal output still works
  const prefix = `[${new Date().toISOString().slice(11, 23)}] [${category}]`;
  if (level === 'error') {
    console.error(prefix, message, data || '');
  } else if (level === 'warn') {
    console.warn(prefix, message, data || '');
  } else {
    console.log(prefix, message, data || '');
  }
}

module.exports = {
  info:  (category, message, data) => emit('info',  category, message, data),
  warn:  (category, message, data) => emit('warn',  category, message, data),
  error: (category, message, data) => emit('error', category, message, data),
};
