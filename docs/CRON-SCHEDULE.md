# Cron schedule

Six background jobs exist under `app/api/cron/`. Until 2026-08-07 **none of them were declared in
`vercel.json`**, so anything not manually registered on cron-job.org was simply never running.

Five are now declared in `vercel.json`. `email-notifications` is deliberately left out because the
owner has it registered externally already, and it is the one job where a duplicate run has a
user-visible cost.

## What runs, when, and what breaks if it does not

| Job | Schedule (UTC) | Scheduled by | If it never runs |
|---|---|---|---|
| `aggregate-usage` | `0 * * * *` hourly | `vercel.json` | `config/cost_averages` is never written, so `getAverageHourlyCost` returns 0 and the **cost-spike alarm is silently disabled**. You would not notice a runaway AI loop until the invoice. |
| `subscription-reconcile` | `30 8 * * *` daily | `vercel.json` | A user whose checkout webhook failed **stays on Free after paying**. This job is the webhook safety net; unscheduled, there is no safety net. |
| `subscription-expiry` | `0 9 * * *` daily | `vercel.json` | Expired yearly plans keep Pro access forever, and the 7-day / 1-day expiry reminder emails never send. |
| `expire-referral-rewards` | `30 9 * * *` daily | `vercel.json` | Pending referral rewards never expire, so the advertised ledger drifts from the stated 90-day policy. |
| `guest-session-cleanup` | `0 10 * * *` daily | `vercel.json` | Guest session documents (code, transcript, feedback) accumulate in Firestore forever. Cost and privacy both grow without bound. |
| `email-notifications` | every 3 hours | **cron-job.org (external)** | Welcome, inactivity, spaced-repetition, and roadmap emails stop. |

## Duplicate runs are safe

Every one of these was checked before scheduling, so an overlapping external schedule cannot cause
damage:

- `subscription-expiry` guards each reminder with a persisted `yearly_expiry_reminder_7day_sent` /
  `_1day_sent` flag and skips already-notified users, so it cannot double-send.
- `subscription-reconcile` is scoped to `subscription_tier == "free"` and only ever upgrades.
- `aggregate-usage` recomputes averages from scratch.
- `expire-referral-rewards` and `guest-session-cleanup` act only on already-expired records.

## Auth

All six use `verifyCronRequest` (`lib/cron-auth.ts`): `Authorization: Bearer <CRON_SECRET>`,
length-guarded and timing-safe, failing closed with a 500 when `CRON_SECRET` is unset.

Vercel Cron sends exactly this header when the `CRON_SECRET` environment variable is set on the
project, so no route changes were needed. **`CRON_SECRET` must be set in Vercel Production or every
scheduled run will 500.**

## If you are on the Vercel Hobby plan

Hobby limits both the number of cron jobs and their frequency (daily only). If the deploy is
rejected for exceeding that limit, or if the hourly `aggregate-usage` schedule is downgraded to
daily, register the affected jobs on cron-job.org instead using the schedules in the table above and
remove them from `vercel.json`. The routes are identical either way; only the scheduler differs.

## Checking that they actually ran

Vercel logs each cron invocation under the project's Cron Jobs tab. A run that returns 401 means
`CRON_SECRET` does not match; 500 with "Server misconfiguration" means it is unset.
