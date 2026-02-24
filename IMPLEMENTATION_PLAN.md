# Implementation Plan

> See `GAME_DESIGN.md` for full game design. This document tracks what needs to be built.

---

## Phase 0 — Codebase Restructure (Before any new features)

- [ ] Fork current repo as `Apokrupto-AmongUsIRL` to preserve the GPS/elimination version
- [ ] Strip GPS/location logic, impostor kill mechanics, sabotage overlay
- [ ] Remove/archive: `SabotageOverlay.js`, location-based game mechanics
- [ ] Keep: auth, lobby system, task components, WebSocket infrastructure, biblical task data
- [ ] Update `CLAUDE.md`, `README.md` to reflect new game identity
- [ ] Rename or repurpose existing DB schema for new game model

---

## Phase 1 — Core Infrastructure

### 1.1 Database Schema (new/updated tables)
```sql
games              (id, lobby_id, status, current_round, total_rounds, created_at)
game_teams         (id, game_id, team_name, points)
game_players       (id, game_id, user_id, team [phos|skotia], is_marked)
game_groups        (id, game_id, round_number, group_index)
game_group_members (id, group_id, game_player_id)
rounds             (id, game_id, round_number, current_movement [A|B|C], status)
movements          (id, round_id, movement_type, started_at, ended_at)
mark_events        (id, game_player_id, round_number, action [mark|unmark], was_correct)
-- mark_events enables: scoring, supermajority check, and post-game accuracy stats
```

### 1.2 Game State Machine (server-side)
- States: `lobby → role_reveal → round_A → round_B → round_C → transition → (repeat) → game_over`
- GM controls all state transitions
- WebSocket broadcasts state changes to all players
- Players can only act during their movement's window

### 1.3 Game Master Dashboard
- Separate GM screen (flagged by user role or lobby creator)
- View: all players, their teams (visible to GM only), current marks
- Controls: advance movement, pause, force-end round, broadcast message
- Stats: live point totals per team

---

## Phase 2 — Role Assignment & Grouping Engine

### 2.1 Role Assignment
- On game start: assign Skotia to exactly 1 in every 5 players (or closest ratio)
- Skotia players receive list of all other Skotia on role reveal screen
- Phos players see only their own role
- Store assignments in `game_players`

### 2.2 Group Assignment
- Initial grouping: randomized groups of 5, guaranteed 1 Skotia per group
- Round transition: reshuffle groups — same guarantee
- Constraint: avoid repeating the exact same group composition across rounds (best-effort)
- Store in `game_groups` + `game_group_members`

---

## Phase 3 — Movement A: Social Deduction

### 3.1 Prompt System
- Prompt pairs: `{ phos_prompt, skotia_prompt, theme_label }`
- Biblical theme pairing examples:
  - Phos: "Fruits of the Spirit" / Skotia: "Things that feel good in the moment"
  - Phos: "Names for Jesus" / Skotia: "Things people worship instead of God"
  - Phos: "Ways to serve others" / Skotia: "Ways to put yourself first"
- Server sends the correct prompt per player's team
- Players enter 1 word within a timer (60–90 seconds)

### 3.2 Word Display
- All responses shown to the group simultaneously when timer ends (or all submit)
- Displayed as a word list — no attribution shown
- Discussion phase (no app interaction) for 2–3 minutes
- No points awarded here

### 3.3 Data Storage
- Store each submission: `(round_id, group_id, player_id, submitted_word, prompt_received)`

---

## Phase 4 — Movement B: Task Phase

### 4.1 Reuse Existing Tasks
- Scripture Memory, Quiz, Match-Pair, etc. — largely already built
- Review and update task themes to be movement-B appropriate
- Add timer: task phase ends when GM advances or time limit expires

### 4.2 Point Awarding
- Points go to `game_teams` (team-level), not individual
- Skotia passive bonus: +N points per minute in task phase (tunable constant)
- Cooperative task failure (if Skotia deliberately underperforms): reduces Phos points earned

### 4.3 New Task Types Needed
- **Bible Trivia** — multiple choice, server-side question pool
- **Cooperative: Caesar Shift** — Operator screen (encoded text + input field) + Manual-holder screen (shift value + alphabet table); pair assigned server-side within the group
- *[Additional KTANE-style cooperative tasks — design TBD]*

### 4.4 Task Category Taxonomy
Existing tasks need to be tagged into categories: `trivia | scripture_memory | skill | cooperative`. Category determines point weight and how tasks are selected during a round.

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

## Phase 6 — Round Transition & UI

- GM triggers transition
- Show round summary (total points per team, aggregate marks)
- Optional: GM broadcast message / biblical reflection text
- App reshuffles groups and loads next round

---

## Phase 7 — Win Condition & Game Over

### 7.1 Point Check (end of final round)
- Compare `game_teams` totals
- Highest total wins

### 7.2 Supermajority Deduction Check (Phos only)
- Count: total Skotia players vs. Marked Skotia players
- If ≥80% correctly marked → Phos wins regardless of points
- Check after each round's voting phase (could trigger early game end)

### 7.3 Game Over Screen
- Reveal all Skotia players
- Show final point totals
- Announce winner
- Optional: show "MVP" stats (most tasks completed, best deduction accuracy)

---

## Phase 8 — Polish & Accessibility

- [ ] Mark badge design (visible on all screens for marked players)
- [ ] Timer countdown component (shared across movements)
- [ ] GM announcement push (broadcast text displayed on all devices)
- [ ] Color-blind mode / accessible team colors (don't rely on color alone)
- [ ] Lobby capacity raised to 80 (currently likely capped lower)
- [ ] Stress test WebSocket with 80 simultaneous clients

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
