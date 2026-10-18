import Phaser from 'phaser';
import { WIDTH } from '../config.js';
import { addText } from '../pixelFont.js';
import { preloadBackground, addBackground, addBackButton, addMenuButton, menuGridCell } from './ui.js';
import { ensureMenuMusic } from '../audio.js';
import { LABS, setLabQuery, startLab, labFromQuery } from '../labs.js';
import { enterScene } from '../navigate.js';

// Developer test benches, reached from the LAB button on the main menu (on localhost). The
// address bar follows along so a reload comes back to the same place: ?lab= on this screen,
// ?lab=<button text> in a lab (any case; spaces and punctuation are ignored).

export { labFromQuery, setLabQuery, startLab };

export class LabsScene extends Phaser.Scene {
  constructor() {
    super('Labs');
  }

  preload() {
    preloadBackground(this);
  }

  create() {
    enterScene(this);
    ensureMenuMusic();
    setLabQuery('');
    addBackground(this);
    addBackButton(this);
    addText(this, WIDTH / 2, 100, 'LABS', { scale: 8, color: '#ffdd55' }).setOrigin(0.5);
    addText(this, WIDTH / 2, 160, 'Test benches for art, moves, audio and codes', { scale: 2 }).setOrigin(0.5);
    LABS.forEach((lab, i) => {
      const { x, y } = menuGridCell(i, { rowY: 230, rowStep: 56 });
      addMenuButton(this, x, y, lab.label, () => startLab(this, lab), { h: 50, textScale: 2 });
    });
  }
}
