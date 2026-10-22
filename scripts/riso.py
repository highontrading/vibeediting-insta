"""Risograph print treatment for archival photos: splits an image into ink layers as halftone dots.

Usage:  .venv/bin/python scripts/riso.py <in> <out-prefix> [--crop x0,y0,x1,y1] [--width 800] [--cell 9]
                                         [--inks blue,pink] [--circle] [--pixel 100] [--cutout]
  --crop    crop box as fractions of the source (0..1)
  --inks    comma list; first ink prints the full tonal range, the second prints a band around the midtones
  --circle  mask the print to a circle (for 1880s round snapshots)
  --cutout  keep the source alpha (use on a PNG from `npm run assets -- cutout`)
  --pixel   also write <out-prefix>-px.png: an N×N greyscale mosaic (for "10,000 pixels" moments)
Writes <out-prefix>-<ink>.png per ink (transparent PNG, ink-coloured dots) so a composition can stack
the layers with mix-blend-mode: multiply and offset them for misregistration.
Also: `riso.py fibre <out.png>` writes a tileable paper-fibre texture.
"""
import argparse
import math
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

INKS = {"blue": (0, 120, 191), "pink": (255, 72, 176), "yellow": (255, 232, 0), "ink": (31, 26, 23)}


def halftone(dark: np.ndarray, cell: float, angle_deg: float, alpha: np.ndarray | None, ss: int = 3) -> Image.Image:
    """dark: HxW in 0..1. Returns an 'L' mask of dots (supersampled then reduced)."""
    h, w = dark.shape
    big = Image.new("L", (w * ss, h * ss), 0)
    d = ImageDraw.Draw(big)
    a = math.radians(angle_deg)
    ca, sa = math.cos(a), math.sin(a)
    diag = int(math.hypot(w, h) / cell) + 2
    for i in range(-diag, diag):
        for j in range(-diag, diag):
            # grid point in rotated space -> image space
            u, v = (i + 0.5) * cell, (j + 0.5) * cell
            x = u * ca - v * sa + w / 2
            y = u * sa + v * ca + h / 2
            if x < -cell or y < -cell or x > w + cell or y > h + cell:
                continue
            xi, yi = int(min(w - 1, max(0, x))), int(min(h - 1, max(0, y)))
            t = dark[yi, xi]
            if alpha is not None:
                t *= alpha[yi, xi]
            if t < 0.03:
                continue
            r = cell * 0.5 * math.sqrt(t) * 1.12  # max dot just touches its neighbours: paper always shows
            d.ellipse([(x - r) * ss, (y - r) * ss, (x + r) * ss, (y + r) * ss], fill=255)
    return big.resize((w, h), Image.LANCZOS)


def fibre(out: str, size: int = 512):
    rng = np.random.default_rng(3)
    base = rng.normal(0, 1, (size, size))
    # low-frequency cloudiness, tileable via FFT filtering
    f = np.fft.fft2(base)
    ky, kx = np.meshgrid(np.fft.fftfreq(size), np.fft.fftfreq(size), indexing="ij")
    k = np.sqrt(kx**2 + ky**2) + 1e-3
    cloud = np.real(np.fft.ifft2(f / k**1.2))
    cloud = (cloud - cloud.min()) / (cloud.max() - cloud.min())
    grain = rng.normal(0, 1, (size, size))
    img = 0.94 + 0.05 * (cloud - 0.5) + 0.015 * grain
    im = Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8), "L")
    d = ImageDraw.Draw(im)
    for _ in range(900):  # short fibres, drawn with wrap-around so the tile stays seamless
        x, y = rng.uniform(0, size, 2)
        ang = rng.uniform(0, math.pi)
        ln = rng.uniform(6, 26)
        shade = int(rng.uniform(200, 236)) if rng.random() < 0.7 else int(rng.uniform(248, 255))
        for ox in (-size, 0, size):
            for oy in (-size, 0, size):
                d.line([(x + ox, y + oy), (x + ox + math.cos(ang) * ln, y + oy + math.sin(ang) * ln)], fill=shade, width=1)
    im = im.filter(ImageFilter.GaussianBlur(0.4))
    im.save(out)
    print("fibre →", out)
    # a mid-grey version for overlay blending, so the fibre also reads on dark paper
    a = np.asarray(im, dtype=np.float32)
    mid = np.clip(128 + (a - a.mean()) * 2.2, 0, 255).astype(np.uint8)
    grain_out = out.replace(".png", "-overlay.png")
    Image.fromarray(mid, "L").save(grain_out)
    print("overlay →", grain_out)


def main():
    if sys.argv[1] == "fibre":
        fibre(sys.argv[2])
        return
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--crop")
    ap.add_argument("--width", type=int, default=800)
    ap.add_argument("--cell", type=float, default=9)
    ap.add_argument("--inks", default="blue,pink")
    ap.add_argument("--circle", action="store_true")
    ap.add_argument("--cutout", action="store_true")
    ap.add_argument("--pixel", type=int)
    ap.add_argument("--contrast", type=float, default=1.15)
    ap.add_argument("--gamma", type=float, default=1.0, help=">1 lightens the print")
    ap.add_argument("--shadow", type=float, default=0.55, help="darkness where the second ink peaks")
    a = ap.parse_args()

    im = Image.open(a.src)
    im = im.convert("RGBA") if a.cutout else im.convert("RGB")
    if a.cutout:  # trim to the object
        bbox = im.split()[-1].point(lambda v: 255 if v > 40 else 0).getbbox()
        pad = 8
        im = im.crop((max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(im.width, bbox[2] + pad), min(im.height, bbox[3] + pad)))
    if a.crop:
        x0, y0, x1, y1 = [float(v) for v in a.crop.split(",")]
        W, H = im.size
        im = im.crop((int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H)))
    h = round(im.height * a.width / im.width)
    im = im.resize((a.width, h), Image.LANCZOS)
    alpha = np.asarray(im.split()[-1], dtype=np.float32) / 255 if a.cutout else None
    g = ImageOps.autocontrast(im.convert("L"), cutoff=1)
    dark = 1 - np.asarray(g, dtype=np.float32) / 255
    dark = np.clip((dark - 0.5) * a.contrast + 0.5, 0, 1) ** a.gamma
    if a.circle:
        yy, xx = np.mgrid[0:h, 0:a.width]
        r = min(a.width, h) / 2
        m = (np.hypot(xx - a.width / 2, yy - h / 2) <= r - 2).astype(np.float32)
        alpha = m if alpha is None else alpha * m

    inks = a.inks.split(",")
    for n, ink in enumerate(inks):
        # second ink: a soft band around the midtones (skin, sky), so shadows stay one clean ink
        layer = dark * 0.84 if n == 0 else np.clip(1 - np.abs(dark - a.shadow) / 0.24, 0, 1) * 0.62
        mask = halftone(layer, a.cell * (1 if n == 0 else 1.15), 15 if n == 0 else 75, alpha)
        rgba = Image.new("RGBA", mask.size, INKS[ink] + (0,))
        rgba.putalpha(mask)
        rgba.save(f"{a.out}-{ink}.png", optimize=True)
        print(f"{a.out}-{ink}.png  {mask.size}")
    if a.pixel:
        px = g.resize((a.pixel, round(a.pixel * h / a.width)), Image.BOX)
        px.save(f"{a.out}-px.png")
        print(f"{a.out}-px.png")


if __name__ == "__main__":
    main()
