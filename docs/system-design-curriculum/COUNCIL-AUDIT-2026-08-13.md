# System Design Curriculum: Council Audit and Work Plan

**Date:** 2026-08-13
**Scope:** all 208 lessons in `lib/tutorials/system-design/curriculum/level{0..11}.ts`, plus the
player and widget surfaces that render them.
**Inputs:** six council seats, seven deep readers, one adversarial verification pass over every
falsifiable claim.
**Status:** plan of record. Nothing below has been implemented. This document is the work list.

---

## How to use this document

Sections 1 and 2 are the diagnosis. Section 3 is the executable plan: each workstream has a stable
id (`SD-W1` ... `SD-W14`), an explicit file/lesson partition, and acceptance criteria a reviewer can
check without re-reading the corpus. Sections 4 through 6 are the design detail those workstreams
reference. Sections 7 and 8 exist so nobody spends a second week re-deciding what was already
decided.

### Standing constraints every workstream inherits

These are not suggestions. Each one has already cost a rewrite somewhere in this repo.

1. **The density cap is enforced by CI.** `lib/tutorials/system-design/coverage.ts:53` declares
   `ANIMATED_DIAGRAM_TYPES = new Set(["topology", "ladder"])`, and those two diagram types share the
   one-heavy-item-per-lesson budget with all eleven simulation widget families.
   `lib/tutorials/widgets/__tests__/sim-density.test.ts` fails the build on a second heavy item.
   `pipeline`, `table`, `er` and `comprehension` are static and exempt. Checks are exempt and
   uncapped. A large fraction of the council's diagram recommendations would have failed CI; the
   conversions in section 5 have already been filtered against this.
2. **Lesson ids are frozen.** They key user progress. Re-scope content inside an existing id; never
   renumber, never reorder to fix a dependency. Fix a forward reference by teaching the fact, not by
   moving the lesson.
3. **Partition by file, not by topic.** Concurrent agents get disjoint `level*.ts` files. Never
   `git add -A` while a sibling agent is running. Commit with `git -c commit.gpgsign=false` on this
   volume.
4. **No em dashes in learner-facing prose.** Enforced for prompts by
   `lib/tutorials/__tests__/prompt-standards.test.ts`.
5. **Build the verifier before the sweep.** SD-W1 exists for exactly this reason and blocks the three
   large sweeps.
6. **Closure rule.** Every FACT the model answer relies on must be recoverable from teach. Every
   DECISION stays the learner's. In a free-response course with no grader, the revealed
   `modelAnswerOutline` is the entire correction channel, so a fact that appears only there is
   installed as belief without ever having been taught.

---

## 1. Verdict

This is a strong curriculum that stopped being built four levels from the end.

Levels 0 through 6 and Level 8 are genuinely good, and the council spent real effort trying to break
them and mostly failed. Level 0 teaches interview method better than any published resource I have
read: scoping against a hostile non-answer, Fermi estimation to peak QPS, a six-phase minute budget,
the fact-versus-decision distinction, and a junior/senior/staff rubric with concrete calibration.
Levels 2 through 5 average over 1,200 teach words with misconception-first checks carrying real
per-option feedback, and their model answers commit to a named tradeoff instead of listing
components. Ninety-two percent of exercises close on a precisely authored "Common wrong turn." The
`thinkAbout` prompts are 1,246 unique strings out of 1,249. Recap coverage is 207 of 208. The
arithmetic is correct nearly everywhere the readers checked it. This corpus is not slop.

Then it falls off a cliff at Levels 7, 9, 10 and 11: 76 lessons, 37 percent of the course, carrying
zero retrieval checks, 44 percent of the visual budget of their neighbours, and 44 lessons that are
pure prose with nothing to answer and nothing to see.

**The single structural fact that explains most of it: the corpus was authored exercise-first, and
the finishing passes ran out before the last four levels.** The proof is that average model-answer
length is near-constant across all twelve levels (542 to 646 words) while average teach length
collapses from about 1,250 to 612. The answer keys were written to a uniform budget and completed;
the teach halves of L7, L9, L10 and L11 were not. Ratio of model-answer words to teach words is 0.46
to 0.53 for L0 to L6 and L8, then 0.79 at L10, 0.82 at L7, 0.92 at L9, and 1.03 at L11, where the
two answers are now longer than the lesson. The same truncation shows in the interactivity program:
`INTERACTIVITY-PLAN.md:240` schedules "Iteration 12: check completion (L6, L9, L10, L11)", L6
shipped its 41 checks, the rest never ran, and Level 7 was never scheduled into any check wave at
all. So the depth did not evaporate. It migrated into the answer key, which the learner only opens
after they have already written.

Two things make this worse than an unfinished tail. First, those four levels are exactly what a 2026
interview grades hardest (operations, cost, modern architecture, and full case studies) and exactly
where Google already sends us traffic: nine of the ten highest-impression System Design pages are
Level 10. Second, `components/tutorials/SystemDesignLessonPlayer.tsx:76` renders only `lesson.apply`,
so no signed-in learner can ever write or save a Practice answer, and all 208 practice
`modelAnswerOutline`s are reachable from no surface at all. They are the harder transfer problems
carrying the real constraints. Half the assessment we paid to build is unusable.

**Corrected during verification.** The council's original wording, that Practice is "never displayed
to anyone", is wrong and the record should say so. `components/learn/PublicLessonArticle.tsx:302`
renders `preview.practice` under a "Make it stick" heading, so a signed-out reader on the public
lesson page does see every practice prompt and its `thinkAbout` list. What that page deliberately
seals is the answer key: `toPublicExercisePreview` in `lib/tutorials/public-preview.ts:141` projects
only `prompt`, `thinkAbout`, `hintCount` and `gradedCheckCount`, so `modelAnswerOutline` is published
nowhere. The defect is therefore sharper and more embarrassing than the one first reported: the
signed-in product offers strictly less assessment surface than the free public page it gates, and the
one artifact a self-comparing course cannot do without, the model answer, is the piece no reader can
reach.

Beneath both sits a design question the council raised independently from five seats and which the
owner is right to treat as central: all 416 exercises are generation tasks, 303 of them opening with
the word "Design". That is the one thing a language model already does perfectly.

---

## 2. The evidence table

Measured by `npx tsx scripts/audit-system-design-curriculum.ts`, which walks the resolved curriculum
rather than grepping source, and reconciles exactly with the supplied inventory. "csdiagrams" counts
static plus animated; "cswidgets" counts checks plus simulations; "bare" is a lesson with no check,
no diagram and no simulation; "ASCII" is plain triple-backtick fences.

| Lvl | Slug | Lessons | Avg teach words | csdiagrams | cswidgets | Checks | Bare | ASCII | One-line verdict |
|----|------|--------:|----------------:|-----------:|----------:|-------:|-----:|------:|------------------|
| 0 | interview-method | 15 | 1097 | 3 | 39 | 36 | 0 | 16 | Best method teaching in the corpus; artifacts still monospace, and it never costs anything in dollars. |
| 1 | foundations | 21 | 1227 | 3 | 57 | 47 | 0 | 9 | Excellent and dense; three lessons whose entire subject is a picture ship no diagram. |
| 2 | data-storage | 17 | 1258 | 6 | 45 | 42 | 0 | 4 | Strongest written level; zero `calc` widgets in the most quantitative material. |
| 3 | scaling-data | 16 | 1255 | 4 | 47 | 39 | 0 | 10 | Same quality; `partition-sim` exists and the partitioning lessons never use it. |
| 4 | scaling-compute | 14 | 1198 | 2 | 45 | 39 | 0 | 12 | Dense prose, near-zero diagrams, no QUIC and no GPU anywhere in the compute level. |
| 5 | distributed-core | 18 | 1219 | 6 | 59 | 53 | 0 | 8 | The interactivity high-water mark; two hardest mechanisms still drawn in ASCII. |
| 6 | event-driven | 15 | 1176 | 2 | 49 | 41 | 2 | 9 | Strong; two m5 lessons bare, one re-teaches a quarter of kafka-internals. |
| 7 | reliability-ops | 17 | 791 | 1 | 8 | **0** | 8 | 13 | The staff differentiator, the thinnest level, never scheduled into any check wave. |
| 8 | security-privacy | 16 | 1252 | 1 | 48 | 46 | 0 | 14 | Deep and well ramped, but a 2023 syllabus, and it spends its whole budget on checks. |
| 9 | modern-architecture | 16 | 679 | 2 | 3 | **0** | 11 | 11 | Not shallow so much as unfinished; still declares 12 teach minutes for 500-word reads. |
| 10 | case-studies | 28 | 778 | 5 | 12 | **0** | 11 | 25 | Carries all the search demand and all the interactivity debt. |
| 11 | specialized-systems | 15 | 612 | 2 | 1 | **0** | 12 | 11 | Best exercises attached to the weakest teaching; model answers now outweigh the lessons. |
| | **Totals** | **208** | **1035** | **37** | **413** | **343** | **44** | **142** | 343 of 343 checks live in eight levels. |

Two derived numbers worth holding onto: L7 + L9 + L10 + L11 are 76 lessons and 55,275 teach words
carrying 24 cswidgets between them, against 389 in the other eight levels; and 42 of the 44 bare
lessons sit in those same four levels.

---

## 3. Workstreams

Ranked by value over cost. P0 is four items, and they are four because a P0 list of twelve is a
priority list that has stopped working. Effort is in agent-days at the concurrency this repo already
runs (one agent per level file).

### Tier P0

---

#### SD-W1: Build the verifier and unblock the sweeps

**Effort:** 1 agent-day. **Depends on:** nothing. **Blocks:** SD-W4, SD-W5, SD-W6.

Three of the four P0 items are large parallel sweeps. Per CLAUDE.md, the check that catches a bad
edit lands first, on the code as it stands.

**What it changes**

1. **A ratchet test** at `lib/tutorials/system-design/__tests__/coverage-floors.test.ts`. The
   counting module already exists and is already consumed by `sim-density.test.ts`, so this is about
   twenty lines: assert `buildSystemDesignCoverage().totals.bareLessons <= 44`,
   `totals.lessonsWithoutChecks <= 78`, and `totals.lessonsWithoutDiagramOrSim <= 105`. Pin at
   today's values so it is green on landing, and lower the pins in the same commit as each batch of
   authoring. Ratchet, not zero: a gate that is red for six weeks is a gate people learn to ignore.
2. **Refresh both authoring guides.** `docs/csdiagram-authoring.md` contains zero occurrences of
   "ladder" or "topology"; its type table stops at `table`, so an implementer briefed from the doc
   alone will conclude the two types this plan leans on hardest do not exist.
   `docs/cswidget-authoring.md` heads its sim section "The sim families (`calc`, `hash-ring`,
   `sequence`)" and says "All three are hands-on interactives", while `lib/tutorials/widgets/schema.ts`
   composes twelve. Add the missing rows with their cross-field rules (ladder bands must ascend;
   every topology node must appear in exactly one stage; per-stage `note` is required; 16-node cap),
   and state the density cap where authors will hit it.
3. **Fix `PipelineDiagram`'s hardcoded SQL identity.** `components/tutorials/diagrams/PipelineDiagram.tsx:18`
   passes `label="Order of evaluation"` and line 19 sets `aria-label="SQL logical execution order"`,
   and `pipelineSpecSchema` (`lib/tutorials/diagrams/schema.ts:36-44`) has no `title` field to
   override either. Three System Design lessons already render a SQL heading today, including the RAG
   query path in `sd-l11-rag-architecture`; a screen-reader user on that lesson hears "SQL logical
   execution order". SD-W5 would add nine more. Add `title: z.string().min(1).optional()` and use
   `spec.title ?? ...` for both, matching how `LadderDiagram` and `TopologyDiagram` already do it.

**Acceptance criteria**

- `pnpm test` runs `coverage-floors.test.ts`, and deliberately deleting one check fence from
  `level0.ts` makes it fail. Verify the failure; a gate nobody has seen fail is not a gate.
- `grep -c "ladder\|topology" docs/csdiagram-authoring.md` returns non-zero, and the doc names
  `ANIMATED_DIAGRAM_TYPES` and the one-heavy-per-lesson rule.
- The three existing SD pipeline callers carry a `title`, and no rendered System Design page contains
  the string "SQL logical execution order".

---

#### SD-W2: The correctness batch

**Effort:** 1.5 agent-days. **Depends on:** nothing. Run concurrently with SD-W1, one agent per file.

Thirteen confirmed factual defects, roughly forty edit sites. These are cheap, they are the ones that
get a candidate corrected out loud in a real interview, and several sit on our highest-traffic pages.
Because there is no grader, an error inside a `modelAnswerOutline` is worse than one in teach: the
learner self-compares against it and installs it as truth.

| Lesson | Defect | Fix |
|---|---|---|
| `sd-l0-storage-bandwidth-cache` | Cache-size expr is computed off total retained storage (`level0.ts:1183`), so dragging retention 90 to 1825 days multiplies recommended cache 20x, teaching the exact error the lesson's own prose (`:1100`) and its Apply's named wrong turn (`:2745`) warn against. | Re-express against a recency window, not total retention. Also correct the prose at `level0.ts:1096` ("hot fraction of the actively-read dataset") or it keeps licensing the widget. Second defect in the same expression: `cache_hit_target / 80` prices a 99 percent hit target at 1.24x the 80 percent cache, inverting the Zipfian skew the lesson depends on. |
| `sd-l0-qps-read-write` | Hybrid fan-out modelled as `min(followers, 100000)` (`level0.ts:938`), so a 10M-follower author costs 100,000 inserts per post, while teach (`:856`) and both model answers define hybrid as pull-at-read. Five orders of magnitude, and the widget's own `workedExample` sends the learner straight to it. | Either make the hybrid branch collapse past the cutoff (`followers > cap ? 1 : followers`, which also produces the cliff shape that makes the teach's point), or relabel to "push to the 100k most active followers, pull the rest" and add one teach sentence introducing bounded push. Relabel alone leaves a mechanism the corpus never teaches. |
| `sd-l1-concurrency-models` | "A default Linux thread reserves around 1MB of stack" (`level1.ts:3985`). glibc defaults to RLIMIT_STACK, commonly 8 MiB; 1 MiB is HotSpot's `-Xss`; musl is 128 KiB. **Six sites**, not four: `:3985`, `:4047`, `:4051` (inside the ASCII fence), `:5169`, `:5170`, `:5185`. | Scope the number to the runtime the lesson already cites (Tomcat/JVM) or state 8 MiB on glibc. Move all six together. Separately demote `:4047` and `:5170`, which promote stack reservation to "the wall that makes thread-per-request infeasible at 10k+"; the teach already correctly names blocking IO as the killer at `:3987`. |
| `sd-l2-isolation-levels` | Apply outline (`level2.ts:3238`) says a serialization failure comes "only under Serializable, not Repeatable Read." False for Postgres, which the same outline names at `:3232`: RR is first-updater-wins and aborts the second writer. | Rewrite to the true split: survives under Read Committed and under MySQL InnoDB RR with an app-computed absolute value; Postgres RR aborts, at the cost of retry churn under flash-sale contention, which is why the atomic conditional decrement still wins. Note `grep "could not serialize\|first-updater"` returns zero corpus-wide, so no teach anywhere gives the learner the fact to catch this with. Position 9.9, real impressions. |
| `sd-l2-key-value` | Apply (`level2.ts:3497`) offers `volatile-lru` "so only expiring keys drop", while every session key in the same answer carries a TTL (`:3496`). Under pressure it evicts live logins, and it contradicts the lesson's own closing widget (`:1311`). Worse than equivalent to `allkeys-lru`: the only untagged key is the reverse index, so eviction concentrates on sessions and leaves orphaned pointers. | Delete the parenthetical. `noeviction` plus headroom plus a memory alert, accepting write failures over silent logouts. |
| `sd-l4-distributed-rate-limiting` | Teach fixes 100 req/min as the global limit and names 2000 as the 20x bug (`level4.ts:1501`), reinforces it in the predict widget (`:1510`), then Approach 2 (`:1534`) silently reassigns both numbers, and nineteen lines later the ASCII fence (`:1553`) labels that identical allocation "BROKEN". Apply keeps the original budget. | Keep one global budget of 100 throughout. Approach 2 becomes "a global 100/min across 20 nodes means 5/min per node". Rewrite the fence so the BROKEN column no longer reads as Approach 2, and put the 5/min figure into the hot-user-skew paragraph, which currently carries no numbers at all. |
| `sd-l4-tls-connection-mgmt` | "exhaust its ~64K ephemeral ports" (`level4.ts:1250`). Linux defaults to 32768-60999, about 28k, per (source IP, destination IP, destination port). The corpus already teaches 28k **and marks it correct in a widget** at `level1.ts:894` and `:911-915`, and names the more-tuples fix at `level1.ts:4044`. | Correct to roughly 28k per tuple. The existing "ephemeral port range" mention in the C10k paragraph (`:1299`) then becomes self-explaining. This is an internal contradiction where one of the two answers is scored right. |
| `sd-l7-availability-nines` | Table header declares a 30-day month, 43,200 minutes (`level7.ts:17`), and two of four rows print average-month figures: `:22` "~43.8 minutes", `:23` "~4.4 minutes". The Apply (`:1481`) correctly computes 43.2 on the declared window, so the lesson contradicts its own answer key. | **The fix is the opposite of the one first proposed.** Correct the two rows to ~43.2 and ~4.3 so they match the header, the `:27` prose and the Apply. Do not change `:17` to 43,800: the 99 percent row's "~7.2 hours" is only correct on the 30-day basis. The calc widget at `:82` uses 43800 and its `workedExample` at `:46` says "average month", so it is self-consistent; either align it or state "average month" in its caption too. Separately, `level7.ts:129` in `sd-l7-error-budgets` says a 28-day window is "about 43 minutes" where it is 40.3. |
| `sd-l7-progressive-delivery-schema` | Apply step 3 (`level7.ts:2184`) prescribes "gh-ost/pt-osc semantics" for a stack its own assumptions line declares Postgres (`:2182`). Both are MySQL-only (binlog / triggers), and both are shadow-table DDL tools while step 3 is a data backfill after step 1's `ADD COLUMN`. | Replace with a Postgres-correct mechanism (batched UPDATE by key range with checkpoints and a short `lock_timeout`), or change the assumptions to MySQL. **One clause.** The teach is correct (it labels the tools "for MySQL" at `:1381`) and the practice answer is affirmatively Postgres-correct at `:2200`. |
| `sd-l9-service-mesh` | "Cilium pushes mTLS and L4 policy into the kernel via eBPF" appears at **five sites**: teach `:296`, csdiagram stage note `:407`, teach recap `:426`, lesson summary `:1395`, apply outline `:1416`. The diagram caption `:415` compounds it with "Same guarantee (mTLS everywhere), different data paths". eBPF does not perform a TLS handshake; Cilium does SPIFFE-based mutual auth in the agent, off the datapath, plus WireGuard or IPsec transparent encryption. | Cilium enforces identity-based L3/L4 policy in the kernel via eBPF and provides mutual authentication using SPIFFE identities with confidentiality from WireGuard or IPsec: authenticated, encrypted east-west traffic without a per-Pod proxy, but not per-connection mTLS. Keep Istio Ambient as the example that genuinely preserves mTLS semantics (ztunnel over HBONE), which sharpens the contrast. Drop "same guarantee" from the caption. Also split the GA claim: Istio ambient GA in 1.24 (Nov 2024), Cilium mutual auth still beta. SPIFFE is taught at `level8.ts:1132`, so no closure gap is created. |
| Corpus | "Istio or Linkerd with Envoy sidecars." Linkerd's data plane is `linkerd2-proxy` (Rust), and not being Envoy is its headline differentiator. Five sites: `level1.ts:4300`, `level4.ts:695`, `level4.ts:955` (widget feedback), `level4.ts:962`, `level8.ts:2483`. | Say "Istio (Envoy sidecars) or Linkerd (its own Rust micro-proxy)". |
| `sd-l10-chat-messaging` | "MQTT, which WhatsApp used for battery efficiency" (`level10.ts:520`), in a lesson titled "(WhatsApp)". WhatsApp ran a customized binary XMPP; MQTT plus the battery rationale are both Facebook Messenger's 2011 choice. The same lesson's opening sentence about millions of connections per server is a reference to the Erlang/ejabberd work. | "MQTT, which Facebook Messenger adopted for battery efficiency on mobile; WhatsApp ran a customized binary XMPP." XMPP appears nowhere else in the corpus, so gloss it in two words. The Apply outline at `:2892` carries no attribution and needs no change. |
| `sd-l11-llm-inference-serving` | AWQ. Apply outline `:909` says FP8 or AWQ "roughly halves weight and KV footprint": AWQ is W4A16, so roughly 4x on weights and zero effect on KV. Teach `:279` binds AWQ to KV-cache shrinkage, a conflation (INT8/FP8 do have KV dtypes). AWQ appears only at these two sites corpus-wide and is never expanded. | Split the mechanisms: weight quantization shrinks weights and frees memory the KV cache then uses; KV footprint is cut separately by an FP8/INT8 KV dtype or architecturally by GQA. Expand the acronym. GQA is introduced by SD-W8. |
| `sd-l11-globally-consistent-multiregion` | Apply outline `:1147`: "TrueTime (or HLC in CockroachDB) provides external consistency". The lesson's own teach at `:452` correctly withholds it, and `sd-l5-physical-time-hlc` grades the distinction: `level5.ts:1045` marks "cannot alone guarantee external consistency" correct and `:3214` states "What HLC alone lacks: external consistency." A learner who answered L5 correctly is told here they were wrong. | Fix the one parenthetical. A pointer back to `sd-l5-physical-time-hlc` beats new prose; the lesson summary `:1130` and recap `:472` are accurate as written. |
| Corpus | HyperLogLog: 12 KB paired with ~2 percent error. Standard error is 1.04/sqrt(m); Redis's 16,384 six-bit registers is exactly 12 KB and 0.81 percent. Four sites: `level11.ts:422`, `level11.ts:1101`, `level10.ts:2280`, `level10.ts:3842`. `level3.ts` already states 0.8 percent correctly in three places, including a check's feedback. | Correct all four to ~0.8 percent, and add the relationship 1.04/sqrt(register count) once so it becomes a derivable trade rather than a memorized pair. `level11.ts:1104` ("approximate top-K and HLL trade ~2% error") is defensible unpaired but should not be left at 2 while `:1101` says 0.8. |
| `sd-l10-instagram` | Teach prices erasure coding at 3x: "with 3x replication or erasure coding" (repeated in the Apply outline as "with 3x that is ~600TB/day"). `sd-l0-storage-bandwidth-cache` and `sd-l10-object-store-s3` both give 1.x, and the latter calls not knowing this "the tell that separates junior from senior on this problem." | "~600TB/day at 3x replication, or roughly 250 to 300TB/day erasure coded, which is the choice you make for cold media." |
| `sd-l10-ride-sharing` | Cell-count calc squares the cell width, but an interleaved lat/lng key at an even bit count gives a 2:1 cell. Cells covering the city understated 2x, drivers per cell overstated 2x (widget reports ~500 where it is ~250). | Add a `cellHeightKm = 20038 / pow(2, bits / 2)` output and multiply, updating the `workedExample`; or switch to H3 resolutions, which is what the prose actually recommends. The 2:1 shape is itself a good reason hexagons won. |
| `sd-l9-monolith-vs-microservices` | The Prime Video practice invents "a 12-microservice media-monitoring pipeline". It was the Video Quality Analysis team's serverless pipeline (Step Functions orchestrating Lambda, frames via S3), consolidated onto ECS/EC2. | Drop the invented count, describe the real architecture, and add one sentence on the contested framing: it is a data-heavy pipeline where hop cost dwarfed work cost, not a general verdict on microservices. That nuance is the judgement the lesson wants and currently only implies. |

**Acceptance criteria**

- Each row above has a commit citing its lesson id, and `git log` shows them (verify yourself; agents
  report commits they did not make).
- `grep -rn "1MB stack" level1.ts` returns zero. `grep -rn "mTLS and L4 policy into the kernel"`
  returns zero. `grep -rn "12 KB.*2 percent\|12 KB, ~2%"` across `level10.ts` and `level11.ts`
  returns zero.
- A regression test at `lib/tutorials/system-design/__tests__/corpus-facts.test.ts` pins the four
  claims that recur at multiple sites and could silently return: the HLL pairing, the Linkerd/Envoy
  conflation, the ephemeral-port figure, and the Cilium in-kernel-mTLS phrasing. Prose is where rules
  drift; a grep-based test over the resolved curriculum is where they stop.

---

#### SD-W3: Render the Practice exercise

**Effort:** 1.5 agent-days including progress-migration care. **Depends on:** nothing.

**What it changes.** `SystemDesignLessonPlayer.tsx:76` sets `const designExercise = lesson.apply`,
and its header comment records the deviation: "System design has ONE design write per lesson (the
Apply) ... marking the Design section done completes BOTH `apply` and `practice`."
`prompt-standards.test.ts:5` confirms it in writing: "System Design never renders its Practice
exercise, but the prompt still ships in the bundle."

The content that is dark is the best content. Level 10 practice prompts average 46 words against
apply's 19 and carry the constraints the apply lacks: `sd-l10-video-streaming-practice` gives 30
million concurrent viewers on one live feed under 10 seconds glass-to-glass;
`sd-l10-chat-messaging-practice` gives a 50,000-member channel; `sd-l10-stock-exchange-practice`
gives 24/7 with no maintenance window and 50x during market events. `sd-l0-clarify-scope-practice` is
the single exercise in all 416 that stages a hostile interviewer non-answer, requires committed
assumptions, two named deferrals, and a time box.

**Scope of the darkness, verified.** A signed-out reader does meet these prompts:
`PublicLessonArticle.tsx:302` renders `preview.practice`. What no one can reach is the answer key,
because `toPublicExercisePreview` publishes only `prompt`, `thinkAbout`, `hintCount` and
`gradedCheckCount`, and the signed-in player never renders Practice at all. So the accurate statement
is that 208 practice prompts are readable but unanswerable, and 208 practice model answers are
reachable from no surface in the product. In a course whose entire assessment loop is "write, then
reveal and self-compare", an unreachable model answer is the whole loop missing.

Render Practice as a second Design phase, the way `SqlLessonPlayer.tsx:331` and `LessonPlayer.tsx:336`
already do, keying `sections.practice` off the second save instead of aliasing it to the first. If a
second full write per lesson is judged too long for a 40-minute lesson, the fallback is a "Push
harder" panel that appears under the revealed model answer, which costs the learner nothing and
still surfaces the material.

**The one real risk, and the mitigation.** The store keys `lessonStatus` off the `practice` section.
Splitting the alias means learners who completed a lesson under the old semantics must not have it
flip back to incomplete. Handle it by treating an existing completed `apply` as satisfying the
lesson-level gate, and only requiring the new practice save for lessons started after the change.
This needs a deliberate decision recorded in the PR, not a silent default.

**Acceptance criteria**

- Both exercises render and persist independently; `user_design_answers` shows two rows for a lesson
  where the learner wrote twice.
- A reachability test asserts every `DesignExercise` id returned by `listAllSystemDesignLessons()` is
  reachable from a rendered surface, so the next unrendered phase fails the build rather than
  shipping quietly for a year.
- A completed-lesson fixture from before the change still reads as completed.
- Swap `sd-l0-clarify-scope`'s apply and practice regardless of which option ships, so the
  negotiation drill is the one a learner meets. It is the only requirement-negotiation assessment in
  the course.

---

#### SD-W4: Finish the check rollout across L7, L9, L10 and L11

**Effort:** 7 agent-days, four concurrent agents, one per level file. **Depends on:** SD-W1.

**What it changes.** 76 lessons, 37 percent of the corpus, carry zero `check` widgets while every
other level runs 36 to 53. The `check` widget is the only mechanism in the entire course where a
learner commits to an answer and is told, with per-option feedback, that they were wrong. Its absence
is not a design choice: `docs/cswidget-authoring.md:77-82` states the binding rule ("about one check
per 300 words of teach, clamped to 2-4 per lesson" and "One cumulative check closes every teach,
after the Recap paragraph"), all 76 lessons already end with a `**Recap:**` anchor, and
`INTERACTIVITY-PLAN.md:240` scheduled the work as Iteration 12 and never ran it. Level 7 appears in
no wave at all, so completing Iteration 12 as written would still leave it at zero.

**The raw material is already written.** Those four levels ship 77 pre-authored "Interview nuance"
callouts that each name the exact misconception a predict-then-reveal check confronts, and 374 of the
416 exercises close on a "Common wrong turn" bullet stating the plausible-sounding wrong answer and
why it fails. The corpus has already done the expensive half. Sample targets, verbatim from the
prose: "exactly-once delivery" versus at-least-once plus idempotent consumers
(`sd-l10-message-queue`, `level10.ts:1562`); "CPU at 40 percent but the queue has a million messages"
(`sd-l9-k8s-autoscaling`); "a read replica is not an analytics store" (`sd-l9-oltp-vs-olap`); "an
average hides the tail" (`sd-l7-sli-slo-sla`); "it exists to be spent, not hoarded"
(`sd-l7-error-budgets`); "failover just gives you the corrupted data faster" (`sd-l7-dr-rto-rpo`);
the offline/online feature-store split (`level11.ts:68`); TTFT as prefill (`level11.ts:269`); bounded
versus unbounded tag cardinality (`level11.ts:516`).

**Dosage, corrected.** Measured on prose with fences stripped, L7 is 9,874 words, not the 13,454 raw
figure, so the 300-word rule plus the 2-to-4 clamp puts L7 at 34, not 40. Across the four levels the
floor is about 152 (two per lesson) and the dosed figure is about 190. Author the teach-closing
cumulative check in all 76 first, then add mid-teach misconception checks where prose density earns
them. The cumulative check counts inside the dose, not on top of it (`INTERACTIVITY-PLAN.md:12`).

**Two traps to avoid, both already found once.**

1. **Do not author a check that duplicates an existing prediction gate.** L7 already runs nine
   commit-before-reveal predicts inside its sims (`level7.ts:37, 168, 439, 713, 905, 947, 1066, 1202,
   1268`) and L9 runs three (`level9.ts:241, 752, 1090`). The retry-amplification "3x3x3" check the
   council proposed is already live at `level7.ts:713`; the queue-backlog-versus-CPU check is already
   live at `level9.ts:241`. What those gates lack is graded correction, because `predictSchema`
   (`lib/tutorials/widgets/families/sequence.ts:33`) has no `correct` flag and no per-option
   `feedback`. Where a gate already covers the misconception, author the missing feedback into it
   rather than adding a second question on the same point.
2. **Order by search demand, not by level number.** L10 first (28 lessons, and nine of its pages
   already draw impressions: stock-exchange 55, typeahead 32, unique-id-generator 29,
   ecommerce-flash-sale 21, distributed-lock 20, rate-limiter 17, ride-sharing 17, code-sandbox 16,
   payment-ledger 16), then L7 (unmet demand for "sli/slo/sla" at 43-86, "four golden signals" at 59,
   "availability nines" at 27-76, "canary deployment strategy" at 66), then L9, then L11.

**Acceptance criteria**

- `buildSystemDesignCoverage().totals.lessonsWithoutChecks === 0`; the SD-W1 ratchet is lowered to 0
  in the same commit and the pin becomes an equality.
- A placement test asserts the last widget fence in every System Design teach is a `check` and that it
  follows the `**Recap:**` line, which is the rule `docs/cswidget-authoring.md:81` states and nothing
  currently enforces.
- Every authored check names a misconception that appears in that lesson's own prose. Spot-check
  twenty by reading the diff; agents drift into recall trivia when authoring at volume, and the plan
  itself flags this risk at `INTERACTIVITY-PLAN.md:278`.
- No lesson exceeds one heavy item (`sim-density.test.ts` still green). Checks are exempt, so this
  should hold trivially; confirm it anyway.

---

### Tier P1

---

#### SD-W5: Depth promotion and closure repair in L7, L9, L10 and L11

**Effort:** 12 agent-days. **Depends on:** SD-W1. Partition by file.

**What it changes.** This is the workstream that fixes the structural fact in the verdict, and its
defining property is that **most of the missing prose is already written, in the wrong field**. The
model answers were completed to a uniform budget; the teach sections were not. So the primary move is
promotion, not authoring: every mechanism, number, and named tool a `modelAnswerOutline` relies on
gets stated and demonstrated in teach, where the learner can reach it before they write.

Set a teach-word floor by difficulty and enforce it: medium at least 900, hard at least 1,100. That
brings L7 from 791, L9 from 679, L10 from 778 and L11 from 612 to parity with L0-L6 and L8. The floor
is the deadline; closure is the content.

**The closure inventory** (each is a graded answer depending on a fact its teach never states):

- `sd-l9-containers-k8s`: 487 words, never states what the control plane reconciles. `grep` of that
  teach returns false for "control plane", "etcd", "kubelet", "reconcil", yet `sd-l9-platform-gitops`
  two lessons later assumes the loop outright. Also missing: what happens at a resource ceiling
  (OOMKilled and CFS throttling appear zero times in the entire 208-lesson corpus, alongside
  "cgroup" and "CFS"), the Burstable QoS class, and `preStop` /
  `terminationGracePeriodSeconds`, which occur exactly once each corpus-wide, inside this lesson's own
  Apply outline (`level9.ts:1319`). Its Practice then requires Argo Rollouts canary with automated
  analysis, taught two modules later; retarget it at a StatefulSet drain under a PodDisruptionBudget,
  or add a canary bridge to teach.
- `sd-l9-cloud-native-12factor`: tells the learner to "walk the factors and name the specific change
  for each" and names six of twelve.
- `sd-l9-platform-gitops`: declares Git the single source of truth for all declarative state and never
  says where secrets go ("sealed", "SOPS", "External Secrets", "Vault" all absent), under a Practice
  set at a PCI/SOC-2 fintech. Also missing ApplicationSet and App-of-Apps, which the Practice answer
  requires by name.
- `sd-l9-cloud-finops`: `MIG` and `multi-model serving` occur once each corpus-wide, both inside this
  lesson's Practice outline (`level9.ts:1741`), against a one-sentence GPU passage at `:939`.
- `sd-l11-llm-inference-serving`: the thesis is that KV cache caps concurrency, and the lesson never
  gives bytes per token or the formula. `num_layers`, `head_dim`, `per token`, `GB per` all return
  zero. The Apply computes "a 70B model in FP16 is ~140GB" from a teach that never states bytes per
  parameter.
- `sd-l11-model-gateway`: 509-word teach with no "queue", "shed", "priority", "autoscal" or "warm",
  against a Practice requiring a priority queue and load shaping for a 10x spike.
- `sd-l11-ml-blueprint`: 529-word teach with no "quantile", "asymmetric", "loss function",
  "micro-batch" or "calibrat", against a Practice turning on asymmetric loss and an Apply handing over
  a five-stage latency budget.
- `sd-l11-online-serving-rollout`: Practice asks why to gate on calibration rather than AUC, and
  calibration is never defined anywhere in Level 11.
- `sd-l11-time-series-storage`: teach's entire account of the index is "an inverted index from tag to
  series"; the Practice answer needs ingesters, store-gateways, postings lists and a query frontend.
- `sd-l11-iot-edge-ingestion`: Practice turns on A/B firmware partitioning; teach covers only device
  shadow and staged canary. Canary bounds blast radius, A/B bounds per-device recovery, and only one
  of the two is taught.
- `sd-l10-key-value-store`: `thinkAbout` asks how adaptive capacity and pre-warming survive Prime Day;
  "adaptive capacity", "pre-warm", "global table" and "cart" all occur zero times in its teach. This
  is independent of the Dynamo-versus-DynamoDB naming fix, which is corpus-scoped: `level3.ts:190`
  repeats the error while `level3.ts:802` gets it right, and `sd-l3-replication-topologies-practice`
  already models the safe phrasing ("a DynamoDB-style shopping cart").
- `sd-l10-instagram`: Practice graded on S3 lifecycle expiry, DynamoDB item TTL and Cassandra TTL
  reclamation, none of which the teach names.
- `sd-l10-payment-ledger`: 508 words covering idempotency, double-entry and a saga, with no
  authorization-versus-capture, refund, chargeback, hold, currency, or the integer-minor-units rule,
  against a Practice demanding multi-currency payouts with FX clearing entries.
- `sd-l10-ride-sharing`: Practice is a batched vehicle-routing optimizer with a prep-time model; teach
  contains no "batch", "routing", "prep", "optimiz" or "detour".
- `sd-l8-ddos-rate-abuse`: Practice calls query-cost limiting "the heart of the answer" and the teach
  never mentions GraphQL, query depth, complexity budgets or persisted queries. Its Apply is a generic
  volumetric flood design, so Practice is a topic jump rather than one step. Two smaller siblings:
  `sd-l8-bot-fraud-ato-practice`'s virtual waiting room is taught only at `level10.ts:2013`, and
  `sd-l8-sessions-tokens-practice`'s revocation epoch is a refinement the teach nearly reaches.
- `sd-l8-multi-tenancy`: the Practice prompt uses BYOK, which appears in no teach prose anywhere in
  208 lessons, and its answer needs DEK/KEK/envelope encryption, defined two lessons later in the same
  level (`sd-l8-encryption-rest-field`). Since ids are frozen, add the two-sentence definition here.
- `sd-l1-tls-https`: Practice requires SPIFFE/SPIRE-issued X.509 SVIDs (`level1.ts:4301`) against a
  teach saying only "a short-lived cert from an internal CA" (`:999`). SPIFFE is taught properly at
  `level8.ts:1132`, so this needs a pointer, not a new section.
- `sd-l1-http-semantics`: Apply-adjacent, and deliberately small. See section 8.

**Three depth patterns that recur and should be swept, not fixed one at a time:**

1. **Mechanisms named without their numbers.** `sd-l10-stock-exchange` claims microsecond latency in
   1,221 words containing one numeric token, with "kernel bypass" and "NUMA" absent corpus-wide.
   `sd-l10-chat-messaging` asserts millions of sockets per server with no per-socket cost, no fd
   limit, and no fleet derivation, in a lesson with zero numeric tokens in teach.
   `sd-l10-typeahead` never sizes the trie, so the sharding decision in both its answers is
   unmotivated. `sd-l9-inter-service-comm` mandates four resilience primitives with zero numbers and
   its Apply then prescribes 300ms and 2s with no rule connecting them.
2. **Mechanisms named without their failure modes.** 18 of 28 L10 teach sections contain no
   failure-mode language at all (L10 averages 0.5 hits per lesson on a failure-vocabulary scan against
   L7's 2.1). Where a failure mode does appear it is introduced inside the Practice answer, after the
   learner has stopped working. Add a "When it breaks" section to every L10 teach: the failure, the
   blast radius, the designed response.
3. **Estimation taught once and never retrieved.** "Estimation:" appears four times in `level10.ts`,
   all inside model answers, never in teach and never in a prompt. Ten of 28 L10 lessons have three or
   fewer numeric tokens in teach. See SD-W9.

**The authoring bar.** `sd-l1-latency-percentiles` is the standard, and it is a repeatable set of five
moves rather than a matter of length: a quantity table rather than an assertion; a derived tradeoff
(the 1 - 0.99^20 fan-out result, so a backend p99 becomes a frontend p82) rather than a stated one; a
manipulable `calc` over the same maths; Little's Law run in both directions; and a named measurement
failure mode with its fix (coordinated omission). Every rewritten lesson must contain at least one
quantity table or calc, one derived tradeoff, one named failure mode with its response, and one
sizing calculation reproducible from the L0 constants.

**Acceptance criteria**

- A teach-word-floor test in `lib/tutorials/system-design/__tests__/` asserts medium >= 900 and hard
  >= 1,100, ratcheted the same way as SD-W1 so it lands green and tightens per batch.
- A vocabulary test extracts backticked and CamelCase API identifiers from every
  `modelAnswerOutline` and asserts each appears in some teach markdown at or before that lesson's
  position in curriculum order. Run it once to produce the offender list, fix by adding the term to
  teach, never by deleting it from the answer. This is the `ticket-registry.ts` bijection pattern
  CLAUDE.md already blesses.
- The closure inventory above is closed item by item, each citing its lesson id in the commit.
- `estimatedMinutes` is corrected where it is still a 5x overstatement, or the lesson reaches the
  length that justifies it. `level11.ts:550` declares `estimatedHours: 8` against a lesson-minute sum
  of 575 (9.58 hours); add a test asserting the level total equals the rounded sum of its lessons.

---

#### SD-W6: The visual conversion sweep and motion pass

**Effort:** 6 agent-days. **Depends on:** SD-W1 (the guides and the pipeline title fix). Detail in
section 5.

**What it changes.** 142 plain ASCII fences across the corpus, 60 of them in the four unfinished
levels, drawing architectures that shipped diagram types render natively. Plus three renderers with
no enter transition, so a staged reveal produces change blindness at the exact moment the learner is
supposed to notice what changed.

**Acceptance criteria**

- `buildSystemDesignCoverage().totals.bareLessons === 0` and
  `totals.lessonsWithoutDiagramOrSim` down from 105 to under 40, with the SD-W1 ratchet lowered to
  match.
- `sim-density.test.ts` green: no lesson gains a second heavy item. This is the constraint that kills
  naive conversion, and it is why section 5 assigns `pipeline` and `table` to the 13 L10 lessons
  already at the cap.
- No plain fence in the corpus exceeds 90 characters on any line. Fourteen currently do, topping out
  at 126 (`sd-l10-ad-click-aggregator`), which scrolls sideways on a phone.
- Reduced-motion parity: every added tween collapses to an instant state swap under
  `player.reducedMotion`, and the reduced-motion still teaches the same fact.
- The refusal list in section 5.4 is written into `docs/csdiagram-authoring.md`, so the next agent
  does not add looping packet dots to every topology edge.

---

#### SD-W7: The AI-resistant exercise genres

**Effort:** 6 agent-days. **Depends on:** SD-W3 (Practice slots are where several of these live) and
a small type addition described below. Rationale in section 4.

**What it changes.** Adds five exercise genres that do not currently exist anywhere in 416 exercises:
**critique**, **diagnose**, **price**, **prune**, and **defend**. Plus **underspecify**, which is a
rewrite of existing prompts rather than a new genre.

**The carrier, and one correction the council got wrong.** Five seats recommended the unused
`starterAnswer` field as the free carrier for supplied artifacts. It is unused (0 of 416) and it is
wired, but it is wired as **seed text in the editable answer box**
(`SystemDesignLessonPlayer.tsx:78` seeds state from it; `DesignAnswerPanel.tsx:79` restores it on
Reset). So it works for a scaffold the learner types into, and badly for an artifact the learner
critiques: a 200-word flawed design would land inside the learner's own saved answer. Add a read-only
`supplied?: { title: string; body: string }` to `DesignExercise` and render it in `ExerciseBrief`
beside `thinkAbout`. One type field, one component block, and every genre below unlocks. Keep
`starterAnswer` for what it is good at: the six-phase headings scaffold in SD-W11.

**Pilot batch: the nine Level 10 lessons that already draw impressions.** Three artefacts each, all
sourced from prose that already exists in the lesson.

| Genre | Shape | Source material that already exists |
|---|---|---|
| Critique | A flawed design in `supplied`, prompt: "Three things here break at the stated scale. Name them, say which breaks first, and fix only that one." | The 374 authored "Common wrong turn" bullets. Plant the named flaw. |
| Diagnose | A symptom table in `supplied` (p99, error rate, pool saturation, consumer lag), prompt: "Two hypotheses are consistent with these graphs. Name them, name the one cheap observation that distinguishes them, and say what you do first if you cannot distinguish them." | Retry storm, cache stampede after a Redis eviction, slow leader election: all three are already explained elsewhere in the corpus. Home it in L7, whose two incident exercises currently ask the learner to define an org process and to execute a runbook for an outage whose cause the prompt already states. |
| Price | A cost sheet in `supplied`, prompt: "Which component dominates, at what ratio, and what is the cheapest 30 percent?" | Requires SD-W9's unit-price ladder first. |
| Prune | An over-built component list plus constraints that do not justify it (5k DAU, 4 engineers, 2k orders/day), prompt: "Delete three components. Say what breaks if you are wrong, and name the trigger that adds each back." | `sd-l0-phased-delivery-clock` already states the prime directive. "Over-engineer" appears 8 times in 215,347 words, always as an aside. |
| Defend | After the model answer reveals, one named objection tied to that design, requiring a written rebuttal that states the losing option's real advantage and the assumption that overrules it. | `sd-l0-tradeoff-articulation` teaches this and then never exercises it. Zero of 416 prompts stage an objection; exactly one contains the word "defend". |
| Underspecify | Strip the numbers from an existing prompt; deliverable becomes the three questions you would ask, the assumption you would commit to for each, and the branch each answer eliminates. | `sd-l0-clarify-scope-practice` is the only existing instance and it is currently unrendered. |

**Also in this workstream, because it is the same defect at a different altitude:** convert exactly
one `thinkAbout` per exercise into a judgement prompt. All 1,132 entries are currently recall-shaped
(468 How, 299 What, 269 Why, 90 Which, 56 Where, 37 When), and zero begin with "What would you ask",
"What do you not know", or "What is missing". Leave the other two recall-shaped so the scaffolding
still supports the write.

**Acceptance criteria**

- `supplied` exists on `DesignExercise`, renders read-only, is excluded from the saved answer, and is
  covered by `public-preview-sealing.test.ts` semantics so it does not leak a model answer.
- The nine ranked L10 lessons each carry one non-generative exercise.
- A test asserts at least one `thinkAbout` per exercise matches the judgement set, per
  "enforce conventions with a test, not a document."
- Two of the genres are dogfooded by a human before the sweep scales. A critique exercise whose
  planted flaw is too obvious is worse than the generative prompt it replaced.

---

#### SD-W8: The AI-era build

**Effort:** 8 agent-days. **Depends on:** SD-W4 (L11 checks) and SD-W5 (L11 depth). Full argument in
section 4.

**What it changes.** Three things, in this order:

1. **Bring `sd-l11-m2` (the seven GenAI lessons) to parity.** 4,230 teach words and zero interactive
   widgets, against 8,203 words and 17 widgets for the six lessons on DNS, TCP, TLS and HTTP. We spend
   twice the depth and infinitely more interactivity on the request lifecycle than on the topic that
   moved into general engineering loops. Raise each to about 1,200 words and add one sim per lesson
   within the density cap: `calc` for KV-cache and GPU-memory arithmetic
   (`sd-l11-llm-inference-serving`), `queue-sim` for static versus continuous batching head-of-line
   blocking, `sequence` with an injected-tool-output failure toggle (`sd-l11-llm-agents`),
   `rate-limiter` for per-tenant token budgets (`sd-l11-model-gateway`).
2. **Two hybrid case studies in L10.** Nothing in the corpus is the prompt shape that is now standard:
   a classic system with an AI feature attached. `grep -niE '(LLM|generative|inference)' level10.ts`
   returns zero across all 28 case studies; L11's AI lessons are pure components with no host product.
   The two halves never meet. Build them onto backbones the level already teaches: news-feed plus an
   LLM summary tier (fan-out, async generation, cache by content hash, degradation when the model tier
   is down) and a document Q-and-A product (ingestion and chunking, embedding refresh, hybrid
   retrieval, cost per query, eval and guardrails). Each carries one `topology` showing the sync
   request path against the async generation path.
3. **One new L4 lesson on accelerator capacity.** `grep -niE 'GPU|accelerator|inference' level4.ts`
   returns zero across 14 lessons and 16,767 words about horizontal scaling, load balancing,
   autoscaling and capacity planning. The missing rung between `sd-l4-autoscaling` and
   `sd-l11-llm-inference-serving`: fair-share and quota scheduling across teams, warm pools against
   multi-minute cold GPU start, autoscaling on queue depth rather than utilization, preemptible and
   priority tiers, bin-packing versus dedicated allocation.

**Acceptance criteria**

- No `sd-l11-m2` lesson under 1,100 teach words; each carries at least one check and one sim.
- The GPU-memory `calc` exists and closes the closure violation: weights = params x bytes/param,
  KV per request = 2 x layers x kv_heads x head_dim x dtype x seq_len, concurrency = (HBM - weights) /
  KV, with an FP8 toggle and a dollars-per-million-output-tokens output at a stated GPU-hour rate.
- The two hybrid case studies exist with the full L10 spine and cross-link to their L11 components
  rather than duplicating them.
- Currency additions land (section 6): GQA/MLA/MoE, MCP and context compaction, provider prompt
  caching, query rewriting.

---

#### SD-W9: The cost and estimation spine

**Effort:** 4 agent-days. **Depends on:** nothing, but SD-W7's price genre depends on it.

**What it changes.** Cost is now an explicitly graded rubric line, the corpus makes it the deciding
variable in a dozen lessons, and there is not one unit price in 215,347 words. `GB-month` occurs zero
times. `dollars per` occurs once, as the unpriced phrase "dollars per million tokens". Every `$N`
token in the corpus is a transaction amount, not a price. `sd-l9-cloud-finops` sets an Apply of "Cut a
$200k/mo cloud bill by 30%" and offers only relative percentages with no base rate to apply them to,
while its own cost breakdown appears in the answer rather than the prompt, so the exercise is not
solvable as posed.

1. **A unit-price ladder in L0**, beside the latency ladder, as a `table` csdiagram: object storage
   per GB-month across tiers, internet and inter-AZ egress per GB, a vCPU-hour, a GPU-hour, per-million
   input and output tokens, a managed-Postgres instance-month. Order of magnitude is the load-bearing
   part, not the vendor's current number.
2. **One `calc`** in `sd-l0-storage-bandwidth-cache` turning the storage and egress chain the learner
   already derived into a monthly bill, so "CDN egress dominates" becomes an arithmetic result.
3. **Extend the L0 wrap-up contract** from "name the dominant cost driver" to "name it and put a
   number on it, within an order of magnitude", and from four items to five by adding "who operates
   this" (new alert sources, components a fresh on-call must understand, whether the team size named
   in the prompt can run it). Today, on-call surface or team size appears in 7 model answers across
   416; `sd-l0-level-calibration` names both as the staff bar and neither of its own exercises asks
   for either.
4. **Retrieval, not just supply.** Move the four `Estimation:` bullets out of L10 model answers into
   teach as worked examples, strip the pre-computed traffic out of the nine L10 teach sections that
   hand it over before the exercise, and add "Estimate the ..." as a `thinkAbout` on each case study
   so a number is demanded before the answer supplies one.
5. **Teach rejecting a number.** `sd-l0-fermi-estimation` teaches four forward rules and no check
   rule. Add a fifth: hold every derived figure against a ceiling from `sd-l0-latency-numbers`
   (single-machine QPS, Redis ops/sec, DB writes/sec, one rack's egress), plus a `classify` sorting
   five derived figures into plausible and off-by-1000x-and-here-is-the-ceiling-it-violates. Models
   produce confident arithmetic that fails a sanity check, which makes this the cheapest AI-resistant
   addition in the plan.
6. **Fix `sd-l9-cloud-finops`**: put the spend breakdown in the prompt so the exercise is solvable,
   and show one worked lever calculation reaching a dollar figure.

**Acceptance criteria**

- `grep -c "GB-month" lib/tutorials/system-design/curriculum/*.ts` is non-zero and the ladder is
  cited by id from at least four downstream lessons.
- `sd-l9-cloud-finops`, `sd-l10-video-streaming`, `sd-l11-llm-inference-serving` and
  `sd-l11-model-gateway` each perform one worked monthly-cost calculation from those constants.
- At least ten prompts corpus-wide demand a number, up from seven, and none of the demanded numbers is
  supplied by its own teach section.

---

#### SD-W10: Spoiler and scaffolding repair

**Effort:** 2 agent-days. **Depends on:** nothing. Cheap, and it fixes a rule that has quietly
inverted.

**What it changes.** `thinkAbout` renders unconditionally beside the empty answer box
(`DesignAnswerPanel.tsx:94-101`, documented as "a thinking aid only, gates nothing") and is published
to the public preview page. It is statement surface, not hint surface. CLAUDE.md's spoiler rule
reserves the approach for hints, and in the two levels where it matters most the rule now runs
backwards.

1. **All 15 L11 practice `thinkAbout` sets** hand over the model answer's central mechanism, so the
   harder rung is more scaffolded than the easier one: "How does a two-tier index reconcile a nightly
   bulk rebuild with second-level freshness?" against a model answer that opens "I run a two-tier
   index." Rewrite in the Apply's open voice: name the constraint, never the mechanism.
2. **The L10 practice sets** do the same: "Why is state TTL equal to the attribution window the key
   mechanism?", "Why deliberately delay assignment by 30-90 seconds?", "How is the consensus term
   itself the fencing token?"
3. **13 of 28 L10 Apply `thinkAbout` lists** name the structure rather than the pressure. "How does a
   trie with cached top-k per node serve sub-100ms?" becomes "How do you return the top 10 for a
   prefix without scanning the corpus on every keystroke?"
4. **Ten prompts name the mechanisms the learner was meant to choose.** The worst is our
   highest-traffic page: `sd-l10-stock-exchange-apply` lists "deterministic price-time-priority
   matching, single-writer sequencing, an in-memory order book, event-log replay recovery, and
   market-data fan-out", which are verbatim the five headline bullets of its own model answer. Replace
   with the constraints that force those choices: an auditor who can demand a byte-identical replay of
   every fill, single-digit-microsecond matching, and same-price orders filling in arrival order. Same
   treatment for `sd-l10-webhook-delivery`, `sd-l10-code-sandbox`, `sd-l10-yelp-nearby`,
   `sd-l10-distributed-cache`, `sd-l10-distributed-lock`, `sd-l10-leaderboard-topk`,
   `sd-l7-blast-radius-cells`, `sd-l7-timeouts-retries` (its apply names circuit breaker plus bulkhead
   plus fallback while its own practice correctly states only the constraint), and
   `sd-l6-sync-vs-async` (which pre-sorts every step into sync or async in parentheses, pre-empting
   the wrong turn its own answer punishes).
5. **Un-collapse the `<details>` blocks in L0.** `sd-l0-template-pitfalls` hides 63 percent of its
   prose and all five artifacts its exercise grades inside six collapsed blocks
   (`level0.ts:2103-2164`); `sd-l0-latency-numbers` hides its ladder diagram and both reference tables
   (`:1276-1383`) while its `thinkAbout` asks for facts stated nowhere else. Opt-in disclosure of
   required material is the exact pattern CLAUDE.md already ruled out once.
6. **Delete the leaked authoring directive** "Lead with the deliverable." from the five learner-facing
   prompts carrying it: `level7.ts:1793`, `level5.ts:3481`, `level5.ts:3531`, `level9.ts:1222`,
   `level9.ts:1270`.

**Acceptance criteria**

- A test fails when a Practice `thinkAbout` shares a distinctive multi-word mechanism phrase with its
  own `modelAnswerOutline`.
- A test asserts no System Design teach markdown contains a `<details>` element.
- `prompt-standards.test.ts` gains an assertion that no prompt ends with an authoring directive.
- The ten rewritten prompts state the requirement and the scale and stop before the mechanism, which
  is what the other 21 L10 prompts already do.

---

### Tier P2

---

#### SD-W11: Turn the reveal panel into a rubric

**Effort:** 2 agent-days. **Depends on:** SD-W3. One component change; 208 lessons inherit it.

There is no point in 208 lessons where a learner receives feedback on their own writing. The AI tutor
that would close the loop ships locked (`SableTutor.tsx:7`), and `DesignAnswerPanel.tsx:203` is the
entire self-comparison instruction for all 416 exercises: "A strong answer covers most of these; note
what you missed." Meanwhile a four-axis rubric with calibrated junior/senior/staff bars already exists
in `sd-l0-level-calibration` and appears in no other lesson.

1. Render the four axes as a self-score strip above the revealed model answer, from a shared constant.
2. Give each model-answer bullet a checkbox and a "you marked 4 of 6" tally, using the affordance
   `thinkAbout` already has. Outlines average 5.7 bullets and 302 words, so a typical bullet carries
   six distinct claims; splitting the densest at sentence boundaries is a follow-on content pass, not
   a blocker.
3. Keep `thinkAbout` visible when the answer reveals, paired question to bullet, so self-comparison
   runs question by question instead of prose against prose.
4. Name the expected answer shape once, globally, in the panel `goal` string: open with assumptions,
   commit to a mechanism, quantify one number, state one tradeoff, name the failure mode. That is
   what 91 percent of model answers already do (378 of 416 open with an Assumptions bullet) while only
   2 percent of prompts ask for it, which makes it a hidden rubric dimension today.
5. Raise the reveal gate above one character. `DesignAnswerPanel.tsx:59` gates on
   `savedSnapshot.trim().length > 0`, and the same event fires lesson completion, so a one-word save
   marks a 40-minute case study done.
6. Ship a `starterAnswer` for L10 and L11 consisting of the six phase headings with blank lines. That
   is scaffolding, not a pre-written decision, so the closure rule permits it, and it makes a skipped
   phase visible.

Also in scope, because it is the same "no self-check" defect in content form: append the missing
"Common wrong turn" bullet to the 32 exercises lacking one (nine in L5, five in L4, five in L6, four
in L3, four in L9, three in L0, two in L2). It is the corpus's only working self-grading signal at 92
percent coverage, and the material is already in the teach sections.

---

#### SD-W12: The currency batch

**Effort:** 3 agent-days. Mostly one to three sentences per site, and each is a question an
interviewer asks after the candidate finishes the memorized part. Detail in section 6.

---

#### SD-W13: Wire the lessons to the timed drills

**Effort:** 1.5 agent-days.

Twelve full 60-minute AI-interviewer System Design scenarios exist in `lib/scenarios`, and the only
link surface is `SystemDesignDrills.tsx:76` on the course page. No lesson links to its matching round,
so a learner who just finished `sd-l10-instagram` has no path to `system-design-instagram`. Add an
optional `drillScenarioId` to the lesson type, render a "Now do it live, on the clock" card after the
model answer reveals, and enforce the mapping with a registry test. Then author scenarios for the
highest-traffic uncovered case studies: stock-exchange, typeahead, unique-id-generator,
distributed-lock, payment-ledger, code-sandbox. This is also the cheapest partial answer to the
missing-clock finding: exactly one prompt in 416 asks for a timed walkthrough, in a course whose
Level 0 teaches a six-phase minute budget as the core delivery skill.

---

#### SD-W14: Duplication and ownership cleanup

**Effort:** 3 agent-days.

Six places where two lessons teach the same thing, which splits search authority and lets the two
copies drift into contradiction.

| Pair | Decision |
|---|---|
| `sd-l1-load-balancing` and `sd-l4-lb-l4-l7` (both titled around "L4 vs L7", and the L4 page opens by deferring to the L1 one) | `sd-l4-lb-l4-l7` becomes canonical and self-contained; retitle the L1 lesson to its actual scope. "l4 vs l7 load balancer" is unmet demand at 57-77 with two of our pages competing. |
| `sd-l2-vector-embeddings` and `sd-l3-vector-hybrid-search` (about 80 percent overlap; only the cross-encoder reranking section is new) | L3 assumes L2 and spends its budget on retrieval evaluation (recall@k, nDCG), chunking, permission-aware retrieval, and late-interaction/learned-sparse families. |
| `sd-l7-deployment-strategies`, `sd-l7-progressive-delivery-schema` and `sd-l9-iac-progressive-delivery` | L7 owns the release-strategy taxonomy and schema migration; L9 owns IaC, environment promotion and the GitOps wiring. One cross-reference each. Reclaims an L9 widget slot. |
| `sd-l5-leader-election-fencing` and `sd-l10-distributed-lock` | L5 keeps the correctness argument (position 8.2, 41 impressions); L10 becomes the buildable service: the etcd/ZooKeeper API surface, ephemeral sequential znodes, watch semantics and the herd, session versus lock TTL, Raft-group write throughput. Also name Redlock in L10, which argues the critique in full without ever using the word. |
| `sd-l10-object-store-s3-practice` and `sd-l10-file-sync`; `sd-l10-distributed-cache-practice` and `sd-l10-news-feed-practice` | Two L10 practices duplicate a sibling lesson outright. Retarget: object-store to an erasure-code-width and scrub-cycle problem; distributed-cache to a cold-start problem (stampede on fleet restart, warm-up ordering, negative caching, why the policy flips from LRU to LFU on a stable working set). |
| `sd-l0-phased-delivery-clock` and `sd-l0-template-pitfalls` | Three of four exercises produce the same phase-and-minute artifact, two for the same system, and the two lessons disagree on the URL-shortener read:write ratio (10:1 versus 100:1). Clock lesson owns the clock; template lesson owns the pitfall catalogue and gets a new retrieval task. Reconcile the ratio. |
| `sd-l6-streaming-observability` | Spends about 180 of 640 words re-teaching kafka-internals' durability trio, which already has a `quorum` widget driving the same experiment. Cut to a cross-reference; spend the words on client quotas, partition reassignment cost, and broker sizing, and convert the capacity math into a `calc`. |

---

## 4. The AI era: what the 2026 interview rewards

The owner's central question deserves a straight answer in two halves, because the phrase "AI and
system design interviews" is doing two different jobs.

### 4.1 AI as the thing that changed how design is graded

Interviews have not stopped asking for designs. They have stopped **rewarding** the part a model does
for free. The generation of a canonical architecture from a fully specified prompt is now a commodity;
what a strong interviewer is probing for is everything that is not that. Seven capabilities, each of
which a language model is structurally weak at, and each of which this corpus currently does not
assess even once:

1. **Noticing what was not said.** Models fill specification gaps silently and confidently, because
   producing a plausible completion is what they do. A human who says "you have not told me whether
   this is read-heavy, and the answer flips the design" has produced the single hardest-to-fake signal
   in the round. Corpus state: one prompt of 416 withholds a spec
   (`sd-l0-clarify-scope-practice`, currently unrendered). Zero of 832 `thinkAbout` entries begin with
   "What would you ask" or "What is missing". Every other prompt hands over the scale, the ratio and
   the SLO, and nine L10 teach sections pre-compute the traffic before the exercise even starts.
2. **Holding a position under informed pushback, and knowing when to update.** Corpus state: zero
   prompts stage an interviewer objection; one contains the word "defend". Worse, the one lesson that
   teaches pushback, `sd-l0-tradeoff-articulation`, teaches only the hold branch and actively marks
   reversal as failure: "Reversing instantly signals you never understood why you chose." That is half
   the skill, and the missing half is the more senior one. "Concede" appears once in 208 lessons, about
   an attacker. The repair is a `classify` with two buckets, probe (hold and restate the assumption)
   versus new constraint (update and say what changed), plus teach prose giving the learner the update
   sentence to say out loud.
3. **Diagnosing from symptoms.** Design-from-spec is generation; diagnosis under uncertainty is not,
   and it is the strongest AI-resistant signal a live interview can test. Corpus state: no prompt
   anywhere presents metric readings, a graph shape, or a symptom set and asks what is happening.
   Level 7's two incident exercises ask the learner to define an org process, and to execute a runbook
   for an outage whose cause the prompt itself states ("a single bad config push has taken down a
   service"), with a `thinkAbout` that presupposes the diagnosis.
4. **Pruning.** Models add machinery; nothing in their training rewards deleting Kafka. Corpus state:
   "over-engineer" appears eight times in 215,347 words, always as an aside inside an answer about
   something else, and 303 of 416 prompts open with "Design", a framing where more boxes reads as more
   effort.
5. **Pricing.** See SD-W9. A model will happily produce a design it cannot cost, and so, currently,
   will a graduate of this course.
6. **Calibrated uncertainty.** "I do not know, and here is the cheapest observation that would tell
   us" is a sentence a model almost never produces unprompted and an interviewer reads as seniority.
   Corpus state: the phrase appears three times in 208 lessons, all inside RAG prompt-design
   instructions telling a model to say it. Every one of the 416 model answers is fully confident end
   to end.
7. **The human cost of the design.** On-call surface, team size, migration path from a live system.
   Corpus state: 7 mentions of operational burden or headcount across 416 model answers; 23 of 208
   apply outlines mention a migration path; every one of the 28 L10 prompts is greenfield, in a market
   where "you have this running today, get me to your design without downtime" is a standard senior
   question.

**This is why SD-W7 is a P1 rather than a nice-to-have, and why it is cheap.** The corpus has already
written down the plausible-sounding wrong answer for 90 percent of its exercises and never once poses
it as a question. The distractor and its rebuttal are authored. What is missing is a read-only
`supplied` field and the decision to ask.

**What this does not mean.** Do not delete generative exercises. Designing a system end to end under a
clock is still the round, and a learner who cannot do it fluently fails before judgement is ever
tested. The target is a mix: roughly four generative exercises to one non-generative, concentrated in
the levels a learner reaches after the mechanics are solid, which is L7 and above.

### 4.2 AI as subject matter

The corpus is not out of date on AI. L11 names PagedAttention, continuous batching, chunked prefill,
prefill/decode disaggregation, speculative decoding, LoRA adapter multiplexing, the RAG triad, and
prompt injection via tool output, all of which match what 2026 loops actually probe. The defect is
allocation and integration, not currency.

**Allocation.** The seven-lesson GenAI module is 4,230 teach words with zero widgets; the six
networking lessons are 8,203 words with 17. Level 11 as a whole averages 612 teach words against a
1,035 corpus mean and carries one widget across fifteen lessons, and that one widget is a
`watermark-sim`, its fourth copy in the corpus, on a topic Level 6 already owns at length. So the
level's single interactive is its least novel content while nine ML and LLM lessons have none.

**Integration.** The hybrid prompt is now the default format: "design Twitter, including the
recommendation pipeline and a generative summary feature." The corpus cannot produce that answer,
because its 28 case studies contain zero LLM or generative content and its AI lessons are pure
components with no host product. The two halves never meet. That gap is SD-W8 item 2, and it is the
highest-value new content in the plan because it lands on the level that already ranks.

**Reachability.** The seven GenAI lessons sit at the terminal level of an eleven-level path, reached
after 193 lessons, and their real prerequisites are narrow: `sd-l11-model-gateway` depends on
`sd-l1-resilience-primitives`, `sd-l4-rate-limit-algorithms` and `sd-l3-caching-patterns`;
`sd-l11-rag-architecture` and `sd-l11-vector-db-ann` depend on `sd-l2-vector-embeddings` and
`sd-l3-vector-hybrid-search`. None depends on L5 consensus or L6 Kafka internals. Surface an "AI
systems" cross-cutting track entering at `sd-l2-vector-embeddings`, presented alongside the level
ladder rather than replacing it, so the frozen ids and progress keys are untouched. Depth is the
ranking lever ("llm serving" at 39.8, "model gateway" at 60.3 against our two shortest pages); the
track is the discovery lever.

**One thing not to do.** Do not add an AI lesson to Level 0. Instead add a second worked example to
`sd-l0-high-level-dataflow` and `sd-l0-nonfunctional-requirements` in AI shape, where the
non-functional requirements are p95 time-to-first-token, cost per request, and a groundedness bar
rather than availability and latency alone. That teaches the transfer without duplicating
`sd-l11-ml-blueprint`, and it makes the AI track reachable from the front of the path. Add three boxes
to the L0 component palette (model gateway, inference tier, vector index), which today lists nine and
none of them AI-shaped.

---

## 5. Motion, shapes and UX

### 5.1 The constraint that governs every conversion

`ANIMATED_DIAGRAM_TYPES = {topology, ladder}` share the one-heavy-item budget with all eleven
simulation families, enforced by `sim-density.test.ts`. `pipeline`, `table`, `er` and `comprehension`
are exempt. Level 10 already spends 14 of its 28 lessons at the cap, so for those 13 lessons the only
legal static conversion is `pipeline` or `table`. Every assignment below has been filtered against
this.

### 5.2 ASCII passages to convert, with target type

**`pipeline` (static, cap-exempt, nine strictly linear flows, zero new code).** These are the cheapest
high-volume win in the plan: `sd-l7-incident-postmortem` (detect, declare, mitigate, restore, diagnose,
postmortem, actions; highlight MITIGATE, since "mitigate before you diagnose" is the lesson's whole
argument), `sd-l9-serverless-faas`, `sd-l9-warehouse-lake-lakehouse` (bronze/silver/gold),
`sd-l9-cloud-finops` (Inform, Optimize, Operate), `sd-l10-notification-system` (the six-hop chain),
`sd-l10-video-streaming` (upload through CDN), `sd-l10-metrics-monitoring` (ingestion chain),
`sd-l11-realtime-recommendation` (millions to candidate gen to ranking to re-rank to rules; highlight
the first two, the funnel narrowing is the point), `sd-l11-llm-eval-guardrails`,
`sd-l11-time-series-storage`. Also in L0: the Fermi chain, the storage chain, and the tradeoff chain;
in L1: the admission-control chain; in L3: the BM25-plus-ANN-into-RRF-into-rerank chain.

**`table` (static, cap-exempt).** `sd-l7-availability-nines` (the nines table; note the instinctive
`ladder` fix is illegal here because the lesson already carries a `calc`, so a log-scale ladder is a
swap, not an addition, and that tradeoff should be stated explicitly rather than discovered in CI),
`sd-l7-error-budgets` (budget-remaining policy), `sd-l7-burn-rate-alerting` (the six-column burn-rate
ladder), `sd-l7-golden-signals` (RED/USE mapping, though this one is better as a `classify` check, see
below), `sd-l7-deployment-strategies` (the three-strategy comparison),
`sd-l9-monolith-vs-microservices` (monolith / modular monolith / microservices, on the page that owns
"modular monolith" at position 44.3), `sd-l9-iac-progressive-delivery`, `sd-l8-compliance-frameworks`,
`sd-l8-multi-tenancy` (silo/bridge/pool), `sd-l8-threat-modeling-zerotrust` (STRIDE),
`sd-l2-choosing-db-polyglot` (the eight-family decision matrix, on the level's capstone lesson which
has no diagram), `sd-l2-time-series` (the engine comparison), plus L0's units/object-sizes table,
single-machine ceilings, requirement-to-endpoint mapping, NFR-to-lever mapping, and the six-phase
clock, which is the level's single most-referenced object and is currently hand-drawn.

**`topology` (animated, counts against the cap; only where the lesson has headroom).** Nine L10
lessons qualify: `sd-l10-instagram`, `sd-l10-chat-messaging` (Alice, connSrv-A, session registry
cache, pub/sub backplane queue, connSrv-B, Bob, staged three ways so the registry and the backplane
each arrive with the requirement that forces them), `sd-l10-notification-system`,
`sd-l10-video-streaming`, `sd-l10-yelp-nearby`, `sd-l10-message-queue`, `sd-l10-webhook-delivery`,
`sd-l10-metrics-monitoring`, `sd-l10-payment-ledger`. Outside L10: `sd-l7-redundancy-failover`
(`level7.ts:1096-1107`, one stage per SPOF eliminated, each `note` carrying the justification),
`sd-l7-blast-radius-cells` (the cell router at `:1249`), `sd-l11-feature-store` (the widest ASCII line
in L11 at 115 characters), `sd-l9-containers-k8s` (declare, diff, converge), `sd-l4-service-discovery`,
`sd-l4-global-gslb`, `sd-l4-cell-shuffle-sharding`, `sd-l1-cdn-caching-foundations` (the origin
shield), `sd-l1-reverse-proxy-gateway` (the edge tier), `sd-l3-read-replicas`. The web-crawler diagram
at `level10.ts:2047` is the template: seven nodes, four stages, every note tied to a requirement.

**`ladder` (animated, counts against the cap).** `sd-l7-progressive-delivery-schema` (the five
expand/contract steps at `level7.ts:1371`), `sd-l10-distributed-lock` (the fencing-token protocol; the
one search-visible bare L10 page, and it wants a ladder not a topology),
`sd-l8-encryption-rest-field` (the envelope unwrap showing the KEK never crossing the HSM boundary),
`sd-l8-secrets-kms` (the secret-zero handshake), `sd-l1-cache-hierarchy` (the six-layer stack, which
is literally a ranked stack with a cost per rung), `sd-l11-online-serving-rollout` (shadow, canary,
A/B, interleaving, value = fraction of traffic exposed).

**Leave as plain fences.** Seven L10 blocks are pseudo-code, protocol steps or command cheat sheets
that no diagram type should absorb: `sd-l10-rate-limiter` (Redis Lua), `sd-l10-typeahead` (trie walk),
`sd-l10-file-sync` (chunking), `sd-l10-collaborative-editor` (OT-versus-CRDT contrast),
`sd-l10-job-scheduler` (CAS lease), `sd-l10-distributed-lock` (the ZooKeeper znode protocol, separate
from its ladder), `sd-l10-leaderboard-topk` (Redis commands). Likewise `sd-l7-timeouts-retries`
(backoff formula), `sd-l7-circuit-breakers` (state machine, see 5.5), `sd-l7-load-shedding`
(metastable loop, see 5.5), and the worked arithmetic fences in L0, where a code fence is the right
medium.

**Delete outright.** Three fences duplicate a widget sitting directly above them and one duplicates
the widget's own predict answer: `level7.ts:564-572` (reprints the trace-waterfall widget's numbers
with an arrow labelled "culprit", spoiling the widget's own gate), `sd-l4-rate-limit-algorithms` (the
rate-limiter widget), `sd-l4-distributed-rate-limiting` (restates the prose),
`sd-l5-2pc-3pc` / `sd-l5-quorums-tunable` / `sd-l5-cap-correct` (each repeats the sim above it), and
`level3.ts:710` (an ASCII hash ring directly beneath the interactive `hash-ring`). Also compress
`sd-l7-dr-rto-rpo`'s four bullets, which restate the ladder diagram's per-band notes almost verbatim.

### 5.3 Widget families to deploy where the level lacks them

All already shipped; none needs new code.

- **`check`** into L7, L9, L10, L11. SD-W4. 76 lessons.
- **`calc`**: `sd-l7-error-budgets` (SLO, window, request volume to allowed failures, minutes, and
  current burn rate), `sd-l7-burn-rate-alerting`, `sd-l9-serverless-faas` (memory, duration, RPS,
  container hourly rate to the crossover utilization, with the `predictPrompt` asking the learner to
  guess the crossover first, which directly confronts the "serverless is cheaper" misconception the
  lesson already names), `sd-l9-service-mesh` (pods x sidecar MB, hops x per-hop ms),
  `sd-l9-cloud-finops`, `sd-l11-llm-inference-serving` (the GPU-memory widget, the single
  highest-value widget in the plan), `sd-l11-model-gateway` (monthly spend from QPS, tokens, cache hit
  rate and cheap/frontier split), `sd-l2-indexing-cost` ((indexes + 1) x rows), `sd-l2-time-series`
  (series = product of tag cardinalities, so one extra label multiplies rather than adds),
  `sd-l2-graph` (intermediate rows = degree^depth, turning 40,000 into 320 billion as the learner
  drags depth), `sd-l7-golden-signals` (the cardinality trap), `sd-l0-storage-bandwidth-cache` (the
  monthly bill), `sd-l6-streaming-observability` (partitions, petabytes, egress).
  Constraint: at most one sparkline per calc (`lib/tutorials/widgets/families/calc.ts:132`).
- **`steps`**: `sd-l7-deployment-strategies` (rolling pods flipping, blue-green router flip,
  canary ramp with the predict gate on the frame where two versions serve live traffic simultaneously,
  which is the misconception the prose names and never shows),
  `sd-l7-progressive-delivery-schema` (expand/contract with the predict gate on
  "a colleague ships RENAME COLUMN in the deploy: what breaks first?"; note `steps` forbids a predict
  on frame 0, so gate frame 2), `sd-l9-oltp-vs-olap` (row-versus-column layout with cell states
  encoding which bytes are touched by a point lookup versus a SUM),
  `sd-l10-message-queue` (consumer-group assignment and rebalance, with the predict on
  "you add a fourth consumer to a 3-partition topic"), `sd-l11-llm-inference-serving` (contiguous
  KV pre-allocation versus PagedAttention, then static versus continuous batching),
  `sd-l11-finetune-rag-prompting` (one requirement staged through prompting, RAG, fine-tune).
- **`queue-sim`**: `sd-l7-load-shedding-degradation`, configured so the lesson's own claim is
  falsifiable inside the widget rather than asserted: high burst multiplier, low capacity,
  `scaleOnBacklog` with a deliberately small `maxConsumers`, so the learner turns scaling on and
  watches depth keep climbing, then switches to the bounded queue and watches it stabilise.
- **`sequence`**: `sd-l10-distributed-lock` (actors clientA, lockStore, clientB, resource; toggles
  `pauseA` and `noFencing`; predict on A's stale write), `sd-l10-chat-messaging` (Alice to Bob across
  the registry and backplane), `sd-l8-sessions-tokens` (refresh-token rotation with a "attacker steals
  RT2" toggle and a predict at the replay), `sd-l5-logical-clocks` (vector-clock dominance with a
  predict at the concurrency comparison), `sd-l5-raft-paxos` (five actors, leader crash toggle,
  predict at the moment the uncommitted term-4 entry is overwritten), `sd-l11-llm-agents` (the
  tool-call loop with the step-budget abort as a failure toggle).
- **`partition-sim`**: `sd-l3-shard-key-hotspots`, where the lesson's single hardest idea
  ("consistent hashing balances load across keys; it cannot split load within a key") currently lives
  in a check's feedback string.

### 5.4 Motion

Three renderers System Design leans on hardest have **no enter transition at all**, so when a stage
adds two nodes or a frame flips three cells, the learner cannot see which elements changed.
`TopologyDiagram.tsx:97,129` filters by `visible.has(...)` with no transition class and no reference
to `player.reducedMotion` anywhere in the file. `SequenceWidget.tsx:20` states outright that "No
animation runs; a revealed arrow appears instantly." `StepsWidget.tsx:86` has a `transition-colors`
on the Prev/Next chrome and nothing on the cells. `LadderDiagram.tsx:55` already has the correct
pattern: `!player.reducedMotion && "transition-[width] duration-300"`, and `useStepPlayer` already
resolves `reducedMotion` hydration-safely for every renderer.

Three small tweens, each gated exactly as LadderDiagram does:

1. **TopologyDiagram**: render all nodes and edges always, drive `opacity` (0.06 hidden, 1 shown) plus
   a 4px translate on newly-staged nodes over 300ms. This also stops the SVG viewBox reflowing between
   stages, which currently makes boxes jump.
2. **SequenceWidget**: animate the newly revealed arrow's `stroke-dashoffset` from full to zero over
   about 250ms so direction is seen, and for `status: "lost"` stop the draw at about 60 percent so a
   dropped message reads as a mechanism rather than a colour.
3. **StepsWidget**: `transition-colors duration-300` on cell state changes so the `new` and `dropped`
   diff between frames is perceptible.

**The refusal list, to be written into `docs/csdiagram-authoring.md`.** Allowed, because the change is
the concept: staged entry of a topology node, a sequence arrow drawing in its direction, a steps cell
changing state, a ladder bar growing, a hash-ring key remapping. Refused: looping packet dots
travelling along topology edges (they animate flow, which is constant, and not the thing that
changed), autoplay on scroll into view, pulsing or glowing "alive" indicators, animated gradients or
shimmer, and any motion at all on `table`, `er`, `pipeline` or `comprehension`, which are static by
contract. The plan already adjudicated this once, choosing "engineering's static deterministic
driver-dot set" over "moving dots, which are flavor not concept"; write the verdict down so it is not
relitigated per lesson. The reviewer question stays: what changed, and would the learner miss it
without the tween.

### 5.5 The one new family worth building

**A STATIC `state-machine` csdiagram.** Eight lessons teach a labelled finite state machine with
cycles, and no shipped type renders one: `sequence` draws actors over time, `steps` draws row-and-cell
snapshots, and `topology` is both semantically wrong (it prints an infrastructure `kind` under every
box, `TopologyDiagram.tsx:164`) and structurally wrong (`topology-layout.ts:6` is "cycle-safe" in the
sense that it settles rather than hangs, which means it flattens a cycle across columns instead of
closing it).

Served lessons: `sd-l7-circuit-breakers` (CLOSED / OPEN / HALF-OPEN),
`sd-l7-load-shedding-degradation` (the metastable loop, whose whole point is a self-edge that does not
self-recover), `sd-l10-chat-messaging` (sent / delivered / read),
`sd-l10-ride-sharing` (requested / accepted / arrived / in-progress / completed),
`sd-l10-job-scheduler` (pending / running / done via CAS), `sd-l10-payment-ledger` (pending / settled /
compensating reversal), `sd-l6-idempotency-dedup`, `sd-l5-smr-total-order`. That clears the plan's
stated threshold of three-plus lessons served comfortably.

Build it **static**, i.e. keep it out of `ANIMATED_DIAGRAM_TYPES`, so it can land in lessons already
carrying a sim. `sd-l7-circuit-breakers` already has a `sequence` and `sd-l10-ride-sharing` already
has a `calc`; under the current cap an animated type in either would fail CI. Schema: 2 to 6 states
with label and optional note, 2 to 10 transitions with from/to/label, optional single-transition
`highlight`, optional `initial`, self-loops supported, and a cross-field check that every transition
endpoint is a declared state, matching how topology validates edges. Layout: states on a fixed arc
with curved transition arcs so a back edge reads as a loop.

Everything else the brief raised is expressible today: see section 7.

---

## 6. Content and coverage gaps

New lessons and sections, each tied to an interview trend or measured search demand. Ordered by value.

**Tied to measured search demand (a page exists and underperforms, or no page exists):**

| Gap | Demand | Where it goes |
|---|---|---|
| LLM serving depth | "llm serving" at position 39.8, no dedicated page | `sd-l11-llm-inference-serving`, via SD-W5 and the GPU calc |
| Model gateway depth | "model gateway" at 60.3, our page is 509 words | `sd-l11-model-gateway` |
| SLI/SLO/SLA, four golden signals, availability nines | 43-86, 59, 27-76; all pages exist and are among the shortest in the corpus | `sd-l7-sli-slo-sla` (541 words), `sd-l7-golden-signals` (642), `sd-l7-availability-nines` |
| Canary deployment strategy | 66, page exists at 587 words with no visual | `sd-l7-deployment-strategies` |
| L4 vs L7 load balancer | 57-77, two of our pages compete | SD-W14 |
| Modular monolith | 44.3, page exists at 507 words, bare | `sd-l9-monolith-vs-microservices` |
| Matching engine design | 53.6 | `sd-l10-stock-exchange`, our highest-impression page at position 40.3, which currently has one numeric token in 1,221 words and no order-type or market-structure content |

**New lessons worth adding:**

1. **Accelerator capacity** in L4-m4 (SD-W8 item 3). The missing rung between `sd-l4-autoscaling` and
   `sd-l11-llm-inference-serving`.
2. **Two hybrid AI case studies** in L10 (SD-W8 item 2).
3. **Training infrastructure** in L11-m1: data versus tensor versus pipeline parallelism and what each
   costs in interconnect, checkpointing cadence against spot eviction, elastic restart, and weight
   distribution to a large fleet (tree or peer-to-peer fan-out versus central object store, where the
   constrained link is the whole problem). "Distributed training" and "model weights" as a
   distribution problem appear nowhere; `sd-l9-cloud-finops` already assumes checkpointing on spot
   without teaching it.
4. **Agent orchestration**, splitting `sd-l11-llm-agents`: keep the bounded loop, tool contract and
   injection containment, and add multi-agent handoff and shared state, tool/context protocol
   boundaries (MCP), context-window budgeting and compaction as a first-class resource, and what a
   workflow engine actually gives you (deterministic replay, at-least-once activity execution, and why
   that forces the idempotency key the corpus already teaches). Today `MAX_TOKENS` is a hard governor
   with no technique offered for staying under it.
5. **A timed capstone** at the end of L10: a cold one-line prompt, the whole L0 spine delivered
   against a stated 45-minute budget with per-phase minute marks, revealing a model round annotated
   with where the time went. Exactly one prompt in 416 currently asks for a timed walkthrough.

**Sections rather than lessons, where a topic is missing but its home exists:**

- **Post-quantum** in `sd-l8-encryption-transit-mtls`, whose own widget stages harvest-now-decrypt-later
  and answers "forward secrecy protects you" without the quantum asterisk. Hybrid key exchange
  (X25519MLKEM768) has been a browser default since 2024. This is the difference between a 2023 and a
  2026 TLS answer.
- **DORA, NIS2, PSD2/SCA and PCI DSS v4** in `sd-l8-compliance-frameworks`, whose practice is a US
  neobank entering Germany and whose table stops at four frameworks.
- **The xz-utils threat model** in `sd-l8-audit-supplychain`, which frames supply chain entirely around
  known CVEs and Log4Shell, letting SBOM plus SCA imply an answer to an attack neither would have
  caught. The contrast (reproducible builds, source-to-artifact verification, SLSA build levels,
  maintainer review, build blast radius) is the pedagogically valuable part.
- **Secrets in GitOps** in `sd-l9-platform-gitops` (SD-W5).
- **Payment lifecycle and money representation** in `sd-l10-payment-ledger` (SD-W5).
- **Order types, self-trade prevention, auctions and halts** in `sd-l10-stock-exchange`.
- **DRM and packaging** in `sd-l10-video-streaming`, whose 495 words answer the VOD interview without
  ever addressing "how do you stop someone downloading the segments."
- **Freshness/lag SLIs** in `sd-l7-sli-slo-sla`. Level 6 tells the learner consumer lag "is the one
  number that turns into an SLO"; Level 7 owns SLOs and every SLI it teaches is request-shaped, so the
  two levels do not join up. Also add the request-based versus time-based distinction, which is what
  makes the module's own arithmetic consistent.
- **Percentile aggregation** in `sd-l7-golden-signals`: percentiles do not average, a fleet p99 comes
  from merged histogram buckets, and bucket boundaries must straddle the SLO. A natural check: "Twelve
  pods each report p99 = 300 ms. What is the fleet p99?"
- **TTD/TTM/TTR and paging mechanics** in `sd-l7-incident-postmortem`, which claims the differentiator
  is "detecting, responding, and learning fast enough" and gives no way to measure any of the three.
- **Origin shielding and tag-based purge** in `sd-l1-cdn-caching-foundations`, whose practice requires
  both and whose teach offers app-level single-flight and per-URL purge.
- **Cache-aside's second race** in `sd-l3-caching-patterns`: the read-miss that writes a stale value
  back after the writer's delete. The lesson teaches delete-on-write as the fix and names only the
  writer-writer race, so a learner finishes believing cache-aside plus invalidation is race-free.
- **Gap and next-key locks** in `sd-l2-isolation-levels`, which calls the Postgres/MySQL default
  divergence "a real production trap" and never explains the mechanism that causes it.
- **WAL as backup and PITR** in `sd-l2-physical-storage-wal`, which teaches the log as durability and
  stops, leaving RPO/RTO and "a replica is not a backup" unanswerable.
- **3PC's actual phases** in `sd-l5-2pc-3pc`, which is half the title and gets 53 words with no phase
  names, in the level's best-ranking page; plus cooperative termination and presumed-abort, since the
  lesson currently teaches that an in-doubt participant can only wait.
- **Conditional-write enforcement** in `sd-l5-leader-election-fencing` (position 8.2, our best): the
  lesson asserts storage rejects stale tokens and never shows how you obtain that from a SQL
  conditional update, a DynamoDB ConditionExpression, or an S3 If-Match, nor what to do when the
  storage system has none of them.
- **Read paths and PreVote** in `sd-l5-raft-paxos`, whose own practice requires ReadIndex.
- **Consistency verification** in `sd-l5-consistency-spectrum`: 18 lessons about linearizability and
  quorums with no account of how anyone checks a claim (generated histories under injected faults
  against a model). One paragraph gives every later lesson a verification vocabulary.
- **Share groups and tiered storage** in `sd-l6-consumer-groups` and `sd-l6-queue-pubsub-log`, whose
  partition-count parallelism ceiling and queue-versus-log dichotomy are both now qualified. Verify
  the GA release before writing a version number; the concept and KIP number are safe.
- **Transitive compatibility modes** in `sd-l6-schema-evolution`, whose framing scenario (a consumer
  spinning up next quarter to replay events from dead producers) is only safe under them and which
  lists only the three non-transitive modes.

---

## 7. Explicitly not doing

A council that recommends everything has recommended nothing. These were raised, considered, and
declined.

1. **Do not build five of the six proposed new widget families.** Only the static `state-machine`
   (5.5) cannot be authored today. The nines table is `table` or a log-scale `ladder`, both shipped and
   the latter already used for the DR ladder. LLM batching is `steps` and serves one lesson. The cost
   calculator is `calc` with the whitelisted grammar, already used six times in L7 and L10. The
   rollout sim is `steps` plus `calc`; the plan already folded six bespoke Iteration-10 widgets into
   `sequence` and `calc` configs for exactly this reason. The error-budget burn-down is **deferred**,
   not refused: revisit only if the shipped `calc` sparkline proves insufficient after
   `sd-l7-error-budgets` and `sd-l7-sli-slo-sla` get their checks.
2. **Do not rewrite Level 10's teach sections to 1,100-1,400 words on the grounds that they are thin.**
   That recommendation compared L10 prose with fences stripped against L0-L5 totals with widget JSON
   included. Measured identically, L10 averages 548 prose words against L0's 476, L1's 539, L4's 512
   and L5's 524, and the highest teach in all 208 lessons is 748. L10 is at parity. Its raw total is
   low because of visual density, which SD-W6 fixes without adding a word. The genuine L10 depth
   defects are specific and named in SD-W5 (failure modes, numbers, estimation retrieval), not a
   uniform word target. Related: **do not move the end-to-end walkthrough into teach.** The
   `modelAnswerOutline` is the worked example, revealed after the attempt by design; promoting it
   spoils the Apply and converts it into transcription. And do not author 28 narrated walkthroughs:
   Level 0 already is that lesson, fifteen times over, including a URL-shortener Apply.
3. **Do not add an OT/CRDT teach subsection or a convergence ladder to `sd-l1-http-semantics`.**
   `level10.ts:1190-1270` already ships exactly that diagram, same scene, and duplicating it pre-empts
   `sd-l10-collaborative-editor`, a page on the level that carries our traffic. Both terms are properly
   taught at `level3.ts:271`, `sd-l5-crdts`, and `sd-l10-collaborative-editor`. The proportionate fix
   is one clause in the L1 teach noting that ETag plus If-Match assumes low write contention and that
   high-contention collaborative editing needs a merge-based family covered later. Identical treatment
   for the SPIFFE half.
4. **Do not cut `sd-l5-byzantine-fault-tolerance`** on interview-frequency grounds. It is well built,
   cheap to keep, and its sibling `sd-l5-2pc-3pc` draws real traffic at position 10.2, so classical
   distributed-systems depth is not dead weight. Use it as the calibration bar instead: any lesson
   marked "hard" in L9, L10 or L11 should reach comparable word and widget counts before the corpus
   adds new lessons.
5. **Do not shorten any model answer.** L11's average model answer (630 words) sits squarely inside the
   corpus band (542 to 646). The abnormal quantity is the denominator.
6. **Do not add a second sparkline to a `calc` widget.** `calc.ts:132` permits at most one, so the
   "show both curves" fix for `sd-l4-capacity-planning` is unbuildable. Reword instead.
7. **Do not treat the Postgres DDL deep-dive in `sd-l7-progressive-delivery-schema` as a correctness
   fix.** The one-clause gh-ost repair is in SD-W2; `lock_timeout`, ACCESS EXCLUSIVE queuing,
   CREATE INDEX CONCURRENTLY and pgroll are enrichment on a corpus-wide gap, and belong in SD-W12 if
   anywhere. Same for the Postgres HOT-update nuance in `sd-l2-indexing-cost`: real, non-obvious, on a
   page with demand, but an addition and not a repair, and if added it must cover InnoDB symmetrically
   since the same paragraph already names both engines.
8. **Do not write the authoring bar as a document.** The five moves from `sd-l1-latency-percentiles`
   go into an acceptance test, not into `docs/system-design-authoring.md`. A rule in prose is a rule
   that drifts.
9. **Do not use `starterAnswer` as the carrier for critique artifacts.** It is editable seed text, so
   a supplied flawed design lands inside the learner's own saved answer. Add the read-only `supplied`
   field (SD-W7). `starterAnswer` keeps the phase-heading scaffold job (SD-W11).
10. **Do not reorder lessons to fix forward references.** `sd-l8-multi-tenancy` before
    `sd-l8-encryption-rest-field`, `sd-l9-containers-k8s` before `sd-l9-iac-progressive-delivery`, and
    `sd-l1-realtime-comms` before `sd-l1-concurrency-models` are all genuine ordering problems, and all
    of them get fixed by teaching the missing fact in place. Ids are progress-keyed and frozen.
11. **Do not convert `sd-l0-level-calibration`'s Apply to a performance task.** Keep it as the
    rubric-teaching exercise; convert only its Practice, so the level retains one lesson that names the
    rubric explicitly. The rubric also becomes live in the reveal panel via SD-W11, which is the real
    fix for "taught and never applied."
12. **Do not add a per-lesson soft timer to the answer panel.** The clock gap is real, but the honest
    fix is the L10 capstone plus the drill deep-links (SD-W13), which put the learner in front of an
    interviewer on a real clock rather than adding a stopwatch to a text box.

---

## 8. Refuted claims

Recorded so nobody re-raises them. Each was checked against the file and did not survive as stated.

| Claim | Verdict | What actually survives |
|---|---|---|
| `sd-l1-http-semantics-practice` breaks the closure rule; the whole payload answer is "use OT or CRDTs" | **Overstated** | Five of six substantive bullets are fully recoverable from teach; `thinkAbout` asks for the family by description, not by name; there is no grader, so a reveal supplying two industry names is the loop working. Forward-reference vocabulary gap, one clause. See item 3 in section 7. |
| `sd-l2-indexing-cost` states a factual error about index maintenance | **Overstated** | The sentence describes a correctness obligation and scopes its cost figure to inserts. No graded work depends on the exception (`status` is an indexed column in the Apply's composite). Enrichment, optional, and must cover InnoDB too if added. |
| `sd-l2-document` contains a factual error about Firestore's document limit | **Overstated** | Vendor-scope inconsistency, not a factual error. Teach attributes 16MB to MongoDB correctly in both places; the lesson declares itself a MongoDB lesson in its skills and summary. Cheapest correct fix is dropping "Firestore/" from the prompt and attributing the number in the outline. The harm runs opposite to the one claimed: a learner carries "the 16MB cap" as the document-store cap. |
| `sd-l4-capacity-planning`'s calc teaches the wrong quantity | **Overstated** | The output label ("Wait/response-time multiplier") and the `workedExample` ("about 3.3x the idle-system response time") are both correct; two sentences drift. The lesson never invokes M/M/1, and `calc.ts:60` forbids a marked answer, so nobody is scored wrong. Reword the `predictPrompt` and caption. Do not add a second curve. |
| `sd-l5-crdts` contradicts its own Apply on OR-Set semantics | **Overstated** | The same teach states add-wins twice before the ambiguous clause: in prose at `level5.ts:2257` and in a classify widget at `:2370` whose feedback is near-verbatim the Apply's. One-clause precision edit, low priority. (A sloppier version does sit at `level3.ts:2780`, which is the stronger target if anyone chases it.) |
| Level 7 offers no retrieval practice or misconception correction at all | **Overstated** | Nine commit-before-reveal prediction gates exist (`level7.ts:37, 168, 439, 713, 905, 947, 1066, 1202, 1268`). What they lack is graded feedback, because `predictSchema` has no `correct` flag. Target is 34 checks, not 40 (13,454 is the raw count including widget JSON; prose is 9,874). Two proposed checks would duplicate live gates. |
| Level 9 has no retrieval practice at all | **Overstated** | Three predict gates exist (`level9.ts:241, 752, 1090`), and one of them already targets the misconception the recommendation proposed to author. Also not a rule violation but an unshipped iteration, scheduled at `INTERACTIVITY-PLAN.md:240` and self-diagnosed at `:296`. |
| Level 10 is the only level with no checks, and it is the hardest material | **Overstated** | Four levels are at zero (76 lessons). L11 is 15/15 hard while L10 is 20 hard / 7 medium / 1 easy. And the exercise loop is already a commit-then-reveal; what is missing is in-teach retrieval specifically. L10 still goes first, on search demand rather than uniqueness. |
| Level 11's zero checks make it distinctively deficient | **Overstated** | Same four-level tail. L11 is the smallest slice at 15 lessons; L10 at 28 carries the traffic. Owed count is about 30 at the clamp floor, with the cumulative check counted inside the dose, not added to it. |
| `sd-l7-availability-nines` sells eight nines as achievable | **Overstated** | The figure is conditioned, labelled a ceiling, and the outline's actual commitment is a defensible 99.995 percent SLO with a 99.95 percent SLA. The real defect is that "independent" is never glossed and "correlated failure" appears nowhere in 208 lessons, and it affects both exercises, including the Apply's two-replica claim at `:1484` where independence is harder to defend than for two card networks. |
| The nines table should be rebased on a 43,800-minute month | **Wrong fix** | That would newly break the 99 percent row, whose "~7.2 hours" is correct only on 43,200. Correct the two offending rows instead. See SD-W2. |
| `sd-l7-progressive-delivery-schema` is MySQL-shaped throughout and its Postgres facts are missing | **Overstated** | One clause of one Apply bullet. The teach labels the tools "for MySQL" and is otherwise engine-agnostic and Postgres-valid; the Practice answer is affirmatively Postgres-correct; the Apply prompt names no engine, so closure holds. |
| `sd-l9-edge-wasm`'s CPU claim carries the whole what-runs-where decision | **Overstated** | The teach itself grounds that rule in the data constraint ("That last point is the real constraint," `level9.ts:507`) among four criteria, and neither model answer changes if the number is corrected. Tier-qualify the one parenthetical. "No full Node.js API surface" is accurate as written even with `nodejs_compat` and needs no correction. |
| L8 and L9 ship contradictory answer keys on sidecar meshes | **Overstated** | L9 says sidecars "work" and quotes the same 1-to-several-ms figure, conditioned on tight latency budgets L8's scenario never states. It is a currency and cross-referencing gap, and the strongest instance is not the one reported: `sd-l4-service-discovery-apply` makes the sidecar the graded decision. Keep the 1-3 ms figure. A genuine factual error was found inside the quoted sentence and promoted to SD-W2: Linkerd does not use Envoy. |
| L8 practice answers hide definitions in opt-in hints, the regression CLAUDE.md forbids | **Overstated** | `DesignExercise` has no hints field; `thinkAbout` renders unconditionally beside the editor and is published on the public preview. Most cited terms are introduced in the prompt or glossed at point of use. What survives is a closure and ramp gap in three lessons, strongest at `sd-l8-ddos-rate-abuse`. |
| `sd-l10-key-value-store`'s model answer describes the 2007 Dynamo paper | **Overstated** | The conflation runs both ways: bullets 3 and 4 invoke adaptive capacity, split-for-heat, pre-warming and global tables, none of which exist in the paper, and the outline never writes "DynamoDB" at all. So retitling to the paper and keeping the answer is not viable. Also corpus-scoped (`level3.ts:190` repeats it, `:802` gets it right), and there is a separate closure violation underneath the naming dispute. |
| Twenty-five L10 lessons should get a `topology` diagram | **Overstated** | Thirteen of them are already at the density cap and would fail `sim-density.test.ts`; seven of the fences are pseudo-code or command lists that no diagram type should absorb. Nine lessons qualify. The five lessons named as "search-visible" have zero recorded impressions; the one search-visible bare page is `sd-l10-distributed-lock`, and it wants a `ladder`. |
| L11's model answers outweigh its teach in nine lessons | **Confirmed and understated** | Eleven of fifteen. `sd-l11-time-series-storage` (660 vs 619) and `sd-l11-online-serving-rollout` (589 vs 576) were missed. L11 is also the only level in the corpus where the model-answer total exceeds the teach total. |

Confirmed as stated, for the record: the `sd-l0-storage-bandwidth-cache` cache-sizing widget (plus a
second uncaught defect in the same expression), the `sd-l0-qps-read-write` hybrid fan-out model, the
`sd-l1-concurrency-models` 1MB stack (six sites, not four), the `sd-l2-isolation-levels` Postgres
Repeatable Read claim, the `sd-l2-key-value` `volatile-lru` recommendation, the
`sd-l4-distributed-rate-limiting` number collision, the `sd-l4-tls-connection-mgmt` 64K port figure
(and its contradiction with a widget that marks 28k correct), L7's single diagram and eight bare
lessons (conservative: at least eight of thirteen fences are natively renderable), the
`sd-l9-service-mesh` Cilium claim (five sites), the `sd-l10-chat-messaging` MQTT attribution, the
`sd-l11-llm-inference-serving` AWQ statements, the `sd-l11-globally-consistent-multiregion` HLC claim,
and the HyperLogLog pairing.

---

## Sequencing summary

| Wave | Workstreams | Agent-days | Gate before proceeding |
|---|---|---:|---|
| 1 | SD-W1, SD-W2 (concurrent, disjoint files) | 2.5 | Ratchet test lands and has been seen to fail; correctness commits verified in `git log` |
| 2 | SD-W3, SD-W4 (four agents, one per level file) | 8.5 | `lessonsWithoutChecks === 0`; Practice renders and old progress survives |
| 3 | SD-W5, SD-W6, SD-W10 | 20 | Teach-word floor green; `bareLessons === 0`; spoiler test green |
| 4 | SD-W7, SD-W8, SD-W9 | 18 | `supplied` field shipped; pilot genres dogfooded by a human |
| 5 | SD-W11, SD-W12, SD-W13, SD-W14 | 9.5 | Full gate: `pnpm lint`, `typecheck`, `test`, `build` |

**Total: about 58 agent-days.** Waves 1 and 2 alone (11 agent-days) close the two defects that most
embarrass the course: half the assessment being invisible, and 37 percent of it having no way to tell
a learner they were wrong.

**Verify agent reports yourself.** Before relaying any wave as complete, check `git log` for the
commits, run the suite, and read a sample of the diff. Agents report success they did not achieve,
and this plan is large enough that a silent commit failure would otherwise survive to the next wave.
