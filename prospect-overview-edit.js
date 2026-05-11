// Inline editing for the Overview tab right-rail cards:
//   - Profile (name, sub, email, phone, whatsapp, structured location, best time, language)
//   - Asset of interest (inline picker)
//   - Financing preference (inline form)
//   - Assigned agent (inline picker)
// All edits happen IN PLACE — no modal/dialogs.
// Click-to-copy on email / phone / whatsapp rows when not editing.
(function () {
  'use strict';

  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toast = (msg, opts) => { try { window.toast && window.toast(msg, opts); } catch(_){} };

  // ---------- copy-to-clipboard for email / phone / whatsapp ----------
  function initCopyRows() {
    document.addEventListener('click', (e) => {
      const row = e.target.closest('.profile-fields .row.copyable');
      if (!row) return;
      // Don't copy while editing or clicking an input
      if (row.classList.contains('editing') || e.target.closest('input,select,textarea,button')) return;
      e.preventDefault();
      const v = row.dataset.copy || (row.querySelector('.v') ? row.querySelector('.v').textContent.trim() : '');
      if (!v) return;
      const finish = (ok) => {
        if (!ok) return;
        // Inline flash
        let flash = row.querySelector('.copy-flash');
        if (!flash) {
          flash = document.createElement('span');
          flash.className = 'copy-flash';
          flash.textContent = 'Copied';
          row.appendChild(flash);
        }
        row.classList.add('flashing');
        clearTimeout(row._flashT);
        row._flashT = setTimeout(() => row.classList.remove('flashing'), 1100);
        const label = row.dataset.pfRow === 'whatsapp' ? 'WhatsApp number' : (row.dataset.pfRow.charAt(0).toUpperCase() + row.dataset.pfRow.slice(1));
        toast(label + ' copied', { kind: 'success', icon: 'ri-clipboard-line' });
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(v).then(() => finish(true), () => finish(fallback(v)));
      } else {
        finish(fallback(v));
      }
    });
  }
  function fallback(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.focus(); ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch(_) { return false; }
  }

  // ---------- Profile edit (in-place, all fields at once) ----------
  const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'French' },
  ];

  function initProfile() {
    const card = $('#profileCard');
    if (!card) return;
    const btn = $('#profileEditBtn', card);
    const fields = $('#profileFields', card);
    const nameEl = $('h2[data-pf="name"]', card);
    const subEl  = $('.sub[data-pf="sub"]', card);
    const avaEl  = $('.ava-lg', card);

    let editing = false, snapshot = null, saveBar = null;

    const initials = (str) => (str || '').trim().split(/\s+/).slice(0,2).map(s => s[0] || '').join('').toUpperCase() || 'JM';

    const enter = () => {
      if (editing) return;
      editing = true;
      btn.classList.add('active');
      card.classList.add('is-editing');

      // Snapshot rows
      snapshot = {
        name: nameEl.textContent,
        sub: subEl.textContent,
        rows: $$('.row', fields).map(r => ({
          row: r,
          html: r.querySelector('.v').innerHTML,
          ds: { ...r.dataset }
        }))
      };

      // Header
      const nameInp = document.createElement('input');
      nameInp.className = 'ov-edit-input h2';
      nameInp.value = snapshot.name.trim();
      nameInp.dataset.role = 'name';
      nameEl.classList.add('editing');
      nameEl.textContent = '';
      nameEl.appendChild(nameInp);

      const subInp = document.createElement('input');
      subInp.className = 'ov-edit-input sub';
      subInp.value = snapshot.sub.trim();
      subInp.dataset.role = 'sub';
      subEl.classList.add('editing');
      subEl.textContent = '';
      subEl.appendChild(subInp);

      // Rows — special handling per type
      $$('.row', fields).forEach(row => {
        const v = row.querySelector('.v');
        const kind = row.dataset.pfRow;
        row.classList.add('editing');
        row.classList.remove('flashing');

        if (kind === 'location') {
          v.innerHTML = `
            <div class="ov-inline-editor" style="gap:8px;">
              <div class="ov-inline-grid-2">
                <div>
                  <label class="ov-mandatory">City</label>
                  <input data-loc="city" type="text" value="${esc(row.dataset.locCity || '')}" placeholder="City" />
                </div>
                <div>
                  <label class="ov-mandatory">Country</label>
                  <input data-loc="country" type="text" value="${esc(row.dataset.locCountry || '')}" placeholder="Country" />
                </div>
                <div>
                  <label>State / Region</label>
                  <input data-loc="state" type="text" value="${esc(row.dataset.locState || '')}" placeholder="State or region" />
                </div>
                <div>
                  <label>Zip / Postal code</label>
                  <input data-loc="zip" type="text" value="${esc(row.dataset.locZip || '')}" placeholder="Zip code" />
                </div>
                <div class="ov-loc-note">
                  <label>Street</label>
                  <input data-loc="street" type="text" value="${esc(row.dataset.locStreet || '')}" placeholder="Street address" />
                </div>
                <div class="ov-loc-note">
                  <label>Note</label>
                  <textarea data-loc="note" rows="2" placeholder="Optional note (apt, landmark, directions)…">${esc(row.dataset.locNote || '')}</textarea>
                </div>
              </div>
            </div>
          `;
        } else if (kind === 'language') {
          const cur = row.dataset.langCode || 'en';
          v.innerHTML = `
            <div class="ov-inline-editor">
              <select data-role="language">
                ${LANGUAGES.map(l => `<option value="${l.code}" ${l.code===cur?'selected':''}>${esc(l.label)}</option>`).join('')}
              </select>
            </div>
          `;
        } else {
          const inp = document.createElement('input');
          inp.className = 'ov-edit-input';
          inp.type = (kind === 'email') ? 'email' : (kind === 'phone' || kind === 'whatsapp') ? 'tel' : 'text';
          inp.value = (kind === 'email' || kind === 'phone' || kind === 'whatsapp')
            ? (row.dataset.copy || v.textContent.trim())
            : v.textContent.trim();
          inp.dataset.role = kind;
          v.innerHTML = '';
          v.appendChild(inp);
        }
      });

      // Save bar
      saveBar = document.createElement('div');
      saveBar.className = 'ov-save-bar';
      saveBar.innerHTML = `
        <button type="button" class="btn btn-secondary btn-sm" data-act="cancel">Cancel</button>
        <button type="button" class="btn btn-primary btn-sm" data-act="save">Save</button>
      `;
      fields.insertAdjacentElement('afterend', saveBar);
      $('[data-act=cancel]', saveBar).onclick = () => exit(false);
      $('[data-act=save]', saveBar).onclick = () => exit(true);

      card.addEventListener('keydown', onKey);
      nameInp.focus();
      nameInp.select();
    };

    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); exit(false); }
      else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); exit(true); }
    };

    const exit = (save) => {
      if (!editing) return;

      if (save) {
        // Validate location mandatory fields
        const locRow = $('.row[data-pf-row="location"]', fields);
        const cityInp = locRow ? locRow.querySelector('[data-loc="city"]') : null;
        const countryInp = locRow ? locRow.querySelector('[data-loc="country"]') : null;
        let bad = false;
        [cityInp, countryInp].forEach(el => { if (el) el.classList.toggle('bad', !el.value.trim()); });
        if (cityInp && !cityInp.value.trim()) { cityInp.focus(); bad = true; }
        else if (countryInp && !countryInp.value.trim()) { countryInp.focus(); bad = true; }
        if (bad) {
          toast('City and country are required', { kind: 'error', icon: 'ri-error-warning-line' });
          return;
        }

        // Header
        const nameInp = $('input.ov-edit-input.h2', card);
        const subInp  = $('input.ov-edit-input.sub', card);
        const name = (nameInp ? nameInp.value.trim() : '') || snapshot.name.trim() || 'Unnamed';
        nameEl.textContent = name;
        subEl.textContent  = (subInp ? subInp.value.trim() : '') || snapshot.sub.trim();
        avaEl.textContent  = initials(name);

        // Rows
        $$('.row', fields).forEach(row => {
          const v = row.querySelector('.v');
          const kind = row.dataset.pfRow;

          if (kind === 'location') {
            const get = (k) => (row.querySelector(`[data-loc="${k}"]`) || {}).value || '';
            const city = get('city').trim(), country = get('country').trim();
            const state = get('state').trim(), street = get('street').trim();
            const zip = get('zip').trim(), note = get('note').trim();
            row.dataset.locCity = city;
            row.dataset.locCountry = country;
            row.dataset.locState = state;
            row.dataset.locStreet = street;
            row.dataset.locZip = zip;
            row.dataset.locNote = note;
            // Display: "City, Country" with optional state/street/zip on a sub-line
            const main = [city, country].filter(Boolean).join(', ');
            const detail = [street, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
            v.innerHTML = `<div>${esc(main)}</div>${detail ? `<div style="font-size:11px;color:var(--fg3);font-weight:400;margin-top:2px;">${esc(detail)}</div>` : ''}${note ? `<div style="font-size:11px;color:var(--fg3);font-weight:400;margin-top:2px;font-style:italic;">${esc(note)}</div>` : ''}`;
          } else if (kind === 'language') {
            const sel = row.querySelector('select[data-role="language"]');
            const code = sel ? sel.value : 'en';
            const lang = LANGUAGES.find(l => l.code === code) || LANGUAGES[0];
            row.dataset.langCode = lang.code;
            v.textContent = lang.label;
          } else {
            const inp = row.querySelector('input.ov-edit-input');
            const val = inp ? inp.value.trim() : '';
            if (kind === 'email' && val) {
              row.dataset.copy = val;
              v.innerHTML = `<a href="mailto:${esc(val)}" onclick="event.preventDefault();">${esc(val)}</a>`;
            } else if ((kind === 'phone' || kind === 'whatsapp') && val) {
              row.dataset.copy = val;
              v.textContent = val;
            } else {
              v.textContent = val;
            }
          }
          row.classList.remove('editing');
        });

        toast('Profile updated', { kind: 'success', icon: 'ri-check-line' });
      } else {
        // restore
        nameEl.textContent = snapshot.name;
        subEl.textContent  = snapshot.sub;
        snapshot.rows.forEach(({ row, html, ds }) => {
          row.querySelector('.v').innerHTML = html;
          // Restore data-* attributes
          Object.keys(ds).forEach(k => row.dataset[k] = ds[k]);
          row.classList.remove('editing');
        });
      }
      nameEl.classList.remove('editing');
      subEl.classList.remove('editing');
      if (saveBar) { saveBar.remove(); saveBar = null; }
      card.removeEventListener('keydown', onKey);
      btn.classList.remove('active');
      card.classList.remove('is-editing');
      editing = false; snapshot = null;
    };

    btn.addEventListener('click', () => editing ? exit(true) : enter());
  }

  // ---------- Asset (inline picker) ----------
  // Sites — each parcel is a fixed price within the site.
  const SITES = [
    { name: 'Brookfield',     pricePerParcel: 62166,  rate: 6.25, color: '#7BAA5A', color2: '#4F7E36' },
    { name: 'Riverside',      pricePerParcel: 81666,  rate: 5.95, color: '#5BA9C8', color2: '#357692' },
    { name: 'Maple Heights',  pricePerParcel: 47600,  rate: 6.50, color: '#C8865B', color2: '#8C5A36' },
    { name: 'Pinegrove Estate', pricePerParcel: 102500, rate: 5.75, color: '#6E8C5C', color2: '#3D5A2E' },
    { name: 'Lakeview',       pricePerParcel: 49250,  rate: 6.40, color: '#8C5BC8', color2: '#5A3692' },
    { name: 'Sunrise Acres',  pricePerParcel: 38900,  rate: 6.75, color: '#E0A93B', color2: '#A47620' },
    { name: 'Coastal Bluffs', pricePerParcel: 124000, rate: 5.50, color: '#3B7DA8', color2: '#1F4F76' },
  ];
  const fmtUSD = (n) => '$' + Math.round(n).toLocaleString();
  const siteThumb = (s) => `<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:4px;background:linear-gradient(135deg,${s.color},${s.color2});color:white;font:600 10px var(--font-sans);flex-shrink:0;margin-right:8px;">${s.name[0]}</span>`;

  function initAsset() {
    const card = $('#assetCard');
    const link = $('#assetChange');
    const mini = $('#assetMini');
    if (!card || !link || !mini) return;

    let editing = false, savedHTML = null;

    const enter = (e) => {
      if (e) e.preventDefault();
      if (editing) return;
      editing = true;
      link.classList.add('active');
      card.classList.add('is-editing');

      const curSite = (mini.querySelector('[data-asset="site"]') || {}).textContent || SITES[0].name;
      const curParcels = parseInt((mini.querySelector('[data-asset="parcels"]') || {}).textContent, 10) || 1;
      savedHTML = mini.outerHTML;

      const editor = document.createElement('div');
      editor.className = 'ov-inline-editor';
      editor.id = 'assetEditor';
      editor.innerHTML = `
        <div>
          <label>Site</label>
          <div class="ov-site-picker" style="position:relative;">
            <button type="button" data-role="site-toggle" style="width:100%;display:flex;align-items:center;border:1px solid var(--border-default);border-radius:7px;padding:7px 10px;background:white;font:13px var(--font-sans);color:var(--color-grey-800);cursor:pointer;text-align:left;">
              <span data-role="site-thumb" style="display:inline-flex;flex-shrink:0;"></span>
              <span data-role="site-label" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></span>
              <i class="ri-arrow-down-s-line" style="color:var(--fg3);"></i>
            </button>
            <div data-role="site-menu" hidden style="position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:50;background:white;border:1px solid var(--border-default);border-radius:8px;box-shadow:0 8px 24px rgba(15,23,42,0.10);padding:6px;">
              <input data-role="site-search" type="text" placeholder="Search sites…" style="width:100%;border:1px solid var(--border-default);border-radius:6px;padding:6px 8px;font:12px var(--font-sans);outline:none;margin-bottom:4px;box-sizing:border-box;" />
              <div data-role="site-list" style="max-height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:1px;"></div>
            </div>
          </div>
        </div>
        <div>
          <label>Number of parcels</label>
          <input data-role="parcels" type="number" min="1" max="999" value="${curParcels}" />
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-top:1px solid var(--border-subtle);font:13px var(--font-sans);">
          <span style="color:var(--fg3);font-size:11px;text-transform:uppercase;letter-spacing:.03em;font-weight:500;">Total price</span>
          <span data-role="total" style="font-weight:600;color:var(--color-brand-700);"></span>
        </div>
        <div class="ov-save-bar" style="margin-top:4px;">
          <button type="button" class="btn btn-secondary btn-sm" data-act="cancel">Cancel</button>
          <button type="button" class="btn btn-primary btn-sm" data-act="save">Save</button>
        </div>
      `;
      mini.replaceWith(editor);

      let selectedSite = SITES.find(s => s.name === curSite) || SITES[0];

      const refreshSiteBtn = () => {
        $('[data-role="site-thumb"]', editor).innerHTML = siteThumb(selectedSite);
        $('[data-role="site-label"]', editor).textContent = `${selectedSite.name} — ${fmtUSD(selectedSite.pricePerParcel)}/parcel`;
      };
      const refreshTotal = () => {
        const p = Math.max(1, parseInt($('[data-role="parcels"]', editor).value, 10) || 1);
        $('[data-role="total"]', editor).textContent = fmtUSD(selectedSite.pricePerParcel * p);
      };
      const renderSiteList = (q) => {
        const ql = (q || '').trim().toLowerCase();
        const list = SITES.filter(s => !ql || s.name.toLowerCase().includes(ql));
        const listEl = $('[data-role="site-list"]', editor);
        if (!list.length) {
          listEl.innerHTML = '<div style="padding:10px;color:var(--fg3);text-align:center;font-size:12px;">No sites match</div>';
          return;
        }
        listEl.innerHTML = list.map(s => `
          <button type="button" data-site="${esc(s.name)}" style="display:flex;align-items:center;background:${s.name===selectedSite.name?'var(--color-brand-50)':'none'};border:0;cursor:pointer;text-align:left;padding:6px 8px;border-radius:6px;font:13px var(--font-sans);color:var(--color-grey-800);width:100%;">
            ${siteThumb(s)}
            <span style="flex:1;min-width:0;">${esc(s.name)}</span>
            <span style="color:var(--fg3);font-size:11px;">${fmtUSD(s.pricePerParcel)}</span>
          </button>
        `).join('');
        listEl.querySelectorAll('button[data-site]').forEach(b => {
          b.onmouseover = () => { if (b.dataset.site !== selectedSite.name) b.style.background = 'var(--color-grey-50)'; };
          b.onmouseout  = () => { b.style.background = (b.dataset.site === selectedSite.name) ? 'var(--color-brand-50)' : 'none'; };
          b.onclick = () => {
            selectedSite = SITES.find(s => s.name === b.dataset.site);
            refreshSiteBtn();
            refreshTotal();
            $('[data-role="site-menu"]', editor).hidden = true;
          };
        });
      };

      const toggle = $('[data-role="site-toggle"]', editor);
      const menu   = $('[data-role="site-menu"]', editor);
      const search = $('[data-role="site-search"]', editor);
      toggle.addEventListener('click', (ev) => {
        ev.stopPropagation();
        menu.hidden = !menu.hidden;
        if (!menu.hidden) {
          renderSiteList('');
          setTimeout(() => search.focus(), 20);
        }
      });
      search.addEventListener('input', () => renderSiteList(search.value));
      document.addEventListener('mousedown', function onDoc(e) {
        if (!editor.contains(e.target)) { menu.hidden = true; }
      });
      $('[data-role="parcels"]', editor).addEventListener('input', refreshTotal);

      refreshSiteBtn();
      refreshTotal();

      $('[data-act=cancel]', editor).onclick = () => exit(false);
      $('[data-act=save]',   editor).onclick = () => exit(true, selectedSite);
    };

    const exit = (save, selectedSite) => {
      if (!editing) return;
      const editor = $('#assetEditor', card);

      if (save && editor) {
        const s = selectedSite || SITES[0];
        const parcels = Math.max(1, parseInt($('[data-role="parcels"]', editor).value, 10) || 1);
        const total = s.pricePerParcel * parcels;
        editor.outerHTML = savedHTML;
        const newMini = $('#assetMini', card);
        newMini.querySelector('[data-asset="site"]').textContent = s.name;
        newMini.querySelector('[data-asset="parcels"]').textContent = String(parcels);
        newMini.querySelector('[data-asset="total"]').textContent = fmtUSD(total);
        const initial = newMini.querySelector('[data-asset="initial"]');
        if (initial) initial.textContent = s.name[0];
        const img = newMini.querySelector('[data-asset="img"]');
        if (img) img.style.background = `linear-gradient(135deg, ${s.color}, ${s.color2})`;
        // Keep financing price + rate in sync — both correlate to Asset of interest.
        const finPrice = document.querySelector('#financingRows [data-fin="price"]');
        if (finPrice) finPrice.textContent = fmtUSD(total);
        const finRate = document.querySelector('#financingRows [data-fin="rate"]');
        if (finRate) finRate.textContent = `${s.rate.toFixed(2)}% APR`;
        const finTotalAmt = document.querySelector('#financingRows [data-fin="totalAmount"]');
        if (finTotalAmt) finTotalAmt.textContent = fmtUSD(total);
        toast('Asset updated', { kind: 'success', icon: 'ri-check-line' });
      } else if (editor) {
        editor.outerHTML = savedHTML;
      }
      editing = false; savedHTML = null;
      link.classList.remove('active');
      card.classList.remove('is-editing');
    };

    link.addEventListener('click', (e) => editing ? (e.preventDefault(), exit(false)) : enter(e));
  }

  // ---------- Financing (inline form) ----------
  function parseMoney(s) { return Number(String(s).replace(/[^0-9.]/g, '')) || 0; }
  function fmtMoney(n)   { return '$' + Math.round(n).toLocaleString(); }

  function recalcFinancing(state) {
    const principal = Math.max(0, state.price - state.down);
    const r = (state.rate / 100) / 12;
    const n = state.termMonths || 0;
    let monthly = 0;
    if (state.type === 'All at once' || state.type === 'Cash') monthly = 0;
    else if (r === 0) monthly = principal / Math.max(1, n);
    else monthly = principal * r / (1 - Math.pow(1 + r, -n));
    return Math.round(monthly);
  }

  function initFinancing() {
    const card = $('#financingCard');
    const link = $('#financingEdit');
    const rows = $('#financingRows');
    if (!card || !link || !rows) return;

    let editing = false, savedHTML = null;

    const enter = (e) => {
      if (e) e.preventDefault();
      if (editing) return;
      editing = true;
      link.classList.add('active');
      card.classList.add('is-editing');

      // Asset price + rate are read from the Asset of interest card (single source of truth).
      const assetTotalEl = document.querySelector('#assetMini [data-asset="total"]');
      const assetSiteEl  = document.querySelector('#assetMini [data-asset="site"]');
      const assetSite    = SITES.find(s => s.name === (assetSiteEl ? assetSiteEl.textContent.trim() : '')) || SITES[0];
      const assetPrice   = assetTotalEl ? parseMoney(assetTotalEl.textContent) : 0;
      const assetRate    = assetSite.rate;

      let curType = (rows.querySelector('[data-fin="type"]').textContent.trim());
      if (curType === 'Cash') curType = 'All at once';

      const cur = {
        type:    curType,
        price:   assetPrice,
        downAmt: parseMoney(rows.querySelector('[data-fin="down"]').textContent),
        termMonths: parseInt(rows.querySelector('[data-fin="term"]').textContent, 10) || 300,
        rate:    assetRate,
        firstPaymentISO: (rows.querySelector('[data-fin="firstPayment"]') && rows.querySelector('[data-fin="firstPayment"]').dataset.iso) || '',
        payDay:  parseInt(((rows.querySelector('[data-fin="payDay"]') || {}).textContent || '1'), 10) || 1,
        paymentDateISO: (rows.querySelector('[data-fin="paymentDate"]') && rows.querySelector('[data-fin="paymentDate"]').dataset.iso) || '',
      };
      if (!cur.firstPaymentISO) {
        const d = new Date(); d.setMonth(d.getMonth() + 1, 1);
        cur.firstPaymentISO = d.toISOString().slice(0, 10);
      }
      if (!cur.paymentDateISO) cur.paymentDateISO = cur.firstPaymentISO;
      const termText = rows.querySelector('[data-fin="term"]').textContent.toLowerCase();
      if (termText.includes('year')) cur.termMonths = (parseInt(termText, 10) || 25) * 12;
      savedHTML = rows.outerHTML;

      const editor = document.createElement('div');
      editor.className = 'ov-inline-editor';
      editor.id = 'finEditor';
      const roField = (label, val, hint) => `
        <div data-fk-grp>
          <label>${label}</label>
          <div style="display:flex;align-items:center;justify-content:space-between;border:1px solid var(--border-default);border-radius:7px;padding:8px 10px;background:var(--color-grey-25);font:13px var(--font-sans);color:var(--color-grey-800);">
            <span>${val}</span>
            <span style="font-size:11px;color:var(--fg3);">${hint}</span>
          </div>
        </div>`;
      editor.innerHTML = `
        <div data-fk-grp>
          <label>Type</label>
          <select data-fk="type">
            <option value="Loan" ${cur.type==='Loan'?'selected':''}>Loan</option>
            <option value="All at once" ${cur.type==='All at once'?'selected':''}>All at once</option>
          </select>
        </div>

        <!-- Loan-only fields -->
        <div data-fk-mode="loan" style="display:contents;">
          ${roField('Asset price ($)', `<span data-fk-readonly-val="price">${fmtMoney(cur.price)}</span>`, 'From asset')}
          <div data-fk-grp>
            <label>Downpayment ($)</label>
            <input data-fk="down" type="text" inputmode="numeric" value="${cur.downAmt.toLocaleString()}" />
          </div>
          <div data-fk-grp>
            <label>Term (months) — max 360 (30 yrs)</label>
            <input data-fk="term" type="number" min="1" max="360" value="${Math.min(cur.termMonths, 360)}" />
          </div>
          ${roField('Rate (% APR)', `<span data-fk-readonly-val="rate">${cur.rate.toFixed(2)}%</span>`, 'From asset')}
          <div data-fk-grp>
            <label>First payment date</label>
            <input data-fk="firstPayment" type="date" value="${cur.firstPaymentISO}" />
          </div>
          <div data-fk-grp>
            <label>Preferred payment day</label>
            <select data-fk="payDay">
              ${Array.from({length:28},(_,i)=>i+1).map(d=>`<option value="${d}" ${d===cur.payDay?'selected':''}>${d}${['st','nd','rd'][((d%100)-20)%10-1]||['st','nd','rd'][d-1]||'th'} of month</option>`).join('')}
            </select>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid var(--border-subtle);font:13px var(--font-sans);">
            <span style="color:var(--fg3);font-size:11px;text-transform:uppercase;letter-spacing:.03em;font-weight:500;">Est. monthly</span>
            <span data-fk="monthlyPreview" style="font-weight:600;color:var(--color-brand-700);"></span>
          </div>
        </div>

        <!-- All-at-once fields -->
        <div data-fk-mode="allatonce" style="display:none;">
          ${roField('Total amount ($)', `<span data-fk-readonly-val="total">${fmtMoney(cur.price)}</span>`, 'From asset')}
          <div data-fk-grp style="margin-top:8px;">
            <label>Payment date</label>
            <input data-fk="paymentDate" type="date" value="${cur.paymentDateISO}" />
          </div>
        </div>

        <div class="ov-save-bar" style="margin-top:4px;">
          <button type="button" class="btn btn-secondary btn-sm" data-act="cancel">Cancel</button>
          <button type="button" class="btn btn-primary btn-sm" data-act="save">Save</button>
        </div>
      `;
      rows.replaceWith(editor);

      const parseLooseNum = (v) => parseFloat(String(v||'').replace(/[^0-9.]/g,'')) || 0;
      const readAsset = () => {
        const totalEl = document.querySelector('#assetMini [data-asset="total"]');
        const siteEl  = document.querySelector('#assetMini [data-asset="site"]');
        const site    = SITES.find(s => s.name === (siteEl ? siteEl.textContent.trim() : '')) || SITES[0];
        return { price: totalEl ? parseMoney(totalEl.textContent) : cur.price, rate: site.rate };
      };
      const refresh = () => {
        const t = $('[data-fk="type"]', editor).value;
        const a = readAsset();
        $('[data-fk-mode="loan"]', editor).style.display      = (t === 'Loan' ? 'contents' : 'none');
        $('[data-fk-mode="allatonce"]', editor).style.display = (t === 'All at once' ? 'block' : 'none');
        $('[data-fk-readonly-val="price"]', editor).textContent = fmtMoney(a.price);
        $('[data-fk-readonly-val="rate"]',  editor).textContent = a.rate.toFixed(2) + '%';
        $('[data-fk-readonly-val="total"]', editor).textContent = fmtMoney(a.price);
        if (t === 'Loan') {
          const d  = parseLooseNum($('[data-fk="down"]', editor).value);
          let tm   = parseFloat($('[data-fk="term"]', editor).value) || 0;
          if (tm > 360) { tm = 360; $('[data-fk="term"]', editor).value = 360; }
          const m  = recalcFinancing({ type: t, price: a.price, down: d, termMonths: tm, rate: a.rate });
          $('[data-fk="monthlyPreview"]', editor).textContent = fmtMoney(m);
        }
      };
      $('[data-fk="down"]', editor).addEventListener('blur', (e) => {
        const n = parseLooseNum(e.target.value);
        e.target.value = n ? n.toLocaleString() : '';
      });
      editor.querySelectorAll('input,select').forEach(el => el.addEventListener('input', refresh));
      refresh();

      $('[data-act=cancel]', editor).onclick = () => exit(false);
      $('[data-act=save]', editor).onclick   = () => exit(true);
    };

    const exit = (save) => {
      if (!editing) return;
      const editor = $('#finEditor', card);

      if (save && editor) {
        const t = $('[data-fk="type"]', editor).value;
        const totalEl = document.querySelector('#assetMini [data-asset="total"]');
        const siteEl  = document.querySelector('#assetMini [data-asset="site"]');
        const site    = SITES.find(s => s.name === (siteEl ? siteEl.textContent.trim() : '')) || SITES[0];
        const p  = totalEl ? parseMoney(totalEl.textContent) : 0;
        const rt = site.rate;
        if (p <= 0) {
          toast('Asset price required — set Asset of interest first', { kind: 'error', icon: 'ri-error-warning-line' });
          return;
        }
        const ord = (n) => (n%100>=11&&n%100<=13)?n+'th':({1:'st',2:'nd',3:'rd'}[n%10]||'th');
        const fmtDate = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

        editor.outerHTML = savedHTML;
        const newRows = $('#financingRows', card);
        newRows.dataset.finMode = (t === 'Loan' ? 'loan' : 'allatonce');
        newRows.querySelectorAll('[data-fin-show="loan"]').forEach(el => { el.hidden = (t !== 'Loan'); });
        newRows.querySelectorAll('[data-fin-show="allatonce"]').forEach(el => { el.hidden = (t !== 'All at once'); });
        newRows.querySelector('[data-fin="type"]').textContent = t;

        if (t === 'Loan') {
          const d  = parseLooseNum($('[data-fk="down"]', editor).value);
          let tm   = parseFloat($('[data-fk="term"]', editor).value) || 0;
          if (tm > 360) tm = 360;
          if (d > p) {
            // restore the editor — but it was already removed; just show toast and re-enter edit mode
            toast('Downpayment can\u2019t exceed asset price', { kind: 'error', icon: 'ri-error-warning-line' });
            link.classList.add('active');
            card.classList.add('is-editing');
            editing = true;
            // Re-render editor by re-calling enter — but enter() reads from current rows, which now reflect saved state.
            // Simpler: revert by re-injecting savedHTML, then re-enter.
            return;
          }
          const monthly = recalcFinancing({ type: t, price: p, down: d, termMonths: tm, rate: rt });
          const fpISO = $('[data-fk="firstPayment"]', editor).value || cur.firstPaymentISO;
          const payDay = parseInt($('[data-fk="payDay"]', editor).value, 10) || 1;
          newRows.querySelector('[data-fin="price"]').textContent = fmtMoney(p);
          newRows.querySelector('[data-fin-k="down"]').textContent = 'Downpayment';
          newRows.querySelector('[data-fin="down"]').textContent = fmtMoney(d);
          newRows.querySelector('[data-fin="term"]').textContent = `${tm} months`;
          newRows.querySelector('[data-fin="rate"]').textContent = `${rt.toFixed(2)}% APR`;
          const fpEl = newRows.querySelector('[data-fin="firstPayment"]');
          if (fpEl) { fpEl.textContent = fmtDate(fpISO); fpEl.dataset.iso = fpISO; }
          const pdEl = newRows.querySelector('[data-fin="payDay"]');
          if (pdEl) pdEl.textContent = `${ord(payDay)} of month`;
          newRows.querySelector('[data-fin="monthly"]').textContent = fmtMoney(monthly);
        } else {
          // All at once
          const dtISO = $('[data-fk="paymentDate"]', editor).value || cur.paymentDateISO;
          newRows.querySelector('[data-fin="totalAmount"]').textContent = fmtMoney(p);
          const dtEl = newRows.querySelector('[data-fin="paymentDate"]');
          if (dtEl) { dtEl.textContent = fmtDate(dtISO); dtEl.dataset.iso = dtISO; }
        }
        toast('Financing updated', { kind: 'success', icon: 'ri-check-line' });
      } else if (editor) {
        editor.outerHTML = savedHTML;
      }
      editing = false; savedHTML = null;
      link.classList.remove('active');
      card.classList.remove('is-editing');
    };

    link.addEventListener('click', (e) => editing ? (e.preventDefault(), exit(false)) : enter(e));
  }

  // ---------- Assigned agent (inline picker) ----------
  const AGENTS = [
    { id: 'km', name: 'Kevin Manga',       role: 'Senior agent · Brookfield', region: 'Greater Accra',   load: 14, status: 'online', initials: 'KM', color: 'var(--color-brand-700)',                  isMe: true },
    { id: 'ao', name: 'Ama Owusu',         role: 'Agent · Accra Central',     region: 'Greater Accra',   load: 9,  status: 'online', initials: 'AO', color: 'var(--color-blue-700)' },
    { id: 'db', name: 'Daniel Boateng',    role: 'Agent · Riverside',         region: 'Eastern',         load: 7,  status: 'busy',   initials: 'DB', color: 'var(--color-success-700)' },
    { id: 'ps', name: 'Priya Sharma',      role: 'Senior agent · Lakeview',   region: 'Western',         load: 11, status: 'online', initials: 'PS', color: 'var(--color-warning-700)' },
    { id: 'ma', name: 'Mensah Acheampong', role: 'Agent · Pinegrove',         region: 'Ashanti',         load: 6,  status: 'away',   initials: 'MA', color: 'var(--color-purple-700, #7C3AED)' },
  ];
  const AGENT_STATUS_DOT = { online: '#16a34a', busy: '#ea580c', away: '#94a3b8' };

  function initAgent() {
    const card = $('#assignedAgentCard');
    const link = $('#assignedAgentChange');
    const body = $('#assignedAgentBody');
    if (!card || !link || !body) return;

    let editing = false, savedHTML = null;

    const enter = (e) => {
      if (e) e.preventDefault();
      if (editing) return;
      editing = true;
      link.classList.add('active');
      card.classList.add('is-editing');

      const nm = $('#assignedAgentName');
      const current = nm ? nm.textContent.trim() : '';
      let selectedId = (AGENTS.find(a => a.name === current) || AGENTS[0]).id;
      savedHTML = body.outerHTML;

      const editor = document.createElement('div');
      editor.className = 'ov-inline-editor';
      editor.id = 'agentEditor';
      const cur = AGENTS.find(a => a.id === selectedId) || AGENTS[0];
      editor.innerHTML = `
        <div>
          <label>Choose an agent</label>
          <div class="pdv2-combo" id="ovAgentCombo" data-selected="${selectedId}">
            <button type="button" class="pdv2-combo-btn" id="ovAgentBtn" aria-haspopup="listbox" aria-expanded="false">
              <span class="pdv2-combo-avatar" id="ovAgentBtnAva" style="background:${cur.color};">${cur.initials}</span>
              <span class="pdv2-combo-label" id="ovAgentBtnLbl">${esc(cur.name)}${cur.isMe ? ' (me)' : ''}</span>
              <i class="ri-arrow-down-s-line"></i>
            </button>
            <div class="pdv2-combo-pop" id="ovAgentPop" hidden role="listbox">
              <div class="pdv2-combo-search">
                <i class="ri-search-line"></i>
                <input type="text" id="ovAgentSearch" placeholder="Search agents…" autocomplete="off" />
              </div>
              <div class="pdv2-combo-list" id="ovAgentList"></div>
            </div>
          </div>
        </div>
        <div class="ov-save-bar" style="margin-top:4px;">
          <button type="button" class="btn btn-secondary btn-sm" data-act="cancel">Cancel</button>
          <button type="button" class="btn btn-primary btn-sm" data-act="save">Save</button>
        </div>
      `;
      body.replaceWith(editor);

      const combo  = $('#ovAgentCombo', editor);
      const cBtn   = $('#ovAgentBtn', editor);
      const cPop   = $('#ovAgentPop', editor);
      const cInp   = $('#ovAgentSearch', editor);
      const cList  = $('#ovAgentList', editor);
      const cAva   = $('#ovAgentBtnAva', editor);
      const cLbl   = $('#ovAgentBtnLbl', editor);

      function rowHTML(a) {
        const sel = a.id === selectedId ? ' is-selected' : '';
        return `
          <button type="button" class="pdv2-agent-opt${sel}" data-id="${a.id}" role="option">
            <span class="pdv2-agent-ava-wrap">
              <span class="pdv2-agent-ava" style="background:${a.color};">${a.initials}</span>
              <span class="pdv2-agent-status" style="background:${AGENT_STATUS_DOT[a.status] || '#94a3b8'};"></span>
            </span>
            <span class="pdv2-agent-meta">
              <span class="pdv2-agent-name">${esc(a.name)}${a.isMe ? ' <em style="font-style:normal;color:var(--color-brand-700);font-weight:500;">(me)</em>' : ''}</span>
              <span class="pdv2-agent-sub">${esc(a.role)} · ${a.load} active</span>
            </span>
            <span class="check"><i class="ri-check-line"></i></span>
          </button>`;
      }
      function renderList(q) {
        const term = (q || '').trim().toLowerCase();
        const matches = AGENTS.filter(a => !term || a.name.toLowerCase().includes(term) || a.role.toLowerCase().includes(term) || (a.region || '').toLowerCase().includes(term));
        if (!matches.length) { cList.innerHTML = '<div class="pdv2-combo-empty">No agents match.</div>'; return; }
        cList.innerHTML = matches.map(rowHTML).join('');
        cList.querySelectorAll('.pdv2-agent-opt').forEach(o => {
          o.addEventListener('click', () => {
            selectedId = o.dataset.id;
            combo.dataset.selected = selectedId;
            const a = AGENTS.find(x => x.id === selectedId) || AGENTS[0];
            cAva.textContent = a.initials; cAva.style.background = a.color;
            cLbl.innerHTML = esc(a.name) + (a.isMe ? ' (me)' : '');
            closePop();
          });
        });
      }
      function openPop() {
        cPop.hidden = false; combo.classList.add('is-open');
        cBtn.setAttribute('aria-expanded', 'true');
        cInp.value = ''; renderList(''); setTimeout(() => cInp.focus(), 0);
      }
      function closePop() {
        cPop.hidden = true; combo.classList.remove('is-open');
        cBtn.setAttribute('aria-expanded', 'false');
      }
      cBtn.addEventListener('click', (e) => { e.stopPropagation(); cPop.hidden ? openPop() : closePop(); });
      cInp.addEventListener('input', () => renderList(cInp.value));
      const docClose = (e) => { if (combo && !combo.contains(e.target)) closePop(); };
      document.addEventListener('click', docClose);
      const escClose = (e) => { if (e.key === 'Escape' && !cPop.hidden) closePop(); };
      document.addEventListener('keydown', escClose);
      editor._cleanup = () => {
        document.removeEventListener('click', docClose);
        document.removeEventListener('keydown', escClose);
      };
      renderList('');

      $('[data-act=cancel]', editor).onclick = () => exit(false);
      $('[data-act=save]', editor).onclick   = () => exit(true);
    };

    const exit = (save) => {
      if (!editing) return;
      const editor = $('#agentEditor', card);
      if (editor && editor._cleanup) editor._cleanup();

      if (save && editor) {
        const id = editor.querySelector('#ovAgentCombo').dataset.selected;
        const a = AGENTS.find(x => x.id === id) || AGENTS[0];
        editor.outerHTML = savedHTML;
        const ava = $('#assignedAgentAvatar', card);
        const nmEl = $('#assignedAgentName', card);
        const sbEl = $('#assignedAgentSub', card);
        if (ava) { ava.textContent = a.initials; ava.style.background = a.color; }
        if (nmEl) nmEl.textContent = a.name;
        if (sbEl) sbEl.textContent = a.role;
        toast('Reassigned to ' + a.name, { kind: 'success', icon: 'ri-user-shared-line' });
      } else if (editor) {
        editor.outerHTML = savedHTML;
      }
      editing = false; savedHTML = null;
      link.classList.remove('active');
      card.classList.remove('is-editing');
    };

    link.addEventListener('click', (e) => editing ? (e.preventDefault(), exit(false)) : enter(e));
  }

  // ---------- boot ----------
  function boot() { initCopyRows(); initProfile(); initAsset(); initFinancing(); initAgent(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
