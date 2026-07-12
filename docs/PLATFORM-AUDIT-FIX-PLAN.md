# Platform Audit Fix Plan — 2026-07-12

**Audience:** developers and `/loop` agents implementing the fixes.
**Scope:** full-platform audit (performance, edge cases, dead code, redundancy, API hygiene)
run 2026-07-12 by six parallel read-only auditors (server perf, client perf, edge cases,
dead code, duplicated business logic, API auth/validation), with cross-agent conflicts
verified by the orchestrator before this doc was written.

This document is the single source of truth for THIS audit. Items already tracked
elsewhere are **not** duplicated here — do not re-implement them from this doc:

- `PRE-LAUNCH-FIXES.md` Part 2 (QUOTA-1, API-IDOR-1, API-LEAK-1/2, API-VALID-1/2/3,
  API-COST-1, API-ABUSE-1, RULES-1, DEPRECATE-1, NOTIF-WELCOME-1, …). This audit
  re-confirmed on 2026-07-12 that **all Part 2 items are still open** and that no
  Part 1 shipped fix has regressed.
- `immediate_fixes.md` (chat-route service extraction 2.1, feedback-service extraction 2.2,
  vector search 3.2, misconception detection 3.3).
- `docs/LEARN-PLATFORM-AUDIT.md` (all fixed except deferred U3 responsive workspace).

## How to use with `/loop`

Pick **one** unchecked item by ID (respect the wave order and the "after"/"with"
sequencing notes), implement exactly the fix spec, run the listed verification plus
`pnpm typecheck`, then commit and flip the item's checkbox to `[x]` with the commit hash,
and append one line to the Progress Log at the bottom. Do not widen scope. Reuse the
named repo helper/pattern rather than inventing a new abstraction (per `CLAUDE.md`).
Items marked **NEEDS-STAGING** must not ship blind (Stripe webhook / emulator flows).

### Repo conventions (must follow)

- **Commits:** commit as the user (no AI co-author). Commit signing hangs
  non-interactively — use
  `git -c commit.gpgsign=false -c gc.auto=0 commit --no-verify -F <msgfile>`
  after running `pnpm typecheck` manually.
- **Concurrent committer:** a parallel process sometimes commits to main. Run
  `git log --oneline -3` and `git status` immediately before staging; stage only your
  files; commit immediately after staging.
- **Commit prefixes:** `fix(edge):`, `perf(server):`, `perf(client):`, `refactor(dup):`,
  `chore(dead):`, `security(api):`.
- **Auth (Node routes):** `verifyAuth`/`withAuth` from `lib/auth-helpers.ts`.
  **Edge routes:** `verifyAuthEdge` from `lib/auth-edge.ts`. **Admin:**
  `verifyAdminAccess` from `lib/admin/middleware.ts`. **Rate limiting:**
  `lib/rate-limit.ts`.
- Ignore hook messages demanding `graphify` — graphify is disconnected.

### Green baseline (2026-07-12) — every commit must preserve this

- `pnpm typecheck` — clean.
- `pnpm test` — 116 files passed / 6 skipped; 916 tests passed / 44 todo.
- `pnpm lint` — 0 errors, 980 warnings (do not add errors; reducing warnings is welcome).
- **First-load JS baselines (raw / gzip)**, measured by summing the
  `/_next/static/chunks/*.js` script tags in `.next/server/app/<route>.html` after
  `pnpm build` (Turbopack prints no size table — sum file sizes + gzip via node `zlib`):
  - `/` 1.97 MB / 0.58 MB
  - `/interview` 3.72 MB / 1.07 MB
  - `/sessions` 2.11 MB / 0.60 MB
  - `/roadmap/new` 1.72 MB / 0.51 MB
  - `/dashboard` 1.44 MB / 0.44 MB
  - `/rounds` 1.92 MB / 0.56 MB

---

## Execution order (waves)

**Wave 0 — Revenue + data-loss correctness (do first):**
EDGE-1 → EDGE-2 → EDGE-WEBHOOK (EDGE-3+7+8 in one commit) → DUP-2 → DUP-8 → DUP-1 →
API-1 (+API-2 in the same effort) → DUP-3 → EDGE-9.

**Wave 1 — Cost + latency P1s:**
PERF-S1 → PERF-S2 → PERF-C3 (one line + cascade deletes) → PERF-C2 → PERF-C1 →
PERF-C4 → PERF-C6 (only after EDGE-1) → PERF-C5 (one curriculum at a time).

**Wave 2 — Dead code + dependency removal (fast, grouped commits):**
DEAD-1 … DEAD-12 (DEAD-2 is blocked on NOTIF-WELCOME-1; skip until that ships).

**Wave 3 — Remaining P2s:**
EDGE-4, EDGE-5, EDGE-6, EDGE-10, EDGE-11, EDGE-12; DUP-4, DUP-5, DUP-6, DUP-7, DUP-9,
DUP-10, DUP-11; PERF-S3 … PERF-S12; PERF-C7 … PERF-C12.

**Wave 4 — P3 cleanup:**
EDGE-13 … EDGE-17; DUP-12; PERF-S14, PERF-S15; PERF-C13; API-3, API-4.

**Sequencing constraints:**
- EDGE-1 **before** PERF-C6 (same files: interview timer/autosave). Re-run the EDGE-1
  verification after PERF-C6 lands.
- DUP-2 → DUP-3 → EDGE-9 in that order (all quota); coordinate with QUOTA-1's planned
  server-authoritative route — build shared helpers QUOTA-1 can consume, don't conflict.
- EDGE-13 shares the "return 200 vs 500 after dead-letter" decision with EDGE-WEBHOOK —
  decide once, apply consistently.
- DUP-6 owns the deletion of the orphaned `lib/prompts` content (don't also file it as
  dead code).
- PERF-C4 / PERF-C9 / PERF-C10 / PERF-C14 all migrate callers off the legacy eager
  `lib/scenarios.ts` to the async `lib/scenarios/index.ts` API — reuse the same pattern.

---

# Wave 0 — Revenue + data-loss correctness

### [ ] EDGE-1 — Interview autosave NEVER fires (interval destroyed every second) — P1
- **Where:** `app/interview/_hooks/useInterviewAutosave.ts:61,149,155-177` (interval effect
  with `opts.elapsedTime` in the dep array at :165); `app/interview/_hooks/useInterviewTimer.ts:31-33`;
  `app/interview/page.tsx:304-306`.
- **Problem:** `elapsedTime` ticks every 1s → the autosave effect re-runs every second →
  `clearInterval` + new `setInterval(…, 30000)`. A 30s interval torn down every 1s never
  fires. Neither localStorage autosave nor Firestore `saveSessionState` ever executes;
  crash/refresh mid-interview loses all code, chat, and elapsed time, and
  `useSessionRestore` finds nothing. (`lib/interview/session-manager.ts:231 autoSaveSession`
  is dead — zero callers — so there is no other periodic save path.)
- **Fix:** keep the latest payload in a `useRef` (updated every render or in a deps-free
  effect); key the interval effect ONLY on session identity:
  `[opts.isInterviewStarted, opts.selectedScenario?.id, opts.currentSessionId, opts.firebaseUser?.uid, opts.isGuestMode, opts.guestId]`.
  The interval callback reads `payloadRef.current`.
- **Do-not-break:** saved payload contract must stay byte-identical (file header notes a
  payload-contract scanner reads the inline literals); don't save before the interview
  starts; keep the guest `.slice(-20)` truncations.
- **Verify:** unit test with fake timers — tick `elapsedTime` every 1s for 35s, assert
  `saveSessionState` called ≥1 (currently 0). Manual: start interview, type code, wait
  35s, hard-refresh → "Session restored" toast appears.

### [ ] EDGE-2 — Transient Stripe error auto-downgrades an active Pro user to Free — P1
- **Where:** `lib/stripe-helpers.ts:248-260,264-283` (every Stripe lookup catch leaves
  `subscription = null`) → downgrade branch at `lib/stripe-helpers.ts:502-518`; triggered
  from `app/account/page.tsx:250-272` on page load and by the `/upgrade` post-checkout poll.
- **Problem:** Stripe timeout/429 during `syncSubscriptionFromStripe` → all three lookups
  swallow the error → `subscription === null` → the `else if (tier === "pro")` branch
  writes `subscription_tier: "free", subscription_status: "none"` and rewrites quota.
  Paying user locked out mid-period by a network blip. The `/upgrade` page polls sync 5×
  right after checkout, increasing exposure.
- **Fix:** set an `apiErrorOccurred` flag in each catch; only take the downgrade branch
  when all lookups **completed successfully** AND returned no subscription. On error,
  return the existing profile unchanged (pattern exists at `lib/stripe-helpers.ts:197-200`).
- **Do-not-break:** legitimate downgrades (canceled subs) must still occur; the
  yearly-expiry branch at :451-501 doesn't depend on Stripe calls — leave it.
- **Verify:** unit test mocking `stripe.subscriptions.retrieve` to throw → profile tier
  NOT rewritten; second test resolving `status: "canceled"` → downgrade still happens.

### [ ] EDGE-WEBHOOK (EDGE-3 + EDGE-7 + EDGE-8) — three webhook handlers swallow errors and ACK Stripe — P2, one commit — NEEDS-STAGING
- **Where:** `app/api/webhook/stripe/route.ts` —
  EDGE-3: `invoice.paid` quota reset, catch at :1126-1128;
  EDGE-7: `charge.refunded` downgrade, catch at :1020-1022;
  EDGE-8: `invoice.payment_failed`, catch at :855.
- **Problem:** each catch logs and returns 200 — Stripe never retries, no
  `webhook_failures` row. Consequences respectively: renewal usage never reset (paying
  user hits "limit reached" on day 1 of a paid month); fully-refunded user keeps Pro
  forever; past-due user never sees the banner or dunning email. Five sibling handlers
  (:524, :786, :1332, :1466, :1514) already use `recordWebhookFailure` (defined :210) —
  these three predate the hardening.
- **Fix:** add `await recordWebhookFailure(event, "<type>", error)` in each catch,
  mirroring `charge.dispute.created`. Decide once: keep returning 200 after dead-lettering
  (consistent with dispute/uncollectible) — recommended — or 500 for Stripe retry; if 500,
  first verify the quota reset is idempotent per period (the webhook's local
  `updateQuotaForSubscriptionTierAdmin` has a `last_reset_period_start` guard; see DUP-3).
- **Verify:** unit test each handler with a throwing Firestore mock → `webhook_failures`
  doc written. Stripe CLI replay on emulator before shipping.

### [ ] DUP-2 — tier→session-limit rule implemented 6+ times; enterprise already drifted (999 vs 8) — P1
- **Where:** `lib/quota-enforcement.ts:319-324` (handles enterprise → 999) vs
  `lib/firestore-helpers.ts:341-344` and `:397-400`, `lib/stripe-helpers.ts:55-58`,
  `app/api/webhook/stripe/route.ts:87-90`, `app/account/page.tsx:602-606` (all ternary
  `pro ? pro : free` — **enterprise falls through to the free limit 8**). Paid-tier
  predicate drift: `components/home/AuthenticatedDashboard.tsx:67` (dead file — see
  PERF-C3), `app/account/page.tsx:602` treat only `"pro"` as paid;
  `components/interview-prep/CompanyPrepContent.tsx:51`, `CompanyHeroCTA.tsx:45` treat
  `pro || enterprise`.
- **Problem:** an enterprise user's quota doc is written with `sessions_limit: 8` and the
  client gate (`checkUsageLimit`, `lib/firestore-helpers.ts:442`) blocks at 8 while the
  server gate (`enforceQuota`) allows 999 — server and client disagree about the same user.
- **Fix:** add `getSessionsLimitForTier(tier: SubscriptionTier): number` and
  `isPaidTier(tier)` to `lib/pricing.ts` (whose header already says "NEVER hardcode
  prices elsewhere"). Decide enterprise policy once (999) and use the helper at all sites.
- **Do-not-break:** the downgrade cap logic (`sessions_used > limit → cap`) at
  `firestore-helpers.ts:360` and webhook `:131-139`; QUOTA-1's future route should consume
  the same helper.
- **Verify:** `pnpm vitest run lib/__tests__/quota-enforcement.test.ts` + a new
  enterprise-tier test asserting `getUserQuota` and `initializeUserQuota` agree.

### [ ] DUP-8 — /limit-reached promises "Unlimited Sessions" and "500+ Problems"; Pro is 35/month — P1
- **Where:** `app/limit-reached/page.tsx:106,113-118` vs canonical `lib/config.ts:65-66`
  (`sessionsPerMonth: 35`, `sessionsDisplay: "350+ problems per month"`;
  `app/upgrade/page.tsx:290` is consistent with config).
- **Problem:** hardcoded upsell copy has drifted into a false promise at the exact moment
  of purchase — a user who upgrades here can hit the 35-session wall and reasonably claim
  misrepresentation.
- **Fix:** render the pitch from `PRICING_CONFIG.pro.highlights` / `valueProps`
  (config.ts is canonical); delete the literal strings.
- **Do-not-break:** the redirect-if-allowed logic at `:41-43`.
- **Verify:** visual check of /limit-reached; `grep -rn "Unlimited Sessions" app components`
  returns nothing outside config-driven copy.

### [ ] DUP-1 — instant-score weights diverge from final-score weights for ALL 3 interview types — P1
- **Where:** `lib/feedback/score-accumulator.ts:206-220,338` (hardcoded literals; consumed
  by `app/api/feedback/instant/route.ts:143`, `app/api/feedback/stream/route.ts:28`) vs
  `lib/constants.ts:119-176` (`SCORING.PERFORMANCE_WEIGHTS` / `SYSTEM_DESIGN_WEIGHTS` /
  `BUG_FIX_WEIGHTS`, used by `lib/feedback/scoring/{dsa,system-design,bugfix}-scoring.ts`).
- **Problem:** every type diverged — DSA has codeQuality/communication swapped
  (accumulator 0.3/0.2 vs canonical 0.2/0.3), sysdesign 0.2/0.2/0.1/0.5 vs 0.2/0.3/0.2/0.3,
  bugfix has understanding/problemSolving swapped. User sees an instant score, then a
  final score computed with different weights from the same subscores.
- **Fix:** import `SCORING.*_WEIGHTS` from `lib/constants.ts` in score-accumulator. If the
  instant path should intentionally differ, the weights still must live in
  `lib/constants.ts` as named `INSTANT_*_WEIGHTS` beside the canonical ones with a comment
  explaining the delta — never inline literals.
- **Do-not-break:** the `signalsUsed.push("weights:…")` labels; the `AccumulatedScores`
  shape returned to `feedback/instant`; the hard/easy ±5 adjustment.
- **Verify:** `pnpm vitest run lib/feedback/__tests__` + manually diff instant vs final
  overall for one fixed set of subscores.

### [ ] API-1 — /api/voice/token hands the raw account-level Deepgram API key to every signed-in client — P1
- **Where:** `app/api/voice/token/route.ts:21-26` (returns
  `{ apiKey: process.env.DEEPGRAM_API_KEY }`); consumed at
  `lib/voice/deepgram-service.ts:122-131`, used in a browser WebSocket at :251.
- **Problem:** any signed-in user can read the long-lived reusable key from the network
  tab and call Deepgram directly, unbounded, on the owner's account. Per-request rate
  limiting does nothing (key is reusable forever once captured); all server-side spend
  controls are bypassed because audio flows client→Deepgram.
- **Fix:** stop vending the raw key. Mint an ephemeral scoped key server-side per request
  via the Deepgram Management API (`keys.create` with short `time_to_live_in_seconds` and
  `usage:write` scope only) and return that. Keep `verifyAuth` + `apiRateLimit`. Attribute
  cost to the verified uid server-side.
- **Do-not-break:** `deepgram-service.ts` expects `{ apiKey }` in the response and opens
  the WS with it — an ephemeral key keeps that working. Voice is Pro-gated — confirm the
  entitlement check preceding the token fetch still runs.
- **Verify:** fetched key ≠ `process.env.DEEPGRAM_API_KEY`; reuse after TTL fails;
  exercise a voice interview end-to-end.

### [ ] API-2 — voice cost accounting is client-self-reported, unclamped, un-rate-limited — P2 (couple with API-1)
- **Where:** `app/api/usage/voice/route.ts:27-47`; `durationSeconds` flows into
  `trackVoiceUsage` → `usage_summaries.totalCost` via `FieldValue.increment`
  (`lib/usage-tracking.ts:170,192`) — exactly what `BUDGET_CAPS` enforcement reads
  (:225,251-258).
- **Problem:** the client decides how much voice cost to record (post
  `durationSeconds: 0.001` after every real session → never accrue cost → evade caps);
  no rate limiter. Because of API-1, this self-report is the ONLY record of voice spend.
- **Fix:** add `apiRateLimit(request)`; add a Zod schema clamping `durationSeconds`
  (`z.number().positive().max(3600)`) and bounding `transcriptLength` (reuse the
  Zod+clamp pattern from `app/api/user/notification-preferences/route.ts`). Full fix is
  server-side metering of the ephemeral key's usage (with API-1).
- **Do-not-break:** `lib/voice/use-deepgram.ts:262` is the sole caller — keep the body
  shape; keep the `model` whitelist against `DEEPGRAM_COSTS`.
- **Verify:** unit test: out-of-range `durationSeconds` rejected; rapid calls throttle.

### [ ] DUP-3 — quota-writer exists in 3 divergent shapes (webhook / stripe-helpers / promo-code) — P1 — NEEDS-STAGING
- **Where:** `app/api/webhook/stripe/route.ts:67-156` (local
  `updateQuotaForSubscriptionTierAdmin`: has `resetUsage`, idempotency guard on
  `last_reset_period_start`, writes `free_opens_remaining`) vs `lib/stripe-helpers.ts:37-95`
  (same name exported, has NONE of that) vs `app/api/promo-code/route.ts:133-160`
  (hand-rolled: **calendar-month** period while everyone else uses anniversary
  `calculateBillingPeriod`, and updates `quotaQuery.docs[0]` — the "first matching doc"
  bug pattern the shipped `security(quota)` fix removed from the read side) vs
  `app/api/cron/subscription-expiry/route.ts:110-121` (hand-rolled create).
- **Fix:** canonical = the webhook copy's behavior, moved into `lib/stripe-helpers.ts` as
  the single `updateQuotaForSubscriptionTierAdmin(userId, tier, { resetUsage, profileData })`;
  webhook, promo-code, and cron import it. Promo-code switches to anniversary periods and
  current-period doc selection. Prerequisite-shaped sibling of QUOTA-1 (whose spec says
  "reuse their doc shape" — currently there are three shapes).
- **Do-not-break:** webhook idempotency (retried `invoice.paid` must not re-zero usage);
  promo-code's Pro-for-a-year upgrade must still land
  `sessions_limit = PRICING_CONFIG.pro.sessionsPerMonth` (use DUP-2's helper).
- **Verify:** unit test: second `resetUsage` call in the same period is a no-op; Stripe
  CLI replay on emulator.

### [ ] EDGE-9 — anniversary-period day-overflow: 29th–31st signups get early quota resets — P2 (do after DUP-3)
- **Where:** `lib/firestore-helpers.ts:210-238` (`calculateAnniversaryPeriod`), consumed by
  `initializeUserQuota` (~:328-337; fresh `sessions_used: 0` doc on mismatch ~:395-412).
- **Problem:** signup Jan 31, reference Feb 10: `new Date(2025, 1, 31)` overflows to Mar 3
  → `setMonth(-1)` → Feb 3 → clamp branch → **Feb 28** — a "current" period starting in
  the future that doesn't contain Feb 10. The real quota doc no longer matches, so a fresh
  `sessions_used: 0` doc is created — the free monthly cap resets ~4 weeks early every
  short month. `periodEnd.setMonth(+1)` has the same overflow. Distinct from QUOTA-1's
  calendar-vs-anniversary mismatch — this arithmetic bug survives QUOTA-1 if the helper
  is reused.
- **Fix:** clamp the day BEFORE constructing the date: for candidate month `m`,
  `day = Math.min(signupDay, daysInMonth(y, m))`; take the current month's clamped
  candidate, and if it's after `now`, the previous month's. Derive `periodEnd` as the next
  clamped anniversary minus 1ms. Add table-driven tests (signup 29/30/31 × reference dates
  spanning Feb/leap-Feb/30-day months).
- **Do-not-break:** behavior for day 1–28 signups; the Stripe-derived Pro-monthly
  `calculateBillingPeriod` path is separate and fine. Coordinate with QUOTA-1.
- **Verify:** `pnpm vitest run lib/__tests__/quota-enforcement.test.ts` + new tests.

---

# Wave 1 — Cost + latency P1s

### [ ] PERF-S1 — every chat message pays a SECOND blocking LLM call for "semantic validation" — P1
- **Where:** `lib/interview/response-validation.ts:131-165`
  (`validateInterviewerResponseAsync` → `validateSemanticRules` full LLM call), invoked
  from `app/api/chat/route.ts:772-786` via `validateWithRetry`.
- **Problem:** happy path = 2 LLM calls per interviewer message (main + validator):
  ~+0.5–2s latency per message and roughly +30–50% chat token cost. `validateWithRetry`
  loops up to 3×, each iteration re-running the semantic call — a flagged message can cost
  5+ LLM calls.
- **Fix:** (a) gate the semantic LLM check to where it has signal (specific phases, first
  N messages, or a sample rate); (b) preferably run it AFTER the response returns
  (fire-and-forget, log-only) leaving the regex gates as the only blocking check; (c) if
  it must stay blocking, use the cheapest tier and cache by `hash(response, phase)`.
- **Do-not-break:** regex hard gates stay synchronous (deterministic safety net); keep
  `skipCache: true` on regeneration.
- **Verify:** route test asserting exactly 1 provider call for a clean interviewer
  response (mock `generateAIResponse`, count invocations); compare p50 chat latency in
  `[AI Provider] Success` logs.

### [ ] PERF-S2 — generate-feedback runs independent AI/RAG stages sequentially; double-computes helpers — P1
- **Where:** `app/api/generate-feedback/route.ts:481-484` (`checkClarifyingQuestions`),
  `:889-897` (`buildRAGFeedbackContext`) — both depend only on the raw request yet run
  serially after the initial `Promise.all` at :255-258. Also `calculateMasteryScore`
  computed twice with identical inputs (:1078-1089, :1123-1134) and
  `analyzeCodeCompleteness(code, language)` up to 4× (:557, :802, :965, :1204).
- **Fix:** move `checkClarifyingQuestions` and `buildRAGFeedbackContext` promises into the
  initial `Promise.all`; compute `analyzeCodeCompleteness` / `calculateMasteryScore` once
  and reuse. Saves ~2–5s on a flow the user actively waits on.
- **Do-not-break:** `critiqueScores` and `analyzeTranscriptForMistakes` genuinely depend
  on `aiValidation`/`extractedEvidence` — keep them after the join. Keep
  `TIMEOUT_BUDGET_MS` skip logic; re-check `skipConstitutionalAI` still measures from
  `parallelStartTime`.
- **Verify:** existing feedback route tests; assert clarifying-questions result unchanged
  for a fixture transcript; compare `parallelDurationMs`/`totalElapsedMs` logs.

### [ ] PERF-C3 — dead `AuthenticatedDashboard` import ships eager Firebase + firestore-helpers to the landing page — P1 (one line + cascade)
- **Where:** `components/home/HomePageClient.tsx:6` — imports `AuthenticatedDashboard`,
  never renders it (authenticated users are `router.push("/dashboard")`-ed). Chain:
  `AuthenticatedDashboard → lib/firestore-helpers.ts:5 → lib/firebase` (eager init) into
  the `/` bundle.
- **Fix:** delete the import line. **Cascade (orchestrator-verified 2026-07-12):** delete
  `components/home/AuthenticatedDashboard.tsx` (zero other importers) and
  `components/ProductTour.tsx` (its ONLY importer is AuthenticatedDashboard).
  **Keep** `components/InteractiveTour.tsx` (live via `app/dashboard/page.tsx:41,348`).
  Note: this also removes the DUP-2 drift site at `AuthenticatedDashboard.tsx:67`.
- **Verify:** `pnpm lint` + `pnpm build`; `/` shows marketing signed-out and redirects
  signed-in; dashboard tour still works.

### [ ] PERF-C2 — Header pulls the eager `lib/firebase` (app+auth+firestore+analytics at module scope) onto every page — P1
- **Where:** `lib/auth.ts:12` (`import { auth } from "./firebase"`) imported by
  `components/header.tsx:22` (`signOut`) — Header renders on every page. `lib/firebase.ts`
  runs `initializeApp` (:76), `getAuth`/`getFirestore` (:104-108), `getAnalytics` (:120-121)
  at module evaluation. Evidence: `/` first load includes a 354 KB Firestore chunk + 124 KB
  identitytoolkit chunk (~478 KB raw) on a marketing page, while `lib/auth-context.tsx:37`
  already uses the correct lazy pattern.
- **Fix:** convert `lib/auth.ts` to the repo's lazy pattern: inside each exported async
  function, `const { getAuthLazy } = await import("./firebase-lazy"); const auth = await getAuthLazy()`.
  All its exports are already async. Secondary (timing, not bytes): migrate direct
  `import { db } from "@/lib/firebase"` in `app/dashboard/page.tsx:15`,
  `app/sessions/page.tsx`, `app/account/page.tsx`, `app/sessions/[id]/page.tsx` to
  `getDbLazy()`.
- **Do-not-break:** `trackLogin`/`trackSignup` in lib/auth; SSR guards; the
  `firebase-auth-token` cookie flow in auth-context.
- **Verify:** rebuild; neither `identitytoolkit` nor `firestore.googleapis.com` appears in
  chunks referenced by `.next/server/app/index.html`; sign-in/sign-out work.

### [ ] PERF-C1 — three.js (513 KB) eagerly bundled into the landing hero — P1
- **Where:** `components/hero-section.tsx:8` (`import { ThreeOrb } …`);
  `components/three/ThreeOrb.tsx:4` (`import * as THREE from "three"`); same eager import
  on `/rounds` at `components/rounds/RoundsPageClient.tsx:5`.
- **Fix:** wrap `ThreeOrb` in `next/dynamic` with `ssr: false`, no loading placeholder
  (absolutely-positioned decorative background — no CLS), in both call sites (or export a
  `DynamicThreeOrb` from `components/three/`).
- **Do-not-break:** theme-recolor MutationObserver, prefers-reduced-motion single-frame
  render, renderer disposal on unmount (all inside ThreeOrb — unaffected by dynamic import).
- **Verify:** rebuild; the 513 KB `WebGLRenderer` chunk is absent from `/` first-load
  script tags; orb renders after hydration in `pnpm dev`.

### [ ] PERF-C4 — full scenario dataset (~815 KB minified) in `/interview` first load via `useSessionReopen` — P1
- **Where:** `app/interview/_hooks/useSessionReopen.ts:8` — imports `getScenarioById` from
  legacy `"@/lib/scenarios"` (statically pulls all 17 DSA pattern modules + real-world +
  add-functionality + system-design); statically imported by `app/interview/page.tsx:64`.
  The lazy alternative exists: `lib/scenarios/index.ts:227` exports an async
  `getScenarioById` with pattern-level lazy chunks.
- **Fix:** in `useSessionReopen.ts`, import from `"@/lib/scenarios/index"` and
  `await getScenarioById(scenarioId)` at the two call sites (:126, :378 — both already in
  async flows); keep `type Scenario` type-only from `"@/lib/scenarios/types"`.
- **Do-not-break:** session restore for bugfix/workspace scenarios
  (`isWorkspaceScenario` handling right after resolution); ScenarioBrowser's own data path.
- **Verify:** rebuild; no chunk containing "Two Sum" in `/interview` first-load script
  tags; manually reopen a saved session end-to-end.

### [ ] PERF-C6 — 1-second clock re-renders the entire 2,108-line interview page every tick — P1 (AFTER EDGE-1)
- **Where:** `app/interview/page.tsx:304` (`useInterviewTimer` state in
  `InterviewPageContent`); unmemoized `problemCtx` literal at page.tsx:1787-1800 defeats
  `memo` on `ProblemColumn` (MarkdownRenderer re-parses the problem every second);
  `InterviewLayoutGrid` has no `memo`; `useInterviewProactiveAI.ts` ~:363-370 has
  `elapsedTime` in its effect deps (30s silence interval recreated every second).
- **Fix:** (1) stop ticking state at page level — pass `startTime` + `isActive` to the
  already-memoized `InterviewTopBar` and let it own the 1s interval (it's the only
  component that displays the clock, TopBar.tsx:179-182); (2) consumers needing elapsed
  seconds at event time (autosave payload `useInterviewAutosave.ts:69`, feedback
  `timeSpentMinutes` page.tsx:2016, proactive-AI silence check) compute on demand from a
  `startTimeRef` via the existing pure `computeElapsedSeconds(startTime, Date.now())`;
  (3) wrap `problemCtx` in `useMemo` once `elapsedTime` is out of it.
- **Do-not-break:** autosaved `elapsedTime` + session restore seeding
  (`setStartTime`/`setElapsedTime`); `strictTimeLimit` behavior; silence-nudge thresholds.
  **Re-run the EDGE-1 verification after this lands.**
- **Verify:** `pnpm test`; React DevTools Profiler on `/interview` — page component stops
  re-rendering on a 1s cadence; full interview end-to-end incl. autosave restore.

### [ ] PERF-C5 — learn lesson routes bundle ENTIRE curricula client-side (SD chunk 1.8 MB incl. all model answers) — P1 (one curriculum per commit)
- **Where:** `app/learn/system-design/[levelSlug]/[lessonId]/page.tsx:1-7` (`"use client"`
  + registry import); same in `app/learn/python/...` and `app/learn/sql/...`;
  `components/tutorials/LessonPlayer.tsx:14-17` also imports the registry. Registries
  statically import every level (SD ≈ 2.0 MB source / 1.8 MB minified chunk with 208
  `modelAnswer`s; SQL ≈ two ~990 KB chunks; Python ≈ 0.45 MB).
- **Problem:** opening ONE lesson downloads the whole course including every model answer
  — the sibling level-list pages deliberately project a lean model server-side; the lesson
  route defeats that.
- **Fix:** convert the three `[lessonId]/page.tsx` routes to server components: resolve
  `getLessonLocation(lessonId)` server-side from `params`, compute next-lesson/
  level-boundary navigation server-side, pass only `{ lesson, level-lite, upNext }` props
  into the client players; remove registry imports from the players in favor of props.
  Do SD first (biggest win), then SQL, then Python.
- **Do-not-break:** SQL level-boundary routing ("Level N complete" card /
  `getFirstLessonOfNextSqlLevel`); don't silently change Python nav semantics (known
  routing bug tracked in LEARN-PLATFORM-AUDIT L1 follow-up); progress persistence
  (`useTutorialProgressSync`); lesson auth guard in the layouts.
- **Verify:** rebuild; the 1.8 MB SD chunk and ~990 KB SQL chunks no longer
  client-referenced; open a lesson in each curriculum and complete Read→Apply.

---

# Wave 2 — Dead code + dependency removal

All zero-importer claims below were verified by multiple grep patterns (alias, relative,
plain-string, dynamic-import, barrel, tests, configs, e2e, scripts) plus a knip run used
only as leads. See "Verified NOT dead" at the bottom before deleting ANYTHING not listed.

### [ ] DEAD-1 — `lib/auth-server.ts` duplicates `verifyAuth` across 8 routes — P2
- **Where:** `lib/auth-server.ts:18-72` (`getUserIdFromRequest`) vs
  `lib/auth-helpers.ts:22-50` (`verifyAuth`, 31 importing files). The 8 importers:
  `app/api/{create-checkout,customer-portal,debug-promo-code,promo-code,rag,seed-vectors,sync-subscription,vectorize-problems}/route.ts`.
- **Fix:** replace `getUserIdFromRequest(request)` with `verifyAuth(request)` in the 8
  routes; delete `lib/auth-server.ts`. Semantics identical (both skip revocation check).
- **Do-not-break:** checkout/portal/sync-subscription are billing-critical — preserve
  exact 401 response bodies/status codes. The rest of the auth cluster
  (`lib/auth.ts` client, `auth-context.tsx`, `auth-edge.ts`) is a legitimate split — keep.
- **Verify:** `grep -rn "auth-server" app lib components` empty; `pnpm typecheck && pnpm test`.

### [ ] DEAD-2 — `lib/notification-helpers.ts` (657 lines, 26 exports) is effectively dead — P2 — BLOCKED on NOTIF-WELCOME-1
- **Where:** sole importer `app/auth/callback/auth-callback-client.tsx:8,49` imports only
  `createInAppNotification`, whose runtime call is always PERMISSION_DENIED
  (firestore.rules sets `in_app_notifications` `create: if false`). Other 25 exports: zero
  importers. Server twin `lib/notification-helpers-server.ts` is live (4 importers) and
  independent.
- **Fix:** implement NOTIF-WELCOME-1's reroute (PRE-LAUNCH-FIXES.md) first, then delete
  `lib/notification-helpers.ts` and the import in `auth-callback-client.tsx`.
- **Do-not-break:** do NOT touch `lib/notification-helpers-server.ts`.
- **Verify:** `grep -rn "lib/notification-helpers\"" app components lib hooks` empty;
  `pnpm typecheck`.

### [ ] DEAD-3 — dead three.js chain: 2 components + 3 deps + a next.config entry — P2
- **Where:** `components/NeuralNetwork.tsx` (245 lines), `components/SubtleParticles.tsx`
  (138 lines) — zero importers; they are the ONLY users of `@react-three/fiber` and
  `@react-three/drei` (package.json:74-75); `tunnel-rat` (package.json:147) exists solely
  for drei transpilation; `next.config.mjs:39` `transpilePackages: ['tunnel-rat']`.
  **Orchestrator-verified 2026-07-12:** the live 3D components (`ThreeOrb`, `MemoryBrain`)
  import vanilla `three` only — removal of the R3F packages is safe.
- **Fix:** delete both component files; `pnpm remove @react-three/fiber @react-three/drei tunnel-rat`;
  delete the `transpilePackages` line; update the stale prose comment at
  `components/three/ThreeOrb.tsx:23-24`.
- **Do-not-break:** KEEP `three` (package.json:118) and `@types/three` (:134).
- **Verify:** `pnpm build`; load `/` (ThreeOrb) and `/why-codesparring` (MemoryBrain).

### [ ] DEAD-4 — zero-importer top-level components (8 files, ~2,100 lines) — P3
- **Where:** `components/CodeViewerDialog.tsx` (92), `components/nps-survey-modal.tsx`
  (161), `components/pricing-section.tsx` (345), `components/SessionFeedbackCard.tsx`
  (779), `components/interview/InterviewHeader.tsx` (158),
  `components/interview-prep/GatedContent.tsx` (137), `components/ui/demo.tsx` (11),
  `components/ui/bento-grid.tsx` (230), `components/ui/rotating-text.tsx` (183).
  (`ProductTour.tsx` is handled by PERF-C3's cascade, not here.)
- **Fix:** delete the files. No cascade beyond themselves.
- **Do-not-break:** dead `pricing-section.tsx` vs LIVE `components/pricing/PricingPageClient.tsx`
  — delete the dash-named one only. `InteractiveTour.tsx` and `GridBackground.tsx` are
  LIVE (dashboard page; docs + careers pages) — do not delete.
- **Verify:** `pnpm build` + `pnpm typecheck`.

### [ ] DEAD-5 — abandoned dashboard component set: 9 of 11 files in `components/dashboard/` — P3
- **Where:** `components/dashboard/{CircularProgress,CognitiveProfile,LoadingSkeleton,PatternMasteryBar,SkillInsights,SkillInsightsAlerts,SkillInsightsCards,SmartRecommendations,usage-widget}.tsx`
  (~1,164 lines) — zero importers each (the `SkillInsights` grep hits are
  `lib/hooks/useSkillInsights`, a different module; `SmartRecommendations` hits are the
  live `components/practice/SmartRecommendations.tsx`).
- **Fix:** delete the 9 files. KEEP `MetricsOverview.tsx` and `ReferralWidget.tsx` (live).
- **Verify:** `pnpm build`; load `/dashboard`.

### [ ] DEAD-6 — dead `lib/` service modules (9 files, ~1,920 lines) — P3
- **Where:** `lib/promo-codes.ts` (297; superseded — live rule is inline in
  `app/api/promo-code/route.ts`, which does NOT import it), `lib/subscription-sync.ts`
  (144), `lib/scenario-loader.ts` (258), `lib/scenarios-add-functionality.ts` (legacy
  re-export), `lib/api-helpers.ts` (200), `lib/retry.ts` (258), `lib/request-cache.ts`
  (192), `lib/gemini-cache.ts` (158; also flagged as PERF-S13 — deleting resolves both;
  if Gemini prompt caching is ever wanted, re-introduce deliberately on stable prompts
  only), `lib/design-tokens.ts` (413). Zero references each, two independent grep passes.
- **Fix:** delete all nine files.
- **Verify:** `pnpm typecheck && pnpm test && pnpm build`.

### [ ] DEAD-7 — dead hooks (3 files, 722 lines) — P3
- **Where:** `hooks/useMultiTabConflict.ts` (256), `lib/hooks/use-chat-tracking.ts` (101),
  `lib/hooks/use-two-phase-feedback.ts` (365). Zero references to paths or exported hook
  names; `lib/hooks/index.ts` barrel does not re-export them.
- **Fix:** delete the 3 files. **Verify:** `pnpm typecheck`.

### [ ] DEAD-8 — retired legacy scenarios explicitly marked removed (16 files) — P3
- **Where:** `lib/scenarios/real-world/bugfix/{bugfix-closure-loop,bugfix-deepcopy,bugfix-feature-engineering-nan,bugfix-floating-point,bugfix-infinite-loop,bugfix-null-check,bugfix-off-by-one-array,bugfix-python-two-sum,bugfix-rate-limiter,bugfix-type-coercion}.ts`
  and `lib/scenarios/add-functionality/{add-feature-autocomplete-trie,add-feature-cache-system,add-feature-event-aggregator,add-feature-rate-limiter,add-feature-state-history,add-feature-text-search}.ts`.
  Not imported by their registries; the only textual references are the
  `REMOVED_LEGACY_*_IDS` deletion lists in `lib/rag/vectorization/jobs/vectorize-{bugfix,add-functionality}.ts`.
- **Fix:** delete the 16 files. KEEP the two `REMOVED_LEGACY_*` string arrays (they purge
  stale vectors). Do not touch scenarios that ARE imported by the two `index.ts` registries.
- **Verify:** `pnpm typecheck && pnpm test` (registry tests) + `pnpm build`.

### [ ] DEAD-9 — dead roadmap/RAG/interview support modules (12 files, ~2,300 lines) — P3
- **Where:** `lib/roadmap/diagnostic-quiz.ts` (488), `lib/roadmap/notification-strategy.ts`
  (638), `lib/roadmap/index.ts` (barrel only), `lib/interview/company-interviewer-styles.ts`
  (376), `lib/rag/retrieval/reranker.ts` (69), `lib/rag/embeddings/chunker.ts` (189),
  `lib/rag/vectordb/migrations.ts` (38), `lib/rag/knowledge-base/index.ts`,
  `lib/rag/knowledge-base/leetcode-mapping.ts`, `lib/types/usage-events.ts` (211),
  `lib/agents/index.ts` (barrel), `lib/research/index.ts` (barrel).
- **Fix:** delete the 12 files. For the barrels, only the barrel is dead — the sibling
  modules they re-export are imported directly and must stay.
- **Do-not-break:** `lib/rag/utils/index.ts` is LIVE despite knip flagging it (imported by
  `app/api/agents/hints/route.ts`, `app/api/rag/v2/route.ts`). Roadmap features are live
  via direct module imports. If EDGE-10 chose `lib/roadmap/` as its helper home, create
  the new file rather than resurrecting the barrel.
- **Verify:** `pnpm typecheck && pnpm test && pnpm build`.

### [ ] DEAD-10 — ~29 unused production dependencies — P3
- **Where:** package.json. Verified zero import/require/config references for: 16 unused
  Radix packages (`@radix-ui/react-accordion`, `-aspect-ratio`, `-avatar`, `-context-menu`,
  `-hover-card`, `-menubar`, `-navigation-menu`, `-popover`, `-radio-group`,
  `-scroll-area`, `-separator`, `-toast`, `-toggle`, `-toggle-group`, + knip-flagged
  remainder), `lottie-react`, `react-katex` (+ devDep `@types/react-katex`),
  `@stripe/stripe-js` (no `loadStripe` anywhere — checkout is a server redirect to a
  Stripe-hosted URL), `embla-carousel-react`, `cmdk`, `input-otp`, `react-day-picker`,
  `@next/mdx`, `tailwindcss-animate` (globals.css uses the different `tw-animate-css`),
  `autoprefixer` (postcss uses `@tailwindcss/postcss`, which bundles prefixing),
  `react-hook-form`, `@hookform/resolvers`, `vaul`.
- **Fix:** `pnpm remove` the list (fold in DEAD-3's three packages in the same commit).
- **Do-not-break (knip false positives, verified LIVE):** `sql.js`, `geist`, `dotenv`,
  `lint-staged`, `eslint-config-next`, `eslint-plugin-jsx-a11y` (implicit via
  `compat.extends` in eslint.config.mjs:16), `three`, `@types/three`.
- **Verify:** `pnpm install && pnpm lint && pnpm build`; run one SQL lesson and one Python
  lesson locally.

### [ ] DEAD-11 — git-tracked junk at repo root (41 MB graphify cache + scratch files) — P3
- **Where:** tracked in git per `git ls-files`: `scratch.ts`, `patch_runners.py`,
  `eslint-results.json`, and `graphify-out/` (254 tracked files, 41 MB, churning the
  working tree every session).
- **Fix:** `git rm -r --cached graphify-out && git rm --cached scratch.ts patch_runners.py eslint-results.json`;
  add `/graphify-out/`, `scratch.ts`, `patch_runners.py`, `eslint-results.json` to
  `.gitignore`. Do NOT edit the settings.json graphify hook (needs user approval per
  project memory) — only untrack files. Commit this hygiene change atomically (concurrent
  committer).
- **Verify:** `git status` clean of graphify churn; `pnpm build` unaffected.

### [ ] DEAD-12 — `.gitignore` missing `/coverage/` (153 MB on disk, one `git add .` from being committed) — P3
- **Fix:** add `/coverage/` to `.gitignore`.
- **Verify:** `git check-ignore coverage/base.css` exits 0.

---

# Wave 3 — Remaining P2s

## Edge cases

### [ ] EDGE-4 — double-click "Start practice" creates two sessions and burns quota twice — P2
- **Where:** `components/interview/ScenarioCard.tsx:128-138` (`disabled={isLocked}` only;
  same in `ScenarioListRow.tsx:123`); `app/interview/_hooks/useInterviewSessionStart.ts:97,164-217`
  (no re-entrancy guard; `setShowScenarioBrowser(false)` only at :275 after the awaits).
- **Fix:** in-flight guard (`startingRef`/`isStarting`) checked at the top of
  `startInterview` (early return, cleared in `finally`); pass `isStarting` down so the
  card button renders `loading` (shared `Button` disables on `loading`,
  components/ui/button.tsx:58).
- **Do-not-break:** the company-picker early-returns at :132/:145 must not leave the guard
  stuck.
- **Verify:** unit test calling `startInterview()` twice synchronously →
  `createInterviewSession` called once. Manual double-click on a free account →
  one session doc, `sessions_used` +1.

### [ ] EDGE-5 — "See Full Interview Score" double-invoke double-writes completion + double-counts roadmap time — P2
- **Where:** `app/interview/_components/PostInterviewView.tsx:237-245` (button lacks
  `loading`/`disabled` despite `isGeneratingFeedback` existing);
  `app/interview/_hooks/useInterviewFeedback.ts:115` (no guard); also reachable from two
  stacked toasts in `useInterviewChat.ts:293-308` and `:343-357`.
- **Problem:** `proceedToFinalFeedback` runs fully twice → `markSessionEvaluating` ×2,
  `updateInterviewSession` ×2, `trackSessionCompletion` ×2, store-solution/vectorize ×2
  (duplicate vectors skew RAG), and for roadmap sessions `addActualTime(minutesSpent)` ×2
  — "hours studied" permanently double-counted.
- **Fix:** re-entrancy guard in `proceedToFinalFeedback` (ref set at entry, cleared in
  `finally`) + `loading={isGeneratingFeedback}` on the button; give the toasts a fixed
  toast `id` and dismiss them once feedback starts.
- **Do-not-break:** retry after a genuine failure must still work — clear the guard in
  `finally`.
- **Verify:** unit test invoking it twice concurrently → `markSessionEvaluating` once,
  `addActualTime` once.

### [ ] EDGE-6 — past_due "Update payment" button silently does nothing on failure — P2
- **Where:** `components/ui/subscription-status-banner.tsx:91-113,129-139` — no
  `response.ok` check; `if (data.url)` with no else; `catch { /* Silently fail */ }`;
  the `if (!idToken) return` is also silent.
- **Fix:** `loading` state on the button; on `!response.ok || !data.url` and in catch,
  `toast.error("Couldn't open the billing portal", { description: "Try again from your Account page." })`;
  same toast for the missing-token early return.
- **Verify:** mock `/api/customer-portal` → 400 → click → error toast; component test
  asserting toast on non-ok response.

### [ ] EDGE-10 — roadmap progress renders NaN% (0/0) on four surfaces; NaNh on legacy docs — P2
- **Where:** `app/roadmap/page.tsx:648` (rendered :807);
  `components/roadmap/RoadmapStatusBanner.tsx:98,383` (rendered :131,:241,:480);
  `app/roadmap/_components/RoadmapPageParts.tsx:225` (rendered :309, width style :362);
  `components/roadmap/RoadmapHeader.tsx:13` (rendered :91) and `:57`
  (`Math.round(roadmap.actualHoursSpent)` without `|| 0`);
  `components/roadmap/PatternCoverage.tsx:48-52` (rendered :86).
- **Problem:** `totalQuestions === 0` (imminent interview date → nothing scheduled, or
  legacy doc) → `Math.round((0/0)*100)` = NaN on card, banner, header ring, progress tab;
  `PatternCoverage` divides by `patternCoverage.length` unguarded; legacy docs missing
  `actualHoursSpent` (optional by design, types.ts:284-285) render "NaNh studied".
- **Fix:** one shared `roadmapProgressPercent(completed, total)` (returns 0 when
  `total <= 0`) in `lib/roadmap/` used by all five sites; `|| 0` on `actualHoursSpent`;
  guard `totalPatterns > 0 ? … : 0` in PatternCoverage.
- **Do-not-break:** `isCompleted` stays false for 0-question roadmaps.
- **Verify:** component test rendering with
  `{ totalQuestions: 0, patternCoverage: [], actualHoursSpent: undefined }` → no "NaN".

### [ ] EDGE-11 — "Due Today" bucketed in UTC, not user timezone; `streak_at_risk` uses server hour — P2
- **Where:** `lib/spaced-repetition/scheduler.ts:169-170`
  (`todayEnd.setUTCHours(23,59,59,999)`), `:213-219` (server-local `setHours(0,0,0,0)`),
  `:311` (bucketing), `:347-351` (`now.getHours() >= 12` = server UTC hour); consumed by
  `app/api/spaced-repetition/due/route.ts:45`.
- **Problem:** an LA user at 7pm local sees tomorrow's items under "Due Today" (inflating
  queue + overwhelmed/defer counts); `streak_at_risk` fires at 5am local for LA, never
  before 9pm for Tokyo. The repo already resolves local hour correctly in
  `lib/services/session-notifications.ts:197-215` — copy that pattern.
- **Fix:** thread the user's stored timezone into `getDueProblems`; compute end-of-day and
  calendar-day diffs with the `Intl.DateTimeFormat`/`getTodayInTimezone` helpers in
  `lib/learning-state.ts`; use local hour for `streak_at_risk`.
- **Do-not-break:** the Firestore `next_review_at <=` upper bound (immediate_fixes 3.1)
  must stay ≥ local end-of-day; overdue bucketing unchanged.
- **Verify:** unit test with fixed `now` + `America/Los_Angeles`, item due
  tomorrow-local-but-today-UTC → asserted into `due_this_week`, not `due_today`.

### [ ] EDGE-12 — /limit-reached shows a false "0 / 8 used" wall when the usage check fails — P2
- **Where:** `app/limit-reached/page.tsx:44-49` (catch logs only; `usageLimit` stays null),
  `:78,:91` (`usageLimit?.limit || 8`, `usageLimit?.used || 0`).
- **Fix:** on catch, set an error state and render a retry UI ("Couldn't check your usage
  — Retry") instead of the wall; never render the wall from null `usageLimit`. (See also
  DUP-12 for the `|| 8` fallback.)
- **Do-not-break:** genuinely-over-limit users still see the wall; keep the
  `usage.allowed` redirect.
- **Verify:** mock `checkUsageLimit` rejection → retry state, not "0 / 8".

## Duplicated business logic

### [ ] DUP-4 — streak increment/reset implemented twice with different reset semantics — P2 (P1-adjacent: both live, same doc)
- **Where:** `lib/learning-state.ts:171-193` (`updateLearningStateAfterSession`; final
  `else` resets to 1 for ANY non-0/1 diff incl. negative) vs
  `lib/session-metrics.ts:1019-1038` (`updateUserLearningState`; negative/0 leaves value
  untouched; uses `getDaysDifference` with timezone). Both write `user_learning_state/{userId}`.
- **Fix:** extract `advanceStreak(stored, lastSessionAt, timezone, now): number` into
  `lib/spaced-repetition/streak.ts` (next to read-side `reconcileStreak`, which already
  brands itself the single source of truth); both writers call it; standardize on
  `getDaysDifference`.
- **Do-not-break:** same-day sessions must not increment; both callers can fire for one
  session — helper must be idempotent for `daysDiff === 0`.
- **Verify:** unit tests for gaps of -1/0/1/2 days across a timezone boundary;
  `pnpm vitest run lib/spaced-repetition`.

### [ ] DUP-5 — read-side "stale streak → 0" hand-rolled in 2 places despite a dedicated helper — P2
- **Where:** canonical `lib/spaced-repetition/streak.ts:14-23` (`reconcileStreak`) vs
  hand-rolled `lib/spaced-repetition/mastery-calculator.ts:291-309` and
  `app/api/admin/user-profile/route.ts:470-480`.
- **Fix:** replace both blocks with `reconcileStreak(...)` imports.
- **Verify:** `pnpm typecheck` + existing spaced-repetition tests.

### [ ] DUP-6 — `lib/prompts/**` is a dead "single source of truth"; forbidden-phrases rule exists in 3 drifted places — P1 severity, Wave 3 (touches live prompt text — go carefully)
- **Where:** orphaned: `lib/prompts/principles.ts:17-98` (INTERVIEWER_PERSONALITY),
  `lib/prompts/templates.ts:28-183` (rubric), `:192-274` (constitutional), `:283-328`,
  `principles.ts:352-373` (hints). The only runtime import of `@/lib/prompts` is
  `lib/feedback/constitutional-ai.ts:24`, which imports two constants it never uses.
  Live drifted copies: `lib/interview/interviewer-prompts.ts:174-186` (forbidden phrases),
  `lib/interview/guardrails/response-guardrails.ts:163-186` (regex adds `\bYou nailed it\b`,
  `\bSpot on\b`), `lib/feedback/system-instructions.ts:11-196`,
  `lib/agents/hints/prompts.ts:1-70`, `lib/feedback/constitutional-ai.ts:169-339,506-607`.
- **Problem:** editors patching the self-declared canonical change nothing; the
  prompt-list and the regeneration regex can disagree (three drifted forbidden-phrase
  lists).
- **Fix:** the live modules become canonical; delete the orphaned `lib/prompts`
  template/persona content (or reduce to re-exports) and the dead import at
  `constitutional-ai.ts:24`. For the 3-way rule, export a single
  `FORBIDDEN_VALIDATION_PHRASES: string[]` (home: `lib/interview/forbidden-phrases.ts` or
  interviewer-prompts.ts), interpolated into the prompt AND used to derive/anchor the
  guardrail patterns.
- **Do-not-break:** exact live prompt text (behavioral change = model-output change);
  guardrail severity levels; do NOT combine with prompt rewrites.
- **Verify:** `pnpm typecheck`; snapshot-test `buildInterviewerPrompt` output unchanged;
  grep proves zero remaining `@/lib/prompts` imports.

### [ ] DUP-7 — spoken-complexity normalization rule in 3 live prompts (+1 orphan), all worded differently — P2
- **Where:** `lib/interview/conversation-extraction/prompt.ts:1-33`;
  `lib/feedback/structured-extraction.ts:430-524`;
  `lib/feedback/conversation-validation.ts:90-92`; orphan `lib/prompts/templates.ts:283-328`
  (dies with DUP-6).
- **Fix:** one exported `SPOKEN_COMPLEXITY_RULES` prompt fragment in
  `lib/interview/patterns/complexity-patterns.ts` (the deterministic mapping already lives
  there at :52-75 — derive the prompt text from it), interpolated into all three prompts.
- **Do-not-break:** each prompt's surrounding JSON-output contract.
- **Verify:** `pnpm vitest run lib/interview lib/feedback`.

### [ ] DUP-9 — three writers, three doc shapes for `user_learning_state` — P2
- **Where:** `lib/learning-state.ts:153-159` (`user_id`, `created_at` ISO string) vs
  `lib/session-metrics.ts:993-1011` (`userId`, `createdAt` serverTimestamp, extra fields)
  vs `lib/spaced-repetition/mastery-calculator.ts:376-386` (merge with `user_id`,
  `updated_at` ISO). A doc touched by all three carries both spellings of both fields.
- **Fix:** one `UserLearningState` contract (snake_case, the two-of-three majority) + a
  single write service in `lib/learning-state.ts` that the other two modules call;
  session-metrics' extra fields (`total_sessions`, `last_session_date`) join the contract.
- **Do-not-break:** existing docs contain mixed spellings — add a tolerant read (or a
  migration) BEFORE the strict shape lands.
- **Verify:** `pnpm typecheck`; emulator round-trip via all three paths yields one
  consistent doc.

### [ ] DUP-10 — ScoreDisplay re-implements `calculateTechnicalScoreFromBreakdown` inline, citing the wrong source — P2
- **Where:** `components/practice/ScoreDisplay.tsx:199-206` (inline 0.6/0.25/0.15 + a
  comment citing `lib/scoring/types.ts`, which actually documents different inputs) vs
  `lib/constants.ts:424-450` (identical weights + input clamping the copy lacks).
- **Fix:** import `calculateTechnicalScoreFromBreakdown` from `@/lib/constants` for the
  `technicalScoreProp ??` fallback; delete the inline math and stale comment.
- **Verify:** `pnpm typecheck`; existing ScoreDisplay render tests.

### [ ] DUP-11 — system-design mastery score computed client-side with a third, unsourced formula, fed into spaced repetition — P2
- **Where:** `app/interview/_hooks/useSystemDesignFeedback.ts:325-332`
  (0.3/0.4/0.3 over understanding/problemSolving/codeQuality → `updateSpacedRepetition` →
  `/api/spaced-repetition/complete`, which takes `mastery_score` as-is per API-VALID-1)
  vs canonical `lib/spaced-repetition/mastery-score.ts` (60/25/15).
- **Fix:** add `calculateDesignMasteryScore(breakdown)` to
  `lib/spaced-repetition/mastery-score.ts` (or a design branch in
  `calculateMasteryScore`); call from the hook; API-VALID-1's server-side clamping should
  reference the same helper.
- **Do-not-break:** the `testsPassed: 1 / testsTotal: 1` sys-design convention;
  fire-and-forget error handling in the hook.
- **Verify:** `pnpm vitest run lib/spaced-repetition` + `pnpm typecheck`.

## Server performance

### [ ] PERF-S3 — session completion reads the user's ENTIRE problem_mastery collection to find one doc — P2
- **Where:** `lib/learning-state.ts:368-370` (`getAllUserProblems(userId)` then `.find()`);
  `lib/spaced-repetition/scheduler.ts:596-602` (unbounded read). Doc ID IS the scenario ID
  everywhere else in scheduler.ts.
- **Fix:** replace with a single
  `…collection("problem_mastery").doc(userId).collection("problems").doc(sessionData.scenarioId).get()`.
  Note `initializeProblemMasteryFromSession` (scheduler.ts:641) re-does its own existence
  check — the outer check may be removable entirely.
- **Do-not-break:** massed-practice/early-practice branches (learning-state.ts:400-478)
  read fields off the fetched doc — supply the same shape; preserve "not found →
  initialize".
- **Verify:** existing tests + one asserting exactly 1 read of the problems subcollection.

### [ ] PERF-S4 — chat/feedback path reads the profile doc twice and rate-limit state up to 3× — P2
- **Where:** `lib/quota-enforcement.ts:438` + `:263-277` (checkQuota reads `profiles` then
  `getUserQuota` reads it again); `app/api/chat/route.ts:157-163` route-level
  `checkRateLimit` + `lib/ai-providers.ts:456-461` re-checks inside `generateAIResponse`.
- **Fix:** pass the already-fetched profile into `getUserQuota` (or fold the tier check
  into its `Promise.all`); pass `skipRateLimit: true` from routes that already did their
  own `checkRateLimit` + `startRequestTracking`.
- **Do-not-break:** the degraded-subscription block (quota-enforcement.ts:443-489) needs
  fresh `subscription_status`; `skipRateLimit` must NOT be set on call sites without their
  own route-level check (e.g. hint generation).
- **Verify:** unit test counting profile reads in checkQuota (expect 1); chat route test
  asserting `checkRateLimit` called once.

### [ ] PERF-S5 — batch-defer: 2 sequential round trips per deferred problem — P2
- **Where:** `lib/spaced-repetition/scheduler.ts:793-822` (loop), `:852-908`
  (`deferSingleProblem` get+update), `:781` (repeat `getUserAlgorithm`).
- **Problem:** deferring 40 items = 80 sequential round trips ≈ 4-8s while the user waits.
- **Fix:** bounded concurrency (`Promise.all` over chunks of ~10) or `adminDb.bulkWriter()`;
  skip the per-item `.get()` for the SM-2 path (pure timestamp update); for FSRS thread
  the mastery data already present in the due-queue read; reuse `dueQueue.user_algorithm`.
- **Do-not-break:** `deferred_count` must only count docs that existed; keep the UTC-day
  defer-date math and the FSRS embedded-card sync EXACTLY as-is (comments document prior
  bugs).
- **Verify:** test deferring 30 items asserting per-item results; wall-time before/after
  on emulator.

### [ ] PERF-S6 — /api/spaced-repetition/stats: 3 profile reads, 2 learning_state reads, all sequential, unbounded problems scan — P2
- **Where:** `app/api/spaced-repetition/stats/route.ts:25-34`;
  `lib/spaced-repetition/mastery-calculator.ts:260-282,396-420`.
- **Fix:** `Promise.all([getUserMasteryStats, getDailyGoalProgress])`; refactor both
  helpers to accept pre-fetched `learningState`/`timezone` (fetch each doc once in the
  route). Longer-term: serve from the `user_stats` aggregate doc (already updated
  transactionally in session-metrics.ts:859) instead of scanning all problems.
- **Do-not-break:** timezone-aware streak "today" semantics (`getTodayInTimezone` from the
  same profile fields).
- **Verify:** unit test counting reads (expect 1 profile, 1 learning_state, 1 problems
  query).

### [ ] PERF-S7 — /api/roadmap GET runs the identical query twice + full-scan fallback — P2
- **Where:** `app/api/roadmap/route.ts:93-97` (query #1), `:130-137` (identical query #2),
  `:143-146` (empty → full scan of ALL user roadmaps). Roadmap docs are routinely 100KB+.
- **Fix:** reuse `activeSnapshot` for the default path (filtering docs just archived by
  the expiry batch); only run the filtered query when `statusFilter` is set; gate the
  legacy status-backfill scan behind a one-time migration flag.
- **Do-not-break:** expiry-archival batch (:101-115) runs before choosing the returned
  roadmap; legacy-fix path (:166-197) stays reachable until old docs are migrated.
- **Verify:** route test — default GET performs exactly 1 roadmap query when an active
  roadmap exists.

### [ ] PERF-S8 — buildEnhancedProfile: dead expensive fetch + sequential reads; admin route triggers 3 concurrent duplicate builds — P2
- **Where:** `lib/rag/enhanced-user-profile.ts:942-965` (`baseProfile` fetched — up to 100
  session reads + a write — then never used; sessions+misconceptions reads sequential);
  `app/api/admin/user-profile/route.ts:121-128` (`Promise.all` of three functions that
  each call `getEnhancedProfile` → 3 full builds; cache only set after a build completes).
  Also on the RAG v2 path (`app/api/rag/v2/route.ts:589,694`).
- **Fix:** delete the `baseProfile` line (or use it and drop the duplicate
  `session_summaries` fetch); `Promise.all` the sessions+misconceptions reads; in the
  admin route call `getEnhancedUserProfile(userId)` once and derive
  `insights`/`interviewReadiness` from the returned object (plain fields on it).
- **Do-not-break:** `getQuickInsights`/`getInterviewReadiness` public signatures; the
  1-hour Firestore freshness check.
- **Verify:** unit test that a build performs no `user_performance_profiles` read; admin
  route test asserting one build per request.

### [ ] PERF-S9 — getSmartRecommendations: full problems scan + ~6 sequential stages + per-failure loop — P2
- **Where:** `lib/spaced-repetition/rag-integration.ts:284-324`.
- **Fix:** select only IDs (Admin `select()` projection or a completed-IDs array on the
  learning-state doc); `Promise.all` the independent lookups (`getNextInRoadmap`,
  `getRecentlyFailedProblems`, `getWeakPatterns`, `getActiveRoadmap`); parallelize the two
  `getSimilarProblems` calls.
- **Do-not-break:** de-dup of already-recommended scenario IDs — apply exclusion after the
  join instead of incrementally.
- **Verify:** existing spaced-repetition tests; route latency logs.

### [ ] PERF-S10 — Stripe webhook: unbounded quota query, 12 unlimited profile lookups, serialized side effects incl. synchronous email — P2 — NEEDS-STAGING
- **Where:** `app/api/webhook/stripe/route.ts:93-96` (quota query no limit; docs accrue
  monthly forever), `:812-816` and 11 more sites (profile lookups without `.limit(1)`),
  `:442-521` (checkout handler: quota → payment history → referral → analytics → email
  all sequential; verification read at :517-521 is log-only).
- **Fix:** `.limit(1)` on all `stripe_customer_id`/`stripe_subscription_id` lookups; bound
  the quota query (`orderBy("period_start","desc").limit(12)` like
  quota-enforcement.ts:268-273); after the profile transaction commits, run
  quota/payment-history/referral/analytics/email via `Promise.allSettled`; drop the
  verification read.
- **Do-not-break:** profile transaction MUST complete before quota update; with
  `allSettled`, inspect results and dead-letter (`recordWebhookFailure`) if the quota
  update failed; keep the payment_history idempotent doc-ID scheme.
- **Verify:** Stripe CLI replay of `checkout.session.completed` + `invoice.paid` on
  emulator; handler <2s; single quota doc mutation.

### [ ] PERF-S11 — session start initializes quota twice + redundant id-query — P2
- **Where:** `lib/hooks/useInterviewSession.ts:152-162` (`checkSessionCost` then
  `recordSessionStart`, each doing `getUserProfile` + `initializeUserQuota`);
  `lib/firestore-helpers.ts:1095-1116` (re-finds the quota doc via
  `where("id","==",quota.id)` when `quota.id` IS the doc id).
- **Fix:** `recordSessionStart` accepts the quota returned by the preceding
  `checkSessionCost`; replace the id-query with `doc(db, "profile_quota", quota.id)`.
- **Do-not-break:** the `runTransaction` re-read inside the transaction stays the
  authoritative check. Align with QUOTA-1 (server-authoritative start) rather than
  conflict.
- **Verify:** existing usage-model tests; time from "Start session" click to session
  creation.

### [ ] PERF-S12 — per-request and per-user cost-anomaly checks are dead code (never wired) — P2
- **Where:** `lib/cost-anomaly-detection.ts:88-117,183-223`
  (`checkRequestCostAnomaly`/`checkUserCostAnomaly` — zero call sites outside the file);
  only `checkHourlyCostAnomaly` runs, and only when an admin opens the dashboard
  (`app/api/admin/cost-anomalies/route.ts:138`).
- **Problem:** the documented "single request > $1" and "user > $5/hour" alerts can never
  fire; a runaway loop below the global daily ceiling is invisible.
- **Fix:** call `checkRequestCostAnomaly({cost, userId, …})` fire-and-forget inside
  `generateAIResponse` right after `calculateCost` (cache `getAnomalyConfig` like
  `cachedAverageHourlyCost`); add `checkHourlyCostAnomaly` to the existing cron route
  (immediate_fixes 1.2).
- **Do-not-break:** must be fire-and-forget (no latency/failure added to requests);
  `recordAnomaly`'s 5-minute dedup bounds write volume.
- **Verify:** unit test: mocked $2 cost triggers one `cost_anomalies` write; chat latency
  unchanged.

## Client performance

### [ ] PERF-C7 — katex + react-markdown (366 KB chunk) eager in `/interview` first load — P2
- **Where:** `components/ui/MarkdownRenderer.tsx:3-7` (ReactMarkdown, remark-gfm,
  remark-math, rehype-katex, katex CSS), reachable via `ProblemColumn.tsx:17` and
  `EditorColumn.tsx:18`.
- **Fix:** keep `ReactMarkdown` + `remark-gfm` eager; lazy-load `remark-math`/
  `rehype-katex` (+CSS) only when the source contains `$` / `\\(` (feature-detect,
  `useEffect` + dynamic import, re-render with math plugins once loaded).
- **Do-not-break:** GFM table rendering (the previously-fixed `|---|` preprocessor bug);
  `preprocessAsciiArt`/`remarkNoIndentedCode` from `lib/markdown`; the `csdiagram` fence
  pipeline.
- **Verify:** rebuild; katex out of `/interview` first-load chunks; render a math lesson
  AND a table lesson.

### [ ] PERF-C8 — CodeMirror (312 KB) in `/interview` first load while the initial view is the scenario browser — P2
- **Where:** `app/interview/_components/EditorColumn.tsx:19`; the split is inverted — the
  page dynamic-imports `ScenarioBrowser` (page.tsx:76-87, the INITIAL view) while the
  editor (needed only after selection) is eager.
- **Fix:** `next/dynamic` the `CodeMirrorEditor` (or whole `EditorColumn`) with `ssr:false`
  and the existing Card frame as skeleton; the chunk fetches in parallel while the user
  browses scenarios.
- **Do-not-break:** `CodeMirrorEditorRef` imperative handle — `next/dynamic` needs
  forwardRef pass-through; `ReadOnlyCodeBlock` (learn audit fix) is separate — untouched.
- **Verify:** rebuild (~300 KB raw drop); select a scenario and type immediately — no lost
  keystrokes (loading state until ready).

### [ ] PERF-C9 — /sessions ships the full scenario dataset for a boolean existence check — P2
- **Where:** `app/sessions/page.tsx:23` + `:161` (`!!getScenarioById(session.scenario_id)`
  from legacy `"@/lib/scenarios"`) → 674 KB scenario chunk in first load.
- **Fix:** use the metadata registry — `getScenarioMeta(id)` from `"@/lib/scenarios/index"`
  (backed by the 128 KB `lib/scenarios/metadata.ts`).
- **Do-not-break:** the "Practice again" affordance — still enables for valid ids of all
  four scenario types.
- **Verify:** rebuild; `/sessions` no longer references a "Two Sum"-bearing chunk.

### [ ] PERF-C10 — roadmap wizard imports the full `scenarios` array client-side — P2
- **Where:** `app/roadmap/new/page.tsx:20` (`import { scenarios } from "@/lib/scenarios"`,
  client page); `lib/roadmap/{prioritization-algorithm.ts:19,category-mix.ts:16}` keep the
  tree reachable.
- **Fix:** either (a) generate the roadmap server-side (the API route already imports
  `scenarios` on the server — move client-side generation there), or (b) switch the wizard
  to `getAllScenarioMeta()` / async `getScenariosByPattern` from `"@/lib/scenarios/index"`.
- **Do-not-break:** the DSA+bugfix+decomposition focus blend and the wizard's pattern
  counts.
- **Verify:** rebuild + create a roadmap end-to-end; compare `/roadmap/new` first-load.

### [ ] PERF-C11 — landing page runs a 20 fps setState animation loop with no visibility gating — P2
- **Where:** `components/ui/radial-orbital-timeline.tsx:82-99` (`setInterval(…, 50)`
  updating React state; `autoRotate` defaults true :27); rendered on `/` by
  `components/features-section.tsx:222`.
- **Fix:** drive rotation with CSS `@keyframes` (or rAF writing `style.transform` on a
  ref); keep state only for click-to-focus (`centerViewOnNode`); gate behind
  IntersectionObserver / framer `useInView`, pause when hidden; honor
  `prefers-reduced-motion`.
- **Do-not-break:** node click → expand card → `centerViewOnNode` positioning math
  (depends on `rotationAngle`); pulse effects.
- **Verify:** Performance profile of `/` idle — ~0 render activity when the section is
  off-screen; node click still centers.

### [ ] PERF-C12 — full `framer-motion` import across landing sections; BugfixOnboardingTour eager on /interview — P2
- **Where:** `components/hero-section.tsx:5`, `problem-teaser.tsx:3`,
  `features-section.tsx`, `comparison-section.tsx`, `metrics-marketing-section.tsx`,
  `ai-assisted-section.tsx`, `company-roadmap-section.tsx`,
  `components/providers/LenisProvider.tsx:3`, `components/ui/magnetic-button.tsx:4`
  (108 KB framer chunk on `/`); `/interview` gets a second 271 KB framer-bearing chunk via
  `InterviewLayoutGrid → BugfixOnboardingTour`.
- **Fix:** marketing pages: wrap in `<LazyMotion features={domAnimation} strict>` (e.g.
  inside LenisProvider) and switch landing sections `motion.*` → `m.*` (~15-20 KB gz win).
  `/interview`: `next/dynamic` the `BugfixOnboardingTour` (renders only for bugfix
  scenarios after start; page already computes `bugfixTourEnabled`).
- **Do-not-break:** `useReducedMotion` gating in hero/Lenis; `whileInView` thresholds; the
  tour's step anchoring.
- **Verify:** rebuild + visual pass of `/` animations in both themes; start a bugfix
  interview and replay the tour.

---

# Wave 4 — P3 cleanup

### [ ] EDGE-13 — subscription-mode checkout payment row not idempotent under Stripe retry — P3
- **Where:** `app/api/webhook/stripe/route.ts:180-185` (naturalKey falls back to auto-id
  when invoice + payment_intent both absent), `:449` (subscription-mode passes neither),
  `:511` (un-guarded read after the record → throw → 500 → retry → duplicate row).
- **Fix:** for subscription-mode checkout use `session.id` as the natural key:
  `doc(\`${session.id}_${status}\`)`.
- **Do-not-break:** monthly `invoice.paid` rows keep the invoice-id key (repeat invoices
  stay distinct rows). Align the 200-vs-500 decision with EDGE-WEBHOOK.
- **Verify:** invoke the handler twice with the same event fixture → one
  `payment_history` doc.

### [ ] EDGE-14 — dashboard silently renders the first-time-user empty state when the sessions query fails — P3
- **Where:** `app/dashboard/page.tsx:120-130` (`catch { return null }` inside
  `Promise.all`), `:176` (null falls through as "no sessions").
- **Fix:** distinguish empty from failed: inner IIFE returns a sentinel / sets
  `sessionsError`; render the existing error styling with a Retry affordance in the
  Recent Activity card.
- **Do-not-break:** genuine zero-session users keep the friendly empty state.
- **Verify:** mock `getDocs` rejection → error/retry card, not "no sessions yet".

### [ ] EDGE-15 — a 0-second session is persisted as 30 minutes — P3
- **Where:** `lib/hooks/use-streaming-feedback.ts:188`
  (`Math.round((request.elapsedTimeSeconds || 1800) / 60)`); inconsistent with
  `useFeedbackStreaming.ts:105` (`|| 0`).
- **Fix:** `Math.round((request.elapsedTimeSeconds ?? 0) / 60)`; if a default is wanted
  for genuinely-missing data, apply only when `elapsedTimeSeconds === undefined`.
- **Do-not-break:** persist-endpoint mastery calc assumes minutes ≥ 0 — keep non-negative.
- **Verify:** unit test with `elapsedTimeSeconds: 0` → `timeSpentMinutes: 0`.

### [ ] EDGE-16 — conclusion detection substring-matches "done"/"all good", prematurely ending debriefs — P3
- **Where:** `app/interview/_hooks/useInterviewChat.ts:182-202`
  (`conclusionSignals.some(s => msg.includes(s))` — "I could have **done** better on edge
  cases" sets `isEndingSession` and injects the "conclude now" directive).
- **Fix:** word-boundary / exact-phrase matching (regex with `\b`, or match against the
  trimmed whole message for short signals like "done").
- **Verify:** unit test: "I could have done better" does NOT trigger; "done" alone does.

### [ ] EDGE-17 — paid checkout with missing userId metadata is ACKed with no dead-letter — P3
- **Where:** `app/api/webhook/stripe/route.ts:528-534` (warn-log + 200; paid-but-never-
  upgraded is unrecoverable).
- **Fix:** add `recordWebhookFailure(event, "checkout.session.completed:no-user", …)` so
  admins can reconcile.
- **Verify:** handler unit test with a metadata-less fixture → `webhook_failures` doc.

### [ ] DUP-12 — free-tier limit "8" hardcoded as UI fallbacks on /limit-reached — P3
- **Where:** `app/limit-reached/page.tsx:78,:91` vs `lib/config.ts:13`.
- **Fix:** `usageLimit?.limit ?? PRICING_CONFIG.free.sessionsPerMonth` (config is already
  imported client-side elsewhere, e.g. account page). Combine with EDGE-12's retry-state
  change.
- **Verify:** `pnpm typecheck`.

### [ ] PERF-S14 — verifyAuth + requireTier verify the same ID token twice on every Pro route — P3
- **Where:** e.g. `app/api/spaced-repetition/due/route.ts:23-32` (same pattern in stats,
  recommendations, roadmap GET/PATCH); `lib/quota-enforcement.ts:731` (`requireTier` →
  `verifyIdToken` #2 + profile read).
- **Fix:** add a `requireTierForUser(userId)` variant and pass `authResult.userId` (keep
  the standalone `requireTier` for routes that call it without prior `verifyAuth`).
- **Verify:** route tests; grep confirms single `verifyIdToken` per request path.

### [ ] PERF-S15 — chat request schema puts no bound on the `context` array — P3
- **Where:** `lib/interview/chat-request-schema.ts:8-15` (no `.max()` on the array or on
  `context[].message`; `message` itself IS capped at 10KB). LLM-side growth is already
  truncated by `manageContextWindow` (lib/interview/context-window.ts:24-55) — this is
  about upload/parse/validate cost and hostile multi-MB bodies.
- **Fix:**
  `context: z.array(z.object({ type: z.string().max(20), message: z.string().max(8000) })).max(60)`
  (60 > MAX_HISTORY_MESSAGES so behavior is unchanged).
- **Do-not-break:** `extractionJob` uses `context.slice(-10)`; `messageCount` is a
  separate schema field — verify precedence if the client ever sends a window.
- **Verify:** chat route test with 61-message context → 400; normal flows unaffected.

### [ ] PERF-C13 — /why-codesparring eagerly bundles three.js via MemoryBrain — P3
- **Where:** `components/why-codesparring/HeroSection.tsx:7,86`.
  **Correction (orchestrator-verified):** MemoryBrain uses VANILLA `three` only (no
  R3F/drei, contrary to the original agent claim) — the win is the ~513 KB three chunk,
  same as PERF-C1.
- **Fix:** `next/dynamic` with `ssr:false` (decorative right-column visual), same pattern
  as PERF-C1.
- **Verify:** rebuild; route drops the three chunk from its HTML script tags.

### [ ] PERF-C14 — `lib/hooks` barrel is a scenario-bundle tripwire — P3
- **Where:** `lib/hooks/index.ts` re-exports `useInterviewSession` and
  `useScenarioFilters`, both importing the full legacy `scenarios` — ANY barrel import
  (e.g. `OnboardingModal.tsx:5` for `useFocusTrap`) drags the scenario dataset into that
  consumer's chunk (currently only reached via already-dynamic chunks — `/practice` first
  load verified clean, so this is a tripwire, not a current regression).
- **Fix:** split the barrel so data-heavy hooks aren't re-exported alongside `useFocusTrap`
  — or convert those two hooks to the async scenario API (completes the C4/C9/C10
  migration).
- **Verify:** rebuild; grep build chunks for "Two Sum" — only the intentionally-lazy
  ScenarioBrowser chunk carries it.

### [ ] API-3 — guest-session PUT accepts unvalidated completion scores — P3
- **Where:** `app/api/guest-session/route.ts:182-261` (`performanceScore`,
  `efficiencyScore`, `testResults`, `feedback`, `finalCode` written with no range/type
  validation; ownership via guestId+sessionId IS enforced — self-cheating only).
- **Fix:** Zod schema clamping scores to 0-100, bounding `testResults`/`finalCode` length.
  `guestSessionRateLimit` already applied.
- **Do-not-break:** guest resume/complete relies on partial-field merges — keep every
  field optional.
- **Verify:** POST then PUT with out-of-range scores → rejected.

### [ ] API-4 — vectorize-problems echoes raw error internals to any caller — P3
- **Where:** `app/api/vectorize-problems/route.ts:49,98` (raw `error.message` to public
  GET). (The `health`/`rag/health` and `sync-subscription`/`debug-promo-code` leaks are
  already tracked as API-LEAK-1/2 in PRE-LAUNCH-FIXES.md — fold there, don't duplicate.)
- **Fix:** keep `logger.error`, return generic `{ error: "Something went wrong" }`
  (pattern from `app/api/user/profile/route.ts`).
- **Verify:** trigger a 5xx → no raw message.

---

## Verified NOT dead / clean — do NOT "fix" these

- `public/workers/{python,js,sql}-sandbox-worker.js`, `public/wasm/sql-wasm.js` —
  runtime-loaded by URL (knip false positives).
- `content/blog/*.mdx` — filesystem-loaded by the blog.
- `app/python-executor/` — live (linked from `app/learn/python/page.tsx:55`), 100%
  client-side Pyodide.
- `app/api/transpile/route.ts` — live (called by
  `lib/workspace-execution/js-sandbox/transpiler.ts:8`).
- `scripts/*` — manually-run operational scripts.
- `components/InteractiveTour.tsx`, `components/GridBackground.tsx` — live.
- `lib/rate-limit.ts` vs `lib/rate-limiter.ts` — intentional split (per-IP/route
  fixed-window vs per-user tier/token/budget sliding-window). Both live.
- `lib/analytics.ts` / `lib/analytics-server.ts` / `lib/firebase-analytics-admin.ts` —
  distinct responsibilities (client / Admin-SDK writes / GA4 Data API reads). All live.
- `lib/rag/utils/index.ts` — LIVE despite knip flagging it.
- Piston cluster (`lib/piston.ts`, `app/api/execute`, `app/api/execute/ast`) — owned by
  DEPRECATE-1 in PRE-LAUNCH-FIXES.md.
- Stripe price IDs — NOT duplicated (single env-var source in
  `app/api/create-checkout/route.ts:33-50`; webhook keys off `metadata.planType`).
- Client-side listener hygiene is clean: zero `onSnapshot` repo-wide; all 18 `setInterval`
  sites and all `addEventListener` files have matching cleanup; no raw `<img>` tags; no
  large JSON imports into client code; fonts use `next/font`.
- Dashboard/metrics math: `.reduce` calls are seeded; empty states guarded (except the
  roadmap surfaces in EDGE-10).
- The stale comment at `app/api/chat/route.ts:755` ("cache key only uses first 500 chars")
  is outdated — `generateCacheKey` hashes full content (ai-cache.ts:66-82). Delete the
  comment when touching that file.

## Progress Log

<!-- One line per completed item: 2026-07-DD — ID — commit <hash> — note -->
