import { describe, expect, it } from 'vitest';
import { seal, open, passwordMatches } from '../src/passwords.js';
import { loadTestData } from './helpers/loadTestData.js';
import { CHARACTERS } from '../src/characters.js';
import { CHEATS, UNLOCK_ALL_PASSWORD, UNLOCK_HARD_PASSWORD } from '../src/config.js';

describe('passwords', () => {
  it('round-trips plaintext through seal/open', () => {
    expect(open(seal('CROM'))).toBe('CROM');
    expect(open(seal('getlow'))).toBe('GETLOW');
    expect(open(seal('BART'))).toBe('BART');
  });

  it('passwordMatches ignores case and non-letters', () => {
    const sealed = seal('CROM');
    expect(passwordMatches('crom', sealed)).toBe(true);
    expect(passwordMatches('C-ROM', sealed)).toBe(true);
    expect(passwordMatches('WRONG', sealed)).toBe(false);
  });

  it('rejects mangled sealed strings', () => {
    expect(open('')).toBe(null);
    expect(open('AB')).toBe(null);
    expect(open(seal('CROM').slice(0, -1))).toBe(null);
  });
});

describe('game.json passwords', () => {
  it('every sealed unlock/cheat code opens to letters', () => {
    loadTestData();
    expect(open(UNLOCK_ALL_PASSWORD)).toMatch(/^[A-Z]+$/);
    expect(open(UNLOCK_HARD_PASSWORD)).toBe('BRAP');

    for (const [key, cheat] of Object.entries(CHEATS)) {
      const plain = open(cheat.password);
      expect(plain, key).toMatch(/^[A-Z]+$/);
      expect(passwordMatches(plain, cheat.password)).toBe(true);
    }

    for (const c of CHARACTERS) {
      if (!c.unlock?.password) continue;
      const plain = open(c.unlock.password);
      expect(plain, c.id).toMatch(/^[A-Z]+$/);
      expect(passwordMatches(plain, c.unlock.password)).toBe(true);
    }
  });
});
