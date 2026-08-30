// Chroma text reveal: a multi-colour band sweeps left to right through the
// glyphs (background-clip: text), then the word rests on the theme colour.
// Core, Security, and Rangers share one clock so they play in lockstep.

const BAND_HALF = 17;
const SWEEP_START = -BAND_HALF;
const SWEEP_END = 100 + BAND_HALF;
const DURATION_MS = 1500;
const FALLBACK_STOPS = ['#c679c4', '#fa3d1d', '#ffb005', '#e1e1fe', '#0358f7'];

function sweepEase(t) {
  return t < 0.5 ? 4 * t ** 3 : 1 - ((-2 * t + 2) ** 3) / 2;
}

function palette(el) {
  const style = getComputedStyle(el);
  const read = (name) => style.getPropertyValue(name).trim();
  const stops = [read('--accent-2'), read('--err'), read('--warn'), read('--highlight'), read('--accent')];
  return {
    colors: stops.every((stop) => stop !== '') ? stops : FALLBACK_STOPS,
    textColor: read('--fg') || style.color,
  };
}

function buildGradient(pos, colors, textColor) {
  const bandStart = pos - BAND_HALF;
  const bandEnd = pos + BAND_HALF;
  if (bandStart >= 100) return `linear-gradient(90deg, ${textColor}, ${textColor})`;

  const parts = [];
  if (bandStart > 0) parts.push(`${textColor} 0%`, `${textColor} ${bandStart.toFixed(2)}%`);
  colors.forEach((color, i) => {
    const pct = colors.length === 1 ? pos : bandStart + (i / (colors.length - 1)) * BAND_HALF * 2;
    parts.push(`${color} ${pct.toFixed(2)}%`);
  });
  if (bandEnd < 100) parts.push(`transparent ${bandEnd.toFixed(2)}%`, `transparent 100%`);
  return `linear-gradient(90deg, ${parts.join(', ')})`;
}

function paint(el, pos, colors, textColor) {
  el.style.backgroundImage = buildGradient(pos, colors, textColor);
}

function settle(el) {
  el.classList.remove('chroma--live');
  el.style.backgroundImage = '';
}

function ready() {
  const marks = [...document.querySelectorAll('[data-chroma]')];
  if (marks.length === 0) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  for (const el of marks) el.classList.add('chroma');

  let raf = 0;
  const stop = () => {
    if (raf === 0) return;
    cancelAnimationFrame(raf);
    raf = 0;
  };

  const run = () => {
    stop();
    const targets = marks.map((el) => ({ el, ...palette(el) }));
    for (const target of targets) {
      target.el.classList.add('chroma--live');
      paint(target.el, SWEEP_START, target.colors, target.textColor);
    }

    let start = 0;
    const step = (now) => {
      if (start === 0) start = now;
      const t = Math.min((now - start) / DURATION_MS, 1);
      const pos = SWEEP_START + (SWEEP_END - SWEEP_START) * sweepEase(t);
      for (const target of targets) paint(target.el, pos, target.colors, target.textColor);
      if (t < 1) {
        raf = requestAnimationFrame(step);
        return;
      }
      raf = 0;
      for (const target of targets) settle(target.el);
    };
    raf = requestAnimationFrame(step);
  };

  for (const el of marks) {
    el.addEventListener('click', (event) => {
      event.preventDefault();
      run();
    });
  }

  run();
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) run();
  });
}

export { ready };
