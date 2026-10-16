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
//   skin:      (optional, default SKIN in config.js) skin color in a match; keep it matching
//              their sprites' lit skin (the pictures' shading is made from it)
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
//   body:      (optional, default 'normal') build in their attack pictures, lightest
//              first: 'skinny', 'normal', 'chubby', 'fat' or 'huge'
//              (art/riders/bodies/; normal is Dan's)
//   heads:     (optional) per mode, the head on their attack pictures: the name of a
//              picture in art/riders/heads/ (their build's first frame with their
//              head). A mode without one uses easy's; without any it's Dan's head.
//              After changing body or heads, rerun tools/cutout.py.
//   gender:    (optional, default 'boy') 'girl' draws their attack pictures as a girl
//              (normal build only, no heads)
//   looks:     (optional) per mode, their attack pictures made over like a custom
//              rider's: picture colors (skin, hair; see riderColors.js) and, without
//              heads, a hairStyle from HAIR_STYLES in riderArt.js for their gender. A
//              head's hair stays as drawn. A mode without one uses easy's.
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
//              password: (optional) sealed form (passwords.js) of the code typed on
//              the Password screen; also unlocks this rider in every mode. Letters
//              A-Z only when typed.
//              { password: seal('BART') } alone = playable only once that's entered.

export const CHARACTERS = [
  {
    id: 'Billy',
    nickname: 'Chillo',
    ladderId: 1,
    color: 0x2ecc71,
    trunks: 0xf5c228,
    skin: 0xf7b481,
    style: 'Rookie. Flails at anything, even from too far away, and barely defends.',
    sprites: {
      easy: 'assets/sprites/riders/player-billy.png',
      hard: 'assets/sprites/riders/player-chillo.png',
    },
    body: 'skinny',
    heads: { easy: 'billy', hard: 'billy-2010' },
    stats: {
      easy: { heightIn: 66, grip: 1 },
      hard: { heightIn: 72, grip: 2 },
    },
    unlock: { beat: 'Billy', password: 'KXXTKSVQSS' }, // sealed; see passwords.js
  },
  {
    id: 'Rob',
    nickname: 'Franzi',
    ladderId: 2,
    color: 0xf1c40f,
    trunks: 0x389942,
    skin: 0xf4b07b,
    style: 'Aggressive spammer. Gets right up close and never stops swinging.',
    sprites: {
      easy: 'assets/sprites/riders/player-rob.png',
      hard: 'assets/sprites/riders/player-franzi.png',
    },
    heads: { easy: 'rob', hard: 'rob-2010' },
    stats: {
      easy: { heightIn: 60, grip: 3 },
      hard: { heightIn: 68, grip: 3 },
    },
    unlock: { beat: 'Rob', password: '3G6C5SLQ6L' }, // sealed; see passwords.js
  },
  {
    id: 'Mike',
    name: 'Mike See',
    nickname: 'Burton',
    ladderId: 3,
    color: 0x2457d6,
    trunks: 0x8d559e,
    skin: 0xf8c8a4,
    mass: 1.8,
    leanPower: 1.3,
    style: 'Rammer. Big, heavy, and always shoving you toward the shore.',
    sprites: {
      easy: 'assets/sprites/riders/player-mike.png',
      hard: 'assets/sprites/riders/player-burton.png',
    },
    heads: { easy: 'mike', hard: 'mike-2010' },
    stats: {
      easy: { heightIn: 68, grip: 3 },
      hard: { heightIn: 74, grip: 3 },
    },
    unlock: { beat: 'Mike', password: 'Q7STB3MZV6' }, // sealed; see passwords.js
  },
  {
    id: 'RJ',
    nickname: 'Moni',
    ladderId: 4,
    color: 0xa31621,
    trunks: 0x70b6d8,
    skin: 0xf7caa8,
    style: 'Passive strafer. Drifts in and out of kick range, dodges, backs off when hurt.',
    sprites: {
      easy: 'assets/sprites/riders/player-rj.png',
      hard: 'assets/sprites/riders/player-moni.png',
    },
    heads: { easy: 'rj' },
    stats: {
      easy: { heightIn: 62, grip: 3 },
      hard: { heightIn: 69, grip: 3 },
    },
    unlock: { beat: 'RJ', password: 'MG6CMBZH6L' }, // sealed; see passwords.js
  },
  {
    id: 'Dan',
    nickname: 'Barf',
    ladderId: 5,
    color: 0xe67e22,
    trunks: 0xf68427,
    skin: 0xfbbb87,
    style: 'Sub-boss. Fights like any rider below him on the ladder, and keeps switching.',
    sprites: {
      easy: 'assets/sprites/riders/player-dan.png',
      hard: 'assets/sprites/riders/player-barf.png',
    },
    stats: {
      easy: { heightIn: 64, grip: 3 },
      hard: { heightIn: 70, grip: 3 },
    },
    unlock: { beat: 'Dan', password: 'MGGCJKMZKK' }, // sealed; see passwords.js
  },
  {
    id: 'Adam',
    nickname: 'B-Nap',
    ladderId: 6,
    color: 0x22262e,
    trunks: 0xbd2530,
    skin: 0xf8b985,
    leanPower: 1.2,
    style: 'The final boss. Slippery, does everything well, grabs every health item.',
    // Hard standing is normal build (not the chubby easy standing / chubby head art).
    sprites: {
      easy: 'assets/sprites/riders/player-adam.png',
      hard: 'assets/sprites/riders/player-bnap.png',
    },
    heads: { easy: 'adam' },
    stats: {
      easy: { heightIn: 58, grip: 5 },
      hard: { heightIn: 67, grip: 5 },
    },
    unlock: { beat: 'Adam', password: '5X6CKSMZ8X' }, // sealed; see passwords.js
  },
  {
    id: 'Jeff',
    nickname: 'Ffej',
    color: 0xff5fa2,
    trunks: 0x312e35,
    skin: 0xf7c39d,
    style: 'Secret bonus rider. Good reach and a strong grip.',
    sprites: { easy: 'assets/sprites/riders/player-jeff.png', hard: 'assets/sprites/riders/player-ffej.png' },
    heads: { easy: 'jeff', hard: 'ffej' },
    stats: {
      easy: { heightIn: 70, grip: 5 },
      hard: { heightIn: 70, grip: 5 },
    },
    unlock: { beat: 'Adam', modes: ['easy', 'hard'], password: 'RGWLB33ZWC' }, // sealed; see passwords.js
  },
  {
    id: 'Bart',
    nickname: 'El Barto',
    color: 0xd62828,
    trunks: 0x1d4ed8,
    skin: 0xfcd34d,
    secret: true,
    style: 'Short, yellow, and tells everyone to eat his shorts.',
    sprites: { easy: 'assets/sprites/riders/player-bart.png', hard: 'assets/sprites/riders/player-bart.png' },
    looks: { easy: { skin: 0xffd90f, hair: 0xffd90f, hairStyle: 'spiky' } },
    stats: {
      easy: { heightIn: 54, grip: 3 },
      hard: { heightIn: 58, grip: 3 },
    },
    unlock: { password: '3GNTRB6QLQ' }, // sealed; see passwords.js
  },
  {
    id: 'Stelios',
    nickname: 'ΚΑΝΕΛΑ',
    color: 0x1d4ed8,
    trunks: 0x1f9e9e,
    skin: 0xffddb2,
    secret: true,
    style: 'Small and wiry, and always looking for an opening.',
    sprites: { easy: 'assets/sprites/riders/player-stelios.png', hard: 'assets/sprites/riders/player-stelios.png' },
    body: 'skinny',
    looks: { easy: { skin: 0xe9a37f, hair: 0x2b2421, hairStyle: 'crop' } },
    stats: {
      easy: { heightIn: 59, grip: 3 },
      hard: { heightIn: 67, grip: 3 },
    },
    unlock: { password: 'Q7F4B3VQ48' }, // sealed; see passwords.js
  },
  {
    id: 'Nick',
    nickname: 'Nicky Flash',
    color: 0xf5f5f5,
    trunks: 0xd62828,
    skin: 0xf0b15b,
    secret: true,
    style: 'Fast hands: blink and you miss the punch.',
    sprites: { easy: 'assets/sprites/riders/player-nick.png', hard: 'assets/sprites/riders/player-nick.png' },
    heads: { easy: 'nick' },
    looks: { easy: { skin: 0xc7794c } },
    stats: {
      easy: { heightIn: 66, grip: 3 },
      hard: { heightIn: 72, grip: 3 },
    },
    unlock: { password: 'KXXT63TH7R' }, // sealed; see passwords.js
  },
  {
    id: 'Kara',
    nickname: 'Arak',
    color: 0xff7eb6,
    trunks: 0xfb4b36,
    skin: 0xffddb2,
    secret: true,
    gender: 'girl',
    style: 'The smallest on the river, and quick to make you regret underestimating her.',
    sprites: { easy: 'assets/sprites/riders/player-kara.png', hard: 'assets/sprites/riders/player-arak.png' },
    looks: {
      easy: { skin: 0xe9a37f, hair: 0x7f4a32, hairStyle: 'ponytail' },
      hard: { skin: 0xe9a37f, hair: 0x7f4a32, hairStyle: 'ponytail-no-bangs' },
    },
    stats: {
      easy: { heightIn: 53, grip: 3 },
      hard: { heightIn: 59, grip: 3 },
    },
    unlock: { password: 'HG6CWBMZG2' }, // sealed; see passwords.js
  },
];
