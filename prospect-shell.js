// prospect-shell.js — mobile sidebar toggle for prospect portal pages
(function () {
  function init() {
    const app = document.querySelector('.app');
    const sidebar = document.querySelector('.app > .sidebar');
    if (!app || !sidebar) return;

    // Inject scrim
    if (!app.querySelector('.sb-scrim')) {
      const scrim = document.createElement('div');
      scrim.className = 'sb-scrim';
      scrim.addEventListener('click', () => app.classList.remove('sb-open'));
      app.appendChild(scrim);
    }

    // Inject toggle into the first .topbar
    const topbar = app.querySelector('.topbar');
    if (topbar && !topbar.querySelector('.sb-toggle')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sb-toggle';
      btn.setAttribute('aria-label', 'Toggle navigation');
      btn.innerHTML = '<i class="ph ph-list"></i>';
      btn.addEventListener('click', () => app.classList.toggle('sb-open'));
      topbar.insertBefore(btn, topbar.firstChild);
    }

    // Close on nav link tap (mobile UX)
    sidebar.addEventListener('click', (e) => {
      if (e.target.closest('a, .nav-item, .sb-cta')) {
        if (window.matchMedia('(max-width: 1024px)').matches) {
          app.classList.remove('sb-open');
        }
      }
    });

    // Close on Esc
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') app.classList.remove('sb-open');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
