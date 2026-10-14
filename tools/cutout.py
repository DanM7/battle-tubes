"""Cuts characters out of flat-background images (e.g. Gemini renders) into transparent PNGs.

    python tools/cutout.py                       everything below
    python tools/cutout.py <in.jpg> <out.png>    one select-screen image
    add --keep-shadow to keep the drop shadow under their feet

Select-screen pictures: every art/riders/*.jpg becomes public/assets/sprites/riders/<same
name>.png, cropped to the character and widened on one side so their head is centered
left to right (the rider select grid shows the top middle of it).

Animations: each folder art/riders/anim/<name>/ holds one animation's frames, in file name
order. They become one strip, public/assets/sprites/riders/anim/<name>.png, of equal-size
frames, plus <name>.json with the frame size and anchor. Every frame is scaled so the
rider's blue life vest covers VEST_AREA pixels (so all animations of all riders share a
scale) and placed so its anchor lands on the same spot: left to right, the middle of the
vest; top to bottom, the lowest point of the rider (their knees or feet on the tube).
The JSON also lists the tube handles each frame's rider is holding (dark gray bars), left
to right, as x1, x2 (their ends) and y (their bottom) in frame pixels, so the game can
strap them to the tube. Each frame's skin and swim trunks are redrawn in a few fixed
shades (the JSON's palette), evened out between frames, so the game can recolor them for
each player; finding them is tuned to Dan (orange trunks, brown hair).

The background is whatever color the corners are. Everything connected to the image
border that's close to that color, or a soft gray drop shadow on it, becomes
transparent; the character's own grays survive because they aren't connected to the
border. A patch of dirt or grass under them goes too, as do big pockets of background the
character encloses (between an arm and the body). JPEG noise leaves a speckle of light
gray just outside the character's dark outline, so a few passes then peel any grayish,
not-dark pixel off the edge.
"""

import json
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

BG_TOLERANCE = 28     # max RGB distance from the background color
SHADOW_CHROMA = 32    # shadows are gray: max - min channel below this...
SHADOW_MIN = 95       # ...and no darker than this (keeps black outlines)
FRINGE_PASSES = 2     # edge peels; few enough that they can't eat through an outline
FRINGE_CHROMA = 36    # an edge pixel this gray...
FRINGE_MIN = 80       # ...and no darker than this is fringe, not outline
HOLE_MIN = 120        # an enclosed pocket this many pixels or more...
HOLE_BG_SHARE = 0.5   # ...that's at least this much background color is cleared too
GROUND_ROWS = 0.25    # the bottom this much of the picture may be ground...
EARTH_WARMTH = 45     # ...cleared where it's no redder than this (skin is far redder)...
EARTH_MIN = 45        # ...no darker than this (outlines are)...
EARTH_MAX = 215       # ...and no brighter than this
PAD = 2
HEAD_ROWS = 0.18      # the top this much of the character is taken to be their head
VEST_AREA = 9000      # animation frames are scaled so the life vest covers this many pixels
HANDLE_MAX = 0x80     # a tube handle is dark (no channel above this)...
HANDLE_THICK = 5      # ...at least twice this thick (outlines and shading are thinner)...
HANDLE_MIN_CORE = 30  # ...with a core this big once that much is worn off its edges...
HANDLE_VEST_SHARE = 0.2  # ...and not mostly surrounded by vest (its straps are as dark)
HANDLE_GRIP_GAP = 45  # pieces of handle this close side by side, with a fist between them...
HANDLE_GRIP_RISE = 12  # ...and bottoms this close in height, are one handle

# Skin and swim trunks are redrawn in fixed shades, darkest first: Dan's, measured from his
# punch frames. The game swaps these exact colors for each player's own (riderColors.js).
SKIN_SHADES = [(109, 56, 51), (161, 93, 79), (216, 131, 105), (243, 176, 128)]
TRUNKS_SHADES = [(148, 65, 39), (196, 94, 41), (242, 131, 42)]
# Each frame's skin and trunks are brightened or darkened to match Dan's punch frames at
# this percentile of brightness (highlights look alike in every pose; shadows don't)...
SHADE_MATCH_PERCENTILE = 85
SKIN_MATCH_LUMA = 192.4
TRUNKS_MATCH_LUMA = 156.5
# ...after finding them: warm colors (reds through oranges) that aren't hair...
WARM_MIN_SATURATION = 0.2
WARM_MIN_VALUE = 75
# ...with the trunks the big, very saturated ones...
TRUNKS_MIN_SATURATION = 0.66
TRUNKS_MIN_VALUE = 115
TRUNKS_MIN_SHARE = 0.2  # pieces at least this share of the biggest piece (both legs)
# ...and the hair the hair-colored ones joined to the top of the head. Hair and shaded
# skin overlap in color, so this is the odds from a fit to Dan's (g/r, b/r, r/255),
# normalized by HAIR_MEAN and HAIR_SPREAD; dark warm pixels count as hair too.
HAIR_WEIGHTS = (3.226, -2.868, -2.812)
HAIR_BIAS = -4.200
HAIR_MEAN = (0.6213, 0.4716, 0.7967)
HAIR_SPREAD = (0.0737, 0.0611, 0.1663)
HAIR_DARK = 140
HAIR_BELOW_VEST = 10  # how far below the vest's top the head can reach (the neck)
HAIR_TOP_ROWS = 6  # hair touches the top this close to it
HAIR_SPECK = 150  # leftover bits smaller than this...
HAIR_SPECK_SKIN = 0.15  # ...with no more than this share of skin around them are hair

ROOT = Path(__file__).resolve().parent.parent
ART_DIR = ROOT / 'art' / 'riders'
ANIM_DIR = ART_DIR / 'anim'
SPRITE_DIR = ROOT / 'public' / 'assets' / 'sprites' / 'riders'
ANIM_OUT_DIR = SPRITE_DIR / 'anim'


def background_mask(rgb, keep_shadow):
    corners = np.array([rgb[0, 0], rgb[0, -1], rgb[-1, 0], rgb[-1, -1]])
    bg = np.median(corners, axis=0)
    near_bg = np.linalg.norm(rgb - bg, axis=2) < BG_TOLERANCE
    if keep_shadow:
        passable = near_bg
    else:
        chroma = rgb.max(axis=2) - rgb.min(axis=2)
        shadow = (chroma < SHADOW_CHROMA) & (rgb.min(axis=2) >= SHADOW_MIN) & (rgb.max(axis=2) <= bg.max() + 10)
        passable = near_bg | shadow
    seen = flood_from_border(passable)

    # The bottom of what's left may be a patch of ground; let the fill through dull
    # browns, grays and grass greens there. Skin and clothes are brighter or more
    # colorful, and outlines darker, so it stops at the character.
    rows = np.nonzero((~seen).any(axis=1))[0]
    ground_top = int(rows[0] + (rows[-1] - rows[0]) * (1 - GROUND_ROWS))
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    lo, hi = rgb.min(axis=2), rgb.max(axis=2)
    earthy = (r >= g - 8) & (g >= b - 8) & (r - g < EARTH_WARMTH) & (lo >= EARTH_MIN) & (hi <= EARTH_MAX)
    grassy = (g >= r) & (g > b + 10) & (hi < EARTH_MAX)
    in_ground = np.zeros(seen.shape, bool)
    in_ground[ground_top:] = True
    passable = passable | (in_ground & (earthy | grassy))
    seen = flood_from_border(passable)

    # Background showing through a gap the character encloses (between an arm and the
    # body, say): a big enough pocket that's mostly the background color.
    for blob in blobs(passable & ~seen):
        ys, xs = np.array(blob).T
        if len(blob) >= HOLE_MIN and near_bg[ys, xs].mean() >= HOLE_BG_SHARE:
            seen[ys, xs] = True
    return seen


def flood_from_border(passable):
    h, w = passable.shape
    seen = np.zeros((h, w), bool)
    queue = deque()
    for y in range(h):
        for x in (0, w - 1):
            if passable[y, x] and not seen[y, x]:
                seen[y, x] = True
                queue.append((y, x))
    for x in range(w):
        for y in (0, h - 1):
            if passable[y, x] and not seen[y, x]:
                seen[y, x] = True
                queue.append((y, x))
    while queue:
        y, x = queue.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and passable[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                queue.append((ny, nx))
    return seen


def blobs(mask):
    """Each 4-connected group of True pixels in `mask`, as a list of (y, x)."""
    h, w = mask.shape
    seen = np.zeros((h, w), bool)
    for sy, sx in zip(*np.nonzero(mask)):
        if seen[sy, sx]:
            continue
        blob = [(sy, sx)]
        seen[sy, sx] = True
        i = 0
        while i < len(blob):
            y, x = blob[i]
            i += 1
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    blob.append((ny, nx))
        yield blob


def drop_specks(alpha, min_size=40):
    """Removes small islands of leftover JPEG noise."""
    for blob in blobs(alpha.copy()):
        if len(blob) < min_size:
            ys, xs = np.array(blob).T
            alpha[ys, xs] = False


def peel_fringe(rgb, alpha):
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    grayish = (chroma < FRINGE_CHROMA) & (rgb.min(axis=2) >= FRINGE_MIN)
    for _ in range(FRINGE_PASSES):
        clear = np.pad(~alpha, 1, constant_values=True)
        edge = alpha & (clear[:-2, 1:-1] | clear[2:, 1:-1] | clear[1:-1, :-2] | clear[1:-1, 2:])
        alpha &= ~(edge & grayish)


def cut(src, keep_shadow=False):
    """The character in `src`, cropped, as an RGBA array."""
    rgb = np.asarray(Image.open(src).convert('RGB')).astype(int)
    alpha = ~background_mask(rgb, keep_shadow)
    peel_fringe(rgb, alpha)
    drop_specks(alpha)
    ys, xs = np.nonzero(alpha)
    top, bottom = max(ys.min() - PAD, 0), min(ys.max() + PAD + 1, rgb.shape[0])
    left, right = max(xs.min() - PAD, 0), min(xs.max() + PAD + 1, rgb.shape[1])
    return np.dstack([rgb, alpha * 255]).astype(np.uint8)[top:bottom, left:right]


def head_center_x(alpha):
    """Median midpoint of the opaque pixels in each of the top HEAD_ROWS rows."""
    rows = np.nonzero(alpha.any(axis=1))[0]
    head = rows[rows < rows[0] + (rows[-1] - rows[0]) * HEAD_ROWS]
    mids = [(np.nonzero(alpha[y])[0][[0, -1]].sum()) / 2 for y in head]
    return int(round(np.median(mids)))


def select_sprite(src, dst, keep_shadow=False):
    rgba = cut(src, keep_shadow)
    head = head_center_x(rgba[..., 3] > 0)
    w = rgba.shape[1]
    half = max(head, w - head)
    centered = np.zeros((rgba.shape[0], half * 2, 4), np.uint8)
    centered[:, half - head:half - head + w] = rgba
    Image.fromarray(centered, 'RGBA').save(dst)
    print(f'{dst}: {centered.shape[1]}x{centered.shape[0]}')


def vest_mask(rgba):
    r, g, b = (rgba[..., i].astype(int) for i in range(3))
    return (rgba[..., 3] > 0) & (b > 110) & (b > r + 50) & (b > g + 15)


def shifted_and(mask, steps):
    """`mask` worn away `steps` pixels from every edge."""
    for _ in range(steps):
        p = np.pad(mask, 1)
        mask = mask & p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:]
    return mask


def handles(rgba):
    """The tube handles in a frame, as dicts of x1, x2 (ends) and y (bottom)."""
    r, g, b = (rgba[..., i].astype(int) for i in range(3))
    dark = (rgba[..., 3] > 0) & (np.maximum(np.maximum(r, g), b) <= HANDLE_MAX) & (b >= r - 10)
    vest = vest_mask(rgba)
    found = []
    for core in blobs(shifted_and(dark, HANDLE_THICK)):
        if len(core) < HANDLE_MIN_CORE:
            continue
        ys, xs = np.array(core).T
        top, bottom = ys.min() - HANDLE_THICK, ys.max() + HANDLE_THICK
        left, right = xs.min() - HANDLE_THICK, xs.max() + HANDLE_THICK
        ring = vest[max(top - 6, 0):bottom + 7, max(left - 6, 0):right + 7]
        if ring.mean() > HANDLE_VEST_SHARE:
            continue
        found.append({'x1': int(left), 'x2': int(right), 'y': int(bottom)})

    # A hand gripping the middle of a handle splits it into one piece on each side.
    merged = []
    for h in sorted(found, key=lambda h: h['x1']):
        last = merged[-1] if merged else None
        if last and h['x1'] - last['x2'] <= HANDLE_GRIP_GAP and abs(h['y'] - last['y']) <= HANDLE_GRIP_RISE:
            last.update(x2=max(last['x2'], h['x2']), y=max(last['y'], h['y']))
        else:
            merged.append(dict(h))
    return merged


def grown(mask, steps):
    """`mask` grown `steps` pixels out from every edge."""
    for _ in range(steps):
        p = np.pad(mask, 1)
        mask = mask | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
    return mask


def luma(rgb):
    return rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114


def body_regions(rgba):
    """Masks of a frame's skin and swim trunks (see SKIN_SHADES)."""
    rgb = rgba[..., :3].astype(float)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    hi, lo = rgb.max(axis=2), rgb.min(axis=2)
    sat = (hi - lo) / np.maximum(hi, 1)
    warm = (rgba[..., 3] > 0) & (r >= g) & (g >= b - 10) & (sat > WARM_MIN_SATURATION) & (hi > WARM_MIN_VALUE)

    vest_top = np.nonzero(vest_mask(rgba).any(axis=1))[0].min()
    head = np.zeros(warm.shape, bool)
    head[:vest_top + HAIR_BELOW_VEST] = True
    features = (np.stack([(g + 1) / (r + 1), (b + 1) / (r + 1), (r + 1) / 255], axis=-1) - HAIR_MEAN) / HAIR_SPREAD
    hairy = np.clip(features @ np.array(HAIR_WEIGHTS) + HAIR_BIAS, -50, 50) > 0
    top = np.nonzero(warm.any(axis=1))[0].min()
    hair = np.zeros(warm.shape, bool)
    for blob in blobs(warm & head & (hairy | (hi < HAIR_DARK))):
        ys, xs = np.array(blob).T
        if ys.min() <= top + HAIR_TOP_ROWS:
            hair[ys, xs] = True
    # Highlights in the hair: small bits it (and outlines) surround.
    for blob in blobs(warm & head & ~hair):
        if len(blob) >= HAIR_SPECK:
            continue
        ys, xs = np.array(blob).T
        bit = np.zeros(warm.shape, bool)
        bit[ys, xs] = True
        ring = grown(bit, 2) & ~bit
        if (ring & warm & ~hair).sum() <= ring.sum() * HAIR_SPECK_SKIN:
            hair[ys, xs] = True

    pieces = sorted(blobs(warm & ~hair & (sat > TRUNKS_MIN_SATURATION) & (hi > TRUNKS_MIN_VALUE)), key=len, reverse=True)
    trunks = np.zeros(warm.shape, bool)
    for piece in pieces:
        if len(piece) >= len(pieces[0]) * TRUNKS_MIN_SHARE:
            ys, xs = np.array(piece).T
            trunks[ys, xs] = True
    return warm & ~hair & ~trunks, trunks


def palettize(rgba):
    """Redraws a frame's skin and trunks in SKIN_SHADES and TRUNKS_SHADES, in place."""
    skin, trunks = body_regions(rgba)
    keys = {tuple(c) for c in SKIN_SHADES + TRUNKS_SHADES}
    for mask, shades, match in ((skin, SKIN_SHADES, SKIN_MATCH_LUMA), (trunks, TRUNKS_SHADES, TRUNKS_MATCH_LUMA)):
        if not mask.any():
            continue
        lum = luma(rgba[mask][:, :3].astype(float))
        lum += match - np.percentile(lum, SHADE_MATCH_PERCENTILE)
        levels = luma(np.array(shades, float))
        rgba[mask, :3] = np.array(shades)[np.abs(lum[:, None] - levels[None]).argmin(axis=1)]
    # Anything else that happens to be one of those exact colors is nudged off it.
    others = (rgba[..., 3] > 0) & ~skin & ~trunks
    for key in keys:
        clash = others & np.all(rgba[..., :3] == key, axis=2)
        rgba[clash, 2] = np.where(rgba[clash, 2] < 255, rgba[clash, 2] + 1, 254)


def scaled(rgba, k):
    if abs(k - 1) < 0.01:
        return rgba.copy()
    im = Image.fromarray(rgba, 'RGBA').convert('RGBa')
    size = (max(1, round(im.width * k)), max(1, round(im.height * k)))
    return np.array(im.resize(size, Image.LANCZOS).convert('RGBA'))


def hex_color(rgb):
    return '#%02x%02x%02x' % tuple(rgb)


def animation(folder, keep_shadow=False):
    frames = []
    for src in sorted(folder.glob('*.jp*g')) + sorted(folder.glob('*.png')):
        rgba = cut(src, keep_shadow)
        vest = vest_mask(rgba)
        if vest.sum() == 0:
            sys.exit(f'{src}: no blue life vest found to line the frame up by')
        rgba = scaled(rgba, (VEST_AREA / vest.sum()) ** 0.5)
        rgba[..., 3] = np.where(rgba[..., 3] >= 128, 255, 0)
        palettize(rgba)
        vest = vest_mask(rgba)
        anchor_x = int(round(np.nonzero(vest)[1].mean()))
        anchor_y = int(np.nonzero(rgba[..., 3])[0].max()) + 1
        frames.append((src.name, rgba, anchor_x, anchor_y))
    if not frames:
        return

    left = max(ax for _, _, ax, _ in frames)
    right = max(f.shape[1] - ax for _, f, ax, _ in frames)
    up = max(ay for _, _, _, ay in frames)
    down = max(f.shape[0] - ay for _, f, _, ay in frames)
    fw, fh = left + right, up + down
    strip = np.zeros((fh, fw * len(frames), 4), np.uint8)
    held = []
    for i, (_, f, ax, ay) in enumerate(frames):
        x, y = i * fw + left - ax, up - ay
        strip[y:y + f.shape[0], x:x + f.shape[1]] = f
        dx, dy = left - ax, up - ay
        held.append([{'x1': h['x1'] + dx, 'x2': h['x2'] + dx, 'y': h['y'] + dy} for h in handles(f)])

    ANIM_OUT_DIR.mkdir(parents=True, exist_ok=True)
    png = ANIM_OUT_DIR / f'{folder.name}.png'
    Image.fromarray(strip, 'RGBA').save(png)
    meta = {
        'frameWidth': fw,
        'frameHeight': fh,
        'frames': len(frames),
        'anchor': {'x': left, 'y': up},
        'vestArea': VEST_AREA,
        'sources': [name for name, *_ in frames],
        'handles': held,
        'palette': {'skin': [hex_color(c) for c in SKIN_SHADES], 'trunks': [hex_color(c) for c in TRUNKS_SHADES]},
    }
    (ANIM_OUT_DIR / f'{folder.name}.json').write_text(json.dumps(meta, indent=2) + '\n')
    print(f'{png}: {len(frames)} frame(s) of {fw}x{fh}, anchor {left},{up}, handles {held}')


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    keep_shadow = '--keep-shadow' in sys.argv
    if args:
        select_sprite(*args, keep_shadow)
        return
    SPRITE_DIR.mkdir(parents=True, exist_ok=True)
    for src in sorted(ART_DIR.glob('*.jp*g')):
        select_sprite(src, SPRITE_DIR / f'{src.stem}.png', keep_shadow)
    if ANIM_DIR.is_dir():
        for folder in sorted(p for p in ANIM_DIR.iterdir() if p.is_dir()):
            animation(folder, keep_shadow)


if __name__ == '__main__':
    main()
