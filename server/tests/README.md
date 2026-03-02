# Stress Test

Simulates 50 concurrent players + 1 GM going through a complete 2-round game.
Validates server stability and measures socket event latency at scale.

## Setup

1. Start PostgreSQL (locally or via `npm run docker:start`)
2. Start the server with the GM username configured:
   ```bash
   GM_USERNAMES=stress_gm npm run dev
   ```
3. Run the stress test (from `server/`):
   ```bash
   node tests/stress-test.js
   ```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TEST_SERVER_URL` | `http://localhost:3000` | Server URL |
| `TEST_ROUNDS` | `2` | Number of rounds to play |
| `TEST_PLAYER_COUNT` | `50` | Number of player bots (+ 1 GM) |

## Flags

- `--cleanup` — Force-end the lobby after the test

## Timing

Movement A has a ~30s reveal delay per turn. With 5 players per group, each
Movement A phase takes ~2.5 minutes. A 2-round test takes roughly 6–8 minutes.

## Output

Prints a metrics table at the end with event latencies (avg/max ms) for:
- `roleAssigned` — game start to all roles received
- `votingComplete` — vote resolution broadcast
- `roundSummary` — round summary broadcast
- `gameOver` — final game result broadcast
