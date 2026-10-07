import { RIDER, PICKUPS, WAKE, ROPE_LENGTH, RIDER_Z } from './config.js';
import { wakeHeight } from './wake.js';

// Placeholder rectangle art. Each `p` is a projected point { x, y, s } where
// s is screen pixels per world unit at that depth.

const SKIN = 0xf1c27d;
const HITBOX_OUTLINE = 0x00ff88;
const ONE_HANDED_OUTLINE = 0xff6b00; // tube outline while punching: it takes extra damage
const RIDGE_INNER = 0x4a9ad8;
const RIDGE_OUTER = 0x2364a0;
const WAKE_SLICES = 24;
const WAKE_NEAR_DEPTH = RIDER_Z * 0.65; // just past the bottom of the screen

// The foam trail behind the boat, plus (when `amp` > 0) the two wake ridges spreading
// out in a V. They reach WAKE.crestX at the riders' depth, matching the physics.
// project(zAhead, worldX) returns a projected point.
export function drawWake(g, project, boatDepth, amp) {
  const boat = project(boatDepth, 0);
  const rider = project(RIDER_Z, 0);
  g.fillStyle(0xffffff, 0.16);
  g.fillPoints(
    [
      { x: boat.x - 150 * boat.s, y: boat.y },
      { x: boat.x + 150 * boat.s, y: boat.y },
      { x: rider.x + 520 * rider.s, y: rider.y + 40 },
      { x: rider.x - 520 * rider.s, y: rider.y + 40 },
    ],
    true,
  );
  if (amp <= 0) return;

  const far = boatDepth - 80;
  const slices = [];
  for (let i = 0; i <= WAKE_SLICES; i++) {
    const z = far - ((far - WAKE_NEAR_DEPTH) * i) / WAKE_SLICES;
    const k = (boatDepth - z) / ROPE_LENGTH;
    slices.push({ z, crest: WAKE.crestX * k, half: WAKE.halfBase * (0.35 + 0.65 * k), height: amp * Math.min(1, k / 0.35) });
  }
  for (const side of [-1, 1]) {
    const rows = slices.map(({ z, crest, half, height }) => {
      const top = project(z, side * crest);
      return {
        inner: project(z, side * Math.max(crest - half, crest * 0.5)),
        top: { x: top.x, y: top.y - height * top.s },
        outer: project(z, side * (crest + half)),
      };
    });
    for (let i = 0; i < WAKE_SLICES; i++) {
      const a = rows[i];
      const b = rows[i + 1];
      g.fillStyle(RIDGE_INNER, 0.85);
      g.fillPoints([a.inner, a.top, b.top, b.inner], true);
      g.fillStyle(RIDGE_OUTER, 0.85);
      g.fillPoints([a.top, a.outer, b.outer, b.top], true);
      g.lineStyle(2, 0xffffff, 0.7);
      g.lineBetween(a.top.x, a.top.y, b.top.x, b.top.y);
    }
  }
}

// Returns the tow point the ropes attach to.
export function drawBoat(g, p, curve) {
  const { x, y, s } = p;
  const bank = curve * 6 * s;

  g.fillStyle(0xf4f4f4, 1);
  g.fillPoints(
    [
      { x: x - 190 * s, y },
      { x: x + 190 * s, y },
      { x: x + 220 * s + bank, y: y - 120 * s },
      { x: x - 220 * s + bank, y: y - 120 * s },
    ],
    true,
  );
  g.fillStyle(0xd23c3c, 1);
  g.fillRect(x - 205 * s + bank * 0.6, y - 85 * s, 410 * s, 20 * s);
  g.fillStyle(0x9fd3f0, 0.9);
  g.fillRect(x - 120 * s + bank, y - 180 * s, 240 * s, 60 * s);
  g.fillStyle(SKIN, 1);
  g.fillRect(x - 25 * s + bank * 1.2, y - 230 * s, 50 * s, 50 * s);
  g.fillStyle(0x333333, 1);
  g.fillRect(x - 35 * s - curve * 4 * s, y - 140 * s, 70 * s, 150 * s);

  return { x, y: y - 130 * s };
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
    g.fillPoints(corners(b), true);
  };
  const outline = (b, color) => {
    g.lineStyle(1, color, 0.9);
    g.strokePoints(corners(b), true);
  };

  if (r.airborne && !r.isOff) {
    const fade = Math.max(0.25, 1 - r.alt / 500);
    g.fillStyle(0x0b2d4a, 0.35 * fade);
    g.fillEllipse(p.x + r.x * s, p.y - wakeHeight(r.x, r.wake) * s, RIDER.tubeWidth * s * fade, 22 * s * fade);
  }

  const tube = r.hurtBox('tube');
  fill(tube, r.air > 0 ? 0x1f1f1f : 0x5a5a5a);
  outline(tube, r.isOneHanded ? ONE_HANDED_OUTLINE : HITBOX_OUTLINE);

  if (r.onShore) {
    const edge = Math.sign(r.x);
    const ex = edge > 0 ? tube.x2 : tube.x1;
    g.fillStyle(0xe8d29a, 0.9);
    for (let i = 0; i < 5; i++) {
      const jx = (Math.random() * 40 - 10) * edge;
      const jy = Math.random() * 60;
      const q = pt(ex + jx, jy);
      g.fillRect(q.x - 3, q.y - 3, 6, 6);
    }
  }

  if (r.isOff) {
    drawFall(g, r, p, time);
    return;
  }

  const body = r.hurtBox('body');
  const head = r.hurtBox('head');
  fill(body, r.flash > 0 ? 0xffffff : r.color);
  fill(head, r.flash > 0 ? 0xffffff : SKIN);
  outline(body, HITBOX_OUTLINE);
  outline(head, HITBOX_OUTLINE);

  const attack = r.attackBox();
  if (attack) {
    if (r.state === 'active') fill(attack, r.attack.type === 'high' ? 0xff9f43 : 0xffe14d);
    else fill(attack, 0xffffff, 0.5);
  }
}

// Rider tumbles off sideways, then gets left behind in the river as a splash.
function drawFall(g, r, p, time) {
  const t = time - r.off.time;
  const s = p.s;
  const x0 = p.x + r.off.x * s;
  const landX = x0 + r.off.dir * 200 * s;

  if (t < 0.5) {
    const k = t / 0.5;
    const x = x0 + r.off.dir * 200 * s * k;
    const y = p.y - (Math.sin(k * Math.PI) * 60 + 100 * (1 - k)) * s + k * 30;
    const w = RIDER.bodyWidth * s * (1 + k * 0.4);
    const h = ((RIDER.torsoTop + RIDER.headSize) * r.heightScale - RIDER.bodyBottom) * s * (1 - k * 0.5);
    g.fillStyle(r.color, 1 - k * 0.3);
    g.fillRect(x - w / 2, y - h, w, h);
    return;
  }

  const k = Math.min((t - 0.5) / 1.2, 1);
  const y = p.y + 30 + k * 120;
  g.lineStyle(3, 0xffffff, 1 - k);
  g.strokeEllipse(landX, y, (120 + 300 * k) * s, (40 + 100 * k) * s);
  g.fillStyle(SKIN, 1 - k);
  g.fillCircle(landX, y, 9 * (1 + k));
}
