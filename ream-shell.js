/* ============================================================
   REAM — Shell behaviours (vanilla JS, no deps)
   Reconstructed from the patterns embedded in ream.html and the
   nav structures shared by other pages.

   Responsibilities:
     1. Sidebar nav-group collapse/expand via [data-collapsed]
     2. Internal page switching on .page-pane[data-page]
     3. Active nav-item highlight (current page or current pane)
     4. Popover menus driven by [aria-haspopup="menu"] + outside-click close
     5. Optional: theme toggle keyed off [data-theme] on <html>

   The script tag in pages is loaded with onerror="this.remove();"
   so any failure here is non-fatal — pages still render.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- helpers ---------- */
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const $ = (sel, root) => (root || document).querySelector(sel);

  /* ---------- 1. nav-group collapse ---------- */
  function initNavGroups() {
    $$('.sidebar .nav-group').forEach(group => {
      const label = group.querySelector('button.group-label, .group-label');
      if (!label) return;
      if (label.tagName !== 'BUTTON') return; // only collapse if interactive
      label.addEventListener('click', () => {
        const next = group.getAttribute('data-collapsed') === 'true' ? 'false' : 'true';
        group.setAttribute('data-collapsed', next);
      });
    });
  }

  /* ---------- 2 + 3. internal page panes + active nav ---------- */
  function showPane(name) {
    const panes = $$('.page-pane');
    if (!panes.length) return false;
    let matched = false;
    panes.forEach(p => {
      const on = p.getAttribute('data-page') === name;
      p.classList.toggle('active', on);
      if (on) matched = true;
    });
    if (matched) {
      $$('.sidebar .nav-item').forEach(n => {
        const target = n.getAttribute('data-page') || n.dataset.page;
        n.classList.toggle('active', target === name);
      });
      try { history.replaceState(null, '', '#' + name); } catch (_) { /* noop */ }
    }
    return matched;
  }

  function initPaneNav() {
    if (!$$('.page-pane').length) return;
    $$('.sidebar .nav-item[data-page]').forEach(item => {
      item.addEventListener('click', e => {
        const name = item.getAttribute('data-page');
        if (!name) return;
        if (showPane(name)) e.preventDefault();
      });
    });
    const initial =
      (location.hash || '').replace(/^#/, '') ||
      ($('.page-pane.active') && $('.page-pane.active').getAttribute('data-page')) ||
      ($$('.page-pane')[0] && $$('.page-pane')[0].getAttribute('data-page'));
    if (initial) showPane(initial);
  }

  /* ---------- active link by URL (cross-page nav) ---------- */
  function initActiveLink() {
    const here = location.pathname.split('/').pop() || 'index.html';
    $$('.sidebar a.nav-item').forEach(a => {
      const href = (a.getAttribute('href') || '').split('/').pop();
      if (!href) return;
      if (href === here) a.classList.add('active');
    });
  }

  /* ---------- 4. popover menus ---------- */
  let openMenuBtn = null;
  function closeOpenMenu() {
    if (!openMenuBtn) return;
    openMenuBtn.setAttribute('aria-expanded', 'false');
    const menu = resolveMenu(openMenuBtn);
    if (menu) menu.hidden = true;
    openMenuBtn = null;
  }
  function resolveMenu(btn) {
    const id = btn.getAttribute('aria-controls') || btn.dataset.menu;
    if (id) return document.getElementById(id);
    const sibling = btn.nextElementSibling;
    if (sibling && sibling.getAttribute('role') === 'menu') return sibling;
    return null;
  }
  function initMenus() {
    $$('[aria-haspopup="menu"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = btn.getAttribute('aria-expanded') === 'true';
        closeOpenMenu();
        if (!isOpen) {
          btn.setAttribute('aria-expanded', 'true');
          const menu = resolveMenu(btn);
          if (menu) menu.hidden = false;
          openMenuBtn = btn;
        }
      });
    });
    document.addEventListener('click', e => {
      if (!openMenuBtn) return;
      const menu = resolveMenu(openMenuBtn);
      if (menu && menu.contains(e.target)) return;
      if (openMenuBtn.contains(e.target)) return;
      closeOpenMenu();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeOpenMenu();
    });
  }

  /* ---------- 5. theme toggle (opt-in) ---------- */
  function applyTheme(mode) {
    const root = document.documentElement;
    if (mode === 'auto') {
      const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
      root.setAttribute('data-theme-pref', 'auto');
    } else {
      root.setAttribute('data-theme', mode);
      root.setAttribute('data-theme-pref', mode);
    }
    try { localStorage.setItem('ream:theme', mode); } catch (_) { /* noop */ }
  }
  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem('ream:theme'); } catch (_) { /* noop */ }
    if (saved) applyTheme(saved);
    $$('[data-set-theme]').forEach(btn => {
      btn.addEventListener('click', () => applyTheme(btn.getAttribute('data-set-theme')));
    });
  }

  /* ---------- public surface ---------- */
  window.ReamShell = {
    showPane,
    applyTheme,
    closeOpenMenu,
  };

  /* ---------- boot ---------- */
  function boot() {
    initNavGroups();
    initPaneNav();
    initActiveLink();
    initMenus();
    initTheme();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
