import Phaser from 'phaser';
import { WIDTH, HEIGHT, ATTACKS } from '../config.js';
import { tubeTextures, TEXELS_PER_UNIT, TUBE_WIDTH } from '../tubeArt.js';
import { TubeRider, preloadRiderAnim, ATTACK_ANIM } from '../riderArt.js';
import { KEYMAPS } from '../input.js';
import { addText } from '../pixelFont.js';
import { addBackButton } from './ui.js';
import { addStepper } from './labUi.js';

// A test bench for attack art (ATTACK on the Labs screen, or ?lab=attack): Dan holds both
// handles until you attack, with the chosen attack's frames as drawn and -/+ controls for
// how long each stage of it lasts.

const RIDER_SPOT = { x: 250, y: 450, texel: 2 }; // the tube's bottom center, and its size
const BOB = { speed: 2.3, height: 3 };
const PLAYER_HEIGHT_IN = 64; // Dan in 1999
const TABS = { x: 735, y: 150, w: 118, h: 30, gap: 8, fill: 0x1d4e89, chosen: 0x2f7d32 };
const PANEL = { x: 720, spacing: 125, framesY: 300, frameScale: 0.24 };
const TIMING = { x: 560, y: 390, rowGap: 40, labelWidth: 130, step: 0.05, min: 0.05, max: 2 };
const AUTO_EVERY = 1.6; // seconds between auto attacks
const SLOW_MOTION = 0.25;

// Each attack, stage by stage, back to holding on after the last. Attacking again while
// winding back goes straight to the strike. Keys are the one-player match's.
const stages = (windup, strike, label, seconds) => [
  { label: 'WIND UP', frame: windup, seconds: seconds[0] },
  { label, frame: strike, seconds: seconds[1] },
  { label: 'WIND BACK', frame: windup, seconds: seconds[2] },
];
export const LAB_ATTACKS = [
  { label: 'PUNCH', keys: KEYMAPS.solo.high, stages: stages(ATTACK_ANIM.windup, ATTACK_ANIM.punch, 'PUNCH', [0.15, 0.25, 0.9]) },
  {
    label: 'MID KICK',
    keys: KEYMAPS.solo.mid,
    stages: stages(ATTACK_ANIM.kickWindup, ATTACK_ANIM.midKick, 'KICK', [ATTACKS.mid.windup, 0.25, 0.9]),
  },
  {
    label: 'LOW KICK',
    keys: KEYMAPS.solo.low,
    stages: stages(ATTACK_ANIM.kickWindup, ATTACK_ANIM.lowKick, 'KICK', [0.3, 0.25, 0.9]),
  },
];
export const STRIKE_STAGE = 1;
export const WIND_BACK_STAGE = 2;

export class AttackLabScene extends Phaser.Scene {
  constructor() {
    super('AttackLab');
  }

  preload() {
    preloadRiderAnim(this, ATTACK_ANIM);
  }

  create() {
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x2f7fc1).setOrigin(0);
    this.add.rectangle(0, 0, WIDTH, 120, 0x0d2a4a).setOrigin(0);
    addText(this, WIDTH / 2, 32, 'ATTACK LAB', { scale: 4, color: '#ffdd55' }).setOrigin(0.5);
    addText(this, WIDTH / 2, 74, 'R punch   F mid kick   V low kick   ← → or A D lean   T auto   M slow', { scale: 2 }).setOrigin(0.5);
    addText(this, WIDTH / 2, 100, 'attack again while winding back to go straight to the strike', { scale: 2, font: 'small' }).setOrigin(0.5);
    addBackButton(this, 'Labs');

    this.lean = 0;
    this.clock = 0;
    this.chosen = 0; // index into LAB_ATTACKS: the one the panel shows and auto repeats
    this.attack = null; // the attack under way: { index, stage, time }, or null while holding on
    this.seconds = LAB_ATTACKS.map((a) => a.stages.map((s) => s.seconds));
    this.autoAttack = false;
    this.slowMotion = false;
    const keys = (names) => names.map((name) => this.input.keyboard.addKey(name));
    this.keys = { left: keys(KEYMAPS.solo.left), right: keys(KEYMAPS.solo.right) };
    LAB_ATTACKS.forEach(({ keys: names }, i) => {
      for (const name of names) this.input.keyboard.on(`keydown-${name}`, () => this.startAttack(i));
    });
    this.input.keyboard.on('keydown-T', () => (this.autoAttack = !this.autoAttack));
    this.input.keyboard.on('keydown-M', () => (this.slowMotion = !this.slowMotion));

    this.rider = new TubeRider(this, ATTACK_ANIM);
    this.readout = addText(this, WIDTH / 2, HEIGHT - 18, '', { scale: 2 }).setOrigin(0.5);
    this.buildTabs();
    this.buildFrames();
    this.buildTiming();
    this.choose(0);
  }

  buildTabs() {
    const { x, y, w, h, gap, fill } = TABS;
    this.tabs = LAB_ATTACKS.map(({ label }, i) => {
      const tx = x + (i - (LAB_ATTACKS.length - 1) / 2) * (w + gap);
      const rect = this.add.rectangle(tx, y, w, h, fill).setStrokeStyle(2, 0xffffff).setInteractive({ useHandCursor: true });
      addText(this, tx, y, label, { scale: 2, font: 'small' }).setOrigin(0.5);
      rect.on('pointerup', () => this.choose(i));
      return rect;
    });
  }

  // The chosen attack's frames as drawn, the one showing now marked.
  buildFrames() {
    const height = this.rider.meta.frameHeight * PANEL.frameScale;
    this.slots = [0, 1, 2].map((i) => {
      const x = PANEL.x + (i - 1) * PANEL.spacing;
      const mark = this.add.rectangle(x, PANEL.framesY + 4, PANEL.spacing - 8, height + 8, 0xffdd55, 0.25).setOrigin(0.5, 1);
      const image = this.add.image(x, PANEL.framesY, ATTACK_ANIM.key, 0).setScale(PANEL.frameScale).setOrigin(0.5, 1);
      const label = addText(this, x, PANEL.framesY + 8, '', { scale: 2 }).setOrigin(0.5, 0);
      return { mark, image, label, frame: 0 };
    });
  }

  buildTiming() {
    const { x, y, rowGap, labelWidth, step, min, max } = TIMING;
    addText(this, x, y - rowGap, 'SECONDS PER STAGE', { scale: 2, font: 'small' }).setOrigin(0, 0.5);
    this.stageRows = [0, 1, 2].map((i) => {
      const label = addText(this, x, y + i * rowGap, '', { scale: 2 }).setOrigin(0, 0.5);
      const { refresh } = addStepper(this, x, y + i * rowGap, '', {
        labelWidth,
        change: (dir) => {
          const seconds = this.seconds[this.chosen];
          seconds[i] = Phaser.Math.Clamp(Math.round((seconds[i] + dir * step) * 100) / 100, min, max);
        },
        format: () => `${this.seconds[this.chosen][i].toFixed(2)}s`,
      });
      return { label, refresh };
    });
  }

  // Shows attack `index` in the panel.
  choose(index) {
    this.chosen = index;
    this.tabs.forEach((tab, i) => tab.setFillStyle(i === index ? TABS.chosen : TABS.fill));
    const { stages } = LAB_ATTACKS[index];
    const frames = [{ label: 'HOLD', frame: ATTACK_ANIM.hold }, stages[0], stages[STRIKE_STAGE]];
    this.slots.forEach((slot, i) => {
      slot.frame = frames[i].frame;
      slot.image.setFrame(slot.frame);
      slot.label.setText(frames[i].label);
    });
    this.stageRows.forEach((row, i) => {
      row.label.setText(stages[i].label);
      row.refresh();
    });
  }

  startAttack(index) {
    if (index !== this.chosen) this.choose(index);
    const a = this.attack;
    if (!a) this.attack = { index, stage: 0, time: 0 };
    else if (a.stage === WIND_BACK_STAGE) {
      this.attack = { index, stage: a.index === index ? STRIKE_STAGE : 0, time: 0 };
    }
  }

  update(_, delta) {
    const dt = Math.min(delta / 1000, 0.05) * (this.slowMotion ? SLOW_MOTION : 1);
    const before = this.clock;
    this.clock += dt;
    if (this.autoAttack && Math.floor(this.clock / AUTO_EVERY) > Math.floor(before / AUTO_EVERY)) this.startAttack(this.chosen);

    const a = this.attack;
    if (a) {
      a.time += dt;
      const seconds = this.seconds[a.index];
      while (this.attack && a.time >= seconds[a.stage]) {
        a.time -= seconds[a.stage];
        a.stage += 1;
        if (a.stage >= seconds.length) this.attack = null;
      }
    }
    const stage = this.attack && LAB_ATTACKS[this.attack.index].stages[this.attack.stage];
    const frame = stage ? stage.frame : ATTACK_ANIM.hold;
    for (const slot of this.slots) slot.mark.setVisible(slot.frame === frame);

    // Leaning eases in and out like it does in a match.
    const down = (action) => this.keys[action].some((k) => k.isDown);
    const leanTarget = (down('right') ? 1 : 0) - (down('left') ? 1 : 0);
    this.lean += (leanTarget - this.lean) * Math.min(1, dt * 10);

    // A held handle is drawn with the rider, so the tube only draws its own while it's let go.
    const handle = this.rider.holdsFarHandle(frame) ? 0 : 1;
    const tube = tubeTextures(this, { width: TUBE_WIDTH, lean: this.lean, handle, crisp: true });
    const y = RIDER_SPOT.y + Math.sin(this.clock * BOB.speed) * BOB.height;
    this.rider.place(tube, RIDER_SPOT.x, y, RIDER_SPOT.texel * TEXELS_PER_UNIT, { lean: this.lean, heightIn: PLAYER_HEIGHT_IN, frame });

    const now = stage ? `${LAB_ATTACKS[this.attack.index].label}: ${stage.label}` : 'HOLD';
    this.readout.setText(`${now}    AUTO ${this.autoAttack ? 'ON' : 'OFF'}    ${this.slowMotion ? 'SLOW MOTION' : 'FULL SPEED'}`);
  }
}
