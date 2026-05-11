// Personal settings — actions for buttons that need behaviour beyond toasts.
// Loaded after loan.js (for toast()) and settings.js.

// ---------- Sessions ----------
function signOutSession(btn, label) {
  const row = btn.closest('.session');
  if (!row) return;
  row.style.transition = 'opacity 0.2s';
  row.style.opacity = '0';
  setTimeout(() => {
    row.remove();
    toast('Signed out of ' + label, { icon: 'logout-box-r-line' });
  }, 200);
}

// ---------- Recovery codes ----------
function openRecoveryCodes() {
  const grid = document.getElementById('recoveryGrid');
  if (grid) {
    const codes = [];
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    for (let i = 0; i < 10; i++) {
      let c = '';
      for (let j = 0; j < 10; j++) c += chars[Math.floor(Math.random() * chars.length)];
      codes.push(c.slice(0, 5) + '-' + c.slice(5));
    }
    grid.innerHTML = codes.map(c => '<code class="recovery-code">' + c + '</code>').join('');
  }
  const m = document.getElementById('recoveryModal');
  if (m) m.style.display = 'flex';
}
function closeRecoveryCodes() {
  const m = document.getElementById('recoveryModal');
  if (m) m.style.display = 'none';
}

// ---------- Delete account ----------
function openDeleteAccount() {
  const m = document.getElementById('delAcctModal');
  if (m) m.style.display = 'flex';
  const i = document.getElementById('delAcctInput');
  if (i) { i.value = ''; i.focus(); }
  const b = document.getElementById('delAcctBtn');
  if (b) b.disabled = true;
}
function closeDeleteAccount() {
  const m = document.getElementById('delAcctModal');
  if (m) m.style.display = 'none';
}

// ---------- Payment methods ----------
let pmEditingId = null;

function openAddPaymentMethod() {
  pmEditingId = null;
  document.getElementById('pmModalTitle').textContent = 'Add payment method';
  document.getElementById('pmModalSub').textContent = "Choose how you'd like AutoPay to collect your instalments.";
  document.getElementById('pmSubmit').textContent = 'Add payment method';
  resetPmForm();
  selectPmTab('bank');
  document.getElementById('pmModal').style.display = 'flex';
}

function editPaymentMethod(id) {
  const row = document.querySelector('.pm-row[data-pm-id="' + id + '"]');
  if (!row) return;
  pmEditingId = id;
  document.getElementById('pmModalTitle').textContent = 'Edit payment method';
  document.getElementById('pmModalSub').textContent = 'Update or remove this payment method.';
  document.getElementById('pmSubmit').textContent = 'Save changes';
  resetPmForm();

  const kind = row.dataset.pmKind;
  selectPmTab(kind);
  // Disable tab switching while editing — kind is fixed for an existing method.
  document.querySelectorAll('.pm-tab').forEach(t => {
    if (t.dataset.pmTab && t.dataset.pmTab !== kind) t.classList.add('locked');
  });

  const form = document.getElementById('pmForm');
  if (kind === 'bank') {
    form.querySelector('[data-pm-pane="bank"] [name=holder]').value = row.dataset.pmHolder || '';
    form.querySelector('[data-pm-pane="bank"] [name=bank]').value = row.dataset.pmBank || '';
    form.querySelector('[data-pm-pane="bank"] [name=routing]').value = row.dataset.pmRouting || '';
    form.querySelector('[data-pm-pane="bank"] [name=account]').value = row.dataset.pmAccount || '';
    form.querySelector('[data-pm-pane="bank"] [name=setDefault]').checked = row.dataset.pmDefault === 'true';
  } else if (kind === 'deposit') {
    form.querySelector('[data-pm-pane="deposit"] [name=holder]').value = row.dataset.pmHolder || '';
    form.querySelector('[data-pm-pane="deposit"] [name=institution]').value = row.dataset.pmInstitution || '';
    document.getElementById('pmRefCode').textContent = row.dataset.pmReference || generateRef();
  }

  document.getElementById('pmModal').style.display = 'flex';
}

function closePm() {
  document.getElementById('pmModal').style.display = 'none';
  document.querySelectorAll('.pm-tab.locked').forEach(t => t.classList.remove('locked'));
  pmEditingId = null;
}

function selectPmTab(name) {
  document.querySelectorAll('.pm-tab').forEach(t => {
    if (!t.dataset.pmTab) return;
    t.classList.toggle('active', t.dataset.pmTab === name);
  });
  document.querySelectorAll('.pm-pane').forEach(p => {
    p.hidden = p.dataset.pmPane !== name;
  });
  // Generate a fresh reference if entering deposit and field is empty
  if (name === 'deposit') {
    const r = document.getElementById('pmRefCode');
    if (r && !r.dataset.locked) r.textContent = generateRef();
  }
}

function generateRef() {
  const n = Math.floor(10000 + Math.random() * 90000);
  return 'REAM-AA-' + n;
}

function resetPmForm() {
  const form = document.getElementById('pmForm');
  if (form) form.reset();
  const r = document.getElementById('pmRefCode');
  if (r) { r.textContent = generateRef(); r.dataset.locked = ''; }
}

function submitPm(e) {
  e.preventDefault();
  const activeTab = document.querySelector('.pm-tab.active');
  const kind = activeTab ? activeTab.dataset.pmTab : 'bank';
  const pane = document.querySelector('.pm-pane[data-pm-pane="' + kind + '"]');
  if (!pane) return false;

  const data = {};
  pane.querySelectorAll('input, select').forEach(f => {
    if (f.type === 'checkbox') data[f.name] = f.checked;
    else data[f.name] = f.value.trim();
  });

  // Validation
  if (kind === 'bank') {
    if (!data.holder || !data.bank || !/^\d{9}$/.test(data.routing) || !/^\d{4,17}$/.test(data.account)) {
      toast('Please fill bank, holder, routing and account', { icon: 'error-warning-line' });
      return false;
    }
  } else if (kind === 'deposit') {
    if (!data.holder || !data.institution) {
      toast('Holder name and institution are required', { icon: 'error-warning-line' });
      return false;
    }
  }

  if (pmEditingId) updatePmRow(pmEditingId, kind, data);
  else addPmRow(kind, data);

  closePm();
  return false;
}

function pmRowHTML(id, kind, data) {
  const isDefault = data.setDefault === true;
  if (kind === 'bank') {
    const last4 = (data.account || '').slice(-4);
    return [
      '<i class="ri-bank-line" style="color: var(--color-brand-600);"></i>',
      '<div class="pm-meta">',
      '  <div class="pm-name">' + esc(data.bank) + ' ····' + esc(last4) +
      (isDefault ? ' <span class="badge badge-brand">● Default</span>' : '') + '</div>',
      '  <div class="pm-sub">Bank transfer · pending verification · ' + esc(data.holder) + '</div>',
      '</div>',
      '<div class="pm-actions">',
      '  <button class="btn btn-text btn-sm" type="button" onclick="openPmMenu(event, \'' + id + '\')" aria-haspopup="true">⋯</button>',
      '  <button class="btn btn-text btn-sm" type="button" onclick="editPaymentMethod(\'' + id + '\')">Edit</button>',
      '</div>'
    ].join('');
  }
  // deposit
  const refCode = document.getElementById('pmRefCode')?.textContent || generateRef();
  return [
    '<i class="ri-coins-line" style="color: var(--color-grey-700);"></i>',
    '<div class="pm-meta">',
    '  <div class="pm-name">' + esc(data.institution) + ' deposit reference</div>',
    '  <div class="pm-sub">Reference ' + esc(refCode) + ' · ' + esc(data.holder) + '</div>',
    '</div>',
    '<div class="pm-actions">',
    '  <button class="btn btn-text btn-sm" type="button" onclick="openPmMenu(event, \'' + id + '\')" aria-haspopup="true">⋯</button>',
    '  <button class="btn btn-text btn-sm" type="button" onclick="editPaymentMethod(\'' + id + '\')">Edit</button>',
    '</div>'
  ].join('');
}

function addPmRow(kind, data) {
  const list = document.getElementById('pmList');
  if (!list) return;
  const id = 'pm-' + (Date.now().toString(36));
  const row = document.createElement('div');
  row.className = 'pm-row';
  row.dataset.pmId = id;
  row.dataset.pmKind = kind;
  row.dataset.pmHolder = data.holder || '';
  if (kind === 'bank') {
    row.dataset.pmBank = data.bank || '';
    row.dataset.pmAccount = data.account || '';
    row.dataset.pmRouting = data.routing || '';
    if (data.setDefault) {
      // unset existing defaults
      list.querySelectorAll('.pm-row[data-pm-default="true"]').forEach(r => r.dataset.pmDefault = 'false');
      list.querySelectorAll('.pm-row .badge.badge-brand').forEach(b => b.remove());
    }
    row.dataset.pmDefault = data.setDefault ? 'true' : 'false';
  } else {
    row.dataset.pmInstitution = data.institution || '';
    row.dataset.pmReference = document.getElementById('pmRefCode')?.textContent || '';
  }
  row.innerHTML = pmRowHTML(id, kind, data);
  list.appendChild(row);
  refreshPmEmpty();
  toast('Payment method added', { icon: 'check-line' });
}

function updatePmRow(id, kind, data) {
  const row = document.querySelector('.pm-row[data-pm-id="' + id + '"]');
  if (!row) return;
  row.dataset.pmHolder = data.holder || '';
  if (kind === 'bank') {
    row.dataset.pmBank = data.bank || '';
    row.dataset.pmAccount = data.account || '';
    row.dataset.pmRouting = data.routing || '';
    if (data.setDefault) {
      document.querySelectorAll('.pm-row').forEach(r => {
        if (r !== row) r.dataset.pmDefault = 'false';
      });
    }
    row.dataset.pmDefault = data.setDefault ? 'true' : 'false';
  } else {
    row.dataset.pmInstitution = data.institution || '';
  }
  row.innerHTML = pmRowHTML(id, kind, data);
  // re-render others to drop default badge if needed
  if (kind === 'bank' && data.setDefault) {
    document.querySelectorAll('.pm-row').forEach(r => {
      if (r === row) return;
      const k = r.dataset.pmKind;
      if (k !== 'bank') return;
      const d = {
        holder: r.dataset.pmHolder, bank: r.dataset.pmBank,
        routing: r.dataset.pmRouting, account: r.dataset.pmAccount,
        setDefault: r.dataset.pmDefault === 'true'
      };
      r.innerHTML = pmRowHTML(r.dataset.pmId, 'bank', d);
    });
  }
  toast('Payment method updated', { icon: 'check-line' });
}

function removePmRow(id) {
  const row = document.querySelector('.pm-row[data-pm-id="' + id + '"]');
  if (!row) return;
  const wasDefault = row.dataset.pmDefault === 'true';
  row.remove();
  // If the removed one was default, promote the next bank row
  if (wasDefault) {
    const next = document.querySelector('.pm-row[data-pm-kind="bank"]');
    if (next) {
      next.dataset.pmDefault = 'true';
      const d = {
        holder: next.dataset.pmHolder, bank: next.dataset.pmBank,
        routing: next.dataset.pmRouting, account: next.dataset.pmAccount,
        setDefault: true
      };
      next.innerHTML = pmRowHTML(next.dataset.pmId, 'bank', d);
    }
  }
  refreshPmEmpty();
  toast('Payment method removed', { icon: 'delete-bin-line' });
}

function setPmDefault(id) {
  document.querySelectorAll('.pm-row').forEach(r => r.dataset.pmDefault = 'false');
  const row = document.querySelector('.pm-row[data-pm-id="' + id + '"]');
  if (!row) return;
  row.dataset.pmDefault = 'true';
  // Re-render all bank rows so badges update
  document.querySelectorAll('.pm-row[data-pm-kind="bank"]').forEach(r => {
    const d = {
      holder: r.dataset.pmHolder, bank: r.dataset.pmBank,
      routing: r.dataset.pmRouting, account: r.dataset.pmAccount,
      setDefault: r.dataset.pmDefault === 'true'
    };
    r.innerHTML = pmRowHTML(r.dataset.pmId, 'bank', d);
  });
  toast('Set as default for AutoPay', { icon: 'check-line' });
}

function refreshPmEmpty() {
  const list = document.getElementById('pmList');
  const empty = document.getElementById('pmEmpty');
  if (!list || !empty) return;
  empty.hidden = list.querySelectorAll('.pm-row').length > 0;
}

// ---------- Per-row context menu ----------
function openPmMenu(e, id) {
  e.stopPropagation();
  const row = document.querySelector('.pm-row[data-pm-id="' + id + '"]');
  if (!row) return;
  const menu = document.getElementById('pmMenu');
  if (!menu) return;
  const isBank = row.dataset.pmKind === 'bank';
  const isDefault = row.dataset.pmDefault === 'true';
  menu.innerHTML = [
    '<button type="button" onclick="editPaymentMethod(\'' + id + '\'); closePmMenu();"><i class="ri-edit-line"></i> Edit details</button>',
    isBank && !isDefault ? '<button type="button" onclick="setPmDefault(\'' + id + '\'); closePmMenu();"><i class="ri-star-line"></i> Set as default</button>' : '',
    '<button type="button" class="danger" onclick="removePmRow(\'' + id + '\'); closePmMenu();"><i class="ri-delete-bin-line"></i> Remove</button>'
  ].filter(Boolean).join('');
  const r = e.target.getBoundingClientRect();
  menu.style.top = (r.bottom + window.scrollY + 4) + 'px';
  menu.style.left = Math.max(12, r.right + window.scrollX - 200) + 'px';
  menu.hidden = false;
}
function closePmMenu() {
  const menu = document.getElementById('pmMenu');
  if (menu) menu.hidden = true;
}
document.addEventListener('click', e => {
  const menu = document.getElementById('pmMenu');
  if (!menu || menu.hidden) return;
  if (e.target.closest('#pmMenu')) return;
  if (e.target.closest('[onclick*="openPmMenu"]')) return;
  menu.hidden = true;
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  ['pmModal', 'recoveryModal', 'delAcctModal'].forEach(id => {
    const m = document.getElementById(id);
    if (m && m.style.display === 'flex') m.style.display = 'none';
  });
  closePmMenu();
});

// ---------- utils ----------
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
