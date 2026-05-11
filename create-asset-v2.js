/* =================================================================
   Ream · Create-asset v2 — wizard controller
   - Step navigation (Next/Back/skip-to)
   - Sticky progress bar
   - Generic chip / card / stepper / amenity selection
   - Live price preview
   - Toast helper
   ------------------------------------------------------------------- */

(function(){
  const steps = Array.from(document.querySelectorAll('[data-v2-step]'));
  if (!steps.length) return;
  let idx = 0;

  // ----- core nav -----
  function showStep(n) {
    idx = Math.max(0, Math.min(steps.length - 1, n));
    steps.forEach((el, i) => {
      el.style.display = i === idx ? '' : 'none';
    });
    updateProgress();
    updateFooter();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function next() {
    if (idx >= steps.length - 1) {
      publish();
    } else {
      showStep(idx + 1);
    }
  }
  function back() { showStep(idx - 1); }

  function updateProgress() {
    const pct = ((idx + 1) / steps.length) * 100;
    const bar = document.querySelector('.v2-progress-bar');
    if (bar) bar.style.width = pct + '%';
    const lbl = document.querySelector('[data-v2-step-label]');
    if (lbl) lbl.textContent = `Step ${idx + 1} of ${steps.length}`;
  }
  function updateFooter() {
    const back = document.querySelector('.v2-back');
    if (back) back.disabled = idx === 0;
    const nx = document.querySelector('.v2-next');
    if (!nx) return;
    if (idx === steps.length - 1) {
      nx.textContent = 'Publish listing';
      nx.classList.add('publish');
    } else if (idx === 0) {
      nx.textContent = 'Get started';
      nx.classList.remove('publish');
    } else {
      nx.textContent = 'Next';
      nx.classList.remove('publish');
    }
  }

  // ----- chip multi-select -----
  document.querySelectorAll('.v2-chips').forEach(group => {
    group.addEventListener('click', e => {
      const chip = e.target.closest('.v2-chip');
      if (!chip) return;
      chip.classList.toggle('on');
    });
  });

  // ----- amenity grid (single icon cards multi-select) -----
  document.querySelectorAll('.v2-amenity-grid').forEach(group => {
    group.addEventListener('click', e => {
      const a = e.target.closest('.v2-amenity');
      if (!a) return;
      a.classList.toggle('on');
    });
  });

  // ----- exclusive card choice (radio) -----
  document.querySelectorAll('.v2-cards').forEach(group => {
    group.addEventListener('click', e => {
      const card = e.target.closest('.v2-card');
      if (!card) return;
      group.querySelectorAll('.v2-card').forEach(c => c.classList.remove('on'));
      card.classList.add('on');
      // Update preview if this is the property type selector
      if (card.dataset.preview) {
        updatePreview();
      }
    });
  });

  // ----- numeric stepper -----
  document.querySelectorAll('.v2-stepper').forEach(s => {
    const minus = s.querySelector('[data-step="minus"]');
    const plus  = s.querySelector('[data-step="plus"]');
    const val   = s.querySelector('.v2-step-val');
    const min   = parseFloat(s.dataset.min ?? '0');
    const max   = parseFloat(s.dataset.max ?? '20');
    const step  = parseFloat(s.dataset.stepBy ?? '1');
    function update() {
      let n = parseFloat(val.textContent) || 0;
      n = Math.max(min, Math.min(max, n));
      val.textContent = (step % 1 === 0) ? n : n.toFixed(1);
      minus.disabled = n <= min;
      plus.disabled  = n >= max;
      updatePreview();
    }
    minus.addEventListener('click', () => { val.textContent = (parseFloat(val.textContent)||0) - step; update(); });
    plus .addEventListener('click', () => { val.textContent = (parseFloat(val.textContent)||0) + step; update(); });
    update();
  });

  // ----- live preview (title / location / price) -----
  function updatePreview() {
    const ttl   = document.getElementById('v2_title');
    const city  = document.getElementById('v2_city');
    const state = document.getElementById('v2_state');
    const price = document.getElementById('v2_price');
    const acres = document.getElementById('v2_acres');
    const beds  = document.querySelector('[data-stepfor="beds"] .v2-step-val');
    const baths = document.querySelector('[data-stepfor="baths"] .v2-step-val');

    const previewTtl   = document.querySelector('[data-pv="title"]');
    const previewLoc   = document.querySelector('[data-pv="loc"]');
    const previewPrice = document.querySelector('[data-pv="price"]');
    const previewMeta  = document.querySelector('[data-pv="meta"]');

    if (previewTtl && ttl)   previewTtl.textContent = ttl.value || 'Your listing title';
    if (previewLoc && city && state) previewLoc.textContent = [city.value, state.value].filter(Boolean).join(', ') || 'Dallas, TX';
    if (previewPrice && price) {
      const v = parseFloat(price.value);
      previewPrice.innerHTML = v ? `$${v.toLocaleString()} <small>· financed from $${Math.round(v*0.0078).toLocaleString()}/mo</small>` : '$—';
    }
    if (previewMeta) {
      const parts = [];
      if (acres && acres.value) parts.push(`${acres.value} acres`);
      if (beds)  parts.push(`${beds.textContent} bd`);
      if (baths) parts.push(`${baths.textContent} ba`);
      previewMeta.textContent = parts.join(' · ');
    }

    // Review step rendering
    document.querySelectorAll('[data-review-bind]').forEach(el => {
      const key = el.dataset.reviewBind;
      const src = document.getElementById('v2_' + key);
      if (src) el.textContent = src.value || '—';
    });
  }
  document.querySelectorAll('input, textarea, select').forEach(el => el.addEventListener('input', updatePreview));

  // ----- save draft / exit -----
  window.v2SaveDraft = function() { showToast('Draft saved'); };
  window.v2Exit      = function() {
    if (confirm('Leave the editor? Your draft is auto-saved.')) {
      window.location.href = 'portfolio.html';
    }
  };
  function publish() {
    showToast('🎉 Listing published — visible on the marketplace');
    setTimeout(() => { window.location.href = 'portfolio.html'; }, 1400);
  }
  function showToast(msg) {
    let el = document.querySelector('.v2-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'v2-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2200);
  }

  // ----- review-step navigation links -----
  document.querySelectorAll('.v2-review .edit').forEach(b => {
    b.addEventListener('click', () => {
      const target = parseInt(b.dataset.goto, 10);
      if (!Number.isNaN(target)) showStep(target);
    });
  });

  // ----- exposed nav -----
  window.v2Next = next;
  window.v2Back = back;
  window.v2GoTo = showStep;

  // bind footer buttons
  const nx = document.querySelector('.v2-next');
  const bk = document.querySelector('.v2-back');
  if (nx) nx.addEventListener('click', next);
  if (bk) bk.addEventListener('click', back);

  // keyboard
  document.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea, select')) return;
    if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); back(); }
  });

  // init
  showStep(0);
  updatePreview();
})();
