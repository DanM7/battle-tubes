import Phaser from 'phaser';
import { WIDTH, HEIGHT, CUSTOM } from '../config.js';
import { tubeTextures, TEXELS_PER_UNIT, TUBE_WIDTH } from '../tubeArt.js';
import { TubeRider, preloadRiderAnim, ATTACK_ANIM } from '../riderArt.js';
import { riderTexture, shades, SKIN_TONES, UNLOCKABLE_SKIN_TONES, TRUNKS_COLORS, DAN_COLORS, BASE_SHADE } from '../riderColors.js';
import { addText } from '../pixelFont.js';
import { addBackButton } from './ui.js';
import { addStepper } from './labUi.js';

// A test bench for create-a-player (CREATE on the Labs screen, or ?lab=create): Dan's
// pictures in a chosen skin tone, trunks color and height, with how the shades are made.

const RIDER_SPOT = { x: 205, y: 470, texel: 1.8 }; // the tube's bottom center, and its size
const BOB = { speed: 2.3, height: 3 };
const PANEL_X = 430;
const SWATCH_X = 560;
const ROWS = { skin: 140, trunks: 252 }; // each part's first row of swatches
const SWATCH = { size: 30, gap: 6 };
const SHADE_SIZE = 16;
const STEPPERS = { y: 330, rowGap: 34, labelWidth: 170 };
const SHADING = { step: 0.1, min: 0.3, max: 2 };
const STRIP = { x: 470, y: 528, spacing: 82, scale: 0.16 };
const FRAME_SECONDS = 0.5;
// The frames it plays through: each attack, wound up and back.
const { hold, windup, punch, kickWindup, midKick, lowKick } = ATTACK_ANIM;
const PLAYLIST = [hold, windup, punch, windup, hold, kickWindup, midKick, kickWindup, hold, kickWindup, lowKick, kickWindup];
const REGION_COLORS = { skin: 0xff00ff, trunks: 0x00e5ff }; // G shows what gets recolored
const formatHeight = (inches) => `${Math.floor(inches / 12)}'${inches % 12}"`;

export class CreateLabScene extends Phaser.Scene {
  constructor() {
    super('CreateLab');
  }

  preload() {
    preloadRiderAnim(this, ATTACK_ANIM);
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
    this.showRegions = false;
    this.playing = true;
    this.clock = 0;
    this.step = 0;
    this.input.keyboard.on('keydown-SPACE', () => (this.playing = !this.playing));
    this.input.keyboard.on('keydown-G', () => {
      this.showRegions = !this.showRegions;
      this.recolor();
    });

    this.rider = new TubeRider(this, ATTACK_ANIM);
    this.buildSwatches('skin', [
      { label: 'SKIN', colors: SKIN_TONES },
      { label: 'LOCKED', colors: UNLOCKABLE_SKIN_TONES, small: true },
    ]);
    this.buildSwatches('trunks', [{ label: 'TRUNKS', colors: TRUNKS_COLORS }]);
    this.buildSteppers();
    this.buildStrip();
    this.recolor();
  }

  // Rows of colors to pick from, and under them the shades made from the picked one.
  buildSwatches(part, rows) {
    const rowY = (i) => ROWS[part] + i * (SWATCH.size + SWATCH.gap);
    const swatches = rows.flatMap(({ label, colors, small }, row) => {
      const y = rowY(row);
      addText(this, PANEL_X, y, label, small ? { scale: 2, font: 'small', color: '#c8d6e5' } : { scale: 2 }).setOrigin(0, 0.5);
      return colors.map((color, i) => {
        const x = SWATCH_X + i * (SWATCH.size + SWATCH.gap) + SWATCH.size / 2;
        const swatch = this.add.rectangle(x, y, SWATCH.size, SWATCH.size, color).setInteractive({ useHandCursor: true });
        swatch.on('pointerup', () => {
          this.colors[part] = color;
          this.recolor();
        });
        return { color, swatch };
      });
    });
    const shadesY = rowY(rows.length - 1) + 32;
    addText(this, PANEL_X, shadesY, 'SHADES', { scale: 2, font: 'small' }).setOrigin(0, 0.5);
    const count = this.rider.meta.palette[part].length;
    const ramp = Array.from({ length: count }, (_, i) =>
      this.add.rectangle(SWATCH_X + i * (SHADE_SIZE + 4) + SHADE_SIZE / 2, shadesY, SHADE_SIZE, SHADE_SIZE, 0).setStrokeStyle(1, 0x0d2a4a),
    );
    this[`${part}Row`] = { swatches, ramp };
  }

  buildSteppers() {
    const { y, rowGap, labelWidth } = STEPPERS;
    const shadingStepper = (row, label, key) =>
      addStepper(this, PANEL_X, y + row * rowGap, label, {
        labelWidth,
        change: (dir) => {
          const v = Math.round((this.colors[key] + dir * SHADING.step) * 10) / 10;
          this.colors[key] = Phaser.Math.Clamp(v, SHADING.min, SHADING.max);
          this.recolor();
        },
        format: () => `x${this.colors[key].toFixed(1)}`,
      });
    shadingStepper(0, 'SKIN SHADING', 'skinShading');
    shadingStepper(1, 'TRUNK SHADING', 'trunksShading');
    addStepper(this, PANEL_X, y + 2 * rowGap, 'HEIGHT', {
      labelWidth,
      change: (dir) => {
        this.heightIn = Phaser.Math.Clamp(this.heightIn + dir, CUSTOM.minHeightIn, CUSTOM.maxHeightIn);
      },
      format: () => formatHeight(this.heightIn),
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
    const key = riderTexture(this, ATTACK_ANIM, colors);
    this.strip.forEach((image, frame) => image.setTexture(key, frame));
    for (const part of ['skin', 'trunks']) {
      const { swatches, ramp } = this[`${part}Row`];
      for (const { color, swatch } of swatches) swatch.setStrokeStyle(color === this.colors[part] ? 3 : 1, color === this.colors[part] ? 0xffdd55 : 0x0d2a4a);
      const from = this.rider.meta.palette[part].map((hex) => parseInt(hex.slice(1), 16));
      shades(from, BASE_SHADE[part], colors[part], colors[`${part}Shading`]).forEach((c, i) => ramp[i].setFillStyle(c));
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
