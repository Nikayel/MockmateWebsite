# Cron schedule

Six background jobs exist under `app/api/cron/`. **All scheduling lives on cron-job.org, and
`vercel.json` deliberately declares no `crons` block** — on the Vercel Hobby plan a `crons` block
with sub-daily schedules rejects every production deploy (CEO directive; see
`app/api/cron/README.md`, which is the authority on this). An earlier revision of this file claimed
five jobs were declared in `vercel.json`; that was never true of the deployed state and the claim
hid the real operational risk: **nothing in this repo can verify the external schedules exist.**
Checking cron-job.org is a standing owner responsibility.

## What runs, when, and what breaks if it does not

Every job is expected to be registered on cron-job.org with these schedules:

| Job | Schedule (UTC) | If it never runs |
|---|---|---|
| `aggregate-usage` | `0 * * * *` hourly | `config/cost_averages` goes stale (2h TTL), so `getAverageHourlyCost` falls back to 0 and the **spike-vs-average cost alarm is silently disabled** (the absolute $50/hr threshold still fires). You would not notice a slow-burn runaway AI loop until the invoice. |
| `subscription-reconcile` | `30 8 * * *` daily | A user whose checkout webhook failed **stays on Free after paying**. This job is the webhook safety net; unscheduled, there is no safety net. |
| `subscription-expiry` | `0 9 * * *` daily | Expired yearly plans keep Pro access forever, and the 7-day / 1-day expiry reminder emails never send. |
| `expire-referral-rewards` | `30 9 * * *` daily | Pending referral rewards never expire, so the advertised ledger drifts from the stated 90-day policy. |
| `guest-session-cleanup` | `0 10 * * *` daily | Guest session documents (code, transcript, feedback) accumulate in Firestore forever. Cost and privacy both grow without bound. |
| `email-notifications` | every 3 hours | Welcome, inactivity, spaced-repetition, and roadmap emails stop. |

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

Configure the cron-job.org job to send exactly that header. **`CRON_SECRET` must be set in Vercel
Production or every scheduled run will 500.**

## Checking that they actually ran

cron-job.org records each execution's status code on the job's history page. A run that returns 401
means the configured `CRON_SECRET` header does not match; 500 with "Server misconfiguration" means
the env var is unset in Vercel. For `aggregate-usage` specifically, a fresh
`config/cost_averages.calculatedAt` in Firestore is the ground truth that the hourly job is alive.
