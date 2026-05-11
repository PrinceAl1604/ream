/* =================================================================
   Ream · Imports — staging, validation, preview, accept/discard
   ----------------------------------------------------------------
   Single-file, no framework. Three resources share the same flow:
     1. Open dialog → pick CSV/XLSX (or drop)
     2. Parse client-side, run schema validation, stash in `staging`
     3. Render preview table on the resource panel
     4. Accept (commit) or Discard (drop staging)
   Staging state lives only in-memory + sessionStorage so a refresh
   keeps the preview, but a fresh tab starts clean.
   ================================================================= */
(function () {
  // ---------- Schema definitions (mirrors the import guide) ----------
  // Each schema: list of fields, with type + requirement + label.
  // type: 'string' | 'email' | 'number' | 'integer' | 'date' | 'bool' | 'percent'
  // req:  'req' | 'cond' | 'rec' | 'opt'
  // displayCols: which fields to show in preview (keep < 8 for readability)
  const SCHEMAS = {
    sites: {
      label: 'sites',
      sheet: '20_Sites',
      filenameHint: '20_Sites.csv or REAM_Loan_Import_Template.xlsx',
      icon: 'ri-map-2-line',
      fields: [
        { k: 'siteId',                   t: 'integer', req: 'req', label: 'siteId' },
        { k: 'name',                     t: 'string',  req: 'rec', label: 'Name' },
        { k: 'description',              t: 'string',  req: 'opt', label: 'Description' },
        { k: 'numberOfParcels',          t: 'integer', req: 'rec', label: '# Parcels' },
        { k: 'parcelArea',               t: 'number',  req: 'rec', label: 'Parcel area (m²)' },
        { k: 'pricePerParcel',           t: 'number',  req: 'rec', label: 'Price/parcel (USD)' },
        { k: 'parcelMonthlyEscrow',      t: 'number',  req: 'rec', label: 'Escrow/parcel' },
        { k: 'defaultLoanTermInMonths',  t: 'integer', req: 'req', label: 'Term (mo)' },
        { k: 'downPaymentPerParcel',     t: 'number',  req: 'rec', label: 'Down payment' },
        { k: 'contractProcessingFee',    t: 'number',  req: 'req', label: 'Processing fee' },
        { k: 'addressCity',              t: 'string',  req: 'opt', label: 'City' },
        { k: 'addressState',             t: 'string',  req: 'opt', label: 'State' },
      ],
      displayCols: ['siteId', 'name', 'numberOfParcels', 'pricePerParcel', 'defaultLoanTermInMonths', 'contractProcessingFee', 'addressCity'],
    },
    members: {
      label: 'members',
      sheet: '10_Customers',
      filenameHint: '10_Customers.csv or REAM_Loan_Import_Template.xlsx',
      icon: 'ri-team-line',
      // role: customer = borrower, agent / manager / admin (with type) / viewer
      // type: SALES | FOLLOW_UP | FINANCE — required for agent & manager only
      roles: ['customer', 'agent', 'manager', 'admin', 'viewer'],
      agentTypes: ['SALES', 'FOLLOW_UP', 'FINANCE'],
      fields: [
        { k: 'email',            t: 'email',   req: 'req', label: 'Email' },
        { k: 'role',             t: 'enum',    req: 'req', label: 'Role',
          values: ['customer', 'agent', 'manager', 'admin', 'viewer'] },
        { k: 'type',             t: 'enum',    req: 'opt', label: 'Type',
          values: ['SALES', 'FOLLOW_UP', 'FINANCE'],
          // required when role is agent or manager
          requiredWhen: row => row.role === 'agent' || row.role === 'manager' },
        { k: 'firstName',        t: 'string',  req: 'req', label: 'First name' },
        { k: 'lastName',         t: 'string',  req: 'req', label: 'Last name' },
        { k: 'phoneNumber',      t: 'string',  req: 'req', label: 'Phone' },
        { k: 'phoneCountryCode', t: 'string',  req: 'req', label: 'Country code' },
        { k: 'phoneExtension',   t: 'string',  req: 'opt', label: 'Ext.' },
        { k: 'addressStreet',    t: 'string',  req: 'opt', label: 'Street' },
        { k: 'addressCity',      t: 'string',  req: 'opt', label: 'City' },
        { k: 'addressState',     t: 'string',  req: 'opt', label: 'State' },
        { k: 'addressCountry',   t: 'string',  req: 'opt', label: 'Country' },
        { k: 'addressZipCode',   t: 'string',  req: 'opt', label: 'Zip' },
      ],
      displayCols: ['email', 'role', 'type', 'firstName', 'lastName', 'phoneCountryCode', 'phoneNumber', 'addressCity'],
    },
    contracts: {
      label: 'contracts',
      sheet: '40_Loan_Accounts',
      filenameHint: '40_Loan_Accounts.csv or REAM_Loan_Import_Template.xlsx',
      icon: 'ri-file-list-3-line',
      fields: [
        { k: 'loanReference',             t: 'string',  req: 'req', label: 'Loan #' },
        { k: 'customerEmail',             t: 'email',   req: 'req', label: 'Customer email' },
        { k: 'siteId',                    t: 'integer', req: 'req', label: 'Site' },
        { k: 'originalLoanAmount',        t: 'number',  req: 'req', label: 'Loan amount' },
        { k: 'annualInterestRatePercent', t: 'percent', req: 'req', label: 'Rate %' },
        { k: 'loanTermInMonths',          t: 'integer', req: 'req', label: 'Term (mo)' },
        { k: 'downPayment',               t: 'number',  req: 'req', label: 'Down pmt' },
        { k: 'monthlyEscrow',             t: 'number',  req: 'req', label: 'Escrow' },
        { k: 'firstPaymentDate',          t: 'date',    req: 'req', label: '1st pmt' },
        { k: 'principalPaid',             t: 'number',  req: 'req', label: 'Principal paid' },
        { k: 'interestPaid',              t: 'number',  req: 'req', label: 'Interest paid' },
        { k: 'escrowPaid',                t: 'number',  req: 'req', label: 'Escrow paid' },
        { k: 'lateFeePaid',               t: 'number',  req: 'req', label: 'Late fee paid' },
        { k: 'carryOverAmount',           t: 'number',  req: 'req', label: 'Carry-over' },
        { k: 'activeInstallmentNumber',   t: 'integer', req: 'req', label: 'Active inst.' },
        { k: 'currentDpd',                t: 'integer', req: 'req', label: 'DPD' },
        { k: 'worstDpd',                  t: 'integer', req: 'req', label: 'Worst DPD' },
        { k: 'officerCode',               t: 'string',  req: 'opt', label: 'Officer' },
        { k: 'notes',                     t: 'string',  req: 'opt', label: 'Notes' },
      ],
      displayCols: ['loanReference', 'customerEmail', 'siteId', 'originalLoanAmount', 'annualInterestRatePercent', 'loanTermInMonths', 'firstPaymentDate', 'currentDpd'],
    },
  };

  // ---------- Sample data (so the demo has something to show) ----------
  const SAMPLES = {
    sites: [
      ['siteId','name','description','numberOfParcels','parcelArea','pricePerParcel','parcelMonthlyEscrow','defaultLoanTermInMonths','downPaymentPerParcel','contractProcessingFee','addressCity','addressState'],
      [101,'Maple Heights — Phase 1','180 plots, residential',180,520,32500,140,180,3500,750,'Houston','TX'],
      [102,'Lakeshore Estate','Coastal mixed-use site',96,640,48000,210,180,5000,950,'Galveston','TX'],
      [103,'Brookfield North','Phase 2 expansion',64,720,52500,180,120,5500,950,'Dallas','TX'],
      [104,'Evergreen Lane','Suburban infill',24,2050,68000,240,84,7000,950,'Brookfield','NY'],
      [105,'Waxahachie Plot 24','Single-tract development',24,2050,84000,250,180,8500,1100,'Waxahachie','TX'],
      [106,'Sunset Ridge','Phase 1 — west',48,580,29500,120,180,3200,750,'Phoenix','AZ'],
      [107,'Cedar Park West',null,72,610,44000,170,180,4400,850,'Austin','TX'],
      [108,'Old Town Acres','Heritage subdivision',32,820,71000,200,120,7100,1100,null,'OR'],
      // Intentional issues to showcase validation:
      [109,'Bay Pointe',null,null,null,'not-a-number',null,180,null,950,'Miami','FL'], // bad number
      [null,'Missing siteId',null,null,null,null,null,180,null,950,'Reno','NV'],         // missing required
      [111,'Summit View',null,40,500,38500,160,'eighteen',null,800,'Denver','CO'],        // term not integer
      [112,'Riverside','Riverfront promenade',58,690,46500,185,180,4750,900,'Portland','OR'],
    ],
    members: [
      ['email','role','type','firstName','lastName','phoneNumber','phoneCountryCode','phoneExtension','addressStreet','addressCity','addressState','addressCountry','addressZipCode'],
      ['danyls.tchekambou@example.com','customer',null,'Danyls','Tchekambou','5551234567','1',null,'12 Maple Street','Houston','TX','US','77002'],
      ['atlas.properties@example.com','customer',null,'Atlas','Properties','5559876543','1',null,'1 Main Avenue','Dallas','TX','US','75201'],
      ['anna.amirah@example.com','customer',null,'Anna','Amirah','5552223344','1',null,'88 Cedar Ln','Brookfield','NY','US','13502'],
      ['marcus.lee@example.com','customer',null,'Marcus','Lee','5557776655','1','402','402 Elm St','Galveston','TX','US','77550'],
      ['rosa.estevez@example.com','customer',null,'Rosa','Estevez','5558881122','1',null,null,'Phoenix','AZ','US','85001'],
      ['kim.tanaka@example.com','customer',null,'Kim','Tanaka','5556665544','1',null,'17 Cherry Blvd','Austin','TX','US','78701'],
      ['agent.evans@example.com','agent','SALES','Jordan','Evans','5552220001','1',null,null,'Austin','TX','US','78701'],
      ['agent.kim@example.com','agent','FOLLOW_UP','Sarah','Kim','5552220002','1',null,null,'Houston','TX','US','77002'],
      ['agent.diallo@example.com','agent','FINANCE','Aïssa','Diallo','5552220009','1',null,null,'Dallas','TX','US','75201'],
      ['manager.boateng@example.com','manager','SALES','Kwame','Boateng','5552220005','1',null,null,'Houston','TX','US','77002'],
      ['manager.osei@example.com','manager','FOLLOW_UP','Akosua','Osei','5552220006','1',null,null,'Austin','TX','US','78701'],
      ['manager.amoah@example.com','manager','FINANCE','Nana','Amoah','5552220007','1',null,null,'Dallas','TX','US','75201'],
      ['admin.lee@example.com','admin',null,'Priya','Lee','5552220003','1',null,null,'Dallas','TX','US','75201'],
      ['viewer.mendez@example.com','viewer',null,'Carlos','Mendez','5552220004','1',null,null,'Phoenix','AZ','US','85001'],
      // Issues:
      ['Not An Email','customer',null,'Bad','Email','5550000000','1',null,null,null,null,null,null], // bad email
      ['missing.fields@example.com','customer',null,null,'Solo','5551111111','1',null,null,null,null,null,null], // missing firstName
      ['bad.role@example.com','superuser',null,'Wrong','Role','5551112222','1',null,null,null,null,null,null], // unknown role
      ['agent.notype@example.com','agent',null,'Missing','Type','5551113333','1',null,null,null,null,null,null], // agent w/o type
      ['mgr.badtype@example.com','manager','OPERATIONS','Wrong','Type','5551114444','1',null,null,null,null,null,null], // bad type
      ['DUP@example.com','customer',null,'Dup','One','5550001111','1',null,null,null,null,null,null], // dup
      ['dup@example.com','agent','SALES','Dup','Two','5550002222','1',null,null,null,null,null,null], // dup (case-insensitive)
      ['nora.chen@example.com','customer',null,'Nora','Chen','5559990011','1',null,'9 Birch St','Seattle','WA','US','98101'],
    ],
    contracts: [
      ['loanReference','customerEmail','siteId','originalLoanAmount','annualInterestRatePercent','loanTermInMonths','downPayment','monthlyEscrow','firstPaymentDate','principalPaid','interestPaid','escrowPaid','lateFeePaid','carryOverAmount','activeInstallmentNumber','currentDpd','worstDpd','officerCode','notes'],
      // ── Ahead of schedule: paid extra principal, fewer installments left ──
      ['LN-2023-0142','anna.amirah@example.com',104,40000,9.25,84,8500,140,'2023-07-01',18420,8420,2380,0,0,28,0,0,'OFC-007','Member made 4 extra principal payments in 2024.'],
      ['LN-2024-0044','kim.tanaka@example.com',107,39600,8.95,180,4400,170,'2024-02-01',9800,4140,2210,0,0,22,0,0,'OFC-007','Bi-weekly auto-pay since month 6.'],

      // ── On schedule, healthy ──
      ['LN-2024-0066','marcus.lee@example.com',102,42500,8.75,180,5000,210,'2024-10-15',2100,3920,1680,0,0,9,0,0,'OFC-014',null],
      ['LN-2025-0011','kim.tanaka@example.com',107,39600,8.95,180,4400,170,'2025-02-01',680,1140,510,0,0,3,0,0,'OFC-007',null],
      ['LN-2023-0078','danyls.tchekambou@example.com',101,29000,9.25,180,3500,140,'2023-09-20',5400,5980,2520,0,0,21,0,0,'OFC-007',null],

      // ── Slightly behind, past due (no late fee yet) ──
      ['LN-2024-0103','rosa.estevez@example.com',106,26300,9.5,180,3200,120,'2024-12-01',900,1840,720,0,0,5,12,18,'OFC-014',null],

      // ── Behind schedule, late fees accruing ──
      ['LN-2024-0145','nora.chen@example.com',103,47000,9.0,180,5500,180,'2024-04-15',3200,5180,2160,180,420,11,28,30,'OFC-014','Two missed installments — collection contacted member.'],
      ['LN-2023-0220','marcus.lee@example.com',102,42500,8.75,180,5000,210,'2023-11-01',4200,7820,3360,360,840,14,42,60,'OFC-014','3 installments behind — restructuring proposal pending.'],

      // ── Severely delinquent, large outstanding + accrued late fees + carry-over ──
      ['LN-2022-0291','atlas.properties@example.com',105,75000,9.5,180,8500,250,'2022-08-01',18400,17890,5500,1850,2400,38,75,120,'OFC-007','Restructured 2024-Q3. Carry-over from missed Q2 escrow.'],

      // ── Issues (validation showcase) ──
      ['LN-2024-0188','unknown@example.com',999,30000,9.25,180,3500,140,'2024-06-01',2100,3920,1680,0,0,9,0,0,'OFC-014',null],
      ['LN-2024-0199','anna.amirah@example.com',104,'lots',9.25,180,8500,140,'2024-08-01',0,0,0,0,0,1,0,0,null,null],
      ['LN-2024-0200','marcus.lee@example.com',102,42500,9.25,180,5000,210,'15-10-2024',0,0,0,0,0,1,0,0,null,null],
    ],
  };

  // ---------- State ----------
  // staging[res] = { rows: [{values, errors:{field:msg}, status:'ok'|'warn'|'err'}], filename, importedAt, schema, displayCols, filterMode }
  const staging = (function () {
    try {
      const raw = sessionStorage.getItem('ream-imp-staging');
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return { sites: null, members: null, contracts: null };
  })();
  function persist() {
    try { sessionStorage.setItem('ream-imp-staging', JSON.stringify(staging)); } catch (_) {}
  }

  // ---------- Tabs ----------
  function activate(res) {
    document.querySelectorAll('.res-tab').forEach(b => b.classList.toggle('active', b.dataset.res === res));
    document.querySelectorAll('.res-panel').forEach(p => p.classList.toggle('active', p.dataset.res === res));
  }
  document.querySelectorAll('.res-tab').forEach(b => {
    b.addEventListener('click', () => activate(b.dataset.res));
  });

  // ---------- Validators ----------
  function isBlank(v) { return v === null || v === undefined || v === '' || (typeof v === 'string' && v.trim() === ''); }
  function castValue(v, type) {
    if (isBlank(v)) return null;
    const s = typeof v === 'string' ? v.trim() : v;
    switch (type) {
      case 'integer': {
        const n = Number(s);
        if (!Number.isFinite(n) || !Number.isInteger(n)) return { _err: 'must be an integer' };
        return n;
      }
      case 'number':
      case 'percent': {
        const n = typeof s === 'number' ? s : Number(String(s).replace(/[$,\s]/g, ''));
        if (!Number.isFinite(n)) return { _err: 'must be a number' };
        if (type === 'percent' && (n < 0 || n > 100)) return { _err: 'percent must be 0–100' };
        return n;
      }
      case 'date': {
        const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return { _err: 'use ISO date YYYY-MM-DD' };
        const d = new Date(s);
        if (isNaN(d.getTime())) return { _err: 'invalid date' };
        return s;
      }
      case 'email': {
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s));
        if (!ok) return { _err: 'not a valid email' };
        return String(s).toLowerCase();
      }
      case 'enum': {
        // caller validates against allowed values
        return String(s).toLowerCase().trim();
      }
      case 'bool': {
        const u = String(s).toUpperCase();
        if (u === 'TRUE' || u === 'FALSE') return u === 'TRUE';
        return { _err: 'must be TRUE or FALSE' };
      }
      default: return String(s);
    }
  }

  function validateRow(rawRow, schema, ctx) {
    const values = {};
    const errors = {};
    schema.fields.forEach(f => {
      const raw = rawRow[f.k];
      if (isBlank(raw)) {
        if (f.req === 'req') errors[f.k] = 'required';
        values[f.k] = null;
        return;
      }
      const cast = castValue(raw, f.t);
      if (cast && typeof cast === 'object' && cast._err) {
        errors[f.k] = cast._err;
        values[f.k] = raw;
      } else if (f.t === 'enum' && f.values && !f.values.includes(cast)) {
        errors[f.k] = 'must be one of: ' + f.values.join(', ');
        values[f.k] = raw;
      } else {
        values[f.k] = cast;
      }
    });
    // Cross-row checks
    if (schema.label === 'members') {
      const em = (values.email || '').toLowerCase();
      if (em && ctx.emails.has(em)) errors.email = 'duplicate email';
      else if (em) ctx.emails.add(em);
    }
    if (schema.label === 'contracts') {
      const em = (values.customerEmail || '').toLowerCase();
      if (em && !ctx.knownEmails.has(em)) errors.customerEmail = errors.customerEmail || 'no matching member';
      const sid = values.siteId;
      if (sid != null && !ctx.knownSites.has(sid)) errors.siteId = errors.siteId || 'no matching site';
      // sanity: paid principal can't exceed loan amount
      if (typeof values.principalPaid === 'number' && typeof values.originalLoanAmount === 'number'
          && values.principalPaid > values.originalLoanAmount) {
        errors.principalPaid = 'exceeds loan amount';
      }
    }
    const status = Object.keys(errors).length === 0 ? 'ok' : 'err';
    return { values, errors, status };
  }

  function buildContext(res) {
    // Cross-row context: known emails (members) and siteIds (sites) from already-staged + sample known data.
    const ctx = { emails: new Set(), knownEmails: new Set(), knownSites: new Set() };
    // Pretend the production DB already has these (so contracts referencing them validate cleanly).
    SAMPLES.members.slice(1).forEach(r => {
      if (r[0] && /@/.test(String(r[0]))) ctx.knownEmails.add(String(r[0]).toLowerCase());
    });
    SAMPLES.sites.slice(1).forEach(r => {
      if (typeof r[0] === 'number') ctx.knownSites.add(r[0]);
    });
    if (res === 'members') ctx.emails = new Set();
    return ctx;
  }

  // ---------- Parsing ----------
  function parseCsvText(text) {
    // Minimal CSV parser handling quoted fields and commas.
    const rows = [];
    let cur = '', row = [], inQ = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQ) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cur += '"'; i++; }
          else inQ = false;
        } else cur += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === ',') { row.push(cur); cur = ''; }
        else if (ch === '\r') { /* ignore */ }
        else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
        else cur += ch;
      }
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    // Trim trailing empty lines
    while (rows.length && rows[rows.length - 1].every(c => c === '')) rows.pop();
    return rows;
  }

  function rowsToObjects(matrix, schema) {
    if (matrix.length < 2) return [];
    const headers = matrix[0].map(h => String(h || '').trim());
    const idx = {};
    schema.fields.forEach(f => {
      const i = headers.indexOf(f.k);
      idx[f.k] = i >= 0 ? i : -1;
    });
    const out = [];
    for (let r = 1; r < matrix.length; r++) {
      const row = matrix[r];
      if (!row.some(c => !isBlank(c))) continue; // blank row
      const obj = {};
      schema.fields.forEach(f => {
        obj[f.k] = idx[f.k] >= 0 ? row[idx[f.k]] : null;
      });
      out.push(obj);
    }
    return out;
  }

  // ---------- Pipeline: stash a parsed dataset into staging ----------
  function stageDataset(res, rawObjects, filename) {
    const schema = SCHEMAS[res];
    const ctx = buildContext(res);
    const rows = rawObjects.map(r => validateRow(r, schema, ctx));
    staging[res] = {
      rows,
      filename,
      importedAt: new Date().toISOString(),
      schema: res,
      filterMode: 'all',
    };
    persist();
    renderPanel(res);
    updateTabCounts();
  }

  // ---------- Rendering ----------
  function fmtNum(v) {
    if (v === null || v === undefined || v === '') return '<span class="muted">—</span>';
    if (typeof v === 'number') return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
    return escapeHtml(v);
  }
  function fmtMoney(v) {
    if (v === null || v === undefined || v === '') return '<span class="muted">—</span>';
    if (typeof v === 'number') return '$' + v.toLocaleString('en-US', { maximumFractionDigits: 2 });
    return escapeHtml(v);
  }
  function fmtPct(v) {
    if (v === null || v === undefined || v === '') return '<span class="muted">—</span>';
    if (typeof v === 'number') return v.toFixed(2) + '%';
    return escapeHtml(v);
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function cellRender(field, val, hasErr) {
    if (hasErr) {
      return '<td class="err-cell">' + escapeHtml(val == null ? '—' : val) + '</td>';
    }
    if (field.k === 'role') {
      const v = val == null ? null : String(val).toLowerCase();
      const cls = 'role-pill role-' + (v || 'unknown');
      return '<td>' + (v ? `<span class="${cls}">${escapeHtml(v)}</span>` : '<span class="muted">—</span>') + '</td>';
    }
    if (field.t === 'percent') return '<td class="num-cell">' + fmtPct(val) + '</td>';
    if (field.t === 'number')  {
      const looksMoney = /amount|price|fee|escrow|paid|payment|carry|down/i.test(field.k);
      return '<td class="num-cell">' + (looksMoney ? fmtMoney(val) : fmtNum(val)) + '</td>';
    }
    if (field.t === 'integer') return '<td class="num-cell">' + fmtNum(val) + '</td>';
    if (field.k === 'siteId' || field.k === 'loanReference' || field.k === 'loanProductId') {
      return '<td class="id-mono">' + (val == null ? '<span class="muted">—</span>' : escapeHtml(val)) + '</td>';
    }
    return '<td>' + (val == null ? '<span class="muted">—</span>' : escapeHtml(val)) + '</td>';
  }

  function renderPanel(res) {
    const body = document.getElementById('body-' + res);
    const stage = staging[res];
    if (!stage || !stage.rows || !stage.rows.length) {
      body.innerHTML = `
        <div class="empty">
          <i class="${SCHEMAS[res].icon}"></i>
          <div class="t">No staged ${SCHEMAS[res].label} yet</div>
          <div class="s">Drop a CSV/XLSX, or load the bundled sample to see how the preview works.</div>
        </div>`;
      return;
    }
    const schema = SCHEMAS[res];
    const total = stage.rows.length;
    const okCount  = stage.rows.filter(r => r.status === 'ok').length;
    const errCount = stage.rows.filter(r => r.status === 'err').length;
    const filter = stage.filterMode || 'all';
    const visible = stage.rows
      .map((r, i) => ({ ...r, _i: i }))
      .filter(r => filter === 'all' ? true : r.status === filter);

    // --- Table head ---
    const head = '<th class="row-num">#</th><th class="status-cell">Status</th>'
      + schema.displayCols.map(k => {
          const f = schema.fields.find(x => x.k === k);
          return '<th>' + escapeHtml(f.label) + (f.req === 'req' ? ' <span style="color:var(--color-error-500)">*</span>' : '') + '</th>';
        }).join('')
      + '<th>Issues</th>'
      + '<th></th>';

    // --- Table body ---
    const bodyRows = visible.map(r => {
      const cls = r.status === 'err' ? 'row-error' : r.status === 'warn' ? 'row-warn' : '';
      const cells = schema.displayCols.map(k => {
        const f = schema.fields.find(x => x.k === k);
        return cellRender(f, r.values[k], !!r.errors[k]);
      }).join('');
      const issues = Object.keys(r.errors).length
        ? '<td><div class="err-msg"><i class="ri-error-warning-line"></i> ' +
          escapeHtml(Object.entries(r.errors).map(([k, m]) => `${k}: ${m}`).join(' · ')) +
          '</div></td>'
        : '<td><span class="muted">—</span></td>';
      const status = r.status === 'ok'
        ? '<span class="row-status ok"><i class="ri-check-line"></i> Valid</span>'
        : '<span class="row-status err"><i class="ri-close-line"></i> Error</span>';
      const del = `<td><button class="row-del" type="button" title="Remove from staging" onclick="event.stopPropagation(); window.removeRow('${res}', ${r._i})"><i class="ri-delete-bin-line"></i></button></td>`;
      return `<tr class="${cls}" onclick="window.openPrev('${res}', ${r._i})" title="Click to preview">
        <td class="row-num">${r._i + 1}</td>
        <td class="status-cell">${status}</td>
        ${cells}
        ${issues}
        ${del}
      </tr>`;
    }).join('');

    body.innerHTML = `
      <div class="staged">
        <div class="staged-head">
          <div class="lh">
            <span class="badge-staged"><i class="ri-time-line"></i> Staged</span>
            <div class="meta">
              <b>${total}</b> ${schema.label} parsed from <b>${escapeHtml(stage.filename || 'upload')}</b> · ${new Date(stage.importedAt).toLocaleString()}
            </div>
          </div>
          <div class="actions">
            <button class="btn btn-text btn-sm" type="button" onclick="window.openImport('${res}')"><i class="ri-refresh-line"></i> Replace file</button>
          </div>
        </div>
        <div class="staged-validity">
          <div class="stat ok"><i class="ri-check-double-line"></i> ${okCount} valid</div>
          <div class="stat err" ${errCount === 0 ? 'style="display:none"' : ''}><i class="ri-error-warning-line"></i> ${errCount} with errors</div>
          <div class="filter-pills">
            <button class="pill ${filter==='all'?'active':''}" onclick="window.setFilter('${res}','all')">All</button>
            <button class="pill ${filter==='ok'?'active':''}"  onclick="window.setFilter('${res}','ok')">Valid only</button>
            <button class="pill ${filter==='err'?'active':''}" onclick="window.setFilter('${res}','err')">Errors only</button>
          </div>
        </div>
        <div class="staged-table-wrap">
          <table class="staged-table">
            <thead><tr>${head}</tr></thead>
            <tbody>${bodyRows || '<tr><td colspan="20" style="text-align:center; padding:24px; color:var(--fg3);">No rows match the filter.</td></tr>'}</tbody>
          </table>
        </div>
        <div class="staged-foot">
          <div class="left"><i class="ri-shield-check-line"></i> Staging only — accepting will commit ${okCount} valid ${schema.label}${errCount ? `; ${errCount} error rows will be skipped.` : '.'}</div>
          <div class="right">
            <button class="btn btn-text btn-sm" type="button" onclick="window.confirmDiscard('${res}')"><i class="ri-delete-bin-line"></i> Discard</button>
            <button class="btn btn-primary btn-sm" type="button" ${okCount === 0 ? 'disabled' : ''} onclick="window.acceptStaging('${res}')"><i class="ri-check-line"></i> Accept ${okCount} ${schema.label}</button>
          </div>
        </div>
      </div>`;
  }

  function updateTabCounts() {
    ['sites','members','contracts'].forEach(r => {
      const el = document.getElementById('cnt-' + r);
      el.textContent = staging[r] && staging[r].rows ? staging[r].rows.length : 0;
    });
  }

  // ---------- Public actions ----------
  let pendingFile = null;
  let activeRes = 'sites';

  window.openImport = function (res) {
    activeRes = res;
    activate(res);
    document.getElementById('impTitle').textContent = 'Import ' + SCHEMAS[res].label;
    document.getElementById('impSheet').textContent = SCHEMAS[res].sheet;
    document.getElementById('impSub').textContent =
      `Upload your ${SCHEMAS[res].sheet} sheet (or its CSV equivalent). We'll parse it locally and stage the rows for preview — nothing is committed until you press Accept on the resource page.`;
    resetImport();
    document.getElementById('impModal').classList.add('open');
  };
  window.closeImport = function () {
    document.getElementById('impModal').classList.remove('open');
  };

  window.resetImport = function () {
    pendingFile = null;
    document.getElementById('impFile').value = '';
    document.getElementById('impStatus').hidden = true;
    document.getElementById('impDrop').style.display = '';
    document.getElementById('impStageBtn').disabled = true;
    document.getElementById('impFill').style.width = '0%';
    document.getElementById('impSummary').innerHTML = '';
  };

  window.stageRows = function () {
    if (!pendingFile) return;
    stageDataset(activeRes, pendingFile.objects, pendingFile.filename);
    closeImport();
  };

  window.removeRow = function (res, idx) {
    if (!staging[res]) return;
    staging[res].rows.splice(idx, 1);
    if (staging[res].rows.length === 0) staging[res] = null;
    persist();
    renderPanel(res);
    updateTabCounts();
  };

  window.setFilter = function (res, mode) {
    if (!staging[res]) return;
    staging[res].filterMode = mode;
    persist();
    renderPanel(res);
  };

  window.confirmDiscard = function (res) {
    const m = document.getElementById('confirmModal');
    document.getElementById('confirmTitle').textContent = `Discard staged ${SCHEMAS[res].label}?`;
    const n = staging[res] ? staging[res].rows.length : 0;
    document.getElementById('confirmSub').textContent =
      `The ${n} staged row${n === 1 ? '' : 's'} will be removed. The data has not been written to your portfolio yet.`;
    document.getElementById('confirmOk').onclick = function () {
      staging[res] = null;
      persist();
      renderPanel(res);
      updateTabCounts();
      m.classList.remove('open');
      showToast(`Staged ${SCHEMAS[res].label} discarded.`);
    };
    m.classList.add('open');
  };
  window.closeConfirm = function () {
    document.getElementById('confirmModal').classList.remove('open');
  };

  window.acceptStaging = function (res) {
    const stage = staging[res];
    if (!stage) return;
    const ok = stage.rows.filter(r => r.status === 'ok').length;
    staging[res] = null;
    persist();
    renderPanel(res);
    updateTabCounts();
    showToast(`${ok} ${SCHEMAS[res].label} committed to your portfolio.`);
  };

  window.loadSample = function (res) {
    const matrix = SAMPLES[res];
    const objs = rowsToObjects(matrix, SCHEMAS[res]);
    stageDataset(res, objs, 'sample-data.csv');
  };

  function showToast(msg) {
    const t = document.getElementById('acceptToast');
    document.getElementById('acceptToastMsg').textContent = msg;
    t.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { t.hidden = true; }, 3000);
  }

  // ---------- Drag/drop + file input ----------
  const drop = document.getElementById('impDrop');
  const fileInput = document.getElementById('impFile');
  ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => {
    e.preventDefault(); e.stopPropagation();
    drop.classList.add('is-over');
  }));
  ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => {
    e.preventDefault(); e.stopPropagation();
    drop.classList.remove('is-over');
  }));
  drop.addEventListener('drop', e => {
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) handleFile(f);
  });
  drop.addEventListener('click', e => {
    if (e.target.closest('.link-btn')) return; // handled by button onclick
    fileInput.click();
  });
  fileInput.addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (f) handleFile(f);
  });

  async function handleFile(file) {
    const schema = SCHEMAS[activeRes];
    document.getElementById('impStatus').hidden = false;
    document.getElementById('impFname').textContent = file.name;
    document.getElementById('impFmeta').textContent = `${(file.size/1024).toFixed(1)} KB · Parsing…`;
    document.getElementById('impFill').style.width = '15%';

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    let matrix = null;
    try {
      if (ext === 'csv') {
        const text = await file.text();
        matrix = parseCsvText(text);
      } else if ((ext === 'xlsx' || ext === 'xls') && window.XLSX) {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        // Pick the resource's sheet if present, else the first sheet
        const target = wb.SheetNames.find(n => n === schema.sheet) || wb.SheetNames[0];
        const sh = wb.Sheets[target];
        matrix = XLSX.utils.sheet_to_json(sh, { header: 1, raw: true, defval: null });
        // If the sheet has a description preamble (rows 1–4), drop until we find headers row
        // The template has headers on row 4 (index 3). Detect by finding the row that contains the first required field key.
        const reqKey = schema.fields.find(f => f.req === 'req').k;
        const hi = matrix.findIndex(row => row && row.indexOf(reqKey) !== -1);
        if (hi > 0) matrix = matrix.slice(hi);
      } else {
        throw new Error('Unsupported file type. Please upload .csv or .xlsx.');
      }
    } catch (err) {
      document.getElementById('impFmeta').textContent = '✗ ' + err.message;
      document.getElementById('impFill').style.width = '0%';
      document.getElementById('impStageBtn').disabled = true;
      return;
    }

    document.getElementById('impFill').style.width = '60%';
    const objs = rowsToObjects(matrix, schema);
    // Validate up front for the parse summary
    const ctx = buildContext(activeRes);
    const validated = objs.map(o => validateRow(o, schema, ctx));
    const ok  = validated.filter(r => r.status === 'ok').length;
    const err = validated.filter(r => r.status === 'err').length;

    pendingFile = { filename: file.name, objects: objs };
    document.getElementById('impFmeta').textContent =
      `Parsed ${objs.length} ${schema.label} · ${ok} valid · ${err} with errors`;
    document.getElementById('impFill').style.width = '100%';
    document.getElementById('impSummary').innerHTML = `
      <div class="ps"><div class="l">Total rows</div><div class="v">${objs.length}</div></div>
      <div class="ps ok"><div class="l">Valid</div><div class="v">${ok}</div></div>
      <div class="ps err"><div class="l">Errors</div><div class="v">${err}</div></div>
      <div class="ps"><div class="l">Sheet</div><div class="v" style="font-size:13px;">${schema.sheet}</div></div>
    `;
    document.getElementById('impStageBtn').disabled = objs.length === 0;
  }

  // Backdrop click + ESC to close
  document.querySelectorAll('.pay-modal-back').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target === el) el.classList.remove('open');
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.pay-modal-back.open').forEach(el => el.classList.remove('open'));
  });

  // ============================================================
  // ROW PREVIEW DRAWER
  // Click a staged row → side drawer with a resource-specific
  // preview. Sites get a hero + key parcel/term stats; members
  // get a profile card + address; contracts get a financial
  // overview (outstanding balance, breakdown, status).
  // ============================================================
  let prevState = { res: null, idx: 0 };

  window.openPrev = function (res, idx) {
    if (!staging[res] || !staging[res].rows[idx]) return;
    prevState = { res, idx };
    renderPrev();
    document.getElementById('prevBack').classList.add('open');
  };
  window.closePrev = function () {
    document.getElementById('prevBack').classList.remove('open');
  };

  function renderPrev() {
    const { res, idx } = prevState;
    const stage = staging[res];
    if (!stage || !stage.rows[idx]) return;
    const row = stage.rows[idx];
    const v = row.values;
    const errs = row.errors;
    const errCount = Object.keys(errs).length;

    // Title + sub
    const titleEl = document.getElementById('prevTitle');
    const subEl   = document.getElementById('prevSub');
    const bodyEl  = document.getElementById('prevBody');
    const footEl  = document.getElementById('prevFootLeft');

    let titleHtml = '';
    let subText   = `Row ${idx + 1} of ${stage.rows.length} · staged from ${stage.filename || 'upload'}`;

    let bodyHtml = '';
    if (res === 'sites')      { titleHtml = renderSiteTitle(v);     bodyHtml = renderSitePreview(v, errs); }
    else if (res === 'members')   { titleHtml = renderMemberTitle(v);   bodyHtml = renderMemberPreview(v, errs); }
    else if (res === 'contracts') { titleHtml = renderContractTitle(v); bodyHtml = renderContractPreview(v, errs); }

    titleEl.innerHTML = titleHtml;
    subEl.textContent = subText;
    bodyEl.innerHTML = bodyHtml;

    // Footer
    if (errCount === 0) {
      footEl.className = 'left ok';
      footEl.innerHTML = `<i class="ri-check-line"></i> Row will be committed when you Accept.`;
    } else {
      footEl.className = 'left err';
      footEl.innerHTML = `<i class="ri-error-warning-line"></i> ${errCount} field${errCount === 1 ? '' : 's'} need${errCount === 1 ? 's' : ''} attention before this row can be committed.`;
    }

    // Prev / Next nav within current panel's filter
    const visible = stage.rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => stage.filterMode === 'all' || r.status === stage.filterMode)
      .map(({ i }) => i);
    const pos = visible.indexOf(idx);
    const prev = pos > 0 ? visible[pos - 1] : null;
    const next = pos >= 0 && pos < visible.length - 1 ? visible[pos + 1] : null;
    const pBtn = document.getElementById('prevPrev');
    const nBtn = document.getElementById('prevNext');
    pBtn.disabled = prev === null;
    nBtn.disabled = next === null;
    pBtn.onclick = () => prev !== null && (prevState.idx = prev, renderPrev());
    nBtn.onclick = () => next !== null && (prevState.idx = next, renderPrev());
  }

  // ---------- Field helpers for the preview ----------
  function fieldVal(v, type) {
    if (v === null || v === undefined || v === '') return '<span class="muted">—</span>';
    if (type === 'money')   return typeof v === 'number' ? '$' + v.toLocaleString('en-US', { maximumFractionDigits: 2 }) : escapeHtml(v);
    if (type === 'percent') return typeof v === 'number' ? v.toFixed(2) + '%' : escapeHtml(v);
    if (type === 'number')  return typeof v === 'number' ? v.toLocaleString('en-US', { maximumFractionDigits: 2 }) : escapeHtml(v);
    return escapeHtml(v);
  }
  function field(lbl, val, type, errMsg) {
    const cls = errMsg ? 'val err' : (val === null || val === undefined || val === '' ? 'val muted' : 'val');
    return `<div>
      <div class="lbl">${escapeHtml(lbl)}</div>
      <div class="${cls}">${errMsg ? escapeHtml(val == null ? '—' : val) : fieldVal(val, type)}</div>
      ${errMsg ? `<div class="err-note"><i class="ri-error-warning-line"></i> ${escapeHtml(errMsg)}</div>` : ''}
    </div>`;
  }
  function errorsBlock(errs) {
    const keys = Object.keys(errs);
    if (!keys.length) return '';
    return `<div class="pv-errors">
      <h4><i class="ri-error-warning-line"></i> ${keys.length} issue${keys.length === 1 ? '' : 's'} found</h4>
      <ul>${keys.map(k => `<li><code>${escapeHtml(k)}</code> — ${escapeHtml(errs[k])}</li>`).join('')}</ul>
    </div>`;
  }

  // ---------- Site preview ----------
  function renderSiteTitle(v) {
    return `<i class="ri-map-2-line" style="color:var(--color-brand-600);"></i> Site preview <span class="badge-staged"><i class="ri-time-line"></i> staged</span>`;
  }
  function renderSitePreview(v, errs) {
    const totalGmv = (typeof v.numberOfParcels === 'number' && typeof v.pricePerParcel === 'number')
      ? v.numberOfParcels * v.pricePerParcel : null;
    return `
      <div class="pv-hero">
        <div>
          <div class="id">SITE-${escapeHtml(v.siteId == null ? '—' : v.siteId)}</div>
          <div class="name">${escapeHtml(v.name || '(unnamed site)')}</div>
          <div class="desc">${escapeHtml(v.description || 'No description provided.')}</div>
          <div class="loc"><i class="ri-map-pin-line"></i> ${escapeHtml(v.addressCity || '—')}${v.addressState ? ', ' + escapeHtml(v.addressState) : ''}</div>
        </div>
        <div class="figure">
          ${parcelGridSvg(v.numberOfParcels)}
        </div>
      </div>

      ${errorsBlock(errs)}

      <div class="pv-stats">
        <div class="pv-stat"><div class="l">Parcels</div><div class="v">${v.numberOfParcels != null ? v.numberOfParcels : '—'}</div><div class="s">${v.parcelArea != null ? v.parcelArea + ' m² each' : '—'}</div></div>
        <div class="pv-stat"><div class="l">Price / parcel</div><div class="v">${fieldVal(v.pricePerParcel, 'money')}</div><div class="s">USD</div></div>
        <div class="pv-stat"><div class="l">Total GMV</div><div class="v">${fieldVal(totalGmv, 'money')}</div><div class="s">${v.numberOfParcels != null && v.pricePerParcel != null ? 'parcels × price' : 'requires both'}</div></div>
        <div class="pv-stat"><div class="l">Default term</div><div class="v">${v.defaultLoanTermInMonths != null ? v.defaultLoanTermInMonths + ' mo' : '—'}</div><div class="s">${v.defaultLoanTermInMonths != null ? Math.round(v.defaultLoanTermInMonths / 12) + ' years' : ''}</div></div>
      </div>

      <div class="pv-section">
        <h4>Loan defaults</h4>
        <div class="pv-grid">
          ${field('Down payment / parcel', v.downPaymentPerParcel, 'money', errs.downPaymentPerParcel)}
          ${field('Monthly escrow / parcel', v.parcelMonthlyEscrow, 'money', errs.parcelMonthlyEscrow)}
          ${field('Contract processing fee', v.contractProcessingFee, 'money', errs.contractProcessingFee)}
          ${field('Default term', v.defaultLoanTermInMonths != null ? v.defaultLoanTermInMonths + ' months' : null, 'string', errs.defaultLoanTermInMonths)}
        </div>
      </div>

      <div class="pv-section">
        <h4>Location</h4>
        <div class="pv-grid">
          ${field('City', v.addressCity, 'string', errs.addressCity)}
          ${field('State', v.addressState, 'string', errs.addressState)}
        </div>
      </div>
    `;
  }
  function parcelGridSvg(n) {
    if (typeof n !== 'number' || n <= 0) {
      return '<span style="color:var(--fg3); font-size:11px;">No parcel layout</span>';
    }
    const cap = Math.min(n, 64);
    const cols = Math.ceil(Math.sqrt(cap * 1.6));
    const rows = Math.ceil(cap / cols);
    const cw = 200 / cols, rh = 120 / rows;
    let cells = '';
    for (let i = 0; i < cap; i++) {
      const r = Math.floor(i / cols), c = i % cols;
      const x = c * cw + 1, y = r * rh + 1;
      cells += `<rect x="${x}" y="${y}" width="${cw - 2}" height="${rh - 2}" rx="1" fill="#874FFA" opacity="${0.45 + (i % 3) * 0.12}"/>`;
    }
    return `<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">${cells}</svg>`;
  }

  // ---------- Member preview ----------
  function renderMemberTitle(v) {
    return `<i class="ri-team-line" style="color:var(--color-brand-600);"></i> Member preview <span class="badge-staged"><i class="ri-time-line"></i> staged</span>`;
  }
  function renderMemberPreview(v, errs) {
    const initials = ((v.firstName || ' ').charAt(0) + (v.lastName || ' ').charAt(0)).toUpperCase().trim() || '?';
    const fullName = [v.firstName, v.lastName].filter(Boolean).join(' ') || '(unnamed)';
    const phone = v.phoneNumber ? '+' + (v.phoneCountryCode || '?') + ' ' + v.phoneNumber + (v.phoneExtension ? ' ext ' + v.phoneExtension : '') : '—';
    const addrLine = [v.addressStreet, v.addressCity, v.addressState, v.addressZipCode, v.addressCountry].filter(Boolean).join(', ') || 'No address provided';
    const role = v.role ? String(v.role).toLowerCase() : null;
    const roleDesc = {
      customer: 'Borrower — receives loan accounts, schedules and statements.',
      officer:  'Loan officer — services accounts, books payments, manages collections.',
      admin:    'Portal admin — full access including imports, settings and users.',
      viewer:   'Read-only access to portfolio dashboards and reports.',
    }[role] || 'Role determines what this member can see and do in Ream.';
    return `
      <div class="pv-mhead">
        <div class="av">${escapeHtml(initials)}</div>
        <div class="body">
          <div class="name">${escapeHtml(fullName)} ${role ? `<span class="role-pill role-${role}" style="margin-left:8px; vertical-align:middle;">${escapeHtml(role)}</span>` : ''}</div>
          <div class="meta">
            <span><i class="ri-mail-line"></i> ${escapeHtml(v.email || '—')}</span>
            <span><i class="ri-phone-line"></i> ${escapeHtml(phone)}</span>
            <span><i class="ri-map-pin-line"></i> ${escapeHtml([v.addressCity, v.addressState].filter(Boolean).join(', ') || '—')}</span>
          </div>
          <div style="font-size:12px; color:var(--fg3); margin-top:8px;">${escapeHtml(roleDesc)}</div>
        </div>
      </div>

      ${errorsBlock(errs)}

      <div class="pv-section">
        <h4>Identity & access</h4>
        <div class="pv-grid">
          ${field('First name', v.firstName, 'string', errs.firstName)}
          ${field('Last name', v.lastName, 'string', errs.lastName)}
          ${field('Email', v.email, 'string', errs.email)}
          ${field('Role', v.role, 'string', errs.role)}
        </div>
      </div>

      <div class="pv-section">
        <h4>Contact</h4>
        <div class="pv-grid">
          ${field('Country code', v.phoneCountryCode, 'string', errs.phoneCountryCode)}
          ${field('Phone', v.phoneNumber, 'string', errs.phoneNumber)}
          ${field('Extension', v.phoneExtension, 'string', errs.phoneExtension)}
        </div>
      </div>

      <div class="pv-section">
        <h4>Address</h4>
        <div class="pv-grid">
          ${field('Street', v.addressStreet, 'string', errs.addressStreet)}
          ${field('City', v.addressCity, 'string', errs.addressCity)}
          ${field('State', v.addressState, 'string', errs.addressState)}
          ${field('Zip', v.addressZipCode, 'string', errs.addressZipCode)}
          ${field('Country', v.addressCountry, 'string', errs.addressCountry)}
        </div>
        <div style="margin-top:10px; font-size:12.5px; color:var(--color-grey-800);">
          <i class="ri-map-pin-line" style="color:var(--color-brand-600);"></i> ${escapeHtml(addrLine)}
        </div>
      </div>
    `;
  }

  // ---------- Contract / financial overview preview ----------
  function renderContractTitle(v) {
    return `<i class="ri-file-list-3-line" style="color:var(--color-brand-600);"></i> Loan account preview <span class="badge-staged"><i class="ri-time-line"></i> staged</span>`;
  }
  function renderContractPreview(v, errs) {
    const principal = num(v.originalLoanAmount);
    const principalPaid = num(v.principalPaid);
    const interestPaid = num(v.interestPaid);
    const escrowPaid = num(v.escrowPaid);
    const lateFeePaid = num(v.lateFeePaid);
    const carry = num(v.carryOverAmount);
    const outstanding = principal != null && principalPaid != null
      ? Math.max(0, principal - principalPaid) : null;
    const term = num(v.loanTermInMonths);
    const activeInst = num(v.activeInstallmentNumber);
    const pctPaid = (principal != null && principalPaid != null && principal > 0)
      ? Math.min(100, Math.round((principalPaid / principal) * 100)) : null;
    const pctTime = (term != null && activeInst != null && term > 0)
      ? Math.min(100, Math.round((activeInst / term) * 100)) : null;

    const totalPaid = (principalPaid || 0) + (interestPaid || 0) + (escrowPaid || 0) + (lateFeePaid || 0);
    const seg = (val) => totalPaid > 0 ? ((val || 0) / totalPaid * 100).toFixed(1) + '%' : '0%';

    // Status pill
    const dpd = num(v.currentDpd);

    // Estimate current installment EMI (standard amortization)
    const r = num(v.annualInterestRatePercent);
    let emi = null, emiPrincipal = null, emiInterest = null, escrowDue = num(v.monthlyEscrow);
    if (principal != null && r != null && term != null && term > 0) {
      const monthlyRate = r / 100 / 12;
      if (monthlyRate === 0) {
        emi = principal / term;
        emiInterest = 0;
        emiPrincipal = emi;
      } else {
        emi = principal * monthlyRate * Math.pow(1 + monthlyRate, term) / (Math.pow(1 + monthlyRate, term) - 1);
        const outForCalc = outstanding != null ? outstanding : principal;
        emiInterest = outForCalc * monthlyRate;
        emiPrincipal = Math.max(0, emi - emiInterest);
      }
    }
    const installmentTotal = (emi != null ? emi : 0) + (escrowDue != null ? escrowDue : 0);

    // Total balance owed = outstanding principal + accrued interest carry + unpaid late fees + carry-over
    // (Approximation; real schedule needs the full amortization table.)
    const totalOwed = (outstanding != null ? outstanding : 0)
      + (carry != null ? carry : 0);

    // ── Ahead / Behind schedule calculation ──
    // expected installment = months between firstPaymentDate and today (capped at term).
    let scheduleDelta = null; // positive = ahead by N installments, negative = behind
    let expectedInst = null;
    if (v.firstPaymentDate && activeInst != null) {
      const m = String(v.firstPaymentDate).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) {
        const fp = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        const now = new Date();
        let monthsElapsed = (now.getFullYear() - fp.getFullYear()) * 12
          + (now.getMonth() - fp.getMonth());
        if (now.getDate() >= fp.getDate()) monthsElapsed += 1; // count current installment
        expectedInst = Math.max(0, Math.min(term || monthsElapsed, monthsElapsed));
        scheduleDelta = activeInst - expectedInst;
      }
    }
    const aheadMonths = scheduleDelta != null && scheduleDelta > 0 ? scheduleDelta : 0;
    const behindMonths = scheduleDelta != null && scheduleDelta < 0 ? -scheduleDelta : 0;

    // Status chip text — combine DPD and schedule delta
    let dueState = 'upcoming', dueStateLabel = 'Upcoming';
    if (lateFeePaid && lateFeePaid > 0 && (dpd != null && dpd > 0)) {
      dueState = 'late';
      dueStateLabel = `${dpd}d delinquent · late fees accruing`;
    } else if (dpd != null && dpd >= 30) {
      dueState = 'late';
      dueStateLabel = `${dpd} days delinquent`;
    } else if (dpd != null && dpd > 0) {
      dueState = 'past';
      dueStateLabel = `${dpd} days past due`;
    } else if (aheadMonths >= 1) {
      dueState = 'ahead';
      dueStateLabel = `${aheadMonths} ${aheadMonths === 1 ? 'month' : 'months'} ahead of schedule`;
    } else {
      dueState = 'current';
      dueStateLabel = 'On schedule';
    }

    let statusPill = `<span class="pill ok">Current</span>`;
    if (dueState === 'late')   statusPill = `<span class="pill danger">${escapeHtml(dueStateLabel)}</span>`;
    else if (dueState === 'past')  statusPill = `<span class="pill warn">${escapeHtml(dueStateLabel)}</span>`;
    else if (dueState === 'ahead') statusPill = `<span class="pill ahead">${escapeHtml(dueStateLabel)}</span>`;
    const worstPill = num(v.worstDpd) ? `<span class="pill">Worst DPD ${v.worstDpd}</span>` : '';
    const carryPill = carry && carry > 0 ? `<span class="pill warn">Carry-over ${fieldVal(carry, 'money')}</span>` : '';
    const lateFeePill = lateFeePaid && lateFeePaid > 0 ? `<span class="pill danger">Late fees ${fieldVal(lateFeePaid, 'money')}</span>` : '';

    // Due date for current installment (firstPaymentDate + (activeInst-1) months)
    let dueLabel = '—';
    if (v.firstPaymentDate && activeInst != null) {
      const m = String(v.firstPaymentDate).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) {
        const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        d.setMonth(d.getMonth() + (activeInst - 1));
        dueLabel = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      }
    }

    // Schedule strip — pinned around the active installment, with expected installment marked
    const totalForStrip = term || 0;
    const around = 3;
    const start = Math.max(1, (activeInst || 1) - around);
    const end = Math.min(totalForStrip, start + around * 2);
    const stripDots = [];
    if (totalForStrip > 0 && activeInst != null) {
      for (let i = start; i <= end; i++) {
        let cls = 'fut';
        if (i < activeInst) cls = 'paid';
        else if (i === activeInst) cls = (dueState === 'late' || dueState === 'past') ? 'due-late'
                                       : (dueState === 'ahead') ? 'due-ahead' : 'due';
        const isExpected = expectedInst != null && i === expectedInst && expectedInst !== activeInst;
        stripDots.push(`<div class="dot ${cls}${isExpected ? ' expected' : ''}" title="Installment ${i}${isExpected ? ' · expected today' : ''}">${i}</div>`);
      }
    }

    // ── Schedule callout (above installment card) — only when ahead/behind matters ──
    let scheduleCallout = '';
    if (aheadMonths >= 1) {
      const monthsSaved = aheadMonths;
      const interestSaved = (emi != null && emiInterest != null) ? emiInterest * monthsSaved * 0.6 : null;
      scheduleCallout = `
        <div class="pv-schedule ahead">
          <div class="ico"><i class="ri-flashlight-fill"></i></div>
          <div>
            <div class="t">Ahead of schedule</div>
            <div class="d">Member has paid <b>${monthsSaved}</b> ${monthsSaved === 1 ? 'installment' : 'installments'} more than required at this point in the term.${interestSaved ? ` Estimated <b>${fieldVal(interestSaved, 'money')}</b> in interest avoided so far.` : ''}</div>
            <div class="kv">
              <div><div class="l">Time gained</div><div class="v">~${monthsSaved} ${monthsSaved === 1 ? 'month' : 'months'}</div></div>
              <div><div class="l">At current pace, paid off</div><div class="v">${term && activeInst ? Math.max(0, term - activeInst) : '—'} mo to go</div></div>
              <div><div class="l">Expected installment</div><div class="v">#${expectedInst != null ? expectedInst : '—'}</div></div>
            </div>
          </div>
        </div>`;
    } else if (behindMonths >= 1) {
      scheduleCallout = `
        <div class="pv-schedule behind">
          <div class="ico"><i class="ri-time-line"></i></div>
          <div>
            <div class="t">Behind schedule</div>
            <div class="d">Member is <b>${behindMonths}</b> ${behindMonths === 1 ? 'installment' : 'installments'} behind the expected pace at this point in the term.${lateFeePaid && lateFeePaid > 0 ? ` Late fees totalling <b>${fieldVal(lateFeePaid, 'money')}</b> have already been collected.` : ''}</div>
            <div class="kv">
              <div><div class="l">Time lost</div><div class="v">~${behindMonths} ${behindMonths === 1 ? 'month' : 'months'}</div></div>
              <div><div class="l">Late fees paid</div><div class="v ${lateFeePaid > 0 ? 'danger' : ''}">${fieldVal(lateFeePaid, 'money')}</div></div>
              <div><div class="l">Expected installment</div><div class="v">#${expectedInst != null ? expectedInst : '—'}</div></div>
            </div>
          </div>
        </div>`;
    }

    return `
      <div class="pv-fhero bold ${dueState}">
        <div class="hl">
          <div class="ref-row">
            <span class="ref">${escapeHtml(v.loanReference || 'LN-—')}</span>
            <span class="status-chip ${dueState}">${escapeHtml(dueStateLabel)}</span>
          </div>
          <div class="lbl">Total balance owed</div>
          <div class="out">${'$' + (totalOwed != null ? totalOwed.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—')}</div>
          <div class="who">${escapeHtml(v.customerEmail || '—')} <span style="opacity:.5; padding:0 6px;">·</span> Site ${escapeHtml(v.siteId == null ? '—' : v.siteId)}</div>
          <div class="pill-row">${statusPill} ${lateFeePill} ${carryPill} ${worstPill}</div>
          ${pctPaid != null ? `
            <div class="dual-meters">
              <div class="dm">
                <div class="dm-l"><span>Principal repaid</span><span>${pctPaid}%</span></div>
                <div class="meter"><div style="width:${pctPaid}%"></div></div>
              </div>
              ${pctTime != null ? `
              <div class="dm">
                <div class="dm-l">
                  <span>Term elapsed</span>
                  <span>
                    ${activeInst} / ${term}
                    ${aheadMonths >= 1 ? `<span class="delta ahead">+${aheadMonths}</span>` : ''}
                    ${behindMonths >= 1 ? `<span class="delta behind">−${behindMonths}</span>` : ''}
                  </span>
                </div>
                <div class="meter alt">
                  <div style="width:${pctTime}%"></div>
                  ${expectedInst != null && term > 0 ? `<span class="expected-mark" style="left:${(expectedInst / term * 100).toFixed(1)}%" title="Expected today (#${expectedInst})"></span>` : ''}
                </div>
              </div>` : ''}
            </div>
          ` : ''}
        </div>
        <div class="hr">
          <div class="kv"><div class="lbl">Outstanding principal</div><div class="v">${fieldVal(outstanding, 'money')}</div></div>
          <div class="kv"><div class="lbl">Original loan</div><div class="v">${fieldVal(principal, 'money')}</div></div>
          <div class="kv"><div class="lbl">Rate</div><div class="v">${fieldVal(v.annualInterestRatePercent, 'percent')}</div></div>
          <div class="kv"><div class="lbl">Term</div><div class="v">${term != null ? term + ' mo' : '—'}</div></div>
        </div>
      </div>

      ${errorsBlock(errs)}

      ${scheduleCallout}

      ${activeInst != null ? `
      <div class="pv-inst ${dueState}">
        <div class="pv-inst-head">
          <div class="lh">
            <div class="lbl">Current installment</div>
            <div class="num">#${activeInst}${term ? ` of ${term}` : ''}</div>
          </div>
          <div class="rh">
            <div class="lbl">Due ${dueState === 'late' || dueState === 'past' ? 'on' : ''}</div>
            <div class="due">${escapeHtml(dueLabel)}</div>
            <div class="state ${dueState}">${escapeHtml(dueStateLabel)}</div>
          </div>
        </div>
        <div class="pv-inst-body">
          <div class="emi">
            <div class="lbl">Total due this installment</div>
            <div class="big">${emi != null ? '$' + installmentTotal.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}</div>
            <div class="sub">${emi != null ? 'EMI ' + fieldVal(emi, 'money') + (escrowDue ? ' + escrow ' + fieldVal(escrowDue, 'money') : '') : 'requires loan amount, rate and term'}</div>
          </div>
          <div class="splits">
            <div class="split"><div class="l">Principal</div><div class="v">${fieldVal(emiPrincipal, 'money')}</div></div>
            <div class="split"><div class="l">Interest</div><div class="v">${fieldVal(emiInterest, 'money')}</div></div>
            <div class="split"><div class="l">Escrow</div><div class="v">${fieldVal(escrowDue, 'money')}</div></div>
            ${carry && carry > 0 ? `<div class="split warn"><div class="l">Carry-over</div><div class="v">${fieldVal(carry, 'money')}</div></div>` : ''}
          </div>
        </div>
        ${stripDots.length ? `
        <div class="pv-inst-strip">
          ${start > 1 ? '<div class="dot ell">…</div>' : ''}
          ${stripDots.join('')}
          ${end < totalForStrip ? '<div class="dot ell">…</div>' : ''}
        </div>` : ''}
      </div>
      ` : ''}

      <div class="pv-bal">
        <div class="b principal">
          <div class="l">Outstanding principal</div>
          <div class="v">${fieldVal(outstanding, 'money')}</div>
          <div class="s">${pctPaid != null ? pctPaid + '% of principal repaid' : '—'}</div>
        </div>
        <div class="b">
          <div class="l">Principal paid</div>
          <div class="v">${fieldVal(principalPaid, 'money')}</div>
          <div class="s">to date</div>
        </div>
        <div class="b">
          <div class="l">Interest paid</div>
          <div class="v">${fieldVal(interestPaid, 'money')}</div>
          <div class="s">to date</div>
        </div>
        <div class="b ${(lateFeePaid && lateFeePaid > 0) ? 'danger' : ''}">
          <div class="l">Late fees paid</div>
          <div class="v">${fieldVal(lateFeePaid, 'money')}</div>
          <div class="s">${(lateFeePaid && lateFeePaid > 0) ? 'fees collected' : 'no late fees'}</div>
        </div>
      </div>

      <div class="pv-bdown">
        <h4>Repayments to date · breakdown</h4>
        <div class="bar">
          ${totalPaid > 0 ? `
            <span class="a" style="width:${(principalPaid || 0) / totalPaid * 100}%"></span>
            <span class="b" style="width:${(interestPaid || 0) / totalPaid * 100}%"></span>
            <span class="c" style="width:${(escrowPaid || 0) / totalPaid * 100}%"></span>
            <span class="d" style="width:${(lateFeePaid || 0) / totalPaid * 100}%"></span>
          ` : ''}
        </div>
        <div class="legend">
          <span><i class="sw" style="background:var(--color-brand-500);"></i> Principal <b>${fieldVal(principalPaid, 'money')}</b> · ${seg(principalPaid)}</span>
          <span><i class="sw" style="background:var(--color-brand-300);"></i> Interest <b>${fieldVal(interestPaid, 'money')}</b> · ${seg(interestPaid)}</span>
          <span><i class="sw" style="background:var(--color-grey-400);"></i> Escrow <b>${fieldVal(escrowPaid, 'money')}</b> · ${seg(escrowPaid)}</span>
          <span><i class="sw" style="background:var(--color-error-500);"></i> Late fees <b>${fieldVal(lateFeePaid, 'money')}</b> · ${seg(lateFeePaid)}</span>
        </div>
      </div>

      <div class="pv-section">
        <h4>Schedule</h4>
        <div class="pv-grid">
          ${field('First payment', v.firstPaymentDate, 'string', errs.firstPaymentDate)}
          ${field('Term', v.loanTermInMonths != null ? v.loanTermInMonths + ' months' : null, 'string', errs.loanTermInMonths)}
          ${field('Active installment', v.activeInstallmentNumber, 'number', errs.activeInstallmentNumber)}
          ${field('Down payment', v.downPayment, 'money', errs.downPayment)}
          ${field('Monthly escrow', v.monthlyEscrow, 'money', errs.monthlyEscrow)}
          ${field('Carry-over', v.carryOverAmount, 'money', errs.carryOverAmount)}
        </div>
      </div>

      <div class="pv-section">
        <h4>Delinquency</h4>
        <div class="pv-grid">
          ${field('Current DPD', v.currentDpd, 'number', errs.currentDpd)}
          ${field('Worst DPD', v.worstDpd, 'number', errs.worstDpd)}
          ${field('Officer', v.officerCode, 'string', errs.officerCode)}
        </div>
      </div>

      ${v.notes ? `<div class="pv-section"><h4>Notes</h4><div style="font-size:13px; color:var(--color-grey-800); line-height:1.55;">${escapeHtml(v.notes)}</div></div>` : ''}
    `;
  }
  function num(v) { return typeof v === 'number' ? v : null; }

  // Backdrop click to close
  document.getElementById('prevBack').addEventListener('click', e => {
    if (e.target === e.currentTarget) closePrev();
  });
  // Esc to close (in addition to global ESC handler above)
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closePrev();
    if (!document.getElementById('prevBack').classList.contains('open')) return;
    if (e.key === 'ArrowRight') document.getElementById('prevNext').click();
    if (e.key === 'ArrowLeft')  document.getElementById('prevPrev').click();
  });

  // Initial render
  ['sites','members','contracts'].forEach(renderPanel);
  updateTabCounts();
})();
