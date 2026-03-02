/**
 * Human-readable display names for each movement type.
 *
 * IMPORTANT: The internal DB/socket single-letter codes ('A', 'B', 'C') must
 * never change — they are part of the wire protocol (DB column, socket payloads,
 * REST bodies). Only these display strings should be referenced in UI code.
 */
export const MOVEMENT_NAMES = {
  A: 'Impostor Stage',
  B: 'Challenges Stage',
  C: 'Voting Stage',
};

/**
 * Short labels for compact UI elements (progress pips, GM dashboard columns, etc.)
 */
export const MOVEMENT_LABELS_SHORT = {
  A: 'Impostor',
  B: 'Challenges',
  C: 'Voting',
};
