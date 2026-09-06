"""
ComfyNap — image build
Reads originals from assets/src/** (Figma exports, Amazon gallery, video posters),
crops where needed, and writes responsive WebP + JPEG renditions to assets/img/.

Run from the project root:  python tools/build-images.py
Requires Pillow (pip install pillow).

Each entry: name -> (source path, crop box (left, top, right, bottom) or None)
Renditions: widths 1600 / 800 / 400 capped at the source width (near-duplicate
widths are skipped), files named <name>-<width>.webp and <name>-<width>.jpg.
manifest.json records the sizes so HTML srcset/width/height stay in sync.

Sources (see assets/README.md for provenance):
  Figma file gS0tP6PqwloAHbZ69HwSyI — listing images, brand story, A+ design
  Amazon B0FZLV4SHQ — gallery JPEGs (fallback) and video posters
"""
import json
import os
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIG = os.path.join(ROOT, "assets", "src", "figma")
POS = os.path.join(ROOT, "assets", "src", "posters")
OUT = os.path.join(ROOT, "assets", "img")

TARGET_WIDTHS = (1600, 800, 400)
WEBP_Q = 82
JPEG_Q = 82

# 3x3 "For Every Travel Moment" grid tiles (positions-grid.png, 1500x1500)
COLS = [(5, 495), (505, 995), (1005, 1495)]
ROWS = [(5, 395), (705, 1095), (1105, 1495)]


def tile(r, c):
    return (COLS[c][0], ROWS[r][0], COLS[c][1], ROWS[r][1])


ENTRIES = {
    # Hero gallery
    "hero-main":          (f"{FIG}/main-black-v6.png", None),                      # clean product shot, white bg
    "hero-worn":          (f"{FIG}/stay-cool.png", (330, 330, 1170, 1170)),        # traveler wearing, side rest
    "hero-foam":          (f"{FIG}/memory-foam-5x.png", (90, 400, 1500, 1230)),    # foam core detail + certs
    "hero-dims":          (f"{FIG}/dims-cnn.png", (5, 330, 1495, 1210)),           # 8.5" dimensions + pouch
    # Video posters (Amazon listing videos)
    "poster-meet":        (f"{POS}/meet-the-last-travel-pillow.jpg", None),
    "poster-how-to-use":  (f"{POS}/how-to-use.png", None),
    "poster-dr-palacios": (f"{POS}/dr-palacios.png", None),
    # Real UGC / influencer + expert videos found in Amazon's "Videos for this
    # product" carousel (not brand-produced) — see assets/README.md
    "poster-lori-vertical": (f"{POS}/lori-vertical-flights.jpg", None),   # 640x1137, genuinely vertical
    "poster-lori-9pos":     (f"{POS}/lori-9positions.jpg", None),          # 640x360
    "poster-palacios-jetlag": (f"{POS}/palacios-jetlag.jpg", None),        # 1500x844
    # Problem / solution
    "head-bobbing-95":    (f"{FIG}/head-bobbing-95.png", None),
    # Techniques banner
    "seats-strip":        (f"{FIG}/brand-story.png", (22, 440, 1100, 648)),
    # Nine positions (row-major from the grid). Also reused for technique cards + hero slide 3.
    "pos-1":              (f"{FIG}/positions-grid.png", tile(0, 0)),
    "pos-2":              (f"{FIG}/positions-grid.png", tile(0, 1)),
    "pos-3":              (f"{FIG}/positions-grid.png", tile(0, 2)),
    "pos-4":              (f"{FIG}/positions-grid.png", tile(1, 0)),
    "pos-5":              (f"{FIG}/positions-grid.png", tile(1, 1)),
    "pos-6":              (f"{FIG}/positions-grid.png", tile(1, 2)),
    "pos-7":              (f"{FIG}/positions-grid.png", tile(2, 0)),
    "pos-8":              (f"{FIG}/positions-grid.png", tile(2, 1)),
    "pos-9":              (f"{FIG}/positions-grid.png", tile(2, 2)),
    # Materials
    "mat-foam":           (f"{FIG}/memory-foam-5x.png", (380, 400, 1300, 1230)),
    "mat-breathable":     (f"{FIG}/stay-cool.png", (330, 360, 1170, 920)),
    "mat-moisture":       (f"{FIG}/aplus-desktop-design.png", (735, 2515, 1055, 2750)),
    "mat-travel":         (f"{FIG}/video-thumb-16x9.png", (1085, 548, 1530, 1050)),
    # Comparison header thumbs (clean pillow renders, no baked text)
    "cmp-comfynap":       (f"{FIG}/aplus-desktop-design.png", (450, 3680, 720, 4030)),
    "cmp-ordinary":       (f"{FIG}/aplus-desktop-design.png", (1150, 3730, 1420, 4030)),
    # Lifestyle + final CTA background (CNN quote/logo cropped out of the top)
    "lifestyle-clouds":   (f"{FIG}/cnn-clouds-16x9.png", (0, 240, 1920, 950)),
}


def flatten(im):
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im, mask=im.split()[-1])
        return bg
    return im.convert("RGB")


def pick_widths(w):
    cands = sorted({min(t, w) for t in TARGET_WIDTHS}, reverse=True)
    widths = []
    for c in cands:
        if not widths or widths[-1] > c * 1.25:
            widths.append(c)
    return widths


def build():
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        os.remove(os.path.join(OUT, f))
    manifest = {}
    missing = []
    for name, (src, box) in ENTRIES.items():
        if not os.path.exists(src):
            missing.append((name, src))
            continue
        im = flatten(Image.open(src))
        if box:
            im = im.crop(box)
        w, h = im.size
        widths = pick_widths(w)
        manifest[name] = {"w": w, "h": h, "widths": widths}
        for tw in widths:
            th = round(h * tw / w)
            out = im if tw == w else im.resize((tw, th), Image.LANCZOS)
            out.save(os.path.join(OUT, f"{name}-{tw}.webp"), "WEBP", quality=WEBP_Q, method=6)
            out.save(os.path.join(OUT, f"{name}-{tw}.jpg"), "JPEG", quality=JPEG_Q, optimize=True, progressive=True)
        print(f"{name:20s} {w}x{h}  widths={widths}")
    with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    if missing:
        print("\nMISSING SOURCES:")
        for name, src in missing:
            print(f"  {name}: {src}")
        sys.exit(1)
    files = [f for f in os.listdir(OUT) if not f.endswith(".json")]
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in files)
    print(f"\n{len(manifest)} images, {len(files)} files, {total // 1024} KB total")


if __name__ == "__main__":
    build()
