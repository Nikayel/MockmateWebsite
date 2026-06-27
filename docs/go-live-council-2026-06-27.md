# CodeSparring — Go-Live Council Review

**Date:** 2026-06-27  ·  **Method:** 6-LLM council (3 business + 3 architecture lenses), every finding adversarially stress-tested by two skeptics (code-truth + severity), then synthesized. 101 agents · ~3.0M tokens · 47 findings.

> Companion / refresh of [GTM.md](./GTM.md) and [../immediate_fixes.md](../immediate_fixes.md). This council was instructed to **verify every prior claim against current HEAD** — so it records what is already fixed, not just what is broken.

---

## Verdict: **CONDITIONAL-GO** — readiness **6/10**

CodeSparring is structurally sound for a small soft launch — webhook/RBAC/Firestore-rules/delete-account are verified-strong, and several prior "blockers" (no error tracking, in-memory rate-limit bypass, guest-migration dead-end) are already fixed in code at HEAD. The two real go-live conditions are: (1) close the anonymous + spoofable-IP cost-abuse hole on the free LLM funnel (no aggregate spend ceiling, trusts leftmost x-forwarded-for), backstopped same-day with provider spend caps; and (2) clean a handful of legally-exposed marketing strings (fabricated efficacy/"45x cheaper", "used by engineers at Google/Meta/Amazon", US-only-residency claim while DeepSeek/China can receive code). Both are cheap and can ship before or within launch week; neither requires re-architecture.

_Per-lens readiness: GTM/Legal 4 · Product/Activation 4 · Moat 5 · Architecture 5 · Security 4 · AI-Cost/Reliability 4. Of 11 author-flagged 'blockers', only 3 survived stress-testing as launch conditions; severity changed on 41/47 findings._

---

## ⚠️ Stress-test correction & remediation (added 2026-06-27, post-council)

A follow-up code-truth audit re-verified this doc's security claims against HEAD. **Three "genuinely strong" claims were overstated, and one worse hole was missed entirely.** All cost-abuse findings were CONFIRMED real (if anything, understated). The code-level remediation below has now been **implemented and tested** (typecheck + lint clean, 453 tests pass).

**Overstated in this doc (corrected):**
1. **"delete-account behind CSRF" → CSRF is non-functional.** `lib/csrf.ts` requires a cookie that is never issued (no `middleware.ts`, no `*csrf*` endpoint) and the real client never sends the header. The control is dead code; real protection is the Firebase ID token + rate limit (both fine). _Not changed — moot on a Bearer-auth endpoint; flagged so it isn't trusted as a control._
2. **"Rate limiting fails CLOSED at boot" → it fails OPEN at runtime.** The boot throw is lazy (first request) and only fires if BOTH Upstash and Firebase are absent; on any store error the limiter returns "allow" (`lib/rate-limit.ts`). `FirestoreRateLimitStore` also ignores TTL (spoofed IPs grow the collection unbounded).
3. **"Error/cost alerting is implemented" → mostly inert/dead code.** Sentry is a hand-rolled fetch (no SDK in package.json), all transports no-op without prod env vars, the webhook only fires on `error` not `warn`, and the per-request/per-user cost-anomaly detectors have **zero callers**. Nothing autonomously pages a human.

**Missed by this doc (now fixed):** `app/api/analyze-complexity/route.ts` was a **fully unauthenticated, unthrottled, untracked LLM endpoint** — the single worst cost hole. **Bonus:** cost was attributed to the **unverified `userId` from the request body**, enabling budget-poisoning (drain a victim's budget by passing their uid).

**Implemented remediation (this commit):**
- **Trusted client IP** — `getClientIdentifier` now uses Vercel's `x-vercel-forwarded-for`/`x-real-ip` (and rightmost-XFF fallback), never the spoofable leftmost XFF or `cf-connecting-ip`.
- **Auth required on all cost-bearing routes** — `enforceQuota(request, { requireAuth: true })` on chat, generate-feedback, execute, analyze-complexity. Signed-out callers (anonymous OR guest-header-only) get `401 { code: "AUTH_REQUIRED", message: "Please sign in to continue." }`. **Product consequence: the no-signup guest *interview* funnel is now gated behind sign-in (deliberate, per owner decision).** Client calls now attach the Firebase ID token.
- **Verified-userId attribution** — cost/usage is attributed to the auth-token uid, never the request body (kills budget-poisoning).
- **analyze-complexity locked down** — IP rate limit + auth + verified-userId + input-size guards.
- **Global daily spend ceiling** — `lib/global-spend-guard.ts`, a UTC-day aggregate kill-switch (`COST_PROTECTION.GLOBAL_DAILY_SPEND_CEILING_USD`, default $50, env-overridable) checked per authed request and fed by every LLM call. Server-only (`firestore.rules` default-deny + explicit blocks).
- **Circuit-breaker fail-open cap tightened** 10→5; global ceiling is the aggregate backstop.
- **RLS confirmed strong** — `usage_summaries`/`usage_events`/`global_usage`/`config` are server-write-only (Admin SDK), made explicit in `firestore.rules`. Clients cannot zero their budget or tamper with the global counter.

**Still ops-only (not code — confirm before flip):** provider-side spend caps on Gemini/DeepSeek + Piston concurrency cap; Vercel prod env (UPSTASH/SENTRY/LOGFLARE); `ERROR_WEBHOOK_URL → Slack`; external cron-job.org jobs. The legal/marketing copy conditions (C2/C3) below are **not** addressed by this commit.

---

## 1. Launch conditions (must clear — but all cheap, isolated, reversible) — 3

### C1. Anonymous + spoofable-IP free-LLM funnel has no aggregate cost ceiling  ·  _owner: eng · security / ai-cost (free funnel)_
- **Why it gates launch:** The no-signup guest path is the activation strategy. An attacker rotating x-forwarded-for (and/or X-Guest-Id) mints fresh rate-limit + quota buckets and drives Gemini/DeepSeek/Piston COGS with the spend untracked and invisible to anomaly detection. This is the one surviving 'uncapped bill on day one' scenario.
- **Evidence (current HEAD):** lib/quota-enforcement.ts:357-360 returns {allowed:true, userId:'anonymous'} for requests with no auth and no X-Guest-Id; app/api/chat/route.ts:154 `if (rateLimitUserId !== 'anonymous')` skips the per-user tier limiter + startRequestTracking for anonymous, so the only gate is chatRateLimit (IP-based, route.ts:138). lib/rate-limit.ts:444 getClientIdentifier returns `forwarded.split(',')[0].trim()` — the client-controlled LEFTMOST x-forwarded-for, spoofable on Vercel. lib/ai-providers.ts records usage only `if (userId)`, so anonymous spend is invisible to budget gates. No global daily guest/anonymous spend ceiling exists. Guest identity (lib/quota-enforcement.ts:159) is the client-generated X-Guest-Id UUID, rotatable to reset the per-guest Firestore counter.
- **Fix:** Three layered actions: (a) IMMEDIATE/DAY-ONE: set hard provider spend caps + billing alerts on Gemini, DeepSeek, and a Piston concurrency cap (ops, ~30 min) — bounds aggregate cost regardless of identity spoofing. (b) Replace leftmost XFF with the platform-trusted client IP (Vercel request.ip / x-vercel-forwarded-for / rightmost trusted hop) in lib/rate-limit.ts:444. (c) Stop treating 'anonymous' as allowed:true: reject cost-bearing chat/execute/feedback requests lacking both auth and a valid X-Guest-Id, OR route them through a single shared low-budget anonymous bucket + per-guest usage tracking; add a global daily guest-spend ceiling in Firestore/Redis.
- **Stress-test ruling:** Merges 5 findings across security + ai-cost lenses. Code-truth verifiers CONFIRMED every cited line. Severity-skeptics consistently downgraded blocker->high/medium, and I credit two corrections: (1) the rate-limit store fails CLOSED at boot in production (lib/rate-limit.ts:398-410 throws unless ALLOW_INSECURE_RATE_LIMIT=true) and Upstash creds ARE set, so the original B1 'silent in-memory bypass' is STALE; (2) per-call COGS is sub-cent and the IP limiter runs first. Net corrected severity: HIGH, kept as a launch CONDITION (not hard NO-GO) because the cheap provider-side spend cap fully de-risks day one. Promote to blocker because it is the only surviving uncapped-cost path.

### C2. Fabricated/unsubstantiated efficacy + comparative claims in indexed JSON-LD and pricing copy  ·  _owner: legal · legal-claims_
- **Why it gates launch:** Quantified, unqualified efficacy and price-comparison claims stated as fact ('Research shows...') inside machine-readable structured data are the textbook FTC §5 substantiation target, and a VC diligence read of the JSON-LD discounts every other claim. The 60+/70+ self-contradiction and SM-2-vs-FSRS mismatch signal claims written without checking the code.
- **Evidence (current HEAD):** components/seo/JsonLd.tsx:509 'Research shows 5 mock interviews doubles your pass rate ... that's 45x less expensive'; :145 '45x cheaper than human mock interviews ($25/month vs $1,125 for 5 sessions)'; :524 'spaced repetition improves retention by 10-30%'; :519 '70+ tech companies' vs :150 '60+ companies' (self-contradiction in same file); :143/:524 'SM-2 algorithm' while the engine also ships ts-fsrs via a 50/50 A/B router (algorithm-router.ts:175). SoftwareApplicationJsonLd renders on every page (app/layout.tsx:189); the FAQ block on the homepage (app/page.tsx:52). No study/citation/testimonial/aggregateRating exists in repo.
- **Fix:** Single-file copy edit in components/seo/JsonLd.tsx (plus app/why-codesparring/page.tsx where the same strings leak): delete or footnote-cite the 'doubles pass rate' and '10-30%' lines; reframe '45x cheaper' as a disclosed-basis illustrative comparison; reconcile 60+/70+ to one true number or 'growing library'; change 'SM-2 algorithm' to 'spaced repetition (FSRS/SM-2)'. Add a claims-substantiation file mapping each public number to a source.
- **Stress-test ruling:** Both code-truth lenses CONFIRMED all strings verbatim at HEAD (untouched by recent commits). Both severity-skeptics downgraded blocker->medium (JSON-LD invisible/unindexed on a new domain at soft-launch; 20-min fix). I keep it as a launch CONDITION (corrected severity HIGH): skeptics are right it doesn't break a journey, but the cost to fix is trivial and the discoverable-overstatement risk compounds the moment any paid acquisition or diligence starts. Note: SM-2 is NOT 'fabricated' (sm2-algorithm.ts exists); accurate framing is 'incomplete/inaccurate label'.

### C3. Unsubstantiated named-company endorsements at the point of purchase  ·  _owner: marketing · legal-claims_
- **Why it gates launch:** Unsubstantiated 'used by [named brand]' adoption claims are a classic FTC §5 deceptive-endorsement / implied-affiliation exposure, appearing exactly where money changes hands, maximizing materiality.
- **Evidence (current HEAD):** app/upgrade/page.tsx:312 'Used by engineers at Google, Meta, Amazon'; components/pricing/PricingPageClient.tsx:159 identical line; components/hero-section.tsx:51 'Used by Palantir & FAANG candidates'. Repo-wide search finds zero testimonials or permissioned logos. The upgrade/pricing lines render at the conversion moment (upgrade page gated on !isProUser).
- **Fix:** Soften per the council's own recommendation to non-deceptive framing ('built for FAANG-style interviews') — a 3-line edit across the three files. Prioritize the upgrade+pricing 'engineers at' lines (strongest adoption assertion) over the hero 'candidates' pill (more defensible).
- **Stress-test ruling:** Both code-truth lenses CONFIRMED verbatim (hero pill newly ADDED in 8a4fd04 — fresher, not fixed). Both severity-skeptics downgraded blocker->medium (near-zero day-one enforcement risk at soft-launch scale). Kept as a launch CONDITION at corrected severity MEDIUM-HIGH: a 5-minute fix that removes real legal/diligence exposure at the purchase surface. Bundle with the JSON-LD copy cleanup.

---

## 2. Already fixed / refuted by stress test — stop chasing these (7)

- **B6 — 'No error tracking / APM / alerting anywhere in the stack'**
  - _Ruling:_ STALE / already-fixed in code. Both code-truth verifiers refuted it; I confirmed lib/logger.ts:313-365 wires Sentry + Logflare + ERROR_WEBHOOK_URL, and .env.local has real SENTRY_DSN + LOGFLARE_API_KEY/SOURCE_ID + UPSTASH creds. Commit 003f494 added the Sentry ingestion path.
  - _Current state:_ Capability present and wired through every error/warn path including the cited circuit-breaker and CRITICAL cost-anomaly logs. Residual is operational: verify env vars set in Vercel prod and configure alert-routing rules. No engineering build required. Downgraded to shouldFix (alert-routing config).

- **B1 (partial) — 'Rate limiter fails open to in-memory tracking in production when Upstash is unconfigured'**
  - _Ruling:_ STALE. I confirmed lib/rate-limit.ts:398-410 THROWS a SECURITY ERROR at boot in production unless ALLOW_INSECURE_RATE_LIMIT=true, and defaults to a distributed Firestore store when Upstash is absent. Upstash creds are also set in env.
  - _Current state:_ Production rate limiting is distributed and fails closed at boot. The surviving B1 concern is narrower (leftmost-XFF spoof + anonymous bypass + no aggregate ceiling), captured in launchBlocker #1. The 'silent serverless bypass' framing should be dropped.

- **B7 — 'vercel.json has no crons array, so the spaced-repetition return loop is DEAD in production'**
  - _Ruling:_ PARTIALLY REFUTED. Both verifiers confirmed the no-crons fact but refuted the 'dead loop' conclusion. The SR return loop is also served in-app (/api/spaced-repetition/due, /practice ReviewSections) and the cron routes are designed for external cron-job.org triggering (commit 5efcb1f deliberately removed Vercel crons).
  - _Current state:_ In-app due-queue works without any cron. Only outbound reminder emails, subscription-expiry, usage aggregation, and the secondary 3x-relative cost-spike baseline depend on the external scheduler. Ops/runbook gap, downgraded to shouldFix — multi-day grace window since nothing is due on launch day.

- **Cost-anomaly alarm 'blocker' (cost-alarm-off-by-default, anomaly-tripwires-dead-code, cost-averages-cron-unregistered)**
  - _Ruling:_ DOWNGRADED to shouldFix. Severity-skeptics correctly noted the anomaly subsystem is a passive admin-pull dashboard, not a live guardrail: per-request/per-user checks have zero request-path callers, checkHourlyCostAnomaly only runs on a manual admin GET. Real-time cost protection lives in quota-enforcement + rate-limiter, not this cron.
  - _Current state:_ Wiring the cron + anomaly checks is genuine defense-in-depth debt behind launchBlocker #1, but fixing the cron does NOT add a live cost cap. The day-one cost backstop is provider-side spend caps (a config action), which is why this is not an independent blocker.

- **B2 (vs-* comparison pages) — fabrication risk across all marketing pages**
  - _Ruling:_ REFUTED for the long-form vs-* pages (non-issue). Both verifiers confirmed the codesparring-vs-leetcode/pramp/interviewing-io/hellointerview pages are balanced editorial that concede competitor strengths, and why-codesparring science principles carry real citations (Cepeda 2006, Roediger & Karpicke 2006, etc.).
  - _Current state:_ B2 fabrication exposure is correctly scoped to JsonLd.tsx + pricing copy (launchBlocker #2), NOT the comparison pages. Keep the editorial pages as-is.

- **labs-feedback-guest-deadend — 'flagship reward unreachable, conversion-killing dead-end'**
  - _Ruling:_ REFUTED by severity-skeptic. The recommended UI mitigation already exists: ReviewStation.tsx:58-61,209-219 renders the sign-in CTA (with redirect back to the lab) BEFORE the guest hits the 401, and short-circuits the API call client-side.
  - _Current state:_ Sign-in-before-payoff is intentional and gracefully surfaced. Remaining is pure funnel-timing/copy polish (set expectation on CaseLabIntro), downgraded to shouldFix.

- **guest-trial-client-only-gate — 'no server-side guest-session counter'**
  - _Ruling:_ PARTIALLY REFUTED. The mechanism claim is wrong: a server-side counter DOES exist (checkGuestQuota queries Firestore and returns 403 FREE_TRIAL_EXHAUSTED). The real weakness is that it keys on a client-resettable guest UUID — folded into launchBlocker #1.
  - _Current state:_ Don't 'add a server counter' (already present). The fix is binding guest identity to IP/device or a server-signed token, captured in launchBlocker #1.

---

## 3. Genuinely strong / launch-ready
- Security floor is genuinely strong and verified at HEAD: Stripe webhook is signature-verified + idempotent + refuses dev-secret fallback in prod (app/api/webhook/stripe/route.ts:196,225-262); admin routes are Firestore-RBAC role-gated; firestore.rules are default-deny with owner-scoped reads and server-only writes to billing docs; delete-account is comprehensive (Firestore + Pinecone + Stripe + auth) behind CSRF + rate limit; no server secrets reach client tsx.
- Production rate-limiting fails CLOSED, not open: lib/rate-limit.ts:398-410 throws a SECURITY ERROR at boot if no distributed store is configured (unless explicit override), and Upstash creds are set — this neutralizes the prior B1 'silent in-memory bypass' claim.
- Error/cost alerting IS implemented in code (prior B6 blocker is stale): lib/logger.ts ships live Sentry (ingestion-API), Logflare, and ERROR_WEBHOOK_URL transports on every error/warn; .env.local has real SENTRY_DSN + LOGFLARE creds. CRITICAL cost-anomaly and circuit-breaker logs reach a sink — residual is configuring alert routing, not building it.
- Guest->signup session migration works end-to-end (refutes a plausible activation-cliff): login/page.tsx posts to /api/guest-session/migrate, re-owns the interview_sessions doc (carrying Bug Fix scoring with it), is non-blocking, and self-heals on next login.
- The Case Lab silent-401 dead-end is fixed: b7aec01 added graceful inline 'Sign in to...' prompts with redirect-preserving links in CaseLabChat.tsx + ReviewStation.tsx; gating AI-cost actions behind sign-in is a defensible anti-abuse posture.
- FSRS scheduling delegates to the official ts-fsrs package and the due-queue read is per-user-subcollection-bounded (no full-collection scan) — prior scalability/correctness concerns refuted.
- Real, hard-to-copy moat exists in code: misconception-detection (lib/rag/misconception-detection.ts, 1132 lines) persists a per-user misconception graph to Firestore, plus a communication-weighted evidence-based scoring rubric (lib/scoring.ts) — assets that compound with usage.

---

## 4. Should-fix (launch week, not blocking) (7)
- **[legal/compliance] Privacy policy: US-only-residency + blanket no-training claim contradicts DeepSeek (China) processor** — Cheapest de-risk: confirm DEEPSEEK_API_KEY is UNSET in Vercel production (it is in active fallback chains in lib/ai-providers.ts:114-119 whenever set; a real key sits in .env.local but that is local-only). If unset in prod, the existing app/legal/page.tsx:247-249 US-only text is accurate. If DeepSeek stays enabled, add one cross-border-transfer sentence near app/legal/page.tsx:189 and qualify the blanket 'AI providers do NOT use your data to train' (line 151).
- **[eng/retention / observability] Register or document the external cron contract; add cost-baseline freshness check** — vercel.json has no crons array (confirmed); email-notifications + aggregate-usage are designed for cron-job.org external triggering (route docstrings). Ops/runbook gap, not dead code. Either add a Vercel crons array OR commit the cron-job.org job config to a deploy runbook and verify it fires with CRON_SECRET. Add a health check that warns if config/cost_averages is stale >2h. The in-app due-queue (/api/spaced-repetition/due, /practice ReviewSections) works without crons, so the SR loop is not dead — only outbound reminder emails + the secondary 3x-relative cost-spike signal depend on it.
- **[eng/ai-cost / observability] Wire real-time cost-anomaly checks into the request path + a live alert channel** — checkRequestCostAnomaly()/checkUserCostAnomaly() (lib/cost-anomaly-detection.ts:88,183) have ZERO production callers; checkHourlyCostAnomaly only runs on a manual admin GET. Wire a sampled per-request/per-user check after LLM cost is computed in lib/ai-providers.ts, and route the existing CRITICAL logs to a live sink. Logger already supports Sentry/Logflare/ERROR_WEBHOOK_URL; set ERROR_WEBHOOK_URL to a Slack webhook so 'CRITICAL COST ANOMALY' and 'circuit breaker OPEN' page a human.
- **[eng/scalability] Move quota fail-open circuit-breaker counters to shared (Redis) state** — circuitBreaker + failOpenRequestCounts (lib/quota-enforcement.ts:29-41) are module-level in-memory Maps, so the per-user MAX_FAIL_OPEN_REQUESTS cap multiplies by warm-instance count during a Firestore outage. Back them with the Upstash Redis already wired for rate-limiting; consider failing CLOSED (to a tiny shared cap) for guests/anonymous on quota-store error for cost-bearing routes. Note: the rate-limiter half of this prior claim is STALE — production already uses FirestoreRateLimitStore distributed by default.
- **[eng/monetization] Price drift: $24 in comparison section vs $25 everywhere else** — components/comparison-section.tsx:305 (AnimatedPrice value={24}) and :428 ('$24/mo') hardcode $24 while lib/config.ts:34-35 is the single source of truth at $25. Import priceDisplay/price from lib/config.ts; add to the existing pnpm check:theme-style drift guard. No over/undercharge, but an embarrassing visible inconsistency.
- **[product/product-activation] Surface the Case Lab / interviewer sign-in requirement up front for guests** — The prior 60-min-then-401 dead-end is FIXED (b7aec01 added graceful inline 'Sign in to...' prompts with redirect in CaseLabChat.tsx + ReviewStation.tsx). Remaining gap: CaseLabIntro.tsx shows no anon notice. Add one anon-aware line ('Sign in to get live interviewer feedback'). Consider N free quota-capped guest interviewer turns as a measured, capped experiment.
- **[product/monetization] Relabel referral widget pending rewards as 'applied manually' + admin runbook** — lib/referrals.ts free-months accrue as a Firestore counter with NO Stripe redemption path (markRewardPaid only flips status). ReferralWidget.tsx:198-210 shows pending+earned totals without an 'applied manually' caveat. 7-day eligibility + beta T&Cs give grace. Add the caveat, document an admin clearing runbook, backlog automated Stripe credit. Not blocking — no reward is eligible in week one.

---

## 5. Sequenced plan

### Sprint 0 — Day-one ops gate (hours, before flipping live)
_Bound aggregate cost and confirm the safety env is wired, independent of any code change._
- Set hard provider spend caps + billing alerts on Gemini, DeepSeek, and a Piston concurrency cap. This single action bounds worst-case COGS regardless of the anonymous/spoof hole.
- Confirm in Vercel prod env: UPSTASH_REDIS_REST_URL/TOKEN set (distributed rate limiting), SENTRY_DSN + LOGFLARE creds set (alerting live), and decide DEEPSEEK_API_KEY — unset it if you do not want to reconcile the privacy policy now.
- Set ERROR_WEBHOOK_URL to a Slack incoming webhook so existing CRITICAL/circuit-breaker logger.error egress pages a human.
- Confirm the external cron-job.org jobs (email-notifications, aggregate-usage) exist and authenticate with CRON_SECRET, or accept the multi-day grace window.

### Sprint 1 — Close the cost-abuse hole (eng, 1-3 days, gates GO)
_Make the free funnel uncapped-cost-proof in code, not just at the provider edge._
- lib/rate-limit.ts:444 — derive client IP from the Vercel-trusted source (request.ip / x-vercel-forwarded-for / rightmost trusted hop) instead of leftmost x-forwarded-for.
- lib/quota-enforcement.ts:357 + app/api/chat/route.ts:154 (and execute/generate-feedback) — stop returning allowed:true for 'anonymous'; reject cost-bearing requests lacking both auth and a valid X-Guest-Id, or route them through a single shared low-budget bucket with usage tracking.
- Add a global daily guest/anonymous spend ceiling in Firestore/Redis so guest-UUID rotation cannot exceed a hard budget; track anonymous spend (attribute to anon:<hashed-ip>).
- Move circuitBreaker/failOpenRequestCounts to Upstash Redis (shared) and fail-closed-to-tiny-cap for guests on quota-store error.
- Add regression tests asserting anonymous/guest cost-route behavior and a rules-emulator cross-user-denial test.

### Sprint 1 (parallel) — Legal/marketing copy pass (legal + marketing, <1 day, gates GO)
_Remove the deceptive-claim surface before any public/paid traffic or diligence._
- components/seo/JsonLd.tsx — delete/footnote-cite 'doubles pass rate' + '10-30%'; reframe '45x cheaper' as disclosed-basis illustrative; reconcile 60+/70+ to one number; change 'SM-2 algorithm' to 'spaced repetition (FSRS/SM-2)'. Repeat for the same strings in app/why-codesparring/page.tsx.
- Soften named-company endorsements: app/upgrade/page.tsx:312, components/pricing/PricingPageClient.tsx:159, components/hero-section.tsx:51 -> 'built for FAANG-style interviews' framing.
- Reconcile DeepSeek/privacy: either confirm DEEPSEEK_API_KEY unset in prod (existing US-only text becomes accurate) or add cross-border-transfer language + qualify the blanket no-training claim at app/legal/page.tsx:151.
- Fix $24->$25 drift in components/comparison-section.tsx (read from lib/config.ts) and add to the pricing-string drift guard.
- Create a claims-substantiation file mapping each remaining public number to a source.

### Sprint 2 — Observability + retention completeness (eng, launch week)
_Turn the detection backstop on and confirm the retention loop fires._
- Wire checkRequestCostAnomaly/checkUserCostAnomaly into a sampled request path (after LLM cost computed in lib/ai-providers.ts); confirm anomaly records reach the live alert sink.
- Register the crons (or document + verify the external cron-job.org contract) and add a config/cost_averages freshness health check.
- Configure Sentry/Logflare alert-routing rules; fire a synthetic 'test critical' as a launch-runbook step.
- Add an anon-aware sign-in expectation line to CaseLabIntro.tsx; relabel ReferralWidget pending rewards 'applied manually' + write the admin clearing runbook.

### Sprint 3 — Content depth + positioning (product + eng, post-launch)
_Back the wedge narrative with shipped content and durable infra polish._
- Register the ~10 orphaned bugfix scenarios (or document why they fail validation) to roughly double Bug Fix depth; roadmap toward 30+; templatize Case Lab authoring beyond the 2 hand-written labs.
- Wire chat extraction durably (next/server after() + persist tracker) or disable ENABLE_LLM_EXTRACTION to stop the wasted call.
- Add AbortSignal timeouts to the LLM fetch() calls; collapse the three budget-cap constants to one source + test.
- Re-center the category story on the misconception data-moat + evidence-based rubric; add a logged-WARNING + degraded health status for the RAG Firestore fallback.

---

## 6. Reliability / durable-background work (B7/B8 + the Workflow DevKit question)

- **B7 (crons) — PARTIALLY REFUTED.** `vercel.json` has no `crons` array, but the spaced-repetition return loop is served in-app (`/api/spaced-repetition/due`); only outbound reminder emails, usage aggregation, and the secondary cost-baseline depend on the external cron-job.org scheduler. Downgraded to should-fix (register/document the cron contract + add a `config/cost_averages` freshness check).
- **B8 (chat extraction) — Sprint 3 (post-launch).** [app/api/chat/route.ts:88](../app/api/chat/route.ts#L88) still does fire-and-forget `void (async…)()` with no `after()`/`waitUntil`, and there is no `after()`/`waitUntil` anywhere in `app/api`. Council recommendation: wire it durably with **`next/server` `after()` + a persisted tracker write**, or disable `ENABLE_LLM_EXTRACTION` to stop the wasted call.
- **Vercel Workflow DevKit (WDK):** not installed, and the council ranked these as post-launch — so the recommended path is the **lightweight `after()` + cron-registration fix, not adopting a durable-workflow framework before launch.** WDK remains a reasonable later option if durable multi-step jobs grow.

---

## 7. Confidence & caveats

Highest-confidence rulings (read the cited lines directly at HEAD): vercel.json has no crons array; lib/logger.ts wires Sentry+Logflare+webhook and .env.local has real SENTRY_DSN/LOGFLARE/UPSTASH/DEEPSEEK keys; rate-limit.ts:398-410 fails closed at boot; quota-enforcement.ts:357-360 anonymous allowed:true + chat route:154 skips tier limiter; getClientIdentifier:444 uses leftmost XFF; all JSON-LD/named-company/legal strings confirmed verbatim. Lower confidence / unverifiable from repo: (1) which env vars are ACTUALLY set in Vercel PRODUCTION — .env.local is local-dev only, so the real day-one exposure of the DeepSeek/China gap and the alerting/Upstash wiring depends on prod config the team must confirm (hence several 'verify in prod' items). (2) Whether the external cron-job.org jobs are configured and firing — invisible to the repo; a deploy-checklist item. (3) Whether the project runs on Vercel Fluid Compute (affects how badly the fire-and-forget chat extraction is truncated). I did not run pnpm build/test/typecheck, so I cannot vouch for compile/test health — recommend running them before flipping live. Verdict is CONDITIONAL-GO because the surviving blockers are cheap, isolated, reversible (copy edits + a bounded eng change + provider spend caps) with no re-architecture, AND the security/data floor is verified-strong; it would flip to NO-GO only if prod is confirmed to lack Upstash/Sentry AND the anonymous cost hole is left open AND DeepSeek is live with the contradictory privacy policy.

**Process caveats:** 10 of 47 findings received fewer than 2 stress-test verdicts (verifier agents hit a structured-output retry cap); their severities lean on the authoring lens + synthesis spot-check rather than two independent skeptics. No `pnpm build/typecheck/test` was run by the council — run before flipping live.

---

## Appendix — all 47 findings (compact)

| # | Sev (auth→skeptic) | Area | Title | Prior | Verified |
|---|---|---|---|---|---|
| 1 | blocker→medium | legal-claims | JSON-LD + FAQ assert unsubstantiated efficacy/comparative claims (FTC … | B2 | Y |
| 2 | blocker→medium | legal-claims | 'Used by engineers at Google/Meta/Amazon' and 'Palantir & FAANG candid… | B3 | Y |
| 3 | high→medium | monetization | Price contradiction: $24/mo in comparison section vs $25 everywhere el… | new | Y |
| 4 | high→low | legal-claims | '70+/60+ companies' and 'Case Labs' plural overstate a catalog of 4 co… | B4 | Y |
| 5 | high→medium | compliance | DeepSeek disclosed as processor but no China-residency/training disclo… | B5 | Y |
| 6 | high→medium | monetization | Free guest cap keyed on client-supplied X-Guest-Id header — rotatable … | B1 | Y |
| 7 | medium→low | product-activation | Case Lab payoff now sign-in-gated mid-flow (improved from 401, but sti… | B4 | Y |
| 8 | low→low | legal-claims | 'SM-2 algorithm' marketing claim is defensible (SM-2 is the default), … | B2 | Y |
| 9 | blocker→high | retention | Spaced-repetition return loop never fires — vercel.json has no crons a… | B7 | Y |
| 10 | high→medium | monetization | Referral viral loop advertises rewards that have no automated fulfillm… | new | Y |
| 11 | high→medium | product-activation | Post-response LLM extraction is computed, logged, then discarded — nev… | B8 | Y |
| 12 | high→medium | product-activation | Flagship Case Lab wedge ships with only 2 labs and an immediate sign-i… | B4 | Y |
| 13 | medium→low | monetization | Guest free-trial limit is client-side localStorage/cookie only — trivi… | B1 | Y |
| 14 | low→low | product-activation | Guest→signup session migration is correctly wired (prior dead-end conc… | B4 | Y |
| 15 | medium→low | observability | Activation funnel has analytics events but no verified product-analyti… | B6 | Y |
| 16 | blocker→medium | legal-claims | JSON-LD still asserts fabricated efficacy/comparative stats with no in… | B2 | Y |
| 17 | high→medium | competitive-moat | Flagship Bug Fix wedge ships only 8 registered scenarios; positioning … | B4 | Y |
| 18 | high→— | competitive-moat | Only 2 Case Labs exist; company-specific positioning is barely backed | B4 | Y |
| 19 | medium→low | legal-claims | '350+ problems/month' implies a library far larger than the ~251 disti… | new | Y |
| 20 | medium→low | competitive-moat | Misconception-detection + evidence-based scoring is the real, wired-in… | new | Y |
| 21 | medium→low | legal-claims | vs-HelloInterview page claims Bug-Fix/real-world scenarios as 'unique'… | new | Y |
| 22 | low→non-issue | legal-claims | Long-form comparison pages are largely balanced and do NOT carry fabri… | B2 | Y |
| 23 | low→low | competitive-moat | 221 DSA scenarios are the bulk of the catalog but are the least defens… | new | Y |
| 24 | blocker→medium | ai-cost | Cost-anomaly alarm depends on an unregistered external cron and degrad… | B7 | Y |
| 25 | high→medium | scalability | Quota fail-open protection and rate-limit fallback use per-instance in… | B1 | Y |
| 26 | high→low | observability | No error tracking / APM / alerting anywhere in the stack | B6 | Y |
| 27 | high→medium | reliability | Post-response chat extraction is bare fire-and-forget and its result i… | B8 | Y |
| 28 | medium→low | scalability | RAG silently degrades to a 200-doc in-memory scan when Pinecone is not… | new | Y |
| 29 | medium→medium | security | Client identifier takes leftmost x-forwarded-for value, which is clien… | B1 | Y |
| 30 | low→non-issue | data-model | FSRS correctness and due-queue read scope are sound (prior concerns re… | B-scheduler/B2-algo | Y |
| 31 | medium→medium | reliability | Monolithic chat/feedback routes run multiple sequential LLM calls unde… | new | Y |
| 32 | blocker→high | security | Unauthenticated requests bypass all per-user quota/limits and reach th… | B1 | Y |
| 33 | blocker→high | security | IP rate limiter trusts spoofable x-forwarded-for and fails open | B1 | Y |
| 34 | blocker→medium | observability | vercel.json has no crons array — cost-anomaly baseline never computed,… | B7 | Y |
| 35 | high→medium | observability | No error tracking or cost alerting installed (no Sentry/OTel/PostHog) | B6 | Y |
| 36 | high→medium | compliance | Privacy policy claims US-only processing + no-training while routing u… | B5 | Y |
| 37 | high→medium | security | Guest quota check fails open on Firestore error (circuit-breaker softe… | B1 | Y |
| 38 | medium→low | product-activation | Case Lab feedback payoff 401s for guests (sign-in gate) — flagship rew… | B4 | Y |
| 39 | low→non-issue | auth | Verified-good controls: Stripe webhook, admin RBAC, firestore.rules, d… | new | Y |
| 40 | blocker→medium | ai-cost | Real-time cost-anomaly detection (per-request & per-user) is never inv… | new | Y |
| 41 | blocker→medium | ai-cost | Spike-vs-average anomaly detection silently disabled: cost_averages do… | B7 | Y |
| 42 | blocker→medium | ai-cost | Anonymous requests skip per-user rate limiting and record no usage — c… | B1 | Y |
| 43 | high→medium | reliability | IP rate limiter trusts unvalidated x-forwarded-for and fails open on a… | B1 | Y |
| 44 | high→low | observability | No APM/error tracking; the only alert transport (ERROR_WEBHOOK_URL) is… | B6 | Y |
| 45 | medium→low | reliability | Chat extraction is fire-and-forget (no after()/waitUntil); deferred LL… | B8 | Y |
| 46 | medium→low | ai-cost | Three independent hardcoded budget-cap definitions; two are live gates… | new | Y |
| 47 | medium→low | ai-cost | A single chat turn and hint request can fan out to multiple uncapped L… | new | Y |