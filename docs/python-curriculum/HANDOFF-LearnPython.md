<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- ✅ IMPLEMENTATION STATUS & HANDOFF — READ THIS FIRST                       -->
<!-- ════════════════════════════════════════════════════════════════════════ -->

# ✅ Learn Python — what's already built (read before extending)

The **backend framework + a working end-to-end vertical slice** is implemented, tested, and on
`main` (Agent 1). The design spec further down this file is the *target* for the UI Agent; the
sections below tell the **curriculum-author Agent** and the **UI Agent** exactly what exists, the
contracts to honor, and where to plug in. **Do not rebuild any of this — extend it.**

Engine status: the **Teach → Apply → Practice loop runs for real** — a signed-in user reads a
lesson, writes Python, runs it **client-side (Pyodide, in-browser)**, and sees graded results;
completion **persists to Firestore and resumes on reload**. One single-file sample lesson (Level 1)
and one workspace sample lesson (Level 3) ship as the canonical references.

> **Execution is client-side, NOT a server call.** Code runs via
> `executeScenarioInBrowser` (`lib/workspace-execution`, Pyodide for Python). **Piston /
> `POST /api/execute` is deprecated** — do not wire new execution through it. Client execution is
> free, so tutorial runs have **no quota**; the page is auth-gated instead.

## ✅ UI surface SHIPPED (read before changing the Learn-Python screens)

The design spec below (§B/§C/§E) is **implemented** on top of the engine. What the UI Agent added:

- **Screen 1 / Path** — `app/learn/python/page.tsx` (accent hero + `ResumeLearning` "Continue
  Level N" island) → `LevelSelector` (connected numbered spine + clay fill, completion-hydrated) →
  `LevelCard` (selectable node) + `LevelPreviewPanel` (sticky: `CodeWindow` faux sample, phase strip,
  topic chips, progress-aware Start/Continue/Review CTA). Samples live in `lib/tutorials/level-previews.ts`.
- **Between** — `app/learn/python/[levelSlug]/page.tsx` stays a Server Component; `LevelModules`
  is a client island that overlays per-lesson completion + an "n/total done" bar.
- **Screen 2 / Lesson** — `LessonPlayer` is now the full-height **3-column workspace + top bar**:
  `LessonOutline` (stepper + Up-next) | center phase (`LessonHeader` + Teach/Apply/Practice) |
  `SableTutor` (reactive AI tutor + FAQ chips). Sable reacts to a `SableEvent` stream the player
  emits from real run/hint/reference events (no LLM, no cost).
- **Shared** — `useExerciseRun` gained `onResult` + a session `warming` flag ("Starting Python…"
  cold-start). Hidden workspace test rows are masked via the pure `lib/tutorials/test-result-mapping.ts`
  (`mapResultRow`, unit-tested). Syntax tokens `--kw/--str/--com/--fn/--num/--gut` in `globals.css`
  ride the root View Transition. `Reveal` = transform-only reveal-on-scroll. Level pointer:
  `lib/tutorials/level-preference.ts` (`cs_py_level`).

Verified: `pnpm typecheck`, `pnpm lint` (tutorial scope), `pnpm test` (incl. the masking regression),
and `pnpm build` all green. The live browser e2e is still the one unrun check.

## Module map (what exists)

```
lib/tutorials/
  types.ts                 # PythonLevel→Module→Lesson + PythonExercise + TutorialLessonProgress
  registry.ts              # listLevels/getLevel/getLevelBySlug/getModule/getLesson/
                           #   getLessonLocation/getNextLesson/getExerciseById/listAllLessons
  exercise-scenarios.ts    # getTutorialExerciseScenario: PythonExercise → Scenario (fed to the client runner)
  progress.ts              # Admin SDK service (server-only): get/list/upsert + Zod input schema
  progress-client.ts       # token-attached fetch wrappers (degrade to null/[] when signed out)
  curriculum/
    index.ts               # PYTHON_LEVELS = [level1..4]
    level1/index.ts        # ✅ single-file SAMPLE (to_celsius/to_fahrenheit) — copy this for L1/L2
    level2/index.ts        # shell (Agent 2 fills)
    level3/index.ts        # ✅ workspace SAMPLE (parse_config across files) — copy this for L3/L4
    level4/index.ts        # shell (Agent 2 fills)
  __tests__/               # registry / exercise-scenarios / progress  (pnpm test)
lib/stores/tutorial-store.ts                 # Zustand: active-lesson progress (no persist middleware)
components/tutorials/
  LevelSelector, LevelCard, ModuleList, LessonRow   # Path + module-list UI (server-renderable)
  LessonPlayer                                       # section stepper + per-exercise code state + resume
  TeachPanel                                         # Read phase (markdown + read-only demo)
  ExerciseRunner                                     # single-file: one editor + hints + gated reference
  WorkspaceExerciseRunner                            # workspace: file tabs (hidden files excluded)
  useExerciseRun                                     # SHARED grading hook (both runners use it)
  useTutorialProgressSync                            # load-on-mount resume + 1s debounced autosave
  LearnAuthGuard                                     # in-page auth redirect (defense-in-depth)
app/learn/python/
  layout.tsx                       # wraps the section in LearnAuthGuard
  page.tsx                         # SERVER: level selector (listLevels)
  [levelSlug]/page.tsx             # SERVER: module list (getLevelBySlug)
  [levelSlug]/[lessonId]/page.tsx  # CLIENT: the Lesson Player
app/api/tutorials/progress/route.ts          # withAuth GET one / GET all / PUT (Zod-validated)
firestore.rules                              # owner-only `user_tutorial_progress` block
proxy.ts                                     # PROTECTED_ROUTES includes /learn/python (Edge gate)
```

---

## 👤 Curriculum-author Agent (Agent 2) — how to add lessons

You only write **content objects**; the registry + runner + persistence pick them up automatically.
Add a `PythonLesson` to the right `lib/tutorials/curriculum/levelN/index.ts` `modules[].lessons[]`.
**Copy `level1` (single-file) or `level3` (workspace) as your template** — they are the source of truth.

**IDs (globally unique — enforced by `registry.test.ts`):** lesson `py-l{N}-{slug}`,
exercises `py-l{N}-{slug}-apply` and `py-l{N}-{slug}-practice`.

**Single-file contract (L1/L2 — `executionMode: "single-file"`):**
- `starterCode` defines a **named function whose `def` is the FIRST `def` in the file** (the grader
  calls the first def). State the exact signature in `prompt`.
- `testCases[]`: `{ input: { argName: value, … }, expected, description }` — `input` keys are passed
  **positionally in key order**, so key order must match the parameter order. Numeric `expected` is
  compared with tolerance (so `100.0` matches `100`).
- **Param-name trap (the executor auto-coerces these to ListNode/TreeNode):** never name a plain
  param `root/tree/node/p/q/t1/t2/left/right/subroot` (→ TreeNode) or `head/list/l1/l2` (→ ListNode).
  Safe: `nums, arr, n, k, target, data, x, a, b, f, c, raw, text, …`.
- Always provide `referenceSolution` + `hints[]`. (`apply` reveals the reference after 2 fails;
  `practice` never does.)

**Workspace contract (L3/L4 — `executionMode: "workspace"`):** a complete `WorkspaceScenarioConfig`:
- `primaryFilePath` ∈ `editableFilePaths`; **≥1 `visibleTestPaths` and ≥1 `hiddenTestPaths`**; every
  referenced path must exist in `files[]` (else `validateWorkspaceScenario` rejects it — caught by tests).
- **Every Python package dir needs an `__init__.py`** entry (empty, `role:"readonly"`/`"test"`), or
  `from app… import …` fails at runtime.
- The runner (`testRunnerPath`, `role:"test"`, `hidden:true`) does `sys.path.insert(0, os.getcwd())`,
  imports the test modules, runs each module's `run_tests(record)`, and prints
  `__WORKSPACE_TEST_RESULTS__:` + `json.dumps([...])` where each row is
  `{suite, name, passed, error, isHidden}`. `isHidden` is derived from `"hidden" in suite.lower()`.
- Mark hidden tests + the runner `hidden:true` so their source never reaches the editor (they still run).
- Provide `referenceFiles[]` (the correct editable files).

**Verify your lesson:** `pnpm typecheck && pnpm test` (registry + exercise-scenarios suites catch
id collisions and invalid workspace configs). For workspace lessons you can also run the runner in a
real `python3` against your reference + starter before shipping (reference must pass all tests; starter
must fail gracefully). Deeper detail: `ARCHITECTURE.md` §4–5 and `AGENT-2-curriculum-developer.md`.

---

## 🎨 UI Agent — architecture, extension points & what's intentionally minimal

**Reuse, don't rebuild.** Execution, grading, results UI (`components/interview/TestResultsPanel`),
the editor (`components/editor/CodeMirrorEditor` — CodeMirror 6, Tab→4-spaces, theme-following),
persistence, and the data-driven content engine all already work. Everything is **data-driven by the
chosen level** via the registry — keep it that way.

**Where to build (the current UI is functional but plain — elevate it to the spec below):**
- **Screen 1 / Path** (`app/learn/python/page.tsx` + `LevelSelector`/`LevelCard`) is a 2-col card grid
  today. Target (§B): a **connected vertical path** (numbered spine + clay progress fill) on the left
  and a **sticky preview panel** on the right that updates per selected level (faux code window,
  phase strip, topic chips, counts, "Start Level N"). `localStorage["cs_py_level"]` is not set yet.
- **Screen 2 / Lesson** (`[levelSlug]/[lessonId]/page.tsx` + `LessonPlayer`) is single-column today.
  Target (§C): the **3-column workspace** `[248px outline | 1fr lesson | 300px tutor]`, never collapse
  the center < ~400px; below 1080px scroll as a unit. The Read/Apply/Practice **stepper** + an
  "Up next" list go in the left outline; **Sable, the AI tutor**, goes in the right column (greets with
  level context, reacts to every run/hint — there is **no Sable component yet**, build it).
- **Theme crossfade** (§E): the global crossfade must recolor the syntax tokens
  (`--kw/--str/--com/--fn/--num/--gut`) in this surface too; reveal-on-scroll is transform-only and
  respects `prefers-reduced-motion`.
- A per-lesson **completion overlay** for `LessonRow`/`LevelCard` (it accepts an optional `isCompleted`
  prop already) can hydrate from `progress-client.fetchAllProgress()`.

**Hard rules:**
- Keep server/client boundaries: the **selector + module-list pages are Server Components**; the
  **Lesson Player is a Client Component**. Don't make the static pages client.
- Don't re-introduce Piston/`/api/execute`; run code through `executeScenarioInBrowser`.
- Don't duplicate execution/validation/results logic — wire the shared `useExerciseRun` hook and
  reuse `components/ui/*` primitives + `HANDOFF.md` §1–2 tokens (warm clay, Geist, dark default).
- Editor text must persist across phase switches (it does — `LessonPlayer` lifts per-exercise code).

---

## ✅ Curriculum content is COMPLETE (Agent 2) — what the UI binds to, read before building

All four levels are authored, verified, and green: **46 lessons** (44 tickets + the 2 pinned samples) —
single-file in L1/L2, workspace in L3/L4. Authored on branch `claude/python-curriculum-content` and
merged to `main`. You **render** content; you don't author it. The whole surface is **data-driven by
the registry** — bind to `listLevels()` / `getLevelBySlug()` / `getLessonLocation()` /
`getNextLesson()` / `getLesson()`. **Never hardcode** level/module/lesson counts: modules per level
vary (L1×5 → 13 lessons, L2×5 → 12, L3×6 → 11, L4×5 → 10).

**Per lesson you render** `title`, `summary`, `estimatedMinutes`, `difficulty` (`easy|medium|hard`),
`skills[]`, then the three phases — `teach` (`markdown` via `MarkdownRenderer` + optional `demoCode`
"Run demo"), `apply`, `practice`. Each exercise has `prompt` (markdown; states the exact function
signature), `starterCode`, `hints[]`, and either `testCases` (single-file) or a `workspace` config
(file tabs).

- **`skills[]` are curated + audited for honesty** — safe to use directly as topic chips / filter
  facets (a lesson tagged `dataclasses` actually uses dataclasses). `estimatedMinutes` is set on every
  lesson *and* every `teach` — use for the Path preview's lesson-count/time and the module list.
- **Hints reveal progressively; the reference is gated** — `apply` reveals `referenceSolution` after
  **2 failed runs**, `practice` **never**. Preserve that in the player.
- **Run/grade ONLY through the shared `useExerciseRun` hook** (client-side Pyodide via
  `executeScenarioInBrowser`). `demoCode` runs the same way with no tests. Do **not** call `/api/execute`.
- **Pyodide cold start is multi-second** on the first Run of a session (it downloads + boots the WASM
  runtime). Show an explicit "starting Python…" state on the first run so it doesn't read as hung;
  later runs are fast.
- **Workspace lessons** (`WorkspaceExerciseRunner`): render file tabs from `workspace.files` but
  **exclude every `hidden:true` file** (the hidden tests + the runner) from the editor — they still
  execute. Result rows carry `isHidden`; show hidden failures as "a hidden test failed" **without**
  revealing the source or the assertion text.
- **Two L4 lessons use deliberately sandbox-safe shapes — these are intentional, not stubs/bugs:** the
  Pyodide runtime has **no OS threads** and runs inside an **already-active event loop**, so
  `py-l4-concurrency` uses a `ThreadPoolExecutor`-with-sequential-fallback and `py-l4-asyncio` runs
  coroutines via a provided read-only `aio/loop.py` `run_coroutines()` helper instead of `asyncio.run`.
  If you upgrade the Pyodide worker later (≥0.27.7 + JSPI + COEP headers → real threads/`asyncio.run`),
  you can restore the "textbook" forms; until then, leave the lesson code as-is.
- **Completion overlay**: hydrate `isCompleted` on `LessonRow`/`LevelCard` from
  `progress-client.fetchAllProgress()`. Editor text already persists across phase switches (the player
  lifts per-exercise code) — don't re-implement it.

The two canonical samples — `py-l1-temperature` (single-file) and `py-l3-parse-config` (workspace) —
live inside the curriculum and render like any other lesson; they're good fixtures while building the
player. Content was audited (grading contracts, workspace integrity, pedagogy, and registry/regressions
all passed) — so you can build the UI against final, stable content.

---

## Shared invariants & commands

- Progress doc: `user_tutorial_progress/${uid}__${lessonId}`; `userId` + timestamps are **server-owned**
  (never trusted from the client). Auth gate = `proxy.ts` PROTECTED_ROUTES + `LearnAuthGuard`.
- Lesson + exercise ids are **globally unique** (registry test enforces); execution is **free** (no quota).
- Verify everything: `pnpm typecheck && pnpm lint && pnpm test`. (Note: repo-wide `pnpm lint` currently
  reports **pre-existing** admin `jsx-a11y` errors unrelated to this feature — the tutorial surface is clean.)
- The remaining unrun check is the **live browser e2e** (`pnpm dev` → sign in → `/learn/python` →
  run a lesson → reload resumes; signed-out → `/login`).

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- ⬇️  ORIGINAL UI/UX DESIGN SPEC (the target the UI Agent builds toward)     -->
<!-- ════════════════════════════════════════════════════════════════════════ -->

# CodeSparring — Learn & Apply Python (developer handoff)

Goal: build the **interactive Python learning feature** on the CodeSparring system — warm charcoal + single clay accent, Geist + Geist Mono, light/dark. Two surfaces: a **level-select Path** and a **lesson workspace** driven by the chosen level. Uses the shared tokens in `HANDOFF.md` (§1–2: colors, light/dark crossfade, fonts). Defaults to **dark**. Icons: **Lucide**.

The product idea: not a flat black-and-white tutorial. The learner **picks one of 4 levels first**, then every lesson runs the same **Read → Apply → Practice** loop, getting deeper each level — Level 1 is reference-style basics, Levels 3–4 are real engineering syntax and working across actual files.

---

## A. The four levels (curriculum model)
Each level is the same loop at increasing depth. Carry the chosen level forward (we use `localStorage["cs_py_level"]`, 1–4).

| Lvl | Name | Loop | What's new |
|----|------|------|-----------|
| 1 | **Foundations** | Read | Reference-style basics — variables, types, loops, functions. Read + a live example beside every concept (the w3schools job, done well). |
| 2 | **Apply** | Read → Apply | Read a concept, then **write it** in an editor with an instant check. |
| 3 | **Patterns** | Read → Apply → Practice | The syntax real codebases run on — dataclasses, decorators, context managers, typing — drilled with practice from production-shaped code. |
| 4 | **Codebase** | + Files | Work **across real files** — a repo tree, follow imports, change a function, prove it with a test. |

The loop phases are the spine: **Read** (understand), **Apply** (write it yourself), **Practice** (a real-world variant that "resurfaces in 3 days" — ties into the spaced-repetition story).

## B. Screen 1 — Python Path (level select)
- Standard sticky nav ("Learn Python" active) + theme toggle.
- Centered hero: one headline, short subtitle, and a **Read → Apply → Practice** pill row.
- Two columns: **left** = the four levels as a connected vertical path (numbered spine, a clay progress fill), each a clickable card showing its phase badges; **right** = a **sticky preview panel** that updates for the selected level — a faux code-window with a syntax-highlighted sample, the phase strip (Read/Apply/Practice/Files with inactive ones dimmed), topic chips, lesson count / time / audience, and a **Start Level N** CTA.
- Clicking **Start** sets `localStorage["cs_py_level"]` and navigates to the lesson.

## C. Screen 2 — Python Lesson (workspace)
Full-height 3-column tool (`min-width:1080px`, body scrolls horizontally below that — never collapse the center):
`[ 248px outline | 1fr lesson | 300px tutor ]`.

- **Top bar:** logo · **LEVEL N** badge (links back to Path) · lesson title · "Lesson n / total" + progress bar · theme toggle · **Levels** (back to Path).
- **Left outline:** the **Read / Apply / Practice** stepper (numbered, a clay spine-fill, completed steps get a check) + an "Up next" list. Steps are clickable to revisit.
- **Center:** the active phase.
  - **Read** — real teaching: motivating intro, "the long way" vs the idiom, an **anatomy** breakdown of the syntax, a filter/variant section, a real-world example, a "keep it readable" caution, and a **Recap**. Ends with "I've got it — let me try" → Apply.
  - **Apply** — a task, an **editable code editor** (textarea: line-number gutter that grows with the code, **Tab inserts 4 spaces**, content **persists** when you switch phases), **Run & check**, and a **Hint**. Pass → green result block + a "Practice it" button; fail → a specific nudge.
  - **Practice** — a harder, real-world variant (e.g. filter+map a list of orders) with a "Resurfaces in 3 days" chip.
- **Right:** **Sable**, the AI tutor — greets with the level context and reacts to every run, hint, and question ("nudge, not spoil").

Everything (badge, title, counts, Up-next, all three phases' content + checks + hints, Sable's greeting) is **data-driven by the chosen level** — one engine, a lesson object per level.

## D. The "real implementation" note (important)
The mock's **Run & check fakes execution** — it pattern-matches the source and shows a canned result. For production, run the learner's code for real **in the browser with [Pyodide](https://pyodide.org)** (CPython compiled to WASM): execute in a worker, capture stdout, and assert against expected output / unit tests. That gives true output (so learners can `print()` and see results, not just pass/fail), real error messages, and trustworthy checks. Budget this — it's the core of the feature, not a detail. The editor should also graduate from a styled `<textarea>` to **CodeMirror 6** (Python mode) for real syntax highlighting, autocomplete, and bracket matching; keep the Tab-to-spaces and persistence behaviors.

## E. Theme & motion
- Dark default; the global crossfade (HANDOFF.md §2) recolors everything including the code-syntax tokens (`--kw/--str/--com/--fn/--num/--gut`).
- Reveal-on-scroll is transform-only; respect `prefers-reduced-motion`.

## F. Acceptance
- Path: selecting a level updates the sticky preview (sample, phases, topics, CTA); **Start** stores the level and the lesson opens on it.
- Lesson: badge/title/counts/Up-next/Read/Apply/Practice all match the chosen level; Tab indents; typed code survives phase switches; Run shows pass/fail with a result; Sable reacts.
- Dark default, no flash; toggle crossfades the whole workspace incl. syntax colors.
- Center editor never collapses < ~400px; below 1080px the workspace scrolls as a unit.
