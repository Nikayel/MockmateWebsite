# Learn / Python audit: AI-era skills and research-instrument readiness

> **STATUS, updated 2026-08-02 (same day):** most of Tier 0 and Tier 1 has since shipped, plus
> parts of Tier 2 and the Tier 3 prerequisite. See [§10 What shipped](#10-what-shipped-2026-08-02)
> at the end. One finding in this document was overstated and is corrected there.


**Date:** 2026-08-02
**Scope:** the `/learn` platform, with Python as the focus track. Four lenses: content depth, hands-on pedagogy, AI-era skill relevance, and research-grade instrumentation.
**Method:** three parallel repo sweeps (content inventory, engine capability map, telemetry audit) plus the existing planning docs (`docs/python-curriculum/`, `docs/learner-model/`, `docs/pitch/PITCH-READINESS-2026-07-19.md`) and outside signal on 2026 junior hiring.
**Companions:** [`CURRICULUM-GAP-ANALYSIS.md`](../python-curriculum/CURRICULUM-GAP-ANALYSIS.md) (the traditional-lens gap list, 2026-07-16) · [`LEARN-PLATFORM-AUDIT.md`](../LEARN-PLATFORM-AUDIT.md) · [`RESEARCH-MEMO.md`](../learner-model/RESEARCH-MEMO.md)

---

## 1. Verdict

Three hypotheses were put to this audit. Two are right, one is wrong in an important way, and the most severe problem is one that was not named.

| Hypothesis | Verdict |
|---|---|
| "Python content is too little" | **Mostly wrong on breadth, right on depth.** 55 lessons cover nearly every topic a Python course should. What is thin is time-per-topic: 14 declared hours against a planned 41. |
| "Not hands-on enough" | **Right, and the cause is narrower than expected.** The most-used interactive primitive on the platform (413 instances) is authored into System Design and **zero times into Python**. No engine work is required to fix that. |
| "Missing the skills companies need in the age of AI" | **Right, and it is structural, not just missing content.** The Python track contains zero AI/LLM material, but the deeper issue is that the engine can only grade "did your code pass the tests," which is exactly the task that has been automated. |
| *(unnamed)* "Tracking is not research-lab grade" | **Right, and it is the most severe finding.** `/learn` persists one overwritten status document per lesson whose only performance number is **hardcoded to `100`**. The genuine research instrument that exists on this platform is wired to `/practice` and `/knowledge` and has zero connection to `/learn`. |

**The single sentence that captures it:** every one of the 110 graded Python exercises asks the learner to write a small function that passes hidden tests, which is the one programming task a 2026 model performs instantly and perfectly, and the platform records nothing about how the learner got there.

**The one time-sensitive item.** Public launch is targeted for Aug 25. Item-level learning data cannot be backfilled. Every learner who works through a lesson before the logging exists is a permanently lost observation. This is the only part of this audit that is genuinely more expensive to defer than to do now.

---

## 2. What is actually shipped

Counted from lesson objects, not files.

| Track | Levels | Modules | Lessons | Graded exercises | Interactive checks |
|---|---:|---:|---:|---:|---:|
| **Python** | 4 | 22 | **55** | **110** (89 single-file, 21 workspace) | **0** |
| SQL | 6 | — | 78 | 170 single-file + 1 workspace + 22 extra drills | 0 |
| System Design | 12 | — | 208 | 0 (free-response only) | 413 |

Python detail: 34,177 words of teach prose (mean 621 per lesson), 323 test assertions, 266 hints, 45 `csdiagram` fences, `demoCode` on 54 of 55 lessons, 14 declared hours.

Structural uniformity: all 55 lessons are exactly `teach + apply + practice`. No lesson deviates. `extraPractice` (the schema field for multi-drill lessons) is used **0 times** in Python; SQL uses it 22 times.

---

## 3. Lens 1: content depth

**Breadth is genuinely good and better than the reputation.** The July gap analysis listed a top-8 of missing topics; **7 of the 8 have since been closed**. Shipped and verified present: OOP across nine lessons, decorators (twice), generators, comprehensions, closures, dataclasses and enums, type hints and `Protocol`, pytest with fixtures, `asyncio`, the GIL and `concurrent.futures`, regex, `collections` (`Counter`/`defaultdict`/`deque`), recursion, references and the mutable-default trap, `is` vs `==`, and early Big-O framed as data-structure choice. That is a real Python curriculum, not a toy.

**Depth is a third of plan.** `docs/python-curriculum/README.md` specified ~41 hours; the shipped tree declares 14. The lesson count actually exceeded plan (55 versus ~44), so the shortfall is entirely in time-per-lesson: each topic gets one explanation and two small exercises rather than the sustained practice the spec assumed.

**Still-open holes from the July list**, all confirmed by grep:

| Gap | Evidence | Why it matters |
|---|---|---|
| `venv` / `pip` / `requirements.txt` | `venv` 2 hits, `pip install` 1, both L3+ | A learner cannot install a package until L3. Every real job, tutorial, and CI config assumes this on day one. |
| Real HTTP consumption | `py-l3-rest-pydantic` is titled "preview"; `requests`/`urllib` 0 hits | Nothing is ever actually fetched. The most motivating early real-world task is absent. |
| `sqlite3` / DB-API | 0 hits | The Python-side bridge to your own SQL course does not exist. Parameterized queries and the injection lesson have no home. |
| Interactive debugging | `pdb` 0, `breakpoint` 0 | Tracebacks are taught to read; the actual debugging loop is not taught. "How do you debug?" is a standard interview question. |
| `datetime` depth | 1 mention; `strptime`/`timedelta` 0 | Naive-vs-aware bugs are a top production incident class. |
| Encoding / bytes / Unicode | ~0 | `UnicodeDecodeError` is one of the first walls beginners hit in real data work. |
| Writing files | `open(` 4 hits total; `write_text` 0 | File I/O is taught as reading only. |
| `pandas` / `numpy` | `pandas` 0; `numpy` 4 (one aside inside the GIL lesson) | Directly undercuts the DE-intern wedge the pitch already claims. |
| Smaller idioms | `itertools` 0, `match`/`case` 0, walrus 0, `namedtuple` 0, `TypedDict` 0, `DictReader` 0, `contextlib.contextmanager` 0, `multiprocessing` 0 | Individually minor; collectively a "this course stopped at 3.8" signal. |

---

## 4. Lens 2: hands-on

The instinct is right. The cause is more specific and much cheaper to fix than a rewrite.

**Finding 2.1 — The check widget is built, tested, proven, and authored into Python zero times.**
`lib/tutorials/widgets/` ships twelve interactive families behind a `cswidget` fence. The `check` family (predict-then-reveal MCQ, or classify-into-buckets, with mandatory per-option feedback that names why each wrong answer is tempting) appears **343 times in System Design and 0 times in Python and 0 times in SQL**. Nothing in `lib/markdown/components.tsx` restricts the fence by track. This is purely unauthored content, not a missing capability. Retrieval practice is the single best-evidenced intervention in learning science, and it is sitting unused on the track that needs it most.

**Finding 2.2 — The learner cannot run or edit a single example during Teach.**
Python's `demoCode` renders through `ReadOnlyCodeBlock` (`TeachPanel.tsx:138-144`). Pyodide is already warm in the browser. SQL's demo at least auto-runs. So Python has 54 code examples that a learner can read and cannot touch, in a browser that is already running a Python interpreter. There is also **no REPL or playground anywhere in `/learn`**: every code surface is either a graded exercise or a read-only block.

**Finding 2.3 — "Multi-file workspace" is one editable file.**
All 21 workspace exercises declare exactly one entry in `editableFilePaths`. Every one is a single function stub inside a pre-built repo. Both lessons named "capstone" are self-contained single functions; `py-l4-packaging-capstone` ships nine files and grades a six-line function. Nothing carries state between lessons, and there are no cross-lesson projects.

**Finding 2.4 — Learners cannot write tests.**
Test files carry `role: "test"` and are excluded from the editable set. "Write a test that catches this bug" is therefore unauthorable today. This is a load-bearing constraint for Lens 3, because verifying code you did not write is fundamentally a testing skill.

**Finding 2.5 — Prose-to-practice ratio.** 621 words of reading per lesson against two small functions. The authors' own estimates put it at 36% read / 64% do, but the "do" half is dominated by short stubs.

**Smaller asymmetries worth noting:** teach segmentation is on for System Design and Python but **never for SQL** (its `TeachPanel` call omits `lessonId`), so long SQL lessons are a wall of text. System Design has no hints field and no practice phase at all: its 208 free-response answers are graded by nothing, self-compared against a revealed model answer.

---

## 5. Lens 3: AI-era skills

### 5.1 The content finding

**The Python track contains zero AI material.** Grep across all four levels: `LLM` 0, `openai` 0, `anthropic` 0, `gpt` 0, `claude` 0, `embedding` 0, `vector` 0, "machine learning" 0, "prompt" 0 (the 111 `prompt` hits are the schema field), `agent` 0.

### 5.2 The structural finding, which matters more

Outside signal on 2026 junior hiring converges on four things employers now screen for: productive use of AI tools; **the ability to evaluate AI-generated code critically** (spot the mistake, the inefficiency, the vulnerability); communicating and explaining technical reasoning; and systems thinking over syntax recall.

The engine has **no primitive for grading a judgment about code**. It can grade "your code passes hidden tests" (Python, SQL) or "here is a model answer, compare yourself" (System Design, ungraded). There is no diff view, no annotate-a-line, no "which of these three solutions is wrong and why," no rubric-scored critique. So the platform structurally cannot assess the skill the market is now selecting for, in either direction: one track measures only the automated thing, the other measures nothing.

This is notable because **the rest of the product already knows this.** `docs/FUTURE-ENHANCEMENTS.md:465` names "AI-collaboration" as a Bug Fix rubric dimension. The Applied JS/React pack states the thesis outright: *"syntax is cheap; runtime behavior is the product. An AI writes the syntax."* The pitch one-liner is built on interviews moving from puzzles to "debug and extend this real codebase." Python is the oldest track, authored before that thesis existed, and it is the only track still fully committed to write-the-function-from-scratch.

### 5.3 The tutor absence

`SableTutor.tsx` is a 69-line locked placeholder rendering a padlock and "coming soon." There is no API route, no model, no chat. The plumbing is fully built and entirely unwired: the `SableEvent` union covers `phase | run | hint | reference | complete`, and `onHintReveal` / `onReferenceReveal` / `onRunResult` callbacks are declared and fired by the runners, but **no player passes them**. For a platform whose pitch is AI-native learning, the AI tutor being a padlock on every lesson page is the most conspicuous gap on the screen.

---

## 6. Lens 4: research-instrument readiness

This is the most severe finding, and the gap between what the platform claims and what it records is large.

### 6.1 What `/learn` actually stores

One document per lesson at `user_tutorial_progress/{uid}__{lessonId}`, **fully overwritten via `ref.set` on every save**, containing: three section statuses (`not_started | in_progress | completed`), a `lessonStatus`, timestamps, and `lastExerciseScore`.

**`lastExerciseScore` is hardcoded to `100`** (`LessonPlayer.tsx:143`), despite the type comment describing it as "% of tests passed." The one performance number in the entire Learn data model is a constant.

### 6.2 What is computed and thrown away

| Signal | Where it already exists | Where it goes |
|---|---|---|
| Attempts per exercise | `useExerciseRun.ts:61,106` (`useState`, incremented) | Discarded on unmount |
| Per-test expected / actual / error | `test-result-mapping.ts` | Rendered, then discarded |
| Hint reveals | `onHintReveal(index, total)` declared and fired | **No player subscribes.** Dead wiring |
| Reference-solution reveals | `onReferenceReveal()` fired | Same |
| Learner code | Prop only; no localStorage draft, no snapshot | Destroyed on unmount |
| Check-widget answers | `CheckWidget.tsx:14`, verbatim: *"retry freely. Nothing is graded, persisted, or gated."* | 343 misconception probes, zero rows |
| Time-on-task | Not measured at all | n/a |

The check widgets are the sharpest loss. Each one already encodes ground truth (`correct: true`) **and a per-distractor rationale explaining why that wrong answer is tempting**. That is a hand-labeled misconception taxonomy, generated 343 times, and every learner response to it is dropped on the floor.

### 6.3 The funnel is currently unanalyzable

Two events exist, `lesson_started` and `lesson_complete`, each carrying `{lessonId, levelId}`. Three properties make them unusable as evidence:

1. **Consent-gated with analytics defaulting to `false`** (`CookieConsent.tsx:21`, `trackEvent` early-returns at `analytics.ts:31`). Only opt-in users emit anything, so the missingness is non-random and biases any funnel estimate.
2. **No server sink.** They reach GA4 only. `analytics-server.ts` exists and writes to Firestore; `trackEvent` never calls it.
3. **No consumer.** `app/api/admin/funnel/route.ts` computes its funnel from `profiles` and `sessions` (the interview product) and does not read lesson events at all.

### 6.4 Two disconnected worlds

The platform has a genuinely research-grade instrument. `algorithm_research_events` writes one append-only document per review with full pre/post scheduler state, predicted-versus-actual retention, quality rating, hints, and the serialized FSRS card. `learner_model_events` and `learner_model_challenges` add condition-stamped inspect/challenge/correct logging with falsifiable verification. This is the instrument the RA pitch is built on, and it is real.

**It is wired exclusively to `/practice` and `/knowledge`.** No file under `app/learn`, `components/tutorials`, or `lib/tutorials` appears in a grep for the learner model. Completing `py-l1-recursion` creates no card, emits no evidence, and updates no belief. There is no shared item id and no shared skill vocabulary between the two worlds.

Two consequences follow:

- **The "resurfaces" chip shown on the Practice section is copy only** (`LessonPlayer.tsx:312`). Lessons never enter spaced repetition. This is user-facing text that describes behavior the system does not have.
- **`TutorialLesson.skills[]` exists but is display-only.** It is free-form strings, rendered as chips, never written to progress, never on an event, with no controlled vocabulary and no bridge to the controlled `DSAPattern` enum the SR side uses. There is no knowledge-component layer, so no knowledge tracing (BKT, DKT, AFM) is derivable from Learn at all.

### 6.5 Research-readiness gap table (for `/learn`)

| Capability | Status |
|---|---|
| Item-level response logging | **Absent** |
| Knowledge-component tagging | **Partial** (authored strings, never bound to anything) |
| Time-on-task | **Absent** |
| Error-taxonomy capture | **Absent** (per-distractor rationale exists and is unrecorded) |
| Code edit / run history | **Absent** |
| Knowledge-tracing inputs | **Absent** (single overwritten scalar per lesson) |
| Experiment assignment for Learn | **Absent** (no Learn experiment exists) |
| De-identified export | **Absent** for Learn; the SR export emits **raw `user_id`**, and `admin/research/users` returns email and full name |
| Research consent surface | **Absent.** Only a cookie banner. `RESEARCH-MEMO.md` describes a live between-subjects field study with no consent, no data-use disclosure, no opt-out, and no debrief anywhere in the app |

The consent gap is the one to take seriously before a university pitch: the memo already describes the deployment as a running field study.

---

## 7. The strategic tension, stated honestly

The pitch council's standing directive is that public launch happens by Aug 25 and that "anything that doesn't move users, WCSR, or retention is procrastination dressed as engineering." The launch-priorities review reinforced it: stop polishing, ship.

A full AI-era curriculum rebuild directly violates that, and should not be started now.

But the directive and this audit agree on one specific slice. **Instrumentation is the exception, because learning data cannot be backfilled.** Launching without item-level logging means the first cohort, which is also the cohort the pitch depends on, produces status flags and nothing else. And the November recruiting dip is precisely when Learn becomes the retention surface that has to carry the WCSR story, which is the moment the data would be needed.

---

## 8. Ranked recommendation

### Tier 0 — before launch. Small, and expires if deferred.

1. **Append-only `learn_item_responses`**, mirroring the `algorithm_research_events` conventions already proven here (deterministic id, undefined-stripping, never throws). Capture per exercise attempt: pass/fail, attempt index, per-test expected/actual/error, latency; per check-widget answer: selected option, correctness, retry count; hint and reference reveals (the callbacks already fire and just need a subscriber). Blocking prerequisite: **check widgets currently have no `id` field**, so ids must be added to the schema first.
2. **Fix `lastExerciseScore`.** Persist the real pass rate instead of the hardcoded `100`. It is a data-integrity bug that would silently poison every downstream analysis.
3. **Give the funnel a server sink**, so the curve shown to a judge is queryable and not silently filtered to analytics opt-ins.
4. **Add a research consent and data-use surface.** Required before field data can be used in a university context, and cheap.

### Tier 1 — cheap hands-on wins, mostly authoring, little or no new engine code.

5. **Author `check` widgets into Python.** Best cost-to-value item on this list. Zero engine work, 343 instances of working precedent, and once Tier 0 lands, every check becomes a labeled item response with a misconception tag. The 70 existing `**Interview nuance:**` paragraphs are ready-made check prompts.
6. **Make Python teach demos runnable and editable.** Pyodide is already warm and SQL already runs its demo; this converts 54 dead code blocks into experiments.
7. **Turn on teach segmentation for SQL** (one prop, already on for the other two tracks).
8. **Author `extraPractice` drills for Python** (currently 0; the renderer and type already work).

### Tier 2 — the AI-era thesis. Post-launch, needs real design.

9. **A judgment-about-code exercise type.** The structural gap. The cheapest credible version reuses machinery you already have: present AI-produced solutions, have the learner identify which is wrong and why (gradable through the existing MCQ check), then repair it (gradable through the existing test runner). This is also the natural bridge from Learn into the bug-fix packs the pitch is built on.
10. **Make test files editable** so "write the test that catches this" becomes authorable. This is the prerequisite for teaching verification-of-code-you-did-not-write, which is the durable AI-era skill.
11. **A Python "working with AI" module**, framed on durable skills rather than prompt tips that age badly: reading and verifying unfamiliar code, specifying precisely, testing as the verification layer, recognizing confident wrongness, and one genuine "call an LLM API and handle its failures" lesson (you have real in-house material from the Gemini/DeepSeek fallback chain).
12. **Fill the cheap job-skill holes**: `venv`/`pip`, a real HTTP fetch, `sqlite3` as the bridge to the SQL course, `datetime` depth, encoding and bytes, writing files, `breakpoint()`.
13. **Optional `pandas`/`numpy` module**, as a track rather than a gate. Directly supports the DE-intern wedge the pitch already claims. Pyodide supports both.

### Tier 3 — bigger bets, only with evidence.

14. **Wire lessons into spaced repetition.** Removes a user-facing claim that is currently untrue and gives the FSRS A/B a second, very different task type. Requires a controlled knowledge-component vocabulary bridging `skills[]` and `DSAPattern`.
15. **Extend the open learner model to Learn.** The strongest research upgrade available: the same validated inspect/challenge/correct instrument across two task types (interview practice and curriculum) is a far better paper than a second instrument built from scratch. Depends on 1 and 14.
16. **Build Sable**, starting with error explanation on a failed run, which is the highest-value and most-scoped version.
17. **Multi-step lessons and cross-lesson projects.** Real engine work; defer until item-level data shows where learners actually stall.

### Things not to do

- Do not rebuild the Python curriculum from scratch. Breadth is fine and 7 of 8 previously identified gaps are closed.
- Do not add prompt-engineering-tips content. It ages in months and reads as gimmick next to a rigorous track.
- Do not start Tier 2 or 3 before the launch date. Tier 0 is the only pre-launch claim in this document, and it is small.

---

## 9. The research framing worth keeping

For a lab-and-platform hybrid, the sharpest available story is not "we built a learning platform." It is this: the platform already runs a validated open learner model with contestability and falsifiable correction, and extending it across a second, structurally different task type would let it study whether learners' self-knowledge calibration transfers between recall-style practice and curriculum learning.

The check-widget dataset is the concrete near-term asset. Hand-authored distractors, each carrying an explicit rationale for why it tempts, answered at scale, is a misconception-tracing dataset with labels already attached. It costs one schema field and one collection to start collecting, and it cannot be recovered later.

---

## 10. What shipped (2026-08-02)

Implemented the same day the audit was written. Ordered by the tier above.

### Tier 0, complete

| Item | What landed |
|---|---|
| Item-level logging | `learn_item_responses`, append-only, one immutable row per learner action. Records exercise runs (with the failing assertions and a coarse `error_kind` bucket), check answers (with **which distractor fired**), hint and reference reveals, and ungraded demo runs. Conventions mirror `algorithm_research_events` so the two logs are joinable. Firestore rules deny all client writes. |
| Blocking prerequisite | `check` widgets gained an optional stable `id`. Optional so the pre-existing System Design checks need no rewrite: `checkItemId()` falls back to a prompt hash, which changes if the prompt is reworded, correctly treating that as a different item. |
| `lastExerciseScore` | No longer the literal `100`. Persists the real pass rate. |
| Funnel | Made analyzable by a different and better route than proposed: rather than adding a server sink for the consent-gated GA4 events, the funnel is now computed from `user_tutorial_progress`, which is written server-side for every signed-in learner and is therefore neither consent-filtered nor client-droppable. |
| Consent | `user_research_consent` plus a plain-language control in account settings. Encodes the honest split: running the product records answers either way because it needs them; **using** that record as research requires opt-in. Consent is stamped on every row at write time, not joined at export, because it is a fact about the moment of observation. |

### Tier 1, complete

- **~191 checks authored into Python L1 to L4** (L1 57, L2 51, L3 43, L4 40), every lesson covered, each distractor carrying hand-written rationale. A content guard (`python-checks.test.ts`) enforces stable unique ids, a 40-character floor on feedback, a per-lesson ceiling, and no em dashes.
- **Python teach demos are runnable and editable** (`PythonDemoRunner`), on the Pyodide runtime the graded exercises already used. Ungraded and resettable.
- **SQL teach sections now segment** like the other two tracks (the player was never passing `lessonId`).

### Tier 2, in progress

- **Level 5, the AI-era module**, authored as a new level: judging and verifying code you did not write. Gradeable on the existing harness through four exercise patterns (find the breaking input, write the predicate that separates a correct implementation from a buggy one, repair generated code, classify the failure) rather than by asking for more from-scratch functions.
- **Gap-filling lessons** for venv/pip, interactive debugging, ternary/unpacking/`match`, datetime, encoding and bytes, writing files, HTTP/JSON, `sqlite3`, and an optional numpy/pandas data module.
- **Correction to §5.2:** making test files editable needs no engine change. `isEditable()` already honours `editableFilePaths`, so a "write the test that catches this" exercise is authorable today; it was an authoring gap, not a capability gap.

### Tier 3 prerequisite, complete

- **Controlled knowledge-component vocabulary** (`knowledge-components.ts`): 27 canonical components with a synonym map, applied at write time so authored `skills` chips stay untouched. A coverage test fails when a new lesson introduces an unmapped skill, which it has already caught several times.

### Beyond the audit

- **The consumer layer**, so this is not a second write-only store: per-check difficulty with the distractor distribution, per-exercise struggle (attempts to pass, hint reliance, dominant error kinds), and the lesson funnel. Plus an admin page and a **consent-gated, pseudonymized CSV export**. Check difficulty counts each learner once at their first commit, because checks are retryable and eventual-correct converges on 100% for every item.
- **A de-identification bug caught by its own test:** the doc id is composed as `userId_itemId_epochMs`, so stripping `user_id` alone still exported the raw uid inside the row's primary key. Export now drops both.
- **A duplicated verdict fixed at render:** the widget prints "Correct." and the authoring convention opens feedback with "Right.", so learners read the verdict twice across ~400 checks. Stripped at render rather than by rewriting content.

### Correction to this document

§6.4 claimed the Practice "resurfaces" chip is "copy describing behavior the system does not have." That overstated it. The rendered text is **"Repetition locks it in"**, a true general statement about learning, not a promise that the platform will schedule a review. The underlying finding stands (lessons still do not enter spaced repetition) but no user-facing text is dishonest, and no copy change was made.

### Still open

Lessons into spaced repetition (the vocabulary prerequisite is now in place), extending the open learner model to Learn, and Sable, which remains a locked placeholder.
