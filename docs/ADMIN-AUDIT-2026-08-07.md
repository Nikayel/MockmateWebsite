# Admin Dashboard Audit, 2026-08-07

A ten-agent audit of `/admin` (23 pages, 31 API route modules, 52 handlers) covering
navigation, every page section, the API layer, the wiring census, and the design system.
This file is the ledger. Every finding carries an ID so a later pass can confirm nothing
was quietly dropped.

Status values: `FIXED`, `DEFERRED` (deliberate, with a reason), `NOT-REAL` (audit was
wrong on inspection), `OPEN`.

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
| NAV-1 | P1 | `bugfix-quality` + `learn-research` have no nav entry and zero inbound links | |
| NAV-2 | P0 | Admin gate probes the heaviest analytics endpoint purely as an auth check | |
| NAV-3 | P1 | Every non-200 maps to "Access Denied", locking admins out on backend failure | |
| NAV-4 | P1 | "Super Admin" hardcoded though 4 real roles exist | |
| NAV-5 | P1 | Three competing header systems; `TimeRangeSelector` is dead code | |
| NAV-6 | P1 | 21 of 22 pages re-implement token+fetch+loading+error (47 `getIdToken` sites) | |
| NAV-7 | P1 | timeRange state in 7 pages, 3 defaults, 2 types, no URL sync | |
| NAV-8 | P2 | 5 pages redeclare formatters `lib/admin` already exports | |
| NAV-9 | P2 | CSV export hand-rolled twice despite `ExportButton`; no `revokeObjectURL` | |
| NAV-10 | P1 | `DataTable` sort is decorative | FIXED |
| NAV-11 | P0 | Zero responsive handling below ~1024px | |
| NAV-12 | P1 | Magic `maxHeight` + `flex-1` on a non-flex aside + phantom scrollbar classes | |
| NAV-13 | P2 | Sidebar collapse not persisted | |
| NAV-14 | P2 | No command palette over 23 destinations | |
| NAV-15 | P2 | No breadcrumbs, no per-page title | |
| NAV-16 | P2 | `loading.tsx` a bare spinner while skeletons sit unused | |
| NAV-17 | P2 | No `app/admin/error.tsx` | |
| NAV-18 | P1 | No `aria-current`, no nav label, no skip link | |
| NAV-19 | P1 | `text-gray-500` at 3.76:1 fails AA | |
| NAV-20 | P1 | Zero focus-visible styles in the layout and shared components | |
| NAV-21 | P2 | Skeletons lack `role="status"`/`aria-busy` | |
| NAV-22 | P1 | `design-system.ts` accent is cyan vs 184 clay usages | |
| NAV-23 | P2 | Two `MetricCard`s; `StatCard.trend` accepted and never rendered | |

### Core: overview, users, sessions (`02-core.md`)

| ID | Sev | Finding | Status |
|---|---|---|---|
| CORE-1 | P0 | Unbounded reads of all sessions + all events, counted in JS, against a 30s ceiling | |
| CORE-2 | P0 | ~167 sequential profile batches per request | |
| CORE-3 | P0 | Delete-user cancels Stripe before a single 500-op batch; partial failure loses the sub, keeps the data | |
| CORE-4 | P0 | Deletion queries `analytics_events.userId` but the writer nests it under `properties` — events never erased | |
| CORE-5 | P0 | User search has no debounce; every keystroke rescans 5000 users | |
| CORE-6 | P1 | `wcsr.total` labelled all-time but range-scoped | |
| CORE-7 | P1 | Cumulative series seeds at 0 inside the window, contradicting the Total Users card | |
| CORE-8 | P1 | Time-range buttons do not affect Total Users / tiers / MRR | |
| CORE-9 | P1 | Two different MRR formulas between Overview and Revenue | |
| CORE-10 | P1 | `errors.total` is the length of a 100-row page | |
| CORE-11 | P1 | `user-profile` skips `VIEW_USER_DETAILS`; analyst reads full PII | |
| CORE-12 | P1 | `analytics` skips `VIEW_ANALYTICS`/`VIEW_REVENUE`; support sees MRR/ARR | |
| CORE-13 | P1 | `timeRange` is a blind cast; an unknown value selects the full-scan path | |
| CORE-14 | P1 | 5000-user cap truncates silently; `searchCapped` never rendered | |
| CORE-15 | P1 | Users + Sessions have no error state; a 500 renders "No users found" | |
| CORE-16 | P1 | Sessions page has no session list, no drill-in, and no API exists | |
| CORE-17 | P1 | No admin mutation except delete: no tier grant, quota reset, disable, refund, export | |
| CORE-18 | P1 | Four serial GA4 calls per request with zero consumers | |
| CORE-19 | P1 | One drawer open reads `session_summaries` 4x | |
| CORE-20 | P1 | Users + Sessions each trigger the whole Overview computation | |
| CORE-21 | P1 | Avg Score counts null as 0 and mixes in guest sessions | |
| CORE-22..27 | P2 | No sort/filter/bulk/export; no copy-to-clipboard; `window.alert` on error; `stripe_customer_id` shipped to the client; per-Lambda cache | |

### Revenue, payments, growth, funnel (`03-revenue.md`)

| ID | Sev | Finding | Status |
|---|---|---|---|
| REV-1 | P0 | Funnel top stage is `max(signups*5, profiles*3)`, an admitted guess | |
| REV-2 | P0 | `visitToSignup` is a tautology returning exactly 20.0% | |
| REV-3 | P0 | `pageViewsEstimated` returned by the API and read by no page | |
| REV-4 | P0 | "MRR (Actual)" is headcount x list price and moves with the time picker | |
| REV-5 | P0 | "Mark Credited" destroys the claim: zeroes `pendingFreeMonths`, nothing applies the month | |
| REV-6 | P0 | "Mark Paid" is self-attestation; no payout integration exists | |
| REV-7 | P0 | Funnel mixes windows, so `completeToSubscribe` can exceed 100% | |
| REV-8 | P1 | "Calculated MRR" ignores `subscription_status`, prices yearly at $25 | |
| REV-9 | P1 | Payments "Total Revenue" is the last 100 documents | |
| REV-10 | P1 | Stripe never reconciled against Firestore; dropped webhooks invisible | |
| REV-11 | P1 | `charges.list({limit:100})` un-paginated; refunds attributed to charge date | |
| REV-12 | P1 | `payment_history.created_at` is webhook-processing time, not payment time | |
| REV-13 | P1 | No MRR movement, churn or LTV anywhere | |
| REV-14 | P1 | "$10 Owed" bills a liability that does not exist | |
| REV-15 | P1 | Page tests `"paid"`, service writes `"credited"` — rows read "Owe $10" forever | |
| REV-16 | P1 | `signup_cash` is a phantom type; a voided clawback renders as "10 mo" | |
| REV-17 | P1 | Reward buttons swallow 400/500 | |
| REV-18 | P1 | Referral stats count `users`, everything else `profiles`; `organic` can go negative | |
| REV-19 | P1 | Funnel/cohorts/payments uncached, unbounded, N+1 | |
| REV-20 | P1 | `signups \|\| totalProfiles` shows the all-time count for an empty window | |
| REV-21 | P1 | "All" range silently charts 7 days | |
| REV-22..33 | P2 | Multi-currency summed as USD; UTC-vs-local split; 3 completion definitions; `organic \|\| 1`; no comparison, charts, export or per-tier breakdown | |

### AI cost and scoring (`04-ai-cost.md`)

| ID | Sev | Finding | Status |
|---|---|---|---|
| AI-1 | P0 | Edge reports `provider:"openai"`, absent from the cost table, falls back to the Gemini rate (6.4x) | |
| AI-2 | P0 | Cost from `text.length/4` though measured usage is in hand; reasoning tokens vanish | |
| AI-3 | P1 | Flat 50/50 in/out average discards the stored input/output counts (~2.1x over on chat) | |
| AI-4 | P1 | `recordGlobalSpend` called from one place; Edge, voice and embeddings bypass the kill switch | |
| AI-5 | P1 | Dead third cost table in `ai-providers.ts`, already 30x adrift, beside the model pin | |
| AI-6 | P1 | No `crons` key in `vercel.json`, so `cost_averages` is never computed and the spike detector cannot fire | |
| AI-7 | P1 | `checkUserCostAnomaly` has zero callers; two alert types have no producer | |
| AI-8 | P1 | 30 days of trends computed by a 10k-doc scan and never rendered | |
| AI-9 | P1 | Providers tab shows a static rate card; real per-provider spend is fetched and dropped | |
| AI-10..20 | P2 | `countTokens` model arg never passed; anomaly dedup keys on type only; no cached-input term; embedding rate copied from a retired model; three accurate-costing helpers with zero callers | |

### Infrastructure, health, errors, RAG (`05-infra.md`)

| ID | Sev | Finding | Status |
|---|---|---|---|
| INFRA-1 | P0 | 24h latency/requests/errors fabricated with `Math.random()`, averaged into the headline | |
| INFRA-2 | P0 | `services.storage` initialised healthy and never reassigned | |
| INFRA-3 | P0 | Stripe, Gemini, DeepSeek, Deepgram, Brevo, Sentry have no probe at all (1 of 8 probed) | |
| INFRA-8 | P0 | `trackError()` has zero callers, so the errors page can never populate | |
| INFRA-9 | P0 | Sentry is the real store; `/admin/errors` reads a Firestore mirror nothing writes | |
| INFRA-10 | P0 | `trackQuery()` has zero callers; DB Performance permanently zero | |
| INFRA-14 | P0 | Six cron routes exist, `vercel.json` had no `crons` key | FIXED (external) |
| INFRA-11 | P1 | Health "Acknowledge" parses the body, does nothing, returns success | |
| INFRA-12 | P1 | `email-diagnostics`, the best real check present, has no UI consumer | |
| INFRA-15 | P1 | No `cron_runs` log; no last-run/success/duration surface | |
| INFRA-16/17 | P1 | No history (`saveMetricsSnapshot` has zero callers) and no alerting path | |
| INFRA-22 | P1 | RAG reindex/reseed guarded only by "is admin"; no permission, audit or confirm | |
| INFRA-23 | P1 | Reindex runs synchronously inside a 30s function; UI treats `response.ok` as success | |
| INFRA-24 | P1 | Retrieval metrics from an in-process buffer; "Uptime" is really instance age | |
| INFRA-25 | P1 | Every `/admin/rag` load makes paid embedding calls; 30s auto-refresh compounds it | |
| INFRA-26 | P1 | Two unbounded `analytics_events` scans per health poll, 2,880x/day | |
| INFRA-29 | P1 | Errors page swallows fetch failure and renders the green "running smoothly" state | |
| INFRA-4..7, 13, 18..21, 27, 28, 30..33 | P1/P2 | Hardcoded auth status, uptime and memory; self-timing API check; no Zod; no deploy/env-drift view; no incident log; decorative time-range toggle; no staleness indicator | |

RAG's `quick-eval` is the honest outlier: it genuinely measures P@k, R@k, hit@k and MRR
through the real retriever against hand-labelled fixtures. Its gaps are scale (5 cases)
and persistence, not honesty.

### Operations: research, announcements, flags, settings (`06-ops.md`)

| ID | Sev | Finding | Status |
|---|---|---|---|
| OPS-1 | P0 | `feature_flags` has zero runtime readers; every kill switch on the page is decorative | |
| OPS-2 | P0 | `confidence_level = 60 + wins*7` rendered as "% confidence" and written to the export | |
| OPS-3 | P0 | t-tests run on event-level arrays though randomization is per user | |
| OPS-4 | P0 | `analyst`/`support` can POST `end-ab-switch-fsrs` and `backfill-research` | |
| OPS-5 | P0 | "Backfill Data" writes synthetic metrics into the live cohorts, no dry run or audit | |
| OPS-6 | P1 | No sample-ratio-mismatch check on a `Math.random() < 0.5` assignment | |
| OPS-7 | P1 | No stopping rule, no primary metric, no multiple-comparison correction; MDE hidden | |
| OPS-8 | P1 | Flag + announcement PUT spread arbitrary client keys into Firestore | |
| OPS-9 | P1 | Audit entry stores `Object.keys(updates)` only; no before/after, no IP/UA | |
| OPS-10 | P1 | Research export skips `EXPORT_DATA`, writes no audit entry, emits raw `user_id` | |
| OPS-11 | P1 | Full `announcements` collection read on every pageview for every user | |
| OPS-12 | P1 | Announcement type `page` is selectable but no renderer filters it | |
| OPS-13 | P1 | `views` is per fetch while `dismissals` is per user | |
| OPS-14 | P1 | Mid-sweep failure leaves the A/B half-migrated with no resume | |
| OPS-15 | P1 | `ab_ended` is one-way; no lifecycle, registry or start date | |
| OPS-16..21 | P2 | No broadcast confirm/preview/history; swallowed responses; hardcoded permission matrix and provider badges; `alert()` for mass mutations; empty "Specific" targeting; CSV not injection-safe | |

### Feedback, insights, audit log, orphans (`07-feedback.md`)

| ID | Sev | Finding | Status |
|---|---|---|---|
| FB-1 | P0 | `referrals/rewards` pays out with an eligibility override and logs nothing | |
| FB-18 | P0 | `feedback` has no writer; the page and 8 stat cards are permanently empty | |
| FB-2 | P1 | Exporting 10k audit rows leaves no audit entry | |
| FB-3 | P1 | Feedback PUT and hard DELETE unlogged | |
| FB-4 | P1 | rag-health seed/vectorize (embedding spend) unlogged | |
| FB-5 | P1 | No caller passes `request`, so IP/userAgent are never written while the banner claims they are | |
| FB-6 | P1 | `adminEmail` never written; every row shows the actor as "System" | |
| FB-7 | P1 | No composite index for `admin_audit_log(action, timestamp)` | |
| FB-8 | P1 | A failed audit query renders "No audit logs found" | |
| FB-9 | P1 | Three separate writers to `admin_audit_log` | |
| FB-19 | P1 | Unvalidated user-supplied `type` reaches `typeConfig[item.type].icon` and throws | |
| FB-23 | P1 | No assignee, tags, dedupe, or reply path back to the submitter | |
| FB-29 | P1 | `trackInsight*` never called; `/admin/insights` is 457 lines over an empty DB | |
| FB-30 | P1 | Top Users cannot populate; the parent stats doc is never created | |
| FB-34 | P1 | learn-research render callbacks use the wrong `(value, row)` signature; `any` hid it | |
| FB-35 | P1 | learn-research is orphaned but worth wiring: it has real writers | |
| FB-10..17, 20..28, 31..33, 36..40 | P2 | Not append-only; no actor filter; endDate off-by-one; unbounded stat reads; NPS computed twice; 50k-doc scans per tab switch; research CSV export open to analyst/support | |

### API layer, all 31 route modules (`08-api.md`)

| ID | Sev | Finding | Status |
|---|---|---|---|
| API-1 | P0 | 17 routes use bare `verifyAdminAccess`, so any role passes | |
| API-2 | P0 | 5 routes hand-roll the preamble in 16 copies; 3 gate on `if (!role)` | |
| API-3 | P0 | `feedback` POST never checks a role: any signed-in user writes dashboard docs | |
| API-22 | P0 | `analytics` swallows Firestore failures into `{size:0,docs:[]}` — a broken query renders as "0 sessions" with HTTP 200 | |
| API-4 | P1 | `getAdminRole` writes `lastAccess` and is called 3x per request | FIXED |
| API-5 | P1 | GET regenerates and writes the aggregate on a stale read | |
| API-6 | P1 | `verifyIdToken` without `checkRevoked`; a revoked admin keeps access ~1h | |
| API-8..14 | P1/P2 | Unbounded `hours`, `limit`, `cohorts`, `page`; `...updates` mass assignment; unvalidated dates | |
| API-16 | P1 | 16 copied preambles while `withAdminAuth`/`withPermission` had zero call sites | |
| API-21 | P1 | Raw `error.message` returned in 12 handlers; a stack in dev | |
| API-23 | P1 | `health` fabricates `performanceHistory` and hardcodes uptime/memory | |
| API-24 | P1 | Unbounded scans across analytics, feedback, funnel, cohorts, audit, export | |
| API-25 | P1 | ~167 sequential profile batches; an N+1 in insight-effectiveness | |
| API-26 | P1 | One batch across all profiles, hard-failing past the 500-write cap | |
| API-27 | P1 | `rag-health` POST triggers embedding spend behind a bare admin check | |
| API-32 | P1 | `email-diagnostics` returns 12 chars and the exact length of `BREVO_API_KEY` | |
| API-7, 15, 17..20, 28..31 | P2 | No-op acknowledge; one Zod schema across 52 handlers; three error envelopes; `adminDb` guard in 13 of 31; dead import; cache on 3 of 31; one rate-limited handler | |

### Wiring census (`09-wiring.md`)

Confirms the orphan pages, the dead controls, the fabricated data and the writerless
collections listed above. Additional structural note: seven admin pages exceed 700 lines
mixing UI, fetching, formatting and business logic; the worst are `research/page.tsx`
(1357), `ai-usage/page.tsx` (1177) and `rag/page.tsx` (926).

## Owner actions this audit cannot perform

- Deploy Firestore indexes and rules after the audit-log and feedback changes land.
- Decide whether the referral reward program is honoured manually or withdrawn.
- Confirm any AI unit price marked unverified in `lib/usage-tracking.ts`.
