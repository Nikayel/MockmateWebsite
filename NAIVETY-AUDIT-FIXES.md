# Naivety Audit: remaining fixes

**Audience:** developers and `/loop` agents.
**Produced:** 2026-08-09, by a six-lens council audit (concurrency, scale and cost, trust
boundaries, money and time, third-party failure, client resilience). Every finding below was
attacked by a separate skeptic instructed to refute it and to refute when unsure; only findings that
survived that pass are recorded here.

**What "naivety" means here:** code that assumes a world simpler than the one it runs in. Every item
names a concrete scenario that produces a wrong result, loses data, costs money, or hangs. Nothing
here is style or preference.

---

## How to use this document

1. Pick ONE item by ID. Do not batch unrelated items into one commit.
2. **Re-verify before you fix.** Open the cited `file:line` and confirm the claim still holds. Line
   numbers drift, and only the two items in Part 1 were verified by hand. Treat everything in Part 2
   as a strong lead, not as established fact.
3. Implement the fix spec as written. Reuse the named existing helper rather than inventing an
   abstraction (per `CLAUDE.md`).
4. Add a regression test, and **mutation-check it**: reintroduce the bug and confirm your test
   fails. A test that passes against the broken code is not a gate. See
   `app/api/webhook/stripe/route.test.ts` ("stripe webhook retries") and
   `app/interview/__tests__/voice-auth-wiring.test.ts` for the pattern.
5. Run `pnpm typecheck && pnpm test && pnpm lint` before committing.

### The lesson that produced most of this list

The two bugs already fixed shared one shape: **every unit was correct in isolation and the
composition was wrong.** Deepgram's service tests passed, its hook's tests passed, the transcript
repair had 28 tests, and none of it ran, because the one call site never passed a token. When you fix
something here, ask what test would have caught the *wiring*, not the unit.

---

## Part 1 — Already fixed. Do not re-implement.

| ID | What it was | Commit |
|---|---|---|
| ~~NAIVE-01~~ | Stripe webhook rejected events whose `created` was over 5 minutes old. `created` is when the event happened, and Stripe retries for up to 3 days carrying that same timestamp, so the first delivery had 5 minutes and every retry after was refused with a 400 forever. One Firestore blip turned a recoverable failure into a customer who paid and never got Pro. | `e2982aa2` |
| ~~NAIVE-02~~ | `app/interview/page.tsx` never passed an auth token to `useVoiceInput`, so Deepgram could not authenticate its token grant, reported itself unconfigured, and `fallbackToWebSpeech` silently downgraded every session to the browser recognizer. Nova-3, the interview keyterms, and the Big-O transcript repair were all live, tested, and unreachable. | `b27c9d9c` |

---

## Part 2 — Remaining

Ordered by blast radius. Severity is the skeptic's corrected value, except where noted.

### NAIVE-03 — `/api/email/welcome` will send attacker-authored HTML to any address
**Severity: HIGH** (raised from the council's medium; this is a domain-reputation and phishing risk,
not just a bug)
**`app/api/email/welcome/route.ts:103`**

The route validates that `body.userId` matches the caller, and then takes the **recipient address**
and the **display name** from the request body. A signed-in attacker POSTs their own `userId` with
`email: "victim@example.com"` and a `displayName` containing markup, and the platform sends it from
its own verified sending domain.

**Breaks when:** immediately, by any signed-in user. The ownership check passes because the attacker
does own the `userId`; it just does not constrain who the mail goes to.

**Fix:** stop accepting recipient and name from the caller. Derive the recipient from
`decodedToken.email` (falling back to the stored profile) and the name from the profile. Escape any
user-controlled string that reaches the HTML body.

**Do not break:** the legitimate welcome-email path called after signup, and the cron backstop in
`app/api/cron/email-notifications/route.ts`.

---

### NAIVE-04 — The free-tier paywall is enforced only if the browser cooperates
**Severity: HIGH** (raised; this is revenue, and trivially exploited)
**`app/api/usage/session-start/route.ts:26`**

Be precise about what is and is not broken here, because it is easy to misread.

The **gate is server-side and correct**: `enforceQuota` reads `sessions_used` and refuses cost-bearing
calls once the free allowance is spent (`lib/quota-enforcement.ts:599`).

The **counter is client-driven**. `recordSessionStartAdmin` has exactly one caller in the entire
codebase, this route, and this route only runs when the browser chooses to announce a session start.
So a free user who blocks that single request (devtools request blocking, an extension, a patched
`fetch`) leaves `sessions_used` at 0 forever, and the correct gate then reads a counter that never
moves.

**Fix:** spend the session server-side on first use rather than on announcement. Have `enforceQuota`
(or `/api/chat` and `/api/execute` directly) call `recordSessionStartAdmin` idempotently keyed on
the session id, so the first cost-bearing call is what consumes the quota.

**Do not break:** the existing idempotency, so a session is not double-counted across chat and
execute. See `lib/quota-enforcement.ts`.

---

### NAIVE-05 — Every interviewer turn fires a second LLM call that is thrown away
**Severity: HIGH.** **`app/api/chat/route.ts:862`**

Three independently verified problems in one path:

1. **The output is discarded.** `USE_EXTRACTION_SERVICE` is `false` (`lib/feature-flags.ts:45`), so
   the live branch only reaches `logger.info`. The merged tracker is never persisted.
2. **The throttle is inert.** `lastExtractionAt` is read off the client-supplied
   `conversationTracker` (`route.ts:237`), and **nothing anywhere writes it**, so
   `shouldRunExtraction` computes `messageCount - 0` and returns true from about the third message on.
3. **The cost is misattributed.** `extractConversationState` runs with `userId:
   "system-extraction"`, so per-user monthly budgets (`quota-enforcement.ts:276`) and the daily cap
   (`usage-tracking.ts:354`) never see it. The global $250/day ceiling does (`ai-providers.ts:945`).

**Breaks when:** any normal conversation. A 20-turn interview pays for roughly 17 extra calls
(`maxParseAttempts: 2`, so up to two provider round trips each), near-doubling interviewer chat
spend, and a user at 99% of their allowance keeps generating uncounted spend.

**Fix:** delete `runConversationExtractionAfterResponse` and its job construction; nothing consumes
the output. If the extraction is genuinely wanted, run it where its result is persisted, advance
`lastExtractionAt` so the throttle is real, and pass the verified `userId` through so the cost lands
on the caller.

---

### NAIVE-06 — No AI provider call has a deadline, so a slow vendor defeats the fallback chain
**Severity: HIGH.** **`lib/ai-providers.ts:597`**

The fallback chain only advances on rejection. A vendor that is **slow rather than down** never
rejects, so DeepSeek and Gemini are never tried even though they are healthy, and Vercel kills the
function at its budget.

**Fix:** give each provider call an explicit deadline sized to fit the function budget:
`signal: AbortSignal.timeout(ms)` on the three `fetch` calls and `requestOptions: { timeout: ms }`
on `getGenerativeModel`. Roughly 12s primary, 8s per fallback. Then make an abort advance the chain
rather than fail the request.

**Do not break:** the deliberate fail-closed behaviour when every rung is exhausted.

---

### NAIVE-07 — A dropped Deepgram socket is indistinguishable from the user stopping
**Severity: MEDIUM.** **`lib/voice/deepgram-service.ts:401`**

`onclose` cannot tell an intentional stop from a 1011 internal-error close, a proxy idle-kill, or a
brief wifi drop. A clean close frame fires no `onerror` at all, so the microphone dies mid-answer
with no indication and any unsent `accumulatedTranscript` is lost.

**Fix:** set an `isStoppingIntentionally` flag in `stopTranscription()`, clear it on connect, and in
`onclose` when the flag is unset flush the pending transcript and surface a reconnect or a clear
error.

**Note:** this became reachable only now that NAIVE-02 is fixed and Deepgram actually runs. Treat it
as newly live, not as long-standing.

---

### NAIVE-08 — Interview metrics accumulate in a process-local `Map`
**Severity: MEDIUM.** **`lib/session-metrics.ts:144`**

A module-level `Map` is written by one request and read by later ones, as if one serverless instance
owned a session end to end. Every mutator opens with `if (!state) return`, and
`app/api/session/metrics/route.ts:79` returns `{success: true}` for the dropped event.

**Breaks when:** Vercel scales out mid-interview. `session_start` lands on A, some events land on B
and are silently dropped with HTTP 200, `session_complete` returns to A which still holds a state
object, so `isReconstructedSession` stays false and a half-populated session is scored as complete.
That score is written into `user_stats.averageScore` by `storeSessionSummary:809`, so the dashboard
average permanently diverges from the per-session scores the user saw.

**Not affected:** spaced repetition. `updateUserProblemMastery:1140` skips scheduler-owned docs, and
intervals come from `interview_sessions.performance_score`. The aggregates get poisoned; nobody gets
mis-scheduled.

**Fix:** make Firestore the store of record. Write each event to `session_metrics/{sessionId}` with
`FieldValue.increment` / `arrayUnion` and have `completeSessionMetrics` read that doc. Minimum
stopgap: when the `Map` has no entry, stop returning 200, and mark any non-resident session as
reconstructed so degraded scores stop feeding `user_stats`.

---

### NAIVE-09 — The email cron is built on unordered `limit(100)` scans
**Severity: MEDIUM.** **`app/api/cron/email-notifications/route.ts`**

Five distinct issues in one file. The council found fourteen; they collapse to these.

**(a) Unordered, uncursored `.limit(100)` collection scans** at lines **216, 497, 627, 780**. With no
`orderBy` and no cursor, Firestore returns the same `__name__`-ordered prefix every run. Past 100
users, every signup whose UID sorts after the 100th-smallest is permanently invisible: **no welcome
email, ever**. The cron still reports success with a plausible sent count.
*Fix:* filter in the query, not in memory. For welcome emails,
`where('welcome_email_sent','==',false)` plus a `created_at` bound, with the composite index.

**(b) The inactivity query returns exactly the users its filter discards**, lines **354-355**. The
inequality on `last_session_at` implies an ordering that hands back the 100 most-stale users, and the
in-memory 24-72h filter then drops all of them. *Fix:* put both ends of the window in the query.

**(c) The spaced-repetition reminder queries phantom parents**, line **497**. Nothing anywhere
creates the parent doc `problem_mastery/{userId}`; every writer writes only the `problems`
subcollection, and Firestore does not return documents that exist solely as subcollection ancestors.
**That snapshot is empty today and always has been.** *Fix:* drive it off
`collectionGroup("problems").where("next_review_at","<=",now)` and group by `doc.ref.parent.parent`.

**(d) Six sequential phases share one 30s budget** with no resume point, line **170**. *Fix:* split
into separately-scheduled routes, or persist a phase cursor and round-robin across runs.

**(e) `emails_sent_today` is incremented from a stale read and never zeroed**, line **1027**, so the
3-per-day cap degrades into roughly 1-per-day. *Fix:* apply the same timezone-aware day comparison on
the write that `canSendEmail` applies on the read.

---

### NAIVE-10 — Admin user deletion stages every document into one `WriteBatch`
**Severity: HIGH.** **`app/api/admin/users/route.ts:296`**

Firestore caps a batch at 500 writes. `email_notifications` accrues one doc per cron send and
`session_vectors` several per session, so an engaged account crosses 500 and `batch.commit()` rejects
with `INVALID_ARGUMENT`. The admin sees "Failed to delete user" and the account is left partially
deleted.

**Fix:** collect refs, then use the existing `deleteInChunks` from
`app/api/delete-account/delete-user-data.ts`. Also move the Stripe cancellation to **after** the
Firestore delete succeeds, so a failed delete cannot strand a cancelled subscription on a live
account.

---

### NAIVE-11 — `syncSubscriptionFromStripe` strips Pro on the first declined charge
**Severity: HIGH.** **`lib/stripe-helpers.ts:689`**

The webhook deliberately preserves Pro through dunning and emails the customer. They open `/account`
to fix their card, which auto-fires `/api/sync-subscription`, which sees `past_due` and writes
`subscription_tier: 'free'` — undoing the grace **at the exact moment they came to pay**.

**Fix:** downgrade the tier only for terminal statuses (`canceled`, `unpaid`, `incomplete_expired`,
expired `incomplete`). For `past_due`, write `subscription_status` and leave `subscription_tier` and
the quota alone, mirroring the `retriesExhausted` rule the webhook already uses.

---

### NAIVE-12 — The SSE reader drops any feedback frame split across two chunks
**Severity: HIGH.** **`lib/hooks/use-streaming-feedback.ts:446`**

`currentEvent` is declared **inside** the read loop, so it is destroyed at every chunk boundary. If a
read boundary falls inside a frame's `data:` line, chunk N consumes `event: feedback` and then the
loop exits; chunk N+1 re-enters with `currentEvent = ""` and the completed data line is discarded.

**Breaks when:** network chunking happens to split a frame. Non-deterministic, so it will present as
"feedback sometimes just does not appear".

**Fix:** hoist `currentEvent`/`currentData` above the `while (true)` loop, or restructure to consume
one complete `\n\n`-terminated frame at a time out of the buffer. Test by feeding the reader a frame
split mid-`data:` line.

---

### NAIVE-13 — Voice tokens are minted with no budget gate and metered by a client POST
**Severity: MEDIUM.** **`app/api/voice/token/route.ts:43`**

The grant is not gated on quota or the global ceiling, and the resulting Deepgram minutes only enter
the ledger if the browser volunteers a `POST /api/usage/voice`. The ordinary case is a candidate
closing the tab mid-interview: `stopRecording` never runs and those minutes are recorded as $0. The
adversarial case is scripting the grant in a loop and never reporting.

**Fix:** gate the grant (`checkQuota(request, { requireAuth: true })`, or at minimum
`isGlobalCeilingExceeded()`), and meter **at grant time** rather than at report time.

**Note:** this became reachable only now that NAIVE-02 is fixed.

---

### NAIVE-14 — Billing periods are built from local-time date parts
**Severity: MEDIUM.** **`lib/quota/billing-period.ts:27`**

The browser and the server compute different period boundaries for a user west of UTC, so
`resolveUserQuota` can match no document and the client disagrees with the server about which period
is current.

**Fix:** build boundaries in UTC on both sides: `Date.UTC` in `clampedAnniversary` and
`daysInMonth`, `setUTCHours`/`setUTCMonth`/`setUTCDate` in the Stripe branch, `getUTCDate` for the
anniversary.

---

### NAIVE-15 — The first payment of every monthly subscription is recorded twice
**Severity: MEDIUM.** **`app/api/webhook/stripe/route.ts:506`**

`checkout.session.completed` writes `cs_xxx_succeeded` and `invoice.paid` (billing_reason
`subscription_create`) writes `in_xxx_succeeded` for the same charge, under two different keys, so
idempotency does not catch it. Admin revenue is inflated by one month's price per new subscriber.

**Fix:** in the subscription branch of `checkout.session.completed`, either skip
`recordPaymentHistory` and let `invoice.paid` own the row, or pass the session's invoice id so both
paths derive the same natural key.

---

### NAIVE-16 — Unbounded, unprojected session queries on the hottest pages
**Severity: MEDIUM.** **`app/dashboard/page.tsx:136`, `app/interview/page.tsx:643`,
`app/api/admin/cohorts/route.ts:58`**

All three run `where(user_id ==)` with no `limit` and no `select`, downloading every session
document **in full**, including transcript, code, and workspace files, to render ten rows or compute
a set of completed ids. The admin cohorts endpoint reads three whole collections with no time bound
(roughly 70k billed reads at 10k users, and a timeout).

**Fix:** `orderBy("started_at","desc")` + `limit(20)` on the dashboard; a `completed_scenarios` array
or a small summary collection for the interview page's completed set; `where("started_at",">=",
oldestCohortStart)` plus `.select("user_id","started_at")` on cohorts. Paginate `/sessions` with
`startAfter` cursors.

---

### NAIVE-17 — Autosave lets a localStorage failure cancel the cloud backup
**Severity: MEDIUM.** **`app/interview/_hooks/useInterviewAutosave.ts:90`**

`setItem` and `saveSessionState` share one `try` block with localStorage first. Origin quota
exhaustion (stale unsliced blobs including full workspace file contents accumulate one per abandoned
scenario and are never swept) or storage being disabled throws, and the Firestore save is skipped
too. The user loses their work in the one case the cloud backup exists for.

**Fix:** give `setItem` its own try/catch so a storage failure cannot skip `saveSessionState`. On
failure, prune other `interview_autosave_*` keys or drop the transcript from the payload.

---

### NAIVE-18 — The session detail page ignores the status the app actually writes
**Severity: MEDIUM.** **`app/sessions/[id]/page.tsx:103`**

The page does not handle `processing`, which is what gets written during the normal 30-60s generation
window and permanently if the user closes the tab mid-stream. Its `failed` retry branch is
unreachable.

**Fix:** extract one `isEvaluating(status)` predicate. `app/sessions/page.tsx:219-224` already has
the correct version; use it in both the poll guard and the render branch.

---

## Deliberately not in this list

Decided and recorded elsewhere; do not "fix" these without asking:

- **Edge-vs-Node scoring duplication.** Confirmed real (`analyzeAICodeOverlap` differs in algorithm
  and threshold, 85% vs 70%; `getDefaultValidation` exists 3x with `communicationScore` 30/25/30).
  Deferred until ~100 users because unifying it shifts every existing user's score.
- **`interview_sessions` is client-writable with no field validation.** Accepted: corrupts analytics
  and the research corpus, grants no entitlement.
- **Referral rewards are paid manually.**
- **`problem_mastery` field-name mismatch** (`problemId`/`first_review_at` written,
  `problem_id`/`first_seen_at` read). Known; needs a backfill decision.
- **Notification quiet hours are inert** (written to `notification_preferences/{uid}`, read from
  `profiles.{uid}.notification_preferences`). Known; fixing it starts suppressing mail.
- **Score-to-colour banding has 9 copies** (80/60 vs 70/50 vs 85/70/50), so a 72 is amber on
  `/sessions` and emerald on `/practice`. Safe slice: unify the six 80/60 sites preserving 80/60.
- **`lib/validations/api-schemas.ts` is ~90% dead** and contradicts live routes. Delete, do not
  reconcile.
