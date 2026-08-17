# Cost Tracking Audit + Centralization — 2026-08-17

Three-agent diagnosis (recording inventory, admin rendering/query audit, runtime verification)
followed by a repair-and-centralize pass. This file is the findings ledger and the decision
record. Finding IDs: `V*` = runtime verifier, `R*` = recording inventory, `A*` = admin audit.

Baseline at diagnosis: all 27 cost-related test suites green (232 tests), `tsc --noEmit` clean.
The defects below are semantic — wrong or missing money, not broken builds.

## Verdict in one paragraph

The funnel architecture is sound: `trackUsageEvent` is the single Node seam, the Edge runtime
reports through `/api/internal/usage`, pricing is per-direction in `lib/pricing.ts` (rates
verified, including the Anthropic row), and the guards read exactly the fields the recorders
write. What was broken: three missing Firestore indexes blacked out the admin AI-usage
Overview/Users tabs, anomaly persistence, and the payments endpoint (A1–A3); the Edge feedback
path — the busiest AI route — booked estimated instead of measured tokens and so under-counted
reasoning-model spend up to ~1.5x (V1/R4); five Node feedback LLM calls and most of the RAG
embedding subsystem spent money with no record at all (R2, R1); zero-cost telemetry rows
inflated every "requests" aggregate 2–3x (R5); and there was no service dimension anywhere, so
"which product surface spent this" was unanswerable below `eventType` (R8).

## Findings ledger

| ID | Sev | Area | Status | Fix |
|----|-----|------|--------|-----|
| A1 | BLOCKER | `usage_summaries` collectionGroup query has no COLLECTION_GROUP index → whole ai-usage Overview/Users 500s, page renders empty | FIXED | `firestore.indexes.json` fieldOverride on `usage_summaries.periodStart` |
| A2 | BLOCKER | `cost_anomalies` dedup query `(type ==, timestamp >=)` unindexed → every anomaly write fails, panels show 0 | FIXED | composite `cost_anomalies (type ASC, timestamp ASC)` |
| A3 | BLOCKER | `referral_rewards (status ==, orderBy processedAt)` unindexed → whole payments route 500s | FIXED | composite `referral_rewards (status ASC, processedAt DESC)` |
| V1/R4 | BLOCKER | Edge providers discard vendor `usage`/`usageMetadata`; cost estimated from response text; reasoning tokens invisible (≤1.5x under-count into ledger, caps, kill-switch) | FIXED | Edge rungs parse measured usage; `EdgeAIResponse` carries `tokensIn/tokensOut`; feedback/stream passes them to the reporter |
| R2 | BLOCKER | Node feedback aux calls (validation, extraction, transcript analysis, constitutional ×2) run with no `userId` → no ledger record | FIXED | userId/sessionId + service threaded through all five helpers from `app/api/generate-feedback` |
| R1 | BLOCKER | RAG query-side + bulk vectorization embeddings entirely untracked (`generateTextEmbedding`, direct `getHybridProvider()` calls) | FIXED | tracking moved INTO `generateTextEmbedding`; direct provider calls routed through it; unattributed calls recorded under the reserved `system` user |
| R3 | BLOCKER | Deepgram usage reported only in `stopRecording()`; unmount/navigation loses the record | FIXED | shared reporter used by both stop path and unmount cleanup, `keepalive: true` |
| R5 | BUG | `lib/session-metrics.ts` writes zero-cost rows with the same eventTypes into `usage_events` → requests inflated 2–3x in admin aggregates | FIXED | telemetry rows tagged `service: session-telemetry`; aggregates bucket by service (legacy rows: no provider+no cost+not cached = telemetry) |
| V2 | BUG | edge-reporter `estimatedTokens` flag (`=== undefined`) disagrees with resolution (`Number.isFinite`) | FIXED | flag derived from the actual resolution |
| V3/A10 | BUG | Monthly money key + `startOfMonth` readers use LOCAL time; everything else UTC (dormant: Vercel runs UTC) | FIXED | shared UTC month helpers used by writer and every reader |
| A4 | BUG | `/metrics` fetches cost/budget summary, never renders it | FIXED | usage card rendered |
| A5 | BUG | Providers tab renders static rate card only; live per-provider spend dropped (known AI-9) | FIXED | live month-to-date spend table added |
| A6 | GAP | 30-day trend + costs computed each load (paid scan), never rendered (known AI-8) | FIXED | trend section rendered |
| A7 | BUG | voice + embeddings never feed `recordGlobalSpend` → kill-switch/Spend-health undercount (known AI-4) | FIXED | `recordGlobalSpend` moved inside `trackUsageEvent`; ALL tracked spend feeds the ceiling; direct calls removed to avoid double-count |
| A8 | BUG | fetch failure and empty data render identically (no error state) | FIXED | error banners + DataTable error state |
| A9 | SMELL | `formatCost(totalCost)` unguarded vs `totalTokens \|\| 0` | FIXED | guarded |
| R6 | GAP | conversation extraction runs as sentinel userId `system-extraction` even when a real user exists | FIXED | real userId threaded from `/api/chat`; sentinel replaced by reserved `system` constant |
| R8 | GAP | no service/feature identifier; 5 feedback sub-calls indistinguishable | FIXED | `lib/usage/services.ts` registry; `service` REQUIRED at every funnel entry; per-service rollups + admin panel |
| V4 | GAP | `CostAnomalyConfig.dailyBudget` settable, read by nothing; `daily_budget_exceeded`/`unusual_pattern` never written; 500 > the real 250 ceiling | FIXED | dead field + dead anomaly types removed from type, defaults, and admin write path |
| V5 | GAP | hourly sweep truncates at 5,000 events silently (exactly the runaway case) + raw `cost \|\| 0` NaN hazard | FIXED | `readNumber`, truncation surfaced in the anomaly description + log |
| V6 | GAP | sweep windows leave unscanned gaps (fixed trailing 60min vs ≥1h throttle) | FIXED | window runs from the previous sweep claim, rate compared prorated |
| V7 | GAP | anonymous LLM spend visible to kill-switch but absent from `usage_events` | FIXED | funnel records unattributed spend under reserved `system` user (events + rollups) |
| V8 | GAP | anomaly config write/read unvalidated ("banana" threshold silently disarms alarm) | FIXED | numeric validation on write, sanitize on read |
| V10 | SMELL | `getAnomalyStats` NaN on unknown severity | FIXED | guarded |
| V12 | SMELL | `checkRequestCostAnomaly` has no internal guard; `recordAnomaly` rethrows | FIXED | internal catch |
| V11 | SMELL | `trackLLMUsageAccurate`, `calculateCostFromText` dead (zero callers) | FIXED | deleted |
| R9 | SMELL | `code_execution` event type never written (Piston deprecated, execution is client-side/free) | FIXED | removed from `UsageEventType` |
| V9 | GAP | `docs/CRON-SCHEDULE.md` claims vercel.json crons; authoritative README says cron-job.org | FIXED | doc corrected |
| R10 | SMELL | latent `"anonymous"` userId fallback in `metered-request` | FIXED | uses the reserved `system` constant |
| R7 | GAP | Brevo email sends have no usage record | DECISION: NOT SHIPPED | per-send pricing would be invented (Brevo bills by plan). Recorded as follow-up: count-only events tagged `email-transactional` if volume visibility is ever wanted. |

## The service dimension (the centerpiece)

- `lib/usage/services.ts` — client-safe, append-only registry of product surfaces that spend
  money. IDs are kebab-case with NO dots (a dotted key inside a Firestore update path splits
  into nested fields). `UsageServiceId` is a literal union; funnel entries REQUIRE it, so
  `pnpm typecheck` is the migration verifier: a call site that doesn't declare its service
  does not compile.
- Enforced by `lib/usage/__tests__/services-registry.test.ts`: unique kebab-case ids, every id
  referenced by a real call site (bijection against the live corpus), legacy eventType→service
  map total.
- Every `usage_events` row now carries `service`. Rollups gain per-service cost maps:
  `usage_summaries.costByService`, `daily_usage.costByService`, `global_usage.byService`.
  Historical rows lack the field; readers derive a legacy bucket from eventType
  (telemetry heuristic above) rather than rewriting history.
- `/api/internal/usage` validates `service` against the registry; a missing service on an
  in-flight old deploy maps through the legacy table instead of rejecting.
- Admin ai-usage gains a "Cost by product service" panel (live spend per service id).
- The global kill-switch feed is now INSIDE `trackUsageEvent` — every tracked dollar (LLM,
  voice, embeddings, Node, Edge, attributed or `system`) increments `global_usage/{day}` once.

## Expected number changes after this ships (not regressions)

- Admin "LLM requests" DROPS 2–3x: telemetry rows no longer counted as LLM calls (R5).
- Recorded spend RISES: Edge measured tokens (V1), five Node feedback calls (R2), RAG
  embeddings (R1), voice+embeddings in Spend health (A7), `system`-attributed spend (V7).
- `global_usage` daily totals rise accordingly; the $250 ceiling now sees true spend.

## Owner actions still owed (cannot be done from the repo)

1. `firebase deploy --only firestore:indexes` if the in-repo deploy attempt failed (see
   commit trailer notes) — A1/A2/A3 are only fixed in prod once indexes build.
2. Verify the cron-job.org job for `/api/cron/aggregate-usage` exists and fires hourly
   (V9): if it lapses >2h, the spike-vs-average anomaly branch silently disables
   (absolute $50/hr threshold still active).
