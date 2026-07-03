# AGENT 1 — SQL course engineer ("ship the spec")

The build-agent runbook: turn `docs/sql-curriculum/SPEC.md` into a working **Learn SQL & Databases**
feature on the existing Learn-Python machinery. Mirrors the Python course's `AGENT-1-backend-engineer.md`.
Its job is the **engine + a thin vertical slice + wiring** so the curriculum agent (AGENT 2) can then
pour in all 46 lessons. **Reuse, don't rebuild** — the only genuinely new subsystem is the sql.js runner.

---

## Copy-paste prompt (paste into a fresh Claude Code session at the repo root)

```
You are the SQL-course engineer. Ship the "Learn SQL & Databases" feature by implementing
docs/sql-curriculum/SPEC.md on top of the existing Learn-Python machinery. Read first, in order:
  1. docs/sql-curriculum/SPEC.md        (the plan — follow §8 build order exactly)
  2. docs/sql-curriculum/README.md      (the reuse thesis + file map)
  3. docs/sql-curriculum/CONTENT.md §"Level 1" and §"Level 3"  (shape of the content you must run)
  4. lib/tutorials/types.ts, lib/tutorials/registry.ts, lib/tutorials/exercise-scenarios.ts
  5. lib/workspace-execution/browser-execution.ts and lib/workspace-execution/python-sandbox/*
     (the Pyodide runner you are cloning for sql.js)
  6. components/tutorials/useExerciseRun.ts, ExerciseRunner.tsx, WorkspaceExerciseRunner.tsx
  7. app/learn/python/* and proxy.ts

NON-NEGOTIABLE CONSTRAINTS (from SPEC §0/§4):
- Reuse, don't rebuild. The ONLY new subsystem is lib/workspace-execution/sql-sandbox/ (sql.js /
  SQLite-WASM in a Web Worker, cloning python-sandbox/). Add deps: sql.js and @codemirror/lang-sql.
- The SQL workspace runner MUST emit the byte-identical
  "__WORKSPACE_TEST_RESULTS__:" + JSON.stringify([{suite,name,passed,error,isHidden}]) marker the
  Python workspace runner emits. If it does, result-parser.ts, formatWorkspaceResult(), useExerciseRun,
  WorkspaceExerciseRunner.tsx and the results UI are reused with ZERO changes — verify with a clean
  git diff on those files at the end.
- Execution stays client-side / free / no quota; /learn/sql is auth-gated via proxy.ts instead.
- Do not fork TestResults / useExerciseRun / the progress service. Widen union types; add dispatch
  branches; add ONE result-grid sub-component. Keep server/client boundaries identical to Python.

BUILD IN THIS ORDER (SPEC §8), committing after each step (commit as the user, no Claude co-author,
use `git -c commit.gpgsign=false commit`):
  1. Runner spike, one L1 lesson end-to-end: sql-sandbox/ + public/workers/sql-sandbox-worker.js +
     public/wasm/sql-wasm.wasm; add "sql" to isBrowserExecutionLanguage + one single-file dispatch
     branch (executeSqlClientSide: seed -> SELECT -> compare {columns,rows}). Hand-author ONE lesson
     object (sql-l1-select-columns) and drive it through useExerciseRun. Prove: cold start warms, a
     right answer passes, a wrong answer fails, an empty result set (rows:[]) passes correctly.
  2. Workspace protocol: sql-sandbox/workspace-runner.ts emitting the marker; workspace dispatch
     branch; one L3 lesson (CREATE TABLE + assertion queries, dbt "0 rows = pass") flowing through
     WorkspaceExerciseRunner with NO UI edits; plus the checkIdempotency double-run.
  3. Generalize types: lib/tutorials/types.ts -> TutorialLevel<E>/TutorialModule<E>/TutorialLesson<E>
     (keep PythonLevel/PythonLevelId aliases so Python call sites don't churn); add SqlExercise +
     SqlSingleFileGrading + SqlWorkspaceGrading; widen levelId to TutorialLevelId.
  4. Registry + routes + auth: parallel lib/tutorials/sql/registry.ts over SQL_LEVELS; app/learn/sql/*
     mirroring app/learn/python/* (same server/client split); add "/learn/sql" to proxy.ts
     PROTECTED_ROUTES.
  5. UI polish: components/tutorials/SqlResultGrid.tsx (renders returned rows incl. the 0-rows case),
     @codemirror/lang-sql in the editor language map, a "Starting SQL engine…" ColdStartNote variant.
  6. Leave SQL_LEVELS as a skeleton with the 2 proof lessons; AGENT 2 authors the rest from CONTENT.md.

VERIFY (SPEC §9) and report: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all green;
result-parser.ts / formatWorkspaceResult / WorkspaceExerciseRunner.tsx git-clean; a manual `pnpm dev`
run of the L1 + L3 proof lessons (right pass, wrong fail, empty-result pass, L4-style idempotency
double-run); Python course unregressed. Add unit tests for the result-set comparator
(order/multiset/empty/NULL/case) and the SQL workspace marker emission, mirroring
lib/workspace-execution/__tests__.

STOP when the two proof lessons run end-to-end through the UNCHANGED results pipeline and all four
verification commands pass. Do not author the remaining lessons — that is AGENT 2's job. If SPEC and
reality disagree on a file path or predicate (e.g. isWorkspaceScenario's exact check), trust the code,
fix the adapter minimally, and note the deviation in your final report.
```

---

## Definition of Done (what "shipped" means for this agent)
- `lib/workspace-execution/sql-sandbox/` runs seed→query in a warm worker; single-file + workspace
  dispatch branches added to `browser-execution.ts`; `"sql"` accepted.
- One L1 (single-file, result-set compare) and one L3 (workspace, assertion-query) lesson run
  end-to-end through the **unchanged** `useExerciseRun` + results UI (right→pass, wrong→fail,
  empty-result→pass, idempotency double-run→pass).
- Types generalized with Python aliases preserved; parallel `sql/registry.ts`; `app/learn/sql/*`
  routes gated by `proxy.ts`; progress persists to `user_tutorial_progress/${uid}__sql-l{N}-{slug}`
  with no new collection/API.
- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` green; `result-parser.ts` /
  `formatWorkspaceResult` / `WorkspaceExerciseRunner.tsx` show **no diff**.
- Hand-off note for AGENT 2: the finalized `SqlExercise` shape + the shared seed-DB constant.
