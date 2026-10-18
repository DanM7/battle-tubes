import { WIDTH, HEIGHT } from '../config.js';
import { TUBE_COLORS } from '../tubeArt.js';
import { addText } from '../pixelFont.js';
import { toHex, fromHex } from '../riderColors.js';
import { unlockAudio, ensureMenuMusic } from '../audio.js';
import { leaveTo } from '../navigate.js';

const TITLE_BANDS = 8; // stepped blue→green bands (pixel-art gradient, not smooth)

const lerpByte = (a, b, t) => Math.round(a + (b - a) * t);
const lerpColor = (a, b, t) =>
  (lerpByte((a >> 16) & 255, (b >> 16) & 255, t) << 16) |
  (lerpByte((a >> 8) & 255, (b >> 8) & 255, t) << 8) |
  lerpByte(a & 255, b & 255, t);

// Menu title in a stepped blue→green fill using the tube vinyl colors (TUBE_COLORS).
// Drawn as masked horizontal bands so the letters stay crisp pixel art.
export function addTubeGradientTitle(scene, x, y, str, { scale = 8 } = {}) {
  const from = TUBE_COLORS.blue.base;
  const to = TUBE_COLORS.green.base;
  const probe = addText(scene, x, y, str, { scale, color: 0xffffff }).setOrigin(0.5);
  const bounds = probe.getTextBounds(true).global;
  const left = bounds.x;
  const top = bounds.y;
  const w = Math.ceil(bounds.width);
  const h = Math.max(1, Math.ceil(bounds.height));
  probe.destroy();

  const slices = [];
  for (let i = 0; i < TITLE_BANDS; i++) {
    const t = TITLE_BANDS <= 1 ? 0 : i / (TITLE_BANDS - 1);
    const slice = addText(scene, x, y, str, { scale, color: lerpColor(from, to, t) }).setOrigin(0.5);
    const g = scene.make.graphics({ add: false });
    const y0 = top + Math.floor((h * i) / TITLE_BANDS);
    const y1 = top + Math.floor((h * (i + 1)) / TITLE_BANDS);
    g.fillStyle(0xffffff);
    g.fillRect(left - 2, y0, w + 4, Math.max(1, y1 - y0));
    slice.setMask(g.createGeometryMask());
    slices.push(slice);
  }
  return slices;
}

const BACKGROUND = { key: 'menu-background', url: 'assets/backgrounds/q-house.jpg' };

// Fill opacity for big buttons over the background: it shows through, and hovering
// firms the button up.
export const BUTTON_ALPHA = 0.6;
export const BUTTON_HOVER_ALPHA = 0.85;

// Menu screens lay their big buttons out in this grid, one column each side of the house
// in the background, filling the left column's top row first, then across, then down.
const MENU_BUTTON = { w: 300, h: 58, textScale: 3 };
const MENU_COLUMNS = [185, WIDTH - 185];
const MENU_ROW_Y = 300;
const MENU_ROW_STEP = 72;
export const menuGridCell = (i, { rowY = MENU_ROW_Y, rowStep = MENU_ROW_STEP } = {}) => ({
  x: MENU_COLUMNS[i % MENU_COLUMNS.length],
  y: rowY + Math.floor(i / MENU_COLUMNS.length) * rowStep,
});

// A big see-through menu button. `dimmed` is for ones that aren't available yet.
export function addMenuButton(scene, x, y, label, onClick, { dimmed = false, font, ...size } = {}) {
  const { w, h, textScale } = { ...MENU_BUTTON, ...size };
  const [fill, hover] = dimmed ? [0x3d5470, 0x4a6585] : [0x1d4e89, 0x2a6bb8];
  const rect = scene.add
    .rectangle(x, y, w, h, fill, BUTTON_ALPHA)
    .setStrokeStyle(3, 0xffffff, dimmed ? 0.5 : 1)
    .setInteractive({ useHandCursor: true });
  addText(scene, x, y, label, { scale: textScale, color: dimmed ? '#aab8c8' : '#ffffff', ...(font ? { font } : {}) }).setOrigin(0.5);
  rect.on('pointerover', () => rect.setFillStyle(hover, BUTTON_HOVER_ALPHA));
  rect.on('pointerout', () => rect.setFillStyle(fill, BUTTON_ALPHA));
  // Unlock audio on press (gesture); ignore a second tap while this scene is leaving.
  rect.on('pointerdown', () => unlockAudio());
  rect.on('pointerup', () => {
    if (dimmed || scene.leaving) return;
    unlockAudio();
    onClick();
  });
  return rect;
}

// The lake house picture behind the menu screens. Call from the scene's preload().
export function preloadBackground(scene) {
  if (!scene.textures.exists(BACKGROUND.key)) scene.load.image(BACKGROUND.key, BACKGROUND.url);
}

// Fills the screen with it, cropping whichever edges overhang.
export function addBackground(scene) {
  const bg = scene.add.image(WIDTH / 2, HEIGHT / 2, BACKGROUND.key);
  return bg.setScale(Math.max(WIDTH / bg.width, HEIGHT / bg.height));
}

// The X button in the top-left corner that goes back to the main menu (Esc does too).
export function addCloseButton(scene) {
  const size = 48;
  const x = 16 + size / 2;
  const y = 16 + size / 2;
  const button = scene.add
    .rectangle(x, y, size, size, 0x1d4e89)
    .setStrokeStyle(3, 0xffffff)
    .setInteractive({ useHandCursor: true });
  addText(scene, x, y, 'X', { scale: 3 }).setOrigin(0.5);
  button.on('pointerover', () => button.setFillStyle(0x2a6bb8));
  button.on('pointerout', () => button.setFillStyle(0x1d4e89));
  const go = () => {
    unlockAudio();
    ensureMenuMusic();
    leaveTo(scene, 'Menu');
  };
  button.on('pointerdown', () => unlockAudio());
  button.on('pointerup', go);
  scene.input.keyboard.once('keydown-ESC', go);
}

// A CUSTOM button, w by h centered on (x, y), that opens the browser's color picker: an
// invisible real color input lies over it, so phones get theirs too. The chip on the
// button follows the picker; `pick(color)` (0xRRGGBB) is called when it closes, and
// `open()` when it opens. Returns the objects it's made of, and `show(color, chosen)` to
// show the color the rider has, outlined when it's not one of the swatches.
export function addColorPicker(scene, x, y, w, h, { pick, open = () => {} }) {
  const rect = scene.add.rectangle(x, y, w, h, 0x1d4e89).setStrokeStyle(2, 0xffffff);
  const chipSize = h - 12;
  const chip = scene.add.rectangle(x - w / 2 + 6 + chipSize / 2, y, chipSize, chipSize, 0xffffff).setStrokeStyle(1, 0x0d2a4a);
  const label = addText(scene, x + chipSize / 2, y, 'CUSTOM', { scale: 2 }).setOrigin(0.5);

  // Phaser sets the opacity of the element it places, so the input goes inside another.
  const wrapper = document.createElement('div');
  const node = document.createElement('input');
  node.type = 'color';
  Object.assign(node.style, { display: 'block', width: `${w}px`, height: `${h}px`, opacity: '0', cursor: 'pointer', border: 'none', padding: '0', margin: '0' });
  wrapper.append(node);
  node.addEventListener('click', open);
  node.addEventListener('input', () => chip.setFillStyle(fromHex(node.value)));
  node.addEventListener('change', () => {
    node.blur(); // or Enter would open it again, as well as doing what Enter does
    pick(fromHex(node.value));
  });
  node.addEventListener('mouseenter', () => rect.setFillStyle(0x2a6bb8));
  node.addEventListener('mouseleave', () => rect.setFillStyle(0x1d4e89));
  const dom = scene.add.dom(x, y, wrapper);

  return {
    objects: [rect, chip, label, dom],
    show(color, chosen) {
      node.value = toHex(color);
      chip.setFillStyle(color);
      rect.setStrokeStyle(chosen ? 3 : 2, chosen ? 0xffdd55 : 0xffffff);
    },
  };
}

// A "◀ BACK" button in the top-left corner that starts scene `to` with `data` (Esc does too).
export function addBackButton(scene, to = 'Menu', data = undefined) {
  const back = () => {
    unlockAudio();
    if (to === 'Menu' || to === 'Labs') ensureMenuMusic();
    leaveTo(scene, to, data);
  };
  const w = 120;
  const h = 44;
  const x = 16 + w / 2;
  const y = 16 + h / 2;
  const button = scene.add
    .rectangle(x, y, w, h, 0x1d4e89)
    .setStrokeStyle(3, 0xffffff)
    .setInteractive({ useHandCursor: true });
  addText(scene, x, y, '◀ BACK', { scale: 2 }).setOrigin(0.5);
  button.on('pointerover', () => button.setFillStyle(0x2a6bb8));
  button.on('pointerout', () => button.setFillStyle(0x1d4e89));
  button.on('pointerdown', () => unlockAudio());
  button.on('pointerup', back);
  scene.input.keyboard.once('keydown-ESC', back);
}
