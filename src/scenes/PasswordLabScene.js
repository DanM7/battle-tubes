import Phaser from 'phaser';
import { WIDTH, HEIGHT } from '../config.js';
import { seal, open } from '../passwords.js';
import { addText } from '../pixelFont.js';
import { addBackButton } from './ui.js';

// Bench for unlock/cheat codes (PASSWORDS on the Labs screen, or ?lab=passwords): type a
// plaintext word and SEAL it for game.json, or paste a sealed string and OPEN it.

const FIELD = { w: 520, h: 48 };
const PLAIN_Y = 200;
const SEALED_Y = 320;
const BTN = { w: 160, h: 44, fill: 0x1d4e89, hover: 0x2a6bb8 };

export class PasswordLabScene extends Phaser.Scene {
  constructor() {
    super('PasswordLab');
  }

  create() {
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x0b1d2a).setOrigin(0);
    this.add.rectangle(0, 0, WIDTH, 120, 0x0d2a4a).setOrigin(0);
    addText(this, WIDTH / 2, 32, 'PASSWORD LAB', { scale: 4, color: '#ffdd55' }).setOrigin(0.5);
    addText(this, WIDTH / 2, 74, 'Seal plaintext for game.json, or open a sealed string', { scale: 2 }).setOrigin(0.5);
    addText(this, WIDTH / 2, 100, 'Plaintext: A–Z only    Sealed: letters and digits from the cipher', {
      scale: 2,
      font: 'small',
    }).setOrigin(0.5);
    addBackButton(this, 'Labs');

    addText(this, WIDTH / 2, PLAIN_Y - 40, 'PLAINTEXT', { scale: 2, color: '#ffdd55' }).setOrigin(0.5);
    this.plainInput = this.makeInput(PLAIN_Y, 'CROM');

    this.makeButton(WIDTH / 2 - 100, PLAIN_Y + 55, 'SEAL ↓', () => this.doSeal());
    this.makeButton(WIDTH / 2 + 100, PLAIN_Y + 55, 'OPEN ↑', () => this.doOpen());

    addText(this, WIDTH / 2, SEALED_Y - 40, 'SEALED', { scale: 2, color: '#ffdd55' }).setOrigin(0.5);
    this.sealedInput = this.makeInput(SEALED_Y, '');

    this.status = addText(this, WIDTH / 2, SEALED_Y + 70, '', { scale: 2 }).setOrigin(0.5);
    this.events.once('shutdown', () => {
      this.plainInput?.node?.blur?.();
      this.sealedInput?.node?.blur?.();
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
      font: '22px monospace',
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

  doSeal() {
    const letters = this.plainInput.node.value.toUpperCase().replace(/[^A-Z]/g, '');
    if (!letters) {
      this.status.setText('Enter letters A–Z to seal').setColor('#ff6b6b');
      return;
    }
    const sealed = seal(letters);
    this.sealedInput.node.value = sealed;
    this.status.setText(`Sealed ${letters} → copy into game.json`).setColor('#7dff7d');
  }

  doOpen() {
    const sealed = this.sealedInput.node.value.trim().toUpperCase();
    const plain = open(sealed);
    if (!plain) {
      this.status.setText('Could not open that sealed string').setColor('#ff6b6b');
      return;
    }
    this.plainInput.node.value = plain;
    this.status.setText(`Opened → ${plain}`).setColor('#7dff7d');
  }
}
