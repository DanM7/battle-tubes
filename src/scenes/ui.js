const FONT = 'Arial Black, Arial, sans-serif';

// The X button in the top-left corner that goes back to the main menu (Esc does too).
export function addCloseButton(scene) {
  const size = 48;
  const x = 16 + size / 2;
  const y = 16 + size / 2;
  const button = scene.add
    .rectangle(x, y, size, size, 0x1d4e89)
    .setStrokeStyle(3, 0xffffff)
    .setInteractive({ useHandCursor: true });
  scene.add.text(x, y, 'X', { fontFamily: FONT, fontSize: '26px', color: '#ffffff' }).setOrigin(0.5);
  button.on('pointerover', () => button.setFillStyle(0x2a6bb8));
  button.on('pointerout', () => button.setFillStyle(0x1d4e89));
  button.on('pointerup', () => scene.scene.start('Menu'));
  scene.input.keyboard.once('keydown-ESC', () => scene.scene.start('Menu'));
}
