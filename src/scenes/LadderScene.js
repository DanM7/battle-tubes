import Phaser from 'phaser';
import { WIDTH, HEIGHT, OPPONENTS, BOSS, SUB_BOSS, DIFFICULTIES } from '../config.js';
import { isChampion, rivalProfile } from '../campaign.js';

const FONT = 'Arial Black, Arial, sans-serif';
const RUNG_W = 440;
const RUNG_H = 46;
const RUNG_STEP = 54;
const BOTTOM_RUNG_Y = 424;
const FIGURE_MAX_PX = 38;
const TALLEST_IN = Math.max(...Object.values(OPPONENTS).map((p) => p.heightIn));
const SKIN = 0xf1c27d;

const textStyle = (size, color = '#ffffff') => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  color,
  stroke: '#000000',
  strokeThickness: Math.max(3, Math.round(size / 6)),
});

// Between-match screen: every rival by name and height, defeated ones in green,
// the next one highlighted, and the boss always waiting at the top. Figures share
// one scale across both modes' rosters.
export class LadderScene extends Phaser.Scene {
  constructor() {
    super('Ladder');
  }

  init(data) {
    this.campaign = data.campaign;
  }

  create() {
    const { campaign } = this;
    const champion = isChampion(campaign);

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x5fb8f5, 0x5fb8f5, 0x1d5f99, 0x1d5f99, 1);
    bg.fillRect(0, 0, WIDTH, HEIGHT);

    this.add.text(WIDTH / 2, 34, champion ? 'CHAMPION OF THE RIVER' : 'BATTLE TUBES', textStyle(36, '#ffdd55')).setOrigin(0.5);
    const { year, label } = DIFFICULTIES[campaign.difficulty];
    this.add.text(WIDTH - 16, 16, `${year} (${label})`, textStyle(16, '#ffdd55')).setOrigin(1, 0);
    this.add.text(WIDTH / 2, 76, this.headline(champion), textStyle(18)).setOrigin(0.5);

    this.drawLadder(champion);

    if (!champion) {
      const next = campaign.order[campaign.rung];
      this.add.text(WIDTH / 2, 470, OPPONENTS[next].blurb, textStyle(16, '#e8f6ff')).setOrigin(0.5);
    }
    const prompt = champion ? 'Tap or press Enter for the menu' : 'Tap or press Enter to ride  -  Esc for menu';
    const promptText = this.add.text(WIDTH / 2, 510, prompt, textStyle(18)).setOrigin(0.5);
    this.tweens.add({ targets: promptText, alpha: 0.4, yoyo: true, repeat: -1, duration: 600 });

    const proceed = () => {
      if (champion) this.scene.start('Menu');
      else this.scene.start('Game', { mode: '1p', campaign });
    };
    this.time.delayedCall(400, () => {
      this.input.once('pointerdown', proceed);
      this.input.keyboard.once('keydown-ENTER', proceed);
      this.input.keyboard.once('keydown-SPACE', proceed);
    });
    this.input.keyboard.once('keydown-ESC', () => this.scene.start('Menu'));
  }

  headline(champion) {
    const { lastResult, lastOpponent } = this.campaign;
    const nameOf = (key) => rivalProfile(this.campaign, key).name;
    if (champion) return `${nameOf(BOSS)} is all wet. Nobody rules the river like you!`;
    if (lastResult === 'won') return `You sent ${nameOf(lastOpponent)} swimming!`;
    if (lastResult === 'lost') return `${nameOf(lastOpponent)} knocked you in. Climb back on and try again!`;
    return `Knock all ${this.campaign.order.length} riders off their tubes to reach the top.`;
  }

  drawLadder(champion) {
    const { order, rung } = this.campaign;
    const g = this.add.graphics();
    const left = WIDTH / 2 - RUNG_W / 2;
    const topY = BOTTOM_RUNG_Y - (order.length - 1) * RUNG_STEP;

    g.fillStyle(0x7a4a21, 1);
    g.fillRect(left - 18, topY - RUNG_H / 2 - 14, 12, (order.length - 1) * RUNG_STEP + RUNG_H + 28);
    g.fillRect(left + RUNG_W + 6, topY - RUNG_H / 2 - 14, 12, (order.length - 1) * RUNG_STEP + RUNG_H + 28);

    order.forEach((name, i) => {
      const y = BOTTOM_RUNG_Y - i * RUNG_STEP;
      const defeated = i < rung;
      const next = i === rung && !champion;

      const fill = defeated ? 0x2f7d32 : next ? 0xd9a400 : 0x1d4e89;
      g.fillStyle(fill, 1);
      g.fillRoundedRect(left, y - RUNG_H / 2, RUNG_W, RUNG_H, 8);
      g.lineStyle(next ? 4 : 2, 0xffffff, next ? 1 : 0.7);
      g.strokeRoundedRect(left, y - RUNG_H / 2, RUNG_W, RUNG_H, 8);

      const profile = rivalProfile(this.campaign, name);
      this.drawFigure(g, left + 26, y + RUNG_H / 2 - 4, profile);

      const height = formatHeight(profile.heightIn);
      const nameText = this.add.text(left + 52, y, profile.name.toUpperCase(), textStyle(22)).setOrigin(0, 0.5);
      this.add.text(nameText.x + nameText.width + 12, y + 2, height, textStyle(15, '#e8f6ff')).setOrigin(0, 0.5);

      const role = { [BOSS]: 'FINAL BOSS', [SUB_BOSS]: 'SUB-BOSS' }[name];
      const tag = defeated ? 'DEFEATED' : next ? (role ? `NEXT UP: ${role}` : 'NEXT UP') : role ?? `RUNG ${i + 1}`;
      this.add.text(left + RUNG_W - 14, y, tag, textStyle(14, defeated ? '#c8ffc8' : '#ffffff')).setOrigin(1, 0.5);
    });
  }

  // A little standing figure in the rider's color, scaled to their height.
  drawFigure(g, centerX, footY, persona) {
    const total = FIGURE_MAX_PX * (persona.heightIn / TALLEST_IN);
    const head = total * 0.28;
    const bodyH = total - head;
    const bodyW = total * 0.38;
    g.fillStyle(persona.color, 1);
    g.fillRect(centerX - bodyW / 2, footY - bodyH, bodyW, bodyH);
    g.fillStyle(SKIN, 1);
    g.fillRect(centerX - head / 2, footY - total, head, head);
    g.lineStyle(1, 0xffffff, 0.8);
    g.strokeRect(centerX - bodyW / 2, footY - bodyH, bodyW, bodyH);
  }
}

function formatHeight(inches) {
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}
