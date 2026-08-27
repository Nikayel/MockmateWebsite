# Sprint Labs — UX spec

Binding for W4 (screens) and W5 (agent panel). One section per screen:
**Purpose · Layout · Component map · States · Interactions · Objectives surfacing · Copy notes.**

Source documents this spec obeys: `WORKBOOK-SPEC.md` (product, §4 flow, §5 scoring),
`SPRINT-PLAN.md` (content shapes), `EXECUTION-STATE.md` (owner decisions),
`AUTHORING-RULES.md` §6 (voice), `AGENT-CONTEXT.md` §3/§6/§7 (agent layers, modes, learner model),
and `.superpowers/sdd/PLAN/w1-a-caselabs-ui.md` (what already exists).

Where this spec names a component with no `NEW` marker, it exists today at the path given and is
reused as-is. Anything marked **NEW** carries a one-line contract at its first mention and is
indexed in §1.8.

---

## 1. Decisions that bind every screen

### 1.1 Token family: `--wb-*`, one family per screen

Sprint Labs is the same workbook surface family as Case Labs and uses the **`--wb-*` tokens
verbatim**. No parallel palette: it is the same kind of work (long reading plus writing, which is why
that surface is light-by-default in a dark-first app), the accent already resolves correctly in both
themes, and a second clay would put two near-identical browns on `/labs` where both catalogs sit.

The tokens are class-scoped, not `:root`-scoped. **One CSS change, in `app/globals.css`:** add
`.workbook-surface` as a second selector to **all five physical `.case-lab-workbook` rules** (S6).
It is five, not four: the form-control look is two separate rules, base and `:focus-visible`.

```css
.case-lab-workbook, .workbook-surface { /* light values, ~line 355 */ }
.dark .case-lab-workbook, .dark .workbook-surface { /* dark values, ~line 400 */ }
.case-lab-workbook :is(textarea, input):not(...), .workbook-surface :is(textarea, input):not(...) { }
.case-lab-workbook :is(...):focus-visible, .workbook-surface :is(...):focus-visible { }
.case-lab-workbook ::placeholder, .workbook-surface ::placeholder { }
```

No token values change, so Case Labs cannot regress. Sprint Labs roots every screen in
`<main className="workbook-surface ...">` and never adds `case-lab-workbook`.

**Hard rule: do not mix families on one screen.** Inside a Sprint Labs screen use
`bg-[var(--wb-card)]`, `text-[var(--wb-text)]`, `border-[var(--wb-border)]`, never `bg-card`,
`text-muted-foreground`, `border-border`, `bg-primary`. Note that `components/labs/stations/
BuildStation.tsx` violates this today (it renders `text-muted-foreground` and `border-primary/40`
inside the workbook surface). Copy its *structure*, not its class names.

**Portals are outside the surface (S4).** Radix `Dialog`, `AlertDialog`, `Tooltip`, `DropdownMenu`
and `Select` render their content through a portal to `document.body`, so `--wb-*` is **not in
scope** there and a `var(--wb-text)` inside portaled content resolves to nothing. Two legal ways
out, and the first is the house preference: put `workbook-surface` on the portal content element
itself (`<DialogContent className="workbook-surface">`) and keep using `--wb-*`, so the dialog stays
in the workbook's palette. Otherwise use global tokens throughout that portal. Never half and half
inside one portal.

Status colors, fixed for the whole surface:

| Meaning | Token |
|---|---|
| passing / done | `--wb-success` |
| active / current | `--wb-accent`, `--wb-accent-soft` fill, `--wb-accent-strong` text |
| pending / locked | `--wb-disabled` on `--wb-track` |
| failing | `text-destructive` is the one deliberate global-token exception, because `--wb-*` has no failure hue. Always paired with an icon and a word, never color alone. |

### 1.2 Routing: Pattern B, and Sprint Labs owns its own path

`/labs` stays the shared chooser page. The Sprint Labs surface lives under `/sprint-labs/**` rather
than nesting into `app/labs/[labId]`, whose `dynamicParams = false` + `generateStaticParams` contract
must not be perturbed.

```
app/labs/page.tsx                                    Server, static (ISR 300s). CHOOSER. Screen 1.
app/sprint-labs/[workbookId]/layout.tsx              Server, metadata + BreadcrumbJsonLd + Course JsonLd,
                                                     generateStaticParams, dynamicParams = false.
app/sprint-labs/[workbookId]/page.tsx                Server, static (ISR 300s), INDEXABLE. Screen 2.
app/sprint-labs/[workbookId]/run/layout.tsx          "use client" guard + force-dynamic + noindex.
                                                     Wraps screens 3-10. Auth-gated (two layers).
app/sprint-labs/[workbookId]/run/standup/page.tsx    Screen 3
app/sprint-labs/[workbookId]/run/board/page.tsx      Screen 4
app/sprint-labs/[workbookId]/run/ticket/[key]/page.tsx            Screen 5
app/sprint-labs/[workbookId]/run/ticket/[key]/workspace/page.tsx  Screen 6
app/sprint-labs/[workbookId]/run/ticket/[key]/submit/page.tsx     Screen 7
app/sprint-labs/[workbookId]/run/ticket/[key]/review/page.tsx     Screen 8
app/sprint-labs/[workbookId]/run/ticket/[key]/retro/page.tsx      Screen 9
app/sprint-labs/[workbookId]/run/summary/page.tsx                 Screen 10
app/sprint-labs/loading.tsx                          <SparraLoader fullPage label="Loading Sprint Labs…" />
```

The `run/` layout carries `export const dynamic = "force-dynamic"` and
`export const metadata = { robots: { index: false, follow: false } }`, mirroring
`app/learn/python/[levelSlug]/[lessonId]/workspace/`. Add `isSprintLabRunPath` to `proxy.ts` beside
`isLessonWorkspacePath` so anonymous requests bounce before render. Screens 3-10 serialize ticket
bodies, visible tests and gate results; none of it may ever be static or indexed.

**Why real segments and not one client page that switches.** Resume, the back button, and
"score finalizes at first submit" all need a URL. Each phase route runs one guard: resolve the
learner's furthest legal phase for that ticket and `router.replace` if the URL is ahead of it, so
`/retro` cannot be reached before finalization by typing it.

**Flag gating.** The flag is **`SPRINT_LABS_ENABLED`** in `lib/feature-flags.ts` `FLAGS` (default
`false`) (S5). Use that exact name everywhere; earlier drafts of this spec said `SPRINT_LABS`, which
does not exist. It needs real readers so it never joins the orphan list: (a) `app/labs/page.tsx`
(`await getFlagAsync("SPRINT_LABS_ENABLED")`, page is `revalidate = 300` so the owner's flip lands
within five minutes on a page that must stay static and indexable), (b)
`app/sprint-labs/[workbookId]/layout.tsx` (`notFound()` when off, checked **before** the id lookup so
an unknown id and a flag-off id fail the same way), (c) the sitemap and any JsonLd emitter. When off,
`/labs` renders byte-identically to today. Assert that with a test, and assert the JsonLd omission in
the same test: the section, the strip and the emitted `Course` entries all disappear together.

### 1.3 Chrome

- **Public pages** (screens 1, 2): global `<Header />` above, `<Footer />` below, workbook surface in
  between. Same split as `app/labs/page.tsx`: nav keeps the app's dark chrome, content is the
  light-by-default workbook.
- **Run pages** (screens 3-10): no global header. `SprintLabTopBar` **NEW** — 48px compact top bar,
  the convention from `app/labs/[labId]/page.tsx:93-147` and `InterviewTopBar.tsx`: back affordance,
  workbook name, sprint pill (`Sprint 3 of 10`), ticket key when on a ticket route, the "what the
  agent knows about you" button on workspace only, `<ThemeToggle />` last. No nav links.
  *Contract: `{ workbookTitle, sprintNumber, sprintCount, ticketKey?, backHref, rightSlot? }`.*
- Screens 3-10 are `h-screen flex flex-col` with the top bar `shrink-0` and the body `min-h-0
  flex-1`, so only inner panes scroll.

### 1.4 Objectives are first-class, and they are one component everywhere

Owner decision 3. Objectives appear on **catalog, overview, standup, board card, ticket, workspace,
retro, and summary**. One pattern, two densities, so a learner recognizes an objective on sight.

`ObjectiveChip` **NEW** — *one objective as a chip: short label plus a state dot, `aria-expanded`
button that discloses the full "can do" sentence beneath it.*
`ObjectiveList` **NEW** — *a group of `ObjectiveChip`s with an "Expand all" toggle and an optional
heading; `density="chip"` wraps them inline, `density="full"` stacks label over sentence.*

```ts
type ObjectiveState = "not_started" | "practicing" | "demonstrated" | "escaped"
interface ObjectiveView { id: string; label: string; sentence: string; state: ObjectiveState }

interface ObjectiveListProps {
  objectives: ObjectiveView[]
  density: "chip" | "full"
  heading?: string
  /** S9. The heading's element. "none" renders the text as a styled span, not a heading. */
  headingLevel?: "h2" | "h3" | "h4" | "none" // default "h3"
  className?: string
}
```

**`headingLevel` is required whenever the list sits inside a card (S9).** A hard-coded `<h3>` inside
a card whose own title is an `<h4>` outranks the thing it belongs to and breaks the document
outline. Rule: a list rendered as a section of a page passes the level below that section's heading;
a list rendered *inside* a card passes `"none"`. Concretely, `WorkbookCard`'s "What you'll learn"
passes `headingLevel="none"`, and the overview's per-sprint lists pass `"h3"` under the section's
`<h2>`. In the same spirit, a card title inside a `<h2>` section is an `<h3>`, never an `<h4>`: do
not skip a level to match `CaseLabCard`, whose `<h4>` is correct only because it sits under the
gallery's round-group `<h3>`.

Render the chip group as a `<ul>` with one `<li>` per chip so the count is announced. `aria-labelledby`
on a role-less `<div>` is not exposed and does nothing.

`label` is the authored short form from `sprint.yaml` (three to five words: "Keyset pagination",
"Error taxonomy", "Tenant context per transaction"). `sentence` is the full "can do" line from
`SPRINT-PLAN.md`, unedited, for example: *"Scope tenant context to a transaction using
set_config(..., true) and prove, with a two-tenant pool of size one, that a released connection
cannot carry that context into the next request."*

State dot colors: `not_started` = `--wb-track`, `practicing` = `--wb-accent`,
`demonstrated` = `--wb-success`, `escaped` = `text-destructive` ring. The word is always in the
`title`/`aria-label`, never color alone.

Densities by screen: `full` on overview, standup, retro. `chip` on the board card (at most two, then
`+N`), ticket header, workspace side rail, summary grid.

### 1.5 Sable and Sparra

- **One Sparra on screen at a time.** The workspace chat panel owns the only Sparra on screen 6
  (`state="thinking"` while a reply streams). Screen 7 owns the only Sparra on the submit route
  (`state="scoring"`). This is another reason submit is its own route: two Sparras on one screen is a
  brand violation.
- **Scoring is determinate and never completes before the result lands.** Screen 7 passes real
  `progress` (`gatesSettled / gatesTotal`), never `scoreDurationMs`. When the last gate returns, and
  only then, swap to the one-shot `pass` or `fail` reaction.
- Sable is the persona for the partner chat. v0 is **chat only**: no edit tool, no bash, no test
  runner. Every surface that could imply otherwise says so in one line (§1.6).

### 1.6 Copy rules

- **No em dashes in learner-facing strings.** Site-wide rule, enforced by the existing guard test.
- **In-fiction where the content is.** Standup quotes, ticket bodies, `ai_policy_reason`, bot review
  comments and the retro's senior paragraph are Meridian's voice. Chrome, gates and scores are the
  platform's voice.
- **The ticket never lists the files to touch** (`AUTHORING-RULES.md` §6). No screen adds a "files
  you will probably want" affordance, no hint text, no pre-opened file. The workspace opens on
  `MERIDIAN.md`, not on a source file.
- **Calibration, never accusation.** The assisted-versus-unassisted delta reads
  *"Idempotency: with AI you ship this. Without it, not yet."* Never "you cheated", never "AI-assisted
  score (inflated)".
- **The sandbox line, verbatim and reused.** One exported constant so it cannot drift:
  `SANDBOX_NOTICE = "Server side isolated grading lands next month. Until then Sprint Labs runs
  TypeScript, JavaScript, Python and SQL in your browser."` It renders on the locked workbook card
  (screen 1), in the Sable panel's capability line (screen 6), and above the gate list (screen 7).
- Numbers are always named. "2 escaped" is never shown without the escaped defects' names beside it.

### 1.7 View-model contracts the screens assume

Storage schema is W3's job. These are the shapes the screens render, and screens are built against
them:

```ts
type AiPolicy = "assisted" | "unassisted" | "review-only"
type TicketStatus = "todo" | "doing" | "review" | "done"
type GateId = "visible" | "hidden" | "regression" | "adversary"
type GateStatus = "pending" | "running" | "passed" | "failed" | "skipped" | "errored"

interface TicketCardView {
  key: string            // "MER-305"
  title: string
  points: number
  labels: string[]       // "bug", "P1", "db"
  aiPolicy: AiPolicy
  aiPolicyReason?: string  // required when aiPolicy === "unassisted"
  status: TicketStatus
  objectives: ObjectiveView[]
  escapedCount?: number  // set once finalized
}

interface GateView {
  id: GateId
  status: GateStatus
  passed: number
  total: number
  escaped?: string[]     // curated humanNames only, hidden + adversary only
}

interface SprintView {
  number: number; title: string; topic: string
  goal: string; incitingQuote: { channel: string; time: string; body: string }
  archMapDelta: { added: string[]; changed: string[]; broke: string[] }
  objectives: ObjectiveView[]
  tickets: TicketCardView[]
  locked: boolean; lockReason?: "pro" | "sequence"
}
```

### 1.8 NEW component index

Each is new because nothing in `components/ui/`, `components/labs/` or `components/interview/`
covers it. Contracts are one line; props beyond these are an implementation choice.

| Component | Contract |
|---|---|
| `ObjectiveChip` | One objective as an expandable chip with a state dot. |
| `ObjectiveList` | A group of chips with "Expand all"; `density="chip" \| "full"`, `headingLevel="h2" \| "h3" \| "h4" \| "none"` (default `h3`). |
| `WorkbookCard` | One workbook in a catalog grid; `variant="playable" \| "locked"`; whole card is the link when playable, non-link when locked. |
| `SprintLabsSection` | The `/labs` section wrapper for the workbook grid: icon, heading, count pill, one-line definition. Mirrors `CaseLabGallery`'s group-header shape. |
| `SprintMap` | The ten-sprint list: number, title, topic, ticket and point counts, lock/current/done state, objective count. |
| `SlackQuote` | An in-fiction chat message block: channel, timestamp, body. Reused in standup and in ticket linked artifacts. |
| `ArchMapDelta` | Three labelled lists (added / changed / broke) rendered from `SprintView.archMapDelta`. |
| `SprintBoard` | Four fixed columns rendered from `TicketCardView[]`; no drag, no drop, no reordering. |
| `BoardColumn` | One column: heading, count pill, scrollable card list, empty line. |
| `TicketCard` | One ticket as a link to its ticket route, carrying key, title, points, labels, `AiPolicyBadge`, up to two objective chips, and `ai_policy_reason` when unassisted. |
| `AiPolicyBadge` | The policy as one small pill: assisted / no agent / review only. |
| `AiPolicyBanner` | The non-dismissible workspace banner carrying `ai_policy_reason` in fiction. No close control, ever. |
| `AcceptanceCriteria` | An ordered, checkable-looking list of criteria; read-only, no checkboxes the learner can tick. |
| `LinkedArtifacts` | Collapsible list of the ticket's attachments (Slack thread, PDF page, dashboard screenshot, prior ticket). |
| `WorkspaceFileTabs` | File tabs with a `Lock` glyph on read-only entries, grouped `docs / src / tests`; the BuildStation pattern extracted and re-tokenized. |
| `SableChatPanel` | Chat-only partner panel, policy-aware, forked from `CaseLabChat`. |
| `TurnStateStrip` | Layer D as one line above the composer: red visible tests, files changed, turn index, staleness marker. |
| `AgentKnowledgePanel` | Dialog listing the literal injected directive text with a per-entry mute toggle. |
| `GateSequence` | The four gates revealed in order, each a `GateCard`; owns the single scoring Sparra. |
| `GateCard` | One gate: name, one-line definition, status, counts, and for hidden/adversary the curated escaped names. |
| `EscapedDefectList` | Named escaped defects with the objective each maps to. |
| `ReviewThread` | The bot's review comments on the learner's diff with accept / push back controls. |
| `ReviewCommentCard` | One comment: author, file anchor, body, the learner's decision, and after finalization the verdict. |
| `DiffCompare` | Two read-only `CodeMirrorEditor`s side by side with a shared file picker and a per-file changed-lines count. |
| `EscapedDefectCurve` | Inline SVG line chart, escaped rate per sprint. No chart library. |
| `MasteryGrid` | Objectives grouped by topic with their state and attempt counts. |
| `ShareArtifactCard` | The "shipped N sprints on Meridian" card with model id and policy split, plus a copy-link action. |
| `SprintLabTopBar` | The 48px compact run-surface top bar (§1.3). |
| `SprintLabAuthGuard` | Client guard for `run/`, mirroring `LearnAuthGuard`. |

Reused as-is: `Header`, `Footer`, `ThemeToggle`, `Button`, `Badge`, `Card*`, `Collapsible*`,
`Dialog`, `AlertDialog`, `Textarea`, `Tooltip`, `Progress`, `Skeleton`, `MarkdownRenderer`,
`SparraLoader`, `Sparra`, `AnimatedEllipsis`, `CodeMirrorEditor`, `CodeMirrorErrorBoundary`,
`CodeConsole`, `TerminalOutput`, `StationHeader`, `CollapsiblePanel`, `BreadcrumbJsonLd`,
`CourseListJsonLd`.

---

## 2. Screen 1 — `/labs` chooser

**Purpose.** Send a visitor to the right surface in one screen: a one-sitting Case Lab or a
ten-sprint workbook. Case Labs' ranking, hero and SEO sections must come through untouched.

**Layout.** The existing page spine is preserved. **Two insertions only, and neither of them wraps
the Case Labs grid:** a 44px jump strip below the hero, and one new catalog section after the Case
Labs grid.

```
+----------------------------------------------------------------------+
|  <Header/>  (global dark chrome)                                      |
+----------------------------------------------------------------------+
|  h1  Decomposition interview practice, on a real codebase   [UNCHANGED]
|  p   The round Palantir FDSE and Stripe engineering interviews run.    |
|  [ Start with <starter lab> ]  [ How a lab works v ]                   |
|  Easiest lab - 45 min - no account needed                              |
|                                                                        |
|  ( Case labs )  ( Sprint labs )        <- jump strip, anchors, 44px    |
|                                                                        |
|  h2 Pick a case lab            [filters]   <- CaseLabGallery UNCHANGED |
|     id="case-labs" goes on THIS existing section. No new frame,        |
|     no new heading, no new definition line.                            |
|  +-- h3 round group ------------+  +-- h3 round group ------------+    |
|  |  [CaseLabCard] [CaseLabCard] |  |  [CaseLabCard] [CaseLabCard] |    |
|  +------------------------------+  +------------------------------+    |
|                                                                        |
|  +-- SPRINT LABS ------------------------------ 2 workbooks +          |
|  |  Ten sprints on one codebase. The repo remembers.        |          |
|  |  +--------------------+  +--------------------+          |          |
|  |  |  Meridian          |  |  Prove It (sbx)    |  LOCKED  |          |
|  |  |  [WorkbookCard]    |  |  [WorkbookCard]    |          |          |
|  |  +--------------------+  +--------------------+          |          |
|  +----------------------------------------------------------+          |
|                                                                        |
|  ---- border-t ----                                                    |
|  HowACaseLabWorks / CaseLabsExplainer / CaseLabsFaq / NextSteps  [UNCHANGED]
+----------------------------------------------------------------------+
|  <Footer/>                                                            |
+----------------------------------------------------------------------+
```

**The Case Labs region gets an anchor id and nothing else (C1).** An earlier draft of this section
drew a bordered "CASE LABS" box around `CaseLabGallery` and asked for a "matching section header".
Built literally, that produced a `rounded-2xl` frame inside a `rounded-2xl` frame (the gallery's own
round groups carry the identical class string), two `<h2>`s four lines apart ("Case labs" then the
gallery's own "Pick a case lab"), a definition line directly above a heading that already defines
the same thing, and roughly 170px of new chrome above the first lab card on the one page that was
rebuilt to lift that card above the 800px fold. Symmetry does not require a second frame:
`SprintLabsSection` already renders at exactly the round-group box's weight, so the two catalogs read
as siblings on their own. Put `id="case-labs"` on `CaseLabGallery`'s existing `<section>` and stop.
Resulting outline: `h1` → `h2` "Pick a case lab" → `h3` round groups → `h2` "Sprint labs".

**Why not tabs, and why not a two-card band.** Tabs hide one catalog from the initial DOM and put the
Case Labs SEO prose behind an interaction. A "choose a surface" card band pushes the first lab card
down roughly 200px on a page rebuilt specifically to lift it above 800px. The jump strip costs one
row, both catalogs stay in the static HTML, and the section headers do the choosing.

**Component map.**
- Existing: `Header`, `Footer`, `Button`, `CaseLabGallery`, `HowACaseLabWorks`, `CaseLabsExplainer`,
  `CaseLabsFaq`, `CaseLabNextSteps`, `BreadcrumbJsonLd`, `CourseListJsonLd`.
- NEW: `SprintLabsSection`, `WorkbookCard`. The jump strip is two anchors styled like
  `CaseLabGallery`'s `FilterChip` (44px min height, `aria-current` on neither, they are links).
- The only edit to `CaseLabGallery` is `id="case-labs"` on its existing `<section>` (C1). No header,
  no frame, no definition line, no change to the round-group headings underneath.

**`WorkbookCard` content**, in order, from `workbook.yaml`:

1. Title and one-line pitch. Meridian: *"Multi-tenant AI claims intake. You join at sprint 1 as the
   third engineer."*
2. Meter row: `10 sprints - 50 tickets - ~58 h - Mid to senior`. Level and hours are content, not
   code. sbx reads `7 sprints - 18 tickets - 12 to 16 h - Senior to staff`. **On a playable card the
   row ends with `First sprint free` (S8).** `/labs` is where the decision to click is made, so the
   card cannot be the one surface that stays silent about the paywall while the overview's CTA
   qualifier states it. Omit it on a locked card, which has no sprint to give away.
3. Topic list as middot-separated text, exactly the demoted-keywords treatment `CaseLabCard` uses:
   *"TypeScript - API contracts - Serialization - Postgres and RLS - Concurrency - Containers - AWS -
   Observability - AI in production - Verifying AI"*.
4. **What you'll learn**: `ObjectiveList density="chip"`, six chips maximum, drawn from sprint 1 and
   2 objectives, then `+N more` linking to the overview page. This is the objectives-first-class
   requirement at the top of the funnel.
5. Escaped-defect framing, one line: *"Graded on escaped defect rate: the share of hidden checks that
   get past you. It goes down over ten sprints, and that curve is the artifact."*
6. Footer: `Open` affordance (playable) or the lock state (below).

**States.**
- `playable`: the whole card is the click target for `/sprint-labs/meridian`, matching `CaseLabCard`.
  Because the objective chips must expand without navigating, this is a stretched link (an
  `absolute inset-0` `<Link>` carrying an sr-only accessible name) with the chip row as a `relative`
  sibling, not a `<Link>` wrapping everything. **Give `relative` to the chip row only.** A `relative`
  footer paints above the stretched link and swallows its own clicks, which makes the strip that says
  "Open" the one part of the card that does not open it. Pin it with a test.
- `locked`: rendered as a `<div>`, not a link, `aria-disabled` is not used (there is no control to
  disable). A `Lock` glyph sits beside the title, the card gets `--wb-panel` fill instead of
  `--wb-card`, and the footer carries `SANDBOX_NOTICE`. No hover lift, no accent border on hover. A
  quiet ghost link, *"What runs today"*, opens a `Dialog` explaining the browser runner and what the
  server sandbox adds. Never a dead "Open" affordance.
- `enrolled`: the Meridian card's footer swaps `Open` for `Resume: sprint 3, MER-303` plus a 3px
  progress bar using the `MilestoneRail` progress-bar markup (`--wb-track` under `--wb-accent`) and
  the label `12 of 50 tickets shipped`. Fetched by one authenticated call for the whole section, not
  per card. `CaseLabCard`'s own header comment explains why per-card resume fetches were removed;
  do not reintroduce that shape.
- `flag off`: `SprintLabsSection` and the jump strip do not render and `CourseListJsonLd` does not
  include workbooks. The `id="case-labs"` anchor is inert and may stay unconditional. The page is
  byte-identical to today apart from that one attribute.
- `signed out`: identical to signed in. The overview page is public; the wall is at `run/`.

**Interactions.** Jump strip anchors scroll to `#case-labs` / `#sprint-labs` (smooth scrolling and
its reduced-motion override are already global). Cards are whole-card links. No filters on the
Sprint Labs grid: two workbooks do not need narrowing, and URL filters on a small catalog were
already rejected on this page as a doorway-page generator.

**Objectives surfacing.** Six chips per card, expandable in place to the full "can do" sentence.
This is the first place a visitor meets the pattern, so the chips must expand without navigating.

**Copy notes.** The Sprint Labs section carries one definition line, in **sentence case** (S7),
because the sibling convention it sits beside is sentence case (`lib/labs/case-lab-rounds.ts`'s round
blurbs) and a lowercase word after a full stop reads as a typo:

> Sprint labs: *"Ten sprints on one codebase. The repo remembers what you did, and sprint 9 breaks
> the code you wrote in sprint 4."*

Case Labs keeps `CaseLabGallery`'s existing heading and needs no definition line of its own (C1). If
one is ever wanted, it is *"One scenario, one sitting."*, sentence case, and it replaces nothing.

---

## 3. Screen 2 — Workbook overview (`/sprint-labs/[workbookId]`)

**Purpose.** The join-the-team moment: what Meridian is, what you inherit, the ten-sprint arc, what
you will be able to do afterwards, and one button that starts or resumes.

**Layout.** Single column, `max-w-[900px]`, public page with global chrome.

```
+----------------------------------------------------------------------+
| <Header/>                                                             |
| < Back to labs                                                        |
| h1  Meridian                                                          |
| p   Multi-tenant API for AI claims intake. You join at sprint 1 as     |
|     the third engineer. The code you inherit is plausible and wrong.   |
| [ Start sprint 1 ]   10 sprints - 50 tickets - ~58 h - free first sprint
|                                                                       |
| +-- WHAT YOU INHERIT ----------------+  +-- HOW IT IS GRADED --------+ |
| | 61 files - 1,708 lines - 19 tests  |  | visible / hidden /         | |
| | strict:false, money as float,      |  | regression / adversary     | |
| | tenant filter one query forgets    |  | escaped defect rate        | |
| +------------------------------------+  +----------------------------+ |
|                                                                       |
| WHAT YOU'LL BE ABLE TO DO      [Expand all]                           |
| [ObjectiveList density="full", grouped by sprint, collapsed to label] |
|                                                                       |
| THE ARC                                                               |
| [SprintMap: 10 rows]                                                  |
|  1 Contracts        TypeScript, API contracts   5 tk  26 pt  FREE     |
|  2 Money & Time     Serialization               5 tk  26 pt  PRO      |
|  ...                                                                  |
| 10 The Agent's PR   Verifying AI                5 tk  24 pt  PRO      |
|                                                                       |
| [ Start sprint 1 ]  (repeat CTA)                                      |
| <Footer/>                                                             |
+----------------------------------------------------------------------+
```

**Component map.** Existing: `Header`, `Footer`, `Button`, `Collapsible*`, `MarkdownRenderer`
(pitch prose), `BreadcrumbJsonLd`, **`CourseJsonLd`** (S3) — singular, one `Course` for this
workbook, `workloadMinutes` from authored hours. `CourseListJsonLd` is the hub-page component and
belongs on `/labs`, not here; an earlier draft named it in both places. NEW: `SprintMap`,
`ObjectiveList`, `WorkbookOverviewCta`, `GradingOverviewPanel`.

**"What you inherit" renders only when the content carries it (S1).** The panel's facts (61 files,
1,708 lines, 19 test cases, and the named planted defects) are per-workbook authored content, and
the first draft of this spec specified the panel without specifying where the data lives. Add to the
workbook content schema, both optional:

```ts
seedStats?: { files: number; nonTestLines: number; testCases: number }
inheritedDefects?: string[]   // short, concrete, in the product's voice
```

When either is absent the panel is omitted entirely and "How it is graded" spans the row on its own.
**Never synthesize these numbers**, and never soften them into adjectives: "plausible and wrong" is
the thesis, the file count is the evidence.

**`SprintMap` row (S2).** Number, title, topic, ticket count, point count, and one state marker:
`done` (check, `--wb-success`), `current` (accent left border and `--wb-accent-soft` fill, exactly
the `MilestoneRail` active-row treatment), `available`, `pro` (small `Pro` pill), `locked by
sequence` (dim, `--wb-disabled`). Each row expands to the sprint goal plus its objective chips. Rows
are buttons only when they are navigable; a Pro row's whole surface is not a link, its `Pro` pill is.

`topic`, `ticketCount` and `points` are **required on the sprint record of any workbook that is
playable**, and the row renders them. They were missing from the first compiled shape, so the row
shipped as title plus objective count; the data comes from content authoring plus a small compiler
addition, and is owned by the stubs task. Until a given workbook carries them, degrade per field
(drop the missing one, keep the rest) rather than dropping the row or printing a zero. A points
column that reads `0 pt` is worse than no column: points are the unit the standup speaks in, and the
arc should agree with it.

**States.**
- `not enrolled`: primary CTA reads `Start sprint 1`, qualifier `Free for signed in users. Sprints 2
  to 10 need Pro.`
- `signed out`: same page, CTA reads `Sign in to start` and links `/login?redirect=/sprint-labs/
  meridian/run/standup`. The page stays fully readable and indexable.
- `enrolled, mid sprint`: CTA becomes `Resume: MER-303` and a secondary ghost link `Go to board`.
  Sprint map shows done, current and locked correctly. The CTA appears twice on this page (top and
  after the arc) and the map needs the same run, so all three read from **one** lookup owned by a
  single client wrapper (§16b). Three mounts each fetching for themselves means three authenticated
  round trips per page view, three Sparras during the wait, and three slots that can disagree.
- `enrolled, sprint complete`: CTA reads `Start sprint 4 standup`.
- `workbook complete`: CTA reads `See your summary`, links screen 10.
- `locked workbook (sbx)`: no CTA. A single `--wb-panel` panel with `SANDBOX_NOTICE` and a
  `Notify me` action only if a real notify endpoint exists; if it does not, omit it rather than ship
  a button that does nothing.
- `flag off`: `notFound()` from the layout.

**Interactions.** CTA is the only primary action on the page. Sprint rows expand in place; they never
navigate into a sprint the learner has not reached. Objectives expand in place.

**Objectives surfacing.** This screen is the objectives' home. `density="full"`, grouped under a
sprint heading, collapsed to labels with the full sentence one click away, plus one `Expand all`.
Every objective in the workbook is listed here and nowhere else in full.

**Copy notes.** The pitch is `WORKBOOK-SPEC.md` §3 in the product's voice, not the learner's. Say
what is wrong with the seed concretely (`strict: false`, money as a float rounded half-up, a webhook
row written as delivered before the HTTP call). Concrete beats adjectives, and it is the honest
description of what they are inheriting.

---

## 4. Screen 3 — Standup (`.../run/standup`)

**Purpose.** Start the sprint in fiction: what broke, what the goal is, what changed in the system
since last sprint, and what you will be able to do by Friday.

**Layout.** Reading screen, single column, `max-w-[760px]`, centered under the run top bar.

```
+----------------------------------------------------------------------+
| [SprintLabTopBar]  < Meridian    Sprint 3 of 10        [theme]        |
+----------------------------------------------------------------------+
|         SPRINT 3                                                      |
|         Tenants: make the database refuse                             |
|                                                                       |
|  +--[SlackQuote]------------------------------------------+          |
|  | SUP-2291 - P1 - escalated 07:41, Continental ops lead   |          |
|  | "Why is there a Bekins Van Lines claim in my queue?     |          |
|  |  I opened it. I read the adjuster's notes."             |          |
|  +---------------------------------------------------------+          |
|                                                                       |
|  SPRINT GOAL                                                          |
|  Move tenant isolation out of the WHERE clauses people have to        |
|  remember to write and into Postgres itself, then find the three      |
|  bills that move comes with.                                          |
|                                                                       |
|  WHAT CHANGED IN THE SYSTEM      [ArchMapDelta]                       |
|   added    migrations 0010-0012, app role meridian_app                |
|   changed  every repository call now runs inside a transaction        |
|   broke    the claims list is 4.2s for Continental since Tuesday      |
|                                                                       |
|  BY FRIDAY YOU CAN            [ObjectiveList density="full"]          |
|   - Write and test a Postgres RLS policy end to end        [v]        |
|   - Scope tenant context to a transaction                  [v]        |
|   - Diagnose an N+1 introduced by your own correctness fix [v]        |
|   ...                                                                 |
|                                                                       |
|  5 tickets - 26 points - about 6.7 hours   [ Open the board ]         |
+----------------------------------------------------------------------+
```

**Component map.** Existing: `StationHeader` (the `SPRINT 3` tag over an 18px title is exactly its
contract), `CollapsiblePanel`, `MarkdownRenderer`, `Button`. NEW: `SlackQuote`, `ArchMapDelta`,
`ObjectiveList`, `SprintLabTopBar`.

**States.**
- `first view`: as drawn. The primary CTA is the only way forward.
- `revisited` (learner navigates back mid-sprint): identical content, CTA reads `Back to the board`.
  Nothing on this screen is dismissed or hidden after first read; a standup is a document.
- `sprint 1`: `ArchMapDelta` has no `changed` or `broke` lists. Render only `added`, with the seed
  described as inherited: *"You are inheriting 61 files and 19 tests."*
- `pro wall`: reached only if a free learner navigates to sprint 2's standup. See §12.6. Standup
  content for a locked sprint is never rendered, not even blurred.
- `loading`: `<SparraLoader label="Loading standup…" />` inside the body, top bar already painted.

**Interactions.** One primary action. `SlackQuote` is not interactive. `ArchMapDelta`'s `broke`
entries are plain text on this screen, not links, because the ticket that fixes each one is the
learner's to find on the board.

**Objectives surfacing.** `density="full"`, all of the sprint's objectives, collapsed to labels.
Heading is *"By Friday you can"*, which is the "can do" framing in the sprint's own voice.

**Copy notes.** The quote is authored content, rendered verbatim with its channel and timestamp.
Never paraphrase it into platform voice. The goal paragraph is `SPRINT-PLAN.md`'s sprint goal
sentence, unedited.

---

## 5. Screen 4 — Board (`.../run/board`)

**Purpose.** The sprint's work, visible at once, in the four states a real board has. Answer "what
is left" and "what can I pick up" without a click.

**Layout.** Four fixed columns, desktop first, `min-w-[240px]` each, horizontal scroll inside the
board region only (the page body never scrolls sideways).

```
+----------------------------------------------------------------------+
| [SprintLabTopBar]  < Meridian   Sprint 3 of 10   [Standup] [theme]    |
+----------------------------------------------------------------------+
| Tenants: make the database refuse        11 of 26 points   [====----] |
+----------------------------------------------------------------------+
| TODO (2)        | DOING (1)      | REVIEW (1)     | DONE (1)          |
| +-------------+ | +------------+ | +------------+ | +--------------+  |
| | MER-304  5p | | | MER-303 5p | | | MER-302 8p | | | MER-301 3p   |  |
| | Claims list | | | PR #418    | | | Make the   | | | Continental  |  |
| | is 4.2s ... | | | reset ...  | | | database   | | | can see ...  |  |
| | [bug][P2]   | | | [review]   | | | refuse     | | | [bug][P1]    |  |
| | (assisted)  | | | (review    | | | (assisted) | | | 0 escaped    |  |
| | #rls #index | | |   only)    | | | in CI...   | | | #rls         |  |
| +-------------+ | +------------+ | +------------+ | +--------------+  |
| | MER-305  5p | |                |                |                   |
| | CX-88431 was| |                |                |                   |
| | billed twice| |                |                |                   |
| | [NO AGENT]  | |                |                |                   |
| | "we are not | |                |                |                   |
| |  shipping a | |                |                |                   |
| |  race fix   | |                |                |                   |
| |  nobody on  | |                |                |                   |
| |  the team   | |                |                |                   |
| |  can defend"| |                |                |                   |
| +-------------+ |                |                |                   |
+----------------------------------------------------------------------+
```

**Interaction model: no drag and drop, and the board says so.** Status is a consequence of what the
learner does, never a thing they set:

| Transition | Caused by |
|---|---|
| TODO to DOING | Opening the workspace on that ticket |
| DOING to REVIEW | A submission that runs the gates |
| REVIEW to DONE | Finishing the retro |
| any to TODO | Nothing. There is no undo. |

Only one ticket may be in DOING at a time. Opening a second ticket's workspace prompts: *"MER-303 is
in progress. Switch to MER-304? Your MER-303 work is saved."* `AlertDialog`, confirm switches, cancel
stays.

**Component map.** Existing: `Progress` is not used; reuse `MilestoneRail`'s inline progress-bar
markup so the two surfaces match. `Badge` for labels. NEW: `SprintBoard`, `BoardColumn`, `TicketCard`,
`AiPolicyBadge`.

Columns are `<section>` with an `<h3>` heading plus a count; each column's cards are a `<ul>` of
`<li><Link>`. Because they are links in DOM order, tab order is already correct and no roving
tabindex, no `role="application"`, and no keyboard drag affordance is needed. This is the single
largest reason not to build drag and drop in v1.

**`TicketCard` content.** Key and points on one line; title on two lines maximum, not truncated
(enforce fit in a content test, the way `case-labs-registry.test.ts` enforces `CaseLabCard`'s hook,
rather than with `line-clamp`); labels as `Badge`s; `AiPolicyBadge`; up to two objective chips then
`+N`; and, when `aiPolicy === "unassisted"`, the `ai_policy_reason` in fiction, quoted, at
`--wb-text-secondary`. That reason is required on the board card by `AUTHORING-RULES.md` §6, so it is
part of the card, not a tooltip.

**States.**
- `default`: as drawn.
- `empty column`: one quiet line at `--wb-faint`. TODO empty reads *"Nothing left to pick up."*
  DONE empty reads *"Nothing shipped yet."*
- `sprint complete` (all five DONE): a full-width band above the columns: *"Sprint 3 shipped. 26 of
  26 points. 2 escaped defects across 5 tickets."* with `[ Sprint 4 standup ]`. The board stays
  readable underneath.
- `ticket finalized`: DONE cards show `0 escaped` in `--wb-success` or `2 escaped` with the
  destructive icon plus word, and the escaped names live on the retro, not here.
- `loading`: four column skeletons using `Skeleton`, headings already painted from the sprint view.
- `error`: one `--wb-panel` panel spanning the board area: *"Couldn't load the board."* plus a Retry
  button. Never a partially-populated board.

**Objectives surfacing.** `density="chip"`, at most two per card plus `+N`. Expanding a chip on a
card must not navigate; use `stopPropagation` on the chip, or, better, render the chip row outside
the `<Link>` in the DOM and position it inside the card visually, so a nested interactive element
never sits inside an anchor.

**Copy notes.** Column names are `TODO / DOING / REVIEW / DONE`, uppercase, because that is what the
fiction says. The board header shows points, not percent: points are the unit the standup used.

---

## 6. Screen 5 — Ticket (`.../run/ticket/[key]`)

**Purpose.** Hand over a real ticket. Everything needed to decide what to do, nothing that says
where to do it.

**Layout.** Two columns on desktop, ticket body left, metadata rail right.

```
+----------------------------------------------------------------------+
| [SprintLabTopBar]  < Board   MER-305   Sprint 3 of 10       [theme]   |
+----------------------------------------------------------------------+
| MER-305  CX-88431 was extracted and billed twice        | POINTS  5   |
| [bug] [P1] [billing]                                    | POLICY      |
|                                                         | [NO AGENT]  |
| +--[AiPolicyBanner: non-dismissible]-----------------+  | OBJECTIVES  |
| | No agent on this ticket. "We are not shipping a    |  | [chip] [chip]
| | race fix nobody on the team can defend at 2am."    |  | [chip]      |
| +----------------------------------------------------+  | ADVERSARY   |
|                                                         | yes         |
| Support reopened CX-88431 this morning. The claim was   |             |
| extracted twice and billed twice. Ops swears they only  |             |
| clicked submit once, and the audit log agrees...        |             |
|                                                         |             |
| ACCEPTANCE CRITERIA                                     |             |
|  1. A repeat submission of the same claim reference     |             |
|     within a tenant cannot create a second extraction.  |             |
|  2. The failure is visible to the caller as a stable    |             |
|     error code, not a 500.                              |             |
|  3. The fix holds under two concurrent requests.        |             |
|                                                         |             |
| LINKED                                    [LinkedArtifacts]           |
|  > #support-escalations thread, 4 messages                            |
|  > CX-88431 audit log extract                                         |
|  > SUP-2291 (sprint 3, closed)                                        |
|                                                                       |
| [ Open workspace ]        5 points - visible tests run in your browser|
+----------------------------------------------------------------------+
```

**Component map.** Existing: `CaseLabBrief`'s prose-block treatment is the model for the body
container, but the body itself is authored Markdown so it renders through `MarkdownRenderer` inside a
`--wb-main` panel; `CollapsiblePanel` for linked artifacts; `Badge`; `Button`. NEW: `AiPolicyBanner`,
`AiPolicyBadge`, `AcceptanceCriteria`, `LinkedArtifacts`, `SlackQuote` (reused inside artifacts).

**States.**
- `assisted`: no banner. The rail's policy row reads `Assisted` with a tooltip: *"Sable can read the
  repo and talk it through with you. Sable cannot edit files or run tests."*
- `unassisted`: `AiPolicyBanner` above the body, non-dismissible, no close control, carrying
  `ai_policy_reason` verbatim in fiction. Rail badge reads `NO AGENT`.
- `review-only`: banner reads *"An agent already wrote this diff. Your job is to decide what ships."*
  The primary CTA changes to `Open the PR` and routes to screen 8 instead of screen 6.
- `in progress`: CTA reads `Back to workspace`, with a second line: `3 visible tests red - last
  edited 12 minutes ago`.
- `submitted, not finalized`: CTA reads `See CI`, routing to screen 7.
- `done`: CTA reads `See retro`. A `--wb-success` bordered strip above the body: `Shipped. 1 escaped
  defect.`
- `pro-locked ticket`: not reachable; the board that lists it is behind the same wall.
- `not found`: `notFound()`. Never a 200 panel, per the `/labs/[labId]` precedent.

**Interactions.** One primary CTA. Linked artifacts are collapsible and closed by default, except the
first one, which is open, because the pasted Slack thread is usually the actual ticket. Acceptance
criteria are read-only; there are no checkboxes, because the gates decide whether a criterion is met.

**Objectives surfacing.** `density="chip"` in the rail, every objective the ticket maps to. Chips
expand inline in the rail. Heading `OBJECTIVES`, and under the last chip, one line at
`--wb-faint`: *"These are what this ticket is measuring."*

**Copy notes.** The body is authored Jira voice with the wrong repro left wrong. The platform adds
no summary, no "hint", no "you will probably want to look at". The CTA's qualifier line is the only
platform voice on the screen and it says where tests run, not where code lives.

---

## 7. Screen 6 — Workspace (`.../run/ticket/[key]/workspace`)

**Purpose.** Do the work: read the repo, edit the unlocked files, run the visible tests, and talk to
Sable under the ticket's policy.

**Layout.** Three panes. The file tree and the chat are collapsible; the editor never is.

```
+----------------------------------------------------------------------+
| [SprintLabTopBar] < MER-305  Sprint 3  [What the agent knows] [theme] |
+----------------------------------------------------------------------+
| +--[AiPolicyBanner]--------------------------------------------+     |
| | No agent on this ticket. "We are not shipping a race fix      |     |
| | nobody on the team can defend at 2am."                        |     |
| +---------------------------------------------------------------+     |
+-----------+--------------------------------------+-------------------+
| FILES     | [MERIDIAN.md*] [claims.ts] [x.test]  | SABLE             |
|           +--------------------------------------+                   |
| v docs    |                                      | Repo blind on     |
|  MERIDIAN | [CodeMirrorEditor]                   | this ticket, and  |
|  .md    L |                                      | that is           |
|  MAP.md L |                                      | deliberate.       |
| v src     |                                      |                   |
|  claims   |                                      | [messages]        |
|  outbox   |                                      |                   |
| v tests   |                                      |                   |
|  visible  |                                      |                   |
|           +--------------------------------------+ [TurnStateStrip]  |
| TICKET    | [Run visible tests]  7/10 passing    | 3 red - 2 files   |
| MER-305   +--------------------------------------+   - turn 7        |
| [chips]   | [CodeConsole]                        | [composer.......] |
|           |  x duplicate submit creates two rows |                   |
| [Submit]  |    AssertionError: expected 1, got 2 |                   |
+-----------+--------------------------------------+-------------------+
```

Grid: `lg:grid-cols-[220px_minmax(0,1fr)_300px]`, the `CaseLabShell` proportions widened for the
chat, which now carries a state strip and a composer. Left rail is `--wb-sidebar`, center is
`--wb-main`, chat is `--wb-panel`, matching `CaseLabShell` exactly.

**Component map.**
- Existing: `CodeMirrorEditor` + `CodeMirrorErrorBoundary` (language per file, `readOnly` for locked
  files), `CodeConsole` (visible-test results; it already renders `TestResult[]` and `TestSummary`,
  and internally delegates to `TerminalOutput` when a `packRun` is present, so it stays the single
  console mount point), `Collapsible*`, `Button`, `Textarea`, `Sparra`, `AnimatedEllipsis`, `Dialog`,
  `AlertDialog`, `Badge`.
- NEW: `WorkspaceFileTabs`, `SableChatPanel`, `TurnStateStrip`, `AgentKnowledgePanel`,
  `AiPolicyBanner`.
- The whole pane is `BuildStation.tsx` re-tokenized and generalized: file tabs with a `Lock` glyph on
  read-only entries, editor, run button, results. Reuse its structure and its autosave partner,
  `useCaseLabRunSync` (1000ms debounce, flush on unmount and on `visibilitychange -> hidden`), as
  `useSprintLabWorkspaceSync`. Do not invent a second autosave policy.

**File tree and locked files.** Three groups, always in this order: `docs`, `src`, `tests`. `docs`
holds `MERIDIAN.md` and `.meridian/MAP.md`, both **readable and locked** (`Lock` glyph, `readOnly`
editor, no `onChange`). `MERIDIAN.md` is learner-readable and never learner-writable because it pipes
into the agent's context (`AGENT-CONTEXT.md` §3). `MAP.md` renders its mandatory first line as
authored: `generated at <sha> - <iso8601> - if the tree disagrees with this file, the tree is right.`
Do not style that line away; it is the anti-anchoring device.

The workspace opens on `MERIDIAN.md`, never on a source file, because opening on a source file would
answer the question the ticket exists to ask.

**Sable panel, policy-aware.** One panel, three states, driven by `ai_policy`:

| Policy | Panel header | Capability line | Empty state |
|---|---|---|---|
| `assisted` | `SABLE` | *"I can read this repo and talk it through. I cannot edit files or run tests."* | *"Ask about the code, or say what you are about to try."* |
| `unassisted` | `SABLE - REPO BLIND` | *"I cannot see your code on this ticket, and that is deliberate."* | *"I can talk about the concepts. I cannot look at what you wrote."* |
| `review-only` | `SABLE - PR AUTHOR` | *"I wrote this diff. I cannot run anything from here."* | *"Ask me why I did it this way."* |

`SANDBOX_NOTICE` renders as a second, quieter line directly under the capability line, on every
policy. The repo-blind state is a fact about the mount, not a promise (`AGENT-CONTEXT.md` §6): say it
in the first person, once, at the top of the panel, and never repeat it per message.

Forked from `CaseLabChat`: same message list with `role="log" aria-live="polite"`, same
Enter-to-send with Shift+Enter for newline, same signed-out inline gate, same one `Sparra
state="thinking"` while a reply is in flight, same soft error line that never blocks the rest of the
screen. Changed: it posts ticket and sprint context instead of milestone context, it carries the
turn strip, and its transcript persists server side (the transcript is scored input, so it cannot
live only in component state).

**`TurnStateStrip`** sits directly above the composer and renders layer D:
`3 visible tests red - 2 files changed - turn 7`. It is recomputed after every local test run and
every edit-debounce flush. On resume, before the first run of the session, it reads
`Run the visible tests to refresh this` at `--wb-faint` rather than showing a restored count, because
a stale red count is worse than none. This strip is the highest value-per-token item in the agent
design; it is not decorative.

**`AgentKnowledgePanel`** opens from the top bar, one click, titled **What the agent knows about
you**. It shows the **literal injected text** of each directive, not a summary, each with a `Mute`
toggle. Footer line: *"Muting is not recorded, not penalized, and not shown to the agent."* Never
render scores, readiness numbers or trait language here, because none of it is ever injected.

**States.**
- `loading`: `<SparraLoader label="Opening workspace…" />` in the center pane; rails render their
  headings immediately.
- `unsaved`: no explicit indicator. The debounce plus flush-on-hide makes "saving" noise; a failed
  save shows one destructive line above the console: *"Couldn't save your last edit. Retrying."*
- `run in flight`: run button shows a spinner and the label `Running…`; the console shows its own
  running state; the strip does not update until results land.
- `run failed` (harness or network): `CodeConsole`'s error path, and the strip keeps its last known
  values with a `stale` marker.
- `read-only file focused`: one line under the editor, *"Read only. This file is part of the brief."*
- `unassisted`: the chat composer is enabled (the tutor overlay is chat), but no repo context is ever
  sent; the banner stays pinned at the top of the whole screen, above the panes.
- `submission blocked` (budget spent, cooldown active): Submit is disabled with the reason beside it,
  never a silent disabled button. See §8.
- `signed out`: the run layout already bounced them. This state does not exist here.

**Interactions.** `Run visible tests` posts the editable files to the existing execute endpoint and
renders into `CodeConsole`. `Submit` opens the finalization `AlertDialog` (§8) and, on confirm,
routes to the submit screen. Cmd/Ctrl+Enter runs the visible tests. Cmd/Ctrl+S is intercepted and
does nothing except flush the autosave, so the browser save dialog never appears over the editor.

**Objectives surfacing.** `density="chip"` in the left rail under a `TICKET` heading, below the
ticket key. They are visible while working, which is the point: the objective is what is being
measured, and it should be readable without leaving the editor.

**Copy notes.** The banner text is authored, never generated. The capability line is one sentence in
Sable's own voice; the sandbox line below it is `SANDBOX_NOTICE` verbatim, so it cannot drift from
the other two places it appears.

---

## 8. Screen 7 — Submit / CI (`.../run/ticket/[key]/submit`)

**Purpose.** Run the four gates in order, in public, and name what got past you.

**Before this screen: the finalization warning.** Pressing Submit on the workspace opens an
`AlertDialog`, and it is the only modal in the product that must never be skippable:

> **This finalizes your score for MER-305.**
> Your score for this ticket is set by this run. Escaped defect names and the reference diff unlock
> after it. Re-attempts get a different hidden set and are labeled practice.
> Submissions left today: 2.
> `[ Cancel ]  [ Submit MER-305 ]`

Only shown in full before the *first* submission on a ticket. On a re-attempt the dialog reads:
*"Practice run. Your finalized score for MER-305 does not change."*

**Layout.** Single column, `max-w-[720px]`, one Sparra.

```
+----------------------------------------------------------------------+
| [SprintLabTopBar]  MER-305   Sprint 3 of 10                 [theme]   |
+----------------------------------------------------------------------+
|                          ( Sparra scoring )                           |
|                    Running the gates on MER-305                       |
|                                                                       |
|  Server side isolated grading lands next month. Until then Sprint     |
|  Labs runs TypeScript, JavaScript, Python and SQL in your browser.    |
|                                                                       |
|  +--[GateCard]--------------------------------------------+          |
|  | 1  VISIBLE      the definition of done on the ticket    |          |
|  |    10 of 10 passed                              [pass]  |          |
|  +---------------------------------------------------------+          |
|  +--[GateCard]--------------------------------------------+          |
|  | 2  HIDDEN       the edge cases a careful engineer       |          |
|  |                 would have thought of                   |          |
|  |    7 of 9 passed                                [2 escaped]        |
|  |    Escaped: two concurrent submits both create an       |          |
|  |             extraction.                                 |          |
|  |    Escaped: a retry inside the window bills twice.      |          |
|  +---------------------------------------------------------+          |
|  +--[GateCard]  3  REGRESSION   every earlier sprint's suite |        |
|  |    128 of 128 passed                            [pass]  |          |
|  +---------------------------------------------------------+          |
|  +--[GateCard]  4  ADVERSARY    a hostile actor runs against |        |
|  |                              your implementation          |        |
|  |    3 of 4 passed                                [1 escaped]        |
|  |    Escaped: a replayed webhook inside the retry window.  |          |
|  +---------------------------------------------------------+          |
|                                                                       |
|              3 escaped defects on MER-305                             |
|              [ See the retro ]      [ Back to the board ]             |
+----------------------------------------------------------------------+
```

**Component map.** Existing: `Sparra` (the only one on screen), `Button`, `Badge`. NEW:
`GateSequence`, `GateCard`, `EscapedDefectList`.

**Reveal sequence.** Gates settle in order and are revealed in order, never all at once, never out of
order. A gate that has not started renders its number, name and definition at `--wb-disabled` with
no counts. A running gate shows a small inline spinner, not a second Sparra. `Sparra progress`
is `settledGates / 4`, real, so the ring cannot complete before the last gate returns.

**Hidden and adversary output is names only.** Curated `humanName` strings, prefixed `Escaped: `. No
stack, no diff, no expected/actual, no file path, no grader stderr. That is the whitelist projection
from `AGENT-CONTEXT.md` §4 and it is a launch blocker, so the component must be incapable of
rendering anything else: `GateView.escaped` is `string[]` and there is no second field.

**States.**
- `queued`: all four gates dim, Sparra `thinking`, headline *"Waiting for a runner."*
- `running`: as drawn.
- `all passed`: headline *"Nothing escaped on MER-305."* Sparra one-shot `pass`.
- `escaped > 0`: headline *"3 escaped defects on MER-305."* Sparra one-shot `fail`. The word is
  neutral: it names what happened, it does not grade the person.
- `gate errored`: that card reads *"This gate could not run. It is not counted against you."* and the
  sequence continues. Never a generic red failure for an infrastructure fault.
- `regression failure`: the card names which sprint's suite broke, for example *"Sprint 1 contracts:
  2 failing"*, because "sprint 6 can break sprint 3" is the whole point of the gate. Names only, same
  projection rule.
- `budget spent`: this screen is not reachable. The workspace's Submit is disabled with
  *"No submissions left today. Next one in 4 h 12 m."*
- `cooldown`: Submit disabled with a live countdown, *"Next submission in 11:42."* The countdown is
  server-anchored; recompute from a server timestamp on mount, never from a stored client clock.
- `re-attempt`: a strip above the gates: *"Practice run. Different hidden set. Your finalized score
  for MER-305 does not change."* at `--wb-accent-soft`.
- `assisted ticket`: a strip: *"Assisted attempt. This result is feedback and does not feed your
  readiness score."*

**Interactions.** No controls while gates run; the two buttons appear only after the last gate
settles. Leaving mid-run is allowed and the run continues server side; returning re-attaches. Do not
warn on navigation.

**Objectives surfacing.** Each escaped defect line carries the objective it maps to as a chip on the
same row, right aligned. That is what turns "you missed a case" into "this is the skill".

**Copy notes.** Gate definitions are one line each and are fixed platform copy, quoted from
`WORKBOOK-SPEC.md` §4. The escaped names are authored content, rendered verbatim.

---

## 9. Screen 8 — Review round (`.../run/ticket/[key]/review`)

**Purpose.** Decide what ships. Three bot comments on the diff, one deliberately wrong. Accepting the
wrong one costs Communication; pushing back with a reason earns it.

**Layout.** Diff left, review thread right.

```
+----------------------------------------------------------------------+
| [SprintLabTopBar]  MER-303  PR #418  Sprint 3 of 10         [theme]   |
+----------------------------------------------------------------------+
| PR #418  fix(db): reset tenant context on connection release          |
| Scored under review only. A reproducing failing test outscores prose. |
+---------------------------------+------------------------------------+
| [file picker: 3 files changed]  | REVIEW  (3 comments)               |
|                                 | +--[ReviewCommentCard]-----------+ |
| [CodeMirrorEditor, readOnly]    | | reviewer-bot on pool.ts:41     | |
| 41  release(client) {           | | "Resetting on release is fine, | |
| 42 -  client.release()          | |  a pooled client is exclusive  | |
| 43 +  await client.query(       | |  to one request, so there is   | |
| 44 +    "RESET ALL")            | |  no window here."              | |
| 45    client.release()          | |  [ Accept ]  [ Push back ]     | |
| 46  }                           | +--------------------------------+ |
|                                 | +--[ReviewCommentCard]  ...      + |
|                                 | +--[ReviewCommentCard]  ...      + |
|                                 |                                    |
|                                 | [ Submit review ]  1 of 3 decided  |
+---------------------------------+------------------------------------+
```

**Component map.** Existing: `CodeMirrorEditor` (read-only, diff text with the repo's own `--code-*`
highlighting), `Textarea`, `Button`, `Badge`, `Collapsible*`, `Sparra` (only after submit, for the
verdict). NEW: `ReviewThread`, `ReviewCommentCard`, `DiffCompare` (single-pane mode here, two-pane on
retro).

**Interactions.**
- `Accept` marks the comment accepted and collapses it to one line with an `Accepted` marker.
- `Push back` expands a `Textarea` inline, labelled *"Why is this wrong? Name the mechanism."* Send is
  disabled while empty. There is no character minimum; a short precise answer must be allowed to win.
- Under `review-only`, pushing back opens a short exchange with the PR-author agent, which concedes
  only on an authored `concession_triggers` fact and otherwise holds its position. It never folds on
  expressed doubt alone.
- `Submit review` is enabled when all three comments have a decision. Verdict renders per comment
  afterwards: `You were right to push back`, `This one was correct`, or `Accepted a wrong comment`.
- The learner may open the workspace from here to write a reproducing test; that action routes to
  screen 6 and returns.

**States.**
- `review-only ticket`: scored. Header line as drawn.
- `assisted or unassisted ticket with a review round`: header reads *"Practice round. Not scored."*
  Everything else is identical. Scoring the round outside `review-only` would let an agent reason its
  way to the points (`WORKBOOK-SPEC.md` §4).
- `already submitted`: read-only view of the thread with verdicts, plus `See retro`.
- `loading`: `<SparraLoader label="Loading the PR…" />` in the diff pane.
- `error`: one panel, retry. Decisions already made are preserved locally and re-sent.

**Objectives surfacing.** The header carries the round's objective chip, typically the sprint's
review objective, for example *"Reject a plausible concurrency fix in code review and state the
precise window it leaves open."* One chip, not a list; this round measures one thing.

**Copy notes.** Bot comments are authored content and read like a real reviewer: confident, specific,
and in one case wrong in a way a competent person would be wrong. The platform adds no hedging around
them and no hint that one is the trap.

---

## 10. Screen 9 — Retro (`.../run/ticket/[key]/retro`)

**Purpose.** Close the loop while it is still warm: your diff beside the reference, the escaped
defects named, what a senior would have done, and what the ticket moved.

**Layout.** Diff on top, prose below, single column under it.

```
+----------------------------------------------------------------------+
| [SprintLabTopBar]  MER-305  Retro   Sprint 3 of 10          [theme]   |
+----------------------------------------------------------------------+
| MER-305 shipped.  3 escaped defects.  5 points.                       |
+----------------------------------------------------------------------+
| YOUR DIFF                        | THE REFERENCE                      |
| [CodeMirrorEditor readOnly]      | [CodeMirrorEditor readOnly]        |
| +34 -6 across 3 files            | +21 -6 across 2 files              |
| [file picker, shared]            |                                    |
+----------------------------------+------------------------------------+
| WHAT ESCAPED                          [EscapedDefectList]             |
|  Escaped: two concurrent submits both create an extraction.  [chip]   |
|  Escaped: a retry inside the window bills twice.             [chip]   |
|  Escaped: a replayed webhook inside the retry window.        [chip]   |
|                                                                       |
| WHAT A SENIOR WOULD HAVE DONE                                         |
|  You closed the window with a longer transaction. That works until    |
|  the pool is under load, and it is the reason the tenant-scoped       |
|  unique constraint exists. The constraint is one line and it holds    |
|  no matter how the requests interleave.                               |
|                                                                       |
| WHAT THIS MOVED                       [ObjectiveList density="full"]  |
|  Tenant-scoped uniqueness      practicing -> demonstrated             |
|  READ COMMITTED interleavings  practicing (2 attempts)                |
|                                                                       |
| [ Next: MER-304 ]        [ Back to the board ]                        |
+----------------------------------------------------------------------+
```

**Component map.** Existing: `CodeMirrorEditor` x2 read-only, `MarkdownRenderer` (senior paragraph),
`Button`. NEW: `DiffCompare`, `EscapedDefectList`, `ObjectiveList`.

**States.**
- `finalized, escaped > 0`: as drawn.
- `finalized, nothing escaped`: the escaped section reads *"Nothing escaped."* in `--wb-success` and
  the senior paragraph still renders, because the reference diff usually differs even when nothing
  escaped.
- `unassisted ticket`: an `AiPolicyBanner` repeat at the top with the reason, per `AUTHORING-RULES.md`
  §6 (board card, workspace banner, retro).
- `assisted ticket`: a labelled line under the headline: *"Assisted attempt. Feedback only."*
- `re-attempt`: the retro shows the finalized result, not the practice run, with one line: *"Your
  practice run passed 9 of 9. Your finalized result stands."*
- `reference unavailable` (content gap): the diff pane shows a single panel, *"The reference diff for
  this ticket is not published yet."* This must be impossible once `lab validate` is green; render it
  rather than crashing.
- `last ticket in the sprint`: primary CTA becomes `Sprint 4 standup`.
- `last ticket in the workbook`: primary CTA becomes `See your summary`.

**Interactions.** The file picker is shared across both panes and defaults to the file with the most
changed lines in the learner's diff. There is no inline commenting and no editing here.

**Objectives surfacing.** `density="full"`, only the objectives this ticket touched, each with its
transition rendered as `before -> after` in words. This is the mastery delta and it is the reason a
learner opens the retro twice.

**Copy notes.** The senior paragraph is authored per ticket, second person, specific about mechanism,
and never scolding. It names the cost of the learner's approach, then the reference's approach, in
that order.

---

## 11. Screen 10 — Workbook summary (`.../run/summary`)

**Purpose.** The arc, in one page: the escaped-defect curve going down, what you can now do, how fast
you shipped, and one honest artifact worth sharing.

**Layout.**

```
+----------------------------------------------------------------------+
| [SprintLabTopBar]  Meridian   Summary                       [theme]   |
+----------------------------------------------------------------------+
| Ten sprints on Meridian.  50 tickets.  263 points.                    |
| Escaped defect rate 31% -> 9% across the arc.                         |
+----------------------------------------------------------------------+
| ESCAPED DEFECT RATE                      [EscapedDefectCurve]         |
|  40% |*                                                               |
|      |  *   *                                                         |
|  20% |        *   *    *                                              |
|      |                    *   *   *  *                                |
|   0% +--1---2---3---4---5---6---7---8---9--10                         |
|  Graded line: unassisted and review only attempts.                    |
|  Dotted line: assisted attempts, feedback only.                       |
+----------------------------------------------------------------------+
| WHAT YOU CAN DO NOW                          [MasteryGrid]            |
|  TypeScript as a type system     4 demonstrated  1 practicing         |
|  Databases, transactions and RLS 5 demonstrated  1 escaped            |
|  ...                                                                  |
+----------------------------------------------------------------------+
| VELOCITY                | THE DELTA                                   |
|  26 pts sprint 1        |  Idempotency: with AI you ship this.        |
|  28 pts sprint 5        |  Without it, not yet.                       |
|  24 pts sprint 10       |  Tenant isolation: you ship this either way.|
+----------------------------------------------------------------------+
| [ShareArtifactCard]                                                   |
|  Shipped 10 sprints on Meridian                                       |
|  Escaped defect rate 9% on 12 uncontaminated attempts                 |
|  Scored 2026-08-26 - model claude-x-y - 5 unassisted, 10 review only  |
|  [ Copy link ]                                                        |
+----------------------------------------------------------------------+
```

**Component map.** Existing: `Button`, `Badge`, `Tooltip`. NEW: `EscapedDefectCurve`, `MasteryGrid`,
`ShareArtifactCard`, `ObjectiveChip` inside the grid.

**`EscapedDefectCurve`** is inline SVG, no chart library, `--wb-accent` for the graded series and
`--wb-muted` dotted for the assisted series. Points are labelled on hover and on focus, and the whole
chart has a text alternative: an adjacent visually-hidden table of sprint and rate, so the number is
never available only as a picture.

**Metric integrity, rendered.** `WORKBOOK-SPEC.md` §5 requires the split and the stamp, so both are
on the page and on the artifact:

- The two series are separately labelled, and the graded one is the one in the headline.
- `Graded on 12 attempts under no-agent and review-only policy. 38 assisted attempts are shown
  separately and do not feed your readiness score.`
- `Scored <date> - model <model id and version>.` One line, always present. A score from 2026 is not
  a score from 2028, and the artifact says which one it is.

**States.**
- `in progress`: the curve renders only completed sprints and the axis stops there. Headline reads
  *"3 sprints in. Escaped defect rate 31% to 18%."* No projection, no forecast.
- `fewer than 2 graded attempts`: the curve is replaced by one line, *"Two graded tickets are enough
  for a curve. You have one."* Never draw a trend from a single point.
- `complete`: as drawn, share card enabled.
- `assisted only so far`: the graded series is empty; show the dotted series and one line: *"No
  uncontaminated attempts yet. Sprint 3's MER-305 is the first."*
- `loading`: `<SparraLoader label="Adding it up…" />`.
- `error`: one panel, retry. Never a zeroed chart.

**Interactions.** `Copy link` copies the artifact URL. The share artifact is a v1 concept only if a
public artifact route exists; if it does not, the card renders without `Copy link` rather than
copying a URL that 404s.

**Objectives surfacing.** `MasteryGrid` is objectives grouped by the ten topics from
`WORKBOOK-SPEC.md` §2, each row a topic with counts, expanding to its objective chips with states.
This is the per-objective mastery view and it is the same chip component as everywhere else.

**Copy notes.** The delta panel is the calibration copy and it must stay two-sided: name at least one
skill that holds without AI beside any that does not. One-sided output reads as an accusation.

---

## 12. Cross-cutting: session states and transitions

### 12.1 Not enrolled

`/sprint-labs/meridian` renders publicly; the CTA starts enrollment. Starting requires sign-in
(cost-bearing routes require auth, standing rule). Enrollment creates the run and routes to sprint 1
standup.

### 12.2 Enrolled but idle

Nothing expires. Three surfaces show resume, all reading one authenticated call:

- `/labs` Meridian card footer: `Resume: sprint 3, MER-303` plus the progress bar.
- Overview CTA: `Resume: MER-303`.
- Header `APP_NAV`: `Labs` already exists and already matches `pathname.startsWith("/labs")`; extend
  its active test to `/sprint-labs` too, so the nav does not go inert on the run surface. Do not add a
  second nav entry for two workbooks, and do not convert `Labs` to a picker at this catalog size.

If the last activity is older than 14 days, the standup for the current sprint gets one line above
the goal: *"You were last here 3 weeks ago. This is where the sprint stood."* No penalty, no reset.

### 12.3 Mid-ticket resume

Entering `.../workspace` on a ticket already in DOING restores, in this order:

1. **Editor state** from the autosave record: per-file contents, the active file, and the file tree's
   open groups. Restored before first paint of the editor so the learner never sees the seed content
   flash. Autosave is `useSprintLabWorkspaceSync`, the `useCaseLabRunSync` contract unchanged: load
   once per `(ticketKey, retryNonce)`, debounce 1000ms, flush on unmount and on `visibilitychange ->
   hidden`.
2. **Chat transcript** from the server-side log, replayed into the panel in order. The capability
   line renders above it, not repeated between messages.
3. **Per-turn strip recomputed, never restored.** Show `Run the visible tests to refresh this` until
   the first run of the session. A restored red count from three days ago is a lie about the tree.

If the autosave record fails to load, the workspace opens on the seed with a destructive line:
*"Couldn't load your saved work. Don't edit yet."* plus `Retry`. Never silently open a blank editor
over saved work.

### 12.4 Sprint complete to standup N+1

The last ticket's retro CTA becomes `Sprint N+1 standup`, and the board shows the sprint-complete
band. Advancing is explicit; nothing auto-navigates. The learner may reopen any earlier sprint's
standup, board and retros read-only from the sprint map on the overview page. Earlier tickets' DONE
state never changes, and a completed ticket's workspace opens read-only with one line: *"Sprint 3 is
closed. This workspace is read only."*

### 12.5 Score finalized, re-attempt

After finalization the ticket's workspace reopens for practice. Every surface that could be mistaken
for a graded run is labelled at the moment of the action, not afterwards:

- Submit dialog: *"Practice run. Your finalized score for MER-305 does not change."*
- Submit screen strip: same sentence, plus *"Different hidden set."*
- Retro: the finalized result stands; the practice result is a single line under it.
- Board card and summary: unchanged by practice runs.

The hidden variant is server-chosen; the UI never names which variant is running.

### 12.6 Free learner hits the Pro wall

Sprint 1 free, sprints 2 to 10 Pro (owner decision 2). **The boundary itself is
`sprintRequiresPro(n)` from `lib/sprint-labs/entitlements.ts`, imported by every surface that draws
or enforces it** (§16c): the sprint map's Free/Pro pill, the standup gate, the board gate. Never
re-express it as `n > 1` at a call site. It is a business rule the owner can change, and the day it
changes the pill and the gate must not disagree.

Entitlement itself follows the existing three-outcome pattern from `app/practice/page.tsx`:
`isPro: boolean | null` plus an `entitlementFailed` flag, so a failed check shows an error with a
retry, never an upgrade wall to a paying subscriber.

The wall lands on the **sprint 2 standup route**, not earlier. Sprint 1's retro CTA reads `Sprint 2
standup` for everyone; a free learner who presses it gets the wall, having seen their whole first
sprint's result first.

```
+----------------------------------------------------------------------+
|  You shipped sprint 1.  5 tickets.  26 points.  2 escaped defects.    |
|                                                                       |
|  Sprint 2 is Money and Time.  Reconciliation is out by $412.19        |
|  across 40,317 claims, and it is a different set every run.           |
|                                                                       |
|  Sprints 2 to 10 are part of Pro.                                     |
|  9 more sprints - 45 tickets - one codebase that remembers            |
|                                                                       |
|  [ See Pro ]       Your sprint 1 work is saved.                       |
+----------------------------------------------------------------------+
```

Uses `--wb-*` tokens on the workbook surface, not the global-token upgrade panel from
`/practice`. Links to `/pricing`. The sprint 2 standup content itself is never rendered, not blurred,
not behind an overlay. The board for locked sprints is not reachable; the sprint map shows them with
a `Pro` pill and their goal line, which is marketing the learner has earned the right to read.

### 12.7 Flag off

`/labs` renders exactly as today. `/sprint-labs/**` is `notFound()` at the layout. The sitemap omits
the routes and `CourseListJsonLd` omits the workbooks. An enrolled learner sees no dangling entry
point, because the resume affordances live inside the flagged section. Assert the byte-identical
`/labs` case with a test.

---

## 13. Cross-cutting: loading, empty, error, unauthorized

**Loading.** Route level: `app/sprint-labs/loading.tsx` renders `<SparraLoader fullPage label="Loading
Sprint Labs…" />`, matching `app/learn/loading.tsx` and `app/interview/loading.tsx`. Within a screen,
paint the chrome (top bar, headings, rails) immediately and put `SparraLoader` or `Skeleton` in the
pane that is actually waiting. Never a full-page loader over an already-painted run surface, and
never two loaders at once (the one-Sparra rule).

**Empty.** Every list has an authored empty line, at `--wb-faint`, in the surface's voice: board
columns (§5), chat panel (§7 per policy), linked artifacts (*"Nothing attached to this ticket."*),
escaped defects (*"Nothing escaped."*), mastery grid (*"Nothing measured yet."*).

**Error.** One `--wb-panel` panel with a border, a one-line human cause, and exactly one retry
action. Never a toast for a screen-blocking failure; never a partially-populated screen. Chat and
autosave failures are soft: one line, the rest of the screen keeps working, which is the
`CaseLabChat` precedent.

**Unauthorized and not found.**
- Signed out under `run/`: bounced by the proxy and by `SprintLabAuthGuard` to
  `/login?redirect=<path>`.
- Signed in without Pro under a locked sprint: §12.6's wall, which is a 200 page and is fine because
  it is a real page about a real product.
- Unknown workbook id: `dynamicParams = false` plus `notFound()`, the `/labs/[labId]` precedent. Never
  a 200 "not found" panel.
- Unknown ticket key: `notFound()`.
- A ticket route ahead of the learner's phase: `router.replace` to the furthest legal phase, silently.
  It is navigation, not an error.

---

## 14. Cross-cutting: accessibility, keyboard, viewport

- **Desktop first. Mobile is a non-goal** (`WORKBOOK-SPEC.md` §7). Do not actively break tablet: at
  `< lg` the workspace collapses to stacked panes with the file tree as a `Collapsible` above the
  editor and the chat as a `Collapsible` below it, the board scrolls horizontally inside its own
  region, and the reading screens are already single column. The page body never scrolls
  horizontally at any width.
- **Focus.** Every interactive element carries the surface's focus ring:
  `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wb-accent)]`,
  matching `CaseLabCard` and `CaseLabGallery`. Form controls inherit `--wb-focus-ring` from the
  `.workbook-surface` block.
- **Keyboard.** Board: plain links in DOM order, column by column. Workspace: Cmd/Ctrl+Enter runs the
  visible tests, Cmd/Ctrl+S flushes autosave and suppresses the browser dialog, Escape from the editor
  moves focus to the file tabs so the editor is never a keyboard trap. Dialogs are Radix `Dialog` and
  `AlertDialog`, which already trap and restore focus. File tabs are a `role="tablist"` with arrow-key
  movement, as `BuildStation` has today.
- **Announcements.** Chat log is `role="log" aria-live="polite"`. The gate sequence is
  `aria-live="polite"` on its container so each gate's settle is announced once, with the gate name
  and result in the text, not only in an icon. Progress bars carry `role="progressbar"` with
  `aria-valuenow/min/max`, the `MilestoneRail` pattern.
- **Color is never the only channel.** Pass/fail carries an icon and a word. Objective states carry a
  word in the accessible name. Difficulty and level are text.
- **Motion.** Gate reveal and card hover respect `motion-reduce`; the global reduced-motion rules
  already cover smooth scrolling. Sparra's scoring ring is progress-driven, so reduced motion shortens
  the tween, it does not remove the state.
- **Headings.** One `<h1>` per screen: the workbook title on public pages, the sprint or ticket on run
  pages. Column headings are `<h3>` under the board's `<h2>`.

---

## 15. Spec conflicts and open questions

Recorded rather than silently resolved, per `EXECUTION-STATE.md`'s standing rule.

1. **`WORKBOOK-SPEC.md` §4 puts the review round between submit and retro for every ticket, while §4's
   `ai_policy` table scores it under `review-only` only.** Resolved in the UI as: the round renders
   wherever content authors one, and the header states whether it is scored. Screen 8 carries both
   states. No content change requested.
2. **Nine screens in the brief, ten sections here.** `WORKBOOK-SPEC.md` §4 draws seven boxes
   (standup, board, ticket, work, submit, review, retro); the brief adds the `/labs` chooser, the
   overview and the summary. This spec covers all ten and treats the chooser as screen 1.
3. **Level and hours for Meridian are not stated anywhere in the doc set.** `SPRINT-PLAN.md` gives
   ~58 h; sbx gives its own level. The catalog card reads both from `workbook.yaml`; `Mid to senior`
   is a placeholder for the owner to confirm and is content, not code.
4. **The shareable artifact has no route in any spec.** Screen 10 renders the card either way and
   hides `Copy link` until a public artifact route exists. Flagging rather than inventing a URL.
5. **`/labs` must stay static and indexable, but the flag's authoritative layer is Firestore.** ISR at
   300 seconds is the compromise: the owner's flip lands within five minutes on the public page and
   instantly on the dynamic `run/` branch. If instant is required on `/labs`, the flag has to be an
   env var there, which means a redeploy to flip.
6. **`BuildStation.tsx` mixes global tokens into the workbook surface.** Sprint Labs reuses its
   structure and not its class names (§1.1). Fixing Case Labs' copy is out of scope here and is worth
   a separate ticket.
7. **The sitemap does not list workbook pages yet.** §1.2(c) names it as the third flag reader;
   `app/sitemap.ts` still enumerates Case Labs only. Owned by whoever next touches that file.
8. **`components/header.tsx`'s `Labs` nav entry is still `pathname.startsWith("/labs")`.** §12.2 asks
   it to match `/sprint-labs` too, so the nav is unhighlighted on the workbook pages today. One line,
   deliberately deferred to whichever task lands the `run/` surface, because a shared file with
   several agents in flight is exactly the contamination hazard `CLAUDE.md` warns about.

---

## 16. Amendments and shared implementation notes

### 16.0 Amendment log

Every item below came out of the screen review of the first implementation (screens 1 and 2). Where
the label reads **spec defect**, the implementer was right and this document was wrong; those are
corrected in place above, and recorded here so a reader of an earlier copy can tell what moved.

| # | Amendment | Where |
|---|---|---|
| C1 | The Case Labs region takes `id="case-labs"` and nothing else. No wrapper frame, no second heading, no duplicate definition line. **Spec defect:** the original ASCII drew a box and cost ~170px above the fold on the page rebuilt to remove exactly that. | §2 Layout, Component map, States, Copy notes |
| S1 | "What you inherit" renders only when `seedStats` / `inheritedDefects` are authored; both optional; never synthesize. **Spec defect:** panel specified with no data source. | §3 |
| S2 | `topic`, `ticketCount`, `points` are required on the sprint record of a playable workbook and the row renders them; degrade per field, never print a zero. Data lands via content authoring plus a compiler addition owned by the stubs task. **Spec defect:** row specified against fields that did not exist. | §3 |
| S3 | `CourseJsonLd` (singular) on the workbook page; `CourseListJsonLd` stays on `/labs`. **Spec defect:** wrong component named. | §3 |
| S4 | Portaled content is outside `.workbook-surface`, so `--wb-*` does not resolve there. Preferred fix: `workbook-surface` on the portal content element. **Spec defect:** the no-mixing rule had no carve-out. | §1.1 |
| S5 | The flag is `SPRINT_LABS_ENABLED`, not `SPRINT_LABS`. **Spec defect:** wrong name. | §1.2 |
| S6 | Five physical `.case-lab-workbook` rules get the alias, not four. **Spec defect:** miscount. | §1.1 |
| S7 | Section definition lines are sentence case. **Spec defect:** authored lowercase, shipped lowercase, reads as a typo. | §2 |
| S8 | A playable catalog card's meter row ends with `First sprint free`. **Spec gap:** the acquisition surface was the only one silent about the paywall. | §2 |
| S9 | `ObjectiveList` takes `headingLevel`; lists inside a card pass `"none"`; card titles under an `<h2>` section are `<h3>`. **Spec defect:** no level specified, so a hard-coded `<h3>` outranked its own card title. | §1.4, §1.8 |
| I1 | Only the chip row gets `relative` on a stretched-link card. A `relative` footer swallows its own clicks. | §2 States |
| I2 | One run lookup per page, owned by one client wrapper. | §3 States, §16b |
| M3 | `sprintRequiresPro(n)` is the single free/Pro boundary. | §12.6, §16c |

### 16.1 Shared implementation notes for the run-surface tasks

Three things every screen from here on needs, learned the expensive way on screens 1 and 2.

**(a) This repo has no `@testing-library/jest-dom`.** `toBeInTheDocument`, `toHaveAttribute`,
`toHaveClass` and friends do not exist and fail with "Invalid Chai property", which reads like a
config problem and is not one. Use plain vitest assertions on plain DOM reads:

```ts
expect(screen.queryByRole("button", { name: "Submit" })).not.toBeNull()
expect(el.getAttribute("aria-expanded")).toBe("true")
expect(el.className).toContain("...")   // rarely; prefer asserting behavior
```

Static, non-interactive pieces can skip jsdom entirely: `renderToStaticMarkup` in the Node
environment plus string assertions is faster and is the existing house pattern. Reach for
`@vitest-environment jsdom` and `@testing-library/react` only when something has state, effects or a
click to exercise.

**(b) The run-state client wrapper is the canonical pattern: one fetch, state owned once, slots
rendered from it.** Every run screen has several places that need the same run (a CTA at the top and
the bottom, a map, a rail, a board header). Each of them fetching for itself costs one authenticated
round trip apiece, shows one `SparraLoader` apiece (which breaks the one-Sparra-per-screen brand
rule), and lets two slots on one screen disagree when one request fails. Fetch once in a client
wrapper that owns `loading | signed-out | no-run | run`, and hand the result down. While it is
loading, the screen shows **one** wait state, not one per slot.

**(c) `sprintRequiresPro(n)` from `lib/sprint-labs/entitlements.ts` is the only free/Pro boundary.**
Import it wherever a Pro pill is drawn or a gate is enforced. Never inline `n > 1`: the pill and the
gate must not be able to drift, and the owner may move the boundary.
