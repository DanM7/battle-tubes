// Which opponents you've beaten in each mode, and which riders (by CHARACTERS id) you've
// unlocked with a password, saved in the browser. Beating an opponent unlocks them on
// that mode's rider select screen.
const KEY = 'battle-tubes-progress';

const progress = load();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return { beaten: { easy: [], hard: [], ...saved?.beaten }, passwords: saved?.passwords ?? [] };
  } catch {
    return { beaten: { easy: [], hard: [] }, passwords: [] };
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Storage can be unavailable (private browsing); progress just won't persist.
  }
}

export const hasBeaten = (difficulty, opponentKey) => progress.beaten[difficulty].includes(opponentKey);

// Returns true if this is the first time.
export function recordWin(difficulty, opponentKey) {
  if (hasBeaten(difficulty, opponentKey)) return false;
  progress.beaten[difficulty].push(opponentKey);
  save();
  return true;
}

export const hasPasswordUnlock = (id) => progress.passwords.includes(id);

// Returns true if this is the first time.
export function recordPasswordUnlock(id) {
  if (hasPasswordUnlock(id)) return false;
  progress.passwords.push(id);
  save();
  return true;
}
