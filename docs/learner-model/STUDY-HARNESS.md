# Learner Model Study Harness

The open learner model doubles as a field-study instrument for human-AI co-regulation questions: when do learners inspect/dispute the model, are they right when they do, and does contestability change behavior.

## Conditions

Condition is computed server-side per user from feature flags and stamped on every event and challenge:

- **open** — full inspect + challenge + correct + trace.
- **black_box** — the control: `/knowledge` lists concepts and titles but masks every number, forecast, and explanation; challenges are disabled (UI hidden AND API 403s); the evidence endpoint 403s; the `/practice` trace is suppressed (the trace is part of the intervention).

Assignment: `FEATURE_FLAG_LEARNER_MODEL_BLACK_BOX_PCT=<0-100>` gives a deterministic FNV-1a bucket per user (stable across requests, independent per flag). No redeploy needed to change the split.

## Event log (`learner_model_events`)

One doc per event, id `{userId}_{type}_{ms}`, fields `{user_id, event_type, condition, timestamp, payload}`. Types:

| Event | Emitted by | Payload highlights |
|---|---|---|
| `olm_model_viewed` | server (GET /api/learner-model) | total_cards, concept_count |
| `olm_concept_expanded` | client (whitelisted) | pattern, card_count |
| `olm_card_evidence_viewed` | client (whitelisted) | problem_id |
| `olm_challenge_submitted` | server | challenge_id, reason, retrievability_at_challenge |
| `olm_correction_applied` | server | correction_type, amendment_source |
| `olm_verification_scheduled` | server | verification_due_at |
| `olm_verification_completed` | server (review path) | reason, passed, mastery_score |
| `olm_trace_shown` | client (whitelisted) | count |

Clients can only report the whitelisted subset; server-emitted types cannot be forged (Zod enum in `POST /api/learner-model/events`).

## Challenge docs (`learner_model_challenges`)

Each dispute stores: reason (typo | rushed | learned_elsewhere), optional free text, condition, `belief_snapshot` (retrievability/stability/difficulty/lapses/schedule at challenge time), `correction` (type, amendment_source, before/after stability+lapses+due date, verification_due_at), `status`, and `verification` (reviewed_at, mastery_score, `passed` = mastery_score >= 56 — the same bar as `AlgorithmResearchEvent.actual_retention`, so dispute accuracy is directly comparable with the retention data).

## Dependent variables this yields

- Inspection rate and depth (views → concept expands → evidence views), by condition.
- Challenge rate, reasons distribution, and the belief state at challenge time.
- **Challenge accuracy**: P(verification passed | challenged), overall and by reason — "are learners right when they talk back?"
- Behavior deltas: subsequent review accuracy and practice cadence, open vs black_box (join on `algorithm_research_events` by user/time).
- Trust proxy: does challenge rate change after verified-correct vs verified-wrong outcomes.

## Export

All three collections are flat with `user_id` fields and composite indexes on `(user_id, timestamp|created_at DESC)` — a per-user export is one query each. Events and challenges are Admin-SDK-only writes (default-deny client rules).
