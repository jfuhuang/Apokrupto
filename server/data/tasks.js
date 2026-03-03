// Server-side task catalog — point values only (1–10 scale).
// Mechanic config is client-only. This file is used to validate taskId
// and determine canonical point values independently of the client.

const TASKS = [
  // Scripture memory
  { id: 'scripture_memory',      points: { alive: 3, dead: 2 } },
  { id: 'john_3_16',             points: { alive: 2, dead: 1 } },
  { id: 'psalm_23',              points: { alive: 3, dead: 2 } },
  { id: 'romans_8_28',           points: { alive: 2, dead: 1 } },
  { id: 'philippians_4_13',      points: { alive: 1, dead: 1 } },
  { id: 'isaiah_40_31',          points: { alive: 3, dead: 2 } },
  { id: 'hebrews_11_1',          points: { alive: 1, dead: 1 } },

  // Fill-in-the-blank scripture
  { id: 'blank_philippians_4_13', points: { alive: 3, dead: 2 } },
  { id: 'blank_john_3_16',        points: { alive: 3, dead: 2 } },
  { id: 'blank_psalm_23',         points: { alive: 4, dead: 2 } },
  { id: 'blank_isaiah_40_31',     points: { alive: 5, dead: 3 } },
  { id: 'blank_hebrews_11_1',     points: { alive: 4, dead: 2 } },

  // Matching / ordering
  { id: 'ten_commandments',      points: { alive: 2, dead: 1 } },
  { id: 'fruits_of_spirit',      points: { alive: 2, dead: 1 } },
  { id: 'noahs_animals',         points: { alive: 1, dead: 1 } },
  { id: 'rebuilding_wall',       points: { alive: 2, dead: 1 } },

  // Trivia (multi-question)
  { id: 'jesus_miracles',        points: { alive: 3, dead: 2 } },
  { id: 'prophets_quiz',         points: { alive: 3, dead: 2 } },
  { id: 'parables_quiz',         points: { alive: 2, dead: 1 } },
  { id: 'acts_quiz',             points: { alive: 3, dead: 2 } },

  // Single-question trivia
  { id: 'trivia_psalms_author',  points: { alive: 2, dead: 1 } },
  { id: 'trivia_disciples_count', points: { alive: 2, dead: 1 } },
  { id: 'trivia_jonah_days',     points: { alive: 2, dead: 1 } },
  { id: 'trivia_peter_denial',   points: { alive: 2, dead: 1 } },
  { id: 'trivia_baptism_river',  points: { alive: 2, dead: 1 } },
  { id: 'trivia_first_book',     points: { alive: 2, dead: 1 } },
  { id: 'trivia_goliath_weapon', points: { alive: 3, dead: 2 } },

  // Action / skill
  { id: 'david_and_goliath',     points: { alive: 2, dead: 1 } },
  { id: 'pauls_belongings',      points: { alive: 4, dead: 2 } },
  { id: 'wolves_in_sheeps_clothing', points: { alive: 6, dead: 4 } },
  { id: 'lamp_on_lampstand',     points: { alive: 3, dead: 2 } },
  { id: 'protect_the_sheep',     points: { alive: 6, dead: 4 } },
  { id: 'feeding_five_thousand', points: { alive: 1, dead: 1 } },
  { id: 'manna_wilderness',      points: { alive: 4, dead: 2 } },
  { id: 'walls_of_jericho',      points: { alive: 5, dead: 3 } },
  { id: 'march_around_jericho',  points: { alive: 7, dead: 4 } },
  { id: 'ark_of_covenant',       points: { alive: 4, dead: 2 } },
  { id: 'gideons_torch',         points: { alive: 2, dead: 1 } },
  { id: 'fiery_furnace',         points: { alive: 2, dead: 1 } },
  { id: 'solomons_temple',       points: { alive: 5, dead: 3 } },
  { id: 'water_from_rock',       points: { alive: 1, dead: 1 } },
  { id: 'the_lost_sheep',        points: { alive: 5, dead: 3 } },
  { id: 'jonah_storm',           points: { alive: 2, dead: 1 } },
  { id: 'walking_on_water',      points: { alive: 3, dead: 2 } },
  { id: 'pillar_of_fire',        points: { alive: 5, dead: 3 } },
  { id: 'jordan_river',          points: { alive: 3, dead: 2 } },

  // Patience (don't tap)
  { id: 'still_waters',          points: { alive: 2, dead: 1 } },
  { id: 'be_still',              points: { alive: 3, dead: 2 } },
  { id: 'wait_on_the_lord',      points: { alive: 3, dead: 2 } },

  // Build (drag & drop)
  { id: 'nehemiah_wall',         points: { alive: 5, dead: 3 } },
  { id: 'building_the_altar',    points: { alive: 6, dead: 4 } },
];

const taskMap = new Map(TASKS.map((t) => [t.id, t]));

function getTask(id) {
  return taskMap.get(id) || null;
}

module.exports = { TASKS, getTask };
