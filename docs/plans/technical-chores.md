# Technical Chores

Status: **In progress** — most items shipped 2026-07-03; two billing sub-items + the security review
remain (see below). Verified against the actual code first (several were partly already handled).

These are reliability/operability fixes surfaced by the CMO/CTO/COO audit. High-severity items
are entitlement-sensitive (paid users can silently desync to free), so do them carefully with
tests and a security review.

## Checklist

- [~] **Stripe webhook hardening** (`app/api/webhook/stripe/route.ts`, `lib/stripe-helpers.ts`) — **High**
  - [x] Idempotent handler — already keyed on event id; **now** made the mutations idempotent so
        retries are safe: `recordPaymentHistory` keyed by the payment's unique natural id + status;
        `updateQuotaForSubscriptionTierAdmin` guards the usage reset with `last_reset_period_start`.
  - [x] Retry / dead-letter — `releaseIdempotencyMarker()` on the checkout/subscription 500 paths so
        Stripe's retry re-runs (fixes the silent-drop), + `webhook_failures` dead-letter collection.
  - [x] Admin alert on failure — error-level `WEBHOOK_FAILURE` log (alerting hook) + durable DLQ.
        _(Surfacing the DLQ in the admin payments UI is still TODO.)_
  - [ ] **Remaining:** relocate the marker for the *swallowed-error* handlers too (make them retry once
        their referral-voiding side effects are proven idempotent) — needs the security review.
- [~] **Entitlement sync** (`app/api/sync-subscription/route.ts`) — **already server-authoritative**
      (tier computed from Stripe via Admin SDK; Firestore rules block client self-elevation; clients
      can't forge a tier). Added `app/api/cron/subscription-reconcile` to recover paid users stuck on
      Free (upgrade-only, so no mass-downgrade risk).
  - [ ] **Remaining:** stale-Pro-after-cancel (monthly) reconciliation — needs the downgrade branch in
        `syncSubscriptionFromStripe` guarded behind a DEFINITIVE Stripe status (not "not found") to
        avoid mass wrongful downgrades. Deferred to the security review.
- [x] **Admin 403 page** — **already substantially handled**: signed-in non-admins get an explicit
      "Access Denied" card (`app/admin/layout.tsx`) and the API is fully role-gated. Optional polish
      (reusable component + a purpose-built `/api/admin/me` instead of probing analytics) not done.
- [x] **Streak self-heal** — shared `reconcileStreak` (`lib/spaced-repetition/streak.ts`) applied in
      the reminder/at-risk emails so a broken streak isn't messaged as still alive. + unit tests.
- [x] **Guest-session cleanup** — `app/api/cron/guest-session-cleanup` (strictly `is_guest`-scoped,
      batched, dry-run) purges expired guest sessions; composite index added; the 7d/48h expiry
      inconsistency reconciled to `SESSION.GUEST_EXPIRY_DAYS`. + tests.
- [x] **Feature flags** — real percentage rollout + allow/deny targeting with a deterministic hash
      (`lib/feature-flags.ts`); env override stays the kill-switch. + unit tests.
- [ ] **`/security-review`** on the webhook + entitlement work (user-triggered). Required before the
      two remaining billing sub-items above ship, and to sign off the shipped webhook changes with a
      Stripe test-mode run.

## Verification

Shipped with unit tests: feature-flag targeting, streak reconcile, guest-cleanup cron, and the
subscription-reconcile cron. The in-place webhook changes are typecheck-clean but can't be unit-tested
in isolation (the module needs live secrets) — verify them in **Stripe test mode** + `/security-review`
before fully trusting them.
