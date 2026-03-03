const express = require('express');
const router = express.Router();

// ── In-memory ring buffer ────────────────────────────────────────────────────
const MAX_BUFFER = 500;
const logBuffer = [];  // { id, ts, category, tag, message, data }
let nextId = 1;

// Active SSE response objects
const sseClients = new Set();

function pushEntry(entry) {
  if (logBuffer.length >= MAX_BUFFER) logBuffer.shift();
  logBuffer.push(entry);
  const payload = `data: ${JSON.stringify(entry)}\n\n`;
  for (const res of sseClients) {
    try { res.write(payload); } catch (_) { sseClients.delete(res); }
  }
}

// ── POST /api/logs — receive a log entry from the client ─────────────────────
router.post('/', (req, res) => {
  const { category, tag, message, data, ts } = req.body || {};
  if (!category || !tag || !message) return res.status(400).json({ error: 'category, tag and message required' });
  const entry = { id: nextId++, ts: ts || Date.now(), category, tag, message, data };
  pushEntry(entry);
  res.json({ ok: true, id: entry.id });
});

// ── GET /api/logs — return buffered entries ───────────────────────────────────
router.get('/', (req, res) => {
  res.json({ entries: logBuffer });
});

// ── DELETE /api/logs — clear buffer ─────────────────────────────────────────
router.delete('/', (req, res) => {
  logBuffer.length = 0;
  const payload = `data: ${JSON.stringify({ __clear: true })}\n\n`;
  for (const c of sseClients) { try { c.write(payload); } catch (_) {} }
  res.json({ ok: true });
});

// ── GET /api/logs/stream — Server-Sent Events ────────────────────────────────
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Replay buffer so a freshly opened tab gets history
  for (const entry of logBuffer) {
    res.write(`data: ${JSON.stringify(entry)}\n\n`);
  }

  sseClients.add(res);

  // Heartbeat — keeps the connection alive through proxies
  const hb = setInterval(() => { try { res.write(': heartbeat\n\n'); } catch (_) {} }, 15000);

  req.on('close', () => {
    clearInterval(hb);
    sseClients.delete(res);
  });
});

module.exports = router;
