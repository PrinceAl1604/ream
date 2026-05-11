/* ============================================================
   REAM master glossary — shared by every role guide.
   Renders into <dl class="gd-glossary" id="glossary"></dl>.
   Searchable via filterGlossary(query) hooked up in each page.
   ============================================================ */
window.REAM_GLOSSARY = [
  /* ----- Roles ----- */
  { t: "Public visitor",        g: "Role",      c: "role", d: "Anyone on the public listing site without an account. Sees published properties only." },
  { t: "Prospect",              g: "Role",      c: "role", d: "Someone who submitted interest in a listing — application in flight, not yet signed." },
  { t: "Customer",              g: "Role",      c: "role", d: "A borrower with a signed loan agreement. Stays a customer for the life of the loan." },
  { t: "Sales agent",           g: "Role",      c: "role", d: "Owns a portfolio of prospects from intake through signed contract." },
  { t: "Sales manager",         g: "Role",      c: "role", d: "Runs a team of sales agents. Sees funnel, leaderboard, coaching queue, reassigns prospects." },
  { t: "Sales admin",           g: "Role",      c: "role", d: "Org-wide pipeline, lead-source mix, sets sales templates and policies." },
  { t: "Finance agent",         g: "Role",      c: "role", d: "Confirms payments, allocates incoming money, manages day-to-day ledger." },
  { t: "Finance manager",       g: "Role",      c: "role", d: "Owns aging, reconciliation, write-offs, payoff approvals." },
  { t: "Finance admin",         g: "Role",      c: "role", d: "Owns loan products, fee policies, interest models, period close." },
  { t: "Follow-up agent",       g: "Role",      c: "role", d: "Post-signing point of contact for a portfolio of customers." },
  { t: "Follow-up manager",     g: "Role",      c: "role", d: "Owns retention, satisfaction, hardship escalations." },
  { t: "Follow-up admin",       g: "Role",      c: "role", d: "Org-wide retention policy, contact cadences, satisfaction reporting." },
  { t: "Organization admin",    g: "Role",      c: "role", d: "Owns the REAM tenant — invites everyone, sets policies, owns billing." },
  { t: "Super admin",           g: "Role",      c: "role", d: "REAM staff. Can access any tenant for support; never default-on." },

  /* ----- Lifecycle ----- */
  { t: "Application",           g: "Lifecycle", c: "life", d: "A prospect's in-flight intake → offer → signing record." },
  { t: "Pipeline stage",        g: "Lifecycle", c: "life", d: "Where a prospect sits: New, Qualifying, Site visit, Offer, Signing, Closed." },
  { t: "Loan account",          g: "Lifecycle", c: "life", d: "The container for a signed loan. Replaces the application when signing completes." },
  { t: "Current",               g: "Lifecycle", c: "life", d: "Loan state when no installments are overdue." },
  { t: "Watch",                 g: "Lifecycle", c: "life", d: "One or two installments overdue. Follow-up engages." },
  { t: "Delinquent",            g: "Lifecycle", c: "life", d: "Three or more installments overdue. Restrictions begin." },
  { t: "Paid off",              g: "Lifecycle", c: "life", d: "Loan fully satisfied. Portal goes read-only." },
  { t: "Handover",              g: "Lifecycle", c: "life", d: "Transition of customer relationship from sales → follow-up after signing." },
  { t: "Site",                  g: "Lifecycle", c: "life", d: "A development that contains plots and/or houses." },
  { t: "Plot",                  g: "Lifecycle", c: "life", d: "An individual parcel of land within a site." },
  { t: "House",                 g: "Lifecycle", c: "life", d: "A finished home for sale (with or without included land)." },
  { t: "Listing",               g: "Lifecycle", c: "life", d: "A published, public-facing property page." },
  { t: "Activity",              g: "Lifecycle", c: "life", d: "Any timeline event — call, email, SMS, payment, note, document." },
  { t: "Sub-activity",          g: "Lifecycle", c: "life", d: "A child activity linked to a parent. Use it to track follow-up calls under their original email." },

  /* ----- Financial ----- */
  { t: "Installment",           g: "Financial", c: "fin",  d: "One scheduled monthly payment on a loan." },
  { t: "Principal",             g: "Financial", c: "fin",  d: "The amount owed, separate from interest." },
  { t: "Interest",              g: "Financial", c: "fin",  d: "The cost of borrowing. Accrues monthly." },
  { t: "Outstanding balance",   g: "Financial", c: "fin",  d: "What's still owed at a given moment." },
  { t: "Late fee",              g: "Financial", c: "fin",  d: "Additional charge applied when an installment is past due." },
  { t: "NSF",                   g: "Financial", c: "fin",  d: "Non-Sufficient Funds — a failed auto-debit. May incur a fee." },
  { t: "Deferral",              g: "Financial", c: "fin",  d: "Moving a single installment's due date forward." },
  { t: "Restructure",           g: "Financial", c: "fin",  d: "Recomputing the whole loan schedule. Usually after sustained hardship." },
  { t: "Forbearance",           g: "Financial", c: "fin",  d: "Temporary pause on payments. Manager approval required." },
  { t: "Write-off",             g: "Financial", c: "fin",  d: "Marking principal or fees uncollectible. Finance admin only." },
  { t: "Payoff quote",          g: "Financial", c: "fin",  d: "Formal statement of exactly what's owed to close the loan today." },
  { t: "Indicative offer",      g: "Financial", c: "fin",  d: "Pre-signing computed loan terms — interest, term, deposit, monthly." },
  { t: "Loan product",          g: "Financial", c: "fin",  d: "A reusable offer template (term, interest, deposit, fees)." },
  { t: "Auto-debit",            g: "Financial", c: "fin",  d: "Automatic monthly payment from a linked bank/card." },
  { t: "Allocation",            g: "Financial", c: "fin",  d: "Splitting one received payment across installments, fees, and principal." },
  { t: "Payment review queue",  g: "Financial", c: "fin",  d: "Pending payments awaiting Finance approval before they post to a ledger." },
  { t: "Reconciliation",        g: "Financial", c: "fin",  d: "Matching ledger entries against the bank statement to confirm everything ties." },
  { t: "Aging report",          g: "Financial", c: "fin",  d: "Outstanding balances by how many days overdue." },
  { t: "Quota",                 g: "Financial", c: "fin",  d: "A sales agent's target — signed loans, revenue, or activities." },

  /* ----- Documents ----- */
  { t: "Loan agreement",        g: "Document",  c: "doc",  d: "The signed borrower contract. Lives in Documents permanently." },
  { t: "Document template",     g: "Document",  c: "doc",  d: "Reusable contract or letter with merge fields. Org-level." },
  { t: "Document request",      g: "Document",  c: "doc",  d: "An ask sent to a prospect/customer for a specific file (ID, payslip, etc)." },
  { t: "Statement",             g: "Document",  c: "doc",  d: "Monthly PDF summarizing customer activity, balance, and next payment." },
  { t: "Receipt",               g: "Document",  c: "doc",  d: "Proof of a specific payment." },
  { t: "E-signature",           g: "Document",  c: "doc",  d: "Cryptographically tracked signature on a generated document." },
  { t: "Merge field",           g: "Document",  c: "doc",  d: "Placeholder in a document template (e.g. {{borrower.name}})." },

  /* ----- Access ----- */
  { t: "Invite",                g: "Access",    c: "doc",  d: "Emailed link to join an org as an internal user. Never self-signup." },
  { t: "Magic link",            g: "Access",    c: "doc",  d: "Emailed login link — no password needed." },
  { t: "Impersonate",           g: "Access",    c: "doc",  d: "Logging in as another user for support. Super admin / Org admin only." },
  { t: "Tier",                  g: "Access",    c: "role", d: "Agent / Manager / Admin level within a line (Sales, Finance, Follow-up)." },
  { t: "Line",                  g: "Access",    c: "role", d: "A functional team — Sales, Finance, or Follow-up." },
  { t: "Portfolio",             g: "Access",    c: "role", d: "The set of prospects or customers an agent owns." },
];

window.renderGlossary = function (id) {
  var el = document.getElementById(id || 'glossary');
  if (!el) return;
  el.innerHTML = window.REAM_GLOSSARY.map(function (x) {
    return '<div class="gd-term" data-search="' + (x.t + ' ' + x.g + ' ' + x.d).toLowerCase().replace(/"/g, '') + '">' +
      '<dt>' + x.t + ' <span class="grp ' + x.c + '">' + x.g + '</span></dt>' +
      '<dd>' + x.d + '</dd></div>';
  }).join('');
};

window.filterGlossary = function (q) {
  q = (q || '').toLowerCase().trim();
  document.querySelectorAll('#glossary .gd-term').forEach(function (t) {
    var match = !q || (t.getAttribute('data-search') || '').indexOf(q) > -1;
    t.style.display = match ? '' : 'none';
  });
};
