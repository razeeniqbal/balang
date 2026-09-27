"""Slice transparent concept sheets into individual game sprites.

Run from the project root:  python tools/slice_assets.py
Writes to public/assets/{food,chips,avatars,jar}/.
The sheets are regular grids, so each cell is cut and then tight-cropped on alpha.
"""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "Balang Asset"
OUT = ROOT / "public" / "assets"

FOODS = ["onde-onde", "kuih-bahulu", "kuih-lapis", "muruku", "dodol",
         "curry-puff", "kuih-ketayap", "apam-balik", "keropok-lekor", "tart-nenas"]


def tight(cell, alpha_min=60, pad=4):
    a = np.array(cell)[:, :, 3] > alpha_min
    ys, xs = np.nonzero(a)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    return cell.crop((max(0, x0 - pad), max(0, y0 - pad), min(cell.width, x1 + pad), min(cell.height, y1 + pad)))


def largest(cell, alpha_min=60, pad=2):
    """Crop to the biggest opaque blob — drops slivers of neighbouring cells."""
    a = np.array(cell)[:, :, 3] > alpha_min
    labels, n = ndimage.label(a)
    sizes = ndimage.sum(a, labels, range(1, n + 1))
    keep = labels == (int(np.argmax(sizes)) + 1)
    arr = np.array(cell)
    arr[:, :, 3] = np.where(ndimage.binary_dilation(keep, iterations=2), arr[:, :, 3], 0)
    return tight(Image.fromarray(arr), alpha_min, pad)


def main_parts(cell, alpha_min=60, keep_ratio=0.08):
    """Keep every blob at least keep_ratio of the biggest one.

    Drops slivers bleeding in from neighbouring cells while keeping
    multi-piece items together (e.g. keropok lekor's loose slices).
    """
    arr = np.array(cell)
    a = arr[:, :, 3] > alpha_min
    labels, n = ndimage.label(ndimage.binary_dilation(a, iterations=3))
    sizes = ndimage.sum(a, labels, range(1, n + 1))
    keep = np.isin(labels, [i + 1 for i, sz in enumerate(sizes) if sz >= sizes.max() * keep_ratio])
    arr[:, :, 3] = np.where(keep, arr[:, :, 3], 0)
    return tight(Image.fromarray(arr), alpha_min)


def circle(img):
    """Hard circular mask with a 1px feather: clean avatar edges at any size."""
    s = max(img.size)
    yy, xx = np.mgrid[0:s, 0:s]
    r = s / 2 - 1.5
    d = np.sqrt((xx - s / 2 + 0.5) ** 2 + (yy - s / 2 + 0.5) ** 2)
    mask = np.clip(r - d + 1, 0, 1)
    sq = square(img, s)
    arr = np.array(sq).astype(float)
    arr[:, :, 3] *= mask
    return Image.fromarray(arr.astype(np.uint8))


def square(img, size):
    s = max(img.size)
    canvas = Image.new("RGBA", (s, s))
    canvas.paste(img, ((s - img.width) // 2, (s - img.height) // 2))
    return canvas.resize((size, size), Image.LANCZOS)


def grid(sheet, rows, cols, names, folder, size, crop=tight, post=None):
    im = Image.open(SRC / sheet).convert("RGBA")
    cw, ch = im.width / cols, im.height / rows
    (OUT / folder).mkdir(parents=True, exist_ok=True)
    for i, name in enumerate(names):
        r, c = divmod(i, cols)
        cell = im.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch)))
        out = crop(cell)
        if post:
            out = post(out)
        square(out, size).save(OUT / folder / f"{name}.png", optimize=True)
    print(sheet, "->", len(names))


grid("Balang Core Malaysian Food Tokens.png", 2, 5, FOODS, "food", 256, crop=main_parts)
grid("Balang Gameplay Token Set.png", 2, 5, FOODS, "chips", 160, crop=main_parts)
grid("Balang Player Avatars.png", 3, 4, [f"avatar-{i+1:02d}" for i in range(12)], "avatars", 192, crop=largest, post=circle)

# Jar sheet: 6 jars side by side; the first is the empty canonical jar.
im = Image.open(SRC / "Balang The BALANG.png").convert("RGBA")
cell = im.crop((0, 0, round(im.width / 6), im.height))
(OUT / "jar").mkdir(parents=True, exist_ok=True)
jar = tight(cell)
jar.save(OUT / "jar" / "jar-empty.png", optimize=True)
print("jar", jar.size)
# Lid only (top of the empty jar) — used for the logo and on top of the SVG glass.
jar.crop((0, 0, jar.width, 140)).save(OUT / "jar" / "lid.png", optimize=True)
