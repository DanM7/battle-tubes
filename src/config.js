// Canvas size stays in code. Everything else is filled from game.json (battle-tubes-data)
// at startup via gameData.js — edit that file to tune the game without redeploying.

export const WIDTH = 960;
export const HEIGHT = 540;

export const VIEW = {};
export const PHYSICS = {};
export const RIDER_ART = {};
export const RIDER = {};
export const RIVER = {};
export const BOAT = {};
export const DIFFICULTIES = {};
export const WAKE = {};
export const JUMP = {};
export const STOMP = {};
export const SHORE = {};
export const PICKUPS = {};
export const BUMP = {};
export const ATTACKS = {};
export const GRIP = {};
export const ENDURANCE = {};
export const DODGE = {};
export const MATCH = {};
export const SCORE = {};
export const CPU_SKILL_BY_RUNG = [];
export const OPPONENTS = {};
export const HEIGHT_BANDS = [];
export const CUSTOM = {};
export const CHEATS = {};
export const LADDER_ORDER = [];

export let RIDER_Z = 0;
export let ROPE_LENGTH = 1900;
export let CPU_DEADZONE = 40;
export let SKIN = 0xf1c27d;
export let GRIP_PER_POINT = 0.06;
export let MAX_GRIP = 5;
export let UNLOCK_ALL_PASSWORD = '';
export let UNLOCK_HARD_PASSWORD = '';
export let BOSS = undefined;
export let SUB_BOSS = undefined;

export const setCpuDeadzone = (v) => {
  CPU_DEADZONE = v;
};
export const setSkin = (v) => {
  SKIN = v;
};
export const setGripPerPoint = (v) => {
  GRIP_PER_POINT = v;
};
export const setMaxGrip = (v) => {
  MAX_GRIP = v;
};
export const setUnlockAllPassword = (v) => {
  UNLOCK_ALL_PASSWORD = v;
};
export const setUnlockHardPassword = (v) => {
  UNLOCK_HARD_PASSWORD = v;
};

export function recomputeDerived() {
  RIDER_Z =
    (VIEW.cameraDepth * VIEW.cameraHeight * (HEIGHT / 2)) / (VIEW.riderScreenY - VIEW.horizonY);
  ROPE_LENGTH = 1900;
}

export function recomputeLadder(characters) {
  LADDER_ORDER.length = 0;
  LADDER_ORDER.push(
    ...characters
      .filter((c) => c.ladderId)
      .sort((a, b) => a.ladderId - b.ladderId)
      .map((c) => c.nickname),
  );
  BOSS = LADDER_ORDER.at(-1);
  SUB_BOSS = LADDER_ORDER.at(-2);
}
