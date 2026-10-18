/** Minimal stand-in for a Phaser scene used by leaveTo / navigation tests. */
export function mockScene(key = 'Mock') {
  const ops = [];
  const handlers = { poststep: [] };
  const scene = {
    leaving: false,
    input: { enabled: true },
    scene: { key },
    sys: {
      game: null, // filled below
      isActive: () => true,
    },
    game: null,
  };
  const game = {
    events: {
      once(event, fn) {
        (handlers[event] ??= []).push(fn);
      },
      handlers,
    },
    scene: {
      ops,
      isActive: (k) => k === key && !ops.some((o) => o.op === 'stop' && o.key === k),
      isPaused: () => false,
      isSleeping: () => false,
      stop(k) {
        ops.push({ op: 'stop', key: k });
      },
      start(k, data) {
        ops.push({ op: 'start', key: k, data });
      },
    },
  };
  scene.sys.game = game;
  scene.game = game;
  return scene;
}
