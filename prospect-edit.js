/* =============================================================================
   prospect-edit.js — inline activity edit
   -----------------------------------------------------------------------------
   Single source of truth: the existing composer (#composer). To edit an
   activity we *physically move* the composer into the item being edited,
   prefill its fields from the item's data, switch the save button to
   "Update <kind>", add a Cancel button, and on save write the values back to
   the original item and restore the composer to its docked position.

   Only one item can be edited at a time; the moved-composer model guarantees
   the edit form is visually + functionally identical to the composer (same
   inputs, combos, providers, attachments, etc.) without duplicating wiring.
   ============================================================================= */
(function () {
  'use strict';

  const composer    = document.getElementById('composer');
  const saveBtn     = document.getElementById('composerSave');
  const saveLabel   = document.getElementById('composerSaveLabel');
  const discardBtn  = document.getElementById('composerDiscard');
  const tabsBar     = document.getElementById('composerTabs');
  const ta          = document.getElementById('composerBody');
  if (!composer || !saveBtn || !saveLabel || !discardBtn || !tabsBar) return;

  // Kinds we actually allow editing through this flow.
  const EDITABLE_KINDS = new Set(['note', 'call', 'email', 'task', 'meeting', 'request']);
  const UPDATE_LABEL = {
    note:    'Update note',
    call:    'Update call',
    email:   'Update email',
    task:    'Update task',
    meeting: 'Update meeting',
    request: 'Update request'
  };

  // Sentinel kept where the composer normally lives, so we can put it back.
  const placeholder = document.createComment(' composer-dock ');
  composer.parentNode.insertBefore(placeholder, composer);

  // State for the active edit
  let editing = null; // { item, kind, originalHTML }
  // Cancel button (rendered in edit mode, hidden otherwise)
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.id = 'composerEditCancel';
  cancelBtn.className = 'btn btn-secondary btn-sm';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.hidden = true;
  cancelBtn.style.marginRight = '4px';
  discardBtn.parentNode.insertBefore(cancelBtn, discardBtn);

  /* ---------- Helpers ---------- */

  function setVal(id, v) {
    const el = document.getElementById(id);
    if (!el) return;
    if ('value' in el) el.value = (v ?? '');
  }
  function getVal(id) {
    const el = document.getElementById(id);
    return el ? (el.value ?? '') : '';
  }
  function activateTab(kind) {
    const btn = tabsBar.querySelector(`button[data-kind="${kind}"]`);
    if (btn) btn.click();
  }
  function plainFromHTML(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    // Replace <br> with newlines so multi-line bodies survive the round-trip
    tmp.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    return (tmp.textContent || '').trim();
  }
  function getItemKind(item) {
    return item.getAttribute('data-kind') || '';
  }
  function getItemTitle(item) {
    const t = item.querySelector('.tl-title');
    return t ? (t.textContent || '').trim() : '';
  }
  function getItemBody(item) {
    const b = item.querySelector('.tl-body');
    return b ? plainFromHTML(b.innerHTML) : '';
  }
  function getItemBodyHTML(item) {
    const b = item.querySelector('.tl-body');
    return b ? b.innerHTML : '';
  }

  /* ---------- Prefill: pull the item's known fields into the composer ---------- */

  function prefillFromItem(item, kind) {
    const title = getItemTitle(item);
    const bodyText = getItemBody(item);

    if (ta) ta.value = bodyText;

    if (kind === 'note') {
      // Notes have no extra fields; body is the entire payload.
      // If there's a title, fold it into the body so it isn't lost.
      if (title && !bodyText.startsWith(title)) {
        ta.value = title + (bodyText ? '\n\n' + bodyText : '');
      }
    } else if (kind === 'call') {
      // Title format: "Discovery call · 12 min"  or  "No answer · voicemail left"
      const m = title.match(/^(.*?)\s*·\s*(\d+)\s*min$/i);
      if (m) {
        // Best-effort outcome match against the select options
        const sel = document.getElementById('cf-call-outcome');
        if (sel) {
          const wanted = m[1].toLowerCase();
          const opt = [...sel.options].find(o => o.value.toLowerCase() === wanted || o.textContent.toLowerCase() === wanted);
          if (opt) sel.value = opt.value;
        }
        setVal('cf-call-duration', m[2]);
      } else {
        // No duration — try matching outcome on full title
        const sel = document.getElementById('cf-call-outcome');
        if (sel && title) {
          const opt = [...sel.options].find(o => title.toLowerCase().includes(o.value.toLowerCase()));
          if (opt) sel.value = opt.value;
        }
      }
    } else if (kind === 'email') {
      setVal('cf-email-subject', title);
      // Existing emails don't carry to/cc in our static markup, leave defaults
    } else if (kind === 'task') {
      setVal('cf-task-title', title);
      // Status badge: re-sync the wrap's data-status if the select had a value
      const status = document.getElementById('cf-task-status');
      if (status) status.dispatchEvent(new Event('change'));
    } else if (kind === 'meeting') {
      setVal('cf-meet-title', title);
    } else if (kind === 'request') {
      setVal('cf-req-title', title);
    }
  }

  /* ---------- Write back: take composer values and update the item ---------- */

  function esc(s) {
    return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  }
  function bodyHTML(text) {
    return esc(text || '').replace(/\n/g, '<br/>');
  }

  function writeBackToItem(item, kind) {
    const bodyEl  = item.querySelector('.tl-body');
    const titleEl = item.querySelector('.tl-title');
    const taVal = (ta && ta.value || '').trim();

    if (kind === 'note') {
      // First line of the textarea becomes the title (if present), rest is body.
      const lines = taVal.split(/\n+/);
      const newTitle = lines[0] || '';
      const newBody = lines.slice(1).join('\n').trim();
      if (titleEl) titleEl.textContent = newTitle;
      if (bodyEl) bodyEl.innerHTML = bodyHTML(newBody);
    } else if (kind === 'call') {
      const out = getVal('cf-call-outcome');
      const dur = getVal('cf-call-duration');
      const newTitle = out + (dur ? ` · ${dur} min` : '');
      if (titleEl) titleEl.textContent = newTitle;
      if (bodyEl) bodyEl.innerHTML = bodyHTML(taVal);
    } else if (kind === 'email') {
      const sub = getVal('cf-email-subject');
      if (titleEl) titleEl.textContent = sub || '(no subject)';
      if (bodyEl) bodyEl.innerHTML = bodyHTML(taVal);
    } else if (kind === 'task') {
      const t = getVal('cf-task-title');
      if (titleEl) titleEl.textContent = t || '(untitled task)';
      if (bodyEl) bodyEl.innerHTML = bodyHTML(taVal);
    } else if (kind === 'meeting') {
      const t = getVal('cf-meet-title');
      if (titleEl) titleEl.textContent = t || '(untitled meeting)';
      if (bodyEl) bodyEl.innerHTML = bodyHTML(taVal);
    } else if (kind === 'request') {
      const t = getVal('cf-req-title');
      if (titleEl) titleEl.textContent = t || '(untitled request)';
      if (bodyEl) bodyEl.innerHTML = bodyHTML(taVal);
    }

    // Stamp an "Edited just now" hint on .when (small, non-destructive)
    const when = item.querySelector('.tl-head .when');
    if (when) {
      const original = when.dataset.original || when.textContent;
      when.dataset.original = original;
      when.innerHTML = `${original} <span style="color:var(--color-brand-700); font-weight:500;">· edited just now</span>`;
    }
  }

  /* ---------- Enter / leave edit mode ---------- */

  function enterEdit(item) {
    if (editing) leaveEdit(false);
    const kind = getItemKind(item);
    if (!EDITABLE_KINDS.has(kind)) return;

    editing = {
      item,
      kind,
      originalTitle: item.querySelector('.tl-title')?.textContent || '',
      originalBody:  getItemBodyHTML(item),
      originalWhen:  item.querySelector('.tl-head .when')?.innerHTML || ''
    };
    item.classList.add('is-inline-editing');

    // Move composer into the item
    item.appendChild(composer);
    composer.classList.add('is-active', 'is-edit-mode');

    // Switch tabs to match
    activateTab(kind);
    // Prefill (must happen after switchKind has revealed the right fieldset)
    setTimeout(() => prefillFromItem(item, kind), 0);

    // Save label → "Update X"; reveal Cancel; tweak Discard tooltip
    saveLabel.textContent = UPDATE_LABEL[kind] || 'Update';
    cancelBtn.hidden = false;
    discardBtn.title = 'Reset fields to their saved values';
    discardBtn.textContent = 'Reset';

    // Hide the kind tabs while editing — kind is fixed for this item
    tabsBar.style.display = 'none';

    // Prevent kind switching while editing (defensive)
    composer.dataset.editKind = kind;

    // Focus the textarea after the move settles
    setTimeout(() => { if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } }, 50);
  }

  function leaveEdit(restoreOriginal) {
    if (!editing) return;
    const { item, originalTitle, originalBody, originalWhen } = editing;
    if (restoreOriginal) {
      const t = item.querySelector('.tl-title');
      if (t) t.textContent = originalTitle;
      const b = item.querySelector('.tl-body');
      if (b) b.innerHTML = originalBody;
      const w = item.querySelector('.tl-head .when');
      if (w) w.innerHTML = originalWhen;
    }
    item.classList.remove('is-inline-editing');

    // Move composer back to its dock
    placeholder.parentNode.insertBefore(composer, placeholder);
    composer.classList.remove('is-active', 'is-edit-mode');
    delete composer.dataset.editKind;

    // Restore save label by re-clicking the active tab so KIND_META applies
    tabsBar.style.display = '';
    activateTab('note'); // safe default; existing wiring will reset placeholder + label

    cancelBtn.hidden = true;
    discardBtn.title = 'Discard and return to Note';
    discardBtn.textContent = 'Discard';

    // Clear textarea so we don't carry edited content back to the dock composer
    if (ta) ta.value = '';

    editing = null;
  }

  /* ---------- Intercept the existing Save / Discard handlers in edit mode ---------- */

  // Capture-phase listener: runs before the composer's own click handler.
  saveBtn.addEventListener('click', (e) => {
    if (!editing) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    const { item, kind } = editing;
    writeBackToItem(item, kind);
    if (window.toast) window.toast(`${UPDATE_LABEL[kind]} saved`, { kind: 'success', icon: 'ri-check-line' });
    leaveEdit(false);
  }, true);

  cancelBtn.addEventListener('click', (e) => {
    e.stopImmediatePropagation();
    e.preventDefault();
    leaveEdit(true);
    if (window.toast) window.toast('Edit cancelled', { icon: 'ri-arrow-go-back-line' });
  });

  // In edit mode, "Discard" should mean "reset fields to the item's saved
  // values" — not "blow everything away and switch to Note" (the dock
  // composer's behaviour). Capture-phase intercept replaces it.
  discardBtn.addEventListener('click', (e) => {
    if (!editing) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    const { item, kind } = editing;
    prefillFromItem(item, kind);
    if (window.toast) window.toast('Reset to saved values', { icon: 'ri-refresh-line' });
  }, true);

  // Block tab switching while in edit mode.
  tabsBar.addEventListener('click', (e) => {
    if (!editing) return;
    const btn = e.target.closest('button[data-kind]');
    if (!btn) return;
    if (btn.dataset.kind !== editing.kind) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);

  /* ---------- Add an "Edit" affordance to each editable timeline item ---------- */

  function ensureEditButton(item) {
    if (item.querySelector('.tl-edit-trigger')) return;
    const kind = getItemKind(item);
    if (!EDITABLE_KINDS.has(kind)) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tl-edit-trigger';
    btn.setAttribute('aria-label', `Edit ${kind}`);
    btn.title = `Edit ${kind}`;
    btn.innerHTML = '<i class="ri-edit-line"></i>';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (editing && editing.item === item) {
        leaveEdit(true);
      } else {
        enterEdit(item);
      }
    });
    item.appendChild(btn);
  }

  function scanTimeline() {
    document.querySelectorAll('.timeline .tl-item').forEach(ensureEditButton);
  }

  // Inject a tiny CSS block for the edit trigger + edit-mode composer chrome.
  const style = document.createElement('style');
  style.textContent = `
    .tl-item .tl-edit-trigger {
      position: absolute; top: 10px; right: 10px;
      width: 28px; height: 28px; border-radius: 6px;
      background: transparent; border: 1px solid transparent;
      color: var(--fg3); cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity .12s, background .12s, border-color .12s, color .12s;
      z-index: 2;
    }
    .tl-item:hover .tl-edit-trigger,
    .tl-item:focus-within .tl-edit-trigger { opacity: 1; }
    .tl-item .tl-edit-trigger:hover {
      background: var(--color-grey-50); color: var(--color-grey-800);
      border-color: var(--border-subtle);
    }
    .tl-item.is-inline-editing .tl-edit-trigger { display: none; }
    .tl-item.is-inline-editing { padding-top: 12px; padding-bottom: 12px; }
    .tl-item.is-inline-editing > .pdv2-composer {
      margin-top: 4px; box-shadow: none; border-color: var(--color-brand-200);
    }
    .tl-item.is-inline-editing .tl-head .when { color: var(--color-brand-700); }
  `;
  document.head.appendChild(style);

  scanTimeline();

  // Re-scan when the composer prepends new items.
  const tl = document.querySelector('.timeline');
  if (tl) {
    new MutationObserver(scanTimeline).observe(tl, { childList: true });
  }
})();
