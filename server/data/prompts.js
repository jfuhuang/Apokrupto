// ---------------------------------------------------------------------------
// Static prompt pairs for Movement A
// Each prompt has a unique `id` that matches what is stored in the in-memory
// groupTurnState (promptId). IDs 1-15 are word prompts; 16-25 are sketch prompts.
// ---------------------------------------------------------------------------

const prompts = [
  // ── Word prompts ──────────────────────────────────────────────────────────
  { id: 1, phos_prompt: 'Best dining center', skotia_prompt: 'Worst dining center', prompt_mode: 'word' },
  { id: 2, phos_prompt: 'Worst dorms', skotia_prompt: 'Best dorms', prompt_mode: 'word' },
  { id: 3, phos_prompt: 'Best warm beverage', skotia_prompt: 'Best beverage', prompt_mode: 'word' },
  { id: 4, phos_prompt: 'Your major', skotia_prompt: 'The best major', prompt_mode: 'word' },
  { id: 5, phos_prompt: 'Your home town', skotia_prompt: 'Worst city in America', prompt_mode: 'word' },
  // { id: 6, phos_prompt: 'Things that bring genuine peace', skotia_prompt: 'Ways people stop themselves from thinking', prompt_mode: 'word' },
  // { id: 7, phos_prompt: 'Signs of real growth in a person', skotia_prompt: 'Things people change to impress others', prompt_mode: 'word' },
  // { id: 8, phos_prompt: 'Things worth dedicating your life to', skotia_prompt: 'Things people chase to feel important', prompt_mode: 'word' },
  // { id: 9, phos_prompt: 'Things that make someone feel known', skotia_prompt: 'Things that make someone feel accepted', prompt_mode: 'word' },
  // { id: 10, phos_prompt: 'What real forgiveness looks like', skotia_prompt: 'Ways people just try to move on', prompt_mode: 'word' },
  // { id: 11, phos_prompt: 'Signs of genuine wisdom', skotia_prompt: 'Things people mistake for wisdom', prompt_mode: 'word' },
  // { id: 12, phos_prompt: 'What makes a place feel like home', skotia_prompt: 'Things that make you feel comfortable', prompt_mode: 'word' },
  // { id: 13, phos_prompt: 'What real strength looks like', skotia_prompt: 'Ways people try to appear strong', prompt_mode: 'word' },
  // { id: 14, phos_prompt: 'Things that bring genuine healing', skotia_prompt: 'Ways people cope with pain', prompt_mode: 'word' },
  // { id: 15, phos_prompt: 'What love actually requires', skotia_prompt: 'What love feels like', prompt_mode: 'word' },

  // ── Sketch prompts ────────────────────────────────────────────────────────
  { id: 16, phos_prompt: 'A lighthouse', skotia_prompt: 'A lake', prompt_mode: 'sketch' },
  { id: 17, phos_prompt: 'A shepherd', skotia_prompt: 'An old man', prompt_mode: 'sketch' },
  { id: 18, phos_prompt: 'A complex polygon', skotia_prompt: 'Any shape', prompt_mode: 'sketch' },
  { id: 19, phos_prompt: 'A teacher', skotia_prompt: 'A school', prompt_mode: 'sketch' },
  { id: 20, phos_prompt: 'A telephone', skotia_prompt: 'A cellphone', prompt_mode: 'sketch' },
  { id: 21, phos_prompt: 'Your favorite animal', skotia_prompt: 'Your least favorite animal', prompt_mode: 'sketch' },
  { id: 22, phos_prompt: 'A sunrise', skotia_prompt: 'A shadow', prompt_mode: 'sketch' },
  { id: 23, phos_prompt: 'A bridge', skotia_prompt: 'A wall', prompt_mode: 'sketch' },
  { id: 24, phos_prompt: 'A dove', skotia_prompt: 'A raven', prompt_mode: 'sketch' },
  { id: 25, phos_prompt: 'A loaf of bread', skotia_prompt: 'A cracked, empty bowl', prompt_mode: 'sketch' },
];

module.exports = prompts;
