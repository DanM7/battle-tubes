import { OPPONENTS, DIFFICULTIES, LADDER_ORDER, GRIP_PER_POINT } from './config.js';
import { CHARACTERS } from './characters.js';
import { hasBeaten, hasPasswordUnlock } from './progress.js';
import { newCustomRider, customName } from './customRiders.js';

// A 1-player run up the ladder, in LADDER_ORDER.
//   difficulty:   a DIFFICULTIES key
//   player:       { id, trunks } for a CHARACTERS rider in that trunks color, or
//                 { custom } with a copy of a custom rider (see customRiders.js)
//   order:        OPPONENTS keys, bottom rung first
//   rung:         index of the next opponent (order.length once the boss is beaten)
//   lastResult:   null | 'won' | 'lost' for the match just played
//   lastOpponent: OPPONENTS key of that opponent
export function newCampaign(difficulty = 'hard', player = { custom: newCustomRider(difficulty, 0) }) {
  return { difficulty, player, order: [...LADDER_ORDER], rung: 0, lastResult: null, lastOpponent: null };
}

export function afterMatch(campaign, playerWon) {
  const opponent = campaign.order[campaign.rung];
  return {
    ...campaign,
    rung: playerWon ? campaign.rung + 1 : campaign.rung,
    lastResult: playerWon ? 'won' : 'lost',
    lastOpponent: opponent,
  };
}

export const isChampion = (campaign) => campaign.rung >= campaign.order.length;

export const character = (id) => CHARACTERS.find((c) => c.id === id);

// The CHARACTERS entry for an OPPONENTS key.
export const opponentCharacter = (key) => CHARACTERS.find((c) => c.nickname === key);

// Real names in 1999, nicknames in 2010.
export const displayName = (c, difficulty) => (difficulty === 'easy' ? c.id : c.nickname);

// The modes that c.unlock.beat has to be beaten in.
const unlockModes = (difficulty, c) => c.unlock.modes ?? [difficulty];

export const isUnlocked = (difficulty, c) =>
  !c.unlock ||
  hasPasswordUnlock(c.id) ||
  unlockModes(difficulty, c).every((mode) => hasBeaten(mode, character(c.unlock.beat).nickname));

// The CHARACTERS entry whose unlock password this is, if any.
export const characterForPassword = (password) =>
  CHARACTERS.find((c) => c.unlock?.password && c.unlock.password.toUpperCase() === password.toUpperCase());

// "Beat Billy in 1999 to unlock", or one line per mode, finished ones first and marked:
// "Beat B-Nap in 2010 (done)\nand Adam in 1999 to unlock"
export function unlockText(difficulty, c) {
  const target = character(c.unlock.beat);
  const steps = unlockModes(difficulty, c)
    .map((mode) => ({ mode, done: Boolean(c.unlock.modes) && hasBeaten(mode, target.nickname) }))
    .sort((a, b) => b.done - a.done)
    .map(({ mode, done }) => `${displayName(target, mode)} in ${DIFFICULTIES[mode].year}${done ? ' (done)' : ''}`);
  return `Beat ${steps.join('\nand ')} to unlock`;
}

export const gripToughness = (grip) => 1 - (grip - 3) * GRIP_PER_POINT;

// Rider constructor options for a CHARACTERS entry in the given mode.
export function riderOptions(c, difficulty, trunks = c.trunks) {
  const { heightIn, grip } = c.stats[difficulty];
  return {
    name: displayName(c, difficulty),
    color: c.color,
    trunks,
    heightIn,
    toughness: gripToughness(grip),
    mass: c.mass ?? 1,
    leanPower: c.leanPower ?? 1,
  };
}

// The OPPONENTS fighting style for `key`, plus that rider's look, stats and style
// description for this mode.
export function rivalProfile(campaign, key) {
  const c = opponentCharacter(key);
  return { ...OPPONENTS[key], ...riderOptions(c, campaign.difficulty), style: c.style };
}

// Rider constructor options for a custom rider.
export const customRiderOptions = (rider) => ({
  name: customName(rider),
  color: rider.color,
  trunks: rider.trunks,
  heightIn: rider.heightIn,
  toughness: gripToughness(rider.grip),
});

export function playerRiderOptions(campaign) {
  const { id, trunks, custom } = campaign.player;
  return custom ? customRiderOptions(custom) : riderOptions(character(id), campaign.difficulty, trunks);
}
