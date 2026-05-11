/* ============================================================
   Ream · Row actions menu
   Wires up:
     • Click on a `.row-link` row → open its detail page
     • Click on the trailing dots cell → contextual menu
     • Reset password modal + toasts
   Host page calls:
     RowActions.mount({
       role: 'agent' | 'manager' | 'admin' | 'customer',
       table: '#agentRows',
       getId: tr => tr.dataset.id,           // optional, default tr.dataset.id || row index
       getName: tr => tr...,                 // optional, default text from .nm
     });
   ============================================================ */
(function () {
  const ROLE_DETAIL = {
    agent: 'person.html?role=agent',
    manager: 'person.html?role=manager',
    admin: 'person.html?role=admin',
    customer: 'person.html?role=customer',
    documentRequest: 'document-request-detail.html?ctx=req',
  };

  const ROLE_LABEL = {
    agent: 'agent',
    manager: 'manager',
    admin: 'admin',
    customer: 'customer',
  };

  // Per-role action menu definitions
  // Each item: {label, icon, action, danger?, section?}
  // Sections render as a small uppercase header.
  const MENUS = {
    agent: [
      { label: 'View profile', icon: 'ri-eye-line', action: 'view' },
      { label: 'Edit info', icon: 'ri-edit-line', action: 'edit' },
      { sep: true },
      { section: 'Account' },
      { label: 'Reset password', icon: 'ri-lock-password-line', action: 'reset' },
      { label: 'Resend invite', icon: 'ri-mail-send-line', action: 'resend' },
      { label: 'Change type', icon: 'ri-shuffle-line', action: 'changeType' },
      { label: 'Change role', icon: 'ri-user-settings-line', action: 'changeRole' },
      { sep: true },
      { section: 'Workload' },
      { label: 'Reassign open work', icon: 'ri-arrow-left-right-line', action: 'reassign' },
      { label: 'Pause assignments', icon: 'ri-pause-circle-line', action: 'pause' },
      { sep: true },
      { label: 'Suspend agent', icon: 'ri-forbid-line', action: 'suspend', danger: true },
    ],
    manager: [
      { label: 'View profile', icon: 'ri-eye-line', action: 'view' },
      { label: 'Edit info', icon: 'ri-edit-line', action: 'edit' },
      { sep: true },
      { section: 'Account' },
      { label: 'Reset password', icon: 'ri-lock-password-line', action: 'reset' },
      { label: 'Resend invite', icon: 'ri-mail-send-line', action: 'resend' },
      { label: 'Change role', icon: 'ri-user-settings-line', action: 'changeRole' },
      { sep: true },
      { section: 'Team' },
      { label: 'Manage direct reports', icon: 'ri-team-line', action: 'team' },
      { label: 'Reassign team', icon: 'ri-arrow-left-right-line', action: 'reassign' },
      { sep: true },
      { label: 'Suspend manager', icon: 'ri-forbid-line', action: 'suspend', danger: true },
    ],
    admin: [
      { label: 'View profile', icon: 'ri-eye-line', action: 'view' },
      { label: 'Edit info', icon: 'ri-edit-line', action: 'edit' },
      { sep: true },
      { section: 'Account' },
      { label: 'Reset password', icon: 'ri-lock-password-line', action: 'reset' },
      { label: 'Force sign-out', icon: 'ri-logout-circle-r-line', action: 'signout' },
      { label: 'Manage 2FA', icon: 'ri-shield-keyhole-line', action: 'twofa' },
      { label: 'Change role', icon: 'ri-user-settings-line', action: 'changeRole' },
      { sep: true },
      { section: 'Permissions' },
      { label: 'Adjust oversight scope', icon: 'ri-toggle-line', action: 'scope' },
      { label: 'Transfer ownership', icon: 'ri-vip-crown-line', action: 'owner' },
      { sep: true },
      { label: 'Revoke admin', icon: 'ri-forbid-line', action: 'revoke', danger: true },
    ],
    customer: [
      { label: 'View profile', icon: 'ri-eye-line', action: 'view' },
      { label: 'Edit info', icon: 'ri-edit-line', action: 'edit', requiresSuper: true, requiresSuperWhenActive: true },
      { sep: true },
      { section: 'Account' },
      { label: 'Reset password', icon: 'ri-lock-password-line', action: 'reset', requiresSuper: true },
      { label: 'Resend welcome email', icon: 'ri-mail-send-line', action: 'welcome' },
      { sep: true },
      { section: 'Activity' },
      { label: 'View loans', icon: 'ri-bank-line', action: 'loans' },
      { label: 'Record payment', icon: 'ri-bank-card-line', action: 'recordPayment' },
      { sep: true },
      { label: 'Deactivate customer', icon: 'ri-forbid-line', action: 'deactivate', danger: true },
    ],
    documentRequest: [
      { label: 'Open request', icon: 'ri-eye-line', action: 'view' },
      { label: 'Open review', icon: 'ri-shield-check-line', action: 'review' },
      { sep: true },
      { section: 'Follow-up' },
      { label: 'Send reminder', icon: 'ri-mail-send-line', action: 'reminder' },
      { label: 'Open conversation', icon: 'ri-message-3-line', action: 'message' },
      { label: 'Upload on behalf', icon: 'ri-upload-2-line', action: 'upload' },
      { sep: true },
      { section: 'Manage' },
      { label: 'Reassign', icon: 'ri-user-shared-line', action: 'reassign' },
      { label: 'Extend due date', icon: 'ri-calendar-event-line', action: 'extend' },
      { label: 'Mark complete', icon: 'ri-checkbox-circle-line', action: 'complete' },
      { sep: true },
      { label: 'Cancel request', icon: 'ri-close-circle-line', action: 'cancel', danger: true },
    ],
  };

  // ----- DOM helpers -----
  function ensureGlobals() {
    if (document.getElementById('ramToast')) return;
    const t = document.createElement('div');
    t.className = 'ram-toast';
    t.id = 'ramToast';
    t.innerHTML = '<i class="ri-checkbox-circle-fill"></i><span id="ramToastMsg">Done</span>';
    document.body.appendChild(t);

    const m = document.createElement('div');
    m.className = 'ram-modal-back';
    m.id = 'ramModal';
    m.innerHTML = `
      <div class="ram-modal" role="dialog" aria-modal="true">
        <div class="head">
          <span class="icon-bg"><i class="ri-lock-password-line"></i></span>
          <div>
            <h3 id="ramModalTitle">Reset password</h3>
            <div class="sub" id="ramModalSub">Send <strong id="ramModalName">this user</strong> a password-reset email. Their current password stops working immediately.</div>
          </div>
        </div>
        <div class="body">
          <label><input type="checkbox" id="ramModalSignout" checked /> Force sign-out from all sessions</label>
          <label><input type="checkbox" id="ramModalNotify" checked /> Notify them by email</label>
        </div>
        <div class="foot">
          <button class="btn btn-secondary btn-sm" type="button" id="ramModalCancel">Cancel</button>
          <button class="btn btn-primary btn-sm" type="button" id="ramModalConfirm"><i class="ri-mail-send-line"></i> Send reset email</button>
        </div>
      </div>
    `;
    document.body.appendChild(m);

    m.addEventListener('click', e => { if (e.target === m) closeModal(); });
    m.querySelector('#ramModalCancel').addEventListener('click', closeModal);
    m.querySelector('#ramModalConfirm').addEventListener('click', () => {
      const name = m.querySelector('#ramModalName').textContent;
      closeModal();
      toast(`Password-reset email sent to ${name}`);
    });
  }

  function toast(msg, opts) {
    ensureGlobals();
    const t = document.getElementById('ramToast');
    document.getElementById('ramToastMsg').textContent = msg;
    t.classList.toggle('danger', !!(opts && opts.danger));
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 2200);
  }

  function openResetModal(name) {
    ensureGlobals();
    document.getElementById('ramModalName').textContent = name || 'this user';
    document.getElementById('ramModal').classList.add('open');
  }
  function closeModal() {
    document.getElementById('ramModal').classList.remove('open');
  }

  // ----- Menu rendering -----
  let openTrigger = null;
  let openMenu = null;

  function closeMenu() {
    if (openMenu) openMenu.remove();
    if (openTrigger) openTrigger.classList.remove('open');
    openMenu = null; openTrigger = null;
  }

  // Permissions: window.REAM_ROLE in {'super-admin','maintainer','admin','agent'} (default 'admin')
  function isSuper() {
    const r = (window.REAM_ROLE || 'admin').toLowerCase();
    return r === 'super-admin' || r === 'super' || r === 'maintainer' || r === 'ream-maintainer';
  }

  function renderMenu(role, ctx) {
    closeMenu();
    const rawItems = MENUS[role] || MENUS.customer;
    const customerActive = role === 'customer' && (ctx.status ? /active|on.?track|ahead|behind/i.test(ctx.status) : true);
    const items = rawItems.filter(it => {
      if (it.sep || it.section) return true;
      if (it.requiresSuper && !isSuper()) {
        // Edit info is only gated when customer is active
        if (it.action === 'edit' && it.requiresSuperWhenActive && !customerActive) return true;
        return false;
      }
      return true;
    });
    const menu = document.createElement('div');
    menu.className = 'row-actions-menu';
    menu.setAttribute('role', 'menu');
    items.forEach(it => {
      if (it.sep) {
        const s = document.createElement('div'); s.className = 'ram-sep';
        menu.appendChild(s);
        return;
      }
      if (it.section) {
        const s = document.createElement('div'); s.className = 'ram-section'; s.textContent = it.section;
        menu.appendChild(s);
        return;
      }
      const b = document.createElement('button');
      b.className = 'ram-item' + (it.danger ? ' danger' : '');
      b.type = 'button';
      b.innerHTML = `<i class="${it.icon}"></i><span>${it.label}</span>`;
      b.addEventListener('click', () => handleAction(it.action, role, ctx));
      menu.appendChild(b);
    });
    return menu;
  }

  function positionMenu(menu, anchor) {
    document.body.appendChild(menu);
    const r = anchor.getBoundingClientRect();
    const mh = menu.offsetHeight;
    const mw = menu.offsetWidth;
    let top = r.bottom + 4;
    let left = r.right - mw;
    if (top + mh > window.innerHeight - 8) top = r.top - mh - 4;
    if (left < 8) left = 8;
    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
  }

  function handleAction(action, role, ctx) {
    closeMenu();
    const name = ctx.name || 'this user';
    const id = ctx.id || '';
    const detailUrl = (ROLE_DETAIL[role] || ROLE_DETAIL.customer) + (id ? `&id=${encodeURIComponent(id)}` : '');

    switch (action) {
      case 'view':
        window.location.href = detailUrl;
        return;
      case 'edit':
        window.location.href = detailUrl + '#edit';
        return;
      case 'reset':
        openResetModal(name);
        return;
      case 'resend':
        toast(`Invite re-sent to ${name}`);
        return;
      case 'welcome':
        toast(`Welcome email re-sent to ${name}`);
        return;
      case 'changeType':
        toast(`Change-type sheet opened for ${name}`);
        return;
      case 'changeRole':
        toast(`Change-role sheet opened for ${name}`);
        return;
      case 'reassign':
        toast(`Reassignment workflow opened for ${name}`);
        return;
      case 'pause':
        toast(`${name}'s queue paused — no new work assigned`);
        return;
      case 'team':
        toast(`Direct reports for ${name} loaded`);
        return;
      case 'signout':
        toast(`${name} signed out from all sessions`);
        return;
      case 'twofa':
        toast(`2FA settings opened for ${name}`);
        return;
      case 'scope':
        toast(`Oversight scope opened for ${name}`);
        return;
      case 'owner':
        toast(`Ownership transfer review started`);
        return;
      case 'loans':
        window.location.href = detailUrl + '#loans';
        return;
      case 'message':
        toast(`Conversation opened with ${name}`);
        return;
      case 'recordPayment':
        toast(`Record-payment dialog opened for ${name}`);
        return;
      case 'review':
        window.location.href = detailUrl + '&tab=review';
        return;
      case 'reminder':
        toast(`Reminder sent to ${name}`);
        return;
      case 'upload':
        toast(`Upload-on-behalf opened for ${name}`);
        return;
      case 'extend':
        toast(`Pick a new due date for ${name}`);
        return;
      case 'complete':
        toast(`${name}'s request marked complete`);
        return;
      case 'cancel':
        toast(`${name}'s request cancelled`, { danger: true });
        return;
      case 'suspend':
      case 'revoke':
      case 'deactivate':
        toast(`${name} ${action === 'revoke' ? 'admin revoked' : action === 'deactivate' ? 'deactivated' : 'suspended'}`, { danger: true });
        return;
    }
  }

  // ----- Public mount -----
  function mount(opts) {
    ensureGlobals();
    const role = opts.role;
    const tableSel = opts.table;
    const tbody = typeof tableSel === 'string' ? document.querySelector(tableSel) : tableSel;
    if (!tbody) return;

    const getId = opts.getId || (tr => tr.dataset.id || tr.dataset.personId || (tr.rowIndex - 1).toString());
    const getName = opts.getName || (tr => {
      const nm = tr.querySelector('.nm');
      return nm ? nm.textContent.trim() : '';
    });

    const rows = tbody.querySelectorAll('tr');
    rows.forEach(tr => {
      const ctx = { id: getId(tr), name: getName(tr) };
      const detailUrl = (ROLE_DETAIL[role] || ROLE_DETAIL.customer) + (ctx.id ? `&id=${encodeURIComponent(ctx.id)}&name=${encodeURIComponent(ctx.name)}` : '');

      // Convert trailing cell with old <i class="ri-more-2-fill"> into a real trigger
      const trigger = tr.querySelector('.row-actions-trigger') || tr.querySelector('td:last-child i.ri-more-2-fill');
      let dotsCell = null;
      if (trigger && !trigger.classList.contains('row-actions-trigger')) {
        dotsCell = trigger.closest('td');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'row-actions-trigger';
        btn.setAttribute('aria-label', 'Row actions');
        btn.innerHTML = '<i class="ri-more-2-fill"></i>';
        trigger.replaceWith(btn);
      }
      const realTrigger = tr.querySelector('.row-actions-trigger');
      if (realTrigger) {
        if (!dotsCell) dotsCell = realTrigger.closest('td');
        if (dotsCell) {
          dotsCell.style.textAlign = 'right';
          dotsCell.addEventListener('click', e => e.stopPropagation());
        }
        realTrigger.addEventListener('click', e => {
          e.stopPropagation();
          if (openTrigger === realTrigger) { closeMenu(); return; }
          const menu = renderMenu(role, ctx);
          positionMenu(menu, realTrigger);
          realTrigger.classList.add('open');
          openMenu = menu;
          openTrigger = realTrigger;
        });
      }

      // Row click → detail (data-href on the <tr> overrides the role default)
      tr.addEventListener('click', e => {
        if (e.target.closest('input,button,a,.row-actions-trigger')) return;
        window.location.href = tr.dataset.href || detailUrl;
      });
    });

    // Outside click + escape close
    if (!mount._wired) {
      document.addEventListener('click', e => {
        if (openMenu && !e.target.closest('.row-actions-menu') && !e.target.closest('.row-actions-trigger')) closeMenu();
      });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
      window.addEventListener('resize', closeMenu);
      window.addEventListener('scroll', closeMenu, true);
      mount._wired = true;
    }
  }

  window.RowActions = { mount, toast };
})();
