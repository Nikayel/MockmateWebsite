# Recommendation identity and outcome funnel

Implemented 2026-10-28 for the post-session next-practice recommendation and its saved dashboard task.

## What a decision means

`decisionId` identifies one choice for a verified user, source session, selected scenario, and recommendation policy version. It is a SHA-256 hash of that tuple. Re-fetching, saving, or reopening the same choice keeps the ID; changing the source, task, owner, or policy produces another ID. This is a choice identity, not a per-page-view ID, authentication credential, or anonymization guarantee.

`getNextPractice` still uses the existing deterministic selector. It registers a small `recommendation_decisions/{decisionId}` document before returning an ID. Registration failure returns usable advice without an ID. It neither grants access nor spends session allowance. Existing saved tasks and old links without IDs continue to work, but cannot enter the new decision-level funnel.

The ID survives the response schema, full-navigation link, saved-plan schema, dashboard return link, reminder link, interview entry parser, and accepted-start request. Identity metadata stays outside AI prompts; this change adds no model calls.

## Evidence at each stage

| Stage | Exact meaning | Authority |
| --- | --- | --- |
| Created | A selected choice was registered, whether or not a card was seen | Server registration |
| Viewed | At least 50% of the card intersected the viewport in a visible tab for one continuous second | Browser report, authenticated and attached to an owned decision |
| Clicked | The user activated the feedback or saved-dashboard practice link | Browser report, authenticated and attached to an owned decision |
| Started | The quota writer accepted a start, and the target session belongs to the decision owner and matches the recommended task | Server transaction and private start receipt |
| Completed | That accepted session has `completed_at`, final `feedback_status: complete`, and a finite persisted score from 0–100 | Canonical session plus private start receipt |

Fetching a recommendation no longer sends `next_practice_impression`. A click never manufactures a view. Fast clicks, telemetry loss, reminders, bookmarks, and old links can leave earlier stages absent. Absence is unknown evidence, not a dislike label. Email opens/clicks are not measured by this change; reminder starts remain attributable through their decision-bearing link.

Decision-bearing events are `next_practice_viewed`, `next_practice_clicked`, `next_practice_started`, and `next_practice_completed`, with `funnel_version: 1`. Legacy `next_practice_click` and client `next_practice_started` events lack that version/decision and must be excluded from the new funnel.

All new events contain `decision_id`, stable `event_id`, `policy_version`, verified `userId`, `source_session_id`, `scenario_id`, `scenario_type`, `focus_source`, `recommendation_source`, `return_source`, and `observation_source`. Started/completed events also carry the target `session_id`/`sessionId`; completion includes the persisted overall score. Browser reports are explicitly marked as such, even though the server mirrors them into analytics.

## Storage, retries, and failures

The decision document stores schema/policy versions, owner/source/selected-task IDs, scenario type, focus source, server-generated registration time, and first-observed stage timestamps. First-stage records also retain return surface and relevant first-start/completed session IDs. No code, prompts, transcripts, email addresses, or copied feedback text are added.

`recommendation_decisions/{decisionId}/starts/{sessionId}` is a server-only receipt containing owner, scenario, return source, accepted-start time, and eventual completion time/score. Every accepted attempt can have a receipt, so abandoning one attempt does not prevent a later attempt from completing the decision. The root decision counts each stage once. Firestore transactions prevent concurrent requests from duplicating stage transitions or overwriting sibling attempts.

`interview_sessions.recommendation_decision_id` is a lookup pointer, not proof: the existing session document is client-writable. Completion must also find the matching private receipt. Firestore's existing default-deny rules protect both decisions and receipts; rule integration tests exercise owner, foreign, and signed-out access. Account erasure recursively deletes the decision and its receipts.

Completion is reconciled after ordinary final feedback persistence, repeated final persist requests, background narrative recovery, and system-design metrics completion. Early metrics calls while feedback is processing/queued do not count as final completion.

Tracking failures do not reject an accepted practice start or final feedback save. Browser reports are best effort with navigation keepalive and no automatic retry loop; a remount can try again. Canonical decision/receipt updates commit before analytics mirroring. If a process stops between those operations, the durable facts remain but the analytics mirror can miss an event. This is deliberately not an exactly-once delivery claim or an outbox system. A failed attribution write can leave a session unattributed; later completion cannot invent an accepted-start receipt.

## Reading or exporting the data

Join on `decision_id`, not just user ID or matching scenario. A learner can receive multiple decisions. Count distinct decision IDs per stage and cohort by creation date/policy version with an explicit outcome window. A strict ordered funnel will exclude fast clicks without qualifying views and reminder returns with unobserved clicks; report that separately from known accepted-start/completion rates.

For a canonical export, read decisions and their `starts` receipts with pagination, then join source and target sessions by their exact IDs. Decision timestamps are first-observed server receipt times, not a complete exposure history. Analytics events are a convenient mirror, not the sole source of truth.

This establishes attribution, not a training-ready dataset or proof that recommendations improved learning. Still needed before that claim: purpose-specific dataset eligibility, complete/versioned exports, recommendation-time input/candidate snapshots, scenario/scoring revisions, and evaluation that separates engagement from learning. AI scores are not independently verified correctness labels. No training is enabled by this feature.

## Engineering judgment to reuse

1. **Choose identity before adding events.** A new random ID on every GET would inflate one logical choice into several samples. The stable tuple in `decisions.server.ts` makes retries boring; policy versioning makes later behavior changes explicit.
2. **Put evidence at the authority boundary.** `decision-outcomes.server.ts` records starts only after quota acceptance and verifies ownership/task identity. A UI click is intent; a server-owned receipt is evidence. The extra receipt exists because the session pointer is client-writable, not for hypothetical reuse.
3. **Make failure behavior part of the design.** Transactional deduplication solves concurrent updates. It does not guarantee delivery to a second system. Keep practice usable, preserve durable facts, and add an outbox only if reliable mirror delivery becomes a concrete requirement.

Verification covers visibility/dwell/hidden tabs, API auth and validation, denied starts, concurrency, foreign/wrong-task IDs, forged session pointers, later attempts, pending versus final feedback, background recovery, saved/reminder links, real Firestore security rules, and browser navigation.
