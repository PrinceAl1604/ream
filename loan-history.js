/* ============================================================
   Loan-detail · History tab
   Append-only audit log, Jira-style timeline.
   No search box (per spec). Filterable by category + actor.
   Best-practice events covering origination → servicing → end-of-life.
   ============================================================ */
(function () {
  if (!document.getElementById('histBody')) return;

  // ---------- Actor catalog ----------
  const A = {
    KEVIN:   { name: 'Kevin Manga',     role: 'Originator',          kind: 'user',     ini: 'KM' },
    AYANA:   { name: 'Ayana Bediako',   role: 'Servicing manager',   kind: 'user',     ini: 'AB' },
    JOSH:    { name: 'Josh Owusu',      role: 'Compliance',          kind: 'user',     ini: 'JO' },
    MARIE:   { name: 'Marie Nkrumah',   role: 'Collections',         kind: 'user',     ini: 'MN' },
    SAMI:    { name: 'Sami Owusu',      role: 'Underwriting',        kind: 'user',     ini: 'SO' },
    ANNA:    { name: 'Anna Thompson',   role: 'Borrower',            kind: 'borrower', ini: 'AT' },
    SYS:     { name: 'REAM',            role: 'System',              kind: 'system',   ini: '⚙' },
    CRON:    { name: 'Billing cron',    role: 'Scheduled job',       kind: 'cron',     ini: '⏱' },
    BUREAU:  { name: 'Equifax',         role: 'External',            kind: 'system',   ini: 'EX' },
    BANK:    { name: 'ECG-Bank',        role: 'Payments rail',       kind: 'system',   ini: '$' },
  };

  // ---------- Helpers ----------
  const D = (y,m,d,h=9,mi=0) => new Date(y,m-1,d,h,mi).getTime();
  const fmt$ = n => '$' + Number(n).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2});
  const fmtTime = ts => {
    const dt = new Date(ts);
    return dt.toLocaleTimeString('en-US',{hour:'numeric', minute:'2-digit'});
  };
  const fmtDay = ts => {
    const dt = new Date(ts);
    const today = new Date(); today.setHours(0,0,0,0);
    const d0 = new Date(dt); d0.setHours(0,0,0,0);
    const diff = Math.round((today - d0) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7)   return diff + ' days ago';
    return dt.toLocaleDateString('en-US',{ weekday:'short', month:'short', day:'numeric', year: dt.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
  };
  const dayKey = ts => { const d = new Date(ts); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };

  // ---------- Event list (newest first when rendered) ----------
  // Each event: { id, ts, cat, icon, tone, actor, verb, obj, diff?, meta?, payload?, ip? }
  // cat ∈ lifecycle | money | schedule | terms | docs | comms | dispute | self | system | compliance | audit
  const EVENTS = [
    // ====== Origination & onboarding (Apr 2024) ======
    { ts: D(2024,4,8,10,12),  cat:'lifecycle', tone:'brand',   icon:'ri-flag-line',           actor:A.ANNA,   verb:'submitted application', obj:'A-7821',
      meta:[['Channel','Customer portal'],['Product','Standard Land · 15-yr fixed']],
      ip:'41.66.118.42' },
    { ts: D(2024,4,8,10,42),  cat:'compliance', tone:'brand',  icon:'ri-shield-user-line',    actor:A.SYS,    verb:'ran KYC verification',  obj:'KYC-#2241',
      meta:[['ID type','Ghana Card'],['Result','Match · 98%']] },
    { ts: D(2024,4,8,11, 4),  cat:'compliance', tone:'success', icon:'ri-shield-check-line',  actor:A.SYS,    verb:'completed AML / OFAC screening', obj:'No hits',
      meta:[['Lists','OFAC, UN, EU, HMT'],['Provider','ComplyAdvantage']] },
    { ts: D(2024,4, 9, 9, 5), cat:'compliance', tone:'system', icon:'ri-bar-chart-2-line',    actor:A.BUREAU, verb:'returned credit report', obj:'FICO 742',
      diff:{label:'Bureau pull', from:'—', to:'742'},
      meta:[['Inquiries (12 mo)','1'],['Open accounts','3']] },
    { ts: D(2024,4, 9,14,30), cat:'lifecycle', tone:'system',  icon:'ri-search-eye-line',     actor:A.SAMI,   verb:'opened underwriting review', obj:'A-7821',
      meta:[['DTI','27.4%'],['LTV','76.4%']] },
    { ts: D(2024,4,10,11,18), cat:'docs',      tone:'system',  icon:'ri-upload-cloud-2-line', actor:A.ANNA,   verb:'uploaded',              obj:'pay-stubs.pdf',
      meta:[['Size','842 KB'],['SHA-256','3c8e…b91a']] },
    { ts: D(2024,4,10,11,22), cat:'docs',      tone:'system',  icon:'ri-upload-cloud-2-line', actor:A.ANNA,   verb:'uploaded',              obj:'employment-letter.pdf',
      meta:[['Size','311 KB']] },
    { ts: D(2024,4,11, 9,40), cat:'lifecycle', tone:'success', icon:'ri-thumb-up-line',       actor:A.SAMI,   verb:'recommended approval',  obj:'A-7821',
      payload:'Customer met income verification thresholds. 20% down paid by ECG-Bank wire. Co-borrower waived; salary covers DTI < 28%.' },
    { ts: D(2024,4,11,15, 5), cat:'lifecycle', tone:'success', icon:'ri-checkbox-circle-line',actor:A.KEVIN,  verb:'approved loan',         obj:'L-2294',
      diff:{label:'Status', from:'In review', to:'Approved'},
      meta:[['Approval limit','$100,000'],['Override','None']] },
    { ts: D(2024,4,11,16, 0), cat:'docs',      tone:'brand',   icon:'ri-file-text-line',      actor:A.SYS,    verb:'generated',             obj:'Loan agreement · LA-2294',
      meta:[['Pages','14'],['Template','v3.2']] },
    { ts: D(2024,4,12, 9,12), cat:'docs',      tone:'success', icon:'ri-pen-nib-line',        actor:A.ANNA,   verb:'e-signed',              obj:'Loan agreement · LA-2294',
      meta:[['Provider','DocuSign'],['Envelope','f9a1…c402']],
      ip:'41.66.118.42' },
    { ts: D(2024,4,12, 9,15), cat:'docs',      tone:'success', icon:'ri-pen-nib-line',        actor:A.KEVIN,  verb:'counter-signed',        obj:'Loan agreement · LA-2294' },
    { ts: D(2024,4,12,10, 0), cat:'lifecycle', tone:'success', icon:'ri-shake-hands-line',    actor:A.KEVIN,  verb:'originated loan',       obj:'L-2294',
      diff:{label:'Status', from:'Approved', to:'Active'},
      meta:[['Principal','$75,000.00'],['Term','180 mo'],['APR','9.5% fixed']] },
    { ts: D(2024,4,12,10, 5), cat:'money',     tone:'success', icon:'ri-bank-line',           actor:A.SYS,    verb:'received down payment', obj:'$15,000.00',
      meta:[['Method','ECG-Bank wire'],['Ref','WIRE-44219']] },
    { ts: D(2024,4,12,10,18), cat:'money',     tone:'success', icon:'ri-arrow-up-circle-line',actor:A.SYS,    verb:'disbursed funds',       obj:'$60,000.00',
      meta:[['To','Sunridge Estates LLC'],['Method','ACH']] },
    { ts: D(2024,4,12,10,20), cat:'schedule',  tone:'system',  icon:'ri-calendar-2-line',     actor:A.SYS,    verb:'built amortization schedule', obj:'180 periods',
      meta:[['Method','Equal monthly'],['First payment','May 25, 2024']] },
    { ts: D(2024,4,12,10,22), cat:'terms',     tone:'system',  icon:'ri-bank-card-line',      actor:A.ANNA,   verb:'enrolled in auto-debit', obj:'ECG-Bank ····4471',
      diff:{label:'Auto-debit', from:'Off', to:'On'} },
    { ts: D(2024,4,12,10,30), cat:'docs',      tone:'system',  icon:'ri-mail-send-line',      actor:A.SYS,    verb:'sent welcome packet',   obj:'WP-2294',
      meta:[['Channel','Email + SMS']] },

    // ====== Servicing — billing & payments (May 2024 → ) ======
    { ts: D(2024,5,20, 6, 0), cat:'comms',    tone:'system',  icon:'ri-notification-3-line',  actor:A.CRON,   verb:'sent payment reminder', obj:'Period 1',
      meta:[['Channel','SMS + Email'],['Due','May 25']] },
    { ts: D(2024,5,25, 8, 1), cat:'system',   tone:'system',  icon:'ri-time-line',            actor:A.CRON,   verb:'opened billing cycle',  obj:'Period 1' },
    { ts: D(2024,5,25, 8, 2), cat:'docs',     tone:'system',  icon:'ri-bill-line',            actor:A.SYS,    verb:'generated invoice',     obj:'INV-2294-001',
      meta:[['Amount','$1,420.00']] },
    { ts: D(2024,5,25,11,14), cat:'money',    tone:'success', icon:'ri-bank-card-line',       actor:A.SYS,    verb:'received auto-debit payment', obj:'TX-7821',
      meta:[['Period','1'],['Amount','$1,420.00'],['Method','Auto-debit ····4471']] },
    { ts: D(2024,5,25,11,14), cat:'money',    tone:'system',  icon:'ri-arrow-left-right-line',actor:A.SYS,    verb:'allocated payment',     obj:'TX-7821',
      meta:[['Principal','$826.25'],['Interest','$593.75'],['Fees','$0.00']] },
    { ts: D(2024,5,25,11,15), cat:'docs',     tone:'success', icon:'ri-receipt-line',         actor:A.SYS,    verb:'issued receipt',        obj:'RCPT-2294-001' },
    { ts: D(2024,5,25,11,16), cat:'comms',    tone:'system',  icon:'ri-mail-send-line',       actor:A.SYS,    verb:'emailed receipt',       obj:'RCPT-2294-001' },

    // Periods 2–4 collapsed sample
    { ts: D(2024,6,25,11,12), cat:'money',    tone:'success', icon:'ri-bank-card-line',       actor:A.SYS,    verb:'received auto-debit payment', obj:'TX-7902', meta:[['Period','2'],['Amount','$1,420.00']] },
    { ts: D(2024,7,25,11,11), cat:'money',    tone:'success', icon:'ri-bank-card-line',       actor:A.SYS,    verb:'received auto-debit payment', obj:'TX-7989', meta:[['Period','3'],['Amount','$1,420.00']] },
    { ts: D(2024,8,25,11,12), cat:'money',    tone:'success', icon:'ri-bank-card-line',       actor:A.SYS,    verb:'received auto-debit payment', obj:'TX-8023', meta:[['Period','4'],['Amount','$1,420.00']] },

    // Period 5 — partial payment & late fee scenario
    { ts: D(2024,9,25,11,12), cat:'money',    tone:'warn',    icon:'ri-error-warning-line',   actor:A.SYS,    verb:'received partial payment', obj:'TX-8055',
      diff:{label:'Period 5', from:'$1,420.00 due', to:'$1,200.00 paid'},
      meta:[['Shortfall','$220.00']] },
    { ts: D(2024,9,26, 6, 0), cat:'comms',    tone:'warn',    icon:'ri-notification-3-line',  actor:A.CRON,   verb:'sent past-due notice',   obj:'Period 5' },
    { ts: D(2024,10,5, 0,15), cat:'system',   tone:'system',  icon:'ri-pulse-line',           actor:A.CRON,   verb:'updated DPD',           obj:'Period 5',
      diff:{label:'DPD', from:'0', to:'10'} },
    { ts: D(2024,10,25, 8, 2),cat:'money',    tone:'warn',    icon:'ri-add-circle-line',      actor:A.CRON,   verb:'assessed late fee',     obj:'$240.00',
      meta:[['Policy','30-day'],['Period','5']] },
    { ts: D(2024,10,28,14,18),cat:'money',    tone:'success', icon:'ri-bank-card-line',       actor:A.SYS,    verb:'received catch-up payment', obj:'TX-8170',
      meta:[['Period','5'],['Amount','$220.00 + $240.00 fee']] },
    { ts: D(2024,10,28,14,30),cat:'money',    tone:'success', icon:'ri-eraser-line',          actor:A.AYANA,  verb:'waived late fee · goodwill', obj:'$240.00',
      diff:{label:'Late fee', from:'$240.00', to:'$0.00'},
      payload:'Customer experienced temporary cash-flow gap; salary timing changed. First-time exception per goodwill policy GW-3.' },

    // Periods 6–12 collapsed
    { ts: D(2024,11,25,11,12),cat:'money',    tone:'success', icon:'ri-bank-card-line',       actor:A.SYS,    verb:'received auto-debit payment', obj:'TX-8240', meta:[['Period','6']] },
    { ts: D(2024,12,25,11,12),cat:'money',    tone:'success', icon:'ri-bank-card-line',       actor:A.SYS,    verb:'received auto-debit payment', obj:'TX-8311', meta:[['Period','7']] },
    { ts: D(2025, 1, 1, 0, 5),cat:'docs',     tone:'system',  icon:'ri-file-text-line',       actor:A.CRON,   verb:'generated annual statement', obj:'STMT-2294-2024',
      meta:[['Year','2024'],['Interest paid','$5,612.40']] },
    { ts: D(2025, 1,25,11,14),cat:'money',    tone:'success', icon:'ri-bank-card-line',       actor:A.SYS,    verb:'received auto-debit payment', obj:'TX-8444', meta:[['Period','8']] },

    // Period 13 — overpayment
    { ts: D(2025, 2, 2,11,12),cat:'money',    tone:'success', icon:'ri-bank-card-line',       actor:A.SYS,    verb:'received early payment', obj:'TX-9301',
      meta:[['Period','13'],['Amount','$1,420.00'],['Days early','23']] },
    { ts: D(2025, 2,14,15, 8),cat:'money',    tone:'success', icon:'ri-add-circle-line',      actor:A.ANNA,   verb:'made top-up payment',   obj:'TX-9322',
      diff:{label:'Period 13', from:'$1,420.00', to:'$1,500.00'},
      meta:[['Excess applied to','Principal']],
      ip:'196.121.4.18' },
    { ts: D(2025, 2,14,15, 9),cat:'money',    tone:'system',  icon:'ri-arrow-down-circle-line',actor:A.SYS,   verb:'applied $80.00 to principal', obj:'PRIN-#3140',
      diff:{label:'Outstanding', from:'$54,210.40', to:'$54,130.40'} },

    // Period 14 — NSF & reversal
    { ts: D(2025, 3,25,11,18),cat:'money',    tone:'danger',  icon:'ri-close-circle-line',    actor:A.BANK,   verb:'returned NSF',          obj:'TX-9501',
      meta:[['Code','R01 · Insufficient funds'],['Amount','$1,420.00']] },
    { ts: D(2025, 3,25,11,20),cat:'money',    tone:'warn',    icon:'ri-arrow-go-back-line',   actor:A.SYS,    verb:'reversed payment',      obj:'TX-9501',
      diff:{label:'Status', from:'Posted', to:'Reversed (NSF)'} },
    { ts: D(2025, 3,25,11,22),cat:'money',    tone:'warn',    icon:'ri-add-circle-line',      actor:A.CRON,   verb:'assessed NSF fee',      obj:'$25.00' },
    { ts: D(2025, 3,25,11,23),cat:'comms',    tone:'warn',    icon:'ri-phone-line',           actor:A.MARIE,  verb:'logged outbound call',  obj:'4 min · LM',
      payload:'Left voicemail. Borrower confirmed by SMS she will fund account by EOD.' },
    { ts: D(2025, 3,26,17, 5),cat:'money',    tone:'success', icon:'ri-bank-card-line',       actor:A.SYS,    verb:'received catch-up payment', obj:'TX-9510',
      meta:[['Period','14'],['Amount','$1,445.00']] },

    // Periods 15–17 collapsed
    { ts: D(2025, 4,25,11,12),cat:'money',    tone:'success', icon:'ri-bank-card-line',       actor:A.SYS,    verb:'received auto-debit payment', obj:'TX-9712', meta:[['Period','15']] },
    { ts: D(2025, 5,25,11,11),cat:'money',    tone:'success', icon:'ri-bank-card-line',       actor:A.SYS,    verb:'received auto-debit payment', obj:'TX-9811', meta:[['Period','16']] },
    { ts: D(2025, 6, 1,11, 0),cat:'money',    tone:'success', icon:'ri-bank-card-line',       actor:A.SYS,    verb:'received auto-debit payment', obj:'TX-9912', meta:[['Period','17']] },

    // ====== Schedule / terms changes ======
    { ts: D(2025, 6,18,14, 5), cat:'self',     tone:'brand',   icon:'ri-user-line',           actor:A.ANNA,   verb:'requested due-date change', obj:'25 → 28',
      ip:'196.121.4.18' },
    { ts: D(2025, 6,19,10,30), cat:'schedule', tone:'system',  icon:'ri-calendar-2-line',     actor:A.AYANA,  verb:'changed payment day',   obj:'L-2294',
      diff:{label:'Payment day', from:'25th', to:'28th'},
      meta:[['Effective','Aug 2025'],['Borrower notified','Yes']] },
    { ts: D(2025, 6,19,10,31), cat:'schedule', tone:'system',  icon:'ri-refresh-line',        actor:A.SYS,    verb:'recomputed schedule',   obj:'Periods 17–84',
      meta:[['Periods touched','68']] },
    { ts: D(2025, 6,19,10,32), cat:'docs',     tone:'system',  icon:'ri-file-text-line',      actor:A.SYS,    verb:'generated',             obj:'Schedule modification · DDC-2294-1',
      meta:[['Pages','3']] },

    // Forbearance
    { ts: D(2025, 8, 4, 9,12), cat:'comms',    tone:'warn',    icon:'ri-mail-line',           actor:A.ANNA,   verb:'submitted hardship request', obj:'HR-104',
      payload:'Lost contract work for 6 weeks. Requesting 2-month forbearance starting Sep 2025.',
      ip:'196.121.4.18' },
    { ts: D(2025, 8, 6,15,40), cat:'schedule', tone:'warn',    icon:'ri-pause-circle-line',   actor:A.AYANA,  verb:'applied forbearance',   obj:'2 periods',
      diff:{label:'Forbearance', from:'None', to:'Sep–Oct 2025'},
      meta:[['Interest accrual','Continues'],['Approved by','A. Bediako']] },
    { ts: D(2025, 8, 6,15,42), cat:'docs',     tone:'system',  icon:'ri-file-text-line',      actor:A.SYS,    verb:'generated',             obj:'Forbearance agreement · FRB-2294-1' },
    { ts: D(2025, 8, 7, 9, 0), cat:'docs',     tone:'success', icon:'ri-pen-nib-line',        actor:A.ANNA,   verb:'e-signed',              obj:'Forbearance agreement · FRB-2294-1',
      ip:'196.121.4.18' },

    // Rate change & promotion
    { ts: D(2025,10,12,14,15), cat:'terms',    tone:'brand',   icon:'ri-percent-line',        actor:A.AYANA,  verb:'modified interest rate', obj:'L-2294',
      diff:{label:'APR', from:'9.5%', to:'9.25%'},
      meta:[['Reason','Loyalty discount · LD-2025'],['Effective','Nov 2025']] },
    { ts: D(2025,10,12,14,16), cat:'schedule', tone:'system',  icon:'ri-refresh-line',        actor:A.SYS,    verb:'recomputed schedule',   obj:'Periods 19–84',
      meta:[['Payment changed','$1,420 → $1,402']] },

    // ====== Comms / disputes ======
    { ts: D(2025,11, 5,10,22), cat:'dispute',  tone:'warn',    icon:'ri-error-warning-line',  actor:A.ANNA,   verb:'opened dispute',        obj:'D-554',
      payload:'Disputes period 18 amount; expected $1,402.00, invoice shows $1,420.00 due to billing-cycle overlap.',
      ip:'196.121.4.18' },
    { ts: D(2025,11, 5,11,42), cat:'dispute',  tone:'system',  icon:'ri-pause-line',          actor:A.SYS,    verb:'paused fees during dispute', obj:'Period 18' },
    { ts: D(2025,11, 6, 9,30), cat:'comms',    tone:'system',  icon:'ri-mail-send-line',      actor:A.AYANA,  verb:'replied to borrower',   obj:'Re: D-554',
      payload:'Confirmed billing system used pre-modification rate for the boundary period; will issue $18 credit.' },
    { ts: D(2025,11, 6,10, 5), cat:'money',    tone:'system',  icon:'ri-coupon-3-line',       actor:A.AYANA,  verb:'issued credit memo',    obj:'CR-2294-009',
      meta:[['Amount','$18.00'],['Applied to','Period 18']] },
    { ts: D(2025,11, 6,10, 6), cat:'dispute',  tone:'success', icon:'ri-checkbox-circle-line',actor:A.AYANA,  verb:'resolved dispute',      obj:'D-554',
      diff:{label:'Status', from:'Open', to:'Resolved · in favor of borrower'} },

    // ====== Customer self-service & profile ======
    { ts: D(2025,12, 8,18,42), cat:'self',     tone:'brand',   icon:'ri-user-line',           actor:A.ANNA,   verb:'updated phone number',  obj:'····5588 → ····7211',
      ip:'196.121.4.18' },
    { ts: D(2025,12, 8,18,44), cat:'compliance',tone:'system', icon:'ri-shield-flash-line',   actor:A.SYS,    verb:'sent OTP for phone change', obj:'OTP-#94221' },
    { ts: D(2026, 1,15, 8,12), cat:'self',     tone:'brand',   icon:'ri-download-line',       actor:A.ANNA,   verb:'downloaded annual statement', obj:'STMT-2294-2025',
      meta:[['Channel','Customer portal']],
      ip:'196.121.4.18' },
    { ts: D(2026, 1,18,10, 1), cat:'self',     tone:'brand',   icon:'ri-price-tag-3-line',    actor:A.ANNA,   verb:'requested payoff quote', obj:'POQ-2294-1',
      ip:'196.121.4.18' },
    { ts: D(2026, 1,18,10, 2), cat:'docs',     tone:'system',  icon:'ri-file-text-line',      actor:A.SYS,    verb:'generated payoff quote', obj:'POQ-2294-1',
      meta:[['Good through','Feb 2, 2026'],['Payoff','$48,718.40']] },

    // ====== Compliance & regulatory ======
    { ts: D(2026, 1,30, 9, 0), cat:'compliance',tone:'system', icon:'ri-shield-user-line',    actor:A.SYS,    verb:'ran annual KYC refresh', obj:'KYC-#3041',
      meta:[['Result','Match · 99%'],['Doc','Ghana Card · valid through 2031']] },
    { ts: D(2026, 2, 1, 6, 0), cat:'compliance',tone:'system', icon:'ri-bar-chart-2-line',    actor:A.CRON,   verb:'reported tranche to credit bureaus', obj:'Q4 2025',
      meta:[['Bureaus','Equifax, XDS Data, Hudson Price']] },

    // Recent activity
    { ts: D(2026, 2,28,11,11), cat:'money',    tone:'success', icon:'ri-bank-card-line',       actor:A.SYS,    verb:'received auto-debit payment', obj:'TX-A311', meta:[['Period','22'],['Amount','$1,402.00']] },
    { ts: D(2026, 3,28,11,11), cat:'money',    tone:'success', icon:'ri-bank-card-line',       actor:A.SYS,    verb:'received auto-debit payment', obj:'TX-A422', meta:[['Period','23']] },
    { ts: D(2026, 4,28,11,11), cat:'money',    tone:'success', icon:'ri-bank-card-line',       actor:A.SYS,    verb:'received auto-debit payment', obj:'TX-A540', meta:[['Period','24']] },

    // Access log entries
    { ts: D(2026, 5, 2,14,12), cat:'audit',    tone:'system',  icon:'ri-eye-line',            actor:A.JOSH,   verb:'viewed loan record',    obj:'L-2294',
      ip:'10.42.18.6' },
    { ts: D(2026, 5, 4,10, 4), cat:'audit',    tone:'system',  icon:'ri-download-line',       actor:A.AYANA,  verb:'exported amortization', obj:'CSV · 84 rows',
      ip:'10.42.18.22' },
    { ts: D(2026, 5, 6, 9,30), cat:'comms',    tone:'system',  icon:'ri-mail-send-line',      actor:A.AYANA,  verb:'sent statement',        obj:'STMT-2294-25',
      meta:[['Channel','Email'],['To','anna.t@example.com']] },

    // Today / very recent
    { ts: D(2026, 5, 9, 8,15), cat:'comms',    tone:'system',  icon:'ri-notification-3-line', actor:A.CRON,   verb:'sent payment reminder', obj:'Period 25',
      meta:[['Channel','SMS'],['Due','May 28']] },
    { ts: D(2026, 5,10, 9, 4), cat:'audit',    tone:'system',  icon:'ri-eye-line',            actor:A.AYANA,  verb:'viewed loan record',    obj:'L-2294',
      ip:'10.42.18.22' },
  ];

  // Sort newest first
  EVENTS.sort((a,b) => b.ts - a.ts);

  // ---------- Render ----------
  const body = document.getElementById('histBody');
  const filters = document.querySelectorAll('#histFilters .ld-hist-chip');
  const actorSel = document.getElementById('histActor');
  const tabCount = document.getElementById('histTabCount');
  const shownLbl = document.getElementById('histShown');

  let activeCat = 'all';
  let activeActor = 'all';

  // populate actor select
  const seenActors = new Map();
  EVENTS.forEach(e => { if (!seenActors.has(e.actor.name)) seenActors.set(e.actor.name, e.actor); });
  for (const a of seenActors.values()) {
    const o = document.createElement('option');
    o.value = a.name; o.textContent = a.name + ' · ' + a.role;
    actorSel.appendChild(o);
  }

  // category counts
  function recountChips(list) {
    const counts = { all: list.length };
    list.forEach(e => counts[e.cat] = (counts[e.cat]||0)+1);
    document.querySelectorAll('#histFilters .ct').forEach(el => {
      const k = el.dataset.ct;
      el.textContent = counts[k] || 0;
    });
  }

  function rowHtml(e) {
    const aClass = 'hist-avatar' + (e.actor.kind === 'system' ? ' bot' : e.actor.kind === 'cron' ? ' cron' : e.actor.kind === 'borrower' ? ' borrower' : '');
    const obj = e.obj ? `<span class="obj ${/^\$|^[A-Z]{2,}-/.test(e.obj) ? 'obj-num' : ''}">${e.obj}</span>` : '';
    let diffHtml = '';
    if (e.diff) {
      diffHtml = `<div class="diff"><span class="lbl">${e.diff.label}:</span>` +
        (e.diff.from ? `<span class="v from">${e.diff.from}</span><span class="arr">→</span>` : '') +
        `<span class="v to">${e.diff.to}</span></div>`;
    }
    let metaHtml = '';
    const metaPills = [];
    if (e.meta) e.meta.forEach(([k,v]) => metaPills.push(`<span class="pill"><span style="color:var(--fg4);">${k}</span> · ${v}</span>`));
    if (e.ip)  metaPills.push(`<span class="pill"><i class="ri-global-line"></i> ${e.ip}</span>`);
    if (metaPills.length) metaHtml = `<div class="meta">${metaPills.join('')}</div>`;
    const payload = e.payload ? `<div class="payload">${e.payload.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</div>` : '';
    return `
      <div class="ld-hist-row${e.payload ? ' has-payload' : ''}">
        <span class="ic" data-tone="${e.tone||'system'}"><i class="${e.icon}"></i></span>
        <div class="body">
          <div class="line"><span class="who">${e.actor.name}</span> <span class="verb">${e.verb}</span> ${obj}</div>
          ${diffHtml}
          ${metaHtml}
          ${payload}
        </div>
        <div class="when" title="${new Date(e.ts).toLocaleString()}">${fmtTime(e.ts)}</div>
      </div>`;
  }

  function render() {
    let list = EVENTS;
    if (activeCat !== 'all')   list = list.filter(e => e.cat === activeCat);
    if (activeActor !== 'all') list = list.filter(e => e.actor.name === activeActor);

    // Update counts (chips reflect totals after actor filter only — like Jira)
    const countsBase = activeActor === 'all' ? EVENTS : EVENTS.filter(e => e.actor.name === activeActor);
    recountChips(countsBase);

    if (tabCount)  tabCount.textContent = String(EVENTS.length);
    if (shownLbl)  shownLbl.textContent = list.length + (list.length === 1 ? ' event' : ' events');

    if (!list.length) {
      body.innerHTML = `
        <div class="ld-hist-empty">
          <i class="ri-inbox-line"></i>
          No events match the current filters.
        </div>`;
      return;
    }

    // Group by day
    const groups = new Map();
    list.forEach(e => {
      const k = dayKey(e.ts);
      if (!groups.has(k)) groups.set(k, { ts: e.ts, events: [] });
      groups.get(k).events.push(e);
    });

    const out = [];
    for (const [, g] of groups) {
      out.push(`<div class="ld-hist-day"><span class="lbl">${fmtDay(g.ts)}</span><span class="rule"></span><span class="ct">${g.events.length} event${g.events.length===1?'':'s'}</span></div>`);
      out.push('<div class="ld-hist-list">');
      g.events.forEach(e => out.push(rowHtml(e)));
      out.push('</div>');
    }
    body.innerHTML = out.join('');

    // Click to expand payload
    body.querySelectorAll('.ld-hist-row.has-payload').forEach(r => {
      r.addEventListener('click', () => r.classList.toggle('expanded'));
    });
  }

  // Wire filters
  filters.forEach(chip => chip.addEventListener('click', () => {
    filters.forEach(c => c.classList.remove('on'));
    chip.classList.add('on');
    activeCat = chip.dataset.cat;
    render();
  }));
  actorSel.addEventListener('change', () => { activeActor = actorSel.value; render(); });

  // ---------- Live append: any toast on this page is a loan event ----------
  // The page already calls toast(msg) for every confirmed action.
  // We monkey-patch it to also append a generic event entry.
  function inferCat(msg) {
    const m = msg.toLowerCase();
    if (/payoff|paid in full|originat|approved|reinstat|charg(e|ed) off|written off|close/.test(m)) return 'lifecycle';
    if (/payment|refund|fee|credit|charge|allocate|reallocate|reverse|disburse/.test(m)) return 'money';
    if (/schedule|defer|reschedule|due date|payment day|forbear|recompute/.test(m)) return 'schedule';
    if (/rate|term|escrow|auto.?debit/.test(m)) return 'terms';
    if (/document|statement|invoice|receipt|letter|quote|signed|generated/.test(m)) return 'docs';
    if (/email|sms|call|notif|reminder|message/.test(m)) return 'comms';
    if (/dispute/.test(m)) return 'dispute';
    return 'system';
  }
  function inferIcon(cat) {
    return ({
      lifecycle:'ri-flag-line', money:'ri-bank-card-line', schedule:'ri-calendar-2-line',
      terms:'ri-file-list-3-line', docs:'ri-file-text-line', comms:'ri-chat-3-line',
      dispute:'ri-error-warning-line', self:'ri-user-line', system:'ri-server-line',
      compliance:'ri-shield-check-line', audit:'ri-eye-line'
    })[cat] || 'ri-server-line';
  }
  if (typeof window.toast === 'function') {
    const orig = window.toast;
    window.toast = function(msg) {
      try {
        const cat = inferCat(String(msg||''));
        EVENTS.unshift({
          ts: Date.now(), cat, tone:'system', icon: inferIcon(cat),
          actor: A.AYANA, verb: String(msg||''), obj: ''
        });
        if (document.querySelector('.ld-pane[data-pane="history"]:not([hidden])')) render();
      } catch(e){}
      return orig.apply(this, arguments);
    };
  }

  render();
})();
