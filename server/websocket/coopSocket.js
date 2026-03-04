const ioModule = require('./io');
const coopService = require('../services/coopService');
const { generateCoopTask, COOP_MULTIPLIER, COOP_BASE_POINTS } = require('../data/coopTasks');
const pool = require('../db');

// userId → timeout ID for deferred session-end after disconnect
const _disconnectTimers = new Map();
const DISCONNECT_GRACE_MS = 8000;

/**
 * Award co-op points to a team in the DB, applying 50% Sus penalty if the
 * triggering player is marked.
 */
async function awardCoopPoints(gameId, team, basePoints, session, playerRole) {
  if (!session) return 0;
  const userId = playerRole === 'A' ? session.playerA.userId : session.playerB.userId;

  const playerRes = await pool.query(
    'SELECT is_marked FROM game_players WHERE game_id = $1 AND user_id = $2',
    [gameId, userId]
  );
  const isSus = playerRes.rows[0]?.is_marked || false;
  const finalPoints = isSus ? Math.floor(basePoints * 0.5) : basePoints;

  await pool.query(
    'UPDATE game_teams SET points = points + $1 WHERE game_id = $2 AND team = $3',
    [finalPoints, gameId, team]
  );

  return finalPoints;
}

/**
 * Strip the _server field from a task before sending to clients.
 */
function sanitizeTask(task) {
  if (!task) return task;
  const { _server, ...rest } = task;
  return rest;
}

/**
 * Find all sockets for a given userId.
 */
function findSocketsForUser(io, userId) {
  const sockets = [];
  const uid = String(userId);
  for (const [, sock] of io.sockets.sockets) {
    if (sock.userId === uid) sockets.push(sock);
  }
  return sockets;
}

/**
 * Get the player role ('A' or 'B') for a userId in a session.
 */
function getPlayerRole(session, userId) {
  const uid = String(userId);
  const isA = session.playerA.userId === uid;
  const isB = session.playerB.userId === uid;
  if (!isA && !isB) return null;
  const structural = isA ? 'A' : 'B';
  if (session.taskRoleSwap) return structural === 'A' ? 'B' : 'A';
  return structural;
}

/**
 * Emit coopNextTask to the session room after a delay.
 */
function scheduleNextTask(io, sessionId, delayMs) {
  setTimeout(() => {
    try {
      const session = coopService.getSession(sessionId);
      if (!session) return;
      const task = coopService.advanceTask(sessionId);
      if (task) {
        const totalPts = (session.sessionPoints?.A || 0) + (session.sessionPoints?.B || 0);
        const roles = {
          [session.playerA.userId]: getPlayerRole(session, session.playerA.userId),
          [session.playerB.userId]: getPlayerRole(session, session.playerB.userId),
        };
        io.to(`coop:${sessionId}`).emit('coopNextTask', {
          sessionId,
          task: sanitizeTask(task),
          sessionPoints: totalPts,
          roles,
        });
        // For simon_says: send patterns to the player whose effective role is B
        const effectiveBUserId = roles[session.playerA.userId] === 'B'
          ? session.playerA.userId
          : session.playerB.userId;
        if (task.taskType === 'simon_says' && task._server) {
          const playerBSockets = findSocketsForUser(io, effectiveBUserId);
          for (const s of playerBSockets) {
            s.emit('coopSimonPatterns', {
              sessionId,
              phosPattern: task._server.phosPattern,
              skotiaPattern: task._server.skotiaPattern,
            });
          }
        }
      }
    } catch (err) {
      console.error('[Coop] scheduleNextTask error:', err.message);
    }
  }, delayMs);
}

function registerCoopHandlers(socket) {
  // socket.userId and socket.username are set by lobbySocket auth middleware
  console.log(`[Coop] registerCoopHandlers socket:${socket.id} user:${socket.userId} username:${socket.username}`);

  socket.on('coopInvite', async ({ gameId, targetUserId }, callback) => {
    console.log(`[Coop] coopInvite from user:${socket.userId} targeting:${targetUserId} game:${gameId}`);
    try {
      const { invite, cancelledInvite } = coopService.createInvite(gameId, socket.userId, socket.username, targetUserId);
      const io = ioModule.getIO();
      if (io) {
        // Notify previous invite target that their invite was cancelled
        if (cancelledInvite) {
          const prevTargetSockets = findSocketsForUser(io, cancelledInvite.targetUserId);
          for (const s of prevTargetSockets) {
            s.emit('coopInviteCancelled', { inviteId: cancelledInvite.id });
          }
        }
        const targetSockets = findSocketsForUser(io, targetUserId);
        for (const s of targetSockets) {
          s.emit('coopInviteReceived', {
            inviteId: invite.id,
            gameId: invite.gameId,
            fromUserId: invite.fromUserId,
            fromUsername: invite.fromUsername,
          });
        }
      }
      if (callback) callback({ ok: true, inviteId: invite.id });
    } catch (err) {
      const inSession = !!coopService.getSessionByPlayer(socket.userId);
      const pendingInvites = coopService.getInvitesForPlayer(socket.userId);
      console.error('[Coop] coopInvite error:', err.message, '| inSession:', inSession, '| pendingInvitesTargetingThem:', pendingInvites.length);
      if (callback) callback({ error: err.message });
    }
  });

  socket.on('coopCancel', async ({ inviteId }, callback) => {
    try {
      const invite = coopService.cancelInvite(inviteId, socket.userId);
      const io = ioModule.getIO();
      if (io) {
        const targetSockets = findSocketsForUser(io, invite.targetUserId);
        for (const s of targetSockets) {
          s.emit('coopInviteCancelled', { inviteId });
        }
      }
      if (callback) callback({ ok: true });
    } catch (err) {
      console.error('[Coop] coopCancel error:', err.message);
      if (callback) callback({ error: err.message });
    }
  });

  socket.on('coopAccept', async ({ inviteId }, callback) => {
    try {
      const session = coopService.acceptInvite(inviteId, socket.userId, socket.username);
      const task = generateCoopTask();
      session.currentTask = task;

      const io = ioModule.getIO();
      const sessionRoom = `coop:${session.id}`;

      // Join both players' sockets into the coop room
      if (io) {
        const playerASockets = findSocketsForUser(io, session.playerA.userId);
        const playerBSockets = findSocketsForUser(io, session.playerB.userId);

        const roleA = getPlayerRole(session, session.playerA.userId);
        const roleB = getPlayerRole(session, session.playerB.userId);
        for (const s of playerASockets) {
          s.join(sessionRoom);
          s.emit('coopSessionStart', {
            sessionId: session.id,
            role: roleA,
            partner: { userId: session.playerB.userId, username: session.playerB.username },
            task: sanitizeTask(task),
          });
        }
        for (const s of playerBSockets) {
          s.join(sessionRoom);
          s.emit('coopSessionStart', {
            sessionId: session.id,
            role: roleB,
            partner: { userId: session.playerA.userId, username: session.playerA.username },
            task: sanitizeTask(task),
          });
        }
        // For simon_says: send patterns to the player whose effective role is B
        if (task.taskType === 'simon_says' && task._server) {
          const effectiveBSockets = roleA === 'B' ? playerASockets : playerBSockets;
          for (const s of effectiveBSockets) {
            s.emit('coopSimonPatterns', {
              sessionId: session.id,
              phosPattern: task._server.phosPattern,
              skotiaPattern: task._server.skotiaPattern,
            });
          }
        }
      }

      if (callback) callback({ ok: true, sessionId: session.id });
    } catch (err) {
      console.error('[Coop] coopAccept error:', err.message);
      if (callback) callback({ error: err.message });
    }
  });

  socket.on('coopDecline', async ({ inviteId }, callback) => {
    try {
      const invite = coopService.declineInvite(inviteId, socket.userId);
      const io = ioModule.getIO();
      if (io) {
        const senderSockets = findSocketsForUser(io, invite.fromUserId);
        for (const s of senderSockets) {
          s.emit('coopInviteDeclined', { inviteId });
        }
      }
      if (callback) callback({ ok: true });
    } catch (err) {
      console.error('[Coop] coopDecline error:', err.message);
      if (callback) callback({ error: err.message });
    }
  });

  socket.on('coopAction', async ({ sessionId, action, data }, callback) => {
    try {
      const session = coopService.getSession(sessionId);
      if (!session) throw new Error('Session not found');
      if (session.status !== 'active') throw new Error('Session is not active');

      const role = getPlayerRole(session, socket.userId);
      if (!role) throw new Error('You are not in this session');

      const io = ioModule.getIO();
      const room = `coop:${sessionId}`;
      const task = session.currentTask;
      if (!task) throw new Error('No active task');

      // ── deception + selectOption ──────────────────────────────────
      if (task.taskType === 'deception' && action === 'selectOption') {
        if (role !== 'A') throw new Error('Only Player A can select');
        const choice = data?.choice;
        if (choice !== 0 && choice !== 1) throw new Error('Invalid choice');

        const benefitTeam = choice === task._server.phosOptionIndex ? 'phos' : 'skotia';
        const basePoints = COOP_BASE_POINTS.deception * COOP_MULTIPLIER;
        const awarded = await awardCoopPoints(session.gameId, benefitTeam, basePoints, session, 'A');
        coopService.updateSessionPoints(sessionId, 'A', awarded);

        if (io) {
          io.to(room).emit('coopTaskUpdate', {
            sessionId,
            phase: 'resolved',
            chosenIndex: choice,
            benefitTeam,
            pointsAwarded: awarded,
          });
          scheduleNextTask(io, sessionId, 1500);
        }
        if (callback) callback({ ok: true });
      }

      // ── secret_ballot + discardDecree (from A) ───────────────────
      else if (task.taskType === 'secret_ballot' && action === 'discardDecree') {
        if (role !== 'A') throw new Error('Only Player A can discard');
        const decreeIndex = data?.decreeIndex;
        if (decreeIndex == null || decreeIndex < 0 || decreeIndex > 2) throw new Error('Invalid decree index');

        const remaining = task.config.decrees.filter((d) => d.index !== decreeIndex);
        if (remaining.length !== 2) throw new Error('Invalid discard');
        session.currentTask._ballotRemaining = remaining;

        if (io) {
          // Find Player B sockets
          const playerBSockets = findSocketsForUser(io, session.playerB.userId);
          for (const s of playerBSockets) {
            s.emit('coopTaskUpdate', {
              sessionId,
              phase: 'playerB',
              remainingDecrees: remaining,
            });
          }
          // Find Player A sockets
          const playerASockets = findSocketsForUser(io, session.playerA.userId);
          for (const s of playerASockets) {
            s.emit('coopTaskUpdate', {
              sessionId,
              phase: 'waitingForB',
            });
          }
        }
        if (callback) callback({ ok: true });
      }

      // ── secret_ballot + enactDecree (from B) ─────────────────────
      else if (task.taskType === 'secret_ballot' && action === 'enactDecree') {
        if (role !== 'B') throw new Error('Only Player B can enact');
        const decreeIndex = data?.decreeIndex;
        const remaining = session.currentTask._ballotRemaining;
        if (!remaining) throw new Error('Player A has not discarded yet');

        const enacted = remaining.find((d) => d.index === decreeIndex);
        if (!enacted) throw new Error('Invalid decree index');

        const finalPoints = enacted.points * COOP_MULTIPLIER;
        const awarded = await awardCoopPoints(session.gameId, enacted.team, finalPoints, session, 'B');
        coopService.updateSessionPoints(sessionId, 'B', awarded);

        if (io) {
          // Don't reveal which team — it's secret
          io.to(room).emit('coopTaskUpdate', {
            sessionId,
            phase: 'resolved',
            pointsAwarded: awarded,
          });
          scheduleNextTask(io, sessionId, 1500);
        }
        if (callback) callback({ ok: true });
      }

      // ── coop_tap + tap ────────────────────────────────────────────
      else if (task.taskType === 'coop_tap' && action === 'tap') {
        // Ignore taps after this task is already resolved (race condition guard)
        if (session.resolvedTaskId === task.taskId) {
          if (callback) callback({ ok: true });
        } else {
          if (!session.tapState) {
            session.tapState = { A: 0, B: 0 };
          }
          session.tapState[role] += 1;
          const totalTaps = session.tapState.A + session.tapState.B;
          const target = task.config.targetTaps;

          if (totalTaps >= target) {
            session.resolvedTaskId = task.taskId;
            const basePoints = COOP_BASE_POINTS.coop_tap * COOP_MULTIPLIER;
            // Award to each player's team separately
            const playerATeam = await getPlayerTeam(session.gameId, session.playerA.userId);
            const playerBTeam = await getPlayerTeam(session.gameId, session.playerB.userId);
            const awardedA = await awardCoopPoints(session.gameId, playerATeam, basePoints, session, 'A');
            const awardedB = await awardCoopPoints(session.gameId, playerBTeam, basePoints, session, 'B');
            coopService.updateSessionPoints(sessionId, 'A', awardedA);
            coopService.updateSessionPoints(sessionId, 'B', awardedB);

            if (io) {
              io.to(room).emit('coopTaskUpdate', {
                sessionId,
                phase: 'resolved',
                success: true,
                tapsA: session.tapState.A,
                tapsB: session.tapState.B,
                totalTaps,
                pointsAwarded: awardedA + awardedB,
              });
              scheduleNextTask(io, sessionId, 1500);
            }
          } else if (io) {
            io.to(room).emit('coopTaskUpdate', {
              sessionId,
              phase: 'inProgress',
              tapsA: session.tapState.A,
              tapsB: session.tapState.B,
              totalTaps,
              targetTaps: target,
            });
          }
          if (callback) callback({ ok: true });
        }
      }

      // ── coop_tap + tapTimeout ─────────────────────────────────────
      else if (task.taskType === 'coop_tap' && action === 'tapTimeout') {
        if (session.resolvedTaskId === task.taskId) {
          if (callback) callback({ ok: true });
        } else {
          session.resolvedTaskId = task.taskId;
          if (io) {
            io.to(room).emit('coopTaskUpdate', {
              sessionId,
              phase: 'resolved',
              success: false,
              tapsA: session.tapState?.A ?? 0,
              tapsB: session.tapState?.B ?? 0,
              totalTaps: (session.tapState?.A ?? 0) + (session.tapState?.B ?? 0),
              pointsAwarded: 0,
            });
            scheduleNextTask(io, sessionId, 1500);
          }
          if (callback) callback({ ok: true });
        }
      }

      // ── coop_hold + holdStart ─────────────────────────────────────
      else if (task.taskType === 'coop_hold' && action === 'holdStart') {
        if (session.resolvedTaskId === task.taskId) {
          if (callback) callback({ ok: true });
        } else {
          if (!session.holdState) {
            session.holdState = { A: false, B: false, elapsed: 0, bothStartedAt: null };
          }
          session.holdState[role] = true;

          // If both are now holding, start/resume the timer
          if (session.holdState.A && session.holdState.B && !session.holdState.bothStartedAt) {
            session.holdState.bothStartedAt = Date.now();
          }

          if (io) {
            io.to(room).emit('coopTaskUpdate', {
              sessionId,
              phase: 'inProgress',
              holdA: session.holdState.A,
              holdB: session.holdState.B,
              elapsed: session.holdState.elapsed,
            });
          }
          if (callback) callback({ ok: true });
        }
      }

      // ── coop_hold + holdEnd ───────────────────────────────────────
      else if (task.taskType === 'coop_hold' && action === 'holdEnd') {
        if (session.resolvedTaskId === task.taskId) {
          if (callback) callback({ ok: true });
        } else {
          if (!session.holdState) {
            session.holdState = { A: false, B: false, elapsed: 0, bothStartedAt: null };
          }

          // Accumulate elapsed time if both were holding
          if (session.holdState.bothStartedAt) {
            session.holdState.elapsed += Date.now() - session.holdState.bothStartedAt;
            session.holdState.bothStartedAt = null;
          }
          session.holdState[role] = false;

          const target = task.config.targetMs;
          if (session.holdState.elapsed >= target) {
            session.resolvedTaskId = task.taskId;
            const basePoints = COOP_BASE_POINTS.coop_hold * COOP_MULTIPLIER;
            const playerATeam = await getPlayerTeam(session.gameId, session.playerA.userId);
            const playerBTeam = await getPlayerTeam(session.gameId, session.playerB.userId);
            const awardedA = await awardCoopPoints(session.gameId, playerATeam, basePoints, session, 'A');
            const awardedB = await awardCoopPoints(session.gameId, playerBTeam, basePoints, session, 'B');
            coopService.updateSessionPoints(sessionId, 'A', awardedA);
            coopService.updateSessionPoints(sessionId, 'B', awardedB);

            if (io) {
              io.to(room).emit('coopTaskUpdate', {
                sessionId,
                phase: 'resolved',
                success: true,
                elapsed: session.holdState.elapsed,
                pointsAwarded: awardedA + awardedB,
              });
              scheduleNextTask(io, sessionId, 1500);
            }
          } else if (io) {
            io.to(room).emit('coopTaskUpdate', {
              sessionId,
              phase: 'inProgress',
              holdA: session.holdState.A,
              holdB: session.holdState.B,
              elapsed: session.holdState.elapsed,
            });
          }
          if (callback) callback({ ok: true });
        }
      }

      // ── coop_hold + holdCheck (periodic check if both still holding) ──
      else if (task.taskType === 'coop_hold' && action === 'holdCheck') {
        if (session.resolvedTaskId === task.taskId) {
          if (callback) callback({ ok: true });
        } else if (!session.holdState) {
          if (callback) callback({ ok: true });
        } else {
          let currentElapsed = session.holdState.elapsed;
          if (session.holdState.bothStartedAt) {
            currentElapsed += Date.now() - session.holdState.bothStartedAt;
          }

          const target = task.config.targetMs;
          if (currentElapsed >= target) {
            // Finalize
            if (session.holdState.bothStartedAt) {
              session.holdState.elapsed = currentElapsed;
              session.holdState.bothStartedAt = null;
            }
            session.resolvedTaskId = task.taskId;

            const basePoints = COOP_BASE_POINTS.coop_hold * COOP_MULTIPLIER;
            const playerATeam = await getPlayerTeam(session.gameId, session.playerA.userId);
            const playerBTeam = await getPlayerTeam(session.gameId, session.playerB.userId);
            const awardedA = await awardCoopPoints(session.gameId, playerATeam, basePoints, session, 'A');
            const awardedB = await awardCoopPoints(session.gameId, playerBTeam, basePoints, session, 'B');
            coopService.updateSessionPoints(sessionId, 'A', awardedA);
            coopService.updateSessionPoints(sessionId, 'B', awardedB);

            if (io) {
              io.to(room).emit('coopTaskUpdate', {
                sessionId,
                phase: 'resolved',
                success: true,
                elapsed: session.holdState.elapsed,
                pointsAwarded: awardedA + awardedB,
              });
              scheduleNextTask(io, sessionId, 1500);
            }
          } else if (io) {
            io.to(room).emit('coopTaskUpdate', {
              sessionId,
              phase: 'inProgress',
              holdA: session.holdState.A,
              holdB: session.holdState.B,
              elapsed: currentElapsed,
            });
          }
          if (callback) callback({ ok: true });
        }
      }

      // ── coop_hold + holdTimeout ───────────────────────────────────
      else if (task.taskType === 'coop_hold' && action === 'holdTimeout') {
        if (session.resolvedTaskId === task.taskId) {
          if (callback) callback({ ok: true });
        } else {
          session.resolvedTaskId = task.taskId;
          // Stop any in-progress elapsed accumulation
          if (session.holdState?.bothStartedAt) {
            session.holdState.elapsed += Date.now() - session.holdState.bothStartedAt;
            session.holdState.bothStartedAt = null;
          }
          if (io) {
            io.to(room).emit('coopTaskUpdate', {
              sessionId,
              phase: 'resolved',
              success: false,
              elapsed: session.holdState?.elapsed ?? 0,
              pointsAwarded: 0,
            });
            scheduleNextTask(io, sessionId, 1500);
          }
          if (callback) callback({ ok: true });
        }
      }

      // ── simon_says + selectPattern (Player B chooses which team's pattern to give) ────
      else if (task.taskType === 'simon_says' && action === 'selectPattern') {
        if (role !== 'B') throw new Error('Only Player B can select the pattern');
        const team = data?.team;
        if (team !== 'phos' && team !== 'skotia') throw new Error('Invalid team: must be phos or skotia');

        // Store choice — reset any prior input from Player A
        if (!session.simonState) session.simonState = {};
        session.simonState.chosenTeam = team;
        session.simonState.inputSequence = [];
        session.simonState.resolved = false;

        const pattern = team === 'phos' ? task._server.phosPattern : task._server.skotiaPattern;
        console.log(`[Coop] simon_says selectPattern game=${session.gameId} team=${team}`);

        if (io) {
          // Tell Player B the locked pattern so they can run the flash animation
          const playerBSockets = findSocketsForUser(io, session.playerB.userId);
          for (const s of playerBSockets) {
            s.emit('coopTaskUpdate', {
              sessionId,
              phase: 'patternLocked',
              pattern,
              team,
            });
          }
          // Tell Player A to start inputting (no pattern revealed)
          const playerASockets = findSocketsForUser(io, session.playerA.userId);
          for (const s of playerASockets) {
            s.emit('coopTaskUpdate', {
              sessionId,
              phase: 'inputReady',
              sequenceLength: task.config.sequenceLength,
            });
          }
        }
        if (callback) callback({ ok: true });
      }

      // ── simon_says + tapColor (Player A taps a color) ────────────────────────
      else if (task.taskType === 'simon_says' && action === 'tapColor') {
        if (role !== 'A') throw new Error('Only Player A can tap colors');
        if (!session.simonState || session.simonState.resolved) {
          // Pattern not selected yet or already resolved — ignore quietly
          if (callback) callback({ ok: true });
          return;
        }

        const color = data?.color;
        if (!task.config.colors.includes(color)) throw new Error(`Invalid color: ${color}`);

        if (!session.simonState.inputSequence) session.simonState.inputSequence = [];
        session.simonState.inputSequence.push(color);
        const seq = session.simonState.inputSequence;

        if (io) {
          const playerASockets = findSocketsForUser(io, session.playerA.userId);
          for (const s of playerASockets) {
            s.emit('coopTaskUpdate', {
              sessionId,
              phase: 'inputProgress',
              inputSequence: [...seq],
              sequenceLength: task.config.sequenceLength,
            });
          }
        }
        if (callback) callback({ ok: true });
      }

      // ── simon_says + clearInput (Player A clears their tapped sequence) ─────
      else if (task.taskType === 'simon_says' && action === 'clearInput') {
        if (role !== 'A') throw new Error('Only Player A can clear input');
        if (!session.simonState || session.simonState.resolved) {
          if (callback) callback({ ok: true });
          return;
        }

        session.simonState.inputSequence = [];

        if (io) {
          const playerASockets = findSocketsForUser(io, session.playerA.userId);
          for (const s of playerASockets) {
            s.emit('coopTaskUpdate', {
              sessionId,
              phase: 'inputProgress',
              inputSequence: [],
              sequenceLength: task.config.sequenceLength,
            });
          }
        }
        if (callback) callback({ ok: true });
      }

      // ── simon_says + submitSequence (Player A submits their full sequence) ──
      else if (task.taskType === 'simon_says' && action === 'submitSequence') {
        if (role !== 'A') throw new Error('Only Player A can submit');
        if (!session.simonState || session.simonState.resolved) {
          if (callback) callback({ ok: true });
          return;
        }

        let seq = session.simonState.inputSequence || [];
        const seqLen = task.config.sequenceLength;

        // Accept client-provided sequence as fallback if server tracking is out of sync
        if (seq.length !== seqLen && Array.isArray(data?.sequence) && data.sequence.length === seqLen) {
          const validColors = task.config.colors;
          if (data.sequence.every(c => validColors.includes(c))) {
            seq = data.sequence;
            session.simonState.inputSequence = seq;
            console.log(`[Coop] simon_says using client-provided sequence (server had ${(session.simonState.inputSequence || []).length})`);
          }
        }

        if (seq.length !== seqLen) throw new Error(`Sequence must be ${seqLen} colors, got ${seq.length}`);

        session.simonState.resolved = true;

        const phosMatch   = JSON.stringify(seq) === JSON.stringify(task._server.phosPattern);
        const skotiaMatch = JSON.stringify(seq) === JSON.stringify(task._server.skotiaPattern);

        let benefitTeam = null;
        let awarded = 0;

        if (phosMatch)        benefitTeam = 'phos';
        else if (skotiaMatch) benefitTeam = 'skotia';

        if (benefitTeam) {
          const base = COOP_BASE_POINTS.simon_says * COOP_MULTIPLIER;
          awarded = await awardCoopPoints(session.gameId, benefitTeam, base, session, 'A');
          coopService.updateSessionPoints(sessionId, 'A', awarded);
        }

        const success = !!benefitTeam;
        console.log(`[Coop] simon_says resolved game=${session.gameId} success=${success} team=${benefitTeam} pts=${awarded}`);

        if (io) {
          io.to(room).emit('coopTaskUpdate', {
            sessionId,
            phase: 'resolved',
            success,
            inputSequence: seq,
            phosPattern:   task._server.phosPattern,
            skotiaPattern: task._server.skotiaPattern,
            benefitTeam,
            chosenTeam: session.simonState.chosenTeam,
            pointsAwarded: awarded,
          });
          scheduleNextTask(io, sessionId, 2500);
        }
        if (callback) callback({ ok: true });
      }

      else {
        // Stale action from a previous task (race condition) — ignore silently
        console.warn(`[Coop] Ignoring stale action "${action}" for task type "${task.taskType}"`);
        if (callback) callback({ ok: true });
      }
    } catch (err) {
      console.error('[Coop] coopAction error:', err.message);
      if (callback) callback({ error: err.message });
    }
  });

  socket.on('coopExit', async ({ sessionId }, callback) => {
    try {
      const session = coopService.getSession(sessionId);
      if (!session) throw new Error('Session not found');

      const role = getPlayerRole(session, socket.userId);
      if (!role) throw new Error('You are not in this session');

      const ended = coopService.endSession(sessionId);
      const io = ioModule.getIO();
      if (io && ended) {
        io.to(`coop:${sessionId}`).emit('coopSessionEnd', {
          sessionId,
          reason: 'playerLeft',
          sessionPoints: (ended.sessionPoints?.A || 0) + (ended.sessionPoints?.B || 0),
          teamPoints: null,
        });
      }
      if (callback) callback({ ok: true });
    } catch (err) {
      console.error('[Coop] coopExit error:', err.message);
      if (callback) callback({ error: err.message });
    }
  });

  socket.on('coopRejoin', ({ sessionId }, callback) => {
    try {
      // Cancel any pending disconnect timer for this user
      const existing = _disconnectTimers.get(socket.userId);
      if (existing) {
        clearTimeout(existing);
        _disconnectTimers.delete(socket.userId);
      }

      const session = coopService.getSession(sessionId);
      if (!session) throw new Error('Session not found');
      const role = getPlayerRole(session, socket.userId);
      if (!role) throw new Error('You are not in this session');

      socket.join(`coop:${sessionId}`);
      if (callback) callback({ ok: true, role });
    } catch (err) {
      console.error('[Coop] coopRejoin error:', err.message);
      if (callback) callback({ error: err.message });
    }
  });

  socket.on('disconnect', () => {
    try {
      const session = coopService.getSessionByPlayer(socket.userId);
      if (!session) return;

      // Grace period: give the client time to reconnect before ending the session
      const timer = setTimeout(() => {
        _disconnectTimers.delete(socket.userId);
        try {
          // Check the session is still there and this player hasn't reconnected
          const stillActive = coopService.getSessionByPlayer(socket.userId);
          if (!stillActive || stillActive.id !== session.id) return;

          const ended = coopService.endSession(session.id);
          const io = ioModule.getIO();
          if (io && ended) {
            io.to(`coop:${session.id}`).emit('coopSessionEnd', {
              sessionId: session.id,
              reason: 'disconnected',
              sessionPoints: (ended.sessionPoints?.A || 0) + (ended.sessionPoints?.B || 0),
              teamPoints: null,
            });
          }
        } catch (innerErr) {
          console.error('[Coop] deferred disconnect error:', innerErr.message);
        }
      }, DISCONNECT_GRACE_MS);

      _disconnectTimers.set(socket.userId, timer);
    } catch (err) {
      console.error('[Coop] disconnect cleanup error:', err.message);
    }
  });
}

/**
 * Look up a player's team for the given game.
 */
async function getPlayerTeam(gameId, userId) {
  const res = await pool.query(
    'SELECT team FROM game_players WHERE game_id = $1 AND user_id = $2',
    [gameId, userId]
  );
  return res.rows[0]?.team || 'phos';
}

module.exports = { registerCoopHandlers };
