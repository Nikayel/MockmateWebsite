# Interview Page Refactor — Sprint Plan

Status: **Ready to start.** This is the authoritative plan. Historical docs live in `./archive/`.

## Goal

Decompose the interview feature so **no source file exceeds 500 lines** (target ≤ 400, hard
ceiling 500). Today `app/interview/page.tsx` is **5,414 lines** and three already-extracted
components also break the rule. The work is **behavior-preserving**: same API calls, same order,
same UX. Reuse what already exists before writing anything new.

## Hard rules (apply to every file this sprint touches)

- **≤ 500 lines per file.** If a split would land a file at 480, split further — aim ≤ 400.
- **One reason to change per file.** No file mixes UI + API + scoring + persistence.
- **Reuse > rewrite > new.** Adopt an existing hook/service if it reaches parity; only write
  new code for genuinely new seams.
- **Keep the Zustand `interview-store` as the state boundary.** No parallel global state.
- **Inline is the source of truth** when it disagrees with a stale `lib/` file.

---

## Reuse-first inventory (scan result, 2026-06-25)

Several hooks/services already exist. **Adopt-after-parity-check** — they were built in an
abandoned refactor and have drifted, so each must be brought to parity with the current inline
logic before page.tsx consumes it. Do **not** blind-import.

| Existing file | State | Action | Replaces inline |
|---|---|---|---|
| `lib/hooks/use-streaming-feedback.ts` | ✅ **already used** | keep | — |
| `lib/hooks/useHintAgent.ts` | ✅ **already used** | keep | — |
| `lib/interview/code-analysis.ts` | ✅ **already used** | keep | — |
| `lib/hooks/useInterviewPhase.ts` | ⚠️ partial (only `createEmptyTracker`) | **adopt fully** | phase detect + tracker (~80) |
| `lib/hooks/useCodeExecution.ts` | ⚠️ exists, unused | **adopt after parity** | `runCode`/test mapping (~260) |
| `lib/hooks/useInterviewChat.ts` | ⚠️ exists, unused | **adopt after parity** | `handleSendMessage` + msg state (~270) |
| `lib/hooks/useInterviewSession.ts` | ⚠️ exists, unused | **adopt after parity** | session init/timer glue |
| `lib/interview/session-manager.ts` | ⚠️ ~60% of inline | **bring to parity, consume** | start/reset/autosave/restore (~900) |
| `lib/interview/feedback-generator.ts` | ⚠️ ~30% of inline | **bring to parity, consume** | feedback + system-design (~700) |
| `lib/hooks/useTestExecution.ts` | ❌ dup of useCodeExecution | **DELETE** | — |
| `lib/hooks/useInterviewState.ts` | ❌ dead, drifted | **DELETE** | — |
| `lib/hooks/useInterviewUI.ts` | ❌ dead, incomplete | **DELETE** | — |

**New shared primitives worth extracting** (generic — usable by `practice`/`dashboard` too,
so they earn their keep beyond this one page):
- `useInterviewTimer` — elapsed-time + interval (tiny, but shared).
- `useGuestQuota` — guest-mode + usage-limit gate (duplicated auth/quota pattern across pages).
- `useInterviewModes` — focus/calm/hideTimer/peek/panel + keyboard shortcuts.
- `fallback-feedback.ts` — pure scoring fallback (currently `applyFallbackFeedback`).

**Cross-page note:** `practice` and `dashboard` do **not** meaningfully duplicate interview
test-running/chat/feedback logic (practice is spaced-repetition/read-only). The only real shared
seam is auth/quota → `useGuestQuota`. Don't over-generalize the rest.

---

## Target file tree (every file ≤ 500)

```
app/interview/
├── page.tsx                              # ≤300  auth/guest gate → hooks → render
├── _hooks/
│   ├── useInterviewSession.ts            # ~380  start/reset/restore/autosave (wraps session-manager)
│   ├── useInterviewChat.ts               # ~300  chat send + message/tracker state (adopt lib/hooks)
│   ├── useCodeExecution.ts               # ~340  test run + result mapping (adopt lib/hooks)
│   ├── useInterviewFeedback.ts           # ~440  final + system-design + post-interview (wraps feedback-generator)
│   ├── useInterviewProactiveAI.ts        # ~290  proactive nudges/edge cases (currently disabled — isolate)
│   ├── useInterviewPhaseTracking.ts      # ~120  phase detect + tracker updates
│   ├── useInterviewMetrics.ts            # ~180  spaced-rep, completion, hint feedback
│   ├── useInterviewTimer.ts              # ~40   timer  [NEW, shared]
│   ├── useInterviewModes.ts              # ~180  focus/calm/peek/panel/shortcuts  [NEW]
│   └── useGuestQuota.ts                  # ~90   guest + usage limit  [NEW, shared]
├── _components/
│   ├── InterviewHeader.tsx               # ~180  header + guest banner + browser mount  [NEW]
│   ├── InterviewLayoutGrid.tsx           # ~250  main 3-col / focus grid  [NEW]
│   ├── InterviewFeedbackView.tsx         # ~200  feedback/discussion states  [NEW]
│   ├── ProblemColumn.tsx                 # ~280  (was 712)  SPLIT
│   │   └── _sub/{ProblemHintSection,BugfixReflectionPanel,WorkspaceFileViewer}.tsx  # ~200/180/120 [NEW]
│   ├── EditorColumn.tsx                  # ~320  (was 503)  TRIM
│   │   └── _sub/{ConsoleOutput,TestResultsPanel}.tsx  # ~80/100 [NEW]
│   ├── BugfixOnboardingTour.tsx          # ~250  (was 678)  SPLIT
│   │   └── _sub/BugfixTourStep.tsx       # ~150 [NEW]
│   ├── PostInterviewView.tsx             # 492 ⚠️ watch — trim if any slice touches it
│   ├── ChatColumn.tsx · InterviewTopBar.tsx · FeedbackLoadingState.tsx · InterviewDialogs.tsx  # OK
├── _utils/
│   ├── interview-messages.ts             # ~120  initial interviewer/chat message builders  [NEW]
│   └── bugfix-tour-state.ts              # ~180  tour state machine + persistence  [NEW]
lib/interview/
│   ├── session-manager.ts                # parity rewrite, ACTUALLY consumed
│   ├── feedback-generator.ts             # parity rewrite, ACTUALLY consumed
│   └── fallback-feedback.ts              # ~90  pure scoring fallback  [NEW]
lib/hooks/
│   ├── useCodeExecution.ts · useInterviewChat.ts · useInterviewSession.ts · useInterviewPhase.ts  # consumed
│   └── ❌ DELETE useTestExecution.ts, useInterviewState.ts, useInterviewUI.ts
```

If any hook above lands > 500 during implementation, split it (e.g. `useInterviewFeedback` →
`useFinalFeedback` + `useSystemDesignFeedback`). The tree is a target, not a straitjacket.

---

## Slices (one PR each — leaf-first, low-risk first)

> Each slice: extract current inline logic → bring the existing target to parity (or create
> new) → wire page.tsx to consume → delete the now-dead inline copy. Never leave two copies.

| # | Slice | Touches | page.tsx Δ | Risk |
|---|---|---|---|---|
| 0 | **Baseline** — green build + snapshot `/api` payloads (start, send-message, generate-feedback, execute, autosave) as the behavior contract | tests only | 0 | none |
| 1 | **Delete dead code** — `useInterviewState`, `useInterviewUI`, `useTestExecution` + index re-exports | lib/hooks | 0 | none |
| 2 | **Pure helpers** — `interview-messages.ts`, `fallback-feedback.ts` | _utils, lib | −150 | low |
| 3 | **Timer** — `useInterviewTimer` | _hooks | −40 | low |
| 4 | **Modes** — `useInterviewModes` (focus/calm/peek/panel/shortcuts effects) | _hooks | −300 | low |
| 5 | **Guest/quota** — `useGuestQuota` (shared) | _hooks | −90 | med (entitlement) |
| 6 | **Test execution** — adopt `useCodeExecution` to parity; fold in hint-sync, bugfix-evidence, persistence | _hooks, lib/hooks | −260 | med |
| 7 | **Chat** — adopt `useInterviewChat` + `useInterviewPhaseTracking` to parity | _hooks, lib/hooks | −350 | med |
| 8 | **Phase/proactive** — `useInterviewPhaseTracking` full + isolate `useInterviewProactiveAI` (disabled code) | _hooks | −300 | low |
| 9 | **Metrics** — `useInterviewMetrics` (spaced-rep, completion, hint feedback) | _hooks | −180 | med |
| 10 | **Session lifecycle** — `session-manager` to parity (start/reset/autosave/restore) + `useInterviewSession` | lib, _hooks | −900 | **high** |
| 11 | **Feedback** — `feedback-generator` to parity (final + system-design + post-interview) + `useInterviewFeedback` | lib, _hooks | −700 | **high** |
| 12 | **Split UI components** — ProblemColumn→3 subs, BugfixOnboardingTour→sub+util, EditorColumn trim | _components | 0 | low |
| 13 | **Split render** — `InterviewHeader`, `InterviewLayoutGrid`, `InterviewFeedbackView` out of the JSX return | _components | −300 | low |
| 14 | **Final** — page.tsx ≤300; audit no file > 500; `graphify update .`; update `docs/PLATFORM-ARCHITECTURE.md` | all | — | low |

Slices 0→9, 12, 13 are independent enough to reorder. **10 and 11 land last** among logic
slices — they touch usage limits, guest migration, spaced repetition, vectorization, and
billing-adjacent session writes. Split each in two (10a start/reset, 10b autosave/restore;
11a final-feedback, 11b system-design) if a PR gets heavy.

---

## Definition of done

- [ ] `app/interview/page.tsx` ≤ 300 lines.
- [ ] **No file in `app/interview/**` or the touched `lib/` modules exceeds 500 lines.**
- [ ] Zero unused/duplicated interview hooks in `lib/` (all 3 dead files deleted; stale files
      either consumed-at-parity or deleted).
- [ ] Autosave/restore/feedback/execute `/api` payloads byte-identical to the Slice 0 snapshots.
- [ ] `pnpm lint && pnpm typecheck && pnpm test` green; all e2e green; no UX/behavior change.
- [ ] `/code-review` clean per slice; `/security-review` clean on slices 5, 9, 10, 11.

## Risks

- **Highest:** slices 10 & 11 (session + feedback) — entitlement/usage-limit, guest migration,
  spaced-rep, vectorization, billing-adjacent writes. Gate behind Slice 0 payload snapshots +
  `/security-review`.
- **Drift trap:** existing `lib/` hooks look adoptable but lag the inline source of truth by
  100–300 lines each. Parity-check before consuming; the inline version wins on conflict.
- **Don't relocate-without-cohesion:** moving a 200-line blob into a util that's still called
  identically is not a win. Extraction must reduce a file's reasons-to-change.
- **Disabled proactive code** is coupled to refs/effects — isolate it in slice 8, don't try to
  revive it this sprint.

## See also

- `./interview-page-test-plan.md` — the verification harness for every slice.
- `./interview-page-refactor-loop.md` — autonomous loop-agent prompt to execute this plan.
- `./archive/` — superseded plans + the recovered original extraction guide.
