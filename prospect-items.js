// ============================================================
// prospect-items.js
// Adds Edit / Delete affordances to every timeline item, and
// upgrades the Email composer with Subject + Schedule send.
// Loaded AFTER prospect.js — extends the existing implementation
// without forking it.
//
// Item lifecycle (data-status on .tl-item):
//   note     — always editable
//   call     — always editable (you can correct call notes)
//   sms      — sent on save → not editable after that point
//   task     — editable while open
//   meeting  — editable
//   email    — draft / scheduled → editable; sent → locked
//
// Source of truth lives in the DOM (data-* attributes on .tl-item),
// which keeps this layer decoupled from any backend model.
// ============================================================

(function () {
  if (!document.querySelector('.lc-card') || !document.querySelector('.timeline')) return;

  // ---------- helpers ----------
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function fmtWhen(d) {
    d = d || new Date();
    const today = new Date(); today.setHours(0,0,0,0);
    const that = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.round((today - that) / 86400000);
    const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase().replace(' ', '');
    if (diff === 0) return 'Today, ' + time;
    if (diff === 1) return 'Yesterday, ' + time;
    if (diff > 1 && diff < 7) return `${diff} days ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ', ' + time;
  }

  function fmtScheduleWhen(d) {
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  // ---------- backfill data-* on existing static items ----------
  // Inferred from the icon / class so we can attach menus & edit logic.
  document.querySelectorAll('.timeline .tl-item').forEach((item, idx) => {
    if (item.dataset.kind) return;
    const iconEl = item.querySelector('.dot i');
    const icon = iconEl ? iconEl.className : '';
    const headSpan = item.querySelector('.tl-head .who span');
    const headText = headSpan ? headSpan.textContent : '';
    let kind = 'note', status = 'final';
    if (/phone/i.test(icon))                       { kind = 'call'; status = 'logged'; }
    else if (/mail-send/i.test(icon))              { kind = 'email'; status = 'sent'; }
    else if (/mail-line/i.test(icon))              { kind = 'email'; status = 'sent'; }
    else if (/message-3/i.test(icon))              { kind = 'sms'; status = 'sent'; }
    else if (/task/i.test(icon))                   { kind = 'task'; status = 'open'; }
    else if (/calendar-event/i.test(icon))         { kind = 'meeting'; status = 'scheduled'; }
    else if (/sticky-note/i.test(icon))            { kind = 'note'; status = 'final'; }
    else if (/user-add|flag/i.test(icon))          { kind = 'system'; status = 'system'; }
    item.dataset.kind = kind;
    item.dataset.status = status;
    item.dataset.id = 'tl-' + idx + '-' + Math.random().toString(36).slice(2, 8);
    if (kind === 'email') {
      // pull subject from "sent an email · ".." segment
      const m = headText.match(/"([^"]+)"/);
      if (m) item.dataset.subject = m[1];
    }
  });

  // ---------- attach action menu to every non-system item ----------
  function attachMenu(item) {
    if (item.querySelector('.tl-menu')) return;
    if (item.dataset.kind === 'system') return;
    const head = item.querySelector('.tl-head');
    if (!head) return;
    const menu = document.createElement('div');
    menu.className = 'tl-menu';
    menu.innerHTML = `<button type="button" class="tl-menu-btn" aria-label="Item actions"><i class="ri-more-2-fill"></i></button>`;
    const whenEl = head.querySelector('.when');
    if (whenEl) whenEl.insertAdjacentElement('afterend', menu);
    else head.appendChild(menu);
    menu.querySelector('.tl-menu-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      openItemMenu(item, menu);
    });
  }
  document.querySelectorAll('.timeline .tl-item').forEach(attachMenu);

  // Re-attach on every newly-added item. prospect.js inserts via
  // addTimelineEntry → tl.insertBefore(item, tl.firstChild); a MutationObserver
  // catches those.
  const tl = document.querySelector('.timeline');
  if (tl) {
    new MutationObserver(muts => {
      muts.forEach(m => m.addedNodes.forEach(n => {
        if (n.nodeType === 1 && n.classList.contains('tl-item')) {
          // backfill if not already
          if (!n.dataset.kind) {
            const iconEl = n.querySelector('.dot i');
            const icon = iconEl ? iconEl.className : '';
            let kind = 'note', status = 'final';
            if (/phone/i.test(icon))               { kind = 'call'; status = 'logged'; }
            else if (/mail-send/i.test(icon))      { kind = 'email'; status = n.dataset.status || 'sent'; }
            else if (/message-3/i.test(icon))      { kind = 'sms'; status = 'sent'; }
            else if (/task/i.test(icon))           { kind = 'task'; status = 'open'; }
            else if (/calendar-event/i.test(icon)) { kind = 'meeting'; status = 'scheduled'; }
            n.dataset.kind = n.dataset.kind || kind;
            n.dataset.status = n.dataset.status || status;
            n.dataset.id = n.dataset.id || ('tl-' + Math.random().toString(36).slice(2, 10));
          }
          attachMenu(n);
        }
      }));
    }).observe(tl, { childList: true });
  }

  // ---------- floating menu ----------
  let openMenuEl = null;
  document.addEventListener('click', () => { if (openMenuEl) { openMenuEl.remove(); openMenuEl = null; } });

  function openItemMenu(item, anchor) {
    if (openMenuEl) { openMenuEl.remove(); openMenuEl = null; }
    const kind = item.dataset.kind;
    const status = item.dataset.status;
    const locked = (kind === 'email' && status === 'sent') || (kind === 'sms' && status === 'sent');

    const menu = document.createElement('div');
    menu.className = 'tl-pop';
    menu.innerHTML = `
      ${locked
        ? `<div class="tl-pop-note"><i class="ri-lock-line"></i> ${kind === 'email' ? 'Sent email — read only' : 'Sent SMS — read only'}</div>
           <button type="button" data-act="view"><i class="ri-eye-line"></i> View</button>`
        : `<button type="button" data-act="edit"><i class="ri-edit-line"></i> Edit</button>`}
      ${kind === 'email' && status === 'scheduled'
        ? `<button type="button" data-act="send-now"><i class="ri-send-plane-line"></i> Send now</button>
           <button type="button" data-act="cancel-send"><i class="ri-close-circle-line"></i> Cancel send</button>`
        : ''}
      ${kind === 'task' && status === 'open'
        ? `<button type="button" data-act="complete"><i class="ri-checkbox-circle-line"></i> Mark complete</button>`
        : ''}
      ${kind === 'meeting' && status === 'scheduled'
        ? `<button type="button" data-act="cancel-meeting"><i class="ri-calendar-close-line"></i> Cancel meeting</button>`
        : ''}
      <div class="tl-pop-sep"></div>
      <button type="button" data-act="delete" class="danger"><i class="ri-delete-bin-line"></i> Delete</button>
    `;
    document.body.appendChild(menu);
    const r = anchor.getBoundingClientRect();
    menu.style.top = (r.bottom + 6) + 'px';
    menu.style.left = Math.max(8, r.right - 200) + 'px';
    openMenuEl = menu;

    menu.addEventListener('click', e => e.stopPropagation());
    menu.querySelectorAll('button[data-act]').forEach(b => {
      b.onclick = () => {
        const act = b.dataset.act;
        menu.remove(); openMenuEl = null;
        runAction(item, act);
      };
    });
  }

  // ---------- actions ----------
  async function runAction(item, act) {
    if (act === 'edit')          return openEditDialog(item);
    if (act === 'view')          return openViewDialog(item);
    if (act === 'delete')        return deleteItem(item);
    if (act === 'send-now')      return sendEmailNow(item);
    if (act === 'cancel-send')   return cancelScheduledSend(item);
    if (act === 'complete')      return completeTask(item);
    if (act === 'cancel-meeting')return cancelMeeting(item);
  }

  async function deleteItem(item) {
    const kind = item.dataset.kind;
    const ok = await window.confirmDialog({
      title: `Delete this ${kind}?`,
      message: 'This is permanent — it will be removed from the activity timeline.',
      okText: 'Delete', danger: true, icon: 'ri-delete-bin-line',
      iconBg: 'var(--color-error-50)', iconColor: 'var(--color-error-600)'
    });
    if (!ok) return;
    item.style.transition = 'opacity 0.2s, transform 0.2s';
    item.style.opacity = '0'; item.style.transform = 'translateX(20px)';
    setTimeout(() => {
      decrementTabs(item);
      item.remove();
      window.toast('Deleted', { kind: 'success', icon: 'ri-check-line' });
    }, 220);
  }

  function decrementTabs(item) {
    const kind = item.dataset.kind;
    const tabName = ({ note:'Notes', call:'Calls', email:'Emails', sms:'Emails', task:'Tasks', meeting:'Meetings' })[kind];
    const dec = (name) => document.querySelectorAll('.pd-tab').forEach(t => {
      if (t.textContent.trim().startsWith(name)) {
        const cnt = t.querySelector('.cnt');
        if (cnt) cnt.textContent = Math.max(0, (parseInt(cnt.textContent) || 0) - 1);
      }
    });
    dec('All');
    if (tabName) dec(tabName);
  }

  async function sendEmailNow(item) {
    item.dataset.status = 'sent';
    refreshEmailItem(item);
    window.toast('Email sent', { kind: 'success', icon: 'ri-send-plane-line' });
  }

  async function cancelScheduledSend(item) {
    const ok = await window.confirmDialog({
      title: 'Cancel scheduled send?',
      message: 'The email stays as a draft — you can edit it and reschedule any time.',
      okText: 'Cancel send', icon: 'ri-close-circle-line'
    });
    if (!ok) return;
    item.dataset.status = 'draft';
    delete item.dataset.scheduledAt;
    refreshEmailItem(item);
    window.toast('Scheduled send cancelled — saved as draft', { icon: 'ri-draft-line' });
  }

  async function completeTask(item) {
    item.dataset.status = 'done';
    const head = item.querySelector('.tl-head .who span');
    if (head) head.textContent = 'completed a task';
    item.style.opacity = '0.7';
    const dot = item.querySelector('.dot');
    if (dot) {
      dot.innerHTML = '<i class="ri-checkbox-circle-fill"></i>';
      item.classList.remove('warn'); item.classList.add('success');
    }
    window.toast('Task completed', { kind: 'success', icon: 'ri-check-line' });
  }

  async function cancelMeeting(item) {
    const ok = await window.confirmDialog({
      title: 'Cancel this meeting?',
      message: 'Joseph will be notified that the meeting has been cancelled.',
      okText: 'Cancel meeting', danger: true, icon: 'ri-calendar-close-line',
      iconBg: 'var(--color-error-50)', iconColor: 'var(--color-error-600)'
    });
    if (!ok) return;
    item.dataset.status = 'cancelled';
    item.style.opacity = '0.6';
    const body = item.querySelector('.tl-body');
    if (body) body.style.textDecoration = 'line-through';
    const head = item.querySelector('.tl-head .who span');
    if (head) head.textContent = 'cancelled a meeting';
    window.toast('Meeting cancelled', { icon: 'ri-calendar-close-line' });
  }

  // ---------- VIEW (read-only sent email) ----------
  function openViewDialog(item) {
    const subject = item.dataset.subject || '(no subject)';
    const body = (item.querySelector('.tl-body') || {}).innerHTML || '';
    openSheet({
      icon: 'ri-mail-line',
      iconBg: 'var(--color-grey-100)', iconColor: 'var(--color-grey-700)',
      title: 'Email — sent', sub: subject,
      body: `
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div style="padding:10px 12px;background:var(--color-grey-25);border:1px solid var(--border-subtle);border-radius:8px;font:12px var(--font-sans);color:var(--fg3);"><i class="ri-lock-line" style="margin-right:6px;"></i>Sent emails can't be edited.</div>
          <div><div style="font:500 12px var(--font-sans);color:var(--fg3);margin-bottom:4px;">Subject</div><div style="font:500 14px var(--font-sans);color:var(--color-grey-800);">${esc(subject)}</div></div>
          <div><div style="font:500 12px var(--font-sans);color:var(--fg3);margin-bottom:4px;">Body</div><div style="font:14px var(--font-sans);color:var(--color-grey-800);line-height:1.5;">${body}</div></div>
        </div>`,
      ok: 'Close',
      onOk: () => true,
      hideCancel: true
    });
  }

  // ---------- EDIT ----------
  // All kinds now use the same inline editor. Email keeps its scheduled-send
  // controls, but they're inline rather than a modal sheet.
  function openEditDialog(item) {
    return openSimpleEdit(item);
  }

  // ---------- LABEL palette (chip presets) ----------
  const LABEL_PRESETS = [
    { txt: 'Discovery', cls: 'brand' },
    { txt: 'Outcome: positive', cls: 'success' },
    { txt: 'Outbound', cls: 'info' },
    { txt: 'Inbound', cls: 'info' },
    { txt: 'Onboarding', cls: '' },
    { txt: 'Verified', cls: 'success' },
    { txt: 'No answer', cls: 'warn' },
    { txt: 'Open task', cls: 'warn' },
    { txt: 'Site visit', cls: '' },
    { txt: 'Internal', cls: '' },
    { txt: 'Brookfield', cls: '' },
    { txt: 'Riverside', cls: '' },
  ];

  function readLabels(item) {
    const wrap = item.querySelector('.tl-labels');
    if (!wrap) return [];
    return Array.from(wrap.children).map(el => ({
      txt: el.textContent.trim(),
      cls: ['brand','success','warn','info'].find(c => el.classList.contains(c)) || ''
    }));
  }
  function readAttachments(item) {
    const wrap = item.querySelector('.tl-attachments');
    if (!wrap) return [];
    return Array.from(wrap.children).map(el => {
      const isImg = el.classList.contains('tl-attach-img');
      const nm = (el.querySelector(isImg ? '.cap > span:first-child' : '.nm') || {}).textContent || 'file';
      const sz = (el.querySelector('.sz') || {}).textContent || '';
      const ic = el.querySelector('.ic') || el.querySelector('.preview');
      const iconClass = ic ? (ic.querySelector('i') ? ic.querySelector('i').className : 'ri-file-line') : 'ri-file-line';
      const tone = ic ? (['pdf','img','doc','gen'].find(c => ic.classList.contains(c)) || 'gen') : 'gen';
      return { nm, sz, iconClass, tone, isImg };
    });
  }
  function renderLabels(arr) {
    if (!arr.length) return '';
    return `<div class="tl-labels">${arr.map(l => `<span class="tl-label${l.cls?' '+l.cls:''}">${esc(l.txt)}</span>`).join('')}</div>`;
  }
  function renderAttachments(arr) {
    if (!arr.length) return '';
    const cards = arr.map(a => a.isImg
      ? `<div class="tl-attach-img"><span class="preview"><i class="${a.iconClass}"></i></span><span class="cap"><span>${esc(a.nm)}</span><span class="sz">${esc(a.sz)}</span></span></div>`
      : `<a class="tl-attach-card" href="#" onclick="return false;"><span class="ic ${a.tone}"><i class="${a.iconClass}"></i></span><span class="meta"><span class="nm">${esc(a.nm)}</span><span class="sz">${esc(a.sz)}</span></span></a>`
    ).join('');
    return `<div class="tl-attachments">${cards}</div>`;
  }

  // ---------- KIND-aware extras (mirrors composer fields) ----------
  function buildExtras(kind, item) {
    const sty = 'border:1px solid var(--border-default);border-radius:6px;padding:6px 9px;font:13px var(--font-sans);outline:none;background:white;width:100%;box-sizing:border-box;';
    const lbl = 'font:500 11px var(--font-sans);color:var(--fg3);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px;';
    const grid2 = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;';
    const wrap = (inner) => `<div class="tl-edit-grid" style="display:flex;flex-direction:column;gap:8px;margin:8px 0 0;padding:10px;background:var(--color-grey-25);border-radius:8px;border:1px solid var(--border-subtle);">${inner}</div>`;
    if (kind === 'email') {
      const subj = item.dataset.subject || '';
      const to = item.dataset.to || 'joseph.mensah@gmail.com';
      const cc = item.dataset.cc || '';
      const status = item.dataset.status || 'draft';
      const sched = item.dataset.scheduledAt || '';
      const def = new Date(); def.setDate(def.getDate()+1); def.setHours(9,0,0,0);
      const pad = n => String(n).padStart(2,'0');
      const fmtLocal = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      return wrap(`
        <div><div style="${lbl}">Subject</div><input class="tl-ef" data-f="subject" type="text" value="${esc(subj)}" style="${sty}" /></div>
        <div style="${grid2}">
          <div><div style="${lbl}">To</div><input class="tl-ef" data-f="to" type="text" value="${esc(to)}" style="${sty}" /></div>
          <div><div style="${lbl}">Cc</div><input class="tl-ef" data-f="cc" type="text" value="${esc(cc)}" placeholder="comma-separated" style="${sty}" /></div>
        </div>
        <div><div style="${lbl}">When</div>
          <div style="display:flex;gap:6px;">
            <button type="button" class="tl-when-btn ${status!=='scheduled'?'on':''}" data-w="now" style="flex:1;padding:7px;border-radius:6px;border:1px solid var(--border-default);background:white;cursor:pointer;font:500 12px var(--font-sans);"><i class="ri-send-plane-line"></i> Send now</button>
            <button type="button" class="tl-when-btn ${status==='scheduled'?'on':''}" data-w="schedule" style="flex:1;padding:7px;border-radius:6px;border:1px solid var(--border-default);background:white;cursor:pointer;font:500 12px var(--font-sans);"><i class="ri-time-line"></i> Schedule</button>
            <button type="button" class="tl-when-btn" data-w="draft" style="flex:1;padding:7px;border-radius:6px;border:1px solid var(--border-default);background:white;cursor:pointer;font:500 12px var(--font-sans);"><i class="ri-draft-line"></i> Save draft</button>
          </div>
          <input class="tl-ef tl-ef-sched" data-f="scheduledAt" type="datetime-local" value="${esc(sched || fmtLocal(def))}" style="${sty}margin-top:6px;${status==='scheduled'?'':'display:none;'}" />
        </div>`);
    }
    if (kind === 'call') {
      const outcome = item.dataset.outcome || '';
      const dur = item.dataset.duration || '';
      return wrap(`<div style="${grid2}">
        <div><div style="${lbl}">Outcome</div>
          <select class="tl-ef" data-f="outcome" style="${sty}">
            ${['Connected','No answer','Voicemail','Wrong number'].map(o=>`<option ${o===outcome?'selected':''}>${o}</option>`).join('')}
          </select></div>
        <div><div style="${lbl}">Duration (min)</div><input class="tl-ef" data-f="duration" type="number" min="0" value="${esc(dur||'10')}" style="${sty}" /></div>
      </div>`);
    }
    if (kind === 'task') {
      // Task pills already inline-edit (priority/status/assignee/due via prospect-jira).
      // Add a hint so the user knows.
      return `<div style="margin:8px 0 0;font:12px var(--font-sans);color:var(--fg3);"><i class="ri-information-line"></i> Click any pill above (priority, due date, status, assignee) to edit it.</div>`;
    }
    if (kind === 'meeting') {
      const when = item.dataset.when || '';
      const loc = item.dataset.location || '';
      const type = item.dataset.mtype || 'in-person';
      return wrap(`
        <div style="${grid2}">
          <div><div style="${lbl}">Date &amp; time</div><input class="tl-ef" data-f="when" type="datetime-local" value="${esc(when)}" style="${sty}" /></div>
          <div><div style="${lbl}">Type</div>
            <select class="tl-ef" data-f="mtype" style="${sty}">
              <option value="in-person" ${type==='in-person'?'selected':''}>In-person</option>
              <option value="online" ${type==='online'?'selected':''}>Online</option>
            </select></div>
        </div>
        <div><div style="${lbl}">Location / link</div><input class="tl-ef" data-f="location" type="text" value="${esc(loc)}" placeholder="Plot 27, East Legon" style="${sty}" /></div>`);
    }
    if (kind === 'sms') {
      const to = item.dataset.to || '+233 24 880 1142';
      return wrap(`<div><div style="${lbl}">To</div><input class="tl-ef" data-f="to" type="text" value="${esc(to)}" style="${sty}" /></div>`);
    }
    return '';
  }

  // ---------- inline LABEL editor ----------
  function buildLabelEditor(currentLabels) {
    return `<div class="tl-edit-labels" style="margin:10px 0 0;">
      <div style="font:500 11px var(--font-sans);color:var(--fg3);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;">Labels</div>
      <div class="tl-edit-labels-list" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
        ${currentLabels.map((l,i)=>`<span class="tl-label${l.cls?' '+l.cls:''}" data-li="${i}" style="padding-right:6px;">${esc(l.txt)} <button type="button" data-rm-label="${i}" style="background:none;border:0;cursor:pointer;color:inherit;opacity:0.7;padding:0 0 0 2px;font-size:13px;line-height:1;">×</button></span>`).join('')}
        <button type="button" class="tl-add-label-btn" style="display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:999px;border:1px dashed var(--border-default);background:white;cursor:pointer;font:500 11px var(--font-sans);color:var(--fg3);"><i class="ri-add-line"></i> Add label</button>
      </div>
    </div>`;
  }
  function buildAttachEditor(currentAttachments) {
    return `<div class="tl-edit-attachments" style="margin:10px 0 0;">
      <div style="font:500 11px var(--font-sans);color:var(--fg3);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;">Attachments</div>
      <div class="tl-edit-attach-list" style="display:flex;flex-direction:column;gap:6px;">
        ${currentAttachments.map((a,i)=>`<div class="tl-edit-attach-row" data-ai="${i}" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid var(--border-subtle);border-radius:6px;background:white;font:12px var(--font-sans);">
          <i class="${a.iconClass}" style="color:var(--fg3);"></i>
          <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(a.nm)}</span>
          <span style="color:var(--fg3);font-size:11px;">${esc(a.sz)}</span>
          <button type="button" data-rm-attach="${i}" style="background:none;border:0;cursor:pointer;color:var(--fg3);padding:0 4px;">×</button>
        </div>`).join('')}
      </div>
      <label class="tl-add-attach-btn" style="display:inline-flex;align-items:center;gap:4px;margin-top:6px;padding:5px 10px;border-radius:6px;border:1px dashed var(--border-default);background:white;cursor:pointer;font:500 11px var(--font-sans);color:var(--fg3);">
        <i class="ri-attachment-2"></i> Attach files
        <input type="file" multiple style="display:none;" class="tl-add-attach-input" />
      </label>
    </div>`;
  }

  // Inline edit — replaces the title + body of an item with editable fields,
  // adds kind-specific fields (mirroring the composer), labels, and
  // attachments. Email scheduling is exposed inline. Task pill row keeps its
  // own click-to-edit affordance.
  function openSimpleEdit(item) {
    if (item.classList.contains('is-inline-editing')) {
      const t = item.querySelector('.tl-edit-title') || item.querySelector('.tl-edit-body');
      if (t) try { t.focus(); } catch(e){}
      return;
    }

    if (!item.classList.contains('is-expanded')) {
      const sumBtn = item.querySelector('.tl-summary');
      if (sumBtn) sumBtn.click();
    }

    const kind = item.dataset.kind || 'note';
    const titleEl = item.querySelector('.tl-title');
    const bodyEl  = item.querySelector('.tl-body');
    const labelsWrap = item.querySelector('.tl-labels');
    const attachWrap = item.querySelector('.tl-attachments');

    const orig = {
      titleHTML: titleEl ? titleEl.innerHTML : null,
      bodyHTML:  bodyEl  ? bodyEl.innerHTML  : null,
      titleText: titleEl ? titleEl.textContent.trim() : '',
      bodyText:  bodyEl  ? bodyEl.textContent.trim()  : '',
      labelsHTML: labelsWrap ? labelsWrap.outerHTML : null,
      attachHTML: attachWrap ? attachWrap.outerHTML : null,
    };
    let labels      = readLabels(item);
    let attachments = readAttachments(item);

    item.classList.add('is-inline-editing');

    if (titleEl) {
      titleEl.innerHTML = `<input type="text" class="tl-edit-title" value="${esc(orig.titleText)}" placeholder="Title" />`;
    }
    if (bodyEl) {
      bodyEl.innerHTML = `<textarea class="tl-edit-body" placeholder="Add details…" rows="4">${esc(orig.bodyText)}</textarea>`;
    }

    // Replace existing label/attachment chips with editors
    if (labelsWrap) labelsWrap.outerHTML = '';
    if (attachWrap) attachWrap.outerHTML = '';

    // Mount panel: kind extras + label editor + attachment editor + save bar
    const panel = document.createElement('div');
    panel.className = 'tl-edit-panel';
    panel.innerHTML = buildExtras(kind, item) + buildLabelEditor(labels) + buildAttachEditor(attachments);
    item.appendChild(panel);

    const bar = document.createElement('div');
    bar.className = 'tl-edit-bar';
    bar.innerHTML = `
      <button type="button" class="tl-edit-btn cancel" data-act="cancel">Cancel</button>
      <button type="button" class="tl-edit-btn save"   data-act="save"><i class="ri-check-line"></i> Save</button>
    `;
    item.appendChild(bar);

    // ---- email when-buttons toggle ----
    const whenBtns = panel.querySelectorAll('.tl-when-btn');
    const schedInp = panel.querySelector('.tl-ef-sched');
    const setWhen = (w) => {
      whenBtns.forEach(b => {
        b.classList.toggle('on', b.dataset.w === w);
        b.style.background = b.classList.contains('on') ? 'var(--color-brand-50)' : 'white';
        b.style.borderColor = b.classList.contains('on') ? 'var(--color-brand-400)' : 'var(--border-default)';
        b.style.color = b.classList.contains('on') ? 'var(--color-brand-700)' : 'var(--color-grey-700)';
      });
      if (schedInp) schedInp.style.display = w === 'schedule' ? 'block' : 'none';
      panel.dataset.when = w;
    };
    whenBtns.forEach(b => b.addEventListener('click', e => { e.stopPropagation(); setWhen(b.dataset.w); }));
    if (whenBtns.length) setWhen(panel.querySelector('.tl-when-btn.on') ? panel.querySelector('.tl-when-btn.on').dataset.w : 'now');

    // ---- label editor wiring ----
    const labelsList = panel.querySelector('.tl-edit-labels-list');
    const addLabelBtn = panel.querySelector('.tl-add-label-btn');
    const rebuildLabels = () => {
      // re-render only the list (preserve add btn)
      labelsList.innerHTML = labels.map((l,i)=>`<span class="tl-label${l.cls?' '+l.cls:''}" data-li="${i}" style="padding-right:6px;">${esc(l.txt)} <button type="button" data-rm-label="${i}" style="background:none;border:0;cursor:pointer;color:inherit;opacity:0.7;padding:0 0 0 2px;font-size:13px;line-height:1;">×</button></span>`).join('') + addLabelBtn.outerHTML;
      bindLabelHandlers();
    };
    function bindLabelHandlers() {
      const newAddBtn = labelsList.querySelector('.tl-add-label-btn');
      if (newAddBtn) newAddBtn.addEventListener('click', e => { e.stopPropagation(); openLabelPicker(newAddBtn); });
      labelsList.querySelectorAll('[data-rm-label]').forEach(b => b.addEventListener('click', e => {
        e.stopPropagation();
        labels.splice(parseInt(b.dataset.rmLabel,10),1);
        rebuildLabels();
      }));
    }
    function openLabelPicker(anchor) {
      // close any existing
      document.querySelectorAll('.tl-label-picker').forEach(p => p.remove());
      const pop = document.createElement('div');
      pop.className = 'tl-label-picker';
      pop.style.cssText = 'position:absolute;z-index:300;background:white;border:1px solid var(--border-default);border-radius:8px;box-shadow:0 12px 32px rgba(15,23,42,0.12);padding:6px;width:240px;font:12px var(--font-sans);';
      pop.innerHTML = `
        <div style="padding:4px 6px 6px;"><input type="text" placeholder="Find or create…" style="width:100%;box-sizing:border-box;border:1px solid var(--border-default);border-radius:6px;padding:5px 8px;font:12px var(--font-sans);outline:none;" /></div>
        <div class="tl-lp-list" style="display:flex;flex-direction:column;gap:2px;max-height:200px;overflow-y:auto;"></div>
      `;
      document.body.appendChild(pop);
      const r = anchor.getBoundingClientRect();
      pop.style.top = (window.scrollY + r.bottom + 4) + 'px';
      pop.style.left = (window.scrollX + r.left) + 'px';
      const inp = pop.querySelector('input');
      const list = pop.querySelector('.tl-lp-list');
      const render = (q) => {
        const ql = (q||'').toLowerCase().trim();
        const used = new Set(labels.map(l=>l.txt));
        const matches = LABEL_PRESETS.filter(p => !used.has(p.txt) && (!ql || p.txt.toLowerCase().includes(ql)));
        list.innerHTML = matches.map(p => `<button type="button" data-lp="${esc(p.txt)}" data-lc="${p.cls}" style="background:none;border:0;text-align:left;padding:5px 8px;border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:6px;"><span class="tl-label${p.cls?' '+p.cls:''}">${esc(p.txt)}</span></button>`).join('');
        if (ql && !LABEL_PRESETS.some(p => p.txt.toLowerCase() === ql)) {
          list.insertAdjacentHTML('beforeend', `<button type="button" data-lp-new="${esc(q)}" style="background:none;border:0;text-align:left;padding:5px 8px;border-radius:6px;cursor:pointer;color:var(--color-brand-700);font-weight:500;"><i class="ri-add-line"></i> Create "${esc(q)}"</button>`);
        }
        list.querySelectorAll('button[data-lp]').forEach(b => b.addEventListener('click', e => {
          e.stopPropagation();
          labels.push({ txt: b.dataset.lp, cls: b.dataset.lc });
          pop.remove(); rebuildLabels();
        }));
        list.querySelectorAll('button[data-lp-new]').forEach(b => b.addEventListener('click', e => {
          e.stopPropagation();
          labels.push({ txt: b.dataset.lpNew, cls: '' });
          pop.remove(); rebuildLabels();
        }));
      };
      render('');
      inp.addEventListener('input', () => render(inp.value));
      inp.focus();
      const onDoc = (e) => { if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener('mousedown', onDoc); } };
      setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    }
    bindLabelHandlers();

    // ---- attachment editor wiring ----
    const attachList = panel.querySelector('.tl-edit-attach-list');
    const fileInput = panel.querySelector('.tl-add-attach-input');
    const rebuildAttach = () => {
      attachList.innerHTML = attachments.map((a,i)=>`<div class="tl-edit-attach-row" data-ai="${i}" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid var(--border-subtle);border-radius:6px;background:white;font:12px var(--font-sans);">
        <i class="${a.iconClass}" style="color:var(--fg3);"></i>
        <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(a.nm)}</span>
        <span style="color:var(--fg3);font-size:11px;">${esc(a.sz)}</span>
        <button type="button" data-rm-attach="${i}" style="background:none;border:0;cursor:pointer;color:var(--fg3);padding:0 4px;">×</button>
      </div>`).join('');
      attachList.querySelectorAll('[data-rm-attach]').forEach(b => b.addEventListener('click', e => {
        e.stopPropagation();
        attachments.splice(parseInt(b.dataset.rmAttach,10),1);
        rebuildAttach();
      }));
    };
    function fileToAttachment(f) {
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      const isImg = /^(png|jpe?g|gif|webp|svg)$/.test(ext);
      const isPdf = ext === 'pdf';
      const isDoc = /^(docx?|xlsx?|pptx?|txt)$/.test(ext);
      return {
        nm: f.name,
        sz: (f.size > 1024*1024 ? (f.size/1024/1024).toFixed(1)+' MB' : Math.max(1, Math.round(f.size/1024))+' KB') + ' · ' + ext.toUpperCase(),
        iconClass: isImg ? 'ri-image-2-line' : isPdf ? 'ri-file-pdf-line' : isDoc ? 'ri-file-text-line' : 'ri-file-line',
        tone: isImg ? 'img' : isPdf ? 'pdf' : isDoc ? 'doc' : 'gen',
        isImg
      };
    }
    if (fileInput) {
      fileInput.addEventListener('change', () => {
        Array.from(fileInput.files || []).forEach(f => attachments.push(fileToAttachment(f)));
        fileInput.value = '';
        rebuildAttach();
      });
    }
    rebuildAttach();

    // ---- save / cancel ----
    const cleanup = () => {
      item.classList.remove('is-inline-editing');
      panel.remove();
      bar.remove();
    };

    bar.querySelector('[data-act="cancel"]').addEventListener('click', (e) => {
      e.stopPropagation();
      if (titleEl && orig.titleHTML != null) titleEl.innerHTML = orig.titleHTML;
      if (bodyEl  && orig.bodyHTML  != null) bodyEl.innerHTML  = orig.bodyHTML;
      // restore labels/attachments wrappers
      if (orig.labelsHTML && bodyEl) bodyEl.insertAdjacentHTML('afterend', orig.labelsHTML);
      if (orig.attachHTML && bodyEl) bodyEl.insertAdjacentHTML('afterend', orig.attachHTML);
      cleanup();
    });

    bar.querySelector('[data-act="save"]').addEventListener('click', (e) => {
      e.stopPropagation();
      const newTitleEl = item.querySelector('.tl-edit-title');
      const newBodyEl  = item.querySelector('.tl-edit-body');
      const tv = newTitleEl ? newTitleEl.value.trim() : null;
      const bv = newBodyEl  ? newBodyEl.value.trim()  : null;
      if ((!tv || tv.length === 0) && (!bv || bv.length === 0) && kind !== 'email') {
        window.toast('Cannot be empty', { kind: 'error', icon: 'ri-error-warning-line' });
        return;
      }
      // collect kind-specific fields
      const fields = {};
      panel.querySelectorAll('.tl-ef').forEach(f => fields[f.dataset.f] = f.value.trim());

      // commit title/body
      if (titleEl && tv != null) titleEl.textContent = tv || (kind === 'email' ? (fields.subject || '') : '');
      if (bodyEl  && bv != null) bodyEl.textContent  = bv;

      // commit kind-specific
      if (kind === 'email') {
        if (fields.subject) item.dataset.subject = fields.subject;
        if (fields.to)      item.dataset.to = fields.to;
        item.dataset.cc = fields.cc || '';
        const when = panel.dataset.when || 'now';
        if (when === 'schedule' && fields.scheduledAt) {
          item.dataset.status = 'scheduled';
          item.dataset.scheduledAt = fields.scheduledAt;
        } else if (when === 'draft') {
          item.dataset.status = 'draft';
          delete item.dataset.scheduledAt;
        } else {
          item.dataset.status = 'sent';
          delete item.dataset.scheduledAt;
        }
        if (typeof refreshEmailItem === 'function') refreshEmailItem(item);
      } else if (kind === 'call') {
        if (fields.outcome)  item.dataset.outcome = fields.outcome;
        if (fields.duration) item.dataset.duration = fields.duration;
      } else if (kind === 'meeting') {
        if (fields.when)     item.dataset.when = fields.when;
        if (fields.location) item.dataset.location = fields.location;
        if (fields.mtype)    item.dataset.mtype = fields.mtype;
      } else if (kind === 'sms') {
        if (fields.to) item.dataset.to = fields.to;
      }

      // re-emit labels and attachments
      const placeAfter = bodyEl || titleEl;
      if (placeAfter) {
        const labelsHTML = renderLabels(labels);
        const attachHTML = renderAttachments(attachments);
        if (attachHTML) placeAfter.insertAdjacentHTML('afterend', attachHTML);
        if (labelsHTML) placeAfter.insertAdjacentHTML('afterend', labelsHTML);
      }

      // collapsed-summary preview
      const summaryTitle = item.querySelector('.tl-summary .t-title');
      if (summaryTitle) {
        const previewText = (tv && tv.length ? tv : (bv || (kind==='email'?fields.subject:''))).slice(0, 120);
        if (previewText) summaryTitle.textContent = previewText;
      }
      markEdited(item);
      cleanup();
      window.toast('Saved', { kind: 'success', icon: 'ri-check-line' });
    });

    // Cmd/Ctrl+Enter saves; Esc cancels
    item.addEventListener('keydown', function onKey(ev) {
      if (!item.classList.contains('is-inline-editing')) {
        item.removeEventListener('keydown', onKey);
        return;
      }
      if ((ev.metaKey || ev.ctrlKey) && ev.key === 'Enter') {
        ev.preventDefault();
        bar.querySelector('[data-act="save"]').click();
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        bar.querySelector('[data-act="cancel"]').click();
      }
    });

    const firstEdit = item.querySelector('.tl-edit-title') || item.querySelector('.tl-edit-body');
    if (firstEdit) {
      try { firstEdit.focus(); firstEdit.select && firstEdit.select(); } catch(e) {}
    }
  }

  function openEmailEditor(item) {
    const isNew = !item;
    const subject = item ? (item.dataset.subject || '') : '';
    const bodyEl = item && item.querySelector('.tl-body');
    const body = bodyEl ? bodyEl.textContent.trim() : '';
    const status = item ? item.dataset.status : 'draft';
    const scheduledAt = item ? item.dataset.scheduledAt : '';

    // default schedule = tomorrow 9am
    const def = new Date(); def.setDate(def.getDate() + 1); def.setHours(9, 0, 0, 0);
    const pad = n => String(n).padStart(2,'0');
    const fmtLocal = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const schedDefault = scheduledAt || fmtLocal(def);

    openSheet({
      icon: 'ri-mail-send-line',
      iconBg: 'var(--color-blue-50)', iconColor: 'var(--color-blue-600)',
      title: isNew ? 'New email' : 'Edit email — ' + (status === 'scheduled' ? 'scheduled' : 'draft'),
      sub: 'to joseph.mensah@gmail.com',
      body: `
        <div style="display:flex;flex-direction:column;gap:12px;">
          <label style="font:500 12px var(--font-sans);color:var(--color-grey-700);">Subject<input id="emSubj" type="text" value="${esc(subject)}" placeholder="Subject line…" style="display:block;margin-top:4px;width:100%;border:1px solid var(--border-default);border-radius:8px;padding:9px 12px;font:14px var(--font-sans);outline:none;" /></label>
          <label style="font:500 12px var(--font-sans);color:var(--color-grey-700);">Body<textarea id="emBody" rows="6" placeholder="Write your message…" style="display:block;margin-top:4px;width:100%;border:1px solid var(--border-default);border-radius:8px;padding:10px 12px;font:14px var(--font-sans);outline:none;resize:vertical;">${esc(body)}</textarea></label>

          <div style="border:1px solid var(--border-default);border-radius:8px;padding:12px;background:var(--color-grey-25);">
            <div style="font:500 12px var(--font-sans);color:var(--color-grey-700);margin-bottom:8px;">When to send</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <button type="button" data-when="now" class="em-when active" style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:8px;border:1.5px solid var(--color-brand-600);background:white;color:var(--color-brand-700);font:500 13px var(--font-sans);cursor:pointer;justify-content:center;"><i class="ri-send-plane-line"></i>Send now</button>
              <button type="button" data-when="schedule" class="em-when" style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:8px;border:1px solid var(--border-default);background:white;color:var(--color-grey-700);font:500 13px var(--font-sans);cursor:pointer;justify-content:center;"><i class="ri-time-line"></i>Schedule</button>
            </div>
            <div id="emSchedRow" style="display:none;margin-top:10px;">
              <input id="emSchedAt" type="datetime-local" value="${schedDefault}" style="width:100%;border:1px solid var(--border-default);border-radius:8px;padding:9px 12px;font:14px var(--font-sans);outline:none;background:white;" />
              <div style="margin-top:6px;font:11px var(--font-sans);color:var(--fg3);">Local time. The email becomes editable until it's sent.</div>
            </div>
          </div>

          ${item && status === 'scheduled' ? `
            <div style="padding:10px 12px;background:var(--color-warning-50);border:1px solid var(--color-warning-200);border-radius:8px;font:12px var(--font-sans);color:var(--color-warning-800);">
              <i class="ri-time-line" style="margin-right:6px;"></i>Currently scheduled for <strong>${esc(scheduledAt ? fmtScheduleWhen(new Date(scheduledAt)) : '')}</strong>.
            </div>` : ''}
          <button type="button" id="emSaveDraft" style="background:none;border:1px dashed var(--border-default);padding:8px 12px;border-radius:8px;font:500 12px var(--font-sans);cursor:pointer;color:var(--fg3);"><i class="ri-draft-line"></i> Save as draft</button>
        </div>
      `,
      ok: 'Send email',
      onMount: (back) => {
        let when = (item && status === 'scheduled') ? 'schedule' : 'now';
        const setWhen = (v) => {
          when = v;
          back.querySelectorAll('.em-when').forEach(b => {
            const active = b.dataset.when === v;
            b.style.cssText = `display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:8px;border:${active?'1.5px solid var(--color-brand-600)':'1px solid var(--border-default)'};background:${active?'white':'white'};color:${active?'var(--color-brand-700)':'var(--color-grey-700)'};font:500 13px var(--font-sans);cursor:pointer;justify-content:center;`;
            b.classList.toggle('active', active);
          });
          back.querySelector('#emSchedRow').style.display = v === 'schedule' ? '' : 'none';
          back.querySelector('[data-act=ok]').innerHTML = v === 'schedule'
            ? '<i class="ri-time-line" style="margin-right:6px;"></i>Schedule send'
            : '<i class="ri-send-plane-line" style="margin-right:6px;"></i>Send now';
        };
        back.querySelectorAll('.em-when').forEach(b => b.onclick = () => setWhen(b.dataset.when));
        setWhen(when);

        back.querySelector('#emSaveDraft').onclick = () => {
          const subj = back.querySelector('#emSubj').value.trim();
          const bd = back.querySelector('#emBody').value.trim();
          if (!subj && !bd) { window.toast('Add a subject or body first', { kind: 'error', icon: 'ri-error-warning-line' }); return; }
          if (item) {
            item.dataset.status = 'draft';
            item.dataset.subject = subj;
            delete item.dataset.scheduledAt;
            const bodyEl = item.querySelector('.tl-body');
            if (bodyEl) bodyEl.textContent = bd;
            refreshEmailItem(item);
            markEdited(item);
          } else {
            createEmailItem({ subject: subj, body: bd, status: 'draft' });
          }
          back.remove();
          window.toast('Saved as draft', { icon: 'ri-draft-line' });
        };
      },
      onOk: (back) => {
        const subj = back.querySelector('#emSubj').value.trim();
        const bd = back.querySelector('#emBody').value.trim();
        const when = (back.querySelector('.em-when.active') || {}).dataset?.when || 'now';
        if (!subj) { window.toast('Add a subject', { kind: 'error', icon: 'ri-error-warning-line' }); return false; }
        if (!bd)   { window.toast('Add a message', { kind: 'error', icon: 'ri-error-warning-line' }); return false; }

        if (when === 'schedule') {
          const at = back.querySelector('#emSchedAt').value;
          if (!at) { window.toast('Pick a date & time', { kind: 'error', icon: 'ri-error-warning-line' }); return false; }
          const at_d = new Date(at);
          if (at_d <= new Date()) { window.toast('Pick a time in the future', { kind: 'error', icon: 'ri-error-warning-line' }); return false; }
          if (item) {
            item.dataset.status = 'scheduled';
            item.dataset.subject = subj;
            item.dataset.scheduledAt = at;
            const bodyEl = item.querySelector('.tl-body');
            if (bodyEl) bodyEl.textContent = bd;
            refreshEmailItem(item);
            markEdited(item);
          } else {
            createEmailItem({ subject: subj, body: bd, status: 'scheduled', scheduledAt: at });
          }
          window.toast('Scheduled for ' + fmtScheduleWhen(at_d), { kind: 'success', icon: 'ri-time-line' });
        } else {
          if (item) {
            item.dataset.status = 'sent';
            item.dataset.subject = subj;
            delete item.dataset.scheduledAt;
            const bodyEl = item.querySelector('.tl-body');
            if (bodyEl) bodyEl.textContent = bd;
            refreshEmailItem(item);
          } else {
            createEmailItem({ subject: subj, body: bd, status: 'sent' });
          }
          window.toast('Email sent', { kind: 'success', icon: 'ri-send-plane-line' });
        }
        return true;
      }
    });
  }

  function createEmailItem({ subject, body, status, scheduledAt }) {
    const tl = document.querySelector('.timeline'); if (!tl) return;
    const item = document.createElement('div');
    item.className = 'tl-item info';
    item.dataset.kind = 'email';
    item.dataset.status = status;
    item.dataset.subject = subject;
    item.dataset.id = 'tl-' + Math.random().toString(36).slice(2, 10);
    if (scheduledAt) item.dataset.scheduledAt = scheduledAt;
    const verb = status === 'sent' ? 'sent an email' : status === 'scheduled' ? 'scheduled an email' : 'drafted an email';
    item.innerHTML = `
      <div class="dot"><i class="ri-${status === 'sent' ? 'mail-send-line' : status === 'scheduled' ? 'time-line' : 'draft-line'}"></i></div>
      <div class="tl-head">
        <div class="who">Kevin Manga <span>${verb} · "${esc(subject)}"</span></div>
        <div class="when">Just now</div>
      </div>
      <div class="tl-body">${esc(body)}</div>
    `;
    item.style.opacity = '0';
    tl.insertBefore(item, tl.firstChild);
    requestAnimationFrame(() => {
      item.style.transition = 'opacity .3s';
      item.style.opacity = '1';
    });
    refreshEmailItem(item);
    // Bump tab counts (mirror prospect.js)
    const bump = (name) => document.querySelectorAll('.pd-tab').forEach(t => {
      if (t.textContent.trim().startsWith(name)) {
        const cnt = t.querySelector('.cnt');
        if (cnt) cnt.textContent = (parseInt(cnt.textContent) || 0) + 1;
      }
    });
    bump('All'); bump('Emails');
  }

  function refreshEmailItem(item) {
    const status = item.dataset.status;
    const subject = item.dataset.subject || '';
    const dot = item.querySelector('.dot');
    const headSpan = item.querySelector('.tl-head .who span');
    if (dot) {
      dot.innerHTML = `<i class="ri-${status === 'sent' ? 'mail-send-line' : status === 'scheduled' ? 'time-line' : 'draft-line'}"></i>`;
    }
    if (headSpan) {
      const verb = status === 'sent' ? 'sent an email'
                 : status === 'scheduled' ? 'scheduled an email'
                 : 'drafted an email';
      headSpan.textContent = `${verb} · "${subject}"`;
    }
    // status pill in body
    let pill = item.querySelector('.tl-status');
    if (status !== 'sent') {
      if (!pill) {
        pill = document.createElement('div');
        pill.className = 'tl-status';
        const body = item.querySelector('.tl-body');
        if (body) body.appendChild(pill);
      }
      const sched = item.dataset.scheduledAt;
      pill.innerHTML = status === 'scheduled'
        ? `<span style="display:inline-flex;gap:6px;align-items:center;margin-top:8px;padding:4px 10px;border-radius:999px;font:500 11px var(--font-sans);background:var(--color-warning-50);color:var(--color-warning-800);border:1px solid var(--color-warning-200);"><i class="ri-time-line"></i>Will send ${esc(sched ? fmtScheduleWhen(new Date(sched)) : '')}</span>`
        : `<span style="display:inline-flex;gap:6px;align-items:center;margin-top:8px;padding:4px 10px;border-radius:999px;font:500 11px var(--font-sans);background:var(--color-grey-100);color:var(--color-grey-700);border:1px solid var(--border-default);"><i class="ri-draft-line"></i>Draft — not yet sent</span>`;
    } else if (pill) {
      pill.remove();
    }
  }

  function markEdited(item) {
    let mark = item.querySelector('.tl-edited');
    const when = item.querySelector('.tl-head .when');
    if (!when) return;
    if (!mark) {
      mark = document.createElement('span');
      mark.className = 'tl-edited';
      mark.style.cssText = 'font:11px var(--font-sans);color:var(--fg4);margin-right:6px;';
      mark.textContent = 'edited · ';
      when.insertBefore(mark, when.firstChild);
    }
  }

  // ---------- Sheet primitive (used by edit/view) ----------
  function openSheet(opts) {
    const back = document.createElement('div');
    back.style.cssText = 'position:fixed;inset:0;background:rgba(15,14,22,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;overflow-y:auto;';
    back.innerHTML = `
      <div style="background:white;border-radius:14px;width:100%;max-width:560px;padding:0;box-shadow:0 20px 50px rgba(0,0,0,0.2);overflow:hidden;">
        <div style="padding:18px 22px;border-bottom:1px solid var(--border-subtle);display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;border-radius:8px;background:${opts.iconBg};color:${opts.iconColor};display:inline-flex;align-items:center;justify-content:center;"><i class="${opts.icon}" style="font-size:18px;"></i></div>
          <div style="flex:1;min-width:0;">
            <h3 style="margin:0;font:600 16px var(--font-sans);color:var(--color-grey-900);">${esc(opts.title)}</h3>
            ${opts.sub ? `<p style="margin:2px 0 0;font:12px var(--font-sans);color:var(--fg3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(opts.sub)}</p>` : ''}
          </div>
          <button type="button" data-act="x" style="background:none;border:none;cursor:pointer;color:var(--fg4);width:32px;height:32px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;"><i class="ri-close-line" style="font-size:18px;"></i></button>
        </div>
        <div style="padding:18px 22px;">${opts.body}</div>
        <div style="display:flex;gap:8px;justify-content:flex-end;padding:14px 22px;background:var(--color-grey-25);border-top:1px solid var(--border-subtle);">
          ${opts.hideCancel ? '' : `<button data-act="cancel" style="background:none;border:1px solid var(--border-default);padding:9px 16px;border-radius:8px;font:500 13px var(--font-sans);cursor:pointer;color:var(--fg2);">Cancel</button>`}
          <button data-act="ok" style="background:var(--color-brand-600);color:white;border:none;padding:9px 16px;border-radius:8px;font:500 13px var(--font-sans);cursor:pointer;display:inline-flex;align-items:center;">${esc(opts.ok || 'Save')}</button>
        </div>
      </div>
    `;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('[data-act=x]').onclick = close;
    const cancel = back.querySelector('[data-act=cancel]'); if (cancel) cancel.onclick = close;
    back.querySelector('[data-act=ok]').onclick = () => {
      const r = opts.onOk && opts.onOk(back);
      if (r === true) close();
    };
    if (opts.onMount) opts.onMount(back);
    return back;
  }

  // ---------- Email composer entry from .ctype-tabs ----------
  // Override: when user picks Email in the inline composer, replace the simple
  // textarea send with the full editor.
  const composer = document.querySelector('.composer');
  if (composer) {
    const saveBtn = composer.querySelector('.btn-primary');
    const ta = composer.querySelector('textarea');
    if (saveBtn) {
      saveBtn.addEventListener('click', (e) => {
        const active = composer.querySelector('.ctype-tabs button.active');
        const kind = active ? active.textContent.trim() : '';
        if (kind === 'Email') {
          // intercept BEFORE prospect.js handler (capture phase)
          e.stopImmediatePropagation();
          e.preventDefault();
          const seed = ta && ta.value.trim();
          openEmailEditor(null);
          // pre-fill body if user typed in the inline composer
          if (seed) {
            requestAnimationFrame(() => {
              const bodyEl = document.querySelector('#emBody');
              if (bodyEl) bodyEl.value = seed;
            });
            ta.value = '';
          }
        }
      }, true);
    }
  }

  // expose helpers globally so other scripts (or the user) can call them
  window.openEmailEditor = openEmailEditor;
  window.toast = window.toast || function () {};
  // confirmDialog is defined in prospect.js — fall back if missing
  if (!window.confirmDialog) {
    window.confirmDialog = (opts) => Promise.resolve(window.confirm(opts.message || 'OK?'));
  }
})();
