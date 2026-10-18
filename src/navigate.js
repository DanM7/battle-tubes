// One-shot scene changes. Double-tapping menu buttons used to call scene.start twice
// while the old scene was still tearing down, which froze the game.
//
// Starts are deferred to the next game poststep so:
// 1. The pointerup that clicked Back / Easy cannot also hit buttons on the new scene.
// 2. We never call scene.start mid-input-dispatch (a known Phaser freeze).
//
// Do NOT set input.enabled = false: Phaser reuses the InputPlugin across restarts, and a
// stuck disabled flag made Mode → Easy → Back leave Difficulty dead.

/**
 * Clears leave state for a scene that just entered create(). Call at the top of create.
 */
export function enterScene(scene) {
  scene.leaving = false;
  if (scene.input) scene.input.enabled = true;
}

/**
 * Starts another scene once. Returns false if this scene is already leaving so a
 * second tap (or a second button) cannot stack another start.
 */
export function leaveTo(scene, key, data) {
  if (scene.leaving) return false;
  scene.leaving = true;
  const from = scene.scene.key;
  const game = scene.sys.game;
  // Prefer the game bus: the leaving scene's timers die on shutdown.
  game.events.once('poststep', () => {
    const mgr = game.scene;
    if (mgr.isActive(from) || mgr.isPaused(from) || mgr.isSleeping(from)) mgr.stop(from);
    mgr.start(key, data);
  });
  return true;
}
