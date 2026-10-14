import Phaser from 'phaser';
import { WIDTH, HEIGHT, RIDER } from '../config.js';
import { CHARACTERS } from '../characters.js';
import { newCampaign } from '../campaign.js';
import { tubeTextures } from '../tubeArt.js';
import { TubeRider, preloadRiderAnim } from '../riderArt.js';
import { drawRider } from '../draw.js';
import { addText } from '../pixelFont.js';
import { GameScene } from './GameScene.js';
import { addStepper } from './labUi.js';

// A real 1999 match as Dan against the ladder's first rider, but with the riders drawn as
// pictures in drawn tubes, to see how big they should be on screen while they move around.
// RIDER SIZE scales the pictures and tubes; TUBE sets the tube's width before that. The
// tubes bump where they're drawn: while this lab runs, RIDER.tubeWidth follows them.
// Nobody gets knocked off by just sitting there: the opponent never attacks and you
// take no damage.

const GAME_TUBE_WIDTH = RIDER.tubeWidth;
const SIZE = { step: 0.1, min: 0.5, max: 3, start: 2 };
const TUBE = { step: 10, min: 80, max: 200, start: 120 };
const NO_ATTACKS = { high: false, mid: false, low: false };
const BAR = { h: 44, depth: 70 };
const SPRING = { stiffness: 260, damping: 9, kick: 9 }; // the tubes' squash when they bump
const BUMP_SPEED = 300; // a bump this fast squashes them all the way
const RESTART_DELAY = 2500;
const OPPONENT = 1; // drawn as an empty tube; it still rides and bumps as usual

export class SizeLabScene extends GameScene {
  constructor() {
    super('SizeLab');
  }

  init() {
    const dan = CHARACTERS.find((c) => c.id === 'Dan');
    super.init({ mode: '1p', campaign: newCampaign('easy', { id: dan.id, trunks: dan.trunks }) });
    this.exitTo = 'Labs';
  }

  preload() {
    preloadRiderAnim(this);
  }

  create() {
    this.sizeScale = SIZE.start;
    this.tubeBase = TUBE.start;
    this.applyTubeWidth();
    this.events.once('shutdown', () => {
      RIDER.tubeWidth = GAME_TUBE_WIDTH;
    });

    super.create();

    const cpu = this.controllers[OPPONENT];
    const cpuUpdate = cpu.update.bind(cpu);
    cpu.update = (...args) => ({ ...cpuUpdate(...args), ...NO_ATTACKS });

    this.art = this.riders.map(() => new TubeRider(this).setDepth(3.5));
    this.hitboxG = this.add.graphics().setDepth(3.6).setAlpha(0.5).setVisible(false);
    this.squash = this.riders.map(() => ({ amount: 0, speed: 0 }));
    this.touching = false;
    this.input.keyboard.on('keydown-B', () => this.hitboxG.setVisible(!this.hitboxG.visible));

    const y = HEIGHT - BAR.h / 2;
    this.add.rectangle(0, HEIGHT - BAR.h, WIDTH, BAR.h, 0x0d2a4a, 0.85).setOrigin(0).setDepth(BAR.depth);
    const { right } = addStepper(this, 16, y, 'RIDER SIZE', {
      change: (dir) => {
        const { step, min, max } = SIZE;
        this.sizeScale = Phaser.Math.Clamp(Math.round((this.sizeScale + dir * step) * 10) / 10, min, max);
        this.applyTubeWidth();
      },
      format: () => `${Math.round(this.sizeScale * 100)}%`,
      depth: BAR.depth,
    });
    const { right: right2 } = addStepper(this, right + 24, y, 'TUBE', {
      change: (dir) => {
        const { step, min, max } = TUBE;
        this.tubeBase = Phaser.Math.Clamp(this.tubeBase + dir * step, min, max);
        this.applyTubeWidth();
      },
      format: () => String(this.tubeBase),
      depth: BAR.depth,
    });
    addText(this, right2 + 24, y, 'B hitboxes    ESC labs', { scale: 2 }).setOrigin(0, 0.5).setDepth(BAR.depth);
  }

  applySettings() {
    super.applySettings();
    this.riders[0].invincible = true;
  }

  applyTubeWidth() {
    RIDER.tubeWidth = this.tubeBase * this.sizeScale;
  }

  endMatch(winner) {
    this.setPhase('matchOver');
    this.hud.setStatus(`${this.riders[winner].name.toUpperCase()} WINS!`, 'New match coming up');
    this.time.delayedCall(RESTART_DELAY, () => this.scene.restart());
  }

  drawRiders(g, riderPt) {
    this.hitboxG.clear();
    if (this.hitboxG.visible) super.drawRiders(this.hitboxG, riderPt);
    this.updateSquash(Math.min(this.game.loop.delta / 1000, 1 / 30));

    const scale = riderPt.s * this.sizeScale;
    this.riders.forEach((r, i) => {
      const art = this.art[i];
      const isOpponent = i === OPPONENT;
      if (r.isOff) {
        art.setVisible(false);
        if (!isOpponent) drawRider(g, r, riderPt, this.clock);
        return;
      }
      const facing = Math.sign(r.opponent.x - r.x) || -r.startSide;
      const bob = r.airborne ? 0 : Math.sin(this.clock * 7 + r.startSide * 1.7) * 2;
      const tube = tubeTextures(this, {
        air: r.air / RIDER.maxAir,
        squash: Math.max(0, this.squash[i].amount) * facing,
        lean: r.leanVisual,
        handle: facing,
        width: this.tubeBase,
      });
      art.setVisible(true).place(tube, r.screenX, r.screenY + bob, scale, {
        facing,
        lean: r.leanVisual,
        heightIn: r.heightScale * RIDER.baseHeightIn,
        showRider: !isOpponent,
        rotation: -r.tilt,
      });
    });
  }

  // The tubes squash where they meet when they bump, then spring back.
  updateSquash(dt) {
    const [a, b] = this.riders;
    const touching = !a.isOff && !b.isOff && Math.abs(a.x - b.x) <= RIDER.tubeWidth + 2 && Math.abs(a.alt - b.alt) < RIDER.tubeHeight;
    if (touching && !this.touching) {
      const kick = SPRING.kick * Math.min(1, Math.max(0.3, Math.abs(a.vx - b.vx) / BUMP_SPEED));
      for (const s of this.squash) s.speed += kick;
    }
    this.touching = touching;
    for (const s of this.squash) {
      s.speed += (-SPRING.stiffness * s.amount - SPRING.damping * s.speed) * dt;
      s.amount = Phaser.Math.Clamp(s.amount + s.speed * dt, -1, 1);
    }
  }
}
