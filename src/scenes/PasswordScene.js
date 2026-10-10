import Phaser from 'phaser';
import { WIDTH, HEIGHT } from '../config.js';
import { characterForPassword } from '../campaign.js';
import { recordPasswordUnlock } from '../progress.js';
import { addBackButton } from './ui.js';

const FONT = 'Arial Black, Arial, sans-serif';
const MAX_LETTERS = 10;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KEYS_PER_ROW = 9;
const KEY = 62;
const KEY_GAP = 8;
const FIRST_ROW_Y = 222;
const FIELD = { y: 130, w: 420, h: 64 };
const SUBMIT_Y = 444;

const textStyle = (size, color = '#ffffff') => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  color,
  stroke: '#000000',
  strokeThickness: Math.max(3, Math.round(size / 6)),
});

// Typing in a password: on-screen letter keys (or the keyboard), DEL, and SUBMIT. A rider's
// password (unlock.password in characters.js) unlocks them in every mode.
export class PasswordScene extends Phaser.Scene {
  constructor() {
    super('Password');
  }

  create() {
    this.entry = '';

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x5fb8f5, 0x5fb8f5, 0x1d5f99, 0x1d5f99, 1);
    bg.fillRect(0, 0, WIDTH, HEIGHT);
    this.add.text(WIDTH / 2, 50, 'PASSWORD', textStyle(36, '#ffdd55')).setOrigin(0.5);
    addBackButton(this);

    this.add
      .rectangle(WIDTH / 2, FIELD.y, FIELD.w, FIELD.h, 0x0b1d2a)
      .setStrokeStyle(3, 0xffffff);
    this.entryText = this.add.text(WIDTH / 2, FIELD.y, '', textStyle(36)).setOrigin(0.5);
    this.cursor = this.add.rectangle(0, FIELD.y, 4, 40, 0xffdd55);
    this.tweens.add({ targets: this.cursor, alpha: 0, yoyo: true, repeat: -1, duration: 450 });

    [...LETTERS].forEach((letter, i) => {
      const row = Math.floor(i / KEYS_PER_ROW);
      const col = i % KEYS_PER_ROW;
      this.makeKey(this.keyX(col), FIRST_ROW_Y + row * (KEY + KEY_GAP), KEY, letter, () => this.type(letter));
    });
    // DEL fills the rest of the last row.
    const lastCol = LETTERS.length % KEYS_PER_ROW;
    const delLeft = this.keyX(lastCol) - KEY / 2;
    const delRight = this.keyX(KEYS_PER_ROW - 1) + KEY / 2;
    const lastRowY = FIRST_ROW_Y + Math.floor(LETTERS.length / KEYS_PER_ROW) * (KEY + KEY_GAP);
    this.makeKey((delLeft + delRight) / 2, lastRowY, delRight - delLeft, 'DEL', () => this.erase(), 0x6b2a2a);

    const submit = this.add
      .rectangle(WIDTH / 2, SUBMIT_Y, 300, 56, 0x2f7d32)
      .setStrokeStyle(3, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.add.text(WIDTH / 2, SUBMIT_Y, 'SUBMIT', textStyle(26)).setOrigin(0.5);
    submit.on('pointerover', () => submit.setFillStyle(0x3e9e42));
    submit.on('pointerout', () => submit.setFillStyle(0x2f7d32));
    submit.on('pointerup', () => this.submit());

    this.message = this.add.text(WIDTH / 2, 504, '', textStyle(20)).setOrigin(0.5);

    this.input.keyboard.on('keydown', (e) => {
      if (/^Key[A-Z]$/.test(e.code)) this.type(e.code.slice(3));
      else if (e.code === 'Backspace') this.erase();
      else if (e.code === 'Enter' || e.code === 'NumpadEnter') this.submit();
    });
    this.refresh();
  }

  keyX(col) {
    const rowWidth = KEYS_PER_ROW * KEY + (KEYS_PER_ROW - 1) * KEY_GAP;
    return WIDTH / 2 - rowWidth / 2 + col * (KEY + KEY_GAP) + KEY / 2;
  }

  makeKey(x, y, w, label, onPress, fill = 0x1d4e89) {
    const key = this.add
      .rectangle(x, y, w, KEY, fill)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, textStyle(label.length > 1 ? 20 : 26)).setOrigin(0.5);
    key.on('pointerover', () => key.setFillStyle(0x2a6bb8));
    key.on('pointerout', () => key.setFillStyle(fill));
    key.on('pointerdown', onPress);
  }

  type(letter) {
    if (this.entry.length >= MAX_LETTERS) return;
    this.entry += letter;
    this.refresh();
  }

  erase() {
    this.entry = this.entry.slice(0, -1);
    this.refresh();
  }

  refresh() {
    this.entryText.setText(this.entry);
    this.cursor.setX(WIDTH / 2 + this.entryText.width / 2 + 6);
  }

  submit() {
    if (!this.entry) return this.cameras.main.shake(120, 0.004);
    const c = characterForPassword(this.entry);
    this.entry = '';
    this.refresh();
    if (!c) {
      this.cameras.main.shake(160, 0.006);
      return this.say('WRONG PASSWORD', '#ff6b6b');
    }
    const names = c.nickname === c.id ? c.id : `${c.id} / ${c.nickname}`;
    if (recordPasswordUnlock(c.id)) this.say(`${names.toUpperCase()} UNLOCKED!`, '#7dff7d');
    else this.say(`${names.toUpperCase()} IS ALREADY UNLOCKED`, '#ffdd55');
  }

  say(text, color) {
    this.tweens.killTweensOf(this.message);
    this.message.setText(text).setColor(color).setAlpha(1).setScale(1);
    this.tweens.add({ targets: this.message, scale: 1.08, yoyo: true, duration: 160 });
  }
}
