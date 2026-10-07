import { ATTACKS, DODGE, GRIP } from './config.js';

// Checks the attacker's active attack against the defender. Returns null if nothing
// happened this frame, otherwise one of:
//   'high' | 'mid' | 'low'  a clean hit
//   'looseGrip'             low kick on a one-handed (punching) rider: extra tube damage
//   'duck'                  punch passed over a ducking defender
//   'dodge'                 defender tapped away in time
export function resolveAttack(attacker, defender, time) {
  const attack = attacker.attack;
  if (attacker.state !== 'active' || attack.resolved || defender.isOff) return null;
  if (attacker.airborne || defender.airborne) return null;

  const cfg = ATTACKS[attack.type];
  const box = attacker.attackBox();
  const target = defender.hurtBox(cfg.target);
  if (box.x2 < target.x1 || box.x1 > target.x2) return null;

  if (box.y2 <= target.y1 || box.y1 >= target.y2) {
    if (!defender.ducking) return null;
    attack.resolved = true;
    attack.whiffed = true;
    return 'duck';
  }

  attack.resolved = true;
  if (dodged(defender, attack)) {
    attack.whiffed = true;
    defender.vx += attack.dir * DODGE.impulse;
    return 'dodge';
  }

  const looseGrip = cfg.target === 'tube' && defender.isOneHanded;
  defender.takeHit(cfg, attack.dir, time, looseGrip ? GRIP.oneHandedTubeDamageMultiplier : 1);
  return looseGrip ? 'looseGrip' : attack.type;
}

// "Away" from the attacker is the same direction the attack travels.
function dodged(defender, attack) {
  if (defender.state === 'hitstun') return false;
  const press = defender.leanPresses.find((p) => p.time >= attack.startTime && p.dir === attack.dir);
  return Boolean(press) && press.time >= attack.windupEnd - DODGE.window;
}
