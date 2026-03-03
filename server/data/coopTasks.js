const crypto = require('crypto');

const COOP_MULTIPLIER = 1;
const COOP_TASK_TYPES = ['deception', 'secret_ballot', 'coop_tap', 'coop_hold'];
const COOP_BASE_POINTS = { deception: 3, secret_ballot: 0, coop_tap: 2, coop_hold: 3 };

const THEME_POOLS = {
  'Greek Letters': [
    [{ label: 'ALPHA', display: 'α' }, { label: 'OMEGA', display: 'Ω' }],
    [{ label: 'PHI', display: 'φ' }, { label: 'PSI', display: 'ψ' }],
    [{ label: 'LAMBDA', display: 'λ' }, { label: 'SIGMA', display: 'σ' }],
  ],
  'Hebrew Letters': [
    [{ label: 'ALEPH', display: 'א' }, { label: 'BET', display: 'ב' }],
    [{ label: 'SHIN', display: 'ש' }, { label: 'MEM', display: 'מ' }],
    [{ label: 'GIMEL', display: 'ג' }, { label: 'DALET', display: 'ד' }],
  ],
  'Colors': [
    [{ label: 'RED', display: '🔴' }, { label: 'BLUE', display: '🔵' }],
    [{ label: 'GOLD', display: '🟡' }, { label: 'SILVER', display: '⚪' }],
    [{ label: 'GREEN', display: '🟢' }, { label: 'PURPLE', display: '🟣' }],
  ],
  'Shapes': [
    [{ label: 'CIRCLE', display: '●' }, { label: 'TRIANGLE', display: '▲' }],
    [{ label: 'SQUARE', display: '■' }, { label: 'DIAMOND', display: '◆' }],
  ],
  'Numbers': [
    [{ label: 'ODD', display: '1' }, { label: 'EVEN', display: '2' }],
    [{ label: 'PRIME', display: '7' }, { label: 'COMPOSITE', display: '8' }],
  ],
};

const DECREE_LABELS = [
  'Decree of Prosperity',
  'Edict of Shadow',
  'Mandate of Light',
  'Order of Twilight',
  'Proclamation of Dawn',
  'Verdict of Dusk',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPoints() {
  return Math.floor(Math.random() * 3) + 1; // 1–3
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateDeception() {
  const themeNames = Object.keys(THEME_POOLS);
  const theme = pick(themeNames);
  const pair = pick(THEME_POOLS[theme]);
  const phosOptionIndex = Math.random() < 0.5 ? 0 : 1;
  const side = phosOptionIndex === 0 ? 'LEFT' : 'RIGHT';

  return {
    taskId: `deception_${crypto.randomUUID()}`,
    taskType: 'deception',
    timeLimit: 30,
    config: {
      theme,
      optionA: pair[0],
      optionB: pair[1],
      phosMessage: `For Phos, select the ${side} one`,
      skotiaMessage: `For Skotia, select the ${side} one`,
    },
    _server: { phosOptionIndex },
  };
}

function generateSecretBallot() {
  const teams = ['phos', 'skotia'];
  const labels = shuffleArray(DECREE_LABELS).slice(0, 3);

  // Guarantee at least 1 phos and 1 skotia
  const decrees = labels.map((label, index) => ({
    index,
    team: index === 0 ? 'phos' : index === 1 ? 'skotia' : pick(teams),
    points: randomPoints(),
    label,
  }));

  return {
    taskId: `ballot_${crypto.randomUUID()}`,
    taskType: 'secret_ballot',
    timeLimit: 45,
    config: { decrees },
    _server: {},
  };
}

function generateCoopTap() {
  return {
    taskId: `coop_tap_${crypto.randomUUID()}`,
    taskType: 'coop_tap',
    timeLimit: 15,
    config: { targetTaps: Math.floor(Math.random() * 31) + 50 }, // 50–80
    _server: {},
  };
}

function generateCoopHold() {
  return {
    taskId: `coop_hold_${crypto.randomUUID()}`,
    taskType: 'coop_hold',
    timeLimit: 20,
    config: { targetMs: 5000 },
    _server: {},
  };
}

function generateCoopTask() {
  const type = pick(COOP_TASK_TYPES);
  switch (type) {
    case 'deception':     return generateDeception();
    case 'secret_ballot': return generateSecretBallot();
    case 'coop_tap':      return generateCoopTap();
    case 'coop_hold':     return generateCoopHold();
    default:              return generateCoopTap();
  }
}

module.exports = { COOP_MULTIPLIER, COOP_TASK_TYPES, COOP_BASE_POINTS, generateCoopTask };
