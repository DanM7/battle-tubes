import { SCORE, DIFFICULTIES } from './config.js';

// The best 1 Player runs in each mode, saved in the browser, highest first:
//   { runId, score, name, beaten, champion }
// A run is one climb up the ladder without losing a match; its entry is updated after
// every match, so quitting partway still keeps what it had scored.
const KEY = 'battle-tubes-high-scores';

const tables = load();

function load() {
  const empty = Object.fromEntries(Object.keys(DIFFICULTIES).map((d) => [d, []]));
  try {
    return { ...empty, ...JSON.parse(localStorage.getItem(KEY)) };
  } catch {
    return empty;
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(tables));
  } catch {
    // Storage can be unavailable (private browsing); scores just won't persist.
  }
}

export const highScores = (difficulty) => tables[difficulty];

export const bestScore = (difficulty) => tables[difficulty][0]?.score ?? 0;

// Returns true if it's the best in that mode yet.
export function recordScore(difficulty, entry) {
  const newBest = entry.score > bestScore(difficulty);
  const others = tables[difficulty].filter((e) => e.runId !== entry.runId);
  tables[difficulty] = [...others, entry].sort((a, b) => b.score - a.score).slice(0, SCORE.tableSize);
  save();
  return newBest;
}

export const rungMultiplier = (rung) => 1 + rung * SCORE.rungStep;

export const formatScore = (n) => n.toLocaleString('en-US');
