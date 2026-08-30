// Play the homepage ASCII mark once with Web Text Effects laseretch.
// The pre remains the layout box and fallback while the canvas plays.

const WTE_ROOT = new URL('../wte/', import.meta.url);
const WTE_CANVAS_URL = new URL('wte-canvas.js', WTE_ROOT);
const WTE_WASM_URL = new URL('laseretch.wasm', WTE_ROOT);
const EFFECT = 'laseretch';
const ART_COLUMNS = 81;
const ART_ROWS = 10;
const CELL_ASPECT = 2;
const FONT_WAIT_MS = 1000;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// The etcher costs ~200KB of wasm for one decorative pass. Metered and slow
// connections get the static glyph instead, same as reduced-motion users.
function tooExpensive() {
  const net = navigator.connection;
  if (net == null) return false;
  return net.saveData === true || /^(slow-)?2g$/.test(net.effectiveType ?? '');
}

let wasmBytes = null;

async function loadWasm() {
  const response = await fetch(WTE_WASM_URL);
  if (!response.ok) {
    throw new Error(`laseretch wasm ${response.status}`);
  }
  wasmBytes = await response.arrayBuffer();
}

function wasmUrl() {
  if (wasmBytes == null) {
    throw new Error('laseretch wasm is not loaded');
  }
  return wasmBytes;
}

function artFromPre(pre) {
  let text = pre.textContent ?? '';
  if (text.startsWith('\n')) text = text.slice(1);
  return text.replace(/\n+$/, '');
}

function markStatic() {
  document.querySelector('.ascii')?.classList.add('ascii--static');
}

function markEtched() {
  document.querySelector('.ascii')?.classList.add('ascii--etched');
}

function finishHero() {
  document.dispatchEvent(new Event('omarchy:hero-done'));
}

function afterFonts() {
  if (document.fonts?.ready == null) {
    return Promise.resolve();
  }
  return Promise.race([
    document.fonts.ready,
    new Promise((resolve) => {
      window.setTimeout(resolve, FONT_WAIT_MS);
    }),
  ]);
}

function nativeGrid(host) {
  const box = host.getBoundingClientRect();
  const cell = Math.max(
    1,
    Math.floor(Math.min(box.width / ART_COLUMNS, box.height / (ART_ROWS * CELL_ASPECT))),
  );
  return { width: cell * ART_COLUMNS, height: cell * ART_ROWS * CELL_ASPECT };
}

function scaleCanvas(canvas, host, nativeWidth, nativeHeight) {
  const box = host.getBoundingClientRect();
  if (box.width < 1 || box.height < 1) return;
  canvas.style.transform = `scale(${box.width / nativeWidth}, ${box.height / nativeHeight})`;
}

function watchSize(target, onChange) {
  let frame = 0;
  const schedule = () => {
    if (frame !== 0) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      onChange();
    });
  };
  const observer = new ResizeObserver(schedule);
  observer.observe(target);
  return () => {
    if (frame !== 0) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
    observer.disconnect();
  };
}

async function loadCanvasPlayback() {
  const response = await fetch(WTE_CANVAS_URL);
  if (!response.ok) {
    throw new Error(`wte-canvas ${response.status}`);
  }
  const source = await response.text();
  const spec = source.match(/from["'](\.\/assets\/playback-[A-Za-z0-9_-]+\.js)["']/);
  if (spec == null) {
    throw new Error('wte playback module not found');
  }
  const mod = await import(new URL(spec[1], response.url).href);
  for (const value of Object.values(mod)) {
    if (
      typeof value === 'function' &&
      value.prototype != null &&
      typeof value.prototype.restart === 'function' &&
      typeof value.prototype.stop === 'function'
    ) {
      return value;
    }
  }
  throw new Error('CanvasPlayback not found');
}

function ready() {
  if (prefersReducedMotion() || tooExpensive()) {
    finishHero();
    return;
  }
  if (!document.documentElement.classList.contains('wte-home')) return;

  const pre = document.querySelector('.ascii > a pre');
  const link = pre?.parentElement;
  if (!(pre instanceof HTMLPreElement) || link == null) {
    finishHero();
    return;
  }

  let replay = () => {};
  link.addEventListener('click', (event) => {
    event.preventDefault();
    replay();
  });

  const input = artFromPre(pre);
  if (input.trim() === '') {
    markStatic();
    finishHero();
    return;
  }

  afterFonts()
    .then(() => Promise.all([loadWasm(), loadCanvasPlayback()]))
    .then(([, CanvasPlayback]) => {
      const box = pre.getBoundingClientRect();
      if (box.width < 8 || box.height < 8) {
        markStatic();
        finishHero();
        return;
      }

      const holder = document.createElement('span');
      holder.className = 'ascii__wte';

      const canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      const native = nativeGrid(pre);
      canvas.style.width = `${native.width}px`;
      canvas.style.height = `${native.height}px`;
      scaleCanvas(canvas, pre, native.width, native.height);

      let playback = null;
      const makePlayback = () => new CanvasPlayback({
        canvas,
        width: () => native.width,
        height: () => native.height,
        connected: () => canvas.isConnected,
        input: () => input,
        effect: () => EFFECT,
        wasmUrl,
        onFinished() {
          const finished = playback;
          playback = null;
          finished?.stop();
          markEtched();
          finishHero();
        },
        // The playback engine defaults to 120Hz. It paints once per display
        // frame, so stepping at 240Hz only adds work on ordinary 60/120Hz
        // panels without making the rendered animation smoother.
        frameRate: () => 120,
      });

      const stopWatching = watchSize(pre, () => {
        scaleCanvas(canvas, pre, native.width, native.height);
      });

      const fail = () => {
        window.removeEventListener('error', onError);
        stopWatching();
        playback?.stop();
        playback = null;
        document.querySelector('.ascii')?.classList.remove('ascii--live');
        markStatic();
        markEtched();
        finishHero();
      };

      const onError = (event) => {
        const message = String(event.message ?? event.error ?? '');
        if (!/memory access out of bounds|RuntimeError|CompileError|WebAssembly/i.test(message)) {
          return;
        }
        fail();
      };
      window.addEventListener('error', onError);

      replay = () => {
        playback?.stop();
        document.querySelector('.ascii')?.classList.remove('ascii--static');
        document.querySelector('.ascii')?.classList.remove('ascii--etched');
        document.querySelector('.ascii')?.classList.add('ascii--live');
        playback = makePlayback();
        void playback.restart().catch(fail);
      };

      holder.append(canvas);
      link.append(holder);
      replay();
    })
    .catch(() => {
      markStatic();
      markEtched();
      finishHero();
    });
}

export { ready };
