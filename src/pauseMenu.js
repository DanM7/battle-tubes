import { WIDTH, HEIGHT } from './config.js';
import { settings, saveSettings } from './settings.js';

const FONT = 'Arial Black, Arial, sans-serif';
const DEPTH = 110;
const PANEL_W = 440;
const PANEL_H = 300;
const BUTTON_FILL = 0x1d4e89;
const TOGGLE_ON_FILL = 0x2f7d32;

// The in-game overlay, in either 'pause' or 'settings' view. The scene stays
// frozen while it's open.
export class PauseMenu {
  constructor(scene, { onResume, onQuit }) {
    this.scene = scene;
    this.onResume = onResume;
    this.onQuit = onQuit;
    this.objects = [];
  }

  get isOpen() {
    return this.objects.length > 0;
  }

  open(view) {
    this.close();
    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;

    // Full-screen shade that also swallows clicks meant for the game underneath.
    this.add(this.scene.add.rectangle(cx, cy, WIDTH, HEIGHT, 0x000000, 0.55).setInteractive());
    this.add(this.scene.add.rectangle(cx, cy, PANEL_W, PANEL_H, 0x16395f).setStrokeStyle(4, 0xffffff));
    this.text(cx, cy - PANEL_H / 2 + 38, view === 'settings' ? 'SETTINGS' : 'PAUSED', { size: 34, color: '#ffdd55' });

    if (view === 'settings') {
      const left = cx - PANEL_W / 2 + 30;
      this.text(left, cy - 40, 'DEBUG MODE', { size: 22, originX: 0 });
      this.text(left, cy - 12, 'Shows upcoming turns and boat speed', { size: 13, color: '#cfe6ff', font: 'Arial, sans-serif', originX: 0 });
      const toggle = this.button(cx + 150, cy - 28, 90, 44, '', () => {
        settings.debug = !settings.debug;
        saveSettings();
        showDebug();
      });
      const showDebug = () => {
        toggle.label.setText(settings.debug ? 'ON' : 'OFF');
        toggle.rect.setFillStyle(settings.debug ? TOGGLE_ON_FILL : BUTTON_FILL);
      };
      showDebug();
      this.button(cx, cy + 90, 220, 52, 'DONE', this.onResume);
    } else {
      this.button(cx, cy - 10, 260, 56, 'RESUME', this.onResume);
      this.button(cx, cy + 66, 260, 56, 'QUIT TO MENU', this.onQuit);
    }
  }

  close() {
    this.objects.forEach((o) => o.destroy());
    this.objects = [];
  }

  add(obj) {
    this.objects.push(obj.setDepth(DEPTH + this.objects.length * 0.01));
    return obj;
  }

  text(x, y, str, { size, color = '#ffffff', font = FONT, originX = 0.5 }) {
    const style = { fontFamily: font, fontSize: `${size}px`, color, stroke: '#000000', strokeThickness: Math.max(2, size / 7) };
    return this.add(this.scene.add.text(x, y, str, style).setOrigin(originX, 0.5));
  }

  button(x, y, w, h, label, onClick) {
    const rect = this.add(this.scene.add.rectangle(x, y, w, h, BUTTON_FILL).setStrokeStyle(3, 0xffffff).setInteractive({ useHandCursor: true }));
    const text = this.text(x, y, label, { size: 22 });
    rect.on('pointerover', () => rect.setAlpha(0.85));
    rect.on('pointerout', () => rect.setAlpha(1));
    rect.on('pointerup', onClick);
    return { rect, label: text };
  }
}
