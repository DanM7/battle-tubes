import Phaser from 'phaser';
import { WIDTH, HEIGHT, RIDER } from '../config.js';
import { CHARACTERS } from '../characters.js';
import { newCampaign } from '../campaign.js';
import { drawRider } from '../draw.js';
import { addText } from '../pixelFont.js';
import { GameScene } from './GameScene.js';
import { addStepper } from './labUi.js';

// A real 1999 match as Dan against the ladder's first rider, to see how big riders should
// be on screen while they move around. RIDER SIZE scales the pictures and tubes; TUBE sets
// the tube's width before that (matches use RIDER_ART in config.js). The tubes bump where
// they're drawn: while this lab runs, RIDER.tubeWidth follows them. Only the opponent's
// tube is drawn, and nobody gets knocked off by just sitting there: the opponent never
// attacks and you take no damage.

const GAME_TUBE_WIDTH = RIDER.tubeWidth;
const SIZE = { step: 0.1, min: 0.5, max: 3 };
const TUBE = { step: 10, min: 80, max: 200 };
const NO_ATTACKS = { high: false, mid: false, low: false };
const BAR = { h: 44, depth: 70 };
const RESTART_DELAY = 2500;
const OPPONENT = 1;

export class SizeLabScene extends GameScene {
  constructor() {
    super('SizeLab');
  }

  init() {
    const dan = CHARACTERS.find((c) => c.id === 'Dan');
    super.init({ mode: '1p', campaign: newCampaign('easy', { id: dan.id, trunks: dan.trunks }) });
    this.score = null;
    this.exitTo = 'Labs';
    this.ridersShown[OPPONENT] = false;
  }

  create() {
    this.events.once('shutdown', () => {
      RIDER.tubeWidth = GAME_TUBE_WIDTH;
    });

    super.create();

    const cpu = this.controllers[OPPONENT];
    const cpuUpdate = cpu.update.bind(cpu);
    cpu.update = (...args) => ({ ...cpuUpdate(...args), ...NO_ATTACKS });

    this.hitboxG = this.add.graphics().setDepth(3.7).setAlpha(0.5).setVisible(false);
    this.input.keyboard.on('keydown-B', () => this.hitboxG.setVisible(!this.hitboxG.visible));

    const y = HEIGHT - BAR.h / 2;
    this.add.rectangle(0, HEIGHT - BAR.h, WIDTH, BAR.h, 0x0d2a4a, 0.85).setOrigin(0).setDepth(BAR.depth);
    const { right } = addStepper(this, 16, y, 'RIDER SIZE', {
      change: (dir) => {
        const { step, min, max } = SIZE;
        this.artScale = Phaser.Math.Clamp(Math.round((this.artScale + dir * step) * 10) / 10, min, max);
        this.applyTubeWidth();
      },
      format: () => `${Math.round(this.artScale * 100)}%`,
      depth: BAR.depth,
    });
    const { right: right2 } = addStepper(this, right + 24, y, 'TUBE', {
      change: (dir) => {
        const { step, min, max } = TUBE;
        this.artTubeWidth = Phaser.Math.Clamp(this.artTubeWidth + dir * step, min, max);
        this.applyTubeWidth();
      },
      format: () => String(this.artTubeWidth),
      depth: BAR.depth,
    });
    addText(this, right2 + 24, y, 'B hitboxes    ESC labs', { scale: 2 }).setOrigin(0, 0.5).setDepth(BAR.depth);
  }

  applySettings() {
    super.applySettings();
    this.riders[0].invincible = true;
  }

  applyTubeWidth() {
    RIDER.tubeWidth = this.artTubeWidth * this.artScale;
  }

  endMatch(winner) {
    this.setPhase('matchOver');
    this.hud.setStatus(`${this.riders[winner].name.toUpperCase()} WINS!`, 'New match coming up');
    this.time.delayedCall(RESTART_DELAY, () => this.scene.restart());
  }

  drawRiders(g, riderPt) {
    super.drawRiders(g, riderPt);
    this.hitboxG.clear();
    if (this.hitboxG.visible) for (const r of this.riders) drawRider(this.hitboxG, r, riderPt, this.clock);
  }
}
