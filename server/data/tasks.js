// Server-side task catalog — point values only.
// Mechanic config is client-only. This file is used to validate taskId
// and determine canonical point values independently of the client.

const TASKS = [
  { id: 'scripture_memory',   points: { alive: 80,  dead: 48 } },
  { id: 'david_and_goliath',  points: { alive: 60,  dead: 36 } },
  { id: 'pauls_belongings',   points: { alive: 120, dead: 72 } },
  { id: 'lamp_on_lampstand',  points: { alive: 100, dead: 60 } },
  { id: 'protect_the_sheep',  points: { alive: 150, dead: 90 } },
  { id: 'feeding_five_thousand', points: { alive: 50, dead: 30 } },
  { id: 'ten_commandments',   points: { alive: 70,  dead: 42 } },
  { id: 'fruits_of_spirit',   points: { alive: 60,  dead: 36 } },
  { id: 'manna_wilderness',   points: { alive: 110, dead: 66 } },
  { id: 'walls_of_jericho',   points: { alive: 130, dead: 78 } },
  { id: 'ark_of_covenant',    points: { alive: 120, dead: 72 } },
  { id: 'gideons_torch',      points: { alive: 65,  dead: 39 } },
  { id: 'fiery_furnace',      points: { alive: 75,  dead: 45 } },
  { id: 'noahs_animals',      points: { alive: 55,  dead: 33 } },
  { id: 'solomons_temple',    points: { alive: 140, dead: 84 } },
  { id: 'water_from_rock',    points: { alive: 45,  dead: 27 } },
  { id: 'the_lost_sheep',     points: { alive: 140, dead: 84 } },
  { id: 'rebuilding_wall',    points: { alive: 70,  dead: 42 } },
];

const taskMap = new Map(TASKS.map((t) => [t.id, t]));

function getTask(id) {
  return taskMap.get(id) || null;
}

module.exports = { TASKS, getTask };
