import { WIDTH, HEIGHT, CHEATS } from './config.js';
import { settings, saveSettings, bumpVolume, VOLUME_LABELS } from './settings.js';
import { hasCheat } from './progress.js';
import { addText } from './pixelFont.js';

const DEPTH = 110;
const PANEL_W = 640;
const PANEL_PAD = 36; // inset from panel edge to text / controls
const PANEL_TOP = 100; // title + padding above the first row
const PANEL_BOTTOM = 78; // DONE button space
const ROW_H = 96;
const VOL_BTN = { w: 44, h: 40, gap: 56 }; // gap from value center to −/+ centers
const BUTTON_FILL = 0x1d4e89;
const TOGGLE_ON_FILL = 0x2f7d32;

// Always shown in Settings (production and localhost).
const TURN_INFO_ROW = {
  key: 'debug',
  title: 'TURN INFO',
  description: 'Shows upcoming turns\nand boat speed',
  kind: 'toggle',
};

const VOLUME_ROWS = [
  { key: 'music', title: 'MUSIC', description: 'Background music volume', kind: 'volume' },
  { key: 'sfx', title: 'SFX', description: 'Sound effects volume', kind: 'volume' },
];

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
    const panelH =
      view === 'settings'
        ? Math.min(HEIGHT - 16, PANEL_TOP + rows.length * ROW_H + PANEL_BOTTOM)
        : 300;
    const top = cy - panelH / 2;

    // Full-screen shade that also swallows clicks meant for the game underneath.
    this.add(this.scene.add.rectangle(cx, cy, WIDTH, HEIGHT, 0x000000, 0.55).setInteractive());
    this.add(this.scene.add.rectangle(cx, cy, PANEL_W, panelH, 0x16395f).setStrokeStyle(4, 0xffffff));
    this.text(cx, top + 36, view === 'settings' ? 'SETTINGS' : 'PAUSED', { scale: 4, color: '#ffdd55' });

    if (view === 'settings') {
      rows.forEach((row, i) => {
        const y = top + PANEL_TOP + i * ROW_H;
        if (row.kind === 'volume') this.volumeRow(row, y);
        else this.toggleRow(row, y);
      });
      this.button(cx, top + panelH - 40, 220, 44, 'DONE', this.onResume);
    } else {
      this.button(cx, cy - 10, 320, 56, 'RESUME', this.onResume);
      this.button(cx, cy + 66, 320, 56, 'QUIT TO MENU', this.onQuit);
    }
  }

  // Turn info and volumes always; then every unlocked cheat.
  settingsRows() {
    const cheats = Object.entries(CHEATS)
      .filter(([key]) => hasCheat(key))
      .map(([key, { title, description }]) => ({ key, title, description, kind: 'toggle' }));
    return [TURN_INFO_ROW, ...VOLUME_ROWS, ...cheats];
  }

  toggleRow({ key, title, description }, y) {
    const left = WIDTH / 2 - PANEL_W / 2 + PANEL_PAD;
    this.text(left, y - 22, title, { scale: 3, originX: 0 });
    this.text(left, y + 26, description, { scale: 2, color: '#cfe6ff', originX: 0 });
    const toggle = this.button(WIDTH / 2 + PANEL_W / 2 - PANEL_PAD - 45, y, 90, 44, '', () => {
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

  volumeRow({ key, title, description }, y) {
    const left = WIDTH / 2 - PANEL_W / 2 + PANEL_PAD;
    this.text(left, y - 22, title, { scale: 3, originX: 0 });
    this.text(left, y + 26, description, { scale: 2, color: '#cfe6ff', originX: 0 });

    // Value centered; −/+ sit inside the panel (right edge of + clears PANEL_PAD).
    const valueX = WIDTH / 2 + PANEL_W / 2 - PANEL_PAD - VOL_BTN.gap - VOL_BTN.w / 2;
    const value = this.text(valueX, y, '', { scale: 2 });
    const refresh = () => value.setText(VOLUME_LABELS[settings[key]] ?? 'MED');
    this.button(valueX - VOL_BTN.gap, y, VOL_BTN.w, VOL_BTN.h, '-', () => {
      bumpVolume(key, -1);
      refresh();
      this.onChange?.();
    }, 2);
    this.button(valueX + VOL_BTN.gap, y, VOL_BTN.w, VOL_BTN.h, '+', () => {
      bumpVolume(key, 1);
      refresh();
      this.onChange?.();
    }, 2);
    refresh();
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

  button(x, y, w, h, label, onClick, scale = 3) {
    const rect = this.add(this.scene.add.rectangle(x, y, w, h, BUTTON_FILL).setStrokeStyle(3, 0xffffff).setInteractive({ useHandCursor: true }));
    const text = this.text(x, y, label, { scale });
    rect.on('pointerover', () => rect.setAlpha(0.85));
    rect.on('pointerout', () => rect.setAlpha(1));
    rect.on('pointerup', onClick);
    return { rect, label: text };
  }
}
