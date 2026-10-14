import Phaser from 'phaser';
import { WIDTH, HEIGHT } from '../config.js';
import { IS_MOBILE } from '../device.js';
import { addText } from '../pixelFont.js';
import { preloadBackground, addBackground, addMenuButton, menuGridCell } from './ui.js';
import { labFromQuery, setLabQuery, startLab } from './LabsScene.js';

let menuShown = false;
// Developer tools (the labs) only show up when the game is served from this machine.
const IS_LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
const LAB_BUTTON = { w: 100, h: 44, textScale: 2 };

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  preload() {
    preloadBackground(this);
  }

  create() {
    // On page load, ?mode=1p (first ladder match) or ?mode=2p skips the menu (handy while
    // developing), ?lab= opens the Labs screen, and ?lab=<a lab's button text> (?lab=create,
    // say) that lab.
    const pageLoad = !menuShown;
    menuShown = true;
    const params = new URLSearchParams(location.search);
    const skipTo = params.get('mode');
    if (pageLoad && (skipTo === '1p' || skipTo === '2p')) {
      this.scene.start('Game', { mode: skipTo });
      return;
    }
    if (pageLoad && params.has('lab')) {
      const lab = labFromQuery(params.get('lab'));
      if (lab) startLab(this, lab);
      else this.scene.start('Labs');
      return;
    }
    setLabQuery(null);

    addBackground(this);

    addText(this, WIDTH / 2, 110, 'BATTLE TUBES', { scale: 8, color: '#ffdd55' }).setOrigin(0.5);
    addText(this, WIDTH / 2, 178, 'Hang on. Fight dirty. Wake warfare starts here!', { scale: 2 }).setOrigin(0.5);

    const buttons = [
      ['1 PLAYER', () => this.startOnePlayer()],
      ['CONTROLS', () => this.scene.start('Controls')],
      ['2 PLAYERS', () => this.comingSoon(), { dimmed: true }],
      ['PASSWORD', () => this.scene.start('Password')],
    ];
    buttons.forEach(([label, onClick, options], i) => {
      const { x, y } = menuGridCell(i);
      addMenuButton(this, x, y, label, onClick, options);
    });
    if (IS_LOCAL) {
      const x = 16 + LAB_BUTTON.w / 2;
      const y = HEIGHT - 16 - LAB_BUTTON.h / 2;
      addMenuButton(this, x, y, 'LAB', () => this.scene.start('Labs'), LAB_BUTTON);
    }

    this.input.keyboard.once('keydown-ONE', () => this.startOnePlayer());
    this.input.keyboard.on('keydown-TWO', () => this.comingSoon());
  }

  startOnePlayer() {
    if (IS_MOBILE && !this.scale.isFullscreen) {
      this.scale.startFullscreen();
      screen.orientation?.lock?.('landscape').catch(() => {});
    }
    this.scene.start('Difficulty');
  }

  comingSoon() {
    this.toast?.destroy();
    const toast = addText(this, WIDTH / 2, 500, '2 PLAYERS IS COMING SOON!', { scale: 3, color: '#ffdd55' }).setOrigin(0.5);
    this.toast = toast;
    this.tweens.add({ targets: toast, alpha: 0, delay: 1400, duration: 500, onComplete: () => toast.destroy() });
  }
}
