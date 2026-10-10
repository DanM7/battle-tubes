import Phaser from 'phaser';
import { WIDTH, HEIGHT } from '../config.js';

const FONT = 'Arial Black, Arial, sans-serif';

let menuSkipped = false;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    // ?mode=1p (first ladder match) or ?mode=2p skips the menu (handy while developing).
    const skipTo = new URLSearchParams(location.search).get('mode');
    if (!menuSkipped && (skipTo === '1p' || skipTo === '2p')) {
      menuSkipped = true;
      this.scene.start('Game', { mode: skipTo });
      return;
    }

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x5fb8f5, 0x5fb8f5, 0x1d5f99, 0x1d5f99, 1);
    bg.fillRect(0, 0, WIDTH, HEIGHT);

    this.add
      .text(WIDTH / 2, 110, 'BATTLE TUBES', {
        fontFamily: FONT,
        fontSize: '72px',
        color: '#ffdd55',
        stroke: '#000000',
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    this.add
      .text(WIDTH / 2, 175, 'Hang on. Fight dirty. Wake warfare starts here!', {
        fontFamily: FONT,
        fontSize: '18px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.makeButton(WIDTH / 2, 240, '1 PLAYER', () => this.startOnePlayer());
    this.makeButton(WIDTH / 2, 305, '2 PLAYERS', () => this.comingSoon(), { dimmed: true });
    this.makeButton(WIDTH / 2, 370, 'CONTROLS', () => this.scene.start('Controls'));
    this.makeButton(WIDTH / 2, 435, 'PASSWORD', () => this.scene.start('Password'));

    this.input.keyboard.once('keydown-ONE', () => this.startOnePlayer());
    this.input.keyboard.on('keydown-TWO', () => this.comingSoon());
  }

  makeButton(x, y, label, onClick, { dimmed = false } = {}) {
    const [fill, hover] = dimmed ? [0x3d5470, 0x4a6585] : [0x1d4e89, 0x2a6bb8];
    const rect = this.add
      .rectangle(x, y, 380, 58, fill)
      .setStrokeStyle(3, 0xffffff, dimmed ? 0.5 : 1)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { fontFamily: FONT, fontSize: '24px', color: dimmed ? '#aab8c8' : '#ffffff' }).setOrigin(0.5);
    rect.on('pointerover', () => rect.setFillStyle(hover));
    rect.on('pointerout', () => rect.setFillStyle(fill));
    rect.on('pointerup', onClick);
  }

  startOnePlayer() {
    if (this.sys.game.device.input.touch && !this.scale.isFullscreen) {
      this.scale.startFullscreen();
      screen.orientation?.lock?.('landscape').catch(() => {});
    }
    this.scene.start('Difficulty');
  }

  comingSoon() {
    this.toast?.destroy();
    const toast = this.add
      .text(WIDTH / 2, 500, '2 PLAYERS IS COMING SOON!', {
        fontFamily: FONT,
        fontSize: '24px',
        color: '#ffdd55',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    this.toast = toast;
    this.tweens.add({ targets: toast, alpha: 0, delay: 1400, duration: 500, onComplete: () => toast.destroy() });
  }
}
