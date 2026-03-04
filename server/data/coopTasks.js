const crypto = require('crypto');

const COOP_MULTIPLIER = 3;
const COOP_TASK_TYPES = ['deception', 'secret_ballot', 'coop_tap', 'coop_hold', 'simon_says'];
const COOP_BASE_POINTS = { deception: 3, secret_ballot: 0, coop_tap: 2, coop_hold: 3, simon_says: 4 };

const THEME_POOLS = {
  // Classic "Who's on First" names that double as real words
  "Who's on First": [
    [{ label: 'WHO',          display: 'Who'         }, { label: 'WHAT',        display: 'What'       }],
    [{ label: 'WHY',          display: 'Why'         }, { label: 'BECAUSE',     display: 'Because'    }],
    [{ label: 'TODAY',        display: 'Today'       }, { label: 'TOMORROW',    display: 'Tomorrow'   }],
    [{ label: "I DON'T KNOW", display: "I Don't\nKnow" }, { label: 'NOBODY',  display: 'Nobody'     }],
    [{ label: 'NATURALLY',    display: 'Naturally'   }, { label: 'CERTAINLY',   display: 'Certainly'  }],
  ],
  // Homophones — identical sound, different spelling
  'Homophones': [
    [{ label: 'RIGHT', display: 'Right'  }, { label: 'WRITE',  display: 'Write'  }],
    [{ label: 'KNOT',  display: 'Knot'   }, { label: 'NOT',    display: 'Not'    }],
    [{ label: 'WON',   display: 'Won'    }, { label: 'ONE',    display: 'One'    }],
    [{ label: 'SON',   display: 'Son'    }, { label: 'SUN',    display: 'Sun'    }],
    [{ label: 'KNIGHT',display: 'Knight' }, { label: 'NIGHT',  display: 'Night'  }],
    [{ label: 'TWO',   display: 'Two'    }, { label: 'TOO',    display: 'Too'    }],
    [{ label: 'HEAR',  display: 'Hear'   }, { label: 'HERE',   display: 'Here'   }],
    [{ label: 'THERE', display: 'There'  }, { label: 'THEIR',  display: 'Their'  }],
    [{ label: 'BARE',  display: 'Bare'   }, { label: 'BEAR',   display: 'Bear'   }],
    [{ label: 'FLOUR', display: 'Flour'  }, { label: 'FLOWER', display: 'Flower' }],
  ],
  // Directional / command words that get confusing as instructions
  'Confusing Commands': [
    [{ label: 'RIGHT', display: 'Right' }, { label: 'LEFT',  display: 'Left'  }],
    [{ label: 'UP',    display: 'Up'    }, { label: 'DOWN',  display: 'Down'  }],
    [{ label: 'STOP',  display: 'Stop'  }, { label: 'GO',    display: 'Go'    }],
    [{ label: 'PASS',  display: 'Pass'  }, { label: 'SKIP',  display: 'Skip'  }],
    [{ label: 'BEGIN', display: 'Begin' }, { label: 'END',   display: 'End'   }],
  ],
  // Meta / self-referential words
  'This or That': [
    [{ label: 'THIS',    display: 'This'    }, { label: 'THAT',    display: 'That'    }],
    [{ label: 'YES',     display: 'Yes'     }, { label: 'NO',      display: 'No'      }],
    [{ label: 'IT',      display: 'It'      }, { label: 'WHAT',    display: 'What'    }],
    [{ label: 'CORRECT', display: 'Correct' }, { label: 'WRONG',   display: 'Wrong'   }],
    [{ label: 'FIRST',   display: 'First'   }, { label: 'SECOND',  display: 'Second'  }],
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
  return Math.floor(Math.random() * 13) + 3; // 3–15
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
  const skotiaOptionIndex = 1 - phosOptionIndex;
  const phosWord = pair[phosOptionIndex].label;
  const skotiaWord = pair[skotiaOptionIndex].label;

  return {
    taskId: `deception_${crypto.randomUUID()}`,
    taskType: 'deception',
    timeLimit: 30,
    config: {
      theme,
      optionA: pair[0],
      optionB: pair[1],
      phosMessage: `Tell your partner to tap: ${phosWord}`,
      skotiaMessage: `Tell your partner to tap: ${skotiaWord}`,
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

const SIMON_COLORS = ['red', 'yellow', 'green', 'blue'];

function _randomSeq(len) {
  const seq = [];
  for (let i = 0; i < len; i++) {
    seq.push(SIMON_COLORS[Math.floor(Math.random() * SIMON_COLORS.length)]);
  }
  return seq;
}

function generateSimonSays() {
  const len = 4;
  const phosPattern = _randomSeq(len);
  let skotiaPattern = _randomSeq(len);
  // Ensure the two patterns differ (retry up to 20 times)
  let tries = 0;
  while (JSON.stringify(phosPattern) === JSON.stringify(skotiaPattern) && tries++ < 20) {
    skotiaPattern = _randomSeq(len);
  }
  return {
    taskId: `simon_says_${crypto.randomUUID()}`,
    taskType: 'simon_says',
    timeLimit: 60,
    config: {
      colors: SIMON_COLORS,
      sequenceLength: len,
    },
    _server: {
      phosPattern,
      skotiaPattern,
    },
  };
}

function generateCoopTask() {
  const type = pick(COOP_TASK_TYPES);
  switch (type) {
    case 'deception':     return generateDeception();
    case 'secret_ballot': return generateSecretBallot();
    case 'coop_tap':      return generateCoopTap();
    case 'coop_hold':     return generateCoopHold();
    case 'simon_says':    return generateSimonSays();
    default:              return generateCoopTap();
  }
}

module.exports = { COOP_MULTIPLIER, COOP_TASK_TYPES, COOP_BASE_POINTS, generateCoopTask };
