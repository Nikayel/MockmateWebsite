# Saved next practice release — 2026-10-10

Live at https://www.codesparring.dev through [PR #398](https://github.com/Nikayel/MockmateWebsite/pull/398).

- Feature commit: `be5478874d62c1b99f91e35f0891402e60ee956e`.
- Main merge: `de1f6678e9fac62cd88bfe3d959c990ea47f1ff7`; its tree matches the verified feature commit.
- Final Git production deployment: `dpl_4g3Dz8vR1iV9HGsn86jvnhXJss9w`.
- Local staging backport: `875993919fc04166b4bbfb57a3d226dda96233fc`.

## What is live

Owned written feedback offers an exact catalog task and focus. Saving persists one task per
account; the dashboard resumes it without auto-starting or spending allowance. Reminders
require an explicit save. Completion uses the existing scored-completion rule and shows
actual evidence or score pairs labeled as different exercises. The existing Pro roadmap offer
appears after follow-up completion.

The existing cron-job.org email-notifications job drains opted-in reminders. Its schedule is
unchanged; no Vercel Cron was added. A recent production request returned 200. Due-reminder
queries and the existing owned-session composite index were verified against production.

Ignoring the card creates no reminder. Failed saves remain retryable and never claim success.
Transactions protect duplicate saves, stale updates/removals, and overlapping reminder runs.
Completion, removal, opt-outs and account erasure suppress pending reminders. Unknown delivery
outcomes are not automatically replayed. Delivery is after the selected time on a scheduled run,
subject to preferences, quiet hours and shared limits.

## Verification

- 206 focused unit/component checks, 12 real Firestore transaction checks, 8 browser journey checks passed.
- TypeScript passed; ESLint had zero errors. PR CI lint/typecheck passed.
- Full local and PR CI suite: 8,887 passed, 11 skipped, 2 unchanged pricing failures
  (`ai-providers-cost-ledger.test.ts`, `cost-constants.test.ts`). Vercel production build passed.
- Live authenticated API and mobile browser checks covered feedback, exact navigation, durable
  saving, no quota spending, idempotent retry, ownership checks, actual completion evidence and removal.
- Synthetic accounts/records were removed. No AI calls or external email test sends were made.

## Existing follow-ups

The previous release and this release both log shared rate-limit-store timeouts and Logflare
401 errors. The feature API checks succeeded, but the upstream configuration needs attention.
The two pricing test expectations also need reconciliation.

The narrative-feedback queue worker/new AI call was excluded from production. Its separate
approval requirement remains unresolved. The local staging backport preserves that existing
queue behavior and its frozen-score completion rule.
