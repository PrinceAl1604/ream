// ============================================================
// prospect-jira.js
// Jira-style Task layer + richer detail/edit dialogs for every
// activity kind on the prospect detail page.
//
// Loaded AFTER prospect-items.js. We mount our own action menus
// on .tl-item elements (replacing the simpler ones from items.js
// for tasks specifically) and provide click-to-open detail panes
// for note / call / email / task / meeting.
// ============================================================

(function () {
  if (!document.querySelector('.lc-card') || !document.querySelector('.timeline')) return;

  // ---------- shared helpers ----------
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const PEOPLE = [
    { id: 'kevin',  name: 'Kevin Manga',     role: 'Sales agent',   initials: 'KM', color: '#7c3aed' },
    { id: 'sara',   name: 'Sara Ndong',      role: 'Manager',       initials: 'SN', color: '#0891b2' },
    { id: 'aisha',  name: 'Aisha Bello',     role: 'Senior agent',  initials: 'AB', color: '#db2777' },
    { id: 'daniel', name: 'Daniel Owusu',    role: 'Sales agent',   initials: 'DO', color: '#059669' },
    { id: 'linda',  name: 'Linda Yawson',    role: 'Lead agent',    initials: 'LY', color: '#ea580c' },
    { id: 'esi',    name: 'Esi Mensah',      role: 'Senior agent',  initials: 'EM', color: '#9333ea' },
  ];
  const ME = PEOPLE[0];

  // ---------- Jira-style task model ----------
  // Stored entirely on the .tl-item dataset to keep this layer stateless.
  // status:    todo | in-progress | in-review | blocked | done | cancelled
  // priority:  lowest | low | medium | high | highest
  // type:      task | bug | story (we only ship 'task' but render is type-aware)
  const TASK_STATUS = [
    { id: 'todo',        label: 'To do',      bg: '#eef2ff', fg: '#4338ca', dot: '#6366f1' },
    { id: 'in-progress', label: 'In progress',bg: '#dbeafe', fg: '#1d4ed8', dot: '#2563eb' },
    { id: 'in-review',   label: 'In review',  bg: '#fef3c7', fg: '#92400e', dot: '#d97706' },
    { id: 'blocked',     label: 'Blocked',    bg: '#fee2e2', fg: '#991b1b', dot: '#dc2626' },
    { id: 'done',        label: 'Done',       bg: '#d1fae5', fg: '#065f46', dot: '#059669' },
    { id: 'cancelled',   label: 'Cancelled',  bg: '#f3f4f6', fg: '#6b7280', dot: '#9ca3af' },
  ];
  const TASK_PRIORITY = [
    { id: 'lowest',  label: 'Lowest',  icon: 'ri-arrow-down-double-line', color: '#64748b' },
    { id: 'low',     label: 'Low',     icon: 'ri-arrow-down-s-line',      color: '#0284c7' },
    { id: 'medium',  label: 'Medium',  icon: 'ri-equal-line',             color: '#65a30d' },
    { id: 'high',    label: 'High',    icon: 'ri-arrow-up-s-line',        color: '#ea580c' },
    { id: 'highest', label: 'Highest', icon: 'ri-arrow-up-double-line',   color: '#dc2626' },
  ];
  const findStatus   = id => TASK_STATUS.find(s => s.id === id) || TASK_STATUS[0];
  const findPriority = id => TASK_PRIORITY.find(p => p.id === id) || TASK_PRIORITY[2];

  // Issue keys: PRO-101, PRO-102 …
  let nextKey = 100;
  document.querySelectorAll('.timeline .tl-item[data-kind="task"]').forEach(it => {
    nextKey++;
    if (!it.dataset.taskKey) it.dataset.taskKey = 'PRO-' + nextKey;
    if (!it.dataset.taskStatus)   it.dataset.taskStatus   = 'todo';
    if (!it.dataset.taskPriority) it.dataset.taskPriority = 'medium';
    if (!it.dataset.taskAssignee) it.dataset.taskAssignee = 'kevin';
    if (!it.dataset.taskReporter) it.dataset.taskReporter = 'sara';
    if (!it.dataset.taskDue)      it.dataset.taskDue      = '2026-11-12';
    if (!it.dataset.taskTitle) {
      const headSpan = it.querySelector('.tl-head .who span');
      const m = headSpan && headSpan.textContent.match(/"([^"]+)"/);
      it.dataset.taskTitle = m ? m[1] : 'Untitled task';
    }
    if (!it.dataset.taskDesc) {
      const body = it.querySelector('.tl-body');
      it.dataset.taskDesc = body ? body.textContent.trim() : '';
    }
    rerenderTaskRow(it);
  });

  // ---------- Render: convert a task .tl-item into a Jira-like row ----------
  function rerenderTaskRow(item) {
    const key       = item.dataset.taskKey;
    const status    = findStatus(item.dataset.taskStatus);
    const priority  = findPriority(item.dataset.taskPriority);
    const assignee  = PEOPLE.find(p => p.id === item.dataset.taskAssignee) || ME;
    const reporter  = PEOPLE.find(p => p.id === item.dataset.taskReporter) || ME;
    const title     = item.dataset.taskTitle || 'Untitled task';
    const due       = item.dataset.taskDue;

    // Compute due-date formatting & overdue
    const today = new Date(); today.setHours(0,0,0,0);
    const dueDate = due ? new Date(due) : null;
    const overdue = dueDate && dueDate < today && status.id !== 'done' && status.id !== 'cancelled';
    const dueLabel = dueDate ? dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No due date';

    // Re-paint: replace the dot with a Jira-style type icon, and the body
    // with a row of pills.
    const dot = item.querySelector('.dot');
    if (dot) {
      dot.style.background = '#eef2ff';
      dot.style.color = '#4338ca';
      dot.innerHTML = `<i class="ri-checkbox-line" title="Task"></i>`;
    }

    const head = item.querySelector('.tl-head .who');
    if (head) {
      const span = head.querySelector('span');
      head.innerHTML = `<a href="#" class="jr-key" data-act="open-task" style="color:var(--color-brand-700);font:500 12px var(--font-sans);text-decoration:none;border:1px solid var(--border-subtle);padding:1px 6px;border-radius:4px;margin-right:6px;background:white;">${esc(key)}</a><strong style="font:600 14px var(--font-sans);color:var(--color-grey-900);">${esc(title)}</strong>`;
    }

    let body = item.querySelector('.tl-body');
    if (!body) {
      body = document.createElement('div'); body.className = 'tl-body';
      item.appendChild(body);
    }
    body.innerHTML = `
      <div class="jr-row">
        <span class="jr-pill jr-status" data-act="cycle-status" style="background:${status.bg};color:${status.fg};">
          <span class="jr-dot" style="background:${status.dot};"></span>${esc(status.label)}
          <i class="ri-arrow-down-s-line" style="font-size:13px;opacity:.6;"></i>
        </span>
        <span class="jr-pill jr-prio" data-act="cycle-prio" title="Priority: ${esc(priority.label)}">
          <i class="${priority.icon}" style="color:${priority.color};font-size:14px;"></i>${esc(priority.label)}
        </span>
        <span class="jr-pill jr-due ${overdue?'overdue':''}" title="Due ${esc(dueLabel)}">
          <i class="ri-calendar-line"></i>${esc(dueLabel)}${overdue?' · overdue':''}
        </span>
        <span class="jr-spacer"></span>
        <span class="jr-avatar" data-act="reassign-task" title="Assignee: ${esc(assignee.name)}" style="background:${assignee.color};">${esc(assignee.initials)}</span>
        <span class="jr-reporter" title="Reporter: ${esc(reporter.name)}">
          <span class="jr-avatar sm" style="background:${reporter.color};">${esc(reporter.initials)}</span>
        </span>
        <button type="button" class="jr-open" data-act="open-task" title="Open task"><i class="ri-external-link-line"></i></button>
      </div>
    `;

    // Wire interactions on this row
    item.querySelectorAll('[data-act]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        const a = el.dataset.act;
        if (a === 'open-task')    return openTaskDetail(item);
        if (a === 'cycle-status') return cycleStatus(item);
        if (a === 'cycle-prio')   return cyclePriority(item);
        if (a === 'reassign-task')return openAssigneePicker(item, el);
      }, { capture: false });
    });

    // Style polish: dim cancelled/done
    item.style.opacity = (status.id === 'cancelled') ? '0.6' : '';
    if (status.id === 'cancelled' && body) body.style.textDecoration = 'line-through';
    else if (body) body.style.textDecoration = '';

    // Class hint for the column dot color
    item.classList.remove('warn','success','brand','info');
    if (status.id === 'done') item.classList.add('success');
    else if (status.id === 'blocked') item.classList.add('warn');
    else item.classList.add('info');
  }

  function cycleStatus(item) {
    const cur = item.dataset.taskStatus || 'todo';
    const idx = TASK_STATUS.findIndex(s => s.id === cur);
    const next = TASK_STATUS[(idx + 1) % TASK_STATUS.length];
    item.dataset.taskStatus = next.id;
    rerenderTaskRow(item);
    window.toast(`Status → ${next.label}`, { kind: 'success', icon: 'ri-checkbox-line' });
  }
  function cyclePriority(item) {
    const cur = item.dataset.taskPriority || 'medium';
    const idx = TASK_PRIORITY.findIndex(p => p.id === cur);
    const next = TASK_PRIORITY[(idx + 1) % TASK_PRIORITY.length];
    item.dataset.taskPriority = next.id;
    rerenderTaskRow(item);
  }

  function openAssigneePicker(item, anchor) {
    document.querySelectorAll('.jr-pop').forEach(n => n.remove());
    const pop = document.createElement('div');
    pop.className = 'jr-pop';
    pop.innerHTML = `
      <div class="jr-pop-head">Assign to</div>
      <div class="jr-pop-list">
        ${PEOPLE.map(p => `
          <button type="button" data-id="${p.id}">
            <span class="jr-avatar" style="background:${p.color};">${p.initials}</span>
            <span class="jr-pop-meta">
              <span class="jr-pop-name">${esc(p.name)}</span>
              <span class="jr-pop-role">${esc(p.role)}</span>
            </span>
          </button>
        `).join('')}
      </div>
    `;
    document.body.appendChild(pop);
    const r = anchor.getBoundingClientRect();
    pop.style.top = (r.bottom + window.scrollY + 6) + 'px';
    pop.style.left = Math.max(8, r.right + window.scrollX - 240) + 'px';
    pop.querySelectorAll('button[data-id]').forEach(b => {
      b.onclick = (e) => {
        e.stopPropagation();
        item.dataset.taskAssignee = b.dataset.id;
        rerenderTaskRow(item);
        const p = PEOPLE.find(x => x.id === b.dataset.id);
        window.toast(`Assigned to ${p.name}`, { kind: 'success', icon: 'ri-user-shared-line' });
        pop.remove();
      };
    });
    setTimeout(() => {
      const onDoc = (e) => { if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener('click', onDoc, true); } };
      document.addEventListener('click', onDoc, true);
    }, 0);
  }

  // ---------- Generic detail dialog primitive ----------
  function openSheet({ width = 720, header, body, footer, onMount }) {
    const back = document.createElement('div');
    back.className = 'jr-sheet-back';
    back.innerHTML = `
      <div class="jr-sheet" style="max-width:${width}px;">
        ${header}
        <div class="jr-sheet-body">${body}</div>
        ${footer ? `<div class="jr-sheet-foot">${footer}</div>` : ''}
      </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelectorAll('[data-act=close]').forEach(b => b.onclick = close);
    if (onMount) onMount(back, close);
    return { back, close };
  }

  // ---------- Task detail (Jira-style two-column) ----------
  function openTaskDetail(item) {
    const key       = item.dataset.taskKey;
    const status    = findStatus(item.dataset.taskStatus);
    const priority  = findPriority(item.dataset.taskPriority);
    const assignee  = PEOPLE.find(p => p.id === item.dataset.taskAssignee) || ME;
    const reporter  = PEOPLE.find(p => p.id === item.dataset.taskReporter) || ME;
    const title     = item.dataset.taskTitle || '';
    const desc      = item.dataset.taskDesc || '';
    const due       = item.dataset.taskDue || '';

    const header = `
      <div class="jr-sheet-head">
        <div class="jr-bcr">
          <i class="ri-checkbox-line" style="color:#4338ca;"></i>
          <span>Task</span>
          <span class="jr-bcr-sep">/</span>
          <span class="jr-bcr-key">${esc(key)}</span>
        </div>
        <div class="jr-head-actions">
          <button type="button" class="jr-icon-btn" title="Watch"><i class="ri-eye-line"></i></button>
          <button type="button" class="jr-icon-btn" title="Like"><i class="ri-thumb-up-line"></i></button>
          <button type="button" class="jr-icon-btn" title="More"><i class="ri-more-2-line"></i></button>
          <button type="button" class="jr-icon-btn" data-act="close" title="Close"><i class="ri-close-line"></i></button>
        </div>
      </div>`;

    const body = `
      <div class="jr-detail">
        <div class="jr-main">
          <input class="jr-title" data-field="title" value="${esc(title)}" placeholder="Summary"/>
          <div class="jr-actions">
            <button type="button" class="jr-status-btn" data-act="open-status" style="background:${status.bg};color:${status.fg};">
              <span class="jr-dot" style="background:${status.dot};"></span>${esc(status.label)}<i class="ri-arrow-down-s-line"></i>
            </button>
            <button type="button" class="jr-action-btn"><i class="ri-attachment-2"></i> Attach</button>
            <button type="button" class="jr-action-btn"><i class="ri-link"></i> Link</button>
            <button type="button" class="jr-action-btn"><i class="ri-flow-chart"></i> Add child</button>
          </div>

          <div class="jr-section">
            <div class="jr-label">Description</div>
            <textarea class="jr-textarea" data-field="desc" rows="6" placeholder="Add a description…">${esc(desc)}</textarea>
          </div>

          <div class="jr-section">
            <div class="jr-label">Activity</div>
            <div class="jr-tabs">
              <button class="jr-tab active" data-tab="all">All</button>
              <button class="jr-tab" data-tab="comments">Comments</button>
              <button class="jr-tab" data-tab="history">History</button>
              <button class="jr-tab" data-tab="worklog">Work log</button>
            </div>
            <div class="jr-comment-box">
              <span class="jr-avatar sm" style="background:${ME.color};">${ME.initials}</span>
              <input type="text" placeholder="Add a comment…  Pro-tip: press M to comment" />
            </div>
            <div class="jr-history">
              <div class="jr-hist"><span class="jr-avatar sm" style="background:${reporter.color};">${reporter.initials}</span><span><strong>${esc(reporter.name)}</strong> created the task — <span class="jr-when">2 days ago</span></span></div>
              <div class="jr-hist"><span class="jr-avatar sm" style="background:${assignee.color};">${assignee.initials}</span><span><strong>${esc(assignee.name)}</strong> changed status to <strong>${esc(status.label)}</strong> — <span class="jr-when">Yesterday</span></span></div>
            </div>
          </div>
        </div>

        <aside class="jr-side">
          <div class="jr-side-head">Details</div>

          <div class="jr-prop">
            <span class="k">Assignee</span>
            <button type="button" class="jr-prop-btn" data-act="pick-assignee">
              <span class="jr-avatar sm" style="background:${assignee.color};">${assignee.initials}</span>${esc(assignee.name)}
            </button>
          </div>
          <div class="jr-prop">
            <span class="k">Reporter</span>
            <button type="button" class="jr-prop-btn" data-act="pick-reporter">
              <span class="jr-avatar sm" style="background:${reporter.color};">${reporter.initials}</span>${esc(reporter.name)}
            </button>
          </div>
          <div class="jr-prop">
            <span class="k">Priority</span>
            <button type="button" class="jr-prop-btn" data-act="pick-priority">
              <i class="${priority.icon}" style="color:${priority.color};"></i>${esc(priority.label)}
            </button>
          </div>
          <div class="jr-prop">
            <span class="k">Status</span>
            <span class="jr-status-pill" style="background:${status.bg};color:${status.fg};">
              <span class="jr-dot" style="background:${status.dot};"></span>${esc(status.label)}
            </span>
          </div>
          <div class="jr-prop">
            <span class="k">Due date</span>
            <input class="jr-prop-input" type="date" data-field="due" value="${esc(due)}"/>
          </div>
          <div class="jr-prop">
            <span class="k">Labels</span>
            <div class="jr-labels">
              <span class="jr-label-chip">prospect</span>
              <span class="jr-label-chip">brookfield</span>
              <button class="jr-label-add" type="button">+</button>
            </div>
          </div>
          <div class="jr-prop">
            <span class="k">Linked</span>
            <a href="land-detail.html" class="jr-link"><i class="ri-link"></i> #LND-014 Brookfield</a>
          </div>
          <div class="jr-prop-meta">
            <div>Created <strong>2 days ago</strong></div>
            <div>Updated <strong>just now</strong></div>
          </div>
        </aside>
      </div>
    `;

    const footer = `
      <button type="button" class="jr-foot-btn ghost" data-act="close">Cancel</button>
      <button type="button" class="jr-foot-btn primary" data-act="save">Save changes</button>
    `;

    openSheet({ width: 1040, header, body, footer, onMount: (back, close) => {
      // Save
      back.querySelector('[data-act=save]').onclick = () => {
        item.dataset.taskTitle = back.querySelector('[data-field=title]').value.trim() || 'Untitled task';
        item.dataset.taskDesc  = back.querySelector('[data-field=desc]').value.trim();
        item.dataset.taskDue   = back.querySelector('[data-field=due]').value;
        rerenderTaskRow(item);
        window.toast('Task saved', { kind: 'success', icon: 'ri-check-line' });
        close();
      };

      // Status menu
      back.querySelector('[data-act=open-status]').onclick = (e) => {
        e.stopPropagation();
        openMenu(e.currentTarget, TASK_STATUS.map(s => ({
          label: `<span class="jr-dot" style="background:${s.dot};"></span>${s.label}`,
          onClick: () => { item.dataset.taskStatus = s.id; close(); openTaskDetail(item); }
        })));
      };
      // Picker menus
      back.querySelector('[data-act=pick-assignee]').onclick = (e) => {
        e.stopPropagation();
        openMenu(e.currentTarget, PEOPLE.map(p => ({
          label: `<span class="jr-avatar sm" style="background:${p.color};">${p.initials}</span>${p.name}`,
          onClick: () => { item.dataset.taskAssignee = p.id; close(); openTaskDetail(item); }
        })));
      };
      back.querySelector('[data-act=pick-reporter]').onclick = (e) => {
        e.stopPropagation();
        openMenu(e.currentTarget, PEOPLE.map(p => ({
          label: `<span class="jr-avatar sm" style="background:${p.color};">${p.initials}</span>${p.name}`,
          onClick: () => { item.dataset.taskReporter = p.id; close(); openTaskDetail(item); }
        })));
      };
      back.querySelector('[data-act=pick-priority]').onclick = (e) => {
        e.stopPropagation();
        openMenu(e.currentTarget, TASK_PRIORITY.map(p => ({
          label: `<i class="${p.icon}" style="color:${p.color};margin-right:4px;"></i>${p.label}`,
          onClick: () => { item.dataset.taskPriority = p.id; close(); openTaskDetail(item); }
        })));
      };

      // Tab pills
      back.querySelectorAll('.jr-tab').forEach(t => t.onclick = () => {
        back.querySelectorAll('.jr-tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
      });
    }});
  }

  function openMenu(anchor, items) {
    document.querySelectorAll('.jr-menu').forEach(n => n.remove());
    const menu = document.createElement('div');
    menu.className = 'jr-menu';
    menu.innerHTML = items.map((it, i) => `<button type="button" data-i="${i}">${it.label}</button>`).join('');
    document.body.appendChild(menu);
    const r = anchor.getBoundingClientRect();
    menu.style.top = (r.bottom + window.scrollY + 4) + 'px';
    menu.style.left = (r.left + window.scrollX) + 'px';
    menu.querySelectorAll('button').forEach((b, i) => b.onclick = (e) => {
      e.stopPropagation();
      items[i].onClick();
      menu.remove();
    });
    setTimeout(() => {
      const onDoc = (e) => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', onDoc, true); } };
      document.addEventListener('click', onDoc, true);
    }, 0);
  }

  // ---------- Detail dialogs for non-task kinds ----------
  function whoAvatar(p) {
    return `<span class="jr-avatar" style="background:${p.color};">${p.initials}</span>`;
  }

  function openNoteDetail(item) {
    const author = ME;
    const txt = (item.querySelector('.tl-body') || {}).textContent || '';
    const when = (item.querySelector('.tl-head .when') || {}).textContent || '';
    openSheet({ width: 640,
      header: `<div class="jr-sheet-head"><div class="jr-bcr"><i class="ri-sticky-note-line" style="color:#6b7280;"></i><span>Note</span></div><div class="jr-head-actions"><button class="jr-icon-btn" data-act="close"><i class="ri-close-line"></i></button></div></div>`,
      body: `
        <div class="jr-row" style="margin-bottom:14px;">
          ${whoAvatar(author)}
          <div style="flex:1;">
            <div style="font:600 14px var(--font-sans);color:var(--color-grey-900);">${esc(author.name)}</div>
            <div style="font:12px var(--font-sans);color:var(--fg3);">Note · ${esc(when)}</div>
          </div>
          <span class="jr-pill" style="background:#f3f4f6;color:#4b5563;"><i class="ri-eye-off-line"></i>Internal</span>
        </div>
        <div class="jr-prop"><span class="k">Pinned to</span><span style="font:13px var(--font-sans);color:var(--color-grey-800);">Joseph Mensah · Brookfield</span></div>
        <div class="jr-section">
          <div class="jr-label">Note</div>
          <textarea class="jr-textarea" rows="6" data-field="note">${esc(txt.trim())}</textarea>
        </div>
        <div class="jr-section">
          <div class="jr-label">Mentions & links</div>
          <div class="jr-row">
            <span class="jr-pill" style="background:#eef2ff;color:#4338ca;"><i class="ri-at-line"></i>@kevin</span>
            <span class="jr-pill" style="background:#eef2ff;color:#4338ca;"><i class="ri-price-tag-3-line"></i>brookfield</span>
            <span class="jr-pill" style="background:#f3f4f6;color:#4b5563;"><i class="ri-link"></i>1 link</span>
          </div>
        </div>`,
      footer: `<button class="jr-foot-btn ghost" data-act="close">Cancel</button><button class="jr-foot-btn primary" data-act="save">Save</button>`,
      onMount: (back, close) => {
        back.querySelector('[data-act=save]').onclick = () => {
          const v = back.querySelector('[data-field=note]').value.trim();
          if (!v) return window.toast('Note cannot be empty', { kind: 'error', icon: 'ri-error-warning-line' });
          const body = item.querySelector('.tl-body'); if (body) body.textContent = v;
          window.toast('Note saved', { kind: 'success', icon: 'ri-check-line' }); close();
        };
      }});
  }

  function openCallDetail(item) {
    const who = ME;
    const txt = (item.querySelector('.tl-body') || {}).textContent || '';
    const when = (item.querySelector('.tl-head .when') || {}).textContent || '';
    const headSpan = item.querySelector('.tl-head .who span');
    const meta = headSpan ? headSpan.textContent : '';
    const duration = (meta.match(/(\d+)\s*min/) || [])[1] || '12';
    const outcome = /no answer|voicemail/i.test(meta) ? 'No answer' : 'Connected';

    openSheet({ width: 720,
      header: `<div class="jr-sheet-head"><div class="jr-bcr"><i class="ri-phone-line" style="color:#7c3aed;"></i><span>Call</span></div><div class="jr-head-actions"><button class="jr-icon-btn" data-act="close"><i class="ri-close-line"></i></button></div></div>`,
      body: `
        <div class="jr-row" style="margin-bottom:14px;">
          ${whoAvatar(who)}
          <div style="flex:1;">
            <div style="font:600 14px var(--font-sans);color:var(--color-grey-900);">${esc(who.name)} → Joseph Mensah</div>
            <div style="font:12px var(--font-sans);color:var(--fg3);">Call · ${esc(when)}</div>
          </div>
          <span class="jr-pill" style="background:#dcfce7;color:#166534;"><i class="ri-arrow-up-line"></i>Outbound</span>
        </div>
        <div class="jr-grid-2">
          <div class="jr-prop column"><span class="k">Outcome</span>
            <select class="jr-prop-input" data-field="outcome">
              ${['Connected','No answer','Voicemail','Wrong number','Busy','Disconnected'].map(o => `<option ${o===outcome?'selected':''}>${o}</option>`).join('')}
            </select>
          </div>
          <div class="jr-prop column"><span class="k">Duration</span>
            <div class="jr-row" style="gap:6px;"><input class="jr-prop-input" data-field="dur" type="number" min="0" value="${esc(duration)}" style="flex:1;"/><span style="font:13px var(--font-sans);color:var(--fg3);">min</span></div>
          </div>
          <div class="jr-prop column"><span class="k">Direction</span>
            <select class="jr-prop-input" data-field="dir"><option>Outbound</option><option>Inbound</option></select>
          </div>
          <div class="jr-prop column"><span class="k">Phone</span>
            <input class="jr-prop-input" type="tel" value="+233 24 555 0118"/>
          </div>
          <div class="jr-prop column"><span class="k">Started at</span>
            <input class="jr-prop-input" type="datetime-local" value="2026-11-08T14:14"/>
          </div>
          <div class="jr-prop column"><span class="k">Recording</span>
            <div class="jr-row" style="gap:6px;"><button class="jr-action-btn"><i class="ri-play-circle-line"></i> Play 12:08</button><button class="jr-action-btn"><i class="ri-download-line"></i></button></div>
          </div>
        </div>
        <div class="jr-section">
          <div class="jr-label">Summary</div>
          <textarea class="jr-textarea" rows="4" data-field="sum">${esc(txt.trim())}</textarea>
        </div>
        <div class="jr-section">
          <div class="jr-label">Action items</div>
          <ul class="jr-checks">
            <li><label><input type="checkbox" checked/> Send document checklist by email</label></li>
            <li><label><input type="checkbox"/> Confirm spouse income</label></li>
            <li><label><input type="checkbox"/> Reach out Friday for follow-up</label></li>
          </ul>
        </div>
        <div class="jr-section">
          <div class="jr-label">Topics</div>
          <div class="jr-row">
            <span class="jr-pill" style="background:#eef2ff;color:#4338ca;">documents</span>
            <span class="jr-pill" style="background:#eef2ff;color:#4338ca;">payment estimate</span>
            <span class="jr-pill" style="background:#eef2ff;color:#4338ca;">spouse income</span>
          </div>
        </div>`,
      footer: `<button class="jr-foot-btn ghost" data-act="close">Cancel</button><button class="jr-foot-btn primary" data-act="save">Save</button>`,
      onMount: (back, close) => {
        back.querySelector('[data-act=save]').onclick = () => {
          const out = back.querySelector('[data-field=outcome]').value;
          const dur = back.querySelector('[data-field=dur]').value;
          const sum = back.querySelector('[data-field=sum]').value.trim();
          const span = item.querySelector('.tl-head .who span');
          if (span) span.textContent = `logged a call · ${dur} min${out === 'No answer' ? ' · no answer' : ''}`;
          const body = item.querySelector('.tl-body');
          if (body) body.innerHTML = `<strong style="color:var(--color-grey-800);">${esc(out)} · ${esc(dur)} min</strong><br/>${esc(sum)}`;
          window.toast('Call updated', { kind: 'success', icon: 'ri-check-line' }); close();
        };
      }});
  }

  function openEmailDetail(item) {
    const who = ME;
    const subject = item.dataset.subject || (item.querySelector('.tl-head .who span') || {}).textContent.match(/"([^"]+)"/)?.[1] || '(no subject)';
    const txt = (item.querySelector('.tl-body') || {}).textContent || '';
    const status = item.dataset.status || 'sent';
    const isLocked = status === 'sent';

    openSheet({ width: 760,
      header: `<div class="jr-sheet-head"><div class="jr-bcr"><i class="ri-mail-line" style="color:#1d4ed8;"></i><span>Email · ${esc(status)}</span></div><div class="jr-head-actions">${isLocked?'<span class="jr-pill" style="background:#f3f4f6;color:#4b5563;"><i class="ri-lock-line"></i>Read only</span>':''}<button class="jr-icon-btn" data-act="close"><i class="ri-close-line"></i></button></div></div>`,
      body: `
        <div class="jr-email-head">
          <div class="jr-row" style="margin-bottom:8px;">${whoAvatar(who)}<div style="flex:1;"><div style="font:600 14px var(--font-sans);color:var(--color-grey-900);">${esc(who.name)}</div><div style="font:12px var(--font-sans);color:var(--fg3);">&lt;kevin@ream.com&gt;</div></div><div style="font:12px var(--font-sans);color:var(--fg3);text-align:right;">Today, 2:30pm<br/><span class="jr-pill" style="background:#dcfce7;color:#166534;font-size:10px;"><i class="ri-checkbox-circle-fill"></i>Delivered · Opened 3×</span></div></div>
          <div class="jr-grid-2" style="gap:6px 16px;">
            <div class="jr-email-row"><span class="k">To</span><span>Joseph Mensah &lt;joseph.mensah@gmail.com&gt;</span></div>
            <div class="jr-email-row"><span class="k">Cc</span><span>sara@ream.com</span></div>
            <div class="jr-email-row"><span class="k">Subject</span><span><strong>${esc(subject)}</strong></span></div>
            <div class="jr-email-row"><span class="k">Thread</span><span>3 messages</span></div>
          </div>
        </div>
        <div class="jr-section">
          <div class="jr-label">Body</div>
          <div class="jr-email-body">${esc(txt.trim() || '(no content)')}</div>
        </div>
        <div class="jr-section">
          <div class="jr-label">Attachments</div>
          <div class="jr-row" style="flex-wrap:wrap;">
            <div class="jr-attach"><i class="ri-file-pdf-line" style="color:#dc2626;"></i><div><div class="nm">Document_checklist.pdf</div><div class="sz">124 KB · downloaded 1×</div></div><button class="jr-icon-btn"><i class="ri-download-line"></i></button></div>
          </div>
        </div>
        <div class="jr-section">
          <div class="jr-label">Tracking</div>
          <div class="jr-track">
            <div><i class="ri-mail-send-line" style="color:#2563eb;"></i><span>Sent</span><span class="t">2:30pm</span></div>
            <div><i class="ri-mail-open-line" style="color:#16a34a;"></i><span>Opened</span><span class="t">2:34pm</span></div>
            <div><i class="ri-mail-open-line" style="color:#16a34a;"></i><span>Opened</span><span class="t">3:12pm</span></div>
            <div><i class="ri-cursor-line" style="color:#16a34a;"></i><span>Clicked link</span><span class="t">3:13pm</span></div>
          </div>
        </div>`,
      footer: `<button class="jr-foot-btn ghost" data-act="close">Close</button>${isLocked ? '<button class="jr-foot-btn primary" data-act="reply"><i class="ri-reply-line"></i> Reply</button>' : '<button class="jr-foot-btn primary" data-act="close">Save</button>'}`,
      onMount: (back, close) => {
        const reply = back.querySelector('[data-act=reply]');
        if (reply) reply.onclick = () => { window.toast('Composer would open here', { icon: 'ri-reply-line' }); close(); };
      }});
  }

  function openMeetingDetail(item) {
    const who = ME;
    const txt = (item.querySelector('.tl-body') || {}).textContent || '';
    const headSpan = item.querySelector('.tl-head .who span');
    const meta = headSpan ? headSpan.textContent : '';
    const status = item.dataset.status || 'scheduled';

    openSheet({ width: 720,
      header: `<div class="jr-sheet-head"><div class="jr-bcr"><i class="ri-calendar-event-line" style="color:#7c3aed;"></i><span>Meeting · ${esc(status)}</span></div><div class="jr-head-actions"><button class="jr-icon-btn" data-act="close"><i class="ri-close-line"></i></button></div></div>`,
      body: `
        <input class="jr-title" value="Site visit — Brookfield" data-field="title"/>
        <div class="jr-row" style="margin:8px 0 16px;">
          <span class="jr-pill" style="background:#dbeafe;color:#1d4ed8;"><i class="ri-time-line"></i>Wed Nov 12 · 2:00–2:45pm</span>
          <span class="jr-pill" style="background:#eef2ff;color:#4338ca;"><i class="ri-map-pin-line"></i>In person</span>
          <span class="jr-pill" style="background:#dcfce7;color:#166534;"><i class="ri-checkbox-circle-line"></i>Invitations sent</span>
        </div>
        <div class="jr-grid-2">
          <div class="jr-prop column"><span class="k">Date</span><input class="jr-prop-input" type="date" value="2026-11-12"/></div>
          <div class="jr-prop column"><span class="k">Time</span><input class="jr-prop-input" type="time" value="14:00"/></div>
          <div class="jr-prop column"><span class="k">Duration</span><select class="jr-prop-input"><option>30m</option><option selected>45m</option><option>1h</option></select></div>
          <div class="jr-prop column"><span class="k">Timezone</span><input class="jr-prop-input" value="GMT (Africa/Accra)"/></div>
          <div class="jr-prop column"><span class="k">Location</span><input class="jr-prop-input" value="Brookfield Plot #LND-014, Accra"/></div>
          <div class="jr-prop column"><span class="k">Meeting point</span><input class="jr-prop-input" placeholder="e.g. main gate"/></div>
        </div>
        <div class="jr-section">
          <div class="jr-label">Attendees (3)</div>
          <div class="jr-attendees">
            <div class="jr-attendee"><span class="jr-avatar sm" style="background:#7c3aed;">KM</span><div><div class="nm">Kevin Manga</div><div class="rl">Organizer</div></div><span class="jr-pill" style="background:#dcfce7;color:#166534;">Going</span></div>
            <div class="jr-attendee"><span class="jr-avatar sm" style="background:#0891b2;">JM</span><div><div class="nm">Joseph Mensah</div><div class="rl">Prospect</div></div><span class="jr-pill" style="background:#fef3c7;color:#92400e;">Pending</span></div>
            <div class="jr-attendee"><span class="jr-avatar sm" style="background:#db2777;">SN</span><div><div class="nm">Sara Ndong</div><div class="rl">Manager</div></div><span class="jr-pill" style="background:#dcfce7;color:#166534;">Going</span></div>
          </div>
        </div>
        <div class="jr-section">
          <div class="jr-label">Agenda</div>
          <textarea class="jr-textarea" rows="4" data-field="agenda" placeholder="Topics, files to bring…">${esc(txt.trim())}</textarea>
        </div>
        <div class="jr-section">
          <div class="jr-label">Reminders</div>
          <div class="jr-row">
            <span class="jr-pill" style="background:#eef2ff;color:#4338ca;"><i class="ri-mail-line"></i>Email — 1 day before</span>
            <span class="jr-pill" style="background:#eef2ff;color:#4338ca;"><i class="ri-message-3-line"></i>SMS — 2 hr before</span>
          </div>
        </div>`,
      footer: `<button class="jr-foot-btn ghost" data-act="close">Cancel</button><button class="jr-foot-btn primary" data-act="save">Save changes</button>`,
      onMount: (back, close) => {
        back.querySelector('[data-act=save]').onclick = () => {
          window.toast('Meeting saved', { kind: 'success', icon: 'ri-check-line' });
          close();
        };
      }});
  }

  // ---------- Wire row-click → detail dialog (per kind) ----------
  function wireRowClick(item) {
    if (item.dataset.jrWired) return;
    item.dataset.jrWired = '1';
    const kind = item.dataset.kind;
    if (kind === 'system') return;
    // Row clicks no longer open the legacy detail dialog — items expand
    // in place via the .tl-summary chevron added by prospect-timeline-detail.js.
    // (data-act handlers on inline pills still work.)
    item.style.cursor = '';
  }
  document.querySelectorAll('.timeline .tl-item').forEach(wireRowClick);
  // catch new items
  const tl = document.querySelector('.timeline');
  if (tl) {
    new MutationObserver(muts => {
      muts.forEach(m => m.addedNodes.forEach(n => {
        if (n.nodeType === 1 && n.classList.contains('tl-item')) {
          if (n.dataset.kind === 'task') {
            nextKey++;
            n.dataset.taskKey = n.dataset.taskKey || ('PRO-' + nextKey);
            n.dataset.taskStatus = n.dataset.taskStatus || 'todo';
            n.dataset.taskPriority = n.dataset.taskPriority || 'medium';
            n.dataset.taskAssignee = n.dataset.taskAssignee || 'kevin';
            n.dataset.taskReporter = n.dataset.taskReporter || ME.id;
            n.dataset.taskDue = n.dataset.taskDue || '';
            const headSpan = n.querySelector('.tl-head .who span');
            const m = headSpan && headSpan.textContent.match(/"([^"]+)"/);
            n.dataset.taskTitle = n.dataset.taskTitle || (m ? m[1] : 'Untitled task');
            const body = n.querySelector('.tl-body');
            n.dataset.taskDesc  = n.dataset.taskDesc  || (body ? body.textContent.trim() : '');
            rerenderTaskRow(n);
          }
          wireRowClick(n);
        }
      }));
    }).observe(tl, { childList: true });
  }

  // ---------- @-mention autocomplete ----------
  // Works on any <textarea> or <input type=text> inside the page:
  //   - composer textarea, Jira sheets, comment box, search-anywhere boxes
  // Trigger on '@', show filtered popup, Tab/Enter/click to insert.
  const MENTION_TARGETS = PEOPLE.concat([
    { id: 'team-sales',    name: 'sales',    role: 'Team',     initials: '#',  color: '#6366f1', isTeam: true },
    { id: 'team-managers', name: 'managers', role: 'Team',     initials: '#',  color: '#6366f1', isTeam: true },
    { id: 'team-finance',  name: 'finance',  role: 'Team',     initials: '#',  color: '#6366f1', isTeam: true },
  ]);

  let mentionState = null;

  function closeMention() {
    if (mentionState && mentionState.pop) mentionState.pop.remove();
    mentionState = null;
  }

  function getCaretCoords(el) {
    // Use a mirror div to compute caret pixel position.
    const mirror = document.createElement('div');
    const cs = window.getComputedStyle(el);
    ['fontFamily','fontSize','fontWeight','lineHeight','padding','border','width','letterSpacing','wordSpacing','whiteSpace','wordWrap']
      .forEach(p => mirror.style[p] = cs[p]);
    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';
    mirror.style.overflow = 'hidden';
    const value = el.value.substring(0, el.selectionEnd);
    mirror.textContent = value;
    const caret = document.createElement('span');
    caret.textContent = '\u200b';
    mirror.appendChild(caret);
    document.body.appendChild(mirror);
    const r = el.getBoundingClientRect();
    const x = r.left + window.scrollX + caret.offsetLeft - el.scrollLeft;
    const y = r.top + window.scrollY + caret.offsetTop - el.scrollTop + parseInt(cs.fontSize, 10) + 4;
    document.body.removeChild(mirror);
    return { x, y };
  }

  function renderMentionList(query, activeIdx) {
    const q = (query || '').toLowerCase();
    const matches = MENTION_TARGETS.filter(p =>
      p.name.toLowerCase().includes(q) || (p.id && p.id.toLowerCase().includes(q))
    ).slice(0, 8);
    return { matches, html: matches.length === 0 ? '<div class="mn-empty">No matches</div>' :
      matches.map((p, i) => `
        <button type="button" class="mn-item ${i === activeIdx ? 'active' : ''}" data-i="${i}">
          <span class="jr-avatar sm" style="background:${p.color};">${esc(p.initials)}</span>
          <span class="mn-meta">
            <span class="mn-name">${esc(p.isTeam ? '#' + p.name : '@' + p.name)}</span>
            <span class="mn-role">${esc(p.role)}</span>
          </span>
        </button>
      `).join('')
    };
  }

  function openMentionFor(el) {
    closeMention();
    const pop = document.createElement('div');
    pop.className = 'mn-pop';
    document.body.appendChild(pop);
    mentionState = { el, pop, atPos: el.selectionStart - 1, query: '', activeIdx: 0 };
    refreshMention();
  }

  function refreshMention() {
    if (!mentionState) return;
    const { el, pop } = mentionState;
    const caret = el.selectionEnd;
    const seg = el.value.substring(mentionState.atPos + 1, caret);
    if (/\s/.test(seg) || mentionState.atPos < 0 || el.value[mentionState.atPos] !== '@') {
      closeMention(); return;
    }
    mentionState.query = seg;
    const { matches, html } = renderMentionList(seg, mentionState.activeIdx);
    mentionState.matches = matches;
    if (mentionState.activeIdx >= matches.length) mentionState.activeIdx = 0;
    pop.innerHTML = `<div class="mn-head">${matches.length ? 'People & teams' : ''}</div><div class="mn-list">${html}</div><div class="mn-foot">↑↓ navigate · ↵/Tab insert · Esc cancel</div>`;
    const c = getCaretCoords(el);
    pop.style.top = c.y + 'px';
    pop.style.left = c.x + 'px';
    pop.querySelectorAll('.mn-item').forEach(b => {
      b.onmousedown = (e) => { e.preventDefault(); pickMention(parseInt(b.dataset.i, 10)); };
    });
  }

  function pickMention(idx) {
    if (!mentionState || !mentionState.matches[idx]) return;
    const { el, atPos } = mentionState;
    const target = mentionState.matches[idx];
    const insert = (target.isTeam ? '#' : '@') + target.name + ' ';
    const before = el.value.substring(0, atPos);
    const after  = el.value.substring(el.selectionEnd);
    el.value = before + insert + after;
    const newPos = (before + insert).length;
    el.selectionStart = el.selectionEnd = newPos;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    closeMention();
    window.toast(`${target.isTeam ? 'Team' : 'Mention'}: ${target.name} will be notified`, { kind: 'success', icon: 'ri-at-line' });
  }

  function attachMention(el) {
    if (el.dataset.mentionWired) return;
    el.dataset.mentionWired = '1';
    el.addEventListener('input', () => {
      const caret = el.selectionEnd;
      const ch = el.value[caret - 1];
      if (!mentionState && ch === '@') {
        const prev = el.value[caret - 2];
        if (!prev || /\s|[(\[]/.test(prev)) openMentionFor(el);
      } else if (mentionState && mentionState.el === el) {
        refreshMention();
      }
    });
    el.addEventListener('keydown', (e) => {
      if (!mentionState || mentionState.el !== el) return;
      const m = mentionState.matches || [];
      if (e.key === 'ArrowDown') { e.preventDefault(); mentionState.activeIdx = (mentionState.activeIdx + 1) % Math.max(1, m.length); refreshMention(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); mentionState.activeIdx = (mentionState.activeIdx - 1 + m.length) % Math.max(1, m.length); refreshMention(); }
      else if (e.key === 'Enter' || e.key === 'Tab') {
        if (m.length) { e.preventDefault(); pickMention(mentionState.activeIdx); }
      }
      else if (e.key === 'Escape') { e.preventDefault(); closeMention(); }
    });
    el.addEventListener('blur', () => { setTimeout(closeMention, 100); });
  }

  function rewireMentions(root) {
    (root || document).querySelectorAll('textarea, input[type=text], .jr-comment-box input').forEach(attachMention);
  }
  rewireMentions(document);
  // Catch new fields added by sheets
  new MutationObserver(muts => {
    muts.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType !== 1) return;
      rewireMentions(n);
    }));
  }).observe(document.body, { childList: true, subtree: true });

  // Render @mentions and #teams as chips when displayed in saved bodies
  function renderMentionedHTML(s) {
    return esc(s).replace(/(^|\s)([@#])([a-z][\w-]*)/gi,
      (_, lead, sym, name) => `${lead}<span class="mn-chip ${sym==='#'?'team':''}">${sym}${name}</span>`);
  }
  window.renderMentionedHTML = renderMentionedHTML;

  // ---------- Styles ----------
  const style = document.createElement('style');
  style.textContent = `
  /* Jira-style task row */
  .jr-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .jr-spacer { flex:1; }
  .jr-pill {
    display:inline-flex; align-items:center; gap:6px;
    padding:3px 10px; border-radius:4px;
    font:600 11px var(--font-sans); letter-spacing:.02em;
    white-space:nowrap; cursor:pointer;
    border:1px solid transparent;
  }
  .jr-pill i { font-size:13px; }
  .jr-pill.jr-status { text-transform:uppercase; font-size:11px; font-weight:700; }
  .jr-pill.jr-prio { background:transparent; color:var(--color-grey-700); border-color:var(--border-subtle); }
  .jr-pill.jr-due { background:var(--color-grey-50); color:var(--color-grey-700); border-color:var(--border-subtle); }
  .jr-pill.jr-due.overdue { background:#fef2f2; color:#991b1b; border-color:#fecaca; }
  .jr-dot { width:6px; height:6px; border-radius:50%; display:inline-block; }
  .jr-avatar {
    width:24px; height:24px; border-radius:50%; color:white;
    display:inline-flex; align-items:center; justify-content:center;
    font:700 10px var(--font-sans); flex-shrink:0;
  }
  .jr-avatar.sm { width:20px; height:20px; font-size:9px; }
  .jr-reporter { display:inline-flex; align-items:center; }
  .jr-open { background:transparent; border:1px solid var(--border-subtle); border-radius:4px; padding:3px 6px; cursor:pointer; color:var(--fg3); }
  .jr-open:hover { background:var(--color-grey-50); color:var(--color-grey-800); }
  .tl-item[data-kind="task"] { cursor:pointer; }
  .tl-item[data-kind="task"]:hover { background:var(--color-grey-25); }

  /* Picker popover */
  .jr-pop {
    position:absolute; z-index:9000; background:white;
    border:1px solid var(--border-default); border-radius:10px;
    width:240px; box-shadow:0 12px 32px rgba(15,14,22,0.18); overflow:hidden;
  }
  .jr-pop-head { padding:10px 12px; font:600 12px var(--font-sans); color:var(--color-grey-900); border-bottom:1px solid var(--border-subtle); background:var(--color-grey-25); }
  .jr-pop-list { max-height:320px; overflow-y:auto; padding:4px; }
  .jr-pop-list button { width:100%; display:flex; gap:8px; align-items:center; padding:6px 8px; border:none; background:transparent; border-radius:6px; cursor:pointer; text-align:left; }
  .jr-pop-list button:hover { background:var(--color-brand-50); }
  .jr-pop-meta { display:flex; flex-direction:column; min-width:0; }
  .jr-pop-name { font:600 13px var(--font-sans); color:var(--color-grey-900); }
  .jr-pop-role { font:11px var(--font-sans); color:var(--fg3); }

  .jr-menu {
    position:absolute; z-index:9100; background:white;
    border:1px solid var(--border-default); border-radius:8px;
    box-shadow:0 10px 24px rgba(15,14,22,0.16); padding:4px;
    display:flex; flex-direction:column; min-width:200px;
  }
  .jr-menu button { padding:7px 10px; background:transparent; border:none; border-radius:6px; cursor:pointer; text-align:left; font:13px var(--font-sans); color:var(--color-grey-800); display:flex; align-items:center; gap:8px; }
  .jr-menu button:hover { background:var(--color-grey-50); }

  /* Sheet (detail dialog) */
  .jr-sheet-back {
    position:fixed; inset:0; background:rgba(15,14,22,0.55);
    z-index:9500; display:flex; align-items:flex-start; justify-content:center;
    padding:48px 24px; overflow-y:auto;
  }
  .jr-sheet {
    background:white; border-radius:14px; width:100%;
    box-shadow:0 24px 64px rgba(0,0,0,0.25); overflow:hidden;
    display:flex; flex-direction:column; max-height:calc(100vh - 96px);
  }
  .jr-sheet-head {
    display:flex; align-items:center; justify-content:space-between;
    padding:12px 18px; border-bottom:1px solid var(--border-subtle);
    background:var(--color-grey-25);
  }
  .jr-bcr { display:flex; align-items:center; gap:8px; font:500 13px var(--font-sans); color:var(--fg2); }
  .jr-bcr i { font-size:16px; }
  .jr-bcr-sep { color:var(--fg4); }
  .jr-bcr-key { font:600 13px var(--font-sans); color:var(--color-grey-900); }
  .jr-head-actions { display:flex; gap:4px; align-items:center; }
  .jr-icon-btn { width:30px; height:30px; border-radius:6px; border:none; background:transparent; cursor:pointer; color:var(--fg3); display:inline-flex; align-items:center; justify-content:center; }
  .jr-icon-btn:hover { background:var(--color-grey-100); color:var(--color-grey-800); }
  .jr-sheet-body { padding:18px 22px; overflow-y:auto; flex:1; }
  .jr-sheet-foot { padding:12px 22px; border-top:1px solid var(--border-subtle); background:var(--color-grey-25); display:flex; gap:8px; justify-content:flex-end; }
  .jr-foot-btn { padding:8px 16px; border-radius:8px; font:500 13px var(--font-sans); cursor:pointer; border:1px solid transparent; display:inline-flex; align-items:center; gap:6px; }
  .jr-foot-btn.ghost { background:white; color:var(--fg2); border-color:var(--border-default); }
  .jr-foot-btn.ghost:hover { background:var(--color-grey-50); }
  .jr-foot-btn.primary { background:var(--color-brand-600); color:white; }
  .jr-foot-btn.primary:hover { background:var(--color-brand-700); }

  /* Two-column task layout */
  .jr-detail { display:grid; grid-template-columns: 1fr 320px; gap:24px; }
  @media (max-width: 900px) { .jr-detail { grid-template-columns: 1fr; } }
  .jr-main { min-width:0; }
  .jr-side { background:var(--color-grey-25); border:1px solid var(--border-subtle); border-radius:10px; padding:14px; align-self:flex-start; }
  .jr-side-head { font:600 12px var(--font-sans); text-transform:uppercase; letter-spacing:.06em; color:var(--fg3); padding-bottom:8px; border-bottom:1px solid var(--border-subtle); margin-bottom:10px; }
  .jr-prop { display:flex; align-items:center; gap:10px; padding:6px 0; font:13px var(--font-sans); }
  .jr-prop.column { flex-direction:column; align-items:stretch; gap:4px; }
  .jr-prop > .k { width:90px; font-weight:500; color:var(--fg3); flex-shrink:0; }
  .jr-prop.column > .k { width:auto; font:500 12px var(--font-sans); color:var(--fg3); }
  .jr-prop-btn { background:transparent; border:1px solid transparent; border-radius:4px; padding:4px 8px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; font:500 13px var(--font-sans); color:var(--color-grey-900); }
  .jr-prop-btn:hover { background:white; border-color:var(--border-default); }
  .jr-prop-input { padding:7px 10px; border:1px solid var(--border-default); border-radius:6px; font:13px var(--font-sans); color:var(--color-grey-900); background:white; outline:none; width:100%; box-sizing:border-box; }
  .jr-prop-input:focus { border-color:var(--color-brand-400); box-shadow:0 0 0 3px var(--color-brand-100); }
  .jr-prop-meta { padding-top:10px; margin-top:10px; border-top:1px solid var(--border-subtle); display:flex; flex-direction:column; gap:4px; font:11px var(--font-sans); color:var(--fg3); }
  .jr-status-pill { display:inline-flex; align-items:center; gap:6px; padding:3px 10px; border-radius:4px; font:700 11px var(--font-sans); text-transform:uppercase; }
  .jr-link { color:var(--color-brand-700); text-decoration:none; font:500 13px var(--font-sans); display:inline-flex; align-items:center; gap:6px; }
  .jr-link:hover { text-decoration:underline; }
  .jr-labels { display:flex; flex-wrap:wrap; gap:4px; }
  .jr-label-chip { padding:2px 8px; background:#eef2ff; color:#4338ca; border-radius:4px; font:500 11px var(--font-sans); }
  .jr-label-add { padding:2px 8px; background:transparent; border:1px dashed var(--border-default); border-radius:4px; cursor:pointer; color:var(--fg3); }

  .jr-title { width:100%; padding:6px 10px; border:1px solid transparent; border-radius:6px; font:600 22px var(--font-sans); color:var(--color-grey-900); outline:none; background:transparent; }
  .jr-title:hover, .jr-title:focus { border-color:var(--border-default); background:white; }
  .jr-actions { display:flex; gap:8px; flex-wrap:wrap; margin:12px 0 18px; }
  .jr-status-btn { padding:6px 12px; border:1px solid transparent; border-radius:6px; font:700 11px var(--font-sans); cursor:pointer; text-transform:uppercase; display:inline-flex; align-items:center; gap:6px; }
  .jr-action-btn { padding:6px 12px; border:1px solid var(--border-default); border-radius:6px; background:white; cursor:pointer; font:500 13px var(--font-sans); color:var(--color-grey-700); display:inline-flex; align-items:center; gap:6px; }
  .jr-action-btn:hover { background:var(--color-grey-50); }
  .jr-section { margin:14px 0; }
  .jr-label { font:500 12px var(--font-sans); color:var(--fg3); margin-bottom:6px; text-transform:uppercase; letter-spacing:.04em; }
  .jr-textarea { width:100%; padding:10px 12px; border:1px solid var(--border-default); border-radius:8px; font:14px var(--font-sans); color:var(--color-grey-900); outline:none; resize:vertical; box-sizing:border-box; line-height:1.5; }
  .jr-textarea:focus { border-color:var(--color-brand-400); box-shadow:0 0 0 3px var(--color-brand-100); }

  .jr-tabs { display:flex; gap:4px; border-bottom:1px solid var(--border-subtle); margin-bottom:10px; }
  .jr-tab { padding:6px 12px; background:transparent; border:none; border-bottom:2px solid transparent; cursor:pointer; font:500 12px var(--font-sans); color:var(--fg3); }
  .jr-tab.active { color:var(--color-brand-700); border-bottom-color:var(--color-brand-600); }

  .jr-comment-box { display:flex; align-items:center; gap:8px; padding:8px; background:var(--color-grey-25); border:1px solid var(--border-subtle); border-radius:8px; margin-bottom:12px; }
  .jr-comment-box input { flex:1; border:none; background:transparent; outline:none; font:13px var(--font-sans); color:var(--color-grey-900); }
  .jr-history { display:flex; flex-direction:column; gap:8px; }
  .jr-hist { display:flex; align-items:center; gap:8px; padding:6px 8px; font:12px var(--font-sans); color:var(--fg2); }
  .jr-when { color:var(--fg4); }

  .jr-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px 16px; }

  /* Email detail */
  .jr-email-head { padding:14px; background:var(--color-grey-25); border:1px solid var(--border-subtle); border-radius:10px; margin-bottom:14px; }
  .jr-email-row { font:13px var(--font-sans); color:var(--color-grey-800); display:flex; gap:8px; }
  .jr-email-row .k { color:var(--fg3); width:60px; flex-shrink:0; }
  .jr-email-body { padding:14px; background:white; border:1px solid var(--border-subtle); border-radius:8px; font:14px var(--font-sans); color:var(--color-grey-800); line-height:1.6; min-height:120px; white-space:pre-wrap; }
  .jr-attach { display:flex; align-items:center; gap:10px; padding:8px 12px; border:1px solid var(--border-default); border-radius:8px; background:white; }
  .jr-attach .nm { font:500 13px var(--font-sans); color:var(--color-grey-900); }
  .jr-attach .sz { font:11px var(--font-sans); color:var(--fg3); }
  .jr-track { display:flex; flex-direction:column; gap:4px; }
  .jr-track > div { display:grid; grid-template-columns:20px 1fr 60px; gap:8px; align-items:center; padding:6px 10px; background:var(--color-grey-25); border-radius:6px; font:13px var(--font-sans); color:var(--color-grey-800); }
  .jr-track .t { font:11px var(--font-sans); color:var(--fg3); text-align:right; }

  /* Meeting */
  .jr-attendees { display:flex; flex-direction:column; gap:6px; }
  .jr-attendee { display:flex; align-items:center; gap:10px; padding:8px 10px; background:var(--color-grey-25); border:1px solid var(--border-subtle); border-radius:8px; }
  .jr-attendee .nm { font:500 13px var(--font-sans); color:var(--color-grey-900); }
  .jr-attendee .rl { font:11px var(--font-sans); color:var(--fg3); }
  .jr-attendee > div { flex:1; }

  .jr-checks { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:6px; }
  .jr-checks label { display:flex; align-items:center; gap:8px; font:13px var(--font-sans); color:var(--color-grey-800); cursor:pointer; }

  /* @-mention autocomplete */
  .mn-pop {
    position:absolute; z-index:9800; background:white;
    border:1px solid var(--border-default); border-radius:10px;
    width:280px; box-shadow:0 12px 32px rgba(15,14,22,0.18); overflow:hidden;
    font:13px var(--font-sans);
  }
  .mn-head { padding:8px 12px 4px; font:600 11px var(--font-sans); text-transform:uppercase; letter-spacing:.06em; color:var(--fg3); }
  .mn-list { max-height:280px; overflow-y:auto; padding:4px; }
  .mn-item { width:100%; display:flex; gap:10px; align-items:center; padding:6px 8px; border:none; background:transparent; border-radius:6px; cursor:pointer; text-align:left; }
  .mn-item:hover, .mn-item.active { background:var(--color-brand-50); }
  .mn-meta { display:flex; flex-direction:column; min-width:0; flex:1; }
  .mn-name { font:600 13px var(--font-sans); color:var(--color-grey-900); }
  .mn-role { font:11px var(--font-sans); color:var(--fg3); }
  .mn-empty { padding:14px; text-align:center; color:var(--fg3); font:12px var(--font-sans); }
  .mn-foot { padding:6px 12px; border-top:1px solid var(--border-subtle); background:var(--color-grey-25); font:11px var(--font-sans); color:var(--fg4); }
  .mn-chip { display:inline-flex; align-items:center; padding:1px 6px; background:#eef2ff; color:#4338ca; border-radius:4px; font:600 12px var(--font-sans); }
  .mn-chip.team { background:#fef3c7; color:#92400e; }
  `;
  document.head.appendChild(style);
})();
