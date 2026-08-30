# Omarchy site redesign

A keyboard-first static redesign of [omarchy.org](https://omarchy.org) — the public site for [Omarchy](https://github.com/omacom/omarchy), DHH's opinionated Arch Linux + Hyprland distro.

Hard edges, no shadows, no blur. JetBrains Mono everywhere. Six live palettes you can cycle with a single key. The extras gallery is the star of workspace 3.

<p align="center">
  <img src="docs/screenshots/home-tokyo-night.jpg" alt="Home in Tokyo Night">
</p>

<p align="center">
  <a href="https://russelllobo.github.io/omarchy-redesign/"><strong>Live demo</strong></a>
  ·
  <a href="https://omarchy.org">Official site</a>
  ·
  <a href="https://github.com/omacom/omarchy">Omarchy OS</a>
</p>

This is an unofficial visual redesign of the website, not the operating system.

## Live palettes

Press <kbd>t</kbd> / <kbd>T</kbd> to cycle. Pick one from the menu (<kbd>Space</kbd>), or click the palette chip in the waybar. The choice is remembered in `localStorage`.

<p align="center">
  <img src="docs/screenshots/home-tokyo-night.jpg" alt="Tokyo Night" width="49%">
  <img src="docs/screenshots/home-gruvbox.jpg" alt="Gruvbox" width="49%">
</p>
<p align="center">
  <img src="docs/screenshots/home-catppuccin.jpg" alt="Catppuccin" width="49%">
  <img src="docs/screenshots/home-everforest.jpg" alt="Everforest" width="49%">
</p>
<p align="center">
  <img src="docs/screenshots/home-ristretto.jpg" alt="Ristretto" width="49%">
  <img src="docs/screenshots/home-kanagawa.jpg" alt="Kanagawa" width="49%">
</p>

| Palette | Mood | Background | Foreground | Accent | Secondary |
| --- | --- | --- | --- | --- | --- |
| **Tokyo Night** | Cool navy, default | `#1a1b26` | `#c0caf5` | `#7aa2f7` | `#bb9af7` |
| **Gruvbox** | Warm earth | `#282828` | `#ebdbb2` | `#83a598` | `#d3869b` |
| **Catppuccin** | Pastel mocha | `#1e1e2e` | `#cdd6f4` | `#89b4fa` | `#cba6f7` |
| **Everforest** | Moss and tea | `#2d353b` | `#d3c6aa` | `#7fbbb3` | `#83c092` |
| **Ristretto** | Espresso and rose | `#2c2521` | `#e6d9db` | `#fd6883` | `#f38d70` |
| **Kanagawa** | Ink and wave | `#1f1f28` | `#dcd7ba` | `#7e9cd8` | `#957fb8` |

Every token is semantic (`--bg`, `--fg`, `--accent`, `--ok`, `--warn`, `--err`, `--cyan`). Switching palettes recolors the waybar, menu, help overlay, news, people grids, and theme cards in one pass.

## Extra themes gallery

Workspace **3** is the extras page: community Omarchy desktop themes, installable from the OS menu.

<p align="center">
  <img src="docs/screenshots/themes.jpg" alt="The Extra Themes gallery">
</p>

Copy a theme's GitHub URL, then in Omarchy: **Install → Style → Theme** (<kbd>Super</kbd>+<kbd>Space</kbd>). Remove with **Remove → Theme**.

<p align="center">
  <img src="assets/img/themes/aetheria.webp" alt="Aetheria" width="32%">
  <img src="assets/img/themes/batman.webp" alt="Batman" width="32%">
  <img src="assets/img/themes/bauhaus.webp" alt="Bauhaus" width="32%">
</p>
<p align="center">
  <img src="assets/img/themes/dracula.webp" alt="Dracula" width="32%">
  <img src="assets/img/themes/matrix.webp" alt="Matrix" width="32%">
  <img src="assets/img/themes/synthwave-84.webp" alt="Synthwave '84" width="32%">
</p>
<p align="center">
  <img src="assets/img/themes/sakura-mochi.webp" alt="Sakura Mochi" width="32%">
  <img src="assets/img/themes/nes.webp" alt="NES" width="32%">
  <img src="assets/img/themes/gold-rush.webp" alt="Gold Rush" width="32%">
</p>
<p align="center">
  <img src="assets/img/themes/catppuccin-mocha-dark.webp" alt="Catppuccin Mocha Dark" width="32%">
  <img src="assets/img/themes/rose-pine-dark.webp" alt="Rose Pine Dark" width="32%">
  <img src="assets/img/themes/tokyo-night-oled.webp" alt="Tokyo Night OLED" width="32%">
</p>

All 35 extras currently in the gallery:

| Theme | Author |
| --- | --- |
| [Aetheria](https://github.com/JJDizz1L/aetheria) | JJDizz1L |
| [All Hallow's Eve](https://github.com/guilhermetk/omarchy-all-hallows-eve-theme) | guilhermetk |
| [Arc Blueberry](https://github.com/vale-c/omarchy-arc-blueberry) | vale-c |
| [Ash](https://github.com/bjarneo/omarchy-ash-theme) | bjarneo |
| [Batman](https://github.com/OldJobobo/omarchy-batman-theme) | OldJobobo |
| [Batou](https://github.com/HANCORE-linux/omarchy-batou-theme) | HANCORE |
| [Bauhaus](https://github.com/somerocketeer/omarchy-bauhaus-theme) | somerocketeer |
| [Black Gold](https://github.com/HANCORE-linux/omarchy-blackgold-theme) | HANCORE |
| [Catppuccin Mocha Dark](https://github.com/Luquatic/omarchy-catppuccin-dark) | Luquatic |
| [City-783](https://github.com/OldJobobo/omarchy-city-783-theme) | OldJobobo |
| [Cobalt2](https://github.com/hoblin/omarchy-cobalt2-theme) | hoblin |
| [Dracula](https://github.com/catlee/omarchy-dracula-theme) | catlee |
| [Eldritch](https://github.com/eldritch-theme/omarchy) | eldritch-theme |
| [Evergarden](https://github.com/celsobenedetti/omarchy-evergarden) | celsobenedetti |
| [Flexoki Dark](https://github.com/euandeas/omarchy-flexoki-dark-theme) | euandeas |
| [Gold Rush](https://github.com/tahayvr/omarchy-gold-rush-theme) | Taha |
| [Gruvbox Material](https://github.com/curbol/omarchy-gruvbox-material) | curbol |
| [Hinterlands](https://github.com/OldJobobo/omarchy-hinterlands-theme) | OldJobobo |
| [Matrix](https://github.com/BVisagie/omarchy-matrix-theme) | BVisagie |
| [Midnight](https://github.com/JaxonWright/omarchy-midnight-theme) | JaxonWright |
| [Monokai](https://github.com/bjarneo/omarchy-monokai-theme) | bjarneo |
| [NES](https://github.com/bjarneo/omarchy-nes-theme) | bjarneo |
| [Noir](https://github.com/tahadx/omarchy-noir-theme) | tahadx |
| [Oxo Carbon](https://github.com/HANCORE-linux/omarchy-oxocarbon-theme) | HANCORE |
| [Ristretto Light](https://github.com/brokkoli71/omarchy-ristretto-light-theme) | brokkoli71 |
| [Rose Pine Dark](https://github.com/guilhermetk/omarchy-rose-pine-dark) | guilhermetk |
| [Rose Pine Moon](https://github.com/Memnoc/omarchy-rose-pine-moon-theme) | Memnoc |
| [Sakura Mochi](https://github.com/OldJobobo/omarchy-sakura-mochi-theme) | OldJobobo |
| [Shades of Jade](https://github.com/HANCORE-linux/omarchy-shadesofjade-theme) | HANCORE |
| [Solarized](https://github.com/Gazler/omarchy-solarized-theme) | Gazler |
| [Synthwave '84](https://github.com/omacom-io/omarchy-synthwave84-theme) | omacom-io |
| [Tokyo Night OLED](https://github.com/Justin-De-Sio/omarchy-tokyoled-theme) | Justin-De-Sio |
| [Velvet Night](https://github.com/HANCORE-linux/omarchy-velvetnight-theme) | HANCORE |
| [VHS 80](https://github.com/tahayvr/omarchy-vhs80-theme) | Taha |

The AIR residents — HANCORE, OldJobobo, and Taha — account for a large share of the extras, plus several themes that already ship with Omarchy.

## The rest of the site

The chrome is a waybar. Pages are workspaces **1–9**. Everything else lives in the Omarchy menu.

<p align="center">
  <img src="docs/screenshots/menu.jpg" alt="Omarchy menu" width="49%">
  <img src="docs/screenshots/hotkeys.jpg" alt="Hotkeys overlay" width="49%">
</p>

| Key | Action |
| --- | --- |
| <kbd>Space</kbd> | Open / close the menu |
| <kbd>1</kbd>–<kbd>9</kbd> | Jump to a workspace |
| <kbd>t</kbd> / <kbd>T</kbd> | Next / previous palette |
| <kbd>?</kbd> | Hotkeys overlay |
| <kbd>Esc</kbd> | Close anything |

<p align="center">
  <img src="docs/screenshots/news.jpg" alt="News" width="49%">
  <img src="docs/screenshots/teams.jpg" alt="Teams" width="49%">
</p>
<p align="center">
  <img src="docs/screenshots/air.jpg" alt="Artists in Residence" width="49%">
  <img src="docs/screenshots/sponsors.jpg" alt="Sponsorships" width="49%">
</p>
<p align="center">
  <img src="docs/screenshots/workstations.jpg" alt="Workstations wall">
</p>

| Workspace | Page |
| --- | --- |
| 1 | Home — ASCII mark, install line, videos, latest news |
| 2 | News |
| 3 | Extra themes |
| 4 | Teams (Core, Security, Rangers) |
| 5 | Patrons of the Omacom Foundation |
| 6 | Sponsorships (Hyprland, Quickshell, mise) |
| 7 | Artists in Residence |
| 8 | Meetups |
| 9 | Workstations wall |

## Run it locally

No framework, no npm, no bundler. Python 3 for the tiny page builder; a static server for preview.

```bash
python3 build.py
python3 -m http.server 8765
```

Then open [http://127.0.0.1:8765](http://127.0.0.1:8765). Edit files under `pages/` and `partials/`, rebuild, refresh.

## Layout

```
pages/            source HTML + front matter
partials/         waybar, footer, overlays, newsbar
build.py          concatenates partials, rewrites {{PREFIX}}
index.html        built home (and the other built routes beside it)
assets/css/       one stylesheet, six palettes at the top
assets/js/        menu, themes, hotkeys, logo etch
assets/img/themes extras gallery stills
docs/screenshots  README captures
```

`build.py` is a ~70-line concat. Pages declare `title`, `desc`, and workspace number in a YAML-ish header; the builder stitches head, waybar, body, footer, and overlays, then writes the matching public HTML.

## Taste

From the stylesheet:

> Hard edges, no shadows, no blur, monospace everywhere, separation by space and line, one coherent semantic theme, delight without latency.

Motion stays under 150ms. Workspace jumps are instant. The homepage mark is the Omarchy ASCII, etched once with Web Text Effects; reduced-motion users get the still glyph.

Omarchy, the OS, and omarchy.org belong to [Omacom](https://omarchy.org). This repo is a personal redesign of the public site.
