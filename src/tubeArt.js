import Phaser from 'phaser';
import { RIDER } from './config.js';

// Inner tubes drawn in code as pixel art: a donut seen from behind and a little above,
// traced pixel by pixel, shaded in a few flat color bands with a dark outline. It comes
// in two layers, back and front, so a rider drawn between them sits inside the ring.
//
// One texel is one "art pixel" of the rider pictures from tools/cutout.py, so the tube's
// pixels match theirs wherever both are drawn at the same scale.

export const TEXELS_PER_UNIT = 1.05; // art pixels per world unit, measured from the rider pictures
// Outer diameter in world units (~41"), small enough that riders can reach each other over
// two touching tubes. Matches draw them RIDER_ART.tubeWidth across instead (config.js).
export const TUBE_WIDTH = 110;
const PITCH = (14 * Math.PI) / 180; // how far above the tube the camera looks down from
const RING = 0.69; // the ring's radius, as a share of the tube's outer radius
const FRONT_Z = -0.35; // nearer than this share of the ring radius is the front layer
const STEP_SHARE = 0.6; // ray march steps are this much of the distance estimate
const MARCH_STEPS = 160;
const DITHER = 0.05; // how much the shading bands' edges are dithered
const SHINE_POWER = 70; // higher: a smaller, sharper highlight
const SHINE_FROM = 0.6;
const DEPTH_JUMP = 4; // texels of depth between neighbors that get an outline
const AIR_STEP = 0.05; // air, squash and lean are rounded to these steps; each combination is drawn once
const SQUASH_STEP = 0.1;
const LEAN_STEP = 0.1;
const LEAN_SPREAD = 0.05; // a full lean spreads that side out this share of the tube's radius...
const LEAN_RISE = 0.12; // ...and lifts the other side's edge this share of its height

// Black rubber, darkest to lightest.
export const RUBBER = { outline: 0x07080a, dark2: 0x111317, dark1: 0x1b1e24, base: 0x2a2e36, light: 0x444b57, shine: 0x8894a8 };
// Colored vinyl covers over the top, like the tubes by the dock in the menu picture,
// shaded in the same bands. A tube without a `color` is all rubber.
export const TUBE_COLORS = {
  green: { dark2: 0x2f6a12, dark1: 0x4c9a1c, base: 0x78cc32, light: 0xa8ec5a, shine: 0xe2ffb0 },
  blue: { dark2: 0x0d2e78, dark1: 0x1449b0, base: 0x1f6fe0, light: 0x4aa0f5, shine: 0xc6e6ff },
};
const COVER_FROM = 0.3; // surfaces facing up more than this (normal's up part) are covered
const STRIPE = { at: 0.55, half: 0.07 }; // a dark ring on the cover, out across the tube's tread
// Bakes waiting for bakeTubes(), and the newest a match will wait behind before dropping
// the oldest (warm-ups are kept and come after them).
const MAX_WANTED = 24;
// The grab handle, in the riders' handle colors; sized in texels like the one Dan holds.
const HANDLE = { dark: 0x0b0c1e, base: 0x26253a, mid: 0x3d3c5a, shine: 0x55576f };
const HANDLE_SIZE = { length: 24, thick: 8, knob: 4 };
export const HANDLE_SPOT = 0.55; // its center, out from the middle, as a share of the ring radius
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);

const norm = ([x, y, z]) => {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
};
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const LIGHT = norm([-0.45, 0.85, -0.35]); // from above, left and a little in front

// The tube's two layers as Phaser texture keys, drawn on first use. `air` is 0 (flat) to 1
// (full); `squash` is -1 to 1, the left (negative) or right side pushed in by a bump;
// `lean` is -1 to 1, the left or right side pressed down by the rider's weight.
// `handle` puts a grab handle on the far side's right (1) or left (-1) half, or none (0),
// `handleSpot` out from the middle (a share of the ring radius). `crisp` keeps the texels square when scaled up (for close-ups) instead of smoothing.
// `width` is the outer diameter in world units, and `color` a TUBE_COLORS cover (or none).
// `origin` is where the bottom center of the tube is, as a share of the texture size (for
// setOrigin). Measured in texels from that point: `seat` is where a rider's anchor goes,
// `left` and `right` are how far the tube reaches each way, and `rim(x)` and `farRim(x)`
// are the heights of the near and far sides' top edges at x (null where there's none),
// where a handle's strap attaches.
export function tubeTextures(scene, options = {}) {
  const tube = tubeSpec(options);
  if (!isBaked(scene, tube)) finishBake(scene, tube, runToEnd(renderTube(tube)));
  return bakedTube(scene, tube.key);
}

// The same, for every frame of a match, where a bake would stall the game: a tube that
// isn't drawn yet is queued for bakeTubes() and the nearest one that is (same width,
// handle and color) stands in. Only when there's none at all is it drawn on the spot.
export function tubeTexturesSoon(scene, options = {}) {
  const tube = tubeSpec(options);
  if (isBaked(scene, tube)) return bakedTube(scene, tube.key);
  const stand = nearestBaked(tube);
  if (!stand) return tubeTextures(scene, options);
  want(tube);
  return bakedTube(scene, stand.key);
}

// Queues tubes to bake when there's nothing more pressing, for ones a match will need soon.
export function warmTubes(scene, list) {
  for (const options of list) {
    const tube = tubeSpec(options);
    if (!isBaked(scene, tube) && !queued.has(tube.key)) {
      queued.set(tube.key, tube);
      warming.push(tube);
    }
  }
}

// Bakes queued tubes, a few rows at a time, for up to `budgetMs` (call every frame):
// the newest a match asked for first, then the warm-ups in order.
export function bakeTubes(scene, budgetMs) {
  const end = performance.now() + budgetMs;
  while (performance.now() < end) {
    const list = wanted.length ? wanted : warming;
    const tube = list.at(list === wanted ? -1 : 0);
    if (!tube) return;
    tube.bake ??= renderTube(tube);
    const step = tube.bake.next();
    if (!step.done) continue;
    list.splice(list.indexOf(tube), 1);
    queued.delete(tube.key);
    if (!isBaked(scene, tube)) finishBake(scene, tube, step.value);
  }
}

const queued = new Map(); // key -> tube, for every tube in `wanted` or `warming`
const wanted = [];
const warming = [];
const bakedFamilies = new Map(); // family -> tubes baked in it

function want(tube) {
  const waiting = queued.get(tube.key);
  if (waiting) {
    // Asked for again: to the front of the line, keeping what's been drawn of it.
    const list = wanted.includes(waiting) ? wanted : warming;
    list.splice(list.indexOf(waiting), 1);
    wanted.push(waiting);
    return;
  }
  queued.set(tube.key, tube);
  wanted.push(tube);
  if (wanted.length > MAX_WANTED) queued.delete(wanted.shift().key);
}

// Rounds the options to the steps tubes are drawn at, and names the result.
function tubeSpec({ air = 1, squash = 0, lean = 0, handle = 0, handleSpot = HANDLE_SPOT, crisp = false, width = TUBE_WIDTH, color = null } = {}) {
  const a = Math.round(Math.min(1, Math.max(0, air)) / AIR_STEP) * AIR_STEP;
  const q = Math.round(Math.min(1, Math.max(-1, squash)) / SQUASH_STEP) * SQUASH_STEP;
  const l = Math.round(Math.min(1, Math.max(-1, lean)) / LEAN_STEP) * LEAN_STEP;
  const h = Math.sign(handle);
  const spot = h ? Number(handleSpot.toFixed(2)) : 0;
  const w = Math.round(width);
  const family = `${w}:${h}:${h ? spot : '-'}:${color ?? 'black'}${crisp ? ':crisp' : ''}`;
  const key = `tube:${a.toFixed(2)}:${q.toFixed(2)}:${l.toFixed(1)}:${family}`;
  return { key, family, air: a, squash: q, lean: l, handle: h, handleSpot: spot, width: w, color, crisp };
}

const isBaked = (scene, tube) => scene.textures.exists(`${tube.key}:back`);

function bakedTube(scene, key) {
  return { back: `${key}:back`, front: `${key}:front`, ...scene.textures.get(`${key}:back`).customData };
}

function finishBake(scene, tube, { back, front, info }) {
  for (const [layer, canvas] of [['back', back], ['front', front]]) {
    const texture = scene.textures.addCanvas(`${tube.key}:${layer}`, canvas);
    if (tube.crisp) texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  scene.textures.get(`${tube.key}:back`).customData = info;
  if (!bakedFamilies.has(tube.family)) bakedFamilies.set(tube.family, []);
  bakedFamilies.get(tube.family).push(tube);
}

// Air counts most: a tube looking fuller or flatter than it is shows the most.
function nearestBaked(tube) {
  let best = null;
  let bestScore = Infinity;
  for (const t of bakedFamilies.get(tube.family) ?? []) {
    const score = 3 * Math.abs(t.air - tube.air) + Math.abs(t.squash - tube.squash) + Math.abs(t.lean - tube.lean);
    if (score < bestScore) {
      best = t;
      bestScore = score;
    }
  }
  return best;
}

function runToEnd(bake) {
  for (;;) {
    const step = bake.next();
    if (step.done) return step.value;
  }
}

// A grab handle like the ones riders hold, centered on column `cx` and resting on the
// far side's top edge (the column's topmost tube texel, so a rider stands in front of
// it), strapped down at both ends: a bar with a knob on each end.
function drawHandle(img, put, layer, width, height, cx) {
  let rim = 0;
  while (rim < height && layer[rim * width + cx] !== 1) rim++;
  if (rim >= height) return;
  const { length, thick, knob } = HANDLE_SIZE;
  const left = cx - Math.floor(length / 2);
  const top = rim + 3 - thick;
  const inBar = (dx, dy) => {
    if (dx < 0 || dx >= length || dy < 0 || dy >= thick) return false;
    const end = Math.min(dx, length - 1 - dx);
    if (end >= knob) return dy > 0 && dy < thick - 1; // the bar between the knobs is thinner
    return !(end === 0 && (dy === 0 || dy === thick - 1)); // rounded knob corners
  };
  const set = (x, y, hex) => {
    if (x >= 0 && y >= 0 && x < width && y < height) put(img, y * width + x, hex);
  };

  for (const dx of [knob + 1, length - knob - 2]) {
    for (let dy = thick - 2; dy < thick + 3; dy++) {
      for (let sx = -1; sx <= 1; sx++) set(left + dx + sx, top + dy, sx ? RUBBER.outline : RUBBER.dark1);
    }
  }
  for (let dy = 0; dy < thick; dy++) {
    for (let dx = 0; dx < length; dx++) {
      if (!inBar(dx, dy)) continue;
      const edge = !inBar(dx - 1, dy) || !inBar(dx + 1, dy) || !inBar(dx, dy - 1) || !inBar(dx, dy + 1);
      const fromTop = inBar(dx, dy - 2) ? 2 : inBar(dx, dy - 1) ? 1 : 0;
      const color = edge ? HANDLE.dark : fromTop === 1 ? HANDLE.shine : !inBar(dx, dy + 2) ? HANDLE.base : HANDLE.mid;
      set(left + dx, top + dy, color);
    }
  }
}

// Yields after each row of texels, so a bake can be spread over frames; returns the
// layers' canvases and the tube's measurements.
function* renderTube({ air, squash, lean, handle: handleSide, handleSpot, width: tubeWidth, color }) {
  const cover = TUBE_COLORS[color] ?? null;
  const outer = (tubeWidth / 2) * TEXELS_PER_UNIT;
  const R = outer * RING;
  const r = outer - R;
  // Losing air flattens the tube's cross-section and spreads it a little; low on air it
  // also wrinkles around the ring. Its bottom stays on the water.
  const rv = r * (0.45 + 0.55 * air);
  const rh = r * (1 + 0.18 * (1 - air));
  const cy = rv - r;
  const wrinkle = 0.1 * Math.pow(1 - air, 1.3);
  const side = Math.sign(squash);
  const push = Math.abs(squash);
  const leanSide = Math.sign(lean);
  const weight = Math.abs(lean);

  const cos = Math.cos(PITCH);
  const sin = Math.sin(PITCH);
  const forward = [0, -sin, cos];
  const up = [0, cos, sin];
  const pad = 4;
  const halfW = Math.ceil(R + rh * 1.15) + pad;
  const halfH = Math.ceil((R + rh) * sin + r * 1.3 * cos) + pad; // 1.3: room for a bump's bulge
  const width = halfW * 2;
  const height = halfH * 2;
  const minRadius = Math.min(rh, rv);
  // Every shape fits in this sphere around the middle, so rays start where they enter it.
  const bound = 1.4 * (R + rh * 1.2) + r;

  const sdf = (x, y, z) => {
    if (push && x * side > 0) {
      // The bumped side gives: pushed in, and a little taller where the air goes.
      const w = Math.min(1, (x * side) / (R + rh));
      x *= 1 + push * 0.45 * w;
      y = cy + (y - cy) / (1 + push * 0.3 * w);
    }
    if (weight) {
      // The side taking the rider's weight sinks lower toward its edge, its bottom still on
      // the water, and spreads a little; the other side lifts a little.
      const w = Math.min(1, Math.abs(x) / (R + rh));
      if (x * leanSide > 0) {
        x /= 1 + weight * LEAN_SPREAD * w;
        y = -r + (y + r) / (1 - weight * RIDER.leanSink * w);
      } else {
        y = -r + (y + r) / (1 + weight * LEAN_RISE * w);
      }
    }
    // Math.sqrt rather than Math.hypot: this runs millions of times per tube.
    const ring = Math.sqrt(x * x + z * z);
    const wob = wrinkle ? 1 + wrinkle * Math.sin(Math.atan2(z, x) * 9 + 1.3) : 1;
    const qx = (ring - R) / (rh * wob);
    const qy = (y - cy) / (rv * wob);
    return (Math.sqrt(qx * qx + qy * qy) - 1) * minRadius;
  };
  const normal = (x, y, z) => {
    const e = 0.5;
    return norm([
      sdf(x + e, y, z) - sdf(x - e, y, z),
      sdf(x, y + e, z) - sdf(x, y - e, z),
      sdf(x, y, z + e) - sdf(x, y, z - e),
    ]);
  };
  const view = forward.map((v) => -v);
  const half = norm(LIGHT.map((v, i) => v + view[i]));

  // Per texel: which layer (0 none, 1 back, 2 front), how far along the ray it was hit,
  // and its color.
  const layer = new Uint8Array(width * height);
  const depth = new Float32Array(width * height);
  const shade = new Array(width * height);
  const far = R + r * 2;
  const stripe = R + rh * STRIPE.at;
  for (let py = 0; py < height; py++) {
    if (py > 0) yield;
    for (let px = 0; px < width; px++) {
      const sx = px - halfW + 0.5;
      const sy = -(py - halfH + 0.5);
      const ox = sx;
      const oy = sy * up[1] - far * forward[1];
      const oz = sy * up[2] - far * forward[2];
      const b = oy * forward[1] + oz * forward[2];
      const disc = b * b - (ox * ox + oy * oy + oz * oz - bound * bound);
      let t = disc > 0 ? Math.max(0, -b - Math.sqrt(disc)) : far * 2;
      let hit = false;
      for (let i = 0; i < MARCH_STEPS && t < far * 2; i++) {
        const d = sdf(ox, oy + t * forward[1], oz + t * forward[2]);
        // Still grazing the surface when the steps run out counts as a hit, or edges
        // seen at a low angle come out speckled with holes.
        if (d < 0.05 || (i === MARCH_STEPS - 1 && d < 1)) {
          hit = true;
          break;
        }
        t += Math.max(0.05, d * STEP_SHARE);
      }
      if (!hit) {
        // A ray through the hole: shaded as the tube's shadowed inside rather than showing
        // the water in thin, broken slivers.
        const th = (cy - oy) / forward[1];
        const hz = oz + th * forward[2];
        if (ox * ox + hz * hz < R * R) {
          const i = py * width + px;
          layer[i] = 1;
          depth[i] = th;
          shade[i] = RUBBER.dark2;
        }
        continue;
      }
      const y = oy + t * forward[1];
      const z = oz + t * forward[2];
      const n = normal(ox, y, z);
      const i = py * width + px;
      layer[i] = z < FRONT_Z * R ? 2 : 1;
      depth[i] = t;
      const lit = 0.18 + 0.82 * Math.max(0, dot(n, LIGHT)) + BAYER[(py % 4) * 4 + (px % 4)] * DITHER;
      const shine = Math.pow(Math.max(0, dot(n, half)), SHINE_POWER);
      const band = shine > SHINE_FROM ? 'shine' : lit < 0.3 ? 'dark2' : lit < 0.52 ? 'dark1' : lit < 0.8 ? 'base' : 'light';
      const covered = cover && n[1] > COVER_FROM;
      const striped = covered && Math.abs(Math.sqrt(ox * ox + z * z) - stripe) < rh * STRIPE.half;
      shade[i] = striped ? RUBBER.dark1 : (covered ? cover : RUBBER)[band];
    }
  }

  const back = document.createElement('canvas');
  const front = document.createElement('canvas');
  back.width = front.width = width;
  back.height = front.height = height;
  const images = { 1: back.getContext('2d').createImageData(width, height), 2: front.getContext('2d').createImageData(width, height) };
  const put = (img, i, hex) => {
    const o = i * 4;
    img.data[o] = (hex >> 16) & 255;
    img.data[o + 1] = (hex >> 8) & 255;
    img.data[o + 2] = hex & 255;
    img.data[o + 3] = 255;
  };
  const inside = (x, y) => x >= 0 && y >= 0 && x < width && y < height && layer[y * width + x] > 0;
  // Outlined where it meets empty space, and where a nearer part crosses a farther one (a
  // jump in depth), but not along the seam between the layers.
  const opens = (x, y, i) => !inside(x, y) || depth[y * width + x] - depth[i] > DEPTH_JUMP;
  yield;
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const i = py * width + px;
      if (!layer[i]) continue;
      const edge = opens(px - 1, py, i) || opens(px + 1, py, i) || opens(px, py - 1, i) || opens(px, py + 1, i);
      put(images[layer[i]], i, edge ? RUBBER.outline : shade[i]);
    }
  }

  if (handleSide) drawHandle(images[1], put, layer, width, height, Math.round(halfW + handleSide * R * handleSpot));

  const project = (x, y, z) => ({ x: Math.round(x + halfW), y: Math.round(halfH - (y * up[1] + z * up[2])) });
  back.getContext('2d').putImageData(images[1], 0, 0);
  front.getContext('2d').putImageData(images[2], 0, 0);
  const bottom = project(0, -r, 0);
  const seat = project(0, cy - rv * 0.1, 0);

  // The near side's top edge in each column (the first front-layer texel from the top),
  // the far side's (the first back-layer texel above that), and the outermost columns
  // with any tube in them.
  const rimRows = [];
  const farRimRows = [];
  let leftmost = width;
  let rightmost = 0;
  for (let px = 0; px < width; px++) {
    let row = null;
    let farRow = null;
    for (let py = 0; py < height; py++) {
      const l = layer[py * width + px];
      if (l && px < leftmost) leftmost = px;
      if (l) rightmost = px + 1;
      if (l === 1 && farRow === null) farRow = py;
      if (l === 2) {
        row = py;
        break;
      }
    }
    rimRows.push(row === null ? null : row - bottom.y);
    farRimRows.push(farRow === null ? null : farRow - bottom.y);
  }
  return {
    back,
    front,
    info: {
      width,
      height,
      origin: { x: bottom.x / width, y: bottom.y / height },
      seat: { x: seat.x - bottom.x, y: seat.y - bottom.y },
      left: bottom.x - leftmost,
      right: rightmost - bottom.x,
      rim: (x) => rimRows[Math.round(x + bottom.x)] ?? null,
      farRim: (x) => farRimRows[Math.round(x + bottom.x)] ?? null,
    },
  };
}
