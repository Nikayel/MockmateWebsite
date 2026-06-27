# CodeSparring — Go-To-Market & Go-Live Plan

**Owner:** Founder / CTO
**Last reviewed:** 2026-06-27
**Method:** Council-of-LLMs audit (8 expert lenses + adversarial red-team + synthesis), each verifying claims against the actual repo. Companion to [go-live-vc-strategy.md](./go-live-vc-strategy.md) and the hardening backlog in [../immediate_fixes.md](../immediate_fixes.md).

---

## 1. Verdict

> **NO-GO today. Do a quiet, instrumented, Bug-Fix-led soft launch in ~2 sprints** — once the cost-abuse hole is closed, the fabricated claims (including JSON-LD) are scrubbed, Case Labs is gated honestly, and error/cost alerting exists. Then raise on evidence, not assertions.

**Go-live readiness: 4 / 10.** Strong engineering foundation and a genuinely sharp wedge, but a launch-day uncapped-cost hole, fabricated claims in machine-readable structured data, a broken flagship guest path, and zero observability make a public/VC launch today reckless.

The idea is fundable. The execution gap is **focus, honesty, and guardrails** — not "build more."

---

## 2. Positioning (recommended, final)

The wedge is real and ownable. Lead with **Bug Fix** — it is the only journey that is substantiated (17–18 real scenarios), end-to-end complete, and guest-convertible. Position **Case Labs** honestly as an expanding catalog, not a finished co-flagship, until the catalog deepens and the guest feedback path works.

| Element | Recommendation |
|---|---|
| **One-line pitch** | "Practice the interview rounds LeetCode skips — fix a real bug, defend your reasoning." |
| **Hero headline** | "Fix a failing test in a real codebase. An AI interviewer reacts as you work." |
| **Primary CTA** | "Try a free Bug Fix round — no signup" → `/interview` (auto-starts the `checkout total returns NaN` scenario). |
| **Case Labs framing** | "Company-specific case rounds, expanding weekly — start with the Palantir FDSE Case Lab." |
| **Social proof** | Drop all named-company "used by" eyebrows. Use defensible framing: "Built on the real Palantir-style and FAANG rounds employers run." |

**The category story for the deck:** this is *modern software-interview readiness / work-sample practice* — the rounds (bug fix, scoping, build) LeetCode structurally cannot serve with a single-function-puzzle content model. Category expansion, not a cheaper mock.

---

## 3. Launch blockers (must clear before ANY traffic)

Owner tags: `eng` · `product` · `marketing` · `legal` · `founder`.

| # | Blocker | Owner | Why it's a blocker |
|---|---|---|---|
| B1 | **Uncapped cost-abuse on the free funnel (server-side)** | eng | `checkGuestQuota` fails open on any Firestore error ([lib/quota-enforcement.ts:225](../lib/quota-enforcement.ts#L225)); anonymous requests with no `X-Guest-Id` return `allowed:true / userId:'anonymous'` (L356), backed only by an IP limiter that trusts spoofable `x-forwarded-for` and — with no Upstash in prod — falls back to per-lambda in-memory counters ([lib/rate-limiter.ts:92](../lib/rate-limiter.ts#L92)). A script rotating fresh guest UUIDs gets effectively unlimited Gemini + Pinecone + Piston spend. **Most likely way launch day produces a surprise five-figure bill.** |
| B2 | **Fabricated efficacy/comparative claims embedded in schema.org JSON-LD** | marketing | [components/seo/JsonLd.tsx](../components/seo/JsonLd.tsx) ships machine-readable FAQ/Product markup: "5 mock interviews doubles your pass rate" (L509), "spaced repetition improves retention 10–30%" (L524), "45x cheaper" (L145), "29% cheaper than LeetCode Premium" (L504), "SM-2 at scientifically optimal intervals" (L524 — code now uses `ts-fsrs`, so the algorithm name is *also* wrong), "70+ tech companies" (L519 — repo has ~38 entries). Feeds invented facts to Google's knowledge graph and AI answer engines. FTC §5 exposure + highest blast radius. |
| B3 | **Unsubstantiated named-company endorsements (5 live instances)** | marketing | "Used by Palantir & FAANG candidates" ([hero-section.tsx:51](../components/hero-section.tsx#L51)), "Used by engineers at Google, Meta, Amazon" ([PricingPageClient.tsx:159](../components/pricing/PricingPageClient.tsx#L159), [app/upgrade/page.tsx:312](../app/upgrade/page.tsx#L312)), "Join 2,000+ developers" ([pricing-section.tsx:44](../components/pricing-section.tsx#L44)). No testimonials/usage data anywhere in repo. Deceptive-endorsement risk on the paid checkout path + diligence landmine. Fixing only the hero leaves four live. |
| B4 | **Case Lab is a live dead-end behind a primary hero CTA** | product | Hero "Explore Case Labs" funnels signed-out users into `/labs/[labId]`, which lets a guest play all 5 milestones (~60 min), but [app/api/labs/feedback/route.ts:16](../app/api/labs/feedback/route.ts#L16) hard-401s any unauthenticated request — the entire payoff (score/feedback) is unreachable. Only 2 labs exist ([lib/labs/case-labs/index.ts](../lib/labs/case-labs/index.ts)). The most curious users (the ones an investor clicks live) get the worst experience. |
| B5 | **Privacy policy contradicts the DeepSeek processor** | legal | `app/legal` asserts in bold "AI providers do NOT use your data to train", "SCCs with our processors", US-only hosting — while [lib/ai-providers.ts:78](../lib/ai-providers.ts#L78) enables `deepseek` (`api.deepseek.com/v1`) whenever `DEEPSEEK_API_KEY` is set. Standard DeepSeek API stores inputs in China and may train on them. Written-privacy false statement + GDPR cross-border-transfer problem, on a tool where "where does my code go" is the #1 trust objection. |
| B6 | **No error tracking / alerting anywhere** | eng | No Sentry/Datadog/OTel/PostHog in `package.json`. Only signal on launch day is `logger.error` in Vercel logs — no paging on 5xx storms or cost spikes. For an AI product where each error can be a billed LLM call, this turns every other risk from "detectable and contained" into "discovered from an angry user or a cloud bill." |
| B7 | **Load-bearing background work depends on invisible/unregistered crons** | eng | `vercel.json` has NO `crons` array. `aggregate-usage` writes `config/cost_averages`, which the cost-spike detector requires — if it never runs, `getAverageHourlyCost` returns 0 and the runaway-cost alarm is silently off (compounds B1). The lifecycle/reactivation email engine fires only via an undocumented cron-job.org trigger. Both fail silently with no heartbeat. |
| B8 | **Chat extraction is fire-and-forget AND discards its result** | eng | [app/api/chat/route.ts:828](../app/api/chat/route.ts#L828) runs extraction via `void (async()=>{})()` with no `after()`/`waitUntil` before returning, so Vercel kills it mid-flight; and [lib/services/extraction-service.ts](../lib/services/extraction-service.ts) only *returns* merged trackers — never writes to Firestore. Net: phase detection degrades across a session — the flagship "AI that reacts as you work" gets *dumber* exactly during a live VC demo. |

---

## 4. Should-fix before soft launch (high, not strictly blocking)

- [ ] **Reconcile positioning across ALL surfaces, not just the hero** — rewrite [comparison-section.tsx](../components/comparison-section.tsx), the four `app/codesparring-vs-*/page.tsx` pages, AND the JSON-LD descriptions ([JsonLd.tsx](../components/seo/JsonLd.tsx) L109/L499/L504/L514) which still sell the old "speak your solution out loud" voice product to crawlers and never mention Bug Fix or Case Labs.
- [ ] **Collapse the AI budget cap to one source of truth** — currently defined 3×: `AI_BUDGET_CAPS` ([lib/pricing.ts](../lib/pricing.ts)), `BUDGET_CAPS` ([lib/usage-tracking.ts](../lib/usage-tracking.ts)), `BUDGET_LIMITS` ([lib/quota-enforcement.ts](../lib/quota-enforcement.ts)). Only the last gates; drift silently removes the margin guardrail (violates the repo's own DRY constitution).
- [ ] **Fix the price contradiction** ($24 in comparison-section vs $25 in JSON-LD/vs-leetcode) — source all displayed prices from `PRICING_CONFIG`.
- [ ] **Add `/labs` to [app/sitemap.ts](../app/sitemap.ts) + [public/robots.txt](../public/robots.txt)**, or remove the co-flagship discovery promise until labs are deeper.
- [ ] **Fix stale "Mockmate" brand** in `components/dashboard/ReferralWidget.tsx` `shareNative()` — the outbound viral message broadcasts the wrong product name.
- [ ] **Replace hardcoded marketing "analytics"** ([metrics-marketing-section.tsx](../components/metrics-marketing-section.tsx) `READINESS=78`, `PATTERN_BARS`) with a real sample readiness ring, or label it clearly as illustrative.
- [ ] **Gate Firebase Analytics behind consent** ([lib/firebase.ts:121](../lib/firebase.ts#L121) `getAnalytics` runs at module load before the consent banner).
- [ ] **Verify Stripe webhook idempotency** against double-delivery; add a startup env-var assertion so missing `UPSTASH_REDIS_*` / `CRON_SECRET` fails the build instead of silently degrading.
- [ ] **Expand GDPR self-service export** — `app/account/page.tsx` `handleExportData` covers only 3 of ~18 personal-data collections enumerated in the delete-account route.
- [ ] **Unify primary-CTA destinations** (hero, comparison, metrics-marketing → one funnel entry); confirm the no-signup try-free promise actually holds at `/interview`.

---

## 5. GTM pillars

1. **Own a new category, not a cheaper mock.** Frame as "modern software-interview readiness / work-sample practice" — the rounds LeetCode structurally cannot serve. Make "the rounds LeetCode skips" the spine of every comparison page and the deck as a category-expansion story.
2. **Evidence-based scoring as differentiator + moat.** Surface the rubric (files inspected, tests run, hypothesis, root cause, prevention, AI-collaboration quality) as a public sample report. It is unusually concrete vs "AI feedback" competitors, is the bridge to a B2B employer work-sample-signal story, and is the credible answer to "why can't LeetCode copy this in a quarter."
3. **Programmatic + comparison SEO as the low-CAC engine.** `vs-*` pages, intent pages, per-company prep, blog, `llms.txt` already exist — but must be re-pointed at the wedge (including JSON-LD) and instrumented with real visit tracking (GA4 Data API) before driving traffic. The admin funnel currently derives "visits" from profile count ([app/api/admin/funnel/route.ts:47](../app/api/admin/funnel/route.ts#L47)).
4. **Product-led free guest activation, hardened.** The no-signup first Bug Fix round is the real differentiator vs LeetCode; keep it, but server-side rate-limit guests by fingerprint/IP to cap COGS, and convert the Case Lab 401 wall into a "sign in to see your scored feedback" activation moment instead of a dead end.
5. **Lifecycle + referral retention loop, once it actually fires.** The timezone-aware lifecycle email engine and the referral program (1 free month + $10) are built; turn them on (wire crons with heartbeats), fix the Mockmate brand string, trigger off a defined activation event ("completed first scored round"), and surface referrals at peak goodwill post-completion.

---

## 6. Sprint plan (engineers/marketers can start Monday)

Sequencing is dependency-ordered. **Do not drive any traffic until Sprint 1 + 2 are green.**

### Sprint 1 — Stop the bleeding (cost, honesty, dead-end) · *blocks all traffic*
**Goal:** No path to uncapped spend; no fabricated claim live anywhere (visible or structured); no flagship CTA leads to a dead end.

- [ ] `[eng]` **Make Upstash Redis a hard prod dependency.** In [lib/rate-limiter.ts:92](../lib/rate-limiter.ts#L92) replace the silent in-memory fail-open with fail-closed `503` when `isProduction && !hasRedis`; add a startup assertion that throws if `UPSTASH_REDIS_REST_URL/TOKEN` unset in prod. **AC:** deploy without Redis env fails build/boot; with Redis, concurrent multi-instance abuse test caps guest spend.
- [ ] `[eng]` **Close the anonymous/guest hole** in [lib/quota-enforcement.ts](../lib/quota-enforcement.ts): require a valid `X-Guest-Id` (reject the `userId:'anonymous'` allow path L356); bind guest identity to an IP+UA fingerprint; on Firestore error fail **closed** for new guests (L225). **AC:** rotating fresh guest UUIDs from one IP is capped to one free session; integration test proves it.
- [ ] `[eng]` **Derive client IP from a trusted header** (Vercel `x-vercel-forwarded-for` / connecting IP), not the first `x-forwarded-for` token, in `lib/rate-limit.ts` `getClientIdentifier`. **AC:** spoofed `x-forwarded-for` does not reset the limit.
- [ ] `[marketing]` **Scrub JSON-LD.** Delete or cite every fabricated stat in [components/seo/JsonLd.tsx](../components/seo/JsonLd.tsx) (L145, L504, L509, L519, L524) AND rewrite the description blocks (L109/L499/L504/L514) off the voice-mock framing onto Bug Fix + Case Lab. **AC:** JSON-LD validates and contains no uncited efficacy/comparative claim and no "speak out loud" language.
- [ ] `[marketing]` **Remove 5 named-endorsement/count claims:** [hero-section.tsx:51](../components/hero-section.tsx#L51), [PricingPageClient.tsx:159](../components/pricing/PricingPageClient.tsx#L159), [app/upgrade/page.tsx:312](../app/upgrade/page.tsx#L312), [pricing-section.tsx:44](../components/pricing-section.tsx#L44). Replace with defensible copy. **AC:** grep for `Used by` / `2,000+` across repo returns 0 marketing instances.
- [ ] `[product]` **Kill the Case Lab guest dead-end:** either gate `/labs/[labId]` behind login and change the hero CTA, OR relax [app/api/labs/feedback/route.ts:16](../app/api/labs/feedback/route.ts#L16) to allow one guest-run scored feedback (mirror the Bug Fix guest path). **AC:** a signed-out user who finishes a lab gets either scored feedback or a "sign in to score" wall *before* investing 60 min — never silence.
- [ ] `[legal]` **Resolve DeepSeek vs privacy policy:** disable DeepSeek in prod (unset `DEEPSEEK_API_KEY`) OR rewrite `app/legal` to disclose the China transfer + actual retention/training terms and drop the blanket "do not train / SCCs / US-only" claims. **AC:** privacy policy and [lib/ai-providers.ts](../lib/ai-providers.ts) enabled providers are consistent.

### Sprint 2 — Observability, durable background work, correctness · *blocks soft launch*
**Goal:** You can see and be paged on cost/error spikes; scheduled work provably runs; the AI interviewer doesn't degrade mid-session.

- [ ] `[eng]` **Add Sentry** (or equivalent) wired to `lib/logger.error` and the cost-anomaly `recordAnomaly` path; one paging rule each for 5xx rate and hourly cost spike. **AC:** a forced error and a forced cost spike both page.
- [ ] `[eng]` **Register crons:** add a `vercel.json` `crons` entry (or document+monitor the cron-job.org trigger) for `aggregate-usage` and `email-notifications`; add a health check alerting if `config/cost_averages` is missing/stale. **AC:** `config/cost_averages` written hourly; `getAverageHourlyCost` > 0; missing-doc alert fires in staging when the cron is paused.
- [ ] `[eng]` **Make chat extraction durable:** wrap `runConversationExtractionAfterResponse` in Next.js `after()`/`waitUntil` ([app/api/chat/route.ts:828](../app/api/chat/route.ts#L828)) AND make [lib/services/extraction-service.ts](../lib/services/extraction-service.ts) persist the merged tracker to `interview_sessions`. **AC:** regression test proves the tracker is written and read by the next request; phase detection persists across a multi-turn session.
- [ ] `[eng]` **Boot-time env assertions** (`CRON_SECRET`, `UPSTASH_*`, Stripe keys); verify Stripe webhook idempotency against duplicate delivery with a regression test. **AC:** replayed webhook does not double-grant entitlements or double-count MRR.
- [ ] `[eng]` **Gate `getAnalytics` behind consent** ([lib/firebase.ts:121](../lib/firebase.ts#L121)). **AC:** no analytics cookie/network call before consent.

### Sprint 3 — Positioning coherence + measurable funnel · *soft-launch ready*
**Goal:** Every surface tells the two-rounds story; you can measure real visit → activation → paid.

- [ ] `[marketing]` **Rewrite** [comparison-section.tsx](../components/comparison-section.tsx) and the 4 `app/codesparring-vs-*/page.tsx` around the moat (real-codebase bug fix, hidden-test execution, evidence timeline, AI-collaboration scoring, company-specific decomposition) instead of voice/15-patterns. **AC:** each page mentions Bug Fix + Case Lab and the evidence rubric; none concede "talk through your solution out loud" as the core.
- [ ] `[eng]` **Integrate GA4 Data API** (or server-side pageview logging) so [app/api/admin/funnel/route.ts:47](../app/api/admin/funnel/route.ts#L47) visit count is real, not `totalProfiles`. **AC:** `visitToSignup` reflects actual traffic.
- [ ] `[eng+product]` **Define + instrument the north-star activation event** ("completed first scored round"); add to admin funnel + cohort view; trigger lifecycle emails off activation state. **AC:** activation rate visible per cohort.
- [ ] `[marketing]` **Ship one polished public sample evidence-report page** (no signup) and deep-link "Try free" to auto-start the `checkout total returns NaN` Bug Fix (`app/interview/page.tsx` defaults `showScenarioBrowser=true`). **AC:** a first-timer reaches scored feedback in one click.
- [ ] `[product]` **Source all displayed prices from `PRICING_CONFIG`** and collapse the 3 duplicated budget-cap constants into one exported value. **AC:** single price string site-wide; one BUDGET cap import.
- [ ] `[marketing]` **Add `/labs` to [sitemap.ts](../app/sitemap.ts) + [robots.txt](../public/robots.txt)**; fix Mockmate→CodeSparring in `ReferralWidget` `shareNative`. **AC:** `/labs` indexed; share message says CodeSparring.

### Sprint 4 — Depth, unit economics, raise narrative
**Goal:** The differentiated catalog has real depth, gross margin is measured not asserted, and there is a B2B expansion artifact.

- [ ] `[product]` **Ship 6–10 Case Labs across 3+ companies/roles** (extend [lib/labs/case-labs/index.ts](../lib/labs/case-labs/index.ts)); track cost-per-lab as a decreasing scalability metric. **AC:** `/labs` shows ≥6 labs.
- [ ] `[eng]` **Compute cost-per-session by `scenarioType`** off `usage_events`; validate the free $0.50 cap and $25 Pro margin against real Case-Lab vs DSA cost (Case Lab burns RAG + embeddings + long chat + 1266-line feedback). **AC:** one-page unit-economics table with audited cost-per-completed-round by type.
- [ ] `[product]` **Differentiate quota by `scenarioType`** (or give flagship rounds a smaller separate allowance) so expensive rounds are economically protected; reconcile the "350+ problems" claim to one unit. **AC:** pricing page uses one unit; Case Labs counted distinctly.
- [ ] `[founder]` **Land 1–3 named design partners** (bootcamp / university career center / hiring team); convert one into a logo + quote + usage stat — the real replacement for the deleted social proof. **AC:** at least one consented logo/quote in the data room.
- [ ] `[product+eng]` **Stand up a minimal self-serve Teams/B2B SKU** (seat-based Stripe price + org entitlement) so the ACV-expansion story is backed by product, not a "Contact Sales" stub. **AC:** a team can buy ≥2 seats and see shared entitlement.

---

## 7. Metrics to instrument (before driving traffic)

- Real visit count via **GA4 Data API** → visit→signup→activation→subscribe funnel (replace profile-count proxy in `app/api/admin/funnel/route.ts`).
- **North-star activation rate:** % of new users completing their first **scored Bug Fix round**; D1/D7/D30.
- Free→paid conversion + time-to-conversion; guest(no-signup)→signup rate on the Bug Fix path.
- **Cost-per-completed-round by `scenarioType`** (DSA vs Bug Fix vs Case Lab) from `usage_events`; gross margin at $25 Pro.
- LLM/Piston/embeddings spend per guest session + guest-abuse rate (sessions per IP/fingerprint) — **the launch-day wallet tripwire**.
- 5xx rate, p95 latency, hourly cost-spike alerts (Sentry + cost-anomaly paging).
- Cron heartbeat health: `aggregate-usage` last-run + `config/cost_averages` freshness; email-notifications send volume.
- Chat-extraction durability: % of sessions where the conversation tracker persists across turns (regression metric).
- Channel attribution (UTM) → conversion, to rank SEO vs community vs referral.
- Referral viral coefficient (signups per referrer) + Pro-upgrade conversion from referred users.
- D1/D7/D30 retention cohort heatmap tied to activation state.
- Stripe webhook idempotency: duplicate-delivery rejection count (should be the only effect of retries).

---

## 8. Honesty register (delete or substantiate every item before launch)

These are the specific claims the council flagged as fabricated or contradicted. Treat as a pre-launch checklist — each is FTC §5 / GDPR / diligence exposure.

- [ ] "Used by Palantir & FAANG candidates" — `hero-section.tsx:51`
- [ ] "Used by engineers at Google, Meta, Amazon" — `PricingPageClient.tsx:159`, `app/upgrade/page.tsx:312`
- [ ] "Join 2,000+ developers" — `pricing-section.tsx:44`
- [ ] "5 mock interviews doubles your pass rate" / "retention 10–30%" — `JsonLd.tsx` L509/L524
- [ ] "45x cheaper" / "29% cheaper than LeetCode Premium" — `JsonLd.tsx` L145/L504
- [ ] "SM-2 at scientifically optimal intervals" (wrong algorithm — code uses `ts-fsrs`) — `JsonLd.tsx` L524
- [ ] "70+ tech companies" (actual ~38) — `JsonLd.tsx` L519
- [ ] Privacy policy "AI providers do NOT train / SCCs / US-only" vs enabled DeepSeek processor — `app/legal` + `lib/ai-providers.ts` ⚠️ **most legally serious — a written privacy promise, not puffery**
- [ ] Price self-contradiction $24 vs $25 — `comparison-section.tsx` vs `JsonLd.tsx`/`vs-leetcode`
- [ ] Hardcoded fake "analytics" presented as real product output — `metrics-marketing-section.tsx`
- [ ] Stale "Mockmate" brand in referral share — `ReferralWidget` `shareNative`

---

## 9. Council appendix

Full 8-lens findings, red-team critique, and synthesis JSON were produced by the `codesparring-golive-council` workflow (10 agents, ~573k tokens). Lenses: CMO/positioning · VC/investor · CPO/product · CTO/reliability · Growth/GTM · Competitive/market · Pricing/monetization · Trust/legal. The strongest cross-lens consensus: **the wedge is genuinely differentiated and the Bug Fix round is substantiated — but the site, claims, and guardrails do not yet point at the same truth, and the cost/observability holes make a public launch reckless until Sprints 1–2 land.**
