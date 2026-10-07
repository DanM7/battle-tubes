import { WIDTH, HEIGHT } from './config.js';

const LABELS = { left: '◀', right: '▶', duck: '▼', high: 'HI', mid: 'MID', low: 'LOW' };

// On-screen buttons. Polls every active pointer each frame, so multi-touch and
// sliding a finger from one button to another both work.
//
// Each player's set: a d-pad on the outer edge (◀ ▶ with ▼ duck tucked below
// between them) and a HI / MID / LOW attack column.
export class TouchControls {
  constructor(scene, twoPlayer) {
    this.scene = scene;
    this.g = scene.add.graphics().setDepth(100);
    this.buttons = [];
    if (twoPlayer) {
      this.addPlayerSet(0, { size: 64, gap: 8, margin: 12, attacksBesideDpad: true, mirror: false });
      this.addPlayerSet(1, { size: 64, gap: 8, margin: 12, attacksBesideDpad: true, mirror: true });
    } else {
      this.addPlayerSet(0, { size: 90, gap: 12, margin: 18, attacksBesideDpad: false, mirror: false });
    }
  }

  // Lays the set out from the left edge; `mirror` flips it to the right edge.
  // Solo mode puts the attack column on the opposite edge of the screen instead.
  addPlayerSet(player, { size, gap, margin, attacksBesideDpad, mirror }) {
    const step = size + gap;
    const bottom = HEIGHT - margin - size;
    const dpadTop = bottom - Math.round(size * 0.55);
    const place = (action, x, y) => this.addButton(player, action, mirror ? WIDTH - x - size : x, y, size);

    place(mirror ? 'right' : 'left', margin, dpadTop);
    place('duck', margin + step, bottom);
    place(mirror ? 'left' : 'right', margin + 2 * step, dpadTop);

    const column = attacksBesideDpad ? margin + 3 * step : WIDTH - margin - size;
    place('high', column, bottom - 2 * step);
    place('mid', column, bottom - step);
    place('low', column, bottom);
  }

  addButton(player, action, x, y, size) {
    const label = LABELS[action];
    const text = this.scene.add
      .text(x + size / 2, y + size / 2, label, {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: `${Math.round(size * (label.length > 2 ? 0.26 : 0.36))}px`,
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setAlpha(0.85)
      .setDepth(101);
    this.buttons.push({ player, action, x, y, w: size, h: size, down: false, text });
  }

  update() {
    const pointers = this.scene.input.manager.pointers.filter((p) => p.isDown);
    const g = this.g;
    g.clear();
    for (const b of this.buttons) {
      b.down = pointers.some((p) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h);
      g.fillStyle(b.down ? 0xffffff : 0x000000, b.down ? 0.45 : 0.25);
      g.fillRoundedRect(b.x, b.y, b.w, b.h, 14);
      g.lineStyle(2, 0xffffff, 0.6);
      g.strokeRoundedRect(b.x, b.y, b.w, b.h, 14);
    }
  }

  isDown(player, action) {
    return this.buttons.some((b) => b.player === player && b.action === action && b.down);
  }
}
