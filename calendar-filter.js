/* ============================================================
   Calendar filter — date dropdown with presets + month grid
   ------------------------------------------------------------
   Usage:
     const cal = ReamCalendar.attach({
       button: document.getElementById('actDateBtn'),
       initial: { kind: 'week' },          // preset key, or {kind:'date',date}, or {kind:'range',from,to}
       presets: [                            // optional override
         { key: 'today',     label: 'Today' },
         { key: 'yesterday', label: 'Yesterday' },
         { key: 'week',      label: 'This week' },
         { key: 'month',     label: 'This month' },
         { key: 'year',      label: 'This year' },
         { key: 'all',       label: 'Any time' }
       ],
       onChange: (state) => { ... }
     });

   State shape:
     { kind: 'today'|'yesterday'|'week'|'month'|'year'|'all'|'overdue'|'date'|'range',
       date?: Date, from?: Date, to?: Date, label: 'This week' }

   The button receives <i> + <span class="lbl"> child markup; the host CSS controls
   button styling. The popover is appended to <body> with className "rcal-pop" so
   styles can live globally.
   ============================================================ */

(function (root) {
  /* Inject calendar styles once (lets us load this on any page without touching its CSS) */
  if (!document.getElementById('rcal-styles')) {
    const st = document.createElement('style'); st.id = 'rcal-styles';
    st.textContent = '.rcal-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;font:500 13px var(--font-sans,system-ui);color:#111827;cursor:pointer}.rcal-btn:hover{background:#f9fafb}.rcal-btn .rcal-btn-icon{color:#6b7280;font-size:14px}.rcal-btn .rcal-btn-lbl{white-space:nowrap}.rcal-btn[aria-expanded="true"]{border-color:#fcc7a8;box-shadow:0 0 0 3px #fef0e6}.rcal-pop{position:absolute;z-index:9999;width:340px;background:#fff;border:1px solid #e5e7eb;border-radius:14px;box-shadow:0 24px 48px -16px rgba(15,23,42,.22),0 8px 16px -8px rgba(15,23,42,.12);padding:14px;font-family:var(--font-sans,system-ui);animation:rcalIn 120ms ease-out}.rcal-pop[hidden]{display:none!important}@keyframes rcalIn{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:none}}.rcal-presets{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:2px 0 12px;border-bottom:1px solid #f3f4f6;margin-bottom:10px}.rcal-preset{background:transparent;border:1px solid transparent;cursor:pointer;padding:7px 10px;border-radius:999px;font:500 13px var(--font-sans,system-ui);color:#374151;text-align:center}.rcal-preset:hover{background:#f9fafb}.rcal-preset.on{background:#fef0e6;color:#9a3a07;border-color:#fcc7a8}.rcal-cal{padding:0 2px}.rcal-cal-head{display:flex;align-items:center;justify-content:space-between;padding:4px 0 10px}.rcal-month{font:600 14px var(--font-sans,system-ui);color:#111827}.rcal-nav{background:transparent;border:0;cursor:pointer;width:28px;height:28px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;color:#374151}.rcal-nav:hover{background:#f9fafb}.rcal-dows{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;padding:0 0 6px;font:600 11px var(--font-sans,system-ui);color:#9ca3af;text-align:center;text-transform:uppercase;letter-spacing:.04em}.rcal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}.rcal-day{background:transparent;border:1px solid transparent;cursor:pointer;height:34px;border-radius:8px;font:500 13px var(--font-sans,system-ui);color:#1f2937}.rcal-day:hover:not(.in-range){background:#f9fafb}.rcal-day.out{color:#d1d5db}.rcal-day.today{border-color:#f8a974;color:#9a3a07;font-weight:600}.rcal-day.in-range{background:#fef0e6;color:#7a2e07}.rcal-day.range-start,.rcal-day.range-end{background:#d97757;color:#fff}.rcal-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 2px 0;margin-top:10px;border-top:1px solid #f3f4f6}.rcal-clear{background:none;border:0;cursor:pointer;color:#6b7280;font:500 13px var(--font-sans,system-ui);padding:4px 8px;border-radius:6px;display:inline-flex;align-items:center;gap:4px}.rcal-clear:hover{background:#f9fafb;color:#111827}.rcal-sel{font:500 13px var(--font-sans,system-ui);color:#374151}';
    document.head.appendChild(st);
  }
  const ONE_DAY = 86400000;
  const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const pad = n => String(n).padStart(2, '0');
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
  const endOfDay   = (d) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };
  const sameDay    = (a,b) => a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
  const isBetween  = (d, a, b) => d >= a && d <= b;

  function fmtShort(d) {
    if (!d) return '';
    const now = new Date();
    const opts = (d.getFullYear() === now.getFullYear()) ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' };
    return d.toLocaleDateString(undefined, opts);
  }
  function fmtRange(a, b) {
    if (!a || !b) return '';
    if (sameDay(a, b)) return fmtShort(a);
    return fmtShort(a) + ' – ' + fmtShort(b);
  }

  /* Range computations from a state */
  function stateRange(state) {
    const today = startOfDay(new Date());
    if (state.kind === 'today')     return { from: today, to: endOfDay(today) };
    if (state.kind === 'yesterday') { const y = new Date(today); y.setDate(y.getDate()-1); return { from: startOfDay(y), to: endOfDay(y) }; }
    if (state.kind === 'week')      { /* Mon–Sun containing today */
      const day = today.getDay() || 7; // 1..7, Mon..Sun
      const mon = new Date(today); mon.setDate(today.getDate() - (day - 1));
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { from: startOfDay(mon), to: endOfDay(sun) };
    }
    if (state.kind === 'month')     { const a = new Date(today.getFullYear(), today.getMonth(), 1); const b = new Date(today.getFullYear(), today.getMonth()+1, 0); return { from: startOfDay(a), to: endOfDay(b) }; }
    if (state.kind === 'year')      { return { from: new Date(today.getFullYear(),0,1), to: endOfDay(new Date(today.getFullYear(),11,31)) }; }
    if (state.kind === 'date')      return { from: startOfDay(state.date), to: endOfDay(state.date) };
    if (state.kind === 'range')     return { from: startOfDay(state.from), to: endOfDay(state.to) };
    if (state.kind === 'overdue')   return { from: new Date(0), to: endOfDay(new Date(today.getTime() - ONE_DAY)) };
    return null; /* 'all' or unknown */
  }

  function stateLabel(state) {
    const map = {
      today: 'Today', yesterday: 'Yesterday', week: 'This week',
      month: 'This month', year: 'This year', all: 'Any time', overdue: 'Overdue'
    };
    if (map[state.kind]) return map[state.kind];
    if (state.kind === 'date') return fmtShort(state.date);
    if (state.kind === 'range') return fmtRange(state.from, state.to);
    return 'Date';
  }

  /* Match an activity (which has a `day` offset where 0=today, +N=days ago, -N=days ahead) */
  function matchesActivity(a, state) {
    if (!state || state.kind === 'all') return true;
    if (state.kind === 'overdue')   return a.due === 'overdue';
    const today = startOfDay(new Date());
    const d = startOfDay(new Date(today.getTime() - (a.day || 0) * ONE_DAY));
    const r = stateRange(state);
    if (!r) return true;
    return isBetween(d, r.from, r.to);
  }

  /* Build the popover DOM once per attach */
  let popInstance = null;
  function ensurePop() {
    if (popInstance) return popInstance;
    const pop = document.createElement('div');
    pop.className = 'rcal-pop';
    pop.setAttribute('hidden', '');
    pop.innerHTML = ''
      + '<div class="rcal-presets" data-r="presets"></div>'
      + '<div class="rcal-cal">'
      +   '<div class="rcal-cal-head">'
      +     '<button type="button" class="rcal-nav" data-nav="-1" aria-label="Previous month"><i class="ri-arrow-left-s-line"></i></button>'
      +     '<div class="rcal-month" data-r="month"></div>'
      +     '<button type="button" class="rcal-nav" data-nav="1" aria-label="Next month"><i class="ri-arrow-right-s-line"></i></button>'
      +   '</div>'
      +   '<div class="rcal-dows">' + DAY_NAMES.map(d => '<span>' + d.charAt(0) + '</span>').join('') + '</div>'
      +   '<div class="rcal-grid" data-r="grid"></div>'
      + '</div>'
      + '<div class="rcal-foot">'
      +   '<button type="button" class="rcal-clear" data-r="clear"><i class="ri-refresh-line"></i> Clear</button>'
      +   '<div class="rcal-sel" data-r="sel"></div>'
      + '</div>';
    document.body.appendChild(pop);
    popInstance = { pop, currentInstance: null };
    /* Single global outside-click closer */
    document.addEventListener('click', (e) => {
      if (!popInstance.currentInstance) return;
      if (pop.hidden) return;
      const i = popInstance.currentInstance;
      if (e.target === i.button || i.button.contains(e.target)) return;
      if (pop.contains(e.target)) return;
      hide();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !pop.hidden) hide();
    });
    return popInstance;
  }
  function hide() {
    if (!popInstance) return;
    popInstance.pop.hidden = true;
    if (popInstance.currentInstance) popInstance.currentInstance.button.setAttribute('aria-expanded', 'false');
    popInstance.currentInstance = null;
  }

  function positionPop(button, pop) {
    const r = button.getBoundingClientRect();
    const pw = 340, pad = 6;
    let left = r.left;
    let top  = r.bottom + pad + window.scrollY;
    if (left + pw > window.innerWidth - 8) left = Math.max(8, window.innerWidth - pw - 8);
    pop.style.left = left + 'px';
    pop.style.top  = top  + 'px';
  }

  function renderPop(inst) {
    const { pop } = ensurePop();
    const presetsEl = pop.querySelector('[data-r="presets"]');
    const monthEl = pop.querySelector('[data-r="month"]');
    const gridEl = pop.querySelector('[data-r="grid"]');
    const selEl = pop.querySelector('[data-r="sel"]');

    /* presets */
    presetsEl.innerHTML = inst.presets.map(p =>
      '<button type="button" class="rcal-preset' + (inst.state.kind === p.key ? ' on' : '') + '" data-key="' + p.key + '">' + p.label + '</button>'
    ).join('');
    presetsEl.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      inst.state = { kind: b.dataset.key };
      commit(inst, true);
    }));

    /* month grid */
    const view = inst.viewMonth || (() => { const n = new Date(); n.setDate(1); inst.viewMonth = n; return n; })();
    monthEl.textContent = MONTH_NAMES[view.getMonth()] + ' ' + view.getFullYear();

    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const startWeekday = first.getDay(); // 0=Sun
    const daysInMonth = new Date(view.getFullYear(), view.getMonth()+1, 0).getDate();
    const today = startOfDay(new Date());
    const r = stateRange(inst.state);
    const cells = [];
    /* leading blanks (previous month) */
    for (let i = 0; i < startWeekday; i++) {
      const d = new Date(view.getFullYear(), view.getMonth(), -(startWeekday - 1 - i));
      cells.push({ d, out: true });
    }
    for (let i = 1; i <= daysInMonth; i++) cells.push({ d: new Date(view.getFullYear(), view.getMonth(), i), out: false });
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1].d;
      const d = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
      cells.push({ d, out: true });
    }
    /* extend to 6 rows for stable height */
    while (cells.length < 42) {
      const last = cells[cells.length - 1].d;
      const d = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
      cells.push({ d, out: true });
    }

    gridEl.innerHTML = cells.map(c => {
      const cls = ['rcal-day'];
      if (c.out) cls.push('out');
      if (sameDay(c.d, today)) cls.push('today');
      if (r && isBetween(startOfDay(c.d), r.from, r.to)) {
        cls.push('in-range');
        if (sameDay(c.d, r.from)) cls.push('range-start');
        if (sameDay(c.d, r.to)) cls.push('range-end');
      }
      return '<button type="button" class="' + cls.join(' ') + '" data-iso="' + c.d.getFullYear() + '-' + pad(c.d.getMonth()+1) + '-' + pad(c.d.getDate()) + '">' + c.d.getDate() + '</button>';
    }).join('');

    gridEl.querySelectorAll('.rcal-day').forEach(btn => btn.addEventListener('click', () => {
      const [y,m,d] = btn.dataset.iso.split('-').map(Number);
      const picked = new Date(y, m-1, d);
      /* shift-click extends a range from previously-picked single date */
      const existing = inst.state;
      if (existing.kind === 'date' && window.event && window.event.shiftKey) {
        const a = existing.date, b = picked;
        inst.state = (a < b)
          ? { kind: 'range', from: a, to: b }
          : { kind: 'range', from: b, to: a };
      } else {
        inst.state = { kind: 'date', date: picked };
      }
      commit(inst, true);
    }));

    /* nav buttons */
    pop.querySelectorAll('[data-nav]').forEach(btn => btn.onclick = () => {
      const dir = parseInt(btn.dataset.nav, 10);
      const v = inst.viewMonth || new Date();
      inst.viewMonth = new Date(v.getFullYear(), v.getMonth() + dir, 1);
      renderPop(inst);
    });

    /* foot */
    pop.querySelector('[data-r="clear"]').onclick = () => {
      inst.state = { kind: 'all' };
      commit(inst, true);
    };
    selEl.textContent = stateLabel(inst.state);
  }

  function commit(inst, fireChange) {
    inst.state.label = stateLabel(inst.state);
    /* Update the trigger button label — prefer host's existing .lbl if present */
    let lbl = inst.button.querySelector('.lbl') || inst.button.querySelector('.rcal-btn-lbl');
    if (!lbl) { lbl = document.createElement('span'); lbl.className = 'rcal-btn-lbl'; inst.button.appendChild(lbl); }
    lbl.textContent = inst.state.label;
    /* keep popover in sync */
    if (popInstance && !popInstance.pop.hidden && popInstance.currentInstance === inst) renderPop(inst);
    if (fireChange && typeof inst.onChange === 'function') inst.onChange(inst.state);
  }

  function attach(opts) {
    const inst = {
      button: opts.button,
      onChange: opts.onChange,
      presets: opts.presets || [
        { key: 'today',     label: 'Today' },
        { key: 'yesterday', label: 'Yesterday' },
        { key: 'week',      label: 'This week' },
        { key: 'month',     label: 'This month' },
        { key: 'year',      label: 'This year' },
        { key: 'all',       label: 'Any time' }
      ],
      state: opts.initial || { kind: 'week' },
      viewMonth: null
    };
    /* Initial button decoration: icon + label (skip if host already styled it) */
    const hasHostStyle = inst.button.classList.contains('af-pill') || inst.button.classList.contains('rcal-skip-style');
    if (!hasHostStyle) {
      if (!inst.button.querySelector('.rcal-btn-icon')) {
        const ic = document.createElement('i'); ic.className = 'rcal-btn-icon ri-calendar-line';
        inst.button.prepend(ic);
      }
      inst.button.classList.add('rcal-btn');
    }
    inst.button.setAttribute('aria-haspopup', 'dialog');
    inst.button.setAttribute('aria-expanded', 'false');

    inst.button.addEventListener('click', (e) => {
      e.stopPropagation();
      const { pop } = ensurePop();
      if (popInstance.currentInstance === inst && !pop.hidden) { hide(); return; }
      popInstance.currentInstance = inst;
      pop.hidden = false;
      inst.button.setAttribute('aria-expanded', 'true');
      /* default view month to range start or today */
      const r = stateRange(inst.state);
      const ref = (r && r.from) ? new Date(r.from) : new Date();
      inst.viewMonth = new Date(ref.getFullYear(), ref.getMonth(), 1);
      renderPop(inst);
      positionPop(inst.button, pop);
    });

    commit(inst, false);
    return {
      get state(){ return inst.state; },
      set: (s) => { inst.state = s; commit(inst, true); },
      label: () => stateLabel(inst.state),
      matches: (a) => matchesActivity(a, inst.state),
      stateRange: () => stateRange(inst.state)
    };
  }

  root.ReamCalendar = {
    attach,
    matchesActivity,
    stateRange,
    stateLabel
  };
})(window);
