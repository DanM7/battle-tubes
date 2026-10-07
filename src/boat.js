import { BOAT } from './config.js';

const rand = (min, max) => min + Math.random() * (max - min);
const smoothstep = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

// The boat's throttle: holds a speed, announces the next one BOAT.warning seconds
// ahead, then eases speed, wake height and turn fling over BOAT.transition seconds.
// `tiers`: the BOAT.speeds keys it may use (must include 'slow', the starting speed).
export class Boat {
  constructor(tiers = Object.keys(BOAT.speeds)) {
    this.tiers = tiers;
    this.reset();
  }

  reset() {
    this.tier = 'slow';
    this.next = null;
    this.from = BOAT.speeds.slow;
    this.to = BOAT.speeds.slow;
    this.blend = 1;
    this.holdTimer = rand(BOAT.holdMin, BOAT.holdMax);
  }

  update(dt) {
    if (this.blend < 1) {
      this.blend = Math.min(1, this.blend + dt / BOAT.transition);
      return;
    }
    this.holdTimer -= dt;
    if (!this.next && this.holdTimer <= BOAT.warning) this.next = this.pickNext();
    if (this.holdTimer > 0) return;

    this.from = { speed: this.speed, wake: this.wake, fling: this.fling };
    this.to = BOAT.speeds[this.next];
    this.tier = this.next;
    this.next = null;
    this.blend = 0;
    this.holdTimer = rand(BOAT.holdMin, BOAT.holdMax);
  }

  pickNext() {
    const options = this.tiers.filter((tier) => tier !== this.tier).map((tier) => [tier, BOAT.speeds[tier]]);
    let roll = Math.random() * options.reduce((sum, [, s]) => sum + s.weight, 0);
    for (const [tier, s] of options) {
      roll -= s.weight;
      if (roll < 0) return tier;
    }
    return options[0][0];
  }

  get speed() {
    return lerp(this.from.speed, this.to.speed, smoothstep(this.blend));
  }

  get wake() {
    return lerp(this.from.wake, this.to.wake, smoothstep(this.blend));
  }

  get fling() {
    return lerp(this.from.fling, this.to.fling, smoothstep(this.blend));
  }

  // Seconds until the announced change, or null if none is announced.
  get timeToChange() {
    return this.next ? Math.max(0, this.holdTimer) : null;
  }
}
