import { PHYSICS, RIDER, ATTACKS, DODGE, BUMP, SHORE, WAKE, JUMP, STOMP } from './config.js';
import { wakeHeight, wakeSlope, wakeMaxSlope, crossedCrest } from './wake.js';

const SCRAPE_TEXT_COOLDOWN = 1.5;

// How far a rider can swing this frame. `shore` is true when the river bank,
// not the end of the tow rope, is the limit (only then can you scrape).
export const OPEN_WATER = { limit: PHYSICS.swingLimit, shore: false };

// Rider states: idle | windup | active | recovery | hitstun | off
// Ducking is a flag layered on top of idle; airborne is independent of state.
export class Rider {
  constructor({ name, color, side, heightIn = RIDER.playerHeightIn, toughness = 1, mass = 1, leanPower = 1 }) {
    this.name = name;
    this.color = color;
    this.startSide = side;
    this.heightIn = heightIn;
    this.heightScale = heightIn / RIDER.baseHeightIn;
    this.reachScale = 1 + (this.heightScale - 1) * RIDER.reachPerHeight;
    this.toughness = toughness;
    this.mass = mass;
    this.leanPower = leanPower;
    this.opponent = null;
    this.reset();
  }

  reset() {
    this.side = this.startSide; // -1 left of the opponent, +1 right. Changes only by jumping over them.
    this.x = this.side * RIDER.startOffset;
    this.vx = 0;
    this.alt = 0; // tube bottom's height above flat water
    this.vz = 0;
    this.airborne = false;
    this.peakAlt = 0;
    this.stomped = false; // already stomped someone on this jump
    this.tilt = 0;
    this.wake = 0;
    this.balance = RIDER.maxBalance;
    this.air = RIDER.maxAir;
    this.state = 'idle';
    this.stateTimer = 0;
    this.attack = null;
    this.ducking = false;
    this.lean = 0;
    this.leanVisual = 0;
    this.prevLeft = false;
    this.prevRight = false;
    this.leanPresses = [];
    this.lastDamageTime = -Infinity;
    this.bounds = OPEN_WATER;
    this.onShore = false;
    this.lastScrapeEvent = -Infinity;
    this.flash = 0;
    this.off = null;
    this.events = [];
  }

  get isOff() {
    return this.state === 'off';
  }

  get canAct() {
    return this.state === 'idle' && !this.ducking && !this.airborne;
  }

  // Attacks always go toward the opponent.
  get facing() {
    return -this.side;
  }

  get isOneHanded() {
    return this.attack?.type === 'high' && ['windup', 'active', 'recovery'].includes(this.state);
  }

  // input: { left, right, duck, high, mid, low } where high/mid/low are true only on the frame pressed.
  // bounds: { limit, shore } for the river at the riders' position. wake: wake ridge height.
  update(dt, time, input, curve, bounds = OPEN_WATER, wake = 0) {
    this.bounds = bounds;
    this.wake = wake;
    if (!this.isOff) {
      if (input.left && !this.prevLeft) this.leanPresses.push({ dir: -1, time });
      if (input.right && !this.prevRight) this.leanPresses.push({ dir: 1, time });
    }
    this.prevLeft = input.left;
    this.prevRight = input.right;
    this.leanPresses = this.leanPresses.filter((p) => time - p.time < 1.5);

    this.lean = this.isOff ? 0 : (input.right ? 1 : 0) - (input.left ? 1 : 0);
    this.leanVisual += (this.lean - this.leanVisual) * Math.min(1, dt * 10);
    this.ducking = Boolean(input.duck) && this.state === 'idle' && !this.airborne;

    if (this.canAct) {
      const type = ['high', 'mid', 'low'].find((t) => input[t]);
      if (type) this.startAttack(type, time);
    }

    this.updateState(dt);
    this.updatePhysics(dt, time, curve);
    this.updateShore(dt, time);

    if (!this.isOff && time - this.lastDamageTime > RIDER.balanceRegenDelay) {
      this.balance = Math.min(RIDER.maxBalance, this.balance + RIDER.balanceRegen * dt);
    }
    this.flash = Math.max(0, this.flash - dt);
  }

  startAttack(type, time) {
    const cfg = ATTACKS[type];
    this.attack = { type, dir: this.facing, startTime: time, windupEnd: time + cfg.windup, resolved: false, whiffed: false };
    this.setState('windup', cfg.windup);
  }

  setState(state, duration = 0) {
    this.state = state;
    this.stateTimer = duration;
  }

  updateState(dt) {
    if (this.state === 'idle' || this.state === 'off') return;
    this.stateTimer -= dt;
    if (this.stateTimer > 0) return;

    const cfg = this.attack && ATTACKS[this.attack.type];
    switch (this.state) {
      case 'windup':
        this.setState('active', cfg.active);
        break;
      case 'active':
        this.setState('recovery', cfg.recovery + (this.attack.whiffed ? DODGE.whiffRecovery : 0));
        break;
      case 'recovery':
      case 'hitstun':
        this.attack = null;
        this.setState('idle');
        break;
    }
  }

  updatePhysics(dt, time, curve) {
    const p = PHYSICS;
    let leanAccel = (p.leanAccel + p.leanTurnBonus * Math.abs(curve)) * this.lean * this.leanPower;
    if (this.state === 'hitstun') leanAccel *= p.hitstunLeanFactor;
    if (this.ducking) leanAccel *= p.duckLeanFactor;
    if (this.airborne) leanAccel *= JUMP.airControl;
    const slide = this.airborne ? 0 : -wakeSlope(this.x, this.wake) * WAKE.slide;

    const ax = -curve * p.turnAccel + leanAccel + slide - this.x * p.ropeRestore;
    this.vx += ax * dt;
    this.vx *= Math.exp(-(this.airborne ? JUMP.airDrag : p.drag) * dt);
    const prevX = this.x;
    this.x += this.vx * dt;

    this.hitEdge(time);
    this.updateHeight(dt, prevX);
    this.updateTilt(dt);
  }

  // Grounded riders follow the water surface; going over a crest fast enough launches them.
  updateHeight(dt, prevX) {
    const ground = wakeHeight(this.x, this.wake);
    if (this.airborne) {
      this.vz -= JUMP.gravity * dt;
      this.alt += this.vz * dt;
      this.peakAlt = Math.max(this.peakAlt, this.alt);
      if (this.alt <= ground && this.vz <= 0) {
        this.airborne = false;
        this.alt = ground;
        this.vz = 0;
      }
      return;
    }

    const launch = Math.min(JUMP.maxLaunch, Math.abs(this.vx) * wakeMaxSlope(this.wake) * JUMP.launch);
    const jumps =
      !this.isOff && crossedCrest(prevX, this.x) && Math.abs(this.vx) >= JUMP.minSpeed && launch >= JUMP.minLaunch;
    if (!jumps) {
      this.alt = ground;
      return;
    }
    this.airborne = true;
    this.alt = Math.max(ground, this.wake);
    this.vz = launch;
    this.peakAlt = this.alt;
    this.stomped = false;
    this.ducking = false;
    this.events.push({ type: 'jump', launch });
  }

  // Grounded: matches the slope under the tube. Airborne: leading edge up on the way
  // up, down on the way down.
  updateTilt(dt) {
    let target = 0;
    if (this.isOff) target = 0;
    else if (this.airborne) target = Math.sign(this.vx) * (this.vz / 1500);
    else target = Math.atan(wakeSlope(this.x, this.wake));
    target = Math.max(-WAKE.maxTilt, Math.min(WAKE.maxTilt, target));
    this.tilt += (target - this.tilt) * Math.min(1, dt * 10);
  }

  hitEdge(time) {
    const p = PHYSICS;
    const { limit, shore } = this.bounds;
    if (Math.abs(this.x) <= limit) return;
    const edge = Math.sign(this.x);
    this.x = edge * limit;
    if (Math.sign(this.vx) !== edge) return;

    const impact = Math.abs(this.vx);
    this.vx = -this.vx * p.edgeRebound;
    if (!shore || this.isOff || impact <= p.edgeImpactSpeed) return;

    const damage = (impact - p.edgeImpactSpeed) * p.edgeImpactDamage * this.toughness;
    this.balance = Math.max(0, this.balance - damage);
    this.lastDamageTime = time;
    if (damage >= 2) this.events.push({ type: 'slam' });
    if (this.balance <= 0) this.knockOff('slammed', edge, time);
  }

  updateShore(dt, time) {
    const { limit, shore } = this.bounds;
    this.onShore = shore && !this.isOff && !this.airborne && Math.abs(this.x) >= limit - 2;
    if (!this.onShore) return;
    this[SHORE.meter] = Math.max(0, this[SHORE.meter] - SHORE.damagePerSecond * this.toughness * dt);
    this.lastDamageTime = time;
    if (time - this.lastScrapeEvent > SCRAPE_TEXT_COOLDOWN) {
      this.lastScrapeEvent = time;
      this.events.push({ type: 'scrape' });
    }
    if (this[SHORE.meter] <= 0) this.knockOff('beached', Math.sign(this.x), time);
  }

  heal(meters, amount) {
    if (this.isOff) return;
    for (const meter of meters) {
      const max = meter === 'air' ? RIDER.maxAir : RIDER.maxBalance;
      this[meter] = Math.min(max, this[meter] + amount);
    }
  }

  takeHit(cfg, dir, time, multiplier = 1) {
    this.vx += (dir * cfg.knockback) / this.mass;
    this[cfg.meter] = Math.max(0, this[cfg.meter] - cfg.damage * multiplier * this.toughness);
    this.lastDamageTime = time;
    this.flash = 0.12;
    this.attack = null;
    this.ducking = false;
    if (this[cfg.meter] <= 0) this.knockOff(cfg.meter === 'air' ? 'popped' : 'kicked', dir, time);
    else this.setState('hitstun', cfg.hitstun);
  }

  // Someone landed on top of you: hurts both balance and the tube.
  takeStomp(dir, time) {
    this.vx += (dir * STOMP.knockback) / this.mass;
    this.balance = Math.max(0, this.balance - STOMP.balanceDamage * this.toughness);
    this.air = Math.max(0, this.air - STOMP.airDamage * this.toughness);
    this.lastDamageTime = time;
    this.flash = 0.2;
    this.attack = null;
    this.ducking = false;
    if (this.air <= 0) this.knockOff('popped', dir, time);
    else if (this.balance <= 0) this.knockOff('stomped', dir, time);
    else this.setState('hitstun', STOMP.hitstun);
  }

  knockOff(reason, dir, time) {
    this.attack = null;
    this.ducking = false;
    this.setState('off');
    this.off = { reason, dir, time, x: this.x };
    this.events.push({ type: 'off', reason });
  }

  drainEvents() {
    const events = this.events;
    this.events = [];
    return events;
  }

  // Hurtboxes ('head' | 'body' | 'tube'): x1/x2 lateral world units, y1/y2 height above the water.
  // Body and head heights scale with the rider's height; widths don't.
  hurtBox(part) {
    if (part === 'tube') {
      const h = RIDER.tubeHeight * (this.air > 0 ? 0.35 + 0.65 * (this.air / RIDER.maxAir) : 0.15);
      return { x1: this.x - RIDER.tubeWidth / 2, x2: this.x + RIDER.tubeWidth / 2, y1: 0, y2: h };
    }
    const s = this.heightScale;
    const cx = this.x + this.leanVisual * RIDER.leanShift;
    const torsoTop = (RIDER.torsoTop - (this.ducking ? RIDER.duckDrop : 0)) * s;
    if (part === 'head') {
      const half = RIDER.headSize / 2;
      return { x1: cx - half, x2: cx + half, y1: torsoTop, y2: torsoTop + RIDER.headSize * s };
    }
    const half = RIDER.bodyWidth / 2;
    return { x1: cx - half, x2: cx + half, y1: RIDER.bodyBottom, y2: torsoTop };
  }

  reach(type) {
    return ATTACKS[type].reachEnd * this.reachScale;
  }

  // The punching arm / kicking leg box, or null. During windup it's drawn pulled in.
  attackBox() {
    if (!this.attack || (this.state !== 'windup' && this.state !== 'active')) return null;
    const cfg = ATTACKS[this.attack.type];
    const extend = this.state === 'active' ? 1 : 0.35;
    const a = this.x + this.attack.dir * cfg.reachStart;
    const b = this.x + this.attack.dir * (cfg.reachStart + (this.reach(this.attack.type) - cfg.reachStart) * extend);
    const aim = cfg.aimsAtTarget ? this.opponent.heightScale : 1;
    return { x1: Math.min(a, b), x2: Math.max(a, b), y1: cfg.yBottom * aim, y2: cfg.yTop * aim };
  }
}

// Riders whose tubes overlap sideways: a rider above the other's head passes over,
// one coming down on top of them after clearing their head stomps, and otherwise
// the tubes bump. Riders only change sides by going over each other.
// Returns { bump: closing speed or 0, stomp: { attacker, victim } or null }.
export function collideRiders(a, b, time) {
  const result = { bump: 0, stomp: null };
  if (Math.abs(a.x - b.x) < RIDER.tubeWidth) {
    const [high, low] = a.alt >= b.alt ? [a, b] : [b, a];
    const clearance = high.alt - low.alt;
    const headTop = low.hurtBox('head').y2;
    if (clearance < headTop && canStomp(high, low, clearance, headTop)) {
      stomp(high, low, time);
      result.stomp = { attacker: high, victim: low };
    } else if (clearance < headTop) {
      const aLeft = a.x !== b.x ? a.x < b.x : a.side < b.side;
      result.bump = aLeft ? bumpRiders(a, b) : bumpRiders(b, a);
    }
  }
  if (Math.abs(a.x - b.x) >= 1) {
    a.side = a.x < b.x ? -1 : 1;
    b.side = -a.side;
  }
  return result;
}

function canStomp(high, low, clearance, headTop) {
  return (
    high.airborne &&
    !high.stomped &&
    !high.isOff &&
    !low.isOff &&
    high.vz < 0 &&
    Math.abs(high.x - low.x) < RIDER.tubeWidth * STOMP.centered &&
    clearance >= RIDER.tubeHeight / 2 &&
    high.peakAlt - low.alt >= headTop
  );
}

function stomp(high, low, time) {
  const dir = Math.sign(low.x - high.x) || Math.sign(high.vx) || low.side;
  low.takeStomp(dir, time);
  high.vz = STOMP.bounce;
  high.stomped = true;
}

// Keeps the tubes from overlapping: they bounce lightly and always drift apart.
// Heavier riders get moved less (and so shove lighter ones around).
// Returns the closing speed of the bump (0 if the tubes weren't touching).
function bumpRiders(left, right) {
  const overlap = RIDER.tubeWidth - (right.x - left.x);
  if (overlap <= 0) return 0;

  const invLeft = 1 / left.mass;
  const invRight = 1 / right.mass;
  const invTotal = invLeft + invRight;

  const roomLeft = left.x + left.bounds.limit;
  const roomRight = right.bounds.limit - right.x;
  let pushLeft = Math.min((overlap * invLeft) / invTotal, roomLeft);
  const pushRight = Math.min(overlap - pushLeft, roomRight);
  pushLeft = Math.min(overlap - pushRight, roomLeft);
  left.x -= pushLeft;
  right.x += pushRight;

  const closing = left.vx - right.vx;
  if (closing > 0) {
    const impulse = (closing * (1 + BUMP.restitution)) / invTotal;
    left.vx -= impulse * invLeft;
    right.vx += impulse * invRight;
  }
  const separating = right.vx - left.vx;
  if (separating < BUMP.separationSpeed) {
    const impulse = (BUMP.separationSpeed - separating) / invTotal;
    left.vx -= impulse * invLeft;
    right.vx += impulse * invRight;
  }
  return Math.max(0, closing);
}
