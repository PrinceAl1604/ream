/* ============================================================
   create-asset.js — wizard controller for create-land.html
                     and create-house.html
   ------------------------------------------------------------
   Handles: step navigation, sidebar sync, radio cards, multi-
   select chips, photo grid, financing recalc, live preview,
   readiness checklist, and draft persistence (toast only).
   ============================================================ */

(function () {
  'use strict';

  // ---------- step navigation ----------
  const steps = Array.from(document.querySelectorAll('.cr-step'));
  const sections = Array.from(document.querySelectorAll('.cr-section'));
  let cur = 0;

  function showStep(i) {
    cur = Math.max(0, Math.min(steps.length - 1, i));
    steps.forEach((s, ix) => {
      s.classList.toggle('active', ix === cur);
      s.classList.toggle('done', ix < cur);
    });
    // sections: only show the current one
    sections.forEach((s, ix) => {
      s.classList.toggle('focus', ix === cur);
      s.style.display = ix === cur ? '' : 'none';
    });
    const stepNum = document.getElementById('stepNum');
    const stepName = document.getElementById('stepName');
    if (stepNum) stepNum.textContent = String(cur + 1);
    if (stepName) {
      const name = steps[cur].querySelector('.name');
      stepName.textContent = name ? name.textContent : '';
    }
    // toggle next/publish buttons
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const btnPub = document.getElementById('btnPublish');
    if (btnPrev) btnPrev.style.visibility = cur === 0 ? 'hidden' : 'visible';
    if (cur === steps.length - 1) {
      if (btnNext) btnNext.style.display = 'none';
      if (btnPub) btnPub.style.display = '';
    } else {
      if (btnNext) btnNext.style.display = '';
      if (btnPub) btnPub.style.display = 'none';
    }
    // scroll main back to top so the newly-shown step starts from the top
    const main = document.querySelector('.cr-main');
    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
  }

  window.nextStep = () => showStep(cur + 1);
  window.prevStep = () => showStep(cur - 1);

  // step click
  steps.forEach((s, ix) => {
    s.addEventListener('click', () => showStep(ix));
  });

  // ---------- radio cards ----------
  document.querySelectorAll('[data-radio]').forEach(card => {
    card.addEventListener('click', () => {
      const group = card.dataset.radio;
      document.querySelectorAll('[data-radio="' + group + '"]').forEach(c => c.classList.remove('on'));
      card.classList.add('on');
      const val = card.dataset.val;
      // update preview eyebrow on house ptype
      if (group === 'ptype') {
        const eyebrow = document.getElementById('pvEyebrow');
        if (eyebrow) {
          const labelMap = { single: 'HOUSE · SINGLE-FAMILY', town: 'HOUSE · TOWNHOUSE', condo: 'HOUSE · CONDO' };
          eyebrow.textContent = labelMap[val] || 'HOUSE';
        }
      }
      if (group === 'kind') {
        const eyebrow = document.getElementById('pvEyebrow');
        if (eyebrow) {
          const labelMap = { standalone: 'LAND · STAND-ALONE', site: 'LAND · IN A SITE', commercial: 'LAND · COMMERCIAL' };
          eyebrow.textContent = labelMap[val] || 'LAND';
        }
      }
      updatePreview();
    });
  });

  // ---------- multi-select chips ----------
  document.querySelectorAll('[data-multi] .cr-chip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('on'));
  });

  // ---------- photo handling ----------
  const photoDrop = document.getElementById('photoDrop');
  if (photoDrop) {
    ['dragenter', 'dragover'].forEach(ev =>
      photoDrop.addEventListener(ev, e => { e.preventDefault(); photoDrop.classList.add('drag'); })
    );
    ['dragleave', 'drop'].forEach(ev =>
      photoDrop.addEventListener(ev, e => { e.preventDefault(); photoDrop.classList.remove('drag'); })
    );
    photoDrop.addEventListener('drop', e => {
      const files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length) addPhotos(files);
    });
  }

  window.addPhotos = function (fileList) {
    const grid = document.getElementById('photoGrid');
    if (!grid) return;
    Array.from(fileList).forEach(f => {
      if (!f.type.startsWith('image/')) return;
      const url = URL.createObjectURL(f);
      const tile = document.createElement('div');
      tile.className = 'cr-photo';
      tile.style.backgroundImage = 'url("' + url + '")';
      tile.innerHTML = '<button class="x" type="button"><i class="ri-close-line"></i></button>';
      tile.querySelector('.x').addEventListener('click', () => removePhoto(tile.querySelector('.x')));
      grid.appendChild(tile);
    });
    updateChecklist();
  };

  window.removePhoto = function (btn) {
    const tile = btn.closest('.cr-photo');
    if (!tile) return;
    if (tile.classList.contains('cover')) {
      // promote next
      const next = tile.nextElementSibling;
      if (next && next.classList.contains('cr-photo')) next.classList.add('cover');
    }
    tile.remove();
    updateChecklist();
  };

  // ---------- ledger rows (highlights / utilities) ----------
  window.addHighlight = function () {
    const grid = document.getElementById('hilGrid');
    if (!grid) return;
    const row = document.createElement('div');
    row.className = 'cr-ledger-row';
    row.innerHTML =
      '<input type="text" placeholder="Highlight name" />' +
      '<input type="text" placeholder="Detail" />' +
      '<input type="text" placeholder="ri-icon-name" />' +
      '<button class="x" type="button"><i class="ri-delete-bin-line"></i></button>';
    row.querySelector('.x').addEventListener('click', () => row.remove());
    grid.appendChild(row);
  };

  window.addUtility = function () {
    const grid = document.getElementById('utilGrid');
    if (!grid) return;
    const row = document.createElement('div');
    row.className = 'cr-ledger-row';
    row.innerHTML =
      '<input type="text" placeholder="Utility" />' +
      '<select><option>Connected on lot</option><option>Available at street</option><option>Not available</option><option>Septic / Well</option></select>' +
      '<input type="text" placeholder="Provider" />' +
      '<button class="x" type="button"><i class="ri-delete-bin-line"></i></button>';
    row.querySelector('.x').addEventListener('click', () => row.remove());
    grid.appendChild(row);
  };

  // ---------- financing recalc ----------
  function num(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    const v = parseFloat(el.value);
    return isNaN(v) ? 0 : v;
  }
  function fmt(n) {
    return Math.round(n).toLocaleString('en-US');
  }

  window.recalcFin = function () {
    const price = num('f_price');
    const depPct = num('f_dep');
    const apr = num('f_apr');
    const term = num('f_term');
    const principal = price * (1 - depPct / 100);
    const r = (apr / 100) / 12;
    let monthly = 0;
    if (r > 0 && term > 0 && principal > 0) {
      monthly = principal * (r * Math.pow(1 + r, term)) / (Math.pow(1 + r, term) - 1);
    } else if (term > 0 && principal > 0) {
      monthly = principal / term;
    }
    const moEl = document.getElementById('f_mo');
    if (moEl) moEl.value = fmt(monthly);
    const depAmt = document.getElementById('f_dep_amt');
    if (depAmt) depAmt.textContent = '≈ $' + fmt(price * depPct / 100) + ' down';

    // update preview
    const pvPrice = document.getElementById('pvPrice');
    if (pvPrice) pvPrice.textContent = '$' + fmt(price);
    const pvMo = document.getElementById('pvMo');
    if (pvMo && monthly > 0) {
      pvMo.textContent = '≈ $' + fmt(monthly) + ' / mo with ' + depPct + '% down';
    }
    updateChecklist();
  };

  // ---------- price-per-sqft (house) ----------
  window.recalcPpsf = function () {
    const price = num('f_price');
    const sqft = num('f_sqft');
    const ppsf = sqft > 0 ? price / sqft : 0;
    const el = document.getElementById('f_ppsf');
    if (el) el.value = ppsf > 0 ? fmt(ppsf) : '';
  };

  // ---------- price-per-acre (land) ----------
  window.recalcPpa = function () {
    const price = num('f_price');
    const acres = num('f_acres');
    const ppa = acres > 0 ? price / acres : 0;
    const el = document.getElementById('f_ppa');
    if (el) el.value = ppa > 0 ? fmt(ppa) : '';
  };

  // ---------- live preview ----------
  window.updatePreview = function () {
    const titleEl = document.getElementById('f_title');
    const pvTitle = document.getElementById('pvTitle');
    if (pvTitle) {
      const t = titleEl && titleEl.value.trim();
      pvTitle.textContent = t || 'Untitled listing';
    }
    const city = document.getElementById('f_city');
    const state = document.getElementById('f_state');
    const pvLoc = document.getElementById('pvLoc');
    if (pvLoc) {
      const c = (city && city.value) || 'Dallas';
      const s = (state && state.value) || 'TX';
      pvLoc.textContent = c + ', ' + s;
    }
    // house-specific stats
    const beds = document.getElementById('f_beds');
    const baths = document.getElementById('f_baths');
    const sqft = document.getElementById('f_sqft');
    const pvBeds = document.getElementById('pvBeds');
    const pvBaths = document.getElementById('pvBaths');
    const pvSqft = document.getElementById('pvSqft');
    if (pvBeds && beds) pvBeds.textContent = beds.value || '—';
    if (pvBaths && baths) pvBaths.textContent = baths.value || '—';
    if (pvSqft && sqft && sqft.value) pvSqft.textContent = parseInt(sqft.value, 10).toLocaleString();
    // land-specific stats
    const acres = document.getElementById('f_acres');
    const pvAcres = document.getElementById('pvAcres');
    if (pvAcres && acres) pvAcres.textContent = acres.value || '—';

    updateChecklist();
  };

  // ---------- readiness checklist ----------
  function updateChecklist() {
    const list = document.getElementById('checklist');
    if (!list) return;
    const items = list.querySelectorAll('li');
    let done = 0;
    items.forEach(li => {
      // simple heuristic: leave already-marked done as is, then bump some flags from form state
      if (li.classList.contains('done')) done++;
    });
    const totalNeeded = items.length;
    // count form completeness signals
    const flags = [
      !!getVal('f_title'),
      !!getVal('f_addr'),
      !!getVal('f_city'),
      !!(getVal('f_beds') || getVal('f_acres')),
      !!getVal('f_price'),
      photoCount() >= 4,
      !!getVal('f_desc'),
      isChecked('f_attest')
    ];
    const trueCount = flags.filter(Boolean).length;
    const pctVal = Math.round((trueCount / flags.length) * 100);
    const pct = document.getElementById('clPct');
    const bar = document.getElementById('clBar');
    if (pct) pct.textContent = pctVal + '%';
    if (bar) bar.style.width = pctVal + '%';
  }
  function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }
  function isChecked(id) {
    const el = document.getElementById(id);
    return el && el.checked;
  }
  function photoCount() {
    const grid = document.getElementById('photoGrid');
    if (!grid) return 0;
    return grid.querySelectorAll('.cr-photo').length;
  }
  // update on form changes broadly
  document.addEventListener('input', updateChecklist);
  document.addEventListener('change', updateChecklist);

  // ---------- draft / publish / cancel ----------
  window.saveDraft = function () {
    toast('Draft saved', 'check-line', 'ok');
    const sb = document.querySelector('.draft-status');
    if (sb) sb.innerHTML = '<i class="ri-cloud-line"></i> Draft saved · just now';
  };

  window.cancelDraft = function () {
    if (confirm('Discard this draft? Unsaved changes will be lost.')) {
      window.location.href = 'portfolio.html';
    }
  };

  window.publishListing = function () {
    const attest = document.getElementById('f_attest');
    if (attest && !attest.checked) {
      toast('Sign the attestation to publish', 'error-warning-line', 'err');
      // jump to review
      showStep(steps.length - 1);
      return;
    }
    const title = getVal('f_title');
    if (!title) {
      toast('Add a listing title before publishing', 'error-warning-line', 'err');
      showStep(0);
      return;
    }
    toast('Listing published 🎉', 'rocket-2-line', 'ok');
    setTimeout(() => { window.location.href = 'portfolio.html'; }, 1400);
  };

  // ---------- toast ----------
  function toast(msg, icon, kind) {
    let host = document.getElementById('crToastHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'crToastHost';
      host.style.cssText = 'position:fixed; right:24px; bottom:24px; display:flex; flex-direction:column; gap:10px; z-index:9999; pointer-events:none;';
      document.body.appendChild(host);
    }
    const el = document.createElement('div');
    const colors = kind === 'err'
      ? 'background:var(--color-error-50); border:1px solid var(--color-error-300); color:var(--color-error-700);'
      : 'background:var(--color-success-50); border:1px solid var(--color-success-300); color:var(--color-success-700);';
    el.style.cssText = colors + 'padding:10px 14px; border-radius:8px; font-size:13px; font-weight:500; display:flex; gap:8px; align-items:center; box-shadow: var(--shadow-card); animation: crToastIn .25s ease both;';
    el.innerHTML = '<i class="ri-' + (icon || 'check-line') + '"></i>' + msg;
    host.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .3s, transform .3s';
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
      setTimeout(() => el.remove(), 320);
    }, 2200);
  }
  // toast keyframes
  const sty = document.createElement('style');
  sty.textContent = '@keyframes crToastIn { from{opacity:0; transform:translateY(8px);} to{opacity:1; transform:translateY(0);} }';
  document.head.appendChild(sty);

  // ---------- init ----------
  showStep(0);
  recalcFin();
  recalcPpsf();
  recalcPpa();
  updatePreview();
  updateChecklist();

})();
