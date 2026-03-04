// Server-side task catalog — point values and mechanic type.
// Full mechanic config lives client-side; this file validates taskId,
// determines canonical point values, and supports type-uniform selection.

const MECHANIC = {
  SLING:           'SLING',
  COLLECT:         'COLLECT',
  DRAG_PLACE:      'DRAG_PLACE',
  GUARD:           'GUARD',
  RAPID_TAP:       'RAPID_TAP',
  HOLD:            'HOLD',
  TRACE:           'TRACE',
  PATIENCE:        'PATIENCE',
  BUILD:           'BUILD',
  TRIVIA:          'TRIVIA',
  SCRIPTURE_BLANK: 'SCRIPTURE_BLANK',
  BAIL_WATER:      'BAIL_WATER',
  MARCH_JERICHO:   'MARCH_JERICHO',
  FOCUS:           'FOCUS',
};

const TASKS = [
  // Fill-in-the-blank scripture
  { id: 'blank_philippians_4_13', mechanic: MECHANIC.SCRIPTURE_BLANK, points: { alive: 3, dead: 2 } },
  { id: 'blank_john_3_16',        mechanic: MECHANIC.SCRIPTURE_BLANK, points: { alive: 3, dead: 2 } },
  { id: 'blank_psalm_23',         mechanic: MECHANIC.SCRIPTURE_BLANK, points: { alive: 4, dead: 2 } },
  { id: 'blank_isaiah_40_31',     mechanic: MECHANIC.SCRIPTURE_BLANK, points: { alive: 5, dead: 3 } },
  { id: 'blank_hebrews_11_1',     mechanic: MECHANIC.SCRIPTURE_BLANK, points: { alive: 4, dead: 2 } },

  // Single-question trivia
  { id: 'trivia_psalms_author',   mechanic: MECHANIC.TRIVIA, points: { alive: 2, dead: 1 } },
  { id: 'trivia_disciples_count', mechanic: MECHANIC.TRIVIA, points: { alive: 2, dead: 1 } },
  { id: 'trivia_jonah_days',      mechanic: MECHANIC.TRIVIA, points: { alive: 2, dead: 1 } },
  { id: 'trivia_peter_denial',    mechanic: MECHANIC.TRIVIA, points: { alive: 2, dead: 1 } },
  { id: 'trivia_baptism_river',   mechanic: MECHANIC.TRIVIA, points: { alive: 2, dead: 1 } },
  { id: 'trivia_first_book',      mechanic: MECHANIC.TRIVIA, points: { alive: 2, dead: 1 } },
  { id: 'trivia_goliath_weapon',  mechanic: MECHANIC.TRIVIA, points: { alive: 3, dead: 2 } },

  // Single-question trivia — Biblical
  { id: 'trivia_burning_bush',    mechanic: MECHANIC.TRIVIA, points: { alive: 2, dead: 1 } },
  { id: 'trivia_garden_eden',     mechanic: MECHANIC.TRIVIA, points: { alive: 2, dead: 1 } },
  { id: 'trivia_red_sea',         mechanic: MECHANIC.TRIVIA, points: { alive: 2, dead: 1 } },
  { id: 'trivia_samson_strength', mechanic: MECHANIC.TRIVIA, points: { alive: 2, dead: 1 } },
  { id: 'trivia_ark_builder',     mechanic: MECHANIC.TRIVIA, points: { alive: 2, dead: 1 } },
  { id: 'trivia_den_of_lions',    mechanic: MECHANIC.TRIVIA, points: { alive: 2, dead: 1 } },
  { id: 'trivia_oldest_man',      mechanic: MECHANIC.TRIVIA, points: { alive: 3, dead: 2 } },
  { id: 'trivia_pauls_letters',   mechanic: MECHANIC.TRIVIA, points: { alive: 3, dead: 2 } },
  { id: 'trivia_plagues_egypt',   mechanic: MECHANIC.TRIVIA, points: { alive: 3, dead: 2 } },
  { id: 'trivia_beatitudes',      mechanic: MECHANIC.TRIVIA, points: { alive: 3, dead: 2 } },

  // Single-question trivia — Iowa State
  { id: 'trivia_isu_mascot',      mechanic: MECHANIC.TRIVIA, points: { alive: 2, dead: 1 } },
  { id: 'trivia_isu_colors',      mechanic: MECHANIC.TRIVIA, points: { alive: 2, dead: 1 } },
  { id: 'trivia_isu_city',        mechanic: MECHANIC.TRIVIA, points: { alive: 2, dead: 1 } },
  { id: 'trivia_isu_conference',  mechanic: MECHANIC.TRIVIA, points: { alive: 2, dead: 1 } },
  { id: 'trivia_isu_founded',     mechanic: MECHANIC.TRIVIA, points: { alive: 3, dead: 2 } },
  { id: 'trivia_isu_rivalry',     mechanic: MECHANIC.TRIVIA, points: { alive: 2, dead: 1 } },
  { id: 'trivia_isu_hilton',      mechanic: MECHANIC.TRIVIA, points: { alive: 2, dead: 1 } },
  { id: 'trivia_isu_jack_trice',  mechanic: MECHANIC.TRIVIA, points: { alive: 3, dead: 2 } },
  { id: 'trivia_isu_land_grant',  mechanic: MECHANIC.TRIVIA, points: { alive: 3, dead: 2 } },
  { id: 'trivia_isu_campanile',   mechanic: MECHANIC.TRIVIA, points: { alive: 3, dead: 2 } },

  // Action / skill
  { id: 'david_and_goliath',          mechanic: MECHANIC.SLING,         points: { alive: 2, dead: 1 } },
  { id: 'pauls_belongings',           mechanic: MECHANIC.COLLECT,       points: { alive: 4, dead: 2 } },
  { id: 'wolves_in_sheeps_clothing',  mechanic: MECHANIC.COLLECT,       points: { alive: 6, dead: 4 } },
  { id: 'lamp_on_lampstand',          mechanic: MECHANIC.DRAG_PLACE,    points: { alive: 3, dead: 2 } },
  { id: 'protect_the_sheep',          mechanic: MECHANIC.GUARD,         points: { alive: 6, dead: 4 } },
  { id: 'feeding_five_thousand',      mechanic: MECHANIC.RAPID_TAP,     points: { alive: 1, dead: 1 } },
  { id: 'manna_wilderness',           mechanic: MECHANIC.COLLECT,       points: { alive: 4, dead: 2 } },
  { id: 'walls_of_jericho',           mechanic: MECHANIC.RAPID_TAP,     points: { alive: 5, dead: 3 } },
  { id: 'march_around_jericho',       mechanic: MECHANIC.MARCH_JERICHO, points: { alive: 7, dead: 4 } },
  { id: 'ark_of_covenant',            mechanic: MECHANIC.DRAG_PLACE,    points: { alive: 4, dead: 2 } },
  { id: 'gideons_torch',              mechanic: MECHANIC.HOLD,          points: { alive: 2, dead: 1 } },
  { id: 'fiery_furnace',              mechanic: MECHANIC.HOLD,          points: { alive: 2, dead: 1 } },
  { id: 'solomons_temple',            mechanic: MECHANIC.DRAG_PLACE,    points: { alive: 5, dead: 3 } },
  { id: 'water_from_rock',            mechanic: MECHANIC.RAPID_TAP,     points: { alive: 1, dead: 1 } },
  { id: 'the_lost_sheep',             mechanic: MECHANIC.GUARD,         points: { alive: 5, dead: 3 } },
  { id: 'jonah_storm',                mechanic: MECHANIC.BAIL_WATER,    points: { alive: 2, dead: 1 } },
  { id: 'walking_on_water',           mechanic: MECHANIC.FOCUS,         points: { alive: 3, dead: 2 } },
  { id: 'pillar_of_fire',             mechanic: MECHANIC.GUARD,         points: { alive: 5, dead: 3 } },
  { id: 'jordan_river',               mechanic: MECHANIC.COLLECT,       points: { alive: 3, dead: 2 } },

  // Patience (don't tap)
  { id: 'still_waters',               mechanic: MECHANIC.PATIENCE,      points: { alive: 2, dead: 1 } },
  { id: 'be_still',                   mechanic: MECHANIC.PATIENCE,      points: { alive: 3, dead: 2 } },
  { id: 'wait_on_the_lord',           mechanic: MECHANIC.PATIENCE,      points: { alive: 3, dead: 2 } },

  // Build (drag & drop)
  { id: 'nehemiah_wall',              mechanic: MECHANIC.BUILD,         points: { alive: 5, dead: 3 } },
  { id: 'building_the_altar',         mechanic: MECHANIC.BUILD,         points: { alive: 6, dead: 4 } },
];

const taskMap = new Map(TASKS.map((t) => [t.id, t]));

function getTask(id) {
  return taskMap.get(id) || null;
}

/**
 * Pick one task using type-uniform distribution: choose a mechanic type
 * uniformly at random, then pick a random task within that type.
 * Optionally exclude specific task IDs (e.g. recently used).
 *
 * @param {string[]} [excludeIds=[]] - task IDs to exclude from selection
 * @returns {{ id, mechanic, points } | null}
 */
function pickTypeUniformTask(excludeIds = []) {
  const pool = TASKS.filter((t) => !excludeIds.includes(t.id));
  if (pool.length === 0) return null;

  // Group by mechanic type
  const byType = {};
  for (const t of pool) {
    if (!byType[t.mechanic]) byType[t.mechanic] = [];
    byType[t.mechanic].push(t);
  }
  const types = Object.keys(byType);

  // Uniform type selection
  const type = types[Math.floor(Math.random() * types.length)];
  const candidates = byType[type];
  return candidates[Math.floor(Math.random() * candidates.length)];
}

module.exports = { TASKS, MECHANIC, getTask, pickTypeUniformTask };
