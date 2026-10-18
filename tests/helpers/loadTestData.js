import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as config from '../../src/config.js';
import { applyCharacters, CHARACTERS } from '../../src/characters.js';
import { applyAudio } from '../../src/audio.js';
import { applyColors } from '../../src/riderColors.js';
import { applySite } from '../../src/copy.js';
import { applyTaunts } from '../../src/taunts.js';

const gameDataPath = fileURLToPath(new URL('../../../battle-tubes-data/game.json', import.meta.url));

let cached;

/** Loads battle-tubes-data/game.json into the mutable config exports (once per process). */
export function loadTestData() {
  if (cached) return cached;
  const data = JSON.parse(readFileSync(gameDataPath, 'utf8'));

  Object.assign(config.VIEW, {
    horizonY: data.view?.horizonY ?? 200,
    cameraHeight: data.view?.cameraHeight ?? 1000,
    riderScreenY: data.view?.riderScreenY ?? 440,
  });
  Object.assign(config.PHYSICS, data.physics ?? {});
  Object.assign(config.RIDER_ART, data.riderArt ?? {});
  Object.assign(config.RIVER, data.river ?? {});
  Object.assign(config.BOAT, structuredClone(data.boat ?? {}));
  Object.assign(config.DIFFICULTIES, structuredClone(data.difficulties ?? {}));
  Object.assign(config.WAKE, data.wake ?? {});
  Object.assign(config.JUMP, data.jump ?? {});
  Object.assign(config.STOMP, data.stomp ?? {});
  Object.assign(config.SHORE, data.shore ?? {});
  Object.assign(config.PICKUPS, structuredClone(data.pickups ?? {}));
  Object.assign(config.BUMP, data.bump ?? {});
  Object.assign(config.GRIP, data.grip ?? {});
  Object.assign(config.ENDURANCE, structuredClone(data.endurance ?? {}));
  Object.assign(config.DODGE, data.dodge ?? {});
  Object.assign(config.MATCH, data.match ?? {});
  Object.assign(config.SCORE, structuredClone(data.score ?? {}));
  Object.assign(config.CUSTOM, {
    ...structuredClone(data.custom ?? {}),
    shirts: data.custom?.shirts ?? [],
    trunks: data.custom?.trunks ?? [],
  });
  Object.assign(config.CHEATS, structuredClone(data.cheats ?? {}));
  config.HEIGHT_BANDS.length = 0;
  config.HEIGHT_BANDS.push(...(data.heightBands ?? []));
  config.setMaxGrip(data.maxGrip ?? 5);
  config.setUnlockAllPassword(data.unlockAllPassword ?? '');
  config.setUnlockHardPassword(data.unlockHardPassword ?? '');
  config.setCpuDeadzone(data.cpuDeadzone ?? 40);

  const tubeWidth = (data.riderArt?.tubeWidth ?? 120) * (data.riderArt?.scale ?? 1);
  Object.assign(config.RIDER, { ...data.rider, tubeWidth });

  for (const key of Object.keys(config.ATTACKS)) delete config.ATTACKS[key];
  for (const [id, atk] of Object.entries(data.attacks ?? {})) {
    const { reachEndExtra = 0, ...rest } = atk;
    config.ATTACKS[id] = { ...rest, reachEnd: tubeWidth + reachEndExtra };
  }

  config.CPU_SKILL_BY_RUNG.length = 0;
  config.CPU_SKILL_BY_RUNG.push(...structuredClone(data.cpuSkillByRung ?? []));

  const defaults = data.opponentDefaults ?? {};
  for (const key of Object.keys(config.OPPONENTS)) delete config.OPPONENTS[key];
  for (const [id, opp] of Object.entries(data.opponents ?? {})) {
    const { preferredDistanceExtra, ...rest } = opp;
    const entry = { ...defaults, ...rest };
    if (preferredDistanceExtra != null) {
      entry.preferredDistance = tubeWidth + preferredDistanceExtra;
    }
    config.OPPONENTS[id] = entry;
  }

  config.recomputeDerived();

  applyCharacters(data.characters);
  applyTaunts(data.taunts);
  applyAudio(data.audio);
  applyColors(data.colors);
  applySite(data.site ?? {});
  config.recomputeLadder(CHARACTERS);

  cached = data;
  return data;
}

/** Clears the cache so a later loadTestData() re-reads game.json (after edits). */
export function reloadTestData() {
  cached = undefined;
  return loadTestData();
}
