import { addText } from '../pixelFont.js';

const BUTTON = { w: 28, h: 26, fill: 0x1d4e89, hover: 0x2a6bb8 };
const VALUE_WIDTH = 76;
const GAP = 8;

// A "LABEL [-] value [+]" control, left edge at x and centered on y. The buttons call
// `change(-1)` or `change(1)`; `format()` gives the value to show. The buttons start at
// least `labelWidth` past x, to line up a column of steppers, with `valueWidth` between
// them. Returns its right edge, `refresh()` to show the value again after something else
// changes it, and the objects it's made of.
export function addStepper(scene, x, y, label, { change, format, depth = 0, labelWidth = 0, valueWidth = VALUE_WIDTH }) {
  const title = addText(scene, x, y, label, { scale: 2 }).setOrigin(0, 0.5).setDepth(depth);
  let cx = x + Math.max(title.width, labelWidth) + GAP;
  const value = addText(scene, 0, y, '', { scale: 2 }).setOrigin(0.5).setDepth(depth);
  const objects = [title, value];
  const refresh = () => value.setText(format());
  for (const dir of [-1, 0, 1]) {
    if (!dir) {
      value.setX(cx + valueWidth / 2);
      cx += valueWidth;
      continue;
    }
    const bx = cx + BUTTON.w / 2;
    const button = scene.add
      .rectangle(bx, y, BUTTON.w, BUTTON.h, BUTTON.fill)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true })
      .setDepth(depth);
    objects.push(button, addText(scene, bx, y, dir < 0 ? '-' : '+', { scale: 2 }).setOrigin(0.5).setDepth(depth));
    button.on('pointerover', () => button.setFillStyle(BUTTON.hover));
    button.on('pointerout', () => button.setFillStyle(BUTTON.fill));
    button.on('pointerup', () => {
      change(dir);
      refresh();
    });
    cx += BUTTON.w;
  }
  refresh();
  return { right: cx, refresh, objects };
}
