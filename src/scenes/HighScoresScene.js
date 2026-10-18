import Phaser from 'phaser';
import { WIDTH, HEIGHT, DIFFICULTIES, LADDER_ORDER } from '../config.js';
import { highScores, formatScore } from '../score.js';
import { addCloseButton, addMenuButton } from './ui.js';
import { addText } from '../pixelFont.js';
import { ensureMenuMusic } from '../audio.js';
import { enterScene, leaveTo } from '../navigate.js';

const COLUMN_W = 380;
const HEADER_Y = 112;
const FIRST_ROW_Y = 160;
const ROW_STEP = 56;
// Same footprint as the main menu buttons; small type so the long label fits inside.
const SCORING_BUTTON = { y: 490, w: 320, h: 52, textScale: 2, font: 'small' };

// Each mode's best 1 Player runs (score.js), side by side, and a way to the scoring rules.
export class HighScoresScene extends Phaser.Scene {
  constructor() {
    super('HighScores');
  }

  create() {
    enterScene(this);
    ensureMenuMusic();
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x5fb8f5, 0x5fb8f5, 0x1d5f99, 0x1d5f99, 1);
    bg.fillRect(0, 0, WIDTH, HEIGHT);
    addText(this, WIDTH / 2, 40, 'HIGH SCORES', { scale: 5, color: '#ffdd55' }).setOrigin(0.5);
    addCloseButton(this);

    const modes = Object.keys(DIFFICULTIES);
    modes.forEach((difficulty, i) => this.drawTable(difficulty, (WIDTH * (i * 2 + 1)) / (modes.length * 2)));

    const { y, ...size } = SCORING_BUTTON;
    const showScoring = () => leaveTo(this, 'Scoring');
    addMenuButton(this, WIDTH / 2, y, 'HOW SCORING WORKS', showScoring, size);
    this.input.keyboard.once('keydown-ENTER', showScoring);
  }

  drawTable(difficulty, centerX) {
    const { year, label } = DIFFICULTIES[difficulty];
    const left = centerX - COLUMN_W / 2;
    const right = centerX + COLUMN_W / 2;
    addText(this, centerX, HEADER_Y, `${year} (${label})`, { scale: 3, color: '#ffdd55' }).setOrigin(0.5);

    const scores = highScores(difficulty);
    if (scores.length === 0) {
      addText(this, centerX, FIRST_ROW_Y, 'No scores yet', { scale: 2, color: '#e8f6ff' }).setOrigin(0.5);
      return;
    }
    scores.forEach((entry, i) => {
      const y = FIRST_ROW_Y + i * ROW_STEP;
      addText(this, left, y, `${i + 1}.`, { scale: 3, color: '#ffdd55' }).setOrigin(0, 0.5);
      addText(this, left + 44, y - 7, entry.name.toUpperCase(), { scale: 2 }).setOrigin(0, 0.5);
      const reached = entry.champion ? 'CHAMPION' : `BEAT ${entry.beaten} OF ${LADDER_ORDER.length}`;
      addText(this, left + 44, y + 11, reached, { scale: 2, font: 'small', color: entry.champion ? '#7dff7d' : '#bfe9ff' }).setOrigin(0, 0.5);
      addText(this, right, y, formatScore(entry.score), { scale: 3 }).setOrigin(1, 0.5);
    });
  }
}
