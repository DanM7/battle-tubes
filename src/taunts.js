// Lines come from game.json (battle-tubes-data). Any rider can say any line.

export const TAUNTS = [];

let pile = [];

export function applyTaunts(lines) {
  TAUNTS.length = 0;
  TAUNTS.push(...lines);
  pile = [];
}

// Deals lines in shuffled order, so nothing repeats until every line has been used.
export function nextTaunt() {
  if (pile.length === 0) {
    pile = [...TAUNTS];
    for (let i = pile.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pile[i], pile[j]] = [pile[j], pile[i]];
    }
  }
  return pile.pop();
}
