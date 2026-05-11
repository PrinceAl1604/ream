/* Activity + History: filtering, sorting, pagination
 * Self-contained module — wires onto existing DOM after page load.
 * - Activity: search + kind chips (existing) + sort + page size + pager
 * - History:  search + kind dropdown + sort + page size + pager
 * Kind detection for history is heuristic (parses each .hist-item text).
 */
(function () {
  'use strict';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  // --------- Shared filter-bar HTML ----------
  function filterBarHTML(prefix, kindOpts, opts) {
    opts = opts || {};
    const userOpts = (opts.users || []).map(u => `<option value="${u}">${u}</option>`).join('');
    return `
      <div class="pd-act-filters" id="${prefix}-filters">
        <span class="label">Filter</span>
        <input type="search" id="${prefix}-search" placeholder="Search…" />
        ${kindOpts ? `<select id="${prefix}-kind" aria-label="Type">
          ${kindOpts.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
        </select>` : ''}
        ${opts.users ? `<select id="${prefix}-user" aria-label="User"><option value="all">All users</option>${userOpts}</select>` : ''}
        ${opts.visibility ? `<select id="${prefix}-vis" aria-label="Visibility"><option value="all">All visibility</option><option value="public">Public only</option><option value="private">Private only</option></select>` : ''}
        <select id="${prefix}-sort" aria-label="Sort">
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
        <select id="${prefix}-pagesize" aria-label="Per page">
          <option value="5">5 / page</option>
          <option value="10" selected>10 / page</option>
          <option value="20">20 / page</option>
          <option value="50">50 / page</option>
        </select>
        <button type="button" class="clear" id="${prefix}-clear" title="Clear filters"><i class="ri-close-line"></i> Clear</button>
      </div>
      <div class="pd-act-summary" id="${prefix}-summary"></div>
    `;
  }
  function pagerHTML(prefix) {
    return `
      <div class="pd-act-pager" id="${prefix}-pager" hidden>
        <div class="info" id="${prefix}-pageinfo"></div>
        <div class="controls">
          <button type="button" data-act="first" title="First"><i class="ri-skip-back-mini-line"></i></button>
          <button type="button" data-act="prev"  title="Previous"><i class="ri-arrow-left-s-line"></i> Prev</button>
          <span id="${prefix}-pages" style="display:inline-flex;gap:4px;"></span>
          <button type="button" data-act="next"  title="Next">Next <i class="ri-arrow-right-s-line"></i></button>
          <button type="button" data-act="last"  title="Last"><i class="ri-skip-forward-mini-line"></i></button>
        </div>
      </div>
    `;
  }

  // --------- Icon-aware select replacement ----------
  const KIND_META = {
    all:        { icon: 'ri-stack-line',          color: 'var(--fg2)' },
    note:       { icon: 'ri-sticky-note-line',    color: 'var(--color-grey-700)' },
    call:       { icon: 'ri-phone-line',          color: 'var(--color-brand-700)' },
    email:      { icon: 'ri-mail-line',           color: 'var(--color-blue-700)' },
    task:       { icon: 'ri-task-line',           color: 'var(--color-warning-700)' },
    meeting:    { icon: 'ri-calendar-event-line', color: 'var(--color-success-700)' },
    system:     { icon: 'ri-settings-3-line',     color: 'var(--fg3)' },
    request:    { icon: 'ri-file-list-line',      color: '#7C3AED' },
    attach:     { icon: 'ri-attachment-2',        color: 'var(--color-grey-700)' },
    attachment: { icon: 'ri-attachment-2',        color: 'var(--color-grey-700)' },
  };
  function userInitials(n) { return (n || '?').split(/\s+/).map(s => s[0] || '').join('').slice(0, 2).toUpperCase(); }
  function userColor(n) {
    let h = 0; for (const c of (n || '')) h = (h * 31 + c.charCodeAt(0)) | 0;
    const palette = ['var(--color-brand-700)','var(--color-blue-700)','var(--color-warning-700)','var(--color-success-700)','#7C3AED','#0EA5E9','#DB2777','#0F766E'];
    return palette[Math.abs(h) % palette.length];
  }
  function ensureActivityTweaksCSS() {
    if (document.getElementById('pd-act-tweaks-css')) return;
    const s = document.createElement('style');
    s.id = 'pd-act-tweaks-css';
    s.textContent = `
      /* Header alignment: pin timestamp + visibility to far right */
      .tl-summary { padding-right: 4px; }
      .tl-summary .t-title { flex: 1 1 auto; min-width: 0; }
      .tl-summary .t-when, .tl-summary .tl-vis, .tl-head .when, .tl-head .tl-vis { flex-shrink: 0; margin-left: auto; }
      .tl-summary .tl-vis + .t-when { margin-left: 8px; }
      .tl-vis { flex-shrink: 0; }
      /* Activity container: more breathing room */
      .pd-tabpanel[data-tab="activity"] .timeline { padding: 24px 8px 24px 60px; gap: 24px; }
      .pd-tabpanel[data-tab="activity"] .tl-item { padding: 16px 18px; }
      .pd-tabpanel[data-tab="activity"] .tl-item + .tl-item { padding-top: 18px; }
      /* Edit (inline) container: roomier */
      .tl-item.is-inline-editing { padding: 22px 22px 18px !important; }
      .tl-item.is-inline-editing .tl-edit-title { padding: 10px 12px; font-size: 14px; }
      .tl-item.is-inline-editing .tl-edit-body { padding: 12px; min-height: 110px; }
      .tl-item.is-inline-editing .tl-edit-bar { margin-top: 14px; gap: 10px; }
      /* Task activity: more padding around task fields and between rows */
      .tl-item[data-kind="task"] { padding: 20px 20px 18px; }
      .tl-item[data-kind="task"] .tl-detail-grid { gap: 14px; }
      .tl-item[data-kind="task"] .tl-detail-row { padding: 6px 0; }
      .tl-item[data-kind="task"] .tl-body { padding-bottom: 6px; }
      .tl-item[data-kind="task"] .tl-labels { margin-top: 12px; gap: 8px; }
      /* Attachment cards: clearly clickable */
      .tl-attach-card, .tl-attach-img { cursor: zoom-in; transition: transform .12s, border-color .12s, box-shadow .12s; }
      .tl-attach-card:hover, .tl-attach-img:hover { border-color: var(--color-brand-400); box-shadow: 0 2px 8px rgba(124, 58, 237, 0.08); }
      .tl-attach-card:active, .tl-attach-img:active { transform: scale(0.99); }
      /* Lightbox */
      .pd-attach-lb { position: fixed; inset: 0; z-index: 10000; background: rgba(15,14,22,0.85); display: flex; align-items: center; justify-content: center; padding: 24px; cursor: zoom-out; }
      .pd-attach-lb .card { background: white; border-radius: 12px; padding: 28px 32px; max-width: 460px; text-align: center; font: 14px var(--font-sans); cursor: default; }
      .pd-attach-lb .card .nm { font: 600 14px var(--font-sans); color: var(--color-grey-900); margin-top: 12px; }
      .pd-attach-lb .card .meta { font: 12px var(--font-sans); color: var(--fg3); margin-top: 4px; }
      .pd-attach-lb .card a { color: var(--color-brand-600); font-weight: 500; text-decoration: none; }
      .pd-attach-lb .card a:hover { text-decoration: underline; }
    `;
    document.head.appendChild(s);
  }
  function ensureIselectCSS() {
    ensureActivityTweaksCSS();
    if (document.getElementById('pd-iselect-css')) return;
    const s = document.createElement('style');
    s.id = 'pd-iselect-css';
    s.textContent = `
      .pd-iselect { position: relative; display: inline-block; font-family: var(--font-sans); }
      .pd-iselect-btn { display: inline-flex; align-items: center; gap: 8px; padding: 6px 8px 6px 10px; background: white; border: 1px solid var(--border-default); border-radius: 6px; font: 13px var(--font-sans); color: var(--color-grey-800); cursor: pointer; line-height: 1; }
      .pd-iselect-btn:hover { background: var(--color-grey-50); }
      .pd-iselect-btn[aria-expanded="true"] { border-color: var(--color-brand-400); box-shadow: 0 0 0 3px var(--color-brand-100); }
      .pd-iselect-btn .pd-iselect-lbl { white-space: nowrap; font-weight: 500; }
      .pd-iselect-btn > i { font-size: 14px; }
      .pd-iselect-pop { position: absolute; top: calc(100% + 4px); left: 0; min-width: 220px; max-height: 340px; overflow-y: auto; background: white; border: 1px solid var(--border-default); border-radius: 8px; box-shadow: 0 8px 24px rgba(15,14,22,0.12); z-index: 50; padding: 4px; }
      .pd-iselect-opt { display: flex; align-items: center; gap: 10px; width: 100%; padding: 7px 10px; border: 0; background: transparent; border-radius: 6px; font: 13px var(--font-sans); color: var(--color-grey-800); cursor: pointer; text-align: left; }
      .pd-iselect-opt:hover { background: var(--color-grey-50); }
      .pd-iselect-opt.is-on { background: var(--color-brand-50); color: var(--color-brand-700); font-weight: 500; }
      .pd-iselect-opt > i { font-size: 14px; }
      .pd-iselect-opt .pd-iselect-lbl { flex: 1; }
      .pd-iselect-av { width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: white; font: 600 10px var(--font-sans); flex-shrink: 0; }
    `;
    document.head.appendChild(s);
  }
  function replaceWithIconSelect(sel, opts) {
    if (!sel || sel.dataset.iselect === '1') return;
    sel.dataset.iselect = '1';
    ensureIselectCSS();
    const wrap = document.createElement('div');
    wrap.className = 'pd-iselect';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pd-iselect-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    const pop = document.createElement('div');
    pop.className = 'pd-iselect-pop';
    pop.hidden = true;
    pop.setAttribute('role', 'listbox');
    function options() { return Array.from(sel.options).map(o => ({ value: o.value, label: o.textContent })); }
    function renderItem(meta, label) {
      if (meta.avatar) return `<span class="pd-iselect-av" style="background:${meta.color || 'var(--color-grey-500)'};">${meta.avatar}</span><span class="pd-iselect-lbl">${label}</span>`;
      return `<i class="${meta.icon}" style="color:${meta.color || 'var(--fg2)'};"></i><span class="pd-iselect-lbl">${label}</span>`;
    }
    function renderBtn() {
      const opts2 = options();
      const cur = opts2.find(o => o.value === sel.value) || opts2[0];
      if (!cur) return;
      const meta = opts.iconFor(cur.value, cur.label);
      btn.innerHTML = renderItem(meta, cur.label) + '<i class="ri-arrow-down-s-line" style="color:var(--fg3);margin-left:4px;"></i>';
    }
    function renderPop() {
      pop.innerHTML = options().map(o => {
        const m = opts.iconFor(o.value, o.label);
        const on = o.value === sel.value;
        return `<button type="button" role="option" data-v="${o.value}" class="pd-iselect-opt${on ? ' is-on' : ''}">${renderItem(m, o.label)}${on ? '<i class="ri-check-line" style="color:var(--color-brand-700);"></i>' : ''}</button>`;
      }).join('');
      pop.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
        sel.value = b.dataset.v;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        renderBtn(); close();
      }));
    }
    function open() {
      // Close any other open iselect dropdown first (only one at a time)
      document.querySelectorAll('.pd-iselect-pop:not([hidden])').forEach(p => {
        if (p !== pop) {
          p.hidden = true;
          const ob = p.previousElementSibling;
          if (ob) ob.setAttribute('aria-expanded', 'false');
        }
      });
      renderPop(); pop.hidden = false; btn.setAttribute('aria-expanded', 'true');
      setTimeout(() => document.addEventListener('click', onDoc), 0);
    }
    function close() { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('click', onDoc); }
    function onDoc(e) { if (!wrap.contains(e.target)) close(); }
    btn.addEventListener('click', (e) => { e.stopPropagation(); pop.hidden ? open() : close(); });
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(btn); wrap.appendChild(pop);
    sel.style.display = 'none';
    sel.addEventListener('change', renderBtn);
    renderBtn();
  }

  // --------- Activity module ----------
  function initActivity() {
    const tl = $('.timeline');
    const kindBar = $('#timelineFilters');
    if (!tl || !kindBar) return;

    // Tag each activity with author + visibility (default rules) + decorate with vis pill.
    $$('.tl-item', tl).forEach(it => decorateActivity(it));

    // Distinct author list for User filter
    const users = Array.from(new Set($$('.tl-item', tl).map(it => it.getAttribute('data-author') || '').filter(Boolean))).sort();

    // Insert filter bar AFTER kind chips and a pager AFTER the timeline
    const KIND_OPTS = [
      ['all',    'All types'],
      ['note',   'Notes'],
      ['call',   'Calls'],
      ['email',  'Emails'],
      ['task',   'Tasks'],
      ['meeting','Meetings'],
      ['system', 'System'],
    ];
    kindBar.insertAdjacentHTML('afterend', filterBarHTML('act', KIND_OPTS, { users, visibility: true }));
    tl.insertAdjacentHTML('afterend', pagerHTML('act'));

    // Upgrade Type + User selects to icon-aware dropdowns
    replaceWithIconSelect($('#act-kind'), { iconFor: (v) => KIND_META[v] || KIND_META.all });
    replaceWithIconSelect($('#act-user'), {
      iconFor: (v, label) => {
        if (v === 'all') return { icon: 'ri-team-line', color: 'var(--fg2)' };
        return { avatar: userInitials(label), color: userColor(label) };
      }
    });
    // Visibility filter — show as badge-styled icon dropdown matching .tl-vis pills
    replaceWithIconSelect($('#act-vis'), {
      iconFor: (v) => {
        if (v === 'public')  return { icon: 'ri-global-line', color: 'var(--color-success-700)' };
        if (v === 'private') return { icon: 'ri-lock-line',   color: 'var(--color-grey-700)' };
        return { icon: 'ri-eye-line', color: 'var(--fg2)' };
      }
    });

    const state = { kind: 'all', kindSel: 'all', user: 'all', vis: 'all', search: '', sort: 'desc', page: 1, pageSize: 10 };

    function snapshot() {
      // Pull current items in document order. Newest-first is the natural DOM order.
      return $$('.tl-item', tl).map((el, idx) => {
        const k = (el.getAttribute('data-kind') || 'system').toLowerCase();
        const text = (el.textContent || '').toLowerCase();
        return { el, idx, kind: k, text,
          author: el.getAttribute('data-author') || '',
          vis:    el.getAttribute('data-visibility') || 'private',
        };
      });
    }

    function compute() {
      let items = snapshot();
      // chip-driven kind filter
      if (state.kind !== 'all') items = items.filter(x => x.kind === state.kind);
      // dropdown kind (intersect with chip)
      if (state.kindSel !== 'all') items = items.filter(x => x.kind === state.kindSel);
      // user filter
      if (state.user !== 'all') items = items.filter(x => x.author === state.user);
      // visibility filter
      if (state.vis !== 'all') items = items.filter(x => x.vis === state.vis);
      // search
      const s = state.search.trim().toLowerCase();
      if (s) items = items.filter(x => x.text.includes(s));
      // sort: idx ascending = newest-first (DOM order); asc reverses
      items.sort((a, b) => state.sort === 'asc' ? b.idx - a.idx : a.idx - b.idx);
      return items;
    }

    function render() {
      const all = snapshot();
      const filtered = compute();
      // Hide everything first, then show only the page slice in chosen order.
      all.forEach(x => { x.el.style.display = 'none'; x.el.style.order = ''; });
      const total = filtered.length;
      const pageSize = state.pageSize;
      const pageCount = Math.max(1, Math.ceil(total / pageSize));
      if (state.page > pageCount) state.page = pageCount;
      if (state.page < 1) state.page = 1;
      const start = (state.page - 1) * pageSize;
      const end = Math.min(start + pageSize, total);
      const slice = filtered.slice(start, end);

      // Make timeline a flex column so we can use `order` to reorder items in place.
      tl.style.display = 'flex';
      tl.style.flexDirection = 'column';
      slice.forEach((x, i) => { x.el.style.display = ''; x.el.style.order = String(i); });

      // Empty state
      let empty = tl.querySelector('.tl-empty');
      if (total === 0) {
        if (!empty) {
          empty = document.createElement('div');
          empty.className = 'tl-empty pd-act-empty';
          empty.innerHTML = '<i class="ri-inbox-line"></i>No activity matches these filters.';
          tl.appendChild(empty);
        }
      } else if (empty) empty.remove();

      // Summary line
      const sum = $('#act-summary');
      if (sum) {
        if (total === 0) sum.innerHTML = '';
        else sum.innerHTML = `Showing <strong>${start + 1}–${end}</strong> of <strong>${total}</strong> activit${total === 1 ? 'y' : 'ies'}`;
      }

      // Pager
      const pager = $('#act-pager');
      if (pager) {
        pager.hidden = total <= pageSize;
        const info = $('#act-pageinfo');
        if (info) info.textContent = `Page ${state.page} of ${pageCount}`;
        const pagesEl = $('#act-pages');
        if (pagesEl) pagesEl.innerHTML = renderPageButtons(state.page, pageCount);
        pager.querySelectorAll('button[data-act]').forEach(b => {
          b.disabled = (b.dataset.act === 'first' || b.dataset.act === 'prev') ? state.page === 1 : state.page === pageCount;
        });
        pager.querySelectorAll('button.page').forEach(b => {
          b.addEventListener('click', () => { state.page = +b.dataset.p; render(); }, { once: true });
        });
      }
    }

    // Attachment preview lightbox (delegated for both seeded + composer-added items)
    tl.addEventListener('click', (e) => {
      const card = e.target.closest('.tl-attach-card, .tl-attach-img');
      if (!card || !tl.contains(card)) return;
      e.preventDefault();
      e.stopPropagation();
      const nm = (card.querySelector('.nm') || card.querySelector('.cap > span:first-child') || {}).textContent || 'Attachment';
      const sz = (card.querySelector('.sz') || card.querySelector('.cap .sz') || {}).textContent || '';
      const isImg = card.classList.contains('tl-attach-img') || /\.(png|jpe?g|gif|webp|svg)$/i.test(nm);
      const isPdf = /\.pdf$/i.test(nm) || card.querySelector('.ic.pdf');
      const lb = document.createElement('div');
      lb.className = 'pd-attach-lb';
      lb.innerHTML = `<div class="card" onclick="event.stopPropagation()">
        ${isImg ? `<div style="width:380px;height:240px;border-radius:8px;background:linear-gradient(135deg,#0e7490,#06b6d4);display:flex;align-items:center;justify-content:center;color:white;font-size:48px;"><i class="ri-image-2-line"></i></div>`
          : isPdf ? `<div style="width:120px;height:120px;margin:0 auto;border-radius:12px;background:#fef2f2;display:flex;align-items:center;justify-content:center;color:#b91c1c;font-size:56px;"><i class="ri-file-pdf-line"></i></div>`
          : `<div style="width:120px;height:120px;margin:0 auto;border-radius:12px;background:var(--color-grey-100);display:flex;align-items:center;justify-content:center;color:var(--color-grey-600);font-size:56px;"><i class="ri-file-line"></i></div>`}
        <div class="nm">${nm}</div>
        <div class="meta">${sz || 'Attachment'}</div>
        <div style="margin-top:14px;display:flex;gap:8px;justify-content:center;">
          <a href="#" onclick="event.preventDefault();this.closest('.pd-attach-lb').remove();"><i class="ri-download-line"></i> Download</a>
          <span style="color:var(--fg4);">\u00b7</span>
          <a href="#" onclick="event.preventDefault();this.closest('.pd-attach-lb').remove();">Close</a>
        </div>
      </div>`;
      lb.addEventListener('click', () => lb.remove());
      document.body.appendChild(lb);
    });

    // Hook search/sort/pagesize/clear + new selects
    $('#act-search').addEventListener('input', (e) => { state.search = e.target.value; state.page = 1; render(); });
    $('#act-kind').addEventListener('change',   (e) => { state.kindSel = e.target.value; state.page = 1; render(); });
    $('#act-user').addEventListener('change',   (e) => { state.user = e.target.value; state.page = 1; render(); });
    $('#act-vis').addEventListener('change',    (e) => { state.vis = e.target.value; state.page = 1; render(); });
    $('#act-sort').addEventListener('change',   (e) => { state.sort = e.target.value; render(); });
    $('#act-pagesize').addEventListener('change',(e) => { state.pageSize = +e.target.value; state.page = 1; render(); });
    $('#act-clear').addEventListener('click', () => {
      state.search = ''; state.sort = 'desc'; state.pageSize = 10; state.page = 1; state.kind = 'all'; state.kindSel = 'all'; state.user = 'all'; state.vis = 'all';
      $('#act-search').value = ''; $('#act-sort').value = 'desc'; $('#act-pagesize').value = '10';
      $('#act-kind').value = 'all'; $('#act-user').value = 'all'; $('#act-vis').value = 'all';
      ['#act-kind','#act-user','#act-vis'].forEach(id => { const el = $(id); if (el) el.dispatchEvent(new Event('change', { bubbles: true })); });
      kindBar.querySelectorAll('.pd-tab').forEach(t => t.classList.remove('active'));
      const allBtn = kindBar.querySelector('[data-filter="all"]');
      if (allBtn) allBtn.classList.add('active');
      render();
    });

    // Hook kind chips: intercept to keep our state in sync
    kindBar.querySelectorAll('.pd-tab').forEach(t => {
      t.addEventListener('click', () => {
        state.kind = t.getAttribute('data-filter') || 'all';
        state.page = 1;
        // Reset chip-driven inline display:none so our render is authoritative
        $$('.tl-item', tl).forEach(it => { it.style.display = ''; });
        render();
      });
    });

    // Pager controls
    $('#act-pager').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]'); if (!b) return;
      const total = compute().length;
      const pageCount = Math.max(1, Math.ceil(total / state.pageSize));
      if (b.dataset.act === 'first') state.page = 1;
      if (b.dataset.act === 'prev')  state.page = Math.max(1, state.page - 1);
      if (b.dataset.act === 'next')  state.page = Math.min(pageCount, state.page + 1);
      if (b.dataset.act === 'last')  state.page = pageCount;
      render();
    });

    // Re-render when new items get prepended by composer
    const obs = new MutationObserver((muts) => {
      muts.forEach(m => m.addedNodes.forEach(n => {
        if (n.nodeType === 1 && n.classList && n.classList.contains('tl-item')) decorateActivity(n);
      }));
      render();
    });
    obs.observe(tl, { childList: true });

    render();
  }

  // --------- Visibility decoration ----------
  function decorateActivity(it) {
    if (!it || it.dataset.visDecorated === '1') return;
    // Author = the bold name in .who (e.g. "Kevin Manga · logged a call")
    const whoEl = it.querySelector('.who');
    let author = '';
    if (whoEl) {
      const c = whoEl.firstChild;
      author = (c && c.nodeType === 3 ? c.textContent : whoEl.textContent || '').trim().replace(/\s+·.*$/, '').trim();
    }
    // The prospect's name on this page is Joseph Mensah; if absent, fall back via header.
    const PROSPECT_NAME = ((document.querySelector('h1') || {}).textContent || '').trim() || 'Joseph Mensah';
    const isProspect = author && PROSPECT_NAME.toLowerCase().includes(author.toLowerCase().split(' ')[0]);
    const isSystem = (it.getAttribute('data-kind') || '') === 'system';
    let vis = it.getAttribute('data-visibility');
    if (!vis) {
      // Default rule: prospect → public, member → private, system → public.
      if (isSystem) vis = 'public';
      else vis = isProspect ? 'public' : 'private';
    }
    it.setAttribute('data-author', author || 'System');
    it.setAttribute('data-visibility', vis);

    // Visibility pill in summary bar (.tl-summary .t-when) — fallback to .tl-head .when
    const target = it.querySelector('.tl-summary .t-when') || it.querySelector('.tl-head .when');
    if (target && !target.parentElement.querySelector('.tl-vis')) {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'tl-vis';
      pill.setAttribute('data-v', vis);
      pill.title = vis === 'public'
        ? 'Public — visible to the prospect. Click to make private.'
        : 'Private — only organization members. Click to make public.';
      pill.innerHTML = vis === 'public'
        ? '<i class="ri-global-line"></i>Public'
        : '<i class="ri-lock-line"></i>Private';
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        const cur = it.getAttribute('data-visibility') || 'private';
        const next = cur === 'public' ? 'private' : 'public';
        it.setAttribute('data-visibility', next);
        pill.setAttribute('data-v', next);
        pill.innerHTML = next === 'public' ? '<i class="ri-global-line"></i>Public' : '<i class="ri-lock-line"></i>Private';
        pill.title = next === 'public'
          ? 'Public — visible to the prospect. Click to make private.'
          : 'Private — only organization members. Click to make public.';
        if (window.toast) window.toast('Visibility set to ' + next, { kind: 'success', icon: next === 'public' ? 'ri-global-line' : 'ri-lock-line' });
      });
      target.insertAdjacentElement('beforebegin', pill);
    }
    it.dataset.visDecorated = '1';
  }

  // --------- History module ----------
  function classifyHistory(el) {
    const t = (el.textContent || '').toLowerCase();
    if (t.includes('logged a call') || t.includes('attempted call')) return 'call';
    if (t.includes('sent email') || t.includes('replied') || t.includes('email')) return 'email';
    if (t.includes('added a note') || t.includes('note')) return 'note';
    if (t.includes('task') || t.includes('priority') || t.includes('assigned task')) return 'task';
    if (t.includes('attached') || t.includes('attachment')) return 'attach';
    return 'system';
  }

  function initHistory() {
    const list = $('.hist-list');
    if (!list) return;

    // Tag every item with kind so filtering is fast
    $$('.hist-item', list).forEach(el => el.setAttribute('data-kind', classifyHistory(el)));

    list.insertAdjacentHTML('beforebegin', filterBarHTML('hist', [
      ['all', 'All types'],
      ['call', 'Calls'],
      ['email', 'Emails'],
      ['note', 'Notes'],
      ['task', 'Tasks'],
      ['attach', 'Attachments'],
      ['system', 'System'],
    ]));
    list.insertAdjacentHTML('afterend', pagerHTML('hist'));
    replaceWithIconSelect($('#hist-kind'), { iconFor: (v) => KIND_META[v] || KIND_META.all });

    const state = { kind: 'all', search: '', sort: 'desc', page: 1, pageSize: 10 };

    function snapshot() {
      return $$('.hist-item', list).map((el, idx) => ({
        el, idx,
        kind: el.getAttribute('data-kind') || 'system',
        text: (el.textContent || '').toLowerCase(),
      }));
    }
    function compute() {
      let items = snapshot();
      if (state.kind !== 'all') items = items.filter(x => x.kind === state.kind);
      const s = state.search.trim().toLowerCase();
      if (s) items = items.filter(x => x.text.includes(s));
      items.sort((a, b) => state.sort === 'asc' ? b.idx - a.idx : a.idx - b.idx);
      return items;
    }
    function render() {
      const all = snapshot();
      const filtered = compute();
      all.forEach(x => { x.el.style.display = 'none'; x.el.style.order = ''; });

      // Make list a flex column for reordering via order property
      list.style.display = 'flex';
      list.style.flexDirection = 'column';

      const total = filtered.length;
      const pageCount = Math.max(1, Math.ceil(total / state.pageSize));
      if (state.page > pageCount) state.page = pageCount;
      if (state.page < 1) state.page = 1;
      const start = (state.page - 1) * state.pageSize;
      const end = Math.min(start + state.pageSize, total);
      const slice = filtered.slice(start, end);
      slice.forEach((x, i) => { x.el.style.display = ''; x.el.style.order = String(i); });

      // Empty state
      let empty = list.parentElement.querySelector('.hist-empty');
      if (total === 0) {
        if (!empty) {
          empty = document.createElement('div');
          empty.className = 'hist-empty pd-act-empty';
          empty.innerHTML = '<i class="ri-inbox-line"></i>No history items match these filters.';
          list.parentElement.insertBefore(empty, list.nextSibling);
        }
      } else if (empty) empty.remove();

      // Summary
      const sum = $('#hist-summary');
      if (sum) {
        sum.innerHTML = total === 0
          ? ''
          : `Showing <strong>${start + 1}–${end}</strong> of <strong>${total}</strong> history item${total === 1 ? '' : 's'}`;
      }

      // Pager
      const pager = $('#hist-pager');
      if (pager) {
        pager.hidden = total <= state.pageSize;
        const info = $('#hist-pageinfo'); if (info) info.textContent = `Page ${state.page} of ${pageCount}`;
        const pagesEl = $('#hist-pages'); if (pagesEl) pagesEl.innerHTML = renderPageButtons(state.page, pageCount);
        pager.querySelectorAll('button[data-act]').forEach(b => {
          b.disabled = (b.dataset.act === 'first' || b.dataset.act === 'prev') ? state.page === 1 : state.page === pageCount;
        });
        pager.querySelectorAll('button.page').forEach(b => {
          b.addEventListener('click', () => { state.page = +b.dataset.p; render(); }, { once: true });
        });
      }
    }

    $('#hist-search').addEventListener('input', (e) => { state.search = e.target.value; state.page = 1; render(); });
    $('#hist-kind').addEventListener('change', (e) => { state.kind = e.target.value; state.page = 1; render(); });
    $('#hist-sort').addEventListener('change', (e) => { state.sort = e.target.value; render(); });
    $('#hist-pagesize').addEventListener('change', (e) => { state.pageSize = +e.target.value; state.page = 1; render(); });
    $('#hist-clear').addEventListener('click', () => {
      state.kind = 'all'; state.search = ''; state.sort = 'desc'; state.pageSize = 10; state.page = 1;
      $('#hist-search').value = ''; $('#hist-kind').value = 'all'; $('#hist-sort').value = 'desc'; $('#hist-pagesize').value = '10';
      $('#hist-kind').dispatchEvent(new Event('change', { bubbles: true }));
      render();
    });
    $('#hist-pager').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]'); if (!b) return;
      const total = compute().length;
      const pageCount = Math.max(1, Math.ceil(total / state.pageSize));
      if (b.dataset.act === 'first') state.page = 1;
      if (b.dataset.act === 'prev')  state.page = Math.max(1, state.page - 1);
      if (b.dataset.act === 'next')  state.page = Math.min(pageCount, state.page + 1);
      if (b.dataset.act === 'last')  state.page = pageCount;
      render();
    });

    render();
  }

  // --------- Seed: extra activities so pagination is testable ----------
  const SEED = [
    { kind:'call',    cls:'brand',   icon:'ri-phone-line',         who:'Daniel Boateng', verb:'logged a call',       when:'4 days ago, 10:12am', title:'Follow-up · 8 min',            body:'Confirmed Joseph received the brochure. Wants to visit Brookfield this weekend.' },
    { kind:'email',   cls:'info',    icon:'ri-mail-send-line',     who:'Kevin Manga',    verb:'sent email',          when:'4 days ago, 11:30am', title:'Brookfield site visit — Saturday', body:'Sent map + parking instructions for Saturday 10:00am visit.' },
    { kind:'meeting', cls:'success', icon:'ri-calendar-event-line',who:'Kevin Manga',    verb:'scheduled a meeting', when:'4 days ago, 11:35am', title:'Brookfield site walk',         body:'Saturday 10:00am · Brookfield gate · with Joseph + spouse.' },
    { kind:'note',    cls:'',        icon:'ri-sticky-note-line',   who:'Kevin Manga',    verb:'added a note',        when:'5 days ago, 9:14am',  title:'Spouse is the decision-maker',  body:'Joseph mentioned his wife wants to see Brookfield in person before signing.' },
    { kind:'task',    cls:'warn',    icon:'ri-task-line',          who:'Sara Ndong',     verb:'created a task',      when:'5 days ago, 4:02pm',  title:'Send updated price sheet',      body:'Priority medium · due Friday · assignee Kevin' },
    { kind:'call',    cls:'brand',   icon:'ri-phone-line',         who:'Kevin Manga',    verb:'attempted call',      when:'6 days ago, 2:45pm',  title:'No answer — left voicemail',   body:'Voicemail left asking him to call back about financing options.' },
    { kind:'email',   cls:'info',    icon:'ri-mail-line',          who:'Joseph Mensah',  verb:'replied',             when:'6 days ago, 5:18pm',  title:'Re: Financing options',         body:'Hi Kevin, can we explore a 20-year loan instead of 25? I want lower monthly.' },
    { kind:'note',    cls:'',        icon:'ri-sticky-note-line',   who:'Ama Owusu',      verb:'added a note',        when:'7 days ago, 10:01am', title:'Joseph asked for parcel #LND-014', body:'Specifically wants the corner plot near the playground.' },
    { kind:'task',    cls:'warn',    icon:'ri-task-line',          who:'Kevin Manga',    verb:'completed a task',    when:'7 days ago, 3:22pm',  title:'ID document review',            body:'Verified Ghana ID and proof of address. All clear.' },
    { kind:'call',    cls:'brand',   icon:'ri-phone-line',         who:'Kevin Manga',    verb:'logged a call',       when:'8 days ago, 11:00am', title:'Qualification call · 18 min',  body:'Income: GH₵ 18k/mo · employment 4yrs · ready to put 25% down.' },
    { kind:'email',   cls:'info',    icon:'ri-mail-send-line',     who:'Kevin Manga',    verb:'sent email',          when:'8 days ago, 11:45am', title:'Welcome to Ream',               body:'Sent welcome email with brochure attachments and next steps.' },
    { kind:'system',  cls:'success', icon:'ri-user-add-line',      who:'System',         verb:'auto-assigned',       when:'8 days ago, 11:42am', title:'Auto-assigned to Kevin Manga',  body:'Round-robin: Brookfield team, Kevin had lowest active load.' },
    { kind:'meeting', cls:'success', icon:'ri-vidicon-line',       who:'Sara Ndong',     verb:'scheduled a meeting', when:'9 days ago, 9:30am',  title:'Discovery Zoom',                body:'30 min Zoom · Joseph + spouse · https://zoom.us/j/123456' },
    { kind:'note',    cls:'',        icon:'ri-sticky-note-line',   who:'Kevin Manga',    verb:'added a note',        when:'10 days ago, 4:18pm', title:'Referred by Ama Owusu',         body:'Code REF-AMA-7P · referrer eligible for 1.5% commission.' },
    { kind:'task',    cls:'warn',    icon:'ri-task-line',          who:'Sara Ndong',     verb:'created a task',      when:'10 days ago, 4:30pm', title:'Send brochure pack',            body:'Priority high · due tomorrow · assignee Kevin' },
    { kind:'system',  cls:'',        icon:'ri-edit-line',          who:'System',         verb:'updated stage',       when:'11 days ago, 10:02am',title:'Stage moved to In progress',    body:'From New → In progress (auto on first contact).' },
    { kind:'call',    cls:'brand',   icon:'ri-phone-line',         who:'Daniel Boateng', verb:'logged a call',       when:'12 days ago, 1:11pm', title:'Initial outreach · 6 min',     body:'Quick chat — sent brochure to follow up.' },
    { kind:'email',   cls:'info',    icon:'ri-mail-send-line',     who:'Daniel Boateng', verb:'sent email',          when:'12 days ago, 1:20pm', title:'Brookfield brochure',           body:'Attached: Brookfield_brochure.pdf, Pricing_2025.pdf' },
    { kind:'note',    cls:'',        icon:'ri-sticky-note-line',   who:'Kevin Manga',    verb:'added a note',        when:'13 days ago, 2:08pm', title:'Strong intent signals',         body:'Mentioned twice he wants to close before December bonus expires.' },
    { kind:'system',  cls:'',        icon:'ri-flag-line',          who:'System',         verb:'created prospect',    when:'14 days ago, 9:00am', title:'New inbound lead',              body:'From ream.com/interest · IP 41.218.x.x' },
  ];
  function seedExtraActivities() {
    const tl = document.querySelector('.timeline');
    if (!tl || tl.dataset.seeded === '1') return;
    SEED.forEach(s => {
      const node = document.createElement('div');
      node.className = 'tl-item' + (s.cls ? ' ' + s.cls : '');
      node.setAttribute('data-kind', s.kind);
      node.innerHTML = `
        <div class="dot"><i class="${s.icon}"></i></div>
        <div class="tl-head">
          <div class="who">${s.who} <span>· ${s.verb}</span></div>
          <div class="when">${s.when}</div>
        </div>
        <div class="tl-title">${s.title}</div>
        <div class="tl-body">${s.body}</div>`;
      tl.appendChild(node);
    });
    tl.dataset.seeded = '1';
  }

  // --------- Page buttons (compact: 1 … 4 5 6 … 10) ----------
  function renderPageButtons(cur, total) {
    if (total <= 1) return '';
    const out = [];
    const push = (p, on) => out.push(`<button type="button" class="page${on ? ' on' : ''}" data-p="${p}">${p}</button>`);
    if (total <= 7) { for (let i = 1; i <= total; i++) push(i, i === cur); return out.join(''); }
    const window = [cur - 1, cur, cur + 1].filter(p => p > 1 && p < total);
    push(1, cur === 1);
    if (window[0] > 2) out.push('<span style="padding:0 4px;color:var(--fg4);">…</span>');
    window.forEach(p => push(p, p === cur));
    if (window[window.length - 1] < total - 1) out.push('<span style="padding:0 4px;color:var(--fg4);">…</span>');
    push(total, cur === total);
    return out.join('');
  }

  function boot() {
    seedExtraActivities();
    initActivity();
    initHistory();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
