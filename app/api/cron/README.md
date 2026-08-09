# Cron routes — scheduling lives on cron-job.org, NOT in vercel.json

**CEO said: do not touch this setup.**

Every route in this directory is triggered externally by [cron-job.org](https://cron-job.org)
(free), calling the route with `Authorization: Bearer ${CRON_SECRET}`. The cadences are
configured in the cron-job.org dashboard, not in this repo.

Do **NOT** add a `crons` block to `vercel.json`:

1. The account is on the Vercel **Hobby plan**, which rejects any schedule more frequent
   than daily **at deploy time**. When a `crons` block with an hourly schedule was present
   (Aug 7-9, 2026), Vercel refused every production deploy, and prod silently served a
   three-day-old build.
2. Even the daily-legal entries would double-fire alongside cron-job.org.

If the account ever moves to Pro and crons should migrate back into Vercel, that is a
deliberate decision for the account owner — remove the cron-job.org jobs in the same
change so nothing fires twice.

Current jobs (see each route header for details):

| Route                            | Cadence (configured on cron-job.org) |
| -------------------------------- | ------------------------------------ |
| `aggregate-usage`                | hourly                               |
| `subscription-reconcile`         | daily                                |
| `subscription-expiry`            | daily                                |
| `expire-referral-rewards`        | daily                                |
| `guest-session-cleanup`          | daily                                |
| `email-notifications`            | see route header                     |
