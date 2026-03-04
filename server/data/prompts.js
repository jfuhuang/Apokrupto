// ---------------------------------------------------------------------------
// Static prompt pairs for Movement A
// Each prompt has a unique `id` that matches what is stored in the in-memory
// groupTurnState (promptId). IDs 1-15 are word prompts; 16-25 are sketch prompts.
// ---------------------------------------------------------------------------

const prompts = [
  // ── Word prompts ──────────────────────────────────────────────────────────
  { id:  1, phos_prompt: 'Sources of lasting joy',              skotia_prompt: 'Things that feel amazing but fade quickly',   theme_label: 'Joy vs. Pleasure',         prompt_mode: 'word' },
  { id:  2, phos_prompt: 'Things that truly restore you',       skotia_prompt: 'Ways people escape their problems',           theme_label: 'Rest vs. Escape',          prompt_mode: 'word' },
  { id:  3, phos_prompt: 'Things worth sacrificing for',        skotia_prompt: 'Things people give up just to fit in',        theme_label: 'Sacrifice vs. Conformity', prompt_mode: 'word' },
  { id:  4, phos_prompt: 'Signs of genuine courage',            skotia_prompt: "Things people do for others' approval",      theme_label: 'Courage vs. Approval',     prompt_mode: 'word' },
  { id:  5, phos_prompt: 'Things that build real community',    skotia_prompt: 'Things that make you popular',                theme_label: 'Community vs. Popularity', prompt_mode: 'word' },
  { id:  6, phos_prompt: 'Things that bring genuine peace',     skotia_prompt: 'Ways people stop themselves from thinking',   theme_label: 'Peace vs. Numbness',       prompt_mode: 'word' },
  { id:  7, phos_prompt: 'Signs of real growth in a person',    skotia_prompt: 'Things people change to impress others',      theme_label: 'Growth vs. Image',         prompt_mode: 'word' },
  { id:  8, phos_prompt: 'Things worth dedicating your life to',skotia_prompt: 'Things people chase to feel important',       theme_label: 'Purpose vs. Ambition',     prompt_mode: 'word' },
  { id:  9, phos_prompt: 'Things that make someone feel known', skotia_prompt: 'Things that make someone feel accepted',      theme_label: 'Belonging vs. Fitting In', prompt_mode: 'word' },
  { id: 10, phos_prompt: 'What real forgiveness looks like',    skotia_prompt: 'Ways people just try to move on',             theme_label: 'Forgiveness vs. Moving On',prompt_mode: 'word' },
  { id: 11, phos_prompt: 'Signs of genuine wisdom',             skotia_prompt: 'Things people mistake for wisdom',            theme_label: 'Wisdom vs. Cleverness',    prompt_mode: 'word' },
  { id: 12, phos_prompt: 'What makes a place feel like home',   skotia_prompt: 'Things that make you feel comfortable',       theme_label: 'Home vs. Comfort',         prompt_mode: 'word' },
  { id: 13, phos_prompt: 'What real strength looks like',       skotia_prompt: 'Ways people try to appear strong',            theme_label: 'Strength vs. Performance', prompt_mode: 'word' },
  { id: 14, phos_prompt: 'Things that bring genuine healing',   skotia_prompt: 'Ways people cope with pain',                  theme_label: 'Healing vs. Coping',       prompt_mode: 'word' },
  { id: 15, phos_prompt: 'What love actually requires',         skotia_prompt: 'What love feels like',                        theme_label: 'Love vs. Feeling',         prompt_mode: 'word' },

  // ── Sketch prompts ────────────────────────────────────────────────────────
  { id: 16, phos_prompt: 'A lighthouse',           skotia_prompt: 'A swamp',               theme_label: 'Light vs. Dark',          prompt_mode: 'sketch' },
  { id: 17, phos_prompt: 'A shepherd',             skotia_prompt: 'A wolf',                theme_label: 'Shepherd vs. Predator',   prompt_mode: 'sketch' },
  { id: 18, phos_prompt: 'A cross',                skotia_prompt: 'A crown',               theme_label: 'Sacrifice vs. Power',     prompt_mode: 'sketch' },
  { id: 19, phos_prompt: 'A garden in bloom',      skotia_prompt: 'A withered tree',       theme_label: 'Life vs. Decay',          prompt_mode: 'sketch' },
  { id: 20, phos_prompt: 'A door open to light',   skotia_prompt: 'A locked door',         theme_label: 'Welcome vs. Barrier',     prompt_mode: 'sketch' },
  { id: 21, phos_prompt: 'A calm lake',            skotia_prompt: 'A storm cloud',         theme_label: 'Peace vs. Storm',         prompt_mode: 'sketch' },
  { id: 22, phos_prompt: 'A sunrise',              skotia_prompt: 'A shadow',              theme_label: 'Hope vs. Fear',           prompt_mode: 'sketch' },
  { id: 23, phos_prompt: 'A bridge',               skotia_prompt: 'A wall',                theme_label: 'Unity vs. Division',      prompt_mode: 'sketch' },
  { id: 24, phos_prompt: 'A dove',                 skotia_prompt: 'A raven',               theme_label: 'Purity vs. Darkness',     prompt_mode: 'sketch' },
  { id: 25, phos_prompt: 'A loaf of bread',        skotia_prompt: 'A cracked, empty bowl', theme_label: 'Sustenance vs. Emptiness',prompt_mode: 'sketch' },
];

module.exports = prompts;
