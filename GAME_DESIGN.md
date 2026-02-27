# Apokrupto — Game Design Document

> **Status:** Core gameplay implemented. Movements A, B, and C are functional. See `IMPLEMENTATION_PLAN.md` for detailed build status.
> **Audience:** Campus Ministry event, up to 80 players, location-independent.

---

## 1. Overview

A social-deduction party game designed to build camaraderie, encourage interpersonal connection, and integrate biblical/gospel themes. Players work in small rotating groups across 3–4 rounds of structured gameplay. Two teams compete: a majority **Good** team vs. a hidden minority **Evil** team.

The game rewards multiple playstyles:
- **Social readers** — can win by deducing who is evil through observation and conversation.
- **Logic/skill players** — can win purely through task performance and point accumulation, no social reading required.
- **Connectors** — players who build relationships and communicate across groups gain a natural advantage.

---

## 2. Team Names (Biblical Greek)

The game name *Apokrupto* (ἀποκρύπτω) means "to hide/conceal." Team names follow the same convention of biblical Greek.

### Recommended Pairing: **Phos** vs **Skotia**
- **Phos** (φῶς) — Light *(John 1:5: "The light shines in the darkness")*
- **Skotia** (σκοτία) — Darkness

### Alternate Pairings:
| Good Team | Evil Team | Reference |
|-----------|-----------|-----------|
| Aletheia (ἀλήθεια, Truth) | Pseudos (ψεῦδος, Falsehood/Lie) | John 8:44 |
| Zoe (ζωή, Life) | Thanatos (θάνατος, Death) | John 11:25 |
| Hagioi (ἅγιοι, Holy Ones) | Kosmokratores (κοσμοκράτορες, World-Rulers of Darkness) | Eph 6:12 |

*Recommendation: **Phos / Skotia** — clean, two syllables, immediately meaningful, backed by one of the most recognizable verses.*

**Ratio:** 4 Good (Phos) : 1 Evil (Skotia). At 80 players → 64 Good, 16 Evil.

---

## 3. Win Conditions

| Condition | Who | Trigger |
|-----------|-----|---------|
| Point majority | Either team | Most points after 3–4 rounds |
| Supermajority deduction | Good (Phos) | Good team correctly marks ≥80% of all Evil players across the game |

---

## 4. Game Structure

```
[Intro & Role Assignment]
        ↓
   ┌─── Round 1 ───┐
   │  Movement A: Social Deduction  │
   │  Movement B: Task Phase        │
   │  Movement C: Voting            │
   └────────────────────────────────┘
        ↓
   [Round Transition — Groups Shuffle, Marks Persist]
        ↓
   ┌─── Round 2 ─── ... ─── Round 4 ───┐
        ↓
   [Final Scoring & Win Condition Check]
```

### 4.1 Pre-Game: Intro & Role Assignment

1. Game Master (GM) walks through rules on a shared screen (projector or large display).
2. Players open the app and are assigned roles:
   - **Phos** players see only their own role.
   - **Skotia** players see their role **and** a list of all other Skotia members.
3. Players are assigned to initial **groups of 5** (statistically guarantees ~1 Skotia per group at 4:1 ratio).

---

## 5. Round Structure (3 Movements)

### Movement A — Social Deduction

**Goal:** Gather information. No direct points awarded.

**Mechanic:**
- All players receive a **theme prompt** on their device.
- Phos players get **Prompt A** (the true theme).
- Skotia players get **Prompt B** (a related but different theme — close enough to blend in, different enough to betray).
- Each player types **one word** that fits their prompt in a set time limit.
- Responses are displayed anonymously to the group.
- Players discuss or silently note who might be Skotia.

**Biblical Theming:** Prompts are thematically biblical (e.g., Phos prompt: "Fruits of the Spirit" / Skotia prompt: "Things that feel good in the moment").

**Skotia goal:** Blend in

---

### Movement B — Task Phase

**Goal:** Earn points for your team.

**Mechanic:**
- Each player completes tasks on their device. Tasks are either **solo** or **cooperative**.
- All players earn points for task completion.
- **Skotia passive bonus:** Skotia earn a small flat point bonus for time spent in the task phase regardless of outcome.
- Skotia players may choose to do solo tasks or participate in cooperative tasks — player's choice.

**Task categories:**

**Solo — Bible Trivia:** Multiple-choice questions on biblical facts, people, events, and books.

**Solo — Scripture Memory:** Given a reference, reconstruct the verse (fill blanks, unscramble, or type from memory). Difficulty scales.

**Solo — Skill-Based:** Reflex/dexterity mini-games. Existing: rapid tap, drag-place, hold, sling, collect.

**Cooperative — Manual & Operator:**
Two players pair up. The **Operator** sees the task interface and performs the actions. The **Manual-holder** sees the rules/key needed to solve it. They cannot see each other's screens and must coordinate verbally.
- *Caesar Shift:* Operator sees an encoded message. Manual-holder has the shift value and alphabet reference. They work together to decode it.
- *[Additional KTANE-style tasks to be designed later]*

**Point awarding:** Points go to team total. Announced publicly, not broken down by player.

---

### Movement C — Voting

**Goal:** Identify Skotia. Earn or lose points based on accuracy.

**Mechanic:**
- Each player votes on every other group member: **Phos** or **Skotia**.
- Votes apply to both **marking** and **unmarking** depending on the target's current state:
  - **Unmarked player:** majority Skotia vote → player becomes Marked.
  - **Already Marked player:** majority Phos vote → player becomes Unmarked.
- Marks are visible to all players as a badge on the marked player's profile.

**Scoring (all announced in aggregate, never per-player):**
| Outcome | Points awarded |
|---------|---------------|
| Correctly mark a Skotia | Phos earns points |
| Incorrectly mark a Phos | Skotia earns points |
| Correctly unmark a Phos (vindication) | Phos earns points |
| Incorrectly unmark a Skotia (re-hidden) | Skotia earns points |

*Results announced: "Good team correctly identified N players and vindicated M, earning X points. Evil team earned Y points."*

**Strategic depth:** A marked Skotia player is incentivized to convince their next group that they are Phos. If they succeed and get unmarked, their team earns points *and* the supermajority win condition becomes harder for Phos to reach — making the unmarking mechanic a live counter-strategy for Skotia across all rounds.

**Player persistence:** Marked players continue playing fully. The mark changes how others perceive them, not what they can do.

---

## 6. Round Transition

- Groups are reshuffled randomly.
- Marks from previous rounds remain visible.
- A brief **round summary** is shown (aggregate point changes, no individual attribution).
- GM may add commentary or a brief biblical reflection between rounds.

---

## 7. Future Features (Post-MVP)

### Team Spending (Meta-Game Layer)
Between rounds, each team can call a **majority vote** to spend accumulated points on meta-game actions:

| Spending Action | Cost | Effect |
|----------------|------|--------|
| Reveal | High | Force-reveal N Skotia players as confirmed evil |
| Camouflage | High | (Skotia only) Some Skotia receive identical prompts as Phos for next round |
| Intel | Medium | Good team learns which group has the most Skotia |
---

## 8. Scalability Notes

- 80 players → 16 groups of 5 per round.
- Group assignment and shuffling handled server-side.
- WebSocket required for synchronized round transitions (all players must enter Movement A at the same time).
- GM has a separate admin dashboard to control round pacing, view all player states, and broadcast announcements.

---

## 9. Design Principles

1. **No forced lying.** Skotia players serve a different prompt — they answer truthfully, but they serve a different master. This makes the game inclusive and removes social awkwardness around deception.
2. **No elimination.** Players stay engaged the full game. Marks change strategy but not participation.
3. **Marks are not permanent.** Unmarking creates ongoing tension — Skotia can fight back against correct marks, and Phos can correct mistakes. The game stays alive until the final vote.
4. **All tasks are phone-based.** No physical prompts or off-device instructions. Organic conversation happens naturally around the game mechanics themselves.
5. **Multi-playstyle.** A purely task-focused Phos player can contribute without ever identifying a Skotia player.
6. **Gospel themes throughout.** Prompts, task names, and mechanics all have biblical grounding.
