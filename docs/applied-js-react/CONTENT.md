# Applied JavaScript & React: CONTENT (the authoring hub)

> Part of the **[Applied JS & React curriculum pack](./README.md)**.
> Connected files: [README](./README.md) · [ARCHITECTURE](./ARCHITECTURE.md) · [CURRICULUM-MAP](./CURRICULUM-MAP.md) · [curriculum-map.json](./curriculum-map.json) · [RESEARCH](./RESEARCH.md) · [AGENT-1 (engineer)](./AGENT-1-engineer.md) · [AGENT-2 (content /loop)](./AGENT-2-curriculum-developer.md)

This file is the **content hub**. It (1) defines the **lesson format contract** every authored lesson follows, (2) indexes **every module to its authored content file** under [`content/`](./content/) (one file per module, named `content/l{levelId}-{moduleSlug}.md`), and (3) tells the shipping loop (**AGENT 2**) the read order and where each lesson's source lives vs. where the lesson object gets written.

The thesis of this course: **syntax is cheap, nuance is the moat.** These are things you cannot just read and learn, you have to SEE them happen. So the pedagogy is **Learn → See it live → Apply**, and every lesson carries a runnable/observable demo.

---

## How the pack files connect (read this first)

```
README.md ─────────────── entry point: thesis, level table, build plan
   │
   ├── ARCHITECTURE.md ──► the engine to BUILD: reuses the system-design free-response answer panel
   │                        + persistence AND adds the LIVE-DEMO subsystem (JS web-worker runner that
   │                        captures console + timing; authored React demo-widget registry; LiveDemoPanel).
   │                        AGENT-1 implements this.
   │
   ├── CURRICULUM-MAP.md ─► the TAXONOMY: every level → module → lesson with learnFocus, liveDemo
   │      │                 (kind + what it visualizes), applyPrompt, thinkAbout, modelAnswerOutline.
   │      └── curriculum-map.json  (same map, machine-readable — the field-level contract)
   │
   ├── CONTENT.md (this file) ─► the HUB: format contract + index into content/
   │      └── content/l{level}-{moduleSlug}.md × 58 ─► the FULL authored lessons
   │                                        (Learn + See it live + Apply + Practice + model answers)
   │
   ├── RESEARCH.md ───────► the web-grounded research (nuance taxonomy + canonical buggy code)
   │
   ├── AGENT-1-engineer.md ──► "read ARCHITECTURE.md, build the live-demo + answer machinery + 1 proof lesson"
   └── AGENT-2-curriculum-developer.md ──► "read CONTENT.md + content/*.md + curriculum-map.json,
                                            author lessons continuously (no waiting)"
```

**Dependency direction:** `ARCHITECTURE` defines the shape (exercise + live-demo) the content must fit → `CURRICULUM-MAP` fixes scope, ids, prompts, demos, and model-answer outlines → `CONTENT` + `content/*.md` expand that into full teaching prose + runnable demos → `AGENT-2` turns each `content/*.md` lesson into a lesson object in code. Each `content/*.md` file opens with a nav header linking back up to this file, to `CURRICULUM-MAP.md`, and to its previous/next module.

---

## Course shape

- **163 lessons · 58 modules · 12 levels (L0–L11).** Zero-to-hero on the deep nuance space of JS/React: runtime & event loop, closures/identity, async concurrency correctness, race conditions, immutability, the re-render model, effects, data fetching, performance, leaks/forms, TypeScript-in-React, and production/RSC.
- **Every lesson has a live demo** (52 pure-JS runnable, 111 React demos). The learner reads the nuance, RUNS the demo and WATCHES the behavior (a timing-bar comparison, a render-count badge, a race firing, a leak still logging), then Applies.
- **No code auto-grading.** Apply/Practice are free-response reasoning about code: read, think, write the diagnosis/prediction/fix, save, reveal the model answer (with corrected code) to self-compare. The demo is for *observing*, not grading.
- `content/*.md` is the source of truth for prose + demos; `curriculum-map.json` is the source of truth for structure (ids, ordering, `liveDemo`, `thinkAbout`, `modelAnswerOutline`). Never invent, rename, or reorder a lesson id.

---

## Lesson format contract (every lesson in `content/` follows this exactly)

Author each lesson as one section in its module's `content/l{level}-{moduleSlug}.md` file, in the map's order:

```markdown
### <lessonId>: <Lesson Title>

- **id:** `<lessonId>`  ·  **difficulty:** easy|medium|hard  ·  **est:** N min  ·  **demo:** js-runnable|react-demo  ·  **skills:** a, b, c

#### Learn
<A self-contained, senior-engineer write-up that expands the map's `learnFocus` around a CONCRETE code
example. Real APIs, real symptoms. A learner who read ONLY this can attempt the Apply. Short "Interview
nuance:" asides where the nuance is commonly probed. End with a one-line "Recap:".>

#### See it live
**Demo (<kind>):** <one line on what runs>

<For a js-runnable demo: the ACTUAL self-contained runnable JS the worker will execute, using console.log
and timing (Date-free where possible; use performance.now() inside the snippet). When the nuance is a
contrast, include TWO clearly labeled variants (e.g. "// A) sequential" and "// B) Promise.all") so the
runner can show them side by side.
For a react-demo: describe the widget precisely (what it renders, what the learner interacts with) and
include the small code snippet the widget is built around, so the engineer can author the component.>

**Watch:** <exactly what the learner observes and what it proves: "the sequential bar is ~2000ms, the
Promise.all bar ~120ms", "the render-count badge ticks on every keystroke until the memo is fixed", "the
slow first response overwrites the fast second, rendering the wrong user".>

#### Apply: think, then answer (save, then reveal)
**Prompt:** <the map's applyPrompt, leading with the deliverable and referencing the code.>

**Think about:**
- <each thinkAbout item from the map>

> Write your answer (diagnosis / prediction / fix + why), save it, then reveal the model answer.

**Model answer (revealed on demand):**
<Strong reference answer built from the map's modelAnswerOutline. MUST: give the corrected code, explain
WHY at the runtime/React-mechanism level (event loop, referential identity, closure capture, reconciliation),
say HOW to spot it in code review, name the PRODUCTION SYMPTOM, and correct one common misconception.>

**Self-check rubric:**
- [ ] <3-6 concrete checks>

#### Practice: real-world variant (save, then reveal)
**Prompt:** <a harder or higher-scale twist on the same nuance, framed as a named real-world scenario.>

**Model answer (revealed on demand):**
<Same quality bar as Apply.>
```

### Style rules (enforced on every lesson)
- **Lead with the deliverable** in every prompt: "Predict what this logs and explain the ordering", "Find the race condition and fix it", "Rewrite this to run concurrently and say why the original was slow".
- **NO em dashes** in learner-facing prose. Use commas, colons, periods, parentheses.
- **Every lesson centers on concrete code AND a live demo.** No abstract description without something to run/watch.
- Be honest about demos: if a demo approximates a build-time behavior (e.g. the React Compiler) or a compile-time flag (TypeScript strictness), say so in the Watch line. Do not claim "live" for something illustrated.
- Model answers stand on their own: corrected code + mechanism + how-to-spot + production symptom.

---

## The 163-lesson index (module → authored content file)

Lesson ids, `liveDemo`, `thinkAbout`, and `modelAnswerOutline` for each module live in [`CURRICULUM-MAP.md`](./CURRICULUM-MAP.md) and [`curriculum-map.json`](./curriculum-map.json). Author files in this order.

### L0 · How JavaScript Actually Runs: 3 modules · 13 lessons
| Module | Lessons | Authored content |
|--------|--------:|------------------|
| `0.1` The Runtime Model & Blocking | 4 | [content/l0-call-stack-event-loop.md](./content/l0-call-stack-event-loop.md) |
| `0.2` Microtasks vs Macrotasks | 6 | [content/l0-task-queues.md](./content/l0-task-queues.md) |
| `0.3` What async/await Actually Does | 3 | [content/l0-async-await-desugar.md](./content/l0-async-await-desugar.md) |

### L1 · Closures, Scope, References & Identity: 5 modules · 14 lessons
| Module | Lessons | Authored content |
|--------|--------:|------------------|
| `1.1` Closures & Capture | 4 | [content/l1-closures-capture.md](./content/l1-closures-capture.md) |
| `1.2` References, Value & Identity | 4 | [content/l1-references-identity.md](./content/l1-references-identity.md) |
| `1.3` this Binding | 2 | [content/l1-this-binding.md](./content/l1-this-binding.md) |
| `1.4` Equality & Coercion | 2 | [content/l1-equality-coercion.md](./content/l1-equality-coercion.md) |
| `1.5` Hoisting & the TDZ | 2 | [content/l1-hoisting-tdz.md](./content/l1-hoisting-tdz.md) |

### L2 · Asynchronous JavaScript Done Right: 5 modules · 14 lessons
| Module | Lessons | Authored content |
|--------|--------:|------------------|
| `2.1` Waterfalls & Parallelism | 3 | [content/l2-waterfalls-parallelism.md](./content/l2-waterfalls-parallelism.md) |
| `2.2` Promise Combinators & Partial Failure | 3 | [content/l2-promise-combinators.md](./content/l2-promise-combinators.md) |
| `2.3` Concurrency Control | 2 | [content/l2-concurrency-control.md](./content/l2-concurrency-control.md) |
| `2.4` Cancellation & Error Handling | 4 | [content/l2-cancellation-errors.md](./content/l2-cancellation-errors.md) |
| `2.5` Debounce & Throttle | 2 | [content/l2-debounce-throttle.md](./content/l2-debounce-throttle.md) |

### L3 · Race Conditions & Correctness Over Time: 4 modules · 10 lessons
| Module | Lessons | Authored content |
|--------|--------:|------------------|
| `3.1` Last-Response-Wins | 3 | [content/l3-out-of-order-responses.md](./content/l3-out-of-order-responses.md) |
| `3.2` Double-Submit & Idempotency | 2 | [content/l3-double-submit-idempotency.md](./content/l3-double-submit-idempotency.md) |
| `3.3` Check-Then-Act & Dedup | 3 | [content/l3-toctou-dedup.md](./content/l3-toctou-dedup.md) |
| `3.4` Optimistic Updates & Tearing | 2 | [content/l3-optimistic-tearing.md](./content/l3-optimistic-tearing.md) |

### L4 · Data, Immutability & State Shape: 3 modules · 12 lessons
| Module | Lessons | Authored content |
|--------|--------:|------------------|
| `4.1` Mutation React Misses | 4 | [content/l4-mutation-invisible.md](./content/l4-mutation-invisible.md) |
| `4.2` Copy Semantics | 4 | [content/l4-copy-semantics.md](./content/l4-copy-semantics.md) |
| `4.3` State Shape & Sharing | 4 | [content/l4-state-shape-sharing.md](./content/l4-state-shape-sharing.md) |

### L5 · The React Rendering Model: 5 modules · 14 lessons
| Module | Lessons | Authored content |
|--------|--------:|------------------|
| `5.1` What Triggers a Re-render | 3 | [content/l5-render-triggers.md](./content/l5-render-triggers.md) |
| `5.2` Referential Equality & memo | 3 | [content/l5-referential-equality-memo.md](./content/l5-referential-equality-memo.md) |
| `5.3` State Updates & Batching | 3 | [content/l5-state-batching.md](./content/l5-state-batching.md) |
| `5.4` Reconciliation & Keys | 3 | [content/l5-reconciliation-keys.md](./content/l5-reconciliation-keys.md) |
| `5.5` StrictMode & Render Loops | 2 | [content/l5-strictmode-loops.md](./content/l5-strictmode-loops.md) |

### L6 · useEffect & Hooks: 5 modules · 12 lessons
| Module | Lessons | Authored content |
|--------|--------:|------------------|
| `6.1` The Dependency Array | 3 | [content/l6-dependency-array.md](./content/l6-dependency-array.md) |
| `6.2` Cleanup & Races | 3 | [content/l6-cleanup-races.md](./content/l6-cleanup-races.md) |
| `6.3` When NOT to Use an Effect | 2 | [content/l6-avoid-effects.md](./content/l6-avoid-effects.md) |
| `6.4` Refs & Timing | 2 | [content/l6-refs-timing.md](./content/l6-refs-timing.md) |
| `6.5` useEffectEvent & Custom Hooks | 2 | [content/l6-effect-event-custom-hooks.md](./content/l6-effect-event-custom-hooks.md) |

### L7 · Data Fetching in React: 6 modules · 13 lessons
| Module | Lessons | Authored content |
|--------|--------:|------------------|
| `7.1` Waterfalls & N+1 | 2 | [content/l7-waterfalls-n-plus-1.md](./content/l7-waterfalls-n-plus-1.md) |
| `7.2` Races & States | 3 | [content/l7-fetch-races-states.md](./content/l7-fetch-races-states.md) |
| `7.3` Caching, Dedup & SWR | 3 | [content/l7-caching-swr.md](./content/l7-caching-swr.md) |
| `7.4` Mutations | 1 | [content/l7-mutations-optimistic.md](./content/l7-mutations-optimistic.md) |
| `7.5` Suspense & use() | 2 | [content/l7-suspense-use.md](./content/l7-suspense-use.md) |
| `7.6` RSC Fetching | 2 | [content/l7-rsc-fetching.md](./content/l7-rsc-fetching.md) |

### L8 · Performance & Re-render Optimization: 6 modules · 16 lessons
| Module | Lessons | Authored content |
|--------|--------:|------------------|
| `8.1` Diagnosis | 2 | [content/l8-diagnosing-renders.md](./content/l8-diagnosing-renders.md) |
| `8.2` Memo Economics | 4 | [content/l8-memo-economics.md](./content/l8-memo-economics.md) |
| `8.3` Composition Over Memo | 2 | [content/l8-composition-colocation.md](./content/l8-composition-colocation.md) |
| `8.4` Context & Stores | 2 | [content/l8-context-selectors.md](./content/l8-context-selectors.md) |
| `8.5` Big Lists & Transitions | 3 | [content/l8-virtualization-transitions.md](./content/l8-virtualization-transitions.md) |
| `8.6` Code Splitting & Bundle | 3 | [content/l8-code-splitting-bundle.md](./content/l8-code-splitting-bundle.md) |

### L9 · Memory Leaks, Lifecycle, Forms & Events: 5 modules · 13 lessons
| Module | Lessons | Authored content |
|--------|--------:|------------------|
| `9.1` Leaks: Timers & Subscriptions | 4 | [content/l9-timer-subscription-leaks.md](./content/l9-timer-subscription-leaks.md) |
| `9.2` Retained Memory & Unmount | 2 | [content/l9-retained-memory.md](./content/l9-retained-memory.md) |
| `9.3` Controlled Inputs | 3 | [content/l9-controlled-inputs.md](./content/l9-controlled-inputs.md) |
| `9.4` Events & Submit | 2 | [content/l9-events-submit.md](./content/l9-events-submit.md) |
| `9.5` Forms & Focus | 2 | [content/l9-forms-focus-a11y.md](./content/l9-forms-focus-a11y.md) |

### L10 · TypeScript in Real React: 6 modules · 20 lessons
| Module | Lessons | Authored content |
|--------|--------:|------------------|
| `10.1` UI State Types | 3 | [content/l10-discriminated-unions.md](./content/l10-discriminated-unions.md) |
| `10.2` Trust Boundaries | 4 | [content/l10-unknown-guards.md](./content/l10-unknown-guards.md) |
| `10.3` Generics in Components | 3 | [content/l10-generics-components.md](./content/l10-generics-components.md) |
| `10.4` Typing the Surface | 4 | [content/l10-typing-props-refs.md](./content/l10-typing-props-refs.md) |
| `10.5` Strictness Flags | 3 | [content/l10-strictness-flags.md](./content/l10-strictness-flags.md) |
| `10.6` Real-World Types | 3 | [content/l10-real-world-types.md](./content/l10-real-world-types.md) |

### L11 · Production-Grade React & Architecture: 5 modules · 12 lessons
| Module | Lessons | Authored content |
|--------|--------:|------------------|
| `11.1` RSC & the Serialization Boundary | 3 | [content/l11-rsc-boundary.md](./content/l11-rsc-boundary.md) |
| `11.2` Hydration & Streaming | 2 | [content/l11-hydration-streaming.md](./content/l11-hydration-streaming.md) |
| `11.3` Concurrency in Production | 2 | [content/l11-concurrency-production.md](./content/l11-concurrency-production.md) |
| `11.4` State Architecture | 2 | [content/l11-state-architecture.md](./content/l11-state-architecture.md) |
| `11.5` Reliability & Testing | 3 | [content/l11-reliability-testing.md](./content/l11-reliability-testing.md) |

---

## For AGENT 2 (the shipping `/loop`): where each thing lives

- **Structure / ids / ordering / liveDemo / thinkAbout / modelAnswerOutline:** [`curriculum-map.json`](./curriculum-map.json) (machine) and [`CURRICULUM-MAP.md`](./CURRICULUM-MAP.md) (human). Copy lesson ids verbatim.
- **Full authored prose + demos for a lesson:** `content/l{level}-{moduleSlug}.md` for the module (see the index above).
- **The type + player + live-demo + persistence the object must satisfy:** built by AGENT 1 per [`ARCHITECTURE.md`](./ARCHITECTURE.md).
- **Where compiled lesson objects go:** `lib/tutorials/applied-js-react/curriculum/levelN/`, registered through the applied-js-react registry.

Author lessons **continuously, back to back with no waiting**, in curriculum order: for each lesson verify it renders, the live demo runs and visualizes the nuance, and the save/reveal works with a high-quality model answer, commit, then immediately continue to the next in the same turn. Stop when every lesson in this index has a rendering lesson object.
