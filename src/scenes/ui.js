import { WIDTH, HEIGHT } from '../config.js';
import { addText } from '../pixelFont.js';

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
export const menuGridCell = (i) => ({
  x: MENU_COLUMNS[i % MENU_COLUMNS.length],
  y: MENU_ROW_Y + Math.floor(i / MENU_COLUMNS.length) * MENU_ROW_STEP,
});

// A big see-through menu button. `dimmed` is for ones that aren't available yet.
export function addMenuButton(scene, x, y, label, onClick, { dimmed = false, ...size } = {}) {
  const { w, h, textScale } = { ...MENU_BUTTON, ...size };
  const [fill, hover] = dimmed ? [0x3d5470, 0x4a6585] : [0x1d4e89, 0x2a6bb8];
  const rect = scene.add
    .rectangle(x, y, w, h, fill, BUTTON_ALPHA)
    .setStrokeStyle(3, 0xffffff, dimmed ? 0.5 : 1)
    .setInteractive({ useHandCursor: true });
  addText(scene, x, y, label, { scale: textScale, color: dimmed ? '#aab8c8' : '#ffffff' }).setOrigin(0.5);
  rect.on('pointerover', () => rect.setFillStyle(hover, BUTTON_HOVER_ALPHA));
  rect.on('pointerout', () => rect.setFillStyle(fill, BUTTON_ALPHA));
  rect.on('pointerup', onClick);
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
  button.on('pointerup', () => scene.scene.start('Menu'));
  scene.input.keyboard.once('keydown-ESC', () => scene.scene.start('Menu'));
}

// A "◀ BACK" button in the top-left corner that starts scene `to` with `data` (Esc does too).
export function addBackButton(scene, to = 'Menu', data = undefined) {
  const back = () => scene.scene.start(to, data);
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
  button.on('pointerup', back);
  scene.input.keyboard.once('keydown-ESC', back);
}
