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
strap them to the tube. Each frame's skin, swim trunks and hair are redrawn in a few
fixed shades (the JSON's palette), evened out between frames, so the game can recolor
them for each player; finding them is tuned to Dan (orange trunks, brown hair).

Bodies: Dan's attacks (HEAD_BODY) are the normal build. Each folder art/riders/bodies/<build>/
holds the same frames, same file names, redrawn with a different build (skinny, chubby,
fat, huge) and Dan's head. They're scaled so the top of the head is CROWN_WIDTH wide, as
wide as on Dan's frames, so heads match whatever the build's vest is. Each becomes
anim/dan-<build>-attack.

Heads: each character in src/characters.js with `heads` gets anim/<head>-attack for each
of them: art/riders/heads/<head>.jpg is the first frame of their build (`body`) redrawn
with their head, and that head replaces Dan's in every frame of the build, sat on the
same neck: the same moves, with their face. Their skin and trunks are Dan's shades like
any frame, for the game to recolor; their hair stays as drawn.

Hair styles: each art/riders/hair/<style>.jpg is Dan's first frame (normal build) with only
his hair changed, still Dan's brown. That head goes on every build's frames the same way,
as dan-<style>-attack (normal) or dan-<style>-<build>-attack, and its hair is redrawn in
HAIR_SHADES like Dan's, so custom riders can have any style in any hair color.

The background is whatever color the corners are. Everything connected to the image
border that's close to that color, or a soft gray drop shadow on it, becomes
transparent; the character's own grays survive because they aren't connected to the
border. A patch of dirt or grass under them goes too, as do big pockets of background the
character encloses (between an arm and the body). JPEG noise leaves a speckle of light
gray just outside the character's dark outline, so a few passes then peel any grayish,
not-dark pixel off the edge.
"""

import json
import subprocess
import sys
from collections import deque
from functools import lru_cache
from pathlib import Path

import numpy as np
from numpy.lib.stride_tricks import sliding_window_view
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
GROUND_SPECK = 400    # loose bits below the vest smaller than this (dirt) go, before measuring...
FRAME_SPECK = 100     # ...and smaller than this once the frame is resized
HEAD_ROWS = 0.18      # the top this much of the character is taken to be their head
VEST_AREA = 9000      # animation frames are scaled so the life vest covers this many pixels
VEST_SPECK_SHARE = 0.05  # blue bits this share of the vest's biggest piece, above it, aren't vest
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
HAIR_SHADES = [(97, 53, 52), (117, 67, 59), (159, 92, 60), (189, 118, 78)]  # from his attacks
# Each frame's skin, trunks and hair are brightened or darkened to match Dan's at this
# percentile of brightness (highlights look alike in every pose; shadows don't)...
SHADE_MATCH_PERCENTILE = 85
SKIN_MATCH_LUMA = 192.4
TRUNKS_MATCH_LUMA = 156.5
HAIR_MATCH_LUMA = 111.3
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
LONG_HAIR_BELOW_VEST = 40  # long hair (girls) can hang this far below the vest's top...
LONG_HAIR_PIECE = 150  # ...and pieces of it this big count even if they don't reach the top;
LONG_HAIR_SPECK = 300  # its highlights can be bigger bits (streaks down a ponytail or bangs)...
LONG_HAIR_SPECK_HAIR = 0.5  # ...and count if at least this share of what's around them is hair

# Head swaps (see heads()): loose bits of hair this small, this close to the head, go with it...
HEAD_LOOSE = 60
HEAD_LOOSE_GAP = 4
NECK_ROWS = 6  # ...a head sits on the neck by the middle of its bottom this many rows...
HEAD_ROOM = 60  # ...and can stick out this far past the body's frame (bigger hair)
# Matching head sizes (see head_size()): the sizes tried, how far (half-size pixels) one
# head can sit off the other, and how much a pixel on only one of them counts against it.
HEAD_MATCH_SIZES = np.arange(0.85, 1.151, 0.01)
HEAD_MATCH_SHIFT = 12
HEAD_MATCH_MISS = 8
HEAD_BODY = 'dan-attack'  # the normal build's animation
# Other builds are scaled by the width of the head's top this share of the way down it
# (hair and skull: not cheeks or neck, which get fuller with the build)...
CROWN_SHARE = 0.45
CROWN_WIDTH = 117  # ...to this, Dan's on his frames

ROOT = Path(__file__).resolve().parent.parent
ART_DIR = ROOT / 'art' / 'riders'
ANIM_DIR = ART_DIR / 'anim'
BODY_DIR = ART_DIR / 'bodies'
HEAD_DIR = ART_DIR / 'heads'
HAIR_DIR = ART_DIR / 'hair'
GIRL_DIR = ART_DIR / 'girls'
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
    blue = (rgba[..., 3] > 0) & (b > 110) & (b > r + 50) & (b > g + 15)
    # A small blue bit wholly above the vest (a hair tie) isn't part of it.
    pieces = list(blobs(blue))
    if pieces:
        big = max(map(len, pieces)) * VEST_SPECK_SHARE
        top = min(min(y for y, _ in p) for p in pieces if len(p) >= big)
        for piece in pieces:
            ys, xs = np.array(piece).T
            if len(piece) < big and ys.max() < top:
                blue[ys, xs] = False
    return blue


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
    vest_middle = np.nonzero(vest)[0].mean()
    found = []
    for core in blobs(shifted_and(dark, HANDLE_THICK)):
        if len(core) < HANDLE_MIN_CORE:
            continue
        ys, xs = np.array(core).T
        top, bottom = ys.min() - HANDLE_THICK, ys.max() + HANDLE_THICK
        if bottom < vest_middle:  # black hair; handles are held low
            continue
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


def body_regions(rgba, long_hair=False):
    """Masks of a frame's skin and swim trunks (see SKIN_SHADES). `long_hair`: hair can
    hang lower and in pieces that don't reach the top (a ponytail past its tie)."""
    rgb = rgba[..., :3].astype(float)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    hi, lo = rgb.max(axis=2), rgb.min(axis=2)
    sat = (hi - lo) / np.maximum(hi, 1)
    warm = (rgba[..., 3] > 0) & (r >= g) & (g >= b - 10) & (sat > WARM_MIN_SATURATION) & (hi > WARM_MIN_VALUE)

    vest_top = np.nonzero(vest_mask(rgba).any(axis=1))[0].min()
    head = np.zeros(warm.shape, bool)
    head[:vest_top + (LONG_HAIR_BELOW_VEST if long_hair else HAIR_BELOW_VEST)] = True
    features = (np.stack([(g + 1) / (r + 1), (b + 1) / (r + 1), (r + 1) / 255], axis=-1) - HAIR_MEAN) / HAIR_SPREAD
    hairy = np.clip(features @ np.array(HAIR_WEIGHTS) + HAIR_BIAS, -50, 50) > 0
    top = np.nonzero(warm.any(axis=1))[0].min()
    hair = np.zeros(warm.shape, bool)
    for blob in blobs(warm & head & (hairy | (hi < HAIR_DARK))):
        ys, xs = np.array(blob).T
        if ys.min() <= top + HAIR_TOP_ROWS or (long_hair and len(blob) >= LONG_HAIR_PIECE):
            hair[ys, xs] = True
    # Highlights in the hair: small bits it (and outlines) surround.
    for blob in blobs(warm & head & ~hair):
        if len(blob) >= (LONG_HAIR_SPECK if long_hair else HAIR_SPECK):
            continue
        ys, xs = np.array(blob).T
        bit = np.zeros(warm.shape, bool)
        bit[ys, xs] = True
        ring = grown(bit, 2) & ~bit
        mostly_hair = long_hair and (ring & hair).sum() >= ring.sum() * LONG_HAIR_SPECK_HAIR
        if mostly_hair or (ring & warm & ~hair).sum() <= ring.sum() * HAIR_SPECK_SKIN:
            hair[ys, xs] = True

    pieces = sorted(blobs(warm & ~hair & (sat > TRUNKS_MIN_SATURATION) & (hi > TRUNKS_MIN_VALUE)), key=len, reverse=True)
    trunks = np.zeros(warm.shape, bool)
    for piece in pieces:
        if len(piece) >= len(pieces[0]) * TRUNKS_MIN_SHARE:
            ys, xs = np.array(piece).T
            trunks[ys, xs] = True
    return warm & ~hair & ~trunks, trunks, hair


def palettize(rgba, with_hair=True, long_hair=False):
    """Redraws a frame's skin, trunks and (if `with_hair`: Dan's brown, which finding hair
    is tuned to) hair in SKIN_SHADES, TRUNKS_SHADES and HAIR_SHADES, in place."""
    skin, trunks, hair = body_regions(rgba, long_hair)
    if not with_hair:
        hair = np.zeros_like(hair)
    keys = {tuple(c) for c in SKIN_SHADES + TRUNKS_SHADES + HAIR_SHADES}
    regions = ((skin, SKIN_SHADES, SKIN_MATCH_LUMA), (trunks, TRUNKS_SHADES, TRUNKS_MATCH_LUMA), (hair, HAIR_SHADES, HAIR_MATCH_LUMA))
    for mask, shades, match in regions:
        if not mask.any():
            continue
        lum = luma(rgba[mask][:, :3].astype(float))
        lum += match - np.percentile(lum, SHADE_MATCH_PERCENTILE)
        levels = luma(np.array(shades, float))
        rgba[mask, :3] = np.array(shades)[np.abs(lum[:, None] - levels[None]).argmin(axis=1)]
    # Anything else that happens to be one of those exact colors is nudged off it.
    others = (rgba[..., 3] > 0) & ~skin & ~trunks & ~hair
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


def vest_scale(rgba):
    return (VEST_AREA / vest_mask(rgba).sum()) ** 0.5


def crown_scale(rgba):
    head = head_mask(rgba)
    ys = np.nonzero(head.any(axis=1))[0]
    rows = head[ys[0]:ys[0] + int((ys[-1] - ys[0]) * CROWN_SHARE)]
    return CROWN_WIDTH / max(np.ptp(np.nonzero(row)[0]) for row in rows if row.any())


def frame(src, keep_shadow=False, scale=vest_scale, dans_hair=True, long_hair=False):
    """One animation frame from `src`, resized by `scale` (of the cut-out picture):
    (name, rgba, anchor x, anchor y). `dans_hair`: their hair is Dan's, to recolor."""
    rgba = cut(src, keep_shadow)
    if vest_mask(rgba).sum() == 0:
        sys.exit(f'{src}: no blue life vest found to line the frame up by')
    drop_ground_specks(rgba, GROUND_SPECK)
    rgba = scaled(rgba, scale(rgba))
    rgba[..., 3] = np.where(rgba[..., 3] >= 128, 255, 0)
    drop_ground_specks(rgba, FRAME_SPECK)
    palettize(rgba, dans_hair, long_hair)
    vest = vest_mask(rgba)
    anchor_x = int(round(np.nonzero(vest)[1].mean()))
    anchor_y = int(np.nonzero(rgba[..., 3])[0].max()) + 1
    return src.name, rgba, anchor_x, anchor_y


def drop_ground_specks(rgba, min_size):
    """Clears loose bits below the life vest smaller than `min_size` (dirt left from the
    ground under the rider), in place, so they don't count as the rider's lowest point."""
    vest_bottom = np.nonzero(vest_mask(rgba).any(axis=1))[0].max()
    for blob in blobs(rgba[..., 3] > 0):
        ys, xs = np.array(blob).T
        if len(blob) < min_size and ys.min() > vest_bottom:
            rgba[ys, xs, 3] = 0


def head_mask(rgba):
    """A frame's head: the opaque piece above the life vest that reaches the top, plus
    loose bits of hair next to it."""
    alpha = rgba[..., 3] > 0
    above = alpha.copy()
    above[np.nonzero(vest_mask(rgba).any(axis=1))[0].min():] = False
    top = np.nonzero(alpha.any(axis=1))[0].min()
    head = np.zeros(alpha.shape, bool)
    loose = []
    for blob in blobs(above):
        ys, xs = np.array(blob).T
        if ys.min() == top:
            head[ys, xs] = True
        elif len(blob) < HEAD_LOOSE:
            loose.append((ys, xs))
    near = grown(head, HEAD_LOOSE_GAP)
    for ys, xs in loose:
        if near[ys, xs].any():
            head[ys, xs] = True
    return head


def neck(head):
    """Where a head mask sits on the body: the middle of its bottom rows, and its bottom."""
    ys, xs = np.nonzero(head)
    bottom = ys.max()
    return xs[ys > bottom - NECK_ROWS].mean(), bottom


def with_head(body, src, scale, keep_shadow=False, dans_hair=False):
    """`body`'s frames (from frame()) with the head from `src` (the first of them redrawn
    with someone else's head, resized by `scale`) instead of their own, sat on the same neck.
    `dans_hair`: the new head's hair is Dan's brown, to recolor."""
    _, donor, *_ = frame(src, keep_shadow, scale, dans_hair)
    new_head = head_mask(donor)
    hx, hy = neck(new_head)
    ys, xs = np.nonzero(new_head)
    out = []
    for name, rgba, ax, ay in body:
        own = head_mask(rgba)
        nx, ny = neck(own)
        p = HEAD_ROOM
        canvas = np.zeros((rgba.shape[0] + 2 * p, rgba.shape[1] + 2 * p, 4), np.uint8)
        canvas[p:-p, p:-p] = rgba
        canvas[p:-p, p:-p][own] = 0
        ty = ys + int(round(ny - hy)) + p
        tx = xs + int(round(nx - hx)) + p
        free = canvas[ty, tx, 3] == 0
        canvas[ty[free], tx[free]] = donor[ys[free], xs[free]]
        oy, ox = np.nonzero(canvas[..., 3])
        top, left = oy.min(), ox.min()
        out.append((name, canvas[top:oy.max() + 1, left:ox.max() + 1], int(ax + p - left), int(ay + p - top)))
    return out


def animation(folder, keep_shadow=False):
    frames = [frame(src, keep_shadow) for src in sorted(folder.glob('*.jp*g')) + sorted(folder.glob('*.png'))]
    if frames:
        write_animation(folder.name, frames)
    return frames


def write_animation(name, frames, build=None):
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
    png = ANIM_OUT_DIR / f'{name}.png'
    Image.fromarray(strip, 'RGBA').save(png)
    meta = {
        'frameWidth': fw,
        'frameHeight': fh,
        'frames': len(frames),
        'anchor': {'x': left, 'y': up},
        'vestArea': VEST_AREA,
        'sources': [name for name, *_ in frames],
        'handles': held,
        'palette': {
            'skin': [hex_color(c) for c in SKIN_SHADES],
            'trunks': [hex_color(c) for c in TRUNKS_SHADES],
            'hair': [hex_color(c) for c in HAIR_SHADES],
        },
    }
    if build:
        meta['body'] = build
    (ANIM_OUT_DIR / f'{name}.json').write_text(json.dumps(meta, indent=2) + '\n')
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
    bodies(keep_shadow)
    heads(keep_shadow)
    hair_styles(keep_shadow)
    girls(keep_shadow)


@lru_cache
def body_frames(build, keep_shadow=False):
    """A build's frames (from frame()), and the scale for its first frame redrawn with
    another head: the same as the frame's own, by the life vest they share."""
    srcs = sorted((ANIM_DIR / HEAD_BODY if build == 'normal' else BODY_DIR / build).glob('*.jp*g'))
    scale = vest_scale if build == 'normal' else crown_scale
    frames = [frame(src, keep_shadow, scale) for src in srcs]
    hold = cut(srcs[0], keep_shadow)
    k, vest = scale(hold), vest_mask(hold).sum()
    return frames, lambda rgba: k * (vest / vest_mask(rgba).sum()) ** 0.5


def bodies(keep_shadow=False):
    """Every art/riders/bodies/<build>/ with Dan's head, as dan-<build>-attack."""
    for folder in sorted(p for p in BODY_DIR.iterdir() if p.is_dir()) if BODY_DIR.is_dir() else []:
        frames, _ = body_frames(folder.name, keep_shadow)
        write_animation(f'dan-{folder.name}-attack', frames, folder.name)


def characters():
    script = "import('./src/characters.js').then((m) => console.log(JSON.stringify(m.CHARACTERS)))"
    return json.loads(subprocess.run(['node', '-e', script], cwd=ROOT, capture_output=True, text=True, check=True).stdout)


def heads(keep_shadow=False):
    """Each character's heads on their build's frames, as <head>-attack."""
    for c in characters():
        build = c.get('body', 'normal')
        for name in sorted(set((c.get('heads') or {}).values())):
            src = HEAD_DIR / f'{name}.jpg'
            if not src.exists():
                print(f'{src}: missing ({c["id"]}\'s head)')
                continue
            frames, scale = body_frames(build, keep_shadow)
            write_animation(f'{name}-attack', with_head(frames, src, scale, keep_shadow), build)


def builds():
    return ['normal'] + (sorted(p.name for p in BODY_DIR.iterdir() if p.is_dir()) if BODY_DIR.is_dir() else [])


def hair_styles(keep_shadow=False):
    """Each hair style's head on every build, as dan-<style>-attack (normal) or
    dan-<style>-<build>-attack."""
    srcs = sorted(HAIR_DIR.glob('*.jp*g')) if HAIR_DIR.is_dir() else []
    _, scale = body_frames('normal', keep_shadow)
    for src in srcs:
        for build in builds():
            frames, _ = body_frames(build, keep_shadow)
            name = f'dan-{src.stem}' if build == 'normal' else f'dan-{src.stem}-{build}'
            write_animation(f'{name}-attack', with_head(frames, src, scale, keep_shadow, dans_hair=True), build)


def shoulder_height(rgba):
    """How far the top of the life vest is above the rider's lowest point."""
    rows = np.nonzero((rgba[..., 3] > 0).any(axis=1))[0]
    return rows.max() + 1 - np.nonzero(vest_mask(rgba).any(axis=1))[0].min()


def head_patch(rgba):
    """A frame's head (head_mask()) as half-size brightness, NaN off the head."""
    head = head_mask(rgba)
    ys, xs = np.nonzero(head)
    g = np.where(head, luma(rgba[..., :3].astype(float)), np.nan)[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = g.shape[0] // 2 * 2, g.shape[1] // 2 * 2
    return g[:h, :w].reshape(h // 2, 2, w // 2, 2).mean(axis=(1, 3))


def head_size(ref, rgba):
    """How big `rgba`'s head is next to `ref`'s: the size of ref's head (of HEAD_MATCH_SIZES)
    that, laid over rgba's anywhere, differs least in brightness and shape."""
    target = np.pad(np.nan_to_num(head_patch(rgba), nan=-1), HEAD_MATCH_SHIFT, constant_values=-1)
    on = target >= 0
    src = head_patch(ref)
    best = None
    for k in HEAD_MATCH_SIZES:
        size = (max(1, round(src.shape[1] * k)), max(1, round(src.shape[0] * k)))
        if size[0] > target.shape[1] or size[1] > target.shape[0]:
            continue
        r = np.array(Image.fromarray(np.nan_to_num(src).astype(np.float32), 'F').resize(size, Image.BILINEAR))
        m = np.array(Image.fromarray((~np.isnan(src)).astype(np.float32), 'F').resize(size, Image.BILINEAR)) > 0.5
        win, win_on = sliding_window_view(target, r.shape), sliding_window_view(on, r.shape)
        both = win_on & m
        diff = np.where(both, (win - r) ** 2, 0).sum(axis=(-1, -2)) / np.maximum(both.sum(axis=(-1, -2)), 1)
        score = (diff + (win_on ^ m).sum(axis=(-1, -2)) * HEAD_MATCH_MISS).min()
        if best is None or score < best[0]:
            best = (score, k)
    return best[1]


def girls(keep_shadow=False):
    """Each art/riders/girls/<style>/ (Dan's frames redrawn as a girl), as girl-<style>-attack.
    A girl is slimmer than Dan, so her first frame is scaled to put the top of her vest as
    high as on his, not by vest size: the same height. The drawings don't keep her one size
    from pose to pose (or kneel as low as his), so each of the others is then scaled to make
    her head as big as on the first."""
    dan, _ = body_frames('normal', keep_shadow)
    heights = [shoulder_height(rgba) for _, rgba, *_ in dan]
    for folder in sorted(p for p in GIRL_DIR.iterdir() if p.is_dir()) if GIRL_DIR.is_dir() else []:
        srcs = sorted(folder.glob('*.jp*g'))
        by_height = [lambda rgba, h=h: h / shoulder_height(rgba) for h in heights]
        frames = [frame(src, keep_shadow, scale, long_hair=True) for src, scale in zip(srcs, by_height)]
        hold = frames[0][1]
        for i in range(1, len(frames)):
            k = head_size(hold, frames[i][1])
            frames[i] = frame(srcs[i], keep_shadow, lambda rgba, s=by_height[i], k=k: s(rgba) / k, long_hair=True)
        write_animation(f'girl-{folder.name}-attack', frames, 'normal')


if __name__ == '__main__':
    main()
