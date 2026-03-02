#!/usr/bin/env node
/**
 * Stress Test — Apokrupto
 *
 * Simulates N concurrent players + 1 GM going through a complete game.
 * Validates server stability and measures socket event latency.
 *
 * Prerequisites:
 *   - Server running with GM_USERNAMES=stress_gm
 *   - PostgreSQL running
 *
 * Usage:
 *   node tests/stress-test.js [--cleanup]
 *
 * Environment variables:
 *   TEST_SERVER_URL    (default: http://localhost:3000)
 *   TEST_ROUNDS        (default: 2)
 *   TEST_PLAYER_COUNT  (default: 50)
 */

const { io } = require('socket.io-client');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const SERVER_URL   = process.env.TEST_SERVER_URL   || 'http://localhost:3000';
const ROUNDS       = parseInt(process.env.TEST_ROUNDS       || '2', 10);
const PLAYER_COUNT = parseInt(process.env.TEST_PLAYER_COUNT || '50', 10);
const GM_USERNAME  = 'stress_gm';
const BOT_PASSWORD = 'stresstest123';
const CLEANUP      = process.argv.includes('--cleanup');

// Timeouts
const EVENT_TIMEOUT_MS      = 120_000; // 2 min per event wait
const MOVEMENT_A_TIMEOUT_MS = 300_000; // 5 min max for Movement A (turn delays)

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const bots    = [];      // { username, token, userId, socket, team, groupId, groupMembers, isGm }
let gmBot     = null;
let hostBot   = null;
let lobbyId   = null;
let gameId    = null;
const errors  = [];
const metrics = {};      // { eventName: { times: [ms], sentAt: number } }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function api(method, path, body, token) {
  const url = `${SERVER_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!res.ok && res.status !== 400) {
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return { status: res.status, data };
}

function createSocket(token) {
  return io(SERVER_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: false,
    timeout: 10_000,
  });
}

function waitForEvent(socket, event, timeoutMs = EVENT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timeout waiting for '${event}' (${timeoutMs}ms)`));
    }, timeoutMs);
    function handler(data) {
      clearTimeout(timer);
      resolve(data);
    }
    socket.once(event, handler);
  });
}

function waitForAllBots(event, filter = () => true, timeoutMs = EVENT_TIMEOUT_MS) {
  const targets = bots.filter(b => !b.isGm && filter(b));
  return Promise.all(targets.map(bot =>
    waitForEvent(bot.socket, event, timeoutMs)
  ));
}

function emitWithAck(socket, event, payload) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout: ${event} ack`)), 30_000);
    socket.emit(event, payload, (response) => {
      clearTimeout(timer);
      if (response?.error) reject(new Error(response.error));
      else resolve(response);
    });
  });
}

function recordMetric(name, sentAt) {
  if (!metrics[name]) metrics[name] = { times: [] };
  metrics[name].times.push(Date.now() - sentAt);
}

function startMetric(name) {
  if (!metrics[name]) metrics[name] = { times: [] };
  metrics[name]._sentAt = Date.now();
}

function endMetric(name) {
  if (metrics[name]?._sentAt) {
    metrics[name].times.push(Date.now() - metrics[name]._sentAt);
    delete metrics[name]._sentAt;
  }
}

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function decodeJwtPayload(token) {
  const payload = token.split('.')[1];
  return JSON.parse(Buffer.from(payload, 'base64').toString());
}

// ---------------------------------------------------------------------------
// Phase 1 — Register & login bots
// ---------------------------------------------------------------------------
async function setupBots() {
  log(`Registering ${PLAYER_COUNT + 1} bots...`);

  const botConfigs = [];
  for (let i = 0; i < PLAYER_COUNT; i++) {
    botConfigs.push({ username: `stress_bot_${i}`, password: BOT_PASSWORD });
  }
  botConfigs.push({ username: GM_USERNAME, password: BOT_PASSWORD });

  // Register all (ignore 400 if already exists)
  await Promise.all(botConfigs.map(async ({ username, password }) => {
    try {
      await api('POST', '/api/users/register', { username, password });
    } catch {
      // Already exists — will login next
    }
  }));

  // Login all
  const loginResults = await Promise.all(botConfigs.map(async ({ username, password }) => {
    const { data } = await api('POST', '/api/users/login', { username, password });
    const decoded = decodeJwtPayload(data.token);
    return {
      username,
      token:  data.token,
      userId: String(decoded.sub),
      socket: null,
      team:   null,
      groupId: null,
      groupMembers: [],
      isGm: username === GM_USERNAME,
    };
  }));

  for (const bot of loginResults) {
    bots.push(bot);
    if (bot.username === GM_USERNAME) gmBot = bot;
    if (bot.username === 'stress_bot_0') hostBot = bot;
  }

  log(`All ${bots.length} bots logged in.`);
}

// ---------------------------------------------------------------------------
// Phase 2 — Create lobby & join
// ---------------------------------------------------------------------------
async function createAndJoinLobby() {
  // max_players must be multiple of 5 and >= total bots (players + GM)
  const totalBots = PLAYER_COUNT + 1;
  const maxPlayers = Math.ceil(totalBots / 5) * 5;

  log(`Host creating lobby (max_players=${maxPlayers})...`);
  const { data } = await api('POST', '/api/lobbies', {
    name: `Stress Test ${Date.now()}`,
    max_players: maxPlayers,
  }, hostBot.token);
  lobbyId = String(data.lobby.id);
  log(`Lobby ${lobbyId} created.`);

  // All OTHER bots join (host already joined on create)
  const others = bots.filter(b => b !== hostBot);
  log(`${others.length} bots joining lobby...`);
  await Promise.all(others.map(bot =>
    api('POST', `/api/lobbies/${lobbyId}/join`, null, bot.token)
  ));
  log('All bots joined lobby.');
}

// ---------------------------------------------------------------------------
// Phase 3 — Connect sockets & join room
// ---------------------------------------------------------------------------
async function connectSockets() {
  log('Connecting sockets...');

  await Promise.all(bots.map(bot => new Promise((resolve, reject) => {
    const socket = createSocket(bot.token);
    bot.socket = socket;

    const timer = setTimeout(() => reject(new Error(`Socket connect timeout: ${bot.username}`)), 15_000);
    socket.on('connect', () => { clearTimeout(timer); resolve(); });
    socket.on('connect_error', (err) => { clearTimeout(timer); reject(err); });
    socket.on('error', (err) => { errors.push(`${bot.username} socket error: ${err.message}`); });
  })));

  log('All sockets connected. Joining lobby room...');

  startMetric('joinRoom');
  await Promise.all(bots.map(bot => emitWithAck(bot.socket, 'joinRoom', { lobbyId })));
  endMetric('joinRoom');

  log('All bots in lobby room.');
}

// ---------------------------------------------------------------------------
// Phase 4 — Start game
// ---------------------------------------------------------------------------
async function startGame() {
  log('Starting game...');

  // Set up listeners BEFORE emitting startGame
  const rolePromises = bots.map(bot => waitForEvent(bot.socket, 'roleAssigned'));
  const gameStartedPromises = bots.map(bot => waitForEvent(bot.socket, 'gameStarted'));

  startMetric('roleAssigned');

  // Host (or GM) starts the game
  const starter = gmBot; // GM starts if GM_USERNAMES is configured
  const ack = await emitWithAck(starter.socket, 'startGame', { lobbyId });
  gameId = String(ack.gameId);
  log(`Game ${gameId} created.`);

  // Wait for all roleAssigned
  const roles = await Promise.all(rolePromises);
  endMetric('roleAssigned');

  // Store role data per bot
  roles.forEach((role, i) => {
    bots[i].team         = role.team;
    bots[i].groupId      = role.groupId ? String(role.groupId) : null;
    bots[i].groupMembers = role.groupMembers || [];
    bots[i].isGm         = role.isGm || false;
  });

  // Wait for gameStarted
  await Promise.all(gameStartedPromises);

  const playerBots = bots.filter(b => !b.isGm);
  const phosCount = playerBots.filter(b => b.team === 'phos').length;
  const skotiaCount = playerBots.filter(b => b.team === 'skotia').length;
  const groupCount = new Set(playerBots.map(b => b.groupId)).size;
  log(`Roles assigned: ${phosCount} Phos, ${skotiaCount} Skotia, ${groupCount} groups.`);
}

// ---------------------------------------------------------------------------
// Phase 5 — GM advance helper
// ---------------------------------------------------------------------------
async function gmAdvance(expectedStep) {
  const ack = await emitWithAck(gmBot.socket, 'gmAdvance', { gameId });
  if (ack?.step && expectedStep && ack.step !== expectedStep) {
    log(`  Warning: expected step '${expectedStep}', got '${ack.step}'`);
  }
  return ack;
}

// ---------------------------------------------------------------------------
// Phase 6 — Movement A (Impostor Stage)
// ---------------------------------------------------------------------------
async function runMovementA(roundNum) {
  log(`  Round ${roundNum} — Movement A: activating...`);

  // Set up listeners for movementStart BEFORE advancing
  const playerBots = bots.filter(b => !b.isGm);
  const movStartPromises = playerBots.map(b => waitForEvent(b.socket, 'movementStart'));

  await gmAdvance('activateA');

  // Wait for movementStart on all player bots
  const movData = await Promise.all(movStartPromises);

  // Update group info (reshuffled on new rounds)
  movData.forEach((data, i) => {
    if (data.groupId) {
      playerBots[i].groupId      = String(data.groupId);
      playerBots[i].groupMembers = data.groupMembers || playerBots[i].groupMembers;
    }
  });

  log('  Movement A active. Bots joining group rooms...');

  // Each player joins their group room to receive turnStart events
  await Promise.all(playerBots.map(bot =>
    emitWithAck(bot.socket, 'joinRoom', { lobbyId: bot.groupId })
  ));

  log('  Handling turns (this may take a few minutes due to reveal delays)...');

  // Group bots by groupId
  const groups = new Map();
  for (const bot of playerBots) {
    if (!groups.has(bot.groupId)) groups.set(bot.groupId, []);
    groups.get(bot.groupId).push(bot);
  }

  // For each group, handle turns concurrently
  const groupPromises = [...groups.entries()].map(([groupId, groupBots]) =>
    handleGroupTurns(groupId, groupBots)
  );

  await Promise.all(groupPromises);

  log('  All groups done. GM advancing past Movement A...');
  await gmAdvance('completeA');
  log('  Movement A complete.');
}

async function handleGroupTurns(groupId, groupBots) {
  const botMap = new Map(groupBots.map(b => [b.userId, b]));
  let deliberationReceived = false;

  // Set up deliberationStart listener
  const deliberationPromise = new Promise((resolve) => {
    for (const bot of groupBots) {
      bot.socket.on('deliberationStart', () => {
        deliberationReceived = true;
        resolve();
      });
    }
  });

  // Handle turns: wait for turnStart, if it's our turn, submit
  const turnHandler = async () => {
    while (!deliberationReceived) {
      // Wait for turnStart on any bot in this group
      const turnData = await Promise.race([
        ...groupBots.map(b => waitForEvent(b.socket, 'turnStart', MOVEMENT_A_TIMEOUT_MS)),
        deliberationPromise.then(() => null),
      ]);

      if (!turnData || deliberationReceived) break;

      const currentPlayerId = String(turnData.currentPlayerId);
      const currentBot = botMap.get(currentPlayerId);

      if (currentBot) {
        try {
          await api('POST', `/api/games/${gameId}/movement-a/submit/word`,
            { word: `test_${currentBot.username}` },
            currentBot.token
          );
        } catch (err) {
          errors.push(`Turn submit error (${currentBot.username}): ${err.message}`);
        }
      }

      // Wait a moment for the reveal delay to trigger next turn
      // The server fires next turnStart after ~30s minus elapsed
      await new Promise(r => setTimeout(r, 500));
    }
  };

  // Race: turn handling vs deliberation
  await Promise.race([
    turnHandler(),
    deliberationPromise,
  ]);

  // Clean up listeners
  for (const bot of groupBots) {
    bot.socket.removeAllListeners('deliberationStart');
  }
}

// ---------------------------------------------------------------------------
// Phase 7 — Movement C (Voting Stage)
// ---------------------------------------------------------------------------
async function runMovementC(roundNum) {
  log(`  Round ${roundNum} — Movement C: activating...`);

  const playerBots = bots.filter(b => !b.isGm);
  const movStartPromises = playerBots.map(b => waitForEvent(b.socket, 'movementStart'));

  await gmAdvance('activateC');

  await Promise.all(movStartPromises);
  log('  Movement C active. Bots submitting votes...');

  // Each bot votes: 'skotia' for one random non-self member, 'phos' for the rest
  await Promise.all(playerBots.map(async (bot) => {
    const others = bot.groupMembers
      .map(m => String(m.id))
      .filter(id => id !== bot.userId);

    if (others.length === 0) return;

    const votes = {};
    const targetIdx = Math.floor(Math.random() * others.length);
    others.forEach((id, i) => {
      votes[id] = i === targetIdx ? 'skotia' : 'phos';
    });

    try {
      await api('POST', `/api/games/${gameId}/movement-c/vote`, { votes }, bot.token);
    } catch (err) {
      errors.push(`Vote error (${bot.username}): ${err.message}`);
    }
  }));

  log('  All votes submitted. GM resolving votes...');

  // Set up listeners for votingComplete before advancing
  const vcPromises = playerBots.map(b => waitForEvent(b.socket, 'votingComplete'));
  startMetric('votingComplete');

  await gmAdvance('completeC');

  await Promise.all(vcPromises);
  endMetric('votingComplete');

  log('  Votes resolved.');
}

// ---------------------------------------------------------------------------
// Phase 8 — Movement B (Challenges Stage)
// ---------------------------------------------------------------------------
async function runMovementB(roundNum) {
  log(`  Round ${roundNum} — Movement B: activating...`);

  const playerBots = bots.filter(b => !b.isGm);
  const movStartPromises = playerBots.map(b => waitForEvent(b.socket, 'movementStart'));

  await gmAdvance('activateB');

  await Promise.all(movStartPromises);
  log('  Movement B active. Waiting 3 seconds...');

  await new Promise(r => setTimeout(r, 3000));

  log('  GM advancing past Movement B...');
  await gmAdvance('completeB');
  log('  Movement B complete.');
}

// ---------------------------------------------------------------------------
// Phase 9 — Round summary + next round / game over
// ---------------------------------------------------------------------------
async function runSummary(roundNum, isFinal) {
  log(`  Round ${roundNum} — Summarizing...`);

  const playerBots = bots.filter(b => !b.isGm);
  const summaryPromises = playerBots.map(b => waitForEvent(b.socket, 'roundSummary'));
  startMetric('roundSummary');

  await gmAdvance('summarizeRound');

  const summaries = await Promise.all(summaryPromises);
  endMetric('roundSummary');

  const summary = summaries[0];
  log(`  Summary: Phos +${summary?.phosPoints ?? 0}, Skotia +${summary?.skotiaPoints ?? 0}, ` +
      `${summary?.susApplied ?? 0} sus'd, ${summary?.clearedApplied ?? 0} cleared`);

  if (isFinal) {
    log('  Final round — game over...');
    const gameOverPromises = bots.map(b => waitForEvent(b.socket, 'gameOver'));
    startMetric('gameOver');

    await gmAdvance('gameOver');

    const results = await Promise.all(gameOverPromises);
    endMetric('gameOver');

    const result = results[0];
    log(`  GAME OVER: ${result.winner} wins by ${result.condition}! ` +
        `Phos: ${result.phosPoints}, Skotia: ${result.skotiaPoints}`);
  } else {
    log('  Advancing to next round...');
    const setupPromises = playerBots.map(b => waitForEvent(b.socket, 'roundSetup'));

    await gmAdvance('nextRound');

    const setups = await Promise.all(setupPromises);

    // Update bot group info for next round
    setups.forEach((setup, i) => {
      if (setup.groupId) {
        playerBots[i].groupId      = String(setup.groupId);
        playerBots[i].groupMembers = setup.groupMembers || [];
      }
    });

    log(`  Round ${roundNum + 1} set up.`);
  }
}

// ---------------------------------------------------------------------------
// Phase 10 — Metrics output
// ---------------------------------------------------------------------------
function printMetrics(totalDuration) {
  console.log('\n=== STRESS TEST RESULTS ===');
  console.log(`Players:          ${PLAYER_COUNT}`);
  console.log(`Rounds:           ${ROUNDS}`);
  console.log(`Total duration:   ${(totalDuration / 1000).toFixed(1)}s`);
  console.log('');

  console.log('Event latencies (ms):');
  for (const [name, data] of Object.entries(metrics)) {
    if (data.times.length === 0) continue;
    const avg = Math.round(data.times.reduce((a, b) => a + b, 0) / data.times.length);
    const max = Math.max(...data.times);
    console.log(`  ${name.padEnd(35)} ${String(avg).padStart(5)} avg / ${String(max).padStart(5)} max`);
  }
  console.log('');

  if (errors.length > 0) {
    console.log(`Errors:           ${errors.length}`);
    errors.forEach(e => console.log(`  - ${e}`));
  } else {
    console.log('Errors:           0');
  }
  console.log('===========================\n');
}

// ---------------------------------------------------------------------------
// Phase 11 — Cleanup
// ---------------------------------------------------------------------------
async function cleanup() {
  log('Disconnecting sockets...');
  for (const bot of bots) {
    if (bot.socket?.connected) {
      bot.socket.disconnect();
    }
  }

  if (CLEANUP) {
    log('Cleaning up: force-ending lobby...');
    try {
      await api('POST', `/api/lobbies/${lobbyId}/force-end`, null, hostBot.token);
    } catch {
      // Lobby may already be ended
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const startTime = Date.now();

  try {
    await setupBots();
    await createAndJoinLobby();
    await connectSockets();
    await startGame();

    for (let round = 1; round <= ROUNDS; round++) {
      log(`\n--- ROUND ${round} of ${ROUNDS} ---`);
      const isFinal = round === ROUNDS;

      await runMovementA(round);
      await runMovementC(round);
      await runMovementB(round);
      await runSummary(round, isFinal);
    }

    const totalDuration = Date.now() - startTime;
    printMetrics(totalDuration);

    await cleanup();

    if (errors.length > 0) {
      log(`Completed with ${errors.length} error(s).`);
      process.exit(1);
    } else {
      log('Stress test completed successfully!');
      process.exit(0);
    }
  } catch (err) {
    console.error('\nFATAL ERROR:', err.message);
    console.error(err.stack);
    await cleanup().catch(() => {});
    process.exit(1);
  }
}

main();
