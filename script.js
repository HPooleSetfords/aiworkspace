/* ============================================================
   Halo — Dashboard interactions
   ============================================================ */

/* ---- Bills & Payments bar chart ----
   Bar heights are expressed as a percentage of the £0–£30k plot height so the
   chart scales fluidly with the widget's column width (the plot height is fixed
   in CSS via --plot-h; widths flex). Source figures are in £ and the y-axis
   tops out at £30k. */
const CHART_MAX = 30000; // £30k = top grid line = 100% of the plot height
const CHART_DATA = [
  { label: "J", bills: 10900, pay: 8300 },
  { label: "F", bills: 11700, pay: 8300 },
  { label: "M", bills: 25900, pay: 17800 },
  { label: "A", bills: 18900, pay: 12200 },
  { label: "M", bills: 6700,  pay: 9100 },
  { label: "J", bills: 2200,  pay: 14400 },
  { label: "J", bills: 3300,  pay: 11500 },
  { label: "A", bills: 18700, pay: 8300 },
  { label: "S", bills: 2200,  pay: 8300 },
  { label: "O", bills: 18300, pay: 8300 },
  { label: "N", bills: 12400, pay: 8300 },
  { label: "D", bills: 3100,  pay: 13900 },
];

(function renderChart() {
  const host = document.getElementById("chartBars");
  if (!host) return;
  const pct = (v) => (Math.max(0, Math.min(v, CHART_MAX)) / CHART_MAX) * 100;
  CHART_DATA.forEach((d) => {
    const group = document.createElement("div");
    group.className = "bar-group";
    group.innerHTML =
      '<div class="bar-group__bars">' +
        '<div class="bar bar--bills" style="height:' + pct(d.bills) + '%"></div>' +
        '<div class="bar bar--pay" style="height:' + pct(d.pay) + '%"></div>' +
      '</div>' +
      '<div class="bar-group__label">' + d.label + '</div>';
    host.appendChild(group);
  });
})();

/* ---- PAF Deadline countdown ---- */
(function countdown() {
  const el = document.getElementById("pafTimer");
  if (!el) return;
  // Start at 01:50:56
  let total = 1 * 3600 + 50 * 60 + 56;
  const pad = (n) => String(n).padStart(2, "0");

  function tick() {
    if (total <= 0) total = 0;
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    el.innerHTML = "<b>" + pad(h) + ":" + pad(m) + "</b><i>:" + pad(s) + "</i>";
    if (total > 0) total -= 1;
  }
  tick();
  setInterval(tick, 1000);
})();

/* ---- Drawer collapse / expand ---- */
(function drawerToggle() {
  const drawer = document.querySelector(".drawer");
  const toggle = drawer && drawer.querySelector(".drawer__toggle");
  if (!drawer || !toggle) return;
  const icon = toggle.querySelector(".material-symbols-outlined");

  toggle.addEventListener("click", () => {
    const collapsed = drawer.classList.toggle("drawer--collapsed");
    if (icon) icon.textContent = collapsed ? "menu" : "menu_open";
    toggle.setAttribute("aria-label", collapsed ? "Expand menu" : "Collapse menu");
    toggle.setAttribute("aria-expanded", String(!collapsed));
  });
})();

/* ---- Tab switching for list cards ---- */
document.querySelectorAll("[data-tabs]").forEach((card) => {
  const tabs = card.querySelectorAll(".tab");
  const panels = card.querySelectorAll(".tab-panel");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("tab--active"));
      tab.classList.add("tab--active");
      const target = tab.getAttribute("data-tab");
      panels.forEach((p) => {
        p.hidden = p.getAttribute("data-panel") !== target;
      });
    });
  });
});

/* ============================================================
   Editable widget dashboard
   - 4-column grid; widgets span 1–4 columns
   - Edit mode: drag to reorder, drag right edge to resize, remove
   - Widget library drawer to add removed widgets back
   - Layout persisted to localStorage
   ============================================================ */
(function dashboardEditor() {
  // Width model: a 6-column grid. A card's width (cspan) is one of these track
  // counts — a third / half / two-thirds / full width. Each card owns its width,
  // so resizing one never resizes a neighbour (they just reflow).
  const COLS = 6;
  const CSPANS = [2, 3, 4, 6];            // ⅓, ½, ⅔, full
  const DEFAULT_CSPAN = 2;                // ⅓ → three per row by default
  const ROWS_MAX = 6;                     // a card can be 1–6 rows (332px each) tall

  // The Re-order drawer works in a row model (columns per row + split); these
  // helpers convert between that and the per-card widths the grid uses.
  const ALLOWED_COLS = [1, 2, 3];
  const DEFAULT_COLS = 3;
  const SPLITS = ["30/70", "50/50", "70/30"];
  const DEFAULT_SPLIT = "50/50";
  const STORAGE_KEY = "halo-dashboard-layout-v9";

  // Preview column template for a row (drawer only).
  function templateFor(cols, split) {
    if (cols === 1) return "1fr";
    if (cols === 3) return "1fr 1fr 1fr";
    if (split === "30/70") return "3fr 7fr";
    if (split === "70/30") return "7fr 3fr";
    return "1fr 1fr";
  }
  // Per-card widths (6-col tracks) for a row's column count + split.
  function widthsForRow(cols, split) {
    if (cols === 1) return [6];
    if (cols >= 3) return [2, 2, 2];
    if (split === "30/70") return [2, 4];
    if (split === "70/30") return [4, 2];
    return [3, 3];                         // 50/50
  }
  function splitOf(a, b) { return a < b ? "30/70" : (a > b ? "70/30" : "50/50"); }
  // Snap a track count to the nearest valid width: ⅓, ½, ⅔ or full. Dragging can
  // land on ½ (so you can build a 50/50 row), but a ½ that doesn't pair with
  // another ½ is normalised to ⅔ on Save (see normalizeLayout).
  function snapCspan(tracks) {
    return tracks <= 2 ? 2 : (tracks === 3 ? 3 : (tracks <= 5 ? 4 : 6));
  }
  // Pack an ordered id list into rows (each ≤ 6 tracks) from per-card widths.
  function packRows(order, widths) {
    const rows = [];
    let cur = [], used = 0;
    order.forEach((id) => {
      const w = CSPANS.includes(widths[id]) ? widths[id] : DEFAULT_CSPAN;
      if (used + w > COLS && cur.length) { rows.push(cur); cur = []; used = 0; }
      cur.push(id); used += w;
    });
    if (cur.length) rows.push(cur);
    return rows;
  }
  // Row config (cols + split) implied by a group of cards' current widths.
  function rowCfgOf(ids, widths) {
    if (ids.length <= 1) return { cols: 1, split: DEFAULT_SPLIT };
    if (ids.length >= 3) return { cols: 3, split: DEFAULT_SPLIT };
    return { cols: 2, split: splitOf(widths[ids[0]] || DEFAULT_CSPAN, widths[ids[1]] || DEFAULT_CSPAN) };
  }
  // Slice an ordered id list into rows of rowCfg[r].cols cards each.
  function computeRows(order, rowCfg) {
    const rows = [];
    let i = 0, r = 0;
    while (i < order.length) {
      const cfg = rowCfg[r] || {};
      const cols = ALLOWED_COLS.includes(cfg.cols) ? cfg.cols : DEFAULT_COLS;
      const split = SPLITS.includes(cfg.split) ? cfg.split : DEFAULT_SPLIT;
      rows.push({ cols, split, ids: order.slice(i, i + cols) });
      i += cols; r++;
    }
    return rows;
  }

  // Registry: id -> title. Order defines the default block order.
  const REGISTRY = [
    { id: "todos",            title: "Todays to-do's"        },
    { id: "matters-close",    title: "Matters ready to close" },
    { id: "replies",          title: "Replies to send"        },
    { id: "searches",         title: "Searches to follow-up"  },
    { id: "client-relations", title: "Client relations"       },
    { id: "aml-checks",       title: "AML Checks to complete" },
    { id: "cashflow",         title: "Bills & Payments"       },
    { id: "paf",              title: "PAF Deadline"           },
    { id: "recent-matters",   title: "Recent Matters"         },
    { id: "activities",       title: "Upcoming Activities"    },
    { id: "recent-pafs",      title: "Recent PAFs"            },
    { id: "time-recordings",  title: "Time Recordings"        },
  ];
  const REG_BY_ID = Object.fromEntries(REGISTRY.map((w) => [w.id, w]));

  const content   = document.querySelector(".content");
  const grid      = document.getElementById("widgetGrid");
  if (!content || !grid) return;

  const editBtn   = document.querySelector(".page-header__edit");
  const saveBtn   = document.querySelector(".page-header__save");
  const cancelBtn = document.querySelector(".page-header__cancel");
  const addBtn    = document.querySelector(".page-header__addwidgets");

  const reorderBtn    = document.querySelector(".page-header__reorder");
  const reorderPanel  = document.getElementById("reorder");
  const reorderScrim  = document.getElementById("reorderScrim");
  const reorderClose  = document.getElementById("reorderClose");
  const reorderWire   = document.getElementById("reorderWire");
  const reorderList   = document.getElementById("reorderList");
  const reorderSaveBtn   = document.getElementById("reorderSave");
  const reorderCancelBtn = document.getElementById("reorderCancel");

  const library      = document.getElementById("library");
  const libraryScrim = document.getElementById("libraryScrim");
  const libraryClose = document.getElementById("libraryClose");
  const listActive   = document.getElementById("libraryActive");
  const listRemoved  = document.getElementById("libraryRemoved");

  // Map widget id -> DOM node, and a hidden holder for removed widgets.
  const nodes = {};
  grid.querySelectorAll(".widget").forEach((el) => {
    nodes[el.dataset.widgetId] = el;
    injectControls(el);
  });
  const holder = document.createElement("div");
  holder.style.display = "none";
  document.body.appendChild(holder);

  let state = loadState();   // { items:[{id, cspan, rspan, removed}] }
  let snapshot = null;       // deep copy taken when entering edit mode
  let editing = false;

  render();

  /* ---------- state ---------- */
  function defaultState() {
    return { items: REGISTRY.map((w) => ({ id: w.id, cspan: DEFAULT_CSPAN, rspan: 1, removed: false })) };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.items)) return defaultState();
      const items = parsed.items
        .filter((it) => REG_BY_ID[it.id])
        .map((it) => ({
          id: it.id,
          cspan: snapCspan(parseInt(it.cspan, 10) || DEFAULT_CSPAN),
          rspan: clamp(parseInt(it.rspan, 10) || 1, 1, ROWS_MAX),
          removed: !!it.removed,
        }));
      const seen = new Set(items.map((it) => it.id));
      REGISTRY.forEach((w) => {
        if (!seen.has(w.id)) items.push({ id: w.id, cspan: DEFAULT_CSPAN, rspan: 1, removed: false });
      });
      return { items };
    } catch (e) {
      return defaultState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* ignore quota / privacy-mode errors */ }
  }

  /* ---------- render ----------
     Blocks are direct children of the CSS grid, each carrying its own --cspan
     (width, 1–3 columns) and --rspan (height, 1–6 rows). They flow in order and
     wrap; appendChild keeps DOM order == visual order so drag-reorder is exact. */
  function flow() {
    state.items.filter((it) => it.removed).forEach((it) => {
      const el = nodes[it.id];
      if (el) { el.hidden = true; holder.appendChild(el); }
    });
    state.items.filter((it) => !it.removed).forEach((it) => {
      const el = nodes[it.id];
      if (!el) return;
      el.hidden = false;
      el.style.setProperty("--cspan", it.cspan || 1);
      el.style.setProperty("--rspan", it.rspan || 1);
      grid.appendChild(el);   // re-append in order
    });
  }

  // On Save, tidy widths so every row adds up to a valid layout: pack cards into
  // rows by their current widths, then snap each row to a clean config
  // (30/30/30, 50/50, 30/70, 70/30 or full). A ½ paired with a ⅓ (a "30/50")
  // becomes 30/70; a matched ½ + ½ stays 50/50.
  function normalizeLayout() {
    const widths = Object.fromEntries(state.items.map((it) => [it.id, it.cspan || DEFAULT_CSPAN]));
    const order = state.items.filter((it) => !it.removed).map((it) => it.id);
    const byId = Object.fromEntries(state.items.map((it) => [it.id, it]));
    packRows(order, widths).forEach((ids) => {
      const cfg = rowCfgOf(ids, widths);
      const ws = widthsForRow(cfg.cols, cfg.split);
      ids.forEach((id, idx) => {
        if (byId[id]) byId[id].cspan = ws[idx] != null ? ws[idx] : DEFAULT_CSPAN;
      });
    });
  }

  function render() {
    flow();
    renderLibrary();
  }

  function renderLibrary() {
    if (!listActive || !listRemoved) return;
    listActive.innerHTML = "";
    listRemoved.innerHTML = "";

    const active = state.items.filter((it) => !it.removed);
    const removed = state.items.filter((it) => it.removed);

    active.forEach((it) => listActive.appendChild(libRow(it, false)));
    removed.forEach((it) => listRemoved.appendChild(libRow(it, true)));

    if (!active.length)  listActive.appendChild(emptyRow("All widgets removed."));
    if (!removed.length) listRemoved.appendChild(emptyRow("Nothing removed."));
  }

  function libRow(item, isRemoved) {
    const li = document.createElement("li");
    li.className = "library__item";
    const name = document.createElement("span");
    name.textContent = REG_BY_ID[item.id].title;
    const btn = document.createElement("button");
    btn.type = "button";
    if (isRemoved) {
      btn.className = "library__action library__action--add";
      btn.innerHTML = '<span class="material-symbols-outlined">add</span>Add';
      btn.addEventListener("click", () => addWidget(item.id));
    } else {
      btn.className = "library__action library__action--remove";
      btn.textContent = "Remove";
      btn.addEventListener("click", () => removeWidget(item.id));
    }
    li.append(name, btn);
    return li;
  }

  function emptyRow(text) {
    const li = document.createElement("li");
    li.className = "library__empty";
    li.textContent = text;
    return li;
  }

  /* ---------- add / remove ---------- */
  function removeWidget(id) {
    const it = state.items.find((i) => i.id === id);
    if (it) it.removed = true;
    render();
  }

  function addWidget(id) {
    const idx = state.items.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const [it] = state.items.splice(idx, 1);
    it.removed = false;
    state.items.unshift(it); // re-add at the top of the grid order
    render();
  }

  /* ---------- edit mode ---------- */
  function enterEdit() {
    editing = true;
    snapshot = JSON.parse(JSON.stringify(state));
    content.classList.add("is-editing");
    toggleHeader(true);
    grid.querySelectorAll(".widget").forEach((el) => (el.draggable = false)); // drag starts from handle
  }

  function exitEdit() {
    editing = false;
    content.classList.remove("is-editing");
    toggleHeader(false);
    closeLibrary();
    closeReorder();
  }

  function toggleHeader(on) {
    if (editBtn) {
      editBtn.setAttribute("aria-pressed", String(on));
      editBtn.hidden = on;
    }
    [saveBtn, cancelBtn, addBtn, reorderBtn].forEach((b) => { if (b) b.hidden = !on; });
  }

  if (editBtn) editBtn.addEventListener("click", enterEdit);
  if (saveBtn) saveBtn.addEventListener("click", () => { normalizeLayout(); flow(); saveState(); exitEdit(); });
  if (cancelBtn) cancelBtn.addEventListener("click", () => {
    if (snapshot) state = snapshot;
    snapshot = null;
    render();
    exitEdit();
  });

  /* ---------- library drawer ---------- */
  function openLibrary() {
    if (!library) return;
    renderLibrary();
    library.classList.add("is-open");
    library.setAttribute("aria-hidden", "false");
    if (libraryScrim) libraryScrim.hidden = false;
  }
  function closeLibrary() {
    if (!library) return;
    library.classList.remove("is-open");
    library.setAttribute("aria-hidden", "true");
    if (libraryScrim) libraryScrim.hidden = true;
  }
  if (addBtn) addBtn.addEventListener("click", openLibrary);
  if (libraryClose) libraryClose.addEventListener("click", closeLibrary);
  if (libraryScrim) libraryScrim.addEventListener("click", closeLibrary);

  /* ---------- Re-order panel ----------
     A structured alternative to grid dragging: reorder blocks in a list (drag
     or the up/down arrows) and set how many columns each row has, previewed as
     a wireframe. Edits a working `draft`; Save applies it to the layout. */
  let draft = null;
  let listDrag = null;

  function openReorder() {
    if (!reorderPanel) return;
    const widths = Object.fromEntries(state.items.map((it) => [it.id, it.cspan || DEFAULT_CSPAN]));
    const order = state.items.filter((it) => !it.removed).map((it) => it.id);
    draft = {
      order: order,
      rowCfg: packRows(order, widths).map((ids) => rowCfgOf(ids, widths)),
    };
    renderReorder();
    reorderPanel.classList.add("is-open");
    reorderPanel.setAttribute("aria-hidden", "false");
    if (reorderScrim) reorderScrim.hidden = false;
  }

  function closeReorder() {
    if (!reorderPanel) return;
    reorderPanel.classList.remove("is-open");
    reorderPanel.setAttribute("aria-hidden", "true");
    if (reorderScrim) reorderScrim.hidden = true;
    draft = null;
  }

  function renderReorder() {
    if (!draft) return;
    renderWire();
    renderReorderList();
  }

  function renderWire() {
    if (!reorderWire || !draft) return;
    reorderWire.innerHTML = "";
    const rows = computeRows(draft.order, draft.rowCfg);
    draft.rowCfg = rows.map((r) => ({ cols: r.cols, split: r.split }));
    rows.forEach((row, rowIndex) => {
      const rowEl = document.createElement("div");
      rowEl.className = "wire-row";

      const head = document.createElement("div");
      head.className = "wire-row__head";
      const label = document.createElement("span");
      label.className = "wire-row__label";
      label.textContent = "Row " + (rowIndex + 1);

      // Column counter: −  N cols  +
      const counter = document.createElement("div");
      counter.className = "wire-counter";
      const ai = ALLOWED_COLS.indexOf(row.cols);
      const minus = document.createElement("button");
      minus.type = "button"; minus.className = "wire-counter__btn";
      minus.setAttribute("aria-label", "Fewer columns");
      minus.innerHTML = '<span class="material-symbols-outlined">remove</span>';
      minus.disabled = ai <= 0;
      minus.addEventListener("click", () => setRowCols(rowIndex, ALLOWED_COLS[ai - 1]));
      const val = document.createElement("span");
      val.className = "wire-counter__val";
      val.textContent = row.cols + " cols";
      const plus = document.createElement("button");
      plus.type = "button"; plus.className = "wire-counter__btn";
      plus.setAttribute("aria-label", "More columns");
      plus.innerHTML = '<span class="material-symbols-outlined">add</span>';
      plus.disabled = ai >= ALLOWED_COLS.length - 1;
      plus.addEventListener("click", () => setRowCols(rowIndex, ALLOWED_COLS[ai + 1]));
      counter.append(minus, val, plus);
      head.append(label, counter);
      rowEl.append(head);

      // Width-split toggle — only for 2-column rows.
      if (row.cols === 2) {
        const splitEl = document.createElement("div");
        splitEl.className = "wire-split";
        SPLITS.forEach((s) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "wire-split__btn" + (s === row.split ? " is-active" : "");
          b.textContent = s;
          b.addEventListener("click", () => setSplit(rowIndex, s));
          splitEl.append(b);
        });
        rowEl.append(splitEl);
      }

      const cells = document.createElement("div");
      cells.className = "wire-row__cells";
      cells.style.gridTemplateColumns = templateFor(row.cols, row.split);
      for (let c = 0; c < row.cols; c++) {
        const cell = document.createElement("div");
        cell.className = "wire-cell";
        if (row.ids[c]) {
          cell.textContent = REG_BY_ID[row.ids[c]].title;
        } else {
          cell.classList.add("wire-cell--missing");
          cell.textContent = "Missing Block";
        }
        cells.append(cell);
      }
      rowEl.append(cells);
      reorderWire.append(rowEl);
    });
  }

  function renderReorderList() {
    if (!reorderList || !draft) return;
    reorderList.innerHTML = "";
    draft.order.forEach((id, index) => reorderList.append(reorderRow(id, index)));
  }

  function reorderRow(id, index) {
    const li = document.createElement("li");
    li.className = "reorder__item";
    li.dataset.id = id;

    const grip = document.createElement("span");
    grip.className = "reorder__grip";
    grip.innerHTML = '<span class="material-symbols-outlined">drag_indicator</span>';
    grip.addEventListener("mousedown", () => { li.draggable = true; });
    grip.addEventListener("touchstart", () => { li.draggable = true; }, { passive: true });

    const name = document.createElement("span");
    name.className = "reorder__name";
    name.textContent = REG_BY_ID[id].title;

    const up = document.createElement("button");
    up.type = "button"; up.className = "reorder__arrow";
    up.innerHTML = '<span class="material-symbols-outlined">keyboard_arrow_up</span>';
    up.disabled = index === 0;
    up.addEventListener("click", () => moveItem(index, -1));

    const down = document.createElement("button");
    down.type = "button"; down.className = "reorder__arrow";
    down.innerHTML = '<span class="material-symbols-outlined">keyboard_arrow_down</span>';
    down.disabled = index === draft.order.length - 1;
    down.addEventListener("click", () => moveItem(index, 1));

    li.addEventListener("dragstart", (e) => {
      listDrag = id;
      li.classList.add("is-dragging");
      try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", id); } catch (_) {}
    });
    li.addEventListener("dragend", () => {
      li.draggable = false;
      li.classList.remove("is-dragging");
      listDrag = null;
      renderReorderList();   // refresh arrow states / indices after a drag
    });

    li.append(grip, name, up, down);
    return li;
  }

  function moveItem(index, dir) {
    const to = index + dir;
    if (!draft || to < 0 || to >= draft.order.length) return;
    const [it] = draft.order.splice(index, 1);
    draft.order.splice(to, 0, it);
    renderReorder();
  }

  function setRowCols(rowIndex, cols) {
    if (!draft || !ALLOWED_COLS.includes(cols)) return;
    const cfg = draft.rowCfg[rowIndex] || {};
    draft.rowCfg[rowIndex] = { cols: cols, split: cfg.split || DEFAULT_SPLIT };
    const rows = computeRows(draft.order, draft.rowCfg);
    draft.rowCfg = rows.map((r) => ({ cols: r.cols, split: r.split }));
    renderWire();
  }

  function setSplit(rowIndex, split) {
    if (!draft || !SPLITS.includes(split)) return;
    const cfg = draft.rowCfg[rowIndex] || {};
    draft.rowCfg[rowIndex] = { cols: cfg.cols || DEFAULT_COLS, split: split };
    const rows = computeRows(draft.order, draft.rowCfg);
    draft.rowCfg = rows.map((r) => ({ cols: r.cols, split: r.split }));
    renderWire();
  }

  function applyDraft() {
    if (!draft) return;
    // Convert the drawer's row model back into per-card widths.
    const rows = computeRows(draft.order, draft.rowCfg);
    const widthMap = {};
    rows.forEach((row) => {
      const ws = widthsForRow(row.cols, row.split);
      row.ids.forEach((id, idx) => { widthMap[id] = ws[idx] != null ? ws[idx] : DEFAULT_CSPAN; });
    });
    const byId = Object.fromEntries(state.items.map((it) => [it.id, it]));
    const active = draft.order.map((id) => byId[id]).filter(Boolean);
    active.forEach((it) => { it.cspan = widthMap[it.id] || DEFAULT_CSPAN; });
    const removed = state.items.filter((it) => it.removed);
    state.items = [...active, ...removed];
    flow();
  }

  if (reorderList) {
    reorderList.addEventListener("dragover", (e) => {
      if (listDrag == null) return;
      e.preventDefault();
      const t = e.target.closest(".reorder__item");
      const dragged = reorderList.querySelector(".reorder__item.is-dragging");
      if (!t || !dragged || t.dataset.id === listDrag) return;
      const rect = t.getBoundingClientRect();
      const after = e.clientY > rect.top + rect.height / 2;
      reorderList.insertBefore(dragged, after ? t.nextSibling : t);
      draft.order = Array.from(reorderList.children).map((li) => li.dataset.id);
      renderWire();   // live wireframe preview; list arrows refresh on drop
    });
  }

  if (reorderBtn) reorderBtn.addEventListener("click", openReorder);
  if (reorderClose) reorderClose.addEventListener("click", closeReorder);
  if (reorderScrim) reorderScrim.addEventListener("click", closeReorder);
  if (reorderCancelBtn) reorderCancelBtn.addEventListener("click", closeReorder);
  if (reorderSaveBtn) reorderSaveBtn.addEventListener("click", () => { applyDraft(); closeReorder(); });

  /* ---------- per-widget controls (drag handle, remove, resize) ---------- */
  function injectControls(el) {
    const controls = document.createElement("div");
    controls.className = "widget__controls";

    const drag = document.createElement("button");
    drag.type = "button";
    drag.className = "widget__btn widget__btn--drag";
    drag.setAttribute("aria-label", "Move widget");
    drag.innerHTML = '<span class="material-symbols-outlined">drag_indicator</span>';

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "widget__btn widget__btn--remove";
    remove.setAttribute("aria-label", "Remove widget");
    remove.innerHTML = '<span class="material-symbols-outlined">close</span>';
    remove.addEventListener("click", () => removeWidget(el.dataset.widgetId));

    controls.append(drag, remove);

    // Bottom edge → height, right edge → width. Each is independent per card.
    const resizeY = document.createElement("div");
    resizeY.className = "widget__resize widget__resize--y";
    resizeY.setAttribute("title", "Drag to change height");

    const resizeX = document.createElement("div");
    resizeX.className = "widget__resize widget__resize--x";
    resizeX.setAttribute("title", "Drag to change width");

    el.append(controls, resizeY, resizeX);

    setupDrag(el, drag);
    setupResize(el, resizeY);
    setupResizeX(el, resizeX);
  }

  /* ---------- drag to reorder (HTML5 DnD, started from the handle) ---------- */
  let dragId = null;

  function setupDrag(el, handle) {
    // Only allow dragging while the pointer is on the handle.
    handle.addEventListener("mousedown", () => { if (editing) el.draggable = true; });
    handle.addEventListener("touchstart", () => { if (editing) el.draggable = true; }, { passive: true });
    el.addEventListener("dragend", () => { el.draggable = false; });

    el.addEventListener("dragstart", (e) => {
      if (!editing) { e.preventDefault(); return; }
      dragId = el.dataset.widgetId;
      el.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", dragId); } catch (_) {}
      startAutoScroll();
    });
    el.addEventListener("dragend", () => {
      el.classList.remove("is-dragging");
      grid.querySelectorAll(".drop-before").forEach((n) => n.classList.remove("drop-before"));
      dragId = null;
      stopAutoScroll();
    });
  }

  /* ---------- auto-scroll the page while dragging near a viewport edge ----------
     Native drag fires `dragover` only while the pointer moves, so a rAF loop
     keeps scrolling while the pointer rests in the top/bottom "hot zone",
     bringing the next row into view. */
  let dragClientY = 0;
  let autoScrollRAF = null;
  const TOP_EDGE = 80;     // sticky top nav height — the effective top of the page
  const HOT_ZONE = 100;    // px from each edge that triggers scrolling
  const MAX_SPEED = 20;    // px per frame at the very edge

  function startAutoScroll() {
    if (autoScrollRAF != null) return;
    const step = () => {
      const vh = window.innerHeight;
      let dy = 0;
      if (dragClientY < TOP_EDGE + HOT_ZONE) {
        const r = Math.min(1, Math.max(0, (TOP_EDGE + HOT_ZONE - dragClientY) / HOT_ZONE));
        dy = -MAX_SPEED * r;
      } else if (dragClientY > vh - HOT_ZONE) {
        const r = Math.min(1, Math.max(0, (dragClientY - (vh - HOT_ZONE)) / HOT_ZONE));
        dy = MAX_SPEED * r;
      }
      if (dy !== 0) window.scrollBy(0, dy);
      autoScrollRAF = requestAnimationFrame(step);
    };
    autoScrollRAF = requestAnimationFrame(step);
  }

  function stopAutoScroll() {
    if (autoScrollRAF != null) { cancelAnimationFrame(autoScrollRAF); autoScrollRAF = null; }
  }

  // Track the pointer's vertical position throughout the drag (fires on the
  // document so it keeps updating even when the pointer leaves the grid).
  document.addEventListener("dragover", (e) => {
    if (!editing || dragId == null) return;
    dragClientY = e.clientY;
  });

  grid.addEventListener("dragover", (e) => {
    if (!editing || dragId == null) return;
    e.preventDefault();
    const target = e.target.closest(".widget");
    grid.querySelectorAll(".drop-before").forEach((n) => n.classList.remove("drop-before"));
    if (target && target.dataset.widgetId !== dragId) {
      const rect = target.getBoundingClientRect();
      // Decide insert-before vs insert-after in reading order (row-major):
      //   pointer above the target        → before
      //   pointer below the target        → after
      //   inside it: lower OR right half  → after, else before
      // The lower-or-right test makes dropping a card onto another reliably
      // place it at that slot (only the upper-left corner inserts before), so
      // dragging a card down onto a lower row lands it there instead of being
      // read as "before" and snapping back.
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let after;
      if (e.clientY < rect.top) after = false;
      else if (e.clientY > rect.bottom) after = true;
      else after = e.clientY > cy || e.clientX > cx;
      reorder(dragId, target.dataset.widgetId, after);
      if (!after) target.classList.add("drop-before");
    }
  });

  function reorder(fromId, toId, after) {
    const items = state.items;
    const from = items.findIndex((i) => i.id === fromId);
    if (from === -1) return;
    const [moved] = items.splice(from, 1);
    let to = items.findIndex((i) => i.id === toId);
    if (to === -1) { items.splice(from, 0, moved); return; }
    items.splice(after ? to + 1 : to, 0, moved);
    flow();   // re-place cards into their rows (recomputes per-row column starts)
  }

  /* ---------- drag the bottom edge to resize height (1–ROWS_MAX rows) ----------
     Works in PAGE coordinates and runs a rAF loop so it can auto-scroll the page
     near the viewport edges — letting you keep growing a card even when its
     bottom handle is already at the bottom of the screen. */
  function setupResize(el, handle) {
    handle.addEventListener("pointerdown", (e) => {
      if (!editing) return;
      e.preventDefault();
      try { handle.setPointerCapture(e.pointerId); } catch (_) {}
      const style = getComputedStyle(grid);
      const item = state.items.find((i) => i.id === el.dataset.widgetId);
      if (!item) return;

      const gap = parseFloat(style.rowGap) || 0;
      const rowH = parseFloat(style.gridAutoRows) || 332;
      const unit = rowH + gap;                                        // one row + one gap
      const origin = el.getBoundingClientRect().top + window.scrollY; // PAGE Y (scroll-safe)

      let pointer = e.clientY;   // latest pointer Y (viewport)
      let raf = null;
      // Cap auto-scroll growth to one row per gesture so resizing at the bottom
      // doesn't run away to max. Release and drag again to add another row.
      const growthCap = Math.min(item.rspan + 1, ROWS_MAX);

      const applySpan = () => {
        const pos = pointer + window.scrollY;   // page coord
        const rspan = clamp(Math.round((pos - origin) / unit), 1, ROWS_MAX);
        if (item.rspan !== rspan) {
          item.rspan = rspan;
          el.style.setProperty("--rspan", rspan);
        }
      };

      // Scroll when the pointer rests in the top/bottom hot zone, then recompute
      // the height so the card grows as the page scrolls. Downward auto-scroll
      // stops once the card has grown one row (growthCap).
      const loop = () => {
        const vh = window.innerHeight;
        let dy = 0;
        if (pointer > vh - HOT_ZONE && item.rspan < growthCap) {
          dy = MAX_SPEED * Math.min(1, (pointer - (vh - HOT_ZONE)) / HOT_ZONE);
        } else if (pointer < TOP_EDGE + HOT_ZONE) {
          dy = -MAX_SPEED * Math.min(1, Math.max(0, (TOP_EDGE + HOT_ZONE - pointer) / HOT_ZONE));
        }
        if (dy !== 0) window.scrollBy(0, dy);
        applySpan();
        raf = requestAnimationFrame(loop);
      };

      const onMove = (ev) => { pointer = ev.clientY; applySpan(); };

      // Temporary scroll room below the grid so a card already at the very
      // bottom can still grow (the loop scrolls into this space). Removed on up.
      const prevPad = content.style.paddingBottom;
      content.style.paddingBottom =
        (parseFloat(getComputedStyle(content).paddingBottom) + window.innerHeight) + "px";

      const onUp = () => {
        try { handle.releasePointerCapture(e.pointerId); } catch (_) {}
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
        if (raf != null) cancelAnimationFrame(raf);
        content.style.paddingBottom = prevPad;
      };
      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onUp);
      raf = requestAnimationFrame(loop);
    });
  }

  /* ---------- drag the right edge to resize width (⅓ / ½ / ⅔ / full) ----------
     Sets only this card's width; neighbours reflow (wrap) but never resize. The
     span is measured from the card's left edge to the pointer and snapped to the
     nearest valid width. A stray ½ (e.g. a half next to a third) is tidied up to
     a clean 30/70 on Save via normalizeLayout. */
  function setupResizeX(el, handle) {
    handle.addEventListener("pointerdown", (e) => {
      if (!editing) return;
      e.preventDefault();
      try { handle.setPointerCapture(e.pointerId); } catch (_) {}
      const item = state.items.find((i) => i.id === el.dataset.widgetId);
      if (!item) return;

      const style = getComputedStyle(grid);
      const gap = parseFloat(style.columnGap) || 0;
      const colW = (grid.getBoundingClientRect().width - gap * (COLS - 1)) / COLS;
      const unit = colW + gap;                        // one column + one gap
      const left = el.getBoundingClientRect().left;   // card's left edge (fixed during the gesture)

      const apply = (clientX) => {
        if (unit <= 0) return;
        const cspan = snapCspan(Math.round((clientX - left + gap) / unit));
        if (item.cspan !== cspan) {
          item.cspan = cspan;
          el.style.setProperty("--cspan", cspan);
        }
      };

      const onMove = (ev) => apply(ev.clientX);
      const onUp = () => {
        try { handle.releasePointerCapture(e.pointerId); } catch (_) {}
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
      };
      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onUp);
    });
  }

  /* ---------- util ---------- */
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
})();

/* ============================================================
   Client Relations review flow
   - "Review" on the Client relations card opens the review modal
   - Each relation: "Request a meeting" opens the draft-reply modal
   - Send reply animates → tick → marks the relation "Message Sent"
   - Complete review updates the dashboard (Todays to-do's + the block); once
     every relation is attended the block flips to a positive "done" state.
   ============================================================ */
(function clientRelationsFlow() {
  const RELATIONS = [
    {
      id: "ralph",
      header: "Ralph Yaw Tutu · Recovery of Secured Charge · A1445/179",
      chip: "Declining tone",
      confidence: "81%",
      from: "Ralph Yaw Tutu · A1445/179",
      ago: "6 days ago",
      short: "“I'm still waiting to hear back.”",
      quote: "“I'm still waiting to hear back from you on this. This is the second time I've had to chase and it's becoming very frustrating — I expected better communication given how long this has been going on.”",
      tone: "Negative",
      flags: [
        "Repeated chasing language — “the second time I've had to chase”",
        "Explicit frustration — “becoming very frustrating”",
        "Negative comparison to expectations — “expected better communication”",
        "Tone has worsened steadily across the last three messages",
      ],
      reply: {
        meta: "Ralph Yaw Tutu · Recovery of Secured Charge · A1445/179",
        to: "Ralph Yaw Tutu",
        subject: "RE: Recovery of Secured Charge — A1445/179",
        body: [
          "Hi Ralph,",
          "Thanks for your patience on this, and I'm sorry you've had to chase. I've now had it confirmed and can update you properly: the secured charge has been registered and we're clear to move to the next step.",
          "I'll send the updated paperwork across today, and from here I'll keep you posted at each stage so nothing goes quiet on you again.",
          "Do let me know if you'd like a quick call to run through it.",
        ],
      },
      status: null,
    },
    {
      id: "david",
      header: "David Pellow · Patricia Fenby · F4801/1",
      chip: "Declining tone",
      confidence: "76%",
      from: "David Pellow · F4801/1",
      ago: "6 days ago",
      short: "Concern about cost and timescales raised twice this week.",
      quote: "“This is the second time this week I've had to raise it — I need clarity on the costs and how long this is going to drag on.”",
      tone: "Negative",
      flags: [
        "Raised twice in one week — not a one-off.",
        "No resolution logged between mentions.",
        "Combines cost and time — the two most sensitive client concerns.",
        "Tone shifted from question to pointed request.",
        "Unaddressed cost/time worries often precede complaints.",
      ],
      reply: {
        meta: "David Pellow · Patricia Fenby · F4801/1",
        to: "David Pellow",
        subject: "RE: Patricia Fenby — F4801/1",
        body: [
          "Hi David,",
          "Thanks for raising this, and apologies it's felt slow. To give you the clarity you asked for, I'll send a short written summary of the current costs and the expected timescales today so everything is in one place.",
          "I'll also check in proactively at each milestone rather than leaving you to follow up — we're aiming to have the next stage wrapped up shortly and I'll confirm firm dates in that summary.",
          "Happy to jump on a call if that would be easier.",
        ],
      },
      status: null,
    },
    {
      id: "helena",
      header: "Helena Voss · Sale of The Old Dairy · K3120/4",
      chip: "Declining tone",
      confidence: "72%",
      from: "Helena Voss · K3120/4",
      ago: "4 days ago",
      short: "“I feel like I'm always the one making contact.”",
      quote: "“I feel like I'm always the one making contact here. It would be reassuring to hear from you occasionally without having to ask — this is a big decision for me and the silence is unsettling.”",
      tone: "Negative",
      flags: [
        "Client is initiating all contact — “always the one making contact”",
        "Expresses unease — “the silence is unsettling”",
        "High emotional stake — “a big decision for me”",
        "Signals a desire for proactive updates, not just responses",
      ],
      reply: {
        meta: "Helena Voss · Sale of The Old Dairy · K3120/4",
        to: "Helena Voss",
        subject: "RE: Sale of The Old Dairy — K3120/4",
        body: [
          "Hi Helena,",
          "You're absolutely right, and I'm sorry the updates have been one-sided. This matters to you and you shouldn't have to chase to feel informed.",
          "From here I'll send you a short progress note every Friday, even when there's little to report, so you always know where things stand. And of course do reach out any time in between.",
        ],
      },
      status: null,
    },
    {
      id: "marcus-b",
      header: "Marcus Bailey · Boundary Dispute, 8 Weir Lane · L6644/2",
      chip: "Rising frustration",
      confidence: "84%",
      from: "Marcus Bailey · L6644/2",
      ago: "9 days ago",
      short: "“Every letter seems to cost me money and get us nowhere.”",
      quote: "“Every letter seems to cost me money and get us nowhere. I need to understand what the actual plan is here, because right now it feels open-ended and expensive.”",
      tone: "Negative",
      flags: [
        "Direct link between cost and lack of progress — “cost me money and get us nowhere”",
        "Perceives no strategy — “what the actual plan is”",
        "Fears an open-ended matter — “open-ended and expensive”",
        "Frustration has built over successive items of correspondence",
      ],
      reply: {
        meta: "Marcus Bailey · Boundary Dispute, 8 Weir Lane · L6644/2",
        to: "Marcus Bailey",
        subject: "RE: Boundary Dispute, 8 Weir Lane — L6644/2",
        body: [
          "Hi Marcus,",
          "That's a fair challenge and I want to give you a clear answer. I'll set out a short, staged plan today with an estimated cost against each stage, so you can see exactly where this is heading and decide how far you want to take it.",
          "My recommendation will be to push for a negotiated boundary agreement rather than continued correspondence, which should bring both the cost and the timescale down.",
        ],
      },
      status: null,
    },
    {
      id: "yusuf",
      header: "Yusuf Rahman · Purchase of 44 Cobbler's Yard · M8890/7",
      chip: "Declining tone",
      confidence: "69%",
      from: "Yusuf Rahman · M8890/7",
      ago: "5 days ago",
      short: "“I was expecting this to be finished by now.”",
      quote: "“I was expecting this to be finished by now. I've booked removals and I'm starting to worry I've committed to dates that aren't going to hold.”",
      tone: "Negative",
      flags: [
        "Expectation gap — “expecting this to be finished by now”",
        "Real-world consequence — removals already booked",
        "Growing anxiety about firm commitments — “dates that aren't going to hold”",
        "Client planning ahead of confirmed milestones",
      ],
      reply: {
        meta: "Yusuf Rahman · Purchase of 44 Cobbler's Yard · M8890/7",
        to: "Yusuf Rahman",
        subject: "RE: Purchase of 44 Cobbler's Yard — M8890/7",
        body: [
          "Hi Yusuf,",
          "Thanks for being open about the removals booking — that's exactly the sort of thing I'd rather know about early. We're close: only the final mortgage funds and the search indemnity remain outstanding.",
          "I'll give you a realistic target completion date today so you can confirm or adjust your removals with confidence, and I'll flag immediately if anything threatens it.",
        ],
      },
      status: null,
    },
  ];

  const POSITIVE = {
    chip: "Positive tone",
    confidence: "94%",
    from: "Marcus Reeve · T2210/3",
    ago: "Today",
    quote: "“Really appreciate how proactive you've been on this — thank you, it's made a real difference.”",
  };

  const relScrim    = document.getElementById("relScrim");
  const relBody     = document.getElementById("relBody");
  const relStatus   = document.getElementById("relStatus");
  const relClose    = document.getElementById("relClose");
  const relCloseBtn = document.getElementById("relCloseBtn");
  const replyScrim  = document.getElementById("replyScrim");
  const replyBody   = document.getElementById("replyBody");
  const replyClose  = document.getElementById("replyClose");
  const replyCancel = document.getElementById("replyCancel");
  const replySend   = document.getElementById("replySend");
  if (!relScrim || !replyScrim) return;

  let expandedId = null;
  let activeReplyId = null;
  // When opened from a single relation card, the modal shows only that one.
  let focusId = null;
  function shownRelations() { return focusId ? RELATIONS.filter((r) => r.id === focusId) : RELATIONS; }

  const esc = (s) => String(s);

  /* ---------- dashboard block ---------- */
  function relPreview(rel) {
    return (
      '<div class="relation block-item" data-open-rel="' + rel.id + '">' +
        '<div class="bubble bubble--error">' +
          '<p class="bubble__quote">' + rel.short + '</p>' +
          '<div class="bubble__meta"><span>From: ' + rel.from + '</span><span>' + rel.ago + '</span></div>' +
        '</div>' +
        '<div class="relation__chips">' +
          '<span class="chip"><span class="material-symbols-outlined">cognition</span>' + rel.chip + '</span>' +
          '<span class="confidence">Confidence <b>' + rel.confidence + '</b></span>' +
        '</div>' +
      '</div>'
    );
  }
  function positivePreview() {
    return (
      '<div class="relation">' +
        '<div class="bubble bubble--ok">' +
          '<p class="bubble__quote">' + POSITIVE.quote + '</p>' +
          '<div class="bubble__meta"><span>From: ' + POSITIVE.from + '</span><span>' + POSITIVE.ago + '</span></div>' +
        '</div>' +
        '<div class="relation__chips">' +
          '<span class="chip chip--ok"><span class="material-symbols-outlined">cognition</span>' + POSITIVE.chip + '</span>' +
          '<span class="confidence">Confidence <b>' + POSITIVE.confidence + '</b></span>' +
        '</div>' +
      '</div>'
    );
  }
  function renderBlock() {
    const card = document.querySelector(".card--relations");
    if (!card) return;
    const remaining = RELATIONS.filter((r) => !r.status);
    const countEl = card.querySelector(".w-count");
    const scroll = card.querySelector(".relations__scroll");
    const foot = card.querySelector(".w-foot");
    if (countEl) countEl.textContent = remaining.length;
    if (!scroll) return;
    if (remaining.length === 0) {
      scroll.innerHTML =
        '<p class="relations__done">Great job — your feedback is already paying off.</p>' + positivePreview();
      if (foot) foot.style.display = "none";
    } else {
      scroll.innerHTML = remaining.map(relPreview).join("");
      if (foot) {
        foot.style.display = "";
        foot.innerHTML =
          '<span class="mya-chip"><span class="material-symbols-outlined">cognition</span>Reviewed - please confirm</span>' +
          '<button class="btn-tonal" type="button" data-action="open-relations">Review</button>';
      }
    }
  }

  /* ---------- review modal (accordion) ---------- */
  function statusText(s) { return s === "message" ? "Message Sent" : (s === "meeting" ? "Meeting Requested" : ""); }

  // Every item renders its panel/body up-front (kept in the DOM) so expand /
  // collapse can animate via CSS; only the `is-open` class changes at runtime.
  function accItem(rel) {
    const solo = !!focusId;
    const open = solo || expandedId === rel.id;
    const parts = rel.header.split(" · ");
    const ref = parts.pop();
    const titleHtml = '<span class="acc-head__stack"><span class="acc-head__title">' + parts.join(" - ") + '</span>' +
      '<span class="acc-head__meta">Relating to ' + ref + '</span></span>';
    // Single-item mode: static header (no toggle/chevron), body always shown.
    const head = solo
      ? '<div class="acc-head acc-head--static">' + titleHtml + '</div>'
      : '<button class="acc-head" type="button" data-act="toggle" data-rel="' + rel.id + '">' +
          titleHtml +
          '<span class="acc-status"' + (rel.status ? "" : " hidden") + '>' + statusText(rel.status) + '</span>' +
          '<span class="acc-head__chev"><span class="material-symbols-outlined">keyboard_arrow_down</span></span>' +
        '</button>';
    return (
      '<div class="acc-item' + (open ? " is-open" : "") + (solo ? " acc-item--solo" : "") + '" data-rel="' + rel.id + '">' +
        head +
        '<div class="acc-panel"><div class="acc-body">' +
          '<p class="acc-label">What the client said</p>' +
          '<p class="acc-quote">' + rel.quote + '</p>' +
          '<p class="acc-label">Overall Tone</p>' +
          '<span class="tone-pill">' + rel.tone + '</span>' +
          '<p class="acc-label">Why this was flagged</p>' +
          '<ul class="flags">' + rel.flags.map((f) => '<li class="flag">' + f + '</li>').join("") + '</ul>' +
          '<div class="acc-actions"' + (rel.status ? " hidden" : "") + '>' +
            '<button class="btn-tonal" type="button" data-act="message" data-rel="' + rel.id + '">Send a message</button>' +
          '</div>' +
        '</div></div>' +
      '</div>'
    );
  }

  function renderAccordion() {
    relBody.innerHTML = '<div class="acc">' + shownRelations().map(accItem).join("") + '</div>';
    // Set initial panel heights without animating (fresh nodes don't transition).
    relBody.querySelectorAll(".acc-item").forEach((it) => {
      const panel = it.querySelector(".acc-panel");
      if (panel) panel.style.height = it.classList.contains("is-open") ? "auto" : "0px";
    });
  }

  // Lock the body's height to its tallest open state so collapsing every item
  // doesn't shrink the modal — but never taller than the space left after the
  // header + footer, so the footer always stays in view (the body scrolls for
  // very tall content instead).
  function lockHeight() {
    relBody.style.minHeight = "";
    let headers = 0, maxBody = 0;
    relBody.querySelectorAll(".acc-item").forEach((it) => {
      const head = it.querySelector(".acc-head");
      const body = it.querySelector(".acc-body");
      if (head) headers += head.offsetHeight;
      if (body) maxBody = Math.max(maxBody, body.scrollHeight);
    });
    const modalEl = relBody.closest(".modal");
    const chrome = modalEl ? (modalEl.offsetHeight - modalEl.querySelector(".modal__body").clientHeight) : 0;
    const avail = window.innerHeight - 48 - chrome - 8;   // room left for the body; keeps it a scroll container
    const want = headers + maxBody + 4;
    if (want > 0) relBody.style.minHeight = Math.max(0, Math.min(want, avail)) + "px";
  }

  // Change which item is open — animates each panel's height explicitly so a
  // collapsed panel is always exactly 0.
  function setExpanded(id) {
    expandedId = id;
    relBody.querySelectorAll(".acc-item").forEach((it) => {
      const panel = it.querySelector(".acc-panel");
      const shouldOpen = it.dataset.rel === id;
      const isOpen = it.classList.contains("is-open");
      if (shouldOpen === isOpen) return;
      it.classList.toggle("is-open", shouldOpen);
      if (!panel) return;
      if (shouldOpen) {
        panel.style.height = panel.scrollHeight + "px";     // 0 → content
        clearTimeout(panel._t);
        panel._t = setTimeout(() => { panel.style.height = "auto"; }, 320);
      } else {
        if (panel.style.height === "auto" || panel.style.height === "") {
          panel.style.height = panel.scrollHeight + "px";   // auto → px, then reflow
          void panel.offsetHeight;
        }
        clearTimeout(panel._t);
        panel.style.height = "0px";                          // → 0
      }
    });
  }

  function firstUnattended() {
    const r = shownRelations().find((x) => !x.status);
    return r ? r.id : null;
  }
  function setRelStatus(text) {
    if (!relStatus) return;
    if (text) { relStatus.textContent = text; relStatus.hidden = false; } else { relStatus.hidden = true; }
  }
  function setStatus(id, status) {
    const rel = RELATIONS.find((r) => r.id === id);
    if (rel) rel.status = status;
    const item = relBody.querySelector('.acc-item[data-rel="' + id + '"]');
    if (item) { const actions = item.querySelector(".acc-actions"); if (actions) actions.hidden = true; }
    if (focusId) {
      // Single-item mode: keep the content open (no collapse/cascade); the
      // status goes in the modal header instead of on the item row.
      setRelStatus(statusText(status));
    } else {
      // Update the item's own pill and cascade to the next un-attended item.
      if (item) { const pill = item.querySelector(".acc-status"); if (pill) { pill.textContent = statusText(status); pill.hidden = false; } }
      setExpanded(firstUnattended());
    }
  }

  function openRelations(id) {
    focusId = id || null;      // a single relation, or all
    expandedId = id || null;   // focused relation opens expanded; otherwise all collapsed
    renderAccordion();
    const rel = focusId ? RELATIONS.find((r) => r.id === focusId) : null;
    setRelStatus(rel && rel.status ? statusText(rel.status) : "");
    relScrim.hidden = false;
    requestAnimationFrame(lockHeight);
  }
  // Closing is the completion action now (the explicit "Mark as reviewed"
  // button was removed): re-sync the block and to-do count on any close path.
  function closeRelations() {
    const attended = RELATIONS.filter((r) => r.status).length;
    renderBlock();
    updateTodos(attended);
    relScrim.hidden = true;
  }

  /* ---------- Todays to-do's ---------- */
  function updateTodos(attended) {
    DASH_TODO.update("relations", attended);
  }

  /* ---------- draft reply modal ---------- */
  function escHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function escAttr(s) { return escHtml(s).replace(/"/g, "&quot;"); }

  function renderReply(rel) {
    // To / Subject / message are editable — the user can amend Mya's draft.
    replyBody.innerHTML =
      '<div class="reply">' +
        '<div class="reply-block">' +
          '<p class="reply-label">What the client said</p>' +
          '<div class="reply-said">' +
            '<p class="reply-said__meta">' + rel.reply.meta + '</p>' +
            '<p class="reply-said__quote">' + rel.quote + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="reply-block">' +
          '<div class="reply-compose-head">' +
            '<p class="reply-label">What you could say</p>' +
            '<span class="mya-chip"><span class="material-symbols-outlined">cognition</span>Created by Mya</span>' +
          '</div>' +
          '<div class="email">' +
            '<label class="email__row"><span class="email__label">To:</span>' +
              '<input class="email__input" type="text" id="replyTo" value="' + escAttr(rel.reply.to) + '" /></label>' +
            '<label class="email__row"><span class="email__label">Subject:</span>' +
              '<input class="email__input" type="text" id="replySubject" value="' + escAttr(rel.reply.subject) + '" /></label>' +
            '<textarea class="email__textarea" id="replyMessage" rows="8">' + escHtml(rel.reply.body.join("\n\n")) + '</textarea>' +
          '</div>' +
        '</div>' +
      '</div>';
  }
  function resetSendBtn() {
    replySend.disabled = false;
    replySend.classList.remove("is-done");
    replySend.textContent = "Send reply";
  }
  function openReply(id) {
    const rel = RELATIONS.find((r) => r.id === id);
    if (!rel) return;
    activeReplyId = id;
    renderReply(rel);
    resetSendBtn();
    replyScrim.hidden = false;   // stacks on top of the review modal
  }
  // Save the user's edits back onto the relation so they persist if reopened.
  function captureReplyEdits() {
    const rel = RELATIONS.find((r) => r.id === activeReplyId);
    if (!rel) return;
    const to = document.getElementById("replyTo");
    const subject = document.getElementById("replySubject");
    const message = document.getElementById("replyMessage");
    if (to) rel.reply.to = to.value;
    if (subject) rel.reply.subject = subject.value;
    if (message) rel.reply.body = message.value.split(/\n{2,}/);
  }
  function closeReply() { captureReplyEdits(); replyScrim.hidden = true; activeReplyId = null; }

  function sendReply() {
    if (!activeReplyId || replySend.disabled) return;
    captureReplyEdits();
    const id = activeReplyId;
    replySend.disabled = true;
    replySend.innerHTML = '<span class="spinner"></span>';
    setTimeout(function () {
      replySend.classList.add("is-done");
      replySend.innerHTML = '<span class="material-symbols-outlined">check</span>';
      setTimeout(function () {
        closeReply();
        setStatus(id, "message");   // back on the review modal, now "Message Sent"
        resetSendBtn();
      }, 650);
    }, 1000);
  }

  /* ---------- wiring ---------- */
  document.addEventListener("click", function (e) {
    const opener = e.target.closest('[data-action="open-relations"]');
    if (opener) { e.preventDefault(); openRelations(); return; }
    // Clicking an individual relation card opens the modal focused on just it.
    const item = e.target.closest('[data-open-rel]');
    if (item) { e.preventDefault(); openRelations(item.getAttribute("data-open-rel")); }
  });

  relBody.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.getAttribute("data-act");
    const id = btn.getAttribute("data-rel");
    if (act === "toggle") { setExpanded(expandedId === id ? null : id); }
    else if (act === "message") { openReply(id); }
  });

  // thumbs rating (toggle highlight only)
  document.querySelectorAll(".rate__icons").forEach(function (grp) {
    grp.addEventListener("click", function (e) {
      const b = e.target.closest(".rate__btn");
      if (!b) return;
      grp.querySelectorAll(".rate__btn").forEach((x) => x.classList.remove("is-active"));
      b.classList.add("is-active");
    });
  });

  relClose.addEventListener("click", closeRelations);
  relCloseBtn.addEventListener("click", closeRelations);
  relScrim.addEventListener("click", function (e) { if (e.target === relScrim) closeRelations(); });

  replyClose.addEventListener("click", closeReply);
  replyCancel.addEventListener("click", closeReply);
  replySend.addEventListener("click", sendReply);
  replyScrim.addEventListener("click", function (e) { if (e.target === replyScrim) closeReply(); });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!replyScrim.hidden) closeReply();
    else if (!relScrim.hidden) closeRelations();
  });

  renderBlock();
})();

/* ============================================================
   Shared: Today's to-do's completion + a reusable review-modal factory
   ============================================================ */
const DASH_TODO = {
  // Initial per-category counts — each matches its card's count (number of
  // items). AML has 2 checks outstanding; the 3 missing parts show in the meta.
  totals: { replies: 9, relations: 5, matters: 7, aml: 6, searches: 4 },
  attended: { replies: 0, relations: 0, matters: 0, aml: 0, searches: 0 },
  sum(obj) { let n = 0; for (const k in obj) n += obj[k]; return n; },
  // Record how many of a category the user has handled, then refresh the block.
  update(key, attended) {
    this.attended[key] = attended;
    this.setRow(key, Math.max(0, this.totals[key] - attended));
    this.refresh();
  },
  refresh() {
    const todos = document.querySelector(".card--todos");
    if (!todos) return;
    const total = this.sum(this.totals);
    const done = this.sum(this.attended);
    const wc = todos.querySelector(".w-count");
    if (wc) wc.textContent = done + " of " + total + " complete";
    const fill = todos.querySelector(".card__scroll .progress-track .progress-fill, .progress-track .progress-fill");
    if (fill) fill.style.width = (total ? Math.min(100, Math.round((done / total) * 100)) : 0) + "%";
    this.updateMyaNote();
    // Empty-list "all caught up" note.
    const list = todos.querySelector(".todo-list");
    if (list && !list.querySelector(".todo-row") && !list.querySelector(".todo-done")) {
      const li = document.createElement("li");
      li.className = "todo-done";
      li.textContent = "You’re all caught up — nice work.";
      list.appendChild(li);
    }
  },
  setRow(key, remaining) {
    const todos = document.querySelector(".card--todos");
    if (!todos) return;
    const row = todos.querySelector('[data-todo="' + key + '"]');
    if (!row) return;
    if (remaining <= 0) row.remove();
    else { const n = row.querySelector(".todo-n"); if (n) n.textContent = remaining; }
  },
  // Mya's banner note mirrors the to-do list: it names each outstanding
  // category and the total, and re-writes itself whenever a to-do is done.
  noteOrder: ["replies", "relations", "matters", "aml", "searches"],
  noteLabel: {
    replies: (n) => (n === 1 ? "a reply to send" : n + " replies to send"),
    relations: (n) => (n === 1 ? "a relationship to nurture" : n + " relationships to nurture"),
    matters: (n) => (n === 1 ? "a matter ready to close" : n + " matters ready to close"),
    aml: (n) => (n === 1 ? "an AML check to complete" : n + " AML checks to complete"),
    searches: (n) => (n === 1 ? "a search to follow up" : n + " searches to follow up"),
  },
  updateMyaNote() {
    const body = document.querySelector(".mya-note__body");
    if (!body) return;
    const parts = [];
    let total = 0;
    for (const k of this.noteOrder) {
      const rem = Math.max(0, this.totals[k] - this.attended[k]);
      if (rem > 0) { parts.push(this.noteLabel[k](rem)); total += rem; }
    }
    if (!total) {
      body.textContent = "You’re all caught up — every to-do on your list is done. Great work!";
      return;
    }
    const list = parts.length === 1
      ? parts[0]
      : parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1];
    const things = total === 1 ? "is just 1 thing" : "are " + total + " things";
    body.textContent =
      "Nice work! Your 34 active matters are in good shape. There " + things +
      " worth your attention: " + list + ".";
  },
};
// Reflect the real starting totals on load (replaces the mock "1 of 13").
DASH_TODO.refresh();

function escH(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function escA(s) { return escH(s).replace(/"/g, "&quot;"); }

/* Builds an accordion "review" modal. Shell, expand/collapse animation, status
   pills, height-lock and footer are shared; per-flow content and actions come
   from the config callbacks. */
function createReviewModal(cfg) {
  const scrim = document.createElement("div");
  scrim.className = "modal-scrim";
  scrim.hidden = true;
  scrim.innerHTML =
    '<div class="modal modal--review" role="dialog" aria-modal="true">' +
      '<div class="modal__head' + (cfg.subtitle ? " modal__head--stack" : "") + '">' +
        '<div class="modal__titles"><h2 class="modal__title">' + cfg.title + '</h2>' +
          (cfg.subtitle ? '<p class="modal__subtitle">' + cfg.subtitle + '</p>' : "") + '</div>' +
        (cfg.headNote ? '<span class="mya-chip mya-chip--head"><span class="material-symbols-outlined">cognition</span>' + cfg.headNote + '</span>' : "") +
        '<span class="modal__status acc-status" hidden></span>' +
        '<button class="modal__close" type="button" aria-label="Close"><span class="material-symbols-outlined">close</span></button>' +
      '</div>' +
      (cfg.intro ? '<div class="modal__intro">' + cfg.intro + '</div>' : "") +
      '<div class="modal__body"></div>' +
      '<footer class="modal__foot">' +
        '<div class="rate"><span class="rate__icons">' +
          '<button class="rate__btn" type="button" aria-label="Rate down"><span class="material-symbols-outlined">thumb_down</span></button>' +
          '<button class="rate__btn" type="button" aria-label="Rate up"><span class="material-symbols-outlined">thumb_up</span></button>' +
        '</span><span class="rate__text">How accurate was Mya?<br>Rate our assessment, improve the Ai</span></div>' +
        '<div class="modal__actions">' +
          '<button class="btn-outline" type="button" data-mact="secondary">' + cfg.secondaryLabel + '</button>' +
          (cfg.primaryLabel ? '<button class="btn-filled" type="button" data-mact="primary">' + cfg.primaryLabel + '</button>' : "") +
        '</div>' +
      '</footer>' +
    '</div>';
  document.body.appendChild(scrim);

  const body = scrim.querySelector(".modal__body");
  const primaryBtn = scrim.querySelector('[data-mact="primary"]');
  let expandedId = null;
  // When opened from a single item card, the modal shows only that item.
  let focusId = null;
  function shownItems() { return focusId ? cfg.items.filter((i) => i.id === focusId) : cfg.items; }

  // Header "aside" = the pill on the right (a post-action status by default, or a
  // custom pill such as AML's progress % via cfg.renderAside).
  function asideHtml(item) {
    if (cfg.renderAside) return cfg.renderAside(item);
    if (focusId) return "";   // solo mode surfaces the action status in the modal title
    return item.status ? '<span class="acc-status">' + cfg.statusText(item.status) + "</span>" : "";
  }
  function accItem(item) {
    const open = expandedId === item.id;
    return (
      '<div class="acc-item' + (open ? " is-open" : "") + '" data-rel="' + item.id + '">' +
        '<button class="acc-head" type="button" data-act="toggle" data-rel="' + item.id + '">' +
          '<span class="acc-head__main">' + cfg.renderHeadMain(item) + '</span>' +
          '<span class="acc-head__right">' +
            '<span class="acc-head__aside">' + asideHtml(item) + '</span>' +
            '<span class="acc-head__chev"><span class="material-symbols-outlined">keyboard_arrow_down</span></span>' +
          '</span>' +
        '</button>' +
        '<div class="acc-panel"><div class="acc-body">' + cfg.renderBody(item) + '</div></div>' +
      '</div>'
    );
  }
  // In single-item (focus) mode there's nothing to collapse into, so the header
  // is static — no toggle button, no chevron — and the body shows outright.
  function soloItem(item) {
    return (
      '<div class="acc-item acc-item--solo is-open" data-rel="' + item.id + '">' +
        '<div class="acc-head acc-head--static">' +
          '<span class="acc-head__main">' + cfg.renderHeadMain(item) + '</span>' +
          '<span class="acc-head__right"><span class="acc-head__aside">' + asideHtml(item) + '</span></span>' +
        '</div>' +
        '<div class="acc-panel"><div class="acc-body">' + cfg.renderBody(item) + '</div></div>' +
      '</div>'
    );
  }
  function updatePrimary() {
    if (primaryBtn && cfg.primaryDoneLabel) {
      primaryBtn.textContent = cfg.items.some((i) => i.status) ? cfg.primaryDoneLabel : cfg.primaryLabel;
    }
  }
  function render() {
    const renderItem = focusId ? soloItem : accItem;
    body.innerHTML = '<div class="acc' + (focusId ? " acc--solo" : "") + '">' + shownItems().map(renderItem).join("") + '</div>';
    body.querySelectorAll(".acc-item").forEach((it) => {
      const p = it.querySelector(".acc-panel");
      if (p) p.style.height = it.classList.contains("is-open") ? "auto" : "0px";
    });
    // A focused item that's already been actioned reopens with its buttons hidden.
    if (focusId) {
      const it = cfg.items.find((i) => i.id === focusId);
      if (it && it.status) body.querySelectorAll(".acc-actions").forEach((a) => (a.hidden = true));
    }
    updatePrimary();
  }
  function lockHeight() {
    body.style.minHeight = "";
    let headers = 0, maxBody = 0;
    body.querySelectorAll(".acc-item").forEach((it) => {
      const h = it.querySelector(".acc-head"); const b = it.querySelector(".acc-body");
      if (h) headers += h.offsetHeight;
      if (b) maxBody = Math.max(maxBody, b.scrollHeight);
    });
    const modalEl = body.closest(".modal");
    const chrome = modalEl ? (modalEl.offsetHeight - body.clientHeight) : 0;   // header + intro + footer
    const avail = window.innerHeight - 48 - chrome - 8;   // room left for the body; keeps it a scroll container
    const want = headers + maxBody + 4;
    if (want > 0) body.style.minHeight = Math.max(0, Math.min(want, avail)) + "px";
  }
  function setExpanded(id) {
    expandedId = id;
    body.querySelectorAll(".acc-item").forEach((it) => {
      const panel = it.querySelector(".acc-panel");
      const shouldOpen = it.dataset.rel === id;
      if (shouldOpen === it.classList.contains("is-open")) return;
      it.classList.toggle("is-open", shouldOpen);
      if (!panel) return;
      if (shouldOpen) {
        panel.style.height = panel.scrollHeight + "px";
        clearTimeout(panel._t); panel._t = setTimeout(() => { panel.style.height = "auto"; }, 320);
      } else {
        if (panel.style.height === "auto" || panel.style.height === "") { panel.style.height = panel.scrollHeight + "px"; void panel.offsetHeight; }
        clearTimeout(panel._t); panel.style.height = "0px";
      }
    });
  }
  function firstUnattended() { const i = shownItems().find((x) => !x.status); return i ? i.id : null; }
  function setHeadStatus(text) {
    const el = scrim.querySelector(".modal__status");
    if (!el) return;
    if (text) { el.textContent = text; el.hidden = false; } else { el.hidden = true; }
  }
  function setStatus(id, status) {
    const item = cfg.items.find((i) => i.id === id);
    if (item) item.status = status;
    const dom = body.querySelector('.acc-item[data-rel="' + id + '"]');
    if (dom) dom.querySelectorAll(".acc-actions").forEach((a) => (a.hidden = true));
    if (focusId) {
      // Single-item mode: keep the content open (no collapse/cascade); the
      // status goes in the modal header instead of on the item row.
      setHeadStatus(cfg.statusText(status));
    } else {
      if (dom) { const aside = dom.querySelector(".acc-head__aside"); if (aside) aside.innerHTML = asideHtml(item); }
      setExpanded(firstUnattended());
    }
    updatePrimary();
  }
  function open(id) {
    focusId = id || null;      // a single item, or all
    expandedId = id || null;   // focused item opens expanded; otherwise all collapsed
    render();
    const it = focusId ? cfg.items.find((i) => i.id === focusId) : null;
    setHeadStatus(it && it.status ? cfg.statusText(it.status) : "");
    scrim.hidden = false;
    requestAnimationFrame(lockHeight);
  }
  // completeOnClose runs on every close path (Close button, X, scrim, Escape).
  function close() {
    if (cfg.completeOnClose && cfg.onComplete) cfg.onComplete();
    scrim.hidden = true;
  }
  // Re-render the open modal in place (after an item's data/state changes).
  function rerender() { render(); requestAnimationFrame(lockHeight); }

  const api = { open, close, setStatus, setExpanded, rerender };

  body.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.getAttribute("data-act");
    if (act === "check-toggle") { toggleCheck(btn.closest(".check-item")); return; }   // nested checklist accordion
    if (act === "sd-toggle") { toggleCheck(btn.closest(".sd-card")); return; }         // search-details / certificate card
    const itemEl = btn.closest(".acc-item");
    const id = itemEl && itemEl.dataset.rel;
    if (act === "toggle") { setExpanded(expandedId === id ? null : id); }
    else { const item = cfg.items.find((i) => i.id === id); if (item && cfg.onAction) cfg.onAction(item, act, api, btn); }
  });
  scrim.querySelector(".modal__close").addEventListener("click", close);
  scrim.querySelector('[data-mact="secondary"]').addEventListener("click", close);
  if (primaryBtn) primaryBtn.addEventListener("click", () => { if (cfg.onComplete) cfg.onComplete(); close(); });
  scrim.addEventListener("click", (e) => { if (e.target === scrim) close(); });
  scrim.querySelectorAll(".rate__icons").forEach((grp) => grp.addEventListener("click", (e) => {
    const b = e.target.closest(".rate__btn"); if (!b) return;
    grp.querySelectorAll(".rate__btn").forEach((x) => x.classList.remove("is-active")); b.classList.add("is-active");
  }));
  document.addEventListener("click", (e) => {
    if (e.target.closest('[data-action="' + cfg.trigger + '"]')) { e.preventDefault(); open(); return; }
    // Clicking an individual item card opens the modal focused on just that item.
    const item = e.target.closest('[data-open="' + cfg.trigger + '"]');
    if (item) { e.preventDefault(); open(item.getAttribute("data-item-id")); }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !scrim.hidden) close(); });

  return api;
}

/* Expand / collapse a checklist row's nested panel (animated). */
function toggleCheck(item) {
  if (!item) return;
  const panel = item.querySelector(".check-panel, .sd-panel");
  const opening = !item.classList.contains("is-open");
  item.classList.toggle("is-open", opening);
  if (!panel) return;
  if (opening) {
    panel.style.height = panel.scrollHeight + "px";
    clearTimeout(panel._t); panel._t = setTimeout(() => { panel.style.height = "auto"; }, 280);
  } else {
    if (panel.style.height === "auto" || panel.style.height === "") { panel.style.height = panel.scrollHeight + "px"; void panel.offsetHeight; }
    clearTimeout(panel._t); panel.style.height = "0px";
  }
}

/* Animate a tonal action button: spinner → tick → callback. */
function animateSend(btn, tonal, cb) {
  if (btn.disabled) return;
  btn.disabled = true;
  btn.style.width = btn.offsetWidth + "px";
  btn.innerHTML = '<span class="spinner' + (tonal ? " spinner--tonal" : "") + '"></span>';
  setTimeout(() => {
    btn.innerHTML = '<span class="material-symbols-outlined">check</span>';
    setTimeout(() => { btn.style.width = ""; cb(); }, 600);
  }, 900);
}

/* ---------- Replies to send: review modal ---------- */
// Set by repliesReviewFlow; lets Mya's search-anomaly messages queue here too.
let addSuggestedReplies = null;
(function repliesReviewFlow() {
  const REPLIES = [
    {
      id: "reply-ralph",
      header: "Ralph Yaw Tutu · Recovery of Secured Charge · A1445/179",
      blockMeta: "To: Ralph Yaw Tutu · A1445/179",
      ago: "3 days ago",
      quote: "“What are the next steps now the charge has been registered?”",
      reply: {
        to: "Ralph Yaw Tutu",
        subject: "RE: Recovery of Secured Charge — A1445/179",
        body: [
          "Hi Ralph,",
          "Thanks for your patience on this. Now the charge has been registered we're clear to move to the next step, and I'll send the updated paperwork across to you today.",
          "From here I'll keep you posted at each stage so nothing goes quiet on you again. Do let me know if you'd like a quick call to run through it.",
        ],
      },
      status: null,
    },
    {
      id: "reply-hannah",
      header: "Hannah Whitmore · Reversionary Lease — Hannah House · A1662/42",
      blockMeta: "To: Hannah Whitmore - A1662/42",
      ago: "6 days ago",
      quote: "“Can you confirm the freeholder has agreed the revised premium before Friday?”",
      reply: {
        to: "Hannah Whitmore",
        subject: "RE: Revised premium — Reversionary Lease, Hannah House",
        body: [
          "Hi Hannah,",
          "Thanks for chasing this. I spoke with the freeholder's agent yesterday afternoon and can confirm the revised premium of £14,250 has now been agreed in principle. They've asked for written confirmation of the figure, which I'll send across today, and I'd expect their formal acknowledgement back well before Friday.",
          "I'll forward you a copy of the agreed heads of terms as soon as it lands so you have everything on file. Once that's in place, we can move straight on to drafting the lease extension.",
          "Do let me know if you have any questions in the meantime.",
        ],
      },
      status: null,
    },
    {
      id: "reply-priya",
      header: "Priya Nair · Purchase of 5 Elmtree Gardens · C2093/8",
      blockMeta: "To: Priya Nair · C2093/8",
      ago: "5 days ago",
      quote: "“Are we still on track to exchange this week, or has anything changed?”",
      reply: {
        to: "Priya Nair",
        subject: "RE: Purchase of 5 Elmtree Gardens — C2093/8",
        body: [
          "Hi Priya,",
          "Yes — we're still on track to exchange this week. The last of the enquiries came back yesterday and I'm satisfied there's nothing outstanding on our side.",
          "I'll confirm the exchange date with the other side today and come straight back to you so you can make arrangements for completion.",
        ],
      },
      status: null,
    },
    {
      id: "reply-tom",
      header: "Tom Beckett · Remortgage of 12 Canal Row · D5521/2",
      blockMeta: "To: Tom Beckett · D5521/2",
      ago: "4 days ago",
      quote: "“My mortgage offer expires at the end of the month — will that be a problem?”",
      reply: {
        to: "Tom Beckett",
        subject: "RE: Remortgage of 12 Canal Row — D5521/2",
        body: [
          "Hi Tom,",
          "Thanks for flagging the offer expiry. We're comfortably inside that window — the redemption figure is already requested and I expect to complete well before month-end.",
          "If anything looks like it might slip I'll let you know immediately so we can ask your lender to extend, but I don't anticipate needing to.",
        ],
      },
      status: null,
    },
    {
      id: "reply-lena",
      header: "Lena Osei · Purchase of Flat 9, Waterworks Court · E1180/6",
      blockMeta: "To: Lena Osei · E1180/6",
      ago: "2 days ago",
      quote: "“The survey mentioned damp — should I be worried before we proceed?”",
      reply: {
        to: "Lena Osei",
        subject: "RE: Flat 9, Waterworks Court — E1180/6",
        body: [
          "Hi Lena,",
          "Thanks for sending the survey over. The damp noted is localised and the surveyor has flagged it as a monitor-and-maintain item rather than anything structural.",
          "I'd suggest we raise it with the seller and ask for either a contribution or evidence of recent treatment. I'll draft that enquiry today and let you decide how you'd like to play it.",
        ],
      },
      status: null,
    },
    {
      id: "reply-george",
      header: "George Attwood · Estate of Margaret Attwood · F3342/9",
      blockMeta: "To: George Attwood · F3342/9",
      ago: "7 days ago",
      quote: "“Any update on the grant of probate? The family keep asking me.”",
      reply: {
        to: "George Attwood",
        subject: "RE: Estate of Margaret Attwood — F3342/9",
        body: [
          "Hi George,",
          "Apologies for the wait — the Probate Registry has been slower than usual. I chased them again this morning and they've confirmed the application is in final review, with the grant expected within the next two weeks.",
          "As soon as it's issued I'll begin collecting in the estate assets and will send you a short update you can pass on to the family.",
        ],
      },
      status: null,
    },
    {
      id: "reply-sofia",
      header: "Sofia Marchetti · Purchase of 3 Kilnbrook Mews · G7788/1",
      blockMeta: "To: Sofia Marchetti · G7788/1",
      ago: "1 day ago",
      quote: "“Can you double-check the deposit figure? It looks higher than we agreed.”",
      reply: {
        to: "Sofia Marchetti",
        subject: "RE: 3 Kilnbrook Mews — deposit — G7788/1",
        body: [
          "Hi Sofia,",
          "Good spot — I've reviewed the figures and you're right. The statement had included the estate agent's fee in error. The correct deposit due on exchange is £27,500.",
          "I've issued a corrected completion statement, attached here, and I'm sorry for the confusion.",
        ],
      },
      status: null,
    },
    {
      id: "reply-noah",
      header: "Noah Bright · New Lease, Unit 7 Foundry Park · H4410/3",
      blockMeta: "To: Noah Bright · H4410/3",
      ago: "3 days ago",
      quote: "“Is the break clause still five years, or did that change in the last draft?”",
      reply: {
        to: "Noah Bright",
        subject: "RE: New Lease, Unit 7 Foundry Park — H4410/3",
        body: [
          "Hi Noah,",
          "The break clause remains at year five, exercisable on six months' notice — that hasn't changed. The last draft only amended the rent review wording, which I've summarised below.",
          "Let me know if you'd like me to walk you through the review mechanism before you sign.",
        ],
      },
      status: null,
    },
    {
      id: "reply-amara",
      header: "Amara Diallo · Purchase of 21 Saffron Hill · J9021/5",
      blockMeta: "To: Amara Diallo · J9021/5",
      ago: "8 days ago",
      quote: "“Do we actually need the indemnity policy, or is it just a precaution?”",
      reply: {
        to: "Amara Diallo",
        subject: "RE: 21 Saffron Hill — indemnity policy — J9021/5",
        body: [
          "Hi Amara,",
          "It's a sensible precaution rather than a strict requirement. The missing building regulations certificate is old enough that enforcement is very unlikely, but your lender will want the risk covered.",
          "The policy is a one-off premium of around £120 and protects you and any future buyer. I'd recommend taking it, and I can put it in place before completion if you're happy.",
        ],
      },
      status: null,
    },
  ];

  // Priority order: client messages first, oldest (most days waiting) at the top;
  // Mya's suggested messages are de-prioritised and sink to the bottom.
  const rank = (r) => (r.suggested ? -1 : (parseInt(r.ago, 10) || 0));
  const sortReplies = () => REPLIES.sort((a, b) => rank(b) - rank(a));
  sortReplies();

  function msgCard(r) {
    if (r.suggested) {
      return (
        '<div class="msg-card msg-card--suggested"><p class="msg-card__quote">' + r.reply.subject + '</p>' +
        '<div class="msg-card__meta"><span>' + r.blockMeta + '</span>' +
        '<span class="msg-card__tag"><span class="material-symbols-outlined">cognition</span>Suggested by Mya</span></div></div>'
      );
    }
    return (
      '<div class="msg-card"><p class="msg-card__quote">' + r.quote + '</p>' +
      '<div class="msg-card__meta"><span>' + r.blockMeta + '</span><span>' + r.ago + '</span></div></div>'
    );
  }
  // Queue Mya's search-anomaly suggestions into this block (once), de-prioritised.
  addSuggestedReplies = function (msgs) {
    let added = 0;
    msgs.forEach((m) => {
      const id = "reply-sug-" + m.id;
      if (REPLIES.some((r) => r.id === id)) return;
      REPLIES.push({
        id: id, suggested: true, role: m.role, reason: m.reason,
        blockMeta: "To: " + m.to, ago: "Suggested by Mya",
        reply: { to: m.to, subject: m.subject, body: m.body.slice() }, status: null,
      });
      added++;
    });
    if (!added) return;
    sortReplies();
    DASH_TODO.totals.replies += added;
    renderBlock();
    DASH_TODO.update("replies", DASH_TODO.attended.replies);
  };
  function renderBlock() {
    const card = document.querySelector('[data-widget-id="replies"]');
    if (!card) return;
    const remaining = REPLIES.filter((r) => !r.status);
    const scroll = card.querySelector(".card__scroll");
    const foot = card.querySelector(".w-foot");
    const count = card.querySelector(".w-head .w-count");
    if (count) count.textContent = remaining.length;
    if (scroll) {
      scroll.innerHTML =
        (remaining.length ? remaining.map((r) => '<div class="block-item" data-open="open-replies" data-item-id="' + r.id + '">' + msgCard(r) + '</div>').join("") : '<p class="empty-note">All caught up — every reply has been sent.</p>');
    }
    if (foot) {
      if (!remaining.length) { foot.style.display = "none"; }
      else {
        foot.style.display = "";
        foot.innerHTML =
          '<span class="mya-chip"><span class="material-symbols-outlined">cognition</span>Reviewed - please confirm</span>' +
          '<button class="btn-tonal" type="button" data-action="open-replies">Review</button>';
      }
    }
  }

  function captureEdits(item, bodyEl) {
    if (!bodyEl) return;
    const to = bodyEl.querySelector(".js-to");
    const subject = bodyEl.querySelector(".js-subject");
    const msg = bodyEl.querySelector(".js-message");
    if (to) item.reply.to = to.value;
    if (subject) item.reply.subject = subject.value;
    if (msg) item.reply.body = msg.value.split(/\n{2,}/);
  }

  // Build an .eml draft (X-Unsent so it opens as a draft in Outlook/Mail).
  function downloadDraft(item) {
    try {
      const nl = "\r\n";
      const body = item.reply.body.join("\n\n").replace(/\r?\n/g, nl);
      const eml = [
        "X-Unsent: 1",
        "To: " + item.reply.to,
        "Subject: " + item.reply.subject,
        "Content-Type: text/plain; charset=utf-8",
        "",
        body,
      ].join(nl);
      const url = URL.createObjectURL(new Blob([eml], { type: "message/rfc822" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "draft-" + item.id.replace(/^reply-/, "") + ".eml";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) { /* download unavailable — status still updates */ }
  }

  createReviewModal({
    title: "Review replies",
    headNote: "Created by Mya",
    secondaryLabel: "Close",
    completeOnClose: true,
    trigger: "open-replies",
    items: REPLIES,
    statusText: (s) => (s === "message" ? "Message Sent" : s === "draft" ? "Draft saved" : ""),
    renderHeadMain: (item) => {
      if (item.suggested) {
        return '<span class="acc-head__stack"><span class="acc-head__title">' + item.reply.to + '</span>' +
          '<span class="acc-head__meta">' + item.role + '</span></span>';
      }
      const parts = item.header.split(" · ");
      const ref = parts.pop();
      return '<span class="acc-head__stack"><span class="acc-head__title">' + parts.join(" - ") + '</span>' +
        '<span class="acc-head__meta">Relating to ' + ref + '</span></span>';
    },
    renderBody: (item) =>
      (item.suggested
        ? '<p class="acc-label">Why Mya suggests this</p><div class="reply-said"><p class="reply-said__quote">' + item.reason + '</p></div>'
        : '<p class="acc-label">What the client said</p><div class="reply-said"><p class="reply-said__meta">' + item.header + '</p><p class="reply-said__quote">' + item.quote + '</p></div>') +
      '<div class="reply-compose-head reply-compose-head--sp"><p class="reply-label">' + (item.suggested ? "Suggested message" : "What you could say") + '</p></div>' +
      '<div class="email">' +
        '<label class="email__row"><span class="email__label">To:</span><input class="email__input js-to" type="text" value="' + escA(item.reply.to) + '"></label>' +
        '<label class="email__row"><span class="email__label">Subject:</span><input class="email__input js-subject" type="text" value="' + escA(item.reply.subject) + '"></label>' +
        '<textarea class="email__textarea js-message" rows="7">' + escH(item.reply.body.join("\n\n")) + '</textarea>' +
      '</div>' +
      '<div class="acc-actions">' +
        '<button class="btn-outline" type="button" data-act="draft">Save as draft email</button>' +
        '<button class="btn-tonal" type="button" data-act="send">' + (item.suggested ? "Send message" : "Send reply") + '</button>' +
      '</div>',
    onAction: (item, act, api, btn) => {
      captureEdits(item, btn.closest(".acc-body"));
      if (act === "send") animateSend(btn, true, () => api.setStatus(item.id, "message"));
      else if (act === "draft") { downloadDraft(item); api.setStatus(item.id, "draft"); }
    },
    onComplete: () => {
      const attended = REPLIES.filter((r) => r.status).length;
      if (!attended) return;
      renderBlock();
      DASH_TODO.update("replies", attended);
    },
  });

  // Wire the existing Review button without disturbing the block's markup.
  renderBlock();
})();

/* ---------- Searches to renew: review modal ---------- */
let searchMessagesApi = null;   // set by searchMessagesFlow; opened from Mya's help banner
(function searchesReviewFlow() {
  // Each search has a primary status chip and (optionally) a "Due" chip.
  //   kind: error (red) · warn (orange) · ok (green, ticked) · info (blue)
  // Only error/warn items still need follow-up, so they drive the block count.
  const SEARCHES = [
    {
      id: "srch-cedar", os: "OS1", ref: "P1290/2", matter: "Purchase of 14 Cedar Drive, Reading",
      primary: { kind: "error", label: "Pending Search" }, state: "pending",
      details: { type: "OS1", from: "12 June 2026", sentBy: "Kristine Burton", fee: "£3.00 (electronic)",
        title: { property: "14 Cedar Drive, Pangbourne, Reading, RG8 7BH", la: "Reading", titleNo: "GR284471", proprietors: "James & Eleanor Whitfield" },
        applicant: { name: "Thomas J. Reed", reason: "Purchase" } },
      status: null,
    },
    {
      id: "srch-bloomsbury", os: "OS2", ref: "G235/2", matter: "Purchase 8 Bloomsbury Court",
      primary: { kind: "error", label: "Expired 4 Jun 2026" }, state: "expired",
      details: { type: "OS2", from: "3 July 2026", sentBy: "Kristine Burton", fee: "£3.00 (electronic)",
        title: { property: "8 Bloomsbury Court, Donnington, Telford, TF2 8DL", la: "Telford", titleNo: "SY512338", proprietors: "Margaret A. Doyle" },
        applicant: { name: "Priya N. Sharma", reason: "Purchase" },
        plan: "8_Bloomsbury_Crt_plan.pdf" },
      status: null,
    },
    {
      id: "srch-druid", os: "OS1", ref: "H1789/1", matter: "Purchase of 1 Druid Park Rd, Willenhall WV12 5EH",
      primary: { kind: "warn", label: "Pending Certificate" }, state: "pending-cert",
      details: { idNum: "156-B9-G9", savedTo: "H1789/1 - Documents", type: "OS1", from: "21 August 2026", sentBy: "Kristine Burton", fee: "£3.00 (electronic)",
        title: { property: "1 Druid Park Road, Willenhall WV12 5EH", la: "Walsall", titleNo: "WM640219", proprietors: "Harpreet & Simran Kaur" },
        applicant: { name: "Daniel O. Okafor", reason: "Purchase" } },
      status: null,
    },
    {
      id: "srch-oak", os: "OS1", ref: "Y86/1", matter: "Purchase of 56 Oak Tree Close, Evesham",
      primary: { kind: "ok", label: "AP1 Ready", icon: true }, due: "25 Jul 2026", state: "ap1-ready",
      details: { idNum: "462-C5-K7", savedTo: "Y86/1 - Documents", type: "OS1", from: "14 June 2026", sentBy: "Kristine Burton", fee: "£3.00 (electronic)",
        title: { property: "56 Oak Tree Close, Evesham, WR11 4QT", la: "Wychavon", titleNo: "GR284471", proprietors: "Thomas J. Reed" },
        applicant: { name: "Thomas J. Reed", reason: "Purchase" } },
      cert: { name: "OS1R for Search 462-C5-K7", savedTo: "Y86/1 - Documents", titleNo: "GR284471", applicant: "Thomas J. Reed", priorityEnds: "25 July 2026",
        result: "Since 14 June 2004 no adverse entries have been made." },
      status: null,
    },
    {
      id: "srch-yew1", os: "OS2", ref: "R068/1", matter: "Purchase of Yew Tree Pup, Leicester",
      primary: { kind: "warn", label: "Anomalies found" }, due: "9 Aug 2026", state: "anomalies-found",
      details: { idNum: "462-C5-K7", savedTo: "R068/1 - Documents", type: "OS2", from: "3 June 2026", sentBy: "Kristine Burton", fee: "£3.00 (electronic)",
        title: { property: "Yew Tree Pub, Main Street, Leicester, LE9 2FA", la: "Blaby", titleNo: "LT428819", proprietors: "Yew Tree Holdings Ltd" },
        applicant: { name: "Priya N. Sharma", reason: "Purchase" } },
      cert: { name: "OS2R for Search 462-C5-K7", savedTo: "R068/1 - Documents", titleNo: "LT428819", applicant: "Priya N. Sharma", priorityEnds: "9 August 2026",
        anomalies: [
          "A pending application for an official search with priority (application ref. 4470115) was entered on the day list on 03 June 2026 at 11:04:12. This search confers a priority period which may rank ahead of your application.",
          "An application to register a charge dated 04 June 2026 in favour of Example Bank plc was entered on the day list on 05 June 2026 at 14:22:07 and is pending completion.",
        ], help: true },
      status: null,
    },
    {
      id: "srch-yew2", os: "OS1", ref: "R069/1", matter: "Purchase of Yew Tree Pup, Leicester",
      primary: { kind: "info", label: "Anomalies Reviewed" }, due: "30 Aug 2026", state: "anomalies-reviewed",
      details: { idNum: "462-C5-K7", savedTo: "R069/1 - Documents", type: "OS1", from: "3 June 2026", sentBy: "Kristine Burton", fee: "£3.00 (electronic)",
        title: { property: "Yew Tree Pub, Main Street, Leicester, LE9 2FA", la: "Blaby", titleNo: "LT428820", proprietors: "Yew Tree Holdings Ltd" },
        applicant: { name: "Priya N. Sharma", reason: "Purchase" } },
      cert: { name: "OS1R for Search 462-C5-K7", savedTo: "R069/1 - Documents", collapsed: true },
      status: null,
    },
  ];
  const needsFollowUp = (s) => s.primary.kind === "error" || s.primary.kind === "warn";

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  // A certificate's priority deadline runs 60 working days (weekdays) from today.
  function workingDaysAhead(n) {
    const d = new Date();
    let added = 0;
    while (added < n) { d.setDate(d.getDate() + 1); const day = d.getDay(); if (day !== 0 && day !== 6) added++; }
    return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
  }
  function newSearchId() {
    const c = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
    const r = (n) => Array.from({ length: n }, () => c[Math.floor(Math.random() * c.length)]).join("");
    return r(3) + "-" + r(2) + "-" + r(2);
  }
  // A cert-issued search shows a deadline 60 working days out.
  const DUE_60 = workingDaysAhead(60);
  SEARCHES.forEach((s) => {
    if (s.state === "ap1-ready" || s.state === "anomalies-found" || s.state === "anomalies-reviewed") s.due = DUE_60;
  });
  // Normalise the editable form fields (auto-populated defaults).
  SEARCHES.forEach((s) => {
    const d = s.details;
    d.payment = d.payment || "direct-debit";
    d.feeAmount = d.feeAmount || "£3.00";
    d.propertyShown = d.propertyShown || "Edged in red";
    d.estatePlan = !!d.estatePlan;
    if (typeof d.firstRegistrant !== "boolean") d.firstRegistrant = !!(d.applicant && d.applicant.name === d.title.proprietors);
  });
  function feeLabel(d) { return d.feeAmount + " (" + (d.payment === "cheque" ? "cheque" : "electronic") + ")"; }

  // Submitting a search (from Pending Search or Expired) → Pending Certificate.
  function toPendingCert(item) {
    item.state = "pending-cert";
    item.primary = { kind: "warn", label: "Pending Certificate" };
    delete item.due;
    delete item.cert;
    item.details.idNum = newSearchId();
    item.details.savedTo = item.ref + " - Documents";
  }
  // Using one of Mya's actions on an anomalies certificate → Anomalies Reviewed.
  function toReviewed(item) {
    if (item.state !== "anomalies-found") return false;
    item.state = "anomalies-reviewed";
    item.primary = { kind: "info", label: "Anomalies Reviewed" };
    if (item.cert) {
      item.cert.collapsed = true;
      delete item.cert.anomalies;
      delete item.cert.help;
      item.cert.result = "Anomalies reviewed — follow-up actioned with the relevant parties.";
    }
    return true;
  }

  function statChip(st) {
    const ico = st.icon ? '<span class="material-symbols-outlined">check</span>' : "";
    return '<span class="search-stat search-stat--' + st.kind + '">' + ico + st.label + '</span>';
  }
  function dueChip(due) { return due ? '<span class="search-stat search-stat--warn">Due ' + due + '</span>' : ""; }
  function chips(s) {
    return (s.os ? '<span class="search-os">' + s.os + '</span>' : "") + statChip(s.primary) + dueChip(s.due);
  }
  function searchRow(s) {
    return (
      '<li class="search-row block-item" data-open="open-searches" data-item-id="' + s.id + '">' +
        '<div class="search-item"><div class="search-item__chips">' + chips(s) + '</div>' +
        '<p class="search-item__ref">' + s.ref + ' - ' + s.matter + '</p></div></li>'
    );
  }
  function renderBlock() {
    const card = document.querySelector('[data-widget-id="searches"]');
    if (!card) return;
    const remaining = SEARCHES.filter((s) => !s.status);
    const scroll = card.querySelector(".card__scroll");
    const foot = card.querySelector(".w-foot");
    const count = card.querySelector(".w-head .w-count");
    const active = remaining.filter(needsFollowUp).length;
    if (count) count.textContent = active;
    if (scroll) {
      scroll.innerHTML =
        (remaining.length ? '<ul class="search-list">' + remaining.map(searchRow).join("") + "</ul>" : '<p class="empty-note">All searches followed up.</p>');
    }
    if (foot) {
      if (!remaining.length) { foot.style.display = "none"; }
      else { foot.style.display = ""; foot.innerHTML = '<button class="btn-tonal" type="button" data-action="open-searches">Review</button>'; }
    }
    // Keep the to-do count in step with the live follow-up count.
    DASH_TODO.update("searches", Math.max(0, DASH_TODO.totals.searches - active));
  }
  /* ----- search-details renderers (nested accordion content) ----- */
  function kv(l, v) { return '<div class="sd-kv"><p class="sd-kv__l">' + l + '</p><p class="sd-kv__v">' + v + '</p></div>'; }
  function detailBoxes(d) {
    return '<div class="sd-sec">' +
        '<p class="sd-sec__head"><span class="material-symbols-outlined">assignment</span>Search Details</p>' +
        '<div class="sd-grid">' + kv("Search type", d.type) + kv("Search From", d.from) + kv("Sent by", d.sentBy) + kv("Fee &amp; Payment Method", feeLabel(d)) + '</div>' +
      '</div>' +
      '<div class="sd-cells">' +
        '<div class="sd-cell">' +
          '<p class="sd-sec__head"><span class="material-symbols-outlined">cottage</span>Title</p>' +
          '<div class="sd-cell__body">' + kv("Property", d.title.property) +
            '<div class="sd-kv-row">' + kv("Local Authority", d.title.la) + kv("Title Number", d.title.titleNo) + '</div>' +
            kv("Proprietor(s)", d.title.proprietors) + '</div>' +
        '</div>' +
        '<div class="sd-cell">' +
          '<p class="sd-sec__head"><span class="material-symbols-outlined">sentiment_calm</span>Applicant</p>' +
          '<div class="sd-cell__body">' + kv("Applicant", d.applicant.name) + kv("Reason for search", d.applicant.reason) + '</div>' +
        '</div>' +
      '</div>' +
      (d.plan ? '<div class="sd-sec sd-sec--plan"><p class="sd-heading">Plan Details</p>' +
        '<div class="sd-plan"><p class="sd-note">' + (d.payment === "cheque"
          ? "No plan currently exists. A referenced plan (not attached) shows the property, edged in red."
          : "No plan currently exists. Supporting attached plan shows property, edged in red") + '</p>' +
        (d.payment === "cheque" ? "" : '<div class="sd-file"><span class="sd-file__ico material-symbols-outlined">picture_as_pdf</span>' + d.plan + '</div>') +
        '</div></div>' : "");
  }
  function sdFooter(item) {
    const st = item.state;
    if (st === "pending" || st === "expired") {
      // Paying by cheque means posting the application, so it's a single
      // download-to-submit action rather than download + electronic submit.
      if (item.details.payment === "cheque") {
        return '<button class="btn-filled" type="button" data-act="submit-search">Download to Submit</button>';
      }
      return '<a class="sd-link" href="#">Download as .docx</a>' +
        '<button class="btn-filled" type="button" data-act="submit-search">Submit search</button>';
    }
    if (st === "pending-cert") {
      return '<a class="sd-link" href="#">Download as .docx</a>';
    }
    return '<button class="sd-danger" type="button" data-act="withdraw">Withdraw Search</button>' +
      '<a class="sd-link" href="#">Download as .docx</a>' +
      '<button class="btn-outline" type="button" data-act="submit-search">Submit new search</button>';
  }
  function sdCard(item) {
    const editable = item.state === "pending" || item.state === "expired";
    const open = editable || item.state === "pending-cert";
    const idHtml = '<b>ID:</b> ' + (editable ? "Created once submitted" : item.details.idNum);
    const right = editable
      ? '<span class="sd-edit" data-act="edit-details"><span class="material-symbols-outlined">edit</span></span>'
      : '<span class="sd-saved">Saved to <span class="material-symbols-outlined">folder_open</span>' + item.details.savedTo + '</span>';
    return '<div class="sd-card' + (open ? " is-open" : "") + '">' +
      '<button class="sd-head" type="button" data-act="sd-toggle">' +
        '<span class="search-os">' + item.os + '</span>' +
        '<span class="sd-id">' + idHtml + '</span>' + right +
        '<span class="sd-chev"><span class="material-symbols-outlined">keyboard_arrow_down</span></span>' +
      '</button>' +
      '<div class="sd-panel"><div class="sd-detail">' + detailBoxes(item.details) + '</div>' +
        // The action row lives inside the card only on the "What was submitted"
        // card (submitted states); the "What to submit" card's buttons sit below.
        (editable ? '' : '<div class="sd-foot">' + sdFooter(item) + '</div>') + '</div></div>';
  }
  function myaHelp() {
    return '<div class="sd-help">' +
      '<span class="sd-help__ico"><span class="material-symbols-outlined">cognition</span></span>' +
      '<span class="sd-help__txt">Mya’s here to help<span class="sd-help__sub">Check-in with HMLR and key contacts</span></span>' +
      '<span class="sd-help__actions">' +
        '<button class="sd-help__link" type="button" data-act="visit-hmlr">' +
          '<span class="material-symbols-outlined">arrow_outward</span>Visit HMLR</button>' +
        '<button class="btn-tonal" type="button" data-act="message-contacts">Message Contacts</button>' +
      '</span></div>';
  }
  function certCard(item) {
    const c = item.cert, open = !c.collapsed;
    let body = '<p class="sd-sec__head"><span class="material-symbols-outlined">summarize</span>Summary of particulars of Search as supplied</p>' +
      '<div class="sd-grid">' + kv("Title Number", c.titleNo) + kv("Applicant", c.applicant) + kv("Priority Period ends on", c.priorityEnds) + '</div>';
    if (c.anomalies) {
      body += '<div class="sd-kv"><p class="sd-kv__l">Result</p><p class="sd-result">Since the search from date shown above, the following adverse entries have been made in the register or the day list of the above title:</p>' +
        '<ol class="sd-anoms">' + c.anomalies.map((a) => '<li>' + a + '</li>').join("") + '</ol></div>';
    } else {
      body += '<div class="sd-kv"><p class="sd-kv__l">Result</p><p class="sd-kv__v">' + c.result + '</p></div>';
    }
    // Mya's recommendation is a full-width footer bar of the certificate card.
    const helpBar = (c.anomalies && c.help) ? myaHelp() : "";
    return '<p class="sd-cert-label">Your certificate from HMLR</p>' +
      '<div class="sd-card sd-card--pdf' + (open ? " is-open" : "") + '">' +
        '<button class="sd-head" type="button" data-act="sd-toggle">' +
          '<span class="sd-pdf material-symbols-outlined">picture_as_pdf</span>' +
          '<span class="sd-id">' + c.name + '</span>' +
          '<span class="sd-saved">Saved to <span class="material-symbols-outlined">folder_open</span>' + c.savedTo + '</span>' +
          '<span class="sd-chev"><span class="material-symbols-outlined">keyboard_arrow_down</span></span>' +
        '</button>' +
        '<div class="sd-panel"><div class="sd-body sd-section">' + body + '</div>' + helpBar + '</div></div>';
  }

  /* ----- Edit-details form (opened from the card's edit pencil) ----- */
  function ffText(label, value, field, opts) {
    opts = opts || {};
    const icon = opts.icon ? '<span class="ff__trail material-symbols-outlined">' + opts.icon + '</span>' : "";
    return '<label class="ff' + (opts.full ? " ff--full" : "") + (opts.icon ? " ff--trail" : "") + (opts.disabled ? " is-disabled" : "") + '">' +
      '<span class="ff__label">' + label + '</span>' +
      '<input class="ff__input" type="text" data-field="' + field + '" value="' + escA(value || "") + '"' + (opts.disabled ? " disabled" : "") + '>' + icon + '</label>';
  }
  function ffSelect(label, value, options, field) {
    return '<label class="ff"><span class="ff__label">' + label + '</span>' +
      '<select class="ff__input" data-field="' + field + '">' +
        options.map((o) => '<option' + (o === value ? " selected" : "") + '>' + o + '</option>').join("") +
      '</select><span class="ff__chev material-symbols-outlined">keyboard_arrow_down</span></label>';
  }
  function ffRadios(name, value, options) {
    return '<div class="ff-radios" data-radio="' + name + '">' +
      options.map((o) => '<label class="ff-radio"><input type="radio" name="ff-' + name + '" value="' + o.v + '"' + (o.v === value ? " checked" : "") + '><span>' + o.t + '</span></label>').join("") + '</div>';
  }
  function fileArea(fileName) {
    if (fileName) {
      return '<div class="form-file"><span class="form-file__ico material-symbols-outlined">picture_as_pdf</span>' +
        '<span class="form-file__name">' + fileName + '</span><span class="form-file__size">120 KB</span>' +
        '<button class="form-file__x" type="button" data-file="remove"><span class="material-symbols-outlined">close</span></button></div>';
    }
    return '<div class="form-drop"><span class="form-drop__hint">Drag and drop your files</span>' +
      '<span class="form-drop__or">or</span><button class="btn-filled" type="button" data-file="browse">Browse</button></div>';
  }
  function buildForm(item) {
    const d = item.details, os2 = item.os === "OS2";
    const typeOpts = ["OS1 - search of whole", "OS2 - search of part"];
    const typeVal = os2 ? "OS2 - search of part" : "OS1 - search of whole";
    let h = '<p class="form-intro">These details have been automatically filled in by Mya based on the matter ' + item.ref + ', but can be freely edited based on your requirements.</p>';
    h += '<p class="form-heading">Search details</p>' +
      '<div class="form-row">' + ffSelect("Type of search*", typeVal, typeOpts, "type") + ffText("Search from*", d.from, "from", { icon: "calendar_month" }) + '</div>' +
      ffSelect("Sent by*", d.sentBy, [d.sentBy, "Kristine Burton", "Other fee earner"], "sentBy");
    h += '<p class="form-heading">Fee Payment Method*</p>' +
      ffRadios("payment", d.payment, [{ v: "cheque", t: "Cheque" }, { v: "direct-debit", t: "Direct Debit" }]) +
      '<div class="form-warn" data-warn="cheque"' + (d.payment === "cheque" ? "" : " hidden") + '>' +
        '<span class="material-symbols-outlined">info</span>You can only pay by cheque when submitting applications by post. This will slow your application down by a few working days versus a same-day result.</div>';
    h += '<p class="form-heading">Property Details</p>' +
      ffText("Address*", d.title.property, "property", { full: true }) +
      '<div class="form-row">' + ffText("Local Authority*", d.title.la, "la") + ffText("Title Number*", d.title.titleNo, "titleNo") + '</div>' +
      ffText("Registered Proprietor(s) or First Registrant Applicant(s)", d.title.proprietors, "proprietors", { full: true });
    if (os2) {
      h += '<p class="form-q">Does the Property have an approved estate plan?</p>' +
        ffRadios("estatePlan", d.estatePlan ? "yes" : "no", [{ v: "yes", t: "Yes" }, { v: "no", t: "No" }]) +
        '<div data-plan="no"' + (d.estatePlan ? " hidden" : "") + '>' +
          '<p class="form-sublabel">Attached site/title plan</p><div class="form-file-slot">' + fileArea(d.plan) + '</div>' +
          ffText("The property is shown*", d.propertyShown, "propertyShown", { full: true }) + '</div>' +
        '<div class="form-row" data-plan="yes"' + (d.estatePlan ? "" : " hidden") + '>' +
          ffText("Date of plan approval*", d.planApprovalDate || "", "planApprovalDate", { icon: "calendar_month" }) + ffText("Plot Number(s)*", d.plotNumbers || "", "plotNumbers") + '</div>';
    }
    h += '<p class="form-heading">Applicant Details</p>' +
      '<p class="form-q">Is the Proprietor the first registrant and, therefore, the applicant?*</p>' +
      ffRadios("firstReg", d.firstRegistrant ? "yes" : "no", [{ v: "yes", t: "Yes" }, { v: "no", t: "No" }]) +
      ffText("Applicant Name", d.firstRegistrant ? d.title.proprietors : (d.applicant.name || ""), "applicantName", { full: true, disabled: d.firstRegistrant });
    h += '<p class="form-heading">Reason for Search</p>' +
      ffRadios("reason", d.applicant.reason || "Purchase", [{ v: "Purchase", t: "Purchase" }, { v: "Take a lease", t: "Take a lease" }, { v: "Take a registered charge", t: "Take a registered charge" }]);
    return h;
  }
  function openSearchForm(item, onSaved) {
    const d = item.details;
    let planFile = d.plan || null;   // working copy of the attachment
    const scrim = document.createElement("div");
    scrim.className = "modal-scrim";
    scrim.innerHTML =
      '<div class="modal modal--form" role="dialog" aria-modal="true">' +
        '<header class="modal__head"><h2 class="modal__title">Search application details for ' + item.ref + '</h2>' +
          '<button class="modal__close" type="button" data-form="cancel" aria-label="Close"><span class="material-symbols-outlined">close</span></button></header>' +
        '<div class="modal__body form-body">' + buildForm(item) + '</div>' +
        '<footer class="modal__foot form-foot">' +
          '<span class="form-fee">Application Fee: <b>' + d.feeAmount + '</b><br><span class="form-fee__sub">Payable using office funds</span></span>' +
          '<div class="modal__actions"><button class="btn-outline" type="button" data-form="cancel">Cancel</button>' +
          '<button class="btn-filled" type="button" data-form="save">Save</button></div>' +
        '</footer></div>';
    document.body.appendChild(scrim);
    const bodyEl = scrim.querySelector(".form-body");
    const getRadio = (name) => { const el = bodyEl.querySelector('[data-radio="' + name + '"] input:checked'); return el ? el.value : null; };
    const field = (f) => bodyEl.querySelector('[data-field="' + f + '"]');

    function close() { scrim.remove(); }
    scrim.addEventListener("click", (e) => { if (e.target === scrim) close(); });
    scrim.querySelectorAll('[data-form="cancel"]').forEach((b) => b.addEventListener("click", close));

    bodyEl.addEventListener("change", (e) => {
      const radio = e.target.closest(".ff-radio input");
      if (!radio) return;
      const name = radio.closest("[data-radio]").getAttribute("data-radio");
      if (name === "payment") {
        const warn = bodyEl.querySelector('[data-warn="cheque"]');
        if (warn) warn.hidden = radio.value !== "cheque";
      } else if (name === "estatePlan") {
        bodyEl.querySelector('[data-plan="no"]').hidden = radio.value === "yes";
        bodyEl.querySelector('[data-plan="yes"]').hidden = radio.value !== "yes";
      } else if (name === "firstReg") {
        const appl = field("applicantName");
        if (radio.value === "yes") { appl.value = (field("proprietors") || {}).value || d.title.proprietors; appl.disabled = true; appl.closest(".ff").classList.add("is-disabled"); }
        else { appl.disabled = false; appl.closest(".ff").classList.remove("is-disabled"); }
      }
    });
    bodyEl.addEventListener("click", (e) => {
      const fileBtn = e.target.closest("[data-file]");
      if (!fileBtn) return;
      const slot = bodyEl.querySelector(".form-file-slot");
      if (fileBtn.getAttribute("data-file") === "browse") { planFile = "site-plan.pdf"; slot.innerHTML = fileArea(planFile); }
      else if (fileBtn.getAttribute("data-file") === "remove") { planFile = null; slot.innerHTML = fileArea(null); }
    });

    scrim.querySelector('[data-form="save"]').addEventListener("click", () => {
      const val = (f) => { const el = field(f); return el ? el.value.trim() : ""; };
      d.type = item.os;   // card shows the short code
      d.from = val("from");
      d.sentBy = val("sentBy");
      d.payment = getRadio("payment") || "direct-debit";
      d.title.property = val("property");
      d.title.la = val("la");
      d.title.titleNo = val("titleNo");
      d.title.proprietors = val("proprietors");
      d.firstRegistrant = getRadio("firstReg") === "yes";
      d.applicant.name = d.firstRegistrant ? d.title.proprietors : val("applicantName");
      d.applicant.reason = getRadio("reason") || "Purchase";
      if (item.os === "OS2") {
        d.estatePlan = getRadio("estatePlan") === "yes";
        if (d.estatePlan) { d.planApprovalDate = val("planApprovalDate"); d.plotNumbers = val("plotNumbers"); delete d.plan; }
        else { d.propertyShown = val("propertyShown"); if (planFile) d.plan = planFile; else delete d.plan; }
      }
      close();
      if (onSaved) onSaved();
    });
  }

  createReviewModal({
    title: "Searches to follow up",
    intro: "Submitting OS1/OS2 applications lodges a new instance with HM Land Registry and updates the expiry date of on a matter.",
    secondaryLabel: "Close",
    completeOnClose: true,
    trigger: "open-searches",
    items: SEARCHES,
    statusText: (s) => (s === "created" ? "AP1 Created" : s === "submitted" ? "Submitted" : s === "withdrawn" ? "Withdrawn" : ""),
    renderAside: (item) => {
      if (item.status === "created") return '<span class="acc-status">AP1 Created</span>';
      if (item.status === "submitted") return '<span class="acc-status">Submitted</span>';
      if (item.status === "withdrawn") return '<span class="acc-status">Withdrawn</span>';
      return '<span class="acc-head__chips">' + statChip(item.primary) + dueChip(item.due) + '</span>';
    },
    renderHeadMain: (item) => '<span class="acc-head__title">' + item.ref + ' - ' + item.matter + '</span>',
    renderBody: (item) => {
      const st = item.state;
      const label = st === "pending" ? "What to submit"
        : st === "expired" ? 'What to submit <span class="sd-sub">(Based on your previous search)</span>'
        : "What was submitted";
      let h = '<p class="acc-label">' + label + '</p>' + sdCard(item);
      // "What to submit" card (pending/expired) — buttons sit below the card.
      if (st === "pending" || st === "expired") {
        h += '<div class="sd-actions">' + sdFooter(item) + '</div>';
      }
      // Certificate from HMLR — its own card, with the buttons below it.
      if (item.cert) {
        h += certCard(item) +
          '<div class="sd-actions"><a class="sd-link" href="#">Download as .pdf</a>' +
          '<button class="btn-filled" type="button" data-act="create-ap1">Create AP1</button></div>';
      }
      return h;
    },
    onAction: (item, act, api, btn) => {
      if (act === "edit-details") {
        openSearchForm(item, () => { api.rerender(); renderBlock(); });
      } else if (act === "submit-search") {
        // Submitting a search always lands on Pending Certificate.
        animateSend(btn, false, () => { toPendingCert(item); api.rerender(); renderBlock(); });
      } else if (act === "create-ap1") {
        animateSend(btn, false, () => api.setStatus(item.id, "created"));
      } else if (act === "withdraw") {
        api.setStatus(item.id, "withdrawn");
      } else if (act === "visit-hmlr") {
        // Opening the HMLR portal alone does NOT mark the anomalies reviewed.
        window.open("https://search-property-information.service.gov.uk/", "_blank", "noopener");
      } else if (act === "message-contacts") {
        // Reviewing the messages (closing that modal) is what marks it reviewed.
        if (searchMessagesApi) searchMessagesApi.open(() => { if (toReviewed(item)) { api.rerender(); renderBlock(); } });
      }
    },
    onComplete: () => { renderBlock(); },
  });

  renderBlock();
})();

/* ---------- Search anomalies: "Review messages to send" modal ----------
   Opened from the "Message Contacts" button in Mya's help banner. Drafts one
   message per party the result flags — matter client, the other side's
   solicitor, the client's lender and HM Land Registry — each keyed to the
   specific adverse entry in the certificate's Result text. */
(function searchMessagesFlow() {
  const MESSAGES = [
    {
      id: "sm-client", to: "Priya N. Sharma", role: "Matter client",
      reason: "The priority-search certificate came back with two adverse entries. Your client should be told what they mean and that you're already acting on them.",
      subject: "Update on your search results — 8 Bloomsbury Court",
      body: [
        "Dear Priya,",
        "Our priority search at HM Land Registry has come back with two entries I want to make you aware of: another party has an official search with priority pending, and a charge in favour of a lender has been lodged on the day list.",
        "Neither is unusual at this stage and I'm following both up directly with the parties involved. I'll confirm as soon as each is resolved — there's nothing you need to do right now.",
      ],
      status: null,
    },
    {
      id: "sm-solicitor", to: "Acting solicitor — application ref. 4470115", role: "Other party's solicitor",
      reason: "A pending official search with priority (ref. 4470115) may rank ahead of our application. Confirm the other side's intentions and expected completion.",
      subject: "Priority search ref. 4470115 — Title SY512338",
      body: [
        "Dear Colleague,",
        "The day list for title SY512338 shows an official search with priority under application reference 4470115, entered on 03 June 2026, which appears to rank ahead of our client's application.",
        "Please could you confirm the transaction it protects and your anticipated completion date, so we can align priority periods and avoid our respective applications cancelling each other out.",
      ],
      status: null,
    },
    {
      id: "sm-lender", to: "Example Bank plc — Completions Team", role: "Client's lender",
      reason: "A charge dated 04 June 2026 in your favour is pending completion on the day list. Confirm status so it doesn't hold up registration.",
      subject: "Pending charge — Title SY512338, 8 Bloomsbury Court",
      body: [
        "Dear Sir/Madam,",
        "The day list for title SY512338 shows an application to register a charge dated 04 June 2026 in your favour, entered on 05 June 2026 and pending completion.",
        "Please confirm the current status of that application and whether any further information is required from us, so it doesn't delay registration of our client's interest.",
      ],
      status: null,
    },
    {
      id: "sm-hmlr", to: "HM Land Registry", role: "HMLR",
      reason: "Query the two day-list entries directly with HMLR if the other parties don't respond, to establish priority and timing.",
      subject: "Day list query — Title SY512338",
      body: [
        "Dear HM Land Registry,",
        "We act on a purchase of the property registered under title SY512338. Our official search reveals a pending priority search (ref. 4470115) and a pending charge application dated 04 June 2026.",
        "Please could you confirm the current status and priority order of these day-list entries so we can advise our client accordingly.",
      ],
      status: null,
    },
  ];

  let onReviewedCb = null, sentThisSession = false;
  const messagesModal = createReviewModal({
    title: "Review messages to send",
    headNote: "Created by Mya",
    secondaryLabel: "Close",
    completeOnClose: true,
    // Only mark the search reviewed if a message was actually sent this session.
    onComplete: () => { const cb = onReviewedCb; onReviewedCb = null; if (cb && sentThisSession) cb(); },
    trigger: "open-search-messages",
    items: MESSAGES,
    statusText: (s) => (s === "message" ? "Message Sent" : s === "draft" ? "Draft saved" : ""),
    renderHeadMain: (m) => '<span class="acc-head__stack"><span class="acc-head__title">' + m.to + '</span><span class="acc-head__meta">' + m.role + '</span></span>',
    renderBody: (m) =>
      '<p class="acc-label">Why Mya suggests this</p>' +
      '<div class="reply-said"><p class="reply-said__quote">' + m.reason + '</p></div>' +
      '<div class="reply-compose-head reply-compose-head--sp"><p class="reply-label">Suggested message</p></div>' +
      '<div class="email">' +
        '<label class="email__row"><span class="email__label">To:</span><input class="email__input" type="text" value="' + escA(m.to) + '"></label>' +
        '<label class="email__row"><span class="email__label">Subject:</span><input class="email__input" type="text" value="' + escA(m.subject) + '"></label>' +
        '<textarea class="email__textarea" rows="6">' + escH(m.body.join("\n\n")) + '</textarea>' +
      '</div>' +
      '<div class="acc-actions">' +
        '<button class="btn-outline" type="button" data-act="draft">Save as draft email</button>' +
        '<button class="btn-tonal" type="button" data-act="send">Send message</button>' +
      '</div>',
    onAction: (m, act, api, btn) => {
      if (act === "send") animateSend(btn, true, () => { api.setStatus(m.id, "message"); sentThisSession = true; });
      else if (act === "draft") api.setStatus(m.id, "draft");
    },
  });

  // Opening the suggestions also queues them into the Replies to send block.
  // onReviewed fires on close, but only if a message was sent this session.
  searchMessagesApi = {
    open: (onReviewed) => {
      onReviewedCb = onReviewed || null;
      sentThisSession = false;
      if (addSuggestedReplies) addSuggestedReplies(MESSAGES);
      messagesModal.open();
    },
  };
})();

/* ---------- shared checklist helpers ---------- */
function myaChecklist(checks) {
  // Each row is an expandable accordion (chevron). The status chip conveys the
  // state; the panel holds supporting detail (placeholder content for now).
  return '<ul class="checklist">' + checks.map((c) =>
    '<li class="check-item">' +
      '<button type="button" class="check-row" data-act="check-toggle">' +
        '<span class="check-label">' + c.label + '</span>' +
        '<span class="check-pill check-pill--' + (c.done ? "ok" : "no") + '">' + c.status + '</span>' +
        '<span class="check-chev"><span class="material-symbols-outlined">keyboard_arrow_down</span></span>' +
      '</button>' +
      '<div class="check-panel"><div class="check-body">' +
        '<p class="check-detail">' + (c.detail || "Supporting detail for this check will appear here.") + '</p>' +
      '</div></div>' +
    '</li>'
  ).join("") + '</ul>';
}
function myaProgress(pct) {
  return '<div class="check-prog"><span class="check-prog__label">Progress</span>' +
    '<div class="progress-track"><div class="progress-fill progress-fill--' + (pct >= 100 ? "ok" : "warn") + '" style="width:' + pct + '%"></div></div>' +
    '<span class="check-prog__pct">' + pct + '% Complete</span></div>';
}

/* ---------- Matters ready to close: review modal ---------- */
(function mattersReviewFlow() {
  const MATTERS = [
    {
      id: "mat-maltings",
      title: "Sale of 32 The Maltings, Tewkesbury",
      sub: "A1264/2 · No activity for 41 days",
      pct: 80,
      checks: [
        { label: "Exchange & completion recorded", done: true, status: "Completed" },
        { label: "SDLT return submitted", done: true, status: "Completed" },
        { label: "Title registered at HMLR", done: true, status: "Completed" },
        { label: "Client account balance cleared", done: false, status: "Outstanding" },
        { label: "Residual balance cleared", done: true, status: "Completed" },
      ],
      card: '<div class="mini-card"><div class="mini-card__head"><p class="mini-card__ref">A1264/2</p><p class="mini-card__title">Sale of 32 The Maltings, Tewkesbury</p></div>' +
        '<div class="progress-row"><div class="progress-row__left"><span class="progress-label">Progress</span>' +
        '<div class="progress-track progress-track--sm"><div class="progress-fill progress-fill--warn" style="width:80%"></div></div>' +
        '<span class="progress-pct">80%</span></div><span class="pill pill--error">£180.00 to clear</span></div></div>',
      status: null,
    },
    {
      id: "mat-cedar",
      title: "Purchase of 14 Cedar Drive, Reading",
      sub: "B3320/7 · No activity for 33 days",
      pct: 100,
      checks: [
        { label: "Exchange & completion recorded", done: true, status: "Completed" },
        { label: "SDLT return submitted", done: true, status: "Completed" },
        { label: "Title registered at HMLR", done: true, status: "Completed" },
        { label: "Client account balance cleared", done: true, status: "Completed" },
        { label: "Residual balance cleared", done: true, status: "Completed" },
      ],
      card: '<div class="mini-card"><div class="mini-card__head"><p class="mini-card__ref">B3320/7</p><p class="mini-card__title">Purchase of 14 Cedar Drive, Reading</p></div>' +
        '<div class="progress-row"><div class="progress-row__left"><span class="progress-label">Progress</span>' +
        '<div class="progress-track progress-track--sm"><div class="progress-fill progress-fill--ok" style="width:100%"></div></div>' +
        '<span class="progress-pct">100%</span></div><span class="pill pill--ok">No Balance</span></div></div>',
      status: null,
    },
    {
      id: "mat-oakford",
      title: "Sale of Oakford Barn, Chipping",
      sub: "H2201/3 · No activity for 28 days",
      pct: 100,
      checks: [
        { label: "Exchange & completion recorded", done: true, status: "Completed" },
        { label: "SDLT return submitted", done: true, status: "Completed" },
        { label: "Title registered at HMLR", done: true, status: "Completed" },
        { label: "Client account balance cleared", done: true, status: "Completed" },
        { label: "Residual balance cleared", done: true, status: "Completed" },
      ],
      card: '<div class="mini-card"><div class="mini-card__head"><p class="mini-card__ref">H2201/3</p><p class="mini-card__title">Sale of Oakford Barn, Chipping</p></div>' +
        '<div class="progress-row"><div class="progress-row__left"><span class="progress-label">Progress</span>' +
        '<div class="progress-track progress-track--sm"><div class="progress-fill progress-fill--ok" style="width:100%"></div></div>' +
        '<span class="progress-pct">100%</span></div><span class="pill pill--ok">No Balance</span></div></div>',
      status: null,
    },
    {
      id: "mat-harbour",
      title: "Purchase of 6 Harbour View, Poole",
      sub: "J4455/1 · No activity for 37 days",
      pct: 80,
      checks: [
        { label: "Exchange & completion recorded", done: true, status: "Completed" },
        { label: "SDLT return submitted", done: true, status: "Completed" },
        { label: "Title registered at HMLR", done: true, status: "Completed" },
        { label: "Client account balance cleared", done: false, status: "Outstanding" },
        { label: "Residual balance cleared", done: true, status: "Completed" },
      ],
      card: '<div class="mini-card"><div class="mini-card__head"><p class="mini-card__ref">J4455/1</p><p class="mini-card__title">Purchase of 6 Harbour View, Poole</p></div>' +
        '<div class="progress-row"><div class="progress-row__left"><span class="progress-label">Progress</span>' +
        '<div class="progress-track progress-track--sm"><div class="progress-fill progress-fill--warn" style="width:80%"></div></div>' +
        '<span class="progress-pct">80%</span></div><span class="pill pill--error">£320.00 to clear</span></div></div>',
      status: null,
    },
    {
      id: "mat-millgate",
      title: "Transfer of Equity, 19 Millgate",
      sub: "K1120/5 · No activity for 44 days",
      pct: 100,
      checks: [
        { label: "Transfer deed executed", done: true, status: "Completed" },
        { label: "SDLT return submitted", done: true, status: "Completed" },
        { label: "Title registered at HMLR", done: true, status: "Completed" },
        { label: "Lender consent obtained", done: true, status: "Completed" },
        { label: "Residual balance cleared", done: true, status: "Completed" },
      ],
      card: '<div class="mini-card"><div class="mini-card__head"><p class="mini-card__ref">K1120/5</p><p class="mini-card__title">Transfer of Equity, 19 Millgate</p></div>' +
        '<div class="progress-row"><div class="progress-row__left"><span class="progress-label">Progress</span>' +
        '<div class="progress-track progress-track--sm"><div class="progress-fill progress-fill--ok" style="width:100%"></div></div>' +
        '<span class="progress-pct">100%</span></div><span class="pill pill--ok">No Balance</span></div></div>',
      status: null,
    },
    {
      id: "mat-station",
      title: "Sale of 2 Station Road, Devizes",
      sub: "L7788/2 · No activity for 31 days",
      pct: 80,
      checks: [
        { label: "Exchange & completion recorded", done: true, status: "Completed" },
        { label: "SDLT return submitted", done: true, status: "Completed" },
        { label: "Title registered at HMLR", done: true, status: "Completed" },
        { label: "Estate agent invoice settled", done: false, status: "Outstanding" },
        { label: "Residual balance cleared", done: true, status: "Completed" },
      ],
      card: '<div class="mini-card"><div class="mini-card__head"><p class="mini-card__ref">L7788/2</p><p class="mini-card__title">Sale of 2 Station Road, Devizes</p></div>' +
        '<div class="progress-row"><div class="progress-row__left"><span class="progress-label">Progress</span>' +
        '<div class="progress-track progress-track--sm"><div class="progress-fill progress-fill--warn" style="width:80%"></div></div>' +
        '<span class="progress-pct">80%</span></div><span class="pill pill--error">£95.50 to clear</span></div></div>',
      status: null,
    },
    {
      id: "mat-abbey",
      title: "Purchase of Abbey Lodge, Malmesbury",
      sub: "M9903/6 · No activity for 52 days",
      pct: 100,
      checks: [
        { label: "Exchange & completion recorded", done: true, status: "Completed" },
        { label: "SDLT return submitted", done: true, status: "Completed" },
        { label: "Title registered at HMLR", done: true, status: "Completed" },
        { label: "Client account balance cleared", done: true, status: "Completed" },
        { label: "Residual balance cleared", done: true, status: "Completed" },
      ],
      card: '<div class="mini-card"><div class="mini-card__head"><p class="mini-card__ref">M9903/6</p><p class="mini-card__title">Purchase of Abbey Lodge, Malmesbury</p></div>' +
        '<div class="progress-row"><div class="progress-row__left"><span class="progress-label">Progress</span>' +
        '<div class="progress-track progress-track--sm"><div class="progress-fill progress-fill--ok" style="width:100%"></div></div>' +
        '<span class="progress-pct">100%</span></div><span class="pill pill--ok">No Balance</span></div></div>',
      status: null,
    },
  ];

  function renderBlock() {
    const card = document.querySelector('[data-widget-id="matters-close"]');
    if (!card) return;
    const remaining = MATTERS.filter((m) => !m.status);
    const scroll = card.querySelector(".card__scroll");
    const foot = card.querySelector(".w-foot");
    const count = card.querySelector(".w-head .w-count");
    if (count) count.textContent = remaining.length;
    if (scroll) {
      scroll.innerHTML =
        (remaining.length ? remaining.map((m) => '<div class="block-item" data-open="open-matters" data-item-id="' + m.id + '">' + m.card + '</div>').join("") : '<p class="empty-note">All matters closed — nice work.</p>');
    }
    if (foot) {
      if (!remaining.length) { foot.style.display = "none"; }
      else {
        foot.style.display = "";
        foot.innerHTML =
          '<span class="mya-chip"><span class="material-symbols-outlined">cognition</span>Reviewed - please confirm</span>' +
          '<button class="btn-tonal" type="button" data-action="open-matters">Review</button>';
      }
    }
  }

  createReviewModal({
    title: "Probable Completed Matters",
    secondaryLabel: "Close",
    primaryLabel: null,
    completeOnClose: true,
    trigger: "open-matters",
    items: MATTERS,
    statusText: (s) => (s ? "Close Requested" : ""),
    // Always show a status pill in the header: progress % until closed, then the
    // green "Close Requested" once actioned.
    renderAside: (m) => {
      if (m.status) return '<span class="acc-status">Close Requested</span>';
      const kind = m.pct >= 100 ? "ok" : m.pct >= 50 ? "warn" : "no";
      return '<span class="pill-progress pill-progress--' + kind + '">' + m.pct + '% Complete</span>';
    },
    renderHeadMain: (m) => '<span class="acc-head__stack"><span class="acc-head__title">' + m.title + '</span><span class="acc-head__meta">' + m.sub + '</span></span>',
    renderBody: (m) =>
      '<p class="acc-label">What’s left to complete</p>' +
      myaChecklist(m.checks) +
      myaProgress(m.pct) +
      '<p class="check-note">Request to close matter will become available when status reaches 100%. Closing is final.</p>' +
      '<div class="acc-actions"><button class="btn-filled" type="button" data-act="close-matter"' + (m.pct >= 100 ? "" : " disabled") + '>Close Matter</button></div>',
    onAction: (m, act, api, btn) => {
      if (act === "close-matter" && m.pct >= 100) animateSend(btn, false, () => api.setStatus(m.id, "closed"));
    },
    onComplete: () => {
      const attended = MATTERS.filter((m) => m.status).length;
      if (!attended) return;
      renderBlock();
      DASH_TODO.update("matters", attended);
    },
  });

  renderBlock();
})();

/* ---------- AML checks to complete: review modal ---------- */
(function amlReviewFlow() {
  const AML = [
    {
      id: "aml-launton",
      title: "Land Promotion Agreement, Launton",
      sub: "Bicester Land Co Ltd · H6533/1",
      pct: 25,
      checks: [
        { label: "Photo ID verification", done: false, status: "Outstanding" },
        { label: "Proof of address", done: true, status: "Recieved" },
        { label: "Source of funds", done: false, status: "Outstanding" },
      ],
      card: '<div class="aml-card"><div class="aml-card__chips"><span class="aml-chip">ID Verification</span><span class="aml-chip">Source of funds</span></div>' +
        '<p class="aml-card__title">Land Promotion Agreement, Launton</p>' +
        '<p class="aml-card__sub">H6533/1 - Bicester Land Co Ltd</p></div>',
      status: null,
    },
    {
      id: "aml-bloomsbury",
      title: "Purchase 8 Bloomsbury Court · A25/1",
      sub: "Jonathan Reece · Opened 4 days ago",
      pct: 75,
      checks: [
        { label: "Photo ID verification", done: true, status: "Recieved" },
        { label: "Proof of address", done: true, status: "Recieved" },
        { label: "Source of funds", done: false, status: "Outstanding" },
      ],
      card: '<div class="aml-card"><div class="aml-card__chips"><span class="aml-chip">Source of funds</span></div>' +
        '<p class="aml-card__title">Purchase 8 Bloomsbury Court</p>' +
        '<p class="aml-card__sub">A25/1 - Jonathan Reece</p></div>',
      status: null,
    },
    {
      id: "aml-millyard",
      title: "Purchase of Mill Yard Studios · N2040/1",
      sub: "Oakford Estates Ltd · Opened 6 days ago",
      pct: 67,
      checks: [
        { label: "Photo ID verification", done: true, status: "Recieved" },
        { label: "Proof of address", done: true, status: "Recieved" },
        { label: "Source of funds", done: false, status: "Outstanding" },
      ],
      card: '<div class="aml-card"><div class="aml-card__chips"><span class="aml-chip">Source of funds</span></div>' +
        '<p class="aml-card__title">Purchase of Mill Yard Studios</p>' +
        '<p class="aml-card__sub">N2040/1 - Oakford Estates Ltd</p></div>',
      status: null,
    },
    {
      id: "aml-foundry",
      title: "Lease of Unit 4, Foundry Park · N5510/2",
      sub: "Harbour & Co LLP · Opened 11 days ago",
      pct: 33,
      checks: [
        { label: "Photo ID verification", done: false, status: "Outstanding" },
        { label: "Proof of address", done: true, status: "Recieved" },
        { label: "Source of funds", done: false, status: "Outstanding" },
      ],
      card: '<div class="aml-card"><div class="aml-card__chips"><span class="aml-chip">ID Verification</span><span class="aml-chip">Source of funds</span></div>' +
        '<p class="aml-card__title">Lease of Unit 4, Foundry Park</p>' +
        '<p class="aml-card__sub">N5510/2 - Harbour & Co LLP</p></div>',
      status: null,
    },
    {
      id: "aml-bridge",
      title: "Purchase of 2 Bridge Street · N8820/4",
      sub: "Jonah Okafor · Opened 3 days ago",
      pct: 67,
      checks: [
        { label: "Photo ID verification", done: true, status: "Recieved" },
        { label: "Proof of address", done: false, status: "Outstanding" },
        { label: "Source of funds", done: true, status: "Recieved" },
      ],
      card: '<div class="aml-card"><div class="aml-card__chips"><span class="aml-chip">Proof of address</span></div>' +
        '<p class="aml-card__title">Purchase of 2 Bridge Street</p>' +
        '<p class="aml-card__sub">N8820/4 - Jonah Okafor</p></div>',
      status: null,
    },
    {
      id: "aml-cobbler",
      title: "Purchase of 44 Cobbler’s Yard · N9931/7",
      sub: "Yusuf Rahman · Opened 5 days ago",
      pct: 33,
      checks: [
        { label: "Photo ID verification", done: false, status: "Outstanding" },
        { label: "Proof of address", done: false, status: "Outstanding" },
        { label: "Source of funds", done: true, status: "Recieved" },
      ],
      card: '<div class="aml-card"><div class="aml-card__chips"><span class="aml-chip">ID Verification</span><span class="aml-chip">Proof of address</span></div>' +
        '<p class="aml-card__title">Purchase of 44 Cobbler’s Yard</p>' +
        '<p class="aml-card__sub">N9931/7 - Yusuf Rahman</p></div>',
      status: null,
    },
  ];

  function renderBlock() {
    const card = document.querySelector('[data-widget-id="aml-checks"]');
    if (!card) return;
    const remaining = AML.filter((a) => !a.status);
    const scroll = card.querySelector(".card__scroll");
    const foot = card.querySelector(".w-foot");
    const count = card.querySelector(".w-head .w-count");
    if (count) count.textContent = remaining.length;
    if (scroll) {
      scroll.innerHTML =
        (remaining.length ? remaining.map((a) => '<div class="block-item" data-open="open-aml" data-item-id="' + a.id + '">' + a.card + '</div>').join("") : '<p class="empty-note">All AML checks reviewed.</p>');
    }
    if (foot) {
      if (!remaining.length) { foot.style.display = "none"; }
      else {
        foot.style.display = "";
        foot.innerHTML =
          '<span class="mya-chip"><span class="material-symbols-outlined">cognition</span>Reviewed - please confirm</span>' +
          '<button class="btn-tonal" type="button" data-action="open-aml">Review</button>';
      }
    }
  }

  createReviewModal({
    title: "Complete AML checks",
    secondaryLabel: "Close",
    trigger: "open-aml",
    items: AML,
    statusText: () => "",
    renderAside: (a) => {
      const kind = a.pct >= 100 ? "ok" : a.pct >= 50 ? "warn" : "no";
      return '<span class="pill-progress pill-progress--' + kind + '">' + a.pct + '% Complete</span>';
    },
    renderHeadMain: (a) => '<span class="acc-head__stack"><span class="acc-head__title">' + a.title + '</span><span class="acc-head__meta">' + a.sub + '</span></span>',
    renderBody: (a) =>
      '<p class="acc-label">What’s left to check</p>' +
      myaChecklist(a.checks) +
      myaProgress(a.pct),
    onComplete: () => {
      AML.forEach((a) => { a.status = "reviewed"; });
      renderBlock();
      // The to-do tracks missing checklist parts, not matters.
      const missing = AML.reduce((n, a) => n + a.checks.filter((c) => !c.done).length, 0);
      DASH_TODO.update("aml", missing);
    },
  });

  renderBlock();
})();

/* ---------- "How accurate was Mya?" thumbs feedback ----------
   Clicking a thumb (in any modal footer) fills it and swaps the caption to a
   thank-you. Delegated so it covers every modal, including the ones built by
   the review-modal factory. */
document.addEventListener("click", function (e) {
  const btn = e.target.closest(".rate__btn");
  if (!btn) return;
  const rate = btn.closest(".rate");
  if (!rate) return;
  rate.querySelectorAll(".rate__btn").forEach((b) => b.classList.remove("is-active"));
  btn.classList.add("is-active");
  const text = rate.querySelector(".rate__text");
  if (text) text.textContent = "Thank you for your feedback.";
});

/* ---------- Order the to-do rows to match the on-page block order ----------
   Rows follow the order their blocks appear in the grid. A block that's been
   removed from the page sinks to the bottom; if none of the blocks are present
   the fixed fallback order is used. Re-runs whenever the grid changes. */
(function orderTodosByBlocks() {
  const TODO_TO_WIDGET = {
    replies: "replies",
    relations: "client-relations",
    matters: "matters-close",
    aml: "aml-checks",
    searches: "searches",
  };
  const FALLBACK = ["aml", "searches", "matters", "relations", "replies"];
  const WIDGET_TO_TODO = {};
  for (const k in TODO_TO_WIDGET) WIDGET_TO_TODO[TODO_TO_WIDGET[k]] = k;

  const grid = document.getElementById("widgetGrid");
  const list = document.querySelector(".card--todos .todo-list");
  if (!grid || !list) return;

  function orderTodos() {
    // to-do keys in the order their blocks appear on the page …
    const ordered = [];
    grid.querySelectorAll(".widget[data-widget-id]").forEach((w) => {
      const key = WIDGET_TO_TODO[w.dataset.widgetId];
      if (key && ordered.indexOf(key) === -1) ordered.push(key);
    });
    // … then any absent blocks, in the fallback order.
    FALLBACK.forEach((key) => { if (ordered.indexOf(key) === -1) ordered.push(key); });
    ordered.forEach((key) => {
      const row = list.querySelector('[data-todo="' + key + '"]');
      if (row) list.appendChild(row);   // reorder within the list
    });
  }

  orderTodos();
  // childList only (not subtree) — moving to-do rows lives deep inside the todos
  // widget and must not retrigger the observer.
  new MutationObserver(orderTodos).observe(grid, { childList: true });
})();

/* ============================================================
   First-run onboarding — "What's new" intro modal + guided
   walkthrough with animated coachmarks over the six new blocks
   and the Customise button.
   ============================================================ */
(function onboarding() {
  const KEY = "halo_onboarded_v1";
  const force = location.hash === "#onboard";
  if (!force && localStorage.getItem(KEY)) return;

  const FEATURES = [
    { icon: "assignment",           title: "Today's to-dos",          desc: "One prioritised list of everything worth your time today." },
    { icon: "task_alt",             title: "Matters ready to close",  desc: "See what's complete and ready to wrap up, at a glance." },
    { icon: "mark_unread_chat_alt", title: "Replies to send",         desc: "Client questions waiting on you, oldest first." },
    { icon: "cached",               title: "Searches to renew",       desc: "Never let an expiring search slip past you again." },
    { icon: "person_check",         title: "Client relations",        desc: "Spot the relationships that need a little nurturing." },
    { icon: "health_and_safety",    title: "AML checks to complete",  desc: "Outstanding compliance flagged before it turns urgent." },
  ];

  const STEPS = [
    { sel: '[data-widget-id="todos"]',            title: "Your morning to-do list",  body: "Everything that needs your attention today, prioritised with the most urgent items at the top. Start here each morning." },
    { sel: '[data-widget-id="matters-close"]',    title: "Matters ready to close",   body: "Matters at or near 100% completion. Review the summary and confirm to close them off in just a couple of clicks." },
    { sel: '[data-widget-id="replies"]',          title: "Replies to send",          body: "Client questions still waiting on an answer. The longest-waiting appear first, so nothing slips through the cracks." },
    { sel: '[data-widget-id="searches"]',         title: "Searches to renew",        body: "Property searches nearing or past their expiry date. Renew them before they lapse to keep the matter moving." },
    { sel: '[data-widget-id="client-relations"]', title: "Client relations",         body: "Conversations where the tone is trending negative. A quick check-in here helps protect the relationship." },
    { sel: '[data-widget-id="aml-checks"]',       title: "AML checks to complete",   body: "Outstanding anti-money-laundering checks. Clear these to stay compliant and unblock the matter." },
    { sel: '.page-header__edit',                  title: "A space to customise",     body: "Want to prioritise one block over another? Expand, contract and rearrange the page to suit your needs.", below: true },
  ];

  function markDone() { localStorage.setItem(KEY, "1"); }

  /* ---------- intro modal ---------- */
  const scrim = document.createElement("div");
  scrim.className = "onb-scrim";
  scrim.hidden = true;
  scrim.innerHTML =
    '<div class="onb-modal" role="dialog" aria-modal="true" aria-labelledby="onbTitle">' +
      '<button class="onb-x" type="button" aria-label="Close"><span class="material-symbols-outlined">close</span></button>' +
      '<span class="onb-chip"><span class="material-symbols-outlined">star</span>New to Halo</span>' +
      '<h2 class="onb-title" id="onbTitle">Meet your Intelligent Dashboard</h2>' +
      '<p class="onb-sub">We’ve brought everything that needs your attention into one place — six new blocks that keep matters moving, all designed to help life be a little easier.</p>' +
      '<div class="onb-grid">' +
        FEATURES.map((f) =>
          '<div class="onb-feat"><span class="onb-feat__ico"><span class="material-symbols-outlined">' + f.icon + '</span></span>' +
          '<div class="onb-feat__txt"><p class="onb-feat__t">' + f.title + '</p><p class="onb-feat__d">' + f.desc + '</p></div></div>'
        ).join("") +
      '</div>' +
      '<div class="onb-foot">' +
        '<button class="btn-outline onb-dismiss" type="button">Explore myself</button>' +
        '<button class="btn-filled onb-walk" type="button">Walk me through it</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(scrim);

  function closeIntro() { scrim.hidden = true; }
  scrim.querySelector(".onb-x").addEventListener("click", () => { closeIntro(); markDone(); });
  scrim.querySelector(".onb-dismiss").addEventListener("click", () => { closeIntro(); markDone(); });
  scrim.querySelector(".onb-walk").addEventListener("click", () => { closeIntro(); startTour(); });
  scrim.addEventListener("click", (e) => { if (e.target === scrim) { closeIntro(); markDone(); } });

  /* ---------- walkthrough ---------- */
  const tour = document.createElement("div");
  tour.className = "tour";
  tour.hidden = true;
  tour.innerHTML =
    '<div class="tour-blocker"></div>' +
    '<div class="tour-hole"></div>' +
    '<div class="tour-pop">' +
      '<span class="tour-step"></span>' +
      '<h3 class="tour-title"></h3>' +
      '<p class="tour-body"></p>' +
      '<div class="tour-foot">' +
        '<button class="tour-skip" type="button">Skip tour</button>' +
        '<div class="tour-nav">' +
          '<button class="btn-outline tour-back" type="button">Back</button>' +
          '<button class="btn-filled tour-next" type="button">Next</button>' +
        '</div>' +
      '</div>' +
      '<span class="tour-arrow"></span>' +
    '</div>';
  document.body.appendChild(tour);

  const hole = tour.querySelector(".tour-hole");
  const pop = tour.querySelector(".tour-pop");
  const arrow = tour.querySelector(".tour-arrow");
  const elStep = tour.querySelector(".tour-step");
  const elTitle = tour.querySelector(".tour-title");
  const elBody = tour.querySelector(".tour-body");
  const btnSkip = tour.querySelector(".tour-skip");
  const btnBack = tour.querySelector(".tour-back");
  const btnNext = tour.querySelector(".tour-next");

  let idx = 0;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));
  const block = (e) => e.preventDefault();

  function place(rect, below) {
    const PAD = 6, GAP = 16, M = 12;
    hole.style.top = (rect.top - PAD) + "px";
    hole.style.left = (rect.left - PAD) + "px";
    hole.style.width = (rect.width + PAD * 2) + "px";
    hole.style.height = (rect.height + PAD * 2) + "px";

    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    pop.classList.remove("tour-pop--right", "tour-pop--left", "tour-pop--below");
    let top, left;
    if (below) {
      pop.classList.add("tour-pop--below");
      top = rect.bottom + GAP;
      left = clamp(rect.right - pw, M, innerWidth - pw - M);
      arrow.style.left = clamp(rect.left + rect.width / 2 - left - 6, 12, pw - 24) + "px";
      arrow.style.top = "";
    } else if (innerWidth - rect.right >= pw + GAP) {
      pop.classList.add("tour-pop--right");
      left = rect.right + GAP;
      top = clamp(rect.top + rect.height / 2 - ph / 2, M, innerHeight - ph - M);
      arrow.style.top = clamp(rect.top + rect.height / 2 - top - 6, 12, ph - 24) + "px";
      arrow.style.left = "";
    } else {
      pop.classList.add("tour-pop--left");
      left = rect.left - GAP - pw;
      top = clamp(rect.top + rect.height / 2 - ph / 2, M, innerHeight - ph - M);
      arrow.style.top = clamp(rect.top + rect.height / 2 - top - 6, 12, ph - 24) + "px";
      arrow.style.left = "";
    }
    pop.style.top = top + "px";
    pop.style.left = left + "px";
  }

  function render(i, animate) {
    const step = STEPS[i];
    const target = document.querySelector(step.sel);
    if (!target) { endTour(); return; }

    elStep.textContent = "Step " + (i + 1) + " of " + STEPS.length;
    elTitle.textContent = step.title;
    elBody.textContent = step.body;
    btnBack.hidden = i === 0;
    btnSkip.hidden = i === STEPS.length - 1;
    btnNext.textContent = i === STEPS.length - 1 ? "Finish & Explore" : "Next";

    // Scroll the target to the vertical centre; move the spotlight + popover to
    // the *post-scroll* position so they glide in sync with the page.
    const rect = target.getBoundingClientRect();
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    const desired = clamp(scrollY + rect.top - (innerHeight / 2 - rect.height / 2), 0, maxScroll);
    const delta = desired - scrollY;
    const finalRect = {
      top: rect.top - delta, left: rect.left, width: rect.width, height: rect.height,
      bottom: rect.bottom - delta, right: rect.right,
    };

    if (!animate) { hole.style.transition = "none"; pop.style.transition = "none"; }
    if (delta) window.scrollTo({ top: desired, behavior: animate ? "smooth" : "auto" });
    place(finalRect, step.below);
    if (!animate) {
      // Re-enable transitions once the initial (jump-free) placement is painted.
      requestAnimationFrame(() => { requestAnimationFrame(() => { hole.style.transition = ""; pop.style.transition = ""; }); });
    }
  }

  function startTour() {
    idx = 0;
    tour.hidden = false;
    document.addEventListener("wheel", block, { passive: false });
    document.addEventListener("touchmove", block, { passive: false });
    window.addEventListener("resize", onResize);
    requestAnimationFrame(() => render(0, false));
  }
  function endTour() {
    tour.hidden = true;
    document.removeEventListener("wheel", block, { passive: false });
    document.removeEventListener("touchmove", block, { passive: false });
    window.removeEventListener("resize", onResize);
    markDone();
  }
  function onResize() { render(idx, false); }

  btnNext.addEventListener("click", () => { if (idx >= STEPS.length - 1) endTour(); else render(++idx, true); });
  btnBack.addEventListener("click", () => { if (idx > 0) render(--idx, true); });
  btnSkip.addEventListener("click", endTour);
  document.addEventListener("keydown", (e) => { if (!tour.hidden && e.key === "Escape") endTour(); });

  // Show the intro once the page has settled.
  setTimeout(() => { scrim.hidden = false; }, 600);
})();
