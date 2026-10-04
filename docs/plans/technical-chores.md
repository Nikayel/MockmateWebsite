# Technical chores

Keep actionable reliability and operability work here. Historical audit reports
are not current completion evidence; verify nearby code and tests before acting.
Release prerequisites live in [the launch checklist](../LAUNCH-CHECKLIST.md).

## Current code concerns to address

- [ ] Bound or replace all-time admin analytics scans. The no-date-filter branches
  in `app/api/admin/analytics/route.ts` still read entire `interview_sessions`
  and `analytics_events` collections.
- [ ] Make admin deletion chunked and recoverable across partial failures.
  `app/api/admin/users/route.ts` still accumulates collection deletions into one
  batch before deleting the Auth account. Reuse the self-service deletion contract
  where appropriate; test more than 500 documents and interrupted cleanup.
- [ ] Declare and deploy the composite index for the admin audit-log action filter
  after confirming its query shape. `firestore.indexes.json` has no
  `admin_audit_log` collection entry.

## Billing verification

- [ ] Re-audit webhook retry markers and side-effect idempotency in
  `app/api/webhook/stripe/route.ts` and `lib/stripe-helpers.ts`, using Stripe
  test-mode replay. Release-marker handling exists; do not assume the old
  swallowed-error report still describes every handler.
- [ ] Verify monthly cancellation/downgrade reconciliation against definitive
  Stripe states and transient failures. Do not downgrade on an uncertain read.
- [ ] Security review of webhook and entitlement changes before release.
  Verify role-gated access, durable failures, and protected-account deletion.

## Deferred architecture and product decisions

- [ ] Feedback runtime/scoring consolidation: preserve streaming, track-specific
  scoring, integrity handling, and server persistence before switching a live
  route. Compare recorded-session outputs and use a staged flag; a scoring change
  is a product decision, not merely dead-code deletion.
- [ ] Review the `keywordStuffing` heuristic for false penalties on concise
  explanations. Validate current `lib/feedback/pre-screening.ts` and its
  scoring consumers before changing thresholds or weights.
- [ ] Keep `lib/notification-helpers.ts` until welcome-notification consumers
  are migrated or explicitly retired. Do not infer it is dead from an old audit.
- [ ] Re-triage Palantir coverage: timed Python/SQL/REST assessment, learning-round
  drills, and behavioral/mission-fit practice are separate product work, not
  implied by the existing Case Labs. Review current catalog and tests first.
- [ ] Server-isolated Sprint Labs execution, remaining workbook content, and
  editing-agent capabilities are future work; preserve the current
  [grading and access boundaries](../sprint-labs/DECISIONS.md).

## Operational checks

Verify actual external state rather than marking it done from code presence:
runtime credentials, role assignments, `ADMIN_PROTECTED_EMAILS`, provider spend
caps, and cron schedules. In particular, confirm `aggregate-usage` runs hourly
and `config/cost_averages.calculatedAt` remains fresh.
Use [the cron runbook](../../app/api/cron/README.md) as the schedule authority.

Older low-priority findings remain recoverable in Git; re-triage them against the
current implementation rather than recreating an execution-report ledger.
