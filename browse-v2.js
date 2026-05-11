/* =================================================================
   Ream · Browse v2 — controller
   Dallas, TX only · Land + Houses
   ================================================================= */

/* Sample inventory — Dallas, Texas. Land-heavy by intent. */
const PROPERTIES = [
  /* === LAND (12) === */
  {
    id: 'LND-014', name: 'Brookfield Plot', loc: 'Lakewood, Dallas, TX',
    type: 'land', price: 186500, monthly: 1420, deposit: 18650,
    acres: 0.42, sqft: 18295, zoning: 'residential',
    frontage: ['paved', 'corner'], utilities: ['water', 'power', 'fiber'],
    title: 'Verified', daysListed: 5, status: ['ready', 'new'], featured: true, photos: 18,
    grad: 'linear-gradient(135deg, #a3b18a, #588157, #3a5a40)',
    summary: '0.42 acre flat lot, paved frontage, fiber at the curb. Walking distance to White Rock Lake.'
  },
  {
    id: 'LND-019', name: 'Cedar Hills · Lot 14', loc: 'Cedar Crest, Dallas, TX',
    type: 'land', price: 92000, monthly: 740, deposit: 9200,
    acres: 0.18, sqft: 7840, zoning: 'residential',
    frontage: ['paved'], utilities: ['water', 'power'],
    title: 'Verified', daysListed: 12, status: ['ready'], featured: false, photos: 9,
    grad: 'linear-gradient(135deg, #b08968, #7f5539, #553c2c)',
    summary: 'Affordable entry plot inside a managed estate. Roads, perimeter wall, security.'
  },
  {
    id: 'LND-021', name: 'Bishop Arts View · 2-acre', loc: 'Oak Cliff, Dallas, TX',
    type: 'land', price: 410000, monthly: 3120, deposit: 41000,
    acres: 2.10, sqft: 91476, zoning: 'mixed',
    frontage: ['paved', 'corner'], utilities: ['water', 'power'],
    title: 'Verified', daysListed: 22, status: ['ready'], featured: true, photos: 31,
    grad: 'linear-gradient(135deg, #6b9080, #354f52, #2f3e46)',
    summary: 'Skyline ridge parcel — buildable plateau on the north end, gentle slope below.'
  },
  {
    id: 'LND-027', name: 'Trinity River Frontage', loc: 'West Dallas, TX',
    type: 'land', price: 268000, monthly: 2040, deposit: 26800,
    acres: 1.05, sqft: 45738, zoning: 'mixed',
    frontage: ['dirt'], utilities: ['power'],
    title: 'Verified', daysListed: 30, status: ['ready'], featured: false, photos: 14,
    grad: 'linear-gradient(135deg, #4a6741, #283618, #1b2914)',
    summary: 'Direct river frontage, mature trees, septic-ready. Ideal for boutique build.'
  },
  {
    id: 'LND-031', name: 'Stemmons Light-Industrial', loc: 'Stemmons Corridor, Dallas, TX',
    type: 'land', price: 720000, monthly: 5480, deposit: 72000,
    acres: 1.6, sqft: 69696, zoning: 'mixed',
    frontage: ['paved', 'corner'], utilities: ['water', 'power', 'sewer'],
    title: 'Verified', daysListed: 8, status: ['ready'], featured: false, photos: 22,
    grad: 'linear-gradient(135deg, #adb5bd, #6c757d, #495057)',
    summary: 'Zoned light industrial. 250m to I-35E interchange. Three-phase power on site.'
  },
  {
    id: 'LND-033', name: 'Elm Fork Farmland', loc: 'Northwest Dallas, TX',
    type: 'land', price: 145000, monthly: 1100, deposit: 14500,
    acres: 6.40, sqft: 278784, zoning: 'agricultural',
    frontage: ['dirt'], utilities: ['water'],
    title: 'Verified', daysListed: 18, status: ['ready'], featured: false, photos: 11,
    grad: 'linear-gradient(135deg, #d8b365, #8c7644, #5e5328)',
    summary: '6.4 acres, well-tested borehole. Twenty minutes to downtown Dallas.'
  },
  {
    id: 'LND-038', name: 'Highland Park Garden Plot', loc: 'Highland Park, Dallas, TX',
    type: 'land', price: 540000, monthly: 4115, deposit: 54000,
    acres: 0.36, sqft: 15682, zoning: 'residential',
    frontage: ['paved'], utilities: ['water', 'power', 'sewer', 'fiber'],
    title: 'Verified', daysListed: 3, status: ['new'], featured: true, photos: 27,
    grad: 'linear-gradient(135deg, #76c893, #52b788, #1a759f)',
    summary: 'Premium plot inside the Park Cities. Walled. Mature pecan and live-oak.'
  },
  {
    id: 'LND-041', name: 'Preston Hollow Ridge', loc: 'Preston Hollow, Dallas, TX',
    type: 'land', price: 165000, monthly: 1255, deposit: 16500,
    acres: 0.55, sqft: 23958, zoning: 'residential',
    frontage: ['paved'], utilities: ['water', 'power'],
    title: 'Verified', daysListed: 14, status: ['ready'], featured: false, photos: 16,
    grad: 'linear-gradient(135deg, #a8dadc, #457b9d, #1d3557)',
    summary: 'Quiet cul-de-sac. South-facing slope with framed downtown views.'
  },
  {
    id: 'LND-044', name: 'White Rock Lake Plot', loc: 'East Dallas, TX',
    type: 'land', price: 312000, monthly: 2380, deposit: 31200,
    acres: 0.62, sqft: 27007, zoning: 'mixed',
    frontage: ['paved'], utilities: ['water', 'power'],
    title: 'Verified', daysListed: 9, status: ['ready'], featured: false, photos: 19,
    grad: 'linear-gradient(135deg, #ffba08, #faa307, #dc2f02)',
    summary: '120ft of lake-adjacent frontage. Setback line confirmed. Great for a custom build.'
  },
  {
    id: 'LND-046', name: 'Mockingbird Corner', loc: 'Lower Greenville, Dallas, TX',
    type: 'land', price: 198000, monthly: 1510, deposit: 19800,
    acres: 0.31, sqft: 13503, zoning: 'mixed',
    frontage: ['paved', 'corner'], utilities: ['water', 'power', 'fiber'],
    title: 'Verified', daysListed: 6, status: ['ready', 'new'], featured: false, photos: 13,
    grad: 'linear-gradient(135deg, #f4a261, #e76f51, #780000)',
    summary: 'Corner lot on the inner ring. High traffic count, suitable for live/work.'
  },
  {
    id: 'LND-049', name: 'South Dallas Coastal', loc: 'South Dallas, TX',
    type: 'land', price: 88000, monthly: 705, deposit: 8800,
    acres: 0.25, sqft: 10890, zoning: 'residential',
    frontage: ['dirt'], utilities: ['power'],
    title: 'Verified', daysListed: 28, status: ['reserved'], featured: false, photos: 7,
    grad: 'linear-gradient(135deg, #cad2c5, #84a98c, #52796f)',
    summary: 'Quiet south-side parcel. New estate forming around it, water coming next quarter.'
  },
  {
    id: 'LND-052', name: 'Park Cities-adjacent Plot', loc: 'University Park, Dallas, TX',
    type: 'land', price: 480000, monthly: 3660, deposit: 48000,
    acres: 0.45, sqft: 19602, zoning: 'residential',
    frontage: ['paved'], utilities: ['water', 'power', 'sewer', 'fiber'],
    title: 'Verified', daysListed: 1, status: ['new', 'ready'], featured: true, photos: 24,
    grad: 'linear-gradient(135deg, #e9c46a, #f4a261, #2a9d8f)',
    summary: 'Direct neighbor to SMU campus. Perimeter wall, gated estate, 24h security.'
  },

  /* === HOUSES (4) === */
  {
    id: 'HSE-027', name: 'Bishop Arts Townhouse', loc: 'Bishop Arts, Dallas, TX',
    type: 'house', price: 245000, monthly: 1890, deposit: 24500,
    beds: 3, baths: 2.5, sqft: 1640, zoning: 'residential',
    frontage: ['paved'], utilities: ['water', 'power', 'sewer'],
    title: 'Verified', daysListed: 4, status: ['ready', 'new'], featured: false, photos: 24,
    grad: 'linear-gradient(135deg, #ffb4a2, #e5989b, #b5838d)',
    summary: '3 bed townhouse in a managed compound. Solar-ready roof, water tank, garage.'
  },
  {
    id: 'HSE-031', name: 'Highland Park Villa', loc: 'Highland Park, Dallas, TX',
    type: 'house', price: 685000, monthly: 5230, deposit: 68500,
    beds: 5, baths: 4, sqft: 4200, zoning: 'residential',
    frontage: ['paved'], utilities: ['water', 'power', 'sewer', 'fiber'],
    title: 'Verified', daysListed: 11, status: ['ready'], featured: false, photos: 32,
    grad: 'linear-gradient(135deg, #cdb4db, #ffc8dd, #ffafcc)',
    summary: '5-bed villa, pool, gated estate. Furnished package available.'
  },
  {
    id: 'HSE-034', name: 'Uptown Apartment', loc: 'Uptown, Dallas, TX',
    type: 'house', price: 320000, monthly: 2440, deposit: 32000,
    beds: 2, baths: 2, sqft: 1180, zoning: 'residential',
    frontage: ['paved'], utilities: ['water', 'power', 'sewer', 'fiber'],
    title: 'Verified', daysListed: 17, status: ['ready'], featured: false, photos: 18,
    grad: 'linear-gradient(135deg, #80ed99, #38a3a5, #22577a)',
    summary: '2-bed apartment, 6th floor. Generator, gym, lobby concierge.'
  },
  {
    id: 'HSE-037', name: 'Lake Highlands Family Home', loc: 'Lake Highlands, Dallas, TX',
    type: 'house', price: 198000, monthly: 1505, deposit: 19800,
    beds: 4, baths: 3, sqft: 2100, zoning: 'residential',
    frontage: ['paved'], utilities: ['water', 'power'],
    title: 'Verified', daysListed: 23, status: ['ready'], featured: false, photos: 16,
    grad: 'linear-gradient(135deg, #f9c74f, #f8961e, #f3722c)',
    summary: '4-bed detached, walled compound. Guest house and large yard.'
  }
];

/* ----- State ----- */
const state = {
  view: 'grid',
  sort: 'featured',
  pageSize: 9,
  page: 1,
  filters: {
    type: ['land', 'house'],
    acres: [],
    zoning: [],
    frontage: [],
    util: [],
    status: []
  }
};

/* ----- Utilities ----- */
const $ = (s, c=document) => c.querySelector(s);
const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));
const fmt$ = n => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });

const ICONS = {
  water: 'ri-drop-line',
  power: 'ri-flashlight-line',
  sewer: 'ri-recycle-line',
  fiber: 'ri-wifi-line'
};
const UTIL_LABEL = { water: 'Water', power: 'Power', sewer: 'Sewer', fiber: 'Fiber' };

function inAcreRange(acres, range) {
  if (!acres && acres !== 0) return false;
  const [lo, hi] = range.split(',').map(Number);
  return acres >= lo && acres < hi;
}

function applyFilters(items) {
  const f = state.filters;
  return items.filter(p => {
    if (f.type.length && !f.type.includes(p.type)) return false;
    if (f.acres.length) {
      const ok = f.acres.some(r => inAcreRange(p.acres, r));
      if (!ok) return false;
    }
    if (f.zoning.length && !f.zoning.includes(p.zoning)) return false;
    if (f.frontage.length && !f.frontage.some(x => (p.frontage || []).includes(x))) return false;
    if (f.util.length && !f.util.every(x => (p.utilities || []).includes(x))) return false;
    if (f.status.length && !f.status.some(x => (p.status || []).includes(x))) return false;
    return true;
  });
}

function applySort(items) {
  const sorted = items.slice();
  switch (state.sort) {
    case 'price-asc':  sorted.sort((a,b) => a.price - b.price); break;
    case 'price-desc': sorted.sort((a,b) => b.price - a.price); break;
    case 'acres-desc': sorted.sort((a,b) => (b.acres || 0) - (a.acres || 0)); break;
    case 'recent':     sorted.sort((a,b) => a.daysListed - b.daysListed); break;
    default:
      // 'featured' — featured first, then land first, then by recency
      sorted.sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        if ((a.type === 'land') !== (b.type === 'land')) return a.type === 'land' ? -1 : 1;
        return a.daysListed - b.daysListed;
      });
  }
  return sorted;
}

/* ----- Photos by id (Unsplash) ----- */
const PHOTO_BY_ID = {
  // Land
  'LND-001': 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80',
  'LND-014': 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=1200&q=80',
  'LND-022': 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&q=80',
  'LND-025': 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=1200&q=80',
  'LND-029': 'https://images.unsplash.com/photo-1465056836041-7f43ac27dcb5?w=1200&q=80',
  'LND-032': 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&q=80',
  'LND-036': 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80',
  'LND-038': 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80',
  // House
  'HSE-002': 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&q=80',
  'HSE-008': 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80',
  'HSE-019': 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=1200&q=80',
  'HSE-027': 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&q=80',
  'HSE-031': 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80',
  'HSE-034': 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80',
  'HSE-037': 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80'
};
const PHOTO_LAND_FALLBACKS = [
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80',
  'https://images.unsplash.com/photo-1465056836041-7f43ac27dcb5?w=1200&q=80',
  'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=1200&q=80'
];
const PHOTO_HOUSE_FALLBACKS = [
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&q=80',
  'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=1200&q=80',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80'
];
function hashCode(s) { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i); return h; }

/* ----- Render ----- */
function cardHtml(p, isHero) {
  const isLand = p.type === 'land';
  const badge = (() => {
    if (p.status.includes('new')) return `<span class="badge new"><i class="ri-sparkling-2-fill"></i> New</span>`;
    if (p.featured)               return `<span class="badge"><i class="ri-star-fill"></i> Featured</span>`;
    if (p.status.includes('reserved')) return `<span class="badge"><i class="ri-time-line"></i> Reserved</span>`;
    return `<span class="badge"><i class="ri-shield-check-line"></i> Title verified</span>`;
  })();

  const facts = isLand ? `
    <div class="card-fact"><span class="v">${p.acres.toFixed(2)}</span><span class="l">acres</span></div>
    <div class="card-fact"><span class="v">${cap(p.zoning)}</span></div>
    <div class="card-fact"><span class="v">${p.utilities.length}/4</span><span class="l">utilities</span></div>
  ` : `
    <div class="card-fact"><span class="v">${p.beds}</span><span class="l">bed</span></div>
    <div class="card-fact"><span class="v">${p.baths}</span><span class="l">bath</span></div>
    <div class="card-fact"><span class="v">${p.sqft.toLocaleString()}</span><span class="l">sqft</span></div>
  `;

  const utilityPills = isLand ? p.utilities.map(u => `
    <span class="util-pill" title="${UTIL_LABEL[u]} at lot line">
      <i class="${ICONS[u]}" aria-hidden="true"></i>${UTIL_LABEL[u]}
    </span>
  `).join('') : '';

  const summaryLine = state.view === 'list'
    ? `<p class="card-summary">${p.summary}</p>`
    : '';

  const overline = `<div class="card-overline"><span class="type-dot ${p.type}"></span>${isLand ? 'Land' : 'House'} · ${p.id}</div>`;

  const priceBlock = state.view === 'list' ? `
    <div class="card-price">
      <div class="v">${fmt$(p.price)}</div>
      <div class="mo">or <strong>${fmt$(p.monthly)}/mo</strong></div>
      <div class="mo">${fmt$(p.deposit)} deposit</div>
      <span class="cta">View listing <i class="ri-arrow-right-line"></i></span>
    </div>
  ` : `
    <div class="card-price">
      <div class="v">${fmt$(p.price)}</div>
      <div class="mo"><strong>${fmt$(p.monthly)}</strong>/mo</div>
    </div>
  `;

  // Real Dallas-style photos from Unsplash, indexed off id (no auth, no logins)
  const photoSrc = PHOTO_BY_ID[p.id] || (p.type === 'land' ? PHOTO_LAND_FALLBACKS : PHOTO_HOUSE_FALLBACKS)[
    Math.abs(hashCode(p.id)) % (p.type === 'land' ? PHOTO_LAND_FALLBACKS.length : PHOTO_HOUSE_FALLBACKS.length)
  ];

  return `
    <a class="card-link" href="asset-detail.html?id=${encodeURIComponent(p.id)}${(function(){ const cur=new URLSearchParams(location.search); const keep=['first','last','email','phone','timeline','kind','pay','down','term','notes']; const out=[]; keep.forEach(k=>{ if(cur.has(k)) out.push(k+'='+encodeURIComponent(cur.get(k))); }); return out.length?'&'+out.join('&'):''; })()}">
      <article class="card card-${p.type}" data-id="${p.id}">
        <div class="card-photo">
          <div class="ph" style="background-image: url('${photoSrc}'); background-size: cover; background-position: center;"></div>
          ${badge}
          <button class="heart" aria-label="Save" onclick="toggleFav(event, '${p.id}')"><i class="ri-heart-line"></i></button>
          <div class="photos-ct"><i class="ri-image-line"></i> ${p.photos}</div>
        </div>
        <div class="card-body">
          ${overline}
          <h3 class="card-h">${p.name}</h3>
          <div class="card-loc"><i class="ri-map-pin-line" aria-hidden="true"></i> ${p.loc}</div>
          ${summaryLine}
          <div class="card-facts">${facts}</div>
          ${utilityPills ? `<div class="card-utility-row">${utilityPills}</div>` : ''}
          ${state.view === 'list' ? '' : priceBlock}
        </div>
        ${state.view === 'list' ? priceBlock : ''}
      </article>
    </a>
  `;
}

function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }

function render() {
  // 1) compute filtered + sorted result set
  const filtered = applyFilters(PROPERTIES);
  const sorted = applySort(filtered);

  // 2) result counts header
  const total = sorted.length;
  const showing = Math.min(state.page * state.pageSize, total);
  const onlyLand = state.filters.type.length === 1 && state.filters.type[0] === 'land';
  const onlyHouse = state.filters.type.length === 1 && state.filters.type[0] === 'house';
  $('#resultsTitle').textContent = onlyLand ? 'Land in Dallas' :
    onlyHouse ? 'Houses in Dallas' :
    'All properties';
  $('#resultsCount').textContent = total.toLocaleString();
  $('#resultsSub').innerHTML = `<strong>${total.toLocaleString()}</strong> ${total === 1 ? 'property' : 'properties'} · sorted by ${sortLabel()}`;
  $('#pagerMeta').textContent = `Showing ${showing} of ${total}`;
  const phc = $('#ph-count'); if (phc) phc.textContent = PROPERTIES.length;

  // 3) per-type counts in rail
  const byType = { land: 0, house: 0 };
  PROPERTIES.forEach(p => byType[p.type]++);
  if ($('#ct-land')) $('#ct-land').textContent = byType.land;
  if ($('#ct-house')) $('#ct-house').textContent = byType.house;

  // 4) listings
  const list = $('#listings');
  list.className = 'bv-listings ' + state.view;
  if (sorted.length === 0) {
    list.innerHTML = `
      <div class="bv-empty">
        <i class="ri-search-eye-line"></i>
        <h3>No matching properties</h3>
        <p>Try widening your filters — clear acreage or utility checks first.</p>
      </div>`;
  } else {
    const visible = sorted.slice(0, showing);
    list.innerHTML = visible.map((p, i) => cardHtml(p, i === 0 && onlyLand)).join('');
  }

  // 5) load-more visibility
  $('#loadMore').style.display = showing < total ? '' : 'none';

  // 6) active pills
  renderActivePills();
}

function sortLabel() {
  return ({
    'featured': 'relevance',
    'price-asc': 'price · low to high',
    'price-desc': 'price · high to low',
    'acres-desc': 'acreage',
    'recent': 'most recent'
  })[state.sort];
}

function renderActivePills() {
  const pills = [];
  const f = state.filters;
  // Show only NON-default filter values (default: both types on)
  if (f.type.length < 2) {
    f.type.forEach(t => pills.push(['type', t, cap(t)]));
  }
  f.acres.forEach(a => {
    const [lo, hi] = a.split(',');
    const label = hi >= 99 ? `${lo}+ acres` : `${lo}–${hi} acres`;
    pills.push(['acres', a, label]);
  });
  f.zoning.forEach(v => pills.push(['zoning', v, cap(v) + ' zoning']));
  f.frontage.forEach(v => pills.push(['frontage', v, cap(v) + ' frontage']));
  f.util.forEach(v => pills.push(['util', v, UTIL_LABEL[v]]));
  f.status.forEach(v => pills.push(['status', v, cap(v)]));

  const c = $('#activePills');
  if (pills.length === 0) { c.hidden = true; c.innerHTML = ''; return; }
  c.hidden = false;
  c.innerHTML = pills.map(([k, v, label]) => `
    <span class="pill">${label}<button data-k="${k}" data-v="${v}" aria-label="Remove">×</button></span>
  `).join('');
  $$('.pill button', c).forEach(btn => btn.addEventListener('click', () => {
    const k = btn.dataset.k, v = btn.dataset.v;
    if (k === 'type') {
      state.filters.type = state.filters.type.filter(x => x !== v);
      if (state.filters.type.length === 0) state.filters.type = ['land','house'];
    } else {
      state.filters[k] = state.filters[k].filter(x => x !== v);
    }
    syncCheckboxesFromState();
    render();
  }));
}

/* ----- Wire-up ----- */
function init() {
  // Type tabs at top of search bar
  $$('.bv-tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.bv-tabs button').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      const t = btn.dataset.tab;
      state.filters.type = t === 'all' ? ['land', 'house'] : [t];
      syncCheckboxesFromState();
      state.page = 1;
      render();
    });
  });

  // Filter checkboxes
  $$('.bv-checks input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      const f = cb.dataset.f, v = cb.value;
      if (!state.filters[f]) state.filters[f] = [];
      if (cb.checked) {
        if (!state.filters[f].includes(v)) state.filters[f].push(v);
      } else {
        state.filters[f] = state.filters[f].filter(x => x !== v);
      }
      // type: never empty
      if (f === 'type' && state.filters.type.length === 0) {
        state.filters.type = ['land', 'house'];
        syncCheckboxesFromState();
      }
      state.page = 1;
      render();
    });
  });

  // Sort
  $('#sort').addEventListener('change', e => { state.sort = e.target.value; render(); });

  // View toggle
  $$('.bv-view-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.bv-view-toggle button').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      state.view = btn.dataset.view;
      render();
    });
  });

  // Clear all
  $('#clearFilters').addEventListener('click', () => {
    state.filters = { type: ['land','house'], acres: [], zoning: [], frontage: [], util: [], status: [] };
    $$('.bv-tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === 'all'));
    syncCheckboxesFromState();
    render();
  });

  // Load more
  $('#loadMore').addEventListener('click', () => { state.page++; render(); });

  // URL: optional ?type=land or ?type=house
  const urlType = new URLSearchParams(location.search).get('type');
  if (urlType === 'land' || urlType === 'house') {
    state.filters.type = [urlType];
    $$('.bv-tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === urlType));
  }

  syncCheckboxesFromState();
  render();
}

function syncCheckboxesFromState() {
  $$('.bv-checks input[type=checkbox]').forEach(cb => {
    const f = cb.dataset.f, v = cb.value;
    if (state.filters[f]) cb.checked = state.filters[f].includes(v);
  });
}

window.toggleFav = function(e, id) {
  e.stopPropagation();
  const btn = e.currentTarget;
  btn.classList.toggle('on');
  const icon = btn.querySelector('i');
  icon.className = btn.classList.contains('on') ? 'ri-heart-fill' : 'ri-heart-line';
  showToast(btn.classList.contains('on') ? 'Saved to favorites' : 'Removed from favorites');
};

function showToast(msg) {
  const t = $('#toast');
  $('#toastMsg').textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.remove('show'), 1800);
}

window.applySearch = function() { state.page = 1; render(); showToast('Search applied'); };

document.addEventListener('DOMContentLoaded', init);
