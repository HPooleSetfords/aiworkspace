// ============================================================
//  31594 — Ai Matter Workspace prototype
//
//  Tickets wired up here:
//    33592  Sidenav update ................ renderRail()
//    33591  Top nav update ................ renderTabs(), search overlay
//    33587  Animated Ai ring .............. orb.js (<ai-orb>), orbTag()
//    33588  Pre-canned opening prompt ..... renderHero(), promptRow()
//    33593  Workload delivery ............. workload.js + organise()
//    33590  Pre-canned prompt toolbar ..... renderToolbar()
//    33748  Task cards .................... cardHTML() + resolveTask()
//
//  Figma: file 9rQoyz7sTF60B8TcPlPxCN, section 5548:485769
//  Deep-link routes (see README): #start #comms-start #thinking
//  #comms-thinking #loaded #loaded-edit #comms #comms-edit #search
// ============================================================
(function (HALO) {
  'use strict';

  var W = HALO.workload;
  var esc = HALO.search.escapeHtml;

  var ALL_LANES = HALO.lanes.map(function (l) { return l.id; });

  // How long the thinking screen holds before the cards land. The orb's
  // fill-hold-open cycle is derived from this below, so the two cannot drift.
  var THINKING_MS = 2200;

  // The hero clearing itself: the words and controls rise away on a top-down
  // stagger (the delays live in styles.css — last one clears at 150ms + 200ms)
  // while the orb travels down to meet them over the same window, landing just
  // after the last of them has gone.
  var MOVE_MS = 500;

  // Light-page orb settings: bloom off so the blues stay blue instead of
  // blowing out to white. inkLevel stays at 1 — the component's README
  // suggests ~0.75 on a light page, but 1 keeps the rim colours as picked,
  // which reads brighter against Halo's near-white surface.
  var ORB = {
    gain: 3.4,
    bloom: 0,
    inkLevel: 1,
    thinkSpeed: 1.6,
  };

  // The orb advances its state clock by `speed`-scaled time, so a cycle meant
  // to span THINKING_MS of *real* time has to be expressed in those scaled
  // seconds. One cycle exactly: a quarter fills in, half holds while Halo
  // works, a quarter opens back out as the cards land.
  ORB.thinkCycle = (THINKING_MS / 1000) * ORB.thinkSpeed;
  ORB.thinkRise = ORB.thinkCycle * 0.25;
  ORB.thinkFall = ORB.thinkCycle * 0.25;

  // ------------------------------------------------------------
  //  State
  // ------------------------------------------------------------
  var state = {
    screen: 'start',                 // start | thinking | loaded
    // taskTypes is a list of lane ids; matters a list of refs, empty = all
    // What Halo last organised — this is what the tab label, the matter strip
    // and the columns read from.
    prompt: { amount: 1, unit: 'Hours', taskTypes: ALL_LANES.slice(), matters: [] },
    // What the prompt row is currently set to. Every prompt control edits this
    // copy; nothing else moves until Organise commits it.
    draft: null,
    toolbar: 'summary',              // summary | editing
    loop: true,
    workload: { columns: [], budget: 60, planned: 0 },
    resolved: {},                    // taskId -> 'done' | 'skipped'
    extras: [],                      // tasks added from Ask Halo
    entering: false,                 // true for the first paint after Organise
    transition: null,                // 'departing' | 'moving' during Organise
    matterHeaderCollapsed: false,
    railCollapsed: false,
    navOpen: {},
    // Every tab is a matter scope: { id, refs: [...] }. An empty refs list is
    // the whole caseload and reads "All Client Matters"; one ref reads as the
    // file; several read as the refs comma-separated. A new tab starts empty
    // and relabels itself as soon as the scope is filtered.
    tabs: [],
    activeTab: null,
    askOpen: false,
    searchOpen: false,
    searchQuery: '',
    searchIndex: 0,
    cleared: 0,                      // minutes of work signed off this session
  };

  var el = {
    app: document.getElementById('app'),
    railNav: document.getElementById('rail-nav'),
    railToggle: document.getElementById('rail-toggle'),
    tabs: document.getElementById('tabs'),
    matterStrip: document.getElementById('matter-strip'),
    columns: document.getElementById('columns'),
    hero: document.getElementById('hero'),
    toolbarSlot: document.getElementById('toolbar-slot'),
    askSlot: document.getElementById('ask-slot'),
    askFab: document.getElementById('ask-fab'),
    scrim: document.getElementById('search-scrim'),
    searchInput: document.getElementById('search-input'),
    searchResults: document.getElementById('search-results'),
    searchTab: document.getElementById('search-tab'),
    searchbarLabel: document.getElementById('searchbar-label'),
  };

  // ------------------------------------------------------------
  //  Small helpers
  // ------------------------------------------------------------

  function matter(ref) {
    return HALO.matters.filter(function (m) { return m.ref === ref; })[0];
  }

  function greeting() {
    var h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 18) return 'Good Afternoon';
    return 'Good Evening';
  }

  function allTasks() {
    return HALO.tasks.concat(state.extras);
  }

  var tabSeq = 0;

  function findTab(id) {
    return state.tabs.filter(function (t) { return t.id === id; })[0];
  }

  var MAX_TABS = 6;

  function addTab(refs) {
    var tab = { id: 't' + (++tabSeq), refs: (refs || []).slice() };
    state.tabs.push(tab);
    return tab;
  }

  function activeTab() {
    return findTab(state.activeTab) || state.tabs[0];
  }

  /**
   * Each tab keeps its own workspace, so leaving one and coming back finds the
   * columns exactly as you left them. `state` stays the live working copy —
   * switching tabs parks it on the outgoing tab and takes over the incoming
   * one's, rather than every render having to reach through the tab.
   */
  var VIEW_KEYS = ['prompt', 'draft', 'workload', 'resolved', 'cleared', 'toolbar'];

  function saveTabView() {
    var tab = findTab(state.activeTab);
    if (!tab) return;
    tab.view = {};
    VIEW_KEYS.forEach(function (k) { tab.view[k] = state[k]; });
    // an organise that was still running is abandoned, not resumed
    tab.view.screen = state.screen === 'thinking' ? 'start' : state.screen;
  }

  function restoreTabView(tab) {
    if (tab.view) {
      state.screen = tab.view.screen;
      VIEW_KEYS.forEach(function (k) { state[k] = tab.view[k]; });
      return;
    }
    // never organised — a fresh start screen scoped to this tab
    state.screen = 'start';
    state.prompt = {
      amount: 1, unit: 'Hours', taskTypes: ALL_LANES.slice(), matters: tab.refs.slice(),
    };
    state.draft = clonePrompt(state.prompt);
    state.workload = { columns: [], budget: 60, planned: 0 };
    state.resolved = {};
    state.cleared = 0;
    state.toolbar = 'summary';
  }

  // A tab's label is its scope: everything, one file, or the bare refs.
  function tabLabel(tab) {
    if (!tab.refs.length) return 'All Client Matters';
    if (tab.refs.length === 1) {
      var m = matter(tab.refs[0]);
      return m ? tab.refs[0] + ' · ' + m.client : tab.refs[0];
    }
    return tab.refs.join(', ');
  }

  // Filtering relabels the tab you are on — it never opens another one.
  function syncMatterTab() {
    var tab = activeTab();
    if (tab) tab.refs = state.prompt.matters.slice();
  }

  function newTab() {
    if (state.tabs.length >= MAX_TABS) return;
    selectTab(addTab([]).id);
  }

  /**
   * Ticket 33587 — one <ai-orb> instance.
   * `diameter=1` plus a circular clip makes the host box *be* the orb, so no
   * corner of the canvas' opaque background shows.
   */
  function orbTag(opts) {
    opts = opts || {};
    var attrs = [
      'class="orb' + (opts.className ? ' ' + opts.className : '') + '"',
      opts.id ? 'id="' + opts.id + '"' : '',
      'style="width:' + opts.size + 'px;height:' + opts.size + 'px"',
      'diameter="1"',
      'state="' + (opts.state || 'idle') + '"',
      'background="' + (opts.background || '#f6fafd') + '"',
      'gain="' + ORB.gain + '"',
      'bloom="' + ORB.bloom + '"',
      'ink-level="' + ORB.inkLevel + '"',
      'think-cycle="' + ORB.thinkCycle + '"',
      'think-rise="' + ORB.thinkRise + '"',
      'think-fall="' + ORB.thinkFall + '"',
      // instances mounted together run in lockstep unless deliberately desynced
      opts.timeOffset ? 'time-offset="' + opts.timeOffset + '"' : '',
      opts.speed ? 'speed="' + opts.speed + '"' : '',
    ].filter(Boolean);
    return '<ai-orb ' + attrs.join(' ') + '></ai-orb>';
  }

  // ------------------------------------------------------------
  //  Ticket 33592 — Sidenav
  // ------------------------------------------------------------

  var NAV = [
    { id: 'dashboard',  label: 'Dashboard',           icon: 'icon-dashboard.svg' },
    { id: 'workspace',  label: 'Ai Matter Workspace', icon: 'icon-workspace.svg', selected: true },
    { id: 'matters',    label: 'Matters',             icon: 'icon-matters.svg' },
    { id: 'clients',    label: 'Clients',             icon: 'icon-clients.svg' },
    { id: 'accounting', label: 'Accounting',          icon: 'icon-accounting.svg' },
    { id: 'headoffice', label: 'Head office',         icon: 'icon-headoffice.svg',
      children: ['Firm settings', 'Compliance', 'People'] },
    { id: 'reports',    label: 'Reports',             icon: 'icon-reports.svg',
      children: ['Matter reports', 'Financial reports', 'Time recording'] },
    { id: 'settings',   label: 'Settings',            icon: 'icon-settings.svg',
      children: ['My profile', 'Notifications', 'Integrations'] },
  ];

  function renderRail() {
    el.app.classList.toggle('is-rail-collapsed', state.railCollapsed);
    el.railToggle.setAttribute('aria-expanded', String(!state.railCollapsed));
    el.railToggle.setAttribute('aria-label',
      state.railCollapsed ? 'Expand navigation' : 'Collapse navigation');

    var html = NAV.map(function (item) {
      var open = !!state.navOpen[item.id];
      var chevron = item.children
        ? '<img class="nav-item__chevron" src="assets/icon-chevron-down.svg" alt="">'
        : '';
      var group = item.children
        ? '<div class="nav-sub">' + item.children.map(function (child) {
            return '<button type="button" data-nav-child="' + esc(child) + '">' + esc(child) + '</button>';
          }).join('') + '</div>'
        : '';

      return '<button type="button" class="nav-item' + (item.selected ? ' is-selected' : '') + '"' +
        ' data-nav="' + item.id + '"' +
        (item.children ? ' aria-expanded="' + open + '"' : '') +
        (item.selected ? ' aria-current="page"' : '') + '>' +
        '<span class="nav-item__content">' +
          '<img src="assets/' + item.icon + '" alt="">' +
          '<span class="nav-item__label">' + esc(item.label) + '</span>' + chevron +
        '</span></button>' + group;
    }).join('');

    Array.prototype.slice.call(el.railNav.children).forEach(function (child) {
      if (child !== el.railToggle) child.remove();
    });
    el.railNav.insertAdjacentHTML('beforeend', html);
  }

  el.railToggle.addEventListener('click', function () {
    state.railCollapsed = !state.railCollapsed;
    renderRail();
  });

  el.railNav.addEventListener('click', function (e) {
    var item = e.target.closest('[data-nav]');
    if (item) {
      var def = NAV.filter(function (n) { return n.id === item.dataset.nav; })[0];
      if (def && def.children) {
        state.navOpen[def.id] = !state.navOpen[def.id];
        renderRail();
      }
      // every other destination is outside this prototype, so it sits inert
    }
  });

  // ------------------------------------------------------------
  //  Ticket 33591 — Matter tabs
  // ------------------------------------------------------------

  function renderTabs() {
    var closable = state.tabs.length > 1;

    var html = state.tabs.map(function (tab) {
      var on = state.activeTab === tab.id;
      var label = tabLabel(tab);
      var full = tab.refs.length > 1
        ? tab.refs.length + ' matters — ' + tab.refs.join(', ')
        : label;
      return '<button type="button" class="tab' + (on ? ' is-active' : '') + '" role="tab"' +
        ' data-tab="' + esc(tab.id) + '" aria-selected="' + on + '" title="' + esc(full) + '">' +
        '<span class="tab__label">' + esc(label) + '</span>' +
        (closable
          ? '<span class="tab__close" data-close="' + esc(tab.id) + '" role="button"' +
            ' aria-label="Close ' + esc(label) + '">×</span>'
          : '') +
        '</button>';
    }).join('');

    html += '<button class="icon-btn icon-btn--sm" id="new-tab" aria-label="New tab">' +
      '<span><img src="assets/icon-plus.svg" alt=""></span></button>';

    el.tabs.innerHTML = html;
  }

  el.tabs.addEventListener('click', function (e) {
    if (e.target.closest('#new-tab')) { newTab(); return; }

    var close = e.target.closest('[data-close]');
    if (close) {
      e.stopPropagation();
      closeTab(close.dataset.close);
      return;
    }
    var tab = e.target.closest('[data-tab]');
    if (tab) selectTab(tab.dataset.tab);
  });

  function selectTab(id) {
    var tab = findTab(id);
    if (!tab) return;
    // Clicking the tab you are already on is a no-op.
    if (state.activeTab === tab.id) return;

    transitionSeq++;
    state.transition = null;
    saveTabView();
    state.activeTab = tab.id;
    restoreTabView(tab);
    // a tab IS its scope, so its refs win over whatever the view carried
    state.prompt.matters = tab.refs.slice();
    state.draft.matters = tab.refs.slice();

    state.askOpen = false;
    state.entering = false;
    hideMenu();
    render();
    writeHash();
  }

  function closeTab(id) {
    if (state.tabs.length < 2) return;
    var at = state.tabs.map(function (t) { return t.id; }).indexOf(id);
    state.tabs.splice(at, 1);
    if (state.activeTab === id) {
      selectTab(state.tabs[Math.min(at, state.tabs.length - 1)].id);
    } else {
      renderTabs();
    }
  }

  // Opening a matter from search filters the tab you are on — which is what
  // relabels it. Press + first if you want to keep the current scope.
  function openMatter(ref) {
    var m = matter(ref);
    if (!m) return;
    closeSearch();
    state.prompt.matters = [ref];
    syncMatterTab();
    goto('start');
  }

  // ------------------------------------------------------------
  //  Matter header (Figma 5713:504592) — shown when exactly one
  //  matter is in scope.
  // ------------------------------------------------------------

  var MATTER_TABS = ['Workspace', 'Details', 'Documents', 'Financials', 'Activities',
    'Clients', 'Parties', 'Fee Earners', 'Compliance', 'PAFs'];

  // "Mrs J Moir Allen" + "Jennifer Moir Allen" -> "Mrs Jennifer Moir Allen"
  var TITLES = ['Mr', 'Mrs', 'Ms', 'Dr', 'Miss'];
  function displayName(m) {
    var title = (m.salutation || '').split(' ')[0];
    return TITLES.indexOf(title) !== -1 ? title + ' ' + m.client : m.client;
  }

  // The header shows a third level under the matter area — the work itself,
  // which the description already leads with.
  var WORK_TYPES = ['Purchase', 'Sale', 'Lease', 'Remortgage', 'Transfer', 'Dispute',
    'Claim', 'Estate', 'Administration', 'Divorce', 'Acquisition', 'Refinance',
    'Boundary', 'Dilapidations', 'Tribunal', 'Settlement', 'Rent', 'Redundancy',
    'Contested', 'Inheritance', 'Collective', 'Reopen', 'Will', 'Contract'];
  function areaPath(m) {
    var lead = String(m.description || '').split(/\s+/)[0].replace(/[^A-Za-z]/g, '');
    return WORK_TYPES.indexOf(lead) !== -1 ? m.area + ' / ' + lead : m.area;
  }

  function statusTone(status) {
    if (status === 'Closing') return 'closing';
    if (status === 'Closed') return 'closed';
    if (status === 'Reopening') return 'reopening';
    return 'open';
  }

  function dateRange(m) {
    if (!m.openedOn) return '';
    return m.openedOn + ' - ' + (m.status === 'Closed' ? 'closed' : 'current');
  }

  function renderMatterStrip() {
    var m = state.prompt.matters.length === 1 ? matter(state.prompt.matters[0]) : null;
    if (!m) { el.matterStrip.innerHTML = ''; return; }

    var collapsed = state.matterHeaderCollapsed;

    el.matterStrip.innerHTML =
      '<div class="matter-head' + (collapsed ? ' is-collapsed' : '') + '">' +
        '<section class="matter-head__bar" aria-label="Matter">' +
          '<div class="matter-head__row">' +
            '<p class="matter-head__ref">' + esc(m.ref) + '</p>' +
            '<span class="matter-head__divider" aria-hidden="true"></span>' +
            '<div class="matter-head__main">' +
              '<div class="matter-head__title">' +
                '<span class="matter-head__client">' + esc(displayName(m)) + '</span>' +
                '<span class="matter-head__desc">' + esc(m.description) + '</span>' +
              '</div>' +
              '<div class="matter-head__meta">' +
                '<div class="matter-head__col">' +
                  '<div class="matter-head__line">' +
                    '<span class="tag tag--' + statusTone(m.status) + '">' +
                      '<i class="tag__dot" aria-hidden="true"></i>' + esc(m.status) +
                    '</span>' +
                    '<span class="matter-head__dates">' + esc(dateRange(m)) + '</span>' +
                  '</div>' +
                  '<p class="matter-head__area">' + esc(areaPath(m)) + '</p>' +
                '</div>' +
                '<div class="matter-head__col matter-head__col--contact">' +
                  (m.phone
                    ? '<div class="matter-head__line">' +
                      '<img src="assets/icon-phone.svg" alt="" width="16" height="16">' +
                      '<span>' + esc(m.phone) + '</span></div>'
                    : '') +
                  (m.email
                    ? '<div class="matter-head__line">' +
                      '<img src="assets/icon-email.svg" alt="" width="16" height="16">' +
                      '<span>' + esc(m.email) + '</span></div>'
                    : '') +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="matter-head__actions">' +
              '<button class="matter-head__link" data-matter-action>Actions</button>' +
              '<button class="icon-btn icon-btn--sm" id="matter-collapse"' +
                ' aria-expanded="' + !collapsed + '"' +
                ' aria-label="' + (collapsed ? 'Expand' : 'Collapse') + ' matter details">' +
                '<span><img src="assets/icon-chevron-up.svg" alt=""></span></button>' +
            '</div>' +
          '</div>' +
        '</section>' +
        '<div class="matter-head__tabs" role="tablist" aria-label="Matter sections">' +
          MATTER_TABS.map(function (name, i) {
            var on = i === 0;
            return '<button type="button" class="mtab' + (on ? ' is-active' : '') + '"' +
              ' role="tab" aria-selected="' + on + '" data-mtab="' + esc(name) + '">' +
              esc(name) + '</button>';
          }).join('') +
        '</div>' +
      '</div>';
  }

  el.matterStrip.addEventListener('click', function (e) {
    if (e.target.closest('#matter-collapse')) {
      state.matterHeaderCollapsed = !state.matterHeaderCollapsed;
      renderMatterStrip();
      return;
    }
    // Actions and the other section tabs are outside this prototype
  });

  // ------------------------------------------------------------
  //  Ticket 33588 — the pre-canned opening prompt
  //  Shared by the hero and by the toolbar's editing state, so the
  //  sentence only exists in one place.
  // ------------------------------------------------------------

  // How many things the selection is narrowed to; 0 means "everything", which
  // is the resting state and so gets no emphasis on the pill.
  function narrowedCount(kind, prompt) {
    if (kind === 'taskType') {
      return prompt.taskTypes.length === HALO.lanes.length ? 0 : prompt.taskTypes.length;
    }
    if (kind === 'matter') return prompt.matters.length;
    return 0;
  }

  function pillLabel(kind, prompt) {
    if (kind === 'unit') return W.unitLabel(prompt);
    if (kind === 'taskType') return W.taskTypeLabel(prompt);
    return W.matterLabel(prompt);
  }

  function pill(kind, prompt) {
    var multi = kind === 'taskType' || kind === 'matter';
    var count = narrowedCount(kind, prompt);
    return '<button type="button" class="pill' + (multi ? ' pill--multi' : '') + '"' +
      ' data-pill="' + kind + '" aria-haspopup="listbox" aria-expanded="false"' +
      (multi ? ' data-count="' + count + '"' : '') + '>' +
      '<span><img src="assets/icon-chevron-sm.svg" alt="">' +
      '<span class="pill__label">' + esc(pillLabel(kind, prompt)) + '</span></span></button>';
  }

  function promptRow(prompt) {
    return '<div class="prompt__row">' +
      '<p>I have</p>' +
      '<span class="pill pill--amount">' +
        '<input class="pill__input" type="text" inputmode="numeric" autocomplete="off"' +
        ' maxlength="2" value="' + prompt.amount + '" aria-label="How much time you have">' +
      '</span>' +
      pill('unit', prompt) +
      "<p>Let's take a look at</p>" +
      pill('taskType', prompt) +
      '<p>for</p>' +
      pill('matter', prompt) +
    '</div>';
  }

  // Update the pill labels in place rather than rebuilding the row — a
  // multi-select menu has to survive its trigger being relabelled.
  function refreshPills(container, prompt) {
    if (!container) return;
    ['unit', 'taskType', 'matter'].forEach(function (kind) {
      var btn = container.querySelector('[data-pill="' + kind + '"]');
      if (!btn) return;
      btn.querySelector('.pill__label').textContent = pillLabel(kind, prompt);
      if (btn.classList.contains('pill--multi')) {
        btn.dataset.count = narrowedCount(kind, prompt);
      }
    });
  }

  function refreshAllPills() {
    if (!state.draft) return;
    refreshPills(document.getElementById('hero-prompt'), state.draft);
    refreshPills(el.toolbarSlot, state.draft);
  }

  // ------------------------------------------------------------
  //  The hero — start and thinking are the same block, so the orb
  //  survives the transition and simply changes state.
  // ------------------------------------------------------------

  var heroBuilt = false;

  function renderHero() {
    if (state.screen !== 'start' && state.screen !== 'thinking') {
      el.hero.innerHTML = '';
      heroBuilt = false;
      return;
    }

    if (!heroBuilt) {
      el.hero.innerHTML =
        '<div class="hero" id="hero-inner">' +
          orbTag({ id: 'hero-orb', size: 40, background: '#f2f5fc' }) +
          '<div class="hero__text">' +
            '<h1 class="hero__greeting">' + greeting() + ', ' + esc(HALO.user.firstName) + '</h1>' +
            '<p class="hero__strap">I&rsquo;m here to help bring Ai powered organisation ' +
              'to your caseload. How can I help?</p>' +
          '</div>' +
          '<div class="prompt"><div id="hero-prompt"></div></div>' +
          '<button class="btn-organise" id="organise">Organise</button>' +
          '<span class="sr-only" role="status" id="hero-status"></span>' +
        '</div>';
      document.getElementById('hero-prompt').innerHTML = promptRow(state.draft);
      heroBuilt = true;
    } else {
      refreshPills(document.getElementById('hero-prompt'), state.draft);
      var amount = el.hero.querySelector('.pill__input');
      if (amount && document.activeElement !== amount) amount.value = state.draft.amount;
    }

    var thinking = state.screen === 'thinking';
    var inner = document.getElementById('hero-inner');
    // the orb is already centred while it is on its way there
    inner.classList.toggle('is-thinking', thinking || state.transition === 'moving');
    inner.classList.toggle('is-departing', state.transition === 'departing');
    var orb = document.getElementById('hero-orb');
    // a transition that was cancelled mid-flight leaves inline styles behind
    if (!state.transition) clearOrbTransform(orb);
    orb.setAttribute('state', thinking ? 'thinking' : 'idle');
    orb.setAttribute('speed', thinking ? ORB.thinkSpeed : 1);
    document.getElementById('hero-status').textContent =
      thinking ? 'Halo is organising your caseload' : '';
  }

  // ------------------------------------------------------------
  //  Ticket 33593 — Workload delivery
  // ------------------------------------------------------------

  // Any in-flight Organise is cancelled by bumping this — a route change or a
  // tab switch must not be overtaken by a transition that was already running.
  var transitionSeq = 0;

  /**
   * The hero clears itself in one movement: the words and controls rise away
   * top-down while the orb comes down to meet them, and the thinking state
   * only starts once it has arrived.
   *
   * The orb is animated by transform rather than by letting the layout move
   * it, because the items it shares the column with are still in flow while
   * they fade — so the target is worked out up front. With only the orb left,
   * the hero's align/justify-center put it dead centre of its own box, which
   * is where the transform aims; the class swap at the end therefore lands on
   * the same pixel and the transform can be dropped without a jump.
   */
  function playOrganiseTransition(done) {
    var inner = document.getElementById('hero-inner');
    var orb = document.getElementById('hero-orb');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!inner || !orb || reduced) { done(); return; }

    var token = ++transitionSeq;
    var box = inner.getBoundingClientRect();
    var from = orb.getBoundingClientRect();
    var dx = (box.left + box.width / 2) - (from.left + from.width / 2);
    var dy = (box.top + box.height / 2) - (from.top + from.height / 2);

    state.transition = 'departing';
    renderHero();
    orb.style.transition = 'transform ' + MOVE_MS + 'ms cubic-bezier(0.33, 0, 0.2, 1)';
    orb.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';

    setTimeout(function () {
      // Cancelled by a route change or a tab switch: whoever cancelled has
      // already reset the phase, so only the inline styles need clearing.
      if (token !== transitionSeq) { clearOrbTransform(orb); return; }
      // Hand the orb back to the layout, which now centres it anyway. The
      // class swap has to land before the transform is dropped, or the orb
      // flashes back to where it started for a frame.
      state.transition = 'moving';
      renderHero();
      clearOrbTransform(orb);
      state.transition = null;
      done();
    }, MOVE_MS);
  }

  // transition first, then transform — the other order animates it back
  function clearOrbTransform(orb) {
    if (!orb) return;
    orb.style.transition = '';
    orb.style.transform = '';
  }

  function organise() {
    // Nothing the prompt row was set to has taken effect until now.
    if (state.draft) {
      state.prompt = clonePrompt(state.draft);
      syncMatterTab();
    }
    state.resolved = {};
    state.cleared = 0;
    state.toolbar = 'summary';
    state.draft = clonePrompt(state.prompt);
    state.workload = W.build(state.prompt, allTasks());

    var startedOn = state.activeTab;

    // From the start screen the hero is on screen to play out; from the
    // toolbar there is nothing to fade, so the orb simply arrives thinking.
    if (state.screen === 'start') playOrganiseTransition(beginThinking);
    else beginThinking();

    function beginThinking() {
      goto('thinking');
      setTimeout(function () {
        // the user may have switched tabs while Halo was working
        if (state.activeTab !== startedOn || state.screen !== 'thinking') return;
        state.entering = true;
        goto('loaded');
        // long enough for the last card's delay plus its own run
        setTimeout(function () {
          state.entering = false;
          el.columns.classList.remove('is-entering');
        }, 3400);
      }, THINKING_MS);
    }
  }

  function liveTasks(section) {
    return section.tasks.filter(function (t) { return !state.resolved[t.id]; });
  }

  function liveSections(column) {
    return column.sections.filter(function (s) { return liveTasks(s).length > 0; });
  }

  function renderColumns() {
    // On the start screen all three lane beds stay behind the prompt whatever
    // the task type is set to (Figma 5548:485770 / 5548:485875) — the filter
    // only bites once Organise has run.
    var lanes = state.screen === 'start'
      ? HALO.lanes.map(function (l) { return { lane: l.id, label: l.label, sections: [] }; })
      : state.workload.columns;

    el.columns.className = 'columns' +
      (lanes.length === 1 ? ' is-single' : '') +
      (state.screen === 'thinking' ? ' is-thinking' : '') +
      (state.screen === 'start' ? ' is-idle' : '') +
      (state.entering ? ' is-entering' : '');

    // one index across every column, so the cards pop in in reading order
    var order = 0;

    el.columns.innerHTML = lanes.map(function (col) {
      var body;
      if (state.screen === 'start') {
        body = '';
      } else if (state.screen === 'thinking') {
        body = '<div class="skeleton"></div><div class="skeleton"></div>' +
          (lanes.length === 1 ? '<div class="skeleton"></div>' : '');
      } else {
        body = columnBody(col, function () { return order++; });
      }
      return '<section class="column column--' + col.lane + '" aria-label="' + esc(col.label) + '">' +
        '<span class="chip chip--' + col.lane + '">' + esc(col.label) + '</span>' +
        body +
      '</section>';
    }).join('');
  }

  function columnBody(col, nextIndex) {
    var sections = liveSections(col);
    if (!sections.length) {
      return '<div class="column__done" style="--i:' + nextIndex() + '">Nothing outstanding in ' +
        esc(col.label.toLowerCase()) + ' for this session.</div>';
    }
    return sections.map(function (section) {
      var live = liveTasks(section);
      var mins = live.reduce(function (sum, t) { return sum + t.mins; }, 0);
      var top = live[0];
      var blocked = W.isBlocked(top, state);

      return '<div class="section" style="--i:' + nextIndex() + '"' +
        ' data-section="' + esc(col.lane + '::' + section.name) + '">' +
        '<div class="section__head"><b>' + esc(section.name) + '</b>' +
          '<span>' + W.formatMins(mins) + '</span></div>' +
        '<div class="deck' + (live.length > 1 ? ' has-peek' : '') + '">' +
          (live.length > 1 ? '<div class="deck__peek"></div>' : '') +
          cardHTML(top, blocked) +
        '</div>' +
      '</div>';
    }).join('');
  }

  // ------------------------------------------------------------
  //  Ticket 33748 — Task cards
  // ------------------------------------------------------------

  function cardHTML(task, blocked) {
    var attrs = 'class="card' + (blocked ? ' is-blocked' : '') + '" data-task="' + esc(task.id) + '"';

    if (task.kind === 'document') {
      return '<article ' + attrs + '>' +
        '<div class="card__body">' + docThumb() +
          '<div class="card__column">' +
            '<div>' +
              '<p class="card__meta">' + esc(task.meta) + '</p>' +
              '<p class="card__title">' + esc(task.title) + '</p>' +
            '</div>' +
            actionsHTML(task, blocked) +
          '</div>' +
        '</div>' +
      '</article>';
    }

    if (task.kind === 'message') {
      return '<article ' + attrs + '>' +
        '<div class="msg">' +
          '<div class="msg__who">' +
            '<span class="avatar">' + esc(task.initials) + '</span>' +
            '<span>' +
              '<span class="msg__name">' + esc(task.from) + '</span><br>' +
              '<span class="msg__sub">' + esc(task.meta) + '</span>' +
            '</span>' +
          '</div>' +
          '<span class="msg__channel">' + esc(task.channel) + '</span>' +
        '</div>' +
        '<p class="card__quote">' + esc(task.quote) + '</p>' +
        actionsHTML(task, blocked) +
      '</article>';
    }

    return '<article ' + attrs + '>' +
      '<p class="card__meta">' + esc(task.meta) + '</p>' +
      '<p class="card__title">' + esc(task.title) + '</p>' +
      (blocked && task.lockNote ? '<p class="card__note">' + esc(task.lockNote) + '</p>' : '') +
      actionsHTML(task, blocked) +
    '</article>';
  }

  function actionsHTML(task, blocked) {
    if (blocked) return '';
    return '<div class="card__actions">' +
      '<button class="act act--skip" data-act="skip">Skip</button>' +
      '<div class="card__actions-right">' +
        '<button class="act act--secondary" data-act="secondary">' + esc(task.secondary) + '</button>' +
        '<button class="act act--primary" data-act="primary">' + esc(task.primary) + '</button>' +
      '</div>' +
    '</div>';
  }

  function docThumb() {
    return '<div class="thumb" aria-hidden="true">' +
      '<span class="thumb__mark"></span>' +
      '<span class="thumb__block"><i style="width:26px"></i><i style="width:32px"></i><i style="width:20px"></i></span>' +
      '<span class="thumb__copy"><i></i><i></i><i></i><i></i><i></i><i></i></span>' +
    '</div>';
  }

  el.columns.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-act]');
    if (!btn) return;
    var card = btn.closest('[data-task]');
    var task = findTask(card.dataset.task);
    if (!task) return;

    // Review / Preview / Edit would open the record itself, which is
    // outside this prototype
    if (btn.dataset.act === 'secondary') return;
    resolveTask(task, btn.dataset.act === 'skip' ? 'skipped' : 'done', card);
  });

  function findTask(id) {
    return allTasks().filter(function (t) { return t.id === id; })[0];
  }

  function resolveTask(task, outcome, cardEl) {
    state.resolved[task.id] = outcome;
    if (outcome === 'done') state.cleared += task.mins;

    // let the card animate out, then redraw so the deck restacks, the section
    // time drops and anything waiting on this lane unlocks
    cardEl.classList.add('is-leaving');
    setTimeout(function () {
      renderColumns();
      renderToolbar();
    }, 320);
  }

  function isAllClear() {
    return state.workload.columns.every(function (col) {
      return liveSections(col).length === 0;
    });
  }

  // ------------------------------------------------------------
  //  Ticket 33590 — Pre-canned prompt toolbar
  // ------------------------------------------------------------

  function renderToolbar() {
    if (state.screen !== 'loaded') { el.toolbarSlot.innerHTML = ''; return; }

    if (state.toolbar === 'editing') {
      el.toolbarSlot.innerHTML =
        '<div class="toolbar is-editing" role="group" aria-label="Change what Halo is showing">' +
          promptRow(state.draft) +
          '<div class="toolbar__commit">' +
            '<button class="btn-organise btn-organise--sm" id="toolbar-organise">Organise</button>' +
            '<button class="tool-btn" id="toolbar-cancel">Cancel</button>' +
          '</div>' +
        '</div>';
      return;
    }

    var outstanding = 0;
    state.workload.columns.forEach(function (col) {
      liveSections(col).forEach(function (s) {
        outstanding += liveTasks(s).reduce(function (sum, t) { return sum + t.mins; }, 0);
      });
    });

    var summary = 'Showing <b>' + esc(W.describeTime(state.prompt)) + '</b> of work across <b>' +
      esc(W.taskTypeLabel(state.prompt, ' and ').toLowerCase()) + '</b> for <b>' +
      esc(W.matterSummary(state.prompt, ' and ').replace(/^All matters$/, 'all matters')) + '</b>';

    if (state.cleared > 0) {
      summary += ' &middot; <b>' + W.formatMins(state.cleared) + '</b> cleared, ' +
        W.formatMins(outstanding) + ' left';
    }

    el.toolbarSlot.innerHTML =
      '<div class="toolbar" role="group" aria-label="What Halo is showing">' +
        '<p class="toolbar__summary">' + summary + '</p>' +
        '<button class="tool-btn" id="toolbar-edit">' +
          '<img src="assets/icon-edit.svg" alt="">Edit</button>' +
        '<button class="tool-btn" id="toolbar-refresh">' +
          '<img src="assets/icon-refresh.svg" alt="">Refresh</button>' +
        '<div class="switch-field">' +
          '<button class="switch" id="toolbar-loop" role="switch" aria-checked="' + state.loop + '"' +
            ' aria-labelledby="loop-label"></button>' +
          '<label id="loop-label" for="toolbar-loop">Loop Daily</label>' +
        '</div>' +
      '</div>';
  }

  el.toolbarSlot.addEventListener('click', function (e) {
    if (e.target.closest('#toolbar-edit')) {
      state.draft = clonePrompt(state.prompt);
      state.toolbar = 'editing';
      renderToolbar();
      writeHash();
      return;
    }
    if (e.target.closest('#toolbar-cancel')) {
      state.draft = clonePrompt(state.prompt);
      state.toolbar = 'summary';
      hideMenu();
      renderToolbar();
      writeHash();
      return;
    }
    if (e.target.closest('#toolbar-organise')) { organise(); return; }
    if (e.target.closest('#toolbar-refresh')) {
      var btn = e.target.closest('#toolbar-refresh');
      btn.classList.add('is-spinning');
      setTimeout(function () { btn.classList.remove('is-spinning'); }, 700);
      // re-run what is on screen, not whatever the row was left set to
      state.draft = clonePrompt(state.prompt);
      organise();
      return;
    }
    var loop = e.target.closest('#toolbar-loop');
    if (loop) {
      state.loop = !state.loop;
      loop.setAttribute('aria-checked', String(state.loop));
    }
  });

  function clonePrompt(p) {
    return {
      amount: p.amount,
      unit: p.unit,
      taskTypes: p.taskTypes.slice(),
      matters: p.matters.slice(),
    };
  }

  // ------------------------------------------------------------
  //  Prompt pills — single and multi-select menus
  // ------------------------------------------------------------

  var openMenu = null;

  function laneItems(prompt) {
    return HALO.lanes.map(function (l) {
      return { value: l.id, label: l.label, on: prompt.taskTypes.indexOf(l.id) !== -1 };
    });
  }

  // One flat list in caseload order — a ticked matter stays where it sits
  // rather than jumping to a separate group.
  function matterItems(prompt, query) {
    var chosen = prompt.matters;
    return HALO.search.filter(query, 400).map(function (m) {
      return {
        value: m.ref,
        label: m.ref + ' · ' + m.client,
        note: m.description,
        on: chosen.indexOf(m.ref) !== -1,
      };
    });
  }

  function showMenu(trigger, kind) {
    var wasOpen = openMenu && openMenu.trigger === trigger;
    hideMenu();
    if (wasOpen) return;

    var target = state.draft;

    var node = document.createElement('div');
    node.className = 'menu' + (kind === 'matter' ? ' menu--search' : '');
    node.setAttribute('role', 'listbox');
    if (kind !== 'unit') node.setAttribute('aria-multiselectable', 'true');

    openMenu = { node: node, trigger: trigger, kind: kind, target: target, query: '' };
    document.body.appendChild(node);
    paintMenu();
    anchorMenu();
    positionMenu();

    node.addEventListener('click', function (e) {
      // Ticking an option repaints the list, which detaches the clicked row —
      // after which closest('.menu') on it returns null and the document
      // handler below would read it as a click outside and close the menu.
      e.stopPropagation();
      var opt = e.target.closest('[data-value]');
      if (opt) { chooseMenu(opt.dataset.value); return; }
      if (e.target.closest('[data-menu-clear]')) { clearMenu(); }
    });

    if (kind === 'matter') {
      var input = node.querySelector('.menu__search input');
      input.addEventListener('input', function () {
        openMenu.query = input.value;
        paintMenu(true);
        // the list shrinks as you type, so keep the vertical edge settled
        positionMenu();
      });
      input.focus();
    }

    trigger.setAttribute('aria-expanded', 'true');

  }

  /**
   * Take the trigger's position once and keep it. Ticking an option relabels
   * the pill, which changes its width and — in a centred row — its left edge;
   * re-reading it every time made the flyout crawl sideways as you selected.
   * Only a scroll or a resize re-anchors it.
   */
  function anchorMenu() {
    if (!openMenu) return;
    var r = openMenu.trigger.getBoundingClientRect();
    openMenu.anchor = { left: r.left, top: r.top, bottom: r.bottom };
    // flipped above when there is no room below (the toolbar sits at the bottom)
    openMenu.above = r.bottom + 6 + openMenu.node.offsetHeight > window.innerHeight - 12;
  }

  function positionMenu() {
    if (!openMenu || !openMenu.anchor) return;
    var node = openMenu.node;
    var a = openMenu.anchor;
    // height still tracks the content, so an upward menu stays pinned to the
    // trigger as the list grows and shrinks
    var top = openMenu.above
      ? Math.max(12, a.top - node.offsetHeight - 6)
      : a.bottom + 6;
    node.style.top = top + 'px';
    node.style.left = Math.max(12, Math.min(a.left, window.innerWidth - node.offsetWidth - 12)) + 'px';
  }

  // Repaints the option list. `listOnly` keeps the search field's focus and
  // caret intact while typing.
  function paintMenu(listOnly) {
    if (!openMenu) return;
    var kind = openMenu.kind;
    var target = openMenu.target;

    if (kind === 'unit') {
      openMenu.node.innerHTML = HALO.units.map(function (u) {
        var on = target.unit === u;
        return option({ value: u, label: u, on: on, single: true });
      }).join('');
      return;
    }

    if (kind === 'taskType') {
      var items = laneItems(target);
      openMenu.node.innerHTML =
        option({ value: '__all', label: 'All task types',
                 on: target.taskTypes.length === HALO.lanes.length, single: true }) +
        '<div class="menu__rule"></div>' +
        items.map(option).join('');
      return;
    }

    // matter — searchable, multi-select, whole caseload
    var items = matterItems(target, openMenu.query);
    openMenu.matched = items.length;
    var list =
      option({ value: '__all', label: 'All matters',
               note: HALO.user.openMatters + ' open matters',
               on: !target.matters.length, single: true }) +
      '<div class="menu__rule"></div>' +
      (items.length
        ? items.map(option).join('')
        : '<p class="menu__empty">No matters match &ldquo;' +
          esc(openMenu.query) + '&rdquo;</p>');

    if (listOnly) {
      openMenu.node.querySelector('.menu__list').innerHTML = list;
    } else {
      openMenu.node.innerHTML =
        '<div class="menu__search">' +
          '<img src="assets/icon-search.svg" alt="">' +
          '<input type="search" autocomplete="off" spellcheck="false"' +
            ' placeholder="Search all ' + HALO.matters.length + ' matters…"' +
            ' aria-label="Search matters">' +
        '</div>' +
        '<div class="menu__list">' + list + '</div>' +
        '<div class="menu__foot"></div>';
    }
    footNote();
  }

  function footNote() {
    if (!openMenu) return;
    var foot = openMenu.node.querySelector('.menu__foot');
    if (!foot) return;
    var n = openMenu.target.matters.length;
    var parts = [];
    if (openMenu.query) {
      parts.push(openMenu.matched + ' of ' + HALO.matters.length + ' matters');
    }
    parts.push(n ? n + ' selected' : 'Working across every matter');
    foot.innerHTML = '<span>' + esc(parts.join(' · ')) + '</span>' +
      (n ? '<button type="button" data-menu-clear>Clear</button>' : '');
  }

  function option(item) {
    return '<button type="button" role="option" data-value="' + esc(item.value) + '"' +
      ' class="menu__opt' + (item.on ? ' is-on' : '') + (item.single ? ' menu__opt--single' : '') + '"' +
      ' aria-selected="' + !!item.on + '">' +
      '<span class="menu__tick" aria-hidden="true"></span>' +
      '<span class="menu__text">' + esc(item.label) +
        (item.note ? '<small>' + esc(item.note) + '</small>' : '') +
      '</span></button>';
  }

  function chooseMenu(value) {
    if (!openMenu) return;
    var kind = openMenu.kind;
    var target = openMenu.target;

    if (kind === 'unit') {
      target.unit = value;
      hideMenu();
      commitPrompt();
      return;
    }

    if (kind === 'taskType') {
      if (value === '__all') {
        target.taskTypes = ALL_LANES.slice();
      } else {
        var at = target.taskTypes.indexOf(value);
        // at least one lane has to stay selected — with none there is nothing
        // to show, so the last one is not removable
        if (at === -1) target.taskTypes.push(value);
        else if (target.taskTypes.length > 1) target.taskTypes.splice(at, 1);
      }
    } else {
      if (value === '__all') {
        target.matters = [];
      } else {
        var i = target.matters.indexOf(value);
        if (i === -1) target.matters.push(value);
        else target.matters.splice(i, 1);
      }
    }

    // menu stays open for multi-select; repaint the ticks and the pill label
    paintMenu(kind === 'matter');
    commitPrompt();
  }

  function clearMenu() {
    if (!openMenu) return;
    openMenu.target.matters = [];
    paintMenu(true);
    commitPrompt();
  }

  /**
   * Reflect a prompt change on the row itself and nowhere else — the tab, the
   * matter strip and the columns all stay on the last organised prompt until
   * Organise commits this one. Rebuilding the row is avoided so an open
   * multi-select menu survives its trigger being relabelled.
   */
  function commitPrompt() {
    refreshAllPills();
    // keeps the vertical edge honest as the list resizes; the frozen anchor
    // stops it drifting sideways
    positionMenu();
  }

  function hideMenu() {
    if (!openMenu) return;
    openMenu.trigger.setAttribute('aria-expanded', 'false');
    openMenu.node.remove();
    openMenu = null;
  }

  document.addEventListener('click', function (e) {
    var pillBtn = e.target.closest('[data-pill]');
    if (pillBtn) { showMenu(pillBtn, pillBtn.dataset.pill); return; }
    if (openMenu && !e.target.closest('.menu')) hideMenu();
  });

  // Reposition rather than close: the menu is fixed to the viewport, and
  // scrolling the matter list itself must not dismiss the list.
  function reposition(e) {
    if (!openMenu) return;
    if (e && e.target && e.target.closest && e.target.closest('.menu')) return;
    anchorMenu();
    positionMenu();
  }
  window.addEventListener('resize', reposition);
  document.addEventListener('scroll', reposition, true);

  // The amount field lives in both the hero and the editing toolbar. It takes
  // digits only, and holds 1-99 — anything else is rejected as it is typed.
  document.addEventListener('input', function (e) {
    var field = e.target;
    if (!field.classList.contains('pill__input')) return;
    var clean = field.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 2);
    if (clean !== field.value) field.value = clean;
    if (!clean) return;   // mid-edit: let them clear it and retype
    state.draft.amount = parseInt(clean, 10);
    // the unit label singularises off the amount, so refresh the labels
    refreshPills(field.closest('.prompt__row').parentNode, state.draft);
  });

  // leaving the field half-typed puts back whatever is actually set
  document.addEventListener('blur', function (e) {
    if (e.target.classList && e.target.classList.contains('pill__input')) {
      e.target.value = state.draft.amount;
    }
  }, true);

  document.addEventListener('click', function (e) {
    if (e.target.closest('#organise')) organise();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.classList.contains('pill__input')) {
      e.preventDefault();
      organise();
    }
  });

  // ------------------------------------------------------------
  //  Ask Halo
  // ------------------------------------------------------------

  var askSignature = null;

  function renderAsk() {
    el.askFab.hidden = state.screen !== 'loaded';

    var open = state.askOpen && state.screen === 'loaded';
    var added = state.extras.some(function (t) { return t.id === 'ask-comms'; });
    var signature = open ? 'open:' + added : 'closed';
    // rebuilding tears down two WebGL contexts, so only redraw on a real change
    if (signature === askSignature) return;
    askSignature = signature;

    if (!open) { el.askSlot.innerHTML = ''; return; }

    var draft = HALO.tasks.filter(function (t) { return t.id === 'com-draft-1'; })[0];

    el.askSlot.innerHTML =
      '<section class="ask" role="dialog" aria-label="Ask Halo">' +
        '<header class="ask__head">' +
          '<div>' +
            '<h2>Ask halo</h2>' +
            '<p>Looking across all ' + HALO.user.openMatters + ' of your open matters</p>' +
          '</div>' +
          '<div class="ask__head-actions">' +
            '<button class="icon-btn icon-btn--sm" id="ask-min" aria-label="Minimise">' +
              '<span style="font-size:18px;line-height:1">&minus;</span></button>' +
            '<button class="icon-btn icon-btn--sm" id="ask-close" aria-label="Close">' +
              '<span><img src="assets/icon-close.svg" alt=""></span></button>' +
          '</div>' +
        '</header>' +
        '<div class="ask__body">' +
          '<div class="ask__turn">' +
            orbTag({ size: 28, background: '#ffffff' }) +
            '<div class="ask__bubble">' + greeting().replace('Good ', '') +
            ' ' + esc(HALO.user.firstName) + '. How can I help you today?</div></div>' +
          '<div class="ask__turn ask__turn--user">' +
            '<div class="ask__bubble">Draft replies to unanswered emails from the last 3 days</div></div>' +
          '<div class="ask__turn">' +
            orbTag({ size: 28, background: '#ffffff', timeOffset: 7 }) +
            '<div class="ask__bubble">' +
              '<p style="margin:0 0 12px">There are currently 26 emails that have not been ' +
                'replied to over the past 3 days. I&rsquo;ve created the drafts</p>' +
              cardHTML(draft, false).replace('data-task="com-draft-1"', 'data-task="ask-preview"') +
              '<p class="ask__source" style="margin:10px 0 12px">Sourced from your email inbox ' +
                'as at 09:14 today</p>' +
              '<div class="ask__actions">' +
                (added
                  ? '<span class="ask__source">Added to the Communications column</span>'
                  : '<button class="act act--secondary" id="ask-pass">Pass</button>' +
                    '<button class="act act--primary" id="ask-add">Add to Comms tasks (+10 Mins)</button>') +
              '</div>' +
            '</div></div>' +
        '</div>' +
        '<footer class="ask__foot">' +
          '<input class="ask__composer" disabled' +
            ' value="Got a question? Soon you can just ask me - Halo Ai chat is coming soon">' +
          '<p class="ask__disclaimer">Halo can make mistakes - check before you act on it.</p>' +
        '</footer>' +
      '</section>';
  }

  el.askFab.addEventListener('click', function () {
    state.askOpen = !state.askOpen;
    renderAsk();
  });

  el.askSlot.addEventListener('click', function (e) {
    if (e.target.closest('#ask-close') || e.target.closest('#ask-min')) {
      state.askOpen = false;
      renderAsk();
      return;
    }
    if (e.target.closest('#ask-pass')) {
      state.askOpen = false;
      renderAsk();
      return;
    }
    if (e.target.closest('#ask-add')) { addAskTask(); return; }
    // the preview card inside the chat is a sample, not a live task, so its
    // own buttons do nothing
  });

  // Ticket 33593 — work handed over from the chat lands in the columns.
  function addAskTask() {
    var task = {
      id: 'ask-comms', lane: 'communications', section: 'Draft replies to clients',
      mins: 10, priority: 100, kind: 'standard', matterRef: 'All matters',
      meta: '26 emails · added from Ask Halo', title: '26 drafts ready to review',
      secondary: 'Review', primary: 'Send all',
    };
    if (!state.extras.some(function (t) { return t.id === task.id; })) state.extras.push(task);

    var comms = state.workload.columns.filter(function (c) { return c.lane === 'communications'; })[0];
    if (comms) {
      var section = comms.sections.filter(function (s) { return s.name === task.section; })[0];
      if (section) { section.tasks.unshift(task); section.mins += task.mins; }
      else comms.sections.unshift({ name: task.section, tasks: [task], mins: task.mins });
      renderColumns();
      renderToolbar();
    }
    renderAsk();
  }

  // ------------------------------------------------------------
  //  Search — find and open a matter on any criteria
  // ------------------------------------------------------------

  function openSearch() {
    state.searchOpen = true;
    el.scrim.hidden = false;
    el.searchInput.value = state.searchQuery;
    renderResults();
    el.searchInput.focus();
    el.searchInput.select();
  }

  function closeSearch() {
    state.searchOpen = false;
    el.scrim.hidden = true;
  }

  function renderResults() {
    var q = state.searchQuery.trim();
    var results = HALO.search.run(q, q ? 10 : 6);
    state.searchIndex = Math.min(state.searchIndex, Math.max(0, results.length - 1));

    el.searchTab.textContent = q
      ? (results.length + (results.length === 1 ? ' matter' : ' matters'))
      : 'Recent Matters';

    if (!results.length) {
      el.searchResults.innerHTML = '<p class="search-empty">No matters match &ldquo;' +
        esc(q) + '&rdquo;. Try a reference, client, address, postcode, fee earner or matter area.</p>';
      return;
    }

    el.searchResults.innerHTML = results.map(function (r, i) {
      var m = r.matter;
      var sub = q
        ? '<b>' + esc(r.label) + '</b> · ' + esc(m.ref) + ' · ' + esc(m.client) +
          (r.label === 'Matter' ? '' : ' — ' + esc(m.description))
        : esc(m.ref) + ' · ' + esc(m.client) + ' · ' + esc(m.area);

      return '<button type="button" class="result' + (i === state.searchIndex ? ' is-active' : '') +
        '" role="option" aria-selected="' + (i === state.searchIndex) + '" data-ref="' + esc(m.ref) + '">' +
        '<span class="result__title">' + HALO.search.highlight(r.title, q) + '</span>' +
        '<span class="result__sub">' + sub + '</span>' +
      '</button>';
    }).join('') +
    '<p class="search-hint"><kbd>&uarr;</kbd><kbd>&darr;</kbd> to move &middot; ' +
      '<kbd>Enter</kbd> to open the matter &middot; <kbd>Esc</kbd> to close</p>';
  }

  el.searchInput.addEventListener('input', function () {
    state.searchQuery = el.searchInput.value;
    state.searchIndex = 0;
    renderResults();
  });

  el.searchInput.addEventListener('keydown', function (e) {
    var rows = el.searchResults.querySelectorAll('[data-ref]');
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!rows.length) return;
      state.searchIndex = (state.searchIndex + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length;
      renderResults();
      var active = el.searchResults.querySelector('.is-active');
      if (active) active.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (rows[state.searchIndex]) openMatter(rows[state.searchIndex].dataset.ref);
    }
  });

  el.searchResults.addEventListener('click', function (e) {
    var row = e.target.closest('[data-ref]');
    if (row) openMatter(row.dataset.ref);
  });

  document.getElementById('open-search').addEventListener('click', openSearch);
  document.getElementById('search-back').addEventListener('click', closeSearch);
  document.getElementById('search-clear').addEventListener('click', function () {
    state.searchQuery = '';
    el.searchInput.value = '';
    state.searchIndex = 0;
    renderResults();
    el.searchInput.focus();
  });
  el.scrim.addEventListener('click', function (e) {
    if (e.target === el.scrim) closeSearch();
  });

  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      state.searchOpen ? closeSearch() : openSearch();
      return;
    }
    if (e.key !== 'Escape') return;
    if (openMenu) { hideMenu(); return; }
    if (state.searchOpen) { closeSearch(); return; }
    if (state.askOpen) { state.askOpen = false; renderAsk(); }
  });

  // ------------------------------------------------------------
  //  Screen changes + deep links
  // ------------------------------------------------------------

  // Each route describes a whole screen, task types included, so jumping
  // between them for review never leaves a stale filter behind.
  var COMMS = ['communications'];
  var ROUTES = {
    'start':          { screen: 'start',    taskTypes: ALL_LANES },
    'comms-start':    { screen: 'start',    taskTypes: COMMS },
    'thinking':       { screen: 'thinking', taskTypes: ALL_LANES },
    'comms-thinking': { screen: 'thinking', taskTypes: COMMS },
    'loaded':         { screen: 'loaded',   taskTypes: ALL_LANES },
    'loaded-edit':    { screen: 'loaded',   taskTypes: ALL_LANES, toolbar: 'editing' },
    'comms':          { screen: 'loaded',   taskTypes: COMMS },
    'comms-edit':     { screen: 'loaded',   taskTypes: COMMS, toolbar: 'editing' },
    'search':         { screen: 'start',    taskTypes: ALL_LANES, search: true },
  };

  function goto(screen) {
    state.screen = screen;
    if (screen !== 'loaded') { state.askOpen = false; state.toolbar = 'summary'; }
    // The hero shows a prompt row, so it needs a draft to edit; arriving at
    // the start screen resets it to whatever is currently organised.
    if (screen === 'start') state.draft = clonePrompt(state.prompt);
    hideMenu();
    render();
    writeHash();
  }

  var writingHash = false;

  function writeHash() {
    var onlyComms = state.prompt.taskTypes.length === 1 &&
      state.prompt.taskTypes[0] === 'communications';
    var hash = state.screen;
    if (onlyComms) {
      if (state.screen === 'thinking') hash = 'comms-thinking';
      else if (state.screen === 'loaded') hash = 'comms';
      else if (state.screen === 'start') hash = 'comms-start';
    }
    if (state.toolbar === 'editing') hash += '-edit';
    if (('#' + hash) === location.hash) return;
    writingHash = true;
    history.replaceState(null, '', '#' + hash);
    setTimeout(function () { writingHash = false; }, 0);
  }

  function readHash() {
    var route = ROUTES[(location.hash || '').replace('#', '')];
    if (!route) return false;

    transitionSeq++;
    state.transition = null;

    // Every route restores the whole screen the frame was drawn with — one
    // hour, across the route's task types, over the whole caseload, with
    // nothing cleared and nothing added — so a prompt, a cleared card or an
    // Ask Halo hand-off from earlier cannot leak into a review screen.
    state.prompt.amount = 1;
    state.prompt.unit = 'Hours';
    state.prompt.taskTypes = route.taskTypes.slice();
    state.prompt.matters = [];
    state.tabs = [];
    state.activeTab = addTab([]).id;
    state.resolved = {};
    state.cleared = 0;
    state.extras = [];
    state.entering = false;
    state.askOpen = false;

    if (route.screen === 'loaded') {
      state.workload = W.build(state.prompt, allTasks());
      state.screen = 'loaded';
      state.toolbar = route.toolbar || 'summary';
    } else if (route.screen === 'thinking') {
      // deep-linked, so hold the state for review; the real flow (Organise)
      // advances on its own after THINKING_MS
      state.workload = W.build(state.prompt, allTasks());
      state.screen = 'thinking';
    } else {
      state.screen = 'start';
    }

    state.draft = clonePrompt(state.prompt);
    render();
    if (route.search) openSearch();
    return true;
  }

  function render() {
    renderRail();
    renderTabs();
    renderMatterStrip();
    renderColumns();
    renderHero();
    renderToolbar();
    renderAsk();
    el.searchbarLabel.textContent = state.searchQuery || 'Search Halo';
  }

  // ------------------------------------------------------------
  //  Boot
  // ------------------------------------------------------------
  if (!state.tabs.length) state.activeTab = addTab([]).id;
  state.draft = clonePrompt(state.prompt);
  if (!readHash()) render();
  window.addEventListener('hashchange', function () { if (!writingHash) readHash(); });

  // handy while reviewing
  window.HALO_STATE = state;
})(window.HALO);
