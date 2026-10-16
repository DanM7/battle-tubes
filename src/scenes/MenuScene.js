import Phaser from 'phaser';
import { WIDTH, HEIGHT } from '../config.js';
import { IS_MOBILE } from '../device.js';
import { SITE, fillPlaceholders } from '../copy.js';
import { addText } from '../pixelFont.js';
import { preloadBackground, addBackground, addMenuButton, menuGridCell, addTubeGradientTitle } from './ui.js';
import { labFromQuery, setLabQuery, startLab } from './LabsScene.js';
import { ensureMenuMusic, unlockAudio } from '../audio.js';

let menuShown = false;
// Developer tools (the labs) only show up when the game is served from this machine.
const IS_LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
const LAB_BUTTON = { w: 100, h: 44, textScale: 2 };
// Smaller than other menus' buttons, to fit three rows between the title and the LAB button.
const BUTTON = { w: 280, h: 48, textScale: 3 };
const GRID = { rowY: 284, rowStep: 60 };
const FOOTER_Y = HEIGHT - 22;
const LINK_COLOR = '#9fd0ff';
const LINK_HOVER = '#ffdd55';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  preload() {
    preloadBackground(this);
  }

  create() {
    this.leaving = false;
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

    addTubeGradientTitle(this, WIDTH / 2, 110, 'BATTLE TUBES', { scale: 8 });
    addText(this, WIDTH / 2, 178, 'Hang on. Fight dirty. Wake warfare starts here!', { scale: 2 }).setOrigin(0.5);

    const buttons = [
      ['1 PLAYER', () => this.startOnePlayer()],
      ['CONTROLS', () => this.scene.start('Controls')],
      ['2 PLAYERS', () => this.comingSoon(), { dimmed: true }],
      ['PASSWORD', () => this.scene.start('Password')],
      ['HIGH SCORES', () => this.scene.start('HighScores')],
      ['ABOUT', () => this.scene.start('About')],
    ];
    buttons.forEach(([label, onClick, options], i) => {
      const { x, y } = menuGridCell(i, GRID);
      addMenuButton(this, x, y, label, onClick, { ...BUTTON, ...options });
    });
    if (IS_LOCAL) {
      const x = 16 + LAB_BUTTON.w / 2;
      const y = HEIGHT - 16 - LAB_BUTTON.h / 2;
      addMenuButton(this, x, y, 'LAB', () => this.scene.start('Labs'), LAB_BUTTON);
    }

    this.addFooter();

    this.input.keyboard.once('keydown-ONE', () => this.startOnePlayer());
    this.input.keyboard.on('keydown-TWO', () => this.comingSoon());
  }

  // Copyright line from game.json `site.footer`; {yyyy} → current year, {link} → linked label.
  addFooter() {
    const { text, linkLabel, linkUrl } = SITE.footer;
    const filled = fillPlaceholders(text);
    const parts = filled.split('{link}');
    const before = parts[0] ?? '';
    const after = parts[1] ?? '';
    const scale = 2;
    const beforeText = addText(this, 0, FOOTER_Y, before, { scale }).setOrigin(0, 0.5);
    const linkText = addText(this, 0, FOOTER_Y, linkLabel, { scale, color: LINK_COLOR }).setOrigin(0, 0.5);
    const afterText = addText(this, 0, FOOTER_Y, after, { scale }).setOrigin(0, 0.5);
    const total = beforeText.width + linkText.width + afterText.width;
    let x = WIDTH / 2 - total / 2;
    beforeText.setX(x);
    x += beforeText.width;
    linkText.setX(x);
    afterText.setX(x + linkText.width);

    if (linkUrl) {
      linkText.setInteractive({ useHandCursor: true });
      linkText.on('pointerover', () => linkText.setColor(LINK_HOVER));
      linkText.on('pointerout', () => linkText.setColor(LINK_COLOR));
      linkText.on('pointerup', () => window.open(linkUrl, '_blank', 'noopener,noreferrer'));
    }
  }

  startOnePlayer() {
    if (this.leaving) return;
    this.leaving = true;
    // Unlock in this tap stack before fullscreen (mobile often re-suspends after FS).
    unlockAudio();
    ensureMenuMusic();
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
