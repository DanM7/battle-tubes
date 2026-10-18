import { beforeAll, describe, expect, it } from 'vitest';
import { reloadTestData } from './helpers/loadTestData.js';
import { runPlaytest } from './helpers/fightSim.js';
import { OPPONENTS } from '../src/config.js';

beforeAll(() => {
  reloadTestData();
});

describe('Moni playtests', () => {
  it('has a mid-kick hole in her defense profile', () => {
    const m = OPPONENTS.Moni;
    expect(m.defend?.mid).toBeLessThan(m.defend?.high ?? 1);
    expect(m.defend?.mid).toBeLessThan(0.35);
    expect(m.defend?.high).toBeGreaterThan(1);
  });

  it('ducks most punches but mid kicks usually connect', () => {
    const punch = runPlaytest({ trials: 36, attack: 'high', cpuKey: 'Moni', rung: 3, duration: 18 });
    const mid = runPlaytest({ trials: 36, attack: 'mid', cpuKey: 'Moni', rung: 3, duration: 18 });

    expect(punch.high.attempts).toBeGreaterThan(50);
    expect(mid.mid.attempts).toBeGreaterThan(50);

    // Discernable weakness: punches are mostly avoided; mid kicks mostly land.
    expect(punch.high.duckRate + punch.high.dodgeRate).toBeGreaterThan(0.55);
    expect(mid.mid.hitRate).toBeGreaterThan(0.55);
    expect(mid.mid.hitRate).toBeGreaterThan(punch.high.hitRate + 0.25);
  });

  it('a mid-kick rusher beats Moni more often than a punch rusher', () => {
    const punch = runPlaytest({ trials: 40, attack: 'high', cpuKey: 'Moni', rung: 3, duration: 22 });
    const mid = runPlaytest({ trials: 40, attack: 'mid', cpuKey: 'Moni', rung: 3, duration: 22 });
    expect(mid.winRate).toBeGreaterThanOrEqual(punch.winRate);
    expect(mid.winRate).toBeGreaterThan(0.45);
  });
});
