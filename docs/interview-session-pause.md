# Interview pause and reentry

An open attempt warns after nine minutes without human activity and pauses at
10 minutes. Switching tabs briefly does not pause it. Returning to a sleeping
tab checks the previous activity time before recording new input; AI replies
and automatic transcript scrolling do not extend the inactivity window.

Opening a saved attempt or reloading its URL is an explicit continuation. It
restores code, conversations, drafts, elapsed practice time, and timed-practice
deadlines, then activates the restored session identity with a fresh inactivity
window. A persisted `paused` flag does not require another Resume click.

Save and exit stops work and saves the attempt without displaying the inactivity
dialog while backup and navigation are pending. If neither local nor cloud save
succeeds, the workspace resumes so the user can retry. Activation and heartbeat
responses from an earlier lifecycle generation cannot reopen the pause dialog.

Ownership conflicts remain a separate safeguard: ordinary activation cannot
silently claim an attempt held by another live tab. Explicit reopen or Resume
claims it through the existing authorized lifecycle endpoint.

Regression checks:

```sh
pnpm exec vitest run app/interview/_hooks/__tests__/useInterviewLifecycle.test.tsx app/interview/_hooks/__tests__/useInterviewLifecycle-reentry.test.tsx app/interview/_hooks/__tests__/useSessionRestore.test.tsx lib/interview/session-lifecycle
pnpm exec playwright test --config playwright.interview-review.config.ts session-lifecycle.spec.ts
```

The browser fixture uses the production lifecycle, timer, autosave, and pause
notice with local guest backup responses. Lifecycle endpoint ownership and
completed-attempt guards are covered by the server unit tests.
