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
| 4 | useInterviewModes | DONE | 5,292 | `_hooks/useInterviewModes.ts` owns focus/calm/hideTimer/activePanel/showProblemPeek + 3 effects (calm class, focus class, Cmd/Ctrl+K→Z chord). Pure `interpretModeKeydown` exported + unit-tested. `showOptimalApproach` left inline (not a mode). Commit 8b84c3b. Interview files typecheck/lint/test clean. NOTE: full `pnpm typecheck` is RED from the parallel labs-theming agent (LabsThemeToggle/useLabsTheme/LabsThemeProvider not yet created) — NOT interview; gate = no new errors in interview files. |
| 5 | useGuestQuota (entitlement) | DONE | 5,284 | `_hooks/useGuestQuota.ts` owns isGuestMode/guestId/usageLimit + transitions (enterGuestMode/exitGuestMode/refreshUsageLimit/canStartGuestTrial). Pure `isUsageBlocked` gate exported + unit-tested (paid bypass, DSA never blocked, guest never blocked, null-before-load). Removed checkUsageLimit/getOrCreateGuestId/canStartFreeTrial imports from page (now in hook); kept markFreeTrialUsed/saveGuestSessionData/recordSessionStart (slice 10). Self-reviewed: gate byte-identical, no entitlement bypass. Commit 77a817f. typecheck full GREEN (labs-theme agent landed), lint+suite green. Recommend /security-review before merge per plan. |
| 6 | Adopt useCodeExecution to parity | DONE | 4,866 | REWROTE (not adopted) — drifted `lib/hooks/useCodeExecution.ts` was unused & had a stale 7-key /api/execute body; deleted it + its index re-exports + SCAN_FILES entry. New `app/interview/_hooks/useCodeExecution.ts` (448L) owns run/submit; shared `executeScenario`+de-dup'd `applyExecutionApiError` in `code-execution-helpers.ts` (141L). STATE stays in page (injected setters) → bulletproof TDZ; cross-cutting effects injected as callbacks; saveSessionState imported directly. Shared types → `_types.ts` as `type` aliases (interface broke Record<string,unknown> assignability). Payload snapshot delta = dead-code-only (removed unused 7-key row; live 4-key body unchanged → provable no-op). Verified byte-equivalent via 3-lens adversarial workflow (GO). Commit 8e3a109. typecheck/lint/suite all GREEN. NOTE: feedback-generator.ts is 516L (pre-existing, slice 11 rewrites it); payload snapshot file 528L is a generated test artifact. |
| 7 | Adopt useInterviewChat + phase tracking | DONE | 4,548 | REWROTE drifted lib/hooks/useInterviewChat.ts (unused) → deleted + trimmed index/SCAN_FILES. New `useInterviewChat.ts` (421L: handleSendMessage+handleAutoSend, endpoint is **/api/chat** not interview-chat) + `useInterviewPhaseTracking.ts` (~185L: getCurrentInterviewPhase/updateTrackerOn{Message,CodeChange,TestsRun}/getInterviewerChatParams). Pattern as slice 6: state (messages/inputs/tracker) stays in page (injected setters); phase hook RETURNS the tracker fns so page keeps wiring updateTrackerOnTestsRun→useCodeExecution + updateTrackerOnCodeChange→editor + the 4 other updateTrackerOnMessage callsites. Pure `deriveInterviewPhase` extracted+unit-tested. Cross-cutting deps injected as callbacks. Verified byte-equivalent via 3-lens adversarial workflow (GO; /api/chat body + getInterviewerChatParams + phase ladder re-derived). Payload snapshot delta = dead-code-only (2 minimal /api/chat rows from deleted hook; rich live body unchanged). Commit 4778478. All gates GREEN. |
| 8 | Phase tracking full + isolate proactive AI | DONE | 4,227 | CORRECTION: proactive silence-detection was actually LIVE (stale "DISABLED" comments) — fires isProactive:true /api/chat after 120s silence. New `useInterviewProactiveAI.ts` (384L) owns the silence effect + triggerProactiveInterviewerWithContext + analyzeCodeForProactiveFeedback + silence refs (built via exact extract-assemble — zero transcription risk). Behavior preserved exactly (120s threshold/3min cooldown/30s poll/deps/refs). Deleted DEAD non-context triggerProactiveInterviewer (zero call sites) → snapshot dead-code-only delta (its timeSinceLastMessage-less /api/chat row removed; live WithContext row preserved). Dead inactivity machinery left untouched in page. resetProactiveState() wired into resetInterview. ("Phase tracking full" was already covered by slice 7's useInterviewPhaseTracking.) Verified byte-equivalent via 3-lens adversarial workflow (GO). Commit 394a871. All gates GREEN. |
| 9 | useInterviewMetrics (entitlement-adjacent) | DONE | 4,131 | New `useInterviewMetrics.ts` (~180L) owns hintFeedback Map state + trackSessionCompletion (POST /api/session/metrics) + updateSpacedRepetition (POST /api/spaced-repetition/complete) + submitHintFeedback (POST /api/rag), all moved VERBATIM (did NOT delegate trackSessionCompletion to feedback-generator — would've dropped a /api/session/metrics snapshot occurrence 4→3). Returns all 3 fns + hintFeedback + setHintFeedback (BLOCKER fix: setHintFeedback called by page resets L2346/L2666). Pure `buildHintFeedbackId` extracted + unit-tested. Hook placed at old track-def site (TDZ-safe, deps before, consumers after). Payload-contract BYTE-IDENTICAL (no -u). Verified byte-equivalent via adversarial verifier (GO; all 3 payloads + key round-trip vs ProblemColumn confirmed). Commit ee02d18. All gates GREEN, suite 414. |
| 10a | session WRITE: useInterviewSessionStart + useInterviewSessionReset (HIGH) | DONE | 3,663 | startInterview→`useInterviewSessionStart.ts` (450L), resetInterview→`useInterviewSessionReset.ts` (287L), lifted VERBATIM (opts.X injection), both <500. Page keeps all state; hooks return the 2 callbacks. Removed now-dead createInterviewSession/recordSessionStart page imports. Parity workflow chose split-into-10a/10b + LEAVE dead session-manager.ts/useInterviewSession.ts UNTOUCHED (their snapshot occurrences must stay) + keep contract literals inline + don't extract resolveScenarioPattern. Security-lens adversarial verify GO: recordSessionStart once, usage gate, guest FREE_TRIAL_EXHAUSTED, createInterviewSession 7 positional args, reset double-gate/guest-key-gap/lastCodeHashRef-interleave — all byte-identical; no entitlement weakening. payload-contract ZERO diff. Commit e7fc691. |
| 10b | session READ: useInterviewAutosave + useSessionRestore + useSessionReopen (HIGH) | TODO | | autosave effect (~L1421-1543) + restore effect (~L1552-1828) + checkAuth/reopen effect (~L810-1135). Keep literals inline (sessionData/saveSessionState/guest PUT); DON'T extract applyRestoreFields; preserve exact dep arrays (autosave 21 w/ realInterviewMode+strictTimeLimit OMITTED; restore 7; reopen 6) + eslint-disables; inject startInterview as plain closure; page hook order [reopen, autosave, restore]. |
| 11 | feedback-generator parity + useInterviewFeedback (HIGH) | TODO | | |
| 12 | Split ProblemColumn / BugfixOnboardingTour / EditorColumn | DONE | 4,131 (unchanged) | ProblemColumn 712→447 (_sub/{ProblemHintSection,BugfixReflectionPanel,WorkspaceFileViewer}); BugfixOnboardingTour 678→495 (_sub/BugfixTourStep + pure _utils/bugfix-tour-state.ts, 14 unit tests); EditorColumn 503→443 (_sub/{ConsoleOutput,TestResultsPanel}, runWithLanguageGuard moved in). All extracted subs are pure presentational children; guards kept in parents; rendered markup/props/data-attrs byte-identical (3 parallel impl agents + adversarial verify GO). NOW the ONLY interview file >500 is page.tsx (4131). Commit d46ac64. typecheck/lint/suite GREEN (472 tests), payload-contract untouched. |
| 13 | Split render: InterviewHeader/LayoutGrid/FeedbackView | DONE | 4,073 | Extracted GuestModeBanner (30L) + InterviewLayoutGrid (233L, the 3-col grid: FocusProblemPeek/ProblemColumn/EditorColumn/ChatColumn/BugfixOnboardingTour) + InterviewFeedbackView (197L, PostInterview/FeedbackLoading/PracticeFeedback branches; PracticeFeedback nextDynamic moved verbatim). Skipped thin InterviewHeaderBar — InterviewTopBar already a component, stays inline. Section+wrapper divs (isResultView ternaries) stay in page. Pre-built consts (hasGuestBanner/isFeedbackLoading/problemCtx/bugfixTourEnabled + closures) added; ProblemColumnCtx exported. Markup byte-identical (impl agent + adversarial verify GO). page reduction modest (−58) — heavy markup already in column components; big page drops come from slices 10/11. Commit f898e2c. typecheck/lint/suite GREEN (472). |
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
