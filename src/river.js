import { WIDTH, HEIGHT, VIEW, RIVER, PHYSICS, RIDER } from './config.js';

const COLORS = {
  bankLight: 0x3f8f3a,
  bankDark: 0x377f33,
  shoreLight: 0xd8c690,
  shoreDark: 0xc9b57c,
  waterLight: 0x2f7fc1,
  waterDark: 0x2b74b0,
  ripple: 0x7fc0ee,
};

const BEND_SIZES = [2, 3, 4, 6];

const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const easeIn = (a, b, p) => a + (b - a) * p * p;
const easeInOut = (a, b, p) => a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5);

// A looping, procedurally generated river rendered Road Rash / OutRun style:
// a list of flat segments, each with a curve value, projected from behind.
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
        if (roll < 0) return k.halfWidth;
      }
      return kinds[0].halfWidth;
    };

    const n = this.segments.length;
    const start = RIVER.widths.medium.halfWidth;
    let current = start;
    let i = 0;
    while (i < n) {
      const target = pickWidth();
      for (let t = 0; t < RIVER.widthTransition && i < n; t++, i++) {
        this.segments[i].width = easeInOut(current, target, t / RIVER.widthTransition);
      }
      const hold = randInt(RIVER.widthHoldMin, RIVER.widthHoldMax);
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
    g.fillStyle(COLORS.bankDark);
    g.fillRect(0, VIEW.horizonY, WIDTH, HEIGHT - VIEW.horizonY);

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
      maxY = p2.y;
    }
  }

  // w1/w2: the river's on-screen half-width at each end of the segment.
  drawSegment(g, index, p1, w1, p2, w2) {
    const light = Math.floor(index / RIVER.stripeLength) % 2 === 0;

    g.fillStyle(light ? COLORS.bankLight : COLORS.bankDark);
    g.fillRect(0, p2.y, WIDTH, p1.y - p2.y + 1);
    quad(g, light ? COLORS.shoreLight : COLORS.shoreDark, p1.x, p1.y, w1 * RIVER.shoreScale, p2.x, p2.y, w2 * RIVER.shoreScale);
    quad(g, light ? COLORS.waterLight : COLORS.waterDark, p1.x, p1.y, w1, p2.x, p2.y, w2);

    if (index % 5 === 0) {
      const lane = (((index * 37) % 100) / 100) * 1.5 - 0.75;
      g.fillStyle(COLORS.ripple, 0.6);
      quadAt(g, p1, w1, p2, w2, lane, 0.05);
      quadAt(g, p1, w1, p2, w2, lane > 0 ? lane - 0.8 : lane + 0.8, 0.04);
    }
  }
}

function quad(g, color, x1, y1, w1, x2, y2, w2) {
  g.fillStyle(color);
  g.fillPoints(
    [
      { x: x1 - w1, y: y1 },
      { x: x1 + w1, y: y1 },
      { x: x2 + w2, y: y2 },
      { x: x2 - w2, y: y2 },
    ],
    true,
  );
}

// Thin strip at `lane` (-1..1 across the river) using the current fill style.
function quadAt(g, p1, w1, p2, w2, lane, halfWidth) {
  const c1 = p1.x + lane * w1;
  const c2 = p2.x + lane * w2;
  g.fillPoints(
    [
      { x: c1 - halfWidth * w1, y: p1.y },
      { x: c1 + halfWidth * w1, y: p1.y },
      { x: c2 + halfWidth * w2, y: p2.y },
      { x: c2 - halfWidth * w2, y: p2.y },
    ],
    true,
  );
}
