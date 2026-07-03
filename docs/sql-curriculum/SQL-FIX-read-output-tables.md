# sql-fix — Show the data: input tables + query output in SQL lessons

**Status:** Plan (not yet implemented). Ready for a builder agent to pick up.
**Owner of intent:** product (see "Why" below).
**Scope:** SQL curriculum only. No Python changes. No backend/quota changes (execution is 100% client-side).

---

## Why (the problem)

A SQL prompt is meaningless without the data it runs against. Today a learner reads, for
example, the Apply task:

> "Return every order whose `total_cents` exceeds the overall average `total_cents` across all
> orders. Return `order_id` and `total_cents`, sorted by `order_id`."

…and is shown a code editor, a **Run** button, and a **Hint** — but **never the `orders` table**.
They cannot see the columns, the sample rows, or what a correct result should look like. They are
asked to transform data they cannot see.

Two concrete gaps:

1. **Input data is invisible.** Every SQL exercise already seeds a real database (`seedSql`), but
   that schema + sample rows is never rendered. The learner has to guess the shape of `orders`.
2. **The "Read" phase never shows a query "in action."** Teach shows SQL text but no result. The
   demo (`teach.demoCode`) is displayed read-only and **is never executed** — so learners see the
   query but not its output before they're asked to write their own.

**Goal:** In the Read phase and in the Apply/Practice exercises, show (a) the **input table(s)** the
query runs against (schema + a few sample rows) and (b) for worked examples in Read, the **output
table** the query produces. So the learner can always *see the data in action* before applying.

---

## Current state (researched — file\:line anchors)

### Data model — `lib/tutorials/types.ts`
- `TeachSection` (`types.ts:36-42`) = `{ markdown: string; demoCode?: string; estimatedMinutes: number }`.
  **No seed, no expected output.** So a teach demo cannot be executed as-authored (it references
  tables like `orders` that are only seeded on the exercises).
- `SqlResultSet` (`types.ts:133-136`) = `{ columns: string[]; rows: unknown[][] }` — the canonical
  tabular shape, already used by exercise grading.
- Seeds live only on exercises: `SqlSingleFileGrading.seedSql` + `.expected: SqlResultSet`
  (`types.ts:139-153`, L1/L2), and `SqlWorkspaceGrading.seedSql` (`types.ts:169-183`, L3/L4).
  `SqlExercise` hangs `singleFile?` / `workspace?` off both `apply` and `practice` (`types.ts:186-202`).

### Read/teach UI — `components/tutorials/TeachPanel.tsx`
- Renders `teach.markdown` via `MarkdownRenderer` (GFM tables **are** supported and styled —
  `lib/markdown/components.tsx:50-64`), then an optional read-only CodeMirror "Live example" for
  `teach.demoCode` (`TeachPanel.tsx:34-48`). **Nothing is executed; there is no output slot.**
- `SqlLessonPlayer` passes `demoLanguage="sql"` (highlighting only) (`SqlLessonPlayer.tsx:235-242`).

### Execution + result rendering (all reusable, all client-side/free)
- **`runSqlInWorker({ mode: "single-file", seedSql, code })`** →
  `{ success, result: { columns, rows }, error }`
  (`lib/workspace-execution/sql-sandbox/worker-runner.ts:130`). Runs `seedSql` + one SELECT in an
  in-browser sql.js Web Worker. **No network, no `/api/*`, no quota** (WASM is self-hosted at
  `/wasm/`, compiled once per session; `prewarmSqlRuntime()` already fires on lesson mount). This is
  the exact primitive for an **ungraded** demo — it bypasses the `expected`-set comparison that the
  graded `executeSqlClientSide` requires.
- **`SqlResultGrid`** (`components/tutorials/SqlResultGrid.tsx`) — standalone presentational table.
  Props: `result: SqlResultSet | null`, `label?`, `tone?: "neutral" | "actual" | "expected"`.
  Handles null / 0-rows / `NULL` cells / wide-table horizontal scroll. Currently used only inside
  `SqlExerciseRunner.tsx:137-140`. **Drop-in reusable** for both input previews and output tables.
- `ColdStartNote` (`components/tutorials/ColdStartNote.tsx`, `engine="sql"`) — ready "Starting SQL
  engine…" copy for the first run.
- ⚠️ Do **not** route demo runs through `useExerciseRun` (it's Python-oriented). Call the SQL worker
  directly.

### Authoring surface (sizing)
| Level | Lessons | teach `sql` blocks | result-returning (SELECT/WITH) | `demoCode` |
|---|---:|---:|---:|---:|
| L1 | 11 | 16 | 13 | 11 |
| L2 | 11 | 17 | 16 | 11 |
| L3 | 12 | 14 | 1 | 1 |
| L4 | 12 | 19 | 7 | 0 |
| **Total** | **46** | **66** | **37** | **23** |

Notes that shape the design:
- Only **SELECT/WITH** blocks (~37) produce a result table. The rest are DDL/DML (CREATE/INSERT/
  UPDATE) — for those the "output" is a schema/row-count effect, not a rows table.
- In L1/L2, each lesson's single `demoCode` usually **mirrors** its main markdown worked-example
  block (near-duplicate). L3 is almost all DDL (1 query). L4 is markdown-only (0 `demoCode`) and has
  the **one** already-hand-authored output table (`level4.ts:55-62`, a window-function ranking table).
- Fenced code lives **inside template literals with escaped backticks** (`` \`\`\`sql ``); any codemod
  must handle the escaping.

---

## Design (recommended)

Two independent, separately-shippable capabilities. **Ship Capability A first** — it addresses the
user's exact complaint (can't see the table) and covers *every* exercise for near-zero authoring cost.

### Capability A — Input data preview on exercises (Apply + Practice) ← highest value, do first
Render the seeded input table(s) next to every SQL exercise so the learner can see the columns and
sample rows they're querying.

- **No new authoring.** The `seedSql` already exists on every exercise. Derive the preview from it.
- **How:** on mount (engine is already prewarmed), run a tiny introspection in the worker against the
  exercise's `seedSql`:
  1. `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name` → table names.
  2. For each table, `SELECT * FROM "<t>" LIMIT 8` → `{columns, rows}`, plus a `COUNT(*)` for a
     "showing 8 of N rows" caption.
  - Reuse `runSqlInWorker` for each (or add a `mode: "introspect"` to the worker that returns all
    tables in one round-trip — preferred, avoids N worker calls; see Worker changes below).
- **Render:** a collapsible **"Data"** panel above/beside the editor, one `SqlResultGrid`
  (`tone="neutral"`) per table with the table name as `label`. Collapsed by default on Practice,
  expanded on Apply (tune later).
- **Where:** `SqlExerciseRunner.tsx` (single-file, L1/L2) and `WorkspaceExerciseRunner.tsx`
  (workspace, L3/L4). Both receive the exercise/workspace which carries `seedSql`. Extract a shared
  `<SqlDataPreview seedSql=… />` component so both runners and the teach panel can use it.

### Capability B — Worked-example output (and input) in Read
For result-returning demos in the teach phase, show the query's output table (and, where helpful, its
input tables) so the learner sees the query in action before Apply.

Decision: **execute live, don't hand-author outputs.** Hand-authored `{columns, rows}` drift because
nothing tests them; live execution is always correct and reuses the same engine. This requires a seed
in teach.

- **Data-model change** — extend `TeachSection` (`types.ts:36-42`):
  ```ts
  export interface TeachSection {
    markdown: string
    demoCode?: string
    /** Optional seed so the demo can be executed live to show its output (SQL lessons). */
    demoSeedSql?: string
    /** Optional: also render the seeded input tables above the demo output. */
    showDemoInput?: boolean
    estimatedMinutes: number
  }
  ```
  (Keep it optional and course-agnostic; Python teach simply omits it.)
- **Authoring:** for the ~37 result-returning demos, set `demoSeedSql`. Fastest path: **reuse the
  sibling `apply.singleFile.seedSql`** where the demo queries the same tables (true for most L1/L2),
  so authoring is often a one-line `demoSeedSql: <sameSeed>` or a shared const. Self-seeding demos
  (L4 style: CREATE+INSERT+SELECT in one block) can run the whole block as `demoCode` with an empty
  seed.
- **Render** — in `TeachPanel.tsx`, when `demoCode` + a seed are present and `demoLanguage==="sql"`:
  add a **"Run example"** button (or auto-run on first view) that calls
  `runSqlInWorker({ mode:"single-file", seedSql: demoSeedSql, code: demoCode })` and renders the
  returned set with `<SqlResultGrid tone="actual" label="Output" />` beneath the read-only code.
  Optionally render `<SqlDataPreview>` above it when `showDemoInput`.
- **Gating:** only when a seed is present and the demo language is SQL, so Python teach is untouched.
- **L3 (DDL-heavy):** output-as-rows mostly doesn't apply. Show the input preview and/or a simple
  "table created / N rows affected" affordance instead; don't force a rows grid.

### Worker change (small, enables both cleanly)
Add an `"introspect"` mode to `public/workers/sql-sandbox-worker.js` +
`SqlWorkerData`/`runSqlInWorker` (`worker-runner.ts`): given `seedSql`, return
`{ tables: Array<{ name: string; result: SqlResultSet; totalRows: number }> }` in one round-trip.
Avoids N worker messages for N tables and keeps the introspection SQL server-side of the boundary.
(Alternative if you want zero worker changes: loop `runSqlInWorker` per table on the main thread —
simpler to ship, slightly chattier.)

---

## Phased implementation

1. **Phase 1 — `SqlDataPreview` + worker introspect.** New shared component
   `components/tutorials/SqlDataPreview.tsx` (props: `seedSql`, optional `limit`), backed by the new
   `introspect` worker mode. Renders one `SqlResultGrid` per seeded table with a "showing N of M
   rows" caption. Handles loading (`ColdStartNote`) / empty / error.
2. **Phase 2 — wire into exercises (Capability A).** Add `<SqlDataPreview>` to `SqlExerciseRunner`
   and `WorkspaceExerciseRunner`, sourced from the exercise's `seedSql`. This alone resolves the
   reported problem for all 46 lessons with no content edits. Ship it.
3. **Phase 3 — teach output (Capability B).** Extend `TeachSection` with `demoSeedSql` /
   `showDemoInput`; update `TeachPanel` to run the demo and render output via `SqlResultGrid`; reuse
   `SqlDataPreview` for input.
4. **Phase 4 — content authoring.** Populate `demoSeedSql` for the ~37 result-returning demos
   (front-loaded in L1/L2; ~7 in L4; migrate the one hand-authored L4 table to the live-rendered
   output). L3 gets input previews / effect notes rather than rows grids.

Phases 1–2 are the high-value core and are independent of any content work. Phase 4 is the bulk of the
effort and can be parallelized per level (same pattern the curriculum was authored with).

---

## Testing / verification
- Unit: `SqlDataPreview` renders columns/rows for a known `seedSql`; empty-table and error states.
- The `introspect` worker mode: given a multi-table seed, returns each table with correct
  `columns`/`rows`/`totalRows`.
- Reuse the existing scratchpad verify harness pattern (see `docs/sql-curriculum/` authoring flow) to
  confirm every populated `demoSeedSql` + `demoCode` actually executes and returns a non-error set.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`. Manually drive one L1 lesson (input preview + demo
  output) and one L4 lesson (self-seeding demo) in the browser.

## Cost / risk
- **Runtime cost: zero.** All execution is the existing client-side sql.js worker (no network, no
  quota, WASM cached per session, engine prewarmed on mount). Introspection queries are trivially
  cheap on lesson-sized seeds.
- **Main risk:** authoring drift is *avoided* by executing live rather than hand-authoring outputs.
- **Blast radius:** additive. `TeachSection` fields are optional; Python teach and existing grading
  paths are untouched. `SqlResultGrid` / `runSqlInWorker` are reused unchanged.

## Reused building blocks (do not rebuild)
`runSqlInWorker` (single-file + new introspect mode) · `SqlResultGrid` · `SqlResultSet` ·
`prewarmSqlRuntime` / `isSqlRuntimeWarm` · `ColdStartNote` · `MarkdownRenderer` (GFM tables).

## Key files to touch
`lib/tutorials/types.ts` (TeachSection) · `public/workers/sql-sandbox-worker.js` +
`lib/workspace-execution/sql-sandbox/worker-runner.ts` (introspect mode) ·
`components/tutorials/SqlDataPreview.tsx` (new) · `components/tutorials/TeachPanel.tsx` ·
`components/tutorials/SqlExerciseRunner.tsx` · `components/tutorials/WorkspaceExerciseRunner.tsx` ·
`lib/tutorials/sql/curriculum/level{1,2,3,4}.ts` (author `demoSeedSql`).
