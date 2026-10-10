# Post-interview recommendations

## Product contract

Recommendations are free for every signed-in owner of a completed interview,
regardless of subscription or remaining allowance. Advice does not grant unlimited
interviews: opening a task is free; explicitly starting it uses the existing
authoritative quota endpoint. Guest access, paid redos, Pro review dashboards,
and FSRS entitlements are separate policies.

One `NextPracticeCard` appears alongside live and saved-session feedback:

`saved owned feedback → /api/recommendations/next-practice → exact task → Start → completion`

## Algorithm

This is a deterministic, content-based selector, not a trained ML model or an
LLM recommendation call. AI-generated interview feedback is an input; the engine
itself makes no LLM, embedding, or vector-search requests.

- Resolve the source by scenario ID or an unambiguous legacy title and track.
- Stay in the same track and a compatible interview-editor language.
- Exclude the source and completed scenarios from at most 40 recent owned sessions.
  This is bounded history, not proof a task has never been solved.
- Never choose a harder task. A low valid score prefers one difficulty step lower;
  invalid or missing scores do not imply a weakness.
- DSA requires the same authored pattern; other tracks prefer overlapping topics
  and debugging skills. Explicit debugging evidence favors reproduction/root cause.
- Focus comes from observed evidence, then weak score categories, then neutral
  transfer practice. Original `fixNext` advice is labeled as source feedback.
- Use authored duration and stable scenario-ID tie-breaking. Exclude micro-debugging
  and tutorial-only languages unsupported by the interview editor, such as SQL.
- Return an honest no-match when no eligible candidate remains.

## Implementation boundaries

| Responsibility | Source |
| --- | --- |
| Auth, session-ID validation, rate limits, private/no-store HTTP responses | `app/api/recommendations/next-practice/route.ts` |
| Ownership, saved-feedback readiness, projected bounded history query | `lib/agents/recommendations/next-practice.server.ts` |
| Selection, focus, response types and runtime validation | `lib/agents/recommendations/next-practice*.ts` |
| Fetch lifecycle and feedback-save retries | `lib/hooks/useNextPractice.ts` |
| Feedback-panel styling, task-first hierarchy, accessible disclosure and actions | `components/practice/NextPracticeCard.tsx` |
| Exact task/language entry and source attribution | `lib/interview/next-practice-entry.ts` and interview hooks |

The service is read-only and does not fetch Stripe, account tier, or quota state.
Responses never include solutions, hidden tests, or workspace contents.

The client cancels stale requests on identity/session changes and validates responses.
Unfinished saves retry after 1/2/4/8/15 seconds (six requests including the initial
lookup), then offer manual recovery. Missing/foreign sessions hide the card;
expired authentication and lookup failures have explicit recovery states.

Opening the exact task uses full navigation, preserves language and source-session
attribution, and neither restores the old session nor auto-starts. An accepted start
clears prior feedback/tests. Denied starts cannot emit successful-start analytics.

## Saving and returning

`PracticeSaveControls` provides Save for later and an explicit reminder form. Ignoring the card
or opening the form creates no saved task or email job. One task is stored per account in
`practice_plans/{uid}` through the authenticated `/api/practice-plan` API. The server recomputes
the owned recommendation and does not trust a client-supplied task description or user ID.

The client confirms persistence before showing success. Writes have a 15-second deadline,
block double clicks, preserve the existing task on failure, and ignore stale reads and responses
from a prior identity. Identical lost-response retries reuse the saved revision; transactions
reject an older conflicting save or removal. Opening practice remains available during save errors.

`SavedPracticeCard` resumes the exact scenario and language from the dashboard. Completion
cancels the pending reminder and shows concrete debugging evidence or actual score pairs;
score pairs are explicitly labeled as different exercises. No improvement is invented. Free
accounts see the existing Pro company/role roadmap offer after completing the follow-up task.

Reminders run inside the existing cron-job.org `email-notifications` job. See
[CRON-SCHEDULE.md](CRON-SCHEDULE.md) for delivery timing, bounded retries, opt-outs, and
uncertain-delivery handling. No new AI call is introduced. Account erasure includes the saved plan.

## Compatibility

The two replaced learning/similar-problem widgets are removed. Existing legacy recommendation
APIs and the active FSRS/review scheduler retain their existing behavior and entitlements.

## Measurement

`next_practice_impression`, `next_practice_click`, and `next_practice_started`
carry bounded identifiers/categories and `recommendation_source: feedback`, not
raw code, chat, or feedback. Existing consent gates still apply.

Saved-task events are `practice_plan_saved`, `practice_plan_save_failed`,
`practice_plan_removed`, `practice_plan_return_viewed`, `practice_plan_return_clicked`,
`practice_plan_completed`, and `practice_plan_pro_cta_clicked`. Server delivery emits
`practice_reminder_sent` or `practice_reminder_failed`. Reminder clicks retain the exact
source/scenario attribution with `return=reminder`; dashboard clicks use `return=dashboard`.

Join accepted starts to `session_complete.sessionId` and to saved completion records.
Deduplicate impressions across reloads. Source URL attribution is client-supplied,
not trusted server proof. Separate same-visit second practice from returns after
24 hours through seven days, use fully elapsed windows, and report raw counts.
Retention uplift must be measured; implementation alone does not establish it.

## Release checklist

Use these checks before each production release; local fixtures do not certify live credentials or external scheduler configuration.

- Run recommendation selector/service/API/hook/card tests.
- Run `pnpm test:integration` against Firestore emulators.
- Run `pnpm exec playwright test --config playwright.recommendations.config.ts`.
- Run TypeScript, lint, and a production build; investigate credential warnings.
- Verify runtime credentials and production query indexes. Emulators do not enforce
  production composite-index requirements.
- Exercise completed feedback → exact task → accepted start → saved completion
  with real free and paid accounts on a preview, including exhausted allowance.
- Follow the normal release workflow and verify the deployed journey afterward.

The narrative-feedback recovery worker and its new AI call are outside this release.
