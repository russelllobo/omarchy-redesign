#!/usr/bin/env python3
"""Omarchy site builder: partials + pages -> static HTML. No framework, no deps.

Beyond templating, the build does three things that keep pages light without
any change to the source markup:

  * every <img> gets intrinsic width/height (no layout shift) and decoding=async
  * an <img> whose file has "<stem>@<width>.webp" siblings gets a srcset, so a
    1x display fetches the small variant instead of the retina one
  * css/js URLs are stamped with a content hash, so they can be cached forever
    and never go stale
"""
import hashlib
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "tools"))
import imgsize

ROOT = Path(__file__).parent
PARTIALS = ROOT / "partials"
PAGES = ROOT / "pages"

IMG_TAG = re.compile(r"<img\s[^>]*?>", re.S)
ATTR = re.compile(r'(\w[\w-]*)\s*=\s*"([^"]*)"')
VARIANT = re.compile(r"^(?P<stem>.+)@(?P<width>\d+)$")

# Every page paints body copy (400), labels (500) and headings (700) above the
# fold, so all three are fetched regardless; preloading only starts them before
# the stylesheet has parsed. Italic is left out — only the themes page uses it.
PRELOAD_FONTS = [
    "JetBrainsMono-Regular.woff2",
    "JetBrainsMono-Medium.woff2",
    "JetBrainsMono-Bold.woff2",
]

_hashes: dict[Path, str] = {}


def stamp(path: Path) -> str:
    """Short content hash used as a cache-busting query string."""
    if path not in _hashes:
        _hashes[path] = hashlib.md5(path.read_bytes()).hexdigest()[:8]
    return _hashes[path]


def versioned(prefix: str, rel: str) -> str:
    path = ROOT / rel
    return f"{prefix}{rel}?v={stamp(path)}" if path.is_file() else f"{prefix}{rel}"


def stamp_assets(html: str, out_dir: Path) -> str:
    """Give every local asset URL one canonical content-hashed form.

    Hand-maintained ?v= strings drifted between partials, so the same file was
    fetched twice under two URLs. Fonts are skipped: they are referenced from
    the stylesheet, and a stamped preload would not match that request.
    """

    def one(url: str) -> str:
        bare = url.split("?")[0]
        if bare.startswith(("http", "data:", "#", "mailto:")) or "assets/fonts/" in bare:
            return url
        path = (out_dir / bare).resolve()
        if not path.is_file() or not path.is_relative_to(ROOT):
            return url
        return f"{bare}?v={stamp(path)}"

    def attr(match: re.Match[str]) -> str:
        name, value = match.group(1), match.group(2)
        if name == "srcset":
            parts = []
            for candidate in value.split(","):
                bits = candidate.strip().split()
                if bits:
                    bits[0] = one(bits[0])
                    parts.append(" ".join(bits))
            return f'{name}="{", ".join(parts)}"'
        return f'{name}="{one(value)}"'

    return re.sub(r'\b(src|href|srcset)="([^"]*)"', attr, html)


def srcset_for(path: Path) -> tuple[str, int] | None:
    """Build a srcset from `<stem>@<width>.webp` siblings, if any exist."""
    base = imgsize.size(path)
    if base is None:
        return None
    entries = [(base[0], path.name)]
    for sibling in path.parent.glob(f"{path.stem}@*{path.suffix}"):
        m = VARIANT.match(sibling.stem)
        if m and m.group("stem") == path.stem:
            entries.append((int(m.group("width")), sibling.name))
    if len(entries) == 1:
        return None
    entries.sort()
    return ", ".join(f"{name} {w}w" for w, name in entries), base[0]


def enhance_images(html: str, out_dir: Path) -> str:
    """Add intrinsic size, async decoding and srcset to every local <img>."""

    def fix(match: re.Match[str]) -> str:
        tag = match.group(0)
        attrs = dict(ATTR.findall(tag))
        src = attrs.get("src", "")
        if not src or src.startswith(("http", "data:")):
            return tag

        path = (out_dir / src.split("?")[0]).resolve()
        if not path.is_file():
            return tag

        add = []
        if "width" not in attrs and "height" not in attrs:
            dims = imgsize.size(path)
            if dims:
                add.append(f'width="{dims[0]}" height="{dims[1]}"')
        if "decoding" not in attrs:
            add.append('decoding="async"')
        if "srcset" not in attrs:
            built = srcset_for(path)
            if built:
                folder = src.rsplit("/", 1)[0]
                candidates = ", ".join(
                    f"{folder}/{part}" for part in built[0].split(", ")
                )
                add.append(f'srcset="{candidates}"')
                if "sizes" not in attrs:
                    add.append('sizes="100vw"')
        if not add:
            return tag
        return tag[:-1].rstrip() + " " + " ".join(add) + ">"

    return IMG_TAG.sub(fix, html)


def render(page: Path) -> None:
    raw = page.read_text()
    fm = {}
    body = raw
    m = re.match(r"^---\n(.*?)\n---\n", raw, re.S)
    if m:
        for line in m.group(1).splitlines():
            k, _, v = line.partition(":")
            fm[k.strip()] = v.strip()
        body = raw[m.end() :]

    rel = page.relative_to(PAGES)
    out = ROOT / rel
    depth = len(rel.parts) - 1
    prefix = "../" * depth

    head = (PARTIALS / "head.html").read_text()
    head = head.replace("{{TITLE}}", fm.get("title", "Omarchy"))
    head = head.replace("{{DESC}}", fm.get("desc", "Beautiful, Fun & Opinionated Linux by DHH"))
    head = head.replace("{{CSS}}", versioned(prefix, "assets/css/omarchy.css"))
    preloads = "\n".join(
        f'<link rel="preload" href="{prefix}assets/fonts/{f}" '
        f'as="font" type="font/woff2" crossorigin>'
        for f in PRELOAD_FONTS
    )
    head = head.replace("{{PRELOAD_FONTS}}", preloads)
    head = head.replace("{{PREFIX}}", prefix)
    home_boot = '<script>document.documentElement.classList.add("wte-home");</script>' if rel.as_posix() == "index.html" else ""
    head = head.replace("{{HOME_BOOT}}", home_boot)

    waybar = (PARTIALS / "waybar.html").read_text()
    ws = fm.get("ws", "")
    rel_posix = rel.as_posix()
    waybar = waybar.replace("{{WS_HOME}}", ' aria-current="page"' if rel_posix == "index.html" else "")
    for n in range(1, 12):
        waybar = waybar.replace("{{WS%d}}" % n, ' aria-current="page"' if str(n) == ws else "")
    waybar = waybar.replace("{{WS_MEETUPS}}", ' aria-current="page"' if rel_posix == "meetups/index.html" else "")
    waybar = waybar.replace("{{WS_STATIONS}}", ' aria-current="page"' if rel_posix == "workstations/index.html" else "")
    waybar = waybar.replace("{{PREFIX}}", prefix)

    footer = (PARTIALS / "footer.html").read_text().replace("{{PREFIX}}", prefix)
    overlays = (PARTIALS / "overlays.html").read_text().replace("{{PREFIX}}", prefix)

    newsbar = (PARTIALS / "newsbar.html").read_text().replace("{{PREFIX}}", prefix)
    body = body.replace("{{NEWSBAR}}", newsbar)
    body = body.replace("{{PREFIX}}", prefix)

    script = versioned(prefix, "assets/js/omarchy.js")
    html = f"""{head}
<body>
{waybar}

{body}

{footer}
{overlays}
<script src="{script}" type="module"></script>
</body>
</html>
"""
    html = enhance_images(html, out.parent)
    html = stamp_assets(html, out.parent)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html)
    print(f"built {out.relative_to(ROOT)}")


def main() -> None:
    pages = sorted(PAGES.rglob("*.html"))
    if not pages:
        sys.exit("no pages found")
    for p in pages:
        render(p)
    print(f"done ({len(pages)} pages)")


if __name__ == "__main__":
    main()
