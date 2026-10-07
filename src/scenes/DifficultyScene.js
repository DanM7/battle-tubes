import Phaser from 'phaser';
import { WIDTH, HEIGHT, DIFFICULTIES } from '../config.js';
import { newCampaign } from '../campaign.js';
import { addCloseButton } from './ui.js';

const FONT = 'Arial Black, Arial, sans-serif';
const SQUARE = 300;
const GAP = 60;
const CENTER_Y = 305;
const COLORS = { easy: [0x2f7d32, 0x3e9e42], hard: [0xa8322a, 0xc9443a] };

// 1-player mode select: two big squares, one per difficulty.
export class DifficultyScene extends Phaser.Scene {
  constructor() {
    super('Difficulty');
  }

  create() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x5fb8f5, 0x5fb8f5, 0x1d5f99, 0x1d5f99, 1);
    bg.fillRect(0, 0, WIDTH, HEIGHT);

    this.add
      .text(WIDTH / 2, 70, 'SELECT MODE', { fontFamily: FONT, fontSize: '40px', color: '#ffdd55', stroke: '#000000', strokeThickness: 7 })
      .setOrigin(0.5);

    const keys = Object.keys(DIFFICULTIES);
    keys.forEach((key, i) => {
      const x = WIDTH / 2 + (i - (keys.length - 1) / 2) * (SQUARE + GAP);
      this.makeSquare(x, CENTER_Y, key);
    });

    addCloseButton(this);
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
    const text = (dy, str, size, color = '#ffffff') =>
      this.add
        .text(x, y + dy, str, { fontFamily: FONT, fontSize: `${size}px`, color, align: 'center', stroke: '#000000', strokeThickness: Math.max(3, size / 8) })
        .setOrigin(0.5);
    text(-60, year, 84, '#ffdd55');
    text(20, `(${label})`, 32);
    this.add
      .text(x, y + 95, blurb, { fontFamily: 'Arial, sans-serif', fontSize: '17px', color: '#ffffff', align: 'center', stroke: '#000000', strokeThickness: 3 })
      .setOrigin(0.5);

    square.on('pointerover', () => square.setFillStyle(hover));
    square.on('pointerout', () => square.setFillStyle(fill));
    square.on('pointerup', () => this.choose(key));
  }

  choose(difficulty) {
    this.scene.start('Ladder', { campaign: newCampaign(difficulty) });
  }
}
