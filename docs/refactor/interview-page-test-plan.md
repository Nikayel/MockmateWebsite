# Interview Page Refactor — Test Plan

The refactor is **behavior-preserving**, so the test strategy is: lock current behavior into
characterization tests *before* touching a seam, then keep them green through every slice. A
slice is not "done" until this harness passes.

## Infrastructure (already in repo)

- **Unit/integration:** Vitest — `pnpm test` (`vitest run`), `pnpm test:watch`, `pnpm test:coverage`. Config: `vitest.config.ts`. ~72 test files today.
- **E2E:** Playwright — `playwright.config.ts`, spec in `e2e/` (`e2e/bugfix-journey.spec.ts`). Run with `pnpm exec playwright test`.
- **Static:** `pnpm lint` (eslint), `pnpm typecheck` (`tsc --noEmit`).

## Per-slice gate (run in order; all must pass before merge)

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm exec playwright test
```

Then `/code-review` on the diff. For slices 5, 9, 10, 11 also `/security-review`.

---

## Slice 0 — Behavior contract (do this FIRST, before any extraction)

The single most important safety net. Capture the exact network behavior so later slices can
prove they changed nothing.

- [ ] **Payload snapshots.** Add `lib/interview/__tests__/payload-contract.test.ts` that drives
      each flow with a fixed scenario + fixed inputs and asserts the request body sent to:
  - `POST /api/execute` (code run) — body + how results map to `testResults`/`testSummary`.
  - `POST /api/interview-chat` (send message) — body shape, phase/tracker context included.
  - `POST /api/generate-feedback` (final) — transcript assembly, bugfix evidence payload, score inputs.
  - System-design feedback request.
  - **Autosave** localStorage + Firestore doc shape (the field set saved every 30s).
  - **Restore** — given a saved doc, the exact state it rehydrates.
  Use `vi.fn()`/MSW-style fetch mocks; snapshot the request bodies with `toMatchInlineSnapshot`.
- [ ] **Baseline green.** Confirm existing 72 unit specs + `bugfix-journey.spec.ts` pass on `main`
      before the first change.

These snapshots are the **acceptance oracle**: slices 6, 7, 10, 11 must leave them byte-identical.

---

## Unit tests to add per slice (extract → test the extracted unit directly)

| Slice | New/updated tests | Key assertions |
|---|---|---|
| 1 (delete dead) | none — typecheck proves zero importers | no remaining imports of the 3 deleted hooks |
| 2 (pure helpers) | `_utils/__tests__/interview-messages.test.ts`, `lib/interview/__tests__/fallback-feedback.test.ts` | message builders produce identical seed messages; fallback scores match old `applyFallbackFeedback` for fixed inputs |
| 3 (timer) | `_hooks/__tests__/useInterviewTimer.test.ts` | starts/stops, elapsed increments, resets on new session (fake timers) |
| 4 (modes) | `_hooks/__tests__/useInterviewModes.test.ts` | focus/calm toggle, body-class side effects, Cmd+K→Z chord fires |
| 5 (guest/quota) | `_hooks/__tests__/useGuestQuota.test.ts` | guest id issue/restore, usage-limit gate blocks at threshold, paid bypass — **entitlement-sensitive** |
| 6 (test exec) | adopt `useCodeExecution` test; extend for hint-sync + bugfix-evidence + persistence | result mapping unchanged vs Slice 0 snapshot; hint agent synced on pass/fail |
| 7 (chat) | `useInterviewChat` parity test + phase tracking | request body == Slice 0 snapshot; tracker updates on user message |
| 8 (phase/proactive) | `_hooks/__tests__/useInterviewPhaseTracking.test.ts` | phase transitions; proactive code isolated & still disabled (no calls fire) |
| 9 (metrics) | `_hooks/__tests__/useInterviewMetrics.test.ts` | spaced-rep update payload, completion tracking, hint-feedback POST — **entitlement-adjacent** |
| 10 (session) | `lib/interview/__tests__/session-manager.test.ts` | start/reset/autosave/restore payloads == Slice 0 snapshots; guest migration; completed-session cleanup; redirect-on-existing |
| 11 (feedback) | `lib/interview/__tests__/feedback-generator.test.ts` | final + system-design + post-interview request bodies == Slice 0 snapshots; streaming wired; markSessionEvaluating before request |
| 12 (UI split) | render tests for `ProblemHintSection`, `BugfixReflectionPanel`, `WorkspaceFileViewer`, `BugfixTourStep` | render + key interactions; no prop regressions |
| 13 (render split) | render tests for `InterviewHeader`, `InterviewLayoutGrid`, `InterviewFeedbackView` | conditional rendering (guest banner, focus grid, feedback states) matches old output |

---

## E2E regression (must stay green every slice)

Extend `e2e/` beyond the single bugfix journey so the full surface is covered before the
high-risk slices:

- [ ] **`e2e/interview-dsa-journey.spec.ts`** — pick scenario → write code → run tests (pass) →
      submit → feedback renders → score shown.
- [ ] **`e2e/interview-restore.spec.ts`** — start → type code + send a message → reload →
      session restored (code, messages, timer continue). Guards slice 10.
- [ ] **`e2e/interview-guest.spec.ts`** — guest start → hit usage gate → signup prompt →
      (optional) migrate on auth. Guards slices 5 & 10.
- [ ] **`e2e/bugfix-journey.spec.ts`** — existing; must stay green (guards workspace + tour).
- [ ] System-design submit path (guards slice 11) — at least a smoke spec.

Manual smoke checklist per high-risk slice (10, 11): start → chat → run tests → submit →
feedback → reload-restore; plus guest flow, bugfix workspace, voice mode.

---

## Coverage targets

- Every **new hook/service** ships with a unit test in the same slice (no "test later").
- Extracted **pure logic** (scoring fallback, message builders, payload assembly) → ≥ 90% line coverage.
- `pnpm test:coverage` must not drop on the interview modules vs the Slice 0 baseline.

## Rollback signal

If a slice changes any Slice 0 payload snapshot **and** the change isn't explainable as an
intended no-op, revert the slice — do not "update the snapshot to match." The snapshot is the
contract; a surprised snapshot means behavior drifted.
