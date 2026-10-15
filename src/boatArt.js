import Phaser from 'phaser';

// The tow boat from behind, as pixel art in the main menu picture's colors: a white hull
// with lime and green stripes, a pale windshield, the driver at the wheel on the right,
// and a black outboard. One character per pixel ('.' is see-through).
const PALETTE = {
  o: '#0c1824', // outline
  W: '#f4f3e8', // hull white
  w: '#d4d4cc', // hull shade
  g: '#a1a4a2', // hull underside
  L: '#9ccc36', // lime stripe
  G: '#66a018', // green stripe
  D: '#4f7a14', // dark green pinstripe
  n: '#182430', // inside the boat
  b: '#b9cfdb', // windshield
  B: '#eef6fa', // windshield glint
  h: '#5a3a22', // driver's hair
  k: '#e0a77a', // driver's neck
  r: '#c8433a', // driver's shirt
  R: '#9e2f29', // shirt shade
  m: '#101418', // motor
  M: '#3c4450', // motor highlight
  f: '#ffffff', // foam
};

// The bottom row sits on the water.
const HULL = [
  '.....................hh.........',
  '....................hhhh........',
  '....................hhhh........',
  '.......WWWWWWWWWWWWWhhhhW.......',
  '......WbbBbbbbbbbbbbbkkbbW......',
  '.....WbBbbbbbbbbbbbrrrrrrbW.....',
  '....WBbbbbbbbbbbbbrrrrrrrRbW....',
  '.onnWLLLLWnnnnnnnnrrrrrrrRnnnno.',
  'oWWWWWWWWWWWWWWWWWWWWWWWWWWwwwwo',
  'oWWWWWWWWWWWWWWWWWWWWWWWWWWwwwwo',
  'oLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLo',
  '.oGGGGGGGGGGGGGGGGGGGGGGGGGGGGo.',
  '.oWWWWWWWWWWWWWWWWWWWWWWWWwwwwo.',
  '.oDDDDDDDDDDDDDDDDDDDDDDDDDDDDo.',
  '..oWWWWWWWWWWWWWWWWWWWWWWwwwwo..',
  '..owwwwwwwwwwwwwwwwwwwwwwggggo..',
  '...oooooooooooooooooooooooooo...',
];

// Hangs off the middle of the transom, its top at hull row MOTOR_TOP; the foam is where
// its leg goes into the water.
const MOTOR = [
  '..oooo..',
  '.oMmmmo.',
  '.oLLLLo.',
  '.oMmmmo.',
  '.oMmmmo.',
  '..oooo..',
  '...mm...',
  '...mm...',
  '...mm...',
  '..mmmm..',
  '.ffmmff.',
  'ffffffff',
];
const MOTOR_TOP = 5;
const TOW_ROW = 9; // the ropes tie on at the top of the transom

export const BOAT_TEXEL = 14; // world units per pixel
const BANK = 0.025; // radians the hull leans per unit of river curve
const MOTOR_TURN = 0.05; // and the motor swings the other way
const MOTOR_SHIFT = 4; // world units per unit of curve

function pixelTexture(scene, key, rows) {
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.createCanvas(key, rows[0].length, rows.length);
  const ctx = texture.getContext();
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = PALETTE[ch];
      ctx.fillRect(x, y, 1, 1);
    });
  });
  texture.refresh();
  texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

export class BoatSprite {
  constructor(scene, depth) {
    this.hull = scene.add.image(0, 0, pixelTexture(scene, 'boat-hull', HULL)).setOrigin(0.5, 1).setDepth(depth);
    this.motor = scene.add.image(0, 0, pixelTexture(scene, 'boat-motor', MOTOR)).setOrigin(0.5, 0).setDepth(depth);
  }

  // With the hull's bottom center at projected point `p`, leaning into the river's
  // `curve`. Returns the tow point the ropes attach to.
  place(p, curve) {
    const scale = BOAT_TEXEL * p.s;
    this.hull.setPosition(p.x, p.y).setScale(scale).setRotation(curve * BANK);
    this.motor
      .setPosition(p.x - curve * MOTOR_SHIFT * p.s, p.y - (HULL.length - MOTOR_TOP) * scale)
      .setScale(scale)
      .setRotation(-curve * MOTOR_TURN);
    return { x: p.x, y: p.y - (HULL.length - TOW_ROW) * scale };
  }
}
