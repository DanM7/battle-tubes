import { beforeAll, describe, expect, it } from 'vitest';
import { enterScene, leaveTo } from '../src/navigate.js';
import { mockScene } from './helpers/mockScene.js';
import { loadTestData } from './helpers/loadTestData.js';
import { DIFFICULTIES } from '../src/config.js';
import { labFromQuery } from '../src/labs.js';

const flush = (scene) => {
  const fns = scene.game.events.handlers.poststep.splice(0);
  for (const fn of fns) fn();
};

/**
 * Integration-style checks for the menu flow without booting Phaser:
 * rapid taps must not stack scene.start calls.
 */
describe('menu navigation flow', () => {
  beforeAll(() => {
    loadTestData();
  });

  it('has both difficulty modes in game data', () => {
    expect(Object.keys(DIFFICULTIES).sort()).toEqual(['easy', 'hard']);
  });

  it('Menu → Difficulty → PlayerSelect survives only the first leave each hop', () => {
    const menu = mockScene('Menu');
    expect(leaveTo(menu, 'Difficulty')).toBe(true);
    expect(leaveTo(menu, 'Controls')).toBe(false);
    flush(menu);

    const difficulty = mockScene('Difficulty');
    expect(leaveTo(difficulty, 'PlayerSelect', { difficulty: 'easy' })).toBe(true);
    expect(leaveTo(difficulty, 'PlayerSelect', { difficulty: 'hard' })).toBe(false);
    flush(difficulty);
    expect(difficulty.game.scene.ops.filter((o) => o.op === 'start')).toEqual([
      { op: 'start', key: 'PlayerSelect', data: { difficulty: 'easy' } },
    ]);

    const select = mockScene('PlayerSelect');
    expect(leaveTo(select, 'Ladder', { campaign: { difficulty: 'easy' } })).toBe(true);
    expect(leaveTo(select, 'Ladder', { campaign: { difficulty: 'hard' } })).toBe(false);
    flush(select);
  });

  it('Mode → Easy → Back → Easy can leave again', () => {
    const difficulty = mockScene('Difficulty');
    expect(leaveTo(difficulty, 'PlayerSelect', { difficulty: 'easy' })).toBe(true);
    flush(difficulty);

    const select = mockScene('PlayerSelect');
    expect(leaveTo(select, 'Difficulty')).toBe(true);
    flush(select);

    // Difficulty create() after Back.
    enterScene(difficulty);
    expect(leaveTo(difficulty, 'PlayerSelect', { difficulty: 'easy' })).toBe(true);
    flush(difficulty);
    expect(difficulty.game.scene.ops.filter((o) => o.op === 'start')).toHaveLength(2);
  });

  it('back / close style leave only fires once', () => {
    const about = mockScene('About');
    expect(leaveTo(about, 'Menu')).toBe(true);
    expect(leaveTo(about, 'Menu')).toBe(false);
    flush(about);
    expect(about.game.scene.ops.filter((o) => o.op === 'start')).toHaveLength(1);
  });

  it('resolves lab query shortcuts', () => {
    expect(labFromQuery('create')?.scene).toBe('CreateLab');
    expect(labFromQuery('CHAR IMPORT')?.scene).toBe('CharImportLab');
    expect(labFromQuery('nope')).toBeUndefined();
  });
});
