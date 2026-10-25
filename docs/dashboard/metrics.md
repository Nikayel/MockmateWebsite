# Dashboard metrics

`interview_sessions` is the source of final scores. `session_summaries` remains interaction telemetry for analytics/RAG; it never writes dashboard scores or aggregates.

## Rules

- A result needs a valid completion timestamp and a finite score in 0–100. Pending, processing, failed, and future-dated results are excluded. Historical documents without `feedback_status` may count when they have a saved score and completion time.
- Every persisted session ID contributes once. Replaying completion cannot increment dashboard totals. The telemetry summary is also claimed transactionally once before learning-state side effects.
- Interview averages use `performance_score`, the score displayed in final feedback. Technical score prefers saved `technical_score`, then `mastery_score`, then a complete historical category breakdown. Missing technical scores are excluded from that denominator rather than estimated from overall performance.
- Zero is observed data; null means unobserved. Missing evidence displays `—`, never a fabricated zero or a beginner recommendation.
- Guided labs are recognized by their persisted flag, guided assessment, or the historical BookClub scenario ID. They have separate completed-lab, mastery, and practice-time metrics. They do not contribute to interview averages, breakdowns, difficulty groups, trends, or Bugfix Readiness.
- Lab mastery prefers `guided_lab_mastery.masteryScore`, then saved mastery, then the historical performance field. This recovers the practice signal for older labs whose performance field was overwritten by telemetry.
- Recent average uses the five latest completed interviews, sorted by completion time. Bugfix Readiness independently uses the five latest completed bugfix interviews, preferring the debugging rubric's overall score. Later DSA sessions cannot hide debugging history.
- All-time overview, patterns, difficulty, and skill breakdown share one population. Category averages use only observed values for that category. Practice minutes retain the existing 90-minute per-session clamp. Lab time is separate; lesson-reading time is excluded.
- “Last 7 days” is a rolling seven-day score window. Daily charts use UTC calendar dates; the activity series retains 90 days independently of the ten-row recent-history preview. Trend halves are weighted by session count.

## Modules

`lib/user-metrics/` separates normalization, pure aggregation, trend calculation, response formatting, Firestore reads/cache, and final-result persistence. Shared types and score formatting are safe for client use. The HTTP route authenticates, validates the 1–90-day chart range, and delegates to the service.

The dashboard fetches one payload for Recent Avg, Bugfix Readiness, guided practice, and Performance Insights. Recent Activity still loads its own small list, including paused and unscored sessions. `/metrics` consumes the same service.

## Repair and concurrency

On the first metrics read after deployment, a versioned snapshot is rebuilt from completed session documents using 250-document pages and field projections. There is no 25/500-session cutoff. The rebuild replaces legacy score totals and stale pattern/difficulty maps in `user_stats`; it does not rewrite feedback, transcripts, or research events. Repair is automatic per user on access, not a bulk production migration.

Snapshots expire after 60 seconds. Final feedback and `metrics_revision` invalidation commit in the same Firestore transaction. Rebuild uses a revision compare-and-set, retrying if a final result landed during the scan. Duplicate terminal writes are ignored inside that transaction; real feedback may upgrade fallback feedback. Alternate historical writers are reconciled when the cache expires. Rebuild failure returns an error/retry state rather than an empty dashboard.

This design trades a paginated history scan on cache rebuild for deterministic historical repair. Cached dashboard reads are constant-size. Scan cost grows with completed history; a future per-session projection can replace the repository without changing the normalization or UI contracts.

The repository uses the existing `interview_sessions(user_id ASC, completed_at DESC)` index. No new index or credentials are required. API responses are authenticated and `private, no-store`.

## Verification

- Unit tests cover score precedence, invalid/provisional records, missing versus zero, lab separation, independent recent windows, and exact score totals.
- Repository tests cover pagination beyond 250 sessions, cross-user isolation, stale aggregate repair, cache expiry/invalidation, concurrent revision changes, terminal feedback guards, and repeated completion after a cold start.
- Endpoint tests cover authorization, chart-range validation, private caching, and useful failure states.
- Playwright uses the real dashboard cards and canonical response builder with synthetic sessions, covering desktop/mobile, zero scores, lab-only learners, shared requests, and retry recovery.
