import { WAKE } from './config.js';

// The water surface at the riders' depth: flat, except for two smooth ridges
// (one each side of the centerline) whose height is `amp`.

const ridgeU = (x) => (Math.abs(x) - WAKE.crestX) / WAKE.halfBase;

export function wakeHeight(x, amp) {
  const u = ridgeU(x);
  if (amp <= 0 || Math.abs(u) >= 1) return 0;
  return (amp * (1 + Math.cos(Math.PI * u))) / 2;
}

// d(height)/dx: positive where the surface rises to the right.
export function wakeSlope(x, amp) {
  const u = ridgeU(x);
  if (amp <= 0 || Math.abs(u) >= 1) return 0;
  return -wakeMaxSlope(amp) * Math.sin(Math.PI * u) * Math.sign(x);
}

export function wakeMaxSlope(amp) {
  return (amp * Math.PI) / (2 * WAKE.halfBase);
}

// True if moving from prevX to x went over a crest.
export function crossedCrest(prevX, x) {
  if (Math.sign(prevX) !== Math.sign(x)) return false;
  const before = Math.abs(prevX) - WAKE.crestX;
  const after = Math.abs(x) - WAKE.crestX;
  return before < 0 !== after < 0 && Math.abs(before) < WAKE.halfBase;
}
