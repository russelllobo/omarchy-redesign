/* Omarchy redesign — shell behavior.
   Everything via keyboard: Space = menu, t = theme, ? = hotkeys, 1-9 = pages.

   The two decorative modules are imported on demand: logo.js drags in a wasm
   etcher and only the homepage has a mark to etch; chroma.js loads when a
   heading or nav mark can actually sweep. */

(() => {
  'use strict';

  /* ---------------- Themes ---------------- */
  const THEMES = [
    { id: 'tokyo-night', name: 'Tokyo Night' },
    { id: 'gruvbox', name: 'Gruvbox' },
    { id: 'catppuccin', name: 'Catppuccin' },
    { id: 'everforest', name: 'Everforest' },
    { id: 'ristretto', name: 'Ristretto' },
    { id: 'kanagawa', name: 'Kanagawa' },
  ];
  const THEME_KEY = 'omarchy-site-theme';

  const root = document.documentElement;

  function applyTheme(id, announce) {
    if (!THEMES.some((t) => t.id === id)) id = THEMES[0].id;
    root.dataset.theme = id;
    try { localStorage.setItem(THEME_KEY, id); } catch (_) {}
    const name = THEMES.find((t) => t.id === id).name;
    document.querySelectorAll('[data-theme-name]').forEach((el) => { el.textContent = name; });
    if (announce) osd(`Theme: ${name}`);
  }

  function cycleTheme(dir = 1) {
    const cur = THEMES.findIndex((t) => t.id === (root.dataset.theme || THEMES[0].id));
    applyTheme(THEMES[(cur + dir + THEMES.length) % THEMES.length].id, true);
  }

  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) applyTheme(saved, false);
    else applyTheme(THEMES[0].id, false);
  } catch (_) { applyTheme(THEMES[0].id, false); }

  /* ---------------- OSD toast ---------------- */
  let osdTimer = null;
  function osd(text) {
    let el = document.querySelector('.osd');
    if (!el) {
      el = document.createElement('div');
      el.className = 'osd';
      el.setAttribute('role', 'status');
      el.innerHTML = '<span class="sw"></span><span class="osd__txt"></span>';
      document.body.appendChild(el);
    }
    el.querySelector('.osd__txt').textContent = text;
    el.classList.add('show');
    clearTimeout(osdTimer);
    osdTimer = setTimeout(() => el.classList.remove('show'), 1600);
  }

  /* ---------------- Omarchy Menu ---------------- */
  const menuEl = document.querySelector('.menu');
  const menuInput = menuEl?.querySelector('.menu__input');
  const menuList = menuEl?.querySelector('.menu__list');
  const helpEl = document.querySelector('.help');
  let menuItems = [];
  let sel = 0;
  let focusBeforeOverlay = null;

  // Collect actions from the DOM: any [data-action] becomes a menu entry.
  function buildMenu() {
    menuItems = [...document.querySelectorAll('[data-action]')].map((el) => ({
      label: el.dataset.action,
      desc: el.dataset.desc || '',
      keys: el.dataset.keys || '',
      run: () => {
        if (el.tagName === 'A') {
          const href = el.getAttribute('href');
          if (el.target === '_blank') window.open(href, '_blank', 'noopener');
          else window.location.href = href;
        } else if (el.dataset.themeSet) {
          applyTheme(el.dataset.themeSet, true);
        } else if (el.hasAttribute('data-cycle-theme')) {
          cycleTheme(Number(el.dataset.cycleTheme) || 1);
        } else {
          el.click();
        }
      },
    }));
    renderMenu('');
  }

  function renderMenu(filter) {
    if (!menuList) return;
    const q = filter.trim().toLowerCase();
    const hits = menuItems.filter((i) => (i.label + ' ' + i.desc).toLowerCase().includes(q));
    sel = 0;
    menuList.innerHTML = '';
    if (!hits.length) {
      menuList.innerHTML = '<div class="menu__empty">No matching action. The system only does what is listed — that is the point.</div>';
      return;
    }
    hits.forEach((item, idx) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'menu__item' + (idx === sel ? ' sel' : '');
      b.innerHTML = `<span>${item.label}</span>${item.desc ? `<span class="desc">${item.desc}</span>` : ''}${item.keys ? `<span class="keys">${item.keys}</span>` : ''}`;
      b.addEventListener('click', () => { closeMenu(); item.run(); });
      b.addEventListener('mousemove', () => { if (sel !== idx) { sel = idx; paintSel(hits); } });
      menuList.appendChild(b);
    });
    menuList._hits = hits;
  }

  function paintSel(hits) {
    [...menuList.children].forEach((c, i) => c.classList.toggle('sel', i === sel));
  }

  function overlayOpen() {
    return !!(menuEl?.classList.contains('open') || helpEl?.classList.contains('open'));
  }

  function setOverlay(el, open) {
    if (!el) return;
    el.classList.toggle('open', open);
    el.toggleAttribute('inert', !open);
    document.body.classList.toggle('overlay-open', overlayOpen());
  }

  function restoreOverlayFocus() {
    const trapped = document.activeElement;
    if (trapped instanceof HTMLElement && (menuEl?.contains(trapped) || helpEl?.contains(trapped))) {
      trapped.blur();
    }
    const target = focusBeforeOverlay;
    focusBeforeOverlay = null;
    if (
      target instanceof HTMLElement &&
      target.isConnected &&
      target !== document.body &&
      target !== document.documentElement &&
      !menuEl?.contains(target) &&
      !helpEl?.contains(target)
    ) {
      target.focus();
    }
    const still = document.activeElement;
    if (still instanceof HTMLElement && (menuEl?.contains(still) || helpEl?.contains(still))) {
      still.blur();
    }
  }

  function openMenu() {
    if (!menuEl) return;
    focusBeforeOverlay = document.activeElement;
    setOverlay(helpEl, false);
    setOverlay(menuEl, true);
    menuInput.value = '';
    renderMenu('');
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      menuInput.focus();
    }
  }
  function closeMenu({ restoreFocus = true } = {}) {
    if (!menuEl?.classList.contains('open')) return;
    setOverlay(menuEl, false);
    if (restoreFocus) restoreOverlayFocus();
  }
  function toggleMenu() { menuEl?.classList.contains('open') ? closeMenu() : openMenu(); }

  menuInput?.addEventListener('input', () => renderMenu(menuInput.value));
  menuInput?.addEventListener('keydown', (e) => {
    const hits = menuList._hits || [];
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, hits.length - 1); paintSel(hits); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); paintSel(hits); }
    else if (e.key === 'Enter') { e.preventDefault(); const it = hits[sel]; if (it) { closeMenu(); it.run(); } }
  });
  menuEl?.addEventListener('click', (e) => { if (e.target === menuEl) closeMenu(); });
  document.querySelector('[data-open-menu]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  /* ---------------- Help overlay ---------------- */
  function toggleHelp() {
    if (!helpEl) return;
    const opening = !helpEl.classList.contains('open');
    if (opening) {
      focusBeforeOverlay = document.activeElement;
      closeMenu({ restoreFocus: false });
      setOverlay(helpEl, true);
      helpEl.querySelector('.help__panel')?.focus();
    } else {
      setOverlay(helpEl, false);
      restoreOverlayFocus();
    }
  }
  helpEl?.addEventListener('click', (e) => { if (e.target === helpEl) toggleHelp(); });

  /* ---------------- Community flyout ---------------- */
  const communityEl = document.querySelector('.workspace--menu');
  const communityBtn = communityEl?.querySelector('.workspace__btn');
  function setCommunity(open) {
    if (!communityEl || !communityBtn) return;
    communityEl.classList.toggle('open', open);
    communityBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function closeCommunity() { setCommunity(false); }
  function toggleCommunity() { setCommunity(!communityEl?.classList.contains('open')); }
  communityBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleCommunity();
  });
  document.addEventListener('click', (e) => {
    if (communityEl && !communityEl.contains(e.target)) closeCommunity();
  });

  /* ---------------- Video facades ---------------- */
  document.querySelectorAll('.video__facade').forEach((facade) => {
    facade.addEventListener('click', () => {
      const id = facade.dataset.video;
      const title = facade.dataset.title || 'Video';
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`;
      iframe.title = title;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      facade.replaceWith(iframe);
    });
  });

  /* ---------------- Global hotkeys ---------------- */
  function isVisibleField(el) {
    if (!(el instanceof HTMLElement)) return false;
    if (el.closest('[inert]')) return false;
    if (menuEl?.contains(el) && !menuEl.classList.contains('open')) return false;
    if (helpEl?.contains(el) && !helpEl.classList.contains('open')) return false;
    return el.getClientRects().length > 0;
  }

  function isTyping() {
    const el = document.activeElement;
    if (!isVisibleField(el)) return false;
    return /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable;
  }

  function workspaceDigit(e) {
    if (/^Digit[1-9]$/.test(e.code)) return e.code.slice(5);
    if (/^[1-9]$/.test(e.key)) return e.key;
    return null;
  }

  document.querySelectorAll('[data-cycle-theme]').forEach((el) => {
    el.addEventListener('click', () => cycleTheme(Number(el.dataset.cycleTheme) || 1));
  });

  menuEl?.toggleAttribute('inert', !menuEl.classList.contains('open'));
  helpEl?.toggleAttribute('inert', !helpEl.classList.contains('open'));

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.code === 'Escape') {
      if (communityEl?.classList.contains('open')) closeCommunity();
      else if (menuEl?.classList.contains('open')) closeMenu();
      else if (helpEl?.classList.contains('open')) toggleHelp();
      return;
    }

    const space = e.key === ' ' || e.code === 'Space';
    if (space && menuEl?.classList.contains('open') && !menuInput?.value) {
      e.preventDefault();
      if (!e.repeat) closeMenu();
      return;
    }

    if (isTyping()) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (space) {
      e.preventDefault();
      if (!e.repeat) toggleMenu();
    } else if (e.key === '?' || (e.code === 'Slash' && e.shiftKey)) {
      if (!e.repeat) toggleHelp();
    } else if (e.key === 't') {
      cycleTheme(1);
    } else if (e.key === 'T') {
      cycleTheme(-1);
    } else {
      const n = workspaceDigit(e);
      if (!n) return;
      const ws = document.querySelectorAll('.workspaces > .workspace')[Number(n) - 1];
      if (!ws) return;
      if (ws.classList.contains('workspace--menu')) {
        e.preventDefault();
        toggleCommunity();
        osd('community');
        return;
      }
      const href = ws.getAttribute('href');
      if (href) { osd(ws.textContent.trim()); window.location.href = href; }
    }
  }, true);

  /* ---------------- Decorative modules ---------------- */
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!still && document.querySelector('[data-chroma], [data-chroma-click], h1')) {
    import('./modules/chroma.js').then((m) => m.ready());
  }

  if (!still && root.classList.contains('wte-home') && document.querySelector('.ascii > a pre')) {
    idle(() => import('./modules/logo.js').then((m) => m.ready()));
  }

  /* ---------------- Boot ---------------- */
  buildMenu();

  function idle(fn) {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(fn, { timeout: 2000 });
    else setTimeout(fn, 200);
  }
})();
