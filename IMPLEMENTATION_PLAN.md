# Implementation Plan

> See `GAME_DESIGN.md` for full game design. This document tracks what needs to be built.
> 
> **Last updated:** February 2026. Phases 0–7 are complete. Phase 8 (polish) is partially done.

---

## Phase 0 — Codebase Restructure ✅

- [X] Fork current repo as `Apokrupto-AmongUsIRL` to preserve the GPS/elimination version
- [X] Strip GPS/location logic, impostor kill mechanics, sabotage overlay
- [X] Remove/archive: `SabotageOverlay.js`, location-based game mechanics
- [X] Keep: auth, lobby system, task components, WebSocket infrastructure, biblical task data
- [X] Update `CLAUDE.md`, `README.md` to reflect new game identity
- [X] Rename or repurpose existing DB schema for new game model

---

## Phase 1 — Core Infrastructure ✅

### 1.1 Database Schema ✅
All tables implemented in `server/dbInit.js` with auto-creation on startup:
- `games`, `game_teams`, `game_players`, `game_groups`, `game_group_members`
- `rounds`, `movements`, `prompts`, `movement_a_submissions`, `movement_c_votes`, `mark_events`
- Prompt table seeded with 10 biblical theme pairs on first startup

### 1.2 Game State Machine ✅
- Full state machine in `server/services/gameService.js` (~1400 lines)
- GM-controlled transitions via `gmAdvance` socket event or `POST /api/games/:id/advance`
- Movement A → B → C → next round (or game over)
- In-memory turn state for Movement A with auto-advance timers

### 1.3 Game Master Dashboard ✅
- Web-based GM dashboard at `server/public/gm.html`
- In-app `GmDashboardScreen.js` (full dashboard) and `GmWaitingScreen.js` (URL redirect)
- View all players, teams, marks, groups; advance movements; broadcast announcements
- Live turn-slot countdown display during Movement A

---

## Phase 2 — Role Assignment & Grouping Engine ✅

### 2.1 Role Assignment ✅
- [X] Assign Skotia to exactly 1 in every 5 players on game start
- [X] Skotia players receive list of all other Skotia via `roleAssigned` socket event
- [X] Phos players see only their own role
- [X] Stored in `game_players` table

### 2.2 Group Assignment ✅
- [X] Randomized groups of 5, guaranteed 1 Skotia per group
- [X] Groups reshuffled each round with same guarantee
- [X] Stored in `game_groups` + `game_group_members`

---

## Phase 3 — Movement A: Social Deduction ✅

### 3.1 Prompt System ✅
- [X] 10 biblical prompt pairs seeded on startup (`prompts` table)
- [X] Server sends team-specific prompt via `GET /api/games/:id/movement-a/prompt`
- [X] 30s per turn with auto-advance timer

### 3.2 Word Display ✅
- [X] Turn-based submission — each player submits one word on their turn
- [X] `wordSubmitted` event reveals each word in real-time to the group
- [X] `deliberationStart` event when all players have submitted
- [X] Client shows full word list with attribution during deliberation

### 3.3 Data Storage ✅
- [X] Stored in `movement_a_submissions` (movement_id, group_id, user_id, word)

---

## Phase 4 — Movement B: Task Phase ✅ (partially)

### 4.1 Task Mechanics ✅
- [X] 14 task mechanics implemented: SlingTask, CollectTask, DragPlaceTask, GuardTask, RapidTapTask, HoldTask, TraceTask, PatienceTask, BuildTask, TriviaTask, ScriptureBlankTask, BailWaterTask, MarchJerichoTask, FocusTask
- [X] `MovementBScreen.js` — task selector with difficulty indicators + task runner
- [X] Timer: phase ends when GM advances or optional time limit expires

### 4.2 Point Awarding ✅
- [X] Points go to `game_teams` via `POST /api/games/:id/movement-b/complete`
- [X] Skotia passive bonus: +50 points per Movement B (`POINTS.SKOTIA_PASSIVE`)

### 4.3 Remaining Work
- [ ] **Server-side task assignment** — Server should emit `taskAssigned` per socket when B starts (currently players self-select from available tasks)
- [ ] **Cooperative tasks** — Caesar Shift Operator/Manual-holder pairing needs server-side pair assignment within groups

---

## Phase 5 — Movement C: Voting

### 5.1 Voting UI
- Each player sees the 4 other members of their group
- For each: tap "Phos" or "Skotia" (can change before submitting)
- Submit once — no changes after
- Timer or wait for all to submit

### 5.2 Mark Resolution
- Server tallies votes per player
- Vote outcome depends on target's **current mark state**:
  - Unmarked + majority Skotia votes → `is_marked = true`
  - Marked + majority Phos votes → `is_marked = false`
- All mark changes written to `game_players.is_marked`
- Also store mark history: `mark_events (id, game_player_id, round_number, action [mark|unmark], was_correct)`

**Scoring table:**
| Event | Correct? | Points to |
|-------|----------|-----------|
| Mark Skotia | Yes | Phos |
| Mark Phos | No | Skotia |
| Unmark Phos | Yes | Phos |
| Unmark Skotia | No | Skotia |

### 5.3 Win Condition Check
- After each voting phase, check supermajority: (currently marked Skotia / total Skotia) ≥ 0.80
- If met → trigger early game end in favor of Phos
- Skotia can prevent this by getting themselves unmarked in subsequent rounds

### 5.4 Announcement
- Aggregate only: marks applied, unmarks applied, points earned per team
- No per-player breakdown announced

---

## Phase 6 — Round Transition & UI ✅

- [X] GM triggers transition via `gmAdvance`
- [X] `RoundSummaryScreen.js` shows aggregate scoring, mark/unmark counts
- [X] GM can broadcast announcements via `POST /api/games/:id/broadcast`
- [X] Server reshuffles groups on new round, emits `movementStart` per socket with new group info

---

## Phase 7 — Win Condition & Game Over ✅

### 7.1 Point Check ✅
- [X] After final round, compares `game_teams` totals → highest wins

### 7.2 Supermajority Deduction Check ✅
- [X] Check exists in `advanceMovement`: (marked Skotia / total Skotia) ≥ 0.80 → Phos wins
- [ ] End-to-end verification needed

### 7.3 Game Over Screen ✅
- [X] `GameOverScreen.js` — reveals all Skotia players, final point totals, winner announcement
- [X] `gameOver` socket event with `{ winner, condition, phosPoints, skotiaPoints, skotiaPlayers }`

---

## Phase 8 — Polish & Accessibility (in progress)

- [ ] Mark badge design (visible on all screens for marked players)
- [X] Timer countdown component (used in Movement A turns, Movement B, countdown screen)
- [X] GM announcement push (`announcement` socket event displayed on devices)
- [ ] Color-blind mode / accessible team colors (don't rely on color alone)
- [X] Lobby capacity raised to 5–100 (was 4–15)
- [ ] Stress test WebSocket with 80 simultaneous clients
- [ ] `gameStateUpdate` socket emission (live score/mark push — currently only updates on `movementStart`)
- [ ] `taskAssigned` socket event for server-side Movement B task assignment

---

## Out of Scope for MVP (Future)

- Team spending / meta-game votes
- Confession/Redemption mechanic
- Grace mechanic
- GPS tasks
- Spectator-specific content

---

## Suggested Implementation Order

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 5 → Phase 7 → Phase 4 → Phase 6 → Phase 8
```
(Voting before tasks because voting logic gates the win condition; tasks reuse existing components)
