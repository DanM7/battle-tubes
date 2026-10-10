import Phaser from 'phaser';
import { WIDTH, HEIGHT, DIFFICULTIES, TRUNKS_COLORS, MAX_GRIP, CUSTOM } from '../config.js';
import { CHARACTERS } from '../characters.js';
import { Rider } from '../rider.js';
import { drawRider } from '../draw.js';
import { newCampaign, riderOptions, customRiderOptions, isUnlocked, unlockText, displayName } from '../campaign.js';
import { customRider, customName, newCustomRider, saveCustomRider, deleteCustomRider } from '../customRiders.js';
import { addBackButton } from './ui.js';

const FONT = 'Arial Black, Arial, sans-serif';
const GRID_AREA = { x: 36, y: 82, w: 400, h: 350 }; // the grid sizes itself to fit in here
const GRID_CENTER_X = GRID_AREA.x + GRID_AREA.w / 2;
const CELL_GAP = 10;
const SECTION_GAP = 12; // extra space between the custom row and the rest
const MAX_CELL = 108;
// At MAX_CELL; everything inside a cell scales with it.
const NAME_STRIP = 22;
const NAME_SIZE = 13;
const PORTRAIT_SCALE = 0.37;
const PANEL = { x: 452, y: 82, w: 476, h: 418 };
const PANEL_CENTER_X = PANEL.x + PANEL.w / 2;
const NAME_Y = PANEL.y + 30;
const NAME_BOX = { w: 260, h: 40 };
const STATS_X = 676;
const HEIGHT_ROW_Y = 178;
const GRIP_ROW_Y = 248;
const STEP_BUTTON = 32;
const STEPPER_W = 224; // [-] value [+]
const STEPPER_MID = STATS_X + STEPPER_W / 2;
const DELETE_Y = 374;
const PREVIEW = { x: 562, y: 366, s: 0.95 }; // where the preview tube sits on the water
const SWATCH = 34;
const SWATCH_GAP = 10;
const SWATCH_Y = 450;
const HIGHLIGHT = 0xffdd55;
const LOCKED_ALPHA = 0.3;
const CUSTOM_BLURB = 'Your own rider. Taller riders reach farther; more grip means less damage taken.';
const MYSTERY_GRAY = 0x8a8f98;
const MYSTERY_DARK = 0x5f646d;

// Remembered between visits: the last highlighted cell per mode, each rider's trunks, and
// the unfinished ladder per mode that the player backed out of (READY carries it on).
const memory = { cell: {}, trunks: {}, ladder: {} };

const textStyle = (size, color = '#ffffff') => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  color,
  stroke: '#000000',
  strokeThickness: Math.max(3, Math.round(size / 6)),
});

const formatHeight = (inches) => `${Math.floor(inches / 12)}'${inches % 12}"`;

// The select screen offers the rider's own default trunks color too, if it isn't one of TRUNKS_COLORS.
const trunksPalette = (c) => (TRUNKS_COLORS.includes(c.trunks) ? TRUNKS_COLORS : [c.trunks, ...TRUNKS_COLORS]);

const swatchLeft = (count) => PANEL.x + (PANEL.w - (count * (SWATCH + SWATCH_GAP) - SWATCH_GAP)) / 2;

// The custom row on top, then `roster` below it. At least CUSTOM.slots columns; more (and
// smaller cells) as the roster grows. Each slot is { row, col, x, y } plus `custom` (its
// custom slot number), or its `roster` entry: { c } (a CHARACTERS entry) or { mystery }.
function gridLayout(roster) {
  const cols = Math.max(CUSTOM.slots, Math.ceil(Math.sqrt(CUSTOM.slots + roster.length)));
  const rows = 1 + Math.ceil(roster.length / cols);
  const cell = Math.floor(
    Math.min(
      MAX_CELL,
      (GRID_AREA.w - (cols - 1) * CELL_GAP) / cols,
      (GRID_AREA.h - (rows - 1) * CELL_GAP - SECTION_GAP) / rows,
    ),
  );
  const left = GRID_AREA.x + (GRID_AREA.w - (cols * cell + (cols - 1) * CELL_GAP)) / 2;
  const at = (row, col) => ({
    row,
    col,
    x: left + col * (cell + CELL_GAP) + cell / 2,
    y: GRID_AREA.y + row * (cell + CELL_GAP) + (row > 0 ? SECTION_GAP : 0) + cell / 2,
  });
  const slots = [
    ...Array.from({ length: CUSTOM.slots }, (_, i) => ({ ...at(0, i), custom: i })),
    ...roster.map((entry, i) => ({ ...at(1 + Math.floor(i / cols), i % cols), ...entry })),
  ];
  return { cell, k: cell / MAX_CELL, slots };
}

// A padlock centered on (x, y), `size` pixels tall.
function drawLock(g, x, y, size) {
  const k = size / 100;
  g.lineStyle(13 * k, 0xc0c6d0, 1);
  g.beginPath();
  g.arc(x, y - 12 * k, 26 * k, Math.PI, 0);
  g.strokePath();
  g.lineBetween(x - 26 * k, y - 12 * k, x - 26 * k, y + 4 * k);
  g.lineBetween(x + 26 * k, y - 12 * k, x + 26 * k, y + 4 * k);
  g.fillStyle(0xd4a017, 1);
  g.fillRoundedRect(x - 42 * k, y, 84 * k, 62 * k, 10 * k);
  g.fillStyle(0x3b2a05, 1);
  g.fillCircle(x, y + 26 * k, 9 * k);
  g.fillRect(x - 4 * k, y + 26 * k, 8 * k, 20 * k);
}

// The always-locked "???" rider in the last grid spot.
function drawMysteryRider(g, x, y) {
  g.fillStyle(MYSTERY_DARK, 1);
  g.fillRect(x - 48, y - 118, 96, 118);
  g.fillStyle(MYSTERY_GRAY, 1);
  g.fillRect(x - 28, y - 176, 56, 56);
}

// 1-player rider select for one mode. The grid's top row is the player's own custom riders
// (a + on empty slots); below are CHARACTERS with this mode's names and stats, locked until
// you beat them in this mode, then a "???" spot that's always locked. On the right, the
// highlighted rider idles on their tube next to their stats and a trunks picker; for a
// custom slot those are editable.
export class PlayerSelectScene extends Phaser.Scene {
  constructor() {
    super('PlayerSelect');
  }

  init(data) {
    this.difficulty = data.difficulty ?? 'hard';
    if (data.campaign) memory.ladder[this.difficulty] = data.campaign;
  }

  create() {
    this.grid = gridLayout([...CHARACTERS.map((c) => ({ c })), { mystery: true }]);
    this.slots = this.grid.slots;
    // What an empty custom slot shows until you change something (which saves it).
    this.drafts = Array.from({ length: CUSTOM.slots }, (_, i) => newCustomRider(this.difficulty, i));

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x5fb8f5, 0x5fb8f5, 0x1d5f99, 0x1d5f99, 1);
    bg.fillRect(0, 0, WIDTH, HEIGHT);
    this.add.text(WIDTH / 2, 42, 'CHOOSE YOUR RIDER', textStyle(32, '#ffdd55')).setOrigin(0.5);
    const { year, label } = DIFFICULTIES[this.difficulty];
    this.add.text(WIDTH - 16, 18, `${year} (${label})`, textStyle(16, '#ffdd55')).setOrigin(1, 0);
    const ladder = memory.ladder[this.difficulty];
    if (ladder) {
      const progress = `LADDER: RUNG ${ladder.rung + 1} OF ${ladder.order.length}`;
      this.add.text(WIDTH - 16, 42, progress, textStyle(13, '#7dff7d')).setOrigin(1, 0);
    }
    addBackButton(this);

    this.cell = Math.min(memory.cell[this.difficulty] ?? 0, this.slots.length - 1);
    // 'grid' (arrows move between riders), or a panel row: 'name', 'height', 'grip' (custom
    // riders only) or 'trunks'.
    this.focus = 'grid';
    this.deleteArmed = false;
    this.previews = this.slots.map((_, i) => this.makePreview(i));

    this.makeGrid();
    this.makePanel();
    this.makeReadyButton();
    this.hint = this.add.text(GRID_CENTER_X, HEIGHT - 20, '', textStyle(13, '#e8f6ff')).setOrigin(0.5);

    this.input.keyboard.on('keydown', (e) => this.onKey(e.code));
    // Phaser keeps the browser from moving focus off the name box when the canvas is clicked.
    this.input.on('pointerdown', () => this.nameInput.node.blur());
    this.syncNameInput();
    this.refresh();
  }

  get slot() {
    return this.slots[this.cell];
  }

  get isCustom() {
    return this.slot.custom !== undefined;
  }

  // A custom slot that holds a saved rider (rather than a +).
  get isSaved() {
    return this.isCustom && customRider(this.difficulty, this.slot.custom) !== null;
  }

  get locked() {
    return this.isLocked(this.slot);
  }

  isLocked(s) {
    return Boolean(s.mystery) || (s.c !== undefined && !isUnlocked(this.difficulty, s.c));
  }

  // The panel rows the keyboard moves through, top to bottom.
  get rows() {
    return this.isCustom ? ['name', 'height', 'grip', 'trunks'] : ['trunks'];
  }

  customOf(slot) {
    return customRider(this.difficulty, slot) ?? this.drafts[slot];
  }

  trunksOf(c) {
    return memory.trunks[`${this.difficulty}:${c.id}`] ?? c.trunks;
  }

  makePreview(i) {
    const s = this.slots[i];
    if (s.mystery) return null;
    const options = s.c ? riderOptions(s.c, this.difficulty, this.trunksOf(s.c)) : customRiderOptions(this.customOf(s.custom));
    const rider = new Rider({ ...options, side: 1 });
    rider.x = 0;
    return rider;
  }

  slotName(s) {
    if (s.mystery) return '???';
    return (s.c ? displayName(s.c, this.difficulty) : customName(this.customOf(s.custom))).toUpperCase();
  }

  makeGrid() {
    const { cell, k } = this.grid;
    const strip = NAME_STRIP * k;
    const g = this.add.graphics();
    this.portraits = this.add.graphics();
    this.lockedPortraits = this.add.graphics().setAlpha(LOCKED_ALPHA);
    this.plusG = this.add.graphics();
    const locks = this.add.graphics();
    this.cellNames = this.slots.map((s, i) => {
      const left = s.x - cell / 2;
      const top = s.y - cell / 2;
      const locked = this.isLocked(s);
      g.fillStyle(locked ? 0x2a2f3a : s.c ? 0x1d4e89 : 0x245a9c, 1);
      g.fillRect(left, top, cell, cell);
      g.fillStyle(0x000000, 0.45);
      g.fillRect(left, top + cell - strip, cell, strip);
      g.lineStyle(2, 0xffffff, 0.7);
      g.strokeRect(left, top, cell, cell);
      if (locked) drawLock(locks, left + cell - 20 * k, top + 14 * k, 26 * k);
      if (s.mystery) this.add.text(s.x, s.y - strip / 2, '?', textStyle(Math.round(56 * k), '#9aa3b2')).setOrigin(0.5);

      const hit = this.add.zone(s.x, s.y, cell, cell).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.select(i));
      return this.add
        .text(s.x, top + cell - strip / 2, '', textStyle(Math.round(NAME_SIZE * k), locked ? '#9aa3b2' : '#ffffff'))
        .setOrigin(0.5);
    });
    this.highlight = this.add.graphics();
  }

  drawPortraits() {
    this.portraits.clear();
    this.lockedPortraits.clear();
    this.plusG.clear();
    const { cell, k } = this.grid;
    this.slots.forEach((s, i) => {
      if (s.mystery) return;
      if (s.c === undefined && !customRider(this.difficulty, s.custom)) return this.drawPlus(s);
      const g = this.isLocked(s) ? this.lockedPortraits : this.portraits;
      drawRider(g, this.previews[i], { x: s.x, y: s.y + cell / 2 - (NAME_STRIP + 5) * k, s: PORTRAIT_SCALE * k }, 0);
    });
  }

  drawPlus({ x, y }) {
    const { cell, k } = this.grid;
    const cy = y - (NAME_STRIP * k) / 2;
    const arm = cell * 0.22;
    const thick = 12 * k;
    this.plusG.fillStyle(0xffffff, 0.85);
    this.plusG.fillRoundedRect(x - arm, cy - thick / 2, arm * 2, thick, thick / 2);
    this.plusG.fillRoundedRect(x - thick / 2, cy - arm, thick, arm * 2, thick / 2);
  }

  makePanel() {
    const g = this.add.graphics();
    g.fillStyle(0x0d2a4a, 0.75);
    g.fillRoundedRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 12);
    g.lineStyle(3, 0xffffff, 0.8);
    g.strokeRoundedRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 12);

    this.nameText = this.add.text(PANEL_CENTER_X, NAME_Y, '', textStyle(30)).setOrigin(0.5);
    this.makeNameInput();
    this.previewG = this.add.graphics();

    const stat = (y, str, size, color) => this.add.text(STATS_X, y, str, textStyle(size, color)).setOrigin(0, 0.5);
    stat(150, 'HEIGHT', 16, '#ffdd55');
    this.heightText = stat(HEIGHT_ROW_Y, '', 28);
    stat(218, 'GRIP STRENGTH', 16, '#ffdd55');
    this.gripG = this.add.graphics();
    this.styleText = this.add
      .text(STATS_X, 276, '', { ...textStyle(13, '#e8f6ff'), strokeThickness: 3, wordWrap: { width: PANEL.x + PANEL.w - STATS_X - 16 } })
      .setOrigin(0, 0);

    const left = STATS_X + STEP_BUTTON / 2;
    const right = STATS_X + STEPPER_W - STEP_BUTTON / 2;
    this.steppers = [
      this.makeStepButton(left, HEIGHT_ROW_Y, 'height', -1),
      this.makeStepButton(right, HEIGHT_ROW_Y, 'height', 1),
      this.makeStepButton(left, GRIP_ROW_Y, 'grip', -1),
      this.makeStepButton(right, GRIP_ROW_Y, 'grip', 1),
    ];

    this.deleteButton = this.add
      .rectangle(STEPPER_MID, DELETE_Y, 150, 34, 0x9b2226)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.deleteText = this.add.text(STEPPER_MID, DELETE_Y, '', textStyle(16)).setOrigin(0.5);
    this.deleteButton.on('pointerover', () => this.deleteButton.setFillStyle(0xbf2a30));
    this.deleteButton.on('pointerout', () => this.deleteButton.setFillStyle(0x9b2226));
    this.deleteButton.on('pointerdown', () => this.pressDelete());

    this.trunksLabel = this.add.text(PANEL_CENTER_X, SWATCH_Y - 36, 'TRUNKS', textStyle(16, '#ffdd55')).setOrigin(0.5);
    this.swatchG = this.add.graphics();
    this.swatchZones = [];

    this.lockG = this.add.graphics();
    drawLock(this.lockG, PANEL_CENTER_X, SWATCH_Y - 46, 44);
    this.unlockText = this.add
      .text(PANEL_CENTER_X, SWATCH_Y + 20, '', { ...textStyle(18, '#ffdd55'), align: 'center' })
      .setOrigin(0.5);
  }

  // A real text box, so phones bring up their keyboard.
  makeNameInput() {
    const node = document.createElement('input');
    node.type = 'text';
    node.maxLength = CUSTOM.nameMaxLength;
    node.placeholder = 'ENTER NAME';
    node.autocomplete = 'off';
    node.spellcheck = false;
    Object.assign(node.style, {
      width: `${NAME_BOX.w}px`,
      height: `${NAME_BOX.h}px`,
      boxSizing: 'border-box',
      padding: '0 8px',
      font: `22px ${FONT}`,
      textAlign: 'center',
      textTransform: 'uppercase',
      color: '#ffffff',
      background: '#0b1d2a',
      border: '3px solid #ffffff',
      borderRadius: '8px',
      outline: 'none',
      userSelect: 'text',
      webkitUserSelect: 'text',
    });
    this.nameInput = this.add.dom(PANEL_CENTER_X, NAME_Y, node);

    node.addEventListener('input', () => this.editCustom({ name: node.value }));
    node.addEventListener('focus', () => {
      this.focus = 'name';
      this.deleteArmed = false;
      this.refresh();
    });
    node.addEventListener('blur', () => {
      if (this.focus !== 'name' || !this.scene.isActive()) return;
      this.focus = 'grid';
      this.refresh();
    });
    // Keys typed here are for the name only, not the scene's keyboard controls.
    node.addEventListener('keyup', (e) => e.stopPropagation());
    node.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'Tab') this.setFocus('height');
      else if (e.key === 'ArrowUp' || e.key === 'Escape') this.setFocus('grid');
      else return;
      e.preventDefault();
      this.refresh();
    });
  }

  makeStepButton(x, y, stat, dir) {
    const rect = this.add
      .rectangle(x, y, STEP_BUTTON, STEP_BUTTON, 0x1d4e89)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y - 1, dir < 0 ? '−' : '+', textStyle(22)).setOrigin(0.5);
    rect.on('pointerover', () => rect.setFillStyle(0x2a6bb8));
    rect.on('pointerout', () => rect.setFillStyle(0x1d4e89));
    rect.on('pointerdown', () => {
      this.setFocus(stat);
      this.step(stat, dir);
    });
    return { stat, dir, rect, text };
  }

  makeReadyButton() {
    const y = GRID_AREA.y + GRID_AREA.h + 34;
    this.ready = this.add.rectangle(GRID_CENTER_X, y, 300, 52, 0x2f7d32).setStrokeStyle(3, 0xffffff).setInteractive({ useHandCursor: true });
    this.readyText = this.add.text(GRID_CENTER_X, y, 'READY!', textStyle(26)).setOrigin(0.5);
    this.ready.on('pointerover', () => this.ready.setFillStyle(0x3e9e42));
    this.ready.on('pointerout', () => this.ready.setFillStyle(0x2f7d32));
    this.ready.on('pointerup', () => this.confirm());
  }

  select(i) {
    this.cell = i;
    this.setFocus('grid');
    this.deleteArmed = false;
    this.syncNameInput();
    this.refresh();
  }

  setFocus(focus) {
    this.focus = focus;
    if (focus === 'name') this.nameInput.node.focus();
    else this.nameInput.node.blur();
  }

  syncNameInput() {
    this.nameInput.node.value = this.isCustom ? this.customOf(this.slot.custom).name : '';
  }

  // Arrow keys on the grid: to the next slot that way, or the nearest one in the next row.
  move(dx, dy) {
    const { row, col } = this.slot;
    const candidates = this.slots
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => (dy ? s.row === row + dy : s.row === row && s.col === col + dx));
    if (candidates.length === 0) return;
    const nearest = candidates.reduce((a, b) => (Math.abs(b.s.col - col) < Math.abs(a.s.col - col) ? b : a));
    this.select(nearest.i);
  }

  onKey(code) {
    if (this.focus === 'grid') {
      if (code === 'ArrowLeft') return this.move(-1, 0);
      if (code === 'ArrowRight') return this.move(1, 0);
      if (code === 'ArrowUp') return this.move(0, -1);
      if (code === 'ArrowDown') return this.move(0, 1);
      if (code === 'Delete' && this.isSaved) return this.pressDelete();
      if (code !== 'Enter' && code !== 'Space') return;
      if (this.locked) return this.shake();
      this.setFocus(this.rows[0]);
    } else {
      const rows = this.rows;
      const r = rows.indexOf(this.focus);
      if (code === 'ArrowUp') this.setFocus(r > 0 ? rows[r - 1] : 'grid');
      else if (code === 'ArrowDown' && r < rows.length - 1) this.setFocus(rows[r + 1]);
      else if (code === 'Backspace') this.setFocus('grid');
      else if (code === 'ArrowLeft' || code === 'ArrowRight') return this.adjust(code === 'ArrowLeft' ? -1 : 1);
      else if (code === 'Enter' || code === 'Space') return this.confirm();
      else return;
    }
    this.refresh();
  }

  // Left/right on the focused panel row.
  adjust(dir) {
    if (this.focus === 'height' || this.focus === 'grip') return this.step(this.focus, dir);
    if (this.focus !== 'trunks') return;
    const palette = this.palette();
    const current = Math.max(0, palette.indexOf(this.currentTrunks()));
    this.setTrunks(palette[(current + dir + palette.length) % palette.length]);
  }

  step(stat, dir) {
    const r = this.customOf(this.slot.custom);
    if (stat === 'height') this.editCustom({ heightIn: Phaser.Math.Clamp(r.heightIn + dir, CUSTOM.minHeightIn, CUSTOM.maxHeightIn) });
    else this.editCustom({ grip: Phaser.Math.Clamp(r.grip + dir, 1, MAX_GRIP) });
  }

  // Changing anything about a custom rider saves it (so a + slot becomes a rider).
  editCustom(change) {
    const slot = this.slot.custom;
    saveCustomRider(this.difficulty, slot, { ...this.customOf(slot), ...change });
    this.previews[this.cell] = this.makePreview(this.cell);
    this.refresh();
  }

  palette() {
    return this.isCustom ? TRUNKS_COLORS : trunksPalette(this.slot.c);
  }

  currentTrunks() {
    return this.isCustom ? this.customOf(this.slot.custom).trunks : this.trunksOf(this.slot.c);
  }

  setTrunks(color) {
    if (this.isCustom) return this.editCustom({ trunks: color });
    memory.trunks[`${this.difficulty}:${this.slot.c.id}`] = color;
    this.previews[this.cell].trunks = color;
    this.refresh();
  }

  // Asks once, deletes on the second press.
  pressDelete() {
    if (!this.deleteArmed) {
      this.deleteArmed = true;
      return this.refresh();
    }
    const slot = this.slot.custom;
    deleteCustomRider(this.difficulty, slot);
    this.drafts[slot] = newCustomRider(this.difficulty, slot);
    this.previews[this.cell] = this.makePreview(this.cell);
    this.select(this.cell);
  }

  shake() {
    this.cameras.main.shake(120, 0.004);
  }

  confirm() {
    if (this.locked) return this.shake();
    memory.cell[this.difficulty] = this.cell;
    let player;
    if (this.isCustom) {
      const rider = this.customOf(this.slot.custom);
      saveCustomRider(this.difficulty, this.slot.custom, rider);
      player = { custom: { ...rider } };
    } else {
      player = { id: this.slot.c.id, trunks: this.trunksOf(this.slot.c) };
    }
    const ladder = memory.ladder[this.difficulty];
    delete memory.ladder[this.difficulty];
    const campaign = ladder ? { ...ladder, player } : newCampaign(this.difficulty, player);
    this.scene.start('Ladder', { campaign });
  }

  // Everything that depends on the highlighted rider or the focus.
  refresh() {
    const s = this.slot;
    const custom = this.isCustom;
    const locked = this.locked;
    if (locked) this.focus = 'grid';
    this.cellNames.forEach((text, i) => text.setText(this.slotName(this.slots[i])));
    this.drawPortraits();

    const stats = s.mystery ? {} : custom ? this.customOf(s.custom) : s.c.stats[this.difficulty];
    this.nameText.setVisible(!custom).setText(custom ? '' : this.slotName(s));
    this.nameInput.setVisible(custom);
    this.heightText.setText(s.mystery ? '??' : formatHeight(stats.heightIn));
    if (custom) this.heightText.setOrigin(0.5).setX(STEPPER_MID);
    else this.heightText.setOrigin(0, 0.5).setX(STATS_X);
    if (s.mystery) this.drawGrip(MAX_GRIP, false, MYSTERY_GRAY);
    else this.drawGrip(stats.grip, custom);
    this.steppers.forEach(({ stat, dir, rect, text }) => {
      const value = stat === 'height' ? stats.heightIn : stats.grip;
      const limit = stat === 'height' ? (dir < 0 ? CUSTOM.minHeightIn : CUSTOM.maxHeightIn) : dir < 0 ? 1 : MAX_GRIP;
      const alpha = value === limit ? 0.4 : 1;
      rect.setVisible(custom).setAlpha(alpha);
      text.setVisible(custom).setAlpha(alpha);
    });
    this.styleText.setText(s.mystery ? '' : custom ? CUSTOM_BLURB : s.c.style);
    this.deleteButton.setVisible(this.isSaved);
    this.deleteText.setVisible(this.isSaved).setText(this.deleteArmed ? 'SURE?' : 'DELETE');
    this.previewG.setAlpha(locked && !s.mystery ? LOCKED_ALPHA : 1);

    this.trunksLabel.setVisible(!locked);
    this.swatchG.setVisible(!locked);
    this.lockG.setVisible(locked);
    this.unlockText.setVisible(locked);
    if (locked) this.unlockText.setText(s.mystery ? '????' : unlockText(this.difficulty, s.c));
    if (locked) this.makeSwatches([], null);
    else this.makeSwatches(this.palette(), this.currentTrunks());

    this.ready.setAlpha(locked ? 0.4 : 1);
    this.readyText.setAlpha(locked ? 0.4 : 1);

    const touch = this.sys.game.device.input.touch;
    const keys = {
      grid: 'Arrows: choose rider    Enter: select',
      name: 'Type a name    ↓ next    ↑ back to riders',
      trunks: custom ? '← → trunks color    ↑ ↓ choose    Enter: ride!' : '← → trunks color    Enter: ride!    ↑ back to riders',
    }[this.focus] ?? '← → change    ↑ ↓ choose    Enter: ride!';
    this.hint.setText(touch ? 'Tap + to make your own rider, or pick one, then READY!' : keys);
  }

  drawGrip(grip, custom, color = 0x7dff7d) {
    const g = this.gripG;
    g.clear();
    const width = custom ? 24 : 30;
    const step = custom ? 28 : 36;
    const left = custom ? STEPPER_MID - (MAX_GRIP * step - (step - width)) / 2 : STATS_X;
    for (let i = 0; i < MAX_GRIP; i++) {
      g.fillStyle(i < grip ? color : 0x000000, i < grip ? 1 : 0.4);
      g.fillRoundedRect(left + i * step, GRIP_ROW_Y - 8, width, 16, 4);
      g.lineStyle(2, 0xffffff, 0.8);
      g.strokeRoundedRect(left + i * step, GRIP_ROW_Y - 8, width, 16, 4);
    }
  }

  makeSwatches(palette, selected) {
    this.swatchZones.forEach((z) => z.destroy());
    const g = this.swatchG;
    g.clear();
    const left = swatchLeft(palette.length);
    this.swatchLeft = left;
    this.swatchZones = palette.map((color, i) => {
      const x = left + i * (SWATCH + SWATCH_GAP);
      const chosen = color === selected;
      const grow = chosen ? 4 : 0;
      g.fillStyle(color, 1);
      g.fillRoundedRect(x - grow, SWATCH_Y - SWATCH / 2 - grow, SWATCH + grow * 2, SWATCH + grow * 2, 6);
      g.lineStyle(chosen ? 4 : 2, 0xffffff, chosen ? 1 : 0.6);
      g.strokeRoundedRect(x - grow, SWATCH_Y - SWATCH / 2 - grow, SWATCH + grow * 2, SWATCH + grow * 2, 6);

      const zone = this.add.zone(x + SWATCH / 2, SWATCH_Y, SWATCH + SWATCH_GAP, SWATCH + 8).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.setFocus('trunks');
        this.setTrunks(color);
      });
      return zone;
    });
  }

  // The outline around the focused panel row, if any.
  focusBox() {
    const stepper = (y) => ({ x: STATS_X - 6, y: y - STEP_BUTTON / 2 - 4, w: STEPPER_W + 12, h: STEP_BUTTON + 8 });
    switch (this.focus) {
      case 'name':
        return { x: PANEL_CENTER_X - NAME_BOX.w / 2 - 8, y: NAME_Y - NAME_BOX.h / 2 - 8, w: NAME_BOX.w + 16, h: NAME_BOX.h + 16 };
      case 'height':
        return stepper(HEIGHT_ROW_Y);
      case 'grip':
        return stepper(GRIP_ROW_Y);
      case 'trunks': {
        const w = this.swatchZones.length * (SWATCH + SWATCH_GAP) - SWATCH_GAP + 20;
        return { x: this.swatchLeft - 10, y: SWATCH_Y - SWATCH / 2 - 10, w, h: SWATCH + 20 };
      }
      default:
        return null;
    }
  }

  update(time) {
    const t = time / 1000;
    const pulse = 0.65 + 0.35 * Math.sin(t * 6);

    const h = this.highlight;
    h.clear();
    const { x, y } = this.slot;
    const { cell } = this.grid;
    h.lineStyle(5, HIGHLIGHT, this.focus === 'grid' ? pulse : 1);
    h.strokeRect(x - cell / 2 - 2, y - cell / 2 - 2, cell + 4, cell + 4);
    const box = this.focusBox();
    if (box) {
      h.lineStyle(3, HIGHLIGHT, pulse);
      h.strokeRoundedRect(box.x, box.y, box.w, box.h, 8);
    }

    // Idle: floating on the water, swaying side to side.
    const g = this.previewG;
    g.clear();
    const floatY = PREVIEW.y + Math.sin(t * 2.3) * 3;
    g.fillStyle(0x2f7fc1, 1);
    g.fillEllipse(PREVIEW.x, PREVIEW.y + 6, 212, 40);
    g.lineStyle(2, 0xbfe9ff, 0.5 + 0.3 * Math.sin(t * 2.3));
    g.strokeEllipse(PREVIEW.x, PREVIEW.y + 6, 190 + Math.sin(t * 2.3) * 8, 30);
    if (this.slot.mystery) return drawMysteryRider(g, PREVIEW.x, floatY);
    const rider = this.previews[this.cell];
    rider.leanVisual = Math.sin(t * 1.7) * 0.35;
    drawRider(g, rider, { x: PREVIEW.x, y: floatY, s: PREVIEW.s }, t);
  }
}
