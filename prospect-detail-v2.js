/* Prospect detail v2 — composer, activity list, dialog/drawer, tabs */
(function () {
  'use strict';

  // ============== Seed data ==============
  let nextId = 100;
  const now = new Date();
  const mins = (n) => new Date(now.getTime() - n * 60000);
  const days = (n) => new Date(now.getTime() - n * 86400000);

  let events = [
    { id: 1, kind: 'call', at: mins(120), author: 'Kevin Manga', tone: 'brand',
      title: 'Logged a 12-min call', outcome: 'Connected', duration: 12,
      description: "Spoke with Joseph about the Brookfield 3-bedroom. He's keen on a 25-year term but needs to confirm spouse's income before submitting payslips.",
      attachments: [] },
    { id: 2, kind: 'email', at: mins(105), author: 'Kevin Manga', tone: 'info',
      title: 'Sent “Documents we’ll need from you”',
      subject: "Documents we'll need from you", to: 'joseph.mensah@gmail.com', cc: '',
      description: "Hi Joseph — following our chat, here's the document checklist. Reply with these attached and we can move you to the offer stage by next week.",
      attachments: [{ name: 'Document_checklist.pdf', size: '124 KB' }] },
    { id: 3, kind: 'note', at: days(1), author: 'Kevin Manga', tone: 'neutral',
      title: 'Added a note',
      description: 'Joseph mentioned his employer is Ghana Commercial Bank — verified income source, low risk.',
      attachments: [] },
    { id: 4, kind: 'task', at: days(1), author: 'Sara Ndong', tone: 'warn',
      title: 'Created task · "Schedule site visit"',
      taskTitle: 'Schedule site visit', priority: 'high', target: 'agent',
      assignee: 'Kevin Manga', due: 'Nov 12, 2025',
      description: 'Confirm time with Joseph after his work hours.', attachments: [] },
    { id: 13, kind: 'request', at: days(1), author: 'Kevin Manga', tone: 'warn',
      title: 'Requested proof from Joseph · "Last 3 pay stubs"',
      reqTitle: 'Last 3 pay stubs', reqType: 'Income proof (pay stubs / tax return)',
      reqMethod: 'Email + portal notification', reqTo: 'joseph.mensah@gmail.com',
      due: 'Nov 14, 2025',
      description: 'Need three most recent monthly pay stubs to begin underwriting.',
      attachments: [] },
    { id: 5, kind: 'email', at: days(2), author: 'Joseph Mensah', tone: 'info',
      title: 'Replied to "Welcome to Ream"',
      subject: 'Re: Welcome to Ream', to: 'kevin@ream.com', cc: '',
      description: "Thanks Kevin, looking forward to chatting tomorrow.", attachments: [] },
    { id: 6, kind: 'meeting', at: days(2), author: 'Kevin Manga', tone: 'info',
      title: 'Scheduled meeting · "Site visit at Brookfield"',
      meetTitle: 'Site visit at Brookfield', meetType: 'in-person', provider: '',
      address: 'Plot 27, East Legon, Accra', link: '',
      when: 'Nov 12, 5:30pm',
      description: 'Walk-through with Joseph and partner.', attachments: [] },
    { id: 14, kind: 'meeting', at: days(2), author: 'Kevin Manga', tone: 'info',
      title: 'Scheduled meeting · "Financing chat"',
      meetTitle: 'Financing chat', meetType: 'online', provider: 'zoom',
      address: '', link: 'https://zoom.us/j/8472619305?pwd=ream',
      when: 'Nov 11, 4:00pm',
      description: 'Walk through 25-year vs 30-year scenarios.', attachments: [] },
    { id: 7, kind: 'call', at: days(3), author: 'Kevin Manga', tone: 'brand',
      title: 'Logged a call · 5 min · no answer',
      outcome: 'No answer', duration: 5,
      description: 'Voicemail left.', attachments: [] },
    { id: 8, kind: 'note', at: days(3), author: 'Kevin Manga', tone: 'neutral',
      title: 'Added a note',
      description: 'Pulled comparable plots; Brookfield #LND-014 is best fit.', attachments: [] },
    { id: 9, kind: 'task', at: days(4), author: 'Anita Owusu', tone: 'warn',
      title: 'Created task · "Run KYC pre-check"',
      taskTitle: 'Run KYC pre-check', priority: 'medium', target: 'agent',
      assignee: 'Anita Owusu', due: 'Nov 5, 2025',
      description: 'Standard pre-check before financing.', attachments: [] },
    { id: 10, kind: 'note', at: days(4), author: 'System', tone: 'success',
      title: 'Auto-assigned to Kevin Manga',
      description: 'Routing rule matched.', attachments: [] },
    { id: 11, kind: 'note', at: days(5), author: 'Kevin Manga', tone: 'neutral',
      title: 'Added a note',
      description: 'Strong intent signals from intro form.', attachments: [] },
    { id: 12, kind: 'note', at: days(6), author: 'System', tone: 'neutral',
      title: 'Created prospect from public form',
      description: 'Submitted via ream.com/interest.', attachments: [] },
  ];

  // ============== Helpers ==============
  const byId = (id) => document.getElementById(id);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const KIND_META = {
    note:    { icon: 'ri-sticky-note-line',    label: 'Note',    save: 'Save note',     placeholder: 'Add a note about Joseph…',                tone: 'neutral' },
    call:    { icon: 'ri-phone-line',          label: 'Call',    save: 'Log call',      placeholder: 'What was discussed on the call?',         tone: 'brand'   },
    email:   { icon: 'ri-mail-send-line',      label: 'Email',   save: 'Send email',    placeholder: 'Compose your email…',                     tone: 'info'    },
    task:    { icon: 'ri-task-line',           label: 'Task',    save: 'Create task',   placeholder: 'Add details for this task…',              tone: 'warn'    },
    meeting: { icon: 'ri-calendar-event-line', label: 'Meeting', save: 'Schedule',      placeholder: 'Agenda, attendees, anything to prepare…', tone: 'info'    },
    request: { icon: 'ri-upload-cloud-2-line', label: 'Request', save: 'Send request',  placeholder: 'Tell the prospect why you need this…',    tone: 'warn'    },
  };

  // Jira-style priority SVGs (matches the composer markup)
  const PRIO_ICON = {
    highest: '<span class="pi pi-highest"><svg viewBox="0 0 16 16" fill="none"><path d="M8 2.5l4 5H4l4-5z" fill="currentColor"/><path d="M8 8.5l4 5H4l4-5z" fill="currentColor"/></svg></span>',
    high:    '<span class="pi pi-high"><svg viewBox="0 0 16 16" fill="none"><path d="M8 4l5 6H3l5-6z" fill="currentColor"/></svg></span>',
    medium:  '<span class="pi pi-medium"><svg viewBox="0 0 16 16" fill="none"><rect x="2.5" y="5" width="11" height="2.2" rx="0.4" fill="currentColor"/><rect x="2.5" y="8.8" width="11" height="2.2" rx="0.4" fill="currentColor"/></svg></span>',
    low:     '<span class="pi pi-low"><svg viewBox="0 0 16 16" fill="none"><path d="M8 12l5-6H3l5 6z" fill="currentColor"/></svg></span>',
    lowest:  '<span class="pi pi-lowest"><svg viewBox="0 0 16 16" fill="none"><path d="M8 7.5l4-5H4l4 5z" fill="currentColor"/><path d="M8 13.5l4-5H4l4 5z" fill="currentColor"/></svg></span>',
  };

  function fmtRel(d) {
    const ms = now - d;
    const m = Math.round(ms / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    const h = Math.round(m / 60);
    if (h < 24) return h + 'h ago';
    const dy = Math.round(h / 24);
    if (dy === 1) return 'Yesterday';
    if (dy < 7) return dy + 'd ago';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  function fmtTime(d) { return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
  function dayLabel(d) {
    const today = new Date(); today.setHours(0,0,0,0);
    const yest = new Date(today.getTime() - 86400000);
    const x = new Date(d); x.setHours(0,0,0,0);
    if (x.getTime() === today.getTime()) return 'Today';
    if (x.getTime() === yest.getTime()) return 'Yesterday';
    const diff = Math.round((today - x) / 86400000);
    if (diff < 7) return diff + ' days ago';
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  // ============== State ==============
  let filterKind = 'all';
  let filterRange = 'all';   // all | 7 | 30 | 90
  let filterAuthor = 'all';
  let page = 1;
  const PAGE_SIZE = 5;

  // ============== Composer: kind switching ==============
  const composer = byId('composer');
  const tabs = $$('#composerTabs button');
  const fieldsets = $$('.pdv2-fields', composer);
  const ta = byId('composerBody');
  const saveLabel = byId('composerSaveLabel');
  let currentKind = 'note';
  let editingId = null;

  function setKind(kind) {
    currentKind = kind;
    tabs.forEach(t => t.classList.toggle('active', t.dataset.kind === kind));
    fieldsets.forEach(f => { f.hidden = f.dataset.kind !== kind; });
    const meta = KIND_META[kind];
    if (ta) ta.placeholder = meta.placeholder;
    if (saveLabel) saveLabel.textContent = editingId ? 'Save changes' : meta.save;
  }
  tabs.forEach(t => t.addEventListener('click', () => setKind(t.dataset.kind)));

  // Generic segmented control wiring (priority, task target, meeting type)
  function wireSeg(rootId, dataAttr, onChange) {
    const el = byId(rootId); if (!el) return;
    el.addEventListener('click', e => {
      const b = e.target.closest('button[data-' + dataAttr + ']'); if (!b) return;
      $$('button', el).forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      el.dataset.value = b.dataset[dataAttr];
      onChange && onChange(el.dataset.value);
    });
  }
  wireSeg('cf-task-priority', 'p');
  wireSeg('cf-task-target', 'tgt', (v) => {
    const lbl = byId('cf-task-assignee-label');
    const sel = byId('cf-task-assignee');
    if (v === 'prospect') {
      lbl.textContent = 'Prospect';
      sel.innerHTML = '<option>Joseph Mensah</option>';
    } else {
      lbl.textContent = 'Assignee';
      sel.innerHTML = ['Kevin Manga (me)', 'Anita Owusu', 'Daniel Boateng', 'Esi Mensah', 'Yaw Acheampong']
        .map(n => `<option>${n}</option>`).join('');
    }
  });
  wireSeg('cf-meet-type', 't', (v) => {
    const isOnline = v === 'online';
    byId('cf-meet-providers-wrap').hidden = !isOnline;
    byId('cf-meet-genlink-wrap').hidden = !isOnline;
    byId('cf-meet-loc-wrap').hidden = isOnline;
    byId('cf-meet-loc').placeholder = isOnline ? 'https://meet.google.com/…' : 'Plot 27, East Legon';
    byId('cf-meet-loc-label').textContent = isOnline ? 'Meeting link' : 'Address';
  });

  // Provider picker
  const provs = byId('cf-meet-providers');
  if (provs) {
    provs.addEventListener('click', e => {
      const b = e.target.closest('button[data-pv]'); if (!b) return;
      $$('button', provs).forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      provs.dataset.value = b.dataset.pv;
      // reset link display when provider changes
      const disp = byId('cf-meet-genlink-display');
      disp.textContent = 'No link yet — generate one or paste your own above';
      disp.classList.remove('has-link');
      byId('cf-meet-genlink-copy').hidden = true;
    });
  }

  // Generate link
  const genBtn = byId('cf-meet-genlink-btn');
  if (genBtn) {
    genBtn.addEventListener('click', () => {
      const pv = provs.dataset.value || 'zoom';
      const id = Math.random().toString(36).slice(2, 12);
      const link = pv === 'zoom'
        ? `https://zoom.us/j/${Math.floor(Math.random()*9e9)+1e9}?pwd=${id}`
        : pv === 'teams'
          ? `https://teams.microsoft.com/l/meetup-join/19%3a${id}%40thread.v2/0`
          : `https://meet.google.com/${id.slice(0,3)}-${id.slice(3,7)}-${id.slice(7,10)}`;
      const disp = byId('cf-meet-genlink-display');
      disp.textContent = link;
      disp.classList.add('has-link');
      byId('cf-meet-genlink-copy').hidden = false;
      byId('cf-meet-loc').value = link;
      toast(pv === 'meet' ? 'Google Meet link created' : pv === 'teams' ? 'Teams link created' : 'Zoom link created');
    });
  }
  const copyLinkBtn = byId('cf-meet-genlink-copy');
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', () => {
      const t = byId('cf-meet-genlink-display').textContent;
      if (navigator.clipboard) navigator.clipboard.writeText(t).catch(()=>{});
      toast('Link copied');
    });
  }

  // Composer attachments
  const fileInput = byId('composerFiles');
  const attachedDiv = byId('composerAttached');
  let attached = [];
  function renderAttached() {
    attachedDiv.innerHTML = attached.map((a, i) =>
      `<span class="chip"><i class="ri-attachment-2"></i>${escapeHtml(a.name)} <button type="button" data-i="${i}" title="Remove">✕</button></span>`
    ).join('');
  }
  attachedDiv.addEventListener('click', e => {
    const b = e.target.closest('button[data-i]'); if (!b) return;
    attached.splice(+b.dataset.i, 1); renderAttached();
  });
  if (fileInput) {
    fileInput.addEventListener('change', () => {
      Array.from(fileInput.files).forEach(f => attached.push({ name: f.name, size: Math.round(f.size/1024)+' KB' }));
      fileInput.value = '';
      renderAttached();
    });
  }
  const attachBtn = composer.querySelector('.toolbar-attach-btn');
  if (attachBtn) {
    attachBtn.addEventListener('click', () => fileInput.click());
    attachBtn.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); fileInput.click(); } });
  }

  function resetComposer() {
    editingId = null;
    composer.classList.remove('is-active');
    setKind('note');
    ta.value = '';
    attached = []; renderAttached();
    [
      'cf-call-duration','cf-email-subject','cf-email-cc',
      'cf-task-title','cf-task-due','cf-meet-title','cf-meet-when','cf-meet-loc',
      'cf-req-title','cf-req-due'
    ].forEach(id => { const el = byId(id); if (el) el.value = id === 'cf-call-duration' ? 10 : ''; });
    byId('cf-email-to').value = 'joseph.mensah@gmail.com';
    byId('cf-call-outcome').value = 'Connected';
    byId('cf-task-assignee').value = 'Kevin Manga (me)';
    if (byId('cf-req-to')) byId('cf-req-to').value = 'joseph.mensah@gmail.com';
    // reset meeting genlink
    const disp = byId('cf-meet-genlink-display');
    if (disp) { disp.textContent = 'No link yet — generate one or paste your own above'; disp.classList.remove('has-link'); }
    if (byId('cf-meet-genlink-copy')) byId('cf-meet-genlink-copy').hidden = true;
  }

  // Save
  byId('composerSave').addEventListener('click', () => {
    const desc = ta.value.trim();
    const meta = KIND_META[currentKind];
    const base = {
      kind: currentKind, at: new Date(), author: 'Kevin Manga',
      tone: meta.tone, description: desc, attachments: attached.slice(),
    };
    if (currentKind === 'note') Object.assign(base, { title: 'Added a note' });
    if (currentKind === 'call') Object.assign(base, {
      title: 'Logged a ' + (byId('cf-call-duration').value || 0) + '-min call',
      outcome: byId('cf-call-outcome').value,
      duration: +byId('cf-call-duration').value || 0,
    });
    if (currentKind === 'email') Object.assign(base, {
      title: 'Sent “' + (byId('cf-email-subject').value.trim() || 'No subject') + '”',
      subject: byId('cf-email-subject').value.trim(),
      to: byId('cf-email-to').value.trim(),
      cc: byId('cf-email-cc').value.trim(),
    });
    if (currentKind === 'task') {
      const target = byId('cf-task-target').dataset.value || 'agent';
      Object.assign(base, {
        title: 'Created task · "' + (byId('cf-task-title').value.trim() || 'Untitled') + '"',
        taskTitle: byId('cf-task-title').value.trim(),
        priority: byId('cf-task-priority').dataset.value,
        target,
        assignee: byId('cf-task-assignee').value,
        due: byId('cf-task-due').value || '—',
      });
    }
    if (currentKind === 'request') Object.assign(base, {
      title: 'Requested proof from prospect · "' + (byId('cf-req-title').value.trim() || 'Untitled') + '"',
      reqTitle: byId('cf-req-title').value.trim(),
      reqType: byId('cf-req-type').value,
      reqMethod: byId('cf-req-method').value,
      reqTo: byId('cf-req-to').value.trim(),
      due: byId('cf-req-due').value || '—',
    });
    if (currentKind === 'meeting') {
      const t = byId('cf-meet-type').dataset.value;
      Object.assign(base, {
        title: 'Scheduled meeting · "' + (byId('cf-meet-title').value.trim() || 'Untitled') + '"',
        meetTitle: byId('cf-meet-title').value.trim(),
        meetType: t,
        provider: t === 'online' ? (byId('cf-meet-providers').dataset.value || 'zoom') : '',
        when: byId('cf-meet-when').value || '—',
        address: t === 'in-person' ? byId('cf-meet-loc').value : '',
        link:    t === 'online'    ? byId('cf-meet-loc').value : '',
      });
    }

    if (editingId) {
      const i = events.findIndex(e => e.id === editingId);
      if (i > -1) events[i] = Object.assign({}, events[i], base, { id: editingId });
      toast('Activity updated');
    } else {
      base.id = ++nextId;
      events.unshift(base);
      toast(meta.label + ' saved');
    }
    resetComposer();
    page = 1;
    render();
  });
  composer.addEventListener('focusin', () => composer.classList.add('is-active'));

  // ============== Filters ==============
  const filtersEl = byId('pdv2Filters');
  filtersEl.addEventListener('click', e => {
    const b = e.target.closest('.pdv2-filter'); if (!b) return;
    $$('.pdv2-filter', filtersEl).forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    filterKind = b.dataset.f;
    page = 1;
    render();
  });
  // Date range + author selects (rendered in HTML)
  const rangeSel = byId('pdv2FilterRange');
  if (rangeSel) rangeSel.addEventListener('change', () => { filterRange = rangeSel.value; page = 1; render(); });
  const authorSel = byId('pdv2FilterAuthor');
  if (authorSel) authorSel.addEventListener('change', () => { filterAuthor = authorSel.value; page = 1; render(); });
  const clearBtn = byId('pdv2FilterClear');
  if (clearBtn) clearBtn.addEventListener('click', () => {
    filterKind = 'all'; filterRange = 'all'; filterAuthor = 'all';
    if (rangeSel) rangeSel.value = 'all';
    if (authorSel) authorSel.value = 'all';
    $$('.pdv2-filter', filtersEl).forEach(x => x.classList.toggle('on', x.dataset.f === 'all'));
    page = 1; render();
  });

  // ============== Render ==============
  const listEl = byId('pdv2EventList');
  const pagesEl = byId('pdv2Pages');
  const pageInfoEl = byId('pdv2PageInfo');

  function getCounts() {
    const c = { all: events.length, note:0, call:0, email:0, task:0, meeting:0, request:0 };
    events.forEach(e => { if (c[e.kind] != null) c[e.kind]++; });
    return c;
  }
  function applyFilters(arr) {
    let out = arr;
    if (filterKind !== 'all') out = out.filter(e => e.kind === filterKind);
    if (filterRange !== 'all') {
      const cutoff = new Date(now.getTime() - (+filterRange) * 86400000);
      out = out.filter(e => new Date(e.at) >= cutoff);
    }
    if (filterAuthor !== 'all') out = out.filter(e => e.author === filterAuthor);
    return out;
  }
  function eventLineHtml(ev) {
    const author = `<strong>${escapeHtml(ev.author)}</strong>`;
    return `${author} <em>${escapeHtml(ev.title.replace(ev.author + ' ', ''))}</em>`;
  }
  function eventMetaHtml(ev) {
    const pills = [];
    if (ev.kind === 'call') {
      pills.push(`<span class="pill"><i class="ri-pulse-line"></i>${escapeHtml(ev.outcome || '')}</span>`);
      pills.push(`<span class="pill"><i class="ri-time-line"></i>${ev.duration || 0} min</span>`);
    }
    if (ev.kind === 'email') {
      if (ev.cc) pills.push(`<span class="pill"><i class="ri-team-line"></i>cc ${escapeHtml(ev.cc)}</span>`);
    }
    if (ev.kind === 'task') {
      const p = ev.priority || 'medium';
      pills.push(`<span class="pill">${PRIO_ICON[p] || ''}<span style="margin-left:2px; text-transform:capitalize;">${escapeHtml(p)}</span></span>`);
      const tIcon = ev.target === 'prospect' ? 'ri-user-3-line' : 'ri-user-star-line';
      const tLbl = ev.target === 'prospect' ? 'Prospect' : 'Agent';
      pills.push(`<span class="pill"><i class="${tIcon}"></i>${tLbl}: ${escapeHtml(ev.assignee || '')}</span>`);
      if (ev.due && ev.due !== '—') pills.push(`<span class="pill"><i class="ri-calendar-line"></i>Due ${escapeHtml(ev.due)}</span>`);
    }
    if (ev.kind === 'request') {
      pills.push(`<span class="pill"><i class="ri-upload-cloud-2-line"></i>${escapeHtml(ev.reqType || 'Proof')}</span>`);
      if (ev.reqMethod) pills.push(`<span class="pill"><i class="ri-send-plane-line"></i>${escapeHtml(ev.reqMethod)}</span>`);
      if (ev.due && ev.due !== '—') pills.push(`<span class="pill"><i class="ri-calendar-line"></i>Due ${escapeHtml(ev.due)}</span>`);
    }
    if (ev.kind === 'meeting') {
      if (ev.meetType === 'online') {
        const pv = ev.provider || 'zoom';
        const pvLbl = pv === 'meet' ? 'Google Meet' : pv === 'teams' ? 'Teams' : 'Zoom';
        pills.push(`<span class="pill"><i class="ri-vidicon-line"></i>${pvLbl}</span>`);
      } else {
        pills.push(`<span class="pill"><i class="ri-map-pin-line"></i>In-person</span>`);
      }
      if (ev.when && ev.when !== '—') pills.push(`<span class="pill"><i class="ri-calendar-line"></i>${escapeHtml(ev.when)}</span>`);
    }
    if (ev.attachments && ev.attachments.length) {
      pills.push(`<span class="pill"><i class="ri-attachment-2"></i>${ev.attachments.length} file${ev.attachments.length>1?'s':''}</span>`);
    }
    return pills.length ? `<div class="pdv2-event-meta">${pills.join('')}</div>` : '';
  }

  function render() {
    const counts = getCounts();
    Object.entries(counts).forEach(([k, v]) => {
      const el = byId('cnt-' + k); if (el) el.textContent = v;
    });
    const navAct = byId('pdv2NavActCnt');
    if (navAct) navAct.textContent = counts.all;
    byId('pdv2EventCount').textContent = counts.all + ' event' + (counts.all === 1 ? '' : 's');

    // Populate author dropdown options once
    if (authorSel && !authorSel.dataset.populated) {
      const authors = Array.from(new Set(events.map(e => e.author))).sort();
      authorSel.innerHTML = `<option value="all">Anyone</option>` + authors.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
      authorSel.dataset.populated = '1';
    }

    const filtered = applyFilters(events);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (page > totalPages) page = totalPages;
    const start = (page - 1) * PAGE_SIZE;
    const slice = filtered.slice(start, start + PAGE_SIZE);

    if (slice.length === 0) {
      listEl.innerHTML = `<div class="pdv2-empty"><i class="ri-inbox-line"></i>No matching activity. Try clearing filters.</div>`;
    } else {
      let html = '';
      let lastDay = '';
      slice.forEach(ev => {
        const d = ev.at instanceof Date ? ev.at : new Date(ev.at);
        const day = dayLabel(d);
        if (day !== lastDay) {
          html += `<div class="pdv2-day-head">${escapeHtml(day)}</div>`;
          lastDay = day;
        }
        html += `
          <div class="pdv2-event" data-id="${ev.id}">
            <div class="pdv2-event-icon ${ev.tone || 'neutral'}"><i class="${KIND_META[ev.kind].icon}"></i></div>
            <div class="pdv2-event-body">
              <div class="pdv2-event-line">${eventLineHtml(ev)}</div>
              ${ev.description ? `<div class="pdv2-event-detail">${escapeHtml(ev.description)}</div>` : ''}
              ${eventMetaHtml(ev)}
            </div>
            <div style="display:flex; align-items:flex-start; gap:6px;">
              <div class="pdv2-event-when">${escapeHtml(fmtTime(d))}</div>
              <div class="pdv2-event-actions">
                <button class="pdv2-event-menu-btn" type="button" aria-haspopup="true" aria-expanded="false" data-id="${ev.id}"><i class="ri-more-2-fill"></i></button>
                <div class="pdv2-event-pop" data-pop-for="${ev.id}">
                  <button type="button" data-act="view" data-id="${ev.id}"><i class="ri-eye-line"></i> View</button>
                  <button type="button" data-act="edit" data-id="${ev.id}"><i class="ri-edit-line"></i> Edit</button>
                  <button type="button" class="danger" data-act="delete" data-id="${ev.id}"><i class="ri-delete-bin-line"></i> Delete</button>
                </div>
              </div>
            </div>
          </div>`;
      });
      listEl.innerHTML = html;
    }
    renderPagination(filtered.length, totalPages);
  }

  function renderPagination(total, totalPages) {
    if (total === 0) { pageInfoEl.textContent = '0 results'; pagesEl.innerHTML = ''; return; }
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(total, start + PAGE_SIZE - 1);
    pageInfoEl.textContent = `${start}–${end} of ${total}`;
    let html = `<button type="button" data-p="prev" ${page === 1 ? 'disabled' : ''}><i class="ri-arrow-left-s-line"></i></button>`;
    const pages = [];
    if (totalPages <= 7) { for (let i=1;i<=totalPages;i++) pages.push(i); }
    else {
      pages.push(1);
      if (page > 3) pages.push('…');
      for (let i = Math.max(2, page-1); i <= Math.min(totalPages-1, page+1); i++) pages.push(i);
      if (page < totalPages-2) pages.push('…');
      pages.push(totalPages);
    }
    pages.forEach(p => {
      if (p === '…') html += `<button class="dots" disabled>…</button>`;
      else html += `<button type="button" data-p="${p}" class="${p === page ? 'on' : ''}">${p}</button>`;
    });
    html += `<button type="button" data-p="next" ${page === totalPages ? 'disabled' : ''}><i class="ri-arrow-right-s-line"></i></button>`;
    pagesEl.innerHTML = html;
  }

  pagesEl.addEventListener('click', e => {
    const b = e.target.closest('button[data-p]'); if (!b || b.disabled) return;
    const filtered = applyFilters(events);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (b.dataset.p === 'prev') page = Math.max(1, page - 1);
    else if (b.dataset.p === 'next') page = Math.min(totalPages, page + 1);
    else page = +b.dataset.p;
    render();
  });

  // ============== Row action menu ==============
  document.addEventListener('click', e => {
    const btn = e.target.closest('.pdv2-event-menu-btn');
    const inPop = e.target.closest('.pdv2-event-pop');
    if (btn) {
      e.stopPropagation();
      const id = btn.dataset.id;
      const open = btn.getAttribute('aria-expanded') === 'true';
      $$('.pdv2-event-pop').forEach(p => p.dataset.open = 'false');
      $$('.pdv2-event-menu-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
      if (!open) {
        const pop = document.querySelector(`.pdv2-event-pop[data-pop-for="${id}"]`);
        if (pop) pop.dataset.open = 'true';
        btn.setAttribute('aria-expanded', 'true');
      }
      return;
    }
    if (inPop) {
      const action = e.target.closest('button[data-act]');
      if (!action) return;
      const id = +action.dataset.id;
      const ev = events.find(x => x.id === id);
      if (!ev) return;
      $$('.pdv2-event-pop').forEach(p => p.dataset.open = 'false');
      $$('.pdv2-event-menu-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
      if (action.dataset.act === 'view') openModal('view', ev);
      else if (action.dataset.act === 'edit') openModal('edit', ev);
      else if (action.dataset.act === 'delete') openModal('delete', ev);
      return;
    }
    $$('.pdv2-event-pop').forEach(p => p.dataset.open = 'false');
    $$('.pdv2-event-menu-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
  });

  // ============== Modal / Drawer ==============
  const modalBackdrop = byId('pdv2Modal');
  const modalCard = byId('pdv2ModalCard');
  function closeModal() { modalBackdrop.dataset.open = 'false'; modalCard.innerHTML = ''; }
  modalBackdrop.addEventListener('click', e => { if (e.target === modalBackdrop) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  function viewRow(label, value) {
    if (!value) return '';
    return `<div class="pdv2-vrow"><div class="lbl">${escapeHtml(label)}</div><div class="val">${value}</div></div>`;
  }

  function openModal(mode, ev) {
    const meta = KIND_META[ev.kind];
    if (mode === 'view') {
      let body = '';
      body += viewRow('Type', `<span class="pdv2-stage-pill" style="background: var(--color-grey-100); color: var(--color-grey-800); border:none;">${meta.label}</span>`);
      body += viewRow('When', escapeHtml(new Date(ev.at).toLocaleString()));
      body += viewRow('By', escapeHtml(ev.author));
      if (ev.kind === 'call') {
        body += viewRow('Outcome', escapeHtml(ev.outcome || ''));
        body += viewRow('Duration', (ev.duration || 0) + ' minutes');
      }
      if (ev.kind === 'email') {
        body += viewRow('Subject', escapeHtml(ev.subject || ''));
        body += viewRow('To', escapeHtml(ev.to || ''));
        if (ev.cc) body += viewRow('Cc', escapeHtml(ev.cc));
      }
      if (ev.kind === 'task') {
        body += viewRow('Title', escapeHtml(ev.taskTitle || ''));
        body += viewRow('Priority', `${PRIO_ICON[ev.priority || 'medium']} <span style="margin-left:6px; text-transform:capitalize;">${escapeHtml(ev.priority || 'medium')}</span>`);
        body += viewRow('Assigned to', `${ev.target === 'prospect' ? 'Prospect' : 'Agent'} — ${escapeHtml(ev.assignee || '')}`);
        body += viewRow('Due', escapeHtml(ev.due || ''));
      }
      if (ev.kind === 'request') {
        body += viewRow('Request', escapeHtml(ev.reqTitle || ''));
        body += viewRow('Type', escapeHtml(ev.reqType || ''));
        body += viewRow('Sent to', escapeHtml(ev.reqTo || ''));
        body += viewRow('Method', escapeHtml(ev.reqMethod || ''));
        body += viewRow('Due', escapeHtml(ev.due || ''));
      }
      if (ev.kind === 'meeting') {
        body += viewRow('Title', escapeHtml(ev.meetTitle || ''));
        if (ev.meetType === 'online') {
          const pv = ev.provider || 'zoom';
          const pvLbl = pv === 'meet' ? 'Google Meet' : pv === 'teams' ? 'Microsoft Teams' : 'Zoom';
          body += viewRow('Type', 'Online · ' + pvLbl);
          if (ev.link) body += viewRow('Link', `<a href="${escapeHtml(ev.link)}" target="_blank" rel="noopener" style="color: var(--color-brand-600);">${escapeHtml(ev.link)}</a>`);
        } else {
          body += viewRow('Type', 'In-person');
          if (ev.address) body += viewRow('Address', escapeHtml(ev.address));
        }
        body += viewRow('When', escapeHtml(ev.when || ''));
      }
      body += viewRow('Description', escapeHtml(ev.description || '—').replace(/\n/g, '<br/>'));
      if (ev.attachments && ev.attachments.length) {
        body += viewRow('Attachments',
          ev.attachments.map(a => `<div class="pdv2-doc" style="display:inline-flex; padding:8px 12px; margin:4px 4px 0 0; border-radius:8px;"><i class="ri-file-line" style="color: var(--color-grey-700); font-size:16px;"></i><span style="font:13px var(--font-sans); color: var(--color-grey-800);">${escapeHtml(a.name)}${a.size ? ' · ' + escapeHtml(a.size) : ''}</span></div>`).join('')
        );
      }

      modalCard.innerHTML = `
        <div class="pdv2-modal-head">
          <div class="ttl"><span class="ico"><i class="${meta.icon}"></i></span>${escapeHtml(ev.title || meta.label)}</div>
          <button class="pdv2-modal-close" id="modalCloseBtn" type="button" aria-label="Close"><i class="ri-close-line"></i></button>
        </div>
        <div class="pdv2-modal-body">${body}</div>
        <div class="pdv2-modal-foot">
          <button class="pdv2-btn pdv2-btn-danger" data-act="delete-now"><i class="ri-delete-bin-line"></i> Delete</button>
          <div class="right">
            <button class="pdv2-btn pdv2-btn-secondary" id="modalCancel">Close</button>
            <button class="pdv2-btn pdv2-btn-primary" data-act="edit-now"><i class="ri-edit-line"></i> Edit</button>
          </div>
        </div>`;
      modalBackdrop.dataset.open = 'true';
      byId('modalCloseBtn').onclick = closeModal;
      byId('modalCancel').onclick = closeModal;
      modalCard.querySelector('[data-act="edit-now"]').onclick = () => { closeModal(); openModal('edit', ev); };
      modalCard.querySelector('[data-act="delete-now"]').onclick = () => { closeModal(); openModal('delete', ev); };
      return;
    }

    if (mode === 'delete') {
      modalCard.innerHTML = `
        <div class="pdv2-modal-head">
          <div class="ttl"><span class="ico" style="background: var(--color-error-50); color: var(--color-error-700);"><i class="ri-delete-bin-line"></i></span>Delete this ${escapeHtml(meta.label.toLowerCase())}?</div>
          <button class="pdv2-modal-close" id="modalCloseBtn" type="button" aria-label="Close"><i class="ri-close-line"></i></button>
        </div>
        <div class="pdv2-modal-body">
          <p style="margin:0; color: var(--color-grey-800); font: 14px var(--font-sans); line-height:1.5;">This will permanently remove "${escapeHtml(ev.title || meta.label)}" from this prospect's activity. You can't undo this.</p>
        </div>
        <div class="pdv2-modal-foot">
          <span></span>
          <div class="right">
            <button class="pdv2-btn pdv2-btn-secondary" id="modalCancel">Cancel</button>
            <button class="pdv2-btn pdv2-btn-primary" id="modalConfirm" style="background: var(--color-error-700);"><i class="ri-delete-bin-line"></i> Delete</button>
          </div>
        </div>`;
      modalBackdrop.dataset.open = 'true';
      byId('modalCloseBtn').onclick = closeModal;
      byId('modalCancel').onclick = closeModal;
      byId('modalConfirm').onclick = () => {
        events = events.filter(x => x.id !== ev.id);
        closeModal();
        toast('Activity deleted');
        render();
      };
      return;
    }

    // EDIT — load into composer
    closeModal();
    setKind(ev.kind);
    editingId = ev.id;
    composer.classList.add('is-active');
    saveLabel.textContent = 'Save changes';
    ta.value = ev.description || '';
    attached = (ev.attachments || []).slice();
    renderAttached();
    if (ev.kind === 'call') {
      byId('cf-call-outcome').value = ev.outcome || 'Connected';
      byId('cf-call-duration').value = ev.duration || 0;
    }
    if (ev.kind === 'email') {
      byId('cf-email-subject').value = ev.subject || '';
      byId('cf-email-to').value = ev.to || '';
      byId('cf-email-cc').value = ev.cc || '';
    }
    if (ev.kind === 'task') {
      byId('cf-task-title').value = ev.taskTitle || '';
      byId('cf-task-due').value = '';
      // priority
      const prioEl = byId('cf-task-priority');
      $$('button', prioEl).forEach(b => b.classList.toggle('on', b.dataset.p === (ev.priority || 'medium')));
      prioEl.dataset.value = ev.priority || 'medium';
      // target
      const tgtEl = byId('cf-task-target');
      const t = ev.target || 'agent';
      $$('button', tgtEl).forEach(b => b.classList.toggle('on', b.dataset.tgt === t));
      tgtEl.dataset.value = t;
      const lbl = byId('cf-task-assignee-label');
      const sel = byId('cf-task-assignee');
      if (t === 'prospect') {
        lbl.textContent = 'Prospect';
        sel.innerHTML = '<option>Joseph Mensah</option>';
      } else {
        lbl.textContent = 'Assignee';
        sel.innerHTML = ['Kevin Manga (me)', 'Anita Owusu', 'Daniel Boateng', 'Esi Mensah', 'Yaw Acheampong']
          .map(n => `<option ${n === ev.assignee ? 'selected' : ''}>${n}</option>`).join('');
      }
    }
    if (ev.kind === 'request') {
      byId('cf-req-title').value = ev.reqTitle || '';
      byId('cf-req-type').value = ev.reqType || byId('cf-req-type').options[0].value;
      byId('cf-req-method').value = ev.reqMethod || byId('cf-req-method').options[0].value;
      byId('cf-req-to').value = ev.reqTo || '';
      byId('cf-req-due').value = '';
    }
    if (ev.kind === 'meeting') {
      byId('cf-meet-title').value = ev.meetTitle || '';
      byId('cf-meet-when').value = '';
      const t = ev.meetType || 'in-person';
      const tEl = byId('cf-meet-type');
      $$('button', tEl).forEach(b => b.classList.toggle('on', b.dataset.t === t));
      tEl.dataset.value = t;
      byId('cf-meet-providers-wrap').hidden = t !== 'online';
      byId('cf-meet-genlink-wrap').hidden = t !== 'online';
      byId('cf-meet-loc-wrap').hidden = t === 'online';
      byId('cf-meet-loc').value = t === 'online' ? (ev.link || '') : (ev.address || '');
      byId('cf-meet-loc-label').textContent = t === 'online' ? 'Meeting link' : 'Address';
      if (t === 'online') {
        const pv = ev.provider || 'zoom';
        const pe = byId('cf-meet-providers');
        $$('button', pe).forEach(b => b.classList.toggle('on', b.dataset.pv === pv));
        pe.dataset.value = pv;
      }
    }
    composer.scrollIntoView({ block: 'center' });
    setTimeout(() => ta.focus(), 200);
    toast('Editing — save to update');
  }

  // ============== Tabs (true show/hide) ==============
  const navEl = byId('pdv2Nav');
  const navBtns = $$('button', navEl);
  const sections = ['overview','activity','asset','documents'].map(byId).filter(Boolean);

  function setActiveTab(id) {
    navBtns.forEach(b => b.classList.toggle('on', b.dataset.section === id));
    sections.forEach(s => { s.hidden = s.id !== id; });
    try { history.replaceState(null, '', '#' + id); } catch (_) {}
  }
  navEl.addEventListener('click', e => {
    const b = e.target.closest('button[data-section]'); if (!b) return;
    setActiveTab(b.dataset.section);
  });
  // Hero pill jump-to-tab support
  document.addEventListener('click', e => {
    const j = e.target.closest('[data-jump]'); if (!j) return;
    e.preventDefault();
    setActiveTab(j.dataset.jump);
    document.querySelector('.main')?.scrollTo?.({ top: 0, behavior: 'smooth' });
  });
  // Initial tab from URL hash
  const hash = (location.hash || '').replace('#', '');
  if (hash && sections.find(s => s.id === hash)) setActiveTab(hash);
  else setActiveTab('overview');

  // ============== Stage track click ==============
  const segs = $$('.pdv2-stage-track .seg');
  const labels = $$('.pdv2-stage-labels button');
  labels.forEach((btn, i) => btn.addEventListener('click', () => {
    segs.forEach((s, j) => { s.classList.remove('done', 'now'); if (j < i) s.classList.add('done'); else if (j === i) s.classList.add('now'); });
    labels.forEach((l, j) => { l.classList.remove('done', 'now'); if (j < i) l.classList.add('done'); else if (j === i) l.classList.add('now'); });
  }));

  // ============== Copy buttons ==============
  $$('.pdv2-contact-row .copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = btn.parentElement.querySelector('.v').textContent.trim();
      if (navigator.clipboard) navigator.clipboard.writeText(v).catch(()=>{});
      const i = btn.querySelector('i'), old = i.className;
      i.className = 'ri-check-line'; btn.style.color = 'var(--color-success-600)';
      setTimeout(() => { i.className = old; btn.style.color = ''; }, 1100);
      toast('Copied');
    });
  });

  // ============== Toast ==============
  const toastEl = byId('pdv2Toast');
  let toastTimer;
  function toast(msg) {
    toastEl.querySelector('span').textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
  }

  // ============== CTA flash ==============
  $$('.pdv2-hero-cta, .pdv2-mobile-cta .primary').forEach(b => {
    b.addEventListener('click', () => {
      b.style.transform = 'scale(0.96)';
      setTimeout(() => b.style.transform = '', 120);
    });
  });

  // ============== Init ==============
  setKind('note');
  render();
})();
