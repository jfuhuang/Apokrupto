const crypto = require('crypto');
const { generateCoopTask } = require('../data/coopTasks');
const ioModule = require('../websocket/io');

// inviteId → { id, gameId, fromUserId, fromUsername, targetUserId, createdAt }
const _invites = new Map();

// sessionId → { id, gameId, playerA, playerB, currentTask, taskIndex, sessionPoints, status, holdState, tapState }
const _sessions = new Map();

// oderId → sessionId (prevent double-session)
const _playerSessions = new Map();

// oderId → inviteId (one pending outbound invite at a time)
const _playerInvites = new Map();

function createInvite(gameId, fromUserId, fromUsername, targetUserId) {
  if (_playerSessions.has(String(fromUserId))) {
    throw new Error('You are already in a co-op session');
  }
  if (String(fromUserId) === String(targetUserId)) {
    throw new Error('Cannot invite yourself');
  }

  // Auto-cancel any existing pending invite from this player
  let cancelledInvite = null;
  const existingInviteId = _playerInvites.get(String(fromUserId));
  if (existingInviteId) {
    cancelledInvite = _invites.get(existingInviteId) || null;
    _invites.delete(existingInviteId);
    _playerInvites.delete(String(fromUserId));
  }

  const id = crypto.randomUUID();
  const invite = {
    id,
    gameId: String(gameId),
    fromUserId: String(fromUserId),
    fromUsername,
    targetUserId: String(targetUserId),
    createdAt: Date.now(),
  };
  _invites.set(id, invite);
  _playerInvites.set(String(fromUserId), id);
  return { invite, cancelledInvite };
}

function cancelInvite(inviteId, userId) {
  const invite = _invites.get(inviteId);
  if (!invite) throw new Error('Invite not found');
  if (invite.fromUserId !== String(userId)) throw new Error('Not your invite');

  _invites.delete(inviteId);
  _playerInvites.delete(invite.fromUserId);
  return invite;
}

function acceptInvite(inviteId, acceptorId, acceptorUsername) {
  const invite = _invites.get(inviteId);
  if (!invite) throw new Error('Invite not found');
  if (invite.targetUserId !== String(acceptorId)) throw new Error('Invite not for you');
  if (_playerSessions.has(String(acceptorId))) throw new Error('You are already in a co-op session');

  // Clean up invite
  _invites.delete(inviteId);
  _playerInvites.delete(invite.fromUserId);

  // Also clean up any pending invites targeting the acceptor from others
  for (const [iId, inv] of _invites) {
    if (inv.targetUserId === String(acceptorId)) {
      _invites.delete(iId);
      _playerInvites.delete(inv.fromUserId);
    }
  }

  const sessionId = crypto.randomUUID();
  const session = {
    id: sessionId,
    gameId: invite.gameId,
    playerA: { userId: invite.fromUserId, username: invite.fromUsername },
    playerB: { userId: String(acceptorId), username: acceptorUsername },
    currentTask: null,
    taskIndex: 0,
    sessionPoints: { A: 0, B: 0 },
    status: 'active',
    holdState: null,
    tapState: null,
  };

  _sessions.set(sessionId, session);
  _playerSessions.set(invite.fromUserId, sessionId);
  _playerSessions.set(String(acceptorId), sessionId);

  return session;
}

function declineInvite(inviteId, userId) {
  const invite = _invites.get(inviteId);
  if (!invite) throw new Error('Invite not found');
  if (invite.targetUserId !== String(userId)) throw new Error('Invite not for you');

  _invites.delete(inviteId);
  _playerInvites.delete(invite.fromUserId);
  return invite;
}

function getSession(sessionId) {
  return _sessions.get(sessionId) || null;
}

function getSessionByPlayer(userId) {
  const sessionId = _playerSessions.get(String(userId));
  if (!sessionId) return null;
  return _sessions.get(sessionId) || null;
}

function getInvite(inviteId) {
  return _invites.get(inviteId) || null;
}

function getInvitesForPlayer(userId) {
  const uid = String(userId);
  const result = [];
  for (const invite of _invites.values()) {
    if (invite.targetUserId === uid) result.push(invite);
  }
  return result;
}

function endSession(sessionId) {
  const session = _sessions.get(sessionId);
  if (!session) return null;

  _sessions.delete(sessionId);
  _playerSessions.delete(session.playerA.userId);
  _playerSessions.delete(session.playerB.userId);
  session.status = 'ended';
  return session;
}

function advanceTask(sessionId) {
  const session = _sessions.get(sessionId);
  if (!session) throw new Error('Session not found');

  session.taskIndex += 1;
  const task = generateCoopTask();
  session.currentTask = task;
  session.holdState = null;
  session.tapState = null;
  return task;
}

function updateSessionPoints(sessionId, playerRole, points) {
  const session = _sessions.get(sessionId);
  if (!session) return;
  if (playerRole === 'A' || playerRole === 'B') {
    session.sessionPoints[playerRole] += points;
  }
}

function endAllSessionsForGame(gameId) {
  const gid = String(gameId);
  const ended = [];
  const sessionIds = [..._sessions.keys()].filter(
    (sid) => _sessions.get(sid).gameId === gid
  );
  for (const sessionId of sessionIds) {
    const session = endSession(sessionId);
    if (session) ended.push(session);
  }
  return ended;
}

module.exports = {
  createInvite,
  cancelInvite,
  acceptInvite,
  declineInvite,
  getSession,
  getSessionByPlayer,
  getInvite,
  getInvitesForPlayer,
  endSession,
  advanceTask,
  updateSessionPoints,
  endAllSessionsForGame,
};
