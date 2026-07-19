# Pre-Launch Security, UX & Reliability Fixes

**Audience:** developers and `/loop` agents implementing the remaining fixes.
**Scope:** findings from the pre-launch audit (security, UX, reliability) across the
API routes, Firestore rules, billing, and the Python curriculum runner.

This document is the single source of truth for the audit. It has two parts:

- **Part 1 — Already shipped** (on `main`). Do **not** re-implement these; they are
  done and verified by typecheck + focused tests. Listed so you don't regress them.
- **Part 2 — Remaining** (not yet fixed). Each item has a stable ID, exact
  `file:line`, the concrete failure scenario, a precise fix spec that names the
  existing repo pattern to reuse, and a **Do-not-break** note.

### How to use with `/loop`
Pick one `REMAINING` item by ID, implement exactly the fix spec, run the listed
verification, then commit with the message prefix shown. Do not widen scope.
Reuse the named helper/pattern rather than inventing a new abstraction (per
`CLAUDE.md`). If a fix needs the Firestore emulator or a Stripe test flow to
verify safely, it is marked **NEEDS-STAGING** — do not ship it blind.

### Repo conventions you must follow
- **Auth (Node routes):** `verifyAuth(request)` / `withAuth` from `lib/auth-helpers.ts`.
  Never trust a `userId`/`sessionId` from the request body; always derive from the
  verified token and check ownership against the Firestore doc.
- **Auth (Edge routes):** `verifyAuthEdge(request)` from `lib/auth-edge.ts`.
- **Admin auth:** `verifyAdminAccess(request)` from `lib/admin/middleware.ts` (RBAC via
  `admin_roles`). Never gate on the user-writable `profiles.is_admin` field.
- **Cron auth:** `Bearer ${CRON_SECRET}` compared with `crypto.timingSafeEqual`, failing
  closed if the secret is unset (see `app/api/cron/aggregate-usage/route.ts`).
- **Rate limiting:** `executeRateLimit` / `apiRateLimit` from `lib/rate-limit.ts`
  (returns a `NextResponse` if throttled, else `null`).
- **Client → API auth token:** `getCurrentUserToken()` from `lib/firebase-lazy.ts`,
  attached as `Authorization: Bearer <token>`.
- **Commits:** commit as the user (no AI co-author). This repo's commit signing hangs
  non-interactively — use:
  `git -c commit.gpgsign=false -c gc.auto=0 commit --no-verify -F <msgfile>` after
  running `pnpm typecheck` manually. `git push` is HTTPS (no passphrase).

---

## Part 1 — Already shipped on `main`

| Commit prefix | What it fixed |
|---|---|
| `security(feedback):` | **CRITICAL** `POST /api/feedback/persist` was fully unauthenticated and wrote attacker-controlled scores/feedback into **any** `interview_sessions` doc by body `sessionId` (IDOR). Now requires a verified token, rejects `userId` mismatch, and loads the session to confirm `user_id === caller`. Same auth + ownership added to `instant`, `status`, `process` (cron-secret for `processAll`; user token only for own job), and `stream` (Edge, via new `lib/auth-edge.ts`). All client callers (`use-streaming-feedback.ts`, `use-two-phase-feedback.ts`, `useFeedbackStreaming.ts`) now attach the ID token. |
| `fix(learn):` | **HIGH** Pyodide cold-start bug: the 5s run timeout included the multi-MB runtime download, and a timeout terminated the worker (discarding the download), so slow-network learners got a misleading "infinite loop" error and could never complete a first run. Now a 60s **boot** timeout is swapped for the 5s **execution** timeout when the worker signals `exec-start`. Also: failed loads no longer cache forever; each run executes in a **fresh namespace** (fixes a forged-pass bug where a prior run's function lingered in shared globals) with PyProxy/FS cleanup. |
| `security(rules):` | **MEDIUM** `in_app_notifications` update rule didn't pin `request.resource.data.userId`, letting a user reassign a notification they own to a victim (phishing). Now pins the owner and restricts mutable keys to read/dismiss state. Dead open-create `analytics/*` rule locked to deny. `lib/analytics-server.ts` switched from the client SDK (silently denied on the server) to the Admin SDK. |
| `security(api):` | **MEDIUM** `transpile` got IP rate limit + 100KB cap (was unauthenticated/unbounded CPU). `rate-limit-feedback` GET/PATCH now use RBAC `verifyAdminAccess` instead of user-writable `profiles.is_admin`. `notifications` evaluate no longer lets `body.context.userId` shadow the verified uid. `customer-portal` refuses to link a Stripe customer by email if it's owned by a different `userId`. |
| `security(quota):` | **HIGH** (defense-in-depth) `profile_quota` reset bypass: `getUserQuota` took the first matching doc, so a user could mint a fresh `sessions_used: 0` doc to reset their limit. Now picks the most-conservative matching doc (max `sessions_used`). **The full server-authoritative fix is item `QUOTA-1` below.** |

---

## Part 2 — Remaining fixes

### QUOTA-1 — Make `profile_quota` server-authoritative — **HIGH** — **SHIPPED 2026-07-19, EMULATOR-VALIDATED**

> **UPDATE 2026-07-19 (pre-launch sweep): DONE.** Shipped as: shared period math
> extracted to `lib/quota/billing-period.ts` (anniversary/Stripe model everywhere);
> `lib/quota/session-start-admin.ts` runs both quota transitions in one Admin-SDK
> transaction targeting the most-conservative current-period doc; thin
> `POST /api/usage/session-start` (verified-token identity only); client
> `recordSessionStart` delegates to the API; `initializeUserQuota` replaced by
> read-only `resolveUserQuota`; `getUserQuota` now matches docs against the real
> billing window (the calendar/anniversary mismatch below is fixed); rules:
> `profile_quota` create/update `if false`. Emulator drill
> (`lib/quota/__tests__/session-start-admin.emulator.test.ts`, run via
> `firebase emulators:exec`) passed 6/6: free-tier limit denial, pro limit,
> free-open consumption order, rollover resets exactly once, conservative-doc
> targeting with forged duplicates, history immutability.
> **DEPLOY ORDER: deploy the app to Vercel BEFORE `firebase deploy --only
> firestore:rules`**, or older client bundles fail to start sessions.
> Original spec kept below for history.
- **Files:** `firestore.rules` (`match /profile_quota/{quotaId}` ~L134–169),
  `lib/firestore-helpers.ts` (`initializeUserQuota` ~L299–419, `recordSessionStart`),
  `lib/quota-enforcement.ts` (`getUserQuota` ~L255–314).
- **Problem:** Clients can create/update their own `profile_quota` docs. The read-side
  mitigation (shipped) blocks the "mint zero-usage doc" reset, but the collection is
  still client-writable, and there is a **latent period-model mismatch**: the client
  uses anniversary billing (`calculateBillingPeriod`) while the server matches by
  **calendar month** (`getUserQuota` L258–260). These can disagree at month
  boundaries, mis-reporting usage.
- **Failure scenario:** A determined user manipulates quota docs within the allowed
  update transitions, or the anniversary/calendar mismatch grants/denies sessions at
  the wrong time. Bounded today by the server-only budget guard
  (`usage_summaries.totalCost` vs `BUDGET_LIMITS[tier]`), so this is not unlimited
  spend, but session accounting is not trustworthy.
- **Fix spec:**
  1. Set `profile_quota` rules to `allow read: if isOwner-by-user_id; allow write: if false;`.
  2. Add an authenticated API route `POST /api/usage/session-start` that runs
     `initializeUserQuota` + `recordSessionStart` via the **Admin SDK** (server creators
     already exist in `lib/stripe-helpers.ts:84`, `app/api/promo-code/route.ts:151`,
     `app/api/cron/subscription-expiry/route.ts:111` — reuse their doc shape).
  3. Move the client's direct `setDoc`/`addDoc` calls in `lib/firestore-helpers.ts`
     behind that route (client calls the API with `getCurrentUserToken()`).
  4. Unify the period model: pick ONE (recommend anniversary) and use it in BOTH
     `initializeUserQuota` and `getUserQuota`. Store a canonical `period_key` on the doc
     and use a deterministic doc ID `{uid}_{period_key}` so only one doc can exist per
     user per period.
- **Do-not-break:** Session start currently happens client-side and gates the whole
  interview flow. Verify end-to-end with the **Firestore emulator**: free user hits the
  session limit, Pro user has the higher limit, month/anniversary rollover resets usage
  exactly once. Do not ship without this.
- **Verify:** emulator flow above + `pnpm vitest run lib/__tests__/quota-enforcement.test.ts`.
- **Commit:** `security(quota): server-authoritative profile_quota writes`

### API-IDOR-1 — `session/metrics` trusts body `sessionId` without ownership — **MEDIUM** — **ALREADY FIXED (verified 2026-07-19)**

> Verified in code: every non-session_start event now runs `verifySessionOwnership(sessionId, userId)`
> (in-memory state first, `interview_sessions.user_id` fallback) and returns 403 on mismatch —
> exactly this spec. Original text kept below for history.
- **File:** `app/api/session/metrics/route.ts` (token verified L30–37; every branch acts
  on `body.sessionId` with no ownership check — `get_metrics` L133, `session_complete`,
  `chat_message`, `code_execution`).
- **Problem:** A signed-in user can read/complete/mutate **another** user's session metrics
  by supplying their `sessionId`.
- **Failure scenario:** Attacker calls `{ event: "get_metrics", sessionId: <victim's> }`
  and reads the victim's session metrics; or `session_complete` to score/complete a
  session they don't own.
- **Fix spec:** On `session_start`, persist the verified `userId` onto the in-memory /
  Firestore metrics record. On every subsequent event, load the record and reject if its
  `userId !== authenticatedUserId` (403). Mirror the ownership pattern now used in
  `app/api/feedback/persist/route.ts`.
- **Do-not-break:** `session_start` must set the owner or all later events 403. Impact is
  mostly an in-memory metrics store today, hence MEDIUM.
- **Verify:** `pnpm typecheck`; manual: start a session, confirm events succeed for the
  owner and 403 for a different token.
- **Commit:** `security(api): enforce session ownership on session/metrics`

### API-COST-1 — `agents/recommendations` (+ `/next`) missing rate limit — **MEDIUM** — **RESOLVED BY DELETION (verified 2026-07-19)**

> Both routes were removed in the go-live dead-code sweep (`app/api/agents/` now contains only
> `hints/`, which already rate-limits). Nothing to fix.
- **Files:** `app/api/agents/recommendations/route.ts`,
  `app/api/agents/recommendations/next/route.ts`.
- **Problem:** Both `verifyAuth` (good) but call LLM-backed generators with **no** rate
  limiter and accept an unbounded `catalog[]` (only `.length === 0` checked).
- **Failure scenario:** A signed-in user loops requests with a large `catalog` to drive
  LLM spend within their session.
- **Fix spec:** Add a `rateLimit(...)` prefix (mirror `app/api/agents/hints/route.ts`,
  which uses `hintRateLimit` + input validators) and clamp `catalog.length`
  (e.g. `catalog.slice(0, 50)`).
- **Verify:** `pnpm typecheck`; confirm the hints route pattern is copied faithfully.
- **Commit:** `security(api): rate-limit agent recommendation routes`

### API-VALID-1 — spaced-repetition / nps: weak numeric validation, no rate limit — **MEDIUM**
- **Files:** `app/api/spaced-repetition/complete/route.ts` (validates only `problem_id` /
  `performance_score`; `mastery_score`, `time_spent_minutes`, `hints_used`,
  `test_cases_*` taken as-is), `app/api/nps/route.ts` (two full `interview_sessions`
  scans per call), `app/api/spaced-repetition/mark-reviewed/route.ts`.
- **Problem:** Self-scoped data skew (a user can inflate their own mastery/streak inputs)
  and unbounded DB scans.
- **Fix spec:** Add a Zod schema per route that clamps numerics to sane ranges
  (`z.number().min(0).max(100)` etc.), and add `apiRateLimit(request)` at the top. Reuse
  the Zod pattern from `app/api/user/notification-preferences/route.ts`.
- **Verify:** `pnpm typecheck`; add a unit test asserting out-of-range inputs are rejected.
- **Commit:** `security(api): validate + rate-limit spaced-repetition/nps writes`

### API-LEAK-1 — 5xx responses leak `error.message` / stack — **LOW**
- **Files:** `app/api/debug-promo-code/route.ts:125` (`error.stack`),
  `app/api/create-checkout/route.ts:286`, `app/api/customer-portal/route.ts:323`,
  `app/api/sync-subscription/route.ts:50`, `app/api/promo-code/route.ts:180`,
  `app/api/seed-vectors/route.ts:162`, `app/api/vectorize-problems/route.ts:98`,
  `app/api/cron/subscription-expiry/route.ts:350`.
- **Problem:** Internal error text (and one stack) returned to the client.
- **Fix spec:** Keep the `logger.error(...)` call, but return a generic message
  (`{ error: "Something went wrong" }`) as `app/api/user/profile/route.ts` already does.
- **Verify:** `pnpm typecheck`.
- **Commit:** `security(api): stop leaking internal errors in 5xx responses`

### API-LEAK-2 — unauthenticated health/topology disclosure — **LOW** — **FIXED 2026-07-19** (anonymous gets {status,timestamp}; detail behind CRON_SECRET bearer via verifyCronRequest; catch no longer echoes error.message)
- **Files:** `app/api/health/route.ts`, `app/api/rag/health/route.ts`.
- **Problem:** Expose which subsystems are healthy + RAG provider/vector counts/namespaces
  to any caller, echoing raw error messages.
- **Fix spec:** Return a bare `{ status: "ok" }` to anonymous callers; gate the detailed
  body behind an internal token (reuse the `CRON_SECRET` compare) or `verifyAdminAccess`.
- **Verify:** `pnpm typecheck`; anonymous GET returns only `{ status }`.
- **Commit:** `security(api): restrict health endpoint detail to internal callers`

### API-VALID-2 — `notifications/preferences` unvalidated writes — **LOW** — **FIXED 2026-07-19** (zod-clamped every PUT mode; unknown keys stripped)
- **File:** `app/api/notifications/preferences/route.ts:59–144`.
- **Problem:** `fcmToken`, `timezone`, `channels`, full `preferences` written straight
  into `set(..., { merge: true })` (self-scoped document-shape pollution).
- **Fix spec:** Add a Zod schema mirroring the per-field sanitization already present in
  `app/api/user/notification-preferences/route.ts`.
- **Commit:** `security(api): validate notification preference writes`

### API-VALID-3 — `analyze-complexity` forwards client `systemPrompt`/`userPrompt` — **LOW** — **ALREADY FIXED (verified 2026-07-19)**

> Verified in code: the route builds the prompt server-side via buildComplexityUserPrompt
> from length-bounded structured fields; no client systemPrompt/userPrompt is accepted.
- **File:** `app/api/analyze-complexity/route.ts:36–58`.
- **Problem:** Auth/rate-limit/quota/size caps all present (spend bounded), but any signed-in
  user gets a general-purpose LLM proxy within their quota — the required `code` field
  isn't even what's sent.
- **Fix spec:** Build the analysis prompt server-side from `code` + `language` only; drop
  `systemPrompt`/`userPrompt` from the accepted body. Update the caller
  `lib/interview/llm-complexity-analysis.ts:90`.
- **Commit:** `security(api): server-build analyze-complexity prompt`

### API-ABUSE-1 — `announcements` unauthenticated dismissal increment — **LOW** — **FIXED 2026-07-19** (per-IP apiRateLimit on the dismissal POST)
- **File:** `app/api/announcements/route.ts:240–291` (`FieldValue.increment(1)`).
- **Problem:** Anyone can inflate dismissal counters (analytics skew only).
- **Fix spec:** Require auth or debounce/rate-limit per IP with `apiRateLimit`.
- **Commit:** `security(api): rate-limit announcement dismissals`

### RULES-1 — Self-tampering of own gameplay/progress records — **LOW**
- **File:** `firestore.rules` — `interview_sessions` (~L88–92), `caseLabRuns` (~L364–380),
  `user_tutorial_progress` (~L387–403).
- **Problem:** Owners can write arbitrary fields (mark sessions/lessons complete, forge run
  verdicts). Nothing paid gates on these fields today, so impact is limited to cheating
  one's own stats/streaks — but the rule comments claim writes are "authoritative via API"
  while still allowing direct client writes.
- **Fix spec:** For `user_tutorial_progress` and `caseLabRuns`, set
  `allow create, update: if false` (both already have Admin-SDK write paths in
  `lib/tutorials/progress.ts` and `lib/labs/case-lab-runs.ts`). For `interview_sessions`,
  restrict client-updatable keys with `affectedKeys().hasOnly([...])` if any field there
  feeds scoring.
- **Do-not-break:** **NEEDS-STAGING** — confirm the client does not rely on a direct write
  path for these (search for client-SDK `setDoc`/`updateDoc` to these collections first).
- **Commit:** `security(rules): make progress records server-authoritative`

### AUTH-GATE-1 — proxy `/learn/python` gate is spoofable — **MEDIUM (mislabeled as hard gate)** — **FIXED 2026-07-19 via option (b)** (comments now state the presence-check truth + name the real boundaries; lesson content is intentionally free; zero behavior change)
- **File:** `proxy.ts` (`hasAuthToken` L31–52; `PROTECTED_ROUTES` L19).
- **Problem:** `hasAuthToken` returns true for **any** value of the `__session` /
  `firebase-auth-token` cookie or any `Authorization` header — no verification. The comment
  calls `/learn/python` a "hard gate," but `document.cookie = "firebase-auth-token=x"`
  bypasses it, serving the signed-in-only tutorial UI/content to anonymous users. (For
  `/admin` this layer is only flash-prevention; real checks live in the admin layout +
  `lib/admin/middleware.ts` — that's fine.)
- **Fix spec:** Either (a) verify the session cookie in the proxy (edge-compatible Firebase
  session-cookie verification, or call a lightweight `/api/auth/verify`), or (b) downgrade
  the comment to state the gate is cosmetic **and** ensure any lesson content that must be
  gated is fetched from an authenticated API (`app/api/tutorials/*`) rather than shipped in
  the page. Recommend (b) — the progress APIs already require real tokens.
- **Verify:** with a junk cookie, `/learn/python` either redirects (a) or renders no gated
  content (b).
- **Commit:** `security(auth): stop treating spoofable cookie as a hard gate`

### DISCLOSE-1 — admin emails in the client bundle — **LOW** — **FIXED 2026-07-19** (server-computed is_protected per row; NEXT_PUBLIC var removed from code — also delete it in Vercel)
- **File:** `app/admin/users/page.tsx:62` (`NEXT_PUBLIC_ADMIN_PROTECTED_EMAILS`).
- **Problem:** The protected-admin email list is inlined into client JS (the server route
  correctly uses non-public `ADMIN_PROTECTED_EMAILS` at `app/api/admin/users/route.ts:39`).
  Discloses admin identities to anyone who downloads the bundle.
- **Fix spec:** Drop the `NEXT_PUBLIC_` var; have the admin users API return
  `isProtected: boolean` per row (computed server-side) and render the disabled state from
  that.
- **Commit:** `security(admin): compute protected-admin flag server-side`

### CSP-1 — `script-src 'unsafe-inline'` in production — **LOW (defense-in-depth)**
- **File:** `next.config.mjs:86` (and `:112`); `img-src https:` fully open at `:90`.
- **Problem:** `'unsafe-inline'` in `script-src` neuters CSP as an XSS mitigation. No injected
  XSS sink was found in the audit, so this is hardening.
- **Fix spec:** Adopt nonce-based CSP for production (Next.js supports per-request nonces via
  middleware/`proxy.ts` headers), remove `'unsafe-inline'` from `script-src`, and narrow
  `img-src` to the hosts actually used.
- **Do-not-break:** **NEEDS-STAGING** — a wrong CSP breaks Stripe/Google/Pyodide script
  loading. Test the interview + learn + checkout pages after the change.
- **Commit:** `security(csp): nonce-based script-src, drop unsafe-inline`

### RUNNER-1 — self-host Pyodide (remove CDN dependency) — **LOW (reliability + supply chain)**
- **Files:** `public/workers/python-sandbox-worker.js:23,27` (jsdelivr `importScripts` +
  `indexURL`); CSP `next.config.mjs:86,92–93`.
- **Problem:** `importScripts` can't carry SRI; a jsdelivr compromise means arbitrary code in
  the worker (it could fabricate test results and exfiltrate submitted code — `connect-src`
  permits jsdelivr). Also: offline/CDN-blocked users can't run any lesson. Version is pinned
  (`v0.26.4`), which is good.
- **Fix spec:** Vendor the Pyodide `v0.26.4` dist under `public/pyodide/`, point
  `importScripts`/`indexURL` at `'self'`, then remove `cdn.jsdelivr.net` from the CSP
  `script-src`/`connect-src`/`worker-src`.
- **Verify:** run a Python lesson with the network throttled/offline after first load.
- **Commit:** `fix(learn): self-host Pyodide runtime`

### NOTIF-WELCOME-1 — welcome in-app notification is denied by rules — **LOW**
- **Files:** `app/auth/callback/auth-callback-client.tsx:49` calls
  `createInAppNotification` (`lib/notification-helpers.ts:282`, a client-SDK `setDoc` on
  `in_app_notifications`); `firestore.rules` sets `in_app_notifications` `create: if false`.
- **Problem:** The write is denied by rules (`PERMISSION_DENIED`), so a new user's welcome
  notification is never persisted. Pre-existing (predates this audit's rule change, which
  only touched the *update* rule); wrapped in try/catch so it fails silently. Cosmetic.
- **Fix spec:** Route the welcome notification through the server
  (`createInAppNotificationServer` via an API route, matching
  `notification-service.ts` / `session-notifications.ts`) instead of the client SDK. Do
  **not** relax the `create: if false` rule.
- **Commit:** `fix(notifications): persist welcome notification server-side`

### FEEDBACK-STREAM-2 — (fixed) stream ownership guard now requires userId — **LOW**
- **Status:** Shipped in this session's follow-up. The Edge `stream` route's guard was
  `if (userId && userId !== authenticatedUserId)`, which skipped the check when the body
  omitted `userId`. Not exploitable (the route persists nothing and `verifyAuthEdge`
  already blocks anonymous callers), but tightened to `if (!userId || userId !== …)` so an
  omitted field can't bypass the match. Listed for the record.

### RUNNER-2 — lesson completion is client-attested — **LOW (do not build entitlements on it)**
- **Files:** `app/api/tutorials/progress/route.ts` (PUT), `lib/tutorials/progress.ts:28–39`.
- **Status:** Acceptable **today** — tests run client-side and the server Zod-validates shape
  only; verified consumers are UI-only (`components/tutorials/useCompletedLessons.ts:21`,
  resume overlay). Firestore rules are correct owner-only defense-in-depth.
- **Action:** **Guard rail, not a fix.** If certificates, streaks, or paid gating are ever
  attached to lesson completion, add server-side re-verification (re-run the scenario's
  tests server-side, or require the submitted code alongside the claim). Until then, leave
  as-is.

### DEPRECATE-1 — retire the Piston server executor — **LOW (cost/reliability)**
- **Files:** `app/api/execute/route.ts`, `app/api/execute/ast/route.ts`, `lib/piston.ts`
  (default `PISTON_API_URL = https://emkc.org/...` at `lib/piston.ts:20`); last live caller
  `components/labs/stations/BuildStation.tsx:100`.
- **Problem:** `/api/execute` is well-protected (auth + dual rate limit + 100KB cap) but rides
  a free community API. `/api/execute/ast` has **zero callers** and accepts an unclamped
  `testCount` that multiplies Piston calls (`lib/validators/ast-parser.ts:472–513` runs 2
  executions per generated input).
- **Fix spec:**
  1. Delete `app/api/execute/ast/route.ts` (no callers) OR, if kept, add a Zod body schema
     and clamp `testCount` to `Math.min(Number(testCount) || 5, 10)`.
  2. Migrate `BuildStation` to `executeScenarioInBrowser` /
     `executeWorkspaceScenarioPythonClientSide` / `...JsClientSide` (its scenarios are
     workspace-shaped and already supported), then delete `app/api/execute/route.ts` and the
     executor half of `lib/piston.ts` (keep the pure utilities the header marks non-deprecated).
- **Do-not-break:** confirm no feature flag re-enables the interview Piston fallback (the
  fallback in `app/interview/_hooks/code-execution-helpers.ts:68–86` is already commented out).
- **Commit:** `chore(exec): retire server-side Piston executor`

---

## Core-app UX findings

> The dedicated core-UX audit agent was still running at hand-off. When its report
> lands, append its findings here (double-submit on checkout, split-pane
> positioning/z-index, loading/empty/error states, pricing-vs-entitlement accuracy)
> using the same ID / file:line / scenario / fix-spec / do-not-break format.

### Known UX guard rails to check regardless
- **Double-submit:** ensure the Stripe checkout and "submit for feedback" buttons are
  `disabled` while their async request is in flight (a double click must not create two
  checkout sessions or two feedback jobs). Grep for the checkout button handler in the
  pricing/billing components.
- **Pyodide cold-start comms (shipped-adjacent):** the first Python run can take several
  seconds. The `ColdStartNote` component communicates this; confirm it renders on the very
  first run (`useExerciseRun.ts` `pyodideWarmed` flag) and that the new 60s boot timeout
  message ("Couldn't start the Python runtime…") is surfaced to the learner, not swallowed.
