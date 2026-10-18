// Loads game.json from the battle-tubes-data sibling repo (dev) or GitHub (deployed),
// then fills the mutable exports in config / characters / taunts / audio / riderColors.
// Matching flash-cards: data edits never need a new Netlify deploy of the game.

import { IS_MOBILE } from './device.js';
import * as config from './config.js';
import { CHARACTERS, applyCharacters } from './characters.js';
import { applyTaunts } from './taunts.js';
import { applyAudio } from './audio.js';
import { applyColors } from './riderColors.js';
import { applySite } from './copy.js';

/** Served by the Vite dev server from ../battle-tubes-data/game.json. */
const LOCAL_URL = '/game.json';

/** Deployed builds read the data repo on GitHub, so data changes don't need a new deploy. */
export const REMOTE_URL = 'https://raw.githubusercontent.com/DanM7/battle-tubes-data/main/game.json';

export const gameDataUrl = (dev) => (dev ? LOCAL_URL : REMOTE_URL);

const SECTIONS = [
  'physics',
  'riderArt',
  'rider',
  'river',
  'boat',
  'difficulties',
  'wake',
  'jump',
  'stomp',
  'shore',
  'pickups',
  'bump',
  'attacks',
  'grip',
  'endurance',
  'dodge',
  'match',
  'score',
  'cpuSkillByRung',
  'opponents',
  'custom',
  'cheats',
  'characters',
  'taunts',
  'audio',
  'colors',
  'site',
];

/** "#rrggbb" or 0xRRGGBB → integer. Leaves non-colors alone. */
export function parseColor(value) {
  if (typeof value === 'number') return value >>> 0;
  if (typeof value !== 'string') return value;
  const s = value.trim();
  if (/^#?[0-9a-fA-F]{6}$/.test(s)) return parseInt(s.replace(/^#/, ''), 16);
  if (/^0x[0-9a-fA-F]+$/i.test(s)) return parseInt(s, 16);
  return value;
}

function paintColors(value, keys = null) {
  if (Array.isArray(value)) return value.map((v) => paintColors(v, keys));
  if (!value || typeof value !== 'object') return parseColor(value);
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (keys ? keys.includes(k) : /^(color|trunks|skin|hair|shirts)$/i.test(k) || k.endsWith('Color')) {
      out[k] = Array.isArray(v) ? v.map(parseColor) : parseColor(v);
    } else if (k === 'looks' || k === 'danColors') out[k] = paintColors(v, ['skin', 'hair', 'trunks']);
    else if (typeof v === 'object' && v) out[k] = paintColors(v, keys);
    else out[k] = v;
  }
  return out;
}

function clearObject(target) {
  for (const key of Object.keys(target)) delete target[key];
}

function fillObject(target, source) {
  clearObject(target);
  Object.assign(target, source);
}

function applyConfig(data) {
  const lift = IS_MOBILE ? (data.view?.mobileViewLift ?? 60) : 0;
  const view = data.view ?? {};
  const fov = ((view.fieldOfView ?? 100) / 2) * Math.PI / 180;
  fillObject(config.VIEW, {
    horizonY: (view.horizonY ?? 200) - lift,
    cameraHeight: view.cameraHeight ?? 1000,
    cameraDepth: 1 / Math.tan(fov),
    drawDistance: view.drawDistance ?? 150,
    riderScreenY: (view.riderScreenY ?? 440) - lift,
  });

  fillObject(config.PHYSICS, data.physics);
  fillObject(config.RIDER_ART, data.riderArt);
  fillObject(config.RIDER, {
    ...data.rider,
    tubeWidth: data.riderArt.tubeWidth * data.riderArt.scale,
  });
  fillObject(config.RIVER, data.river);
  fillObject(config.BOAT, structuredClone(data.boat));
  fillObject(config.DIFFICULTIES, structuredClone(data.difficulties));
  fillObject(config.WAKE, data.wake);
  fillObject(config.JUMP, data.jump);
  fillObject(config.STOMP, data.stomp);
  fillObject(config.SHORE, data.shore);
  fillObject(config.PICKUPS, structuredClone(data.pickups));
  fillObject(config.BUMP, data.bump);

  clearObject(config.ATTACKS);
  for (const [id, atk] of Object.entries(data.attacks)) {
    const { reachEndExtra = 0, ...rest } = atk;
    config.ATTACKS[id] = { ...rest, reachEnd: config.RIDER.tubeWidth + reachEndExtra };
  }

  fillObject(config.GRIP, data.grip);
  fillObject(config.ENDURANCE, structuredClone(data.endurance));
  fillObject(config.DODGE, data.dodge);
  fillObject(config.MATCH, data.match);
  fillObject(config.SCORE, structuredClone(data.score));

  config.setCpuDeadzone(data.cpuDeadzone);
  config.CPU_SKILL_BY_RUNG.length = 0;
  config.CPU_SKILL_BY_RUNG.push(...structuredClone(data.cpuSkillByRung));

  const defaults = data.opponentDefaults ?? {};
  clearObject(config.OPPONENTS);
  for (const [id, opp] of Object.entries(data.opponents)) {
    const { preferredDistanceExtra, ...rest } = opp;
    const entry = { ...defaults, ...rest };
    if (preferredDistanceExtra != null) {
      entry.preferredDistance = config.RIDER.tubeWidth + preferredDistanceExtra;
    }
    config.OPPONENTS[id] = entry;
  }

  config.setSkin(parseColor(data.skin));
  config.setGripPerPoint(data.gripPerPoint);
  config.setMaxGrip(data.maxGrip);
  config.HEIGHT_BANDS.length = 0;
  config.HEIGHT_BANDS.push(...(data.heightBands ?? []).map((n) => (n == null ? Infinity : n)));
  // Only shirts/trunks are colors; other CUSTOM fields (maxRiders, heights, …) stay numbers.
  fillObject(config.CUSTOM, {
    ...structuredClone(data.custom),
    shirts: (data.custom.shirts ?? []).map(parseColor),
    trunks: (data.custom.trunks ?? []).map(parseColor),
  });
  config.setUnlockAllPassword(data.unlockAllPassword);
  config.setUnlockHardPassword(data.unlockHardPassword ?? '');
  fillObject(config.CHEATS, structuredClone(data.cheats));

  config.recomputeDerived();
}

/** Fetches and applies game.json. Call once before starting Phaser. */
export async function loadGameData() {
  const response = await fetch(gameDataUrl(Boolean(import.meta.env?.DEV)));
  if (!response.ok) {
    throw new Error(`Couldn't load game data (HTTP ${response.status}).`);
  }
  const json = await response.json();
  for (const path of SECTIONS) {
    if (json[path] == null || typeof json[path] !== 'object') {
      throw new Error(`The game data file has no "${path}" section.`);
    }
  }
  if (!Array.isArray(json.characters)) throw new Error('The game data file has no "characters" list.');
  if (!Array.isArray(json.taunts)) throw new Error('The game data file has no "taunts" list.');

  applyConfig(json);
  applyCharacters(paintColors(json.characters, ['color', 'trunks', 'skin', 'hair']));
  applyTaunts(json.taunts);
  applyAudio(json.audio);
  applyColors({
    skinTones: json.colors.skinTones.map(parseColor),
    trunksColors: json.colors.trunksColors.map(parseColor),
    hairColors: json.colors.hairColors.map(parseColor),
    danColors: paintColors(json.colors.danColors, ['skin', 'trunks', 'hair']),
    baseShade: { ...json.colors.baseShade },
  });
  applySite(json.site);

  // Ladder order depends on characters + is exported from config.
  config.recomputeLadder(CHARACTERS);
  return json;
}
