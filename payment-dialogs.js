// ============================================================
// Single-purpose payment dialogs
// Each dialog is self-contained: its own markup, its own open()
// function, its own submit handler. They share visual chrome
// (.pay-modal-back / .pay-modal) but no logic.
//
// Dialogs:
//   #payInstallmentModal  · openInstallmentPay()
//   #payExtraModal        · openExtraPay()
//   #payPayoffModal       · openPayoffPay()
//   #payCatchupModal      · openCatchupPay()
//   #recordPayModal       · openRecordPay()
//
// Each dialog injects its own markup on first open (so any host
// page just needs to include this script + ream + loan-shared CSS).
// ============================================================

(function () {
  // Shared chrome wrapper
  function shell(id, contents) {
    let el = document.getElementById(id);
    if (el) return el;
    el = document.createElement('div');
    el.id = id;
    el.className = 'pay-modal-back';
    el.innerHTML = '<div class="pay-modal" role="dialog" aria-modal="true">' + contents + '</div>';
    document.body.appendChild(el);
    // backdrop click to close
    el.addEventListener('click', e => {
      if (e.target === el) el.classList.remove('open');
    });
    return el;
  }

  function open(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('open');
    // Focus first focusable element
    const f = el.querySelector('input, select, textarea, button');
    if (f) setTimeout(() => f.focus(), 50);
  }
  function close(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  }

  // Esc closes any open payment dialog
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.pay-modal-back.open').forEach(el => el.classList.remove('open'));
  });

  // ============================================================
  // #1 — Pay this installment (customer)
  //   Single screen: confirm funding source, see breakdown, pay.
  //   No amount choice — the installment is fixed.
  // ============================================================
  function buildInstallment() {
    return shell('payInstallmentModal', `
      <div class="pay-head">
        <div class="pay-title"><i class="ri-flashlight-line" style="color: var(--color-brand-600);"></i> Pay your installment</div>
        <div class="pay-sub">Loan #L-2294 · Evergreen Lane</div>
      </div>
      <div class="pay-body" data-screen="form">
        <div class="inst-headline">
          <div class="inst-headline-left">
            <div class="inst-num">Installment #18</div>
            <div class="inst-due">Due Jun 25, 2026 · 14 days from now</div>
          </div>
          <div class="inst-amount">$348.83</div>
        </div>
        <div class="stack-bar" style="margin: 14px 0 6px;">
          <div class="seg principal" style="width:51%;"></div>
          <div class="seg interest"  style="width:28%;"></div>
          <div class="seg escrow"    style="width:21%;"></div>
        </div>
        <div class="stack-legend" style="margin: 0 0 16px;">
          <span class="it"><span class="sw principal"></span> Principal $177.90</span>
          <span class="it"><span class="sw interest"></span> Interest $97.67</span>
          <span class="it"><span class="sw escrow"></span> Escrow $73.26</span>
        </div>

        <div class="eyebrow" style="margin-bottom:8px;">From</div>
        <div class="method-list" data-radio-group="instMethod">
          <div class="method active" data-method="Chase ••0118"><div class="micon"><i class="ri-bank-line"></i></div><div><div class="mname">Chase checking ••0118</div><div class="msub">ACH · 1–2 business days · no fee</div></div><div class="mdefault">Default</div></div>
          <div class="method" data-method="Wells Fargo ••8842"><div class="micon"><i class="ri-bank-line"></i></div><div><div class="mname">Wells Fargo savings ••8842</div><div class="msub">ACH · 1–2 business days · no fee</div></div><div></div></div>
        </div>

        <div class="notice info" style="margin-top:14px;"><i class="ri-shield-check-line"></i><div>Bank-level encryption. We never store your account number — Plaid keeps it.</div></div>
      </div>
      <div class="pay-body" data-screen="success" style="display:none;">
        <div class="receipt">
          <div class="check"><i class="ri-check-line"></i></div>
          <div class="r-amount">$348.83</div>
          <div class="r-sub">Scheduled · posts May 7, 2026</div>
          <div class="r-rows">
            <div class="r-row"><span class="k">Confirmation</span><span class="v" style="font-family:var(--font-mono);">REAM-PMT-04A29</span></div>
            <div class="r-row"><span class="k">Loan</span><span class="v">L-2294 · Evergreen Lane</span></div>
            <div class="r-row"><span class="k">Applied to</span><span class="v">Installment #18 · Jun 25</span></div>
            <div class="r-row" data-from-row><span class="k">From</span><span class="v">Chase ••0118</span></div>
          </div>
          <button class="btn btn-secondary btn-sm" type="button" style="margin-top:16px;" onclick="downloadDoc('Receipt-REAM-PMT-04A29.pdf')"><i class="ri-download-line"></i> Download PDF receipt</button>
        </div>
      </div>
      <div class="pay-foot" data-screen="form">
        <div class="total"><div class="l">You'll pay</div><div class="v">$348.83</div></div>
        <div class="actions">
          <button class="btn btn-text btn-sm" type="button" data-close>Cancel</button>
          <button class="btn btn-primary btn-sm" type="button" data-submit><i class="ri-lock-line"></i> Pay $348.83</button>
        </div>
      </div>
      <div class="pay-foot" data-screen="success" style="display:none;">
        <div></div>
        <div class="actions">
          <button class="btn btn-primary btn-sm" type="button" data-close-success>Done</button>
        </div>
      </div>
    `);
  }
  window.openInstallmentPay = function () {
    const m = buildInstallment();
    // Reset to form
    m.querySelectorAll('[data-screen="form"]').forEach(el => el.style.display = '');
    m.querySelectorAll('[data-screen="success"]').forEach(el => el.style.display = 'none');
    open('payInstallmentModal');

    // Wire method radio
    m.querySelectorAll('.method[data-method]').forEach(el => {
      el.onclick = () => {
        m.querySelectorAll('.method[data-method]').forEach(o => o.classList.remove('active'));
        el.classList.add('active');
      };
    });
    m.querySelectorAll('[data-close]').forEach(b => b.onclick = () => close('payInstallmentModal'));
    m.querySelectorAll('[data-close-success]').forEach(b => b.onclick = () => close('payInstallmentModal'));
    m.querySelector('[data-submit]').onclick = function () {
      const btn = this;
      btn.innerHTML = '<span class="spinner" style="color:white;"></span> Processing…';
      btn.disabled = true;
      // Stamp method onto receipt
      const sel = m.querySelector('.method.active[data-method]');
      const methodTxt = sel ? sel.dataset.method : 'Chase ••0118';
      const r = m.querySelector('[data-from-row] .v'); if (r) r.textContent = methodTxt;
      setTimeout(() => {
        m.querySelectorAll('[data-screen="form"]').forEach(el => el.style.display = 'none');
        m.querySelectorAll('[data-screen="success"]').forEach(el => el.style.display = '');
        btn.disabled = false;
        btn.innerHTML = '<i class="ri-lock-line"></i> Pay $348.83';
      }, 900);
    };
  };

  // ============================================================
  // #2 — Pay extra toward principal
  //   Custom amount + how to apply (next vs principal directly).
  //   No installment list, no fee disclosures — just a faster
  //   payoff lever.
  // ============================================================
  function buildExtra() {
    return shell('payExtraModal', `
      <div class="pay-head">
        <div class="pay-title"><i class="ri-arrow-up-line" style="color: var(--color-success-600);"></i> Pay extra toward principal</div>
        <div class="pay-sub">Loan #L-2294 · Every dollar above your installment shrinks the loan</div>
      </div>
      <div class="pay-body" data-screen="form">
        <div class="eyebrow" style="margin-bottom:8px;">Where should this extra payment go?</div>
        <div class="apply-tiles">
          <button type="button" class="apply-tile active" data-apply="principal">
            <div class="at-head">
              <span class="at-ic"><i class="ri-arrow-down-circle-line"></i></span>
              <span class="badge badge-success">Recommended</span>
            </div>
            <div class="at-title">Toward principal</div>
            <div class="at-sub">Shrinks the balance now. Saves the most interest.</div>
          </button>
          <button type="button" class="apply-tile" data-apply="next">
            <div class="at-head">
              <span class="at-ic"><i class="ri-calendar-check-line"></i></span>
            </div>
            <div class="at-title">Toward next installment</div>
            <div class="at-sub">Covers installment #18 first, leftover to principal.</div>
          </button>
        </div>

        <div class="extra-amount-block" style="margin-top:18px;">
          <label class="eyebrow" style="margin-bottom:8px;">How much extra?</label>
          <div class="extra-input">
            <span class="dollar">$</span>
            <input type="text" id="extraAmt" value="100.00" inputmode="decimal" />
          </div>
          <div class="extra-presets">
            <button type="button" data-preset="50">+$50</button>
            <button type="button" data-preset="100" class="active">+$100</button>
            <button type="button" data-preset="250">+$250</button>
            <button type="button" data-preset="500">+$500</button>
            <button type="button" data-preset="1000">+$1,000</button>
          </div>
        </div>

        <div class="impact-callout">
          <div class="impact-row">
            <div class="il"><i class="ri-coin-line"></i> Lifetime interest saved</div>
            <div class="iv" id="extraSaved">~$1,820</div>
          </div>
          <div class="impact-row">
            <div class="il"><i class="ri-calendar-event-line"></i> Loan ends earlier</div>
            <div class="iv" id="extraEarly">~5 months sooner</div>
          </div>
          <div class="impact-foot" id="extraNote">Estimate based on a one-time $100 extra at today's rate.</div>
        </div>

        <div class="eyebrow" style="margin-top:18px; margin-bottom:8px;">From</div>
        <div class="method-list">
          <div class="method active" data-method="Chase ••0118"><div class="micon"><i class="ri-bank-line"></i></div><div><div class="mname">Chase checking ••0118</div><div class="msub">ACH · 1–2 business days</div></div><div class="mdefault">Default</div></div>
          <div class="method" data-method="Wells Fargo ••8842"><div class="micon"><i class="ri-bank-line"></i></div><div><div class="mname">Wells Fargo savings ••8842</div><div class="msub">ACH · 1–2 business days</div></div><div></div></div>
        </div>
      </div>
      <div class="pay-body" data-screen="success" style="display:none;">
        <div class="receipt">
          <div class="check"><i class="ri-check-line"></i></div>
          <div class="r-amount" data-receipt-amt>$100.00</div>
          <div class="r-sub" data-receipt-sub>Applied to principal · posts May 7</div>
          <div class="r-rows">
            <div class="r-row"><span class="k">Confirmation</span><span class="v" style="font-family:var(--font-mono);">REAM-EXT-9A12C</span></div>
            <div class="r-row"><span class="k">Loan</span><span class="v">L-2294 · Evergreen Lane</span></div>
            <div class="r-row"><span class="k">New balance</span><span class="v" data-new-bal>$28,320.00</span></div>
            <div class="r-row"><span class="k">Interest saved</span><span class="v" data-saved-amt style="color: var(--color-success-700);">~$1,820</span></div>
          </div>
          <button class="btn btn-secondary btn-sm" type="button" style="margin-top:16px;" onclick="downloadDoc('Receipt-REAM-EXT-9A12C.pdf')"><i class="ri-download-line"></i> Receipt</button>
        </div>
      </div>
      <div class="pay-foot" data-screen="form">
        <div class="total"><div class="l">Extra payment</div><div class="v" data-total>$100.00</div></div>
        <div class="actions">
          <button class="btn btn-text btn-sm" type="button" data-close>Cancel</button>
          <button class="btn btn-primary btn-sm" type="button" data-submit><i class="ri-lock-line"></i> Pay extra</button>
        </div>
      </div>
      <div class="pay-foot" data-screen="success" style="display:none;">
        <div></div>
        <div class="actions">
          <button class="btn btn-primary btn-sm" type="button" data-close-success>Done</button>
        </div>
      </div>
    `);
  }

  function fmtMoney(n) {
    n = Number(n) || 0;
    return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  window.openExtraPay = function (initialAmount) {
    const m = buildExtra();
    m.querySelectorAll('[data-screen="form"]').forEach(el => el.style.display = '');
    m.querySelectorAll('[data-screen="success"]').forEach(el => el.style.display = 'none');
    open('payExtraModal');

    const input = m.querySelector('#extraAmt');
    if (initialAmount && !isNaN(initialAmount)) input.value = Number(initialAmount).toFixed(2);

    function refreshImpact() {
      const v = parseFloat(input.value.replace(/[^\d.]/g, '')) || 0;
      const apply = m.querySelector('.apply-tile.active').dataset.apply;
      // Naive: $1 extra ~ $18.20 saved, ~0.05 mo earlier (linear)
      const saved = Math.round(v * 18.20);
      const months = Math.round(v * 0.05);
      m.querySelector('#extraSaved').textContent = saved > 0 ? '~$' + saved.toLocaleString() : '$0';
      m.querySelector('#extraEarly').textContent = months > 0 ? '~' + months + (months === 1 ? ' month' : ' months') + ' sooner' : 'No change';
      m.querySelector('[data-total]').textContent = fmtMoney(v);
      m.querySelector('#extraNote').textContent = (apply === 'principal')
        ? 'Estimate based on a one-time ' + fmtMoney(v) + ' applied directly to principal.'
        : 'Goes to installment #18 first, any leftover to principal.';
      // Highlight presets
      m.querySelectorAll('.extra-presets button').forEach(b => {
        b.classList.toggle('active', Number(b.dataset.preset) === v);
      });
    }

    input.addEventListener('input', refreshImpact);

    m.querySelectorAll('.extra-presets button').forEach(b => {
      b.onclick = () => {
        input.value = Number(b.dataset.preset).toFixed(2);
        refreshImpact();
      };
    });
    m.querySelectorAll('.apply-tile').forEach(row => {
      row.onclick = () => {
        m.querySelectorAll('.apply-tile').forEach(r => r.classList.remove('active'));
        row.classList.add('active');
        refreshImpact();
      };
    });
    m.querySelectorAll('.method[data-method]').forEach(el => {
      el.onclick = () => {
        m.querySelectorAll('.method[data-method]').forEach(o => o.classList.remove('active'));
        el.classList.add('active');
      };
    });
    m.querySelectorAll('[data-close]').forEach(b => b.onclick = () => close('payExtraModal'));
    m.querySelectorAll('[data-close-success]').forEach(b => b.onclick = () => close('payExtraModal'));
    m.querySelector('[data-submit]').onclick = function () {
      const btn = this;
      const v = parseFloat(input.value.replace(/[^\d.]/g, '')) || 0;
      if (v <= 0) { toast('Enter an amount above $0', { icon: 'error-warning-line' }); return; }
      btn.innerHTML = '<span class="spinner" style="color:white;"></span> Processing…';
      btn.disabled = true;
      const apply = m.querySelector('.apply-tile.active').dataset.apply;
      const saved = Math.round(v * 18.20);
      m.querySelector('[data-receipt-amt]').textContent = fmtMoney(v);
      m.querySelector('[data-receipt-sub]').textContent = (apply === 'principal' ? 'Applied directly to principal' : 'Applied to installment #18 + principal') + ' · posts May 7';
      m.querySelector('[data-new-bal]').textContent = fmtMoney(28420 - v);
      m.querySelector('[data-saved-amt]').textContent = saved > 0 ? '~$' + saved.toLocaleString() : '$0';
      setTimeout(() => {
        m.querySelectorAll('[data-screen="form"]').forEach(el => el.style.display = 'none');
        m.querySelectorAll('[data-screen="success"]').forEach(el => el.style.display = '');
        btn.disabled = false;
        btn.innerHTML = '<i class="ri-lock-line"></i> Pay extra';
      }, 900);
    };

    refreshImpact();
  };

  // ============================================================
  // #3 — Pay off the entire loan
  //   Frames it as a serious decision: shows the quote breakdown
  //   (principal + accrued interest + early-payoff fee), tests
  //   ack via checkbox, requires confirming "Pay off loan".
  // ============================================================
  function buildPayoff() {
    return shell('payPayoffModal', `
      <div class="pay-head">
        <div class="pay-title"><i class="ri-flag-2-line" style="color: var(--color-brand-600);"></i> Pay off your loan</div>
        <div class="pay-sub">Loan #L-2294 · Evergreen Lane · Anna Amirah</div>
      </div>
      <div class="pay-body" data-screen="form">
        <div class="payoff-banner">
          <div class="pb-eyebrow">Save in interest</div>
          <div class="pb-amount">$10,902.14</div>
          <div class="pb-sub">By paying off today instead of staying on schedule</div>
        </div>

        <div class="eyebrow" style="margin: 18px 0 8px;">Today's payoff quote · valid through Jun 30, 2026</div>
        <div class="quote-table">
          <div class="qr"><span class="k">Principal balance</span><span class="v">$28,420.00</span></div>
          <div class="qr"><span class="k">Accrued interest <span class="qhint">since last installment</span></span><span class="v">$112.06</span></div>
          <div class="qr"><span class="k">Early-payoff fee <span class="qhint">1% of principal</span></span><span class="v">$284.00</span></div>
          <div class="qr total"><span class="k">Total payoff today</span><span class="v">$28,816.06</span></div>
        </div>

        <div class="notice warning" style="margin-top:14px;">
          <i class="ri-information-line"></i>
          <div>
            <strong style="color: var(--color-warning-800);">Heads up:</strong> Paying off ends your AutoPay and closes loan #L-2294. Your title transfers from escrow to your name within 5 business days.
          </div>
        </div>

        <label class="ack-row" id="payoffAck">
          <input type="checkbox" id="payoffAckBox" />
          <span>I understand the early-payoff fee and that this closes the loan permanently.</span>
        </label>

        <div class="eyebrow" style="margin-top:14px; margin-bottom:8px;">Pay from</div>
        <div class="method-list">
          <div class="method active" data-method="Chase ••0118"><div class="micon"><i class="ri-bank-line"></i></div><div><div class="mname">Chase checking ••0118</div><div class="msub">Verified balance · sufficient funds</div></div><div class="mdefault">Default</div></div>
          <div class="method" data-method="Wells Fargo ••8842"><div class="micon"><i class="ri-bank-line"></i></div><div><div class="mname">Wells Fargo savings ••8842</div><div class="msub">Verified · sufficient funds</div></div><div></div></div>
          <div class="method" data-method="Wire transfer"><div class="micon"><i class="ri-arrow-right-line"></i></div><div><div class="mname">Wire transfer</div><div class="msub">Same-day · $25 fee from your bank</div></div><div></div></div>
        </div>
      </div>
      <div class="pay-body" data-screen="success" style="display:none;">
        <div class="receipt">
          <div class="check" style="background: var(--color-brand-100); color: var(--color-brand-700);"><i class="ri-flag-2-line"></i></div>
          <div class="r-amount">$28,816.06</div>
          <div class="r-sub">Loan paid off · scheduled May 7, 2026</div>
          <div class="r-rows">
            <div class="r-row"><span class="k">Confirmation</span><span class="v" style="font-family:var(--font-mono);">REAM-PYO-31FF8</span></div>
            <div class="r-row"><span class="k">Loan closed</span><span class="v">L-2294 · Evergreen Lane</span></div>
            <div class="r-row"><span class="k">Title transfer</span><span class="v">Within 5 business days</span></div>
            <div class="r-row"><span class="k">Interest saved</span><span class="v" style="color:var(--color-success-700);">$10,902.14</span></div>
          </div>
          <div style="margin-top:18px; padding:14px; background: var(--color-brand-50); border:1px solid var(--color-brand-200); border-radius:10px; font-size:12.5px; color: var(--color-brand-800); text-align:left;">
            <strong>Congratulations 🎉</strong> Your title transfer is in motion. Kevin will email you when it's recorded — usually 3–5 business days.
          </div>
          <button class="btn btn-secondary btn-sm" type="button" style="margin-top:14px;" onclick="downloadDoc('Payoff-Receipt-L2294.pdf')"><i class="ri-download-line"></i> Receipt</button>
        </div>
      </div>
      <div class="pay-foot" data-screen="form">
        <div class="total"><div class="l">Total payoff</div><div class="v">$28,816.06</div></div>
        <div class="actions">
          <button class="btn btn-text btn-sm" type="button" data-close>Cancel</button>
          <button class="btn btn-text btn-sm" type="button" id="payoffEmail"><i class="ri-mail-line"></i> Email me the quote</button>
          <button class="btn btn-primary btn-sm" type="button" data-submit disabled><i class="ri-lock-line"></i> Pay off loan</button>
        </div>
      </div>
      <div class="pay-foot" data-screen="success" style="display:none;">
        <div></div>
        <div class="actions">
          <button class="btn btn-primary btn-sm" type="button" data-close-success>Done</button>
        </div>
      </div>
    `);
  }
  window.openPayoffPay = function () {
    const m = buildPayoff();
    m.querySelectorAll('[data-screen="form"]').forEach(el => el.style.display = '');
    m.querySelectorAll('[data-screen="success"]').forEach(el => el.style.display = 'none');
    open('payPayoffModal');

    const ack = m.querySelector('#payoffAckBox');
    const submit = m.querySelector('[data-submit]');
    ack.checked = false;
    submit.disabled = true;
    ack.onchange = () => { submit.disabled = !ack.checked; };

    m.querySelectorAll('.method[data-method]').forEach(el => {
      el.onclick = () => {
        m.querySelectorAll('.method[data-method]').forEach(o => o.classList.remove('active'));
        el.classList.add('active');
      };
    });
    m.querySelector('#payoffEmail').onclick = () => {
      toast('Quote emailed to anna@email.com', { icon: 'mail-send-line' });
    };
    m.querySelectorAll('[data-close]').forEach(b => b.onclick = () => close('payPayoffModal'));
    m.querySelectorAll('[data-close-success]').forEach(b => b.onclick = () => close('payPayoffModal'));
    submit.onclick = function () {
      const btn = this;
      btn.innerHTML = '<span class="spinner" style="color:white;"></span> Processing…';
      btn.disabled = true;
      setTimeout(() => {
        m.querySelectorAll('[data-screen="form"]').forEach(el => el.style.display = 'none');
        m.querySelectorAll('[data-screen="success"]').forEach(el => el.style.display = '');
        btn.disabled = false;
        btn.innerHTML = '<i class="ri-lock-line"></i> Pay off loan';
      }, 1100);
    };
  };

  // ============================================================
  // #4 — Catch up on overdue installments
  //   Multi-select list of unpaid installments. Late fees
  //   surfaced. One transfer clears everything checked.
  // ============================================================
  function buildCatchup() {
    return shell('payCatchupModal', `
      <div class="pay-head">
        <div class="pay-title"><i class="ri-restart-line" style="color: var(--color-warning-700);"></i> Catch up on missed installments</div>
        <div class="pay-sub">Loan #L-2294 · No questions asked, no impact on credit while you're with Ream</div>
      </div>
      <div class="pay-body" data-screen="form">
        <div class="notice warning"><i class="ri-information-line"></i><div>You have 2 missed installments. Catching up clears them all in one transfer and removes the late fees from your record.</div></div>

        <div class="eyebrow" style="margin:14px 0 8px;">Pick what to clear</div>
        <div class="catchup-list">
          <label class="catchup-row checked">
            <input type="checkbox" checked data-amt="368.83" />
            <div class="cu-meta"><div class="cu-num">Installment #16</div><div class="cu-sub">Due Apr 25 · 12 days late</div></div>
            <div class="cu-amts"><div class="cu-base">$348.83</div><div class="cu-fee">+$20 late fee</div></div>
          </label>
          <label class="catchup-row checked">
            <input type="checkbox" checked data-amt="373.83" />
            <div class="cu-meta"><div class="cu-num">Installment #17</div><div class="cu-sub">Due May 25 · 5 days late</div></div>
            <div class="cu-amts"><div class="cu-base">$348.83</div><div class="cu-fee">+$25 late fee</div></div>
          </label>
          <label class="catchup-row">
            <input type="checkbox" data-amt="348.83" />
            <div class="cu-meta"><div class="cu-num">Installment #18 <span class="badge" style="font-size:10px; background: var(--color-grey-100); color: var(--color-grey-700);">Up next</span></div><div class="cu-sub">Due Jun 25 · pay now to stay ahead</div></div>
            <div class="cu-amts"><div class="cu-base">$348.83</div></div>
          </label>
        </div>

        <div class="catchup-summary">
          <div class="cs-row"><span>Installments</span><span data-cs-base>$697.66</span></div>
          <div class="cs-row"><span>Late fees</span><span data-cs-fees>$45.00</span></div>
          <div class="cs-row total"><span>Total</span><span data-cs-total>$742.66</span></div>
        </div>

        <div class="eyebrow" style="margin-top:18px; margin-bottom:8px;">Pay from</div>
        <div class="method-list">
          <div class="method active" data-method="Chase ••0118"><div class="micon"><i class="ri-bank-line"></i></div><div><div class="mname">Chase checking ••0118</div><div class="msub">ACH · 1–2 business days</div></div><div class="mdefault">Default</div></div>
          <div class="method" data-method="Wells Fargo ••8842"><div class="micon"><i class="ri-bank-line"></i></div><div><div class="mname">Wells Fargo savings ••8842</div><div class="msub">ACH · 1–2 business days</div></div><div></div></div>
        </div>

        <div class="hardship-link">
          <i class="ri-hand-heart-line"></i>
          <div>Can't pay everything? <a href="#" onclick="event.preventDefault(); close('payCatchupModal'); openHardship();">Talk to us about a hardship plan</a> — no judgment.</div>
        </div>
      </div>
      <div class="pay-body" data-screen="success" style="display:none;">
        <div class="receipt">
          <div class="check"><i class="ri-check-line"></i></div>
          <div class="r-amount" data-receipt-amt>$742.66</div>
          <div class="r-sub">Caught up · 2 installments + late fees cleared</div>
          <div class="r-rows">
            <div class="r-row"><span class="k">Confirmation</span><span class="v" style="font-family:var(--font-mono);">REAM-CTU-7B440</span></div>
            <div class="r-row"><span class="k">Cleared</span><span class="v" data-receipt-cleared>Installments #16, #17</span></div>
            <div class="r-row"><span class="k">Loan</span><span class="v">L-2294 · Evergreen Lane</span></div>
          </div>
          <button class="btn btn-secondary btn-sm" type="button" style="margin-top:16px;" onclick="downloadDoc('Receipt-REAM-CTU-7B440.pdf')"><i class="ri-download-line"></i> Receipt</button>
        </div>
      </div>
      <div class="pay-foot" data-screen="form">
        <div class="total"><div class="l">You'll pay</div><div class="v" data-total>$742.66</div></div>
        <div class="actions">
          <button class="btn btn-text btn-sm" type="button" data-close>Cancel</button>
          <button class="btn btn-primary btn-sm" type="button" data-submit><i class="ri-lock-line"></i> Pay $742.66</button>
        </div>
      </div>
      <div class="pay-foot" data-screen="success" style="display:none;">
        <div></div>
        <div class="actions">
          <button class="btn btn-primary btn-sm" type="button" data-close-success>Done</button>
        </div>
      </div>
    `);
  }
  window.openCatchupPay = function () {
    const m = buildCatchup();
    m.querySelectorAll('[data-screen="form"]').forEach(el => el.style.display = '');
    m.querySelectorAll('[data-screen="success"]').forEach(el => el.style.display = 'none');
    open('payCatchupModal');

    function refreshTotals() {
      let base = 0, fees = 0, picked = [];
      m.querySelectorAll('.catchup-row').forEach((row, i) => {
        const cb = row.querySelector('input[type="checkbox"]');
        const amt = parseFloat(cb.dataset.amt) || 0;
        const fee = (() => {
          const f = row.querySelector('.cu-fee');
          if (!f) return 0;
          const txt = f.textContent.match(/\$([\d.]+)/);
          return txt ? parseFloat(txt[1]) : 0;
        })();
        row.classList.toggle('checked', cb.checked);
        if (cb.checked) {
          base += (amt - fee);
          fees += fee;
          picked.push('#' + (16 + i));
        }
      });
      const total = base + fees;
      m.querySelector('[data-cs-base]').textContent = fmtMoney(base);
      m.querySelector('[data-cs-fees]').textContent = fmtMoney(fees);
      m.querySelector('[data-cs-total]').textContent = fmtMoney(total);
      m.querySelector('[data-total]').textContent = fmtMoney(total);
      const sub = m.querySelector('[data-submit]');
      sub.disabled = total <= 0;
      sub.innerHTML = '<i class="ri-lock-line"></i> Pay ' + fmtMoney(total);
      m._lastTotal = total;
      m._lastPicked = picked;
    }
    m.querySelectorAll('.catchup-row input[type="checkbox"]').forEach(cb => {
      cb.onchange = refreshTotals;
    });
    m.querySelectorAll('.method[data-method]').forEach(el => {
      el.onclick = () => {
        m.querySelectorAll('.method[data-method]').forEach(o => o.classList.remove('active'));
        el.classList.add('active');
      };
    });
    m.querySelectorAll('[data-close]').forEach(b => b.onclick = () => close('payCatchupModal'));
    m.querySelectorAll('[data-close-success]').forEach(b => b.onclick = () => close('payCatchupModal'));
    m.querySelector('[data-submit]').onclick = function () {
      const btn = this;
      btn.innerHTML = '<span class="spinner" style="color:white;"></span> Processing…';
      btn.disabled = true;
      setTimeout(() => {
        m.querySelector('[data-receipt-amt]').textContent = fmtMoney(m._lastTotal);
        m.querySelector('[data-receipt-cleared]').textContent = 'Installments ' + (m._lastPicked || []).join(', ');
        m.querySelectorAll('[data-screen="form"]').forEach(el => el.style.display = 'none');
        m.querySelectorAll('[data-screen="success"]').forEach(el => el.style.display = '');
        btn.disabled = false;
      }, 1000);
    };

    refreshTotals();
  };

  // ============================================================
  // #5 — Record offline payment (admin only)
  //   This isn't a payment — it's an attestation. Demands a memo
  //   + proof attachment. Submission goes to a review queue, not
  //   directly applied.
  // ============================================================
  let __recordProofs = [];
  function buildRecord() {
    return shell('recordPayModal', `
      <div class="pay-head">
        <div class="pay-title"><i class="ri-file-edit-line" style="color: var(--color-warning-700);"></i> Record offline payment</div>
        <div class="pay-sub">Loan #L-2294 · Anna Amirah · Submitted for review</div>
      </div>
      <div class="pay-body" data-screen="form">
        <div class="notice warning" style="margin-bottom:14px;"><i class="ri-shield-check-line"></i><div><strong>Audit-tracked.</strong> Recording a payment requires a memo and at least one piece of proof (PDF or image). It will appear in the review queue before being applied to the loan.</div></div>

        <div class="eyebrow" style="margin-bottom:8px;">Amount &amp; date</div>
        <div class="record-grid">
          <div>
            <label>Amount received</label>
            <div class="extra-input"><span class="dollar">$</span><input type="text" id="recordAmt" value="348.83" inputmode="decimal" /></div>
          </div>
          <div>
            <label>Received on</label>
            <input type="date" id="recordDate" value="2026-05-25" />
          </div>
        </div>

        <div class="eyebrow" style="margin: 18px 0 8px;">Method received</div>
        <div class="record-method-row">
          <select id="recordMethod">
            <option value="cash">Cash in person</option>
            <option value="check">Personal check</option>
            <option value="cashier">Cashier's check / money order</option>
            <option value="wire">Wire transfer (offline)</option>
            <option value="other">Other</option>
          </select>
          <input type="text" id="recordRef" placeholder="Reference # (check no., wire ID…)" />
        </div>

        <div class="eyebrow" style="margin: 18px 0 8px;">Purpose <span style="color: var(--color-error-600);">*</span></div>
        <select id="recordPurpose" style="width: 100%;">
          <optgroup label="Loan payments">
            <option value="installment" selected>Regular monthly installment</option>
            <option value="principal-only">Principal-only payment</option>
            <option value="interest-only">Interest-only payment</option>
            <option value="balloon">Balloon payment</option>
            <option value="catch-up">Catch-up / arrears payment</option>
            <option value="payoff">Loan payoff (full settlement)</option>
            <option value="late-fee">Late fee</option>
            <option value="prepay-penalty">Prepayment penalty</option>
            <option value="buydown">Rate buydown / discount points</option>
          </optgroup>
          <optgroup label="Purchase &amp; closing">
            <option value="down-payment">Down payment</option>
            <option value="earnest">Earnest money / deposit</option>
            <option value="closing-costs">Closing costs</option>
            <option value="origination">Origination fee</option>
            <option value="application">Application fee</option>
            <option value="appraisal">Appraisal fee</option>
            <option value="inspection">Inspection fee</option>
            <option value="title">Title / legal fee</option>
            <option value="survey">Survey fee</option>
          </optgroup>
          <optgroup label="Escrow &amp; recurring">
            <option value="escrow">Escrow / impound deposit</option>
            <option value="property-tax">Property tax</option>
            <option value="hoi">Homeowner's insurance</option>
            <option value="pmi">Mortgage insurance (PMI)</option>
            <option value="hoa">HOA / condo dues</option>
            <option value="utilities">Utilities reimbursement</option>
            <option value="maintenance">Maintenance / repair reserve</option>
          </optgroup>
          <optgroup label="Other">
            <option value="security-deposit">Security deposit (rent-to-own)</option>
            <option value="rent">Rent payment (rent-to-own)</option>
            <option value="refund">Refund / reversal</option>
            <option value="adjustment">Manual adjustment</option>
            <option value="other">Other (describe in memo)</option>
          </optgroup>
        </select>

        <div class="eyebrow" style="margin: 18px 0 8px;">Apply to <span style="color:var(--fg3); font-weight:400;">(this is a recommendation; reviewer decides)</span></div>
        <select id="recordApply" style="width: 100%;">
          <option value="next">Next due installment (#18 · Jun 25, 2026)</option>
          <option value="oldest">Oldest unpaid installment first</option>
          <option value="principal">Directly to principal</option>
        </select>

        <div class="eyebrow" style="margin: 18px 0 8px;">Memo <span style="color: var(--color-error-600);">*</span></div>
        <textarea id="recordMemo" rows="3" placeholder="Why is this being recorded offline? (e.g. 'Customer paid in cash at the office on May 25 — handled by Kevin')"></textarea>

        <div class="eyebrow" style="margin: 18px 0 8px;">Proof of payment <span style="color: var(--color-error-600);">*</span></div>
        <div class="record-drop" id="recordDrop">
          <i class="ri-upload-cloud-2-line"></i>
          <div class="rd-title">Drag a PDF or image here</div>
          <div class="rd-sub">or <label style="color: var(--color-brand-600); cursor: pointer; text-decoration: underline;"><input type="file" multiple accept=".pdf,image/*" style="display:none;" id="recordFiles" />click to browse</label> · receipts, photo of check, deposit slip, etc.</div>
        </div>
        <div class="record-proof-list" id="recordProofList" style="display:none;"></div>
      </div>
      <div class="pay-body" data-screen="success" style="display:none;">
        <div class="receipt">
          <div class="check" style="background: var(--color-warning-100); color: var(--color-warning-700);"><i class="ri-time-line"></i></div>
          <div class="r-amount" data-receipt-amt>$348.83</div>
          <div class="r-sub">Submitted for review · queued under <a href="payment-review.html" style="color: var(--color-brand-600); text-decoration: underline;">Pending</a></div>
          <div class="r-rows">
            <div class="r-row"><span class="k">Submission ID</span><span class="v" style="font-family:var(--font-mono);">REAM-REC-D77E2</span></div>
            <div class="r-row"><span class="k">Submitted by</span><span class="v">You · Kevin Manga</span></div>
            <div class="r-row"><span class="k">Review SLA</span><span class="v">Within 1 business day</span></div>
            <div class="r-row"><span class="k">Loan</span><span class="v">L-2294 · Anna Amirah</span></div>
          </div>
          <div style="margin-top:18px; padding:14px; background: var(--color-warning-50); border:1px solid var(--color-warning-200); border-radius:10px; font-size:12.5px; color: var(--color-warning-800); text-align:left;">
            <i class="ri-information-line"></i> The amount won't show on the customer's loan until a second admin approves it from the <a href="payment-review.html" style="color: var(--color-warning-800); text-decoration: underline;">review queue</a>.
          </div>
        </div>
      </div>
      <div class="pay-foot" data-screen="form">
        <div class="total"><div class="l">Submitting</div><div class="v" data-total>$348.83</div></div>
        <div class="actions">
          <button class="btn btn-text btn-sm" type="button" data-close>Cancel</button>
          <button class="btn btn-primary btn-sm" type="button" data-submit><i class="ri-send-plane-line"></i> Submit for review</button>
        </div>
      </div>
      <div class="pay-foot" data-screen="success" style="display:none;">
        <div></div>
        <div class="actions">
          <a class="btn btn-secondary btn-sm" href="payment-review.html"><i class="ri-list-check"></i> Open review queue</a>
          <button class="btn btn-primary btn-sm" type="button" data-close-success>Done</button>
        </div>
      </div>
    `);
  }

  function renderRecordProofs(m) {
    const list = m.querySelector('#recordProofList');
    if (!__recordProofs.length) { list.style.display = 'none'; list.innerHTML = ''; return; }
    list.style.display = 'flex';
    list.innerHTML = __recordProofs.map((p, i) => {
      const icon = p.kind === 'pdf' ? 'ri-file-pdf-2-line' : (p.kind === 'image' ? 'ri-image-line' : 'ri-file-line');
      const tint = p.kind === 'pdf' ? 'var(--color-error-600)' : 'var(--color-blue-600)';
      const sizeTxt = p.sizeKb >= 1024 ? (p.sizeKb / 1024).toFixed(1) + ' MB' : p.sizeKb + ' KB';
      return `
        <div class="record-proof">
          <i class="${icon}" style="font-size:18px; color:${tint};"></i>
          <div class="rp-meta"><div class="rp-name">${p.name}</div><div class="rp-sub">${sizeTxt} · ready</div></div>
          <button type="button" class="rp-remove" data-rm="${i}" aria-label="Remove"><i class="ri-close-line"></i></button>
        </div>`;
    }).join('');
    list.querySelectorAll('[data-rm]').forEach(btn => {
      btn.onclick = () => {
        __recordProofs.splice(Number(btn.dataset.rm), 1);
        renderRecordProofs(m);
      };
    });
  }

  window.openRecordPay = function () {
    __recordProofs = [];
    const m = buildRecord();
    m.querySelectorAll('[data-screen="form"]').forEach(el => el.style.display = '');
    m.querySelectorAll('[data-screen="success"]').forEach(el => el.style.display = 'none');
    open('recordPayModal');

    const amt = m.querySelector('#recordAmt');
    const memo = m.querySelector('#recordMemo');
    const total = m.querySelector('[data-total]');
    function refreshTotal() {
      const v = parseFloat(amt.value.replace(/[^\d.]/g, '')) || 0;
      total.textContent = fmtMoney(v);
    }
    amt.addEventListener('input', refreshTotal);
    refreshTotal();

    // Files
    const drop = m.querySelector('#recordDrop');
    const fi = m.querySelector('#recordFiles');
    fi.addEventListener('change', () => {
      Array.from(fi.files || []).forEach(f => {
        __recordProofs.push({
          name: f.name,
          sizeKb: Math.max(1, Math.round(f.size / 1024)),
          kind: f.type.startsWith('image/') ? 'image' : (f.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'file'),
        });
      });
      renderRecordProofs(m);
    });
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag-over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
    drop.addEventListener('drop', e => {
      e.preventDefault();
      drop.classList.remove('drag-over');
      Array.from(e.dataTransfer.files || []).forEach(f => {
        __recordProofs.push({
          name: f.name,
          sizeKb: Math.max(1, Math.round(f.size / 1024)),
          kind: f.type.startsWith('image/') ? 'image' : (f.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'file'),
        });
      });
      renderRecordProofs(m);
    });

    m.querySelectorAll('[data-close]').forEach(b => b.onclick = () => close('recordPayModal'));
    m.querySelectorAll('[data-close-success]').forEach(b => b.onclick = () => close('recordPayModal'));
    m.querySelector('[data-submit]').onclick = function () {
      const btn = this;
      const v = parseFloat(amt.value.replace(/[^\d.]/g, '')) || 0;
      if (v <= 0) { toast('Enter an amount above $0', { icon: 'error-warning-line' }); return; }
      if (!memo.value.trim()) { toast('Memo is required for the audit log', { icon: 'error-warning-line' }); memo.focus(); return; }
      if (!__recordProofs.length) { toast('Attach at least one PDF or image as proof', { icon: 'error-warning-line' }); return; }
      btn.innerHTML = '<span class="spinner" style="color:white;"></span> Submitting…';
      btn.disabled = true;
      setTimeout(() => {
        m.querySelector('[data-receipt-amt]').textContent = fmtMoney(v);
        m.querySelectorAll('[data-screen="form"]').forEach(el => el.style.display = 'none');
        m.querySelectorAll('[data-screen="success"]').forEach(el => el.style.display = '');
        btn.disabled = false;
      }, 1100);
    };
  };

  // expose close for inline anchor handler use
  window.close = window.close; // (no-op; kept to surface intent)
})();
