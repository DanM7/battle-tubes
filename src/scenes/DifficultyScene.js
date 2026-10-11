import Phaser from 'phaser';
import { WIDTH, HEIGHT, DIFFICULTIES } from '../config.js';
import { addBackButton } from './ui.js';
import { addText } from '../pixelFont.js';

const SQUARE = 360;
const GAP = 40;
const CENTER_Y = 305;
const COLORS = { easy: [0x2f7d32, 0x3e9e42], hard: [0xa8322a, 0xc9443a] };

// 1-player mode select: two big squares, one per difficulty. Comes before rider
// select, since each mode has its own riders.
export class DifficultyScene extends Phaser.Scene {
  constructor() {
    super('Difficulty');
  }

  create() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x5fb8f5, 0x5fb8f5, 0x1d5f99, 0x1d5f99, 1);
    bg.fillRect(0, 0, WIDTH, HEIGHT);

    addText(this, WIDTH / 2, 70, 'SELECT MODE', { scale: 5, color: '#ffdd55' }).setOrigin(0.5);

    const keys = Object.keys(DIFFICULTIES);
    keys.forEach((key, i) => {
      const x = WIDTH / 2 + (i - (keys.length - 1) / 2) * (SQUARE + GAP);
      this.makeSquare(x, CENTER_Y, key);
    });

    addBackButton(this);
    this.input.keyboard.once('keydown-ONE', () => this.choose('easy'));
    this.input.keyboard.once('keydown-TWO', () => this.choose('hard'));
  }

  makeSquare(x, y, key) {
    const { year, label, blurb } = DIFFICULTIES[key];
    const [fill, hover] = COLORS[key];
    const square = this.add
      .rectangle(x, y, SQUARE, SQUARE, fill)
      .setStrokeStyle(5, 0xffffff)
      .setInteractive({ useHandCursor: true });
    const text = (dy, str, scale, color = '#ffffff') =>
      addText(this, x, y + dy, str, { scale, color, align: 'center', wrap: SQUARE - 20 }).setOrigin(0.5);
    text(-80, year, 8, '#ffdd55');
    text(0, `(${label})`, 4);
    text(92, blurb, 2);

    square.on('pointerover', () => square.setFillStyle(hover));
    square.on('pointerout', () => square.setFillStyle(fill));
    square.on('pointerup', () => this.choose(key));
  }

  choose(difficulty) {
    this.scene.start('PlayerSelect', { difficulty });
  }
}
