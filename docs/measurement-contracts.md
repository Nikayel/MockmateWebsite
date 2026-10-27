# Session measurement contracts

Implemented locally October 26, 2026. This documents measurement version 2; it is not evidence of a production deployment or a historical data repair. Pricing and access remain unchanged.

## Scores and execution results

- All numeric API scores use 0–100. Only the feedback parser converts an explicit `/10` denominator. The score card renders its resolved scores instead of recalculating them.
- Debugging score cards explain their subcategories on hover or keyboard focus. Category membership, criterion descriptions, and overall weights share `lib/bugfix/score-dimensions.ts` with the scorer. Card percentages show the combined overall budget; each card's score remains the simple average of its dimensions.
- Feedback prose does not establish achievements. Mentioning “root cause,” “edge cases,” or “scalability” no longer creates a success checkmark.
- `lib/workspace-execution/test-outcomes.ts` owns failure classification and judged-test totals. Candidate runtime errors and execution-budget timeouts count as failures. Service startup failures and harness faults remain unassessed.
- Browser engines attach explicit failure kinds where the engine knows the cause. Legacy messages pass through the shared classifier. A `null` output alone never establishes a platform failure.
- The streaming feedback route validates detailed test results and derives its totals from those rows. Legacy count-only requests remain supported. Client-reported results are observations, not independently server-verified credentials.
- Test rows carry a SHA-256 revision of the editable source when browser crypto is available. Feedback excludes rows tied to a different revision. Missing revision support stays unknown and does not prevent practice. No additional source snapshots or keystroke streams are stored.

## Debugging evidence and recommendations

- Reproduction requires a judged failing run before the first edit. A passing test run does not reproduce a failure.
- Opening unrelated tabs and repeatedly running unchanged tests do not increase evidence or verification scores. Navigation measures coverage of the scenario's expected file set, not reading comprehension.
- The final verified source is distinguished from a stale passing run. Older sessions without source revisions are not retroactively marked verified.
- Root-cause recommendations use a shared assessment with `observed`, `not-observed`, and `unavailable` states. An observed assessment includes a score and a quote matched against a candidate turn. Interviewer text cannot serve as candidate evidence.
- Missing legacy textareas and neutral fallback scores do not establish a reasoning weakness. The existing semantic-scoring call supplies evidence; no additional AI call is introduced.
- AI request counts are descriptive. They do not establish whether useful help was delivered, copied, or understood, and no longer directly earn or lose collaboration points.
- Existing request timestamps yield `firstAIHelp`: request time, elapsed time when session start is known, and ordering relative to the first edit, failure, and passing run. A missing comparison event leaves that ordering unknown. This is debugging-session evidence, not new product-wide partner-event instrumentation.

## Mastery, design, and time

- System-design scores use assessed discussion content instead of bonuses for message volume. Instant scores remain provisional.
- Regex code analysis reports low-confidence estimates. Correctness tests do not establish optimal complexity; heuristic efficiency stays neutral and does not earn optimal-solution score floors.
- Mastery version 2 uses the central correctness/recorded-hint weights (80% / 20%). It excludes estimated solve time and removes correctness floors that could mask assistance. Assumed hint-catalog size does not change the score. Zero judged tests do not establish correctness; scheduling skips an unassessed run unless an explicit assessment such as system design is provided.
- Mastery remains a scheduling/practice signal. Recorded hints do not capture all external help, and the score is not proof of independent transfer or hiring readiness.
- Estimated time analysis remains diagnostic in `mastery_breakdown`; it is no longer persisted as measured code efficiency. Elapsed session duration includes pauses.
- Cold-start session reconstructions do not overwrite interview scores using invented zero interaction counts.
- New feedback records carry `measurement_version: 2`, plus mastery algorithm metadata. Practice comparisons skip numeric comparisons across measurement versions. Historical scores and schedules are not batch-rewritten.

## Product telemetry and next work

Completion events use actual scenario type, difficulty, and elapsed duration when available. Missing context remains absent rather than becoming zero or an invented category.

These changes repair existing signals and derive a small amount of ordering from existing evidence. They do not introduce a premium gate, idle-time surveillance, new analytics vendors, full editor recordings, action-item completion claims, or a new readiness model. Future work should validate assistance actually delivered, feedback-to-exercise follow-through, unfamiliar-task reassessment, and human agreement with scoring before adding stronger product claims.

Main consolidation keeps dashboard activity history across measurement versions, but recent score averages, trends, and debugging readiness compare only sessions under the latest observed rules. A frozen score is counted while written feedback is queued or failed; score snapshot writes invalidate the canonical metrics cache in the same transaction. Autosaved test results retain source revisions and failure kinds.
