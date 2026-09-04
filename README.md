# 31594 — Ai Matter Workspace (HTML prototype)

A working prototype of the Ai Matter Workspace, built from the
**"31594 - Ai workspace"** section of Halo-v2
(`figma.com/design/9rQoyz7sTF60B8TcPlPxCN`, section `5548:485769`).

Plain HTML, CSS and JS — no build step. Open `index.html`, or serve the
folder if your browser blocks local files:

```
cd Prototype
python3 -m http.server 8000
# then open http://localhost:8000
```

---

## The eight screens

Each designed frame has a deep-link route so you can jump straight to it.
They are also all reachable by using the prototype normally.

| Route | Figma node | Screen |
|---|---|---|
| `#start` | `5548:485770` | New tab / start — all task types |
| `#thinking` | `5548:486799` | Thinking — three lanes |
| `#loaded` | `5548:486991` | Full caseload loaded |
| `#loaded-edit` | `5548:487233` | Full caseload loaded, toolbar editing |
| `#comms` | `5548:487480` | Communications only |
| `#comms-edit` | `5548:487597` | Communications only, toolbar editing |
| `#comms-start` | `5548:485875` | Start with the task type narrowed |
| `#comms-thinking` | `5548:486894` | Thinking — one lane |
| `#search` | `5570:491832` | Accessing search |

`#thinking` and `#comms-thinking` hold still for review. Reached by
pressing **Organise**, it plays out as a sequence (below) and then advances.

Every route restores the whole screen the frame was drawn with — one hour,
the route's task types, the whole caseload, no open tabs, nothing cleared
and nothing handed over from Ask Halo — so a prompt, a cleared card or an
earlier session cannot leak into a review screen.

Reference exports of every frame are in `reference/`.

---

## Tickets

| Ticket | Where it lives |
|---|---|
| [33592 Sidenav update](https://dev.azure.com/Setfords/Halo%20AI/_workitems/edit/33592) | `renderRail()` in `app.js`, `.rail` in `styles.css`. Hamburger collapses the rail to an 88px icon rail; Head office / Reports / Settings expand. |
| [33591 Top nav update](https://dev.azure.com/Setfords/Halo%20AI/_workitems/edit/33591) | `.topbar`, `renderTabs()`. Search bar opens the overlay; a tab is a matter scope (see below), and a single-matter scope also gets Halo's matter header from frame `5713:504592`. |
| [33587 Animated Ai ring](https://dev.azure.com/Setfords/Halo%20AI/_workitems/edit/33587) | `orb.js` — the real AI Orb (see below), idle on the hero and the Ask Halo button, thinking while the columns load. |
| [33588 Pre-canned opening prompt](https://dev.azure.com/Setfords/Halo%20AI/_workitems/edit/33588) | `promptRow()`. "I have `1` `Hour` Let's take a look at `All task types` for `All matters`" — every control live. |
| [33593 Workload delivery](https://dev.azure.com/Setfords/Halo%20AI/_workitems/edit/33593) | `workload.js`. Packs the task pool into the time asked for and groups it into lanes. |
| [33590 Pre-canned prompt toolbar](https://dev.azure.com/Setfords/Halo%20AI/_workitems/edit/33590) | `renderToolbar()`. Summary state, editing state, Refresh, and the Loop Daily switch. |
| [33748 Task cards](https://dev.azure.com/Setfords/Halo%20AI/_workitems/edit/33748) | `cardHTML()`. Four kinds — standard, document, message, blocked — with Skip / secondary / primary all wired. |

---

## The prompt

**Duration** — type any number, then pick **Minutes**, **Hours**, **Days**
or **Months**. A working day is 7.5 hours and a working month is 20 of
those, not 24 hours and not 30 days.

**Task types** are multi-select, and you get one column per type in
scope, always in Finance → Operations → Communications order however you
picked them. At least one has to stay selected. The pill names them while
two still fit (`Finance + Operations`) and counts them after that.

**Matters** are multi-select and searchable across the whole caseload —
all 103 open matters, not just the ones the designs name. One flat list in
caseload order: type to filter on any field and tick as many as you like,
and a ticked matter stays where it sits rather than jumping to a separate
group. No selection means the whole caseload. The list stays open while
you tick; the footer keeps count (and, while filtering, how many of the
103 matched) and **Clear** drops back to all matters.

The field lists the refs comma-separated while they still read at a glance
— `A25/1, P124/1, B12/2` — and says `4 matters selected` past three. The
toolbar sentence collapses past two instead, since a list of refs does not
read as prose there. The flyout takes the field's position once and keeps it:
relabelling the pill changes its width and, in a centred row, its left
edge, so re-reading it on every tick made the flyout crawl sideways.
Only a scroll or a resize re-anchors it.

---

## Tabs

Every tab **is** a matter scope: `{ id, refs: [...] }`. It labels itself
from that scope — an empty list reads `All Client Matters`, one matter
reads `A25/1 · Adrian Adamson`, several read as the bare refs
comma-separated (`A25/1, P124/1, B12/2`), truncated with the full list on
hover. There is no special "all matters" tab; the one you start with is
simply an unfiltered one.

**`+` opens a new tab**, also unfiltered, and it relabels itself as soon
as its scope is filtered. The last tab has no close button, since there
always has to be one.

**Each tab keeps its own workspace** — its prompt, its columns, which cards
you have cleared and how many minutes that came to. Leave a tab and come
back and you find it exactly as you left it; a tab you have never organised
opens on the start screen scoped to its matters. `state` stays the live
working copy, and switching tabs parks it on the outgoing tab and takes
over the incoming one's, so nothing else has to reach through the tab to
render. Clicking the tab you are already on does nothing. An organise
still running when you switch away is abandoned rather than resumed, and
its columns can never land on the tab you moved to.

## Nothing applies until Organise

Every prompt control — duration, task types, matters — edits a **draft**.
The pill labels update as you go, so you can see what you have picked, but
the tab label, the matter strip, the toolbar summary and the columns all
stay on the last organised prompt until **Organise** commits it. The
toolbar's **Cancel** throws the pending edit away, and **Refresh** re-runs
what is on screen rather than whatever the row was left set to.

The one immediate exception is opening a matter from search: that is an
explicit "take me to this file", so it applies at once and relabels the
tab.

---

## The Ai orb

`orb.js` is a vanilla `<ai-orb>` custom element wrapping the real
component at `~/Documents/ai-orb/orb.component.ts`. The shader, the
`SHAPE` constants and the uniform wiring are lifted **verbatim** — only
the Angular shell is swapped for a custom element so the prototype runs
without a build step. `orb.component.ts` stays canonical: re-extract from
it rather than tuning the shader here.

Three instances are on screen at most — the hero, the Ask Halo button and
the two chat avatars — each one a WebGL context, so they are placed in
the markup or reused rather than re-rendered.

Settings: `gain 3.4`, `bloom 0`, `ink-level 1`, and `background` set to the
surface behind each orb. The component's README suggests `~0.75` on a
light page; `1` keeps the rim colours exactly as picked, which reads
brighter against Halo's near-white surface. `diameter="1"` plus a circular clip makes the
host box *be* the orb, so no corner of the opaque canvas shows.

The hero orb is the same instance in both the start and thinking states, so
pressing **Organise** plays out as one move rather than a cut:

1. **500ms, all at once** — the greeting, strapline, prompt and Organise
   button rise and fade on a 50ms top-down stagger (200ms each, so the last
   is clear by 350ms) while the orb travels down to meet them, landing just
   after the last of them has gone.
2. **2.2s** — only once the orb has arrived does it switch to
   `state="thinking"` at speed 1.6, so the ring thickens into a solid disc
   and opens back out exactly once while the skeletons show. Then the cards
   land.

Two things worth knowing if you touch this. The orb is moved by transform
rather than by the layout, because the items it shares the column with are
still in flow while they fade — so `playOrganiseTransition()` works out the
target up front (with only the orb left, the hero's align/justify-center
put it dead centre of its own box) and the class swap at the end lands on
the same pixel, letting the transform be dropped without a jump. And the
departure `transition` lives on the `.is-departing` rule rather than on the
items: `.btn-organise` carries its own shorter transition for hover, and a
base rule loses to it, which made the button snap instead of fade.

An Organise from the toolbar skips the first beat, since there is no hero
on screen to fade — the orb simply arrives thinking. The whole sequence is
skipped under `prefers-reduced-motion`, and a route change or tab switch
cancels one already in flight.

This does move the thinking orb to the centre, where frame `5548:486799`
has it at y 382. The animated move reads better centred, and it is the
same orb either way.

---

## What actually works

**Search** — `Cmd/Ctrl+K`, the top-bar search field, or the `+` on the tab
strip. Every field on a matter is indexed, so any criteria finds it:
reference, client, matter description, matter area, the area the matter
used to sit under, fee earner, office, property address, postcode, status,
phone, email, dates, value. A result row is titled with the value that
matched — the query highlighted — so you can see *why* the matter came
back. `↑` `↓` to move, `Enter` to open, `Esc` to close.

Try `holly`, `advocacy`, `commercial`, `a25`, `GU9`, `sarah`, `lease`,
`pinewood`, `holbrook`, `07700 900412`, `closing`.

Opening a matter adds a tab, shows its details, and rescopes the prompt to
that matter — so **Organise** then plans only that file's work.

**Task cards** — **Skip** drops the task, the primary action signs it off
and credits the time, and the toolbar keeps a running "x mins cleared,
y mins left". Clearing the top card of a stack reveals the one behind it
and drops the section's time. The secondary action (Review / Preview /
Edit) would open the record itself, so it does nothing here.

There are no toast notifications. Anything outside the prototype — the
other sidenav destinations, the matter header's Actions and section tabs,
the card's secondary action, the sample card inside the Ask Halo chat —
simply sits inert rather than announcing itself.

**Blocked work** — the Trustpilot card stays locked, exactly as drawn,
until every finance and operations task is dealt with. Clear them and it
gains its actions.

**Scrolling** — the page is the only scroll container. Columns have no
`overflow` of their own; they grow with their content and the window takes
care of the rest. The rail, the top bar and the tab strip are `sticky`, so
they stay put however far down you go — a nav that scrolled away on a
103-matter caseload was clearly not the intent.

**The floating chrome** — the toolbar and the Ask Halo button are fixed to
the viewport and frosted (`backdrop-filter: saturate(180%) blur(20px)`),
so the columns scroll underneath and show through them; the button carries
a blue tint. The columns keep 104px of bottom padding so the last card can
scroll under the toolbar rather than stopping short of it.

**Soft load** — when the cards land they fade and lift in one after
another, 140ms apart in reading order across the three columns, 0.84s each
(about 1.8s for a full set). It runs only on the first paint after
Organise: the `is-entering` class is dropped afterwards so clearing a card
never re-animates the whole board.

**Ask Halo** — the button opens the chat panel. *Add to Comms tasks
(+10 Mins)* really does drop the work into the Communications column.

---

## The workload engine

`HALO.workload.build(prompt)` takes the prompt and returns the columns.

1. **Budget.** `amount × unit` in minutes.
2. **Scope.** Keep tasks in the chosen lanes and on the chosen matters.
3. **Dependencies.** A task with `requiresLanes` is only offered when
   those lanes are also in scope — there is no point drafting a closing
   letter for a file whose money and admin you have excluded from this
   session. This is what makes the Communications-only screen show just
   *Draft replies to clients*, as designed.
4. **Pack.** Most valuable work first, quicker task first on a tie, then
   fill greedily until the time runs out.
5. **Group.** Into lanes, then into section stacks in a fixed working
   order. The section's time is the sum of the tasks still in its stack;
   more than one task in a stack is what the peeking card behind means.

A 1-hour, all-task-types prompt plans 58 of the 60 minutes and reproduces
the designed columns exactly — Finance 16/14/3, Operations 10/1,
Communications 6/3/5. Ask for a month instead and it finds about 24 hours
of work across the caseload.

### The dataset

`data.js` holds 103 matters and 133 tasks. The 15 detailed matters and the
18 tasks at the top are the ones the Figma frames name, with their copy
taken verbatim; the rest of the caseload is generated below them in
clearly-marked blocks so the matter picker and the search bar have
something real to work with.

Three constraints on that generated work keep the designed screens exact,
and are worth preserving if you add more:

* **finance and operations only** — so a Communications-only prompt still
  plans just what frame `5548:487480` shows;
* **priority below the designed set** (which runs 30–99) — so the designed
  tasks are always chosen first;
* **never shorter than 3 minutes** — a 1-hour all-lanes prompt plans the
  designed 58 minutes and has 2 left, which nothing generated can fit
  into.

---

## Where this departs from the drawings

- **Search results sit below the tab row.** The Figma frame drops the
  results sheet on top of the "Recent Matters" tab, hiding it. Kept in
  flow here so the tab can say what you are looking at ("Recent Matters",
  or "3 matters" once you type). Row styling, dividers, sheet shadow and
  the highlight colour are all from the design.
- **Empty search shows recent matters** as *description / ref · client ·
  area*. The four rows in the frame are sample *matches*, which is what
  you get here as soon as you type.
- **The matter header** under the tab row is Halo's real one, taken from
  frame `5713:504592` — ref, divider, client and matter, status tag, date
  range, matter area path, phone and email, Actions, a collapse toggle,
  and the section tab row with Workspace active. It appears when exactly
  one matter is in scope. Two notes: the drawing marks the active section
  tab with a white caret that merges it into the page beneath, which reads
  as a white blob over this translucent strip, so the brand underline used
  on the search panel's tabs stands in; and the third level of the area
  path (`… / Purchase`) is derived from the verb the matter description
  leads with, since the dataset carries a two-level area.
- **Multi-select, months, the searchable picker, self-labelling matter
  tabs, deferring changes to Organise, the frosted fixed chrome,
  page-level scrolling and the staggered card entrance** are all later
  asks, not in the frames.
- **Sub-navigation items** behind the Head office / Reports / Settings
  chevrons are invented — the chevrons had to lead somewhere.
- **Empty-lane copy** ("Nothing outstanding in finance for this session")
  is not drawn; it is what a lane needs once you clear it.
- **The orb replaces the flat ring asset** in the frames, because ticket
  33587 asks for it to animate.
- **Nothing is pill-shaped.** The frames draw the selected nav item, the
  Log out and Organise buttons, the card Skip action, the Ask Halo button
  and the search overlay's field as fully rounded; all of them are 12px
  rounded squares here. The Loop Daily switch keeps its pill track, since
  that is what makes it read as a switch, and the orb and avatars stay
  circular.
- **Section times read consistently** (`1 min` / `5 mins`). The frames
  mix "3 min" and "5 Mins".

## Files

```
index.html     shell markup
styles.css     tokens + every component
data.js        103 matters and the task pool
workload.js    ticket 33593 — the packing engine
orb.js         ticket 33587 — <ai-orb>, extracted from orb.component.ts
search.js      the any-criteria matter index
app.js         state, rendering, and all the wiring
assets/        icons and the logo, exported from Figma
reference/     Figma exports of the nine frames
```
