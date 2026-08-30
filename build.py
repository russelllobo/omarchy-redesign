#!/usr/bin/env python3
"""Omarchy site builder: partials + pages -> static HTML. No framework, no deps."""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent
PARTIALS = ROOT / "partials"
PAGES = ROOT / "pages"


def render(page: Path) -> None:
    raw = page.read_text()
    fm = {}
    body = raw
    m = re.match(r"^---\n(.*?)\n---\n", raw, re.S)
    if m:
        for line in m.group(1).splitlines():
            k, _, v = line.partition(":")
            fm[k.strip()] = v.strip()
        body = raw[m.end():]

    rel = page.relative_to(PAGES)
    out = ROOT / rel
    depth = len(rel.parts) - 1
    prefix = "../" * depth

    head = (PARTIALS / "head.html").read_text()
    head = head.replace("{{TITLE}}", fm.get("title", "Omarchy"))
    head = head.replace("{{DESC}}", fm.get("desc", "Beautiful, Fun & Opinionated Linux by DHH"))
    head = head.replace("{{PREFIX}}", prefix)
    home_boot = '<script>document.documentElement.classList.add("wte-home");</script>' if rel.as_posix() == "index.html" else ""
    head = head.replace("{{HOME_BOOT}}", home_boot)

    waybar = (PARTIALS / "waybar.html").read_text()
    ws = fm.get("ws", "")
    for n in range(1, 12):
        waybar = waybar.replace("{{WS%d}}" % n, ' aria-current="page"' if str(n) == ws else "")
    waybar = waybar.replace("{{PREFIX}}", prefix)

    footer = (PARTIALS / "footer.html").read_text().replace("{{PREFIX}}", prefix)
    overlays = (PARTIALS / "overlays.html").read_text().replace("{{PREFIX}}", prefix)

    newsbar = (PARTIALS / "newsbar.html").read_text().replace("{{PREFIX}}", prefix)
    body = body.replace("{{NEWSBAR}}", newsbar)
    body = body.replace("{{PREFIX}}", prefix)

    html = f"""{head}
<body>
{waybar}

{body}

{footer}
{overlays}
<script src="{prefix}assets/js/omarchy.js?v=20260830-12" type="module"></script>
</body>
</html>
"""
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
