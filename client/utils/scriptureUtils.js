function normalizeWord(word) {
  return word.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, '');
}

export function scoreVerse(typed, targetText, threshold = 0.80) {
  const targetWords = targetText.split(/\s+/).map(normalizeWord).filter(Boolean);
  const typedWords  = typed.split(/\s+/).map(normalizeWord).filter(Boolean);

  // Frequency map of target words
  const freq = {};
  targetWords.forEach((w) => { freq[w] = (freq[w] || 0) + 1; });

  // Count matches (each target occurrence consumed at most once)
  const used = {};
  let matched = 0;
  typedWords.forEach((w) => {
    if (freq[w] && (used[w] || 0) < freq[w]) {
      matched++;
      used[w] = (used[w] || 0) + 1;
    }
  });

  const accuracy = targetWords.length > 0 ? matched / targetWords.length : 0;
  return { accuracy, matched, total: targetWords.length, passed: accuracy >= threshold };
}
