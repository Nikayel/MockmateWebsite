# Interview Page Refactor — Progress Tracker

Live checklist for the loop agent. Update the status + metrics after each slice. Statuses:
`TODO` · `IN PROGRESS` · `DONE` · `BLOCKED`.

## Metrics

- `app/interview/page.tsx`: **5,414** lines → target **≤ 300**
- Largest file in `app/interview/**`: **page.tsx (5,414)**
- Files over 500 lines (start): `page.tsx (5414)`, `ProblemColumn.tsx (712)`, `BugfixOnboardingTour.tsx (678)`, `EditorColumn.tsx (503)`, `PostInterviewView.tsx (492 — watch)`

## Slice status

| # | Slice | Status | page.tsx after | Notes |
|---|---|---|---|---|
| 0 | Baseline + payload snapshots | DONE | 5,414 | AST payload-contract oracle added; baseline caveats below |
| 1 | Delete dead hooks (useInterviewState/UI, useTestExecution) | DONE | 5,414 | Files already deleted by prior commit; removed 3 dangling re-exports from lib/hooks/index.ts. Commit 500a356. typecheck GREEN; lint clean in touched file; vitest = 2 pre-existing baseline failures only. |
| 2 | Pure helpers (interview-messages, fallback-feedback) | DONE | 5,364 | Created `lib/interview/fallback-feedback.ts` (pure `computeFallbackScores`; fetch/persist stays inline → payload snapshot unchanged) + `_utils/interview-messages.ts` (consolidates interviewer/partner/label builders; deleted `interview-copy.ts`). Tests added. Commit d905fb4. All gates green (suite now fully green — parallel agent fixed the 2 baseline scenario failures). |
| 3 | useInterviewTimer | DONE | 5,355 | `_hooks/useInterviewTimer.ts` owns startTime/elapsedTime + tick effect; returns state+setters so the ~20 inline reads keep working. Pure `computeElapsedSeconds` exported + unit-tested (node env: no React renderer, so hook-render tests not possible — test pure logic). Commit 1ec300e. Gates green. NOTE for future hook slices: no @testing-library/react / jsdom in repo (env=node) — test extracted pure logic, not rendered hooks. |
| 4 | useInterviewModes | TODO | | |
| 5 | useGuestQuota (entitlement) | TODO | | |
| 6 | Adopt useCodeExecution to parity | TODO | | |
| 7 | Adopt useInterviewChat + phase tracking | TODO | | |
| 8 | Phase tracking full + isolate proactive AI | TODO | | |
| 9 | useInterviewMetrics (entitlement-adjacent) | TODO | | |
| 10 | session-manager parity + useInterviewSession (HIGH) | TODO | | |
| 11 | feedback-generator parity + useInterviewFeedback (HIGH) | TODO | | |
| 12 | Split ProblemColumn / BugfixOnboardingTour / EditorColumn | TODO | | |
| 13 | Split render: InterviewHeader/LayoutGrid/FeedbackView | TODO | | |
| 14 | Final audit (≤300, no file >500, graphify update, docs) | TODO | | |

## Baseline state (recorded at Slice 0, 2026-06-25)

The repo working tree is **dirty with unrelated in-progress work** (labs redesign, RAG,
~47 scenario files). Three of the four gates are RED at baseline for reasons unrelated to
the interview refactor — do **not** try to fix or revert them (scope: interview only):

- **typecheck**: ✅ GREEN. This is the primary hard gate — must stay green every slice.
- **lint**: 40 pre-existing errors, **none in `app/interview/**`** (admin pages, RAG, workers,
  scratch.ts, etc.). Interview surface is lint-clean. Gate = *no new errors in touched files*.
- **vitest**: 2 pre-existing failures in `lib/scenarios/__tests__/real-world.test.ts`
  (`bugfix-temperature-alert-regression` registered in the **uncommitted** working-tree
  `lib/scenarios/real-world/bugfix/index.ts` but the test wasn't updated). Not on committed
  HEAD, not interview. Gate = *no new vitest failures; new interview tests pass*.
- **e2e (`bugfix-journey`)**: ❌ fails in this environment — dev server boots but the interview
  page never renders the scenario (no full Firebase/auth env here + dirty tree). Cannot
  establish a green e2e baseline locally. Gate falls back to typecheck + vitest +
  payload-contract; e2e to be validated in CI/a configured env.

### Slice 0 deliverable

`lib/interview/__tests__/payload-contract.test.ts` — an **AST scanner** (not hand-copied
builders) that walks `app/interview/**`, `lib/interview/**`, and the adopted interview hooks,
and snapshots the exact request-body / persistence field set for every sink:
`fetch(url,{body:JSON.stringify({…})})`, `saveSessionState(id,{…})`, guest `sessionState`,
and `localStorage sessionData`. Snapshot in
`lib/interview/__tests__/__snapshots__/payload-contract.test.ts.snap`. Because it scans the
whole feature dir, the contract stays found as logic moves into `_hooks/`. **If a slice changes
this snapshot and it's not a provable no-op → revert; never `-u` to make a slice pass.**

## Blockers / handoff notes

_(loop agent writes here when it stops)_
