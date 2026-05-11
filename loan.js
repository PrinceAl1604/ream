// ============================================================
// Loan-detail shared JS
// Wires up: variation tabs, payment-modal flow (steps), tweaks
// ============================================================

// Variation switcher
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-var]');
  if (!btn) return;
  const target = btn.dataset.var;
  const root = btn.closest('.var-root') || document;
  root.querySelectorAll('[data-var]').forEach(b => b.classList.toggle('active', b.dataset.var === target));
  root.querySelectorAll('.variation').forEach(v => v.classList.toggle('active', v.dataset.variation === target));
});

// Open / close payment modal
function openPay(role) {
  const m = document.getElementById('payModal');
  if (!m) return;
  m.classList.add('open');
  m.dataset.role = role || 'customer';
  resetPay();
  // Show admin-only fields if role admin
  m.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = (role === 'admin') ? '' : 'none';
  });
  m.querySelectorAll('.customer-only').forEach(el => {
    el.style.display = (role === 'customer') ? '' : 'none';
  });
  // Title
  const t = document.getElementById('payTitleText');
  if (t) t.textContent = (role === 'admin') ? 'Record payment on behalf of customer' : 'Make a payment';
}
function closePay() {
  const m = document.getElementById('payModal');
  if (m) m.classList.remove('open');
}
function resetPay() {
  goToStep(1);
  // Default selections
  document.querySelectorAll('.amt-option').forEach((o, i) => o.classList.toggle('active', i === 0));
  document.querySelectorAll('.method').forEach((o, i) => o.classList.toggle('active', i === 0));
  // Reset proof + memo
  __payProofs = [];
  renderPayProofs();
  const memoEl = document.getElementById('payMemo');
  if (memoEl) memoEl.value = '';
  updatePayTotal();
}

// ---- Proof of payment uploads (admin record-payment flow) ----
let __payProofs = [];
function addPayProof(fileList) {
  const files = Array.from(fileList || []);
  files.forEach(f => {
    __payProofs.push({
      name: f.name,
      sizeKb: Math.max(1, Math.round(f.size / 1024)),
      kind: f.type.startsWith('image/') ? 'image' : (f.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'file'),
    });
  });
  renderPayProofs();
}
function removePayProof(idx) {
  __payProofs.splice(idx, 1);
  renderPayProofs();
}
function renderPayProofs() {
  const list = document.getElementById('payProofList');
  if (!list) return;
  if (!__payProofs.length) { list.style.display = 'none'; list.innerHTML = ''; return; }
  list.style.display = 'flex';
  list.innerHTML = __payProofs.map((p, i) => {
    const icon = p.kind === 'pdf' ? 'ri-file-pdf-2-line' : (p.kind === 'image' ? 'ri-image-line' : 'ri-file-line');
    const tint = p.kind === 'pdf' ? 'var(--color-error-600)' : 'var(--color-blue-600)';
    const sizeTxt = p.sizeKb >= 1024 ? (p.sizeKb / 1024).toFixed(1) + ' MB' : p.sizeKb + ' KB';
    return '' +
      '<div style="display:flex; align-items:center; gap:10px; padding:8px 10px; border:1px solid var(--border-default); border-radius:8px; background:white;">' +
        '<i class="' + icon + '" style="font-size:18px; color:' + tint + ';"></i>' +
        '<div style="flex:1; min-width:0;">' +
          '<div style="font:500 12.5px var(--font-sans); color:var(--color-grey-900); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + p.name + '</div>' +
          '<div style="font-size:11px; color:var(--fg3);">' + sizeTxt + ' · ready</div>' +
        '</div>' +
        '<button type="button" onclick="removePayProof(' + i + ')" style="background:none; border:0; color:var(--fg3); cursor:pointer; padding:4px;" aria-label="Remove"><i class="ri-close-line"></i></button>' +
      '</div>';
  }).join('');
}
// Drag-over visual
document.addEventListener('dragover', e => {
  const drop = e.target.closest && e.target.closest('#payDrop');
  if (drop) { e.preventDefault(); drop.style.borderColor = 'var(--color-brand-600)'; drop.style.background = 'var(--color-brand-50)'; }
});
document.addEventListener('dragleave', e => {
  const drop = e.target.closest && e.target.closest('#payDrop');
  if (drop) { drop.style.borderColor = ''; drop.style.background = ''; }
});
document.addEventListener('drop', e => {
  const drop = e.target.closest && e.target.closest('#payDrop');
  if (drop) {
    e.preventDefault();
    drop.style.borderColor = ''; drop.style.background = '';
    if (e.dataTransfer && e.dataTransfer.files) addPayProof(e.dataTransfer.files);
  }
});

// Steps: 1 amount, 2 method+details, 3 review, 4 success
function goToStep(n) {
  const m = document.getElementById('payModal');
  if (!m) return;
  m.dataset.step = String(n);
  m.querySelectorAll('.pay-step').forEach(s => s.classList.toggle('active', Number(s.dataset.step) === n));
  m.querySelectorAll('.pay-stepper .step').forEach(s => {
    const sn = Number(s.dataset.step);
    s.classList.toggle('active', sn === n);
    s.classList.toggle('done', sn < n);
  });
  // Footer button labels
  const next = document.getElementById('payNextBtn');
  const back = document.getElementById('payBackBtn');
  if (next) {
    if (n === 1) next.innerHTML = 'Continue <i class="ri-arrow-right-line"></i>';
    else if (n === 2) next.innerHTML = 'Review <i class="ri-arrow-right-line"></i>';
    else if (n === 3) {
      const role = m.dataset.role;
      next.innerHTML = (role === 'admin') ? '<i class="ri-check-line"></i> Record payment' : '<i class="ri-lock-line"></i> Pay now';
    }
    else if (n === 4) next.innerHTML = 'Done';
  }
  if (back) back.style.visibility = (n === 1 || n === 4) ? 'hidden' : 'visible';
}

function nextStep() {
  const m = document.getElementById('payModal');
  if (!m) return;
  const n = Number(m.dataset.step || 1);
  if (n === 2) {
    // Admin must attach proof + memo before reviewing
    if (m.dataset.role === 'admin') {
      const memo = (document.getElementById('payMemo') || {}).value || '';
      if (!__payProofs.length) { toast('Attach at least one PDF or image as proof', { icon: 'error-warning-line' }); return; }
      if (!memo.trim()) { toast('Memo is required for the audit log', { icon: 'error-warning-line' }); return; }
    }
    syncReviewFromInputs();
  }
  if (n === 3) {
    submitPay();
    return;
  }
  if (n === 4) { closePay(); return; }
  goToStep(n + 1);
}
function prevStep() {
  const m = document.getElementById('payModal');
  if (!m) return;
  const n = Number(m.dataset.step || 1);
  if (n > 1) goToStep(n - 1);
}

function submitPay() {
  const next = document.getElementById('payNextBtn');
  if (next) {
    next.innerHTML = '<span class="spinner" style="color:white;"></span> Processing…';
    next.disabled = true;
  }
  setTimeout(() => {
    if (next) next.disabled = false;
    goToStep(4);
  }, 1200);
}

// Amount selection
document.addEventListener('click', e => {
  const opt = e.target.closest('.amt-option');
  if (opt) {
    document.querySelectorAll('.amt-option').forEach(o => o.classList.remove('active'));
    opt.classList.add('active');
    updatePayTotal();
  }
  const m = e.target.closest('.method');
  if (m) {
    document.querySelectorAll('.method').forEach(o => o.classList.remove('active'));
    m.classList.add('active');
  }
  const sw = e.target.closest('.switch');
  if (sw) sw.classList.toggle('on');
});

function updatePayTotal() {
  const opt = document.querySelector('.amt-option.active');
  if (!opt) return;
  const amt = opt.dataset.amount || '$0';
  const ft = document.getElementById('payTotalAmount');
  if (ft) ft.textContent = amt;
  // Update review screen
  const rA = document.getElementById('reviewAmount');
  if (rA) rA.textContent = amt;
  const rL = document.getElementById('reviewLabel');
  if (rL) rL.textContent = opt.dataset.label || '';
  const rcA = document.getElementById('receiptAmount');
  if (rcA) rcA.textContent = amt;
}

// Sync memo + proof onto Step 3 review whenever the user advances to it
function syncReviewFromInputs() {
  // Memo
  const memo = (document.getElementById('payMemo') || {}).value || '';
  const rm = document.getElementById('reviewMemo');
  if (rm) {
    if (memo.trim()) {
      rm.textContent = memo.trim();
      rm.style.color = 'var(--color-grey-800)';
    } else {
      rm.innerHTML = '<em style="color:var(--fg3); font-style:normal;">No memo entered — required for audit.</em>';
    }
  }
  // Proof
  const rp = document.getElementById('reviewProofList');
  if (rp) {
    if (!__payProofs.length) {
      rp.innerHTML = '<div style="font-size:12.5px; color:var(--color-error-700); display:flex; gap:6px; align-items:center;"><i class="ri-error-warning-line"></i> No proof attached — go back and add a receipt.</div>';
    } else {
      rp.innerHTML = __payProofs.map(p => {
        const icon = p.kind === 'pdf' ? 'ri-file-pdf-2-line' : (p.kind === 'image' ? 'ri-image-line' : 'ri-file-line');
        const tint = p.kind === 'pdf' ? 'var(--color-error-600)' : 'var(--color-blue-600)';
        const sizeTxt = p.sizeKb >= 1024 ? (p.sizeKb / 1024).toFixed(1) + ' MB' : p.sizeKb + ' KB';
        return '<div style="display:flex; gap:10px; align-items:center; padding:8px 10px; border:1px solid var(--border-default); border-radius:8px;">' +
          '<i class="' + icon + '" style="font-size:18px; color:' + tint + ';"></i>' +
          '<div style="flex:1;"><div style="font:500 12.5px var(--font-sans); color:var(--color-grey-900);">' + p.name + '</div>' +
          '<div style="font-size:11px; color:var(--fg3);">' + sizeTxt + '</div></div>' +
          '<span class="badge badge-success" style="font-size:10px;">Attached</span></div>';
      }).join('');
    }
  }
}

// ============================================================
// Toaster
// ============================================================
function toast(msg, opts) {
  opts = opts || {};
  let host = document.getElementById('toaster');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toaster';
    host.className = 'toaster';
    document.body.appendChild(host);
  }
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = '<i class="ri-' + (opts.icon || 'information-line') + '"></i><span>' + msg + '</span>';
  host.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity 0.25s, transform 0.25s';
    t.style.opacity = '0';
    t.style.transform = 'translateY(-4px)';
    setTimeout(() => t.remove(), 260);
  }, opts.duration || 2400);
}

// ============================================================
// What-if simulator
// ============================================================
function setSim(extra) {
  extra = Number(extra) || 0;
  // Update chips active state
  document.querySelectorAll('.sim-chip').forEach(c => {
    c.classList.toggle('active', Number(c.dataset.extra) === extra);
  });
  // Naive estimate: $50 extra ~ $3142 saved & 14 months earlier (linear scale)
  const saved = Math.round(extra * 62.84);
  const months = Math.round(extra * 0.28);
  const eS = document.getElementById('simSave');
  if (eS) eS.textContent = '$' + saved.toLocaleString();
  const eE = document.getElementById('simEarly');
  if (eE) eE.textContent = months + (months === 1 ? ' month' : ' months');
}

// ============================================================
// Side-sheet (used for installment, autopay, payoff, hardship, message, schedule, etc.)
// ============================================================
function openSheet(eyebrow, title, bodyHTML, footHTML) {
  const back = document.getElementById('sheet');
  if (!back) return;
  document.getElementById('sheetEyebrow').textContent = eyebrow || '';
  document.getElementById('sheetTitle').textContent = title || '';
  document.getElementById('sheetBody').innerHTML = bodyHTML || '';
  document.getElementById('sheetFoot').innerHTML = footHTML || '<button class="btn btn-secondary btn-sm" type="button" onclick="closeSheet()">Close</button>';
  back.classList.add('open');
}
function closeSheet() {
  const back = document.getElementById('sheet');
  if (back) back.classList.remove('open');
}
// click outside sheet body closes
document.addEventListener('click', e => {
  const back = document.getElementById('sheet');
  if (back && e.target === back) closeSheet();
  const pay = document.getElementById('payModal');
  if (pay && e.target === pay) closePay();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeSheet(); closePay(); }
});

// ============================================================
// Convenience openers used across customer / admin pages
// ============================================================
function downloadDoc(name) {
  toast('Downloading ' + name + '…', { icon: 'download-line' });
}

// ============================================================
// Installment detail
// An installment is a $348.83 obligation. It can be settled by
// 1 payment, by several partial payments, or split across two
// methods (e.g. $200 cash today, $148.83 ACH next week). Each
// payment is its own event — own date, method, amount, receipt
// PDF, and proof attachment.
// ============================================================
const __INSTALLMENT_PAYMENTS = {
  // installment_num -> [payments]
  16: [
    { id: 'PMT-04A18', date: 'Apr 25, 2026 · 9:08am', amount: 348.83, method: 'ACH · Chase ••0118', methodIcon: 'bank-line', kind: 'auto', receipt: 'Receipt-04A18.pdf', proof: { name: 'ACH-confirmation-04A18.pdf', kind: 'pdf', sizeKb: 86 }, recordedBy: 'Auto-debit' },
  ],
  17: [
    { id: 'PMT-04A28', date: 'May 25, 2026 · 9:14am', amount: 348.83, method: 'ACH · Chase ••0118', methodIcon: 'bank-line', kind: 'auto', receipt: 'Receipt-04A28.pdf', proof: { name: 'ACH-confirmation-04A28.pdf', kind: 'pdf', sizeKb: 88 }, recordedBy: 'Auto-debit' },
  ],
  // Example: installment #14 — partial cash + later ACH (proves the model works)
  14: [
    { id: 'PMT-03B91', date: 'Feb 25, 2026 · 4:42pm', amount: 200.00, method: 'Cash · in office', methodIcon: 'money-dollar-circle-line', kind: 'manual', receipt: 'Receipt-03B91.pdf', proof: { name: 'cash-receipt-photo.jpg', kind: 'image', sizeKb: 412 }, recordedBy: 'Kevin Manga · admin' },
    { id: 'PMT-03B97', date: 'Mar 02, 2026 · 11:12am', amount: 148.83, method: 'ACH · Chase ••0118', methodIcon: 'bank-line', kind: 'auto', receipt: 'Receipt-03B97.pdf', proof: { name: 'ACH-confirmation-03B97.pdf', kind: 'pdf', sizeKb: 84 }, recordedBy: 'Customer-initiated' },
  ],
};

function paymentRowHtml(p, i) {
  const proofIcon = p.proof.kind === 'pdf' ? 'ri-file-pdf-2-line' : (p.proof.kind === 'image' ? 'ri-image-line' : 'ri-file-line');
  const proofTint = p.proof.kind === 'pdf' ? 'var(--color-error-600)' : 'var(--color-blue-600)';
  const sizeTxt = p.proof.sizeKb >= 1024 ? (p.proof.sizeKb / 1024).toFixed(1) + ' MB' : p.proof.sizeKb + ' KB';
  const kindBadge = p.kind === 'auto'
    ? '<span class="badge badge-success" style="font-size:10px;">Auto</span>'
    : '<span class="badge" style="font-size:10px; background:var(--color-warning-100); color:var(--color-warning-800);">Manual</span>';
  return (
    '<div class="pmt-row">' +
      '<div class="pmt-num">Payment ' + (i + 1) + '</div>' +
      '<div class="pmt-head">' +
        '<div class="pmt-method"><i class="ri-' + p.methodIcon + '"></i> ' + p.method + ' ' + kindBadge + '</div>' +
        '<div class="pmt-amount">$' + p.amount.toFixed(2) + '</div>' +
      '</div>' +
      '<div class="pmt-meta">' + p.date + ' · ref <span style="font-family:var(--font-mono);">' + p.id + '</span> · ' + p.recordedBy + '</div>' +
      '<div class="pmt-attachments">' +
        '<button type="button" class="pmt-att" onclick="downloadDoc(\'' + p.receipt + '\')">' +
          '<i class="ri-receipt-line" style="color:var(--color-brand-600);"></i>' +
          '<div class="att-meta"><div class="att-name">Receipt</div><div class="att-sub">' + p.receipt + '</div></div>' +
          '<i class="ri-download-line att-cta"></i>' +
        '</button>' +
        '<button type="button" class="pmt-att" onclick="toast(\'Opening proof: ' + p.proof.name + '\', {icon:\'eye-line\'})">' +
          '<i class="' + proofIcon + '" style="color:' + proofTint + ';"></i>' +
          '<div class="att-meta"><div class="att-name">Proof of payment</div><div class="att-sub">' + p.proof.name + ' · ' + sizeTxt + '</div></div>' +
          '<i class="ri-eye-line att-cta"></i>' +
        '</button>' +
      '</div>' +
    '</div>'
  );
}

function openInstallment(num, date, status) {
  const payments = __INSTALLMENT_PAYMENTS[num] || [];
  const due = 348.83;
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, due - totalPaid);
  const pct = Math.min(100, (totalPaid / due) * 100);

  // Banner copy depends on state
  let banner = '';
  if (payments.length === 0) {
    banner = '<div class="inst-banner pending"><i class="ri-time-line"></i><div><strong>Not yet paid.</strong> ' + status + '. The full $348.83 will post on the due date if AutoPay is on.</div></div>';
  } else if (remaining > 0.01) {
    banner = '<div class="inst-banner partial"><i class="ri-information-line"></i><div><strong>Partially paid.</strong> $' + totalPaid.toFixed(2) + ' received across ' + payments.length + ' payment' + (payments.length > 1 ? 's' : '') + '. <strong>$' + remaining.toFixed(2) + ' still owed</strong> on this installment.</div></div>';
  } else {
    const splitNote = payments.length > 1 ? ' across ' + payments.length + ' payments' : '';
    banner = '<div class="inst-banner paid"><i class="ri-check-double-line"></i><div><strong>Settled in full.</strong> $' + totalPaid.toFixed(2) + ' received' + splitNote + '. Receipts below.</div></div>';
  }

  const body = '' +
    '<div class="inst-summary">' +
      '<div class="is-row">' +
        '<div class="is-cell"><div class="l">Due</div><div class="v">' + date + '</div></div>' +
        '<div class="is-cell"><div class="l">Status</div><div class="v">' + status + '</div></div>' +
        '<div class="is-cell"><div class="l">Installment amount</div><div class="v">$' + due.toFixed(2) + '</div></div>' +
      '</div>' +
      '<div class="is-progress">' +
        '<div class="isp-bar"><div class="isp-fill" style="width:' + pct.toFixed(1) + '%;"></div></div>' +
        '<div class="isp-meta"><span>$' + totalPaid.toFixed(2) + ' of $' + due.toFixed(2) + ' paid</span><span>' + (remaining > 0.01 ? '$' + remaining.toFixed(2) + ' left' : 'Fully paid') + '</span></div>' +
      '</div>' +
      '<div class="is-comp">' +
        '<div class="is-comp-row"><span class="sw" style="background:var(--color-brand-500);"></span> Principal <strong>$177.90</strong></div>' +
        '<div class="is-comp-row"><span class="sw" style="background:var(--color-blue-500);"></span> Interest <strong>$97.67</strong></div>' +
        '<div class="is-comp-row"><span class="sw" style="background:var(--color-warning-400);"></span> Escrow <strong>$73.26</strong></div>' +
      '</div>' +
    '</div>' +
    banner +
    '<div class="pmt-section-head"><h4>Payments toward this installment <span class="pmt-count">' + payments.length + '</span></h4>' +
      (remaining > 0.01 ? '<button class="btn btn-secondary btn-sm" type="button" onclick="closeSheet(); openInstallmentPay()"><i class="ri-add-line"></i> Add a payment</button>' : '') +
    '</div>' +
    (payments.length === 0
      ? '<div class="pmt-empty"><i class="ri-inbox-line"></i><div>No payments recorded yet for this installment.</div></div>'
      : '<div class="pmt-list">' + payments.map(paymentRowHtml).join('') + '</div>'
    );

  openSheet('Installment', 'Installment #' + num, body);
}

function openAutopay() {
  openSheet(
    'AutoPay',
    'Automatic payments',
    '<div style="display:flex; flex-direction:column; gap:14px;">' +
    '<div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; border:1px solid var(--border-default); border-radius:10px;">' +
    '<div><div style="font:500 14px var(--font-sans); color:var(--color-grey-900);">AutoPay is on</div><div style="font-size:12px; color:var(--fg3);">Debits the 25th of each month</div></div>' +
    '<div class="switch on"></div></div>' +
    '<div><label style="font-size:12px; color:var(--fg3); display:block; margin-bottom:6px;">Funding source</label>' +
    '<select style="width:100%; padding:10px; border:1px solid var(--border-default); border-radius:8px; font:500 13px var(--font-sans);"><option>Chase checking ••0118 (default)</option><option>Wells Fargo savings ••8842</option></select></div>' +
    '<div><label style="font-size:12px; color:var(--fg3); display:block; margin-bottom:6px;">Day of month</label>' +
    '<select style="width:100%; padding:10px; border:1px solid var(--border-default); border-radius:8px; font:500 13px var(--font-sans);"><option>25th (current)</option><option>1st</option><option>15th</option></select></div>' +
    '<div class="notice info"><i class="ri-information-line"></i><div>Changes take effect for the next installment.</div></div>' +
    '</div>',
    '<button class="btn btn-text btn-sm" type="button" onclick="closeSheet()">Cancel</button>' +
    '<button class="btn btn-primary btn-sm" type="button" onclick="closeSheet(); toast(\'AutoPay updated\', {icon:\'check-line\'})">Save changes</button>'
  );
}

function openFunding() {
  openSheet(
    'Payment method',
    'Funding sources',
    '<div style="display:flex; flex-direction:column; gap:8px;">' +
    '<div class="method active"><div class="micon"><i class="ri-bank-line"></i></div><div><div class="mname">Chase checking ••0118</div><div class="msub">Default · added Jan 2025</div></div><div class="mdefault">Default</div></div>' +
    '<div class="method"><div class="micon"><i class="ri-bank-line"></i></div><div><div class="mname">Wells Fargo savings ••8842</div><div class="msub">Added Mar 2025</div></div><div></div></div>' +
    '<button class="btn btn-secondary btn-sm" type="button" style="justify-content:center; margin-top:6px;" onclick="toast(\'Plaid connect opened\', {icon:\'add-line\'})"><i class="ri-add-line"></i> Add bank account</button>' +
    '</div>'
  );
}

function openPayoff() {
  openSheet(
    'Payoff quote',
    'Request payoff quote',
    '<div style="display:flex; flex-direction:column; gap:14px;">' +
    '<div class="notice info"><i class="ri-information-line"></i><div>A payoff quote is good for 10 days. Full payoff includes a $284 early-payoff fee but saves an estimated $10,902 in future interest.</div></div>' +
    '<div class="kv-grid" style="grid-template-columns:1fr 1fr;">' +
    '<div class="k">Principal balance</div><div class="v">$28,420.00</div>' +
    '<div class="k">Accrued interest</div><div class="v">$112.06</div>' +
    '<div class="k">Early-payoff fee</div><div class="v">$284.00</div>' +
    '<div class="k" style="font-weight:600; color:var(--color-grey-900);">Total payoff</div><div class="v" style="font-weight:700; color:var(--color-grey-900);">$28,816.06</div>' +
    '</div>' +
    '<div><label style="font-size:12px; color:var(--fg3); display:block; margin-bottom:6px;">Send quote to</label>' +
    '<input type="email" value="anna@email.com" style="width:100%; padding:10px; border:1px solid var(--border-default); border-radius:8px; font:500 13px var(--font-sans);"/></div>' +
    '</div>',
    '<button class="btn btn-text btn-sm" type="button" onclick="closeSheet()">Cancel</button>' +
    '<button class="btn btn-primary btn-sm" type="button" onclick="closeSheet(); downloadDoc(\'Payoff-Quote-L2294.pdf\')"><i class="ri-mail-send-line"></i> Email quote</button>'
  );
}

function openHardship() {
  openSheet(
    'Hardship',
    'Request a hardship plan',
    '<div style="display:flex; flex-direction:column; gap:14px;">' +
    '<div class="notice success"><i class="ri-hand-heart-line"></i><div>We get it — life happens. Submitting this puts you in touch with Kevin (your loan officer) within 1 business day. No impact on your credit while we discuss options.</div></div>' +
    '<div><label style="font-size:12px; color:var(--fg3); display:block; margin-bottom:6px;">What\'s going on?</label>' +
    '<select style="width:100%; padding:10px; border:1px solid var(--border-default); border-radius:8px; font:500 13px var(--font-sans);"><option>Job loss</option><option>Medical expense</option><option>Reduced income</option><option>Other</option></select></div>' +
    '<div><label style="font-size:12px; color:var(--fg3); display:block; margin-bottom:6px;">Tell us a bit more (optional)</label>' +
    '<textarea rows="4" style="width:100%; padding:10px; border:1px solid var(--border-default); border-radius:8px; font:500 13px var(--font-sans); resize:vertical;"></textarea></div>' +
    '<div><label style="font-size:12px; color:var(--fg3); display:block; margin-bottom:6px;">Help that might fit</label>' +
    '<div style="display:flex; flex-direction:column; gap:6px; font-size:13px; color:var(--color-grey-800);">' +
    '<label style="display:flex; gap:8px; align-items:center;"><input type="checkbox" checked/> Defer 1–3 payments to end of loan</label>' +
    '<label style="display:flex; gap:8px; align-items:center;"><input type="checkbox"/> Reduce my installment temporarily</label>' +
    '<label style="display:flex; gap:8px; align-items:center;"><input type="checkbox"/> Just need to talk it through</label>' +
    '</div></div>' +
    '</div>',
    '<button class="btn btn-text btn-sm" type="button" onclick="closeSheet()">Cancel</button>' +
    '<button class="btn btn-primary btn-sm" type="button" onclick="closeSheet(); toast(\'Hardship request submitted · Kevin will reach out within 1 business day\', {icon:\'check-line\', duration: 4500})">Submit request</button>'
  );
}

function openMessage() {
  openSheet(
    'Message',
    'Message Kevin Manga',
    '<div style="display:flex; flex-direction:column; gap:14px;">' +
    '<div style="font-size:12px; color:var(--fg3); display:flex; gap:6px; align-items:center;"><i class="ri-time-line"></i> Replies within 1 hour during business hours</div>' +
    '<textarea rows="6" placeholder="What\'s on your mind?" style="width:100%; padding:12px; border:1px solid var(--border-default); border-radius:10px; font:500 13px var(--font-sans); resize:vertical;"></textarea>' +
    '<label style="display:flex; gap:8px; align-items:center; font-size:13px; color:var(--color-grey-800);"><input type="checkbox"/> Attach my loan summary</label>' +
    '</div>',
    '<button class="btn btn-text btn-sm" type="button" onclick="closeSheet()">Cancel</button>' +
    '<button class="btn btn-primary btn-sm" type="button" onclick="closeSheet(); toast(\'Message sent to Kevin\', {icon:\'send-plane-line\'})"><i class="ri-send-plane-line"></i> Send</button>'
  );
}

function openSchedule() {
  // Build a longer schedule list
  let rows = '';
  const start = 16;
  for (let i = 0; i < 16; i++) {
    const num = start + i;
    const dueY = 2026 + Math.floor((4 + i) / 12);
    const dueM = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][(4 + i) % 12];
    const status = i < 2 ? 'Paid' : (i === 2 ? 'Up next' : 'Scheduled');
    const cls = i < 2 ? 'paid' : (i === 2 ? 'next' : '');
    rows += '<tr><td>#' + num + '</td><td>' + dueM + ' 25, ' + dueY + '</td><td>$348.83</td><td><span class="health-pill ' + cls + '">' + status + '</span></td></tr>';
  }
  openSheet(
    'Schedule',
    'Full payment schedule',
    '<table style="width:100%; border-collapse:collapse; font-size:13px;">' +
    '<thead style="background:var(--color-grey-25); color:var(--fg3); font-size:11px; text-transform:uppercase; letter-spacing:0.06em;">' +
    '<tr><th style="text-align:left; padding:10px;">#</th><th style="text-align:left; padding:10px;">Due</th><th style="text-align:left; padding:10px;">Amount</th><th style="text-align:left; padding:10px;">Status</th></tr></thead>' +
    '<tbody style="font-feature-settings: \'tnum\' 1;">' + rows + '</tbody></table>'
  );
}

// Initial sim state on load
document.addEventListener('DOMContentLoaded', () => setSim(50));
