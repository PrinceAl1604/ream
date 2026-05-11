/* prospect-timeline-detail.js
 * Adds to every .tl-item:
 *   - contextual action menu (kind-aware)
 *   - expand-in-place toggle that reveals: comments, attachments, change history,
 *     labels, and (for tasks) priority + assignee editors
 * Also wires the History tab list -> jump to corresponding activity item.
 */
(function () {
  'use strict';

  // ------- 1. Action menu (kind-aware) -------
  // Existing CSS expects: .tl-menu (wrapper), .tl-menu-btn, .tl-pop, .tl-pop-sep, .tl-pop-note
  const MENU_FOR_KIND = {
    call: [
      ['ri-phone-line', 'Call back'],
      ['ri-add-line', 'Add follow-up task'],
      '-',
      ['ri-delete-bin-line', 'Delete log', 'danger'],
    ],
    email: [
      ['ri-reply-line', 'Reply'],
      ['ri-share-forward-line', 'Forward'],
      ['ri-mail-add-line', 'Resend'],
      '-',
      ['ri-delete-bin-line', 'Delete', 'danger'],
    ],
    note: [
      ['ri-pushpin-line', 'Pin to top'],
      ['ri-share-forward-line', 'Share with team'],
      '-',
      ['ri-delete-bin-line', 'Delete', 'danger'],
    ],
    task: [
      ['ri-checkbox-circle-line', 'Mark complete'],
      ['ri-time-line', 'Snooze'],
      '-',
      ['ri-delete-bin-line', 'Delete task', 'danger'],
    ],
    meeting: [
      ['ri-calendar-event-line', 'Open in calendar'],
      ['ri-share-forward-line', 'Forward invite'],
      '-',
      ['ri-delete-bin-line', 'Cancel meeting', 'danger'],
    ],
    system: [
      ['ri-eye-line', 'View source'],
    ],
  };

  function buildMenu(kind) {
    const entries = MENU_FOR_KIND[kind] || MENU_FOR_KIND.system;
    const pop = document.createElement('div');
    pop.className = 'tl-pop';
    pop.hidden = true;
    entries.forEach((entry) => {
      if (entry === '-') {
        const sep = document.createElement('div');
        sep.className = 'tl-pop-sep';
        pop.appendChild(sep);
        return;
      }
      const [icon, label, cls] = entry;
      const b = document.createElement('button');
      b.type = 'button';
      if (cls) b.className = cls;
      b.innerHTML = `<i class="${icon}"></i><span>${label}</span>`;
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.tl-pop:not([hidden])').forEach((p) => (p.hidden = true));
        if (window.toast) window.toast(`${label}`, 'info');
      });
      pop.appendChild(b);
    });
    return pop;
  }

  function attachMenu(item) {
    if (item.querySelector('.tl-menu')) return;
    const head = item.querySelector('.tl-head');
    if (!head) return;
    const wrap = document.createElement('span');
    wrap.className = 'tl-menu';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tl-menu-btn';
    btn.setAttribute('aria-label', 'Item actions');
    btn.innerHTML = '<i class="ri-more-2-fill"></i>';
    wrap.appendChild(btn);
    const kind = item.getAttribute('data-kind') || 'system';
    const pop = buildMenu(kind);
    document.body.appendChild(pop);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !pop.hidden;
      document.querySelectorAll('.tl-pop:not([hidden])').forEach((p) => (p.hidden = true));
      if (isOpen) return;
      const r = btn.getBoundingClientRect();
      pop.style.top = `${r.bottom + 4}px`;
      pop.style.left = `${Math.max(8, r.right - 200)}px`;
      pop.hidden = false;
    });
    // Add to right side of header (after .when)
    const when = head.querySelector('.when');
    if (when) when.parentNode.insertBefore(wrap, when.nextSibling);
    else head.appendChild(wrap);
  }

  // ------- 2. Expand-in-place detail block -------
  function avatarFor(name) {
    const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
    const palette = ['#7c3aed', '#0e7490', '#b45309', '#16a34a', '#0369a1', '#be185d'];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return { initials, color: palette[h % palette.length] };
  }

  function commentBubble(name, when, text) {
    const { initials, color } = avatarFor(name);
    return `<div class="tl-comment">
      <span class="av" style="background:${color}">${initials}</span>
      <div class="bub">
        <div class="hd"><strong>${name}</strong><span class="meta">${when}</span></div>
        <div class="ct">${text}</div>
      </div>
    </div>`;
  }

  // Per-item seed content (keyed by data-kind). Real product would load from server.
  const SEED_COMMENTS = {
    call: [
      ['Sara Ndong', 'Yesterday', 'Nice — let\'s push for the site visit before payslip arrives.'],
    ],
    email: [
      ['Joseph Mensah', '2h ago', 'Thanks Kevin, I\'ll send these tonight.'],
      ['Kevin Manga', '1h ago', 'Appreciated — flagging for Sara to track.'],
    ],
    note: [],
    task: [
      ['Kevin Manga', 'Today, 9am', 'Booked with the site team for Tuesday morning.'],
    ],
    system: [],
  };
  const SEED_HISTORY = {
    call: [
      ['Today, 2:14pm', 'Kevin Manga logged this call'],
      ['Today, 2:18pm', 'Outcome set to <strong>positive</strong>'],
      ['Today, 2:20pm', 'Tagged <strong>Brookfield</strong>'],
    ],
    email: [
      ['Today, 2:30pm', 'Kevin Manga sent email'],
      ['Today, 2:32pm', 'Attached <strong>Document_checklist.pdf</strong>'],
      ['Today, 2:34pm', 'Marked <strong>Outbound</strong>'],
    ],
    note: [
      ['Yesterday, 4:45pm', 'Kevin Manga added note'],
      ['Yesterday, 4:46pm', 'Tagged <strong>Verified</strong>'],
    ],
    task: [
      ['Yesterday, 11:20am', 'Sara Ndong created task'],
      ['Yesterday, 11:21am', 'Priority set to <strong>Medium</strong>'],
      ['Yesterday, 11:21am', 'Assigned to <strong>Kevin Manga</strong>'],
      ['Yesterday, 11:22am', 'Due date set to <strong>Nov 12</strong>'],
    ],
    system: [
      ['Nov 2, 9:47am', 'Created automatically'],
    ],
  };

  function buildDetailFor(item) {
    const kind = item.getAttribute('data-kind') || 'system';
    const comments = SEED_COMMENTS[kind] || [];

    // Task fields (priority/assignee/status/due) are now rendered by the
    // Jira-style pills in .tl-body itself, so we don't duplicate them here.
    const commentsHtml = comments.map(([n, w, t]) => commentBubble(n, w, t)).join('');

    const html = `
      <div class="tl-detail-grid">
        <div>
          <h4>Comments</h4>
          <div class="tl-comments">
            ${commentsHtml || '<div style="font-size:12px; color:var(--fg3);">No comments yet.</div>'}
          </div>
          <div class="tl-comment-input">
            <input type="text" placeholder="Add a comment…" />
            <button type="button">Post</button>
          </div>
        </div>
      </div>
    `;
    const wrap = document.createElement('div');
    wrap.className = 'tl-detail';
    wrap.innerHTML = html;
    return wrap;
  }

  function attachExpand(item) {
    if (item.querySelector('.tl-summary')) return;
    const titleEl = item.querySelector('.tl-title');
    const head = item.querySelector('.tl-head');
    const whenText = head && head.querySelector('.when') ? head.querySelector('.when').textContent : '';
    const titleText = titleEl ? titleEl.textContent : (head && head.querySelector('.who') ? head.querySelector('.who').textContent : 'Activity');

    const summary = document.createElement('button');
    summary.type = 'button';
    summary.className = 'tl-summary';
    summary.setAttribute('aria-expanded', 'false');
    summary.innerHTML = `
      <span class="t-title">${titleText.replace(/</g,'&lt;')}</span>
      <span class="t-when">${whenText.replace(/</g,'&lt;')}</span>
      <i class="ri-arrow-down-s-line chev" aria-hidden="true"></i>
    `;
    item.insertBefore(summary, item.firstChild.nextSibling);

    let detail = null;
    summary.addEventListener('click', (e) => {
      e.stopPropagation();
      const expanded = item.classList.toggle('is-expanded');
      summary.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      if (expanded && !detail) {
        detail = buildDetailFor(item);
        item.appendChild(detail);
        const post = detail.querySelector('.tl-comment-input button');
        const inp = detail.querySelector('.tl-comment-input input');
        const list = detail.querySelector('.tl-comments');
        if (post && inp && list) {
          const submit = () => {
            const v = inp.value.trim();
            if (!v) return;
            const empty = list.querySelector('div[style]');
            if (empty) empty.remove();
            list.insertAdjacentHTML('beforeend', commentBubble('Kevin Manga', 'just now', v));
            inp.value = '';
          };
          post.addEventListener('click', submit);
          inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') submit(); });
        }
      }
    });
  }

  // ------- 3. History tab -> jump to activity -------
  function wireHistoryNav() {
    const list = document.querySelector('.hist-list');
    if (!list) return;
    list.addEventListener('click', (e) => {
      const li = e.target.closest('.hist-item');
      if (!li) return;
      const target = li.getAttribute('data-target');
      if (!target) return;
      // Switch to Activity tab
      const actTab = document.querySelector('.pd-vrail-tab[data-tab="activity"]');
      const histTab = document.querySelector('.pd-vrail-tab[data-tab="history"]');
      const actPanel = document.querySelector('.pd-tabpanel[data-tab="activity"]');
      const histPanel = document.querySelector('.pd-tabpanel[data-tab="history"]');
      if (actTab && actPanel) {
        document.querySelectorAll('.pd-vrail-tab').forEach((t) => { t.classList.remove('on'); t.setAttribute('aria-selected', 'false'); });
        document.querySelectorAll('.pd-tabpanel').forEach((p) => p.classList.remove('on'));
        actTab.classList.add('on');
        actTab.setAttribute('aria-selected', 'true');
        actPanel.classList.add('on');
      }
      // Highlight a matching activity item
      const match = mapTargetToItem(target);
      if (match) {
        match.classList.add('is-flashed');
        match.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => match.classList.remove('is-flashed'), 1600);
      }
    });
  }

  function mapTargetToItem(target) {
    const items = document.querySelectorAll('.timeline .tl-item');
    // crude mapping by kind + heuristic on title text
    const map = {
      'call-2:14': (el) => el.dataset.kind === 'call' && /Discovery/i.test(el.textContent),
      'email-2:30': (el) => el.dataset.kind === 'email' && /Documents we/i.test(el.textContent),
      'note-yest': (el) => el.dataset.kind === 'note',
      'task-yest': (el) => el.dataset.kind === 'task',
      'email-2d': (el) => el.dataset.kind === 'email' && /Welcome/i.test(el.textContent),
    };
    const test = map[target];
    if (!test) return null;
    for (const el of items) if (test(el)) return el;
    return null;
  }

  // Add a brief flash style
  const flashStyle = document.createElement('style');
  flashStyle.textContent = `.tl-item.is-flashed { box-shadow: 0 0 0 2px var(--color-brand-400); transition: box-shadow .2s; }`;
  document.head.appendChild(flashStyle);

  // ------- bootstrap -------
  function init() {
    document.querySelectorAll('.timeline .tl-item').forEach((it) => {
      attachMenu(it);
      attachExpand(it);
    });
    // Close popover on outside click / esc
    document.addEventListener('click', () => {
      document.querySelectorAll('.tl-pop:not([hidden])').forEach((p) => (p.hidden = true));
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') document.querySelectorAll('.tl-pop:not([hidden])').forEach((p) => (p.hidden = true));
    });
    wireHistoryNav();
    // Re-run for newly added items (composer)
    const tl = document.querySelector('.timeline');
    if (tl) {
      new MutationObserver(() => {
        tl.querySelectorAll('.tl-item').forEach((it) => { attachMenu(it); attachExpand(it); });
      }).observe(tl, { childList: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
