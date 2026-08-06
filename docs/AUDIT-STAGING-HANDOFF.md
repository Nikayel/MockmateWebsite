# Platform Audit — Staging & Finish Handoff

**For:** the next agent taking over the tail of the 2026-07-12 platform audit.
**Source of truth:** `docs/PLATFORM-AUDIT-FIX-PLAN.md` (checkboxes + Progress Log).

## STATUS UPDATE (2026-07-12, updated 2026-07-28) — all 5 items closed or resolved

- **Item 1 (Stripe webhook replay): DONE.** 8/8 asserted checks pass against the real
  route + Firestore emulator (signed events via Stripe's `generateTestHeaderString`;
  the CLI's cached keys expired 2026-03-13 so `stripe listen/trigger/resend` needs an
  interactive `stripe login` — the signed harness covers the same paths with
  programmatic assertions). EDGE-WEBHOOK / DUP-3 / PERF-S10 flipped to STAGED in the
  plan doc; full details in its Progress Log.
- **Item 2 (composite index): DONE.** `profile_quota (user_id ASC, period_start DESC)`
  deployed (`firebase deploy --only firestore:indexes`, no --force) and confirmed live
  via `firebase firestore:indexes`.
- **Item 3 (API-1 Deepgram): RESOLVED 2026-07-28.** The owner created a Member-role
  (keys:write-capable) key; the mint smoke test now PASSES end-to-end (project
  resolves, ephemeral usage:write key minted, differs from the account key, cleanup
  delete succeeds). The fail-closed 503 (shipped 2026-07-19) stays as the safety net.
  Remaining prod-env step: set the key as server-side `DEEPGRAM_API_KEY` in Vercel,
  delete stale `NEXT_PUBLIC_DEEPGRAM_API_KEY`, redeploy, verify a voice interview.
- **Item 4 (PERF-C12 part A): KEEP-DEFERRED, now evidence-backed.** features-section
  uses a domMax-only `layoutId`; shared `lib/motion.tsx` fans a strict-m contract onto
  login/careers/why-codesparring/pricing (inert `m.*` = invisible copy). Safe
  sequencing recorded in the plan doc's Progress Log.
- **Item 5 (DEAD-2): left blocked** on NOTIF-WELCOME-1, as instructed.

## Current state (already done — do NOT redo)

The full audit plan is **shipped to `main` and pushed to origin** (~70 commits,
`ae532f85..7a763e3e`). Gate is green on the pushed HEAD:

- `pnpm typecheck` — clean
- `pnpm test` — **979 passed / 44 todo** (127 files)
- `pnpm build` — compiles

Plan status: **68 findings done `[x]`, 2 partial `[~]`, 1 blocked `[ ]`.**
Regression tests were added throughout (score weights, quota, anniversary dates,
streak, chat schema, guest-session, EDGE-16, etc.).

## Your job: close the 5 remaining items below. Nothing else is outstanding.

Everything is code-complete; these are verification / finish steps. Work on
`main` (repo already on it). After any code change, run the full gate
(`pnpm typecheck && pnpm test && pnpm build`) before committing.

---

### 1. Stripe webhook replay — validate EDGE-WEBHOOK, DUP-3, EDGE-13, EDGE-17, PERF-S10 (NEEDS-STAGING)

These billing fixes are unit-tested but never emulator-replayed. Route:
`app/api/webhook/stripe/route.ts`; canonical quota writer:
`lib/stripe-helpers.ts` (`updateQuotaForSubscriptionTierAdmin`).

```bash
# Terminal A: run the app against the Firebase emulator (test-mode Stripe keys).
# Terminal B:
stripe login
stripe listen --forward-to localhost:3000/api/webhook/stripe
#   -> copy the printed whsec_...; set STRIPE_WEBHOOK_SECRET_LOCAL to it (dev only)
# Terminal C:
stripe trigger checkout.session.completed
stripe trigger invoice.paid
stripe events resend <the invoice.paid evt_id>   # RETRY — the key test
```

**Verify in the Firestore emulator:**
- `payment_history`: the retried `checkout.session.completed` / `invoice.paid`
  produced **no duplicate row** (EDGE-13: subscription-mode row is keyed on
  `${session.id}_${status}`; monthly invoices stay distinct on invoice id).
- `profile_quota`: the **retried** `invoice.paid` did **NOT** re-zero
  `sessions_used` mid-period (DUP-3 idempotency via `last_reset_period_start`).
- `webhook_failures`: empty on success. To exercise the dead-letter paths,
  force a handler to throw (EDGE-WEBHOOK) and confirm a row is written and the
  handler still returns 200. For EDGE-17, drive a real checkout with **no
  `metadata.userId`** and confirm a `checkout.session.completed:no-user` row.
- PERF-S10: handler stays well under a couple seconds; only one quota-doc mutation.

If any check fails, the fix is localized to that finding's spec in the plan doc.

### 2. Firestore composite index for PERF-S10

PERF-S10 bounded the quota query with `.orderBy("period_start","desc").limit(12)`
(in `lib/stripe-helpers.ts`). It needs a `profile_quota` composite index on
`(user_id ASC, period_start DESC)` — the same shape `getUserQuota` already uses,
so it's very likely already deployed.

```bash
grep -A10 profile_quota firestore.indexes.json   # confirm (user_id, period_start desc) exists
firebase deploy --only firestore:indexes         # deploy if missing/undeployed
```
If the query throws `FAILED_PRECONDITION` at runtime, the index isn't deployed.

### 3. API-1 — Deepgram credential (CLOSED 2026-08-06)

**UPDATE 2026-08-06: the `keys:write` dependency is gone.** `/api/voice/token` no longer
mints an API key through the Management API. It grants a short-lived JWT via
`POST /v1/auth/grant` (`lib/voice/deepgram-auth.ts`), which needs only **Member**
permission on `DEEPGRAM_API_KEY` — no `keys:write` scope, no `DEEPGRAM_PROJECT_ID`, and
no key objects left behind in the project. Verified against the live API: 200, a valid
JWT, `expires_in` 300.

The route stays **fail-closed**: 503 when the grant fails, never the account key.
`app/api/voice/token/route.test.ts` locks that contract.

**Remaining (account-owner action):** set `DEEPGRAM_API_KEY` in Vercel Production and
redeploy. This is an env-var mirror only; the scope requirement no longer applies.

Also: `NEXT_PUBLIC_DEEPGRAM_API_KEY` exists in env but is referenced **nowhere** in
the codebase — delete it from Vercel + local env files (stale, and `NEXT_PUBLIC_`
vars ship to the client bundle).

### 4. PERF-C12 part A (optional, partial `[~]`)

Part B (dynamic `BugfixOnboardingTour`) is done. Part A — wrap the landing
sections in `<LazyMotion features={domAnimation} strict>` and switch their
`motion.*` to `m.*` (~15-20KB gz win) — was deferred as risky under strict mode.
Files: `components/{hero-section,problem-teaser,features-section,comparison-section,metrics-marketing-section,ai-assisted-section,company-roadmap-section}.tsx`,
`components/providers/LenisProvider.tsx`, `components/ui/magnetic-button.tsx`.
With `strict`, EVERY `motion.*` under the scope must become `m.*` or it throws at
runtime — convert carefully and `pnpm build` + visually check both themes.

### 5. DEAD-2 — leave blocked

`lib/notification-helpers.ts` deletion is **correctly blocked** on
NOTIF-WELCOME-1 (tracked in `PRE-LAUNCH-FIXES.md`). Do it only after that ships.

---

## Deploy

Deploy however this project normally does (Vercel). Before prod, make sure the
Deepgram env (item 3) is set and the Firestore index (item 2) is deployed.

## Repo conventions (must follow)

- **Commit signing hangs on this volume.** Commit with:
  `git -c commit.gpgsign=false -c gc.auto=0 commit --no-verify -F <msgfile>`
  (run `pnpm typecheck` manually first). Commit **as the user, no AI co-author.**
- A concurrent process sometimes commits to `main` — run `git log --oneline -3`
  + `git status` before staging, stage only your files, commit right after.
- **Ignore the `graphify` hook nags** — graphify is disconnected in this repo.
- Standard commands: `pnpm dev | lint | typecheck | test | build`.
- Do not re-run the whole audit; only the 5 items above remain.
