# Admin Dashboard Audit, 2026-08-07

A ten-agent audit of `/admin` (23 pages, 31 API route modules, 52 handlers) covering
navigation, every page section, the API layer, the wiring census, and the design system.
This file is the ledger. Every finding carries an ID so a later pass can confirm nothing
was quietly dropped.

Status values, filled in by the closing verification pass of 2026-08-08 (238 commits after
the ledger was written, `fec28bc8..HEAD`):

- `FIXED` — verified in the current tree, with the file:line or commit that closes it.
- `NOT-REAL` — the original finding was wrong on inspection.
- `SUPERSEDED` — the surface was deleted rather than fixed.
- `PARTIAL` — closed in some places, still live in others. The still-live places are named.
- `OPEN` — still present.

Every status below was established by reading the code as it stands, not by reading commit
messages. Where a fix was "add module X", X's production callers were counted; a module with
zero non-test callers is recorded as OPEN however good the module is.

## The four themes

**1. The dashboard reports things it does not measure.** This is the dominant defect and
the most expensive one, because the founder makes decisions on these numbers. The funnel's
top stage is `max(signups * 5, profiles * 3)` behind a comment admitting it is a guess, so
the headline conversion rate is pinned near 20% by construction. MRR is headcount times
list price and moves when you change the time picker. The System Health page draws its
latency chart from `Math.random()`, hardcodes uptime at 99.9% and memory at exactly half,
and refreshes every 30 seconds so it looks live. The A/B experiment's "confidence" is
`min(95, 60 + wins * 7)`.

**2. Several surfaces are empty by construction.** `/admin/errors`, `/admin/insights`, the
DB Performance section, and the whole feedback queue read Firestore collections that no
code in the repo writes to. The instrumentation functions exist (`trackError`,
`trackQuery`, `trackInsight*`, `trackRateLimitEvent`) and have zero call sites. Because
the pages render `|| 0` against green thresholds, no data is visually identical to perfect
health.

**3. Authorization is inconsistent across the API.** `withAdminAuth`/`withPermission` exist
in `lib/admin/middleware.ts` and had zero call sites repo-wide. 17 routes use bare
`verifyAdminAccess`, which returns true for any role, so the read-only `analyst` and the
`support` role could read revenue, export a CSV of every user, and run the irreversible
FSRS migration. Five more routes hand-roll the preamble in 16 copies.

**4. The admin has no mobile story and a decorative interaction layer.** The sidebar is an
unprefixed `w-64` with `ml-64` on main and no drawer. `DataTable`'s sort set state and
flipped the arrow while rendering the unsorted prop, so every sortable column in the admin
was a placebo.

## Ledger

### Shell, navigation, information architecture (`01-nav-ia.md`)

| ID | Sev | Finding | Status |
|---|---|---|---|
| NAV-1 | P1 | `bugfix-quality` + `learn-research` have no nav entry and zero inbound links | FIXED — `lib/admin/navigation.ts:102-113`, rendered `app/admin/layout.tsx:298` |
| NAV-2 | P0 | Admin gate probes the heaviest analytics endpoint purely as an auth check | FIXED — gate calls `/api/admin/me` (`app/admin/layout.tsx:181`), one role read |
| NAV-3 | P1 | Every non-200 maps to "Access Denied", locking admins out on backend failure | FIXED — `GateState` union `app/admin/layout.tsx:100-105,196-206`; 503 fault path `lib/admin/middleware.ts:66-73` |
| NAV-4 | P1 | "Super Admin" hardcoded though 4 real roles exist | FIXED — `ROLE_LABELS` `app/admin/layout.tsx:86-91,494` |
| NAV-5 | P1 | Three competing header systems; `TimeRangeSelector` is dead code | OPEN — `PageHeader` (7 pages), `AdminLayout` (`app/admin/research/page.tsx:199`), 12 raw `<h1>`; `TimeRangeSelector` still exported `components/admin/shared/index.ts:1` |
| NAV-6 | P1 | 21 of 22 pages re-implement token+fetch+loading+error (47 `getIdToken` sites) | OPEN — 48 `getIdToken` sites across 20 pages; `lib/admin/api-client.ts:125 loadAdminData` has zero production callers |
| NAV-7 | P1 | timeRange state in 7 pages, 3 defaults, 2 types, no URL sync | OPEN — `app/admin/page.tsx:107` defaults 7d vs `users/page.tsx:51` 30d; no `useSearchParams` anywhere under `app/admin` |
| NAV-8 | P2 | 5 pages redeclare formatters `lib/admin` already exports | OPEN — six local formatters (a new one at `app/admin/feedback/page.tsx:156`); no admin page imports from `@/lib/admin` |
| NAV-9 | P2 | CSV export hand-rolled twice despite `ExportButton`; no `revokeObjectURL` | PARTIAL — both leaks fixed (`learn-research/page.tsx:71`, `audit/page.tsx:172`) but `lib/admin/api-client.ts:253` still leaks and `ExportButton` still has zero callers |
| NAV-10 | P1 | `DataTable` sort is decorative | FIXED — `components/admin/shared/DataTable.tsx:89-92` applies `sortRows`; `aria-sort` at :167 |
| NAV-11 | P0 | Zero responsive handling below ~1024px | FIXED — off-canvas drawer + mobile bar `app/admin/layout.tsx:320,338,349-356`, Escape close :154-161 |
| NAV-12 | P1 | Magic `maxHeight` + `flex-1` on a non-flex aside + phantom scrollbar classes | FIXED — `app/admin/layout.tsx:350,415`; inline maxHeight and `scrollbar-*` gone |
| NAV-13 | P2 | Sidebar collapse not persisted | FIXED — `SIDEBAR_COLLAPSED_KEY` `app/admin/layout.tsx:93,119-129` |
| NAV-14 | P2 | No command palette over 23 destinations | OPEN — no `CommandPalette` and no Cmd/Ctrl+K handler exists |
| NAV-15 | P2 | No breadcrumbs, no per-page title | OPEN — zero `document.title`/`metadata`/breadcrumb hits under `app/admin` |
| NAV-16 | P2 | `loading.tsx` a bare spinner while skeletons sit unused | OPEN — `app/admin/loading.tsx:1-12` unchanged; `PageSkeleton` still has zero callers (`DashboardSkeleton` gained one) |
| NAV-17 | P2 | No `app/admin/error.tsx` | OPEN — file still does not exist |
| NAV-18 | P1 | No `aria-current`, no nav label, no skip link | FIXED — `app/admin/layout.tsx:415` nav label, :440 `aria-current`, :311-316 skip link to `id="admin-content"` :517 |
| NAV-19 | P1 | `text-gray-500` at 3.76:1 fails AA | OPEN — `lib/admin/design-system.ts:30,35,38`, `StatCard.tsx:31,82,134`, `layout.tsx:250` |
| NAV-20 | P1 | Zero focus-visible styles in the layout and shared components | FIXED — focus rings `app/admin/layout.tsx:323,382,389,403,442,504`; header cell now a button `DataTable.tsx:178-186` |
| NAV-21 | P2 | Skeletons lack `role="status"`/`aria-busy` | OPEN — `components/admin/shared/Skeleton.tsx:12-17` still a bare `animate-pulse` div |
| NAV-22 | P1 | `design-system.ts` accent is cyan vs 184 clay usages | OPEN — `lib/admin/design-system.ts:71-74,138,182,204` still `#00d9ff`, live on all 7 `PageHeader` pages |
| NAV-23 | P2 | Two `MetricCard`s; `StatCard.trend` accepted and never rendered | OPEN — `components/admin/shared/StatCard.tsx:56` vs `components/admin/charts/MetricCard.tsx:33`; `trend` declared :15, never destructured :21-28 |

### Core: overview, users, sessions (`02-core.md`)

| ID | Sev | Finding | Status |
|---|---|---|---|
| CORE-1 | P0 | Unbounded reads of all sessions + all events, counted in JS, against a 30s ceiling | OPEN — `app/api/admin/analytics/route.ts:283-290,379-386` still `.get()` whole collections; `timeRange=all` is still an offered button |
| CORE-2 | P0 | ~167 sequential profile batches per request | OPEN — serial `await` in the chunk loop survives in both copies: `analytics/route.ts:245-253`, `users/route.ts:121-129` |
| CORE-3 | P0 | Delete-user cancels Stripe before a single 500-op batch; partial failure loses the sub, keeps the data | OPEN — `app/api/admin/users/route.ts:252` cancels before the single batch at :268/:296; the chunked `deleteAllUserData` is wired only to `/api/delete-account` |
| CORE-4 | P0 | Deletion queries `analytics_events.userId` but the writer nests it under `properties` — events never erased | PARTIAL — self-serve path fixed (`app/api/delete-account/user-data-map.ts:154`), admin deleter still `{ name: "analytics_events", field: "userId" }` at `users/route.ts:60` |
| CORE-5 | P0 | User search has no debounce; every keystroke rescans 5000 users | FIXED — 350ms debounce `app/admin/users/page.tsx:152-158` |
| CORE-6 | P1 | `wcsr.total` labelled all-time but range-scoped | FIXED — `app/admin/page.tsx:260` renders the range in the subtitle |
| CORE-7 | P1 | Cumulative series seeds at 0 inside the window, contradicting the Total Users card | OPEN — `analytics/route.ts:136` still seeds `total: 0` with no pre-window pass |
| CORE-8 | P1 | Time-range buttons do not affect Total Users / tiers / MRR | OPEN — those three still come from the unfiltered `listUsers` (`analytics/route.ts:232,256,424`) and are not labelled all-time |
| CORE-9 | P1 | Two different MRR formulas between Overview and Revenue | FIXED — both call `countBillingSubscriptions` + `computeMrrCents` (`analytics/route.ts:424-437`, `revenue/route.ts:100-111`) |
| CORE-10 | P1 | `errors.total` is the length of a 100-row page | OPEN — `analytics/route.ts:573` is `recentErrors.length` off a `.limit(100)` query |
| CORE-11 | P1 | `user-profile` skips `VIEW_USER_DETAILS`; analyst reads full PII | FIXED — `app/api/admin/user-profile/route.ts:31` gates on `VIEW_USER_DETAILS`, which analyst lacks |
| CORE-12 | P1 | `analytics` skips `VIEW_ANALYTICS`/`VIEW_REVENUE`; support sees MRR/ARR | FIXED — `analytics/route.ts:185` gates on `VIEW_ANALYTICS` (support holds neither); revenue nulled at :424 |
| CORE-13 | P1 | `timeRange` is a blind cast; an unknown value selects the full-scan path | FIXED — membership test against `ADMIN_TIME_RANGES`, fallback 7d (`lib/admin/middleware.ts:207-210`) |
| CORE-14 | P1 | 5000-user cap truncates silently; `searchCapped` never rendered | OPEN — produced at `users/route.ts:179`, no consumer anywhere in the repo |
| CORE-15 | P1 | Users + Sessions have no error state; a 500 renders "No users found" | PARTIAL — sessions and the users table now error+retry, but the users metrics fetch still swallows at `app/admin/users/page.tsx:92-102` and renders zero cards |
| CORE-16 | P1 | Sessions page has no session list, no drill-in, and no API exists | FIXED — `app/api/admin/sessions/route.ts` (cursor-paginated, filtered, `?sessionId=` drill-in) + rebuilt page |
| CORE-17 | P1 | No admin mutation except delete: no tier grant, quota reset, disable, refund, export | OPEN — `users/route.ts` exports only GET and DELETE; no PATCH anywhere under `app/api/admin` |
| CORE-18 | P1 | Four serial GA4 calls per request with zero consumers | OPEN — `analytics/route.ts:506-520` still awaits four GA4 calls in sequence; `firebaseAnalytics` has no consumer |
| CORE-19 | P1 | One drawer open reads `session_summaries` 4x | OPEN — four limit-100 reads remain (`lib/rag/enhanced-user-profile.ts:944`, `behavioral-analysis.ts:1002,1084`, `user-profile/route.ts:342`) |
| CORE-20 | P1 | Users + Sessions each trigger the whole Overview computation | PARTIAL — sessions now reads its own bounded endpoint; `app/admin/users/page.tsx:88` still fetches `/api/admin/analytics` for four cards |
| CORE-21 | P1 | Avg Score counts null as 0 and mixes in guest sessions | OPEN — `analytics/route.ts:331` still `!== undefined`, so null adds 0/1; guests not excluded |
| CORE-22..27 | P2 | No sort/filter/bulk/export; no copy-to-clipboard; `window.alert` on error; `stripe_customer_id` shipped to the client; per-Lambda cache | PARTIAL — only CORE-25 fixed (inline `deleteError`, `users/page.tsx:577-584`). Live: 22 hand-rolled table :408-426, 23 no clipboard, 24 duplicate refresh :241/:372, 26 `stripe_customer_id` `users/route.ts:150`, 27 per-instance Map `lib/admin/cache.ts:15` |

### Revenue, payments, growth, funnel (`03-revenue.md`)

| ID | Sev | Finding | Status |
|---|---|---|---|
| REV-1 | P0 | Funnel top stage is `max(signups*5, profiles*3)`, an admitted guess | FIXED — stage deleted; stages come from `buildFunnelStages` (`lib/admin/funnel-metrics.ts:181-188`), no visits bar |
| REV-2 | P0 | `visitToSignup` is a tautology returning exactly 20.0% | FIXED — gone from the route; `overallConversion` is subscribed/signups in one cohort (`funnel-metrics.ts:191-198`) |
| REV-3 | P0 | `pageViewsEstimated` returned by the API and read by no page | FIXED — zero hits repo-wide; a dead `visitToSignup` field remains in the page's interface (`app/admin/page.tsx:93`), unread |
| REV-4 | P0 | "MRR (Actual)" is headcount x list price and moves with the time picker | PARTIAL — now point-in-time and picker-independent (`revenue/route.ts:99-111`) and relabelled "at list price", but still headcount x list (`lib/admin/revenue-metrics.ts:62-75`), not summed from Stripe |
| REV-5 | P0 | "Mark Credited" destroys the claim: zeroes `pendingFreeMonths`, nothing applies the month | FIXED — `lib/referrals.ts:1029-1077` leaves the balances untouched, writes `redemption_recorded` |
| REV-6 | P0 | "Mark Paid" is self-attestation; no payout integration exists | FIXED as a defect — reference now required, stored and audited (`referrals/rewards/route.ts:76-82,168-188`); payout integration still absent by design |
| REV-7 | P0 | Funnel mixes windows, so `completeToSubscribe` can exceed 100% | FIXED — stages nest by construction (`funnel-metrics.ts:137-172`) |
| REV-8 | P1 | "Calculated MRR" ignores `subscription_status`, prices yearly at $25 | FIXED — filters `BILLING_SUBSCRIPTION_STATUSES` (`lib/admin/subscription-state.ts:26-29`), yearly at annual/12 |
| REV-9 | P1 | Payments "Total Revenue" is the last 100 documents | FIXED — sum/count aggregations over the whole collection (`payments/route.ts:106-130`); tables labelled a sample |
| REV-10 | P1 | Stripe never reconciled against Firestore; dropped webhooks invisible | OPEN — no drift computation exists; the Stripe card still sits beside Firestore with no diff (`app/admin/revenue/page.tsx:416-461`) |
| REV-11 | P1 | `charges.list({limit:100})` un-paginated; refunds attributed to charge date | PARTIAL — pagination fixed (`revenue/route.ts:173-190`, 1,000 cap); refunds still attributed to the charge date, only disclosed (`revenue-metrics.ts:205-211`) |
| REV-12 | P1 | `payment_history.created_at` is webhook-processing time, not payment time | OPEN — `app/api/webhook/stripe/route.ts:105` still `new Date().toISOString()` |
| REV-13 | P1 | No MRR movement, churn or LTV anywhere | OPEN — zero hits for mrr_movements / churnRate / LTV across `app`, `lib`, `components` |
| REV-14 | P1 | "$10 Owed" bills a liability that does not exist | FIXED — column replaced by "Signup reward"/"Upgrade reward" with a caption (`app/admin/growth/page.tsx:662,734-742`) |
| REV-15 | P1 | Page tests `"paid"`, service writes `"credited"` — rows read "Owe $10" forever | FIXED — one `DetailedRewardStatus` vocabulary from write to badge (`growth/page.tsx:80-84,322-332`; `lib/referrals.ts:1281-1284`) |
| REV-16 | P1 | `signup_cash` is a phantom type; a voided clawback renders as "10 mo" | OPEN — still declared and branched on (`app/admin/payments/page.tsx:53,362,366,370`; `payments/route.ts:56`) |
| REV-17 | P1 | Reward buttons swallow 400/500 | FIXED — per-row error with `role="alert"` (`growth/page.tsx:184-188,292-300`) |
| REV-18 | P1 | Referral stats count `users`, everything else `profiles`; `organic` can go negative | FIXED — counts `profiles` via `count()` and clamps organic at 0 (`lib/referrals.ts:1367-1373`) |
| REV-19 | P1 | Funnel/cohorts/payments uncached, unbounded, N+1 | OPEN — `funnel/route.ts:74,99,141` and `cohorts/route.ts:57-66` read every profile/session uncached; `payments/route.ts:169-173` is still N+1 |
| REV-20 | P1 | `signups \|\| totalProfiles` shows the all-time count for an empty window | FIXED — stage is `cohort.size` with no fallback (`funnel-metrics.ts:166,183`) |
| REV-21 | P1 | "All" range silently charts 7 days | FIXED — `resolveTrendRange` starts at the earliest held event and reports truncation (`funnel-metrics.ts:227-239`) |
| REV-22..33 | P2 | Multi-currency summed as USD; UTC-vs-local split; 3 completion definitions; `organic \|\| 1`; no comparison, charts, export or per-tier breakdown | PARTIAL — fixed: 23 (discounts panel deleted), 25 (each completion definition named), 26 (`organic \|\| 1` gone), 29 (`getListPricesCents`). Live: 22 currency ignored by every aggregate (`revenue/route.ts:146`), 24 UTC-vs-local (`lib/admin/cohort-activity.ts:33-36`), 27 no comparison, 28 no timeRange on payments/growth, 30 no per-tier collected revenue, 31 no export, 32 funnel 500 reads as "No funnel data" (`funnel/page.tsx:110-129`), 33 funnel + revenue still on bare `verifyAdminAccess` |

### AI cost and scoring (`04-ai-cost.md`)

| ID | Sev | Finding | Status |
|---|---|---|---|
| AI-1 | P0 | Edge reports `provider:"openai"`, absent from the cost table, falls back to the Gemini rate (6.4x) | FIXED — real bare-`openai` row `lib/pricing.ts:247`; unmatched keys now log ERROR (`lib/usage-tracking.ts:506-511`) |
| AI-2 | P0 | Cost from `text.length/4` though measured usage is in hand; reasoning tokens vanish | PARTIAL — Node path uses provider-measured usage (`lib/ai-providers.ts:936-940`), but the Edge feedback path still derives tokens from text length (`lib/usage/edge-reporter.ts:89-96`) |
| AI-3 | P1 | Flat 50/50 in/out average discards the stored input/output counts (~2.1x over on chat) | FIXED — `lib/usage-tracking.ts:512` delegates to per-direction `calculateAICost` (`lib/pricing.ts:350-353`); the blend survives display-only |
| AI-4 | P1 | `recordGlobalSpend` called from one place; Edge, voice and embeddings bypass the kill switch | PARTIAL — Edge ingest now feeds the ceiling (`app/api/internal/usage/route.ts:194`); voice (`lib/usage-tracking.ts:566-579`) and every embedding tracker still bypass it |
| AI-5 | P1 | Dead third cost table in `ai-providers.ts`, already 30x adrift, beside the model pin | FIXED — `costPer1kTokens` deleted from `ProviderConfig` and all 9 literals; `PROVIDER_COSTS` re-derived (`lib/pricing.ts:296`) |
| AI-6 | P1 | No `crons` key in `vercel.json`, so `cost_averages` is never computed and the spike detector cannot fire | FIXED — `vercel.json` schedules `/api/cron/aggregate-usage` hourly, which calls `aggregateCostAverages` (`app/api/cron/aggregate-usage/route.ts:26`) |
| AI-7 | P1 | `checkUserCostAnomaly` has zero callers; two alert types have no producer | PARTIAL — the function is deleted and the hourly check self-triggers (`lib/cost-anomaly-detection.ts:243` from `usage-tracking.ts:192`); `daily_budget_exceeded` still has zero producers |
| AI-8 | P1 | 30 days of trends computed by a 10k-doc scan and never rendered | OPEN — `app/api/admin/usage/route.ts:147,185` still pays for `getDailyUsageTrends(30)`; the page has no trends field |
| AI-9 | P1 | Providers tab shows a static rate card; real per-provider spend is fetched and dropped | OPEN — `app/admin/ai-usage/page.tsx:161` types `providers` and the tab (:932-983) renders only the static rate card |
| AI-10..20 | P2 | `countTokens` model arg never passed; anomaly dedup keys on type only; no cached-input term; embedding rate copied from a retired model; three accurate-costing helpers with zero callers | PARTIAL — fixed: AI-17 authz, AI-14 claude rate/name. Live: 10 no model arg, 11 dedup type-only, 12 no `update_config` caller, 13 `cachedInputTokens` plumbed but no production caller (DeepSeek cache discount never applied), 14 stale rate card, 15, 16 partial cache key, 18, 19 embedding rate, 20 three helpers still at zero callers |

### Infrastructure, health, errors, RAG (`05-infra.md`)

| ID | Sev | Finding | Status |
|---|---|---|---|
| INFRA-1 | P0 | 24h latency/requests/errors fabricated with `Math.random()`, averaged into the headline | FIXED — `performanceHistory`/`avgLatency` deleted; `app/admin/health/page.tsx:452-455` documents the removal (commit a308cfd9) |
| INFRA-2 | P0 | `services.storage` initialised healthy and never reassigned | FIXED — no `storage` literal survives; every card is a probe result (`lib/admin/platform-probes.ts:194-271`) |
| INFRA-3 | P0 | Stripe, Gemini, DeepSeek, Deepgram, Brevo, Sentry have no probe at all (1 of 8 probed) | FIXED — 9 real probes, run in production at `app/api/admin/health/route.ts:152`; `dependency-probes.ts:214` can return `unhealthy` |
| INFRA-8 | P0 | `trackError()` has zero callers, so the errors page can never populate | PARTIAL — `trackError` deleted (`lib/analytics.ts:147`) and the health card says "Not collected here", but `/admin/errors` still reads `event_name == "error"` (`analytics/route.ts:453`) and renders a green "No errors recorded" |
| INFRA-9 | P0 | Sentry is the real store; `/admin/errors` reads a Firestore mirror nothing writes | OPEN — `app/admin/errors/page.tsx:47` still fetches the mirror; :255 hardcodes "Set SENTRY_DSN to enable" without checking the variable |
| INFRA-10 | P0 | `trackQuery()` has zero callers; DB Performance permanently zero | SUPERSEDED — `trackQuery` deleted (`lib/query-performance.ts:8`) and the panel replaced by an explicit "not collected" block (`app/admin/infrastructure/page.tsx:342-347`); the route still exists and still returns zeros |
| INFRA-14 | P0 | Six cron routes exist, `vercel.json` had no `crons` key | PARTIAL — `vercel.json:22-43` declares 5; the sixth (`email-notifications`) stays on external cron-job.org, unversioned and unverifiable from the repo |
| INFRA-11 | P1 | Health "Acknowledge" parses the body, does nothing, returns success | FIXED — signature-bound doc + `logAdminAction` (`health/route.ts:229-246`), read back at :63/:157 |
| INFRA-12 | P1 | `email-diagnostics`, the best real check present, has no UI consumer | OPEN — only non-production callers (`scripts/test-email-system.ts:172`); no admin page fetches it |
| INFRA-15 | P1 | No `cron_runs` log; no last-run/success/duration surface | OPEN — zero hits for `cron_runs`/`cron_logs` repo-wide |
| INFRA-16/17 | P1 | No history (`saveMetricsSnapshot` has zero callers) and no alerting path | OPEN — `lib/rag/monitoring.ts:608` still has zero callers; alerts are derived inside the GET body and exist only while a tab is open |
| INFRA-22 | P1 | RAG reindex/reseed guarded only by "is admin"; no permission, audit or confirm | PARTIAL — now `MANAGE_SETTINGS` + a 3-per-5-min limit (`rag-health/route.ts:171,178-184`); no `logAdminAction`, no Zod, and "Reseed All" still fires `force: true` on one click (`app/admin/rag/page.tsx:512`) |
| INFRA-23 | P1 | Reindex runs synchronously inside a 30s function; UI treats `response.ok` as success | OPEN — still inline (`rag-health/route.ts:189,209`) under maxDuration 30; UI still trusts `response.ok` (`rag/page.tsx:241,284`) |
| INFRA-24 | P1 | Retrieval metrics from an in-process buffer; "Uptime" is really instance age | OPEN — `lib/rag/monitoring.ts:126,425` in-process buffer; uptime is `Date.now() - startTime` (:195) |
| INFRA-25 | P1 | Every `/admin/rag` load makes paid embedding calls; 30s auto-refresh compounds it | OPEN — `lib/rag/embeddings/hybrid-provider.ts:441-455` still calls `generateEmbedding("health check")` per invocation, no TTL cache; file untouched since baseline |
| INFRA-26 | P1 | Two unbounded `analytics_events` scans per health poll, 2,880x/day | FIXED — one filtered `.count().get()` (`health/route.ts:128-133`) |
| INFRA-29 | P1 | Errors page swallows fetch failure and renders the green "running smoothly" state | FIXED — `loadError` state + retry card (`app/admin/errors/page.tsx:38,51-62,270-283`, commit 509ce78d) |
| INFRA-4..7, 13, 18..21, 27, 28, 30..33 | P1/P2 | Hardcoded auth status, uptime and memory; self-timing API check; no Zod; no deploy/env-drift view; no incident log; decorative time-range toggle; no staleness indicator | PARTIAL — fixed: 4 real auth probe, 5 uptime literal deleted, 6 real `process.memoryUsage()`, 7 self-timing card removed, 13 Zod on the POST, 32 dead import. Live: 18 no p50/p95, 19 no build-info, 20 no incident log, 21 quick-eval still 5 cases with no persistence, 27 no `!healthData` branch on the RAG page, 28 errors query still has no date filter, 30 no staleness indicator, 31 no shared auto-refresh, 33 no shared thresholds |

RAG's `quick-eval` is the honest outlier: it genuinely measures P@k, R@k, hit@k and MRR
through the real retriever against hand-labelled fixtures. Its gaps are scale (5 cases)
and persistence, not honesty.

### Operations: research, announcements, flags, settings (`06-ops.md`)

| ID | Sev | Finding | Status |
|---|---|---|---|
| OPS-1 | P0 | `feature_flags` has zero runtime readers; every kill switch on the page is decorative | FIXED — `getFlag` resolves the Firestore `feature_flags` collection as layer 1 (`lib/feature-flags.ts:263,354-383,421`), 14 production call sites incl. `app/api/voice/token/route.ts:30`; the 5 remaining orphan flags are labelled ORPHAN at `lib/feature-flags.ts:50-61` |
| OPS-2 | P0 | `confidence_level = 60 + wins*7` rendered as "% confidence" and written to the export | FIXED — deleted at source (`lib/spaced-repetition/research-tracker.ts:623-631`), page renders `ExperimentReadoutPanel` (`app/admin/research/page.tsx:532`), export column gone (`research/export/route.ts:394-403`) |
| OPS-3 | P0 | t-tests run on event-level arrays though randomization is per user | FIXED — `aggregateEventsByUser` then `calculateSignificanceTests(UserObservationSet)` (`lib/research/analyzer.ts:233,442-465`); one row per user |
| OPS-4 | P0 | `analyst`/`support` can POST `end-ab-switch-fsrs` and `backfill-research` | FIXED — `requirePermission(MANAGE_SETTINGS)` (`algorithm-research/route.ts:231`), which analyst and support lack |
| OPS-5 | P0 | "Backfill Data" writes synthetic metrics into the live cohorts, no dry run or audit | FIXED — writes to a quarantined collection, `dryRun` defaults true, confirm token, `logAdminAction` (`algorithm-research/route.ts:89,100,463,475,599`) |
| OPS-6 | P1 | No sample-ratio-mismatch check on a `Math.random() < 0.5` assignment | FIXED — `checkSampleRatioMismatch` (`lib/research/experiment-readout.ts:213`), `invalid_split` verdict :324, rendered `ExperimentReadoutPanel.tsx:80-86` |
| OPS-7 | P1 | No stopping rule, no primary metric, no multiple-comparison correction; MDE hidden | FIXED — `EXPERIMENT_DESIGN` (`experiment-readout.ts:75-88`) declares primary metric, alpha, Holm correction and a fixed-horizon rule; MDE rendered :118-154 |
| OPS-8 | P1 | Flag + announcement PUT spread arbitrary client keys into Firestore | PARTIAL — flags fully Zod-validated (`feature-flags/route.ts:61-77`) and announcements PUT allowlisted (:222-230), but announcements POST still validates only `!title \|\| !message` (`announcements/route.ts:144-149`) |
| OPS-9 | P1 | Audit entry stores `Object.keys(updates)` only; no before/after, no IP/UA | PARTIAL — flags route logs before/after via `logAdminAction` (`feature-flags/route.ts:353-361`); announcements still raw 4-key `.add()` at `announcements/route.ts:174,240,285` |
| OPS-10 | P1 | Research export skips `EXPORT_DATA`, writes no audit entry, emits raw `user_id` | FIXED — `requirePermission(EXPORT_DATA)` :68, `logAdminAction` :122, `user_key: pseudonymize(...)` :189/:235 |
| OPS-11 | P1 | Full `announcements` collection read on every pageview for every user | PARTIAL — the export is capped, but `app/api/announcements/route.ts:66` is still an unfiltered `collection("announcements").get()` with no index |
| OPS-12 | P1 | Announcement type `page` is selectable but no renderer filters it | OPEN — `app/admin/announcements/page.tsx:105` still offers it; `AnnouncementProvider.tsx:101,152,163` filter only toast/modal/banner |
| OPS-13 | P1 | `views` is per fetch while `dismissals` is per user | OPEN — `app/api/announcements/route.ts:221` still `increment(1)` per fetch; file untouched since baseline |
| OPS-14 | P1 | Mid-sweep failure leaves the A/B half-migrated with no resume | PARTIAL — server persists a cursor and auto-resumes (`algorithm-research/route.ts:337-345`), but `lib/hooks/useResearchData.ts:264` still throws out of the loop and discards `pages` |
| OPS-15 | P1 | `ab_ended` is one-way; no lifecycle, registry or start date | PARTIAL — lifecycle + `reopen-ab` exist (`lib/research/experiment-registry.ts:36-68,263`) but `reopen-ab` has zero client callers and the page renders no status or start date |
| OPS-16..21 | P2 | No broadcast confirm/preview/history; swallowed responses; hardcoded permission matrix and provider badges; `alert()` for mass mutations; empty "Specific" targeting; CSV not injection-safe | PARTIAL — closed: flags confirm/history/error states, settings matrix and provider badges now read real state, admins UID+email verified. Live: 16 announcements have no confirm or preview, 17 announcements act only on `response.ok` (`page.tsx:168,247,268`), 19 `alert()` in `lib/hooks/useResearchData.ts:214,236`, 21 empty "Specific" saves and no `=+-@` CSV neutralisation (`research/export/route.ts:445-455`) |

### Feedback, insights, audit log, orphans (`07-feedback.md`)

| ID | Sev | Finding | Status |
|---|---|---|---|
| FB-1 | P0 | `referrals/rewards` pays out with an eligibility override and logs nothing | FIXED — `referrals/rewards/route.ts:168-188` logs actor, request, before/after and `eligibilityOverridden`; `markRewardPaid` no longer exists |
| FB-18 | P0 | `feedback` has no writer; the page and 8 stat cards are permanently empty | FIXED — `app/api/product-feedback/route.ts:115` writes it, called from `components/feedback/SendFeedbackCard.tsx:90`, mounted at `app/account/page.tsx:1214` |
| FB-2 | P1 | Exporting 10k audit rows leaves no audit entry | OPEN — `app/api/admin/audit/route.ts:161-237` exports with no `logAdminAction`; `AUDIT_ACTIONS.EXPORT_AUDIT_LOG` has zero production callers |
| FB-3 | P1 | Feedback PUT and hard DELETE unlogged | OPEN — `app/api/admin/feedback/route.ts:231,260` still mutate with no audit import |
| FB-4 | P1 | rag-health seed/vectorize (embedding spend) unlogged | OPEN — `app/api/admin/rag-health/route.ts:187-214` gained a rate limit but writes no audit entry |
| FB-5 | P1 | No caller passes `request`, so IP/userAgent are never written while the banner claims they are | PARTIAL — `lib/admin/audit.ts:189-207` records real IP/UA and 11 of 24 call sites pass `request`; 13 do not (`users/route.ts:347`, `lib/admin/rbac.ts:255`) and the banner at `app/admin/audit/page.tsx:440` is unchanged |
| FB-6 | P1 | `adminEmail` never written; every row shows the actor as "System" | PARTIAL — written (`lib/admin/audit.ts:174-177`) and read (`audit/route.ts:97`), but 12 of 24 call sites still pass a bare uid, so those rows still render "System" |
| FB-7 | P1 | No composite index for `admin_audit_log(action, timestamp)` | OPEN — `firestore.indexes.json` declares no `admin_audit_log` index at all |
| FB-8 | P1 | A failed audit query renders "No audit logs found" | OPEN — `app/admin/audit/page.tsx:116-129` still `if (response.ok)` with no else; zero commits on that file since baseline |
| FB-9 | P1 | Three separate writers to `admin_audit_log` | PARTIAL — the `rbac.ts` duplicate is gone; `app/api/admin/announcements/route.ts:174,240,285` still raw-`.add()` 4-key rows |
| FB-19 | P1 | Unvalidated user-supplied `type` reaches `typeConfig[item.type].icon` and throws | FIXED — coerced through `resolveFeedback*` on both sides (`feedback/route.ts:161-165`, `app/admin/feedback/page.tsx:113-129`) |
| FB-23 | P1 | No assignee, tags, dedupe, or reply path back to the submitter | PARTIAL — reply-by-email, mark-replied and submit-time dedupe shipped; `assignee`/`tags` exist only in the PUT schema (`feedback/route.ts:225-226`) with no UI |
| FB-29 | P1 | `trackInsight*` never called; `/admin/insights` is 457 lines over an empty DB | SUPERSEDED — commit 69559026 deleted the page, `app/api/admin/insight-effectiveness/route.ts` and `lib/rag/insight-effectiveness.ts`; nav entry removed |
| FB-30 | P1 | Top Users cannot populate; the parent stats doc is never created | SUPERSEDED — same commit removed both writer and reader of `insight_effectiveness_stats` |
| FB-34 | P1 | learn-research render callbacks use the wrong `(value, row)` signature; `any` hid it | OPEN — `DataTable.tsx:17,226` invokes `render(value, row)` while `app/admin/learn-research/page.tsx:81,87` writes `(row) => ...`; the page has no commits since baseline, and FB-35 made it reachable by click |
| FB-35 | P1 | learn-research is orphaned but worth wiring: it has real writers | FIXED — `lib/admin/navigation.ts:104` + `app/admin/layout.tsx:76`; route re-gated at `learn-research/route.ts:54,66` |
| FB-10..17, 20..28, 31..33, 36..40 | P2 | Not append-only; no actor filter; endDate off-by-one; unbounded stat reads; NPS computed twice; 50k-doc scans per tab switch; research CSV export open to analyst/support | PARTIAL — fixed: 17, 20 (`count()`), 21 (cursor + Load more), 22 (4 `feedback` indexes declared), 25, 26, 27. Superseded: 31/32/33 (insights deleted). Live: 10, 11, 12 (`audit/route.ts:75,177`), 13, 14, 15, 16 (audits a GET), 24, 28, 36 (`lib/tutorials/learn-analytics.ts:250,259` `limit(50_000)`), 37, 38, 39; 40 partial (export now needs `EXPORT_DATA`, which analyst holds) |

### API layer, all 31 route modules (`08-api.md`)

| ID | Sev | Finding | Status |
|---|---|---|---|
| API-1 | P0 | 17 routes use bare `verifyAdminAccess`, so any role passes | PARTIAL — 15 of 17 closed; `app/api/admin/revenue/route.ts:68` and `app/api/admin/funnel/route.ts:57` are still bare, so `analyst` and `support` still read revenue |
| API-2 | P0 | 5 routes hand-roll the preamble in 16 copies; 3 gate on `if (!role)` | FIXED — zero `authHeader`/`"Bearer "` hits across `app/api/admin/**/route.ts`; all 5 use `withPermission` |
| API-3 | P0 | `feedback` POST never checks a role: any signed-in user writes dashboard docs | FIXED — the admin POST handler was deleted; only GET/PUT/DELETE are exported (`feedback/route.ts:120,195,244`) |
| API-22 | P0 | `analytics` swallows Firestore failures into `{size:0,docs:[]}` — a broken query renders as "0 sessions" with HTTP 200 | PARTIAL — analytics now rethrows (`analytics/route.ts:291,387`); `user-profile/route.ts:239-250,318-320` still coerces failures into zeros with HTTP 200 |
| API-4 | P1 | `getAdminRole` writes `lastAccess` and is called 3x per request | FIXED — one role read, permissions derived in memory (`middleware.ts:90,116-118`); `lastAccess` throttled to 5 min (`rbac.ts:27,151`) |
| API-5 | P1 | GET regenerates and writes the aggregate on a stale read | FIXED — GET reads only and returns `comparisonStale` (`algorithm-research/route.ts:144-153`); regeneration is an audited POST |
| API-6 | P1 | `verifyIdToken` without `checkRevoked`; a revoked admin keeps access ~1h | FIXED — `{ checkRevoked: true }` (`middleware.ts:54`) via `lib/admin/token-revocation.ts:53` |
| API-8..14 | P1/P2 | Unbounded `hours`, `limit`, `cohorts`, `page`; `...updates` mass assignment; unvalidated dates | PARTIAL — bounders and both allowlists landed. Live: API-11 bare `typeof config === "object"` (`cost-anomalies/route.ts:126-131`), API-13 raw `new Date(startDate)` (`audit/route.ts:70,73,173,176`), API-14 unbounded/negative `page` (`research/users/route.ts:67`) |
| API-16 | P1 | 16 copied preambles while `withAdminAuth`/`withPermission` had zero call sites | FIXED — 28 `withPermission` call sites plus `withAdminAuth` at `me/route.ts:26`; zero inline preambles |
| API-21 | P1 | Raw `error.message` returned in 12 handlers; a stack in dev | PARTIAL — the dev stack branch is gone (`analytics/route.ts:601-608`); 10 handlers still return `error.message`, worst `revenue/route.ts:249` (Stripe detail) and `research/export/route.ts:157` (Firestore index URLs) |
| API-23 | P1 | `health` fabricates `performanceHistory` and hardcodes uptime/memory | FIXED — real `process.memoryUsage()` (`health/route.ts:169-186`); no `Math.random`, no `performanceHistory`, no uptime literal |
| API-24 | P1 | Unbounded scans across analytics, feedback, funnel, cohorts, audit, export | PARTIAL — feedback uses `count()`, audit is cursor-paginated. Still unbounded: `analytics:223,289,385`, `funnel:74`, `cohorts:57-58,66`, `research/export:224`, `research/users:77` |
| API-25 | P1 | ~167 sequential profile batches; an N+1 in insight-effectiveness | PARTIAL — the N+1 vanished only because the route was deleted (69559026); the serial 30-doc loops survive (`analytics:245-252`, `users:120-128`) and `user-profile:131,134` still awaits serially |
| API-26 | P1 | One batch across all profiles, hard-failing past the 500-write cap | FIXED — `commitInChunks` at 450 writes (`algorithm-research/route.ts:824-843`); note `backfillResearchData:558` still scans all profiles uncursored |
| API-27 | P1 | `rag-health` POST triggers embedding spend behind a bare admin check | FIXED — `withPermission(MANAGE_SETTINGS)` + 3-per-5-min limit (`rag-health/route.ts:171,180`); quick-eval GET carries a second gate |
| API-32 | P1 | `email-diagnostics` returns 12 chars and the exact length of `BREVO_API_KEY` | FIXED — booleans only (`email-diagnostics/route.ts:41-46`), route now `MANAGE_SETTINGS` |
| API-7, 15, 17..20, 28..31 | P2 | No-op acknowledge; one Zod schema across 52 handlers; three error envelopes; `adminDb` guard in 13 of 31; dead import; cache on 3 of 31; one rate-limited handler | PARTIAL — closed: API-7 (acks persist + Zod), API-17 (bare envelope died with insights), API-20 (dead import). Live: API-15 Zod in 4 of 33 files, API-18 `adminDb` guard in 19 of 33, API-28 cache on 3 of 33 (`CACHE_TTL.FUNNEL/COHORTS` unused), API-29 `force-dynamic` on 10 of 33, API-30 rate limits on 2 routes, API-31 audit in 12 of 33 |

### Wiring census (`09-wiring.md`)

Confirms the orphan pages, the dead controls, the fabricated data and the writerless
collections listed above. Additional structural note: seven admin pages exceed 700 lines
mixing UI, fetching, formatting and business logic; the worst are `research/page.tsx`
(1357), `ai-usage/page.tsx` (1177) and `rag/page.tsx` (926).

## Owner actions this audit cannot perform

- Deploy Firestore indexes and rules after the audit-log and feedback changes land.
- Decide whether the referral reward program is honoured manually or withdrawn.
- Confirm any AI unit price marked unverified in `lib/usage-tracking.ts`.
