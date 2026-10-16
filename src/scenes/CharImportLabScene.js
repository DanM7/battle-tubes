import Phaser from 'phaser';
import { WIDTH, HEIGHT, CUSTOM } from '../config.js';
import { decodeCustomRider } from '../customCode.js';
import { customRiderCount, saveCustomRider, customName } from '../customRiders.js';
import { addText } from '../pixelFont.js';
import { addBackButton } from './ui.js';

// Bench for friend-shared custom riders (CHAR. IMPORT on the Labs screen, or ?lab=charimport):
// paste a base-36 share code and save it into the shared custom list (both years).

const FIELD = { w: 560, h: 48 };
const CODE_Y = 210;
const BTN = { w: 180, h: 44, fill: 0x1d4e89, hover: 0x2a6bb8 };

function formatHeight(inches) {
  const n = Math.round(inches);
  return `${Math.floor(n / 12)}'${n % 12}"`;
}

export class CharImportLabScene extends Phaser.Scene {
  constructor() {
    super('CharImportLab');
  }

  create() {
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x0b1d2a).setOrigin(0);
    this.add.rectangle(0, 0, WIDTH, 120, 0x0d2a4a).setOrigin(0);
    addText(this, WIDTH / 2, 32, 'CHAR. IMPORT', { scale: 4, color: '#ffdd55' }).setOrigin(0.5);
    addText(this, WIDTH / 2, 74, 'Paste a custom rider share code (base-36 groups)', { scale: 2 }).setOrigin(0.5);
    addText(this, WIDTH / 2, 100, 'Example: 7G9B MWA6 A3ET …', { scale: 2, font: 'small' }).setOrigin(0.5);
    addText(this, WIDTH / 2, 126, 'Imports are available in both 1999 and 2010', { scale: 2, font: 'small', color: '#c8d6e5' }).setOrigin(0.5);
    addBackButton(this, 'Labs');

    addText(this, WIDTH / 2, CODE_Y - 40, 'SHARE CODE', { scale: 2, color: '#ffdd55' }).setOrigin(0.5);
    this.codeInput = this.makeInput(CODE_Y, '');

    this.makeButton(WIDTH / 2, CODE_Y + 80, 'IMPORT', () => this.doImport());

    this.preview = addText(this, WIDTH / 2, CODE_Y + 150, '', { scale: 2 }).setOrigin(0.5);
    this.status = addText(this, WIDTH / 2, CODE_Y + 200, '', { scale: 2 }).setOrigin(0.5);

    this.events.once('shutdown', () => {
      this.codeInput?.node?.blur?.();
    });
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

    const count = customRiderCount();
    if (count >= CUSTOM.maxRiders) {
      this.preview.setText('');
      this.status.setText('No free custom slots.').setColor('#ff6b6b');
      return;
    }

    saveCustomRider(null, count, rider);
    this.preview.setText(
      `${customName(rider)}  ${formatHeight(rider.heightIn)}  GRIP ${rider.grip}`,
    ).setColor('#c8d6e5');
    this.status.setText(`Saved to custom slot ${count + 1} (both years).`).setColor('#7dff7d');
  }
}
