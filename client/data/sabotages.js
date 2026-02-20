import { MECHANIC } from './tasks';

// Phoenician Unicode block — visually alien glyphs for text scrambling
const GLYPHS = '𐤀𐤁𐤂𐤃𐤄𐤅𐤆𐤇𐤈𐤉𐤊𐤋𐤌𐤍𐤎𐤏𐤐𐤑𐤒𐤓𐤔𐤕';

/**
 * Scramble a string into Phoenician glyphs using a seed for stable output.
 * Spaces are preserved so layout doesn't collapse.
 */
export function scrambleText(text, seed) {
  let h = String(seed)
    .split('')
    .reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0);

  return text
    .split('')
    .map((ch) => {
      if (ch === ' ') return ' ';
      h = (h * 1664525 + 1013904223) | 0;
      return GLYPHS[Math.abs(h) % GLYPHS.length];
    })
    .join('');
}

export const SABOTAGES = [
  {
    id: 'confuse_language',
    label: 'Confuse Language',
    symbol: '𐤀',
    reference: 'Gen 11:7',
    description: 'All task names have been scrambled into Babel-script. Innocents cannot read their tasks.',
    isCritical: false,
    duration: null,
    fixTask: {
      id: 'fix_confuse_language',
      title: 'Tongues of Fire',
      synopsis: 'Restore the common tongue by answering the questions of Pentecost.',
      reference: 'Acts 2:4',
      mechanic: MECHANIC.QUIZ,
      config: {
        questions: [
          {
            prompt: 'On what day did the Holy Spirit descend at Pentecost?',
            options: ['The 50th day after Passover', 'The Sabbath', 'The first day of the week', 'The Day of Atonement'],
            answerIndex: 0,
          },
          {
            prompt: 'What appeared above the disciples when the Spirit descended?',
            options: ['Tongues of fire', 'A dove', 'A bright cloud', 'A pillar of smoke'],
            answerIndex: 0,
          },
          {
            prompt: 'What happened to the disciples after they were filled with the Spirit?',
            options: ['They spoke in other tongues', 'They were lifted into the air', 'They fell asleep', 'They became invisible'],
            answerIndex: 0,
          },
        ],
        timeLimit: 45,
      },
      timeLimit: 45,
      points: { alive: 0, dead: 0 },
    },
  },
  {
    id: 'egyptian_darkness',
    label: 'Egyptian Darkness',
    symbol: '🌑',
    reference: 'Exod 10:22',
    description: 'A thick darkness covers the land. The deceivers win if light is not restored in time.',
    isCritical: true,
    duration: 90,
    fixTask: {
      id: 'fix_egyptian_darkness',
      title: 'Follow the Pillar of Fire',
      synopsis: 'Hold fast to the pillar of fire that guides the people through the darkness.',
      reference: 'Exod 13:21',
      mechanic: MECHANIC.HOLD,
      config: {
        holdDuration: 6,
        label: 'HOLD THE FLAME',
      },
      timeLimit: 20,
      points: { alive: 0, dead: 0 },
    },
  },
  {
    id: 'famine',
    label: 'Famine in the Land',
    symbol: '🌾',
    reference: 'Gen 41:30',
    description: 'Famine spreads across the land. The deceivers win if the grain is not distributed in time.',
    isCritical: true,
    duration: 60,
    fixTask: {
      id: 'fix_famine',
      title: 'Distribute the Grain',
      synopsis: 'Tap rapidly to distribute grain from the storehouses to the starving people.',
      reference: 'Gen 41:56',
      mechanic: MECHANIC.RAPID_TAP,
      config: {
        tapsRequired: 40,
        timeLimit: 15,
        label: 'DISTRIBUTE',
      },
      timeLimit: 15,
      points: { alive: 0, dead: 0 },
    },
  },
];

const sabotageMap = new Map(SABOTAGES.map((s) => [s.id, s]));

export function getSabotageById(id) {
  return sabotageMap.get(id) || null;
}
