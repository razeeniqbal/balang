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


def fit_circle(xs, ys):
    """Least-squares (Kasa) circle fit."""
    A = np.c_[2 * xs, 2 * ys, np.ones(len(xs))]
    b = xs**2 + ys**2
    cx, cy, c = np.linalg.lstsq(A, b, rcond=None)[0]
    return cx, cy, np.sqrt(c + cx**2 + cy**2)


def avatars(sheet, rows, cols, size):
    """Crop each avatar badge on its own ring.

    Hair and caps poke above the ring in the art, and the sheet's grid cuts
    through some of them, so the ring is fitted from its lower edge only and
    the badge is cut from the full sheet as a perfect circle at the ring.
    """
    im = Image.open(SRC / sheet).convert("RGBA")
    arr = np.array(im)
    solid = arr[:, :, 3] > 200
    cw, ch = im.width / cols, im.height / rows
    (OUT / "avatars").mkdir(parents=True, exist_ok=True)
    for i in range(rows * cols):
        r, c = divmod(i, cols)
        x0, y0 = round(c * cw), round(r * ch)
        cell = solid[y0 : round((r + 1) * ch), x0 : round((c + 1) * cw)]
        labels, n = ndimage.label(cell)
        sizes = ndimage.sum(cell, labels, range(1, n + 1))
        blob = ndimage.binary_fill_holes(labels == int(np.argmax(sizes)) + 1)
        edge = blob & ~ndimage.binary_erosion(blob)
        ys, xs = np.nonzero(edge)
        cy0 = ys.mean()
        for _ in range(3):  # refit on the half below the centre, where nothing overlaps the ring
            sel = ys > cy0
            cx, cy, rad = fit_circle(xs[sel].astype(float), ys[sel].astype(float))
            cy0 = cy
        cx += x0
        cy += y0
        rad -= 1
        box = (int(cx - rad), int(cy - rad), int(cx + rad) + 1, int(cy + rad) + 1)
        crop = np.array(im.crop(box)).astype(float)
        h, w = crop.shape[:2]
        yy, xx = np.mgrid[0:h, 0:w]
        d = np.hypot(xx + box[0] - cx, yy + box[1] - cy)
        crop[:, :, 3] *= np.clip(rad - d + 0.5, 0, 1)
        badge = Image.fromarray(crop.astype(np.uint8))
        square(badge, size).save(OUT / "avatars" / f"avatar-{i + 1:02d}.png", optimize=True)
    print(sheet, "->", rows * cols, "(ring-fitted)")


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
avatars("Balang Player Avatars.png", 3, 4, 192)

# Jar sheet: 6 jars side by side; the first is the empty canonical jar.
im = Image.open(SRC / "Balang The BALANG.png").convert("RGBA")
cell = im.crop((0, 0, round(im.width / 6), im.height))
(OUT / "jar").mkdir(parents=True, exist_ok=True)
jar = tight(cell)
jar.save(OUT / "jar" / "jar-empty.png", optimize=True)
print("jar", jar.size)
# Lid only (top of the empty jar) — used for the logo and on top of the SVG glass.
jar.crop((0, 0, jar.width, 140)).save(OUT / "jar" / "lid.png", optimize=True)
