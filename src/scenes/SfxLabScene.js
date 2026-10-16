import Phaser from 'phaser';
import { WIDTH, HEIGHT } from '../config.js';
import { addText } from '../pixelFont.js';
import { addBackButton } from './ui.js';
import { SFX, playSfx, stopSfx, sfxHasFile } from '../audio.js';

// Bench for sound effects (SFX on the Labs screen, or ?lab=sfx): USED cues are wired in
// play (or actively auditioned for combat); UNUSED holds boat/engine leftovers and rejects.

const GRID = { x: 40, y: 160, cols: 3, w: 280, h: 34, gapX: 20, gapY: 6, fill: 0x1d4e89, hover: 0x2a6bb8, file: 0x2f7d32 };
const STOP = { w: 120, h: 44, fill: 0x9b2226, hover: 0xbf2a30 };
const TABS = [
  { id: 'used', label: 'USED' },
  { id: 'unused', label: 'UNUSED' },
];
const TAB = { y: 128, w: 140, h: 36, gap: 16, fill: 0x1d4e89, hover: 0x2a6bb8, chosen: 0x2f7d32 };

export class SfxLabScene extends Phaser.Scene {
  constructor() {
    super('SfxLab');
  }

  create() {
    this.tab = 'used';
    this.cueButtons = [];

    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x0b1d2a).setOrigin(0);
    this.add.rectangle(0, 0, WIDTH, 120, 0x0d2a4a).setOrigin(0);
    addText(this, WIDTH / 2, 28, 'SFX LAB', { scale: 4, color: '#ffdd55' }).setOrigin(0.5);
    addText(this, WIDTH / 2, 68, 'Green = file loaded   Blue = synth placeholder', { scale: 2 }).setOrigin(0.5);
    addText(this, WIDTH / 2, 94, 'USED = in play / combat picks   UNUSED = boat, engines, rejects', {
      scale: 2,
      font: 'small',
    }).setOrigin(0.5);
    addBackButton(this, 'Labs');
    this.addStopButton();

    this.last = addText(this, WIDTH / 2, HEIGHT - 22, '', { scale: 2 }).setOrigin(0.5);
    this.events.once('shutdown', () => stopSfx());

    const tabsW = TABS.length * (TAB.w + TAB.gap) - TAB.gap;
    const tabsLeft = (WIDTH - tabsW) / 2;
    this.tabButtons = TABS.map(({ id, label }, i) => {
      const x = tabsLeft + TAB.w / 2 + i * (TAB.w + TAB.gap);
      const rect = this.add
        .rectangle(x, TAB.y, TAB.w, TAB.h, TAB.fill)
        .setStrokeStyle(2, 0xffffff)
        .setInteractive({ useHandCursor: true });
      const text = addText(this, x, TAB.y, label, { scale: 2 }).setOrigin(0.5);
      rect.on('pointerover', () => {
        if (this.tab !== id) rect.setFillStyle(TAB.hover);
      });
      rect.on('pointerout', () => this.paintTabs());
      rect.on('pointerup', () => {
        this.tab = id;
        this.paintTabs();
        this.buildGrid();
      });
      return { id, rect, text };
    });
    this.paintTabs();
    this.buildGrid();
  }

  paintTabs() {
    for (const { id, rect } of this.tabButtons) {
      rect.setFillStyle(id === this.tab ? TAB.chosen : TAB.fill);
    }
  }

  buildGrid() {
    for (const b of this.cueButtons) b.destroy();
    this.cueButtons = [];

    const cues = SFX.filter((c) => (c.lab ?? 'unused') === this.tab);
    cues.forEach((cue, i) => {
      const col = i % GRID.cols;
      const row = Math.floor(i / GRID.cols);
      const x = GRID.x + col * (GRID.w + GRID.gapX) + GRID.w / 2;
      const y = GRID.y + row * (GRID.h + GRID.gapY) + GRID.h / 2;
      if (y > HEIGHT - 40) return;
      const hasFile = sfxHasFile(cue.id);
      const fill = hasFile ? GRID.file : GRID.fill;
      const rect = this.add
        .rectangle(x, y, GRID.w, GRID.h, fill)
        .setStrokeStyle(2, 0xffffff)
        .setInteractive({ useHandCursor: true });
      const label = addText(this, x, y, hasFile ? cue.name : `${cue.name} *`, { scale: 2 }).setOrigin(0.5);
      rect.on('pointerover', () => rect.setFillStyle(GRID.hover));
      rect.on('pointerout', () => rect.setFillStyle(fill));
      rect.on('pointerup', () => {
        playSfx(cue.id);
        this.last.setText(`Played ${cue.name}${hasFile ? ' (file)' : ' (synth)'}`);
      });
      this.cueButtons.push(rect, label);
    });

    if (!cues.length) this.last.setText('No cues on this tab');
  }

  // Mirrors BACK on the top-right; cuts off whatever is currently sounding.
  addStopButton() {
    const x = WIDTH - 16 - STOP.w / 2;
    const y = 16 + STOP.h / 2;
    const rect = this.add
      .rectangle(x, y, STOP.w, STOP.h, STOP.fill)
      .setStrokeStyle(3, 0xffffff)
      .setInteractive({ useHandCursor: true });
    addText(this, x, y, 'STOP', { scale: 2 }).setOrigin(0.5);
    rect.on('pointerover', () => rect.setFillStyle(STOP.hover));
    rect.on('pointerout', () => rect.setFillStyle(STOP.fill));
    rect.on('pointerup', () => {
      stopSfx();
      this.last.setText('Stopped');
    });
  }
}
