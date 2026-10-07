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
      .text(WIDTH / 2, 175, 'Hang on. Kick hard. Last one on their tube wins.', {
        fontFamily: FONT,
        fontSize: '18px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.makeButton(WIDTH / 2, 265, '1 PLAYER', () => this.startGame('1p'));
    this.makeButton(WIDTH / 2, 340, '2 PLAYERS', () => this.startGame('2p'));
    this.makeButton(WIDTH / 2, 415, 'CONTROLS', () => this.scene.start('Controls'));

    this.input.keyboard.once('keydown-ONE', () => this.startGame('1p'));
    this.input.keyboard.once('keydown-TWO', () => this.startGame('2p'));
  }

  makeButton(x, y, label, onClick) {
    const rect = this.add
      .rectangle(x, y, 380, 58, 0x1d4e89)
      .setStrokeStyle(3, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { fontFamily: FONT, fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);
    rect.on('pointerover', () => rect.setFillStyle(0x2a6bb8));
    rect.on('pointerout', () => rect.setFillStyle(0x1d4e89));
    rect.on('pointerup', onClick);
  }

  startGame(mode) {
    if (this.sys.game.device.input.touch && !this.scale.isFullscreen) {
      this.scale.startFullscreen();
      screen.orientation?.lock?.('landscape').catch(() => {});
    }
    if (mode === '1p') this.scene.start('Difficulty');
    else this.scene.start('Game', { mode });
  }
}
