/* admin-shell.js — renders the shared admin chrome.
   Call window.AdminShell.mount({active, crumb}) at the top of body.
   Pages drop their content into <main class="adm-page"> after mount.
*/
(function () {
  const NAV = [
    { group: "Overview", items: [
      { id: "dashboard", label: "Dashboard", icon: "dashboard", href: "admin-dashboard.html" },
      { id: "health",    label: "Health",    icon: "monitoring", href: "admin-health.html" },
    ]},
    { group: "Tenancy", items: [
      { id: "orgs",     label: "Organizations", icon: "domain", href: "admin-orgs.html", count: 142 },
      { id: "users",    label: "Users",         icon: "group",  href: "admin-users.html", count: "8.4k" },
      { id: "invites",  label: "Invites",       icon: "mail",   href: "admin-invites.html", urgent: 12 },
    ]},
    { group: "Platform", items: [
      { id: "flags",      label: "Feature flags",  icon: "toggle_on", href: "admin-flags.html" },
      { id: "broadcasts", label: "Broadcasts",     icon: "campaign",  href: "admin-broadcasts.html" },
      { id: "audit",      label: "Audit log",      icon: "fact_check", href: "admin-audit.html" },
    ]},
    { group: "Configuration", items: [
      { id: "settings", label: "Settings",  icon: "settings", href: "admin-settings.html" },
    ]},
  ];

  function el(tag, attrs, children) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === "class") e.className = attrs[k];
      else if (k === "html") e.innerHTML = attrs[k];
      else if (k.startsWith("on")) e[k] = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    if (children) (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null) return;
      e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return e;
  }

  function mount({ active, crumb, title, subtitle, actions, env = "STAGING" }) {
    // Stripe
    const envClass = env === "PRODUCTION" ? "env-prod" : (env === "STAGING" ? "env-staging" : "");
    document.body.insertAdjacentHTML("afterbegin", `
      <div class="adm-stripe ${envClass}">
        <span><i class="material-symbols-rounded" style="vertical-align:-3px;">shield_lock</i></span>
        Internal · Ream Platform Console
        <span class="env">${env}</span>
      </div>
    `);

    // Layout
    const layout = el("div", { class: "adm-layout" });

    // ----- Sidebar -----
    const side = el("aside", { class: "adm-side" });
    side.innerHTML = `
      <div class="adm-brand">
        <span class="adm-brand-mark">R</span>
        <div class="adm-brand-meta">
          <div class="adm-brand-name">Ream Platform</div>
          <div class="adm-brand-sub">Admin Console</div>
        </div>
        <span class="env-pill">${env === "PRODUCTION" ? "PROD" : env.slice(0,4)}</span>
      </div>
    `;
    NAV.forEach(grp => {
      side.insertAdjacentHTML("beforeend", `<div class="group-label">${grp.group}</div>`);
      const wrap = el("nav", { class: "adm-nav" });
      grp.items.forEach(it => {
        const isActive = it.id === active;
        const badge = it.urgent
          ? `<span class="nb urg">${it.urgent}</span>`
          : (it.count != null ? `<span class="nb">${it.count}</span>` : "<span></span>");
        wrap.insertAdjacentHTML("beforeend", `
          <a href="${it.href}" class="adm-nav-item ${isActive ? "active" : ""}">
            <i class="material-symbols-rounded">${it.icon}</i>
            <span>${it.label}</span>
            ${badge}
          </a>
        `);
      });
      side.appendChild(wrap);
    });
    side.insertAdjacentHTML("beforeend", `<div class="spacer"></div>`);
    side.insertAdjacentHTML("beforeend", `
      <div class="adm-me">
        <span class="adm-ava round" style="background:linear-gradient(135deg,#f59e0b,#dc2626);">DK</span>
        <div class="adm-me-meta">
          <div class="adm-me-name">Daria Kim</div>
          <div class="adm-me-role"><i class="material-symbols-rounded">verified_user</i> Super Admin</div>
        </div>
        <button class="adm-me-cog" title="Account"><i class="material-symbols-rounded">more_horiz</i></button>
      </div>
    `);
    layout.appendChild(side);

    // ----- Main column -----
    const main = el("section", { class: "adm-main" });
    main.innerHTML = `
      <header class="adm-top">
        <div class="adm-crumb">
          <a href="admin-dashboard.html">Platform</a>
          <span class="sep">/</span>
          ${crumb && crumb.length ? crumb.map((c, i, a) => i === a.length - 1
              ? `<span class="cur">${c.label}</span>`
              : `<a href="${c.href || '#'}">${c.label}</a><span class="sep">/</span>`).join("")
            : `<span class="cur">Dashboard</span>`}
        </div>
        <div class="adm-search">
          <i class="material-symbols-rounded">search</i>
          <input placeholder="Search orgs, users, flags, audit…" />
          <kbd>⌘K</kbd>
        </div>
        <div class="row gap-2">
          <button class="icon-btn" title="Help"><i class="material-symbols-rounded">help</i></button>
          <button class="icon-btn" title="Notifications"><i class="material-symbols-rounded">notifications</i><span class="dot"></span></button>
        </div>
      </header>
      <main class="adm-page" id="adm-page">
        ${title ? `<div class="adm-page-head">
          <div class="left">
            <h1>${title}</h1>
            ${subtitle ? `<p>${subtitle}</p>` : ""}
          </div>
          <div class="right">${actions || ""}</div>
        </div>` : ""}
        <div id="adm-content"></div>
      </main>
    `;
    layout.appendChild(main);
    document.body.appendChild(layout);
  }

  // ---------- Toast ----------
  function ensureToastHost() {
    let host = document.getElementById("adm-toast-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "adm-toast-host";
      host.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;";
      document.body.appendChild(host);
    }
    return host;
  }
  function toast(msg, kind = "info") {
    const host = ensureToastHost();
    const colors = {
      info:    { bg:"#1e293b", border:"#334155", icon:"info",        ic:"#60a5fa" },
      success: { bg:"#052e1a", border:"#14532d", icon:"check_circle",ic:"#4ade80" },
      warn:    { bg:"#3a2906", border:"#78350f", icon:"warning",     ic:"#fbbf24" },
      danger:  { bg:"#3a0a0a", border:"#7f1d1d", icon:"error",       ic:"#f87171" },
    };
    const c = colors[kind] || colors.info;
    const t = document.createElement("div");
    t.style.cssText = `pointer-events:auto;background:${c.bg};border:1px solid ${c.border};color:#e5e7eb;padding:10px 14px;border-radius:9px;font:500 13px "Inter",system-ui,sans-serif;display:flex;align-items:center;gap:10px;box-shadow:0 8px 24px rgba(0,0,0,0.18);min-width:240px;max-width:420px;transform:translateY(8px);opacity:0;transition:transform 200ms ease,opacity 200ms ease;`;
    t.innerHTML = `<i class="material-symbols-rounded" style="color:${c.ic};font-size:18px;">${c.icon}</i><span style="flex:1;">${msg}</span>`;
    host.appendChild(t);
    requestAnimationFrame(() => { t.style.transform="translateY(0)"; t.style.opacity="1"; });
    setTimeout(() => { t.style.opacity="0"; t.style.transform="translateY(8px)"; setTimeout(() => t.remove(), 220); }, 3200);
  }

  // ---------- Confirm dialog ----------
  function confirmDialog({ title, body, confirmLabel = "Confirm", confirmKind = "primary", danger = false }) {
    return new Promise(resolve => {
      const back = document.createElement("div");
      back.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,0.55);z-index:9998;display:flex;align-items:center;justify-content:center;animation:advFadeIn 150ms ease;";
      const dlg = document.createElement("div");
      dlg.style.cssText = "background:white;border-radius:12px;padding:22px 22px 18px;width:420px;max-width:92vw;box-shadow:0 24px 64px rgba(15,23,42,0.28);font-family:'Inter',system-ui,sans-serif;";
      const cBg = danger ? "#dc2626" : "#4f46e5";
      dlg.innerHTML = `
        <div style="font:600 15px 'Inter',system-ui,sans-serif;color:#0f172a;margin-bottom:8px;">${title}</div>
        <div style="font:400 13px 'Inter',system-ui,sans-serif;color:#475569;line-height:1.5;margin-bottom:18px;">${body || ""}</div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button data-act="cancel" style="background:white;border:1px solid #e5e7eb;color:#0f172a;padding:7px 14px;border-radius:7px;font:500 13px 'Inter',system-ui,sans-serif;cursor:pointer;">Cancel</button>
          <button data-act="ok" style="background:${cBg};border:1px solid ${cBg};color:white;padding:7px 14px;border-radius:7px;font:600 13px 'Inter',system-ui,sans-serif;cursor:pointer;">${confirmLabel}</button>
        </div>
      `;
      back.appendChild(dlg);
      document.body.appendChild(back);
      const close = (v) => { back.remove(); resolve(v); };
      dlg.querySelector('[data-act="cancel"]').onclick = () => close(false);
      dlg.querySelector('[data-act="ok"]').onclick = () => close(true);
      back.onclick = (e) => { if (e.target === back) close(false); };
    });
  }

  // ---------- Lightweight popover menu ----------
  function popMenu(anchor, items) {
    document.querySelectorAll(".adm-pop-menu").forEach(m => m.remove());
    const r = anchor.getBoundingClientRect();
    const menu = document.createElement("div");
    menu.className = "adm-pop-menu";
    menu.style.cssText = `position:fixed;top:${r.bottom+6}px;left:${Math.max(8, r.right-200)}px;background:white;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 12px 32px rgba(15,23,42,0.14);padding:4px;z-index:9997;min-width:200px;font-family:'Inter',system-ui,sans-serif;`;
    items.forEach(it => {
      if (it === "-") {
        const sep = document.createElement("div"); sep.style.cssText = "height:1px;background:#f1f5f9;margin:4px 0;"; menu.appendChild(sep); return;
      }
      const b = document.createElement("button");
      b.style.cssText = `display:flex;align-items:center;gap:9px;width:100%;text-align:left;background:transparent;border:0;padding:7px 10px;border-radius:5px;font:500 13px 'Inter',system-ui,sans-serif;color:${it.danger ? "#dc2626" : "#0f172a"};cursor:pointer;`;
      b.onmouseenter = () => b.style.background = "#f8fafc";
      b.onmouseleave = () => b.style.background = "transparent";
      b.innerHTML = `${it.icon ? `<i class="material-symbols-rounded" style="font-size:16px;color:${it.danger ? "#dc2626" : "#64748b"};">${it.icon}</i>` : ""}<span>${it.label}</span>`;
      b.onclick = () => { menu.remove(); it.onClick && it.onClick(); };
      menu.appendChild(b);
    });
    document.body.appendChild(menu);
    setTimeout(() => {
      const off = (e) => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener("mousedown", off); } };
      document.addEventListener("mousedown", off);
    }, 0);
  }

  window.AdminShell = { mount, toast, confirmDialog, popMenu };
})();
