# Technical Spec — "Applied JavaScript & React" Course

> Part of the **[Applied JS & React curriculum pack](./README.md)**. Connected files: [README](./README.md) · [ARCHITECTURE](./ARCHITECTURE.md) · [CURRICULUM-MAP](./CURRICULUM-MAP.md) · [curriculum-map.json](./curriculum-map.json) · [CONTENT](./CONTENT.md) · [RESEARCH](./RESEARCH.md) · [AGENT-1](./AGENT-1-engineer.md) · [AGENT-2](./AGENT-2-curriculum-developer.md)
> Sibling of the **[Learn System Design curriculum pack](../system-design-curriculum/ARCHITECTURE.md)**. This file is the **build spec** a loop agent implements; it defines the `AppliedJsExercise` shape and the `LiveDemo` subsystem the content must fit.

**Status:** Proposed · **Author:** Principal Eng · **Mirrors:** `docs/system-design-curriculum/ARCHITECTURE.md` · **Scope:** an interview-focused Applied JavaScript & React course (JS foundations → async/event-loop → React rendering → hooks/effects → performance & patterns), built on the existing Learn engine, with a **first-class live-demo subsystem**.

---

## 0. Guiding Principle — Reuse, Don't Rebuild (and one new subsystem)

The Learn subsystem is a **course-shaped engine** generic over the graded payload: `TutorialLevel<E> → TutorialModule<E> → TutorialLesson<E>` with `teach`/`apply`/`practice`, a synchronous per-course registry, a server-owned per-user progress doc keyed by `lessonId`, a shared store + debounced autosave, a 3-column Lesson Player, and course-parallel route trees under `app/learn/{python,sql,system-design}/[levelSlug]/[lessonId]`. Python plugs in `PythonExercise`, SQL plugs in `SqlExercise`, **System Design plugs in the free-response `DesignExercise`.** Applied JS & React is a **fourth payload plugged into the same engine.**

Crucially, this course is **the free-response course plus a live demo.** It reuses the entire System-Design free-response Apply machinery **unchanged**: `DesignExercise`'s read → think → write → save → reveal loop, `DesignAnswerPanel`, the `user_design_answers` collection + `design-answers.ts` service + `design-answers-client.ts` + `app/api/tutorials/design-answers/route.ts`, and completion-without-a-grader. The pedagogy is **Learn → SEE IT LIVE → Apply**: read a nuance, watch it happen (log order/timing, a re-render count, a request race, a leak), then reason about it in prose.

There is exactly **one genuinely new subsystem**, and it is the whole point of the course:

> **The LIVE DEMO subsystem** — a `LiveDemoPanel` rendered between the Read and the Apply, backed by (a) a **sandboxed pure-JS Web-Worker runner** that executes a lesson's demo code with a hard timeout and no network, captures `console` output **with timestamps**, streams it to the panel, and can run **two labeled variants side by side** with a **timing-bar comparison + ordered console**; and (b) a small registry of **hand-authored interactive React demo widgets** (render-count badges, request counters, a "trigger race" button, a broken/fixed toggle) that a lesson references by id, for nuances a pure log can't show.

Everything else is reused. The JS runner is not built from scratch either — it is the mirror of what SQL/Python already do: a same-origin Web Worker under `/public/workers/*.js` driven by a `lib/workspace-execution/*/worker-runner.ts`, with `terminate()` on hang. The existing `public/workers/js-sandbox-worker.js` already runs single-file JS via `new Function(code)` and captures `console.*` as `{type, message, timestamp}` — we add a **streaming demo variant** rather than touch the grading worker.

### §0.1 Reuse vs Extend vs Build-new

| Concern | File(s) | Verdict | Note |
|---|---|---|---|
| Content-tree skeleton | `lib/tutorials/types.ts` | **Reuse as-is** | `TutorialLevel<E>`/`Module<E>`/`Lesson<E>` already generic. Add `AppliedJsExercise` + `AppliedJs*` aliases. §1. |
| `CourseId` union | `lib/tutorials/types.ts` | **Extend (1 token)** | `"python" \| "sql" \| "system-design"` → add `"applied-js-react"`. §1/§6. |
| `TutorialLevelId` range | `lib/tutorials/types.ts` + `lib/tutorials/progress.ts` | **Reuse as-is** | Already widened to `0..11` for System Design; the JS course fits inside it. No further widening. §1. |
| Free-response payload | `DesignExercise` in `lib/tutorials/types.ts` | **Extend (new interface)** | New `AppliedJsExercise extends DesignExercise` adds `codeContext?` + `liveDemo?`. `DesignExercise` stays pristine. §1/§3. |
| Answer panel | `components/tutorials/DesignAnswerPanel.tsx` | **Reuse as-is** | Free-text write → Save → reveal. Takes any `DesignExercise`; `AppliedJsExercise` is one. §3. |
| Answer persistence | `user_design_answers` + `design-answers.ts` / `-client.ts` / `app/api/tutorials/design-answers/route.ts` | **Reuse (widen id prefix)** | Same collection/doc-shape/route. The **only** change: the zod `exerciseId`/`lessonId` `.startsWith("sd-")` becomes an allow-list of `sd-`\|`ajr-`. §4. |
| Progress collection + service + client + sync | `user_tutorial_progress`, `progress.ts`, `progress-client.ts`, `useTutorialProgressSync.ts` | **Reuse as-is** | Operate purely on `lessonId`. `courseId` optional. §4. |
| Tutorial store | `lib/stores/tutorial-store.ts` | **Reuse as-is** | `completeSection(section, score?)`. §4. |
| Browser execution (grading) | `lib/workspace-execution/*` | **Reuse as-is (untouched)** | The course does not code-*grade*. The grading JS worker is NOT touched. §2. |
| **JS demo runner** | `public/workers/js-demo-worker.js` + `lib/workspace-execution/js-demo/demo-runner.ts` | **BUILD-NEW** | Streaming, sandboxed, timestamped console capture, hard timeout + `terminate`, two-variant runs. The one new execution surface. §2.2. |
| **LiveDemoPanel** | `components/tutorials/live-demo/LiveDemoPanel.tsx` | **BUILD-NEW** | The between-Read-and-Apply demo surface: ordered console + timing bars, or a React widget. §2.1. |
| **React demo-widget registry** | `components/tutorials/live-demo/widgets/registry.ts` + widget components | **BUILD-NEW** | Lesson references a hand-authored widget by `widgetId`. §2.4. |
| Player | `components/tutorials/SystemDesignLessonPlayer.tsx` | **Build-new (thin fork)** | New `AppliedJsLessonPlayer.tsx`: same shell + `DesignAnswerPanel`, **inserts `LiveDemoPanel`** between Read and Design. §5. |
| Teach panel | `components/tutorials/TeachPanel.tsx` | **Reuse as-is** | Markdown only (no `demoLanguage`); the runnable demo moves to `LiveDemoPanel`, not the teach block. §5. |
| Section stepper / rails / done button / tutor | `LessonRail`, `LessonHeader`, `SectionDoneButton`, `SableTutor`, `VerticalRail` | **Reuse as-is** | §5. |
| Route tree | `app/learn/applied-js-react/*` | **Build-new (parallel)** | Mirror `app/learn/system-design/*`. §5. |
| Registry | `lib/tutorials/applied-js-react/registry.ts` | **Build-new (parallel)** | Clone of `system-design/registry.ts` over `APPLIED_JS_LEVELS`. §5. |
| Curriculum content | `lib/tutorials/applied-js-react/curriculum/*` | **Build-new (content)** | `APPLIED_JS_LEVELS`. §5/§7. |
| Auth gate | `proxy.ts` `PROTECTED_ROUTES` | **Extend (1 line)** | Add `"/learn/applied-js-react"`. §5. |
| Optional editable-demo playground | `LiveDemoPanel` edit mode | **BUILD-NEW (Phase 2, flagged, off)** | Learner edits + re-runs the JS demo. §6. |
| Optional AI answer assessment | `app/api/tutorials/design-review/route.ts` | **BUILD-NEW (Phase 2, flagged, off)** | Auth-gated, cost-controlled; shared with System Design. §6. |

**Net new code:** one `LiveDemoPanel` + one streaming JS demo worker + its runner + one React-widget registry with a handful of widgets, one `AppliedJsLessonPlayer` fork, one registry, one route tree, one interface (`AppliedJsExercise`), ~2 lines of union / id-prefix widening, plus content. **Zero** new grading code, **zero** new persistence collection (the answer store is reused), and the System-Design free-response stack is reused wholesale.

---

## 1. Data Model

### §1.1 Reuse the generic skeleton; add a fourth payload that extends the free-response one

`AppliedJsExercise` **is a `DesignExercise`** (so `DesignAnswerPanel` and `user_design_answers` accept it verbatim) plus two additive fields: the code snippet shown above the Apply prompt, and a reference to the live demo shown in the Read → SEE IT LIVE step.

```ts
// lib/tutorials/types.ts  (additive)

// (a) CourseId gains the fourth course.
export type CourseId = "python" | "sql" | "system-design" | "applied-js-react"

// (b) TutorialLevelId already spans 0..11 (widened for System Design) — REUSED, no change.

/** One console line captured from a JS demo run: kind, text, and ms-since-run-start. */
export interface DemoLogLine {
  type: "log" | "info" | "warn" | "error"
  message: string
  /** ms since this variant's run started (t0 = first line of user code). Drives the timing bar. */
  atMs: number
}

/** A labeled JS demo program. Two of these render side by side (e.g. "Sequential" vs "Promise.all"). */
export interface LiveDemoVariant {
  id: string          // stable within the exercise, e.g. "sequential"
  label: string       // "Sequential await"
  /** Self-contained JS source. Runs in the sandboxed worker; console.* is captured + timestamped. */
  source: string
}

/** What the LiveDemoPanel shows for a lesson. Discriminated so the panel picks a renderer. */
export type LiveDemoSpec =
  | {
      kind: "js-runnable"
      /** One or two variants. Two → side-by-side timing bars + ordered consoles (the flagship). */
      variants: LiveDemoVariant[]
      /** Auto-run on mount (default true) vs wait for a Run tap. */
      autoRun?: boolean
      /** Optional caption under the demo ("Watch the order the logs print in."). */
      caption?: string
      /** Optional whitelisted network mock injected as `fetch` (see §2.2). No real network ever. */
      mock?: DemoNetworkMock
    }
  | {
      kind: "react-demo"
      /** Key into the hand-authored widget registry (§2.4). */
      widgetId: string
      caption?: string
    }

/** A deterministic fake `fetch` for demos that need one — no real network is ever reachable. */
export interface DemoNetworkMock {
  /** urlPattern (substring or RegExp source) → response. Latency is simulated in the worker. */
  routes: Array<{ match: string; status?: number; json?: unknown; text?: string; delayMs?: number }>
}

/**
 * An Applied-JS/React exercise. It IS a free-response DesignExercise (reused answer panel +
 * persistence + completion), extended with the code snippet shown above the prompt and the live demo
 * shown in the Read → SEE IT LIVE step.
 */
export interface AppliedJsExercise extends DesignExercise {
  /** id: `ajr-l{N}-{slug}-{apply|practice}` (note the `ajr-` prefix, §4). */
  /** Snippet rendered read-only above the Apply prompt so the question is grounded in real code. */
  codeContext?: { language: "js" | "jsx" | "ts" | "tsx"; code: string; label?: string }
  /** The live demo for this lesson's Read → SEE IT LIVE step. */
  liveDemo?: LiveDemoSpec
}

export type AppliedJsLesson = TutorialLesson<AppliedJsExercise>
export type AppliedJsModule = TutorialModule<AppliedJsExercise>
export type AppliedJsLevel  = TutorialLevel<AppliedJsExercise>

/** Proposed level slugs (content lives in a sibling CURRICULUM doc; this spec only fixes the shape). */
export type AppliedJsLevelSlug =
  | "js-foundations"   // L0 — closures, `this`, references vs values, coercion
  | "async-event-loop" // L1 — microtasks/macrotasks, Promise.all vs sequential, race conditions  ← runner flagship
  | "react-rendering"  // L2 — render vs commit, re-render triggers, keys, memo
  | "hooks-effects"    // L3 — effect timing, deps, cleanup, leaks, stale closures
  | "perf-patterns"    // L4 — batching, useMemo/useCallback, context cost, list virtualization
```

`AppliedJsExercise` remains a valid `DesignExercise` (both `codeContext` and `liveDemo` are optional), so it flows through `DesignAnswerPanel` and `saveDesignAnswer` untouched.

### §1.2 Where the live demo attaches — the lesson-level decision

The pedagogy is **Read → SEE IT LIVE → Apply.** The demo belongs to the **lesson**, shown once between the teach markdown and the design write. Because `AppliedJsExercise` hangs off `lesson.apply`, the natural home is `lesson.apply.liveDemo` (the demo that motivates the Apply prompt). The player reads `lesson.apply.liveDemo` and renders the `LiveDemoPanel` right after `TeachPanel`'s "Continue," before the `DesignAnswerPanel`. A lesson with no `liveDemo` (rare, e.g. a pure-concept lesson) simply skips the panel — the course degrades to plain free-response.

> **Why not reuse `TeachSection.demoCode`?** `demoCode`/`demoSeedSql` (§`types.ts`) is the SQL/Python "run one snippet, show one output table" hook, rendered inside `TeachPanel`. The Applied-JS demo is richer (streamed timing, two variants, or a React widget) and is a **distinct panel** with its own layout and its own runner, so it rides on `AppliedJsExercise`, not on `TeachSection`. `TeachPanel` stays markdown-only for this course.

### §1.3 Read / Apply / Practice reuse

The three-phase spine is inherited. This course follows **the System-Design player's simplification**: `SystemDesignLessonPlayer` treats a lesson as **Read + one Design write**, and marking the Design section done completes **both** `apply` and `practice` so the store (which keys `lessonStatus` off `practice`) flips to completed. `AppliedJsLessonPlayer` keeps that exact model — one live demo, one design write per lesson — so no second free-response prompt is required per lesson. (Content may still author `lesson.practice` as a harder variant if a lesson warrants it; the shared type requires the field to exist, and content sets it to a sensible prompt even if the UI completes it alongside `apply`, mirroring System Design.)

---

## 2. The LIVE DEMO Subsystem (flagship)

This is the one new subsystem. It has three parts: the **panel** (§2.1), the **sandboxed streaming JS worker + runner** (§2.2–§2.3), and the **hand-authored React widget registry** (§2.4).

### §2.1 `LiveDemoPanel`

New `components/tutorials/live-demo/LiveDemoPanel.tsx`. Rendered by `AppliedJsLessonPlayer` between the Read continue and the `DesignAnswerPanel`. It switches on `liveDemo.kind`:

```ts
export interface LiveDemoPanelProps {
  spec: LiveDemoSpec
  /** Fires the first time the learner has run/seen the demo — the player may use it as a soft "seen"
   *  signal, but completion still gates on the saved answer (§4), never on watching the demo. */
  onDemoSeen?: () => void
}
```

- **`kind: "js-runnable"`** → renders the **JS demo view**: a Run/Re-run control (or auto-runs on mount when `autoRun !== false`), one **ordered console** per variant, and — when there are two variants — a **timing-bar comparison** (§2.3). Read-only source is shown in a `ReadOnlyCodeBlock` above each console (reused component). Optional `caption` under the demo.
- **`kind: "react-demo"`** → resolves `widgetId` against the widget registry (§2.4) and renders the hand-authored interactive component inside a bordered "Live demo" frame. If the id is unknown, render a small non-fatal "Demo unavailable" note (never throw).

**Required UI states** (per CLAUDE.md React rules): **idle** (before first run, when `autoRun` is false — "Run" button, empty console placeholder); **running** (spinner + "Running…", console streams in); **done** (final console + timing bars + Re-run); **timed-out** (the runner terminated the worker: "This demo ran too long and was stopped." + Re-run); **error** (a demo threw: the error line shown in the console as a red `error` entry, plus Re-run); **worker-unavailable** (SSR / no `Worker`: static "Live demo needs a browser" fallback). The panel is **client-only** (`"use client"`), never blocks the page, and never gates completion.

Layout note: reuse `ExerciseLayout`/card chrome tokens so the panel reads as part of the lesson flow, not a foreign embed. The two-variant view is a responsive 2-column grid that stacks on narrow screens (`overflow-x: auto` around the timing bars so nothing forces the page to scroll sideways).

### §2.2 The sandboxed streaming JS worker + runner (BUILD-NEW)

Two files, mirroring the SQL runner's split (`public/workers/sql-sandbox-worker.js` + `lib/workspace-execution/sql-sandbox/worker-runner.ts`):

**Worker: `public/workers/js-demo-worker.js`.** A **new, dedicated** demo worker — the grading worker `public/workers/js-sandbox-worker.js` is left untouched (it resolves once at the end and has no streaming; conflating the two would risk the grader). The demo worker:

1. Receives `{ variantId, source, mock?, execTimeoutMs }`.
2. Overrides `console.log/info/warn/error` to `postMessage({ type: "log", variantId, line: { type, message, atMs } })` **incrementally** as each call happens — `atMs = performance.now() - t0`, where `t0` is captured immediately before user code starts. This is what lets the panel show log **order and timing** live (the SQL worker already streams `status`/`exec-start` messages; this is the same discipline applied to `console`).
3. **Sandbox:** delete/neuter network + storage globals inside the worker before running user code — `self.fetch`, `XMLHttpRequest`, `WebSocket`, `importScripts`, `indexedDB`, `caches` are replaced with throwing stubs. If `mock` is provided, install a deterministic fake `fetch` that resolves from `mock.routes` after a simulated `delayMs` (via `setTimeout`), so async-ordering demos are reproducible **without any real network**. No `eval` of learner-supplied React; demo source is authored content, executed via `new Function(source)` exactly like the existing grading worker's single-file path.
4. Runs `await`-friendly: wrap the source so a trailing top-level `await`/Promise settles before "done" (`new Function("return (async () => {" + source + "})()")`), then `postMessage({ type: "done", variantId })` once the returned promise settles (or `{ type: "error", variantId, message }` on throw/reject). A microtask/macrotask demo therefore reports its **final** ordering correctly.

**Runner: `lib/workspace-execution/js-demo/demo-runner.ts`.** Exposes:

```ts
export interface DemoRunHandle {
  /** Streamed lines as they arrive, in worker order. */
  onLine: (cb: (variantId: string, line: DemoLogLine) => void) => void
  onDone: (cb: (variantId: string, status: "done" | "error" | "timeout", error?: string) => void) => void
  /** Terminate the worker immediately (unmount / re-run / hang). */
  cancel: () => void
}

export function runJsDemo(
  variants: LiveDemoVariant[],
  opts: { execTimeoutMs?: number; mock?: DemoNetworkMock } = {}
): DemoRunHandle
```

Discipline copied from the SQL runner:
- **Hard timeout + terminate.** `DEFAULT_EXEC_TIMEOUT_MS = 3000` (demos are tiny; a longer run is a bug/loop). On timeout, `worker.terminate()` and emit `status:"timeout"` for that variant — resolve/emit **before** teardown so no callback is dropped (the SQL runner's exact ordering rule).
- **One worker per variant** (or a fresh worker per variant run) so a hang in one variant can be terminated without killing the other, and each gets a clean global sandbox. Two variants → two workers run in parallel; the panel renders both timelines against a shared max-time axis.
- **No browser → no-op.** `typeof window === "undefined"` (or absent `Worker`) → immediately emit `status:"error"` with a "not a browser" message, so SSR and tests degrade gracefully.
- **`cancel()` on unmount / Re-run.** The panel calls `cancel()` in its effect cleanup and before each Re-run, terminating any in-flight worker (no zombie timers, no post-unmount `setState`).

**Captured-output protocol (worker → runner → panel):**

| message | payload | meaning |
|---|---|---|
| `{type:"log"}` | `variantId`, `line: DemoLogLine` | one console call; append to that variant's ordered console + timeline |
| `{type:"done"}` | `variantId` | that variant's async work settled; freeze its timeline |
| `{type:"error"}` | `variantId`, `message` | that variant threw/rejected; append as a red `error` line, freeze |
| (runner-synthesized) | `variantId`, `status:"timeout"` | runner terminated the worker on the hard timeout |

### §2.3 Two-variant side-by-side: timing bars + ordered console

The flagship view for L1/async. Given two variants (e.g. "Sequential await" vs "`Promise.all`"), the panel renders:

- **Two ordered consoles**, left and right, each line prefixed with its `atMs` (e.g. `+0ms  start`, `+300ms  user`, `+600ms  posts`). The learner reads the **interleaving and order** directly.
- **A timing-bar comparison**: one horizontal lane per variant on a shared time axis scaled to `max(atMs)` across both. Each captured line is a tick/segment on its lane, so "sequential = three 300ms segments end-to-end (~900ms)" vs "Promise.all = three overlapping segments (~300ms)" is **visible at a glance**. Pure SVG/flexbox, no chart dependency (consistent with the learn-graph-viz "no heavy viz deps" verdict). A total-time label sits at the end of each lane.
- **A single Run/Re-run** control runs both variants (parallel workers) and animates both timelines as lines stream in.

This subsystem is the reason the course exists: the learner *watches* the event loop instead of being told about it.

### §2.4 Hand-authored React demo-widget registry (BUILD-NEW)

Some nuances are not console output — they are **component behavior**: re-render counts, an effect firing twice, a request race, a leak that logs after unmount, a broken-vs-fixed toggle. For these, a pure-JS log is the wrong medium and an in-browser bundler is overkill and unsafe. **v1 uses hand-authored interactive widgets**, one per nuance, bundled with the app and referenced by id.

**Recommendation: authored widgets over Sandpack/react-live for v1.** Reasons: (a) **reliability** — widgets are ordinary typed components that ship through the normal build, no runtime transpile, no CDN, no CSP holes (the artifact/CSP posture forbids external hosts); (b) **safety** — no arbitrary `eval` of React; (c) **cost/perf** — no multi-hundred-KB bundler on the lesson page. A future upgrade to Sandpack/`react-live` for a "fork this component" playground is noted in §6 as Phase 2, off by default.

**Registry shape** — `components/tutorials/live-demo/widgets/registry.ts`:

```ts
import type { ComponentType } from "react"
/** Every demo widget is a self-contained, prop-less interactive component. */
export type DemoWidget = ComponentType

/** id → lazily-loaded widget. Lazy so a lesson only pulls the widget it references. */
export const DEMO_WIDGETS: Record<string, () => Promise<{ default: DemoWidget }>> = {
  "render-count-badge": () => import("./RenderCountBadge"),
  "effect-race": () => import("./EffectRaceDemo"),
  "leak-after-unmount": () => import("./LeakAfterUnmountDemo"),
  "stale-closure-counter": () => import("./StaleClosureCounterDemo"),
  "broken-vs-fixed-deps": () => import("./BrokenVsFixedDepsDemo"),
}

export function getDemoWidget(id: string): (() => Promise<{ default: DemoWidget }>) | undefined {
  return DEMO_WIDGETS[id]
}
```

A lesson references a widget purely by string: `liveDemo: { kind: "react-demo", widgetId: "effect-race" }`. `LiveDemoPanel` `React.lazy`-loads it inside a `<Suspense>` with a skeleton fallback and an error boundary (unknown id or load failure → non-fatal "Demo unavailable").

**Two example widgets (authored, illustrative):**

- **`RenderCountBadge`** — a counter component with a `useRef` render tally shown as a badge, plus two buttons: "setState to same value" (shows React bailing out / still rendering depending on the teaching point) and "setState to new value." Visualizes *what triggers a re-render*. Pairs with an L2 rendering lesson.
- **`EffectRaceDemo`** — a mock "search" input whose `useEffect` fires a `mock` request per keystroke; a **request-counter** and an out-of-order "stale response wins" indicator show the race, with a **broken/fixed toggle** that adds an AbortController/ignore-flag cleanup so the learner sees the fix eliminate the race. Pairs with an L3 effects lesson.

Other authored widgets follow the same mold: prop-less, self-resetting, with a visible **counter/badge** and usually a **broken ↔ fixed toggle** so the nuance is felt, not just read.

---

## 3. The Exercise Payload — `codeContext` + `liveDemo` on a reused free-response Apply

The Apply itself is the **reused System-Design free-response flow**, with the code snippet rendered above the prompt.

- **`codeContext`** — rendered read-only (reuse `ReadOnlyCodeBlock` with `language` from the field) directly above the Apply prompt inside `DesignAnswerPanel`'s brief, so the question ("Explain why this logs `undefined`, and fix it") is grounded in the exact code. Because `DesignAnswerPanel` already renders `exercise.prompt`, the cleanest integration is: the player passes `codeContext` down and the panel renders it above the prompt **iff present** — a small additive prop on `DesignAnswerPanel` (`codeContext?`), or (lower-blast-radius) the player renders `ReadOnlyCodeBlock` just above `<DesignAnswerPanel>`. **Chosen: render it in the player, above the panel**, so `DesignAnswerPanel` stays byte-identical and reused across both courses. §5 lists this as a player concern, not a panel change.
- **`liveDemo`** — consumed by `LiveDemoPanel` in the Read → SEE IT LIVE step (§2), not by the Apply surface.
- **Everything else** — `prompt`, `thinkAbout`, `modelAnswerOutline`, `starterAnswer` — are the **inherited `DesignExercise` fields**, rendered by the **unchanged `DesignAnswerPanel`** (write → Save → reveal model outline → self-compare). No new answer component.

---

## 4. Persistence + Completion Without a Grader (both reused)

### §4.1 Answers — reuse `user_design_answers` verbatim, widen the id prefix

Applied-JS answers are the same shape as System-Design answers (private free text, one small doc per exercise). They persist to the **existing `user_design_answers`** collection via the **existing** `design-answers.ts` service, `design-answers-client.ts` wrappers (`fetchDesignAnswer` / `saveDesignAnswer`), and `app/api/tutorials/design-answers/route.ts` (`withAuth`, ownership-checked, server-owned timestamps).

**The single required change** is the id-prefix guard. Today `designAnswerInputSchema` pins ids to the System-Design namespace:

```ts
exerciseId: z.string().min(1).max(120).startsWith("sd-"),
lessonId:   z.string().min(1).max(120).startsWith("sd-"),
```

Widen this to an **allow-list of course prefixes** so the same route serves both free-response courses while still refusing to write another course's namespace:

```ts
const ALLOWED_ID_PREFIXES = ["sd-", "ajr-"] as const
const prefixed = (max: number) =>
  z.string().min(1).max(max).refine(
    (s) => ALLOWED_ID_PREFIXES.some((p) => s.startsWith(p)),
    "id must be a known course namespace"
  )
// exerciseId: prefixed(120), lessonId: prefixed(120)
```

Everything else in `design-answers.ts` (doc id `${uid}__${exerciseId}`, ownership check, `undefined` omission, `startedAt` preservation) is **unchanged**. The `firestore.rules` owner-scoped rule already covers the collection.

> **Optional cleanliness:** `DesignAnswer` has no `courseId` field today (namespace is inferred from the id prefix). Leave it that way; the `ajr-`/`sd-` prefix already disambiguates for any future "review my answers" view.

### §4.2 Completion — reuse the saved-answer predicate, unchanged

Completion flows through the **unchanged** `useTutorialStore.completeSection` → `useTutorialProgressSync` → `PUT /api/tutorials/progress` path. `DesignAnswerPanel` already fires `onReady` once a **non-empty answer is saved**, which un-hides the reused `SectionDoneButton`; marking the Design section done calls the player's `completeDesign()` (completes `apply` + `practice`, flipping `lessonStatus`). The `AppliedJsLessonPlayer` keeps `SystemDesignLessonPlayer`'s completion logic **verbatim**. Watching the live demo is **not** a completion gate (the memory rule: don't add locking; keep the loop light). `lastExerciseScore` stays optional/omitted (no grader).

---

## 5. Player, Routes, Registry, and `CourseId` Wiring — Every Touch Point

### §5.1 `AppliedJsLessonPlayer` (thin fork of `SystemDesignLessonPlayer`)

New `components/tutorials/AppliedJsLessonPlayer.tsx`. Fork `SystemDesignLessonPlayer` and change only:

- **Registry imports** → `lib/tutorials/applied-js-react/registry.ts` (`getNextAppliedJsLessonInLevel`, `getFirstLessonOfNextAppliedJsLevel`, `listAppliedJsLessonsInLevel`).
- **Insert the live demo.** Between the Read step and the Design step, render `<LiveDemoPanel spec={lesson.apply.liveDemo} />` when `lesson.apply.liveDemo` is present. Concretely: after `TeachPanel`'s Continue advances to the Design view, show `LiveDemoPanel` above the `DesignAnswerPanel` (a "See it live" sub-header), or as its own navigable micro-step. Simplest: render it at the top of the `showDesign` block, before `codeContext` + `DesignAnswerPanel`.
- **Render `codeContext`.** Above `<DesignAnswerPanel>`, render `<ReadOnlyCodeBlock code={ex.codeContext.code} language={ex.codeContext.language} label={ex.codeContext.label} />` iff present (§3). `DesignAnswerPanel` itself is unchanged.
- **Static strings** → base path `/learn/applied-js-react`, document title `"… — Learn Applied JavaScript & React"`, persistence keys `cs_ajr_tutor_open` / `cs_ajr_rail`.
- **Answer persistence** → reuse `fetchDesignAnswer` / `saveDesignAnswer` exactly as `SystemDesignLessonPlayer` does (ids now carry the `ajr-` prefix, accepted after §4.1).
- **Everything else reused:** the 3-column shell, `LessonRail`, `LessonHeader`, `SableTutor`, `VerticalRail`, resume-on-load, `nextStep` level hand-off, progress bar, `completeDesign()`/`completeTeach()`. `TeachPanel` is rendered markdown-only (no `demoLanguage`).

> The fork is small enough that a shared `<FreeResponseLessonPlayer>` refactor is tempting, but per CLAUDE.md "don't abstract just because two files look similar" and the System-Design precedent of a **parallel** player, keep `AppliedJsLessonPlayer` a sibling fork. A later refactor can extract the shell if a fifth course appears.

### §5.2 Route tree — mirror `app/learn/system-design/*`

| System design | Applied JS & React | Kind |
|---|---|---|
| `app/learn/system-design/page.tsx` | `app/learn/applied-js-react/page.tsx` | **Server** — level selector over `listAppliedJsLevels()` |
| `app/learn/system-design/layout.tsx` | `app/learn/applied-js-react/layout.tsx` | Server layout (wraps `LearnAuthGuard`) |
| `app/learn/system-design/[levelSlug]/page.tsx` | `app/learn/applied-js-react/[levelSlug]/page.tsx` | **Server** — level path (`toLevelListModel` + `computeLevelPath` with `basePath="/learn/applied-js-react"`) |
| `app/learn/system-design/[levelSlug]/[lessonId]/page.tsx` | `app/learn/applied-js-react/[levelSlug]/[lessonId]/page.tsx` | **Client** — resolves via `getAppliedJsLessonLocation`, renders `<AppliedJsLessonPlayer key={lesson.id} …>` |

`lib/tutorials/level-path.ts` is course-agnostic — **reused verbatim**; only `basePath` differs.

### §5.3 Registry — parallel `lib/tutorials/applied-js-react/registry.ts`

Structural clone of `lib/tutorials/system-design/registry.ts` over `APPLIED_JS_LEVELS`, function surface renamed: `listAppliedJsLevels`, `getAppliedJsLevel(id)`, `getAppliedJsLevelBySlug(slug)`, `getAppliedJsModule`, `listAllAppliedJsLessons`, `getAppliedJsLesson`, `getAppliedJsLessonLocation`, `getNextAppliedJsLesson`, `getNextAppliedJsLessonInLevel`, `listAppliedJsLessonsInLevel`, `getFirstLessonOfNextAppliedJsLevel`, `getAppliedJsExerciseById`. Content in `lib/tutorials/applied-js-react/curriculum/{index,level0..level4}.ts` exporting `APPLIED_JS_LEVELS`. **Parallel, not merged** — keeps other courses' call sites untouched.

### §5.4 `CourseId` + auth — enumerated touch points

1. `lib/tutorials/types.ts` — `CourseId` gains `"applied-js-react"`; add `AppliedJsExercise` + `AppliedJs*` aliases + `LiveDemo*`/`DemoLogLine`/`DemoNetworkMock` types (§1). `TutorialLevelId` already `0..11` (no change).
2. `lib/tutorials/design-answers.ts` — widen the `exerciseId`/`lessonId` prefix guard to `["sd-","ajr-"]` (§4.1). **Only** change to persistence.
3. `proxy.ts` — `PROTECTED_ROUTES` gains `"/learn/applied-js-react"`. The existing prefix match hard-gates every sub-path. Execution is free (client-side demos are free), the *page* is auth-gated — same cost model as the other courses.
4. `lib/tutorials/progress.ts` — **no change** (level range already `0..11`; `courseId` optional). Applied-JS progress may stamp `courseId: "applied-js-react"` for clean dashboards; absent still means Python.
5. Any "all courses" hub / `LearnPathTopBar` links — additive entry for Applied JS & React (optional; not required for the vertical slice).

The store, `progress-client`, and `useTutorialProgressSync` are **reused unchanged**.

---

## 6. Optional Phase 2 (feature-flagged, OFF by default)

Neither ships in v1; both are additive and default-off.

### §6.1 Editable-demo playground (mini in-browser)

Let the learner **edit and re-run** the JS demo source. Because the runner (§2.2) already executes arbitrary source in the sandboxed worker with a hard timeout and no network, the delta is small: swap `LiveDemoPanel`'s `ReadOnlyCodeBlock` for an editable textarea/CodeMirror behind a flag, and pipe the edited source into `runJsDemo`. Sandbox posture is unchanged (still no network unless the lesson's `mock` is provided, still terminate-on-hang), so learner edits are safe. For a **React** "fork this component" playground, this is where **Sandpack / `react-live`** would enter — noted as the heavier upgrade path, still Phase 2, still off. Flag: `FEATURE_AJR_EDITABLE_DEMO`, default off; the edit affordance simply does not render when off.

### §6.2 AI answer assessment vs the rubric

Identical to System-Design §6: after Save + reveal, an optional **"Get AI feedback"** grades the saved answer against `modelAnswerOutline`. **Reuse the shared** `app/api/tutorials/design-review/route.ts` (`POST`, `withAuth` — sign-in required per the *cost-bearing-routes-require-auth* memory), feature-flagged (`FEATURE_DESIGN_AI_REVIEW`) default off, per-user rate-limited, one model call, cached by `(exerciseId, hash(text))`, cheap tier. **Never blocks completion**; third-party failure degrades to the manual self-compare. No guest access.

---

## 7. UI Reuse Summary

**New:** `LiveDemoPanel` + the JS timing-bar / ordered-console sub-views, `public/workers/js-demo-worker.js` + `lib/workspace-execution/js-demo/demo-runner.ts`, the React demo-widget registry + a handful of authored widgets, `AppliedJsLessonPlayer` fork, `lib/tutorials/applied-js-react/*` registry + content, `app/learn/applied-js-react/*` routes, `AppliedJsExercise` + live-demo types, ~2 lines of union / id-prefix widening.

**Reused unchanged:** `DesignAnswerPanel`, `TeachPanel`, `ReadOnlyCodeBlock`, `LessonOutline`, `LessonRail`, `LessonRailStrip`, `LessonHeader`, `ExerciseLayout`, `ExerciseBrief`, `SectionDoneButton`, `ExtraPracticeSection`, `Reveal`, `SableTutor`, `VerticalRail`, `MarkdownRenderer`, `usePersistentState`, `useCompletedLessons`, `useTutorialProgressSync`, `LevelSelector`/`LevelPathView`, all of `lib/tutorials/level-path.ts`, the `user_design_answers` collection + `design-answers.ts`/`-client.ts`/route, the `user_tutorial_progress` pipeline, and the tutorial store. Server/client boundaries match System Design: level selector + level path are Server Components; the lesson page is a Client Component under `LearnAuthGuard`. **The grading workers are untouched.**

---

## 8. Build Order + Definition of Done

### §8.1 Phased build (thin vertical slice first)

1. **Type + LiveDemoPanel + JS worker runner + one proof lesson, end-to-end.** Add `AppliedJsExercise` + live-demo types + `CourseId` token to `types.ts`. Build `public/workers/js-demo-worker.js` (streaming console capture, timestamps, sandbox, terminate-on-timeout) + `lib/workspace-execution/js-demo/demo-runner.ts` (two-variant runs, `cancel`). Build `LiveDemoPanel` (`js-runnable` view: ordered console + two-variant timing bars). Hand-author **one** L1/async lesson (`ajr-l1-…`, e.g. "Sequential await vs `Promise.all`") with a two-variant `liveDemo`, `codeContext`, and a reused free-response `apply`. Drive it through a throwaway page. Prove: both variants run in parallel workers, logs stream in order with `atMs`, timing bars show sequential ≈ 3× the parallel total, a 3s hang is terminated, and the reused `DesignAnswerPanel` save → reveal → `SectionDoneButton` → `completeSection` writes `user_tutorial_progress/${uid}__ajr-l1-…`.
2. **React demo-widget registry.** Build `components/tutorials/live-demo/widgets/registry.ts` + `RenderCountBadge` + `EffectRaceDemo` (broken/fixed toggle). Add the `react-demo` branch to `LiveDemoPanel` (lazy + Suspense + error boundary). Prove an L2/L3 lesson referencing `widgetId` renders the widget and the broken↔fixed toggle changes behavior.
3. **Reuse persistence.** Widen the `design-answers.ts` id-prefix guard to `["sd-","ajr-"]`; confirm `ajr-` answers save/resume through the unchanged route and `sd-` answers still work (regression). Confirm signed-out saves no-op.
4. **Player fork + registry + routes + auth.** `AppliedJsLessonPlayer` (insert `LiveDemoPanel` + `codeContext`), parallel `applied-js-react/registry.ts`, `APPLIED_JS_LEVELS` skeleton, `app/learn/applied-js-react/*` route tree, `proxy.ts` line. Wire resume + `nextStep` hand-off (reused).
5. **Polish + content.** Timing-bar axis/labels, streaming animation, all UI states (idle/running/done/timeout/error/worker-unavailable), narrow-screen stacking. Author lessons L0–L4 into `AppliedJsExercise` objects: each lesson `teach.markdown`, a `liveDemo` (js-runnable for async/foundations, react-demo for rendering/effects/perf), `codeContext`, `apply` (prompt leads with the deliverable; no em dashes), `thinkAbout`, `modelAnswerOutline`. One lesson per `/loop` iteration.
6. **Phase 2 (optional, later).** Editable-demo playground (`FEATURE_AJR_EDITABLE_DEMO`) and AI review (`FEATURE_DESIGN_AI_REVIEW`), both off.
7. **Verification** (§8.3).

### §8.2 Definition of Done (vertical slice)

- One L1/async lesson runs Read → **SEE IT LIVE** → Apply end-to-end: Read completes on Continue; `LiveDemoPanel` runs **two variants in parallel**, streams timestamped console lines in order, and renders a timing-bar comparison where sequential total ≈ 3× the `Promise.all` total; Apply completes via the reused saved-answer predicate; `SectionDoneButton` (unchanged) gates on it; `completeSection` writes to the **unchanged** `user_tutorial_progress` path with `lessonStatus:"completed"`.
- The JS demo runner is **sandboxed**: `fetch`/`XMLHttpRequest`/`WebSocket`/`importScripts`/storage globals throw inside the worker (unless a lesson `mock` is provided); a demo with an infinite loop is **terminated** at the 3s hard timeout and surfaces "stopped," never hanging the tab; unmount/Re-run calls `cancel()` and leaves no zombie worker.
- A React demo lesson resolves its `widgetId` from the registry, renders the hand-authored widget in a bounded frame, and an unknown id degrades to a non-fatal "Demo unavailable" (never throws).
- Learner answers persist to `user_design_answers/${uid}__ajr-l{N}-{slug}-{apply}` via the **reused** auth-gated route (after the 2-prefix widening), resume on reload, and no-op when signed out. `sd-` answers still save (System Design unregressed).
- **Grading execution layer is git-clean:** `public/workers/js-sandbox-worker.js`, `js-sandbox/`, `python-sandbox/`, `sql-sandbox/`, `exercise-scenarios.ts` show no diff — the course added a **separate** demo worker and **zero** grading code.
- Python, SQL, and System Design are fully unregressed: existing routes/registries/players untouched; `CourseId`/id-prefix widenings are additive.
- `/learn/applied-js-react/*` renders the level selector, level path, and lesson player; level % / resume / "Up next" / level hand-off all work via reused `level-path.ts` + registry.
- New logic is tested: the demo-runner protocol (line ordering, `atMs` monotonicity, timeout→terminate, two-variant isolation, `cancel`), the sandbox stubs (network globals throw), the widget-registry resolution (known id loads, unknown id degrades), and the id-prefix widening (accepts `sd-`/`ajr-`, rejects others) — mirroring `lib/workspace-execution/__tests__` and `lib/tutorials/__tests__`.

### §8.3 Verification commands

```
pnpm typecheck
pnpm lint
pnpm test        # incl. new js-demo runner + sandbox + widget-registry + id-prefix suites
pnpm build
```

All four pass, plus a manual live run of the proof lesson in `pnpm dev` (two-variant demo timing, timeout-terminate, save/reveal/complete + reload-resume can't be fully exercised headless).

### §8.4 Risks / edge cases

- **Timing determinism.** Real `setTimeout`/microtask timing varies by machine, so absolute `atMs` values wobble. *Mitigation:* the teaching point is **relative** order and ratio (sequential ≈ N× parallel), not exact ms; author demos with clear multiples (e.g. 300ms latencies), and the timing bars scale to the run's own max. Never assert exact ms in tests — assert ordering and coarse ratios.
- **Worker hang / runaway.** A bad demo (author error) could loop. *Mitigation:* the 3s hard timeout + `terminate()` (§2.2) is mandatory and tested; the panel shows "stopped," the page never freezes.
- **Sandbox escape / accidental network.** A demo must not hit the network or storage. *Mitigation:* neuter `fetch`/`XHR`/`WebSocket`/`importScripts`/`indexedDB`/`caches` inside the worker before running user code; only the lesson-provided deterministic `mock` fetch is available; authored content only (no learner `eval` in v1). CSP already blocks external hosts.
- **Two-variant resource use.** Two parallel workers per demo. *Mitigation:* demos are tiny and short-lived; workers are terminated on done/timeout/unmount; at most one demo runs per lesson view.
- **Widget bundle weight.** Many authored widgets could bloat the lesson route. *Mitigation:* the registry is `import()`-lazy, so a lesson pulls only the widget it names.
- **React widget maintenance.** Authored widgets are code, not content. *Mitigation:* keep each prop-less and self-contained; a small, curated set (one per recurring nuance) beats a general playground for reliability. Sandpack is the deliberate later trade (§6.1), not v1.
- **Persistence namespace bleed.** Widening the id-prefix guard must not let one course write another's docs. *Mitigation:* the guard is an explicit allow-list (`sd-`/`ajr-`), ids remain `${uid}__${exerciseId}`-scoped, ownership-checked; a test asserts a non-listed prefix is rejected.
- **Completion gaming.** Watching the demo is not required and the answer bar is light. *Accepted:* self-directed practice; the value is read → watch → attempt → compare, and §6.2 AI review is the opt-in stronger signal.
```