# Reconciliation — Duplicated Constants & Config (single sources of truth)

Status: **Not started.**

## Problem

The same values are copy-pasted across multiple files, and several copies **have already
drifted** — the dangerous kind of duplication. There is no central typed config; `process.env`
is read directly across the app. Changing a price, model, collection name, or URL today means
editing many files and hoping they stay in sync.

## Principle

One value, one home. Re-export from the canonical module everywhere else. Fail fast on missing
env. No behavior change except removing drift.

## Checklist

- [ ] **Central typed env** — **High** — new `lib/env.ts`
  - [ ] `process.env.X` is read in **59 files / ~110 distinct vars**; `lib/config.ts` reads zero.
        Worst: `STRIPE_SECRET_KEY` ×11, `BREVO_API_KEY` ×13, `NODE_ENV` ×17, `CRON_SECRET` ×8,
        `PINECONE_API_KEY` ×7, `NEXT_PUBLIC_FIREBASE_*` in 6 sites.
  - [ ] Create one Zod-validated `env` object, validated at boot; split server secrets vs
        `NEXT_PUBLIC_*`. Model it on `lib/rag/config.ts` (already does this for 60+ `RAG_*` vars).
  - [ ] Replace direct `process.env.*` reads with `env.*`.
- [ ] **Firestore collection-name constants** — **High** — new `lib/collections.ts`
  - [ ] `.collection("...")` = **552 call sites / 92 files**, 65 distinct names, no constant.
        `"profiles"` in 38 files, `"users"` ×43, `"interview_sessions"` ×26, `"problem_mastery"` ×24.
  - [ ] `export const COLLECTIONS = { PROFILES: "profiles", ... } as const` + `CollectionName` type;
        codemod literals. (See also `05-firestore-data-access.md`.)
- [ ] **AI budget caps** — **High** — canonical: `lib/pricing.ts`
  - [ ] `{free:0.5, pro:25, enterprise:100}` defined 3–4×: `pricing.ts:70` (`AI_BUDGET_CAPS`),
        `quota-enforcement.ts:130` (`BUDGET_LIMITS`), `usage-tracking.ts:50` (`BUDGET_CAPS`),
        `rate-limiter.ts:22` (`budgetPerCycle`). `pricing.ts` comment literally says "NEVER hardcode elsewhere".
  - [ ] Delete the copies; all import `getAIBudgetCap()` from `pricing.ts`.
- [ ] **AI provider cost table** — **High** — new `lib/ai/model-costs.ts` (or fold into pricing)
  - [ ] Per-1k-token rates defined 3×: `pricing.ts:142` (`AI_PROVIDER_COSTS`),
        `usage-tracking.ts:23` (`PROVIDER_COSTS`, byte-identical), `ai-providers.ts:67-106`
        (`costPer1kTokens`, **already divergent** — gemini 0.00015 vs 0.000188).
  - [ ] One cost map + one `calculateCost`; delete `calculateAICost` duplicate (`pricing.ts:157`).
        Also `EMBEDDING_COSTS` (`usage-tracking.ts:42`) duplicated in a comment at `rag/monitoring.ts:545`.
- [ ] **Base-URL resolution** — **High** (live bug, see `08`) — `getBaseUrl()` in `lib/env.ts`
  - [ ] `NEXT_PUBLIC_APP_URL || VERCEL_URL || ...` chain reimplemented in 7+ files with
        inconsistent defaults (`codesparring.dev` vs `mockmate.dev` vs `localhost`).
- [ ] **Stripe client factory** — **Med** — new `lib/stripe-client.ts`
  - [ ] `new Stripe(..., {apiVersion:"2025-12-15.clover"})` constructed in **9 files**
        (`stripe-helpers.ts:25`, `customer-portal:16`, `health:71`, `delete-account:18`,
        `create-checkout:19`, `debug-promo-code:15`, `admin/users:25`, `webhook/stripe:55`,
        `admin/revenue:25`). One configured singleton; one apiVersion constant.
- [ ] **Shared enum/union sources** — **Med**
  - [ ] `SubscriptionTier = "free"|"pro"|"enterprise"` (`config.ts:149`) re-spelled inline in
        **10 files** — import it instead.
  - [ ] Difficulty `easy|medium|hard` defined as a TS union (`types.ts:400`) AND separate
        `z.enum([...])` ×4 (`validations/api-schemas.ts`) → derive `z.enum` from one const tuple.
  - [ ] Scenario-type `dsa|system-design|bugfix` inline across 6 files → one const tuple.
- [ ] **Admin-identity env** — **Med** — canonical: `lib/admin/rbac.ts`
  - [ ] `ADMIN_USER_IDS`/`ADMIN_USER_ID`/`ADMIN_PROTECTED_EMAILS` (+`NEXT_PUBLIC_` variant) read
        with copy-pasted `.split(",")` in 6 files (`debug-promo-code:20`, `vectorize-problems:25`,
        `seed-vectors:9`, `admin/users:39`, `admin/users/page:62`, `rbac:101`). Reconcile singular/plural;
        expose `isAdmin()`/`isProtectedEmail()`.
- [ ] **Retry config** — **Med** — canonical: `lib/retry.ts` + `constants.RETRY_CONFIG`
  - [ ] `RETRY_CONFIG` (`constants.ts:223`) exists but `lib/retry.ts` redefines `maxRetries:3` locally;
        a second wrapper `fetchWithRetry` lives in `api-helpers.ts:49`; bespoke loops in 10+ files
        (`subscription-sync`, `ai-providers`, `email/brevo`, `rag/embeddings/*`). Make `retry.ts` the
        one primitive sourcing `RETRY_CONFIG`. (See `06` for the AI-layer retry callers.)
- [ ] **Cleanup** — **Low**
  - [ ] `lib/types.ts` (file) and `lib/types/` (dir) coexist (`@/lib/types` in 22 files,
        `@/lib/types/*` in 74); notification types live in both. Collapse `types.ts` into `types/` + barrel.
  - [ ] Feature flags: `getFlag` has 1 consumer (`chat/route.ts`); 6 of 8 flags dead — route the
        ad-hoc `process.env...=== "true"` toggles through it, or prune.
  - [ ] Rename `lib/validators/` → `lib/test-validation/` (it's code-exec test validation, not Zod) to
        stop the `validations/` vs `validators/` confusion.

## Verification

`pnpm typecheck` + `pnpm test` green after each extraction. Grep proves zero remaining duplicate
definitions (e.g. only one `AI_BUDGET_CAPS`). `/security-review` on the env + admin-identity changes.
