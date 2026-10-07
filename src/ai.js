import { ATTACKS, CPU_DEADZONE, DODGE, RIDER, OPPONENTS } from './config.js';

const rand = (min, max) => min + Math.random() * (max - min);
const clamp01 = (v) => Math.max(0, Math.min(0.95, v));

const TARGET_HALF_WIDTH = { head: RIDER.headSize / 2, body: RIDER.bodyWidth / 2, tube: RIDER.tubeWidth / 2 };
const ATTACK_TYPES = ['high', 'mid', 'low'];

const RETREAT_DISTANCE = 480;
const RETREAT_RECOVERED_MARGIN = 30;
const RAM_TRIGGER = 200; // 'nearShore' rammers shove once you're this close to your edge
const RAM_OVERLAP = 40; // rammers aim this far inside tube contact so they keep pushing
const STRAFE_SPEED = 1.3; // radians per second
const PICKUP_LOOKAHEAD = 3.5; // seconds
const LEAN_SPEED_ESTIMATE = 220;

// Farthest center-to-center distance at which `attacker`'s attack still connects (with a little margin).
const maxReach = (attacker, type) => attacker.reach(type) + TARGET_HALF_WIDTH[ATTACKS[type].target] - 20;

// Produces the same input shape as a human controller: { left, right, duck, high, mid, low }.
// `profile` is an OPPONENTS entry, `skill` a CPU_SKILL_BY_RUNG entry. A profile with
// `mimics` fights like one of those OPPONENTS at a time, switching every `styleHold`
// seconds and at the start of each round.
export class CpuController {
  constructor(self, opponent, profile, skill, pickups = null) {
    this.self = self;
    this.opp = opponent;
    this.base = profile;
    this.skill = skill;
    this.pickups = pickups;
    this.style = null;
    this.reset();
  }

  reset() {
    this.attackTimer = rand(0.8, 1.6);
    this.dodge = null;
    this.duck = null;
    this.counterAt = null;
    this.pickupDecisions = new Map();
    this.strafePhase = Math.random() * Math.PI * 2;
    this.lastOppState = 'idle';
    this.pickStyle();
  }

  pickStyle() {
    const { mimics, styleHold } = this.base;
    if (mimics) {
      const options = mimics.filter((name) => name !== this.style);
      this.style = options[Math.floor(Math.random() * options.length)];
      this.styleTimer = rand(styleHold[0], styleHold[1]);
    }
    const p = mimics ? OPPONENTS[this.style] : this.base;
    this.profile = p;
    this.retreating = false;
    this.dodgeChance = clamp01(this.skill.reaction * p.defense);
    this.duckChance = clamp01(this.skill.reaction * p.defense * 1.2);
    this.counterChance = clamp01(this.skill.reaction * p.counter);
  }

  update(dt, time) {
    const me = this.self;
    const opp = this.opp;
    const out = { left: false, right: false, duck: false, high: false, mid: false, low: false };
    if (this.base.mimics) {
      this.styleTimer -= dt;
      if (this.styleTimer <= 0) this.pickStyle();
    }
    if (me.isOff) return out;

    const distance = Math.abs(opp.x - me.x);
    if (opp.state === 'windup' && this.lastOppState !== 'windup') this.react(time, distance);
    this.lastOppState = opp.state;

    if (this.duck && time >= this.duck.from) {
      if (time < this.duck.until) {
        out.duck = true;
        return out;
      }
      this.duck = null;
    }

    if (this.dodge) {
      if (time >= this.dodge.endAt) {
        this.dodge = null;
      } else if (time >= this.dodge.tapAt) {
        out[this.dodge.dir < 0 ? 'left' : 'right'] = true;
        return out;
      } else if (time >= this.dodge.releaseAt) {
        return out;
      }
    }

    const limit = me.bounds.limit;
    const targetX = Math.max(-limit, Math.min(limit, this.chooseTargetX(time)));
    const error = targetX - me.x;
    if (error > CPU_DEADZONE) out.right = true;
    else if (error < -CPU_DEADZONE) out.left = true;

    if (this.counterAt !== null && time >= this.counterAt) {
      this.counterAt = null;
      if (me.canAct && distance < maxReach(me, 'low')) {
        out.low = true;
        return out;
      }
    }

    this.attackTimer -= dt;
    if (me.canAct && this.attackTimer <= 0 && !this.retreating) {
      const type = this.pickAttack(distance);
      if (type) {
        out[type] = true;
        const [min, max] = this.skill.cooldown;
        this.attackTimer = rand(min, max) / this.profile.aggression;
      }
    }
    return out;
  }

  chooseTargetX(time) {
    const me = this.self;
    const opp = this.opp;
    const p = this.profile;

    if (p.retreatBelow > 0) {
      const threshold = this.retreating ? p.retreatBelow + RETREAT_RECOVERED_MARGIN : p.retreatBelow;
      this.retreating = me.balance < threshold;
    }

    const item = this.pickupTarget();
    if (item) return item.x;
    if (this.retreating) return opp.x + me.side * RETREAT_DISTANCE;

    const oppNearEdge = opp.side * opp.x > opp.bounds.limit - RAM_TRIGGER;
    if (p.ram === 'always' || (p.ram === 'nearShore' && oppNearEdge)) {
      return opp.x + me.side * (RIDER.tubeWidth - RAM_OVERLAP);
    }

    const strafe = p.strafe * Math.sin(time * STRAFE_SPEED + this.strafePhase);
    return opp.x + me.side * (p.preferredDistance + strafe);
  }

  // The soonest reachable health item it has decided to go for, if any.
  pickupTarget() {
    if (!this.pickups) return null;
    const me = this.self;
    let best = null;
    for (const item of this.pickups.upcoming()) {
      if (item.eta <= 0 || item.eta > PICKUP_LOOKAHEAD) continue;
      const onMySide = me.side * (item.x - this.opp.x) > -RIDER.tubeWidth / 2;
      const reachable = Math.abs(item.x - me.x) < RIDER.tubeWidth + item.eta * LEAN_SPEED_ESTIMATE;
      if (!onMySide || !reachable) continue;
      if (!this.pickupDecisions.has(item.id)) this.pickupDecisions.set(item.id, Math.random() < this.profile.greed);
      if (this.pickupDecisions.get(item.id) && (!best || item.eta < best.eta)) best = item;
    }
    return best;
  }

  react(time, distance) {
    const attack = this.opp.attack;
    if (attack.type === 'high') {
      if (Math.random() < this.duckChance) {
        this.duck = { from: attack.windupEnd - rand(0.05, 0.15), until: attack.windupEnd + ATTACKS.high.active + 0.05 };
      } else if (Math.random() < this.counterChance && distance < maxReach(this.self, 'low')) {
        this.counterAt = time + rand(0.05, 0.15);
      }
      return;
    }
    if (Math.random() < this.dodgeChance) {
      const tapAt = attack.windupEnd - rand(0.03, DODGE.window - 0.03);
      this.dodge = { dir: attack.dir, releaseAt: tapAt - 0.06, tapAt, endAt: tapAt + 0.12 };
    }
  }

  pickAttack(distance) {
    const me = this.self;
    const opp = this.opp;
    const prefs = this.profile.attacks;
    const sloppy = Math.random() < this.profile.sloppiness;
    const weights = {};
    let total = 0;
    for (const type of ATTACK_TYPES) {
      let w = sloppy || distance < maxReach(me, type) ? prefs[type] : 0;
      if (type === 'low' && opp.air < opp.balance) w *= 1.5;
      if (type !== 'low' && opp.balance < opp.air) w *= 1.3;
      weights[type] = w;
      total += w;
    }
    if (total === 0) return null;
    let roll = Math.random() * total;
    for (const type of ATTACK_TYPES) {
      roll -= weights[type];
      if (roll < 0) return type;
    }
    return 'low';
  }
}
