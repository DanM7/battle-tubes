// Roster is loaded from game.json (battle-tubes-data) at startup. See that file for the
// field docs (id, nickname, sprites, looks, unlock passwords, …). How the CPU fights is
// under "opponents" in the same file.

export const CHARACTERS = [];

export function applyCharacters(list) {
  CHARACTERS.length = 0;
  CHARACTERS.push(...list);
}
