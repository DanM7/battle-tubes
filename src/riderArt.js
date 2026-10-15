import { RIDER } from './config.js';
import { TEXELS_PER_UNIT, RUBBER } from './tubeArt.js';
import { riderTexture } from './riderColors.js';
import { fillQuad } from './draw.js';

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
export const BUILDS = ['skinny', 'normal', 'chubby', 'fat', 'huge'];
// Per mode, how much bigger the pictures are drawn than the rider's height makes them:
// 2010's riders are grown men, and at their height alone they look like big kids.
export const ART_SCALE = { easy: 1, hard: 1.1 };
export const GENDERS = ['boy', 'girl'];
// Per gender, the hair styles, the first the default. A boy's are Dan's head with other
// hair (his own first), always his face: art/riders/hair/<style>.jpg, which
// tools/cutout.py puts on every build. A girl's are Dan's frames redrawn as a girl with
// that hair: art/riders/girls/<style>/.
export const HAIR_STYLES = { boy: ['classic', 'spiky', 'buzz', 'crop', 'mohawk', 'long'], girl: ['ponytail', 'ponytail-no-bangs'] };
export const hairStyleLabel = (style) => style.replaceAll('-', ' ').toUpperCase();
// The builds each gender comes in (girls are only drawn in the normal one so far).
export const genderBuilds = (gender) => (gender === 'girl' ? ['normal'] : BUILDS);
const attackFrames = (name) => ({ ...ATTACK_ANIM, key: `${name}-attack`, url: `assets/sprites/riders/anim/${name}-attack` });
// The same frames on another build (characters.js `body`), with Dan's head in a hair
// style, or a girl's frames in hers.
export function buildAnim(build, hairStyle, gender = 'boy') {
  if (gender === 'girl') return attackFrames(`girl-${HAIR_STYLES.girl.includes(hairStyle) ? hairStyle : HAIR_STYLES.girl[0]}`);
  const style = HAIR_STYLES.boy.indexOf(hairStyle) > 0 ? [hairStyle] : [];
  const name = ['dan', ...style, ...(build === 'normal' ? [] : [build])].join('-');
  return name === 'dan' ? ATTACK_ANIM : attackFrames(name);
}
// A character's characters.js `looks` entry for `mode` (easy's if that mode has none), if any.
export const characterLook = (c, mode = 'easy') => c.looks?.[mode] ?? c.looks?.easy;
// A character's attack frames in `mode`: their build with their head for that mode
// (characters.js `body` and `heads`; tools/cutout.py makes them), or Dan's head (or a
// girl's frames, by `gender`) in their look's hair style.
export function attackAnim(c, mode = 'easy') {
  const head = c.heads?.[mode] ?? c.heads?.easy;
  return head ? attackFrames(head) : buildAnim(c.body ?? 'normal', characterLook(c, mode)?.hairStyle, c.gender);
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

export const isRiderAnimLoaded = (scene, anim) => scene.cache.json.exists(`${anim.key}-meta`) && scene.textures.exists(`${anim.key}-strip`);

// After preload(): loads `anim`, then calls `done` (right away if it's already loaded).
// Not called if the scene stops first, or if it doesn't load.
export function loadRiderAnim(scene, anim, done) {
  if (isRiderAnimLoaded(scene, anim)) return done();
  scene.load.once('complete', () => isRiderAnimLoaded(scene, anim) && done());
  preloadRiderAnim(scene, anim);
  scene.load.start();
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

// Where the head is in `anim`'s first (holding on) frame, in frame pixels: the top of
// the picture, and how far left and right it reaches in the HEAD_ROWS rows from there.
const HEAD_ROWS = 60;
function headBounds(scene, anim, { frameWidth: w, frameHeight: h }) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(scene.textures.get(`${anim.key}-strip`).getSourceImage(), 0, 0);
  const { data } = ctx.getImageData(0, 0, w, h);
  let top = -1;
  let left = w;
  let right = 0;
  for (let y = 0; y < h && (top < 0 || y < top + HEAD_ROWS); y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] < 128) continue;
      if (top < 0) top = y;
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
  }
  return { top: Math.max(0, top), left, right };
}

// One rider in their tube: the tube's back half, the straps to the handle they hold, the
// rider, and the tube's front half, in a container whose origin is the tube's bottom center.
export class TubeRider {
  constructor(scene, anim = RIDER_ANIM) {
    this.scene = scene;
    this.anim = anim;
    this.meta = riderAnim(scene, anim);
    this.meta.head ??= headBounds(scene, anim, this.meta);
    const { anchor, frameWidth, frameHeight } = this.meta;
    this.back = scene.add.image(0, 0, '__DEFAULT');
    this.straps = scene.add.graphics();
    this.rider = scene.add.image(0, 0, riderTexture(scene, anim), 0).setOrigin(anchor.x / frameWidth, anchor.y / frameHeight);
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
      fillQuad(this.straps.fillStyle(color), { x: x1 - h, y: y1 }, { x: x1 + h, y: y1 }, { x: x2 + h, y: y2 }, { x: x2 - h, y: y2 });
    };
    band(STRAP.width * texel, RUBBER.outline);
    band((STRAP.width - 2) * texel, RUBBER.dark1);
  }

  // Skin, trunks and hair colors, as riderTexture() in riderColors.js takes them.
  setColors(colors) {
    this.rider.setTexture(riderTexture(this.scene, this.anim, colors), this.rider.frame.name);
    return this;
  }

  // The top of the rider's head and its left and right edges on screen, where place()
  // last put them (as they hold on).
  headBox() {
    const { top, left, right } = this.meta.head;
    const m = this.rider.getWorldTransformMatrix();
    const at = (x) => m.transformPoint(x - this.rider.displayOriginX, top - this.rider.displayOriginY);
    const [a, b] = [at(left), at(right)];
    return { left: Math.min(a.x, b.x), right: Math.max(a.x, b.x), top: Math.min(a.y, b.y) };
  }

  // The tube filled with `color` (a warning flash), or as drawn (null).
  flashTube(color) {
    for (const image of [this.back, this.front]) {
      if (color === null) image.clearTint();
      else image.setTintFill(color);
    }
    return this;
  }

  // The rider all white for a moment, when hit.
  setFlash(on) {
    if (on) this.rider.setTintFill(0xffffff);
    else this.rider.clearTint();
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
