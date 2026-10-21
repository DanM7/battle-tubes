"""One-shot: rebuild player-jay.png from player-rj.png — pale skin, red hair, bit taller."""
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RJ = ROOT / 'public/assets/sprites/riders/player-rj.png'
OUT_PNG = ROOT / 'public/assets/sprites/riders/player-jay.png'
OUT_JPG = ROOT / 'art/riders/player-jay.jpg'
SPARE = ROOT / 'art/riders/spare'


def luma(c):
    return 0.299 * c[..., 0] + 0.587 * c[..., 1] + 0.114 * c[..., 2]


def main():
    src = Image.open(RJ).convert('RGBA')
    a = np.array(src, dtype=np.float32)
    h, w = a.shape[:2]
    opaque = a[:, :, 3] > 128
    rgb = a[:, :, :3]
    R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = np.maximum(np.maximum(R, G), B)
    mn = np.minimum(np.minimum(R, G), B)
    sat = np.zeros_like(mx)
    sat[opaque] = (mx[opaque] - mn[opaque]) / np.maximum(mx[opaque], 1)
    L = luma(rgb)

    vest = opaque & (B > R + 15) & (B > G + 5) & (B > 80)

    near_black = opaque & (mx < 70)
    edge = np.zeros_like(opaque)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        edge |= opaque & ~np.roll(np.roll(opaque, dy, 0), dx, 1)
    outline = near_black & edge

    ys, xs = np.where(opaque)
    y_min, y_max = int(ys.min()), int(ys.max())
    x_min, x_max = int(xs.min()), int(xs.max())
    char_h = y_max - y_min + 1
    char_w = x_max - x_min + 1

    yy = np.arange(h)[:, None]
    xx = np.arange(w)[None, :]

    # Face-protect rectangle (eyes / cheeks / glasses). Hair may cover crown above it
    # and the sides/back of the head around it. RJ faces left → back of head is +X.
    face_l = x_min + int(char_w * 0.22)
    face_r = x_min + int(char_w * 0.62)
    glasses_y0 = y_min + int(char_h * 0.095)
    glasses_y1 = y_min + int(char_h * 0.195)
    hair_bottom = y_min + int(char_h * 0.26)
    face_box = (
        (xx >= face_l) & (xx <= face_r)
        & (yy >= glasses_y0) & (yy <= y_min + int(char_h * 0.28))
    )

    # Hair candidates: dark / desaturated in the head band, not vest, not face interior
    hair_cand = (
        opaque & ~vest
        & (yy <= hair_bottom)
        & (L < 160)
        & ((sat < 0.48) | (mx < 85))
        & (mx < 210)
        & ~face_box
    )
    # Warm skin (ears, forehead highlights) out
    hair_cand &= ~((R > 140) & (R > G + 10) & (R > B + 15) & (L > 115))
    # Crown above glasses is always fair game (full width), even over face_l–face_r
    crown = opaque & ~vest & (yy < glasses_y0) & (L < 160) & ((sat < 0.48) | (mx < 85))
    crown &= ~((R > 140) & (R > G + 10) & (R > B + 15) & (L > 115))
    hair_cand |= crown

    hair = np.zeros((h, w), dtype=bool)
    seeds = []
    for x in range(x_min, x_max + 1):
        for y in range(y_min, min(y_min + 18, hair_bottom + 1)):
            if hair_cand[y, x]:
                seeds.append((x, y))
                break

    seen = np.zeros((h, w), dtype=bool)
    q = deque()
    for x, y in seeds:
        seen[y, x] = True
        hair[y, x] = True
        q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, 1), (1, -1), (-1, -1)):
            nx, ny = x + dx, y + dy
            if nx < 0 or ny < 0 or nx >= w or ny >= h or seen[ny, nx]:
                continue
            if not hair_cand[ny, nx]:
                continue
            seen[ny, nx] = True
            hair[ny, nx] = True
            q.append((nx, ny))

    for _ in range(10):
        expanded = hair.copy()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            expanded |= np.roll(np.roll(hair, dy, 0), dx, 1)
        add = hair_cand & expanded & ~hair
        if not add.any():
            break
        hair |= add

    # Stragglers: near-black next to hair in the head band (missed side/rear buzz)
    for _ in range(4):
        expanded = hair.copy()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            expanded |= np.roll(np.roll(hair, dy, 0), dx, 1)
        stray = (
            opaque & ~vest & ~face_box & ~hair & expanded
            & (yy <= hair_bottom) & near_black
        )
        if not stray.any():
            break
        hair |= stray

    # Glasses / face ink: near-black inside face box — leave alone
    glasses = face_box & near_black & ~hair
    for dy in range(-1, 2):
        for dx in range(-1, 2):
            glasses |= np.roll(np.roll(glasses, dy, 0), dx, 1) & near_black & face_box & ~hair

    # Head silhouette outline in the hair band → dark red edge (not a black mass)
    head_outline = outline & (yy <= hair_bottom) & ~face_box
    hair |= head_outline
    # Body silhouette outline below / outside hair
    outline_body = outline & ~hair
    ink_keep = glasses | outline_body

    soft_skin = (
        opaque & ~vest & ~hair & ~ink_keep
        & (R > 95) & (R >= G - 8) & (G > B - 15)
        & (L > 85) & (L < 235)
        & ~((B > R + 10) & (B > 100))
    )
    warm = opaque & ~vest & ~hair & ~ink_keep & (R > G) & (R > B) & (R > 90) & (sat > 0.10)
    trunks_y0 = y_min + int(char_h * 0.55)
    trunks_zone = np.zeros_like(opaque)
    trunks_zone[trunks_y0:, :] = True
    cyan_trunks = opaque & trunks_zone & (B > R + 20) & (B > 100) & ~vest
    grayish = opaque & trunks_zone & (sat < 0.25) & (L > 60) & (L < 180) & ~vest
    skin = (warm | soft_skin) & ~grayish & ~cyan_trunks

    print('hair', hair.sum(), 'skin', skin.sum(), 'glasses', glasses.sum(), 'outline_body', outline_body.sum())

    out = a.copy()

    if skin.any():
        skin_L = luma(rgb[skin])
        p10, p90 = np.percentile(skin_L, 10), np.percentile(skin_L, 90)
        pale = np.array([
            [175, 125, 108],
            [205, 160, 135],
            [232, 188, 158],
            [246, 214, 188],
        ], dtype=np.float32)
        t = np.clip((skin_L - p10) / max(1e-3, (p90 - p10)), 0, 1)
        idx = t * (len(pale) - 1)
        i0 = np.floor(idx).astype(int)
        i1 = np.minimum(i0 + 1, len(pale) - 1)
        f = (idx - i0)[..., None]
        out[:, :, :3][skin] = pale[i0] * (1 - f) + pale[i1] * f

    if hair.any():
        hair_L = luma(rgb[hair])
        p10, p90 = np.percentile(hair_L, 5), np.percentile(hair_L, 95)
        reds = np.array([
            [78, 30, 22],   # silhouette edge (readable red, not black)
            [115, 40, 26],
            [176, 60, 34],
            [200, 85, 52],
            [225, 130, 95],
        ], dtype=np.float32)
        t = np.clip((hair_L - p10) / max(1e-3, (p90 - p10)), 0, 1)
        t = np.power(t, 0.85)
        idx = t * (len(reds) - 1)
        i0 = np.floor(idx).astype(int)
        i1 = np.minimum(i0 + 1, len(reds) - 1)
        f = (idx - i0)[..., None]
        out[:, :, :3][hair] = reds[i0] * (1 - f) + reds[i1] * f

    # Mild soften of under-chin interior only
    jaw_y0 = y_min + int(char_h * 0.18)
    jaw_y1 = y_min + int(char_h * 0.28)
    jaw_shadow = (
        opaque & ~outline_body & ~glasses & ~hair & ~vest
        & (yy >= jaw_y0) & (yy <= jaw_y1)
        & (xx >= face_l) & (xx <= face_r)
        & (L < 75) & (mx < 95)
    )
    if jaw_shadow.any():
        soft = np.array([150.0, 112.0, 102.0])
        cur = out[:, :, :3][jaw_shadow]
        out[:, :, :3][jaw_shadow] = cur * 0.6 + soft * 0.4
        print('softened jaw', jaw_shadow.sum())

    img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA')
    scaled = img.resize((img.width, int(round(img.height * 1.08))), Image.NEAREST)
    arr = np.array(scaled)
    mask = arr[:, :, 3] > 128
    ys, xs = np.where(mask)
    crop = arr[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    pad = 2
    H, W = crop.shape[:2]
    canvas = np.zeros((H + pad * 2, W + pad * 2, 4), dtype=np.uint8)
    canvas[pad:pad + H, pad:pad + W] = crop
    out_img = Image.fromarray(canvas, 'RGBA')
    print('out size', out_img.size)

    out_img.save(OUT_PNG)
    bg = Image.new('RGB', out_img.size, (180, 180, 180))
    bg.paste(out_img, mask=out_img.split()[-1])
    bg.save(OUT_JPG, quality=92)

    SPARE.mkdir(parents=True, exist_ok=True)
    a2 = np.array(out_img)

    def hg(arr):
        m = arr[:, :, 3] > 128
        ys, xs = np.where(m)
        hd = arr[ys.min():ys.min() + int((ys.max() - ys.min()) * 0.38), xs.min():xs.max()]
        g = np.full((hd.shape[0], hd.shape[1], 3), 160, np.uint8)
        al = hd[:, :, 3:4] / 255.0
        return (hd[:, :, :3] * al + g * (1 - al)).astype(np.uint8)

    Image.fromarray(hg(a2)).save(SPARE / '_qa-jay-new-head.png')
    rj = np.array(Image.open(RJ).convert('RGBA'))
    h1, h2 = hg(rj), hg(a2)
    Hm = max(h1.shape[0], h2.shape[0])
    canvas = np.full((Hm, h1.shape[1] + 8 + h2.shape[1], 3), 160, np.uint8)
    canvas[:h1.shape[0], :h1.shape[1]] = h1
    canvas[:h2.shape[0], h1.shape[1] + 8:] = h2
    Image.fromarray(canvas).save(SPARE / '_qa-rj-vs-jay.png')

    dbg = np.zeros((h, w, 4), dtype=np.uint8)
    dbg[hair] = (220, 60, 40, 255)
    dbg[skin] = (255, 200, 160, 255)
    dbg[glasses] = (40, 40, 255, 255)
    dbg[face_box & opaque] = (0, 255, 0, 120)
    Image.fromarray(dbg).save(SPARE / '_qa-jay-masks.png')

    bg2 = Image.new('RGB', out_img.size, (160, 160, 160))
    bg2.paste(out_img, mask=out_img.split()[-1])
    bg2.save(SPARE / '_qa-jay-full-gray.png')
    print('saved', OUT_PNG)


if __name__ == '__main__':
    main()
