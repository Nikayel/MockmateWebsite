# sql-fix — Show the data in SQL lessons (run with `/loop`)

A `/loop` runbook: ship the "see the data" feature for the SQL course one verifiable slice per
iteration. In the Read (teach) phase and the Apply/Practice exercises, show (a) the **input table(s)**
the query runs against and (b) for worked examples in Read, the **output table** the query produces —
so a learner can always see the data in action before writing SQL. Scope is SQL only; no Python
changes; execution stays 100% client-side (no backend, no quota).

---

## How to run it

```
/loop ship the next slice of docs/sql-curriculum/SQL-FIX-read-output-tables.md
```

`/loop` (no interval → dynamic, self-paced) re-enters this runbook each iteration. Each iteration does
**one slice** below, verifies it (typecheck + the stated check), commits (as the user, no Claude
co-author, `git -c commit.gpgsign=false commit`), and stops the loop only when the **Definition of
done** is met. Commit after every slice; for the Phase-4 authoring pass, one commit per level is
normal.

Before the first iteration, read the **Reference** section (below) end-to-end — it has the exact
file\:line anchors, the reusable building blocks, and the data-model decisions. Do not rebuild the SQL
engine or the result grid; both already exist.

---

## What each iteration does (the slices, in order)

Each slice is independently shippable and verifiable. Do them top-to-bottom.

1. **Slice 1 — `introspect` worker mode.** Add a `mode: "introspect"` to
   `public/workers/sql-sandbox-worker.js` + `SqlWorkerData`/`runSqlInWorker`
   (`lib/workspace-execution/sql-sandbox/worker-runner.ts`): given `seedSql`, run it on a fresh DB,
   then return `{ tables: Array<{ name: string; result: SqlResultSet; totalRows: number }> }` (one
   `SELECT * FROM "t" LIMIT n` + a `COUNT(*)` per user table from `sqlite_master`). One round-trip.
   *Check:* a unit test in `lib/workspace-execution/__tests__/sql-sandbox.test.ts` — a 2-table seed
   returns both tables with correct columns/rows/totalRows.

2. **Slice 2 — `SqlDataPreview` component.** New `components/tutorials/SqlDataPreview.tsx`
   (props: `seedSql: string`, optional `limit`, optional `defaultOpen`). Calls the introspect mode,
   renders one `<SqlResultGrid tone="neutral" label={tableName} />` per table with a
   "showing N of M rows" caption; handles loading (`ColdStartNote`) / empty / error. Presentational +
   one run-effect; no grading. *Check:* renders columns/rows for a known seed; empty and error states.

3. **Slice 3 — input preview on exercises (ships Capability A).** Render `<SqlDataPreview>` in
   `components/tutorials/SqlExerciseRunner.tsx` (single-file, L1/L2) and
   `components/tutorials/WorkspaceExerciseRunner.tsx` (workspace, L3/L4), sourced from the exercise's
   `seedSql`. Collapsible "Data" panel above/beside the editor. **This alone resolves the reported
   problem for all 46 lessons with zero content edits.** *Check:* drive one L1 lesson and one L3/L4
   lesson in the browser; the seeded table(s) show next to the prompt.

4. **Slice 4 — teach data model.** Extend `TeachSection` in `lib/tutorials/types.ts` with optional
   `demoSeedSql?: string` and `showDemoInput?: boolean` (keep both optional so Python teach is
   untouched). *Check:* `pnpm typecheck` clean; no existing lesson changes shape.

5. **Slice 5 — live demo output in Read (ships Capability B).** In
   `components/tutorials/TeachPanel.tsx`, when `demoLanguage === "sql"` and `demoCode` + `demoSeedSql`
   are present: add a "Run example" affordance (or auto-run on first view) that calls
   `runSqlInWorker({ mode:"single-file", seedSql: demoSeedSql, code: demoCode })` and renders the
   result with `<SqlResultGrid tone="actual" label="Output" />` under the read-only code; render
   `<SqlDataPreview>` above it when `showDemoInput`. Gate strictly on SQL + seed present. *Check:* a
   lesson with `demoSeedSql` shows a live output table; Python teach is visually unchanged.

6. **Slices 6–9 — author `demoSeedSql`, one level per iteration (L1 → L4).** For the ~37
   result-returning teach demos (front-loaded in L1/L2; ~7 in L4), set `demoSeedSql` — usually reuse
   the sibling `apply.singleFile.seedSql` (a shared const). Migrate the one hand-authored L4 output
   table (`level4.ts` window-function example) to the live-rendered output. L3 is DDL-heavy: give it
   input previews / a "table created / N rows" note rather than a rows grid. *Check per level:* every
   populated `demoCode` + `demoSeedSql` executes green (reuse the scratchpad verify-harness pattern
   from the curriculum authoring flow); `pnpm typecheck` + `pnpm test`.

**Definition of done (stop the loop when all are true):**
- Every SQL exercise (Apply + Practice, all 46 lessons) shows its seeded input table(s).
- Every result-returning teach demo renders a live output table.
- `pnpm typecheck`, `pnpm test`, and `pnpm build` are green.
- No Python teach/exercise behavior changed; no backend/quota introduced.

---

## Reference (read before Slice 1)

### Why (the problem)
A SQL prompt is meaningless without the data it runs against. Today a learner reads e.g. the Apply
task *"Return every order whose `total_cents` exceeds the overall average across all orders…"* and is
shown an editor, a **Run** button, and a **Hint** — but **never the `orders` table** (columns, sample
rows, or what a correct result looks like). They're asked to transform data they cannot see. And the
Read phase shows SQL text but never its result: `teach.demoCode` is displayed read-only and **is never
executed**.

### Current state (file\:line anchors)
**Data model — `lib/tutorials/types.ts`:**
- `TeachSection` (`types.ts:36-42`) = `{ markdown; demoCode?; estimatedMinutes }`. **No seed, no
  output.** So a teach demo can't be executed as-authored (it references tables seeded only on the
  exercises).
- `SqlResultSet` (`types.ts:133-136`) = `{ columns: string[]; rows: unknown[][] }` — canonical tabular
  shape, already used by grading.
- Seeds live only on exercises: `SqlSingleFileGrading.seedSql` + `.expected` (`types.ts:139-153`,
  L1/L2); `SqlWorkspaceGrading.seedSql` (`types.ts:169-183`, L3/L4). `SqlExercise` hangs
  `singleFile?` / `workspace?` off both `apply` and `practice` (`types.ts:186-202`).

**Read/teach UI — `components/tutorials/TeachPanel.tsx`:** renders `teach.markdown` via
`MarkdownRenderer` (GFM tables supported + styled — `lib/markdown/components.tsx:50-64`), then an
optional read-only CodeMirror "Live example" for `teach.demoCode` (`TeachPanel.tsx:34-48`). **Nothing
is executed; there is no output slot.** `SqlLessonPlayer` passes `demoLanguage="sql"` (highlighting
only) at `SqlLessonPlayer.tsx:235-242`.

**Execution + result rendering (all reusable, all client-side/free):**
- **`runSqlInWorker({ mode:"single-file", seedSql, code })`** → `{ success, result:{columns,rows}, error }`
  (`lib/workspace-execution/sql-sandbox/worker-runner.ts:130`). Runs `seedSql` + one SELECT in an
  in-browser sql.js Web Worker. **No network / `/api` / quota**; WASM self-hosted at `/wasm/`, compiled
  once per session; `prewarmSqlRuntime()` already fires on lesson mount. Exact primitive for an
  **ungraded** demo — bypasses the `expected`-set comparison that graded `executeSqlClientSide` needs.
- **`SqlResultGrid`** (`components/tutorials/SqlResultGrid.tsx`) — standalone table. Props:
  `result: SqlResultSet | null`, `label?`, `tone?: "neutral" | "actual" | "expected"`. Handles null /
  0-rows / `NULL` / wide-table scroll. Currently used only in `SqlExerciseRunner.tsx:137-140`. Drop-in.
- `ColdStartNote` (`components/tutorials/ColdStartNote.tsx`, `engine="sql"`) — "Starting SQL engine…".
- ⚠️ Do **not** route demo runs through `useExerciseRun` (Python-oriented). Call the worker directly.

**Authoring surface (sizing):**
| Level | Lessons | teach `sql` blocks | result-returning (SELECT/WITH) | `demoCode` |
|---|---:|---:|---:|---:|
| L1 | 11 | 16 | 13 | 11 |
| L2 | 11 | 17 | 16 | 11 |
| L3 | 12 | 14 | 1 | 1 |
| L4 | 12 | 19 | 7 | 0 |
| **Total** | **46** | **66** | **37** | **23** |

Only SELECT/WITH blocks (~37) produce a result table; the rest are DDL/DML (schema/row-count effects).
L1/L2 `demoCode` usually mirrors the lesson's main markdown example. L3 is almost all DDL. L4 is
markdown-only and holds the one already-hand-authored output table (`level4.ts:55-62`). Fenced code is
inside template literals with **escaped backticks** (`` \`\`\`sql ``) — any codemod must handle that.

### Design decisions (locked)
- **Two capabilities, A first.** A = input preview on exercises (highest value, zero new authoring,
  covers all 46 lessons). B = live demo output in Read.
- **Execute live; do not hand-author output rows.** Hand-authored `{columns,rows}` drift because
  nothing tests them; live execution is always correct and reuses the engine. This is why teach needs a
  seed (`demoSeedSql`), typically reusing the sibling exercise `seedSql`.
- **Additive + gated.** New `TeachSection` fields are optional; render the SQL affordances only when a
  seed/SQL is present, so Python and existing grading paths are untouched. Reuse `SqlResultGrid` /
  `runSqlInWorker` unchanged.

### Cost / risk
Runtime cost is **zero** (existing client-side sql.js worker; WASM cached per session; engine
prewarmed). Introspection queries are trivially cheap on lesson-sized seeds. Drift risk is avoided by
executing live. Blast radius is additive.

### Key files
`lib/tutorials/types.ts` · `public/workers/sql-sandbox-worker.js` +
`lib/workspace-execution/sql-sandbox/worker-runner.ts` · `components/tutorials/SqlDataPreview.tsx` (new)
· `components/tutorials/TeachPanel.tsx` · `components/tutorials/SqlExerciseRunner.tsx` ·
`components/tutorials/WorkspaceExerciseRunner.tsx` · `lib/tutorials/sql/curriculum/level{1,2,3,4}.ts`.
Reused (do not rebuild): `runSqlInWorker`, `SqlResultGrid`, `SqlResultSet`, `prewarmSqlRuntime`,
`ColdStartNote`, `MarkdownRenderer`.
