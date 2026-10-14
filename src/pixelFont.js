// The game's lettering: hand-drawn SNES-style pixel fonts. The glyphs below are turned
// into a sprite sheet the first time a font is used, then drawn with Phaser's BitmapText.
// Glyphs are white (with a black outline in the outlined fonts) and tinted to their color.
import Phaser from 'phaser';

const SHEET_W = 512;
const PAD = 2; // empty pixels between glyphs on the sheet, so neighbors never bleed in

// '#' is a lit pixel. Each glyph is as wide as its rows; shorter glyphs are padded at the
// bottom. Rows 0-6 are capital height, 7-8 are below the baseline (g, j, p, q, y, comma).
const GLYPHS = {
  A: ['.####.', '##..##', '##..##', '######', '##..##', '##..##', '##..##'],
  B: ['#####.', '##..##', '##..##', '#####.', '##..##', '##..##', '#####.'],
  C: ['.####.', '##..##', '##....', '##....', '##....', '##..##', '.####.'],
  D: ['####..', '##.##.', '##..##', '##..##', '##..##', '##.##.', '####..'],
  E: ['######', '##....', '##....', '#####.', '##....', '##....', '######'],
  F: ['######', '##....', '##....', '#####.', '##....', '##....', '##....'],
  G: ['.####.', '##..##', '##....', '##.###', '##..##', '##..##', '.#####'],
  H: ['##..##', '##..##', '##..##', '######', '##..##', '##..##', '##..##'],
  I: ['####', '.##.', '.##.', '.##.', '.##.', '.##.', '####'],
  J: ['...###', '....##', '....##', '....##', '##..##', '##..##', '.####.'],
  K: ['##..##', '##.##.', '####..', '###...', '####..', '##.##.', '##..##'],
  L: ['##....', '##....', '##....', '##....', '##....', '##....', '######'],
  M: ['##...##', '###.###', '#######', '##.#.##', '##...##', '##...##', '##...##'],
  N: ['##..##', '###.##', '###.##', '##.###', '##.###', '##..##', '##..##'],
  O: ['.####.', '##..##', '##..##', '##..##', '##..##', '##..##', '.####.'],
  P: ['#####.', '##..##', '##..##', '#####.', '##....', '##....', '##....'],
  Q: ['.####.', '##..##', '##..##', '##..##', '##.###', '##..##', '.###.#'],
  R: ['#####.', '##..##', '##..##', '#####.', '####..', '##.##.', '##..##'],
  S: ['.####.', '##..##', '##....', '.####.', '....##', '##..##', '.####.'],
  T: ['######', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..'],
  U: ['##..##', '##..##', '##..##', '##..##', '##..##', '##..##', '.####.'],
  V: ['##..##', '##..##', '##..##', '##..##', '##..##', '.####.', '..##..'],
  W: ['##...##', '##...##', '##...##', '##.#.##', '#######', '###.###', '##...##'],
  X: ['##..##', '##..##', '.####.', '..##..', '.####.', '##..##', '##..##'],
  Y: ['##..##', '##..##', '##..##', '.####.', '..##..', '..##..', '..##..'],
  Z: ['######', '....##', '...##.', '..##..', '.##...', '##....', '######'],

  a: ['......', '......', '.####.', '....##', '.#####', '##..##', '.#####'],
  b: ['##....', '##....', '#####.', '##..##', '##..##', '##..##', '#####.'],
  c: ['......', '......', '.####.', '##....', '##....', '##....', '.####.'],
  d: ['....##', '....##', '.#####', '##..##', '##..##', '##..##', '.#####'],
  e: ['......', '......', '.####.', '##..##', '######', '##....', '.####.'],
  f: ['..###', '.##..', '####.', '.##..', '.##..', '.##..', '.##..'],
  g: ['......', '......', '.#####', '##..##', '##..##', '##..##', '.#####', '....##', '.####.'],
  h: ['##....', '##....', '#####.', '##..##', '##..##', '##..##', '##..##'],
  i: ['##', '..', '##', '##', '##', '##', '##'],
  j: ['..##', '....', '..##', '..##', '..##', '..##', '..##', '..##', '###.'],
  k: ['##....', '##....', '##..##', '##.##.', '####..', '##.##.', '##..##'],
  l: ['##.', '##.', '##.', '##.', '##.', '##.', '.##'],
  m: ['.......', '.......', '######.', '##.#.##', '##.#.##', '##.#.##', '##.#.##'],
  n: ['......', '......', '#####.', '##..##', '##..##', '##..##', '##..##'],
  o: ['......', '......', '.####.', '##..##', '##..##', '##..##', '.####.'],
  p: ['......', '......', '#####.', '##..##', '##..##', '##..##', '#####.', '##....', '##....'],
  q: ['......', '......', '.#####', '##..##', '##..##', '##..##', '.#####', '....##', '....##'],
  r: ['.....', '.....', '##.##', '####.', '##...', '##...', '##...'],
  s: ['......', '......', '.#####', '##....', '.####.', '....##', '#####.'],
  t: ['.##..', '.##..', '#####', '.##..', '.##..', '.##..', '..###'],
  u: ['......', '......', '##..##', '##..##', '##..##', '##..##', '.#####'],
  v: ['......', '......', '##..##', '##..##', '##..##', '.####.', '..##..'],
  w: ['.......', '.......', '##...##', '##.#.##', '##.#.##', '##.#.##', '.##.##.'],
  x: ['......', '......', '##..##', '.####.', '..##..', '.####.', '##..##'],
  y: ['......', '......', '##..##', '##..##', '##..##', '##..##', '.#####', '....##', '.####.'],
  z: ['......', '......', '######', '...##.', '..##..', '.##...', '######'],

  0: ['.####.', '##..##', '##.###', '######', '###.##', '##..##', '.####.'],
  1: ['..##..', '.###..', '..##..', '..##..', '..##..', '..##..', '.####.'],
  2: ['.####.', '##..##', '....##', '..###.', '.##...', '##....', '######'],
  3: ['.####.', '##..##', '....##', '..###.', '....##', '##..##', '.####.'],
  4: ['...##.', '..###.', '.####.', '##.##.', '######', '...##.', '...##.'],
  5: ['######', '##....', '#####.', '....##', '....##', '##..##', '.####.'],
  6: ['.####.', '##....', '##....', '#####.', '##..##', '##..##', '.####.'],
  7: ['######', '....##', '...##.', '..##..', '..##..', '..##..', '..##..'],
  8: ['.####.', '##..##', '##..##', '.####.', '##..##', '##..##', '.####.'],
  9: ['.####.', '##..##', '##..##', '.#####', '....##', '...##.', '.###..'],

  ' ': ['...'],
  '!': ['##', '##', '##', '##', '##', '..', '##'],
  '?': ['.####.', '##..##', '....##', '..###.', '..##..', '......', '..##..'],
  '.': ['..', '..', '..', '..', '..', '##', '##'],
  ',': ['..', '..', '..', '..', '..', '##', '##', '#.'],
  ':': ['..', '##', '##', '..', '..', '##', '##'],
  ';': ['..', '##', '##', '..', '..', '##', '##', '#.'],
  "'": ['##', '##', '#.'],
  '"': ['##.##', '##.##', '#..#.'],
  '-': ['....', '....', '....', '####'],
  '+': ['......', '..##..', '..##..', '######', '..##..', '..##..'],
  '=': ['.....', '.....', '#####', '.....', '#####'],
  '/': ['....##', '...##.', '...##.', '..##..', '.##...', '.##...', '##....'],
  '(': ['.##', '##.', '##.', '##.', '##.', '##.', '.##'],
  ')': ['##.', '.##', '.##', '.##', '.##', '.##', '##.'],
  '[': ['###', '##.', '##.', '##.', '##.', '##.', '###'],
  ']': ['###', '.##', '.##', '.##', '.##', '.##', '###'],
  '<': ['...##', '..##.', '.##..', '##...', '.##..', '..##.', '...##'],
  '>': ['##...', '.##..', '..##.', '...##', '..##.', '.##..', '##...'],
  '&': ['.###...', '##.##..', '.###...', '.###.##', '##.###.', '##..##.', '.###.##'],
  '%': ['##...#', '##..##', '...##.', '..##..', '.##...', '##..##', '#...##'],
  '#': ['.......', '.##.##.', '#######', '.##.##.', '.##.##.', '#######', '.##.##.'],
  '*': ['......', '.#..#.', '..##..', '######', '..##..', '.#..#.'],
  _: ['......', '......', '......', '......', '......', '......', '######'],

  '◀': ['...##', '..###', '.####', '#####', '.####', '..###', '...##'],
  '▶': ['##...', '###..', '####.', '#####', '####.', '###..', '##...'],
  '▲': ['.......', '.......', '...#...', '..###..', '.#####.', '#######'],
  '▼': ['.......', '#######', '.#####.', '..###..', '...#...'],
  '←': ['.......', '..#....', '.##....', '#######', '.##....', '..#....'],
  '→': ['.......', '....#..', '....##.', '#######', '....##.', '....#..'],
  '↑': ['..#..', '.###.', '#####', '..#..', '..#..', '..#..', '..#..'],
  '↓': ['..#..', '..#..', '..#..', '..#..', '#####', '.###.', '..#..'],
  '❚': ['##', '##', '##', '##', '##', '##', '##'],
};

// Capitals only, 5 pixels tall, for small labels. Lowercase is drawn as capitals.
const SMALL_GLYPHS = {
  A: ['.##.', '#..#', '####', '#..#', '#..#'],
  B: ['###.', '#..#', '###.', '#..#', '###.'],
  C: ['.###', '#...', '#...', '#...', '.###'],
  D: ['###.', '#..#', '#..#', '#..#', '###.'],
  E: ['####', '#...', '###.', '#...', '####'],
  F: ['####', '#...', '###.', '#...', '#...'],
  G: ['.###', '#...', '#.##', '#..#', '.###'],
  H: ['#..#', '#..#', '####', '#..#', '#..#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..##', '...#', '...#', '#..#', '.##.'],
  K: ['#..#', '#.#.', '##..', '#.#.', '#..#'],
  L: ['#...', '#...', '#...', '#...', '####'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  N: ['#..#', '##.#', '#.##', '#..#', '#..#'],
  O: ['.##.', '#..#', '#..#', '#..#', '.##.'],
  P: ['###.', '#..#', '###.', '#...', '#...'],
  Q: ['.##.', '#..#', '#..#', '#.#.', '.#.#'],
  R: ['###.', '#..#', '###.', '#.#.', '#..#'],
  S: ['.###', '#...', '.##.', '...#', '###.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#..#', '#..#', '#..#', '#..#', '.##.'],
  V: ['#...#', '#...#', '.#.#.', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'],
  X: ['#..#', '#..#', '.##.', '#..#', '#..#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  Z: ['####', '..#.', '.#..', '#...', '####'],
  0: ['###', '#.#', '#.#', '#.#', '###'],
  1: ['.#.', '##.', '.#.', '.#.', '###'],
  2: ['###', '..#', '###', '#..', '###'],
  3: ['###', '..#', '.##', '..#', '###'],
  4: ['#.#', '#.#', '###', '..#', '..#'],
  5: ['###', '#..', '###', '..#', '###'],
  6: ['###', '#..', '###', '#.#', '###'],
  7: ['###', '..#', '.#.', '.#.', '.#.'],
  8: ['###', '#.#', '###', '#.#', '###'],
  9: ['###', '#.#', '###', '..#', '###'],
  ' ': ['..'],
  '!': ['#', '#', '#', '.', '#'],
  '?': ['###', '..#', '.##', '...', '.#.'],
  '.': ['.', '.', '.', '.', '#'],
  ',': ['.', '.', '.', '#', '#'],
  ':': ['.', '#', '.', '#', '.'],
  '&': ['.#..', '#.#.', '.#.#', '#.#.', '.#.#'],
  '+': ['...', '.#.', '###', '.#.', '...'],
  "'": ['#', '#'],
  '"': ['#.#', '#.#'],
  '-': ['...', '...', '###'],
  '/': ['..#', '..#', '.#.', '#..', '#..'],
  '(': ['.#', '#.', '#.', '#.', '.#'],
  ')': ['#.', '.#', '.#', '.#', '#.'],
};

// normal: the main outlined font. plain: the same letters without the outline, for dark
// text on light backgrounds. small: compact outlined capitals. `wideSpace` is the width of
// a space in font pixels in wide-spaced text (the outlined fonts' spaces get their outline
// width on top). `descent` is how many of the rows sit below the capitals.
const FONTS = {
  normal: { key: 'pixel-font', glyphs: GLYPHS, rows: 9, descent: 2, outline: 1, wideSpace: 1 },
  plain: { key: 'pixel-font-plain', glyphs: GLYPHS, rows: 9, descent: 2, outline: 0, wideSpace: 3 },
  small: { key: 'pixel-font-small', glyphs: SMALL_GLYPHS, rows: 5, descent: 0, outline: 1, wideSpace: 1 },
};
// Tight text (sentences) has neighboring letters share an outline. Wide text (titles and
// other big text) has this much clear space between letters, in screen pixels at every size.
const LETTER_GAP = 2;
const WIDE_FROM_SCALE = 3;
const fontKey = (f, spacing) => (spacing === 'wide' ? `${f.key}-wide` : f.key);
const FONT_BY_KEY = Object.fromEntries(
  Object.values(FONTS).flatMap((f) => ['tight', 'wide'].map((spacing) => [fontKey(f, spacing), f])),
);

// Characters the fonts draw as a look-alike.
const ALIASES = { '−': '-', '–': '-', '—': '-', '’': "'", '‘': "'", '“': '"', '”': '"', '…': '...', '×': 'x' };

const toColor = (c) => (typeof c === 'string' ? parseInt(c.replace('#', ''), 16) : c);

// Anything a font can't draw shows as '?' (after trying it as a capital).
function sanitize(str, glyphs) {
  let out = '';
  for (const ch of String(str)) {
    const c = ALIASES[ch] ?? ch;
    if (c === '\n' || [...c].every((k) => glyphs[k])) out += c;
    else if (glyphs[c.toUpperCase()]) out += c.toUpperCase();
    else out += '?';
  }
  return out;
}

// Draws every glyph onto one canvas texture and registers it as a bitmap font.
function buildFont(game, key, { glyphs, rows: glyphRows, outline, wideSpace }, spacing) {
  const cellH = glyphRows + outline * 2;
  const cells = [];
  let x = PAD;
  let y = PAD;
  for (const [ch, art] of Object.entries(glyphs)) {
    const rows = ch === ' ' && spacing === 'wide' ? ['.'.repeat(wideSpace)] : art;
    const w = rows[0].length;
    const cw = w + outline * 2;
    if (x + cw + PAD > SHEET_W) {
      x = PAD;
      y += cellH + PAD;
    }
    cells.push({ ch, rows, w, x, y });
    x += cw + PAD;
  }
  const sheetH = y + cellH + PAD;

  const texture = game.textures.createCanvas(key, SHEET_W, sheetH);
  const ctx = texture.getContext();
  for (const { rows, w, x: cx, y: cy } of cells) {
    const lit = (gx, gy) => rows[gy]?.[gx] === '#';
    const near = (gx, gy) => [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => lit(gx + dx, gy + dy)));
    for (let gy = -outline; gy < glyphRows + outline; gy++) {
      for (let gx = -outline; gx < w + outline; gx++) {
        let color = null;
        if (lit(gx, gy)) color = '#ffffff';
        else if (outline && near(gx, gy)) color = '#000000';
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(cx + gx + outline, cy + gy + outline, 1, 1);
      }
    }
  }
  texture.refresh();
  texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

  const chars = {};
  for (const { ch, w, x: cx, y: cy } of cells) {
    const cw = w + outline * 2;
    chars[ch.charCodeAt(0)] = {
      x: cx,
      y: cy,
      width: cw,
      height: cellH,
      centerX: Math.floor(cw / 2),
      centerY: Math.floor(cellH / 2),
      xOffset: 0,
      yOffset: 0,
      xAdvance: cw,
      data: {},
      kerning: {},
      u0: cx / SHEET_W,
      v0: cy / sheetH,
      u1: (cx + cw) / SHEET_W,
      v1: (cy + cellH) / sheetH,
    };
  }
  // size 1 makes a BitmapText's font size its pixel scale.
  const data = { retroFont: false, font: key, size: 1, lineHeight: cellH + 1, chars };
  game.cache.bitmapFont.add(key, { data, texture: key, frame: null });
}

// BitmapText with the fonts' character fallbacks and a setColor, so it can stand in for
// Phaser's Text.
export class PixelText extends Phaser.GameObjects.BitmapText {
  setText(value) {
    this.source = value;
    return super.setText(this.wrap(sanitize(value, (FONT_BY_KEY[this.font] ?? FONTS.normal).glyphs)));
  }

  setColor(color) {
    return this.setTint(toColor(color));
  }

  // The vertical origin spans the capitals (first line's top to last line's baseline) rather
  // than the whole cell, so centered capitals sit in the middle of whatever they label.
  getTextBounds(round) {
    const bounds = this._bounds;
    const stale = this._dirty || round || this.scaleX !== bounds.scaleX || this.scaleY !== bounds.scaleY;
    super.getTextBounds(round);
    if (stale) {
      const descent = (FONT_BY_KEY[this.font] ?? FONTS.normal).descent * this.fontSize;
      this._displayOriginY = this.originY * (bounds.local.height - descent);
      bounds.global.y = this.y - this._displayOriginY * this.scaleY;
    }
    return bounds;
  }

  // Phaser's own wrapping (setMaxWidth) leaves letter spacing out of its measurements.
  setWrapWidth(width) {
    this.wrapWidth = width;
    return this.setText(this.source);
  }

  measure(line) {
    let advance = 0;
    for (const ch of line) advance += this.fontData.chars[ch.charCodeAt(0)]?.xAdvance ?? 0;
    return (advance + this.letterSpacing * Math.max(0, line.length - 1)) * this.fontSize;
  }

  wrap(str) {
    if (!this.wrapWidth) return str;
    const wrapLine = (line) => {
      const lines = [];
      let current = '';
      for (const word of line.split(' ')) {
        const next = current ? `${current} ${word}` : word;
        if (current && this.measure(next) > this.wrapWidth) {
          lines.push(current);
          current = word;
        } else current = next;
      }
      return [...lines, current].join('\n');
    };
    return str.split('\n').map(wrapLine).join('\n');
  }
}

// Adds pixel text to `scene`. `scale` is the size of one font pixel in screen pixels
// (capitals are 7 font pixels tall, 5 in the small font); keep it a whole number so the
// pixels stay square. `color` is '#rrggbb' or 0xrrggbb, `align` lines up multi-line
// text, `wrap` is a max width in screen pixels, and `font` is a FONTS name. `spacing` is
// 'tight' or 'wide' (see LETTER_GAP); big text is wide unless told otherwise.
export function addText(
  scene,
  x,
  y,
  str,
  { scale = 2, color = 0xffffff, align = 'left', wrap = 0, font = 'normal', spacing = scale >= WIDE_FROM_SCALE ? 'wide' : 'tight' } = {},
) {
  const f = FONTS[font];
  const key = fontKey(f, spacing);
  if (!scene.sys.cache.bitmapFont.exists(key)) buildFont(scene.sys.game, key, f, spacing);
  const text = new PixelText(scene, x, y, key, '', scale, { left: 0, center: 1, right: 2 }[align]);
  text.setLetterSpacing(spacing === 'wide' ? LETTER_GAP / scale : 1 - f.outline * 2).setText(str).setColor(color);
  if (wrap) text.setWrapWidth(wrap);
  return scene.add.existing(text);
}
