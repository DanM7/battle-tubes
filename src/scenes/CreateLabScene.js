import Phaser from 'phaser';
import { WIDTH, HEIGHT, CUSTOM } from '../config.js';
import { tubeTextures, TEXELS_PER_UNIT, TUBE_WIDTH } from '../tubeArt.js';
import { TubeRider, preloadRiderAnim, loadRiderAnim, buildAnim, genderBuilds, hairStyleLabel, ATTACK_ANIM, BUILDS, GENDERS, HAIR_STYLES } from '../riderArt.js';
import {
  riderTexture,
  shades,
  SKIN_TONES,
  UNLOCKABLE_SKIN_TONES,
  HAIR_COLORS,
  TRUNKS_COLORS,
  DAN_COLORS,
  BASE_SHADE,
  PARTS,
} from '../riderColors.js';
import { addText, fontToFit } from '../pixelFont.js';
import { addBackButton, addColorPicker } from './ui.js';
import { addStepper } from './labUi.js';

// A test bench for create-a-player (CREATE on the Labs screen, or ?lab=create): Dan's
// pictures, or a girl's, in a chosen skin tone, hair color, hair style, suit color (colors
// from swatches or any CUSTOM color), height and build, with how the shades are made. Each
// kind of choice has its own tab. The rider select screen's custom riders get the same
// choices.

const RIDER_SPOT = { x: 205, y: 470, texel: 1.8 }; // the tube's bottom center, and its size
const BOB = { speed: 2.3, height: 3 };
const TABS = [
  { id: 'body', label: 'BODY' },
  { id: 'skin', label: 'SKIN' },
  { id: 'hair', label: 'HAIR COLOR' },
  { id: 'hairStyle', label: 'HAIR STYLE' },
  { id: 'trunks', label: 'SUIT' },
];
const TAB = { x: 410, y: 148, w: 102, h: 30, gap: 6, fill: 0x1d4e89, chosen: 0x2f7d32 };
const STYLE_BUTTON = { w: 240, h: 34, gap: 10 };
const GENDER_BUTTON = { w: 100, h: 34, gap: 10 };
const PANEL = { x: 430, top: 204 };
const SWATCH_X = 560;
const SWATCH = { size: 30, gap: 6 };
const SHADE_SIZE = 16;
const PICKER = { w: 150, h: 30 };
const STEPPERS = { y: 356, rowGap: 40, labelWidth: 170, valueWidth: 100 };
const SHADING = { step: 0.1, min: 0.3, max: 2 };
const STRIP = { x: 470, y: 528, spacing: 82, scale: 0.16 };
const FRAME_SECONDS = 0.5;
// The frames it plays through: each attack, wound up and back.
const { hold, windup, punch, kickWindup, midKick, lowKick } = ATTACK_ANIM;
const PLAYLIST = [hold, windup, punch, windup, hold, kickWindup, midKick, kickWindup, hold, kickWindup, lowKick, kickWindup];
const REGION_COLORS = { skin: 0xff00ff, trunks: 0x00e5ff, hair: 0x7cff00 }; // G shows what gets recolored
const formatHeight = (inches) => `${Math.floor(inches / 12)}'${inches % 12}"`;
const formatColor = (color) => color.toString(16).padStart(6, '0').toUpperCase();

export class CreateLabScene extends Phaser.Scene {
  constructor() {
    super('CreateLab');
  }

  preload() {
    for (const build of BUILDS) preloadRiderAnim(this, buildAnim(build));
  }

  create() {
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x2f7fc1).setOrigin(0);
    this.add.rectangle(0, 0, WIDTH, 120, 0x0d2a4a).setOrigin(0);
    addText(this, WIDTH / 2, 32, 'CREATE A PLAYER LAB', { scale: 4, color: '#ffdd55' }).setOrigin(0.5);
    addText(this, WIDTH / 2, 74, 'SPACE play / pause    click a frame to hold it    G recolored areas', { scale: 2 }).setOrigin(0.5);
    addText(this, WIDTH / 2, 100, 'the middle shade is the one you pick - the others are made from it like Dan\'s', { scale: 2, font: 'small' }).setOrigin(0.5);
    addBackButton(this, 'Labs');

    this.colors = { ...DAN_COLORS };
    this.heightIn = 64; // Dan in 1999
    this.gender = GENDERS[0];
    this.build = 'normal';
    this.hairStyle = HAIR_STYLES[this.gender][0];
    this.showRegions = false;
    this.playing = true;
    this.clock = 0;
    this.step = 0;
    this.input.keyboard.on('keydown-SPACE', () => (this.playing = !this.playing));
    this.input.keyboard.on('keydown-G', () => {
      this.showRegions = !this.showRegions;
      this.recolor();
    });

    this.rider = new TubeRider(this, buildAnim(this.build));
    this.tabObjects = Object.fromEntries(TABS.map(({ id }) => [id, []]));
    this.parts = {};
    this.buildTabs();
    this.buildColorTab('skin', 'SKIN SHADING', [
      { label: 'SKIN', colors: SKIN_TONES },
      { label: 'LOCKED', colors: UNLOCKABLE_SKIN_TONES, small: true },
    ]);
    this.buildColorTab('hair', 'HAIR SHADING', [{ label: 'COLOR', colors: HAIR_COLORS }]);
    this.buildColorTab('trunks', 'SUIT SHADING', [{ label: 'SUIT', colors: TRUNKS_COLORS }]);
    this.buildBodyTab();
    this.buildStyleTab();
    this.buildStrip();
    this.showTab(TABS[0].id);
    this.recolor();
  }

  buildTabs() {
    const { x, y, w, h, gap, fill } = TAB;
    const font = fontToFit(this, TABS.map((t) => t.label), w - 8);
    this.tabs = TABS.map(({ id, label }, i) => {
      const tx = x + w / 2 + i * (w + gap);
      const rect = this.add.rectangle(tx, y, w, h, fill).setStrokeStyle(2, 0xffffff).setInteractive({ useHandCursor: true });
      addText(this, tx, y, label, { scale: 2, font }).setOrigin(0.5);
      rect.on('pointerup', () => this.showTab(id));
      return { id, rect };
    });
  }

  showTab(id) {
    this.tab = id;
    for (const tab of this.tabs) tab.rect.setFillStyle(tab.id === id ? TAB.chosen : TAB.fill);
    for (const [tab, objects] of Object.entries(this.tabObjects)) for (const o of objects) o.setVisible(tab === id);
  }

  // Rows of colors to pick from, under them the shades made from the picked one, how
  // strongly they're shaded, and the picked color's value.
  buildColorTab(part, shadingLabel, rows) {
    const on = (object) => {
      this.tabObjects[part].push(object);
      return object;
    };
    const rowY = (i) => PANEL.top + i * (SWATCH.size + SWATCH.gap);
    const swatches = rows.flatMap(({ label, colors, small }, row) => {
      const y = rowY(row);
      on(addText(this, PANEL.x, y, label, small ? { scale: 2, font: 'small', color: '#c8d6e5' } : { scale: 2 }).setOrigin(0, 0.5));
      return colors.map((color, i) => {
        const x = SWATCH_X + i * (SWATCH.size + SWATCH.gap) + SWATCH.size / 2;
        const swatch = on(this.add.rectangle(x, y, SWATCH.size, SWATCH.size, color).setInteractive({ useHandCursor: true }));
        swatch.on('pointerup', () => {
          this.colors[part] = color;
          this.recolor();
        });
        return { color, swatch };
      });
    });
    const customY = rowY(rows.length) + 4;
    const picker = addColorPicker(this, SWATCH_X + PICKER.w / 2, customY, PICKER.w, PICKER.h, {
      pick: (color) => {
        this.colors[part] = color;
        this.recolor();
      },
    });
    picker.objects.forEach(on);
    const shadesY = customY + 36;
    on(addText(this, PANEL.x, shadesY, 'SHADES', { scale: 2, font: 'small' }).setOrigin(0, 0.5));
    const count = this.rider.meta.palette[part]?.length ?? 0;
    const ramp = Array.from({ length: count }, (_, i) =>
      on(this.add.rectangle(SWATCH_X + i * (SHADE_SIZE + 4) + SHADE_SIZE / 2, shadesY, SHADE_SIZE, SHADE_SIZE, 0).setStrokeStyle(1, 0x0d2a4a)),
    );

    const key = `${part}Shading`;
    const { labelWidth, valueWidth } = STEPPERS;
    const { objects } = addStepper(this, PANEL.x, STEPPERS.y, shadingLabel, {
      labelWidth,
      valueWidth,
      change: (dir) => {
        const v = Math.round((this.colors[key] + dir * SHADING.step) * 10) / 10;
        this.colors[key] = Phaser.Math.Clamp(v, SHADING.min, SHADING.max);
        this.recolor();
      },
      format: () => `x${this.colors[key].toFixed(1)}`,
    });
    objects.forEach(on);
    const readout = on(addText(this, PANEL.x, STEPPERS.y + STEPPERS.rowGap, '', { scale: 2, font: 'small' }).setOrigin(0, 0.5));
    this.parts[part] = { swatches, picker, ramp, readout };
  }

  buildBodyTab() {
    const { labelWidth, valueWidth, rowGap } = STEPPERS;
    const { w, h, gap } = GENDER_BUTTON;
    const on = (object) => {
      this.tabObjects.body.push(object);
      return object;
    };
    on(addText(this, PANEL.x, PANEL.top, 'GENDER', { scale: 2 }).setOrigin(0, 0.5));
    this.genderButtons = GENDERS.map((gender, i) => {
      const x = PANEL.x + labelWidth + w / 2 + i * (w + gap);
      const rect = on(this.add.rectangle(x, PANEL.top, w, h, TAB.fill).setStrokeStyle(2, 0xffffff).setInteractive({ useHandCursor: true }));
      on(addText(this, x, PANEL.top, gender.toUpperCase(), { scale: 2 }).setOrigin(0.5));
      rect.on('pointerup', () => this.setGender(gender));
      return { gender, rect };
    });
    const height = addStepper(this, PANEL.x, PANEL.top + rowGap, 'HEIGHT', {
      labelWidth,
      valueWidth,
      change: (dir) => {
        this.heightIn = Phaser.Math.Clamp(this.heightIn + dir, CUSTOM.minHeightIn, CUSTOM.maxHeightIn);
      },
      format: () => formatHeight(this.heightIn),
    });
    this.buildStepper = addStepper(this, PANEL.x, PANEL.top + 2 * rowGap, 'BUILD', {
      labelWidth,
      valueWidth,
      change: (dir) => {
        const builds = genderBuilds(this.gender);
        const i = Phaser.Math.Clamp(builds.indexOf(this.build) + dir, 0, builds.length - 1);
        if (builds[i] === this.build) return;
        this.build = builds[i];
        this.remakeRider();
      },
      format: () => this.build.toUpperCase(),
    });
    this.tabObjects.body.push(...height.objects, ...this.buildStepper.objects);
  }

  // A girl only comes in the normal build, and each gender has its own hair styles.
  setGender(gender) {
    if (gender === this.gender) return;
    this.gender = gender;
    if (!genderBuilds(gender).includes(this.build)) this.build = 'normal';
    this.hairStyle = HAIR_STYLES[gender][0];
    this.buildStepper.refresh();
    this.buildStyleTab();
    this.remakeRider();
  }

  // A button per hair style of the chosen gender (a boy's all on Dan's face).
  buildStyleTab() {
    const { w, h, gap } = STYLE_BUTTON;
    const objects = this.tabObjects.hairStyle;
    for (const o of objects) o.destroy();
    objects.length = 0;
    const styles = HAIR_STYLES[this.gender];
    const font = fontToFit(this, styles.map(hairStyleLabel), w - 8);
    this.styleButtons = styles.map((style, i) => {
      const x = PANEL.x + w / 2 + (i % 2) * (w + gap);
      const y = PANEL.top + Math.floor(i / 2) * (h + gap);
      const rect = this.add.rectangle(x, y, w, h, TAB.fill).setStrokeStyle(2, 0xffffff).setInteractive({ useHandCursor: true });
      const text = addText(this, x, y, hairStyleLabel(style), { scale: 2, font }).setOrigin(0.5);
      rect.on('pointerup', () => {
        this.hairStyle = style;
        this.remakeRider();
      });
      objects.push(rect, text);
      return { style, rect };
    });
    for (const o of objects) o.setVisible(this.tab === 'hairStyle');
    this.refreshStyleButtons();
  }

  refreshStyleButtons() {
    const pick = (rect, chosen) => rect.setFillStyle(chosen ? TAB.chosen : TAB.fill).setStrokeStyle(chosen ? 3 : 2, chosen ? 0xffdd55 : 0xffffff);
    for (const { style, rect } of this.styleButtons) pick(rect, style === this.hairStyle);
    for (const { gender, rect } of this.genderButtons) pick(rect, gender === this.gender);
  }

  // The rider in the chosen gender, build and hair style, once its pictures are loaded.
  remakeRider() {
    this.refreshStyleButtons();
    const chosen = () => buildAnim(this.build, this.hairStyle, this.gender);
    const anim = chosen();
    loadRiderAnim(this, anim, () => {
      if (anim.key !== chosen().key || anim.key === this.rider.anim.key) return;
      this.rider.destroy();
      this.rider = new TubeRider(this, anim);
      this.recolor();
    });
  }

  // Every frame, small, in the current colors; click one to hold it.
  buildStrip() {
    this.strip = Array.from({ length: this.rider.meta.frames }, (_, frame) => {
      const x = STRIP.x + frame * STRIP.spacing;
      const image = this.add.image(x, STRIP.y, ATTACK_ANIM.key, frame).setScale(STRIP.scale).setOrigin(0.3, 1).setInteractive({ useHandCursor: true });
      image.on('pointerup', () => {
        this.playing = false;
        this.heldFrame = frame;
      });
      return image;
    });
  }

  recolor() {
    const colors = this.showRegions ? { ...this.colors, ...REGION_COLORS } : this.colors;
    this.rider.setColors(colors);
    const key = riderTexture(this, this.rider.anim, colors);
    this.strip.forEach((image, frame) => image.setTexture(key, frame));
    for (const part of PARTS) {
      const { swatches, picker, ramp, readout } = this.parts[part];
      const chosen = this.colors[part];
      for (const { color, swatch } of swatches) swatch.setStrokeStyle(color === chosen ? 3 : 1, color === chosen ? 0xffdd55 : 0x0d2a4a);
      picker.show(chosen, !swatches.some(({ color }) => color === chosen));
      readout.setText(`COLOR ${formatColor(chosen)}${chosen === DAN_COLORS[part] ? "   DAN'S" : ''}`);
      const palette = this.rider.meta.palette[part];
      if (!palette) continue;
      const from = palette.map((hex) => parseInt(hex.slice(1), 16));
      shades(from, BASE_SHADE[part], colors[part], colors[`${part}Shading`]).forEach((c, i) => ramp[i]?.setFillStyle(c));
    }
  }

  update(_, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    this.clock += dt;
    if (this.playing) {
      this.heldFrame = null;
      this.step = Math.floor(this.clock / FRAME_SECONDS) % PLAYLIST.length;
    }
    const frame = this.heldFrame ?? PLAYLIST[this.step];
    const handle = this.rider.holdsFarHandle(frame) ? 0 : 1;
    const tube = tubeTextures(this, { width: TUBE_WIDTH, handle, crisp: true });
    const y = RIDER_SPOT.y + Math.sin(this.clock * BOB.speed) * BOB.height;
    this.rider.place(tube, RIDER_SPOT.x, y, RIDER_SPOT.texel * TEXELS_PER_UNIT, { heightIn: this.heightIn, frame });
  }
}
