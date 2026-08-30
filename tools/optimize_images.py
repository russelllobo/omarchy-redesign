#!/usr/bin/env python3
"""Downscale and re-encode site imagery to the sizes the layout actually paints.

The wall and the theme grid were shipping 3000px originals into ~260px slots.
Each source becomes a ladder of WebP widths so srcset can hand a 1x desktop a
file at its exact slot size and spend the big one only on high-DPR phones.

The rungs come from the measured slots (see the `sizes` strings in
pages/themes and pages/workstations): ~260-320 CSS px on desktop, ~340 in the
two-column range, and up to ~480 on a phone in a single column.

Re-run after adding art. Originals live in git history, not a stash dir, so
restore with `git checkout -- assets/img` before regenerating.
"""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IMG = ROOT / "assets" / "img"
QUALITY = 80
METHOD = 6

# folder -> (base width, [extra widths]). The base width keeps the plain
# filename so markup without srcset still resolves.
# Rungs sit ~1.35x above the declared slot. Measured against the originals at
# render size, that extra resolution buys far more fidelity per byte than
# raising the encoder quality does (roughly +2dB for +40% vs +0.6dB for +70%).
LADDERS = {
    "workstations": (350, [700, 1100]),
    "themes": (360, [720, 1000]),
    "video": (720, [1280]),
    # Avatars render into a 176px box (.person img max-width). 240 is the
    # stock source, so it stays the top rung rather than upscaling to 352.
    "team": (176, [240]),
    "patrons": (176, [240]),
    "air": (176, [240]),
    "credits": (176, [240]),
}


def encode(im: Image.Image, dest: Path, width: int) -> int:
    out = im if im.width == width else im.resize(
        (width, round(im.height * width / im.width)), Image.LANCZOS
    )
    out.save(dest, "WEBP", quality=QUALITY, method=METHOD)
    return dest.stat().st_size


def main() -> None:
    if not IMG.exists():
        sys.exit("no assets/img")

    stale = [p for f in LADDERS for p in (IMG / f).glob("*@*.webp")]
    if stale:
        sys.exit(
            "generated variants are already present, so the sources here are "
            "already downscaled.\nRun `git checkout -- assets/img && find "
            "assets/img -name '*@*.webp' -delete` first."
        )

    before = after = 0
    for folder, (base, extras) in LADDERS.items():
        d = IMG / folder
        if not d.is_dir():
            continue
        for src in sorted(d.iterdir()):
            if src.suffix.lower() not in {".webp", ".jpg", ".jpeg", ".png"}:
                continue
            im = Image.open(src).convert("RGB")
            start = src.stat().st_size
            before += start
            if src.suffix.lower() != ".webp":
                src.unlink()

            # Never upscale: a rung wider than the source collapses onto it.
            widths = sorted({min(w, im.width) for w in [base, *extras]})
            parts = []
            for width in widths:
                dest = d / (f"{src.stem}.webp" if width == widths[0] else f"{src.stem}@{width}.webp")
                size = encode(im, dest, width)
                after += size
                parts.append(f"{width}w {size/1024:.0f}K")

            print(f"{folder}/{src.name:<32} {start/1024:7.1f}K -> {'  '.join(parts)}")

    print(f"\ntotal {before/1024:.0f}K -> {after/1024:.0f}K")


if __name__ == "__main__":
    main()
