import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTestData } from './helpers/loadTestData.js';
import { CHARACTERS } from '../src/characters.js';

beforeAll(() => {
  loadTestData();
});

const animPng = (stem) =>
  fileURLToPath(new URL(`../public/assets/sprites/riders/anim/${stem}.png`, import.meta.url));

describe('Jay / Sanjo in-game look', () => {
  it('uses dedicated red-buzz attack heads, not RJ/Moni', () => {
    const jay = CHARACTERS.find((c) => c.id === 'Jay');
    const rj = CHARACTERS.find((c) => c.id === 'RJ');
    expect(jay.heads).toEqual({ easy: 'jay', hard: 'sanjo' });
    expect(jay.heads.easy).not.toBe(rj.heads.easy);
    expect(jay.heads.hard).not.toBe(rj.heads.hard);
    expect(existsSync(animPng('jay-attack'))).toBe(true);
    expect(existsSync(animPng('sanjo-attack'))).toBe(true);
  });

  it('keeps pale skin and red hair in looks used for match recolor', () => {
    const jay = CHARACTERS.find((c) => c.id === 'Jay');
    for (const mode of ['easy', 'hard']) {
      expect(jay.looks[mode].hair).toBe('#c44b2a');
      expect(jay.looks[mode].skin).toBe('#f2bf9f');
    }
    expect(jay.skin).toBe('#f2bf9f');
  });
});
