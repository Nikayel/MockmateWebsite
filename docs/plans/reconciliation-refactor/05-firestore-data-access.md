# Reconciliation — Firestore Data Access

Status: **Not started.**

## Problem

Document shapes are hand-cast at every call site (no converters), the same profile read is
re-implemented in dozens of places instead of using the existing helper, `adminDb` is imported via
inconsistent paths, and `firestore-helpers.ts` ⇄ `stripe-helpers.ts` form an import cycle papered
over with a dynamic `import()`.

## Principle

Treat document shapes as contracts in one place (per `CLAUDE.md`). Centralize (de)serialization and
reads; break the cycle by extracting dependency-free billing math. Behavior-preserving.

## Checklist

- [ ] **`COLLECTIONS` constant map** — **High** — new `lib/collections.ts` (shared with `01`)
  - [ ] `.collection("...")` = **552 sites / 92 files**, 65 distinct names, no constant. Catches typos
        at compile time. (Detailed in `01-duplicated-constants-and-config.md`.)
- [ ] **Firestore converters / typed read-write helpers** — **High** — `lib/firestore-helpers.ts`
  - [ ] **Zero** `withConverter`/`FirestoreDataConverter` in the codebase — every doc hand-cast.
        Timestamp mapping copy-pasted: `FieldValue.increment` ×72, `serverTimestamp` ×56,
        `Timestamp.fromDate` ×27, `.toDate()` ×46 across 19 files.
  - [ ] Add per-collection converters (or small typed `readDoc<T>`/`writeDoc<T>` helpers) centralizing
        timestamp serialization + the document-shape contract.
- [ ] **Funnel profile reads through `getUserProfile`** — **High**
  - [ ] `getUserProfile` (`firestore-helpers.ts:172`) exists but **only 3 files use it** while **28 files**
        do raw `collection("profiles").doc(userId).get()`. Route them through the helper (pairs with
        `getUserTier` in `02-entitlements-and-billing.md`).
- [ ] **Enforce one `adminDb` import path** — **Med**
  - [ ] `adminDb` imported via **10 distinct specifiers** (`@/lib/firebase-admin` ×50 plus relative +
        quote variants). Standardize on `@/lib/firebase-admin`; add a lint rule.
- [ ] **Break the `firestore-helpers` ⇄ `stripe-helpers` import cycle** — **Med** — new `lib/billing-period.ts`
  - [ ] `stripe-helpers.ts:14` statically imports `calculateBillingPeriod` from `firestore-helpers`;
        `firestore-helpers.ts:193` dynamically `import()`s `stripe-helpers` to dodge the cycle. Root cause:
        `firestore-helpers.ts` is **1,432 LOC** mixing profiles/sessions/guest/quota/billing.
  - [ ] Extract billing-period + tier→quota math into a dependency-free `lib/billing-period.ts` both import;
        make the dynamic import static. Then split `firestore-helpers.ts` by domain
        (profiles / sessions / guest-sessions / quota).

## Verification

`pnpm typecheck` + `pnpm test` green. Confirm the dynamic `import()` is gone and there is no remaining
cycle (e.g. `madge --circular` or equivalent). Spot-check a few converted reads/writes round-trip
timestamps correctly.
