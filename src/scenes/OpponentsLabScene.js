import Phaser from 'phaser';
import { WIDTH, HEIGHT } from '../config.js';
import { CHARACTERS } from '../characters.js';
import { tubeTextures, TEXELS_PER_UNIT, TUBE_WIDTH } from '../tubeArt.js';
import { TubeRider, preloadRiderAnim, attackAnim, ATTACK_ANIM } from '../riderArt.js';
import { artColors } from '../riderColors.js';
import { KEYMAPS } from '../input.js';
import { addText } from '../pixelFont.js';
import { addBackButton } from './ui.js';
import { LAB_ATTACKS, STRIKE_STAGE, WIND_BACK_STAGE } from './AttackLabScene.js';

// A test bench for the ladder opponents' attack art (OPPONENTS on the Labs screen, or
// ?lab=opponents): each one's head (art/riders/heads/) on Dan's attack frames, in their
// own skin and trunks colors and height, all attacking together.

const HEADER_H = 96;
const BAR = { h: 44, fill: 0x0d2a4a };
const GRID = { cols: 3, rows: 2 };
const CELL_W = WIDTH / GRID.cols;
const CELL_H = (HEIGHT - HEADER_H - BAR.h) / GRID.rows;
const TEXEL = 1;
const RIDER_X = 165; // the tube's center, in from a cell's left edge
const RIDER_BOTTOM = 8; // the tube's bottom, up from a cell's bottom edge
const LABEL = { x: 12, y: 14 };
const BOB = { speed: 2.3, height: 2 };
const TABS = { x: 58, w: 96, h: 28, gap: 8, fill: 0x1d4e89, chosen: 0x2f7d32 };
const MODES = [
  { label: '1999', mode: 'easy' },
  { label: '2010', mode: 'hard' },
];
const MODE_TABS = { x: 382, w: 64 };
const AUTO_EVERY = 1.6; // seconds between auto attacks, which take turns
const SLOW_MOTION = 0.25;
const formatHeight = (inches) => `${Math.floor(inches / 12)}'${inches % 12}"`;

const OPPONENTS = CHARACTERS.filter((c) => c.ladderId).sort((a, b) => a.ladderId - b.ladderId);

export class OpponentsLabScene extends Phaser.Scene {
  constructor() {
    super('OpponentsLab');
  }

  preload() {
    for (const c of OPPONENTS) preloadRiderAnim(this, attackAnim(c.id));
  }

  create() {
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x2f7fc1).setOrigin(0);
    this.add.rectangle(0, 0, WIDTH, HEADER_H, 0x0d2a4a).setOrigin(0);
    addText(this, WIDTH / 2, 28, 'OPPONENTS LAB', { scale: 4, color: '#ffdd55' }).setOrigin(0.5);
    addText(this, WIDTH / 2, 66, 'R punch   F mid kick   V low kick   T auto   M slow   C colors', { scale: 2 }).setOrigin(0.5);
    addBackButton(this, 'Labs');

    this.clock = 0;
    this.chosen = 0; // index into LAB_ATTACKS: the last one thrown
    this.attack = null; // the attack under way: { index, stage, time }, or null while holding on
    this.autoAttack = true;
    this.slowMotion = false;
    this.ownColors = true;
    this.mode = MODES[0].mode;
    LAB_ATTACKS.forEach(({ keys }, i) => {
      for (const name of keys) this.input.keyboard.on(`keydown-${name}`, () => this.startAttack(i));
    });
    this.input.keyboard.on('keydown-T', () => (this.autoAttack = !this.autoAttack));
    this.input.keyboard.on('keydown-M', () => (this.slowMotion = !this.slowMotion));
    this.input.keyboard.on('keydown-C', () => {
      this.ownColors = !this.ownColors;
      this.recolor();
    });

    this.buildCells();
    this.buildBar();
    this.recolor();
    this.showMode();
  }

  buildCells() {
    const g = this.add.graphics().lineStyle(2, 0x0d2a4a, 0.5);
    for (let col = 1; col < GRID.cols; col++) g.lineBetween(col * CELL_W, HEADER_H, col * CELL_W, HEIGHT - BAR.h);
    for (let row = 1; row < GRID.rows; row++) g.lineBetween(0, HEADER_H + row * CELL_H, WIDTH, HEADER_H + row * CELL_H);
    this.cells = OPPONENTS.map((c, i) => {
      const left = (i % GRID.cols) * CELL_W;
      const top = HEADER_H + Math.floor(i / GRID.cols) * CELL_H;
      return {
        c,
        x: left + RIDER_X,
        y: top + CELL_H - RIDER_BOTTOM,
        rider: new TubeRider(this, attackAnim(c.id)),
        name: addText(this, left + LABEL.x, top + LABEL.y, '', { scale: 2, color: '#ffdd55' }),
        stats: addText(this, left + LABEL.x, top + LABEL.y + 20, '', { scale: 2, font: 'small' }),
      };
    });
  }

  // The attack tabs, the year tabs (which set names and heights), and what's going on.
  buildBar() {
    const y = HEIGHT - BAR.h / 2;
    this.add.rectangle(0, HEIGHT - BAR.h, WIDTH, BAR.h, BAR.fill).setOrigin(0);
    const tab = (x, w, label, onClick) => {
      const rect = this.add.rectangle(x, y, w, TABS.h, TABS.fill).setStrokeStyle(2, 0xffffff).setInteractive({ useHandCursor: true });
      addText(this, x, y, label, { scale: 2, font: 'small' }).setOrigin(0.5);
      rect.on('pointerup', onClick);
      return rect;
    };
    this.attackTabs = LAB_ATTACKS.map(({ label }, i) => tab(TABS.x + i * (TABS.w + TABS.gap), TABS.w, label, () => this.startAttack(i)));
    this.modeTabs = MODES.map(({ label, mode }, i) =>
      tab(MODE_TABS.x + i * (MODE_TABS.w + TABS.gap), MODE_TABS.w, label, () => {
        this.mode = mode;
        this.showMode();
      }),
    );
    this.readout = addText(this, WIDTH - 12, y, '', { scale: 2, font: 'small' }).setOrigin(1, 0.5);
  }

  recolor() {
    for (const { c, rider } of this.cells) rider.setColors(this.ownColors ? artColors(c) : {});
  }

  showMode() {
    this.modeTabs.forEach((t, i) => t.setFillStyle(MODES[i].mode === this.mode ? TABS.chosen : TABS.fill));
    const easy = this.mode === 'easy';
    for (const cell of this.cells) {
      const { c } = cell;
      const { heightIn, grip } = c.stats[this.mode];
      cell.heightIn = heightIn;
      cell.name.setText((easy ? (c.name ?? c.id) : c.nickname).toUpperCase());
      cell.stats.setText(`${formatHeight(heightIn)}   GRIP ${grip}`);
    }
  }

  startAttack(index) {
    this.chosen = index;
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
    const autoTurn = Math.floor(this.clock / AUTO_EVERY);
    if (this.autoAttack && autoTurn > Math.floor(before / AUTO_EVERY)) this.startAttack(autoTurn % LAB_ATTACKS.length);

    const a = this.attack;
    if (a) {
      a.time += dt;
      const { stages } = LAB_ATTACKS[a.index];
      while (this.attack && a.time >= stages[a.stage].seconds) {
        a.time -= stages[a.stage].seconds;
        a.stage += 1;
        if (a.stage >= stages.length) this.attack = null;
      }
    }
    const stage = this.attack && LAB_ATTACKS[this.attack.index].stages[this.attack.stage];
    const frame = stage ? stage.frame : ATTACK_ANIM.hold;
    this.attackTabs.forEach((t, i) => t.setFillStyle(i === this.chosen ? TABS.chosen : TABS.fill));

    // A held handle is drawn with the rider, so the tube only draws its own while it's let go.
    this.cells.forEach(({ rider, x, y, heightIn }, i) => {
      const handle = rider.holdsFarHandle(frame) ? 0 : 1;
      const tube = tubeTextures(this, { width: TUBE_WIDTH, handle, crisp: true });
      const bob = Math.sin(this.clock * BOB.speed + i * 1.3) * BOB.height;
      rider.place(tube, x, y + bob, TEXEL * TEXELS_PER_UNIT, { heightIn, frame });
    });

    const now = stage ? `${LAB_ATTACKS[this.attack.index].label}: ${stage.label}` : 'HOLD';
    const colors = this.ownColors ? 'OWN COLORS' : "DAN'S COLORS";
    this.readout.setText(`${now}   AUTO ${this.autoAttack ? 'ON' : 'OFF'}${this.slowMotion ? '   SLOW' : ''}   ${colors}`);
  }
}
