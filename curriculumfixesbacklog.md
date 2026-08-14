# Curriculum Fixes Backlog

The standing work queue for the Learn curriculum, sibling to `seofixesbacklog.md`. Sourced from the
46-agent council audit (`docs/system-design-curriculum/COUNCIL-AUDIT-2026-08-13.md`) and from the
independent checker pass that read every file after it was edited.

**These tickets are written to be executed by AI agents, so they are deliberately long.** Each one
carries the evidence, the exact scope, the constraints that will otherwise be violated, and an
acceptance test that can be run. An agent should be able to open a ticket and ship it without asking
a question or re-deriving a number. If a ticket here is ambiguous, that is a bug in the ticket.

**STATUS 2026-08-14: P0 and the P1 visual workstream are SHIPPED.** CUR-01 through CUR-08 and
CUR-13/14/15 are closed, along with SEO-01, SEO-03, SEO-35 and SEO-36. CUR-10's blocking schema
change (`supplied`) is in; its content authoring is not. CUR-09, CUR-11 and CUR-12 are open. See
the Log at the bottom for what actually moved, including two defects this backlog did not know
about and one it caused.

**Baseline, measured 2026-08-13 by `pnpm audit:sd`:**

| Metric | Value |
| --- | --- |
| Lessons | 208 across 12 levels |
| Prose words per lesson | 485 to 588 (flat across all levels) |
| Retrieval checks | 516 |
| Lessons with no check | 0 |
| Bare lessons (nothing to answer, nothing to see) | 0 |
| Lessons with no diagram or simulation | 105 |
| Simulations or animated diagrams | 88 |
| Static diagrams | 19 |
| Lessons drawing architecture in ASCII | 42 |

## Rules every ticket inherits

These are not optional and an agent that breaks one has failed the ticket regardless of what else it
did.

1. **Partition by file, never by topic.** Concurrent agents sharing a level file clobber each other.
   One agent owns one file in `lib/tutorials/system-design/curriculum/`.
2. **Never `git add -A`.** Stage explicit paths. `lint-staged` runs `git stash` on commit, which is
   hostile to concurrency, so an agent that stages broadly sweeps a sibling's half-finished edits
   into its own commit. Commit with `git -c commit.gpgsign=false` on this volume.
3. **The density cap is a test, not a guideline.** At most ONE simulation or animated diagram
   (`topology`, `ladder`) per lesson. Checks and static diagrams are exempt and uncapped. Enforced by
   `lib/tutorials/widgets/__tests__/sim-density.test.ts`. Check remaining budget with
   `pnpm audit:sd --lessons`; the `sims` column is the budget.
4. **The closure rule.** Every fact the graded work needs must be demonstrated in the teach section.
   A definition that lives only in a hint, only in a check's feedback, or only in a model answer is
   unreachable, because all three are opt-in or post-hoc.
5. **The spoiler rule.** Statements state the problem; hints carry the approach.
6. **Vocabulary before the check that leans on it.** Move the definition up to meet the check, never
   the check down to meet the definition.
7. **No em dashes in learner-facing prose.** In widget strings also no backticks, no backslashes and
   no `${`, because teach markdown is a TypeScript template literal and each of those corrupts it.
8. **Verify agent reports yourself.** Agents report success they did not achieve. Check `git log` for
   the commits, run the suite, and read a sample of the diff before relaying any result.

Run before and after every ticket:

```
pnpm audit:sd
npx vitest run lib/tutorials lib/markdown components/tutorials
```

---

## P0 — Quality debt from the 2026-08-13 check rollout

516 checks landed in one day. The independent checker pass found real defects in them. These are ours
and they should be paid before any new content lands on top.

### CUR-01 — 80 percent of predict checks can be answered without reading the question

**SHIPPED 2026-08-14.** 309/386 to 142/386. Read the Log before quoting that number: the gate was one-sided and the fix was too. **Effort:** 3 agent-days, four concurrent agents. **Blocks:** nothing, but every future check batch
inherits the defect until the test lands.

**Evidence.** Measured across the resolved curriculum on 2026-08-13. For each `predict` check, is the
option marked `correct` the longest label?

| Level | Predicts | Correct is longest | Correct in top 2 by length |
| --- | ---: | ---: | ---: |
| L0 | 24 | 13 (54%) | 20 (83%) |
| L1 | 31 | 21 (68%) | 28 (90%) |
| L2 | 29 | 25 (86%) | 26 (90%) |
| L3 | 25 | 14 (56%) | 21 (84%) |
| L4 | 25 | 18 (72%) | 23 (92%) |
| L5 | 35 | 23 (66%) | 28 (80%) |
| L6 | 39 | 34 (87%) | 36 (92%) |
| L7 | 29 | 26 (90%) | 28 (97%) |
| L8 | 30 | 27 (90%) | 29 (97%) |
| L9 | 30 | 24 (80%) | 28 (93%) |
| L10 | 67 | 65 (97%) | 67 (100%) |
| L11 | 22 | 19 (86%) | 22 (100%) |
| **Corpus** | **386** | **309 (80%)** | **356 (92%)** |

Chance for a four-option question is 25 percent longest and 50 percent top-two. A learner can score
about 80 percent on every check in the course by picking the longest option without reading the stem.
That is precisely the click-through reflex retrieval practice exists to prevent, and it means the
measured "516 checks" overstates how much assessment actually happens.

**This is not only the new work.** L2 at 86 percent, L6 at 87 percent and L8 at 90 percent all
predate 2026-08-13. The rollout amplified an existing habit rather than inventing it. Fix the corpus,
not just the batch.

**Why it happens.** The correct option carries the nuance, so it naturally attracts qualifying
clauses ("..., which is why the deploy order matters"), while distractors get written short and
declarative. The fix is not to pad distractors with filler; it is to move the justification out of
the correct LABEL and into its FEEDBACK, where it belongs and where it is read after committing.

**Do.**
1. Land the guard first, on the corpus as it stands, pinned at today's number so it is green on
   arrival: `lib/tutorials/system-design/__tests__/check-answer-shape.test.ts`. Assert the share of
   predicts whose correct option is the longest label stays at or below its current value, and
   ratchet the pin down with each batch. Confirm it fails by lengthening one correct label.
2. Then, one agent per level file, rewrite labels so length carries no signal. The target is a
   corpus figure at or under 40 percent, not zero: forcing exactly 25 percent would itself be a
   pattern.
3. Move every justification clause from the label into that option's `feedback`. Labels become short
   and parallel in construction; feedback does the teaching.
4. Do not touch which option is correct. This ticket changes wording only. If an agent believes an
   answer is wrong, that is CUR-03, not this.

**Accept.**
- Corpus figure at or under 40 percent, no level above 55 percent.
- `check-answer-shape.test.ts` exists, is pinned, and was confirmed to fail when a correct label is
  lengthened.
- Total checks stays at 516 (`coverage-floors.test.ts` already enforces the floor).
- Spot-read twenty rewritten checks: every `feedback` still explains why a wrong option is tempting.

### CUR-02 — Roughly fifteen checks are answered by the sentence directly above them

**SHIPPED 2026-08-14.** Every named site resolved; the corpus now has zero checks sharing an eight-word run with the paragraph above them. **Effort:** 2 agent-days, four concurrent agents, one per file.

**Evidence.** The checker pass reported filler counts of 5 (level10), 6 (level9), 2 (level7), 2
(level11) and 0 (level6). A filler check asks the learner to recall a phrase they read two lines
earlier, which trains skimming. `docs/cswidget-authoring.md` already binds the rule: "Every check
targets a NAMED misconception. If you cannot name what the learner would get wrong, the check is
filler, cut it." And the misconception-first placement rule requires the check to sit AFTER the
paragraph that sets the question up and BEFORE the one that resolves it. Most of these sit after the
resolution.

Named instances, verbatim from the checkers:

| Lesson | Site | Defect |
| --- | --- | --- |
| `sd-l10-key-value-store` | level10.ts:2371 | Correct option is the two preceding sentences with clauses reordered. Move the check above the bloom-filter and compaction sentences so the learner predicts where read cost reappears. |
| `sd-l10-web-crawler` | level10.ts:3469 | Answer and its justification both appear verbatim above. Move to just after "The heart is the frontier: the queue of URLs to fetch." |
| `sd-l10-yelp-nearby` | level10.ts:2119 | Correct option merges two sentences from 16 and 22 lines earlier. This lesson's other check is also answered by prose plus the Recap, so it currently has no genuine prediction at all. |
| `sd-l10-message-queue` | level10.ts:2607 | Sits directly after the exactly-once sentence it asks about. Move between the at-least-once sentence and the exactly-once one. |
| `sd-l10-object-store-s3` | level10.ts:2567 | Asks about a number the lesson states four times (teach, sim caption, Interview nuance). Re-point the prompt at when replication is still right for hot small objects, which the lesson states once and never tests. |
| `sd-l10-ecommerce-flash-sale` | level10.ts:3398 vs 3435 | A distractor at 3398 gives away the entire prompt of the cumulative check at 3435. Reword the distractor. |
| `sd-l10-distributed-cache` | level10.ts:2252 | Two classify items restate ground the hash-ring sim's predictPrompt already gates. Mildest case; the two "needs a different mechanism" items are the real work. |
| `sd-l9-table-formats-cdc` | level9.ts:1870 | Answer is the sentence immediately above: "You cannot fix this with retries because you do not know which write succeeded." |
| `sd-l9-batch-streaming` | level9.ts:1952 and :2029 | Both answered by the sentence directly above. |
| `sd-l9-service-mesh` | level9.ts:735 | Correct option restates line 611. Placement inversion. |
| `sd-l9-oltp-vs-olap` | level9.ts:1688 | All six classify items are verbatim phrases from the two sections above, so the task is column lookup rather than discrimination. |
| `sd-l9-platform-gitops` | level9.ts:1112 | Cumulative check answered by the Interview nuance four lines up. |
| `sd-l9-12factor`, `sd-l9-serverless` | level9.ts:847, :931 | Borderline recall; correct options echo the Recap directly above. |
| `sd-l7-multi-az-not-multi-region` | level7.ts:1869 | Sits immediately after the sentence that answers it. |
| `sd-l7-bulkheads` | level7.ts:1452 | Answer stated verbatim six lines above with the same numbers. |
| `sd-l7-metastable` | level7.ts:1539 | Resolving sentence is directly above. |
| `sd-l7-sli-slo-sla-sort` | level7.ts:210 | Every item decidable from one surface keyword; items 2, 4 and 6 are near-clones of 1, 3 and 5. |
| `sd-l11-bounded-tags` | level11.ts:1324 | Four of six items keyed by the sentence directly above. |
| `sd-l11-llm-agents` | level11.ts:758 | Correct option transcribes the ASCII block immediately above it. |
| `sd-l11` cumulative checks | five sites | Echo pattern: correct options are near-verbatim lifts of the Recap directly above. |
| `sd-l11-feature-store` | level11.ts:133 | Diagram read-off: the answer is labelled in the ASCII above. |

**Do.** For each, either move the fence to its misconception-first position, or re-point the prompt
at something the lesson states but never tests, or delete it and replace it with a real one. Deleting
without replacing is allowed only if the lesson still carries at least one check and you say so.
Prefer moving over rewriting: several of these are good questions in the wrong place.

**Accept.**
- Every listed site resolved, with a one-line note in the commit saying which of the three routes was
  taken and why.
- Total checks stays at or above 516.
- A re-read by a fresh agent finds no check whose correct option shares a run of more than eight
  consecutive words with the paragraph immediately preceding it.

### CUR-03 — Four correctness defects inside checks

**SHIPPED 2026-08-14**, and two MORE correctness defects were introduced by the diagram sweep and fixed on the way out (a calc widget asserting 80 billion series while a graded check said 10 million, and a caption claiming three compensations where two existed). **Effort:** 0.5 agent-days. Highest severity per unit of work in this file.

A wrong answer marked correct is worse here than anywhere else in the product, because there is no
grader: the widget IS the authority, and the learner installs it as truth.

| Lesson | Site | Defect and fix |
| --- | --- | --- |
| `sd-l7-burn-rate` | level7.ts:459 | Prompt says errors "for the last 40 minutes" and the correct option asserts "both windows are over threshold". Arithmetically false against the burn-rate ladder this same lesson teaches: the canonical fast-burn rule needs the 1-hour long window over 14.4x, and 40 minutes at 1.44 percent does not put both windows over. Recompute and rewrite the option, or change the stated duration so the claim holds. |
| `sd-l10-leaderboard-topk` | level10.ts:3885 | Correct option asserts "Both do a full sort or scan per request". True for the rank half (counting higher scores) but false for the top-ten half: with an index on score, `ORDER BY score DESC LIMIT 10` is a ten-row index scan. The check itself assumes an index exists, since a distractor's feedback says "The index stays current." Narrow the claim to the rank half. |
| `sd-l9-service-mesh` | level9.ts:577 vs :579 | Teach says the sidecar tax is "often 1 to several ms per call". The check two lines later marks "About 3 ms, one proxy per hop" WRONG and asserts "The tax is charged per proxy traversal, not per call". The lesson now contradicts itself. Decide which framing is right (per traversal is the accurate one) and fix the teach to match, since the check is correct and the prose is loose. |
| `sd-l7-deadline-propagation` | level7.ts:985 | Asks "What is the worst case?" and answers "Up to 3 seconds of work across the chain". That holds as summed thread-time but the worst-case wall clock a user experiences is 1.4s, because A's own 1s timeout on B already bounds it. Say which quantity is meant in the prompt. |

**Accept.** Each fixed, each with its own commit citing the lesson id, and the arithmetic checked by
a second agent rather than by the one that wrote it.

### CUR-04 — A load-bearing fact lives only in check feedback

**SHIPPED 2026-08-14.** **Effort:** 0.25 agent-days. This is a closure-rule violation, which CLAUDE.md treats as a build
failure class rather than a nit.

**Evidence.** `sd-l11-globally-consistent-multiregion`, level11.ts:1141. The teach at :1139 says HLCs
"combine physical time with a logical counter to preserve causality" and stops. The claim that HLC
alone does NOT provide external consistency appears nowhere in the teach; it exists only inside a
check's feedback. Feedback is read after committing to an answer, so a learner who picks correctly by
luck never meets the fact, and a learner who skips the check never meets it at all.

This matters more than usual because `sd-l5-physical-time-hlc` GRADES the distinction: level5.ts:1045
marks "cannot alone guarantee external consistency" as the correct answer.

**Do.** Add one sentence of teach prose to `sd-l11-globally-consistent-multiregion` stating that HLC
preserves causality but does not by itself give external consistency, and that TrueTime's bounded
uncertainty is what buys it. Point back to `sd-l5-physical-time-hlc`. Then re-read the check; it may
become a better question once the fact is teachable.

**Accept.** The fact appears in teach prose. A grep for "external consistency" across the corpus
shows it stated in teach in both L5 and L11, not only in widget strings.

### CUR-05 — Vocabulary used before it is introduced

**SHIPPED 2026-08-14.** **Effort:** 0.25 agent-days.

**Evidence.** `sd-l10-ride-sharing`, level10.ts:1111. The prompt reads "Geohash, S2 and H3 all attack
the same problem. What do they do to the coordinates?" None of those three names appears earlier in
the teach; the section that defines them is 25 lines below, and its first sentence IS the correct
option.

CLAUDE.md says to move the definition up to meet the check rather than the check down. Here the
definition cannot move up without gutting the check, which makes this the documented exception: the
prompt should stop leaning on three unintroduced proper nouns.

**Do.** Reword to something like "A bounding-box scan is O(n) per query. What does a spatial index
have to do to the coordinates to make proximity cheap?" and let the geohash, S2 and H3 names land in
the resolving section where they are defined.

**Accept.** No check prompt in the corpus names a proper noun that its own lesson has not yet
introduced. Worth a test if a second instance turns up.

### CUR-06 — One stale figure carried into a check

**SHIPPED 2026-08-14.** **Effort:** 0.1 agent-days.

**Evidence.** level9.ts:1041, edge classify feedback: "Edge runtimes budget tens of milliseconds of
CPU per request", echoing teach at :967. That reflects the Cloudflare Workers free tier; paid Workers
now default to 30s of CPU and can be raised. The bucket the item sorts into (Origin region) is still
correct on architectural grounds, so the check survives; only the justification is stale.

**Do.** Correct both sites. Re-anchor the justification on the architectural reason (cold data and
large working sets belong at origin) rather than on a CPU quota that vendors keep moving.

**Accept.** Neither site quotes a CPU-millisecond budget as the reason.

---

## P1 — The visual gap

### CUR-13 — Topology diagrams server-render only their first stage

**SHIPPED 2026-08-14.** 57 of 87 node labels were missing from server HTML; now zero. **Effort:** 1 agent-day. **Blocks:** CUR-07. **This is an SEO bug on the traffic surface.**

**Evidence.** Verified 2026-08-13 by rendering a four-node, three-stage topology through
`renderToStaticMarkup`:

```
IN SSR HTML : Client
IN SSR HTML : Load balancer
MISSING     : Service
MISSING     : Database
```

`useStepPlayer` initialises to `useState(0)` and `TopologyDiagram` filters both nodes and edges to
the visible set, so the server HTML contains stage 1 of N and nothing else. All 22 shipped topology
diagrams are affected, on `/learn` pages that are the site's main organic-traffic surface.

Two consequences. Googlebot indexes a fraction of each architecture diagram, so the content we are
trying to rank on is partly invisible to the crawler. And any reader before hydration, or with JS
disabled, sees a truncated system.

**Do.** Render the complete diagram in server HTML and let the staged reveal be a client
enhancement that hides later stages after mount, rather than a client feature that adds them. That
inverts the current default from "nothing until JS" to "everything until JS narrows it", which is
the correct default for indexed content and for `prefers-reduced-motion`.

**Accept.** A test renders every authored topology through `renderToStaticMarkup` and asserts every
node label appears in the server HTML. Confirm it fails against today's renderer before fixing.
Fetch a live lesson with `curl` after deploy and grep for a last-stage node label.

### CUR-14 — The topology layout explodes on a cycle and draws backwards arrows

**SHIPPED 2026-08-14.** Max columns across the corpus 36 to 8. `sd-l10-web-crawler` was ALREADY shipping at 36 columns, so this was live, not hypothetical. **Effort:** 1.5 agent-days. **Blocks:** CUR-07, hard.

**Evidence.** Verified by calling `layoutTopology` directly with a six-node feedback loop, which is
the exact shape of the ML blueprint lesson's own ASCII drawing (raw logs to ETL to training to
registry to serving to feedback log, back to ETL):

```
nodes: 6   max column: 31
  raw col=0   etl col=31   train col=27   registry col=28   serve col=29   feedback col=30
edge etl -> train: POINTS BACKWARD (etl col 31 is after train col 27)
approx width px: 6264
```

Six nodes produce thirty-two columns and a diagram roughly 6,264 pixels wide, with an arrow running
backwards. It passes the Zod schema, passes the integrity test, and would ship, because the only
render assertion is `not.toThrow()`.

**Why this blocks CUR-07 rather than sitting beside it.** Feedback loops are everywhere in the
lessons queued for conversion: ML training loops, streaming pipelines with replay, retry paths,
CDC. The first agent to convert one of those ASCII drawings ships a broken 6,000-pixel diagram and
nothing catches it. Per CLAUDE.md the check that catches a bad edit lands before the sweep, not
after.

**Do.** Break cycles at layout time the way a layered layout is supposed to: detect back edges,
assign the cycle-closing edge a reversed rank, and render it as a return arrow rather than pushing
the node into a new column. Then bound the result: a spec that cannot lay out inside a sane column
count should fail `parseDiagramSpec` with a readable message, not render.

**Accept.** The six-node loop above lays out in at most 6 columns with the return edge drawn
backwards deliberately. A test asserts no authored topology exceeds a column count near its node
count, and that every edge either points forward or is explicitly marked as a return edge. Confirm
the test fails on today's layout.

### CUR-15 — Topology SVG content is hidden from screen readers

**SHIPPED 2026-08-14.** **Effort:** 0.5 agent-days.

**Evidence.** `components/tutorials/diagrams/TopologyDiagram.tsx:80` sets `aria-hidden="true"` on
the `<svg>`, with `focusable="false"`.

Stated precisely, because the situation is better than "no alternative": the frame does supply an
accessible name (`label={spec.title}` and a `groupLabel` describing a steppable build), and each
stage's `note` is required by the schema and rendered as real text, so a screen-reader user gets a
narrated walkthrough. What they never get is the structure: node labels, what connects to what, and
which edges are sync, async or replication.

**Do.** Give the SVG a real accessible name and description built from the spec rather than hiding
it, or render a visually-hidden structured list beside it (nodes by kind, then edges as "A calls B
synchronously"). The second is usually better for a graph, because a flat description of a
two-dimensional structure reads poorly.

**Accept.** A screen reader can enumerate every node and edge. No authored diagram has
`aria-hidden` on content that carries information. Add the assertion to the integrity test.

### CUR-07 — Replace the 42 ASCII architecture drawings

**SHIPPED 2026-08-14.** Architecture drawings 70 to 3; lessons with no diagram or simulation 105 to 3; ten of twelve levels at zero. Checks held at 516 throughout. **Effort:** 12 to 16 agent-days. **Depends on:** CUR-13, CUR-14 and CUR-15, all of which must land
first. **Decision:** `docs/system-design-curriculum/DIAGRAM-LIBRARY-DECISION-2026-08-13.md`.

**The verdict is KEEP AND EXTEND: adopt no diagram or layout library, at runtime or at build time.**
Fourteen candidates were surveyed and all fourteen rejected, but not for the reason anyone expected.
The deciding argument is that the three live constraint failures are in our own code and no library
touches any of them: the diagram does not server-render (CUR-13), the layout breaks on a cycle
(CUR-14), and the content is hidden from assistive technology (CUR-15). Adopting elkjs or dagre
would have imported a layout engine while leaving all three defects in place.

**One prior fact corrected.** The 2026-07-04 rejection of Mermaid cited "~500KB+ gzip", which
measured neither real artifact. Measured against mermaid 11.16.1: ESM entry 11,025 B gzip, entry
plus nine static chunks 124,375 B, UMD single-file 971,552 B gzip. Cite 121 KB, never 500 KB. The
verdict does not change, but it now rests on the constraint failures rather than on a wrong number.
Two other clauses of that decision are stale and should stop being quoted: the React 19
`findDOMNode` risk is resolved, and "non-deterministic layout" is correct for physics simulation but
false for layered Sugiyama layout, which is what dagre and ELK do.

**Evidence.** 42 lessons draw their architecture as ASCII inside plain code fences, exactly one
drawing each, concentrated in L6, L7, L9, L10 and L11. 105 of 208 lessons carry no diagram or
simulation at all. ASCII survives copy-paste into a terminal and nothing else: it does not scale on
mobile, it is read character by character by a screen reader, and it cannot be themed.

**On build-time rendering, which was the most promising angle.** Technically yes, and it genuinely
neutralises the bundle and licence objections, so any argument against a build-time engine that
leans on those is leaning on nothing. It still loses, for three reasons worth recording: there is no
payload to eliminate (the whole diagram system is about 21 KB gzip), baking the diagram at build
time forfeits the staged reveal where the WCAG 2.3.3 compliance and the segmenting benefit live, and
static SVG bakes colours against a `.dark`-class theme with `enableSystem={false}`.

**One honest re-entry criterion**, recorded rather than a permanent refusal: if orthogonal edge
routing in our own renderer still leaves more than roughly three edges crossing through unrelated
boxes, revisit `@dagrejs/dagre` as a build-time devDependency with canonical node sorting.

**The constraint that shapes the work.** The density cap. `topology` and `ladder` are animated and
therefore capped at one per lesson, and 14 of 28 L10 lessons are already at that cap. So a large
share of the 42 cannot take a topology and need a STATIC box-and-arrow form that does not count
against the animation budget. The proposed schema changes are additive and optional: `reveal: "all"`
to opt out of staging (which also makes a diagram exempt from the cap), a `feedback` edge kind, and
`groups` for swimlanes.

**Two shapes are deliberately left unconverted**, which makes restyling the `<pre>` fence mandatory
rather than optional: decision branches, and nodes whose content is a list. Those stay as text.

**The single biggest reader-facing win costs nothing and beats what a library would achieve:**
vertical flow with wrapped labels takes diagrams over 720px from 8 of 22 down to 0 of 22, with
honest untruncated labels.

**Accept.** Zero ASCII architecture drawings in L6, L7, L9, L10 and L11.
`lessonsWithoutDiagramOrSim` falls from 105, with the ratchet in `coverage-floors.test.ts` lowered in
the same commit. No lesson exceeds the density cap. Every diagram server-renders and carries an
accessible name.

### CUR-08 — Deploy existing widget families where they were never used

**SHIPPED 2026-08-14.** Simulations and animated diagrams 88 to 166. **Effort:** 2 agent-days. **Depends on:** CUR-07's decision only for the diagram half; the widget
half can start now.

**Evidence.** Eleven simulation families exist and are documented in `docs/cswidget-authoring.md`.
Several are used in one or two levels and never elsewhere despite obvious fits: `partition-sim` in the
partitioning lessons, `quorum` where the R+W>N misconception is taught, `cache-sim` in the caching
lessons, `replication-lag` in read-your-writes. L2 has zero `calc` widgets in the most quantitative
material in the course.

**Do.** For each of the 120 lessons with density-cap headroom, decide whether an existing family
models the concept better than the prose does. Deploy at most one per lesson. Do NOT build a new
family; if none fits, `steps` is the general frame-stager and is almost always the answer.

**Accept.** Each addition names the family and the misconception it makes visible. Density cap
unbroken. No new widget family added under this ticket.

---

## P1 — Content and pedagogy

### CUR-09 — Re-scope or delete SD-W5

**Effort:** 0.5 agent-days to re-scope, then unknown.

The council's SD-W5 "Depth promotion" was premised on L7, L9, L10 and L11 being thin, measured by
`teachWords`. That metric counted fence bodies, and a widget spec is JSON, so it was reporting which
levels carried widgets. On prose the twelve levels run 485 to 588 words and there is no gap. The
thesis is retracted in the audit document.

The closure-repair half survives and is real: an exercise whose model answer needs a fact the teach
never demonstrated is a defect regardless of word counts. That is found by reading a lesson against
its own answer key, not by measuring it.

**Do.** Rewrite SD-W5 as a closure audit with no word-count targets. One agent per level file reads
each lesson's `modelAnswerOutline` and lists every term or technique the teach never demonstrated.
Diagnosis only; repair is a separate ticket against a written list, per the separate-diagnosis-from-
repair rule.

**Accept.** A written list of closure gaps per lesson. No ticket in this repo any longer expresses a
content target as a word count.

### CUR-10 — The AI-resistant exercise genres (council SD-W7)

**Effort:** 5 agent-days. This is the ticket the owner actually asked the council about.

**Evidence.** All 416 exercises are generation tasks and 303 of them open with the word "Design".
That is the single thing a language model already does perfectly, so it is the weakest possible
discriminator in a 2026 interview.

The council identified the skills a model is measurably bad at and a live interview can test:
resolving ambiguity by asking rather than assuming; committing to a position and defending it under
informed pushback, including knowing when to concede; grounded estimation with stated assumptions
followed by a sanity check; diagnosing a specific production incident from symptoms; saying "I do not
know, here is how I would find out"; noticing over-engineering; cost and operational-burden reasoning
against a real budget; migration sequencing (what ships first, what the intermediate state is, how to
roll back); and critique, spotting the wrong answer that sounds right.

**The constraint.** The current exercise model is free-response with a revealed bullet outline and no
grader. Several of these genres do not fit it. Section 5 of the audit notes that `starterAnswer`
cannot carry a critique artifact, because it is editable seed text, so a flawed design placed there
lands inside the learner's own saved answer. A read-only `supplied` field on `DesignExercise` is
needed first.

**Do.** Add the `supplied` field and render it read-only. Then author the genres, starting with
critique (review a flawed design and find what is wrong) and incident diagnosis (given these symptoms
and these graphs, what is happening), because both are assessable by self-comparison and both are
things a model fails at in a way a rubric can show.

**Accept.** `DesignExercise` carries a read-only `supplied`. At least two new genres shipped across
at least twenty lessons. A test asserts `supplied` never appears in the editable answer buffer.

### CUR-11 — Turn the reveal panel into a rubric (council SD-W11)

**Effort:** 3 agent-days.

A learner writes free text, reveals a bullet list, and self-compares. A bullet list is a weak
comparison target: it says what a good answer contains, not how to tell whether yours did. There is
no point in 208 lessons where a learner gets feedback on their own writing.

**Do.** Convert the reveal into a self-scoring rubric: a small number of named dimensions, each with
what a weak, adequate and strong answer looks like, so the learner grades their own text against
something concrete. Consider a worked "strong versus weak answer" pair on the highest-traffic
lessons. Do not build an autograder under this ticket.

**Accept.** The reveal panel renders rubric dimensions. Ships behind a flag on one level first.

### CUR-12 — Remaining council workstreams, not yet ticketed

Carried here so they are not lost. Each needs expanding into a full ticket before an agent runs it,
following the shape above.

| Council id | What | Rough effort |
| --- | --- | --- |
| SD-W8 | The AI-era content build: what 2026 interviews ask about LLM serving, agents, evals, cost per token, multi-tenancy. Coordinate with `seofixesbacklog.md` SEO-19, since "llm serving" and "model gateway" already draw impressions with no page addressed to them. | 5 days |
| SD-W9 | The cost and estimation spine: cost as a first-class design axis, which is under-taught everywhere and now routinely asked. | 3 days |
| SD-W10 | Spoiler and scaffolding repair: prompts that hand over the approach rather than stating the problem. | 2 days |
| SD-W12 | The currency batch: dated framings ("the 2024 to 2025 shift"), version claims, and anything that will read as stale in a year. | 2 days |
| SD-W13 | Wire lessons to the timed drills, so the curriculum and the interview surface reference each other. | 2 days |
| SD-W14 | Duplication and ownership cleanup: one L6 lesson re-teaches a quarter of `sd-l6-kafka-internals`. | 1 day |

---

## Cross-referenced from the SEO backlog

These live in `seofixesbacklog.md` but are curriculum work and will be executed by the same agents.

- **SEO-35** — 165 of 208 system design summaries exceed 160 characters in a field typed "One line,
  for the module list", worst at 493. Truncates into both the meta description and the module list
  UI. Partition by level file, one agent each, then convert the hygiene reporter into a failing
  assertion.
- **SEO-01** — lesson titles render at 83 to 84 characters against a roughly 60-character display
  budget.
- **SEO-03** — lesson pages emit only site-level JSON-LD, so a page about fencing tokens describes
  itself to Google as software priced at $25 a month.

---

## Not doing, on purpose

- **Padding lessons to a word count.** The metric that suggested it was measuring widget JSON. See
  CUR-09.
- **Forcing the correct-answer-is-longest rate to chance.** Exactly 25 percent is itself a pattern a
  learner can exploit. CUR-01 targets 40 percent.
- **Adding a new widget family before exhausting the eleven that exist.** `steps` is a general frame
  stager and is almost always the answer to "we need a stepper for X".
- **Building an autograder for free-response design answers.** CUR-11 raises self-assessment quality
  without one; grading prose is a different product.
- **Re-litigating the 2026-07-04 decision against physics graphs.** Non-deterministic layout breaks
  spatial memory across revisits and canvas is a screen-reader black box. Both still hold. Note that
  two OTHER clauses of that decision are stale and should stop being quoted: the React 19
  `findDOMNode` risk is resolved, and the "~500KB gzip" Mermaid figure was wrong (121 KB measured).
- **Adopting a layout library to fix diagram quality.** Surveyed and rejected: all three real defects
  (CUR-13, CUR-14, CUR-15) are in our own renderer, and a library fixes none of them. Re-entry
  criterion is recorded in CUR-07.

## Log

| Date | Checks | Checkless | Bare | No diagram or sim | Correct-is-longest | Best blind length strategy | Best blind position strategy |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2026-08-13 (before) | 343 | 78 | 44 | 105 | not measured | not measured | not measured |
| 2026-08-13 (after checks) | 516 | 0 | 0 | 105 | 80% | 80% | 58% |
| 2026-08-14 (after CUR-01..08) | 516 | 0 | 0 | 3 | 37% | 41% | 35% |

Two columns were added because the original single column measured the wrong thing, twice.

**"Best blind length strategy" is `max(correct-is-longest, correct-is-shortest)`.** CUR-01's gate
counted only the longest direction, so twelve agents reduced exactly that: most chopped the correct
label and left the distractors untouched, which INVERTS a tell rather than flattening it. On L6 the
agent edited zero distractor labels across nineteen rewritten checks while click-longest fell 87 to
38 percent and click-shortest rose 8 to 49. A guessing learner picks one strategy and sticks to it,
so the honest figure is the better of the two, and by that measure the sweep took 80 percent to 41
against a 33 percent chance floor. Real and large, but not the 37 percent the one-sided column
implied.

**"Best blind position strategy" was never measured by anyone** and was the larger defect the whole
time. In authored order the correct option sat at position 1 in ALL 67 L10 checks and position 2 in
ALL 22 L11 checks, so "always click position N" paid 100 percent on the two levels with the most
search traffic, 97 on L6, 90 on L7, and 58 corpus-wide. It cost nothing to exploit because it
needs no reading at all. Found by an adversarial verifier reading a finished level file, not by the
council audit, this backlog, or the gate written to drive the sweep. Fixed in
`lib/tutorials/widgets/option-order.ts` by rendering options in a stable order derived from the
check's own text, which makes the authoring habit behind it (write the true statement first, invent
distractors after) irrelevant rather than merely corrected.

**The lesson worth carrying:** every metric in the first three columns was a count of things we had
already decided to look at. Both defects that mattered most were found by pointing a reader at the
finished work with no metric in hand. Keep the gates, but do not mistake them for coverage.
