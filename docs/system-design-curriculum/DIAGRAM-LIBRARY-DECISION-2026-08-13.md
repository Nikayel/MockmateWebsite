# Diagram library decision: System Design architecture drawings

**Date:** 2026-08-13
**Supersedes on scope:** the 2026-07-04 research pass (which answered "should we add diagram visuals at all")
**Status:** decided

---

## 1. The recommendation

**Keep the hand-rolled csdiagram system and extend it. Adopt no diagram library and no layout library, at runtime or at build time.** Every one of the fourteen candidates surveyed was rejected, and the two with a genuine case (`@dagrejs/dagre` at build time, `@viz-js/viz` at build time) lose on the same ground: they fix the one problem a learner notices least, and they fix none of the three that are broken today.

The reason is not bundle size, licence, or React 19 compatibility. It is that **all three live defects are in our own code, and no library touches any of them**: the topology renderer emits only stage 1 of N into the server HTML and marks its `<svg>` `aria-hidden="true"` (constraints 1 and 2, failing today on all 22 shipped topology diagrams), and every plain ASCII fence renders with hardcoded gray-900 with no light variant (constraint 6, failing today on all 55 drawings). A library would leave all three exactly as they are while adding a dependency.

This is a null result on the library question, and it is argued rather than assumed: I reproduced the cycle-layout explosion, ran the 1,459-assertion suite, measured the ASCII corpus, and re-measured the Mermaid figure the prior decision cited. What follows is the extension plan, which is substantial. "Keep what we have" is not the conservative answer here; it is the only answer that touches the actual blockers.

---

## 2. What changed since 2026-07-04, and what did not

### Still binding

| Prior clause | Status | Evidence today |
|---|---|---|
| No 500KB dependency on lesson pages | **Holds, and understates the risk** | elkjs measured at 439,650 B gzip; reaflow at 1,229,800 B gzip; React Flow + elkjs = 502 KB gzip |
| No force-directed / physics layout | **Holds** | Nothing in the 55 drawings wants it; spatial memory across revisits is still the reason |
| No canvas / WebGL | **Holds** | Still a screen-reader black box |
| Static-SVG + framer-motion is the right substrate | **Holds** | 1,459 assertions render every authored diagram through the real markdown pipeline; that asset exists *because* layout is deterministic and specs are Zod-validated |

### Stale, and corrected here

**The Mermaid bundle figure was wrong, and wrong in both directions.** The prior decision cited "~500KB+ gzip". I measured mermaid 11.16.1 (MIT, published 2026-08-04) directly from jsDelivr:

| Artifact | Raw | Gzip |
|---|---|---|
| ESM entry `mermaid.esm.min.mjs` | 29,964 B | **11,025 B** |
| Entry + its 9 static chunk imports | — | **124,375 B (121 KB)** |
| Realistic flowchart render path (entry + static + lazy flow chain) | — | **~178 KB** (survey figure; my entry and static numbers corroborate its method) |
| UMD single-file `mermaid.min.js` | 3,566,058 B | **971,552 B** |

So the ~500KB figure was measuring neither artifact. The modular ESM path is roughly a third of it; the UMD build is nearly double it. **Cite 121 KB gzip (static floor) or ~178 KB (one flowchart) from now on, and stop citing 500KB.** The verdict on Mermaid is unchanged, but it now rests on constraint 1 rather than on bundle: Mermaid renders client-side, so the diagram does not exist in the server HTML at all, on the site's main organic-traffic surface.

**"React 19 findDOMNode risk" should be retired as a reason.** React Flow declared React 19 support in January 2025; the surveyed dists contain zero `findDOMNode` and zero `defaultProps`. It is rejected on cost and interaction model, not compatibility. If a future reviewer dismisses this category on findDOMNode they will find the ground has moved and may wrongly conclude the decision expired. It has not.

**"Non-deterministic layout destroys spatial memory" was scoped too broadly.** The reasoning was aimed at force-directed physics and is correct there. It does not generalise to layered Sugiyama: ELK measured 0/22 specs varying across runs, and dagre 22/22 stable once nodes are sorted canonically. The *reason* survives; the *scope* was too broad, and this decision does not lean on it to reject dagre.

**"Static out-teaches animated for novices" is not a fair reading of the literature and should not be repeated.** Both meta-analyses point the other way on the main effect: Höffler & Leutner (2007), 26 studies / 76 comparisons, d = 0.37 favouring animation; Berney & Bétrancourt (2016), 61 studies, g = 0.226 favouring animation. The defensible claim reaches the same practical place by a different route: Höffler & Leutner's large effects concentrate in procedural-motor knowledge (d = 1.06) and realistic video (d = 0.76), whereas architecture topology is *declarative structural* knowledge, the category with the smallest animation advantage. What actually justifies the current design is the **segmenting principle** (median effect ~0.79, 10/10 in Mayer's program) and the **transient-information effect**: `useStepPlayer`'s learner-paced, never-autoplaying, keyboard-steppable contract is precisely the right build. The 2026-07 decision built the right thing for a wrong stated reason.

---

## 3. Options table

Verdicts cover the specific job of drawing 55 System Design architecture diagrams. "Verified" means measured or executed by a researcher or by me; "inferred" means read from docs or registry.

| Candidate | Verdict | Bundle (gzip) | SSR | a11y | Licence | Fails on |
|---|---|---|---|---|---|---|
| **Extend csdiagram (this decision)** | **ADOPT** | **0 new** (V) | Full, once §6 lands | Best available: we own the spec, so a text alternative is a pure function of data we already have | n/a | Nothing. Fails 1, 2, 6 *today*; §6 is the fix |
| @dagrejs/dagre @ build time | REJECT (re-entry below) | 0 shipped (V) | n/a (codegen) | n/a (layout only) | MIT (V) | Nothing technical. Buys only edge routing, ranked last by learner impact |
| @dagrejs/dagre @ runtime | REJECT | 16,851 B (V) | Fine | n/a | MIT (V) | Constraint 5 in spirit: paying per-visit to recompute coordinates that can never change |
| elkjs @ build time | REJECT | 0 shipped (V) | n/a | n/a | EPL-2.0 OR GPL-3.0-or-later (V) | Nothing technical. Best routing (0 edges through boxes) but needs a codegen + hash registry for a defect ranked 6th |
| elkjs @ runtime | REJECT | 439,650 B (V) | Async API, so post-hydration | n/a | EPL/GPL (V) | **1** (async render) and **5**, decisively |
| Mermaid, client-side | REJECT | ~178 KB (V method) | **None** | Own tracker concedes no node relationships exposed | MIT (V) | **1** fatally, **5** materially |
| Mermaid @ build time (mermaid-cli) | REJECT | 0 shipped | Static | Author writes all descriptions by hand anyway | MIT (V) | **6** (bakes colours; theme is a render-time ID) + Chromium in CI |
| D2 @ build time | REJECT | 0 shipped (V) | Static, real Node, no browser (V) | **Zero** `role`/`aria`/`title`/`desc` in output (V) | MPL-2.0 (V) | **6**: emits `@media (prefers-color-scheme:dark)`, but our `ThemeProvider` is `attribute="class"` with `enableSystem={false}`. Light-OS user on our dark default gets a light diagram on a dark page |
| D2 in browser | REJECT | 5.88 MB (V) | No | As above | MPL-2.0 | **5** catastrophically |
| Graphviz `@viz-js/viz` @ build time | REJECT (strongest loser) | 0 shipped (V) | 8 ms render, 8.8 KB SVG, byte-identical across instances (V) | `<title>` per node/edge only; no roles, no relationships | MIT wrapper, EPL-2.0 core (V) | Nothing hard. **Genuinely passes theming**: authored `class` attrs survive into the SVG, and CSS beats presentation attributes. Rejected on **4**: DOT has no domain semantics, so a file that compiles can still be pedagogically wrong, and we would lose the Zod cross-field gate |
| PlantUML | REJECT | 0 shipped | Static | Same as D2 | GPL / LGPL variant (I) | **4**: needs a JVM; Vercel has Node. Becomes "render locally, commit SVGs", which loses test-failure semantics |
| Structurizr / C4 | REJECT | n/a | Inherits backend | Inherits backend | Apache-2.0 CLI (I) | Not a renderer. **Steal the principle** (model separate from view) which `schema.ts` already implements |
| @xyflow/react (React Flow) | REJECT | 62,200 B (V) | Works, but only if you hand-supply width/height/handle x,y (V) | `role="application"` hardcoded after `...rest`, not overridable (V) | MIT, but attribution link unless Pro at $169/mo (V) | **5** (4x our whole system) and **2**. And it has **no layout engine** by its own docs, so `topology-layout.ts` survives regardless |
| reaflow | REJECT | 1,229,800 B (V) | **Throws** on `renderToString` (V) | n/a | Apache-2.0 | **1**, **5**, **2**, **6**. Fails four of seven |
| react-archer / react-xarrows | REJECT | 10.9 KB / 2.4 KB (V) | **Verified failing**: `<path d="">` in `<svg width=0 height=0>` (V) | n/a | MIT | **1**. Geometry needs post-mount DOM measurement |
| beautiful-react-diagrams | REJECT | 16.8 KB (V) | Throws (V) | n/a | MIT | Abandonware, last published 2020-11-27 |
| d3-dag / d3-hierarchy / entitree-flex | REJECT | 37.9 KB / 2.1 KB / — (V) | n/a | n/a | MIT / ISC / MIT | d3-hierarchy and entitree-flex are **tree-only**: a shared DB renders as two boxes (V), and cycles are unrepresentable. d3-dag has no reason to beat dagre |
| GoJS / JointJS+ / react-diagrams | REJECT | — | — | — | Proprietary / commercial tiers (V) | Licence and/or staleness; all are editor frameworks |

**Re-entry criterion for dagre-at-build-time:** if, after §6's orthogonal edge routing ships, a measured count of edges-passing-through-unrelated-boxes across the corpus is still above ~3, revisit dagre as a build-time devDependency with canonical node sorting. That is the one honest trigger. Do not adopt it pre-emptively.

---

## 4. The build-time rendering question, answered

**Can we render diagrams to static SVG in a build step so the browser ships no diagram code? Technically yes. It should not be the headline, because it optimises a cost we are not paying and would charge us the pedagogy to do it.**

The premise is sound as far as it goes. Every csdiagram spec is a static string in a `.ts` file and cannot change at runtime, and both ELK and Graphviz run in plain Node with no DOM (verified: Graphviz 8 ms, byte-identical across fresh instances). That genuinely neutralises the two objections that would otherwise disqualify ELK, its 439,650 B gzip and its EPL/GPL dual licence, since a devDependency producing coordinate data is never distributed. **Any argument against a build-time engine that leans on bundle size or licence is leaning on nothing, and the 2026-07 decision's reasoning does not reach it.**

It still loses, for four reasons in descending order:

1. **There is no diagram payload to eliminate.** The whole 11-type system, schema, layout and primitives included, is ~82.9 KB of source that gzips to ~21.3 KB *unminified*. We are not paying a 500 KB tax that codegen would refund. Precomputing a layout that currently runs in 0.8 ms for all 22 specs buys nothing a learner can perceive.
2. **Rendering the *diagram* (not just the layout) at build time means giving up the staged reveal**, `StepControls`, keyboard stepping, and the `prefers-reduced-motion` handling in `useStepPlayer`. That is not decoration. Segmenting is the strongest positive result in the multimedia-learning literature and it is the pedagogical core of this system; `useStepPlayer` is also where WCAG 2.3.3 compliance lives. Trading it for a static picture to save ~20 KB is a bad trade for a learner.
3. **Static SVG bakes colours, which breaks constraint 6.** Verified in the D2 output: dark mode arrives as `@media (prefers-color-scheme: dark)`, while `app/layout.tsx:253` is `<ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>`. One build cannot serve both our themes. Only Graphviz escapes this, by passing authored `class` attributes through.
4. **It adds a spec-hash registry, a coordinate-diff review surface, and a codegen step** to a subsystem whose layout function is 43 lines.

**The narrow version that IS worth taking:** keep computing layout at module scope in our own code, and treat *the existing test suite* as the build-time verifier. That already gives the property codegen was meant to buy, a bad diagram failing in CI rather than on the page, without a registry. §6 strengthens exactly that.

---

## 5. What the topology type cannot express

22 topology specs are authored today; 55 ASCII architecture drawings remain (my count, strict box-and-arrow classifier: L10=12, L9=6, L8=6, L4=6, L3/L5/L7/L11=4 each, L6=3, L0/L1/L2=2 each). The brief's "42" and one survey's "100" bracket this; the number moves entirely with how loose the classifier is, so treat 55 as the count of things that are unambiguously *drawings*.

Three gaps are worth closing, and two are worth deliberately not closing.

### 5.1 Cycles (6+ drawings) — the live bug

`layoutTopology` relaxes longest-path over `spec.nodes.length` passes with no acyclicity check, so each pass pushes every cycle member one column right. I ran the ML-blueprint shape (6 nodes, one feedback edge):

```
cols: logs=0 etl=31 train=27 registry=28 serve=29 feedback=30
maxCol 31 -> 32 columns for 6 nodes -> rendered width 5,666px
```

`etl` lands at column 31, **past** `train` at column 27, so the arrow the lesson is about points backwards. This passes Zod, passes CI, and ships. The only guard is `expect(() => layoutTopology(cyclic)).not.toThrow()` in `ladder-topology.test.tsx:152`, which watches for a hang, not for a broken picture. Affected: ML feedback loop, webhook retry, payment compensating reversal, flash-sale TTL release, stock-exchange journal replay, job-scheduler lease expiry.

**Smallest change:** add `"feedback"` to the edge-kind enum and exclude it from layering exactly as `replication` already is (`topology-layout.ts:19` is already `e.kind !== "replication"`, so this becomes a `LAYERING_KINDS` set test), then draw it as a curved arc. This is better than rejecting cycles, because the back edge *is* the lesson.

### 5.2 Grouping / containers (8+ drawings)

Eight drawings are structurally two lanes and cannot be drawn at all without a container: offline training plane vs online serving plane, speed vs batch layer, hot vs cold path, EU vs US region, write vs read path, driver-ingest vs rider-request lane. This is C4's container level. It also explains why the existing `zone` *node* kind reads oddly: a zone is a container, not a box.

**Smallest change:** optional `groups: Array<{id, label, nodes: string[]}>`, max 4, superRefined for real ids and no double membership; render as a dashed rounded rect behind the group bounding box.

### 5.3 The density cap blocks static drawings (43% of candidates)

`ANIMATED_DIAGRAM_TYPES = new Set(["topology", "ladder"])` (`coverage.ts:53`, single definition, single call site at `:181`) means a lesson that already has a simulation can take neither. But the cap exists to limit *attention* cost, and `er` is already an exempt boxes-and-edges type because it is static. A static topology is the same object.

**Smallest change:** `reveal: z.enum(["staged","all"]).default("staged")`; under `"all"`, `stages` becomes optional, no `StepControls`, no `useStepPlayer`, no motion. Swap the one call site for `isHeavyDiagram(spec)`. This converts the cap from a per-type ban into a per-instance property and is the highest-leverage single change in the plan.

**Do not** simply relax `sim-density.test.ts`. That is the tempting one-line shortcut and it would forfeit the segmenting benefit the whole system is built on. Take the schema change, not the policy change.

### 5.4 Deliberately not solved (null results)

- **Decision branches** (5+: rate-limiter `if count > 100 -> 429 / else allow`, model-gateway three-outcome cache cascade). Topology has no decision node, and three edge labels from one node overlap into illegibility at 9px. **Leave as fences.**
- **Nodes whose content is an ordered list** (4+: message-queue partitions `P0 [m0 m1 m2]`). No type expresses this cheaply. **Leave as fences, or use `table`.**

These stay as ASCII, which makes §6.1's `<pre>` restyle mandatory rather than optional.

### 5.5 The label problem, which is a renderer bug not a schema gap

`NODE_W` is a fixed 116 and labels are cut at `node.label.length > 18 ? node.label.slice(0, 17) + "…"`. 63 labels in the current corpus are truncated; the worst renders "Docs in the primary DB (doc7: Wireless Bluetooth Headphones)" as **"Docs in the primary D…"**. Over half of the connector-separated phrases in the L10/L11 ASCII exceed 18 characters. This matters more than it looks: the ASCII integrates qualifiers *beside* the component ("Redis (atomic Lua)", "candidate generation (two-tower + ANN, ~5ms)"), and truncation evicts them, **introducing a split-attention cost the ASCII did not have.** Converting before fixing this is a measurable regression.

No layout library fixes this, because the constraint is that the string is 61 characters. Wrapping does.

---

## 6. Implementation shape

Strictly ordered. Phase 0 is the verifier and must land first, per CLAUDE.md's "build the verifier before the sweep": 55 conversions are a sweep, and the subsystem currently has no check that catches a bad one.

### Phase 0 — the verifier (blocking)

- `lib/tutorials/diagrams/__tests__/ladder-topology.test.tsx:152` — replace `not.toThrow()` with a bounded-column assertion: `columnCount <= nodeCount`.
- `lib/tutorials/diagrams/__tests__/content-integrity.test.ts` — add the same invariant across every authored topology spec, plus assert no rendered node label is truncated.
- Confirm it **fails** against the cyclic spec in §5.1 before proceeding.

### Phase 1 — repair the live constraint failures (blocking, no schema change)

- `lib/markdown/components.tsx:49` — the `<pre>` is literally `border-gray-700/50 bg-gray-900/80 text-gray-200`, no `dark:` variant, no token. Move to `border-border bg-card/40` etc. **This one line fixes constraint 6 for all 55 ASCII drawings whether or not a single conversion ever happens**, and `preprocessAsciiArt` funnels every loose drawing through this same element. Cheapest item in the plan, widest reach.
- `components/tutorials/diagrams/TopologyDiagram.tsx` — **SSR fix (constraint 1)**: `visible` is derived from `useStepPlayer`'s `useState(0)`, and both nodes and edges are filtered by it, so the server HTML contains only stage 1. Render **all** nodes and edges always and drive the staged reveal with opacity/`data-stage` instead of filtering. The crawler then sees the whole architecture; the reveal still works.
- Same file — **a11y fix (constraint 2)**: the `<svg>` is `aria-hidden="true"`. Keep it hidden but add a visually-hidden adjacency list next to it, built by a new pure `buildTopologyDescription(spec)` in `lib/tutorials/diagrams/topology-description.ts`: "Client sends HTTPS to Load Balancer; Load Balancer forwards to API Service; ...". This is the one thing no library on the list can do for us, because we own the structured spec. `DiagramFrame` already supplies `<figure>`, `aria-label`, and `<figcaption>` to hang it on.
- Same file — wrap labels to two `<tspan>` lines at a word boundary and widen `NODE_W` instead of slicing at 18; make the uppercase `kind` badge opt-out.

### Phase 2 — layout and routing (no schema change)

- `lib/tutorials/diagrams/topology-layout.ts` — DFS back-edge removal before layering (kills the 32-column explosion), a median/barycenter sweep for within-rank ordering, and per-node width from the label. Measured on the real corpus this takes max width 6,378px to 1,568px and crossings 9 to 6, which **beats dagre's 7**, in 0.8 ms, at zero bytes.
- Same file / renderer — default the flow to vertical (`tb`) with wrapped labels. Measured: 0/22 diagrams exceed 720px wide (max 586px), versus 8/22 today and 12-15/22 under dagre or ELK with honest untruncated labels. **This is the single largest reader-facing win available and it costs nothing.**
- `TopologyDiagram.tsx` — replace straight centre-to-centre `<line>` with orthogonal routing (out, along a lane, in), and centre each column's rows against the tallest column so fan-outs stop rendering lopsided. Edge routing is the only job a real engine does better; do it ourselves first and measure before reconsidering dagre.

### Phase 3 — schema extensions (additive and optional, so existing specs parse unchanged)

In `lib/tutorials/diagrams/schema.ts`, all three on `topologySpecSchema`:
- `reveal: z.enum(["staged","all"]).default("staged")`, `stages` optional when `"all"`. Update `lib/tutorials/system-design/coverage.ts:53` to `isHeavyDiagram(spec)`; `sim-density.test.ts` needs no change.
- `"feedback"` added to the edge-kind enum; `topology-layout.ts:19` becomes a `LAYERING_KINDS` set test.
- `groups` array, max 4, with a `superRefine` on the union wrapper (**not** on the member: the file's own comment records that attaching `.superRefine` to a discriminated-union member turns it into a `ZodEffects` and breaks module load).

### Phase 4 — conversion sweep

Partition by file, one agent per `level*.ts`, never `git add -A`. Convert only what fits: expect roughly 15-20 clean fits pre-Phase-3, rising to ~35-45 of 55 after it. Route strictly-linear chains to `pipeline` and N-row comparisons to `table` (both already static and cap-exempt). Leave §5.4 as fences. Note the shipped bug that `pipeline` without a `title` announces itself as "SQL logical execution order", so every SD caller must pass `title`.

**Also fix, unrelated but adjacent:** `docs/csdiagram-authoring.md` describes `ladder` as "messages crossing between participants over time: a handshake, a consensus round", which is a sequence diagram. The schema is ascending-magnitude bands on a log scale. The doc is wrong and will mislead an authoring agent.

**Re-measure before building anything new:** COUNCIL-AUDIT-2026-08-13.md §5.5 proposes a `state-machine` type. Phase 3's `feedback` + `reveal:"all"` + optional-badge changes may take it below its own three-lesson threshold. Sequence it after, then decide.

---

## 7. Cost

**Bundle: +0 bytes of dependency.** The renderer grows by orthogonal routing and the description builder, roughly +2-3 KB gzip, against a current whole-system footprint of ~21 KB gzip. Compare the rejected options: 16.9 KB (dagre runtime), 62.2 KB (React Flow), 178 KB (Mermaid), 440 KB (elkjs).

**Agent-days: ~12-16 total.** Phase 0 0.5; Phase 1 2.5; Phase 2 1.5; Phase 3 1.5; Phase 4 6-10 (the conversions dominate, and they are the part no library would have shortened).

**Effect on the 1,459 assertions: they should all keep passing, and this is better news than expected.** I read the suite and ran it (1,459 tests, green, 2.9 s). It asserts four things: every fence parses, every fence renders through the real markdown pipeline, no raw spec JSON leaks as text, and the same markdown renders **byte-identical HTML twice**. It does **not** assert on coordinates, node positions, or specific rendered label text. So the Phase 1 and 2 renderer changes do not touch it, provided rendering stays deterministic, which it does because layout stays a pure function of the spec. Phase 3 is additive with defaults, so all 22 existing topology specs parse unchanged.

The one real risk is the determinism assertion: any change that introduces run-to-run variation, an unseeded value or a time read, fails 1,459 tests at once. That is the suite working as designed, and it is precisely the property that adopting an external renderer would have put at risk.

---

## Appendix: verification log

Verified by me against the repo and the network on 2026-08-13:

- `topology-layout.ts` is 43 lines; relaxation runs `spec.nodes.length` passes; `e.kind !== "replication"` at line 19.
- Cyclic 6-node spec produces 32 columns / 5,666px, with `etl` (col 31) past `train` (col 27). Reproduced by re-implementing the shipped function exactly.
- `TopologyDiagram.tsx`: `NODE_W = 116`; `node.label.length > 18 ? node.label.slice(0, 17) + "…"`; `<svg aria-hidden="true" focusable="false">`; edges drawn as straight `<line>`; `visible` accumulates stages `0..player.index`; both nodes and edges filtered by it.
- `useStepPlayer` initialises `useState(0)`, so SSR renders stage 0 only. Contract comments confirm never-autoplay, reduced-motion, keyboard control.
- `DiagramFrame` supplies `<figure>`, `aria-label={groupLabel}`, `<figcaption>`.
- 22 authored topology specs across 18 files.
- `content-integrity.test.ts`: 1,459 tests, passing, 2.93 s; asserts parse + render + no-JSON-leak + byte-identical determinism.
- `ANIMATED_DIAGRAM_TYPES = new Set(["topology","ladder"])` at `coverage.ts:53`, one call site at `:181`.
- `lib/markdown/components.tsx:49` `<pre>` uses literal `border-gray-700/50 bg-gray-900/80 text-gray-200`, no `dark:`, no token. `preprocessAsciiArt` wraps loose ASCII into these same fences.
- 55 ASCII architecture fences in SD curriculum; widest line 126 chars; 24 fences contain a line over 80 chars.
- npm registry: mermaid 11.16.1 MIT; elkjs 0.12.0 EPL-2.0 OR GPL-3.0-or-later; @dagrejs/dagre 3.1.1 MIT; @xyflow/react 12.11.3 MIT; @viz-js/viz 3.29.0 MIT.
- Mermaid gzip: entry 11,025 B; entry + 9 static chunks 124,375 B; UMD 971,552 B (raw 3,566,058 B).

Taken from the surveys and **not** independently re-verified by me: all esbuild bundle measurements for elkjs / dagre / React Flow / d3-dag / reaflow / react-archer / react-xarrows; the D2 and Graphviz execution results; ELK and dagre layout-quality counts on the 22-spec corpus; the DOWN-flow width measurements; the ~21.3 KB figure for the existing system; the React Flow `role="application"` and attribution findings; the meta-analysis effect sizes.
