# AGENT 1 — Applied JS & React course engineer ("ship the machinery")

> Part of the **Applied JavaScript & React: Zero to Hero curriculum pack**. Connected files: [README](./README.md) · [ARCHITECTURE](./ARCHITECTURE.md) · [CURRICULUM-MAP](./CURRICULUM-MAP.md) · [curriculum-map.json](./curriculum-map.json) · [CONTENT](./CONTENT.md) · [AGENT-1](./AGENT-1-engineer.md) · [AGENT-2](./AGENT-2-curriculum-developer.md)
> **You (AGENT 1) build the machinery from [`ARCHITECTURE.md`](./ARCHITECTURE.md).** When your Definition of Done is green and merged, [`AGENT-2`](./AGENT-2-curriculum-developer.md) authors the 161 lessons from [`CURRICULUM-MAP.md`](./CURRICULUM-MAP.md) / [`CONTENT.md`](./CONTENT.md), one commit per lesson.

The build-agent runbook: turn `docs/applied-js-react/ARCHITECTURE.md` into a working **Learn Applied JS
& React** feature on the existing Learn-Python / Learn-SQL / Learn-System-Design machinery. Mirrors the
system-design course's `docs/system-design-curriculum/AGENT-1-engineer.md`. Its job is the **engine + a
thin vertical slice + wiring** so the curriculum agent (AGENT 2) can then pour in all 161 lessons from
`docs/applied-js-react/CURRICULUM-MAP.md`. **Reuse, don't rebuild.**

This is a **reuse-plus** course. Two things are already solved and get reused wholesale:

- **The free-response Apply loop** — Applied JS & React is *not code-graded*. There is no test runner,
  no auto-scoring. Apply/Practice is "read the nuance → write a free-text answer → Save → reveal the
  model answer and self-compare," which is **exactly** the system-design subsystem: `DesignAnswerPanel`
  + the `user_design_answers` persistence collection + `SystemDesignLessonPlayer`. Reuse them.
- **The Read → Apply lesson spine**, the progress store, the routes/auth pattern, and the level-path
  projection — all reused from the SQL / system-design courses.

The **one genuinely new subsystem** is the opposite of "no execution": a **LIVE DEMO runner**. Every
lesson makes a runtime nuance *visible* — the learner presses Run and watches the timing, the race
firing, the wasted re-renders, or the leak — **before** they diagnose it in free response. That means
two new runnable paths (both authored/curated content, never learner code):

1. a **sandboxed pure-JS web-worker runner** that executes an authored snippet, captures its console,
   times it, and shows two variants side by side (e.g. broken vs fixed, `Promise.all` vs Workers), and
2. an **authored React demo-widget registry** — in-repo React components keyed by id — that
   `LiveDemoPanel` mounts for `react-demo` lessons.

New course id: **`"applied-js-react"`**. Levels are numbered **L0–L11** (twelve levels), same range as
system design, so **`TutorialLevelId` is already `0..11` and `defaultExecutionMode` is already optional
— no type widening is needed** (both were done for the system-design course). Lesson ids are prefixed
**`ajr-`**.

> **Precondition — the shared free-response subsystem must exist first.** This course reuses
> system-design's answer panel + `user_design_answers` persistence. As of this writing that subsystem
> is **already shipped** (`lib/tutorials/design-answers.ts`, `design-answers-client.ts`,
> `app/api/tutorials/design-answers/route.ts`, `components/tutorials/DesignAnswerPanel.tsx`,
> `components/tutorials/SystemDesignLessonPlayer.tsx`, and the `DesignExercise` type). **If, at build
> time, any of those are missing, build that shared piece first** by following
> `docs/system-design-curriculum/AGENT-1-engineer.md` steps 1–4, then return here. Do not fork it.

---

## Copy-paste prompt (paste into a fresh Claude Code session at the repo root)

```
You are the Applied-JS-React course engineer. Ship the "Learn Applied JS & React" feature by
implementing docs/applied-js-react/ARCHITECTURE.md on top of the existing Learn-Python /
Learn-SQL / Learn-System-Design machinery. Read first, in order:
  1. docs/applied-js-react/ARCHITECTURE.md    (the plan — follow its build order. If it does not exist
     yet, docs/applied-js-react/README.md + this runbook + the curriculum map ARE the spec, and writing
     ARCHITECTURE.md mirroring docs/system-design-curriculum/ARCHITECTURE.md is your optional first step.)
  2. docs/applied-js-react/curriculum-map.json §L0 + docs/applied-js-react/CURRICULUM-MAP.md §L0
     (the exact content shape you must render per lesson: learnFocus, liveDemo {kind:"js-runnable" |
     "react-demo", runs, visualizes}, applyPrompt, thinkAbout[], modelAnswerOutline[], skills,
     difficulty, estimatedMinutes)
  3. docs/system-design-curriculum/AGENT-1-engineer.md   (the sibling runbook this mirrors)
  4. docs/applied-js-react/AGENT-2-curriculum-developer.md  (your DOWNSTREAM consumer — it fixes the
     names you must expose: AppliedLesson, AppliedLessonPlayer, lib/tutorials/applied-js-react/, the
     js-runnable demo runner + variants, the react-demo widget registry, and it REQUIRES at least one
     js-runnable AND one react-demo proof lesson to already exist before it starts)
  5. lib/tutorials/types.ts  (the GENERIC TutorialLevel<E>/Module/Lesson spine + TeachSection, and the
     concrete PythonExercise / SqlExercise / DesignExercise you parallel with a new AppliedExercise)
  6. lib/tutorials/design-answers.ts, design-answers-client.ts,
     app/api/tutorials/design-answers/route.ts   (the free-response answer persistence you REUSE; you
     only widen its "sd-" id guard to also accept "ajr-")
  7. components/tutorials/SystemDesignLessonPlayer.tsx, DesignAnswerPanel.tsx, SectionDoneButton.tsx,
     TeachPanel.tsx, useTutorialProgressSync.ts   (the player + free-response panel you thin-fork/reuse;
     the LiveDemoPanel is INSERTED above the DesignAnswerPanel in the Apply phase)
  8. lib/workspace-execution/sql-sandbox/worker-runner.ts + public/workers/sql-sandbox-worker.js AND
     public/workers/js-sandbox-worker.js   (the web-worker driver + worker patterns your NEW js-demo
     runner mirrors: one reused Worker, queued runs, boot/exec timeouts, resolve-once, console capture)
  9. lib/tutorials/system-design/registry.ts, app/learn/system-design/* + layout.tsx, proxy.ts,
     lib/tutorials/level-path.ts (toLevelListModel), components/tutorials/LevelPathView.tsx  (registry
     + routes + auth + list-projection to mirror)

NON-NEGOTIABLE CONSTRAINTS:
- Reuse, don't rebuild. Grading does NOT exist here — Apply/Practice is free text the learner writes,
  saves, and self-checks against a revealed model answer, EXACTLY like system design. Do NOT import or
  fork any code executor / sql-sandbox / python-sandbox / test runner for GRADING. The only executor is
  the new LIVE-DEMO runner, and it runs AUTHORED demo snippets to OBSERVE behavior, never to grade.
- REUSE the system-design free-response subsystem outright: the DesignAnswerPanel (write → Save →
  gated reveal), and the user_design_answers collection + service + client + /api/tutorials/design-answers
  route. Applied-JS answers persist in the SAME user_design_answers collection. The ONLY change to that
  subsystem is widening the two `.startsWith("sd-")` guards in design-answers.ts so exerciseId/lessonId
  may ALSO start with "ajr-" (defense-in-depth still rejects any other namespace). Do NOT fork the
  collection, service, client, or route.
- SECTION-STATUS progress is REUSED unchanged: same user_tutorial_progress collection, same
  useTutorialProgressSync, same tutorial store, same /api/tutorials/progress route — namespaced by the
  ajr- lessonId prefix. Its levelId Zod union already accepts 0..11 (widened for system design), so
  NOTHING changes in progress.ts. Do NOT fork the progress store or its route.
- The LIVE DEMO runner is the new subsystem and it MUST be sandboxed: a dedicated Web Worker for
  js-runnable demos (no DOM, no network needed), and an in-repo AUTHORED React widget registry for
  react-demo. No eval of learner-supplied code — every demo source is authored content.
- Auth-gated like the other courses: /learn/applied-js-react is added to proxy.ts PROTECTED_ROUTES
  (progress + saved answers require a real user), plus LearnAuthGuard in the layout.
- Keep server/client boundaries identical to system design: server-component Path/Level pages project
  via toLevelListModel (no answers / model answers / demo source ship to the client on the list pages);
  the lesson page is the client player.
- Match the names AGENT 2 already commits to: exercise alias family AppliedExercise / AppliedLesson /
  AppliedModule / AppliedLevel; player AppliedLessonPlayer; registry+curriculum under
  lib/tutorials/applied-js-react/; per-level curriculum folders levelN/ with index.ts barrels.

BUILD IN THIS ORDER, committing after each step (commit as the user, no Claude co-author, use
`git -c commit.gpgsign=false commit`):
  1. Types (lib/tutorials/types.ts): add CourseId "applied-js-react". Add a LiveDemo discriminated
     union: JsRunnableDemo { kind:"js-runnable"; runs:string; visualizes:string; variants:
     { label:string; code:string }[] } (1 or 2 variants, rendered side by side) | ReactDemo
     { kind:"react-demo"; runs:string; visualizes:string; widgetId:string } (widgetId keys the
     react-demo registry). Add AppliedExercise { id (ajr-l{N}-{slug}-{apply|practice}); prompt;
     thinkAbout:string[]; modelAnswerOutline:string[]; modelAnswerCode?:string (the CORRECTED code
     revealed with the outline); starterAnswer?; codeSnippet?:string (the read-only broken/nuanced
     source the Apply refers to); liveDemo?:LiveDemo } — NO executionMode / testCases / grading. Add
     the twelve-slug AppliedJsLevelSlug union (how-js-runs, closures-scope-identity, async-js-done-right,
     race-conditions, immutability-state-shape, react-rendering-model, useeffect-hooks,
     data-fetching-react, performance-optimization, leaks-forms-events, typescript-react,
     production-react-architecture) and aliases AppliedLesson = TutorialLesson<AppliedExercise>,
     AppliedModule, AppliedLevel = TutorialLevel<AppliedExercise>. Reuse TeachSection for the "Learn"
     read phase. TutorialLevelId is ALREADY 0..11 and defaultExecutionMode is ALREADY optional — do NOT
     touch them. Python/SQL/System-Design call sites must not churn (verify a clean typecheck).
  2. Persistence reuse (one-line widen, no new collection): in lib/tutorials/design-answers.ts widen
     designAnswerInputSchema so exerciseId and lessonId may start with "sd-" OR "ajr-" (e.g. a .refine
     that both prefixes satisfy, keeping the max-length caps). Everything else in design-answers.ts,
     design-answers-client.ts, and app/api/tutorials/design-answers/route.ts is reused UNCHANGED —
     applied-js answers live in the same user_design_answers collection, doc id
     `${uid}__${exerciseId}`. Add unit cases to lib/tutorials/__tests__ proving an "ajr-" id passes the
     schema, an "sd-" id still passes, and a foreign-prefix id ("py-…") is still rejected. progress.ts
     is UNCHANGED (its levelId union already accepts 0..11).
  3. Live-demo runner (the new subsystem):
     - public/workers/js-demo-worker.js: a trimmed sibling of js-sandbox-worker.js — single-snippet
       mode only (no workspace / require / assert / test-runner coupling). It captures console.log/warn/
       error/info as {type,message,timestamp}, wraps the snippet run in performance.now() start/end to
       report elapsed ms, and postMessages { success, logs, ms, error, stack }. It restores the original
       console before posting. It never fetches anything.
     - lib/tutorials/applied-js-react/live-demo/worker-runner.ts: the client driver modeled on
       sql-sandbox/worker-runner.ts — ONE reused Worker("/workers/js-demo-worker.js"), runs QUEUED one
       at a time, a boot timeout and a tight exec timeout, resolve-EXACTLY-once + terminate/reset on
       timeout/error, and a typeof-window guard that returns a failed result off the browser. Export
       runJsDemo(code:string, timeoutMs?) => Promise<{ success:boolean; logs:{type,message,timestamp}[];
       ms:number; error?:string }>.
     - components/tutorials/applied-js-react/demo-widgets/registry.ts: an AUTHORED react-demo widget
       registry — a Record<string, ComponentType> mapping widgetId → an in-repo React demo component
       (NOT user code). Provide a typed getDemoWidget(id) that returns the component or undefined. Seed
       it with ONE real example widget (author a component under demo-widgets/, e.g. a
       frozen-spinner/blocking-main-thread demo or a wasted-render-counter demo, whichever L0 react-demo
       lesson you use for the proof) so the react-demo path is genuinely exercised.
  4. LiveDemoPanel + AppliedLessonPlayer:
     - components/tutorials/LiveDemoPanel.tsx (client): given an AppliedExercise's codeSnippet + liveDemo,
       render the read-only code snippet (syntax-styled, no editor), then the demo. For kind
       "js-runnable": a Run control that runs each variant through runJsDemo and shows the variants SIDE
       BY SIDE, each with a captured-console pane and an elapsed-ms timing badge, plus the `visualizes`
       caption. For kind "react-demo": look up widgetId via getDemoWidget and MOUNT the widget (render a
       clear error state if the id is missing — that is an authoring gap). Handle loading / empty /
       error / disabled states; the panel never blocks the Apply flow if a demo fails.
     - Extend the REUSED DesignAnswerPanel with ONE additive optional prop modelAnswerCode?: string that,
       when the model answer is revealed, also renders the corrected code as a read-only fenced block
       below the outline bullets. Undefined-safe, so system-design is unaffected (this is the only change
       to the shared panel; note it as a deviation).
     - components/tutorials/AppliedLessonPlayer.tsx: a THIN FORK of SystemDesignLessonPlayer. Reuse
       useTutorialProgressSync, the tutorial store, TeachPanel, LessonHeader, LessonRail, SableTutor,
       SectionDoneButton, DesignAnswerPanel, and design-answers-client verbatim. Differences: (a) in the
       Apply phase render <LiveDemoPanel exercise={lesson.apply}/> ABOVE the DesignAnswerPanel so the
       flow is read nuance → Learn Continue → see it live (Run) → write answer → Save → reveal
       (modelAnswerCode + outline); (b) pass modelAnswerCode to DesignAnswerPanel; (c) basePath
       "/learn/applied-js-react", header links to the applied path, courseId "applied-js-react" where the
       progress model carries it. KEEP the system-design player's one-design-write mapping: marking the
       Apply section done completes BOTH apply AND practice so the shared store (which keys lessonStatus
       off practice) flips the lesson to completed. On mount, load the saved answer for lesson.apply so a
       returning learner resumes their own text.
  5. Registry + routes + auth:
     - lib/tutorials/applied-js-react/registry.ts parallel to system-design/registry.ts over
       APPLIED_LEVELS (listAppliedLevels, getAppliedLevelBySlug, getAppliedLessonLocation,
       getNextAppliedLessonInLevel, getFirstLessonOfNextAppliedLevel, listAppliedLessonsInLevel,
       getAppliedExerciseById).
     - lib/tutorials/applied-js-react/curriculum/{index.ts exporting APPLIED_LEVELS, level0/index.ts}.
     - app/learn/applied-js-react/{page.tsx, layout.tsx, [levelSlug]/page.tsx,
       [levelSlug]/[lessonId]/page.tsx} mirroring app/learn/system-design/* (server Path page via
       listAppliedLevels + LearnPathTopBar; server Level page via toLevelListModel + LevelPathView with
       basePath="/learn/applied-js-react"; client lesson page resolving getAppliedLessonLocation and
       rendering <AppliedLessonPlayer key={lesson.id} .../>). LearnAuthGuard in the layout; add
       "/learn/applied-js-react" to proxy.ts PROTECTED_ROUTES. Confirm toLevelListModel accepts an
       AppliedLevel (it projects only list metadata, no exercise payload — widen its generic only if the
       typecheck demands it).
  6. TWO proof lessons authored verbatim from curriculum-map.json §L0 (Module 0.1), then leave
     APPLIED_LEVELS a skeleton — AGENT 2 authors the rest:
     - js-runnable E2E proof: ajr-l0-run-to-completion — full free-response loop with a real
       js-runnable liveDemo (a variant that logs a sync loop + setTimeout(0) + Promise.then so the
       captured console shows the ordering, plus timing) and a codeSnippet + modelAnswerCode.
     - react-demo path proof: a second L0 react-demo lesson (e.g. ajr-l0-blocking-main-thread) whose
       liveDemo.widgetId references the one example widget you registered, so LiveDemoPanel's react
       branch is proven to mount and run.

VERIFY and report: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all green; the REUSED files
show NO diff beyond the two documented additive changes (the "ajr-" prefix widen in design-answers.ts
and the optional modelAnswerCode prop on DesignAnswerPanel) — SystemDesignLessonPlayer.tsx, the tutorial
store, useTutorialProgressSync, the /api/tutorials/progress route, and progress.ts are untouched. Then a
manual `pnpm dev` run of the js-runnable proof lesson: Learn renders, Continue lands on Apply, the code
snippet shows, RUN executes the live demo and the captured console + timing display (two variants side
by side if authored), the Design section accepts a written answer, Save persists it (confirm a doc at
user_design_answers/${uid}__ajr-l0-run-to-completion-apply), reloading resumes that text, "Reveal model
answer" shows the corrected code + outline, "Mark as done" completes the section, and progress persists
to user_tutorial_progress/${uid}__ajr-l0-run-to-completion (lessonStatus completed). Also open the
react-demo proof lesson and confirm the registered widget mounts and visibly moves. Python, SQL, and
System-Design courses unregressed.

STOP when the js-runnable proof lesson runs end-to-end (read → run → write → save → reveal → complete →
persist) through the reused progress + answer pipelines, the react-demo proof lesson mounts its widget,
and all four verification commands pass. Do not author the remaining 159 lessons — that is AGENT 2's job.
If ARCHITECTURE.md and reality disagree on a path or a type (e.g. whether the LiveDemo lives on the
exercise or the lesson, or the exact section→lesson-status mapping), trust the code, fix the adapter
minimally, and note the deviation in your final report.
```

---

## Definition of Done (what "shipped" means for this agent)
- `lib/tutorials/types.ts` carries `CourseId "applied-js-react"`, a `LiveDemo` discriminated union
  (`JsRunnableDemo` with `variants[]` | `ReactDemo` with `widgetId`), an `AppliedExercise` (prompt +
  `thinkAbout` + `modelAnswerOutline` + optional `modelAnswerCode` + optional `codeSnippet` + optional
  `liveDemo`, **no** execution/grading fields), the twelve-slug `AppliedJsLevelSlug`, and
  `AppliedLesson`/`AppliedModule`/`AppliedLevel` aliases — with Python, SQL, and System-Design call
  sites unchanged and `TutorialLevelId`/`defaultExecutionMode` untouched (clean typecheck).
- The free-response Apply subsystem is **reused, not rebuilt**: applied-js answers persist in the same
  `user_design_answers` collection through the same service / client / route, the only change being the
  `startsWith("sd-")` guard widened to also accept `"ajr-"`. `DesignAnswerPanel` is reused with a single
  additive optional `modelAnswerCode` prop.
- Section-status progress is **reused unchanged**: same `user_tutorial_progress` collection, same
  `useTutorialProgressSync`, same tutorial store, same `/api/tutorials/progress` route (no code change —
  its `levelId` union already spans 0..11). Progress persists to
  `user_tutorial_progress/${uid}__ajr-l0-{slug}` with no new progress collection.
- The **LIVE DEMO runner** exists as the new subsystem: `public/workers/js-demo-worker.js` (sandboxed
  single-snippet JS with captured console + `performance.now()` timing), a queued/timeout-guarded client
  driver `lib/tutorials/applied-js-react/live-demo/worker-runner.ts` (`runJsDemo`), an authored
  `demo-widgets/registry.ts` with `getDemoWidget` and **one real example widget**, and
  `components/tutorials/LiveDemoPanel.tsx` that renders the code snippet, runs js-runnable variants side
  by side with console + timing, and mounts react-demo widgets.
- `components/tutorials/AppliedLessonPlayer.tsx` (Learn → LiveDemoPanel → Design free-response) drives
  the loop, reusing `SectionDoneButton`, `TeachPanel`, `SableTutor`, `LessonRail`, `LessonHeader`, and
  `DesignAnswerPanel`, and keeping the system-design "complete apply + practice together" mapping.
- Parallel `applied-js-react/registry.ts`; `app/learn/applied-js-react/*` routes gated by `proxy.ts`
  PROTECTED_ROUTES + `LearnAuthGuard`; server list pages project via `toLevelListModel` so no model
  answers or demo source ship to the client.
- **Two L0 proof lessons** (reconciling the E2E ask with AGENT 2's precondition): the js-runnable
  `ajr-l0-run-to-completion` runs **fully end-to-end** — read → run the demo (console + timing) → write
  answer → save → reveal corrected code + outline → section completes → progress persists on reload — and
  a react-demo lesson (e.g. `ajr-l0-blocking-main-thread`) proves the widget-registry path by mounting
  and running the one registered example widget.
- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` green; `SystemDesignLessonPlayer.tsx`, the
  tutorial store, `useTutorialProgressSync`, the progress route, and `progress.ts` show **no diff**; the
  only reused-file diffs are the `ajr-` prefix widen and the additive `modelAnswerCode` prop.
- Hand-off note for AGENT 2 (below).

---

## Hand-off note for AGENT 2

The finalized contract AGENT 2 authors against:

- **Exercise shape** — `AppliedExercise` in `lib/tutorials/types.ts`:
  `{ id; prompt; thinkAbout[]; modelAnswerOutline[]; modelAnswerCode?; codeSnippet?; liveDemo?; starterAnswer? }`.
- **Where the demo + snippet live:** on the **`AppliedExercise`**, not on the lesson. Author
  `liveDemo` and `codeSnippet` on the lesson's **`apply`** exercise (give `practice` its own only if it
  needs a distinct demo). This is a deliberate deviation from the map, which lists `liveDemo` at the
  lesson level — the player reads `lesson.apply.liveDemo` / `lesson.apply.codeSnippet` so the shared
  generic `TutorialLesson<E>` spine stays untouched.
- **`LiveDemo`:** `js-runnable` carries `variants: { label; code }[]` (author 1 or 2 — two renders side
  by side); `react-demo` carries `widgetId` which **must** already exist in
  `components/tutorials/applied-js-react/demo-widgets/registry.ts`. A react-demo lesson pointing at an
  unregistered `widgetId` is an AGENT-1 gap — stop and say so (a new widget is engine work, not content).
- **Model answer:** the ordered `modelAnswerOutline` bullets (corrected-code → mechanism → spot-in-review
  → production-symptom → misconception) render on reveal; put the actual corrected source in
  `modelAnswerCode` so it shows as a code block beside the bullets.
- **Persistence:** answers save to `user_design_answers/${uid}__${exerciseId}` (the same collection as
  system design). Ids must start with `ajr-`; the input schema enforces it.
- **Registry wiring:** add each lesson to its module in the level file and ensure the level flows through
  `lib/tutorials/applied-js-react/registry.ts` (parallel to `lib/tutorials/sql/registry.ts`). Create
  `curriculum/levelN/` + its `index.ts` barrel on a level's first lesson.
