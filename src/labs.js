// Lab registry and URL helpers (no Phaser). Scenes live in scenes/*Lab*.js.
import { leaveTo } from './navigate.js';

export const LABS = [
  { label: 'TUBE', scene: 'TubeLab' },
  { label: 'SIZE', scene: 'SizeLab' },
  { label: 'ATTACK', scene: 'AttackLab' },
  { label: 'CREATE', scene: 'CreateLab' },
  { label: 'OPPONENTS', scene: 'OpponentsLab' },
  { label: 'BONUS OPP.', scene: 'BonusLab' },
  { label: 'MUSIC', scene: 'MusicLab' },
  { label: 'SFX', scene: 'SfxLab' },
  { label: 'PASSWORDS', scene: 'PasswordLab' },
  { label: 'CHAR. IMPORT', scene: 'CharImportLab' },
];

const simplified = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, '');

/** The lab ?lab=<text> asks for, if any. */
export function labFromQuery(text) {
  return text ? LABS.find((lab) => simplified(lab.label) === simplified(text)) : undefined;
}

/** Sets ?lab=<value>, or takes it out for null, without reloading. */
export function setLabQuery(value) {
  const url = new URL(location.href);
  if (value === null) url.searchParams.delete('lab');
  else url.searchParams.set('lab', value);
  if (url.href !== location.href) history.replaceState(history.state, '', url);
}

export function startLab(scene, lab) {
  setLabQuery(simplified(lab.label));
  leaveTo(scene, lab.scene);
}
