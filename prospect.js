// ============================================================
// prospect.js — interactivity for prospect-detail and prospect-public
// Wires up every button: composer, timeline filter, lifecycle stepper,
// quick actions, dialogs, public form behaviors.
// ============================================================

// ---------- Toast helper ----------
window.toast = toast;
window.confirmDialog = confirmDialog;
function toast(msg, opts) {
  opts = opts || {};
  let host = document.getElementById('toaster');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toaster';
    host.style.cssText = 'position:fixed;bottom:24px;right:24px;display:flex;flex-direction:column;gap:8px;z-index:10000;pointer-events:none;';
    document.body.appendChild(host);
  }
  const t = document.createElement('div');
  const colors = {
    success: ['#dcfce7', '#166534', '#86efac'],
    error: ['#fee2e2', '#991b1b', '#fca5a5'],
    info: ['#fff', '#1f2937', '#e5e7eb']
  };
  const [bg, fg, border] = colors[opts.kind || 'info'];
  t.style.cssText = `background:${bg};color:${fg};border:1px solid ${border};border-radius:10px;padding:10px 14px;font:500 13px var(--font-sans, system-ui);box-shadow:0 4px 12px rgba(0,0,0,0.08);pointer-events:auto;display:flex;gap:8px;align-items:center;max-width:340px;`;
  if (opts.icon) t.innerHTML = `<i class="${opts.icon}"></i><span>${msg}</span>`;
  else t.textContent = msg;
  host.appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity 0.3s, transform 0.3s'; t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; }, opts.duration || 2400);
  setTimeout(() => t.remove(), (opts.duration || 2400) + 320);
}

// ---------- Generic confirm dialog ----------
function confirmDialog(opts) {
  return new Promise(resolve => {
    const back = document.createElement('div');
    back.style.cssText = 'position:fixed;inset:0;background:rgba(15,14,22,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;';
    const card = document.createElement('div');
    card.style.cssText = 'background:white;border-radius:14px;width:100%;max-width:440px;padding:24px;box-shadow:0 20px 50px rgba(0,0,0,0.2);';
    card.innerHTML = `
      <div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:16px;">
        <div style="width:40px;height:40px;border-radius:50%;background:${opts.iconBg || 'var(--color-brand-50)'};color:${opts.iconColor || 'var(--color-brand-600)'};display:inline-flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;"><i class="${opts.icon || 'ri-question-line'}"></i></div>
        <div style="flex:1;">
          <h3 style="margin:0 0 6px;font:600 16px var(--font-sans);color:var(--color-grey-900);">${opts.title}</h3>
          <p style="margin:0;font:400 13px var(--font-sans);color:var(--fg2);line-height:1.5;">${opts.message}</p>
        </div>
      </div>
      ${opts.input ? `<input id="cdInput" type="text" placeholder="${opts.placeholder || ''}" style="width:100%;border:1px solid var(--border-default);border-radius:8px;padding:10px 12px;font:14px var(--font-sans);margin-bottom:16px;outline:none;" />` : ''}
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button data-act="cancel" style="background:none;border:1px solid var(--border-default);padding:9px 16px;border-radius:8px;font:500 13px var(--font-sans);cursor:pointer;color:var(--fg2);">${opts.cancelText || 'Cancel'}</button>
        <button data-act="ok" style="background:${opts.danger ? 'var(--color-error-600)' : 'var(--color-brand-600)'};color:white;border:none;padding:9px 16px;border-radius:8px;font:500 13px var(--font-sans);cursor:pointer;">${opts.okText || 'Confirm'}</button>
      </div>
    `;
    back.appendChild(card);
    document.body.appendChild(back);
    const close = (val) => { back.remove(); resolve(val); };
    back.addEventListener('click', e => { if (e.target === back) close(null); });
    card.querySelector('[data-act=cancel]').onclick = () => close(null);
    card.querySelector('[data-act=ok]').onclick = () => {
      if (opts.input) close(card.querySelector('#cdInput').value || null);
      else close(true);
    };
    if (opts.input) card.querySelector('#cdInput').focus();
  });
}

// ============================================================
// PROSPECT DETAIL PAGE
// ============================================================
(function initProspectDetail() {
  if (!document.querySelector('.lc-card')) return; // not on detail page

  // ---------- Topbar nav ----------
  document.querySelectorAll('.topbar .actions .btn').forEach(b => {
    if (b.textContent.includes('Prev')) b.onclick = () => toast('Previous prospect: Sarah Khalid', { icon: 'ri-arrow-left-s-line' });
    else if (b.textContent.includes('Next')) b.onclick = () => toast('Next prospect: Marcus Owusu', { icon: 'ri-arrow-right-s-line' });
  });
  const moreBtn = document.querySelector('.topbar .actions .icon-btn');
  if (moreBtn) moreBtn.onclick = (e) => {
    e.stopPropagation();
    const existing = document.querySelector('.topbar-pop');
    if (existing) { existing.remove(); return; }
    const pop = document.createElement('div');
    pop.className = 'topbar-pop';
    pop.style.cssText = 'position:absolute;background:white;border:1px solid var(--border-default);border-radius:10px;padding:4px;box-shadow:0 12px 32px rgba(0,0,0,0.12);min-width:200px;z-index:10001;display:flex;flex-direction:column;font:13px var(--font-sans);';
    const items = [
      ['ri-printer-line', 'Print', () => window.print()],
      ['ri-download-line', 'Export as PDF', () => toast('PDF exported', { kind: 'success', icon: 'ri-file-pdf-line' })],
      ['ri-share-forward-line', 'Share link', () => { navigator.clipboard?.writeText(location.href); toast('Link copied', { kind: 'success', icon: 'ri-link' }); }],
      ['ri-flag-line', 'Flag for review', () => toast('Flagged for review', { icon: 'ri-flag-line' })],
      ['SEP', '', null],
      ['ri-archive-line', 'Archive prospect', async () => {
        const ok = await confirmDialog({ title: 'Archive this prospect?', message: 'They will be hidden from the active pipeline. You can restore later.', okText: 'Archive', danger: true, icon: 'ri-archive-line', iconBg: 'var(--color-error-50)', iconColor: 'var(--color-error-600)' });
        if (ok) toast('Archived', { icon: 'ri-archive-line' });
      }],
      ['ri-delete-bin-line', 'Delete prospect', async () => {
        const ok = await confirmDialog({ title: 'Delete this prospect?', message: 'This cannot be undone. All notes, calls, and history will be lost.', okText: 'Delete', danger: true, icon: 'ri-delete-bin-line', iconBg: 'var(--color-error-50)', iconColor: 'var(--color-error-600)' });
        if (ok) toast('Prospect deleted', { kind: 'error', icon: 'ri-delete-bin-line' });
      }, true]
    ];
    items.forEach(([icon, label, fn, danger]) => {
      if (icon === 'SEP') { const s = document.createElement('div'); s.style.cssText = 'height:1px;background:var(--border-subtle);margin:4px 6px;'; pop.appendChild(s); return; }
      const b = document.createElement('button');
      b.style.cssText = `background:none;border:none;cursor:pointer;text-align:left;padding:8px 10px;border-radius:6px;display:flex;align-items:center;gap:8px;color:${danger?'var(--color-error-700)':'var(--color-grey-800)'};`;
      b.innerHTML = `<i class="${icon}" style="font-size:14px;color:${danger?'var(--color-error-600)':'var(--fg3)'};width:14px;"></i>${label}`;
      b.onmouseenter = () => b.style.background = danger ? 'var(--color-error-50)' : 'var(--color-grey-50)';
      b.onmouseleave = () => b.style.background = 'none';
      b.onclick = () => { pop.remove(); fn(); };
      pop.appendChild(b);
    });
    document.body.appendChild(pop);
    const r = moreBtn.getBoundingClientRect();
    pop.style.top = (r.bottom + 6) + 'px';
    pop.style.left = Math.max(8, r.right - 200) + 'px';
    setTimeout(() => document.addEventListener('click', () => pop.remove(), { once: true }), 0);
  };

  // Breadcrumb avatar + badge clickable
  document.querySelectorAll('.badge').forEach(b => {
    if (!b.onclick) b.style.cursor = 'pointer';
    b.addEventListener('click', () => toast(`Status: ${b.textContent.trim()}`, { icon: 'ri-flag-line' }));
  });

  // ---------- Header buttons ----------
  document.querySelectorAll('.btn').forEach(b => {
    const t = b.textContent.trim();
    if (t.includes('Reassign')) b.onclick = () => openReassignPicker(b);
    if (t.includes('Schedule meeting')) b.onclick = () => openMeetingDialog();
    if (t.includes('Convert to customer')) b.onclick = () => openConvertDialog();
  });

  // ---------- Lifecycle ----------
  const steps = document.querySelectorAll('.lifecycle .step');
  const stepNames = ['Created', 'In progress', 'Scheduled', 'Approved', 'Abandoned'];
  steps.forEach((s, i) => {
    s.onclick = () => toast(`Stage: ${stepNames[i]}`, { icon: 'ri-flag-line' });
  });
  document.querySelectorAll('.btn-text').forEach(b => {
    if (b.textContent.includes('Move to next stage')) b.onclick = async () => {
      const ok = await confirmDialog({
        title: 'Move to "Scheduled"?',
        message: 'This prospect will advance to the next lifecycle stage. The team will be notified.',
        okText: 'Move to Scheduled', icon: 'ri-arrow-right-circle-line'
      });
      if (ok) {
        const cur = document.querySelector('.lifecycle .step.current');
        const next = cur && cur.nextElementSibling;
        if (cur && next) {
          cur.classList.remove('current'); cur.classList.add('done');
          cur.querySelector('.dot').innerHTML = '<i class="ri-check-line"></i>';
          next.classList.add('current');
          // update header pill
          const pill = document.querySelector('.badge.badge-warning');
          if (pill) { pill.textContent = 'Scheduled'; pill.classList.remove('badge-warning'); pill.classList.add('badge-info'); pill.style.cssText = 'background:var(--color-blue-50);color:var(--color-blue-700);'; }
          // update lifecycle subtitle
          const sub = document.querySelector('.lc-card div[style*="font-size:14px"]');
          if (sub) sub.innerHTML = 'Currently <strong style="color:var(--color-blue-700);">Scheduled</strong> — site visit booked';
        }
        toast('Moved to Scheduled', { kind: 'success', icon: 'ri-check-line' });
      }
    };
  });

  // ---------- Profile quick actions ----------
  document.querySelectorAll('.quick-actions .btn').forEach(b => {
    const label = b.textContent.trim();
    b.onclick = () => {
      const map = {
        'Call':     ['Calling +233 24 880 1142…', 'ri-phone-line'],
        'Email':    ['Composing email to joseph.mensah@gmail.com', 'ri-mail-send-line'],
        'SMS':      ['Opening SMS thread', 'ri-message-3-line'],
        'WhatsApp': ['Opening WhatsApp', 'ri-whatsapp-line']
      };
      const [m, i] = map[label] || [label, 'ri-information-line'];
      toast(m, { icon: i });
    };
  });

  // Profile email link
  document.querySelectorAll('.profile-fields .v a').forEach(a => {
    a.onclick = (e) => { e.preventDefault(); toast('Composing email to ' + a.textContent, { icon: 'ri-mail-send-line' }); };
  });

  // Change agent
  document.querySelectorAll('.rail-card h3 a').forEach(a => {
    if (a.textContent.trim() === 'Change') a.onclick = async (e) => {
      e.preventDefault();
      const v = await confirmDialog({
        title: 'Change assigned agent',
        message: 'Who should take over this prospect?',
        input: true, placeholder: 'Type agent name…',
        okText: 'Change agent', icon: 'ri-user-shared-line'
      });
      if (v) toast(`Agent changed to ${v}`, { kind: 'success', icon: 'ri-check-line' });
    };
  });

  // ---------- Inline composer (tabs toggle inputs in the same box) ----------
  (function () {
    const composer = document.querySelector('.composer');
    if (!composer) return;
    const tabs   = composer.querySelectorAll('.ctype-tabs button');
    const body   = composer.querySelector('[data-role="cbody"]');
    const save   = composer.querySelector('[data-role="csave"]');
    const files  = composer.querySelector('[data-role="cfiles"]');
    const fLabel = composer.querySelector('[data-role="cfiles-label"]');
    const kindFieldsAll = composer.querySelectorAll('.ckind-fields');

    const config = {
      'Note':     { placeholder: 'Add a note about this prospect…',                save: 'Save note',  toast: 'Note saved' },
      'Log call': { placeholder: 'What did you discuss?',                          save: 'Log call',   toast: 'Call logged' },
      'Email':    { placeholder: 'Compose your message…',                          save: 'Send email', toast: 'Email sent' },
      'Task':     { placeholder: 'Describe the task…',                             save: 'Create task',toast: 'Task created' },
      'Meeting':  { placeholder: 'Agenda / notes for the meeting…',                save: 'Schedule',   toast: 'Meeting scheduled' },
    };

    function setKind(kind) {
      tabs.forEach(t => t.classList.toggle('active', t.dataset.kind === kind));
      kindFieldsAll.forEach(f => {
        const match = f.dataset.kindFields === kind;
        f.style.display = match ? 'flex' : 'none';
      });
      const c = config[kind] || config['Note'];
      body.placeholder = c.placeholder;
      save.textContent = c.save;
      composer.dataset.activeKind = kind;
    }

    tabs.forEach(t => t.onclick = () => setKind(t.dataset.kind));
    setKind('Note');

    // Meeting: toggle address ↔ link based on location radio
    const meetingFields = composer.querySelector('.ckind-fields[data-kind-fields="Meeting"]');
    if (meetingFields) {
      const addrEl = meetingFields.querySelector('[data-field="address"]');
      const linkEl = meetingFields.querySelector('[data-field="link"]');
      meetingFields.querySelectorAll('input[name="m-loc"]').forEach(r => {
        r.onchange = () => {
          const isOnline = meetingFields.querySelector('input[name="m-loc"]:checked').value === 'online';
          addrEl.style.display = isOnline ? 'none' : '';
          linkEl.style.display = isOnline ? '' : 'none';
          if (isOnline) addrEl.value = ''; else linkEl.value = '';
        };
      });
    }

    files.onchange = () => {
      const n = files.files.length;
      fLabel.textContent = n ? `${n} file${n>1?'s':''}` : '';
    };

    save.onclick = () => {
      const kind = composer.dataset.activeKind || 'Note';
      const text = body.value.trim();
      if (!text && kind !== 'Meeting' && kind !== 'Task') {
        toast('Add some content first', { kind: 'error', icon: 'ri-error-warning-line' });
        return;
      }

      const get = (field) => {
        const el = composer.querySelector(`.ckind-fields[data-kind-fields="${kind}"] [data-field="${field}"]`);
        return el ? el.value : '';
      };
      const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      let summary = '';

      if (kind === 'Note') {
        summary = esc(text);
      } else if (kind === 'Log call') {
        summary = `<strong style="color:var(--color-grey-800);">${esc(get('outcome'))} · ${esc(get('duration'))} min</strong><br/>${esc(text)}`;
      } else if (kind === 'Email') {
        const sub = get('subject').trim();
        const cc = get('cc').trim();
        if (!sub) { toast('Subject required', { kind: 'error', icon: 'ri-error-warning-line' }); return; }
        summary = `<strong style="color:var(--color-grey-800);">"${esc(sub)}"</strong>${cc?` · cc ${esc(cc)}`:''}<br/>${esc(text).slice(0,200)}${text.length>200?'…':''}`;
      } else if (kind === 'Task') {
        const title = get('title').trim();
        if (!title) { toast('Task title required', { kind: 'error', icon: 'ri-error-warning-line' }); return; }
        const assignee = get('assignee'), due = get('due'), status = get('status');
        const overdueEl = composer.querySelector('.ckind-fields[data-kind-fields="Task"] [data-field="overdue"]');
        const overdue = overdueEl && overdueEl.checked;
        const meta = [];
        if (assignee) meta.push('@' + esc(assignee.split(' ')[0]));
        if (due) meta.push('due ' + esc(due.replace('T',' ')));
        if (status) meta.push(esc(status));
        if (overdue) meta.push('<span style="color:var(--color-error-600);font-weight:600;">OVERDUE</span>');
        summary = `<strong style="color:var(--color-grey-800);">${esc(title)}</strong>${meta.length?` · ${meta.join(' · ')}`:''}${text?`<br/>${esc(text)}`:''}`;
      } else if (kind === 'Meeting') {
        const title = get('title').trim() || 'Meeting';
        const when = get('when');
        const locType = get('locType') || 'in-person';
        const address = get('address').trim();
        const link = get('link').trim();
        const notify = composer.querySelector('.ckind-fields[data-kind-fields="Meeting"] [data-field="notify"]').checked;
        const where = locType === 'online' ? (link ? `<a href="${esc(link)}" target="_blank" style="color:var(--color-brand-600);">online</a>` : 'online') : (address ? esc(address) : 'in-person');
        summary = `<strong style="color:var(--color-grey-800);">${esc(title)}</strong> · ${where}${when?` · ${esc(when.replace('T',' '))}`:''}${notify?' · <span style="color:var(--color-success-600);">notified</span>':''}${text?`<br/>${esc(text)}`:''}`;
      }

      const fileCount = files.files.length;
      if (fileCount) summary += `<span class="tl-attach"><i class="ri-attachment-2"></i> ${fileCount} attachment${fileCount>1?'s':''}</span>`;

      addTimelineEntry(kind, summary);

      // reset
      body.value = '';
      files.value = '';
      fLabel.textContent = '';
      composer.querySelectorAll('.ckind-fields input[type="text"], .ckind-fields input[type="date"], .ckind-fields input[type="datetime-local"]').forEach(i => {
        if (i.dataset.field !== 'to') i.value = '';
      });

      toast(config[kind].toast, { kind: 'success', icon: 'ri-check-line' });
    };
  })();

  function dialogShell(headerIcon, headerColor, title, subtitle, bodyHtml, okLabel) {
    const back = document.createElement('div');
    back.style.cssText = 'position:fixed;inset:0;background:rgba(15,14,22,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;overflow-y:auto;';
    back.innerHTML = `
      <div style="background:white;border-radius:14px;width:100%;max-width:560px;box-shadow:0 20px 50px rgba(0,0,0,0.2);overflow:hidden;">
        <div style="padding:20px 24px;border-bottom:1px solid var(--border-subtle);display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;border-radius:8px;background:${headerColor.bg};color:${headerColor.fg};display:inline-flex;align-items:center;justify-content:center;"><i class="${headerIcon}" style="font-size:18px;"></i></div>
          <div><h3 style="margin:0;font:600 16px var(--font-sans);color:var(--color-grey-900);">${title}</h3><p style="margin:2px 0 0;font:12px var(--font-sans);color:var(--fg3);">${subtitle}</p></div>
        </div>
        <div style="padding:18px 24px;display:flex;flex-direction:column;gap:14px;">${bodyHtml}</div>
        <div style="display:flex;gap:8px;justify-content:flex-end;padding:14px 24px;background:var(--color-grey-25);border-top:1px solid var(--border-subtle);">
          <button data-act="cancel" style="background:none;border:1px solid var(--border-default);padding:9px 16px;border-radius:8px;font:500 13px var(--font-sans);cursor:pointer;color:var(--fg2);">Cancel</button>
          <button data-act="ok" style="background:var(--color-brand-600);color:white;border:none;padding:9px 16px;border-radius:8px;font:500 13px var(--font-sans);cursor:pointer;">${okLabel}</button>
        </div>
      </div>`;
    document.body.appendChild(back);
    back.addEventListener('click', e => { if (e.target === back) back.remove(); });
    back.querySelector('[data-act=cancel]').onclick = () => back.remove();
    return back;
  }
  const fieldStyle = 'display:block;width:100%;margin-top:6px;padding:8px 10px;border:1px solid var(--border-default);border-radius:6px;font:13px var(--font-sans);color:var(--color-grey-900);box-sizing:border-box;';

  async function openNoteDialog(){
    const body = `<label style="font:500 12px var(--font-sans);color:var(--color-grey-700);">Note<textarea id="nText" rows="5" placeholder="Add a note about this prospect…" style="${fieldStyle}resize:vertical;"></textarea></label>
      <label style="font:500 12px var(--font-sans);color:var(--color-grey-700);">Attachments<input id="nFiles" type="file" multiple style="${fieldStyle}padding:6px;"/></label>`;
    const back = dialogShell('ri-sticky-note-line', {bg:'var(--color-grey-100)',fg:'var(--color-grey-700)'}, 'Add a note', 'about Joseph Mensah', body, 'Save note');
    back.querySelector('[data-act=ok]').onclick = () => {
      const t = back.querySelector('#nText').value.trim();
      if(!t){toast('Add a note first',{kind:'error',icon:'ri-error-warning-line'});return;}
      const files = back.querySelector('#nFiles').files;
      let summary = t.replace(/</g,'&lt;');
      if(files.length) summary += `<span class="tl-attach"><i class="ri-attachment-2"></i> ${files.length} attachment${files.length>1?'s':''}</span>`;
      back.remove(); addTimelineEntry('Note', summary);
      toast('Note saved',{kind:'success',icon:'ri-check-line'});
    };
  }
  async function openLogCallDialog(){
    const body = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <label style="font:500 12px var(--font-sans);color:var(--color-grey-700);">Outcome<select id="cOut" style="${fieldStyle}"><option>Connected</option><option>No answer</option><option>Voicemail</option><option>Wrong number</option></select></label>
        <label style="font:500 12px var(--font-sans);color:var(--color-grey-700);">Duration (min)<input id="cDur" type="number" value="10" min="0" style="${fieldStyle}"/></label>
      </div>
      <label style="font:500 12px var(--font-sans);color:var(--color-grey-700);">Summary<textarea id="cSum" rows="4" placeholder="What did you discuss?" style="${fieldStyle}resize:vertical;"></textarea></label>
      <label style="font:500 12px var(--font-sans);color:var(--color-grey-700);">Attachments<input id="cFiles" type="file" multiple style="${fieldStyle}padding:6px;"/></label>`;
    const back = dialogShell('ri-phone-line', {bg:'var(--color-brand-50)',fg:'var(--color-brand-600)'}, 'Log a call', 'with Joseph Mensah', body, 'Log call');
    back.querySelector('[data-act=ok]').onclick = () => {
      const out = back.querySelector('#cOut').value, dur = back.querySelector('#cDur').value;
      const t = back.querySelector('#cSum').value.trim();
      if(!t){toast('Add a summary',{kind:'error',icon:'ri-error-warning-line'});return;}
      const files = back.querySelector('#cFiles').files;
      let summary = `<strong style="color:var(--color-grey-800);">${out} · ${dur} min</strong><br/>${t.replace(/</g,'&lt;')}`;
      if(files.length) summary += `<span class="tl-attach"><i class="ri-attachment-2"></i> ${files.length} attachment${files.length>1?'s':''}</span>`;
      back.remove(); addTimelineEntry('Log call', summary);
      toast('Call logged',{kind:'success',icon:'ri-check-line'});
    };
  }
  async function openEmailDialog(){
    const body = `<label style="font:500 12px var(--font-sans);color:var(--color-grey-700);">To<input id="eTo" type="text" value="joseph.mensah@gmail.com" style="${fieldStyle}"/></label>
      <label style="font:500 12px var(--font-sans);color:var(--color-grey-700);">Subject<input id="eSub" type="text" placeholder="Subject…" style="${fieldStyle}"/></label>
      <label style="font:500 12px var(--font-sans);color:var(--color-grey-700);">Body<textarea id="eBody" rows="6" placeholder="Compose your message…" style="${fieldStyle}resize:vertical;"></textarea></label>
      <label style="font:500 12px var(--font-sans);color:var(--color-grey-700);">Attachments<input id="eFiles" type="file" multiple style="${fieldStyle}padding:6px;"/></label>`;
    const back = dialogShell('ri-mail-send-line', {bg:'#dbeafe',fg:'#1d4ed8'}, 'Send email', 'to Joseph Mensah', body, 'Send email');
    back.querySelector('[data-act=ok]').onclick = () => {
      const sub = back.querySelector('#eSub').value.trim(), body = back.querySelector('#eBody').value.trim();
      if(!sub||!body){toast('Subject and body required',{kind:'error',icon:'ri-error-warning-line'});return;}
      const files = back.querySelector('#eFiles').files;
      let summary = `<strong style="color:var(--color-grey-800);">"${sub.replace(/</g,'&lt;')}"</strong><br/>${body.replace(/</g,'&lt;').slice(0,200)}${body.length>200?'…':''}`;
      if(files.length) summary += `<span class="tl-attach"><i class="ri-attachment-2"></i> ${files.length} attachment${files.length>1?'s':''}</span>`;
      back.remove(); addTimelineEntry('Email', summary);
      toast('Email sent',{kind:'success',icon:'ri-check-line'});
    };
  }

  // legacy composer (kept for safety) ----------
  const composer = document.querySelector('.composer');
  if (composer) {
    const ta = composer.querySelector('textarea');
    const placeholders = {
      'Note':     'Add a note about this prospect…',
      'Log call': 'Summarize what you discussed on the call…',
      'Email':    'Subject and body of email to send…',
      'SMS':      'Type a short SMS message…',
      'Task':     'Describe the task and set a due date…',
      'Meeting':  'Meeting agenda, location, attendees…'
    };
    composer.querySelectorAll('.ctype-tabs button').forEach(btn => {
      btn.onclick = () => {
        composer.querySelectorAll('.ctype-tabs button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const label = btn.textContent.trim();
        if (ta && placeholders[label]) ta.placeholder = placeholders[label];
        // update save button label
        const saveBtn = composer.querySelector('.btn-primary');
        if (saveBtn) {
          const map = { 'Note': 'Save note', 'Log call': 'Log call', 'Email': 'Send email', 'SMS': 'Send SMS', 'Task': 'Create task', 'Meeting': 'Schedule' };
          saveBtn.textContent = map[label] || 'Save';
        }
      };
    });

    // toolbar icons
    composer.querySelectorAll('.toolbar i').forEach(ic => {
      ic.style.cursor = 'pointer';
      ic.onclick = () => {
        const cls = ic.className;
        if (cls.includes('attachment')) toast('Attaching file…', { icon: 'ri-attachment-2' });
        else if (cls.includes('at-line')) toast('Mention a teammate', { icon: 'ri-at-line' });
        else if (cls.includes('image')) toast('Insert image', { icon: 'ri-image-line' });
        else if (cls.includes('link')) toast('Insert link', { icon: 'ri-link' });
      };
    });

    // save button
    const saveBtn = composer.querySelector('.btn-primary');
    if (saveBtn) saveBtn.onclick = () => {
      const text = ta && ta.value.trim();
      if (!text) { toast('Add some text first', { kind: 'error', icon: 'ri-error-warning-line' }); return; }
      const activeTab = composer.querySelector('.ctype-tabs button.active');
      const kind = activeTab ? activeTab.textContent.trim() : 'Note';
      addTimelineEntry(kind, text);
      ta.value = '';
      toast(`${kind === 'Note' ? 'Note saved' : kind + ' logged'}`, { kind: 'success', icon: 'ri-check-line' });
    };
  }

  // ---------- Filter tabs (timeline) ----------
  document.querySelectorAll('.pd-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.pd-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const label = tab.textContent.trim().split(/\s+/)[0]; // "All", "Notes", "Calls", etc.
      filterTimeline(label);
    };
  });

  // ---------- Right rail buttons ----------
  document.querySelectorAll('.next-task').forEach(nt => {
    nt.style.cursor = 'pointer';
    nt.onclick = async () => {
      const v = await confirmDialog({
        title: 'Documents due Friday',
        message: 'Awaiting pay stubs & spouse ID. Mark complete or snooze 2 days?',
        okText: 'Mark complete', cancelText: 'Snooze 2 days',
        icon: 'ri-alarm-warning-line', iconBg: 'var(--color-warning-50)', iconColor: 'var(--color-warning-700)'
      });
      if (v === true) { nt.style.opacity = '0.5'; nt.style.textDecoration = 'line-through'; toast('Task completed', { kind: 'success', icon: 'ri-check-line' }); }
      else if (v === null) { /* dismissed */ }
      else { toast('Snoozed 2 days', { icon: 'ri-zzz-line' }); }
    };
  });

  // Convert CTA
  document.querySelectorAll('.convert-cta button').forEach(b => {
    b.onclick = () => openConvertDialog();
  });

  // Asset "View"
  document.querySelectorAll('.rail-card h3 a').forEach(a => {
    if (a.textContent.trim() === 'View') {
      // already a link to land-detail.html — leave default
    }
  });

  // Open calculator
  document.querySelectorAll('.btn-text').forEach(b => {
    if (b.textContent.includes('Open calculator')) b.onclick = () => {
      window.location.href = 'calculator-simple.html';
    };
  });

  // Stage actions
  document.querySelectorAll('.stage-actions .btn').forEach(b => {
    const label = b.textContent.trim();
    b.onclick = async () => {
      if (label.includes('Schedule meeting')) openMeetingDialog();
      else if (label.includes('Create task')) {
        openTaskDialog();
      }
      else if (label.includes('Send proposal')) toast('Proposal sent — Joseph will receive it via email', { kind: 'success', icon: 'ri-share-forward-line' });
      else if (label.includes('Mark abandoned')) {
        const ok = await confirmDialog({
          title: 'Mark as abandoned?',
          message: 'This prospect will be moved to the abandoned stage. You can restore them later.',
          okText: 'Mark abandoned', danger: true, icon: 'ri-archive-line',
          iconBg: 'var(--color-error-50)', iconColor: 'var(--color-error-600)'
        });
        if (ok) toast('Marked as abandoned', { icon: 'ri-archive-line' });
      }
    };
  });

  // ---------- Helper: add timeline entry ----------
  function addTimelineEntry(kind, text) {
    const tl = document.querySelector('.timeline');
    if (!tl) return;
    const map = {
      'Note':     { cls: '', icon: 'ri-sticky-note-line', label: 'added a note' },
      'Log call': { cls: 'brand', icon: 'ri-phone-line', label: 'logged a call' },
      'Email':    { cls: 'info', icon: 'ri-mail-send-line', label: 'sent an email' },
      'SMS':      { cls: 'info', icon: 'ri-message-3-line', label: 'sent an SMS' },
      'Task':     { cls: 'warn', icon: 'ri-task-line', label: 'created a task' },
      'Meeting':  { cls: 'brand', icon: 'ri-calendar-event-line', label: 'scheduled a meeting' }
    };
    // (kept for legacy composer reference)
    const _unused = {
    };
    const m = map[kind] || map['Note'];
    const item = document.createElement('div');
    item.className = 'tl-item ' + m.cls;
    item.style.opacity = '0';
    item.style.transform = 'translateY(-8px)';
    item.innerHTML = `
      <div class="dot"><i class="${m.icon}"></i></div>
      <div class="tl-head">
        <div class="who">Kevin Manga <span>${m.label}</span></div>
        <div class="when">Just now</div>
      </div>
      <div class="tl-body">${text.replace(/</g, '&lt;')}</div>
    `;
    tl.insertBefore(item, tl.firstChild);
    requestAnimationFrame(() => {
      item.style.transition = 'opacity 0.3s, transform 0.3s';
      item.style.opacity = '1'; item.style.transform = '';
    });
    // Bump tab counts
    bumpTabCount('All');
    bumpTabCount(kind === 'Note' ? 'Notes' : kind === 'Log call' ? 'Calls' : kind === 'Email' ? 'Emails' : kind === 'SMS' ? 'Emails' : kind === 'Task' ? 'Tasks' : 'Meetings');
  }
  function bumpTabCount(name) {
    document.querySelectorAll('.pd-tab').forEach(t => {
      if (t.textContent.trim().startsWith(name)) {
        const cnt = t.querySelector('.cnt');
        if (cnt) cnt.textContent = (parseInt(cnt.textContent) || 0) + 1;
      }
    });
  }

  // ---------- Helper: filter timeline ----------
  function filterTimeline(filter) {
    const items = document.querySelectorAll('.timeline .tl-item');
    items.forEach(item => {
      if (filter === 'All') { item.style.display = ''; return; }
      const icon = item.querySelector('.dot i');
      if (!icon) return;
      const cls = icon.className;
      const match = (
        (filter === 'Notes' && cls.includes('sticky-note')) ||
        (filter === 'Calls' && cls.includes('phone')) ||
        (filter === 'Emails' && (cls.includes('mail-send') || cls.includes('mail-line'))) ||
        (filter === 'Tasks' && cls.includes('task-line')) ||
        (filter === 'Meetings' && cls.includes('calendar-event'))
      );
      item.style.display = match ? '' : 'none';
    });
  }

  // ---------- Reassign agent picker ----------
  const SALES_AGENTS = [
    { name: 'Aisha Bello',     role: 'Senior agent',   region: 'Greater Accra',  load: 14, status: 'online',  initials: 'AB', color: '#7c3aed' },
    { name: 'Daniel Owusu',    role: 'Sales agent',    region: 'Ashanti',        load: 9,  status: 'online',  initials: 'DO', color: '#0891b2' },
    { name: 'Esi Mensah',      role: 'Senior agent',   region: 'Greater Accra',  load: 12, status: 'busy',    initials: 'EM', color: '#db2777' },
    { name: 'Kwame Asante',    role: 'Sales agent',    region: 'Eastern',        load: 6,  status: 'online',  initials: 'KA', color: '#059669' },
    { name: 'Linda Yawson',    role: 'Lead agent',     region: 'Greater Accra',  load: 18, status: 'away',    initials: 'LY', color: '#ea580c' },
    { name: 'Michael Tetteh',  role: 'Sales agent',    region: 'Volta',          load: 8,  status: 'online',  initials: 'MT', color: '#2563eb' },
    { name: 'Nana Adjei',      role: 'Senior agent',   region: 'Central',        load: 11, status: 'online',  initials: 'NA', color: '#9333ea' },
    { name: 'Patricia Boateng',role: 'Sales agent',    region: 'Greater Accra',  load: 7,  status: 'online',  initials: 'PB', color: '#0d9488' },
    { name: 'Samuel Osei',     role: 'Sales agent',    region: 'Western',        load: 10, status: 'busy',    initials: 'SO', color: '#dc2626' },
    { name: 'Yaa Frimpong',    role: 'Lead agent',     region: 'Ashanti',        load: 16, status: 'online',  initials: 'YF', color: '#7e22ce' },
    { name: 'Zara Nkrumah',    role: 'Junior agent',   region: 'Greater Accra',  load: 4,  status: 'online',  initials: 'ZN', color: '#be185d' },
  ];
  const CURRENT_AGENT = 'Aisha Bello';

  function openReassignPicker(anchorBtn) {
    document.querySelectorAll('.reassign-pop').forEach(n => n.remove());
    const pop = document.createElement('div');
    pop.className = 'reassign-pop';
    pop.style.cssText = 'position:absolute;z-index:9000;width:340px;background:white;border:1px solid var(--border-default);border-radius:10px;box-shadow:0 12px 32px rgba(15,14,22,0.18);overflow:hidden;';
    pop.innerHTML = `
      <div style="padding:12px 14px 10px;border-bottom:1px solid var(--border-subtle);">
        <div style="font:600 13px var(--font-sans);color:var(--color-grey-900);margin-bottom:8px;">Reassign to</div>
        <div style="display:flex;align-items:center;gap:6px;background:var(--color-grey-50);border:1px solid var(--border-subtle);border-radius:8px;padding:7px 10px;">
          <i class="ri-search-line" style="color:var(--fg3);font-size:14px;"></i>
          <input id="raSearch" type="text" placeholder="Search agents…" style="flex:1;background:transparent;border:none;outline:none;font:13px var(--font-sans);color:var(--color-grey-900);"/>
        </div>
      </div>
      <div id="raList" style="max-height:340px;overflow-y:auto;padding:6px;"></div>
    `;
    document.body.appendChild(pop);
    const r = anchorBtn.getBoundingClientRect();
    let top = r.bottom + window.scrollY + 6;
    let left = r.left + window.scrollX;
    if (left + 340 > window.innerWidth - 12) left = window.innerWidth - 340 - 12;
    pop.style.top = top + 'px';
    pop.style.left = left + 'px';

    const list = pop.querySelector('#raList');
    const search = pop.querySelector('#raSearch');

    function renderList(q) {
      const ql = (q || '').toLowerCase().trim();
      const filtered = SALES_AGENTS.filter(a =>
        a.name !== CURRENT_AGENT && (
          !ql || a.name.toLowerCase().includes(ql) || a.role.toLowerCase().includes(ql) || a.region.toLowerCase().includes(ql)
        )
      );
      if (!filtered.length) {
        list.innerHTML = `<div style="padding:24px 14px;text-align:center;color:var(--fg3);font:13px var(--font-sans);">No agents match "${ql.replace(/</g,'&lt;')}"</div>`;
        return;
      }
      const dotColor = { online: '#16a34a', busy: '#ea580c', away: '#94a3b8' };
      list.innerHTML = filtered.map(a => `
        <button data-name="${a.name}" style="width:100%;display:flex;align-items:center;gap:10px;padding:8px 10px;border:none;background:transparent;border-radius:8px;cursor:pointer;text-align:left;">
          <div style="position:relative;flex-shrink:0;">
            <div style="width:34px;height:34px;border-radius:50%;background:${a.color};color:white;display:inline-flex;align-items:center;justify-content:center;font:600 12px var(--font-sans);">${a.initials}</div>
            <div style="position:absolute;bottom:-1px;right:-1px;width:10px;height:10px;border-radius:50%;background:${dotColor[a.status]};border:2px solid white;"></div>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font:600 13px var(--font-sans);color:var(--color-grey-900);">${a.name}</div>
            <div style="font:12px var(--font-sans);color:var(--fg3);">${a.role} · ${a.region}</div>
          </div>
          <div style="font:500 11px var(--font-sans);color:var(--fg3);background:var(--color-grey-50);padding:3px 7px;border-radius:6px;">${a.load} active</div>
        </button>
      `).join('');
      list.querySelectorAll('button').forEach(btn => {
        btn.onmouseover = () => btn.style.background = 'var(--color-brand-50)';
        btn.onmouseout  = () => btn.style.background = 'transparent';
        btn.onclick = () => {
          const name = btn.dataset.name;
          pop.remove();
          toast(`Reassigned to ${name}`, { kind: 'success', icon: 'ri-user-shared-line' });
        };
      });
    }
    renderList('');
    search.oninput = () => renderList(search.value);
    search.focus();

    setTimeout(() => {
      function onDoc(e) { if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener('click', onDoc, true); } }
      document.addEventListener('click', onDoc, true);
    }, 0);
  }

  // ---------- Dialogs ----------
  async function openMeetingDialog() {
    const back = document.createElement('div');
    back.style.cssText = 'position:fixed;inset:0;background:rgba(15,14,22,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;overflow-y:auto;';
    back.innerHTML = `
      <div style="background:white;border-radius:14px;width:100%;max-width:560px;padding:0;box-shadow:0 20px 50px rgba(0,0,0,0.2);overflow:hidden;">
        <div style="padding:20px 24px;border-bottom:1px solid var(--border-subtle);display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;border-radius:8px;background:var(--color-brand-50);color:var(--color-brand-600);display:inline-flex;align-items:center;justify-content:center;"><i class="ri-calendar-event-line" style="font-size:18px;"></i></div>
          <div>
            <h3 style="margin:0;font:600 16px var(--font-sans);color:var(--color-grey-900);">Schedule a meeting</h3>
            <p style="margin:2px 0 0;font:12px var(--font-sans);color:var(--fg3);">with Joseph Mensah</p>
          </div>
        </div>
        <div style="padding:18px 24px;display:flex;flex-direction:column;gap:14px;">
          <label style="font:500 12px var(--font-sans);color:var(--color-grey-700);">Title<input id="mtTitle" type="text" value="Site visit — Brookfield" style="display:block;margin-top:4px;width:100%;border:1px solid var(--border-default);border-radius:8px;padding:9px 12px;font:14px var(--font-sans);outline:none;" /></label>

          <div>
            <div style="font:500 12px var(--font-sans);color:var(--color-grey-700);margin-bottom:6px;">Meeting type</div>
            <div id="mtMode" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <button type="button" data-mode="inperson" class="mt-mode active" style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:8px;border:1.5px solid var(--color-brand-600);background:var(--color-brand-50);color:var(--color-brand-700);font:500 13px var(--font-sans);cursor:pointer;"><i class="ri-map-pin-line"></i>In person</button>
              <button type="button" data-mode="online" class="mt-mode" style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:8px;border:1px solid var(--border-default);background:white;color:var(--color-grey-700);font:500 13px var(--font-sans);cursor:pointer;"><i class="ri-vidicon-line"></i>Online</button>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr 110px;gap:10px;">
            <label style="font:500 12px var(--font-sans);color:var(--color-grey-700);">Date<input id="mtDate" type="date" value="2026-11-12" style="display:block;margin-top:4px;width:100%;border:1px solid var(--border-default);border-radius:8px;padding:9px 12px;font:14px var(--font-sans);outline:none;" /></label>
            <label style="font:500 12px var(--font-sans);color:var(--color-grey-700);">Start<input id="mtTime" type="time" value="14:00" style="display:block;margin-top:4px;width:100%;border:1px solid var(--border-default);border-radius:8px;padding:9px 12px;font:14px var(--font-sans);outline:none;" /></label>
            <label style="font:500 12px var(--font-sans);color:var(--color-grey-700);">Duration<select id="mtDur" style="display:block;margin-top:4px;width:100%;border:1px solid var(--border-default);border-radius:8px;padding:9px 12px;font:14px var(--font-sans);outline:none;background:white;"><option>15m</option><option>30m</option><option selected>45m</option><option>1h</option><option>1h 30m</option><option>2h</option></select></label>
          </div>

          <!-- In-person fields -->
          <div id="mtInPerson" style="display:flex;flex-direction:column;gap:10px;">
            <label style="font:500 12px var(--font-sans);color:var(--color-grey-700);">Location / address<input id="mtAddr" type="text" value="Brookfield Plot #LND-014, Accra" style="display:block;margin-top:4px;width:100%;border:1px solid var(--border-default);border-radius:8px;padding:9px 12px;font:14px var(--font-sans);outline:none;" /></label>
            <label style="font:500 12px var(--font-sans);color:var(--color-grey-700);">Meeting point / parking<input id="mtPoint" type="text" placeholder="e.g. main gate, look for signage" style="display:block;margin-top:4px;width:100%;border:1px solid var(--border-default);border-radius:8px;padding:9px 12px;font:14px var(--font-sans);outline:none;" /></label>
          </div>

          <!-- Online fields -->
          <div id="mtOnline" style="display:none;flex-direction:column;gap:10px;">
            <div>
              <div style="font:500 12px var(--font-sans);color:var(--color-grey-700);margin-bottom:6px;">Connect a provider</div>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;" id="mtProv">
                <button type="button" data-prov="zoom" class="mt-prov" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 8px;border-radius:8px;border:1px solid var(--border-default);background:white;cursor:pointer;font:500 12px var(--font-sans);color:var(--color-grey-700);">
                  <span style="width:28px;height:28px;border-radius:6px;background:#2D8CFF;color:white;display:inline-flex;align-items:center;justify-content:center;font:700 11px var(--font-sans);">Z</span>
                  Zoom
                </button>
                <button type="button" data-prov="meet" class="mt-prov" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 8px;border-radius:8px;border:1px solid var(--border-default);background:white;cursor:pointer;font:500 12px var(--font-sans);color:var(--color-grey-700);">
                  <span style="width:28px;height:28px;border-radius:6px;background:#00897B;color:white;display:inline-flex;align-items:center;justify-content:center;"><i class="ri-vidicon-line"></i></span>
                  Google Meet
                </button>
                <button type="button" data-prov="teams" class="mt-prov" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 8px;border-radius:8px;border:1px solid var(--border-default);background:white;cursor:pointer;font:500 12px var(--font-sans);color:var(--color-grey-700);">
                  <span style="width:28px;height:28px;border-radius:6px;background:#5059C9;color:white;display:inline-flex;align-items:center;justify-content:center;font:700 11px var(--font-sans);">T</span>
                  Teams
                </button>
              </div>
              <div id="mtProvStatus" style="margin-top:8px;font:12px var(--font-sans);color:var(--fg3);">No provider connected — pick one to auto-generate a link.</div>
            </div>
            <label style="font:500 12px var(--font-sans);color:var(--color-grey-700);">Or paste a link<input id="mtLink" type="url" placeholder="https://…" style="display:block;margin-top:4px;width:100%;border:1px solid var(--border-default);border-radius:8px;padding:9px 12px;font:14px var(--font-sans);outline:none;" /></label>
          </div>

          <label style="font:500 12px var(--font-sans);color:var(--color-grey-700);">Notes / agenda<textarea id="mtNotes" rows="2" placeholder="Bring blueprint, payment estimate…" style="display:block;margin-top:4px;width:100%;border:1px solid var(--border-default);border-radius:8px;padding:9px 12px;font:14px var(--font-sans);outline:none;resize:vertical;"></textarea></label>
          <label style="display:flex;gap:8px;align-items:center;font:13px var(--font-sans);color:var(--color-grey-700);"><input type="checkbox" id="mtInvite" checked /> Send invite to joseph.mensah@gmail.com</label>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;padding:14px 24px;background:var(--color-grey-25);border-top:1px solid var(--border-subtle);">
          <button data-act="cancel" style="background:none;border:1px solid var(--border-default);padding:9px 16px;border-radius:8px;font:500 13px var(--font-sans);cursor:pointer;color:var(--fg2);">Cancel</button>
          <button data-act="ok" style="background:var(--color-brand-600);color:white;border:none;padding:9px 16px;border-radius:8px;font:500 13px var(--font-sans);cursor:pointer;">Schedule meeting</button>
        </div>
      </div>
    `;
    document.body.appendChild(back);
    back.addEventListener('click', e => { if (e.target === back) back.remove(); });

    let mode = 'inperson';
    let provider = null;
    const inPersonEl = back.querySelector('#mtInPerson');
    const onlineEl = back.querySelector('#mtOnline');
    back.querySelectorAll('.mt-mode').forEach(b => {
      b.onclick = () => {
        mode = b.dataset.mode;
        back.querySelectorAll('.mt-mode').forEach(x => {
          x.classList.remove('active');
          x.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:8px;border:1px solid var(--border-default);background:white;color:var(--color-grey-700);font:500 13px var(--font-sans);cursor:pointer;';
        });
        b.classList.add('active');
        b.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:8px;border:1.5px solid var(--color-brand-600);background:var(--color-brand-50);color:var(--color-brand-700);font:500 13px var(--font-sans);cursor:pointer;';
        inPersonEl.style.display = mode === 'inperson' ? 'flex' : 'none';
        onlineEl.style.display = mode === 'online' ? 'flex' : 'none';
      };
    });
    const provNames = { zoom: 'Zoom', meet: 'Google Meet', teams: 'Microsoft Teams' };
    back.querySelectorAll('.mt-prov').forEach(b => {
      b.onclick = () => {
        provider = b.dataset.prov;
        back.querySelectorAll('.mt-prov').forEach(x => {
          x.style.borderColor = 'var(--border-default)';
          x.style.background = 'white';
        });
        b.style.borderColor = 'var(--color-brand-600)';
        b.style.background = 'var(--color-brand-50)';
        const status = back.querySelector('#mtProvStatus');
        const link = back.querySelector('#mtLink');
        status.innerHTML = `<i class="ri-checkbox-circle-fill" style="color:var(--color-success-600);"></i> ${provNames[provider]} connected — link will be generated on save.`;
        status.style.color = 'var(--color-success-700)';
        if (link && !link.value) {
          const slug = Math.random().toString(36).slice(2, 11);
          const urls = {
            zoom: `https://us02web.zoom.us/j/${Math.floor(Math.random()*9e9+1e9)}`,
            meet: `https://meet.google.com/${slug.slice(0,3)}-${slug.slice(3,7)}-${slug.slice(7,10)}`,
            teams: `https://teams.microsoft.com/l/meetup-join/${slug}`
          };
          link.value = urls[provider];
        }
      };
    });

    back.querySelector('[data-act=cancel]').onclick = () => back.remove();
    back.querySelector('[data-act=ok]').onclick = () => {
      const title = back.querySelector('#mtTitle').value.trim() || 'Meeting';
      const date = back.querySelector('#mtDate').value;
      const time = back.querySelector('#mtTime').value;
      const dur = back.querySelector('#mtDur').value;
      let where, summary;
      if (mode === 'inperson') {
        where = back.querySelector('#mtAddr').value.trim();
        summary = `${title} · ${date} ${time} (${dur}) · 📍 ${where}`;
      } else {
        const link = back.querySelector('#mtLink').value.trim();
        const provLabel = provider ? provNames[provider] : 'Online';
        summary = `${title} · ${date} ${time} (${dur}) · ${provLabel}${link ? ' · ' + link : ''}`;
      }
      back.remove();
      addTimelineEntry('Meeting', summary);
      toast('Meeting scheduled — invite sent to Joseph', { kind: 'success', icon: 'ri-calendar-event-line' });
    };
  }

  // ---------- Task dialog (real-estate types) ----------
  async function openTaskDialog() {
    const taskTypes = [
      { id: 'site-visit',   label: 'Site visit',           icon: 'ri-map-pin-line' },
      { id: 'doc-collect',  label: 'Document collection',  icon: 'ri-folder-open-line' },
      { id: 'kyc',          label: 'KYC / ID verification', icon: 'ri-shield-user-line' },
      { id: 'valuation',    label: 'Property valuation',   icon: 'ri-scales-3-line' },
      { id: 'survey',       label: 'Land survey',          icon: 'ri-compass-3-line' },
      { id: 'title-search', label: 'Title search',         icon: 'ri-search-eye-line' },
      { id: 'contract',     label: 'Contract drafting',    icon: 'ri-file-text-line' },
      { id: 'signing',      label: 'Contract signing',     icon: 'ri-quill-pen-line' },
      { id: 'inspection',   label: 'Property inspection',  icon: 'ri-home-gear-line' },
      { id: 'payment',      label: 'Payment follow-up',    icon: 'ri-bank-card-line' },
      { id: 'handover',     label: 'Key handover',         icon: 'ri-key-2-line' },
      { id: 'callback',     label: 'Callback',             icon: 'ri-phone-line' }
    ];
    const today = new Date();
    const due = new Date(today.getTime() + 3*24*60*60*1000);
    const pad = n => String(n).padStart(2, '0');
    const defaultDue = `${due.getFullYear()}-${pad(due.getMonth()+1)}-${pad(due.getDate())}`;

    const back = document.createElement('div');
    back.style.cssText = 'position:fixed;inset:0;background:rgba(15,14,22,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;overflow-y:auto;';
    back.innerHTML = `
      <div style="background:white;border-radius:14px;width:100%;max-width:560px;padding:0;box-shadow:0 20px 50px rgba(0,0,0,0.2);overflow:hidden;">
        <div style="padding:20px 24px;border-bottom:1px solid var(--border-subtle);display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;border-radius:8px;background:var(--color-warning-50);color:var(--color-warning-700);display:inline-flex;align-items:center;justify-content:center;"><i class="ri-task-line" style="font-size:18px;"></i></div>
          <div>
            <h3 style="margin:0;font:600 16px var(--font-sans);color:var(--color-grey-900);">Create a task</h3>
            <p style="margin:2px 0 0;font:12px var(--font-sans);color:var(--fg3);">for Joseph Mensah</p>
          </div>
        </div>
        <div style="padding:18px 24px;display:flex;flex-direction:column;gap:14px;">
          <div>
            <div style="font:500 12px var(--font-sans);color:var(--color-grey-700);margin-bottom:6px;">Type</div>
            <div id="tkTypes" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">
              ${taskTypes.map((t,i) => `
                <button type="button" data-type="${t.id}" data-label="${t.label}" data-icon="${t.icon}" class="tk-type" style="display:flex;align-items:center;gap:6px;padding:8px 10px;border-radius:8px;border:1px solid var(--border-default);background:white;cursor:pointer;font:500 12px var(--font-sans);color:var(--color-grey-700);text-align:left;${i===0?'border-color:var(--color-brand-600);background:var(--color-brand-50);color:var(--color-brand-700);':''}">
                  <i class="${t.icon}" style="font-size:14px;"></i><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.label}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <label style="font:500 12px var(--font-sans);color:var(--color-grey-700);">Title<input id="tkTitle" type="text" value="Site visit — Brookfield" style="display:block;margin-top:4px;width:100%;border:1px solid var(--border-default);border-radius:8px;padding:9px 12px;font:14px var(--font-sans);outline:none;" /></label>

          <label style="font:500 12px var(--font-sans);color:var(--color-grey-700);">Description<textarea id="tkDesc" rows="3" placeholder="What needs to happen, by whom, what's the outcome…" style="display:block;margin-top:4px;width:100%;border:1px solid var(--border-default);border-radius:8px;padding:9px 12px;font:14px var(--font-sans);outline:none;resize:vertical;"></textarea></label>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <label style="font:500 12px var(--font-sans);color:var(--color-grey-700);">Due date<input id="tkDue" type="date" value="${defaultDue}" style="display:block;margin-top:4px;width:100%;border:1px solid var(--border-default);border-radius:8px;padding:9px 12px;font:14px var(--font-sans);outline:none;" /></label>
            <label style="font:500 12px var(--font-sans);color:var(--color-grey-700);">Priority<select id="tkPri" style="display:block;margin-top:4px;width:100%;border:1px solid var(--border-default);border-radius:8px;padding:9px 12px;font:14px var(--font-sans);outline:none;background:white;"><option value="low">Low</option><option value="med" selected>Medium</option><option value="high">High</option></select></label>
          </div>

          <label style="font:500 12px var(--font-sans);color:var(--color-grey-700);">Assign to<select id="tkOwner" style="display:block;margin-top:4px;width:100%;border:1px solid var(--border-default);border-radius:8px;padding:9px 12px;font:14px var(--font-sans);outline:none;background:white;"><option>Kevin Manga (me)</option><option>Sara Ndong</option><option>Aaron Tetteh</option></select></label>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;padding:14px 24px;background:var(--color-grey-25);border-top:1px solid var(--border-subtle);">
          <button data-act="cancel" style="background:none;border:1px solid var(--border-default);padding:9px 16px;border-radius:8px;font:500 13px var(--font-sans);cursor:pointer;color:var(--fg2);">Cancel</button>
          <button data-act="ok" style="background:var(--color-brand-600);color:white;border:none;padding:9px 16px;border-radius:8px;font:500 13px var(--font-sans);cursor:pointer;">Create task</button>
        </div>
      </div>
    `;
    document.body.appendChild(back);
    back.addEventListener('click', e => { if (e.target === back) back.remove(); });

    let pickedType = taskTypes[0];
    back.querySelectorAll('.tk-type').forEach(b => {
      b.onclick = () => {
        pickedType = { id: b.dataset.type, label: b.dataset.label, icon: b.dataset.icon };
        back.querySelectorAll('.tk-type').forEach(x => {
          x.style.borderColor = 'var(--border-default)';
          x.style.background = 'white';
          x.style.color = 'var(--color-grey-700)';
        });
        b.style.borderColor = 'var(--color-brand-600)';
        b.style.background = 'var(--color-brand-50)';
        b.style.color = 'var(--color-brand-700)';
        // Update default title to match type
        const title = back.querySelector('#tkTitle');
        if (title && (!title.dataset.touched)) {
          title.value = pickedType.label;
        }
      };
    });
    back.querySelector('#tkTitle').addEventListener('input', e => { e.target.dataset.touched = '1'; });

    back.querySelector('[data-act=cancel]').onclick = () => back.remove();
    back.querySelector('[data-act=ok]').onclick = () => {
      const title = back.querySelector('#tkTitle').value.trim() || pickedType.label;
      const desc  = back.querySelector('#tkDesc').value.trim();
      const dueStr = back.querySelector('#tkDue').value;
      const pri = back.querySelector('#tkPri').value;
      const owner = back.querySelector('#tkOwner').value;
      if (!dueStr) { toast('Pick a due date', { kind: 'error', icon: 'ri-error-warning-line' }); return; }
      const dueDate = new Date(dueStr + 'T23:59:59');
      const overdue = dueDate < new Date();
      const priLabel = { low: 'Low', med: 'Medium', high: 'High' }[pri];
      const dueFmt = dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const summary = `<strong style="color:var(--color-grey-800);">[${pickedType.label}]</strong> ${title}` +
        (desc ? `<div style="margin-top:4px;color:var(--fg3);font-size:12px;">${desc.replace(/</g,'&lt;')}</div>` : '') +
        `<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;">` +
        `<span style="font:500 11px var(--font-sans);padding:2px 8px;border-radius:999px;background:${overdue?'var(--color-error-50)':'var(--color-warning-50)'};color:${overdue?'var(--color-error-700)':'var(--color-warning-700)'};">${overdue ? '⚠ Overdue · ' : 'Due '}${dueFmt}</span>` +
        `<span style="font:500 11px var(--font-sans);padding:2px 8px;border-radius:999px;background:var(--color-grey-100);color:var(--color-grey-700);">${priLabel} priority</span>` +
        `<span style="font:500 11px var(--font-sans);padding:2px 8px;border-radius:999px;background:var(--color-grey-100);color:var(--color-grey-700);">${owner.replace(' (me)', '')}</span>` +
        `</div>`;
      back.remove();
      addTimelineEntry('Task', summary);
      toast('Task created' + (overdue ? ' — already overdue' : ''), { kind: overdue ? 'error' : 'success', icon: 'ri-check-line' });
    };
  }

  async function openConvertDialog() {
    // Pre-flight: read overview cards to confirm conversion is possible.
    const text = (sel) => { const el = document.querySelector(sel); return el ? el.textContent.trim() : ''; };
    const assetMini = document.getElementById('assetMini');
    const finRows   = document.getElementById('financingRows');
    const get = (root, sel) => (root && root.querySelector(sel) ? root.querySelector(sel).textContent.trim() : '');

    // Required steps before conversion is possible.
    const blockers = [];
    if (!assetMini || !get(assetMini, '[data-asset="site"]'))    blockers.push({ icon: 'ri-map-pin-line',    label: 'Select a site for Asset of interest' });
    if (!assetMini || !get(assetMini, '[data-asset="parcels"]')) blockers.push({ icon: 'ri-stack-line',      label: 'Choose number of parcels' });
    const finType = finRows ? get(finRows, '[data-fin="type"]') : '';
    if (!finType) blockers.push({ icon: 'ri-bank-card-line', label: 'Set financing type' });
    else if (finType === 'Loan') {
      if (!get(finRows,  '[data-fin="price"]'))       blockers.push({ icon: 'ri-money-dollar-circle-line', label: 'Set asset price' });
      if (!get(finRows,  '[data-fin="term"]'))        blockers.push({ icon: 'ri-calendar-2-line', label: 'Set financing term' });
      if (!get(finRows,  '[data-fin="rate"]'))        blockers.push({ icon: 'ri-percent-line',    label: 'Set financing rate' });
      if (!get(finRows,  '[data-fin="firstPayment"]'))blockers.push({ icon: 'ri-calendar-check-line', label: 'Set first payment date' });
      if (!get(finRows,  '[data-fin="payDay"]'))      blockers.push({ icon: 'ri-calendar-event-line', label: 'Set preferred payment day' });
    } else if (finType === 'All at once') {
      if (!get(finRows,  '[data-fin="totalAmount"]'))  blockers.push({ icon: 'ri-money-dollar-circle-line', label: 'Set total amount' });
      if (!get(finRows,  '[data-fin="paymentDate"]'))  blockers.push({ icon: 'ri-calendar-event-line', label: 'Set payment date' });
    }
    // Qualification rail items still missing
    document.querySelectorAll('.qual-list .q.no').forEach(q => {
      const lbl = q.querySelector('.lbl');
      if (lbl) blockers.push({ icon: 'ri-file-list-3-line', label: lbl.textContent.trim() });
    });

    const back = document.createElement('div');
    back.style.cssText = 'position:fixed;inset:0;background:rgba(15,14,22,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;';

    // Force-show the contract preview even if pre-flight items are missing —
    // the user explicitly asked to skip blocker validation for now.
    blockers.length = 0;
    if (blockers.length) {
      const items = blockers.map(b => `
        <li style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--color-grey-25);border:1px solid var(--border-subtle);border-radius:8px;font:13px var(--font-sans);color:var(--color-grey-800);">
          <i class="${b.icon}" style="color:var(--color-warning-700);font-size:14px;"></i>${b.label}
        </li>`).join('');
      back.innerHTML = `
        <div style="background:white;border-radius:14px;width:100%;max-width:480px;box-shadow:0 20px 50px rgba(0,0,0,0.2);overflow:hidden;border:1px solid var(--border-default);">
          <div style="padding:18px 22px 14px;border-bottom:1px solid var(--border-subtle);">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="width:34px;height:34px;border-radius:8px;background:var(--color-warning-50);color:var(--color-warning-700);display:inline-flex;align-items:center;justify-content:center;"><i class="ri-alert-line"></i></span>
              <div>
                <h3 style="margin:0;font:600 15px var(--font-sans);color:var(--color-grey-900);">Not ready to convert</h3>
                <p style="margin:2px 0 0;font:12px var(--font-sans);color:var(--fg3);">Complete the steps below before drafting a contract.</p>
              </div>
            </div>
          </div>
          <ul style="margin:0;padding:14px 22px;display:flex;flex-direction:column;gap:6px;list-style:none;">${items}</ul>
          <div style="display:flex;justify-content:flex-end;padding:12px 22px;background:var(--color-grey-25);border-top:1px solid var(--border-subtle);">
            <button data-act="ok" style="background:var(--color-brand-600);color:white;border:none;padding:8px 16px;border-radius:8px;font:500 13px var(--font-sans);cursor:pointer;">Got it</button>
          </div>
        </div>`;
      document.body.appendChild(back);
      back.addEventListener('click', e => { if (e.target === back) back.remove(); });
      back.querySelector('[data-act=ok]').onclick = () => back.remove();
      return;
    }

    const land = {
      site:    get(assetMini, '[data-asset="site"]'),
      parcels: get(assetMini, '[data-asset="parcels"]'),
      total:   get(assetMini, '[data-asset="total"]'),
    };
    const fin = {
      type:    get(finRows, '[data-fin="type"]'),
      price:   get(finRows, '[data-fin="price"]'),
      down:    get(finRows, '[data-fin="down"]'),
      term:    get(finRows, '[data-fin="term"]'),
      rate:    get(finRows, '[data-fin="rate"]'),
      firstPayment: get(finRows, '[data-fin="firstPayment"]'),
      payDay:  get(finRows, '[data-fin="payDay"]'),
      monthly: get(finRows, '[data-fin="monthly"]'),
      totalAmount: get(finRows, '[data-fin="totalAmount"]'),
      paymentDate: get(finRows, '[data-fin="paymentDate"]'),
    };
    const isAllAtOnce = (fin.type === 'All at once');

    back.innerHTML = `
      <div style="background:white;border-radius:14px;width:100%;max-width:520px;padding:0;box-shadow:0 20px 50px rgba(0,0,0,0.2);overflow:hidden;border:1px solid var(--border-default);">
        <div style="padding:18px 22px 14px;border-bottom:1px solid var(--border-subtle);">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="width:34px;height:34px;border-radius:8px;background:var(--color-brand-50);color:var(--color-brand-700);display:inline-flex;align-items:center;justify-content:center;"><i class="ri-check-double-line"></i></span>
            <div>
              <h3 style="margin:0;font:600 15px var(--font-sans);color:var(--color-grey-900);">Convert Joseph to a customer</h3>
              <p style="margin:2px 0 0;font:12px var(--font-sans);color:var(--fg3);">A contract will be drafted with everything pre-filled. Review before sending for e-signature.</p>
            </div>
          </div>
        </div>
        <div style="padding:18px 22px;">
          <div style="display:flex;flex-direction:column;gap:8px;font:13px var(--font-sans);">
            <div style="display:flex;justify-content:space-between;padding:9px 12px;background:var(--color-grey-25);border-radius:8px;border:1px solid var(--border-subtle);"><span style="color:var(--fg3);">Site</span><span style="font-weight:500;color:var(--color-grey-800);">${land.site} · ${land.parcels} parcels</span></div>
            <div style="display:flex;justify-content:space-between;padding:9px 12px;background:var(--color-grey-25);border-radius:8px;border:1px solid var(--border-subtle);"><span style="color:var(--fg3);">Total</span><span style="font-weight:500;color:var(--color-grey-800);">${land.total}</span></div>
            ${isAllAtOnce
              ? `<div style="display:flex;justify-content:space-between;padding:9px 12px;background:var(--color-grey-25);border-radius:8px;border:1px solid var(--border-subtle);"><span style="color:var(--fg3);">Financing</span><span style="font-weight:500;color:var(--color-grey-800);">${fin.type}</span></div>
                 <div style="display:flex;justify-content:space-between;padding:9px 12px;background:var(--color-grey-25);border-radius:8px;border:1px solid var(--border-subtle);"><span style="color:var(--fg3);">Payment date</span><span style="font-weight:500;color:var(--color-grey-800);">${fin.paymentDate}</span></div>
                 <div style="display:flex;justify-content:space-between;padding:9px 12px;background:var(--color-brand-50);border-radius:8px;border:1px solid var(--color-brand-100);"><span style="color:var(--color-brand-700);">Total due</span><span style="font-weight:600;color:var(--color-brand-700);">${fin.totalAmount || fin.price}</span></div>`
              : `<div style="display:flex;justify-content:space-between;padding:9px 12px;background:var(--color-grey-25);border-radius:8px;border:1px solid var(--border-subtle);"><span style="color:var(--fg3);">Financing</span><span style="font-weight:500;color:var(--color-grey-800);">${fin.type} · ${fin.term} · ${fin.down} down · ${fin.rate}</span></div>
                 <div style="display:flex;justify-content:space-between;padding:9px 12px;background:var(--color-grey-25);border-radius:8px;border:1px solid var(--border-subtle);"><span style="color:var(--fg3);">First payment</span><span style="font-weight:500;color:var(--color-grey-800);">${fin.firstPayment} · ${fin.payDay}</span></div>
                 <div style="display:flex;justify-content:space-between;padding:9px 12px;background:var(--color-brand-50);border-radius:8px;border:1px solid var(--color-brand-100);"><span style="color:var(--color-brand-700);">Monthly</span><span style="font-weight:600;color:var(--color-brand-700);">${fin.monthly}</span></div>`}
          </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;padding:12px 22px;background:var(--color-grey-25);border-top:1px solid var(--border-subtle);">
          <button data-act="cancel" style="background:white;border:1px solid var(--border-default);padding:8px 16px;border-radius:8px;font:500 13px var(--font-sans);cursor:pointer;color:var(--color-grey-800);">Cancel</button>
          <button data-act="ok" style="background:var(--color-brand-600);color:white;border:none;padding:8px 16px;border-radius:8px;font:500 13px var(--font-sans);cursor:pointer;display:inline-flex;gap:6px;align-items:center;"><i class="ri-check-double-line"></i>Draft contract</button>
        </div>
      </div>
    `;
    document.body.appendChild(back);
    back.addEventListener('click', e => { if (e.target === back) back.remove(); });
    back.querySelector('[data-act=cancel]').onclick = () => back.remove();
    back.querySelector('[data-act=ok]').onclick = () => {
      back.remove();
      toast('Contract drafted — opening for review', { kind: 'success', icon: 'ri-check-double-line' });
      setTimeout(() => { window.location.href = 'loan-detail-admin.html'; }, 1200);
    };
  }
})();

// ============================================================
// PROSPECT PUBLIC PAGE
// ============================================================
(function initProspectPublic() {
  if (!document.querySelector('.pub-shell')) return;

  // Asset choice (specific vs exploring) — already wired inline; toggle plot list visibility
  const choices = document.querySelectorAll('.choice');
  const plotSection = document.querySelector('.plot-list');
  const plotHeader = plotSection && plotSection.previousElementSibling;
  const detailSection = plotSection && plotSection.parentElement.nextElementSibling;
  choices.forEach(c => {
    c.addEventListener('click', () => {
      const isExploring = c.querySelector('.ttl').textContent.includes('exploring');
      if (plotSection && plotSection.parentElement) plotSection.parentElement.style.display = isExploring ? 'none' : '';
      if (detailSection) detailSection.style.display = isExploring ? 'none' : '';
    });
  });

  // Plot picker
  const picks = document.querySelectorAll('.plot-pick');
  picks.forEach(p => p.addEventListener('click', () => {
    picks.forEach(x => x.classList.remove('selected'));
    p.classList.add('selected');
    const id = p.querySelector('.id').textContent;
    const name = p.querySelector('.nm').textContent;
    const price = p.querySelector('.price').textContent;
    // Update detail label
    const detailHeader = document.querySelector('.plot-list').parentElement.nextElementSibling;
    if (detailHeader) {
      const lbl = detailHeader.querySelector('div[style*="font-size:12px"]');
      if (lbl) lbl.innerHTML = `A few details about <strong>${name}</strong>`;
    }
    // Update calc readouts
    const priceNum = parseFloat(price.replace(/[$,]/g, ''));
    if (priceNum) updateCalc(priceNum);
    // Update progress sub
    const progressItem = document.querySelectorAll('.progress li')[1];
    if (progressItem) {
      const sub = progressItem.querySelector('.sub');
      if (sub) sub.textContent = `${id} selected`;
    }
  }));

  // Payment options — already inline-wired, but also re-toggle calc
  document.querySelectorAll('.pay-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const isLoan = opt.querySelector('.ttl').textContent.includes('loan');
      const calc = document.getElementById('calc');
      if (calc) calc.style.display = isLoan ? '' : 'none';
      // Update progress
      const progressItem = document.querySelectorAll('.progress li')[2];
      if (progressItem) {
        const sub = progressItem.querySelector('.sub');
        if (sub) sub.textContent = isLoan ? 'Loan, 25y' : 'Pay in full';
      }
    });
  });

  // Sliders
  let assetPrice = 186500;
  let downPct = 20;
  let termYears = 25;
  const ratePct = 6.25;

  function updateCalc(newPrice) {
    if (newPrice) assetPrice = newPrice;
    const down = Math.round(assetPrice * downPct / 100);
    const loan = assetPrice - down;
    const monthlyRate = ratePct / 100 / 12;
    const n = termYears * 12;
    const monthly = monthlyRate === 0 ? loan / n : loan * monthlyRate / (1 - Math.pow(1 + monthlyRate, -n));
    const totalInt = Math.max(0, Math.round(monthly * n - loan));
    const calc = document.querySelector('.calc-readouts');
    if (!calc) return;
    const fmt = n => '$' + Math.round(n).toLocaleString();
    const rows = calc.querySelectorAll('.sec-row .v');
    const priRow = calc.querySelector('.pri-row .v');
    if (priRow) priRow.innerHTML = fmt(monthly) + ' <small>/ month</small>';
    if (rows[0]) rows[0].textContent = fmt(assetPrice);
    if (rows[1]) rows[1].textContent = fmt(down);
    if (rows[2]) rows[2].textContent = fmt(loan);
    if (rows[3]) rows[3].textContent = fmt(totalInt);
    // sliders' val
    const downSlider = document.querySelector('.slider-wrap:nth-child(1) .val');
    if (downSlider) downSlider.textContent = `${fmt(down)} · ${downPct}%`;
    const termSlider = document.querySelector('.slider-wrap:nth-child(2) .val');
    if (termSlider) termSlider.textContent = `${termYears} year${termYears === 1 ? '' : 's'}`;
  }

  const sliders = document.querySelectorAll('.slider-wrap input[type=range]');
  if (sliders[0]) sliders[0].addEventListener('input', e => { downPct = parseInt(e.target.value); updateCalc(); });
  if (sliders[1]) sliders[1].addEventListener('input', e => { termYears = parseInt(e.target.value); updateCalc(); });

  // Track form completeness for progress rail
  function updateProgress() {
    const inputs = document.querySelectorAll('.form-card input[type=text], .form-card input[type=email], .form-card input[type=tel]');
    let filled = 0;
    inputs.forEach(i => { if (i.value.trim()) filled++; });
    const item = document.querySelectorAll('.progress li')[0];
    if (item) {
      const sub = item.querySelector('.sub');
      if (sub) sub.textContent = `${filled} of 4 fields`;
      if (filled >= 3 && !item.classList.contains('done')) {
        item.classList.add('done');
        item.querySelector('.num').innerHTML = '<i class="ri-check-line"></i>';
      } else if (filled < 3) {
        item.classList.remove('done');
        item.querySelector('.num').innerHTML = '1';
      }
    }
  }
  document.querySelectorAll('.form-card input').forEach(i => i.addEventListener('input', updateProgress));

  // Save & finish later
  document.querySelectorAll('.btn-text').forEach(b => {
    if (b.textContent.includes('Save')) b.onclick = (e) => {
      e.preventDefault();
      toast('Saved. We sent you a magic link to resume on any device.', { kind: 'success', icon: 'ri-mail-send-line', duration: 3500 });
    };
  });

  // Submit interest
  document.querySelectorAll('.btn-primary').forEach(b => {
    if (b.textContent.includes('Submit interest')) b.onclick = (e) => {
      e.preventDefault();
      // Simple validation: first name and email required
      const inputs = document.querySelectorAll('.form-card input[type=text], .form-card input[type=email]');
      const fname = inputs[0] && inputs[0].value.trim();
      const email = document.querySelector('.form-card input[type=email]') && document.querySelector('.form-card input[type=email]').value.trim();
      if (!fname || !email) {
        toast('Please fill in your name and email', { kind: 'error', icon: 'ri-error-warning-line' });
        return;
      }
      // Show success state — replace card content
      showPublicSuccess(fname);
    };
  });

  function showPublicSuccess(name) {
    const shell = document.querySelector('.pub-shell');
    const formGrid = document.querySelector('.form-grid');
    const foot = document.querySelector('.pub-foot');
    if (formGrid) formGrid.style.display = 'none';
    const ok = document.createElement('div');
    ok.style.cssText = 'background:white;border:1px solid var(--border-default);border-radius:14px;padding:48px 32px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.04);max-width:560px;margin:0 auto;';
    ok.innerHTML = `
      <div style="width:72px;height:72px;border-radius:50%;background:var(--color-success-50);color:var(--color-success-600);display:inline-flex;align-items:center;justify-content:center;margin:0 auto 20px;"><i class="ri-check-line" style="font-size:36px;"></i></div>
      <h2 style="margin:0 0 10px;font:600 24px var(--font-sans);color:var(--color-grey-900);letter-spacing:-0.02em;">Thank you, ${name.replace(/</g, '&lt;')}.</h2>
      <p style="margin:0 0 24px;font:15px var(--font-sans);color:var(--fg2);line-height:1.6;">An agent will be in touch within 3 hours. Meanwhile, you can browse other available properties or save this estimate to your account.</p>
      <div style="display:flex;gap:8px;justify-content:center;">
        <a href="login.html" style="display:inline-flex;gap:6px;align-items:center;padding:11px 20px;border-radius:8px;font:500 14px var(--font-sans);background:var(--color-brand-600);color:white;text-decoration:none;border:1px solid var(--color-brand-600);"><i class="ri-account-circle-line"></i> Set up my account</a>
        <a href="#" style="display:inline-flex;gap:6px;align-items:center;padding:11px 20px;border-radius:8px;font:500 14px var(--font-sans);color:var(--fg2);text-decoration:none;border:1px solid var(--border-default);">Browse more properties</a>
      </div>
      <div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--border-subtle);font:12px var(--font-sans);color:var(--fg4);">Reference: <strong style="color:var(--color-grey-700);font-family:var(--font-mono);">PRO-${Date.now().toString().slice(-6)}</strong></div>
    `;
    if (foot) shell.insertBefore(ok, foot);
    else shell.appendChild(ok);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
})();
