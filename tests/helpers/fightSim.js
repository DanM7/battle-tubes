// Headless 1v1 fight loop (no Phaser / river): scripted player brain vs CpuController.
import { Rider, OPEN_WATER, collideRiders } from '../../src/rider.js';
import { resolveAttack } from '../../src/combat.js';
import { CpuController, maxReach } from '../../src/ai.js';
import { OPPONENTS, CPU_SKILL_BY_RUNG, RIDER } from '../../src/config.js';
import { CHARACTERS } from '../../src/characters.js';

const NEUTRAL = { left: false, right: false, duck: false, high: false, mid: false, low: false };

/** Scripted rusher: closes to `attack` range and spams that button whenever idle. */
export function makeRusher(attack = 'mid') {
  return (me, opp) => {
    const out = { ...NEUTRAL };
    if (me.isOff || !me.canAct && me.state !== 'idle') {
      // Still lean while recovering so we stay on them.
    }
    const dist = Math.abs(opp.x - me.x);
    const reach = maxReach(me, attack);
    const toward = Math.sign(opp.x - me.x) || me.facing;
    if (dist > reach * 0.85) {
      if (toward > 0) out.right = true;
      else out.left = true;
    } else if (me.canAct) {
      out[attack] = true;
    } else if (dist > reach * 0.55) {
      if (toward > 0) out.right = true;
      else out.left = true;
    }
    return out;
  };
}

/**
 * One timed bout. Returns meters + per-attack outcomes from the player's swings.
 * `cpuKey` is an OPPONENTS key (e.g. 'Moni'); `rung` indexes CPU_SKILL_BY_RUNG.
 */
export function simulateFight({
  cpuKey = 'Moni',
  rung = 3,
  playerBrain = makeRusher('mid'),
  playerHeightIn = RIDER.playerHeightIn,
  duration = 25,
  dt = 1 / 60,
  seed,
} = {}) {
  if (seed != null) {
    // Deterministic enough for comparisons: mulberry32
    let s = seed >>> 0;
    Math.random = () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const cpuChar = CHARACTERS.find((c) => c.nickname === cpuKey);
  const profile = { ...OPPONENTS[cpuKey] };
  const skill = CPU_SKILL_BY_RUNG[Math.min(rung, CPU_SKILL_BY_RUNG.length - 1)];
  const heightIn = cpuChar?.stats?.hard?.heightIn ?? playerHeightIn;

  const player = new Rider({ name: 'P1', color: 0xe04848, side: -1, heightIn: playerHeightIn });
  const cpu = new Rider({ name: cpuKey, color: 0x3f6fe0, side: 1, heightIn });
  player.opponent = cpu;
  cpu.opponent = player;

  const cpuBrain = new CpuController(cpu, player, profile, skill, null);

  const outcomes = {
    high: { hit: 0, dodge: 0, duck: 0, whiff: 0 },
    mid: { hit: 0, dodge: 0, duck: 0, whiff: 0 },
    low: { hit: 0, dodge: 0, duck: 0, whiff: 0 },
  };
  let playerHitsLanded = 0;
  let cpuHitsLanded = 0;

  let time = 0;
  const steps = Math.ceil(duration / dt);
  for (let i = 0; i < steps; i++) {
    time += dt;
    const pIn = playerBrain(player, cpu, time);
    const cIn = cpuBrain.update(dt, time);
    player.update(dt, time, pIn, 0, OPEN_WATER, 0);
    cpu.update(dt, time, cIn, 0, OPEN_WATER, 0);
    collideRiders(player, cpu, time);

    for (const [attacker, defender, isPlayer] of [
      [player, cpu, true],
      [cpu, player, false],
    ]) {
      const result = resolveAttack(attacker, defender, time);
      if (!result) continue;
      const type = attacker.attack?.type;
      if (isPlayer && type && outcomes[type]) {
        if (result === 'dodge') outcomes[type].dodge++;
        else if (result === 'duck') outcomes[type].duck++;
        else if (result === 'high' || result === 'mid' || result === 'low' || result === 'looseGrip') {
          outcomes[type].hit++;
          playerHitsLanded++;
        }
      } else if (!isPlayer && (result === 'high' || result === 'mid' || result === 'low' || result === 'looseGrip')) {
        cpuHitsLanded++;
      }
      // Count player whiffs when active ends without connect — approximated via resolved whiff flag
      if (isPlayer && attacker.attack?.whiffed && type && outcomes[type] && result !== 'dodge' && result !== 'duck') {
        /* already counted dodge/duck */
      }
    }

    if (player.isOff || cpu.isOff) break;
    if (player.balance <= 0 || player.air <= 0 || cpu.balance <= 0 || cpu.air <= 0) break;
  }

  const playerDown = player.isOff || player.balance <= 0 || player.air <= 0;
  const cpuDown = cpu.isOff || cpu.balance <= 0 || cpu.air <= 0;
  let winner = null;
  if (cpuDown && !playerDown) winner = 'player';
  else if (playerDown && !cpuDown) winner = 'cpu';
  else if (player.balance + player.air > cpu.balance + cpu.air) winner = 'player';
  else if (cpu.balance + cpu.air > player.balance + player.air) winner = 'cpu';

  return {
    winner,
    duration: time,
    playerHitsLanded,
    cpuHitsLanded,
    outcomes,
    player: { balance: player.balance, air: player.air },
    cpu: { balance: cpu.balance, air: cpu.air },
  };
}

/** Many bouts; returns aggregate win rate and per-attack connect rates. */
export function runPlaytest({ trials = 40, attack = 'mid', ...opts } = {}) {
  const brain = makeRusher(attack);
  let wins = 0;
  let losses = 0;
  const totals = {
    high: { hit: 0, dodge: 0, duck: 0 },
    mid: { hit: 0, dodge: 0, duck: 0 },
    low: { hit: 0, dodge: 0, duck: 0 },
  };
  for (let i = 0; i < trials; i++) {
    const r = simulateFight({ ...opts, playerBrain: brain, seed: 1000 + i * 17 });
    if (r.winner === 'player') wins++;
    else if (r.winner === 'cpu') losses++;
    for (const type of ['high', 'mid', 'low']) {
      totals[type].hit += r.outcomes[type].hit;
      totals[type].dodge += r.outcomes[type].dodge;
      totals[type].duck += r.outcomes[type].duck;
    }
  }
  const rate = (type) => {
    const t = totals[type];
    const n = t.hit + t.dodge + t.duck;
    return {
      attempts: n,
      hitRate: n ? t.hit / n : 0,
      dodgeRate: n ? t.dodge / n : 0,
      duckRate: n ? t.duck / n : 0,
    };
  };
  return {
    trials,
    wins,
    losses,
    winRate: wins / trials,
    high: rate('high'),
    mid: rate('mid'),
    low: rate('low'),
  };
}
