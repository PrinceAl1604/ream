/* ============================================================
   REGISTER WIZARDS — Site / Land / House / Existing Loan account
   Usage: include _wizard.css and this script, then call
     window.RegisterWizards.open('site' | 'land' | 'house' | 'loan')
   ============================================================ */
(function () {
  'use strict';

  // ---------- Field render helpers ----------
  function field(opts) {
    var hint = opts.hint ? '<span class="hint">' + opts.hint + '</span>' : '';
    var req = opts.required ? ' <span class="req">*</span>' : (opts.optional ? ' <span style="color:var(--fg3); font-weight:500;">— optional</span>' : '');
    var inner;
    if (opts.kind === 'select') {
      var options = (opts.options || []).map(function (o) {
        if (typeof o === 'string') return '<option>' + o + '</option>';
        return '<option value="' + (o.v || '') + '"' + (o.selected ? ' selected' : '') + (o.disabled ? ' disabled' : '') + '>' + o.l + '</option>';
      }).join('');
      inner = '<select class="wiz-select">' + options + '</select>';
    } else if (opts.kind === 'textarea') {
      inner = '<textarea class="wiz-textarea" placeholder="' + (opts.placeholder || '') + '"' + (opts.rows ? ' rows="' + opts.rows + '"' : '') + '></textarea>';
    } else if (opts.kind === 'date') {
      inner = '<input class="wiz-input" type="date"' + (opts.value ? ' value="' + opts.value + '"' : '') + ' />';
    } else if (opts.suffix) {
      inner = '<div class="wiz-suffix"><input class="wiz-input" type="' + (opts.type || 'text') + '"' +
        (opts.placeholder ? ' placeholder="' + opts.placeholder + '"' : '') +
        (opts.value != null ? ' value="' + opts.value + '"' : '') +
        (opts.min != null ? ' min="' + opts.min + '"' : '') +
        (opts.step != null ? ' step="' + opts.step + '"' : '') +
        (opts.inputmode ? ' inputmode="' + opts.inputmode + '"' : '') +
        ' /><span class="suf">' + opts.suffix + '</span></div>';
    } else if (opts.prefix) {
      inner = '<div class="wiz-prefix"><span class="pre">' + opts.prefix + '</span><input class="wiz-input" type="' + (opts.type || 'text') + '"' +
        (opts.placeholder ? ' placeholder="' + opts.placeholder + '"' : '') +
        (opts.value != null ? ' value="' + opts.value + '"' : '') + ' /></div>';
    } else {
      inner = '<input class="wiz-input" type="' + (opts.type || 'text') + '"' +
        (opts.placeholder ? ' placeholder="' + opts.placeholder + '"' : '') +
        (opts.value != null ? ' value="' + opts.value + '"' : '') +
        (opts.min != null ? ' min="' + opts.min + '"' : '') +
        (opts.step != null ? ' step="' + opts.step + '"' : '') +
        (opts.inputmode ? ' inputmode="' + opts.inputmode + '"' : '') + ' />';
    }
    return '<div class="wiz-f"><label>' + opts.label + req + '</label>' + inner + hint + '</div>';
  }

  function row(fields, mod) { return '<div class="wiz-row' + (mod ? ' ' + mod : '') + '">' + fields.join('') + '</div>'; }
  function rowFull(f) { return '<div class="wiz-row full">' + f + '</div>'; }
  function section(title) { return '<div class="wiz-section-head">' + title + '</div>'; }

  function checks(items, mod) {
    var html = items.map(function (it) {
      return '<label><input type="checkbox" /><i class="' + (it.icon || 'ri-check-line') + '"></i> ' + it.label + '</label>';
    }).join('');
    return '<div class="wiz-checks' + (mod ? ' ' + mod : '') + '">' + html + '</div>';
  }
  function radioGrid(name, items, mod) {
    var html = items.map(function (it, i) {
      return '<label' + (i === 0 ? ' class="active"' : '') + '><input type="radio" name="' + name + '" value="' + (it.v || it.l) + '"' + (i === 0 ? ' checked' : '') + ' /><span class="rt">' + it.l + '</span>' + (it.s ? '<span class="rs">' + it.s + '</span>' : '') + '</label>';
    }).join('');
    return '<div class="wiz-radio-grid' + (mod ? ' ' + mod : '') + '">' + html + '</div>';
  }

  // ---------- Wizard schemas ----------
  var COUNTRIES = ['🇬🇭 Ghana', '🇺🇸 United States', '🇳🇬 Nigeria', '🇰🇪 Kenya', '🇿🇦 South Africa'];
  var CURRENCIES = ['USD $', 'GHS ₵', 'NGN ₦', 'KES KSh', 'ZAR R'];

  var SCHEMAS = {

    // ==================== SITE ====================
    site: {
      eyebrow: 'New site',
      brandTi: 'Register a site',
      brandSb: 'Sites are master developments — communities, estates, gated subdivisions. Lots and houses are added under a site.',
      icon: 'ri-map-2-line',
      label: 'site',
      doneTi: 'Site is live 🎉',
      doneCopy: 'Your site has been created. You can now add lots and houses under it from the inventory tab.',
      summaryFn: function () {
        return [
          ['Name', 'Sunridge Estate'],
          ['Code', 'SR-001'],
          ['Location', 'Accra, Ghana'],
          ['Total area', '12.5 ha · 480 lots planned']
        ];
      },
      steps: [
        {
          label: 'Identity', desc: 'Name, code, status',
          ti: 'Identify the site', sb: 'Give the development a name and a short internal code your team will use everywhere.',
          html: function () { return [
            row([
              field({ kind: 'input', label: 'Site name', placeholder: 'Sunridge Estate', required: true }),
              field({ kind: 'input', label: 'Internal code', placeholder: 'SR-001', required: true, hint: 'Short ID used in URLs and reports.' })
            ]),
            field({ kind: 'select', label: 'Status',
              options: [{ v: 'planning', l: 'Planning' }, { v: 'selling', l: 'Selling', selected: true }, { v: 'completed', l: 'Completed' }, { v: 'paused', l: 'Paused' }, { v: 'archived', l: 'Archived' }] }),
            field({ kind: 'select', label: 'Site type',
              options: [{ v: 'residential', l: 'Residential community', selected: true }, { v: 'mixed', l: 'Mixed-use development' }, { v: 'commercial', l: 'Commercial park' }, { v: 'industrial', l: 'Industrial estate' }, { v: 'agricultural', l: 'Agricultural / farm scheme' }] }),
            field({ kind: 'textarea', label: 'Tagline / short description', placeholder: 'A 480-lot hilltop community 25 min from downtown Accra.', optional: true })
          ].join(''); }
        },
        {
          label: 'Location', desc: 'Address, GPS',
          ti: 'Where is the site?', sb: "Used for the public listing map and for nearby-customer search.",
          html: function () { return [
            row([
              field({ kind: 'select', label: 'Country', options: COUNTRIES, required: true }),
              field({ kind: 'input', label: 'Region / state', placeholder: 'Greater Accra', required: true })
            ]),
            row([
              field({ kind: 'input', label: 'City / town', placeholder: 'Accra', required: true }),
              field({ kind: 'input', label: 'Postal / ZIP code', placeholder: 'GA-123-4567', optional: true })
            ]),
            field({ kind: 'input', label: 'Street address', placeholder: 'Hilltop Road, off Spintex Highway' }),
            row([
              field({ kind: 'input', label: 'Latitude', placeholder: '5.6037', inputmode: 'decimal', optional: true }),
              field({ kind: 'input', label: 'Longitude', placeholder: '-0.1870', inputmode: 'decimal', optional: true })
            ]),
            field({ kind: 'textarea', label: 'Directions / landmark notes', placeholder: 'Past the new market, take the second left after Shell.', optional: true, rows: 2 })
          ].join(''); }
        },
        {
          label: 'Specifications', desc: 'Area, units, phases',
          ti: 'Site specifications', sb: 'Capacity and milestones — these drive the site dashboard tiles.',
          html: function () { return [
            section('Area & capacity'),
            row([
              field({ kind: 'input', label: 'Total area', value: '12.5', suffix: 'hectares', type: 'number', step: '0.01', inputmode: 'decimal', required: true }),
              field({ kind: 'input', label: 'Total units planned', value: '480', suffix: 'lots / units', type: 'number', step: '1' })
            ]),
            row([
              field({ kind: 'input', label: 'Number of phases', value: '3', type: 'number', step: '1' }),
              field({ kind: 'input', label: 'Units in current phase', value: '160', suffix: 'lots / units', type: 'number', step: '1' })
            ]),
            section('Timeline'),
            row([
              field({ kind: 'date', label: 'Project start date', optional: true }),
              field({ kind: 'date', label: 'Projected completion', optional: true })
            ]),
            row([
              field({ kind: 'date', label: 'Sales launch date', optional: true }),
              field({ kind: 'select', label: 'Title status',
                options: [{ v: 'registered', l: 'Registered — title vested' }, { v: 'in-progress', l: 'Registration in progress' }, { v: 'unregistered', l: 'Not yet registered' }] })
            ])
          ].join(''); }
        },
        {
          label: 'Media & visibility', desc: 'Cover, brochure',
          ti: 'Media & visibility', sb: 'Images and documents shown on the public site listing.',
          html: function () { return [
            '<div class="wiz-cover-up"><div class="wiz-cover-preview"><i class="ri-map-2-line"></i></div><div><div class="ti">Cover image</div><div class="sb">Wide aerial or render. JPG / PNG, 1600×900 minimum. Used as the site hero on listings and marketing.</div><button class="upload-btn" type="button"><i class="ri-upload-2-line"></i> Upload cover</button></div></div>',
            field({ kind: 'input', label: 'Brochure / fact sheet (PDF)', placeholder: 'Drop a PDF or click upload', optional: true }),
            field({ kind: 'select', label: 'Visibility',
              options: [{ v: 'public', l: 'Public — listed on cozistack.com', selected: true }, { v: 'unlisted', l: 'Unlisted — internal team only' }, { v: 'preview', l: 'Preview — visible to invited prospects via link' }] }),
            field({ kind: 'input', label: 'Public URL slug', prefix: 'cozistack.com/', placeholder: 'sunridge-estate', optional: true, hint: 'Auto-generated from the site name. Edit if you want a custom URL.' })
          ].join(''); }
        }
      ]
    },

    // ==================== LAND ====================
    land: {
      eyebrow: 'New land plot',
      brandTi: 'Register a land plot',
      brandSb: 'A single buyable parcel inside a site (or stand-alone). Captures dimensions, title, and pricing.',
      icon: 'ri-landscape-line',
      label: 'land plot',
      doneTi: 'Plot listed ✓',
      doneCopy: 'The land plot is now visible to your team. Photos and the title certificate can be uploaded from the plot detail page.',
      summaryFn: function () {
        return [
          ['Plot ID', 'HL-009'],
          ['Site', 'Sunridge Estate'],
          ['Area', '480 m²'],
          ['List price', '$48,500']
        ];
      },
      steps: [
        {
          label: 'Identity', desc: 'Plot ID, site, status',
          ti: 'Identify the plot', sb: "Plot ID will appear on contracts, statements, and the public listing.",
          html: function () { return [
            row([
              field({ kind: 'input', label: 'Plot ID / reference', placeholder: 'HL-009', required: true }),
              field({ kind: 'select', label: 'Parent site', required: true,
                options: [{ v: '', l: 'Standalone (no parent site)', disabled: true }, { v: 'sunridge', l: 'Sunridge Estate', selected: true }, { v: 'hilltop', l: 'Hilltop Phase II' }, { v: 'oakwood', l: 'Oakwood Park' }] })
            ]),
            row([
              field({ kind: 'input', label: 'Block / phase', placeholder: 'Block C · Phase 2' }),
              field({ kind: 'input', label: 'Plot number', placeholder: '09' })
            ]),
            section('Status'),
            radioGrid('land-status', [
              { l: 'Available', s: 'Ready for sale or reservation', v: 'available' },
              { l: 'Reserved', s: 'Held by a customer (deposit may be paid)', v: 'reserved' },
              { l: 'Sold', s: 'Closed — title transferred to buyer', v: 'sold' }
            ])
          ].join(''); }
        },
        {
          label: 'Location', desc: 'Address, coordinates',
          ti: 'Plot location', sb: "If the plot is inside a registered site, address fields auto-fill from the site profile.",
          html: function () { return [
            row([
              field({ kind: 'select', label: 'Country', options: COUNTRIES, required: true }),
              field({ kind: 'input', label: 'Region / state', placeholder: 'Greater Accra' })
            ]),
            row([
              field({ kind: 'input', label: 'City / town', placeholder: 'Accra' }),
              field({ kind: 'input', label: 'Neighbourhood / district', placeholder: 'Spintex' })
            ]),
            field({ kind: 'input', label: 'Street / approach road', placeholder: 'Hilltop Road, off Spintex Highway' }),
            row([
              field({ kind: 'input', label: 'Latitude', placeholder: '5.6037', inputmode: 'decimal' }),
              field({ kind: 'input', label: 'Longitude', placeholder: '-0.1870', inputmode: 'decimal' })
            ])
          ].join(''); }
        },
        {
          label: 'Specifications', desc: 'Area, dimensions, terrain',
          ti: 'Plot specifications', sb: 'Dimensions and characteristics shown on the public listing.',
          html: function () { return [
            section('Area & dimensions'),
            row([
              field({ kind: 'input', label: 'Plot area', value: '480', suffix: 'm²', type: 'number', step: '0.01', inputmode: 'decimal', required: true }),
              field({ kind: 'input', label: 'Frontage', value: '20', suffix: 'm', type: 'number', step: '0.1', inputmode: 'decimal', hint: 'Width along the road.' })
            ]),
            row([
              field({ kind: 'input', label: 'Depth', value: '24', suffix: 'm', type: 'number', step: '0.1', inputmode: 'decimal' }),
              field({ kind: 'select', label: 'Shape',
                options: [{ v: 'rect', l: 'Rectangular', selected: true }, { v: 'square', l: 'Square' }, { v: 'l', l: 'L-shaped' }, { v: 'irregular', l: 'Irregular' }, { v: 'corner', l: 'Corner plot' }] })
            ]),
            section('Terrain & use'),
            row([
              field({ kind: 'select', label: 'Terrain',
                options: [{ v: 'flat', l: 'Flat', selected: true }, { v: 'gentle', l: 'Gentle slope' }, { v: 'steep', l: 'Steep slope' }, { v: 'hilltop', l: 'Hilltop' }, { v: 'waterfront', l: 'Waterfront' }] }),
              field({ kind: 'select', label: 'Permitted use',
                options: [{ v: 'residential', l: 'Residential', selected: true }, { v: 'commercial', l: 'Commercial' }, { v: 'mixed', l: 'Mixed-use' }, { v: 'agricultural', l: 'Agricultural' }, { v: 'industrial', l: 'Industrial' }] })
            ]),
            field({ kind: 'input', label: 'Zoning / planning code', placeholder: 'R1 · single-family residential', optional: true })
          ].join(''); }
        },
        {
          label: 'Title & utilities', desc: 'Documents, services',
          ti: 'Title & utilities', sb: 'Drives the buyer-confidence pills shown on the listing.',
          html: function () { return [
            section('Title'),
            row([
              field({ kind: 'select', label: 'Title status',
                options: [{ v: 'registered', l: 'Registered — vested in seller', selected: true }, { v: 'in-progress', l: 'Registration in progress' }, { v: 'leasehold', l: 'Leasehold' }, { v: 'customary', l: 'Customary / family title' }, { v: 'unregistered', l: 'Unregistered' }] }),
              field({ kind: 'input', label: 'Title / certificate number', placeholder: 'GHA-LT-2024-00211', optional: true })
            ]),
            field({ kind: 'textarea', label: 'Encumbrances / disputes', placeholder: 'None known.', rows: 2, hint: 'Any claims, liens, caveats, or boundary disputes the legal team has flagged.' }),
            section('Utilities & access on plot'),
            checks([
              { icon: 'ri-flashlight-line', label: 'Electricity (ECG)' },
              { icon: 'ri-drop-line', label: 'Water mains' },
              { icon: 'ri-wifi-line', label: 'Fibre / internet' },
              { icon: 'ri-recycle-line', label: 'Sewage / septic' },
              { icon: 'ri-road-map-line', label: 'Tarred road access' },
              { icon: 'ri-shield-check-line', label: 'Gated security' }
            ], 'three')
          ].join(''); }
        },
        {
          label: 'Pricing & financing', desc: 'List price, deposit',
          ti: 'Pricing & financing', sb: 'How this plot will be sold. You can override per-deal later.',
          html: function () { return [
            section('Sale price'),
            row([
              field({ kind: 'select', label: 'Currency',
                options: CURRENCIES.map(function (c) { return { v: c.split(' ')[0], l: c, selected: c.indexOf('USD') === 0 }; }) }),
              field({ kind: 'input', label: 'List price', value: '48500', suffix: 'USD', type: 'number', step: '0.01', inputmode: 'decimal', required: true })
            ]),
            field({ kind: 'input', label: 'Price per m² (auto)', value: '101.04', suffix: 'USD / m²', type: 'number', step: '0.01', inputmode: 'decimal', hint: 'Computed from list price ÷ area. Edit to override.' }),
            section('Financing offer'),
            row([
              field({ kind: 'select', label: 'Default loan product',
                options: [{ v: 'none', l: 'Not financed — cash only' }, { v: 'hilltop', l: 'Hilltop Plan · 12-yr · 9.5%', selected: true }, { v: 'standard', l: 'Standard Land · 15-yr · 9.5%' }, { v: 'fast', l: 'Fast Land · 5-yr · 8%' }] }),
              field({ kind: 'input', label: 'Required deposit', value: '10', suffix: '% of list', type: 'number', step: '0.5', inputmode: 'decimal' })
            ]),
            field({ kind: 'input', label: 'Reservation hold', value: '60', suffix: 'days', type: 'number', step: '1', hint: 'How long a reservation is held after deposit before the plot returns to market.' })
          ].join(''); }
        }
      ]
    },

    // ==================== HOUSE ====================
    house: {
      eyebrow: 'New house',
      brandTi: 'Register a house',
      brandSb: "Single dwelling — villa, townhouse, apartment, or other built unit. Captures layout, features, and pricing.",
      icon: 'ri-home-4-line',
      label: 'house',
      doneTi: 'House listed ✓',
      doneCopy: "The house is in your inventory. Add photos and the floor plan from the listing's media tab to complete the public profile.",
      summaryFn: function () {
        return [
          ['Listing', '14B · Sunridge'],
          ['Type', 'Detached · 4 BR'],
          ['Built area', '210 m²'],
          ['List price', '$185,000']
        ];
      },
      steps: [
        {
          label: 'Identity', desc: 'Address, type, status',
          ti: 'Identify the house', sb: "What is it, where is it, and is it ready to show?",
          html: function () { return [
            row([
              field({ kind: 'input', label: 'Listing title', placeholder: 'Sunridge · Villa 14B', required: true }),
              field({ kind: 'input', label: 'Internal code', placeholder: 'SR-V14B', required: true })
            ]),
            row([
              field({ kind: 'select', label: 'Parent site', optional: true,
                options: [{ v: '', l: 'Standalone (no parent site)', selected: true }, { v: 'sunridge', l: 'Sunridge Estate' }, { v: 'oakwood', l: 'Oakwood Park' }] }),
              field({ kind: 'input', label: 'Unit / house number', placeholder: '14B', optional: true })
            ]),
            section('Property type'),
            radioGrid('house-type', [
              { l: 'Detached villa', s: 'Standalone single-family home', v: 'detached' },
              { l: 'Semi-detached', s: 'Shared wall with one neighbour', v: 'semi' },
              { l: 'Townhouse', s: 'Row / terrace house', v: 'town' },
              { l: 'Apartment', s: 'Flat in a multi-unit building', v: 'apt' },
              { l: 'Duplex', s: 'Two units, one above the other', v: 'duplex' },
              { l: 'Bungalow', s: 'Single-storey home', v: 'bungalow' }
            ]),
            section('Status'),
            radioGrid('house-status', [
              { l: 'Available', s: 'Ready to show & sell', v: 'available' },
              { l: 'Off-plan', s: 'Selling before completion', v: 'offplan' },
              { l: 'Reserved', s: 'Held by a customer', v: 'reserved' }
            ])
          ].join(''); }
        },
        {
          label: 'Location', desc: 'Address, coordinates',
          ti: 'House location', sb: "Used for nearby-customer search and map listings.",
          html: function () { return [
            row([
              field({ kind: 'select', label: 'Country', options: COUNTRIES, required: true }),
              field({ kind: 'input', label: 'Region / state', placeholder: 'Greater Accra' })
            ]),
            row([
              field({ kind: 'input', label: 'City / town', placeholder: 'Accra' }),
              field({ kind: 'input', label: 'Neighbourhood', placeholder: 'East Legon' })
            ]),
            field({ kind: 'input', label: 'Street address', placeholder: '12 Lagos Avenue, East Legon', required: true }),
            row([
              field({ kind: 'input', label: 'Latitude', placeholder: '5.6037', inputmode: 'decimal' }),
              field({ kind: 'input', label: 'Longitude', placeholder: '-0.1870', inputmode: 'decimal' })
            ])
          ].join(''); }
        },
        {
          label: 'Layout', desc: 'Bedrooms, sizes',
          ti: 'Layout & dimensions', sb: 'Drives the headline specs on the listing card.',
          html: function () { return [
            section('Rooms'),
            row([
              field({ kind: 'input', label: 'Bedrooms', value: '4', suffix: 'BR', type: 'number', step: '1', required: true }),
              field({ kind: 'input', label: 'Bathrooms', value: '3', suffix: 'BA', type: 'number', step: '0.5', required: true })
            ], 'three'),
            row([
              field({ kind: 'input', label: 'Floors', value: '2', suffix: 'storeys', type: 'number', step: '1' }),
              field({ kind: 'input', label: 'Parking spaces', value: '2', suffix: 'cars', type: 'number', step: '1' })
            ]),
            section('Sizes'),
            row([
              field({ kind: 'input', label: 'Built area', value: '210', suffix: 'm²', type: 'number', step: '0.5', inputmode: 'decimal', required: true }),
              field({ kind: 'input', label: 'Plot area', value: '480', suffix: 'm²', type: 'number', step: '0.5', inputmode: 'decimal', hint: 'Total land the house sits on.' })
            ]),
            row([
              field({ kind: 'input', label: 'Year built', value: '2024', type: 'number', step: '1' }),
              field({ kind: 'select', label: 'Condition',
                options: [{ v: 'new', l: 'New build', selected: true }, { v: 'excellent', l: 'Excellent' }, { v: 'good', l: 'Good' }, { v: 'fair', l: 'Needs minor work' }, { v: 'renovate', l: 'Needs renovation' }] })
            ])
          ].join(''); }
        },
        {
          label: 'Features', desc: 'Furnishing, amenities',
          ti: 'Features & amenities', sb: 'Tick everything the buyer gets. Shows up as pills on the public listing.',
          html: function () { return [
            section('Furnishing'),
            radioGrid('furnish', [
              { l: 'Unfurnished', s: 'Bare unit', v: 'none' },
              { l: 'Semi-furnished', s: 'Kitchen + fixtures', v: 'semi' },
              { l: 'Fully furnished', s: 'Move-in ready', v: 'full' }
            ]),
            section('Amenities'),
            checks([
              { icon: 'ri-water-flash-line', label: 'Swimming pool' },
              { icon: 'ri-plant-line', label: 'Garden / lawn' },
              { icon: 'ri-shield-line', label: '24/7 security' },
              { icon: 'ri-snowflake-line', label: 'Air conditioning' },
              { icon: 'ri-sun-line', label: 'Solar / inverter' },
              { icon: 'ri-flashlight-line', label: 'Backup generator' },
              { icon: 'ri-gas-station-line', label: 'Gas connection' },
              { icon: 'ri-wifi-line', label: 'Fibre internet' },
              { icon: 'ri-camera-line', label: 'CCTV' }
            ], 'three'),
            section('Community'),
            row([
              field({ kind: 'input', label: 'HOA / service charge', value: '0', suffix: 'USD / month', type: 'number', step: '0.01', inputmode: 'decimal' }),
              field({ kind: 'select', label: 'Pets',
                options: [{ v: 'allowed', l: 'Allowed', selected: true }, { v: 'restricted', l: 'Restricted (size / breed)' }, { v: 'no', l: 'Not allowed' }] })
            ])
          ].join(''); }
        },
        {
          label: 'Pricing & financing', desc: 'Price, deposit',
          ti: 'Pricing & financing', sb: 'How this house will be sold.',
          html: function () { return [
            section('Sale price'),
            row([
              field({ kind: 'select', label: 'Currency',
                options: CURRENCIES.map(function (c) { return { v: c.split(' ')[0], l: c, selected: c.indexOf('USD') === 0 }; }) }),
              field({ kind: 'input', label: 'List price', value: '185000', suffix: 'USD', type: 'number', step: '0.01', inputmode: 'decimal', required: true })
            ]),
            row([
              field({ kind: 'input', label: 'Price per m² (built)', value: '881', suffix: 'USD / m²', type: 'number', step: '0.01', inputmode: 'decimal' }),
              field({ kind: 'input', label: 'Negotiable margin', value: '5', suffix: '% off', type: 'number', step: '0.5' })
            ]),
            section('Financing offer'),
            row([
              field({ kind: 'select', label: 'Default loan product',
                options: [{ v: 'none', l: 'Not financed — cash only' }, { v: 'res-30', l: 'Residential · 30-yr · 9.5%', selected: true }, { v: 'res-20', l: 'Residential · 20-yr · 9.0%' }, { v: 'flex', l: 'Flex Mortgage · 25-yr · variable' }] }),
              field({ kind: 'input', label: 'Required deposit', value: '20', suffix: '% of list', type: 'number', step: '0.5', inputmode: 'decimal' })
            ])
          ].join(''); }
        }
      ]
    },

    // ==================== EXISTING LOAN ACCOUNT ====================
    loan: {
      eyebrow: 'Migrate loan',
      brandTi: 'Register an existing loan',
      brandSb: 'Bring an active loan you originated elsewhere onto Ream. Captures the contract, paid-to-date totals, schedule position, and a reconciliation gate so the migrated balance matches your legacy system exactly.',
      icon: 'ri-bank-line',
      label: 'loan account',
      doneTi: 'Loan account migrated ✓',
      doneCopy: 'Reconciliation passed within tolerance. The loan is now in your portfolio, billed off the current installment, and future payments will continue from where the legacy system left off.',
      summaryFn: function () {
        return [
          ['Legacy ID', 'LX-2019-00471'],
          ['Borrower', 'Anna Thompson (member #9001)'],
          ['As-of', 'May 11, 2026'],
          ['Outstanding (principal)', '$134,659.82'],
          ['Payoff (computed)', '$164,549.40'],
          ['Reconciliation', '✓ Within tolerance ($0.00 / 0 bp)']
        ];
      },
      steps: [
        {
          label: 'Source & cutover', desc: 'Legacy IDs, as-of date',
          ti: 'Source system & cutover', sb: "Where the loan is being migrated from. The as-of date locks the snapshot — every total below is computed up to and including that day.",
          html: function () { return [
            section('Legacy source'),
            row([
              field({ kind: 'input', label: 'Legacy loan ID', placeholder: 'LX-2019-00471', value: 'LX-2019-00471', required: true, hint: 'Opaque string from your prior LOS. Appears on contracts and statements alongside the new Ream loan ID.' }),
              field({ kind: 'select', label: 'Source system', required: true,
                options: [{ v: 'acmelos:3.4', l: 'AcmeLOS · v3.4', selected: true }, { v: 'mortgagebot:8.2', l: 'MortgageBot · v8.2' }, { v: 'encompass:21.3', l: 'Encompass · v21.3' }, { v: 'custom', l: 'Custom / in-house' }, { v: 'spreadsheet', l: 'Spreadsheet / manual' }] })
            ]),
            row([
              field({ kind: 'input', label: 'Import batch', placeholder: 'batch-2026-05-11-001', value: 'batch-2026-05-11-001', hint: 'Groups co-imported loans for rollback if anything goes wrong.' }),
              field({ kind: 'date', label: 'As-of date', value: '2026-05-11', required: true, hint: 'Cutover date (UTC). All balances and DPD are evaluated as of midnight UTC on this day.' })
            ]),
            section('Audit trail'),
            row([
              field({ kind: 'input', label: 'Idempotency key', value: 'import:LX-2019-00471:2026-05-11', required: true, hint: 'Replays with the same key are silently ignored. Auto-built from legacy ID + as-of date.' }),
              field({ kind: 'input', label: 'Imported by', value: 'ops-ana (membership #17)', hint: 'Auto-filled from your session.' })
            ]),
            field({ kind: 'input', label: 'Source fingerprint', placeholder: 'sha256:…', value: 'sha256:b41c…d9f2', hint: 'SHA-256 of the legacy export row. Auto-computed when you upload the source file — flags drift if the same legacy ID is re-imported with different content.' }),
            field({ kind: 'textarea', label: 'Import note', placeholder: 'Migrated from AcmeLOS go-live wave 2.', value: 'Migrated from AcmeLOS go-live wave 2', rows: 2, optional: true })
          ].join(''); }
        },
        {
          label: 'Parties & product', desc: 'Borrower, collateral, product',
          ti: 'Parties & product', sb: 'Link the loan to existing records in Ream — the buyer member, the financed site, and the loan product if one applies.',
          html: function () { return [
            section('Contract linkage'),
            radioGrid('contract-mode', [
              { l: 'Create new contract', s: 'Build a fresh contract record from these terms (default)', v: 'create' },
              { l: 'Attach to existing contract', s: 'Reuse a draft contract already in Ream (provide its ID)', v: 'attach' }
            ], 'two'),
            field({ kind: 'input', label: 'Contract ID hint', placeholder: 'Only if attaching to an existing contract', optional: true, hint: 'Leave blank to create. If provided, the loan will be attached to this contract instead.' }),
            section('Parties'),
            row([
              field({ kind: 'select', label: 'Buyer (member)', required: true,
                options: [{ v: '9001', l: 'Anna Thompson · member #9001', selected: true }, { v: '9018', l: 'Marcus Owusu · #9018' }, { v: '9027', l: 'Sade Bankole · #9027' }, { v: 'new', l: 'Create new member…' }],
                hint: 'Borrower of record. Sets buyerMemberId on the contract.' }),
              field({ kind: 'input', label: 'Imported buyer KYC status', value: 'Verified · 2024-02-11', hint: 'Carried over from the legacy export; not editable here. Update on the member profile if stale.' })
            ]),
            section('Collateral & product'),
            row([
              field({ kind: 'select', label: 'Site (collateral)', required: true,
                options: [{ v: '310', l: 'Sunridge · Plot 09 · site #310', selected: true }, { v: '311', l: 'Sunridge · Villa 14B · #311' }, { v: '420', l: 'Oakwood · Plot 22 · #420' }, { v: 'none', l: 'Not linked to a site' }],
                hint: 'Property the loan is secured against. Sets siteId.' }),
              field({ kind: 'select', label: 'Loan product (Ream-side)', optional: true,
                options: [{ v: '7', l: 'Hilltop Plan · 15-yr · fixed', selected: true }, { v: '8', l: 'Standard Land · 15-yr · fixed' }, { v: '9', l: 'Flex Mortgage · 25-yr · variable' }, { v: 'none', l: 'No matching product — bespoke' }],
                hint: 'Optional. Sets loanProductId for downstream reporting and templates.' })
            ])
          ].join(''); }
        },
        {
          label: 'Contract terms', desc: 'Principal, rate, schedule',
          ti: 'Contract terms', sb: 'The loan as it was signed — these values become the immutable contract snapshot.',
          html: function () { return [
            section('Dates & schedule'),
            row([
              field({ kind: 'date', label: 'Origination date', value: '2019-03-15', required: true, hint: 'When the loan started.' }),
              field({ kind: 'date', label: 'First payment date', value: '2019-04-15', required: true })
            ]),
            row([
              field({ kind: 'date', label: 'Last payment date', value: '2034-03-15', required: true, hint: 'Final scheduled installment.' }),
              field({ kind: 'input', label: 'Payment day', value: '15', type: 'number', step: '1', min: '1', suffix: 'of month', required: true })
            ]),
            field({ kind: 'input', label: 'Loan term', value: '180', suffix: 'months', type: 'number', step: '1', required: true }),
            section('Principal'),
            row([
              field({ kind: 'select', label: 'Currency', required: true,
                options: CURRENCIES.map(function (c) { return { v: c.split(' ')[0], l: c, selected: c.indexOf('USD') === 0 }; }) }),
              field({ kind: 'input', label: 'Total amount', value: '240000.00', suffix: 'USD', type: 'number', step: '0.01', inputmode: 'decimal', required: true, hint: 'Full loan amount at origination.' })
            ]),
            field({ kind: 'input', label: 'Down payment at origination', value: '48000.00', suffix: 'USD', type: 'number', step: '0.01', inputmode: 'decimal', required: true }),
            section('Rate'),
            row([
              field({ kind: 'input', label: 'Annual interest rate', value: '6.250', suffix: '% APR', type: 'number', step: '0.001', inputmode: 'decimal', required: true, hint: 'Stored as decimal (6.25% → 0.0625).' }),
              field({ kind: 'select', label: 'Interest method', required: true,
                options: [
                  { v: 'FIXED_ACTUARIAL', l: 'Fixed · Actuarial (US Rule)', selected: true },
                  { v: 'FIXED_FRENCH',    l: 'Fixed · French / Equal-installment' },
                  { v: 'FIXED_SIMPLE',    l: 'Fixed · Simple interest' },
                  { v: 'FIXED_ADD_ON',    l: 'Fixed · Add-on interest' },
                  { v: 'VARIABLE_INDEX',  l: 'Variable · Indexed' }
                ] })
            ]),
            field({ kind: 'select', label: 'Day-count convention', required: true,
              options: [
                { v: '30_360',          l: '30/360 (US bond)', selected: true },
                { v: 'ACTUAL_360',      l: 'Actual/360' },
                { v: 'ACTUAL_365',      l: 'Actual/365 (fixed)' },
                { v: 'ACTUAL_ACTUAL',   l: 'Actual/Actual (ISDA)' }
              ] }),
            section('Periodic amounts'),
            row([
              field({ kind: 'input', label: 'Monthly payment (P+I)', value: '1648.27', suffix: 'USD', type: 'number', step: '0.01', inputmode: 'decimal', required: true }),
              field({ kind: 'input', label: 'Monthly escrow', value: '182.50', suffix: 'USD', type: 'number', step: '0.01', inputmode: 'decimal', hint: 'Taxes + insurance held in escrow. Zero if not escrowed.' })
            ])
          ].join(''); }
        },
        {
          label: 'Late-fee policy', desc: 'Fees, grace, frequency',
          ti: 'Late-fee policy', sb: 'How and when overdue installments accrue fees. Toggle off if the loan has no late-fee terms.',
          onMount: function (scope) {
            function refresh() {
              var on = scope.querySelector('input[name="late-enabled"]:checked');
              var enabled = (on && on.value) === 'on';
              scope.querySelectorAll('[data-late-only]').forEach(function (el) {
                el.style.display = enabled ? '' : 'none';
              });
            }
            scope.querySelectorAll('input[name="late-enabled"]').forEach(function (r) { r.addEventListener('change', refresh); });
            scope.querySelectorAll('.wiz-radio-grid label').forEach(function (lbl) {
              lbl.addEventListener('click', function () { setTimeout(refresh, 0); });
            });
            refresh();
          },
          html: function () { return [
            radioGrid('late-enabled', [
              { l: 'Late fees enabled', s: 'Overdue installments accrue a fee', v: 'on' },
              { l: 'No late fees', s: 'Loan has no late-fee terms', v: 'off' }
            ], 'two'),
            '<div data-late-only>' +
              section('Fee terms') +
              row([
                field({ kind: 'select', label: 'Method', required: true,
                  options: [
                    { v: 'FLAT',       l: 'Flat amount per overdue installment', selected: true },
                    { v: 'PERCENT_OF_INSTALLMENT', l: '% of the overdue installment' },
                    { v: 'PERCENT_OF_OVERDUE',     l: '% of the overdue balance' }
                  ] }),
                field({ kind: 'input', label: 'Flat amount', value: '50.00', suffix: 'USD', type: 'number', step: '0.01', inputmode: 'decimal', required: true })
              ]) +
              row([
                field({ kind: 'input', label: 'Grace period', value: '10', suffix: 'days', type: 'number', step: '1', required: true, hint: 'Days after due date before a fee is assessed.' }),
                field({ kind: 'select', label: 'Assessment frequency', required: true,
                  options: [
                    { v: 'ONCE_PER_OVERDUE_INSTALLMENT', l: 'Once per overdue installment', selected: true },
                    { v: 'MONTHLY_WHILE_OVERDUE',        l: 'Monthly while overdue' },
                    { v: 'DAILY_WHILE_OVERDUE',          l: 'Daily while overdue' }
                  ] })
              ]) +
              field({ kind: 'select', label: 'Backdate to historical arrears?',
                options: [
                  { v: 'true',  l: 'Yes — apply this policy from the as-of date forward only', selected: true },
                  { v: 'false', l: 'No — historical fees already captured in cumulative paid below' }
                ], hint: 'When ON, Ream only assesses new fees after the cutover. When OFF, any historical late fees must already be reflected in the paid-to-date totals.' }) +
            '</div>'
          ].join(''); }
        },
        {
          label: 'Paid to date', desc: 'Cumulative totals',
          ti: 'Cumulative paid totals (as-of date)', sb: "Every dollar the borrower has paid against this loan up to and including the as-of date, broken out by what the legacy system allocated it to. These totals feed the borrower's history and tax statements.",
          html: function () { return [
            section('Allocated to'),
            row([
              field({ kind: 'input', label: 'Principal', value: '57340.18', suffix: 'USD', type: 'number', step: '0.01', inputmode: 'decimal', required: true }),
              field({ kind: 'input', label: 'Interest', value: '62110.42', suffix: 'USD', type: 'number', step: '0.01', inputmode: 'decimal', required: true })
            ]),
            row([
              field({ kind: 'input', label: 'Escrow', value: '15330.00', suffix: 'USD', type: 'number', step: '0.01', inputmode: 'decimal' }),
              field({ kind: 'input', label: 'Late fees', value: '150.00', suffix: 'USD', type: 'number', step: '0.01', inputmode: 'decimal' })
            ]),
            section('Adjustments'),
            row([
              field({ kind: 'input', label: 'Declared write-offs', value: '0.00', suffix: 'USD', type: 'number', step: '0.01', inputmode: 'decimal', hint: 'Principal written down on the legacy side.' }),
              field({ kind: 'input', label: 'Declared waivers', value: '0.00', suffix: 'USD', type: 'number', step: '0.01', inputmode: 'decimal', hint: 'Fees or interest formally waived.' })
            ]),
            field({ kind: 'input', label: 'Carry-over credit', value: '75.32', suffix: 'USD', type: 'number', step: '0.01', inputmode: 'decimal', hint: 'Unallocated cash sitting on the loan — applied to the next installment.' })
          ].join(''); }
        },
        {
          label: 'Schedule & delinquency', desc: 'Current installment, DPD',
          ti: 'Schedule position & delinquency', sb: 'Where the borrower sits in the amortization schedule on the as-of date, and how delinquent they are (if at all). Drives the next-due reminders and DPD reporting.',
          html: function () { return [
            section('Schedule position'),
            row([
              field({ kind: 'input', label: 'Fully-paid installments', value: '84', suffix: 'of 180', type: 'number', step: '1', required: true, hint: 'Historical scheduler depth — how many periods are closed.' }),
              field({ kind: 'input', label: 'Current installment #', value: '85', type: 'number', step: '1', required: true, hint: '1-based. The installment due on the as-of date.' })
            ]),
            row([
              field({ kind: 'date', label: 'Current installment due', value: '2026-05-15', required: true }),
              field({ kind: 'date', label: 'Next installment due', value: '2026-06-15', required: true, hint: 'Sanity check on cadence.' })
            ]),
            section('Current installment expected (P / I / E / fee)'),
            row([
              field({ kind: 'input', label: 'Principal', value: '850.13', suffix: 'USD', type: 'number', step: '0.01', inputmode: 'decimal' }),
              field({ kind: 'input', label: 'Interest', value: '798.14', suffix: 'USD', type: 'number', step: '0.01', inputmode: 'decimal' })
            ]),
            row([
              field({ kind: 'input', label: 'Escrow', value: '182.50', suffix: 'USD', type: 'number', step: '0.01', inputmode: 'decimal' }),
              field({ kind: 'input', label: 'Late fee', value: '0.00', suffix: 'USD', type: 'number', step: '0.01', inputmode: 'decimal' })
            ]),
            section('Already paid against current installment (partial)'),
            row([
              field({ kind: 'input', label: 'Total paid', value: '0.00', suffix: 'USD', type: 'number', step: '0.01', inputmode: 'decimal', hint: 'Leave at 0 if the current installment is fully unpaid.' }),
              field({ kind: 'input', label: 'Principal portion', value: '0.00', suffix: 'USD', type: 'number', step: '0.01', inputmode: 'decimal' })
            ]),
            row([
              field({ kind: 'input', label: 'Interest portion', value: '0.00', suffix: 'USD', type: 'number', step: '0.01', inputmode: 'decimal' }),
              field({ kind: 'input', label: 'Escrow / late fee portion', value: '0.00', suffix: 'USD', type: 'number', step: '0.01', inputmode: 'decimal' })
            ]),
            section('Delinquency snapshot'),
            row([
              field({ kind: 'input', label: 'Current DPD', value: '0', suffix: 'days', type: 'number', step: '1', required: true, hint: 'Days past due from earliest unpaid installment.' }),
              field({ kind: 'input', label: 'Worst DPD ever', value: '27', suffix: 'days', type: 'number', step: '1', hint: 'Monotonic high-water mark across the loan lifetime.' })
            ]),
            row([
              field({ kind: 'date', label: 'Last payment date', value: '2026-04-15', required: true }),
              field({ kind: 'input', label: 'Last payment amount', value: '1830.77', suffix: 'USD', type: 'number', step: '0.01', inputmode: 'decimal', required: true })
            ]),
            row([
              field({ kind: 'select', label: 'In dispute?',
                options: [{ v: 'false', l: 'No', selected: true }, { v: 'true', l: 'Yes — active dispute' }] }),
              field({ kind: 'select', label: 'Forbearance?',
                options: [
                  { v: 'none',     l: 'None', selected: true },
                  { v: 'covid',    l: 'COVID-era forbearance' },
                  { v: 'hardship', l: 'Hardship program' },
                  { v: 'natural',  l: 'Natural disaster' },
                  { v: 'other',    l: 'Other' }
                ] })
            ]),
            field({ kind: 'date', label: 'Forbearance ends on', placeholder: 'Only if active', optional: true })
          ].join(''); }
        },
        {
          label: 'Reconciliation', desc: 'Expected balances & tolerance',
          ti: 'Reconciliation gate', sb: 'The legacy system\'s outstanding totals. Ream re-derives these from the contract terms + paid-to-date above and refuses the import if they disagree beyond the tolerance you set.',
          html: function () { return [
            section('Expected from legacy'),
            row([
              field({ kind: 'input', label: 'Outstanding principal', value: '134659.82', suffix: 'USD', type: 'number', step: '0.01', inputmode: 'decimal', required: true }),
              field({ kind: 'input', label: 'Outstanding interest', value: '29889.58', suffix: 'USD', type: 'number', step: '0.01', inputmode: 'decimal', required: true })
            ]),
            row([
              field({ kind: 'input', label: 'Outstanding escrow', value: '0.00', suffix: 'USD', type: 'number', step: '0.01', inputmode: 'decimal' }),
              field({ kind: 'input', label: 'Outstanding late fees', value: '0.00', suffix: 'USD', type: 'number', step: '0.01', inputmode: 'decimal' })
            ]),
            field({ kind: 'input', label: 'Total payoff amount', value: '164549.40', suffix: 'USD', type: 'number', step: '0.01', inputmode: 'decimal', required: true, hint: 'What the borrower would pay today to fully close the loan.' }),
            section('Tolerance'),
            row([
              field({ kind: 'input', label: 'Absolute tolerance', value: '0.50', suffix: 'USD', type: 'number', step: '0.01', inputmode: 'decimal', hint: 'Per-balance acceptable drift.' }),
              field({ kind: 'input', label: 'Relative tolerance', value: '1.0', suffix: 'bp (basis points)', type: 'number', step: '0.1', inputmode: 'decimal', hint: '1 bp = 0.01%. 0.0001 in the payload.' })
            ]),
            '<div style="display:flex; align-items:flex-start; gap:10px; padding:12px 14px; border:1px solid #c7d2fe; border-radius:9px; background:#eef2ff; color:#3730a3; margin-top:2px;"><i class="ri-shield-check-line" style="font-size:18px; flex:none; margin-top:1px;"></i><div style="min-width:0;"><div style="font:600 13px var(--font-sans); margin-bottom:2px;">Reconciliation is enforced server-side</div><div style="font:12.5px var(--font-sans); line-height:1.5; opacity:.92;">If Ream\'s re-derived outstanding values differ from the legacy totals above by more than the tolerance, the import fails atomically and nothing is written. Loosen the tolerance for legacy systems with known rounding quirks.</div></div></div>'
          ].join(''); }
        },
        {
          label: 'Documents', desc: 'Attachments',
          ti: 'Supporting documents', sb: 'Original contract, payoff statement, and any other paperwork. Each attachment is tied to the migrated loan and shows up in the loan\'s document tab.',
          html: function () { return [
            section('Required'),
            '<div class="wiz-cover-up"><div class="wiz-cover-preview"><i class="ri-file-paper-2-line"></i></div><div><div class="ti">Original contract</div><div class="sb">Signed loan agreement PDF. Becomes attachment category <code style="font:500 11.5px var(--font-mono); background:var(--bg2); padding:1px 5px; border-radius:4px;">ORIGINAL_CONTRACT</code>.</div><button class="upload-btn" type="button"><i class="ri-upload-2-line"></i> Upload contract</button></div></div>',
            '<div class="wiz-cover-up"><div class="wiz-cover-preview"><i class="ri-receipt-line"></i></div><div><div class="ti">Legacy payoff statement</div><div class="sb">Most recent payoff statement from the source system, dated on or after the as-of date. Category <code style="font:500 11.5px var(--font-mono); background:var(--bg2); padding:1px 5px; border-radius:4px;">LEGACY_PAYOFF_STATEMENT</code>.</div><button class="upload-btn" type="button"><i class="ri-upload-2-line"></i> Upload payoff statement</button></div></div>',
            section('Optional'),
            checks([
              { icon: 'ri-shield-keyhole-line', label: 'Title / deed' },
              { icon: 'ri-history-line', label: 'Payment history export (CSV)' },
              { icon: 'ri-mail-line', label: 'Borrower notification letter' },
              { icon: 'ri-scales-3-line', label: 'Modification / restructure agreement' },
              { icon: 'ri-file-shield-2-line', label: 'Insurance / escrow statement' },
              { icon: 'ri-id-card-line', label: 'KYC re-verification (if expired)' }
            ], 'three'),
            section('Annual buckets (optional, for tax statements)'),
            '<div style="font:500 12.5px var(--font-sans); color:var(--fg3); margin:-4px 0 8px;">If you have year-by-year P/I/E totals from the legacy system, paste them as CSV — Ream uses them to issue accurate prior-year tax statements without re-deriving from scratch.</div>',
            field({ kind: 'textarea', label: 'Annual buckets (year, principalPaid, interestPaid, escrowPaid)', placeholder: '2019, 2114.18, 11320.42, 1642.50\n2020, 7298.40, 13412.10, 2190.00\n…', optional: true, rows: 3 })
          ].join(''); }
        }
      ]
    }
  };

  // ---------- DOM injection ----------
  function ensureCss() {
    if (document.querySelector('link[data-rw-css]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = '_wizard.css'; l.dataset.rwCss = '1';
    document.head.appendChild(l);
  }

  var overlay; // single shared overlay
  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'wiz-overlay';
    overlay.id = 'rwOverlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = [
      '<div class="wiz-shell">',
      '  <aside class="wiz-rail" id="rwRail"></aside>',
      '  <div class="wiz-body">',
      '    <div class="wiz-head">',
      '      <div><div class="ti" id="rwTitle"></div><div class="sb" id="rwSub"></div></div>',
      '      <button class="wiz-close" type="button" id="rwClose" aria-label="Close"><i class="ri-close-line"></i></button>',
      '    </div>',
      '    <div class="wiz-scroll" id="rwScroll"></div>',
      '    <div class="wiz-foot">',
      '      <span class="wiz-foot-progress" id="rwProgress"></span>',
      '      <div class="wiz-foot-actions">',
      '        <button class="wiz-btn ghost" type="button" id="rwCancel">Cancel</button>',
      '        <button class="wiz-btn secondary" type="button" id="rwBack" style="display:none;"><i class="ri-arrow-left-line"></i> Back</button>',
      '        <button class="wiz-btn primary" type="button" id="rwNext">Next <i class="ri-arrow-right-line"></i></button>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && overlay.classList.contains('open')) close(); });
    overlay.querySelector('#rwClose').addEventListener('click', close);
    overlay.querySelector('#rwCancel').addEventListener('click', close);
    overlay.querySelector('#rwBack').addEventListener('click', function () { goTo(state.cur - 1); });
    overlay.querySelector('#rwNext').addEventListener('click', function () {
      if (state.cur < state.schema.steps.length) goTo(state.cur + 1);
      else close();
    });
    return overlay;
  }

  // ---------- State & navigation ----------
  var state = { schema: null, cur: 0, done: [] };

  function goTo(i) {
    if (i < 0) return;
    var max = state.schema.steps.length;
    if (i > max) return;
    if (i > state.cur) {
      // mark earlier as done
      for (var k = state.cur; k < i; k++) state.done[k] = true;
    }
    state.cur = i;
    render();
  }

  function buildRail() {
    var s = state.schema;
    var head = '<div class="wiz-rail-head"><div class="eye">' + s.eyebrow + '</div><div class="ti">' + s.brandTi + '</div><div class="sb">' + s.brandSb + '</div></div>';
    var rows = s.steps.map(function (st, i) {
      var cls = 'wiz-step-row' + (i === state.cur ? ' active' : '') + (state.done[i] ? ' done' : '');
      var num = state.done[i] ? '<i class="ri-check-line"></i>' : (i + 1);
      return '<button class="' + cls + '" type="button" data-rw-step="' + i + '"><span class="num">' + num + '</span><span><span class="lbl">' + st.label + '</span><span class="desc">' + st.desc + '</span></span></button>';
    }).join('');
    return head + rows;
  }

  function bindChecks(scope) {
    scope.querySelectorAll('.wiz-checks label input[type="checkbox"]').forEach(function (cb) {
      var lbl = cb.closest('label');
      cb.addEventListener('change', function () { lbl.classList.toggle('on', cb.checked); });
    });
    scope.querySelectorAll('.wiz-radio-grid').forEach(function (grid) {
      var labels = [].slice.call(grid.querySelectorAll('label'));
      labels.forEach(function (lbl) {
        lbl.addEventListener('click', function () {
          labels.forEach(function (x) { x.classList.remove('active'); });
          lbl.classList.add('active');
          var input = lbl.querySelector('input');
          if (input) input.checked = true;
        });
      });
    });
  }

  function render() {
    var s = state.schema;
    var max = s.steps.length;
    var isDone = state.cur === max;

    document.getElementById('rwRail').innerHTML = buildRail();
    document.getElementById('rwRail').querySelectorAll('[data-rw-step]').forEach(function (b) {
      b.addEventListener('click', function () { goTo(+b.dataset.rwStep); });
    });

    var scroll = document.getElementById('rwScroll');
    var titleEl = document.getElementById('rwTitle');
    var subEl = document.getElementById('rwSub');
    var progressEl = document.getElementById('rwProgress');
    var nextBtn = document.getElementById('rwNext');
    var backBtn = document.getElementById('rwBack');

    if (isDone) {
      titleEl.textContent = 'Review & confirm';
      subEl.textContent = "Everything looks ready. Click below to create the " + s.label + ".";
      var summary = (s.summaryFn ? s.summaryFn() : []).map(function (kv) { return '<dt>' + kv[0] + '</dt><dd>' + kv[1] + '</dd>'; }).join('');
      scroll.innerHTML = '<div class="wiz-done"><div class="check-big"><i class="' + s.icon + '"></i></div><h3>Ready to create</h3><p>Review the highlights below. You can go back to fix anything before saving.</p><div class="summary"><dl>' + summary + '</dl></div></div>';
      progressEl.textContent = 'Step ' + max + ' of ' + max + ' · review';
      nextBtn.innerHTML = '<i class="ri-check-line"></i> Create ' + s.label;
      backBtn.style.display = '';
    } else {
      var step = s.steps[state.cur];
      titleEl.textContent = step.ti;
      subEl.textContent = step.sb;
      scroll.innerHTML = '<div class="wiz-fields">' + step.html() + '</div>';
      bindChecks(scroll);
      if (typeof step.onMount === 'function') { try { step.onMount(scroll); } catch (err) { console.warn('onMount error', err); } }
      progressEl.textContent = 'Step ' + (state.cur + 1) + ' of ' + max;
      backBtn.style.display = state.cur > 0 ? '' : 'none';
      nextBtn.innerHTML = (state.cur === max - 1)
        ? 'Review <i class="ri-arrow-right-line"></i>'
        : 'Save & continue <i class="ri-arrow-right-line"></i>';
    }
    scroll.scrollTop = 0;
  }

  function open(key) {
    var schema = SCHEMAS[key];
    if (!schema) { console.warn('Unknown wizard key:', key); return; }
    ensureCss();
    ensureOverlay();
    state.schema = schema;
    state.cur = 0;
    state.done = schema.steps.map(function () { return false; });
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    render();
  }

  function close() {
    if (!overlay) return;
    if (state.schema && state.cur >= state.schema.steps.length) {
      // confirmed creation — show toast
      var label = state.schema.label;
      var msg = state.schema.doneTi || ('New ' + label + ' created');
      try {
        var t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1f2937;color:#fff;padding:10px 16px;border-radius:8px;font:500 13px system-ui;z-index:9999;box-shadow:0 6px 20px rgba(0,0,0,.18)';
        document.body.appendChild(t);
        setTimeout(function () { t.remove(); }, 2400);
      } catch (e) {}
    }
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Expose
  window.RegisterWizards = { open: open, close: close, _schemas: SCHEMAS };

  // Auto-bind any [data-rw-open="<key>"] elements on the page
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-rw-open]');
    if (!t) return;
    e.preventDefault();
    open(t.getAttribute('data-rw-open'));
  });
})();
