// ---------------------------------------------------------------------------
// In-memory state for voting timer (Movement C)
// ---------------------------------------------------------------------------
const _votingTimers   = new Map(); // gameId → timeoutId
const _votingEndTimes = new Map(); // gameId → votingEndsAt (epoch ms)
const VOTING_DURATION_MS = 60 * 1000; // 60 seconds

function clearVotingTimer(gameId) {
  const key = String(gameId);
  const tid = _votingTimers.get(key);
  if (tid) { clearTimeout(tid); _votingTimers.delete(key); }
  _votingEndTimes.delete(key);
}

function getVotingEndsAt(gameId) {
  return _votingEndTimes.get(String(gameId)) ?? null;
}

function scheduleVotingTimer(gameId, votingEndsAt) {
  const key = String(gameId);
  if (_votingTimers.has(key)) return; // already scheduled
  _votingEndTimes.set(key, votingEndsAt);
  const delay = Math.max(0, votingEndsAt - Date.now());
  const tid = setTimeout(async () => {
    _votingTimers.delete(key);
    _votingEndTimes.delete(key);
    try {
      const { getIO } = require('../websocket/io');
      const { emitAdvanceEvents } = require('../websocket/lobbySocket');
      const { advanceMovement } = require('./gameService');
      const result = await advanceMovement(key);
      console.log(`[VotingTimer] Auto-advanced game ${key} → ${result.step}`);
      emitAdvanceEvents(getIO(), result);
    } catch (err) {
      console.error('[VotingTimer] auto-advance error:', err.message);
    }
  }, delay);
  _votingTimers.set(key, tid);
}

module.exports = { clearVotingTimer, getVotingEndsAt, scheduleVotingTimer, VOTING_DURATION_MS };
