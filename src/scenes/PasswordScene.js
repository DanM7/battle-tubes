import Phaser from 'phaser';
import { WIDTH, HEIGHT, CHEATS, UNLOCK_ALL_PASSWORD, UNLOCK_HARD_PASSWORD } from '../config.js';
import { CHARACTERS } from '../characters.js';
import { characterForPassword } from '../campaign.js';
import { recordPasswordUnlock, recordCheat, recordHardUnlock, hasUnlockedHard } from '../progress.js';
import { passwordMatches } from '../passwords.js';
import { settings, saveSettings } from '../settings.js';
import { addBackButton } from './ui.js';
import { addText } from '../pixelFont.js';
import { ensureMenuMusic } from '../audio.js';
import { enterScene } from '../navigate.js';

const MAX_LETTERS = 10;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KEYS_PER_ROW = 9;
const KEY = 62;
const KEY_GAP = 8;
const FIRST_ROW_Y = 222;
const FIELD = { y: 130, w: 500, h: 64 };
const SUBMIT_Y = 444;
const MESSAGE_MS = 3000; // how long a message stays before fading
const MESSAGE_FADE_MS = 600;
const UNLOCKED_COLOR = '#7dff7d';
const ALREADY_COLOR = '#ffdd55';

// Typing in a password: on-screen letter keys (or the keyboard), DEL, and SUBMIT. A rider's
// password unlocks them in every mode; UNLOCK_ALL_PASSWORD unlocks all non-secret riders;
// UNLOCK_HARD_PASSWORD unlocks 2010 / hard mode.
export class PasswordScene extends Phaser.Scene {
  constructor() {
    super('Password');
  }

  create() {
    enterScene(this);
    ensureMenuMusic();
    this.entry = '';

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x5fb8f5, 0x5fb8f5, 0x1d5f99, 0x1d5f99, 1);
    bg.fillRect(0, 0, WIDTH, HEIGHT);
    addText(this, WIDTH / 2, 50, 'PASSWORD', { scale: 5, color: '#ffdd55' }).setOrigin(0.5);
    addBackButton(this);

    this.add
      .rectangle(WIDTH / 2, FIELD.y, FIELD.w, FIELD.h, 0x0b1d2a)
      .setStrokeStyle(3, 0xffffff);
    this.entryText = addText(this, WIDTH / 2, FIELD.y, '', { scale: 5 }).setOrigin(0.5);
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
    addText(this, WIDTH / 2, SUBMIT_Y, 'SUBMIT', { scale: 3 }).setOrigin(0.5);
    submit.on('pointerover', () => submit.setFillStyle(0x3e9e42));
    submit.on('pointerout', () => submit.setFillStyle(0x2f7d32));
    submit.on('pointerup', () => this.submit());

    this.message = addText(this, WIDTH / 2, 504, '', { scale: 3 }).setOrigin(0.5);

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
    addText(this, x, y, label, { scale: label.length > 1 ? 2 : 3 }).setOrigin(0.5);
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
    const password = this.entry;
    this.entry = '';
    this.refresh();

    const cheat = Object.entries(CHEATS).find(([, { password: p }]) => passwordMatches(password, p));
    if (cheat) {
      const [key, { name }] = cheat;
      settings[key] = true;
      saveSettings();
      if (recordCheat(key)) return this.say(`${name.toUpperCase()} UNLOCKED!`, UNLOCKED_COLOR);
      return this.say(`${name.toUpperCase()} IS ON`, ALREADY_COLOR);
    }

    if (passwordMatches(password, UNLOCK_ALL_PASSWORD)) {
      const newlyUnlocked = CHARACTERS.filter((c) => c.unlock && !c.secret && recordPasswordUnlock(c.id));
      if (newlyUnlocked.length) return this.say('ALL RIDERS UNLOCKED!', UNLOCKED_COLOR);
      return this.say('ALL RIDERS ALREADY UNLOCKED', ALREADY_COLOR);
    }

    if (UNLOCK_HARD_PASSWORD && passwordMatches(password, UNLOCK_HARD_PASSWORD)) {
      if (hasUnlockedHard()) {
        recordHardUnlock();
        return this.say('HARD MODE ALREADY UNLOCKED', ALREADY_COLOR);
      }
      recordHardUnlock();
      return this.say('HARD MODE UNLOCKED!', UNLOCKED_COLOR);
    }

    const c = characterForPassword(password);
    if (!c) {
      this.cameras.main.shake(160, 0.006);
      return this.say('WRONG PASSWORD', '#ff6b6b');
    }
    const name = c.name ?? c.id;
    const names = c.nickname === name ? name : `${name} / ${c.nickname}`;
    if (recordPasswordUnlock(c.id)) this.say(`${names.toUpperCase()} UNLOCKED!`, UNLOCKED_COLOR);
    else this.say(`${names.toUpperCase()} IS ALREADY UNLOCKED`, ALREADY_COLOR);
  }

  say(text, color) {
    this.tweens.killTweensOf(this.message);
    this.message.setText(text).setColor(color).setAlpha(1).setScale(1);
    this.tweens.add({ targets: this.message, scale: 1.08, yoyo: true, duration: 160 });
    this.tweens.add({ targets: this.message, alpha: 0, delay: MESSAGE_MS, duration: MESSAGE_FADE_MS });
  }
}
