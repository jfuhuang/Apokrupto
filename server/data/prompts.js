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
  { id: 6, phos_prompt: 'Favorite music genre', skotia_prompt: 'Worst movie genre', prompt_mode: 'word' },
  { id: 7, phos_prompt: 'Best season', skotia_prompt: 'Worst season', prompt_mode: 'word' },
  { id: 8, phos_prompt: 'Favorite movie', skotia_prompt: 'Overrated movie', prompt_mode: 'word' },
  { id: 9, phos_prompt: 'Best pizza topping', skotia_prompt: 'Worst pizza topping', prompt_mode: 'word' },
  { id: 10, phos_prompt: 'The price of gas', skotia_prompt: 'The price of eggs', prompt_mode: 'word' },
  { id: 11, phos_prompt: 'Best candy bar', skotia_prompt: 'Most overrated candy bar', prompt_mode: 'word' },
  { id: 12, phos_prompt: 'Ideal vacation spot', skotia_prompt: 'An Asian country', prompt_mode: 'word' },
  { id: 13, phos_prompt: 'Favorite pet animal', skotia_prompt: 'Favorite animal to eat', prompt_mode: 'word' },
  { id: 14, phos_prompt: 'Best decade for music', skotia_prompt: 'Best decade for film', prompt_mode: 'word' },
  { id: 15, phos_prompt: 'Your screen time in minutes per day', skotia_prompt: 'Number of followers on social media', prompt_mode: 'word' },

  // ── Sketch prompts ────────────────────────────────────────────────────────
  { id: 16, phos_prompt: 'A lighthouse', skotia_prompt: 'Eye of Sauron', prompt_mode: 'sketch' },
  { id: 17, phos_prompt: 'A shepherd', skotia_prompt: 'An old man', prompt_mode: 'sketch' },
  { id: 18, phos_prompt: 'A complex polygon', skotia_prompt: 'Any shape', prompt_mode: 'sketch' },
  { id: 19, phos_prompt: 'A teacher', skotia_prompt: 'A school', prompt_mode: 'sketch' },
  { id: 20, phos_prompt: 'A telephone', skotia_prompt: 'A cellphone', prompt_mode: 'sketch' },
  { id: 21, phos_prompt: 'A dinosaur', skotia_prompt: 'A dragon', prompt_mode: 'sketch' },
  { id: 22, phos_prompt: 'A dog', skotia_prompt: 'A cat', prompt_mode: 'sketch' },
  { id: 23, phos_prompt: 'A river', skotia_prompt: 'A road', prompt_mode: 'sketch' },
  { id: 24, phos_prompt: 'A computer mouse', skotia_prompt: 'A rat', prompt_mode: 'sketch' },
  { id: 25, phos_prompt: 'Space', skotia_prompt: 'The ocean', prompt_mode: 'sketch' },
];

module.exports = prompts;
