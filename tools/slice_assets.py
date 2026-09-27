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


def square(img, size):
    s = max(img.size)
    canvas = Image.new("RGBA", (s, s))
    canvas.paste(img, ((s - img.width) // 2, (s - img.height) // 2))
    return canvas.resize((size, size), Image.LANCZOS)


def grid(sheet, rows, cols, names, folder, size, crop=tight):
    im = Image.open(SRC / sheet).convert("RGBA")
    cw, ch = im.width / cols, im.height / rows
    (OUT / folder).mkdir(parents=True, exist_ok=True)
    for i, name in enumerate(names):
        r, c = divmod(i, cols)
        cell = im.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch)))
        square(crop(cell), size).save(OUT / folder / f"{name}.png", optimize=True)
    print(sheet, "->", len(names))


grid("Balang Core Malaysian Food Tokens.png", 2, 5, FOODS, "food", 256)
grid("Balang Gameplay Token Set.png", 2, 5, FOODS, "chips", 160)
grid("Balang Player Avatars.png", 3, 4, [f"avatar-{i+1:02d}" for i in range(12)], "avatars", 192, crop=largest)

# Jar sheet: 6 jars side by side; the first is the empty canonical jar.
im = Image.open(SRC / "Balang The BALANG.png").convert("RGBA")
cell = im.crop((0, 0, round(im.width / 6), im.height))
(OUT / "jar").mkdir(parents=True, exist_ok=True)
jar = tight(cell)
jar.save(OUT / "jar" / "jar-empty.png", optimize=True)
print("jar", jar.size)
# Lid only (top of the empty jar) — used for the logo and on top of the SVG glass.
jar.crop((0, 0, jar.width, 140)).save(OUT / "jar" / "lid.png", optimize=True)
