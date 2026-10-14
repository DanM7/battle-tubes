import Phaser from 'phaser';
import { WIDTH, HEIGHT, BOSS, SUB_BOSS, DIFFICULTIES, SKIN } from '../config.js';
import { CHARACTERS } from '../characters.js';
import { isChampion, rivalProfile, character, displayName, isUnlocked } from '../campaign.js';
import { hasPasswordUnlock } from '../progress.js';
import { addBackButton } from './ui.js';
import { addText } from '../pixelFont.js';

const TITLE_X = 440; // centered between the back button and the year
const RUNG_W = 440;
const RUNG_H = 46;
const RUNG_STEP = 52;
const BOTTOM_RUNG_Y = 416;
const FIGURE_MAX_PX = 38;
const TALLEST_IN = Math.max(...CHARACTERS.flatMap((c) => Object.values(c.stats).map((s) => s.heightIn)));

// Between-match screen: every rival by name, defeated ones in green,
// the next one highlighted, and the boss always waiting at the top. Figures share
// one scale across both modes' rosters.
export class LadderScene extends Phaser.Scene {
  constructor() {
    super('Ladder');
  }

  init(data) {
    this.campaign = data.campaign;
    this.unlocked = data.unlocked ?? null; // OPPONENTS key just beaten for the first time
  }

  create() {
    const { campaign } = this;
    const champion = isChampion(campaign);

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x5fb8f5, 0x5fb8f5, 0x1d5f99, 0x1d5f99, 1);
    bg.fillRect(0, 0, WIDTH, HEIGHT);

    addText(this, TITLE_X, 34, champion ? 'CHAMPION OF THE RIVER' : 'BATTLE TUBES', { scale: champion ? 3 : 4, color: '#ffdd55' }).setOrigin(0.5);
    const { year, label } = DIFFICULTIES[campaign.difficulty];
    addText(this, WIDTH - 16, 16, `${year} (${label})`, { scale: 2, color: '#ffdd55' }).setOrigin(1, 0);
    addText(this, WIDTH / 2, 76, this.headline(champion), { scale: 2 }).setOrigin(0.5);
    const newRiders = CHARACTERS.filter(
      (c) =>
        c.unlock?.beat &&
        character(c.unlock.beat).nickname === this.unlocked &&
        !hasPasswordUnlock(c.id) &&
        isUnlocked(campaign.difficulty, c),
    );
    if (newRiders.length > 0) {
      const names = newRiders.map((c) => displayName(c, campaign.difficulty).toUpperCase()).join(' & ');
      const unlockText = addText(this, WIDTH / 2, 104, `NEW RIDER UNLOCKED: ${names}`, { scale: 2, color: '#7dff7d' }).setOrigin(0.5);
      this.tweens.add({ targets: unlockText, scale: 1.08, yoyo: true, repeat: -1, duration: 500 });
    }

    this.drawLadder(champion);

    if (!champion) {
      const next = rivalProfile(campaign, campaign.order[campaign.rung]);
      addText(this, WIDTH / 2, 468, next.style, { scale: 2, color: '#e8f6ff', align: 'center', wrap: WIDTH - 80 }).setOrigin(0.5);
    }
    const prompt = champion ? 'Tap or press Enter for the menu' : 'Tap or press Enter to ride  -  Esc to change rider';
    const promptText = addText(this, WIDTH / 2, 512, prompt, { scale: 2 }).setOrigin(0.5);
    this.tweens.add({ targets: promptText, alpha: 0.4, yoyo: true, repeat: -1, duration: 600 });

    // Back to rider select. An unfinished ladder goes along, so picking a rider there
    // carries on from the same rung.
    addBackButton(this, 'PlayerSelect', { difficulty: campaign.difficulty, campaign: champion ? null : campaign });
    const proceed = () => {
      if (champion) this.scene.start('Menu');
      else this.scene.start('Game', { mode: '1p', campaign });
    };
    this.time.delayedCall(400, () => {
      this.input.on('pointerdown', (pointer, over) => {
        if (over.length === 0) proceed();
      });
      this.input.keyboard.once('keydown-ENTER', proceed);
      this.input.keyboard.once('keydown-SPACE', proceed);
    });
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

      addText(this, left + 52, y, profile.name.toUpperCase(), { scale: 3 }).setOrigin(0, 0.5);

      const role = { [BOSS]: 'FINAL BOSS', [SUB_BOSS]: 'SUB-BOSS' }[name];
      const tag = defeated ? 'DEFEATED' : next ? (role ? `NEXT UP: ${role}` : 'NEXT UP') : role ?? `RUNG ${i + 1}`;
      addText(this, left + RUNG_W - 14, y, tag, { scale: 2, color: defeated ? '#c8ffc8' : '#ffffff' }).setOrigin(1, 0.5);
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
    g.fillStyle(persona.skin ?? SKIN, 1);
    g.fillRect(centerX - head / 2, footY - total, head, head);
    g.lineStyle(1, 0xffffff, 0.8);
    g.strokeRect(centerX - bodyW / 2, footY - bodyH, bodyW, bodyH);
  }
}
