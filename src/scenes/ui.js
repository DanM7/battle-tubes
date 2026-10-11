import { addText } from '../pixelFont.js';

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
