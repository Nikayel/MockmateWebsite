# Codebase Reconciliation / Refactor

Status: **Not started.** Planning docs only — no code changed yet.

## What this is

A codebase-wide audit for **reusability / centralization** ("reconciliation"): places
where the same logic, constants, or shapes are duplicated across files and should be pulled
into a single source of truth so they are easier to **add / remove / update / maintain**.

Each focused doc below is a self-contained sprint task: the problem, concrete evidence
(`file:line` + counts), the centralization to apply, the files to touch, and verification.

Method note: produced by sweeping `app/`, `lib/`, and `components/` with grep/read across the
whole repo (1,289 files). The `graphify` CLI is not installed in this environment, so the
`graphify-out/GRAPH_REPORT.md` God-Nodes/community map was used for orientation instead.

## Guiding principle

Pure, behavior-preserving refactors landed in small, individually reviewable slices.
Match existing patterns; do not invent abstractions where two lines merely look alike
(see `CLAUDE.md` DRY rules). Prefer adopting helpers that **already exist but are unused**
over writing new ones.

## Docs

| # | Doc | Theme | Impact | Effort |
|---|-----|-------|--------|--------|
| 00 | [`08-critical-bugs.md`](./08-critical-bugs.md) | **Live bugs** found during the audit (do first) | High | S |
| 01 | [`01-duplicated-constants-and-config.md`](./01-duplicated-constants-and-config.md) | Single sources of truth: env, collections, caps, costs, URLs, Stripe client, tier unions | High | M |
| 02 | [`02-entitlements-and-billing.md`](./02-entitlements-and-billing.md) | `lib/entitlements.ts` + `useEntitlements()` — tier/quota logic | High | M |
| 03 | [`03-api-route-plumbing.md`](./03-api-route-plumbing.md) | One `withRoute()` wrapper: auth, validation, response, try/catch, CSRF, rate-limit | High | M |
| 04 | [`04-content-registries.md`](./04-content-registries.md) | Scenario/company auto-discovery — the "add content easily" goal | High | M |
| 05 | [`05-firestore-data-access.md`](./05-firestore-data-access.md) | Converters, profile-read dedup, import alias, break import cycle | High | M/L |
| 06 | [`06-ai-llm-layer.md`](./06-ai-llm-layer.md) | JSON extractor, model registry, cache consolidation, prompt templates | Med | M |
| 07 | [`07-frontend-reusability.md`](./07-frontend-reusability.md) | `useApiResource`, design tokens, `lib/format`, shared states | Med | M |

## Suggested sequencing

1. **`08-critical-bugs.md`** — small, surgical, fixes real user-facing/billing drift.
2. **`01` (constants pass)** — one PR; many Tier-1 items share the same new files
   (`lib/env.ts`, `lib/collections.ts`) and removing duplicated constants also fixes drift.
3. **`02` (entitlements)** — depends on `01` (tier union, budget caps); fixes enterprise-as-free.
4. **`03` (route wrapper)** — biggest line-count reduction; reuses helpers `01`/`02` centralize.
5. **`04` (content registries)** — independent; highest leverage for adding problems/companies.
6. **`05`, `06`, `07`** — parallelizable cleanups once the foundations land.

## Already well-centralized — leave alone

`generateAIResponse` (single AI entry point w/ fallback+cache+retry) · `lib/token-counter.ts` ·
Pinecone/embedding singletons · `lib/promo-codes.ts` · `lib/email/brevo.ts` + `templates.ts`
sender layer · `lib/feature-flags.ts` registry · `lib/pricing.ts` price/MRR display ·
`components/ui/` primitives. Note `lib/validations/` vs `lib/validators/` are **not** duplicates
(Zod request schemas vs code-execution test validation) — only confusingly named.
