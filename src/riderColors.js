import { SKIN } from './config.js';
import { CHARACTERS } from './characters.js';

// A player's skin, swim trunks and hair colors on the rider pictures. tools/cutout.py
// redraws every frame's skin, trunks and hair in a few fixed shades of Dan's (the
// animation JSON's palette, darkest first); this swaps those exact colors for shades made
// from a player's chosen colors, shaded like Dan's.
// Swatch lists and Dan's defaults come from game.json (battle-tubes-data).

export const SKIN_TONES = [];
export const TRUNKS_COLORS = [];
// Skin for special riders (Bart's yellow): not offered from the start; to be unlocked.
export const UNLOCKABLE_SKIN_TONES = TRUNKS_COLORS;
export const HAIR_COLORS = [];
export const DAN_COLORS = { skin: 0, trunks: 0, hair: 0, skinShading: 1, trunksShading: 1, hairShading: 1 };
export const PARTS = ['skin', 'trunks', 'hair'];
export const BASE_SHADE = { skin: 2, trunks: 1, hair: 2 };

export function applyColors({ skinTones, trunksColors, hairColors, danColors, baseShade }) {
  SKIN_TONES.length = 0;
  SKIN_TONES.push(...skinTones);
  TRUNKS_COLORS.length = 0;
  TRUNKS_COLORS.push(...trunksColors);
  HAIR_COLORS.length = 0;
  HAIR_COLORS.push(...hairColors);
  Object.assign(DAN_COLORS, danColors);
  Object.assign(BASE_SHADE, baseShade);
}

// `colors` is { skin, trunks, hair } (0xRRGGBB, their middle shades) and how strongly each
// is shaded, { skinShading, trunksShading, hairShading } (1 is like Dan; more is more
// contrast). Returns the texture key of `anim` (from riderArt.js) in those colors, made
// the first time it's asked for.
export function riderTexture(scene, anim, colors = DAN_COLORS) {
  const c = { ...DAN_COLORS, ...colors };
  const meta = scene.cache.json.get(`${anim.key}-meta`);
  const parts = PARTS.filter((part) => meta.palette?.[part]);
  const asDrawn = (part) => c[part] === middleShade(meta, part) && c[`${part}Shading`] === 1;
  if (parts.every(asDrawn)) return anim.key;
  const key = [anim.key, ...parts.map((part) => `${c[part].toString(16)}:${c[`${part}Shading`]}`)].join(':');
  if (scene.textures.exists(key)) return key;

  const swaps = new Map();
  // Trunks shades also cover near-matches: Dan's orange outline pixels sit a little off
  // the palette, and without this they stay orange after a recolor. Only below the head —
  // riders with their own drawn hair (Rob, Adam, …) keep warm blond/brown pixels that would
  // otherwise look "near" orange and pick up the trunks color (green hair, red hair, …).
  const near = [];
  for (const part of parts) {
    const from = meta.palette[part].map((hex) => parseInt(hex.slice(1), 16));
    const to = shades(from, BASE_SHADE[part], c[part], c[`${part}Shading`]);
    to.forEach((color, i) => swaps.set(from[i], color));
    if (part === 'trunks') from.forEach((color, i) => near.push({ from: color, to: to[i] }));
  }
  const source = scene.textures.get(`${anim.key}-strip`).getSourceImage();
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = image.data;
  const { frameHeight } = meta;
  const headBottom = Math.floor(frameHeight * HEAD_SKIP_TRUNKS_NEAR);
  const rowW = canvas.width;
  for (let i = 0; i < px.length; i += 4) {
    if (!px[i + 3]) continue;
    const color = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2];
    let to = swaps.get(color);
    if (to === undefined && near.length) {
      const y = Math.floor(i / 4 / rowW);
      if (y >= headBottom) to = nearestTrunks(near, px[i], px[i + 1], px[i + 2]);
    }
    if (to === undefined) continue;
    px[i] = to >> 16;
    px[i + 1] = (to >> 8) & 255;
    px[i + 2] = to & 255;
  }
  ctx.putImageData(image, 0, 0);
  const texture = scene.textures.addCanvas(key, canvas);
  for (let i = 0; i < meta.frames; i++) texture.add(i, 0, i * meta.frameWidth, 0, meta.frameWidth, meta.frameHeight);
  return key;
}

const middleShade = (meta, part) => parseInt(meta.palette[part][BASE_SHADE[part]].slice(1), 16);

// How close a pixel can be to a trunks palette color and still recolor with it (squared RGB).
const TRUNKS_NEAR = 55 * 55;
// Top of each strip frame: never apply trunks near-matching (drawn hair lives here).
const HEAD_SKIP_TRUNKS_NEAR = 0.32;
function nearestTrunks(near, r, g, b) {
  let best;
  let bestD = TRUNKS_NEAR;
  for (const { from, to } of near) {
    const dr = r - ((from >> 16) & 255);
    const dg = g - ((from >> 8) & 255);
    const db = b - (from & 255);
    const d = dr * dr + dg * dg + db * db;
    if (d < bestD) {
      bestD = d;
      best = to;
    }
  }
  return best;
}

// A character's colors from characters.js (flat, as a match draws them) for the pictures:
// as far from Dan's middle shades as they are from Dan's own flat colors there, in hue,
// saturation and lightness.
export function artColors({ skin = SKIN, trunks }) {
  const dan = danCharacter();
  return {
    ...DAN_COLORS,
    skin: relative(skin, dan.skin, DAN_COLORS.skin),
    trunks: relative(trunks, dan.trunks, DAN_COLORS.trunks),
  };
}

// The other way: a picture color for `part` ('skin' or 'trunks') as a match draws it.
export function matchColor(part, color) {
  return relative(color, DAN_COLORS[part], danCharacter()[part]);
}

const danCharacter = () => CHARACTERS.find((c) => c.id === 'Dan');

// 0xRRGGBB as '#rrggbb', and back.
export const toHex = (color) => `#${color.toString(16).padStart(6, '0')}`;
export const fromHex = (hex) => parseInt(hex.slice(1), 16);

// `color` moved the way `from` moves to `to`.
function relative(color, from, to) {
  if (color === from) return to;
  const [h, s, l] = hsl(color);
  const [fh, fs, fl] = hsl(from);
  const [th, ts, tl] = hsl(to);
  return fromHsl((h + th - fh + 1) % 1, fs > 0 ? Math.min(1, (s * ts) / fs) : s, Math.min(1, (l * tl) / fl));
}

// Dan's shades `from`, moved to center on `base` instead of from[baseIndex]: each keeps
// its hue turn and saturation from Dan's middle shade, and its lightness as a multiple of
// the middle's (a lighter one getting no closer to white than Dan's does, so dark colors
// don't get glaring highlights), the difference times `shading`.
export function shades(from, baseIndex, base, shading = 1) {
  const ref = hsl(from[baseIndex]);
  const [h, s, l] = hsl(base);
  return from.map((color, i) => {
    if (i === baseIndex) return base;
    const [ch, cs, cl] = hsl(color);
    const toWhite = Math.max(0, Math.min(1, ((cl - ref[2]) / (1 - ref[2])) * shading));
    const light = Math.max(0, Math.min(l * (1 + (cl / ref[2] - 1) * shading), l + (1 - l) * toWhite));
    const sat = ref[1] > 0 ? Math.min(1, s * (cs / ref[1])) : s;
    return fromHsl((h + ch - ref[0] + 1) % 1, sat, light);
  });
}

function hsl(color) {
  const r = (color >> 16) / 255;
  const g = ((color >> 8) & 255) / 255;
  const b = (color & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6 : max === g ? ((b - r) / d + 2) / 6 : ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function fromHsl(h, s, l) {
  const channel = (n) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return (channel(0) << 16) | (channel(8) << 8) | channel(4);
}
