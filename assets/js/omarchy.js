import { ready as readyLogo } from './modules/logo.js';

/* Omarchy redesign — shell behavior.
   Everything via keyboard: Space = menu, t = theme, ? = hotkeys, 1-9 = pages. */

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

  function openMenu() {
    if (!menuEl) return;
    focusBeforeOverlay = document.activeElement;
    menuEl.classList.add('open');
    document.body.classList.add('overlay-open');
    menuInput.value = '';
    renderMenu('');
    menuInput.focus();
  }
  function closeMenu({ restoreFocus = true } = {}) {
    if (!menuEl?.classList.contains('open')) return;
    menuEl.classList.remove('open');
    if (!helpEl?.classList.contains('open')) document.body.classList.remove('overlay-open');
    if (restoreFocus && focusBeforeOverlay instanceof HTMLElement) focusBeforeOverlay.focus();
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
  document.querySelector('[data-open-menu]')?.addEventListener('click', openMenu);

  /* ---------------- Help overlay ---------------- */
  const helpEl = document.querySelector('.help');
  function toggleHelp() {
    if (!helpEl) return;
    const opening = !helpEl.classList.contains('open');
    if (opening) {
      focusBeforeOverlay = document.activeElement;
      closeMenu({ restoreFocus: false });
      helpEl.classList.add('open');
      document.body.classList.add('overlay-open');
      helpEl.querySelector('.help__panel')?.focus();
    } else {
      helpEl.classList.remove('open');
      document.body.classList.remove('overlay-open');
      if (focusBeforeOverlay instanceof HTMLElement) focusBeforeOverlay.focus();
    }
  }
  helpEl?.addEventListener('click', (e) => { if (e.target === helpEl) toggleHelp(); });

  /* ---------------- News bar ---------------- */
  const newsbar = document.querySelector('.newsbar');
  newsbar?.querySelector('[data-news-dismiss]')?.addEventListener('click', () => {
    try { localStorage.setItem('omarchy-newsbar-seen', newsbar.dataset.news); } catch (_) {}
    newsbar.remove();
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
  const isTyping = () => /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '') || document.activeElement?.isContentEditable;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (menuEl?.classList.contains('open')) closeMenu();
      else if (helpEl?.classList.contains('open')) toggleHelp();
      return;
    }
    if (isTyping()) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === ' ') { e.preventDefault(); toggleMenu(); }
    else if (e.key === '?') { toggleHelp(); }
    else if (e.key === 't') { cycleTheme(1); }
    else if (e.key === 'T') { cycleTheme(-1); }
    else if (/^[1-9]$/.test(e.key)) {
      const ws = document.querySelectorAll('.workspace')[Number(e.key) - 1];
      if (ws) { osd(ws.textContent.trim()); window.location.href = ws.getAttribute('href'); }
    }
  });

  /* ---------------- Reveal on scroll ---------------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  /* ---------------- Homepage logo ---------------- */
  readyLogo();

  /* ---------------- Boot ---------------- */
  buildMenu();
})();
