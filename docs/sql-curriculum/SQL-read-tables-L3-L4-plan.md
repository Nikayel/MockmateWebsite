# Plan — worked-example output tables for L3 & L4 Read phases

**Status:** Ready for an agent. **Scope:** SQL curriculum L3 + L4 teach sections only. No infra changes
(the feature already shipped), no Python, execution stays 100% client-side.

---

## Context — what is ALREADY done (do NOT redo)

The "see the data" feature shipped and is merged (see `SQL-FIX-read-output-tables.md`). Concretely:

- **Every exercise in all 46 lessons already shows its input table(s).** `SqlDataPreview` renders above
  the editor in both `SqlExerciseRunner` (L1/L2) and `WorkspaceExerciseRunner` (L3/L4). This resolved
  the original "learners have to guess the table" complaint everywhere. **Nothing to do here.**
- **Read-phase worked-example output already works for L1 (×11), L2 (×11), and `sql-l4-window-ranking`.**
  Those teach sections carry `demoCode` + `demoSeedSql` + `showDemoInput`, so `TeachPanel` runs the demo
  live and renders the output table (and input tables).

**The only gap this plan closes:** the Read phase of the remaining **L3 (12 lessons)** and **L4 (11
lessons)** shows explanation + (sometimes) a static fenced code block, but no live output table. Give
each a runnable worked example so its Read phase shows a real result table, matching L1/L2.

---

## The mechanism (already built — just author content)

`TeachSection` (in `lib/tutorials/types.ts`) supports:

```ts
demoCode?: string        // ONE result-returning statement (SELECT / WITH…SELECT / EXPLAIN QUERY PLAN)
demoSeedSql?: string     // setup: CREATE + INSERT (+ CREATE INDEX etc.); runs via db.exec (multi-statement OK)
showDemoInput?: boolean  // also render the seeded input tables above the output
```

When `demoLanguage === "sql"` and both `demoCode` and `demoSeedSql` are present, `TeachPanel` executes
`demoCode` against `demoSeedSql` in the client-side sql.js worker and renders the output via
`SqlResultGrid`. For each target lesson, add these three keys to its `teach` object (right after
`markdown` / any existing `demoCode`).

### Hard rules (learned from the L1/L2/L4 pass)

1. **`demoCode` must be a SINGLE result-returning statement.** The worker runs it with `prepare()` +
   `step()`, which executes only the first statement. Put ALL setup (CREATE/INSERT/UPDATE/CREATE INDEX)
   in `demoSeedSql`; put one `SELECT` / `WITH … SELECT` / `EXPLAIN QUERY PLAN …` in `demoCode`.
2. **The live demo renders at the END of the Read panel** (after all markdown). So write the demo as a
   self-contained end-of-section worked example. Do NOT rely on it appearing next to a mid-prose
   paragraph. If a lesson already has a mid-prose fenced ``` ```sql ``` example, either (a) leave that
   fenced block as the inline teaching aid and let the live demo reprise it at the end, or (b) if that
   would duplicate a long block, remove the fenced block and keep the prose (see `sql-l4-window-ranking`
   in `level4.ts` for the pattern used).
3. **`showDemoInput`:** set `true` when the demo *transforms* input tables (JOINs, aggregation, windows,
   dedup) so the learner sees input → output. Set `false`/omit when `demoCode` is just `SELECT * FROM t`
   over the seeded table (otherwise the same table renders twice).
4. **Fenced code lives inside JS template literals with escaped backticks** (`` \`\`\`sql ``). `demoCode`
   / `demoSeedSql` are plain template-literal strings (SQL has no backticks), so they're low-risk — but
   copy any reused `seedSql` verbatim.
5. **Keep prose truthful.** If a lesson's markdown says "run this and you'll see…", make the live demo
   produce exactly that.

---

## Per-lesson worked examples to author

For each, author `demoSeedSql` (a small, faithful seed) + `demoCode` (one statement) that makes the
concept's effect visible as a table. Suggestions below; the agent may refine as long as each executes
green and illustrates the lesson.

### Level 3 — `lib/tutorials/sql/curriculum/level3.ts`

| Lesson id | Title | Suggested demo (demoCode) | showDemoInput |
|---|---|---|---|
| `sql-l3-ddl-create` | CREATE TABLE and Data Types | `SELECT *` from a table seeded with INTEGER/TEXT/REAL columns + 2–3 rows, to show how types store/display | false |
| `sql-l3-insert-populate` | INSERT and INSERT … SELECT | Seed a `source` + run `INSERT … SELECT` into `target` in the seed; `demoCode = SELECT * FROM target` | true (show `source`) |
| `sql-l3-primary-keys` | Primary Keys: Surrogate vs Natural | `SELECT` showing a surrogate `id` beside the natural key column(s) | false |
| `sql-l3-foreign-keys` | Foreign Keys and Referential Integrity | Parent⨝child JOIN over the FK, proving the link | true |
| `sql-l3-constraints` | UNIQUE, NOT NULL, CHECK | `SELECT *` of rows that satisfy the constraints (violations can't be a result set — keep this one small or SKIP if it adds nothing) | false |
| `sql-l3-1nf` (First Normal Form) | First Normal Form: Atomic Values | `SELECT *` of the atomized (1NF) table | false |
| `sql-l3-2nf-3nf` | Second and Third Normal Form | JOIN reconstructing a row from the decomposed tables | true |
| `sql-l3-denormalization` | Denormalization Trade-offs | A JOIN that flattens normalized tables into one wide denormalized row set | true |
| `sql-l3-cardinality` | Entities, Relationships, Cardinality | A 1-to-many JOIN showing the fan-out | true |
| `sql-l3-junction-tables` | Junction Tables for Many-to-Many | Two JOINs through the junction table resolving M2M | true |
| `sql-l3-indexes` | Indexes: Speeding Up Reads | **Keep the existing multi-statement EXPLAIN before/after block read-only** (it shows two plans — a single output grid can't). Optionally add a single `EXPLAIN QUERY PLAN SELECT … WHERE indexed_col = x` demo showing the post-index SEARCH plan | n/a |
| `sql-l3-dimensional-intro` | Facts, Dimensions, and Grain | fact⨝dimension JOIN at the stated grain | true |

### Level 4 — `lib/tutorials/sql/curriculum/level4.ts`

`sql-l4-window-ranking` is DONE. The rest:

| Lesson id | Title | Suggested demo (demoCode) | showDemoInput |
|---|---|---|---|
| `sql-l4-window-offset` | LAG and LEAD: Period-over-Period | `SELECT` with `LAG(revenue) OVER (ORDER BY month)` + the delta, over a seeded monthly series | true |
| `sql-l4-window-frames` | Frames: Running Totals & Moving Averages | `SUM(x) OVER (ORDER BY d ROWS BETWEEN …)` running total / moving average over a daily series | true |
| `sql-l4-recursive-cte` | Recursive CTEs for Hierarchies | `WITH RECURSIVE` walking an `employees(id, manager_id)` org chart, showing depth/level | true |
| `sql-l4-star-build` | Building a Star Schema Load | fact⨝dim JOIN producing the analytical row set | true |
| `sql-l4-scd-type1` (SCD Type 1) | Slowly Changing Dimensions: Type 1 | `SELECT *` of the dimension after an overwrite update (do the UPDATE in the seed) | false |
| `sql-l4-dedup` | Deduplication | The wrapped `ROW_NUMBER() … = 1` dedup query over a table with duplicate keys | true |
| `sql-l4-idempotent-merge` | Idempotent Loads: Upsert & MERGE | `SELECT *` of the target after an upsert (run the upsert in the seed), showing no dupes | true |
| `sql-l4-data-quality` | Data-Quality Assertions | A DQ check as a result set — e.g. the offending rows, or `COUNT(*)` of violations | true |
| `sql-l4-explain` | EXPLAIN and Query Performance | A single `EXPLAIN QUERY PLAN SELECT …` (result-returning) over a seeded table+index | false |
| `sql-l4-capstone` | Capstone: A Type-2 SCD Loader | `SELECT` of the SCD2 output slice (current + historical rows with `valid_from` / `valid_to`) | false |

(Confirm the two ids not shown in greps — the SCD-type-1 lesson and any 12th L4 lesson — by reading the
file; author a demo for each real lesson.)

---

## Verification (required — the agent must keep these green)

The integration guard already exists: **`lib/tutorials/sql/__tests__/teach-demos.test.ts`** runs every
lesson that has a `demoSeedSql` through the real sql.js engine and asserts it returns a result set (and
that a demo never has a seed without code). As each lesson is authored it is automatically covered.

Per level, run and iterate until green:

```
pnpm vitest run lib/tutorials/sql/__tests__/teach-demos.test.ts   # every demo executes and returns rows
pnpm typecheck
```
Before finishing:
```
pnpm test        # full suite
pnpm build       # production build
```
Optionally extend the harness to assert `result.rows.length > 0` for lessons where an empty output would
be a bug (most of these), so a silently-empty demo is caught.

**Commit cadence:** one commit per level (`content(learn): L3 Read-phase worked-example output tables`,
same for L4). Commit as the user (no Claude co-author) with `git -c commit.gpgsign=false commit`.

---

## Reused building blocks (do NOT rebuild)

`TeachSection.demoSeedSql` / `showDemoInput` · `TeachPanel` (auto-runs SQL demos) ·
`components/tutorials/SqlDataPreview.tsx` · `SqlResultGrid` · `introspectSqlSeed` / the worker
`introspect` mode · `lib/tutorials/sql/__tests__/teach-demos.test.ts` (the drift guard).

## Definition of done

- Every L3 and L4 lesson whose concept produces rows has a `demoCode` + `demoSeedSql` (+ `showDemoInput`
  where it transforms input), so its Read phase shows a live output table. Documented exceptions:
  `sql-l3-indexes` (multi-plan EXPLAIN stays read-only) and any pure-constraint lesson where a result
  table adds nothing.
- `teach-demos.test.ts`, `pnpm typecheck`, `pnpm test`, `pnpm build` all green.
- No change to Python, to any exercise's grading, or to the input-preview behavior already shipped.
