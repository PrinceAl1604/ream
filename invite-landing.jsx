/* ============================================================
   Ream — Invite landing flow
   What the invitee sees after clicking the email link.
   Each state is a static component rendered into a browser
   frame on the design canvas (happy path + unhappy paths).
   ============================================================ */

const { Fragment } = React;

/* ---------- Mock invite data ---------- */
const INVITE = {
  inviter: {
    name: 'Maria Lopez',
    title: 'Sales Manager',
    org: 'Greenline Land Co.',
    initials: 'ML',
    note: 'Hey Jordan — welcome to the team. Set up your account and ping me when you\u2019re in.',
  },
  invitee: {
    email: 'jordan.evans@ream.example',
    firstName: 'Jordan',
    lastName: 'Evans',
    phone: '+1 (214) 555\u20110123',
  },
  roleLabel: 'Sales agent',
  typeLabel: 'Sales',
  typeNote: 'Inbound prospects',
  expiryRel: 'in 6 days',
  expiryAbs: 'May 13, 2026',
  sentOn: 'Apr 30, 2026',
  token: 'X7K2P9MNQR',
  url: 'https://app.ream.example/invite/agent/X7K2P9MNQR',
};

/* ---------- Browser chrome (purely cosmetic, frames each artboard) ---------- */
const BrowserChrome = ({ url, secure = true }) => (
  <div className="il-bar">
    <div className="il-traffic">
      <span></span><span></span><span></span>
    </div>
    <div className="il-url">
      <i className={secure ? 'ri-lock-line' : 'ri-error-warning-line'}></i>
      <span>{url || INVITE.url}</span>
    </div>
    <div className="il-bar-icons">
      <i className="ri-share-box-line"></i>
      <i className="ri-more-2-fill"></i>
    </div>
  </div>
);

/* ---------- Reusable primitives ---------- */
const Logo = ({ size = 'md' }) => (
  <div className={`il-logo il-logo-${size}`}>
    <span className="il-logo-mark">R</span>
    <span className="il-logo-word">Ream</span>
  </div>
);

const InviterChip = ({ muted = false }) => (
  <div className={`il-chip${muted ? ' is-muted' : ''}`}>
    <span className="il-avatar">{INVITE.inviter.initials}</span>
    <span className="il-chip-text">
      <strong>{INVITE.inviter.name}</strong>
      <span> · {INVITE.inviter.title}</span>
    </span>
  </div>
);

const RolePill = ({ tone = 'brand' }) => (
  <span className={`il-pill il-pill-${tone}`}>
    <i className="ri-briefcase-line"></i> {INVITE.roleLabel}
  </span>
);

/* ---------- The right-side context rail
   variants:
     default   — full colour, used on happy path
     muted     — greyed; used when the link is no longer actionable
     stamped   — muted + stamp overlay (revoked / expired / used)
     help      — generic help-only rail (used when there's no token context)
     mismatch  — highlights the address the invite was meant for
---------- */
const BrandRail = ({ variant = 'default', stamp, mismatchHi }) => {
  const muted = variant === 'muted' || variant === 'stamped';

  if (variant === 'help') {
    return (
      <aside className="il-rail il-rail-help">
        <Logo />
        <div className="il-help-card">
          <div className="il-help-icon"><i className="ri-question-line"></i></div>
          <h4>Need a hand?</h4>
          <p>If you got this link from someone you trust, ask them to re-share it. Otherwise it&rsquo;s safe to close this tab.</p>
          <ul className="il-help-list">
            <li><i className="ri-mail-line"></i> support@ream.example</li>
            <li><i className="ri-time-line"></i> Mon&ndash;Fri, 9&ndash;6 CT</li>
          </ul>
        </div>
        <footer className="il-rail-foot">Ream &middot; Land &amp; loan operations</footer>
      </aside>
    );
  }

  return (
    <aside className={`il-rail${muted ? ' is-muted' : ''}`}>
      <Logo />

      <div className="il-rail-card">
        {stamp && (
          <div className={`il-stamp il-stamp-${stamp.tone}`}>{stamp.label}</div>
        )}

        <div className="il-rail-eyebrow">Invitation</div>

        <div className="il-inviter">
          <span className="il-avatar il-avatar-lg">{INVITE.inviter.initials}</span>
          <div>
            <div className="il-inviter-name">{INVITE.inviter.name}</div>
            <div className="il-inviter-sub">{INVITE.inviter.title} &middot; {INVITE.inviter.org}</div>
          </div>
        </div>

        <blockquote className="il-note">
          &ldquo;{INVITE.inviter.note}&rdquo;
        </blockquote>

        <dl className="il-meta">
          <div>
            <dt>For</dt>
            <dd className={mismatchHi === 'email' ? 'is-hi' : ''}>{INVITE.invitee.email}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd><RolePill /></dd>
          </div>
          <div>
            <dt>Team</dt>
            <dd>{INVITE.typeLabel} &middot; <span className="il-mute">{INVITE.typeNote}</span></dd>
          </div>
          <div>
            <dt>Expires</dt>
            <dd>{INVITE.expiryRel} <span className="il-mute">({INVITE.expiryAbs})</span></dd>
          </div>
        </dl>

        <div className="il-rail-tags">
          <span className="il-tag"><i className="ri-shield-check-line"></i> Single use</span>
          <span className="il-tag"><i className="ri-lock-line"></i> Bound to email</span>
        </div>
      </div>

      <footer className="il-rail-foot">Ream &middot; Land &amp; loan operations</footer>
    </aside>
  );
};

/* ---------- Page frame: chrome + 2-pane layout ---------- */
const Frame = ({ url, children }) => (
  <div className="il-frame">
    <BrowserChrome url={url} />
    <div className="il-page">{children}</div>
  </div>
);

const Pane = ({ children, rail }) => (
  <Fragment>
    <main className="il-main">{children}</main>
    <BrandRail {...(rail || {})} />
  </Fragment>
);

/* ============================================================
   STATE 1 — Welcome / accept invite
   ============================================================ */
const WelcomeState = () => (
  <Pane rail={{ variant: 'default' }}>
    <div className="il-step-tag">Step 1 of 2</div>
    <h1 className="il-h1">You&rsquo;re invited to Ream.</h1>
    <p className="il-lede">
      <strong>{INVITE.inviter.name}</strong> added you to <strong>{INVITE.inviter.org}</strong> as a {INVITE.roleLabel.toLowerCase()}.
    </p>

    <ul className="il-bullets">
      <li><i className="ri-inbox-line"></i> Pick up new prospect leads from a shared queue</li>
      <li><i className="ri-phone-line"></i> Log calls, site visits, and follow-ups against each lead</li>
      <li><i className="ri-line-chart-line"></i> Track your close-rate against your team&rsquo;s targets</li>
    </ul>

    <div className="il-cta-row">
      <button className="il-btn il-btn-primary">
        Accept &amp; continue <i className="ri-arrow-right-line"></i>
      </button>
      <button className="il-btn il-btn-ghost">Decline</button>
    </div>

    <p className="il-fineprint">
      By continuing you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
      Your account will be tied to <strong>{INVITE.invitee.email}</strong>.
    </p>
  </Pane>
);

/* ============================================================
   STATE 2 — Account setup form
   weak: render with weak-password state
   error: render with server-error banner
   ============================================================ */
const SetupFormState = ({ weak = false, error = false }) => (
  <Pane rail={{ variant: 'default' }}>
    <div className="il-step-tag">Step 2 of 2</div>
    <h1 className="il-h1">Set up your account</h1>
    <p className="il-lede">
      A few details so we can drop you into the right work queue.
    </p>

    {error && (
      <div className="il-banner il-banner-error">
        <i className="ri-error-warning-fill"></i>
        <div>
          <strong>We couldn&rsquo;t create your account just now.</strong>
          <span> Please try again in a moment. (ref: err_2f9c)</span>
        </div>
      </div>
    )}

    <form className="il-form">
      <div className="il-field">
        <label>Email <span className="il-locked"><i className="ri-lock-2-line"></i> locked to this invite</span></label>
        <div className="il-input is-locked">
          <span>{INVITE.invitee.email}</span>
          <i className="ri-lock-2-line"></i>
        </div>
      </div>

      <div className="il-field-row">
        <div className="il-field">
          <label>First name</label>
          <div className="il-input"><span>{INVITE.invitee.firstName}</span></div>
        </div>
        <div className="il-field">
          <label>Last name</label>
          <div className="il-input"><span>{INVITE.invitee.lastName}</span></div>
        </div>
      </div>

      <div className="il-field">
        <label>Phone <span className="il-opt">optional &middot; for SMS notifications</span></label>
        <div className="il-input"><span>{INVITE.invitee.phone}</span></div>
      </div>

      <div className="il-field">
        <label>Password</label>
        <div className={`il-input${weak ? ' is-error' : ''}`}>
          <span className="il-mute">{'\u2022'.repeat(weak ? 5 : 12)}</span>
          <i className="ri-eye-off-line"></i>
        </div>
        <div className={`il-strength il-strength-${weak ? 'weak' : 'strong'}`}>
          <div className="il-strength-bars">
            <span className="on"></span>
            <span className={weak ? '' : 'on'}></span>
            <span className={weak ? '' : 'on'}></span>
            <span className={weak ? '' : 'on'}></span>
          </div>
          <span className="il-strength-label">{weak ? 'Weak' : 'Strong'}</span>
        </div>
        {weak ? (
          <ul className="il-hint il-hint-error">
            <li><i className="ri-close-line"></i> At least 12 characters</li>
            <li><i className="ri-check-line"></i> One uppercase letter</li>
            <li><i className="ri-close-line"></i> One number or symbol</li>
          </ul>
        ) : (
          <ul className="il-hint">
            <li><i className="ri-check-line"></i> 12+ characters, mixed case, one symbol</li>
          </ul>
        )}
      </div>

      <div className="il-field">
        <label>Confirm password</label>
        <div className="il-input">
          <span className="il-mute">{'\u2022'.repeat(12)}</span>
          <i className="ri-eye-off-line"></i>
        </div>
      </div>

      <label className="il-check">
        <input type="checkbox" defaultChecked readOnly />
        <span>I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.</span>
      </label>

      <div className="il-cta-row">
        <button
          type="button"
          className={`il-btn il-btn-primary${weak ? ' is-disabled' : ''}`}
        >
          {error ? 'Retry' : 'Create account'} <i className="ri-arrow-right-line"></i>
        </button>
        <button type="button" className="il-btn il-btn-ghost">Back</button>
      </div>
    </form>
  </Pane>
);

/* ============================================================
   STATE 3 — Success / signing in
   ============================================================ */
const SuccessState = () => (
  <Pane rail={{ variant: 'default' }}>
    <div className="il-success-wrap">
      <div className="il-success-icon">
        <i className="ri-check-line"></i>
      </div>
      <h1 className="il-h1">You&rsquo;re in, {INVITE.invitee.firstName}.</h1>
      <p className="il-lede">
        Setting up your <strong>{INVITE.typeLabel}</strong> workspace&hellip;
      </p>
      <ul className="il-progress">
        <li className="done"><i className="ri-check-line"></i> Account created</li>
        <li className="done"><i className="ri-check-line"></i> Linked to {INVITE.inviter.org}</li>
        <li className="done"><i className="ri-check-line"></i> Permissions granted &middot; {INVITE.roleLabel}</li>
        <li className="active"><span className="il-spin"></span> Loading your queue</li>
      </ul>
      <p className="il-fineprint">
        Redirecting to your dashboard in a moment&hellip;
        <a href="#"> Go now &rarr;</a>
      </p>
    </div>
  </Pane>
);

/* ============================================================
   STATE 4 — Expired link
   ============================================================ */
const ExpiredState = () => (
  <Pane rail={{ variant: 'stamped', stamp: { label: 'Expired', tone: 'warn' } }}>
    <div className="il-status">
      <div className="il-status-icon il-status-icon-warn">
        <i className="ri-time-line"></i>
      </div>
      <h1 className="il-h1">This invitation has expired.</h1>
      <p className="il-lede">
        Sent on <strong>{INVITE.sentOn}</strong> with a 7-day expiry. The link stopped working <strong>3 days ago</strong>.
      </p>

      <div className="il-callout">
        <i className="ri-information-line"></i>
        <div>
          Need a fresh invite? We&rsquo;ll let <strong>{INVITE.inviter.name}</strong> know you tried — they can issue a new link in one click.
        </div>
      </div>

      <div className="il-cta-row">
        <button className="il-btn il-btn-primary">
          <i className="ri-mail-send-line"></i> Request a new invite
        </button>
        <button className="il-btn il-btn-ghost">Contact support</button>
      </div>

      <p className="il-fineprint">
        Already have an account at {INVITE.inviter.org}? <a href="#">Sign in</a>.
      </p>
    </div>
  </Pane>
);

/* ============================================================
   STATE 5 — Already claimed
   ============================================================ */
const AlreadyUsedState = () => (
  <Pane rail={{ variant: 'stamped', stamp: { label: 'Used', tone: 'ok' } }}>
    <div className="il-status">
      <div className="il-status-icon il-status-icon-ok">
        <i className="ri-checkbox-circle-line"></i>
      </div>
      <h1 className="il-h1">This invitation has already been claimed.</h1>
      <p className="il-lede">
        An account for <strong>{INVITE.invitee.email}</strong> was created on May 2 from this link. Each invite can only be used once.
      </p>

      <div className="il-callout">
        <i className="ri-information-line"></i>
        <div>
          If that was you, just sign in. If it wasn&rsquo;t, contact your manager — they may need to investigate and rotate the link.
        </div>
      </div>

      <div className="il-cta-row">
        <button className="il-btn il-btn-primary">
          Sign in instead <i className="ri-arrow-right-line"></i>
        </button>
        <button className="il-btn il-btn-ghost">Forgot password?</button>
      </div>

      <p className="il-fineprint">
        Wasn&rsquo;t you? <a href="#">Report this</a> &middot; we&rsquo;ll alert {INVITE.inviter.name}.
      </p>
    </div>
  </Pane>
);

/* ============================================================
   STATE 6 — Revoked by admin
   ============================================================ */
const RevokedState = () => (
  <Pane rail={{ variant: 'stamped', stamp: { label: 'Revoked', tone: 'danger' } }}>
    <div className="il-status">
      <div className="il-status-icon il-status-icon-danger">
        <i className="ri-forbid-line"></i>
      </div>
      <h1 className="il-h1">This invitation was revoked.</h1>
      <p className="il-lede">
        <strong>{INVITE.inviter.name}</strong> revoked this link on <strong>May 4</strong>. It can&rsquo;t be used to create an account.
      </p>

      <div className="il-callout">
        <i className="ri-information-line"></i>
        <div>
          If you think this was a mistake, reach out to {INVITE.inviter.name} directly and they can issue a fresh invite.
        </div>
      </div>

      <div className="il-cta-row">
        <button className="il-btn il-btn-primary">
          <i className="ri-mail-line"></i> Email {INVITE.inviter.name.split(' ')[0]}
        </button>
        <button className="il-btn il-btn-ghost">Contact support</button>
      </div>

      <p className="il-fineprint">
        Reference: <code>{INVITE.token}</code> &middot; revoked by {INVITE.inviter.name}
      </p>
    </div>
  </Pane>
);

/* ============================================================
   STATE 7 — Invalid / unknown token
   ============================================================ */
const InvalidTokenState = () => (
  <Pane rail={{ variant: 'help' }}>
    <div className="il-status">
      <div className="il-status-icon il-status-icon-warn">
        <i className="ri-link-unlink-m"></i>
      </div>
      <h1 className="il-h1">We couldn&rsquo;t find that invitation.</h1>
      <p className="il-lede">
        The link in your address bar doesn&rsquo;t match any active invite. It may have been mistyped, truncated when it was forwarded, or rotated by the sender.
      </p>

      <div className="il-callout il-callout-info">
        <i className="ri-lightbulb-line"></i>
        <div>
          Try opening the link directly from the original email rather than copy-pasting. Some mail clients shorten URLs in plain-text view.
        </div>
      </div>

      <div className="il-cta-row">
        <button className="il-btn il-btn-primary">
          <i className="ri-mail-open-line"></i> Open original email
        </button>
        <button className="il-btn il-btn-ghost">Contact support</button>
      </div>

      <p className="il-fineprint">
        Already a teammate? <a href="#">Sign in</a> instead.
      </p>
    </div>
  </Pane>
);

/* ============================================================
   STATE 8 — Email mismatch (already signed in as someone else)
   ============================================================ */
const EmailMismatchState = () => (
  <Pane rail={{ variant: 'default', mismatchHi: 'email' }}>
    <div className="il-status">
      <div className="il-status-icon il-status-icon-info">
        <i className="ri-user-shared-2-line"></i>
      </div>
      <h1 className="il-h1">This invitation isn&rsquo;t for this account.</h1>
      <p className="il-lede">
        You&rsquo;re signed in as <strong>anna.kim@ream.example</strong>. This invite was sent to a different address and is bound to it.
      </p>

      <div className="il-mismatch-table">
        <div className="il-mismatch-row">
          <span className="il-mismatch-k">Currently signed in</span>
          <span className="il-mismatch-v">
            <span className="il-avatar il-avatar-sm">AK</span>
            anna.kim@ream.example
          </span>
        </div>
        <div className="il-mismatch-row is-target">
          <span className="il-mismatch-k">Invite is for</span>
          <span className="il-mismatch-v">
            <span className="il-avatar il-avatar-sm">JE</span>
            <strong>{INVITE.invitee.email}</strong>
          </span>
        </div>
      </div>

      <div className="il-cta-row">
        <button className="il-btn il-btn-primary">
          <i className="ri-logout-circle-r-line"></i> Sign out &amp; continue
        </button>
        <button className="il-btn il-btn-ghost">Stay signed in</button>
      </div>

      <p className="il-fineprint">
        Forwarded by mistake? Ask {INVITE.inviter.name} to re-send to the right address.
      </p>
    </div>
  </Pane>
);

/* ============================================================
   STATE 9 — Weak password (form-level validation)
   Renders the setup form in its weak-password state.
   ============================================================ */
const WeakPasswordState = () => <SetupFormState weak={true} />;

/* ============================================================
   STATE 10 — Server error during submission
   ============================================================ */
const ServerErrorState = () => <SetupFormState error={true} />;

/* ============================================================
   CANVAS LAYOUT
   ============================================================ */
const AB_W = 1080;
const AB_H = 760;

const App = () => (
  <DesignCanvas>
    <DCSection
      id="happy"
      title="Happy path"
      subtitle="Click email link → confirm → set password → land in workspace."
    >
      <DCArtboard id="welcome" label="01 · Welcome / confirm" width={AB_W} height={AB_H}>
        <Frame><WelcomeState /></Frame>
      </DCArtboard>
      <DCArtboard id="setup" label="02 · Account setup" width={AB_W} height={AB_H}>
        <Frame><SetupFormState /></Frame>
      </DCArtboard>
      <DCArtboard id="success" label="03 · Signing you in" width={AB_W} height={AB_H}>
        <Frame><SuccessState /></Frame>
      </DCArtboard>
    </DCSection>

    <DCSection
      id="errors"
      title="Unhappy paths"
      subtitle="Every state the invitee can hit when something goes wrong — token, account, or system."
    >
      <DCArtboard id="weak" label="04 · Weak password (inline)" width={AB_W} height={AB_H}>
        <Frame><WeakPasswordState /></Frame>
      </DCArtboard>
      <DCArtboard id="expired" label="05 · Link expired" width={AB_W} height={AB_H}>
        <Frame url="https://app.ream.example/invite/agent/X7K2P9MNQR"><ExpiredState /></Frame>
      </DCArtboard>
      <DCArtboard id="used" label="06 · Already claimed" width={AB_W} height={AB_H}>
        <Frame><AlreadyUsedState /></Frame>
      </DCArtboard>
      <DCArtboard id="revoked" label="07 · Revoked by admin" width={AB_W} height={AB_H}>
        <Frame><RevokedState /></Frame>
      </DCArtboard>
      <DCArtboard id="invalid" label="08 · Token not found" width={AB_W} height={AB_H}>
        <Frame url="https://app.ream.example/invite/agent/X7K2P9MNQ-typo"><InvalidTokenState /></Frame>
      </DCArtboard>
      <DCArtboard id="mismatch" label="09 · Wrong account signed in" width={AB_W} height={AB_H}>
        <Frame><EmailMismatchState /></Frame>
      </DCArtboard>
      <DCArtboard id="server" label="10 · Server error during submit" width={AB_W} height={AB_H}>
        <Frame><ServerErrorState /></Frame>
      </DCArtboard>
    </DCSection>
  </DesignCanvas>
);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
