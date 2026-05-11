// activity.js — render and filter the org-wide / per-entity event log.
// Two variations share state and source data:
//   A — Conservative timeline
//   B — Bold editorial pulse + cards

(function () {
  const events = window.AH_EVENTS || [];
  const PENDING = window.AH_PENDING_REVIEWS || [];
  const ME_ID = 'u_km';

  // ----- URL-driven scope (per-land / per-loan) ----------------
  function parseScope() {
    const qs = new URLSearchParams(location.search);
    const scope = qs.get('scope') || qs.get('kind');
    const id = qs.get('id');
    if (!scope || !id) return null;
    return { scope, id };
  }
  function filterByScope(list, sc) {
    if (!sc) return list;
    return list.filter(e => {
      if (e.target && e.target.id === sc.id) return true;
      if (sc.scope === 'loan') {
        if (e.target && e.target.loan === sc.id) return true;
        if (e.meta && e.meta.loanId === sc.id) return true;
        return false;
      }
      if (sc.scope === 'land') {
        if (e.target && e.target.kind === 'loan' && e.target.land === sc.id) return true;
        if (e.target && e.target.kind === 'document' && e.target.land === sc.id) return true;
        return false;
      }
      return false;
    });
  }
  const scope = parseScope();
  const sourceEvents = filterByScope(events, scope);

  // ----- Filter state ------------------------------------------
  const state = {
    actor: new Set(),
    action: new Set(),
    entity: new Set(),
    range: '30d',
    search: '',
    onlyMine: false,
    category: null, // bold-only: land | site | loan | payment | people | policy | system
    activeVar: 'A',
  };

  function rangeCutoff() {
    const now = new Date();
    if (state.range === '24h') return new Date(now - 24 * 3600e3);
    if (state.range === '7d')  return new Date(now - 7 * 86400e3);
    if (state.range === '30d') return new Date(now - 30 * 86400e3);
    if (state.range === '90d') return new Date(now - 90 * 86400e3);
    return null;
  }

  // Map an event to a "bold category" — broader buckets than entity.kind
  function categoryOf(e) {
    const k = e.target?.kind;
    if (k === 'land') return 'land';
    if (k === 'site') return 'site';
    if (k === 'loan') return 'loan';
    if (k === 'payment_review' || e.kind === 'payment' || e.kind === 'review') return 'payment';
    if (k === 'member' || k === 'assignment' || k === 'profile' || e.kind === 'auth') return 'people';
    if (k === 'policy' || k === 'integration') return 'policy';
    return 'system';
  }

  function getFiltered() {
    const cutoff = rangeCutoff();
    const q = state.search.trim().toLowerCase();
    return sourceEvents.filter(e => {
      if (cutoff && e.at < cutoff) return false;
      if (state.onlyMine && e.actor.id !== ME_ID) return false;
      if (state.actor.size && !state.actor.has(e.actor.id)) return false;
      if (state.action.size && !state.action.has(e.action)) return false;
      if (state.entity.size && !state.entity.has(e.target?.kind)) return false;
      if (state.category && categoryOf(e) !== state.category) return false;
      if (q) {
        const hay = [
          e.actor.name, e.actor.role, e.target?.label, e.target?.id,
          e.headline, (e.diff || []).map(d => `${d.key} ${d.from} ${d.to}`).join(' '),
          JSON.stringify(e.meta || {})
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  // ----- Helpers -----------------------------------------------
  const PAD = (n) => String(n).padStart(2, '0');
  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }
  function bold(headline) {
    return escapeHtml(headline).replace(/\*\*(.+?)\*\*/g, '<strong style="color: var(--color-grey-900); font-weight:600;">$1</strong>');
  }
  function fmtDate(d) {
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  }
  function fmtRel(d) {
    const days = Math.floor((Date.now() - d.getTime()) / 86400e3);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days/7)} weeks ago`;
    return `${Math.floor(days/30)} months ago`;
  }
  function fmtTime(d) { return `${PAD(d.getHours())}:${PAD(d.getMinutes())}`; }
  function fmtTime12(d) {
    let h = d.getHours();
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return { time: `${h}:${PAD(d.getMinutes())}`, ampm };
  }
  function dayKey(d) { return `${d.getFullYear()}-${PAD(d.getMonth()+1)}-${PAD(d.getDate())}`; }

  function targetLink(e) {
    if (!e.target) return '';
    if (e.target.href && e.target.href !== '#') {
      return `<a class="va-target" href="${e.target.href}">${escapeHtml(e.target.label)}</a>`;
    }
    return `<span class="va-target">${escapeHtml(e.target.label)}</span>`;
  }

  // ============================================================
  // VARIATION A — Conservative timeline
  // ============================================================
  function renderA_Stats(list) {
    document.getElementById('ahStatTotalA').textContent = list.length.toLocaleString();
    const people = list.filter(e => !e.actor.bot);
    const auto   = list.filter(e =>  e.actor.bot);
    const distinct = new Set(people.map(e => e.actor.id)).size;
    const sensitive = list.filter(e => e.sensitive).length;
    document.getElementById('ahStatPeopleA').textContent = people.length.toLocaleString();
    document.getElementById('ahStatPeopleNA').textContent = distinct;
    document.getElementById('ahStatAutoA').textContent = auto.length.toLocaleString();
    document.getElementById('ahStatRiskA').textContent = sensitive.toLocaleString();
    document.getElementById('ahStatTotalFootA').textContent = ({
      '24h':'last 24 hours','7d':'last 7 days','30d':'last 30 days','90d':'last 90 days','all':'all time'
    })[state.range];
  }

  function renderA_Event(e) {
    const isBot = !!e.actor.bot;
    const avatar = `<span class="va-avatar${isBot ? ' bot' : ''}" style="background:${e.actor.color}">${e.actor.initials}</span>`;
    const link = targetLink(e);
    let diffHtml = '';
    if (e.diff && e.diff.length) {
      diffHtml = `<div class="va-diff">${e.diff.map(d => {
        const fromEmpty = d.from == null, toEmpty = d.to == null;
        const fromVal = fromEmpty ? '∅ not set' : escapeHtml(String(d.from));
        const toVal   = toEmpty   ? '∅ removed' : escapeHtml(String(d.to));
        return `<div class="va-diff-row">
          <div class="va-diff-key">${escapeHtml(d.key)}</div>
          <div class="va-diff-from${fromEmpty ? ' empty' : ''}">${fromVal}</div>
          <div class="va-diff-arrow"><i class="ri-arrow-right-line"></i></div>
          <div class="va-diff-to${toEmpty ? ' empty' : ''}">${toVal}</div>
        </div>`;
      }).join('')}</div>`;
    }
    const metaBits = [];
    if (isBot)        metaBits.push(`<span class="auto-tag"><i class="ri-robot-line"></i> Automated</span>`);
    if (e.sensitive)  metaBits.push(`<span class="auto-tag" style="background:var(--color-warning-50); color:var(--color-warning-700);"><i class="ri-shield-flash-line"></i> Sensitive</span>`);
    if (e.pending)    metaBits.push(`<span class="auto-tag" style="background:var(--color-warning-100); color:var(--color-warning-700);"><i class="ri-time-line"></i> Awaiting approval</span>`);
    if (e.meta?.method) metaBits.push(`<span><i class="ri-bank-card-line"></i> ${escapeHtml(e.meta.method)}</span>`);
    if (e.meta?.txn)    metaBits.push(`<span><i class="ri-hashtag"></i> ${escapeHtml(e.meta.txn)}</span>`);

    return `<div class="va-event" data-kind="${escapeHtml(e.kind)}" tabindex="0" onclick="ahOpenDrawer('${e.id}')" onkeydown="if(event.key==='Enter'){ahOpenDrawer('${e.id}');}">
      <div class="va-icon"><i class="${escapeHtml(e.icon || 'ri-pulse-line')}"></i></div>
      <div class="va-event-body">
        <div class="va-event-headline">
          ${avatar}<span class="va-actor">${escapeHtml(e.actor.name)}</span>
          <span style="color: var(--fg3);"> — </span>
          ${bold(e.headline.replace(`**${e.target?.label || ''}**`, '___T___')).replace('___T___', link)}
        </div>
        ${diffHtml}
        ${metaBits.length ? `<div class="va-event-meta">${metaBits.join('')}</div>` : ''}
      </div>
      <div class="va-event-side">
        <div class="va-time">${fmtTime(e.at)}</div>
        <div class="va-id">${escapeHtml(e.id)}</div>
      </div>
    </div>`;
  }

  function renderA_Timeline(list) {
    const root = document.getElementById('ahListA');
    if (!list.length) {
      root.innerHTML = `<div class="va-empty">
        <i class="ri-history-line"></i>
        <div class="h">No events match these filters</div>
        <div>Try widening the date range or clearing actor / action filters.</div>
      </div>`;
      return;
    }
    const groups = [];
    let current = null;
    list.forEach(e => {
      const k = dayKey(e.at);
      if (!current || current.key !== k) { current = { key:k, date:e.at, items:[] }; groups.push(current); }
      current.items.push(e);
    });
    root.innerHTML = groups.map(g => `<div class="va-day">
      <div class="va-day-label">
        <div class="date">${fmtDate(g.date)}</div>
        <div class="rel">${fmtRel(g.date)}</div>
        <div class="count">${g.items.length} event${g.items.length === 1 ? '' : 's'}</div>
      </div>
      <div class="va-events">${g.items.map(renderA_Event).join('')}</div>
    </div>`).join('');
  }

  // ----- Filter popovers (variation A) -------------------------
  function buildPopoverChecklist(items, selectedSet) {
    return items.map(({ value, label, count }) =>
      `<label>
        <input type="checkbox" value="${escapeHtml(value)}" ${selectedSet.has(value) ? 'checked' : ''} />
        <span style="flex:1;">${escapeHtml(label)}</span>
        <span style="color:var(--fg3); font-size:11px;">${count}</span>
      </label>`).join('');
  }
  function actorOptions() {
    const m = new Map();
    sourceEvents.forEach(e => {
      const a = e.actor;
      if (!m.has(a.id)) m.set(a.id, { value: a.id, label: a.name + (a.bot ? ' · auto' : ''), count: 0 });
      m.get(a.id).count += 1;
    });
    return [...m.values()].sort((a,b) => b.count - a.count);
  }
  function actionOptions() {
    const labels = { created:'Created', updated:'Updated', deleted:'Deleted', approved:'Approved', declined:'Declined', assigned:'Assigned' };
    const m = new Map();
    sourceEvents.forEach(e => {
      if (!m.has(e.action)) m.set(e.action, { value: e.action, label: labels[e.action] || e.action, count: 0 });
      m.get(e.action).count += 1;
    });
    return [...m.values()].sort((a,b) => b.count - a.count);
  }
  function entityOptions() {
    const labels = {
      loan:'Loans', land:'Lands', site:'Sites', payment_review:'Payment reviews',
      document:'Documents', policy:'Policies', member:'Members', assignment:'Assignments',
      integration:'Integrations', auth:'Sign-ins', profile:'Profiles',
    };
    const m = new Map();
    sourceEvents.forEach(e => {
      const k = e.target?.kind || 'other';
      if (!m.has(k)) m.set(k, { value: k, label: labels[k] || k, count: 0 });
      m.get(k).count += 1;
    });
    return [...m.values()].sort((a,b) => b.count - a.count);
  }
  function rangeOptions() {
    return [
      { value:'24h', label:'Last 24 hours' },
      { value:'7d',  label:'Last 7 days' },
      { value:'30d', label:'Last 30 days' },
      { value:'90d', label:'Last 90 days' },
      { value:'all', label:'All time' },
    ];
  }

  let openPop = null;
  window.ahTogglePop = function (id, kind, ev) {
    ev?.stopPropagation();
    if (openPop && openPop !== id) closePop();
    if (openPop === id) { closePop(); return; }
    openPop = id;
    const wrap = document.getElementById(id);
    let html = '';
    if (kind === 'actor') {
      html = `<div style="padding:6px 8px; color:var(--fg3); font-size:11px; text-transform:uppercase; letter-spacing:0.06em;">Actor</div>` +
             buildPopoverChecklist(actorOptions(), state.actor) +
             `<div class="pop-foot"><button class="btn btn-text btn-sm" type="button" onclick="ahClearFilter('actor')">Clear</button><button class="btn btn-secondary btn-sm" type="button" onclick="ahCloseFilter()">Done</button></div>`;
    } else if (kind === 'action') {
      html = `<div style="padding:6px 8px; color:var(--fg3); font-size:11px; text-transform:uppercase; letter-spacing:0.06em;">Action</div>` +
             buildPopoverChecklist(actionOptions(), state.action) +
             `<div class="pop-foot"><button class="btn btn-text btn-sm" type="button" onclick="ahClearFilter('action')">Clear</button><button class="btn btn-secondary btn-sm" type="button" onclick="ahCloseFilter()">Done</button></div>`;
    } else if (kind === 'entity') {
      html = `<div style="padding:6px 8px; color:var(--fg3); font-size:11px; text-transform:uppercase; letter-spacing:0.06em;">Entity</div>` +
             buildPopoverChecklist(entityOptions(), state.entity) +
             `<div class="pop-foot"><button class="btn btn-text btn-sm" type="button" onclick="ahClearFilter('entity')">Clear</button><button class="btn btn-secondary btn-sm" type="button" onclick="ahCloseFilter()">Done</button></div>`;
    } else if (kind === 'range') {
      html = `<div style="padding:6px 8px; color:var(--fg3); font-size:11px; text-transform:uppercase; letter-spacing:0.06em;">Date range</div>` +
             rangeOptions().map(r =>
               `<label><input type="radio" name="ah-range" value="${r.value}" ${state.range === r.value ? 'checked' : ''} /><span style="flex:1;">${r.label}</span></label>`
             ).join('');
    }
    const pop = document.createElement('div');
    pop.className = 'ah-popover';
    pop.innerHTML = html;
    wrap.appendChild(pop);
    pop.addEventListener('click', e => e.stopPropagation());
    pop.addEventListener('change', e => {
      const t = e.target;
      if (t.matches('input[type="checkbox"]')) {
        const set = kind === 'actor' ? state.actor : kind === 'action' ? state.action : state.entity;
        if (t.checked) set.add(t.value); else set.delete(t.value);
        run();
      } else if (t.matches('input[type="radio"][name="ah-range"]')) {
        state.range = t.value;
        run();
        closePop();
      }
    });
  };
  function closePop() {
    if (!openPop) return;
    document.getElementById(openPop)?.querySelector('.ah-popover')?.remove();
    openPop = null;
  }
  window.ahCloseFilter = closePop;
  window.ahClearFilter = function (which) {
    if (which === 'actor')  state.actor.clear();
    if (which === 'action') state.action.clear();
    if (which === 'entity') state.entity.clear();
    run();
    closePop();
  };
  document.addEventListener('click', closePop);

  function updateA_FilterUi() {
    function setCount(wrapId, set) {
      const wrap = document.getElementById(wrapId);
      if (!wrap) return;
      const c = wrap.querySelector('.count');
      if (set.size) { wrap.classList.add('has-value'); c.hidden = false; c.textContent = set.size; }
      else          { wrap.classList.remove('has-value'); c.hidden = true; }
    }
    setCount('ahFilterActorA',  state.actor);
    setCount('ahFilterActionA', state.action);
    setCount('ahFilterEntityA', state.entity);
    const rl = document.getElementById('ahRangeLabelA');
    if (rl) rl.textContent = ({'24h':'Last 24 hours','7d':'Last 7 days','30d':'Last 30 days','90d':'Last 90 days','all':'All time'})[state.range];
    const rWrap = document.getElementById('ahFilterRangeA');
    if (rWrap) {
      if (state.range !== '30d') rWrap.classList.add('has-value'); else rWrap.classList.remove('has-value');
    }

    // Chips
    const chipsRoot = document.getElementById('ahChipsA');
    if (!chipsRoot) return;
    const chips = [];
    state.actor.forEach(v => chips.push({ kind:'actor', value:v }));
    state.action.forEach(v => chips.push({ kind:'action', value:v }));
    state.entity.forEach(v => chips.push({ kind:'entity', value:v }));
    if (state.search) chips.push({ kind:'search', value: state.search });
    if (state.onlyMine) chips.push({ kind:'mine', value: 'me' });
    const labelFor = (kind, value) => {
      if (kind === 'actor') {
        const a = sourceEvents.find(e => e.actor.id === value)?.actor;
        return a ? a.name : value;
      }
      return value[0].toUpperCase() + value.slice(1);
    };
    if (chips.length) {
      chipsRoot.hidden = false;
      chipsRoot.innerHTML = chips.map(c => {
        const lbl = c.kind === 'search' ? `“${escapeHtml(c.value)}”`
                  : c.kind === 'mine'   ? 'Only my actions'
                  : `${c.kind}: ${escapeHtml(labelFor(c.kind, c.value))}`;
        return `<span class="va-chip">${lbl}<button onclick="ahRemoveChip('${c.kind}', '${escapeHtml(String(c.value))}')" aria-label="Remove"><i class="ri-close-line"></i></button></span>`;
      }).join('') + `<button class="va-chip-clear" onclick="ahClearAll()">Clear all</button>`;
    } else {
      chipsRoot.hidden = true;
      chipsRoot.innerHTML = '';
    }
  }

  // ============================================================
  // VARIATION B — Bold
  // ============================================================
  // Pulse colours by kind
  const PULSE_COLORS = {
    created: '#22c55e', updated: '#a78bfa', deleted: '#ef4444',
    payment: 'rgba(255,255,255,0.45)', status: '#f97316',
    document: '#38bdf8', auth: 'rgba(255,255,255,0.45)',
    system: 'rgba(255,255,255,0.35)', assignment: '#c084fc',
    review: '#facc15',
  };

  function renderB_Hero(allList /* unfiltered, last 90d, etc. */) {
    // 24h count + delta
    const now = Date.now();
    const last24 = sourceEvents.filter(e => e.at >= new Date(now - 24*3600e3));
    const prev24 = sourceEvents.filter(e => e.at >= new Date(now - 48*3600e3) && e.at < new Date(now - 24*3600e3));
    document.getElementById('vbCount24').firstChild.textContent = last24.length;
    const delta = last24.length - prev24.length;
    const deltaEl = document.getElementById('vbCountDelta');
    deltaEl.textContent = (delta >= 0 ? '+' : '') + delta;
    deltaEl.style.color = delta >= 0 ? '#4ade80' : '#fda4af';
    deltaEl.style.background = delta >= 0 ? 'rgba(74, 222, 128, 0.15)' : 'rgba(253, 164, 175, 0.15)';
    document.getElementById('vbCount24Foot').textContent = `vs. previous 24h (${prev24.length})`;

    // people active today
    const peopleToday = new Set(last24.filter(e => !e.actor.bot).map(e => e.actor.id));
    document.getElementById('vbCountPeople').textContent = peopleToday.size;
    // automated jobs today
    document.getElementById('vbCountAuto').textContent = last24.filter(e => e.actor.bot).length;
    // pending reviews
    document.getElementById('vbCountPending').textContent = PENDING.length;
    document.getElementById('vbPendingCount').textContent = PENDING.length;
  }

  function renderB_Pulse() {
    // Take the most recent 60 events (newest right) as ticks.
    const recent = sourceEvents.slice(0, 60).reverse();
    const root = document.getElementById('vbPulse');
    if (!root) return;
    // Ticks scaled by recency: newer = taller. Time-bucketed approx.
    const max = recent.length;
    root.innerHTML = recent.map((e, i) => {
      const heightPct = 30 + (i / Math.max(max - 1, 1)) * 70; // 30%–100%
      const color = PULSE_COLORS[e.kind] || 'rgba(255,255,255,0.3)';
      const tip = `${e.actor.name} · ${e.action} ${e.target?.id || ''} · ${e.at.toLocaleString()}`;
      return `<div class="vb-pulse-tick" style="height:${heightPct}%; --tick-color:${color}" title="${escapeHtml(tip)}" onclick="ahOpenDrawer('${e.id}')"></div>`;
    }).join('');
  }

  function renderB_Categories() {
    const cats = [
      { id: 'land',    icon: 'ri-landscape-line',     name: 'Lands & plots' },
      { id: 'site',    icon: 'ri-map-2-line',         name: 'Sites' },
      { id: 'loan',    icon: 'ri-bank-line',          name: 'Loans' },
      { id: 'payment', icon: 'ri-bank-card-line',     name: 'Payments' },
      { id: 'people',  icon: 'ri-team-line',          name: 'People & roles' },
      { id: 'policy',  icon: 'ri-shield-check-line',  name: 'Policies & integrations' },
      { id: 'system',  icon: 'ri-cpu-line',           name: 'System' },
    ];
    const counts = {};
    sourceEvents.forEach(e => { const c = categoryOf(e); counts[c] = (counts[c] || 0) + 1; });
    const root = document.getElementById('vbCategories');
    if (!root) return;
    root.innerHTML = cats.map(c => {
      const n = counts[c.id] || 0;
      const active = state.category === c.id;
      return `<button class="vb-cat ${active ? 'active' : ''}" data-cat="${c.id}" type="button">
        <span class="vb-cat-icon"><i class="${c.icon}"></i></span>
        <span class="vb-cat-name">${c.name}</span>
        <span class="vb-cat-count">${n.toLocaleString()}</span>
        <span class="vb-cat-meta">${active ? 'showing' : 'click to filter'}</span>
      </button>`;
    }).join('');
    root.querySelectorAll('.vb-cat').forEach(b => {
      b.addEventListener('click', () => {
        const c = b.dataset.cat;
        state.category = state.category === c ? null : c;
        run();
      });
    });
  }

  function renderB_Actors() {
    const m = new Map();
    sourceEvents.forEach(e => {
      if (!m.has(e.actor.id)) m.set(e.actor.id, { ...e.actor, count: 0 });
      m.get(e.actor.id).count += 1;
    });
    const list = [...m.values()].sort((a,b) => b.count - a.count).slice(0, 12);
    const root = document.getElementById('vbActors');
    if (!root) return;
    root.innerHTML = list.map(a =>
      `<button class="vb-actor-pill ${state.actor.has(a.id) ? 'active' : ''}" type="button" data-actor="${a.id}">
        <span class="av" style="background:${a.color}">${a.initials}</span>
        ${escapeHtml(a.name.split(' ')[0])} <span style="color:var(--fg3); font-size:11px;">${a.count}</span>
      </button>`
    ).join('');
    root.querySelectorAll('.vb-actor-pill').forEach(p => {
      p.addEventListener('click', () => {
        const id = p.dataset.actor;
        if (state.actor.has(id)) state.actor.delete(id); else state.actor.add(id);
        run();
      });
    });
  }

  function renderB_Range() {
    const root = document.getElementById('vbRange');
    if (!root) return;
    root.querySelectorAll('button').forEach(b => {
      b.classList.toggle('active', b.dataset.r === state.range);
      b.onclick = () => { state.range = b.dataset.r; run(); };
    });
  }

  function renderB_Card(e) {
    const t = fmtTime12(e.at);
    const isBot = !!e.actor.bot;
    const link = targetLink(e);

    let diffPills = '';
    if (e.diff && e.diff.length) {
      const visible = e.diff.slice(0, 3);
      const more = e.diff.length - visible.length;
      diffPills = `<div class="vb-card-diff">${visible.map(d => {
        const fromVal = d.from == null ? '<em style="color:var(--fg3); font-style:italic;">not set</em>' : escapeHtml(String(d.from));
        const toVal   = d.to   == null ? '<em style="color:var(--fg3); font-style:italic;">removed</em>' : escapeHtml(String(d.to));
        return `<span class="vb-diff-pill">
          <span class="k">${escapeHtml(d.key)}</span>
          ${d.from != null ? `<span class="from">${fromVal}</span>` : ''}
          <i class="ri-arrow-right-line"></i>
          <span class="to">${toVal}</span>
        </span>`;
      }).join('')}${more > 0 ? `<span class="vb-diff-more">+${more} more change${more === 1 ? '' : 's'}</span>` : ''}</div>`;
    }

    const tags = [];
    tags.push(`<span class="actor"><span class="av" style="background:${e.actor.color}">${e.actor.initials}</span>${escapeHtml(e.actor.name)}</span>`);
    if (isBot)       tags.push(`<span class="auto-tag"><i class="ri-robot-line"></i> Auto</span>`);
    if (e.sensitive) tags.push(`<span class="auto-tag sensitive"><i class="ri-shield-flash-line"></i> Sensitive</span>`);
    if (e.meta?.method) tags.push(`<span><i class="ri-bank-card-line"></i> ${escapeHtml(e.meta.method)}</span>`);

    return `<div class="vb-card" data-kind="${escapeHtml(e.kind)}" data-pending="${e.pending ? 'true' : 'false'}" tabindex="0" onclick="ahOpenDrawer('${e.id}')" onkeydown="if(event.key==='Enter'){ahOpenDrawer('${e.id}');}">
      <div class="vb-card-rail">
        <div class="vb-card-time">${t.time}<span class="ampm">${t.ampm}</span></div>
        <div class="vb-card-icon"><i class="${escapeHtml(e.icon || 'ri-pulse-line')}"></i></div>
      </div>
      <div class="vb-card-body">
        <div class="vb-card-headline">
          ${bold(e.headline.replace(`**${e.target?.label || ''}**`, '___T___')).replace('___T___', link)}
        </div>
        ${diffPills}
        <div class="vb-card-meta">${tags.join('')}</div>
      </div>
      <div class="vb-card-side">
        ${e.pending ? `<span class="vb-pending-tag"><i class="ri-time-line"></i> Awaiting approval</span>` : ''}
        <span class="vb-card-id">${escapeHtml(e.id)}</span>
        <span class="vb-card-action"><i class="ri-arrow-right-line"></i> open</span>
      </div>
    </div>`;
  }

  function renderB_Stream(list) {
    const root = document.getElementById('vbStream');
    if (!root) return;
    if (!list.length) {
      root.innerHTML = `<div class="vb-empty">
        <i class="ri-history-line"></i>
        <div class="h">Nothing matches.</div>
        <div>Try clearing categories, actors, or widening the date range.</div>
      </div>`;
      return;
    }
    const groups = [];
    let current = null;
    list.forEach(e => {
      const k = dayKey(e.at);
      if (!current || current.key !== k) { current = { key:k, date:e.at, items:[] }; groups.push(current); }
      current.items.push(e);
    });
    root.innerHTML = groups.map(g => `
      <div class="vb-day-marker">
        <span class="date">${fmtDate(g.date)}</span>
        <span class="rel">${fmtRel(g.date)}</span>
        <span class="line"></span>
        <span class="count">${g.items.length} event${g.items.length === 1 ? '' : 's'}</span>
      </div>
      ${g.items.map(renderB_Card).join('')}
    `).join('');
  }

  // ============================================================
  // Drawer (shared)
  // ============================================================
  window.ahOpenDrawer = function (id) {
    const e = events.find(x => x.id === id);
    if (!e) return;
    const back = document.getElementById('ahDrawerBack');
    const drw  = document.getElementById('ahDrawer');
    document.getElementById('ahDrawerTitle').textContent = `Event ${e.id}`;
    document.getElementById('ahDrawerSub').textContent = `${e.at.toLocaleString()} · ${e.actor.name}`;

    const parts = [];
    parts.push(`<div class="ah-drawer-section">
      <h4>Summary</h4>
      <div class="ah-kv">
        <div class="k">Action</div><div class="v"><code>${escapeHtml(e.action)}</code></div>
        <div class="k">Kind</div><div class="v"><code>${escapeHtml(e.kind)}</code></div>
        <div class="k">Actor</div><div class="v">${escapeHtml(e.actor.name)} · ${escapeHtml(e.actor.role)}</div>
        <div class="k">Target</div><div class="v">${escapeHtml(e.target?.label || '—')}<br><code>${escapeHtml(e.target?.id || '')}</code></div>
        <div class="k">Timestamp</div><div class="v">${e.at.toISOString()}</div>
      </div>
    </div>`);
    if (e.diff && e.diff.length) {
      parts.push(`<div class="ah-drawer-section">
        <h4>Field changes (${e.diff.length})</h4>
        <div class="va-diff">${e.diff.map(d => {
          const fromEmpty = d.from == null, toEmpty = d.to == null;
          const fromVal = fromEmpty ? '∅ not set' : escapeHtml(String(d.from));
          const toVal   = toEmpty   ? '∅ removed' : escapeHtml(String(d.to));
          return `<div class="va-diff-row" style="grid-template-columns: 130px 1fr;">
            <div class="va-diff-key">${escapeHtml(d.key)}</div>
            <div>
              <span class="va-diff-from${fromEmpty ? ' empty' : ''}" style="display:inline-block; margin-right:6px;">${fromVal}</span>
              <i class="ri-arrow-right-line" style="color:var(--fg3); margin: 0 4px;"></i>
              <span class="va-diff-to${toEmpty ? ' empty' : ''}" style="display:inline-block;">${toVal}</span>
            </div>
          </div>`;
        }).join('')}</div>
      </div>`);
    }
    if (e.meta && Object.keys(e.meta).length) {
      parts.push(`<div class="ah-drawer-section">
        <h4>Request metadata</h4>
        <div class="ah-payload">${escapeHtml(JSON.stringify(e.meta, null, 2))}</div>
      </div>`);
    }
    parts.push(`<div class="ah-drawer-section">
      <h4>Audit</h4>
      <div class="ah-kv">
        <div class="k">Event ID</div><div class="v"><code>${escapeHtml(e.id)}</code></div>
        <div class="k">Sensitive</div><div class="v">${e.sensitive ? 'Yes — included in compliance export' : 'No'}</div>
        <div class="k">Retention</div><div class="v">7 years (append-only)</div>
      </div>
    </div>`);

    document.getElementById('ahDrawerBody').innerHTML = parts.join('');
    back.classList.add('open');
    drw.classList.add('open');
    drw.setAttribute('aria-hidden', 'false');
  };
  window.ahCloseDrawer = function () {
    document.getElementById('ahDrawerBack').classList.remove('open');
    const d = document.getElementById('ahDrawer');
    d.classList.remove('open');
    d.setAttribute('aria-hidden', 'true');
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') ahCloseDrawer(); });

  // ============================================================
  // Misc actions / chip removal
  // ============================================================
  window.ahRemoveChip = function (kind, value) {
    if (kind === 'actor')  state.actor.delete(value);
    if (kind === 'action') state.action.delete(value);
    if (kind === 'entity') state.entity.delete(value);
    if (kind === 'search') {
      state.search = '';
      const a = document.getElementById('ahSearchA'); if (a) a.value = '';
      const b = document.getElementById('ahSearchB'); if (b) b.value = '';
    }
    if (kind === 'mine') {
      state.onlyMine = false;
      document.getElementById('ahScopeAllA')?.classList.add('active');
      document.getElementById('ahScopeMineA')?.classList.remove('active');
    }
    run();
  };
  window.ahClearAll = function () {
    state.actor.clear(); state.action.clear(); state.entity.clear();
    state.search = ''; state.range = '30d'; state.onlyMine = false; state.category = null;
    ['ahSearchA','ahSearchB'].forEach(i => { const el = document.getElementById(i); if (el) el.value = ''; });
    document.getElementById('ahScopeAllA')?.classList.add('active');
    document.getElementById('ahScopeMineA')?.classList.remove('active');
    run();
  };
  window.ahApplyFilters = function (which) {
    if (which === 'A') state.search = document.getElementById('ahSearchA').value;
    if (which === 'B') state.search = document.getElementById('ahSearchB').value;
    run();
  };

  // Scope tabs (variation A only)
  document.getElementById('ahScopeAllA')?.addEventListener('click', () => {
    state.onlyMine = false;
    document.getElementById('ahScopeAllA').classList.add('active');
    document.getElementById('ahScopeMineA').classList.remove('active');
    run();
  });
  document.getElementById('ahScopeMineA')?.addEventListener('click', () => {
    state.onlyMine = true;
    document.getElementById('ahScopeMineA').classList.add('active');
    document.getElementById('ahScopeAllA').classList.remove('active');
    run();
  });

  // Variation switcher
  function setVariation(v) {
    state.activeVar = v;
    try { localStorage.setItem('ream_activity_var', v); } catch(_) {}
    document.querySelectorAll('.var-switch button').forEach(b => {
      b.classList.toggle('active', b.dataset.var === v);
    });
    document.querySelectorAll('.variation').forEach(el => {
      el.classList.toggle('active', el.dataset.variation === v);
    });
  }
  document.querySelectorAll('.var-switch button').forEach(b => {
    b.addEventListener('click', () => setVariation(b.dataset.var));
  });
  try {
    const saved = localStorage.getItem('ream_activity_var');
    if (saved === 'A' || saved === 'B') setVariation(saved);
  } catch(_) {}

  window.ahExport = function () {
    if (typeof toast === 'function') toast('CSV export queued — you’ll get an email when it’s ready');
  };

  // ============================================================
  // Run
  // ============================================================
  function run() {
    const list = getFiltered();
    // Variation A
    renderA_Stats(list);
    renderA_Timeline(list);
    updateA_FilterUi();
    // Variation B
    renderB_Hero();
    renderB_Pulse();
    renderB_Categories();
    renderB_Actors();
    renderB_Range();
    renderB_Stream(list);
  }

  run();
})();
