import Phaser from 'phaser';

const KeyCodes = Phaser.Input.Keyboard.KeyCodes;

const ATTACK_ACTIONS = ['high', 'mid', 'low'];

export const KEYMAPS = {
  solo: { left: ['LEFT', 'A'], right: ['RIGHT', 'D'], duck: ['DOWN', 'S'], high: ['R'], mid: ['F'], low: ['V'] },
  p1: { left: ['A'], right: ['D'], duck: ['S'], high: ['R'], mid: ['F'], low: ['V'] },
  p2: {
    left: ['LEFT'],
    right: ['RIGHT'],
    duck: ['DOWN'],
    high: ['I', 'NUMPAD_EIGHT'],
    mid: ['K', 'NUMPAD_FIVE'],
    low: ['M', 'NUMPAD_TWO'],
  },
};

// Merges keyboard and on-screen touch buttons into { left, right, duck, high, mid, low }.
// left/right/duck are held states; attacks fire only on the frame they're pressed.
export class HumanController {
  constructor(scene, keymap, touch, touchPlayer) {
    this.touch = touch;
    this.touchPlayer = touchPlayer;
    this.keys = {};
    for (const [action, names] of Object.entries(keymap)) {
      this.keys[action] = names.map((name) => scene.input.keyboard.addKey(KeyCodes[name]));
    }
    this.prev = {};
  }

  held(action) {
    return this.keys[action].some((k) => k.isDown) || this.touch.isDown(this.touchPlayer, action);
  }

  update() {
    const out = { left: this.held('left'), right: this.held('right'), duck: this.held('duck') };
    for (const action of ATTACK_ACTIONS) {
      const down = this.held(action);
      out[action] = down && !this.prev[action];
      this.prev[action] = down;
    }
    return out;
  }
}
