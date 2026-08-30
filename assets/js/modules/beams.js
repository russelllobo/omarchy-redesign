// beams, ported from omacom/ttfx (src/effects/beams.rs), itself a parity port
// of terminaltexteffects' effect_beams.py. Headings are a single line, so the
// canvas is one row: the row beam sweeps the whole word, each column beam is a
// single cell, and the final diagonal wipe runs left to right.
//
// Defaults follow BeamsConfig; the gradients take their colors from the theme.

const ROW_SYMBOLS = ['▂', '▁', '_'];
const COLUMN_SYMBOLS = ['▌', '▍', '▎', '▏'];
const BEAM_DELAY = 6;
const ROW_SPEED_RANGE = [15, 60];
const COLUMN_SPEED_RANGE = [9, 15];
const BEAM_GRADIENT_STEPS = [2, 6];
const BEAM_GRADIENT_FRAMES = 2;
const FADE_BRIGHTNESS = 0.3;
const FADE_STEPS = 10;
const FADE_FRAMES = 2;
const FINAL_GRADIENT_FRAMES = 4;
const FINAL_WIPE_SPEED = 3;
const FRAME_MS = 1000 / 100; // ttfx's default frame rate
const FONT_WAIT_MS = 1000;
// Row speeds are tuned for a terminal-width canvas; a heading is a dozen cells
// wide, so scale them down or the beam crosses the word in two frames.
const REFERENCE_COLUMNS = 80;

const randint = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const clamp255 = (v) => Math.min(255, Math.max(0, v));

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

function parseColor(text) {
  const hex = text.trim().match(/^#?([\da-f]{3}|[\da-f]{6})$/i);
  if (hex != null) {
    const digits = hex[1].length === 3 ? hex[1].replace(/./g, '$&$&') : hex[1];
    return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16));
  }
  const parts = text.match(/\d+(\.\d+)?/g);
  return parts == null ? [255, 255, 255] : parts.slice(0, 3).map((n) => Math.round(Number(n)));
}

const cssColor = (rgb) => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

// Gradient::new — integer channel deltas, and the first stop is only emitted
// when the spectrum is still empty.
function gradient(stops, steps) {
  const counts = steps.slice(0, stops.length - 1);
  while (counts.length < stops.length - 1) counts.push(counts[counts.length - 1]);

  const spectrum = [];
  counts.forEach((count, pair) => {
    const start = stops[pair];
    const end = stops[pair + 1];
    const delta = [0, 1, 2].map((c) => Math.floor((end[c] - start[c]) / count));
    for (let i = spectrum.length === 0 ? 0 : 1; i < count; i += 1) {
      spectrum.push([0, 1, 2].map((c) => clamp255(start[c] + delta[c] * i)));
    }
    spectrum.push(end);
  });
  return spectrum;
}

// Animation::adjust_color_brightness — scales HSL lightness.
function adjustBrightness(rgb, brightness) {
  const [r, g, b] = rgb.map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;
  if (max !== min) {
    const diff = max - min;
    saturation = lightness > 0.5 ? diff / (2 - max - min) : diff / (max + min);
    if (max === r) hue = (g - b) / diff + (g < b ? 6 : 0);
    else if (max === g) hue = (b - r) / diff + 2;
    else hue = (r - g) / diff + 4;
    hue /= 6;
  }
  lightness = Math.min(1, Math.max(0, lightness * brightness));
  if (saturation === 0) {
    const level = Math.round(lightness * 255);
    return [level, level, level];
  }
  const intensity = lightness < 0.5
    ? lightness * (1 + saturation)
    : lightness + saturation - lightness * saturation;
  const scaled = 2 * lightness - intensity;
  const channel = (offset) => {
    let h = hue + offset;
    if (h < 0) h += 1;
    if (h > 1) h -= 1;
    if (h < 1 / 6) return scaled + (intensity - scaled) * 6 * h;
    if (h < 1 / 2) return intensity;
    if (h < 2 / 3) return scaled + (intensity - scaled) * (2 / 3 - h) * 6;
    return scaled;
  };
  return [1 / 3, 0, -1 / 3].map((offset) => Math.round(channel(offset) * 255));
}

// Scene::apply_gradient_to_symbols — spreads the shorter list over the longer.
function cyclicDistribution(larger, smaller) {
  const repeat = Math.floor(larger.length / smaller.length);
  let overflow = larger.length % smaller.length;
  let overflowUsed = false;
  let index = 0;
  let used = 0;
  return larger.map((element) => {
    if (used >= repeat) {
      if (overflow > 0) {
        if (overflowUsed) {
          index += 1;
          used = 0;
          overflowUsed = false;
        } else {
          overflowUsed = true;
          overflow -= 1;
        }
      } else {
        index += 1;
        used = 0;
      }
    }
    used += 1;
    return [element, smaller[index]];
  });
}

function scene(symbols, colors, duration) {
  const pairs = symbols.length >= colors.length
    ? cyclicDistribution(symbols, colors)
    : cyclicDistribution(colors, symbols).map(([color, symbol]) => [symbol, color]);

  const frames = [];
  for (const [symbol, color] of pairs) {
    const visual = { symbol, color: cssColor(color) };
    for (let i = 0; i < duration; i += 1) frames.push(visual);
  }
  return frames;
}

function palette(el) {
  const style = getComputedStyle(el);
  const read = (name, fallback) => {
    const value = style.getPropertyValue(name).trim();
    return value === '' ? parseColor(fallback) : parseColor(value);
  };
  return {
    beam: [[255, 255, 255], read('--highlight', '#00d1ff'), read('--accent-2', '#8a008a')],
    final: parseColor(style.color),
  };
}

function decorate(el) {
  const text = el.textContent.trim();
  if (text === '') return null;

  const label = document.createElement('span');
  label.className = 'beams__label';
  label.textContent = text;

  const line = document.createElement('span');
  line.className = 'beams__line';
  line.setAttribute('aria-hidden', 'true');

  const cells = [...text].map((symbol, column) => {
    const node = document.createElement('span');
    node.className = 'beams__cell';
    node.textContent = symbol;
    line.append(node);
    return { node, symbol, column, frames: null, step: 0 };
  });

  el.textContent = '';
  el.classList.add('beams');
  el.append(label, line);
  return cells;
}

function makeGroup(cells, direction, columns) {
  const row = direction === 'row';
  const range = row ? ROW_SPEED_RANGE : COLUMN_SPEED_RANGE;
  const scale = row ? Math.min(1, columns / REFERENCE_COLUMNS) : 1;
  const characters = [...cells];
  if (randint(0, 1) === 0) characters.reverse();
  return {
    characters,
    direction,
    speed: randint(range[0], range[1]) * 0.1 * scale,
    counter: 0,
  };
}

function play(el, cells, done) {
  const colors = palette(el);
  const beamSpectrum = gradient(colors.beam, BEAM_GRADIENT_STEPS);
  const faded = adjustBrightness(colors.final, FADE_BRIGHTNESS);
  const fade = gradient([colors.final, faded], [FADE_STEPS]);
  const brighten = gradient([faded, colors.final], [FADE_STEPS]);

  // A null symbol means the cell's own character.
  const scenes = {
    beam_row: [
      ...scene(ROW_SYMBOLS, beamSpectrum, BEAM_GRADIENT_FRAMES),
      ...scene([null], fade, FADE_FRAMES),
    ],
    beam_column: [
      ...scene(COLUMN_SYMBOLS, beamSpectrum, BEAM_GRADIENT_FRAMES),
      ...scene([null], fade, FADE_FRAMES),
    ],
    brighten: scene([null], brighten, FINAL_GRADIENT_FRAMES),
  };

  const active = new Set();
  const pending = [
    makeGroup(cells, 'row', cells.length),
    ...cells.map((cell) => makeGroup([cell], 'column', cells.length)),
  ];
  shuffle(pending);
  const running = [];
  const wipe = cells.map((cell) => [cell]);
  let delay = 0;
  let phase = 'beams';

  for (const cell of cells) {
    cell.frames = null;
    cell.step = 0;
    cell.node.style.visibility = 'hidden';
  }

  // Beams::get_next_character — an already-animating cell replays its scene.
  const reach = (cell, name) => {
    const fresh = cell.frames === null;
    if (fresh) cell.node.style.visibility = 'visible';
    cell.frames = scenes[name];
    cell.step = 0;
    if (fresh) active.add(cell);
  };

  const draw = (cell) => {
    const visual = cell.frames[Math.min(cell.step, cell.frames.length - 1)];
    cell.node.textContent = visual.symbol ?? cell.symbol;
    cell.node.style.color = visual.color;
    cell.step += 1;
    if (cell.step >= cell.frames.length) {
      cell.frames = null;
      active.delete(cell);
    }
  };

  const frame = () => {
    if (phase === 'beams') {
      if (delay === 0) {
        for (let i = 0; i < randint(1, 5) && pending.length > 0; i += 1) running.push(pending.shift());
        delay = BEAM_DELAY;
      } else {
        delay -= 1;
      }
      for (const group of running) {
        group.counter += group.speed;
        const count = Math.trunc(group.counter);
        if (count > 1) {
          for (let i = 0; i < count && group.characters.length > 0; i += 1) {
            group.counter -= 1;
            reach(group.characters.shift(), group.direction === 'row' ? 'beam_row' : 'beam_column');
          }
        }
      }
      for (let i = running.length - 1; i >= 0; i -= 1) {
        if (running[i].characters.length === 0) running.splice(i, 1);
      }
      if (pending.length === 0 && running.length === 0 && active.size === 0) phase = 'wipe';
    } else if (phase === 'wipe') {
      if (wipe.length > 0) {
        for (let i = 0; i < FINAL_WIPE_SPEED && wipe.length > 0; i += 1) {
          for (const cell of wipe.shift()) {
            cell.node.style.visibility = 'visible';
            cell.frames = scenes.brighten;
            cell.step = 0;
            active.add(cell);
          }
        }
      } else if (active.size === 0) {
        return false;
      }
    }

    for (const cell of [...active]) draw(cell);
    return true;
  };

  let last = 0;
  let debt = 0;
  const tick = (now) => {
    debt += last === 0 ? FRAME_MS : Math.min(now - last, FRAME_MS * 4);
    last = now;
    let alive = true;
    while (debt >= FRAME_MS && alive) {
      debt -= FRAME_MS;
      alive = frame();
    }
    if (alive) {
      requestAnimationFrame(tick);
      return;
    }
    settle(cells);
    done();
  };
  requestAnimationFrame(tick);
}

function settle(cells) {
  for (const cell of cells) {
    cell.node.textContent = cell.symbol;
    cell.node.style.color = '';
    cell.node.style.visibility = 'visible';
  }
}

function afterFonts() {
  if (document.fonts?.ready == null) return Promise.resolve();
  return Promise.race([
    document.fonts.ready,
    new Promise((resolve) => window.setTimeout(resolve, FONT_WAIT_MS)),
  ]);
}

function ready() {
  const heads = [...document.querySelectorAll('[data-beams]')];
  if (heads.length === 0) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  void afterFonts().then(() => {
    const targets = heads
      .map((el) => ({ el, cells: decorate(el) }))
      .filter((target) => target.cells != null);

    for (const target of targets) {
      let playing = false;
      target.run = () => {
        if (playing) return;
        playing = true;
        play(target.el, target.cells, () => { playing = false; });
      };
      target.el.addEventListener('pointerenter', target.run);
    }

    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        io.unobserve(entry.target);
        targets.find((target) => target.el === entry.target)?.run();
      }
    }, { threshold: 0.9 });
    for (const target of targets) io.observe(target.el);
  });
}

export { ready };
