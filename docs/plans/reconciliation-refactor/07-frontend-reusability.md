# Reconciliation — Frontend Reusability

Status: **Not started.**

## Problem

Components reimplement data-fetching + loading/error state by hand, the design-token module is dead
while hundreds of raw color literals bypass it, formatters are redefined per file, and there are no
shared loading/empty/error/auth-gate primitives. The good shared patterns that exist stop at the
`admin/` boundary and were never promoted app-wide.

## Principle

Promote the existing admin primitives up to `components/ui/` + `lib/hooks` + `lib/format`. Reuse
`components/ui/` (don't re-create `skeleton`/`dialog`/`card`/`button`/`badge`). Behavior-preserving.

## Checklist

- [ ] **`useApiResource()` data-fetching hook** — **High** — `lib/hooks/`
  - [ ] **264 raw `fetch()` across 89 files**; **367 manual loading/error state decls across 63 files**;
        no `useFetch`/SWR/React Query anywhere. `admin/users/page.tsx:45` declares 14 `useState`. The one
        helper `loadAdminData` (`admin/api-client.ts:125`) has **0 callers**.
  - [ ] Add `useApiResource<T>(url, opts)` → `{data, loading, error, refetch}` wrapping fetch + auth header
        + JSON parse + error normalization (or adopt SWR/React Query for dedupe/caching). Migrate
        dashboard/practice/roadmap/admin pages.
- [ ] **Make design tokens real (or delete them)** — **High** — `lib/design-tokens.ts`
  - [ ] `design-tokens.ts` (`colors`/`spacing`/`typography`…) has **0 importers**, while raw
        `bg-gray-*`/`text-gray-*`/hex literals appear **836× across 91 files** (worst:
        `admin/research/UserAlgorithmBreakdown.tsx` 36, `interview/ProblemPanel.tsx` 33,
        `dashboard/MetricsOverview.tsx` 32, `hero-section.tsx` 25).
  - [ ] Pick one source of truth: push the palette into `tailwind.config` semantic tokens
        (`bg-surface`/`border-subtle`/`text-muted`) or wire `design-tokens.ts` into the theme; then codemod the
        repeated admin `gray-900/50 + gray-800` cluster to a shared class/`cva` variant.
- [ ] **`lib/format.ts`** — **Med**
  - [ ] No shared formatters; **477 inline `toFixed`/`toLocaleDateString`/`Intl` across 125 files**.
        `formatDate` redefined in `subscription-status-banner.tsx:57` + `admin/api-client.ts:228`; `formatTime`
        in `notification-bell.tsx:78`, `practice/ScoreDisplay.tsx:72`, `interview/_utils/time.ts:1`;
        `formatPercent`/`formatCurrency`/`formatNumber` admin-siloed in `admin/api-client.ts:207-236`.
  - [ ] One `lib/format.ts` (`formatDate`/`formatDateTime`/`formatRelativeTime`/`formatDuration`/`formatPercent`
        /`formatCurrency`/`formatScore`); re-export the admin ones from it.
- [ ] **Shared loading / empty / error / auth-gate primitives** — **Med** — `components/ui/`
  - [ ] 92 spinner/skeleton sites in `app/`, 34 in `components/`; admin has a rich `Skeleton` kit
        (`components/admin/shared/Skeleton.tsx`) but it's admin-scoped while dashboard/practice/interview
        reimplement `animate-spin`/`Loader2` inline. No `EmptyState`; auth-gating copy ("Sign in to…")
        scattered across 50+ files.
  - [ ] Promote skeleton variants to `components/ui/`; add `EmptyState`/`ErrorState`/`AuthGate`; pair with
        `useApiResource` via an `<AsyncBoundary>`.
- [ ] **Merge duplicate CodeViewer + shared language map** — **Med**
  - [ ] `CodeViewerDialog.tsx` and `CodeViewerSidePanel.tsx` take the same props and each define an identical
        `getLanguageFromFileName`+`languageMap` (`Dialog:21-40`, `SidePanel:17-40`). Extract
        `lib/editor/getMonacoLanguage.ts` + one `CodeViewer` body; the two become thin container wrappers.
- [ ] **De-dup score→grade→color (business rule)** — **Med** — `lib/scoring`
  - [ ] A+/A/A- grade+color ladder is **byte-identical** in `PracticeFeedback.tsx:201` and
        `practice/ScoreDisplay.tsx:59`; a 1–10 variant in `SessionFeedbackCard.tsx:263`. Move to
        `getScoreGrade(score)`/`getScoreColor(score, scale)` in `lib/scoring` (CLAUDE.md: don't duplicate
        scoring logic). Then dedupe the overlapping feedback components against a shared `FeedbackCard`.
- [ ] **Cleanup** — **Low**
  - [ ] Two hooks dirs: root `hooks/` has 1 file (`useMultiTabConflict.ts`), `lib/hooks/` has ~22 + a barrel.
        Move it into `lib/hooks/`, export from the barrel, delete root `hooks/`; pick one filename convention
        (`useXxx.ts`).
  - [ ] `lib/notify.ts` toast wrapper — 167 raw `toast.*` calls across 28 files
        (`interview/page.tsx` 49, `account/page.tsx` 17) re-format API errors at each site; add
        `notifyError(err)`/`notifySuccess(msg)` that normalize.

## Verification

`pnpm typecheck` + `pnpm test` + Playwright (`e2e/`) green. Visual spot-check of migrated pages (no UX
change). Grep proves the duplicate `getLanguageFromFileName`/score-grade functions are gone.
