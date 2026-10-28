# Recommendation and model-training data readiness

Follow-up implementation, 2026-10-28: [Recommendation decision identity and funnel](../interview/recommendation-funnel.md) adds stable decision IDs, visible-card reporting, and accepted-start/final-completion attribution for next practice. Export completeness, training eligibility, and reproducible ranking inputs remain separate work.

Follow-up implementation, 2026-10-28: [Partner/hint response ratings and shared generation identity](../interview/response-ratings.md) address lost hint ratings and response linkage described below. This audit remains a dated record; the export/governance and recommendation-chain findings are not claimed resolved by that change.

Audited 2026-10-27 against local commit `b4934a64` and read-only metadata from PostHog project `563097` (the connected account's only project, named Default project). App-specific event names match this repository. No production transcripts, code, or user-level records were downloaded. No runtime behavior or tracking was changed.

## Decision

The existing data supports operational reporting and rule-based personalization. It is **partially prepared for recommendation learning and not an established model-training dataset**. Firestore is adequate; replacing the database is not the first step. The missing foundation is reliable observations joined to decisions, message generations, versions, and outcomes, with explicit dataset eligibility.

Training a recommendation ranker on behavioral features and fine-tuning an interviewer on code/conversations are separate uses. They need different inputs and labels. Neither an accepted suggestion nor an AI-generated score is independent evidence of correctness.

## What already exists

| Area | Existing evidence | Boundary |
| --- | --- | --- |
| Learner context | Goals, role, target company, interview timeline, daily/weekly goals, profile audit history in `lib/types.ts` | A current profile alone does not reproduce the learner state when a recommendation was made. |
| Interview outcomes | Scenario/user/session IDs, final code, tests, overall/technical scores, score dimensions, `measurement_version` in sessions and feedback persistence | Latest state is useful for the product; it is not a complete attempt or generation history. |
| Recommendations | Impression, click, accepted-start attribution; saved plans, reminders, return/completion events | Current next-practice selection is deterministic. It does not train from these events. A saved plan has a revision, but there is no general recommendation decision ID. |
| AI usage | `usage_events` records service, provider, model, tokens, cost, latency, session/scenario IDs, measured-versus-estimated token flag | This is stronger than the smaller `ai_chat` event. Neither supplies a universal generation/message join key. |
| Debugging | Reproduction, files inspected/edited, hypotheses, tests, help-request timing/type, source-revision checks and final evidence summaries | Client evidence and model assessments need distinct provenance. Summary fields are not full code-edit trajectories. |
| Lessons | Append-only item responses: selected answers, retries, hints/reference reveals, tests, error categories, canonical knowledge components, write-time research consent | Input correctness/test results are substantially client reported. No universal content revision, visit ID, or retry-stable event ID. |
| Learning time | Learn records visible/recently-active time in per-lesson and daily rollups | This already exists; do not add a duplicate timer or call aggregate time an action sequence. |
| Spaced repetition | Algorithm, problem, pre/post state, predicted and observed retention, hints/time and serialized FSRS cards | Retention is an operational mastery-threshold proxy, not an independent delayed assessment by itself. |
| Sprint Labs | Content version per run, attempt records, hidden-suite variant, AI policy, optional scoring model ID, transcript provenance/capabilities | Useful precedents, but these contracts do not automatically apply to ordinary interviews. |
| Governance | Export permissions, some export audit logging, pseudonyms, lesson research-consent stamps, recursive Firestore account deletion | Coverage differs between paths. No model-training-specific consent contract was found in the inspected flows. |

Main sources: `lib/types.ts`, `lib/usage-tracking.ts`, `lib/ai-providers.ts`, `lib/bugfix/types.ts`, `lib/tutorials/types.ts`, `lib/tutorials/learn-time.ts`, `lib/sprint-labs/types.ts`, and [the current recommendation contract](../RECOMMENDATION-ENGINE.md).

This inventory describes inspected contracts and writers, not historical completeness or a census of every product surface. A declared field is not evidence that it has been populated. In particular, legacy counters and model-derived signals need coverage/provenance checks before analysis.

## Concrete gaps to fix first

### 1. Hint ratings currently disappear

`app/interview/_hooks/useInterviewMetrics.ts:163` sends helpful/unhelpful feedback. `lib/rag/actions/record-feedback.ts:19` only calls `logger.info`, then returns success. `lib/logger.ts:198` suppresses info logs in production. There is no durable feedback write in this handler.

Also, `buildHintFeedbackId` uses scenario plus hint index. That identifies a slot, not the exact personalized hint generation. Persist a rating against a generation ID, with authenticated actor, session, timestamp and rating provenance. Do not report durable success before the write succeeds.

The `ai_suggestion_applied` API branch exists, but a repository search found no browser caller in the inspected app/components/lib flows. Do not interpret its initialized counters as measured acceptance. The interviewer's `acknowledged` reaction explicitly means receipt, not solution approval or a learner preference.

### 2. Research export still exposes a UID inside its event ID

`lib/spaced-repetition/research-tracker.ts:100` builds `${userId}_${problemId}_${timestamp}`. `app/api/admin/research/export/route.ts:188` exports that `id` unchanged while pseudonymizing only `user_id` into `user_key`. The exported row therefore still contains the raw account identifier.

The lesson export already handles this failure mode by rebuilding `row_id` from the pseudonym in `lib/tutorials/learn-analytics.ts:271`. Apply the same principle to every exported field, including composite IDs and nested content. These are pseudonymous exports, not a guarantee of anonymity.

### 3. An impression is currently a successful fetch

`lib/hooks/useNextPractice.ts:48` emits an impression when a ready response arrives. It does not check whether the recommendation is in the visible viewport. Its deduplication set lasts only for the mounted hook.

Keep served and viewed as different observations. Define a view rule, for example a visible card for a documented minimum interval; treat the threshold as a product choice. Generate one decision ID at selection and carry it through views, clicks, saves, accepted starts and completed sessions. Persist trusted start attribution server-side; URL parameters alone are client claims.

### 4. Generic analytics has no application-level data contract

`lib/analytics.ts` and `lib/analytics-server.ts` accept open event names and `Record<string, any>`. Server Firestore rows and vendor captures have independently assigned IDs. Joins mix `session_id` and `sessionId`; the accepted-start event emits both to compensate. Vendor IDs do not provide a shared identity across stores.

Add a small typed/versioned event contract for the learning loop. Reuse the existing capture functions. Generate an action ID once and reuse it on retries and across sinks. Preserve occurrence time separately from server receipt time. Normalize legacy aliases in the export layer instead of renaming every collection.

`recordItemResponses` avoids collisions within a batch but generates new timestamp-based IDs on a retried request. That is append-only storage, not retry deduplication.

### 5. Interview telemetry can be incomplete across server instances

`lib/session-metrics.ts:150` holds active sessions in a process-local Map. Several trackers return when no state is present. Completion reconstructs minimal state with empty arrays/zero counters and records `isReconstructedSession`.

Preserve that quality flag in any extract; reconstructed zero hints/messages must not become evidence that none occurred. Use durable action facts for signals a ranker actually needs. Do not add a second copy of every existing lesson event or make telemetry failure break an interview.

### 6. Stored transcripts cannot reconstruct a generation

`lib/feedback/transcript-storage.ts:19` stores role/content/reaction and truncation bookkeeping. It does not retain per-message IDs, generation IDs, timestamps, or the exact model-visible context. The archive is best-effort at feedback persistence, so abandoned attempts need not have an equivalent final transcript.

The usage ledger preserves model IDs, and partner-handoff LangSmith tracing deliberately hides inputs. Neither replaces a versioned, access-controlled generation record. Do not disable that privacy boundary to obtain a training corpus. Missing generation context cannot reliably be recreated by joining records on timestamp.

### 7. Exports are bounded views, not complete reproducible datasets

The algorithm event export stops at 10,000 rows, filters algorithm after that limit, and provides no cursor/completeness manifest. Learn reads at most 50,000 rows before its consent filter, also without an export cursor. These limits protect the app but can silently omit eligible rows.

The algorithm and Learn exports use different pseudonym functions, so their subject keys do not directly join. Learn also falls back to a known development salt if its environment salt is missing; a future production dataset export should fail closed on a missing secret. No secret values were inspected.

The algorithm export does not apply the lesson export's write-time research-consent filter. That is an inconsistent governance contract, not proof that an operational analysis is itself unauthorized. Define purpose-specific eligibility before treating any export as a research/training dataset.

### 8. Training permission and downstream deletion are not established

`app/legal/page.tsx:449` explicitly says user code is not used to train AI models. The research settings describe studying lesson progress/answers, not fine-tuning on interview transcripts or code. Current consent must not be silently reinterpreted or applied retroactively.

Before such a new use, establish the exact disclosure, opt-in scope, policy version, decision history, withdrawal behavior and dataset eligibility. Keep normal product access independent of optional participation. Start training experiments with authored/synthetic material whose rights are established.

The inspected account-deletion route covers Firestore and Pinecone. It does not show a PostHog erasure workflow or downstream dataset/export lineage. Establish how withdrawals/deletions reach retained extracts, derived datasets and future training runs; removing a database row does not remove already exported copies or trained weights.

### 9. AI agreement is mislabeled as score accuracy

`lib/scoring/analytics-persistence.ts:409` counts unchanged scores as correct and changed scores as incorrect. This measures agreement with a model critique, not accuracy against independently graded evidence. Keep it out of gold labels and reward definitions. Use expert-reviewed rubric labels, verifier provenance and disagreement records when assessing scorer quality.

## Additional observations worth collecting

| Priority | Observation | Useful fields and interpretation |
| --- | --- | --- |
| First | Recommendation decision and actual exposure | Decision ID, surface, candidate/ranked IDs or reconstructible catalog+filter snapshot, displayed position, rule/model version, scores/reasons, learner-state snapshot, view time. A candidate never shown is not a negative preference. |
| First | Explicit recommendation feedback | Save/remove already exist; add dismiss/skip reasons such as too easy, too hard, wrong topic, already know, insufficient time. No response means unknown. Removing a saved plan need not mean dislike. |
| First | End-to-end outcome | Decision → accepted session start → completion/abandonment → first unaided pass, hints/help exposure, rubric evidence, later review. Record attribution window and terminal reason; distinguish quota/auth/network/harness failure from learner choice. |
| First | Exact AI response and feedback linkage | Message/generation/request IDs, interviewer/partner/hint role, shown versus generated, helpfulness/reason, retry, copy/apply/undo when observable, next test outcome. Copying is observable; understanding is not proven by copying or passing. |
| Next | Attempt progression | Attempt/run ID, source revision, test-suite/runtime version, error class, test counts, assistance state, meaningful submission/test-run checkpoints. Preserve observed versus inferred versus verified source. Continuous keystroke recording is unnecessary for the initial use case. |
| Next | Satisfaction and constraint fit | Occasional optional difficulty/usefulness/confidence feedback; stated time budget, desired practice mode and goals. Long active time may mean struggle, not satisfaction. Existing goals/time signals should be reused. |
| Next | Delayed learning/transfer | Later unassisted recall and new-task performance on the same knowledge component. Separate same-problem memorization, assisted completion and comparable transfer assessments; define the delay and eligibility. |
| Later | Controlled exploration | Experiment assignment/exposure and policy version. If using a stochastic ranker, log the actual selection probability and eligible action set. Do not fabricate propensities for a deterministic selector; unsupported alternatives cannot be evaluated counterfactually from these logs alone. |

Use a stable skill vocabulary across lessons, interviews and scenarios. Lessons already have `knowledge_components`; free-form scenario tags alone are a weak cross-product analysis key. Preserve content revisions so re-authored tasks with the same ID remain distinguishable.

## Smallest adequate schema direction

This is a proposed export/event contract, not implemented code. Add fields to existing domain records and introduce only the missing durable decision/rating facts; a single giant Firestore document or a universal entity framework is unnecessary.

| Record | Minimum contract |
| --- | --- |
| Event envelope | `event_id`, `event_name`, `schema_version`, `occurred_at`, `received_at`, environment, surface, source/trust status; authenticated internal user ID, with purpose-scoped `subject_key` on export; distinguish browser visit from interview session. |
| Recommendation decision | `decision_id`, source session, catalog/content version, policy version, ranked candidates/positions or reconstructible selection inputs, features as known at decision time, optional experiment assignment/probability. Return this ID to the client and retain it on accepted starts. |
| Generation | `generation_id`, `request_id`, `message_id`, parent/attempt IDs, role, provider/model/parameters, prompt/context version or immutable snapshot reference, retrieval evidence references, retries/fallbacks/cache status, latency/tokens, and whether the final result was displayed. Protected content references only where the declared use permits. |
| Response rating | Stable action ID, generation/message ID, subject/session, timestamp, rating/reason, human-versus-model label source. Support correction/withdrawal without losing provenance. |
| Attempt/outcome | Attempt/session/scenario IDs, source revision, test-suite/runtime/rubric versions, assistance state, objective results, assessment source/confidence/coverage, completion reason, linked decision/generation IDs where available. |
| Dataset manifest | Dataset/schema version, purpose, source/time bounds, cursor/watermark, counts/completeness, extraction code version, key version, eligibility/redaction rules, label provenance, exclusions and train/validation/test split definitions. Retain protected deletion lineage outside the exported learning features. |

Keep raw restricted artifacts separate from analytical events. Do not place code, chat, names, email or secret-bearing outputs in every analytics payload. Pseudonymous behavior remains linkable and needs purpose/access controls.

For extraction, retain Firestore as product state and PostHog as product analytics. Use one documented analytical export with consistent keys and normalized units, then scheduled exports to a warehouse/object store when volume warrants it. No Kafka, feature store, neural recommender or database migration is required to close these initial gaps.

## Dataset uses and quality checks

- **Recommendation ranking:** exposure/action/outcome rows with features from before the decision. Labels can include starts, useful completion, satisfaction and later recall separately. Do not choose fixed objective weights without validation.
- **Interviewer/hint SFT:** eligible, redacted exact input context plus reviewed target responses and model/prompt/content provenance. An accepted response alone is not a supervised quality label.
- **Preference training:** comparable responses to the same context with chosen/rejected/tie/both-bad judgments, rubric, reviewer source and confidence. Different users completing different problems do not form clean response-preference pairs.
- **Code-repair experiments:** versioned initial code, permitted context/actions, resulting patch and reproducible verifier/environment. Keep sealed answers and hidden tests out of model-visible inputs.
- **Evaluation:** hold out whole learners and task families as appropriate, use temporal cutoffs, and keep duplicate/near-duplicate task variants together. Prevent final scores/future mastery/solutions from leaking into pre-decision features. Report missingness and failure coverage.

Before certifying an extract, check key uniqueness/referential integrity, row counts versus source, duplicate delivery, unknown versus zero, timestamp units/order, score scales, content/rubric versions, pseudonym consistency, environment/internal-test/bot exclusions, eligible purposes and sensitive identifiers inside nested fields/composite IDs. Keep observations that fail quality checks quarantined with reasons rather than silently converting them to success/failure.

## Suggested delivery order

1. **Repair existing evidence:** durable exact-generation hint ratings; remove UID-bearing export IDs; label critique agreement accurately; document consent scope and export limitations. Add focused regression checks for these failures.
2. **Join the loop:** shared retry-stable IDs, versioned events, durable recommendation decisions, actual views, trusted accepted-start attribution and source-quality flags. Reuse current click/save/return/completion events.
3. **Certify extraction:** paginated/resumable purpose-scoped export, consistent pseudonyms, manifest, redaction/deletion lineage and data-quality checks. Verify a synthetic learner journey reconstructs correctly across server restarts, retries and abandonments.
4. **Improve ranking experimentally:** retain the current selector as baseline; add constraint fit, explicit feedback and skill outcomes; compare variants on learning and satisfaction as well as starts. Consider a learned ranker only after labels and coverage support evaluation.

The first demonstrable result should be one correctly reconstructed path: a learner truly sees decision D, opens/starts its task, receives generation G, rates that exact response, runs attempt A, and later demonstrates or fails the target skill. Every link should survive an export without exposing account identifiers or inventing missing facts.

## Live metadata and external references

At the audit snapshot, PostHog listed app events including `ai_chat`, `next_practice_impression`, `next_practice_click`, `next_practice_started`, `feedback_viewed`, practice-plan events and session start/completion. `ai_chat` exposed provider, role, session/user IDs, response time and token counts; the inspected properties did not include generation/message/prompt IDs. Native `$ai_generation`/`$ai_feedback` entries were explicitly marked not seen in the last 30 days; listing them is not proof they are collected. This is metadata coverage, not a production-volume or completeness measurement.

The connected project had **zero configured PostHog batch exports**. This does not rule out exports configured outside PostHog. Repository archival/TTL documentation contains TODOs; deployed Firestore TTL and external warehouse settings were not inspected.

Independent reproduction used the actual TypeScript hint handler/logger and research-export route, transpiled in memory with synthetic rows and mocked dependencies. With production logging settings, a hint rating returned success and emitted zero info logs. An authorized synthetic event export pseudonymized the user field while retaining the synthetic UID in its event ID. These checks made no network or database writes. No application tests were required for this documentation-only change; the reproductions verify the two specific defects, not the entire data platform.

- [PostHog project](https://us.posthog.com/project/563097) and [export destinations](https://us.posthog.com/project/563097/data-management/destinations).
- [PostHog events and deduplication](https://posthog.com/docs/data/events#event-deduplication), [batch exports](https://posthog.com/docs/data-pipelines/batch-exports), and [generation-linked user feedback](https://posthog.com/docs/ai-observability/user-feedback/manual-event-capture).
- [Joachims et al., Unbiased Learning-to-Rank with Biased Feedback](https://www.cs.cornell.edu/people/tj/publications/joachims_etal_17a.pdf): clicks are affected by presentation position; naive click/nonclick labels introduce bias. This motivates exposure/position/context logging, not a claim that current data proves causality.
- [Covington et al., Deep Neural Networks for YouTube Recommendations](https://research.google/pubs/deep-neural-networks-for-youtube-recommendations/): separates candidate generation and ranking. This is a useful conceptual distinction, not a recommendation to adopt YouTube-scale infrastructure here.
- [Zhao et al., Recommending What Video to Watch Next: A Multitask Ranking System](https://research.google/pubs/recommending-what-video-to-watch-next-a-multitask-ranking-system/): studies multiple ranking objectives. For this product, prioritizing learning/recall and satisfaction alongside engagement is an engineering recommendation, not a result established by that paper for CodeSparring.
