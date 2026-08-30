// Chroma: a multi-colour band sweeps over already-visible glyphs, then clears.
// Marks with the same data-chroma value share one clock.
// data-chroma-click plays on click only (waybar tabs). A click that leaves
// the page stores the group so the destination can play without delaying nav.
// On the homepage the heading waits for the ASCII mark to finish etching.

const BAND_HALF = 22;
const SWEEP_START = 0;
const SWEEP_END = 100 + BAND_HALF;
const DURATION_MS = 700;
const HERO_DONE = 'omarchy:hero-done';
const HERO_BEAT_MS = 200;
const HERO_WAIT_MS = 10000;
const PLAY_KEY = 'omarchy-chroma-play';
const FALLBACK_STOPS = ['#c679c4', '#fa3d1d', '#ffb005', '#e1e1fe', '#0358f7'];

function sweepEase(t) {
  return t < 0.5 ? 4 * t ** 3 : 1 - ((-2 * t + 2) ** 3) / 2;
}

function palette(el) {
  const style = getComputedStyle(el);
  const read = (name) => style.getPropertyValue(name).trim();
  const stops = [read('--accent-2'), read('--err'), read('--warn'), read('--highlight'), read('--accent')];
  return stops.every((stop) => stop !== '') ? stops : FALLBACK_STOPS;
}

function buildGradient(pos, colors) {
  const bandStart = pos - BAND_HALF;
  const bandEnd = pos + BAND_HALF;
  if (bandEnd <= 0 || bandStart >= 100) return 'none';

  const parts = ['transparent 0%'];
  if (bandStart > 0) parts.push(`transparent ${bandStart.toFixed(2)}%`);
  colors.forEach((color, i) => {
    const pct = colors.length === 1 ? pos : bandStart + (i / (colors.length - 1)) * BAND_HALF * 2;
    parts.push(`${color} ${pct.toFixed(2)}%`);
  });
  if (bandEnd < 100) parts.push(`transparent ${bandEnd.toFixed(2)}%`);
  parts.push('transparent 100%');
  return `linear-gradient(90deg, ${parts.join(', ')})`;
}

function paint(el, pos, colors) {
  el.style.setProperty('--chroma-band', buildGradient(pos, colors));
}

function settle(el) {
  el.classList.remove('chroma--live');
  el.style.removeProperty('--chroma-band');
}

function readPending() {
  try {
    return sessionStorage.getItem(PLAY_KEY);
  } catch {
    return null;
  }
}

function writePending(value) {
  try {
    sessionStorage.setItem(PLAY_KEY, value);
  } catch {
    /* private mode */
  }
}

function clearPending() {
  try {
    sessionStorage.removeItem(PLAY_KEY);
  } catch {
    /* private mode */
  }
}

function waitingOnHero() {
  return (
    document.documentElement.classList.contains('wte-home') &&
    document.querySelector('.ascii > a pre') != null &&
    document.querySelector('.ascii.ascii--etched, .ascii.ascii--static') == null
  );
}

function afterHero(fn) {
  let fallback = window.setTimeout(() => {
    fallback = 0;
    fn();
  }, HERO_WAIT_MS);

  document.addEventListener(HERO_DONE, () => {
    if (fallback !== 0) {
      window.clearTimeout(fallback);
      fallback = 0;
    }
    window.setTimeout(fn, HERO_BEAT_MS);
  });
}

function bind(marks, { clickOnly, playNow, defer }) {
  let raf = 0;
  const stop = () => {
    if (raf === 0) return;
    cancelAnimationFrame(raf);
    raf = 0;
  };

  const run = () => {
    stop();
    for (const el of marks) settle(el);
    const targets = marks.map((el) => ({ el, colors: palette(el) }));
    for (const target of targets) {
      target.el.classList.add('chroma--live');
      paint(target.el, SWEEP_START, target.colors);
    }

    let start = 0;
    const step = (now) => {
      if (start === 0) start = now;
      const t = Math.min((now - start) / DURATION_MS, 1);
      const pos = SWEEP_START + (SWEEP_END - SWEEP_START) * sweepEase(t);
      for (const target of targets) paint(target.el, pos, target.colors);
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
    el.classList.add('chroma');
    el.setAttribute('data-chroma-label', el.textContent.replace(/\s+/g, ' ').trim());
    const link = el.closest('a');
    const host = el.closest('a, .workspace__btn') || el;
    host.addEventListener('click', (event) => {
      const clickedLink = event.target.closest('a');
      if (clickedLink && clickedLink !== host) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const stay = !link || link.getAttribute('aria-current') === 'page';
      if (clickOnly && link && !stay) {
        if (!link.target) writePending(el.getAttribute('data-chroma') || '');
        run();
        return;
      }
      if (link) event.preventDefault();
      run();
    });
  }

  if (playNow || (!clickOnly && !defer)) run();
  if (!clickOnly) {
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) run();
    });
  }
  return run;
}

function ready() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const pending = readPending();
  clearPending();

  const clickMarks = [...document.querySelectorAll('[data-chroma-click]')];
  const headings = [...document.querySelectorAll('h1')];
  if (clickMarks.length === 0 && headings.length === 0) return;

  const groups = new Map();
  for (const el of clickMarks) {
    const key = el.getAttribute('data-chroma') || '';
    const pack = groups.get(key);
    if (pack) pack.push(el);
    else groups.set(key, [el]);
  }
  for (const pack of groups.values()) {
    bind(pack, {
      clickOnly: true,
      playNow: pending === pack[0].getAttribute('data-chroma'),
    });
  }
  if (headings.length) {
    const defer = waitingOnHero();
    const play = bind(headings, { clickOnly: false, playNow: false, defer });
    if (defer) afterHero(play);
  }
}

export { ready };
