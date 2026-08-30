#!/usr/bin/env python3
"""Report what a browser actually downloads for each built page.

Counts one image per <img> (the srcset candidate a 1x display picks), the font
faces the page can really use, plus HTML, CSS and JS. Text assets are measured
gzipped, which is how GitHub Pages serves them.
"""
import gzip
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / "assets/css/omarchy.css"
TEXT = {".html", ".css", ".js", ".svg", ".wasm"}

IMG_TAG = re.compile(r"<img\s[^>]*?>", re.S)
ATTR = re.compile(r'(\w[\w-]*)\s*=\s*"([^"]*)"')


def wire(path: Path) -> int:
    data = path.read_bytes()
    return len(gzip.compress(data, 6)) if path.suffix in TEXT else len(data)


def resolve(base: Path, url: str) -> Path | None:
    bare = url.split("?")[0]
    if bare.startswith(("http", "data:", "#", "mailto:")):
        return None
    p = (base / bare).resolve()
    return p if p.is_file() else None


def image_bytes(html: Path) -> tuple[int, int]:
    """(1x pick, highest-DPR pick) across every img on the page."""
    low = high = 0
    for tag in IMG_TAG.findall(html.read_text()):
        attrs = dict(ATTR.findall(tag))
        candidates = []
        if attrs.get("srcset"):
            for part in attrs["srcset"].split(","):
                bits = part.strip().split()
                if bits:
                    p = resolve(html.parent, bits[0])
                    if p:
                        candidates.append(p)
        if not candidates:
            p = resolve(html.parent, attrs.get("src", ""))
            if p:
                candidates = [p]
        if candidates:
            sizes = [wire(c) for c in candidates]
            low += min(sizes)
            high += max(sizes)
    return low, high


def font_bytes(html: Path) -> int:
    """Regular + Bold always; Medium where the page uses weight 500; Italic on demand."""
    text = html.read_text()
    faces = ["JetBrainsMono-Regular.woff2", "JetBrainsMono-Bold.woff2", "JetBrainsMono-Medium.woff2"]
    if "<em>" in text or "<i>" in text:
        faces.append("JetBrainsMono-Italic.woff2")
    return sum(wire(ROOT / "assets/fonts" / f) for f in faces if (ROOT / "assets/fonts" / f).is_file())


def js_bytes(html: Path) -> int:
    """Entry module, its static imports, plus what the page pulls in on demand."""
    entry = ROOT / "assets/js/omarchy.js"
    total = wire(entry)
    text = html.read_text()
    source = entry.read_text()

    # Anything statically imported is paid for on every page, on demand or not.
    static = set(re.findall(r'^\s*import\s[^;]*?from\s+[\'"]([^\'"]+)', source, re.M))
    for spec in static:
        dep = (entry.parent / spec.split("?")[0]).resolve()
        if dep.is_file():
            total += wire(dep)

    if "data-chroma" in text and not any("chroma" in s for s in static):
        total += wire(ROOT / "assets/js/modules/chroma.js")
    if "wte-home" in text:
        total += sum(
            wire(ROOT / p)
            for p in [
                *([] if any("logo" in s for s in static) else ["assets/js/modules/logo.js"]),
                "assets/js/wte/wte-canvas.js",
                "assets/js/wte/assets/playback-C457l4sF.js",
                "assets/js/wte/ttfx.js",
                "assets/js/wte/laseretch.wasm",
            ]
        )
    return total


def main() -> None:
    pages = sorted(
        p for p in ROOT.rglob("*.html")
        if not {"pages", "partials", "docs"} & set(p.parts)
    )
    css = wire(CSS)
    print(f"{'page':<44} {'html':>7} {'css':>6} {'js':>7} {'font':>7} {'img':>8} {'total':>9} {'@3x':>9}")
    print("-" * 102)
    grand = 0
    for page in pages:
        h, f, j = wire(page), font_bytes(page), js_bytes(page)
        low, high = image_bytes(page)
        total = h + css + j + f + low
        grand += total
        print(
            f"{str(page.relative_to(ROOT)):<44} {h/1024:6.1f}K {css/1024:5.1f}K {j/1024:6.1f}K "
            f"{f/1024:6.1f}K {low/1024:7.1f}K {total/1024:8.1f}K {(total-low+high)/1024:8.1f}K"
        )
    print("-" * 102)
    print(f"sum across pages (1x): {grand/1024:.1f}K")


if __name__ == "__main__":
    main()
