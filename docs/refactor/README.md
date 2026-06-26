# Refactor

Plans and execution harnesses for large, behavior-preserving refactors. Start here.

## Active: Interview Page (`app/interview/page.tsx`, 5,414 lines)

| Doc | Purpose |
|---|---|
| [interview-page-refactor.md](./interview-page-refactor.md) | **The plan.** Hard rules (≤500 lines/file), reuse-first inventory, target file tree, 15 slices, Definition of Done. |
| [interview-page-test-plan.md](./interview-page-test-plan.md) | Verification harness — payload-contract snapshots, per-slice unit tests, e2e regression. |
| [interview-page-refactor-loop.md](./interview-page-refactor-loop.md) | Autonomous `/loop` prompt to execute the plan slice by slice until done. |
| [interview-page-progress.md](./interview-page-progress.md) | Live progress tracker the loop updates each iteration. |

**Goal:** decompose so no file exceeds 500 lines (page.tsx → ≤300), reusing existing
hooks/services where they reach parity, with zero UX/behavior change.

**To run it:** open the loop doc and paste its PROMPT block into `/loop`. Or land slices by hand
following the slice table in the plan.

## Archive

`./archive/` — superseded/historical:
- `constitution-refactorPlan.md` — earlier plan (pre-dates the column extraction; target tree out of date).
- `INTERVIEW_PAGE_REFACTORING-guide.md` — original extraction guide, recovered from git
  (deleted in `117411c`). Documents the 5 hooks/services that were built but never wired in.
