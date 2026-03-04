// Server-side task catalog — point values only (1–10 scale).
// Mechanic config is client-only. This file is used to validate taskId
// and determine canonical point values independently of the client.

const TASKS = [
  // Fill-in-the-blank scripture
  { id: 'blank_philippians_4_13', points: { alive: 3, dead: 2 } },
  { id: 'blank_john_3_16',        points: { alive: 3, dead: 2 } },
  { id: 'blank_psalm_23',         points: { alive: 4, dead: 2 } },
  { id: 'blank_isaiah_40_31',     points: { alive: 5, dead: 3 } },
  { id: 'blank_hebrews_11_1',     points: { alive: 4, dead: 2 } },

  // Single-question trivia
  { id: 'trivia_psalms_author',  points: { alive: 2, dead: 1 } },
  { id: 'trivia_disciples_count', points: { alive: 2, dead: 1 } },
  { id: 'trivia_jonah_days',     points: { alive: 2, dead: 1 } },
  { id: 'trivia_peter_denial',   points: { alive: 2, dead: 1 } },
  { id: 'trivia_baptism_river',  points: { alive: 2, dead: 1 } },
  { id: 'trivia_first_book',     points: { alive: 2, dead: 1 } },
  { id: 'trivia_goliath_weapon', points: { alive: 3, dead: 2 } },

  // Single-question trivia — Biblical
  { id: 'trivia_burning_bush',    points: { alive: 2, dead: 1 } },
  { id: 'trivia_garden_eden',     points: { alive: 2, dead: 1 } },
  { id: 'trivia_red_sea',         points: { alive: 2, dead: 1 } },
  { id: 'trivia_samson_strength', points: { alive: 2, dead: 1 } },
  { id: 'trivia_ark_builder',     points: { alive: 2, dead: 1 } },
  { id: 'trivia_den_of_lions',    points: { alive: 2, dead: 1 } },
  { id: 'trivia_oldest_man',      points: { alive: 3, dead: 2 } },
  { id: 'trivia_pauls_letters',   points: { alive: 3, dead: 2 } },
  { id: 'trivia_plagues_egypt',   points: { alive: 3, dead: 2 } },
  { id: 'trivia_beatitudes',      points: { alive: 3, dead: 2 } },

  // Single-question trivia — Iowa State
  { id: 'trivia_isu_mascot',      points: { alive: 2, dead: 1 } },
  { id: 'trivia_isu_colors',      points: { alive: 2, dead: 1 } },
  { id: 'trivia_isu_city',        points: { alive: 2, dead: 1 } },
  { id: 'trivia_isu_conference',  points: { alive: 2, dead: 1 } },
  { id: 'trivia_isu_founded',     points: { alive: 3, dead: 2 } },
  { id: 'trivia_isu_rivalry',     points: { alive: 2, dead: 1 } },
  { id: 'trivia_isu_hilton',      points: { alive: 2, dead: 1 } },
  { id: 'trivia_isu_jack_trice',  points: { alive: 3, dead: 2 } },
  { id: 'trivia_isu_land_grant',  points: { alive: 3, dead: 2 } },
  { id: 'trivia_isu_campanile',   points: { alive: 3, dead: 2 } },

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
