/* ============================================================
   Prospects row action dialog/drawer
   ============================================================
   Hosts the prospect-detail.html composer and other dialogs in
   an iframe so the markup is identical to the detail page.

   Usage from a row menu (see prospects.html):
     openProspectActionDialog('note',     { name, email, id })
     openProspectActionDialog('call',     ...)
     openProspectActionDialog('email',    ...)
     openProspectActionDialog('task',     ...)
     openProspectActionDialog('meeting',  ...)
     openProspectActionDialog('request',  ...)
     openProspectActionDialog('proposal', ...)
     openProspectActionDialog('convert',  ...)
     openProspectActionDialog('stage',    ...)

   Desktop: centered modal (max ~720px wide, 80vh tall).
   Mobile (<= 760px): bottom drawer (90vh tall, slides up).
   ============================================================ */
(function () {
  'use strict';

  // ---- Action → embed config ----
  const ACTIONS = {
    note:     { embed: 'composer', kind: 'note',    title: 'Add note',          icon: 'ri-sticky-note-line' },
    call:     { embed: 'composer', kind: 'call',    title: 'Log a call',        icon: 'ri-phone-line' },
    email:    { embed: 'composer', kind: 'email',   title: 'Send email',        icon: 'ri-mail-send-line' },
    task:     { embed: 'composer', kind: 'task',    title: 'Create task',       icon: 'ri-task-line' },
    meeting:  { embed: 'composer', kind: 'meeting', title: 'Schedule meeting',  icon: 'ri-calendar-event-line' },
    request:  { embed: 'composer', kind: 'request', title: 'Request documents', icon: 'ri-upload-cloud-2-line' },
    proposal: { embed: 'proposal',                  title: 'Send contract proposal', icon: 'ri-share-forward-line' },
    convert:  { embed: 'convert',                   title: 'Convert to customer', icon: 'ri-check-double-line' },
    stage:    { embed: 'stage',                     title: 'Change stage',      icon: 'ri-flag-line' },
  };

  let host, backdrop, panel, headEl, titleEl, iconEl, subEl, frame, currentAction;

  function ensureHost() {
    if (host) return host;

    host = document.createElement('div');
    host.id = 'prospectActionHost';
    host.className = 'pra-host';
    host.innerHTML = `
      <div class="pra-backdrop" data-pra-close></div>
      <div class="pra-panel" role="dialog" aria-modal="true" aria-labelledby="praTitle">
        <div class="pra-grabber" aria-hidden="true"></div>
        <header class="pra-head">
          <span class="pra-icon" id="praIcon"><i class="ri-sticky-note-line"></i></span>
          <div class="pra-titles">
            <h2 class="pra-title" id="praTitle">Add note</h2>
            <p class="pra-sub" id="praSub">For Joseph Mensah</p>
          </div>
          <button type="button" class="pra-close" aria-label="Close" data-pra-close>
            <i class="ri-close-line"></i>
          </button>
        </header>
        <div class="pra-body">
          <div class="pra-loading" id="praLoading">
            <div class="pra-spinner" aria-hidden="true"></div>
            <span>Opening…</span>
          </div>
          <iframe class="pra-frame" id="praFrame" title="Activity composer"></iframe>
        </div>
      </div>
    `;
    document.body.appendChild(host);

    backdrop = host.querySelector('.pra-backdrop');
    panel    = host.querySelector('.pra-panel');
    headEl   = host.querySelector('.pra-head');
    titleEl  = host.querySelector('#praTitle');
    iconEl   = host.querySelector('#praIcon');
    subEl    = host.querySelector('#praSub');
    frame    = host.querySelector('#praFrame');

    host.addEventListener('click', (e) => {
      if (e.target.matches('[data-pra-close]')) close();
    });
    document.addEventListener('keydown', (e) => {
      if (host.classList.contains('open') && e.key === 'Escape') close();
    });
    window.addEventListener('message', onIframeMessage);

    return host;
  }

  function onIframeMessage(e) {
    const m = e.data;
    if (!m || typeof m !== 'object') return;
    if (m.type === 'embed-ready') {
      const loading = host && host.querySelector('#praLoading');
      if (loading) loading.style.display = 'none';
      if (frame) frame.style.opacity = '1';
    } else if (m.type === 'embed-close') {
      close();
    } else if (m.type === 'embed-saved') {
      // Optional: surface a toast in the parent
      if (window.toast && currentAction) {
        const cfg = ACTIONS[currentAction];
        if (cfg) {
          const verb = currentAction === 'convert' ? 'Customer created'
                     : currentAction === 'stage'   ? 'Stage updated'
                     : `${cfg.title.split(' ')[0]} saved`;
          window.toast(verb, 'success');
        }
      }
    }
  }

  function open(action, ctx) {
    const cfg = ACTIONS[action];
    if (!cfg) { console.warn('Unknown prospect action:', action); return; }
    ensureHost();
    currentAction = action;

    // Update header
    titleEl.textContent = cfg.title;
    iconEl.innerHTML = `<i class="${cfg.icon}"></i>`;
    iconEl.dataset.tone = cfg.kind || cfg.embed;
    const who = (ctx && ctx.name) ? `For ${ctx.name}` : '';
    subEl.textContent = who;
    subEl.style.display = who ? '' : 'none';

    // Build src
    const params = new URLSearchParams();
    params.set('embed', cfg.embed);
    if (cfg.kind) params.set('kind', cfg.kind);
    if (ctx && ctx.id) params.set('id', ctx.id);
    if (ctx && ctx.name) params.set('name', ctx.name);
    const src = 'prospect-detail.html?' + params.toString();

    // Show loader, set src
    const loading = host.querySelector('#praLoading');
    if (loading) loading.style.display = '';
    if (frame) {
      frame.style.opacity = '0';
      frame.src = src;
    }

    // Show
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => host.classList.add('open'));
  }

  function close() {
    if (!host) return;
    host.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => {
      if (frame) frame.src = 'about:blank';
      currentAction = null;
    }, 220);
  }

  // ---- Public API ----
  window.openProspectActionDialog = open;
  window.closeProspectActionDialog = close;

  // ---- Inject styles once ----
  if (!document.getElementById('praStyles')) {
    const style = document.createElement('style');
    style.id = 'praStyles';
    style.textContent = `
      .pra-host {
        position: fixed; inset: 0;
        z-index: 4000;
        pointer-events: none;
      }
      .pra-host.open { pointer-events: auto; }
      .pra-backdrop {
        position: absolute; inset: 0;
        background: rgba(15, 18, 22, 0.45);
        opacity: 0; transition: opacity .18s ease;
      }
      .pra-host.open .pra-backdrop { opacity: 1; }
      .pra-panel {
        position: absolute;
        background: white;
        display: flex; flex-direction: column;
        box-shadow: 0 24px 64px -8px rgba(15,18,22,0.32), 0 8px 24px -8px rgba(15,18,22,0.18);
        overflow: hidden;
      }

      /* Desktop: centered modal */
      @media (min-width: 761px) {
        .pra-panel {
          left: 50%; top: 50%;
          width: min(720px, calc(100vw - 48px));
          height: min(80vh, 800px);
          border-radius: 14px;
          transform: translate(-50%, -48%);
          opacity: 0;
          transition: opacity .18s ease, transform .22s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .pra-host.open .pra-panel {
          transform: translate(-50%, -50%);
          opacity: 1;
        }
        .pra-grabber { display: none; }
      }
      /* Mobile: bottom drawer */
      @media (max-width: 760px) {
        .pra-panel {
          left: 0; right: 0; bottom: 0;
          width: 100%;
          height: 92vh;
          max-height: 92vh;
          border-radius: 18px 18px 0 0;
          transform: translateY(8%);
          opacity: 0;
          transition: opacity .18s ease, transform .26s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .pra-host.open .pra-panel {
          transform: translateY(0);
          opacity: 1;
        }
        .pra-grabber {
          display: block;
          width: 38px; height: 4px;
          background: var(--color-grey-300, #d4d4d8);
          border-radius: 999px;
          margin: 7px auto 0;
          flex-shrink: 0;
        }
      }

      .pra-head {
        display: flex; align-items: center; gap: 12px;
        padding: 14px 18px 12px;
        border-bottom: 1px solid var(--color-grey-100, #f1f1f3);
        flex-shrink: 0;
      }
      .pra-icon {
        width: 36px; height: 36px; border-radius: 9px;
        display: inline-flex; align-items: center; justify-content: center;
        background: var(--color-brand-50, #eef2ff);
        color: var(--color-brand-700, #3730a3);
        flex-shrink: 0;
      }
      .pra-icon i { font-size: 17px; }
      .pra-icon[data-tone="proposal"]  { background: #f0fdf4; color: #166534; }
      .pra-icon[data-tone="convert"]   { background: #f0fdf4; color: #166534; }
      .pra-icon[data-tone="stage"]     { background: #fef3c7; color: #92400e; }
      .pra-icon[data-tone="email"]     { background: #eff6ff; color: #1d4ed8; }
      .pra-icon[data-tone="call"]      { background: #ecfeff; color: #155e75; }
      .pra-icon[data-tone="task"]      { background: #fef3c7; color: #92400e; }
      .pra-icon[data-tone="note"]      { background: #f5f3ff; color: #5b21b6; }
      .pra-icon[data-tone="meeting"]   { background: #eef2ff; color: #3730a3; }
      .pra-icon[data-tone="request"]   { background: #fff7ed; color: #9a3412; }

      .pra-titles { flex: 1; min-width: 0; }
      .pra-title  {
        margin: 0; font-size: 15px; font-weight: 600;
        color: var(--color-grey-900, #18181b);
        line-height: 1.3;
      }
      .pra-sub {
        margin: 1px 0 0; font-size: 12.5px;
        color: var(--fg2, #71717a);
        line-height: 1.3;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .pra-close {
        width: 32px; height: 32px;
        display: inline-flex; align-items: center; justify-content: center;
        background: transparent; border: 0;
        border-radius: 8px;
        color: var(--fg2, #71717a);
        cursor: pointer;
        flex-shrink: 0;
      }
      .pra-close:hover { background: var(--color-grey-100, #f4f4f5); color: var(--color-grey-900, #18181b); }

      .pra-body {
        flex: 1; min-height: 0;
        position: relative;
        background: white;
      }
      .pra-frame {
        width: 100%; height: 100%;
        border: 0; display: block;
        opacity: 0;
        transition: opacity .18s ease;
      }
      .pra-loading {
        position: absolute; inset: 0;
        display: flex; align-items: center; justify-content: center;
        gap: 10px;
        color: var(--fg2, #71717a);
        font-size: 13px;
        background: white;
      }
      .pra-spinner {
        width: 16px; height: 16px;
        border-radius: 50%;
        border: 2px solid var(--color-grey-200, #e4e4e7);
        border-top-color: var(--color-brand-600, #4f46e5);
        animation: pra-spin .7s linear infinite;
      }
      @keyframes pra-spin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
  }
})();
