/* ============================================================
   LOAN IMPORT WIZARD — "Register existing loan"
   Two-phase workflow (submit → verify), live reconciliation
   panel, synthetic ledger entry preview.

   Usage:
     window.LoanImportWizard.open();
   Or click any [data-rw-open="loan"] (we override the default).
   ============================================================ */
(function () {
  'use strict';

  // ---------- Defaults (mirror proposal §3 sample payload) ----
  var DEFAULTS = {
    legacyLoanId: 'LX-2019-00471',
    legacySystem: 'acmelos:3.4',
    importBatch:  'batch-2026-05-11-001',
    idempotencyKey: 'import:LX-2019-00471:2026-05-11',
    sourceFingerprint: 'sha256:b41c…d9f2',
    asOfDate: '2026-05-11',
    importedBy: 'ops-ana · membership #17',
    importNote: 'Migrated from AcmeLOS go-live wave 2.',

    contractMode: 'create',
    contractIdHint: '',
    buyerLabel: 'Anna Thompson · member #9001',
    siteLabel:  'Sunridge · Plot 09 · site #310',
    productLabel: 'Hilltop Plan · 15-yr · fixed',

    originationDate: '2019-03-15',
    firstPaymentDate: '2019-04-15',
    lastPaymentDate: '2034-03-15',
    paymentDay: 15,
    loanTermInMonths: 180,
    totalAmount: 240000,
    downPayment: 48000,
    annualInterestRate: 6.25,
    interestMethod: 'FIXED_ACTUARIAL',
    dayCountConvention: '30_360',
    monthlyPayment: 1648.27,
    monthlyEscrow: 182.50,

    lateEnabled: true,
    lateMethod: 'FLAT',
    lateFlatAmount: 50,
    lateGraceDays: 10,
    lateFrequency: 'ONCE_PER_OVERDUE_INSTALLMENT',
    lateAppliesFromAsOf: true,

    paid: {
      principal: 57340.18,
      interest:  62110.42,
      escrow:    15330.00,
      lateFee:     150.00,
      writeOff:      0.00,
      waived:        0.00,
      carryOver:    75.32
    },

    fullyPaid: 84,
    currentInstNum: 85,
    currentDueDate: '2026-05-15',
    nextDueDate:    '2026-06-15',
    currentExpected: { principal: 850.13, interest: 798.14, escrow: 182.50, lateFee: 0 },
    currentPaid:     { total: 0, principal: 0, interest: 0, escrowFee: 0 },
    currentDpd: 0,
    worstDpd: 27,
    lastPaymentDate: '2026-04-15',
    lastPaymentAmount: 1830.77,
    inDispute: false,
    forbearance: 'none',
    forbearanceEnds: '',

    expected: {
      principal: 134659.82,
      interest:   29889.58,
      escrow:         0.00,
      lateFee:        0.00,
      payoff:    164549.40
    },
    tolerance: { absolute: 0.50, relativeBp: 1.0 }
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function fmtUSD(n) {
    if (!isFinite(n)) return '—';
    var s = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (n < 0 ? '-' : '') + '$' + s;
  }
  function fmtSigned(n) {
    if (!isFinite(n)) return '—';
    var sign = n === 0 ? '' : (n > 0 ? '+' : '-');
    return sign + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function escHtml(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]; }); }

  // ---------- Reconciliation math ---------------------------
  // For the demo we use a simple, deterministic model: the
  // "Ream-computed" outstandings move 1:1 against any change to
  // cumulative paid totals. With defaults they match the legacy
  // figures exactly. When the operator edits a Paid total away
  // from default, the corresponding outstanding drifts and we
  // flag it.
  function compute(state) {
    var p = state.paid;
    var dp = DEFAULTS.paid;
    var ream = {
      principal: state.expected.principal + (dp.principal - p.principal) + (dp.writeOff - p.writeOff),
      interest:  state.expected.interest  + (dp.interest  - p.interest),
      escrow:    state.expected.escrow    + (dp.escrow    - p.escrow),
      lateFee:   state.expected.lateFee   + (dp.lateFee   - p.lateFee)
    };
    ream.payoff = ream.principal + ream.interest + ream.escrow + ream.lateFee;
    var deltas = {
      principal: ream.principal - state.expected.principal,
      interest:  ream.interest  - state.expected.interest,
      escrow:    ream.escrow    - state.expected.escrow,
      lateFee:   ream.lateFee   - state.expected.lateFee,
      payoff:    ream.payoff    - state.expected.payoff
    };
    function pass(delta, expected) {
      var abs = Math.abs(delta);
      var absOk = abs <= state.tolerance.absolute;
      var relOk;
      if (Math.abs(expected) < 0.005) {
        relOk = abs <= state.tolerance.absolute;
      } else {
        relOk = (abs / Math.abs(expected)) * 10000 <= state.tolerance.relativeBp;
      }
      return absOk && relOk;
    }
    var checks = {
      principal: pass(deltas.principal, state.expected.principal),
      interest:  pass(deltas.interest,  state.expected.interest),
      escrow:    pass(deltas.escrow,    state.expected.escrow),
      lateFee:   pass(deltas.lateFee,   state.expected.lateFee),
      payoff:    pass(deltas.payoff,    state.expected.payoff)
    };
    var allPass = checks.principal && checks.interest && checks.escrow && checks.lateFee && checks.payoff;
    return { ream: ream, deltas: deltas, checks: checks, allPass: allPass };
  }

  // ---------- Field-rendering helpers -----------------------
  function f(opts) {
    var labelExtra = '';
    if (opts.required) labelExtra = ' <span class="req">*</span>';
    else if (opts.optional) labelExtra = ' <span class="opt">— optional</span>';
    var hint = opts.hint ? '<span class="hint">' + opts.hint + '</span>' : '';

    var attrs = '';
    if (opts.bind) attrs += ' data-li-bind="' + opts.bind + '"';
    if (opts.type) attrs += ' type="' + opts.type + '"';
    if (opts.placeholder) attrs += ' placeholder="' + escHtml(opts.placeholder) + '"';
    if (opts.value != null) attrs += ' value="' + escHtml(opts.value) + '"';
    if (opts.step != null) attrs += ' step="' + opts.step + '"';
    if (opts.min != null) attrs += ' min="' + opts.min + '"';
    if (opts.inputmode) attrs += ' inputmode="' + opts.inputmode + '"';
    if (opts.readonly) attrs += ' readonly';

    var cls = 'li-input' + (opts.mono ? ' mono' : '');

    var inner;
    if (opts.kind === 'select') {
      var options = (opts.options || []).map(function (o) {
        if (typeof o === 'string') return '<option>' + escHtml(o) + '</option>';
        return '<option value="' + escHtml(o.v) + '"' + (o.selected ? ' selected' : '') + '>' + escHtml(o.l) + '</option>';
      }).join('');
      inner = '<select class="li-select"' + (opts.bind ? ' data-li-bind="' + opts.bind + '"' : '') + '>' + options + '</select>';
    } else if (opts.kind === 'textarea') {
      inner = '<textarea class="li-textarea"' + (opts.bind ? ' data-li-bind="' + opts.bind + '"' : '') + (opts.placeholder ? ' placeholder="' + escHtml(opts.placeholder) + '"' : '') + (opts.rows ? ' rows="' + opts.rows + '"' : '') + '>' + escHtml(opts.value || '') + '</textarea>';
    } else if (opts.kind === 'date') {
      inner = '<input class="' + cls + '" type="date"' + attrs.replace(/ type="[^"]*"/, '') + ' />';
    } else if (opts.suffix) {
      inner = '<div class="li-suffix"><input class="' + cls + '"' + attrs + ' /><span class="suf">' + escHtml(opts.suffix) + '</span></div>';
    } else {
      inner = '<input class="' + cls + '"' + attrs + ' />';
    }

    return '<div class="li-f"><label>' + opts.label + labelExtra + '</label>' + inner + hint + '</div>';
  }
  function row(arr, mod) { return '<div class="li-row' + (mod ? ' ' + mod : '') + '">' + arr.join('') + '</div>'; }
  function section(title, pill) {
    return '<div class="li-section-head"><span>' + title + '</span>' + (pill ? '<span class="pill">' + pill + '</span>' : '') + '</div>';
  }
  function radioGrid(name, items, current, mod) {
    var html = items.map(function (it) {
      var active = it.v === current;
      return '<label' + (active ? ' class="active"' : '') + ' data-li-radio="' + name + '" data-v="' + it.v + '"><input type="radio" name="' + name + '" value="' + it.v + '"' + (active ? ' checked' : '') + ' /><span class="rt">' + it.l + '</span>' + (it.s ? '<span class="rs">' + it.s + '</span>' : '') + '</label>';
    }).join('');
    return '<div class="li-radio-grid' + (mod ? ' ' + mod : '') + '">' + html + '</div>';
  }

  // ---------- Step definitions ------------------------------
  var STEPS = [
    {
      label: 'Source', desc: 'Legacy ID & cutover',
      ti: 'Source system & cutover',
      sb: 'Where the loan is being migrated from. The as-of date locks the snapshot — every total below is reconciled against this exact moment in time.',
      html: function (s) { return [
        section('Legacy origin'),
        row([
          f({ kind: 'input', label: 'Legacy loan ID', placeholder: 'LX-2019-00471', value: s.legacyLoanId, bind: 'legacyLoanId', required: true, mono: true, hint: 'Opaque string from your prior LOS. Appears alongside the new Ream loan ID forever.' }),
          f({ kind: 'select', label: 'Source system', bind: 'legacySystem', required: true,
            options: [
              { v: 'acmelos:3.4', l: 'AcmeLOS · v3.4', selected: s.legacySystem === 'acmelos:3.4' },
              { v: 'mortgagebot:8.2', l: 'MortgageBot · v8.2', selected: s.legacySystem === 'mortgagebot:8.2' },
              { v: 'encompass:21.3', l: 'Encompass · v21.3', selected: s.legacySystem === 'encompass:21.3' },
              { v: 'custom', l: 'Custom / in-house', selected: s.legacySystem === 'custom' },
              { v: 'spreadsheet', l: 'Spreadsheet / manual', selected: s.legacySystem === 'spreadsheet' }
            ] })
        ]),
        row([
          f({ kind: 'input', label: 'Import batch', value: s.importBatch, bind: 'importBatch', hint: 'Groups co-imported loans for rollback if anything goes wrong.' }),
          f({ kind: 'date', label: 'As-of date (cutover)', value: s.asOfDate, bind: 'asOfDate', required: true, hint: 'Midnight UTC. Balances and DPD are evaluated as of this instant.' })
        ]),
        section('Audit trail', 'auto-derived'),
        row([
          f({ kind: 'input', label: 'Idempotency key', value: s.idempotencyKey, bind: 'idempotencyKey', mono: true, readonly: true, hint: 'Auto-built from legacy ID + as-of date. Replays with the same key are no-ops.' }),
          f({ kind: 'input', label: 'Submitter', value: s.importedBy, readonly: true, hint: 'You — pulled from your session. A different admin will verify.' })
        ]),
        f({ kind: 'input', label: 'Source fingerprint', value: s.sourceFingerprint, mono: true, readonly: true, hint: 'SHA-256 of the source row. Flags drift if the same legacy ID is re-imported with different content.' }),
        f({ kind: 'textarea', label: 'Import note', value: s.importNote, bind: 'importNote', rows: 2, optional: true, placeholder: 'Anything the next reviewer should know.' })
      ].join(''); }
    },

    {
      label: 'Parties', desc: 'Borrower, site, product',
      ti: 'Parties & collateral',
      sb: 'Link the loan to existing records in Ream — the buyer, the financed property, and the Ream-side loan product if one matches.',
      html: function (s) { return [
        section('Contract linkage'),
        radioGrid('contractMode', [
          { v: 'create', l: 'Create new contract', s: 'Build a fresh contract record from these terms (default).' },
          { v: 'attach', l: 'Attach to existing contract', s: 'Reuse a draft contract already in Ream (provide its ID).' }
        ], s.contractMode, 'two'),
        f({ kind: 'input', label: 'Contract ID hint', value: s.contractIdHint, bind: 'contractIdHint', placeholder: 'Only when attaching', optional: true, hint: 'Leave blank to create. If provided, the loan is attached to this contract instead.' }),
        section('Parties'),
        row([
          f({ kind: 'select', label: 'Buyer (member)', bind: 'buyerLabel', required: true,
            options: [
              { v: 'Anna Thompson · member #9001', l: 'Anna Thompson · member #9001', selected: true },
              { v: 'Marcus Owusu · #9018', l: 'Marcus Owusu · #9018' },
              { v: 'Sade Bankole · #9027', l: 'Sade Bankole · #9027' },
              { v: 'Create new member…', l: 'Create new member…' }
            ], hint: 'Borrower of record. Sets buyerMemberId on the contract.' }),
          f({ kind: 'input', label: 'Buyer KYC status', value: 'Verified · 2024-02-11', readonly: true, hint: 'Carried from the legacy export. Update on the member profile if stale.' })
        ]),
        section('Collateral & product'),
        row([
          f({ kind: 'select', label: 'Site (collateral)', bind: 'siteLabel', required: true,
            options: [
              { v: 'Sunridge · Plot 09 · site #310', l: 'Sunridge · Plot 09 · #310', selected: true },
              { v: 'Sunridge · Villa 14B · #311', l: 'Sunridge · Villa 14B · #311' },
              { v: 'Oakwood · Plot 22 · #420', l: 'Oakwood · Plot 22 · #420' },
              { v: 'Not linked to a site', l: 'Not linked to a site' }
            ], hint: 'Property the loan is secured against.' }),
          f({ kind: 'select', label: 'Loan product (Ream-side)', bind: 'productLabel', optional: true,
            options: [
              { v: 'Hilltop Plan · 15-yr · fixed', l: 'Hilltop Plan · 15-yr · fixed', selected: true },
              { v: 'Standard Land · 15-yr · fixed', l: 'Standard Land · 15-yr · fixed' },
              { v: 'Flex Mortgage · 25-yr · variable', l: 'Flex Mortgage · 25-yr · variable' },
              { v: 'No matching product — bespoke', l: 'No matching product — bespoke' }
            ], hint: 'Optional. Sets loanProductId for downstream reporting.' })
        ])
      ].join(''); }
    },

    {
      label: 'Contract', desc: 'Terms, rate, schedule',
      ti: 'Contract terms',
      sb: 'The loan as it was signed. These values become the immutable contract snapshot — they are also what Ream\'s amortisation engine will use to derive interest going forward.',
      html: function (s) { return [
        section('Dates & schedule'),
        row([
          f({ kind: 'date', label: 'Origination date', value: s.originationDate, bind: 'originationDate', required: true, hint: 'When the loan started.' }),
          f({ kind: 'date', label: 'First payment date', value: s.firstPaymentDate, bind: 'firstPaymentDate', required: true })
        ]),
        row([
          f({ kind: 'date', label: 'Last payment date', value: s.lastPaymentDate, bind: 'lastPaymentDate', required: true, hint: 'Final scheduled installment.' }),
          f({ kind: 'input', label: 'Payment day', type: 'number', step: '1', min: '1', value: s.paymentDay, bind: 'paymentDay', suffix: 'of month', required: true })
        ]),
        f({ kind: 'input', label: 'Loan term', type: 'number', step: '1', value: s.loanTermInMonths, bind: 'loanTermInMonths', suffix: 'months', required: true }),
        section('Principal'),
        row([
          f({ kind: 'select', label: 'Currency', required: true,
            options: [{ v: 'USD', l: 'USD $', selected: true }, { v: 'GHS', l: 'GHS ₵' }, { v: 'NGN', l: 'NGN ₦' }, { v: 'KES', l: 'KES KSh' }, { v: 'ZAR', l: 'ZAR R' }] }),
          f({ kind: 'input', label: 'Total amount', type: 'number', step: '0.01', value: s.totalAmount.toFixed(2), bind: 'totalAmount', suffix: 'USD', required: true, hint: 'Full loan amount at origination.' })
        ]),
        f({ kind: 'input', label: 'Down payment at origination', type: 'number', step: '0.01', value: s.downPayment.toFixed(2), bind: 'downPayment', suffix: 'USD', required: true }),
        section('Rate'),
        row([
          f({ kind: 'input', label: 'Annual interest rate', type: 'number', step: '0.001', value: s.annualInterestRate.toFixed(3), bind: 'annualInterestRate', suffix: '% APR', required: true, hint: '6.25% → stored as 0.0625.' }),
          f({ kind: 'select', label: 'Interest method', bind: 'interestMethod', required: true,
            options: [
              { v: 'FIXED_ACTUARIAL', l: 'Fixed · Actuarial (US Rule)', selected: s.interestMethod === 'FIXED_ACTUARIAL' },
              { v: 'FIXED_FRENCH',    l: 'Fixed · French / Equal-installment', selected: s.interestMethod === 'FIXED_FRENCH' },
              { v: 'FIXED_SIMPLE',    l: 'Fixed · Simple interest', selected: s.interestMethod === 'FIXED_SIMPLE' },
              { v: 'FIXED_ADD_ON',    l: 'Fixed · Add-on interest', selected: s.interestMethod === 'FIXED_ADD_ON' },
              { v: 'VARIABLE_INDEX',  l: 'Variable · Indexed', selected: s.interestMethod === 'VARIABLE_INDEX' }
            ] })
        ]),
        f({ kind: 'select', label: 'Day-count convention', bind: 'dayCountConvention', required: true,
          options: [
            { v: '30_360',        l: '30/360 (US bond)', selected: s.dayCountConvention === '30_360' },
            { v: 'ACTUAL_360',    l: 'Actual/360',       selected: s.dayCountConvention === 'ACTUAL_360' },
            { v: 'ACTUAL_365',    l: 'Actual/365 (fixed)', selected: s.dayCountConvention === 'ACTUAL_365' },
            { v: 'ACTUAL_ACTUAL', l: 'Actual/Actual (ISDA)', selected: s.dayCountConvention === 'ACTUAL_ACTUAL' }
          ], hint: 'Record what the legacy used so future installments match the borrower\'s expectation.' }),
        section('Periodic amounts'),
        row([
          f({ kind: 'input', label: 'Monthly payment (P+I)', type: 'number', step: '0.01', value: s.monthlyPayment.toFixed(2), bind: 'monthlyPayment', suffix: 'USD', required: true }),
          f({ kind: 'input', label: 'Monthly escrow', type: 'number', step: '0.01', value: s.monthlyEscrow.toFixed(2), bind: 'monthlyEscrow', suffix: 'USD', hint: 'Taxes + insurance held in escrow. Zero if not escrowed.' })
        ])
      ].join(''); }
    },

    {
      label: 'Late fees', desc: 'Policy & grace',
      ti: 'Late-fee policy',
      sb: 'How overdue installments accrue fees. Toggle off entirely if the loan has no late-fee terms.',
      html: function (s) { return [
        radioGrid('lateEnabled', [
          { v: 'on',  l: 'Late fees enabled', s: 'Overdue installments accrue a fee.' },
          { v: 'off', l: 'No late fees', s: 'Loan has no late-fee terms.' }
        ], s.lateEnabled ? 'on' : 'off', 'two'),
        '<div data-li-late-on>',
          section('Fee terms'),
          row([
            f({ kind: 'select', label: 'Method', bind: 'lateMethod', required: true,
              options: [
                { v: 'FLAT', l: 'Flat amount per overdue installment', selected: s.lateMethod === 'FLAT' },
                { v: 'PERCENT_OF_INSTALLMENT', l: '% of the overdue installment', selected: s.lateMethod === 'PERCENT_OF_INSTALLMENT' },
                { v: 'PERCENT_OF_OVERDUE', l: '% of the overdue balance', selected: s.lateMethod === 'PERCENT_OF_OVERDUE' }
              ] }),
            f({ kind: 'input', label: 'Flat amount', type: 'number', step: '0.01', value: s.lateFlatAmount.toFixed(2), bind: 'lateFlatAmount', suffix: 'USD', required: true })
          ]),
          row([
            f({ kind: 'input', label: 'Grace period', type: 'number', step: '1', value: s.lateGraceDays, bind: 'lateGraceDays', suffix: 'days', required: true, hint: 'Days after due date before a fee is assessed.' }),
            f({ kind: 'select', label: 'Assessment frequency', bind: 'lateFrequency', required: true,
              options: [
                { v: 'ONCE_PER_OVERDUE_INSTALLMENT', l: 'Once per overdue installment', selected: s.lateFrequency === 'ONCE_PER_OVERDUE_INSTALLMENT' },
                { v: 'MONTHLY_WHILE_OVERDUE', l: 'Monthly while overdue', selected: s.lateFrequency === 'MONTHLY_WHILE_OVERDUE' },
                { v: 'DAILY_WHILE_OVERDUE', l: 'Daily while overdue', selected: s.lateFrequency === 'DAILY_WHILE_OVERDUE' }
              ] })
          ]),
          f({ kind: 'select', label: 'Backdate to historical arrears?', bind: 'lateAppliesFromAsOf',
            options: [
              { v: 'true',  l: 'No — apply this policy from the as-of date forward only', selected: s.lateAppliesFromAsOf },
              { v: 'false', l: 'Yes — historical fees already captured in cumulative paid below', selected: !s.lateAppliesFromAsOf }
            ], hint: 'When forward-only, Ream only assesses new fees after the cutover.' }),
        '</div>',
        '<div data-li-late-off>',
          '<div class="li-note info"><i class="ri-information-line"></i><div><span class="nt">No late fees on this loan.</span> The late-fee assessor will be skipped on this loan even after the cutover. You can change this later from the loan settings.</div></div>',
        '</div>'
      ].join(''); },
      onMount: function (scope, state) {
        function refresh() {
          scope.parentElement.classList.toggle('late-disabled', !state.lateEnabled);
        }
        scope.querySelectorAll('[data-li-radio="lateEnabled"]').forEach(function (lbl) {
          lbl.addEventListener('click', function () {
            state.lateEnabled = lbl.dataset.v === 'on';
            refresh();
          });
        });
        refresh();
      }
    },

    {
      label: 'Paid totals', desc: 'Cumulative · as-of date',
      ti: 'Cumulative paid totals',
      sb: 'Every dollar the borrower has paid against this loan up to and including the as-of date, split by component. Edit any value and watch the reconciliation panel on the right update live.',
      html: function (s) { return [
        '<div class="li-note info"><i class="ri-equalizer-2-line"></i><div><span class="nt">Live reconciliation</span> Each component below feeds the Ream-side outstanding total on the right. Any drift from the legacy expected totals (entered on the Reconcile step) appears immediately.</div></div>',
        section('Allocated by component'),
        row([
          f({ kind: 'input', label: 'Principal', type: 'number', step: '0.01', value: s.paid.principal.toFixed(2), bind: 'paid.principal', suffix: 'USD', required: true }),
          f({ kind: 'input', label: 'Interest',  type: 'number', step: '0.01', value: s.paid.interest.toFixed(2),  bind: 'paid.interest',  suffix: 'USD', required: true })
        ]),
        row([
          f({ kind: 'input', label: 'Escrow',    type: 'number', step: '0.01', value: s.paid.escrow.toFixed(2),    bind: 'paid.escrow',    suffix: 'USD' }),
          f({ kind: 'input', label: 'Late fees', type: 'number', step: '0.01', value: s.paid.lateFee.toFixed(2),   bind: 'paid.lateFee',   suffix: 'USD' })
        ]),
        section('Adjustments (non-cash debits)'),
        row([
          f({ kind: 'input', label: 'Declared write-offs', type: 'number', step: '0.01', value: s.paid.writeOff.toFixed(2), bind: 'paid.writeOff', suffix: 'USD', hint: 'Principal written down on the legacy side.' }),
          f({ kind: 'input', label: 'Declared waivers',    type: 'number', step: '0.01', value: s.paid.waived.toFixed(2),   bind: 'paid.waived',   suffix: 'USD', hint: 'Fees or interest formally waived.' })
        ]),
        f({ kind: 'input', label: 'Carry-over credit', type: 'number', step: '0.01', value: s.paid.carryOver.toFixed(2), bind: 'paid.carryOver', suffix: 'USD', hint: 'Unallocated cash sitting on the loan — applied to the next installment.' })
      ].join(''); }
    },

    {
      label: 'Schedule', desc: 'Installment & delinquency',
      ti: 'Schedule position & delinquency',
      sb: 'Where the borrower sits in the amortisation schedule on the as-of date, and how delinquent they are. Drives the next-due reminders and DPD reporting.',
      html: function (s) { return [
        section('Schedule position'),
        row([
          f({ kind: 'input', label: 'Fully-paid installments', type: 'number', step: '1', value: s.fullyPaid, bind: 'fullyPaid', suffix: 'of ' + s.loanTermInMonths, required: true, hint: 'Closed periods. Ream synthesises CLOSED installments for these.' }),
          f({ kind: 'input', label: 'Current installment #', type: 'number', step: '1', value: s.currentInstNum, bind: 'currentInstNum', required: true, hint: '1-based. The installment due on the as-of date.' })
        ]),
        row([
          f({ kind: 'date', label: 'Current installment due', value: s.currentDueDate, bind: 'currentDueDate', required: true }),
          f({ kind: 'date', label: 'Next installment due', value: s.nextDueDate, bind: 'nextDueDate', required: true, hint: 'Sanity check on cadence.' })
        ]),
        section('Current installment — expected'),
        row([
          f({ kind: 'input', label: 'Principal', type: 'number', step: '0.01', value: s.currentExpected.principal.toFixed(2), bind: 'currentExpected.principal', suffix: 'USD' }),
          f({ kind: 'input', label: 'Interest',  type: 'number', step: '0.01', value: s.currentExpected.interest.toFixed(2),  bind: 'currentExpected.interest',  suffix: 'USD' })
        ]),
        row([
          f({ kind: 'input', label: 'Escrow',    type: 'number', step: '0.01', value: s.currentExpected.escrow.toFixed(2),    bind: 'currentExpected.escrow',    suffix: 'USD' }),
          f({ kind: 'input', label: 'Late fee',  type: 'number', step: '0.01', value: s.currentExpected.lateFee.toFixed(2),   bind: 'currentExpected.lateFee',   suffix: 'USD' })
        ]),
        section('Already paid against current (partial)'),
        row([
          f({ kind: 'input', label: 'Total paid',       type: 'number', step: '0.01', value: s.currentPaid.total.toFixed(2),     bind: 'currentPaid.total',     suffix: 'USD', hint: 'Leave at 0 if fully unpaid.' }),
          f({ kind: 'input', label: 'Principal portion', type: 'number', step: '0.01', value: s.currentPaid.principal.toFixed(2), bind: 'currentPaid.principal', suffix: 'USD' })
        ]),
        row([
          f({ kind: 'input', label: 'Interest portion',         type: 'number', step: '0.01', value: s.currentPaid.interest.toFixed(2),  bind: 'currentPaid.interest',  suffix: 'USD' }),
          f({ kind: 'input', label: 'Escrow / late fee portion', type: 'number', step: '0.01', value: s.currentPaid.escrowFee.toFixed(2), bind: 'currentPaid.escrowFee', suffix: 'USD' })
        ]),
        section('Delinquency snapshot'),
        row([
          f({ kind: 'input', label: 'Current DPD', type: 'number', step: '1', value: s.currentDpd, bind: 'currentDpd', suffix: 'days', required: true, hint: 'Days past due from earliest unpaid installment.' }),
          f({ kind: 'input', label: 'Worst DPD (lifetime)', type: 'number', step: '1', value: s.worstDpd, bind: 'worstDpd', suffix: 'days', hint: 'Monotonic high-water mark — never decreases.' })
        ]),
        row([
          f({ kind: 'date', label: 'Last payment date', value: s.lastPaymentDate, bind: 'lastPaymentDate', required: true }),
          f({ kind: 'input', label: 'Last payment amount', type: 'number', step: '0.01', value: s.lastPaymentAmount.toFixed(2), bind: 'lastPaymentAmount', suffix: 'USD', required: true })
        ]),
        row([
          f({ kind: 'select', label: 'In dispute?', bind: 'inDispute',
            options: [{ v: 'false', l: 'No', selected: !s.inDispute }, { v: 'true', l: 'Yes — active dispute', selected: s.inDispute }] }),
          f({ kind: 'select', label: 'Forbearance', bind: 'forbearance',
            options: [
              { v: 'none', l: 'None', selected: s.forbearance === 'none' },
              { v: 'covid', l: 'COVID-era forbearance', selected: s.forbearance === 'covid' },
              { v: 'hardship', l: 'Hardship program', selected: s.forbearance === 'hardship' },
              { v: 'natural', l: 'Natural disaster', selected: s.forbearance === 'natural' },
              { v: 'other', l: 'Other', selected: s.forbearance === 'other' }
            ], hint: 'Active forbearance suppresses late-fee assessment.' })
        ])
      ].join(''); }
    },

    {
      label: 'Reconcile', desc: 'Legacy expected + tolerance',
      ti: 'Reconciliation gate',
      sb: 'The legacy system\'s reported outstanding totals. Ream re-derives these from your contract terms + paid-to-date and refuses the import if they disagree beyond the tolerance you set. The panel on the right always shows the current delta.',
      html: function (s) { return [
        section('Expected from legacy'),
        row([
          f({ kind: 'input', label: 'Outstanding principal', type: 'number', step: '0.01', value: s.expected.principal.toFixed(2), bind: 'expected.principal', suffix: 'USD', required: true }),
          f({ kind: 'input', label: 'Outstanding interest',  type: 'number', step: '0.01', value: s.expected.interest.toFixed(2),  bind: 'expected.interest',  suffix: 'USD', required: true })
        ]),
        row([
          f({ kind: 'input', label: 'Outstanding escrow',    type: 'number', step: '0.01', value: s.expected.escrow.toFixed(2),    bind: 'expected.escrow',    suffix: 'USD' }),
          f({ kind: 'input', label: 'Outstanding late fees', type: 'number', step: '0.01', value: s.expected.lateFee.toFixed(2),   bind: 'expected.lateFee',   suffix: 'USD' })
        ]),
        f({ kind: 'input', label: 'Total payoff amount', type: 'number', step: '0.01', value: s.expected.payoff.toFixed(2), bind: 'expected.payoff', suffix: 'USD', required: true, hint: 'What the borrower would pay today to fully close the loan.' }),
        section('Tolerance', 'org default'),
        row([
          f({ kind: 'input', label: 'Absolute tolerance', type: 'number', step: '0.01', value: s.tolerance.absolute.toFixed(2), bind: 'tolerance.absolute', suffix: 'USD', hint: 'Per-balance acceptable drift in dollars.' }),
          f({ kind: 'input', label: 'Relative tolerance', type: 'number', step: '0.1', value: s.tolerance.relativeBp.toFixed(1), bind: 'tolerance.relativeBp', suffix: 'bp', hint: '1 bp = 0.01%. 0.0001 in the payload.' })
        ]),
        '<div class="li-note warn"><i class="ri-error-warning-line"></i><div><span class="nt">Reconciliation is enforced both at submission and at verification.</span> If Ream\'s re-derived totals drift beyond the tolerance above, the import refuses to materialise and stays in the staging queue for review.</div></div>'
      ].join(''); }
    },

    {
      label: 'Documents', desc: 'Attachments & history',
      ti: 'Supporting documents',
      sb: 'Required and optional paperwork. Files are tied to the migrated loan and appear in its document tab.',
      html: function (s) { return [
        section('Required'),
        '<div class="li-upload">' +
          '<div class="ic"><i class="ri-file-paper-2-line"></i></div>' +
          '<div><div class="ti">Original contract</div><div class="sb">Signed loan agreement PDF. Attachment category <code>ORIGINAL_CONTRACT</code>.</div></div>' +
          '<button class="btn" type="button"><i class="ri-upload-2-line"></i> Upload</button>' +
        '</div>',
        '<div class="li-upload">' +
          '<div class="ic"><i class="ri-receipt-line"></i></div>' +
          '<div><div class="ti">Legacy payoff statement</div><div class="sb">Dated on or after the as-of date. Category <code>LEGACY_PAYOFF_STATEMENT</code>.</div></div>' +
          '<button class="btn" type="button"><i class="ri-upload-2-line"></i> Upload</button>' +
        '</div>',
        section('Optional'),
        '<div class="li-upload">' +
          '<div class="ic"><i class="ri-history-line"></i></div>' +
          '<div><div class="ti">Payment history export</div><div class="sb">CSV of historical payments. If supplied, Ream uses it to split the synthetic ledger entry by year for tax statements.</div></div>' +
          '<button class="btn" type="button"><i class="ri-upload-2-line"></i> Upload</button>' +
        '</div>',
        '<div class="li-upload">' +
          '<div class="ic"><i class="ri-mail-line"></i></div>' +
          '<div><div class="ti">Borrower notification letter</div><div class="sb">Migration notice sent to the borrower. Optional.</div></div>' +
          '<button class="btn" type="button"><i class="ri-upload-2-line"></i> Upload</button>' +
        '</div>',
        section('Annual buckets (optional)'),
        '<div style="font:12.5px var(--font-sans); color:var(--fg3); line-height:1.55;">Year-by-year P / I / E totals from the legacy system. Drives prior-year tax statements without re-deriving from scratch.</div>',
        f({ kind: 'textarea', label: 'Annual buckets (year, principalPaid, interestPaid, escrowPaid)', placeholder: '2019, 2114.18, 11320.42, 1642.50\n2020, 7298.40, 13412.10, 2190.00\n…', optional: true, rows: 3 })
      ].join(''); }
    },

    {
      label: 'Submit', desc: 'Stage for verification',
      ti: 'Cutover report · ready to submit',
      sb: 'Your submission lands as a Pending Loan Import for verification. A different admin will materialise it into a live loan after eyeballing this report.',
      isReview: true
    }
  ];

  // ---------- State & DOM management ------------------------
  var state = null;
  var overlay = null;
  var current = 0;
  var done = [];

  function ensureCss() {
    if (document.querySelector('link[data-li-css]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = '_loan-import-wizard.css'; l.dataset.liCss = '1';
    document.head.appendChild(l);
  }

  function buildShell() {
    overlay = document.createElement('div');
    overlay.className = 'li-overlay';
    overlay.id = 'liOverlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = [
      '<div class="li-shell">',
      '  <header class="li-head">',
      '    <span class="badge-icon"><i class="ri-bank-line"></i></span>',
      '    <div class="meta">',
      '      <div class="eye">New import · draft</div>',
      '      <div class="ti"><span>Bring an existing loan into Ream</span><span class="id" id="liHeadId">LX-2019-00471</span></div>',
      '      <div class="sb">As of <b id="liHeadAsOf">May 11, 2026</b> · from <b id="liHeadSys">AcmeLOS v3.4</b> · batch <b id="liHeadBatch">batch-2026-05-11-001</b></div>',
      '    </div>',
      '    <div class="head-chips">',
      '      <span class="li-chip draft" id="liStatusChip"><i class="ri-edit-circle-line"></i> Draft</span>',
      '      <span class="li-chip" id="liReconChip"><i class="ri-shield-check-line"></i> Recon ✓</span>',
      '    </div>',
      '    <button class="li-close" type="button" id="liClose" aria-label="Close"><i class="ri-close-line"></i></button>',
      '  </header>',
      '  <nav class="li-stepper" id="liStepper"></nav>',
      '  <div class="li-body" id="liBody">',
      '    <div class="li-content" id="liContent"></div>',
      '    <aside class="li-panel" id="liPanel"></aside>',
      '  </div>',
      '  <footer class="li-foot">',
      '    <div class="progress"><span class="dot"></span> <span id="liProgress">Step 1 of 8</span></div>',
      '    <div class="actions">',
      '      <button class="li-btn ghost" type="button" id="liCancel">Save & close</button>',
      '      <button class="li-btn secondary" type="button" id="liBack" style="display:none;"><i class="ri-arrow-left-line"></i> Back</button>',
      '      <button class="li-btn primary" type="button" id="liNext">Continue <i class="ri-arrow-right-line"></i></button>',
      '    </div>',
      '  </footer>',
      '</div>'
    ].join('');
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay && overlay.classList.contains('open')) close();
    });
    overlay.querySelector('#liClose').addEventListener('click', close);
    overlay.querySelector('#liCancel').addEventListener('click', close);
    overlay.querySelector('#liBack').addEventListener('click', function () { go(current - 1); });
    overlay.querySelector('#liNext').addEventListener('click', function () {
      if (current < STEPS.length - 1) go(current + 1);
      else submit();
    });
  }

  function buildStepper() {
    var stepper = document.getElementById('liStepper');
    var html = '';
    STEPS.forEach(function (st, i) {
      var cls = 'li-step';
      if (i === current) cls += ' active';
      if (done[i]) cls += ' done';
      var num = done[i] ? '<i class="ri-check-line"></i>' : (i + 1);
      html += '<button class="' + cls + '" type="button" data-li-step="' + i + '">';
      html += '<span class="num">' + num + '</span><span class="lbl">' + st.label + '</span>';
      html += '</button>';
      if (i < STEPS.length - 1) html += '<span class="li-step-line"></span>';
    });
    stepper.innerHTML = html;
    stepper.querySelectorAll('[data-li-step]').forEach(function (b) {
      b.addEventListener('click', function () { go(+b.dataset.liStep); });
    });
  }

  // Read a binding path "paid.principal" → state.paid.principal
  function getByPath(o, path) {
    var parts = path.split('.');
    for (var i = 0; i < parts.length && o != null; i++) o = o[parts[i]];
    return o;
  }
  function setByPath(o, path, val) {
    var parts = path.split('.');
    for (var i = 0; i < parts.length - 1; i++) {
      if (o[parts[i]] == null) o[parts[i]] = {};
      o = o[parts[i]];
    }
    o[parts[parts.length - 1]] = val;
  }

  function bindInputs(scope) {
    // numeric/text inputs & textareas
    scope.querySelectorAll('input[data-li-bind], textarea[data-li-bind]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var path = inp.dataset.liBind;
        var raw = inp.value;
        var existing = getByPath(state, path);
        var v;
        if (typeof existing === 'number') v = parseFloat(raw);
        else v = raw;
        if (path === 'lateAppliesFromAsOf') v = (raw === 'true');
        if (path === 'inDispute') v = (raw === 'true');
        setByPath(state, path, isNaN(v) && typeof existing === 'number' ? 0 : v);
        renderPanel();
        renderHeader();
      });
    });
    // selects
    scope.querySelectorAll('select[data-li-bind]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var path = sel.dataset.liBind;
        var existing = getByPath(state, path);
        var v = sel.value;
        if (typeof existing === 'boolean' || path === 'lateAppliesFromAsOf' || path === 'inDispute') {
          v = (v === 'true');
        }
        setByPath(state, path, v);
        renderPanel();
        renderHeader();
      });
    });
    // radio-grid cards
    scope.querySelectorAll('[data-li-radio]').forEach(function (lbl) {
      lbl.addEventListener('click', function () {
        var name = lbl.dataset.liRadio;
        var v = lbl.dataset.v;
        // toggle active class
        scope.querySelectorAll('[data-li-radio="' + name + '"]').forEach(function (s) { s.classList.remove('active'); });
        lbl.classList.add('active');
        var input = lbl.querySelector('input'); if (input) input.checked = true;
        // map name → state path
        if (name === 'contractMode') state.contractMode = v;
        if (name === 'lateEnabled') state.lateEnabled = (v === 'on');
        renderPanel();
        renderHeader();
      });
    });
  }

  function renderHeader() {
    var id = state.legacyLoanId || '—';
    document.getElementById('liHeadId').textContent = id;
    var d = state.asOfDate ? new Date(state.asOfDate + 'T00:00:00Z') : null;
    document.getElementById('liHeadAsOf').textContent = d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '—';
    var sysMap = { 'acmelos:3.4': 'AcmeLOS v3.4', 'mortgagebot:8.2': 'MortgageBot v8.2', 'encompass:21.3': 'Encompass v21.3', 'custom': 'Custom / in-house', 'spreadsheet': 'Spreadsheet / manual' };
    document.getElementById('liHeadSys').textContent = sysMap[state.legacySystem] || state.legacySystem;
    document.getElementById('liHeadBatch').textContent = state.importBatch || '—';

    // recon chip
    var r = compute(state);
    var chip = document.getElementById('liReconChip');
    if (r.allPass) {
      chip.className = 'li-chip ok';
      chip.innerHTML = '<i class="ri-shield-check-line"></i> Reconciliation passes';
    } else {
      chip.className = 'li-chip err';
      var failCount = 0;
      ['principal','interest','escrow','lateFee','payoff'].forEach(function (k) { if (!r.checks[k]) failCount++; });
      chip.innerHTML = '<i class="ri-error-warning-line"></i> ' + failCount + ' drift';
    }
  }

  function renderPanel() {
    var panel = document.getElementById('liPanel');
    var r = compute(state);
    panel.innerHTML = [
      '<div class="li-panel-head">',
      '  <div class="ti"><i class="ri-equalizer-2-line"></i> Reconciliation preview</div>',
      '</div>',
      reconVerdict(r),
      '<div class="li-recon-rows">',
        reconRow('Outstanding principal', r.ream.principal, state.expected.principal, r.deltas.principal, r.checks.principal),
        reconRow('Outstanding interest',  r.ream.interest,  state.expected.interest,  r.deltas.interest,  r.checks.interest),
        reconRow('Outstanding escrow',    r.ream.escrow,    state.expected.escrow,    r.deltas.escrow,    r.checks.escrow),
        reconRow('Outstanding late fees', r.ream.lateFee,   state.expected.lateFee,   r.deltas.lateFee,   r.checks.lateFee),
        reconRow('Total payoff',          r.ream.payoff,    state.expected.payoff,    r.deltas.payoff,    r.checks.payoff, true),
      '</div>',
      renderLedgerPreview(),
      renderTwoPerson()
    ].join('');
  }

  function reconVerdict(r) {
    if (r.allPass) {
      return '<div class="li-verdict ok"><span class="ic"><i class="ri-check-line"></i></span>' +
        '<div><div class="vti">Within tolerance · ' + state.tolerance.absolute.toFixed(2) + ' USD / ' + state.tolerance.relativeBp.toFixed(1) + ' bp</div>' +
        '<div class="vsb">Submission is reconciliation-clean; verifier can approve.</div></div></div>';
    }
    return '<div class="li-verdict err"><span class="ic"><i class="ri-error-warning-line"></i></span>' +
      '<div><div class="vti">Drift exceeds tolerance</div>' +
      '<div class="vsb">Adjust paid totals, legacy expected totals, or widen the tolerance.</div></div></div>';
  }

  function reconRow(label, ream, legacy, delta, pass, isPayoff) {
    var cls = 'li-recon-row ' + (pass ? 'match' : 'drift') + (isPayoff ? ' payoff' : '');
    var chk = pass
      ? '<span class="chk"><i class="ri-check-line"></i> match</span>'
      : '<span class="chk"><i class="ri-close-line"></i> drift</span>';
    return '<div class="' + cls + '">' +
      '<span class="lab">' + label + '</span>' +
      chk +
      '<div class="pair">' +
        '<span class="src">Ream</span><span></span><span class="v">' + fmtUSD(ream) + '</span>' +
        '<span class="src">Legacy</span><span></span><span class="v legacy">' + fmtUSD(legacy) + '</span>' +
      '</div>' +
      '<div class="delta"><span class="lk">Δ</span><span class="vv">' + fmtSigned(delta) + '</span></div>' +
    '</div>';
  }

  function renderLedgerPreview() {
    var p = state.paid;
    var total = p.principal + p.interest + p.escrow + p.lateFee;
    var asOfShort = (function () {
      var d = state.asOfDate ? new Date(state.asOfDate + 'T00:00:00Z') : null;
      return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '—';
    })();
    return [
      '<div class="li-ledger">',
      '  <div class="lhead">',
      '    <span class="tag">PaymentEntry · LEGACY_IMPORT</span>',
      '    <span class="stamp">' + asOfShort + '</span>',
      '  </div>',
      '  <div class="lbody">',
      '    <div class="amt">' + fmtUSD(total) + '<span class="cur">USD · INBOUND</span></div>',
      '    <div class="splits">',
      '      <div class="sp"><span class="k">Principal</span><span class="v">' + fmtUSD(p.principal) + '</span></div>',
      '      <div class="sp"><span class="k">Interest</span><span class="v">' + fmtUSD(p.interest) + '</span></div>',
      '      <div class="sp"><span class="k">Escrow</span><span class="v">' + fmtUSD(p.escrow) + '</span></div>',
      '      <div class="sp"><span class="k">Late fee</span><span class="v">' + fmtUSD(p.lateFee) + '</span></div>',
      '    </div>',
      '    <dl class="meta">',
      '      <dt>method</dt><dd>INTERNAL_ADJUSTMENT</dd>',
      '      <dt>source</dt><dd>LEGACY_IMPORT → pendingImport.id</dd>',
      '      <dt>idempotency</dt><dd>' + escHtml((state.idempotencyKey || '') + ':opening') + '</dd>',
      '    </dl>',
      '  </div>',
      '</div>'
    ].join('');
  }

  function renderTwoPerson() {
    return '<div class="li-twoperson">' +
      '<div class="ic"><i class="ri-shield-user-line"></i></div>' +
      '<div>' +
        '<div class="ti">Two-person verification required</div>' +
        '<div class="sb">This submission lands as a staging row. A different admin must verify before any production loan is created.</div>' +
        '<dl class="who">' +
          '<dt>Submitter</dt><dd>' + escHtml(state.importedBy) + '</dd>' +
          '<dt>Verifier</dt><dd>Assigned at queue review</dd>' +
        '</dl>' +
      '</div>' +
    '</div>';
  }

  function go(i) {
    if (i < 0 || i > STEPS.length - 1) return;
    if (i > current) {
      for (var k = current; k < i; k++) done[k] = true;
    }
    current = i;
    renderStep();
    buildStepper();
    renderHeader();
    renderPanel();
  }

  function renderStep() {
    var step = STEPS[current];
    var content = document.getElementById('liContent');
    var nextBtn = document.getElementById('liNext');
    var backBtn = document.getElementById('liBack');

    if (step.isReview) {
      content.innerHTML = renderReview();
      nextBtn.innerHTML = '<i class="ri-shield-check-line"></i> Submit for verification';
    } else {
      content.innerHTML = '<div class="ti">' + escHtml(step.ti) + '</div><div class="sb">' + step.sb + '</div><div class="li-fields">' + step.html(state) + '</div>';
      nextBtn.innerHTML = (current === STEPS.length - 2) ? 'Review report <i class="ri-arrow-right-line"></i>' : 'Continue <i class="ri-arrow-right-line"></i>';
      bindInputs(content);
      if (typeof step.onMount === 'function') {
        try { step.onMount(content, state); } catch (e) { console.warn('onMount error', e); }
      }
    }
    backBtn.style.display = current > 0 ? '' : 'none';
    document.getElementById('liProgress').textContent = 'Step ' + (current + 1) + ' of ' + STEPS.length + ' · ' + step.label;
    content.scrollTop = 0;
  }

  function renderReview() {
    var r = compute(state);
    var heroClass = r.allPass ? 'ok' : 'err';
    var heroIcon = r.allPass ? 'ri-shield-check-line' : 'ri-error-warning-line';
    var heroTi = r.allPass ? 'Reconciliation clean · ready to submit' : 'Reconciliation has drift — fix before submitting';
    var heroSb = r.allPass
      ? 'All five balances are within tolerance. The synthetic ledger entry below will be staged, and a verifier can materialise the live loan with one click.'
      : 'Go back to the Paid totals or Reconcile steps and adjust until all five balances are within tolerance.';

    var totalPaid = state.paid.principal + state.paid.interest + state.paid.escrow + state.paid.lateFee;
    var asOfShort = (function () {
      var d = state.asOfDate ? new Date(state.asOfDate + 'T00:00:00Z') : null;
      return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '—';
    })();

    return [
      '<div class="ti">' + STEPS[current].ti + '</div><div class="sb">' + STEPS[current].sb + '</div>',
      '<div class="li-review">',
      '  <div class="li-review-hero ' + heroClass + '">',
      '    <div class="ic"><i class="' + heroIcon + '"></i></div>',
      '    <div><div class="ti">' + heroTi + '</div><div class="sb">' + heroSb + '</div></div>',
      '  </div>',
      '  <div class="li-review-grid">',
      '    <div class="li-review-card">',
      '      <div class="ch"><i class="ri-fingerprint-line"></i> Identity</div>',
      '      <dl>',
      '        <dt>Legacy ID</dt><dd>' + escHtml(state.legacyLoanId) + '</dd>',
      '        <dt>As-of date</dt><dd>' + asOfShort + '</dd>',
      '        <dt>Source</dt><dd>' + escHtml({ 'acmelos:3.4': 'AcmeLOS v3.4', 'mortgagebot:8.2': 'MortgageBot v8.2', 'encompass:21.3': 'Encompass v21.3' }[state.legacySystem] || state.legacySystem) + '</dd>',
      '        <dt>Batch</dt><dd>' + escHtml(state.importBatch) + '</dd>',
      '      </dl>',
      '    </div>',
      '    <div class="li-review-card">',
      '      <div class="ch"><i class="ri-user-3-line"></i> Loan</div>',
      '      <dl>',
      '        <dt>Borrower</dt><dd style="font-family:var(--font-sans);">' + escHtml(state.buyerLabel) + '</dd>',
      '        <dt>Collateral</dt><dd style="font-family:var(--font-sans);">' + escHtml(state.siteLabel) + '</dd>',
      '        <dt>Product</dt><dd style="font-family:var(--font-sans);">' + escHtml(state.productLabel) + '</dd>',
      '        <dt>Total / rate</dt><dd>' + fmtUSD(state.totalAmount) + ' · ' + state.annualInterestRate.toFixed(3) + '%</dd>',
      '      </dl>',
      '    </div>',
      '    <div class="li-review-card" style="grid-column:1/3;">',
      '      <div class="ch"><i class="ri-database-2-line"></i> Synthetic ledger entry that will be staged</div>',
      '      <div style="display:grid; grid-template-columns:auto 1fr; gap:6px 18px; font:12.5px var(--font-sans);">',
      '        <span style="color:var(--fg3); font-weight:500;">Amount</span><span style="font-family:var(--font-mono); font-weight:700; color:var(--color-grey-900);">' + fmtUSD(totalPaid) + ' INBOUND</span>',
      '        <span style="color:var(--fg3); font-weight:500;">Components</span><span style="font-family:var(--font-mono); color:var(--color-grey-800);">P ' + fmtUSD(state.paid.principal) + ' · I ' + fmtUSD(state.paid.interest) + ' · E ' + fmtUSD(state.paid.escrow) + ' · F ' + fmtUSD(state.paid.lateFee) + '</span>',
      '        <span style="color:var(--fg3); font-weight:500;">Effective</span><span style="font-family:var(--font-mono); color:var(--color-grey-800);">' + escHtml(state.asOfDate) + ' (cutover)</span>',
      '        <span style="color:var(--fg3); font-weight:500;">Method / source</span><span style="font-family:var(--font-mono); color:var(--color-grey-800);">INTERNAL_ADJUSTMENT · LEGACY_IMPORT</span>',
      '        <span style="color:var(--fg3); font-weight:500;">Idempotency</span><span style="font-family:var(--font-mono); color:var(--color-grey-800);">' + escHtml(state.idempotencyKey) + ':opening</span>',
      '      </div>',
      '    </div>',
      '    <div class="li-review-card" style="grid-column:1/3;">',
      '      <div class="ch"><i class="ri-time-line"></i> Amortisation preview — ' + state.fullyPaid + ' closed · 1 open · ' + (state.loanTermInMonths - state.fullyPaid - 1) + ' future</div>',
      '      <div class="li-amort">' + renderAmortChips() + '</div>',
      '    </div>',
      '    <div class="li-review-card" style="grid-column:1/3;">',
      '      <div class="ch"><i class="ri-shield-user-line"></i> Two-person rule</div>',
      '      <div style="display:flex; gap:14px; align-items:flex-start;">',
      '        <div style="flex:1;"><div style="font:11px var(--font-sans); color:var(--fg3); letter-spacing:.04em; text-transform:uppercase;">Submitter (you)</div><div style="font:600 13px var(--font-sans); color:var(--color-grey-900); margin-top:3px;">' + escHtml(state.importedBy) + '</div></div>',
      '        <i class="ri-arrow-right-line" style="color:var(--fg3); margin-top:18px;"></i>',
      '        <div style="flex:1;"><div style="font:11px var(--font-sans); color:var(--fg3); letter-spacing:.04em; text-transform:uppercase;">Verifier</div><div style="font:600 13px var(--font-sans); color:var(--color-grey-700); margin-top:3px;">Picked up from the Migrations queue</div></div>',
      '      </div>',
      '      <div style="font:12px var(--font-sans); color:var(--fg2); margin-top:10px; padding-top:10px; border-top:1px dashed var(--color-grey-200); line-height:1.55;">A separate admin will review the same report, then approve to materialise the LoanAccount + synthetic ledger entry, or reject with a reason.</div>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');
  }

  function renderAmortChips() {
    var html = '';
    var fp = state.fullyPaid;
    var cur = state.currentInstNum;
    var total = state.loanTermInMonths;
    function chip(n, cls, st) { return '<div class="chip ' + cls + '"><span class="n">#' + n + '</span><span class="st">' + st + '</span></div>'; }
    // first 3 closed
    var lead = Math.min(3, fp);
    for (var i = 1; i <= lead; i++) html += chip(i, 'closed', 'paid');
    if (fp > lead + 1) html += '<span class="ellipsis">…</span>';
    if (fp > lead) html += chip(fp, 'closed', 'paid');
    html += chip(cur, 'open', 'open');
    if (cur + 1 < total) html += chip(cur + 1, 'future', 'future');
    if (cur + 2 < total - 1) html += '<span class="ellipsis">…</span>';
    if (cur < total) html += chip(total, 'future', 'final');
    return html;
  }

  function submit() {
    var r = compute(state);
    if (!r.allPass) {
      // bounce back to recon step
      try {
        var t = document.createElement('div');
        t.textContent = 'Reconciliation has drift — fix before submitting.';
        t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#7f1d1d;color:#fff;padding:10px 16px;border-radius:8px;font:500 13px system-ui;z-index:9999;box-shadow:0 6px 20px rgba(0,0,0,.2)';
        document.body.appendChild(t);
        setTimeout(function () { t.remove(); }, 3000);
      } catch (e) {}
      return;
    }
    // Render done state inline (replacing body)
    document.getElementById('liBody').innerHTML = '<div class="li-content" style="grid-column:1/-1;">' + renderDone() + '</div>';
    document.getElementById('liNext').style.display = 'none';
    document.getElementById('liBack').style.display = 'none';
    document.getElementById('liCancel').innerHTML = 'Close';
    document.getElementById('liStatusChip').className = 'li-chip ok';
    document.getElementById('liStatusChip').innerHTML = '<i class="ri-time-line"></i> Submitted · awaiting verification';
    document.getElementById('liProgress').textContent = 'Submitted to Migrations queue';
  }

  function renderDone() {
    var r = compute(state);
    var importId = 'pli_' + Math.random().toString(36).slice(2, 10);
    return [
      '<div class="li-done">',
      '  <div class="check-big"><i class="ri-shield-check-line"></i></div>',
      '  <h3>Submitted for verification</h3>',
      '  <p>The legacy loan <b>' + escHtml(state.legacyLoanId) + '</b> is now in the Migrations queue as a Pending Loan Import. A different admin must verify the same reconciliation report before the live LoanAccount and synthetic ledger entry are created.</p>',
      '  <dl class="iden">',
      '    <dt>Pending import ID</dt><dd>' + importId + '</dd>',
      '    <dt>Idempotency key</dt><dd>' + escHtml(state.idempotencyKey) + '</dd>',
      '    <dt>Reconciliation</dt><dd style="color:#047857;">✓ within tolerance</dd>',
      '    <dt>Submitted by</dt><dd style="font-family:var(--font-sans);">' + escHtml(state.importedBy) + '</dd>',
      '    <dt>Status</dt><dd>SUBMITTED → awaiting verifier</dd>',
      '  </dl>',
      '  <div class="next-steps">',
      '    <a class="li-btn primary" href="migrations.html"><i class="ri-shield-user-line"></i> Open Migrations queue</a>',
      '    <button class="li-btn secondary" type="button" onclick="window.LoanImportWizard.open()"><i class="ri-add-line"></i> Migrate another loan</button>',
      '  </div>',
      '</div>'
    ].join('');
  }

  function open() {
    ensureCss();
    if (!overlay) buildShell();
    state = clone(DEFAULTS);
    current = 0;
    done = STEPS.map(function () { return false; });
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    // reset action buttons (in case open after submit)
    document.getElementById('liNext').style.display = '';
    document.getElementById('liBack').style.display = 'none';
    document.getElementById('liCancel').innerHTML = 'Save & close';
    document.getElementById('liStatusChip').className = 'li-chip draft';
    document.getElementById('liStatusChip').innerHTML = '<i class="ri-edit-circle-line"></i> Draft';
    // Re-make body if it was replaced by done state
    var body = document.getElementById('liBody');
    if (!body.querySelector('#liContent')) {
      body.innerHTML = '<div class="li-content" id="liContent"></div><aside class="li-panel" id="liPanel"></aside>';
    }
    buildStepper();
    renderStep();
    renderHeader();
    renderPanel();
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Expose
  window.LoanImportWizard = { open: open, close: close };

  // Intercept the existing data-rw-open="loan" trigger in capture phase
  // so we override before _register-wizards.js handles it.
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest && e.target.closest('[data-rw-open="loan"]');
    if (!t) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    open();
  }, true);
})();
