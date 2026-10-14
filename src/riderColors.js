// A player's skin and swim trunks colors on the rider pictures. tools/cutout.py redraws
// every frame's skin and trunks in a few fixed shades of Dan's (the animation JSON's
// palette, darkest first); this swaps those exact colors for shades made from a player's
// chosen colors, shaded like Dan's.

// Choices for create-a-player. Each is the middle shade the others are made from: the
// third of four for skin, the second of three for trunks.
export const SKIN_TONES = [0xf2bf9f, 0xe9a37f, 0xd88369, 0xc7794c, 0xb0814f, 0x95583a, 0x70412b, 0x4b2b1f];
export const TRUNKS_COLORS = [0xc45e29, 0xd62828, 0x1d4ed8, 0xfcd34d, 0x1f2937, 0x2f9e44, 0x7b3fc4, 0xd9468f, 0x1f9e9e, 0xd8dce4];
// Skin for special riders (Bart's yellow): not offered from the start; to be unlocked.
export const UNLOCKABLE_SKIN_TONES = TRUNKS_COLORS;
export const DAN_COLORS = { skin: 0xd88369, trunks: 0xc45e29, skinShading: 1, trunksShading: 1 };
export const BASE_SHADE = { skin: 2, trunks: 1 };

// `colors` is { skin, trunks } (0xRRGGBB, their middle shades) and how strongly each is
// shaded, { skinShading, trunksShading } (1 is like Dan; more is more contrast). Returns the
// texture key of `anim` (from riderArt.js) in those colors, made the first time it's asked for.
export function riderTexture(scene, anim, colors = DAN_COLORS) {
  const c = { ...DAN_COLORS, ...colors };
  const meta = scene.cache.json.get(`${anim.key}-meta`);
  if (!meta.palette || sameColors(c, DAN_COLORS)) return anim.key;
  const key = `${anim.key}:${c.skin.toString(16)}:${c.trunks.toString(16)}:${c.skinShading}:${c.trunksShading}`;
  if (scene.textures.exists(key)) return key;

  const swaps = new Map();
  for (const part of ['skin', 'trunks']) {
    const from = meta.palette[part].map((hex) => parseInt(hex.slice(1), 16));
    shades(from, BASE_SHADE[part], c[part], c[`${part}Shading`]).forEach((to, i) => swaps.set(from[i], to));
  }
  const source = scene.textures.get(`${anim.key}-strip`).getSourceImage();
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = image.data;
  for (let i = 0; i < px.length; i += 4) {
    if (!px[i + 3]) continue;
    const to = swaps.get((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]);
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

const sameColors = (a, b) => ['skin', 'trunks', 'skinShading', 'trunksShading'].every((k) => a[k] === b[k]);

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
