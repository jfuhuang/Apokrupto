/**
 * Apokrupto logger
 *
 * Categories:
 *   game   – significant game-state changes (movement transitions, round
 *             summaries, voting results, role assignments, game over, etc.)
 *   socket – socket connection / disconnection lifecycle
 *   nav    – screen navigation transitions
 *   error  – unexpected errors that affect the player experience
 *   poll   – routine safety-net polling (silenced by default)
 *
 * To flip a category at runtime (e.g. from DevMenuScreen):
 *   import logger from '../utils/logger';
 *   logger.setCategory('poll', true);
 *
 * Log entries are also POSTed to POST /api/logs on the server so they
 * appear in the live log viewer at http://<server-ip>:3000/logs.html
 */

import { getApiUrl } from './networkUtils';

// Cache the resolved server URL so we don't await on every log call
let _remoteUrl = null;
getApiUrl().then((u) => { _remoteUrl = u; }).catch(() => {});

function remoteLog(category, tag, message, data) {
  const url = _remoteUrl;
  if (!url) return; // URL not resolved yet — skip (only affects very early logs)
  const body = JSON.stringify({ category, tag, message, data, ts: Date.now() });
  fetch(`${url}/api/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  }).catch(() => {}); // fire-and-forget, never throws
}

const CATEGORIES = {
  game:   true,
  socket: true,
  nav:    true,
  error:  true,
  poll:   false,  // change to true to see polling noise
};

const PREFIX = '[Apokrupto]';

function fmt(category, tag, message) {
  return `${PREFIX}[${category.toUpperCase()}][${tag}] ${message}`;
}

const logger = {
  /** Significant game-state change */
  game(tag, message, data) {
    remoteLog('game', tag, message, data);
    if (!CATEGORIES.game) return;
    if (data !== undefined) {
      console.log(fmt('game', tag, message), data);
    } else {
      console.log(fmt('game', tag, message));
    }
  },

  /** Socket lifecycle */
  socket(tag, message) {
    remoteLog('socket', tag, message);
    if (!CATEGORIES.socket) return;
    console.log(fmt('socket', tag, message));
  },

  /** Screen navigation transitions */
  nav(tag, message) {
    remoteLog('nav', tag, message);
    if (!CATEGORIES.nav) return;
    console.log(fmt('nav', tag, message));
  },

  /** Error affecting player experience */
  error(tag, message, err) {
    // Serialize the error before sending remotely
    const errData = err instanceof Error
      ? { message: err.message, stack: err.stack }
      : err;
    remoteLog('error', tag, message, errData);
    if (!CATEGORIES.error) return;
    if (err !== undefined) {
      console.error(fmt('error', tag, message), err);
    } else {
      console.error(fmt('error', tag, message));
    }
  },

  /** Routine safety-net polling — off locally by default, always sent to remote */
  poll(tag, message) {
    remoteLog('poll', tag, message);
    if (!CATEGORIES.poll) return;
    console.log(fmt('poll', tag, message));
  },

  /** Enable or disable a category at runtime */
  setCategory(category, enabled) {
    if (category in CATEGORIES) CATEGORIES[category] = enabled;
  },
};

export default logger;
