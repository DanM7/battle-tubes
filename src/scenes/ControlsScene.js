import { PagesScene } from './PagesScene.js';

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
        'P or Enter pauses.    Esc goes back.    2 Players: coming soon.',
      ],
    },
    {
      title: 'TOUCH',
      lines: [
        '◀ ▶ lean and ▼ duck on the left, HI / MID / LOW on the right.',
        'Gear (under your name) opens settings: Turn Info, music/SFX volume, and unlocked cheats. ❚❚ pauses.',
      ],
    },
  ],
];

export class ControlsScene extends PagesScene {
  constructor() {
    super('Controls', 'CONTROLS', PAGES);
  }
}
