import { WIDTH, HEIGHT, VIEW, RIVER, PHYSICS, RIDER } from './config.js';

// The menu picture's lawn, stones and river, a little brighter for daytime.
const COLORS = {
  grass: 0x4d7814,
  grassMown: 0x557f18, // every other stripe, like a mown lawn
  tuft: 0x2f5410,
  tuftTip: 0x8ca055,
  flowers: [0xf2a7c3, 0xfff1a8, 0xffffff],
  bush: 0x3e6811,
  bushLight: 0x638a1e,
  bushDark: 0x1f3d0c,
  shore: 0xb1a787,
  shoreMown: 0xa99f7f,
  wetEdge: 0x6e6450,
  rock: 0x8f8770,
  rockLight: 0xc6ba9d,
  rockDark: 0x5a5e59,
  water: [0x2a5f93, 0x2e679c, 0x336fa5, 0x3a79ae], // near to far: far water reflects more sky
  ripple: 0x5f97c8,
  glint: 0xb5d8ef,
  foam: 0xd8ecf5,
};
// Where on screen (a share of the way up from the bottom to the horizon) each water color
// after the first starts.
const WATER_BANDS = [0.5, 0.75, 0.9];
const WET_EDGE = 1.03; // the dark wet band at the water's edge, as a share of its half-width
const FOAM = { lane: 0.985, halfWidth: 0.015 };
const MOWN_MIN_PX = 3; // stripes thinner than this on screen shimmer, so they're left out
const DECOR_MIN_PX = 2; // and so are smaller things
// Per segment, in world units: ripples on the water, stones on the shore, grass tufts
// (some flowering) and the odd bush on the banks. Ripples shorter than minPx on screen are
// left out: far off they crowd together into noise.
const RIPPLES = { count: 5, length: [70, 210], height: 8, glintChance: 0.25, minPx: 9 };
const ROCKS = { chance: 0.55, size: [35, 70] };
const TUFTS = { count: 2, reach: [50, 1550], size: [45, 75], flowerChance: 0.15 };
const BUSHES = { chance: 0.18, reach: [300, 2100], size: [140, 260] };

// A steady pseudo-random 0..1 for segment `i`'s `k`th decoration, so it's the same each frame.
const hash = (i, k) => {
  const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return v - Math.floor(v);
};
// A segment's random values, worked out once: ripple k (up to 5) uses k, k + 5 and k + 10;
// each side's stones, tufts and bush use SIDE_KEYS[side] + 0..13.
const SIDE_KEYS = { [-1]: 15, 1: 30 };
const RANDOM_COUNT = 44;
const randomsOf = (seg) => (seg.randoms ??= Array.from({ length: RANDOM_COUNT }, (_, k) => hash(seg.index, k)));
const between = ([min, max], t) => min + (max - min) * t;

const BEND_SIZES = [2, 3, 4, 6];

const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const easeIn = (a, b, p) => a + (b - a) * p * p;
const easeInOut = (a, b, p) => a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5);

// A looping, procedurally generated river: a list of flat segments, each with a curve
// value, projected from behind, with decorations scattered along it.
export class River {
  constructor() {
    this.segments = [];
    this.build();
  }

  get length() {
    return this.segments.length * RIVER.segmentLength;
  }

  build() {
    this.segments = [];
    this.addBend(0, 60, 0, 0);
    while (this.segments.length < 900) {
      this.addBend(0, randInt(10, 60), 0, 0);
      const curve = BEND_SIZES[randInt(0, BEND_SIZES.length - 1)] * (Math.random() < 0.5 ? -1 : 1);
      this.addBend(randInt(8, 16), randInt(15, 40), randInt(8, 16), curve);
    }
    this.addBend(0, 60, 0, 0);
    this.assignWidths();
  }

  // Lays wide / medium / narrow stretches over the course, easing between them,
  // and eases the end back to the starting width so the loop is seamless.
  assignWidths() {
    const kinds = Object.values(RIVER.widths);
    const totalWeight = kinds.reduce((sum, k) => sum + k.weight, 0);
    const pickWidth = () => {
      let roll = Math.random() * totalWeight;
      for (const k of kinds) {
        roll -= k.weight;
        if (roll < 0) return k;
      }
      return kinds[0];
    };

    const n = this.segments.length;
    const start = RIVER.widths.medium.halfWidth;
    let current = start;
    let i = 0;
    while (i < n) {
      const kind = pickWidth();
      const target = kind.halfWidth;
      for (let t = 0; t < RIVER.widthTransition && i < n; t++, i++) {
        this.segments[i].width = easeInOut(current, target, t / RIVER.widthTransition);
      }
      const hold = randInt(...(kind.hold ?? [RIVER.widthHoldMin, RIVER.widthHoldMax]));
      for (let t = 0; t < hold && i < n; t++, i++) this.segments[i].width = target;
      current = target;
    }
    const tail = Math.min(RIVER.widthTransition, n);
    const tailFrom = this.segments[n - tail].width;
    for (let t = 0; t < tail; t++) this.segments[n - tail + t].width = easeInOut(tailFrom, start, t / tail);
  }

  halfWidthAt(z) {
    const segLen = RIVER.segmentLength;
    const t = (((z % segLen) + segLen) % segLen) / segLen;
    return this.segmentAt(z).width + (this.segmentAt(z + segLen).width - this.segmentAt(z).width) * t;
  }

  // How far a tube's center can swing at river position z: the rope's reach,
  // or the shore if the river is narrower than that.
  boundsAt(z) {
    const shoreLimit = this.halfWidthAt(z) - RIDER.tubeWidth / 2;
    return shoreLimit < PHYSICS.swingLimit
      ? { limit: shoreLimit, shore: true }
      : { limit: PHYSICS.swingLimit, shore: false };
  }

  addBend(enter, hold, leave, curve) {
    const add = (c) => this.segments.push({ index: this.segments.length, curve: c, bend: curve });
    for (let i = 0; i < enter; i++) add(easeIn(0, curve, i / enter));
    for (let i = 0; i < hold; i++) add(curve);
    for (let i = 0; i < leave; i++) add(easeInOut(curve, 0, i / leave));
  }

  segmentAt(z) {
    const n = this.segments.length;
    const i = Math.floor(z / RIVER.segmentLength) % n;
    return this.segments[(i + n) % n];
  }

  curveAt(z) {
    return this.segmentAt(z).curve;
  }

  // The next bend at or ahead of z (within distance), as { curve, distance } or null.
  upcomingBend(z, distance = RIVER.bendWarningDistance) {
    const steps = Math.ceil(distance / RIVER.segmentLength);
    for (let i = 0; i < steps; i++) {
      const seg = this.segmentAt(z + i * RIVER.segmentLength);
      if (seg.bend !== 0) return { curve: seg.bend, distance: i * RIVER.segmentLength };
    }
    return null;
  }

  static project(shift, worldX, z) {
    const scale = VIEW.cameraDepth / z;
    return {
      x: WIDTH / 2 + scale * (worldX + shift) * (WIDTH / 2),
      y: VIEW.horizonY + scale * VIEW.cameraHeight * (HEIGHT / 2),
      s: scale * (WIDTH / 2), // screen pixels per world unit at this depth
    };
  }

  // Screen position of a point `zAhead` in front of the camera, `worldX` off the centerline.
  projectAhead(cameraZ, zAhead, worldX = 0) {
    const segLen = RIVER.segmentLength;
    const baseIndex = Math.floor(cameraZ / segLen);
    let dx = -this.segmentAt(cameraZ).curve * RIVER.curveVisual * ((cameraZ % segLen) / segLen);
    let x = 0;
    for (let n = 0; ; n++) {
      const z1 = (baseIndex + n) * segLen - cameraZ;
      if (zAhead < z1 + segLen) {
        return River.project(x + dx * ((zAhead - z1) / segLen), worldX, zAhead);
      }
      x += dx;
      dx += this.segmentAt((baseIndex + n) * segLen).curve * RIVER.curveVisual;
    }
  }

  render(g, cameraZ) {
    const segLen = RIVER.segmentLength;
    const baseIndex = Math.floor(cameraZ / segLen);
    let dx = -this.segmentAt(cameraZ).curve * RIVER.curveVisual * ((cameraZ % segLen) / segLen);
    let x = 0;
    let maxY = HEIGHT;

    g.clear();
    g.fillStyle(COLORS.grass);
    g.fillRect(0, VIEW.horizonY, WIDTH, HEIGHT - VIEW.horizonY);
    const drawn = [];

    for (let n = 0; n < VIEW.drawDistance; n++) {
      const index = baseIndex + n;
      const seg = this.segmentAt(index * segLen);
      const z1 = index * segLen - cameraZ;
      const shift1 = x;
      const shift2 = x + dx;
      x += dx;
      dx += seg.curve * RIVER.curveVisual;

      if (z1 <= VIEW.cameraDepth) continue;
      const p1 = River.project(shift1, 0, z1);
      const p2 = River.project(shift2, 0, z1 + segLen);
      if (p2.y >= maxY) continue;
      const w1 = seg.width * p1.s;
      const w2 = this.segmentAt((index + 1) * segLen).width * p2.s;
      this.drawSegment(g, index, p1, w1, p2, w2);
      drawn.push({ seg, p: p1, w: w1 });
      maxY = p2.y;
    }
    // Far to near, so nearer ones cover farther ones.
    for (let i = drawn.length - 1; i >= 0; i--) drawDecor(g, drawn[i]);
  }

  // w1/w2: the river's on-screen half-width at each end of the segment.
  drawSegment(g, index, p1, w1, p2, w2) {
    const mown = Math.floor(index / RIVER.stripeLength) % 2 === 0 && p1.y - p2.y >= MOWN_MIN_PX;

    // A pixel taller at the far edge, which the next segment out paints over, so no seams.
    g.fillStyle(mown ? COLORS.grassMown : COLORS.grass);
    g.fillRect(0, p2.y - 1, WIDTH, p1.y - p2.y + 1);
    quad(g, mown ? COLORS.shoreMown : COLORS.shore, p1.x, p1.y, w1 * RIVER.shoreScale, p2.x, p2.y, w2 * RIVER.shoreScale);
    quad(g, COLORS.wetEdge, p1.x, p1.y, w1 * WET_EDGE, p2.x, p2.y, w2 * WET_EDGE);
    const up = (HEIGHT - p1.y) / (HEIGHT - VIEW.horizonY);
    quad(g, COLORS.water[WATER_BANDS.filter((b) => up >= b).length], p1.x, p1.y, w1, p2.x, p2.y, w2);
    g.fillStyle(COLORS.foam, 0.8);
    quadAt(g, p1, w1, p2, w2, -FOAM.lane, FOAM.halfWidth);
    quadAt(g, p1, w1, p2, w2, FOAM.lane, FOAM.halfWidth);
  }
}

// Segment `seg`'s ripples, stones, tufts and bushes, along its near edge at projected
// point `p`, where the river is `w` screen pixels each side of the middle.
function drawDecor(g, { seg, p, w }) {
  const { s } = p;
  const r = randomsOf(seg);
  const shore = w * RIVER.shoreScale;
  const onScreen = (x, size) => x + size > 0 && x - size < WIDTH;

  for (let k = 0; k < RIPPLES.count; k++) {
    const length = between(RIPPLES.length, r[k]) * s;
    if (length < RIPPLES.minPx) continue;
    const x = p.x + (r[k + 5] * 1.7 - 0.85) * w;
    g.fillStyle(r[k + 10] < RIPPLES.glintChance ? COLORS.glint : COLORS.ripple, 1);
    g.fillRect(x - length / 2, p.y - RIPPLES.height * s, length, Math.max(DECOR_MIN_PX, RIPPLES.height * s));
  }

  for (const side of [-1, 1]) {
    const k = SIDE_KEYS[side];
    if (r[k] < ROCKS.chance) {
      const size = between(ROCKS.size, r[k + 1]) * s;
      const x = p.x + side * w * (1 + (RIVER.shoreScale - 1) * (0.25 + 0.5 * r[k + 2]));
      if (size >= DECOR_MIN_PX && onScreen(x, size)) drawRock(g, x, p.y, size);
    }
    for (let t = 0; t < TUFTS.count; t++) {
      const size = between(TUFTS.size, r[k + 3 + t]) * s;
      const x = p.x + side * (shore + between(TUFTS.reach, r[k + 5 + t]) * s);
      const flower = r[k + 7 + t] < TUFTS.flowerChance ? COLORS.flowers[Math.floor(r[k + 9 + t] * COLORS.flowers.length)] : null;
      if (size >= DECOR_MIN_PX && onScreen(x, size)) drawTuft(g, x, p.y, size, flower);
    }
    if (r[k + 11] < BUSHES.chance) {
      const size = between(BUSHES.size, r[k + 12]) * s;
      const x = p.x + side * (shore + between(BUSHES.reach, r[k + 13]) * s);
      if (size >= DECOR_MIN_PX && onScreen(x, size)) drawBush(g, x, p.y, size);
    }
  }
}

// Each sits on the ground at (x, y), built from rectangles and triangles: rounder shapes
// are cut into triangles on the CPU every frame, which is slow with hundreds of them.
function drawRock(g, x, y, size) {
  g.fillStyle(COLORS.rockDark);
  g.fillRect(x - size * 0.62, y - size * 0.4, size * 1.24, size * 0.4);
  g.fillRect(x - size * 0.45, y - size * 0.62, size * 0.9, size * 0.25);
  g.fillStyle(COLORS.rock);
  g.fillRect(x - size * 0.52, y - size * 0.45, size * 1.04, size * 0.3);
  g.fillRect(x - size * 0.36, y - size * 0.6, size * 0.72, size * 0.2);
  g.fillStyle(COLORS.rockLight);
  g.fillRect(x - size * 0.3, y - size * 0.56, size * 0.3, size * 0.1);
}

function drawTuft(g, x, y, h, flower) {
  g.fillStyle(COLORS.tuft);
  g.fillTriangle(x - h * 0.5, y, x - h * 0.1, y, x - h * 0.45, y - h * 0.8);
  g.fillTriangle(x - h * 0.2, y, x + h * 0.2, y, x, y - h);
  g.fillTriangle(x + h * 0.1, y, x + h * 0.5, y, x + h * 0.45, y - h * 0.75);
  g.fillStyle(COLORS.tuftTip);
  g.fillTriangle(x - h * 0.06, y - h * 0.5, x + h * 0.06, y - h * 0.5, x, y - h);
  if (!flower) return;
  g.fillStyle(flower);
  g.fillRect(x - h * 0.14, y - h * 1.14, h * 0.28, h * 0.28);
}

function drawBush(g, x, y, size) {
  g.fillStyle(COLORS.bushDark);
  g.fillRect(x - size * 0.65, y - size * 0.45, size * 1.3, size * 0.45);
  g.fillRect(x - size * 0.45, y - size * 0.95, size * 0.9, size * 0.55);
  g.fillStyle(COLORS.bush);
  g.fillRect(x - size * 0.58, y - size * 0.62, size * 1.16, size * 0.3);
  g.fillRect(x - size * 0.38, y - size * 0.9, size * 0.76, size * 0.32);
  g.fillStyle(COLORS.bushLight);
  g.fillRect(x - size * 0.26, y - size * 0.84, size * 0.28, size * 0.12);
}

// Trapezoid between the horizontal spans x1±w1 at y1 and x2±w2 at y2.
function trapezoid(g, x1, y1, w1, x2, y2, w2) {
  g.fillTriangle(x1 - w1, y1, x1 + w1, y1, x2 + w2, y2);
  g.fillTriangle(x1 - w1, y1, x2 + w2, y2, x2 - w2, y2);
}

function quad(g, color, x1, y1, w1, x2, y2, w2) {
  g.fillStyle(color);
  trapezoid(g, x1, y1, w1, x2, y2, w2);
}

// Thin strip at `lane` (-1..1 across the river) using the current fill style.
function quadAt(g, p1, w1, p2, w2, lane, halfWidth) {
  trapezoid(g, p1.x + lane * w1, p1.y, halfWidth * w1, p2.x + lane * w2, p2.y, halfWidth * w2);
}
