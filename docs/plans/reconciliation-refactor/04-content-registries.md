# Reconciliation — Content Registries (add/remove/update content easily)

Status: **Not started.**

## Problem

This is the core "make it easy to add/remove/update" goal. **Adding one DSA problem today touches
3–6 files** across parallel catalogs that must be hand-synced, with the same `id` repeated in 6+
registries and nothing validating they agree. There is **no auto-discovery anywhere** — every
catalog is a hand-maintained "import + push" barrel array.

## Principle

Drop-a-file to add content. One canonical id; build-time validation that every cross-reference
resolves. Replace manual barrels with auto-discovery. Behavior-preserving (same scenarios load).

## Checklist

- [ ] **Scenario auto-discovery loader** — **High** — `lib/scenarios/`
  - [ ] No `import.meta.glob`/`readdir`/`require.context` anywhere; ~19 hand-maintained barrels, e.g.
        `scenarios/dsa/trees/index.ts:32` (25 entries), `arrays-hashing/index.ts:23`,
        `rag/knowledge-base/complexity-knowledge/index.ts:56` (49 imports + 49 pushes),
        `company-knowledge/index.ts:34` (29 + 29).
  - [ ] Replace per-folder barrels with one glob-based loader so adding a scenario = drop a file.
- [ ] **Single canonical id + cross-registry validation** — **High** (fixes a live bug, see `08`)
  - [ ] To add one problem end-to-end a dev edits: (1) scenario file, (2) pattern `index.ts`,
        (3) `complexity-knowledge/problems/<id>.ts`, (4) that folder's `index.ts`, (5) `leetcode-mapping.ts`,
        (6) company `mustKnowQuestions` — **3 min, 5–6 typical**. Same id lives as scenario `id`,
        `problemId`, `scenarioId` (leetcode-mapping), and company `scenarioId`.
  - [ ] **Bug:** `faang.ts:34,378,831` uses `"two-sum"` while every other company file uses
        `"dsa-two-sum"` (`gaming-entertainment.ts:35`, `emerging-tech.ts:31`, `enterprise-devtools.ts:34`,
        `social-consumer.ts:645`) → orphaned references. Canonical id is `dsa-two-sum`.
  - [ ] Add a test asserting every `scenarioId`/`problemId`/`mustKnowQuestions.scenarioId` resolves to a
        real scenario; normalize company ids to the `dsa-` prefix.
- [ ] **Delete dead loader + collapse shims** — **Med** — `lib/`
  - [ ] `lib/scenario-loader.ts` (8 KB, hand-lists every dynamic import path) has **0 importers** — dead,
        yet must be kept in sync with `scenarios.ts`. Delete it.
  - [ ] Three loaders overlap: `scenarios.ts` (real entry, 44 importers, 17 static spreads `:61-90`),
        `scenarios/index.ts` (second module w/ `ScenarioMeta` registry), and the dead loader. Converge on one.
  - [ ] `scenarios-realworld.ts` and `scenarios-add-functionality.ts` are 1–2 line re-export shims — fold in.
- [ ] **One company registry** — **Med** — `lib/`
  - [ ] Company identity fragmented across mismatched sets: `Company` union = **57**
        (`scenarios/types.ts:17`), `CompanyId` union = **43** (`company-questions/types.ts:7`),
        `company-knowledge/companies/` = **29 files**, question data = **7 groups** — they don't agree, so
        coverage gaps are invisible.
  - [ ] Difficulty tiers are hardcoded id-arrays in functions (`getCompaniesByDifficulty`,
        `company-questions/index.ts:105`; `getPatternsByDifficulty`, `dsa-knowledge/index.ts:67`) instead
        of data fields.
  - [ ] Derive `Company`/`CompanyId` from one canonical registry; make difficulty a data field; add a test
        that every `CompanyId` has matching knowledge + question data.

## Verification

Snapshot the full scenario/company list before and after — counts and ids must be identical (pure
refactor). New validation test passes (proves no orphaned ids, incl. the `two-sum` fix). `pnpm test`
+ `pnpm typecheck` green.
