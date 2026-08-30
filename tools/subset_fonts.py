#!/usr/bin/env python3
"""Subset JetBrains Mono to the ranges the site can actually render.

Ships Latin plus the punctuation, arrows and block elements the ASCII mark and
copy rely on. Cyrillic, Greek and the rest of the stock coverage are dropped.
Run from the repo root; rewrites assets/fonts from the stock faces in
tools/fonts-src.
"""
import sys
from pathlib import Path

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
FONTS = ROOT / "assets" / "fonts"
SRC = Path(__file__).resolve().parent / "fonts-src"

KEEP = [
    "JetBrainsMono-Regular.woff2",
    "JetBrainsMono-Medium.woff2",
    "JetBrainsMono-Bold.woff2",
    "JetBrainsMono-Italic.woff2",
]

UNICODES = [
    (0x0000, 0x00FF),  # Basic Latin + Latin-1 Supplement
    (0x0100, 0x017F),  # Latin Extended-A (İ, ø-family accents)
    (0x2010, 0x205E),  # dashes, quotes, ellipsis, daggers
    (0x20A0, 0x20BF),  # currency
    (0x2122, 0x2122),  # trademark
    (0x2190, 0x21BB),  # arrows
    (0x2500, 0x259F),  # box drawing + block elements (the ASCII mark)
]

# JetBrains Mono's coding ligatures (calt/liga) roughly double the file and no
# rendered copy on the site triggers them; kerning is a no-op in a monospace
# face. Dropping GSUB/GPOS entirely is visually identical here.
LAYOUT_FEATURES: list[str] = []


def main() -> None:
    if not SRC.exists():
        sys.exit(f"missing stock faces in {SRC.relative_to(ROOT)}")

    codes = {c for lo, hi in UNICODES for c in range(lo, hi + 1)}
    before = after = 0

    for name in KEEP:
        src = SRC / name
        if not src.exists():
            sys.exit(f"missing original: {src}")
        font = TTFont(src)
        available = set(font.getBestCmap())
        opts = Options()
        opts.flavor = "woff2"
        opts.layout_features = LAYOUT_FEATURES
        opts.desubroutinize = True
        opts.drop_tables += ["DSIG"]
        opts.name_IDs = [1, 2, 3, 4, 6]
        sub = Subsetter(options=opts)
        sub.populate(unicodes=sorted(codes & available))
        sub.subset(font)
        out = FONTS / name
        font.flavor = "woff2"
        font.save(out)
        before += src.stat().st_size
        after += out.stat().st_size
        print(f"{name:<34} {src.stat().st_size/1024:6.1f}K -> {out.stat().st_size/1024:6.1f}K")

    for f in sorted(FONTS.glob("*.woff2")):
        if f.name not in KEEP:
            f.unlink()
            print(f"removed unused face {f.name}")

    print(f"fonts {before/1024:.1f}K -> {after/1024:.1f}K")


if __name__ == "__main__":
    main()
