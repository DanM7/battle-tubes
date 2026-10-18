import Phaser from 'phaser';
import { WIDTH, HEIGHT, DIFFICULTIES, MAX_GRIP, CUSTOM } from '../config.js';
import { CHARACTERS } from '../characters.js';
import { Rider } from '../rider.js';
import { newCampaign, riderOptions, customRiderOptions, isUnlocked, unlockText, displayName, spriteKey, characterArt } from '../campaign.js';
import { customRider, customRiderCount, customName, newCustomRider, saveCustomRider, deleteCustomRider } from '../customRiders.js';
import { encodeCustomRider } from '../customCode.js';
import { playSfx, ensureMenuMusic } from '../audio.js';
import { enduranceRating, pointsLeft } from '../build.js';
import {
  TubeRider,
  preloadRiderAnim,
  loadRiderAnim,
  isRiderAnimLoaded,
  buildAnim,
  attackAnim,
  genderBuilds,
  hairStyleLabel,
  BUILDS,
  GENDERS,
  HAIR_STYLES,
  ART_SCALE,
  ATTACK_ANIM,
} from '../riderArt.js';
import { SKIN_TONES, HAIR_COLORS, TRUNKS_COLORS, riderTexture } from '../riderColors.js';
import { tubeTextures, TEXELS_PER_UNIT, TUBE_WIDTH } from '../tubeArt.js';
import { addBackButton, preloadBackground, addBackground, addColorPicker } from './ui.js';
import { addText, fontToFit } from '../pixelFont.js';
import { enterScene, leaveTo } from '../navigate.js';

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
const PANEL = { x: 452, y: 82, w: 476, h: 418 };
const PANEL_ALPHA = 0.92; // nearly solid, so faded locked riders stand out from the background
const PANEL_CENTER_X = PANEL.x + PANEL.w / 2;
const NAME_Y = PANEL.y + 26;
const NAME_BOX = { w: 320, h: 40 };
const NAME_PLACEHOLDER = 'ENTER NAME';
const STATS_X = 676;
const LABEL_ABOVE = 24; // a stat's label sits this far above its row
// A custom rider's tabs, under the name box, and the panel rows the keyboard moves through
// on each.
const TABS = [
  { id: 'body', label: 'BODY', rows: ['gender', 'build'] },
  { id: 'stats', label: 'STATS', rows: ['height', 'grip'] },
  { id: 'skin', label: 'SKIN', rows: ['color', 'shading'] },
  { id: 'hair', label: 'HAIR', rows: ['color', 'shading', 'hairStyle'] },
  { id: 'trunks', label: 'SUIT', rows: ['color', 'shading'] },
  { id: 'face', label: 'FACE', rows: [] }, // placeholder until face art ships
];
const TAB = { y: NAME_Y + 44, w: 68, h: 28, gap: 4, fill: 0x1d4e89, hover: 0x2a6bb8, chosen: 0x2f7d32 };
const TABS_W = TABS.length * (TAB.w + TAB.gap) - TAB.gap;
const TABS_LEFT = PANEL.x + (PANEL.w - TABS_W) / 2;
// Where the stat rows are centered: a custom rider's on the STATS tab, with build points
// below; a CHARACTERS entry's spread down the panel.
const STAT_ROWS = {
  custom: { height: 206, grip: 262, endurance: 318 },
  preset: { height: 206, grip: 270, endurance: 334, style: 360 },
};
const POINTS_Y = 356;
const STEP_BUTTON = 32;
const STEPPER_W = 224; // [-] value [+]
const STEPPER_MID = STATS_X + STEPPER_W / 2;
// SAVE, EXPORT, DELETE sit under the custom panel; the preview sits above them.
const BUTTON_ROW = { y: 470, w: 120, h: 36, gap: 14 };
const GRIP_COLOR = 0x7dff7d;
const ENDURANCE_COLOR = 0xff9f43;
// The SKIN, HAIR and TRUNKS tabs: swatches (picture colors) in rows of `cols`, then a
// CUSTOM color, then how strongly the color is shaded.
const PALETTES = { skin: SKIN_TONES, hair: HAIR_COLORS, trunks: TRUNKS_COLORS };
const COLOR_GRID = { y: 200, size: 32, gap: 10, cols: 5 };
const COLOR_GRID_LEFT = STEPPER_MID - (COLOR_GRID.cols * (COLOR_GRID.size + COLOR_GRID.gap) - COLOR_GRID.gap) / 2;
const PICKER = { y: 290, w: 200, h: 32 };
const SHADING = { y: 350, step: 0.1, min: 0.3, max: 2 };
// BODY and HAIR (under shading): steppers through a list for that look key.
const CHOICES = {
  hairStyle: { tab: 'hair', label: 'HAIR STYLE', y: 400, list: (look) => HAIR_STYLES[look.gender] },
  gender: { tab: 'body', label: 'GENDER', y: 206, list: () => GENDERS },
  build: { tab: 'body', label: 'BUILD', y: 270, list: (look) => genderBuilds(look.gender) },
};
// FACE tab placeholder (disabled until face art ships).
const FACE = { typeY: 220, glassesY: 300, box: 28 };
const PREVIEW = { x: 562, s: 0.95 };
const PLAYER_TUBE = 'green'; // the player's tube in a match (the opponent's is blue)
// Custom preview sits higher so SAVE/DELETE fit under it; presets keep the lower waterline.
const PREVIEW_Y = { custom: 390, preset: 400 };
const ART_TEXEL = 1.3; // how big a custom rider's picture is drawn
const FEET_Y = 420; // a CHARACTERS entry's sprite stands on this line...
const SPRITE_PX_PER_INCH = 3.9; // ...this tall per inch of their height
const UNLOCK = { x: PANEL.x + 28, y: BUTTON_ROW.y }; // the lock, then "Beat ... to unlock" after it
const HEAD_CROP = 0.3; // standing sprites: square this fraction of height, from the top
// Custom hold-frame headshots: square about this share of the frame, centered on the eyes.
const CUSTOM_HEAD_CROP = 0.42;
const HIGHLIGHT = 0xffdd55;
const LOCKED_ALPHA = 0.3;
const MYSTERY_GRAY = 0x8a8f98;
const MYSTERY_STYLE = 'A mysterious rider coming soon...';
const MYSTERY_MARK = { scale: 14, color: '#9aa3b2' }; // the "?" sitting in the "???" rider's tube
const EMPTY_CELL = { fill: 0x245a9c, alpha: 0.25, lineAlpha: 0.3 }; // the custom row's unused spots

// Remembered between visits: the last highlighted cell per mode, and the unfinished ladder
// per mode that the player backed out of (READY carries it on).
const memory = { cell: {}, ladder: {} };

// Shortens `str` with a trailing '.' until `text` is no wider than `maxW`.
function setFittedText(text, str, maxW) {
  text.setText(str);
  for (let n = str.length - 1; text.width > maxW && n > 0; n--) text.setText(`${str.slice(0, n)}.`);
}

const formatHeight = (inches) => `${Math.floor(inches / 12)}'${inches % 12}"`;

// Square crop of the hold frame with the estimated eye point at its center (shows more face
// than a top-aligned crop). `source` is the strip's first frame already drawn or the image.
function eyeCenteredCrop(source, frameWidth, frameHeight) {
  const probe = document.createElement('canvas');
  probe.width = frameWidth;
  probe.height = frameHeight;
  const pctx = probe.getContext('2d', { willReadFrequently: true });
  pctx.drawImage(source, 0, 0, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
  const { data } = pctx.getImageData(0, 0, frameWidth, frameHeight);

  let minX = frameWidth;
  let maxX = 0;
  let minY = frameHeight;
  let maxY = 0;
  for (let y = 0; y < frameHeight; y++) {
    for (let x = 0; x < frameWidth; x++) {
      if (data[(y * frameWidth + x) * 4 + 3] < 200) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  const fallback = () => {
    const side = Math.min(Math.floor(frameHeight * CUSTOM_HEAD_CROP), frameWidth);
    return { sx: Math.floor((frameWidth - side) / 2), sy: 0, side };
  };
  if (maxX < minX) return fallback();

  const bodyH = maxY - minY + 1;
  // Seated riders: head is the top ~28% of the silhouette; eyes sit ~40% down that head.
  const headH = Math.max(8, bodyH * 0.28);
  const eyeX = (minX + maxX) / 2;
  const eyeY = minY + headH * 0.4;
  const side = Math.min(
    Math.max(Math.floor(headH * 2.4), Math.floor(frameHeight * CUSTOM_HEAD_CROP)),
    frameWidth,
    frameHeight,
  );
  const sx = Math.max(0, Math.min(frameWidth - side, Math.round(eyeX - side / 2)));
  const sy = Math.max(0, Math.min(frameHeight - side, Math.round(eyeY - side / 2)));
  return { sx, sy, side };
}

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

// 1-player rider select for one mode. The grid's top row scrolls sideways: only the
// player's own custom riders (shared across 1999 and 2010), then a + for a new one. Below are the roster CHARACTERS
// (locked until you beat them in this mode), then a "???" mystery spot that's always
// locked, then any unlocked bonus/secret riders (Bart, Kara, …). On the right, the
// highlighted rider idles on their tube next to their stats. A custom rider is Dan's
// picture made over: tabs under its name edit its stats (STATS), its skin, hair and suit
// colors, its hair STYLE, and its gender and build (BODY).
// CHARACTERS always look like themselves.
//
// Each slot is { row, col, x, y, shown } plus `custom` (that rider's index; `plus` too for
// the + at the end) or a CHARACTERS entry `c`, or `mystery`. The top row's col counts from
// the start of the row, not the part scrolled into view.
export class PlayerSelectScene extends Phaser.Scene {
  constructor() {
    super('PlayerSelect');
  }

  preload() {
    // A prior visit that called load.start() from create() can leave the loader mid-flight
    // after Back; reset so this entry is not stuck in LOADING forever.
    if (this.load.isLoading()) this.load.reset();
    preloadBackground(this);
    for (const c of CHARACTERS) {
      const key = spriteKey(c, this.difficulty);
      if (key && !this.textures.exists(key)) this.load.image(key, c.sprites[this.difficulty]);
      // Hard (and anyone without a standing picture) uses their attack frames for the grid.
      else if (!key) {
        const anim = attackAnim(c, this.difficulty);
        if (!isRiderAnimLoaded(this, anim)) preloadRiderAnim(this, anim);
      }
    }
    const saved = Array.from({ length: customRiderCount(this.difficulty) }, (_, i) => customRider(this.difficulty, i).look);
    const anims = [...BUILDS.map((build) => buildAnim(build)), ...saved.map(({ build, hairStyle, gender }) => buildAnim(build, hairStyle, gender))];
    for (const anim of anims) if (!isRiderAnimLoaded(this, anim)) preloadRiderAnim(this, anim);
  }

  init(data) {
    this.difficulty = data.difficulty ?? 'hard';
    if (data.campaign) memory.ladder[this.difficulty] = data.campaign;
  }

  create() {
    enterScene(this);
    // Phaser reuses this scene object across visits; drop TubeRiders left from last time
    // (their images were destroyed on shutdown, and setColors on them froze Easy→Back→Easy).
    this.art = null;
    this.presetArt = null;
    ensureMenuMusic();
    const bonus = CHARACTERS.filter((c) => c.secret && isUnlocked(this.difficulty, c)).map((c) => ({ c }));
    this.roster = [...CHARACTERS.filter((c) => !c.secret).map((c) => ({ c })), { mystery: true }, ...bonus];
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

    // 'grid' (arrows move between riders), or a custom rider's panel row: 'name', 'tabs',
    // or one of the shown tab's rows.
    this.focus = 'grid';
    this.tab = TABS[0].id;
    this.deleteArmed = false;
    this.cellObjects = [];
    this.makeGrid();
    this.rebuild();
    this.cell = Math.min(memory.cell[this.difficulty] ?? 0, this.slots.length - 1);
    this.scrollToSlot();
    this.makePanel();
    this.makeReadyButton();

    this.input.keyboard.on('keydown', (e) => this.onKey(e.code));
    // Phaser keeps the browser from moving focus off the name box when the canvas is clicked.
    this.input.on('pointerdown', () => this.nameInput.node.blur());
    this.events.once('shutdown', () => {
      this.nameInput?.node?.blur?.();
      this.picker?.objects?.forEach((o) => {
        if (o.node) o.node.blur?.();
      });
      this.art = null;
      this.presetArt = null;
      // Abort in-flight create()-time loads so Easy → Back → Easy cannot hang the loader.
      this.load.removeAllListeners();
      if (this.load.isLoading()) this.load.reset();
    });
    this.beginEdit();
    this.syncNameInput();
    this.refresh();
  }

  get slot() {
    return this.slots[this.cell];
  }

  get isCustom() {
    return this.slot?.custom !== undefined;
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
    return this.isCustom ? ['name', 'tabs', ...TABS.find((t) => t.id === this.tab).rows] : [];
  }

  // A custom rider's look (see customRiders.js).
  get look() {
    return this.customOf(this.slot.custom).look;
  }

  // The texture key of CHARACTERS entry `c`'s sprite in this mode, or null if they're drawn.
  // Standing picture when they have one; otherwise a hold-frame portrait from their
  // attack strip.
  spriteOf(c) {
    if (!c) return null;
    return spriteKey(c, this.difficulty) ?? this.ensurePortrait(c);
  }

  standingSprite(c) {
    return spriteKey(c, this.difficulty);
  }

  // Crops the hold frame of `c`'s attack strip into a texture, once.
  ensurePortrait(c) {
    const key = `rider-portrait-${this.difficulty}-${c.id}`;
    if (this.textures.exists(key)) return key;
    const anim = attackAnim(c, this.difficulty);
    if (!isRiderAnimLoaded(this, anim)) return null;
    const meta = this.cache.json.get(`${anim.key}-meta`);
    const source = this.textures.get(`${anim.key}-strip`).getSourceImage();
    const canvas = document.createElement('canvas');
    canvas.width = meta.frameWidth;
    canvas.height = meta.frameHeight;
    canvas.getContext('2d').drawImage(source, 0, 0, meta.frameWidth, meta.frameHeight, 0, 0, meta.frameWidth, meta.frameHeight);
    this.textures.addCanvas(key, canvas);
    return key;
  }

  // Idle-stance headshot for a custom rider's grid spot: a square of their hold frame
  // centered on the eyes (so more of the face shows), flipped to face left like standing icons.
  // Loads the anim on first need.
  ensureCustomPortrait(look) {
    const anim = buildAnim(look.build, look.hairStyle, look.gender);
    if (!isRiderAnimLoaded(this, anim)) {
      loadRiderAnim(this, anim, () => {
        if (!this.scene.isActive()) return;
        this.buildCells();
        this.refresh();
      });
      return null;
    }
    const sheet = riderTexture(this, anim, look);
    const key = `custom-portrait:${sheet}`;
    if (this.textures.exists(key)) return key;
    const meta = this.cache.json.get(`${anim.key}-meta`);
    const source = this.textures.get(sheet).getSourceImage();
    const { sx, sy, side } = eyeCenteredCrop(source, meta.frameWidth, meta.frameHeight);
    const canvas = document.createElement('canvas');
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext('2d');
    // Flip so the over-the-shoulder hold face matches the left-facing standing icons.
    ctx.translate(side, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(source, sx, sy, side, side, 0, 0, side, side);
    this.textures.addCanvas(key, canvas);
    return key;
  }

  // The custom rider being edited: the + draft, the working copy of a saved one, or the
  // stored rider when that slot isn't the one on screen. Safe during rebuild()'s preview
  // pass, when this.cell may not point at a slot yet.
  customOf(index) {
    const s = this.slots?.[this.cell];
    if (s && s.custom === index) {
      if (s.plus) return this.draft;
      if (this.edit) return this.edit;
    }
    return customRider(this.difficulty, index) ?? this.draft;
  }

  // True when the on-screen custom rider differs from its last saved (or blank +) state.
  get isDirty() {
    if (!this.isCustom) return false;
    return JSON.stringify(this.customOf(this.slot.custom)) !== this.clean;
  }

  snapshotCustom(rider) {
    return JSON.stringify(rider);
  }

  // Loads a working copy for the highlighted custom slot. The + draft is dirty against a
  // blank new rider (so returning to an edited + still shows SAVE); a saved slot gets a
  // fresh copy from storage (unsaved edits are dropped when you leave it).
  beginEdit() {
    if (!this.isCustom) {
      this.edit = null;
      this.clean = '';
      return;
    }
    if (this.slot.plus) {
      this.edit = null;
      this.clean = this.snapshotCustom(newCustomRider(this.difficulty, this.slot.custom));
      return;
    }
    const saved = customRider(this.difficulty, this.slot.custom);
    this.edit = { ...saved, look: { ...saved.look } };
    this.clean = this.snapshotCustom(this.edit);
  }

  // Remakes the slots after custom riders are added or deleted.
  rebuild() {
    const count = customRiderCount(this.difficulty);
    // What the + shows until SAVE writes it as a new rider.
    this.draft = newCustomRider(this.difficulty, count);
    // Top accordion: created riders only (+ NEW). Bonus unlocks live in the roster below.
    const top = [
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
    this.cell = Math.min(this.cell ?? 0, this.slots.length - 1);
    this.previews = this.slots.map((_, i) => this.makePreview(i));
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
      // + NEW keeps its plus mark (see drawPortraits); saved customs use the idle headshot.
      const head = s.c
        ? this.spriteOf(s.c)
        : s.custom !== undefined && !s.plus
          ? this.ensureCustomPortrait(this.customOf(s.custom).look)
          : null;
      if (head) this.cellObjects.push(this.addHeadshot(s, head));
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
    const shownTop = this.slots.filter((s) => s.row === 0 && s.shown).length;
    for (let i = shownTop; i < topCols; i++) {
      const { x, y } = topAt(i);
      g.fillStyle(EMPTY_CELL.fill, EMPTY_CELL.alpha);
      g.fillRect(x - cell / 2, y - cell / 2, cell, cell);
      g.lineStyle(2, 0xffffff, EMPTY_CELL.lineAlpha);
      g.strokeRect(x - cell / 2, y - cell / 2, cell, cell);
    }
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
  // Custom portraits are already that square (see ensureCustomPortrait); standing sprites crop here.
  addHeadshot(s, textureKey) {
    const { cell, k } = this.grid;
    const image = this.add.image(s.x, s.y - cell / 2, textureKey).setOrigin(0.5, 0).setDepth(2);
    const preCropped = textureKey.startsWith('custom-portrait:');
    const side = preCropped ? Math.min(image.width, image.height) : Math.min(image.height * HEAD_CROP, image.width);
    if (!preCropped) image.setCrop((image.width - side) / 2, 0, side, side);
    image.setScale((cell - NAME_STRIP * k) / side);
    if (this.isLocked(s)) image.setAlpha(LOCKED_ALPHA);
    return image;
  }

  drawPortraits() {
    this.portraits.clear();
    this.lockedPortraits.clear();
    this.plusG.clear();
    this.slots.forEach((s) => {
      if (!s.shown || s.mystery || this.spriteOf(s.c)) return;
      if (s.plus) this.drawPlus(s);
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
    // The "???" rider: a big "?" sitting in a tube, between its back and front halves.
    this.mysteryTube = [
      this.add.image(0, 0, '__DEFAULT'),
      addText(this, 0, 0, '?', { scale: MYSTERY_MARK.scale, color: MYSTERY_MARK.color }).setOrigin(0.5, 1),
      this.add.image(0, 0, '__DEFAULT'),
    ];
    this.previewSprite = this.add.image(PREVIEW.x, FEET_Y, '__DEFAULT').setOrigin(0.5, 1).setVisible(false);

    // Rows are moved into place by refresh().
    const stat = (str, color = '#ffffff') => addText(this, STATS_X, 0, str, { scale: 1, color }).setOrigin(0, 0.5);
    this.statLabels = { height: stat('HEIGHT', '#ffdd55'), grip: stat('GRIP STRENGTH', '#ffdd55'), endurance: stat('ENDURANCE', '#ffdd55') };
    this.heightText = addText(this, STATS_X, 0, '', { scale: 2 }).setOrigin(0, 0.5);
    this.gripG = this.add.graphics();
    this.enduranceG = this.add.graphics();
    const styleWrap = PANEL.x + PANEL.w - STATS_X - 12;
    // Normal body text (not the small font used on tight labels) — custom-editor work
    // had briefly shrunk this to scale 1 / font small.
    this.styleText = addText(this, STATS_X, 0, '', { scale: 2, color: '#e8f6ff', wrap: styleWrap });
    this.pointsLabel = addText(this, STEPPER_MID, POINTS_Y, 'BUILD POINTS LEFT', { scale: 1, color: '#ffdd55', font: 'small' }).setOrigin(0.5);
    this.pointsText = addText(this, STEPPER_MID, POINTS_Y + 20, '', { scale: 2 }).setOrigin(0.5);

    const left = STATS_X + STEP_BUTTON / 2;
    const right = STATS_X + STEPPER_W - STEP_BUTTON / 2;
    const choiceYs = Object.fromEntries(Object.entries(CHOICES).map(([key, { y }]) => [key, y]));
    const stepperYs = { height: STAT_ROWS.custom.height, grip: STAT_ROWS.custom.grip, shading: SHADING.y, ...choiceYs };
    this.steppers = Object.entries(stepperYs).flatMap(([stat, y]) => [
      this.makeStepButton(left, y, stat, -1),
      this.makeStepButton(right, y, stat, 1),
    ]);
    this.makeTabs();
    this.makeColorTabs();
    this.makeFaceTab();
    this.choices = Object.fromEntries(
      Object.entries(CHOICES).map(([key, { label, y }]) => [
        key,
        { label: stat(label, '#ffdd55').setY(y - LABEL_ABOVE), text: addText(this, STEPPER_MID, y, '', { scale: 2 }).setOrigin(0.5) },
      ]),
    );

    const { saveX, exportX, deleteX } = this.buttonXs(true);
    this.saveButton = this.add
      .rectangle(saveX, BUTTON_ROW.y, BUTTON_ROW.w, BUTTON_ROW.h, 0x2f7d32)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.saveLabel = addText(this, saveX, BUTTON_ROW.y, 'SAVE', { scale: 2 }).setOrigin(0.5);
    this.saveButton.on('pointerover', () => this.isDirty && this.saveButton.setFillStyle(0x3e9e42));
    this.saveButton.on('pointerout', () => this.saveButton.setFillStyle(0x2f7d32));
    this.saveButton.on('pointerdown', () => this.pressSave());

    this.exportButton = this.add
      .rectangle(exportX, BUTTON_ROW.y, BUTTON_ROW.w, BUTTON_ROW.h, 0x1d4e89)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.exportLabel = addText(this, exportX, BUTTON_ROW.y, 'EXPORT', { scale: 2 }).setOrigin(0.5);
    this.exportButton.on('pointerover', () => this.exportButton.setFillStyle(0x2a6bb8));
    this.exportButton.on('pointerout', () => this.exportButton.setFillStyle(0x1d4e89));
    this.exportButton.on('pointerdown', () => this.pressExport());

    this.deleteButton = this.add
      .rectangle(deleteX, BUTTON_ROW.y, BUTTON_ROW.w, BUTTON_ROW.h, 0x9b2226)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.deleteText = addText(this, deleteX, BUTTON_ROW.y, 'DELETE', { scale: 2 }).setOrigin(0.5);
    this.deleteButton.on('pointerover', () => this.deleteButton.setFillStyle(0xbf2a30));
    this.deleteButton.on('pointerout', () => this.deleteButton.setFillStyle(0x9b2226));
    this.deleteButton.on('pointerdown', () => this.pressDelete());

    this.exportCodeText = addText(this, PANEL_CENTER_X, BUTTON_ROW.y + 28, '', {
      scale: 1,
      font: 'small',
      color: '#7dff7d',
      wrap: PANEL.w - 16,
    }).setOrigin(0.5, 0).setVisible(false);

    this.lockG = this.add.graphics();
    drawLock(this.lockG, UNLOCK.x, UNLOCK.y - 3, 30);
    const textX = UNLOCK.x + 24;
    this.unlockText = addText(this, textX, UNLOCK.y, '', { scale: 1, color: '#ffdd55', wrap: PANEL.x + PANEL.w - 16 - textX }).setOrigin(0, 0.5);
  }

  makeTabs() {
    const font = fontToFit(this, TABS.map((t) => t.label), TAB.w - 6);
    this.tabButtons = TABS.map(({ id, label }, i) => {
      const x = TABS_LEFT + TAB.w / 2 + i * (TAB.w + TAB.gap);
      const rect = this.add.rectangle(x, TAB.y, TAB.w, TAB.h, TAB.fill).setStrokeStyle(2, 0xffffff).setInteractive({ useHandCursor: true });
      const text = addText(this, x, TAB.y, label, { scale: 2, font }).setOrigin(0.5);
      const fill = (hover) => () => rect.setFillStyle(id === this.tab ? TAB.chosen : hover ? TAB.hover : TAB.fill);
      rect.on('pointerover', fill(true));
      rect.on('pointerout', fill(false));
      rect.on('pointerdown', () => {
        this.setFocus('tabs');
        this.showTab(id);
      });
      return { id, rect, text };
    });
  }

  // Each color tab's swatches; one CUSTOM button and shading row serve them all.
  makeColorTabs() {
    const { y, size, gap, cols } = COLOR_GRID;
    this.swatches = Object.fromEntries(
      Object.entries(PALETTES).map(([part, palette]) => [
        part,
        palette.map((color, i) => {
          const x = COLOR_GRID_LEFT + (i % cols) * (size + gap) + size / 2;
          const rect = this.add.rectangle(x, y + Math.floor(i / cols) * (size + gap), size, size, color).setInteractive({ useHandCursor: true });
          rect.on('pointerdown', () => {
            this.setFocus('color');
            this.editLook({ [part]: color });
          });
          return { color, rect };
        }),
      ]),
    );
    this.picker = addColorPicker(this, STEPPER_MID, PICKER.y, PICKER.w, PICKER.h, {
      open: () => {
        this.focus = 'color';
        this.refresh();
      },
      pick: (color) => this.editLook({ [this.tab]: color }),
    });
    this.shadingLabel = addText(this, STATS_X, SHADING.y - LABEL_ABOVE, 'SHADING', { scale: 1, color: '#ffdd55' }).setOrigin(0, 0.5);
    this.shadingText = addText(this, STEPPER_MID, SHADING.y, '', { scale: 2 }).setOrigin(0.5);
  }

  // FACE tab: face type and glasses, grayed out until that art ships.
  makeFaceTab() {
    const dim = '#9aa3b2';
    this.faceObjects = [
      addText(this, STATS_X, FACE.typeY - LABEL_ABOVE, 'FACE TYPE', { scale: 1, color: dim }).setOrigin(0, 0.5),
      addText(this, STEPPER_MID, FACE.typeY, 'CLASSIC', { scale: 2, color: dim }).setOrigin(0.5),
      this.add.rectangle(STATS_X + FACE.box / 2, FACE.glassesY, FACE.box, FACE.box, 0x3a3f48).setStrokeStyle(2, 0x6a6e76),
      addText(this, STATS_X + FACE.box + 12, FACE.glassesY, 'GLASSES', { scale: 2, color: dim }).setOrigin(0, 0.5),
      addText(this, STEPPER_MID, FACE.glassesY + 50, 'COMING SOON', { scale: 2, color: '#ffdd55' }).setOrigin(0.5),
    ];
    this.faceObjects.forEach((o) => o.setVisible(false).setAlpha(0.55));
  }

  showTab(id) {
    this.tab = id;
    this.refresh();
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
    node.addEventListener('input', () => {
      const name = node.value.toUpperCase();
      if (node.value !== name) {
        const at = node.selectionStart;
        node.value = name;
        node.setSelectionRange(at, at);
      }
      this.editCustom({ name });
    });
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
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'Tab') this.setFocus('tabs');
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
    this.exportCodeText?.setVisible(false);
    if (this.exportLabel?.active) this.exportLabel.setText('EXPORT');
    this.beginEdit();
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
      else if (code === 'Enter' || code === 'Space') return this.slot.plus ? this.pressSave() : this.confirm();
      else return;
    }
    this.refresh();
  }

  // Left/right on the focused panel row.
  adjust(dir) {
    if (this.focus === 'tabs') {
      const i = TABS.findIndex((t) => t.id === this.tab);
      return this.showTab(TABS[(i + dir + TABS.length) % TABS.length].id);
    }
    if (this.focus !== 'color') return this.step(this.focus, dir);
    // From a CUSTOM color, to the first or last swatch.
    const palette = PALETTES[this.tab];
    const i = palette.indexOf(this.look[this.tab]);
    const next = i < 0 ? (dir > 0 ? 0 : palette.length - 1) : (i + dir + palette.length) % palette.length;
    this.editLook({ [this.tab]: palette[next] });
  }

  // The change to the custom rider's look after one step of 'shading' (the shown color
  // tab's) or a CHOICES key, or null if that's past its limits. A new gender starts on
  // its first hair style, in the same build if it comes in it.
  lookStepped(stat, dir) {
    const look = this.look;
    if (CHOICES[stat]) {
      const list = CHOICES[stat].list(look);
      const i = list.indexOf(look[stat]) + dir;
      if (i < 0 || i >= list.length) return null;
      if (stat !== 'gender') return { [stat]: list[i] };
      const gender = list[i];
      return { gender, hairStyle: HAIR_STYLES[gender][0], build: genderBuilds(gender).includes(look.build) ? look.build : 'normal' };
    }
    const key = `${this.tab}Shading`;
    const shading = Phaser.Math.Clamp(Math.round((look[key] + dir * SHADING.step) * 10) / 10, SHADING.min, SHADING.max);
    return shading === look[key] ? null : { [key]: shading };
  }

  canStep(stat, dir) {
    return Boolean(stat === 'height' || stat === 'grip' ? this.stepped(stat, dir) : this.lookStepped(stat, dir));
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
    if (stat === 'shading' || CHOICES[stat]) {
      const change = this.lookStepped(stat, dir);
      if (change) this.editLook(change);
      return;
    }
    const next = this.stepped(stat, dir);
    if (!next) {
      if (dir > 0) this.flashPoints();
      return;
    }
    const before = pointsLeft(this.customOf(this.slot.custom));
    this.editCustom({ heightIn: next.heightIn, grip: next.grip });
    if (pointsLeft(next) < before) playSfx('pickup');
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

  // Edits stay in the working copy until SAVE. The + draft is the working copy for a new one.
  editCustom(change) {
    this.deleteArmed = false;
    if (this.slot.plus) this.draft = { ...this.draft, ...change };
    else this.edit = { ...this.edit, ...change };
    this.previews[this.cell] = this.makePreview(this.cell);
    // Look changes update the idle-stance grid headshot; name-only edits skip the rebuild.
    if (change.look) this.buildCells();
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

  // Writes the working copy: a new rider on the +, or updates to a saved one.
  pressSave() {
    if (!this.isCustom || !this.isDirty) return;
    if (this.needsName) return this.askForName();
    if (this.slot.plus) {
      saveCustomRider(this.difficulty, this.slot.custom, this.draft);
      this.rebuild();
      this.select(this.cell);
      return;
    }
    saveCustomRider(this.difficulty, this.slot.custom, this.edit);
    this.clean = this.snapshotCustom(this.edit);
    this.refresh();
  }

  editLook(change) {
    this.editCustom({ look: { ...this.look, ...change } });
  }

  // Asks once, deletes on the second press.
  pressDelete() {
    if (!this.isSaved) return;
    if (!this.deleteArmed) {
      this.deleteArmed = true;
      return this.refresh();
    }
    deleteCustomRider(this.difficulty, this.slot.custom);
    this.rebuild();
    this.select(this.cell);
  }

  // Centers for SAVE / EXPORT / DELETE. With only SAVE (unsaved +), it sits alone in the middle.
  buttonXs(saved) {
    const step = BUTTON_ROW.w + BUTTON_ROW.gap;
    if (!saved) return { saveX: PANEL_CENTER_X, exportX: PANEL_CENTER_X, deleteX: PANEL_CENTER_X };
    return {
      saveX: PANEL_CENTER_X - step,
      exportX: PANEL_CENTER_X,
      deleteX: PANEL_CENTER_X + step,
    };
  }

  // Packs the on-screen custom rider into a base-36 share code and copies it when possible.
  pressExport() {
    if (!this.isSaved) return;
    const code = encodeCustomRider(this.customOf(this.slot.custom));
    this.exportCodeText.setText(code).setVisible(true);
    this.exportLabel.setText('COPIED!');
    this.time.delayedCall(1400, () => {
      if (this.exportLabel?.active) this.exportLabel.setText('EXPORT');
    });
    navigator.clipboard?.writeText?.(code).catch(() => {});
  }

  shake() {
    this.cameras.main.shake(120, 0.004);
  }

  confirm() {
    if (this.locked) return this.shake();
    if (this.needsName) return this.askForName();
    if (this.isCustom && this.isDirty) this.pressSave();
    if (this.needsName) return;
    memory.cell[this.difficulty] = this.cell;
    let player;
    if (this.isCustom) {
      const rider = this.customOf(this.slot.custom);
      player = { custom: { ...rider, look: { ...rider.look } } };
    } else {
      player = { id: this.slot.c.id };
    }
    const ladder = memory.ladder[this.difficulty];
    delete memory.ladder[this.difficulty];
    const campaign = ladder ? { ...ladder, player } : newCampaign(this.difficulty, player);
    leaveTo(this, 'Ladder', { campaign });
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
    const tab = custom ? this.tab : null;
    const statsShown = !custom || tab === 'stats';
    for (const [key, label] of Object.entries(this.statLabels)) label.setY(rows[key] - LABEL_ABOVE).setVisible(statsShown);
    this.heightText.setText(s.mystery ? '??' : formatHeight(stats.heightIn)).setY(rows.height).setVisible(statsShown);
    if (custom) this.heightText.setOrigin(0.5).setX(STEPPER_MID);
    else this.heightText.setOrigin(0, 0.5).setX(STATS_X);
    this.gripG.setVisible(statsShown);
    this.enduranceG.setVisible(statsShown);
    if (s.mystery) {
      this.drawPips(this.gripG, rows.grip, MAX_GRIP, false, MYSTERY_GRAY);
      this.drawPips(this.enduranceG, rows.endurance, MAX_GRIP, false, MYSTERY_GRAY);
    } else {
      this.drawPips(this.gripG, rows.grip, stats.grip, custom, GRIP_COLOR);
      this.drawPips(
        this.enduranceG,
        rows.endurance,
        enduranceRating(stats.heightIn, custom ? 0 : stats.enduranceBonus),
        custom,
        ENDURANCE_COLOR,
      );
    }
    const colorTab = Boolean(PALETTES[tab]);
    const choiceShown = Object.fromEntries(Object.entries(CHOICES).map(([key, c]) => [key, tab === c.tab]));
    const stepperShown = { height: tab === 'stats', grip: tab === 'stats', shading: colorTab, ...choiceShown };
    this.steppers.forEach(({ stat, dir, rect, text }) => {
      const alpha = custom && this.canStep(stat, dir) ? 1 : 0.4;
      rect.setVisible(stepperShown[stat]).setAlpha(alpha);
      text.setVisible(stepperShown[stat]).setAlpha(alpha);
    });
    this.styleText.setText(s.mystery ? MYSTERY_STYLE : custom ? '' : s.c.style).setY(rows.style ?? 0);
    this.pointsLabel.setVisible(tab === 'stats');
    this.pointsText.setVisible(tab === 'stats');
    this.refreshTabs(tab);
    if (custom) this.pointsText.setText(`${pointsLeft(stats)} OF ${CUSTOM.buildPoints}`);
    const dirty = this.isDirty;
    const saveAlpha = dirty ? 1 : 0.4;
    const saved = this.isSaved;
    const { saveX, exportX, deleteX } = this.buttonXs(saved);
    this.saveButton.setVisible(custom).setAlpha(saveAlpha).setX(saveX);
    this.saveLabel.setVisible(custom).setAlpha(saveAlpha).setX(saveX);
    if (custom && dirty) this.saveButton.setInteractive({ useHandCursor: true });
    else this.saveButton.disableInteractive();
    this.exportButton.setVisible(saved).setX(exportX);
    this.exportLabel.setVisible(saved).setX(exportX);
    if (!saved) this.exportCodeText.setVisible(false);
    this.deleteButton.setVisible(saved).setX(deleteX);
    this.deleteText.setVisible(saved).setX(deleteX).setText(this.deleteArmed ? 'SURE?' : 'DELETE');
    const needsName = this.needsName;
    this.nameBox.setStrokeStyle(3, needsName ? HIGHLIGHT : 0xffffff);
    this.previewG.setAlpha(locked && !s.mystery ? LOCKED_ALPHA : 1);
    this.syncArt();
    const standing = this.standingSprite(s.c);
    this.previewSprite.setVisible(standing !== null).setAlpha(locked ? LOCKED_ALPHA : 1);
    if (standing) {
      const tall = stats.heightIn * SPRITE_PX_PER_INCH;
      this.previewSprite.setTexture(standing).setScale(tall / this.previewSprite.height);
    }
    this.syncPresetArt();

    this.lockG.setVisible(locked);
    this.unlockText.setVisible(locked);
    if (locked) this.unlockText.setText(s.mystery ? '????' : unlockText(this.difficulty, s.c));

    this.ready.setAlpha(locked ? 0.4 : 1);
    this.readyText.setAlpha(locked ? 0.4 : 1);
  }

  // The tabs and what's on the shown one; `tab` is null for CHARACTERS.
  refreshTabs(tab) {
    for (const { id, rect, text } of this.tabButtons) {
      rect.setVisible(tab !== null).setFillStyle(id === tab ? TAB.chosen : TAB.fill);
      text.setVisible(tab !== null);
    }
    for (const [part, swatches] of Object.entries(this.swatches)) {
      const chosen = tab === part ? this.look[part] : null;
      for (const { color, rect } of swatches) {
        rect.setVisible(tab === part).setStrokeStyle(color === chosen ? 4 : 2, color === chosen ? HIGHLIGHT : 0xffffff, color === chosen ? 1 : 0.6);
      }
    }
    const colorTab = Boolean(PALETTES[tab]);
    this.picker.objects.forEach((o) => o.setVisible(colorTab));
    this.shadingLabel.setVisible(colorTab);
    this.shadingText.setVisible(colorTab);
    if (colorTab) {
      const color = this.look[tab];
      this.picker.show(color, !PALETTES[tab].includes(color));
      this.shadingText.setText(`x${this.look[`${tab}Shading`].toFixed(1)}`);
    }
    for (const [key, { label, text }] of Object.entries(this.choices)) {
      const shown = CHOICES[key].tab === tab;
      label.setVisible(shown);
      text.setVisible(shown);
      if (!shown) continue;
      text.setFontSize(2).setText(key === 'hairStyle' ? hairStyleLabel(this.look[key]) : this.look[key].toUpperCase());
      if (text.width > STEPPER_W - 2 * STEP_BUTTON - 8) text.setFontSize(1);
    }
    for (const o of this.faceObjects) o.setVisible(tab === 'face');
  }

  // A custom rider's picture, in its gender, build, hair style and colors. Hair styles'
  // pictures load when first needed; until then it keeps the last ones.
  syncArt() {
    if (!this.isCustom) return this.art?.setVisible(false);
    const look = this.look;
    const anim = buildAnim(look.build, look.hairStyle, look.gender);
    if (!isRiderAnimLoaded(this, anim)) loadRiderAnim(this, anim, () => this.syncArt());
    else if (this.art?.anim.key !== anim.key) {
      this.art?.destroy();
      this.art = new TubeRider(this, anim);
    }
    this.art?.setColors(look).setVisible(true);
  }

  // CHARACTERS without a standing picture: idle in their tube like a custom rider,
  // using that mode's attack frames.
  syncPresetArt() {
    const c = this.slot.c;
    if (this.isCustom || this.slot.mystery || !c || this.standingSprite(c)) {
      this.presetArt?.setVisible(false);
      return;
    }
    const { anim, colors } = characterArt(c, this.difficulty);
    if (!isRiderAnimLoaded(this, anim)) {
      loadRiderAnim(this, anim, () => this.syncPresetArt());
      return;
    }
    if (this.presetArt?.anim.key !== anim.key) {
      this.presetArt?.destroy();
      this.presetArt = new TubeRider(this, anim);
    }
    this.presetArt.setColors(colors).setVisible(true);
    this.presetArt.container.setAlpha(this.locked ? LOCKED_ALPHA : 1);
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

  // With its bottom center at (PREVIEW.x, y), the "?" on its seat.
  placeMysteryTube(y) {
    const tube = tubeTextures(this, { width: TUBE_WIDTH, handle: 1, crisp: true, color: PLAYER_TUBE });
    const [back, mark, front] = this.mysteryTube;
    for (const [image, key] of [[back, tube.back], [front, tube.front]]) {
      image.setTexture(key).setOrigin(tube.origin.x, tube.origin.y).setScale(ART_TEXEL).setPosition(PREVIEW.x, y);
    }
    mark.setPosition(PREVIEW.x + tube.seat.x * ART_TEXEL, y + tube.seat.y * ART_TEXEL);
  }

  // The outline around the focused panel row, if any.
  focusBox() {
    const stepper = (y) => ({ x: STATS_X - 6, y: y - STEP_BUTTON / 2 - 4, w: STEPPER_W + 12, h: STEP_BUTTON + 8 });
    switch (this.focus) {
      case 'name':
        return { x: PANEL_CENTER_X - NAME_BOX.w / 2 - 8, y: NAME_Y - NAME_BOX.h / 2 - 8, w: NAME_BOX.w + 16, h: NAME_BOX.h + 16 };
      case 'tabs':
        return { x: TABS_LEFT - 5, y: TAB.y - TAB.h / 2 - 5, w: TABS_W + 10, h: TAB.h + 10 };
      case 'height':
        return stepper(STAT_ROWS.custom.height);
      case 'grip':
        return stepper(STAT_ROWS.custom.grip);
      case 'shading':
        return stepper(SHADING.y);
      case 'gender':
      case 'build':
      case 'hairStyle':
        return stepper(CHOICES[this.focus].y);
      case 'color': {
        const top = COLOR_GRID.y - COLOR_GRID.size / 2 - 6;
        return { x: STATS_X - 6, y: top, w: STEPPER_W + 12, h: PICKER.y + PICKER.h / 2 + 6 - top };
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

    // Idle: floating on the water, bobbing gently (no side lean — that dipped a foot
    // between the tube's layers). Water is a rect (not ellipse): earcut on fillEllipse
    // every frame locked the page when + NEW / custom riders hit this path.
    const g = this.previewG;
    g.clear();
    this.mysteryTube.forEach((o) => o.setVisible(Boolean(this.slot.mystery)));
    if (this.standingSprite(this.slot.c)) return;
    const waterY = this.isCustom ? PREVIEW_Y.custom : PREVIEW_Y.preset;
    const floatY = waterY + Math.sin(t * 2.3) * 3;
    const waterW = 212;
    const waterH = 40;
    g.fillStyle(0x2f7fc1, 1);
    g.fillRect(PREVIEW.x - waterW / 2, waterY + 6 - waterH / 2, waterW, waterH);
    const rippleW = 190 + Math.sin(t * 2.3) * 8;
    g.lineStyle(2, 0xbfe9ff, 0.5 + 0.3 * Math.sin(t * 2.3));
    g.strokeRect(PREVIEW.x - rippleW / 2, waterY + 6 - 15, rippleW, 30);
    if (this.slot.mystery) return this.placeMysteryTube(floatY);
    const art = this.isCustom ? this.art : this.presetArt;
    if (!art) return;
    const { hold } = ATTACK_ANIM;
    const tube = tubeTextures(this, { width: TUBE_WIDTH, handle: art.holdsFarHandle(hold) ? 0 : 1, crisp: true, color: PLAYER_TUBE });
    const heightIn = this.isCustom
      ? this.customOf(this.slot.custom).heightIn * ART_SCALE[this.difficulty]
      : this.slot.c.stats[this.difficulty].heightIn * ART_SCALE[this.difficulty];
    art.place(tube, PREVIEW.x, floatY, ART_TEXEL * TEXELS_PER_UNIT, { heightIn, lean: 0, frame: hold });
  }
}
