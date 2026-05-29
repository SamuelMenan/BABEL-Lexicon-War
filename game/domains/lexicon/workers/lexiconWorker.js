// Web Worker: lexicon matching off main thread.
// Recibe { typedText, activeWords:[{id,word}] } -> { matches:[{id,word,score,prefix}], collapsed:{id,word}|null }

const MSG = {
  PROCESS_INPUT: 'PROCESS_INPUT',
  RESULT:        'PROCESS_RESULT',
};

function levenshtein(a, b) {
  if (a === b) return 0;
  const la = a.length, lb = b.length;
  if (!la) return lb; if (!lb) return la;
  let prev = new Array(lb + 1);
  let curr = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;
  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= lb; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    const t = prev; prev = curr; curr = t;
  }
  return prev[lb];
}

function processInput(typedText, activeWords) {
  const typed = (typedText || '').toLowerCase();
  const matches = [];
  let collapsed = null;

  for (let i = 0; i < activeWords.length; i++) {
    const item = activeWords[i];
    const word = (item.word || '').toLowerCase();
    if (!word) continue;

    const prefix = typed && word.startsWith(typed);
    if (prefix) {
      const score = typed.length / word.length;
      matches.push({ id: item.id, word: item.word, score, prefix: true });
      if (typed.length === word.length && !collapsed) {
        collapsed = { id: item.id, word: item.word };
      }
    } else if (typed && typed.length >= 2) {
      // fuzzy fallback
      const dist = levenshtein(typed, word.slice(0, typed.length));
      if (dist <= 1) matches.push({ id: item.id, word: item.word, score: 0.5, prefix: false });
    }
  }
  matches.sort((a, b) => b.score - a.score);
  return { matches, collapsed };
}

self.onmessage = (e) => {
  const { type, requestId, payload } = e.data || {};
  if (type !== MSG.PROCESS_INPUT) return;
  const t0 = performance.now();
  const out = processInput(payload?.typedText ?? '', payload?.activeWords ?? []);
  self.postMessage({
    type: MSG.RESULT,
    requestId,
    payload: out,
    workerMs: performance.now() - t0,
  });
};
