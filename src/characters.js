// Every rider in the game except the player's own custom riders (see customRiders.js and
// CUSTOM in config.js). Edit freely.
//
// The list order is the order on the rider select screen, below the row of custom riders.
// Opponents use the same entry
// for how they look when you fight them and when you play as them. How the CPU fights
// (attack mix, distance, aggression...) is in OPPONENTS in config.js.
//
//   id:        real name, shown in 1999 (easy)
//   nickname:  shown in 2010 (hard). For ladder opponents, this is also their
//              OPPONENTS key in config.js.
//   ladderId:  (optional) this rider's rung on the 1-player ladder, 1 = first opponent.
//              The highest is the final boss and the next highest the sub-boss.
//              Riders without one are never fought. Every ladder rider needs an
//              OPPONENTS entry in config.js.
//   color:     shirt color
//   trunks:    default swim trunks color. The select screen also offers TRUNKS_COLORS
//              from config.js.
//   mass:      (optional, default 1) how hard they are to shove, and how hard they
//              shove, when tubes bump
//   leanPower: (optional, default 1) lean strength multiplier
//   style:     their play style, shown on the select screen and the ladder
//   stats:     per mode ('easy' is 1999, 'hard' is 2010):
//                heightIn: height in inches. Taller riders reach farther and have
//                          bigger hitboxes.
//                grip:     1-5 grip strength. Each point above 3 cuts the damage they
//                          take by 6%; each point below 3 adds 6%.
//   unlock:    null = playable from the start.
//              { beat: 'Billy' } = playable after beating that rider (by id) in the
//              mode you're playing.
//              { beat: 'Adam', modes: ['easy', 'hard'] } = playable (in any mode) after
//              beating that rider in every one of those modes.
//              password: (optional) entering it on the main menu's Password screen
//              also unlocks this rider, in every mode. Letters A-Z only; it's matched
//              in uppercase.

export const CHARACTERS = [
  {
    id: 'Billy',
    nickname: 'Chillo',
    ladderId: 1,
    color: 0x2ecc71,
    trunks: 0xfcd34d,
    style: 'Rookie. Flails at anything, even from too far away, and barely defends.',
    stats: {
      easy: { heightIn: 65, grip: 1 },
      hard: { heightIn: 72, grip: 2 },
    },
    unlock: { beat: 'Billy', password: 'NILL' },
  },
  {
    id: 'Rob',
    nickname: 'Franzi',
    ladderId: 2,
    color: 0xf1c40f,
    trunks: 0x1f2937,
    style: 'Aggressive spammer. Gets right up close and never stops swinging.',
    stats: {
      easy: { heightIn: 60, grip: 3 },
      hard: { heightIn: 68, grip: 3 },
    },
    unlock: { beat: 'Rob', password: 'BOBD' },
  },
  {
    id: 'Mike',
    nickname: 'Burton',
    ladderId: 3,
    color: 0x2457d6,
    trunks: 0xf77f00,
    mass: 1.8,
    leanPower: 1.3,
    style: 'Rammer. Big, heavy, and always shoving you toward the shore.',
    stats: {
      easy: { heightIn: 68, grip: 3 },
      hard: { heightIn: 74, grip: 3 },
    },
    unlock: { beat: 'Mike', password: 'SEEE' },
  },
  {
    id: 'RJ',
    nickname: 'Moni',
    ladderId: 4,
    color: 0xa31621,
    trunks: 0x14b8a6,
    style: 'Passive strafer. Drifts in and out of kick range, dodges, backs off when hurt.',
    stats: {
      easy: { heightIn: 62, grip: 3 },
      hard: { heightIn: 69, grip: 3 },
    },
    unlock: { beat: 'RJ', password: 'PONO' },
  },
  {
    id: 'Dan',
    nickname: 'Barf',
    ladderId: 5,
    color: 0xe67e22,
    trunks: 0x1d4ed8,
    style: 'Sub-boss. Fights like any rider below him on the ladder, and keeps switching.',
    stats: {
      easy: { heightIn: 67, grip: 3 },
      hard: { heightIn: 70, grip: 3 },
    },
    unlock: { beat: 'Dan', password: 'PUKE' },
  },
  {
    id: 'Adam',
    nickname: 'B-Nap',
    ladderId: 6,
    color: 0x22262e,
    trunks: 0xd62828,
    leanPower: 1.2,
    style: 'The final boss. Slippery, does everything well, grabs every health item.',
    stats: {
      easy: { heightIn: 56, grip: 5 },
      hard: { heightIn: 67, grip: 5 },
    },
    unlock: { beat: 'Adam', password: 'DOLE' },
  },
  {
    id: 'Jeff',
    nickname: 'Ffej',
    color: 0xff5fa2,
    trunks: 0x1f2937,
    style: 'Secret bonus rider. Good reach and a strong grip.',
    stats: {
      easy: { heightIn: 70, grip: 5 },
      hard: { heightIn: 70, grip: 5 },
    },
    unlock: { beat: 'Adam', modes: ['easy', 'hard'], password: 'THEQ' },
  },
];
