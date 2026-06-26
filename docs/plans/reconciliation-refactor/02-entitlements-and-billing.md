# Reconciliation — Entitlements & Billing logic

Status: **Not started.**

## Problem

"Is this user pro?", "what's their session limit?", "is the subscription active?", "what's the
budget cap?" are re-derived at dozens of call sites instead of living in one entitlements service.
The duplication has produced **real bugs**: enterprise users are treated as free in several paths
(see `08-critical-bugs.md`), and `updateQuotaForSubscriptionTierAdmin` exists as two copies that
have already diverged.

## Principle

One `lib/entitlements.ts` owns every tier/quota/subscription rule; the server and a
`useEntitlements()` client hook are its only consumers. Behavior-preserving except where it fixes
the documented enterprise bug (call that out in the PR + add tests).

## Checklist

- [ ] **Create `lib/entitlements.ts`** — **High** — pure functions, no Firebase import where avoidable
  - [ ] `getUserTier(profile): SubscriptionTier` — owns field name + default + cast (today
        `profile?.subscription_tier || "free"` is re-cast in **~15 files**: `firestore-helpers.ts:89,435,468,1098`,
        `usage-tracking.ts:224,550`, `quota-enforcement.ts:267,373,649`, `announcements/route.ts:43`,
        `roadmap/route.ts:226`, `nps/route.ts:92`, several `admin/*` routes…).
  - [ ] `isProTier(tier)` predicate — single definition of "pro OR enterprise".
  - [ ] `getSessionLimit(tier): number` — replaces the inlined ternary in **5 places**
        (`firestore-helpers.ts:341,397`, `stripe-helpers.ts:55`, `webhook/stripe:87`,
        `quota-enforcement.ts:281`). **4 of 5 cap enterprise at the free limit — bug.**
  - [ ] `getAIBudgetCap(tier)` — re-export from `pricing.ts` (see `01`).
  - [ ] `isInactiveStatus(status)` / `isActiveSubscription(profile)` — reuse the existing
        `INACTIVE_SUBSCRIPTION_STATUSES` Set (`quota-enforcement.ts:98`); the active/inactive predicate
        is currently re-expressed independently in `create-checkout:100`, `subscription-status-banner.tsx:89`.
  - [ ] `tierSatisfies(tier, required)` — replaces inlined rank map `{free:0,pro:1,enterprise:2}`
        (`quota-enforcement.ts:653`).
- [ ] **De-duplicate `updateQuotaForSubscriptionTierAdmin`** — **High**
  - [ ] Full function copy-pasted in `stripe-helpers.ts:36` and `webhook/stripe:67`; the webhook copy
        has drifted (added `resetUsage` / downgrade-cap logic the other lacks).
  - [ ] Extract one `updateQuotaForTier(userId, tier, {resetUsage, profileData})`; both call it.
  - [ ] Move shared billing-period math into `lib/billing-period.ts` (also breaks the import cycle —
        see `05-firestore-data-access.md`).
- [ ] **Add `useEntitlements()` client hook** — **High** — `lib/hooks/`
  - [ ] `isPro`/`setIsPro` reimplemented **40+ times**; each component fetches
        `/api/user/subscription-status` and recomputes the tier check, with **inconsistent enterprise
        handling**: `dashboard/page.tsx:274`, `account/page.tsx:602`, `AuthenticatedDashboard.tsx:67`
        use `=== "pro"` only → enterprise renders as Free; `interview-prep/*` include enterprise.
  - [ ] Hook wraps the fetch + shared `isProTier`; returns `{tier, isPro, isLoading}`. Migrate the
        call sites (`CompanyHeroCTA.tsx:45`, `CompanyPrepContent.tsx:51`, `RoadmapPageParts.tsx:396`,
        `practice/page.tsx:266`, `upgrade/page.tsx:40`, the three buggy ones above…).
- [ ] **Tie Stripe price IDs to the plan catalog** — **Med**
  - [ ] `create-checkout:28-50` builds `STRIPE_PRICE_ID_*` env keys inline, disconnected from
        `PRICING_CONFIG` (`config.ts:6-132`, which has no `stripePriceId` field). Add the id to the plan
        catalog so one place owns price + display + sessions + Stripe id.

## Verification

New unit tests for `getSessionLimit`/`isProTier`/`isActiveSubscription` covering **enterprise**
explicitly (regression for the bug). `pnpm test` + `pnpm typecheck` green. `/security-review` on the
entitlement + quota changes (paid users can silently desync — handle carefully).
