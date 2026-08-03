/* ============================================================
   Halo — Intelligent Dashboard (AI Prompt State)
   Figma: Halo / node 4278-231719

   Every AI block is a *stack*: a blurred card sitting behind the
   one in focus. Acting on the focused card sends it away, floats
   the blurred card up into its place (un-blurring and gaining the
   shadow as it goes) and slides a fresh blurred card in behind.

   The cards read from window.HALO, which script.js publishes — the
   same records the review modals work on — so a card can open its
   modal focused on exactly the item you were looking at.
   ============================================================ */
(function intelligentDashboard() {
  "use strict";

  const H = window.HALO || {};
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escA = (s) => esc(s).replace(/"/g, "&quot;");

  /* ---------------------------------------------------------
     Find documents has no backing review modal in the prototype,
     so its queue lives here.
     --------------------------------------------------------- */
  const DOCUMENTS = [
    { id: "doc-handover", from: "s.aldridge@setfords.co.uk", name: "Registration Handover Form 2021 -CurrentDate-_2026-04-29_12-46-50 - Copy (10)" },
    { id: "doc-ta6", from: "k.burton@setfords.co.uk", name: "TA6 Property Information Form — 14 Cedar Drive, Reading (signed).pdf" },
    { id: "doc-sdlt", from: "accounts@setfords.co.uk", name: "SDLT5 Certificate — A1264-2 — The Maltings, Tewkesbury.pdf" },
    { id: "doc-os1", from: "noreply@landregistry.gov.uk", name: "OS1 Official Search Result — GR284471 — 2026-06-12.pdf" },
    { id: "doc-idv", from: "compliance@setfords.co.uk", name: "ID Verification Report — Mrs Josephine Horton — H6533-1.pdf" },
    { id: "doc-completion", from: "j.reece@bloomsburyct.co.uk", name: "Completion Statement — 8 Bloomsbury Court — A25-1 (final).pdf" },
  ];

  /* ---------------------------------------------------------
     Card content builders. A prompt decides which of these the
     stack renders — the same block can hand back searches, or
     drafted messages, depending on what you asked for.
     --------------------------------------------------------- */
  const TAG = (kind, label, icon) =>
    '<span class="tag tag--' + kind + '">' +
      (icon ? '<span class="material-symbols-outlined tag__icon">' + icon + "</span>" : "") +
      esc(label) + "</span>";

  const CARD = {
    // A drafted message: who it's to, then the body clamped to two lines.
    message: (m) =>
      '<div class="mini__body">' +
        '<p class="mini__meta">' + esc(m.metaLine) + "</p>" +
        '<p class="mini__title">' + esc(m.bodyLine) + "</p>" +
      "</div>",

    document: (d) =>
      '<div class="mini__body mini__body--gap8">' +
        '<p class="mini__meta">Email From: ' + esc(d.from) + "</p>" +
        '<div class="mini__doc"><img src="assets/icon-doc.svg" alt="" />' +
          '<p class="mini__title">' + esc(d.name) + "</p>" +
        "</div>" +
      "</div>",

    search: (s) =>
      '<div class="mini__body">' +
        '<div class="mini__chips">' +
          '<span class="os-tag">' + esc(s.os) + "</span>" +
          TAG(s.primary.kind, s.primary.label, s.primary.icon ? "check" : null) +
          (s.due ? TAG("warn", "Due " + s.due) : "") +
        "</div>" +
        '<p class="mini__title">' + esc(s.ref) + " - " + esc(s.matter) + "</p>" +
      "</div>",

    matter: (m) => {
      const balance = (m.card || "").match(/pill pill--error">([^<]+)</);
      return (
        '<div class="mini__body mini__body--gap6">' +
          '<div class="mini__lines">' +
            '<p class="mini__meta">' + esc(m.sub) + "</p>" +
            '<p class="mini__title mini__title--one">' + esc(m.title) + "</p>" +
          "</div>" +
          '<div class="prog">' +
            '<span class="prog__label">Progress</span>' +
            '<div class="prog__track"><i class="' + (m.pct >= 100 ? "is-complete" : "") +
              '" style="width:' + Math.max(0, Math.min(100, m.pct)) + '%"></i></div>' +
            '<span class="prog__pct">' + esc(m.pct) + "%</span>" +
            (balance ? TAG("error", balance[1]) : "") +
          "</div>" +
        "</div>"
      );
    },

    // AML leads on the party, with the outstanding check and matter ref above.
    aml: (check) => (a) => {
      const outstanding = (a.checks || []).filter((c) => !c.done);
      const shown = check ? outstanding.filter((c) => check.test(c.label))[0] : outstanding[0];
      const ref = ((a.sub || "") + " " + (a.title || "")).match(/[A-Z]+\d+\/\d+/);
      const party = String(a.sub || "").split("·")[0].trim();
      const matter = String(a.title || "").split("·")[0].trim();
      return (
        '<div class="mini__chips">' +
          (shown ? TAG("error", shown.label) : "") +
          (ref ? '<p class="mini__ref">' + esc(ref[0]) + "</p>" : "") +
        "</div>" +
        '<div class="mini__lines">' +
          '<p class="mini__title mini__title--one">' + esc(party) + "</p>" +
          '<p class="mini__meta">' + esc(matter) + "</p>" +
        "</div>"
      );
    },
  };

  // Adapters onto the shared HALO records the modals also work from.
  const asReply = (r) => ({ item: r, metaLine: r.blockMeta, bodyLine: r.quote });
  const asRelation = (r) => ({ item: r, metaLine: "To: " + r.from, bodyLine: r.reply.body.join("") });
  const asMessage = (m) => ({ item: m, metaLine: "To: " + m.to + " · " + m.role, bodyLine: m.body.join(" ") });
  // Wrappers are cached per record so a rebuilt queue keeps object identity,
  // and `status` reads and writes straight through to the shared record.
  const wrapCache = new WeakMap();
  function mapped(list, fn) {
    return (list || []).map((rec) => {
      let w = wrapCache.get(rec);
      if (!w) {
        w = fn(rec);
        w.id = rec.id;
        Object.defineProperty(w, "status", {
          get() { return rec.status; },
          set(v) { rec.status = v; },
          enumerable: true,
        });
        wrapCache.set(rec, w);
      }
      return w;
    });
  }

  /* ---------------------------------------------------------
     Per-block prompts. Each one owns the records it returns, the
     card it renders them as, its two action labels, and which
     review modal "Review all" opens.
     --------------------------------------------------------- */
  const BLOCKS = {
    replies: {
      label: "Prompt or upload emails for review:",
      upload: "Upload an email or thread",
      prompts: [{
        text: "Draft replies to all my unanswered emails from the last 3 days", tokens: "~1.6k",
        assistant: "communications", trigger: "open-replies", doneStatus: "message", todoKey: "replies",
        tonal: "Edit", filled: "Send", render: CARD.message,
        source: () => mapped(H.replies, asReply),
      }],
    },

    documents: {
      label: "Prompt or upload emails for review:",
      upload: "Upload an email or thread",
      prompts: [{
        text: "Find and extract all attachments from unread emails", tokens: "~1.0k",
        assistant: "operations", trigger: null, doneStatus: "saved",
        tonal: "View", filled: "Save", render: CARD.document,
        source: () => DOCUMENTS,
      }],
    },

    relations: {
      label: "Prompt or upload emails for review:",
      upload: "Upload a client message",
      prompts: [{
        text: "Draft all messages to clients that are treating me poorly", tokens: "~1.7k",
        assistant: "communications", trigger: "open-relations",
        doneStatus: "message", todoKey: "relations",
        tonal: "Edit", filled: "Send", render: CARD.message,
        source: () => mapped(H.relations, asRelation),
        // The card *is* the draft, so Edit goes straight to it. The full
        // relationship read-out is still a click away on Review all.
        openItem: (w) => { if (H.openRelationReply) H.openRelationReply(w.id); },
      }],
    },

    searches: {
      label: "Prompt to run an analysis or draft messages:",
      prompts: [
        {
          text: "Follow-up expired and expiring searches", tokens: "~1.0k",
          assistant: "operations", trigger: "open-searches", doneStatus: "submitted", todoKey: "searches",
          tonal: "Edit", filled: "Re-submit", render: CARD.search,
          source: () => (H.searches || []).filter((s) => s.state === "expired" || s.state === "expiring"),
        },
        {
          text: "Draft follow-up messages for searches that contain anomalies", tokens: "~1.3k",
          assistant: "communications", trigger: "open-search-messages", doneStatus: "message",
          tonal: "Edit", filled: "Send", render: CARD.message,
          source: () => mapped(H.searchMessages, asMessage),
        },
        {
          text: "Follow-up AP1 ready searches", tokens: "~1.0k",
          assistant: "operations", trigger: "open-searches", doneStatus: "created", todoKey: "searches",
          tonal: "Edit", filled: "Submit AP1", render: CARD.search,
          source: () => (H.searches || []).filter((s) => s.state === "ap1-ready"),
        },
      ],
    },

    matters: {
      label: "Prompt to run an analysis:",
      prompts: [
        {
          text: "List all matters ready to close", tokens: "~1.1k",
          assistant: "operations", trigger: "open-matters", doneStatus: "closed", todoKey: "matters",
          tonal: "Review", filled: "Close Matter", filledEnabled: (m) => m.pct >= 100, render: CARD.matter,
          source: () => (H.matters || []).filter((m) => m.pct >= 100),
        },
        {
          text: "Flag matters with a remaining balance", tokens: "~0.9k",
          assistant: "operations", trigger: "open-matters", doneStatus: "closed", todoKey: "matters",
          tonal: "Review", filled: "Close Matter", filledEnabled: (m) => m.pct >= 100, render: CARD.matter,
          source: () => (H.matters || []).filter((m) => /pill--error/.test(m.card || "")),
        },
      ],
    },

    aml: {
      label: "Prompt to run an analysis:",
      prompts: [
        {
          text: "Which AML checks are outstanding?", tokens: "~0.8k",
          assistant: "operations", trigger: "open-aml", doneStatus: "reviewed",
          tonal: "TBC", filled: "TBC", render: CARD.aml(null),
          source: () => (H.aml || []).filter((a) => (a.checks || []).some((c) => !c.done)),
        },
        {
          text: "Show me who still requires proof of source-of-funds to be checked", tokens: "~2.1k",
          assistant: "finance", trigger: "open-aml", doneStatus: "reviewed",
          tonal: "TBC", filled: "TBC", render: CARD.aml(/source of funds/i),
          source: () => (H.aml || []).filter((a) => (a.checks || []).some((c) => !c.done && /source of funds/i.test(c.label))),
        },
      ],
    },
  };

  /* ---------------------------------------------------------
     Re-run schedules. A block set to re-run daily or weekly keeps
     its results on screen — it opens straight to them next visit
     instead of back at the prompts — and its loop icon takes the
     running assistant's colour.
     --------------------------------------------------------- */
  const LOOP_KEY = "halo-prompt-loops-v1";

  const loops = {
    all() {
      try { return JSON.parse(localStorage.getItem(LOOP_KEY)) || {}; }
      catch (e) { return {}; }
    },
    save(map) {
      try { localStorage.setItem(LOOP_KEY, JSON.stringify(map)); } catch (e) { /* private mode */ }
    },
    get(card) { return this.all()[card.el.dataset.block] || null; },
    set(card, every) {
      const map = this.all();
      map[card.el.dataset.block] = { variant: card.vi, every: every };
      this.save(map);
      this.paint(card);
    },
    clear(card) {
      const map = this.all();
      if (!(card.el.dataset.block in map)) return;   // nothing stored, nothing to repaint
      delete map[card.el.dataset.block];
      this.save(map);
      this.paint(card);
    },
    paint(card) {
      const on = !!this.get(card);
      card.el.classList.toggle("is-looping", on);
      card.cycleBtn.setAttribute("aria-label", on
        ? "Re-running " + this.get(card).every + " — change schedule"
        : "Re-run this prompt on a schedule");
    },
  };

  const loopMenu = (function () {
    const el = document.createElement("div");
    el.className = "loopmenu";
    el.hidden = true;
    el.setAttribute("role", "menu");
    el.innerHTML =
      '<p class="loopmenu__title">Frequently re-run prompt</p>' +
      '<button class="loopmenu__opt" type="button" role="menuitemradio" data-every="daily">' +
        '<span>Daily</span><span class="material-symbols-outlined loopmenu__tick">check</span></button>' +
      '<button class="loopmenu__opt" type="button" role="menuitemradio" data-every="weekly">' +
        '<span>Weekly</span><span class="material-symbols-outlined loopmenu__tick">check</span></button>' +
      '<button class="loopmenu__off" type="button">Turn off</button>';
    document.body.appendChild(el);

    let owner = null;

    function place(btn) {
      const r = btn.getBoundingClientRect();
      el.hidden = false;                      // measure once it can be measured
      const w = el.offsetWidth, h = el.offsetHeight;
      let left = Math.min(r.right - w, innerWidth - w - 12);
      let top = r.bottom + 8;
      if (top + h > innerHeight - 12) top = Math.max(12, r.top - h - 8);
      el.style.left = Math.max(12, left) + "px";
      el.style.top = top + "px";
    }

    function sync() {
      const set = owner ? loops.get(owner) : null;
      el.querySelectorAll(".loopmenu__opt").forEach((b) => {
        b.setAttribute("aria-checked", String(!!set && set.every === b.dataset.every));
      });
      el.querySelector(".loopmenu__off").hidden = !set;
    }

    function close() {
      if (owner) owner.cycleBtn.setAttribute("aria-expanded", "false");
      owner = null;
      el.hidden = true;
    }

    function open(card) {
      owner = card;
      card.cycleBtn.setAttribute("aria-expanded", "true");
      sync();
      place(card.cycleBtn);
    }

    el.addEventListener("click", (e) => {
      const opt = e.target.closest(".loopmenu__opt");
      const off = e.target.closest(".loopmenu__off");
      if (!opt && !off) return;
      const card = owner;
      if (!card) return;
      if (off) loops.clear(card);
      else if (loops.get(card) && loops.get(card).every === opt.dataset.every) loops.clear(card);   // toggle off
      else loops.set(card, opt.dataset.every);
      close();
    });

    document.addEventListener("click", (e) => {
      if (!el.hidden && !el.contains(e.target)) close();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !el.hidden) close(); });
    window.addEventListener("resize", () => { if (owner) place(owner.cycleBtn); });

    return {
      toggle(card) { if (owner === card) close(); else { close(); open(card); } },
      close,
    };
  })();

  /* ---------------------------------------------------------
     Card controller
     --------------------------------------------------------- */
  const cards = [];

  function setup(el) {
    const cfg = BLOCKS[el.dataset.block];
    if (!cfg) return;

    const card = {
      el,
      block: cfg,
      v: cfg.prompts[0],   // active prompt variant
      vi: 0,
      stack: el.querySelector("[data-stack]"),
      countEl: el.querySelector("[data-count]"),
      backBtn: el.querySelector("[data-back]"),
      cycleBtn: el.querySelector("[data-cycle]"),
      queue: [],
      pos: 0,
      step: 0,
      busy: false,
    };
    cards.push(card);

    card.stack.addEventListener("click", (e) => onStackClick(card, e));
    card.backBtn.addEventListener("click", () => back(card));
    card.cycleBtn.addEventListener("click", (e) => { e.stopPropagation(); loopMenu.toggle(card); });
    wirePromptStep(card);

    sync(card);
  }

  /* ---------------------------------------------------------
     Step 1 → step 2. A pre-canned prompt, or a file dropped on
     the upload zone, runs the assistant and hands you the
     stacked result cards. Back returns to the prompts.
     --------------------------------------------------------- */
  function wirePromptStep(card) {
    card.el.querySelectorAll("[data-prompt]").forEach((chip) => {
      chip.addEventListener("click", () => enterResults(card, parseInt(chip.dataset.prompt, 10) || 0));
    });

    const zone = card.el.querySelector("[data-upload]");
    const input = card.el.querySelector("[data-upload-input]");
    if (!zone) return;

    zone.addEventListener("click", () => input && input.click());
    if (input) {
      input.addEventListener("change", () => { if (input.files && input.files.length) enterResults(card, 0); });
    }
    ["dragenter", "dragover"].forEach((t) =>
      zone.addEventListener(t, (e) => { e.preventDefault(); zone.classList.add("is-dragover"); }));
    ["dragleave", "drop"].forEach((t) =>
      zone.addEventListener(t, () => zone.classList.remove("is-dragover")));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.files.length) enterResults(card, 0);
    });
  }

  /* Core colour of each assistant's orb — what a scheduled block's loop icon
     takes on, so you can see at a glance which Ai is keeping it fresh. */
  const ORB_COLOR = { finance: "#37ba07", operations: "#c761e6", communications: "#ff9603" };

  const THINK_MS = 6000;   // one full think cycle of the assistant's ring
  const DIM_MS = 440;      // long enough for the bottom-up clear to finish
  const CAPTION_MS = 4000; // when the caption switches to the closing line
  const CAPTIONS = ["Thinking...", "Finishing up..."];

  function enterResults(card, vi, instant) {
    card.vi = Math.max(0, Math.min(vi || 0, card.block.prompts.length - 1));
    card.v = card.block.prompts[card.vi];
    card.queue = [];
    card.pos = 0;
    card.step = 0;
    sync(card);

    // The results header wears the ring of whichever assistant ran the prompt,
    // and Review all opens that prompt's modal.
    const avatar = card.el.querySelector(".aicard__results .aicard__avatar");
    if (avatar) avatar.setAttribute("variant", card.v.assistant);
    card.el.style.setProperty("--hx-orb", ORB_COLOR[card.v.assistant] || "#999b9d");
    const reviewAll = card.el.querySelector(".aicard__foot .outlinebtn");
    if (reviewAll) {
      if (card.v.trigger) reviewAll.setAttribute("data-action", card.v.trigger);
      else reviewAll.removeAttribute("data-action");
      // Review all lists exactly what this prompt returned, not the whole flow.
      reviewAll.setAttribute("data-scope", (card.v.source() || []).map((i) => i.id).join(","));
    }

    const caption = card.el.querySelector(".aicard__loadtext");
    const say = (text) => {
      if (!caption) return;
      caption.textContent = text;
      caption.style.animation = "none";      // restart the fade on the swap
      void caption.offsetWidth;
      caption.style.animation = "";
    };

    const reveal = () => {
      clearTimeout(card.captionTimer);
      think(card, false);
      card.el.dataset.state = "results";
      paint(card);
      card.el.classList.add("is-revealing");
      clearTimeout(card.revealTimer);
      card.revealTimer = setTimeout(() => card.el.classList.remove("is-revealing"), 700);
    };

    clearTimeout(card.dimTimer);
    clearTimeout(card.loadTimer);
    clearTimeout(card.captionTimer);
    if (instant) { card.el.classList.remove("is-dimming"); solo(card, true); reveal(); return; }

    // 1 — clear the card from the bottom up, 2 — the header ring (still in
    // place, still 32px) starts thinking, 3 — the results arrive top-down.
    card.el.classList.add("is-dimming");
    solo(card, true);          // fold away the ring that isn't running
    card.dimTimer = setTimeout(() => {
      card.el.dataset.state = "loading";
      card.el.classList.remove("is-dimming");
      think(card, true);
      if (caption) caption.textContent = CAPTIONS[0];
      card.captionTimer = setTimeout(() => say(CAPTIONS[1]), CAPTION_MS);
      card.loadTimer = setTimeout(reveal, THINK_MS);
    }, DIM_MS);
  }

  /* Only the ring belonging to the assistant running the prompt thinks. */
  function think(card, on) {
    eachRing(card, (orb, mine) => {
      if (on && mine) orb.setAttribute("state", "thinking");
      else orb.removeAttribute("state");
    });
  }

  /* Narrow a two-assistant header down to the one doing the work. */
  function solo(card, on) {
    eachRing(card, (orb, mine) => orb.classList.toggle("is-standby", on && !mine));
  }

  function eachRing(card, fn) {
    card.el.querySelectorAll(".aicard__prompt .aicard__avatar").forEach((orb) => {
      fn(orb, orb.getAttribute("variant") === card.v.assistant);
    });
  }

  function enterPrompt(card) {
    loops.clear(card);
    clearTimeout(card.dimTimer);
    clearTimeout(card.loadTimer);
    clearTimeout(card.captionTimer);
    clearTimeout(card.revealTimer);
    card.el.classList.remove("is-revealing", "is-dimming");
    think(card, false);
    solo(card, false);
    card.el.dataset.state = "prompt";
    card.stack.innerHTML = "";
  }

  /* Rebuild the queue from live data, dropping anything already actioned
     (in a card or in its modal). The position follows the items you'd already
     moved past, so a modal clearing the front card doesn't skip you forward. */
  function sync(card) {
    const live = (card.v.source() || []).filter((i) => !i.status);
    const passed = card.queue.slice(0, card.pos).filter((i) => live.indexOf(i) !== -1);
    card.queue = live;
    card.pos = Math.min(passed.length, live.length);
    card.step = Math.min(card.step, live.length);
  }

  function current(card) { return card.queue[card.pos]; }
  function next(card) { return card.queue[card.pos + 1]; }

  function buildMini(card, item, cls) {
    const cfg = card.v;
    const el = document.createElement("div");
    el.className = "mini " + cls;

    if (!item) {
      el.classList.add("mini--empty");
      el.innerHTML = '<p class="mini__empty">All caught up</p>';
      return el;
    }

    // Carry the modal hooks on the card itself: script.js listens for these on
    // document, so clicking the card (or its tonal button) opens the review
    // modal focused on this one item.
    if (cfg.trigger && !cfg.openItem) {
      if (cfg.focusAttr) el.setAttribute(cfg.focusAttr, item.id);
      else {
        el.setAttribute("data-open", cfg.trigger);
        el.setAttribute("data-item-id", item.id);
        el.setAttribute("data-scope", (cfg.source() || []).map((i) => i.id).join(","));
      }
    }
    el.dataset.id = item.id;

    const canFill = cfg.filledEnabled ? cfg.filledEnabled(item) : true;
    el.innerHTML =
      cfg.render(item) +
      '<div class="mini__actions">' +
        '<button class="minibtn minibtn--text" type="button" data-act="skip">Skip</button>' +
        '<div class="mini__actionsright">' +
          '<button class="minibtn minibtn--tonal" type="button" data-act="tonal">' + esc(cfg.tonal) + "</button>" +
          '<button class="minibtn minibtn--filled" type="button" data-act="filled"' +
            (canFill ? "" : " disabled") + ' title="' + escA(cfg.filled) + '">' + esc(cfg.filled) + "</button>" +
        "</div>" +
      "</div>";
    return el;
  }

  /* Full repaint — used on first render, on Back, and after a modal closes. */
  function paint(card) {
    card.stack.innerHTML = "";
    const front = buildMini(card, current(card), "mini--front");
    const behind = next(card) ? buildMini(card, next(card), "mini--behind") : null;
    if (behind) { behind.setAttribute("aria-hidden", "true"); card.stack.appendChild(behind); }
    card.stack.appendChild(front);
    updateChrome(card);
  }

  /* "N of M" is read straight off the source array — M is exactly what Review
     all lists, and N is the focused card's place in it. */
  function updateChrome(card) {
    const all = card.v.source() || [];
    const item = current(card);
    const at = item ? all.indexOf(item) + 1 : all.length;
    card.countEl.textContent = (at || all.length) + " of " + all.length;
    // Nothing to review in a list of one — the card is already showing it.
    const reviewAll = card.el.querySelector(".aicard__foot .outlinebtn");
    if (reviewAll) reviewAll.hidden = all.length <= 1;
  }

  /* The signature move: front card out, blurred card up into focus,
     a new blurred card in behind. */
  function advance(card) {
    if (card.busy) return;
    const stack = card.stack;
    const leaving = stack.querySelector(".mini--front");
    const promoting = stack.querySelector(".mini--behind");

    card.pos += 1;
    card.step += 1;
    card.busy = true;

    if (leaving) {
      leaving.classList.remove("mini--front");
      leaving.classList.add("mini--leaving");
      setTimeout(() => leaving.remove(), 460);
    }

    if (promoting) {
      promoting.classList.remove("mini--behind");
      promoting.classList.add("mini--front");
      promoting.removeAttribute("aria-hidden");
    } else {
      // Queue ran dry — the "all caught up" card takes the focus position.
      const done = buildMini(card, null, "mini--ghost");
      stack.appendChild(done);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        done.classList.remove("mini--ghost");
        done.classList.add("mini--front");
      }));
    }

    const incoming = next(card);
    if (incoming) {
      const el = buildMini(card, incoming, "mini--ghost");
      el.setAttribute("aria-hidden", "true");
      stack.appendChild(el);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.classList.remove("mini--ghost");
        el.classList.add("mini--behind");
      }));
    }

    updateChrome(card);
    setTimeout(() => { card.busy = false; }, 460);
  }

  /* Back mirrors the way in: the results clear bottom-up, then the prompts fill
     back in top-down and the folded-away assistant ring unfurls with them. */
  function back(card) {
    if (card.busy || card.el.classList.contains("is-dimming")) return;
    if (card.el.dataset.state !== "results") { enterPrompt(card); return; }

    clearTimeout(card.dimTimer);
    clearTimeout(card.revealTimer);
    card.el.classList.remove("is-revealing");
    card.el.classList.add("is-dimming");

    card.dimTimer = setTimeout(() => {
      enterPrompt(card);
      // enterPrompt releases the folded ring; re-fold it in the same tick so no
      // frame paints it expanded, then let go on the next one — that way the
      // second assistant unfurls with the prompts instead of popping back.
      solo(card, true);
      card.el.classList.add("is-revealing");
      requestAnimationFrame(() => requestAnimationFrame(() => solo(card, false)));
      card.revealTimer = setTimeout(() => card.el.classList.remove("is-revealing"), 800);
    }, DIM_MS);
  }

  /* Cycle: park the focused item at the back of the queue and pull the next
     one forward — same motion, nothing marked as done. */
  function cycle(card) {
    if (card.busy || card.queue.length < 2) return;
    const item = current(card);
    if (!item) return;
    card.cycleBtn.classList.add("is-spinning");
    setTimeout(() => card.cycleBtn.classList.remove("is-spinning"), 500);

    const stack = card.stack;
    const leaving = stack.querySelector(".mini--front");
    const promoting = stack.querySelector(".mini--behind");

    card.queue.splice(card.pos, 1);
    card.queue.push(item);
    card.busy = true;

    if (leaving) {
      leaving.classList.remove("mini--front");
      leaving.classList.add("mini--leaving");
      setTimeout(() => leaving.remove(), 460);
    }
    if (promoting) {
      promoting.classList.remove("mini--behind");
      promoting.classList.add("mini--front");
      promoting.removeAttribute("aria-hidden");
    }
    const incoming = next(card);
    if (incoming) {
      const el = buildMini(card, incoming, "mini--ghost");
      el.setAttribute("aria-hidden", "true");
      stack.appendChild(el);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.classList.remove("mini--ghost");
        el.classList.add("mini--behind");
      }));
    }
    updateChrome(card);
    setTimeout(() => { card.busy = false; }, 460);
  }

  function onStackClick(card, e) {
    const mini = e.target.closest(".mini--front");
    if (!mini) return;
    const btn = e.target.closest("[data-act]");
    if (!btn) {
      // A bare card click bubbles on to script.js's openers, unless this
      // variant brings its own.
      if (!card.v.openItem) return;
      e.preventDefault();
      e.stopPropagation();
      const item = current(card);
      if (item) card.v.openItem(item);
      return;
    }
    const act = btn.dataset.act;

    if (act === "tonal") {
      if (!card.v.openItem) return;   // bubble: script.js opens the modal focused
      e.preventDefault();
      e.stopPropagation();
      const item = current(card);
      if (item) card.v.openItem(item);
      return;
    }

    e.preventDefault();
    e.stopPropagation();   // keep Skip / the primary action out of the modal openers

    if (act === "skip") { advance(card); return; }

    if (act === "filled") {
      if (btn.disabled) return;
      const item = current(card);
      const finish = () => {
        if (item && card.v.doneStatus) {
          item.status = card.v.doneStatus;
          // Drop it from the queue, then step back one so advance() lands on
          // the item that has just slid into its place.
          card.queue.splice(card.pos, 1);
          card.pos -= 1;
          advance(card);
          reportTodo(card);
        } else {
          advance(card);
        }
      };
      // Reuse the shared spinner → tick affordance from script.js.
      if (typeof window.animateSend === "function") window.animateSend(btn, false, finish);
      else finish();
    }
  }

  /* Keep the (hidden) to-do roll-up honest when a card actions an item. */
  function reportTodo(card) {
    const key = card.v.todoKey;
    // DASH_TODO is a top-level `const` in script.js — a global lexical binding,
    // reachable by name but not as a window property.
    if (!key || typeof DASH_TODO === "undefined") return;
    const all = card.v.source() || [];
    DASH_TODO.update(key, all.filter((i) => i.status).length);
  }

  /* ---------------------------------------------------------
     Boot
     --------------------------------------------------------- */
  document.querySelectorAll(".aicard[data-block]").forEach(setup);

  // A block with a schedule opens on its results rather than its prompts.
  cards.forEach((card) => {
    const set = loops.get(card);
    if (!set) return;
    enterResults(card, set.variant || 0, true);
    loops.paint(card);
  });

  /* Lets the onboarding walkthrough show a block in either state, without
     making it sit through the assistant's 6s think. */
  const byBlock = (name) => cards.filter((c) => c.el.dataset.block === name)[0];
  (window.HALO = window.HALO || {}).demo = {
    results: (name, vi) => { const c = byBlock(name); if (c) enterResults(c, vi || 0, true); },
    prompt: (name) => { const c = byBlock(name); if (c) enterPrompt(c); },
  };

  // A review modal can action items too — repaint the cards once it closes.
  function refreshAll() {
    cards.forEach((card) => {
      sync(card);
      if (card.step > card.queue.length) card.step = card.queue.length;
      if (card.el.dataset.state === "results") paint(card);
    });
  }
  document.querySelectorAll(".modal-scrim").forEach((scrim) => {
    new MutationObserver(() => { if (scrim.hidden) setTimeout(refreshAll, 0); })
      .observe(scrim, { attributes: true, attributeFilter: ["hidden"] });
  });

  /* ---------------------------------------------------------
     Filter by assistant — hides the blocks the chosen assistant
     doesn't own so the grid reflows around what's left. Clicking
     the active chip clears the filter.
     --------------------------------------------------------- */
  const chips = document.querySelectorAll("#assistantFilters .assistant");
  const grid = document.getElementById("aiBlocks");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const on = chip.getAttribute("aria-pressed") !== "true";
      chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip && on)));
      document.querySelectorAll(".aicard[data-assistant]").forEach((block) => {
        // A block can be owned by more than one assistant (Searches, AML).
        const owners = block.dataset.assistant.split(" ");
        block.classList.toggle("is-filtered", on && owners.indexOf(chip.dataset.assistant) === -1);
      });
      // The spacer only exists to square off the unfiltered grid.
      if (grid) grid.classList.toggle("is-filtering", on);
    });
  });

  /* ---------------------------------------------------------
     Halo Ai Chat promo — dismissing it frees the first slot, so
     the spacer comes back to square the grid off.
     --------------------------------------------------------- */
  (function promo() {
    const cell = document.getElementById("chatPromo");
    if (!cell || !grid) return;
    grid.classList.add("has-promo");
    const close = cell.querySelector(".promo__close");
    if (close) close.addEventListener("click", () => { cell.remove(); grid.classList.remove("has-promo"); });
  })();

  /* ---------------------------------------------------------
     Bills & payments bar chart — £0–£30k over a 104px plot.
     --------------------------------------------------------- */
  (function chart() {
    const host = document.getElementById("chartBarsNew");
    if (!host || typeof CHART_DATA === "undefined") return;
    const pct = (v) => (Math.max(0, Math.min(v, CHART_MAX)) / CHART_MAX) * 100;
    host.innerHTML = CHART_DATA.map((d) =>
      '<div class="bar-col">' +
        '<div class="bar-col__bars">' +
          '<i class="bills" style="height:' + pct(d.bills) + '%"></i>' +
          '<i class="pay" style="height:' + pct(d.pay) + '%"></i>' +
        "</div>" +
        '<span class="bar-col__label">' + esc(d.label) + "</span>" +
      "</div>"
    ).join("");
  })();

  /* ---------------------------------------------------------
     PAF deadline countdown — starts at 01:50:56.
     --------------------------------------------------------- */
  (function countdown() {
    const el = document.getElementById("pafTimerNew");
    if (!el) return;
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
})();
