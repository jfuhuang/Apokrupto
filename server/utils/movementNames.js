/**
 * Human-readable display names for each movement type (server-side copy).
 *
 * IMPORTANT: The internal DB/socket single-letter codes ('A', 'B', 'C') must
 * never change — they are part of the wire protocol (DB column, socket payloads,
 * REST bodies). Only these display strings should be referenced in log messages
 * or any server-to-client label payloads.
 */
const MOVEMENT_NAMES = {
  A: 'Impostor Stage',
  B: 'Challenges Stage',
  C: 'Voting Stage',
};

module.exports = { MOVEMENT_NAMES };
