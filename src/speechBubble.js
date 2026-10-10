import { WIDTH } from './config.js';

const WRAP = 210;
const PAD_X = 10;
const PAD_Y = 8;
const TAIL = 14;
const SCREEN_MARGIN = 8;
const OVERHANG = 30; // how far the box reaches past the rider on the side it doesn't grow toward

// A comic speech bubble whose tail points at an anchor (the speaker's head). The box
// grows away from the other rider: `dir` -1 grows left, +1 grows right.
export class SpeechBubble {
  constructor(scene, line, dir, color) {
    this.dir = dir;
    this.color = color;
    this.g = scene.add.graphics().setDepth(102);
    this.text = scene.add
      .text(0, 0, line, {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '15px',
        color: '#111111',
        align: 'center',
        wordWrap: { width: WRAP },
      })
      .setOrigin(0.5)
      .setDepth(103);
  }

  setAnchor(x, y) {
    const w = this.text.width + PAD_X * 2;
    const h = this.text.height + PAD_Y * 2;
    const preferred = this.dir < 0 ? x + OVERHANG - w : x - OVERHANG;
    const left = Math.max(SCREEN_MARGIN, Math.min(WIDTH - SCREEN_MARGIN - w, preferred));
    const top = y - TAIL - h;
    const tailX = Math.max(left + 12, Math.min(left + w - 12, x));

    const g = this.g;
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.lineStyle(3, this.color, 1);
    g.fillRoundedRect(left, top, w, h, 10);
    g.strokeRoundedRect(left, top, w, h, 10);
    g.fillTriangle(tailX - 8, top + h - 2, tailX + 8, top + h - 2, x, y);
    g.lineBetween(tailX - 8, top + h, x, y);
    g.lineBetween(tailX + 8, top + h, x, y);
    this.text.setPosition(left + w / 2, top + h / 2);
  }

  setAlpha(alpha) {
    this.g.setAlpha(alpha);
    this.text.setAlpha(alpha);
  }

  destroy() {
    this.g.destroy();
    this.text.destroy();
  }
}
