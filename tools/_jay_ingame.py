"""Build Jay/Sanjo in-game attack strips from RJ/Moni: palettize the buzz so looks.hair recolors it."""
from collections import deque
from pathlib import Path
import json
import shutil

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ANIM = ROOT / 'public/assets/sprites/riders/anim'
HEADS = ROOT / 'art/riders/heads'
SPARE = ROOT / 'art/riders/spare'

# Dan's hair shades from tools/cutout.py — riderTexture swaps these for looks.hair.
HAIR_SHADES = np.array([(97, 53, 52), (117, 67, 59), (159, 92, 60), (189, 118, 78)], dtype=np.float32)
HAIR_LUMA = 0.299 * HAIR_SHADES[:, 0] + 0.587 * HAIR_SHADES[:, 1] + 0.114 * HAIR_SHADES[:, 2]
# Idle / looks red, for head JPGs (cutout leaves drawn hair as-is).
RED_SHADES = np.array([(78, 30, 22), (115, 40, 26), (176, 60, 34), (200, 85, 52), (225, 130, 95)], dtype=np.float32)
RED_LUMA = 0.299 * RED_SHADES[:, 0] + 0.587 * RED_SHADES[:, 1] + 0.114 * RED_SHADES[:, 2]


def luma(c):
    return 0.299 * c[..., 0] + 0.587 * c[..., 1] + 0.114 * c[..., 2]


def hair_mask(rgba, glasses_max=55, head_share=None):
    """Buzz cap: flood dark/cool pixels from the crown. Leaves glasses, face, vest."""
    h, w = rgba.shape[:2]
    opaque = rgba[:, :, 3] > 128
    rgb = rgba[:, :, :3].astype(np.float32)
    R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = np.maximum(np.maximum(R, G), B)
    mn = np.minimum(np.minimum(R, G), B)
    sat = np.zeros_like(mx)
    sat[opaque] = (mx[opaque] - mn[opaque]) / np.maximum(mx[opaque], 1)
    L = luma(rgb)
    blue = opaque & (B > R + 15) & (B > G + 5) & (B > 80)
    # Vest is the life jacket, seeded below the head — cool gray buzz is also bluish.
    vest = np.zeros((h, w), dtype=bool)
    ys, xs = np.where(opaque)
    if not len(ys):
        return vest
    y_min_v, y_max_v = int(ys.min()), int(ys.max())
    vest_top = y_min_v + int((y_max_v - y_min_v + 1) * 0.28)
    qv = deque()
    seen_v = np.zeros((h, w), dtype=bool)
    for y, x in zip(*np.where(blue & (np.arange(h)[:, None] > vest_top))):
        if not seen_v[y, x]:
            seen_v[y, x] = True
            vest[y, x] = True
            qv.append((x, y))
    while qv:
        x, y = qv.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and ny >= vest_top and blue[ny, nx] and not seen_v[ny, nx]:
                seen_v[ny, nx] = True
                vest[ny, nx] = True
                qv.append((nx, ny))
    skin = opaque & ~vest & (R > G + 8) & (R > B + 12) & (L > 95) & (sat > 0.12)

    ys, xs = np.where(opaque)
    if not len(ys):
        return np.zeros((h, w), bool)
    y_min, y_max = int(ys.min()), int(ys.max())
    x_min, x_max = int(xs.min()), int(xs.max())
    char_h = y_max - y_min + 1
    char_w = x_max - x_min + 1
    if head_share is not None:
        hair_bottom = y_min + int(char_h * head_share)
    else:
        hair_bottom = int(np.where(vest)[0].min()) if vest.any() else y_min + int(char_h * 0.30)
    # Frames face right: face/glasses on the +X side of the head.
    face_x = x_min + int(char_w * 0.55)
    glasses_y0 = y_min + int(char_h * 0.10)
    glasses_y1 = y_min + int(char_h * 0.22)
    yy = np.arange(h)[:, None]
    xx = np.arange(w)[None, :]
    glasses = opaque & (mx < glasses_max) & (xx >= face_x) & (yy >= glasses_y0) & (yy <= glasses_y1)

    cand = (
        opaque & ~vest & ~skin & ~glasses
        & (yy <= hair_bottom)
        & (L < 155)
        & ((sat < 0.38) | (B + 8 >= R) | (mx < 70))
    )
    hair = np.zeros((h, w), dtype=bool)
    seen = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(x_min, x_max + 1):
        for y in range(y_min, min(y_min + 16, hair_bottom + 1)):
            if cand[y, x]:
                seen[y, x] = True
                hair[y, x] = True
                q.append((x, y))
                break
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, 1), (1, -1), (-1, -1)):
            nx, ny = x + dx, y + dy
            if nx < 0 or ny < 0 or nx >= w or ny >= h or seen[ny, nx]:
                continue
            if not cand[ny, nx]:
                continue
            seen[ny, nx] = True
            hair[ny, nx] = True
            q.append((nx, ny))
    # Crown outline sitting on the hair cap (not glasses).
    edge = np.zeros_like(opaque)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        edge |= opaque & ~np.roll(np.roll(opaque, dy, 0), dx, 1)
    near_hair = hair.copy()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        near_hair |= np.roll(np.roll(hair, dy, 0), dx, 1)
    hair |= edge & near_hair & (mx < 80) & ~glasses & (yy <= hair_bottom)
    # Dark nape / back of buzz (left of the face), not glasses.
    back = xx < face_x
    for _ in range(8):
        expanded = hair.copy()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            expanded |= np.roll(np.roll(hair, dy, 0), dx, 1)
        stray = (
            opaque & ~vest & ~skin & ~glasses & ~hair & expanded & back
            & (yy <= hair_bottom) & (mx < 95)
        )
        if not stray.any():
            break
        hair |= stray
    return hair


def remap(rgba, mask, shades, shade_luma):
    if not mask.any():
        return
    lum = luma(rgba[mask][:, :3].astype(np.float32))
    p10, p90 = np.percentile(lum, 8), np.percentile(lum, 92)
    t = np.clip((lum - p10) / max(1e-3, p90 - p10), 0, 1)
    target = shade_luma.min() + t * (shade_luma.max() - shade_luma.min())
    idx = np.abs(target[:, None] - shade_luma[None]).argmin(axis=1)
    rgba[mask, :3] = shades[idx]


def recolor_strip(src_stem, dest_stem, shades, shade_luma):
    meta_src = ANIM / f'{src_stem}.json'
    png_src = ANIM / f'{src_stem}.png'
    meta = json.loads(meta_src.read_text(encoding='utf-8'))
    fw, fh, n = meta['frameWidth'], meta['frameHeight'], meta['frames']
    im = Image.open(png_src).convert('RGBA')
    a = np.array(im)
    SPARE.mkdir(parents=True, exist_ok=True)
    for i in range(n):
        frame = a[:, i * fw:(i + 1) * fw]
        mask = hair_mask(frame)
        remap(frame, mask, shades, shade_luma)
        a[:, i * fw:(i + 1) * fw] = frame
        print(f'  {dest_stem} frame {i + 1}: hair {mask.sum()}')
        if i in (0, 2, 4):
            ys, xs = np.where(frame[:, :, 3] > 128)
            head = frame[ys.min():ys.min() + int((ys.max() - ys.min()) * 0.42), xs.min():xs.max()]
            Image.fromarray(head).save(SPARE / f'_qa-{dest_stem}-f{i}.png')
    shutil.copyfile(meta_src, ANIM / f'{dest_stem}.json')
    Image.fromarray(a).save(ANIM / f'{dest_stem}.png')
    print('wrote', ANIM / f'{dest_stem}.png')


def recolor_head_jpg(src_name, dest_name):
    src = HEADS / src_name
    im = Image.open(src).convert('RGBA')
    a = np.array(im)
    # Treat near-bg as transparent so flood stays on the figure.
    rgb = a[:, :, :3].astype(np.float32)
    bg = np.median([rgb[0, 0], rgb[0, -1], rgb[-1, 0], rgb[-1, -1]], axis=0)
    dist = np.linalg.norm(rgb - bg, axis=2)
    a[:, :, 3] = np.where(dist < 28, 0, 255)
    mask = hair_mask(a, glasses_max=120, head_share=0.16)
    remap(a, mask, RED_SHADES, RED_LUMA)
    out = Image.fromarray(a[:, :, :3], 'RGB')
    dest = HEADS / dest_name
    out.save(dest, quality=92)
    print(f'{dest}: hair {mask.sum()}')


def main():
    # Bake red into the strip. Head-swap hair is not Dan's palette, so looks.hair
    # cannot recolor RJ/Moni; these copies are Jay/Sanjo's own frames.
    recolor_strip('rj-attack', 'jay-attack', RED_SHADES, RED_LUMA)
    recolor_strip('moni-attack', 'sanjo-attack', RED_SHADES, RED_LUMA)
    recolor_head_jpg('rj.jpg', 'jay.jpg')
    recolor_head_jpg('moni.jpg', 'sanjo.jpg')


if __name__ == '__main__':
    main()
