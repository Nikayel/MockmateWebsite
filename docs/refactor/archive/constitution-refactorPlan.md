# Interview Page Refactor Plan

> **SUPERSEDED (2026-06-25).** The authoritative, audited sprint plan now lives at
> `docs/plans/refactor-interview-page.md`. This document is kept for historical context only —
> its target file tree predates the work that already extracted the column components and
> drifted the 5 `lib/` hooks/services. Follow the new plan.

The interview page (`app/interview/page.tsx`) is **193KB in a single file**. This is a critical maintenance and performance risk. The `account/page.tsx` (50KB) also needs decomposition.

This document tracks the focused refactor work, separate from feature sprints.

---

## Why This Must Happen

- **Maintenance**: Every change to the interview experience risks breaking unrelated functionality. Merge conflicts are inevitable when multiple contributors touch the same massive file.
- **Performance**: A 193KB React component forces the browser to parse, compile, and hydrate a huge module even when the user only needs a subset of the functionality.
- **Testing**: Testing individual interview features (chat, editor, test runner, timer, feedback) is impossible when they're entangled in one file.
- **AGENTS.md Violation**: The engineering principles explicitly call for files focused on single responsibility and splitting by domain when a file mixes concerns.

---

## Interview Page Decomposition Plan

### Phase 1: Identify Responsibilities

The interview page likely mixes these concerns:

1. **Session Management** — creating, restoring, autosaving sessions
2. **AI Chat Panel** — interviewer/partner chat, message rendering, input
3. **Code Editor Panel** — CodeMirror setup, file tabs, dirty state, read-only enforcement
4. **Test Runner** — test execution, result display, console output
5. **Timer/Progress** — interview timer, phase tracking, progress indicators
6. **Feedback/Submission** — submit flow, feedback generation, feedback display
7. **Workspace Context** — file management, workspace state, bugfix workspace overlay
8. **Problem Panel** — problem description, incident report, hints, constraints
9. **Voice Mode** — Deepgram STT, voice recording UI
10. **Layout/Routing** — responsive layout, panel resizing, mobile handling

### Phase 2: Target Architecture

```
app/interview/
├── page.tsx                          # Thin orchestrator (~100-150 lines)
├── _components/
│   ├── InterviewLayout.tsx           # Panel layout, resizing, responsive
│   ├── SessionManager.tsx            # Session create/restore/autosave
│   ├── ChatPanel.tsx                 # AI chat UI + message list
│   ├── EditorPanel.tsx               # CodeMirror + file tabs
│   ├── TestRunner.tsx                # Test execution + console output
│   ├── ProblemPanel.tsx              # Problem/incident display
│   ├── TimerBar.tsx                  # Timer, phase indicator
│   ├── SubmissionFlow.tsx            # Submit button, confirmation, feedback trigger
│   ├── FeedbackDisplay.tsx           # Post-session feedback rendering
│   └── VoiceMode.tsx                 # Voice recording UI
├── _hooks/
│   ├── useInterviewSession.ts        # Session state machine
│   ├── useInterviewChat.ts           # Chat message state + AI calls
│   ├── useInterviewEditor.ts         # Editor state, file switching, dirty tracking
│   ├── useInterviewTimer.ts          # Timer logic, phase transitions
│   ├── useWorkspaceContext.ts        # Workspace file management
│   └── useInterviewSubmission.ts     # Submission flow + feedback generation
└── _types/
    └── interview.ts                  # Shared types for interview components
```

### Phase 3: Extraction Order

Extract in dependency order (leaf components first):

1. **Types** → `_types/interview.ts` — extract all shared interfaces/types
2. **Timer** → `TimerBar.tsx` + `useInterviewTimer.ts` — self-contained, no dependencies
3. **Voice** → `VoiceMode.tsx` — isolated feature
4. **Problem Panel** → `ProblemPanel.tsx` — mostly presentational
5. **Test Runner** → `TestRunner.tsx` — clear boundary with editor
6. **Editor** → `EditorPanel.tsx` + `useInterviewEditor.ts` — core but well-bounded
7. **Chat** → `ChatPanel.tsx` + `useInterviewChat.ts` — core, depends on session
8. **Session** → `SessionManager.tsx` + `useInterviewSession.ts` — orchestrates others
9. **Submission** → `SubmissionFlow.tsx` + `useInterviewSubmission.ts`
10. **Layout** → `InterviewLayout.tsx` — wraps everything
11. **Page** → `page.tsx` becomes thin orchestrator

### Phase 4: Validation

After each extraction:
- [ ] Verify the interview flow works end-to-end (manual smoke test)
- [ ] Verify session autosave/restore
- [ ] Verify bugfix workspace mode
- [ ] Verify voice mode
- [ ] Run existing unit tests
- [ ] Confirm no regressions in chat behavior

---

## Account Page Decomposition Plan

### Target Architecture

```
app/account/
├── page.tsx                          # Tab router (~50-80 lines)
├── _components/
│   ├── ProfileTab.tsx                # Name, email, avatar
│   ├── BillingTab.tsx                # Subscription, invoices, upgrade/downgrade
│   ├── SettingsTab.tsx               # Preferences, notifications
│   ├── SecurityTab.tsx               # Password, OAuth connections
│   └── DangerZone.tsx                # Account deletion
└── _hooks/
    ├── useAccountProfile.ts
    └── useAccountBilling.ts
```

---

## Success Criteria

- [ ] `app/interview/page.tsx` is under 200 lines
- [ ] `app/account/page.tsx` is under 100 lines
- [ ] Each extracted component is under 300 lines
- [ ] Each extracted hook is under 200 lines
- [ ] All existing functionality works identically
- [ ] No new bugs introduced (verified by manual smoke test + existing tests)

---

## Notes

- This refactor is **behavior-preserving**. No new features, no UI changes.
- Prefer extracting components with their state (co-locate hook + component) rather than creating distant shared state.
- Keep the existing `app/interview/_components/` directory — some components already live there (like `EditorColumn.tsx`). Merge new extractions alongside them.
- If any existing `_components/` files are also oversized, split them as part of this work.
