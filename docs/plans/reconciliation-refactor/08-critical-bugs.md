# Reconciliation — Critical Bugs surfaced by the audit

Status: **Not started.** Do these first — small, surgical, user-facing/billing impact.

## Problem

The duplication audit surfaced concrete bugs (not just style issues) caused by copies drifting
apart. Each is fixed permanently by the corresponding centralization doc, but the fixes themselves
are tiny and worth landing immediately with regression tests.

## Checklist

- [ ] **Enterprise users treated as Free** — **High**
  - [ ] `isPro` computed as `tier === "pro"` (ignoring `enterprise`) in `dashboard/page.tsx:274`,
        `account/page.tsx:602`, `home/AuthenticatedDashboard.tsx:67` → enterprise renders as Free.
  - [ ] Session-limit ternary caps enterprise at the free limit in **4 of 5 paths**
        (`firestore-helpers.ts:341,397`, `stripe-helpers.ts:55`, `webhook/stripe:87`; only
        `quota-enforcement.ts:281` handles it).
  - [ ] Fix via `isProTier`/`getSessionLimit` from `lib/entitlements.ts` (`02`). Add tests covering enterprise.
- [ ] **Wrong domain in emails / referral links** — **High**
  - [ ] `email/notifications.ts:57` and `referral/route.ts:28` default base URL to `https://mockmate.dev`,
        but the product is CodeSparring (`config.ts:135`); other files use `https://codesparring.dev`
        (`layout.tsx:53`, `sitemap.ts:5`, `email/templates.ts:26,31`). Emails/referrals can point to the wrong
        domain.
  - [ ] Fix via one `getBaseUrl()` with a single correct default (`01`).
- [ ] **Orphaned scenario id (`two-sum` vs `dsa-two-sum`)** — **Med**
  - [ ] `faang.ts:34,378,831` references `"two-sum"`; the canonical id everywhere else is `"dsa-two-sum"` →
        broken cross-registry links for the FAANG group.
  - [ ] Normalize to `dsa-two-sum`; add the cross-registry validation test (`04`).
- [ ] **AI cost/budget values already drifted** — **Med**
  - [ ] The 3–4 copies of the cost table / budget caps disagree (e.g. gemini `0.00015` in
        `ai-providers.ts:67` vs `0.000188` in `pricing.ts`/`usage-tracking.ts`), so per-call cost stored in
        usage events can disagree with admin cost reporting.
  - [ ] Collapse to one source (`01`); after, audit a sample of stored `usage_events` costs.
- [ ] **Inconsistent admin auth status codes** — **Low**
  - [ ] Same "not admin" case returns 401 in some routes and 403 in others (e.g. `rag-health:34`). Standardize
        when migrating to `withAdminAuth` (`03`).
- [ ] **Uneven CSRF / rate-limit coverage** — **Low**
  - [ ] CSRF applied on some mutating routes but missing on others (notifications, nps, roadmap POST); fixed by
        folding CSRF into `withRoute` (`03`).

## Verification

Targeted regression tests for the enterprise tier checks and the base-URL resolver; cross-registry id
validation test for `dsa-two-sum`. `pnpm test` green. `/security-review` on the entitlement + admin-auth fixes.
