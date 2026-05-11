/* ============================================================
   Invite modal — agents.html / managers.html
   Configure with: window.InviteModal.mount({ role: 'agent' | 'manager' })
   The host page just calls InviteModal.open() from the Invite button.
   ============================================================ */

(function () {
  const ROLE_CONFIG = {
    agent: {
      title: 'Invite an agent',
      sub: 'Add a teammate to handle prospects, follow-ups, or finance recovery.',
      typeOptions: [
        { value: 'SALES', label: 'Sales', desc: 'Inbound prospects' },
        { value: 'FOLLOW_UP', label: 'Follow-up', desc: 'Stale leads' },
        { value: 'FINANCE', label: 'Finance', desc: 'Arrears recovery' }
      ],
      defaultType: 'SALES'
    },
    manager: {
      title: 'Invite a manager',
      sub: 'Managers oversee one of the three operational tracks.',
      typeOptions: [
        { value: 'SALES', label: 'Sales', desc: 'Inbound prospects' },
        { value: 'FOLLOW_UP', label: 'Follow-up', desc: 'Stale leads' },
        { value: 'FINANCE', label: 'Finance', desc: 'Arrears recovery' }
      ],
      defaultType: 'SALES'
    }
  };

  let role = 'agent';
  let cfg = ROLE_CONFIG.agent;

  function buildModal() {
    const overlay = document.createElement('div');
    overlay.className = 'im-overlay';
    overlay.id = 'imOverlay';
    overlay.innerHTML = `
      <div class="im-modal" role="dialog" aria-labelledby="imTitle" aria-modal="true">
        <div class="im-head">
          <div>
            <h2 id="imTitle"><i class="ri-user-add-line"></i> <span id="imTitleText"></span></h2>
            <div class="sub" id="imSubText"></div>
          </div>
          <button class="im-close" id="imClose" aria-label="Close"><i class="ri-close-line"></i></button>
        </div>

        <div class="im-tabs" role="tablist">
          <button class="im-tab on" data-mode="link" role="tab"><i class="ri-link"></i> Send invite link</button>
          <button class="im-tab" data-mode="form" role="tab"><i class="ri-edit-2-line"></i> Add by form</button>
        </div>

        <div class="im-body">
          <!-- LINK PANE -->
          <div class="im-pane on" data-pane="link">
            <div class="im-link-card">
              <div class="lc-step-row">
                <span class="step-num">1</span>
                <div class="step-text">
                  <h5>Configure the invite</h5>
                  <p>Set what role this link grants. The invitee fills the rest of their profile when they sign up.</p>
                </div>
              </div>

              <div class="im-link-config">
                <div class="im-field full">
                  <label for="imLinkEmailField">Invitee email</label>
                  <input id="imLinkEmailField" type="email" placeholder="jordan.evans@example.com" />
                </div>
                <div class="im-field">
                  <label for="imLinkType">Type</label>
                  <select id="imLinkType"></select>
                </div>
                <div class="im-field">
                  <label for="imLinkExpiry">Expires</label>
                  <select id="imLinkExpiry">
                    <option value="1">In 1 day</option>
                    <option value="7" selected>In 7 days</option>
                    <option value="30">In 30 days</option>
                    <option value="never">Never</option>
                  </select>
                </div>
              </div>

              <div class="lc-step-row" style="margin-top: 18px;">
                <span class="step-num">2</span>
                <div class="step-text">
                  <h5>Copy or send the link</h5>
                  <p>Anyone with this link can claim a single seat. It can only be used once.</p>
                </div>
              </div>

              <div class="im-link-out">
                <input type="text" id="imLinkUrl" readonly />
                <button type="button" id="imLinkCopy"><i class="ri-file-copy-line"></i> Copy</button>
              </div>

              <div class="im-link-meta">
                <span><i class="ri-shield-check-line"></i> Single use</span>
                <span><i class="ri-time-line"></i> <span id="imLinkExpiryText">Expires in 7 days</span></span>
                <span><i class="ri-key-2-line"></i> Token: <code id="imLinkToken"></code></span>
              </div>

              <div class="im-link-aux">
                <button type="button" id="imLinkEmail"><i class="ri-mail-send-line"></i> Email this link</button>
                <button type="button" id="imLinkRotate"><i class="ri-refresh-line"></i> Rotate token</button>
              </div>
            </div>
          </div>

          <!-- FORM PANE -->
          <div class="im-pane" data-pane="form">
            <form id="imForm" autocomplete="off">
              <!-- Identity -->
              <div class="im-form-section">
                <div class="sec-title">Identity</div>
                <div class="sec-card">
                  <div class="im-form-grid">
                    <div class="im-field">
                      <label for="fmFirst">First name</label>
                      <input id="fmFirst" name="firstName" required placeholder="Jordan" />
                    </div>
                    <div class="im-field">
                      <label for="fmLast">Last name</label>
                      <input id="fmLast" name="lastName" required placeholder="Evans" />
                    </div>
                    <div class="im-field">
                      <label for="fmEmail">Work email</label>
                      <input id="fmEmail" name="email" type="email" required placeholder="jordan.evans@ream.example" />
                    </div>
                    <div class="im-field">
                      <label for="fmPhone">Phone</label>
                      <input id="fmPhone" name="phone" placeholder="+1 (214) 555-0123" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Role & assignment -->
              <div class="im-form-section">
                <div class="sec-title">Role &amp; assignment</div>
                <div class="sec-card">
                  <div class="im-field">
                    <label>Type</label>
                    <div class="im-radio-row" id="imFormTypes"></div>
                  </div>
                  <div class="im-form-grid" style="margin-top: 14px;">
                    <div class="im-field">
                      <label for="fmRegion">Region</label>
                      <select id="fmRegion" name="region">
                        <option>Dallas, TX</option>
                        <option>Austin, TX</option>
                        <option>Houston, TX</option>
                      </select>
                    </div>
                    <div class="im-field">
                      <label for="fmStart">Start date</label>
                      <input id="fmStart" name="start" type="date" />
                    </div>
                    <div class="im-field full">
                      <label for="fmNotes">Onboarding notes <small style="text-transform:none; letter-spacing:0; color:var(--fg4); font-weight:400;">(optional)</small></label>
                      <textarea id="fmNotes" name="notes" rows="2" placeholder="e.g. Reports to Maria, focus on Bishop Arts inventory."></textarea>
                    </div>
                  </div>
                </div>
              </div>

            </form>
          </div>
        </div>

        <div class="im-foot">
          <div class="meta" id="imFootMeta"><i class="ri-information-line"></i> Invite link is single-use and expires.</div>
          <div class="actions">
            <button class="btn btn-cancel" type="button" id="imCancel">Cancel</button>
            <button class="btn btn-submit" type="button" id="imSubmit"><i class="ri-check-line"></i> Send invite</button>
          </div>
        </div>
      </div>

      <div class="im-mini-toast" id="imToast">
        <i class="ri-checkbox-circle-fill"></i>
        <span id="imToastMsg">Copied</span>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function rand(n) {
    const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < n; i++) s += a[Math.floor(Math.random() * a.length)];
    return s;
  }

  let token = rand(10);

  function buildLinkUrl() {
    const type = document.getElementById('imLinkType').value;
    return `https://ream.example/invite/${role}/${token}?t=${type}`;
  }

  function refreshLink() {
    const url = buildLinkUrl();
    document.getElementById('imLinkUrl').value = url;
    document.getElementById('imLinkToken').textContent = token;
    const exp = document.getElementById('imLinkExpiry').value;
    const expiryText = exp === 'never'
      ? 'Never expires'
      : `Expires in ${exp} day${exp === '1' ? '' : 's'}`;
    document.getElementById('imLinkExpiryText').textContent = expiryText;
  }

  function showToast(msg) {
    const t = document.getElementById('imToast');
    document.getElementById('imToastMsg').textContent = msg;
    t.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => t.classList.remove('show'), 1800);
  }

  function setMode(mode) {
    document.querySelectorAll('.im-tab').forEach(t =>
      t.classList.toggle('on', t.dataset.mode === mode));
    document.querySelectorAll('.im-pane').forEach(p =>
      p.classList.toggle('on', p.dataset.pane === mode));

    const submitBtn = document.getElementById('imSubmit');
    const meta = document.getElementById('imFootMeta');
    if (mode === 'link') {
      submitBtn.innerHTML = '<i class="ri-mail-send-line"></i> Send via email';
      meta.innerHTML = '<i class="ri-information-line"></i> Invite link is single-use and expires.';
    } else {
      submitBtn.innerHTML = '<i class="ri-user-add-line"></i> Create &amp; invite';
      meta.innerHTML = '<i class="ri-information-line"></i> A setup-password email will be sent.';
    }
  }

  function applyRole() {
    document.getElementById('imTitleText').textContent = cfg.title;
    document.getElementById('imSubText').textContent = cfg.sub;

    // Link-pane type select
    const sel = document.getElementById('imLinkType');
    sel.innerHTML = cfg.typeOptions.map(o =>
      `<option value="${o.value}">${o.label}${o.desc ? ` — ${o.desc}` : ''}</option>`).join('');
    sel.value = cfg.defaultType;

    // Form-pane radio types
    const radios = document.getElementById('imFormTypes');
    radios.innerHTML = cfg.typeOptions.map((o, i) => `
      <label class="im-radio">
        <input type="radio" name="fmType" value="${o.value}" ${i === 0 ? 'checked' : ''} />
        <span class="lab">${o.label}</span>
        <span class="desc">${o.desc}</span>
      </label>
    `).join('');

    refreshLink();
  }

  function bind() {
    const overlay = document.getElementById('imOverlay');
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.getElementById('imClose').addEventListener('click', close);
    document.getElementById('imCancel').addEventListener('click', close);

    document.querySelectorAll('.im-tab').forEach(t =>
      t.addEventListener('click', () => setMode(t.dataset.mode)));

    document.getElementById('imLinkType').addEventListener('change', refreshLink);
    document.getElementById('imLinkExpiry').addEventListener('change', refreshLink);

    document.getElementById('imLinkCopy').addEventListener('click', async () => {
      const inp = document.getElementById('imLinkUrl');
      try {
        await navigator.clipboard.writeText(inp.value);
      } catch {
        inp.select(); document.execCommand('copy');
      }
      const btn = document.getElementById('imLinkCopy');
      btn.classList.add('copied');
      btn.innerHTML = '<i class="ri-check-line"></i> Copied';
      showToast('Invite link copied');
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = '<i class="ri-file-copy-line"></i> Copy';
      }, 1600);
    });

    document.getElementById('imLinkRotate').addEventListener('click', () => {
      token = rand(10);
      refreshLink();
      showToast('Token rotated — old link no longer works');
    });

    document.getElementById('imLinkEmail').addEventListener('click', () => {
      showToast('Email composer opened in your mail app');
    });

    document.getElementById('imSubmit').addEventListener('click', () => {
      const isLink = document.querySelector('.im-tab.on').dataset.mode === 'link';
      if (isLink) {
        showToast('Invite link emailed');
      } else {
        const f = document.getElementById('imForm');
        if (!f.reportValidity()) return;
        const name = (document.getElementById('imForm').firstName?.value || '') + ' ' +
                     (document.getElementById('imForm').lastName?.value || '');
        showToast(name.trim() ? `${name.trim()} added — setup email sent` : 'Invite created');
      }
      setTimeout(close, 900);
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') close();
    });
  }

  function open() {
    document.getElementById('imOverlay').classList.add('open');
    setMode('link');
    refreshLink();
  }
  function close() {
    document.getElementById('imOverlay').classList.remove('open');
  }

  function mount(opts) {
    role = (opts && opts.role) || 'agent';
    cfg = ROLE_CONFIG[role] || ROLE_CONFIG.agent;
    if (!document.getElementById('imOverlay')) {
      buildModal();
      bind();
    }
    applyRole();
  }

  window.InviteModal = { mount, open, close };
})();
