# Agent Task Queue

> This file is the authoritative task backlog for AI coding agents.
> Work through tasks **in order** — later tasks depend on earlier ones within the same group.
> Each task lists the exact files to touch, the precise change needed, and acceptance criteria.
> Mark a task `[x]` when it is fully implemented and verified.
>
> **Last updated:** 2026-03-01

---

## ✅ TASK 1 — Stage Naming Refactor + Movement Order Swap *(COMPLETE)*

> **Do this task first** before touching any game logic.  
> Later tasks reference the renamed stages, so naming must be canonical before they are implemented.

### 1A — Create shared movement name constants

**Goal:** Replace all hard-coded "Movement A / B / C" UI strings with named constants so the display
names can be changed in one place without hunting through every screen.

**Internal identifiers stay unchanged:** The DB column `movement_type CHAR(1)` values `'A'`, `'B'`,
`'C'` and all socket payload keys (`movement: 'A'`) must NOT change — they are wire-format contracts.
Only human-visible label strings change.

**Stage mapping:**
| Internal key | New display name |
|---|---|
| `'A'` | `"Impostor Stage"` |
| `'B'` | `"Challenges Stage"` |
| `'C'` | `"Voting Stage"` |

**Files to create:**

1. `client/constants/movementNames.js`
```js
// Human-readable names for each movement type.
// Internal DB/socket values ('A', 'B', 'C') must not change.
export const MOVEMENT_NAMES = {
  A: 'Impostor Stage',
  B: 'Challenges Stage',
  C: 'Voting Stage',
};

// Short labels used in compact UI (e.g. progress indicators)
export const MOVEMENT_LABELS_SHORT = {
  A: 'Impostor',
  B: 'Challenges',
  C: 'Voting',
};
```

2. `server/utils/movementNames.js`
```js
const MOVEMENT_NAMES = {
  A: 'Impostor Stage',
  B: 'Challenges Stage',
  C: 'Voting Stage',
};
module.exports = { MOVEMENT_NAMES };
```

**Files to update (replace all hard-coded movement label strings with the constants):**
- `client/screens/game/MovementAScreen.js` — any title/header that says "Movement A"
- `client/screens/game/MovementBScreen.js` — any title/header that says "Movement B" / "Task Phase"
- `client/screens/game/VotingScreen.js` — any title/header that says "Movement C" / "Voting"
- `client/screens/game/RoundHubScreen.js` — movement progress indicators
- `client/screens/game/GmDashboardScreen.js` — movement labels shown to GM
- `client/screens/game/RoundSummaryScreen.js` — "Round X complete" movement list
- `server/websocket/lobbySocket.js` — any `console.log` or socket payload comments (non-functional, cosmetic)

**Acceptance criteria:**
- [x] `MOVEMENT_NAMES` imported from the new constants file wherever a stage label is displayed
- [x] No hard-coded strings "Movement A", "Movement B", "Movement C" remain in client UI code
- [x] All existing tests (manual) still pass — no runtime errors from the rename

---

### 1B — Swap Voting Stage to before Challenges Stage (A → C → B)

> Depends on: **1A is complete**

**Goal:** Change the round progression from `A → B → C` to `A → C → B` so voting happens before
challenges. This lets marked ("Sus") players suffer a challenge penalty (Task 2) because marks are
known before challenges start.

**Voting resolution timing change:**  
Currently `_resolveVoting()` is called at the `summarizeRound` step (after all three movements).
In the new order, votes must be resolved **immediately at the end of Movement C** (which is now the
second movement), so that `is_marked` is up-to-date before Movement B (Challenges) begins.

#### Server — `server/services/gameService.js`

Rewrite the `advanceMovement()` state machine steps to follow the new order.
Current order:
```
activateA → completeA → activateB → completeB → activateC → completeC → summarizeRound → nextRound/gameOver
```
New order:
```
activateA → completeA → activateC → completeC+resolveVoting → activateB → completeB → summarizeRound → nextRound/gameOver
```

**Exact changes in `advanceMovement()`:**

1. **Remove** the `activateB` guard that triggers when `movA.status === 'completed' && !movB`.
2. **Add** an `activateC` guard that triggers when `movA.status === 'completed' && !movC && !movB`.
   This is the new second step (was the fourth).
3. **Move** the `completeC` block to be the third step (was the sixth).
   At `completeC`, call `_resolveVoting()` inside the transaction (exactly as
   `summarizeRound` currently does), apply mark results, award points, check supermajority,
   and set `roundStatus` to a new intermediate status or just proceed.
   Return `step: 'completeC'` with the voting result embedded so `emitAdvanceEvents` can
   emit `votingComplete` and `roundSummary` to clients **before** challenges start.
4. **Add** `activateB` guard: triggers when `movC.status === 'completed' && !movB`.
   This is the new fourth step. Insert Movement B as `active`. Schedule the 5-minute
   auto-advance timer. Return `step: 'activateB'`.
5. **`completeB`** stays the same (fifth step). Award Skotia passive bonus here as before.
6. **`summarizeRound`** now runs after B completes. It no longer calls `_resolveVoting()` —
   voting was already resolved in step 3. It only calls `_buildSummary()` using the data
   that was stored (pass voting result through round metadata or re-query). 
   Return `step: 'summarizeRound'` with the pre-built summary.
7. **`nextRound` / `gameOver`** — unchanged logic but update round's starting movement to `A`.

> **Tip:** The cleanest approach for the summary at step 6 is to store the voting result JSON
> in a new nullable column `rounds.voting_summary JSONB` when votes are resolved at step 3,
> then read it at step 6. Add the column to `dbInit.js` via `ALTER TABLE IF NOT EXISTS` or
> just add it to the `CREATE TABLE IF NOT EXISTS rounds` block with `DEFAULT NULL`.

#### Server — `server/websocket/lobbySocket.js` `emitAdvanceEvents()`

The `emitAdvanceEvents` function has a `switch (result.step)` block that translates each step into
socket emissions. Update it to match the new step order:

- `activateC` (new second step) → emit `movementStart { movement: 'C' }` to lobby room
- `completeC` (new third step) → emit `votingComplete` per group + `roundSummary` to lobby
  (same emissions that currently happen at `summarizeRound`, move them here)
- `activateB` (new fourth step) → emit `movementStart { movement: 'B', movementBEndsAt }` to lobby
- `completeB` (fifth step) → no client-facing emission needed (timer fires or GM forced)
- `summarizeRound` (sixth step) — **remove** voting-related emissions (already sent at `completeC`)

#### Client — `client/App.js`

The `targetScreen` mapping in the `GameSync` polling block currently maps:
```js
stateData.currentMovement === 'B' ? 'movementB' :
stateData.currentMovement === 'C' ? 'movementC' :
```
This mapping is by letter, not by position, so it should continue to work without changes as long as
the server still emits the same `movement: 'B'` and `movement: 'C'` keys.

Verify that `RoundHubScreen.js` renders movement progress indicators in the correct new order:
A → C → B (not A → B → C). Update the order of the progress dots/chips if they are hard-coded.

#### Client — `client/hooks/useGameState.js`

Verify `handleMovementReady` and related handlers correctly handle the new emission sequence
(A complete → C start → C complete + round summary → B start → B complete → summarize).
The key concern is that `handleRoundSummary` is currently called after C; in the new model it
is called after C resolves (which is now mid-round), and the player should **not** navigate to
`roundSummary` screen until after B completes. Update the handler logic accordingly:
- `votingComplete` and its marks update → update UI only (no screen transition)
- `roundSummary` socket event → only trigger navigation to `roundSummary` screen
- Ensure the existing `movementStart { movement: 'B' }` → navigate to movementB screen

**Acceptance criteria:**
- [x] A full round follows the order: Impostor Stage → Voting Stage → Challenges Stage
- [x] Marks are applied before Challenges begin (vote resolution is visible on RoundHub before B)
- [x] Round Summary screen appears after Challenges complete, not after Voting
- [x] Game still progresses to next round / game over correctly
- [x] Supermajority check still works (it's part of the old `summarizeRound`; move the check into
      the new `completeC` resolution block)

---

## ✅ TASK 2 — Sus Penalty During Challenges Stage *(COMPLETE)*

> Depends on: **Task 1B complete** (voting must now precede challenges so marks are active)

**Goal:** Players who are currently marked ("Sus") earn reduced task points during Movement B
(Challenges Stage). This creates mechanical stakes from the Voting Stage.

### Server — `server/services/gameService.js`

Add a new point constant:
```js
MARKED_CHALLENGE_MULTIPLIER: 0.5,  // Sus players earn 50% of normal task points
```

### Server — `server/routes/gameRoutes.js` (task completion endpoint)

The `POST /api/lobbies/:id/tasks/complete` route (in `lobbyRoutes.js`) and/or any future
Movement B task completion route must:
1. Look up `game_players.is_marked` for the player in the active game.
2. If `is_marked = true`, multiply `pointsEarned` by `POINTS.MARKED_CHALLENGE_MULTIPLIER`
   before inserting into `player_task_completions` and before awarding team points.
3. Return `{ pointsEarned, isSusPenaltyApplied: true/false }` in the response body so the
   client can display a "Sus penalty applied" message.

Note: the current stub awards points via `player_task_completions`; the actual Movement B task
flow is not yet implemented (see `CLAUDE.md` "What Still Needs to Be Built"). This penalty logic
should be wired in when Movement B task assignment is implemented. Add a `// TODO(sus-penalty)`
comment in `gameRoutes.js` at the task completion handler so it is obvious where to wire it in.

### Client — `client/screens/game/MovementBScreen.js`

When the task completion response includes `isSusPenaltyApplied: true`, display a brief toast or
inline UI note: "⚠️ Sus penalty: 50% points" in `colors.primary.neonRed`.

**Acceptance criteria:**
- [x] Sus players earn 50% of task points compared to clear players
- [x] `isSusPenaltyApplied` is present in the task completion API response
- [x] Client shows a visual indicator when the penalty was applied
- [x] Non-Sus players are unaffected

---

## ✅ TASK 3 — Rename "Marked" → "Sus" with Among Us Icon *(COMPLETE)*

> Can be done independently of Tasks 1 and 2 (display-only change).
> Internal DB column `is_marked`, API field `isMarked`, and socket payload key `isMarked` **must NOT change**.

### 3A — Create a reusable `SusIcon` component

**Create `client/components/SusIcon.js`**

Render a small Among Us crewmate silhouette SVG inline. Use `react-native-svg`. The icon should:
- Accept `size` prop (default `16`), `color` prop (default `colors.primary.neonRed`)
- Be usable inline next to text (`<SusIcon size={14} />`)
- The crewmate shape: a rounded rectangle body + visor oval + backpack bump (simple 3-shape SVG)

Suggested SVG shapes (adjust as needed for aesthetics):
```
- Body: rounded rect ~40% wide, 55% tall, centered
- Visor: ellipse ~30% wide, 20% tall, upper third of body, slightly different color (semi-transparent white)
- Backpack: small rect on the right side of body
```

### 3B — Replace all "Marked" / "marked" display strings in client screens

Search for every place the UI shows the word "Marked" or uses `isMarked` as a display label.
Replace with "Sus" and append `<SusIcon />` next to the text.

**Files to audit and update:**
- `client/screens/game/RoundHubScreen.js` — "You are Marked" / "You are not Marked" status banner
- `client/screens/game/VotingScreen.js` — player list shows marked indicator
- `client/screens/game/MovementAScreen.js` — `groupMembers` list `isMarked` badge
- `client/screens/game/RoundSummaryScreen.js` — "X marks applied" → "X Sus applied"
- `client/screens/game/GmDashboardScreen.js` — GM player table "Marked" column header
- `client/screens/lobby/LobbyScreen.js` — if marked status is shown in pre-round lobby

**String replacement examples:**
| Old text | New text |
|---|---|
| `"Marked"` | `"Sus"` |
| `"You are marked"` | `"You are Sus"` |
| `"Not marked"` | `"Clear"` |
| `"marks applied"` | `"players Sus'd"` |
| `"mark"` (action verb in summary) | `"Sus"` |
| `"unmark"` | `"Cleared"` |

**API/socket payload strings (DO NOT rename):**
- `isMarked` prop name → keep
- `is_marked` DB column → keep
- `action: 'mark'` / `action: 'unmark'` in socket payloads → keep

**Acceptance criteria:**
- [x] `SusIcon` component renders correctly at 12, 16, and 24px
- [x] No user-visible occurrence of the word "Marked" remains (except in dev/console logs)
- [x] The word "Sus" and the crewmate icon appear wherever mark status was previously shown
- [x] Internal identifiers (`isMarked`, `is_marked`, `action: 'mark'`) are unchanged

---

## ✅ TASK 4 — Skotia Balance Improvements *(COMPLETE)*

> Can be implemented after Task 1B (which establishes the new round order).

**Context:** The Phos:Skotia ratio is ~4:1 per group (exactly 4 Phos + 1 Skotia per group of 5).
With 4 voters versus 1 deceiver per group, Skotia is structurally disadvantaged. This task adds
mechanical advantages to make Skotia wins achievable.

### 4A — Skotia Survival Bonus (server change)

**Goal:** Award Skotia bonus points for each Skotia member that ends a Voting Stage **un-Sus'd**.

**Where to implement:** `server/services/gameService.js`, inside the vote resolution block
(currently `_resolveVoting`, called at `summarizeRound`; after Task 1B this moves to `completeC`).

After votes are resolved and marks applied, run:
```js
const POINTS = {
  // ... existing constants ...
  SKOTIA_SURVIVAL_PER_PLAYER: 100, // NEW — per undetected Skotia per voting round
};

// Count Skotia players who are NOT marked after this round's voting
const survivalRes = await client.query(
  `SELECT COUNT(*) AS count
   FROM game_players
   WHERE game_id = $1 AND team = 'skotia' AND is_marked = false`,
  [gameId]
);
const survivingSkotia = parseInt(survivalRes.rows[0].count, 10);
const survivalBonus = survivingSkotia * POINTS.SKOTIA_SURVIVAL_PER_PLAYER;
if (survivalBonus > 0) {
  await client.query(
    "UPDATE game_teams SET points = points + $1 WHERE game_id = $2 AND team = 'skotia'",
    [survivalBonus, gameId]
  );
}
```

Include `survivalBonus` and `survivingSkotia` in the round summary payload so clients can display it.

### 4B — Reduce Phos false-mark reward (server change)

Reduce the benefit of randomly marking everyone by lowering the reward for mistakes:
```js
// In POINTS constant in server/services/gameService.js:
CORRECT_MARK:   200,  // unchanged
FALSE_MARK:     100,  // was 150 — lowered to reduce random-marking incentive
CORRECT_UNMARK: 150,  // unchanged
FALSE_UNMARK:   200,  // unchanged
```

Rationale: if Phos marks everyone hoping to catch Skotia, incorrect marks used to generate points
for Skotia (good), but the rate should be adjusted so that careless mass-marking is slightly less
rewarding for Skotia too (since Skotia didn't do anything to earn those marks).

### 4C — Lower supermajority threshold

```js
// In _checkSupermajority():
// Was: >= 0.80 (80% of Skotia marked → instant Phos win)
// New: >= 0.75 (75% threshold — slightly harder for Phos to trigger instant win)
return parseInt(marked_skotia, 10) / parseInt(total_skotia, 10) >= 0.75;
```

This gives Skotia slightly more margin before a supermajority loss.

### 4D — Display Skotia survival bonus in Round Summary

**File:** `client/screens/game/RoundSummaryScreen.js`

If `summary.survivalBonus > 0`, show a line: "🌑 Skotia survival bonus: +{survivalBonus} pts
({summary.survivingSkotia} members undetected)"

**Acceptance criteria:**
- [x] Surviving Skotia members earn `+100` pts per round they go undetected
- [x] `FALSE_MARK` point award is `100` (not `150`)
- [x] Supermajority threshold is `0.75`
- [x] Round summary screen shows survival bonus when applicable

---

## ✅ TASK 5 — Stress Test Client *(COMPLETE)*

> This is a standalone test utility. No production code changes required.

**Goal:** A Node.js script that simulates 50 concurrent players + 1 GM going through a complete
game to validate server stability and measure latency at scale.

### Create `server/tests/stress-test.js`

**Dependencies to add to `server/package.json` (devDependencies):**
```json
"socket.io-client": "^4.x",
"node-fetch": "^3.x"
```

**Script behavior:**

1. **Setup phase**
   - Read server URL from env var `TEST_SERVER_URL` (default `http://localhost:3000`)
   - Read `TEST_ROUNDS` (default `2`) and `TEST_PLAYER_COUNT` (default `50`)
   - Register `TEST_PLAYER_COUNT + 1` bot accounts via `POST /api/users/register`
     (usernames: `stress_bot_0` … `stress_bot_N`, `stress_gm`)
   - Login each bot and store their JWT tokens
   - `stress_bot_0` acts as host; `stress_gm` uses a username in `GM_USERNAMES` (configure
     `ADMIN_USERNAMES` env var or add `stress_gm` to `GM_USERNAMES` in test setup)

2. **Lobby phase**
   - Host (`stress_bot_0`) creates a lobby via `POST /api/lobbies`
   - All bots join via `POST /api/lobbies/:id/join`
   - All bots open a `socket.io-client` connection and emit `joinRoom { lobbyId }`
   - Measure: time from first `joinRoom` to all sockets receiving `lobbyUpdate` with all bots connected

3. **Game start**
   - Host emits `startGame { lobbyId }`
   - All bots listen for `roleAssigned` — measure latency (time from emit to last `roleAssigned` received)
   - All bots listen for `gameStarted`

4. **Impostor Stage (Movement A) — per round**
   - GM emits `gmAdvance { gameId }` (activateA)
   - Bots receive `turnStart { currentPlayerId }` on their group socket room
   - The bot whose `userId === currentPlayerId` submits `POST /api/games/:id/movement-a/submit { word: 'test' }`
   - Continue until all bots in each group have submitted (`deliberationStart` received)
   - GM emits `gmAdvance` (completeA)

5. **Voting Stage (Movement C) — per round** *(after Task 1B this is now second)*
   - GM emits `gmAdvance` (activateC)
   - Each bot submits votes via `POST /api/games/:id/movement-c/vote`
     (vote `'skotia'` for one random group member, `'phos'` for all others)
   - GM emits `gmAdvance` (completeC + resolve)
   - Bots receive `votingComplete` — measure latency

6. **Challenges Stage (Movement B) — per round** *(after Task 1B this is now third)*
   - GM emits `gmAdvance` (activateB)
   - Wait 3 seconds (simulate players doing tasks)
   - GM emits `gmAdvance` (completeB)

7. **Round summary / next round**
   - GM emits `gmAdvance` (summarizeRound)
   - Bots receive `roundSummary`
   - If more rounds: GM emits `gmAdvance` (nextRound) → bots receive `movementStart { movement: 'A' }` → repeat from step 4
   - If final round: GM emits `gmAdvance` (gameOver) → bots receive `gameOver`

8. **Metrics output**
   Print a table at the end:
   ```
   === STRESS TEST RESULTS ===
   Players:          50
   Rounds:           2
   Total duration:   Xs
   
   Event latencies (ms):
     roleAssigned (all received):     ___ avg / ___ max
     votingComplete (all received):   ___ avg / ___ max
     roundSummary (all received):     ___ avg / ___ max
     gameOver (all received):         ___ avg / ___ max
   
   Errors:           N (list any socket errors or failed HTTP requests)
   ```

9. **Cleanup**
   - After the game ends, optionally delete the test lobby and test user accounts.
   - Add a `--cleanup` flag to delete accounts via `DELETE /api/users` (admin endpoint, add if missing).

**Create `server/tests/README.md`** with instructions:
```
# Stress Test

## Setup
1. Start the server: `npm run dev` (in server/)
2. Ensure TEST_PLAYER_COUNT bots can be registered (no rate limiting in dev)
3. Run: node tests/stress-test.js

## Environment variables
TEST_SERVER_URL=http://localhost:3000
TEST_ROUNDS=2
TEST_PLAYER_COUNT=50
```

**Acceptance criteria:**
- [x] Script creates 50 bots, has them go through a 2-round game without errors
- [x] Metrics are printed after completion
- [x] All socket connections clean up on game over (no orphaned connections)
- [x] Script exits with code `0` on success, `1` if any fatal errors occurred

---

## ✅ TASK 6 — Clean Up Sprites *(COMPLETE)*

> This is a standalone polish task with no dependencies.

**File:** `client/components/TaskSprite.js`

**Goal:** Audit and clean up the inline SVG sprite definitions for consistency, correctness, and
readability. Do NOT change game behavior or task IDs.

### 6A — Structural audit

1. Cross-reference every key in the `SPRITES` object against the `TASK_SPRITE` map exported from
   `client/data/tasks.js`. Identify:
   - Sprites that exist in `SPRITES` but are not referenced by any task (delete or comment out)
   - Task sprite IDs referenced in `tasks.js` but missing from `SPRITES` (add a fallback placeholder)

2. Verify every sprite function renders within the `0 0 32 32` viewBox. Check for any paths
   or shapes that clip outside `[0, 32]` on either axis.

### 6B — Visual consistency

All sprites should follow these rules:
- Background color: use the module-level `BG` constant (`'#0B0C10'`)
- Primary fill: use the `c` argument (team color passed in by caller)
- Accent/fire: use the module-level `FIRE` constant (`'#FFA63D'`)
- No other hard-coded color hex values (except `'none'` for `fill`/`stroke`)
- Stroke width: prefer `1.5` or `2` — avoid values below `1` or above `3`
Audit each sprite and fix any that use raw hex values instead of the above constants.

### 6C — Readability cleanup

- Add a one-line comment above each sprite function describing what it depicts
  (e.g. `// Church building with cross`)
- Group sprites into comment sections: `// ── SCRIPTURE ──`, `// ── TRIVIA ──`, etc.
  (some sections already exist — ensure all sprites are inside a section)
- Remove any sprites with identical or near-identical shapes (consolidate duplicates)

### 6D — Fallback sprite

If the `SPRITES` object does not contain the requested key, the current code likely throws.
Add a `_fallback` sprite (a simple question mark) and update the render function to use it:
```js
const SpriteComponent = SPRITES[spriteKey] || SPRITES['_fallback'];
```

**Acceptance criteria:**
- [x] No sprite keys exist in `SPRITES` that are not used by any task in `tasks.js` (or they are
      explicitly marked with a `// unused` comment explaining why they are kept)
- [x] No sprite uses a hard-coded color hex value other than `BG`, `FIRE`, or `'none'`
- [x] Every sprite has a one-line description comment
- [x] A `_fallback` sprite exists and is used when an unknown key is requested
- [x] All shapes render within the `0 0 32 32` viewBox

---

## TASK 7 — Jonah Bail-Water Task: Pick Up → Fill → Dump Mechanic

> Standalone task. No dependency on other tasks.  
> The `jonah_storm` task currently uses `MECHANIC.RAPID_TAP` (tap 40 times). This task replaces
> that with a custom three-step drag mechanic that physically simulates bailing water.

### Overview of the interaction loop

The player repeats this 3-step cycle **N times** (configurable, default 6) to succeed:

```
Step 1 — PICK UP:   Drag the empty bucket from the ship deck up to the side rail.
Step 2 — FILL:      Hold the bucket over the churning water until it fills (~1.5 s hold).
Step 3 — DUMP:      Drag/fling the full bucket from the rail back over to the other side to dump it.
```

Each completed cycle advances a "water level" gauge downward. Complete all N cycles before the
time limit to win.

---

### 7A — Add the new mechanic constant

**File: `client/data/tasks.js`**

Add `BAIL_WATER` to the `MECHANIC` export object:
```js
export const MECHANIC = {
  // ... existing entries ...
  BAIL_WATER: 'BAIL_WATER',   // Jonah bail-water: pick up → fill → dump loop
};
```

---

### 7B — Update the `jonah_storm` task definition

**File: `client/data/tasks.js`**

Replace the current `jonah_storm` entry (which uses `MECHANIC.RAPID_TAP`) with:
```js
{
  id: 'jonah_storm',
  title: 'Jonah in the Storm',
  synopsis: 'The ship is sinking! Grab the bucket, fill it with seawater, and heave it overboard — fast!',
  reference: 'Jonah 1:4–5',
  mechanic: MECHANIC.BAIL_WATER,
  taskType: TASK_TYPE.FREE_ROAM,
  category: TASK_CATEGORY.CHALLENGES,
  points: { alive: 60, dead: 36 },
  difficulty: 'medium',
  timeLimit: 25,           // seconds — slightly generous to allow learning the gesture
  config: {
    cyclesRequired: 6,     // number of full pick-up→fill→dump cycles to win
    fillDurationMs: 1500,  // ms the player must hold over water to fill bucket
  },
},
```

Also add a proper SVG sprite key to `TASK_SPRITE` (replacing the generic `'🌊'`):
```js
jonah_storm: 'bucket',  // will match a SPRITES entry in TaskSprite.js
```

---

### 7C — Create `BailWaterTask.js`

**Create `client/screens/tasks/mechanics/BailWaterTask.js`**

#### Visual layout (portrait phone, full screen below `TaskHeader`)

```
┌──────────────────────────────┐
│  WATER LEVEL gauge (top)     │  ← vertical bar on left, shows how much bailing remains
│                              │
│    Ship deck scene           │
│    ┌────────────────────┐    │
│    │  stormy ocean waves│    │  ← animated SVG waves (reuse or adapt WaveBackground idea)
│    └────────────────────┘    │
│                              │
│   [ BUCKET ]   [RAIL DROP]   │  ← two hot-zones: bucket start pos (left) + rail/ocean (right)
│                              │
│  Step indicator:             │
│  ○ PICK UP  ○ FILL  ○ DUMP   │  ← 3 dots highlight current step
└──────────────────────────────┘
```

#### State machine

Use a `useState` for `step` (`'pickup' | 'fill' | 'dump' | 'done'`) and `cyclesCompleted`.

```
'pickup':
  - Bucket SVG rendered at BUCKET_START_POS (bottom-left zone)
  - Player uses PanResponder to drag it toward RAIL_ZONE (right side / top-right)
  - On release: if gesture endpoint is within RAIL_ZONE hitbox → advance to 'fill'
  - Else: bucket snaps back to start with a shake animation

'fill':
  - Bucket is docked at the rail, visually tilted over the waves
  - Player must HOLD (press and hold) the bucket for `fillDurationMs` ms without releasing
  - Show a radial fill progress ring around the bucket (similar to HoldTask approach)
  - On hold complete: bucket shows a "full" visual (water visible inside) → advance to 'dump'
  - On release early: reset to 'pickup' (bucket slips back)

'dump':
  - Full bucket is at the rail
  - Player drags/swipes it LEFT or UP (back across the deck in the dump direction)
  - On release past DUMP_THRESHOLD: play a splash animation → increment cyclesCompleted
  - If cyclesCompleted >= config.cyclesRequired → call onSuccess
  - Else: reset bucket to BUCKET_START_POS, step → 'pickup'
```

#### Key implementation details

**PanResponder (re-used pattern from `DragPlaceTask.js`):**
- Bucket position driven by `new Animated.ValueXY()`
- `onPanResponderRelease` checks `(gestureState.moveX, gestureState.moveY)` against zone hitboxes

**Zone hitboxes (example, adjust to taste):**
```js
const BUCKET_START  = { x: W * 0.15, y: H * 0.65 };
const RAIL_ZONE     = { x: W * 0.6,  y: H * 0.35, w: W * 0.35, h: H * 0.25 };
const DUMP_THRESHOLD_X = W * 0.35;  // dragging past this x while in 'dump' counts as dumped
```

**Water level gauge:**  
A vertical bar on the left edge. Height interpolates from `100%` down to `0%` as
`cyclesCompleted` increases. Color: `colors.primary.electricBlue`. When it reaches `0%` the
player has bailed out the boat and `onSuccess` fires.

**Bucket SVG (inline, ~60×60):**  
- Empty bucket: a trapezoidal bucket shape with a handle arc, no fill color inside
- Full bucket: same shape with a blue water-fill ellipse inside and a few drop marks at rim
- Use `colors.primary.electricBlue` for water, `'#C09030'` for bucket body (wood-and-metal)

**Animated waves (background):**
- Low-fidelity: two sinusoidal `Path` elements using `Animated.loop` on a translateX value
  (same approach as the `WaveBackground` component already in `RapidTapTask.js` — copy, adapt,
   or import it if it is exported)
- Wave amplitude should ramp up as time runs out (read the `timeLimit` prop via a passed-down
  elapsed counter) to create urgency

**Step indicator:**
- Three labeled dots: `PICK UP`, `FILL`, `DUMP`
- Active step dot: `colors.primary.electricBlue`, size 14
- Inactive dots: `colors.text.muted`, size 10

**Splash animation on successful dump:**
- 4–6 `Animated.Text` nodes showing `💧` or `🌊` flying outward from the dump point using
  `Animated.parallel` on position + opacity (same splash pattern as RapidTapTask floating particles)

**Failure path:**
- If `timeLimit` runs out → `onFail()` (handled by `TaskHeader`'s `onTimeUp` → passed down through
  `TaskScreen` as `handleTimeUp`)
- No in-task fail state; the only way to fail is time expiry

#### Props contract (same as all other mechanic components)

```js
BailWaterTask.propTypes = {
  config:    PropTypes.shape({
    cyclesRequired: PropTypes.number,
    fillDurationMs: PropTypes.number,
  }),
  onSuccess: PropTypes.func.isRequired,
  onFail:    PropTypes.func.isRequired,
  timeLimit: PropTypes.number,
  taskId:    PropTypes.string,
};
```

---

### 7D — Register the new mechanic in `TaskScreen.js`

**File: `client/screens/tasks/TaskScreen.js`**

1. Import the new component:
```js
import BailWaterTask from './mechanics/BailWaterTask';
```

2. Add a case to the `switch (task.mechanic)` block:
```js
case MECHANIC.BAIL_WATER:
  return <BailWaterTask {...props} />;
```

---

### 7E — Add the bucket sprite to `TaskSprite.js`

**File: `client/components/TaskSprite.js`**

Add a `bucket` entry to the `SPRITES` object under the `// ── CHALLENGES ──` section:
```js
// Wooden water bucket with handle — used by jonah_storm
bucket: (c) => (
  <G>
    {/* Bucket body (trapezoid: wider at top) */}
    <Path d="M8 10 L7 26 L25 26 L24 10 Z" fill={c} />
    {/* Rim at top */}
    <Ellipse cx="16" cy="10" rx="8" ry="2.5" fill={c} />
    {/* Bottom */}
    <Ellipse cx="16" cy="26" rx="9" ry="2.5" fill={c} opacity="0.8" />
    {/* Handle arc */}
    <Path d="M8 10 Q16 3 24 10" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* Metal band (accent stripe) */}
    <Path d="M7.5 18 L24.5 18" stroke={BG} strokeWidth="1.5" opacity="0.5" />
    {/* Water inside (shown as a highlight) */}
    <Ellipse cx="16" cy="14" rx="5.5" ry="2" fill="#00D4FF" opacity="0.45" />
  </G>
),
```

Also update the `TASK_SPRITE` map in `client/data/tasks.js` so `jonah_storm` points to `'bucket'`
(as noted in 7B above) — confirm the `TaskSprite` component renders it correctly by key lookup.

---

### 7F — Remove the `jonah_storm` special case from `RapidTapTask.js`

**File: `client/screens/tasks/mechanics/RapidTapTask.js`**

The `jonah_storm` task no longer uses `RAPID_TAP`. Clean up:
- Remove the `case 'jonah_storm':` branch from `renderButton()` — the `BucketButton` component it
  renders is no longer needed here (it can be deleted or moved to `BailWaterTask.js` for reuse)
- Remove the `{taskId === 'jonah_storm' && <WaveBackground … />}` line from the render

If `BucketButton` and `WaveBackground` are only used by `jonah_storm` in this file, either delete
them or relocate them to `BailWaterTask.js` for internal use there.

---

**Acceptance criteria:**
- [ ] `jonah_storm` task uses `MECHANIC.BAIL_WATER` and no longer appears in `RapidTapTask.js`
- [ ] Playing the task requires completing a pick-up → fill → dump cycle 6 times
- [ ] Dragging the bucket outside the rail zone snaps it back to the start position
- [ ] Releasing early during fill resets to the pick-up step
- [ ] A water level gauge decreases visibly with each successful cycle
- [ ] Step indicator correctly highlights the current step
- [ ] A splash particle animation plays on each successful dump
- [ ] `onSuccess` is called after 6 completed cycles; `onFail` is called on time expiry
- [ ] The bucket sprite renders correctly at the standard 32×32 viewBox in task card thumbnails
- [ ] No regressions in other tasks that use `RAPID_TAP`

---

## ✅ TASK 8 — AI-Generated Professional SVG Sprites *(COMPLETE)*

> Standalone polish task. No game logic dependencies. Can be done after Task 6.

**Goal:** Replace the hand-coded geometric SVG sprite functions in `client/components/TaskSprite.js`
with professional-quality artwork generated by an AI image/SVG tool (e.g. GPT-4o, Claude, Recraft,
Midjourney → SVG pipeline, or similar). Each sprite should look polished and thematically appropriate
rather than programmer art.

### 8A — Prepare the sprite inventory list

Before generating anything, produce a canonical list of every sprite key currently in `SPRITES`
(Task 6 must have cleaned this up). For each entry, note:
- The sprite key (e.g. `'bucket'`, `'scroll'`, `'fish'`)
- The task(s) it is used by (from `TASK_SPRITE` map in `client/data/tasks.js`)
- A one-sentence description of the desired artwork (e.g. "A wooden water bucket with a rope
  handle, seen from a slight 3/4 angle, dripping water")

Document this list in a comment block at the top of `TaskSprite.js` so future agents know what
each sprite is supposed to look like.

### 8B — Generation guidelines for the AI agent

When prompting an AI tool to generate each sprite, apply these constraints so all sprites feel
cohesive:

**Style:** Flat vector illustration, minimal shading, clean outlines. Inspired by Among Us
/ pixel-art aesthetic but not pixelated — smooth SVG paths. Dark background (`#0B0C10`).

**Color palette:**
- Primary element color: parameterized via the `c` argument (do not hardcode team colors)
- Accent / fire / glow: `#FFA63D`
- Background: `#0B0C10`
- Outlines: white or very light grey (`#E0E0E0`) at stroke-width `1.5`–`2`

**Viewbox:** All sprites must fit within `0 0 32 32`. Complex artwork should be scaled down and
centered. Padding of at least 1–2 units on every side is recommended.

**Output format:** React Native SVG JSX (i.e. `<G>`, `<Path>`, `<Circle>`, `<Rect>` etc. from
`react-native-svg`). No raw `<svg>` tags. Each sprite is a function `(c) => (<G>...</G>)`.

**Prompt template (per sprite):**
```
Generate a flat vector SVG icon of [DESCRIPTION] on a dark background.
Style: minimal, clean, Among Us-inspired. Size: 32x32 viewBox.
Output only the inner SVG elements as React Native SVG JSX (<G>, <Path>, etc.).
Use the variable `c` for the primary fill color. Use #FFA63D for accent/fire.
Use #0B0C10 as background fill. Use #E0E0E0 for outlines, strokeWidth 1.5.
```

### 8C — Integration steps

For each AI-generated sprite:
1. Review the output for correctness — paths must stay within `0 0 32 32`.
2. Replace the existing sprite function body in `TaskSprite.js` with the new JSX.
3. Ensure the `c` (color) parameter is used for the primary element; do not hardcode hex values
   that should vary by team.
4. Spot-check by running the app and navigating to the task list to confirm visual rendering.

### 8D — Quality bar

A sprite passes review if:
- It is recognizable as the thing it depicts at 32×32 without a label
- It does not use any hard-coded team colors (Phos blue / Skotia red)
- It looks intentionally designed, not like a rough geometric placeholder
- It renders without errors in the React Native SVG context

**Acceptance criteria:**
- [x] Every sprite in `SPRITES` has been regenerated (or reviewed and accepted) via AI tooling
- [x] All output adheres to the `0 0 32 32` viewBox and color-constant constraints from Task 6B
- [x] No sprite still contains programmer-drawn placeholder geometry unless explicitly accepted
- [x] A brief note in the sprite's comment indicates it was AI-generated (e.g. `// AI-generated`)

---

## Implementation Notes for Agents

### File ownership map (quick reference)
| Concern | Primary files |
|---|---|
| Movement state machine | `server/services/gameService.js` |
| Socket event emissions | `server/websocket/lobbySocket.js` |
| DB schema | `server/dbInit.js` |
| REST API routes | `server/routes/gameRoutes.js`, `server/routes/lobbyRoutes.js` |
| Score constants | `server/services/gameService.js` → `POINTS` object |
| Client screen routing | `client/App.js` |
| Client game state | `client/hooks/useGameState.js` |
| Movement A UI | `client/screens/game/MovementAScreen.js` |
| Movement B UI | `client/screens/game/MovementBScreen.js` |
| Voting UI | `client/screens/game/VotingScreen.js` |
| Round summary UI | `client/screens/game/RoundSummaryScreen.js` |
| GM dashboard UI | `client/screens/game/GmDashboardScreen.js` |
| Sprites | `client/components/TaskSprite.js` |
| Task definitions | `client/data/tasks.js` |
| Color palette | `client/theme/colors.js` |

### Key constraint reminders
- The DB `movement_type` column is `CHAR(1) CHECK (movement_type IN ('A', 'B', 'C'))`.
  Do not rename the stored characters — only display strings change.
- `socket.io` rooms are named `lobby:{lobbyId}` (lobby-wide) and `lobby:{groupId}` (group-specific).
  These naming patterns must not change.
- JWT `sub` field is the user ID. Decoded with `token.split('.')[1]` → base64 → `payload.sub`.
- All server DB mutations use transactions (`BEGIN`/`COMMIT`/`ROLLBACK`) — maintain this pattern.
- `advanceMovement()` uses a `FOR UPDATE` lock on the round row to prevent race conditions.
  Do not remove this locking pattern when rewriting the state machine steps.
