import Phaser from 'phaser';
import { WIDTH, HEIGHT, RIDER, CUSTOM } from '../config.js';
import { tubeTextures, TEXELS_PER_UNIT, TUBE_WIDTH, HANDLE_SPOT } from '../tubeArt.js';
import { TubeRider, preloadRiderAnim, STRAP_OFFSET } from '../riderArt.js';
import { addText } from '../pixelFont.js';
import { addBackButton } from './ui.js';
import { addStepper } from './labUi.js';

// A test bench for the drawn tubes (TUBE on the Labs screen, or ?lab=tube): two riders
// face off in touching tubes you can bump together, deflate and resize, and rows of small
// tubes show each setting at match size.

const DUEL = { x: 290, y: 440, maxTexel: 2, room: 560 }; // the pair's center and bottom; widest it gets
const STANDING_UNITS = RIDER.torsoTop + RIDER.headSize; // a base-height rider standing, in world units
const MATCH_SCALE = 0.43; // screen pixels per world unit for riders in a match
const SMALL = { x: 660, spacing: 64, airY: 190, squashY: 330 };
const AIRS = [1, 0.75, 0.5, 0.25, 0];
const SQUASHES = [-1, -0.5, 0, 0.5, 1];
const SPRING = { stiffness: 260, damping: 9, kick: 9 };
const BOB = { speed: 2.3, height: 3 };
const TUBE_STEP = 10;
const HEIGHT_STEP = 2;
const OPPONENT_HEIGHT_IN = RIDER.baseHeightIn;
const PLAYER_HEIGHT_IN = 64; // Dan in 1999
// The -/+ controls under the riders: where the held handle's straps meet the tube (world
// units forward of the handle) and where the free handle sits (a share of the ring radius).
const STEPPERS_Y = 482;
const STRAP_OFFSET_STEP = { step: 2, min: -30, max: 30 };
const HANDLE_SPOT_STEP = { step: 0.05, min: 0, max: 0.9 };

export class TubeLabScene extends Phaser.Scene {
  constructor() {
    super('TubeLab');
  }

  preload() {
    preloadRiderAnim(this);
  }

  create() {
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x2f7fc1).setOrigin(0);
    this.add.rectangle(0, 0, WIDTH, 120, 0x0d2a4a).setOrigin(0);
    addText(this, WIDTH / 2, 32, 'TUBE LAB', { scale: 4, color: '#ffdd55' }).setOrigin(0.5);
    addText(this, WIDTH / 2, 74, 'hold ← → lean    SPACE bump    ↑ ↓ air    [ ] tube size    D auto deflate', { scale: 2 }).setOrigin(0.5);
    addText(this, WIDTH / 2, 100, 'W S your height    I K their height    L they lean in    H hide riders', { scale: 2 }).setOrigin(0.5);
    addBackButton(this, 'Labs');

    this.air = 1;
    this.squash = 0;
    this.squashSpeed = 0;
    this.autoDeflate = false;
    this.tubeWidth = TUBE_WIDTH;
    this.heights = { you: PLAYER_HEIGHT_IN, them: OPPONENT_HEIGHT_IN };
    this.showRiders = true;
    this.theyLeanIn = false;
    this.lean = { you: 0, them: 0 }; // -1 (left) to 1 (right), eased like a rider's leanVisual
    this.strapOffset = STRAP_OFFSET;
    this.handleSpot = HANDLE_SPOT;
    this.cursors = this.input.keyboard.createCursorKeys();

    this.duel = ['you', 'them'].map((who) => ({ who, art: new TubeRider(this) }));
    this.readout = addText(this, WIDTH / 2, HEIGHT - 18, '', { scale: 2 }).setOrigin(0.5);
    this.buildSmallRows();

    const { right } = addStepper(this, 16, STEPPERS_Y, 'LEFT STRAPS', {
      change: (dir) => {
        const { step, min, max } = STRAP_OFFSET_STEP;
        this.strapOffset = Phaser.Math.Clamp(this.strapOffset + dir * step, min, max);
        this.buildSmallRows();
      },
      format: () => `${this.strapOffset > 0 ? '+' : ''}${this.strapOffset}`,
    });
    addStepper(this, right + 20, STEPPERS_Y, 'RIGHT HANDLE', {
      change: (dir) => {
        const { step, min, max } = HANDLE_SPOT_STEP;
        this.handleSpot = Phaser.Math.Clamp(Math.round((this.handleSpot + dir * step) * 100) / 100, min, max);
        this.buildSmallRows();
      },
      format: () => this.handleSpot.toFixed(2),
    });

    this.input.keyboard.on('keydown', (e) => {
      if (e.code === 'Space') this.squashSpeed += SPRING.kick;
      else if (e.code === 'ArrowUp') this.air = Math.min(1, this.air + 0.1);
      else if (e.code === 'ArrowDown') this.air = Math.max(0, this.air - 0.1);
      else if (e.code === 'BracketLeft' || e.code === 'BracketRight') {
        const step = e.code === 'BracketLeft' ? -TUBE_STEP : TUBE_STEP;
        this.tubeWidth = Phaser.Math.Clamp(this.tubeWidth + step, 80, 200);
        this.buildSmallRows();
      } else if (e.code === 'KeyW' || e.code === 'KeyS') this.changeHeight('you', e.code === 'KeyW');
      else if (e.code === 'KeyI' || e.code === 'KeyK') this.changeHeight('them', e.code === 'KeyI');
      else if (e.code === 'KeyH') {
        this.showRiders = !this.showRiders;
        this.buildSmallRows();
      } else if (e.code === 'KeyD') this.autoDeflate = !this.autoDeflate;
      else if (e.code === 'KeyL') this.theyLeanIn = !this.theyLeanIn;
    });
  }

  changeHeight(who, taller) {
    const h = this.heights[who] + (taller ? HEIGHT_STEP : -HEIGHT_STEP);
    this.heights[who] = Phaser.Math.Clamp(h, CUSTOM.minHeightIn, CUSTOM.maxHeightIn);
    this.buildSmallRows();
  }

  tube(settings) {
    return tubeTextures(this, { handleSpot: this.handleSpot, width: this.tubeWidth, ...settings });
  }

  // Tubes at match size: each setting twice, alone and with a rider in it.
  buildSmallRows() {
    this.small?.destroy(true);
    this.small = this.add.container(0, 0);
    const row = (y, title, settings) => {
      this.small.add(addText(this, SMALL.x - 76, y, title, { scale: 2, font: 'small' }).setOrigin(1, 0.5));
      settings.forEach(({ label, ...setting }, i) => {
        const x = SMALL.x + i * SMALL.spacing;
        for (const [dy, withRider] of [[-14, false], [56, true]]) {
          const art = new TubeRider(this).place(this.tube({ ...setting, handle: 1 }), x, y + dy, MATCH_SCALE, {
            heightIn: this.heights.you,
            showRider: withRider && this.showRiders,
            strapOffset: this.strapOffset,
          });
          this.small.add(art.container);
        }
        this.small.add(addText(this, x, y + 72, label, { scale: 2 }).setOrigin(0.5));
      });
    };
    row(SMALL.airY, 'AIR', AIRS.map((air) => ({ air, label: `${Math.round(air * 100)}%` })));
    row(SMALL.squashY, 'SQUASH', SQUASHES.map((squash) => ({ squash, label: squash > 0 ? `+${squash}` : `${squash}` })));
    this.small.add(addText(this, SMALL.x + SMALL.spacing * 2, HEIGHT - 92, 'MATCH SIZE, WITH AND WITHOUT RIDER', { scale: 2, font: 'small' }).setOrigin(0.5));
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    this.squashSpeed += (-SPRING.stiffness * this.squash - SPRING.damping * this.squashSpeed) * dt;
    this.squash = Phaser.Math.Clamp(this.squash + this.squashSpeed * dt, -1, 1);
    if (this.autoDeflate) {
      this.air -= dt * 0.15;
      if (this.air <= 0) this.air = 1;
    }

    // Leaning eases in and out like it does in a match.
    const leanTarget = { you: (this.cursors.right.isDown ? 1 : 0) - (this.cursors.left.isDown ? 1 : 0), them: this.theyLeanIn ? -1 : 0 };
    for (const who of ['you', 'them']) this.lean[who] += (leanTarget[who] - this.lean[who]) * Math.min(1, dt * 10);

    // The tubes touch, pushed in where they meet while they bounce off each other, and
    // pressed down on the side each rider leans to.
    const push = Math.max(0, this.squash);
    const tubes = this.duel.map((d, i) =>
      this.tube({ air: this.air, squash: push * (i ? -1 : 1), lean: this.lean[d.who], handle: i ? -1 : 1, crisp: true }),
    );
    const texel = Math.min(DUEL.maxTexel, DUEL.room / (2 * this.tubeWidth * TEXELS_PER_UNIT));
    const apart = (tubes[0].right + tubes[1].left) * texel;
    this.duel.forEach((d, i) => {
      const x = DUEL.x + (i ? apart / 2 : -apart / 2);
      const y = DUEL.y + Math.sin((time / 1000) * BOB.speed + i * 2) * BOB.height;
      d.art.place(tubes[i], x, y, texel * TEXELS_PER_UNIT, {
        facing: i ? -1 : 1,
        lean: this.lean[d.who],
        heightIn: this.heights[d.who],
        showRider: this.showRiders,
        strapOffset: this.strapOffset,
      });
    });

    const inches = Math.round((this.tubeWidth * RIDER.baseHeightIn) / STANDING_UNITS);
    this.readout.setText(
      `AIR ${Math.round(this.air * 100)}%   TUBE ${this.tubeWidth} (${inches}")   YOU ${this.heights.you}"   THEM ${this.heights.them}"`,
    );
  }
}
