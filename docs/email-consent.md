# Email consent and unsubscribe

`lib/email/consent/` owns optional-email eligibility, account preference writes, provider suppression, signed sync jobs, and the Brevo unsubscribe callback. Billing/security email is classified separately at every transport call.

## Behavior

- Every optional provider attempt checks current profile preferences, Firebase Auth email identity, and current Brevo suppression. The transport repeats this gate on retries and reads local preferences again after the provider lookup. Queued work cannot rely on the settings from when it was selected.
- Optional mail fails closed if preferences or Brevo consent cannot be verified. Reminder delivery also requires working unsubscribe headers. Suppression is recorded as skipped, not sent; saved-practice jobs become cancelled.
- New signed unsubscribe links explicitly stop **all optional email**, including promotions and practice/review reminders. Historical links retain the category-only scope originally advertised. GET confirms without changing state; POST applies the signed scope.
- A newsletter unsubscribe observed in Brevo suppresses all optional app email. Authenticated provider callbacks record this promptly; send-time checks provide a fallback if the callback is delayed.
- Turning off Product Updates alone suppresses campaigns without turning off separately enabled reviews. We record the fingerprint of our own provider suppression before issuing it, so our contact update cannot masquerade as a new recipient unsubscribe.
- Explicitly enabling optional reminders after an earlier provider unsubscribe is respected. Newer unsubscribe events take precedence. Unrelated contact modification dates are not treated as unsubscribe dates.
- Background code **never unblocks or re-subscribes a Brevo contact**, updates its address, or blocks transactional senders. A previous newsletter unsubscribe remains blocked at Brevo until the user re-subscribes through the newsletter/provider flow.

## Ownership and concurrent writes

The account page PATCHes only `{key, value}` through `/api/email/preferences`. The server authenticates the owner, validates a boolean-key allowlist, and updates that field transactionally. It seeds missing defaults inside the same transaction and preserves existing opt-outs, timezone, and unrelated settings. Smart-notification email projections update in that transaction too.

Welcome success/failure handlers and client profile upserts no longer replay default email preferences. Welcome contact metadata is updated only after a successful consent-checked delivery. The legacy admin preference migration uses the same transactional initializer.

An opt-out and its pending provider-suppression job commit together. Jobs live on the existing profile document, so account deletion removes them. Jobs are HMAC-signed for their user ID, revision, address, and intent; the worker also verifies the address against Firebase Auth before any provider access. Editable profile fields cannot authorize a suppression for somebody else's address.

The outbox uses revision checks, retries provider failures later, and removes completed/cancelled due dates. A stale worker cannot acknowledge a newer job. Only suppression (`emailBlacklisted: true`) is permitted. If Brevo is unavailable, local app mail is stopped immediately and the account/unsubscribe UI reports pending campaign suppression rather than pretending the provider accepted it.

## Deployment and historical repair

The existing email cron runs bounded consent maintenance before considering messages. Maintenance:

1. Registers or refreshes the authenticated Brevo marketing-unsubscribe webhook.
2. Retries due suppression jobs.
3. Reconciles a resumable page of profiles with saved marketing/global email settings.

Product Updates defaults to **off**. Saved app preferences are authoritative: contacts without marketing consent are suppressed from campaigns. A cursor in `system_settings/email-consent-reconciliation` carries historical repair across runs. Email addresses are normalized during repair for callback matching. No optional email is sent by maintenance.

`POST /api/email/consent-sync` runs the same maintenance without sending emails. It requires the existing cron bearer token and reports webhook readiness, pending-job work, history progress, and the total number of outstanding suppression jobs (including future retries). It can be invoked repeatedly until a historical pass completes. New queries use automatic single-field indexes; no composite index is required.

No new environment variables are needed. Existing `BREVO_API_KEY` and `EMAIL_UNSUBSCRIBE_SECRET` (falling back to `CRON_SECRET`) supply provider access and purpose-specific signatures. The webhook receives a derived token, never the underlying cron secret. Reconciliation refreshes webhook authentication after secret rotation.

An email already accepted by the delivery provider cannot be recalled. The last-mile gate covers selection, queued jobs, and retries before that boundary.

## Verification

Regression coverage includes welcome success/failure, single-field edits after an unrelated unsubscribe, missing defaults, global/category token compatibility, duplicate/late provider events, callback authentication, forged sync jobs, address mismatch, failed synchronization, cancellation due dates, and opt-out between provider retries. Browser checks exercise the real account hook on desktop/mobile, including lost-response recovery and unavailable preference loading. No real email is sent by these checks.

Provider references: [contact suppression](https://developers.brevo.com/reference/update-contact), [marketing unsubscribe events](https://developers.brevo.com/docs/marketing-webhooks), [authenticated webhooks](https://developers.brevo.com/reference/create-webhook).
