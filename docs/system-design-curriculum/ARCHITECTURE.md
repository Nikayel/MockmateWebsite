# Technical Spec — "Learn System Design" Course

> Part of the **[Learn System Design curriculum pack](./README.md)**. Connected files: [README](./README.md) · [ARCHITECTURE](./ARCHITECTURE.md) · [CURRICULUM-MAP](./CURRICULUM-MAP.md) · [curriculum-map.json](./curriculum-map.json) · [CONTENT](./CONTENT.md) · [RESEARCH](./RESEARCH.md) · [AGENT-1](./AGENT-1-engineer.md) · [AGENT-2](./AGENT-2-curriculum-developer.md)
> **This file is the build spec** AGENT-1 implements; it defines the `DesignExercise` shape the content in `CONTENT.md` / `content/` must fit.

**Status:** Proposed · **Author:** Principal Eng · **Mirrors:** `docs/sql-curriculum/SPEC.md` · **Scope:** 12 levels / 56 modules / 208 lessons of system design (see `CURRICULUM-MAP.md`), built on the existing Learn engine.

---

## 0. Guiding Principle — Reuse, Don't Rebuild

The Learn subsystem is already a **course-shaped engine**: a typed content tree generic over the graded payload (`TutorialLevel<E> → TutorialModule<E> → TutorialLesson<E>` with `teach`/`apply`/`practice`), a synchronous per-course registry, a server-owned per-user progress doc keyed by `lessonId`, a shared tutorial store + debounced autosave, a 3-column Lesson Player, and course-parallel route trees under `app/learn/{python,sql}/[levelSlug]/[lessonId]`. Python plugs `PythonExercise` into it; SQL plugs `SqlExercise`. **System design is a third payload plugged into the same engine, not a second engine.**

There is exactly **one** genuinely new subsystem, and it is the mirror image of what SQL added. SQL's one new thing was a *browser execution runner* (sql.js). System design's one new thing is the opposite: **there is no runner at all.** System design is *not code-graded* — no test cases, no seed DB, no execution marker, no auto-scoring. The learner reads the concept, thinks (guided by `thinkAbout`), writes a **free-text design answer**, **saves** it, then reveals a **model answer** to self-compare (optionally self-rating 1–5). So the new code is:

1. A new exercise payload type (`DesignExercise`) with **no** `testCases`/`seedSql`/`workspace` — a model answer, think-about prompts, and a self-check rubric instead.
2. A **free-response answer panel** (`DesignAnswerPanel`) that replaces the code runner: a Markdown editor + Save + "See model answer" reveal + a rubric checklist.
3. **Answer persistence**: a new server-owned, auth-gated Firestore collection (`user_design_answers`) + a thin API route, with a localStorage draft-autosave complement.
4. A **completion signal without a grader**: "learner saved an answer of minimum length AND revealed/acknowledged the model answer (optionally self-rated)" replaces "tests passed" as the gate that un-hides `SectionDoneButton` and calls `completeSection`.

Everything else — the content-tree skeleton, registry shape, the `user_tutorial_progress` collection + service + route, the tutorial store, the Lesson Player shell, `TeachPanel`, `LessonOutline`/`LessonRail`, `SectionDoneButton`, route-tree layout, and `proxy.ts` auth-gating — is reused unchanged or by widening a union. The single most important design constraint:

> **Section completion for system design flows through the identical `useTutorialStore.completeSection(section, score?)` → `useTutorialProgressSync` → `PUT /api/tutorials/progress` path that Python and SQL use.** The answer *text* is persisted separately (§3); the *progress* doc is written by the exact same machinery. If we hold that line, `user_tutorial_progress`, `progress.ts`, `progress-client.ts`, `useTutorialProgressSync.ts`, and the store are all reused with zero changes beyond one `CourseId` and one `levelId`-range widening.

### §0.1 Reuse vs Extend vs Build-new

| Concern | File(s) | Verdict | Note |
|---|---|---|---|
| Content-tree skeleton | `lib/tutorials/types.ts` | **Reuse as-is** | `TutorialLevel<E>`/`Module<E>`/`Lesson<E>` are already generic over the payload. Add `DesignExercise` + `SystemDesign*` aliases; no skeleton change. §1. |
| `CourseId` union | `lib/tutorials/types.ts` | **Extend (1 token)** | `"python" \| "sql"` → add `"system-design"`. §1/§5. |
| `TutorialLevelId` range | `lib/tutorials/types.ts` + `lib/tutorials/progress.ts` | **Extend** | Curriculum uses levels **0–11**; today the type is `1..5` and the zod schema is `literal(1..5)`. Widen both. §1/§3. |
| Exercise→Scenario adapter | `lib/tutorials/exercise-scenarios.ts` | **Reuse as-is** | System design never executes, so it is **not** routed through here. No new cast, no `Scenario` synthesis. §1. |
| Browser execution | `lib/workspace-execution/*` | **Reuse as-is (untouched)** | No runner. `browser-execution.ts`, `sql-sandbox/`, `python-sandbox/` are git-clean. The strongest reuse win. |
| Progress collection | Firestore `user_tutorial_progress` | **Reuse as-is** | Same collection, namespaced by `lessonId` (`sd-l{N}-{slug}`). §4. |
| Progress service | `lib/tutorials/progress.ts` | **Extend (schema)** | Doc id `${uid}__${lessonId}` is course-agnostic. Only `levelId` range widens; optional `courseId` value gains `"system-design"`. §3/§4. |
| Progress client + sync | `lib/tutorials/progress-client.ts`, `components/tutorials/useTutorialProgressSync.ts` | **Reuse as-is** | Operate purely on `lessonId`. §4. |
| Tutorial store | `lib/stores/tutorial-store.ts` | **Reuse as-is** | `completeSection(section, score?)` already carries an optional score → `lastExerciseScore`. §4. |
| Lesson Player | `components/tutorials/LessonPlayer.tsx` / `SqlLessonPlayer.tsx` | **Build-new (thin fork)** | New `SystemDesignLessonPlayer.tsx`, a thin fork of `SqlLessonPlayer` that renders `DesignAnswerPanel` instead of a runner and threads a self-rating into `completeSection`. §2/§5. |
| Teach panel | `components/tutorials/TeachPanel.tsx` | **Reuse as-is** | Renders `teach.markdown` via `MarkdownRenderer`; with no `demoCode` it shows no Run button. Diagrams ride in markdown fences. §2. |
| Section stepper / rails | `LessonOutline.tsx`, `LessonRail.tsx`, `lessonPhases.ts` | **Reuse as-is** | Read/Apply/Practice labels + icons are content-driven. §5. |
| "Mark as done" | `components/tutorials/SectionDoneButton.tsx` | **Reuse as-is** | Gated on a `passed` boolean. We feed it "answer saved + model revealed" instead of "tests passed". §4. |
| Sable tutor column | `components/tutorials/SableTutor.tsx` | **Reuse as-is** | Language-agnostic; reads current lesson/section from context. §5. |
| Answer panel | `components/tutorials/DesignAnswerPanel.tsx` | **BUILD-NEW** | Markdown editor + Save + reveal toggle + rubric checklist + self-rating. Replaces the runner. §2. |
| Answer persistence | `user_design_answers` collection + `lib/tutorials/design-answers.ts` + `lib/tutorials/design-answers-client.ts` + `app/api/tutorials/design-answers/route.ts` | **BUILD-NEW** | Server-owned, auth-gated, `${uid}__${exerciseId}` doc id. localStorage draft complement. §3. |
| Answer autosave hook | `components/tutorials/useDesignAnswerSync.ts` | **BUILD-NEW** | Debounced save + resume of the answer text, mirroring `useTutorialProgressSync`. §3. |
| Route tree | `app/learn/system-design/*` | **Build-new (parallel)** | Mirror `app/learn/sql/*`: `page` + `layout` + `[levelSlug]/page` + `[levelSlug]/[lessonId]/page`. §5. |
| Registry | `lib/tutorials/system-design/registry.ts` | **Build-new (parallel)** | Clone of `lib/tutorials/sql/registry.ts` over `SYSTEM_DESIGN_LEVELS`. §5. |
| Curriculum content | `lib/tutorials/system-design/curriculum/*` | **Build-new (content)** | `SYSTEM_DESIGN_LEVELS = [sdLevel0..11]`. Authored from `CURRICULUM-MAP.md`. §8. |
| Auth gate | `proxy.ts` `PROTECTED_ROUTES` | **Extend (1 line)** | Add `"/learn/system-design"`. §5. |
| Optional AI self-assessment | `app/api/tutorials/design-review/route.ts` + Sable | **BUILD-NEW (Phase 2, flagged, off)** | Auth-gated, feature-flagged, cost-controlled. Not the primary path. §6. |

Net new code: one answer panel + one rubric checklist sub-component, one answer-persistence service/client/route/hook, one Lesson Player fork, one registry, one route tree, ~4 lines of union/range widening, plus content. **Zero** execution code.

---

## 1. Data Model

### §1.1 Decision — reuse the generic skeleton verbatim, add a third payload

`lib/tutorials/types.ts` is *already* generic over the graded payload (`TutorialLesson<E>`), precisely so a new course only defines a new `E`. SQL proved the pattern. System design does the same, with the twist that its `E` carries **no execution fields at all**. No skeleton refactor is needed — only additive declarations.

```ts
// ---- shared skeleton: UNCHANGED, except two widenings ----

// (a) CourseId gains the third course.
export type CourseId = "python" | "sql" | "system-design"

// (b) TutorialLevelId widens to cover the system-design 0..11 range.
//     Python stays pinned to 1..4 (PythonLevelId), SQL to 1..5 — those aliases are unchanged.
//     Only the shared TutorialLevelId (used by TutorialLessonProgress.levelId and the SQL/SD level id) widens.
export type TutorialLevelId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11
export type PythonLevelId = 1 | 2 | 3 | 4        // unchanged
```

> **Why widen `TutorialLevelId` rather than remap to 1..12?** The curriculum ids are stable and authored (`sd-l0-…` through `sd-l11-…`, see `CURRICULUM-MAP.md`), and L0 ("Interview & Communication Method") is intentionally "level zero." Remapping to 1-based would desync every authored `lessonId`, the map JSON, and the research doc. Widening the shared numeric union is a type-only change with no serialized-shape impact. The Firestore progress schema (§3) widens in lockstep.

### §1.2 `DesignExercise` — the free-response payload

System design's payload has **no** `executionMode`, `starterCode`, `testCases`, `seedSql`, `workspace`, or `assertions`. It carries the material for read-think-write-reveal-selfcheck:

```ts
// lib/tutorials/types.ts  (additive)

/** One self-check line the learner ticks off comparing their answer to the model. */
export interface DesignRubricItem {
  id: string          // stable within the exercise, e.g. "estimates-qps"
  /** What a strong answer must contain, phrased so the learner can self-verify. */
  label: string       // "Estimated read:write ratio and peak QPS with stated assumptions"
}

/** A free-response system-design exercise. The system-design analog of PythonExercise / SqlExercise. */
export interface DesignExercise {
  /** `sd-l{N}-{slug}-{apply|practice}`. Stable; used as the answer-persistence key (§3). */
  id: string
  /** Markdown prompt. MUST lead with the deliverable ("Design…", "Explain how you would…",
   *  "Choose and justify…") per the content style rules. */
  prompt: string
  /** Guiding questions shown beside the editor to structure thinking. Ordered. */
  thinkAbout: string[]
  /** The model answer, revealed on demand (never auto-shown). Markdown; may embed an ASCII diagram
   *  fence or reference an image. Built from the map's `modelAnswerOutline`. */
  modelAnswer: string
  /** Self-comparison checklist shown after reveal. 3-7 items. Drives the (optional) self-rating. */
  selfCheckRubric: DesignRubricItem[]
  /** Optional monospace architecture sketch rendered in a <pre>; simplest diagram path, no deps. */
  asciiDiagram?: string
  /** Optional image (same-origin under /public, or a data: URI) for a richer reference diagram. */
  referenceDiagram?: string
  difficulty: DifficultyLevel   // reuses "easy" | "medium" | "hard"
}

// ---- concrete instantiation (mirrors PythonLevel / SqlLevel) ----
export type SystemDesignLesson = TutorialLesson<DesignExercise>
export type SystemDesignModule = TutorialModule<DesignExercise>
export type SystemDesignLevel  = TutorialLevel<DesignExercise>
```

Field-by-field map from `CURRICULUM-MAP.md` / `curriculum-map.json` so the content author has a mechanical target:

| Map field | `DesignExercise` field |
|---|---|
| `applyPrompt` | `apply.prompt` |
| `thinkAbout[]` | `apply.thinkAbout[]` |
| `modelAnswerOutline[]` (expanded to prose) | `apply.modelAnswer` |
| `learnFocus` (expanded to a lesson) | `teach.markdown` |
| `difficulty`, `skills`, `estimatedMinutes` | lesson-level fields (unchanged) |

### §1.3 Read / Apply / Practice reuse

The engine's three-phase spine is inherited unchanged. `SECTION_LABEL` (`lessonPhases.ts`) already reads teach="Read", apply="Apply", practice="Practice" — no change.

- **Read (`teach`)** — pure `TeachSection.markdown`. `demoCode`/`demoSeedSql`/`showDemoInput` are simply omitted (they are already optional), so `TeachPanel` renders markdown with **no** Run button. Diagrams live inside the markdown (ASCII in a code fence, or an image).
- **Apply** — the guided `DesignExercise`: the prompt with the full `thinkAbout` list visible, and the model answer revealable.
- **Practice** — a **harder design variant, still free-response.** `TutorialLesson<E>` requires *both* `apply` and `practice` (non-optional), and lesson completion in the shared model requires `practice` to be completed (`lessonStatus === "completed"` iff `sections.practice === "completed"`, see `tutorial-store.ts`). So **every system-design lesson MUST author a `practice: DesignExercise`** — a tougher or adjacent prompt (e.g. Apply "design the read path"; Practice "now make it multi-region and defend the consistency choice"). This keeps the completion model identical across all three courses.

> **Content-contract note for AGENT-2:** `CURRICULUM-MAP.md` currently specifies only one Apply prompt per lesson. To satisfy the shared type, each lesson also needs a Practice prompt + model answer + rubric. Author it as a harder variant of the same concept. (Alternative considered and rejected: making `practice` optional in the shared type — rejected because it forks the completion model and touches Python/SQL call sites for a content-shaped gap.)

---

## 2. The Answer-Capture Component — `DesignAnswerPanel`

New `components/tutorials/DesignAnswerPanel.tsx`. It occupies the slot the code runners occupy in the other players (`ExerciseRunner`, `SqlExerciseRunner`, `WorkspaceExerciseRunner`) and reuses the same surrounding layout primitives (`ExerciseLayout` + `ExerciseBrief`) so the screen reads identically. It has **no** `useExerciseRun`, no CodeMirror, no results panel.

### §2.1 Anatomy

Reusing `ExerciseLayout` (aside = brief, main = answer surface), exactly as `SqlExerciseRunner` does:

- **Aside (`ExerciseBrief`)** — `eyebrow`/`title`/`resurfaces` from `brief`, `prompt` from `exercise.prompt`, and a **Think about** list rendering `exercise.thinkAbout` (the `data` slot, where the SQL runner puts its schema preview).
- **Editor** — a plain, controlled `<textarea>` (Markdown), NOT CodeMirror. System-design answers are prose + bullet lists + the occasional ASCII box diagram; a monospace-friendly textarea with a live `MarkdownRenderer` "Preview" toggle is the right tool and adds zero dependency. Label it `answer.md`, styled like the runner's editor chrome for visual parity.
- **Action row** — `Save` (primary), `See model answer` (secondary, always available — no attempt-gating, since there is nothing to attempt), `Reset` (clears to empty), and a live word-count + a min-length affordance.
- **Model answer (revealed)** — on reveal, render `exercise.modelAnswer` via `MarkdownRenderer` inside a `Reveal`-style disclosure; render `asciiDiagram` in a `<pre>` and `referenceDiagram` as a bounded `<img>` if present. Reveal is one-way per session (mirrors the runner's "Show solution").
- **Self-check rubric** — after reveal, render `exercise.selfCheckRubric` as a checkbox list ("Did your answer cover…?"). The count checked feeds the optional self-rating (§4).
- **Self-rating (optional)** — a 1–5 "How close was your answer?" control, defaulted from the rubric tick count but learner-adjustable. Maps to `lastExerciseScore` (§4).

### §2.2 Props (parallel to `SqlExerciseRunnerProps`)

```ts
export interface DesignAnswerPanelProps {
  exercise: DesignExercise
  /** Controlled answer text (owned by the player, keyed by exercise id, survives phase switches). */
  answer: string
  onAnswerChange: (value: string) => void
  /** Fires once the completion predicate is first met (saved ≥ MIN_ANSWER_CHARS AND model revealed).
   *  The player uses this to un-hide SectionDoneButton — the exact role runner `onPass` plays. */
  onReady?: (selfRating?: number) => void
  /** Phase framing for the left brief (eyebrow + title + resurfaces chip). */
  brief?: ExerciseBriefMeta
  /** Persistence wiring (§3): initial saved answer + a debounced saver. */
  savedAnswer?: string
  onSave?: (text: string, selfRating?: number) => void
}
```

### §2.3 Required UI states (per CLAUDE.md React rules)

- **Empty** — no answer yet: editor placeholder ("Sketch your design. Assumptions → high-level components → data flow → tradeoffs."), `See model answer` available, `Mark as done` hidden.
- **Draft (unsaved)** — dirty indicator ("Unsaved draft"), Save enabled. Local draft is autosaved to `localStorage` for zero-latency resilience (§3).
- **Saved** — "Saved" confirmation with timestamp; server write in flight shows a subtle spinner, success/failure is non-blocking (answers are best-effort like progress).
- **Loading (resume)** — while the saved answer is being fetched on mount, show a skeleton in the editor; never overwrite a learner's in-progress local draft with a slower server fetch.
- **Error** — save failed: inline, non-destructive banner ("Couldn't save your answer. Your draft is kept locally.") — the localStorage draft guarantees no data loss.
- **Unauthenticated** — the page is already hard-gated (`proxy.ts` + `LearnAuthGuard`), so a signed-out user never reaches the panel. Defense-in-depth: if the token is absent, the server save no-ops (client wrapper returns null, mirroring `progress-client`), the localStorage draft still works, and completion still functions locally for the session.
- **Model-revealed** — model answer + rubric checklist + self-rating shown; `See model answer` becomes a collapse toggle.

---

## 3. Answer Persistence

### §3.1 Decision — a new server-owned, auth-gated collection + a localStorage draft complement

Two things are persisted for a system-design lesson, and they are deliberately **separate concerns**:

1. **Section/lesson progress** (which of Read/Apply/Practice are complete, `lastExerciseScore`) → the **existing** `user_tutorial_progress` collection, written by the **unchanged** progress path (§4). This is what powers the level path %, resume, and dashboards — identical to Python/SQL.
2. **The learner's free-text answer** (private user content, potentially long) → a **new** `user_design_answers` collection. This is genuinely new state with no analog in the code courses (Python/SQL keep editor text only in local component state; there is nothing worth persisting server-side because grading is deterministic). Design answers are the learner's actual work product and must survive across devices and sessions, so they are server-owned.

Per the memory constraint *"learner answers are private user data; persistence must be server-owned and auth-gated (mirror the progress collection),"* the answer store mirrors `progress.ts` exactly: Admin SDK, ownership-checked reads, server-owned timestamps, `undefined` omitted. A **localStorage draft-autosave** is layered on top purely for zero-latency resilience and offline drafting — it is a complement, never the source of truth.

### §3.2 Firestore doc shape

Collection `user_design_answers`, deterministic id `${userId}__${exerciseId}` (mirrors `progressDocId`). `exerciseId` is the `DesignExercise.id` (`sd-l{N}-{slug}-{apply|practice}`), guaranteeing no collision across lessons/phases.

```ts
export interface DesignAnswer {
  userId: string          // server-owned, never trusted from the body
  exerciseId: string      // sd-l{N}-{slug}-{apply|practice}
  lessonId: string        // sd-l{N}-{slug} — for per-lesson listing / cleanup
  courseId: "system-design"
  /** The learner's free-text answer (Markdown). Length-bounded (§3.4). */
  text: string
  /** Optional 1-5 self-rating captured at save/completion time. */
  selfRating?: number
  /** true once the learner has revealed the model answer for this exercise. */
  modelRevealed: boolean
  startedAt: string       // ISO, server-owned, preserved across upserts
  updatedAt: string       // ISO, server-owned, stamped each write
}
```

### §3.3 API route

New `app/api/tutorials/design-answers/route.ts`, a thin mirror of `app/api/tutorials/progress/route.ts` (parse → auth → validate → service → respond), wrapped in `withAuth` from `lib/auth-helpers` so **every** method requires sign-in:

- `GET ?exerciseId=…` → `{ answer: DesignAnswer | null }` (resume one exercise's answer).
- `GET ?lessonId=…` → `{ items: DesignAnswer[] }` (both phases of a lesson; optional, for a future "review my answers" view).
- `PUT` body → upsert one answer → `{ answer }`.

Service module `lib/tutorials/design-answers.ts` (server-only, Admin SDK) exposes `getDesignAnswer(userId, exerciseId)`, `listLessonDesignAnswers(userId, lessonId)`, `upsertDesignAnswer(userId, input)` — structural clones of `getLessonProgress` / `listUserProgress` / `upsertLessonProgress`, including the `existing.userId !== userId → throw Error("UNAUTHORIZED")` ownership check that the route maps to 403. Client wrapper `lib/tutorials/design-answers-client.ts` mirrors `progress-client.ts`: attaches the Firebase bearer token, bounds reads with an 8s timeout, and degrades to `null`/`[]` when signed out.

### §3.4 Validation

Zod input schema in `design-answers.ts`, mirroring `tutorialProgressInputSchema` (server-owned fields omitted from the accepted body):

```ts
export const designAnswerInputSchema = z.object({
  exerciseId: z.string().min(1).max(120),
  lessonId: z.string().min(1).max(120),
  text: z.string().max(20_000),     // generous cap; guards against abuse / oversized docs
  selfRating: z.number().int().min(1).max(5).optional(),
  modelRevealed: z.boolean(),
})
```

`courseId` is server-stamped `"system-design"` (not trusted from the body). The route rejects a non-`sd-`-prefixed `exerciseId`/`lessonId` as defense-in-depth so this route can never write another course's namespace.

### §3.5 Autosave hook + draft

New `components/tutorials/useDesignAnswerSync.ts`, modeled on `useTutorialProgressSync.ts`:

- On mount: read the localStorage draft key `cs_sd_answer:${exerciseId}` immediately (zero-latency restore), then fetch the server answer; the newer of the two (by an updated-at stamp) wins, and a fetch never clobbers an in-progress local draft (same `hasLoaded` gating discipline as the progress sync).
- On change: write the localStorage draft synchronously; debounce (1s) the server `PUT`; flush the pending save on unmount / `visibilitychange:hidden` (identical discipline to `useTutorialProgressSync`, which exists precisely so "mark done → Next lesson" within the debounce window doesn't drop the write).
- Best-effort: signed-out → server save no-ops, draft still works.

> **Firestore rules:** `user_design_answers` needs the same owner-scoped rule already applied to `user_tutorial_progress` (`request.auth.uid == resource.data.userId`, id prefixed `${uid}__`). The route (Admin SDK) is authoritative; rules are defense-in-depth. Add the rule alongside the existing tutorial rule.

---

## 4. The Completion Signal Without a Grader

This is the crux of the course. In Python/SQL, the runner's `onPass` (all tests green) sets `passedSections[section] = true`, which un-hides `SectionDoneButton`; tapping it calls the player's `markComplete(section)` → `completeSection(section, score)`; the store change is autosaved. System design has **no grader**, so we define an explicit, non-gameable-enough predicate to stand in for "passed."

### §4.1 The completion predicate

`DesignAnswerPanel` considers an exercise **ready to mark done** when **both**:

1. **A saved answer of minimum length** — `text.trim().length >= MIN_ANSWER_CHARS` (recommend `MIN_ANSWER_CHARS = 120`, roughly two sentences of real design reasoning; tuned to block empty/"asdf" completions without demanding an essay), **and**
2. **The model answer has been revealed** (`modelRevealed === true`) — the learner has done the self-compare step, which is the actual learning act of a self-directed design drill.

When the predicate first becomes true, the panel calls `onReady(selfRating?)`. The player's handler is the exact analog of `markPassed`:

```ts
// in SystemDesignLessonPlayer
const markReady = (section: LessonSection, selfRating?: number) => {
  setPassedSections((prev) => ({ ...prev, [section]: true }))
  setRatingBySection((prev) => ({ ...prev, [section]: selfRating }))
}
```

`SectionDoneButton` is then un-hidden by the same `passed` prop it already takes — **the button component is reused unchanged.** Its contract ("only appears once passed; tapping saves the section") is honored; we simply supply a different definition of "passed."

### §4.2 Calling `completeSection` and mapping the self-rating

The player's `markComplete` is where the two code players hardcode `section === "practice" ? 100 : undefined`. The system-design fork threads the **self-rating** into the score instead:

```ts
// self-rating 1-5 → lastExerciseScore 0-100 (the store + schema clamp to [0,100])
const SELF_RATING_TO_SCORE: Record<1|2|3|4|5, number> = { 1: 20, 2: 40, 3: 60, 4: 80, 5: 100 }

const markComplete = (section: LessonSection) => {
  const rating = ratingBySection[section]
  const score = rating ? SELF_RATING_TO_SCORE[rating] : undefined  // undefined when un-rated
  completeSection(section, score)
  onSectionComplete?.(section)
}
```

`completeSection(section, score?)` already exists with an optional score → `lastExerciseScore`, and the store already sets `lessonStatus: "completed"` once `sections.practice === "completed"`. `useTutorialProgressSync` autosaves the resulting snapshot through the **unchanged** `PUT /api/tutorials/progress`. So:

- **No grader, no new completion path.** The completion write is byte-identical to Python/SQL; only the *trigger* differs (saved+revealed vs tests-passed) and the *score source* differs (self-rating vs test pass %).
- `lastExerciseScore` is **optional** everywhere (type, schema, store, doc) — an un-rated completion simply omits it, exactly as a Python `apply` completion omits it today. This respects `TutorialLessonProgress.lastExerciseScore?` being optional.

### §4.3 `SectionDoneButton` gating — what changes and what doesn't

`SectionDoneButton.tsx` is **reused unchanged**. Its `passed` input is fed by the new predicate instead of the runner. To make the gate legible to the learner (there is no green "tests passed" moment), `DesignAnswerPanel` surfaces the two conditions inline as a tiny checklist above the button: "① Write & save your answer (120+ chars) · ② Reveal the model answer to self-compare." Once both tick, `onReady` fires and the existing `SectionDoneButton` appears. This keeps the *component* reused while giving system design an honest, visible bar.

> **Anti-gaming note:** the bar is intentionally light (this is self-directed practice, not a proctored exam). The value is in reading + attempting + comparing, and completion should reward *doing the loop*, not *passing a judge*. The optional AI self-assessment (§6) is the path to a stronger, rubric-based signal — but it stays off by default and never blocks completion.

---

## 5. Player, Routes, Registry, and `CourseId` Wiring — Every Touch Point

### §5.1 `SystemDesignLessonPlayer` (thin fork of `SqlLessonPlayer`)

New `components/tutorials/SystemDesignLessonPlayer.tsx`. `SqlLessonPlayer` is itself a thin fork of `LessonPlayer`; the system-design fork keeps the entire shell (3-column grid, header, `LessonRail`, `LessonHeader`, `SableTutor`, `VerticalRail`, resume-on-load, `nextStep` level hand-off, progress bar) and changes only:

- **Registry imports** → `lib/tutorials/system-design/registry.ts` (`getNextSystemDesignLessonInLevel`, `getFirstLessonOfNextSystemDesignLevel`, `listSystemDesignLessonsInLevel`).
- **`renderExercise`** → renders `DesignAnswerPanel` (there is no `executionMode` branch; system design is never a workspace). Answer text is held per-exercise in a `answerByExercise` state (survives Apply↔Practice switches), mirroring `codeByExercise`.
- **`markComplete`** → threads the self-rating (§4.2) instead of the hardcoded `practice ? 100`.
- **Prewarm** → removed (no runtime to compile; delete the `prewarmSqlRuntime` effect).
- **Static strings** → base path `/learn/system-design`, document title `"… — Learn System Design"`, tutor-persistence keys `cs_sd_tutor_open` / `cs_sd_rail`.
- **Answer persistence** → wire `useDesignAnswerSync` per active exercise (§3.5) and pass `savedAnswer` + `onSave` into `DesignAnswerPanel`.

No changes to `TeachPanel` (rendered with no `demoLanguage`/`demoCode` → markdown only), `SectionDoneButton`, `ExtraPracticeSection`, `LessonRail`, `LessonHeader`, `LessonOutline`, `ExerciseLayout`, `ExerciseBrief`, or `Reveal` — all reused as-is.

### §5.2 Route tree — mirror `app/learn/sql/*`

| SQL | System design | Kind |
|---|---|---|
| `app/learn/sql/page.tsx` | `app/learn/system-design/page.tsx` | **Server** — level selector over `listSystemDesignLevels()` |
| `app/learn/sql/layout.tsx` | `app/learn/system-design/layout.tsx` | Server layout (wraps `LearnAuthGuard`) |
| `app/learn/sql/[levelSlug]/page.tsx` | `app/learn/system-design/[levelSlug]/page.tsx` | **Server** — module/level path list (`toLevelListModel` + `computeLevelPath` with `basePath="/learn/system-design"`) |
| `app/learn/sql/[levelSlug]/[lessonId]/page.tsx` | `app/learn/system-design/[levelSlug]/[lessonId]/page.tsx` | **Client** — resolves via `getSystemDesignLessonLocation`, renders `<SystemDesignLessonPlayer key={lesson.id} …>` |

`lib/tutorials/level-path.ts` is already course-agnostic (`toLevelListModel(level: TutorialLevel<unknown>)`, `computeLevelPath(model, completed, basePath)`) — **reused verbatim**; only `basePath` differs.

### §5.3 Registry — parallel `lib/tutorials/system-design/registry.ts`

A structural clone of `lib/tutorials/sql/registry.ts` over `SYSTEM_DESIGN_LEVELS`, with the same function surface renamed: `listSystemDesignLevels`, `getSystemDesignLevel(id)`, `getSystemDesignLevelBySlug(slug)`, `getSystemDesignModule`, `listAllSystemDesignLessons`, `getSystemDesignLesson`, `getSystemDesignLessonLocation`, `getNextSystemDesignLesson`, `getNextSystemDesignLessonInLevel`, `listSystemDesignLessonsInLevel`, `getFirstLessonOfNextSystemDesignLevel`. **Parallel, not merged** — keeps Python/SQL call sites untouched (lowest blast radius), consistent with the SQL registry decision. Content lives in `lib/tutorials/system-design/curriculum/{index,level0..level11}.ts` exporting `SYSTEM_DESIGN_LEVELS`.

> **Note:** there is **no** `getSystemDesignExerciseById` wired into `exercise-scenarios.ts`. That adapter exists only to feed the browser executor; system design never executes, so the adapter is untouched. (A `getSystemDesignExerciseById` may still live in the registry for the answer-persistence path to resolve a `DesignExercise` by id when hydrating.)

### §5.4 `CourseId` + auth — enumerated touch points

1. `lib/tutorials/types.ts` — `CourseId` gains `"system-design"`; `TutorialLevelId` widens to `0..11` (§1.1).
2. `lib/tutorials/progress.ts` — `tutorialProgressInputSchema.levelId` widens from `z.union([literal(1..5)])` to accept `0..11` (e.g. `z.number().int().min(0).max(11)` or the explicit union). No other progress change.
3. `proxy.ts` — `PROTECTED_ROUTES = ["/admin", "/learn/python", "/learn/sql", "/learn/system-design"]`. The existing prefix match (`pathname === route || pathname.startsWith(\`${route}/\`)`) then hard-gates every sub-path; execution is free (there is none), the *page* is auth-gated — same cost model as the other courses.
4. `firestore.rules` — add an owner-scoped rule for `user_design_answers` (§3.5).
5. Any "all courses" index/nav (e.g. a `/learn` hub, `LearnPathTopBar` links) — additive entry for System Design. Optional; not required for the vertical slice.

`TutorialLessonProgress.courseId` is optional and already `CourseId`-typed; system-design progress may stamp `"system-design"` for clean dashboards (backfill-free; absent still means Python). The store, `progress-client`, and `useTutorialProgressSync` are **reused unchanged**.

---

## 6. Optional AI Self-Assessment (Phase 2, feature-flagged, auth-gated, OFF by default)

A Phase-2 enhancement — **not** the primary path and not required for launch. When enabled, after the learner saves an answer and reveals the model, they may tap **"Get AI feedback"**; Sable grades the saved answer against `selfCheckRubric` + `modelAnswer` and returns structured feedback (per-rubric-item covered/missing + one improvement). This must obey the platform's cost policy.

- **Route:** new `app/api/tutorials/design-review/route.ts`, `POST`, wrapped in `withAuth` — **sign-in required** (per the *cost-bearing-routes-require-auth* memory: chat/feedback/execute/analyze-complexity are all auth-gated; an LLM grader is cost-bearing and joins them). No guest access.
- **Feature flag:** gated behind a server-side flag (e.g. `FEATURE_DESIGN_AI_REVIEW`), **default off**. The button does not render when the flag is off; the route returns 404/403 when the flag is off even if called directly.
- **Cost controls:** (a) per-user rate limit / daily cap on reviews; (b) input length already bounded to 20k chars (§3.4); (c) one model call per request, no fan-out, no vector search; (d) cache by `(exerciseId, hash(text))` so re-review of an unchanged answer is free (clear invalidation: hash changes → new call); (e) a cheap model tier is sufficient (rubric adherence, not generation).
- **Never blocks completion.** §4 completion stands entirely on saved+revealed. AI feedback is additive coaching; a failed/disabled AI call degrades gracefully to the manual self-check rubric.
- **Reliability:** third-party failure is user-readable ("AI feedback is unavailable right now — use the self-check list below"), never a hard error.

---

## 7. UI Reuse Summary

Additions total: one `DesignAnswerPanel` + one rubric-checklist sub-component (can live in the same file), one `useDesignAnswerSync` hook, one `SystemDesignLessonPlayer` fork, and copy. Reused unchanged: `TeachPanel`, `LessonOutline`, `LessonRail`, `LessonRailStrip`, `LessonHeader`, `ExerciseLayout`, `ExerciseBrief`, `SectionDoneButton`, `ExtraPracticeSection`, `Reveal`, `ReadOnlyCodeBlock` (for model-answer code snippets), `SableTutor`, `VerticalRail`, `MarkdownRenderer`, `usePersistentState`, `useCompletedLessons`, `LevelSelector`/`LevelPathView`, and the entire `lib/tutorials/level-path.ts`. No CodeMirror, no results panel, no `useExerciseRun`, no execution imports. Server/client boundaries are identical to SQL: level selector + level path are Server Components; the lesson page is a Client Component under `LearnAuthGuard`.

---

## 8. Build Order + Definition of Done

### §8.1 Phased build (thin vertical slice first)

1. **Type + panel + one proof lesson, end-to-end.** Add `DesignExercise` + `SystemDesign*` aliases + `CourseId`/`TutorialLevelId` widening to `types.ts`. Build `DesignAnswerPanel` (editor + Save + reveal + rubric + self-rating, all local state first — no server yet). Hand-author **one** L1 lesson (`sd-l1-…`) with `apply` + `practice`, and drive it through a throwaway page. Prove: think-about renders, save+reveal un-hides `SectionDoneButton`, `completeSection` fires and the progress autosave writes `user_tutorial_progress/${uid}__sd-l1-…`.
2. **Answer persistence.** Add `design-answers.ts` (service + zod), `design-answers-client.ts`, `app/api/tutorials/design-answers/route.ts` (`withAuth`), `useDesignAnswerSync` (server + localStorage draft), and the `firestore.rules` entry. Prove: answer survives reload and cross-device; draft survives a failed save.
3. **Player fork + registry + routes + auth.** `SystemDesignLessonPlayer`, parallel `system-design/registry.ts`, `SYSTEM_DESIGN_LEVELS` skeleton, `app/learn/system-design/*` route tree, `proxy.ts` line. Wire resume + `nextStep` level hand-off (reused).
4. **Polish.** Completion checklist affordance, Markdown preview toggle, ASCII/image diagram rendering, self-rating UX, cold-empty/error states, `LearnPathTopBar`/hub link.
5. **Content.** Author all levels from `CURRICULUM-MAP.md` into `DesignExercise` objects (each lesson: `teach.markdown` from `learnFocus`, `apply` + a harder `practice`, `thinkAbout`, `modelAnswer` from `modelAnswerOutline`, `selfCheckRubric`). One lesson per `/loop` iteration (AGENT-2). No em dashes in learner-facing prose; prompts lead with the deliverable.
6. **Phase 2 (optional, later).** Feature-flagged AI self-assessment (§6), default off.
7. **Verification** (§8.3).

### §8.2 Definition of Done (vertical slice)

- One L1 system-design lesson runs Read → Apply → Practice end-to-end: Read completes on Continue; Apply and Practice complete via the **saved-answer + model-revealed** predicate; `SectionDoneButton` (unchanged) gates on it; `completeSection` writes to the **unchanged** `user_tutorial_progress` path with `lessonStatus:"completed"` after Practice.
- Learner answers persist to `user_design_answers/${uid}__sd-l{N}-{slug}-{apply|practice}` via the auth-gated route, resume on reload, and survive a failed save via the localStorage draft. A signed-out request to the answer route is rejected; the page is unreachable when signed out (`proxy.ts` + `LearnAuthGuard`).
- `lastExerciseScore` is written from the self-rating when provided and **omitted** when not (optional throughout).
- **Execution layer is git-clean:** `browser-execution.ts`, `python-sandbox/`, `sql-sandbox/`, `exercise-scenarios.ts` show no diff — proving system design added zero execution code.
- Python and SQL are fully unregressed: `PythonLevelId`/aliases preserved, existing routes/registries/tests untouched, `CourseId`/`levelId` widenings are additive.
- `/learn/system-design/*` renders the level selector, level path, and lesson player; the level path % / resume / "Up next" / level hand-off all work via reused `level-path.ts` + registry.
- New logic is tested: the completion predicate (min-length + revealed), the self-rating→score map, the `design-answers` service (ownership check, timestamp discipline, `undefined` omission, zod validation), and the answer-sync merge (draft vs server) — mirroring `lib/tutorials/__tests__` and the progress tests.

### §8.3 Verification commands

```
pnpm typecheck
pnpm lint
pnpm test        # incl. new design-answers service + completion-predicate + rating-map suites
pnpm build
```

All four pass, plus a manual live run of the proof lesson in `pnpm dev` (save/reveal/complete + reload-resume can't be fully exercised headless).

### §8.4 Risks / edge cases

- **Practice authoring gap.** The shared type requires a `practice` per lesson but `CURRICULUM-MAP.md` specs only one Apply. *Mitigation:* AGENT-2 authors a harder Practice variant per lesson (§1.3); the vertical slice validates the shape before mass authoring.
- **Level-id range.** Curriculum L0–L11 forces the `TutorialLevelId` + progress-zod widening (§1.1/§5.4). Miss either and L0/L6–L11 progress writes 400 at the route. Land both together and add a schema test.
- **Gameable completion.** A light predicate can be trivially satisfied. *Mitigation:* accept it (self-directed practice, not a proctored exam); `MIN_ANSWER_CHARS` blocks empties; §6 is the path to a stronger rubric-based signal, opt-in.
- **Answer size / cost.** Free-text can balloon. *Mitigation:* 20k-char cap (§3.4), one small doc per exercise, localStorage draft to avoid chatty saves (1s debounce + flush).
- **Draft vs server merge.** A stale localStorage draft could shadow a newer server answer (or vice-versa) across devices. *Mitigation:* updated-at comparison on load, never clobber an in-progress local edit (the `hasLoaded` discipline from `useTutorialProgressSync`).
- **Diagram rendering.** Keep it dependency-free: ASCII in a `<pre>`, optional same-origin/`data:` image. No Mermaid/graph lib (consistent with the learn-graph-viz research verdict).
- **Private data leakage.** Answers are personal; the route is `withAuth`, ownership-checked, and rules-scoped — never expose another user's answer. `courseId`/namespace is server-stamped, not body-trusted.
