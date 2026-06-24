# Technical Chores

Status: **Deferred** (after the interview-page refactor). Not started.

These are reliability/operability fixes surfaced by the CMO/CTO/COO audit. High-severity items
are entitlement-sensitive (paid users can silently desync to free), so do them carefully with
tests and a security review.

## Checklist

- [ ] **Stripe webhook hardening** (`app/api/webhook/*`, `lib/subscription-sync.ts`) — **High**
  - [ ] Idempotent handler keyed on Stripe event id.
  - [ ] Retry / dead-letter (or Firestore queue) for failed events.
  - [ ] Admin alert on persistent failure.
  - [ ] Unit test: idempotency + entitlement transition.
- [ ] **Entitlement sync** (`app/api/sync-subscription/route.ts`) — make server-side
      authoritative; reduce reliance on client-triggered `syncSubscription`.
- [ ] **Admin 403 page** (`app/admin/*`) — explicit unauthorized page, not a silent redirect.
- [ ] **Streak self-heal** (`lib/spaced-repetition/mastery-calculator.ts`) — reconcile missed
      days on write + regression test.
- [ ] **Guest-session cleanup** (`lib/guest-session.ts`, `app/api/cron/*`) — enforce 7-day
      expiry + cleanup cron.
- [ ] **Feature flags** (`lib/feature-flags.ts`) — add % rollout / targeting.
- [ ] `/security-review` on the webhook + entitlement work.

## Verification

Unit tests for webhook idempotency + streak self-heal; `/security-review` on the
webhook/entitlement work.
