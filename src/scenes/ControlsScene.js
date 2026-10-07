import Phaser from 'phaser';
import { WIDTH, HEIGHT } from '../config.js';
import { addCloseButton } from './ui.js';

const FONT = 'Arial Black, Arial, sans-serif';
const BODY_FONT = 'Arial, sans-serif';

const SECTIONS = [
  {
    title: 'HOW TO WIN',
    lines: [
      'Knock your opponent off their tube: drain their BALANCE or their TUBE AIR to zero.',
      'Best of 3 rounds. Balance slowly recovers; tube air does not.',
    ],
  },
  {
    title: 'ATTACKS',
    lines: [
      'HI  punch to the head: biggest balance hit, shortest reach.',
      'MID  kick to the body: balance damage, still hits a ducking rider.',
      'LOW  kick at the tube: drains air. Double damage while they punch (one hand on the tube).',
      'Taller riders reach a little farther.',
    ],
  },
  {
    title: 'DEFENSE & THE RIVER',
    lines: [
      'Hold DUCK to slip under punches. Tap lean AWAY just before a hit lands to dodge it.',
      'Boat turns fling both riders the opposite way. Leaning adds to or fights the fling.',
      'Where the river narrows you can be pushed into the shore: scraping drains balance.',
      'Steer into floating health kits: +10 or +25 to both balance and tube air.',
      'At MEDIUM and FULL THROTTLE the boat throws up wake ridges. Cross one fast to jump.',
      'Jump clean over your rival to switch sides, or come down on top of them for a STOMP.',
    ],
  },
  {
    title: 'KEYBOARD',
    lines: [
      '1 Player:  ← / → lean    ↓ duck    R punch    F mid kick    V low kick',
      '2 Players:  P1  A / D lean, S duck, R / F / V      P2  ← / → lean, ↓ duck, I / K / M (or numpad 8 / 5 / 2)',
      'Esc returns to the menu.',
    ],
  },
  {
    title: 'TOUCH',
    lines: ['◀ ▶ lean and ▼ duck on the left    HI / MID / LOW on the right'],
  },
];

export class ControlsScene extends Phaser.Scene {
  constructor() {
    super('Controls');
  }

  create() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x5fb8f5, 0x5fb8f5, 0x1d5f99, 0x1d5f99, 1);
    bg.fillRect(0, 0, WIDTH, HEIGHT);

    this.add
      .text(WIDTH / 2, 36, 'CONTROLS', { fontFamily: FONT, fontSize: '34px', color: '#ffdd55', stroke: '#000000', strokeThickness: 6 })
      .setOrigin(0.5);

    let y = 78;
    for (const section of SECTIONS) {
      this.add.text(60, y, section.title, { fontFamily: FONT, fontSize: '16px', color: '#ffdd55', stroke: '#000000', strokeThickness: 3 });
      y += 22;
      for (const line of section.lines) {
        this.add.text(76, y, line, { fontFamily: BODY_FONT, fontSize: '14px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 });
        y += 18;
      }
      y += 6;
    }

    addCloseButton(this);
  }
}
