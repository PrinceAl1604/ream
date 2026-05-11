// Mock activity log for Ream / Greenline Co.
// Append-only. Mix of human + automated, across loans, lands, sites,
// policies, members, agent assignments, payment approvals.
//
// Reduced detail on routine automated payments — they're collapsed into
// a single line ("AutoPay charged $X"). The richer diff data lives on
// land changes, site updates, role changes, and payment approvals.

(function () {
  const ACTORS = {
    KM:  { id: 'u_km', name: 'Kevin Manga',    role: 'Director',     initials: 'KM', color: '#7c3aed' },
    AH:  { id: 'u_ah', name: 'Anaïs Henriot',  role: 'Manager',      initials: 'AH', color: '#2563eb' },
    MS:  { id: 'u_ms', name: 'Marie Sembe',    role: 'Manager',      initials: 'MS', color: '#0e7490' },
    JV:  { id: 'u_jv', name: 'Jonas Vinka',    role: 'Agent',        initials: 'JV', color: '#9d174d' },
    DK:  { id: 'u_dk', name: 'Diane Kone',     role: 'Agent',        initials: 'DK', color: '#0891b2' },
    AA:  { id: 'u_aa', name: 'Anna Amirah',    role: 'Customer',     initials: 'AA', color: '#16a34a' },
    PR:  { id: 'u_pr', name: 'Pierre Roux',    role: 'Customer',     initials: 'PR', color: '#ca8a04' },
    LO:  { id: 'u_lo', name: 'Lara Okafor',    role: 'Customer',     initials: 'LO', color: '#be185d' },
    BOT_BILL: { id: 'sys_billing', name: 'Billing job',     role: 'Automated', initials: 'BJ', color: '#52525b', bot: true },
    BOT_REM:  { id: 'sys_reminder', name: 'Reminder job',   role: 'Automated', initials: 'RJ', color: '#52525b', bot: true },
    BOT_RECON:{ id: 'sys_reconcile', name: 'Reconciliation',role: 'Automated', initials: 'RC', color: '#52525b', bot: true },
    BOT_DOC:  { id: 'sys_docusign', name: 'DocuSign sync',  role: 'Automated', initials: 'DS', color: '#52525b', bot: true },
  };

  const T = {
    L_2294: { kind: 'loan', id: 'L-2294', label: 'L-2294 · Anna Amirah', href: 'loan-detail-admin.html', land: 'LD-1041' },
    L_2305: { kind: 'loan', id: 'L-2305', label: 'L-2305 · Pierre Roux', href: 'loan-detail-admin.html', land: 'LD-1042' },
    L_2310: { kind: 'loan', id: 'L-2310', label: 'L-2310 · Lara Okafor', href: 'loan-detail-admin.html', land: 'LD-1043' },
    LD_1041:{ kind: 'land', id: 'LD-1041', label: 'LD-1041 · Evergreen Lane', href: 'land-detail.html' },
    LD_1042:{ kind: 'land', id: 'LD-1042', label: 'LD-1042 · Riverbend 3B',   href: 'land-detail.html' },
    LD_1043:{ kind: 'land', id: 'LD-1043', label: 'LD-1043 · Maple Ridge 12', href: 'land-detail.html' },
    LD_1099:{ kind: 'land', id: 'LD-1099', label: 'LD-1099 · draft plot',     href: '#' },
    S_BR:   { kind: 'site', id: 'SI-001',  label: 'Brookfield Estate',       href: 'site-detail.html' },
    S_RV:   { kind: 'site', id: 'SI-002',  label: 'Riverbend Acres',         href: 'site-detail.html' },
    S_MR:   { kind: 'site', id: 'SI-003',  label: 'Maple Ridge',             href: 'site-detail.html' },
    POLICY_LATE: { kind: 'policy', id: 'pol_late_fee',     label: 'Late fee policy',       href: 'settings-organization.html#policies' },
    POLICY_GRACE:{ kind: 'policy', id: 'pol_grace',        label: 'Grace period policy',   href: 'settings-organization.html#policies' },
    POLICY_RATE: { kind: 'policy', id: 'pol_default_rate', label: 'Default interest rate', href: 'settings-organization.html#policies' },
    MEMBER_JV:   { kind: 'member', id: 'u_jv',             label: 'Jonas Vinka',           href: 'settings-organization.html#members' },
    MEMBER_DK:   { kind: 'member', id: 'u_dk',             label: 'Diane Kone',            href: 'settings-organization.html#members' },
    INTEG_DS:    { kind: 'integration', id: 'docusign',    label: 'DocuSign integration',  href: 'settings-organization.html#integrations' },

    // Pending recorded payments awaiting admin review
    PYR_311: { kind: 'payment_review', id: 'PR-00311', label: 'Recorded payment · L-2305', href: 'payment-review.html?id=PR-00311', loan: 'L-2305' },
    PYR_312: { kind: 'payment_review', id: 'PR-00312', label: 'Recorded payment · L-2310', href: 'payment-review.html?id=PR-00312', loan: 'L-2310' },
    PYR_310: { kind: 'payment_review', id: 'PR-00310', label: 'Recorded payment · L-2294', href: 'payment-review.html?id=PR-00310', loan: 'L-2294' },

    // Customer↔agent assignments
    ASSIGN_AA: { kind: 'assignment', id: 'as_aa_jv', label: 'Anna Amirah → Jonas Vinka', href: '#' },
    ASSIGN_PR: { kind: 'assignment', id: 'as_pr_dk', label: 'Pierre Roux → Diane Kone',  href: '#' },
    ASSIGN_LO: { kind: 'assignment', id: 'as_lo_jv', label: 'Lara Okafor → Jonas Vinka', href: '#' },
  };

  const now = new Date();
  function d(daysAgo, h, m) {
    const t = new Date(now);
    t.setDate(t.getDate() - daysAgo);
    if (h != null) t.setHours(h, m || 0, 0, 0);
    return t;
  }

  // event.action: created | updated | deleted | approved | declined | assigned
  // event.kind drives icon/color: created | updated | deleted | payment | status | document | auth | system | assignment | review

  const events = [
    // ===== TODAY =====
    {
      id: 'evt_520', at: d(0, 11, 5),
      actor: ACTORS.KM, action: 'approved', kind: 'review',
      target: T.PYR_310,
      headline: 'Kevin Manga **approved** recorded payment for **L-2294**',
      icon: 'ri-check-double-line',
      diff: [
        { key: 'amount',   from: null, to: '$2,547.84' },
        { key: 'status',   from: 'pending review', to: 'approved' },
        { key: 'applied_to', from: null, to: 'Installment #18 · L-2294' },
      ],
      meta: { proof: 'Receipt-2294-Jun.pdf', recorded_by: 'Anaïs Henriot' }
    },
    {
      id: 'evt_519', at: d(0, 10, 30),
      actor: ACTORS.AH, action: 'created', kind: 'review',
      target: T.PYR_311,
      pending: true,
      headline: 'Anaïs Henriot recorded payment on **L-2305** — **awaiting approval**',
      icon: 'ri-time-line',
      diff: [
        { key: 'amount', from: null, to: '$1,200.00' },
        { key: 'method', from: null, to: 'Bank deposit' },
        { key: 'proof',  from: null, to: 'wire-receipt-2305.pdf' },
      ],
      meta: { note: 'Customer wired from Société Générale, ref REAM-PR-29104' }
    },
    {
      id: 'evt_518', at: d(0, 9, 14),
      actor: ACTORS.JV, action: 'assigned', kind: 'assignment',
      target: T.ASSIGN_AA,
      headline: 'Jonas Vinka was **assigned** as the agent for **Anna Amirah**',
      icon: 'ri-user-shared-line',
      diff: [
        { key: 'agent',    from: 'unassigned',  to: 'Jonas Vinka' },
        { key: 'customer', from: 'Anna Amirah', to: 'Anna Amirah' },
      ],
      meta: { assigned_by: 'Kevin Manga' }
    },
    {
      id: 'evt_517', at: d(0, 9, 12),
      actor: ACTORS.BOT_BILL, action: 'created', kind: 'payment',
      target: T.L_2294,
      headline: 'AutoPay charged **$2,547.84** on **L-2294**',
      icon: 'ri-bank-card-line',
      // Trimmed: no field-by-field diff for routine charge.
      meta: { method: 'ACH', txn: 'TX-00882' }
    },
    {
      id: 'evt_516', at: d(0, 8, 4),
      actor: ACTORS.BOT_REM, action: 'created', kind: 'system',
      target: T.L_2310,
      headline: 'Reminder sent to **Lara Okafor** for **L-2310**',
      icon: 'ri-notification-3-line',
      meta: { channel: 'email' }
    },

    // ===== YESTERDAY =====
    {
      id: 'evt_515', at: d(1, 17, 22),
      actor: ACTORS.KM, action: 'declined', kind: 'review',
      target: T.PYR_312,
      sensitive: true,
      headline: 'Kevin Manga **declined** recorded payment for **L-2310**',
      icon: 'ri-close-circle-line',
      diff: [
        { key: 'status', from: 'pending review', to: 'declined' },
        { key: 'reason', from: null, to: 'Proof unreadable — requesting customer resend' },
      ],
      meta: { recorded_by: 'Diane Kone', proof: 'photo-blurry.jpg' }
    },
    {
      id: 'evt_514', at: d(1, 16, 22),
      actor: ACTORS.KM, action: 'updated', kind: 'updated',
      target: T.POLICY_LATE,
      sensitive: true,
      headline: 'Kevin Manga updated **Late fee policy**',
      icon: 'ri-shield-check-line',
      diff: [
        { key: 'late_fee_amount',       from: '$25.00',     to: '$35.00' },
        { key: 'late_fee_starts_after', from: '7 days',     to: '5 days' },
        { key: 'applies_to',            from: 'Mortgage',   to: 'All products' },
      ],
      meta: { effective_on: '2026-06-01' }
    },
    {
      id: 'evt_513', at: d(1, 15, 5),
      actor: ACTORS.KM, action: 'assigned', kind: 'assignment',
      target: T.ASSIGN_PR,
      headline: 'Kevin Manga **reassigned** Pierre Roux to **Diane Kone**',
      icon: 'ri-user-shared-line',
      diff: [
        { key: 'agent', from: 'Anaïs Henriot', to: 'Diane Kone' },
        { key: 'reason', from: null, to: 'Caseload rebalancing · Q2' },
      ],
      meta: { affected_loans: 'L-2305' }
    },
    {
      id: 'evt_512', at: d(1, 14, 10),
      actor: ACTORS.AH, action: 'updated', kind: 'updated',
      target: T.L_2305,
      headline: 'Anaïs Henriot adjusted **interest rate** on **L-2305**',
      icon: 'ri-percent-line',
      diff: [
        { key: 'interest_rate', from: '6.25%', to: '5.95%' },
        { key: 'reason',        from: null,    to: 'Promotional · returning customer' },
      ],
      meta: { approval: 'Kevin Manga · 2026-05-04' }
    },
    {
      id: 'evt_511', at: d(1, 11, 48),
      actor: ACTORS.BOT_DOC, action: 'updated', kind: 'document',
      target: T.L_2294,
      headline: 'DocuSign — contract for **L-2294** marked **signed**',
      icon: 'ri-quill-pen-line',
      meta: { signed_by: 'Anna Amirah' }
    },
    {
      id: 'evt_510', at: d(1, 9, 32),
      actor: ACTORS.JV, action: 'updated', kind: 'status',
      target: T.LD_1041,
      headline: 'Jonas Vinka changed **status** of **LD-1041**',
      icon: 'ri-flag-line',
      diff: [
        { key: 'status',     from: 'Reserved', to: 'Sold' },
        { key: 'sold_to',    from: null,       to: 'Anna Amirah' },
        { key: 'sale_price', from: null,       to: '$92,000.00' },
      ],
    },

    // ===== 2 DAYS AGO =====
    {
      id: 'evt_509', at: d(2, 17, 5),
      actor: ACTORS.KM, action: 'updated', kind: 'updated',
      target: T.MEMBER_JV,
      sensitive: true,
      headline: 'Kevin Manga changed **role** for Jonas Vinka',
      icon: 'ri-user-settings-line',
      diff: [
        { key: 'role',         from: 'Agent',  to: 'Manager' },
        { key: 'sites_access', from: '1',      to: '3' },
      ],
    },
    {
      id: 'evt_508', at: d(2, 15, 22),
      actor: ACTORS.MS, action: 'created', kind: 'created',
      target: T.L_2310,
      headline: 'Marie Sembe originated loan **L-2310** for Lara Okafor',
      icon: 'ri-bank-line',
      diff: [
        { key: 'principal',     from: null, to: '$54,000.00' },
        { key: 'interest_rate', from: null, to: '6.25%' },
        { key: 'term_months',   from: null, to: '120' },
        { key: 'site',          from: null, to: 'Maple Ridge' },
      ],
    },
    {
      id: 'evt_507', at: d(2, 14, 0),
      actor: ACTORS.AH, action: 'updated', kind: 'updated',
      target: T.S_BR,
      headline: 'Anaïs Henriot updated **Brookfield Estate**',
      icon: 'ri-map-pin-line',
      diff: [
        { key: 'name',           from: 'Brookfield',         to: 'Brookfield Estate' },
        { key: 'manager',        from: 'Marie Sembe',         to: 'Anaïs Henriot' },
        { key: 'cover_photo',    from: 'brookfield-old.jpg',  to: 'brookfield-aerial-2026.jpg' },
        { key: 'amenities',      from: '3 listed',            to: '6 listed' },
      ],
    },
    {
      id: 'evt_506', at: d(2, 13, 1),
      actor: ACTORS.BOT_RECON, action: 'updated', kind: 'system',
      target: T.L_2294,
      headline: 'Reconciliation matched bank deposit to **L-2294**',
      icon: 'ri-link',
      meta: { batch: 'recon_2026-05-03' }
    },
    {
      id: 'evt_505', at: d(2, 11, 30),
      actor: ACTORS.KM, action: 'assigned', kind: 'assignment',
      target: T.ASSIGN_LO,
      headline: 'Kevin Manga **assigned** Lara Okafor to Jonas Vinka',
      icon: 'ri-user-shared-line',
      diff: [
        { key: 'agent',    from: 'unassigned', to: 'Jonas Vinka' },
        { key: 'customer', from: null,         to: 'Lara Okafor' },
      ],
    },
    {
      id: 'evt_504', at: d(2, 9, 18),
      actor: ACTORS.PR, action: 'created', kind: 'auth',
      target: { kind: 'auth', id: 'session_99', label: 'Sign-in', href: '#' },
      headline: 'Pierre Roux signed in from a new device',
      icon: 'ri-login-circle-line',
      meta: { ip: '83.34.55.91', userAgent: 'iPhone · Ream iOS 2.4.0' }
    },

    // ===== 4 DAYS AGO =====
    {
      id: 'evt_503', at: d(4, 11, 30),
      actor: ACTORS.AH, action: 'updated', kind: 'updated',
      target: T.LD_1042,
      headline: 'Anaïs Henriot updated **price** of **LD-1042**',
      icon: 'ri-price-tag-3-line',
      diff: [
        { key: 'list_price', from: '$74,500.00', to: '$72,000.00' },
        { key: 'reason',     from: null,         to: 'Adjusted to match comparables' },
      ],
    },
    {
      id: 'evt_502', at: d(4, 10, 44),
      actor: ACTORS.BOT_BILL, action: 'created', kind: 'payment',
      target: T.L_2294,
      headline: 'AutoPay charged **$2,547.84** on **L-2294**',
      icon: 'ri-bank-card-line',
      meta: { method: 'ACH', txn: 'TX-00881' }
    },
    {
      id: 'evt_501', at: d(4, 9, 0),
      actor: ACTORS.KM, action: 'created', kind: 'created',
      target: T.S_RV,
      headline: 'Kevin Manga created site **Riverbend Acres**',
      icon: 'ri-add-circle-line',
      diff: [
        { key: 'name',     from: null, to: 'Riverbend Acres' },
        { key: 'plots',    from: null, to: '24' },
        { key: 'manager',  from: null, to: 'Anaïs Henriot' },
        { key: 'location', from: null, to: 'Brookfield County, NY' },
        { key: 'area_acres', from: null, to: '38.4' },
      ],
    },

    // ===== 6 DAYS AGO =====
    {
      id: 'evt_500', at: d(6, 16, 12),
      actor: ACTORS.KM, action: 'updated', kind: 'updated',
      target: T.POLICY_GRACE,
      sensitive: true,
      headline: 'Kevin Manga updated **Grace period policy**',
      icon: 'ri-time-line',
      diff: [
        { key: 'grace_days', from: '3',        to: '5' },
        { key: 'applies_to', from: 'Mortgage', to: 'Mortgage, Express' },
      ],
    },
    {
      id: 'evt_499', at: d(6, 14, 56),
      actor: ACTORS.AA, action: 'updated', kind: 'updated',
      target: { kind: 'profile', id: 'u_aa', label: 'Anna Amirah · profile', href: 'settings.html' },
      headline: 'Anna Amirah updated her **mailing address**',
      icon: 'ri-map-pin-line',
      diff: [
        { key: 'mailing_address',
          from: '88 Pinewood Drive, Brookfield, NY 13502',
          to:   '1254 Evergreen Lane, Brookfield, NY 13502' }
      ]
    },
    {
      id: 'evt_498', at: d(6, 11, 22),
      actor: ACTORS.JV, action: 'deleted', kind: 'deleted',
      target: T.LD_1099,
      sensitive: true,
      headline: 'Jonas Vinka deleted draft plot **LD-1099**',
      icon: 'ri-delete-bin-line',
      diff: [
        { key: 'name',   from: 'Draft plot 1099', to: '(deleted)' },
        { key: 'site',   from: 'Brookfield',      to: '(deleted)' },
        { key: 'status', from: 'draft',           to: 'deleted' },
      ],
      meta: { soft_delete: true, restore_until: '2026-08-04' }
    },

    // ===== 7 DAYS AGO =====
    {
      id: 'evt_497', at: d(7, 13, 8),
      actor: ACTORS.AH, action: 'created', kind: 'created',
      target: T.LD_1042,
      headline: 'Anaïs Henriot created plot **LD-1042** at Riverbend',
      icon: 'ri-landscape-line',
      diff: [
        { key: 'plot_number', from: null, to: 'LD-1042' },
        { key: 'area_sqm',    from: null, to: '520' },
        { key: 'list_price',  from: null, to: '$74,500.00' },
        { key: 'site',        from: null, to: 'Riverbend Acres' },
        { key: 'status',      from: null, to: 'Available' },
      ],
    },
    {
      id: 'evt_496', at: d(7, 9, 8),
      actor: ACTORS.AH, action: 'updated', kind: 'updated',
      target: T.L_2305,
      headline: 'Anaïs Henriot adjusted **payment schedule** on **L-2305**',
      icon: 'ri-calendar-event-line',
      diff: [
        { key: 'payment_day',   from: '1',     to: '15' },
        { key: 'next_due_date', from: 'May 1, 2026', to: 'May 15, 2026' },
      ],
    },

    // ===== 10 DAYS AGO =====
    {
      id: 'evt_495', at: d(10, 14, 4),
      actor: ACTORS.KM, action: 'updated', kind: 'updated',
      target: T.POLICY_RATE,
      sensitive: true,
      headline: 'Kevin Manga updated **Default interest rate**',
      icon: 'ri-percent-line',
      diff: [
        { key: 'mortgage_rate', from: '6.25%', to: '6.50%' },
        { key: 'effective_on',  from: null,    to: '2026-06-01' },
      ],
      meta: { notice_sent: 'all_active_loans' }
    },
    {
      id: 'evt_494', at: d(10, 11, 30),
      actor: ACTORS.KM, action: 'created', kind: 'created',
      target: T.MEMBER_DK,
      headline: 'Kevin Manga added **Diane Kone** as Agent',
      icon: 'ri-user-add-line',
      diff: [
        { key: 'role',  from: null, to: 'Agent' },
        { key: 'email', from: null, to: 'diane.kone@greenline.co' },
        { key: 'sites_access', from: null, to: 'Brookfield' },
      ],
    },
    {
      id: 'evt_493', at: d(10, 11, 0),
      actor: ACTORS.LO, action: 'created', kind: 'auth',
      target: { kind: 'auth', id: 'session_88', label: 'Account created', href: '#' },
      headline: 'Lara Okafor signed up and verified email',
      icon: 'ri-user-add-line',
    },

    // ===== 14 DAYS AGO =====
    {
      id: 'evt_492', at: d(14, 10, 12),
      actor: ACTORS.MS, action: 'created', kind: 'created',
      target: T.LD_1043,
      headline: 'Marie Sembe created plot **LD-1043** at Maple Ridge',
      icon: 'ri-landscape-line',
      diff: [
        { key: 'plot_number', from: null, to: 'LD-1043' },
        { key: 'area_sqm',    from: null, to: '450' },
        { key: 'list_price',  from: null, to: '$54,000.00' },
        { key: 'site',        from: null, to: 'Maple Ridge' },
        { key: 'status',      from: null, to: 'Available' },
      ],
    },
    {
      id: 'evt_491', at: d(14, 9, 0),
      actor: ACTORS.MS, action: 'updated', kind: 'updated',
      target: T.S_MR,
      headline: 'Marie Sembe updated **Maple Ridge** site boundaries',
      icon: 'ri-shape-line',
      diff: [
        { key: 'area_acres', from: '12.0', to: '14.4' },
        { key: 'plots',      from: '8',    to: '10' },
        { key: 'survey_doc', from: null,   to: 'maple-ridge-survey-rev2.pdf' },
      ],
    },

    // ===== 18 DAYS AGO =====
    {
      id: 'evt_490', at: d(18, 15, 30),
      actor: ACTORS.KM, action: 'updated', kind: 'updated',
      target: T.INTEG_DS,
      sensitive: true,
      headline: 'Kevin Manga connected **DocuSign**',
      icon: 'ri-link',
      diff: [
        { key: 'status',          from: 'disconnected', to: 'connected' },
        { key: 'account',         from: null,           to: 'greenline-prod@docusign.net' },
        { key: 'webhook_signing', from: null,           to: 'enabled' },
      ],
    },

    // ===== 22 DAYS AGO =====
    {
      id: 'evt_489', at: d(22, 12, 0),
      actor: ACTORS.AH, action: 'updated', kind: 'status',
      target: T.LD_1041,
      headline: 'Anaïs Henriot reserved **LD-1041** for Anna Amirah',
      icon: 'ri-flag-line',
      diff: [
        { key: 'status',       from: 'Available', to: 'Reserved' },
        { key: 'reserved_for', from: null,        to: 'Anna Amirah' },
        { key: 'expires',      from: null,        to: '2026-05-22' },
      ],
    },

    // ===== 25 DAYS AGO =====
    {
      id: 'evt_488', at: d(25, 9, 14),
      actor: ACTORS.JV, action: 'created', kind: 'created',
      target: T.L_2294,
      headline: 'Jonas Vinka originated loan **L-2294** for Anna Amirah',
      icon: 'ri-bank-line',
      diff: [
        { key: 'principal',     from: null, to: '$92,000.00' },
        { key: 'down_payment',  from: null, to: '$13,800.00' },
        { key: 'interest_rate', from: null, to: '6.25%' },
        { key: 'term_months',   from: null, to: '180' },
        { key: 'site',          from: null, to: 'Brookfield' },
      ],
    },
    {
      id: 'evt_487', at: d(28, 14, 0),
      actor: ACTORS.KM, action: 'created', kind: 'created',
      target: T.S_BR,
      headline: 'Kevin Manga created site **Brookfield Estate**',
      icon: 'ri-add-circle-line',
      diff: [
        { key: 'name',       from: null, to: 'Brookfield Estate' },
        { key: 'plots',      from: null, to: '32' },
        { key: 'manager',    from: null, to: 'Marie Sembe' },
        { key: 'area_acres', from: null, to: '52.0' },
        { key: 'location',   from: null, to: 'Brookfield County, NY' },
      ],
    },
  ];

  window.AH_EVENTS = events;
  window.AH_ACTORS = ACTORS;
  window.AH_TARGETS = T;

  // Surface pending payment reviews separately for the queue page
  window.AH_PENDING_REVIEWS = [
    {
      id: 'PR-00311',
      loan: 'L-2305', loanLabel: 'L-2305 · Pierre Roux · Riverbend 3B',
      amount: 1200.00, currency: 'USD',
      method: 'Bank deposit',
      reference: 'REAM-PR-29104',
      receivedOn: '2026-05-05',
      recordedAt: d(0, 10, 30),
      recordedBy: ACTORS.AH,
      customer: { name: 'Pierre Roux', initials: 'PR', color: '#ca8a04' },
      note: 'Pierre wired the catch-up amount from Société Générale this morning. He confirmed the reference number; receipt attached.',
      proof: [
        { name: 'wire-receipt-2305.pdf', size: '184 KB', kind: 'pdf' },
      ],
      status: 'pending',
      appliesTo: 'Installment #6 · Apr 15 (overdue)',
    },
    {
      id: 'PR-00312',
      loan: 'L-2310', loanLabel: 'L-2310 · Lara Okafor · Maple Ridge 12',
      amount: 540.00, currency: 'USD',
      method: 'Cash',
      reference: 'Office · Maple Ridge',
      receivedOn: '2026-05-05',
      recordedAt: d(0, 12, 4),
      recordedBy: ACTORS.DK,
      customer: { name: 'Lara Okafor', initials: 'LO', color: '#be185d' },
      note: 'Customer paid in cash at the Maple Ridge office. Witness: Marie Sembe. Photo of receipt attached.',
      proof: [
        { name: 'photo-blurry.jpg', size: '2.4 MB', kind: 'image' },
      ],
      status: 'pending',
      appliesTo: 'Installment #1 · May 15',
    },
    {
      id: 'PR-00313',
      loan: 'L-2294', loanLabel: 'L-2294 · Anna Amirah · Evergreen Lane',
      amount: 2547.84, currency: 'USD',
      method: 'Check',
      reference: 'Check #2210',
      receivedOn: '2026-05-04',
      recordedAt: d(1, 9, 15),
      recordedBy: ACTORS.JV,
      customer: { name: 'Anna Amirah', initials: 'AA', color: '#16a34a' },
      note: 'Anna dropped off a check at the Brookfield office on her way to work. Will deposit at end of day.',
      proof: [
        { name: 'check-2210-front.pdf', size: '212 KB', kind: 'pdf' },
        { name: 'check-2210-back.pdf',  size: '198 KB', kind: 'pdf' },
      ],
      status: 'pending',
      appliesTo: 'Installment #18 · Jun 25',
    },
  ];
})();
