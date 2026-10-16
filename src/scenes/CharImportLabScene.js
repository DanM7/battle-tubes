import Phaser from 'phaser';
import { WIDTH, HEIGHT, DIFFICULTIES, CUSTOM } from '../config.js';
import { decodeCustomRider } from '../customCode.js';
import { customRiderCount, saveCustomRider, customName } from '../customRiders.js';
import { addText } from '../pixelFont.js';
import { addBackButton } from './ui.js';

// Bench for friend-shared custom riders (CHAR. IMPORT on the Labs screen, or ?lab=charimport):
// paste a base-36 share code and save it into the chosen year's custom list.

const FIELD = { w: 560, h: 48 };
const CODE_Y = 210;
const BTN = { w: 180, h: 44, fill: 0x1d4e89, hover: 0x2a6bb8 };
const MODES = [
  { key: 'easy', label: '1999' },
  { key: 'hard', label: '2010' },
];

function formatHeight(inches) {
  const n = Math.round(inches);
  return `${Math.floor(n / 12)}'${n % 12}"`;
}

export class CharImportLabScene extends Phaser.Scene {
  constructor() {
    super('CharImportLab');
  }

  create() {
    this.difficulty = 'easy';
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x0b1d2a).setOrigin(0);
    this.add.rectangle(0, 0, WIDTH, 120, 0x0d2a4a).setOrigin(0);
    addText(this, WIDTH / 2, 32, 'CHAR. IMPORT', { scale: 4, color: '#ffdd55' }).setOrigin(0.5);
    addText(this, WIDTH / 2, 74, 'Paste a custom rider share code (base-36 groups)', { scale: 2 }).setOrigin(0.5);
    addText(this, WIDTH / 2, 100, 'Example: 7G9B MWA6 A3ET …', { scale: 2, font: 'small' }).setOrigin(0.5);
    addBackButton(this, 'Labs');

    addText(this, WIDTH / 2, CODE_Y - 40, 'SHARE CODE', { scale: 2, color: '#ffdd55' }).setOrigin(0.5);
    this.codeInput = this.makeInput(CODE_Y, '');

    this.modeTabs = MODES.map(({ key, label }, i) => {
      const x = WIDTH / 2 - 70 + i * 140;
      const y = CODE_Y + 70;
      const rect = this.add
        .rectangle(x, y, 120, 36, 0x1d4e89)
        .setStrokeStyle(2, 0xffffff)
        .setInteractive({ useHandCursor: true });
      const text = addText(this, x, y, label, { scale: 2 }).setOrigin(0.5);
      rect.on('pointerdown', () => {
        this.difficulty = key;
        this.refreshModes();
        this.status.setText('').setColor('#ffffff');
      });
      return { key, rect, text };
    });
    this.refreshModes();

    this.makeButton(WIDTH / 2, CODE_Y + 130, 'IMPORT', () => this.doImport());

    this.preview = addText(this, WIDTH / 2, CODE_Y + 190, '', { scale: 2 }).setOrigin(0.5);
    this.status = addText(this, WIDTH / 2, CODE_Y + 240, '', { scale: 2 }).setOrigin(0.5);

    this.events.once('shutdown', () => {
      this.codeInput?.node?.blur?.();
    });
  }

  refreshModes() {
    for (const { key, rect } of this.modeTabs) {
      rect.setFillStyle(key === this.difficulty ? 0x2f7d32 : 0x1d4e89);
    }
  }

  makeInput(y, initial) {
    const node = document.createElement('input');
    node.type = 'text';
    node.value = initial;
    node.autocomplete = 'off';
    node.spellcheck = false;
    Object.assign(node.style, {
      width: `${FIELD.w}px`,
      height: `${FIELD.h}px`,
      font: '20px monospace',
      textAlign: 'center',
      color: '#ffffff',
      background: '#0d2a4a',
      border: '3px solid #ffffff',
      borderRadius: '4px',
      outline: 'none',
      boxSizing: 'border-box',
      textTransform: 'uppercase',
    });
    return this.add.dom(WIDTH / 2, y, node);
  }

  makeButton(x, y, label, onClick) {
    const rect = this.add
      .rectangle(x, y, BTN.w, BTN.h, BTN.fill)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    addText(this, x, y, label, { scale: 2 }).setOrigin(0.5);
    rect.on('pointerover', () => rect.setFillStyle(BTN.hover));
    rect.on('pointerout', () => rect.setFillStyle(BTN.fill));
    rect.on('pointerup', onClick);
    return rect;
  }

  doImport() {
    let rider;
    try {
      rider = decodeCustomRider(this.codeInput.node.value);
    } catch (err) {
      this.preview.setText('');
      this.status.setText(err.message || 'Bad code.').setColor('#ff6b6b');
      return;
    }

    const count = customRiderCount(this.difficulty);
    if (count >= CUSTOM.maxRiders) {
      this.preview.setText('');
      this.status.setText(`No free slots in ${DIFFICULTIES[this.difficulty].year}.`).setColor('#ff6b6b');
      return;
    }

    saveCustomRider(this.difficulty, count, rider);
    const year = DIFFICULTIES[this.difficulty].year;
    this.preview.setText(
      `${customName(rider)}  ${formatHeight(rider.heightIn)}  GRIP ${rider.grip}`,
    ).setColor('#c8d6e5');
    this.status.setText(`Saved to ${year} custom slot ${count + 1}.`).setColor('#7dff7d');
  }
}
