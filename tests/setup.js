// localStorage for modules that persist (custom riders, progress, scores).
const store = new Map();
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => {
    store.set(key, String(value));
  },
  removeItem: (key) => {
    store.delete(key);
  },
  clear: () => {
    store.clear();
  },
};

// Minimal browser bits so Phaser (pulled in via tubeArt → riderArt) can load in Node.
if (!globalThis.window) globalThis.window = globalThis;
if (!globalThis.self) globalThis.self = globalThis;
if (!globalThis.document) {
  globalThis.document = {
    createElement: () => ({
      style: {},
      getContext: () => null,
      setAttribute() {},
      addEventListener() {},
    }),
    getElementsByTagName: () => [],
    addEventListener() {},
    body: { appendChild() {}, style: {} },
    documentElement: { style: {} },
  };
}
if (!globalThis.navigator) {
  globalThis.navigator = { userAgent: 'node', maxTouchPoints: 0 };
}
if (!globalThis.location) {
  globalThis.location = {
    hostname: 'localhost',
    href: 'http://localhost/',
    search: '',
    protocol: 'http:',
  };
}
if (!globalThis.history) {
  globalThis.history = { state: null, replaceState() {} };
}
if (!globalThis.HTMLCanvasElement) {
  globalThis.HTMLCanvasElement = class HTMLCanvasElement {};
}
if (!globalThis.Image) {
  globalThis.Image = class Image {
    constructor() {
      this.width = 0;
      this.height = 0;
    }
  };
}
if (!globalThis.AudioContext && !globalThis.webkitAudioContext) {
  globalThis.AudioContext = class AudioContext {
    constructor() {
      this.state = 'suspended';
      this.currentTime = 0;
      this.destination = {};
    }
    createGain() {
      return { connect() {}, gain: { value: 1 } };
    }
    createOscillator() {
      return { connect() {}, start() {}, stop() {}, frequency: { value: 0 }, type: 'sine' };
    }
    resume() {
      return Promise.resolve();
    }
  };
}
