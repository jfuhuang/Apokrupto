// Server-side sabotage metadata — used to validate activateSabotage requests
// and to drive critical-sabotage countdowns. No client-only config here.

const SABOTAGES = [
  { id: 'confuse_language',  label: 'Confuse Language',    isCritical: false, duration: null },
  { id: 'egyptian_darkness', label: 'Egyptian Darkness',   isCritical: true,  duration: 90  },
  { id: 'famine',            label: 'Famine in the Land',  isCritical: true,  duration: 60  },
];

const sabotageMap = new Map(SABOTAGES.map((s) => [s.id, s]));

function getSabotage(id) {
  return sabotageMap.get(id) || null;
}

module.exports = { SABOTAGES, getSabotage };
