# Applied JavaScript & React — curriculum pack

> Connected files: [README](./README.md) · [ARCHITECTURE](./ARCHITECTURE.md) · [CURRICULUM-MAP](./CURRICULUM-MAP.md) · [curriculum-map.json](./curriculum-map.json) · [CONTENT](./CONTENT.md) · [RESEARCH](./RESEARCH.md) · [AGENT-1](./AGENT-1-engineer.md) · [AGENT-2](./AGENT-2-curriculum-developer.md)

A **zero-to-hero course on the JavaScript and React nuances that separate someone who can write code
from someone who knows what happens at runtime.** It runs on the **existing Learn engine** (same content
tree, registry, progress collection, 3-column Lesson Player, and lesson-player routing) — Applied JS &
React is *another course plugged into that engine*, not a second engine. This folder is the planning +
authoring pack; it mirrors `docs/system-design-curriculum/` and `docs/sql-curriculum/` so the courses read
the same way.

> **Design thesis: syntax is cheap; runtime behavior is the product.** An AI writes the syntax. What a
> tutorial cannot hand you is the *runtime mental model* and the *production failure modes* you only
> understand once you have SEEN them: where the event loop actually yields, a race firing under fast
> input, the extra re-renders, the stale closure freezing a counter, the N+1 waterfall, the memory leak
> growing across mounts. So every lesson makes the nuance **visible** — you run a live demo and watch the
> behavior — before you diagnose or fix it. This is a *reuse-plus* course: it **reuses the system-design
> course's free-response answer machinery** (the answer panel, save, and reveal-the-model-answer flow —
> because Apply here is un-graded reasoning, not a code test) and **ADDS one genuinely new subsystem: a
> live-demo runner** that renders an embedded, runnable JS or React demo inline in the lesson so the
> learner can press Run and observe the timing, the race, the wasted renders, or the leak with their own
> eyes. That demo subsystem is the new code; everything else — level/module/lesson types, registry,
> progress writes, Lesson Player shell, routing, auth-gating, the answer panel and reveal — is the same
> machinery the other courses already use.

## What's in this folder

| File | What it is |
|------|------------|
| [`README.md`](./README.md) | This file — the pack overview, level table, interaction model, and build plan. |
| [`CURRICULUM-MAP.md`](./CURRICULUM-MAP.md) | The authoritative **content contract** — every level → module → lesson with its `learn` nuance, the `See it live` demo spec (kind + what to watch), the `applyPrompt`, `thinkAbout` questions, and `modelAnswerOutline`. Lesson ids are stable and must not change. |
| [`curriculum-map.json`](./curriculum-map.json) | The machine-readable form of the map — the same taxonomy as a JSON the content author iterates over one lesson at a time. |
| [`content/`](./content/) | Per-level authored content as it is expanded from the map into shippable lesson objects, each with its live-demo module. Populated by the curriculum author. |
| `ARCHITECTURE.md` | **Technical spec** (to be written by the engineer) — the reuse-vs-build map, the new live-demo runner subsystem (the sandbox/iframe that runs the `js-runnable` and `react-demo` demos), how it composes with the reused free-response answer panel + reveal, the lesson shape, UI/persistence/route reuse, build order, and Definition of Done. Mirrors the system-design `ARCHITECTURE.md`. |
| `RESEARCH.md` | The rationale behind the topic taxonomy — the runtime nuances and production failure modes (event loop, async correctness, races, re-render economics, effect gotchas, memory leaks, TypeScript-at-runtime) that recur in real code review and interviews. |
| `AGENT-1-engineer.md` | **Ship-the-spec prompt** — a copy-paste runbook for the engineering agent that builds the live-demo runner, wires it into the reused answer panel + reveal flow, adds the lesson type/registry/routes/auth, and ships two proof lessons (one `js-runnable`, one `react-demo`) end-to-end. |
| `AGENT-2-curriculum-developer.md` | **Curriculum-author prompt** — a `/loop` runbook that authors all lessons from the map into shippable lesson objects, one per iteration. Run after AGENT 1. |

## The twelve levels (same Learn → See it live → Apply spine at increasing depth)

| Lvl | Title | Modules | Lessons | What the learner can catch after it |
|----:|-------|--------:|--------:|-------------------------------------|
| L0 | **How JavaScript Actually Runs** | 3 | 13 | The event loop (browser and Node), run-to-completion, and where async/await actually yields, made visible. |
| L1 | **Closures, Scope, References & Identity** | 5 | 14 | The silent bug sources: stale captures, shared-reference mutation, `this` binding, coercion, and the TDZ. |
| L2 | **Asynchronous JavaScript Done Right** | 5 | 14 | The flagship async lessons: waterfalls, combinators, bounded concurrency, cancellation, modern primitives, and debounce/throttle. |
| L3 | **Race Conditions & Correctness Over Time** | 4 | 10 | Watch races fire: last-response-wins, double-submit, TOCTOU, dedup, optimistic rollback, and tearing. |
| L4 | **Data, Immutability & State Shape** | 3 | 12 | Why React misses your change: `Object.is` bail-out, shallow copies, mutating methods, structural sharing, derived state. |
| L5 | **The React Rendering Model** | 5 | 14 | Make re-renders visible: triggers, render vs commit, memo defeats, batching, reconciliation, keys, StrictMode. |
| L6 | **useEffect & Hooks** | 5 | 12 | The deepest nuance area: the dependency contract, cleanup races, when NOT to use an effect, refs, timing, and `useEffectEvent`. |
| L7 | **Data Fetching in React** | 6 | 13 | N+1, waterfalls, and races in the wild: cancellation, caching/SWR, optimistic rollback, Suspense, RSC. |
| L8 | **Performance & Re-render Optimization** | 6 | 16 | Measure before memoizing: diagnose wasted renders, memo economics, composition, context, virtualization, bundle. |
| L9 | **Memory Leaks, Lifecycle, Forms & Events** | 5 | 13 | The leaks and input traps that only show in real use: orphaned timers/subscriptions, controlled inputs, double-submit, focus. |
| L10 | **TypeScript in Real React** | 6 | 20 | Type nuances that bite at runtime: discriminated unions, `unknown` vs `any`, guards, generics, and where casts hide crashes. |
| L11 | **Production-Grade React & Architecture** | 5 | 12 | RSC boundaries, hydration, streaming, tearing, state architecture, race-safe mutations, and testing the nuances. |

**12 levels, 58 modules, 163 lessons total.** Every lesson ships with a live demo: **52 pure-JS runnable
demos, 111 React demos, and 0 lessons without a demo.** There is no code auto-grading anywhere in the
course — the demo is for *observing* behavior, and Apply is Learn → free-response reasoning that the
learner self-compares against a model answer.

## Interaction model — "Learn → See it live → Apply"

Every lesson is three beats. The middle beat — the live demo — is the whole point of the course: the
nuance is not asserted, it is shown, and then the learner reasons about what they saw.

1. **Learn** — read the nuance in a concrete voice: the corrected mental model, the mechanism, and the
   production symptom it causes.
2. **See it live** — press Run on an embedded demo (`js-runnable` for pure-JS timing/ordering/memory, or
   `react-demo` for renders/effects/races) and **watch the behavior**: the stack-depth meter that stays
   non-empty through a sync block, the two timing bars for a waterfall vs `Promise.all`, the re-render
   counter spinning on every keystroke, the counter frozen by a stale closure, the heap bar that stays
   high because a closure pinned it. Each demo names exactly what to watch and usually pairs the buggy
   behavior with the fixed one side by side.
3. **Apply** — with the behavior fresh, the learner answers a free-response prompt that leads with the
   deliverable ("Predict the exact log order…", "Explain why the spinner never appears and rewrite it…",
   "Fix this stale-closure counter three ways and say which you would ship…"), works through the
   `thinkAbout` questions, **saves** the answer (persisted to the same progress collection the other
   courses write to, so it survives reload), then **reveals** the model answer and self-compares: did
   they name the mechanism, the fix, what to spot in review, and the misconception to avoid?

This mirrors how the nuance actually lands in real work: you do not internalize "await always yields" or
"memo bails on `Object.is`" from prose — you internalize it once you have watched the ordering flip or the
render count move, then explained it in your own words against a strong reference.

## How to build it — two agents

Mirrors how the SQL and system-design courses were built (an engineer, then a curriculum author):

1. **Engineer** — paste `AGENT-1-engineer.md`'s prompt into a fresh Claude Code session. It follows
   `ARCHITECTURE.md` (live-demo-runner-first thin slice → compose it with the reused free-response answer
   panel + reveal → generalize the lesson type → registry/routes/auth → UI polish) and ships the
   live-demo subsystem with two proof lessons end-to-end — one `js-runnable`, one `react-demo`. The new
   code is the demo runner/sandbox component plus the lesson type and a few lines of union/dispatch
   widening; the answer panel, save, reveal, routing, and auth-gating are reused from the system-design
   course.
2. **Curriculum author** — once AGENT 1 is green, run `AGENT-2-curriculum-developer.md` with `/loop` to
   author all lessons from `CURRICULUM-MAP.md` / `curriculum-map.json` into shippable lesson objects, one
   per iteration, each rendering correctly through the Lesson Player: Learn reads, the demo runs and shows
   the documented behavior, and Apply saves and reveals correctly.

## Status

Planning + authored-content pack (docs only — no application code changed yet). The `CURRICULUM-MAP.md`
and `curriculum-map.json` define the full 161-lesson contract, including every live-demo spec; the
remaining pack files (`ARCHITECTURE.md`, `RESEARCH.md`, the two AGENT runbooks) are the plan for shipping
it. Before the course is live, the engineer must build the live-demo runner and compose it with the
reused answer panel + reveal, and each lesson must be authored into a shippable lesson object and verified
to render Learn → See it live → Apply → reveal correctly on the Learn engine.
