// All gameplay tuning lives here. Lateral distances are in "world units";
// at the riders' depth one unit is roughly 0.43 screen pixels.

export const WIDTH = 960;
export const HEIGHT = 540;

const FIELD_OF_VIEW = 100;

export const VIEW = {
  horizonY: 200,
  cameraHeight: 1000,
  cameraDepth: 1 / Math.tan(((FIELD_OF_VIEW / 2) * Math.PI) / 180),
  drawDistance: 150, // segments
  riderScreenY: 440, // where the riders' waterline sits on screen
};

// Distance from the camera to the riders, solved so the riders land at VIEW.riderScreenY.
export const RIDER_Z =
  (VIEW.cameraDepth * VIEW.cameraHeight * (HEIGHT / 2)) / (VIEW.riderScreenY - VIEW.horizonY);
export const ROPE_LENGTH = 1900;

export const PHYSICS = {
  swingLimit: 600, // farthest the tow rope lets a tube's center get from the wake
  leanAccel: 400, // leaning while the boat goes straight: slow
  leanTurnBonus: 170, // extra lean authority per unit of boat curve
  turnAccel: 330, // sideways fling per unit of boat curve (opposite the turn)
  ropeRestore: 0.5, // rope tension pulling you back toward the wake
  drag: 2.0,
  edgeRebound: 0.15,
  edgeImpactSpeed: 600, // slamming into the shore (not the rope's end) faster than this hurts balance
  edgeImpactDamage: 0.03, // balance lost per unit of speed above edgeImpactSpeed
  hitstunLeanFactor: 0.3,
  duckLeanFactor: 0.5,
};

export const RIDER = {
  tubeWidth: 180,
  tubeHeight: 50,
  bodyWidth: 95,
  bodyBottom: 40,
  torsoTop: 130,
  headSize: 55,
  duckDrop: 50, // how far torso and head drop while ducking
  leanShift: 22,
  startOffset: 220,
  maxBalance: 100,
  maxAir: 100,
  balanceRegen: 4, // per second
  balanceRegenDelay: 1.5, // seconds after last damage
  // Heights: body/head hurtboxes scale with height / baseHeightIn, and reach grows
  // by reachPerHeight of that scale (a 10% taller rider reaches 6% farther).
  baseHeightIn: 69,
  reachPerHeight: 0.6,
  playerHeightIn: 68, // 2010 and 2-player height; 1999 overrides it in DIFFICULTIES
};

export const RIVER = {
  segmentLength: 200,
  // River half-widths. The shore is reachable only when halfWidth - tubeWidth / 2
  // is inside PHYSICS.swingLimit, so "wide" water is scrape-free.
  widths: {
    wide: { halfWidth: 1050, weight: 0.4 },
    medium: { halfWidth: 720, weight: 0.35 },
    narrow: { halfWidth: 500, weight: 0.25 },
  },
  widthHoldMin: 40, // segments
  widthHoldMax: 110,
  widthTransition: 25,
  shoreScale: 1.15,
  stripeLength: 3, // segments per light/dark stripe
  curveVisual: 0.5, // how sharply bends are drawn (does not affect physics)
  bendWarningDistance: 45 * 200, // at slow speed; scaled up as the boat speeds up
};

// The boat's throttle: it holds a speed for a while, flashes a warning, then eases
// to a new one. Every round starts slow.
//   speed: world units per second   wake: height of the wake ridges (0 = flat water)
//   fling: multiplier on how hard turns throw the riders
export const BOAT = {
  speeds: {
    slow: { label: 'SLOW', speed: 3000, wake: 0, fling: 1, weight: 0.35 },
    medium: { label: 'MEDIUM', speed: 4100, wake: 35, fling: 1.15, weight: 0.4 },
    fast: { label: 'FULL THROTTLE', speed: 5300, wake: 95, fling: 1.3, weight: 0.25 },
  },
  holdMin: 7, // seconds at one speed
  holdMax: 13,
  warning: 2.5, // seconds of warning before a change
  transition: 1.5, // seconds to ease to the new speed
};

// 1-player modes: which boat speeds can come up (2 players always use all of them),
// the player's height, and per-mode names and heights for the OPPONENTS personas
// (same fighting style).
export const DIFFICULTIES = {
  easy: {
    year: '1999',
    label: 'EASY',
    speeds: ['slow', 'medium'],
    blurb: 'Slow and medium speeds.\nFlat water or a small wake.',
    playerHeightIn: 63,
    roster: {
      'B-Nap': { name: 'Adam', heightIn: 56 },
      Moni: { name: 'RJ', heightIn: 62 },
      Chillo: { name: 'Billy', heightIn: 65 },
      Burton: { name: 'Mike', heightIn: 68 },
      Franzi: { name: 'Rob', heightIn: 60 },
      Barf: { name: 'Dan', heightIn: 67 },
    },
  },
  hard: {
    year: '2010',
    label: 'HARD',
    speeds: ['slow', 'medium', 'fast'],
    blurb: 'All three speeds.\nBig wakes, big air, stomps.',
    playerHeightIn: RIDER.playerHeightIn,
    roster: {},
  },
};

// The two wake ridges at the riders' depth, one each side of the centerline.
// Riders start between them.
export const WAKE = {
  crestX: 380, // crest distance from the centerline
  halfBase: 110, // each ridge rises over this distance on either side of its crest
  slide: 300, // sideways pull down a ridge's face per unit of slope
  maxTilt: 0.6, // radians
};

// Leaving a crest fast enough launches you, like a wakeboarder.
export const JUMP = {
  gravity: 2000,
  minSpeed: 340, // sideways speed needed to launch
  launch: 1.0, // launch speed = sideways speed * ridge steepness * launch
  minLaunch: 340, // anything weaker just rides over the crest
  maxLaunch: 950,
  airControl: 0.3, // lean strength while airborne
  airDrag: 0.6,
};

// Coming down on top of the opponent after clearing their head. Glancing landings
// (centers farther apart than `centered` tube widths) just bump off.
export const STOMP = {
  centered: 0.6,
  balanceDamage: 30,
  airDamage: 15,
  knockback: 200,
  hitstun: 0.6,
  bounce: 450, // the stomper pops back up this fast
};

// Scraping along the shore (only possible where the river is narrow enough).
export const SHORE = {
  meter: 'balance',
  damagePerSecond: 4,
};

// Health items floating down the river. Meters max out at 100, so big = 25%.
export const PICKUPS = {
  spawnIntervalMin: 5,
  spawnIntervalMax: 11,
  spawnAhead: 9000, // how far in front of the camera they appear
  despawnDepth: 500,
  bigChance: 0.3,
  restores: ['balance', 'air'],
  kinds: {
    small: { amount: 10, size: 70 },
    big: { amount: 25, size: 100 },
  },
};

export const BUMP = {
  restitution: 0.5,
  separationSpeed: 120, // tubes that touch always drift apart at least this fast
};

// reachStart/reachEnd: how far the attack box extends from the rider's center
// (reachEnd grows with the attacker's height).
// yBottom/yTop: attack height above the water; it must overlap the target hurtbox to land.
// aimsAtTarget: heights are for a base-height target and scale to the actual target's
// standing height, so punches find the head and kicks find the torso at any height.
export const ATTACKS = {
  high: {
    label: 'High punch',
    windup: 0.2,
    active: 0.1,
    recovery: 0.35,
    reachStart: 30,
    reachEnd: 230,
    yBottom: 140,
    yTop: 172,
    aimsAtTarget: true,
    target: 'head',
    meter: 'balance',
    damage: 22,
    knockback: 260,
    hitstun: 0.35,
  },
  mid: {
    label: 'Mid kick',
    windup: 0.25,
    active: 0.12,
    recovery: 0.3,
    reachStart: 30,
    reachEnd: 300,
    yBottom: 60,
    yTop: 95,
    aimsAtTarget: true,
    target: 'body',
    meter: 'balance',
    damage: 14,
    knockback: 320,
    hitstun: 0.3,
  },
  low: {
    label: 'Low kick',
    windup: 0.32,
    active: 0.12,
    recovery: 0.38,
    reachStart: 40,
    reachEnd: 280,
    yBottom: 12,
    yTop: 40,
    target: 'tube',
    meter: 'air',
    damage: 14,
    knockback: 180,
    hitstun: 0.25,
  },
};

// Punching means letting go with one hand from windup through recovery.
export const GRIP = {
  oneHandedTubeDamageMultiplier: 2,
};

// Dodge: tap lean AWAY from the attacker within `window` seconds of the attack's
// windup ending. Only your first away-tap after the attack starts counts.
export const DODGE = {
  window: 0.18,
  impulse: 450,
  whiffRecovery: 0.25,
};

export const MATCH = {
  roundsToWin: 2,
  countdown: 3,
  roundOverDelay: 2.5,
};

export const CPU_DEADZONE = 40;

// How sharp the CPU is, by ladder rung (one entry per rung; the last is always the boss).
// reaction: base chance to react to your attacks. cooldown: seconds between its attacks.
export const CPU_SKILL_BY_RUNG = [
  { reaction: 0.15, cooldown: [1.1, 2.2] },
  { reaction: 0.25, cooldown: [0.95, 1.9] },
  { reaction: 0.35, cooldown: [0.8, 1.65] },
  { reaction: 0.43, cooldown: [0.7, 1.45] },
  { reaction: 0.5, cooldown: [0.6, 1.3] },
  { reaction: 0.6, cooldown: [0.5, 1.1] },
];

// Personalities, modeled on Road Rash's rival archetypes (rookie "idiot", passive
// strafer, aggressive spammer, rammer), plus a sub-boss who mixes them and a boss.
//   heightIn:          height in inches (reach and hurtbox size)
//   attacks:           relative preference for each attack
//   preferredDistance: center-to-center spacing it tries to hold (tubes touch at 180)
//   strafe:            how far that spacing drifts in and out over time
//   aggression:        attack-rate multiplier
//   sloppiness:        chance it throws an attack even when you're out of reach
//   defense:           multiplier on dodge / duck chance
//   counter:           multiplier on low-kicking you while you punch one-handed
//   greed:             chance it chases a health item it can reach
//   ram:               false | 'nearShore' (shoves when you're near the shore) | 'always'
//   mass:              how hard it is to shove (and how hard it shoves) in tube bumps
//   leanPower:         lean strength multiplier
//   retreatBelow:      backs off to recover when its balance drops below this (0 = never)
//   toughness:         multiplier on damage it takes
//   mimics:            instead of its own style, fights like one of these OPPONENTS
//                      at a time, picking a new one at random every styleHold seconds
const PERSONA_DEFAULTS = {
  strafe: 0,
  sloppiness: 0,
  ram: false,
  mass: 1,
  leanPower: 1,
  retreatBelow: 0,
  toughness: 1,
};

export const OPPONENTS = {
  Chillo: {
    ...PERSONA_DEFAULTS,
    color: 0x2ecc71,
    heightIn: 73,
    blurb: 'Rookie. Flails at anything, even from too far away, and barely defends.',
    attacks: { high: 1, mid: 1, low: 1 },
    preferredDistance: 240,
    strafe: 60,
    aggression: 0.9,
    sloppiness: 0.35,
    defense: 0.4,
    counter: 0.2,
    greed: 0.2,
  },
  Moni: {
    ...PERSONA_DEFAULTS,
    color: 0xb05cc8,
    heightIn: 69,
    blurb: 'Passive strafer. Drifts in and out of kick range, dodges, backs off when hurt.',
    attacks: { high: 0.1, mid: 1, low: 0.7 },
    preferredDistance: 320,
    strafe: 45,
    aggression: 0.75,
    defense: 1.4,
    counter: 0.5,
    greed: 0.5,
    retreatBelow: 40,
  },
  Franzi: {
    ...PERSONA_DEFAULTS,
    color: 0xf1c40f,
    heightIn: 64,
    blurb: 'Aggressive spammer. Gets right up close and never stops swinging.',
    attacks: { high: 1, mid: 0.7, low: 0.4 },
    preferredDistance: 190,
    aggression: 1.7,
    defense: 0.6,
    counter: 0.4,
    greed: 0.3,
  },
  Burton: {
    ...PERSONA_DEFAULTS,
    color: 0xe67e22,
    heightIn: 77,
    blurb: 'Rammer. Big, heavy, and always shoving you toward the shore.',
    attacks: { high: 0.4, mid: 1, low: 0.4 },
    preferredDistance: 200,
    aggression: 1,
    defense: 0.8,
    counter: 0.6,
    greed: 0.4,
    ram: 'always',
    mass: 1.8,
    leanPower: 1.3,
  },
  Barf: {
    ...PERSONA_DEFAULTS,
    color: 0xff6fae,
    heightIn: 69,
    blurb: 'Sub-boss. Fights like any rider below him on the ladder, and keeps switching.',
    mimics: ['Chillo', 'Franzi', 'Burton', 'Moni'],
    styleHold: [5, 10],
  },
  'B-Nap': {
    ...PERSONA_DEFAULTS,
    color: 0x22262e,
    heightIn: 60,
    blurb: 'The final boss. Small, slippery, does everything well, grabs every health item.',
    attacks: { high: 0.8, mid: 0.8, low: 0.8 },
    preferredDistance: 225,
    aggression: 1.2,
    defense: 1.2,
    counter: 1.5,
    greed: 0.9,
    ram: 'nearShore',
    leanPower: 1.2,
    retreatBelow: 30,
    toughness: 0.9,
  },
};

export const BOSS = 'B-Nap';
export const SUB_BOSS = 'Barf';

// 1-player ladder, bottom rung first (OPPONENTS keys).
export const LADDER_ORDER = ['Chillo', 'Franzi', 'Burton', 'Moni', SUB_BOSS, BOSS];
