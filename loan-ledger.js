/* ============================================================
   Loan-detail · General Ledger tab
   Double-entry journal entries for L-2294, plus trial balance.
   ============================================================ */
(function () {
  if (!document.getElementById('glBody')) return;

  // ---- Chart of Accounts ----
  const COA = {
    '1110': { name:'Cash & Bank Clearing',          type:'asset' },
    '1310': { name:'Loans Receivable — Principal',  type:'asset' },
    '1320': { name:'Accrued Interest Receivable',   type:'asset' },
    '1330': { name:'Receivable — Fees',             type:'asset' },
    '1390': { name:'Allowance for Loan Losses',     type:'contra' },
    '2110': { name:'Customer Suspense',             type:'liability' },
    '2210': { name:'Escrow Liability',              type:'liability' },
    '2310': { name:'Unearned Origination Fees',     type:'liability' },
    '4110': { name:'Interest Income',               type:'revenue' },
    '4210': { name:'Late Fee Income',               type:'revenue' },
    '4220': { name:'NSF Fee Income',                type:'revenue' },
    '4230': { name:'Origination Fee Income',        type:'revenue' },
    '5110': { name:'Provision for Loan Losses',     type:'expense' },
    '5210': { name:'Charge-off Expense',            type:'expense' },
    '5220': { name:'Goodwill / Fee Waivers',        type:'expense' },
  };

  const D = (y,m,d) => new Date(y,m-1,d).getTime();
  const fmt$ = n => '$' + Math.abs(n).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2});
  const dateStr = ts => new Date(ts).toLocaleDateString('en-US',{month:'short', day:'numeric', year:'numeric'});

  // Helper to build a JE
  let jeNum = 1000;
  const JES = [];
  function je(date, memo, ref, lines) {
    jeNum++;
    JES.push({ id:'JE-' + jeNum, ts:date, memo, ref, lines });
  }

  // ---- Loan lifecycle journal entries ----

  // Origination Apr 12, 2024
  je(D(2024,4,12), 'Down payment received from borrower (wire)', 'WIRE-44219', [
    ['1110', 15000, 0],
    ['2110', 0, 15000],
  ]);
  je(D(2024,4,12), 'Loan booked · disbursement to Sunridge Estates', 'L-2294', [
    ['1310', 75000, 0],
    ['1110', 0, 60000],
    ['2110', 15000, 0],
    ['1110', 0, 15000],
    ['2310', 0, 0], // illustrative
  ]);
  je(D(2024,4,12), 'Recognize origination fee · earned at closing', 'OFEE-2294', [
    ['1110', 750, 0],
    ['4230', 0, 750],
  ]);

  // Recurring monthly billing & receipt
  // Period 1 — May 25 2024 ($1,420 = $826.25 P + $593.75 I)
  function billing(date, period, principal, interest, ref) {
    je(date, 'Period ' + period + ' · interest accrual', 'ACC-' + period, [
      ['1320', interest, 0],
      ['4110', 0, interest],
    ]);
    je(date, 'Period ' + period + ' · payment received (auto-debit)', ref, [
      ['1110', principal+interest, 0],
      ['1310', 0, principal],
      ['1320', 0, interest],
    ]);
  }

  billing(D(2024,5,25),  1, 826.25, 593.75, 'TX-7821');
  billing(D(2024,6,25),  2, 832.79, 587.21, 'TX-7902');
  billing(D(2024,7,25),  3, 839.38, 580.62, 'TX-7989');
  billing(D(2024,8,25),  4, 846.02, 573.98, 'TX-8023');

  // Period 5 — partial payment + late fee + waiver
  je(D(2024,9,25), 'Period 5 · interest accrual', 'ACC-5', [
    ['1320', 567.30, 0], ['4110', 0, 567.30],
  ]);
  je(D(2024,9,25), 'Period 5 · partial payment received', 'TX-8055', [
    ['1110', 1200, 0],
    ['1310', 0, 632.70],
    ['1320', 0, 567.30],
  ]);
  je(D(2024,10,25), 'Period 5 · late fee assessed (30-day)', 'FEE-LATE-5', [
    ['1330', 240, 0],
    ['4210', 0, 240],
  ]);
  je(D(2024,10,28), 'Period 5 · catch-up payment + late fee', 'TX-8170', [
    ['1110', 460, 0],
    ['1310', 0, 220],
    ['1330', 0, 240],
  ]);
  je(D(2024,10,28), 'Period 5 · goodwill waiver of late fee', 'WV-LATE-5', [
    ['5220', 240, 0],
    ['1330', 0, 240],
  ]);

  // Periods 6-7
  billing(D(2024,11,25), 6, 866.25, 553.75, 'TX-8240');
  billing(D(2024,12,25), 7, 873.11, 546.89, 'TX-8311');

  // 2025 begins
  billing(D(2025,1,25),  8,  880.02, 539.98, 'TX-8444');
  billing(D(2025,2,25), 13, 950.00, 470.00, 'TX-9301'); // sample

  // Top-up to principal
  je(D(2025,2,14), 'Period 13 · borrower top-up applied to principal', 'TX-9322', [
    ['1110', 80, 0], ['1310', 0, 80],
  ]);

  // NSF & reversal Mar 2025
  je(D(2025,3,25), 'Period 14 · payment received', 'TX-9501', [
    ['1110', 1420, 0], ['1310', 0, 826], ['1320', 0, 0], ['4110', 0, 594],
  ]);
  je(D(2025,3,25), 'Period 14 · NSF return (reversal)', 'NSF-9501', [
    ['1310', 826, 0],
    ['4110', 594, 0],
    ['1110', 0, 1420],
  ]);
  je(D(2025,3,25), 'Period 14 · NSF fee assessed', 'FEE-NSF-9501', [
    ['1330', 25, 0],
    ['4220', 0, 25],
  ]);
  je(D(2025,3,26), 'Period 14 · catch-up + NSF fee paid', 'TX-9510', [
    ['1110', 1445, 0],
    ['1310', 0, 826],
    ['4110', 0, 594],
    ['1330', 0, 25],
  ]);

  billing(D(2025,4,25), 15, 893.10, 526.90, 'TX-9712');
  billing(D(2025,5,25), 16, 900.18, 519.82, 'TX-9811');
  billing(D(2025,6,1),  17, 907.32, 512.68, 'TX-9912');

  // Forbearance Sep–Oct 2025 (interest still accrues)
  je(D(2025,9,25),  'Forbearance period · interest accrual only', 'FRB-2294-1', [
    ['1320', 480.00, 0], ['4110', 0, 480.00],
  ]);
  je(D(2025,10,25), 'Forbearance period · interest accrual only', 'FRB-2294-1', [
    ['1320', 478.50, 0], ['4110', 0, 478.50],
  ]);

  // Rate change effective Nov 2025
  billing(D(2025,11,25), 19, 949.20, 452.80, 'TX-A102');
  // Credit memo for dispute
  je(D(2025,11,6), 'Credit memo · rate-boundary correction', 'CR-2294-009', [
    ['5220', 18, 0],
    ['1310', 0, 18],
  ]);

  billing(D(2025,12,25), 20, 952.84, 449.16, 'TX-A210');
  billing(D(2026,1,25),  21, 956.50, 445.50, 'TX-A290');
  billing(D(2026,2,28),  22, 960.18, 441.82, 'TX-A311');
  billing(D(2026,3,28),  23, 963.87, 438.13, 'TX-A422');
  billing(D(2026,4,28),  24, 967.59, 434.41, 'TX-A540');

  // Quarterly provision (illustrative ALL build-up)
  je(D(2026,3,31), 'Q1 2026 · provision for loan losses (1.5% expected)', 'PROV-Q1-26', [
    ['5110', 723.27, 0],
    ['1390', 0, 723.27],
  ]);

  // Sort by date asc, group by JE
  JES.sort((a,b) => a.ts - b.ts);

  // ---- Trial balance ----
  function computeBalances(filterFn) {
    const bal = {};
    Object.keys(COA).forEach(c => bal[c] = { dr:0, cr:0 });
    JES.forEach(j => {
      j.lines.forEach(([code, dr, cr]) => {
        if (!COA[code]) return;
        if (filterFn && !filterFn(j, code)) return;
        bal[code].dr += dr; bal[code].cr += cr;
      });
    });
    return bal;
  }

  function renderTrialBalance() {
    const bal = computeBalances();
    const get = c => bal[c] || {dr:0,cr:0};
    const principal = get('1310').dr - get('1310').cr;
    const accruedInt = get('1320').dr - get('1320').cr;
    const fees = get('1330').dr - get('1330').cr;
    const intIncome = get('4110').cr - get('4110').dr;
    const lateIncome = get('4210').cr - get('4210').dr;
    const nsfIncome = get('4220').cr - get('4220').dr;
    const cash = get('1110').dr - get('1110').cr;
    const allowance = get('1390').cr - get('1390').dr;
    const cards = [
      { cls:'dr',  l:'Loans receivable (principal)', v:fmt$(principal),  s:'GL 1310 · net debit' },
      { cls:'dr',  l:'Accrued interest',             v:fmt$(accruedInt), s:'GL 1320' },
      { cls:'dr',  l:'Receivable — fees',            v:fmt$(fees),       s:'GL 1330' },
      { cls:'cr',  l:'Allowance for loan losses',    v:fmt$(allowance),  s:'GL 1390 (contra)' },
      { cls:'cr',  l:'Interest income (life-to-date)', v:fmt$(intIncome), s:'GL 4110' },
      { cls:'cr',  l:'Fee income · late + NSF',      v:fmt$(lateIncome+nsfIncome), s:'GL 4210 + 4220' },
      { cls:'bal', l:'Cash net (loan attribution)',   v:(cash<0?'-':'')+fmt$(cash), s:'GL 1110 · funds in/out' },
      { cls:'bal', l:'Net carrying value',            v:fmt$(principal + accruedInt + fees - allowance), s:'Receivable − allowance' },
    ];
    document.getElementById('glTrialBalance').innerHTML = cards.map(c =>
      `<div class="card ${c.cls}"><div class="l">${c.l}</div><div class="v">${c.v}</div><div class="s">${c.s}</div></div>`
    ).join('');
  }

  // ---- Account select ----
  const acctSel = document.getElementById('glAccount');
  Object.keys(COA).sort().forEach(c => {
    const o = document.createElement('option');
    o.value = c; o.textContent = c + ' · ' + COA[c].name;
    acctSel.appendChild(o);
  });

  // ---- Filters / chips ----
  let activeType = 'all';
  let activeAcct = 'all';

  function recountChips() {
    const counts = { all:0, asset:0, liability:0, revenue:0, expense:0, contra:0 };
    JES.forEach(j => j.lines.forEach(([c]) => {
      if (!COA[c]) return;
      counts.all++; counts[COA[c].type]++;
    }));
    document.querySelectorAll('#glFilters .ct').forEach(el => {
      el.textContent = counts[el.dataset.ct] || 0;
    });
  }

  function rowsForJe(j) {
    const lines = j.lines.filter(([code, dr, cr]) => {
      if (!COA[code]) return false;
      if (dr === 0 && cr === 0) return false;
      if (activeType !== 'all' && COA[code].type !== activeType) return false;
      if (activeAcct !== 'all' && code !== activeAcct) return false;
      return true;
    });
    if (!lines.length) return null;
    const head = `<tr class="je-head"><td>${dateStr(j.ts)}</td><td colspan="3"><span class="je"><span class="pill">${j.id}</span> ${j.memo}</span></td><td class="num"></td><td class="num"></td><td>${j.ref||''}</td></tr>`;
    let totDr = 0, totCr = 0;
    const body = lines.map(([code, dr, cr]) => {
      totDr += dr; totCr += cr;
      const a = COA[code];
      return `<tr class="je-line"><td></td><td></td><td><span class="ac"><span class="code">${code}</span><span class="nm">${a.name}</span><span class="typ" data-t="${a.type}">${a.type}</span></span></td><td class="memo">${j.memo}</td><td class="num dr">${dr ? fmt$(dr) : ''}</td><td class="num cr">${cr ? fmt$(cr) : ''}</td><td></td></tr>`;
    }).join('');
    return { html: head + body, dr: totDr, cr: totCr, count: lines.length };
  }

  function render() {
    let totDr = 0, totCr = 0, lineCount = 0, jeCount = 0;
    const out = [];
    JES.forEach(j => {
      const r = rowsForJe(j);
      if (!r) return;
      out.push(r.html); totDr += r.dr; totCr += r.cr; lineCount += r.count; jeCount++;
    });
    document.getElementById('glBody').innerHTML = out.join('') ||
      `<tr><td colspan="7" style="padding:36px;text-align:center;color:var(--fg3);"><i class="ri-inbox-line" style="font-size:22px;display:block;margin-bottom:6px;"></i>No journal entries match.</td></tr>`;
    document.getElementById('glTotDr').textContent = fmt$(totDr);
    document.getElementById('glTotCr').textContent = fmt$(totCr);
    document.getElementById('glShown').textContent = `${jeCount} JE · ${lineCount} lines`;
    const tabCt = document.getElementById('glTabCount');
    if (tabCt) tabCt.textContent = JES.length;
  }

  document.querySelectorAll('#glFilters .ld-hist-chip').forEach(c => c.addEventListener('click', () => {
    document.querySelectorAll('#glFilters .ld-hist-chip').forEach(x => x.classList.remove('on'));
    c.classList.add('on');
    activeType = c.dataset.acct;
    render();
  }));
  acctSel.addEventListener('change', () => { activeAcct = acctSel.value; render(); });

  document.getElementById('glExport')?.addEventListener('click', () => {
    if (typeof window.toast === 'function') window.toast('GL export queued · CSV will download shortly');
  });

  recountChips();
  renderTrialBalance();
  render();
})();
