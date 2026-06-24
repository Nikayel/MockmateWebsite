# Refactoring Plan — `app/interview/page.tsx`

Status: **Deferred** (next sprint). Not started.

## Problem

`app/interview/page.tsx` is a ~5000-line god-component. It orchestrates the code editor, AI
interviewer chat, code execution, feedback generation, guest flow, session-state persistence,
and scenario selection in a single file. This violates the cohesion and file-size rules in
`CLAUDE.md` and makes the interview flow hard to test and change safely.

## Principle

Pure refactor: behavior-preserving, behind existing tests, landed in small individually
reviewable slices. **No UX change.** Keep `interview-store` (Zustand) as the state boundary.

## Checklist

- [ ] Baseline: confirm `e2e/bugfix-journey.spec.ts` + unit tests are green before any change.
- [ ] Map current responsibilities in `page.tsx` and list every piece of state it owns.
- [ ] Extract `useCodeExecution` — wraps `/api/execute` + result parsing.
- [ ] Extract `useFeedbackGeneration` — instant + streamed feedback, status transitions.
- [ ] Extract `useGuestMigration` — guest id, trial gate, migrate-on-auth.
- [ ] Extract `useSessionState` — autosave/restore via `interview-store`.
- [ ] Extract subcomponents: `EditorColumn`, `ChatColumn`, `ProblemColumn`, `InterviewTopBar`,
      `PostInterviewView`.
- [ ] Reduce `page.tsx` to thin orchestration over the hooks/components.
- [ ] Run lint/typecheck/test + Playwright green after each slice; `/code-review` per slice.
- [ ] Final file-size check: no single file mixes UI + API + scoring + persistence.

## Verification

Existing Playwright `e2e/bugfix-journey.spec.ts` + unit tests stay green at each step;
`/code-review` per slice.
