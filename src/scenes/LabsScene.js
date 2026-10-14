import Phaser from 'phaser';
import { WIDTH } from '../config.js';
import { addText } from '../pixelFont.js';
import { preloadBackground, addBackground, addBackButton, addMenuButton, menuGridCell } from './ui.js';

// Developer test benches, reached from the LAB button on the main menu (on localhost). The
// address bar follows along so a reload comes back to the same place: ?lab= on this screen,
// ?lab=<button text> in a lab (any case; spaces and punctuation are ignored).
const LABS = [
  { label: 'TUBE', scene: 'TubeLab' },
  { label: 'SIZE', scene: 'SizeLab' },
  { label: 'ATTACK', scene: 'AttackLab' },
  { label: 'CREATE', scene: 'CreateLab' },
];

const simplified = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, '');

// The lab ?lab=<text> asks for, if any.
export function labFromQuery(text) {
  return text ? LABS.find((lab) => simplified(lab.label) === simplified(text)) : undefined;
}

// Sets ?lab=<value>, or takes it out for null, without reloading.
export function setLabQuery(value) {
  const url = new URL(location.href);
  if (value === null) url.searchParams.delete('lab');
  else url.searchParams.set('lab', value);
  if (url.href !== location.href) history.replaceState(history.state, '', url);
}

export function startLab(scene, lab) {
  setLabQuery(simplified(lab.label));
  scene.scene.start(lab.scene);
}

export class LabsScene extends Phaser.Scene {
  constructor() {
    super('Labs');
  }

  preload() {
    preloadBackground(this);
  }

  create() {
    setLabQuery('');
    addBackground(this);
    addBackButton(this);
    addText(this, WIDTH / 2, 110, 'LABS', { scale: 8, color: '#ffdd55' }).setOrigin(0.5);
    addText(this, WIDTH / 2, 178, 'Test benches for new art and moves', { scale: 2 }).setOrigin(0.5);
    LABS.forEach((lab, i) => {
      const { x, y } = menuGridCell(i);
      addMenuButton(this, x, y, lab.label, () => startLab(this, lab));
    });
  }
}
