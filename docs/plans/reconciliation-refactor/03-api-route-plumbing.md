# Reconciliation — API Route Plumbing (`withRoute()` wrapper)

Status: **Not started.**

## Problem

Across **93 `route.ts` files**, auth/validation/error/response/rate-limit/CSRF boilerplate is
copy-pasted. The kicker: **the helpers mostly already exist but adoption stalled** — there is even
a `withAuth` wrapper with **zero adopters** and 16 shared Zod schemas only 3 routes import. So this
is largely a migration, not net-new abstraction.

## Principle

One composable `withRoute({auth?, adminPermission?, bodySchema?, rateLimit?, csrf?}, handler)` that
internally reuses the **existing** `verifyAuth`, `verifyAdminAccess`, `validateRequest`,
`csrfProtection`, and rate-limit functions and emits one canonical response shape. Migrate routes
in small, reviewable batches; behavior-preserving.

## Checklist

- [ ] **Consolidate auth verification to one module** — **High** — canonical: `lib/auth-server.ts`
  - [ ] Forked 4 ways: `auth-helpers.ts:22` (`verifyAuth`, ~22 routes), `auth-server.ts:18`
        (`getUserIdFromRequest`, 8 routes), a **third private copy** at `quota-enforcement.ts:139`,
        a **fourth** at `guest-session/migrate:28`; plus **17 routes inline `verifyIdToken`** bypassing
        all of them (`user/mastered-problems:15`, `user/metrics:264`, `email/welcome:96`,
        `delete-account:53`, `rate-limit-feedback:40,149,225`, `session/metrics:36`, `user/usage:23`,
        `usage/voice:23` …). Variants differ in header casing + token parse + return shape.
  - [ ] Collapse to one module; delete the private/local copies; migrate the 17 inline calls.
- [ ] **Adopt the dead auth wrapper / kill the 37 guard blocks** — **High**
  - [ ] `withAuth`/`withOptionalAuth` (`auth-helpers.ts:115`) have **0 adopters**. The
        `if (!authenticated) return 401` guard is hand-copied **37× across 26 files** (e.g.
        `spaced-repetition/due:26`, `recommendations:24`, `stats:19,65`, `settings:27,64`, `complete:78`,
        `notifications:34,90`, `roadmap:52,218,373`).
- [ ] **Migrate 6 admin-auth holdouts** — **High** — canonical: `lib/admin/middleware.ts`
  - [ ] `withAdminAuth`/`withPermission` exist (27 routes use them) but `admin/feature-flags`,
        `admin/feedback`, `admin/audit`, `admin/health`, `admin/announcements`, and public
        `announcements/route.ts` hand-roll the token+role check, repeated **per HTTP method**
        (feature-flags calls `getAdminRole` 4×). Also fixes inconsistent 401-vs-403 codes.
- [ ] **Wire the orphaned Zod schemas** — **High** — `lib/validations/api-schemas.ts`
  - [ ] File defines **16 schemas + `validateRequest()` + `validationErrorResponse()`** but only
        **3 route files import it**. `PromoCodeSchema`, `CreateCheckoutSchema`,
        `SpacedRepetitionCompleteSchema`, `NotificationPreferencesSchema`, etc. are defined-but-orphaned
        while their routes parse manually. Add a `parseBody(request, schema)` helper folding
        `json()`+validate+400.
- [ ] **One response envelope** — **Med** — new `lib/api-response.ts`
  - [ ] 3 shapes coexist (`{success,...}` admin vs `{error}` vs `{data}`); `unauthorizedResponse`
        defined twice with different signatures (`admin/middleware.ts:104` vs `auth-helpers.ts:76`);
        88 files call `NextResponse.json` raw. Promote one set (admin's is most complete) and standardize.
- [ ] **`withRoute()` try/catch** — **Med**
  - [ ] `try { } catch { logger.error; 500 }` in **87 handlers** (some still use raw `console.error`).
        Wrapper runs the handler, logs via `logger`, returns a standard 500.
- [ ] **Extract cron auth** — **Med** — new `verifyCronRequest(request)`
  - [ ] Identical timing-safe `Bearer ${CRON_SECRET}` check copied in 4 files
        (`cron/aggregate-usage:16`, `cron/email-notifications:89`, `cron/subscription-expiry:129`,
        `admin/cleanup-orphans:43`). Security-sensitive copy-paste.
- [ ] **CSRF into the wrapper** — **Low/Med**
  - [ ] `csrfProtection` (`csrf.ts:87`) called via copy-pasted 2-liner in 6 routes, and **missing** on
        other mutating routes (notifications, nps, roadmap POST). Auto-enforce on POST/PUT/PATCH/DELETE.
- [ ] **Share the rate-limit backend** — **Med** — see also `01`
  - [ ] Two modules — `rate-limit.ts` (IP, 578 LOC) and `rate-limiter.ts` (user-tier, 686 LOC) — each
        reimplement Upstash + Firestore + in-memory stores, duplicate `RateLimitResult`, duplicate the
        429 builder, duplicate the 5-min cleanup interval. Extract one `RateLimitStore` interface +
        implementations; keep the two policy layers as thin consumers. Add a `withRateLimit(limiter)`
        guard to kill the ~18 copy-pasted `if (rl) return rl` blocks.

## Verification

Migrate in batches; `pnpm typecheck` + `pnpm test` + existing route tests green after each. Spot-check
that every migrated route returns the canonical envelope. `/security-review` on the auth/admin/CSRF/cron
consolidation (security-critical surface).
