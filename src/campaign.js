import { OPPONENTS, DIFFICULTIES, LADDER_ORDER } from './config.js';

// A 1-player run up the ladder, in LADDER_ORDER.
//   difficulty:   a DIFFICULTIES key
//   order:        OPPONENTS keys, bottom rung first
//   rung:         index of the next opponent (order.length once the boss is beaten)
//   lastResult:   null | 'won' | 'lost' for the match just played
//   lastOpponent: OPPONENTS key of that opponent
export function newCampaign(difficulty = 'hard') {
  return { difficulty, order: [...LADDER_ORDER], rung: 0, lastResult: null, lastOpponent: null };
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

// The OPPONENTS persona for `key`, with this mode's name and height.
export function rivalProfile(campaign, key) {
  return { ...OPPONENTS[key], name: key, ...DIFFICULTIES[campaign.difficulty].roster[key] };
}
