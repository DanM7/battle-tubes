import { HEIGHT, RIDER, PICKUPS, WAKE, ROPE_LENGTH, RIDER_Z } from './config.js';
import { wakeHeight, wakeProfile } from './wake.js';

// Placeholder rectangle art. Each `p` is a projected point { x, y, s } where
// s is screen pixels per world unit at that depth.

const TRUNKS_HEIGHT = 30; // swim trunks band at the bottom of the torso
const HITBOX_OUTLINE = 0x00ff88;
const ONE_HANDED_OUTLINE = 0xff6b00; // tube outline while punching: it takes extra damage
const WAKE_TOP = 0x4a82b4; // the raised water between the crests (river.js's water, lit)
const WAKE_FACE = 0x24527c; // the outer faces
const WAKE_SLICES = 28;
// Fraction of rider depth for the wake's near end — small enough that the V and foam
// run off the bottom of the screen (0.65 left a hard cut above it, especially on low wake).
const WAKE_NEAR_FRAC = 0.08;

// The wake's crest distance, outer face width and height at `zAhead`: it spreads out in a
// V from the boat and matches the physics (WAKE.crestX, WAKE.halfBase) at the riders' depth.
function wakeAt(zAhead, boatDepth, amp) {
  const k = (boatDepth - zAhead) / ROPE_LENGTH;
  return { crest: WAKE.crestX * k, half: WAKE.halfBase * (0.35 + 0.65 * k), height: amp * Math.min(1, k / 0.35) };
}

function wakeNearDepth() {
  return Math.max(40, RIDER_Z * WAKE_NEAR_FRAC);
}

// Fills the four-sided shape a-b-c-d as two triangles: fillPoints cuts polygons into
// triangles on the CPU every frame, which adds up over dozens of them.
export function fillQuad(g, a, b, c, d) {
  g.fillTriangle(a.x, a.y, b.x, b.y, c.x, c.y);
  g.fillTriangle(a.x, a.y, c.x, c.y, d.x, d.y);
}

// Height of the water surface at any depth, for things floating on it.
export function wakeSurfaceHeight(zAhead, x, boatDepth, amp) {
  if (amp <= 0 || zAhead >= boatDepth) return 0;
  const { crest, half, height } = wakeAt(zAhead, boatDepth, amp);
  return wakeProfile(x, height, crest, half);
}

// The foam trail behind the boat, plus (when `amp` > 0) the wake spreading out in a V:
// raised water between the two crests, with an outer face dropping off beyond each.
// project(zAhead, worldX) returns a projected point. `shoreHalfAt(zAhead)` is the river's
// half-width at that depth (Infinity when unknown); the wake never paints past the bank.
export function drawWake(g, project, boatDepth, amp, shoreHalfAt = () => Infinity) {
  const boat = project(boatDepth, 0);
  const nearDepth = wakeNearDepth();
  const near = project(nearDepth, 0);
  const foamFar = Math.min(150, shoreHalfAt(boatDepth));
  const foamNear = Math.min(900, shoreHalfAt(nearDepth));
  // Foam trail from the boat all the way off the bottom of the screen (still inside the banks).
  g.fillStyle(0xffffff, 0.16);
  fillQuad(
    g,
    { x: boat.x - foamFar * boat.s, y: boat.y },
    { x: boat.x + foamFar * boat.s, y: boat.y },
    { x: near.x + foamNear * near.s, y: HEIGHT + 60 },
    { x: near.x - foamNear * near.s, y: HEIGHT + 60 },
  );
  if (amp <= 0) return;

  const far = boatDepth - 80;
  const rows = [];
  for (let i = 0; i <= WAKE_SLICES; i++) {
    const z = far - ((far - nearDepth) * i) / WAKE_SLICES;
    const shore = Math.max(0, shoreHalfAt(z));
    const { crest, half, height } = wakeAt(z, boatDepth, amp);
    // Keep the raised top and its outer face on the water; skip a side past the bank.
    const crestX = Math.min(crest, shore);
    const outerX = Math.min(crest + half, shore);
    const top = (side) => {
      const p = project(z, side * crestX);
      return { x: p.x, y: p.y - height * p.s };
    };
    rows.push({
      left: top(-1),
      right: top(1),
      leftOuter: project(z, -outerX),
      rightOuter: project(z, outerX),
      hasFace: outerX > crestX + 1,
    });
  }
  // Far to near, so nearer slices cover farther ones.
  for (let i = 0; i < WAKE_SLICES; i++) {
    const a = rows[i];
    const b = rows[i + 1];
    g.fillStyle(WAKE_TOP, 0.85);
    fillQuad(g, a.left, a.right, b.right, b.left);
    if (a.hasFace || b.hasFace) {
      g.fillStyle(WAKE_FACE, 0.85);
      fillQuad(g, a.left, a.leftOuter, b.leftOuter, b.left);
      fillQuad(g, a.right, a.rightOuter, b.rightOuter, b.right);
    }
    g.lineStyle(2, 0xffffff, 0.7);
    g.lineBetween(a.left.x, a.left.y, b.left.x, b.left.y);
    g.lineBetween(a.right.x, a.right.y, b.right.x, b.right.y);
  }
}

// A floating first-aid box: white with a red cross, gold rim for the big one.
export function drawPickup(g, p, kind, time) {
  const size = PICKUPS.kinds[kind].size * p.s;
  const bob = Math.sin(time * 5) * 12 * p.s;
  const x = p.x - size / 2;
  const y = p.y - size * 0.8 + bob;
  g.fillStyle(0xffffff, 1);
  g.fillRect(x, y, size, size * 0.8);
  if (kind === 'big') {
    g.lineStyle(Math.max(2, size * 0.08), 0xffd700, 1);
    g.strokeRect(x, y, size, size * 0.8);
  }
  g.fillStyle(0xe53935, 1);
  g.fillRect(p.x - size * 0.1, y + size * 0.1, size * 0.2, size * 0.6);
  g.fillRect(p.x - size * 0.3, y + size * 0.3, size * 0.6, size * 0.2);
}

export function drawRope(g, tow, rider, p) {
  g.lineStyle(2, 0xffe066, 1);
  g.lineBetween(tow.x, tow.y, rider.screenX, rider.screenY - RIDER.tubeHeight * p.s * 0.8);
}

export function drawRider(g, r, p, time) {
  const s = p.s;
  const bob = r.airborne ? 0 : Math.sin(time * 7 + r.startSide * 1.7) * 2;
  const cos = Math.cos(r.tilt);
  const sin = Math.sin(r.tilt);
  // World (lateral, height) to screen, raised by the rider's altitude and tilted
  // around the bottom center of the tube.
  const pt = (wx, wy) => {
    const dx = wx - r.x;
    return { x: p.x + (r.x + dx * cos - wy * sin) * s, y: p.y + bob - (r.alt + dx * sin + wy * cos) * s };
  };
  const corners = (b) => [pt(b.x1, b.y1), pt(b.x2, b.y1), pt(b.x2, b.y2), pt(b.x1, b.y2)];
  const fill = (b, color, alpha = 1) => {
    g.fillStyle(color, alpha);
    fillQuad(g, ...corners(b));
  };
  const outline = (b, color) => {
    g.lineStyle(1, color, 0.9);
    g.strokePoints(corners(b), true);
  };

  drawAirShadow(g, r, p);

  // The tube's top slopes down toward the side the rider leans, pressed by their weight.
  const tube = r.hurtBox('tube');
  const leanDrop = (tube.y2 - tube.y1) * RIDER.leanSink * Math.abs(r.leanVisual);
  const tubeShape = [
    pt(tube.x1, tube.y1),
    pt(tube.x2, tube.y1),
    pt(tube.x2, tube.y2 - (r.leanVisual > 0 ? leanDrop : 0)),
    pt(tube.x1, tube.y2 - (r.leanVisual < 0 ? leanDrop : 0)),
  ];
  const lowAirFlash = r.lowAir && Math.sin(time * 10) > 0;
  g.fillStyle(r.air <= 0 ? 0x5a5a5a : lowAirFlash ? 0x9b2226 : 0x1f1f1f, 1);
  fillQuad(g, ...tubeShape);
  g.lineStyle(1, r.isOneHanded ? ONE_HANDED_OUTLINE : HITBOX_OUTLINE, 0.9);
  g.strokePoints(tubeShape, true);

  drawShoreSpray(g, r, p, bob);

  if (r.isOff) {
    drawFall(g, r, p, time);
    return;
  }

  const body = r.hurtBox('body');
  const head = r.hurtBox('head');
  const trunks = { ...body, y2: body.y1 + TRUNKS_HEIGHT * r.heightScale };
  fill(body, r.flash > 0 ? 0xffffff : r.color);
  if (r.flash <= 0) fill(trunks, r.trunks);
  fill(head, r.flash > 0 ? 0xffffff : r.skin);
  outline(body, HITBOX_OUTLINE);
  outline(head, HITBOX_OUTLINE);

  const attack = r.attackBox();
  if (attack) {
    if (r.state === 'active') fill(attack, r.attack.type === 'high' ? 0xff9f43 : 0xffe14d);
    else fill(attack, 0xffffff, 0.5);
  }
}

// The shadow under an airborne rider's tube, fainter the higher they are.
export function drawAirShadow(g, r, p) {
  if (!r.airborne || r.isOff) return;
  const fade = Math.max(0.25, 1 - r.alt / 500);
  g.fillStyle(0x0b2d4a, 0.35 * fade);
  g.fillEllipse(p.x + r.x * p.s, p.y - wakeHeight(r.x, r.wake) * p.s, RIDER.tubeWidth * p.s * fade, 22 * p.s * fade);
}

// Sand flying off the shore side of a tube scraping along it.
export function drawShoreSpray(g, r, p, bob = 0) {
  if (!r.onShore) return;
  const edge = Math.sign(r.x);
  const ex = r.x + (edge * RIDER.tubeWidth) / 2;
  g.fillStyle(0xe8d29a, 0.9);
  for (let i = 0; i < 5; i++) {
    const x = p.x + (ex + (Math.random() * 40 - 10) * edge) * p.s;
    const y = p.y + bob - (r.alt + Math.random() * 60) * p.s;
    g.fillRect(x - 3, y - 3, 6, 6);
  }
}

// How a knocked-off rider flies: FALL.seconds through the air to FALL.distance world
// units out (the way they were knocked), rising FALL.rise on the way.
export const FALL = { seconds: 0.5, distance: 200, rise: 60 };

// Rider tumbles off sideways, then gets left behind in the river as a splash.
function drawFall(g, r, p, time) {
  const t = time - r.off.time;
  const s = p.s;
  const x0 = p.x + r.off.x * s;

  if (t < FALL.seconds) {
    const k = t / FALL.seconds;
    const x = x0 + r.off.dir * FALL.distance * s * k;
    const y = p.y - (Math.sin(k * Math.PI) * FALL.rise + 100 * (1 - k)) * s + k * 30;
    const w = RIDER.bodyWidth * s * (1 + k * 0.4);
    const h = ((RIDER.torsoTop + RIDER.headSize) * r.heightScale - RIDER.bodyBottom) * s * (1 - k * 0.5);
    g.fillStyle(r.color, 1 - k * 0.3);
    g.fillRect(x - w / 2, y - h, w, h);
    return;
  }
  drawSplash(g, r, p, t - FALL.seconds);
}

// Where a knocked-off rider landed, `t` seconds after: a ring spreading out as the river
// carries it away.
export function drawSplash(g, r, p, t, size = 1) {
  const s = p.s;
  const landX = p.x + (r.off.x + r.off.dir * FALL.distance) * s;
  const k = Math.min(t / 1.2, 1);
  const y = p.y + 30 + k * 120;
  g.lineStyle(3, 0xffffff, 1 - k);
  g.strokeEllipse(landX, y, (120 + 300 * k) * s * size, (40 + 100 * k) * s * size);
  g.fillStyle(r.skin, 1 - k);
  g.fillCircle(landX, y, 9 * (1 + k) * size);
}
