import { WIDTH, HEIGHT, CHEATS } from './config.js';
import { settings, saveSettings } from './settings.js';
import { hasCheat } from './progress.js';
import { addText } from './pixelFont.js';

const DEPTH = 110;
const PANEL_W = 500;
const PANEL_H = 300; // with one settings row; each extra row adds ROW_H
const ROW_H = 100;
const FIRST_ROW_Y = 122; // a settings row's toggle, down from the panel's top
const BUTTON_FILL = 0x1d4e89;
const TOGGLE_ON_FILL = 0x2f7d32;

// Settings panel rows: a settings.js flag with an ON/OFF switch.
const DEBUG_ROW = { key: 'debug', title: 'DEBUG MODE', description: 'Shows upcoming turns\nand boat speed' };

// The in-game overlay, in either 'pause' or 'settings' view. The scene stays
// frozen while it's open. onChange runs after a setting is switched.
export class PauseMenu {
  constructor(scene, { onResume, onQuit, onChange }) {
    this.scene = scene;
    this.onResume = onResume;
    this.onQuit = onQuit;
    this.onChange = onChange;
    this.objects = [];
  }

  get isOpen() {
    return this.objects.length > 0;
  }

  open(view) {
    this.close();
    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;
    const rows = view === 'settings' ? this.settingsRows() : [];
    const panelH = PANEL_H + Math.max(0, rows.length - 1) * ROW_H;
    const top = cy - panelH / 2;

    // Full-screen shade that also swallows clicks meant for the game underneath.
    this.add(this.scene.add.rectangle(cx, cy, WIDTH, HEIGHT, 0x000000, 0.55).setInteractive());
    this.add(this.scene.add.rectangle(cx, cy, PANEL_W, panelH, 0x16395f).setStrokeStyle(4, 0xffffff));
    this.text(cx, top + 38, view === 'settings' ? 'SETTINGS' : 'PAUSED', { scale: 4, color: '#ffdd55' });

    if (view === 'settings') {
      rows.forEach((row, i) => this.settingsRow(row, top + FIRST_ROW_Y + i * ROW_H));
      this.button(cx, top + panelH - 60, 220, 52, 'DONE', this.onResume);
    } else {
      this.button(cx, cy - 10, 320, 56, 'RESUME', this.onResume);
      this.button(cx, cy + 66, 320, 56, 'QUIT TO MENU', this.onQuit);
    }
  }

  // Debug mode, then every unlocked cheat.
  settingsRows() {
    const cheats = Object.entries(CHEATS)
      .filter(([key]) => hasCheat(key))
      .map(([key, { title, description }]) => ({ key, title, description }));
    return [DEBUG_ROW, ...cheats];
  }

  settingsRow({ key, title, description }, y) {
    const left = WIDTH / 2 - PANEL_W / 2 + 30;
    this.text(left, y - 20, title, { scale: 3, originX: 0 });
    this.text(left, y + 24, description, { scale: 2, color: '#cfe6ff', originX: 0 });
    const toggle = this.button(WIDTH / 2 + PANEL_W / 2 - 75, y, 90, 44, '', () => {
      settings[key] = !settings[key];
      saveSettings();
      show();
      this.onChange?.();
    });
    const show = () => {
      toggle.label.setText(settings[key] ? 'ON' : 'OFF');
      toggle.rect.setFillStyle(settings[key] ? TOGGLE_ON_FILL : BUTTON_FILL);
    };
    show();
  }

  close() {
    this.objects.forEach((o) => o.destroy());
    this.objects = [];
  }

  add(obj) {
    this.objects.push(obj.setDepth(DEPTH + this.objects.length * 0.01));
    return obj;
  }

  text(x, y, str, { scale, color = '#ffffff', originX = 0.5 }) {
    return this.add(addText(this.scene, x, y, str, { scale, color }).setOrigin(originX, 0.5));
  }

  button(x, y, w, h, label, onClick) {
    const rect = this.add(this.scene.add.rectangle(x, y, w, h, BUTTON_FILL).setStrokeStyle(3, 0xffffff).setInteractive({ useHandCursor: true }));
    const text = this.text(x, y, label, { scale: 3 });
    rect.on('pointerover', () => rect.setAlpha(0.85));
    rect.on('pointerout', () => rect.setAlpha(1));
    rect.on('pointerup', onClick);
    return { rect, label: text };
  }
}
