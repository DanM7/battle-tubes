import Phaser from 'phaser';
import { WIDTH, HEIGHT, DIFFICULTIES, TRUNKS_COLORS, MAX_GRIP, CUSTOM } from '../config.js';
import { CHARACTERS } from '../characters.js';
import { Rider } from '../rider.js';
import { drawRider } from '../draw.js';
import { newCampaign, riderOptions, customRiderOptions, isUnlocked, unlockText, displayName } from '../campaign.js';
import { customRider, customRiderCount, customName, newCustomRider, saveCustomRider, deleteCustomRider } from '../customRiders.js';
import { enduranceRating, pointsLeft } from '../build.js';
import { addBackButton, preloadBackground, addBackground } from './ui.js';
import { addText } from '../pixelFont.js';
import { IS_MOBILE } from '../device.js';

const TITLE_X = 440; // centered between the back button and the year
const GRID_AREA = { x: 36, y: 82, w: 400, h: 350 }; // the grid sizes itself to fit in here
const GRID_CENTER_X = GRID_AREA.x + GRID_AREA.w / 2;
const CELL_GAP = 10;
const SECTION_GAP = 12; // extra space between the custom row and the rest
const MAX_CELL = 108;
const MIN_COLS = 4; // the grid is at least this many riders wide
// The custom row's scroll buttons, at its two ends: at least minW wide (they take up what
// the row's riders leave), with a chevron chevronW by chevronH.
const ARROW = { minW: 30, chevronW: 12, chevronH: 30, fill: 0x245a9c, hover: 0x2f74c4 };
const ARROW_OFF_ALPHA = 0.35; // nothing more that way
// At MAX_CELL; everything inside a cell scales with it.
const NAME_STRIP = 22;
const PORTRAIT_SCALE = 0.37;
const PANEL = { x: 452, y: 82, w: 476, h: 418 };
const PANEL_ALPHA = 0.92; // nearly solid, so faded locked riders stand out from the background
const PANEL_CENTER_X = PANEL.x + PANEL.w / 2;
const NAME_Y = PANEL.y + 26;
const NAME_BOX = { w: 320, h: 40 };
const NAME_PLACEHOLDER = 'ENTER NAME';
const STATS_X = 676;
const LABEL_ABOVE = 24; // a stat's label sits this far above its row
// Where the stat rows are centered: a custom rider's leave room below for build points and
// trunks; a CHARACTERS entry's spread down the panel.
const STAT_ROWS = {
  custom: { height: 174, grip: 234, endurance: 292, style: 316 },
  preset: { height: 206, grip: 270, endurance: 334, style: 360 },
};
const POINTS_Y = 322;
const STEP_BUTTON = 32;
const STEPPER_W = 224; // [-] value [+]
const STEPPER_MID = STATS_X + STEPPER_W / 2;
const DELETE_Y = 386;
const GRIP_COLOR = 0x7dff7d;
const ENDURANCE_COLOR = 0xff9f43;
const PREVIEW = { x: 562, s: 0.95 };
const PREVIEW_Y = { custom: 366, preset: 426 }; // where the preview tube sits on the water
const FEET_Y = 452; // a CHARACTERS entry's sprite stands on this line...
const SPRITE_PX_PER_INCH = 3.9; // ...this tall per inch of their height
const UNLOCK = { x: PANEL.x + 28, y: 476 }; // the lock, then "Beat ... to unlock" after it
const HEAD_CROP = 0.3; // a grid spot shows a square this fraction of the sprite's height, from its top
const SWATCH = 34;
const SWATCH_GAP = 10;
const SWATCH_Y = 450;
const HIGHLIGHT = 0xffdd55;
const LOCKED_ALPHA = 0.3;
const MYSTERY_GRAY = 0x8a8f98;
const MYSTERY_DARK = 0x5f646d;

// Remembered between visits: the last highlighted cell per mode, and the unfinished ladder
// per mode that the player backed out of (READY carries it on).
const memory = { cell: {}, ladder: {} };

// Shortens `str` with a trailing '.' until `text` is no wider than `maxW`.
function setFittedText(text, str, maxW) {
  text.setText(str);
  for (let n = str.length - 1; text.width > maxW && n > 0; n--) text.setText(`${str.slice(0, n)}.`);
}

const formatHeight = (inches) => `${Math.floor(inches / 12)}'${inches % 12}"`;
const swatchLeft = (count) => PANEL.x + (PANEL.w - (count * (SWATCH + SWATCH_GAP) - SWATCH_GAP)) / 2;

// The scrolling custom row on top, then `rosterCount` riders below it: at least MIN_COLS
// columns, more (and smaller cells) as the roster grows. at(row, col) is that spot's center.
// The custom row fits topCols riders between its two arrowW-wide scroll buttons;
// topAt(i) is the center of the i-th spot in view.
function gridLayout(rosterCount) {
  const cols = Math.max(MIN_COLS, Math.ceil(Math.sqrt(MIN_COLS + rosterCount)));
  const rows = 1 + Math.ceil(rosterCount / cols);
  const cell = Math.floor(
    Math.min(
      MAX_CELL,
      (GRID_AREA.w - (cols - 1) * CELL_GAP) / cols,
      (GRID_AREA.h - (rows - 1) * CELL_GAP - SECTION_GAP) / rows,
    ),
  );
  const width = cols * cell + (cols - 1) * CELL_GAP;
  const left = GRID_AREA.x + (GRID_AREA.w - width) / 2;
  const at = (row, col) => ({
    x: left + col * (cell + CELL_GAP) + cell / 2,
    y: GRID_AREA.y + row * (cell + CELL_GAP) + (row > 0 ? SECTION_GAP : 0) + cell / 2,
  });
  const step = cell + CELL_GAP;
  const topCols = Math.floor((width - 2 * ARROW.minW - CELL_GAP) / step);
  const topWidth = topCols * step - CELL_GAP;
  const arrowW = (width - topWidth) / 2 - CELL_GAP;
  const topAt = (i) => ({ x: left + arrowW + CELL_GAP + i * step + cell / 2, y: at(0, 0).y });
  return { cell, k: cell / MAX_CELL, cols, left, right: left + width, at, topCols, topAt, arrowW };
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

// 1-player rider select for one mode. The grid's top row scrolls sideways: unlocked secret
// CHARACTERS, then the player's own custom riders, then a + for a new one. Below are the
// other CHARACTERS with this mode's names and stats, locked until you beat them in this
// mode, then a "???" spot that's always locked. On the right, the highlighted rider idles
// on their tube next to their stats. A custom rider's stats are editable and it gets a
// trunks picker; CHARACTERS always wear their own trunks.
//
// Each slot is { row, col, x, y, shown } plus `custom` (that rider's index; `plus` too for
// the + at the end) or a CHARACTERS entry `c`, or `mystery`. The top row's col counts from
// the start of the row, not the part scrolled into view.
export class PlayerSelectScene extends Phaser.Scene {
  constructor() {
    super('PlayerSelect');
  }

  preload() {
    preloadBackground(this);
    for (const c of CHARACTERS) {
      const key = this.spriteOf(c);
      if (key && !this.textures.exists(key)) this.load.image(key, c.sprites[this.difficulty]);
    }
  }

  init(data) {
    this.difficulty = data.difficulty ?? 'hard';
    if (data.campaign) memory.ladder[this.difficulty] = data.campaign;
  }

  create() {
    this.secrets = CHARACTERS.filter((c) => c.secret && isUnlocked(this.difficulty, c));
    this.roster = [...CHARACTERS.filter((c) => !c.secret).map((c) => ({ c })), { mystery: true }];
    this.grid = gridLayout(this.roster.length);
    this.scroll = 0; // how many of the custom row's riders are scrolled off to the left

    addBackground(this);
    addText(this, TITLE_X, 42, 'CHOOSE YOUR RIDER', { scale: 4, color: '#ffdd55' }).setOrigin(0.5);
    const { year, label } = DIFFICULTIES[this.difficulty];
    addText(this, WIDTH - 16, 18, `${year} (${label})`, { scale: 2, color: '#ffdd55' }).setOrigin(1, 0);
    const ladder = memory.ladder[this.difficulty];
    if (ladder) {
      const progress = `LADDER: RUNG ${ladder.rung + 1} OF ${ladder.order.length}`;
      addText(this, WIDTH - 16, 46, progress, { scale: 2, color: '#7dff7d', font: 'small' }).setOrigin(1, 0);
    }
    addBackButton(this, 'Difficulty');

    // 'grid' (arrows move between riders), or a custom rider's panel row: 'name', 'height',
    // 'grip' or 'trunks'.
    this.focus = 'grid';
    this.deleteArmed = false;
    this.cellObjects = [];
    this.makeGrid();
    this.rebuild();
    this.cell = Math.min(memory.cell[this.difficulty] ?? 0, this.slots.length - 1);
    this.scrollToSlot();
    this.makePanel();
    this.makeReadyButton();
    this.hint = addText(this, WIDTH / 2, HEIGHT - 20, '', { scale: 2, color: '#e8f6ff' }).setOrigin(0.5);

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

  // A saved custom rider (rather than the +).
  get isSaved() {
    return this.isCustom && !this.slot.plus;
  }

  get locked() {
    return this.isLocked(this.slot);
  }

  isLocked(s) {
    return Boolean(s.mystery) || (s.c !== undefined && !isUnlocked(this.difficulty, s.c));
  }

  // The panel rows the keyboard moves through, top to bottom (none for CHARACTERS).
  get rows() {
    return this.isCustom ? ['name', 'height', 'grip', 'trunks'] : [];
  }

  // The texture key of CHARACTERS entry `c`'s sprite in this mode, or null if they're drawn.
  spriteOf(c) {
    return c?.sprites?.[this.difficulty] ? `rider-sprite-${this.difficulty}-${c.id}` : null;
  }

  customOf(index) {
    return customRider(this.difficulty, index) ?? this.draft;
  }

  // Remakes the slots after custom riders are added or deleted.
  rebuild() {
    const count = customRiderCount(this.difficulty);
    // What the + shows until you change something (which saves it as a new rider).
    this.draft = newCustomRider(this.difficulty, count);
    const top = [
      ...this.secrets.map((c) => ({ c })),
      ...Array.from({ length: count }, (_, i) => ({ custom: i })),
      ...(count < CUSTOM.maxRiders ? [{ custom: count, plus: true }] : []),
    ];
    const { cols, at } = this.grid;
    this.slots = [
      ...top.map((entry, col) => ({ row: 0, col, ...entry })),
      ...this.roster.map((entry, i) => {
        const row = 1 + Math.floor(i / cols);
        return { row, col: i % cols, ...at(row, i % cols), shown: true, ...entry };
      }),
    ];
    this.topCount = top.length;
    this.previews = this.slots.map((_, i) => this.makePreview(i));
    this.cell = Math.min(this.cell ?? 0, this.slots.length - 1);
    this.buildCells();
  }

  get maxScroll() {
    return Math.max(0, this.topCount - this.grid.topCols);
  }

  scrollBy(dir) {
    const scroll = Phaser.Math.Clamp(this.scroll + dir, 0, this.maxScroll);
    if (scroll === this.scroll) return;
    this.scroll = scroll;
    this.buildCells();
    this.refresh();
  }

  // Scrolls the custom row so the highlighted slot is in view.
  scrollToSlot() {
    const { row, col } = this.slot;
    const { topCols } = this.grid;
    const scroll = row > 0 ? this.scroll : Phaser.Math.Clamp(this.scroll, col - topCols + 1, col);
    if (scroll === this.scroll) return;
    this.scroll = scroll;
    this.buildCells();
  }

  makePreview(i) {
    const s = this.slots[i];
    if (s.mystery) return null;
    const options = s.c ? riderOptions(s.c, this.difficulty) : customRiderOptions(this.customOf(s.custom));
    const rider = new Rider({ ...options, side: 1 });
    rider.x = 0;
    return rider;
  }

  slotName(s) {
    if (s.mystery) return '???';
    if (s.plus) return 'NEW';
    return (s.c ? displayName(s.c, this.difficulty) : customName(this.customOf(s.custom))).toUpperCase();
  }

  // What stays put: the drawn portraits, the highlight and the custom row's scroll arrows.
  // The cells themselves are made by buildCells().
  makeGrid() {
    this.portraits = this.add.graphics().setDepth(2);
    this.lockedPortraits = this.add.graphics().setDepth(2).setAlpha(LOCKED_ALPHA);
    this.plusG = this.add.graphics().setDepth(2);
    this.highlight = this.add.graphics().setDepth(4);
    this.arrowG = this.add.graphics().setDepth(3);
    const { left, right, arrowW, cell } = this.grid;
    const { y } = this.grid.at(0, 0);
    this.arrows = [-1, 1].map((dir) => {
      const x = dir < 0 ? left + arrowW / 2 : right - arrowW / 2;
      const arrow = { dir, x, y, hover: false };
      const hit = this.add.zone(x, y, arrowW, cell).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.scrollBy(dir));
      const hover = (on) => () => {
        arrow.hover = on;
        this.drawArrows();
      };
      hit.on('pointerover', hover(true));
      hit.on('pointerout', hover(false));
      return arrow;
    });
    this.input.on('wheel', (pointer, over, dx, dy) => {
      if (Math.abs(pointer.y - y) <= this.grid.cell / 2) this.scrollBy(Math.sign(dy || dx));
    });
  }

  // The cells in view: their backgrounds, headshots, locks, names and click spots.
  buildCells() {
    this.cellObjects?.forEach((o) => o.destroy());
    this.scroll = Math.min(this.scroll, this.maxScroll);
    const { cell, k, topCols, topAt } = this.grid;
    for (const s of this.slots) {
      if (s.row > 0) continue;
      const view = s.col - this.scroll;
      s.shown = view >= 0 && view < topCols;
      Object.assign(s, topAt(Phaser.Math.Clamp(view, 0, topCols - 1)));
    }
    const strip = NAME_STRIP * k;
    const g = this.add.graphics().setDepth(1);
    const locks = this.add.graphics().setDepth(3);
    this.cellObjects = [g, locks];
    this.cellNames = this.slots.map((s, i) => {
      if (!s.shown) return null;
      const left = s.x - cell / 2;
      const top = s.y - cell / 2;
      const locked = this.isLocked(s);
      g.fillStyle(locked ? 0x2a2f3a : s.row > 0 ? 0x1d4e89 : 0x245a9c, 1);
      g.fillRect(left, top, cell, cell);
      g.fillStyle(0x000000, 0.45);
      g.fillRect(left, top + cell - strip, cell, strip);
      g.lineStyle(2, 0xffffff, 0.7);
      g.strokeRect(left, top, cell, cell);
      if (this.spriteOf(s.c)) this.cellObjects.push(this.addHeadshot(s));
      if (locked) drawLock(locks, left + cell - 20 * k, top + 14 * k, 26 * k);
      if (s.mystery) {
        const mark = addText(this, s.x, s.y - strip / 2, '?', { scale: Math.max(2, Math.round(6 * k)), color: '#9aa3b2' });
        this.cellObjects.push(mark.setOrigin(0.5).setDepth(3));
      }

      const hit = this.add.zone(s.x, s.y, cell, cell).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.select(i));
      const name = addText(this, s.x, top + cell - strip / 2, '', { scale: 2, color: locked ? '#9aa3b2' : '#ffffff', font: 'small' });
      this.cellObjects.push(hit, name);
      return name.setOrigin(0.5).setDepth(3);
    });
    this.drawArrows();
  }

  drawArrows() {
    const g = this.arrowG;
    g.clear();
    const { arrowW, cell } = this.grid;
    const { chevronW: w, chevronH: h } = ARROW;
    for (const { dir, x, y, hover } of this.arrows) {
      const more = dir < 0 ? this.scroll > 0 : this.scroll < this.maxScroll;
      const alpha = more ? 1 : ARROW_OFF_ALPHA;
      g.fillStyle(more && hover ? ARROW.hover : ARROW.fill, alpha);
      g.fillRect(x - arrowW / 2, y - cell / 2, arrowW, cell);
      g.lineStyle(2, 0xffffff, 0.7 * alpha);
      g.strokeRect(x - arrowW / 2, y - cell / 2, arrowW, cell);
      g.lineStyle(5, 0xffffff, alpha);
      g.beginPath();
      g.moveTo(x - (dir * w) / 2, y - h / 2);
      g.lineTo(x + (dir * w) / 2, y);
      g.lineTo(x - (dir * w) / 2, y + h / 2);
      g.strokePath();
    }
  }

  // The top middle of a rider's sprite (head and shoulders), filling the spot above the name.
  addHeadshot(s) {
    const { cell, k } = this.grid;
    const image = this.add.image(s.x, s.y - cell / 2, this.spriteOf(s.c)).setOrigin(0.5, 0).setDepth(2);
    const side = Math.min(image.height * HEAD_CROP, image.width);
    image.setCrop((image.width - side) / 2, 0, side, side);
    image.setScale((cell - NAME_STRIP * k) / side);
    if (this.isLocked(s)) image.setAlpha(LOCKED_ALPHA);
    return image;
  }

  drawPortraits() {
    this.portraits.clear();
    this.lockedPortraits.clear();
    this.plusG.clear();
    const { cell, k } = this.grid;
    this.slots.forEach((s, i) => {
      if (!s.shown || s.mystery || this.spriteOf(s.c)) return;
      if (s.plus) return this.drawPlus(s);
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
    g.fillStyle(0x0d2a4a, PANEL_ALPHA);
    g.fillRoundedRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 12);
    g.lineStyle(3, 0xffffff, 0.8);
    g.strokeRoundedRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 12);

    this.nameText = addText(this, PANEL_CENTER_X, NAME_Y, '', { scale: 2 }).setOrigin(0.5);
    this.makeNameInput();
    this.previewG = this.add.graphics();
    this.previewSprite = this.add.image(PREVIEW.x, FEET_Y, '__DEFAULT').setOrigin(0.5, 1).setVisible(false);

    // Rows are moved into place by refresh().
    const stat = (str, color = '#ffffff') => addText(this, STATS_X, 0, str, { scale: 1, color }).setOrigin(0, 0.5);
    this.statLabels = { height: stat('HEIGHT', '#ffdd55'), grip: stat('GRIP STRENGTH', '#ffdd55'), endurance: stat('ENDURANCE', '#ffdd55') };
    this.heightText = stat('');
    this.gripG = this.add.graphics();
    this.enduranceG = this.add.graphics();
    const styleWrap = PANEL.x + PANEL.w - STATS_X - 12;
    this.styleText = addText(this, STATS_X, 0, '', { scale: 1, color: '#e8f6ff', wrap: styleWrap, font: 'small' });
    this.pointsLabel = addText(this, STEPPER_MID, POINTS_Y, 'BUILD POINTS LEFT', { scale: 1, color: '#ffdd55', font: 'small' }).setOrigin(0.5);
    this.pointsText = addText(this, STEPPER_MID, POINTS_Y + 20, '', { scale: 2 }).setOrigin(0.5);

    const left = STATS_X + STEP_BUTTON / 2;
    const right = STATS_X + STEPPER_W - STEP_BUTTON / 2;
    const rows = STAT_ROWS.custom;
    this.steppers = [
      this.makeStepButton(left, rows.height, 'height', -1),
      this.makeStepButton(right, rows.height, 'height', 1),
      this.makeStepButton(left, rows.grip, 'grip', -1),
      this.makeStepButton(right, rows.grip, 'grip', 1),
    ];

    this.deleteButton = this.add
      .rectangle(STEPPER_MID, DELETE_Y, 150, 34, 0x9b2226)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.deleteText = addText(this, STEPPER_MID, DELETE_Y, '', { scale: 1 }).setOrigin(0.5);
    this.deleteButton.on('pointerover', () => this.deleteButton.setFillStyle(0xbf2a30));
    this.deleteButton.on('pointerout', () => this.deleteButton.setFillStyle(0x9b2226));
    this.deleteButton.on('pointerdown', () => this.pressDelete());

    // In the same spot, for the new rider on the +: saves it, once it has a name.
    this.addButton = this.add
      .rectangle(STEPPER_MID, DELETE_Y, 150, 34, 0x2f7d32)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.addLabel = addText(this, STEPPER_MID, DELETE_Y, 'ADD', { scale: 1 }).setOrigin(0.5);
    this.addButton.on('pointerover', () => this.addButton.setFillStyle(0x3e9e42));
    this.addButton.on('pointerout', () => this.addButton.setFillStyle(0x2f7d32));
    this.addButton.on('pointerdown', () => this.pressAdd());

    this.trunksLabel = addText(this, PANEL_CENTER_X, SWATCH_Y - 30, 'TRUNKS', { scale: 1, color: '#ffdd55' }).setOrigin(0.5);
    this.swatchG = this.add.graphics();
    this.swatchZones = [];

    this.lockG = this.add.graphics();
    drawLock(this.lockG, UNLOCK.x, UNLOCK.y - 3, 30);
    const textX = UNLOCK.x + 24;
    this.unlockText = addText(this, textX, UNLOCK.y, '', { scale: 1, color: '#ffdd55', wrap: PANEL.x + PANEL.w - 16 - textX }).setOrigin(0, 0.5);
  }

  // A real text box, so phones bring up their keyboard, but invisible: the box, the name
  // and the cursor are drawn in pixel font underneath it. Typing always goes at the end.
  makeNameInput() {
    this.nameBox = this.add
      .rectangle(PANEL_CENTER_X, NAME_Y, NAME_BOX.w, NAME_BOX.h, 0x0b1d2a)
      .setStrokeStyle(3, 0xffffff);
    this.nameEntry = addText(this, PANEL_CENTER_X, NAME_Y, '', { scale: 2 }).setOrigin(0.5);
    this.nameCursor = this.add.rectangle(0, NAME_Y, 4, 16, 0xffdd55);

    const node = document.createElement('input');
    node.type = 'text';
    node.maxLength = CUSTOM.nameMaxLength;
    node.autocomplete = 'off';
    node.spellcheck = false;
    Object.assign(node.style, {
      width: `${NAME_BOX.w}px`,
      height: `${NAME_BOX.h}px`,
      boxSizing: 'border-box',
      color: 'transparent',
      caretColor: 'transparent',
      background: 'transparent',
      border: 'none',
      outline: 'none',
    });
    this.nameInput = this.add.dom(PANEL_CENTER_X, NAME_Y, node);

    const caretToEnd = () => node.setSelectionRange(node.value.length, node.value.length);
    node.addEventListener('input', () => this.editCustom({ name: node.value }));
    node.addEventListener('click', caretToEnd);
    node.addEventListener('focus', () => {
      requestAnimationFrame(caretToEnd);
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
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home') return e.preventDefault();
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
    const text = addText(this, x, y, dir < 0 ? '-' : '+', { scale: 2 }).setOrigin(0.5);
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
    this.readyText = addText(this, GRID_CENTER_X, y, 'READY!', { scale: 4 }).setOrigin(0.5);
    this.ready.on('pointerover', () => this.ready.setFillStyle(0x3e9e42));
    this.ready.on('pointerout', () => this.ready.setFillStyle(0x2f7d32));
    this.ready.on('pointerup', () => this.confirm());
  }

  select(i) {
    this.cell = i;
    this.scrollToSlot();
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

  // Arrow keys on the grid: to the next slot that way (scrolling the custom row along), or
  // the nearest one in view in the next row.
  move(dx, dy) {
    const { row, col } = this.slot;
    const candidates = this.slots
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => (dy ? s.row === row + dy && s.shown : s.row === row && s.col === col + dx));
    if (candidates.length === 0) return;
    const distance = ({ s }) => Math.abs(s.x - this.slot.x);
    this.select(candidates.reduce((a, b) => (distance(b) < distance(a) ? b : a)).i);
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
      if (this.rows.length === 0) return this.confirm();
      this.setFocus(this.rows[0]);
    } else {
      const rows = this.rows;
      const r = rows.indexOf(this.focus);
      if (code === 'ArrowUp') this.setFocus(r > 0 ? rows[r - 1] : 'grid');
      else if (code === 'ArrowDown' && r < rows.length - 1) this.setFocus(rows[r + 1]);
      else if (code === 'Backspace') this.setFocus('grid');
      else if (code === 'ArrowLeft' || code === 'ArrowRight') return this.adjust(code === 'ArrowLeft' ? -1 : 1);
      else if (code === 'Enter' || code === 'Space') return this.slot.plus ? this.pressAdd() : this.confirm();
      else return;
    }
    this.refresh();
  }

  // Left/right on the focused panel row.
  adjust(dir) {
    if (this.focus === 'height' || this.focus === 'grip') return this.step(this.focus, dir);
    if (this.focus !== 'trunks') return;
    const current = Math.max(0, TRUNKS_COLORS.indexOf(this.currentTrunks()));
    this.setTrunks(TRUNKS_COLORS[(current + dir + TRUNKS_COLORS.length) % TRUNKS_COLORS.length]);
  }

  // The custom rider after one step of `stat`, or null if that's past its limits or budget.
  stepped(stat, dir) {
    const r = this.customOf(this.slot.custom);
    const next =
      stat === 'height'
        ? { ...r, heightIn: Phaser.Math.Clamp(r.heightIn + dir, CUSTOM.minHeightIn, CUSTOM.maxHeightIn) }
        : { ...r, grip: Phaser.Math.Clamp(r.grip + dir, 1, MAX_GRIP) };
    if (next.heightIn === r.heightIn && next.grip === r.grip) return null;
    return dir > 0 && pointsLeft(next) < 0 ? null : next;
  }

  step(stat, dir) {
    const next = this.stepped(stat, dir);
    if (next) return this.editCustom({ heightIn: next.heightIn, grip: next.grip });
    if (dir > 0) this.flashPoints();
  }

  // Out of build points.
  flashPoints() {
    this.tweens.killTweensOf(this.pointsText);
    this.pointsText.setScale(1).setColor('#ff6b6b');
    this.tweens.add({
      targets: this.pointsText,
      scale: 1.3,
      duration: 90,
      yoyo: true,
      onComplete: () => this.pointsText.setColor('#ffffff'),
    });
  }

  // Changing anything about a saved custom rider saves it. The new rider on the + is only
  // saved by ADD (or READY), once it has a name.
  editCustom(change) {
    const index = this.slot.custom;
    if (this.slot.plus) this.draft = { ...this.draft, ...change };
    else saveCustomRider(this.difficulty, index, { ...this.customOf(index), ...change });
    this.previews[this.cell] = this.makePreview(this.cell);
    this.refresh();
  }

  get needsName() {
    return Boolean(this.slot.plus) && !this.draft.name.trim();
  }

  // Sends you to the name box instead.
  askForName() {
    this.shake();
    this.setFocus('name');
    this.refresh();
  }

  // Saves the new rider on the +, with a new + after it.
  pressAdd() {
    if (this.needsName) return this.askForName();
    saveCustomRider(this.difficulty, this.slot.custom, this.draft);
    this.rebuild();
    this.select(this.cell);
  }

  // Custom riders only.
  currentTrunks() {
    return this.customOf(this.slot.custom).trunks;
  }

  setTrunks(color) {
    this.editCustom({ trunks: color });
  }

  // Asks once, deletes on the second press.
  pressDelete() {
    if (!this.deleteArmed) {
      this.deleteArmed = true;
      return this.refresh();
    }
    deleteCustomRider(this.difficulty, this.slot.custom);
    this.rebuild();
    this.select(this.cell);
  }

  shake() {
    this.cameras.main.shake(120, 0.004);
  }

  confirm() {
    if (this.locked) return this.shake();
    if (this.needsName) return this.askForName();
    memory.cell[this.difficulty] = this.cell;
    let player;
    if (this.isCustom) {
      const rider = this.customOf(this.slot.custom);
      saveCustomRider(this.difficulty, this.slot.custom, rider);
      player = { custom: { ...rider } };
    } else {
      player = { id: this.slot.c.id };
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
    this.cellNames.forEach((text, i) => text && setFittedText(text, this.slotName(this.slots[i]), this.grid.cell - 8));
    this.drawPortraits();

    const stats = s.mystery ? {} : custom ? this.customOf(s.custom) : s.c.stats[this.difficulty];
    this.nameText.setVisible(!custom).setText(custom ? '' : this.slotName(s));
    this.nameInput.setVisible(custom);
    this.nameBox.setVisible(custom);
    const typed = custom ? stats.name.toUpperCase() : '';
    this.nameEntry.setVisible(custom).setText(typed || NAME_PLACEHOLDER).setColor(typed ? '#ffffff' : '#6f8296');
    const rows = custom ? STAT_ROWS.custom : STAT_ROWS.preset;
    for (const [key, label] of Object.entries(this.statLabels)) label.setY(rows[key] - LABEL_ABOVE);
    this.heightText.setText(s.mystery ? '??' : formatHeight(stats.heightIn)).setY(rows.height);
    if (custom) this.heightText.setOrigin(0.5).setX(STEPPER_MID);
    else this.heightText.setOrigin(0, 0.5).setX(STATS_X);
    if (s.mystery) {
      this.drawPips(this.gripG, rows.grip, MAX_GRIP, false, MYSTERY_GRAY);
      this.drawPips(this.enduranceG, rows.endurance, MAX_GRIP, false, MYSTERY_GRAY);
    } else {
      this.drawPips(this.gripG, rows.grip, stats.grip, custom, GRIP_COLOR);
      this.drawPips(this.enduranceG, rows.endurance, enduranceRating(stats.heightIn), custom, ENDURANCE_COLOR);
    }
    this.steppers.forEach(({ stat, dir, rect, text }) => {
      const alpha = custom && this.stepped(stat, dir) ? 1 : 0.4;
      rect.setVisible(custom).setAlpha(alpha);
      text.setVisible(custom).setAlpha(alpha);
    });
    this.styleText.setText(s.mystery || custom ? '' : s.c.style).setY(rows.style);
    this.pointsLabel.setVisible(custom);
    this.pointsText.setVisible(custom);
    if (custom) this.pointsText.setText(`${pointsLeft(stats)} OF ${CUSTOM.buildPoints}`);
    this.deleteButton.setVisible(this.isSaved);
    this.deleteText.setVisible(this.isSaved).setText(this.deleteArmed ? 'SURE?' : 'DELETE');
    const needsName = this.needsName;
    this.nameBox.setStrokeStyle(3, needsName ? HIGHLIGHT : 0xffffff);
    this.addButton.setVisible(Boolean(s.plus)).setAlpha(needsName ? 0.4 : 1);
    this.addLabel.setVisible(Boolean(s.plus)).setAlpha(needsName ? 0.4 : 1);
    this.previewG.setAlpha(locked && !s.mystery ? LOCKED_ALPHA : 1);
    const sprite = this.spriteOf(s.c);
    this.previewSprite.setVisible(sprite !== null).setAlpha(locked ? LOCKED_ALPHA : 1);
    if (sprite) {
      const tall = stats.heightIn * SPRITE_PX_PER_INCH;
      this.previewSprite.setTexture(sprite).setScale(tall / this.previewSprite.height);
    }

    this.trunksLabel.setVisible(custom);
    this.swatchG.setVisible(custom);
    this.lockG.setVisible(locked);
    this.unlockText.setVisible(locked);
    if (locked) this.unlockText.setText(s.mystery ? '????' : unlockText(this.difficulty, s.c));
    if (custom) this.makeSwatches(TRUNKS_COLORS, this.currentTrunks());
    else this.makeSwatches([], null);

    this.ready.setAlpha(locked ? 0.4 : 1);
    this.readyText.setAlpha(locked ? 0.4 : 1);

    const enter = s.plus ? 'Enter: add' : 'Enter: ride!';
    const keys = {
      grid: custom ? 'Arrows: choose rider    Enter: select' : 'Arrows: choose rider    Enter: ride!',
      name: 'Type a name    ↓ next    ↑ back to riders',
      trunks: `← → trunks color    ↑ ↓ choose    ${enter}`,
    }[this.focus] ?? `← → change    ↑ ↓ choose    ${enter}`;
    this.hint.setText(IS_MOBILE ? 'Tap + to make your own rider, or pick one, then READY!' : keys);
  }

  // A 1-to-5 stat as a row of boxes, `filled` of them lit; centered under the steppers for
  // custom riders.
  drawPips(g, y, filled, custom, color) {
    g.clear();
    const width = custom ? 24 : 30;
    const step = custom ? 28 : 36;
    const left = custom ? STEPPER_MID - (MAX_GRIP * step - (step - width)) / 2 : STATS_X;
    for (let i = 0; i < MAX_GRIP; i++) {
      g.fillStyle(i < filled ? color : 0x000000, i < filled ? 1 : 0.4);
      g.fillRoundedRect(left + i * step, y - 8, width, 16, 4);
      g.lineStyle(2, 0xffffff, 0.8);
      g.strokeRoundedRect(left + i * step, y - 8, width, 16, 4);
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
        return stepper(STAT_ROWS.custom.height);
      case 'grip':
        return stepper(STAT_ROWS.custom.grip);
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

    const typing = this.focus === 'name' && this.isCustom;
    const empty = this.nameInput.node.value === '';
    const cursorX = empty ? PANEL_CENTER_X - this.nameEntry.width / 2 - 8 : PANEL_CENTER_X + this.nameEntry.width / 2 + 6;
    this.nameCursor.setVisible(typing && Math.sin(t * 7) > 0).setX(cursorX);

    const h = this.highlight;
    h.clear();
    const { x, y, shown } = this.slot;
    const { cell } = this.grid;
    if (shown) {
      h.lineStyle(5, HIGHLIGHT, this.focus === 'grid' ? pulse : 1);
      h.strokeRect(x - cell / 2 - 2, y - cell / 2 - 2, cell + 4, cell + 4);
    }
    const box = this.focusBox();
    if (box) {
      h.lineStyle(3, HIGHLIGHT, pulse);
      h.strokeRoundedRect(box.x, box.y, box.w, box.h, 8);
    }

    // Idle: floating on the water, swaying side to side.
    const g = this.previewG;
    g.clear();
    if (this.spriteOf(this.slot.c)) return;
    const waterY = this.isCustom ? PREVIEW_Y.custom : PREVIEW_Y.preset;
    const floatY = waterY + Math.sin(t * 2.3) * 3;
    g.fillStyle(0x2f7fc1, 1);
    g.fillEllipse(PREVIEW.x, waterY + 6, 212, 40);
    g.lineStyle(2, 0xbfe9ff, 0.5 + 0.3 * Math.sin(t * 2.3));
    g.strokeEllipse(PREVIEW.x, waterY + 6, 190 + Math.sin(t * 2.3) * 8, 30);
    if (this.slot.mystery) return drawMysteryRider(g, PREVIEW.x, floatY);
    const rider = this.previews[this.cell];
    rider.leanVisual = Math.sin(t * 1.7) * 0.35;
    drawRider(g, rider, { x: PREVIEW.x, y: floatY, s: PREVIEW.s }, t);
  }
}
