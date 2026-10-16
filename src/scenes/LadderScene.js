import Phaser from 'phaser';
import { WIDTH, HEIGHT, BOSS, SUB_BOSS, DIFFICULTIES } from '../config.js';
import { CHARACTERS } from '../characters.js';
import { isChampion, rivalProfile, rivalArt, character, displayName, isUnlocked, opponentCharacter, spriteKey } from '../campaign.js';
import { hasPasswordUnlock } from '../progress.js';
import { formatScore, rungMultiplier } from '../score.js';
import { TubeRider, preloadRiderAnim, isRiderAnimLoaded, ATTACK_ANIM } from '../riderArt.js';
import { tubeTextures, TEXELS_PER_UNIT, TUBE_WIDTH } from '../tubeArt.js';
import { addBackButton, preloadBackground, addBackground, addMenuButton } from './ui.js';
import { addText } from '../pixelFont.js';
import { ensureMenuMusic } from '../audio.js';

const TITLE_X = 440; // centered between the back button and the year
// The ladder sits in the left half; the next opponent and their description fill the right.
const LADDER_X = WIDTH / 4;
const RUNG_W = 400;
const RUNG_H = 46;
const RUNG_STEP = 52;
const BOTTOM_RUNG_Y = 400;
const RIGHT_X = (WIDTH * 3) / 4; // center of the right half
const DESC = { x: WIDTH - 24, wrap: WIDTH / 2 - 56 }; // hugs the right edge
// How strongly a rung takes the rider's trunks color: the next opponent stands out,
// defeated ones are quieter, and the rest sit in between.
const RUNG_TINT = { next: 0.7, defeated: 0.28, other: 0.42 };
const BATTLE_BUTTON = { w: 280, h: 52, textScale: 4 };
// The next opponent: standing in their picture (as tall as on the rider select screen),
// breathing, or without one, floating in their tube like a custom rider there.
const OPPONENT = { x: RIGHT_X, feetY: 400, pxPerInch: 3.9 };
const BREATH = { rate: 2.4, depth: 0.012 };
const FLOAT = { waterY: 390, texel: 1.3, bob: 3, sway: 0.35 };

// Between-match screen: every rival by name, each rung tinted their trunks color,
// the next one highlighted, and the boss always waiting at the top.
export class LadderScene extends Phaser.Scene {
  constructor() {
    super('Ladder');
  }

  init(data) {
    this.campaign = data.campaign;
    this.unlocked = data.unlocked ?? null; // OPPONENTS key just beaten for the first time
    this.idle = null;
  }

  preload() {
    preloadBackground(this);
    const { campaign } = this;
    if (isChampion(campaign)) return;
    const key = campaign.order[campaign.rung];
    const c = opponentCharacter(key);
    const sprite = spriteKey(c, campaign.difficulty);
    if (sprite) {
      if (!this.textures.exists(sprite)) this.load.image(sprite, c.sprites[campaign.difficulty]);
    } else {
      const { anim } = rivalArt(campaign, key);
      if (!isRiderAnimLoaded(this, anim)) preloadRiderAnim(this, anim);
    }
  }

  create() {
    ensureMenuMusic();
    const { campaign } = this;
    const champion = isChampion(campaign);

    addBackground(this);

    addText(this, TITLE_X, 34, champion ? 'CHAMPION OF THE RIVER' : 'BATTLE TUBES', { scale: champion ? 3 : 4, color: '#ffdd55' }).setOrigin(0.5);
    const { year, label } = DIFFICULTIES[campaign.difficulty];
    addText(this, WIDTH - 16, 16, `${year} (${label})`, { scale: 2, color: '#ffdd55' }).setOrigin(1, 0);
    addText(this, WIDTH - 16, 40, `SCORE ${formatScore(campaign.score ?? 0)}`, { scale: 2 }).setOrigin(1, 0);
    if (!champion) {
      addText(this, WIDTH - 16, 62, `NEXT MATCH x${rungMultiplier(campaign.rung)}`, { scale: 2, font: 'small', color: '#bfe9ff' }).setOrigin(1, 0);
    }
    addText(this, WIDTH / 2, 76, this.headline(champion), { scale: 2, wrap: WIDTH - 80, align: 'center' }).setOrigin(0.5);
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
    if (!champion) this.makeOpponent();

    if (!champion) {
      const next = rivalProfile(campaign, campaign.order[campaign.rung]);
      addText(this, DESC.x, 430, next.style, { scale: 2, color: '#e8f6ff', align: 'right', wrap: DESC.wrap }).setOrigin(1, 0);
    }

    const proceed = () => {
      if (champion) this.scene.start('Menu');
      else this.scene.start('Game', { mode: '1p', campaign });
    };
    addMenuButton(this, WIDTH / 2, HEIGHT - 36, champion ? 'MENU' : 'BATTLE!', proceed, BATTLE_BUTTON);
    this.input.keyboard.once('keydown-ENTER', proceed);
    this.input.keyboard.once('keydown-SPACE', proceed);

    // Back to rider select. An unfinished ladder goes along, so picking a rider there
    // carries on from the same rung.
    addBackButton(this, 'PlayerSelect', { difficulty: campaign.difficulty, campaign: champion ? null : campaign });
  }

  // Sets `idle(t)` to move them.
  makeOpponent() {
    const { campaign } = this;
    const key = campaign.order[campaign.rung];
    const c = opponentCharacter(key);
    const sprite = spriteKey(c, campaign.difficulty);
    if (sprite) {
      const image = this.add.image(OPPONENT.x, OPPONENT.feetY, sprite).setOrigin(0.5, 1);
      const scale = (c.stats[campaign.difficulty].heightIn * OPPONENT.pxPerInch) / image.height;
      this.idle = (t) => image.setScale(scale, scale * (1 + BREATH.depth * Math.sin(t * BREATH.rate)));
      return;
    }

    const { anim, colors, artScale } = rivalArt(campaign, key);
    const water = this.add.graphics();
    const art = new TubeRider(this, anim).setColors(colors);
    const { hold } = ATTACK_ANIM;
    const facing = -1; // toward the ladder
    const tube = tubeTextures(this, { width: TUBE_WIDTH, handle: art.holdsFarHandle(hold) ? 0 : facing, crisp: true, color: 'blue' });
    const heightIn = c.stats[campaign.difficulty].heightIn * artScale;
    const { x } = OPPONENT;
    const { waterY } = FLOAT;
    this.idle = (t) => {
      const wave = Math.sin(t * 2.3);
      water.clear();
      water.fillStyle(0x2f7fc1, 1);
      water.fillEllipse(x, waterY + 6, 212, 40);
      water.lineStyle(2, 0xbfe9ff, 0.5 + 0.3 * wave);
      water.strokeEllipse(x, waterY + 6, 190 + wave * 8, 30);
      const lean = Math.sin(t * 1.7) * FLOAT.sway;
      art.place(tube, x, waterY + wave * FLOAT.bob, FLOAT.texel * TEXELS_PER_UNIT, { facing, heightIn, lean, frame: hold });
    };
  }

  update(time) {
    this.idle?.(time / 1000);
  }

  headline(champion) {
    const { lastResult, lastOpponent } = this.campaign;
    const nameOf = (key) => rivalProfile(this.campaign, key).name;
    if (champion) return `${nameOf(BOSS)} is all wet. Nobody rules the river like you!`;
    if (lastResult === 'won') return `You sent ${nameOf(lastOpponent)} swimming!`;
    if (lastResult === 'lost') return `${nameOf(lastOpponent)} knocked you in. Climb back on for a new run!`;
    return `Knock all ${this.campaign.order.length} riders off their tubes to reach the top.`;
  }

  drawLadder(champion) {
    const { order, rung, lastResult } = this.campaign;
    const g = this.add.graphics();
    const left = LADDER_X - RUNG_W / 2;
    const topY = BOTTOM_RUNG_Y - (order.length - 1) * RUNG_STEP;

    g.fillStyle(0x7a4a21, 1);
    g.fillRect(left - 18, topY - RUNG_H / 2 - 14, 12, (order.length - 1) * RUNG_STEP + RUNG_H + 28);
    g.fillRect(left + RUNG_W + 6, topY - RUNG_H / 2 - 14, 12, (order.length - 1) * RUNG_STEP + RUNG_H + 28);

    order.forEach((name, i) => {
      const y = BOTTOM_RUNG_Y - i * RUNG_STEP;
      const defeated = i < rung;
      const next = i === rung && !champion;
      const rematch = next && lastResult === 'lost';
      const profile = rivalProfile(this.campaign, name);
      const tint = RUNG_TINT[next ? 'next' : defeated ? 'defeated' : 'other'];

      g.fillStyle(0x0d2a4a, 0.55);
      g.fillRoundedRect(left, y - RUNG_H / 2, RUNG_W, RUNG_H, 8);
      g.fillStyle(profile.trunks, tint);
      g.fillRoundedRect(left, y - RUNG_H / 2, RUNG_W, RUNG_H, 8);
      g.lineStyle(next ? 4 : 2, 0xffffff, next ? 1 : 0.7);
      g.strokeRoundedRect(left, y - RUNG_H / 2, RUNG_W, RUNG_H, 8);

      addText(this, left + 16, y, profile.name.toUpperCase(), { scale: 3 }).setOrigin(0, 0.5);

      const role = { [BOSS]: 'FINAL BOSS', [SUB_BOSS]: 'SUB-BOSS' }[name];
      const tag = defeated ? 'DEFEATED' : rematch ? (role ? `REMATCH: ${role}` : 'REMATCH') : next ? (role ? `NEXT UP: ${role}` : 'NEXT UP') : role ?? `RUNG ${i + 1}`;
      addText(this, left + RUNG_W - 14, y, tag, { scale: 2, color: defeated ? '#c8ffc8' : '#ffffff' }).setOrigin(1, 0.5);
    });
  }
}
