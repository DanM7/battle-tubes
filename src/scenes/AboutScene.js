import { PagesScene } from './PagesScene.js';

const PAGES = [
  [
    {
      title: 'BATTLE TUBES',
      lines: [
        'Two riders, two tubes, one boat. Punch, kick, duck and lean until somebody goes in the river.',
        'Climb the ladder in 1999 or 2010, unlock secret riders, and chase a high score.',
      ],
    },
    {
      title: 'MORE TO COME',
      lines: ['More about the game and the riders is on the way.'],
    },
  ],
];

export class AboutScene extends PagesScene {
  constructor() {
    super('About', 'ABOUT', PAGES);
  }
}
