import { SITE, aboutPages } from '../copy.js';
import { PagesScene } from './PagesScene.js';

export class AboutScene extends PagesScene {
  constructor() {
    super('About', 'ABOUT', []);
  }

  create() {
    // Wording comes from game.json `site.about` (pages of { title, lines } sections).
    this.title = SITE.about.title || 'ABOUT';
    this.pages = aboutPages();
    if (!this.pages.length) this.pages = [[{ title: 'ABOUT', lines: ['No about text loaded.'] }]];
    super.create();
  }
}
