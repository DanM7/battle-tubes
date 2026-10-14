// Every rider in the game except the player's own custom riders (see customRiders.js and
// CUSTOM in config.js). Edit freely.
//
// The list order is the order on the rider select screen, below the row of custom riders.
// Opponents use the same entry
// for how they look when you fight them and when you play as them. How the CPU fights
// (attack mix, distance, aggression...) is in OPPONENTS in config.js.
//
//   id:        their key: unlock.beat refers to it, and saved progress stores it, so
//              don't change it once set. Also their name in 1999 (easy) unless they
//              have a `name`.
//   name:      (optional) shown in 1999 instead of id; spaces are fine
//   nickname:  shown in 2010 (hard). For ladder opponents, this is also their
//              OPPONENTS key in config.js.
//   ladderId:  (optional) this rider's rung on the 1-player ladder, 1 = first opponent.
//              The highest is the final boss and the next highest the sub-boss.
//              Riders without one are never fought. Every ladder rider needs an
//              OPPONENTS entry in config.js.
//   color:     shirt color
//   trunks:    swim trunks color in a match; keep it matching their sprites' shorts
//   skin:      (optional, default SKIN in config.js) skin color in a match
//   secret:    (optional) not on the select screen until unlocked, then in the top row
//              with your custom riders
//   mass:      (optional, default 1) how hard they are to shove, and how hard they
//              shove, when tubes bump
//   leanPower: (optional, default 1) lean strength multiplier
//   style:     their play style, shown on the select screen and the ladder
//   sprites:   (optional) per mode, a transparent PNG under public/ of them standing,
//              head centered left to right. In that mode the select screen shows it
//              instead of the drawn rider, and its top middle in their grid spot.
//              tools/cutout.py makes these from the plain-background pictures in
//              art/riders/.
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
//              { password: 'BART' } alone = playable only once that's entered.

export const CHARACTERS = [
  {
    id: 'Billy',
    nickname: 'Chillo',
    ladderId: 1,
    color: 0x2ecc71,
    trunks: 0xf5c228,
    style: 'Rookie. Flails at anything, even from too far away, and barely defends.',
    sprites: { easy: 'assets/sprites/riders/player-billy.png' },
    stats: {
      easy: { heightIn: 66, grip: 1 },
      hard: { heightIn: 72, grip: 2 },
    },
    unlock: { beat: 'Billy', password: 'NILL' },
  },
  {
    id: 'Rob',
    nickname: 'Franzi',
    ladderId: 2,
    color: 0xf1c40f,
    trunks: 0x389942,
    style: 'Aggressive spammer. Gets right up close and never stops swinging.',
    sprites: { easy: 'assets/sprites/riders/player-rob.png' },
    stats: {
      easy: { heightIn: 60, grip: 3 },
      hard: { heightIn: 68, grip: 3 },
    },
    unlock: { beat: 'Rob', password: 'BOBD' },
  },
  {
    id: 'Mike',
    name: 'Mike See',
    nickname: 'Burton',
    ladderId: 3,
    color: 0x2457d6,
    trunks: 0x8d559e,
    mass: 1.8,
    leanPower: 1.3,
    style: 'Rammer. Big, heavy, and always shoving you toward the shore.',
    sprites: { easy: 'assets/sprites/riders/player-mike.png' },
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
    trunks: 0x70b6d8,
    style: 'Passive strafer. Drifts in and out of kick range, dodges, backs off when hurt.',
    sprites: { easy: 'assets/sprites/riders/player-rj.png' },
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
    trunks: 0xf68427,
    style: 'Sub-boss. Fights like any rider below him on the ladder, and keeps switching.',
    sprites: { easy: 'assets/sprites/riders/player-dan.png' },
    stats: {
      easy: { heightIn: 64, grip: 3 },
      hard: { heightIn: 70, grip: 3 },
    },
    unlock: { beat: 'Dan', password: 'PUKE' },
  },
  {
    id: 'Adam',
    nickname: 'B-Nap',
    ladderId: 6,
    color: 0x22262e,
    trunks: 0xbd2530,
    leanPower: 1.2,
    style: 'The final boss. Slippery, does everything well, grabs every health item.',
    sprites: { easy: 'assets/sprites/riders/player-adam.png' },
    stats: {
      easy: { heightIn: 58, grip: 5 },
      hard: { heightIn: 67, grip: 5 },
    },
    unlock: { beat: 'Adam', password: 'DOLE' },
  },
  {
    id: 'Jeff',
    nickname: 'Ffej',
    color: 0xff5fa2,
    trunks: 0x312e35,
    style: 'Secret bonus rider. Good reach and a strong grip.',
    sprites: { easy: 'assets/sprites/riders/player-jeff.png', hard: 'assets/sprites/riders/player-ffej.png' },
    stats: {
      easy: { heightIn: 70, grip: 5 },
      hard: { heightIn: 70, grip: 5 },
    },
    unlock: { beat: 'Adam', modes: ['easy', 'hard'], password: 'THEQ' },
  },
  {
    id: 'Bart',
    nickname: 'El Barto',
    color: 0xd62828,
    trunks: 0x1d4ed8,
    skin: 0xfcd34d,
    secret: true,
    style: 'Secret password rider. Short, yellow, and tells everyone to eat his shorts.',
    stats: {
      easy: { heightIn: 54, grip: 3 },
      hard: { heightIn: 58, grip: 3 },
    },
    unlock: { password: 'BART' },
  },
];
