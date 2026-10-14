import { RIDER } from './config.js';
import { TEXELS_PER_UNIT, RUBBER } from './tubeArt.js';
import { riderTexture } from './riderColors.js';

// Rider animation strips from tools/cutout.py, seated in the drawn tubes from tubeArt.js.

export const RIDER_ANIM = { key: 'dan-punch', url: 'assets/sprites/riders/anim/dan-punch' };
// Dan holding both handles, then winding up and throwing a punch, then winding up a kick
// and kicking mid (at the body) and low (at the tube).
export const ATTACK_ANIM = {
  key: 'dan-attack',
  url: 'assets/sprites/riders/anim/dan-attack',
  hold: 0,
  windup: 1,
  punch: 2,
  kickWindup: 3,
  midKick: 4,
  lowKick: 5,
};
// The same frames with another rider's head on Dan's body (tools/cutout.py heads()).
export function attackAnim(id) {
  const name = id.toLowerCase();
  return name === 'dan' ? ATTACK_ANIM : { ...ATTACK_ANIM, key: `${name}-attack`, url: `assets/sprites/riders/anim/${name}-attack` };
}
const STANDING_UNITS = RIDER.torsoTop + RIDER.headSize; // a base-height rider standing, in world units
export const SPRITE_PX_PER_UNIT = 560 / STANDING_UNITS; // a standing rider picture is ~560px tall
// Texels wide; sprite pixels in from the handle's outer end; how far over it tips at a full lean.
const STRAP = { width: 3, inset: 8, maxAngle: Math.PI / 4 };
// Where the held handle's straps meet the tube: world units forward of the handle.
export const STRAP_OFFSET = 12;

// Call from a scene's preload().
export function preloadRiderAnim(scene, anim = RIDER_ANIM) {
  scene.load.json(`${anim.key}-meta`, `${anim.url}.json`);
  scene.load.image(`${anim.key}-strip`, `${anim.url}.png`);
}

// The strip as a spritesheet (made once), and its frame size, anchor and handles.
function riderAnim(scene, anim) {
  const meta = scene.cache.json.get(`${anim.key}-meta`);
  if (!scene.textures.exists(anim.key)) {
    scene.textures.addSpriteSheet(anim.key, scene.textures.get(`${anim.key}-strip`).getSourceImage(), {
      frameWidth: meta.frameWidth,
      frameHeight: meta.frameHeight,
    });
  }
  return meta;
}

// One rider in their tube: the tube's back half, the straps to the handle they hold, the
// rider, and the tube's front half, in a container whose origin is the tube's bottom center.
export class TubeRider {
  constructor(scene, anim = RIDER_ANIM) {
    this.scene = scene;
    this.anim = anim;
    this.meta = riderAnim(scene, anim);
    const { anchor, frameWidth, frameHeight } = this.meta;
    this.back = scene.add.image(0, 0, '__DEFAULT');
    this.straps = scene.add.graphics();
    this.rider = scene.add.image(0, 0, anim.key, 0).setOrigin(anchor.x / frameWidth, anchor.y / frameHeight);
    this.front = scene.add.image(0, 0, '__DEFAULT');
    this.container = scene.add.container(0, 0, [this.back, this.straps, this.rider, this.front]);
  }

  // `tube` is from tubeTextures(); its bottom center goes at x, y, with `scale` screen pixels
  // per world unit, turned `rotation` radians. The rider faces right (1) or left (-1), leans
  // -1 (left) to 1 (right), is `heightIn` tall, and shows animation frame `frame`. The near
  // handle's straps attach to the tube `strapOffset` world units forward of the handle (in
  // the way the rider faces).
  place(tube, x, y, scale, { facing = 1, lean = 0, heightIn = RIDER.baseHeightIn, showRider = true, strapOffset = STRAP_OFFSET, rotation = 0, frame = 0 } = {}) {
    const texel = scale / TEXELS_PER_UNIT;
    this.container.setPosition(x, y).setRotation(rotation);
    for (const [image, key] of [[this.back, tube.back], [this.front, tube.front]]) {
      image.setTexture(key).setOrigin(tube.origin.x, tube.origin.y).setScale(texel);
    }
    const s = (scale / SPRITE_PX_PER_UNIT) * (heightIn / RIDER.baseHeightIn);
    this.rider
      .setFrame(frame)
      .setScale(s * facing, s)
      .setPosition(tube.seat.x * texel + lean * RIDER.leanShift * scale, tube.seat.y * texel)
      .setVisible(showRider);
    this.straps.clear();
    if (showRider) this.drawStraps(tube, texel, s, facing, lean, lean * RIDER.leanShift * scale, strapOffset * scale * facing, frame);
    return this;
  }

  // A handle held out in front of the rider (past their anchor) is the far side's, strapped
  // down to the far rim where it sits when they don't lean; one beside or behind them is
  // the near side's.
  isFarHandle(handle) {
    return (handle.x1 + handle.x2) / 2 > this.meta.anchor.x;
  }

  // Whether the rider holds the far side's handle in `frame` (so the tube shouldn't draw it).
  holdsFarHandle(frame) {
    return (this.meta.handles[frame] ?? []).some((h) => this.isFarHandle(h));
  }

  // `leanShift` is how far (screen pixels) the rider has shifted their weight.
  drawStraps(tube, texel, s, facing, lean, leanShift, nearOffset, frame) {
    const { anchor } = this.meta;
    const rimAt = (far, sx) => {
      const rim = far ? tube.farRim(sx / texel) : tube.rim(sx / texel);
      return rim === null ? null : (rim + 2) * texel;
    };
    for (const handle of this.meta.handles[frame] ?? []) {
      const far = this.isFarHandle(handle);
      const top = this.rider.y + (handle.y - STRAP.inset - anchor.y) * s;
      for (const hx of [handle.x1 + STRAP.inset, handle.x2]) {
        const sx = this.rider.x + (hx - anchor.x) * s * facing;
        if (far) {
          // The far rim may not show past where the handle sits at rest, so the strap
          // stays fixed there while the hand shifts with the rider.
          const bx = sx - leanShift;
          const bottom = rimAt(true, bx);
          if (bottom !== null && bottom > top) this.drawStrap(sx, top, bx, bottom, texel);
          continue;
        }
        // The handle end moves with the rider; the tube end trails behind, so the strap
        // tips over to STRAP.maxAngle at a full lean.
        const plumb = rimAt(false, sx + nearOffset);
        if (plumb === null || plumb <= top) continue;
        const bx = sx + nearOffset - lean * Math.tan(STRAP.maxAngle) * (plumb - top);
        const bottom = rimAt(false, bx) ?? plumb;
        if (bottom > top) this.drawStrap(sx, top, bx, bottom, texel);
      }
    }
  }

  // A strap from (x1, y1) down to (x2, y2): a dark band with an outline, the same
  // thickness at any angle.
  drawStrap(x1, y1, x2, y2, texel) {
    const stretch = Math.hypot(x2 - x1, y2 - y1) / (y2 - y1);
    const band = (w, color) => {
      const h = (w * stretch) / 2;
      this.straps.fillStyle(color).fillPoints(
        [
          { x: x1 - h, y: y1 },
          { x: x1 + h, y: y1 },
          { x: x2 + h, y: y2 },
          { x: x2 - h, y: y2 },
        ],
        true,
      );
    };
    band(STRAP.width * texel, RUBBER.outline);
    band((STRAP.width - 2) * texel, RUBBER.dark1);
  }

  // Skin and trunks colors, as riderTexture() in riderColors.js takes them.
  setColors(colors) {
    this.rider.setTexture(riderTexture(this.scene, this.anim, colors), this.rider.frame.name);
    return this;
  }

  setVisible(visible) {
    this.container.setVisible(visible);
    return this;
  }

  setDepth(depth) {
    this.container.setDepth(depth);
    return this;
  }

  destroy() {
    this.container.destroy();
  }
}
