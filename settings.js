// Tab switching: only the active panel is shown.
(function() {
  const nav = document.getElementById('settingsNav');
  if (!nav) return;
  const links = nav.querySelectorAll('a[data-tab]');
  const panels = document.querySelectorAll('.settings-panel');

  function show(tab) {
    links.forEach(a => a.classList.toggle('active', a.dataset.tab === tab));
    panels.forEach(p => p.classList.toggle('active', p.dataset.panel === tab));
    if (history.replaceState) history.replaceState(null, '', '#' + tab);
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  links.forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      show(a.dataset.tab);
    });
  });

  // initial: from hash if valid
  const hash = (location.hash || '').replace('#', '');
  if (hash && document.querySelector(`.settings-panel[data-panel="${hash}"]`)) show(hash);
})();

// Switches
document.addEventListener('click', e => {
  const sw = e.target.closest('.switch');
  if (sw) sw.classList.toggle('on');
});

// Per-group dirty state — show Save/Discard footer when any input in a group changes.
// Each group remembers its initial values so Discard restores them.
(function() {
  const groups = document.querySelectorAll('.settings-section.group');
  groups.forEach(group => {
    const fields = group.querySelectorAll('input, select, textarea');
    const initial = new Map();
    fields.forEach(f => {
      if (f.type === 'checkbox' || f.type === 'radio') initial.set(f, f.checked);
      else initial.set(f, f.value);
    });

    function check() {
      let dirty = false;
      fields.forEach(f => {
        const before = initial.get(f);
        const now = (f.type === 'checkbox' || f.type === 'radio') ? f.checked : f.value;
        if (before !== now) dirty = true;
      });
      group.classList.toggle('dirty', dirty);
    }

    fields.forEach(f => {
      f.addEventListener('input', check);
      f.addEventListener('change', check);
    });

    const saveBtn = group.querySelector('[data-group-save]');
    const discardBtn = group.querySelector('[data-group-discard]');
    if (saveBtn) saveBtn.addEventListener('click', () => {
      // Commit current values as the new baseline.
      fields.forEach(f => {
        if (f.type === 'checkbox' || f.type === 'radio') initial.set(f, f.checked);
        else initial.set(f, f.value);
      });
      group.classList.remove('dirty');
    });
    if (discardBtn) discardBtn.addEventListener('click', () => {
      fields.forEach(f => {
        const before = initial.get(f);
        if (f.type === 'checkbox' || f.type === 'radio') f.checked = before;
        else f.value = before;
      });
      group.classList.remove('dirty');
    });
  });
})();

// Org switcher dropdown
function toggleOrgMenu(e) {
  e && e.stopPropagation();
  const m = document.getElementById('orgMenu');
  if (!m) return;
  m.hidden = !m.hidden;
  const btn = document.querySelector('.org-switcher-btn');
  if (btn) btn.setAttribute('aria-expanded', String(!m.hidden));
}
document.addEventListener('click', e => {
  const m = document.getElementById('orgMenu');
  if (!m || m.hidden) return;
  if (e.target.closest('.org-switcher')) return;
  m.hidden = true;
  const btn = document.querySelector('.org-switcher-btn');
  if (btn) btn.setAttribute('aria-expanded', 'false');
});

// Product card collapse
document.addEventListener('click', e => {
  const head = e.target.closest('.product-head');
  if (!head) return;
  if (e.target.closest('button, a, input, select')) return;
  head.parentElement.classList.toggle('collapsed');
});

// Delete-confirm dialog (org settings)
function openDeleteOrg() {
  const m = document.getElementById('deleteOrgModal');
  if (m) m.style.display = 'flex';
}
function closeDeleteOrg() {
  const m = document.getElementById('deleteOrgModal');
  if (m) m.style.display = 'none';
  const i = document.getElementById('deleteOrgInput');
  if (i) i.value = '';
  const b = document.getElementById('deleteOrgBtn');
  if (b) b.disabled = true;
}
document.addEventListener('input', e => {
  if (e.target && e.target.id === 'deleteOrgInput') {
    const b = document.getElementById('deleteOrgBtn');
    if (b) b.disabled = e.target.value.trim() !== 'Greenline Co.';
  }
});

// DocuSign mock OAuth flow
function startDocusign() {
  const m = document.getElementById('docusignModal');
  if (m) m.style.display = 'flex';
}
function closeDocusign() {
  const m = document.getElementById('docusignModal');
  if (m) m.style.display = 'none';
  const auth = document.getElementById('docusignAuthorizing');
  if (auth) auth.style.display = 'none';
}
function authorizeDocusign() {
  const auth = document.getElementById('docusignAuthorizing');
  const consent = document.getElementById('docusignConsent');
  if (!auth || !consent) return;
  consent.style.display = 'none';
  auth.style.display = 'block';
  setTimeout(() => {
    closeDocusign();
    const card = document.getElementById('docusignCard');
    const cardConn = document.getElementById('docusignCardConnected');
    if (card) card.style.display = 'none';
    if (cardConn) cardConn.style.display = 'grid';
  }, 1400);
}
function disconnectDocusign() {
  const card = document.getElementById('docusignCard');
  const cardConn = document.getElementById('docusignCardConnected');
  if (card) card.style.display = 'grid';
  if (cardConn) cardConn.style.display = 'none';
  const consent = document.getElementById('docusignConsent');
  const auth = document.getElementById('docusignAuthorizing');
  if (consent) consent.style.display = 'block';
  if (auth) auth.style.display = 'none';
}
