import Phaser from 'phaser';
import { WIDTH, DIFFICULTIES } from '../config.js';
import { hasUnlockedHard } from '../progress.js';
import { addBackButton, preloadBackground, addBackground, BUTTON_ALPHA, BUTTON_HOVER_ALPHA } from './ui.js';
import { addText } from '../pixelFont.js';
import { ensureMenuMusic, unlockAudio } from '../audio.js';
import { enterScene, leaveTo } from '../navigate.js';

const SQUARE = 360;
const GAP = 40;
const CENTER_Y = 305;
const COLORS = {
  easy: [0x2f7d32, 0x3e9e42],
  hard: [0xa8322a, 0xc9443a],
  locked: [0x5a5e66, 0x6a6e76],
};
const HARD_LOCK = 'Beat your first rider on EASY to unlock';

// 1-player mode select: two big squares, one per difficulty. Comes before rider
// select, since each mode has its own riders. Hard stays locked until the first
// Easy ladder win (or the BRAP password).
export class DifficultyScene extends Phaser.Scene {
  constructor() {
    super('Difficulty');
  }

  preload() {
    preloadBackground(this);
  }

  create() {
    enterScene(this);
    unlockAudio();
    ensureMenuMusic();
    addBackground(this);

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
    const locked = key === 'hard' && !hasUnlockedHard();
    const [fill, hover] = locked ? COLORS.locked : COLORS[key];
    const square = this.add
      .rectangle(x, y, SQUARE, SQUARE, fill, BUTTON_ALPHA)
      .setStrokeStyle(5, 0xffffff);
    if (!locked) square.setInteractive({ useHandCursor: true });
    const text = (dy, str, scale, color = '#ffffff') =>
      addText(this, x, y + dy, str, { scale, color, align: 'center', wrap: SQUARE - 20 }).setOrigin(0.5);
    text(-80, year, 8, locked ? '#c0c6d0' : '#ffdd55');
    text(0, label, 4, locked ? '#c0c6d0' : '#ffffff');
    if (locked) {
      drawLock(this.add.graphics(), x, y + 48, 56);
      text(118, HARD_LOCK, 2, '#ffdd55');
    } else {
      text(92, blurb, 2);
      square.on('pointerover', () => square.setFillStyle(hover, BUTTON_HOVER_ALPHA));
      square.on('pointerout', () => square.setFillStyle(fill, BUTTON_ALPHA));
      // Unlock on press (mobile gesture); choose() ignores a second tap while leaving.
      square.on('pointerdown', () => unlockAudio());
      square.on('pointerup', () => this.choose(key));
    }
  }

  choose(difficulty) {
    if (difficulty === 'hard' && !hasUnlockedHard()) return;
    unlockAudio();
    ensureMenuMusic();
    leaveTo(this, 'PlayerSelect', { difficulty });
  }
}

// A padlock centered on (x, y), `size` pixels tall (same shape as the rider select's).
function drawLock(g, x, y, size) {
  const k = size / 100;
  g.lineStyle(13 * k, 0xc0c6d0, 1);
  g.beginPath();
  g.arc(x, y - 12 * k, 26 * k, Math.PI, 0);
  g.strokePath();
  g.lineBetween(x - 26 * k, y - 12 * k, x - 26 * k, y + 4 * k);
  g.lineBetween(x + 26 * k, y - 12 * k, x + 26 * k, y + 4 * k);
  g.fillStyle(0xb8bec8, 1);
  g.fillRoundedRect(x - 42 * k, y, 84 * k, 62 * k, 10 * k);
  g.fillStyle(0x3a3f48, 1);
  g.fillCircle(x, y + 26 * k, 9 * k);
  g.fillRect(x - 4 * k, y + 26 * k, 8 * k, 20 * k);
}
