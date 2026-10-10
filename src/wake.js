import { WAKE } from './config.js';

// The water surface at the riders' depth: the water between the two crests (one each
// side of the centerline) is raised to `amp`, and beyond each crest a smooth outer face
// drops back down to flat water.

const faceU = (x) => (Math.abs(x) - WAKE.crestX) / WAKE.halfBase;

// Height at x of a wake raised to `amp`, with crests `crest` from the centerline and
// outer faces `half` wide.
export function wakeProfile(x, amp, crest, half) {
  if (amp <= 0) return 0;
  const u = (Math.abs(x) - crest) / half;
  if (u <= 0) return amp;
  if (u >= 1) return 0;
  return (amp * (1 + Math.cos(Math.PI * u))) / 2;
}

export const wakeHeight = (x, amp) => wakeProfile(x, amp, WAKE.crestX, WAKE.halfBase);

// d(height)/dx: positive where the surface rises to the right.
export function wakeSlope(x, amp) {
  const u = faceU(x);
  if (amp <= 0 || u <= 0 || u >= 1) return 0;
  return -wakeMaxSlope(amp) * Math.sin(Math.PI * u) * Math.sign(x);
}

export function wakeMaxSlope(amp) {
  return (amp * Math.PI) / (2 * WAKE.halfBase);
}

// True if moving from prevX to x went up an outer face and over its crest onto the
// raised water. Going the other way just rides down the face.
export function crossedCrestInward(prevX, x) {
  if (Math.sign(prevX) !== Math.sign(x)) return false;
  const before = Math.abs(prevX) - WAKE.crestX;
  const after = Math.abs(x) - WAKE.crestX;
  return before >= 0 && after < 0 && before < WAKE.halfBase;
}
