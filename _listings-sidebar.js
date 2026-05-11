// Shared ream-shell sidebar for listings pages.
// Usage: include after <aside class="sidebar" data-active="houses|lands|sites"></aside>
//   <script src="_listings-sidebar.js"></script>
(function () {
  var aside = document.querySelector('aside.sidebar[data-active]');
  if (!aside) return;
  var active = aside.getAttribute('data-active');
  function on(name) { return active === name ? ' active' : ''; }
  aside.innerHTML =
    '<button type="button" class="brand org-pill" aria-haspopup="menu" aria-expanded="false">' +
      '<span class="org-logo">G</span>' +
      '<span class="org-meta"><span class="org-name">Goldcrest Realty</span><span class="org-plan">Growth · Accra</span></span>' +
      '<i class="ri-expand-up-down-line org-caret"></i>' +
    '</button>' +
    '<div class="nav-group" data-collapsed="false">' +
      '<button type="button" class="group-label" aria-expanded="true"><span>Workspace</span><span class="urg"></span><i class="ri-arrow-down-s-line chev"></i></button>' +
      '<div class="nav-group-items">' +
        '<a class="nav-item" href="ream.html"><i class="ri-home-5-line"></i> Home</a>' +
        '<a class="nav-item" href="activity.html"><i class="ri-pulse-line"></i> Activity feed <span class="nav-badge">4</span></a>' +
        '<a class="nav-item" href="calendar.html"><i class="ri-calendar-line"></i> Calendar</a>' +
      '</div>' +
    '</div>' +
    '<div class="nav-group" data-collapsed="false" data-has-urgent="true">' +
      '<button type="button" class="group-label" aria-expanded="true"><span>Pipeline</span><span class="urg">7</span><i class="ri-arrow-down-s-line chev"></i></button>' +
      '<div class="nav-group-items">' +
        '<a class="nav-item" href="prospects.html"><i class="ri-user-search-line"></i> Prospects <span class="nav-badge">42</span></a>' +
        '<a class="nav-item" href="customers.html"><i class="ri-team-line"></i> Customers <span class="nav-badge">186</span></a>' +
        '<a class="nav-item" href="document-requests.html"><i class="ri-file-text-line"></i> Document requests <span class="nav-badge urgent">7</span></a>' +
      '</div>' +
    '</div>' +
    '<div class="nav-group" data-collapsed="false">' +
      '<button type="button" class="group-label" aria-expanded="true"><span>Listings</span><span class="urg"></span><i class="ri-arrow-down-s-line chev"></i></button>' +
      '<div class="nav-group-items">' +
        '<a class="nav-item' + on('houses') + '" href="houses.html"><i class="ri-home-3-line"></i> Houses <span class="nav-badge">48</span></a>' +
        '<a class="nav-item' + on('lands')  + '" href="lands.html"><i class="ri-landscape-line"></i> Land <span class="nav-badge">76</span></a>' +
        '<a class="nav-item' + on('sites')  + '" href="sites.html"><i class="ri-map-2-line"></i> Sites <span class="nav-badge">9</span></a>' +
      '</div>' +
    '</div>' +
    '<div class="nav-group" data-collapsed="true" data-has-urgent="true">' +
      '<button type="button" class="group-label" aria-expanded="false"><span>Finance</span><span class="urg">3</span><i class="ri-arrow-down-s-line chev"></i></button>' +
      '<div class="nav-group-items">' +
        '<a class="nav-item" href="portfolio.html"><i class="ri-pie-chart-2-line"></i> Portfolio</a>' +
        '<a class="nav-item" href="loan-detail-admin.html"><i class="ri-bank-line"></i> Loans <span class="nav-badge">89</span></a>
          <a class="nav-item" href="loan-products.html"><i class="ri-stack-line"></i> Loan products <span class="nav-badge">6</span></a>' +
        '<a class="nav-item" href="transactions.html"><i class="ri-arrow-left-right-line"></i> Transactions</a>' +
        '<a class="nav-item" href="imports.html"><i class="ri-upload-cloud-2-line"></i> Imports</a>' +
      '</div>' +
    '</div>' +
    '<div class="spacer"></div>' +
    '<div class="sb-rail">' +
      '<button type="button" class="sb-rail-btn" title="Notifications" aria-label="Notifications"><i class="ri-notification-3-line"></i><span class="nb">5</span></button>' +
      '<a class="sb-rail-btn" href="settings-organization.html" title="Settings" aria-label="Settings"><i class="ri-settings-3-line"></i></a>' +
      '<button type="button" class="sb-rail-btn" title="Help & support" aria-label="Help"><i class="ri-question-line"></i></button>' +
    '</div>' +
    '<button type="button" class="user with-menu" aria-haspopup="menu" aria-expanded="false">' +
      '<span class="avatar" style="background: var(--color-brand-700);">KM<span class="presence" data-status="online"></span></span>' +
      '<span class="meta"><span class="name">Kevin Manga</span><span class="role-row"><span class="role-chip">Admin / Owner</span></span></span>' +
      '<i class="ri-expand-up-down-line more"></i>' +
    '</button>';

  // Group expand/collapse
  aside.querySelectorAll('.nav-group').forEach(function (g) {
    var btn = g.querySelector('.group-label');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var collapsed = g.getAttribute('data-collapsed') === 'true';
      g.setAttribute('data-collapsed', collapsed ? 'false' : 'true');
      btn.setAttribute('aria-expanded', collapsed ? 'true' : 'false');
    });
  });
})();
