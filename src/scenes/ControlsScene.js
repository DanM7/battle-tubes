import Phaser from 'phaser';
import { WIDTH, HEIGHT } from '../config.js';
import { addCloseButton } from './ui.js';
import { addText } from '../pixelFont.js';

const LEFT = 60;
const TOP = 96;
const LINE_GAP = 8;
const SECTION_GAP = 18;
const NAV_Y = 500;
const NAV_BUTTON = { w: 64, h: 44 };
const NAV_SPREAD = 150; // page buttons' distance from the center

// Each page is a list of sections.
const PAGES = [
  [
    {
      title: 'HOW TO WIN',
      lines: [
        'Knock your opponent off their tube: drain their BALANCE or their TUBE AIR to zero.',
        'Best of 3 rounds. Balance slowly recovers; tube air does not (the tube flashes red when it runs low).',
      ],
    },
    {
      title: 'ENDURANCE',
      lines: [
        'Attacks, dodges and ducking cost ENDURANCE, which recovers when you ease off.',
        'Run low and you are GASSED: slower, weaker attacks.',
        'Taller riders reach farther but tire faster.',
      ],
    },
  ],
  [
    {
      title: 'ATTACKS',
      lines: [
        'HI  punch to the head: biggest balance hit, shortest reach.',
        'MID  kick to the body: balance damage, still hits a ducking rider.',
        'LOW  kick at the tube: drains air. Double damage while they punch (one hand on the tube).',
      ],
    },
  ],
  [
    {
      title: 'DEFENSE',
      lines: ['Hold DUCK to slip under punches. Tap lean AWAY just before a hit lands to dodge it.'],
    },
    {
      title: 'THE RIVER',
      lines: [
        'Boat turns fling both riders the opposite way. Leaning adds to or fights the fling.',
        'Where the river narrows you can be pushed into the shore: scraping drains balance.',
      ],
    },
  ],
  [
    {
      title: 'HEALTH KITS & JUMPS',
      lines: [
        'Steer into floating health kits: +10 or +25 to both balance and tube air.',
        'At MEDIUM and FULL THROTTLE the water between the wakes rises. Cut back in over a crest fast to jump.',
        'Jump clean over your rival to switch sides, or come down on top of them for a STOMP.',
      ],
    },
  ],
  [
    {
      title: 'KEYBOARD',
      lines: [
        '1 Player:  ← / → lean    ↓ duck',
        'R punch    F mid kick    V low kick',
        'Rider select: arrows choose a rider, Enter to edit it, Enter again to ride.',
        'P pauses.    Esc goes back.    2 Players: coming soon.',
      ],
    },
    {
      title: 'TOUCH',
      lines: [
        '◀ ▶ lean and ▼ duck on the left, HI / MID / LOW on the right.',
        'Gear (under your name) opens settings, including Debug Mode for turn and speed hints. ❚❚ pauses.',
      ],
    },
  ],
];

export class ControlsScene extends Phaser.Scene {
  constructor() {
    super('Controls');
  }

  create() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x5fb8f5, 0x5fb8f5, 0x1d5f99, 0x1d5f99, 1);
    bg.fillRect(0, 0, WIDTH, HEIGHT);
    addText(this, WIDTH / 2, 40, 'CONTROLS', { scale: 5, color: '#ffdd55' }).setOrigin(0.5);
    addCloseButton(this);

    this.makeNavButton(WIDTH / 2 - NAV_SPREAD, '◀', -1);
    this.makeNavButton(WIDTH / 2 + NAV_SPREAD, '▶', 1);
    this.pageLabel = addText(this, WIDTH / 2, NAV_Y, '', { scale: 2 }).setOrigin(0.5);
    this.input.keyboard.on('keydown-LEFT', () => this.turn(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this.turn(1));

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
    this.page = (this.page + dir + PAGES.length) % PAGES.length;
    this.showPage();
  }

  showPage() {
    this.pageObjects.forEach((o) => o.destroy());
    this.pageObjects = [];
    const wrap = WIDTH - LEFT * 2;
    let y = TOP;
    for (const section of PAGES[this.page]) {
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
    this.pageLabel.setText(`PAGE ${this.page + 1} OF ${PAGES.length}`);
  }
}
