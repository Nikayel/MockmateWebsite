# Learn SQL & Databases — Audit Findings & Fix Plan

**Date:** 2026-07-02 · **Trigger:** post-authoring audit (all 46 lessons shipped & green).
**Method:** two multi-agent audits. (1) **Coverage council** — 6 auditors, one per lens
(interview question banks, DE/AE job descriptions, SQL-language completeness, pipeline depth,
pedagogy, interview craft) → synthesized ranked gaps. (2) **Whole-system audit** — 7 dimensions
(runner lifecycle, single-file grading, workspace grading, adapter/dispatch, routes/auth/progress,
UI, lesson quality), every finding adversarially verified (REFUTED ones dropped) → 11 confirmed.

Raw reports: coverage `tasks/wfa0096vi.output`, system `tasks/wkd40quzp.output`.

---

## Executive summary

- **Content is strong** — ~75% internship-interview-ready. Core window archetypes with correct
  tie-semantics, `ROW_NUMBER` dedup, idempotent incremental loads (run-twice grader), SCD 1 & 2,
  Kimball star/grain modeling, dbt-four DQ tests, query-plan literacy, and disciplined
  warehouse-dialect callouts are all interview-grade.
- **The system has real defects** — grading is currently wrong in **both** directions (a wrong
  aliasing answer PASSES; a correct SCD2 answer can FAIL) and a failing query **crashes the lesson
  render**. These are the "fix before launch" tier.

---

## Part 1 — Coverage gaps (DE-internship interview readiness)

Verdict: **~75% ready.** Bread-and-butter SQL screen + modeling conversation: covered. Thin on
hard-analytics differentiators, pipeline operations, modern-stack tooling vocabulary, and the
conversational/diagnostic half of the interview.

### Critical gaps
1. **Transactions / ACID / atomic loads** (3 lenses) — and it undermines L4's own multi-statement
   loaders (a mid-script failure half-writes a dimension). *New L4 lesson + wrap SCD2/star loads.*
2. **"Debug this wrong query" format** — traps are taught at recognition level, never as diagnosis.
3. **Window breadth** — `NTILE`, `FIRST/LAST_VALUE`, **median/percentiles** (no `PERCENTILE_CONT`
   in SQLite — the reason median is a notorious interview problem).
4. **Gaps-and-islands / streaks / sessionization** — THE differentiating "hard"; zero coverage.
5. **Late-arriving data** — ⚠️ the flagship high-water-mark loader (`sql-l4-idempotent-merge`) is
   taught **as correct** while silently dropping late events. Needs a lookback/safety-lag. *(BUG)*
6. **Mixed / mock-screen drills** — every Practice pre-announces its technique; technique-selection
   under ambiguity is never rehearsed.
7. **dbt project mechanics** — #1 AE-intern JD line; taught "underneath" but never named.

### Important (additive lessons/Reads)
Nth-highest drill (NULL-when-absent) · cohort/retention · date-series **densification** (and
`dim_date` is currently built sparse) · `GROUP_CONCAT`/`STRING_AGG` · **views** vs materialized
views · `ROLLUP`/`GROUPING SETS` · orchestration/DAG awareness · backfills · deletes/CDC in
incremental loads · schema evolution (`ALTER TABLE`) · incremental-vs-full-refresh · JSON/semi-
structured · warehouse/scale perf (partitioning/pruning, join strategy) · date interval arithmetic
+ timezone/UTC · operational DQ (freshness/volume anomaly) · thin practice volume on joins/windows.

### Coverage-flagged correctness bugs in shipped lessons *(fold into Part 3 Tier A)*
- Late-arriving loader taught wrong (crit #5 above).
- SCD2/dedup change predicate uses plain `<>` → misses NULL↔value transitions; use
  `IS [NOT] DISTINCT FROM`.
- `sql-l3-denormalization` mislabels a physical table a "reporting view."
- `dim_date` built sparse (one row per distinct order date), not a dense spine.
- `sql-l1-null-logic` Practice requires `CASE` before it's taught (Module 2.4) — prereq inversion.

---

## Part 2 — System audit: 11 confirmed defects

Health: **AT RISK — not launch-ready.** Foundation sound (clean Python-engine reuse, pure
comparator), but defects cluster on the SQL-specific seams added on top of the Python course.

| # | Sev | Title | File |
|---|-----|-------|------|
| 1 | high | **Aliasing lessons never grade column names** — an unaliased answer passes the very first SQL lesson (the skill it teaches) | `sql-sandbox/comparator.ts:109` |
| 2 | high | **Idempotency sums row counts across ALL tables** incl. learner scratch tables → a correct, idempotent SCD2 answer graded non-idempotent | `public/workers/sql-sandbox-worker.js:57` |
| 3 | high | **Failing query crashes the render** — `SqlResultGrid` gets the string `"fail"` and throws on `.columns.length` (recoverable full-page error) | `SqlResultGrid.tsx:21` / `SqlExerciseRunner.tsx:64` |
| 4 | med | **Progress-load failure is silent** and lets autosave clobber saved progress (affects **both** courses) | `useTutorialProgressSync.ts:44` |
| 5 | med | **Prewarm holds the single `pendingRun` slot** → a Run during WASM compile fails with spurious "A SQL query is already running" | `sql-sandbox/worker-runner.ts:135` |
| 6 | med | **3NF practice produces an orphaned FK** and blesses it as "acceptable" | `level3.ts` (normalize-2nf-3nf) |
| 7 | med | **1NF practice (medium) needs a recursive-CTE string-split** not taught until L4 (hard) | `level3.ts` (normalize-1nf) |
| 8 | med | **SQL teach demos are syntax-highlighted as Python** | `TeachPanel.tsx:37` |
| 9 | med | **SQL workspace lessons show "Starting Python…" cold-start copy** | `WorkspaceExerciseRunner.tsx:126` |
| 10 | low | **FK CASCADE practice passes on an empty child table** — the cascade is never actually verified | `level3.ts` (foreign-keys) |
| 11 | low | **Result grid not an accessible/keyboard-scrollable table** | `SqlResultGrid.tsx:43` |

Systemic notes: `useExerciseRun` computes `warming` from `isPythonRuntimeWarm()` even for SQL;
`referenceSolution`s are never executed by the grader (a CI harness running every reference would
catch this class — the scratchpad `sql-verify` harness now does exactly this offline).

---

## Part 3 — Consolidated fix plan (tiered)

### Tier A — Confirmed defects (fix regardless; these are bugs)
**Grading/crash (fix-before-launch):** #1 aliasing name-assertion (add `assertColumnNames` opt-in,
thread lesson→scenario→comparator, set on aliasing lessons) · #2 idempotency scope (compare only
graded tables, by content not just count sum) · #3 render crash (type-guard so only a real
result-set reaches `SqlResultGrid`). **Runner/progress:** #5 prewarm slot · #4 progress clobber.
**UI:** #8 SQL demo highlighting · #9 SQL cold-start copy · #11 grid a11y. **Lesson bugs:** #6 3NF
orphan FK · #7 1NF prereq · #10 FK cascade verification · late-arriving loader · `IS DISTINCT FROM`
in SCD2/dedup · denormalization "view" mislabel · dense `dim_date` · null-logic CASE order.
Each verified GREEN on the sql.js harness + `typecheck`/`lint`/`test`, committed per fix/module.

### Tier B — Interview-critical new lessons (additive coverage)
gaps-and-islands · median/NTILE/FIRST_LAST_VALUE · nth-highest drill · string aggregation · views ·
transactions/ACID · date-series densification · cohort/retention · ROLLUP/GROUPING SETS. Authored via
the same `scriptExercise`/harness pipeline, committed per module.

### Tier C — Larger / new-feature items (scope decision)
dbt-mechanics module · mixed-drills / mock-screen module · orchestration/backfill/CDC/schema-
evolution/JSON/warehouse-perf Reads · **Sable-graded conversational steps** (requires tutor/UI work,
not just content — flagged separately).
