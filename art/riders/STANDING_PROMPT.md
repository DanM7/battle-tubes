# Standing select-screen sprites (2010 roster)

Use this when generating new full-body standing idle art for rider select.
Pipeline: generate JPG → save under `art/riders/player-<name>.jpg` →
`python tools/cutout.py art/riders/player-<name>.jpg public/assets/sprites/riders/player-<name>.png`
→ point `characters.js` `sprites.hard` (or `.easy`) at that PNG.

## Style anchor images (keep these)

| Role | Path |
|------|------|
| **Primary 2010 style lock** | `public/assets/sprites/riders/player-bnap.png` (also `art/riders/player-bnap.jpg`) |
| 1999 style contrast | `art/riders/player-dan.jpg` / `public/assets/sprites/riders/player-dan.png` |
| Face identity | that rider’s hold-frame head, e.g. `art/riders/heads/<id>.jpg` or `*-2010.jpg` |

Always pass the style lock + the rider’s hold-frame head as `reference_image_paths`.
Optionally pass their 1999 standing PNG and say **do not clone/scale it**.

## Base prompt (copy and fill the CAPS)

```
Pixel art full-body standing idle sprite matching the EXACT style of the B-Nap
standing reference (same life vest with three black buckled straps, same pixel
density, shading, outline weight, limb proportions, soft oval ground shadow).

Pose: three-quarter standing idle FACING THE VIEWER'S LEFT (body and gaze
angled left), arms relaxed at sides, barefoot, solid light gray background.
No tube, no handles, no dirt mound. Single centered character only.

Character NICKNAME — identity from the hold-frame head reference: HAIR, FACE,
GLASSES IF ANY. Determined serious expression. BODY_TYPE build
(skinny | normal athletic — not chubby unless asked).

Outfit: bright blue bulky life vest like B-Nap (three black straps with
buckles). TRUNKS_COLOR swim trunks with white drawstring. Barefoot.

Critical: do NOT reproduce or upscale any 1999 standing sprite; rebuild a
distinct 2010 standing look from the hold-frame face + this vest style.
Face LEFT.
```

### Fill-ins used for the current 2010 set

| Nickname | Body | Trunks | Face notes |
|----------|------|--------|------------|
| Chillo | skinny | yellow `#f5c228` | blond middle-part bob (`billy-2010`) |
| Franzi | normal | green `#389942` | short blond crop (`rob-2010`) |
| Burton | normal | purple `#8d559e` | dark buzz (`mike-2010`) |
| Moni | normal | light blue `#70b6d8` | black crop, thin black rect glasses, 5-o’clock shadow (`rj`) — boy |
| Barf | normal | orange `#f68427` | longer messy brown hair, stubble — not scaled Dan (`dan` hold) |
| B-Nap | normal | red `#bd2530` | blond buzz, thin black rect glasses (`adam`) |
| Ffej | normal | near-black `#312e35` | balding, gray mustache, thin round glasses (`ffej`) |
| Jay / Sanjo | normal | gray `#6b7280` | RJ/Moni body, pale skin, red buzz (`rj` / `moni` heads); taller than RJ |

## Facing

1999 and 2010 standings must face **viewer’s left**. After cutout, if the
sprite faces right, flip both the JPG and PNG:

```python
from PIL import Image
Image.open(path).transpose(Image.FLIP_LEFT_RIGHT).save(path)
```

## Spares

Older takes kept under `art/riders/spare/` (e.g. `player-bnap-no-glasses`,
`player-ffej-old`, `player-moni-clean`).
