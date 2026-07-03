# Technical Spec — "Learn SQL & Databases" Course

**Status:** Proposed · **Author:** Senior Eng · **Mirrors:** `docs/python-curriculum/ARCHITECTURE.md` · **Scope:** 4 levels / 18 modules / 44 lessons of SQL, built on the Learn-Python machinery.

---

## 0. Guiding Principle — Reuse, Don't Rebuild

The Learn-Python subsystem is already a **course-shaped engine**: a typed content tree, a synchronous registry, a per-user progress doc keyed by `lessonId`, a shared grading hook, a 3-column Lesson Player, and a browser execution dispatcher with two grading protocols (single-file test-cases and a `__WORKSPACE_TEST_RESULTS__:` JSON marker). SQL is *another language plugged into that same engine*, not a second engine.

Concretely, **the only genuinely new subsystem is a SQLite-in-the-browser runner** (`lib/workspace-execution/sql-sandbox/`, mirroring `python-sandbox/`). Everything else is either reused verbatim or generalized by widening a couple of union types. The single most important design constraint drives everything below:

> **The SQL workspace runner MUST emit the byte-identical `__WORKSPACE_TEST_RESULTS__:` + `JSON.stringify([{suite,name,passed,error,isHidden}])` marker that the Python workspace runner emits.** If it does, `result-parser.ts`, `formatWorkspaceResult()`, `useExerciseRun`, and the entire results UI are reused with **zero** changes. This is the spine of the whole plan.

### §0.1 Reuse vs Extend vs Build-new (mirrors ARCHITECTURE.md §9)

| Concern | File(s) | Verdict | Note |
|---|---|---|---|
| Content-tree types | `lib/tutorials/types.ts` | **Extend** | Generalize `PythonLevelId` and slug unions; add `SqlExercise` grading fields (see §1). One shared skeleton, two courses. |
| Registry | `lib/tutorials/registry.ts` | **Extend** | Add `courseId` param OR a parallel `sqlRegistry`; reuse the same pure-read shape. See §1/§6. |
| Curriculum assembly | `lib/tutorials/curriculum/index.ts` | **Build-new (parallel)** | New `lib/tutorials/sql/curriculum/index.ts` exporting `SQL_LEVELS = [sqlLevel1..4]`. Pure content. |
| Progress collection | Firestore `user_tutorial_progress` | **Reuse as-is** | Same collection, namespaced by `lessonId` (`sql-l{N}-{slug}`). No new collection. §6. |
| Progress service | `lib/tutorials/progress.ts` | **Reuse as-is** | Doc id `${uid}__${lessonId}` is already course-agnostic. Only `levelId` type widens. §6. |
| Progress client | `lib/tutorials/progress-client.ts` | **Reuse as-is** | Reads/writes by `lessonId`; no SQL awareness needed. |
| Tutorial store / autosave | `components/tutorials/useTutorialProgressSync.ts` | **Reuse as-is** | Debounced save + resume operate on `lessonId`. |
| Lesson Player | `components/tutorials/LessonPlayer.tsx` | **Reuse as-is** | Renders Read/Apply/Practice from a `Lesson`; language-agnostic. §5. |
| Lesson Outline / stepper | `components/tutorials/LessonOutline.tsx` | **Reuse as-is** | Section stepper is content-driven. |
| Teach panel | `components/tutorials/TeachPanel.tsx` | **Extend (tiny)** | Markdown + Run-demo already work; demo must dispatch `language:"sql"`. §5. |
| Single-file runner UI | `components/tutorials/ExerciseRunner.tsx` | **Extend (tiny)** | One CodeMirror + hints + gated reference — add SQL language mode + results-grid view. §5. |
| Workspace runner UI | `components/tutorials/WorkspaceExerciseRunner.tsx` | **Reuse as-is** | File tabs + hidden-file exclusion + marker parsing are already generic. §4/§5. |
| Shared grading hook | `components/tutorials/useExerciseRun.ts` | **Reuse as-is** | Calls `executeScenarioInBrowser` and renders `BrowserExecutionResult`. Unchanged. |
| Auth gate (route) | `proxy.ts` `PROTECTED_ROUTES` | **Extend (1 line)** | Add `"/learn/sql"`. §7. |
| Auth gate (in-page) | `components/tutorials/LearnAuthGuard.tsx` | **Reuse as-is** | Wraps the client lesson page. |
| Results panel | `components/tutorials/ExecutorSidePanel.tsx`, `test-result-mapping.ts` | **Reuse as-is** | Consumes `BrowserExecutionResult`; grid view is an additive sub-component. §5. |
| CodeMirror editor | `components/editor/CodeMirrorEditor` | **Extend** | Add `@codemirror/lang-sql` to the language map. §5. |
| Execution dispatch | `lib/workspace-execution/browser-execution.ts` | **Extend** | Add `"sql"` to `isBrowserExecutionLanguage()` + two dispatch branches. §3/§4. |
| Exercise→Scenario adapter | `lib/tutorials/exercise-scenarios.ts` | **Extend** | Carry `seedSql`/`assertionQueries` through the one documented `as unknown as Scenario` cast. §3. |
| Cold-start note | `components/tutorials/ColdStartNote.tsx` | **Extend (copy)** | "Starting SQL engine…" variant. §5. |
| **SQL execution engine** | `lib/workspace-execution/sql-sandbox/` + `public/workers/sql-sandbox-worker.js` | **BUILD-NEW** | The only real new subsystem. sql.js in a worker, mirroring `python-sandbox/`. §2. |

Net new code: one runner directory, one worker file, one results-grid sub-component, ~6 lines of union/dispatch widening, plus content.

---

## 1. Data Model

### §1.1 Decision — generalize the shared skeleton, keep grading course-specific

Two options were weighed:

- **Option A — parallel `lib/tutorials/sql/types.ts`** that re-declares `SqlLevel/Module/Lesson` and re-imports `TeachSection`, `TutorialLessonProgress`, `SectionStatus` verbatim. Zero risk to the Python types; cost is a near-duplicated Level/Module/Lesson skeleton (structural drift risk over time).
- **Option B — generalize `lib/tutorials/types.ts` into course-agnostic generics.** `Level/Module/Lesson` become shared; the *exercise* type is the only course-divergent shape.

**Chosen: Option B, minimally.** The Level→Module→Lesson→(Read/Apply/Practice) skeleton is genuinely identical across both courses — duplicating it violates the repo's DRY rule ("do not duplicate … Firestore document-shape assumptions"). But we generalize *only what is truly shared* and keep the grading payload course-specific via a discriminated union, so we don't over-abstract.

Refactor of `lib/tutorials/types.ts`:

```ts
// ---- shared, course-agnostic ----
export type CourseId = "python" | "sql"
export type TutorialLevelId = 1 | 2 | 3 | 4          // was PythonLevelId (kept as alias)
export type PythonLevelId = TutorialLevelId          // back-compat alias — no churn in registry/progress

export interface TeachSection { markdown: string; demoCode?: string; estimatedMinutes: number }
export type SectionStatus = "not_started" | "in_progress" | "completed"
export type ExerciseExecutionMode = "single-file" | "workspace"

// Lesson/Module/Level become generic over the exercise payload:
export interface TutorialLesson<E> {
  id: string; title: string; summary: string; estimatedMinutes: number
  difficulty: DifficultyLevel; skills: string[]
  teach: TeachSection; apply: E; practice: E
}
export interface TutorialModule<E> { id: string; title: string; description: string; lessons: TutorialLesson<E>[] }
export interface TutorialLevel<E> {
  id: TutorialLevelId; slug: string; title: string; tagline: string
  defaultExecutionMode: ExerciseExecutionMode; estimatedHours: number; modules: TutorialModule<E>[]
}

// Python keeps its concrete instantiation (no call-site changes):
export type PythonLevel = TutorialLevel<PythonExercise>   // etc.
```

`TutorialLessonProgress` is **unchanged** except `levelId: TutorialLevelId` (already `1|2|3|4`, so this is a rename-only widening). Progress is 100% shared (see §6).

### §1.2 `SqlExercise` + grading contract

SQL diverges from Python in exactly one place: **the grader needs a seed database and (for L1/L2) an expected result set, or (for L3/L4) assertion queries.** Define:

```ts
export interface SqlResultSet {
  columns: string[]
  rows: unknown[][]          // row-major, column order matches `columns`
}

export interface SqlSingleFileGrading {
  /** DDL + DML run once to build the DB the learner queries. */
  seedSql: string
  /** The single expected result set for the reference SELECT. */
  expected: SqlResultSet
  /** true → row order must match (learner used ORDER BY). Default false → compare as multiset. */
  orderMatters?: boolean
  /** true → string cell comparison is case-insensitive. Default false. */
  caseInsensitive?: boolean
}

export interface SqlAssertion {
  suite: string
  name: string
  /** Query that MUST return zero rows on success (the dbt "count of violations = 0" convention). */
  sql: string
  isHidden?: boolean
}

export interface SqlWorkspaceGrading {
  seedSql: string
  /** Run AFTER the learner's multi-statement script, in order. */
  assertions: SqlAssertion[]
  /** true → the grader runs the learner script twice and asserts identical row counts (idempotency). */
  checkIdempotency?: boolean
}

export interface SqlExercise {
  id: string                 // `sql-l{N}-{slug}-{apply|practice}` — used directly as executor scenarioId
  prompt: string
  executionMode: ExerciseExecutionMode
  starterCode: string        // single-file: editor seed SQL; workspace: initial script
  hints: string[]
  referenceSolution?: string // single-file only, gated reveal after 2 fails (Apply); never present on Practice
  singleFile?: SqlSingleFileGrading  // required when executionMode === "single-file"
  workspace?: SqlWorkspaceGrading    // required when executionMode === "workspace"
}

export type SqlLevel = TutorialLevel<SqlExercise>
```

This mirrors `PythonExercise` exactly (id-as-scenarioId, `starterCode`, `hints`, gated `referenceSolution`, mode-discriminated grading payload). The **Read → Apply → Practice** spine (Apply reveals reference after 2 fails; Practice never reveals) is inherited unchanged from the shared `TutorialLesson<E>` and the existing `useExerciseRun` gating logic — no SQL-specific work.

---

## 2. The One New Subsystem — SQL Execution in the Browser

New directory `lib/workspace-execution/sql-sandbox/`, a structural clone of `lib/workspace-execution/python-sandbox/`. Engine: **sql.js** (SQLite 3 compiled to WASM). It plays the same role Pyodide plays for Python — a single self-hosted WASM module executed inside a Web Worker.

### §2.1 Worker file + WASM hosting

- New worker at `public/workers/sql-sandbox-worker.js`, mirroring `public/workers/python-sandbox-worker.js`. The main-thread runner instantiates it exactly as Python does: `new Worker("/workers/sql-sandbox-worker.js")`.
- The worker loads sql.js and locates the WASM binary via `locateFile: () => "/wasm/sql-wasm.wasm"` (self-hosted under `public/wasm/`). Unlike the Python worker's multi-MB Pyodide CDN fetch, sql.js is ~1 MB and served same-origin — **cheaper and more reliable cold start.**

### §2.2 Cold-start caching + worker lifecycle (mirror `worker-runner.ts` / `warm-state.ts`)

New `lib/workspace-execution/sql-sandbox/worker-runner.ts` copies the Python pattern verbatim:

- Module-level singleton `let sqlWorker: Worker | null`; `getSqlWorker()` lazily constructs it; `resetSqlWorker()` `terminate()`s and nulls it. The **initialized `SQL.Database` engine lives inside the worker and is reused across runs** — the WASM module is compiled once (the expensive step) and every subsequent query is instant. This is the direct analog of the Pyodide warm-state comment in `worker-runner.ts` ("Downloading + initializing … is a multi-MB fetch … keep it warm").
- A per-run timeout guards runaway queries; on timeout, resolve-before-reset ordering is preserved exactly as in the Python runner (resolve the pending promise, *then* `resetSqlWorker()` to avoid nulling `pendingRun` before resolution). A fresh `SQL.Database` is created per run inside the worker (cheap) while the compiled WASM module stays warm — so one exercise's schema never leaks into the next.
- A `warm-state.ts` sibling can pre-warm the worker on lesson mount (fire `getSqlWorker()` early) so the first Run isn't the first compile.

### §2.3 seed → run → compare flow

The worker accepts a message `{ mode, seedSql, code, expected?, assertions?, checkIdempotency? }` and:

1. `db = new SQL.Database()` (fresh, in-memory).
2. `db.exec(seedSql)` — build tables + rows.
3. `mode === "single-file"`: `const res = db.exec(learnerSelect)` → normalize sql.js's `[{columns, values}]` output into `SqlResultSet {columns, rows}`. Compare to `expected` (§3).
4. `mode === "workspace"`: `db.exec(learnerScript)` (multi-statement), then run each assertion query; build the results array and `postMessage` the `__WORKSPACE_TEST_RESULTS__:` marker string (§4).
5. Always `db.close()` in a `finally`, and terminate never leaks (`resetSqlWorker()` on error).

Files added: `sql-sandbox/worker-runner.ts`, `sql-sandbox/single-file-runner.ts`, `sql-sandbox/workspace-runner.ts`, `sql-sandbox/warm-state.ts`, `sql-sandbox/index.ts`, `public/workers/sql-sandbox-worker.js`, `public/wasm/sql-wasm.wasm`. This mirrors `python-sandbox/{worker-runner,dsa-runner,workspace-runner,warm-state,index}.ts` one-to-one.

---

## 3. Single-Query Grading Contract (L1/L2)

**Exercise carries `singleFile: { seedSql, expected, orderMatters?, caseInsensitive? }`; learner writes one `SELECT`; runner returns `{columns, rows}`; compare to `expected`.**

### §3.1 Adapter path (mirror `exercise-scenarios.ts`)

`lib/tutorials/exercise-scenarios.ts` already converts a tutorial exercise into the `Scenario` shape via a single documented `as unknown as Scenario` cast. Extend `getTutorialExerciseScenario()` to handle `SqlExercise`:

```ts
// single-file SQL → a DSA-like scenario carrying seedSql + a one-case expected result
if (exercise.executionMode === "single-file" && exercise.singleFile) {
  return {
    id: exercise.id,
    executionMode: "single-file",
    language: "sql",
    seedSql: exercise.singleFile.seedSql,
    testCases: [{
      input: {},                               // seed is global, not per-case
      expected: exercise.singleFile.expected,  // SqlResultSet
      description: "Result set matches",
      orderMatters: exercise.singleFile.orderMatters,
      // caseInsensitive rides along on the scenario
    }],
    caseInsensitive: exercise.singleFile.caseInsensitive,
  } as unknown as Scenario
}
```

The `as unknown as Scenario` cast stays the *single* documented escape hatch — we add fields (`seedSql`, `language:"sql"`), we don't invent a parallel casting convention.

### §3.2 Flow through `browser-execution.ts`

Two edits to `lib/workspace-execution/browser-execution.ts`:

```ts
function isBrowserExecutionLanguage(language: string): boolean {
  return language === "javascript" || language === "typescript"
      || language === "python"     || language === "sql"      // + sql
}
```

Then a dispatch branch in `executeScenarioInBrowser`, parallel to the existing `executePythonClientSide`:

```ts
return language === "python"
  ? executePythonClientSide(fullCode, testCases, options.scenario.id)
  : language === "sql"
    ? executeSqlClientSide(fullCode, testCases, options.scenario)  // reads scenario.seedSql
    : executeJsClientSide(fullCode, language, testCases, options.scenario.id)
```

`executeSqlClientSide` (new, in `sql-sandbox/single-file-runner.ts`) runs seed→SELECT in the worker, then compares result sets and returns a **`BrowserExecutionResult`** — the exact same shape the Python/JS single-file paths return — so `useExerciseRun` and `ExecutorSidePanel` consume it unchanged.

### §3.3 Result-set comparison

- **Columns:** compare `columns` arrays for equal length; column *names* are advisory (SQL lets you alias freely), so name-match is a soft check surfaced as a hint, not a hard fail, unless the lesson tests aliasing (then it's asserted).
- **Rows:** if `orderMatters` → deep-equal row-by-row; else → multiset compare (sort both sides by a canonical serialization, then equal). This is the SQL analog of the existing `orderMatters`/`compareAsSet` flags on `PythonTestCase`.
- **Cells:** numeric-vs-numeric compared by value; strings compared case-sensitively unless `caseInsensitive`. NULL === NULL for grading (SQLite returns JS `null`).
- **Empty result correctness:** `{columns:[...], rows:[]}` is a *valid, gradeable* expected value — an empty result set is a first-class answer (e.g. an anti-join that should find no orphans). The comparator must treat "0 rows expected, 0 rows returned" as pass, not as "no result."

---

## 4. Script/Workspace Grading Contract (L3/L4) — The Key Elegance

**Exercise carries `workspace: { seedSql, assertions[], checkIdempotency? }`. The learner writes a multi-statement DDL+DML script. After running it, a hidden assertion runner emits the identical marker the Python workspace runner emits — so the entire results pipeline is reused byte-for-byte.**

### §4.1 The marker contract (already established)

`lib/workspace-execution/result-parser.ts` scans worker stdout for `RESULTS_PREFIX = "__WORKSPACE_TEST_RESULTS__:"` and JSON-parses the trailing array into `WorkspaceTestResult[]` (`{suite, name, passed, error, isHidden}`). `formatWorkspaceResult()` in `browser-execution.ts` then maps that into `BrowserExecutionResult`. **The SQL workspace runner's sole responsibility is to produce that exact string.** Nothing downstream knows or cares that the language is SQL.

### §4.2 SQL workspace runner (`sql-sandbox/workspace-runner.ts`)

Inside the worker, after `db.exec(seedSql)` then `db.exec(learnerScript)`:

```js
const results = []
for (const a of assertions) {
  try {
    const res = db.exec(a.sql)
    const violations = res.length ? res[0].values.length : 0   // zero-rows-pass convention
    results.push({ suite: a.suite, name: a.name, passed: violations === 0,
                   error: violations ? `${violations} row(s) violated` : undefined,
                   isHidden: !!a.isHidden })
  } catch (e) {
    results.push({ suite: a.suite, name: a.name, passed: false, error: String(e), isHidden: !!a.isHidden })
  }
}
// idempotency: re-run learnerScript against a FRESH db seeded identically, compare total row counts
postMessage("__WORKSPACE_TEST_RESULTS__:" + JSON.stringify(results))
```

Assertions follow the **dbt "count of violations = 0"** convention already baked into the L4 Data-Quality lesson: each assertion query returns the *offending* rows; zero rows = pass. This is what the curriculum's "assertion queries" contract note describes, and it maps cleanly onto `passed: violations === 0`.

### §4.3 Idempotency check

When `checkIdempotency` is set, the runner seeds a second fresh DB, runs the learner script twice, and pushes a synthetic assertion `{suite:"idempotency", name:"run twice → same row count", passed: count1 === count2}` into the same results array. No new protocol — it's just one more entry in the marker JSON. This satisfies L4's "run twice, same count" requirement (SCD2, upsert, dedup lessons) using the existing pipeline.

### §4.4 Dispatch

In `executeScenarioInBrowser`, the workspace branch gains a language check symmetric to Python:

```ts
const result =
  language === "python" ? await executeWorkspaceScenarioPythonClientSide(scenario, edits)
: language === "sql"    ? await executeWorkspaceScenarioSqlClientSide(scenario, edits)
:                         await executeWorkspaceScenarioJsClientSide(scenario, edits)
return formatWorkspaceResult(result)   // UNCHANGED
```

The workspace scenario's `seedSql` + `assertions` are carried on `scenario.workspace` via the same `exercise-scenarios.ts` cast used for Python's `WorkspaceScenarioConfig`. `formatWorkspaceResult()`, `result-parser.ts`, `WorkspaceExerciseRunner.tsx`, and the results UI are touched **not at all**.

---

## 5. UI Reuse

Every lesson renders through the existing components with near-zero change; server/client boundaries are identical to Python.

- **`LessonPlayer.tsx`** (full-height 3-col: `LessonOutline` | Read/Apply/Practice center | `SableTutor`) — **unchanged.** It renders a `TutorialLesson<E>`; `E` being `SqlExercise` is transparent.
- **`LessonOutline.tsx`** — **unchanged.** Stepper is content-driven.
- **`TeachPanel.tsx`** — reuses `MarkdownRenderer` + Run-demo; the demo's Run button dispatches `executeScenarioInBrowser({language:"sql", …})` against the lesson's `seedSql`. The "warehouse callout" asides are plain markdown — no component work.
- **`ExerciseRunner.tsx`** (single-file) — reused; needs (a) the editor in SQL mode and (b) a **results-grid** view instead of the scalar/JSON test-output view, since a SELECT returns `{columns, rows}`. The grid is a new additive presentational sub-component (`components/tutorials/SqlResultGrid.tsx`) rendered inside the existing results slot; pass/fail chrome from `ExecutorSidePanel` is reused.
- **`WorkspaceExerciseRunner.tsx`** (L3/L4) — **unchanged.** File tabs, hidden-file exclusion, and marker-driven results all work as-is because §4 preserves the protocol.
- **`SableTutor.tsx`** — **unchanged.** Language-agnostic AI tutor; it reads the current lesson/section from context.
- **`useExerciseRun.ts`** — **unchanged.** Shared grading hook; calls `executeScenarioInBrowser` and renders `BrowserExecutionResult`. The 2-fails-reveal gating for Apply is inherited.
- **CodeMirror** (`components/editor/CodeMirrorEditor`) — **extend:** add `@codemirror/lang-sql` (`sql()` extension, SQLite dialect) to the editor's language map keyed on `"sql"`. New dependency; one map entry.
- **`ColdStartNote.tsx`** — **extend:** add a `"Starting SQL engine…"` copy variant (the SQL analog of "Starting Python…"), shown while the sql.js worker warms.

Additions total: one grid sub-component, one CodeMirror language entry, one cold-start copy string. No boundary moves — the level selector and module list stay Server Components; the lesson page stays a Client Component under `LearnAuthGuard`.

---

## 6. Persistence Reuse

**No new Firestore collection, no new API route.** `lib/tutorials/progress.ts` writes one doc per user-per-lesson at `user_tutorial_progress/${uid}__${lessonId}` (`COLLECTION = "user_tutorial_progress"`, id = `${userId}__${lessonId}`). SQL lesson ids are namespaced `sql-l{N}-{slug}` (Python uses `py-l{N}-…` / `sql-` guarantees no collision), so the two courses coexist in the same collection with zero risk of key overlap.

Required generalization (the only data-layer change):

- `TutorialLessonProgress.levelId` widens from `PythonLevelId` to `TutorialLevelId` (both are `1|2|3|4`, so this is a type-alias rename — no serialized-shape change, no migration).
- Optional but recommended: add a `courseId?: CourseId` field to the progress doc for clean per-course dashboards/filtering. It's additive and backfill-free (absent ⇒ `"python"`). If product doesn't need per-course rollups yet, skip it — the `sql-` id prefix already disambiguates.

`progress-client.ts` and `useTutorialProgressSync.ts` operate purely on `lessonId` and are reused verbatim. Firestore security rules already scope writes to `${uid}__*`; they need no change.

Registry: either add a `courseId` argument to the existing `registry.ts` readers (`getLevel(courseId, id)`, etc.) selecting between `PYTHON_LEVELS` and `SQL_LEVELS`, **or** ship a parallel `lib/tutorials/sql/registry.ts` with the same function surface over `SQL_LEVELS`. Recommendation: **parallel registry** — it keeps the Python call sites untouched (lowest blast radius) and the two registries are trivially thin pure reads; revisit merging only if a combined "all courses" view is needed.

---

## 7. Routes

Mirror `app/learn/python/*` under `app/learn/sql/*`, same server/client split:

| Python | SQL | Component kind |
|---|---|---|
| `app/learn/python/page.tsx` | `app/learn/sql/page.tsx` | **Server** — level selector (`LevelSelector`) over `SQL_LEVELS` |
| `app/learn/python/layout.tsx` | `app/learn/sql/layout.tsx` | Server layout |
| `app/learn/python/[levelSlug]/page.tsx` | `app/learn/sql/[levelSlug]/page.tsx` | **Server** — module list (`ModuleList`/`LevelModules`) |
| `app/learn/python/[levelSlug]/[lessonId]/page.tsx` | `app/learn/sql/[levelSlug]/[lessonId]/page.tsx` | **Client** — `LessonPlayer` under `LearnAuthGuard` |

Auth: add one entry to `proxy.ts`:

```ts
const PROTECTED_ROUTES = ["/admin", "/learn/python", "/learn/sql"]
```

The existing prefix match (`pathname === route || pathname.startsWith(`${route}/`)`) then hard-gates every SQL sub-path, exactly as it does for Python. Execution stays **free / no quota** (client-side sql.js); the page is auth-gated instead — identical to the Python cost model.

---

## 8. Effort / Build Order + Risks

### §8.1 Phased checklist (runner-first, thin vertical slice before content)

1. **Runner spike, one lesson end-to-end.** Add `sql-sandbox/` + `public/workers/sql-sandbox-worker.js` + `public/wasm/sql-wasm.wasm`. Add `"sql"` to `isBrowserExecutionLanguage` and one single-file dispatch branch. Hand-author **one** L1 lesson object (`sql-l1-select-columns`) and drive it through `useExerciseRun` on a throwaway page. Prove: cold start warms, seed→SELECT→compare passes and fails correctly, empty-result grades right.
2. **Workspace protocol.** Add `workspace-runner.ts`; emit the `__WORKSPACE_TEST_RESULTS__:` marker; add the workspace dispatch branch. Prove one L3 lesson (a `CREATE TABLE` + assertion) flows through `WorkspaceExerciseRunner` **with no UI edits**, plus the idempotency double-run.
3. **Generalize types.** Land the `TutorialLevel<E>` refactor in `lib/tutorials/types.ts` (keep `PythonLevelId`/`PythonLevel` aliases so Python call sites don't churn), add `SqlExercise`, widen `levelId`.
4. **Registry + routes + auth.** Parallel `sql/registry.ts`, `SQL_LEVELS` skeleton, `app/learn/sql/*` pages, `proxy.ts` line. Wire `LessonPlayer`.
5. **UI polish.** `SqlResultGrid`, `@codemirror/lang-sql`, `ColdStartNote` SQL copy.
6. **Content.** Author L1→L4 (44 lessons) against the finalized contract: L1/L2 supply `seedSql` + reference `SELECT` + `expected` + 2–3 hidden cases; L3/L4 supply `seedSql` + hidden assertion suites (+ idempotency where relevant). Ship the seeded `ecommerce_raw.db` DDL/DML as a shared `seedSql` constant.
7. **Verification** (§9).

### §8.2 Risks / edge cases

- **SQLite ⇄ warehouse dialect gaps.** sql.js is a specific SQLite build; features like `RIGHT/FULL OUTER JOIN` need SQLite ≥ 3.39, and `QUALIFY`/`MERGE` don't exist. *Mitigation:* author in the ANSI intersection; every divergence is already flagged as an inline "In the warehouse this differs…" Read callout per the curriculum contract. Pin the sql.js build version and add a smoke test that the seed lessons compile on it.
- **Non-determinism of unordered results.** A SELECT without `ORDER BY` returns rows in engine order; grading must default to **multiset** compare (`orderMatters:false`) and only demand order when the lesson teaches `ORDER BY`. Getting this backwards produces flaky false-fails.
- **Empty-result correctness.** `rows:[]` is a valid expected answer (anti-joins, DQ assertions). The comparator and the results-grid must render/grade "0 rows" as a real, passing outcome — not as an error or "no output."
- **Large seed data.** Big `seedSql` inflates lesson bundle size and per-run seed time. *Mitigation:* keep seeds small and shared (one `ecommerce_raw.db` seed constant reused across a level), not per-exercise copies; the worker keeps WASM warm so only the (small) seed re-runs.
- **Column-name vs value strictness.** Aliases are free-form in SQL; hard-failing on column names breaks legitimate answers. Default to value/shape comparison; assert names only in aliasing lessons.
- **Worker teardown ordering.** Reuse the Python runner's resolve-before-reset discipline exactly; a mis-ordered `resetSqlWorker()` nulls `pendingRun` and drops results (the same class of bug the Python `worker-runner.ts` comments call out).
- **WASM caching / CSP.** Self-host `sql-wasm.wasm` under `public/wasm/` (same-origin) rather than a CDN, so no CSP/network surprises and faster cold start than Pyodide.

---

## 9. Definition of Done + Verification

**Done when:**

- One L1 (single-file) and one L3 (workspace) SQL lesson run end-to-end through the **unchanged** `useExerciseRun` + results UI, including a correct fail, a correct pass, an empty-result pass, and (L4) an idempotency double-run.
- `browser-execution.ts` accepts `"sql"` and dispatches both modes; `formatWorkspaceResult` / `result-parser.ts` / `WorkspaceExerciseRunner.tsx` are **git-clean** (diff shows no changes) — proving the marker-protocol reuse.
- `/learn/sql/*` is gated by `proxy.ts` and renders under `LearnAuthGuard`; execution remains free/no-quota.
- Progress persists to `user_tutorial_progress/${uid}__sql-l{N}-{slug}` with resume working, no new collection or API route.
- Python course is fully unregressed (type aliases preserved; existing routes/tests untouched).
- New logic covered by tests: result-set comparator (order/multiset/empty/NULL/case), the SQL workspace marker emission, and the dispatch branches — mirroring the existing `lib/workspace-execution/__tests__` and `lib/tutorials/__tests__` suites.

**Verification commands (mirror the Python DoD):**

```
pnpm typecheck
pnpm lint
pnpm test        # incl. new sql-sandbox + comparator + exercise-scenarios(sql) suites
pnpm build
```

All four must pass, plus a manual live run of the two proof lessons in `pnpm dev` (the client-side execution path can't be fully exercised in headless unit tests).