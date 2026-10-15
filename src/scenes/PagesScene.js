import Phaser from 'phaser';
import { WIDTH, HEIGHT } from '../config.js';
import { addCloseButton, addBackButton } from './ui.js';
import { addText } from '../pixelFont.js';

const LEFT = 60;
const TOP = 96;
const LINE_GAP = 8;
const SECTION_GAP = 18;
const NAV_Y = 500;
const NAV_BUTTON = { w: 64, h: 44 };
const NAV_SPREAD = 150; // page buttons' distance from the center

// A screen of text under a title: `pages` is a list of pages, each a list of
// { title, lines } sections, with ◀ ▶ to turn them when there's more than one. `back`
// is the scene the back button goes to; without one, an X goes to the main menu.
export class PagesScene extends Phaser.Scene {
  constructor(key, title, pages, back = null) {
    super(key);
    this.title = title;
    this.pages = pages;
    this.back = back;
  }

  create() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x5fb8f5, 0x5fb8f5, 0x1d5f99, 0x1d5f99, 1);
    bg.fillRect(0, 0, WIDTH, HEIGHT);
    addText(this, WIDTH / 2, 40, this.title, { scale: 5, color: '#ffdd55' }).setOrigin(0.5);
    if (this.back) addBackButton(this, this.back);
    else addCloseButton(this);

    if (this.pages.length > 1) {
      this.makeNavButton(WIDTH / 2 - NAV_SPREAD, '◀', -1);
      this.makeNavButton(WIDTH / 2 + NAV_SPREAD, '▶', 1);
      this.pageLabel = addText(this, WIDTH / 2, NAV_Y, '', { scale: 2 }).setOrigin(0.5);
      this.input.keyboard.on('keydown-LEFT', () => this.turn(-1));
      this.input.keyboard.on('keydown-RIGHT', () => this.turn(1));
    }

    this.page = 0;
    this.pageObjects = [];
    this.showPage();
  }

  makeNavButton(x, label, dir) {
    const rect = this.add
      .rectangle(x, NAV_Y, NAV_BUTTON.w, NAV_BUTTON.h, 0x1d4e89)
      .setStrokeStyle(3, 0xffffff)
      .setInteractive({ useHandCursor: true });
    addText(this, x, NAV_Y, label, { scale: 3 }).setOrigin(0.5);
    rect.on('pointerover', () => rect.setFillStyle(0x2a6bb8));
    rect.on('pointerout', () => rect.setFillStyle(0x1d4e89));
    rect.on('pointerup', () => this.turn(dir));
  }

  turn(dir) {
    this.page = (this.page + dir + this.pages.length) % this.pages.length;
    this.showPage();
  }

  showPage() {
    this.pageObjects.forEach((o) => o.destroy());
    this.pageObjects = [];
    const wrap = WIDTH - LEFT * 2;
    let y = TOP;
    for (const section of this.pages[this.page]) {
      const title = addText(this, LEFT, y, section.title, { scale: 3, color: '#ffdd55' });
      this.pageObjects.push(title);
      y += title.height + LINE_GAP;
      for (const line of section.lines) {
        const text = addText(this, LEFT + 16, y, line, { scale: 2, wrap: wrap - 16 });
        this.pageObjects.push(text);
        y += text.height + LINE_GAP;
      }
      y += SECTION_GAP;
    }
    this.pageLabel?.setText(`PAGE ${this.page + 1} OF ${this.pages.length}`);
  }
}
