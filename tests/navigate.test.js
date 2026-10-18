import { describe, expect, it } from 'vitest';
import { enterScene, leaveTo } from '../src/navigate.js';
import { mockScene } from './helpers/mockScene.js';

describe('leaveTo', () => {
  it('defers scene.start to the next poststep and only once', () => {
    const scene = mockScene();
    expect(leaveTo(scene, 'Difficulty')).toBe(true);
    expect(scene.leaving).toBe(true);
    expect(scene.input.enabled).toBe(true);
    // Not started yet — still in the click handler frame.
    expect(scene.game.scene.ops).toEqual([]);
    expect(scene.game.events.handlers.poststep).toHaveLength(1);

    scene.game.events.handlers.poststep[0]();
    expect(scene.game.scene.ops).toEqual([
      { op: 'stop', key: 'Mock' },
      { op: 'start', key: 'Difficulty', data: undefined },
    ]);
  });

  it('passes data through to scene.start', () => {
    const scene = mockScene();
    leaveTo(scene, 'PlayerSelect', { difficulty: 'easy' });
    scene.game.events.handlers.poststep[0]();
    expect(scene.game.scene.ops.at(-1)).toEqual({
      op: 'start',
      key: 'PlayerSelect',
      data: { difficulty: 'easy' },
    });
  });

  it('ignores a second leave while already leaving', () => {
    const scene = mockScene();
    expect(leaveTo(scene, 'Controls')).toBe(true);
    expect(leaveTo(scene, 'About')).toBe(false);
    expect(leaveTo(scene, 'Password')).toBe(false);
    expect(scene.game.events.handlers.poststep).toHaveLength(1);
  });

  it('blocks rapid easy-then-hard style double starts', () => {
    const scene = mockScene();
    expect(leaveTo(scene, 'PlayerSelect', { difficulty: 'easy' })).toBe(true);
    expect(leaveTo(scene, 'PlayerSelect', { difficulty: 'hard' })).toBe(false);
    scene.game.events.handlers.poststep[0]();
    const starts = scene.game.scene.ops.filter((o) => o.op === 'start');
    expect(starts).toHaveLength(1);
    expect(starts[0].data).toEqual({ difficulty: 'easy' });
  });
});

describe('enterScene', () => {
  it('clears leave state so Difficulty can be used again after Back', () => {
    const difficulty = mockScene();
    expect(leaveTo(difficulty, 'PlayerSelect', { difficulty: 'easy' })).toBe(true);
    difficulty.game.events.handlers.poststep[0]();
    expect(difficulty.leaving).toBe(true);

    // Simulate Phaser restarting Difficulty after Back from PlayerSelect.
    enterScene(difficulty);
    expect(difficulty.leaving).toBe(false);
    expect(difficulty.input.enabled).toBe(true);

    expect(leaveTo(difficulty, 'PlayerSelect', { difficulty: 'easy' })).toBe(true);
    difficulty.game.events.handlers.poststep[0]();
    const starts = difficulty.game.scene.ops.filter((o) => o.op === 'start');
    expect(starts).toHaveLength(2);
  });
});
