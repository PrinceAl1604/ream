/* ============================================================
   Ream · Person detail page
   Adapts to ?role=agent|manager|admin|customer&id=…&name=…
   ============================================================ */
(function () {
  const params = new URLSearchParams(location.search);
  const role = (params.get('role') || 'agent').toLowerCase();
  const id = params.get('id') || '';
  const overrideName = params.get('name') || '';

  // ---------- Sample dataset (per role) ----------
  const PEOPLE = {
    agent: {
      defaultId: 'JE',
      list: [
        { id: 'JE', initials: 'JE', name: 'Jordan Evans', email: 'agent.evans@example.com', phone: '+1 (512) 555-0182', region: 'Austin, TX', joined: 'Mar 14, 2025', type: 'SALES', status: 'Active', tint: 'var(--color-brand-700)' },
        { id: 'SK', initials: 'SK', name: 'Sarah Kim', email: 'agent.kim@example.com', phone: '+1 (713) 555-0144', region: 'Houston, TX', joined: 'Jan 02, 2025', type: 'FOLLOW_UP', status: 'Active', tint: 'var(--color-warning-600)' },
        { id: 'AD', initials: 'AD', name: 'Aïssa Diallo', email: 'agent.diallo@example.com', phone: '+1 (214) 555-0136', region: 'Dallas, TX', joined: 'Sep 22, 2024', type: 'FINANCE', status: 'Active', tint: 'var(--color-success-700)' },
      ],
    },
    manager: {
      defaultId: 'KB',
      list: [
        { id: 'KB', initials: 'KB', name: 'Kwame Boateng', email: 'manager.boateng@example.com', phone: '+1 (713) 555-0190', region: 'Houston, TX', joined: 'Aug 11, 2024', type: 'SALES', status: 'Active', tint: 'var(--color-brand-700)' },
        { id: 'AO', initials: 'AO', name: 'Akosua Osei', email: 'manager.osei@example.com', phone: '+1 (512) 555-0233', region: 'Austin, TX', joined: 'Jun 03, 2024', type: 'FOLLOW_UP', status: 'Active', tint: 'var(--color-warning-700)' },
        { id: 'NA', initials: 'NA', name: 'Nana Amoah', email: 'manager.amoah@example.com', phone: '+1 (214) 555-0298', region: 'Dallas, TX', joined: 'Apr 18, 2024', type: 'FINANCE', status: 'Active', tint: 'var(--color-success-700)' },
      ],
    },
    admin: {
      defaultId: 'PL',
      list: [
        { id: 'PL', initials: 'PL', name: 'Priya Lee', email: 'admin.lee@example.com', phone: '+1 (214) 555-0101', region: 'Dallas, TX', joined: 'Jan 02, 2024', types: ['SALES', 'FOLLOW_UP', 'FINANCE'], status: 'Active', tint: 'var(--color-brand-800)', role: 'Owner' },
        { id: 'RB', initials: 'RB', name: 'Robert Boateng', email: 'admin.boateng@example.com', phone: '+233 24 555 0177', region: 'Accra, GH', joined: 'May 10, 2024', types: ['FOLLOW_UP', 'FINANCE'], status: 'Active', tint: 'var(--color-grey-700)' },
        { id: 'JN', initials: 'JN', name: 'Jamila Nkrumah', email: 'admin.nkrumah@example.com', phone: '+233 24 555 0299', region: 'Tema, GH', joined: 'Jul 22, 2024', types: ['SALES', 'FOLLOW_UP', 'FINANCE'], status: 'Active', tint: 'var(--color-pink-700)' },
      ],
    },
    customer: {
      defaultId: 'LM',
      list: [
        { id: 'LM', initials: 'LM', name: 'Lina Martinez', email: 'lina.martinez@example.com', phone: '+1 (512) 555-0451', region: 'Austin, TX', joined: 'Feb 04, 2025', status: 'Active', tint: 'var(--color-brand-600)' },
        { id: 'NC', initials: 'NC', name: 'Nora Chen', email: 'nora.chen@example.com', phone: '+1 (206) 555-0612', region: 'Seattle, WA', joined: 'Aug 19, 2024', status: 'Active', tint: 'var(--color-blue-600)' },
        { id: 'EB', initials: 'EB', name: 'Emeka Boateng', email: 'emeka.b@example.com', phone: '+233 24 555 0410', region: 'Accra, GH', joined: 'Nov 30, 2024', status: 'Active', tint: 'var(--color-success-700)' },
      ],
    },
  };

  function findPerson() {
    const set = PEOPLE[role] || PEOPLE.agent;
    const fallback = set.list[0];
    if (id) {
      const f = set.list.find(p => p.id === id);
      if (f) return f;
      // Build a synthetic record from URL params (useful when id wasn't in our mock list)
      return Object.assign({}, fallback, {
        id, initials: (overrideName || fallback.name).split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase(),
        name: overrideName || fallback.name,
      });
    }
    return fallback;
  }

  const person = findPerson();

  // ---------- Role-specific config ----------
  const ROLE_CFG = {
    agent: {
      backUrl: 'agents.html',
      backLabel: 'Agents',
      tabs: [
        { id: 'overview', label: 'Overview', icon: 'ri-user-3-line' },
        { id: 'work', label: 'Pipeline', icon: 'ri-list-check-2', pill: '9' },
        { id: 'performance', label: 'Performance', icon: 'ri-line-chart-line' },
        { id: 'access', label: 'Access', icon: 'ri-shield-check-line' },
        { id: 'notes', label: 'Notes', icon: 'ri-sticky-note-line', pill: '2' },
      ],
      kpis: [
        { t: 'Open prospects', v: '9', d: 'avg 2.7 per agent', dc: 'muted' },
        { t: 'Conv. rate (30d)', v: '32%', d: '+4pt vs target', dc: 'up' },
        { t: 'Avg. response', v: '1.8h', d: '−18min vs SLA', dc: 'up' },
        { t: 'Last active', v: '12m', d: 'Online now', dc: 'up' },
      ],
      primaryTitle: 'Assignment',
    },
    manager: {
      backUrl: 'managers.html',
      backLabel: 'Managers',
      tabs: [
        { id: 'overview', label: 'Overview', icon: 'ri-user-3-line' },
        { id: 'work', label: 'Direct reports', icon: 'ri-team-line', pill: '4' },
        { id: 'performance', label: 'Team performance', icon: 'ri-line-chart-line' },
        { id: 'access', label: 'Access', icon: 'ri-shield-check-line' },
        { id: 'notes', label: 'Notes', icon: 'ri-sticky-note-line' },
      ],
      kpis: [
        { t: 'Direct reports', v: '4', d: '3 SALES · 1 FOLLOW_UP', dc: 'muted' },
        { t: 'Team conv. rate', v: '34%', d: '+6pt MoM', dc: 'up' },
        { t: 'SLA hit rate', v: '96%', d: '+2pt', dc: 'up' },
        { t: 'Pipeline', v: '38', d: 'avg 9.5 per agent', dc: 'muted' },
      ],
      primaryTitle: 'Vertical',
    },
    admin: {
      backUrl: 'admins.html',
      backLabel: 'Admins',
      tabs: [
        { id: 'overview', label: 'Overview', icon: 'ri-user-3-line' },
        { id: 'work', label: 'Approvals', icon: 'ri-checkbox-circle-line', pill: '7' },
        { id: 'performance', label: 'Activity', icon: 'ri-line-chart-line' },
        { id: 'access', label: 'Access', icon: 'ri-shield-check-line' },
        { id: 'notes', label: 'Notes', icon: 'ri-sticky-note-line' },
      ],
      kpis: [
        { t: 'Approvals (7d)', v: '22', d: '+11 vs last week', dc: 'up' },
        { t: 'Avg. approval', v: '18m', d: '−12m vs target', dc: 'up' },
        { t: 'Pending review', v: '7', d: '3 over SLA', dc: 'warn' },
        { t: 'Last active', v: '5m', d: 'Online now', dc: 'up' },
      ],
      primaryTitle: 'Oversight scope',
    },
    customer: {
      backUrl: 'customers.html',
      backLabel: 'Customers',
      tabs: [
        { id: 'overview', label: 'Overview', icon: 'ri-user-3-line' },
        { id: 'work', label: 'Loans', icon: 'ri-bank-line', pill: '2' },
        { id: 'performance', label: 'Payment history', icon: 'ri-line-chart-line' },
        { id: 'access', label: 'Access', icon: 'ri-shield-check-line' },
        { id: 'notes', label: 'Notes', icon: 'ri-sticky-note-line' },
      ],
      kpis: [
        { t: 'Active loans', v: '2', d: '$148,400 outstanding', dc: 'muted' },
        { t: 'Next payment', v: 'Jun 25', d: '$1,243.18 auto-debit', dc: 'muted' },
        { t: 'On-time rate', v: '100%', d: '24 / 24 installments', dc: 'up' },
        { t: 'Joined', v: 'Feb 2025', d: '4 months', dc: 'muted' },
      ],
      primaryTitle: 'Account summary',
    },
  };

  const cfg = ROLE_CFG[role] || ROLE_CFG.agent;

  // ---------- Type-specific overrides (SALES / FOLLOW_UP / FINANCE) ----------
  // For agents and managers, the work tab, KPIs, primary card and timeline change
  // based on the person.type to mirror best-practice splits in real-estate sales,
  // collections / follow-up, and finance / payments verification.
  const TYPE_CFG = {
    agent: {
      SALES: {
        primaryTitle: 'Sales territory',
        workLabel: 'Pipeline',
        workTitle: 'Open prospects',
        kpis: [
          { t: 'Hot leads', v: '4', d: '≥80 score', dc: 'up' },
          { t: 'Conv. rate (30d)', v: '32%', d: '+4pt vs target', dc: 'up' },
          { t: 'Pipeline value', v: '$612k', d: '9 prospects · avg $68k', dc: 'muted' },
          { t: 'Tours booked', v: '6', d: 'this week', dc: 'muted' },
        ],
      },
      FOLLOW_UP: {
        primaryTitle: 'Recovery queue',
        workLabel: 'Past-due',
        workTitle: 'Accounts past-due',
        kpis: [
          { t: 'Past-due loans', v: '14', d: '$23,418 owed', dc: 'warn' },
          { t: 'Promises kept', v: '78%', d: '+6pt MoM', dc: 'up' },
          { t: 'Calls today', v: '22 / 28', d: '4 unreached', dc: 'muted' },
          { t: 'Recovered (30d)', v: '$48,210', d: '+$12k vs target', dc: 'up' },
        ],
      },
      FINANCE: {
        primaryTitle: 'Verification queue',
        workLabel: 'Verifications',
        workTitle: 'Pending payment proofs',
        kpis: [
          { t: 'Pending proofs', v: '11', d: '3 over SLA', dc: 'warn' },
          { t: 'Verified today', v: '38', d: '$96,420 cleared', dc: 'up' },
          { t: 'Auto-debit fails', v: '2', d: 'last 24h', dc: 'warn' },
          { t: 'Reconciled', v: '99.4%', d: '$240 unmatched', dc: 'up' },
        ],
      },
    },
    manager: {
      SALES: {
        primaryTitle: 'Sales vertical',
        workLabel: 'Direct reports',
        workTitle: 'Sales agents on your team',
        kpis: [
          { t: 'Direct reports', v: '4', d: 'all SALES', dc: 'muted' },
          { t: 'Team conv. rate', v: '34%', d: '+6pt MoM', dc: 'up' },
          { t: 'Pipeline value', v: '$2.4M', d: '38 prospects', dc: 'muted' },
          { t: 'Closed (Q2)', v: '88', d: '73% of quota', dc: 'muted' },
        ],
      },
      FOLLOW_UP: {
        primaryTitle: 'Collections vertical',
        workLabel: 'Direct reports',
        workTitle: 'Follow-up agents on your team',
        kpis: [
          { t: 'Direct reports', v: '4', d: 'all FOLLOW-UP', dc: 'muted' },
          { t: 'Recovery rate', v: '82%', d: '+5pt MoM', dc: 'up' },
          { t: 'DPD ≥ 30', v: '36', d: '$112,400 exposure', dc: 'warn' },
          { t: 'Promise-keep', v: '78%', d: 'team avg', dc: 'up' },
        ],
      },
      FINANCE: {
        primaryTitle: 'Finance vertical',
        workLabel: 'Direct reports',
        workTitle: 'Finance agents on your team',
        kpis: [
          { t: 'Direct reports', v: '4', d: 'all FINANCE', dc: 'muted' },
          { t: 'Verified (7d)', v: '624', d: '$1.42M cleared', dc: 'up' },
          { t: 'Open exceptions', v: '7', d: '2 over SLA', dc: 'warn' },
          { t: 'Day-close', v: 'On time', d: 'last 14 days', dc: 'up' },
        ],
      },
    },
  };

  // Apply type override if available
  const typeOverride = (TYPE_CFG[role] && person.type) ? TYPE_CFG[role][person.type] : null;
  if (typeOverride) {
    if (typeOverride.kpis) cfg.kpis = typeOverride.kpis;
    if (typeOverride.primaryTitle) cfg.primaryTitle = typeOverride.primaryTitle;
    if (typeOverride.workLabel && cfg.tabs[1]) cfg.tabs[1].label = typeOverride.workLabel;
  }

  // ---------- Type chip helper ----------
  const TYPE_CHIPS = {
    SALES: '<span class="type-chip t-sales"><i class="ri-megaphone-line"></i> Sales</span>',
    FOLLOW_UP: '<span class="type-chip t-followup"><i class="ri-phone-line"></i> Follow-up</span>',
    FINANCE: '<span class="type-chip t-finance"><i class="ri-bank-card-line"></i> Finance</span>',
  };

  // ---------- Render hero & meta ----------
  document.getElementById('urlRole').textContent = role + (person.id ? '/' + person.id : '');
  document.getElementById('bcList').textContent = cfg.backLabel;
  document.getElementById('bcList').href = cfg.backUrl;
  document.getElementById('bcName').textContent = person.name;
  document.title = `Ream — ${person.name}`;

  // Sidebar active item
  const activeNav = { agent: 'navAgents', manager: 'navManagers', admin: 'navAdmins', customer: 'navCustomers' }[role];
  const navEl = document.getElementById(activeNav);
  if (navEl) navEl.classList.add('active');

  // Hero
  const ava = document.getElementById('prsAva');
  ava.textContent = person.initials;
  ava.style.background = person.tint || 'var(--color-brand-700)';
  document.getElementById('prsName').textContent = person.name;

  const subBits = [];
  if (role === 'agent') subBits.push(person.type ? person.type.replace('_', '-').toLowerCase() + ' agent' : 'agent');
  else if (role === 'manager') subBits.push(person.type ? person.type.replace('_', '-').toLowerCase() + ' manager' : 'manager');
  else if (role === 'admin') subBits.push(person.role || 'Admin');
  else if (role === 'customer') subBits.push('Customer');
  if (person.region) subBits.push(person.region);
  if (person.joined) subBits.push('Joined ' + person.joined);
  document.getElementById('prsSub').textContent = subBits.join(' · ');

  // Status pill
  const statusEl = document.getElementById('prsStatus');
  if ((person.status || 'Active').toLowerCase() === 'active') {
    statusEl.innerHTML = '<i class="ri-checkbox-blink-circle-fill"></i> Active';
  } else if (person.status === 'Invited') {
    statusEl.classList.add('invited');
    statusEl.innerHTML = '<i class="ri-mail-line"></i> Invited';
  } else {
    statusEl.classList.add('suspended');
    statusEl.innerHTML = '<i class="ri-forbid-line"></i> ' + person.status;
  }

  // Type chips
  const chipsEl = document.getElementById('prsChips');
  if (role === 'admin' && Array.isArray(person.types)) {
    chipsEl.innerHTML = person.types.map(t => TYPE_CHIPS[t] || '').join('');
  } else if (person.type && TYPE_CHIPS[person.type]) {
    chipsEl.innerHTML = TYPE_CHIPS[person.type];
  } else {
    chipsEl.innerHTML = '';
  }

  // Contact
  document.getElementById('cEmail').textContent = person.email || '—';
  document.getElementById('cPhone').textContent = person.phone || '—';
  document.getElementById('cRegion').textContent = person.region || '—';
  document.getElementById('cJoined').textContent = person.joined || '—';

  // Primary card
  document.getElementById('primaryCardTitle').textContent = cfg.primaryTitle;
  const primary = document.getElementById('primaryCardBody');
  if (role === 'agent' && person.type === 'FOLLOW_UP') {
    primary.innerHTML = `
      <dl class="prs-dl">
        <div><dt>Type</dt><dd>${TYPE_CHIPS[person.type]}</dd></div>
        <div><dt>Manager</dt><dd>Akosua Osei</dd></div>
        <div><dt>Active queue</dt><dd><strong>14</strong> past-due · $23,418</dd></div>
        <div><dt>DPD mix</dt><dd>8 · 1–14d &nbsp; 4 · 15–30d &nbsp; 2 · 30+d</dd></div>
      </dl>
      <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn btn-secondary btn-sm" id="agQueue"><i class="ri-list-check-2"></i> Open call queue</button>
        <button class="btn btn-secondary btn-sm" id="agScript"><i class="ri-file-text-line"></i> Today's script</button>
      </div>`;
  } else if (role === 'agent' && person.type === 'FINANCE') {
    primary.innerHTML = `
      <dl class="prs-dl">
        <div><dt>Type</dt><dd>${TYPE_CHIPS[person.type]}</dd></div>
        <div><dt>Manager</dt><dd>Nana Amoah</dd></div>
        <div><dt>Verifications</dt><dd><strong>11</strong> pending · 3 over SLA</dd></div>
        <div><dt>Channels</dt><dd>Bank · Mobile money · Cash</dd></div>
      </dl>
      <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn btn-secondary btn-sm" id="agLedger"><i class="ri-file-list-3-line"></i> Open ledger</button>
        <button class="btn btn-secondary btn-sm" id="agRecon"><i class="ri-equalizer-line"></i> Reconcile</button>
      </div>`;
  } else if (role === 'agent') {
    primary.innerHTML = `
      <dl class="prs-dl">
        <div><dt>Type</dt><dd>${TYPE_CHIPS[person.type] || '—'}</dd></div>
        <div><dt>Manager</dt><dd>Kwame Boateng</dd></div>
        <div><dt>Open work</dt><dd><strong>9</strong> prospects · $612k pipeline</dd></div>
        <div><dt>Quota (Q2)</dt><dd>22 / 30 closed</dd></div>
      </dl>
      <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn btn-secondary btn-sm" id="agReassign"><i class="ri-arrow-left-right-line"></i> Reassign work</button>
        <button class="btn btn-secondary btn-sm" id="agPause"><i class="ri-pause-circle-line"></i> Pause assignments</button>
      </div>`;
  } else if (role === 'manager') {
    const verticalLabel = person.type === 'FOLLOW_UP' ? 'Collections' : person.type === 'FINANCE' ? 'Finance' : 'Sales';
    primary.innerHTML = `
      <dl class="prs-dl">
        <div><dt>Vertical</dt><dd>${TYPE_CHIPS[person.type] || '—'} ${verticalLabel}</dd></div>
        <div><dt>Reports</dt><dd><strong>4</strong> agents</dd></div>
        <div><dt>Reports to</dt><dd>${person.type === 'FINANCE' ? 'Priya Lee' : 'Robert Boateng'}</dd></div>
        <div><dt>Coverage</dt><dd>${person.region || 'Houston · Austin'}</dd></div>
      </dl>`;
  } else if (role === 'admin') {
    primary.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:8px;">
        <div style="font: 12px var(--font-sans); color: var(--fg3);">Approves and configures work across these tracks:</div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          ${(person.types || []).map(t => TYPE_CHIPS[t]).join('')}
        </div>
        <dl class="prs-dl" style="margin-top:8px;">
          <div><dt>Owner</dt><dd>${person.role === 'Owner' ? '<span class="prs-pill ok">Yes</span>' : 'No'}</dd></div>
          <div><dt>Approvals (7d)</dt><dd><strong>22</strong></dd></div>
        </dl>
      </div>`;
  } else if (role === 'customer') {
    primary.innerHTML = `
      <dl class="prs-dl">
        <div><dt>Active loans</dt><dd><strong>2</strong> · $148,400 outstanding</dd></div>
        <div><dt>Auto-debit</dt><dd><span class="prs-pill ok">Enabled</span> Chase ••0118</dd></div>
        <div><dt>On-time rate</dt><dd>100% (24 / 24)</dd></div>
        <div><dt>Risk score</dt><dd><span class="prs-pill ok">Low · A2</span></dd></div>
      </dl>
      <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn btn-secondary btn-sm" onclick="window.location.href='loan-detail-customer.html'"><i class="ri-bank-line"></i> Open loan</button>
        <button class="btn btn-secondary btn-sm" id="cuRecord"><i class="ri-bank-card-line"></i> Record payment</button>
      </div>`;
  }

  // KPIs
  const kpisEl = document.getElementById('prsKpis');
  kpisEl.innerHTML = cfg.kpis.map(k => `
    <div class="card">
      <div class="card-title">${k.t}</div>
      <div class="card-value">${k.v}</div>
      <div class="delta ${k.dc || 'muted'}">${k.d}</div>
    </div>`).join('');

  // Tabs
  const tabsEl = document.getElementById('prsTabs');
  tabsEl.innerHTML = cfg.tabs.map((t, i) => `
    <button class="prs-tab${i === 0 ? ' on' : ''}" data-tab="${t.id}">
      <i class="${t.icon}"></i><span>${t.label}</span>${t.pill ? `<span class="pill">${t.pill}</span>` : ''}
    </button>`).join('');
  tabsEl.querySelectorAll('.prs-tab').forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });

  function activateTab(name) {
    tabsEl.querySelectorAll('.prs-tab').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
    document.querySelectorAll('.prs-panel').forEach(p => { p.hidden = p.dataset.panel !== name; });
  }

  // Hash → activate matching tab (e.g. #loans, #edit)
  if (location.hash === '#loans' && role === 'customer') activateTab('work');
  if (location.hash === '#edit') {
    setTimeout(() => RowActions.toast('Edit info opened — fields are inline'), 300);
  }

  // ---------- Work table per role ----------
  const workTitles = { agent: 'Open prospects', manager: 'Direct reports', admin: 'Pending approvals', customer: 'Loans' };
  document.getElementById('workTitle').textContent = (typeOverride && typeOverride.workTitle) || workTitles[role] || 'Open work';

  // Type-specific data overrides for agents and managers
  const TYPE_WORK = {
    agent: {
      SALES: {
        head: ['Prospect', 'Site', 'Stage', 'Score', 'Last touch', ''],
        rows: [
          ['Lina M.', 'Cedar Grove · L14', '<span class="prs-pill ok">Hot</span>', '88', '3 h ago', '<i class="ri-arrow-right-line"></i>'],
          ['Idris K.', 'Oak Ridge · L7', '<span class="prs-pill warn">Pricing</span>', '74', '2 d ago', '<i class="ri-arrow-right-line"></i>'],
          ['Nora C.', 'Birchwood · L22', '<span class="prs-pill">Discovery</span>', '52', '5 d ago', '<i class="ri-arrow-right-line"></i>'],
          ['Emeka B.', 'Cedar Grove · L18', '<span class="prs-pill warn">Pricing</span>', '69', '1 d ago', '<i class="ri-arrow-right-line"></i>'],
        ],
      },
      FOLLOW_UP: {
        head: ['Customer', 'Loan', 'DPD', 'Amount due', 'Last contact', 'Promise', ''],
        rows: [
          ['Daniel A.', 'LND-014-007', '<span class="prs-pill warn">14</span>', '$1,243.18', 'Yesterday · call', 'Pay Fri', '<i class="ri-arrow-right-line"></i>'],
          ['Mariam S.', 'LND-007-003', '<span class="prs-pill bad">42</span>', '$2,486.36', '3 d ago · SMS', '<span class="muted-12">broken</span>', '<i class="ri-arrow-right-line"></i>'],
          ['Kofi B.', 'LND-022-001', '<span class="prs-pill">3</span>', '$812.40', 'Today · call', 'Auto-debit Mon', '<i class="ri-arrow-right-line"></i>'],
          ['Helena R.', 'LND-014-012', '<span class="prs-pill bad">61</span>', '$3,729.54', '7 d ago · email', '—', '<i class="ri-arrow-right-line"></i>'],
        ],
      },
      FINANCE: {
        head: ['Reference', 'Customer', 'Channel', 'Amount', 'Submitted', 'Status', ''],
        rows: [
          ['PAY-9412', 'Lina M.', 'Bank transfer', '$1,243.18', '12 min ago', '<span class="prs-pill warn">Verify</span>', '<i class="ri-arrow-right-line"></i>'],
          ['PAY-9411', 'Idris K.', 'Mobile money', '$812.40', '38 min ago', '<span class="prs-pill warn">Verify</span>', '<i class="ri-arrow-right-line"></i>'],
          ['PAY-9408', 'Nora C.', 'Auto-debit', '$1,243.18', '2 h ago', '<span class="prs-pill bad">Failed</span>', '<i class="ri-arrow-right-line"></i>'],
          ['PAY-9405', 'Emeka B.', 'Cash', '$500.00', '4 h ago', '<span class="prs-pill ok">Cleared</span>', '<i class="ri-arrow-right-line"></i>'],
        ],
      },
    },
    manager: {
      SALES: {
        head: ['Agent', 'Pipeline', 'Hot', 'Conv.', 'Avg. resp.', 'Quota', ''],
        rows: [
          ['Jordan Evans', '$612k · 9', '4', '32%', '1.8h', '73%', '<i class="ri-arrow-right-line"></i>'],
          ['Marcus Owusu', '$488k · 7', '3', '29%', '2.1h', '64%', '<i class="ri-arrow-right-line"></i>'],
          ['Sara Ndong', '$842k · 11', '5', '34%', '1.5h', '88%', '<i class="ri-arrow-right-line"></i>'],
          ['Daniel Park', '$362k · 5', '1', '24%', '3.2h', '48%', '<i class="ri-arrow-right-line"></i>'],
        ],
      },
      FOLLOW_UP: {
        head: ['Agent', 'Past-due', 'DPD ≥ 30', 'Recovery (30d)', 'Promise-keep', 'Calls/day', ''],
        rows: [
          ['Sarah Kim', '14 · $23k', '4', '$48,210', '78%', '28', '<i class="ri-arrow-right-line"></i>'],
          ['Akua Mensah', '12 · $19k', '3', '$41,840', '74%', '24', '<i class="ri-arrow-right-line"></i>'],
          ['Tunde Bello', '18 · $34k', '7', '$56,120', '69%', '32', '<i class="ri-arrow-right-line"></i>'],
          ['Linda Park', '9 · $14k', '2', '$28,360', '84%', '22', '<i class="ri-arrow-right-line"></i>'],
        ],
      },
      FINANCE: {
        head: ['Agent', 'Verified (7d)', 'Open queue', 'Exceptions', 'Avg. SLA', 'Reconciled', ''],
        rows: [
          ['Aïssa Diallo', '156 · $384k', '11', '2', '12m', '99.6%', '<i class="ri-arrow-right-line"></i>'],
          ['Marcus Liu', '142 · $322k', '8', '1', '14m', '99.4%', '<i class="ri-arrow-right-line"></i>'],
          ['Naomi Owusu', '188 · $448k', '14', '3', '11m', '99.7%', '<i class="ri-arrow-right-line"></i>'],
          ['David Park', '138 · $268k', '9', '1', '16m', '99.2%', '<i class="ri-arrow-right-line"></i>'],
        ],
      },
    },
  };

  const workData = {
    agent: TYPE_WORK.agent[person.type] || TYPE_WORK.agent.SALES,
    manager: TYPE_WORK.manager[person.type] || TYPE_WORK.manager.SALES,
    admin: {
      head: ['Item', 'Type', 'Submitted by', 'Submitted', 'Amount', ''],
      rows: [
        ['Payment proof — LND-014', '<span class="prs-pill warn">Payment</span>', 'Lina M.', '2 h ago', '$1,243.18', '<i class="ri-arrow-right-line"></i>'],
        ['Hardship request — LND-022', '<span class="prs-pill warn">Hardship</span>', 'Idris K.', '5 h ago', '—', '<i class="ri-arrow-right-line"></i>'],
        ['Site terms change', '<span class="prs-pill">Config</span>', 'Kwame B.', '1 d ago', '—', '<i class="ri-arrow-right-line"></i>'],
      ],
    },
    customer: {
      head: ['Loan', 'Property', 'Outstanding', 'Next payment', 'Status', ''],
      rows: [
        ['LND-014-001', 'Cedar Grove · Lot 14', '$92,140', 'Jun 25 · $1,243.18', '<span class="prs-pill ok">On track</span>', '<i class="ri-arrow-right-line"></i>'],
        ['LND-007-002', 'Oak Ridge · Lot 7', '$56,260', 'Jun 28 · $812.40', '<span class="prs-pill ok">On track</span>', '<i class="ri-arrow-right-line"></i>'],
      ],
    },
  };

  const wd = workData[role];
  if (wd) {
    document.getElementById('workHead').innerHTML = '<tr>' + wd.head.map(h => `<th>${h}</th>`).join('') + '</tr>';
    document.getElementById('workBody').innerHTML = wd.rows.map(r =>
      '<tr class="row-link">' + r.map((c, i) => `<td>${i === 0 ? '<strong>' + c + '</strong>' : c}</td>`).join('') + '</tr>'
    ).join('');
  }

  // ---------- Recent activity timeline ----------
  const TL_BY_TYPE = {
    'agent.SALES': [
      { ic: 'ri-phone-line', cl: '', t: 'Called Lina M. about Cedar Grove pricing', w: '12 min ago' },
      { ic: 'ri-mail-send-line', cl: '', t: 'Sent follow-up email to Idris K.', w: '1 h ago' },
      { ic: 'ri-checkbox-circle-line', cl: 'green', t: 'Closed Nora C. — moved to onboarding', w: 'Yesterday' },
      { ic: 'ri-user-add-line', cl: '', t: 'Picked up new prospect Emeka B.', w: '2 d ago' },
    ],
    'agent.FOLLOW_UP': [
      { ic: 'ri-phone-line', cl: '', t: 'Called Daniel A. — promise to pay Friday', w: '8 min ago' },
      { ic: 'ri-message-3-line', cl: 'amber', t: 'Sent SMS reminder to Mariam S. (DPD 42)', w: '34 min ago' },
      { ic: 'ri-bank-card-line', cl: 'green', t: 'Recovered $1,243 from Helena R.', w: '2 h ago' },
      { ic: 'ri-error-warning-line', cl: 'red', t: 'Marked Mariam S.\u2019 promise as broken', w: 'Yesterday' },
    ],
    'agent.FINANCE': [
      { ic: 'ri-checkbox-circle-line', cl: 'green', t: 'Verified PAY-9405 ($500 cash) for Emeka B.', w: '6 min ago' },
      { ic: 'ri-close-circle-line', cl: 'red', t: 'Auto-debit failed for Nora C. · NSF', w: '38 min ago' },
      { ic: 'ri-equalizer-line', cl: '', t: 'Reconciled $96,420 — 1 unmatched ($240)', w: '2 h ago' },
      { ic: 'ri-file-list-3-line', cl: 'green', t: 'Posted day-close ledger', w: 'Yesterday' },
    ],
    'manager.SALES': [
      { ic: 'ri-team-line', cl: '', t: 'Approved Jordan Evans\u2019 pricing exception', w: '12 min ago' },
      { ic: 'ri-line-chart-line', cl: 'green', t: 'Team hit weekly target (+108%)', w: '1 h ago' },
      { ic: 'ri-user-star-line', cl: '', t: 'Coaching session with Marcus Owusu', w: 'Yesterday' },
    ],
    'manager.FOLLOW_UP': [
      { ic: 'ri-line-chart-line', cl: 'green', t: 'Team recovery rate hit 82% (+5pt)', w: '40 min ago' },
      { ic: 'ri-error-warning-line', cl: 'amber', t: 'Escalated 3 DPD ≥ 60 accounts to legal', w: '2 h ago' },
      { ic: 'ri-team-line', cl: '', t: 'Reviewed call-quality samples with Sarah K.', w: 'Yesterday' },
    ],
    'manager.FINANCE': [
      { ic: 'ri-checkbox-circle-line', cl: 'green', t: 'Day-close posted on time', w: '1 h ago' },
      { ic: 'ri-equalizer-line', cl: '', t: 'Cleared 2 of 7 finance exceptions', w: '3 h ago' },
      { ic: 'ri-file-list-3-line', cl: '', t: 'Audited 12 random verifications', w: 'Yesterday' },
    ],
  };
  const tlKey = `${role}.${person.type}`;
  const TL = {
    admin: [
      { ic: 'ri-checkbox-circle-line', cl: 'green', t: 'Approved payment proof for LND-014', w: '12 min ago' },
      { ic: 'ri-close-circle-line', cl: 'red', t: 'Declined hardship request for LND-008', w: '2 h ago' },
      { ic: 'ri-settings-3-line', cl: 'amber', t: 'Updated late-fee policy in Cedar Grove', w: 'Yesterday' },
      { ic: 'ri-shield-keyhole-line', cl: '', t: 'Added 2FA enforcement for managers', w: '3 d ago' },
    ],
    customer: [
      { ic: 'ri-bank-card-line', cl: 'green', t: 'Auto-debit cleared — $1,243.18', w: 'May 25' },
      { ic: 'ri-mail-send-line', cl: '', t: 'Statement email sent', w: 'May 26' },
      { ic: 'ri-message-3-line', cl: '', t: 'Asked about extra-payment options', w: 'May 30' },
      { ic: 'ri-bank-card-line', cl: 'green', t: 'Made extra payment — $500', w: 'Jun 02' },
    ],
  };
  const tlEntries = TL_BY_TYPE[tlKey] || TL[role] || [];
  document.getElementById('prsTl').innerHTML = tlEntries.map(e => `
    <li>
      <span class="ic ${e.cl}"><i class="${e.ic}"></i></span>
      <span class="txt">${e.t}</span>
      <span class="when">${e.w}</span>
    </li>`).join('');

  // ---------- Performance: sparkline + stats ----------
  const sparkVals = [4, 6, 5, 7, 9, 6, 8, 11, 10, 9, 12, 11];
  const max = Math.max(...sparkVals);
  document.getElementById('prsSpark').innerHTML = sparkVals.map((v, i) =>
    `<span class="bar" style="height:${(v / max * 100).toFixed(0)}%" data-w="W${i + 1}"></span>`
  ).join('');

  const STATS_BY_TYPE = {
    'agent.SALES': [
      { k: 'Closed (12w)', v: '88' }, { k: 'Conv. rate', v: '32%' }, { k: 'Pipeline value', v: '$612k' }, { k: 'Avg. deal size', v: '$68k' }, { k: 'Quota', v: '73%' },
    ],
    'agent.FOLLOW_UP': [
      { k: 'Recovered (12w)', v: '$184k' }, { k: 'Recovery rate', v: '82%' }, { k: 'Promise-keep', v: '78%' }, { k: 'Calls/day', v: '28' }, { k: 'Avg. days to cure', v: '4.2' },
    ],
    'agent.FINANCE': [
      { k: 'Verified (12w)', v: '4,128' }, { k: 'Avg. SLA', v: '12m' }, { k: 'Auto-clear rate', v: '88%' }, { k: 'Exceptions', v: '0.6%' }, { k: 'Reconciled', v: '99.6%' },
    ],
    'manager.SALES': [
      { k: 'Team closed (12w)', v: '312' }, { k: 'Team conv. rate', v: '34%' }, { k: 'Pipeline', v: '$2.4M' }, { k: 'Coaching sessions', v: '14' }, { k: 'Reports → promoted', v: '2' },
    ],
    'manager.FOLLOW_UP': [
      { k: 'Team recovery (12w)', v: '$684k' }, { k: 'DPD ≥ 30', v: '36' }, { k: 'Promise-keep', v: '78%' }, { k: 'Escalations to legal', v: '8' }, { k: 'Coaching sessions', v: '12' },
    ],
    'manager.FINANCE': [
      { k: 'Team verified (12w)', v: '15,820' }, { k: 'Avg. SLA', v: '13m' }, { k: 'Day-close on time', v: '14 / 14' }, { k: 'Open exceptions', v: '7' }, { k: 'Audit pass', v: '100%' },
    ],
  };
  const sKey = `${role}.${person.type}`;
  const STATS = {
    admin: [
      { k: 'Approvals (12w)', v: '264' }, { k: 'Avg. approval', v: '18m' }, { k: 'Auto-approved', v: '41%' }, { k: 'Declines', v: '12' }, { k: 'Policy edits', v: '6' },
    ],
    customer: [
      { k: 'Installments paid', v: '24' }, { k: 'On-time rate', v: '100%' }, { k: 'Extra payments (YTD)', v: '$1,500' }, { k: 'Avg. days early', v: '2.1' }, { k: 'Late fees', v: '$0' },
    ],
  };
  const statsEntries = STATS_BY_TYPE[sKey] || STATS[role] || [];
  document.getElementById('perfStats').innerHTML = statsEntries.map(s =>
    `<li><span class="k">${s.k}</span><span class="v">${s.v}</span></li>`
  ).join('');
  document.getElementById('perfStatsTitle').textContent =
    role === 'manager' ? 'Team stats' :
    role === 'admin' ? 'Admin stats' :
    role === 'customer' ? 'Payment stats' :
    person.type === 'FOLLOW_UP' ? 'Recovery stats' :
    person.type === 'FINANCE' ? 'Finance stats' : 'Sales stats';

  // ---------- Permissions ----------
  const PERMS = {
    agent: [
      { on: true, l: 'Read prospects in own region', s: 'Granted' },
      { on: true, l: 'Edit own pipeline', s: 'Granted' },
      { on: false, l: 'Approve payments', s: 'Admin only' },
      { on: false, l: 'Edit financing terms', s: 'Admin only' },
    ],
    manager: [
      { on: true, l: 'Read team pipeline', s: 'Granted' },
      { on: true, l: 'Reassign work within vertical', s: 'Granted' },
      { on: true, l: 'Approve pricing exceptions', s: 'Granted' },
      { on: false, l: 'Edit org-level settings', s: 'Admin only' },
    ],
    admin: [
      { on: true, l: 'Org-level read/write', s: 'Granted' },
      { on: true, l: 'Approve payments & hardship', s: 'Granted' },
      { on: true, l: 'Configure financing rules', s: 'Granted' },
      { on: true, l: 'Manage members & invites', s: 'Granted' },
      { on: person.role === 'Owner', l: 'Transfer ownership', s: person.role === 'Owner' ? 'Owner only' : 'Owner only' },
    ],
    customer: [
      { on: true, l: 'View own loans', s: 'Granted' },
      { on: true, l: 'Make payments', s: 'Granted' },
      { on: true, l: 'Submit hardship request', s: 'Granted' },
      { on: false, l: 'Edit account email', s: 'Verify required' },
    ],
  };
  document.getElementById('prsPerms').innerHTML = (PERMS[role] || []).map(p => `
    <li><span class="dot${p.on ? '' : ' off'}"></span><span>${p.l}</span><small>${p.s}</small></li>
  `).join('');

  // Audit log
  document.getElementById('auditTl').innerHTML = [
    { ic: 'ri-login-circle-line', cl: '', t: 'Signed in from Dallas, TX · MacBook', w: 'Today 8:42 am' },
    { ic: 'ri-edit-line', cl: '', t: 'Updated phone number', w: 'Yesterday' },
    { ic: 'ri-shield-keyhole-line', cl: 'green', t: '2FA enabled · Authenticator app', w: '3 d ago' },
    { ic: 'ri-mail-send-line', cl: '', t: 'Password reset email sent', w: '12 d ago' },
    { ic: 'ri-user-add-line', cl: '', t: 'Account created', w: person.joined || '—' },
  ].map(e => `<li><span class="ic ${e.cl}"><i class="${e.ic}"></i></span><span class="txt">${e.t}</span><span class="when">${e.w}</span></li>`).join('');

  // ---------- Notes ----------
  const initialNotes = [
    { by: 'Priya L.', when: 'May 12', text: 'Strong performer. Consider mentor role for new hires.' },
    { by: 'Kwame B.', when: 'Apr 28', text: 'Took ownership of Cedar Grove backlog — cleared 6 stale leads in a week.' },
  ];
  function renderNotes(notes) {
    document.getElementById('prsNotes').innerHTML = notes.map(n =>
      `<li><div class="by"><strong>${n.by}</strong> · ${n.when}</div><div>${n.text}</div></li>`
    ).join('');
  }
  let notes = initialNotes.slice();
  renderNotes(notes);
  document.getElementById('addNoteBtn').addEventListener('click', () => {
    const ta = document.getElementById('noteText');
    const v = ta.value.trim();
    if (!v) return;
    notes.unshift({ by: 'You', when: 'Just now', text: v });
    renderNotes(notes);
    ta.value = '';
    RowActions.toast('Note added');
  });

  // ---------- Hero buttons ----------
  document.getElementById('msgBtn').addEventListener('click', () => RowActions.toast(`Conversation opened with ${person.name}`));
  document.getElementById('resetPwdBtn').addEventListener('click', () => {
    // Reuse the row-actions reset modal
    document.getElementById('ramModalName') && (document.getElementById('ramModalName').textContent = person.name);
    document.getElementById('ramModal').classList.add('open');
  });
  // Pre-populate the modal name on first hover
  document.getElementById('resetPwdBtn').addEventListener('mouseenter', () => {
    if (document.getElementById('ramModalName'))
      document.getElementById('ramModalName').textContent = person.name;
  });
  document.getElementById('editBtn').addEventListener('click', enterEditMode);

  document.getElementById('prevBtn').addEventListener('click', () => navigatePerson(-1));
  document.getElementById('nextBtn').addEventListener('click', () => navigatePerson(1));
  document.getElementById('moreBtn').addEventListener('click', () => RowActions.toast('More actions menu — see the row-actions menu on the listing page'));

  // Forwarded buttons in primary card
  document.getElementById('agReassign')?.addEventListener('click', () => RowActions.toast(`Reassign workflow opened for ${person.name}`));
  document.getElementById('agPause')?.addEventListener('click', () => RowActions.toast(`${person.name}'s queue paused`));
  document.getElementById('cuRecord')?.addEventListener('click', () => RowActions.toast('Record-payment dialog opened'));
  document.getElementById('forceSignoutBtn')?.addEventListener('click', () => RowActions.toast(`${person.name} signed out from all sessions`));
  document.getElementById('manage2faBtn')?.addEventListener('click', () => RowActions.toast(`2FA settings opened for ${person.name}`));
  document.getElementById('editContactBtn')?.addEventListener('click', enterEditMode);
  document.getElementById('filterWorkBtn')?.addEventListener('click', () => RowActions.toast('Filter sheet opened'));
  document.getElementById('exportWorkBtn')?.addEventListener('click', () => RowActions.toast('CSV export started'));

  // Edit mode — make contact dl editable inline
  function enterEditMode() {
    const dl = document.getElementById('contactDl');
    const fields = [
      { id: 'cEmail', type: 'email' },
      { id: 'cPhone', type: 'tel' },
      { id: 'cRegion', type: 'text' },
    ];
    fields.forEach(f => {
      const dd = document.getElementById(f.id);
      if (!dd || dd.dataset.editing) return;
      const cur = dd.textContent;
      dd.innerHTML = `<input type="${f.type}" value="${cur.replace(/"/g, '&quot;')}" />`;
      dd.dataset.editing = '1';
      const inp = dd.querySelector('input');
      Object.assign(inp.style, {
        width: '100%', padding: '4px 8px',
        borderRadius: '6px', border: '1px solid var(--border-default)',
        font: '13px var(--font-sans)', color: 'var(--fg1)',
      });
    });
    const editBtn = document.getElementById('editBtn');
    editBtn.innerHTML = '<i class="ri-check-line"></i> Save changes';
    editBtn.onclick = saveEdit;
  }
  function saveEdit() {
    document.querySelectorAll('#contactDl dd[data-editing]').forEach(dd => {
      const v = dd.querySelector('input').value;
      dd.textContent = v;
      delete dd.dataset.editing;
    });
    const editBtn = document.getElementById('editBtn');
    editBtn.innerHTML = '<i class="ri-edit-line"></i> Edit info';
    editBtn.onclick = enterEditMode;
    RowActions.toast('Profile updated');
  }

  // Prev / Next within mock list
  function navigatePerson(dir) {
    const list = (PEOPLE[role] || PEOPLE.agent).list;
    const idx = list.findIndex(p => p.id === person.id);
    if (idx === -1) return;
    const next = list[(idx + dir + list.length) % list.length];
    location.search = `?role=${role}&id=${next.id}`;
  }
})();
